import { pipeline, RawImage } from '@huggingface/transformers';
import { BaseOperation } from './Operation';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Segmenter = any;

export interface MaskCache {
  srcWidth: number;
  srcHeight: number;
  data: Uint8ClampedArray;
  maskWidth: number;
  maskHeight: number;
}

export class RemoveBgOperation extends BaseOperation {
  private static segmenter: Segmenter | null = null;
  private static maskCache: MaskCache | null = null;
  private threshold: number;
  private onProgress: (status: string) => void;

  constructor(threshold: number, onProgress: (status: string) => void = () => {}) {
    super();
    this.threshold = threshold;
    this.onProgress = onProgress;
  }

  static clearCache(): void {
    RemoveBgOperation.maskCache = null;
  }

  private static async loadSegmenter(onProgress: (s: string) => void): Promise<Segmenter> {
    if (!RemoveBgOperation.segmenter) {
      RemoveBgOperation.segmenter = await (pipeline as any)(
        'image-segmentation',
        'briaai/RMBG-1.4',
        {
          progress_callback: (data: { status: string; progress?: number }) => {
            if (data.status === 'progress' && data.progress != null) {
              onProgress(`Downloading model... ${Math.round(data.progress)}%`);
            } else if (data.status === 'done') {
              onProgress('Loading model...');
            }
          },
        }
      );
    }
    return RemoveBgOperation.segmenter;
  }

  // Fetches the segmentation mask for image, using the cache when dimensions match.
  static async fetchMask(image: ImageBitmap, onProgress: (s: string) => void): Promise<MaskCache> {
    const cache = RemoveBgOperation.maskCache;
    if (cache && cache.srcWidth === image.width && cache.srcHeight === image.height) {
      return cache;
    }

    const segmenter = await RemoveBgOperation.loadSegmenter(onProgress);
    onProgress('Processing...');

    const tmpCanvas = new OffscreenCanvas(image.width, image.height);
    const tmpCtx = tmpCanvas.getContext('2d')!;
    tmpCtx.drawImage(image, 0, 0);
    const blob = await tmpCanvas.convertToBlob({ type: 'image/png' });
    const url = URL.createObjectURL(blob);

    try {
      const result = (await segmenter(url)) as Array<{ label: string; mask: RawImage; score: number }>;
      const mask = result[0].mask;
      const newCache: MaskCache = {
        srcWidth: image.width,
        srcHeight: image.height,
        data: mask.data as Uint8ClampedArray,
        maskWidth: mask.width,
        maskHeight: mask.height,
      };
      RemoveBgOperation.maskCache = newCache;
      return newCache;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  // Applies mask with threshold to outCanvas (draws image scaled to outCanvas dimensions).
  static applyMask(image: ImageBitmap, mask: MaskCache, threshold: number, outCanvas: OffscreenCanvas): void {
    const outCtx = outCanvas.getContext('2d')!;
    outCtx.clearRect(0, 0, outCanvas.width, outCanvas.height);
    outCtx.drawImage(image, 0, 0, outCanvas.width, outCanvas.height);

    const imageData = outCtx.getImageData(0, 0, outCanvas.width, outCanvas.height);
    const pixels = imageData.data;

    for (let y = 0; y < outCanvas.height; y++) {
      for (let x = 0; x < outCanvas.width; x++) {
        const imgIdx = (y * outCanvas.width + x) * 4;
        const maskX = Math.round((x * mask.maskWidth) / outCanvas.width);
        const maskY = Math.round((y * mask.maskHeight) / outCanvas.height);
        pixels[imgIdx + 3] = mask.data[maskY * mask.maskWidth + maskX] >= threshold ? 255 : 0;
      }
    }

    outCtx.putImageData(imageData, 0, 0);
  }

  async apply(_ctx: OffscreenCanvasRenderingContext2D, image: ImageBitmap): Promise<ImageBitmap> {
    const mask = await RemoveBgOperation.fetchMask(image, this.onProgress);
    const outCanvas = new OffscreenCanvas(image.width, image.height);
    RemoveBgOperation.applyMask(image, mask, this.threshold, outCanvas);
    return this.createImageBitmap(outCanvas);
  }

  getDescription(): string {
    return 'Remove Background';
  }
}
