// src/hooks/useFabricCanvas.ts
import { useEffect, useRef } from 'react';
import { fabric } from 'fabric';
import { createFabricObject, fabricToCanvasObject } from '../utils/fabricUtils';
import { getTrianglePoints } from '../utils/geometry/triangle';
import { getStarPoints } from '../utils/geometry/star';
import { getRegularPolygonPoints } from '../utils/geometry/polygon';
import { buildRoundedRectPath, normalizeRadii } from '../utils/geometry/roundedRect';
import useEditorStore from '../store/editorStore';
import { useCanvasDrawing } from './useCanvasDrawing';
import { computeArrowShapeSpec, DEFAULT_ARROW_OPTIONS } from '../utils/geometry/arrow';

const useFabricCanvas = () => {
  const canvasRef = useRef<fabric.Canvas | null>(null);
  const isUpdatingFromStore = useRef(false);
  const { 
    canvasObjects,
    addObject,
    updateObject,
    deleteObject,
    selectedObjectIds,
    selectObjects,
    activeTool,
  } = useEditorStore();

  const drawingCallbacks = useCanvasDrawing(canvasRef);

  // Initialize Fabric canvas
  useEffect(() => {
    // Get the existing canvas element
    const canvasElement = document.getElementById('fabric-canvas') as HTMLCanvasElement;
    if (!canvasElement) {
      console.error('Canvas element not found');
      return;
    }
    
    // Get the parent container for sizing
    const container = canvasElement.parentElement;
    if (!container) return;
    
    // Set canvas size to match container
    const rect = container.getBoundingClientRect();
    canvasElement.width = rect.width;
    canvasElement.height = rect.height;
    
    const canvas = new fabric.Canvas('fabric-canvas', {
      backgroundColor: '#ffffff',
      selection: true,
      width: rect.width,
      height: rect.height,
    });
    
    canvasRef.current = canvas;
    console.log('Fabric canvas initialized:', canvas);
    
    // Handle object selection changes
    canvas.on('selection:created', (e) => {
      const selected = e.selected?.map(obj => obj.get('data')?.id).filter(Boolean) || [];
      selectObjects(selected);
    });
    
    canvas.on('selection:updated', (e) => {
      const selected = e.selected?.map(obj => obj.get('data')?.id).filter(Boolean) || [];
      selectObjects(selected);
    });
    
    canvas.on('selection:cleared', () => {
      selectObjects([]);
    });
    
    // Handle object modifications
    canvas.on('object:modified', (e) => {
      if (!e.target || isUpdatingFromStore.current) return;
      const obj = fabricToCanvasObject(e.target);
      updateObject(obj.id, obj);
    });
    
    // Handle object removal
    canvas.on('object:removed', (e) => {
      if (e.target) {
        const id = e.target.get('data')?.id;
        if (id) {
          deleteObject(id);
        }
      }
    });

    // Add drawing event listeners
    canvas.on('mouse:down', drawingCallbacks.handleMouseDown);
    canvas.on('mouse:move', drawingCallbacks.handleMouseMove);
    canvas.on('mouse:up', drawingCallbacks.handleMouseUp);
    
    // Handle window resize
    const handleResize = () => {
      if (!container || !canvas) return;
      const rect = container.getBoundingClientRect();
      canvas.setDimensions({
        width: rect.width,
        height: rect.height
      });
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.off('mouse:down', drawingCallbacks.handleMouseDown as any);
      canvas.off('mouse:move', drawingCallbacks.handleMouseMove as any);
      canvas.off('mouse:up', drawingCallbacks.handleMouseUp as any);
      canvas.dispose();
      canvasRef.current = null;
    };
  }, []);

  // Update drawing event listeners when callbacks change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Remove old listeners
    canvas.off('mouse:down');
    canvas.off('mouse:move');
    canvas.off('mouse:up');

    // Add new listeners
    canvas.on('mouse:down', drawingCallbacks.handleMouseDown);
    canvas.on('mouse:move', drawingCallbacks.handleMouseMove);
    canvas.on('mouse:up', drawingCallbacks.handleMouseUp);

    return () => {
      canvas.off('mouse:down', drawingCallbacks.handleMouseDown as any);
      canvas.off('mouse:move', drawingCallbacks.handleMouseMove as any);
      canvas.off('mouse:up', drawingCallbacks.handleMouseUp as any);
    };
  }, [drawingCallbacks.handleMouseDown, drawingCallbacks.handleMouseMove, drawingCallbacks.handleMouseUp]);
  
  // Update cursor and selection mode based on active tool
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const isDrawingTool = ['rectangle', 'ellipse', 'line', 'arrow', 'text', 'triangle', 'star', 'polygon'].includes(activeTool);
    
    // Enable/disable selection based on tool
    canvas.selection = activeTool === 'select';
    canvas.forEachObject((obj) => {
      obj.selectable = activeTool === 'select';
      obj.evented = activeTool === 'select';
    });

    const getCursor = (tool: string) => {
      switch (tool) {
        case 'hand': return 'grab';
        case 'rectangle':
        case 'roundedRectangle':
        case 'ellipse':
        case 'line':
        case 'arrow':
        case 'triangle':
        case 'star':
        case 'polygon': return 'crosshair';
        case 'text': return 'text';
        default: return 'default';
      }
    };

    canvas.defaultCursor = getCursor(activeTool);
    canvas.hoverCursor = getCursor(activeTool);
    
    // Clear any active selection when switching to drawing tools
    if (isDrawingTool) {
      canvas.discardActiveObject();
    }
    
    canvas.renderAll();
  }, [activeTool]);
  
  // Sync store objects with Fabric
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Get current objects in the canvas
    const currentObjects = canvas.getObjects().reduce((acc, obj) => {
      const id = obj.get('data')?.id;
      if (id) acc.add(id);
      return acc;
    }, new Set<string>());
    
    // Add new objects
    Object.entries(canvasObjects).forEach(([id, obj]) => {
      if (!currentObjects.has(id)) {
        const fabricObj = createFabricObject(obj);
        // Set selectable based on current tool
        fabricObj.selectable = activeTool === 'select';
        fabricObj.evented = activeTool === 'select';
        canvas.add(fabricObj);
      }
    });

    // Update existing objects with new properties
    isUpdatingFromStore.current = true;
    canvas.getObjects().forEach(fabricObj => {
      const id = fabricObj.get('data')?.id;
      if (id && canvasObjects[id]) {
        const storeObj = canvasObjects[id];
        
        // Update position and size
        fabricObj.set({
          left: storeObj.x,
          top: storeObj.y,
          angle: storeObj.rotation,
          opacity: storeObj.opacity,
        });

        // Update size based on object type
        if (fabricObj.type === 'rect') {
          fabricObj.set({
            width: storeObj.width,
            height: storeObj.height,
            fill: storeObj.fill,
            stroke: storeObj.stroke,
            strokeWidth: storeObj.strokeWidth,
          });
        } else if (fabricObj.type === 'ellipse') {
          (fabricObj as fabric.Ellipse).set({
            rx: storeObj.width / 2,
            ry: storeObj.height / 2,
            fill: storeObj.fill,
            stroke: storeObj.stroke,
            strokeWidth: storeObj.strokeWidth,
          });
        } else if (fabricObj.type === 'line') {
          const line = fabricObj as fabric.Line;
          line.set({
            x2: storeObj.x + storeObj.width,
            y2: storeObj.y + storeObj.height,
            stroke: storeObj.stroke,
            strokeWidth: storeObj.strokeWidth,
          });
        } else if (fabricObj.type === 'i-text') {
          (fabricObj as fabric.IText).set({
            text: storeObj.text || '',
            fill: storeObj.fill,
          });
        } else if (fabricObj.type === 'polygon' && (fabricObj.get('data') as any)?.type === 'triangle') {
          const poly = fabricObj as fabric.Polygon;
          const mode = storeObj.triangle?.mode ?? 'isosceles';
          const triWidth = storeObj.triangle?.base ?? storeObj.width;
          const triHeight = storeObj.triangle?.height ?? storeObj.height;
          // Build points relative to (0,0) bounding box
          const points = getTrianglePoints({ width: triWidth, height: triHeight, mode, orientation: 'down' });
          poly.set({ left: storeObj.x, top: storeObj.y } as any);
          (poly as any).set({ points, fill: storeObj.fill, stroke: storeObj.stroke, strokeWidth: storeObj.strokeWidth });
        } else if (fabricObj.type === 'polygon' && (fabricObj.get('data') as any)?.type === 'star') {
          const poly = fabricObj as fabric.Polygon;
          const pointsCount = Math.max(5, Math.min(12, storeObj.star?.points ?? 5));
          const outerR = storeObj.star?.outerRadius ?? Math.min(storeObj.width, storeObj.height) / 2;
          const innerR = storeObj.star?.innerRadius ?? outerR / 2;
          const pts = getStarPoints({ points: pointsCount, innerRadius: innerR, outerRadius: outerR, rotation: -Math.PI / 2 });
          poly.set({ left: storeObj.x, top: storeObj.y } as any);
          (poly as any).set({ points: pts, fill: storeObj.fill, stroke: storeObj.stroke, strokeWidth: storeObj.strokeWidth });
        } else if (fabricObj.type === 'polygon' && (fabricObj.get('data') as any)?.type === 'polygon') {
          const poly = fabricObj as fabric.Polygon;
          const sides = Math.max(3, Math.min(12, (storeObj as any).polygon?.sides ?? 6));
          const radius = (storeObj as any).polygon?.radius ?? Math.min(storeObj.width, storeObj.height) / 2;
          const pts = getRegularPolygonPoints({ sides, radius, rotation: -Math.PI / 2 });
          poly.set({ left: storeObj.x, top: storeObj.y } as any);
          (poly as any).set({ points: pts, fill: storeObj.fill, stroke: storeObj.stroke, strokeWidth: storeObj.strokeWidth });
        } else if (fabricObj.type === 'group' && (fabricObj.get('data') as any)?.type === 'arrow') {
          const group: any = fabricObj as any;
          const arrow = (storeObj as any).arrow || DEFAULT_ARROW_OPTIONS;
          const spec = computeArrowShapeSpec(Math.max(1, storeObj.width), Math.max(0.5, storeObj.strokeWidth || 2), arrow);

          // Clear existing parts and rebuild
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

          const parts: fabric.Object[] = [];
          const shaft = new fabric.Line([spec.shaft.x1, spec.shaft.y1, spec.shaft.x2, spec.shaft.y2], {
            stroke: storeObj.stroke || '#6b7280',
            strokeWidth: Math.max(0.5, storeObj.strokeWidth || 2),
            selectable: false,
            evented: false,
          });
          (shaft as any).set('data', { role: 'shaft' });
          parts.push(shaft);

          if (spec.head.type === 'polygon' && spec.head.polygon) {
            const head = new fabric.Polygon(spec.head.polygon.points as any, {
              fill: storeObj.stroke || '#6b7280',
              stroke: 'transparent',
              selectable: false,
              evented: false,
            });
            (head as any).set('data', { role: 'head' });
            parts.push(head);
          } else if (spec.head.type === 'circle' && spec.head.circle) {
            const head = new fabric.Circle({
              left: spec.head.circle.cx - spec.head.circle.r,
              top: spec.head.circle.cy - spec.head.circle.r,
              radius: spec.head.circle.r,
              fill: storeObj.stroke || '#6b7280',
              selectable: false,
              evented: false,
              originX: 'left',
              originY: 'top',
            });
            (head as any).set('data', { role: 'head' });
            parts.push(head);
          }

          if (spec.tail) {
            if (spec.tail.type === 'line' && spec.tail.line) {
              const tail = new fabric.Line([spec.tail.line.x1, spec.tail.line.y1, spec.tail.line.x2, spec.tail.line.y2], {
                stroke: storeObj.stroke || '#6b7280',
                strokeWidth: Math.max(0.5, storeObj.strokeWidth || 2),
                selectable: false,
                evented: false,
              });
              (tail as any).set('data', { role: 'tail' });
              parts.push(tail);
            } else if (spec.tail.type === 'circle' && spec.tail.circle) {
              const tail = new fabric.Circle({
                left: spec.tail.circle.cx - spec.tail.circle.r,
                top: spec.tail.circle.cy - spec.tail.circle.r,
                radius: spec.tail.circle.r,
                fill: storeObj.stroke || '#6b7280',
                selectable: false,
                evented: false,
                originX: 'left',
                originY: 'top',
              });
              (tail as any).set('data', { role: 'tail' });
              parts.push(tail);
            }
          }

          // Add parts back
          parts.forEach((p) => {
            try {
              group.addWithUpdate ? group.addWithUpdate(p) : group.add(p);
            } catch {
              // ignore
            }
          });

          (group as any).set({ stroke: storeObj.stroke || '#6b7280', strokeWidth: Math.max(0.5, storeObj.strokeWidth || 2), fill: storeObj.fill ?? 'transparent' });
        }

        fabricObj.setCoords();
      }
    });
    isUpdatingFromStore.current = false;
    
    // Remove deleted objects
    canvas.getObjects().forEach(obj => {
      const id = obj.get('data')?.id;
      if (id && !(id in canvasObjects)) {
        canvas.remove(obj);
      }
    });
    
    // Update selection
    const selectedObjects = selectedObjectIds
      .map(id => canvas.getObjects().find(obj => obj.get('data')?.id === id))
      .filter(Boolean) as fabric.Object[];
    
    if (selectedObjects.length > 0) {
      canvas.setActiveObject(selectedObjects.length === 1 
        ? selectedObjects[0] 
        : new fabric.ActiveSelection(selectedObjects, { canvas }));
    } else {
      canvas.discardActiveObject();
    }
    
    canvas.renderAll();
  }, [canvasObjects, selectedObjectIds, activeTool]);
  
  return canvasRef;
};

export default useFabricCanvas;
