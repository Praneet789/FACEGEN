import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useEditorStore } from '../store';
export const LayerPanel = () => {
    const { placed, selectedId, select, bringForward, sendBackward } = useEditorStore(s => ({
        placed: s.placed,
        selectedId: s.selectedId,
        select: s.select,
        bringForward: s.bringForward,
        sendBackward: s.sendBackward,
    }));
    return (_jsxs("aside", { className: "hidden md:block w-64 shrink-0 backdrop-blur-md border-l border-white/40 dark:border-gray-800 overflow-y-auto bg-white/60 dark:bg-gray-900/40 px-3 py-4", children: [_jsxs("h3", { className: "text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-3 flex items-center gap-2", children: ["Layers ", _jsxs("span", { className: "text-[10px] text-gray-400", children: ["(", placed.length, ")"] })] }), _jsx("ul", { className: "space-y-1", children: placed.slice().sort((a, b) => b.zIndex - a.zIndex).map(p => {
                    const active = p.instanceId === selectedId;
                    return (_jsxs("li", { onClick: () => select(p.instanceId), className: `group flex items-center gap-2 text-[11px] px-2 py-1.5 rounded-md cursor-pointer border transition ${active ? 'bg-brand-600 text-white border-brand-600 shadow-sm' : 'bg-white/70 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:border-brand-400 hover:bg-brand-50/70 dark:hover:bg-gray-700/60'}`, children: [_jsx("span", { className: "truncate flex-1", children: p.name }), _jsxs("div", { className: "flex gap-1 opacity-0 group-hover:opacity-100 transition", children: [_jsx("button", { className: "btn-ghost text-[10px] px-2 py-1", title: "Bring Forward", onClick: (e) => { e.stopPropagation(); bringForward(p.instanceId); }, children: "\u25B2" }), _jsx("button", { className: "btn-ghost text-[10px] px-2 py-1", title: "Send Back", onClick: (e) => { e.stopPropagation(); sendBackward(p.instanceId); }, children: "\u25BC" })] })] }, p.instanceId));
                }) })] }));
};
