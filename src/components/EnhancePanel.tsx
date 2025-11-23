import React from 'react';
import { useToast } from './ToastProvider';

const DEFAULT_PROMPT = [
  'Convert this black and white image into a realistic color photograph.',
  'Preserve identity perfectly. Restore natural skin tone, hair color, and eye color.',
  'Do not change pose or facial structure. Make it look like a natural real photo.'
].join(' ');

interface EnhancePanelProps {
  isOpen: boolean;
  onClose: () => void;
  requestComposite: () => Promise<string | null> | string | null;
  canvasSize: { width: number; height: number };
  cooldownMs?: number;
  onStartCooldown?: (ms: number) => void;
}

interface GeminiResponse {
  success?: boolean;
  image?: string;
  error?: string;
  model?: string;
  prompt?: string;
  detail?: unknown;
  retryAfterMs?: number;
  status?: number;
}

export const EnhancePanel: React.FC<EnhancePanelProps> = ({ isOpen, onClose, requestComposite, canvasSize, cooldownMs = 0, onStartCooldown }) => {
  const [prompt, setPrompt] = React.useState(DEFAULT_PROMPT);
  const [ethnicity, setEthnicity] = React.useState('');
  const [age, setAge] = React.useState('');
  const [lighting, setLighting] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [resultUrl, setResultUrl] = React.useState<string | null>(null);
  const [lastModel, setLastModel] = React.useState<string | undefined>(undefined);
  const [lastPrompt, setLastPrompt] = React.useState<string | undefined>(undefined);
  const { show } = useToast();

  React.useEffect(() => {
    if (!isOpen) {
      setLoading(false);
      setError(null);
    }
  }, [isOpen]);

  const buildPrompt = React.useCallback(() => {
    const additions: string[] = [];
    if (ethnicity.trim()) additions.push(`Ethnicity: ${ethnicity.trim()}.`);
    if (age.trim()) additions.push(`Age context: ${age.trim()}.`);
    if (lighting.trim()) additions.push(`Lighting preference: ${lighting.trim()}.`);
    if (notes.trim()) additions.push(notes.trim());
    const extra = additions.length ? `Additional context: ${additions.join(' ')}` : '';
    return [prompt.trim(), extra].filter(Boolean).join('\n\n');
  }, [prompt, ethnicity, age, lighting, notes]);

  const handleGenerate = async () => {
    if (loading || cooldownMs > 0) return;
    setError(null);
    setResultUrl(null);
    const composite = await Promise.resolve(requestComposite());
    if (!composite) {
      const message = 'Unable to capture the current canvas.';
      setError(message);
      show(message, { type: 'error' });
      return;
    }
    setLoading(true);
    const finalPrompt = buildPrompt();
    try {
      show('Sending to Gemini…', { type: 'info' });
      const resp = await fetch('/api/gemini/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUri: composite, prompt: finalPrompt })
      });
      const data: GeminiResponse = await resp.json();
      if (!resp.ok || !data.success || !data.image) {
        const detailMessage = data.error || (data.detail && typeof data.detail === 'object' ? JSON.stringify(data.detail) : '') || 'Gemini enhancement failed.';
        setError(detailMessage);
        show(detailMessage, { type: 'error' });
        if (resp.status === 429 || data.status === 429) {
          const waitMs = typeof data.retryAfterMs === 'number' && data.retryAfterMs > 0 ? data.retryAfterMs : 60000;
          onStartCooldown?.(waitMs);
        }
      } else {
        setResultUrl(data.image);
        setLastModel(data.model);
        setLastPrompt(finalPrompt);
        show('Gemini image ready.', { type: 'success' });
        onStartCooldown?.(15000);
      }
    } catch (err: any) {
      const message = err?.message ?? 'Gemini request failed.';
      setError(message);
      show(message, { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!resultUrl) return;
    const link = document.createElement('a');
    link.href = resultUrl;
    link.download = 'facegen-gemini.png';
    link.click();
  };

  const handleCopy = async () => {
    if (!resultUrl) return;
    try {
      await navigator.clipboard.writeText(resultUrl);
      show('Image data URL copied.', { type: 'success' });
    } catch (err: any) {
      const message = err?.message ?? 'Copy failed.';
      show(message, { type: 'error' });
    }
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-20 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}
        onClick={onClose}
      />
      <aside
        className={`fixed top-0 right-0 z-30 h-full w-[min(420px,100%)] transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'}`}
        aria-hidden={!isOpen}
      >
        <div className="flex h-full flex-col bg-white/95 dark:bg-gray-900/95 border-l border-gray-200 dark:border-gray-800 shadow-2xl">
          <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            <div>
              <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Gemini Enhance</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Send the current canvas to Gemini with contextual guidance.</p>
            </div>
            <button onClick={onClose} className="text-xs px-2 py-1 rounded bg-white/70 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-700">Close</button>
          </header>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 text-sm">
            <section className="space-y-2">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Base Prompt</label>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-800/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </section>
            <section className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Ethnicity</label>
                <input
                  value={ethnicity}
                  onChange={e => setEthnicity(e.target.value)}
                  placeholder="e.g. Afro-Caribbean"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-800/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Age Range</label>
                <input
                  value={age}
                  onChange={e => setAge(e.target.value)}
                  placeholder="e.g. mid 30s"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-800/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Lighting / Mood</label>
                <input
                  value={lighting}
                  onChange={e => setLighting(e.target.value)}
                  placeholder="e.g. neutral studio lighting"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-800/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Additional Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Any other attributes to preserve or adjust"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-800/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            </section>
            {error && (
              <div className="rounded-lg border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/30 px-3 py-2 text-xs text-rose-600 dark:text-rose-300">
                {error}
              </div>
            )}
            <button
              onClick={handleGenerate}
              disabled={loading || cooldownMs > 0}
              className={`w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition ${(loading || cooldownMs > 0) ? 'bg-indigo-400 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-500'}`}
            >
              {loading && <span className="inline-flex h-4 w-4 animate-spin border-2 border-white/70 border-t-transparent rounded-full" />}
              {loading ? 'Generating…' : cooldownMs > 0 ? `Wait ${Math.ceil(cooldownMs / 1000)}s` : 'Generate with Gemini'}
            </button>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              The captured canvas is {canvasSize.width}×{canvasSize.height}px. The request is sent with your custom prompt and optional context. API key must be defined in <code>.env</code> as <code>GEMINI_API_KEY</code>.
            </p>
          </div>
          <footer className="border-t border-gray-200 dark:border-gray-800 px-4 py-4 space-y-3">
            {resultUrl ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-50 dark:bg-gray-800/40">
                  <img src={resultUrl} alt="Gemini result" className="w-full object-contain" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={handleDownload} className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-800/70 text-sm hover:bg-white dark:hover:bg-gray-700">Download</button>
                  <button onClick={handleCopy} className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-800/70 text-sm hover:bg-white dark:hover:bg-gray-700">Copy to clipboard</button>
                  <a
                    href={resultUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-800/70 text-sm hover:bg-white dark:hover:bg-gray-700"
                  >
                    Open in new tab
                  </a>
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 space-y-1">
                  {lastModel && <div><span className="font-semibold">Model:</span> {lastModel}</div>}
                  {lastPrompt && <details className="space-y-1">
                    <summary className="cursor-pointer">Prompt used</summary>
                    <pre className="whitespace-pre-wrap break-words bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2">{lastPrompt}</pre>
                  </details>}
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {loading ? 'Waiting for Gemini response…' : 'Generated image will appear here once ready.'}
              </div>
            )}
          </footer>
        </div>
      </aside>
    </>
  );
};
