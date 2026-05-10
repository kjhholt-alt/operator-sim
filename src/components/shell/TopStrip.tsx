import { useEffect, useState } from "react";
import { useFloor } from "@/state/useFloor";
import { cn } from "@/lib/cn";
import { ShiftHUD } from "./ShiftHUD";

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function formatZulu(d: Date) {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}Z`;
}

function formatGameMin(gm: number): string {
  const total = Math.floor(gm * 60);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `T+${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function TopStrip() {
  const now = useClock();
  const units = useFloor((s) => s.units);
  const incidents = useFloor((s) => s.incidents);
  const game_min = useFloor((s) => s.game_min);
  const speed = useFloor((s) => s.speed);
  const paused = useFloor((s) => s.paused);
  const togglePause = useFloor((s) => s.togglePause);
  const setSpeed = useFloor((s) => s.setSpeed);
  const view_mode = useFloor((s) => s.view_mode);
  const setViewMode = useFloor((s) => s.setViewMode);

  const activeUnitCount = Array.from(units.values()).filter(
    (u) => u.status === "en_route" || u.status === "on_scene" || u.status === "transporting",
  ).length;

  const queuedIncidents = Array.from(incidents.values()).filter(
    (i) => i.status === "queued" || i.status === "dispatched" || i.status === "on_scene",
  ).length;

  const resolved24h = Array.from(incidents.values()).filter(
    (i) => i.status === "resolved",
  ).length;

  const fmt = (n: number) => n.toString().padStart(2, "0");

  const kpis = [
    { label: "UNITS", value: fmt(units.size), tone: "fg-bright" },
    { label: "ACTIVE", value: fmt(activeUnitCount), tone: "accent-cyan" },
    { label: "QUEUED", value: fmt(queuedIncidents), tone: "accent-amber" },
    { label: "RESOLVED 24H", value: fmt(resolved24h), tone: "accent-emerald" },
    { label: "AVG RESPONSE", value: "—", tone: "fg-base" },
  ];

  return (
    <header className="h-14 border-b border-border-subtle bg-bg-panel flex items-center px-3 gap-3 select-none overflow-hidden">
      {/* ── ts-left: brand + shift HUD ───────────────────────────── */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <span className="opsim-pulse w-2 h-2 rounded-full bg-accent-emerald shrink-0" />
        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-base shrink-0">
          Operator Sim
        </div>
        <div className="font-sans text-[13px] text-fg-base shrink-0 hidden xl:block">
          Quad Cities · Sector 1
        </div>
        <span className="vrule" />
        <ShiftHUD />
      </div>

      {/* ── ts-right: view-mode / pause / speed / T+ / Zulu / KPIs ── */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* view-mode toggle: MAP (real OSM) ↔ CITY (iso watchfloor) */}
        <div className="flex items-center border border-border-subtle" role="radiogroup" aria-label="View mode">
          {(["map", "city"] as const).map((m) => (
            <button
              key={m}
              role="radio"
              aria-checked={view_mode === m}
              onClick={() => setViewMode(m)}
              className={cn(
                "font-mono text-[10px] uppercase tracking-[0.2em] px-2 py-1 transition-colors",
                view_mode === m
                  ? "bg-accent-cyan/15 text-accent-cyan"
                  : "text-fg-dim hover:text-fg-bright",
              )}
            >
              {m}
            </button>
          ))}
        </div>
        <button
          onClick={togglePause}
          className={cn(
            "font-mono text-[10px] uppercase tracking-[0.2em] px-2 py-1 border transition-colors",
            paused
              ? "border-accent-amber text-accent-amber"
              : "border-border-subtle text-fg-dim hover:text-fg-bright",
          )}
        >
          {paused ? "paused" : "running"}
        </button>
        <div className="flex items-center border border-border-subtle">
          {[0.5, 1, 2, 4].map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s as 0.5 | 1 | 2 | 4)}
              className={cn(
                "font-mono text-[10px] tabular-nums px-2 py-1 transition-colors",
                speed === s
                  ? "bg-accent-cyan/15 text-accent-cyan"
                  : "text-fg-dim hover:text-fg-bright",
              )}
            >
              {s}×
            </button>
          ))}
        </div>
        <div className="font-mono text-[11px] text-accent-cyan tabular-nums">
          {formatGameMin(game_min)}
        </div>
        <div className="font-mono text-[10px] text-fg-dim tabular-nums hidden lg:block">
          {formatZulu(now)}
        </div>

        {/* KPI block — vertical separator + 4-5 metrics, right-aligned values */}
        <div className="flex items-center gap-4 pl-3 border-l border-border-subtle ml-1">
          {kpis.map((k) => (
            <div key={k.label} className="flex flex-col items-end leading-[1.05]">
              <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-fg-dim">
                {k.label}
              </div>
              <div className={cn("font-mono text-[15px] tabular-nums", `text-${k.tone}`)}>
                {k.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}
