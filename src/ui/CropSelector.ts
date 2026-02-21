import { ImageEditor } from '../editor/ImageEditor';
import { CropRegion } from '../types';

export class CropSelector {
  private editor: ImageEditor;
  private overlay: HTMLDivElement;
  private cropBtn: HTMLButtonElement;
  private isActive = false;
  private isDragging = false;
  private startX = 0;
  private startY = 0;
  private selection: CropRegion | null = null;

  constructor(editor: ImageEditor, private onActivate: () => void = () => {}) {
    this.editor = editor;
    this.overlay = document.getElementById('crop-overlay') as HTMLDivElement;
    this.cropBtn = document.getElementById('crop-btn') as HTMLButtonElement;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.cropBtn.addEventListener('click', () => {
      if (this.isActive) {
        this.applyCrop();
      } else {
        this.startCropMode();
      }
    });

    const canvas = this.editor.getPreviewCanvas();
    const container = canvas.parentElement as HTMLElement;

    container.addEventListener('mousedown', (e) => {
      if (!this.isActive) return;
      this.isDragging = true;
      const rect = canvas.getBoundingClientRect();
      this.startX = e.clientX - rect.left;
      this.startY = e.clientY - rect.top;
      this.updateOverlay(this.startX, this.startY, 0, 0);
      this.overlay.classList.remove('hidden');
    });

    container.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const rect = canvas.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;

      const x = Math.min(this.startX, currentX);
      const y = Math.min(this.startY, currentY);
      const width = Math.abs(currentX - this.startX);
      const height = Math.abs(currentY - this.startY);

      this.updateOverlay(x, y, width, height);
    });

    container.addEventListener('mouseup', () => {
      if (!this.isDragging) return;
      this.isDragging = false;
    });

    // Cancel on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isActive) {
        this.cancelCrop();
      }
    });
  }

  private updateOverlay(x: number, y: number, width: number, height: number): void {
    const canvas = this.editor.getPreviewCanvas();
    const rect = canvas.getBoundingClientRect();
    const containerRect = canvas.parentElement!.getBoundingClientRect();

    // Position overlay relative to container, accounting for canvas position
    const offsetX = rect.left - containerRect.left;
    const offsetY = rect.top - containerRect.top;

    this.overlay.style.left = `${offsetX + x}px`;
    this.overlay.style.top = `${offsetY + y}px`;
    this.overlay.style.width = `${width}px`;
    this.overlay.style.height = `${height}px`;

    // Store selection in preview coordinates
    this.selection = { x, y, width, height };
  }

  private startCropMode(): void {
    this.onActivate();
    this.isActive = true;
    this.cropBtn.textContent = 'Apply Crop';
    this.cropBtn.classList.add('btn-primary');
    this.editor.getPreviewCanvas().style.cursor = 'crosshair';
  }

  deactivate(): void {
    if (this.isActive) this.cancelCrop();
  }

  private async applyCrop(): Promise<void> {
    if (this.selection && this.selection.width > 0 && this.selection.height > 0) {
      await this.editor.flushAdjustments();

      // Convert preview coordinates to full-res coordinates
      const scale = this.editor.getPreviewScale();
      const fullResRegion: CropRegion = {
        x: Math.round(this.selection.x / scale),
        y: Math.round(this.selection.y / scale),
        width: Math.round(this.selection.width / scale),
        height: Math.round(this.selection.height / scale),
      };

      await this.editor.crop(fullResRegion);
    }
    this.cancelCrop();
  }

  private cancelCrop(): void {
    this.isActive = false;
    this.isDragging = false;
    this.selection = null;
    this.cropBtn.textContent = 'Crop';
    this.cropBtn.classList.remove('btn-primary');
    this.overlay.classList.add('hidden');
    this.editor.getPreviewCanvas().style.cursor = '';
  }
}
