/**
 * Image preprocessing that mirrors the training/inference pipeline in railguard/data.py:
 *
 *   PIL.Image.convert("RGB") -> torchvision Resize((224, 224))  [PIL bilinear, antialiased]
 *   -> ToTensor() (x / 255) -> Normalize(mean, std) -> CHW float32
 *
 * Browser canvas scaling is NOT equivalent to Pillow's resize, so Pillow's separable
 * bilinear algorithm (including its 22-bit fixed-point arithmetic and uint8 rounding between
 * the horizontal and vertical passes) is re-implemented here. It is verified bit-for-bit against
 * Pillow in src/lib/__tests__/preprocess.test.mjs.
 *
 * Only erasable TypeScript syntax is used so the unit test can import this file directly.
 */

const PRECISION_BITS = 32 - 8 - 2; // 22, as in Pillow's Resample.c

interface Coeffs {
  bounds: Int32Array; // [xmin, count] per output index
  kk: Int32Array; // fixed-point weights, ksize per output index
  ksize: number;
}

function precomputeCoeffs(inSize: number, outSize: number): Coeffs {
  const scale = inSize / outSize;
  const filterScale = Math.max(scale, 1.0);
  const support = 1.0 * filterScale; // bilinear filter support is 1.0
  const ksize = Math.ceil(support) * 2 + 1;
  const bounds = new Int32Array(outSize * 2);
  const kk = new Int32Array(outSize * ksize);
  const k = new Float64Array(ksize);
  const invScale = 1.0 / filterScale;

  for (let xx = 0; xx < outSize; xx++) {
    const center = (xx + 0.5) * scale;
    let xmin = Math.trunc(center - support + 0.5);
    if (xmin < 0) xmin = 0;
    let xmax = Math.trunc(center + support + 0.5);
    if (xmax > inSize) xmax = inSize;
    xmax -= xmin;

    k.fill(0);
    let ww = 0;
    for (let x = 0; x < xmax; x++) {
      const d = Math.abs((x + xmin - center + 0.5) * invScale);
      const w = d < 1.0 ? 1.0 - d : 0.0;
      k[x] = w;
      ww += w;
    }
    for (let x = 0; x < xmax; x++) {
      const w = ww !== 0 ? k[x] / ww : k[x];
      const scaled = w * (1 << PRECISION_BITS);
      kk[xx * ksize + x] = Math.trunc(w < 0 ? -0.5 + scaled : 0.5 + scaled);
    }
    bounds[xx * 2] = xmin;
    bounds[xx * 2 + 1] = xmax;
  }
  return { bounds, kk, ksize };
}

const clip8 = (v: number): number => (v < 0 ? 0 : v > 255 ? 255 : v);
const HALF = 1 << (PRECISION_BITS - 1);

/**
 * Resize an interleaved pixel buffer with Pillow's BILINEAR filter.
 * @param src      pixel data, `channels` bytes per pixel (alpha, if present, is ignored)
 * @param channels 3 (RGB) or 4 (RGBA) bytes per source pixel
 * @returns        RGB bytes (3 per pixel), outW * outH * 3
 */
export function resizeBilinearPIL(
  src: Uint8Array | Uint8ClampedArray,
  w: number,
  h: number,
  outW: number,
  outH: number,
  channels: 3 | 4 = 4,
): Uint8Array {
  // Horizontal pass (all source rows) -> intermediate uint8 image of size outW x h
  const hc = precomputeCoeffs(w, outW);
  const tmp = new Uint8Array(outW * h * 3);
  for (let y = 0; y < h; y++) {
    const rowIn = y * w * channels;
    const rowOut = y * outW * 3;
    for (let xx = 0; xx < outW; xx++) {
      const xmin = hc.bounds[xx * 2];
      const n = hc.bounds[xx * 2 + 1];
      const kBase = xx * hc.ksize;
      let r = HALF, g = HALF, b = HALF;
      for (let x = 0; x < n; x++) {
        const wgt = hc.kk[kBase + x];
        const p = rowIn + (xmin + x) * channels;
        r += src[p] * wgt;
        g += src[p + 1] * wgt;
        b += src[p + 2] * wgt;
      }
      const o = rowOut + xx * 3;
      tmp[o] = clip8(r >> PRECISION_BITS);
      tmp[o + 1] = clip8(g >> PRECISION_BITS);
      tmp[o + 2] = clip8(b >> PRECISION_BITS);
    }
  }

  // Vertical pass -> final outW x outH image
  const vc = precomputeCoeffs(h, outH);
  const out = new Uint8Array(outW * outH * 3);
  const stride = outW * 3;
  for (let yy = 0; yy < outH; yy++) {
    const ymin = vc.bounds[yy * 2];
    const n = vc.bounds[yy * 2 + 1];
    const kBase = yy * vc.ksize;
    for (let i = 0; i < stride; i++) {
      let s = HALF;
      for (let y = 0; y < n; y++) s += tmp[(ymin + y) * stride + i] * vc.kk[kBase + y];
      out[yy * stride + i] = clip8(s >> PRECISION_BITS);
    }
  }
  return out;
}

/** uint8 RGB (HWC) -> float32 CHW, scaled to [0,1] then normalised with mean/std (ToTensor + Normalize). */
export function toNormalizedCHW(rgb: Uint8Array, size: number, mean: number[], std: number[]): Float32Array {
  const plane = size * size;
  const out = new Float32Array(3 * plane);
  for (let c = 0; c < 3; c++) {
    const m = mean[c];
    const s = std[c];
    for (let i = 0; i < plane; i++) {
      out[c * plane + i] = (rgb[i * 3 + c] / 255 - m) / s;
    }
  }
  return out;
}

export function softmax(logits: ArrayLike<number>): number[] {
  let max = -Infinity;
  for (let i = 0; i < logits.length; i++) max = Math.max(max, logits[i]);
  const exps = Array.from(logits as ArrayLike<number>, (v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}
