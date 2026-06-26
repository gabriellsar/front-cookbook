type OnRateCallback = (value: number) => void;

let currentRating = 0;

export function initRating(onRate?: OnRateCallback, initialValue = 0): void {
  const stars = document.querySelectorAll<HTMLSpanElement>('#stars span');

  currentRating = initialValue;
  highlightStars(stars, currentRating);

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
    const icon = star.querySelector('i');
    if (icon) {
      icon.classList.toggle('fa-solid', filled);
      icon.classList.toggle('fa-regular', !filled);
    }
    star.classList.toggle('active', filled);
  });
}

export function getRating(): number {
  return currentRating;
}
