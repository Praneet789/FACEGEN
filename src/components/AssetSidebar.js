import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { useEditorStore } from '../store';
import { DraggableAsset } from './DraggableAsset';
import { AddAssetForm } from './AddAssetForm';
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
    const [open, setOpen] = React.useState(() => Object.fromEntries(categories.map(c => [c.key, true])));
    const [query, setQuery] = React.useState('');
    const toggle = (k) => setOpen(o => ({ ...o, [k]: !o[k] }));
    const filter = (assets) => assets.filter(a => a.name.toLowerCase().includes(query.toLowerCase()));
    return (_jsxs("aside", { className: "hidden md:block w-72 shrink-0 overflow-y-auto border-r border-white/40 dark:border-gray-800 px-3 py-4 space-y-5 bg-white/60 dark:bg-gray-900/40 backdrop-blur", children: [_jsxs("div", { className: "space-y-3", children: [_jsx(AddAssetForm, {}), _jsx("input", { value: query, onChange: e => setQuery(e.target.value), placeholder: "Search features...", className: "input text-xs", "aria-label": "Search assets" })] }), _jsx("div", { className: "space-y-4", children: categories.map(cat => {
                    const list = filter(assetsLibrary[cat.key]);
                    return (_jsxs("div", { className: "panel overflow-hidden", children: [_jsxs("button", { onClick: () => toggle(cat.key), className: "w-full flex items-center justify-between px-3 py-2 text-[11px] font-semibold tracking-wide uppercase text-gray-600 dark:text-gray-300 hover:bg-brand-50/80 dark:hover:bg-gray-800/40 transition", children: [_jsx("span", { children: cat.label }), _jsx("span", { className: "text-[10px] font-normal bg-brand-600 text-white px-2 py-0.5 rounded-full", children: list.length })] }), open[cat.key] && (_jsxs("div", { className: "p-3 pt-0", children: [list.length === 0 && _jsx("div", { className: "text-[11px] text-gray-400 italic", children: "No assets" }), _jsx("div", { className: "grid grid-cols-3 gap-2 mt-2", children: list.map(asset => (_jsx(DraggableAsset, { asset: asset }, asset.id))) })] }))] }, cat.key));
                }) })] }));
};
