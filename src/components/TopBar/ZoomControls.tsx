import { useMemo } from 'react';
import { MAX_ZOOM, MIN_ZOOM, useCanvasStore } from '../../store/canvasStore';

const formatZoomLabel = (zoom: number) => `${Math.round(zoom * 100)}%`;

const buttonBaseClasses =
  'rounded border border-slate-300 bg-white px-2 py-1 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:cursor-not-allowed disabled:opacity-50';

export const ZoomControls = () => {
  const zoom = useCanvasStore((state) => state.viewport.zoom);
  const zoomIn = useCanvasStore((state) => state.zoomIn);
  const zoomOut = useCanvasStore((state) => state.zoomOut);
  const zoomToFit = useCanvasStore((state) => state.zoomToFit);
  const zoomTo100 = useCanvasStore((state) => state.zoomTo100);

  const isMinZoom = useMemo(() => zoom <= MIN_ZOOM + 0.001, [zoom]);
  const isMaxZoom = useMemo(() => zoom >= MAX_ZOOM - 0.001, [zoom]);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className={buttonBaseClasses}
        onClick={zoomOut}
        disabled={isMinZoom}
        aria-label="Zoom out"
      >
        −
      </button>
      <span className="min-w-[3.5rem] text-center text-sm font-semibold text-slate-700">
        {formatZoomLabel(zoom)}
      </span>
      <button
        type="button"
        className={buttonBaseClasses}
        onClick={zoomIn}
        disabled={isMaxZoom}
        aria-label="Zoom in"
      >
        +
      </button>
      <button type="button" className={buttonBaseClasses} onClick={() => zoomToFit()}>
        Fit
      </button>
      <button type="button" className={buttonBaseClasses} onClick={zoomTo100}>
        100%
      </button>
    </div>
  );
};
