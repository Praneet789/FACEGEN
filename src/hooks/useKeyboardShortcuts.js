import { useEffect } from 'react';
import { useEditorStore } from '../store';
export function useKeyboardShortcuts() {
    const { undo, redo, deleteSelected } = useEditorStore(s => ({
        undo: s.undo,
        redo: s.redo,
        deleteSelected: s.deleteSelected,
    }));
    useEffect(() => {
        const handler = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                undo();
            }
            else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
                e.preventDefault();
                redo();
            }
            else if (e.key === 'Delete') {
                deleteSelected();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [undo, redo, deleteSelected]);
}
