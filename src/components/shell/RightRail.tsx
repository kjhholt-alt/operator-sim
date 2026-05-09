/**
 * Operator Sim — right-rail dossier with selection history.
 *
 * Day 4: any linked-entity row is a clickable EntityLink. The breadcrumb
 * header shows back/forward depth and lets you walk the hop chain.
 *
 *   Unit → Station → Address → Incident → Caller → Address → …
 *
 * Selection history is a browser-style stack on the floor store: select()
 * pushes prev, goBack pops, goForward redoes.
 */

import { cn } from "@/lib/cn";
import { useFloor } from "@/state/useFloor";
import type {
  Address,
  Caller,
  EntityKind,
  Incident,
  Intel,
  Personnel,
  Station,
  Unit,
  Vehicle,
} from "@/lib/schemas";

interface Props {
  className?: string;
}

interface RowProps {
  label: string;
  value: string | number;
  tone?: "base" | "bright" | "cyan" | "amber" | "emerald" | "crimson";
}

function toneClass(t: NonNullable<RowProps["tone"]>): string {
  return {
    base: "text-fg-base",
    bright: "text-fg-bright",
    cyan: "text-accent-cyan",
    amber: "text-accent-amber",
    emerald: "text-accent-emerald",
    crimson: "text-accent-crimson",
  }[t];
}

function Row({ label, value, tone = "base" }: RowProps) {
  return (
    <div className="flex items-center justify-between text-[11px] py-0.5">
      <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-fg-dim">
        {label}
      </span>
      <span className={cn("font-mono tabular-nums", toneClass(tone))}>{value}</span>
    </div>
  );
}

interface LinkProps {
  label: string;
  display: string | number;
  kind: EntityKind;
  id: string | undefined;
  tone?: NonNullable<RowProps["tone"]>;
}

function EntityLink({ label, display, kind, id, tone = "cyan" }: LinkProps) {
  const select = useFloor((s) => s.select);
  const exists = useFloor((s) => {
    if (!id) return false;
    return s.getEntity(kind, id) !== null;
  });
  if (!id) {
    return <Row label={label} value="—" tone="base" />;
  }
  return (
    <button
      onClick={() => exists && select({ kind, id })}
      disabled={!exists}
      className={cn(
        "flex items-center justify-between text-[11px] py-0.5 w-full group",
        exists ? "cursor-pointer" : "cursor-not-allowed opacity-60",
      )}
    >
      <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-fg-dim">
        {label}
      </span>
      <span
        className={cn(
          "font-mono tabular-nums flex items-center gap-1",
          toneClass(tone),
          exists && "group-hover:underline group-hover:text-fg-bright",
        )}
      >
        {display}
        {exists && (
          <span className="font-mono text-[8px] text-fg-mute group-hover:text-fg-dim">
            ↗
          </span>
        )}
      </span>
    </button>
  );
}

const KIND_LABEL: Record<EntityKind, string> = {
  unit: "UNIT",
  incident: "INCIDENT",
  caller: "CALLER",
  address: "ADDRESS",
  personnel: "PERSONNEL",
  intel: "INTEL",
  station: "STATION",
  vehicle: "VEHICLE",
};

function BreadcrumbHeader() {
  const goBack = useFloor((s) => s.goBack);
  const goForward = useFloor((s) => s.goForward);
  const back = useFloor((s) => s.nav_back);
  const fwd = useFloor((s) => s.nav_forward);
  const selection = useFloor((s) => s.selection);
  const hasBack = back.length > 0;
  const hasForward = fwd.length > 0;
  return (
    <div className="border-b border-border-subtle px-3 py-2 flex items-center gap-2">
      <div className="flex items-center gap-1">
        <button
          onClick={() => goBack()}
          disabled={!hasBack}
          title={hasBack ? `Back (${back.length})` : "no history"}
          className={cn(
            "font-mono text-[10px] px-1.5 py-0.5 border",
            hasBack
              ? "border-border-subtle text-fg-base hover:border-accent-cyan hover:text-accent-cyan"
              : "border-border-subtle/40 text-fg-mute cursor-not-allowed",
          )}
        >
          ←
        </button>
        <button
          onClick={() => goForward()}
          disabled={!hasForward}
          title={hasForward ? `Forward (${fwd.length})` : "nothing ahead"}
          className={cn(
            "font-mono text-[10px] px-1.5 py-0.5 border",
            hasForward
              ? "border-border-subtle text-fg-base hover:border-accent-cyan hover:text-accent-cyan"
              : "border-border-subtle/40 text-fg-mute cursor-not-allowed",
          )}
        >
          →
        </button>
      </div>
      <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-fg-dim">
        Dossier
      </div>
      {selection && (
        <div className="ml-auto font-mono text-[9px] uppercase tracking-[0.2em] text-accent-cyan">
          {KIND_LABEL[selection.kind]}
          {hasBack && (
            <span className="ml-2 text-fg-mute">
              {back.length}/{back.length + fwd.length + 1}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function RightRail({ className }: Props) {
  const selection = useFloor((s) => s.selection);
  const getEntity = useFloor((s) => s.getEntity);

  const entity = selection ? getEntity(selection.kind, selection.id) : null;

  return (
    <aside className={cn("bg-bg-panel min-h-0 flex flex-col", className)}>
      <BreadcrumbHeader />
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {!entity && (
          <>
            <div className="font-mono text-[10px] text-fg-mute uppercase tracking-[0.18em]">
              — no entity selected —
            </div>
            <div className="text-[11px] text-fg-dim leading-relaxed">
              Click an entity in the ontology rail or on the map. Every linked
              row in a dossier is clickable — hop from a unit to its homebase
              station, to its address, to a nearby incident, to the caller.
            </div>
          </>
        )}

        {entity?.kind === "unit" && <UnitDossier u={entity.data as Unit} />}
        {entity?.kind === "incident" && <IncidentDossier i={entity.data as Incident} />}
        {entity?.kind === "station" && <StationDossier s={entity.data as Station} />}
        {entity?.kind === "personnel" && <PersonnelDossier p={entity.data as Personnel} />}
        {entity?.kind === "address" && <AddressDossier a={entity.data as Address} />}
        {entity?.kind === "caller" && <CallerDossier c={entity.data as Caller} />}
        {entity?.kind === "vehicle" && <VehicleDossier v={entity.data as Vehicle} />}
        {entity?.kind === "intel" && <IntelDossier i={entity.data as Intel} />}
      </div>
    </aside>
  );
}

// ── Unit ───────────────────────────────────────────────────────────────

function UnitDossier({ u }: { u: Unit }) {
  const stations = useFloor((s) => s.stations);
  const station = stations.get(u.homebase_station_id);
  const statusTone: RowProps["tone"] = (() => {
    switch (u.status) {
      case "available": return "emerald";
      case "en_route": return "amber";
      case "on_scene": return "cyan";
      case "transporting": return "base";
      default: return "base";
    }
  })();

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
      <Section title="status">
        <Row label="state" value={u.status.replace(/_/g, " ").toUpperCase()} tone={statusTone} />
        <Row label="since (game-min)" value={u.status_since_game_min.toFixed(1)} />
        <Row label="crew" value={u.crew.length} tone="bright" />
        {u.route_total_m !== undefined && u.route_progress_m !== undefined && (
          <Row
            label="route progress"
            value={`${(u.route_progress_m / 1000).toFixed(2)} / ${(u.route_total_m / 1000).toFixed(2)} km`}
            tone="amber"
          />
        )}
      </Section>
      <Section title="linked">
        <EntityLink
          label="homebase"
          kind="station"
          id={u.homebase_station_id}
          display={station?.name ?? u.homebase_station_id}
        />
        <EntityLink
          label="vehicle"
          kind="vehicle"
          id={u.vehicle_id}
          display={u.vehicle_id}
        />
        {u.current_incident_id && (
          <EntityLink
            label="incident"
            kind="incident"
            id={u.current_incident_id}
            display={u.current_incident_id}
            tone="amber"
          />
        )}
        {u.crew.slice(0, 4).map((pid) => (
          <CrewLink key={pid} pid={pid} />
        ))}
      </Section>
      <Section title="position">
        <Row label="lng" value={u.current_position[0].toFixed(5)} />
        <Row label="lat" value={u.current_position[1].toFixed(5)} />
      </Section>
    </>
  );
}

function CrewLink({ pid }: { pid: string }) {
  const personnel = useFloor((s) => s.personnel);
  const p = personnel.get(pid);
  return (
    <EntityLink
      label="personnel"
      kind="personnel"
      id={pid}
      display={p?.name ?? pid}
    />
  );
}

// ── Incident ───────────────────────────────────────────────────────────

function IncidentDossier({ i }: { i: Incident }) {
  const addresses = useFloor((s) => s.addresses);
  const callers = useFloor((s) => s.callers);
  const intel = useFloor((s) => s.intel);
  const units = useFloor((s) => s.units);
  const vehicles = useFloor((s) => s.vehicles);
  const addr = addresses.get(i.address_id);
  const caller = i.caller_id ? callers.get(i.caller_id) : null;
  const sevTone: RowProps["tone"] =
    i.severity === "critical" ? "crimson" :
    i.severity === "high" ? "amber" : "base";

  // Find any intel that links to this incident.
  const linkedIntel: Intel[] = [];
  for (const x of intel.values()) {
    if (x.linked_entity_ids.includes(i.id)) linkedIntel.push(x);
  }

  // Day 8: per-class requirement check. Empty required = single-unit.
  const required = i.required_unit_classes ?? [];
  const onSceneClasses = new Set<string>();
  for (const uid of i.dispatched_unit_ids) {
    const u = units.get(uid);
    if (!u || u.status !== "on_scene" || u.current_incident_id !== i.id) continue;
    const v = vehicles.get(u.vehicle_id);
    if (v) onSceneClasses.add(v.class);
  }

  return (
    <>
      <div>
        <div className="font-mono text-[15px] text-fg-bright tabular-nums">{i.id}</div>
        <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-fg-dim mt-0.5">
          incident · {i.type.replace(/_/g, " ")}
        </div>
      </div>
      <Section title="state">
        <Row label="severity" value={i.severity.toUpperCase()} tone={sevTone} />
        <Row label="status" value={i.status.toUpperCase()} tone="cyan" />
        <Row label="reported" value={`${i.reported_at_game_min.toFixed(1)} min`} />
        <Row label="window" value={`${i.resolution_window_game_min.toFixed(1)} min`} />
        {i.dwell_started_at_game_min !== undefined && i.status !== "resolved" && (
          <Row
            label="dwell since"
            value={`${i.dwell_started_at_game_min.toFixed(1)} min`}
            tone="cyan"
          />
        )}
        {i.resolved_at_game_min !== undefined && (
          <Row
            label="resolved"
            value={`${i.resolved_at_game_min.toFixed(1)} min`}
            tone="emerald"
          />
        )}
      </Section>
      {required.length > 0 && (
        <Section title="required units">
          {required.map((c) => {
            const met = onSceneClasses.has(c);
            return (
              <Row
                key={c}
                label={c.replace(/_/g, " ")}
                value={met ? "✓ on scene" : "— pending"}
                tone={met ? "emerald" : "amber"}
              />
            );
          })}
        </Section>
      )}
      <Section title="linked">
        <EntityLink
          label="address"
          kind="address"
          id={i.address_id}
          display={addr?.street ?? i.address_id}
        />
        {i.caller_id && (
          <EntityLink
            label="caller"
            kind="caller"
            id={i.caller_id}
            display={caller?.display ?? i.caller_id}
          />
        )}
        {linkedIntel.map((x) => (
          <EntityLink
            key={x.id}
            label="intel"
            kind="intel"
            id={x.id}
            display={x.type}
            tone={x.severity === "critical" ? "crimson" : "amber"}
          />
        ))}
      </Section>
      <Section title="dispatched">
        {i.dispatched_unit_ids.length === 0 ? (
          <div className="font-mono text-[10px] text-fg-mute">— none —</div>
        ) : (
          i.dispatched_unit_ids.map((uid) => (
            <DispatchedUnitLink key={uid} uid={uid} />
          ))
        )}
      </Section>
    </>
  );
}

function DispatchedUnitLink({ uid }: { uid: string }) {
  const units = useFloor((s) => s.units);
  const u = units.get(uid);
  return (
    <EntityLink
      label="unit"
      kind="unit"
      id={uid}
      display={u?.callsign ?? uid}
      tone="cyan"
    />
  );
}

// ── Station ─────────────────────────────────────────────────────────────

function StationDossier({ s }: { s: Station }) {
  const addresses = useFloor((st) => st.addresses);
  const units = useFloor((st) => st.units);
  const personnel = useFloor((st) => st.personnel);
  const addr = addresses.get(s.address_id);

  const homedUnits: Unit[] = [];
  for (const u of units.values()) if (u.homebase_station_id === s.id) homedUnits.push(u);
  const homedCrew: Personnel[] = [];
  for (const p of personnel.values()) if (p.homebase_station_id === s.id) homedCrew.push(p);

  return (
    <>
      <div>
        <div className="font-mono text-[15px] text-fg-bright">{s.name}</div>
        <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-fg-dim mt-0.5">
          station · {s.agency}
        </div>
      </div>
      <Section title="profile">
        <EntityLink
          label="address"
          kind="address"
          id={s.address_id}
          display={addr?.street ?? s.address_id}
        />
        <Row label="capacity (units)" value={s.capacity_units} />
        <Row label="capacity (crew)" value={s.capacity_personnel} />
      </Section>
      <Section title="units (homed)">
        {homedUnits.length === 0 ? (
          <div className="font-mono text-[10px] text-fg-mute">— none —</div>
        ) : (
          homedUnits.map((u) => (
            <EntityLink
              key={u.id}
              label="unit"
              kind="unit"
              id={u.id}
              display={u.callsign}
            />
          ))
        )}
      </Section>
      <Section title="personnel (homed)">
        {homedCrew.length === 0 ? (
          <div className="font-mono text-[10px] text-fg-mute">— none —</div>
        ) : (
          homedCrew.slice(0, 6).map((p) => (
            <EntityLink
              key={p.id}
              label="personnel"
              kind="personnel"
              id={p.id}
              display={p.name}
            />
          ))
        )}
      </Section>
    </>
  );
}

// ── Personnel ───────────────────────────────────────────────────────────

function PersonnelDossier({ p }: { p: Personnel }) {
  const stations = useFloor((s) => s.stations);
  const station = stations.get(p.homebase_station_id);
  return (
    <>
      <div>
        <div className="font-mono text-[15px] text-fg-bright">{p.name}</div>
        <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-fg-dim mt-0.5">
          personnel · {p.role}
        </div>
      </div>
      <Section title="profile">
        <EntityLink
          label="homebase"
          kind="station"
          id={p.homebase_station_id}
          display={station?.name ?? p.homebase_station_id}
        />
        <Row label="hire date" value={p.hire_date.slice(0, 10)} />
        <Row label="active" value={p.active ? "yes" : "no"} tone={p.active ? "emerald" : "base"} />
      </Section>
      {p.skills.length > 0 && (
        <Section title="skills">
          {p.skills.map((sk) => <Row key={sk} label="skill" value={sk} />)}
        </Section>
      )}
    </>
  );
}

// ── Address ─────────────────────────────────────────────────────────────

function AddressDossier({ a }: { a: Address }) {
  const incidents = useFloor((s) => s.incidents);
  const stations = useFloor((s) => s.stations);
  const callers = useFloor((s) => s.callers);

  const incidentsHere: Incident[] = [];
  for (const i of incidents.values()) if (i.address_id === a.id) incidentsHere.push(i);
  const stationsHere: Station[] = [];
  for (const s of stations.values()) if (s.address_id === a.id) stationsHere.push(s);
  const callersHere: Caller[] = [];
  for (const c of callers.values()) if (c.address_id === a.id) callersHere.push(c);

  return (
    <>
      <div>
        <div className="font-mono text-[15px] text-fg-bright">{a.street}</div>
        <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-fg-dim mt-0.5">
          address · {a.city}, {a.state}{a.postal ? ` ${a.postal}` : ""}
        </div>
      </div>
      <Section title="position">
        <Row label="lng" value={a.coord[0].toFixed(5)} />
        <Row label="lat" value={a.coord[1].toFixed(5)} />
      </Section>
      {incidentsHere.length > 0 && (
        <Section title="incidents at this address">
          {incidentsHere.map((i) => (
            <EntityLink
              key={i.id}
              label="incident"
              kind="incident"
              id={i.id}
              display={`${i.id} · ${i.type.replace(/_/g, " ")}`}
              tone={i.severity === "critical" ? "crimson" : "amber"}
            />
          ))}
        </Section>
      )}
      {stationsHere.length > 0 && (
        <Section title="stations">
          {stationsHere.map((s) => (
            <EntityLink
              key={s.id}
              label="station"
              kind="station"
              id={s.id}
              display={s.name}
            />
          ))}
        </Section>
      )}
      {callersHere.length > 0 && (
        <Section title="callers">
          {callersHere.map((c) => (
            <EntityLink
              key={c.id}
              label="caller"
              kind="caller"
              id={c.id}
              display={c.display}
            />
          ))}
        </Section>
      )}
    </>
  );
}

// ── Caller ──────────────────────────────────────────────────────────────

function CallerDossier({ c }: { c: Caller }) {
  const addresses = useFloor((s) => s.addresses);
  const incidents = useFloor((s) => s.incidents);
  const homeAddr = c.address_id ? addresses.get(c.address_id) : null;
  // Find live incidents this caller reported (caller_id match).
  const calls: Incident[] = [];
  for (const i of incidents.values()) if (i.caller_id === c.id) calls.push(i);

  return (
    <>
      <div>
        <div className="font-mono text-[15px] text-fg-bright">{c.display}</div>
        <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-fg-dim mt-0.5">
          caller · {c.id}
        </div>
      </div>
      <Section title="profile">
        {c.phone && <Row label="phone" value={c.phone} tone="cyan" />}
        <EntityLink
          label="address"
          kind="address"
          id={c.address_id}
          display={homeAddr?.street ?? c.address_id ?? "—"}
        />
        <Row label="prior incidents" value={c.prior_incidents.length} tone="bright" />
      </Section>
      {c.notes && (
        <Section title="notes">
          <div className="text-[11px] text-fg-base leading-relaxed">{c.notes}</div>
        </Section>
      )}
      {calls.length > 0 && (
        <Section title="active calls">
          {calls.map((i) => (
            <EntityLink
              key={i.id}
              label="incident"
              kind="incident"
              id={i.id}
              display={`${i.id} · ${i.type.replace(/_/g, " ")}`}
              tone={i.severity === "critical" ? "crimson" : "amber"}
            />
          ))}
        </Section>
      )}
      {c.prior_incidents.length > 0 && (
        <Section title="prior calls">
          {c.prior_incidents.slice(0, 6).map((iid) => (
            <EntityLink
              key={iid}
              label="incident"
              kind="incident"
              id={iid}
              display={iid}
            />
          ))}
        </Section>
      )}
    </>
  );
}

// ── Vehicle ─────────────────────────────────────────────────────────────

function VehicleDossier({ v }: { v: Vehicle }) {
  const stations = useFloor((s) => s.stations);
  const units = useFloor((s) => s.units);
  const station = stations.get(v.homebase_station_id);
  const linkedUnits: Unit[] = [];
  for (const u of units.values()) if (u.vehicle_id === v.id) linkedUnits.push(u);

  return (
    <>
      <div>
        <div className="font-mono text-[15px] text-fg-bright">{v.callsign}</div>
        <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-fg-dim mt-0.5">
          vehicle · {v.class}
        </div>
      </div>
      <Section title="profile">
        <EntityLink
          label="homebase"
          kind="station"
          id={v.homebase_station_id}
          display={station?.name ?? v.homebase_station_id}
        />
        <Row label="status" value={v.status.replace(/_/g, " ").toUpperCase()} tone="cyan" />
        <Row label="mileage (km)" value={v.mileage_km.toFixed(0)} />
        <Row label="purchased" value={v.purchased_at.slice(0, 10)} />
      </Section>
      {linkedUnits.length > 0 && (
        <Section title="assigned units">
          {linkedUnits.map((u) => (
            <EntityLink
              key={u.id}
              label="unit"
              kind="unit"
              id={u.id}
              display={u.callsign}
            />
          ))}
        </Section>
      )}
    </>
  );
}

// ── Intel ───────────────────────────────────────────────────────────────

function IntelDossier({ i }: { i: Intel }) {
  const sevTone: RowProps["tone"] =
    i.severity === "critical" ? "crimson" :
    i.severity === "high" ? "amber" : "base";
  return (
    <>
      <div>
        <div className="font-mono text-[15px] text-fg-bright">{i.type.replace(/_/g, " ")}</div>
        <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-fg-dim mt-0.5">
          intel · {i.id}
        </div>
      </div>
      <Section title="state">
        <Row label="severity" value={i.severity.toUpperCase()} tone={sevTone} />
        <Row label="posted" value={`${i.posted_at_game_min.toFixed(1)} min`} />
        {i.expires_at_game_min !== undefined && (
          <Row label="expires" value={`${i.expires_at_game_min.toFixed(1)} min`} />
        )}
      </Section>
      <Section title="body">
        <div className="text-[11px] text-fg-base leading-relaxed">{i.body}</div>
      </Section>
      {i.linked_entity_ids.length > 0 && (
        <Section title="linked">
          {i.linked_entity_ids.map((eid) => (
            <IntelLinkRow key={eid} eid={eid} />
          ))}
        </Section>
      )}
    </>
  );
}

function IntelLinkRow({ eid }: { eid: string }) {
  // Probe each entity map for the id; first hit wins.
  const ent = useFloor((s) => {
    if (s.units.has(eid)) return { kind: "unit" as const, label: s.units.get(eid)!.callsign };
    if (s.incidents.has(eid)) return { kind: "incident" as const, label: eid };
    if (s.stations.has(eid)) return { kind: "station" as const, label: s.stations.get(eid)!.name };
    if (s.addresses.has(eid)) return { kind: "address" as const, label: s.addresses.get(eid)!.street };
    if (s.personnel.has(eid)) return { kind: "personnel" as const, label: s.personnel.get(eid)!.name };
    if (s.callers.has(eid)) return { kind: "caller" as const, label: s.callers.get(eid)!.display };
    if (s.vehicles.has(eid)) return { kind: "vehicle" as const, label: s.vehicles.get(eid)!.callsign };
    return null;
  });
  if (!ent) return <Row label="link" value={eid} tone="base" />;
  return <EntityLink label={ent.kind} kind={ent.kind} id={eid} display={ent.label} />;
}

// ── Section wrapper ─────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-border-subtle pt-3 space-y-1">
      <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-fg-dim mb-1">
        {title}
      </div>
      {children}
    </div>
  );
}
