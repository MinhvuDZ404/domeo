// Quests for Domeo 5.1.
//
// A quest is data: a stable id, typed objectives, and a reward that can only be
// claimed once. Progress is driven by gameplay events the game already emits, so
// quests never reach into the world behind the player's back, and the journal is
// a view of this state rather than a second source of truth.
//
// Rewards are deliberately about knowledge and access (blueprints, passives,
// a revealed destination) more than about piles of items.
import { RECIPES } from './config.js';

export const QUEST_GROUPS = [
  { id: 'journey', label: 'Hành trình' },
  { id: 'region', label: 'Vùng đất' },
  { id: 'discovery', label: 'Khám phá' },
  { id: 'challenge', label: 'Thử thách' },
];

// Passive unlocks. Every one of them changes how the game plays; none of them
// is a flat "number goes up for no reason".
export const PASSIVES = {
  camp_comfort: {
    name: 'Hơi ấm của trại',
    description: 'Trong bán kính trại, bạn hao thức ăn chậm hơn 12%.',
  },
  wayfinder: {
    name: 'Người đọc dấu rừng',
    description: 'La bàn có thể chỉ tới địa danh gần nhất (nhấn T để đổi mục tiêu).',
  },
  forager: {
    name: 'Tay hái quả',
    description: 'Mỗi bụi quả cho thêm 1 quả mọng.',
  },
  herbalist: {
    name: 'Người làm thuốc',
    description: 'Cao dán thảo mộc hồi 45 máu thay vì 35.',
  },
  sanctuary: {
    name: 'Chỗ lặng',
    description: 'Đứng gần một miếu rừng, bạn hồi máu và hơi ấm chậm rãi.',
  },
  quiet_step: {
    name: 'Bước chân êm',
    description: 'Sinh vật trong rừng phát hiện bạn muộn hơn 15%.',
  },
  night_eye: {
    name: 'Mắt đêm',
    description: 'Đêm bớt tối hơn, và những sinh vật đêm xuất hiện thưa hơn.',
  },
  grove_blessing: {
    name: 'Lời hứa của rừng cổ',
    description: 'Mỗi đòn tấn công của bạn mạnh thêm 3 sát thương.',
  },
  swift: {
    name: 'Bước dài',
    description: 'Sức bền hồi nhanh hơn 30% và chạy tốn ít sức hơn.',
  },
  dawnkeeper: {
    name: 'Người giữ bình minh',
    description: 'Trại sáng hơn, thấy đường về từ rất xa, và đêm quanh trại bớt nguy hiểm.',
  },
};

export const PASSIVE_IDS = Object.keys(PASSIVES);
export const passiveKey = (id) => `passive:${id}`;
export const recipeKey = (id) => `recipe:${id}`;

// The main journey is a chain; `requires` is what makes each step wait for the
// one before it, so the journal never shows the whole game at minute one.
export const QUESTS = [
  {
    id: 'journey_fire',
    group: 'journey',
    title: 'Đốm lửa đầu tiên',
    description: 'Một chuyến đi dài bắt đầu bằng một chỗ để quay về.',
    hint: 'Chế tạo lửa trại (C), đặt xuống, rồi nướng một quả bên lửa.',
    objectives: [
      { id: 'fire', type: 'build', target: 'campfire', count: 1, label: 'Dựng một lửa trại' },
      { id: 'roast', type: 'cook', target: 'cooked', count: 1, label: 'Nướng một quả mọng' },
    ],
    reward: { recipes: [recipeKey('workbench')], items: { fiber: 2 } },
    rewardText: 'Bạn nghĩ ra cách dựng một bàn chế tác.',
  },
  {
    id: 'journey_camp',
    group: 'journey',
    requires: ['journey_fire'],
    title: 'Một nơi để trở về',
    description: 'Trại không chỉ là chỗ ngủ. Đó là nơi bạn chuẩn bị cho ngày mai.',
    hint: 'Đặt bàn chế tác và lều trú trong bán kính trại (quanh lửa nhà).',
    objectives: [
      {
        id: 'bench',
        type: 'build',
        target: 'workbench',
        count: 1,
        nearHome: true,
        label: 'Dựng bàn chế tác trong trại',
      },
      {
        id: 'shelter',
        type: 'build',
        target: 'shelter',
        count: 1,
        nearHome: true,
        label: 'Dựng lều trú trong trại',
      },
      { id: 'chest', type: 'build', target: 'chest', count: 1, label: 'Dựng một rương gỗ' },
    ],
    reward: { passives: [passiveKey('camp_comfort')], items: { stone: 4 } },
    rewardText: 'Trại của bạn bắt đầu giữ ấm cho bạn.',
  },
  {
    id: 'journey_tools',
    group: 'journey',
    requires: ['journey_camp'],
    title: 'Đồ nghề đi rừng',
    description: 'Đi xa thì cần đồ tốt, và một chút thuốc trong túi.',
    hint: 'Chế dao đá, rìu đá và cao dán thảo mộc.',
    objectives: [
      { id: 'knife', type: 'craft', target: 'knife', count: 1, label: 'Chế dao đá' },
      { id: 'axe', type: 'craft', target: 'axe', count: 1, label: 'Chế rìu đá' },
      { id: 'salve', type: 'craft', target: 'salve', count: 1, label: 'Chế cao dán thảo mộc' },
    ],
    reward: {
      recipes: [recipeKey('maptable')],
      passives: [passiveKey('wayfinder')],
      items: { salve: 1 },
    },
    rewardText: 'Bạn bắt đầu đọc được dấu rừng: la bàn có thể dẫn tới địa danh.',
  },
  {
    id: 'journey_survey',
    group: 'journey',
    requires: ['journey_tools'],
    title: 'Đi xa hơn',
    description: 'Khu rừng giấu những nơi không có trên bản đồ của bất kỳ ai.',
    hint: 'Đi qua nhiều vùng đất, tìm địa danh, mang theo cuốc để gỡ tinh thể.',
    objectives: [
      { id: 'landmarks', type: 'discover', target: 'any', count: 6, label: 'Tìm 6 địa danh' },
      { id: 'biomes', type: 'biomes', target: 'any', count: 4, label: 'Đi qua 4 vùng đất' },
      { id: 'crystal', type: 'gather', target: 'crystal', count: 2, label: 'Gỡ 2 tinh thể' },
    ],
    reward: { items: { salve: 2 }, reveal: 'grove' },
    rewardText: 'Ở một phía xa, có gì đó đang đợi. Vị trí đã hiện trên bản đồ của bạn.',
  },
  {
    id: 'journey_grove',
    group: 'journey',
    requires: ['journey_survey'],
    title: 'Rừng cổ thì thầm',
    description: 'Người giữ rừng cổ sẽ không để bạn lấy hạt giống một cách dễ dàng.',
    hint: 'Đi theo dấu chỉ trên bản đồ. Mang theo vũ khí tốt và vài cao dán.',
    objectives: [
      { id: 'grove', type: 'discover', target: 'ancientGrove', count: 1, label: 'Tới rừng cổ' },
      {
        id: 'keeper',
        type: 'kill',
        target: 'groveKeeper',
        count: 1,
        label: 'Đối đầu người giữ rừng cổ',
      },
    ],
    reward: {
      recipes: [recipeKey('beacon')],
      passives: [passiveKey('grove_blessing')],
      items: { fragment: 2 },
    },
    rewardText: 'Hạt giống chấp nhận bạn. Bạn có thể dựng một ngọn đèn hiệu.',
  },
  {
    id: 'journey_beacon',
    group: 'journey',
    requires: ['journey_grove'],
    title: 'Ngọn đèn hiệu',
    description: 'Mang ánh sáng trở về nơi bạn bắt đầu.',
    hint: 'Dựng đèn hiệu trong trại, rồi thắp nó bằng hạt giống cổ.',
    objectives: [
      {
        id: 'build',
        type: 'build',
        target: 'beacon',
        count: 1,
        nearHome: true,
        label: 'Dựng đèn hiệu trong trại',
      },
      { id: 'light', type: 'light', target: 'beacon', count: 1, label: 'Thắp đèn hiệu' },
    ],
    reward: { passives: [passiveKey('dawnkeeper')], items: { crystal: 2 } },
    rewardText: 'Ánh sáng cũ đã trở lại. Khu rừng vẫn ở đây, rộng hơn bao giờ hết.',
    finale: true,
  },
  {
    id: 'region_meadow',
    group: 'region',
    requires: ['journey_fire'],
    title: 'Khu vườn quanh nhà',
    description: 'Đồng cỏ ven nhà đủ nuôi một chuyến đi, nếu bạn để ý.',
    hint: 'Hái quả và sợi gần nhà, rồi đặt một chậu hoa bên trại.',
    objectives: [
      { id: 'berry', type: 'gather', target: 'berry', count: 12, label: 'Hái 12 quả mọng' },
      { id: 'fiber', type: 'gather', target: 'fiber', count: 6, label: 'Thu 6 sợi thực vật' },
      { id: 'planter', type: 'build', target: 'planter', count: 1, label: 'Đặt một chậu hoa' },
    ],
    reward: { passives: [passiveKey('forager')], items: { berry: 3 } },
    rewardText: 'Bạn hái quả nhanh hơn bất kỳ ai trong rừng này.',
  },
  {
    id: 'region_mistgrove',
    group: 'region',
    requires: ['journey_tools'],
    title: 'Sương và nấm',
    description: 'Rừng sương cho nấm và thảo mộc — đủ để nấu một bữa tử tế.',
    hint: 'Nấm mọc ở rừng sâu và rừng sương. Nhấn E bên lửa để nấu ăn.',
    objectives: [
      { id: 'mushroom', type: 'gather', target: 'mushroom', count: 6, label: 'Hái 6 nấm rừng' },
      { id: 'herb', type: 'gather', target: 'herb', count: 4, label: 'Hái 4 thảo mộc' },
      { id: 'meal', type: 'craft', target: 'meal', count: 1, label: 'Nấu một bữa ăn rừng' },
      { id: 'tea', type: 'craft', target: 'tea', count: 1, label: 'Pha một ấm trà thảo mộc' },
    ],
    reward: { passives: [passiveKey('herbalist')], items: { herb: 2, mushroom: 2 } },
    rewardText: 'Bạn biết pha thuốc tốt hơn trước.',
  },
  {
    id: 'region_rocky',
    group: 'region',
    requires: ['journey_tools'],
    title: 'Đá và tinh thể',
    description: 'Vùng đất đá có tinh thể, và cả những người canh giữ chúng.',
    hint: 'Những vòng đá và tảng đá lớn thường có Đá canh quanh đó. Nó chậm nhưng rất mạnh.',
    objectives: [
      { id: 'crystal', type: 'gather', target: 'crystal', count: 3, label: 'Gỡ 3 tinh thể' },
      { id: 'guardian', type: 'kill', target: 'guardian', count: 2, label: 'Hạ 2 Đá canh' },
    ],
    reward: { recipes: [recipeKey('blade')], items: { fragment: 1 } },
    rewardText: 'Bạn học được cách ghép gỗ cổ thành lưỡi kiếm.',
  },
  {
    id: 'disc_shrine',
    group: 'discovery',
    requires: ['journey_fire'],
    title: 'Miếu rừng',
    description: 'Ai đó đã dựng đá trong rừng từ rất lâu, và vẫn còn để lại chút hơi ấm.',
    hint: 'Miếu rừng nằm rải rác khắp khu rừng. Đến gần để nhận ra nó.',
    objectives: [
      { id: 'shrine', type: 'discover', target: 'shrine', count: 1, label: 'Tìm một miếu rừng' },
    ],
    reward: { passives: [passiveKey('sanctuary')], items: { salve: 1 } },
    rewardText: 'Bạn hiểu ra cách đá giữ hơi ấm.',
  },
  {
    id: 'disc_trail',
    group: 'discovery',
    requires: ['journey_camp'],
    title: 'Dấu vết người đi trước',
    description: 'Trại cũ và hồ nước: hai nơi kể chuyện mà không cần chữ.',
    hint: 'Đi chậm, để ý mặt nước và những đống lửa đã tắt.',
    objectives: [
      { id: 'pond', type: 'discover', target: 'pond', count: 1, label: 'Tìm một hồ nước' },
      { id: 'oldCamp', type: 'discover', target: 'oldCamp', count: 1, label: 'Tìm một trại cũ' },
    ],
    reward: { passives: [passiveKey('quiet_step')], items: { wood: 4, berry: 3 } },
    rewardText: 'Bạn học được cách bước đi mà rừng không nghe thấy.',
  },
  {
    id: 'chal_night',
    group: 'challenge',
    requires: ['journey_camp'],
    title: 'Người đi đêm',
    description: 'Không bắt buộc. Nhưng đêm ở Domeo là một nơi khác.',
    hint: 'Ở xa trại khi trời tối, và mang về một chút tinh chất đêm.',
    objectives: [
      { id: 'nights', type: 'nightsAway', target: 'any', count: 2, label: 'Qua 2 đêm xa nhà' },
      {
        id: 'essence',
        type: 'gather',
        target: 'moonEssence',
        count: 1,
        label: 'Lấy 1 tinh chất đêm',
      },
    ],
    reward: { passives: [passiveKey('night_eye')], items: { moonEssence: 1 } },
    rewardText: 'Mắt bạn quen với bóng tối.',
  },
  {
    id: 'chal_far',
    group: 'challenge',
    requires: ['journey_tools'],
    title: 'Chuyến đi dài',
    description: 'Không bắt buộc. Một chuyến đi tới nơi bạn chưa từng tới.',
    hint: 'Gỗ cổ chỉ mọc ở rừng sâu, cách nhà rất xa. Đi theo hướng bạn chưa từng đi.',
    objectives: [
      { id: 'distance', type: 'distance', target: 'any', count: 2600, label: 'Đi xa 2600 bước' },
      {
        id: 'ancientWood',
        type: 'gather',
        target: 'ancientWood',
        count: 3,
        label: 'Mang về 3 gỗ cổ',
      },
    ],
    reward: { passives: [passiveKey('swift')], items: { ancientWood: 1 } },
    rewardText: 'Chân bạn đã quen với đường dài.',
  },
  {
    id: 'keep_building',
    group: 'challenge',
    requires: ['journey_beacon'],
    title: 'Khu rừng còn rộng',
    description: 'Sau ngọn đèn hiệu, khu rừng vẫn ở đó. Không có gì phải vội nữa.',
    hint: 'Dựng thêm vài thứ quanh trại, tìm thêm địa danh, và nghỉ ngơi khi muốn.',
    objectives: [
      { id: 'build', type: 'place', target: 'any', count: 12, label: 'Dựng thêm 12 công trình' },
      { id: 'landmarks', type: 'discover', target: 'any', count: 12, label: 'Tìm 12 địa danh' },
      { id: 'rest', type: 'rest', target: 'any', count: 3, label: 'Nghỉ ngơi 3 lần bên lều' },
    ],
    reward: { items: { moonEssence: 3, fragment: 3 } },
    rewardText: 'Khu rừng này là của bạn, theo cách nó là của chính nó.',
  },
];

export const QUEST_IDS = QUESTS.map((quest) => quest.id);
const QUEST_BY_ID = Object.fromEntries(QUESTS.map((quest) => [quest.id, quest]));
export const getQuest = (id) => QUEST_BY_ID[id] ?? null;

const STATUSES = ['locked', 'active', 'done', 'claimed'];

const emptyProgress = (quest) =>
  Object.fromEntries((quest.objectives ?? []).map((objective) => [objective.id, 0]));

export class QuestLog {
  constructor(defs = QUESTS) {
    this.defs = defs;
    this.states = new Map();
    for (const quest of defs)
      this.states.set(quest.id, {
        status: quest.requires?.length ? 'locked' : 'active',
        progress: emptyProgress(quest),
      });
    this.unlocked = new Set();
    this.seenBiomes = new Set();
    this.events = [];
  }
  emit(quest, type, data = {}) {
    if (this.events.length > 60) this.events.shift();
    this.events.push({ quest: quest.id, type, ...data });
  }
  drainEvents() {
    return this.events.splice(0);
  }
  state(id) {
    return this.states.get(id) ?? null;
  }
  status(id) {
    return this.state(id)?.status ?? null;
  }
  isUnlocked(key) {
    return this.unlocked.has(key);
  }
  active() {
    return this.defs.filter((quest) => this.status(quest.id) === 'active');
  }
  visible() {
    return this.defs.filter((quest) => this.status(quest.id) !== 'locked');
  }
  /** The one objective line the HUD shows: the current step of the main journey. */
  main() {
    const journey = this.defs.filter((quest) => quest.group === 'journey');
    const current =
      journey.find((quest) => this.status(quest.id) === 'active') ??
      journey.find((quest) => this.status(quest.id) === 'done') ??
      journey.at(-1);
    return current
      ? { quest: current, progress: this.progressOf(current), status: this.status(current.id) }
      : null;
  }
  progressOf(quest) {
    const state = this.state(quest.id);
    if (!state) return [];
    return (quest.objectives ?? []).map((objective) => ({
      ...objective,
      value: state.progress[objective.id] ?? 0,
      complete: (state.progress[objective.id] ?? 0) >= objective.count,
    }));
  }
  percentComplete(quest) {
    const progress = this.progressOf(quest);
    if (!progress.length) return 0;
    const total = progress.reduce(
      (sum, objective) => sum + Math.min(1, objective.value / objective.count),
      0,
    );
    return total / progress.length;
  }
  completedCount() {
    return this.defs.filter((quest) => ['done', 'claimed'].includes(this.status(quest.id))).length;
  }
  claimedCount() {
    return this.defs.filter((quest) => this.status(quest.id) === 'claimed').length;
  }
  pending() {
    return this.defs.filter((quest) => this.status(quest.id) === 'done');
  }
  journeyComplete() {
    return this.status('journey_beacon') === 'claimed';
  }
  /** Unlocks any quest whose prerequisites are finished; returns the new ones. */
  sync() {
    const opened = [];
    for (const quest of this.defs) {
      if (this.status(quest.id) !== 'locked') continue;
      const ready = (quest.requires ?? []).every((id) =>
        ['done', 'claimed'].includes(this.status(id)),
      );
      if (!ready) continue;
      this.states.set(quest.id, { status: 'active', progress: emptyProgress(quest) });
      this.emit(quest, 'activated');
      opened.push(quest);
    }
    return opened;
  }
  /**
   * Feed one gameplay event in. Returns quests that became complete.
   * Unknown events and unknown quests are ignored, never thrown on.
   */
  report(type, target, count = 1, meta = {}) {
    const completed = [];
    if (!Number.isFinite(count) || count <= 0) return completed;
    for (const quest of this.defs) {
      const state = this.state(quest.id);
      if (!state || state.status !== 'active') continue;
      let touched = false;
      for (const objective of quest.objectives ?? []) {
        if (objective.type !== type) continue;
        if (objective.target !== 'any' && objective.target !== target) continue;
        if (objective.nearHome && !meta.nearHome) continue;
        if (type === 'biomes') {
          const key = `${quest.id}:${target}`;
          if (this.seenBiomes.has(key)) continue;
          this.seenBiomes.add(key);
        }
        const before = state.progress[objective.id] ?? 0;
        if (before >= objective.count) continue;
        // "Reach distance X" is a furthest-point objective, not a sum of steps.
        state.progress[objective.id] =
          objective.type === 'distance'
            ? Math.min(objective.count, Math.max(before, Math.floor(count)))
            : Math.min(objective.count, before + count);
        touched = true;
      }
      if (!touched) continue;
      if (this.isComplete(quest)) {
        state.status = 'done';
        this.emit(quest, 'done');
        completed.push(quest);
      }
    }
    return completed;
  }
  isComplete(quest) {
    const state = this.state(quest.id);
    if (!state) return false;
    return (quest.objectives ?? []).every(
      (objective) => (state.progress[objective.id] ?? 0) >= objective.count,
    );
  }
  /** Marks a finished quest as rewarded. Returns false when it was not claimable. */
  markClaimed(id) {
    const state = this.state(id);
    if (!state || state.status !== 'done') return false;
    state.status = 'claimed';
    const quest = getQuest(id) ?? this.defs.find((entry) => entry.id === id);
    if (quest?.reward?.recipes) for (const key of quest.reward.recipes) this.unlocked.add(key);
    if (quest?.reward?.passives) for (const key of quest.reward.passives) this.unlocked.add(key);
    this.emit(quest, 'claimed');
    return true;
  }
  /** Every objective a quest wants, flattened — used by the balance script. */
  objectiveCount() {
    return this.defs.reduce((sum, quest) => sum + (quest.objectives?.length ?? 0), 0);
  }
  serialize() {
    const quests = {};
    for (const [id, state] of this.states) {
      if (state.status === 'locked') continue;
      const progress = {};
      for (const [key, value] of Object.entries(state.progress))
        if (value > 0) progress[key] = value;
      quests[id] = { status: state.status, progress };
    }
    return { quests, unlocked: [...this.unlocked].sort() };
  }
  /**
   * Restores from save data. Unknown quest ids, unknown statuses and impossible
   * progress are dropped instead of trusted: a hand-edited save can never make a
   * quest complete itself.
   */
  static restore(data, defs = QUESTS) {
    const log = new QuestLog(defs);
    const save = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
    const stored = save.quests && typeof save.quests === 'object' ? save.quests : {};
    for (const quest of defs) {
      const entry = stored[quest.id];
      const state = log.state(quest.id);
      if (!state) continue;
      if (entry && STATUSES.includes(entry.status) && entry.status !== 'locked') {
        state.status = entry.status;
        const progress = entry.progress && typeof entry.progress === 'object' ? entry.progress : {};
        for (const objective of quest.objectives ?? []) {
          const value = progress[objective.id];
          state.progress[objective.id] = Number.isFinite(value)
            ? Math.max(0, Math.min(objective.count, Math.floor(value)))
            : 0;
        }
        // A save that claims completion without the work is repaired, not trusted.
        if (!log.isComplete(quest) && ['done', 'claimed'].includes(state.status))
          state.status = 'active';
      } else {
        state.status = quest.requires?.length ? 'locked' : 'active';
      }
    }
    if (Array.isArray(save.unlocked))
      for (const key of save.unlocked)
        if (typeof key === 'string' && /^(recipe|passive):[a-z0-9_]+$/.test(key))
          log.unlocked.add(key);
    log.sync();
    return log;
  }
}

/** Sanity check used by the save validator: every recipe unlock must exist. */
export const KNOWN_UNLOCK_KEYS = new Set([
  ...RECIPES.map((recipe) => recipeKey(recipe.id)),
  ...PASSIVE_IDS.map(passiveKey),
]);
