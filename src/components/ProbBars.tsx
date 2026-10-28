import { CLASS_BY_NAME } from "@/lib/classes";
import { pct } from "@/lib/format";

export default function ProbBars({ items }: { items: { class: string; probability: number }[] }) {
  return (
    <ol className="space-y-2.5" aria-label="Top predictions">
      {items.map((it, i) => {
        const color = CLASS_BY_NAME[it.class]?.color ?? "#9aa8bf";
        return (
          <li key={it.class}>
            <div className="mb-1 flex justify-between text-sm">
              <span className={i === 0 ? "font-semibold text-white" : "text-steel-200"}>{i + 1}. {it.class}</span>
              <span className="tabular text-steel-200">{pct(it.probability)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-ink-700" role="progressbar" aria-valuenow={Math.round(it.probability * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={it.class}>
              <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.max(it.probability * 100, 1)}%`, background: color }} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
