// Camp progression for Domeo 5.1.
//
// A camp is not a separate data structure: it is the set of camp structures the
// player has raised around their home fire. That keeps one source of truth (the
// existing structures array, already saved and validated) and means the camp can
// never disagree with what is actually drawn in the world.
import { CAMP_RADIUS } from './config.js';

export const CAMP_TIERS = [
  {
    id: 'campfire',
    level: 1,
    name: 'Đốm lửa',
    benefit: 'Sưởi ấm, nướng thức ăn, hồi máu khi bạn đã đủ no.',
  },
  {
    id: 'shelter',
    level: 2,
    name: 'Mái che',
    benefit: 'Trong trại bạn bớt hao no và giữ ấm tốt hơn. Nghỉ ngơi hồi sức.',
  },
  {
    id: 'workbench',
    level: 3,
    name: 'Góc chế tác',
    benefit: 'Mở đồ nghề bậc cao: rìu cổ, cuốc cổ, kiếm gỗ cổ, bàn bản đồ.',
  },
  {
    id: 'maptable',
    level: 4,
    name: 'Góc bản đồ',
    benefit: 'Địa danh quanh trại hiện lên bản đồ, la bàn dẫn được tới địa danh.',
  },
  {
    id: 'beacon',
    level: 5,
    name: 'Ngọn đèn hiệu',
    benefit: 'Ánh sáng xa, thấy trại từ rất xa và mở đường về trong đêm.',
  },
];

export const CAMP_TIER_IDS = CAMP_TIERS.map((tier) => tier.id);
const TIER_BY_ID = Object.fromEntries(CAMP_TIERS.map((tier) => [tier.id, tier]));

/** Every camp structure the player raised inside the camp radius. */
export function campStructures(world, home, radius = CAMP_RADIUS) {
  if (!home || !world?.structures) return [];
  return world.structures.filter(
    (structure) =>
      CAMP_TIER_IDS.includes(structure.type) &&
      Math.hypot(structure.x - home.x, structure.y - home.y) <= radius,
  );
}

export function campLevel(world, home) {
  const built = new Set(campStructures(world, home).map((structure) => structure.type));
  let level = 0;
  for (const tier of CAMP_TIERS) if (built.has(tier.id)) level = tier.level;
  return level;
}

/** A small, complete picture of the camp for the UI and the debug overlay. */
export function campSummary(world, home) {
  const placed = campStructures(world, home);
  const built = new Set(placed.map((structure) => structure.type));
  const level = campLevel(world, home);
  const nextTier = CAMP_TIERS.find((tier) => !built.has(tier.id)) ?? null;
  return {
    home: home ? { ...home } : null,
    level,
    placed: placed.length,
    built: [...built],
    tiers: CAMP_TIERS.map((tier) => ({ ...tier, built: built.has(tier.id) })),
    next: nextTier ? { ...nextTier, tier: TIER_BY_ID[nextTier.id] } : null,
  };
}

// Camp benefits. They are small on purpose: a camp should make the next
// expedition easier, not remove the forest.
export const campBonuses = (level) => ({
  hungerDrain: level >= 2 ? 0.85 : 1,
  warmthDrain: level >= 2 ? 0.6 : 1,
  workbench: level >= 3,
  mapTable: level >= 4,
  beacon: level >= 5,
  shelterRest: level >= 2,
});

export const REST_COOLDOWN = 55; // Seconds between rests, so healing stays a checkpoint.
export const REST_HEALTH = 24;
export const REST_WARMTH = 30;
export const REST_HUNGER_COST = 8;
