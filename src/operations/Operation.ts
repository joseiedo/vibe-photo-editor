import { Operation } from '../types';

export abstract class BaseOperation implements Operation {
  abstract apply(ctx: OffscreenCanvasRenderingContext2D, image: ImageBitmap): Promise<ImageBitmap>;
  abstract getDescription(): string;

  protected async createImageBitmap(canvas: OffscreenCanvas): Promise<ImageBitmap> {
    return await createImageBitmap(canvas);
  }
}
