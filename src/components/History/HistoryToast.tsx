import { useEffect, useState } from 'react';
import { useHistoryStore, type HistoryActionInfo } from '../../store/historyStore';

const DISPLAY_DURATION_MS = 1500;

export const HistoryToast = () => {
  const lastAction = useHistoryStore((state) => state.lastAction);
  const [visible, setVisible] = useState(false);
  const [action, setAction] = useState<HistoryActionInfo | null>(null);

  useEffect(() => {
    if (!lastAction || (lastAction.type !== 'undo' && lastAction.type !== 'redo')) {
      return;
    }

    setAction(lastAction);
    setVisible(true);

    const timeoutId = window.setTimeout(() => {
      setVisible(false);
    }, DISPLAY_DURATION_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [lastAction]);

  if (!visible || !action || (action.type !== 'undo' && action.type !== 'redo')) {
    return null;
  }

  const prefix = action.type === 'undo' ? 'Undid' : 'Redid';
  const description = action.label || 'Last action';

  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 -translate-x-1/2 transform rounded bg-slate-900/90 px-3 py-1 text-xs font-medium text-white shadow-lg">
      {prefix}: {description}
    </div>
  );
};
