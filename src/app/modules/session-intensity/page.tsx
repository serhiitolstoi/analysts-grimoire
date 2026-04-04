"use client";

import { useState, useEffect, useCallback } from "react";
import { SplitPane } from "@/components/layout/split-pane";
import { TerminalCard } from "@/components/terminal/terminal-card";
import { CodeEditor } from "@/components/ui/code-editor";
import { SessionChart } from "@/components/viz/session-chart";
import { Badge } from "@/components/ui/badge";
import { useDuckDB } from "@/providers/duckdb-provider";
import { useSimulation } from "@/providers/simulation-provider";
import { SESSION_INTENSITY_SQL } from "@/lib/sql/session.sql";

export default function SessionIntensityPage() {
  const { runSQL, ready } = useDuckDB();
  const { dataVersion, isGenerating } = useSimulation();
  const [sql, setSql] = useState(SESSION_INTENSITY_SQL.trim());
  const [data, setData] = useState<unknown[] | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runQuery = useCallback(async (q: string) => {
    if (!ready || isGenerating) return;
    setIsRunning(true); setError(null);
    try { setData(await runSQL(q)); }
    catch (e) { setError(String(e)); }
    finally { setIsRunning(false); }
  }, [ready, isGenerating, runSQL]);

  useEffect(() => {
    if (ready && !isGenerating) runQuery(sql);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataVersion, ready, isGenerating]);

  return (
    <div className="h-full overflow-hidden">
      <SplitPane
        left={
          <div className="h-full flex flex-col">
            <div className="px-4 py-3 border-b border-g-border bg-g-elevated shrink-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="purple">2D</Badge>
                <Badge variant="muted">Level 2</Badge>
              </div>
              <h1 className="text-sm font-bold text-g-text">Session Intensity</h1>
              <p className="text-[11px] text-g-muted mt-0.5">
                Deep Work vs Quick Checks — token density × duration
              </p>
            </div>
            <div className="flex-1 overflow-hidden">
              <CodeEditor value={sql} onChange={setSql} onRun={runQuery}
                language="sql" isRunning={isRunning} error={error} />
            </div>
          </div>
        }
        right={
          <div className="h-full flex flex-col p-3 gap-3 overflow-auto">
            <TerminalCard title="Session Intensity Scatter" accent="purple" animate>
              <SessionChart
                data={data as Parameters<typeof SessionChart>[0]["data"]}
                isLoading={isRunning && !data}
                error={error}
                width={560}
                height={400}
              />
            </TerminalCard>

            <TerminalCard title="Case Study: Understanding Session Archetypes" accent="purple">
              <div className="text-[11px] text-g-muted space-y-2 leading-relaxed">
                <p>
                  Not all sessions are created equal. A 30-second check to copy a previous answer is
                  fundamentally different from a 45-minute deep coding session. Yet most analytics tools
                  treat them the same — &quot;1 session = 1 session.&quot; This module breaks that assumption.
                </p>
                <p>
                  By plotting <span className="text-g-purple font-bold">duration</span> (x-axis) against{" "}
                  <span className="text-g-purple font-bold">event count</span> (y-axis), we create a 2D behavioral
                  space where natural clusters emerge. The <span className="text-g-text font-bold">bubble size</span>{" "}
                  encodes total tokens consumed — a proxy for how much AI computation was used.
                </p>
                <p className="text-g-dim">
                  <span className="text-g-purple">Real-world parallel:</span> Spotify distinguishes between
                  &quot;lean-back&quot; listening (playlists in the background) and &quot;lean-forward&quot; listening
                  (actively searching and curating). Each type requires different product optimization.
                  Similarly, an AI product must serve both &quot;quick answer&quot; and &quot;deep collaboration&quot; use cases.
                </p>
              </div>
            </TerminalCard>

            <TerminalCard title="The Four Quadrants" accent="none">
              <div className="text-[11px] text-g-muted space-y-2 leading-relaxed">
                <div className="grid grid-cols-2 gap-3">
                  <div className="border border-g-border/40 rounded p-2">
                    <span className="text-g-tan font-bold">Deep Work</span>
                    <span className="text-g-dim block text-[10px]">≥15 min · ≥8 events · high tokens</span>
                    <p className="text-g-dim mt-1 text-[10px] leading-relaxed">
                      The holy grail. Users are using AI as a creative partner for extended problem-solving.
                      These sessions have the highest token density and strongest correlation with retention.
                    </p>
                  </div>
                  <div className="border border-g-border/40 rounded p-2">
                    <span className="text-g-purple font-bold">Focused</span>
                    <span className="text-g-dim block text-[10px]">5-15 min · 4-7 events</span>
                    <p className="text-g-dim mt-1 text-[10px] leading-relaxed">
                      Purposeful but time-boxed sessions. The user has a specific task, gets it done, and leaves.
                      High efficiency, moderate token use. This is the bread-and-butter session type.
                    </p>
                  </div>
                  <div className="border border-g-border/40 rounded p-2">
                    <span className="text-g-blue font-bold">Quick Check</span>
                    <span className="text-g-dim block text-[10px]">2-5 min · 2-3 events</span>
                    <p className="text-g-dim mt-1 text-[10px] leading-relaxed">
                      Fast lookups and simple questions. &quot;What&apos;s the syntax for X?&quot; &quot;Summarize this email.&quot;
                      Low token use but high frequency. These sessions signal the product is becoming a reflex tool.
                    </p>
                  </div>
                  <div className="border border-g-border/40 rounded p-2">
                    <span className="text-g-muted font-bold">Glance</span>
                    <span className="text-g-dim block text-[10px]">&lt;2 min · 1 event</span>
                    <p className="text-g-dim mt-1 text-[10px] leading-relaxed">
                      Opened the app, looked at something, left. Could be checking a previous conversation
                      or accidental opens. High glance rates may signal unclear value proposition.
                    </p>
                  </div>
                </div>
              </div>
            </TerminalCard>

            <TerminalCard title="What to Look For" accent="none">
              <div className="text-[11px] text-g-muted space-y-1.5 leading-relaxed">
                <p>
                  <span className="text-g-purple">1.</span> <span className="text-g-text font-bold">The bimodal gap:</span>{" "}
                  Look for a visible separation between the Deep Work cluster (upper-right) and the Quick Check cluster
                  (lower-left). A wide gap means your product serves two distinct use cases well. A narrow gap means
                  most usage is &quot;one-size-fits-all.&quot;
                </p>
                <p>
                  <span className="text-g-purple">2.</span> <span className="text-g-text font-bold">Bubble size distribution:</span>{" "}
                  Are the largest bubbles (highest token use) all in Deep Work? Or are some Quick Checks
                  also token-heavy? Token-heavy quick checks might indicate inefficient conversations.
                </p>
                <p>
                  <span className="text-g-purple">3.</span> <span className="text-g-text font-bold">The Glance ratio:</span>{" "}
                  What percentage of all sessions are Glances? If &gt;40%, many users are opening the product
                  but not finding enough reason to engage. That&apos;s a value-proposition problem.
                </p>
              </div>
            </TerminalCard>

            <TerminalCard title="Try This" accent="none">
              <div className="text-[11px] text-g-dim space-y-1.5 leading-relaxed">
                <p>
                  <span className="text-g-purple font-bold">Experiment 1:</span> Increase{" "}
                  <span className="text-g-purple">Model Quality</span> to 1.0 and watch the upper-right
                  quadrant fill up. Higher quality → more artifacts → more Deep Work sessions.
                  Then drop quality to 0.2 — Deep Work sessions nearly disappear.
                </p>
                <p>
                  <span className="text-g-purple font-bold">Experiment 2:</span> Crank{" "}
                  <span className="text-g-tan">System Latency</span> to 3.0x. Do session durations
                  increase (users waiting for responses) or decrease (users giving up)?
                  Check if the Deep Work cluster shrinks — frustrated users cut sessions short.
                </p>
                <p>
                  <span className="text-g-purple font-bold">SQL challenge:</span> Add a WHERE clause
                  filtering for only artifact_user sessions. Are artifact users over-represented in
                  the Deep Work quadrant? Calculate the ratio.
                </p>
              </div>
            </TerminalCard>
          </div>
        }
      />
    </div>
  );
}
