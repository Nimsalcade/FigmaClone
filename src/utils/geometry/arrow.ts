// src/utils/geometry/arrow.ts
export type ArrowTailType = 'none' | 'line' | 'round';
export type ArrowHeadType = 'triangle' | 'diamond' | 'circle';

export interface ArrowOptions {
  tailType: ArrowTailType;
  headType: ArrowHeadType;
  headSize: number; // multiplier for stroke width
  tailLength?: number; // only for line tail
}

export const DEFAULT_ARROW_OPTIONS: ArrowOptions = {
  tailType: 'none',
  headType: 'triangle',
  headSize: 2,
  tailLength: 0,
};

export interface LineSpec {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface PolygonSpec {
  points: { x: number; y: number }[];
}

export interface CircleSpec {
  cx: number;
  cy: number;
  r: number;
}

export interface ArrowShapeSpec {
  shaft: LineSpec;
  head: { type: 'polygon' | 'circle'; polygon?: PolygonSpec; circle?: CircleSpec };
  tail?: { type: 'line' | 'circle'; line?: LineSpec; circle?: CircleSpec };
}

// Compute arrow sub-shapes in local coordinates where the arrow travels along +X axis.
// The origin (0,0) is the tail start. Length is the shaft length from tail to head tip.
export const computeArrowShapeSpec = (
  length: number,
  strokeWidth: number,
  opts: ArrowOptions,
): ArrowShapeSpec => {
  const L = Math.max(1, length);
  const sw = Math.max(0.5, strokeWidth);
  const headLen = Math.max(sw * 1, opts.headSize * sw);
  const headWidth = Math.max(sw * 1, opts.headSize * sw);

  const shaftEndX = Math.max(0, L - headLen);

  const shaft: LineSpec = { x1: 0, y1: 0, x2: shaftEndX, y2: 0 };

  let head: ArrowShapeSpec['head'];
  if (opts.headType === 'circle') {
    head = { type: 'circle', circle: { cx: L, cy: 0, r: headWidth / 2 } };
  } else {
    // triangle or diamond polygon
    if (opts.headType === 'triangle') {
      const pts = [
        { x: L, y: 0 },
        { x: shaftEndX, y: headWidth / 2 },
        { x: shaftEndX, y: -headWidth / 2 },
      ];
      head = { type: 'polygon', polygon: { points: pts } };
    } else {
      // diamond
      const pts = [
        { x: L, y: 0 },
        { x: shaftEndX + headLen / 2, y: headWidth / 2 },
        { x: shaftEndX, y: 0 },
        { x: shaftEndX + headLen / 2, y: -headWidth / 2 },
      ];
      head = { type: 'polygon', polygon: { points: pts } };
    }
  }

  let tail: ArrowShapeSpec['tail'];
  if (opts.tailType === 'line' && (opts.tailLength ?? 0) > 0) {
    const t = Math.max(0, opts.tailLength ?? 0);
    tail = { type: 'line', line: { x1: -t, y1: 0, x2: 0, y2: 0 } };
  } else if (opts.tailType === 'round') {
    tail = { type: 'circle', circle: { cx: 0, cy: 0, r: sw / 2 } };
  }

  return { shaft, head, tail };
};
