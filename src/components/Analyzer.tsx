"use client";

import { AlertTriangle, CheckCircle2, ImagePlus, Loader2, RotateCcw, ScanSearch, ShieldCheck, ShieldAlert, UploadCloud, XCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge, Button, Card, Disclaimer, cx } from "./ui";
import ProbBars from "./ProbBars";
import { CLASS_BY_NAME, MODEL_LABELS } from "@/lib/classes";
import { MAX_FILE_MB } from "@/lib/config";
import { fileSize, mb, pct } from "@/lib/format";
import { analyze, InferenceError, validateFile, type Prediction, type Stage } from "@/lib/inference";
import { manifest } from "@/lib/manifest";
import { PREFERRED_MODEL } from "@/data/reported-metrics";

type Choice = string; // a model id or "all"
const OPTIONS: { id: Choice; label: string; hint: string }[] = [
  { id: "efficientnet_b0", label: MODEL_LABELS.efficientnet_b0, hint: "Recommended · best reported test results" },
  { id: "mobilenet_v2", label: MODEL_LABELS.mobilenet_v2, hint: "Smaller and faster" },
  { id: "all", label: "Compare both", hint: "Run both models" },
];

function stageText(s: Stage | null): { text: string; progress?: number } {
  if (!s) return { text: "Starting…" };
  switch (s.kind) {
    case "decoding": return { text: "Reading image…" };
    case "downloading": return { text: `Downloading ${s.model} model (first use only) · ${mb(s.loaded)} of ${mb(s.total)}`, progress: s.loaded / s.total };
    case "loading": return { text: `Preparing ${s.model}…` };
    case "running": return { text: `Analyzing track with ${s.model}…` };
  }
}

export default function Analyzer() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [choice, setChoice] = useState<Choice>(PREFERRED_MODEL);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<Stage | null>(null);
  const [results, setResults] = useState<Prediction[] | null>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const accept = useCallback(async (f: File | null | undefined) => {
    if (!f) return;
    setResults(null);
    try {
      await validateFile(f);
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    setError(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }, []);

  const reset = () => {
    setFile(null); setPreview(null); setResults(null); setError(null); setStage(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const run = async () => {
    if (!file) return;
    setBusy(true); setError(null); setResults(null); setStage(null);
    try {
      const ids = choice === "all" ? Object.keys(manifest.models) : [choice];
      setResults(await analyze(file, ids, setStage));
    } catch (e) {
      setError(e instanceof InferenceError ? e.message : `Something went wrong while analysing the image: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const st = stageText(stage);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <fieldset disabled={busy}>
          <legend className="mb-2 text-sm font-semibold text-steel-100">Model</legend>
          <div className="grid gap-2 sm:grid-cols-3" role="radiogroup">
            {OPTIONS.map((o) => (
              <label key={o.id} className={cx("cursor-pointer rounded-lg border p-3 text-sm transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-signal",
                choice === o.id ? "border-signal bg-signal-soft" : "border-ink-500 hover:bg-ink-700")}>
                <input type="radio" name="model" value={o.id} checked={choice === o.id} onChange={() => setChoice(o.id)} className="sr-only" />
                <span className="font-semibold text-white">{o.label}</span>
                <span className="mt-0.5 block text-xs text-steel-300">{o.hint}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); if (!busy) void accept(e.dataTransfer.files?.[0]); }}
          className={cx("relative overflow-hidden rounded-card border-2 border-dashed transition-colors", dragging ? "border-signal bg-signal-soft" : "border-ink-500 bg-ink-800")}>
          {preview ? (
            <div className="relative p-3">
              <img src={preview} alt="Selected track image preview" className="mx-auto max-h-[420px] w-full rounded-lg object-contain" />
              {busy && <div className="pointer-events-none absolute inset-3 overflow-hidden rounded-lg" aria-hidden><div className="absolute inset-x-0 h-16 animate-scan bg-gradient-to-b from-transparent to-signal/50" /><div className="absolute inset-x-0 h-0.5 animate-scan bg-signal" /></div>}
              <p className="mt-2 truncate text-center text-xs text-steel-300">{file?.name} · {file && fileSize(file.size)}</p>
            </div>
          ) : (
            <button type="button" onClick={() => inputRef.current?.click()} className="flex w-full flex-col items-center px-6 py-16 text-center">
              <span className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-ink-700 text-signal"><UploadCloud className="h-7 w-7" aria-hidden /></span>
              <span className="font-display text-lg font-semibold text-white">Drag & drop a track photo</span>
              <span className="mt-1 text-sm text-steel-300">or click to browse · JPG, JPEG, PNG · up to {MAX_FILE_MB} MB</span>
            </button>
          )}
          <input ref={inputRef} type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" className="sr-only" aria-label="Choose an image file" onChange={(e) => void accept(e.target.files?.[0])} />
        </div>

        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-100">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> <span>{error}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Button onClick={run} loading={busy} disabled={!file}><ScanSearch className="h-4 w-4" aria-hidden /> {busy ? "Analyzing…" : "Analyze Track"}</Button>
          {file && <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={busy}><ImagePlus className="h-4 w-4" aria-hidden /> Choose another</Button>}
          {(file || results) && <Button variant="ghost" onClick={reset} disabled={busy}><RotateCcw className="h-4 w-4" aria-hidden /> Reset</Button>}
        </div>
        <p className="text-xs text-steel-400">Your photo is analysed on your own device and is never uploaded. The first analysis downloads the model (about {mb(Object.values(manifest.models).find((m) => m.id === (choice === "all" ? PREFERRED_MODEL : choice))?.size_bytes ?? 0)}) and the browser caches it.</p>
      </div>

      <div aria-live="polite" className="space-y-4">
        {busy && (
          <Card className="space-y-4" >
            <div className="flex items-center gap-3 text-white"><Loader2 className="h-5 w-5 animate-spin text-signal" aria-hidden /><span className="font-semibold">{st.text}</span></div>
            {st.progress !== undefined && (
              <div className="h-2 overflow-hidden rounded-full bg-ink-700" role="progressbar" aria-valuenow={Math.round(st.progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Model download progress">
                <div className="h-full rounded-full bg-signal transition-[width]" style={{ width: `${st.progress * 100}%` }} />
              </div>
            )}
            <div className="skeleton h-10 w-2/3" /><div className="skeleton h-28 w-full" />
          </Card>
        )}

        {!busy && !results && (
          <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-card border border-dashed border-ink-500 bg-ink-800/50 p-8 text-center">
            <span className="mb-3 grid h-14 w-14 place-items-center rounded-full bg-ink-700 text-steel-300"><ScanSearch className="h-7 w-7" aria-hidden /></span>
            <h3 className="font-display text-xl font-semibold text-white">Results appear here</h3>
            <p className="mt-2 max-w-sm text-sm text-steel-300">Choose a photo, then press <strong>Analyze Track</strong> to see the predicted category and a probability breakdown for all five classes.</p>
          </div>
        )}

        {!busy && results?.map((r) => <ResultCard key={r.model_id} r={r} />)}
        {!busy && results && results.length > 1 && (
          <p className="text-sm text-steel-300">
            {results[0].predicted_class === results[1].predicted_class
              ? <>Both models agree: <strong className="text-white">{results[0].predicted_class}</strong>.</>
              : "The two models disagree — treat this image as uncertain and inspect the track manually."}
          </p>
        )}
        {!busy && results && <Disclaimer />}
      </div>
    </div>
  );
}

function ResultCard({ r }: { r: Prediction }) {
  const meta = CLASS_BY_NAME[r.predicted_class];
  const normal = meta?.severity === "ok";
  const Icon = meta?.icon;
  const sorted = Object.entries(r.probabilities).map(([c, p]) => ({ class: c, probability: p })).sort((a, b) => b.probability - a.probability);
  return (
    <Card className="overflow-hidden">
      <div className="-m-5 mb-4 h-1.5" style={{ background: meta?.color }} />
      <div className="flex items-center justify-between gap-2">
        <Badge color="#9aa8bf">{r.model_name}</Badge>
        <span className="tabular text-xs text-steel-400">{r.inference_ms} ms on this device</span>
      </div>

      <div className={cx("mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold", normal ? "bg-emerald-400/10 text-emerald-300" : "bg-red-400/10 text-red-200")}>
        {normal ? <ShieldCheck className="h-4 w-4" aria-hidden /> : <ShieldAlert className="h-4 w-4" aria-hidden />}
        {normal ? "No visible defect detected" : "Possible defect detected"}
      </div>

      <div className="mt-4 flex items-center gap-4">
        {Icon && <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl" style={{ background: `${meta.color}22`, color: meta.color }}><Icon className="h-7 w-7" aria-hidden /></span>}
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-steel-400">Predicted category</p>
          <h3 className="font-display text-2xl font-bold sm:text-3xl" style={{ color: meta?.color }}>{r.predicted_class}</h3>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs uppercase tracking-wider text-steel-400">Confidence</p>
          <p className="tabular font-display text-2xl font-bold text-white">{pct(r.confidence, 1)}</p>
        </div>
      </div>

      {r.low_confidence ? (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-amber-400/50 bg-amber-400/10 p-3 text-sm text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {r.warning}
        </p>
      ) : (
        <p className="mt-4 flex items-center gap-2 text-sm text-emerald-300"><CheckCircle2 className="h-4 w-4" aria-hidden /> Confidence is above the review threshold. Still verify manually.</p>
      )}

      <h4 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-steel-400">Probability by class</h4>
      <ProbBars items={sorted} />
    </Card>
  );
}
