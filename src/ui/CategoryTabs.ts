type Category = 'transform' | 'crop' | 'draw' | 'merge' | 'adjust' | 'filters';

export class CategoryTabs {
  private activeCategory: Category | null = null;
  private readonly categories: Category[] = ['transform', 'crop', 'draw', 'merge', 'adjust', 'filters'];
  private onDeactivate: Partial<Record<Category, () => void>>;

  constructor(onDeactivate: Partial<Record<Category, () => void>> = {}) {
    this.onDeactivate = onDeactivate;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    for (const cat of this.categories) {
      document.getElementById(`cat-${cat}`)?.addEventListener('click', () => this.toggle(cat));
    }
  }

  private toggle(category: Category): void {
    if (this.activeCategory === category) {
      this.deactivatePanel(category);
      this.activeCategory = null;
    } else {
      if (this.activeCategory) this.deactivatePanel(this.activeCategory);
      this.activatePanel(category);
      this.activeCategory = category;
    }
  }

  private activatePanel(category: Category): void {
    document.getElementById(`panel-${category}`)?.classList.remove('hidden');
    document.getElementById(`cat-${category}`)?.classList.add('active');
  }

  private deactivatePanel(category: Category): void {
    document.getElementById(`panel-${category}`)?.classList.add('hidden');
    document.getElementById(`cat-${category}`)?.classList.remove('active');
    this.onDeactivate[category]?.();
  }

  updateState(hasImage: boolean): void {
    for (const cat of this.categories) {
      (document.getElementById(`cat-${cat}`) as HTMLButtonElement).disabled = !hasImage;
    }
    if (!hasImage && this.activeCategory) {
      this.deactivatePanel(this.activeCategory);
      this.activeCategory = null;
    }
  }
}
