import React from 'react';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { EditorTabs } from './components/EditorTabs';

export const App: React.FC = () => {
  useKeyboardShortcuts();
  return <EditorTabs />;
};
