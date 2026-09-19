const paths = {
  leaf: '<path d="M19.5 3.5c-8-1-15 3-15 9a6 6 0 0 0 6 6c6 0 10-7 9-15Z"/><path d="M3 21 15 9M9 15V9m0 6h6"/>',
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  play: '<path d="m8 5 11 7-11 7Z"/>',
  pause: '<path d="M8 5v14M16 5v14" stroke-width="3"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  bag: '<rect x="5" y="6" width="14" height="15" rx="4"/><path d="M9 6V4a3 3 0 0 1 6 0v2M8 14h8v4H8zM5 10h14"/>',
  hammer: '<path d="m5 20 9-10m-4-5 5-3 6 6-3 5-8-8ZM3 18l3 3"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  moon: '<path d="M20 15.5A9 9 0 0 1 8.5 4 9 9 0 1 0 20 15.5Z"/>',
  heart:
    '<path d="M20.5 5.5c-2.2-2.3-6-1.7-8.5 1-2.5-2.7-6.3-3.3-8.5-1C-.5 10 6 16 12 21c6-5 12.5-11 8.5-15.5Z"/>',
  bowl: '<path d="M3 12h18c0 6-3 9-9 9s-9-3-9-9ZM8 3c-3 3 3 3 0 6m5-7c-3 3 3 4 0 7m5-6c-3 3 3 3 0 6"/>',
  berry:
    '<circle cx="8" cy="14" r="5"/><circle cx="16" cy="15" r="5"/><path d="M12 10c-1-6 1-8 6-8-1 5-3 6-6 6M7 3l5 7M6 12h.1m8 1h.1"/>',
  wood: '<path d="m5 10 10-7c4-2 8 4 5 7l-9 9"/><ellipse cx="7" cy="15" rx="5" ry="6" transform="rotate(-35 7 15)"/><path d="m13 9 5-3M7 12c3 1 4 4 1 5"/>',
  stone: '<path d="m3 9 6-6 9 2 4 9-6 7-11-2-3-6Z"/><path d="m3 9 8 2 7-6m-7 6 5 10M5 19l6-8"/>',
  fiber:
    '<path d="M6 21C16 15 9 6 18 2M8 17C0 14 3 9 3 9c6 0 8 3 5 8Zm3-5c7 2 10-3 10-3-5-3-8-2-10 3ZM13 7C5 7 8 2 8 2c4-1 6 1 5 5Z"/>',
  axe: '<path d="m5 22 11-18 2 2L8 23M11 4l-1 7c5 3 8 2 12-1l-5-8Z"/>',
  pickaxe: '<path d="m5 22 10-15M5 4c5-3 13 1 16 8-6-4-11-6-18-5Z"/>',
  fire: '<path d="M13 2c3 7-2 7 2 10 1-1 2-3 2-4 7 8 2 13-5 13S1 14 8 8c0 3 1 4 2 4 3-2-1-5 3-10Z"/><path d="M10 20c-3-3 0-5 2-7 0 3 4 3 2 7"/>',
  torch: '<path d="m10 14 1 8h2l1-8M8 13h8M12 2c5 5-1 4 3 7 4-2 2 4-3 4S6 8 10 6c-1 3 3 3 2-4Z"/>',
  wall: '<path d="M4 21V5l2-3 2 3v16M16 21V5l2-3 2 3v16M8 9h8M8 16h8M2 9h2m16 0h2M2 16h2m16 0h2"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5Z"/>',
  save: '<path d="M4 3h13l4 4v14H3V3h1ZM7 3v6h9V3M7 21v-8h10v8"/>',
  volume: '<path d="m12 3-7 5H2v8h3l7 5ZM16 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/>',
  muted: '<path d="m12 3-7 5H2v8h3l7 5Zm5 6 5 6m0-6-5 6"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 8a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 5m0 3h.01"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  reset: '<path d="M3 10a9 9 0 1 1 1 7M3 3v7h7"/>',
  chevron: '<path d="m8 5 7 7-7 7"/>',
  hand: '<path d="M8 12V5a2 2 0 0 1 4 0v7-8a2 2 0 0 1 4 0v9-6a2 2 0 0 1 4 0v9c0 8-10 7-13 3l-4-5c-2-3 1-5 3-2l2 2"/>',
  pin: '<path d="M19 9c0 6-7 13-7 13S5 15 5 9a7 7 0 0 1 14 0Z"/><circle cx="12" cy="9" r="2"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.4m0 13.6v2.4M2.8 12h2.4m13.6 0h2.4M5.5 5.5l1.7 1.7m9.6 9.6 1.7 1.7m0-13-1.7 1.7M7.2 16.8l-1.7 1.7"/>',
};
export function icon(name, size = 24) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.leaf}</svg>`;
}
export function fillIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((el) => {
    el.innerHTML = icon(el.dataset.icon, Number(el.dataset.size || 24));
  });
}
