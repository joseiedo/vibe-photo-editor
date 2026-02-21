import { HistoryEntry } from '../types';

export class History {
  private entries: HistoryEntry[] = [];
  private currentIndex = -1;
  private maxEntries = 50;

  push(image: ImageBitmap, description: string): void {
    // Remove any entries after current index (when undoing and then making new changes)
    if (this.currentIndex < this.entries.length - 1) {
      this.entries = this.entries.slice(0, this.currentIndex + 1);
    }

    this.entries.push({ image, description });
    this.currentIndex = this.entries.length - 1;

    // Limit history size
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
      this.currentIndex--;
    }
  }

  undo(): HistoryEntry | null {
    if (!this.canUndo()) return null;
    this.currentIndex--;
    return this.entries[this.currentIndex];
  }

  redo(): HistoryEntry | null {
    if (!this.canRedo()) return null;
    this.currentIndex++;
    return this.entries[this.currentIndex];
  }

  canUndo(): boolean {
    return this.currentIndex > 0;
  }

  canRedo(): boolean {
    return this.currentIndex < this.entries.length - 1;
  }

  current(): HistoryEntry | null {
    if (this.currentIndex < 0) return null;
    return this.entries[this.currentIndex];
  }

  clear(): void {
    this.entries = [];
    this.currentIndex = -1;
  }
}
