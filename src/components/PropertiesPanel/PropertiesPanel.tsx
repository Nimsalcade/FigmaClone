// src/components/PropertiesPanel/PropertiesPanel.tsx
import React, { useCallback } from 'react';
import useEditorStore from '../../store/editorStore';
import { TriangleSection } from './TriangleSection';
import { StarSection } from './StarSection';
import { PolygonSection } from './PolygonSection';
import { ArrowSection } from './ArrowSection';

export const PropertiesPanel: React.FC = () => {
  const { 
    canvasObjects,
    selectedObjectIds,
    updateObject
  } = useEditorStore();

  const selectedObjects = selectedObjectIds.map(id => canvasObjects[id]).filter(Boolean);
  const hasSelection = selectedObjects.length > 0;
  const singleSelection = selectedObjects.length === 1;

  // Get shared values for multi-selection
  const getSharedValue = useCallback((key: keyof typeof canvasObjects[string]): string | number => {
    if (!hasSelection) return '';
    
    const firstValue = selectedObjects[0][key];
    const allSame = selectedObjects.every(obj => obj[key] === firstValue);
    
    if (!allSame) return 'Mixed';
    
    // Handle different value types
    if (typeof firstValue === 'object') return '';
    return firstValue ?? '';
  }, [selectedObjects, hasSelection]);

  const handlePropertyChange = useCallback((property: string, value: any) => {
    selectedObjectIds.forEach(id => {
      updateObject(id, { [property]: value });
    });
  }, [selectedObjectIds, updateObject]);

  const handleInputChange = (property: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
    handlePropertyChange(property, value);
  };

  if (!hasSelection) {
    return (
      <div className="w-64 h-full bg-white border-l border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Properties</h2>
        <div className="text-sm text-gray-500 text-center">
          Select an object to edit its properties
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 h-full bg-white border-l border-gray-200 p-4 overflow-y-auto">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">
        Properties {!singleSelection && `(${selectedObjects.length} selected)`}
      </h2>

      {/* Transform Section */}
      <div className="mb-6">
        <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-3">
          Transform
        </h3>
        
        <div className="space-y-3">
          {/* Position */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">X</label>
              <input
                type="number"
                value={getSharedValue('x')}
                onChange={handleInputChange('x')}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder={!singleSelection ? 'Mixed' : ''}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Y</label>
              <input
                type="number"
                value={getSharedValue('y')}
                onChange={handleInputChange('y')}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder={!singleSelection ? 'Mixed' : ''}
              />
            </div>
          </div>

          {/* Size */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">W</label>
              <input
                type="number"
                value={getSharedValue('width')}
                onChange={handleInputChange('width')}
                min="1"
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder={!singleSelection ? 'Mixed' : ''}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">H</label>
              <input
                type="number"
                value={getSharedValue('height')}
                onChange={handleInputChange('height')}
                min="1"
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder={!singleSelection ? 'Mixed' : ''}
              />
            </div>
          </div>

          {/* Rotation */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Rotation</label>
            <input
              type="number"
              value={getSharedValue('rotation')}
              onChange={handleInputChange('rotation')}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder={!singleSelection ? 'Mixed' : ''}
            />
          </div>
        </div>
      </div>

      {/* Appearance Section */}
      <div className="mb-6">
        <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-3">
          Appearance
        </h3>
        
        <div className="space-y-3">
          {/* Fill Color */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Fill</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={getSharedValue('fill') as string}
                onChange={handleInputChange('fill')}
                className="w-8 h-6 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={getSharedValue('fill')}
                onChange={handleInputChange('fill')}
                className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder={!singleSelection ? 'Mixed' : ''}
              />
            </div>
          </div>

          {/* Stroke Color */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Stroke</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={getSharedValue('stroke') as string}
                onChange={handleInputChange('stroke')}
                className="w-8 h-6 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={getSharedValue('stroke')}
                onChange={handleInputChange('stroke')}
                className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder={!singleSelection ? 'Mixed' : ''}
              />
            </div>
          </div>

          {/* Stroke Width */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Stroke Width</label>
            <input
              type="number"
              value={getSharedValue('strokeWidth')}
              onChange={handleInputChange('strokeWidth')}
              min="0"
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder={!singleSelection ? 'Mixed' : ''}
            />
          </div>

          {/* Opacity */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Opacity ({Math.round((getSharedValue('opacity') as number) * 100)}%)
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={getSharedValue('opacity')}
              onChange={handleInputChange('opacity')}
              className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Text Section (for text objects) */}
      {singleSelection && selectedObjects[0].type === 'text' && (
        <div className="mb-6">
          <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-3">
            Text
          </h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Content</label>
              <textarea
                value={selectedObjects[0].text || ''}
                onChange={(e) => handlePropertyChange('text', e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                rows={3}
                placeholder="Enter text..."
              />
            </div>
          </div>
        </div>
      )}

      {singleSelection && selectedObjects[0].type === 'arrow' && (
        <ArrowSection object={selectedObjects[0]} />
      )}

      {singleSelection && selectedObjects[0].type === 'triangle' && (
        <TriangleSection object={selectedObjects[0]} />
      )}

      {singleSelection && selectedObjects[0].type === 'star' && (
        <StarSection object={selectedObjects[0]} />
      )}

      {singleSelection && selectedObjects[0].type === 'polygon' && (
        <PolygonSection object={selectedObjects[0]} />
      )}

      {/* Object Info Section */}
      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-3">
          Object Info
        </h3>
        
        {singleSelection && (
          <div className="space-y-2 text-xs text-gray-600">
            <div>Type: <span className="font-medium">{selectedObjects[0].type}</span></div>
            <div>ID: <span className="font-mono text-[10px]">{selectedObjects[0].id}</span></div>
            <div>Created: <span className="text-[10px]">
              {new Date(selectedObjects[0].metadata.createdAt).toLocaleDateString()}
            </span></div>
          </div>
        )}
      </div>
    </div>
  );
};
