import React from 'react';

export interface Toast {
  id: string;
  message: string;
  type?: 'info' | 'success' | 'error';
  ttl?: number; // ms
}

interface ToastContextValue {
  toasts: Toast[];
  show: (msg: string, opts?: Partial<Omit<Toast,'id'|'message'>>) => void;
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts(t => t.filter(x => x.id !== id));
  }, []);

  const show = React.useCallback((message: string, opts: Partial<Omit<Toast,'id'|'message'>> = {}) => {
    const id = crypto.randomUUID();
    const ttl = opts.ttl ?? 3000;
    const toast: Toast = { id, message, type: opts.type || 'info', ttl };
    setToasts(t => [...t, toast]);
    if (ttl > 0) setTimeout(() => dismiss(id), ttl);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toasts, show, dismiss }}>
      {children}
      <div className="fixed z-50 top-4 right-4 flex flex-col gap-2 w-72">
        {toasts.map(t => (
          <div key={t.id} className={`pointer-events-auto px-4 py-3 rounded-lg shadow backdrop-blur border text-sm flex items-start gap-3 animate-fade-in-up select-none
            ${t.type === 'success' ? 'bg-emerald-500/90 text-white border-emerald-400/60' : ''}
            ${t.type === 'error' ? 'bg-rose-500/90 text-white border-rose-400/60' : ''}
            ${t.type === 'info' ? 'bg-gray-800/80 text-white border-gray-700/60' : ''}`}> 
            <span className="flex-1">{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="text-white/70 hover:text-white text-xs">✕</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
