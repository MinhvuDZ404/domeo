export const GAME_VERSION = '5.0.0';
export const GAME_LABEL = 'v5.0';

export const DAY_LENGTH = 1440;
export const DAY_OFFSET = DAY_LENGTH * 0.2;
export const CHUNK_SIZE = 512;
export const MAX_CACHED_CHUNKS = 64;
export const PLAYER_SPEED = 170;
export const INTERACTION_DISTANCE = 68;
export const MAX_STACK = 999;
export const MAX_STRUCTURES = 100;
export const SAVE_VERSION = 3;
export const SAVE_KEY = 'domeo.journey.v1';
export const LOCK_KEY = 'domeo.lock.v1';
export const WORLD_GEN_VERSION = 2;
export const WORLD_LIMIT = 1_000_000;
export const MAX_EXPLORED = 2500;
export const MAX_DISCOVERIES = 400;

// Survival tuning. Hunger is balanced for a 24-minute day: one full bar lasts
// ~15 minutes, so a full day asks for roughly two meals. The scripted
// playthrough in scripts/balance.mjs must be re-run after changing these.
export const HUNGER_DRAIN_PER_SECOND = 0.11;
export const STARVATION_DAMAGE_PER_SECOND = 3;
export const CAMPFIRE_HEAL_PER_SECOND = 2.5;
export const CAMPFIRE_HEAL_RADIUS = 100;
export const FIRE_MIN_HUNGER = 20;
export const BERRY_HUNGER = 25;
export const BERRY_HEALTH = 3;
export const COOKED_HUNGER = 40;
export const COOKED_HEALTH = 12;
export const MUSHROOM_HUNGER = 15;
export const MUSHROOM_HEALTH = 2;
export const SALVE_HEALTH = 35;

export const UNIQUE_ITEMS = ['axe', 'pickaxe', 'torch'];
export const PLACEABLE = ['campfire', 'wall', 'chest', 'lantern'];
export const STAT_KEYS = [
  'berries',
  'wood',
  'stone',
  'crafted',
  'campfires',
  'distance',
  'cooked',
  'chests',
  'explored',
  'mushrooms',
  'herbs',
  'crystals',
  'landmarks',
  'nights',
];

export const ITEMS = {
  berry: {
    name: 'Quả mọng',
    icon: 'berry',
    kind: 'Thức ăn',
    description: 'Một chút ngọt lành từ rừng. Ăn để hồi 25 no và 3 máu.',
  },
  cooked: {
    name: 'Quả nướng',
    icon: 'bowl',
    kind: 'Thức ăn',
    description: 'Nướng bên lửa trại. Ăn để hồi 40 no và 12 máu.',
  },
  mushroom: {
    name: 'Nấm rừng',
    icon: 'mushroom',
    kind: 'Thức ăn',
    description: 'Mọc nơi ẩm thấp. Ăn để hồi 15 no và 2 máu, hoặc dùng làm cao dán.',
  },
  herb: {
    name: 'Thảo mộc',
    icon: 'herb',
    kind: 'Nguyên liệu',
    description: 'Lá thơm hiếm. Dùng cùng nấm để chế cao dán hồi máu.',
  },
  crystal: {
    name: 'Tinh thể',
    icon: 'crystal',
    kind: 'Đặc biệt',
    description: 'Tinh thể phát sáng trong vùng đá. Dùng để chế đèn lồng.',
  },
  salve: {
    name: 'Cao dán thảo mộc',
    icon: 'salve',
    kind: 'Thuốc',
    description: 'Dùng để hồi ngay 35 máu. Mang theo khi đi xa.',
  },
  wood: {
    name: 'Gỗ',
    icon: 'wood',
    kind: 'Nguyên liệu',
    description: 'Nhặt cành khô, hoặc dùng rìu chặt cây để lấy nhiều gỗ hơn.',
  },
  stone: {
    name: 'Đá',
    icon: 'stone',
    kind: 'Nguyên liệu',
    description: 'Nhặt đá cuội, hoặc dùng cuốc khai thác những tảng đá lớn.',
  },
  fiber: {
    name: 'Sợi thực vật',
    icon: 'fiber',
    kind: 'Nguyên liệu',
    description: 'Thu được khi hái quả. Một nguyên liệu nhỏ nhưng hữu ích.',
  },
  axe: {
    name: 'Rìu đá',
    icon: 'axe',
    kind: 'Công cụ',
    description: 'Tự động sử dụng khi chặt cây. Ba nhát rìu cho 5 gỗ.',
  },
  pickaxe: {
    name: 'Cuốc đá',
    icon: 'pickaxe',
    kind: 'Công cụ',
    description: 'Tự động sử dụng khi đào đá. Ba nhát cuốc cho 5 đá.',
  },
  campfire: {
    name: 'Lửa trại',
    icon: 'fire',
    kind: 'Công trình',
    description: 'Đặt xuống đất để soi sáng, nướng quả và đánh dấu nhà.',
  },
  torch: {
    name: 'Đuốc',
    icon: 'torch',
    kind: 'Trang bị',
    description: 'Mang một quầng sáng theo bạn trong đêm. Bật hoặc tắt bằng phím 5.',
  },
  lantern: {
    name: 'Đèn lồng',
    icon: 'lantern',
    kind: 'Công trình',
    description: 'Cột đèn tinh thể. Soi sáng một vùng rộng, không cần đốt lửa.',
  },
  wall: {
    name: 'Hàng rào',
    icon: 'wall',
    kind: 'Công trình',
    description: 'Đánh dấu nơi dừng chân bằng một hàng rào gỗ nhỏ.',
  },
  chest: {
    name: 'Rương gỗ',
    icon: 'chest',
    kind: 'Công trình',
    description: 'Cất đồ khi túi đầy. Đứng gần và nhấn E để mở.',
  },
};

export const RECIPES = [
  { id: 'axe', costs: { wood: 4, stone: 2 }, unique: true },
  { id: 'pickaxe', costs: { wood: 3, stone: 4 }, unique: true },
  { id: 'campfire', costs: { wood: 6, stone: 4 } },
  { id: 'torch', costs: { wood: 3, fiber: 2 }, unique: true },
  { id: 'wall', costs: { wood: 4 } },
  { id: 'chest', costs: { wood: 6, fiber: 2 } },
  { id: 'salve', costs: { mushroom: 2, herb: 1 } },
  { id: 'lantern', costs: { wood: 4, fiber: 2, crystal: 1 } },
];

export const RESOURCES = {
  bush: { charges: 3, respawn: 18, label: 'Hái quả mọng', icon: 'berry' },
  branch: { charges: 1, respawn: 45, label: 'Nhặt cành khô', icon: 'wood' },
  pebble: { charges: 1, respawn: 45, label: 'Nhặt đá cuội', icon: 'stone' },
  tree: { charges: 3, respawn: 120, label: 'Chặt cây', tool: 'axe', icon: 'axe' },
  rock: { charges: 3, respawn: 90, label: 'Khai thác đá', tool: 'pickaxe', icon: 'pickaxe' },
  mushroom: { charges: 2, respawn: 70, label: 'Hái nấm rừng', icon: 'mushroom' },
  herb: { charges: 2, respawn: 60, label: 'Hái thảo mộc', icon: 'herb' },
  crystal: { charges: 2, respawn: 300, label: 'Gỡ tinh thể', tool: 'pickaxe', icon: 'crystal' },
};

// Biome palettes for generation v2. Generation v1 keeps the original look.
export const BIOMES = {
  meadow: {
    name: 'Đồng cỏ',
    ground: '#5a7248',
    groundDark: '#47603c',
    grass: '#8fb06f',
    canopy: '#3d6b45',
    density: 0.45,
  },
  woodland: {
    name: 'Rừng thưa',
    ground: '#4c6240',
    groundDark: '#3c5236',
    grass: '#88a96e',
    canopy: '#33583c',
    density: 1,
  },
  deepwood: {
    name: 'Rừng sâu',
    ground: '#3d5238',
    groundDark: '#2f4230',
    grass: '#6f9a62',
    canopy: '#26462f',
    density: 1.5,
  },
  mistgrove: {
    name: 'Rừng sương',
    ground: '#55665c',
    groundDark: '#43544c',
    grass: '#93b39a',
    canopy: '#3a5a50',
    density: 0.9,
  },
  rocky: {
    name: 'Đất đá',
    ground: '#5d6148',
    groundDark: '#4a4e3a',
    grass: '#a3a573',
    canopy: '#4a5a3c',
    density: 0.6,
  },
  ancient: {
    name: 'Rừng cổ',
    ground: '#445840',
    groundDark: '#34463a',
    grass: '#7fae7d',
    canopy: '#2c4f3a',
    density: 1.2,
  },
};

export const LANDMARKS = {
  stoneCircle: {
    name: 'Vòng đá cổ',
    hint: 'Những viên đá xếp thành vòng tròn. Ai đã dựng chúng?',
    reward: { crystal: 1 },
  },
  oldCamp: {
    name: 'Trại cũ bỏ hoang',
    hint: 'Một đống lửa đã tắt từ lâu. Vẫn còn ít củi khô.',
    reward: { wood: 4, fiber: 2 },
  },
  shrine: {
    name: 'Miếu rừng',
    hint: 'Đá rêu phủ, hương rừng thoảng qua. Bạn thấy khỏe hơn.',
    reward: { salve: 1 },
  },
  ancientTree: {
    name: 'Cây cổ thụ',
    hint: 'Thân cây to đến mức ôm không xuể. Nấm mọc quanh gốc.',
    reward: { mushroom: 2 },
  },
  pond: {
    name: 'Hồ tĩnh lặng',
    hint: 'Mặt nước phẳng như gương. Quả mọng mọc quanh bờ.',
    reward: { berry: 3 },
  },
  giantRock: {
    name: 'Tảng đá khổng lồ',
    hint: 'Một khối đá sừng sững. Có mạch tinh thể lấp lánh.',
    reward: { stone: 4, crystal: 1 },
  },
};

export const LANDMARK_TYPES = Object.keys(LANDMARKS);
export const DISCOVERY_RADIUS = 150;

export const emptyItems = () => Object.fromEntries(Object.keys(ITEMS).map((key) => [key, 0]));
export const emptyStats = () => Object.fromEntries(STAT_KEYS.map((key) => [key, 0]));

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// A single simulation clock drives day/night, weather bands and respawns.
// DAY_LENGTH is exactly 24 in-game minutes (1440 simulated seconds).
export function getDayInfo(elapsed) {
  const safe = Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
  const time = safe + DAY_OFFSET;
  const phase = (time % DAY_LENGTH) / DAY_LENGTH;
  const minutes = Math.floor(((phase * 24 + 6) % 24) * 60);
  const daylight = Math.max(0, Math.sin(phase * Math.PI * 2));
  const sunAngle = phase * Math.PI * 2;
  // Warmth peaks at sunrise (~6:00, phase 0) and sunset (~18:00, phase 0.5).
  const warmth = Math.min(
    1,
    Math.exp(-((phase - 0.02) ** 2) / 0.0012) * 0.9 + Math.exp(-((phase - 0.5) ** 2) / 0.0016),
  );
  const dusk = Math.exp(-((phase - 0.545) ** 2) / 0.0012);
  const dawn = Math.exp(-((phase - 0.985) ** 2) / 0.0012) + Math.exp(-(phase ** 2) / 0.0012);
  const nightFactor = 1 - daylight;
  let label;
  if (phase < 0.035) label = 'Bình minh';
  else if (phase < 0.12) label = 'Sương ban mai';
  else if (phase < 0.33) label = 'Nắng trong rừng';
  else if (phase < 0.44) label = 'Chiều vàng';
  else if (phase < 0.52) label = 'Hoàng hôn';
  else if (phase < 0.58) label = 'Chạng vạng';
  else if (phase < 0.93) label = 'Rừng về đêm';
  else label = 'Đêm muộn';
  return {
    day: Math.floor(time / DAY_LENGTH) + 1,
    phase,
    daylight,
    isNight: phase >= 0.5,
    clock: `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`,
    label,
    sunAngle,
    warmth: clamp(warmth, 0, 1),
    dusk: clamp(dusk, 0, 1),
    dawn: clamp(Math.min(1, dawn), 0, 1),
    nightFactor: clamp(nightFactor, 0, 1),
  };
}

// Deterministic weather bands: 3-minute bands hashed from seed + band index.
// Returns { type, intensity (0..1), label }. Micro animation stays runtime-only.
export function getWeather(elapsed, seed = 0) {
  const safe = Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
  const BAND = 180;
  const band = Math.floor(safe / BAND);
  const t = (safe % BAND) / BAND;
  const pick = (b) => {
    let h = (seed >>> 0) ^ Math.imul(b + 0x9e3779b9, 2654435761);
    h = Math.imul(h ^ (h >>> 15), 2246822519);
    h ^= h >>> 13;
    return (h >>> 0) / 4294967296;
  };
  const classify = (r) => {
    if (r < 0.52) return 'clear';
    if (r < 0.7) return 'cloud';
    if (r < 0.86) return 'mist';
    return 'rain';
  };
  const current = classify(pick(band));
  const next = classify(pick(band + 1));
  // Blend the last 25% of a band into the next one so transitions feel gradual.
  const blend = t > 0.75 ? (t - 0.75) / 0.25 : 0;
  const type = blend > 0.5 ? next : current;
  const base = type === 'clear' ? 0 : type === 'cloud' ? 0.45 : type === 'mist' ? 0.7 : 0.85;
  const intensity = clamp(base * (0.6 + 0.4 * Math.min(1, t * 3 + (1 - blend) * 0.5)), 0, 1);
  const label =
    type === 'clear'
      ? 'Trời quang'
      : type === 'cloud'
        ? 'Nhiều mây'
        : type === 'mist'
          ? 'Sương mù'
          : 'Mưa rừng';
  return { type, intensity, label, blend };
}
