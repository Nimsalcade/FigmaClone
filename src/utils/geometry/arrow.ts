export type ArrowTailType = 'none' | 'line' | 'round';
export type ArrowHeadType = 'triangle' | 'diamond' | 'circle';

export interface ArrowProps {
  tailType: ArrowTailType;
  headType: ArrowHeadType;
  headSize: number;
  tailLength?: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface ArrowHeadGeometry {
  type: 'polygon' | 'circle';
  points?: Point[];
  center?: Point;
  radius?: number;
}

export interface ArrowGeometry {
  shaftStart: Point;
  shaftEnd: Point;
  head: ArrowHeadGeometry;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const vec = (from: Point, to: Point) => ({ x: to.x - from.x, y: to.y - from.y });
const len = (v: Point) => Math.hypot(v.x, v.y) || 0.00001;
const norm = (v: Point) => {
  const l = len(v);
  return { x: v.x / l, y: v.y / l };
};
const scale = (v: Point, s: number) => ({ x: v.x * s, y: v.y * s });
const add = (a: Point, b: Point) => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a: Point, b: Point) => ({ x: a.x - b.x, y: a.y - b.y });
const perp = (v: Point) => ({ x: -v.y, y: v.x });

export const computeArrowGeometry = (
  start: Point,
  end: Point,
  strokeWidth: number,
  props: ArrowProps,
): ArrowGeometry => {
  const clampedHeadSize = clamp(props.headSize, 0.5, 10);
  const tailLen = Math.max(0, props.tailLength ?? 0);

  const dir = norm(vec(start, end));
  // Visual sizes scale with stroke width
  const headLength = Math.max(2, clampedHeadSize * strokeWidth * 2);
  const headWidth = Math.max(2, clampedHeadSize * strokeWidth * 1.5);

  // Extend or not at tail
  const startAdjusted = props.tailType === 'line' ? sub(start, scale(dir, tailLen)) : { ...start };

  // Shorten shaft to make room for head
  const endAdjusted = (() => {
    if (props.headType === 'circle') {
      const r = headWidth * 0.5;
      return sub(end, scale(dir, r));
    }
    // triangle and diamond use headLength
    return sub(end, scale(dir, headLength));
  })();

  // Build head geometry at tip = end
  const head: ArrowHeadGeometry = (() => {
    if (props.headType === 'circle') {
      const radius = headWidth * 0.5;
      return {
        type: 'circle',
        center: { ...end },
        radius,
      };
    }

    const baseCenter = endAdjusted; // where the head meets the shaft
    const tip = { ...end };
    const normPerp = norm(perp(dir));

    if (props.headType === 'triangle') {
      const halfW = headWidth * 0.5;
      const left = add(baseCenter, scale(normPerp, halfW));
      const right = sub(baseCenter, scale(normPerp, halfW));
      return { type: 'polygon', points: [tip, left, right] };
    }

    // diamond: add an extra back point
    const halfW = headWidth * 0.5;
    const left = add(baseCenter, scale(normPerp, halfW));
    const right = sub(baseCenter, scale(normPerp, halfW));
    const back = sub(baseCenter, scale(dir, headLength * 0.6));
    return { type: 'polygon', points: [tip, left, back, right] };
  })();

  return {
    shaftStart: startAdjusted,
    shaftEnd: endAdjusted,
    head,
  } satisfies ArrowGeometry;
};

export const computeArrowBounds = (
  start: Point,
  end: Point,
  strokeWidth: number,
  props: ArrowProps,
) => {
  const geo = computeArrowGeometry(start, end, strokeWidth, props);
  const xs: number[] = [geo.shaftStart.x, geo.shaftEnd.x];
  const ys: number[] = [geo.shaftStart.y, geo.shaftEnd.y];

  // include head geometry extents
  if (geo.head.type === 'polygon' && geo.head.points) {
    geo.head.points.forEach((p) => {
      xs.push(p.x);
      ys.push(p.y);
    });
  } else if (geo.head.type === 'circle' && geo.head.center && geo.head.radius !== undefined) {
    xs.push(geo.head.center.x - geo.head.radius, geo.head.center.x + geo.head.radius);
    ys.push(geo.head.center.y - geo.head.radius, geo.head.center.y + geo.head.radius);
  }

  const minX = Math.min(...xs) - strokeWidth * 0.5;
  const maxX = Math.max(...xs) + strokeWidth * 0.5;
  const minY = Math.min(...ys) - strokeWidth * 0.5;
  const maxY = Math.max(...ys) + strokeWidth * 0.5;

  return { left: minX, top: minY, width: maxX - minX, height: maxY - minY };
};
