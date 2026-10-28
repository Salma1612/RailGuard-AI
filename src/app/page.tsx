import { ArrowRight, BrainCircuit, Gauge, Lock, ScanSearch, ShieldCheck, Upload } from "lucide-react";
import Analyzer from "@/components/Analyzer";
import HeroArt from "@/components/HeroArt";
import ModelsSection from "@/components/ModelsSection";
import { Card, Disclaimer } from "@/components/ui";
import { CLASSES } from "@/lib/classes";

const STEPS = [
  { icon: Upload, title: "Upload", text: "Drop a JPG or PNG photo of a track section." },
  { icon: BrainCircuit, title: "Analyze", text: "A fine-tuned CNN scores the image directly in your browser." },
  { icon: Gauge, title: "Review confidence", text: "See all five class probabilities; uncertain results are flagged, not hidden." },
  { icon: ShieldCheck, title: "Human decision", text: "Results support — never replace — a qualified inspector." },
];

const LIMITS = [
  "Single-label classification: each photo gets one category, but a real track section can show several defects at once (for example rust and a loose bolt).",
  "The whole image is classified; defects are not located, and small defects in a wide photo can be missed.",
  "Confidence is not a calibrated probability. A confident answer can still be wrong, especially for photos unlike the training data (other cameras, lighting, track types).",
  "“Normal Track” means no defect was recognised in the photo, not that the track is safe.",
  "Reported results come from one held-out test set; performance on new field data has not been validated.",
];

export default function Home() {
  return (
    <main id="top">
      <div className="mx-auto max-w-6xl space-y-24 px-4 pb-16 pt-6 sm:px-8">
        <section className="grid items-center gap-8 lg:grid-cols-2">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-signal">AI-powered railway track inspection</p>
            <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl">
              Spot track defects<br /><span className="text-signal">from a single photo.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-steel-300">
              RailGuard AI classifies track photographs into five categories using EfficientNetB0 and MobileNetV2 models trained on railway imagery.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#analyze" className="inline-flex items-center gap-2 rounded-lg bg-signal px-5 py-3 font-semibold text-ink-950 transition-colors hover:bg-[#ff8d3a]">
                <ScanSearch className="h-5 w-5" aria-hidden /> Analyze Track <ArrowRight className="h-4 w-4" aria-hidden />
              </a>
              <a href="#models" className="inline-flex items-center gap-2 rounded-lg border border-ink-500 px-5 py-3 text-steel-100 transition-colors hover:bg-ink-700">View model results</a>
            </div>
            <p className="mt-5 flex items-center gap-2 text-sm text-steel-300"><Lock className="h-4 w-4 text-signal" aria-hidden /> Photos are analysed on your device and never uploaded.</p>
          </div>
          <div className="aspect-[10/7] overflow-hidden rounded-card border border-ink-600"><HeroArt /></div>
        </section>

        <section id="analyze" aria-labelledby="analyze-h" className="scroll-mt-24">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-signal">Inspection</p>
          <h2 id="analyze-h" className="font-display text-3xl font-bold text-white">Analyze a track image</h2>
          <div className="sleepers mb-6 mt-3 h-1.5 w-40 rounded" aria-hidden />
          <Disclaimer className="mb-6" />
          <Analyzer />
        </section>

        <section id="categories" aria-labelledby="cat-h" className="scroll-mt-24">
          <h2 id="cat-h" className="font-display text-3xl font-bold text-white">Five inspection categories</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {CLASSES.map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.name} className="rounded-card border border-ink-600 bg-ink-800 p-5" style={{ borderTop: `3px solid ${c.color}` }}>
                  <span className="grid h-11 w-11 place-items-center rounded-lg" style={{ background: `${c.color}1f`, color: c.color }}><Icon className="h-6 w-6" aria-hidden /></span>
                  <h3 className="mt-4 font-display text-lg font-semibold text-white">{c.name}</h3>
                  <p className="mt-1 text-sm text-steel-300">{c.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section id="how" aria-labelledby="how-h" className="scroll-mt-24">
          <h2 id="how-h" className="font-display text-3xl font-bold text-white">How it works</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-4">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <li key={s.title}>
                  <Card className="h-full">
                    <div className="flex items-center justify-between"><Icon className="h-6 w-6 text-signal" aria-hidden /><span className="font-display text-3xl font-bold text-ink-500">0{i + 1}</span></div>
                    <h3 className="mt-3 font-semibold text-white">{s.title}</h3>
                    <p className="mt-1 text-sm text-steel-300">{s.text}</p>
                  </Card>
                </li>
              );
            })}
          </ol>
        </section>

        <section id="models" aria-labelledby="models-h" className="scroll-mt-24">
          <h2 id="models-h" className="mb-6 font-display text-3xl font-bold text-white">Evaluated models</h2>
          <ModelsSection />
        </section>

        <section id="limits" aria-labelledby="limits-h" className="scroll-mt-24">
          <h2 id="limits-h" className="mb-6 font-display text-3xl font-bold text-white">Limitations &amp; intended use</h2>
          <Card className="space-y-4 border-amber-400/30">
            <ul className="list-disc space-y-2 pl-5 text-sm text-steel-200">{LIMITS.map((l) => <li key={l}>{l}</li>)}</ul>
            <Disclaimer />
          </Card>
        </section>
      </div>
      <footer className="border-t border-ink-600 px-4 py-8 text-center text-xs text-steel-400">
        RailGuard AI · decision-support prototype · not a certified railway safety system.
      </footer>
    </main>
  );
}
