"use client";

import { useState, useEffect, useCallback } from "react";
import { SplitPane } from "@/components/layout/split-pane";
import { TerminalCard } from "@/components/terminal/terminal-card";
import { CrossModuleCard } from "@/components/terminal/cross-module-card";
import { CodeEditor } from "@/components/ui/code-editor";
import { ClusterScatter, type ClusterResult } from "@/components/viz/cluster-scatter";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useDuckDB } from "@/providers/duckdb-provider";
import { usePyodide } from "@/providers/pyodide-provider";
import { useSimulation } from "@/providers/simulation-provider";
import { CLUSTERING_PYTHON } from "@/lib/python/clustering.py";

const CLUSTER_PREP_SQL = `
SELECT
  u.user_id,
  COUNT(DISTINCT e.event_id)                                              AS total_events,
  COUNT(DISTINCT s.session_id)                                            AS total_sessions,
  COUNT(DISTINCT CASE WHEN e.event_type = 'artifact_created' THEN e.event_id END) AS artifact_events,
  COUNT(DISTINCT CASE WHEN e.event_type = 'code_run'         THEN e.event_id END) AS code_events,
  AVG(e.latency_ms)                                                       AS avg_latency_ms,
  COUNT(DISTINCT e.timestamp::DATE)                                       AS active_days,
  COUNT(DISTINCT e.event_id)::DOUBLE /
    NULLIF(COUNT(DISTINCT e.timestamp::DATE), 0)                          AS events_per_day,
  COALESCE(COUNT(DISTINCT CASE WHEN e.event_type = 'artifact_created' THEN e.event_id END)::DOUBLE /
    NULLIF(COUNT(DISTINCT e.event_id), 0), 0)                             AS artifact_ratio,
  COALESCE(COUNT(DISTINCT CASE WHEN e.event_type = 'code_run' THEN e.event_id END)::DOUBLE /
    NULLIF(COUNT(DISTINCT e.event_id), 0), 0)                             AS code_ratio
FROM users u
JOIN events e ON e.user_id = u.user_id
JOIN (SELECT DISTINCT session_id FROM events) s ON s.session_id = e.session_id
WHERE u.onboarding_completed = true
GROUP BY u.user_id
HAVING total_events >= 5
`;

// We'll compute avg_session_min separately and merge

const SESSION_DUR_SQL = `
SELECT user_id, AVG(session_min) AS avg_session_min
FROM (
  SELECT
    user_id,
    EPOCH(MAX(timestamp::TIMESTAMP) - MIN(timestamp::TIMESTAMP)) / 60.0 AS session_min
  FROM events
  GROUP BY user_id, session_id
  HAVING COUNT(*) > 1
) s
GROUP BY user_id
`;

export default function ActivityClustersPage() {
  const { runSQL, ready: dbReady } = useDuckDB();
  const { init, ready: pyReady, loading: pyLoading, runPython } = usePyodide();
  const { dataVersion, isGenerating } = useSimulation();

  const [pyCode, setPyCode] = useState(CLUSTERING_PYTHON.trim());
  const [result, setResult] = useState<ClusterResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [k, setK] = useState(4);
  const [activeTab, setActiveTab] = useState<"sql" | "python">("python");

  const runAnalysis = useCallback(async () => {
    if (!dbReady || isGenerating) return;
    setIsRunning(true); setError(null);
    try {
      if (!pyReady) await init();
      const [rows, durRows] = await Promise.all([
        runSQL(CLUSTER_PREP_SQL.trim()),
        runSQL(SESSION_DUR_SQL.trim()),
      ]);

      // Build duration lookup
      const durMap = new Map<string, number>(
        (durRows as { user_id: string; avg_session_min: number }[]).map((r) => [r.user_id, r.avg_session_min])
      );

      const users = (rows as Record<string, unknown>[]).map((r) => ({
        user_id: String(r.user_id),
        total_events: Number(r.total_events),
        avg_session_min: durMap.get(String(r.user_id)) ?? 5,
        artifact_ratio: Number(r.artifact_ratio),
        code_ratio: Number(r.code_ratio),
        avg_latency_ms: Number(r.avg_latency_ms),
        active_days: Number(r.active_days),
      }));

      const pyResult = await runPython(pyCode, { users, k });
      const parsed: ClusterResult = JSON.parse(pyResult as string);
      setResult(parsed);
    } catch (e) {
      setError(String(e));
    } finally {
      setIsRunning(false);
    }
  }, [dbReady, isGenerating, pyReady, init, runSQL, runPython, pyCode, k]);

  useEffect(() => {
    if (dbReady && !isGenerating) runAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataVersion, dbReady, isGenerating]);

  return (
    <div className="h-full overflow-hidden">
      <SplitPane
        left={
          <div className="h-full flex flex-col">
            <div className="px-4 py-3 border-b border-g-border bg-g-elevated shrink-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="green">K-M</Badge>
                <Badge variant="muted">Level 3</Badge>
                <Badge variant={pyReady ? "green" : "muted"}>
                  {pyLoading ? "Python…" : pyReady ? "scikit-learn" : "Python"}
                </Badge>
              </div>
              <h1 className="text-sm font-bold text-g-text">Activity Clusters</h1>
              <p className="text-[11px] text-g-muted mt-0.5">
                K-Means user archetypes via scikit-learn
              </p>
            </div>

            {/* k selector */}
            <div className="px-4 py-2 border-b border-g-border shrink-0 flex items-center gap-3 text-[11px]">
              <span className="text-g-muted">Clusters k =</span>
              {[3,4,5,6].map((n) => (
                <button key={n} onClick={() => setK(n)}
                  className={`w-6 h-6 rounded text-[10px] font-bold transition-colors ${k === n ? "bg-g-green text-g-bg" : "text-g-dim hover:text-g-text"}`}>
                  {n}
                </button>
              ))}
            </div>

            {/* Tab switcher */}
            <div className="flex border-b border-g-border shrink-0">
              {(["sql","python"] as const).map((t) => (
                <button key={t} onClick={() => setActiveTab(t)}
                  className={`px-4 py-2 text-xs transition-colors ${activeTab === t ? "text-g-green border-b-2 border-g-green" : "text-g-muted hover:text-g-text"}`}>
                  {t === "sql" ? "SQL Features" : "Python K-Means"}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-hidden">
              {activeTab === "sql"
                ? <CodeEditor value={CLUSTER_PREP_SQL.trim()} language="sql" readOnly />
                : <CodeEditor value={pyCode} onChange={setPyCode}
                    onRun={runAnalysis} language="python"
                    isRunning={isRunning} error={error} />
              }
            </div>
          </div>
        }
        right={
          <div className="h-full flex flex-col p-3 gap-3 overflow-auto">
            {!pyReady && !pyLoading && (
              <div className="flex items-center gap-3 p-3 rounded border border-g-border bg-g-elevated text-[11px]">
                <span className="text-g-muted">Python (scikit-learn) required.</span>
                <button onClick={init} className="px-2 py-1 rounded bg-g-green text-g-bg text-[10px] font-bold">
                  Initialize Pyodide
                </button>
              </div>
            )}
            {pyLoading && (
              <div className="p-3 rounded border border-g-border bg-g-elevated">
                <LoadingSpinner message="Loading scikit-learn…" size="sm" />
              </div>
            )}

            <TerminalCard title={`User Archetypes — K=${k} Clusters (PCA Projection)`} accent="green" animate>
              <ClusterScatter
                result={result}
                isLoading={isRunning && !result}
                error={error}
                width={560}
                height={400}
              />
            </TerminalCard>

            {result && (
              <TerminalCard title="Cluster Profiles" accent="none">
                <div className="space-y-2">
                  {result.cluster_stats.map((cs) => (
                    <div key={cs.cluster} className="text-[11px] border-b border-g-border pb-2 last:border-0">
                      <div className="font-bold text-g-text">{cs.name} <span className="text-g-dim font-normal">({cs.size} users · {(cs.pct * 100).toFixed(0)}%)</span></div>
                      <div className="text-g-dim mt-0.5 grid grid-cols-3 gap-1">
                        {Object.entries(cs.centroid_raw).slice(0, 6).map(([k, v]) => (
                          <span key={k}>{k.replace(/_/g, ' ')}: <span className="text-g-muted">{Number(v).toFixed(1)}</span></span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </TerminalCard>
            )}

            <TerminalCard title="Case Study: Unsupervised User Segmentation" accent="green">
              <div className="text-[11px] text-g-muted space-y-2 leading-relaxed">
                <p>
                  <span className="text-g-green font-bold">K-Means clustering</span> discovers natural user segments
                  without any predefined labels. Instead of defining &quot;power user&quot; with arbitrary rules (like
                  &quot;≥10 events/week&quot;), the algorithm finds groupings that minimize within-cluster variance
                  across <em>all</em> features simultaneously.
                </p>
                <p>
                  The process: (1) aggregate raw events into <span className="text-g-text font-bold">6 behavioral features</span> per
                  user (total events, avg session duration, artifact ratio, code ratio, avg latency, active days),
                  (2) standardize each feature to zero mean and unit variance — critical, since K-Means is
                  distance-based and unscaled features with large ranges would dominate, (3) run K-Means to find k
                  centroids, (4) project from 6D to 2D via PCA for visualization.
                </p>
                <p className="text-g-dim">
                  <span className="text-g-green">Real-world parallel:</span> Spotify uses clustering to build &quot;listener
                  personas&quot; (Casual Listener, Playlist Curator, Podcast Addict) for personalized recommendations.
                  Airbnb clusters hosts by behavior to tailor onboarding. The clusters feed downstream systems —
                  personalization, churn prediction, email campaigns.
                </p>
              </div>
            </TerminalCard>

            <TerminalCard title="Understanding the Visualization" accent="none">
              <div className="text-[11px] text-g-muted space-y-2 leading-relaxed">
                <p>
                  <span className="text-g-green font-bold">The scatter plot</span> shows users projected from
                  6D feature space into 2D via <span className="text-g-text font-bold">PCA</span> (Principal Component
                  Analysis). PCA finds the two directions of maximum variance — the axes that best separate users
                  from each other. Each dot is a user, colored by cluster assignment.
                </p>
                <p>
                  <span className="text-g-green font-bold">Cluster compactness:</span> Tight, well-separated
                  clusters indicate the algorithm found genuine behavioral groups. Overlapping or diffuse clusters
                  suggest k is too high or the features don&apos;t cleanly differentiate users.
                </p>
                <p>
                  <span className="text-g-green font-bold">Reading the centroid profiles:</span> The Cluster Profiles
                  card above shows mean feature values per cluster — read them as personas. High artifact_ratio +
                  high active_days = &quot;Power Creator.&quot; Low total_events + few active_days = &quot;At-Risk Casual.&quot;
                  The centroid tells you the archetypal user in that segment.
                </p>
              </div>
            </TerminalCard>

            <TerminalCard title="Choosing k: Art and Science" accent="none">
              <div className="text-[11px] text-g-muted space-y-2 leading-relaxed">
                <p>
                  <span className="text-g-green font-bold">Too few (k=2–3):</span> Oversimplified. You might get
                  &quot;active&quot; vs &quot;inactive&quot; — useful but shallow. You miss the nuance between types of active users.
                </p>
                <p>
                  <span className="text-g-green font-bold">Too many (k=6+):</span> Overfits. Clusters become
                  hard to distinguish or act on. If two clusters have nearly identical centroids, they should
                  probably be merged.
                </p>
                <p>
                  <span className="text-g-green font-bold">The sweet spot (k=3–5):</span> Each cluster tells a
                  distinct story you can describe in one sentence. Try all four k values and look for when adding
                  another cluster stops producing meaningfully different segments.
                </p>
                <p>
                  The <span className="text-g-text font-bold">inertia metric</span> measures total within-cluster
                  variance — lower is tighter. Plot it across k values: the &quot;elbow&quot; where the curve bends
                  suggests the optimal k. After the elbow, adding more clusters gives diminishing returns.
                </p>
              </div>
            </TerminalCard>

            <TerminalCard title="What to Look For" accent="none">
              <div className="text-[11px] text-g-muted space-y-1.5 leading-relaxed">
                <p>
                  <span className="text-g-green">1.</span>{" "}
                  <span className="text-g-text font-bold">The churn cluster:</span> At k=4, one cluster typically
                  shows low total_events, few active_days, and high avg_latency. These are users who tried the
                  product, hit friction, and disengaged — your highest churn risk and possibly the most recoverable
                  with better infrastructure.
                </p>
                <p>
                  <span className="text-g-green">2.</span>{" "}
                  <span className="text-g-text font-bold">The creator cluster:</span> Find the cluster with the
                  highest artifact_ratio. These are your habit-loop users — the ones who hit the &quot;aha moment.&quot;
                  Cross-reference with the IAT module: these users should match the high-λ (fast return) segment.
                </p>
                <p>
                  <span className="text-g-green">3.</span>{" "}
                  <span className="text-g-text font-bold">Feature dominance:</span> Which features vary most between
                  clusters? If artifact_ratio is similar across all clusters but total_events differs wildly,
                  the main differentiation is <em>quantity</em> not <em>quality</em> of engagement.
                </p>
              </div>
            </TerminalCard>

            <TerminalCard title="Try This" accent="none">
              <div className="text-[11px] text-g-dim space-y-1.5 leading-relaxed">
                <p>
                  <span className="text-g-green font-bold">Experiment 1:</span> Run k=3, then k=4, then k=5.
                  At which k does a genuinely new story appear? When do clusters start feeling like arbitrary
                  splits of the same group? That inflection point is your optimal k.
                </p>
                <p>
                  <span className="text-g-green font-bold">Experiment 2:</span> Set{" "}
                  <span className="text-g-purple">Model Quality</span> to 0.2 and re-run. Does the creator cluster
                  collapse into the casual cluster? Low quality suppresses artifact creation, which blurs the
                  behavioral distinction between engaged and disengaged users.
                </p>
                <p>
                  <span className="text-g-green font-bold">Python challenge:</span> Add silhouette score to the
                  output. Import <code className="text-g-green">sklearn.metrics</code> and call
                  <code className="text-g-green"> silhouette_score(X_scaled, labels)</code>. Include it in the
                  returned JSON. Higher score (0–1) means better-defined clusters — compare it across k values
                  to find the statistically optimal segmentation.
                </p>
              </div>
            </TerminalCard>

            <CrossModuleCard links={[
              { module: "Feature Adoption", path: "/modules/feature-adoption", insight: "K-Means clusters align with feature depth segments — compare cluster centroids to power user profiles." },
              { module: "Session Intensity", path: "/modules/session-intensity", insight: "Cluster archetypes map to session intensity quadrants — Deep Work = creator cluster." },
              { module: "Metric Trees", path: "/modules/metric-trees", insight: "The 'creator' cluster drives artifact adoption rate — the key behavioral node in the metric tree." },
            ]} />

          </div>
        }
      />
    </div>
  );
}
