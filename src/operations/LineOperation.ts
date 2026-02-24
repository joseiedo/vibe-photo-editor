import { LineData } from '../types';
import { BaseOperation } from './Operation';

export class LineOperation extends BaseOperation {
  constructor(private line: LineData) {
    super();
  }

  async apply(_ctx: OffscreenCanvasRenderingContext2D, image: ImageBitmap): Promise<ImageBitmap> {
    const canvas = new OffscreenCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get context');

    ctx.drawImage(image, 0, 0);
    LineOperation.draw(ctx, this.line);

    return this.createImageBitmap(canvas);
  }

  // Also used by ShapeDrawer to render the live preview on the 2D canvas
  static draw(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, line: LineData): void {
    ctx.save();
    ctx.strokeStyle = line.color;
    ctx.lineWidth = line.lineWidth;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(line.x1, line.y1);
    ctx.lineTo(line.x2, line.y2);
    ctx.stroke();

    if (line.arrowhead) {
      LineOperation.drawArrowhead(ctx, line.x1, line.y1, line.x2, line.y2, line.color, line.lineWidth);
    }

    ctx.restore();
  }

  static drawArrowhead(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    size: number
  ): void {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const headLen = Math.max(size * 4, 12);

    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  getDescription(): string {
    return 'Draw line';
  }
}
