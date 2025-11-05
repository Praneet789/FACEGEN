import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { useEditorStore } from '../store';
import { DraggableAsset } from './DraggableAsset';
const categories = [
    { key: 'face-shapes', label: 'Face Shapes' },
    { key: 'hair', label: 'Hair' },
    { key: 'eyes', label: 'Eyes' },
    { key: 'eyebrows', label: 'Eyebrows' },
    { key: 'noses', label: 'Noses' },
    { key: 'mouths', label: 'Mouths' },
    { key: 'mustach', label: 'Mustache' },
    { key: 'accessories', label: 'Accessories' },
];
export const AssetSidebar = () => {
    const assetsLibrary = useEditorStore(s => s.assetsLibrary);
    const [expanded, setExpanded] = React.useState(() => Object.fromEntries(categories.map(c => [c.key, true])));
    const [active, setActive] = React.useState(categories[0].key);
    const [query, setQuery] = React.useState('');
    const toggle = (k) => setExpanded(o => ({ ...o, [k]: !o[k] }));
    const filter = (assets) => assets.filter(a => a.name.toLowerCase().includes(query.toLowerCase()));
    const Row = ({ active, onClick, children }) => (_jsx("div", { onClick: onClick, className: `flex items-center justify-between text-sm px-2.5 py-1.5 rounded-md cursor-pointer transition select-none ${active ? 'bg-brand-600 text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'}`, children: children }));
    const FolderIcon = ({ open }) => (_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", className: "shrink-0", "aria-hidden": "true", children: [_jsx("path", { d: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1H3V7Z", className: "fill-current opacity-70" }), _jsx("rect", { x: "3", y: "9", width: "18", height: "10", rx: "2", className: "fill-current" })] }));
    return (_jsx("aside", { className: "hidden md:flex w-72 shrink-0 border-r border-white/40 dark:border-gray-800 bg-white/60 dark:bg-gray-900/40 backdrop-blur", children: _jsxs("div", { className: "flex flex-col w-full h-full p-3 gap-3", children: [_jsx("div", { children: _jsx("input", { value: query, onChange: e => setQuery(e.target.value), placeholder: "Search assets", className: "input text-xs", "aria-label": "Search assets" }) }), _jsxs("div", { className: "panel p-2 overflow-y-auto flex-1", role: "tree", "aria-label": "Assets Explorer", children: [_jsx("div", { className: "text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 px-2 pb-1", children: "Assets" }), _jsx("div", { className: "space-y-1", children: categories.map(cat => {
                                const list = filter(assetsLibrary[cat.key]);
                                const isActive = active === cat.key;
                                return (_jsxs("div", { role: "treeitem", "aria-expanded": expanded[cat.key], children: [_jsxs(Row, { active: isActive, onClick: () => { setActive(cat.key); toggle(cat.key); }, children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(FolderIcon, { open: !!expanded[cat.key] }), _jsx("span", { className: "text-[12px]", children: cat.label })] }), _jsx("span", { className: `text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`, children: list.length })] }), expanded[cat.key] && (_jsxs("div", { className: "pl-7 pr-1 pt-1", children: [list.length === 0 && _jsx("div", { className: "text-[11px] text-gray-400 italic", children: "No assets" }), _jsx("div", { className: "grid grid-cols-3 gap-2", children: list.map(asset => (_jsx(DraggableAsset, { asset: asset }, asset.id))) })] }))] }, cat.key));
                            }) })] })] }) }));
};
