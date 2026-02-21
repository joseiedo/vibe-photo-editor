import { BaseOperation } from './Operation';

export class FlipOperation extends BaseOperation {
  constructor(private horizontal: boolean) {
    super();
  }

  async apply(_ctx: OffscreenCanvasRenderingContext2D, image: ImageBitmap): Promise<ImageBitmap> {
    const canvas = new OffscreenCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get context');

    ctx.save();
    if (this.horizontal) {
      ctx.translate(image.width, 0);
      ctx.scale(-1, 1);
    } else {
      ctx.translate(0, image.height);
      ctx.scale(1, -1);
    }
    ctx.drawImage(image, 0, 0);
    ctx.restore();

    return this.createImageBitmap(canvas);
  }

  getDescription(): string {
    return this.horizontal ? 'Flip Horizontal' : 'Flip Vertical';
  }
}
