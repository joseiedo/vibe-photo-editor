import { ImageEditor } from '../editor/ImageEditor';
import { MergePosition } from '../types';

export class MergeDialog {
  private editor: ImageEditor;
  private dialog: HTMLDivElement;
  private pendingFile: File | null = null;

  constructor(editor: ImageEditor) {
    this.editor = editor;
    this.dialog = document.getElementById('merge-dialog') as HTMLDivElement;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const mergeInput = document.getElementById('merge-input') as HTMLInputElement;

    mergeInput.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        this.pendingFile = file;
        this.show();
      }
      mergeInput.value = '';
    });

    // Position buttons
    this.dialog.querySelectorAll('[data-position]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const position = btn.getAttribute('data-position') as MergePosition;
        if (this.pendingFile) {
          await this.editor.flushAdjustments();
          await this.editor.merge(this.pendingFile, position);
        }
        this.hide();
      });
    });

    // Cancel button
    document.getElementById('merge-cancel')?.addEventListener('click', () => {
      this.hide();
    });

    // Close on click outside
    this.dialog.addEventListener('click', (e) => {
      if (e.target === this.dialog) {
        this.hide();
      }
    });
  }

  private show(): void {
    this.dialog.classList.remove('hidden');
  }

  private hide(): void {
    this.dialog.classList.add('hidden');
    this.pendingFile = null;
  }
}
