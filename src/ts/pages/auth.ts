import { authService, ApiError } from '../services/api.ts';
import { saveAuth, isLoggedIn } from '../services/auth.ts';
import { showToast } from '../utils/toast.ts';

// Se já logado, redireciona direto para a home
if (isLoggedIn()) {
  window.location.href = 'index.html';
}

function getEl<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

// Troca de abas
function setupTabs(): void {
  const tabs = document.querySelectorAll<HTMLButtonElement>('.ptab[data-panel]');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('on'));
      tab.classList.add('on');
      document.querySelectorAll<HTMLElement>('[id^="panel-"]').forEach((p) => {
        p.style.display = 'none';
      });
      const panelId = tab.dataset['panel'] ?? '';
      const panel = document.getElementById(panelId);
      if (panel) panel.style.display = '';
    });
  });

  getEl('switch-to-register').addEventListener('click', () => {
    const registerTab = getEl<HTMLButtonElement>('tab-register');
    registerTab.click();
  });
}

async function handleLogin(e: SubmitEvent): Promise<void> {
  e.preventDefault();

  const username = getEl<HTMLInputElement>('login-email').value.trim();
  const password = getEl<HTMLInputElement>('login-password').value;

  if (!username || !password) {
    showToast('Preencha usuário e senha.', 'inf');
    return;
  }

  try {
    const data = await authService.login(username, password);
    saveAuth(data, username);
    window.location.href = 'index.html';
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      showToast('Usuário ou senha inválidos.', 'inf');
    } else {
      showToast('Erro ao entrar. Tente novamente.', 'inf');
    }
  }
}

async function handleRegister(e: SubmitEvent): Promise<void> {
  e.preventDefault();

  const username = getEl<HTMLInputElement>('reg-name').value.trim();
  const email = getEl<HTMLInputElement>('reg-email').value.trim();
  const password = getEl<HTMLInputElement>('reg-password').value;

  if (password.length < 8) {
    showToast('A senha deve ter pelo menos 8 caracteres.', 'inf');
    return;
  }

  try {
    await authService.register(username, email, password);
    // Auto-login após registro
    const loginData = await authService.login(username, password);
    saveAuth(loginData, username);
    window.location.href = 'index.html';
  } catch (err) {
    if (err instanceof ApiError && err.status === 400) {
      const body = err.body as Record<string, string[]> | null;
      if (body?.['username']) {
        showToast('Nome de usuário já existe. Escolha outro.', 'inf');
      } else {
        showToast('Dados inválidos. Verifique os campos.', 'inf');
      }
    } else {
      showToast('Erro ao criar conta. Tente novamente.', 'inf');
    }
  }
}

function init(): void {
  setupTabs();
  getEl('form-login').addEventListener('submit', (e) => void handleLogin(e as SubmitEvent));
  getEl('form-register').addEventListener('submit', (e) => void handleRegister(e as SubmitEvent));
}

init();
