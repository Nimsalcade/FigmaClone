import React, { useCallback } from 'react';
import useEditorStore, { CanvasObject, ArrowProps } from '../../store/editorStore';

interface ArrowSectionProps {
  object: CanvasObject;
}

export const ArrowSection: React.FC<ArrowSectionProps> = ({ object }) => {
  const updateObject = useEditorStore((s) => s.updateObject);

  const arrow: ArrowProps = object.arrow ?? {
    tailType: 'none',
    headType: 'triangle',
    headSize: 2,
    tailLength: 0,
  };

  const handleHeadTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const next: ArrowProps = { ...arrow, headType: e.target.value as ArrowProps['headType'] };
      updateObject(object.id, { arrow: next });
    },
    [arrow, object.id, updateObject],
  );

  const handleTailTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const next: ArrowProps = { ...arrow, tailType: e.target.value as ArrowProps['tailType'] };
      updateObject(object.id, { arrow: next });
    },
    [arrow, object.id, updateObject],
  );

  const handleHeadSizeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Math.max(0.25, parseFloat(e.target.value) || 0);
      const next: ArrowProps = { ...arrow, headSize: value };
      updateObject(object.id, { arrow: next });
    },
    [arrow, object.id, updateObject],
  );

  const handleTailLengthChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Math.max(0, parseFloat(e.target.value) || 0);
      const next: ArrowProps = { ...arrow, tailLength: value };
      updateObject(object.id, { arrow: next });
    },
    [arrow, object.id, updateObject],
  );

  return (
    <div className="mb-6">
      <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-3">Arrow</h3>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Head</label>
            <select
              value={arrow.headType}
              onChange={handleHeadTypeChange}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="triangle">Triangle</option>
              <option value="diamond">Diamond</option>
              <option value="circle">Circle</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tail</label>
            <select
              value={arrow.tailType}
              onChange={handleTailTypeChange}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="none">None</option>
              <option value="line">Line</option>
              <option value="round">Round</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Head Size</label>
            <input
              type="number"
              min={0.25}
              step={0.25}
              value={arrow.headSize}
              onChange={handleHeadSizeChange}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          {arrow.tailType === 'line' && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tail Length</label>
              <input
                type="number"
                min={0}
                step={1}
                value={arrow.tailLength ?? 0}
                onChange={handleTailLengthChange}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
