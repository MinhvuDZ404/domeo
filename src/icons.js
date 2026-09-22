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
  chest:
    '<rect x="3" y="8" width="18" height="13" rx="2"/><path d="M3 13h18M12 8v13M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
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
  mushroom:
    '<path d="M4 12a8 8 0 0 1 16 0H4Z"/><path d="M10 12v6a2 2 0 0 0 4 0v-6M9 7h.01M14 8h.01"/>',
  herb: '<path d="M12 21V8"/><path d="M12 13c0-4-3-7-7-7 0 4 3 7 7 7Zm0-1c0-4 3-7 7-7 0 4-3 7-7 7Z"/>',
  crystal: '<path d="M12 2l5 7-5 13L7 9l5-7Z"/><path d="M7 9h10M12 2v20"/>',
  salve:
    '<rect x="6" y="9" width="12" height="11" rx="3"/><path d="M9 9V7a3 3 0 0 1 6 0v2M9 14h6"/>',
  lantern:
    '<rect x="8" y="7" width="8" height="11" rx="2"/><path d="M10 7V5a2 2 0 0 1 4 0v2M8 12h8M12 18v3"/>',
  cloud: '<path d="M6 18a4 4 0 0 1 0-8 6 6 0 0 1 11.5 1.5A3.5 3.5 0 0 1 17 18H6Z"/>',
  rain: '<path d="M6 14a4 4 0 0 1 0-8 6 6 0 0 1 11.5 1.5A3.5 3.5 0 0 1 17 14H6Z"/><path d="M8 17v2m4-2v2m4-2v2"/>',
  mist: '<path d="M4 9h16M6 13h12M8 17h8M5 21h14"/>',
  // 5.1 additions: weapons, camp pieces, creatures and quest language.
  sword: '<path d="M14.5 3.5 20 9l-8.5 8.5-3-3L14.5 3.5ZM5.5 14.5l4 4-3 3-4-4 3-3Z"/>',
  blade: '<path d="M12 2 4 12l8 10 8-10-8-10Zm0 4.5V18"/>',
  runeAxe: '<path d="M6 22 15 6M12 3l8 3-2 8-8-3 2-8ZM12.5 8.5 15 12"/>',
  runePick: '<path d="m6 22 9-14M4 5c6-3 14 1 17 8-6-4-11-6-18-5Z"/><path d="M9 9.5h5"/>',
  bench: '<path d="M3 10h18v4H3zM5 14v7M19 14v7M7 10V5h10v5"/>',
  tent: '<path d="M12 4 3 20h18L12 4Zm0 5v11"/>',
  table: '<path d="M4 8h16v10H4zM4 12.5h16M9 8v10M15 8v10"/>',
  beacon:
    '<path d="M12 2v3M9 8.5 12 4l3 4.5-1 8H10l-1-8Zm1 10.5h4l1 5H9l1-5Z"/><path d="m4.5 10.5 3 1M19.5 10.5l-3 1"/>',
  seat: '<path d="M5 11.5h14v3H5zM7 14.5v5M17 14.5v5M7 11.5V7h10v4.5"/>',
  planter:
    '<path d="M6 12h12l-1 8H7l-1-8ZM12 12c0-4-2-6-4-6 0 4 2 6 4 6Zm0-2c0-3 2-5 4-5 0 3-2 5-4 5Z"/>',
  monolith: '<path d="M9 21 8 5l4-3 4 3-1 16H9Z"/><path d="M12 8v8"/>',
  seed: '<path d="M12 21c-1-6 1-11 7-13-1 7-3 11-7 13Z"/><path d="M12 21c-6-2-8-6-8-13 6 1 8 6 8 13Z"/>',
  shard: '<path d="M12 3l4 6-4 12-4-12 4-6Z"/><path d="M8 9h8"/>',
  essence: '<path d="M12 3c3 5 5 7 5 10a5 5 0 1 1-10 0c0-3 2-5 5-10Z"/><path d="M9.5 14h5"/>',
  stew: '<path d="M4 11h16c0 5-2 8-8 8s-8-3-8-8Z"/><path d="M8 8c-2-2 2-2 0-4m5 4c-2-2 2-2 0-4"/>',
  cup: '<path d="M5 8h11v6a5 5 0 0 1-4 5H8a3 3 0 0 1-3-3V8Z"/><path d="M16 10h2a2 2 0 0 1 0 5h-2M8 4c0-1 1-1 1-2"/>',
  paw: '<circle cx="7" cy="14.5" r="2.8"/><circle cx="12" cy="10.5" r="3"/><circle cx="17" cy="14.5" r="2.8"/><path d="M12 20c-3 0-5-2-5-4h10c0 2-2 4-5 4Z"/>',
  quest: '<path d="M6 3h9l4 4v14H6V3Z"/><path d="M15 3v4h4M9 12h7M9 16h5"/>',
  banner: '<path d="M6 3v18M6 4h12l-2.5 4L18 12H6"/>',
  flame:
    '<path d="M13 2c3 7-3 7 1 10 1-1 2-3 2-4 6 8 1 14-4 14S3 15 9 8c0 3 1 4 2 4 3-2-1-5 2-10Z"/>',
  bolt: '<path d="M13 2 5 13h5l-1 9 8-11h-5l1-9Z"/>',
  shield: '<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6l7-3Z"/><path d="m9 12 2 2 4-4"/>',
  warning: '<path d="M12 4l9 16H3l9-16Z"/><path d="M12 10v4m0 3h.01"/>',
};
export function icon(name, size = 24) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.leaf}</svg>`;
}
export function fillIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((el) => {
    el.innerHTML = icon(el.dataset.icon, Number(el.dataset.size || 24));
  });
}
