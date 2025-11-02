# FACEGEN++ (Prototype)

React + Vite + TypeScript application to build facial composites via drag & drop of modular facial assets.

## Features
- Sidebar of categorized facial assets (placeholder PNGs)
- Drag & drop onto canvas (React DnD + React Konva)
- Move, rotate, scale assets
- Undo / Redo history
- Layer ordering panel (bring forward / send backward)
- Snap-to-grid (toggle)
- Dark mode toggle
- Keyboard shortcuts: Delete (remove), Arrow keys (nudge), Shift+Arrows (bigger nudge)
- Export composite to PNG

## Getting Started
```bash
npm install
npm run dev
```
Open http://localhost:5173

## Roadmap / Improvements
- Higher fidelity assets, vector support
- Better export (merge Konva layers directly via API)
- Facial feature search / filtering
- Shareable JSON for saved composites
- Multi-select, alignment guides, symmetry helpers

## License
Prototype code. Provide attribution if reused.
