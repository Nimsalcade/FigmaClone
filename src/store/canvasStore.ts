import { create } from 'zustand';
import type { Canvas as FabricCanvas } from 'fabric/fabric-impl';
import { registerHistorySlice, useHistoryStore } from './historyStore';

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 4;
export const DEFAULT_ZOOM = 1;
const ZOOM_IN_FACTOR = 1.1;
const ZOOM_OUT_FACTOR = 1 / ZOOM_IN_FACTOR;

export const HISTORY_BATCH_VIEWPORT = 'canvas:viewport';
const HISTORY_BATCH_GRID = 'canvas:grid';

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

export interface ViewportUpdateOptions {
  label?: string;
  batchKey?: string | null;
  skipHistory?: boolean;
}

export interface CanvasHistorySnapshot {
  viewport: ViewportState;
  gridVisible: boolean;
}

interface CanvasState {
  viewport: ViewportState;
  canvasSize: CanvasSize;
  gridVisible: boolean;
  activeTool: Tool;
  isSpacePanning: boolean;
  fabricCanvas: FabricCanvas | null;
  setViewport: (viewport: ViewportState, options?: ViewportUpdateOptions) => void;
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
  setFabricCanvas: (canvas: FabricCanvas | null) => void;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const numbersClose = (a: number, b: number, epsilon = 0.0001) => Math.abs(a - b) <= epsilon;
const viewportClose = (a: ViewportState, b: ViewportState) =>
  Math.abs(a.x - b.x) <= 0.5 && Math.abs(a.y - b.y) <= 0.5 && numbersClose(a.zoom, b.zoom);

const cloneViewport = (viewport: ViewportState): ViewportState => ({
  x: viewport.x,
  y: viewport.y,
  zoom: viewport.zoom,
});

const prepareHistory = () => {
  const history = useHistoryStore.getState();
  if (!history.initialized) {
    history.initialize('Initial canvas state');
  }
  return history;
};

const DEFAULT_VIEWPORT: ViewportState = {
  x: 0,
  y: 0,
  zoom: DEFAULT_ZOOM,
};

export const useCanvasStore = create<CanvasState>()((set, get) => {
  const applyViewport = (
    nextViewport: ViewportState,
    label: string,
    options?: { batchKey?: string | null; skipHistory?: boolean },
  ) => {
    const currentViewport = get().viewport;
    if (viewportClose(currentViewport, nextViewport)) {
      return false;
    }

    const shouldRecord = !options?.skipHistory;
    const history = shouldRecord ? prepareHistory() : null;

    set({ viewport: nextViewport });

    if (!history) {
      return true;
    }

    const resolvedBatchKey =
      options?.batchKey === undefined ? HISTORY_BATCH_VIEWPORT : options.batchKey;

    history.record(label, {
      batchKey: resolvedBatchKey ?? undefined,
    });
    return true;
  };

  const updateZoomAroundCenter = (targetZoom: number, label: string, batchKey: string | null = null) => {
    const { viewport, canvasSize } = get();
    const nextZoom = clamp(targetZoom, MIN_ZOOM, MAX_ZOOM);

    if (canvasSize.width === 0 || canvasSize.height === 0) {
      applyViewport({ ...viewport, zoom: nextZoom }, label, { batchKey });
      return;
    }

    const centerWorldX = (canvasSize.width / 2 - viewport.x) / viewport.zoom;
    const centerWorldY = (canvasSize.height / 2 - viewport.y) / viewport.zoom;
    const nextX = canvasSize.width / 2 - centerWorldX * nextZoom;
    const nextY = canvasSize.height / 2 - centerWorldY * nextZoom;

    applyViewport({ x: nextX, y: nextY, zoom: nextZoom }, label, { batchKey });
  };

  return {
    viewport: DEFAULT_VIEWPORT,
    canvasSize: { width: 0, height: 0 },
    gridVisible: true,
    activeTool: 'select',
    isSpacePanning: false,
    fabricCanvas: null,
    setViewport: (viewport, options) => {
      const nextViewport = {
        x: viewport.x,
        y: viewport.y,
        zoom: clamp(viewport.zoom, MIN_ZOOM, MAX_ZOOM),
      } satisfies ViewportState;

      applyViewport(nextViewport, options?.label ?? 'Adjust viewport', {
        batchKey: options?.batchKey,
        skipHistory: options?.skipHistory,
      });
    },
    setPan: (x, y) => {
      const current = get().viewport;
      applyViewport({ x, y, zoom: current.zoom }, 'Pan canvas');
    },
    setZoom: (zoom) => {
      const current = get().viewport;
      applyViewport(
        { ...current, zoom: clamp(zoom, MIN_ZOOM, MAX_ZOOM) },
        'Adjust zoom',
      );
    },
    zoomIn: () => {
      const { viewport } = get();
      updateZoomAroundCenter(viewport.zoom * ZOOM_IN_FACTOR, 'Zoom in', null);
    },
    zoomOut: () => {
      const { viewport } = get();
      updateZoomAroundCenter(viewport.zoom * ZOOM_OUT_FACTOR, 'Zoom out', null);
    },
    zoomTo: (zoom) => {
      updateZoomAroundCenter(zoom, 'Set zoom');
    },
    zoomToFit: (bounds) => {
      const { canvasSize } = get();

      if (canvasSize.width === 0 || canvasSize.height === 0) {
        updateZoomAroundCenter(DEFAULT_ZOOM, 'Zoom to fit', null);
        return;
      }

      if (!bounds || bounds.width === 0 || bounds.height === 0) {
        const x = canvasSize.width / 2;
        const y = canvasSize.height / 2;
        applyViewport({ x, y, zoom: DEFAULT_ZOOM }, 'Zoom to fit', { batchKey: null });
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

      applyViewport({ x, y, zoom: targetZoom }, 'Zoom to fit', { batchKey: null });
    },
    zoomTo100: () => {
      updateZoomAroundCenter(DEFAULT_ZOOM, 'Reset zoom', null);
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
          } satisfies ViewportState;
        }

        return partial;
      }),
    setGridVisible: (visible) => {
      const current = get().gridVisible;
      if (current === visible) {
        return;
      }
      const history = prepareHistory();
      set({ gridVisible: visible });
      history.record(visible ? 'Show grid' : 'Hide grid', {
        batchKey: HISTORY_BATCH_GRID,
      });
    },
    toggleGrid: () => {
      const nextVisible = !get().gridVisible;
      get().setGridVisible(nextVisible);
    },
    setActiveTool: (tool) => set({ activeTool: tool }),
    setSpacePanning: (active) => set({ isSpacePanning: active }),
    setFabricCanvas: (canvas) => set({ fabricCanvas: canvas }),
  };
});

registerHistorySlice<CanvasHistorySnapshot>('canvas', {
  capture: () => {
    const state = useCanvasStore.getState();
    return {
      viewport: cloneViewport(state.viewport),
      gridVisible: state.gridVisible,
    } satisfies CanvasHistorySnapshot;
  },
  apply: (snapshot) => {
    useCanvasStore.setState((state) => ({
      ...state,
      viewport: {
        x: snapshot.viewport.x,
        y: snapshot.viewport.y,
        zoom: clamp(snapshot.viewport.zoom, MIN_ZOOM, MAX_ZOOM),
      },
      gridVisible: snapshot.gridVisible,
    }));

    const fabricCanvas = useCanvasStore.getState().fabricCanvas;
    if (fabricCanvas) {
      fabricCanvas.requestRenderAll();
    }
  },
  equals: (first, second) => {
    if (!first || !second) {
      return false;
    }

    if (first.gridVisible !== second.gridVisible) {
      return false;
    }

    return viewportClose(first.viewport, second.viewport);
  },
});
