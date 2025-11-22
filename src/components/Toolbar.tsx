import React from 'react';
import { useEditorStore } from '../store';
import { useToast } from './ToastProvider';
import { enhanceDataUrlWithMetrics } from '../algorithms/localEnhance';

// Targeted icons for PNG export, JSON export (download) and JSON load (upload)
const Icon = {
  Png: () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16v16H4Z" />
      <path d="M12 8v6" />
      <path d="M9 11l3 3 3-3" />
    </svg>
  ), // download arrow into file (PNG export)
  JsonDown: () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16v16H4Z" />
      <path d="M12 6v9" />
      <path d="M9 12l3 3 3-3" />
      <path d="M8 18h8" />
    </svg>
  ), // JSON export (download)
  JsonUp: () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16v16H4Z" />
      <path d="M12 18V9" />
      <path d="M15 13l-3-3-3 3" />
      <path d="M8 6h8" />
    </svg>
  ), // JSON load (upload)
} as const;

export const Toolbar: React.FC = () => {
  const { undo, redo, clearCanvas, toggleSnap, toggleDarkMode, settings, placedLen } = useEditorStore(s => ({
    undo: s.undo,
    redo: s.redo,
    clearCanvas: s.clearCanvas,
    toggleSnap: s.toggleSnap,
    toggleDarkMode: s.toggleDarkMode,
    settings: s.settings,
    placedLen: s.placed.length,
  }));
  const { show } = useToast();

  const handleSave = () => {
    const stage = (window as any).faceStage;
    if (stage) {
      const uri = stage.toDataURL({ pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = 'composite.png';
      link.href = uri;
      link.click();
      show('Composite exported', { type: 'success' });
      return;
    }
    const allCanvases = document.querySelectorAll('canvas');
    const merged = document.createElement('canvas');
    merged.width = 800; merged.height = 800;
    const ctx = merged.getContext('2d');
    allCanvases.forEach(c => ctx?.drawImage(c as HTMLCanvasElement, 0, 0));
    const link = document.createElement('a');
    link.download = 'composite.png';
    link.href = merged.toDataURL('image/png');
    link.click();
    show('Composite exported (fallback)', { type: 'success' });
  };
  const handleClear = () => { clearCanvas(); show('Canvas cleared', { type: 'info' }); };

  const [isEnhancing, setIsEnhancing] = React.useState(false);
  const selectedId = useEditorStore(s => s.selectedId);
  const handleEnhance = async () => {
    if (isEnhancing) return;
    const stage = (window as any).faceStage;
    if (!stage) { show('Stage not ready', { type: 'error' }); return; }
    try {
      setIsEnhancing(true);
      show('Enhancing locally...', { type: 'info' });
      const dataUrl: string = stage.toDataURL({ pixelRatio: 2, mimeType: 'image/png' });
      const { dataUrl: enhanced, metrics } = await enhanceDataUrlWithMetrics(dataUrl, { unsharpAmount: 0.6, unsharpRadius: 2, vignetteStrength: 0.05 });
      const st = useEditorStore.getState();
      if (selectedId) {
        st.updatePlaced(selectedId, { src: enhanced });
        show(`Enhanced (${metrics.tProcessMs}ms)`, { type: 'success' });
      } else {
        show('Select a component to enhance', { type: 'error' });
      }
    } catch (e: any) {
      show(`Enhancement failed: ${e.message}`, { type: 'error' });
    } finally {
      setIsEnhancing(false);
    }
  };

  const btnBase = 'h-9 w-9 flex items-center justify-center rounded-lg text-sm font-medium bg-white/60 dark:bg-gray-800/60 hover:bg-white dark:hover:bg-gray-700 shadow-sm border border-gray-200 dark:border-gray-700 backdrop-blur focus:outline-none focus:ring-2 focus:ring-indigo-500 transition';

  return (
    <div className="relative flex items-center h-16 px-4 gap-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-white/90 via-white/80 to-white/60 dark:from-gray-900/90 dark:via-gray-900/80 dark:to-gray-900/60 backdrop-blur supports-[backdrop-filter]:bg-white/50 dark:supports-[backdrop-filter]:bg-gray-900/50">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 rounded-xl px-3 py-2 bg-white/70 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 shadow-sm backdrop-blur-sm">
          <button aria-label="Export PNG" onClick={handleSave} className={btnBase} title="Export PNG"><Icon.Png /></button>
          <button aria-label="Export JSON" onClick={() => {
            const st = useEditorStore.getState();
            const payload = { version: 1, timestamp: Date.now(), placed: st.placed, settings: st.settings };
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'facegen-sketch.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1500);
            show('JSON exported', { type: 'success' });
          }} className={btnBase} title="Export JSON"><Icon.JsonDown /></button>
          <button aria-label="Load JSON" onClick={() => document.getElementById('fg-json-input')?.click()} className={btnBase} title="Load JSON"><Icon.JsonUp /></button>
          <input id="fg-json-input" type="file" accept="application/json" className="hidden" onChange={e => {
            const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader();
            reader.onload = () => { try { const data = JSON.parse(reader.result as string); if (!Array.isArray(data.placed)) throw new Error('Invalid file'); (useEditorStore.getState() as any).replaceScene(data.placed, data.settings); show('Scene loaded',{type:'success'}); } catch(err:any){ show(`Load failed: ${err.message}`,{type:'error'});} finally { e.target.value=''; } };
            reader.readAsText(file);
          }} />
        </div>
        <div className="hidden md:flex items-center ml-4 pl-4 border-l border-gray-200 dark:border-gray-700">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 tracking-wide">Sketch Builder</span>
          <span className="ml-3 text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-300">{placedLen} assets</span>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-1 rounded-xl px-3 py-2 bg-white/70 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 shadow-sm backdrop-blur-sm">
          <button aria-label="Undo" onClick={undo} className={btnBase} title="Undo">↺</button>
          <button aria-label="Redo" onClick={redo} className={btnBase} title="Redo">↻</button>
          <button aria-label="Clear Canvas" onClick={handleClear} className={`${btnBase} text-rose-600 dark:text-rose-400`} title="Clear Canvas">✖</button>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 rounded-xl px-3 py-2 bg-white/70 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 shadow-sm backdrop-blur-sm">
          <button aria-pressed={settings.snapToGrid} aria-label="Toggle Grid Snap" onClick={toggleSnap} className={`${btnBase} ${settings.snapToGrid ? 'bg-indigo-600 text-white hover:bg-indigo-600' : ''}`} title="Snap to Grid">#</button>
          <button aria-pressed={settings.darkMode} aria-label="Toggle Theme" onClick={toggleDarkMode} className={`${btnBase} ${settings.darkMode ? 'bg-gray-950 text-yellow-300 hover:bg-gray-950' : ''}`} title="Toggle Theme">{settings.darkMode ? '🌙' : '☀️'}</button>
        </div>
        <button aria-label="Enhance Selected" onClick={handleEnhance} disabled={isEnhancing} className="flex items-center gap-2 h-11 px-5 rounded-xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 text-white text-sm font-semibold shadow-md hover:brightness-110 active:scale-[.97] disabled:opacity-50 transition" title="Enhance selected component">
          {isEnhancing ? (
            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path d="M22 12A10 10 0 0 0 12 2" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/></svg>
          ) : '✨'}
          <span className="hidden sm:inline">{isEnhancing ? 'Enhancing' : 'Enhance'}</span>
        </button>
      </div>
    </div>
  );
};
