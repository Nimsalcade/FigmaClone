export interface Point {
  x: number;
  y: number;
}

export const clampSides = (sides: number): number => {
  if (!Number.isFinite(sides)) return 3;
  return Math.max(3, Math.min(12, Math.round(sides)));
};

// Returns vertex angles starting at an orientation where a flat side is horizontal at the top
// Fabric/DOM coordinate system uses y increasing downward, so we use -PI/2 base.
const startAngleForHorizontalTopSide = (sides: number) => -Math.PI / 2 - Math.PI / sides;

export const regularPolygonPoints = (
  centerX: number,
  centerY: number,
  radius: number,
  sidesInput: number,
): Point[] => {
  const sides = clampSides(sidesInput);
  const r = Math.max(0, radius);
  const start = startAngleForHorizontalTopSide(sides);
  const step = (Math.PI * 2) / sides;
  const pts: Point[] = [];

  for (let i = 0; i < sides; i++) {
    const angle = start + i * step;
    const x = centerX + r * Math.cos(angle);
    const y = centerY + r * Math.sin(angle);
    pts.push({ x, y });
  }

  return pts;
};

// Convenience: generate points relative to a box with top-left at (0,0) and size (2r, 2r),
// where the polygon is centered at (r, r)
export const regularPolygonPointsRelative = (radius: number, sidesInput: number): Point[] => {
  const sides = clampSides(sidesInput);
  const r = Math.max(0, radius);
  const start = startAngleForHorizontalTopSide(sides);
  const step = (Math.PI * 2) / sides;
  const pts: Point[] = [];

  for (let i = 0; i < sides; i++) {
    const angle = start + i * step;
    const x = r + r * Math.cos(angle);
    const y = r + r * Math.sin(angle);
    pts.push({ x, y });
  }

  return pts;
};

export const DEFAULT_POLYGON_SIDES = 5;
