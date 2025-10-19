import { memo, useMemo, type CSSProperties } from 'react';
import type { ViewportState } from '../../store/canvasStore';

const GRID_SIZE = 40;
const GRID_COLOR_PRIMARY = 'rgba(203, 213, 225, 0.6)';

interface CanvasGridProps {
  visible: boolean;
  viewport: ViewportState;
}

export const CanvasGrid = memo(({ visible, viewport }: CanvasGridProps) => {
  const { x, y, zoom } = viewport;

  const style = useMemo(() => {
    if (!visible) {
      return { display: 'none' } as CSSProperties;
    }

    const scaledSize = GRID_SIZE * zoom;
    const backgroundSize = `${scaledSize}px ${scaledSize}px`;

    const offsetX = ((x % scaledSize) + scaledSize) % scaledSize;
    const offsetY = ((y % scaledSize) + scaledSize) % scaledSize;

    return {
      display: 'block',
      backgroundImage: `linear-gradient(to right, ${GRID_COLOR_PRIMARY} 1px, transparent 1px),
        linear-gradient(to bottom, ${GRID_COLOR_PRIMARY} 1px, transparent 1px)`,
      backgroundSize: `${backgroundSize}, ${backgroundSize}`,
      backgroundPosition: `${offsetX}px ${offsetY}px, ${offsetX}px ${offsetY}px`,
      opacity: 0.7,
    } satisfies CSSProperties;
  }, [visible, x, y, zoom]);

  return <div className="pointer-events-none absolute inset-0 z-10" style={style} />;
});

CanvasGrid.displayName = 'CanvasGrid';
