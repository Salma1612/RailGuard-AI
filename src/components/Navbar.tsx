"use client";

import { Menu, ScanSearch, TrainFront, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cx } from "./ui";

const LINKS = [
  { href: "#analyze", label: "Analyze" },
  { href: "#categories", label: "Categories" },
  { href: "#how", label: "How it works" },
  { href: "#models", label: "Models" },
  { href: "#limits", label: "Limitations" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className={cx("sticky top-0 z-40 border-b transition-colors", scrolled || open ? "border-ink-600 bg-ink-900/95 backdrop-blur" : "border-transparent bg-transparent")}>
      <a href="#analyze" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-signal focus:px-3 focus:py-2 focus:text-ink-950">
        Skip to analyzer
      </a>
      <nav aria-label="Main" className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-8">
        <a href="#top" className="flex items-center gap-3" aria-label="RailGuard AI home">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-signal text-ink-950"><TrainFront className="h-5 w-5" aria-hidden /></span>
          <span className="font-display text-lg font-bold leading-none text-white">RailGuard<span className="text-signal"> AI</span></span>
        </a>
        <ul className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <li key={l.href}><a href={l.href} className="rounded-lg px-3 py-2 text-sm text-steel-300 transition-colors hover:bg-ink-700 hover:text-white">{l.label}</a></li>
          ))}
          <li className="ml-2">
            <a href="#analyze" className="inline-flex items-center gap-2 rounded-lg bg-signal px-4 py-2 text-sm font-semibold text-ink-950 transition-colors hover:bg-[#ff8d3a]">
              <ScanSearch className="h-4 w-4" aria-hidden /> Analyze Track
            </a>
          </li>
        </ul>
        <button onClick={() => setOpen((o) => !o)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="mobile-menu" className="rounded-lg p-2 text-steel-100 hover:bg-ink-700 md:hidden">
          {open ? <X className="h-6 w-6" aria-hidden /> : <Menu className="h-6 w-6" aria-hidden />}
        </button>
      </nav>
      {open && (
        <ul id="mobile-menu" className="space-y-1 border-t border-ink-600 px-4 py-3 md:hidden">
          {LINKS.map((l) => (
            <li key={l.href}><a href={l.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-3 text-steel-100 hover:bg-ink-700">{l.label}</a></li>
          ))}
        </ul>
      )}
    </header>
  );
}
