import { useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { fabric } from 'fabric';
import { useCanvasKeyboardShortcuts } from '../../hooks/useCanvasKeyboardShortcuts';
import { DEFAULT_ZOOM, MAX_ZOOM, MIN_ZOOM, useCanvasStore } from '../../store/canvasStore';

const GRID_SIZE = 40;
const GRID_COLOR_PRIMARY = 'rgba(203, 213, 225, 0.6)';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const isClose = (a: number, b: number, epsilon = 0.0001) => Math.abs(a - b) <= epsilon;

export const Canvas = () => {
  useCanvasKeyboardShortcuts();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const isDraggingRef = useRef(false);
  const shouldPanRef = useRef(false);

  const viewport = useCanvasStore((state) => state.viewport);
  const initialViewportRef = useRef(viewport);
  const setCanvasSize = useCanvasStore((state) => state.setCanvasSize);
  const setPan = useCanvasStore((state) => state.setPan);
  const setZoom = useCanvasStore((state) => state.setZoom);
  const gridVisible = useCanvasStore((state) => state.gridVisible);
  const activeTool = useCanvasStore((state) => state.activeTool);
  const isSpacePanning = useCanvasStore((state) => state.isSpacePanning);

  const shouldPan = activeTool === 'hand' || isSpacePanning;

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

    const initialViewport = initialViewportRef.current;
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
    fabricCanvasRef.current = canvas;

    const resizeObserver = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        const { width, height } = entry.contentRect;
        canvas.setWidth(width);
        canvas.setHeight(height);
        setCanvasSize({ width, height });
        canvas.requestRenderAll();
      });
    });

    resizeObserver.observe(containerElement);

    const handleWheel = (opt: fabric.IEvent<WheelEvent>) => {
      const event = opt.e;
      event.preventDefault();
      event.stopPropagation();

      const canvasInstance = fabricCanvasRef.current;
      if (!canvasInstance) {
        return;
      }

      const currentZoom = canvasInstance.getZoom();
      const delta = event.deltaY;
      const zoomMultiplier = Math.exp(-delta / 500);
      const targetZoom = clamp(currentZoom * zoomMultiplier, MIN_ZOOM, MAX_ZOOM);
      const pointer = canvasInstance.getPointer(event as unknown as MouseEvent);
      canvasInstance.zoomToPoint(new fabric.Point(pointer.x, pointer.y), targetZoom);

      const vpt = canvasInstance.viewportTransform;
      if (!vpt) {
        return;
      }

      setZoom(targetZoom);
      setPan(vpt[4], vpt[5]);
      canvasInstance.requestRenderAll();
    };

    const handleMouseDown = () => {
      const canvasInstance = fabricCanvasRef.current;
      if (!canvasInstance) {
        return;
      }

      if (shouldPanRef.current) {
        isDraggingRef.current = true;
        canvasInstance.setCursor('grabbing');
        canvasInstance.defaultCursor = 'grabbing';
      }
    };

    const handleMouseMove = (opt: fabric.IEvent<MouseEvent>) => {
      const canvasInstance = fabricCanvasRef.current;
      if (!canvasInstance || !isDraggingRef.current) {
        return;
      }

      const event = opt.e;
      const movement = new fabric.Point(event.movementX, event.movementY);
      canvasInstance.relativePan(movement);
      const vpt = canvasInstance.viewportTransform;
      if (!vpt) {
        return;
      }

      setPan(vpt[4], vpt[5]);
    };

    const handleMouseUp = () => {
      const canvasInstance = fabricCanvasRef.current;
      if (!canvasInstance) {
        return;
      }

      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        canvasInstance.setCursor(shouldPanRef.current ? 'grab' : 'default');
        canvasInstance.defaultCursor = shouldPanRef.current ? 'grab' : 'default';
      }
    };

    canvas.on('mouse:wheel', handleWheel);
    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:move', handleMouseMove);
    canvas.on('mouse:up', handleMouseUp);

    return () => {
      resizeObserver.disconnect();
      canvas.off('mouse:wheel', handleWheel);
      canvas.off('mouse:down', handleMouseDown);
      canvas.off('mouse:move', handleMouseMove);
      canvas.off('mouse:up', handleMouseUp);
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, [setCanvasSize, setPan, setZoom]);

  useEffect(() => {
    const canvasInstance = fabricCanvasRef.current;
    if (!canvasInstance) {
      return;
    }

    const vpt = canvasInstance.viewportTransform ?? [DEFAULT_ZOOM, 0, 0, DEFAULT_ZOOM, 0, 0];
    const [scaleX, , , scaleY, translateX, translateY] = vpt;

    const zoomMatches = isClose(scaleX, viewport.zoom) && isClose(scaleY, viewport.zoom);
    const xMatches = isClose(translateX, viewport.x, 0.5);
    const yMatches = isClose(translateY, viewport.y, 0.5);

    if (zoomMatches && xMatches && yMatches) {
      return;
    }

    canvasInstance.setViewportTransform([
      viewport.zoom,
      0,
      0,
      viewport.zoom,
      viewport.x,
      viewport.y,
    ]);
    canvasInstance.requestRenderAll();
  }, [viewport]);

  useEffect(() => {
    shouldPanRef.current = shouldPan;

    const canvasInstance = fabricCanvasRef.current;
    if (!canvasInstance) {
      return;
    }

    if (!shouldPan && !isDraggingRef.current) {
      canvasInstance.setCursor('default');
      canvasInstance.defaultCursor = 'default';
      return;
    }

    const cursorState = isDraggingRef.current ? 'grabbing' : 'grab';
    canvasInstance.setCursor(cursorState);
    canvasInstance.defaultCursor = cursorState;
  }, [shouldPan]);

  const gridStyles = useMemo(() => {
    if (!gridVisible) {
      return { display: 'none' } as CSSProperties;
    }

    const zoom = viewport.zoom;
    const scaledSize = GRID_SIZE * zoom;
    const backgroundSize = `${scaledSize}px ${scaledSize}px`;

    const offsetX = ((viewport.x % scaledSize) + scaledSize) % scaledSize;
    const offsetY = ((viewport.y % scaledSize) + scaledSize) % scaledSize;

    return {
      display: 'block',
      backgroundImage: `linear-gradient(to right, ${GRID_COLOR_PRIMARY} 1px, transparent 1px),
        linear-gradient(to bottom, ${GRID_COLOR_PRIMARY} 1px, transparent 1px)`,
      backgroundSize,
      backgroundPosition: `${offsetX}px ${offsetY}px, ${offsetX}px ${offsetY}px`,
      opacity: 0.7,
    } satisfies CSSProperties;
  }, [gridVisible, viewport]);

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-slate-200">
      <div className="pointer-events-none absolute inset-0" style={gridStyles} />
      <canvas ref={canvasElementRef} className="block h-full w-full" />
    </div>
  );
};
