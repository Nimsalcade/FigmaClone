import { create } from 'zustand';

const MAX_HISTORY_ENTRIES = 50;
const BATCH_MERGE_WINDOW = 200;

export type HistorySliceKey = 'canvas' | 'objects' | 'selection' | 'editor';

export type HistorySnapshot = Partial<Record<HistorySliceKey, unknown>>;

interface HistoryEntry {
  id: string;
  label: string;
  snapshot: HistorySnapshot;
  timestamp: number;
  batchKey: string | null;
}

interface ActiveBatch {
  key: string;
  label: string;
  entryIndex: number | null;
  startedAt: number;
}

export interface HistoryActionInfo {
  id: string;
  type: 'record' | 'undo' | 'redo';
  label: string;
  timestamp: number;
}

interface HistoryState {
  entries: HistoryEntry[];
  pointer: number;
  initialized: boolean;
  isReplaying: boolean;
  canUndo: boolean;
  canRedo: boolean;
  activeBatch: ActiveBatch | null;
  lastAction: HistoryActionInfo | null;
  initialize: (label?: string) => void;
  record: (label: string, options?: RecordHistoryOptions) => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
  beginBatch: (label?: string, key?: string) => string;
  commitBatch: (key?: string) => void;
  cancelBatch: (key?: string) => void;
}

export interface RecordHistoryOptions {
  snapshot?: HistorySnapshot;
  batchKey?: string;
  skipIfSame?: boolean;
}

interface HistorySliceHandler<TSnapshot> {
  capture: () => TSnapshot;
  apply: (snapshot: TSnapshot) => void;
  equals?: (a: TSnapshot | undefined, b: TSnapshot | undefined) => boolean;
}

const sliceHandlers: Partial<Record<HistorySliceKey, HistorySliceHandler<unknown>>> = {};

const hasStructuredClone = typeof structuredClone === 'function';

const cloneValue = <T>(value: T): T => {
  if (value === undefined) {
    return value;
  }

  if (hasStructuredClone) {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
};

const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `history-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

const stableSerialize = (value: unknown): string => {
  const seen = new WeakSet<object>();

  const traverse = (input: unknown): unknown => {
    if (input === null || typeof input !== 'object') {
      return input;
    }

    if (seen.has(input as object)) {
      return null;
    }

    seen.add(input as object);

    if (Array.isArray(input)) {
      return input.map((item) => traverse(item));
    }

    const entries = Object.entries(input as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b),
    );

    return entries.reduce<Record<string, unknown>>((acc, [key, val]) => {
      acc[key] = traverse(val);
      return acc;
    }, {});
  };

  return JSON.stringify(traverse(value));
};

const snapshotsEqual = (a?: HistorySnapshot, b?: HistorySnapshot) => {
  if (!a && !b) {
    return true;
  }

  if (!a || !b) {
    return false;
  }

  const keys = new Set<HistorySliceKey>([
    ...(Object.keys(a) as HistorySliceKey[]),
    ...(Object.keys(b) as HistorySliceKey[]),
  ]);

  for (const key of keys) {
    const handler = sliceHandlers[key];
    const first = a[key];
    const second = b[key];

    if (first === undefined && second === undefined) {
      continue;
    }

    if (handler && typeof handler.equals === 'function') {
      if (!handler.equals(first as never, second as never)) {
        return false;
      }
      continue;
    }

    if (stableSerialize(first) !== stableSerialize(second)) {
      return false;
    }
  }

  return true;
};

const captureSnapshot = (): HistorySnapshot => {
  const snapshotEntries: [HistorySliceKey, unknown][] = [];

  (Object.entries(sliceHandlers) as Array<[HistorySliceKey, HistorySliceHandler<unknown>]>).forEach(
    ([key, handler]) => {
      if (!handler) {
        return;
      }
      snapshotEntries.push([key, handler.capture()]);
    },
  );

  return snapshotEntries.reduce<HistorySnapshot>((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {});
};

const applySnapshot = (snapshot: HistorySnapshot) => {
  (Object.entries(snapshot) as Array<[HistorySliceKey, unknown]>).forEach(([key, value]) => {
    const handler = sliceHandlers[key];
    if (!handler) {
      return;
    }
    handler.apply(value as never);
  });
};

const clampEntries = (
  entries: HistoryEntry[],
  pointer: number,
  activeBatch: ActiveBatch | null,
): { entries: HistoryEntry[]; pointer: number; activeBatch: ActiveBatch | null } => {
  if (entries.length <= MAX_HISTORY_ENTRIES) {
    return { entries, pointer, activeBatch };
  }

  const overflow = entries.length - MAX_HISTORY_ENTRIES;
  const trimmedEntries = entries.slice(overflow);
  const nextPointer = Math.max(0, pointer - overflow);

  if (!activeBatch) {
    return { entries: trimmedEntries, pointer: nextPointer, activeBatch: null };
  }

  if (activeBatch.entryIndex === null) {
    return { entries: trimmedEntries, pointer: nextPointer, activeBatch };
  }

  const nextEntryIndex = activeBatch.entryIndex - overflow;
  if (nextEntryIndex < 0) {
    return { entries: trimmedEntries, pointer: nextPointer, activeBatch: null };
  }

  return {
    entries: trimmedEntries,
    pointer: nextPointer,
    activeBatch: { ...activeBatch, entryIndex: nextEntryIndex },
  };
};

const createEntry = (label: string, snapshot: HistorySnapshot, batchKey: string | null): HistoryEntry => ({
  id: generateId(),
  label,
  snapshot: cloneValue(snapshot),
  timestamp: Date.now(),
  batchKey,
});

export const registerHistorySlice = <TSnapshot>(
  key: HistorySliceKey,
  handler: HistorySliceHandler<TSnapshot>,
) => {
  sliceHandlers[key] = handler as HistorySliceHandler<unknown>;
};

export const useHistoryStore = create<HistoryState>()((set, get) => ({
  entries: [],
  pointer: -1,
  initialized: false,
  isReplaying: false,
  canUndo: false,
  canRedo: false,
  activeBatch: null,
  lastAction: null,
  initialize: (label = 'Initial state') => {
    set((state) => {
      if (state.initialized) {
        return state;
      }

      const snapshot = captureSnapshot();
      const entry = createEntry(label, snapshot, null);

      return {
        ...state,
        entries: [entry],
        pointer: 0,
        initialized: true,
        canUndo: false,
        canRedo: false,
        lastAction: null,
      };
    });
  },
  record: (label, options) => {
    const state = get();

    if (state.isReplaying) {
      return;
    }

    const snapshot = options?.snapshot ?? captureSnapshot();

    if (state.initialized) {
      const currentEntry = state.entries[state.pointer];
      const skipIfSame = options?.skipIfSame ?? true;
      if (skipIfSame && currentEntry && snapshotsEqual(currentEntry.snapshot, snapshot)) {
        return;
      }
    }

    const truncatedEntries = state.entries.slice(0, state.pointer + 1);
    const batchKey = state.activeBatch?.key ?? options?.batchKey ?? null;
    const now = Date.now();

    let entries = truncatedEntries;
    let pointer = truncatedEntries.length - 1;
    let activeBatch = state.activeBatch;

    const entryFactory = () => ({
      id: generateId(),
      label,
      snapshot: cloneValue(snapshot),
      timestamp: now,
      batchKey,
    });

    const updateEntryAtIndex = (index: number) =>
      entries.map((entry, entryIndex) =>
        entryIndex === index
          ? {
              ...entry,
              label,
              snapshot: cloneValue(snapshot),
              timestamp: now,
            }
          : entry,
      );

    if (batchKey) {
      if (activeBatch && activeBatch.key === batchKey) {
        if (activeBatch.entryIndex === null) {
          const entryIndex = entries.length;
          entries = entries.concat(entryFactory());
          pointer = entryIndex;
          activeBatch = { ...activeBatch, entryIndex };
        } else {
          const entryIndex = activeBatch.entryIndex;
          entries = updateEntryAtIndex(entryIndex);
          pointer = entryIndex;
          activeBatch = { ...activeBatch, entryIndex };
        }
      } else {
        const lastIndex = entries.length - 1;
        const lastEntry = entries[lastIndex];
        const withinWindow =
          lastEntry &&
          lastEntry.batchKey === batchKey &&
          state.pointer === lastIndex &&
          now - lastEntry.timestamp <= BATCH_MERGE_WINDOW;

        if (withinWindow) {
          entries = updateEntryAtIndex(lastIndex);
          pointer = lastIndex;
        } else {
          const entryIndex = entries.length;
          entries = entries.concat(entryFactory());
          pointer = entryIndex;
        }
      }
    } else {
      const entryIndex = entries.length;
      entries = entries.concat(entryFactory());
      pointer = entryIndex;
    }

    let nextActiveBatch = activeBatch;
    if (nextActiveBatch && nextActiveBatch.key === batchKey) {
      nextActiveBatch = {
        ...nextActiveBatch,
        entryIndex: pointer,
        label: label ?? nextActiveBatch.label,
      };
    }

    const limited = clampEntries(entries, pointer, nextActiveBatch);

    set({
      entries: limited.entries,
      pointer: limited.pointer,
      initialized: true,
      canUndo: limited.pointer > 0,
      canRedo: false,
      activeBatch: limited.activeBatch,
      lastAction: {
        id: generateId(),
        type: 'record',
        label,
        timestamp: now,
      },
    });
  },
  undo: () => {
    const state = get();
    if (!state.initialized || state.pointer <= 0) {
      return;
    }

    const targetIndex = state.pointer - 1;
    const entry = state.entries[targetIndex];
    if (!entry) {
      return;
    }

    set({
      pointer: targetIndex,
      isReplaying: true,
      activeBatch: null,
    });

    applySnapshot(cloneValue(entry.snapshot));

    const entries = get().entries;
    const pointer = get().pointer;

    set({
      isReplaying: false,
      canUndo: pointer > 0,
      canRedo: pointer < entries.length - 1,
      lastAction: {
        id: generateId(),
        type: 'undo',
        label: entry.label,
        timestamp: Date.now(),
      },
    });
  },
  redo: () => {
    const state = get();
    if (!state.initialized || state.pointer >= state.entries.length - 1) {
      return;
    }

    const targetIndex = state.pointer + 1;
    const entry = state.entries[targetIndex];
    if (!entry) {
      return;
    }

    set({
      pointer: targetIndex,
      isReplaying: true,
      activeBatch: null,
    });

    applySnapshot(cloneValue(entry.snapshot));

    const entries = get().entries;
    const pointer = get().pointer;

    set({
      isReplaying: false,
      canUndo: pointer > 0,
      canRedo: pointer < entries.length - 1,
      lastAction: {
        id: generateId(),
        type: 'redo',
        label: entry.label,
        timestamp: Date.now(),
      },
    });
  },
  clear: () => {
    set({
      entries: [],
      pointer: -1,
      initialized: false,
      canUndo: false,
      canRedo: false,
      activeBatch: null,
      lastAction: null,
    });
  },
  beginBatch: (label = 'Batch', key) => {
    const batchKey = key ?? generateId();
    set((state) => ({
      activeBatch: {
        key: batchKey,
        label,
        entryIndex: state.activeBatch?.key === batchKey ? state.activeBatch.entryIndex : null,
        startedAt: Date.now(),
      },
    }));
    return batchKey;
  },
  commitBatch: (key) => {
    set((state) => {
      if (!state.activeBatch) {
        return state;
      }
      if (key && state.activeBatch.key !== key) {
        return state;
      }
      return { ...state, activeBatch: null };
    });
  },
  cancelBatch: (key) => {
    set((state) => {
      if (!state.activeBatch) {
        return state;
      }
      if (key && state.activeBatch.key !== key) {
        return state;
      }
      return { ...state, activeBatch: null };
    });
  },
}));
