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
import { ScatterplotLayer } from "@deck.gl/layers";
import { useFloor } from "@/state/useFloor";
import { applyDarkStyle, DARK_TOKENS } from "@/lib/mapStyle";
import type { Unit, Incident, UnitStatus } from "@/lib/schemas";

const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

const UNIT_COLOR: Record<UnitStatus, [number, number, number]> = {
  available: [63, 217, 127], // emerald
  en_route: [240, 184, 90], // amber
  on_scene: [74, 216, 230], // cyan
  transporting: [160, 122, 255], // violet
  returning: [101, 122, 150], // dim
  out_of_service: [101, 122, 150],
};

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
    overlay.setProps({
      layers: [
        buildIncidentLayer(Array.from(incidents.values()), addressLookup),
        buildUnitLayer(Array.from(units.values())),
      ],
    });
  }, [units, incidents, addressLookup]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({ center: camera.center, zoom: camera.zoom, duration: 600 });
  }, [camera.center, camera.zoom]);

  return <div ref={containerRef} className="absolute inset-0" />;
}
