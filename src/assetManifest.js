// Helper to build a numbered sequence only (no group variants)
const seq = (opts) => {
    const { prefix, folder, category, count, pad = 2, label } = opts;
    const out = [];
    for (let i = 1; i <= count; i++) {
        const code = i.toString().padStart(pad, '0');
        out.push({ id: `${prefix}-${code}`, name: `${label || prefix} ${code}`, category, src: `/assets/${folder}/${code}.png` });
    }
    return out;
};
// Core sets only (groups & placeholders removed)
const eyes = seq({ prefix: 'eyes', folder: 'eyes', category: 'eyes', count: 12, label: 'Eyes' });
const eyebrows = seq({ prefix: 'brow', folder: 'eyebrows', category: 'eyebrows', count: 12, label: 'Brow' });
const hair = seq({ prefix: 'hair', folder: 'hair', category: 'hair', count: 12, label: 'Hair' });
const mustach = seq({ prefix: 'mustach', folder: 'mustach', category: 'mustach', count: 12, label: 'Mustache' });
const noses = seq({ prefix: 'nose', folder: 'nose', category: 'noses', count: 12, label: 'Nose' });
const mouths = seq({ prefix: 'lips', folder: 'lips', category: 'mouths', count: 12, label: 'Lips' });
const faceShapes = seq({ prefix: 'head', folder: 'head', category: 'face-shapes', count: 10, label: 'Head' });
// Accessories ("more") basic numbered variants only (excluding previous Group files)
const accessories = seq({ prefix: 'more', folder: 'more', category: 'accessories', count: 6, label: 'More' });
export const assetManifest = {
    eyes,
    noses,
    mouths,
    eyebrows,
    hair,
    mustach,
    accessories,
    'face-shapes': faceShapes,
};
