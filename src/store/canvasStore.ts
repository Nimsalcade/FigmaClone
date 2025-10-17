import { create } from 'zustand';

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 4;
export const DEFAULT_ZOOM = 1;
const ZOOM_IN_FACTOR = 1.1;
const ZOOM_OUT_FACTOR = 1 / ZOOM_IN_FACTOR;

export type Tool = 'select' | 'hand';

export interface ViewportState {
  x: number;
  y: number;
  zoom: number;
}

interface CanvasSize {
  width: number;
  height: number;
}

export interface ZoomToFitBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface CanvasState {
  viewport: ViewportState;
  canvasSize: CanvasSize;
  gridVisible: boolean;
  activeTool: Tool;
  isSpacePanning: boolean;
  setViewport: (viewport: ViewportState) => void;
  setPan: (x: number, y: number) => void;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomTo: (zoom: number) => void;
  zoomToFit: (bounds?: ZoomToFitBounds | null) => void;
  zoomTo100: () => void;
  setCanvasSize: (size: CanvasSize) => void;
  setGridVisible: (visible: boolean) => void;
  toggleGrid: () => void;
  setActiveTool: (tool: Tool) => void;
  setSpacePanning: (active: boolean) => void;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const DEFAULT_VIEWPORT: ViewportState = {
  x: 0,
  y: 0,
  zoom: DEFAULT_ZOOM,
};

export const useCanvasStore = create<CanvasState>()((set, get) => {
  const updateZoomAroundCenter = (targetZoom: number) => {
    const { viewport, canvasSize } = get();
    const nextZoom = clamp(targetZoom, MIN_ZOOM, MAX_ZOOM);

    if (canvasSize.width === 0 || canvasSize.height === 0) {
      set({ viewport: { ...viewport, zoom: nextZoom } });
      return;
    }

    const centerWorldX = (canvasSize.width / 2 - viewport.x) / viewport.zoom;
    const centerWorldY = (canvasSize.height / 2 - viewport.y) / viewport.zoom;
    const nextX = canvasSize.width / 2 - centerWorldX * nextZoom;
    const nextY = canvasSize.height / 2 - centerWorldY * nextZoom;

    set({ viewport: { x: nextX, y: nextY, zoom: nextZoom } });
  };

  return {
    viewport: DEFAULT_VIEWPORT,
    canvasSize: { width: 0, height: 0 },
    gridVisible: true,
    activeTool: 'select',
    isSpacePanning: false,
    setViewport: (viewport) =>
      set({
        viewport: {
          x: viewport.x,
          y: viewport.y,
          zoom: clamp(viewport.zoom, MIN_ZOOM, MAX_ZOOM),
        },
      }),
    setPan: (x, y) =>
      set((state) => ({
        viewport: {
          ...state.viewport,
          x,
          y,
        },
      })),
    setZoom: (zoom) =>
      set((state) => ({
        viewport: {
          ...state.viewport,
          zoom: clamp(zoom, MIN_ZOOM, MAX_ZOOM),
        },
      })),
    zoomIn: () => {
      const { viewport } = get();
      updateZoomAroundCenter(viewport.zoom * ZOOM_IN_FACTOR);
    },
    zoomOut: () => {
      const { viewport } = get();
      updateZoomAroundCenter(viewport.zoom * ZOOM_OUT_FACTOR);
    },
    zoomTo: (zoom) => {
      updateZoomAroundCenter(zoom);
    },
    zoomToFit: (bounds) => {
      const { canvasSize } = get();

      if (canvasSize.width === 0 || canvasSize.height === 0) {
        updateZoomAroundCenter(DEFAULT_ZOOM);
        return;
      }

      if (!bounds || bounds.width === 0 || bounds.height === 0) {
        const nextZoom = DEFAULT_ZOOM;
        const x = canvasSize.width / 2;
        const y = canvasSize.height / 2;
        set({ viewport: { x, y, zoom: nextZoom } });
        return;
      }

      const padding = 64;
      const paddedWidth = bounds.width + padding * 2;
      const paddedHeight = bounds.height + padding * 2;

      const zoomX = canvasSize.width / paddedWidth;
      const zoomY = canvasSize.height / paddedHeight;
      const targetZoom = clamp(Math.min(zoomX, zoomY), MIN_ZOOM, MAX_ZOOM);

      const centerX = bounds.left + bounds.width / 2;
      const centerY = bounds.top + bounds.height / 2;

      const x = canvasSize.width / 2 - centerX * targetZoom;
      const y = canvasSize.height / 2 - centerY * targetZoom;

      set({ viewport: { x, y, zoom: targetZoom } });
    },
    zoomTo100: () => {
      updateZoomAroundCenter(DEFAULT_ZOOM);
    },
    setCanvasSize: (size) =>
      set((state) => {
        const partial: Partial<CanvasState> = { canvasSize: size };
        const bothZero = state.canvasSize.width === 0 && state.canvasSize.height === 0;
        const hasSize = size.width > 0 && size.height > 0;
        const viewportUntouched = state.viewport.x === 0 && state.viewport.y === 0;

        if (bothZero && hasSize && viewportUntouched) {
          partial.viewport = {
            ...state.viewport,
            x: size.width / 2,
            y: size.height / 2,
          };
        }

        return partial;
      }),
    setGridVisible: (visible) => set({ gridVisible: visible }),
    toggleGrid: () => set((state) => ({ gridVisible: !state.gridVisible })),
    setActiveTool: (tool) => set({ activeTool: tool }),
    setSpacePanning: (active) => set({ isSpacePanning: active }),
  };
});
