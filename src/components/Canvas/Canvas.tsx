import { FabricCanvas } from './FabricCanvas';
import { CanvasGrid } from './CanvasGrid';
import { useCanvasKeyboardShortcuts } from '../../hooks/useCanvasKeyboardShortcuts';
import { useCanvasStore } from '../../store/canvasStore';

export const Canvas = () => {
  useCanvasKeyboardShortcuts();

  const viewport = useCanvasStore((state) => state.viewport);
  const gridVisible = useCanvasStore((state) => state.gridVisible);

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-200">
      <CanvasGrid visible={gridVisible} viewport={viewport} />
      <FabricCanvas />
    </div>
  );
};
