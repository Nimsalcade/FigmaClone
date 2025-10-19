// src/utils/geometry/star.ts
export interface Point {
  x: number;
  y: number;
}

export interface StarSpec {
  points: number; // number of outer points (spikes)
  innerRadius: number;
  outerRadius: number;
  rotation?: number; // radians
  smooth?: boolean; // reserved for future use
}

const clampPoints = (n: number) => Math.max(3, Math.min(64, Math.floor(n)));

// Generate star points relative to a bounding box with origin at (0,0) and size (2*outerRadius, 2*outerRadius)
// The star is centered at (outerRadius, outerRadius). By default, a point faces up (rotation = -PI/2).
export const getStarPoints = (spec: StarSpec): Point[] => {
  const spikes = Math.max(5, Math.min(12, clampPoints(spec.points)));
  const outerR = Math.max(0.0001, Math.abs(spec.outerRadius));
  const innerR = Math.max(0.0001, Math.min(Math.abs(spec.innerRadius), outerR));
  const rotation = spec.rotation ?? -Math.PI / 2; // face upward by default

  const cx = outerR;
  const cy = outerR;

  const pts: Point[] = [];
  const step = Math.PI / spikes; // because we alternate inner/outer => 2*spikes vertices

  for (let i = 0; i < spikes * 2; i++) {
    const isOuter = i % 2 === 0;
    const r = isOuter ? outerR : innerR;
    const angle = rotation + i * step;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    pts.push({ x, y });
  }

  // Optional future smoothing could be implemented by rounding corners or using quadratic curves.
  // For now, we return sharp corners.
  return pts;
};

export const getStarPointsWithOrigin = (left: number, top: number, spec: StarSpec): Point[] => {
  const relative = getStarPoints(spec);
  return relative.map((p) => ({ x: p.x + left, y: p.y + top }));
};

export const getStarBoundingBox = (outerRadius: number) => {
  const r = Math.max(0, Math.abs(outerRadius));
  return { width: r * 2, height: r * 2 };
};

export const ratioFromRadii = (innerRadius: number, outerRadius: number) => {
  const outer = Math.max(0.0001, Math.abs(outerRadius));
  const inner = Math.max(0, Math.min(Math.abs(innerRadius), outer));
  return inner / outer;
};
