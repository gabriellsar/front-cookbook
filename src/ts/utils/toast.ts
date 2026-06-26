import type { ToastType } from '../types.ts';

let dismissTimer: ReturnType<typeof setTimeout> | null = null;

export function showToast(message: string, type: ToastType = 'ok'): void {
  const toast = document.getElementById('toast');
  if (!toast) return;

  if (dismissTimer) clearTimeout(dismissTimer);

  toast.textContent = message;
  toast.className = `toast ${type} show`;

  dismissTimer = setTimeout(() => {
    toast.classList.remove('show');
    dismissTimer = null;
  }, 2800);
}
