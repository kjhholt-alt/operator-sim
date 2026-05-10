/**
 * Operator Sim — MapLibre + deck.gl host.
 *
 * Boots OpenFreeMap Liberty tiles, dark-restyles to Foundry palette, mounts
 * a deck.gl overlay that renders units, incidents, and routes from the floor
 * store. Camera syncs back to the store via cmdk verbs.
 */

import { useEffect, useMemo, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { ScatterplotLayer, PathLayer } from "@deck.gl/layers";
import { useFloor } from "@/state/useFloor";
import { applyDarkStyle, DARK_TOKENS } from "@/lib/mapStyle";
import type { Unit, Incident, UnitStatus, Coord, Station } from "@/lib/schemas";

const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

const UNIT_COLOR: Record<UnitStatus, [number, number, number]> = {
  available: [63, 217, 127], // emerald
  en_route: [240, 184, 90], // amber
  on_scene: [74, 216, 230], // cyan
  transporting: [160, 122, 255], // violet
  returning: [101, 122, 150], // dim
  out_of_service: [101, 122, 150],
};

interface ActiveRoute {
  id: string;
  callsign: string;
  status: UnitStatus;
  path: Coord[];
}

function buildRouteLayer(units: Unit[]) {
  const data: ActiveRoute[] = [];
  for (const u of units) {
    if (!u.current_route || u.current_route.length < 2) continue;
    if (u.status !== "en_route" && u.status !== "returning") continue;
    data.push({
      id: u.id,
      callsign: u.callsign,
      status: u.status,
      path: u.current_route,
    });
  }
  return new PathLayer<ActiveRoute>({
    id: "routes",
    data,
    getPath: (d) => d.path,
    getColor: (d) =>
      d.status === "returning" ? [101, 122, 150, 200] : [240, 184, 90, 230],
    getWidth: 3,
    widthUnits: "pixels",
    widthMinPixels: 2,
    capRounded: true,
    jointRounded: true,
    pickable: false,
  });
}

function buildUnitLayer(units: Unit[]) {
  return new ScatterplotLayer<Unit>({
    id: "units",
    data: units,
    getPosition: (u) => [u.current_position[0], u.current_position[1]],
    getRadius: 90,
    radiusUnits: "meters",
    radiusMinPixels: 5,
    radiusMaxPixels: 14,
    getFillColor: (u) => UNIT_COLOR[u.status],
    stroked: true,
    getLineColor: [255, 255, 255, 220],
    lineWidthMinPixels: 1,
    pickable: true,
    onClick: ({ object }) => {
      if (object) useFloor.getState().select({ kind: "unit", id: object.id });
    },
  });
}

interface PositionedStation {
  id: string;
  name: string;
  agency: Station["agency"];
  coord: [number, number];
}

/**
 * Day 13 — station markers.
 *
 * Each station gets a square cyan marker so the 2-station roster
 * (Central + East) is legible on the map. Click → right-rail dossier.
 */
function buildStationLayer(stations: Station[], addressLookup: Map<string, [number, number]>) {
  const data: PositionedStation[] = [];
  for (const s of stations) {
    const c = addressLookup.get(s.address_id);
    if (c) data.push({ id: s.id, name: s.name, agency: s.agency, coord: c });
  }
  return new ScatterplotLayer<PositionedStation>({
    id: "stations",
    data,
    getPosition: (d) => d.coord,
    // ScatterplotLayer is round; we approximate the "square" Foundry
    // station glyph by drawing two stacked layers (outer + inner).
    getRadius: 14,
    radiusUnits: "pixels",
    radiusMinPixels: 8,
    radiusMaxPixels: 18,
    getFillColor: [74, 216, 230, 50],
    stroked: true,
    getLineColor: [74, 216, 230, 230],
    lineWidthMinPixels: 1.5,
    pickable: true,
    onClick: ({ object }) => {
      if (object) useFloor.getState().select({ kind: "station", id: object.id });
    },
  });
}

interface ResponseLine {
  unit_id: string;
  callsign: string;
  status: UnitStatus;
  path: [Coord, Coord];
}

/**
 * Day 13 — per-incident response lines.
 *
 * For every unit currently working an incident (en_route / on_scene /
 * transporting), draw a direct cyan line from the unit's current
 * position to the incident's address. This reads as "who's responding
 * to what" at a glance — the road-graph route layer shows the *path*
 * the unit is taking; this layer shows the *assignment*.
 */
function buildResponseLineLayer(
  units: Unit[],
  incidents: Map<string, Incident>,
  addressLookup: Map<string, [number, number]>,
) {
  const data: ResponseLine[] = [];
  for (const u of units) {
    if (!u.current_incident_id) continue;
    if (u.status !== "en_route" && u.status !== "on_scene" && u.status !== "transporting") continue;
    const inc = incidents.get(u.current_incident_id);
    if (!inc) continue;
    const incCoord = addressLookup.get(inc.address_id);
    if (!incCoord) continue;
    data.push({
      unit_id: u.id,
      callsign: u.callsign,
      status: u.status,
      path: [u.current_position, incCoord],
    });
  }
  return new PathLayer<ResponseLine>({
    id: "response-lines",
    data,
    getPath: (d) => d.path,
    getColor: (d) =>
      d.status === "on_scene" ? [74, 216, 230, 200] : [74, 216, 230, 140],
    getWidth: 1.4,
    widthUnits: "pixels",
    widthMinPixels: 1,
    capRounded: true,
    pickable: false,
    // Render *underneath* the road-graph route + units so it doesn't
    // visually compete. The dashed feel comes from the Foundry token
    // stroke-on-stroke layering.
  });
}

interface PositionedIncident extends Incident {
  _coord: [number, number];
}

function buildIncidentLayer(
  incidents: Incident[],
  addressLookup: Map<string, [number, number]>,
) {
  const data: PositionedIncident[] = [];
  for (const i of incidents) {
    const c = addressLookup.get(i.address_id);
    if (c) data.push({ ...i, _coord: c });
  }

  return new ScatterplotLayer<PositionedIncident>({
    id: "incidents",
    data,
    getPosition: (d) => d._coord,
    getRadius: 200,
    radiusUnits: "meters",
    radiusMinPixels: 8,
    radiusMaxPixels: 22,
    getFillColor: (d) => {
      if (d.severity === "critical") return [236, 91, 107, 90];
      if (d.severity === "high") return [240, 184, 90, 90];
      return [101, 122, 150, 70];
    },
    stroked: true,
    getLineColor: (d) => {
      if (d.severity === "critical") return [236, 91, 107, 230];
      if (d.severity === "high") return [240, 184, 90, 230];
      return [200, 211, 230, 180];
    },
    lineWidthMinPixels: 1,
    pickable: true,
    onClick: ({ object }) => {
      if (object) useFloor.getState().select({ kind: "incident", id: object.id });
    },
  });
}

export function OperatorMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);

  const camera = useFloor((s) => s.camera);
  const units = useFloor((s) => s.units);
  const incidents = useFloor((s) => s.incidents);
  const addresses = useFloor((s) => s.addresses);
  const stations = useFloor((s) => s.stations);

  const addressLookup = useMemo(() => {
    const m = new Map<string, [number, number]>();
    for (const a of addresses.values()) m.set(a.id, a.coord);
    return m;
  }, [addresses]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: camera.center,
      zoom: camera.zoom,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      touchZoomRotate: true,
    });

    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-right",
    );

    const onStyleLoad = () => {
      applyDarkStyle(map);
      const canvas = map.getCanvas();
      if (canvas) canvas.style.background = DARK_TOKENS.bg_base;
    };
    map.on("style.load", onStyleLoad);

    const overlay = new MapboxOverlay({
      interleaved: false,
      layers: [],
    });
    map.addControl(overlay as unknown as maplibregl.IControl);
    overlayRef.current = overlay;

    mapRef.current = map;

    return () => {
      map.off("style.load", onStyleLoad);
      map.remove();
      mapRef.current = null;
      overlayRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const unitArr = Array.from(units.values());
    const stationArr = Array.from(stations.values());
    overlay.setProps({
      layers: [
        // Bottom → top. Stations sit just above the basemap; response
        // lines render under the road-graph route paths so the path
        // always wins visually; incidents above lines; units on top.
        buildStationLayer(stationArr, addressLookup),
        buildResponseLineLayer(unitArr, incidents, addressLookup),
        buildIncidentLayer(Array.from(incidents.values()), addressLookup),
        buildRouteLayer(unitArr),
        buildUnitLayer(unitArr),
      ],
    });
  }, [units, incidents, stations, addressLookup]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({ center: camera.center, zoom: camera.zoom, duration: 600 });
  }, [camera.center, camera.zoom]);

  return <div ref={containerRef} className="absolute inset-0" />;
}
