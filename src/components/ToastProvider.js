import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
const ToastContext = React.createContext(undefined);
export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = React.useState([]);
    const dismiss = React.useCallback((id) => {
        setToasts(t => t.filter(x => x.id !== id));
    }, []);
    const show = React.useCallback((message, opts = {}) => {
        const id = crypto.randomUUID();
        const ttl = opts.ttl ?? 3000;
        const toast = { id, message, type: opts.type || 'info', ttl };
        setToasts(t => [...t, toast]);
        if (ttl > 0)
            setTimeout(() => dismiss(id), ttl);
    }, [dismiss]);
    return (_jsxs(ToastContext.Provider, { value: { toasts, show, dismiss }, children: [children, _jsx("div", { className: "fixed z-50 top-4 right-4 flex flex-col gap-2 w-72", children: toasts.map(t => (_jsxs("div", { className: `pointer-events-auto px-4 py-3 rounded-xl shadow-soft backdrop-blur border text-sm flex items-start gap-3 animate-fade-in-up select-none
            ${t.type === 'success' ? 'bg-emerald-500/90 text-white border-emerald-400/60' : ''}
            ${t.type === 'error' ? 'bg-rose-500/90 text-white border-rose-400/60' : ''}
            ${t.type === 'info' ? 'bg-gray-900/85 text-white border-gray-700/60' : ''}`, children: [_jsx("span", { className: "flex-1", children: t.message }), _jsx("button", { onClick: () => dismiss(t.id), className: "text-white/70 hover:text-white text-xs", children: "\u2715" })] }, t.id))) })] }));
};
export function useToast() {
    const ctx = React.useContext(ToastContext);
    if (!ctx)
        throw new Error('useToast must be used inside <ToastProvider>');
    return ctx;
}
