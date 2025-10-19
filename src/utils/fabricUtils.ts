// src/utils/fabricUtils.ts
import { fabric } from 'fabric';
import { CanvasObject } from '../store/editorStore';
import { regularPolygonPointsRelative, clampSides } from './geometry/polygon';

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
  polygon: fabric.Polygon,
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

    case 'polygon': {
      const radius = Math.max(0, obj.radius ?? Math.min(width, height) / 2);
      const sides = clampSides(obj.sides ?? 5);
      const points = regularPolygonPointsRelative(radius, sides);
      fabricObj = new fabric.Polygon(points as any, {
        left: x,
        top: y,
        fill,
        stroke,
        strokeWidth,
        opacity,
        angle: rotation,
        selectable: true,
        objectCaching: false,
      });
      // Maintain regularity when scaling
      (fabricObj as any).lockUniScaling = true;
      break;
    }
      
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
    createdBy: obj.metadata.createdBy,
    // Polygon-specific
    sides: obj.sides,
    radius: obj.radius,
  });
  
  return fabricObj;
};

// Convert Fabric object back to our CanvasObject format
export const fabricToCanvasObject = (fabricObj: fabric.Object): CanvasObject => {
  const data = fabricObj.get('data') || {};
  const width = (fabricObj as any).getScaledWidth?.() || (fabricObj as any).width || 0;
  const height = (fabricObj as any).getScaledHeight?.() || (fabricObj as any).height || 0;

  const type = (data.type as string) || (fabricObj as any).type || 'rectangle';

  const baseProps: CanvasObject = {
    id: (data as any).id || generateId(),
    type,
    x: fabricObj.left || 0,
    y: fabricObj.top || 0,
    width,
    height,
    rotation: fabricObj.angle || 0,
    fill: (fabricObj as any).fill || '#000000',
    stroke: (fabricObj as any).stroke || '',
    strokeWidth: (fabricObj as any).strokeWidth || 0,
    opacity: fabricObj.opacity ?? 1,
    text: (fabricObj as any).text,
    metadata: {
      createdAt: (data as any).createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: (data as any).createdBy || 'user',
    },
  };

  if (type === 'polygon') {
    const polygonSides = (data as any).sides ?? ((fabricObj as any).points?.length ?? undefined);
    const radius = Math.min(width, height) / 2;
    (baseProps as any).sides = polygonSides;
    (baseProps as any).radius = radius;
  }
  
  return baseProps;
};
