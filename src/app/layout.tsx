import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import Navbar from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "RailGuard AI — AI-Powered Railway Track Inspection",
  description: "Classify railway track photos as Broken Track, Loose Bolts, Missing Parts, Rust or Normal Track using deep learning that runs in your browser.",
};
export const viewport: Viewport = { themeColor: "#0b1324", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
