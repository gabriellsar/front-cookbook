const STORAGE_KEY = 'panela_favorites';

function loadIds(): Set<number> {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return new Set();
  return new Set(JSON.parse(raw) as number[]);
}

function saveIds(ids: Set<number>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

export const favoritesService = {
  has: (id: number): boolean => loadIds().has(id),

  add(id: number): void {
    const ids = loadIds();
    ids.add(id);
    saveIds(ids);
  },

  remove(id: number): void {
    const ids = loadIds();
    ids.delete(id);
    saveIds(ids);
  },

  toggle(id: number): boolean {
    const ids = loadIds();
    if (ids.has(id)) {
      ids.delete(id);
      saveIds(ids);
      return false;
    }
    ids.add(id);
    saveIds(ids);
    return true;
  },

  getAll: (): Set<number> => loadIds(),
};
