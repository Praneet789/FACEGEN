import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './components/animations.css';
import { App } from './App';
import { useEditorStore } from './store';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ToastProvider } from './components/ToastProvider';

const Root: React.FC = () => {
  const dark = useEditorStore(s => s.settings.darkMode);
  React.useEffect(() => { useEditorStore.getState().loadDefaultAssets(); }, []);
  return (
    <div className={dark ? 'dark h-full' : 'h-full'}>
      <DndProvider backend={HTML5Backend}>
        <ToastProvider>
          <App />
        </ToastProvider>
      </DndProvider>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(<Root />);
