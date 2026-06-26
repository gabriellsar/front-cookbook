import { recipeService, ApiError } from '../services/api.ts';
import { recipeMetaService } from '../services/recipeMeta.ts';
import { renderNav } from '../services/navAuth.ts';
import { isLoggedIn } from '../services/auth.ts';
import { favoritesService } from '../services/favorites.ts';
import { initForkModal, openForkModal } from '../components/fork-modal.ts';
import { showToast } from '../utils/toast.ts';
import { formatDate } from '../utils/format.ts';
import type { RecipeViewModel } from '../types.ts';

let allRecipes: RecipeViewModel[] = [];
let activeFilter = 'all';
let searchQuery = '';
let forkTargetId = 0;

function getEl<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

// ── Renderização de cards ──────────────────────────────────────────────────

function recipeCard(r: RecipeViewModel): string {
  const isFav = favoritesService.has(r.id);
  const badgeHtml = r.isFork
    ? '<span class="rcard-badge fork-badge">⑂ Fork</span>'
    : '<span class="rcard-badge orig-badge">Original</span>';

  const tagsHtml = r.tags.length
    ? r.tags.map((t) => `<span class="rcard-tag">${t}</span>`).join('')
    : '';

  const forkInfo = r.isFork && r.forked_from_title
    ? `<div class="rcard-fork-info" style="font-size:.72rem;color:var(--sl);margin-top:3px">⑂ de "${r.forked_from_title}"</div>`
    : '';

  return `
    <div class="rcard" data-id="${r.id}" style="cursor:pointer">
      <div class="rcard-img" style="background:${r.backgroundColor};font-size:2.8rem;display:flex;align-items:center;justify-content:center;position:relative;min-height:120px">
        ${r.emoji}
        ${badgeHtml}
        <button class="rcard-fav" data-id="${r.id}" style="position:absolute;top:8px;right:8px;background:none;border:none;font-size:1.1rem;cursor:pointer" aria-label="Favoritar">
          ${isFav ? '♥' : '♡'}
        </button>
      </div>
      <div class="rcard-body" style="padding:.7rem .85rem .85rem">
        ${tagsHtml ? `<div class="rcard-tags" style="margin-bottom:4px">${tagsHtml}</div>` : ''}
        <div class="rcard-title" style="font-weight:700;font-size:.92rem;margin-bottom:3px">${r.title}</div>
        <div class="rcard-meta" style="font-size:.72rem;color:var(--ink3)">por ${r.author_name} · ${formatDate(r.created_at)}</div>
        ${forkInfo}
      </div>
    </div>
  `;
}

function renderGrid(recipes: RecipeViewModel[]): void {
  const grid = getEl('main-grid');
  if (!grid) return;

  if (recipes.length === 0) {
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--ink3);padding:2rem">Nenhuma receita encontrada.</p>';
    return;
  }

  grid.innerHTML = recipes.map(recipeCard).join('');

  // Navegar para detalhe ao clicar no card
  grid.querySelectorAll<HTMLElement>('.rcard').forEach((card) => {
    card.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('.rcard-fav');
      if (btn) return; // click no favorito não navega
      const id = card.dataset['id'];
      if (id) window.location.href = `receita.html?id=${id}`;
    });
  });

  // Botões de favorito
  grid.querySelectorAll<HTMLButtonElement>('.rcard-fav').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = Number(btn.dataset['id']);
      const added = favoritesService.toggle(id);
      btn.textContent = added ? '♥' : '♡';
    });
  });
}

// ── Filtros e busca ────────────────────────────────────────────────────────

function applyFilters(): void {
  let result = allRecipes;

  if (activeFilter === 'forks') {
    result = result.filter((r) => r.isFork);
  } else if (activeFilter !== 'all') {
    result = result.filter((r) => r.tags.includes(activeFilter));
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    result = result.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.author_name.toLowerCase().includes(q),
    );
  }

  renderGrid(result);
}

function setupFilters(): void {
  document.querySelectorAll<HTMLButtonElement>('.chip[data-filter]').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip').forEach((c) => c.classList.remove('on'));
      chip.classList.add('on');
      activeFilter = chip.dataset['filter'] ?? 'all';
      applyFilters();
    });
  });

  const form = getEl<HTMLFormElement>('search-form');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    searchQuery = (getEl<HTMLInputElement>('search-input')?.value ?? '').trim();
    applyFilters();
  });
}

// ── Receita em destaque ────────────────────────────────────────────────────

function renderFeatured(r: RecipeViewModel): void {
  const feat = getEl('featured-recipe');
  if (!feat) return;

  feat.querySelector<HTMLElement>('.feat-h')!.innerHTML = r.title;
  feat.querySelector<HTMLElement>('.feat-desc')!.textContent =
    r.description ?? 'Sem descrição.';
  feat.querySelector<HTMLElement>('.feat-r')!.textContent = r.emoji;

  const verBtn = feat.querySelector<HTMLAnchorElement>('.btn-feat');
  if (verBtn) verBtn.href = `receita.html?id=${r.id}`;

  const forkBtn = feat.querySelector<HTMLButtonElement>('.btn-feat-fork');
  if (forkBtn) {
    forkBtn.dataset['recipe'] = r.title;
    forkBtn.addEventListener('click', () => {
      if (!isLoggedIn()) {
        window.location.href = 'login.html';
        return;
      }
      forkTargetId = r.id;
      openForkModal(r.title);
    });
  }
}

// ── Fork modal ─────────────────────────────────────────────────────────────

async function handleForkConfirm(_originName: string, note: string): Promise<void> {
  try {
    const newRecipe = await recipeService.fork(forkTargetId, note);
    showToast('Fork criado! Redirecionando para edição…', 'ok');
    setTimeout(() => {
      window.location.href = `form_receita.html?id=${newRecipe.id}&edit=true`;
    }, 1200);
  } catch (err) {
    if (err instanceof ApiError) {
      showToast(`Erro ao criar fork: ${err.status}`, 'inf');
    } else {
      showToast('Erro inesperado ao criar fork.', 'inf');
    }
  }
}

// ── Init ───────────────────────────────────────────────────────────────────

async function init(): Promise<void> {
  renderNav();
  setupFilters();
  initForkModal((_originName, note) => void handleForkConfirm(_originName, note));

  // Botão "Publicar" redireciona para login se não autenticado
  document.querySelectorAll<HTMLAnchorElement>('a[href="form_receita.html"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      if (!isLoggedIn()) {
        e.preventDefault();
        window.location.href = 'login.html';
      }
    });
  });

  try {
    const recipes = await recipeService.getAll();
    allRecipes = recipes.map((r) => recipeMetaService.toViewModel(r));

    if (allRecipes.length > 0) {
      renderFeatured(allRecipes[0]);
    }
    renderGrid(allRecipes);
  } catch {
    const grid = getEl('main-grid');
    if (grid) {
      grid.innerHTML =
        '<p style="grid-column:1/-1;text-align:center;color:var(--ink3);padding:2rem">Erro ao carregar receitas. Verifique se o backend está rodando.</p>';
    }
  }
}

void init();
