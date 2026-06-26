import { isLoggedIn, getCurrentUser, logout } from './auth.ts';

export function renderNav(): void {
  setupNavToggle();

  const container = document.getElementById('nav-auth-container');
  if (!container) return;

  if (!isLoggedIn()) return;

  const user = getCurrentUser();
  if (!user) return;

  container.innerHTML = `
    <a href="perfil.html" class="nav-user"><i class="fa-solid fa-circle-user"></i> ${user.username}</a>
    <button id="btn-logout" class="btn-o"><i class="fa-solid fa-right-from-bracket"></i> Sair</button>
  `;

  document.getElementById('btn-logout')?.addEventListener('click', () => logout());
}

// Menu hamburger (mobile)
function setupNavToggle(): void {
  const toggle = document.getElementById('nav-toggle');
  const links = document.getElementById('nav-links');
  if (!toggle || !links) return;

  toggle.addEventListener('click', () => {
    links.classList.toggle('open');
  });
}
