import { recipeService, ingredientService, stepService, ApiError } from '../services/api.ts';
import { recipeMetaService } from '../services/recipeMeta.ts';
import { renderNav } from '../services/navAuth.ts';
import { requireAuth, getCurrentUser } from '../services/auth.ts';
import { showToast } from '../utils/toast.ts';
import type { ApiRecipe } from '../../types.ts';

requireAuth('../templates/login.html');

const params = new URLSearchParams(location.search);
const editId = params.get('id') ? Number(params.get('id')) : null;
const isEditMode = params.get('edit') === 'true' && editId !== null;

function getEl<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

// Indica se o usuário pode trancar/destrancar itens nesta receita.
// Espelha a regra do backend (`_is_item_protected`): só o autor de uma
// receita ORIGINAL (não-fork) gerencia os "segredos de família".
// Em forks, os itens trancados são herdados e ficam somente-leitura.
let canLock = true;

// Renderiza o controle de cadeado de um item (ingrediente ou passo):
// - editável (checkbox) quando o usuário pode trancar;
// - indicador somente-leitura quando o item é um segredo herdado de um fork.
function lockControl(isLocked: boolean): string {
  if (canLock) {
    return `<label class="lock-label" title="Trancar como segredo de família (não editável por quem fizer fork)">
         <input type="checkbox" class="lock-chk" ${isLocked ? 'checked' : ''}> <i class="fa-solid fa-lock"></i>
       </label>`;
  }
  if (isLocked) {
    return `<span class="lock-label lock-readonly" title="Segredo de família trancado — não pode ser alterado neste fork">
         <i class="fa-solid fa-lock"></i>
       </span>`;
  }
  return '';
}

// ── Linhas de ingredientes ─────────────────────────────────────────────────

function newIngredientRow(qty = '', name = '', apiId?: number, isLocked = false): HTMLElement {
  const row = document.createElement('div');
  row.className = 'ing-form-row';
  if (apiId) row.dataset['apiId'] = String(apiId);
  if (isLocked) row.dataset['locked'] = 'true';

  const readonly = !canLock && isLocked; // segredo herdado num fork → bloqueado
  const dis = readonly ? 'disabled' : '';

  row.innerHTML = `
    <input class="fl-input ing-qty" type="text" placeholder="Ex: 300g" value="${qty}" ${dis}>
    <input class="fl-input ing-name" type="text" placeholder="Ex: farinha de trigo" value="${name}" ${dis}>
    ${lockControl(isLocked)}
    <button type="button" class="btn-rm" aria-label="Remover ingrediente" ${dis}><i class="fa-solid fa-xmark"></i></button>
  `;

  row.querySelector('.btn-rm')?.addEventListener('click', () => {
    const container = document.getElementById('ingredients-form');
    if (container && container.querySelectorAll('.ing-form-row').length > 1) {
      row.remove();
    } else {
      showToast('Deve haver pelo menos um ingrediente.', 'inf');
    }
  });

  return row;
}

// ── Linhas de passos ───────────────────────────────────────────────────────

function updateStepNumbers(): void {
  document.querySelectorAll('#steps-form .step-n-form').forEach((el, i) => {
    el.textContent = String(i + 1);
  });
}

function newStepRow(instruction = '', apiId?: number, isLocked = false): HTMLElement {
  const row = document.createElement('div');
  row.className = 'step-form-row';
  if (apiId) row.dataset['apiId'] = String(apiId);
  if (isLocked) row.dataset['locked'] = 'true';

  const readonly = !canLock && isLocked; // segredo herdado num fork → bloqueado
  const dis = readonly ? 'disabled' : '';

  row.innerHTML = `
    <div class="step-n-form">?</div>
    <div style="flex:1;display:flex;flex-direction:column;gap:4px">
      <textarea class="fl-input fl-ta step-inst" style="min-height:70px" placeholder="Descreva este passo…" ${dis}>${instruction}</textarea>
      ${lockControl(isLocked)}
    </div>
    <button type="button" class="btn-rm" aria-label="Remover passo" ${dis}><i class="fa-solid fa-xmark"></i></button>
  `;

  row.querySelector('.btn-rm')?.addEventListener('click', () => {
    const container = document.getElementById('steps-form');
    if (container && container.querySelectorAll('.step-form-row').length > 1) {
      row.remove();
      updateStepNumbers();
    } else {
      showToast('Deve haver pelo menos um passo.', 'inf');
    }
  });

  return row;
}

// ── Setup das rows iniciais (substituir HTML estático) ─────────────────────

function setupInitialRows(): void {
  const ingContainer = document.getElementById('ingredients-form');
  if (ingContainer) {
    ingContainer.innerHTML = '';
    ingContainer.appendChild(newIngredientRow());
    ingContainer.appendChild(newIngredientRow());
  }

  const stepsContainer = document.getElementById('steps-form');
  if (stepsContainer) {
    stepsContainer.innerHTML = '';
    stepsContainer.appendChild(newStepRow());
    stepsContainer.appendChild(newStepRow());
    updateStepNumbers();
  }
}

// ── Adicionar linhas ───────────────────────────────────────────────────────

function setupAddButtons(): void {
  getEl('btn-add-ingredient')?.addEventListener('click', () => {
    const container = document.getElementById('ingredients-form');
    if (container) {
      container.appendChild(newIngredientRow());
    }
  });

  getEl('btn-add-step')?.addEventListener('click', () => {
    const container = document.getElementById('steps-form');
    if (container) {
      container.appendChild(newStepRow());
      updateStepNumbers();
    }
  });
}

// ── Tags ───────────────────────────────────────────────────────────────────

function setupTags(selectedTags: string[] = []): void {
  document.querySelectorAll<HTMLButtonElement>('.tag-opt').forEach((btn) => {
    if (selectedTags.includes(btn.dataset['tag'] ?? '')) btn.classList.add('on');

    btn.addEventListener('click', () => btn.classList.toggle('on'));
  });
}

function getSelectedTags(): string[] {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('.tag-opt.on')).map(
    (b) => b.dataset['tag'] ?? '',
  );
}

// ── Coleta dos dados do formulário ─────────────────────────────────────────

interface IngredientFormData {
  qty: string;
  name: string;
  isLocked: boolean;
  apiId?: number;
}

interface StepFormData {
  instruction: string;
  isLocked: boolean;
  apiId?: number;
}

function collectIngredients(): IngredientFormData[] {
  return Array.from(document.querySelectorAll<HTMLElement>('#ingredients-form .ing-form-row')).map(
    (row) => ({
      qty: (row.querySelector<HTMLInputElement>('.ing-qty')?.value ?? '').trim(),
      name: (row.querySelector<HTMLInputElement>('.ing-name')?.value ?? '').trim(),
      isLocked: (row.querySelector<HTMLInputElement>('.lock-chk')?.checked) ?? false,
      apiId: row.dataset['apiId'] ? Number(row.dataset['apiId']) : undefined,
    }),
  );
}

function collectSteps(): StepFormData[] {
  return Array.from(document.querySelectorAll<HTMLElement>('#steps-form .step-form-row')).map(
    (row) => ({
      instruction: (row.querySelector<HTMLTextAreaElement>('.step-inst')?.value ?? '').trim(),
      isLocked: (row.querySelector<HTMLInputElement>('.lock-chk')?.checked) ?? false,
      apiId: row.dataset['apiId'] ? Number(row.dataset['apiId']) : undefined,
    }),
  );
}

// ── Preenchimento do formulário (modo edição) ──────────────────────────────

function populateForm(recipe: ApiRecipe): void {
  document.title = `Panela — Editar: ${recipe.title}`;
  const nameInput = getEl<HTMLInputElement>('recipe-name');
  if (nameInput) nameInput.value = recipe.title;
  const descInput = getEl<HTMLTextAreaElement>('recipe-desc');
  if (descInput) descInput.value = recipe.description ?? '';

  const timeInput = getEl<HTMLInputElement>('recipe-time');
  if (timeInput) timeInput.value = recipe.prep_time != null ? String(recipe.prep_time) : '';
  const servInput = getEl<HTMLInputElement>('recipe-servings');
  if (servInput) servInput.value = recipe.servings != null ? String(recipe.servings) : '';
  const videoInput = getEl<HTMLInputElement>('recipe-video');
  if (videoInput) videoInput.value = recipe.video_url ?? '';

  const h1 = document.querySelector<HTMLElement>('.create-h');
  if (h1) h1.textContent = 'Editar receita';

  const sub = document.querySelector<HTMLElement>('.create-sub');
  if (sub) sub.textContent = 'Atualize os campos que desejar.';

  const submitBtn = getEl<HTMLButtonElement>('[type="submit"]');
  if (submitBtn) submitBtn.textContent = 'Salvar alterações';

  if (recipe.forked_from && recipe.forked_from_title) {
    const banner = getEl('fork-origin-banner');
    if (banner) banner.style.display = '';
    const label = getEl('fork-origin-label');
    if (label) label.textContent = recipe.forked_from_title;
  }

  // Preenche ingredientes
  const ingContainer = document.getElementById('ingredients-form');
  if (ingContainer) {
    ingContainer.innerHTML = '';
    if (recipe.ingredients.length > 0) {
      recipe.ingredients.forEach((ing) => {
        ingContainer.appendChild(newIngredientRow(ing.quantity, ing.name, ing.id, ing.is_locked));
      });
    } else {
      ingContainer.appendChild(newIngredientRow());
    }
  }

  // Preenche passos
  const stepsContainer = document.getElementById('steps-form');
  if (stepsContainer) {
    stepsContainer.innerHTML = '';
    const sorted = [...recipe.steps].sort((a, b) => a.step_number - b.step_number);
    if (sorted.length > 0) {
      sorted.forEach((s) => {
        stepsContainer.appendChild(newStepRow(s.instruction, s.id, s.is_locked));
      });
    } else {
      stepsContainer.appendChild(newStepRow());
    }
    updateStepNumbers();
  }

  // Tags vêm do backend (consistentes entre usuários/dispositivos)
  setupTags(recipe.tags ?? []);
}

// ── Submissão ──────────────────────────────────────────────────────────────

async function handleSubmit(e: SubmitEvent, originalRecipe?: ApiRecipe): Promise<void> {
  e.preventDefault();

  const title = (getEl<HTMLInputElement>('recipe-name')?.value ?? '').trim();
  const description = (getEl<HTMLTextAreaElement>('recipe-desc')?.value ?? '').trim();

  const prepRaw = (getEl<HTMLInputElement>('recipe-time')?.value ?? '').trim();
  const servRaw = (getEl<HTMLInputElement>('recipe-servings')?.value ?? '').trim();
  const videoRaw = (getEl<HTMLInputElement>('recipe-video')?.value ?? '').trim();

  const prep_time = prepRaw ? Number(prepRaw) : null;
  const servings = servRaw ? Number(servRaw) : null;
  const video_url = videoRaw || null;

  if (!title) {
    showToast('O nome da receita é obrigatório.', 'inf');
    return;
  }

  const ingredients = collectIngredients();
  const steps = collectSteps();

  if (ingredients.some((i) => !i.name || !i.qty)) {
    showToast('Preencha todos os campos de ingredientes.', 'inf');
    return;
  }

  if (steps.some((s) => !s.instruction)) {
    showToast('Preencha todos os passos de preparo.', 'inf');
    return;
  }

  const tags = getSelectedTags();
  const submitBtn = getEl<HTMLButtonElement>('[type="submit"]');
  if (submitBtn) submitBtn.disabled = true;

  try {
    if (isEditMode && editId !== null && originalRecipe) {
      // Espelha a regra do backend: um item trancado só é "protegido"
      // (intocável) quando a receita é um fork. No original, o autor edita à vontade.
      const isFork = !!originalRecipe.forked_from;
      const isProtected = (locked: boolean): boolean => locked && isFork;

      // PATCH da receita (inclui tags)
      const updated = await recipeService.update(editId, { title, description, prep_time, servings, video_url, tags });

      // Ingredientes existentes: PATCH; novos: POST
      const existingIngIds = new Set(originalRecipe.ingredients.map((i) => i.id));
      const formIngIds = new Set(ingredients.filter((i) => i.apiId).map((i) => i.apiId!));

      // Deletar removidos (exceto segredos herdados protegidos)
      for (const ing of originalRecipe.ingredients) {
        if (!formIngIds.has(ing.id) && !isProtected(ing.is_locked)) {
          await ingredientService.delete(ing.id);
        }
      }
      // Atualizar existentes ou criar novos
      for (const ing of ingredients) {
        if (ing.apiId && existingIngIds.has(ing.apiId)) {
          const orig = originalRecipe.ingredients.find((i) => i.id === ing.apiId);
          if (orig && !isProtected(orig.is_locked)) {
            await ingredientService.update(ing.apiId, { name: ing.name, quantity: ing.qty, is_locked: ing.isLocked });
          }
        } else if (!ing.apiId) {
          await ingredientService.create({ recipe: editId, name: ing.name, quantity: ing.qty, is_locked: ing.isLocked });
        }
      }

      // Passos existentes: PATCH; novos: POST
      const existingStepIds = new Set(originalRecipe.steps.map((s) => s.id));
      const formStepIds = new Set(steps.filter((s) => s.apiId).map((s) => s.apiId!));

      for (const step of originalRecipe.steps) {
        if (!formStepIds.has(step.id) && !isProtected(step.is_locked)) {
          await stepService.delete(step.id);
        }
      }
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const stepNum = i + 1;
        if (step.apiId && existingStepIds.has(step.apiId)) {
          const orig = originalRecipe.steps.find((s) => s.id === step.apiId);
          if (orig && !isProtected(orig.is_locked)) {
            await stepService.update(step.apiId, { step_number: stepNum, instruction: step.instruction, is_locked: step.isLocked });
          }
        } else if (!step.apiId) {
          await stepService.create({ recipe: editId, step_number: stepNum, instruction: step.instruction, is_locked: step.isLocked });
        }
      }

      showToast('Receita atualizada!', 'ok');
      setTimeout(() => {
        window.location.href = `receita.html?id=${updated.id}`;
      }, 1000);
    } else {
      // CREATE (tags vão para o backend)
      const newRecipe = await recipeService.create({ title, description, prep_time, servings, video_url, tags });

      for (const ing of ingredients) {
        if (ing.name && ing.qty) {
          await ingredientService.create({ recipe: newRecipe.id, name: ing.name, quantity: ing.qty, is_locked: ing.isLocked });
        }
      }

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        if (step.instruction) {
          await stepService.create({ recipe: newRecipe.id, step_number: i + 1, instruction: step.instruction, is_locked: step.isLocked });
        }
      }

      // Metadados puramente visuais (ícone e cor de capa) ficam no localStorage
      recipeMetaService.setMeta(newRecipe.id, {
        icon: recipeMetaService.randomIcon(),
        backgroundColor: recipeMetaService.randomBg(),
      });

      showToast('Receita publicada!', 'ok');
      setTimeout(() => {
        window.location.href = `receita.html?id=${newRecipe.id}`;
      }, 1000);
    }
  } catch (err) {
    if (submitBtn) submitBtn.disabled = false;
    if (err instanceof ApiError) {
      showToast(`Erro ${err.status} ao salvar receita.`, 'inf');
    } else {
      showToast('Erro inesperado ao salvar.', 'inf');
    }
  }
}

// ── Init ───────────────────────────────────────────────────────────────────

async function init(): Promise<void> {
  renderNav();
  setupInitialRows();
  setupAddButtons();
  setupTags();

  let originalRecipe: ApiRecipe | undefined;

  if (isEditMode && editId !== null) {
    try {
      originalRecipe = await recipeService.getById(editId);
      // Só o autor de uma receita original (não-fork) gerencia os segredos.
      const user = getCurrentUser();
      canLock = !!user && originalRecipe.author === user.userId && !originalRecipe.forked_from;
      populateForm(originalRecipe);
    } catch {
      showToast('Erro ao carregar receita para edição.', 'inf');
    }
  }

  const form = getEl<HTMLFormElement>('create-form');
  form?.addEventListener('submit', (e) => void handleSubmit(e as SubmitEvent, originalRecipe));
}

void init();
