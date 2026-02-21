import { HistoryEntry } from '../types';

export class History {
  private entries: HistoryEntry[] = [];
  private currentIndex = -1;
  private maxEntries = 50;

  push(image: ImageBitmap, description: string): void {
    // Discard (and free) any entries ahead of the current pointer.
    if (this.currentIndex < this.entries.length - 1) {
      const evicted = this.entries.splice(this.currentIndex + 1);
      evicted.forEach(e => e.image.close());
    }

    this.entries.push({ image, description });
    this.currentIndex = this.entries.length - 1;

    // Enforce the cap by dropping and freeing the oldest entry.
    if (this.entries.length > this.maxEntries) {
      const evicted = this.entries.shift()!;
      evicted.image.close();
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
    this.entries.forEach(e => e.image.close());
    this.entries = [];
    this.currentIndex = -1;
  }
}
