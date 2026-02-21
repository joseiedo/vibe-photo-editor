import { ImageEditor } from '../editor/ImageEditor';

export class Toolbar {
  private editor: ImageEditor;

  constructor(editor: ImageEditor) {
    this.editor = editor;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const uploadInput = document.getElementById('upload-input') as HTMLInputElement;
    uploadInput.addEventListener('change', async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) await this.editor.loadImage(file);
    });

    document.getElementById('undo-btn')?.addEventListener('click', () => this.editor.undo());
    document.getElementById('redo-btn')?.addEventListener('click', () => this.editor.redo());

    document.getElementById('download-btn')?.addEventListener('click', async () => {
      await this.editor.flushAdjustments();
      const format = (document.getElementById('export-format') as HTMLSelectElement).value as 'png' | 'jpeg';
      const blob = await this.editor.exportAsBlob(format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `edited-image.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    });

    document.getElementById('upscale-btn')?.addEventListener('click', () => {
      const factor = parseFloat((document.getElementById('upscale-factor') as HTMLInputElement).value);
      if (factor > 1) this.editor.upscale(factor);
    });

    document.getElementById('flip-h-btn')?.addEventListener('click', () => this.editor.flipHorizontal());
    document.getElementById('flip-v-btn')?.addEventListener('click', () => this.editor.flipVertical());
    document.getElementById('rotate-cw-btn')?.addEventListener('click', () => this.editor.rotate(90));
    document.getElementById('rotate-ccw-btn')?.addEventListener('click', () => this.editor.rotate(-90));
  }

  updateState(): void {
    const canUndo = this.editor.canUndo();
    const canRedo = this.editor.canRedo();
    const hasImage = this.editor.hasImage();

    (document.getElementById('undo-btn') as HTMLButtonElement).disabled = !canUndo;
    (document.getElementById('redo-btn') as HTMLButtonElement).disabled = !canRedo;
    (document.getElementById('download-btn') as HTMLButtonElement).disabled = !hasImage;

    document.getElementById('no-image-message')?.classList.toggle('hidden', hasImage);
  }
}
