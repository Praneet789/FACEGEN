import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AssetSidebar } from './components/AssetSidebar';
import { CanvasEditor } from './components/CanvasEditor';
import { Toolbar } from './components/Toolbar';
import { LayerPanel } from './components/LayerPanel';
import { useEditorStore } from './store';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
export const App = () => {
    const dark = useEditorStore(s => s.settings.darkMode);
    useKeyboardShortcuts();
    return (_jsxs("div", { className: `flex flex-col h-full ${dark ? 'dark' : ''}`, children: [_jsx(Toolbar, {}), _jsxs("div", { className: "flex flex-1 overflow-hidden", children: [_jsx(AssetSidebar, {}), _jsx(CanvasEditor, {}), _jsx(LayerPanel, {})] })] }));
};
