import { BaseOperation } from './Operation';

export class RotateOperation extends BaseOperation {
  constructor(private degrees: number) {
    super();
  }

  async apply(_ctx: OffscreenCanvasRenderingContext2D, image: ImageBitmap): Promise<ImageBitmap> {
    const radians = (this.degrees * Math.PI) / 180;
    const sin = Math.abs(Math.sin(radians));
    const cos = Math.abs(Math.cos(radians));

    // Calculate new dimensions
    const newWidth = Math.round(image.width * cos + image.height * sin);
    const newHeight = Math.round(image.width * sin + image.height * cos);

    const canvas = new OffscreenCanvas(newWidth, newHeight);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get context');

    ctx.save();
    ctx.translate(newWidth / 2, newHeight / 2);
    ctx.rotate(radians);
    ctx.drawImage(image, -image.width / 2, -image.height / 2);
    ctx.restore();

    return this.createImageBitmap(canvas);
  }

  getDescription(): string {
    return `Rotate ${this.degrees}°`;
  }
}
