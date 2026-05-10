/**
 * Operator Sim — center-map overlay cards.
 *
 * Day 12: ported from claude.ai/design "Operator Sim Watchfloor". Two
 * floating cards land on top of the map:
 *
 *   1. Incident Queue (top-right) — one row per live incident, priority
 *      stripe on the left, severity chip + status chip on the right,
 *      severity-mix bar chart in the footer.
 *   2. Shift Rundown (mid-right) — chronological timeline of every
 *      shift-defined incident with a state dot (pass / active / queued
 *      / forecast), plus a response-time sparkline in the footer.
 *
 * Both cards click-bind into the right rail dossier so the operator can
 * pivot from a queue row straight into the incident's full record.
 */

import { useMemo } from "react";
import { useFloor } from "@/state/useFloor";
import { cn } from "@/lib/cn";
import type { Incident, IncidentSeverity, IncidentStatus } from "@/lib/schemas";

function fmtMinSec(game_min: number): string {
  const total = Math.floor(game_min * 60);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function priorityForIncident(i: Incident): 1 | 2 | 3 | 4 {
  switch (i.severity) {
    case "critical": return 1;
    case "high": return 2;
    case "moderate": return 3;
    case "low": return 4;
    default: return 4;
  }
}

function severityLabel(sev: IncidentSeverity): string {
  switch (sev) {
    case "critical": return "CRIT";
    case "high": return "HI";
    case "moderate": return "MOD";
    case "low": return "LOW";
  }
}

function statusLabel(st: IncidentStatus): string {
  return st.replace(/_/g, " ").toUpperCase();
}

export function CenterOverlays() {
  const incidents = useFloor((s) => s.incidents);
  const addresses = useFloor((s) => s.addresses);
  const shift = useFloor((s) => s.shift);
  const game_min = useFloor((s) => s.game_min);
  const incidents_spawned = useFloor((s) => s.incidents_spawned);
  const select = useFloor((s) => s.select);

  // ── live queue ────────────────────────────────────────────────────────
  // Sort by priority (1 highest), then by reported time (most recent first).
  const liveQueue = useMemo(() => {
    const live: Incident[] = [];
    for (const i of incidents.values()) {
      if (i.status !== "resolved" && i.status !== "cancelled") live.push(i);
    }
    live.sort((a, b) => {
      const pa = priorityForIncident(a);
      const pb = priorityForIncident(b);
      if (pa !== pb) return pa - pb;
      return b.reported_at_game_min - a.reported_at_game_min;
    });
    return live.slice(0, 8);
  }, [incidents]);

  const sevCounts = useMemo(() => {
    const c = { critical: 0, high: 0, moderate: 0, low: 0 };
    for (const i of incidents.values()) {
      if (i.status === "resolved" || i.status === "cancelled") continue;
      c[i.severity] += 1;
    }
    return c;
  }, [incidents]);

  // active vs forecast counts for the queue header
  const headerCounts = useMemo(() => {
    let active = 0;
    let forecast = 0;
    if (shift) {
      for (const si of shift.incidents) {
        if (incidents_spawned.has(si.id)) active += 1;
        else forecast += 1;
      }
    }
    return { active, forecast };
  }, [shift, incidents_spawned]);

  // ── shift rundown rows ───────────────────────────────────────────────
  // Each shift incident → a row with a state dot. We map runtime status to
  // the design's pass/active/queued/forecast taxonomy.
  type RundownRow = {
    key: string;
    t: string;
    label: string;
    state: "pass" | "active" | "queued" | "forecast";
  };
  const rundown = useMemo<RundownRow[]>(() => {
    if (!shift) return [];
    const rows: RundownRow[] = shift.incidents.map((si) => {
      const live = incidents.get(si.id);
      const t = `T+${fmtMinSec(si.spawn_time_game_min)}`;
      const labelType = si.type.replace(/_/g, " ");
      let state: RundownRow["state"];
      let suffix = "";
      if (!live) {
        state = "forecast";
        suffix = "predicted";
      } else if (live.status === "resolved" || live.status === "cancelled") {
        state = "pass";
        suffix = live.status === "cancelled" ? "cancelled" : "resolved";
      } else if (live.status === "on_scene" || live.status === "dispatched") {
        state = "active";
        suffix = live.status === "on_scene" ? "on scene" : "dispatched";
      } else {
        state = "queued";
        suffix = "queued";
      }
      return { key: si.id, t, label: `${si.id} ${labelType} · ${suffix}`, state };
    });
    return rows;
  }, [shift, incidents]);

  // ── response-time sparkline ──────────────────────────────────────────
  // Points: per-resolved-incident response time (minutes from reported →
  // resolved). Falls back to a flat baseline when nothing has resolved
  // yet so the chart never empties.
  const sparkData = useMemo(() => {
    const pts: number[] = [];
    if (shift) {
      for (const si of shift.incidents) {
        const live = incidents.get(si.id);
        if (live?.resolved_at_game_min !== undefined) {
          const dt = Math.max(0, live.resolved_at_game_min - si.spawn_time_game_min);
          pts.push(dt);
        }
      }
    }
    while (pts.length < 4) pts.unshift(0);
    return pts;
  }, [shift, incidents]);

  const sparkStats = useMemo(() => {
    const real = sparkData.filter((v) => v > 0);
    if (real.length === 0) return { min: 0, avg: 0, max: 0, p95: 0 };
    const sorted = [...real].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const avg = real.reduce((a, b) => a + b, 0) / real.length;
    const p95Idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
    const p95 = sorted[p95Idx];
    return { min, avg, max, p95 };
  }, [sparkData]);

  // Build the SVG sparkline path.
  const spark = useMemo(() => {
    const w = 220;
    const h = 28;
    const data = sparkData;
    const max = Math.max(1, ...data);
    const step = data.length > 1 ? w / (data.length - 1) : w;
    const pts = data
      .map((v, i) => `${(i * step).toFixed(1)},${(h - (v / max) * (h - 4) - 2).toFixed(1)}`)
      .join(" ");
    const area = `M 0,${h} L ${pts} L ${w},${h} Z`;
    const lastIdx = data.length - 1;
    const lastX = lastIdx * step;
    const lastY = h - (data[lastIdx] / max) * (h - 4) - 2;
    return { w, h, pts, area, lastX, lastY };
  }, [sparkData]);

  return (
    <>
      {/* ── Incident queue ───────────────────────────────────────────── */}
      <aside className="map-card map-queue">
        <div className="card-h">
          <span className="h-title">Incident Queue</span>
          <span className="font-mono text-[9px] text-fg-mute">
            {headerCounts.active.toString().padStart(2, "0")} active ·
            {" "}
            {headerCounts.forecast.toString().padStart(2, "0")} fcst
          </span>
        </div>
        <div className="queue-list">
          {liveQueue.length === 0 && (
            <div className="px-3 py-2 font-mono text-[10px] text-fg-mute">— channel cold —</div>
          )}
          {liveQueue.map((i) => {
            const addr = addresses.get(i.address_id);
            const pri = priorityForIncident(i);
            return (
              <button
                key={i.id}
                className={cn("queue-row", `pri-${pri}`)}
                onClick={() => select({ kind: "incident", id: i.id })}
              >
                <span className="qcol-t">T+{fmtMinSec(i.reported_at_game_min)}</span>
                <span className="qcol-id">{i.id}</span>
                <span className="qcol-type">{i.type.replace(/_/g, " ")}</span>
                <span className={cn("sev", `sev-${i.severity}`)}>{severityLabel(i.severity)}</span>
                <span className="qcol-addr">{addr?.street ?? i.address_id}</span>
                <span className={cn("qstat", `qstat-${i.status}`)}>{statusLabel(i.status)}</span>
              </button>
            );
          })}
        </div>
        <div className="card-foot">
          <div className="font-mono text-[9px] text-fg-mute">Severity mix · live</div>
          <div className="sev-bars">
            <SevBar label="CRIT" v={sevCounts.critical} tone="crimson" />
            <SevBar label="HI" v={sevCounts.high} tone="amber" />
            <SevBar label="MOD" v={sevCounts.moderate} tone="amber" />
            <SevBar label="LOW" v={sevCounts.low} tone="base" />
          </div>
        </div>
      </aside>

      {/* ── Shift rundown ────────────────────────────────────────────── */}
      <aside className="map-card map-rundown">
        <div className="card-h">
          <span className="h-title">Shift Rundown</span>
          <span className="font-mono text-[9px] text-fg-mute">
            {shift ? `${shift.id} · T+${Math.floor(game_min)}m` : "no shift loaded"}
          </span>
        </div>
        <div className="rundown-list">
          {rundown.length === 0 && (
            <div className="px-3 py-2 font-mono text-[10px] text-fg-mute">— pick a shift in the lobby —</div>
          )}
          {rundown.map((r) => (
            <div key={r.key} className={cn("rundown-row", `state-${r.state}`)}>
              <span className="font-mono text-[10px] text-accent-cyan">{r.t}</span>
              <span className={cn("rundown-dot", `dot-${r.state}`)} />
              <span className="font-mono text-[10px] text-fg-base truncate">{r.label}</span>
              <span className={cn("rundown-state", `state-tag-${r.state}`)}>{r.state.toUpperCase()}</span>
            </div>
          ))}
        </div>
        <div className="card-foot">
          <div className="font-mono text-[9px] text-fg-mute">Response time · this shift (min)</div>
          <svg className="spark" viewBox={`0 0 ${spark.w} ${spark.h}`} width={spark.w} height={spark.h}>
            <path d={spark.area} fill="rgba(74,216,230,0.10)" />
            <polyline points={spark.pts} fill="none" stroke="var(--color-accent-cyan)" strokeWidth="1.2" />
            <circle cx={spark.lastX} cy={spark.lastY} r="2" fill="var(--color-accent-cyan)" />
          </svg>
          <div className="spark-stats">
            <span><span className="spark-l">MIN</span> <span className="spark-v">{sparkStats.min.toFixed(1)}</span></span>
            <span><span className="spark-l">AVG</span> <span className="spark-v">{sparkStats.avg.toFixed(1)}</span></span>
            <span><span className="spark-l">MAX</span> <span className="spark-v">{sparkStats.max.toFixed(1)}</span></span>
            <span><span className="spark-l">P95</span> <span className="spark-v spark-v-amber">{sparkStats.p95.toFixed(1)}</span></span>
          </div>
        </div>
      </aside>
    </>
  );
}

function SevBar({ label, v, tone }: { label: string; v: number; tone: "crimson" | "amber" | "base" }) {
  const fill =
    tone === "crimson" ? "var(--color-accent-crimson)" :
    tone === "amber" ? "var(--color-accent-amber)" :
    "var(--color-fg-base)";
  // Each filled increment is 22px wide, capped to the meter width.
  const widthPx = Math.min(88, v * 22);
  return (
    <div className="sev-bar">
      <span className="font-mono text-[9px] text-fg-mute">{label}</span>
      <div className="sev-meter">
        <div className="sev-fill" style={{ width: `${widthPx}px`, background: fill }} />
      </div>
      <span className="font-mono text-[10px] tabular-nums text-fg-bright">{v.toString().padStart(2, "0")}</span>
    </div>
  );
}
