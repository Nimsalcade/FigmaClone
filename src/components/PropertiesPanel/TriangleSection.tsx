import React, { useCallback } from 'react';
import useEditorStore, { CanvasObject, TriangleProps } from '../../store/editorStore';
import { resolveEquilateralSize } from '../../utils/geometry/triangle';

interface TriangleSectionProps {
  object: CanvasObject;
}

export const TriangleSection: React.FC<TriangleSectionProps> = ({ object }) => {
  const updateObject = useEditorStore((s) => s.updateObject);

  const mode = object.triangle?.mode ?? 'isosceles';
  const base = object.triangle?.base ?? object.width;
  const height = object.triangle?.height ?? object.height;

  const handleModeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const nextMode = e.target.value as TriangleProps['mode'];
      if (nextMode === 'equilateral') {
        const { base: b, height: h } = resolveEquilateralSize(base, height);
        updateObject(object.id, {
          width: b,
          height: h,
          triangle: { mode: nextMode, base: b, height: h },
        });
        return;
      }
      updateObject(object.id, {
        triangle: { mode: nextMode, base, height },
        width: base,
        height,
      });
    },
    [base, height, object.id, updateObject],
  );

  const handleBaseChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Math.max(1, parseFloat(e.target.value) || 0);
      if (mode === 'equilateral') {
        const { base: b, height: h } = resolveEquilateralSize(value, height);
        updateObject(object.id, { width: b, height: h, triangle: { mode, base: b, height: h } });
        return;
      }
      updateObject(object.id, { width: value, triangle: { mode, base: value, height } });
    },
    [mode, height, object.id, updateObject],
  );

  const handleHeightChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Math.max(1, parseFloat(e.target.value) || 0);
      if (mode === 'equilateral') {
        const { base: b, height: h } = resolveEquilateralSize(base, value);
        updateObject(object.id, { width: b, height: h, triangle: { mode, base: b, height: h } });
        return;
      }
      updateObject(object.id, { height: value, triangle: { mode, base, height: value } });
    },
    [mode, base, object.id, updateObject],
  );

  return (
    <div className="mb-6">
      <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-3">Triangle</h3>
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Mode</label>
          <select
            value={mode}
            onChange={handleModeChange}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="isosceles">Isosceles</option>
            <option value="equilateral">Equilateral</option>
            <option value="scalene">Scalene</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Base</label>
            <input
              type="number"
              min={1}
              value={Math.round(base)}
              onChange={handleBaseChange}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Height</label>
            <input
              type="number"
              min={1}
              value={Math.round(height)}
              onChange={handleHeightChange}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
