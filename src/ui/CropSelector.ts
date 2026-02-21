import { ImageEditor } from '../editor/ImageEditor';
import { CropRegion } from '../types';

type Handle = 'nw' | 'ne' | 'sw' | 'se';
type DragType = 'move' | Handle;

interface Box { x: number; y: number; width: number; height: number; }

const MIN_SIZE = 24;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export class CropSelector {
  private editor: ImageEditor;
  private overlay: HTMLDivElement;
  private cropBtn: HTMLButtonElement;
  private isActive = false;
  private box: Box = { x: 0, y: 0, width: 0, height: 0 };
  private dragType: DragType | null = null;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragStartBox: Box = { x: 0, y: 0, width: 0, height: 0 };

  constructor(editor: ImageEditor, private onActivate: () => void = () => {}) {
    this.editor = editor;
    this.overlay = document.getElementById('crop-overlay') as HTMLDivElement;
    this.cropBtn = document.getElementById('crop-btn') as HTMLButtonElement;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.cropBtn.addEventListener('click', () => {
      if (this.isActive) this.applyCrop();
      else this.startCropMode();
    });

    // Overlay body → move
    this.overlay.addEventListener('mousedown', (e) => {
      if (!(e.target as HTMLElement).classList.contains('crop-handle')) {
        this.beginDrag(e.clientX, e.clientY, 'move');
      }
    });
    this.overlay.addEventListener('touchstart', (e) => {
      if (!(e.target as HTMLElement).classList.contains('crop-handle')) {
        e.preventDefault();
        this.beginDrag(e.touches[0].clientX, e.touches[0].clientY, 'move');
      }
    }, { passive: false });

    // Corner handles → resize
    for (const handle of ['nw', 'ne', 'sw', 'se'] as Handle[]) {
      const el = this.overlay.querySelector(`.crop-handle-${handle}`) as HTMLElement;
      el.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        this.beginDrag(e.clientX, e.clientY, handle);
      });
      el.addEventListener('touchstart', (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.beginDrag(e.touches[0].clientX, e.touches[0].clientY, handle);
      }, { passive: false });
    }

    // Global move / end
    document.addEventListener('mousemove', (e) => this.onMove(e.clientX, e.clientY));
    document.addEventListener('mouseup', () => { this.dragType = null; });

    document.addEventListener('touchmove', (e) => {
      if (!this.dragType) return;
      e.preventDefault();
      this.onMove(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
    document.addEventListener('touchend', () => { this.dragType = null; });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isActive) this.cancelCrop();
    });
  }

  private beginDrag(clientX: number, clientY: number, type: DragType): void {
    if (!this.isActive) return;
    this.dragType = type;
    this.dragStartX = clientX;
    this.dragStartY = clientY;
    this.dragStartBox = { ...this.box };
  }

  private onMove(clientX: number, clientY: number): void {
    if (!this.dragType || !this.isActive) return;

    const canvas = this.editor.getPreviewCanvas();
    const cw = canvas.getBoundingClientRect().width;
    const ch = canvas.getBoundingClientRect().height;
    const dx = clientX - this.dragStartX;
    const dy = clientY - this.dragStartY;
    let { x, y, width, height } = this.dragStartBox;

    if (this.dragType === 'move') {
      x = clamp(x + dx, 0, cw - width);
      y = clamp(y + dy, 0, ch - height);
    } else {
      if (this.dragType === 'nw') {
        const nx = clamp(x + dx, 0, x + width - MIN_SIZE);
        const ny = clamp(y + dy, 0, y + height - MIN_SIZE);
        width += x - nx; height += y - ny; x = nx; y = ny;
      } else if (this.dragType === 'ne') {
        const ny = clamp(y + dy, 0, y + height - MIN_SIZE);
        width = clamp(width + dx, MIN_SIZE, cw - x);
        height += y - ny; y = ny;
      } else if (this.dragType === 'sw') {
        const nx = clamp(x + dx, 0, x + width - MIN_SIZE);
        width += x - nx; x = nx;
        height = clamp(height + dy, MIN_SIZE, ch - y);
      } else if (this.dragType === 'se') {
        width = clamp(width + dx, MIN_SIZE, cw - x);
        height = clamp(height + dy, MIN_SIZE, ch - y);
      }
    }

    this.box = { x, y, width, height };
    this.updateOverlay();
  }

  private updateOverlay(): void {
    const canvas = this.editor.getPreviewCanvas();
    const rect = canvas.getBoundingClientRect();
    const containerRect = canvas.parentElement!.getBoundingClientRect();
    const ox = rect.left - containerRect.left;
    const oy = rect.top - containerRect.top;

    this.overlay.style.left = `${ox + this.box.x}px`;
    this.overlay.style.top = `${oy + this.box.y}px`;
    this.overlay.style.width = `${this.box.width}px`;
    this.overlay.style.height = `${this.box.height}px`;
  }

  private startCropMode(): void {
    this.onActivate();
    this.isActive = true;

    const canvas = this.editor.getPreviewCanvas();
    const { width, height } = canvas.getBoundingClientRect();
    this.box = { x: 0, y: 0, width, height };

    this.overlay.classList.remove('hidden');
    this.updateOverlay();
    this.cropBtn.textContent = 'Apply Crop';
    this.cropBtn.classList.add('btn-primary');
  }

  private async applyCrop(): Promise<void> {
    if (this.box.width > 0 && this.box.height > 0) {
      const scale = this.editor.getPreviewScale();
      const region: CropRegion = {
        x: Math.round(this.box.x / scale),
        y: Math.round(this.box.y / scale),
        width: Math.round(this.box.width / scale),
        height: Math.round(this.box.height / scale),
      };
      await this.editor.crop(region);
    }
    this.cancelCrop();
  }

  private cancelCrop(): void {
    this.isActive = false;
    this.dragType = null;
    this.overlay.classList.add('hidden');
    this.cropBtn.textContent = 'Start Crop';
    this.cropBtn.classList.remove('btn-primary');
  }

  deactivate(): void {
    if (this.isActive) this.cancelCrop();
  }
}
