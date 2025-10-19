import { describe, it, expect } from 'vitest';
import { regularPolygonPoints, regularPolygonPointsRelative, clampSides } from './polygon';

const approxEqual = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) <= eps;

describe('regularPolygonPoints', () => {
  it('generates the correct number of points', () => {
    const pts = regularPolygonPoints(0, 0, 10, 7);
    expect(pts.length).toBe(7);
  });

  it('orients with a horizontal top side for triangle and square', () => {
    // Triangle: first two points should share the same y (top horizontal side)
    const tri = regularPolygonPointsRelative(100, 3);
    expect(approxEqual(tri[0].y, tri[1].y)).toBe(true);

    // Square: first two points share the same y (top horizontal side)
    const sq = regularPolygonPointsRelative(100, 4);
    expect(approxEqual(sq[0].y, sq[1].y)).toBe(true);
  });

  it('clamps sides between 3 and 12', () => {
    expect(clampSides(2)).toBe(3);
    expect(clampSides(3)).toBe(3);
    expect(clampSides(12)).toBe(12);
    expect(clampSides(16)).toBe(12);
  });
});
