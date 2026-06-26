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
import type { RecipeViewModel, ApiRecipe } from '../../types.ts';

const params = new URLSearchParams(location.search);
const recipeId = Number(params.get('id'));

if (!recipeId) {
  window.location.href = 'dashboard.html';
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
    hero.innerHTML = `<i class="fa-solid ${r.icon}"></i>`;
  }

  // Tags
  const tagsEl = getEl('recipe-tags');
  if (tagsEl) {
    tagsEl.innerHTML = r.tags.length
      ? r.tags.map((t) => `<span class="d-tag">${t}</span>`).join('')
      : '';
  }

  // Título e autor
  setText('recipe-title', r.title);
  const authorBar = getEl('recipe-author-bar');
  if (authorBar) {
    const initials = getInitials(r.author_name);
    authorBar.innerHTML = `
      <div class="d-author-av">${initials}</div>
      <span class="d-author-name">por <strong>${r.author_name}</strong></span>
      <span class="d-author-date"><i class="fa-regular fa-calendar"></i> ${formatDate(r.created_at)}</span>
      ${r.isFork ? '<span class="d-author-fork"><i class="fa-solid fa-code-branch"></i> Fork</span>' : ''}
    `;
  }

  // Meta bar — preparo e porções vêm do backend
  const setMv = (id: string, val: string) => {
    const el = getEl(id);
    const mv = el?.querySelector<HTMLElement>('.d-mv');
    if (mv) mv.textContent = val;
  };
  setMv('meta-time', r.prep_time ? `${r.prep_time} min` : '—');
  setMv('meta-servings', r.servings ? String(r.servings) : '—');

  // Descrição
  setText('recipe-desc', r.description ?? '');

  // Fork lineage
  if (r.isFork && r.forked_from_title) {
    const lineage = getEl('fork-lineage');
    if (lineage) lineage.style.display = '';
    const breadcrumb = getEl('fork-tree-breadcrumb');
    if (breadcrumb) {
      breadcrumb.innerHTML = `<span class="fork-tree-node">"${r.forked_from_title}"</span> <i class="fa-solid fa-arrow-right fork-connector"></i> <span class="fork-tree-node">"${r.title}"</span>`;
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
        const lock = ing.is_locked
          ? ' <i class="fa-solid fa-lock ing-lock" title="Segredo de família trancado"></i>'
          : '';
        return `<li class="ing-item"><span class="ing-n">${ing.name}${lock}</span><span class="ing-q"${baseAttr}>${ing.quantity}</span></li>`;
      })
      .join('');
  }

  // Passos
  const stepsList = getEl('steps-list');
  if (stepsList) {
    const sorted = [...r.steps].sort((a, b) => a.step_number - b.step_number);
    stepsList.innerHTML = sorted
      .map(
        (s) => {
          const lock = s.is_locked
            ? ' <i class="fa-solid fa-lock ing-lock" title="Segredo de família trancado"></i>'
            : '';
          return `
        <div class="step">
          <div class="step-n">${s.step_number}</div>
          <div><p class="step-tx">${s.instruction}${lock}</p></div>
        </div>`;
        },
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
        <div class="fork-item" data-id="${f.id}">
          <span class="fork-item-emoji"><i class="fa-solid ${f.icon}"></i></span>
          <div class="fork-item-info">
            <div class="fork-item-title">${f.title}</div>
            <div class="fork-item-meta">por ${f.author_name}</div>
          </div>
          <i class="fa-solid fa-chevron-right fork-item-arrow"></i>
        </div>
      `,
      )
      .join('');

    forkList.querySelectorAll<HTMLElement>('.fork-item').forEach((card) => {
      card.addEventListener('click', () => {
        window.location.href = `receita.html?id=${card.dataset['id']}`;
      });
    });
  }

  const vis = getEl('fork-tree-vis');
  if (vis) {
    vis.innerHTML = forks
      .slice(0, 5)
      .map((f) => `<span class="ftv-chip"><i class="fa-solid fa-code-branch"></i> ${f.author_name}</span>`)
      .join('');
  }
}

// ── Botões de ação ─────────────────────────────────────────────────────────

function setupActions(r: RecipeViewModel): void {
  const currentUser = getCurrentUser();
  const isOwner = currentUser && r.author === currentUser.userId;

  const favBtn = getEl('btn-fav');
  if (favBtn) {
    const favLabel = (on: boolean) =>
      `<i class="fa-${on ? 'solid' : 'regular'} fa-heart"></i> ${on ? 'Favoritado' : 'Favoritar'}`;
    favBtn.innerHTML = favLabel(favoritesService.has(r.id));
    favBtn.addEventListener('click', () => {
      const added = favoritesService.toggle(r.id);
      favBtn.innerHTML = favLabel(added);
    });
  }

  const forkBtn = getEl('btn-fork');
  if (forkBtn) {
    if (isOwner) {
      forkBtn.innerHTML = '<i class="fa-solid fa-pen"></i> Editar receita';
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
      delBtn.className = 'btn-danger';
      delBtn.innerHTML = '<i class="fa-solid fa-trash"></i> Excluir';
      delBtn.addEventListener('click', async () => {
        if (!confirm(`Excluir "${r.title}"? Esta ação não pode ser desfeita.`)) return;
        try {
          await recipeService.delete(r.id);
          showToast('Receita excluída.', 'ok');
          setTimeout(() => (window.location.href = 'dashboard.html'), 1000);
        } catch {
          showToast('Erro ao excluir receita.', 'inf');
        }
      });
      metaBar.querySelector('.d-actions')?.appendChild(delBtn);
    }
  }

  // Rating — sincronizado com o backend
  let selectedRating = r.my_rating ?? 0;
  renderRatingSummary(r.average_rating, r.rating_count, r.my_rating);
  initRating((value) => {
    selectedRating = value;
  }, r.my_rating ?? 0);

  const submitBtn = getEl<HTMLButtonElement>('btn-submit-review');
  submitBtn?.addEventListener('click', async () => {
    if (!isLoggedIn()) {
      window.location.href = 'login.html';
      return;
    }
    if (selectedRating < 1) {
      showToast('Escolha de 1 a 5 estrelas antes de publicar.', 'inf');
      return;
    }
    submitBtn.disabled = true;
    try {
      const updated = await recipeService.rate(r.id, selectedRating);
      renderRatingSummary(updated.average_rating, updated.rating_count, updated.my_rating);
      showToast('Avaliação registrada. Obrigado!', 'ok');
    } catch (err) {
      if (err instanceof ApiError) {
        showToast(`Erro ${err.status} ao enviar avaliação.`, 'inf');
      } else {
        showToast('Erro inesperado ao avaliar.', 'inf');
      }
    } finally {
      submitBtn.disabled = false;
    }
  });
}

// Mostra a média atual e a nota do próprio usuário acima das estrelas.
function renderRatingSummary(avg: number, count: number, mine: number | null): void {
  const header = document.querySelector<HTMLElement>('.rating-box-h');
  if (!header) return;

  let summary = document.getElementById('rating-summary');
  if (!summary) {
    summary = document.createElement('div');
    summary.id = 'rating-summary';
    summary.style.cssText = 'font-size:.85rem;color:var(--ink3);margin:2px 0 10px';
    header.after(summary);
  }

  const avgText =
    count > 0
      ? `<i class="fa-solid fa-star" style="color:var(--gold,#E0A500)"></i> <strong>${avg.toFixed(1)}</strong> · ${count} avaliação${count > 1 ? 'ões' : ''}`
      : 'Seja a primeira pessoa a avaliar esta receita.';
  const mineText = mine ? ` &nbsp;•&nbsp; sua nota: ${mine}★` : '';
  summary.innerHTML = avgText + mineText;
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
    initServingCalculator(vm.servings ?? 4);

    // Busca forks desta receita
    const all = await recipeService.getAll();
    const forks = all
      .filter((r) => r.forked_from === vm.id)
      .map((r) => recipeMetaService.toViewModel(r));
    renderForks(forks);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      showToast('Receita não encontrada.', 'inf');
      setTimeout(() => (window.location.href = 'dashboard.html'), 1500);
    } else {
      showToast('Erro ao carregar receita.', 'inf');
    }
  }
}

void init();
