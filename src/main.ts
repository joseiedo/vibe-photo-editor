import { ImageEditor } from './editor/ImageEditor';
import { Toolbar } from './ui/Toolbar';
import { Sliders } from './ui/Sliders';
import { CropSelector } from './ui/CropSelector';
import { MergeDialog } from './ui/MergeDialog';
import { ShapeDrawer } from './ui/ShapeDrawer';
import { CategoryTabs } from './ui/CategoryTabs';
import { MaskBrush } from './ui/MaskBrush';
import { setupKeyboardShortcuts } from './ui/KeyboardShortcuts';

function init(): void {
  const canvas = document.getElementById('preview-canvas') as HTMLCanvasElement;

  let toolbar!: Toolbar;
  let sliders!: Sliders;
  let categoryTabs!: CategoryTabs;

  const editor = new ImageEditor(canvas, () => {
    toolbar.updateState();
    sliders.updateState();
    categoryTabs.updateState(editor.hasImage());
  });

  toolbar = new Toolbar(editor);
  sliders = new Sliders(editor);

  // Declared with let! so the cross-deactivation callbacks can reference each
  // other without initialisation order issues (callbacks are invoked later).
  let cropSelector!: CropSelector;
  let shapeDrawer!: ShapeDrawer;
  let maskBrush!: MaskBrush;

  cropSelector = new CropSelector(editor, () => shapeDrawer.deactivate());
  shapeDrawer = new ShapeDrawer(editor);
  maskBrush = new MaskBrush(editor);

  categoryTabs = new CategoryTabs({
    crop: () => cropSelector.deactivate(),
    draw: () => shapeDrawer.deactivate(),
    transform: () => maskBrush.deactivate(),
  });

  new MergeDialog(editor);
  setupKeyboardShortcuts();

  window.addEventListener('resize', () => {
    if (editor.hasImage()) editor.refreshPreview();
  });
}

document.addEventListener('DOMContentLoaded', init);
