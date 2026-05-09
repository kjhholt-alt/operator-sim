import { cn } from "@/lib/cn";
import { useFloor } from "@/state/useFloor";
import type { EntityKind } from "@/lib/schemas";

interface Props {
  className?: string;
}

interface SectionRow {
  label: string;
  kind: EntityKind;
  count: number;
}

export function LeftRail({ className }: Props) {
  const units = useFloor((s) => s.units);
  const incidents = useFloor((s) => s.incidents);
  const stations = useFloor((s) => s.stations);
  const personnel = useFloor((s) => s.personnel);
  const intel = useFloor((s) => s.intel);
  const callers = useFloor((s) => s.callers);
  const vehicles = useFloor((s) => s.vehicles);
  const addresses = useFloor((s) => s.addresses);
  const select = useFloor((s) => s.select);
  const selection = useFloor((s) => s.selection);

  const sections: SectionRow[] = [
    { label: "UNITS", kind: "unit", count: units.size },
    { label: "INCIDENTS", kind: "incident", count: incidents.size },
    { label: "STATIONS", kind: "station", count: stations.size },
    { label: "PERSONNEL", kind: "personnel", count: personnel.size },
    { label: "VEHICLES", kind: "vehicle", count: vehicles.size },
    { label: "CALLERS", kind: "caller", count: callers.size },
    { label: "INTEL", kind: "intel", count: intel.size },
    { label: "ADDRESSES", kind: "address", count: addresses.size },
  ];

  // Returned as a generic identifiable map; per-kind shape is recovered via
  // labelFor / trailingFor below. TypeScript can't preserve the union neatly.
  function mapFor(kind: EntityKind): Map<string, { id: string }> {
    switch (kind) {
      case "unit": return units as unknown as Map<string, { id: string }>;
      case "incident": return incidents as unknown as Map<string, { id: string }>;
      case "station": return stations as unknown as Map<string, { id: string }>;
      case "personnel": return personnel as unknown as Map<string, { id: string }>;
      case "vehicle": return vehicles as unknown as Map<string, { id: string }>;
      case "caller": return callers as unknown as Map<string, { id: string }>;
      case "intel": return intel as unknown as Map<string, { id: string }>;
      case "address": return addresses as unknown as Map<string, { id: string }>;
    }
  }

  function labelFor(kind: EntityKind, item: unknown): string {
    const x = item as Record<string, unknown>;
    if (kind === "unit" || kind === "vehicle") return String(x.callsign ?? x.id);
    if (kind === "station") return String(x.name ?? x.id);
    if (kind === "personnel") return String(x.name ?? x.id);
    if (kind === "caller") return String(x.display ?? x.id);
    if (kind === "address") return String(x.street ?? x.id);
    if (kind === "intel") return String(x.type ?? x.id);
    return String(x.id);
  }

  function trailingFor(kind: EntityKind, item: unknown): string | null {
    const x = item as Record<string, unknown>;
    if (kind === "unit") return String(x.status).replace(/_/g, " ");
    if (kind === "incident") return String(x.status).replace(/_/g, " ");
    if (kind === "intel") return String(x.severity);
    return null;
  }

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
          const map = mapFor(s.kind);
          return (
            <div key={s.label}>
              <button
                onClick={() => {
                  const first = map?.values().next().value;
                  if (first && typeof first === "object" && "id" in first) {
                    select({ kind: s.kind, id: (first as { id: string }).id });
                  }
                }}
                className={cn(
                  "w-full text-left px-3 py-2 border-b border-border-subtle transition-colors flex items-center justify-between group",
                  sectionActive ? "bg-bg-hover" : "hover:bg-bg-hover",
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
              {sectionActive && map && map.size > 0 && (
                <ul className="bg-bg-base/40 max-h-64 overflow-y-auto">
                  {Array.from(map.values()).slice(0, 30).map((item) => {
                    const id = (item as { id: string }).id;
                    const active = selection?.id === id;
                    const label = labelFor(s.kind, item);
                    const trailing = trailingFor(s.kind, item);
                    return (
                      <li key={id}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            select({ kind: s.kind, id });
                          }}
                          className={cn(
                            "w-full text-left px-4 py-1.5 border-b border-border-subtle/40 flex items-center justify-between hover:bg-bg-hover",
                            active && "bg-bg-hover",
                          )}
                        >
                          <span className="font-mono text-[10px] tabular-nums text-fg-bright truncate max-w-[10rem]">
                            {label}
                          </span>
                          {trailing && (
                            <span
                              className={cn(
                                "font-mono text-[9px] uppercase tracking-[0.2em]",
                                s.kind === "unit" && trailing === "available" && "text-accent-emerald",
                                s.kind === "unit" && trailing === "en route" && "text-accent-amber",
                                s.kind === "unit" && trailing === "on scene" && "text-accent-cyan",
                                s.kind === "unit" && (trailing === "returning" || trailing === "out of service") && "text-fg-mute",
                                s.kind === "incident" && "text-accent-cyan",
                                s.kind === "intel" && "text-fg-dim",
                              )}
                            >
                              {trailing}
                            </span>
                          )}
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
