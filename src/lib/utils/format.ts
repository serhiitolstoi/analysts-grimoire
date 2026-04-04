export function fmtPct(v: number, decimals = 1): string {
  return `${(v * 100).toFixed(decimals)}%`;
}

export function fmtMs(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function fmtDays(d: number): string {
  if (d < 1) return `${(d * 24).toFixed(1)}h`;
  if (d < 7) return `${d.toFixed(1)}d`;
  if (d < 30) return `${(d / 7).toFixed(1)}w`;
  return `${(d / 30).toFixed(1)}mo`;
}

export function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

export function fmtProb(p: number): string {
  return p.toFixed(3);
}

export function isoDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

export function isoDateTime(d: Date): string {
  return d.toISOString().replace("Z", "");
}
