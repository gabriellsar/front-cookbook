import { recipeService, ApiError } from '../services/api.ts';
import { recipeMetaService } from '../services/recipeMeta.ts';
import { renderNav } from '../services/navAuth.ts';
import { isLoggedIn } from '../services/auth.ts';
import { favoritesService } from '../services/favorites.ts';
import { initForkModal, openForkModal } from '../components/fork-modal.ts';
import { showToast } from '../utils/toast.ts';
import { formatDate } from '../utils/format.ts';
import type { RecipeViewModel } from '../../types.ts';

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
    ? '<span class="rcard-fork-badge"><i class="fa-solid fa-code-branch"></i> Fork</span>'
    : '<span class="rcard-badge">Original</span>';

  const tagsHtml = r.tags.length
    ? r.tags.map((t) => `<span class="rcard-tag">${t}</span>`).join('')
    : '';

  const forkInfo = r.isFork && r.forked_from_title
    ? `<div class="rcard-fork-info"><i class="fa-solid fa-code-branch"></i> de "${r.forked_from_title}"</div>`
    : '';

  return `
    <article class="rcard" data-id="${r.id}">
      <div class="rcard-img" style="background:${r.backgroundColor}">
        <i class="fa-solid ${r.icon}"></i>
        ${badgeHtml}
        <button class="rcard-fav" data-id="${r.id}" aria-label="Favoritar">
          <i class="fa-${isFav ? 'solid' : 'regular'} fa-heart"></i>
        </button>
      </div>
      <div class="rcard-body">
        ${tagsHtml ? `<div class="rcard-tags">${tagsHtml}</div>` : ''}
        <div class="rcard-title">${r.title}</div>
        <div class="rcard-meta"><i class="fa-regular fa-user"></i> ${r.author_name} · ${formatDate(r.created_at)}</div>
        ${forkInfo}
      </div>
    </article>
  `;
}

function renderGrid(recipes: RecipeViewModel[]): void {
  const grid = getEl('main-grid');
  if (!grid) return;

  if (recipes.length === 0) {
    grid.innerHTML = '<p class="grid-loading">Nenhuma receita encontrada.</p>';
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
      btn.innerHTML = `<i class="fa-${added ? 'solid' : 'regular'} fa-heart"></i>`;
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

// Escolhe a receita em destaque: maior média de avaliação, com desempate por
// número de avaliações e, por fim, pela mais recente.
function pickFeatured(recipes: RecipeViewModel[]): RecipeViewModel | null {
  if (recipes.length === 0) return null;
  return [...recipes].sort(
    (a, b) =>
      b.average_rating - a.average_rating ||
      b.rating_count - a.rating_count ||
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )[0];
}

function statHtml(value: string, key: string): string {
  return `<div><div class="feat-stat-v">${value}</div><div class="feat-stat-k">${key}</div></div>`;
}

function renderFeaturedEmpty(): void {
  const feat = getEl('featured-recipe');
  if (!feat) return;
  feat.innerHTML = `
    <div class="feat-l">
      <div class="feat-tag">Receita em destaque</div>
      <h2 class="feat-h">Não temos nenhum<br>destaque <em>no momento</em></h2>
      <p class="feat-desc">Ainda não há receitas na comunidade. Que tal publicar a primeira e abrir a cozinha?</p>
      <div class="feat-actions">
        <a href="form_receita.html" class="btn-feat"><i class="fa-solid fa-plus"></i> Publicar receita</a>
      </div>
    </div>
    <div class="feat-r"><i class="fa-solid fa-bowl-food"></i></div>
  `;
}

function renderFeatured(r: RecipeViewModel): void {
  const feat = getEl('featured-recipe');
  if (!feat) return;

  feat.querySelector<HTMLElement>('.feat-h')!.innerHTML = r.title;
  feat.querySelector<HTMLElement>('.feat-desc')!.textContent =
    r.description ?? 'Sem descrição.';
  feat.querySelector<HTMLElement>('.feat-r')!.innerHTML = `<i class="fa-solid ${r.icon}"></i>`;

  // Estatísticas reais vindas do backend
  const stats = feat.querySelector<HTMLElement>('.feat-stats');
  if (stats) {
    const prep = r.prep_time ? `${r.prep_time} min` : '—';
    const servings = r.servings ? String(r.servings) : '—';
    const rating =
      r.rating_count > 0
        ? `<i class="fa-solid fa-star"></i> ${r.average_rating.toFixed(1)}`
        : '<i class="fa-regular fa-star"></i> —';
    stats.innerHTML =
      statHtml(prep, 'PREPARO') +
      statHtml(servings, 'PORÇÕES') +
      statHtml(rating, 'AVALIAÇÃO') +
      statHtml(String(r.forks_count), r.forks_count === 1 ? 'FORK' : 'FORKS');
  }

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

    const featured = pickFeatured(allRecipes);
    if (featured) {
      renderFeatured(featured);
    } else {
      renderFeaturedEmpty();
    }
    renderGrid(allRecipes);
  } catch {
    const grid = getEl('main-grid');
    if (grid) {
      grid.innerHTML =
        '<p class="grid-loading"><i class="fa-solid fa-triangle-exclamation"></i> Erro ao carregar receitas. Verifique se o backend está rodando.</p>';
    }
  }
}

void init();
