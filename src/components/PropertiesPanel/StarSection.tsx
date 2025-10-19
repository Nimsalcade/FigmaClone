import React, { useCallback } from 'react';
import useEditorStore, { CanvasObject } from '../../store/editorStore';

interface StarSectionProps {
  object: CanvasObject;
}

export const StarSection: React.FC<StarSectionProps> = ({ object }) => {
  const updateObject = useEditorStore((s) => s.updateObject);

  const star = object.star ?? { points: 5, innerRadius: Math.min(object.width, object.height) / 4, outerRadius: Math.min(object.width, object.height) / 2, smooth: false };
  const centerX = object.x + object.width / 2;
  const centerY = object.y + object.height / 2;

  const handlePointsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Math.max(5, Math.min(12, Math.floor(parseFloat(e.target.value) || 5)));
      updateObject(object.id, { star: { ...star, points: value } });
    },
    [object.id, star, updateObject],
  );

  const handleOuterRadiusChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const outer = Math.max(1, parseFloat(e.target.value) || 1);
      const nextWidth = outer * 2;
      const nextHeight = outer * 2;
      const nextX = centerX - nextWidth / 2;
      const nextY = centerY - nextHeight / 2;
      updateObject(object.id, {
        x: nextX,
        y: nextY,
        width: nextWidth,
        height: nextHeight,
        star: { ...star, outerRadius: outer },
      });
    },
    [centerX, centerY, object.id, star, updateObject],
  );

  const handleRatioChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const ratio = Math.max(0.1, Math.min(0.95, parseFloat(e.target.value) || 0.5));
      const outer = star.outerRadius || Math.min(object.width, object.height) / 2;
      const inner = Math.max(0.0001, outer * ratio);
      updateObject(object.id, { star: { ...star, innerRadius: inner } });
    },
    [object.id, star, updateObject, object.width, object.height],
  );

  const ratio = Math.max(0.0001, Math.min(0.99, star.innerRadius / Math.max(1, star.outerRadius || Math.min(object.width, object.height) / 2)));

  return (
    <div className="mb-6">
      <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-3">Star</h3>
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Points</label>
          <input
            type="number"
            min={5}
            max={12}
            value={star.points}
            onChange={handlePointsChange}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Outer radius</label>
          <input
            type="number"
            min={1}
            value={Math.round(star.outerRadius || Math.min(object.width, object.height) / 2)}
            onChange={handleOuterRadiusChange}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Inner ratio ({(ratio * 100).toFixed(0)}%)</label>
          <input
            type="range"
            min={0.1}
            max={0.95}
            step={0.01}
            value={ratio}
            onChange={handleRatioChange}
            className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
