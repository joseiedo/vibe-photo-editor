import { ImageEditor } from './editor/ImageEditor';
import { Toolbar } from './ui/Toolbar';
import { Sliders } from './ui/Sliders';
import { CropSelector } from './ui/CropSelector';
import { MergeDialog } from './ui/MergeDialog';
import { ShapeDrawer } from './ui/ShapeDrawer';

function init(): void {
  const canvas = document.getElementById('preview-canvas') as HTMLCanvasElement;

  let toolbar: Toolbar;
  let sliders: Sliders;
  let shapeDrawer: ShapeDrawer;

  const updateUI = () => {
    toolbar.updateState();
    sliders.updateState();
    shapeDrawer.updateState();
  };

  const editor = new ImageEditor(canvas, updateUI);

  toolbar = new Toolbar(editor);
  sliders = new Sliders(editor);

  // Cross-deactivation: activating one tool deactivates the other
  let cropSelector: CropSelector;
  shapeDrawer = new ShapeDrawer(editor, () => cropSelector.deactivate());
  cropSelector = new CropSelector(editor, () => shapeDrawer.deactivate());

  new MergeDialog(editor);

  window.addEventListener('resize', () => {
    if (editor.hasImage()) editor.refreshPreview();
  });
}

document.addEventListener('DOMContentLoaded', init);
