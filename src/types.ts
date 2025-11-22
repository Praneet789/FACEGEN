export type AssetCategory = 'eyes' | 'noses' | 'mouths' | 'eyebrows' | 'hair' | 'mustach' | 'accessories' | 'face-shapes';

export interface AssetDefinition {
  id: string;
  name: string;
  category: AssetCategory;
  src: string; // public relative path
}

export interface PlacedAsset extends AssetDefinition {
  instanceId: string; // unique for each placed occurrence
  x: number;
  y: number;
  scale: number;
  rotation: number;
  zIndex: number;
  locked?: boolean; // when true, cannot be moved/transformed
  naturalWidth?: number; // intrinsic image width
  naturalHeight?: number; // intrinsic image height
}

export interface EditorSettings {
  snapToGrid: boolean;
  gridSize: number;
  darkMode: boolean;
}
