// src/utils/geometry/triangle.ts
export type TriangleMode = 'equilateral' | 'isosceles' | 'scalene';

export interface Point {
  x: number;
  y: number;
}

export interface TriangleSpec {
  width: number; // bounding box width
  height: number; // bounding box height
  mode: TriangleMode;
  orientation?: 'up' | 'down';
}

export const SQRT3 = Math.sqrt(3);

export const equilateralHeightForSide = (side: number) => (SQRT3 / 2) * side;

export const equilateralSideForHeight = (height: number) => (2 / SQRT3) * height;

export const resolveEquilateralSize = (width: number, height: number): { base: number; height: number } => {
  const maxSideFromWidth = Math.max(0, width);
  const maxSideFromHeight = Math.max(0, equilateralSideForHeight(height));
  const side = Math.max(0.0001, Math.min(maxSideFromWidth, maxSideFromHeight));
  const h = equilateralHeightForSide(side);
  return { base: side, height: h };
};

// Returns triangle points relative to the top-left of the bounding box (0,0)
export const getTrianglePoints = (spec: TriangleSpec): Point[] => {
  const width = Math.max(0, spec.width);
  const height = Math.max(0, spec.height);
  const orientation = spec.orientation ?? 'down';

  if (spec.mode === 'equilateral') {
    const { base, height: h } = resolveEquilateralSize(width, height);
    const offsetX = (width - base) / 2;
    const offsetY = (height - h) / 2;

    const apexUp: Point = { x: offsetX + base / 2, y: offsetY };
    const baseLeft: Point = { x: offsetX, y: offsetY + h };
    const baseRight: Point = { x: offsetX + base, y: offsetY + h };

    if (orientation === 'up') {
      // Flip vertically within bounding box
      const flippedApex: Point = { x: apexUp.x, y: height - apexUp.y };
      const flippedLeft: Point = { x: baseLeft.x, y: height - baseLeft.y };
      const flippedRight: Point = { x: baseRight.x, y: height - baseRight.y };
      return [flippedApex, flippedRight, flippedLeft];
    }

    return [apexUp, baseLeft, baseRight];
  }

  if (spec.mode === 'isosceles') {
    const apex: Point = { x: width / 2, y: 0 };
    const baseLeft: Point = { x: 0, y: height };
    const baseRight: Point = { x: width, y: height };

    if (orientation === 'up') {
      const flippedApex: Point = { x: apex.x, y: height - apex.y };
      const flippedLeft: Point = { x: baseLeft.x, y: height - baseLeft.y };
      const flippedRight: Point = { x: baseRight.x, y: height - baseRight.y };
      return [flippedApex, flippedRight, flippedLeft];
    }

    return [apex, baseLeft, baseRight];
  }

  // Scalene: derive third point based on drag vector within the box.
  // For simplicity, place apex at the top-left corner of the box and the base along the bottom.
  const apex: Point = { x: 0, y: 0 };
  const baseLeft: Point = { x: 0, y: height };
  const baseRight: Point = { x: width, y: height };

  if (orientation === 'up') {
    const flippedApex: Point = { x: apex.x, y: height - apex.y };
    const flippedLeft: Point = { x: baseLeft.x, y: height - baseLeft.y };
    const flippedRight: Point = { x: baseRight.x, y: height - baseRight.y };
    return [flippedApex, flippedRight, flippedLeft];
  }

  return [apex, baseLeft, baseRight];
};

export const getTrianglePointsWithOrigin = (
  left: number,
  top: number,
  spec: TriangleSpec,
): Point[] => {
  const pts = getTrianglePoints(spec);
  return pts.map((p) => ({ x: p.x + left, y: p.y + top }));
};
