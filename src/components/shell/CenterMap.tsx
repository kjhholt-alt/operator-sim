import { cn } from "@/lib/cn";
import { OperatorMap } from "@/components/map/Map";

interface Props {
  className?: string;
}

export function CenterMap({ className }: Props) {
  return (
    <main className={cn("bg-bg-base relative min-h-0 overflow-hidden", className)}>
      <OperatorMap />

      {/* Sector overlay placeholder (top-left) */}
      <div className="absolute top-3 left-3 font-mono text-[9px] uppercase tracking-[0.22em] text-fg-dim bg-bg-panel/80 backdrop-blur-sm px-2 py-1 border border-border-subtle">
        Sector 1 · 41.5236°N 90.5776°W
      </div>

      {/* Map controls placeholder (top-right) */}
      <div className="absolute top-3 right-3 flex flex-col gap-1 font-mono text-[10px]">
        <button className="bg-bg-panel border border-border-subtle hover:border-border-bright text-fg-base px-2 py-1 transition-colors">
          +
        </button>
        <button className="bg-bg-panel border border-border-subtle hover:border-border-bright text-fg-base px-2 py-1 transition-colors">
          −
        </button>
      </div>

      {/* Legend (bottom-left) */}
      <div className="absolute bottom-3 left-3 bg-bg-panel/80 backdrop-blur-sm border border-border-subtle px-3 py-2 font-mono text-[9px] uppercase tracking-[0.18em]">
        <div className="text-fg-dim mb-1">Legend</div>
        <div className="flex items-center gap-2 text-fg-base"><span className="w-2 h-2 rounded-full bg-accent-cyan" /> Active</div>
        <div className="flex items-center gap-2 text-fg-base"><span className="w-2 h-2 rounded-full bg-accent-amber" /> En route</div>
        <div className="flex items-center gap-2 text-fg-base"><span className="w-2 h-2 rounded-full bg-accent-emerald" /> Available</div>
        <div className="flex items-center gap-2 text-fg-base"><span className="w-2 h-2 rounded-full bg-accent-crimson" /> Critical</div>
      </div>
    </main>
  );
}
