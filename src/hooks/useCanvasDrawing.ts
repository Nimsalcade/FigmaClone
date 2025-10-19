// src/hooks/useCanvasDrawing.ts
import { useCallback, useRef } from 'react';
import { fabric } from 'fabric';
import useEditorStore, { ToolType } from '../store/editorStore';
import { getTrianglePoints, resolveEquilateralSize } from '../utils/geometry/triangle';
import { getStarPoints } from '../utils/geometry/star';

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
    createText,
    createTriangle,
    createStar,
  } = useEditorStore();
  
  const drawingState = useRef<DrawingState>({
    isDrawing: false,
    startPoint: null,
    currentObject: null,
  });

  const handleMouseDown = useCallback((e: fabric.IEvent<MouseEvent>) => {
    console.log('Mouse down event, activeTool:', activeTool);
    const canvas = fabricCanvas.current;
    if (!canvas || activeTool === 'select' || activeTool === 'hand') return;

    const pointer = canvas.getPointer(e.e);
    const isShiftPressed = e.e.shiftKey;

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

      case 'text':
        // For text, we create immediately and don't need preview
        const textId = createText(pointer.x, pointer.y, 'Click to edit');
        canvas.renderAll();
        return;
    }

    if (previewObject) {
      drawingState.current.currentObject = previewObject;
      canvas.add(previewObject);
      canvas.renderAll();
    }
  }, [fabricCanvas, activeTool, createRectangle, createEllipse, createLine, createText, createTriangle, createStar]);

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
      } else if (activeTool === 'line') {
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
      } else if (activeTool === 'line') {
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
      const finalX = width >= 0 ? startPoint.x : startPoint.x + width;
      const finalY = height >= 0 ? startPoint.y : startPoint.y + height;
      const finalWidth = Math.abs(width);
      const finalHeight = Math.abs(height);

      // Create actual object
      switch (activeTool) {
        case 'rectangle':
          createRectangle(finalX, finalY, finalWidth, finalHeight);
          break;
        case 'ellipse':
          createEllipse(finalX, finalY, finalWidth, finalHeight);
          break;
        case 'line':
          createLine(startPoint.x, startPoint.y, startPoint.x + width, startPoint.y + height);
          break;
        case 'triangle': {
          const mode = isShiftPressed ? 'equilateral' : 'isosceles';
          let triWidth = finalWidth;
          let triHeight = finalHeight;
          if (mode === 'equilateral') {
            const { base, height: h } = resolveEquilateralSize(finalWidth, finalHeight);
            // Center the equilateral triangle within the drag rectangle
            const dx = (finalWidth - base) / 2;
            const dy = (finalHeight - h) / 2;
            triWidth = base;
            triHeight = h;
            createTriangle(finalX + dx, finalY + dy, triWidth, triHeight, { mode, base: triWidth, height: triHeight });
          } else {
            createTriangle(finalX, finalY, triWidth, triHeight, { mode, base: triWidth, height: triHeight });
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
      }
    }

    // Reset drawing state
    drawingState.current = {
      isDrawing: false,
      startPoint: null,
      currentObject: null,
    };

    canvas.renderAll();
  }, [fabricCanvas, activeTool, createRectangle, createEllipse, createLine, createTriangle, createStar]);

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  };
};
