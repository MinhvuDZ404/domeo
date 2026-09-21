// Domeo 5.1 progression is deliberately small and data-driven. Persistent keys
// are stable IDs; visible Vietnamese text is never used as save data.
export const QUESTS = [
  {
    id: 'journey.first_steps',
    type: 'gathering',
    title: 'Dấu chân đầu tiên',
    description: 'Hái quả và gom vật liệu để khu rừng trở nên quen thuộc.',
    test: (g) => g.stats.berries > 0 && g.stats.wood >= 4 && g.stats.stone >= 2,
    progress: (g) =>
      `${Math.min(3, Number(g.stats.berries > 0) + Number(g.stats.wood >= 4) + Number(g.stats.stone >= 2))}/3 bước`,
    reward: { fiber: 2 },
  },
  {
    id: 'journey.home_fire',
    type: 'camp',
    title: 'Một nơi để trở về',
    description: 'Dựng lửa trại và đánh dấu nó là nhà.',
    test: (g) => g.stats.campfires > 0 && !!g.home,
    progress: (g) => `${Number(g.stats.campfires > 0) + Number(!!g.home)}/2 bước`,
    reward: { cooked: 2 },
  },
  {
    id: 'journey.landmark',
    type: 'exploration',
    title: 'Dấu tích trong rừng',
    description: 'Đi xa và khám phá một địa danh cổ.',
    test: (g) => g.discovered.size >= 1,
    progress: (g) => `${Math.min(1, g.discovered.size)}/1 địa danh`,
    reward: { salve: 1 },
  },
  {
    id: 'journey.danger',
    type: 'combat',
    title: 'Tiếng động sau tán lá',
    description: 'Đẩy lùi một sinh vật, hoặc chuẩn bị kỹ rồi quay lại.',
    test: (g) => g.combat.kills >= 1,
    progress: (g) => `${Math.min(1, g.combat.kills)}/1 sinh vật`,
    reward: { guardianShard: 1 },
  },
  {
    id: 'journey.workbench',
    type: 'camp',
    title: 'Căn trại lớn dần',
    description: 'Trở về nhà và dựng bàn thợ của trại cấp 2.',
    test: (g) => g.camp.level >= 2,
    progress: (g) => `Trại cấp ${Math.min(2, g.camp.level)}/2`,
    reward: { salve: 1 },
  },
  {
    id: 'journey.fragments',
    type: 'discovery',
    title: 'Ánh sáng bị vỡ',
    description: 'Tìm ba mảnh hộ vệ từ những hiểm nguy ngoài vùng an toàn.',
    test: (g) => g.progression.fragmentsFound >= 3,
    progress: (g) => `${Math.min(3, g.progression.fragmentsFound)}/3 mảnh`,
    reward: { crystal: 2 },
  },
  {
    id: 'journey.beacon',
    type: 'camp',
    title: 'Hải đăng cổ',
    description: 'Nâng trại lên cấp 3 để thắp tín hiệu xuyên qua khu rừng.',
    test: (g) => g.camp.level >= 3,
    progress: (g) => `Trại cấp ${Math.min(3, g.camp.level)}/3`,
    reward: { beaconCore: 1 },
  },
  {
    id: 'journey.ancient_guardian',
    type: 'combat',
    title: 'Chuyến đi cuối rừng sâu',
    description: 'Theo la bàn tín hiệu, tìm và vượt qua Hộ Vệ Cổ.',
    test: (g) => g.progression.guardianDefeated,
    progress: (g) => (g.progression.guardianDefeated ? 'Hoàn thành' : 'Hộ Vệ vẫn đang chờ'),
    reward: { crystal: 4, salve: 2 },
  },
];

export const CAMP_LEVELS = [
  { level: 1, name: 'Bếp lửa', benefit: 'Hồi phục bên lửa và đánh dấu nhà.', costs: {} },
  {
    level: 2,
    name: 'Trại người lữ hành',
    benefit: 'Bàn thợ mở vũ khí tinh luyện; vùng an toàn rộng hơn.',
    costs: { wood: 10, stone: 6, fiber: 3 },
  },
  {
    level: 3,
    name: 'Hải đăng rừng',
    benefit: 'Tín hiệu chỉ đường tới Hộ Vệ Cổ và tăng ánh sáng trại.',
    costs: { wood: 16, stone: 10, crystal: 3, guardianShard: 3 },
  },
];

export function createProgression() {
  return { completed: [], claimed: [], fragmentsFound: 0, guardianDefeated: false };
}

export function sanitizeProgression(value = {}) {
  const ids = new Set(QUESTS.map((q) => q.id));
  const list = (key) =>
    Array.isArray(value[key])
      ? [...new Set(value[key].filter((id) => ids.has(id)))].slice(0, QUESTS.length)
      : [];
  return {
    completed: list('completed'),
    claimed: list('claimed'),
    fragmentsFound: Number.isInteger(value.fragmentsFound)
      ? Math.max(0, Math.min(999, value.fragmentsFound))
      : 0,
    guardianDefeated: value.guardianDefeated === true,
  };
}

export function activeQuest(game) {
  return QUESTS.find((q) => !game.progression.completed.includes(q.id)) ?? QUESTS.at(-1);
}
