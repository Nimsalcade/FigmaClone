// src/store/editorStore.ts
import { create } from 'zustand';

// Generate UUID using crypto API  
const generateId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export type ToolType = 'select' | 'hand' | 'rectangle' | 'ellipse' | 'line' | 'text' | 'arrow';

export interface CanvasObject {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  text?: string;
  // Arrow-specific optional properties (used when type === 'arrow')
  headType?: 'triangle' | 'diamond' | 'circle';
  tailType?: 'none' | 'line' | 'round';
  headSize?: number;
  tailLength?: number;
  metadata: {
    createdAt: string;
    updatedAt: string;
    createdBy: string;
  },
}

interface EditorState {
  // Tool state
  activeTool: ToolType;
  isDrawing: boolean;
  
  // Document state
  canvasObjects: Record<string, CanvasObject>;
  selectedObjectIds: string[];
  
  // View state
  zoom: number;
  pan: { x: number; y: number };
  
  // Clipboard
  clipboard: CanvasObject[];
  
  // Actions
  setActiveTool: (tool: ToolType) => void;
  addObject: (object: Omit<CanvasObject, 'id' | 'metadata'>) => string;
  updateObject: (id: string, updates: Partial<CanvasObject>) => void;
  deleteObject: (id: string) => void;
  selectObjects: (ids: string[]) => void;
  clearSelection: () => void;
  setViewport: (zoom: number, pan: { x: number; y: number }) => void;
  
  // Object manipulation
  deleteSelected: () => void;
  duplicateSelected: () => void;
  copySelected: () => void;
  paste: () => void;
  selectAll: () => void;
  
  // Shape creation
  createRectangle: (x: number, y: number, width: number, height: number) => string;
  createEllipse: (x: number, y: number, width: number, height: number) => string;
  createLine: (x1: number, y1: number, x2: number, y2: number) => string;
  createText: (x: number, y: number, text: string) => string;
  createArrow: (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    options?: { tailType?: 'none' | 'line' | 'round'; headType?: 'triangle' | 'diamond' | 'circle'; headSize?: number; tailLength?: number }
  ) => string;
}

const useEditorStore = create<EditorState>((set, get) => ({
  // Initial state
  activeTool: 'select',
  isDrawing: false,
  canvasObjects: {},
  selectedObjectIds: [],
  zoom: 1,
  pan: { x: 0, y: 0 },
  clipboard: [],

  // Actions
  setActiveTool: (tool) => set({ activeTool: tool }),
  
  addObject: (object) => {
    const id = generateId();
    const now = new Date().toISOString();
    
    set((state) => ({
      canvasObjects: {
        ...state.canvasObjects,
        [id]: {
          ...object,
          id,
          metadata: {
            createdAt: now,
            updatedAt: now,
            createdBy: 'user',
          },
        },
      },
    }));
    
    return id;
  },
  
  updateObject: (id, updates) => {
    set((state) => {
      const current = state.canvasObjects[id];
      if (!current) return state;
      
      return {
        canvasObjects: {
          ...state.canvasObjects,
          [id]: {
            ...current,
            ...updates,
            metadata: {
              ...current.metadata,
              updatedAt: new Date().toISOString(),
            },
          },
        },
      };
    });
  },
  
  deleteObject: (id) => {
    set((state) => {
      const newObjects = { ...state.canvasObjects };
      delete newObjects[id];
      return {
        canvasObjects: newObjects,
        selectedObjectIds: state.selectedObjectIds.filter((objId) => objId !== id),
      };
    });
  },
  
  selectObjects: (ids) => set({ selectedObjectIds: [...new Set(ids)] }),
  clearSelection: () => set({ selectedObjectIds: [] }),
  setViewport: (zoom, pan) => set({ zoom, pan }),

  // Object manipulation methods
  deleteSelected: () => {
    set((state) => {
      const newObjects = { ...state.canvasObjects };
      state.selectedObjectIds.forEach(id => {
        delete newObjects[id];
      });
      return {
        canvasObjects: newObjects,
        selectedObjectIds: [],
      };
    });
  },

  duplicateSelected: () => {
    const state = get();
    const duplicatedIds: string[] = [];
    
    state.selectedObjectIds.forEach(id => {
      const original = state.canvasObjects[id];
      if (original) {
        const duplicatedId = get().addObject({
          ...original,
          x: original.x + 20,
          y: original.y + 20,
        });
        duplicatedIds.push(duplicatedId);
      }
    });
    
    if (duplicatedIds.length > 0) {
      get().selectObjects(duplicatedIds);
    }
  },

  copySelected: () => {
    const state = get();
    const copied = state.selectedObjectIds
      .map(id => state.canvasObjects[id])
      .filter(Boolean);
    
    set({ clipboard: copied });
  },

  paste: () => {
    const state = get();
    if (state.clipboard.length === 0) return;
    
    const pastedIds: string[] = [];
    
    state.clipboard.forEach(obj => {
      const pastedId = get().addObject({
        ...obj,
        x: obj.x + 20,
        y: obj.y + 20,
      });
      pastedIds.push(pastedId);
    });
    
    if (pastedIds.length > 0) {
      get().selectObjects(pastedIds);
    }
  },

  selectAll: () => {
    const state = get();
    const allIds = Object.keys(state.canvasObjects);
    set({ selectedObjectIds: allIds });
  },
  
  // Shape creation helpers
  createRectangle: (x, y, width, height) => {
    return get().addObject({
      type: 'rectangle',
      x,
      y,
      width,
      height,
      rotation: 0,
      fill: '#3b82f6',
      stroke: '#1d4ed8',
      strokeWidth: 1,
      opacity: 1,
    });
  },
  
  createEllipse: (x, y, width, height) => {
    return get().addObject({
      type: 'ellipse',
      x,
      y,
      width,
      height,
      rotation: 0,
      fill: '#10b981',
      stroke: '#047857',
      strokeWidth: 1,
      opacity: 1,
    });
  },
  
  createLine: (x1, y1, x2, y2) => {
    return get().addObject({
      type: 'line',
      x: x1,
      y: y1,
      width: x2 - x1,
      height: y2 - y1,
      rotation: 0,
      fill: 'transparent',
      stroke: '#6b7280',
      strokeWidth: 2,
      opacity: 1,
    });
  },
  
  createText: (x, y, text) => {
    return get().addObject({
      type: 'text',
      x,
      y,
      width: 200,
      height: 30,
      rotation: 0,
      fill: '#1f2937',
      stroke: '',
      strokeWidth: 0,
      opacity: 1,
      text,
    });
  },
  
  createArrow: (x1, y1, x2, y2, options) => {
    const { tailType = 'none', headType = 'triangle', headSize = 2, tailLength = 0 } = options || {};
    return get().addObject({
      type: 'arrow',
      x: x1,
      y: y1,
      width: x2 - x1,
      height: y2 - y1,
      rotation: 0,
      fill: 'transparent',
      stroke: '#374151',
      strokeWidth: 2,
      opacity: 1,
      tailType,
      headType,
      headSize,
      tailLength,
    });
  },
}));

export default useEditorStore;