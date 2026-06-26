import type { ApiRecipe, RecipeUIMetadata, RecipeViewModel } from '../types.ts';

const STORAGE_KEY = 'panela_recipe_meta';

const EMOJI_PALETTE = ['🍄', '🥗', '🍰', '🍝', '🍲', '🥘', '🫕', '🥞', '🥦', '🧆'];
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
  const idx = id % EMOJI_PALETTE.length;
  return {
    emoji: EMOJI_PALETTE[idx],
    backgroundColor: BG_PALETTE[idx % BG_PALETTE.length],
    tags: [],
    localRating: 0,
  };
}

export const recipeMetaService = {
  getMeta(id: number): RecipeUIMetadata {
    const store = loadStore();
    return store[String(id)] ?? defaultMeta(id);
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
      emoji: meta.emoji,
      backgroundColor: meta.backgroundColor,
      tags: meta.tags,
      isFork: recipe.forked_from !== null,
    };
  },

  randomEmoji(): string {
    return EMOJI_PALETTE[Math.floor(Math.random() * EMOJI_PALETTE.length)];
  },

  randomBg(): string {
    return BG_PALETTE[Math.floor(Math.random() * BG_PALETTE.length)];
  },
};
