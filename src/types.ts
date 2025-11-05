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
  warp?: {
    rows: number; // number of rows in control grid
    cols: number; // number of cols in control grid
    points: Array<{ x: number; y: number }>; // normalized [0..1] coordinates, length = rows*cols
    editing?: boolean; // if true, show control points for this asset
  };
}

export interface EditorSettings {
  snapToGrid: boolean;
  gridSize: number;
  darkMode: boolean;
}
