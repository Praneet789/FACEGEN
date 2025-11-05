// Removed duplicate import
import React from 'react';
import { useEditorStore } from '../store';
import { useToast } from './ToastProvider';

export const Toolbar: React.FC = () => {
  const { undo, redo, clearCanvas, toggleSnap, toggleDarkMode, settings } = useEditorStore(s => ({
    undo: s.undo,
    redo: s.redo,
    clearCanvas: s.clearCanvas,
    toggleSnap: s.toggleSnap,
    toggleDarkMode: s.toggleDarkMode,
    settings: s.settings,
  }));
  const { show } = useToast();
  const serializeProject = useEditorStore(s => s.serializeProject);
  const applyProject = useEditorStore(s => s.applyProject);

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
    const width = 800; const height = 800;
    merged.width = width; merged.height = height;
    const ctx = merged.getContext('2d');
    allCanvases.forEach(c => ctx?.drawImage(c as HTMLCanvasElement, 0, 0));
    const link = document.createElement('a');
    link.download = 'composite.png';
    link.href = merged.toDataURL('image/png');
    link.click();
    show('Composite exported (fallback)', { type: 'success' });
  };
  const handleClear = () => { clearCanvas(); show('Canvas cleared', { type: 'info' }); };

  const [isGenerating, setIsGenerating] = React.useState(false);
  const addGeneratedToCanvas = async (imageUrl: string) => {
    try {
      const resp = await fetch(imageUrl);
      const blob = await resp.blob();
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const id = `gen-${Date.now()}`;
        // Place directly on canvas without adding to library
        useEditorStore.getState().addPlaced({ id, name: 'Generated Face', category: 'accessories', src: dataUrl }, { x: 0, y: 0 });
        const img = new Image();
        img.onload = () => {
          const canvasWidth = 800;
          const centeredX = Math.max(0, (canvasWidth - img.naturalWidth) / 2);
          const st = useEditorStore.getState();
          const target = [...st.placed].reverse().find(p => p.src === dataUrl);
          if (target) st.updatePlacedSilent(target.instanceId, { x: centeredX, y: 0 });
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(blob);
    } catch {}
  };

  const handleGenerateRealistic = async () => {
    if (isGenerating) return;
    const stage = (window as any).faceStage;
    if (!stage) { show('Stage not ready', { type: 'error' }); return; }
    try {
      setIsGenerating(true);
      show('Generating realistic face...', { type: 'info' });
      const dataUrl: string = stage.toDataURL({ pixelRatio: 2, mimeType: 'image/png' });
      const resp = await fetch('/api/realistic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUri: dataUrl })
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text);
      }
      const json = await resp.json();
      const url = json?.data?.images?.[0]?.url || json?.data?.image?.url;
      if (url) {
        show('Realistic face ready', { type: 'success' });
        addGeneratedToCanvas(url);
      } else {
        show('No image URL returned', { type: 'error' });
      }
    } catch (e: any) {
      show(`Generation failed: ${e.message}`, { type: 'error' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveProject = () => {
    const json = serializeProject();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `facegen-project-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    show('Project saved', { type: 'success' });
  };

  const importRef = React.useRef<HTMLInputElement | null>(null);
  const handleImportClick = () => importRef.current?.click();
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      applyProject(text);
      show('Project imported', { type: 'success' });
      if (importRef.current) importRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-white/40 dark:border-gray-800/80 bg-white/70 dark:bg-gray-900/50 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-gray-900/40">
      <div className="mx-auto max-w-[1600px] px-4">
        <div className="flex h-14 items-center gap-3">
          <div className="flex items-center gap-1.5">
            <button aria-label="Save composite" onClick={handleSave} className="btn-outline h-9 px-2" title="Save">💾</button>
            <div className="w-px h-5 bg-gray-300 dark:bg-gray-700 mx-1" />
            <button aria-label="Undo" onClick={undo} className="btn-outline h-9 px-2" title="Undo">↺</button>
            <button aria-label="Redo" onClick={redo} className="btn-outline h-9 px-2" title="Redo">↻</button>
            <button aria-label="Clear canvas" onClick={handleClear} className="btn-outline h-9 px-2" title="Clear">🗑️</button>
          </div>

          <div className="flex-1 hidden md:flex items-center justify-center gap-2 text-sm font-semibold tracking-tight text-gray-900 dark:text-gray-100">
            <img
              src="/logo-mark.png"
              alt="FACEGEN++ logo"
              className="h-5 w-5 opacity-80"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
            <span>FACEGEN++</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="segmented" role="group" aria-label="Editor settings">
              <button aria-pressed={settings.snapToGrid} onClick={toggleSnap} title="Snap to grid">Snap</button>
              <button aria-pressed={settings.darkMode} onClick={toggleDarkMode} title="Toggle theme">{settings.darkMode ? 'Dark' : 'Light'}</button>
            </div>
            <button onClick={handleGenerateRealistic} disabled={isGenerating} className="btn h-9 px-3 flex items-center gap-2" title="Generate photorealistic">
              {isGenerating ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
                    <circle className="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
                  </svg>
                  <span className="hidden sm:inline">Generating</span>
                </>
              ) : 'AI'}
            </button>
            <button onClick={handleSaveProject} className="btn-outline h-9 px-3" title="Save project as JSON" aria-label="Save project">⬇️</button>
            <button onClick={handleImportClick} className="btn-outline h-9 px-3" title="Import project JSON" aria-label="Import project">⬆️</button>
            <input ref={importRef} type="file" accept="application/json" className="hidden" onChange={handleImportFile} />
          </div>
        </div>
      </div>
    </header>
  );
};
