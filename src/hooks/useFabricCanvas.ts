// src/hooks/useFabricCanvas.ts
import { useEffect, useRef } from 'react';
import { fabric } from 'fabric';
import { createFabricObject, fabricToCanvasObject } from '../utils/fabricUtils';
import useEditorStore, { CanvasObject } from '../store/editorStore';
import { useCanvasDrawing } from './useCanvasDrawing';

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

    const isDrawingTool = ['rectangle', 'ellipse', 'line', 'text'].includes(activeTool);
    
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
        case 'ellipse':
        case 'line': return 'crosshair';
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