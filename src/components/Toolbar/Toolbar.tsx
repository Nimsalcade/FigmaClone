// src/components/Toolbar/Toolbar.tsx
import React from 'react';
import useEditorStore, { ToolType } from '../../store/editorStore';
import { Square, Circle, Type, Move, MousePointer, Minus, Triangle as TriangleIcon, Star, Octagon } from 'lucide-react';

const tools: { id: ToolType; icon: React.ReactNode; label: string }[] = [
  { id: 'select', icon: <MousePointer size={20} />, label: 'Select (V)' },
  { id: 'hand', icon: <Move size={20} />, label: 'Hand (H)' },
  { id: 'rectangle', icon: <Square size={20} />, label: 'Rectangle (R)' },
  { id: 'ellipse', icon: <Circle size={20} />, label: 'Ellipse (O)' },
  { id: 'line', icon: <Minus size={20} />, label: 'Line (L)' },
  { id: 'triangle', icon: <TriangleIcon size={20} />, label: 'Triangle (Y)' },
  { id: 'polygon', icon: <Octagon size={20} />, label: 'Polygon (P)' },
  { id: 'star', icon: <Star size={20} />, label: 'Star (S)' },
  { id: 'text', icon: <Type size={20} />, label: 'Text (T)' },
];

export const Toolbar: React.FC = () => {
  const { activeTool, setActiveTool } = useEditorStore();

  return (
    <div className="fixed left-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 p-2 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
      {tools.map((tool) => (
        <button
          key={tool.id}
          className={`p-2 rounded-md transition-colors ${
            activeTool === tool.id
              ? 'bg-blue-100 text-blue-600'
              : 'hover:bg-gray-100 text-gray-700'
          }`}
          onClick={() => setActiveTool(tool.id)}
          title={tool.label}
          aria-label={tool.label}
          aria-pressed={activeTool === tool.id}
        >
          {tool.icon}
        </button>
      ))}
    </div>
  );
};