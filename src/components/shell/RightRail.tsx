import { cn } from "@/lib/cn";

interface Props {
  className?: string;
}

export function RightRail({ className }: Props) {
  return (
    <aside className={cn("bg-bg-panel min-h-0 flex flex-col", className)}>
      <div className="border-b border-border-subtle px-3 py-2">
        <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-fg-dim">
          Dossier
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div className="font-mono text-[10px] text-fg-mute uppercase tracking-[0.18em]">
          — no entity selected —
        </div>
        <div className="text-[11px] text-fg-dim leading-relaxed">
          Click a unit, incident, or address on the map or in the ontology rail to open its dossier here.
        </div>
        <div className="border-t border-border-subtle pt-3">
          <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-fg-dim mb-2">
            Linked Entities
          </div>
          <div className="font-mono text-[10px] text-fg-mute">—</div>
        </div>
        <div className="border-t border-border-subtle pt-3">
          <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-fg-dim mb-2">
            Timeline
          </div>
          <div className="font-mono text-[10px] text-fg-mute">—</div>
        </div>
      </div>
    </aside>
  );
}
