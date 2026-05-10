import { cn } from "@/lib/cn";
import { OperatorMap } from "@/components/map/Map";
import { IsometricCity } from "@/components/map/IsometricCity";
import { CenterOverlays } from "./CenterOverlays";
import { useFloor } from "@/state/useFloor";

interface Props {
  className?: string;
}

export function CenterMap({ className }: Props) {
  const view_mode = useFloor((s) => s.view_mode);
  const isCity = view_mode === "city";

  return (
    <main className={cn("bg-bg-base relative min-h-0 overflow-hidden", className)}>
      {isCity ? <IsometricCity /> : <OperatorMap />}

      {/* Sector overlay (top-left) */}
      <div className="absolute top-3 left-3 font-mono text-[9px] uppercase tracking-[0.22em] text-fg-dim bg-bg-panel/80 backdrop-blur-sm px-2 py-1 border border-border-subtle">
        {isCity
          ? "Sector 1 · 41.5236°N 90.5776°W · iso/30°"
          : "Sector 1 · 41.5236°N 90.5776°W · z14"}
      </div>

      {/* Map zoom controls (top-right) */}
      <div className="absolute top-3 right-3 flex flex-col gap-1 font-mono text-[10px] z-[1]">
        <button className="w-6 h-6 bg-bg-panel border border-border-subtle hover:border-border-bright text-fg-base transition-colors">
          +
        </button>
        <button className="w-6 h-6 bg-bg-panel border border-border-subtle hover:border-border-bright text-fg-base transition-colors">
          −
        </button>
      </div>

      {/* Day-12 design overlays — Incident Queue + Shift Rundown */}
      <CenterOverlays />

      {/* Legend (bottom-left) */}
      <div className="absolute bottom-3 left-3 bg-bg-panel/80 backdrop-blur-sm border border-border-subtle px-3 py-2 font-mono text-[9px] uppercase tracking-[0.18em]">
        <div className="text-fg-dim mb-1">Legend · 4 states</div>
        <div className="flex items-center gap-2 text-fg-base py-0.5"><span className="w-2 h-2 rounded-full bg-accent-cyan" /> Active</div>
        <div className="flex items-center gap-2 text-fg-base py-0.5"><span className="w-2 h-2 rounded-full bg-accent-amber" /> En route</div>
        <div className="flex items-center gap-2 text-fg-base py-0.5"><span className="w-2 h-2 rounded-full bg-accent-emerald" /> Available</div>
        <div className="flex items-center gap-2 text-fg-base py-0.5"><span className="w-2 h-2 rounded-full bg-accent-crimson" /> Critical</div>
      </div>

      {/* Scale + datum (bottom-right) */}
      <div className="absolute bottom-3 right-3 bg-bg-panel/80 backdrop-blur-sm border border-border-subtle px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-fg-dim flex items-center gap-3">
        <span>WGS84</span>
        <span className="block h-px w-10 bg-fg-base" />
        <span>500m</span>
      </div>
    </main>
  );
}
