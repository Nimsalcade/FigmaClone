import { useRef } from 'react';
import { CanvasGrid } from './CanvasGrid';
import { useCanvasKeyboardShortcuts } from '../../hooks/useCanvasKeyboardShortcuts';
import { useCanvasStore } from '../../store/canvasStore';
import useFabricCanvas from '../../hooks/useFabricCanvas';

export const Canvas = () => {
  useCanvasKeyboardShortcuts();

  const viewport = useCanvasStore((state) => state.viewport);
  const gridVisible = useCanvasStore((state) => state.gridVisible);
  
  const canvasRef = useFabricCanvas();

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-200">
      <CanvasGrid visible={gridVisible} viewport={viewport} />
      <canvas 
        id="fabric-canvas"
        className="absolute inset-0 w-full h-full"
        style={{ cursor: 'default' }}
      />
    </div>
  );
};