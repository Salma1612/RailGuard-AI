import { Droplets, PackageX, ShieldCheck, Unlink, Wrench, type LucideIcon } from "lucide-react";

export type ClassName = "Broken Track" | "Loose Bolts" | "Missing Parts" | "Rust" | "Normal Track";

export interface ClassMeta {
  name: ClassName;
  slug: string;
  color: string; // used for charts, borders and badges
  icon: LucideIcon;
  description: string;
  severity: "defect" | "ok";
}

// Exact category names used across training, API and UI.
export const CLASSES: ClassMeta[] = [
  { name: "Broken Track", slug: "broken-track", color: "#ef5350", icon: Unlink, severity: "defect",
    description: "Visible cracks, fractures or broken rail sections." },
  { name: "Loose Bolts", slug: "loose-bolts", color: "#38bdf8", icon: Wrench, severity: "defect",
    description: "Loose, displaced or improperly secured fastening bolts." },
  { name: "Missing Parts", slug: "missing-parts", color: "#a78bfa", icon: PackageX, severity: "defect",
    description: "Missing bolts, clips, fasteners or other structural parts." },
  { name: "Rust", slug: "rust", color: "#d98a4e", icon: Droplets, severity: "defect",
    description: "Visible rust or corrosion on track components." },
  { name: "Normal Track", slug: "normal-track", color: "#34d399", icon: ShieldCheck, severity: "ok",
    description: "Track with no visible defect." },
];

export const CLASS_BY_NAME: Record<string, ClassMeta> = Object.fromEntries(CLASSES.map((c) => [c.name, c]));
export const CLASS_BY_SLUG: Record<string, ClassMeta> = Object.fromEntries(CLASSES.map((c) => [c.slug, c]));

export const MODEL_COLORS: Record<string, string> = { mobilenet_v2: "#ff7a1a", efficientnet_b0: "#38bdf8" };
export const MODEL_LABELS: Record<string, string> = { mobilenet_v2: "MobileNetV2", efficientnet_b0: "EfficientNetB0" };
export const MODEL_IDS = ["mobilenet_v2", "efficientnet_b0"] as const;
export type ModelId = (typeof MODEL_IDS)[number];
