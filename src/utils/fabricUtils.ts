// src/utils/fabricUtils.ts
import { fabric } from 'fabric';
import { CanvasObject } from '../store/editorStore';
import { getTrianglePoints, resolveEquilateralSize } from './geometry/triangle';
import { getStarPoints, ratioFromRadii } from './geometry/star';
import { getRegularPolygonPoints } from './geometry/polygon';
import { computeArrowShapeSpec, DEFAULT_ARROW_OPTIONS } from './geometry/arrow';

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

    case 'polygon': {
      const sides = Math.max(3, Math.min(12, obj.polygon?.sides ?? 6));
      const radius = obj.polygon?.radius ?? Math.min(width, height) / 2;
      const rel = getRegularPolygonPoints({ sides, radius, rotation: -Math.PI / 2 });
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

    case 'arrow': {
      const arrow = (obj as any).arrow || DEFAULT_ARROW_OPTIONS;
      const spec = computeArrowShapeSpec(Math.max(1, width), Math.max(0.5, strokeWidth), arrow);
      const parts: fabric.Object[] = [];

      const shaft = new fabric.Line([spec.shaft.x1, spec.shaft.y1, spec.shaft.x2, spec.shaft.y2], {
        stroke: stroke || '#6b7280',
        strokeWidth: Math.max(0.5, strokeWidth || 2),
        selectable: false,
        evented: false,
      });
      (shaft as any).set('data', { role: 'shaft' });
      parts.push(shaft);

      if (spec.head.type === 'polygon' && spec.head.polygon) {
        const head = new fabric.Polygon(spec.head.polygon.points as any, {
          fill: stroke || '#6b7280',
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
          fill: stroke || '#6b7280',
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
          const tail = new fabric.Line(
            [spec.tail.line.x1, spec.tail.line.y1, spec.tail.line.x2, spec.tail.line.y2],
            {
              stroke: stroke || '#6b7280',
              strokeWidth: Math.max(0.5, strokeWidth || 2),
              selectable: false,
              evented: false,
            },
          );
          (tail as any).set('data', { role: 'tail' });
          parts.push(tail);
        } else if (spec.tail.type === 'circle' && spec.tail.circle) {
          const tail = new fabric.Circle({
            left: spec.tail.circle.cx - spec.tail.circle.r,
            top: spec.tail.circle.cy - spec.tail.circle.r,
            radius: spec.tail.circle.r,
            fill: stroke || '#6b7280',
            selectable: false,
            evented: false,
            originX: 'left',
            originY: 'top',
          });
          (tail as any).set('data', { role: 'tail' });
          parts.push(tail);
        }
      }

      const group = new fabric.Group(parts, {
        left: x,
        top: y,
        angle: rotation || 0,
        opacity,
        selectable: true,
      });

      (group as any).set({ stroke: stroke || '#6b7280', strokeWidth: Math.max(0.5, strokeWidth || 2), fill: fill ?? 'transparent' });

      group.set('data', {
        id,
        type,
        createdAt: obj.metadata.createdAt,
        createdBy: obj.metadata.createdBy,
        arrow: arrow,
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

    // Store our internal ID for reference
    if (type !== 'arrow') {
      fabricObj.set('data', {
        id,
        type,
        createdAt: obj.metadata.createdAt,
        createdBy: obj.metadata.createdBy,
        triangle: (obj as any).triangle,
        star: (obj as any).star,
        polygon: (obj as any).polygon,
      });
    }

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

  let triangle = (data as any).triangle as CanvasObject['triangle'] | undefined;
  let star = (data as any).star as CanvasObject['star'] | undefined;
  let polygon = (data as any).polygon as CanvasObject['polygon'] | undefined;
  let arrow = (data as any).arrow as CanvasObject['arrow'] | undefined;

  if ((data as any).type === 'triangle') {
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

  if ((data as any).type === 'star') {
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

  if ((data as any).type === 'polygon') {
    const sides = Math.max(3, Math.min(12, ((polygon?.sides ?? 6) as number) | 0));
    const r = polygon?.radius ?? Math.min(width, height) / 2;
    const cx = x + width / 2;
    const cy = y + height / 2;
    width = r * 2;
    height = r * 2;
    x = cx - width / 2;
    y = cy - height / 2;
    polygon = { sides, radius: r };
  }

  // Arrow uses group's bbox; keep arrow options as-is
  if ((data as any).type === 'arrow') {
    arrow = (data as any).arrow || undefined;
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
    polygon,
    arrow,
    metadata: {
      createdAt: (data as any).createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: (data as any).createdBy || 'user',
    },
  };
  
  return baseProps;
};
