type OnRateCallback = (value: number) => void;

let currentRating = 0;

export function initRating(onRate?: OnRateCallback): void {
  const stars = document.querySelectorAll<HTMLSpanElement>('#stars span');

  stars.forEach((star, index) => {
    const value = index + 1;

    star.addEventListener('mouseenter', () => highlightStars(stars, value));
    star.addEventListener('mouseleave', () => highlightStars(stars, currentRating));
    star.addEventListener('click', () => {
      currentRating = value;
      highlightStars(stars, currentRating);
      onRate?.(currentRating);
    });
  });
}

function highlightStars(stars: NodeListOf<HTMLSpanElement>, upTo: number): void {
  stars.forEach((star, index) => {
    const filled = index < upTo;
    star.textContent = filled ? '★' : '☆';
    star.classList.toggle('active', filled);
  });
}

export function getRating(): number {
  return currentRating;
}
