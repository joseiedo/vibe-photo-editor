import { PencilStroke } from '../types';
import { BaseOperation } from './Operation';

export class PencilOperation extends BaseOperation {
  constructor(private stroke: PencilStroke) {
    super();
  }

  async apply(_ctx: OffscreenCanvasRenderingContext2D, image: ImageBitmap): Promise<ImageBitmap> {
    const canvas = new OffscreenCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get context');

    ctx.drawImage(image, 0, 0);
    PencilOperation.draw(ctx, this.stroke);

    return this.createImageBitmap(canvas);
  }

  // Also used by ShapeDrawer to render the live preview on the 2D canvas
  static draw(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, stroke: PencilStroke): void {
    const { points, color, lineWidth } = stroke;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (points.length < 2) {
      if (points.length === 1) {
        ctx.beginPath();
        ctx.arc(points[0].x, points[0].y, lineWidth / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  getDescription(): string {
    return 'Draw pencil stroke';
  }
}
