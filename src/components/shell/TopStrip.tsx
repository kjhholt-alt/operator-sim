import { useEffect, useState } from "react";
import { useFloor } from "@/state/useFloor";

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
    <header className="h-14 border-b border-border-subtle bg-bg-panel flex items-center px-4 gap-6 select-none">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-accent-emerald animate-pulse" />
        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-dim">
          Operator Sim
        </div>
        <div className="font-sans text-[13px] text-fg-base">
          Quad Cities · Sector 1
        </div>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <button
          onClick={togglePause}
          className={`font-mono text-[10px] uppercase tracking-[0.2em] px-2 py-1 border ${
            paused
              ? "border-accent-amber text-accent-amber"
              : "border-border-subtle text-fg-dim hover:text-fg-bright"
          }`}
        >
          {paused ? "paused" : "running"}
        </button>
        <div className="flex items-center border border-border-subtle">
          {[0.5, 1, 2, 4].map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s as 0.5 | 1 | 2 | 4)}
              className={`font-mono text-[10px] tabular-nums px-2 py-1 ${
                speed === s
                  ? "bg-accent-cyan/20 text-accent-cyan"
                  : "text-fg-dim hover:text-fg-bright"
              }`}
            >
              {s}×
            </button>
          ))}
        </div>
        <div className="font-mono text-[11px] text-accent-cyan tabular-nums">
          {formatGameMin(game_min)}
        </div>
        <div className="font-mono text-[11px] text-fg-dim tabular-nums">
          {formatZulu(now)}
        </div>
      </div>

      <div className="flex items-center gap-5">
        {kpis.map((k) => (
          <div key={k.label} className="flex flex-col items-end leading-tight">
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-fg-dim">
              {k.label}
            </div>
            <div className={`font-mono text-[15px] tabular-nums text-${k.tone}`}>
              {k.value}
            </div>
          </div>
        ))}
      </div>
    </header>
  );
}
