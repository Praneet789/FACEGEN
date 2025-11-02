import React from 'react';
import { useDrop } from 'react-dnd';
import { useEditorStore } from '../store';
import type { AssetCategory, AssetDefinition } from '../types';
import { DraggableAsset } from './DraggableAsset';
import { AddAssetForm } from './AddAssetForm';

const categories: { key: AssetCategory; label: string }[] = [
  { key: 'face-shapes', label: 'Face Shapes' },
  { key: 'hair', label: 'Hair' },
  { key: 'eyes', label: 'Eyes' },
  { key: 'eyebrows', label: 'Eyebrows' },
  { key: 'noses', label: 'Noses' },
  { key: 'mouths', label: 'Mouths' },
  { key: 'mustach', label: 'Mustache' },
  { key: 'accessories', label: 'Accessories' },
];

export const AssetSidebar: React.FC = () => {
  const assetsLibrary = useEditorStore(s => s.assetsLibrary);
  const [open, setOpen] = React.useState<Record<string, boolean>>(() => Object.fromEntries(categories.map(c => [c.key, true])));
  const [query, setQuery] = React.useState('');
  const toggle = (k: string) => setOpen(o => ({ ...o, [k]: !o[k] }));
  const filter = (assets: AssetDefinition[]) => assets.filter(a => a.name.toLowerCase().includes(query.toLowerCase()));
  return (
    <aside className="hidden md:block w-72 shrink-0 overflow-y-auto border-r border-white/40 dark:border-gray-800 px-3 py-4 space-y-5 bg-white/60 dark:bg-gray-900/40 backdrop-blur">
      <div className="space-y-3">
        <AddAssetForm />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search features..."
          className="input text-xs"
          aria-label="Search assets"
        />
      </div>
      <div className="space-y-4">
        {categories.map(cat => {
          const list = filter(assetsLibrary[cat.key]);
          return (
            <div key={cat.key} className="panel overflow-hidden">
              <button onClick={() => toggle(cat.key)} className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-semibold tracking-wide uppercase text-gray-600 dark:text-gray-300 hover:bg-brand-50/80 dark:hover:bg-gray-800/40 transition">
                <span>{cat.label}</span>
                <span className="text-[10px] font-normal bg-brand-600 text-white px-2 py-0.5 rounded-full">{list.length}</span>
              </button>
              {open[cat.key] && (
                <div className="p-3 pt-0">
                  {list.length === 0 && <div className="text-[11px] text-gray-400 italic">No assets</div>}
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {list.map(asset => (
                      <DraggableAsset key={asset.id} asset={asset} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
};
