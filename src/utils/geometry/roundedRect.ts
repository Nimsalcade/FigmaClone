export interface CornerRadii {
  tl: number;
  tr: number;
  br: number;
  bl: number;
}

export interface RoundedRectProps {
  radius: number; // global default radius in px
  radii?: Partial<CornerRadii>; // per-corner override
}

const KAPPA = 0.5522847498307936; // 4 * (sqrt(2) - 1) / 3

const clamp = (v: number, min = 0, max = Infinity) => Math.min(max, Math.max(min, v));

export const normalizeRadii = (
  width: number,
  height: number,
  props: RoundedRectProps,
): CornerRadii => {
  const maxR = Math.max(0, Math.min(width, height) / 2);
  const base = clamp(props.radius ?? 0, 0, maxR);
  let tl = clamp(props.radii?.tl ?? base, 0, maxR);
  let tr = clamp(props.radii?.tr ?? base, 0, maxR);
  let br = clamp(props.radii?.br ?? base, 0, maxR);
  let bl = clamp(props.radii?.bl ?? base, 0, maxR);

  // Ensure sums don't exceed side lengths by proportionally scaling pairs
  const scalePair = (a: number, b: number, limit: number) => {
    const sum = a + b;
    if (sum <= limit || sum === 0) return { a, b };
    const s = limit / sum;
    return { a: a * s, b: b * s };
  };

  // First pass horizontal edges
  ({ a: tl, b: tr } = scalePair(tl, tr, width));
  ({ a: bl, b: br } = scalePair(bl, br, width));
  // First pass vertical edges
  ({ a: tl, b: bl } = scalePair(tl, bl, height));
  ({ a: tr, b: br } = scalePair(tr, br, height));

  // Compute per-corner scale from both adjacent sides to ensure no overflow
  const topScale = Math.min(1, width / Math.max(1e-9, tl + tr));
  const bottomScale = Math.min(1, width / Math.max(1e-9, bl + br));
  const leftScale = Math.min(1, height / Math.max(1e-9, tl + bl));
  const rightScale = Math.min(1, height / Math.max(1e-9, tr + br));

  const tlScale = Math.min(topScale, leftScale);
  const trScale = Math.min(topScale, rightScale);
  const blScale = Math.min(bottomScale, leftScale);
  const brScale = Math.min(bottomScale, rightScale);

  tl = clamp(tl * tlScale, 0, maxR);
  tr = clamp(tr * trScale, 0, maxR);
  br = clamp(br * brScale, 0, maxR);
  bl = clamp(bl * blScale, 0, maxR);

  return { tl, tr, br, bl };
};

export const buildRoundedRectPath = (
  width: number,
  height: number,
  radii: CornerRadii,
): string => {
  const w = Math.max(0, width);
  const h = Math.max(0, height);
  const tl = clamp(radii.tl, 0, Math.min(w, h) / 2);
  const tr = clamp(radii.tr, 0, Math.min(w, h) / 2);
  const br = clamp(radii.br, 0, Math.min(w, h) / 2);
  const bl = clamp(radii.bl, 0, Math.min(w, h) / 2);

  const kTL = tl * KAPPA;
  const kTR = tr * KAPPA;
  const kBR = br * KAPPA;
  const kBL = bl * KAPPA;

  // Path relative to (0,0) at top-left
  const parts = [
    `M ${tl} 0`,
    `L ${w - tr} 0`,
    // Top-right corner
    `C ${w - tr + kTR} 0 ${w} ${tr - kTR} ${w} ${tr}`,
    `L ${w} ${h - br}`,
    // Bottom-right corner
    `C ${w} ${h - br + kBR} ${w - br + kBR} ${h} ${w - br} ${h}`,
    `L ${bl} ${h}`,
    // Bottom-left corner
    `C ${bl - kBL} ${h} 0 ${h - bl + kBL} 0 ${h - bl}`,
    `L 0 ${tl}`,
    // Top-left corner
    `C 0 ${tl - kTL} ${tl - kTL} 0 ${tl} 0`,
    'Z',
  ];

  return parts.join(' ');
};

export const scaleCornerRadii = (r: CornerRadii, scale: number): CornerRadii => ({
  tl: r.tl * scale,
  tr: r.tr * scale,
  br: r.br * scale,
  bl: r.bl * scale,
});

export const propsFromCornerRadii = (radius: number, radii: CornerRadii): RoundedRectProps => ({
  radius,
  radii,
});
