import { ShapeData } from '../types';
import { BaseOperation } from './Operation';

export class ShapeOperation extends BaseOperation {
  constructor(private shape: ShapeData) {
    super();
  }

  async apply(_ctx: OffscreenCanvasRenderingContext2D, image: ImageBitmap): Promise<ImageBitmap> {
    const canvas = new OffscreenCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get context');

    ctx.drawImage(image, 0, 0);
    ShapeOperation.draw(ctx, this.shape);

    return this.createImageBitmap(canvas);
  }

  // Also used by ShapeDrawer to render the live preview on the 2D canvas
  static draw(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, shape: ShapeData): void {
    const { x, y, width, height, color, lineWidth, filled } = shape;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lineWidth;

    if (shape.type === 'rect') {
      if (filled) {
        ctx.fillRect(x, y, width, height);
      } else {
        ctx.strokeRect(x, y, width, height);
      }
    } else {
      ctx.beginPath();
      ctx.ellipse(x + width / 2, y + height / 2, Math.abs(width / 2), Math.abs(height / 2), 0, 0, Math.PI * 2);
      if (filled) {
        ctx.fill();
      } else {
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  getDescription(): string {
    return `Draw ${this.shape.type}`;
  }
}
