/**
 * Operator Sim — MapLibre + deck.gl host.
 *
 * Day 2 starter. Boots OpenFreeMap Liberty tiles restyled dark, places a
 * single demo unit dot at the QC center. Implementer A wires real entities
 * in next.
 */

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useFloor } from "@/state/useFloor";

// OpenFreeMap Liberty — free, no key, OSM-derived. Restyle to dark via
// runtime style mutation post-load (Day 2 task — for now use Bright as base
// so something renders, theme pass happens with the deck.gl wiring).
const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

export function Map() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const camera = useFloor((s) => s.camera);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: camera.center,
      zoom: camera.zoom,
      attributionControl: false,
      // Disable interactivity defaults that don't fit a fixed-viewport ops console:
      // we'll add controlled zoom/pan back via cmdk verbs.
      dragRotate: false,
      pitchWithRotate: false,
      touchZoomRotate: true,
    });

    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-right",
    );

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync camera changes from the floor store (e.g. cmdk `focus E1`).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({
      center: camera.center,
      zoom: camera.zoom,
      duration: 600,
    });
  }, [camera.center, camera.zoom]);

  return <div ref={containerRef} className="absolute inset-0" />;
}
