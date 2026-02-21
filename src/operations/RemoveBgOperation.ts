import { pipeline, RawImage } from '@huggingface/transformers';
import { BaseOperation } from './Operation';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Segmenter = any;

export class RemoveBgOperation extends BaseOperation {
  private static segmenter: Segmenter | null = null;
  private onProgress: (status: string) => void;

  constructor(onProgress: (status: string) => void = () => {}) {
    super();
    this.onProgress = onProgress;
  }

  private async getSegmenter(): Promise<Segmenter> {
    if (!RemoveBgOperation.segmenter) {
      RemoveBgOperation.segmenter = await (pipeline as any)(
        'image-segmentation',
        'briaai/RMBG-1.4',
        {
          progress_callback: (data: { status: string; progress?: number }) => {
            if (data.status === 'progress' && data.progress != null) {
              this.onProgress(`Downloading model... ${Math.round(data.progress)}%`);
            } else if (data.status === 'done') {
              this.onProgress('Loading model...');
            }
          },
        }
      );
    }
    return RemoveBgOperation.segmenter;
  }

  async apply(_ctx: OffscreenCanvasRenderingContext2D, image: ImageBitmap): Promise<ImageBitmap> {
    const segmenter = await this.getSegmenter();

    this.onProgress('Processing...');

    const tmpCanvas = new OffscreenCanvas(image.width, image.height);
    const tmpCtx = tmpCanvas.getContext('2d')!;
    tmpCtx.drawImage(image, 0, 0);
    const blob = await tmpCanvas.convertToBlob({ type: 'image/png' });
    const url = URL.createObjectURL(blob);

    try {
      const result = (await segmenter(url)) as Array<{ label: string; mask: RawImage; score: number }>;
      const mask = result[0].mask;
      const maskData = mask.data as Uint8ClampedArray;

      const outCanvas = new OffscreenCanvas(image.width, image.height);
      const outCtx = outCanvas.getContext('2d')!;
      outCtx.drawImage(image, 0, 0);

      const imageData = outCtx.getImageData(0, 0, image.width, image.height);
      const pixels = imageData.data;

      for (let y = 0; y < image.height; y++) {
        for (let x = 0; x < image.width; x++) {
          const imgIdx = (y * image.width + x) * 4;
          const maskX = Math.round((x * mask.width) / image.width);
          const maskY = Math.round((y * mask.height) / image.height);
          pixels[imgIdx + 3] = maskData[maskY * mask.width + maskX];
        }
      }

      outCtx.putImageData(imageData, 0, 0);
      return this.createImageBitmap(outCanvas);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  getDescription(): string {
    return 'Remove Background';
  }
}
