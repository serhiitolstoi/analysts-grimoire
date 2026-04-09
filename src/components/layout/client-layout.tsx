"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { SimulationController } from "@/components/layout/simulation-controller";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex flex-col h-full">
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
        <div className="w-7" />
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
      <SimulationController />
    </div>
  );
}
