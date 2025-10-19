// src/utils/geometry/polygon.ts
export interface Point {
  x: number;
  y: number;
}

export interface PolygonSpec {
  sides: number; // 3–12 supported in UI, but function supports 3–64
  radius: number; // outer radius
  rotation?: number; // radians, applied to vertices; 0 means pointing to the right
}

const clampSides = (n: number) => Math.max(3, Math.min(64, Math.floor(n)));

// Generate regular polygon points relative to a bounding box with origin at (0,0)
// The polygon is centered at (radius, radius) and the box is size (2*radius, 2*radius)
// Default rotation faces a vertex up (rotation = -PI/2) to match star default
export const getRegularPolygonPoints = (spec: PolygonSpec): Point[] => {
  const sides = clampSides(spec.sides);
  const r = Math.max(0.0001, Math.abs(spec.radius));
  const rotation = spec.rotation ?? -Math.PI / 2;

  const cx = r;
  const cy = r;
  const pts: Point[] = [];
  const step = (Math.PI * 2) / sides;

  for (let i = 0; i < sides; i++) {
    const angle = rotation + i * step;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    pts.push({ x, y });
  }

  return pts;
};

export const getRegularPolygonBoundingBox = (radius: number) => {
  const r = Math.max(0, Math.abs(radius));
  return { width: r * 2, height: r * 2 };
};
