import { useEffect } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { useHistoryStore } from '../store/historyStore';

const isTextInput = (element: EventTarget | null) => {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  const tagName = element.tagName;
  const editable = element.isContentEditable;
  return (
    editable ||
    tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    (tagName === 'DIV' && element.getAttribute('role') === 'textbox')
  );
};

const isUndoShortcut = (event: KeyboardEvent) => {
  if (event.altKey) {
    return false;
  }

  const usesMeta = event.metaKey && !event.ctrlKey;
  const usesCtrl = event.ctrlKey;

  if (!usesMeta && !usesCtrl) {
    return false;
  }

  return event.code === 'KeyZ' && !event.shiftKey;
};

const isRedoShortcut = (event: KeyboardEvent) => {
  if (event.altKey) {
    return false;
  }

  const usesMeta = event.metaKey && !event.ctrlKey;
  const usesCtrl = event.ctrlKey && !event.metaKey;

  if (usesMeta) {
    return event.code === 'KeyZ' && event.shiftKey;
  }

  if (usesCtrl) {
    if (event.code === 'KeyY' && !event.shiftKey) {
      return true;
    }

    return event.code === 'KeyZ' && event.shiftKey;
  }

  return false;
};

export const useCanvasKeyboardShortcuts = () => {
  const setSpacePanning = useCanvasStore((state) => state.setSpacePanning);
  const setActiveTool = useCanvasStore((state) => state.setActiveTool);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTextInput(event.target)) {
        return;
      }

      if (isUndoShortcut(event)) {
        event.preventDefault();
        if (event.repeat) {
          return;
        }
        const history = useHistoryStore.getState();
        if (history.canUndo) {
          history.undo();
        }
        return;
      }

      if (isRedoShortcut(event)) {
        event.preventDefault();
        if (event.repeat) {
          return;
        }
        const history = useHistoryStore.getState();
        if (history.canRedo) {
          history.redo();
        }
        return;
      }

      if (event.code === 'Space' && !event.repeat) {
        if (!event.metaKey && !event.ctrlKey && !event.altKey) {
          event.preventDefault();
          setSpacePanning(true);
        }
      }

      if (event.code === 'KeyH') {
        event.preventDefault();
        setActiveTool('hand');
      }

      if (event.code === 'KeyV' || event.code === 'Escape') {
        setActiveTool('select');
        if (event.code === 'Escape') {
          setSpacePanning(false);
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        setSpacePanning(false);
      }
    };

    const handleWindowBlur = () => setSpacePanning(false);

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [setSpacePanning, setActiveTool]);
};
