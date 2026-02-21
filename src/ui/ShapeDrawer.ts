import { createElement, Square, Circle } from 'lucide';
import { ImageEditor } from '../editor/ImageEditor';
import { ShapeData, ShapeType } from '../types';
import { ShapeOperation } from '../operations/ShapeOperation';

type Handle = 'nw' | 'ne' | 'sw' | 'se';
type DragType = 'move' | Handle;

interface Box { x: number; y: number; width: number; height: number; }

const MIN_SIZE = 24;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function setIcon(btn: HTMLButtonElement, icon: ReturnType<typeof createElement>, filled: boolean): void {
  if (filled) icon.setAttribute('fill', 'currentColor');
  btn.innerHTML = '';
  btn.appendChild(icon);
}

export class ShapeDrawer {
  private editor: ImageEditor;
  private overlay: HTMLDivElement;
  private applyBtn: HTMLButtonElement;
  private activeTool: ShapeType | null = null;
  private isFilled = false;
  private isActive = false;
  private box: Box = { x: 0, y: 0, width: 0, height: 0 };
  private dragType: DragType | null = null;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragStartBox: Box = { x: 0, y: 0, width: 0, height: 0 };

  constructor(editor: ImageEditor) {
    this.editor = editor;
    this.overlay = document.getElementById('shape-overlay') as HTMLDivElement;
    this.applyBtn = document.getElementById('shape-apply-btn') as HTMLButtonElement;
    this.initIcons();
    this.setupEventListeners();
  }

  private initIcons(): void {
    setIcon(document.getElementById('shape-rect-btn') as HTMLButtonElement, createElement(Square), false);
    setIcon(document.getElementById('shape-circle-btn') as HTMLButtonElement, createElement(Circle), false);
    this.renderFilledIcon();
  }

  private renderFilledIcon(): void {
    const btn = document.getElementById('shape-filled-btn') as HTMLButtonElement;
    setIcon(btn, createElement(Circle), this.isFilled);
    btn.title = this.isFilled ? 'Filled' : 'Outline';
  }

  private setupEventListeners(): void {
    document.getElementById('shape-rect-btn')?.addEventListener('click', () => this.toggleTool('rect'));
    document.getElementById('shape-circle-btn')?.addEventListener('click', () => this.toggleTool('circle'));

    document.getElementById('shape-filled-btn')?.addEventListener('click', () => {
      this.isFilled = !this.isFilled;
      this.renderFilledIcon();
      if (this.isActive) this.renderPreview();
    });

    document.getElementById('shape-color')?.addEventListener('input', () => {
      if (this.isActive) { this.updateOverlay(); this.renderPreview(); }
    });

    document.getElementById('shape-line-width')?.addEventListener('change', () => {
      if (this.isActive) this.renderPreview();
    });

    this.applyBtn.addEventListener('click', () => this.commit());

    // Overlay body → move
    this.overlay.addEventListener('mousedown', (e) => {
      if (!(e.target as HTMLElement).classList.contains('shape-handle')) {
        this.beginDrag(e.clientX, e.clientY, 'move');
      }
    });
    this.overlay.addEventListener('touchstart', (e) => {
      if (!(e.target as HTMLElement).classList.contains('shape-handle')) {
        e.preventDefault();
        this.beginDrag(e.touches[0].clientX, e.touches[0].clientY, 'move');
      }
    }, { passive: false });

    // Corner handles → resize
    for (const handle of ['nw', 'ne', 'sw', 'se'] as Handle[]) {
      const el = this.overlay.querySelector(`.shape-handle-${handle}`) as HTMLElement;
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

    document.addEventListener('mousemove', (e) => this.onMove(e.clientX, e.clientY));
    document.addEventListener('mouseup', () => { this.dragType = null; });

    document.addEventListener('touchmove', (e) => {
      if (!this.dragType) return;
      e.preventDefault();
      this.onMove(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
    document.addEventListener('touchend', () => { this.dragType = null; });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isActive) this.deactivate();
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
    this.renderPreview();
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

    const color = (document.getElementById('shape-color') as HTMLInputElement).value;
    this.overlay.style.borderColor = color;
    this.overlay.style.borderRadius = this.activeTool === 'circle' ? '50%' : '0';
  }

  private renderPreview(): void {
    if (!this.activeTool) return;
    const shape = this.buildShape(this.box.x, this.box.y, this.box.width, this.box.height);
    this.editor.drawOnPreview((ctx) => ShapeOperation.draw(ctx, shape));
  }

  private toggleTool(tool: ShapeType): void {
    if (this.activeTool === tool && this.isActive) {
      this.deactivate();
    } else if (this.isActive) {
      this.activeTool = tool;
      this.updateOverlay();
      this.renderPreview();
      this.updateButtonStates();
    } else {
      this.activeTool = tool;
      this.showOverlay();
    }
  }

  private showOverlay(): void {
    this.isActive = true;

    const canvas = this.editor.getPreviewCanvas();
    const { width, height } = canvas.getBoundingClientRect();
    const w = Math.round(width * 0.5);
    const h = Math.round(height * 0.5);
    this.box = {
      x: Math.round((width - w) / 2),
      y: Math.round((height - h) / 2),
      width: w,
      height: h,
    };

    this.overlay.classList.remove('hidden');
    this.applyBtn.classList.remove('hidden');
    this.updateOverlay();
    this.renderPreview();
    this.updateButtonStates();
  }

  private buildShape(x: number, y: number, width: number, height: number): ShapeData {
    const colorInput = document.getElementById('shape-color') as HTMLInputElement;
    const lineWidthSelect = document.getElementById('shape-line-width') as HTMLSelectElement;
    return {
      type: this.activeTool!,
      x, y, width, height,
      color: colorInput.value,
      filled: this.isFilled,
      lineWidth: parseInt(lineWidthSelect.value),
    };
  }

  private async commit(): Promise<void> {
    if (!this.activeTool) return;
    const scale = this.editor.getPreviewScale();
    const previewShape = this.buildShape(this.box.x, this.box.y, this.box.width, this.box.height);
    const fullResShape: ShapeData = {
      ...previewShape,
      x: Math.round(this.box.x / scale),
      y: Math.round(this.box.y / scale),
      width: Math.round(this.box.width / scale),
      height: Math.round(this.box.height / scale),
      lineWidth: Math.round(previewShape.lineWidth / scale),
    };
    this.deactivate();
    await this.editor.applyShape(fullResShape);
  }

  deactivate(): void {
    this.activeTool = null;
    this.isActive = false;
    this.dragType = null;
    this.overlay.classList.add('hidden');
    this.applyBtn.classList.add('hidden');
    this.editor.refreshPreview();
    this.updateButtonStates();
  }

  private updateButtonStates(): void {
    (document.getElementById('shape-rect-btn') as HTMLButtonElement).classList.toggle('btn-primary', this.activeTool === 'rect');
    (document.getElementById('shape-circle-btn') as HTMLButtonElement).classList.toggle('btn-primary', this.activeTool === 'circle');
  }
}
