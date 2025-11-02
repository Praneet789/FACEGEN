import { jsx as _jsx } from "react/jsx-runtime";
import { useDrag } from 'react-dnd';
export const DND_TYPES = {
    ASSET: 'ASSET'
};
export const DraggableAsset = ({ asset }) => {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: DND_TYPES.ASSET,
        item: asset,
        collect: (monitor) => ({ isDragging: monitor.isDragging() })
    }), [asset]);
    return (_jsx("button", { ref: drag, type: "button", title: asset.name, className: `group relative cursor-grab rounded-md bg-white/70 dark:bg-gray-700/60 backdrop-blur p-1 flex items-center justify-center transition transform hover:-translate-y-0.5 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-violet-500/60 focus:ring-offset-2 dark:focus:ring-offset-gray-900 shadow ${isDragging ? 'opacity-40' : ''}`, children: _jsx("img", { src: asset.src, alt: asset.name, className: "max-w-full max-h-12 object-contain pointer-events-none drop-shadow group-hover:drop-shadow-lg", draggable: false }) }));
};
