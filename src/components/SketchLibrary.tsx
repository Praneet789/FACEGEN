import React from 'react';
import { useEditorStore } from '../store';
import type { PlacedAsset, EditorSettings } from '../types';
import { nanoid } from 'nanoid';

interface SnapshotMeta {
  id: string;
  created: number;
  preview: string; // data URL
  placed: PlacedAsset[];
  settings: EditorSettings;
}

function loadSnapshots(): SnapshotMeta[] {
  try {
    const raw = localStorage.getItem('facegen_snapshots');
    if (!raw) return [];
    return JSON.parse(raw) as SnapshotMeta[];
  } catch { return []; }
}
function saveSnapshots(list: SnapshotMeta[]) {
  try { localStorage.setItem('facegen_snapshots', JSON.stringify(list)); } catch {}
}

export const useSnapshots = () => {
  const [snapshots, setSnapshots] = React.useState<SnapshotMeta[]>(() => loadSnapshots());
  const refresh = () => setSnapshots(loadSnapshots());
  return { snapshots, refresh };
};

export const SketchLibrary: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { snapshots, refresh } = useSnapshots();
  const replaceScene = useEditorStore(s => (s as any).replaceScene);
  const handleLoad = (snap: SnapshotMeta) => {
    replaceScene(snap.placed, snap.settings);
    onClose();
  };
  const handleDelete = (id: string) => {
    const next = snapshots.filter(s => s.id !== id);
    saveSnapshots(next);
    refresh();
  };
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-[640px] max-h-[80vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-wide">Saved Sketches</h2>
          <button onClick={onClose} className="btn-ghost px-3 py-1 text-sm">Close</button>
        </div>
        {!snapshots.length && <div className="text-sm text-gray-500 dark:text-gray-400">No saved sketches yet.</div>}
        <div className="grid grid-cols-3 gap-4">
          {snapshots.map(snap => (
            <div key={snap.id} className="group relative border border-gray-300 dark:border-gray-700 rounded-md overflow-hidden bg-gray-50 dark:bg-gray-800">
              <img src={snap.preview} alt="preview" className="w-full h-32 object-cover" />
              <div className="p-2 space-y-1 text-xs">
                <div className="font-medium truncate">{new Date(snap.created).toLocaleString()}</div>
                <div className="flex gap-1">
                  <button onClick={() => handleLoad(snap)} className="px-2 py-0.5 rounded bg-indigo-600 text-white hover:bg-indigo-500">Load</button>
                  <button onClick={() => handleDelete(snap.id)} className="px-2 py-0.5 rounded bg-rose-600 text-white hover:bg-rose-500">Del</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export async function saveCurrentSnapshot(): Promise<boolean> {
  const st = useEditorStore.getState();
  const stage = (window as any).faceStage;
  if (!stage) return false;
  const preview = stage.toDataURL({ pixelRatio: 0.5, mimeType: 'image/png' });
  const snap: SnapshotMeta = {
    id: nanoid(),
    created: Date.now(),
    preview,
    placed: JSON.parse(JSON.stringify(st.placed)),
    settings: JSON.parse(JSON.stringify(st.settings)),
  };
  const existing = loadSnapshots();
  const MAX = 30;
  const next = [snap, ...existing].slice(0, MAX);
  saveSnapshots(next);
  return true;
}
