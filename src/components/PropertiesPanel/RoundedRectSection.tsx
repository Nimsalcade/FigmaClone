import React, { useCallback } from 'react';
import useEditorStore, { CanvasObject } from '../../store/editorStore';
import { normalizeRadii } from '../../utils/geometry/roundedRect';

interface RoundedRectSectionProps {
  object: CanvasObject;
}

export const RoundedRectSection: React.FC<RoundedRectSectionProps> = ({ object }) => {
  const updateObject = useEditorStore((s) => s.updateObject);

  const rr = object.roundedRectangle ?? { radius: 12, radii: { tl: 12, tr: 12, br: 12, bl: 12 } };
  const baseRadius = rr.radius ?? 12;
  const effective = normalizeRadii(object.width, object.height, { radius: baseRadius, radii: rr.radii });

  const handleGlobalRadiusChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Math.max(0, parseFloat(e.target.value) || 0);
      const norm = normalizeRadii(object.width, object.height, { radius: value, radii: rr.radii });
      updateObject(object.id, { roundedRectangle: { radius: value, radii: norm } });
    },
    [object.id, object.width, object.height, rr.radii, updateObject],
  );

  const handleCornerChange = useCallback(
    (corner: 'tl' | 'tr' | 'br' | 'bl') => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Math.max(0, parseFloat(e.target.value) || 0);
      const nextRadii = { ...effective, [corner]: value };
      const norm = normalizeRadii(object.width, object.height, { radius: baseRadius, radii: nextRadii });
      updateObject(object.id, { roundedRectangle: { radius: baseRadius, radii: norm } });
    },
    [baseRadius, effective, object.height, object.id, object.width, updateObject],
  );

  return (
    <div className="mb-6">
      <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-3">Rounded Rectangle</h3>
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Global radius</label>
          <input
            type="number"
            min={0}
            value={Math.round(baseRadius)}
            onChange={handleGlobalRadiusChange}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Top-left</label>
            <input
              type="number"
              min={0}
              value={Math.round(effective.tl)}
              onChange={handleCornerChange('tl')}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Top-right</label>
            <input
              type="number"
              min={0}
              value={Math.round(effective.tr)}
              onChange={handleCornerChange('tr')}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Bottom-right</label>
            <input
              type="number"
              min={0}
              value={Math.round(effective.br)}
              onChange={handleCornerChange('br')}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Bottom-left</label>
            <input
              type="number"
              min={0}
              value={Math.round(effective.bl)}
              onChange={handleCornerChange('bl')}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
