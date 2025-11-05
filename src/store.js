import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { assetManifest } from './assetManifest';
const initialSettings = {
    snapToGrid: false,
    gridSize: 10,
    darkMode: (typeof window !== 'undefined' && localStorage.getItem('ff-dark') === '1') || false,
};
const creator = (set, get) => ({
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
    addPlaced: (asset, pos) => {
        const placed = {
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
    updatePlaced: (id, patch) => {
        const newPlaced = get().placed.map((p) => {
            if (p.instanceId !== id)
                return p;
            if (p.locked)
                return p; // do not update locked asset transform
            return { ...p, ...patch };
        });
        const newHistory = get().history.slice(0, get().historyIndex + 1);
        newHistory.push(newPlaced);
        set({ placed: newPlaced, history: newHistory, historyIndex: newHistory.length - 1 });
    },
    updatePlacedSilent: (id, patch) => {
        const newPlaced = get().placed.map((p) => p.instanceId === id ? { ...p, ...patch } : p);
        set({ placed: newPlaced });
    },
    select: (id) => set({ selectedId: id }),
    deleteSelected: () => {
        const id = get().selectedId;
        if (!id)
            return;
        const newPlaced = get().placed.filter((p) => p.instanceId !== id).map((p, i) => ({ ...p, zIndex: i }));
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
        if (historyIndex <= 0)
            return;
        const newIndex = historyIndex - 1;
        set({ historyIndex: newIndex, placed: history[newIndex], selectedId: null });
    },
    redo: () => {
        const { historyIndex, history } = get();
        if (historyIndex >= history.length - 1)
            return;
        const newIndex = historyIndex + 1;
        set({ historyIndex: newIndex, placed: history[newIndex], selectedId: null });
    },
    bringForward: (id) => {
        const arr = [...get().placed];
        arr.sort((a, b) => a.zIndex - b.zIndex);
        const idx = arr.findIndex(a => a.instanceId === id);
        if (idx < 0 || idx === arr.length - 1)
            return;
        [arr[idx].zIndex, arr[idx + 1].zIndex] = [arr[idx + 1].zIndex, arr[idx].zIndex];
        const newPlaced = [...arr];
        const newHistory = get().history.slice(0, get().historyIndex + 1);
        newHistory.push(newPlaced);
        set({ placed: newPlaced, history: newHistory, historyIndex: newHistory.length - 1 });
    },
    sendBackward: (id) => {
        const arr = [...get().placed];
        arr.sort((a, b) => a.zIndex - b.zIndex);
        const idx = arr.findIndex(a => a.instanceId === id);
        if (idx <= 0)
            return;
        [arr[idx].zIndex, arr[idx - 1].zIndex] = [arr[idx - 1].zIndex, arr[idx].zIndex];
        const newPlaced = [...arr];
        const newHistory = get().history.slice(0, get().historyIndex + 1);
        newHistory.push(newPlaced);
        set({ placed: newPlaced, history: newHistory, historyIndex: newHistory.length - 1 });
    },
    toggleSnap: () => set((s) => ({ settings: { ...s.settings, snapToGrid: !s.settings.snapToGrid } })),
    toggleDarkMode: () => set((s) => {
        const next = !s.settings.darkMode;
        if (typeof window !== 'undefined')
            localStorage.setItem('ff-dark', next ? '1' : '0');
        return { settings: { ...s.settings, darkMode: next } };
    }),
    duplicateSelected: () => {
        const id = get().selectedId;
        if (!id)
            return;
        const orig = get().placed.find((p) => p.instanceId === id);
        if (!orig)
            return;
        const clone = { ...orig, instanceId: nanoid(), x: orig.x + 20, y: orig.y + 20, zIndex: get().placed.length, locked: false };
        const newPlaced = [...get().placed, clone];
        const newHistory = get().history.slice(0, get().historyIndex + 1);
        newHistory.push(newPlaced);
        set({ placed: newPlaced, history: newHistory, historyIndex: newHistory.length - 1, selectedId: clone.instanceId });
    },
    toggleLock: (id) => {
        const newPlaced = get().placed.map((p) => p.instanceId === id ? { ...p, locked: !p.locked } : p);
        const newHistory = get().history.slice(0, get().historyIndex + 1);
        newHistory.push(newPlaced);
        set({ placed: newPlaced, history: newHistory, historyIndex: newHistory.length - 1 });
    },
    serializeProject: () => {
        const snapshot = {
            meta: { app: 'FACEGEN++', version: 1, createdAt: new Date().toISOString() },
            settings: get().settings,
            placed: get().placed,
            assetsLibrary: get().assetsLibrary,
        };
        return JSON.stringify(snapshot, null, 2);
    },
    applyProject: (json) => {
        try {
            const parsed = JSON.parse(json);
            if (!parsed || typeof parsed !== 'object')
                return;
            const settings = {
                snapToGrid: !!parsed.settings?.snapToGrid,
                gridSize: parsed.settings?.gridSize ?? 10,
                darkMode: !!parsed.settings?.darkMode,
            };
            const assetsLibrary = parsed.assetsLibrary;
            const placed = parsed.placed.map((p) => ({ ...p }));
            // persist dark mode preference
            if (typeof window !== 'undefined')
                localStorage.setItem('ff-dark', settings.darkMode ? '1' : '0');
            set({
                settings,
                assetsLibrary: assetsLibrary || get().assetsLibrary,
                placed: placed || [],
                selectedId: null,
                history: [placed || []],
                historyIndex: 0,
            });
        }
        catch (e) {
            // ignore invalid
        }
    },
});
export const useEditorStore = create()(creator);
