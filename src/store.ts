import { create, StateCreator } from 'zustand';
import { nanoid } from 'nanoid';
import type { AssetDefinition, PlacedAsset, EditorSettings, AssetCategory } from './types';
import { assetManifest } from './assetManifest';

interface EditorState {
  assetsLibrary: Record<AssetCategory, AssetDefinition[]>;
  placed: PlacedAsset[];
  selectedId: string | null;
  history: PlacedAsset[][];
  historyIndex: number;
  settings: EditorSettings;
  addPlaced: (asset: AssetDefinition, pos: {x: number; y: number}) => void;
  updatePlaced: (id: string, patch: Partial<PlacedAsset>) => void;
  updatePlacedSilent: (id: string, patch: Partial<PlacedAsset>) => void;
  select: (id: string | null) => void;
  deleteSelected: () => void;
  clearCanvas: () => void;
  undo: () => void;
  redo: () => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  toggleSnap: () => void;
  toggleDarkMode: () => void;
  loadDefaultAssets: () => void;
  addCustomAsset: (asset: { name: string; category: AssetCategory; src: string; id?: string }) => void;
  duplicateSelected: () => void;
  toggleLock: (id: string) => void;
}

const initialSettings: EditorSettings = {
  snapToGrid: false,
  gridSize: 10,
  darkMode: (typeof window !== 'undefined' && localStorage.getItem('ff-dark') === '1') || false,
};

const creator: StateCreator<EditorState> = (set: any, get: any) => ({
  assetsLibrary: {
    eyes: [],
    noses: [],
    mouths: [],
    eyebrows: [],
    hair: [],
    mustach: [],
    accessories: [],
    'face-shapes': [],
  },
  placed: [],
  selectedId: null,
  history: [],
  historyIndex: -1,
  settings: initialSettings,
  loadDefaultAssets: () => {
    set({ assetsLibrary: assetManifest });
  },
  addCustomAsset: ({ name, category, src, id }) => {
    const lib = get().assetsLibrary;
    const newAsset: AssetDefinition = { id: id || `${category}-${nanoid(6)}`, name, category, src };
    const updated = { ...lib, [category]: [...lib[category], newAsset] };
    set({ assetsLibrary: updated });
  },
  addPlaced: (asset: AssetDefinition, pos: {x: number; y: number}) => {
    const placed: PlacedAsset = {
      ...asset,
      instanceId: nanoid(),
      x: pos.x,
      y: pos.y,
      scale: 1,
      rotation: 0,
      zIndex: get().placed.length,
      locked: false,
    };
    const newPlaced = [...get().placed, placed];
    const newHistory = get().history.slice(0, get().historyIndex + 1);
    newHistory.push(newPlaced);
    set({ placed: newPlaced, history: newHistory, historyIndex: newHistory.length - 1, selectedId: placed.instanceId });
  },
  updatePlaced: (id: string, patch: Partial<PlacedAsset>) => {
    const newPlaced = get().placed.map((p: PlacedAsset) => {
      if (p.instanceId !== id) return p;
      if (p.locked) return p; // do not update locked asset transform
      return { ...p, ...patch };
    });
    const newHistory = get().history.slice(0, get().historyIndex + 1);
    newHistory.push(newPlaced);
    set({ placed: newPlaced, history: newHistory, historyIndex: newHistory.length - 1 });
  },
  updatePlacedSilent: (id: string, patch: Partial<PlacedAsset>) => {
    const newPlaced = get().placed.map((p: PlacedAsset) => p.instanceId === id ? { ...p, ...patch } : p);
    set({ placed: newPlaced });
  },
  select: (id: string | null) => set({ selectedId: id }),
  deleteSelected: () => {
    const id = get().selectedId; if (!id) return; 
  const newPlaced = get().placed.filter((p: PlacedAsset) => p.instanceId !== id).map((p: PlacedAsset, i: number) => ({...p,zIndex:i}));
    const newHistory = get().history.slice(0, get().historyIndex + 1);
    newHistory.push(newPlaced);
    set({ placed: newPlaced, selectedId: null, history: newHistory, historyIndex: newHistory.length - 1 });
  },
  clearCanvas: () => {
    const newHistory = get().history.slice(0, get().historyIndex + 1);
    newHistory.push([]);
    set({ placed: [], selectedId: null, history: newHistory, historyIndex: newHistory.length - 1 });
  },
  undo: () => {
    const { historyIndex, history } = get();
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    set({ historyIndex: newIndex, placed: history[newIndex], selectedId: null });
  },
  redo: () => {
    const { historyIndex, history } = get();
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    set({ historyIndex: newIndex, placed: history[newIndex], selectedId: null });
  },
  bringForward: (id: string) => {
    const arr = [...get().placed];
    arr.sort((a,b) => a.zIndex - b.zIndex);
    const idx = arr.findIndex(a => a.instanceId === id);
    if (idx < 0 || idx === arr.length -1) return;
    [arr[idx].zIndex, arr[idx+1].zIndex] = [arr[idx+1].zIndex, arr[idx].zIndex];
    const newPlaced = [...arr];
    const newHistory = get().history.slice(0, get().historyIndex + 1);
    newHistory.push(newPlaced);
    set({ placed: newPlaced, history: newHistory, historyIndex: newHistory.length -1 });
  },
  sendBackward: (id: string) => {
    const arr = [...get().placed];
    arr.sort((a,b) => a.zIndex - b.zIndex);
    const idx = arr.findIndex(a => a.instanceId === id);
    if (idx <= 0) return;
    [arr[idx].zIndex, arr[idx-1].zIndex] = [arr[idx-1].zIndex, arr[idx].zIndex];
    const newPlaced = [...arr];
    const newHistory = get().history.slice(0, get().historyIndex + 1);
    newHistory.push(newPlaced);
    set({ placed: newPlaced, history: newHistory, historyIndex: newHistory.length -1 });
  },
  toggleSnap: () => set((s: EditorState) => ({ settings: { ...s.settings, snapToGrid: !s.settings.snapToGrid } })),
  toggleDarkMode: () => set((s: EditorState) => {
    const next = !s.settings.darkMode;
    if (typeof window !== 'undefined') localStorage.setItem('ff-dark', next ? '1' : '0');
    return { settings: { ...s.settings, darkMode: next } };
  }),
  duplicateSelected: () => {
    const id = get().selectedId; if (!id) return;
    const orig = get().placed.find((p: PlacedAsset) => p.instanceId === id); if (!orig) return;
    const clone: PlacedAsset = { ...orig, instanceId: nanoid(), x: orig.x + 20, y: orig.y + 20, zIndex: get().placed.length, locked: false };
    const newPlaced = [...get().placed, clone];
    const newHistory = get().history.slice(0, get().historyIndex + 1);
    newHistory.push(newPlaced);
    set({ placed: newPlaced, history: newHistory, historyIndex: newHistory.length -1, selectedId: clone.instanceId });
  },
  toggleLock: (id: string) => {
    const newPlaced = get().placed.map((p: PlacedAsset) => p.instanceId === id ? { ...p, locked: !p.locked } : p);
    const newHistory = get().history.slice(0, get().historyIndex + 1);
    newHistory.push(newPlaced);
    set({ placed: newPlaced, history: newHistory, historyIndex: newHistory.length -1 });
  },
});

export const useEditorStore = create<EditorState>()(creator);
