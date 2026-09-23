export const GAME_VERSION = '5.1.1';
export const GAME_LABEL = 'v5.1';

export const DAY_LENGTH = 1440;
export const DAY_OFFSET = DAY_LENGTH * 0.2;
export const CHUNK_SIZE = 512;
export const MAX_CACHED_CHUNKS = 64;
export const PLAYER_SPEED = 170;
export const INTERACTION_DISTANCE = 68;
export const MAX_STACK = 999;
export const MAX_STRUCTURES = 100;
// Three separate version numbers, deliberately never mixed up:
//   GAME_VERSION       what the release calls itself
//   SAVE_VERSION       the shape of the stored journey (migrated, never reset)
//   WORLD_GEN_VERSION  the generator new journeys use (old worlds keep theirs)
export const SAVE_VERSION = 4;
export const SAVE_KEY = 'domeo.journey.v1';
export const LOCK_KEY = 'domeo.lock.v1';
export const WORLD_GEN_VERSION = 3;
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
export const MEAL_HUNGER = 55;
export const MEAL_HEALTH = 18;
export const MEAL_WARMTH = 26;
export const TEA_WARMTH = 34;
export const TEA_HEALTH = 4;
export const TEA_HUNGER = 10;

// Warmth (5.1): a slow pressure that makes night, rain and mist ask for a fire,
// a torch or a shelter. It only ever bites below 20, so it nudges preparation
// instead of demanding that the player stands next to a campfire all game.
export const WARMTH_MAX = 100;
export const WARMTH_DRAIN_NIGHT = 0.32;
export const WARMTH_DRAIN_RAIN = 0.24;
export const WARMTH_DRAIN_MIST = 0.12;
export const WARMTH_COLD_HEALTH = 1.1;
export const WARMTH_COLD_THRESHOLD = 20;
export const WARMTH_FIRE_PER_SECOND = 9;
export const WARMTH_SHELTER_PER_SECOND = 4;
export const WARMTH_TORCH_PER_SECOND = 1.6;

// Stamina (5.1): only sprinting, dodging and attacking spend it. Walking is free.
export const STAMINA_MAX = 100;
export const STAMINA_REGEN = 14;
export const SPRINT_MULTIPLIER = 1.4;
export const SPRINT_STAMINA_PER_SECOND = 13;
export const DODGE_STAMINA = 24;
export const DODGE_DURATION = 0.22;
export const DODGE_INVULNERABILITY = 0.42;
export const DODGE_SPEED = 520;
export const ATTACK_STAMINA = 6;

// Combat. Health, ranges and timings are shared by the player and by enemies so
// the balance script and the browser read exactly the same numbers.
export const PLAYER_HEALTH_MAX = 100;
export const HIT_INVULNERABILITY = 0.85;
export const PLAYER_HIT_COOLDOWN = 0.5;
export const MAX_ENEMIES = 10;
export const MAX_PROJECTILES = 24;
export const ENEMY_AI_INTERVAL = 0.16; // Fixed 6 Hz AI tick, independent of frame rate.
export const ENEMY_SLEEP_DISTANCE = 1150;
export const ENEMY_LEASH_DISTANCE = 900;
export const SPAWN_INTERVAL = 1.1;
export const SPAWN_MIN_DISTANCE = 340;
export const SPAWN_MAX_DISTANCE = 980;
export const SPAWN_GRACE_SECONDS = 75; // A new journey gets quiet minutes before danger.
export const CAMP_RADIUS = 320;
export const CAMP_SAFE_RADIUS = 460;
export const MAX_DAMAGE_EVENTS = 40;

export const UNIQUE_ITEMS = [
  'axe',
  'pickaxe',
  'axe2',
  'pickaxe2',
  'knife',
  'blade',
  'torch',
  'ancientSeed',
];
export const PLACEABLE = [
  'campfire',
  'wall',
  'chest',
  'lantern',
  'workbench',
  'shelter',
  'maptable',
  'beacon',
  'seat',
  'planter',
  'standingStone',
];
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
  'kills',
  'quests',
  'deaths',
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
  knife: {
    name: 'Dao đá',
    icon: 'sword',
    kind: 'Vũ khí',
    description: 'Một lưỡi đá buộc vào cán gỗ. Tự động dùng khi bạn tấn công.',
  },
  blade: {
    name: 'Kiếm gỗ cổ',
    icon: 'blade',
    kind: 'Vũ khí',
    description: 'Lưỡi gỗ cổ cứng như sắt. Nặng hơn, nhưng chỉ cần hai nhát.',
  },
  axe2: {
    name: 'Rìu cổ',
    icon: 'runeAxe',
    kind: 'Công cụ',
    description: 'Lưỡi rìu tẩm nhựa cây cổ. Chặt cây nhanh hơn và hạ được gỗ cổ.',
  },
  pickaxe2: {
    name: 'Cuốc cổ',
    icon: 'runePick',
    kind: 'Công cụ',
    description: 'Đầu cuốc cứng, đục được cả mạch tinh thể trong đá.',
  },
  ancientWood: {
    name: 'Gỗ cổ',
    icon: 'wood',
    kind: 'Nguyên liệu',
    description: 'Gỗ của những cây đã sống qua nhiều đời người. Chỉ có ở rừng sâu.',
  },
  fragment: {
    name: 'Mảnh đá canh',
    icon: 'shard',
    kind: 'Nguyên liệu',
    description: 'Một mảnh vỡ của người đá. Vẫn còn ấm, và vẫn còn nhớ.',
  },
  moonEssence: {
    name: 'Tinh chất đêm',
    icon: 'essence',
    kind: 'Đặc biệt',
    description: 'Đọng lại khi một sinh vật đêm tan đi. Sáng lấp lánh dưới trăng.',
  },
  meal: {
    name: 'Bữa ăn rừng',
    icon: 'stew',
    kind: 'Thức ăn',
    description: 'Một bữa nóng bên lửa. Hồi 55 no, 18 máu và sưởi ấm đôi chút.',
  },
  tea: {
    name: 'Trà thảo mộc',
    icon: 'cup',
    kind: 'Thức ăn',
    description: 'Nước thảo mộc ấm. Sưởi rất tốt và hồi lại toàn bộ sức bền.',
  },
  workbench: {
    name: 'Bàn chế tác',
    icon: 'bench',
    kind: 'Công trình',
    description: 'Nơi làm ra đồ nghề bậc cao. Đặt trong trại để mở công thức mới.',
  },
  shelter: {
    name: 'Lều trú',
    icon: 'tent',
    kind: 'Công trình',
    description: 'Mái che giữa rừng. Trong trại, bạn bớt hao sức vì thời tiết và nghỉ được.',
  },
  maptable: {
    name: 'Bàn bản đồ',
    icon: 'table',
    kind: 'Công trình',
    description: 'Trải bản đồ rừng ra. Địa danh quanh đây hiện lên và la bàn dẫn được tới.',
  },
  beacon: {
    name: 'Đèn hiệu',
    icon: 'beacon',
    kind: 'Công trình',
    description: 'Ngọn đèn cao soi khắp vùng. Cần hạt giống cổ để thắp lửa.',
  },
  seat: {
    name: 'Ghế gỗ',
    icon: 'seat',
    kind: 'Trang trí',
    description: 'Một chỗ ngồi nhỏ. Không cần lý do để có.',
  },
  planter: {
    name: 'Chậu hoa',
    icon: 'planter',
    kind: 'Trang trí',
    description: 'Hoa rừng trồng lại bên lối vào trại.',
  },
  standingStone: {
    name: 'Đá dựng',
    icon: 'monolith',
    kind: 'Trang trí',
    description: 'Một viên đá đứng. Người đi trước từng dựng đá để nhớ đường.',
  },
  ancientSeed: {
    name: 'Hạt giống bình minh',
    icon: 'seed',
    kind: 'Cổ vật',
    description: 'Hạt giống ngủ trong rừng cổ. Nó vẫn còn sống, và đang chờ một ngọn lửa.',
  },
  stoneFragment: {
    name: 'Đá dựng cổ',
    icon: 'monolith',
    kind: 'Trang trí',
    description: 'Đá cũ mang theo từ vòng đá. Dựng lại để nhớ mình đã đi qua.',
  },
};

// Weapons are picked automatically: the strongest one you carry is used.
export const WEAPONS = [
  { id: 'blade', damage: 15, range: 58, cooldown: 0.44, arc: 1.9, knockback: 26 },
  { id: 'knife', damage: 9, range: 54, cooldown: 0.4, arc: 1.7, knockback: 18 },
  { id: 'axe2', damage: 11, range: 58, cooldown: 0.5, arc: 1.8, knockback: 24 },
  { id: 'axe', damage: 7, range: 52, cooldown: 0.48, arc: 1.6, knockback: 16 },
  { id: 'pickaxe2', damage: 9, range: 54, cooldown: 0.52, arc: 1.6, knockback: 20 },
  { id: 'pickaxe', damage: 6, range: 50, cooldown: 0.5, arc: 1.5, knockback: 14 },
];
export const FIST = { id: 'fist', damage: 5, range: 46, cooldown: 0.46, arc: 1.5, knockback: 12 };
export const bestWeapon = (inventory) =>
  WEAPONS.find((weapon) => (inventory[weapon.id] ?? 0) > 0) ?? FIST;

// Recipes. `station` means the player must stand near that built structure;
// `requires` is a quest-granted blueprint (see src/quests.js). Everything that
// existed in 5.0 keeps working without a station or a blueprint.
export const RECIPES = [
  { id: 'axe', costs: { wood: 4, stone: 2 }, unique: true, group: 'tools' },
  { id: 'pickaxe', costs: { wood: 3, stone: 4 }, unique: true, group: 'tools' },
  { id: 'knife', costs: { wood: 3, stone: 2, fiber: 2 }, unique: true, group: 'tools' },
  { id: 'campfire', costs: { wood: 6, stone: 4 }, group: 'camp' },
  { id: 'torch', costs: { wood: 3, fiber: 2 }, unique: true, group: 'tools' },
  { id: 'wall', costs: { wood: 4 }, group: 'camp' },
  { id: 'chest', costs: { wood: 6, fiber: 2 }, group: 'camp' },
  { id: 'salve', costs: { mushroom: 2, herb: 1 }, group: 'survival' },
  { id: 'lantern', costs: { wood: 4, fiber: 2, crystal: 1 }, group: 'camp' },
  { id: 'meal', costs: { berry: 1, mushroom: 1, herb: 1 }, station: 'campfire', group: 'survival' },
  { id: 'tea', costs: { herb: 2, berry: 1 }, station: 'campfire', group: 'survival' },
  { id: 'seat', costs: { wood: 2 }, group: 'decor' },
  { id: 'planter', costs: { wood: 2, fiber: 1 }, group: 'decor' },
  { id: 'standingStone', costs: { stone: 3 }, group: 'decor' },
  {
    id: 'workbench',
    costs: { wood: 10, stone: 6, fiber: 2 },
    requires: 'recipe:workbench',
    group: 'camp',
  },
  { id: 'shelter', costs: { wood: 12, stone: 2, fiber: 6 }, group: 'camp' },
  {
    id: 'maptable',
    costs: { wood: 8, ancientWood: 1, fiber: 2 },
    station: 'workbench',
    requires: 'recipe:maptable',
    group: 'camp',
  },
  {
    id: 'axe2',
    costs: { wood: 6, ancientWood: 2, crystal: 1 },
    unique: true,
    station: 'workbench',
    group: 'tools',
  },
  {
    id: 'pickaxe2',
    costs: { wood: 6, ancientWood: 2, stone: 8 },
    unique: true,
    station: 'workbench',
    group: 'tools',
  },
  {
    id: 'blade',
    costs: { ancientWood: 2, fragment: 1, fiber: 3 },
    unique: true,
    station: 'workbench',
    requires: 'recipe:blade',
    group: 'tools',
  },
  {
    id: 'beacon',
    costs: { stone: 8, ancientWood: 3, fragment: 2, moonEssence: 2, crystal: 2 },
    station: 'workbench',
    requires: 'recipe:beacon',
    group: 'camp',
  },
];

export const RECIPE_GROUPS = [
  { id: 'survival', label: 'Sinh tồn' },
  { id: 'tools', label: 'Đồ nghề' },
  { id: 'camp', label: 'Trại' },
  { id: 'decor', label: 'Trang trí' },
];

export const RESOURCES = {
  bush: { charges: 3, respawn: 18, label: 'Hái quả mọng', icon: 'berry' },
  branch: { charges: 1, respawn: 45, label: 'Nhặt cành khô', icon: 'wood' },
  pebble: { charges: 1, respawn: 45, label: 'Nhặt đá cuội', icon: 'stone' },
  tree: {
    charges: 3,
    respawn: 120,
    label: 'Chặt cây',
    tool: 'axe',
    bonus: { tool: 'axe2', amount: 3 },
    icon: 'axe',
  },
  rock: {
    charges: 3,
    respawn: 90,
    label: 'Khai thác đá',
    tool: 'pickaxe',
    bonus: { tool: 'pickaxe2', amount: 3 },
    icon: 'pickaxe',
  },
  mushroom: { charges: 2, respawn: 70, label: 'Hái nấm rừng', icon: 'mushroom' },
  herb: { charges: 2, respawn: 60, label: 'Hái thảo mộc', icon: 'herb' },
  crystal: { charges: 2, respawn: 300, label: 'Gỡ tinh thể', tool: 'pickaxe', icon: 'crystal' },
  // 5.1 nodes. They only grow far from home and both ask for an upgraded tool,
  // so a better axe/pickaxe opens new ground instead of just ticking faster.
  ironwood: { charges: 3, respawn: 200, label: 'Chặt gỗ cổ', tool: 'axe2', icon: 'wood' },
  geode: {
    charges: 3,
    respawn: 260,
    label: 'Đục mạch tinh thể',
    tool: 'pickaxe2',
    icon: 'crystal',
  },
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
  // Generation v3 only. Kept out of LANDMARK_TYPES on purpose so already
  // generated v2 worlds can never sprout one.
  ancientGrove: {
    name: 'Rừng cổ',
    hint: 'Thân cây cao hơn cả trí nhớ. Giữa vòng cây, một hạt giống đang ngủ.',
    reward: { ancientSeed: 1, fragment: 1 },
  },
};

// Frozen: the landmark pool of generation v2, in the order it has always used.
export const LANDMARK_TYPES = [
  'stoneCircle',
  'oldCamp',
  'shrine',
  'ancientTree',
  'pond',
  'giantRock',
];
export const GROVE_TYPE = 'ancientGrove';
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
