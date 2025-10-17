import { useCallback, useEffect, useRef } from 'react';
import { fabric } from 'fabric';
import type { Canvas as FabricCanvasType } from 'fabric/fabric-impl';
import {
  DEFAULT_ZOOM,
  HISTORY_BATCH_VIEWPORT,
  MAX_ZOOM,
  MIN_ZOOM,
  type ViewportState,
  type ViewportUpdateOptions,
  useCanvasStore,
} from '../../store/canvasStore';
import { useHistoryStore } from '../../store/historyStore';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const isClose = (a: number, b: number, epsilon = 0.0001) => Math.abs(a - b) <= epsilon;

const getViewportFromCanvas = (canvas: FabricCanvasType): ViewportState | null => {
  const vpt = canvas.viewportTransform;
  if (!vpt) {
    return null;
  }

  const [scaleX, , , scaleY, translateX, translateY] = vpt;
  const zoom = clamp(scaleX, MIN_ZOOM, MAX_ZOOM);

  return {
    zoom,
    x: translateX,
    y: translateY,
  } satisfies ViewportState;
};

export const FabricCanvas = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);
  const fabricCanvasRef = useRef<FabricCanvasType | null>(null);
  const initialViewportRef = useRef<ViewportState | null>(null);
  const isDraggingRef = useRef(false);
  const shouldPanRef = useRef(false);
  const pendingViewportRef = useRef<{
    viewport: ViewportState;
    options?: ViewportUpdateOptions;
  } | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const panBatchActiveRef = useRef(false);

  const viewport = useCanvasStore((state) => state.viewport);
  const activeTool = useCanvasStore((state) => state.activeTool);
  const isSpacePanning = useCanvasStore((state) => state.isSpacePanning);
  const setViewport = useCanvasStore((state) => state.setViewport);
  const setCanvasSize = useCanvasStore((state) => state.setCanvasSize);
  const setFabricCanvas = useCanvasStore((state) => state.setFabricCanvas);

  if (initialViewportRef.current === null) {
    initialViewportRef.current = viewport;
  }

  const beginPanBatch = () => {
    if (panBatchActiveRef.current) {
      return;
    }
    useHistoryStore.getState().beginBatch('Pan canvas', HISTORY_BATCH_VIEWPORT);
    panBatchActiveRef.current = true;
  };

  const finalizePanBatch = () => {
    if (!panBatchActiveRef.current) {
      return;
    }
    useHistoryStore.getState().commitBatch(HISTORY_BATCH_VIEWPORT);
    panBatchActiveRef.current = false;
  };

  const scheduleViewportUpdate = useCallback(
    (nextViewport: ViewportState, options?: ViewportUpdateOptions) => {
      const current = useCanvasStore.getState().viewport;
      if (
        Math.abs(current.x - nextViewport.x) <= 0.5 &&
        Math.abs(current.y - nextViewport.y) <= 0.5 &&
        isClose(current.zoom, nextViewport.zoom)
      ) {
        return;
      }

      pendingViewportRef.current = { viewport: nextViewport, options };
      if (rafIdRef.current !== null) {
        return;
      }

      rafIdRef.current = window.requestAnimationFrame(() => {
        const pending = pendingViewportRef.current;
        if (pending) {
          setViewport(pending.viewport, pending.options);
          pendingViewportRef.current = null;
        }
        rafIdRef.current = null;
      });
    },
    [setViewport],
  );

  useEffect(() => {
    const canvasElement = canvasElementRef.current;
    const containerElement = containerRef.current;

    if (!canvasElement || !containerElement) {
      return;
    }

    const canvas = new fabric.Canvas(canvasElement, {
      selection: false,
      preserveObjectStacking: true,
      renderOnAddRemove: false,
    });

    fabricCanvasRef.current = canvas;
    setFabricCanvas(canvas);

    const initialViewport =
      initialViewportRef.current ?? ({ x: 0, y: 0, zoom: DEFAULT_ZOOM } satisfies ViewportState);
    canvas.backgroundColor = '#ffffff';
    canvas.setViewportTransform([
      initialViewport.zoom,
      0,
      0,
      initialViewport.zoom,
      initialViewport.x,
      initialViewport.y,
    ]);
    canvas.requestRenderAll();

    const resizeCanvas = (width: number, height: number) => {
      if (!Number.isFinite(width) || !Number.isFinite(height)) {
        return;
      }

      canvas.setWidth(width);
      canvas.setHeight(height);
      setCanvasSize({ width, height });
      canvas.requestRenderAll();
    };

    const rect = containerElement.getBoundingClientRect();
    resizeCanvas(rect.width, rect.height);

    const resizeObserver = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        const { width, height } = entry.contentRect;
        resizeCanvas(width, height);
      });
    });

    resizeObserver.observe(containerElement);

    const handleWheel = (opt: fabric.IEvent<WheelEvent>) => {
      const event = opt.e;
      if (!event.ctrlKey && !event.metaKey) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const currentZoom = canvas.getZoom();
      const zoomMultiplier = Math.exp(-event.deltaY / 500);
      const targetZoom = clamp(currentZoom * zoomMultiplier, MIN_ZOOM, MAX_ZOOM);

      if (isClose(targetZoom, currentZoom)) {
        return;
      }

      const pointer = canvas.getPointer(event as unknown as MouseEvent);

      canvas.zoomToPoint(new fabric.Point(pointer.x, pointer.y), targetZoom);

      const nextViewport = getViewportFromCanvas(canvas);
      if (nextViewport) {
        scheduleViewportUpdate(nextViewport, { label: 'Zoom canvas', batchKey: HISTORY_BATCH_VIEWPORT });
      }

      canvas.requestRenderAll();
    };

    const handleMouseDown = () => {
      if (!shouldPanRef.current) {
        return;
      }

      beginPanBatch();
      isDraggingRef.current = true;
      canvas.setCursor('grabbing');
      canvas.defaultCursor = 'grabbing';
    };

    const handleMouseMove = (opt: fabric.IEvent<MouseEvent>) => {
      if (!isDraggingRef.current) {
        return;
      }

      const event = opt.e;
      canvas.relativePan(new fabric.Point(event.movementX, event.movementY));

      const nextViewport = getViewportFromCanvas(canvas);
      if (nextViewport) {
        scheduleViewportUpdate(nextViewport, { label: 'Pan canvas' });
      }

      canvas.requestRenderAll();
    };

    const handleMouseUp = () => {
      if (!isDraggingRef.current) {
        finalizePanBatch();
        return;
      }

      isDraggingRef.current = false;
      const cursorState = shouldPanRef.current ? 'grab' : 'default';
      canvas.setCursor(cursorState);
      canvas.defaultCursor = cursorState;

      const nextViewport = getViewportFromCanvas(canvas);
      if (nextViewport) {
        scheduleViewportUpdate(nextViewport, { label: 'Pan canvas' });
      }

      finalizePanBatch();
      canvas.requestRenderAll();
    };

    canvas.on('mouse:wheel', handleWheel);
    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:move', handleMouseMove);
    canvas.on('mouse:up', handleMouseUp);
    canvas.on('mouse:out', handleMouseUp);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      pendingViewportRef.current = null;
      finalizePanBatch();
      useHistoryStore.getState().cancelBatch(HISTORY_BATCH_VIEWPORT);

      resizeObserver.disconnect();
      canvas.off('mouse:wheel', handleWheel as never);
      canvas.off('mouse:down', handleMouseDown as never);
      canvas.off('mouse:move', handleMouseMove as never);
      canvas.off('mouse:up', handleMouseUp as never);
      canvas.off('mouse:out', handleMouseUp as never);
      canvas.dispose();
      fabricCanvasRef.current = null;
      setFabricCanvas(null);
    };
  }, [scheduleViewportUpdate, setCanvasSize, setFabricCanvas]);

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) {
      return;
    }

    const shouldPan = activeTool === 'hand' || isSpacePanning;
    const wasDragging = isDraggingRef.current;

    shouldPanRef.current = shouldPan;

    if (wasDragging && !shouldPan) {
      isDraggingRef.current = false;
      finalizePanBatch();
      canvas.setCursor('default');
      canvas.defaultCursor = 'default';
      return;
    }

    if (wasDragging) {
      canvas.setCursor('grabbing');
      canvas.defaultCursor = 'grabbing';
      return;
    }

    const cursorState = shouldPan ? 'grab' : 'default';
    canvas.setCursor(cursorState);
    canvas.defaultCursor = cursorState;
  }, [activeTool, isSpacePanning]);

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) {
      return;
    }

    const vpt = canvas.viewportTransform ?? [DEFAULT_ZOOM, 0, 0, DEFAULT_ZOOM, 0, 0];
    const [scaleX, , , scaleY, translateX, translateY] = vpt;

    if (
      isClose(scaleX, viewport.zoom) &&
      isClose(scaleY, viewport.zoom) &&
      Math.abs(translateX - viewport.x) <= 0.5 &&
      Math.abs(translateY - viewport.y) <= 0.5
    ) {
      return;
    }

    canvas.setViewportTransform([
      viewport.zoom,
      0,
      0,
      viewport.zoom,
      viewport.x,
      viewport.y,
    ]);
    canvas.requestRenderAll();
  }, [viewport]);

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <canvas ref={canvasElementRef} className="block h-full w-full" />
    </div>
  );
};
