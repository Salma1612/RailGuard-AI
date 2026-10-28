import { LOW_CONFIDENCE_THRESHOLD, MAX_FILE_MB, MAX_PIXELS, MIN_SIDE_PX, MIN_TOP2_MARGIN } from "./config";
import { manifest, modelUrl, type ModelManifest } from "./manifest";
import { resizeBilinearPIL, softmax, toNormalizedCHW } from "./preprocess";

export class InferenceError extends Error {
  constructor(message: string, public code: string) {
    super(message);
  }
}

export interface Prediction {
  model_id: string;
  model_name: string;
  predicted_class: string;
  confidence: number;
  top3: { class: string; probability: number }[];
  probabilities: Record<string, number>;
  low_confidence: boolean;
  warning: string | null;
  inference_ms: number;
}

export type Stage =
  | { kind: "decoding" }
  | { kind: "downloading"; model: string; loaded: number; total: number }
  | { kind: "loading"; model: string }
  | { kind: "running"; model: string };

// ----------------------------------------------------------------------------- validation
const hasPrefix = (b: Uint8Array, sig: number[]) => sig.every((v, i) => b[i] === v);

/** Validates type, size and real content (magic bytes) before any decoding. */
export async function validateFile(file: File): Promise<void> {
  const ext = file.name.toLowerCase().split(".").pop() ?? "";
  if (!["jpg", "jpeg", "png"].includes(ext)) {
    throw new InferenceError(`“${file.name}” is not supported. Please upload a JPG, JPEG or PNG image.`, "unsupported_type");
  }
  if (file.size === 0) throw new InferenceError("The selected file is empty.", "empty_file");
  if (file.size > MAX_FILE_MB * 1024 * 1024) {
    throw new InferenceError(`This file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The maximum is ${MAX_FILE_MB} MB.`, "too_large");
  }
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const isJpeg = hasPrefix(head, [0xff, 0xd8, 0xff]);
  const isPng = hasPrefix(head, [0x89, 0x50, 0x4e, 0x47]);
  if (!isJpeg && !isPng) {
    throw new InferenceError("The file content is not a JPEG or PNG image (the extension may have been changed).", "invalid_image");
  }
}

// ----------------------------------------------------------------------------- decoding
export interface DecodedImage { data: Uint8ClampedArray; width: number; height: number }

export async function decodeImage(file: File): Promise<DecodedImage> {
  let bitmap: ImageBitmap;
  try {
    // 'from-image' applies EXIF orientation (like PIL's exif_transpose); 'none' skips colour-profile
    // conversion because PIL ignores embedded ICC profiles too.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image", colorSpaceConversion: "none" } as ImageBitmapOptions);
  } catch {
    throw new InferenceError("This image could not be decoded. It may be corrupted or truncated.", "invalid_image");
  }
  const { width, height } = bitmap;
  try {
    if (width < MIN_SIDE_PX || height < MIN_SIDE_PX) {
      throw new InferenceError(`The image is too small (${width}×${height}px). Minimum is ${MIN_SIDE_PX}×${MIN_SIDE_PX}px.`, "too_small");
    }
    if (width * height > MAX_PIXELS) {
      throw new InferenceError(`The image is very large (${width}×${height}px). Please use one under ${(MAX_PIXELS / 1e6).toFixed(0)} megapixels.`, "too_large");
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new InferenceError("Your browser could not create a drawing surface for the image.", "no_canvas");
    ctx.drawImage(bitmap, 0, 0);
    const data = ctx.getImageData(0, 0, width, height).data;
    canvas.width = canvas.height = 0; // release memory early
    return { data, width, height };
  } finally {
    bitmap.close();
  }
}

// ----------------------------------------------------------------------------- ONNX Runtime
type Ort = typeof import("onnxruntime-web/wasm");
let ortPromise: Promise<Ort> | null = null;

// ONNX Runtime Web is served as a static file from /ort (copied there by scripts/copy-ort.mjs) and loaded
// with a native dynamic import, so Next.js/webpack never bundles or minifies it.
const ORT_MODULE_URL = "/ort/ort.wasm.min.mjs";

function loadOrt(): Promise<Ort> {
  if (!ortPromise) {
    ortPromise = (import(/* webpackIgnore: true */ ORT_MODULE_URL) as Promise<Ort>).then((ort) => {
      ort.env.wasm.wasmPaths = "/ort/";
      ort.env.wasm.numThreads = 1; // multi-threading needs cross-origin isolation headers; 1 thread is robust
      ort.env.wasm.proxy = false;
      return ort;
    });
    ortPromise.catch(() => { ortPromise = null; });
  }
  return ortPromise;
}

const sessions = new Map<string, Promise<import("onnxruntime-web/wasm").InferenceSession>>();

async function fetchModelBytes(m: ModelManifest, onProgress: (loaded: number, total: number) => void): Promise<Uint8Array> {
  let res: Response;
  try {
    res = await fetch(modelUrl(m));
  } catch {
    throw new InferenceError(`Could not download the ${m.name} model. Check your internet connection and try again.`, "model_download");
  }
  if (!res.ok || !res.body) {
    throw new InferenceError(`The ${m.name} model file is not available on the server (HTTP ${res.status}).`, "model_missing");
  }
  const total = Number(res.headers.get("content-length")) || m.size_bytes;
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    onProgress(loaded, total);
  }
  const bytes = new Uint8Array(loaded);
  let offset = 0;
  for (const c of chunks) { bytes.set(c, offset); offset += c.length; }

  // Integrity check against the manifest (skipped where WebCrypto is unavailable).
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
    if (hex !== m.sha256) {
      throw new InferenceError(`The downloaded ${m.name} model failed its integrity check. Reload the page and try again.`, "model_corrupt");
    }
  }
  return bytes;
}

function getSession(m: ModelManifest, onStage: (s: Stage) => void) {
  let p = sessions.get(m.id);
  if (!p) {
    p = (async () => {
      const ort = await loadOrt().catch(() => {
        throw new InferenceError("The inference engine (ONNX Runtime) could not be loaded. Check your connection and reload the page.", "runtime_load");
      });
      const bytes = await fetchModelBytes(m, (loaded, total) => onStage({ kind: "downloading", model: m.name, loaded, total }));
      onStage({ kind: "loading", model: m.name });
      try {
        return await ort.InferenceSession.create(bytes, { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
      } catch (e) {
        throw new InferenceError(`The ${m.name} model could not be initialised in this browser (${(e as Error).message}).`, "session_create");
      }
    })();
    sessions.set(m.id, p);
    p.catch(() => sessions.delete(m.id)); // allow retry after a failure
  }
  return p;
}

// ----------------------------------------------------------------------------- prediction
function interpret(m: ModelManifest, logits: ArrayLike<number>, ms: number): Prediction {
  const probs = softmax(logits);
  const order = probs.map((_, i) => i).sort((a, b) => probs[b] - probs[a]);
  const names = m.class_names;
  const top = order[0];
  const confidence = probs[top];
  const margin = probs[order[0]] - probs[order[1]];
  const low = confidence < LOW_CONFIDENCE_THRESHOLD || margin < MIN_TOP2_MARGIN;
  return {
    model_id: m.id,
    model_name: m.name,
    predicted_class: names[top],
    confidence,
    top3: order.slice(0, 3).map((i) => ({ class: names[i], probability: probs[i] })),
    probabilities: Object.fromEntries(names.map((n, i) => [n, probs[i]])),
    low_confidence: low,
    warning: low
      ? `Low confidence (${(confidence * 100).toFixed(0)}%; runner-up is ${names[order[1]]} at ${(probs[order[1]] * 100).toFixed(0)}%). Do not rely on this result — retake the photo or have the track inspected manually.`
      : null,
    inference_ms: Math.round(ms),
  };
}

/** Runs the selected models on a validated image. Decoding happens once; each model is loaded on demand. */
export async function analyze(file: File, modelIds: string[], onStage: (s: Stage) => void = () => {}): Promise<Prediction[]> {
  await validateFile(file);
  onStage({ kind: "decoding" });
  const img = await decodeImage(file);
  const results: Prediction[] = [];
  const ort = await loadOrt().catch(() => {
    throw new InferenceError("The inference engine (ONNX Runtime) could not be loaded. Check your connection and reload the page.", "runtime_load");
  });

  for (const id of modelIds) {
    const m = manifest.models[id];
    if (!m) throw new InferenceError(`Unknown model “${id}”.`, "unknown_model");
    const session = await getSession(m, onStage);
    onStage({ kind: "running", model: m.name });
    try {
      const rgb = resizeBilinearPIL(img.data, img.width, img.height, m.image_size, m.image_size, 4);
      const input = toNormalizedCHW(rgb, m.image_size, m.mean, m.std);
      const t0 = performance.now();
      const out = await session.run({ [m.input_name]: new ort.Tensor("float32", input, [1, 3, m.image_size, m.image_size]) });
      const ms = performance.now() - t0;
      const logits = out[m.output_name]?.data as Float32Array | undefined;
      if (!logits || logits.length !== m.class_names.length) {
        throw new Error("unexpected model output shape");
      }
      results.push(interpret(m, logits, ms));
    } catch (e) {
      if (e instanceof InferenceError) throw e;
      throw new InferenceError(`The ${m.name} model failed while analysing the image (${(e as Error).message}).`, "inference_failed");
    }
  }
  return results;
}
