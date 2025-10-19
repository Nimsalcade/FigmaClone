import React, { useCallback } from 'react';
import useEditorStore, { CanvasObject } from '../../store/editorStore';

interface PolygonSectionProps {
  object: CanvasObject;
}

export const PolygonSection: React.FC<PolygonSectionProps> = ({ object }) => {
  const updateObject = useEditorStore((s) => s.updateObject);

  const polygon = object.polygon ?? {
    sides: 6,
    radius: Math.min(object.width, object.height) / 2,
  };

  const centerX = object.x + object.width / 2;
  const centerY = object.y + object.height / 2;

  const handleSidesChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Math.max(3, Math.min(12, Math.floor(parseFloat(e.target.value) || 6)));
      updateObject(object.id, { polygon: { ...polygon, sides: value } });
    },
    [object.id, polygon, updateObject],
  );

  const handleRadiusChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const r = Math.max(1, parseFloat(e.target.value) || 1);
      const nextWidth = r * 2;
      const nextHeight = r * 2;
      const nextX = centerX - nextWidth / 2;
      const nextY = centerY - nextHeight / 2;
      updateObject(object.id, {
        x: nextX,
        y: nextY,
        width: nextWidth,
        height: nextHeight,
        polygon: { ...polygon, radius: r },
      });
    },
    [centerX, centerY, object.id, polygon, updateObject],
  );

  return (
    <div className="mb-6">
      <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-3">Polygon</h3>
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Sides</label>
          <input
            type="number"
            min={3}
            max={12}
            value={polygon.sides}
            onChange={handleSidesChange}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Radius</label>
          <input
            type="number"
            min={1}
            value={Math.round(polygon.radius || Math.min(object.width, object.height) / 2)}
            onChange={handleRadiusChange}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );
};
