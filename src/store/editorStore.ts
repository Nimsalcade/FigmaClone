// src/store/editorStore.ts
import { create } from 'zustand';
import { registerHistorySlice, useHistoryStore } from './historyStore';

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

export type ToolType = 'select' | 'hand' | 'rectangle' | 'ellipse' | 'line' | 'text' | 'triangle' | 'star' | 'polygon';

export type ShapeType = 'rectangle' | 'ellipse' | 'line' | 'text' | 'triangle' | 'star' | 'polygon';

export interface TriangleProps {
  mode: 'equilateral' | 'isosceles' | 'scalene';
  base: number;
  height: number;
}

export interface StarProps {
  points: number; // 5–12
  innerRadius: number;
  outerRadius: number;
  smooth?: boolean;
}

export interface PolygonProps {
  sides: number; // 3–12
  radius: number;
}

export interface CanvasObject {
  id: string;
  type: ShapeType | string;
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
  triangle?: TriangleProps;
  star?: StarProps;
  polygon?: PolygonProps;
  metadata: {
    createdAt: string;
    updatedAt: string;
    createdBy: string;
  };
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
  createTriangle: (
    x: number,
    y: number,
    width: number,
    height: number,
    triangle: TriangleProps,
  ) => string;
  createStar: (
    x: number,
    y: number,
    outerRadius: number,
    innerRadius: number,
    points: number,
    rotation?: number,
    smooth?: boolean,
  ) => string;
  createPolygon: (
    x: number,
    y: number,
    radius: number,
    sides: number,
    rotation?: number,
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
    
    useHistoryStore.getState().record('Add object');
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
    useHistoryStore.getState().record('Update object');
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
    useHistoryStore.getState().record('Delete object');
  },
  
  selectObjects: (ids) => {
    const unique = [...new Set(ids)];
    set({ selectedObjectIds: unique });
    useHistoryStore.getState().record('Select objects', { batchKey: 'selection' });
  },
  clearSelection: () => {
    set({ selectedObjectIds: [] });
    useHistoryStore.getState().record('Clear selection', { batchKey: 'selection' });
  },
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
    useHistoryStore.getState().record('Delete selected');
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
    useHistoryStore.getState().record('Duplicate objects');
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
    useHistoryStore.getState().record('Paste objects');
  },

  selectAll: () => {
    const state = get();
    const allIds = Object.keys(state.canvasObjects);
    set({ selectedObjectIds: allIds });
    useHistoryStore.getState().record('Select all', { batchKey: 'selection' });
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

  createTriangle: (x, y, width, height, triangle) => {
    return get().addObject({
      type: 'triangle',
      x,
      y,
      width,
      height,
      rotation: 0,
      fill: '#f59e0b',
      stroke: '#b45309',
      strokeWidth: 1,
      opacity: 1,
      triangle,
    });
  },

  createStar: (x, y, outerRadius, innerRadius, points, rotation = 0, smooth = false) => {
    const size = Math.max(1, Math.round(outerRadius * 2));
    const clampedPoints = Math.max(5, Math.min(12, Math.floor(points)));
    const outer = Math.max(1, outerRadius);
    const inner = Math.max(1, Math.min(innerRadius, outer));
    return get().addObject({
      type: 'star',
      x,
      y,
      width: size,
      height: size,
      rotation,
      fill: '#fde047',
      stroke: '#ca8a04',
      strokeWidth: 1,
      opacity: 1,
      star: {
        points: clampedPoints,
        innerRadius: inner,
        outerRadius: outer,
        smooth,
      },
    });
  },

  createPolygon: (x, y, radius, sides, rotation = 0) => {
    const r = Math.max(1, Math.round(radius));
    const clampedSides = Math.max(3, Math.min(12, Math.floor(sides)));
    const size = r * 2;
    return get().addObject({
      type: 'polygon',
      x,
      y,
      width: size,
      height: size,
      rotation,
      fill: '#38bdf8',
      stroke: '#0284c7',
      strokeWidth: 1,
      opacity: 1,
      polygon: {
        sides: clampedSides,
        radius: r,
      },
    });
  },
}));

// History integration for objects and selection
registerHistorySlice<Record<string, CanvasObject>>('objects', {
  capture: () => ({ ...useEditorStore.getState().canvasObjects }),
  apply: (snapshot) => {
    useEditorStore.setState((state) => ({
      ...state,
      canvasObjects: { ...(snapshot as Record<string, CanvasObject>) },
    }));
  },
});

registerHistorySlice<string[]>('selection', {
  capture: () => [...useEditorStore.getState().selectedObjectIds],
  apply: (snapshot) => {
    useEditorStore.setState((state) => ({
      ...state,
      selectedObjectIds: [...(snapshot as string[])],
    }));
  },
});

export default useEditorStore;