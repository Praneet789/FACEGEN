import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef } from 'react';
import { useEditorStore } from '../store';
const categoryOptions = [
    { value: 'accessories', label: 'Accessories' },
    { value: 'hair', label: 'Hair' },
    { value: 'eyes', label: 'Eyes' },
    { value: 'eyebrows', label: 'Eyebrows' },
    { value: 'noses', label: 'Noses' },
    { value: 'mouths', label: 'Mouths' },
    { value: 'mustach', label: 'Mustache' },
    { value: 'face-shapes', label: 'Face Shapes' },
];
export const AddAssetForm = () => {
    const addCustomAsset = useEditorStore(s => s.addCustomAsset);
    const [category, setCategory] = useState('accessories');
    const [name, setName] = useState('');
    const [preview, setPreview] = useState(null);
    const [fileError, setFileError] = useState(null);
    const fileRef = useRef(null);
    const onFile = (e) => {
        const f = e.target.files?.[0];
        if (!f)
            return;
        if (!f.type.startsWith('image/')) {
            setFileError('Not an image');
            return;
        }
        setFileError(null);
        const reader = new FileReader();
        reader.onload = () => setPreview(reader.result);
        reader.readAsDataURL(f);
        if (!name)
            setName(f.name.replace(/\.[^.]+$/, ''));
    };
    const onAdd = () => {
        if (!preview)
            return;
        const displayName = name.trim() || 'Custom';
        addCustomAsset({ name: displayName, category, src: preview });
        setName('');
        setPreview(null);
        if (fileRef.current)
            fileRef.current.value = '';
    };
    return (_jsxs("div", { className: "panel p-3 text-[11px] space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("div", { className: "font-semibold text-gray-700 dark:text-gray-200 tracking-wide", children: "Add Custom" }), _jsx("button", { type: "button", className: "btn-ghost text-xs px-2 py-1", onClick: () => { setPreview(null); setName(''); if (fileRef.current)
                            fileRef.current.value = ''; }, children: "Reset" })] }), _jsxs("label", { className: "block group cursor-pointer", children: [_jsxs("div", { className: `relative flex items-center justify-center h-24 rounded-md border-2 border-dashed ${preview ? 'border-blue-400' : 'border-gray-300 dark:border-gray-600 group-hover:border-blue-400'} bg-white/60 dark:bg-gray-800/40 overflow-hidden`, children: [!preview && _jsx("span", { className: "text-gray-400 group-hover:text-blue-500 text-[11px] text-center px-2", children: "Click or drop image" }), preview && _jsx("img", { src: preview, alt: "preview", className: "max-h-full max-w-full object-contain" })] }), _jsx("input", { ref: fileRef, type: "file", accept: "image/*", onChange: onFile, className: "hidden" })] }), fileError && _jsx("div", { className: "text-red-500", children: fileError }), _jsxs("div", { className: "flex gap-2", children: [_jsx("select", { value: category, onChange: e => setCategory(e.target.value), className: "input h-7 text-[11px]", children: categoryOptions.map(c => _jsx("option", { value: c.value, children: c.label }, c.value)) }), _jsx("input", { value: name, onChange: e => setName(e.target.value), placeholder: "Name", className: "input h-7 text-[11px]" })] }), _jsx("button", { disabled: !preview, onClick: onAdd, className: `btn w-full h-8 text-xs ${!preview ? 'opacity-50 cursor-not-allowed' : ''}`, children: "Add Asset" })] }));
};
