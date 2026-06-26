let baseServings = 4;
let currentServings = 4;

export function initServingCalculator(base: number): void {
  baseServings = base;
  currentServings = base;

  const display = document.getElementById('serv-count');
  if (display) display.textContent = String(base);

  document.getElementById('serv-dec')?.addEventListener('click', () => changeServings(-1));
  document.getElementById('serv-inc')?.addEventListener('click', () => changeServings(+1));
}

function changeServings(delta: number): void {
  currentServings = Math.max(1, currentServings + delta);

  const display = document.getElementById('serv-count');
  if (display) display.textContent = String(currentServings);

  recalculateQuantities();
}

function recalculateQuantities(): void {
  const ratio = currentServings / baseServings;

  document.querySelectorAll<HTMLElement>('#ingredients-list .ing-q[data-base]').forEach((el) => {
    const base = parseFloat(el.dataset.base ?? '0');
    if (!base) return;

    const scaled = Math.round(base * ratio);
    const unit = el.dataset.unit ?? inferUnit(el.textContent ?? '');
    el.textContent = unit ? `${scaled} ${unit}` : `${scaled}${el.dataset.suffix ?? ''}`;
  });
}

function inferUnit(text: string): string {
  if (text.includes('ml')) return 'ml';
  if (text.includes('g'))  return 'g';
  return '';
}
