"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { SimulationController } from "@/components/layout/simulation-controller";
import { CommandPalette } from "@/components/layout/command-palette";
import { useSimulation } from "@/providers/simulation-provider";

// Isolated component so useSearchParams() is inside a Suspense boundary,
// which is required for Next.js static prerendering (fixes Vercel build error).
function ParamReader() {
  const { setParams } = useSimulation();
  const searchParams = useSearchParams();

  useEffect(() => {
    const l = searchParams.get("l");
    const q = searchParams.get("q");
    const f = searchParams.get("f");
    if (l || q || f) {
      setParams({
        ...(l ? { latencyFactor:      parseFloat(l) } : {}),
        ...(q ? { modelQuality:       parseFloat(q) } : {}),
        ...(f ? { onboardingFriction: parseFloat(f) } : {}),
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

function LayoutInner({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Global ⌘K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Read URL params — must be inside Suspense for Next.js static prerendering */}
      <Suspense fallback={null}>
        <ParamReader />
      </Suspense>

      {/* Mobile header bar — hidden on md+ */}
      <header className="flex md:hidden items-center justify-between px-3 border-b border-g-border bg-g-surface shrink-0 h-12 z-30">
        <button
          onClick={() => setSidebarOpen(true)}
          className="text-g-muted hover:text-g-tan text-lg leading-none p-1"
          aria-label="Open menu"
        >
          ☰
        </button>
        <div className="text-g-tan text-xs font-bold tracking-widest uppercase">
          Analyst&apos;s Grimoire
        </div>
        <button
          onClick={() => setPaletteOpen(true)}
          className="text-g-muted hover:text-g-tan text-sm p-1"
          aria-label="Open command palette"
        >
          ⌘
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main content area */}
        <main
          className="flex-1 overflow-hidden flex flex-col"
          style={{ paddingBottom: "var(--spacing-controller)" }}
        >
          {children}
        </main>
      </div>

      {/* Global simulation controller — fixed bottom bar */}
      <SimulationController onOpenPalette={() => setPaletteOpen(true)} />

      {/* Command Palette */}
      <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return <LayoutInner>{children}</LayoutInner>;
}
