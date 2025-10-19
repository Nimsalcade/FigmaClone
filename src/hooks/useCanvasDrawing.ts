// src/hooks/useCanvasDrawing.ts
import { useCallback, useRef } from 'react';
import { fabric } from 'fabric';
import useEditorStore from '../store/editorStore';
import { getTrianglePoints, resolveEquilateralSize } from '../utils/geometry/triangle';
import { getStarPoints } from '../utils/geometry/star';
import { getRegularPolygonPoints } from '../utils/geometry/polygon';
import { computeArrowShapeSpec, DEFAULT_ARROW_OPTIONS } from '../utils/geometry/arrow';

interface DrawingState {
  isDrawing: boolean;
  startPoint: { x: number; y: number } | null;
  currentObject: fabric.Object | null;
}

export const useCanvasDrawing = (fabricCanvas: React.RefObject<fabric.Canvas>) => {
  const { 
    activeTool, 
    createRectangle, 
    createEllipse, 
    createLine, 
    createArrow,
    createText,
    createTriangle,
    createStar,
    createPolygon,
  } = useEditorStore();
  
  const drawingState = useRef<DrawingState>({
    isDrawing: false,
    startPoint: null,
    currentObject: null,
  });

  const handleMouseDown = useCallback((e: fabric.IEvent<MouseEvent>) => {
    const canvas = fabricCanvas.current;
    if (!canvas || activeTool === 'select' || activeTool === 'hand') return;

    const pointer = canvas.getPointer(e.e);

    drawingState.current.isDrawing = true;
    drawingState.current.startPoint = { x: pointer.x, y: pointer.y };

    // Create preview object based on tool
    let previewObject: fabric.Object | null = null;

    switch (activeTool) {
      case 'rectangle':
        previewObject = new fabric.Rect({
          left: pointer.x,
          top: pointer.y,
          width: 0,
          height: 0,
          fill: 'rgba(59, 130, 246, 0.3)',
          stroke: '#1d4ed8',
          strokeWidth: 1,
          selectable: false,
          evented: false,
        });
        break;

      case 'ellipse':
        previewObject = new fabric.Ellipse({
          left: pointer.x,
          top: pointer.y,
          rx: 0,
          ry: 0,
          fill: 'rgba(16, 185, 129, 0.3)',
          stroke: '#047857',
          strokeWidth: 1,
          selectable: false,
          evented: false,
        });
        break;

      case 'line':
        previewObject = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
          stroke: '#6b7280',
          strokeWidth: 2,
          selectable: false,
          evented: false,
        });
        break;

      case 'arrow': {
        const group = new fabric.Group([], { left: pointer.x, top: pointer.y, angle: 0, selectable: false, evented: false });
        // Initialize with a minimal shaft
        const spec = computeArrowShapeSpec(1, 2, DEFAULT_ARROW_OPTIONS);
        const shaft = new fabric.Line([spec.shaft.x1, spec.shaft.y1, spec.shaft.x2, spec.shaft.y2], {
          stroke: '#6b7280',
          strokeWidth: 2,
          selectable: false,
          evented: false,
        });
        (shaft as any).set('data', { role: 'shaft' });
        group.addWithUpdate ? (group as any).addWithUpdate(shaft) : group.add(shaft);
        previewObject = group as unknown as fabric.Object;
        break;
      }

      case 'triangle': {
        const poly = new fabric.Polygon([
          { x: 0, y: 0 },
          { x: 0, y: 0 },
          { x: 0, y: 0 },
        ] as any, {
          left: pointer.x,
          top: pointer.y,
          fill: 'rgba(245, 158, 11, 0.3)',
          stroke: '#b45309',
          strokeWidth: 1,
          selectable: false,
          evented: false,
        });
        previewObject = poly as unknown as fabric.Object;
        break;
      }

      case 'star': {
        const minR = 1;
        const pts = getStarPoints({ points: 5, innerRadius: 0.5 * minR, outerRadius: minR, rotation: -Math.PI / 2 });
        const poly = new fabric.Polygon(pts as any, {
          left: pointer.x - minR,
          top: pointer.y - minR,
          fill: 'rgba(253, 224, 71, 0.3)',
          stroke: '#ca8a04',
          strokeWidth: 1,
          selectable: false,
          evented: false,
        });
        previewObject = poly as unknown as fabric.Object;
        break;
      }

      case 'polygon': {
        const minR = 1;
        const pts = getRegularPolygonPoints({ sides: 6, radius: minR, rotation: -Math.PI / 2 });
        const poly = new fabric.Polygon(pts as any, {
          left: pointer.x - minR,
          top: pointer.y - minR,
          fill: 'rgba(56, 189, 248, 0.3)',
          stroke: '#0284c7',
          strokeWidth: 1,
          selectable: false,
          evented: false,
        });
        previewObject = poly as unknown as fabric.Object;
        break;
      }

      case 'text':
        // For text, we create immediately and don't need preview
        createText(pointer.x, pointer.y, 'Click to edit');
        canvas.renderAll();
        return;
    }

    if (previewObject) {
      drawingState.current.currentObject = previewObject;
      canvas.add(previewObject);
      canvas.renderAll();
    }
  }, [fabricCanvas, activeTool, createRectangle, createEllipse, createLine, createArrow, createText, createTriangle, createStar, createPolygon]);

  const handleMouseMove = useCallback((e: fabric.IEvent<MouseEvent>) => {
    const canvas = fabricCanvas.current;
    if (!canvas || !drawingState.current.isDrawing || !drawingState.current.startPoint || !drawingState.current.currentObject) {
      return;
    }

    const pointer = canvas.getPointer(e.e);
    const isShiftPressed = e.e.shiftKey;
    const startPoint = drawingState.current.startPoint;
    const currentObject = drawingState.current.currentObject;

    let width = pointer.x - startPoint.x;
    let height = pointer.y - startPoint.y;

    // Handle shift constraints for perfect shapes
    if (isShiftPressed) {
      if (activeTool === 'rectangle' || activeTool === 'ellipse') {
        // Perfect square/circle
        const size = Math.max(Math.abs(width), Math.abs(height));
        width = width >= 0 ? size : -size;
        height = height >= 0 ? size : -size;
      } else if (activeTool === 'line' || activeTool === 'arrow') {
        // Snap to 45-degree angles
        const angle = Math.atan2(height, width);
        const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
        const distance = Math.sqrt(width * width + height * height);
        width = distance * Math.cos(snapAngle);
        height = distance * Math.sin(snapAngle);
      }
    }

    // Update preview object
    switch (activeTool) {
      case 'rectangle':
        currentObject.set({
          left: width >= 0 ? startPoint.x : startPoint.x + width,
          top: height >= 0 ? startPoint.y : startPoint.y + height,
          width: Math.abs(width),
          height: Math.abs(height),
        });
        break;

      case 'ellipse':
        (currentObject as fabric.Ellipse).set({
          left: width >= 0 ? startPoint.x : startPoint.x + width,
          top: height >= 0 ? startPoint.y : startPoint.y + height,
          rx: Math.abs(width) / 2,
          ry: Math.abs(height) / 2,
        });
        break;

      case 'line':
        (currentObject as fabric.Line).set({
          x2: startPoint.x + width,
          y2: startPoint.y + height,
        });
        break;

      case 'arrow': {
        const group: any = currentObject as any;
        const dx = width;
        const dy = height;
        const length = Math.max(1, Math.hypot(dx, dy));
        const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

        group.set({ left: startPoint.x, top: startPoint.y, angle: angleDeg });

        // Rebuild parts
        const spec = computeArrowShapeSpec(length, 2, DEFAULT_ARROW_OPTIONS);
        const existing: any[] = (group._objects || []).slice();
        if (existing && existing.length) {
          existing.forEach((child: any) => {
            try {
              group.removeWithUpdate ? group.removeWithUpdate(child) : group.remove(child);
            } catch {
              // ignore
            }
          });
        }

        const shaft = new fabric.Line([spec.shaft.x1, spec.shaft.y1, spec.shaft.x2, spec.shaft.y2], {
          stroke: '#6b7280',
          strokeWidth: 2,
          selectable: false,
          evented: false,
        });
        (shaft as any).set('data', { role: 'shaft' });
        group.addWithUpdate ? group.addWithUpdate(shaft) : group.add(shaft);

        if (spec.head.type === 'polygon' && spec.head.polygon) {
          const head = new fabric.Polygon(spec.head.polygon.points as any, {
            fill: '#6b7280',
            stroke: 'transparent',
            selectable: false,
            evented: false,
          });
          (head as any).set('data', { role: 'head' });
          group.addWithUpdate ? group.addWithUpdate(head) : group.add(head);
        } else if (spec.head.type === 'circle' && spec.head.circle) {
          const head = new fabric.Circle({
            left: spec.head.circle.cx - spec.head.circle.r,
            top: spec.head.circle.cy - spec.head.circle.r,
            radius: spec.head.circle.r,
            fill: '#6b7280',
            selectable: false,
            evented: false,
            originX: 'left',
            originY: 'top',
          });
          (head as any).set('data', { role: 'head' });
          group.addWithUpdate ? group.addWithUpdate(head) : group.add(head);
        }
        break;
      }

      case 'triangle': {
        const left = width >= 0 ? startPoint.x : startPoint.x + width;
        const top = height >= 0 ? startPoint.y : startPoint.y + height;
        const w = Math.abs(width);
        const h = Math.abs(height);
        const orientation = height >= 0 ? 'down' : 'up';
        const mode = isShiftPressed ? 'equilateral' : 'isosceles';
        const points = getTrianglePoints({ width: w, height: h, mode, orientation });
        (currentObject as fabric.Polygon).set({ left, top } as any);
        (currentObject as any).set({ points });
        (currentObject as any).setCoords();
        break;
      }
      
      case 'star': {
        const centerX = startPoint.x;
        const centerY = startPoint.y;
        const dx = pointer.x - centerX;
        const dy = pointer.y - centerY;
        const outerR = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        let rotation = Math.atan2(dy, dx);
        if (isShiftPressed) {
          const snap = (Math.PI / 180) * 15; // 15 degrees
          rotation = Math.round(rotation / snap) * snap;
        }
        const innerR = outerR * 0.5;
        const left = centerX - outerR;
        const top = centerY - outerR;
        const pts = getStarPoints({ points: 5, innerRadius: innerR, outerRadius: outerR, rotation });
        (currentObject as fabric.Polygon).set({ left, top } as any);
        (currentObject as any).set({ points: pts });
        (currentObject as any).setCoords();
        break;
      }
      case 'polygon': {
        const centerX = startPoint.x;
        const centerY = startPoint.y;
        const dx = pointer.x - centerX;
        const dy = pointer.y - centerY;
        const radius = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        let rotation = Math.atan2(dy, dx);
        if (isShiftPressed) {
          const snap = (Math.PI / 180) * 15; // 15 degrees
          rotation = Math.round(rotation / snap) * snap;
        }
        const left = centerX - radius;
        const top = centerY - radius;
        const pts = getRegularPolygonPoints({ sides: 6, radius, rotation });
        (currentObject as fabric.Polygon).set({ left, top } as any);
        (currentObject as any).set({ points: pts });
        (currentObject as any).setCoords();
        break;
      }
    }

    canvas.renderAll();
  }, [fabricCanvas, activeTool]);

  const handleMouseUp = useCallback((e: fabric.IEvent<MouseEvent>) => {
    const canvas = fabricCanvas.current;
    if (!canvas || !drawingState.current.isDrawing || !drawingState.current.startPoint) {
      return;
    }

    const pointer = canvas.getPointer(e.e);
    const startPoint = drawingState.current.startPoint;
    const currentObject = drawingState.current.currentObject;

    // Remove preview object
    if (currentObject) {
      canvas.remove(currentObject);
    }

    // Calculate final dimensions
    let width = pointer.x - startPoint.x;
    let height = pointer.y - startPoint.y;
    const isShiftPressed = e.e.shiftKey;

    // Apply shift constraints
    if (isShiftPressed) {
      if (activeTool === 'rectangle' || activeTool === 'ellipse') {
        const size = Math.max(Math.abs(width), Math.abs(height));
        width = width >= 0 ? size : -size;
        height = height >= 0 ? size : -size;
      } else if (activeTool === 'line' || activeTool === 'arrow') {
        const angle = Math.atan2(height, width);
        const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
        const distance = Math.sqrt(width * width + height * height);
        width = distance * Math.cos(snapAngle);
        height = distance * Math.sin(snapAngle);
      }
    }

    // Only create if there's meaningful size
    const minSize = 5;
    if (Math.abs(width) > minSize || Math.abs(height) > minSize) {
      const finalX = startPoint.x;
      const finalY = startPoint.y;

      // Create actual object
      switch (activeTool) {
        case 'rectangle':
          createRectangle(
            width >= 0 ? finalX : finalX + width,
            height >= 0 ? finalY : finalY + height,
            Math.abs(width),
            Math.abs(height),
          );
          break;
        case 'ellipse':
          createEllipse(
            width >= 0 ? finalX : finalX + width,
            height >= 0 ? finalY : finalY + height,
            Math.abs(width),
            Math.abs(height),
          );
          break;
        case 'line':
          createLine(startPoint.x, startPoint.y, startPoint.x + width, startPoint.y + height);
          break;
        case 'arrow':
          createArrow(startPoint.x, startPoint.y, startPoint.x + width, startPoint.y + height, DEFAULT_ARROW_OPTIONS);
          break;
        case 'triangle': {
          const mode = isShiftPressed ? 'equilateral' : 'isosceles';
          let triWidth = Math.abs(width);
          let triHeight = Math.abs(height);
          const left = width >= 0 ? startPoint.x : startPoint.x + width;
          const top = height >= 0 ? startPoint.y : startPoint.y + height;
          if (mode === 'equilateral') {
            const { base, height: h } = resolveEquilateralSize(triWidth, triHeight);
            const dx = (triWidth - base) / 2;
            const dy = (triHeight - h) / 2;
            triWidth = base;
            triHeight = h;
            createTriangle(left + dx, top + dy, triWidth, triHeight, { mode, base: triWidth, height: triHeight });
          } else {
            createTriangle(left, top, triWidth, triHeight, { mode, base: triWidth, height: triHeight });
          }
          break;
        }
        case 'star': {
          const centerX = drawingState.current.startPoint.x;
          const centerY = drawingState.current.startPoint.y;
          const dx = pointer.x - centerX;
          const dy = pointer.y - centerY;
          const outerR = Math.max(1, Math.sqrt(dx * dx + dy * dy));
          let rotation = Math.atan2(dy, dx);
          if (isShiftPressed) {
            const snap = (Math.PI / 180) * 15;
            rotation = Math.round(rotation / snap) * snap;
          }
          const innerR = outerR * 0.5;
          const left = centerX - outerR;
          const top = centerY - outerR;
          createStar(left, top, outerR, innerR, 5, rotation, false);
          break;
        }
        case 'polygon': {
          const centerX = drawingState.current.startPoint.x;
          const centerY = drawingState.current.startPoint.y;
          const dx = pointer.x - centerX;
          const dy = pointer.y - centerY;
          const radius = Math.max(1, Math.sqrt(dx * dx + dy * dy));
          let rotation = Math.atan2(dy, dx);
          if (isShiftPressed) {
            const snap = (Math.PI / 180) * 15;
            rotation = Math.round(rotation / snap) * snap;
          }
          const left = centerX - radius;
          const top = centerY - radius;
          createPolygon(left, top, radius, 6, rotation);
          break;
        }
      }
    }

    // Reset drawing state
    drawingState.current = {
      isDrawing: false,
      startPoint: null,
      currentObject: null,
    };

    canvas.renderAll();
  }, [fabricCanvas, activeTool, createRectangle, createEllipse, createLine, createArrow, createTriangle, createStar, createPolygon]);

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  };
};
