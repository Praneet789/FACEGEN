import React, { useState, useRef } from 'react';
import { useEditorStore } from '../store';
import type { AssetCategory } from '../types';

const categoryOptions: { value: AssetCategory; label: string }[] = [
  { value: 'accessories', label: 'Accessories' },
  { value: 'hair', label: 'Hair' },
  { value: 'eyes', label: 'Eyes' },
  { value: 'eyebrows', label: 'Eyebrows' },
  { value: 'noses', label: 'Noses' },
  { value: 'mouths', label: 'Mouths' },
  { value: 'mustach', label: 'Mustache' },
  { value: 'face-shapes', label: 'Face Shapes' },
];

export const AddAssetForm: React.FC = () => {
  const addCustomAsset = useEditorStore(s => s.addCustomAsset);
  const [category, setCategory] = useState<AssetCategory>('accessories');
  const [name, setName] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) { setFileError('Not an image'); return; }
    setFileError(null);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
    if (!name) setName(f.name.replace(/\.[^.]+$/, ''));
  };

  const onAdd = () => {
    if (!preview) return;
    const displayName = name.trim() || 'Custom';
    addCustomAsset({ name: displayName, category, src: preview });
    setName('');
    setPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="panel p-3 text-[11px] space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-gray-700 dark:text-gray-200 tracking-wide">Add Custom</div>
        <button type="button" className="btn-ghost text-xs px-2 py-1" onClick={() => { setPreview(null); setName(''); if (fileRef.current) fileRef.current.value=''; }}>Reset</button>
      </div>
      <label className="block group cursor-pointer">
        <div className={`relative flex items-center justify-center h-24 rounded-md border-2 border-dashed ${preview ? 'border-blue-400' : 'border-gray-300 dark:border-gray-600 group-hover:border-blue-400'} bg-white/60 dark:bg-gray-800/40 overflow-hidden`}>
          {!preview && <span className="text-gray-400 group-hover:text-blue-500 text-[11px] text-center px-2">Click or drop image</span>}
          {preview && <img src={preview} alt="preview" className="max-h-full max-w-full object-contain" />}
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
      </label>
      {fileError && <div className="text-red-500">{fileError}</div>}
      <div className="flex gap-2">
        <select value={category} onChange={e => setCategory(e.target.value as AssetCategory)} className="input h-7 text-[11px]">
          {categoryOptions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Name" className="input h-7 text-[11px]" />
      </div>
      <button disabled={!preview} onClick={onAdd} className={`btn w-full h-8 text-xs ${!preview ? 'opacity-50 cursor-not-allowed' : ''}`}>Add Asset</button>
    </div>
  );
};