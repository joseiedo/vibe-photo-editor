import { ImageEditor } from '../editor/ImageEditor';

export class Filters {
  private editor: ImageEditor;
  private posterizeSlider: HTMLInputElement;
  private posterizeValue: HTMLSpanElement;

  constructor(editor: ImageEditor) {
    this.editor = editor;
    this.posterizeSlider = document.getElementById('posterize-slider') as HTMLInputElement;
    this.posterizeValue = document.getElementById('posterize-value') as HTMLSpanElement;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.posterizeSlider.addEventListener('input', () => {
      const sliderValue = parseInt(this.posterizeSlider.value);
      if (sliderValue === 0) {
        this.posterizeValue.textContent = 'Off';
        this.editor.refreshPreview();
      } else {
        const levels = 8 - sliderValue;
        this.posterizeValue.textContent = `${levels} levels`;
        this.editor.previewPosterize(levels);
      }
    });

    this.posterizeSlider.addEventListener('change', async () => {
      const sliderValue = parseInt(this.posterizeSlider.value);
      if (sliderValue === 0) return;
      const levels = 8 - sliderValue;
      await this.editor.posterize(levels);
    });
  }

  updateState(): void {
    this.posterizeSlider.disabled = !this.editor.hasImage();
  }
}
