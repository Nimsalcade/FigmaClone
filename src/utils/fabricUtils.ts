// src/utils/fabricUtils.ts
import { fabric } from 'fabric';
import { CanvasObject } from '../store/editorStore';
import { computeArrowGeometry } from './geometry/arrow';

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

    case 'arrow': {
      const start = { x, y };
      const end = { x: x + width, y: y + height };
      const tailType = (obj as any).tailType ?? 'none';
      const headType = (obj as any).headType ?? 'triangle';
      const headSize = (obj as any).headSize ?? 2;
      const tailLength = (obj as any).tailLength ?? 0;

      const geo = computeArrowGeometry(start, end, strokeWidth, {
        tailType,
        headType,
        headSize,
        tailLength,
      });

      const shaft = new fabric.Line(
        [geo.shaftStart.x, geo.shaftStart.y, geo.shaftEnd.x, geo.shaftEnd.y],
        {
          stroke,
          strokeWidth,
          opacity,
          selectable: false,
          evented: false,
          strokeUniform: true,
          strokeLineCap: tailType === 'round' ? 'round' : 'butt',
        },
      );

      let headObj: fabric.Object;
      if (geo.head.type === 'polygon' && geo.head.points) {
        const xs = geo.head.points.map((p) => p.x);
        const ys = geo.head.points.map((p) => p.y);
        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        const points = geo.head.points.map((p) => ({ x: p.x - minX, y: p.y - minY }));
        headObj = new fabric.Polygon(points, {
          left: minX,
          top: minY,
          fill: stroke,
          selectable: false,
          evented: false,
          objectCaching: false,
        });
      } else {
        const r = geo.head.radius ?? 0;
        const cx = geo.head.center?.x ?? end.x;
        const cy = geo.head.center?.y ?? end.y;
        headObj = new fabric.Circle({
          left: cx - r,
          top: cy - r,
          radius: r,
          fill: stroke,
          selectable: false,
          evented: false,
          objectCaching: false,
        });
      }

      const group = new fabric.Group([shaft, headObj], {
        selectable: true,
        objectCaching: false,
      });

      group.set('data', {
        id,
        type: 'arrow',
        tailType,
        headType,
        headSize,
        tailLength,
        createdAt: obj.metadata.createdAt,
        createdBy: obj.metadata.createdBy,
      });

      fabricObj = group as unknown as fabric.Object;
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
  
  // Store our internal ID for reference (for non-arrow types)
  if (type !== 'arrow') {
    fabricObj.set('data', {
      id,
      type,
      createdAt: obj.metadata.createdAt,
      createdBy: obj.metadata.createdBy,
    });
  }
  
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
