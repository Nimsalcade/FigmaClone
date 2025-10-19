import React, { useMemo } from 'react';
import useEditorStore, { CanvasObject } from '../../store/editorStore';

export const ArrowSection: React.FC = () => {
  const { canvasObjects, selectedObjectIds, updateObject } = useEditorStore();
  const selectedObjects = selectedObjectIds.map((id) => canvasObjects[id]).filter(Boolean);
  const hasSelection = selectedObjects.length > 0;

  const primary = useMemo(() => (hasSelection ? selectedObjects[0] : null), [hasSelection, selectedObjects]);

  if (!hasSelection || !primary || primary.type !== 'arrow') {
    return null;
  }

  const tailType = primary.tailType ?? 'none';
  const headType = primary.headType ?? 'triangle';
  const headSize = primary.headSize ?? 2;
  const tailLength = primary.tailLength ?? 0;

  const applyToSelection = (updates: Partial<CanvasObject>) => {
    selectedObjectIds.forEach((id) => updateObject(id, updates));
  };

  return (
    <div className="mb-6">
      <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-3">Arrow</h3>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Head</label>
            <select
              value={headType}
              onChange={(e) => applyToSelection({ headType: e.target.value as any })}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="triangle">Triangle</option>
              <option value="diamond">Diamond</option>
              <option value="circle">Circle</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Head Size</label>
            <input
              type="number"
              min={0.5}
              step={0.5}
              value={headSize}
              onChange={(e) => applyToSelection({ headSize: parseFloat(e.target.value) || 1 })}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tail</label>
            <select
              value={tailType}
              onChange={(e) => applyToSelection({ tailType: e.target.value as any })}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="none">None</option>
              <option value="line">Line</option>
              <option value="round">Round</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tail Length</label>
            <input
              type="number"
              min={0}
              step={1}
              disabled={tailType !== 'line'}
              value={tailType === 'line' ? tailLength : 0}
              onChange={(e) => applyToSelection({ tailLength: parseFloat(e.target.value) || 0 })}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
