import { memo } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { ZoomControls } from './ZoomControls';

const buttonClasses =
  'rounded border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500';

export const TopBar = memo(() => {
  const gridVisible = useCanvasStore((state) => state.gridVisible);
  const toggleGrid = useCanvasStore((state) => state.toggleGrid);
  const activeTool = useCanvasStore((state) => state.activeTool);

  return (
    <header className="flex h-12 items-center justify-between border-b border-slate-200 bg-white px-4">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-slate-700">Canvas</span>
        <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
          Tool: {activeTool === 'hand' ? 'Hand' : 'Select'}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <ZoomControls />
        <button type="button" className={buttonClasses} onClick={toggleGrid}>
          {gridVisible ? 'Hide grid' : 'Show grid'}
        </button>
      </div>
    </header>
  );
});

TopBar.displayName = 'TopBar';
