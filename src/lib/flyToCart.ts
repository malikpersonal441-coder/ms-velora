/**
 * "Fly to cart" — clones a source image, arcs it into the element marked
 * [data-cart-target] (the navbar bag), then pulses that target.
 * Resolves once the flight lands so callers can sequence the cart update.
 */
export function flyToCart(source: HTMLElement | null): Promise<void> {
  const target = document.querySelector<HTMLElement>('[data-cart-target]');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!source || !target || reduced) return Promise.resolve();

  const from = source.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  const size = Math.min(from.width, from.height, 220);

  const ghost = document.createElement('div');
  const img = source instanceof HTMLImageElement ? source : source.querySelector('img');
  Object.assign(ghost.style, {
    position: 'fixed',
    left: `${from.left + from.width / 2 - size / 2}px`,
    top: `${from.top + from.height / 2 - size / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '50%',
    backgroundImage: img ? `url("${img.currentSrc || img.src}")` : 'none',
    backgroundColor: '#C5A059',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    border: '2px solid #C5A059',
    boxShadow: '0 20px 50px rgba(0,0,0,0.35), 0 0 0 6px rgba(197,160,89,0.15)',
    zIndex: '9999',
    pointerEvents: 'none',
    willChange: 'transform, opacity',
  } as CSSStyleDeclaration);
  document.body.appendChild(ghost);

  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const end = 28 / size;

  const flight = ghost.animate(
    [
      { transform: 'translate(0,0) scale(1) rotate(0deg)', opacity: 1, offset: 0 },
      { transform: `translate(0,-24px) scale(0.85) rotate(-8deg)`, opacity: 1, offset: 0.15 },
      { transform: `translate(${dx * 0.55}px, ${dy * 0.35 - 140}px) scale(0.5) rotate(180deg)`, opacity: 1, offset: 0.6 },
      { transform: `translate(${dx}px, ${dy}px) scale(${end}) rotate(360deg)`, opacity: 0.6, offset: 1 },
    ],
    { duration: 950, easing: 'cubic-bezier(0.5, 0, 0.3, 1)', fill: 'forwards' },
  );

  return flight.finished.then(() => {
    ghost.remove();
    target.animate(
      [
        { transform: 'scale(1)' },
        { transform: 'scale(1.35) rotate(-10deg)' },
        { transform: 'scale(0.92) rotate(6deg)' },
        { transform: 'scale(1)' },
      ],
      { duration: 550, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
    );
    const ring = document.createElement('span');
    ring.className = 'cart-land-ring';
    target.appendChild(ring);
    ring.addEventListener('animationend', () => ring.remove());
  });
}
