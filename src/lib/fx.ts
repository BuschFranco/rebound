/**
 * Efectos visuales imperativos (Web Animations API): no pasan por el estado de React, así no
 * re-renderizan nada y se pueden disparar desde un click o un efecto. Con "reducir movimiento"
 * activado en el sistema no se muestran.
 */

const BRAND_COLORS = ["var(--accent)", "var(--accent-2)", "#ffffff"];

const BALL_SVG = `<svg viewBox="0 0 32 32" width="100%" height="100%" aria-hidden="true">
  <circle cx="16" cy="16" r="15" fill="var(--accent)" />
  <g fill="none" stroke="#0b0a0f" stroke-width="1.8" stroke-linecap="round">
    <path d="M1.5 16h29" /><path d="M16 1v30" />
    <path d="M5.4 5.4a14 14 0 0 1 0 21.2" /><path d="M26.6 5.4a14 14 0 0 0 0 21.2" />
  </g>
</svg>`;

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function center(el: Element) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function layer(className = "") {
  const el = document.createElement("div");
  el.setAttribute("aria-hidden", "true");
  el.className = `pointer-events-none fixed left-0 top-0 z-[110] ${className}`;
  document.body.appendChild(el);
  return el;
}

const STAR_SVG = `<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true">
  <path d="m12 3.5 2.6 5.3 5.9.9-4.25 4.1 1 5.85L12 16.9l-5.25 2.75 1-5.85L3.5 9.7l5.9-.9L12 3.5Z"
    fill="var(--accent)" stroke="#0b0a0f" stroke-width="1.2" stroke-linejoin="round" />
</svg>`;

/** Hace "rebotar" un ícono del encabezado (carrito o favoritos). */
function bump(selector: string) {
  const target = document.querySelector(selector);
  if (!target || prefersReducedMotion()) return;
  target.animate(
    [{ transform: "scale(1)" }, { transform: "scale(1.3)" }, { transform: "scale(0.92)" }, { transform: "scale(1)" }],
    { duration: 420, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
  );
}

/** Rebote del carrito y una vibración corta en los celulares que lo permiten. */
export function bumpCart() {
  bump("[data-cart-target]");
  navigator.vibrate?.(15);
}

/**
 * Lanza `svg` desde `from` hasta el elemento `selector` siguiendo una parábola; al llegar, ese
 * elemento rebota. La promesa se resuelve al llegar (o al instante si no hay animación).
 */
function flyTo(from: Element, selector: string, svg: string, { size = 28, spin = 420 } = {}): Promise<void> {
  const target = document.querySelector(selector);
  if (!target || prefersReducedMotion() || document.hidden) return Promise.resolve();

  const start = center(from);
  const end = center(target);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  // Altura del arco: por encima del punto más alto del recorrido.
  const peak = Math.min(0, dy) - Math.max(80, Math.abs(dx) * 0.25);
  const duration = 650;

  // Horizontal a velocidad constante (capa externa) y vertical con aceleración (capa interna) = parábola.
  const outer = layer();
  outer.style.transform = `translate(${start.x - size / 2}px, ${start.y - size / 2}px)`;
  const inner = document.createElement("div");
  inner.style.width = inner.style.height = `${size}px`;
  inner.innerHTML = svg;
  outer.appendChild(inner);

  outer.animate(
    [
      { transform: `translate(${start.x - size / 2}px, ${start.y - size / 2}px)` },
      { transform: `translate(${end.x - size / 2}px, ${start.y - size / 2}px)` },
    ],
    { duration, easing: "linear", fill: "forwards" },
  );
  const fall = inner.animate(
    [
      // Sube desacelerando y baja acelerando (cada easing vale para el tramo que empieza en ese keyframe).
      { transform: "translateY(0) rotate(0deg) scale(1)", easing: "cubic-bezier(0.33, 0.67, 0.67, 1)" },
      { transform: `translateY(${peak}px) rotate(${spin / 2}deg) scale(1)`, offset: 0.42, easing: "cubic-bezier(0.33, 0, 0.67, 0.33)" },
      { transform: `translateY(${dy}px) rotate(${spin}deg) scale(0.45)` },
    ],
    { duration, fill: "forwards" },
  );

  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      window.clearTimeout(safety);
      outer.remove();
      bump(selector);
      resolve();
    };
    fall.onfinish = finish;
    fall.oncancel = finish;
    // Si el navegador no llega a dibujar la animación (pestaña en segundo plano), se sigue igual.
    const safety = window.setTimeout(finish, duration + 300);
  });
}

/** Tiro al carrito: una pelota sale de `from` y "encesta" en el ícono del carrito. */
export async function flyToCart(from: Element): Promise<void> {
  await flyTo(from, "[data-cart-target]", BALL_SVG);
  navigator.vibrate?.(15);
}

/**
 * Agregar a favoritos: chispas alrededor de la estrella tocada y una estrella que vuela hasta la de
 * favoritos del encabezado.
 */
export function flyToFavorites(from: Element) {
  if (prefersReducedMotion()) return;
  const { x, y } = center(from);
  const root = layer();
  burst(root, x, y, { count: 10, distance: 28, spread: 22, size: 4 });
  window.setTimeout(() => root.remove(), 900);
  void flyTo(from, "[data-favorites-target]", STAR_SVG, { size: 24, spin: 216 });
}

/** Partículas con los colores de la marca que salen en círculo desde (x, y). */
function burst(root: HTMLElement, x: number, y: number, { count = 18, distance = 60, spread = 70, size = 5, fall = 30 } = {}) {
  for (let i = 0; i < count; i++) {
    const dot = document.createElement("span");
    const dotSize = size + Math.random() * size;
    Object.assign(dot.style, {
      position: "absolute",
      left: `${x}px`,
      top: `${y}px`,
      width: `${dotSize}px`,
      height: `${dotSize}px`,
      borderRadius: i % 3 === 0 ? "2px" : "9999px",
      background: BRAND_COLORS[i % BRAND_COLORS.length],
    });
    root.appendChild(dot);
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const reach = distance + Math.random() * spread;
    dot.animate(
      [
        { transform: "translate(-50%, -50%) scale(1)", opacity: 1 },
        {
          transform: `translate(calc(-50% + ${Math.cos(angle) * reach}px), calc(-50% + ${Math.sin(angle) * reach + (fall * reach) / (distance + spread)}px)) scale(0.4)`,
          opacity: 0,
        },
      ],
      { duration: 650 + Math.random() * 300, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" },
    );
  }
}

/**
 * "¡Swish!": estallido de partículas con los colores de la marca y un texto que sube y se desvanece,
 * centrado en `anchor`. Se usa al desbloquear un beneficio (promo aplicada, envío gratis).
 */
export function celebrate(anchor: Element, text: string) {
  if (prefersReducedMotion()) return;
  const { x, y } = center(anchor);
  const root = layer();
  burst(root, x, y);

  const label = document.createElement("span");
  label.textContent = text;
  label.className =
    "absolute whitespace-nowrap rounded-full bg-accent px-4 py-1.5 font-display text-2xl uppercase italic text-black shadow-[0_0_30px_-5px_var(--accent)]";
  Object.assign(label.style, { left: `${x}px`, top: `${y}px` });
  root.appendChild(label);
  label
    .animate(
      [
        { transform: "translate(-50%, -50%) scale(0.6)", opacity: 0 },
        { transform: "translate(-50%, -90%) scale(1.08)", opacity: 1, offset: 0.25 },
        { transform: "translate(-50%, -110%) scale(1)", opacity: 1, offset: 0.75 },
        { transform: "translate(-50%, -150%) scale(0.95)", opacity: 0 },
      ],
      { duration: 1400, easing: "ease-out", fill: "forwards" },
    )
    .finished.finally(() => root.remove());
}

/**
 * Quitar del carrito: la fila se tiñe de rojo, sale deslizándose hacia la derecha y después se cierra
 * su espacio. La promesa se resuelve al terminar (o al instante sin animación), y recién ahí se quita.
 */
export function slideOut(el: HTMLElement): Promise<void> {
  if (prefersReducedMotion() || document.hidden) return Promise.resolve();
  const height = el.offsetHeight;
  el.style.overflow = "hidden";
  el.style.borderRadius = "12px";
  const red = "rgb(255 77 79 / 0.3)"; // --danger
  const slide = el.animate(
    [
      { transform: "translateX(0)", backgroundColor: "rgb(255 77 79 / 0)", opacity: 1 },
      { transform: "translateX(0)", backgroundColor: red, opacity: 1, offset: 0.25 },
      { transform: "translateX(110%)", backgroundColor: red, opacity: 0 },
    ],
    { duration: 420, easing: "cubic-bezier(0.55, 0, 1, 0.45)", fill: "forwards" },
  );

  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      window.clearTimeout(safety);
      resolve();
    };
    slide.onfinish = () => {
      const collapse = el.animate(
        [
          { height: `${height}px`, paddingTop: getComputedStyle(el).paddingTop, paddingBottom: getComputedStyle(el).paddingBottom },
          { height: "0px", paddingTop: "0px", paddingBottom: "0px" },
        ],
        { duration: 220, easing: "ease-out", fill: "forwards" },
      );
      collapse.onfinish = finish;
      collapse.oncancel = finish;
    };
    slide.oncancel = finish;
    // Si el navegador no llega a dibujar la animación, el producto se quita igual.
    const safety = window.setTimeout(finish, 900);
  });
}
