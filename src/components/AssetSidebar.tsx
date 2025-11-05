import React from 'react';
import { useEditorStore } from '../store';
import type { AssetCategory, AssetDefinition } from '../types';
import { DraggableAsset } from './DraggableAsset';

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
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>(() => Object.fromEntries(categories.map(c => [c.key, true])));
  const [active, setActive] = React.useState<AssetCategory | null>(categories[0].key);
  const [query, setQuery] = React.useState('');
  const toggle = (k: string) => setExpanded(o => ({ ...o, [k]: !o[k] }));
  const filter = (assets: AssetDefinition[]) => assets.filter(a => a.name.toLowerCase().includes(query.toLowerCase()));

  const Row: React.FC<{ active?: boolean; onClick?: () => void; children: React.ReactNode }>=({active,onClick,children}) => (
    <div onClick={onClick} className={`flex items-center justify-between text-sm px-2.5 py-1.5 rounded-md cursor-pointer transition select-none ${active ? 'bg-brand-600 text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
      {children}
    </div>
  );

  const FolderIcon = ({ open }: { open: boolean }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0" aria-hidden="true">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1H3V7Z" className="fill-current opacity-70"/>
      <rect x="3" y="9" width="18" height="10" rx="2" className="fill-current"/>
    </svg>
  );

  return (
    <aside className="hidden md:flex w-72 shrink-0 border-r border-white/40 dark:border-gray-800 bg-white/60 dark:bg-gray-900/40 backdrop-blur">
      <div className="flex flex-col w-full h-full p-3 gap-3">
        <div>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search assets"
            className="input text-xs"
            aria-label="Search assets"
          />
        </div>

        <div className="panel p-2 overflow-y-auto flex-1" role="tree" aria-label="Assets Explorer">
          <div className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 px-2 pb-1">Assets</div>
          <div className="space-y-1">
            {categories.map(cat => {
              const list = filter(assetsLibrary[cat.key]);
              const isActive = active === cat.key;
              return (
                <div key={cat.key} role="treeitem" aria-expanded={expanded[cat.key]}>
                  <Row active={isActive} onClick={() => { setActive(cat.key); toggle(cat.key); }}>
                    <div className="flex items-center gap-2">
                      <FolderIcon open={!!expanded[cat.key]} />
                      <span className="text-[12px]">{cat.label}</span>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}>{list.length}</span>
                  </Row>
                  {expanded[cat.key] && (
                    <div className="pl-7 pr-1 pt-1">
                      {list.length === 0 && <div className="text-[11px] text-gray-400 italic">No assets</div>}
                      <div className="grid grid-cols-3 gap-2">
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
        </div>
      </div>
    </aside>
  );
}
