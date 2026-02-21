import { ImageEditor } from './editor/ImageEditor';
import { Toolbar } from './ui/Toolbar';
import { Sliders } from './ui/Sliders';
import { CropSelector } from './ui/CropSelector';
import { MergeDialog } from './ui/MergeDialog';

function init(): void {
  const canvas = document.getElementById('preview-canvas') as HTMLCanvasElement;

  let toolbar: Toolbar;
  let sliders: Sliders;

  const updateUI = () => {
    toolbar.updateState();
    sliders.updateState();
  };

  const editor = new ImageEditor(canvas, updateUI);

  toolbar = new Toolbar(editor);
  sliders = new Sliders(editor);
  new CropSelector(editor);
  new MergeDialog(editor);

  // Handle window resize
  window.addEventListener('resize', () => {
    if (editor.hasImage()) {
      editor.resetPreview();
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
