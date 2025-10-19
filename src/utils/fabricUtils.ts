// src/utils/fabricUtils.ts
import { fabric } from 'fabric';
import { CanvasObject } from '../store/editorStore';

// Generate UUID using crypto API
const generateId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Map our tool types to Fabric object constructors
const FABRIC_CONSTRUCTORS: Record<string, any> = {
  rectangle: fabric.Rect,
  ellipse: fabric.Ellipse,
  line: fabric.Line,
  text: fabric.IText,
};

// Convert our CanvasObject to a Fabric object
export const createFabricObject = (obj: CanvasObject): fabric.Object => {
  const { id, type, x, y, width, height, rotation, fill, stroke, strokeWidth, opacity, text } = obj;
  const FabricClass = FABRIC_CONSTRUCTORS[type] || fabric.Rect;
  
  let fabricObj: fabric.Object;
  
  switch (type) {
    case 'rectangle':
      fabricObj = new FabricClass({
        left: x,
        top: y,
        width,
        height,
        fill,
        stroke,
        strokeWidth,
        opacity,
        angle: rotation,
        selectable: true,
      });
      break;
      
    case 'ellipse':
      fabricObj = new FabricClass({
        left: x,
        top: y,
        rx: width / 2,
        ry: height / 2,
        fill,
        stroke,
        strokeWidth,
        opacity,
        angle: rotation,
        selectable: true,
      });
      break;
      
    case 'line':
      fabricObj = new FabricClass([x, y, x + width, y + height], {
        stroke,
        strokeWidth,
        opacity,
        selectable: true,
      });
      break;
      
    case 'text':
      fabricObj = new FabricClass(text || 'Click to edit', {
        left: x,
        top: y,
        fontSize: 16,
        fill,
        opacity,
        selectable: true,
      });
      break;
      
    default:
      fabricObj = new FabricClass({
        left: x,
        top: y,
        width,
        height,
        fill,
        stroke,
        strokeWidth,
        opacity,
        angle: rotation,
        selectable: true,
      });
  }
  
  // Store our internal ID for reference
  fabricObj.set('data', { 
    id,
    type,
    createdAt: obj.metadata.createdAt,
    createdBy: obj.metadata.createdBy
  });
  
  return fabricObj;
};

// Convert Fabric object back to our CanvasObject format
export const fabricToCanvasObject = (fabricObj: fabric.Object): CanvasObject => {
  const data = fabricObj.get('data') || {};
  const baseProps = {
    id: data.id || generateId(),
    type: data.type || 'rectangle',
    x: fabricObj.left || 0,
    y: fabricObj.top || 0,
    width: (fabricObj as any).width || (fabricObj as any).getScaledWidth?.() || 0,
    height: (fabricObj as any).height || (fabricObj as any).getScaledHeight?.() || 0,
    rotation: fabricObj.angle || 0,
    fill: (fabricObj as any).fill || '#000000',
    stroke: (fabricObj as any).stroke || '',
    strokeWidth: (fabricObj as any).strokeWidth || 0,
    opacity: fabricObj.opacity ?? 1,
    text: (fabricObj as any).text,
    metadata: {
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: data.createdBy || 'user',
    },
  };
  
  return baseProps;
};
