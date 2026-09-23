import {
  ATTACK_STAMINA,
  BERRY_HEALTH,
  BERRY_HUNGER,
  CAMPFIRE_HEAL_PER_SECOND,
  CAMPFIRE_HEAL_RADIUS,
  CAMP_RADIUS,
  CHUNK_SIZE,
  COOKED_HEALTH,
  COOKED_HUNGER,
  DAY_LENGTH,
  DISCOVERY_RADIUS,
  DODGE_DURATION,
  DODGE_INVULNERABILITY,
  DODGE_SPEED,
  DODGE_STAMINA,
  FIRE_MIN_HUNGER,
  HUNGER_DRAIN_PER_SECOND,
  INTERACTION_DISTANCE,
  ITEMS,
  LANDMARKS,
  MAX_DISCOVERIES,
  MAX_EXPLORED,
  MAX_STACK,
  MAX_STRUCTURES,
  MEAL_HEALTH,
  MEAL_HUNGER,
  MEAL_WARMTH,
  MUSHROOM_HEALTH,
  MUSHROOM_HUNGER,
  PLACEABLE,
  PLAYER_SPEED,
  RECIPES,
  RESOURCES,
  SALVE_HEALTH,
  SAVE_VERSION,
  SPRINT_MULTIPLIER,
  SPRINT_STAMINA_PER_SECOND,
  STAMINA_MAX,
  STAMINA_REGEN,
  STARVATION_DAMAGE_PER_SECOND,
  TEA_HEALTH,
  TEA_HUNGER,
  TEA_WARMTH,
  WARMTH_COLD_HEALTH,
  WARMTH_COLD_THRESHOLD,
  WARMTH_DRAIN_MIST,
  WARMTH_DRAIN_NIGHT,
  WARMTH_DRAIN_RAIN,
  WARMTH_FIRE_PER_SECOND,
  WARMTH_MAX,
  WARMTH_SHELTER_PER_SECOND,
  WARMTH_TORCH_PER_SECOND,
  WEAPONS,
  WORLD_GEN_VERSION,
  WORLD_LIMIT,
  bestWeapon,
  clamp,
  emptyItems,
  emptyStats,
  getDayInfo,
  getWeather,
} from './config.js';
import { World } from './world.js';
import { EnemyDirector, ENEMIES } from './combat.js';
import { PASSIVES, QuestLog, passiveKey } from './quests.js';
import {
  REST_COOLDOWN,
  REST_HEALTH,
  REST_HUNGER_COST,
  REST_WARMTH,
  campBonuses,
  campLevel,
  campSummary,
} from './camp.js';
import { getWorldEvent } from './events.js';

const DIRECTIONS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

// Foods the inventory, the hotbar and the touch button are all allowed to use.
// Keeping the list here stops a new recipe from being craftable but inedible.
export const CONSUMABLES = ['berry', 'cooked', 'mushroom', 'salve', 'meal', 'tea'];
export const isConsumable = (id) => CONSUMABLES.includes(id);

/**
 * Death is a lesson, not a fade-to-black. The lead names what happened; the
 * detail names the preparation that would have changed it.
 */
export function deathReport(cause = '') {
  if (cause === 'đói')
    return {
      lead: 'Bạn đói quá lâu.',
      detail: 'Mang theo quả hoặc một bữa đã nướng trước khi đi xa. Đói rút máu liên tục.',
    };
  if (cause === 'lạnh')
    return {
      lead: 'Hơi ấm đã cạn.',
      detail: 'Đêm, mưa và sương lấy hơi ấm. Lửa nhà, lều hoặc một cây đuốc giữ bạn sống.',
    };
  if (cause && cause !== 'kiệt sức' && cause !== 'vết thương')
    return {
      lead: `${cause} đã hạ bạn.`,
      detail:
        'Chúng báo hiệu trước khi đánh. Lăn tránh, hoặc lùi khỏi vòng sáng. Lửa nhà khiến hầu hết sinh vật bỏ cuộc — trừ kẻ giữ rừng cổ.',
    };
  return {
    lead: 'Bạn đã kiệt sức.',
    detail: 'Khu rừng vẫn còn đó. Tỉnh dậy bên lửa và chuẩn bị kỹ hơn cho lần sau.',
  };
}

// Event types that carry a world consequence (loot, quests, flags).
const COMBAT_EVENTS = new Set([
  'enemyDeath',
  'playerHurt',
  'enemyHit',
  'projectileHit',
  'enemyStrike',
  'enemySpawn',
  'enemyNotice',
  'enemyTelegraph',
  'enemyVanish',
]);

export class Game {
  constructor(seed = (Math.random() * 0xffffffff) >>> 0) {
    this.world = new World(seed);
    this.elapsed = 0; // Monotonic simulation time. The day/night clock is only a view.
    this.player = {
      x: 0,
      y: 0,
      health: 100,
      hunger: 100,
      warmth: WARMTH_MAX,
      stamina: STAMINA_MAX,
      direction: 'down',
      moving: false,
      frame: 0,
      animation: 0,
      swing: 0,
      dodge: 0,
    };
    this.inventory = { ...emptyItems(), berry: 3 };
    this.chest = emptyItems();
    this.stats = emptyStats();
    this.torchLit = false;
    this.placement = null;
    this.cooldown = 0;
    this.events = [];
    this.dead = false;
    this.deathCause = '';
    this.pendingCause = '';
    // One-time lessons. Optional on the save: a missing or edited field is ignored.
    this.hints = { combat: false, cold: false, hunger: false };
    this.pruneAt = 1;
    this.home = null;
    this.explored = new Set(['0,0']);
    this.stats.explored = 1;
    this.openChest = false;
    this.discovered = new Set();
    this.stepAcc = 0;
    this.wasNight = getDayInfo(0).isNight;
    this.discoverAt = 0;
    // 5.1 systems.
    this.quests = new QuestLog();
    this.flags = { groveCleared: false, beaconLit: false, groveRevealed: false, keeperSeen: false };
    this.campInfo = null;
    this.campAt = 0;
    this.sprinting = false;
    this.movementX = 0;
    this.movementY = 0;
    this.restReadyAt = 0;
    this.enemyCheckAt = 0;
    this.biomes = new Set();
    this.maxDistance = 0;
    this.journeyComplete = false;
    this.compassMode = 'home';
    this.enemies = new EnemyDirector(this);
  }
  /** Passive lookup used by src/combat.js (kept tiny on purpose). */
  passiveActive(id) {
    return this.passive(id);
  }
  threat() {
    return this.enemies.threat();
  }
  // ---- context the combat director reads -----------------------------------
  get seed() {
    return this.world.seed;
  }
  time() {
    return this.elapsed;
  }
  biomeAt(x, y) {
    return this.world.biomeAt(x, y);
  }
  camp() {
    return this.home;
  }
  isNight() {
    return getDayInfo(this.elapsed).isNight;
  }
  passive(id) {
    return this.quests.isUnlocked(passiveKey(id));
  }
  emit(type, data = {}) {
    // Combat events first change the world (loot, quests, flags), then become
    // visible events for the audio/visual layer. Consequences are applied here
    // so a caller can never forget them.
    if (COMBAT_EVENTS.has(type)) {
      this.resolveCombat(type, data);
      // `type` inside a combat payload is the creature, so keep it under a name
      // that cannot shadow the event type itself.
      data = { ...data, creature: data.type };
    }
    if (this.events.length > 200) this.events.shift();
    this.events.push({ ...data, type });
  }
  /**
   * Everything a fight leaves behind: loot on the ground, kill counters, the
   * quest hooks, and the one flag that keeps the grove peaceful afterwards.
   */
  resolveCombat(type, data) {
    if (type === 'enemyDeath') {
      const gained = [];
      for (const [item, count] of data.loot ?? []) {
        const added = this.addItem(item, count);
        if (added > 0) gained.push(`+${added} ${ITEMS[item].name.toLowerCase()}`);
      }
      if (gained.length) data.lootText = gained.join(' · ');
      this.stats.kills += 1;
      this.reportQuest('kill', data.type, 1);
      this.reportQuest('kill', 'any', 1);
      if (data.type === 'groveKeeper') {
        this.flags.groveCleared = true;
        this.emit('groveCleared', {
          x: data.x,
          y: data.y,
          text: 'Người giữ rừng cổ đã lui. Khu rừng cổ im lặng trở lại.',
        });
      }
      return;
    }
    if (type === 'playerHurt') this.stats.deaths = this.stats.deaths; // damage is tracked by health
    // The first time something notices the player is the combat lesson. Once,
    // and only once — a save remembers that the lesson was already given.
    if (type === 'enemyNotice' && !this.hints.combat) {
      this.hints.combat = true;
      this.emit('hint', {
        text: 'Có thứ đã thấy bạn. Space để đánh, Q để lăn tránh — hoặc quay về lửa nhà.',
      });
    }
  }
  drainEvents() {
    return this.events.splice(0);
  }
  addItem(item, count, bag = this.inventory) {
    if (!(item in bag)) return 0;
    const added = Math.min(count, MAX_STACK - bag[item]);
    bag[item] += added;
    return added;
  }
  canReceive(items = {}) {
    return Object.entries(items).every(
      ([item, count]) => (this.inventory[item] ?? 0) + count <= MAX_STACK,
    );
  }
  weather() {
    return getWeather(this.elapsed, this.world.seed);
  }
  worldEvent() {
    return getWorldEvent(this.elapsed, this.world.seed, {
      isNight: this.isNight(),
      biome: this.biome(),
    });
  }
  biome() {
    return this.world.biomeAt(this.player.x, this.player.y);
  }
  weapon() {
    const weapon = bestWeapon(this.inventory);
    return this.passive('grove_blessing') ? { ...weapon, damage: weapon.damage + 3 } : weapon;
  }
  nearCampfire(radius = CAMPFIRE_HEAL_RADIUS) {
    const p = this.player;
    return this.world.structures.find(
      (s) => s.type === 'campfire' && Math.hypot(p.x - s.x, p.y - s.y) < radius,
    );
  }
  nearChest() {
    const p = this.player;
    return this.world.structures.find(
      (s) => s.type === 'chest' && Math.hypot(p.x - s.x, p.y - s.y) < INTERACTION_DISTANCE,
    );
  }
  /** The closest built structure of a type within reach (used by interactions). */
  nearStructure(type, radius = INTERACTION_DISTANCE) {
    const p = this.player;
    return this.world.structures.find(
      (s) => s.type === type && Math.hypot(p.x - s.x, p.y - s.y) < radius,
    );
  }
  stationNear(type) {
    return !!this.nearStructure(type, 110);
  }
  markExplored() {
    const key = `${Math.floor(this.player.x / CHUNK_SIZE)},${Math.floor(this.player.y / CHUNK_SIZE)}`;
    if (this.explored.has(key) || this.explored.size >= MAX_EXPLORED) return;
    this.explored.add(key);
    this.stats.explored = this.explored.size;
  }
  // ---- camp ---------------------------------------------------------------
  /** Camp state is recomputed a few times a second, never every frame. */
  refreshCamp() {
    const level = campLevel(this.world, this.home);
    const p = this.player;
    const near = (type, radius) =>
      this.world.structures.some(
        (s) => s.type === type && Math.hypot(p.x - s.x, p.y - s.y) < radius,
      );
    const homeDistance = this.home ? Math.hypot(p.x - this.home.x, p.y - this.home.y) : Infinity;
    this.campInfo = {
      level,
      bonuses: campBonuses(level),
      nearFire: near('campfire', CAMPFIRE_HEAL_RADIUS),
      nearShelter: near('shelter', 120),
      nearWorkbench: near('workbench', 110),
      nearMaptable: near('maptable', 110),
      nearShrine: !!this.world
        .landmarksNear(p.x, p.y, 120)
        .find((landmark) => landmark.type === 'shrine'),
      inside: homeDistance <= CAMP_RADIUS,
      homeDistance,
    };
    return this.campInfo;
  }
  campState() {
    return (
      this.campInfo ?? {
        level: 0,
        bonuses: campBonuses(0),
        nearFire: false,
        nearShelter: false,
        nearWorkbench: false,
        nearMaptable: false,
        nearShrine: false,
        inside: false,
        homeDistance: Infinity,
      }
    );
  }
  campSummary() {
    return campSummary(this.world, this.home);
  }
  /**
   * The compass always has a destination: home, and (with `wayfinder`) the
   * revealed grove or the nearest landmark already discovered.
   */
  compassTargets() {
    const targets = [];
    if (this.home) targets.push({ id: 'home', name: 'Nhà', x: this.home.x, y: this.home.y });
    if (this.flags.groveRevealed) {
      const grove = this.world.grove?.();
      if (grove) targets.push({ id: 'grove', name: 'Rừng cổ', x: grove.x, y: grove.y });
    }
    if (this.passive('wayfinder')) {
      const nearest = this.nearestDiscoveredLandmark();
      if (nearest) targets.push({ id: 'landmark', name: nearest.name, x: nearest.x, y: nearest.y });
    }
    return targets;
  }
  nearestDiscoveredLandmark() {
    if (!this.discovered?.size) return null;
    const p = this.player;
    const landmarks = this.world.getLandmarks({
      x: p.x - 4000,
      y: p.y - 4000,
      width: 8000,
      height: 8000,
    });
    let best = null;
    for (const landmark of landmarks) {
      if (!this.discovered.has(landmark.id)) continue;
      const distance = Math.hypot(landmark.x - p.x, landmark.y - p.y);
      if (!best || distance < best.distance)
        best = {
          ...landmark,
          distance,
          name: LANDMARKS[landmark.type]?.name ?? 'Địa danh',
        };
    }
    return best;
  }
  /** Cycles the compass destination; returns the new target (or null). */
  cycleCompass() {
    const targets = this.compassTargets();
    if (targets.length <= 1) return targets[0] ?? null;
    const index = targets.findIndex((target) => target.id === this.compassMode);
    const next = targets[(index + 1) % targets.length];
    this.compassMode = next.id;
    this.emit('message', { text: `La bàn đang chỉ: ${next.name}.` });
    return next;
  }
  compass() {
    const targets = this.compassTargets();
    if (!targets.length) return null;
    const target =
      targets.find((entry) => entry.id === this.compassMode) ??
      (this.compassMode !== 'home' ? targets[0] : null);
    if (!target) return null;
    const dx = target.x - this.player.x,
      dy = target.y - this.player.y;
    return {
      distance: Math.hypot(dx, dy),
      angle: Math.atan2(dx, -dy),
      id: target.id,
      name: target.name,
    };
  }
  // ---- quests -------------------------------------------------------------
  reportQuest(type, target, count = 1, meta = {}) {
    const completed = this.quests.report(type, target, count, meta);
    for (const quest of completed)
      this.emit('questComplete', {
        quest: quest.id,
        title: quest.title,
        text: `Hoàn thành: ${quest.title}`,
        group: quest.group,
      });
    return completed;
  }
  syncQuests() {
    const opened = this.quests.sync();
    for (const quest of opened)
      this.emit('quest', {
        quest: quest.id,
        title: quest.title,
        hint: quest.hint,
        text:
          quest.group === 'journey'
            ? `Nhiệm vụ mới: ${quest.title}`
            : `Một việc mới trong nhật ký: ${quest.title}`,
      });
    return opened;
  }
  claimQuest(id) {
    const quest = this.quests.defs.find((entry) => entry.id === id);
    const state = this.quests.state(id);
    if (!quest || !state || state.status !== 'done') return false;
    const reward = quest.reward ?? {};
    if (!this.canReceive(reward.items ?? {})) {
      this.emit('message', {
        text: 'Túi không đủ chỗ cho phần thưởng này. Cất bớt đồ rồi quay lại nhé.',
        tone: 'warning',
      });
      return false;
    }
    if (!this.quests.markClaimed(id)) return false;
    const gained = [];
    for (const [item, count] of Object.entries(reward.items ?? {})) {
      const added = this.addItem(item, count);
      if (added > 0) gained.push(`${added} ${ITEMS[item].name.toLowerCase()}`);
    }
    for (const key of reward.recipes ?? []) {
      const recipe = RECIPES.find((entry) => `recipe:${entry.id}` === key);
      if (recipe) gained.push(`công thức ${ITEMS[recipe.id].name.toLowerCase()}`);
    }
    for (const key of reward.passives ?? []) {
      const id = key.replace('passive:', '');
      if (PASSIVES[id]) gained.push(`năng lực «${PASSIVES[id].name}»`);
    }
    this.stats.quests += 1;
    if (reward.reveal === 'grove') this.flags.groveRevealed = true;
    if (quest.finale) {
      this.journeyComplete = true;
      this.emit('journeyComplete', { text: 'Hành trình hoang dã đã trọn vẹn.' });
    }
    this.syncQuests();
    this.emit('questClaimed', {
      quest: id,
      title: quest.title,
      text:
        gained.length > 0
          ? `Nhận thưởng: ${gained.join(' · ')}`
          : `Nhận thưởng: ${quest.rewardText ?? quest.title}`,
      rewards: gained,
    });
    return true;
  }
  /** The single quest line the HUD shows. */
  questSummary() {
    const main = this.quests.main();
    if (!main) return null;
    const pending = main.progress.find((objective) => !objective.complete) ?? null;
    return {
      id: main.quest.id,
      title: main.quest.title,
      status: main.status,
      objective: pending ? pending.label : null,
      value: pending ? pending.value : null,
      count: pending ? pending.count : null,
      percent: this.quests.percentComplete(main.quest),
      pendingRewards: this.quests.pending().length,
    };
  }
  // ---- discoveries --------------------------------------------------------
  checkDiscoveries() {
    if (this.world.generationVersion < 2) return;
    // Landmarks don't move: checking a few times per second is plenty, and it
    // keeps the world query budget flat on low-end devices.
    if (this.elapsed < this.discoverAt) return;
    this.discoverAt = this.elapsed + 0.3;
    if (this.discovered.size >= MAX_DISCOVERIES) return;
    const p = this.player;
    const landmarks = this.world.getLandmarks({
      x: p.x - DISCOVERY_RADIUS,
      y: p.y - DISCOVERY_RADIUS,
      width: DISCOVERY_RADIUS * 2,
      height: DISCOVERY_RADIUS * 2,
    });
    for (const landmark of landmarks) {
      if (this.discovered.has(landmark.id)) continue;
      if (Math.hypot(landmark.x - p.x, landmark.y - p.y) > DISCOVERY_RADIUS) continue;
      this.discovered.add(landmark.id);
      this.stats.landmarks = this.discovered.size;
      const info = LANDMARKS[landmark.type];
      const rewards = [];
      if (info?.reward) {
        for (const [item, count] of Object.entries(info.reward)) {
          const added = this.addItem(item, count);
          if (added > 0) rewards.push(`+${added} ${ITEMS[item].name.toLowerCase()}`);
        }
      }
      this.emit('discovery', {
        x: landmark.x,
        y: landmark.y,
        landmark: landmark.type,
        name: info?.name ?? 'Địa danh mới',
        hint: info?.hint ?? '',
        text: `Đã khám phá: ${info?.name ?? 'vùng đất mới'}${rewards.length ? ` · ${rewards.join(' · ')}` : ''}`,
      });
      this.reportQuest('discover', landmark.type, 1);
      this.reportQuest('discover', 'any', 1);
    }
  }
  // ---- combat -------------------------------------------------------------
  /** A creature's own name, never its internal id. */
  threatName(source) {
    if (!source) return 'vết thương';
    if (typeof source.name === 'string' && source.name) return source.name;
    return ENEMIES[source.type]?.name ?? 'vết thương';
  }
  damagePlayer(amount, source = null) {
    if (this.dead || this.player.health <= 0) return false;
    this.player.health = Math.max(0, this.player.health - amount);
    if (this.player.health <= 0) this.die(this.threatName(source));
    return true;
  }
  die(cause = 'kiệt sức') {
    if (this.dead) return;
    this.dead = true;
    this.deathCause = cause;
    this.placement = null;
    this.openChest = false;
    this.player.health = 0;
    this.stats.deaths += 1;
    this.emit('death', { cause });
  }
  /**
   * Death is a setback, never a wipe: the journey keeps everything it earned and
   * wakes up at home. The save is never erased by dying.
   */
  revive() {
    if (!this.dead) return false;
    const cause = this.deathCause;
    this.dead = false;
    const anchor = this.home ?? { x: 0, y: 0 };
    this.player.x = anchor.x + 18;
    this.player.y = anchor.y + 26;
    this.player.health = this.passive('grove_blessing') ? 70 : 45;
    this.player.hunger = Math.max(25, this.player.hunger);
    this.player.warmth = Math.max(45, this.player.warmth);
    this.player.stamina = STAMINA_MAX;
    this.deathCause = '';
    this.pendingCause = '';
    this.enemies.clearNear(this.player.x, this.player.y, 520);
    this.emit('revive', { x: this.player.x, y: this.player.y, cause });
    return true;
  }
  attack(direction = null) {
    if (this.dead || this.placement || this.cooldown > 0) return false;
    const weapon = this.weapon();
    const p = this.player;
    const facing = DIRECTIONS[p.direction] ?? DIRECTIONS.down;
    // A zero vector means "no aim given", not "aim at nothing".
    const aim =
      direction && (direction.x || direction.y) ? direction : { x: facing[0], y: facing[1] };
    const length = Math.hypot(aim.x, aim.y) || 1;
    const unit = { x: aim.x / length, y: aim.y / length };
    // A tired swing still lands: the player must never be unable to defend.
    const exhausted = p.stamina < ATTACK_STAMINA;
    p.stamina = Math.max(0, p.stamina - ATTACK_STAMINA);
    const damage = Math.max(1, Math.round(weapon.damage * (exhausted ? 0.7 : 1)));
    this.cooldown = weapon.cooldown;
    p.swing = 0.26;
    p.swingAngle = Math.atan2(unit.y, unit.x);
    const hits = this.enemies.playerAttack({
      direction: unit,
      weapon: { ...weapon, damage },
      x: p.x,
      y: p.y,
    });
    this.emit('swing', {
      x: p.x,
      y: p.y,
      angle: Math.atan2(unit.y, unit.x),
      weapon: weapon.id,
      hits: hits.length,
      exhausted,
    });
    return true;
  }
  dodge(direction = null) {
    if (this.dead || this.placement || this.player.dodge > 0) return false;
    const p = this.player;
    if (p.stamina < DODGE_STAMINA) {
      this.emit('message', { text: 'Bạn chưa đủ sức để lăn tránh.', tone: 'warning' });
      return false;
    }
    const facing = DIRECTIONS[p.direction] ?? DIRECTIONS.down;
    const aim =
      direction && (direction.x || direction.y) ? direction : { x: facing[0], y: facing[1] };
    const length = Math.hypot(aim.x, aim.y) || 1;
    p.stamina -= DODGE_STAMINA;
    p.dodge = DODGE_DURATION;
    p.dodgeX = aim.x / length;
    p.dodgeY = aim.y / length;
    this.enemies.invulnerableUntil = this.elapsed + DODGE_INVULNERABILITY;
    this.enemies.dodgeNoted = false;
    this.emit('dodge', { x: p.x, y: p.y, angle: Math.atan2(p.dodgeY, p.dodgeX) });
    return true;
  }
  rest() {
    if (this.dead) return false;
    if (!this.nearStructure('shelter', INTERACTION_DISTANCE)) {
      this.emit('message', { text: 'Cần một lều trú để nghỉ ngơi.', tone: 'warning' });
      return false;
    }
    if (this.elapsed < this.restReadyAt) {
      this.emit('message', {
        text: `Bạn vừa nghỉ rồi. Thử lại sau ${Math.ceil(this.restReadyAt - this.elapsed)} giây.`,
        tone: 'warning',
      });
      return false;
    }
    if (this.player.hunger < REST_HUNGER_COST) {
      this.emit('message', { text: 'Bạn quá đói để nghỉ. Ăn một chút trước đã.', tone: 'warning' });
      return false;
    }
    this.player.hunger -= REST_HUNGER_COST;
    this.player.health = Math.min(100, this.player.health + REST_HEALTH);
    this.player.warmth = Math.min(WARMTH_MAX, this.player.warmth + REST_WARMTH);
    this.restReadyAt = this.elapsed + REST_COOLDOWN;
    this.reportQuest('rest', 'any', 1);
    this.emit('rest', { text: 'Bạn nghỉ một lát bên lều. Người ấm trở lại.' });
    return true;
  }
  lightBeacon() {
    if (this.dead) return false;
    const beacon = this.nearStructure('beacon', INTERACTION_DISTANCE);
    if (!beacon) return false;
    if (this.flags.beaconLit) {
      this.emit('message', { text: 'Đèn hiệu đã sáng.' });
      return false;
    }
    if (!this.inventory.ancientSeed) {
      this.emit('message', {
        text: 'Đèn hiệu cần hạt giống bình minh từ rừng cổ.',
        tone: 'warning',
      });
      return false;
    }
    this.inventory.ancientSeed -= 1;
    this.flags.beaconLit = true;
    this.emit('beaconLit', { x: beacon.x, y: beacon.y, text: 'Đèn hiệu đã sáng.' });
    this.reportQuest('light', 'beacon', 1);
    return true;
  }
  // ---- gathering and crafting --------------------------------------------
  getTarget() {
    const p = this.player;
    const nearby = this.world.getEntities(
      { x: p.x - 70, y: p.y - 70, width: 140, height: 140 },
      this.elapsed,
    );
    const candidates = nearby.filter(
      (e) => e.remaining > 0 && Math.hypot(e.x - p.x, e.y - p.y) <= INTERACTION_DISTANCE,
    );
    candidates.sort((a, b) => {
      const usable = (e) => !RESOURCES[e.type].tool || this.inventory[RESOURCES[e.type].tool] > 0;
      return (
        Number(usable(b)) - Number(usable(a)) ||
        Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y)
      );
    });
    return candidates[0] || null;
  }
  getFocus() {
    // A chest or an unlit beacon is a decision. Gathering beats resting: rest
    // spends hunger, so it must never steal the button from a bush at your feet.
    const chest = this.nearChest();
    if (chest) return { kind: 'chest', entity: chest };
    const beacon = this.nearStructure('beacon');
    if (beacon && !this.flags.beaconLit) return { kind: 'beacon', entity: beacon };
    const resource = this.getTarget();
    if (resource) return { kind: 'resource', entity: resource };
    if (beacon) return { kind: 'beacon', entity: beacon };
    const fire = this.nearCampfire(INTERACTION_DISTANCE);
    if (fire) return { kind: 'campfire', entity: fire };
    const shelter = this.nearStructure('shelter');
    if (shelter) return { kind: 'shelter', entity: shelter };
    return null;
  }
  interact() {
    if (this.dead || this.placement || this.cooldown > 0) return false;
    const focus = this.getFocus();
    if (!focus) return false;
    if (focus.kind === 'chest') {
      this.cooldown = 0.38;
      this.openChest = true;
      this.emit('message', { text: 'Rương gỗ. Cất hoặc lấy đồ trong túi.' });
      return true;
    }
    if (focus.kind === 'beacon') {
      this.cooldown = 0.38;
      return this.lightBeacon();
    }
    if (focus.kind === 'shelter') {
      this.cooldown = 0.38;
      return this.rest();
    }
    if (focus.kind === 'campfire') {
      this.cooldown = 0.38;
      if (this.inventory.berry > 0) return this.cook();
      return this.setHome();
    }
    const target = focus.entity;
    this.cooldown = 0.38;
    const tool = RESOURCES[target.type].tool;
    if (tool && !this.inventory[tool]) {
      this.emit('deny', { x: target.x, y: target.y });
      this.emit('message', {
        text: `Bạn cần chế tạo ${ITEMS[tool].name.toLowerCase()}.`,
        tone: 'warning',
      });
      return false;
    }
    const reward =
      target.type === 'tree' || target.type === 'branch' || target.type === 'ironwood'
        ? 'wood'
        : target.type === 'rock' || target.type === 'pebble'
          ? 'stone'
          : target.type === 'mushroom'
            ? 'mushroom'
            : target.type === 'herb'
              ? 'herb'
              : target.type === 'crystal' || target.type === 'geode'
                ? 'crystal'
                : 'berry';
    const base = ['tree', 'rock'].includes(target.type)
      ? 5
      : ['bush', 'mushroom', 'herb', 'crystal', 'geode'].includes(target.type)
        ? 1
        : 2;
    const bonus = RESOURCES[target.type].bonus;
    const quantity =
      base +
      (bonus && this.inventory[bonus.tool] > 0 ? bonus.amount : 0) +
      (reward === 'crystal' && this.worldEvent()?.crystalBonus ? 1 : 0);
    const resource = reward === 'wood' && target.type === 'ironwood' ? 'ancientWood' : reward;
    if (this.inventory[resource] + quantity > MAX_STACK) {
      this.emit('deny', { x: target.x, y: target.y });
      this.emit('message', { text: `${ITEMS[resource].name} đã đầy.`, tone: 'warning' });
      return false;
    }
    const state = this.world.consume(target, this.elapsed);
    if (!state) return false;
    let text =
      target.type === 'tree' || target.type === 'ironwood'
        ? 'Chặt cây'
        : target.type === 'rock' || target.type === 'geode'
          ? 'Khai thác đá'
          : 'Thu thập';
    if (
      ['bush', 'mushroom', 'herb', 'crystal', 'geode'].includes(target.type) ||
      state.remaining === 0
    ) {
      let added = this.addItem(resource, quantity);
      if (resource === 'berry') {
        if (added > 0 && this.passive('forager')) added += this.addItem('berry', 1);
        this.stats.berries += added;
        this.addItem('fiber', 1);
      } else if (resource === 'mushroom') this.stats.mushrooms += added;
      else if (resource === 'herb') {
        this.stats.herbs += added;
        this.addItem('fiber', 1);
      } else if (resource === 'crystal') this.stats.crystals += added;
      else this.stats[resource] += added;
      text = `+${added} ${ITEMS[resource].name.toLowerCase()}`;
      if (resource === 'berry' || resource === 'herb') text += ' · +1 sợi';
      this.reportQuest('gather', resource, added);
    }
    this.emit('gather', { x: target.x, y: target.y, text, item: resource });
    return true;
  }
  eat(item = 'berry') {
    if (this.dead) return false;
    const foods = {
      berry: { hunger: BERRY_HUNGER, health: BERRY_HEALTH, id: 'berry' },
      cooked: { hunger: COOKED_HUNGER, health: COOKED_HEALTH, id: 'cooked' },
      mushroom: { hunger: MUSHROOM_HUNGER, health: MUSHROOM_HEALTH, id: 'mushroom' },
      salve: { hunger: 0, health: SALVE_HEALTH, id: 'salve' },
      meal: { hunger: MEAL_HUNGER, health: MEAL_HEALTH, warmth: MEAL_WARMTH, id: 'meal' },
      tea: { hunger: TEA_HUNGER, health: TEA_HEALTH, warmth: TEA_WARMTH, id: 'tea' },
    };
    const food = foods[item] ?? foods.berry;
    if (!this.inventory[food.id]) {
      const hints = {
        berry: 'Hết quả rồi. Tìm một bụi quả mọng nhé.',
        cooked: 'Chưa có quả nướng. Đứng gần lửa và nhấn E khi còn quả mọng.',
        mushroom: 'Chưa có nấm. Tìm nơi ẩm thấp trong rừng sâu hoặc rừng sương.',
        salve: 'Chưa có cao dán. Chế từ 2 nấm và 1 thảo mộc.',
        meal: 'Chưa có bữa ăn rừng. Nấu bên lửa: 1 quả, 1 nấm, 1 thảo mộc.',
        tea: 'Chưa có trà. Pha bên lửa từ 2 thảo mộc và 1 quả.',
      };
      this.emit('message', { text: hints[food.id], tone: 'warning' });
      return false;
    }
    if (food.id === 'salve') {
      if (this.player.health >= 100) {
        this.emit('message', { text: 'Bạn đang khỏe. Để dành cao dán cho lúc cần nhé.' });
        return false;
      }
    } else if (this.player.hunger >= 100 && this.player.health >= 100) {
      this.emit('message', { text: 'Bạn vẫn đang no. Để dành thức ăn cho lát nữa nhé.' });
      return false;
    }
    this.inventory[food.id]--;
    this.player.hunger = Math.min(100, this.player.hunger + food.hunger);
    const healing = food.id === 'salve' && this.passive('herbalist') ? 45 : food.health;
    this.player.health = Math.min(100, this.player.health + healing);
    if (food.warmth) this.player.warmth = Math.min(WARMTH_MAX, this.player.warmth + food.warmth);
    if (food.id === 'tea') this.player.stamina = STAMINA_MAX;
    this.emit('eat', {
      text:
        food.id === 'salve'
          ? `+${healing} máu`
          : `+${food.hunger} no · +${healing} máu${food.warmth ? ` · +${food.warmth} ấm` : ''}`,
    });
    return true;
  }
  cook() {
    if (this.dead) return false;
    if (!this.nearCampfire(INTERACTION_DISTANCE)) {
      this.emit('message', { text: 'Đứng gần lửa trại để nướng quả.', tone: 'warning' });
      return false;
    }
    if (!this.inventory.berry) {
      this.emit('message', { text: 'Cần một quả mọng để nướng.', tone: 'warning' });
      return false;
    }
    if (this.inventory.cooked >= MAX_STACK) {
      this.emit('message', { text: 'Quả nướng đã đầy.', tone: 'warning' });
      return false;
    }
    this.inventory.berry--;
    this.inventory.cooked++;
    this.stats.cooked++;
    this.emit('craft', { item: 'cooked', text: 'Đã nướng một quả. Thơm hơn nhiều.' });
    this.reportQuest('cook', 'cooked', 1);
    return true;
  }
  setHome() {
    if (this.dead) return false;
    const fire = this.nearCampfire(INTERACTION_DISTANCE);
    if (!fire) {
      this.emit('message', { text: 'Đứng gần lửa trại để đánh dấu nhà.', tone: 'warning' });
      return false;
    }
    this.home = { x: fire.x, y: fire.y };
    this.refreshCamp();
    this.emit('message', { text: 'Đã đánh dấu nhà. La bàn sẽ dẫn bạn trở về.' });
    return true;
  }
  transfer(item, toChest) {
    if (this.dead || !this.openChest || !ITEMS[item]) return false;
    const from = toChest ? this.inventory : this.chest;
    const to = toChest ? this.chest : this.inventory;
    if (!from[item]) return false;
    if (this.addItem(item, 1, to) === 0) {
      this.emit('message', { text: 'Không còn chỗ.', tone: 'warning' });
      return false;
    }
    from[item]--;
    return true;
  }
  recipe(id) {
    return RECIPES.find((r) => r.id === id) ?? null;
  }
  recipeUnlocked(recipe) {
    return !recipe.requires || this.quests.isUnlocked(recipe.requires);
  }
  /** Why a recipe cannot be crafted — the UI shows this instead of a silent no. */
  craftBlocked(id) {
    const recipe = this.recipe(id);
    if (!recipe) return 'unknown';
    if (!this.recipeUnlocked(recipe)) return 'blueprint';
    if (recipe.station && !this.stationNear(recipe.station)) return `station:${recipe.station}`;
    if (this.dead) return 'dead';
    if (recipe.unique && this.inventory[id] > 0) return 'owned';
    if (this.inventory[id] >= MAX_STACK) return 'full';
    if (!Object.entries(recipe.costs).every(([item, count]) => this.inventory[item] >= count))
      return 'materials';
    return null;
  }
  canCraft(id) {
    return this.craftBlocked(id) === null;
  }
  craft(id) {
    if (!this.canCraft(id)) return false;
    const recipe = this.recipe(id);
    for (const [item, count] of Object.entries(recipe.costs)) this.inventory[item] -= count;
    this.inventory[id]++;
    this.stats.crafted++;
    if (id === 'torch') this.torchLit = true;
    const fromBag = PLACEABLE.includes(id) && !['campfire', 'wall', 'chest'].includes(id);
    this.emit('craft', {
      item: id,
      text: fromBag
        ? `Đã chế tạo ${ITEMS[id].name.toLowerCase()}. Mở túi đồ và chọn “Mang ra đặt”.`
        : `Đã chế tạo ${ITEMS[id].name.toLowerCase()}`,
    });
    this.reportQuest('craft', id, 1);
    return true;
  }
  toggleTorch() {
    if (this.dead) return false;
    if (!this.inventory.torch) {
      this.emit('message', { text: 'Chế tạo một cây đuốc trong mục Chế tạo trước nhé.' });
      return false;
    }
    this.torchLit = !this.torchLit;
    this.emit('message', { text: this.torchLit ? 'Đã thắp đuốc.' : 'Đã tắt đuốc.' });
    return true;
  }
  beginPlacement(type) {
    if (!PLACEABLE.includes(type) || !this.inventory[type] || this.dead) {
      this.emit('message', { text: 'Bạn cần chế tạo công trình này trước.', tone: 'warning' });
      return false;
    }
    this.placement = type;
    this.openChest = false;
    return true;
  }
  placementPoint() {
    const dir = DIRECTIONS[this.player.direction] ?? DIRECTIONS.down;
    return {
      x: Math.round((this.player.x + dir[0] * 70) / 16) * 16,
      y: Math.round((this.player.y + dir[1] * 70) / 16) * 16,
    };
  }
  canPlace(x, y) {
    const distance = Math.hypot(x - this.player.x, y - this.player.y);
    if (
      !this.placement ||
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      distance > 160 ||
      distance < 40 ||
      Math.abs(x) > WORLD_LIMIT ||
      Math.abs(y) > WORLD_LIMIT ||
      this.world.structures.length >= MAX_STRUCTURES
    )
      return false;
    const nearby = this.world.getEntities(
      { x: x - 40, y: y - 40, width: 80, height: 80 },
      this.elapsed,
    );
    const blocked = [...nearby.filter((e) => e.remaining > 0), ...this.world.structures].some(
      (e) => Math.hypot(x - e.x, y - e.y) < (this.placement === 'wall' ? 48 : 42),
    );
    if (blocked) return false;
    if (this.world.generationVersion >= 2) {
      const landmarks = this.world.landmarksNear(x, y, 95);
      if (landmarks.length) return false;
    }
    return true;
  }
  place(x, y) {
    if (this.dead || !this.placement || !this.inventory[this.placement]) return false;
    if (!this.canPlace(x, y)) {
      this.emit('deny', { x, y });
      this.emit('message', {
        text: 'Chọn vùng đất trống gần bạn, không sát chân hoặc vật cản. Tối đa 100 công trình.',
        tone: 'warning',
      });
      return false;
    }
    const type = this.placement;
    this.world.structures.push({ id: `built:${this.world.structures.length}`, type, x, y });
    this.inventory[type]--;
    if (type === 'campfire') this.stats.campfires++;
    if (type === 'chest') this.stats.chests++;
    this.placement = null;
    const texts = {
      campfire: 'Một đốm lửa. Một nơi để trở về.',
      chest: 'Rương gỗ. Đồ quý được cất giữ.',
      lantern: 'Đèn lồng tinh thể. Đêm bớt tối hơn.',
      wall: 'Đã dựng hàng rào.',
      workbench: 'Bàn chế tác. Từ đây, đồ nghề tốt hơn là chuyện nhỏ.',
      shelter: 'Lều trú. Mưa ngoài kia, còn bạn ở đây.',
      maptable: 'Bàn bản đồ. Khu rừng bắt đầu có hình dạng.',
      beacon: 'Đèn hiệu đã dựng. Nó đang chờ một ngọn lửa.',
      seat: 'Một chỗ ngồi nhỏ bên trại.',
      planter: 'Hoa rừng đã có một chỗ của riêng nó.',
      standingStone: 'Một viên đá đứng, đánh dấu nơi này.',
    };
    this.emit('build', { x, y, item: type, text: texts[type] ?? 'Đã dựng công trình.' });
    // The first fire becomes home automatically: "where is my home?" should
    // never be a puzzle for a new player.
    if (type === 'campfire' && !this.home) {
      this.home = { x, y };
      this.refreshCamp();
      this.emit('message', { text: 'Đây là nhà của bạn. La bàn sẽ nhớ nơi này.' });
    }
    const nearHome =
      !!this.home && Math.hypot(x - this.home.x, y - this.home.y) <= CAMP_RADIUS + 40;
    this.reportQuest('build', type, 1, { nearHome });
    return true;
  }
  // ---- survival tick ------------------------------------------------------
  updateSurvival(dt) {
    const p = this.player;
    const camp = this.campState();
    const day = getDayInfo(this.elapsed);
    const weather = this.weather();
    const campComfort = this.passive('camp_comfort') && camp.inside ? 0.88 : 1;
    const hungerScale = camp.bonuses.hungerDrain * campComfort;
    p.hunger = Math.max(0, p.hunger - dt * HUNGER_DRAIN_PER_SECOND * hungerScale);
    if (p.hunger <= 0) {
      const before = p.health;
      p.health = Math.max(0, p.health - dt * STARVATION_DAMAGE_PER_SECOND);
      if (before > 0 && p.health <= 0) this.pendingCause = 'đói';
    }
    if (p.hunger < 28 && !this.hints.hunger && this.elapsed > 8) {
      this.hints.hunger = true;
      this.emit('hint', { text: 'Bụng đang đói. Ăn một quả (phím F) trước khi đi tiếp.' });
    }
    if (camp.nearFire && p.hunger > FIRE_MIN_HUNGER)
      p.health = Math.min(100, p.health + dt * CAMPFIRE_HEAL_PER_SECOND);
    if (this.passive('sanctuary') && camp.nearShrine) p.health = Math.min(100, p.health + dt * 1.6);
    // Warmth: night, rain, mist and cold biomes pull it down; fire, shelter and
    // torch push it back up.
    const biome = this.biome();
    let drain = 0;
    if (day.nightFactor > 0.2) drain += WARMTH_DRAIN_NIGHT * day.nightFactor;
    if (weather.type === 'rain') drain += WARMTH_DRAIN_RAIN * weather.intensity;
    else if (weather.type === 'mist') drain += WARMTH_DRAIN_MIST * weather.intensity;
    if (biome === 'rocky' || biome === 'mistgrove') drain += 0.05;
    const event = this.worldEvent();
    if (event?.type === 'mistSurge') drain += 0.05;
    if (camp.inside) drain *= camp.bonuses.warmthDrain;
    p.warmth = clamp(p.warmth - dt * drain, 0, WARMTH_MAX);
    // `dawnkeeper` makes an established camp genuinely cosier, not just prettier.
    const warmthScale = this.passive('dawnkeeper') ? 1.35 : 1;
    if (camp.nearFire)
      p.warmth = Math.min(WARMTH_MAX, p.warmth + dt * WARMTH_FIRE_PER_SECOND * warmthScale);
    else if (camp.nearShelter)
      p.warmth = Math.min(WARMTH_MAX, p.warmth + dt * WARMTH_SHELTER_PER_SECOND * warmthScale);
    else if (this.torchLit)
      p.warmth = Math.min(WARMTH_MAX, p.warmth + dt * WARMTH_TORCH_PER_SECOND);
    if (this.passive('sanctuary') && camp.nearShrine)
      p.warmth = Math.min(WARMTH_MAX, p.warmth + dt * 1.2);
    if (p.warmth < WARMTH_COLD_THRESHOLD) {
      const before = p.health;
      const severity = 1 - p.warmth / WARMTH_COLD_THRESHOLD;
      p.health = Math.max(0, p.health - dt * WARMTH_COLD_HEALTH * severity);
      if (before > 0 && p.health <= 0 && !this.pendingCause) this.pendingCause = 'lạnh';
    }
    if (p.warmth < 32 && !this.hints.cold && this.elapsed > 8) {
      this.hints.cold = true;
      this.emit('hint', { text: 'Bạn đang lạnh. Lửa, lều hoặc đuốc sẽ sưởi ấm.' });
    }
    // Stamina regenerates whenever the player is not spending it.
    const sprinting = this.sprinting && (this.movementX || this.movementY);
    // `swift` gives back stamina faster and makes sprinting cheaper, so long
    // journeys stop being a stamina tax on the player who earned it.
    const swift = this.passive('swift');
    const regen = swift ? STAMINA_REGEN * 1.4 : STAMINA_REGEN;
    const sprintCost = swift ? SPRINT_STAMINA_PER_SECOND * 0.7 : SPRINT_STAMINA_PER_SECOND;
    p.stamina = clamp(p.stamina + dt * (sprinting ? -sprintCost : regen), 0, STAMINA_MAX);
  }
  update(dt, movement = { x: 0, y: 0 }) {
    if (this.dead || !Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 0.05); // Returning to a hidden tab cannot starve or teleport the player.
    this.elapsed += dt;
    this.cooldown = Math.max(0, this.cooldown - dt);
    const p = this.player;
    p.swing = Math.max(0, p.swing - dt);
    p.dodge = Math.max(0, p.dodge - dt);
    if (this.elapsed >= this.campAt) {
      this.refreshCamp();
      this.campAt = this.elapsed + 0.25;
    }
    this.updateSurvival(dt);
    const day = getDayInfo(this.elapsed);
    const night = day.isNight;
    if (night && !this.wasNight) {
      this.stats.nights += 1;
      if (this.home && Math.hypot(p.x - this.home.x, p.y - this.home.y) > 500)
        this.reportQuest('nightsAway', 'any', 1);
      this.emit('nightfall', { text: this.nightfallText() });
    } else if (!night && this.wasNight && this.elapsed > 30) {
      this.emit('dawn', { text: 'Bình minh. Bóng đêm tan, khu rừng lại mở lối.' });
    }
    // Dusk is the decision, not the punishment: one quiet warning before night.
    if (!night && day.phase >= 0.44 && day.phase < 0.5 && this.duskDay !== day.day) {
      this.duskDay = day.day;
      this.emit('dusk', {
        text: this.home
          ? 'Hoàng hôn đang buông. La bàn còn nhớ đường về nhà.'
          : 'Hoàng hôn đang buông. Một lửa trại sẽ là chỗ để quay về khi trời tối.',
      });
    }
    this.wasNight = night;
    this.noteWorld();
    if (p.health <= 0) {
      this.die(
        this.pendingCause ||
          (p.hunger <= 0 ? 'đói' : p.warmth < WARMTH_COLD_THRESHOLD ? 'lạnh' : 'kiệt sức'),
      );
      return;
    }
    let { x: dx, y: dy } = movement;
    const length = Math.hypot(dx, dy);
    if (length > 1) {
      dx /= length;
      dy /= length;
    }
    this.movementX = dx;
    this.movementY = dy;
    if (dx || dy)
      p.direction =
        Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
    const oldX = p.x,
      oldY = p.y;
    if (p.dodge > 0 && p.dodgeX !== undefined) {
      // A dodge is a short, committed slide — not a second walking speed.
      const dodgeStep = DODGE_SPEED * dt * (p.dodge / DODGE_DURATION);
      const nx = p.x + p.dodgeX * dodgeStep;
      const ny = p.y + p.dodgeY * dodgeStep;
      if (this.world.canMove(p.x, p.y, nx, p.y, this.elapsed)) p.x = nx;
      if (this.world.canMove(p.x, p.y, p.x, ny, this.elapsed)) p.y = ny;
    } else if (dx || dy) {
      const sprinting = this.sprinting && p.stamina > 1;
      const speed = PLAYER_SPEED * (sprinting ? SPRINT_MULTIPLIER : 1);
      // Axis-separated substeps prevent tunnelling through narrow trunks and fences.
      const steps = Math.max(1, Math.ceil((speed * dt) / 5));
      for (let i = 0; i < steps; i++) {
        const x = p.x + (dx * speed * dt) / steps;
        if (dx && this.world.canMove(p.x, p.y, x, p.y, this.elapsed)) p.x = x;
        const y = p.y + (dy * speed * dt) / steps;
        if (dy && this.world.canMove(p.x, p.y, p.x, y, this.elapsed)) p.y = y;
      }
    }
    p.moving = p.x !== oldX || p.y !== oldY;
    const moved = Math.hypot(p.x - oldX, p.y - oldY);
    this.stats.distance += moved;
    p.animation = p.moving ? p.animation + dt : 0;
    p.frame = p.moving ? Math.floor(p.animation * 8) % 8 : 0;
    if (p.moving) {
      this.stepAcc += moved;
      if (this.stepAcc > 64) {
        this.stepAcc = 0;
        this.emit('step', { x: p.x, y: p.y, surface: this.biome() });
      }
    } else this.stepAcc = 0;
    this.markExplored();
    this.checkDiscoveries();
    this.trackTravel();
    this.updateEncounter();
    this.enemies.update(dt);
    if (this.dead) return;
    if (this.openChest && !this.nearChest()) this.openChest = false;
    if (this.elapsed >= this.pruneAt) {
      this.world.prune(this.elapsed);
      this.pruneAt = this.elapsed + 1;
    }
  }
  nightfallText() {
    const away =
      this.home &&
      Math.hypot(this.player.x - this.home.x, this.player.y - this.home.y) > CAMP_RADIUS;
    if (!this.home) return 'Đêm đã xuống. Một lửa trại sẽ là chỗ để quay về — và để sưởi ấm.';
    if (away) return 'Đêm đã xuống. La bàn chỉ về nhà. Trong trại, rừng không săn bạn.';
    return 'Đêm đã xuống. Lửa nhà đang giữ bạn. Ra ngoài là một lựa chọn.';
  }
  /**
   * World moods are announced once per band. A save loaded in the middle of one
   * does not repeat the toast — the band is already the weather, not news.
   */
  noteWorld() {
    const event = this.worldEvent();
    const id = event?.id ?? '';
    if (id === this.seenEvent) return;
    const first = this.seenEvent === undefined;
    this.seenEvent = id;
    if (!event || (first && event.progress > 0.08)) return;
    this.emit('worldMood', { text: `${event.label}. ${event.note}` });
  }
  /** Biome variety and longest distance travelled drive several objectives. */
  trackTravel() {
    const biome = this.biome();
    if (!this.biomes.has(biome)) {
      this.biomes.add(biome);
      this.reportQuest('biomes', biome, 1);
    }
    const distance = Math.hypot(this.player.x, this.player.y);
    if (distance > this.maxDistance + 1) {
      this.maxDistance = distance;
      this.reportQuest('distance', 'any', Math.floor(distance));
    }
  }
  /** The ancient grove is guarded. Walking in wakes its keeper — once. */
  updateEncounter() {
    const grove = this.world.grove?.();
    if (!grove || this.flags.groveCleared) return;
    if (this.elapsed < this.enemyCheckAt) return;
    this.enemyCheckAt = this.elapsed + 0.5;
    const distance = Math.hypot(this.player.x - grove.x, this.player.y - grove.y);
    if (distance > 780) return;
    const keeper = this.enemies.spawnGroveKeeper(grove);
    if (keeper && !this.flags.keeperSeen) {
      this.flags.keeperSeen = true;
      this.emit('eliteAwake', {
        name: keeper.name,
        x: keeper.x,
        y: keeper.y,
        text: 'Người giữ rừng cổ đã thức giấc.',
      });
    }
  }
  goals() {
    const hasLantern =
      this.inventory.lantern > 0 ||
      this.world.structures.some((s) => s.type === 'lantern') ||
      this.inventory.salve > 0;
    return [
      {
        label: 'Hái quả mọng đầu tiên',
        hint: 'Đến gần bụi quả và nhấn E',
        done: this.stats.berries > 0,
      },
      {
        label: 'Nhặt 4 gỗ và 2 đá',
        hint: 'Tìm cành khô và đá cuội',
        done: this.stats.wood >= 4 && this.stats.stone >= 2,
      },
      {
        label: 'Chế tạo một chiếc rìu',
        hint: 'Nhấn C để mở bàn chế tạo',
        done: this.inventory.axe > 0,
      },
      {
        label: 'Thắp lửa trại đầu tiên',
        hint: 'Chế tạo lửa trại, nhấn 4 để đặt',
        done: this.stats.campfires > 0,
      },
      {
        label: 'Nướng một quả bên lửa',
        hint: 'Đứng gần lửa, còn quả, nhấn E',
        done: this.stats.cooked > 0,
      },
      {
        label: 'Dựng một chiếc rương',
        hint: 'Chế tạo rương gỗ rồi đặt gần nhà',
        done: this.stats.chests > 0,
      },
      {
        label: 'Đánh dấu nhà trên la bàn',
        hint: 'Gần lửa, nhấn E khi hết quả hoặc H',
        done: !!this.home,
      },
      {
        label: 'Tìm nấm, thảo mộc hoặc tinh thể',
        hint: 'Đi xa hơn, để ý rừng sâu và đất đá',
        done: this.stats.mushrooms + this.stats.herbs + this.stats.crystals > 0,
      },
      {
        label: 'Chế cao dán hoặc đèn lồng',
        hint: 'Mở Chế tạo khi đã có nguyên liệu mới',
        done: hasLantern,
      },
      {
        label: 'Khám phá một địa danh',
        hint: 'Đi theo những dấu hiệu lạ trong rừng',
        done: this.stats.landmarks > 0,
      },
      {
        label: 'Sống qua một chu kỳ 24 phút',
        hint: 'Ăn uống đầy đủ, giữ lửa khi đêm xuống',
        done: this.elapsed >= DAY_LENGTH,
      },
    ];
  }
  snapshot() {
    const { x, y, health, hunger, warmth, stamina, direction } = this.player;
    return {
      version: SAVE_VERSION,
      savedAt: Date.now(),
      elapsed: this.elapsed,
      player: {
        x,
        y,
        health,
        hunger,
        warmth: clamp(warmth, 0, WARMTH_MAX),
        stamina: clamp(stamina, 0, STAMINA_MAX),
        direction,
      },
      inventory: { ...this.inventory },
      stats: { ...this.stats, explored: this.explored.size },
      torchLit: this.torchLit,
      home: this.home ? { ...this.home } : null,
      chest: { ...this.chest },
      explored: [...this.explored],
      discovered: [...this.discovered],
      quests: this.quests.serialize(),
      flags: { ...this.flags },
      journeyComplete: this.journeyComplete,
      hints: { ...this.hints },
      world: this.world.serialize(this.elapsed),
    };
  }
  static restore(data) {
    const game = new Game(data.world.seed);
    game.elapsed = data.elapsed;
    Object.assign(game.player, data.player);
    game.player.warmth = Number.isFinite(data.player.warmth) ? data.player.warmth : WARMTH_MAX;
    game.player.stamina = Number.isFinite(data.player.stamina) ? data.player.stamina : STAMINA_MAX;
    game.player.swing = 0;
    game.player.dodge = 0;
    game.inventory = { ...emptyItems(), ...data.inventory };
    game.stats = { ...emptyStats(), ...data.stats };
    game.torchLit = data.torchLit && game.inventory.torch > 0;
    game.home = data.home ? { ...data.home } : null;
    game.chest = { ...emptyItems(), ...data.chest };
    game.explored = new Set(data.explored?.length ? data.explored : ['0,0']);
    game.stats.explored = game.explored.size;
    game.discovered = new Set(Array.isArray(data.discovered) ? data.discovered : []);
    game.discoverAt = 0;
    game.stats.landmarks = game.discovered.size;
    game.world = new World(
      data.world.seed,
      data.world.changes,
      data.world.structures,
      data.world.generationVersion ?? WORLD_GEN_VERSION,
    );
    game.world.prune(game.elapsed);
    game.dead = game.player.health <= 0;
    game.pruneAt = game.elapsed + 1;
    game.wasNight = getDayInfo(game.elapsed).isNight;
    game.quests = QuestLog.restore(data.quests);
    game.flags = {
      groveCleared: false,
      beaconLit: false,
      groveRevealed: false,
      keeperSeen: false,
      ...(data.flags && typeof data.flags === 'object' ? data.flags : {}),
    };
    game.journeyComplete = !!data.journeyComplete || game.quests.journeyComplete();
    game.hints = { combat: false, cold: false, hunger: false };
    if (data.hints && typeof data.hints === 'object') {
      for (const key of ['combat', 'cold', 'hunger'])
        if (data.hints[key] === true) game.hints[key] = true;
    }
    game.biomes = new Set([game.biome()]);
    game.maxDistance = Math.hypot(game.player.x, game.player.y);
    game.campInfo = null;
    game.campAt = 0;
    game.refreshCamp();
    game.quests.sync();
    return game;
  }
}

export { ENEMIES };
