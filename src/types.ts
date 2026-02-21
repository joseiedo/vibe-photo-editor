export interface Operation {
  apply(ctx: OffscreenCanvasRenderingContext2D, image: ImageBitmap): Promise<ImageBitmap>;
  getDescription(): string;
}

export interface EditorState {
  originalImage: ImageBitmap;
  currentImage: ImageBitmap;
  history: HistoryEntry[];
  historyIndex: number;
}

export interface HistoryEntry {
  image: ImageBitmap;
  description: string;
}

export interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type MergePosition = 'left' | 'right' | 'top' | 'bottom';

export type ShapeType = 'rect' | 'circle';

export interface ShapeData {
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  lineWidth: number;
  filled: boolean;
}

export interface AdjustmentValues {
  brightness: number;
  contrast: number;
  saturation: number;
}
