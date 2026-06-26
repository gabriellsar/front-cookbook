import { showToast } from '../utils/toast.ts';

// O backend auto-gera o título do fork; o callback recebe apenas a nota afetiva.
type OnConfirmCallback = (originName: string, note: string) => void;

let onConfirm: OnConfirmCallback | null = null;

function getElement<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id) as T | null;
  if (!el) throw new Error(`#${id} não encontrado`);
  return el;
}

export function initForkModal(callback: OnConfirmCallback): void {
  onConfirm = callback;

  getElement('fork-modal-close').addEventListener('click', closeForkModal);
  getElement('fork-modal-cancel').addEventListener('click', closeForkModal);
  getElement('fork-modal-confirm').addEventListener('click', handleConfirm);

  getElement('fork-modal-wrap').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeForkModal();
  });
}

export function openForkModal(recipeName: string): void {
  getElement('fork-origin-name').textContent = recipeName;
  (getElement<HTMLTextAreaElement>('fork-note')).value = '';
  getElement('fork-modal-wrap').classList.add('open');
  getElement<HTMLTextAreaElement>('fork-note').focus();
}

export function closeForkModal(): void {
  getElement('fork-modal-wrap').classList.remove('open');
}

function handleConfirm(): void {
  const noteInput = getElement<HTMLTextAreaElement>('fork-note');
  const originName = getElement('fork-origin-name').textContent ?? '';

  if (!noteInput.value.trim()) {
    showToast('Descreva o que você vai adaptar!', 'inf');
    noteInput.focus();
    return;
  }

  onConfirm?.(originName, noteInput.value.trim());
  closeForkModal();
}
