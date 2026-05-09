import { useEffect, useState } from "react";

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

export function TopStrip() {
  const now = useClock();

  const kpis = [
    { label: "UNITS", value: "00", tone: "fg-bright" },
    { label: "ACTIVE", value: "00", tone: "accent-cyan" },
    { label: "QUEUED", value: "00", tone: "accent-amber" },
    { label: "RESOLVED 24H", value: "00", tone: "accent-emerald" },
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

      <div className="font-mono text-[11px] text-fg-dim ml-auto tabular-nums">
        {formatZulu(now)}
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
