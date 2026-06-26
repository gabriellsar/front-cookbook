import { recipeService, ApiError } from '../services/api.ts';
import { recipeMetaService } from '../services/recipeMeta.ts';
import { renderNav } from '../services/navAuth.ts';
import { requireAuth, getCurrentUser, logout } from '../services/auth.ts';
import { favoritesService } from '../services/favorites.ts';
import { authService } from '../services/api.ts';
import { showToast } from '../utils/toast.ts';
import { formatDate, getInitials } from '../utils/format.ts';
import type { RecipeViewModel } from '../../types.ts';

requireAuth('../templates/login.html');

function getEl<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

// ── Card de receita com ações de editar/excluir ────────────────────────────

function profileRecipeCard(r: RecipeViewModel, onDelete: (id: number) => void): HTMLElement {
  const card = document.createElement('div');
  card.className = 'rcard';
  card.style.cursor = 'default';

  const forkInfo = r.isFork && r.forked_from_title
    ? `<div class="rcard-fork-info"><i class="fa-solid fa-code-branch"></i> de "${r.forked_from_title}"</div>`
    : '';

  card.innerHTML = `
    <div class="rcard-img" style="background:${r.backgroundColor}">
      <i class="fa-solid ${r.icon}"></i>
    </div>
    <div class="rcard-body">
      <div class="rcard-title" data-id="${r.id}">${r.title}</div>
      <div class="rcard-meta"><i class="fa-regular fa-calendar"></i> ${formatDate(r.created_at)}</div>
      ${forkInfo}
      <div class="rcard-actions">
        <button class="btn-mini btn-edit" data-id="${r.id}"><i class="fa-solid fa-pen"></i> Editar</button>
        <button class="btn-mini btn-mini-danger btn-del" data-id="${r.id}"><i class="fa-solid fa-trash"></i> Excluir</button>
      </div>
    </div>
  `;

  card.querySelector('.rcard-title')?.addEventListener('click', () => {
    window.location.href = `receita.html?id=${r.id}`;
  });

  card.querySelector<HTMLButtonElement>('.btn-edit')?.addEventListener('click', () => {
    window.location.href = `form_receita.html?id=${r.id}&edit=true`;
  });

  card.querySelector<HTMLButtonElement>('.btn-del')?.addEventListener('click', async () => {
    if (!confirm(`Excluir "${r.title}"?`)) return;
    try {
      await recipeService.delete(r.id);
      showToast('Receita excluída.', 'ok');
      onDelete(r.id);
    } catch {
      showToast('Erro ao excluir receita.', 'inf');
    }
  });

  return card;
}

// ── Renderização das grids ─────────────────────────────────────────────────

function renderRecipeGrid(recipes: RecipeViewModel[], gridId: string, onDelete: (id: number) => void): void {
  const grid = getEl(gridId);
  if (!grid) return;

  grid.innerHTML = '';

  if (recipes.length === 0) {
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--ink3);padding:2rem">Nenhuma receita aqui ainda.</p>';
    return;
  }

  recipes.forEach((r) => grid.appendChild(profileRecipeCard(r, onDelete)));
}

function renderSaved(all: RecipeViewModel[]): void {
  const savedIds = favoritesService.getAll();
  const saved = all.filter((r) => savedIds.has(r.id));

  const emptyEl = getEl('saved-empty');
  const gridEl = getEl('saved-recipes-grid');

  if (saved.length === 0) {
    emptyEl && (emptyEl.style.display = '');
    gridEl && (gridEl.style.display = 'none');
    return;
  }

  emptyEl && (emptyEl.style.display = 'none');
  gridEl && (gridEl.style.display = '');

  if (gridEl) {
    gridEl.innerHTML = '';
    saved.forEach((r) => {
      const card = document.createElement('div');
      card.className = 'rcard';
      card.style.cursor = 'pointer';
      card.innerHTML = `
        <div class="rcard-img" style="background:${r.backgroundColor}"><i class="fa-solid ${r.icon}"></i></div>
        <div class="rcard-body">
          <div class="rcard-title">${r.title}</div>
          <div class="rcard-meta"><i class="fa-regular fa-user"></i> ${r.author_name}</div>
        </div>
      `;
      card.addEventListener('click', () => {
        window.location.href = `receita.html?id=${r.id}`;
      });
      gridEl.appendChild(card);
    });
  }
}

// ── Abas ───────────────────────────────────────────────────────────────────

function setupTabs(): void {
  const tabs = document.querySelectorAll<HTMLButtonElement>('.ptab[data-tab]');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => {
        t.classList.remove('on');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('on');
      tab.setAttribute('aria-selected', 'true');

      document.querySelectorAll<HTMLElement>('[role="tabpanel"]').forEach((p) => {
        p.style.display = 'none';
      });
      const panelId = tab.dataset['tab'] ?? '';
      const panel = document.getElementById(panelId);
      if (panel) panel.style.display = '';
    });
  });
}

// ── Alterar senha ──────────────────────────────────────────────────────────

function setupChangePassword(username: string): void {
  const editBtn = getEl('btn-edit-profile');
  if (!editBtn) return;

  const openLabel = '<i class="fa-solid fa-key"></i> Alterar senha';
  const closeLabel = '<i class="fa-solid fa-xmark"></i> Fechar';
  editBtn.innerHTML = openLabel;
  editBtn.addEventListener('click', () => {
    const existing = document.getElementById('change-pw-form');
    if (existing) {
      existing.remove();
      editBtn.innerHTML = openLabel;
      return;
    }

    editBtn.innerHTML = closeLabel;

    const form = document.createElement('div');
    form.id = 'change-pw-form';
    form.className = 'change-pw-card';
    form.innerHTML = `
      <div class="change-pw-title"><i class="fa-solid fa-key"></i> Alterar senha</div>
      <div class="fl-group" style="margin-bottom:.5rem">
        <label class="fl-label">Senha atual</label>
        <input class="fl-input" id="pw-current" type="password" placeholder="Sua senha atual">
      </div>
      <div class="fl-group" style="margin-bottom:.5rem">
        <label class="fl-label">Nova senha</label>
        <input class="fl-input" id="pw-new" type="password" placeholder="Mínimo 8 caracteres" minlength="8">
      </div>
      <div class="fl-group" style="margin-bottom:.8rem">
        <label class="fl-label">Confirmar nova senha</label>
        <input class="fl-input" id="pw-confirm" type="password" placeholder="Repita a nova senha">
      </div>
      <button class="btn-p" id="pw-submit" style="width:100%">Verificar e alterar</button>
    `;

    const header = getEl('profile-header');
    header?.after(form);

    form.querySelector('#pw-submit')?.addEventListener('click', async () => {
      const current = (document.getElementById('pw-current') as HTMLInputElement).value;
      const newPw = (document.getElementById('pw-new') as HTMLInputElement).value;
      const confirm = (document.getElementById('pw-confirm') as HTMLInputElement).value;

      if (newPw.length < 8) {
        showToast('Nova senha deve ter pelo menos 8 caracteres.', 'inf');
        return;
      }
      if (newPw !== confirm) {
        showToast('Nova senha e confirmação não coincidem.', 'inf');
        return;
      }

      try {
        await authService.login(username, current);
        showToast('Senha atual correta. A alteração de senha requer suporte do servidor (não disponível nesta versão). Faça login novamente.', 'inf');
        setTimeout(() => logout(), 3000);
      } catch {
        showToast('Senha atual incorreta.', 'inf');
      }
    });
  });
}

// ── Init ───────────────────────────────────────────────────────────────────

async function init(): Promise<void> {
  renderNav();
  setupTabs();

  const user = getCurrentUser();
  if (!user) return;

  // Header do perfil
  const avatarEl = getEl('profile-avatar');
  if (avatarEl) avatarEl.textContent = getInitials(user.username);
  const nameEl = getEl('profile-name');
  if (nameEl) nameEl.textContent = user.username;

  const bioEl = getEl('profile-bio');
  if (bioEl) {
    bioEl.textContent = user.role
      ? `Papel: ${user.role === 'GUARDIAN' ? 'Guardião' : 'Herdeiro'}`
      : 'Membro da comunidade Panela';
  }

  setupChangePassword(user.username);

  try {
    const recipes = await recipeService.getAll();
    const allVm = recipes.map((r) => recipeMetaService.toViewModel(r));

    let myRecipes = allVm.filter((r) => r.author === user.userId && !r.isFork);
    let myForks = allVm.filter((r) => r.author === user.userId && r.isFork);

    const savedCount = favoritesService.getAll().size;
    const statsEl = getEl('profile-stats');
    if (statsEl) {
      statsEl.textContent = `${myRecipes.length} receitas · ${myForks.length} forks · ${savedCount} favoritas`;
    }

    const removeFromList = (id: number, list: RecipeViewModel[], setter: (l: RecipeViewModel[]) => void, gridId: string) => {
      setter(list.filter((r) => r.id !== id));
      renderRecipeGrid(list.filter((r) => r.id !== id), gridId, (rid) => removeFromList(rid, list, setter, gridId));
    };

    renderRecipeGrid(myRecipes, 'my-recipes-grid', (id) => {
      myRecipes = myRecipes.filter((r) => r.id !== id);
      renderRecipeGrid(myRecipes, 'my-recipes-grid', () => {});
      const statsEl2 = getEl('profile-stats');
      if (statsEl2) statsEl2.textContent = `${myRecipes.length} receitas · ${myForks.length} forks · ${favoritesService.getAll().size} favoritas`;
    });

    renderRecipeGrid(myForks, 'my-forks-grid', (id) => {
      myForks = myForks.filter((r) => r.id !== id);
      renderRecipeGrid(myForks, 'my-forks-grid', () => {});
    });

    renderSaved(allVm);
  } catch (err) {
    if (err instanceof ApiError) {
      showToast('Erro ao carregar receitas.', 'inf');
    }
  }
}

void init();
