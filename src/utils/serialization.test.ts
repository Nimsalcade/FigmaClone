import { describe, it, expect } from 'vitest';
import type { CanvasObject } from '../store/editorStore';

const examplePolygon = (): CanvasObject => ({
  id: 'poly-1',
  type: 'polygon',
  x: 100,
  y: 100,
  width: 120,
  height: 120,
  rotation: 0,
  fill: '#f59e0b',
  stroke: '#b45309',
  strokeWidth: 1,
  opacity: 1,
  sides: 5,
  radius: 60,
  metadata: {
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    createdBy: 'test',
  },
});

describe('serialization for polygon object', () => {
  it('includes sides and radius when stringified', () => {
    const obj = examplePolygon();
    const json = JSON.stringify(obj);
    expect(json.includes('"sides"')).toBe(true);
    expect(json.includes('"radius"')).toBe(true);
  });
});
