function click(id: string): void {
  (document.getElementById(id) as HTMLElement | null)?.click();
}

function isTyping(e: KeyboardEvent): boolean {
  const el = e.target as HTMLInputElement;
  if (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true;
  if (el.tagName === 'INPUT' && el.type !== 'range') return true;
  return false;
}

function focus(id: string): void {
  (document.getElementById(id) as HTMLElement | null)?.focus();
}

export function setupKeyboardShortcuts(): void {
  document.addEventListener('keydown', (e) => {
    const ctrl = e.ctrlKey || e.metaKey;

    // Always active
    if (ctrl && !e.shiftKey && e.key === 'z') { e.preventDefault(); click('undo-btn'); return; }
    if (ctrl && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) { e.preventDefault(); click('redo-btn'); return; }
    if (ctrl && e.key === 's') { e.preventDefault(); click('download-btn'); return; }
    if (ctrl && e.key === 'o') { e.preventDefault(); click('upload-input'); return; }

    // Single-key shortcuts — skip when typing in an input
    if (ctrl || isTyping(e)) return;

    switch (e.key) {
      case 't': click('cat-transform'); break;
      case 'c': click('cat-crop'); break;
      case 'd': click('cat-draw'); break;
      case 'm': click('cat-merge'); break;
      case 'a': click('cat-adjust'); break;

      case 'h': click('flip-h-btn'); break;
      case 'v': click('flip-v-btn'); break;
      case '[': click('rotate-ccw-btn'); break;
      case ']': click('rotate-cw-btn'); break;

      case 'r': click('shape-rect-btn'); break;
      case 'e': click('shape-circle-btn'); break;
      case 'f': click('shape-filled-btn'); break;

      case 'i': click('merge-label'); break;

      case 'b': focus('brightness-slider'); break;
      case 'k': focus('contrast-slider'); break;
      case 's': focus('saturation-slider'); break;
      case '0': click('reset-adjustments-btn'); break;
    }
  });
}
