export const DAY_LENGTH = 120;
export const DAY_OFFSET = DAY_LENGTH * 0.2;
export const CHUNK_SIZE = 512;
export const MAX_CACHED_CHUNKS = 64;
export const PLAYER_SPEED = 170;
export const INTERACTION_DISTANCE = 68;
export const MAX_STACK = 999;
export const MAX_STRUCTURES = 100;
export const SAVE_VERSION = 1;
export const SAVE_KEY = 'domeo.journey.v1';
export const WORLD_LIMIT = 1_000_000;

export const ITEMS = {
  berry: {
    name: 'Quả mọng',
    icon: 'berry',
    kind: 'Thức ăn',
    description: 'Một chút ngọt lành từ rừng. Ăn để hồi 25 no và 3 máu.',
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
    description: 'Đặt xuống đất để soi sáng. Đứng gần lửa khi đủ no để hồi máu.',
  },
  torch: {
    name: 'Đuốc',
    icon: 'torch',
    kind: 'Trang bị',
    description: 'Mang một quầng sáng theo bạn trong đêm. Bật hoặc tắt bằng phím 5.',
  },
  wall: {
    name: 'Hàng rào',
    icon: 'wall',
    kind: 'Công trình',
    description: 'Đánh dấu nơi dừng chân bằng một hàng rào gỗ nhỏ.',
  },
};

export const RECIPES = [
  { id: 'axe', costs: { wood: 4, stone: 2 }, unique: true },
  { id: 'pickaxe', costs: { wood: 3, stone: 4 }, unique: true },
  { id: 'campfire', costs: { wood: 6, stone: 4 } },
  { id: 'torch', costs: { wood: 3, fiber: 2 }, unique: true },
  { id: 'wall', costs: { wood: 4 } },
];

export const RESOURCES = {
  bush: { charges: 3, respawn: 18, label: 'Hái quả mọng', icon: 'berry' },
  branch: { charges: 1, respawn: 45, label: 'Nhặt cành khô', icon: 'wood' },
  pebble: { charges: 1, respawn: 45, label: 'Nhặt đá cuội', icon: 'stone' },
  tree: { charges: 3, respawn: 120, label: 'Chặt cây', tool: 'axe', icon: 'axe' },
  rock: { charges: 3, respawn: 90, label: 'Khai thác đá', tool: 'pickaxe', icon: 'pickaxe' },
};

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export function getDayInfo(elapsed) {
  const time = elapsed + DAY_OFFSET;
  const phase = (time % DAY_LENGTH) / DAY_LENGTH;
  const minutes = Math.floor(((phase * 24 + 6) % 24) * 60);
  const daylight = Math.max(0, Math.sin(phase * Math.PI * 2));
  return {
    day: Math.floor(time / DAY_LENGTH) + 1,
    phase,
    daylight,
    isNight: phase >= 0.5,
    clock: `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`,
    label:
      phase >= 0.5
        ? 'Rừng về đêm'
        : phase < 0.12
          ? 'Sương ban mai'
          : phase > 0.4
            ? 'Chiều buông'
            : 'Nắng trong rừng',
  };
}
