/**
 * Operator Sim — MapLibre dark restyle.
 *
 * Mutates OpenFreeMap Liberty's vector style at runtime to a Foundry-grade
 * dark palette matching our locked tokens (src/index.css).
 *
 * Strategy: walk every style layer and rewrite `paint` properties based on
 * layer id heuristics. Liberty's layer ids follow OpenMapTiles conventions
 * (`background`, `landuse_*`, `water`, `building`, `road_*`, `place_*`).
 *
 * Why this approach: writing a full custom style JSON is N hundred lines
 * we'd have to maintain. Runtime restyle is fragile across style versions
 * but cheap to iterate. Phase 5 swaps to a hand-tuned style.
 */

import type { Map as MapLibreMap, LayerSpecification } from "maplibre-gl";

export const DARK_TOKENS = {
  bg_base: "#080b12",
  bg_panel: "#0d111c",
  bg_water: "#0a1428",
  border_subtle: "#1a2235",
  border_bright: "#2b3a55",
  fg_dim: "#3a4762",
  fg_base: "#6b7a96",
  fg_label: "#8da0c2",
  fg_label_bright: "#c8d3e6",
  road_minor: "#162039",
  road_major: "#22304d",
  road_motor: "#2b3a55",
  building_fill: "#101729",
  building_line: "#1a2235",
  park: "#0c1422",
} as const;

function setPaint(
  map: MapLibreMap,
  id: string,
  paint: Record<string, unknown>,
) {
  for (const [key, value] of Object.entries(paint)) {
    try {
      map.setPaintProperty(id, key, value as never);
    } catch {
      // Layer may not support this paint prop — silent skip.
    }
  }
}

function classifyLayer(id: string, type: LayerSpecification["type"]): string {
  if (type === "background") return "background";
  if (id === "water" || id.includes("water")) return "water";
  if (id.includes("building")) return "building";
  if (id.startsWith("park") || id.includes("park") || id.includes("wood") || id.includes("forest") || id.includes("landcover")) return "park";
  if (id.startsWith("landuse")) return "landuse";
  if (id.startsWith("road") || id.startsWith("highway") || id.startsWith("tunnel") || id.startsWith("bridge")) {
    if (id.includes("motorway") || id.includes("trunk")) return "road_motor";
    if (id.includes("primary") || id.includes("secondary")) return "road_major";
    return "road_minor";
  }
  if (id.startsWith("place") || type === "symbol") return "label";
  if (id.startsWith("boundary") || id.includes("admin")) return "boundary";
  return "other";
}

export function applyDarkStyle(map: MapLibreMap): void {
  const style = map.getStyle();
  if (!style?.layers) return;

  for (const layer of style.layers) {
    const klass = classifyLayer(layer.id, layer.type);
    switch (klass) {
      case "background":
        setPaint(map, layer.id, { "background-color": DARK_TOKENS.bg_base });
        break;
      case "water":
        setPaint(map, layer.id, {
          "fill-color": DARK_TOKENS.bg_water,
          "fill-outline-color": DARK_TOKENS.border_subtle,
        });
        break;
      case "park":
      case "landuse":
        setPaint(map, layer.id, {
          "fill-color": DARK_TOKENS.park,
          "fill-opacity": 0.5,
        });
        break;
      case "building":
        if (layer.type === "fill" || layer.type === "fill-extrusion") {
          setPaint(map, layer.id, {
            "fill-color": DARK_TOKENS.building_fill,
            "fill-opacity": 0.85,
          });
        } else if (layer.type === "line") {
          setPaint(map, layer.id, {
            "line-color": DARK_TOKENS.building_line,
            "line-opacity": 0.6,
          });
        }
        break;
      case "road_motor":
        setPaint(map, layer.id, { "line-color": DARK_TOKENS.road_motor });
        break;
      case "road_major":
        setPaint(map, layer.id, { "line-color": DARK_TOKENS.road_major });
        break;
      case "road_minor":
        setPaint(map, layer.id, { "line-color": DARK_TOKENS.road_minor });
        break;
      case "boundary":
        setPaint(map, layer.id, {
          "line-color": DARK_TOKENS.border_bright,
          "line-opacity": 0.4,
        });
        break;
      case "label":
        setPaint(map, layer.id, {
          "text-color": DARK_TOKENS.fg_label,
          "text-halo-color": DARK_TOKENS.bg_base,
          "text-halo-width": 1,
        });
        break;
    }
  }
}
