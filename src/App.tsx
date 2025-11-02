import React from 'react';
import { AssetSidebar } from './components/AssetSidebar';
import { CanvasEditor } from './components/CanvasEditor';
import { Toolbar } from './components/Toolbar';
import { LayerPanel } from './components/LayerPanel';
import { useEditorStore } from './store';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

export const App: React.FC = () => {
  const dark = useEditorStore(s => s.settings.darkMode);
  useKeyboardShortcuts();
  return (
    <div className={`flex flex-col h-full ${dark ? 'dark bg-gray-900' : 'bg-gray-100'}`}>
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <AssetSidebar />
        <CanvasEditor />
        <LayerPanel />
      </div>
    </div>
  );
};
