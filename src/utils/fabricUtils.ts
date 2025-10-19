// src/utils/fabricUtils.ts
import { fabric } from 'fabric';
import { CanvasObject } from '../store/editorStore';
import { getTrianglePoints, resolveEquilateralSize } from './geometry/triangle';
import { getStarPoints, ratioFromRadii } from './geometry/star';

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

    case 'triangle': {
      const mode = obj.triangle?.mode ?? 'isosceles';
      const triWidth = obj.triangle?.base ?? width;
      const triHeight = obj.triangle?.height ?? height;
      const points = getTrianglePoints({ width: triWidth, height: triHeight, mode, orientation: 'down' });
      fabricObj = new fabric.Polygon(points as any, {
        left: x,
        top: y,
        fill,
        stroke,
        strokeWidth,
        opacity,
        angle: rotation,
        selectable: true,
      });
      break;
    }

    case 'star': {
      const pointsCount = Math.max(5, Math.min(12, obj.star?.points ?? 5));
      const outerR = obj.star?.outerRadius ?? Math.min(width, height) / 2;
      const innerR = obj.star?.innerRadius ?? outerR / 2;
      const rotationOffset = -Math.PI / 2; // face up
      const rel = getStarPoints({ points: pointsCount, innerRadius: innerR, outerRadius: outerR, rotation: rotationOffset });
      fabricObj = new fabric.Polygon(rel as any, {
        left: x,
        top: y,
        fill,
        stroke,
        strokeWidth,
        opacity,
        angle: rotation,
        selectable: true,
      });
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
    triangle: obj.triangle,
    star: obj.star,
    });

    return fabricObj;
    };

// Convert Fabric object back to our CanvasObject format
export const fabricToCanvasObject = (fabricObj: fabric.Object): CanvasObject => {
  const data = fabricObj.get('data') || {};
  const rawWidth = (fabricObj as any).width || (fabricObj as any).getScaledWidth?.() || 0;
  const rawHeight = (fabricObj as any).height || (fabricObj as any).getScaledHeight?.() || 0;

  let x = fabricObj.left || 0;
  let y = fabricObj.top || 0;
  let width = rawWidth;
  let height = rawHeight;

  let triangle = data.triangle as CanvasObject['triangle'] | undefined;
  let star = data.star as CanvasObject['star'] | undefined;

  if (data.type === 'triangle') {
    const mode = (triangle?.mode ?? 'isosceles') as 'equilateral' | 'isosceles' | 'scalene';
    if (mode === 'equilateral') {
      const { base, height: h } = resolveEquilateralSize(width, height);
      const cx = x + width / 2;
      const cy = y + height / 2;
      width = base;
      height = h;
      x = cx - width / 2;
      y = cy - height / 2;
      triangle = { mode, base: width, height };
    } else {
      triangle = { mode, base: width, height };
    }
  }

  if (data.type === 'star') {
    const pointsCount = Math.max(5, Math.min(12, (star?.points ?? 5) | 0));
    const ratio = star ? ratioFromRadii(star.innerRadius, star.outerRadius) : 0.5;
    const outerR = Math.max(1, Math.min(width, height) / 2);
    const innerR = Math.max(0.0001, outerR * ratio);
    const cx = x + width / 2;
    const cy = y + height / 2;
    width = outerR * 2;
    height = outerR * 2;
    x = cx - width / 2;
    y = cy - height / 2;
    star = {
      points: pointsCount,
      innerRadius: innerR,
      outerRadius: outerR,
      smooth: !!(star && star.smooth),
    };
  }

  const baseProps: CanvasObject = {
    id: (data as any).id || generateId(),
    type: (data as any).type || 'rectangle',
    x,
    y,
    width,
    height,
    rotation: (fabricObj as any).angle || 0,
    fill: (fabricObj as any).fill || '#000000',
    stroke: (fabricObj as any).stroke || '',
    strokeWidth: (fabricObj as any).strokeWidth || 0,
    opacity: (fabricObj as any).opacity ?? 1,
    text: (fabricObj as any).text,
    triangle,
    star,
    metadata: {
      createdAt: (data as any).createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: (data as any).createdBy || 'user',
    },
  };
  
  return baseProps;
};
