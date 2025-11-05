import React from 'react';
import { useToast } from './ToastProvider';
import { Stage, Layer, Image as KonvaImage, Transformer, Line } from 'react-konva';
import { useDrop } from 'react-dnd';
import { DND_TYPES } from './DraggableAsset';
import { useEditorStore } from '../store';
import type { AssetDefinition, PlacedAsset } from '../types';
import { warpImageToCanvas } from '../utils/meshWarp';

function useImage(url: string) {
  const [image, setImage] = React.useState<HTMLImageElement | null>(null);
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

export const CanvasEditor: React.FC = () => {
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
  const stageRef = React.useRef<any>(null);
  const trRef = React.useRef<any>(null);
  // expose for toolbar export (simple prototype approach)
  React.useEffect(() => {
    (window as any).faceStage = stageRef.current;
  }, []);

  const [, drop] = useDrop(() => ({
    accept: DND_TYPES.ASSET,
    drop: (item: AssetDefinition, monitor) => {
      const stage = stageRef.current.getStage();
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const pos = { x: pointer.x, y: pointer.y };
      addPlaced(item, pos);
    }
  }), [addPlaced]);

  React.useEffect(() => {
    if (!trRef.current) return;
    const transformer = trRef.current;
    if (selectedId) {
      const stage = stageRef.current.getStage();
      const selectedNode = stage.findOne(`#node-${selectedId}`);
      if (selectedNode) {
        transformer.nodes([selectedNode]);
        transformer.getLayer()?.batchDraw();
      }
    } else {
      // clear nodes to avoid sticky frame
      transformer.nodes([]);
      transformer.getLayer()?.batchDraw();
    }
  }, [selectedId, placed]);

  const onTransformEnd = (node: any, asset: PlacedAsset) => {
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    updatePlaced(asset.instanceId, {
      x: node.x(),
      y: node.y(),
      scale: (scaleX + scaleY) / 2,
      rotation: node.rotation(),
    });
    node.scaleX(1); node.scaleY(1);
  };

  const handleKey = React.useCallback((e: KeyboardEvent) => {
    if (!selectedId) return;
    const asset = placed.find(p => p.instanceId === selectedId);
    if (!asset) return;
    const step = e.shiftKey ? 10 : 2;
    let patch: Partial<PlacedAsset> | null = null;
    switch (e.key) {
      case 'Delete': case 'Backspace':
        useEditorStore.getState().deleteSelected();
        break;
      case 'ArrowUp': patch = { y: asset.y - step }; break;
      case 'ArrowDown': patch = { y: asset.y + step }; break;
      case 'ArrowLeft': patch = { x: asset.x - step }; break;
      case 'ArrowRight': patch = { x: asset.x + step }; break;
      default: break;
    }
    if (patch) updatePlaced(asset.instanceId, patch);
  }, [selectedId, placed, updatePlaced]);

  React.useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  const renderGrid = () => {
    if (!settings.snapToGrid) return null;
    const lines = [];
    for (let i = 0; i < CANVAS_WIDTH / GRID_SIZE; i++) {
      lines.push(<Line key={`v-${i}`} points={[i*GRID_SIZE,0,i*GRID_SIZE,CANVAS_HEIGHT]} stroke="#e5e7eb" strokeWidth={1} listening={false} />);
    }
    for (let j = 0; j < CANVAS_HEIGHT / GRID_SIZE; j++) {
      lines.push(<Line key={`h-${j}`} points={[0,j*GRID_SIZE,CANVAS_WIDTH,j*GRID_SIZE]} stroke="#e5e7eb" strokeWidth={1} listening={false} />);
    }
    return lines;
  };

  const selectedAsset = placed.find(p => p.instanceId === selectedId);
  const { show } = useToast();
  return (
    <div className="flex-1 relative flex items-center justify-center px-4 py-6" ref={drop}>
      <div className="relative shadow-soft rounded-2xl border border-white/50 dark:border-gray-800 bg-white/80 dark:bg-gray-800/70 backdrop-blur-md" style={{width: CANVAS_WIDTH, height: CANVAS_HEIGHT}}>
        <Stage
          width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            ref={stageRef}
            className="rounded-xl bg-[radial-gradient(circle_at_25%_25%,#f8fafc,#e5e7eb)] dark:bg-[radial-gradient(circle_at_25%_25%,#1f2937,#0f172a)]"
            onMouseDown={(e) => {
              const clickedOnEmpty = e.target === e.target.getStage();
              if (clickedOnEmpty) select(null);
            }}
          >
          <Layer>{renderGrid()}</Layer>
          <Layer>
            {placed.slice().sort((a,b)=> a.zIndex - b.zIndex).map(asset => (
              <AssetNode key={asset.instanceId} asset={asset} isSelected={asset.instanceId === selectedId} onSelect={() => select(asset.instanceId)} onTransformEnd={onTransformEnd} settingsSnap={settings.snapToGrid} />
            ))}
            {selectedId && (
              <Transformer
                ref={trRef}
                rotateEnabled={true}
                enabledAnchors={[ 'top-left','top-right','bottom-left','bottom-right' ]}
                anchorStroke="#6366f1"
                anchorFill="#ffffff"
                anchorSize={8}
                borderStroke="#3b82f6"
                borderDash={[4,4]}
              />
            )}
          </Layer>
        </Stage>
        {!placed.length && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
            <div className="text-center text-gray-600 dark:text-gray-300 text-sm font-medium bg-white/60 dark:bg-gray-800/60 backdrop-blur px-6 py-4 rounded-xl border border-white/50 dark:border-gray-700 shadow-soft animate-fade-in-up">
              <p className="mb-1">Drag facial features from the left sidebar</p>
              <p className="text-xs opacity-80">Tip: Use Snap for alignment • Duplicate to iterate</p>
            </div>
          </div>
        )}
        {selectedAsset && (
          <SelectionOverlay
            asset={selectedAsset}
            onDelete={() => { deleteSelected(); show('Deleted', { type: 'info' }); }}
            onDuplicate={() => { duplicateSelected(); show('Duplicated', { type: 'success' }); }}
            onForward={() => { bringForward(selectedAsset.instanceId); show('Layer up', { type: 'info' }); }}
            onBackward={() => { sendBackward(selectedAsset.instanceId); show('Layer down', { type: 'info' }); }}
            onLock={() => { toggleLock(selectedAsset.instanceId); show(selectedAsset.locked ? 'Unlocked' : 'Locked', { type: 'info' }); }}
          />
        )}
      </div>
    </div>
  );
};

const AssetNode: React.FC<{ asset: PlacedAsset; isSelected: boolean; onSelect: () => void; onTransformEnd: (node:any, asset: PlacedAsset) => void; settingsSnap: boolean; }> = ({ asset, isSelected, onSelect, onTransformEnd, settingsSnap }) => {
  const image = useImage(asset.src);
  const shapeRef = React.useRef<any>(null);
  const warpedCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
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
  const renderedImage = React.useMemo(() => {
    if (!image) return undefined;
    if (!asset.warp || !asset.naturalWidth || !asset.naturalHeight) return image;
    if (!warpedCanvasRef.current) warpedCanvasRef.current = document.createElement('canvas');
    warpImageToCanvas(image, warpedCanvasRef.current, asset.warp.rows, asset.warp.cols, asset.warp.points);
    // Konva accepts HTMLCanvasElement for image prop as well
    return (warpedCanvasRef.current as unknown) as HTMLImageElement;
  }, [image, asset.warp, asset.naturalWidth, asset.naturalHeight]);

  return (
    <KonvaImage
      id={`node-${asset.instanceId}`}
      image={renderedImage ?? undefined}
      x={asset.x}
      y={asset.y}
      scaleX={asset.scale}
      scaleY={asset.scale}
      rotation={asset.rotation}
      draggable={!asset.locked}
      ref={shapeRef}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={e => {
        if (asset.locked) return;
        let x = e.target.x();
        let y = e.target.y();
        if (settingsSnap) {
          x = Math.round(x / GRID_SIZE) * GRID_SIZE;
          y = Math.round(y / GRID_SIZE) * GRID_SIZE;
        }
        useEditorStore.getState().updatePlaced(asset.instanceId, { x, y });
      }}
      onTransformEnd={e => { if (!asset.locked) onTransformEnd(e.target, asset); }}
      listening={true}
      perfectDrawEnabled={false}
    />
  );
};
interface SelectionOverlayProps {
  asset: PlacedAsset;
  onDelete: () => void;
  onDuplicate: () => void;
  onForward: () => void;
  onBackward: () => void;
  onLock: () => void;
}

const SelectionOverlay: React.FC<SelectionOverlayProps> = ({ asset, onDelete, onDuplicate, onForward, onBackward, onLock }) => {
  const natW = asset.naturalWidth || 120;
  const natH = asset.naturalHeight || 120;
  const width = natW * asset.scale;
  const height = natH * asset.scale;
  const warp = asset.warp;
  const rows = warp?.rows ?? 3;
  const cols = warp?.cols ?? 3;
  const points = React.useMemo(() => {
    if (warp?.points) return warp.points;
    const pts: {x:number;y:number}[] = [];
    for (let r=0;r<rows;r++) {
      for (let c=0;c<cols;c++) pts.push({ x: c/(cols-1), y: r/(rows-1) });
    }
    return pts;
  }, [warp?.points, rows, cols]);

  const setWarp = (updater: (pts: {x:number;y:number}[]) => {x:number;y:number}[]) => {
    const updated = updater(points.slice());
    useEditorStore.getState().updatePlaced(asset.instanceId, { warp: { rows, cols, points: updated, editing: true } });
  };

  const handleToggleWarp = () => {
    useEditorStore.getState().updatePlaced(asset.instanceId, { warp: { rows, cols, points, editing: !(warp?.editing) } });
  };
  const handleResetWarp = () => {
    const pts: {x:number;y:number}[] = [];
    for (let r=0;r<rows;r++) for (let c=0;c<cols;c++) pts.push({ x: c/(cols-1), y: r/(rows-1) });
    useEditorStore.getState().updatePlaced(asset.instanceId, { warp: { rows, cols, points: pts, editing: true } });
  };
  return (
    <div className="pointer-events-none group" style={{ position:'absolute', left: asset.x, top: asset.y, width, height, transform:`rotate(${asset.rotation}deg)`, transformOrigin:'top left' }}>
      <div className="absolute inset-0 pointer-events-none rounded-sm" style={{ boxShadow:'0 0 0 2px rgba(99,102,241,0.6), inset 0 0 0 1px rgba(255,255,255,0.35)', border:'1px dashed rgba(255,255,255,0.35)' }} />
      <div className="absolute -top-9 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1 rounded-md bg-white/90 dark:bg-gray-900/90 backdrop-blur border border-white/60 dark:border-gray-700 shadow pointer-events-auto">
        <button onClick={onDuplicate} className="text-xs px-2 py-0.5 rounded bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white hover:brightness-110">Dup</button>
        <button onClick={onForward} className="text-xs px-2 py-0.5 rounded bg-white/70 dark:bg-gray-700 hover:bg-white dark:hover:bg-gray-600 border border-white/40 dark:border-gray-600">Up</button>
        <button onClick={onBackward} className="text-xs px-2 py-0.5 rounded bg-white/70 dark:bg-gray-700 hover:bg-white dark:hover:bg-gray-600 border border-white/40 dark:border-gray-600">Down</button>
        <button onClick={onLock} className={`text-xs px-2 py-0.5 rounded border ${asset.locked ? 'bg-amber-500 text-white border-amber-600' : 'bg-white/70 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-white/40 dark:border-gray-600 hover:bg-white dark:hover:bg-gray-600'}`}>{asset.locked ? 'Unlock' : 'Lock'}</button>
        <button onClick={handleToggleWarp} className={`text-xs px-2 py-0.5 rounded border ${warp?.editing ? 'bg-brand-600 text-white border-brand-600' : 'bg-white/70 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-white/40 dark:border-gray-600 hover:bg-white dark:hover:bg-gray-600'}`}>{warp?.editing ? 'Warp: On' : 'Warp'}</button>
        {warp?.editing && (
          <button onClick={handleResetWarp} className="text-xs px-2 py-0.5 rounded bg-white/70 dark:bg-gray-700 hover:bg-white dark:hover:bg-gray-600 border border-white/40 dark:border-gray-600">Reset</button>
        )}
        <button onClick={onDelete} className="text-xs px-2 py-0.5 rounded bg-rose-500 text-white hover:bg-rose-600">Del</button>
      </div>
      {warp?.editing && (
        <div className="absolute inset-0 pointer-events-auto">
          {points.map((p, idx) => {
            const cx = p.x * width;
            const cy = p.y * height;
            const onPointerDown = (e: React.MouseEvent) => {
              e.preventDefault(); e.stopPropagation();
              const start = { x: e.clientX, y: e.clientY };
              const startPt = { x: p.x, y: p.y };
              const onMove = (ev: MouseEvent) => {
                const dx = (ev.clientX - start.x) / width;
                const dy = (ev.clientY - start.y) / height;
                setWarp((pts) => { pts[idx] = { x: Math.max(0, Math.min(1, startPt.x + dx)), y: Math.max(0, Math.min(1, startPt.y + dy)) }; return pts; });
              };
              const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
              window.addEventListener('mousemove', onMove);
              window.addEventListener('mouseup', onUp);
            };
            return (
              <div key={idx} className="absolute -translate-x-1.5 -translate-y-1.5 w-3 h-3 rounded-full bg-brand-500 shadow-soft border border-white/70 cursor-pointer" style={{ left: cx, top: cy }} onMouseDown={onPointerDown} />
            );
          })}
          {Array.from({ length: rows }).map((_, r) => (
            <div key={`r-${r}`} className="absolute left-0 right-0 h-px bg-white/50 dark:bg-gray-700/70" style={{ top: points[r*cols].y * height }} />
          ))}
          {Array.from({ length: cols }).map((_, c) => (
            <div key={`c-${c}`} className="absolute top-0 bottom-0 w-px bg-white/50 dark:bg-gray-700/70" style={{ left: points[c].x * width }} />
          ))}
        </div>
      )}
    </div>
  );
};
