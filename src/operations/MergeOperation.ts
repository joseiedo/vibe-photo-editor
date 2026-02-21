import { MergePosition } from '../types';
import { BaseOperation } from './Operation';

export class MergeOperation extends BaseOperation {
  constructor(
    private secondImage: ImageBitmap,
    private position: MergePosition
  ) {
    super();
  }

  async apply(_ctx: OffscreenCanvasRenderingContext2D, image: ImageBitmap): Promise<ImageBitmap> {
    let newWidth: number;
    let newHeight: number;
    let firstX = 0;
    let firstY = 0;
    let secondX = 0;
    let secondY = 0;

    // Scale second image to match dimension
    let scaledSecondWidth = this.secondImage.width;
    let scaledSecondHeight = this.secondImage.height;

    if (this.position === 'left' || this.position === 'right') {
      // Match heights
      const scale = image.height / this.secondImage.height;
      scaledSecondWidth = Math.round(this.secondImage.width * scale);
      scaledSecondHeight = image.height;
      newHeight = image.height;
      newWidth = image.width + scaledSecondWidth;

      if (this.position === 'left') {
        firstX = scaledSecondWidth;
        secondX = 0;
      } else {
        firstX = 0;
        secondX = image.width;
      }
    } else {
      // Match widths
      const scale = image.width / this.secondImage.width;
      scaledSecondWidth = image.width;
      scaledSecondHeight = Math.round(this.secondImage.height * scale);
      newWidth = image.width;
      newHeight = image.height + scaledSecondHeight;

      if (this.position === 'top') {
        firstY = scaledSecondHeight;
        secondY = 0;
      } else {
        firstY = 0;
        secondY = image.height;
      }
    }

    const canvas = new OffscreenCanvas(newWidth, newHeight);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get context');

    // Draw first image
    ctx.drawImage(image, firstX, firstY);

    // Draw second image (scaled)
    ctx.drawImage(this.secondImage, secondX, secondY, scaledSecondWidth, scaledSecondHeight);

    return this.createImageBitmap(canvas);
  }

  getDescription(): string {
    return `Merge image (${this.position})`;
  }
}
