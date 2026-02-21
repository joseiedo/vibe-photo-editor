import { ImageEditor } from '../editor/ImageEditor';
import { ShapeData, ShapeType } from '../types';
import { ShapeOperation } from '../operations/ShapeOperation';

export class ShapeDrawer {
  private editor: ImageEditor;
  private onActivate: () => void;
  private activeTool: ShapeType | null = null;
  private isDragging = false;
  private startX = 0;
  private startY = 0;

  constructor(editor: ImageEditor, onActivate: () => void) {
    this.editor = editor;
    this.onActivate = onActivate;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    document.getElementById('shape-rect-btn')?.addEventListener('click', () => this.toggleTool('rect'));
    document.getElementById('shape-circle-btn')?.addEventListener('click', () => this.toggleTool('circle'));

    document.getElementById('shape-filled-btn')?.addEventListener('click', (e) => {
      const btn = e.currentTarget as HTMLButtonElement;
      const filled = btn.dataset.filled !== 'true';
      btn.dataset.filled = String(filled);
      btn.textContent = filled ? 'Filled' : 'Outline';
    });

    const canvas = this.editor.getPreviewCanvas();
    const container = canvas.parentElement as HTMLElement;

    container.addEventListener('mousedown', (e) => {
      if (!this.activeTool) return;
      this.isDragging = true;
      const rect = canvas.getBoundingClientRect();
      this.startX = e.clientX - rect.left;
      this.startY = e.clientY - rect.top;
    });

    container.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const rect = canvas.getBoundingClientRect();
      const endX = e.clientX - rect.left;
      const endY = e.clientY - rect.top;
      this.renderPreview(endX, endY);
    });

    container.addEventListener('mouseup', async (e) => {
      if (!this.isDragging) return;
      this.isDragging = false;
      const rect = canvas.getBoundingClientRect();
      const endX = e.clientX - rect.left;
      const endY = e.clientY - rect.top;

      const width = Math.abs(endX - this.startX);
      const height = Math.abs(endY - this.startY);
      if (width > 2 && height > 2) {
        await this.commit(endX, endY);
      } else {
        this.editor.refreshPreview();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.activeTool) this.deactivate();
    });
  }

  private toggleTool(tool: ShapeType): void {
    if (this.activeTool === tool) {
      this.deactivate();
      return;
    }
    this.onActivate();
    this.activeTool = tool;
    this.editor.getPreviewCanvas().style.cursor = 'crosshair';
    this.updateButtonStates();
  }

  private renderPreview(endX: number, endY: number): void {
    const x = Math.min(this.startX, endX);
    const y = Math.min(this.startY, endY);
    const width = Math.abs(endX - this.startX);
    const height = Math.abs(endY - this.startY);
    const shape = this.buildPreviewShape(x, y, width, height);

    this.editor.drawOnPreview((ctx) => ShapeOperation.draw(ctx, shape));
  }

  private async commit(endX: number, endY: number): Promise<void> {
    const scale = this.editor.getPreviewScale();
    const x = Math.min(this.startX, endX);
    const y = Math.min(this.startY, endY);
    const width = Math.abs(endX - this.startX);
    const height = Math.abs(endY - this.startY);

    const previewShape = this.buildPreviewShape(x, y, width, height);
    const fullResShape: ShapeData = {
      ...previewShape,
      x: Math.round(x / scale),
      y: Math.round(y / scale),
      width: Math.round(width / scale),
      height: Math.round(height / scale),
      lineWidth: Math.round(previewShape.lineWidth / scale),
    };

    await this.editor.applyShape(fullResShape);
  }

  private buildPreviewShape(x: number, y: number, width: number, height: number): ShapeData {
    const colorInput = document.getElementById('shape-color') as HTMLInputElement;
    const filledBtn = document.getElementById('shape-filled-btn') as HTMLButtonElement;
    const lineWidthSelect = document.getElementById('shape-line-width') as HTMLSelectElement;

    return {
      type: this.activeTool!,
      x,
      y,
      width,
      height,
      color: colorInput.value,
      filled: filledBtn.dataset.filled === 'true',
      lineWidth: parseInt(lineWidthSelect.value),
    };
  }

  deactivate(): void {
    this.activeTool = null;
    this.isDragging = false;
    this.editor.getPreviewCanvas().style.cursor = '';
    this.editor.refreshPreview();
    this.updateButtonStates();
  }

  private updateButtonStates(): void {
    const rectBtn = document.getElementById('shape-rect-btn') as HTMLButtonElement;
    const circleBtn = document.getElementById('shape-circle-btn') as HTMLButtonElement;
    rectBtn.classList.toggle('btn-primary', this.activeTool === 'rect');
    circleBtn.classList.toggle('btn-primary', this.activeTool === 'circle');
  }

  updateState(): void {
    const hasImage = this.editor.hasImage();
    (document.getElementById('shape-rect-btn') as HTMLButtonElement).disabled = !hasImage;
    (document.getElementById('shape-circle-btn') as HTMLButtonElement).disabled = !hasImage;
  }
}
