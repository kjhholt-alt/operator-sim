import { cn } from "@/lib/cn";
import { useFloor } from "@/state/useFloor";
import type { Unit, Incident, Station, Personnel } from "@/lib/schemas";

interface Props {
  className?: string;
}

interface RowProps {
  label: string;
  value: string | number;
  tone?: "base" | "bright" | "cyan" | "amber" | "emerald" | "crimson";
}

function Row({ label, value, tone = "base" }: RowProps) {
  const toneClass = {
    base: "text-fg-base",
    bright: "text-fg-bright",
    cyan: "text-accent-cyan",
    amber: "text-accent-amber",
    emerald: "text-accent-emerald",
    crimson: "text-accent-crimson",
  }[tone];
  return (
    <div className="flex items-center justify-between text-[11px] py-0.5">
      <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-fg-dim">
        {label}
      </span>
      <span className={cn("font-mono tabular-nums", toneClass)}>{value}</span>
    </div>
  );
}

export function RightRail({ className }: Props) {
  const selection = useFloor((s) => s.selection);
  const getEntity = useFloor((s) => s.getEntity);
  const stations = useFloor((s) => s.stations);
  const incidents = useFloor((s) => s.incidents);
  const personnel = useFloor((s) => s.personnel);
  const addresses = useFloor((s) => s.addresses);

  const entity = selection ? getEntity(selection.kind, selection.id) : null;

  return (
    <aside className={cn("bg-bg-panel min-h-0 flex flex-col", className)}>
      <div className="border-b border-border-subtle px-3 py-2 flex items-center justify-between">
        <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-fg-dim">
          Dossier
        </div>
        {entity && (
          <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-accent-cyan">
            {entity.kind}
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {!entity && (
          <>
            <div className="font-mono text-[10px] text-fg-mute uppercase tracking-[0.18em]">
              — no entity selected —
            </div>
            <div className="text-[11px] text-fg-dim leading-relaxed">
              Click an entity in the ontology rail or on the map to open its dossier here.
            </div>
          </>
        )}

        {entity?.kind === "unit" && <UnitDossier u={entity.data as Unit} stations={stations} incidents={incidents} personnel={personnel} />}
        {entity?.kind === "incident" && <IncidentDossier i={entity.data as Incident} addresses={addresses} />}
        {entity?.kind === "station" && <StationDossier s={entity.data as Station} addresses={addresses} />}
        {entity?.kind === "personnel" && <PersonnelDossier p={entity.data as Personnel} stations={stations} />}
      </div>
    </aside>
  );
}

function UnitDossier({
  u,
  stations,
  incidents,
  personnel,
}: {
  u: Unit;
  stations: Map<string, Station>;
  incidents: Map<string, Incident>;
  personnel: Map<string, Personnel>;
}) {
  const station = stations.get(u.homebase_station_id);
  const incident = u.current_incident_id ? incidents.get(u.current_incident_id) : null;
  const statusTone = (() => {
    switch (u.status) {
      case "available": return "emerald";
      case "en_route": return "amber";
      case "on_scene": return "cyan";
      case "transporting": return "base";
      default: return "base";
    }
  })() as RowProps["tone"];

  return (
    <>
      <div>
        <div className="font-mono text-[15px] text-fg-bright tabular-nums">
          {u.callsign}
        </div>
        <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-fg-dim mt-0.5">
          unit · {u.id}
        </div>
      </div>
      <div className="border-t border-border-subtle pt-3 space-y-1">
        <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-fg-dim mb-1">
          status
        </div>
        <Row label="state" value={u.status.replace(/_/g, " ").toUpperCase()} tone={statusTone} />
        <Row label="since (game-min)" value={u.status_since_game_min.toFixed(1)} />
        <Row label="crew" value={u.crew.length} tone="bright" />
      </div>
      <div className="border-t border-border-subtle pt-3 space-y-1">
        <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-fg-dim mb-1">
          linked
        </div>
        <Row label="homebase" value={station?.name ?? u.homebase_station_id} tone="cyan" />
        {incident && <Row label="incident" value={incident.id} tone="amber" />}
        {u.crew.slice(0, 4).map((pid) => {
          const p = personnel.get(pid);
          return p ? <Row key={pid} label="personnel" value={p.name} /> : null;
        })}
      </div>
      <div className="border-t border-border-subtle pt-3 space-y-1">
        <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-fg-dim mb-1">
          position
        </div>
        <Row label="lng" value={u.current_position[0].toFixed(5)} />
        <Row label="lat" value={u.current_position[1].toFixed(5)} />
      </div>
    </>
  );
}

function IncidentDossier({
  i,
  addresses,
}: {
  i: Incident;
  addresses: Map<string, import("@/lib/schemas").Address>;
}) {
  const addr = addresses.get(i.address_id);
  const sevTone: RowProps["tone"] =
    i.severity === "critical" ? "crimson" :
    i.severity === "high" ? "amber" :
    i.severity === "moderate" ? "base" : "base";

  return (
    <>
      <div>
        <div className="font-mono text-[15px] text-fg-bright tabular-nums">{i.id}</div>
        <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-fg-dim mt-0.5">
          incident · {i.type.replace(/_/g, " ")}
        </div>
      </div>
      <div className="border-t border-border-subtle pt-3 space-y-1">
        <Row label="severity" value={i.severity.toUpperCase()} tone={sevTone} />
        <Row label="status" value={i.status.toUpperCase()} tone="cyan" />
        <Row label="reported" value={`${i.reported_at_game_min.toFixed(1)} min`} />
        <Row label="window" value={`${i.resolution_window_game_min.toFixed(1)} min`} />
      </div>
      <div className="border-t border-border-subtle pt-3 space-y-1">
        <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-fg-dim mb-1">
          location
        </div>
        <Row label="address" value={addr?.street ?? i.address_id} tone="cyan" />
        {addr && <Row label="city" value={`${addr.city}, ${addr.state}`} />}
      </div>
      <div className="border-t border-border-subtle pt-3 space-y-1">
        <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-fg-dim mb-1">
          dispatched
        </div>
        {i.dispatched_unit_ids.length === 0
          ? <div className="font-mono text-[10px] text-fg-mute">— none —</div>
          : i.dispatched_unit_ids.map((uid) => <Row key={uid} label="unit" value={uid} tone="cyan" />)}
      </div>
    </>
  );
}

function StationDossier({
  s,
  addresses,
}: {
  s: Station;
  addresses: Map<string, import("@/lib/schemas").Address>;
}) {
  const addr = addresses.get(s.address_id);
  return (
    <>
      <div>
        <div className="font-mono text-[15px] text-fg-bright">{s.name}</div>
        <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-fg-dim mt-0.5">
          station · {s.agency}
        </div>
      </div>
      <div className="border-t border-border-subtle pt-3 space-y-1">
        <Row label="address" value={addr?.street ?? s.address_id} tone="cyan" />
        <Row label="capacity (units)" value={s.capacity_units} />
        <Row label="capacity (crew)" value={s.capacity_personnel} />
      </div>
    </>
  );
}

function PersonnelDossier({
  p,
  stations,
}: {
  p: Personnel;
  stations: Map<string, Station>;
}) {
  const station = stations.get(p.homebase_station_id);
  return (
    <>
      <div>
        <div className="font-mono text-[15px] text-fg-bright">{p.name}</div>
        <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-fg-dim mt-0.5">
          personnel · {p.role}
        </div>
      </div>
      <div className="border-t border-border-subtle pt-3 space-y-1">
        <Row label="homebase" value={station?.name ?? p.homebase_station_id} tone="cyan" />
        <Row label="hire date" value={p.hire_date.slice(0, 10)} />
        <Row label="active" value={p.active ? "yes" : "no"} tone={p.active ? "emerald" : "base"} />
      </div>
      {p.skills.length > 0 && (
        <div className="border-t border-border-subtle pt-3 space-y-1">
          <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-fg-dim mb-1">
            skills
          </div>
          {p.skills.map((sk) => <Row key={sk} label="skill" value={sk} />)}
        </div>
      )}
    </>
  );
}
