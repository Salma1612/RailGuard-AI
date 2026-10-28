import { Award, Cpu } from "lucide-react";
import { Badge, Card } from "./ui";
import { MODEL_COLORS, MODEL_IDS } from "@/lib/classes";
import { mb, pct } from "@/lib/format";
import { manifest } from "@/lib/manifest";
import { PREFERRED_MODEL, REPORTED_TEST_METRICS } from "@/data/reported-metrics";

function Bar({ value, color, label }: { value: number; color: string; label: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs"><span className="text-steel-300">{label}</span><span className="tabular font-semibold text-white">{label.includes("F1") ? value.toFixed(4) : pct(value, 2)}</span></div>
      <div className="h-2.5 overflow-hidden rounded-full bg-ink-700"><div className="h-full rounded-full" style={{ width: `${value * 100}%`, background: color }} /></div>
    </div>
  );
}

export default function ModelsSection() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        {[PREFERRED_MODEL, ...MODEL_IDS.filter((i) => i !== PREFERRED_MODEL)].map((id) => {
          const m = manifest.models[id];
          const t = REPORTED_TEST_METRICS[id];
          if (!m || !t) return null;
          const preferred = id === PREFERRED_MODEL;
          return (
            <Card key={id} className={preferred ? "border-signal/60" : ""}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 font-display text-xl font-bold text-white"><Cpu className="h-5 w-5" style={{ color: MODEL_COLORS[id] }} aria-hidden />{m.name}</h3>
                {preferred && <Badge color="#ff7a1a"><Award className="h-3.5 w-3.5" aria-hidden /> Preferred</Badge>}
              </div>
              <div className="mt-5 space-y-3">
                <Bar value={t.accuracy} color={MODEL_COLORS[id]} label="Test accuracy" />
                <Bar value={t.macroF1} color={MODEL_COLORS[id]} label="Test macro F1" />
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-ink-600 pt-4 text-sm">
                <dt className="text-steel-400">Validation accuracy</dt><dd className="tabular text-right text-white">{pct(m.checkpoint.val_accuracy, 2)}</dd>
                <dt className="text-steel-400">Validation macro F1</dt><dd className="tabular text-right text-white">{m.checkpoint.val_macro_f1?.toFixed(4) ?? "—"}</dd>
                <dt className="text-steel-400">Best epoch</dt><dd className="tabular text-right text-white">{m.checkpoint.best_epoch ?? "—"}</dd>
                <dt className="text-steel-400">Weights</dt><dd className="text-right text-white">{m.checkpoint.pretrained_imagenet ? "ImageNet → fine-tuned" : "—"}</dd>
                <dt className="text-steel-400">Browser model size</dt><dd className="tabular text-right text-white">{mb(m.size_bytes)}</dd>
                <dt className="text-steel-400">Input</dt><dd className="tabular text-right text-white">{m.image_size}×{m.image_size} RGB</dd>
              </dl>
            </Card>
          );
        })}
      </div>

      <Card className="space-y-3 text-sm text-steel-200">
        <h3 className="font-display text-lg font-semibold text-white">About these numbers</h3>
        <ul className="list-disc space-y-1.5 pl-5">
          <li><strong className="text-white">Test accuracy / macro F1</strong> are the held-out test-set results reported by the project owner. The evaluation files are not part of this repository, so the web build did not recompute them. Macro F1 averages the F1-score of the five classes equally, so it is lower than accuracy when minority classes are harder.</li>
          <li><strong className="text-white">Validation figures</strong> are stored inside each trained checkpoint and were used to pick the best epoch; they are not test results.</li>
          <li>Both models share the same train/validation/test split (identical split fingerprint <code className="text-xs">{manifest.models[MODEL_IDS[0]]?.checkpoint.split_fingerprint?.slice(0, 12)}…</code>), the same class order and the same preprocessing.</li>
          <li>The models run in your browser as ONNX files converted from the PyTorch checkpoints. The conversion was verified: the largest probability difference versus PyTorch was {Math.max(...MODEL_IDS.map((i) => manifest.models[i]?.onnx_parity.max_abs_prob_diff ?? 0)).toExponential(1)} and predictions matched on every check input.</li>
        </ul>
      </Card>
    </div>
  );
}
