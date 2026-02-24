import { createElement, Square, Circle, Pencil, Minus } from 'lucide';
import { ImageEditor } from '../editor/ImageEditor';
import { ShapeData, ShapeType, PencilStroke, LineData } from '../types';
import { ShapeOperation } from '../operations/ShapeOperation';
import { LineOperation } from '../operations/LineOperation';

type Handle = 'nw' | 'ne' | 'sw' | 'se';
type DragType = 'move' | Handle;
type DrawTool = 'rect' | 'circle' | 'pencil' | 'line';

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
  private activeTool: DrawTool | null = null;
  private isFilled = false;
  private isActive = false;
  private box: Box = { x: 0, y: 0, width: 0, height: 0 };
  private dragType: DragType | null = null;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragStartBox: Box = { x: 0, y: 0, width: 0, height: 0 };

  // Pencil tool state
  private pencilPoints: Array<{ x: number; y: number }> = [];
  private isDrawingPencil = false;

  // Line tool state
  private lineStart: { x: number; y: number } | null = null;
  private lineEnd: { x: number; y: number } | null = null;
  private arrowheadEnabled = false;

  // Bound pencil/line mouse handlers (for add/remove EventListener)
  private readonly onPencilMouseDown: (e: MouseEvent) => void;
  private readonly onPencilMouseMove: (e: MouseEvent) => void;
  private readonly onPencilMouseUp: () => void;
  private readonly onLineMouseDown: (e: MouseEvent) => void;
  private readonly onLineMouseMove: (e: MouseEvent) => void;
  private readonly onLineMouseUp: () => void;

  constructor(editor: ImageEditor) {
    this.editor = editor;
    this.overlay = document.getElementById('shape-overlay') as HTMLDivElement;
    this.applyBtn = document.getElementById('shape-apply-btn') as HTMLButtonElement;

    this.onPencilMouseDown = this.handlePencilMouseDown.bind(this);
    this.onPencilMouseMove = this.handlePencilMouseMove.bind(this);
    this.onPencilMouseUp = this.handlePencilMouseUp.bind(this);
    this.onLineMouseDown = this.handleLineMouseDown.bind(this);
    this.onLineMouseMove = this.handleLineMouseMove.bind(this);
    this.onLineMouseUp = this.handleLineMouseUp.bind(this);

    this.initIcons();
    this.setupEventListeners();
  }

  private initIcons(): void {
    setIcon(document.getElementById('shape-rect-btn') as HTMLButtonElement, createElement(Square), false);
    setIcon(document.getElementById('shape-circle-btn') as HTMLButtonElement, createElement(Circle), false);
    setIcon(document.getElementById('draw-pencil-btn') as HTMLButtonElement, createElement(Pencil), false);
    setIcon(document.getElementById('draw-line-btn') as HTMLButtonElement, createElement(Minus), false);
    this.renderFilledIcon();
  }

  private renderFilledIcon(): void {
    const btn = document.getElementById('shape-filled-btn') as HTMLButtonElement;
    setIcon(btn, createElement(Circle), this.isFilled);
    btn.title = this.isFilled ? 'Filled' : 'Outline';
  }

  private setupEventListeners(): void {
    // Shape tools
    document.getElementById('shape-rect-btn')?.addEventListener('click', () => this.toggleTool('rect'));
    document.getElementById('shape-circle-btn')?.addEventListener('click', () => this.toggleTool('circle'));

    // Pencil/line tools
    document.getElementById('draw-pencil-btn')?.addEventListener('click', () => this.toggleTool('pencil'));
    document.getElementById('draw-line-btn')?.addEventListener('click', () => this.toggleTool('line'));

    // Arrowhead checkbox
    const arrowheadCheckbox = document.getElementById('draw-arrowhead') as HTMLInputElement | null;
    arrowheadCheckbox?.addEventListener('change', () => {
      this.arrowheadEnabled = arrowheadCheckbox.checked;
    });

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
    if (!this.activeTool || this.activeTool === 'pencil' || this.activeTool === 'line') return;
    const shape = this.buildShape(this.box.x, this.box.y, this.box.width, this.box.height);
    this.editor.drawOnPreview((ctx) => ShapeOperation.draw(ctx, shape));
  }

  private toggleTool(tool: DrawTool): void {
    if (tool === 'pencil' || tool === 'line') {
      // Freehand tools: deactivate any active shape overlay first
      if (this.isActive) this.deactivate();

      if (this.activeTool === tool) {
        // Toggling off the same freehand tool
        this.deactivateFreehand();
      } else {
        // Deactivate any previously active freehand tool
        if (this.activeTool === 'pencil' || this.activeTool === 'line') {
          this.deactivateFreehand();
        }
        this.activateFreehand(tool);
      }
    } else {
      // Shape tools (rect/circle): deactivate any active freehand tool first
      if (this.activeTool === 'pencil' || this.activeTool === 'line') {
        this.deactivateFreehand();
      }

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
  }

  // --- Freehand tool lifecycle ---

  private activateFreehand(tool: 'pencil' | 'line'): void {
    this.activeTool = tool;
    const canvas = this.editor.getPreviewCanvas();
    canvas.style.cursor = 'crosshair';

    if (tool === 'pencil') {
      canvas.addEventListener('mousedown', this.onPencilMouseDown);
    } else {
      canvas.addEventListener('mousedown', this.onLineMouseDown);
    }

    this.updateButtonStates();
  }

  private deactivateFreehand(): void {
    const canvas = this.editor.getPreviewCanvas();
    canvas.style.cursor = '';

    canvas.removeEventListener('mousedown', this.onPencilMouseDown);
    canvas.removeEventListener('mousemove', this.onPencilMouseMove);
    window.removeEventListener('mouseup', this.onPencilMouseUp);

    canvas.removeEventListener('mousedown', this.onLineMouseDown);
    canvas.removeEventListener('mousemove', this.onLineMouseMove);
    window.removeEventListener('mouseup', this.onLineMouseUp);

    this.pencilPoints = [];
    this.isDrawingPencil = false;
    this.lineStart = null;
    this.lineEnd = null;

    this.activeTool = null;
    this.editor.refreshPreview();
    this.updateButtonStates();
  }

  // --- Pencil mouse handlers ---

  private handlePencilMouseDown(e: MouseEvent): void {
    e.preventDefault();
    this.isDrawingPencil = true;
    this.pencilPoints = [];
    const pt = this.getCanvasPoint(e);
    this.pencilPoints.push(pt);

    const canvas = this.editor.getPreviewCanvas();
    canvas.addEventListener('mousemove', this.onPencilMouseMove);
    window.addEventListener('mouseup', this.onPencilMouseUp);
  }

  private handlePencilMouseMove(e: MouseEvent): void {
    if (!this.isDrawingPencil) return;

    const pt = this.getCanvasPoint(e);
    const prev = this.pencilPoints[this.pencilPoints.length - 1];
    this.pencilPoints.push(pt);

    // Incremental draw: only draw the new segment directly on the canvas
    // (avoids full repaint per point per Research Pitfall 6)
    const canvas = this.editor.getPreviewCanvas();
    const ctx = canvas.getContext('2d');
    if (!ctx || !prev) return;

    const colorInput = document.getElementById('shape-color') as HTMLInputElement;
    const lineWidthSelect = document.getElementById('shape-line-width') as HTMLSelectElement;

    ctx.save();
    ctx.strokeStyle = colorInput.value;
    ctx.lineWidth = parseInt(lineWidthSelect.value);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    ctx.restore();
  }

  private handlePencilMouseUp(): void {
    if (!this.isDrawingPencil) return;
    this.isDrawingPencil = false;

    const canvas = this.editor.getPreviewCanvas();
    canvas.removeEventListener('mousemove', this.onPencilMouseMove);
    window.removeEventListener('mouseup', this.onPencilMouseUp);

    if (this.pencilPoints.length === 0) return;

    const scale = this.editor.getPreviewScale();
    const lineWidthSelect = document.getElementById('shape-line-width') as HTMLSelectElement;
    const colorInput = document.getElementById('shape-color') as HTMLInputElement;

    const stroke: PencilStroke = {
      points: this.pencilPoints.map(p => ({ x: p.x / scale, y: p.y / scale })),
      color: colorInput.value,
      lineWidth: Math.round(parseInt(lineWidthSelect.value) / scale),
    };

    this.pencilPoints = [];
    this.editor.applyPencil(stroke);
  }

  // --- Line mouse handlers ---

  private handleLineMouseDown(e: MouseEvent): void {
    e.preventDefault();
    this.lineStart = this.getCanvasPoint(e);
    this.lineEnd = null;

    const canvas = this.editor.getPreviewCanvas();
    canvas.addEventListener('mousemove', this.onLineMouseMove);
    window.addEventListener('mouseup', this.onLineMouseUp);
  }

  private handleLineMouseMove(e: MouseEvent): void {
    if (!this.lineStart) return;
    this.lineEnd = this.getCanvasPoint(e);
    this.editor.drawOnPreview((ctx) => {
      LineOperation.draw(ctx, this.buildLine());
    });
  }

  private handleLineMouseUp(): void {
    const canvas = this.editor.getPreviewCanvas();
    canvas.removeEventListener('mousemove', this.onLineMouseMove);
    window.removeEventListener('mouseup', this.onLineMouseUp);

    if (!this.lineStart || !this.lineEnd) {
      this.lineStart = null;
      this.lineEnd = null;
      return;
    }

    const scale = this.editor.getPreviewScale();
    const line: LineData = {
      x1: this.lineStart.x / scale,
      y1: this.lineStart.y / scale,
      x2: this.lineEnd.x / scale,
      y2: this.lineEnd.y / scale,
      color: (document.getElementById('shape-color') as HTMLInputElement).value,
      lineWidth: Math.round(parseInt((document.getElementById('shape-line-width') as HTMLSelectElement).value) / scale),
      arrowhead: this.arrowheadEnabled,
    };

    this.lineStart = null;
    this.lineEnd = null;
    this.editor.applyLine(line);
  }

  // --- Helpers ---

  private buildLine(): LineData {
    const colorInput = document.getElementById('shape-color') as HTMLInputElement;
    const lineWidthSelect = document.getElementById('shape-line-width') as HTMLSelectElement;
    return {
      x1: this.lineStart!.x,
      y1: this.lineStart!.y,
      x2: this.lineEnd!.x,
      y2: this.lineEnd!.y,
      color: colorInput.value,
      lineWidth: parseInt(lineWidthSelect.value),
      arrowhead: this.arrowheadEnabled,
    };
  }

  private getCanvasPoint(e: MouseEvent): { x: number; y: number } {
    const canvas = this.editor.getPreviewCanvas();
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
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
      type: this.activeTool as ShapeType,
      x, y, width, height,
      color: colorInput.value,
      filled: this.isFilled,
      lineWidth: parseInt(lineWidthSelect.value),
    };
  }

  private async commit(): Promise<void> {
    if (!this.activeTool || this.activeTool === 'pencil' || this.activeTool === 'line') return;
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
    // Deactivate freehand tools if active
    if (this.activeTool === 'pencil' || this.activeTool === 'line') {
      this.deactivateFreehand();
      return;
    }
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
    (document.getElementById('draw-pencil-btn') as HTMLButtonElement)?.classList.toggle('btn-primary', this.activeTool === 'pencil');
    (document.getElementById('draw-line-btn') as HTMLButtonElement)?.classList.toggle('btn-primary', this.activeTool === 'line');
  }
}
