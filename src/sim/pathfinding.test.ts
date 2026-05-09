import { describe, it, expect } from "vitest";
import { shortestPath, walkAlong, polylineLengthM } from "./pathfinding";
import { buildRoadGraph } from "./roadGraph";

// Tiny synthetic road graph in QC longitude/latitude range so distances are
// realistic (~110km/deg latitude, ~85km/deg longitude at 41.5N).
const TINY_ROADS = {
  type: "FeatureCollection" as const,
  features: [
    {
      type: "Feature" as const,
      properties: null,
      geometry: {
        type: "LineString" as const,
        coordinates: [
          [-90.580, 41.520],
          [-90.575, 41.520],
          [-90.570, 41.520],
        ],
      },
    },
    {
      type: "Feature" as const,
      properties: null,
      geometry: {
        type: "LineString" as const,
        coordinates: [
          [-90.575, 41.520],
          [-90.575, 41.525],
        ],
      },
    },
  ],
};

describe("pathfinding", () => {
  it("builds a connected graph and finds a straight-line route", () => {
    const g = buildRoadGraph(TINY_ROADS);
    expect(g.nodes.size).toBe(4); // 3 along, 1 branch
    const route = shortestPath(g, [-90.580, 41.520], [-90.570, 41.520]);
    expect(route).not.toBeNull();
    expect(route!.coords.length).toBeGreaterThanOrEqual(2);
    expect(route!.length_m).toBeGreaterThan(500);
    expect(route!.length_m).toBeLessThan(2000);
  });

  it("returns null when nodes exist but no path connects them", () => {
    const disjoint = {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          properties: null,
          geometry: {
            type: "LineString" as const,
            coordinates: [
              [-90.580, 41.520],
              [-90.578, 41.520],
            ],
          },
        },
        {
          type: "Feature" as const,
          properties: null,
          geometry: {
            type: "LineString" as const,
            coordinates: [
              [-90.500, 41.520],
              [-90.498, 41.520],
            ],
          },
        },
      ],
    };
    const g = buildRoadGraph(disjoint);
    const route = shortestPath(g, [-90.580, 41.520], [-90.500, 41.520]);
    expect(route).toBeNull();
  });

  it("walkAlong interpolates linearly along a segment", () => {
    const line: [number, number][] = [
      [-90.580, 41.520],
      [-90.570, 41.520],
    ];
    const total = polylineLengthM(line);
    const halfway = walkAlong(line, total / 2);
    expect(halfway[1]).toBeCloseTo(41.520, 5);
    expect(halfway[0]).toBeCloseTo((-90.580 + -90.570) / 2, 4);
  });

  it("walkAlong clamps to last vertex when distance exceeds polyline", () => {
    const line: [number, number][] = [
      [-90.580, 41.520],
      [-90.570, 41.520],
    ];
    const past = walkAlong(line, 999_999);
    expect(past[0]).toBeCloseTo(-90.570, 5);
    expect(past[1]).toBeCloseTo(41.520, 5);
  });
});
