import type { ApiRecipe, RecipeUIMetadata, RecipeViewModel } from '../../types.ts';

const STORAGE_KEY = 'panela_recipe_meta';

// Ícones Font Awesome (classe sem o prefixo "fa-solid") usados como "capa" da receita
const ICON_PALETTE = [
  'fa-bowl-food', 'fa-pizza-slice', 'fa-cake-candles', 'fa-bread-slice',
  'fa-drumstick-bite', 'fa-fish', 'fa-carrot', 'fa-mug-hot',
  'fa-cheese', 'fa-bowl-rice',
];
const BG_PALETTE = [
  '#F8DDD1', '#D8E8C0', '#F8ECC8', '#D8E8F8',
  '#EDE5D4', '#D4E8C8', '#E8C8C8', '#C8D8F8',
  '#F0E8D0', '#D8F0E8',
];

function loadStore(): Record<string, RecipeUIMetadata> {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  return JSON.parse(raw) as Record<string, RecipeUIMetadata>;
}

function saveStore(store: Record<string, RecipeUIMetadata>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function defaultMeta(id: number): RecipeUIMetadata {
  const idx = id % ICON_PALETTE.length;
  return {
    icon: ICON_PALETTE[idx],
    backgroundColor: BG_PALETTE[idx % BG_PALETTE.length],
  };
}

export const recipeMetaService = {
  getMeta(id: number): RecipeUIMetadata {
    const store = loadStore();
    const meta = store[String(id)];
    if (!meta) return defaultMeta(id);
    // Guarda de segurança: metadados antigos (emoji) caem para o ícone padrão
    if (!meta.icon || !meta.icon.startsWith('fa-')) {
      return defaultMeta(id);
    }
    return meta;
  },

  setMeta(id: number, partial: Partial<RecipeUIMetadata>): void {
    const store = loadStore();
    const current = store[String(id)] ?? defaultMeta(id);
    store[String(id)] = { ...current, ...partial };
    saveStore(store);
  },

  toViewModel(recipe: ApiRecipe): RecipeViewModel {
    const meta = recipeMetaService.getMeta(recipe.id);
    return {
      ...recipe,
      icon: meta.icon,
      backgroundColor: meta.backgroundColor,
      tags: recipe.tags ?? [],
      isFork: recipe.forked_from !== null,
    };
  },

  randomIcon(): string {
    return ICON_PALETTE[Math.floor(Math.random() * ICON_PALETTE.length)];
  },

  randomBg(): string {
    return BG_PALETTE[Math.floor(Math.random() * BG_PALETTE.length)];
  },
};
