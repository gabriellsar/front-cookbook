import { recipeService, ApiError } from '../services/api.ts';
import { recipeMetaService } from '../services/recipeMeta.ts';
import { renderNav } from '../services/navAuth.ts';
import { getCurrentUser, isLoggedIn } from '../services/auth.ts';
import { favoritesService } from '../services/favorites.ts';
import { initForkModal, openForkModal } from '../components/fork-modal.ts';
import { initRating } from '../components/rating.ts';
import { initServingCalculator } from '../components/serving-calculator.ts';
import { showToast } from '../utils/toast.ts';
import { formatDate, getInitials } from '../utils/format.ts';
import type { RecipeViewModel, ApiRecipe } from '../types.ts';

const params = new URLSearchParams(location.search);
const recipeId = Number(params.get('id'));

if (!recipeId) {
  window.location.href = 'index.html';
}

function getEl<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function setText(id: string, text: string): void {
  const el = getEl(id);
  if (el) el.textContent = text;
}

// ── Renderização ───────────────────────────────────────────────────────────

function renderDetail(r: RecipeViewModel): void {
  document.title = `Panela — ${r.title}`;

  // Hero
  const hero = getEl('recipe-hero');
  if (hero) {
    hero.style.background = r.backgroundColor;
    hero.style.fontSize = '5rem';
    hero.style.display = 'flex';
    hero.style.alignItems = 'center';
    hero.style.justifyContent = 'center';
    hero.textContent = r.emoji;
  }

  // Tags
  const tagsEl = getEl('recipe-tags');
  if (tagsEl) {
    tagsEl.innerHTML = r.tags.length
      ? r.tags.map((t) => `<span class="rcard-tag" style="margin-right:4px">${t}</span>`).join('')
      : '';
  }

  // Título e autor
  setText('recipe-title', r.title);
  const authorBar = getEl('recipe-author-bar');
  if (authorBar) {
    const initials = getInitials(r.author_name);
    authorBar.innerHTML = `
      <div style="width:32px;height:32px;border-radius:50%;background:var(--tr);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.75rem;color:#fff">${initials}</div>
      <span style="font-size:.85rem">por <strong>${r.author_name}</strong></span>
      <span style="font-size:.78rem;color:var(--ink3)">${formatDate(r.created_at)}</span>
      ${r.isFork ? '<span style="font-size:.78rem;background:var(--tr3);color:var(--tr);padding:2px 8px;border-radius:10px">⑂ Fork</span>' : ''}
    `;
  }

  // Meta bar — backend não fornece preparo/cozimento/dificuldade
  const setMv = (id: string, val: string) => {
    const el = getEl(id);
    el?.querySelector<HTMLElement>('.d-mv')?.setAttribute('data-text', val);
    const mv = el?.querySelector<HTMLElement>('.d-mv');
    if (mv) mv.textContent = val;
  };
  setMv('meta-time', '—');
  setMv('meta-cook', '—');
  setMv('meta-servings', '4');
  setMv('meta-difficulty', '—');

  // Descrição
  setText('recipe-desc', r.description ?? '');

  // Fork lineage
  if (r.isFork && r.forked_from_title) {
    const lineage = getEl('fork-lineage');
    if (lineage) lineage.style.display = '';
    const breadcrumb = getEl('fork-tree-breadcrumb');
    if (breadcrumb) {
      breadcrumb.textContent = `"${r.forked_from_title}" → "${r.title}"`;
    }
    if (r.affectionate_note) {
      const noteEl = document.createElement('div');
      noteEl.style.cssText = 'font-size:.8rem;color:var(--ink3);margin-top:4px;font-style:italic';
      noteEl.textContent = `"${r.affectionate_note}"`;
      breadcrumb?.after(noteEl);
    }
  }

  // Ingredientes
  const ingList = getEl('ingredients-list');
  if (ingList) {
    ingList.innerHTML = r.ingredients
      .map((ing) => {
        const numericQty = parseFloat(ing.quantity);
        const baseAttr = !isNaN(numericQty) ? ` data-base="${numericQty}"` : '';
        const lock = ing.is_locked ? ' 🔒' : '';
        return `<li><span class="ing-q"${baseAttr}>${ing.quantity}</span> ${ing.name}${lock}</li>`;
      })
      .join('');
  }

  // Passos
  const stepsList = getEl('steps-list');
  if (stepsList) {
    const sorted = [...r.steps].sort((a, b) => a.step_number - b.step_number);
    stepsList.innerHTML = sorted
      .map(
        (s) => `
        <div class="step-block" style="display:flex;gap:12px;margin-bottom:1rem">
          <div style="min-width:28px;height:28px;border-radius:50%;background:var(--tr);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.82rem;flex-shrink:0">${s.step_number}</div>
          <p style="margin:0;padding-top:4px">${s.instruction}${s.is_locked ? ' 🔒' : ''}</p>
        </div>
      `,
      )
      .join('');
  }
}

function renderForks(forks: RecipeViewModel[]): void {
  const section = getEl('forks-section');
  if (!section) return;

  if (forks.length === 0) return;

  section.style.display = '';
  const sub = getEl('forks-sub');
  if (sub) sub.textContent = `${forks.length} fork${forks.length > 1 ? 's' : ''} desta receita`;

  const forkList = getEl('fork-list');
  if (forkList) {
    forkList.innerHTML = forks
      .slice(0, 5)
      .map(
        (f) => `
        <div class="fork-card" style="display:flex;align-items:center;gap:10px;padding:.5rem;border-radius:8px;background:var(--bg2);margin-bottom:.4rem;cursor:pointer" data-id="${f.id}">
          <span style="font-size:1.4rem">${f.emoji}</span>
          <div>
            <div style="font-weight:600;font-size:.85rem">${f.title}</div>
            <div style="font-size:.72rem;color:var(--ink3)">por ${f.author_name}</div>
          </div>
        </div>
      `,
      )
      .join('');

    forkList.querySelectorAll<HTMLElement>('.fork-card').forEach((card) => {
      card.addEventListener('click', () => {
        window.location.href = `receita.html?id=${card.dataset['id']}`;
      });
    });
  }

  const vis = getEl('fork-tree-vis');
  if (vis) {
    vis.innerHTML = forks
      .slice(0, 5)
      .map((f) => `<span style="font-size:.78rem;background:var(--tr3);color:var(--tr);padding:2px 8px;border-radius:10px;margin:2px;display:inline-block">⑂ ${f.author_name}</span>`)
      .join('');
  }
}

// ── Botões de ação ─────────────────────────────────────────────────────────

function setupActions(r: RecipeViewModel): void {
  const currentUser = getCurrentUser();
  const isOwner = currentUser && r.author === currentUser.userId;

  const favBtn = getEl('btn-fav');
  if (favBtn) {
    favBtn.textContent = favoritesService.has(r.id) ? '♥ Favoritado' : '♡ Favoritar';
    favBtn.addEventListener('click', () => {
      const added = favoritesService.toggle(r.id);
      favBtn.textContent = added ? '♥ Favoritado' : '♡ Favoritar';
    });
  }

  const forkBtn = getEl('btn-fork');
  if (forkBtn) {
    if (isOwner) {
      forkBtn.textContent = '✏️ Editar receita';
      forkBtn.addEventListener('click', () => {
        window.location.href = `form_receita.html?id=${r.id}&edit=true`;
      });
    } else {
      forkBtn.addEventListener('click', () => {
        if (!isLoggedIn()) {
          window.location.href = 'login.html';
          return;
        }
        openForkModal(r.title);
      });
    }
  }

  const createForkBtn = getEl('btn-create-fork');
  if (createForkBtn) {
    createForkBtn.addEventListener('click', () => {
      if (!isLoggedIn()) {
        window.location.href = 'login.html';
        return;
      }
      openForkModal(r.title);
    });
  }

  // Se é o dono, adiciona botão de deletar ao lado do fork
  if (isOwner) {
    const metaBar = getEl('recipe-meta-bar');
    if (metaBar) {
      const delBtn = document.createElement('button');
      delBtn.className = 'btn-o';
      delBtn.textContent = '🗑 Excluir';
      delBtn.style.marginLeft = '8px';
      delBtn.addEventListener('click', async () => {
        if (!confirm(`Excluir "${r.title}"? Esta ação não pode ser desfeita.`)) return;
        try {
          await recipeService.delete(r.id);
          showToast('Receita excluída.', 'ok');
          setTimeout(() => (window.location.href = 'index.html'), 1000);
        } catch {
          showToast('Erro ao excluir receita.', 'inf');
        }
      });
      metaBar.querySelector('.d-actions')?.appendChild(delBtn);
    }
  }

  // Rating — puramente visual
  initRating();
  getEl('btn-submit-review')?.addEventListener('click', () => {
    showToast('Avaliações não são sincronizadas com o servidor nesta versão.', 'inf');
  });
}

// ── Init ───────────────────────────────────────────────────────────────────

async function init(): Promise<void> {
  renderNav();

  initForkModal(async (_originName, note) => {
    try {
      const newRecipe = await recipeService.fork(recipeId, note);
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
  });

  try {
    const recipe: ApiRecipe = await recipeService.getById(recipeId);
    const vm = recipeMetaService.toViewModel(recipe);

    renderDetail(vm);
    setupActions(vm);
    initServingCalculator(4);

    // Busca forks desta receita
    const all = await recipeService.getAll();
    const forks = all
      .filter((r) => r.forked_from === vm.id)
      .map((r) => recipeMetaService.toViewModel(r));
    renderForks(forks);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      showToast('Receita não encontrada.', 'inf');
      setTimeout(() => (window.location.href = 'index.html'), 1500);
    } else {
      showToast('Erro ao carregar receita.', 'inf');
    }
  }
}

void init();
