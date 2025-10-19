import { useEffect } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { useHistoryStore } from '../store/historyStore';
import useEditorStore from '../store/editorStore';

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
  const setCanvasTool = useCanvasStore((state) => state.setActiveTool);
  const { 
    setActiveTool,
    deleteSelected,
    duplicateSelected,
    copySelected,
    paste,
    selectAll
  } = useEditorStore();

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

      // Object manipulation shortcuts
      if (event.code === 'Delete' || event.code === 'Backspace') {
        event.preventDefault();
        deleteSelected();
        return;
      }

      if (event.code === 'KeyD' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        duplicateSelected();
        return;
      }

      if (event.code === 'KeyC' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        copySelected();
        return;
      }

      if (event.code === 'KeyV' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        paste();
        return;
      }

      if (event.code === 'KeyA' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        selectAll();
        return;
      }

      // Tool switching shortcuts
      if (event.code === 'KeyV' || event.code === 'Escape') {
        event.preventDefault();
        setActiveTool('select');
        setCanvasTool('select');
        if (event.code === 'Escape') {
          setSpacePanning(false);
        }
      }

      if (event.code === 'KeyH') {
        event.preventDefault();
        setActiveTool('hand');
        setCanvasTool('hand');
      }

      if (event.code === 'KeyR') {
        event.preventDefault();
        setActiveTool('rectangle');
        setCanvasTool('select'); // Canvas store uses select for drawing
      }

      if (event.code === 'KeyO') {
        event.preventDefault();
        setActiveTool('ellipse');
        setCanvasTool('select');
      }

      if (event.code === 'KeyL') {
        event.preventDefault();
        setActiveTool('line');
        setCanvasTool('select');
      }

      if (event.code === 'KeyW') {
        event.preventDefault();
        setActiveTool('arrow');
        setCanvasTool('select');
      }

      if (event.code === 'KeyY') {
        event.preventDefault();
        setActiveTool('triangle');
        setCanvasTool('select');
      }

      if (event.code === 'KeyS') {
        event.preventDefault();
        setActiveTool('star');
        setCanvasTool('select');
      }

      if (event.code === 'KeyP') {
        event.preventDefault();
        setActiveTool('polygon');
        setCanvasTool('select');
      }

      if (event.code === 'KeyT') {
        event.preventDefault();
        setActiveTool('text');
        setCanvasTool('select');
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
  }, [setSpacePanning, setCanvasTool, setActiveTool, deleteSelected, duplicateSelected, copySelected, paste, selectAll]);
};
