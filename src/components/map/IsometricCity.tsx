/**
 * Operator Sim — 2.5D isometric city view.
 *
 * Day 13: ported from claude.ai/design "Operator Sim Watchfloor"
 * (handoff bundle v2). The center map can now flip between MapLibre's
 * real OSM tiles ("map" mode, the default Day 0–11 work) and this
 * stylized procedural city ("city" mode) via a TopStrip toggle.
 *
 * Pipeline (back → front):
 *
 *   1. Sky gradient (4-stop palette: midnight / sunrise / noon / sunset)
 *   2. Stars (only at night, twinkle on a sin clock)
 *   3. Sun and moon arcing across the sky
 *   4. Distant skyline parallax (3 silhouette layers)
 *   5. Horizon haze
 *   6. Ground plane (26×26 grid, raised cells per kind)
 *   7. Block tiles, parks (with trees + shadows), plaza
 *   8. Roads + lane stripes + street-light halos at night
 *   9. River with ripples + sun glints, bridges
 *  10. Buildings (back-to-front, depth-sorted) with rooftop kit
 *  11. Traffic dots gliding along arterials
 *  12. Live floor entities — stations, incidents, units — projected
 *      from world coords onto the iso grid via address bbox
 *  13. Helicopter circling overhead
 *  14. Compass corner glyph
 *
 * The sky/ground/buildings are 100% procedural (no real geography);
 * the live overlay reads from `useFloor` so the operator sees their
 * real units + dispatched incidents on the stylized canvas.
 */

import { useEffect, useMemo, useState } from "react";
import { useFloor } from "@/state/useFloor";
import type { Coord, Incident, Station, Unit } from "@/lib/schemas";

// ─── isometric projection helpers ────────────────────────────────────

const T = 22; // half-width of a tile in iso x
const F = 11; // half-depth in iso y (≈ T * 0.5)
const STORY = 13; // px lift per story

function iso(x: number, y: number, z = 0): [number, number] {
  return [(x - y) * T, (x + y) * F - z * STORY];
}

function poly(pts: [number, number][]): string {
  return pts.map((p) => `${p[0]},${p[1]}`).join(" ");
}

// ─── seeded RNG factory ───────────────────────────────────────────────

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
}

// ─── city generation ─────────────────────────────────────────────────

const N = 26;
const ARTERIAL = 4;

type CellKind = "block" | "road" | "river" | "bridge" | "park" | "plaza";
type BuildingType = "tower" | "glass" | "setback" | "slab" | "midrise" | "lowrise";

interface Building {
  x: number;
  y: number;
  w: number;
  d: number;
  h: number;
  type: BuildingType;
  mat: number;
  litSeed: number;
  decoSeed: number;
}

interface City {
  cells: CellKind[];
  buildings: Building[];
  roadCells: [number, number][];
  bridgeCells: [number, number][];
  riverCells: [number, number][];
}

function buildingType(seed: number, h: number): BuildingType {
  if (h >= 7) return seed < 0.5 ? "tower" : "glass";
  if (h >= 5) return seed < 0.5 ? "setback" : "slab";
  if (h >= 3) return "midrise";
  return "lowrise";
}

function buildCity(): City {
  const rnd = rng(9011);
  const cells: CellKind[] = new Array(N * N).fill("block");
  const idx = (x: number, y: number) => y * N + x;

  // arterial grid
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (x % ARTERIAL === 0 || y % ARTERIAL === 0) cells[idx(x, y)] = "road";
    }
  }

  // sinuous river NE→SW
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const u = (x + y) - N + Math.sin(x * 0.55) * 1.4 + Math.sin(y * 0.4) * 1.2;
      if (Math.abs(u + 2) < 1.6) cells[idx(x, y)] = "river";
    }
  }

  // bridges where arterials cross the river
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (cells[idx(x, y)] === "river" && (x === 8 || y === 16 || x === 20)) {
        cells[idx(x, y)] = "bridge";
      }
    }
  }

  // parks
  ([[5, 9], [18, 6], [12, 18]] as [number, number][]).forEach(([px, py]) => {
    for (let dy = 0; dy < 3; dy++) {
      for (let dx = 0; dx < 3; dx++) {
        const i = idx(px + dx, py + dy);
        if (i >= 0 && i < cells.length && cells[i] === "block") cells[i] = "park";
      }
    }
  });

  // plaza in front of central station tile
  for (let dx = 0; dx < 2; dx++) {
    const i = idx(9 + dx, 13);
    if (i >= 0 && i < cells.length && cells[i] === "block") cells[i] = "plaza";
  }

  // buildings — drop 1-3 footprints per 3×3 block
  const buildings: Building[] = [];
  for (let by = 1; by < N; by += ARTERIAL) {
    for (let bx = 1; bx < N; bx += ARTERIAL) {
      let ok = true;
      for (let dy = 0; dy < 3 && ok; dy++) {
        for (let dx = 0; dx < 3 && ok; dx++) {
          const i = idx(bx + dx, by + dy);
          if (i < 0 || i >= cells.length || cells[i] !== "block") ok = false;
        }
      }
      if (!ok) continue;

      const used: boolean[] = new Array(9).fill(false);
      const drops = 1 + Math.floor(rnd() * 3);
      for (let k = 0; k < drops; k++) {
        const w = 1 + Math.floor(rnd() * 2);
        const d = 1 + Math.floor(rnd() * 2);
        const ox = Math.floor(rnd() * (4 - w));
        const oy = Math.floor(rnd() * (4 - d));
        if (ox + w > 3 || oy + d > 3) continue;

        let clash = false;
        for (let dy = 0; dy < d && !clash; dy++) {
          for (let dx = 0; dx < w && !clash; dx++) {
            if (used[(oy + dy) * 3 + (ox + dx)]) clash = true;
          }
        }
        if (clash) continue;
        for (let dy = 0; dy < d; dy++) {
          for (let dx = 0; dx < w; dx++) used[(oy + dy) * 3 + (ox + dx)] = true;
        }

        const cx = bx + ox + w / 2;
        const cy = by + oy + d / 2;
        const distCore = Math.hypot(cx - N * 0.42, cy - N * 0.5);
        const baseH = Math.max(1, 9 - distCore * 0.45);
        const h = Math.max(1, Math.round(baseH + (rnd() - 0.5) * 4));

        const kindSeed = rnd();
        const type = buildingType(kindSeed, h);
        const litSeed = rnd();
        const decoSeed = rnd();
        const mat = Math.floor(rnd() * 3);

        buildings.push({ x: bx + ox, y: by + oy, w, d, h, type, mat, litSeed, decoSeed });
      }
    }
  }

  const roadCells: [number, number][] = [];
  const bridgeCells: [number, number][] = [];
  const riverCells: [number, number][] = [];
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const k = cells[idx(x, y)];
      if (k === "road") roadCells.push([x, y]);
      else if (k === "bridge") bridgeCells.push([x, y]);
      else if (k === "river") riverCells.push([x, y]);
    }
  }

  return { cells, buildings, roadCells, bridgeCells, riverCells };
}

// ─── time-of-day palette ─────────────────────────────────────────────

interface Palette {
  sunY: number;
  day: number;
  dusk: number;
  skyTop: string;
  skyMid: string;
  skyHorizon: string;
  ground: string;
  block: string;
  road: string;
  roadEdge: string;
  laneDash: string;
  river0: string;
  river1: string;
  river2: string;
  park: string;
  parkEdge: string;
  plaza: string;
  bldgTopA: string;
  bldgTopB: string;
  bldgTopC: string;
  bldgRight: string;
  bldgFront: string;
  bldgEdge: string;
  windowLit: string;
  windowGlass: string;
  windowFrame: string;
  shadowAlpha: number;
  textMute: string;
  haze: string;
}

function clamp(v: number, a = 0, b = 1): number {
  return Math.max(a, Math.min(b, v));
}
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
function lerpHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ar = (pa >> 16) & 255;
  const ag = (pa >> 8) & 255;
  const ab = pa & 255;
  const br = (pb >> 16) & 255;
  const bg = (pb >> 8) & 255;
  const bb = pb & 255;
  const r = Math.round(lerp(ar, br, t));
  const g = Math.round(lerp(ag, bg, t));
  const b2 = Math.round(lerp(ab, bb, t));
  return "#" + [r, g, b2].map((v) => v.toString(16).padStart(2, "0")).join("");
}
function fourStop(tod: number, kf: [string, string, string, string]): string {
  const x = (tod * 4) % 4;
  const i = Math.floor(x);
  const f = x - i;
  const a = kf[i % 4];
  const b = kf[(i + 1) % 4];
  return lerpHex(a, b, f);
}

function getPalette(tod: number): Palette {
  const sunY = Math.sin((tod - 0.25) * Math.PI * 2);
  const day = clamp((sunY + 0.15) * 2.2);
  const dusk = clamp(1 - Math.abs(sunY) * 3);
  return {
    sunY, day, dusk,
    skyTop:     fourStop(tod, ["#06091a", "#3a2858", "#5993c8", "#2c2046"]),
    skyMid:     fourStop(tod, ["#0a1228", "#bd6650", "#9bc7e1", "#c2563d"]),
    skyHorizon: fourStop(tod, ["#0e1830", "#f5b377", "#d4e6f0", "#f5a063"]),
    ground:     fourStop(tod, ["#070b14", "#2a2235", "#1e2837", "#2e2030"]),
    block:      fourStop(tod, ["#0c111c", "#3d3043", "#3a4453", "#43303f"]),
    road:       fourStop(tod, ["#070a11", "#241b28", "#272f3c", "#2a1d27"]),
    roadEdge:   fourStop(tod, ["#11192a", "#382b3e", "#404a5b", "#3d2c39"]),
    laneDash:   fourStop(tod, ["#1f2a44", "#5a4258", "#7a8090", "#604351"]),
    river0:     fourStop(tod, ["#06121e", "#2d2542", "#3b6a8a", "#4a3344"]),
    river1:     fourStop(tod, ["#0c2238", "#583e5c", "#5d96b8", "#7d4a52"]),
    river2:     fourStop(tod, ["#13355a", "#a06870", "#a8d2e2", "#c87f5d"]),
    park:       fourStop(tod, ["#0c1f17", "#2c3825", "#2e5a3a", "#3a402a"]),
    parkEdge:   fourStop(tod, ["#1a4a32", "#506840", "#5d8a55", "#6b6b3e"]),
    plaza:      fourStop(tod, ["#11161f", "#3d3140", "#3e4a5b", "#42313d"]),
    bldgTopA:   fourStop(tod, ["#1c2942", "#5c4e64", "#8aa3b8", "#7c5868"]),
    bldgTopB:   fourStop(tod, ["#222d40", "#624c5a", "#8095ad", "#83505d"]),
    bldgTopC:   fourStop(tod, ["#26344e", "#6f5566", "#92aac1", "#8b5a6d"]),
    bldgRight:  fourStop(tod, ["#0e1828", "#3a2c3e", "#5a6c80", "#4f3a44"]),
    bldgFront:  fourStop(tod, ["#0a121f", "#2c2230", "#3f4d5e", "#3a2c34"]),
    bldgEdge:   fourStop(tod, ["#28385a", "#7a6076", "#a8bccc", "#9c6c7a"]),
    windowLit:    "#f0c068",
    windowGlass:  fourStop(tod, ["#1d2842", "#3a2e44", "#7090b0", "#5a4048"]),
    windowFrame:  fourStop(tod, ["#11192a", "#2d2536", "#3a4858", "#36262e"]),
    shadowAlpha:  0.18 + clamp(day) * 0.28,
    textMute:     fourStop(tod, ["#6b7a96", "#a08496", "#9ba8b8", "#a08296"]),
    haze:         fourStop(tod, ["#0a1326", "#3a2840", "#bdd5e2", "#3d2530"]),
  };
}

// ─── building face primitives ────────────────────────────────────────

function buildingFaces(b: Building) {
  const { x, y, w, d, h } = b;
  const top: [number, number][] = [iso(x, y, h), iso(x + w, y, h), iso(x + w, y + d, h), iso(x, y + d, h)];
  const right: [number, number][] = [iso(x + w, y, h), iso(x + w, y + d, h), iso(x + w, y + d, 0), iso(x + w, y, 0)];
  const front: [number, number][] = [iso(x, y + d, h), iso(x + w, y + d, h), iso(x + w, y + d, 0), iso(x, y + d, 0)];
  return { top, right, front };
}

interface WindowDot {
  p00: [number, number];
  p11: [number, number];
  lit: boolean;
  sparkle: number;
}

function windowDots(face: [number, number][], h: number, type: BuildingType, seed: number): WindowDot[] {
  const out: WindowDot[] = [];
  const [tA, tB, bB, bA] = face;
  const rows = type === "glass" || type === "tower" ? Math.max(2, h * 2) : h;
  const cols = type === "tower" ? 4 : 3;
  let s = (Math.floor(seed * 9173) >>> 0) || 1;
  const r = () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967295);
  const corner = (u: number, v: number): [number, number] => [
    (1 - u) * (1 - v) * tA[0] + u * (1 - v) * tB[0] + u * v * bB[0] + (1 - u) * v * bA[0],
    (1 - u) * (1 - v) * tA[1] + u * (1 - v) * tB[1] + u * v * bB[1] + (1 - u) * v * bA[1],
  ];
  const pad = type === "glass" ? 0.04 : 0.18;
  for (let row = 0; row < rows; row++) {
    const v0 = (row + pad) / rows;
    const v1 = (row + 1 - pad) / rows;
    for (let c = 0; c < cols; c++) {
      const u0 = (c + pad) / cols;
      const u1 = (c + 1 - pad) / cols;
      const p00 = corner(u0, v0);
      const p11 = corner(u1, v1);
      out.push({ p00, p11, lit: r() < 0.55, sparkle: r() });
    }
  }
  return out;
}

// ─── distant skyline silhouettes ─────────────────────────────────────

function makeSkyline(count: number, baseY: number, ampMin: number, ampMax: number): string {
  const r = rng(count * 17 + Math.floor(baseY));
  let path = `M -800 ${baseY + 60} L -800 ${baseY}`;
  for (let i = 0; i < count; i++) {
    const x = -800 + (1600 / count) * i;
    const w = 1600 / count;
    const h = ampMin + r() * (ampMax - ampMin);
    path += ` L ${x} ${baseY - h} L ${x + w} ${baseY - h}`;
  }
  path += ` L 800 ${baseY} L 800 ${baseY + 60} Z`;
  return path;
}

// ─── label helpers ───────────────────────────────────────────────────

function todLabel(tod: number): string {
  if (tod < 0.18) return "NIGHT";
  if (tod < 0.30) return "DAWN";
  if (tod < 0.45) return "MORNING";
  if (tod < 0.55) return "MIDDAY";
  if (tod < 0.72) return "AFTERNOON";
  if (tod < 0.85) return "DUSK";
  return "NIGHT";
}

// ─── main isometric city ─────────────────────────────────────────────

interface Props {
  /** Optional time-of-day override 0..1 (0 = midnight, 0.5 = noon). */
  todOverride?: number | null;
  /** Real-seconds for one full day cycle. Defaults to 90s. */
  dayCycleSec?: number;
}

const ACCENT_CYAN = "#4ad8e6";
const ACCENT_AMBER = "#f0b85a";
const ACCENT_EMERALD = "#3fd97f";
const ACCENT_CRIMSON = "#ec5b6b";

export function IsometricCity({ todOverride, dayCycleSec = 90 }: Props) {
  const city = useMemo(() => buildCity(), []);
  const select = useFloor((s) => s.select);
  const stations = useFloor((s) => s.stations);
  const incidents = useFloor((s) => s.incidents);
  const units = useFloor((s) => s.units);
  const addresses = useFloor((s) => s.addresses);
  const todState = useFloor((s) => s.city_tod_override);
  const effectiveTodOverride = todOverride ?? todState;

  // animation clock (real seconds since mount)
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const loop = (t: number) => {
      setTick((t - t0) / 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // time-of-day: auto-cycle unless overridden. Default 90s = 1 day.
  const todAuto = (((tick / dayCycleSec) + 0.30) % 1 + 1) % 1;
  const tod = typeof effectiveTodOverride === "number" && effectiveTodOverride >= 0
    ? effectiveTodOverride
    : todAuto;
  const pal = useMemo(() => getPalette(tod), [tod]);

  // sort buildings back-to-front for painter's algorithm
  const orderedBuildings = useMemo(
    () => [...city.buildings].sort((a, b) => (a.x + a.y) - (b.x + b.y) || a.h - b.h),
    [city],
  );

  // viewBox bounds — pad generously so sky/skyline have room
  const corners = [iso(0, 0), iso(N, 0), iso(N, N), iso(0, N)];
  const minX = Math.min(...corners.map((p) => p[0])) - 380;
  const maxX = Math.max(...corners.map((p) => p[0])) + 380;
  const minY = Math.min(...corners.map((p) => p[1])) - 360;
  const maxY = Math.max(...corners.map((p) => p[1])) + 60;
  const VW = maxX - minX;
  const VH = maxY - minY;

  // sun/moon arc
  const sunAngle = (tod - 0.25) * Math.PI * 2;
  const skyCx = (minX + maxX) / 2;
  const skyArcR = VH * 0.55;
  const sunCx = skyCx + Math.cos(sunAngle) * VW * 0.42;
  const sunCy = (minY + 60) + skyArcR - Math.sin(sunAngle) * skyArcR;
  const sunVisible = pal.sunY > -0.05;
  const moonVisible = pal.sunY < 0.05;

  // stars (only at night) — fixed positions
  const stars = useMemo(() => {
    const r = rng(7);
    const out: { x: number; y: number; r: number; tw: number }[] = [];
    for (let i = 0; i < 70; i++) {
      out.push({
        x: -700 + r() * 1400,
        y: minY + 10 + r() * (skyArcR * 1.4),
        r: 0.4 + r() * 0.9,
        tw: r() * 6,
      });
    }
    return out;
  }, [minY, skyArcR]);
  const starOpacity = clamp((1 - pal.day) * 1.2);

  // distant skylines (3 layers)
  const skylineY = (minY + maxY) / 2 + 60;
  const skyline1 = useMemo(() => makeSkyline(24, skylineY - 20, 40, 130), [skylineY]);
  const skyline2 = useMemo(() => makeSkyline(18, skylineY + 5, 25, 80), [skylineY]);
  const skyline3 = useMemo(() => makeSkyline(14, skylineY + 25, 12, 45), [skylineY]);

  // arterial traffic streams
  const traffic = useMemo(
    () => [
      { a: [0.5, 4.5], b: [N - 0.5, 4.5], speed: 0.07, n: 5 },
      { a: [0.5, 12.5], b: [N - 0.5, 12.5], speed: -0.05, n: 6 },
      { a: [4.5, 0.5], b: [4.5, N - 0.5], speed: 0.06, n: 4 },
      { a: [16.5, 0.5], b: [16.5, N - 0.5], speed: -0.04, n: 5 },
    ] as const,
    [],
  );

  const beaconPulse = (Math.sin(tick * 2.6) + 1) / 2;
  const windowLitProb = clamp(1 - pal.day * 1.2);

  // ── live entity projection ─────────────────────────────────────────
  // Build a bbox from all known addresses + station coords, then map any
  // (lng, lat) into the iso grid. Falls back to a Quad-Cities-shaped box
  // if no data is loaded yet (boot, lobby).
  const bbox = useMemo(() => {
    let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
    const acc = (c: Coord) => {
      if (c[0] < minLng) minLng = c[0];
      if (c[0] > maxLng) maxLng = c[0];
      if (c[1] < minLat) minLat = c[1];
      if (c[1] > maxLat) maxLat = c[1];
    };
    for (const a of addresses.values()) acc(a.coord);
    for (const s of stations.values()) {
      const a = addresses.get(s.address_id);
      if (a) acc(a.coord);
    }
    for (const u of units.values()) acc(u.current_position);
    if (!isFinite(minLng) || maxLng === minLng || maxLat === minLat) {
      // fallback to a Quad Cities-shaped bbox
      return { minLng: -90.62, maxLng: -90.52, minLat: 41.50, maxLat: 41.55 };
    }
    return { minLng, maxLng, minLat, maxLat };
  }, [addresses, stations, units]);

  function projectCoord(c: Coord): [number, number] {
    // Inset by 1 cell on each side so projected entities don't ride the
    // ground plane edge. Lat increases northward, but iso y also grows
    // toward the back of the canvas, so we flip lat → 1−frac for a
    // top-of-screen-is-north feel.
    const u = (c[0] - bbox.minLng) / Math.max(1e-6, bbox.maxLng - bbox.minLng);
    const v = (c[1] - bbox.minLat) / Math.max(1e-6, bbox.maxLat - bbox.minLat);
    const gx = 1 + u * (N - 2);
    const gy = 1 + (1 - v) * (N - 2);
    return [gx, gy];
  }

  // Project the live entities once per frame.
  const liveStations = useMemo(() => {
    const out: { s: Station; gx: number; gy: number }[] = [];
    for (const s of stations.values()) {
      const a = addresses.get(s.address_id);
      if (!a) continue;
      const [gx, gy] = projectCoord(a.coord);
      out.push({ s, gx, gy });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stations, addresses, bbox]);

  const liveIncidents = useMemo(() => {
    const out: { i: Incident; gx: number; gy: number }[] = [];
    for (const i of incidents.values()) {
      if (i.status === "resolved" || i.status === "cancelled") continue;
      const a = addresses.get(i.address_id);
      if (!a) continue;
      const [gx, gy] = projectCoord(a.coord);
      out.push({ i, gx, gy });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incidents, addresses, bbox]);

  const liveUnits = useMemo(() => {
    const out: { u: Unit; gx: number; gy: number }[] = [];
    for (const u of units.values()) {
      const [gx, gy] = projectCoord(u.current_position);
      out.push({ u, gx, gy });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [units, bbox]);

  // ── render ─────────────────────────────────────────────────────────
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: pal.skyHorizon }}>
      <svg
        viewBox={`${minX} ${minY} ${VW} ${VH}`}
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full"
      >
        <defs>
          <linearGradient id="iso-sky" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"  stopColor={pal.skyTop} />
            <stop offset="55%" stopColor={pal.skyMid} />
            <stop offset="100%" stopColor={pal.skyHorizon} />
          </linearGradient>
          <radialGradient id="iso-sunGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff7d4" stopOpacity="0.95" />
            <stop offset="40%" stopColor="#ffc870" stopOpacity={0.55 + pal.dusk * 0.3} />
            <stop offset="100%" stopColor="#ff7a3a" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="iso-moonGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#e6ecff" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#a4b4d0" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#a4b4d0" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="iso-river" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={pal.river1} />
            <stop offset="50%" stopColor={pal.river2} />
            <stop offset="100%" stopColor={pal.river0} />
          </linearGradient>
          <linearGradient id="iso-haze" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={pal.haze} stopOpacity="0.0" />
            <stop offset="80%" stopColor={pal.haze} stopOpacity="0.45" />
            <stop offset="100%" stopColor={pal.skyHorizon} stopOpacity="0.7" />
          </linearGradient>
          <linearGradient id="iso-beacon" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor={ACCENT_CRIMSON} stopOpacity="0.95" />
            <stop offset="100%" stopColor={ACCENT_CRIMSON} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* ── SKY ──────────────────────────────────────────────── */}
        <rect x={minX} y={minY} width={VW} height={VH} fill="url(#iso-sky)" />

        {starOpacity > 0.02 && stars.map((s, i) => (
          <circle
            key={`st${i}`}
            cx={s.x}
            cy={s.y}
            r={s.r}
            fill="#dde7ff"
            opacity={starOpacity * (0.4 + 0.6 * Math.abs(Math.sin(tick * 1.5 + s.tw)))}
          />
        ))}

        {sunVisible && (
          <g>
            <circle cx={sunCx} cy={sunCy} r={120} fill="url(#iso-sunGlow)" opacity={0.6 + pal.dusk * 0.3} />
            <circle cx={sunCx} cy={sunCy} r={22} fill={pal.dusk > 0.4 ? "#ffb060" : "#fff2c8"} />
          </g>
        )}
        {moonVisible && (() => {
          const mAngle = (tod + 0.25) * Math.PI * 2;
          const mx = skyCx + Math.cos(mAngle) * VW * 0.42;
          const my = (minY + 60) + skyArcR - Math.sin(mAngle) * skyArcR;
          if (my > skylineY + 40) return null;
          return (
            <g>
              <circle cx={mx} cy={my} r={60} fill="url(#iso-moonGlow)" />
              <circle cx={mx} cy={my} r={14} fill="#e6ecff" />
              <circle cx={mx + 5} cy={my - 3} r={13} fill={pal.skyTop} opacity={0.9} />
            </g>
          );
        })()}

        {/* distant skyline parallax */}
        <path d={skyline1} fill={lerpHex(pal.skyHorizon, pal.skyTop, 0.55)} opacity="0.55" />
        <path d={skyline2} fill={lerpHex(pal.skyHorizon, pal.skyTop, 0.7)} opacity="0.7" />
        <path d={skyline3} fill={lerpHex(pal.skyHorizon, pal.skyTop, 0.85)} opacity="0.85" />

        <rect
          x={minX}
          y={skylineY - 40}
          width={VW}
          height={VH - (skylineY - 40 - minY)}
          fill="url(#iso-haze)"
          pointerEvents="none"
        />

        {/* ── GROUND PLANE ─────────────────────────────────────── */}
        <polygon points={poly([iso(0, 0), iso(N, 0), iso(N, N), iso(0, N)])} fill={pal.ground} />

        {/* block tiles */}
        {city.cells.map((kind, i) => {
          if (kind !== "block") return null;
          const x = i % N;
          const y = Math.floor(i / N);
          return (
            <polygon
              key={`b${i}`}
              points={poly([iso(x, y, 0.05), iso(x + 1, y, 0.05), iso(x + 1, y + 1, 0.05), iso(x, y + 1, 0.05)])}
              fill={pal.block}
            />
          );
        })}

        {/* parks with trees */}
        {city.cells.map((kind, i) => {
          if (kind !== "park") return null;
          const x = i % N;
          const y = Math.floor(i / N);
          return (
            <g key={`p${i}`}>
              <polygon
                points={poly([iso(x, y, 0.08), iso(x + 1, y, 0.08), iso(x + 1, y + 1, 0.08), iso(x, y + 1, 0.08)])}
                fill={pal.park}
              />
              {([[0.3, 0.3], [0.7, 0.5], [0.4, 0.75]] as [number, number][]).map(([u, v], k) => {
                const p = iso(x + u, y + v, 0.4);
                return (
                  <g key={k}>
                    <ellipse cx={p[0]} cy={p[1] + 1.5} rx={3} ry={1} fill="#000" fillOpacity={pal.shadowAlpha * 0.7} />
                    <circle cx={p[0]} cy={p[1] - 1.2} r={2.6} fill={pal.parkEdge} />
                    <line x1={p[0]} y1={p[1] - 1.2} x2={p[0]} y2={p[1] + 1} stroke="#3a2820" strokeWidth={0.6} />
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* plaza */}
        {city.cells.map((kind, i) => {
          if (kind !== "plaza") return null;
          const x = i % N;
          const y = Math.floor(i / N);
          return (
            <polygon
              key={`pz${i}`}
              points={poly([iso(x, y, 0.07), iso(x + 1, y, 0.07), iso(x + 1, y + 1, 0.07), iso(x, y + 1, 0.07)])}
              fill={pal.plaza}
              stroke={pal.bldgEdge}
              strokeWidth={0.3}
              strokeOpacity={0.5}
            />
          );
        })}

        {/* roads */}
        {city.roadCells.map(([x, y], i) => (
          <polygon
            key={`r${i}`}
            points={poly([iso(x, y, 0.02), iso(x + 1, y, 0.02), iso(x + 1, y + 1, 0.02), iso(x, y + 1, 0.02)])}
            fill={pal.road}
            stroke={pal.roadEdge}
            strokeWidth={0.4}
          />
        ))}

        {/* lane stripes */}
        {Array.from({ length: Math.floor(N / ARTERIAL) + 1 }, (_, k) => k * ARTERIAL).map((y) => (
          <g key={`lh${y}`}>
            {Array.from({ length: N * 2 }, (_, i) => {
              if (i % 2 === 1) return null;
              const a = iso(i / 2, y + 0.5, 0.04);
              const b = iso(i / 2 + 0.4, y + 0.5, 0.04);
              return <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={pal.laneDash} strokeWidth={0.7} />;
            })}
          </g>
        ))}
        {Array.from({ length: Math.floor(N / ARTERIAL) + 1 }, (_, k) => k * ARTERIAL).map((x) => (
          <g key={`lv${x}`}>
            {Array.from({ length: N * 2 }, (_, i) => {
              if (i % 2 === 1) return null;
              const a = iso(x + 0.5, i / 2, 0.04);
              const b = iso(x + 0.5, i / 2 + 0.4, 0.04);
              return <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={pal.laneDash} strokeWidth={0.7} />;
            })}
          </g>
        ))}

        {/* street-light glow at intersections */}
        {Array.from({ length: Math.floor(N / ARTERIAL) + 1 }, (_, ix) => ix * ARTERIAL).flatMap((sx) =>
          Array.from({ length: Math.floor(N / ARTERIAL) + 1 }, (_, iy) => iy * ARTERIAL).map((sy) => {
            const p = iso(sx + 0.5, sy + 0.5, 0.05);
            const opGlow = (1 - pal.day) * 0.85;
            if (opGlow < 0.04) return null;
            return (
              <g key={`sl${sx}-${sy}`}>
                <circle cx={p[0]} cy={p[1]} r={3.5} fill="#f0c068" opacity={opGlow * 0.6} />
                <circle cx={p[0]} cy={p[1]} r={1.2} fill="#fff2c8" opacity={opGlow} />
              </g>
            );
          }),
        )}

        {/* river */}
        {city.riverCells.map(([x, y], i) => (
          <polygon
            key={`rv${i}`}
            points={poly([iso(x, y, -0.25), iso(x + 1, y, -0.25), iso(x + 1, y + 1, -0.25), iso(x, y + 1, -0.25)])}
            fill="url(#iso-river)"
          />
        ))}
        {city.riverCells.filter((_, i) => i % 3 === 0).map(([x, y], i) => {
          const a = iso(x + 0.2, y + 0.5, -0.22);
          const b = iso(x + 0.8, y + 0.5, -0.22);
          return (
            <line
              key={`rip${i}`}
              x1={a[0]}
              y1={a[1]}
              x2={b[0]}
              y2={b[1]}
              stroke={lerpHex("#2a6c9c", "#ffe2b0", pal.dusk)}
              strokeOpacity={0.45}
              strokeWidth={0.7}
              strokeDasharray="1.5 3"
              style={{ animation: "iso-ripple 4s linear infinite", animationDelay: `${(i * 0.13) % 4}s` }}
            />
          );
        })}
        {pal.day > 0.3 && city.riverCells.filter((_, i) => i % 4 === 0).map(([x, y], i) => {
          const p = iso(x + 0.5, y + 0.5, -0.21);
          return (
            <ellipse
              key={`gl${i}`}
              cx={p[0]}
              cy={p[1]}
              rx={6}
              ry={1.2}
              fill={pal.dusk > 0.4 ? "#ffe2b0" : "#fff7d4"}
              opacity={pal.day * 0.35}
            />
          );
        })}

        {/* bridges */}
        {city.bridgeCells.map(([x, y], i) => {
          const top = poly([iso(x, y, 0.08), iso(x + 1, y, 0.08), iso(x + 1, y + 1, 0.08), iso(x, y + 1, 0.08)]);
          const sideF = poly([iso(x, y + 1, 0.08), iso(x + 1, y + 1, 0.08), iso(x + 1, y + 1, -0.18), iso(x, y + 1, -0.18)]);
          const sideR = poly([iso(x + 1, y, 0.08), iso(x + 1, y + 1, 0.08), iso(x + 1, y + 1, -0.18), iso(x + 1, y, -0.18)]);
          return (
            <g key={`br${i}`}>
              <polygon points={sideR} fill={pal.bldgRight} />
              <polygon points={sideF} fill={pal.bldgFront} />
              <polygon points={top} fill={pal.block} stroke={pal.bldgEdge} strokeWidth={0.4} />
            </g>
          );
        })}

        {/* ── BUILDINGS ─────────────────────────────────────────── */}
        {orderedBuildings.map((b, i) => (
          <BuildingPiece key={`bd${i}`} b={b} pal={pal} windowLitProb={windowLitProb} />
        ))}

        {/* traffic dots */}
        {traffic.map((line, i) => (
          <g key={`tr${i}`}>
            {Array.from({ length: line.n }, (_, k) => {
              const t = ((tick * line.speed + k / line.n) % 1 + 1) % 1;
              const gx = line.a[0] + (line.b[0] - line.a[0]) * t;
              const gy = line.a[1] + (line.b[1] - line.a[1]) * t;
              const p = iso(gx, gy, 0.12);
              return (
                <g key={k}>
                  <ellipse cx={p[0]} cy={p[1] + 0.8} rx={1.6} ry={0.6} fill="#000" fillOpacity={pal.shadowAlpha * 0.7} />
                  <circle
                    cx={p[0]}
                    cy={p[1] - 0.5}
                    r={1.4}
                    fill={pal.day > 0.3 ? "#a8b8d4" : "#f0c068"}
                    opacity={pal.day > 0.3 ? 0.85 : 1}
                  />
                </g>
              );
            })}
          </g>
        ))}

        {/* ── DAY 13: per-incident response lines ───────────────── */}
        {/* For every unit currently working an incident, draw a thin
            cyan line from the unit's iso position to the incident's
            iso position. Renders BEFORE stations + incidents so the
            beacon glyphs still win visually. */}
        {liveUnits.map(({ u, gx, gy }) => {
          if (!u.current_incident_id) return null;
          if (u.status !== "en_route" && u.status !== "on_scene" && u.status !== "transporting") return null;
          const target = liveIncidents.find((li) => li.i.id === u.current_incident_id);
          if (!target) return null;
          const a = iso(gx, gy, 1.0);
          const b = iso(target.gx, target.gy, 1.0);
          const opacity = u.status === "on_scene" ? 0.85 : 0.55;
          return (
            <line
              key={`resp_${u.id}`}
              x1={a[0]}
              y1={a[1]}
              x2={b[0]}
              y2={b[1]}
              stroke={ACCENT_CYAN}
              strokeOpacity={opacity}
              strokeWidth={0.9}
              strokeDasharray="3 3"
            />
          );
        })}

        {/* ── LIVE STATIONS ─────────────────────────────────────── */}
        {liveStations.map(({ s, gx, gy }) => (
          <g
            key={`s_${s.id}`}
            onClick={() => select({ kind: "station", id: s.id })}
            style={{ cursor: "pointer" }}
          >
            <polygon
              points={poly([
                iso(gx - 0.3, gy - 0.3, 0.15),
                iso(gx + 0.3, gy - 0.3, 0.15),
                iso(gx + 0.3, gy + 0.3, 0.15),
                iso(gx - 0.3, gy + 0.3, 0.15),
              ])}
              fill={ACCENT_CYAN}
              fillOpacity={0.18}
              stroke={ACCENT_CYAN}
              strokeWidth={1}
            />
            {(() => {
              const top = iso(gx, gy, 1.4);
              const bot = iso(gx, gy, 0.15);
              return (
                <>
                  <line x1={bot[0]} y1={bot[1]} x2={top[0]} y2={top[1]} stroke={ACCENT_CYAN} strokeWidth={1.2} />
                  <rect x={top[0]} y={top[1] - 7} width={Math.max(14, s.name.length * 5)} height={7} fill={ACCENT_CYAN} />
                  <text
                    x={top[0] + 3}
                    y={top[1] - 1}
                    fill="#080b12"
                    fontSize={7}
                    fontFamily="JetBrains Mono"
                    letterSpacing="0.18em"
                  >
                    {s.name.slice(0, 12).toUpperCase()}
                  </text>
                </>
              );
            })()}
          </g>
        ))}

        {/* ── LIVE INCIDENTS ────────────────────────────────────── */}
        {liveIncidents.map(({ i, gx, gy }) => {
          const sevColor =
            i.severity === "critical" ? ACCENT_CRIMSON :
            i.severity === "high" ? ACCENT_CRIMSON :
            i.severity === "moderate" ? ACCENT_AMBER : ACCENT_AMBER;
          return (
            <g
              key={`i_${i.id}`}
              onClick={() => select({ kind: "incident", id: i.id })}
              style={{ cursor: "pointer" }}
            >
              <polygon
                points={poly([
                  iso(gx - 0.35, gy, 0.15),
                  iso(gx, gy - 0.35, 0.15),
                  iso(gx + 0.35, gy, 0.15),
                  iso(gx, gy + 0.35, 0.15),
                ])}
                fill={sevColor}
                fillOpacity={0.18 + beaconPulse * 0.18}
                stroke={sevColor}
                strokeWidth={1}
              />
              {(() => {
                const ground = iso(gx, gy, 0.15);
                const sky = iso(gx, gy, 11);
                return (
                  <>
                    <rect
                      x={ground[0] - 3}
                      y={sky[1]}
                      width={6}
                      height={ground[1] - sky[1]}
                      fill="url(#iso-beacon)"
                      opacity={0.75 + beaconPulse * 0.25}
                    />
                    <rect
                      x={ground[0] - 1}
                      y={sky[1] - 4}
                      width={2}
                      height={ground[1] - sky[1] + 4}
                      fill={sevColor}
                      opacity={0.95}
                    />
                    <ellipse
                      cx={ground[0]}
                      cy={ground[1]}
                      rx={14 + beaconPulse * 18}
                      ry={(14 + beaconPulse * 18) * 0.5}
                      fill="none"
                      stroke={sevColor}
                      strokeOpacity={0.7 - beaconPulse * 0.6}
                      strokeWidth={1.2}
                    />
                    <text
                      x={ground[0] + 14}
                      y={sky[1] + 3}
                      fill={sevColor}
                      fontSize={9}
                      fontFamily="JetBrains Mono"
                      letterSpacing="0.18em"
                    >
                      {i.id.toUpperCase()}
                    </text>
                    <text
                      x={ground[0] + 14}
                      y={sky[1] + 14}
                      fill="#c8d3e6"
                      fontSize={7}
                      fontFamily="JetBrains Mono"
                      letterSpacing="0.18em"
                      opacity={0.6}
                    >
                      {i.type.replace(/_/g, " ").toUpperCase()} · {i.severity.slice(0, 3).toUpperCase()}
                    </text>
                  </>
                );
              })()}
            </g>
          );
        })}

        {/* ── LIVE UNITS ────────────────────────────────────────── */}
        {liveUnits.map(({ u, gx, gy }) => {
          const tone =
            u.status === "available" ? ACCENT_EMERALD :
            u.status === "en_route" ? ACCENT_AMBER :
            u.status === "on_scene" ? ACCENT_CYAN :
            u.status === "transporting" ? ACCENT_AMBER :
            "#a8b8cc";
          return (
            <UnitMark
              key={`u_${u.id}`}
              gx={gx}
              gy={gy}
              color={tone}
              label={u.callsign}
              tick={tick}
              pulsing={u.status === "on_scene" || u.status === "en_route"}
              onClick={() => select({ kind: "unit", id: u.id })}
              shadowAlpha={pal.shadowAlpha}
            />
          );
        })}

        {/* helicopter */}
        {(() => {
          const cx = N * 0.55, cy = N * 0.4, r = 5;
          const a = tick * 0.4;
          const gx = cx + Math.cos(a) * r;
          const gy = cy + Math.sin(a) * r;
          const air = iso(gx, gy, 16);
          const ground = iso(gx, gy, 0.05);
          return (
            <g opacity={0.95}>
              <line
                x1={air[0]}
                y1={air[1]}
                x2={ground[0]}
                y2={ground[1]}
                stroke={pal.textMute}
                strokeOpacity={0.25}
                strokeDasharray="2 3"
                strokeWidth={0.6}
              />
              <ellipse cx={ground[0]} cy={ground[1]} rx={3} ry={1.2} fill="#000" fillOpacity={pal.shadowAlpha + 0.1} />
              <circle cx={air[0]} cy={air[1]} r={2} fill="#c8d3e6" />
              <line
                x1={air[0] - 6}
                y1={air[1]}
                x2={air[0] + 6}
                y2={air[1]}
                stroke="#c8d3e6"
                strokeOpacity={0.5}
                strokeWidth={0.8}
              />
              <circle
                cx={air[0]}
                cy={air[1]}
                r={3.5}
                fill="none"
                stroke="#c8d3e6"
                strokeOpacity={0.3 + Math.sin(tick * 8) * 0.25}
                strokeWidth={0.6}
              />
            </g>
          );
        })()}

        {/* compass */}
        <g transform={`translate(${minX + 36} ${minY + 50})`}>
          <circle r={14} fill="rgba(13,17,28,0.7)" stroke="#1a2235" />
          <line x1={0} y1={-10} x2={0} y2={10} stroke="#2c3a55" strokeWidth={0.7} />
          <line x1={-10} y1={0} x2={10} y2={0} stroke="#2c3a55" strokeWidth={0.7} />
          <polygon points="0,-12 -3,-2 3,-2" fill={ACCENT_CYAN} />
          <text x={0} y={-16} textAnchor="middle" fontSize={7} fontFamily="JetBrains Mono" fill="#6b7a96" letterSpacing="0.18em">
            N
          </text>
        </g>
      </svg>

      {/* Time-of-day HUD chip (top-right, below zoom buttons) */}
      <div className="absolute top-3 right-3 mt-[64px] z-[1] bg-bg-panel/80 border border-border-subtle px-2 py-1 font-mono text-[8px] uppercase tracking-[0.18em] text-fg-base flex items-center gap-2 backdrop-blur-sm">
        <ClockGlyph tod={tod} />
        <span className="text-accent-cyan">{todLabel(tod)}</span>
        <span className="text-fg-mute">·</span>
        <span className="tabular-nums">
          {Math.floor(tod * 24).toString().padStart(2, "0")}:
          {Math.floor(((tod * 24) % 1) * 60).toString().padStart(2, "0")}
        </span>
      </div>
    </div>
  );
}

// ─── Building piece ──────────────────────────────────────────────────

function BuildingPiece({ b, pal, windowLitProb }: { b: Building; pal: Palette; windowLitProb: number }) {
  const f = buildingFaces(b);
  const tops = [pal.bldgTopA, pal.bldgTopB, pal.bldgTopC];
  const topColor = tops[b.mat % 3];
  const rightWindows = useMemo(() => windowDots(f.right, b.h, b.type, b.litSeed), [b.litSeed, b.h, b.type, f.right]);
  const frontWindows = useMemo(() => windowDots(f.front, b.h, b.type, b.litSeed + 0.31), [b.litSeed, b.h, b.type, f.front]);

  const isGlass = b.type === "glass" || b.type === "tower";

  // setback upper section (only for h ≥ 4)
  const setback = b.type === "setback" && b.h >= 4
    ? {
        x: b.x + 0.25,
        y: b.y + 0.25,
        w: Math.max(0.4, b.w - 0.5),
        d: Math.max(0.4, b.d - 0.5),
        h: b.h,
        h0: Math.floor(b.h * 0.65),
      }
    : null;

  return (
    <g>
      {/* ground shadow */}
      <polygon
        points={poly([
          iso(b.x + 0.05, b.y + 0.05, 0.01),
          iso(b.x + b.w + 0.4, b.y + 0.05, 0.01),
          iso(b.x + b.w + 0.4, b.y + b.d + 0.4, 0.01),
          iso(b.x + 0.05, b.y + b.d + 0.4, 0.01),
        ])}
        fill="#000"
        fillOpacity={pal.shadowAlpha}
      />

      {/* base block */}
      <polygon points={poly(f.front)} fill={pal.bldgFront} stroke={pal.bldgEdge} strokeWidth={0.4} strokeOpacity={0.6} />
      <polygon points={poly(f.right)} fill={pal.bldgRight} stroke={pal.bldgEdge} strokeWidth={0.4} strokeOpacity={0.6} />

      {/* lobby glow at night */}
      {b.h >= 2 && (() => {
        const glow = clamp((1 - pal.day) * 0.7);
        if (glow < 0.05) return null;
        return (
          <polygon
            points={poly([
              iso(b.x + 0.15, b.y + b.d, 0.7),
              iso(b.x + b.w - 0.15, b.y + b.d, 0.7),
              iso(b.x + b.w - 0.15, b.y + b.d, 0.3),
              iso(b.x + 0.15, b.y + b.d, 0.3),
            ])}
            fill="#f0c068"
            opacity={glow * 0.7}
          />
        );
      })()}

      {/* mullion lines for glass towers */}
      {isGlass && Array.from({ length: 3 }, (_, k) => {
        const u = (k + 1) / 4;
        const a = iso(b.x + b.w, b.y + u * b.d, b.h);
        const aa = iso(b.x + b.w, b.y + u * b.d, 0);
        const c = iso(b.x + u * b.w, b.y + b.d, b.h);
        const cc = iso(b.x + u * b.w, b.y + b.d, 0);
        return (
          <g key={k}>
            <line x1={a[0]} y1={a[1]} x2={aa[0]} y2={aa[1]} stroke={pal.bldgEdge} strokeOpacity={0.35} strokeWidth={0.4} />
            <line x1={c[0]} y1={c[1]} x2={cc[0]} y2={cc[1]} stroke={pal.bldgEdge} strokeOpacity={0.35} strokeWidth={0.4} />
          </g>
        );
      })}

      {/* windows: right face */}
      {rightWindows.map((w, k) => {
        const lit = w.lit && w.sparkle < windowLitProb;
        return (
          <rect
            key={`rw${k}`}
            x={Math.min(w.p00[0], w.p11[0])}
            y={Math.min(w.p00[1], w.p11[1])}
            width={Math.abs(w.p11[0] - w.p00[0])}
            height={Math.abs(w.p11[1] - w.p00[1])}
            fill={lit ? pal.windowLit : pal.windowGlass}
            fillOpacity={lit ? 0.85 : 0.6}
          />
        );
      })}
      {/* windows: front face */}
      {frontWindows.map((w, k) => {
        const lit = w.lit && w.sparkle < windowLitProb;
        return (
          <rect
            key={`fw${k}`}
            x={Math.min(w.p00[0], w.p11[0])}
            y={Math.min(w.p00[1], w.p11[1])}
            width={Math.abs(w.p11[0] - w.p00[0])}
            height={Math.abs(w.p11[1] - w.p00[1])}
            fill={lit ? pal.windowLit : pal.windowGlass}
            fillOpacity={lit ? 0.9 : 0.6}
          />
        );
      })}

      {/* roof top */}
      <polygon points={poly(f.top)} fill={topColor} stroke={pal.bldgEdge} strokeWidth={0.5} />

      {/* setback upper section */}
      {setback && (() => {
        const u = setback;
        const upTop: [number, number][] = [
          iso(u.x, u.y, u.h),
          iso(u.x + u.w, u.y, u.h),
          iso(u.x + u.w, u.y + u.d, u.h),
          iso(u.x, u.y + u.d, u.h),
        ];
        const upRight: [number, number][] = [
          iso(u.x + u.w, u.y, u.h),
          iso(u.x + u.w, u.y + u.d, u.h),
          iso(u.x + u.w, u.y + u.d, u.h0),
          iso(u.x + u.w, u.y, u.h0),
        ];
        const upFront: [number, number][] = [
          iso(u.x, u.y + u.d, u.h),
          iso(u.x + u.w, u.y + u.d, u.h),
          iso(u.x + u.w, u.y + u.d, u.h0),
          iso(u.x, u.y + u.d, u.h0),
        ];
        return (
          <g>
            <polygon points={poly(upFront)} fill={pal.bldgFront} stroke={pal.bldgEdge} strokeWidth={0.35} />
            <polygon points={poly(upRight)} fill={pal.bldgRight} stroke={pal.bldgEdge} strokeWidth={0.35} />
            <polygon points={poly(upTop)} fill={topColor} stroke={pal.bldgEdge} strokeWidth={0.4} />
          </g>
        );
      })()}

      {/* parapet */}
      <polygon
        points={poly([
          iso(b.x + 0.05, b.y + 0.05, b.h + 0.18),
          iso(b.x + b.w - 0.05, b.y + 0.05, b.h + 0.18),
          iso(b.x + b.w - 0.05, b.y + b.d - 0.05, b.h + 0.18),
          iso(b.x + 0.05, b.y + b.d - 0.05, b.h + 0.18),
        ])}
        fill="none"
        stroke={pal.bldgEdge}
        strokeWidth={0.7}
      />

      {/* rooftop kit */}
      <RoofKit b={b} pal={pal} />
    </g>
  );
}

// ─── rooftop equipment ──────────────────────────────────────────────

function RoofKit({ b, pal }: { b: Building; pal: Palette }) {
  const r = useMemo(() => rng(Math.floor(b.decoSeed * 9999) + b.x * 31 + b.y * 17), [b.decoSeed, b.x, b.y]);
  const items: React.ReactNode[] = [];
  const cx = b.x + b.w / 2;
  const cy = b.y + b.d / 2;

  if (b.type === "tower" || b.type === "glass") {
    const base = iso(cx, cy, b.h + 0.25);
    const tip = iso(cx, cy, b.h + 1.6);
    items.push(
      <g key="ant">
        <line x1={base[0]} y1={base[1]} x2={tip[0]} y2={tip[1]} stroke={pal.bldgEdge} strokeWidth={1} />
        <circle cx={tip[0]} cy={tip[1]} r={1.2} fill="#ec5b6b" opacity={0.6 + 0.4 * Math.sin(b.x * 7)} />
      </g>,
    );
    if (b.type === "tower" && r() < 0.6) {
      const wx = b.x + b.w * 0.25;
      const wy = b.y + b.d * 0.7;
      const wTop = iso(wx, wy, b.h + 1.0);
      const wBase = iso(wx, wy, b.h + 0.45);
      items.push(
        <g key="wt">
          <line x1={wBase[0] - 3} y1={wBase[1]} x2={wTop[0] - 3} y2={wTop[1]} stroke={pal.bldgEdge} strokeWidth={0.6} />
          <line x1={wBase[0] + 3} y1={wBase[1]} x2={wTop[0] + 3} y2={wTop[1]} stroke={pal.bldgEdge} strokeWidth={0.6} />
          <ellipse cx={wTop[0]} cy={wTop[1]} rx={4} ry={1.5} fill={pal.bldgRight} stroke={pal.bldgEdge} strokeWidth={0.5} />
          <rect x={wTop[0] - 4} y={wTop[1]} width={8} height={wBase[1] - wTop[1]} fill={pal.bldgFront} stroke={pal.bldgEdge} strokeWidth={0.4} />
          <ellipse cx={wTop[0]} cy={wBase[1]} rx={4} ry={1.5} fill={pal.bldgRight} stroke={pal.bldgEdge} strokeWidth={0.4} />
        </g>,
      );
    }
  }

  if (b.type === "setback" || b.type === "slab") {
    const ax = b.x + b.w * 0.6;
    const ay = b.y + b.d * 0.3;
    items.push(
      <g key="ac">
        <polygon
          points={poly([
            iso(ax - 0.15, ay - 0.15, b.h + 0.3),
            iso(ax + 0.15, ay - 0.15, b.h + 0.3),
            iso(ax + 0.15, ay + 0.15, b.h + 0.3),
            iso(ax - 0.15, ay + 0.15, b.h + 0.3),
          ])}
          fill={pal.bldgRight}
          stroke={pal.bldgEdge}
          strokeWidth={0.4}
        />
        <polygon
          points={poly([
            iso(ax - 0.12, ay - 0.12, b.h + 0.3),
            iso(ax - 0.12, ay - 0.12, b.h),
            iso(ax + 0.12, ay - 0.12, b.h),
            iso(ax + 0.12, ay - 0.12, b.h + 0.3),
          ])}
          fill={pal.bldgFront}
        />
      </g>,
    );
  }

  if ((b.type === "tower" || b.type === "slab") && r() < 0.35) {
    const bottomA = iso(b.x, b.y, b.h * 0.45);
    const bottomB = iso(b.x, b.y + b.d, b.h * 0.45);
    const topA = iso(b.x, b.y, b.h * 0.75);
    const topB = iso(b.x, b.y + b.d, b.h * 0.75);
    const signColors = ["#ec5b6b", "#f0b85a", "#4ad8e6", "#a07aff"];
    const signColor = signColors[Math.floor(r() * signColors.length)];
    items.push(
      <g key="sign">
        <polygon points={poly([topA, topB, bottomB, bottomA])} fill={pal.bldgFront} stroke={pal.bldgEdge} strokeWidth={0.4} />
        <polygon
          points={poly([
            [topA[0] + 1, topA[1] + 1],
            [topB[0] + 1, topB[1] + 1],
            [bottomB[0] + 1, bottomB[1] - 1],
            [bottomA[0] + 1, bottomA[1] - 1],
          ])}
          fill={signColor}
          opacity={0.7}
        />
      </g>,
    );
  }

  if ((b.type === "tower" || b.type === "slab") && r() < 0.18 && b.w >= 2 && b.d >= 2) {
    const px = b.x + b.w / 2;
    const py = b.y + b.d / 2;
    const p = iso(px, py, b.h + 0.22);
    items.push(
      <g key="helip">
        <circle cx={p[0]} cy={p[1]} r={6} fill="#0d111c" stroke={pal.bldgEdge} strokeWidth={0.6} />
        <text x={p[0]} y={p[1] + 3} textAnchor="middle" fontSize={7} fontFamily="JetBrains Mono" fill="#c8d3e6" opacity={0.85}>
          H
        </text>
      </g>,
    );
  }

  if (b.type === "lowrise") {
    const ridgeStart = iso(b.x, b.y + b.d / 2, b.h + 0.4);
    const ridgeEnd = iso(b.x + b.w, b.y + b.d / 2, b.h + 0.4);
    const cornerNW = iso(b.x, b.y, b.h);
    const cornerNE = iso(b.x + b.w, b.y, b.h);
    const cornerSW = iso(b.x, b.y + b.d, b.h);
    const cornerSE = iso(b.x + b.w, b.y + b.d, b.h);
    items.push(
      <g key="roof">
        <polygon points={poly([cornerNW, cornerNE, ridgeEnd, ridgeStart])} fill={pal.bldgRight} stroke={pal.bldgEdge} strokeWidth={0.4} />
        <polygon points={poly([ridgeStart, ridgeEnd, cornerSE, cornerSW])} fill={pal.bldgTopA} stroke={pal.bldgEdge} strokeWidth={0.4} />
      </g>,
    );
  }

  return <g>{items}</g>;
}

// ─── unit pillar mark ────────────────────────────────────────────────

function UnitMark({
  gx, gy, color, label, tick, pulsing, onClick, shadowAlpha,
}: {
  gx: number; gy: number; color: string; label: string;
  tick: number; pulsing: boolean; onClick: () => void; shadowAlpha: number;
}) {
  const ground = iso(gx, gy, 0.05);
  const top = iso(gx, gy, 1.0);
  const ringR = 6 + (pulsing ? (Math.sin(tick * 4) + 1) * 3 : 0);
  return (
    <g onClick={onClick} style={{ cursor: "pointer" }}>
      <ellipse cx={ground[0]} cy={ground[1] + 1} rx={4} ry={1.6} fill="#000" fillOpacity={shadowAlpha + 0.2} />
      <line x1={ground[0]} y1={ground[1]} x2={top[0]} y2={top[1]} stroke={color} strokeWidth={1.1} />
      <circle cx={top[0]} cy={top[1]} r={3.2} fill={color} stroke="#040609" strokeWidth={0.6} />
      {pulsing && (
        <circle cx={top[0]} cy={top[1]} r={ringR} fill="none" stroke={color} strokeOpacity={0.45} strokeWidth={0.8} />
      )}
      <text x={top[0] + 6} y={top[1] - 3} fill="#ffffff" fontSize={9} fontFamily="JetBrains Mono" letterSpacing="0.18em">
        {label}
      </text>
    </g>
  );
}

// ─── clock glyph (TopStrip mini-clock) ───────────────────────────────

function ClockGlyph({ tod }: { tod: number }) {
  const a = (tod * Math.PI * 2) - Math.PI / 2;
  const x = 6 + Math.cos(a) * 5;
  const y = 6 + Math.sin(a) * 5;
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" className="shrink-0">
      <circle cx={7} cy={7} r={6} fill="none" stroke="#3d4a64" strokeWidth={0.8} />
      <line x1={7} y1={7} x2={x + 1} y2={y + 1} stroke="#a8b8cc" strokeWidth={1} />
    </svg>
  );
}
