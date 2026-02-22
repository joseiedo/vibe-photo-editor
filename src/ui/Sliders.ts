import { ImageEditor } from '../editor/ImageEditor';
import { AdjustmentValues } from '../types';

export class Sliders {
  private editor: ImageEditor;
  private brightnessSlider: HTMLInputElement;
  private contrastSlider: HTMLInputElement;
  private saturationSlider: HTMLInputElement;
  private brightnessValue: HTMLSpanElement;
  private contrastValue: HTMLSpanElement;
  private saturationValue: HTMLSpanElement;
  private resetBtn: HTMLButtonElement;
  constructor(editor: ImageEditor) {
    this.editor = editor;

    this.brightnessSlider = document.getElementById('brightness-slider') as HTMLInputElement;
    this.contrastSlider = document.getElementById('contrast-slider') as HTMLInputElement;
    this.saturationSlider = document.getElementById('saturation-slider') as HTMLInputElement;
    this.brightnessValue = document.getElementById('brightness-value') as HTMLSpanElement;
    this.contrastValue = document.getElementById('contrast-value') as HTMLSpanElement;
    this.saturationValue = document.getElementById('saturation-value') as HTMLSpanElement;
    this.resetBtn = document.getElementById('reset-adjustments-btn') as HTMLButtonElement;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const onSliderChange = () => {
      const adjustments = this.getValues();
      this.updateLabels(adjustments);
      this.editor.setPendingAdjustments(adjustments);
    };

    this.brightnessSlider.addEventListener('input', onSliderChange);
    this.contrastSlider.addEventListener('input', onSliderChange);
    this.saturationSlider.addEventListener('input', onSliderChange);

    this.resetBtn.addEventListener('click', () => {
      this.resetSliderValues();
      this.editor.resetPreview();
    });

  }

  private getValues(): AdjustmentValues {
    return {
      brightness: parseInt(this.brightnessSlider.value),
      contrast: parseInt(this.contrastSlider.value),
      saturation: parseInt(this.saturationSlider.value),
    };
  }

  private updateLabels(adjustments: AdjustmentValues): void {
    this.brightnessValue.textContent = `${adjustments.brightness}%`;
    this.contrastValue.textContent = `${adjustments.contrast}%`;
    this.saturationValue.textContent = `${adjustments.saturation}%`;
  }

  private resetSliderValues(): void {
    this.brightnessSlider.value = '100';
    this.contrastSlider.value = '100';
    this.saturationSlider.value = '100';
    this.updateLabels({ brightness: 100, contrast: 100, saturation: 100 });
  }

  updateState(): void {
    const hasImage = this.editor.hasImage();
    this.brightnessSlider.disabled = !hasImage;
    this.contrastSlider.disabled = !hasImage;
    this.saturationSlider.disabled = !hasImage;
    this.resetBtn.disabled = !hasImage;

    // Reset slider UI whenever pending adjustments are cleared externally (after flush)
    if (!this.editor.hasPendingAdjustments()) {
      this.resetSliderValues();
    }
  }
}
