import { isLoggedIn, getCurrentUser, logout } from './auth.ts';

export function renderNav(): void {
  const container = document.getElementById('nav-auth-container');
  if (!container) return;

  if (!isLoggedIn()) return;

  const user = getCurrentUser();
  if (!user) return;

  container.innerHTML = `
    <span class="prof-name" style="font-size:.82rem;font-weight:600">${user.username}</span>
    <button id="btn-logout" class="btn-o" style="cursor:pointer">Sair</button>
  `;

  document.getElementById('btn-logout')?.addEventListener('click', () => logout());
}
