import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './components/animations.css';
import { App } from './App';
import { useEditorStore } from './store';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ToastProvider } from './components/ToastProvider';
const Root = () => {
    const dark = useEditorStore(s => s.settings.darkMode);
    React.useEffect(() => { useEditorStore.getState().loadDefaultAssets(); }, []);
    return (_jsx("div", { className: dark ? 'dark h-full' : 'h-full', children: _jsx(DndProvider, { backend: HTML5Backend, children: _jsx(ToastProvider, { children: _jsx(App, {}) }) }) }));
};
ReactDOM.createRoot(document.getElementById('root')).render(_jsx(Root, {}));
