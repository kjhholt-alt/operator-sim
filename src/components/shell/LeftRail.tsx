import { cn } from "@/lib/cn";
import { useFloor } from "@/state/useFloor";
import type { EntityKind } from "@/lib/schemas";

interface Props {
  className?: string;
}

interface SectionRow {
  label: string;
  kind: EntityKind | "intel";
  count: number;
}

export function LeftRail({ className }: Props) {
  const units = useFloor((s) => s.units);
  const incidents = useFloor((s) => s.incidents);
  const stations = useFloor((s) => s.stations);
  const personnel = useFloor((s) => s.personnel);
  const intel = useFloor((s) => s.intel);
  const select = useFloor((s) => s.select);
  const selection = useFloor((s) => s.selection);

  const sections: SectionRow[] = [
    { label: "UNITS", kind: "unit", count: units.size },
    { label: "INCIDENTS", kind: "incident", count: incidents.size },
    { label: "STATIONS", kind: "station", count: stations.size },
    { label: "PERSONNEL", kind: "personnel", count: personnel.size },
    { label: "INTEL", kind: "intel", count: intel.size },
  ];

  return (
    <aside className={cn("bg-bg-panel min-h-0 flex flex-col", className)}>
      <div className="border-b border-border-subtle px-3 py-2">
        <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-fg-dim">
          Ontology
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto">
        {sections.map((s) => {
          const sectionActive = selection?.kind === s.kind;
          return (
            <div key={s.label}>
              <button
                onClick={() => {
                  const map = (() => {
                    switch (s.kind) {
                      case "unit": return units;
                      case "incident": return incidents;
                      case "station": return stations;
                      case "personnel": return personnel;
                      case "intel": return intel;
                      default: return null;
                    }
                  })();
                  const first = map?.values().next().value;
                  if (first && "id" in first) {
                    select({ kind: s.kind as EntityKind, id: first.id });
                  }
                }}
                className={cn(
                  "w-full text-left px-3 py-2 border-b border-border-subtle transition-colors flex items-center justify-between group",
                  sectionActive
                    ? "bg-bg-hover"
                    : "hover:bg-bg-hover",
                )}
              >
                <span
                  className={cn(
                    "font-mono text-[10px] uppercase tracking-[0.18em]",
                    sectionActive ? "text-fg-bright" : "text-fg-base group-hover:text-fg-bright",
                  )}
                >
                  {s.label}
                </span>
                <span
                  className={cn(
                    "font-mono text-[10px] tabular-nums",
                    s.count > 0
                      ? "text-accent-cyan"
                      : "text-fg-mute group-hover:text-fg-dim",
                  )}
                >
                  {s.count.toString().padStart(3, "0")}
                </span>
              </button>
              {sectionActive && s.kind === "unit" && units.size > 0 && (
                <ul className="bg-bg-base/40">
                  {Array.from(units.values()).map((u) => {
                    const active = selection?.id === u.id;
                    return (
                      <li key={u.id}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            select({ kind: "unit", id: u.id });
                          }}
                          className={cn(
                            "w-full text-left px-4 py-1.5 border-b border-border-subtle/40 flex items-center justify-between hover:bg-bg-hover",
                            active && "bg-bg-hover",
                          )}
                        >
                          <span className="font-mono text-[10px] tabular-nums text-fg-bright">
                            {u.callsign}
                          </span>
                          <span
                            className={cn(
                              "font-mono text-[9px] uppercase tracking-[0.2em]",
                              u.status === "available" && "text-accent-emerald",
                              u.status === "en_route" && "text-accent-amber",
                              u.status === "on_scene" && "text-accent-cyan",
                              u.status === "transporting" && "text-accent-violet",
                              (u.status === "returning" || u.status === "out_of_service") && "text-fg-mute",
                            )}
                          >
                            {u.status.replace(/_/g, " ")}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
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
