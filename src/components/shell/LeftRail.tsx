import { cn } from "@/lib/cn";

interface Props {
  className?: string;
}

export function LeftRail({ className }: Props) {
  const sections: Array<{ label: string; count: number }> = [
    { label: "UNITS", count: 0 },
    { label: "INCIDENTS", count: 0 },
    { label: "STATIONS", count: 0 },
    { label: "PERSONNEL", count: 0 },
    { label: "INTEL", count: 0 },
  ];

  return (
    <aside className={cn("bg-bg-panel min-h-0 flex flex-col", className)}>
      <div className="border-b border-border-subtle px-3 py-2">
        <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-fg-dim">
          Ontology
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto">
        {sections.map((s) => (
          <button
            key={s.label}
            className="w-full text-left px-3 py-2 border-b border-border-subtle hover:bg-bg-hover transition-colors flex items-center justify-between group"
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-base group-hover:text-fg-bright">
              {s.label}
            </span>
            <span className="font-mono text-[10px] tabular-nums text-fg-dim group-hover:text-accent-cyan">
              {s.count.toString().padStart(3, "0")}
            </span>
          </button>
        ))}
      </nav>
      <div className="border-t border-border-subtle px-3 py-2">
        <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-fg-dim">
          Filters
        </div>
        <div className="font-mono text-[10px] text-fg-mute mt-1">— none —</div>
      </div>
    </aside>
  );
}
