import { AdjustmentValues } from '../types';
import { BaseOperation } from './Operation';

export class AdjustOperation extends BaseOperation {
  constructor(private adjustments: AdjustmentValues) {
    super();
  }

  async apply(_ctx: OffscreenCanvasRenderingContext2D, image: ImageBitmap): Promise<ImageBitmap> {
    const canvas = new OffscreenCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get context');

    const { brightness, contrast, saturation } = this.adjustments;
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
    ctx.drawImage(image, 0, 0);

    return this.createImageBitmap(canvas);
  }

  getDescription(): string {
    const { brightness, contrast, saturation } = this.adjustments;
    return `Adjust (B:${brightness}% C:${contrast}% S:${saturation}%)`;
  }

  static buildFilter(adjustments: AdjustmentValues): string {
    const { brightness, contrast, saturation } = adjustments;
    return `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
  }
}
