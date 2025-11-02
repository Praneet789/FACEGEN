import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { useToast } from './ToastProvider';
import { Stage, Layer, Image as KonvaImage, Transformer, Line } from 'react-konva';
import { useDrop } from 'react-dnd';
import { DND_TYPES } from './DraggableAsset';
import { useEditorStore } from '../store';
function useImage(url) {
    const [image, setImage] = React.useState(null);
    React.useEffect(() => {
        const img = new window.Image();
        img.onload = () => setImage(img);
        img.src = url;
    }, [url]);
    return image;
}
const GRID_SIZE = 10;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 800;
export const CanvasEditor = () => {
    const { placed, selectedId, select, updatePlaced, addPlaced, settings, deleteSelected, duplicateSelected, bringForward, sendBackward, toggleLock } = useEditorStore(s => ({
        placed: s.placed,
        selectedId: s.selectedId,
        select: s.select,
        updatePlaced: s.updatePlaced,
        addPlaced: s.addPlaced,
        settings: s.settings,
        deleteSelected: s.deleteSelected,
        duplicateSelected: s.duplicateSelected,
        bringForward: s.bringForward,
        sendBackward: s.sendBackward,
        toggleLock: s.toggleLock,
    }));
    const stageRef = React.useRef(null);
    const trRef = React.useRef(null);
    // expose for toolbar export (simple prototype approach)
    React.useEffect(() => {
        window.faceStage = stageRef.current;
    }, []);
    const [, drop] = useDrop(() => ({
        accept: DND_TYPES.ASSET,
        drop: (item, monitor) => {
            const stage = stageRef.current.getStage();
            const pointer = stage.getPointerPosition();
            if (!pointer)
                return;
            const pos = { x: pointer.x, y: pointer.y };
            addPlaced(item, pos);
        }
    }), [addPlaced]);
    React.useEffect(() => {
        if (!trRef.current)
            return;
        const transformer = trRef.current;
        if (selectedId) {
            const stage = stageRef.current.getStage();
            const selectedNode = stage.findOne(`#node-${selectedId}`);
            if (selectedNode) {
                transformer.nodes([selectedNode]);
                transformer.getLayer()?.batchDraw();
            }
        }
        else {
            // clear nodes to avoid sticky frame
            transformer.nodes([]);
            transformer.getLayer()?.batchDraw();
        }
    }, [selectedId, placed]);
    const onTransformEnd = (node, asset) => {
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        updatePlaced(asset.instanceId, {
            x: node.x(),
            y: node.y(),
            scale: (scaleX + scaleY) / 2,
            rotation: node.rotation(),
        });
        node.scaleX(1);
        node.scaleY(1);
    };
    const handleKey = React.useCallback((e) => {
        if (!selectedId)
            return;
        const asset = placed.find(p => p.instanceId === selectedId);
        if (!asset)
            return;
        const step = e.shiftKey ? 10 : 2;
        let patch = null;
        switch (e.key) {
            case 'Delete':
            case 'Backspace':
                useEditorStore.getState().deleteSelected();
                break;
            case 'ArrowUp':
                patch = { y: asset.y - step };
                break;
            case 'ArrowDown':
                patch = { y: asset.y + step };
                break;
            case 'ArrowLeft':
                patch = { x: asset.x - step };
                break;
            case 'ArrowRight':
                patch = { x: asset.x + step };
                break;
            default: break;
        }
        if (patch)
            updatePlaced(asset.instanceId, patch);
    }, [selectedId, placed, updatePlaced]);
    React.useEffect(() => {
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [handleKey]);
    const renderGrid = () => {
        if (!settings.snapToGrid)
            return null;
        const lines = [];
        for (let i = 0; i < CANVAS_WIDTH / GRID_SIZE; i++) {
            lines.push(_jsx(Line, { points: [i * GRID_SIZE, 0, i * GRID_SIZE, CANVAS_HEIGHT], stroke: "#e5e7eb", strokeWidth: 1, listening: false }, `v-${i}`));
        }
        for (let j = 0; j < CANVAS_HEIGHT / GRID_SIZE; j++) {
            lines.push(_jsx(Line, { points: [0, j * GRID_SIZE, CANVAS_WIDTH, j * GRID_SIZE], stroke: "#e5e7eb", strokeWidth: 1, listening: false }, `h-${j}`));
        }
        return lines;
    };
    const selectedAsset = placed.find(p => p.instanceId === selectedId);
    const { show } = useToast();
    return (_jsx("div", { className: "flex-1 relative flex items-center justify-center px-4 py-6", ref: drop, children: _jsxs("div", { className: "relative shadow-soft rounded-2xl border border-white/50 dark:border-gray-800 bg-white/80 dark:bg-gray-800/70 backdrop-blur-md", style: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT }, children: [_jsxs(Stage, { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, ref: stageRef, className: "rounded-xl bg-[radial-gradient(circle_at_25%_25%,#f8fafc,#e5e7eb)] dark:bg-[radial-gradient(circle_at_25%_25%,#1f2937,#0f172a)]", onMouseDown: (e) => {
                        const clickedOnEmpty = e.target === e.target.getStage();
                        if (clickedOnEmpty)
                            select(null);
                    }, children: [_jsx(Layer, { children: renderGrid() }), _jsxs(Layer, { children: [placed.slice().sort((a, b) => a.zIndex - b.zIndex).map(asset => (_jsx(AssetNode, { asset: asset, isSelected: asset.instanceId === selectedId, onSelect: () => select(asset.instanceId), onTransformEnd: onTransformEnd, settingsSnap: settings.snapToGrid }, asset.instanceId))), selectedId && (_jsx(Transformer, { ref: trRef, rotateEnabled: true, enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'], anchorStroke: "#6366f1", anchorFill: "#ffffff", anchorSize: 8, borderStroke: "#3b82f6", borderDash: [4, 4] }))] })] }), !placed.length && (_jsx("div", { className: "absolute inset-0 flex items-center justify-center pointer-events-none select-none", children: _jsxs("div", { className: "text-center text-gray-600 dark:text-gray-300 text-sm font-medium bg-white/60 dark:bg-gray-800/60 backdrop-blur px-6 py-4 rounded-xl border border-white/50 dark:border-gray-700 shadow-soft animate-fade-in-up", children: [_jsx("p", { className: "mb-1", children: "Drag facial features from the left sidebar" }), _jsx("p", { className: "text-xs opacity-80", children: "Tip: Use Snap for alignment \u2022 Duplicate to iterate" })] }) })), selectedAsset && (_jsx(SelectionOverlay, { asset: selectedAsset, onDelete: () => { deleteSelected(); show('Deleted', { type: 'info' }); }, onDuplicate: () => { duplicateSelected(); show('Duplicated', { type: 'success' }); }, onForward: () => { bringForward(selectedAsset.instanceId); show('Layer up', { type: 'info' }); }, onBackward: () => { sendBackward(selectedAsset.instanceId); show('Layer down', { type: 'info' }); }, onLock: () => { toggleLock(selectedAsset.instanceId); show(selectedAsset.locked ? 'Unlocked' : 'Locked', { type: 'info' }); } }))] }) }));
};
const AssetNode = ({ asset, isSelected, onSelect, onTransformEnd, settingsSnap }) => {
    const image = useImage(asset.src);
    const shapeRef = React.useRef(null);
    React.useEffect(() => {
        if (image && (!asset.naturalWidth || !asset.naturalHeight)) {
            useEditorStore.getState().updatePlacedSilent(asset.instanceId, { naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight });
        }
    }, [image, asset.instanceId, asset.naturalWidth, asset.naturalHeight]);
    React.useEffect(() => {
        if (isSelected && shapeRef.current) {
            shapeRef.current.getLayer().batchDraw();
        }
    }, [isSelected]);
    return (_jsx(KonvaImage, { id: `node-${asset.instanceId}`, image: image ?? undefined, x: asset.x, y: asset.y, scaleX: asset.scale, scaleY: asset.scale, rotation: asset.rotation, draggable: !asset.locked, ref: shapeRef, onClick: onSelect, onTap: onSelect, onDragEnd: e => {
            if (asset.locked)
                return;
            let x = e.target.x();
            let y = e.target.y();
            if (settingsSnap) {
                x = Math.round(x / GRID_SIZE) * GRID_SIZE;
                y = Math.round(y / GRID_SIZE) * GRID_SIZE;
            }
            useEditorStore.getState().updatePlaced(asset.instanceId, { x, y });
        }, onTransformEnd: e => { if (!asset.locked)
            onTransformEnd(e.target, asset); }, listening: true, perfectDrawEnabled: false }));
};
const SelectionOverlay = ({ asset, onDelete, onDuplicate, onForward, onBackward, onLock }) => {
    const natW = asset.naturalWidth || 120;
    const natH = asset.naturalHeight || 120;
    const width = natW * asset.scale;
    const height = natH * asset.scale;
    return (_jsxs("div", { className: "pointer-events-none group", style: { position: 'absolute', left: asset.x, top: asset.y, width, height, transform: `rotate(${asset.rotation}deg)`, transformOrigin: 'top left' }, children: [_jsx("div", { className: "absolute inset-0 pointer-events-none rounded-sm", style: { boxShadow: '0 0 0 2px rgba(99,102,241,0.6), inset 0 0 0 1px rgba(255,255,255,0.35)', border: '1px dashed rgba(255,255,255,0.35)' } }), _jsxs("div", { className: "absolute -top-9 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1 rounded-md bg-white/90 dark:bg-gray-900/90 backdrop-blur border border-white/60 dark:border-gray-700 shadow pointer-events-auto", children: [_jsx("button", { onClick: onDuplicate, className: "text-xs px-2 py-0.5 rounded bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white hover:brightness-110", children: "Dup" }), _jsx("button", { onClick: onForward, className: "text-xs px-2 py-0.5 rounded bg-white/70 dark:bg-gray-700 hover:bg-white dark:hover:bg-gray-600 border border-white/40 dark:border-gray-600", children: "Up" }), _jsx("button", { onClick: onBackward, className: "text-xs px-2 py-0.5 rounded bg-white/70 dark:bg-gray-700 hover:bg-white dark:hover:bg-gray-600 border border-white/40 dark:border-gray-600", children: "Down" }), _jsx("button", { onClick: onLock, className: `text-xs px-2 py-0.5 rounded border ${asset.locked ? 'bg-amber-500 text-white border-amber-600' : 'bg-white/70 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-white/40 dark:border-gray-600 hover:bg-white dark:hover:bg-gray-600'}`, children: asset.locked ? 'Unlock' : 'Lock' }), _jsx("button", { onClick: onDelete, className: "text-xs px-2 py-0.5 rounded bg-rose-500 text-white hover:bg-rose-600", children: "Del" })] })] }));
};
