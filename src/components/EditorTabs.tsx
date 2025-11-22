import React, { useEffect, useState } from 'react';
import { Toolbar } from './Toolbar';
import { AssetSidebar } from './AssetSidebar';
import { CanvasEditor } from './CanvasEditor';
import { LayerPanel } from './LayerPanel';
import { useEditorStore } from '../store';

// Reverted: side vertical expanding navigation bar
export const EditorTabs: React.FC = () => {
  const dark = useEditorStore(s => s.settings.darkMode);
  const [tab, setTab] = useState<'sketch' | 'match' | 'aging'>('sketch');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('tab');
    if (t === 'match' || t === 'aging' || t === 'sketch') setTab(t);
  }, []);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('tab', tab);
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  }, [tab]);

  const items = [
    { key: 'sketch' as const, label: 'Sketch', icon: '🖊️' },
    { key: 'match' as const, label: 'Matching', icon: '🔍', ext: 'https://crimident.preview.emergentagent.com/' },
    { key: 'aging' as const, label: 'Aging', icon: '⏳', ext: 'https://eebc9cf9f391639173.gradio.live/?__theme=light' },
  ];

  return (
    <div className={`flex h-full ${dark ? 'dark bg-gray-900 text-gray-100' : 'bg-gray-100 text-gray-900'}`}>
      <nav className="group relative flex flex-col py-4 gap-2 bg-white/80 dark:bg-gray-900/60 backdrop-blur border-r border-gray-300 dark:border-gray-700 transition-[width] duration-300 w-12 hover:w-48">
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-indigo-300 via-fuchsia-300 to-cyan-300 opacity-50" />
        {items.map(item => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            aria-pressed={tab === item.key}
            className={`relative mx-2 flex items-center gap-3 rounded-lg px-2 h-10 text-sm font-medium transition-colors overflow-hidden ${tab===item.key ? 'bg-gradient-to-r from-indigo-500/15 via-fuchsia-500/15 to-cyan-500/15 text-gray-900 dark:text-gray-100' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100/70 dark:hover:bg-gray-800/40'}`}
          >
            <span className="text-lg w-6 text-center select-none">{item.icon}</span>
            <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">{item.label}</span>
            {tab===item.key && <span className="absolute left-0 top-0 h-full w-[3px] rounded-full bg-gradient-to-b from-indigo-500 via-fuchsia-500 to-cyan-500" />}
            {item.ext && tab===item.key && (
              <a
                href={item.ext}
                target="_blank" rel="noreferrer"
                onClick={e => e.stopPropagation()}
                className="absolute right-2 text-xs underline opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >Open</a>
            )}
          </button>
        ))}
      </nav>
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex-shrink-0">{tab==='sketch'? <Toolbar /> : <div className="h-12" />}</div>
        <div className="flex flex-1 overflow-hidden relative">
          <div className={`absolute inset-0 transition-opacity duration-300 ${tab==='sketch' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className="flex h-full">
              <AssetSidebar />
              <CanvasEditor />
              <LayerPanel />
            </div>
          </div>
          <div className={`absolute inset-0 transition-opacity duration-300 ${tab==='match' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <iframe
              title="Image Matching"
              src="https://crimident.preview.emergentagent.com/"
              className="w-full h-full border-0 bg-white dark:bg-gray-900"
              allow="clipboard-read; clipboard-write; fullscreen"
            />
          </div>
          <div className={`absolute inset-0 transition-opacity duration-300 ${tab==='aging' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <iframe
              title="Aging Model"
              src="https://eebc9cf9f391639173.gradio.live/?__theme=light"
              className="w-full h-full border-0 bg-white dark:bg-gray-900"
              allow="clipboard-read; clipboard-write; fullscreen"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
