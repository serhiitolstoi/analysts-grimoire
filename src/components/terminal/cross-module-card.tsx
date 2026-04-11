"use client";

import Link from "next/link";
import { TerminalCard } from "@/components/terminal/terminal-card";

export interface CrossModuleLink {
  module: string;
  path: string;
  insight: string;
}

interface CrossModuleCardProps {
  links: CrossModuleLink[];
}

export function CrossModuleCard({ links }: CrossModuleCardProps) {
  if (links.length === 0) return null;
  return (
    <TerminalCard title="Cross-Module Connections" accent="none">
      <div className="space-y-2">
        {links.map((link) => (
          <div key={link.path} className="flex items-start gap-2 text-[11px]">
            <span className="text-g-dim shrink-0">→</span>
            <div>
              <Link
                href={link.path}
                className="text-g-tan font-bold hover:underline underline-offset-2"
              >
                {link.module}
              </Link>
              <span className="text-g-muted ml-1.5">{link.insight}</span>
            </div>
          </div>
        ))}
      </div>
    </TerminalCard>
  );
}
