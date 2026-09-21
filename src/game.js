import {
  BERRY_HEALTH,
  BERRY_HUNGER,
  CAMPFIRE_HEAL_PER_SECOND,
  CAMPFIRE_HEAL_RADIUS,
  CHUNK_SIZE,
  COOKED_HEALTH,
  COOKED_HUNGER,
  DAY_LENGTH,
  DISCOVERY_RADIUS,
  FIRE_MIN_HUNGER,
  HUNGER_DRAIN_PER_SECOND,
  INTERACTION_DISTANCE,
  ITEMS,
  LANDMARKS,
  MAX_DISCOVERIES,
  MAX_EXPLORED,
  MAX_STACK,
  MAX_STRUCTURES,
  MUSHROOM_HEALTH,
  MUSHROOM_HUNGER,
  PLACEABLE,
  PLAYER_SPEED,
  RECIPES,
  RESOURCES,
  SALVE_HEALTH,
  SAVE_VERSION,
  STARVATION_DAMAGE_PER_SECOND,
  WORLD_GEN_VERSION,
  WORLD_LIMIT,
  emptyItems,
  emptyStats,
  getDayInfo,
  getWeather,
} from './config.js';
import { World } from './world.js';
import { CombatSystem } from './combat.js';
import {
  CAMP_LEVELS,
  QUESTS,
  activeQuest,
  createProgression,
  sanitizeProgression,
} from './progression.js';

export class Game {
  constructor(seed = (Math.random() * 0xffffffff) >>> 0) {
    this.world = new World(seed);
    this.elapsed = 0; // Monotonic simulation time. The day/night clock is only a view.
    this.player = {
      x: 0,
      y: 0,
      health: 100,
      hunger: 100,
      direction: 'down',
      moving: false,
      frame: 0,
      animation: 0,
    };
    this.inventory = { ...emptyItems(), berry: 3 };
    this.chest = emptyItems();
    this.stats = emptyStats();
    this.torchLit = false;
    this.placement = null;
    this.cooldown = 0;
    this.events = [];
    this.dead = false;
    this.pruneAt = 1;
    this.home = null;
    this.explored = new Set(['0,0']);
    this.stats.explored = 1;
    this.openChest = false;
    this.discovered = new Set();
    this.stepAcc = 0;
    this.wasNight = getDayInfo(0).isNight;
    this.discoverAt = 0;
    this.camp = { level: 1 };
    this.progression = createProgression();
    this.combat = new CombatSystem(this.world.seed);
    this.questCheckAt = 0;
  }
  emit(type, data = {}) {
    if (this.events.length > 200) this.events.shift();
    this.events.push({ type, ...data });
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
  weather() {
    return getWeather(this.elapsed, this.world.seed);
  }
  biome() {
    return this.world.biomeAt(this.player.x, this.player.y);
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
  markExplored() {
    const key = `${Math.floor(this.player.x / CHUNK_SIZE)},${Math.floor(this.player.y / CHUNK_SIZE)}`;
    if (this.explored.has(key) || this.explored.size >= MAX_EXPLORED) return;
    this.explored.add(key);
    this.stats.explored = this.explored.size;
  }
  compass() {
    if (!this.home) return null;
    let target = this.home;
    let label = 'home';
    if (this.camp.level >= 3 && !this.progression.guardianDefeated) {
      const angle = (this.world.seed % 628) / 100;
      target = { x: this.home.x + Math.cos(angle) * 1450, y: this.home.y + Math.sin(angle) * 1450 };
      label = 'guardian';
    }
    const dx = target.x - this.player.x,
      dy = target.y - this.player.y;
    return { distance: Math.hypot(dx, dy), angle: Math.atan2(dx, -dy), label };
  }
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
    }
  }
  update(dt, movement = { x: 0, y: 0 }) {
    if (this.dead || !Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 0.05); // Returning to a hidden tab cannot starve or teleport the player.
    this.elapsed += dt;
    this.cooldown = Math.max(0, this.cooldown - dt);
    const p = this.player;
    p.hunger = Math.max(0, p.hunger - dt * HUNGER_DRAIN_PER_SECOND);
    if (p.hunger <= 0) p.health = Math.max(0, p.health - dt * STARVATION_DAMAGE_PER_SECOND);
    const byFire = !!this.nearCampfire();
    if (byFire && p.hunger > FIRE_MIN_HUNGER)
      p.health = Math.min(100, p.health + dt * CAMPFIRE_HEAL_PER_SECOND);
    const night = getDayInfo(this.elapsed).isNight;
    if (night && !this.wasNight) this.stats.nights += 1;
    this.wasNight = night;
    if (p.health <= 0) {
      this.dead = true;
      this.placement = null;
      this.openChest = false;
      this.emit('death');
      return;
    }
    let { x: dx, y: dy } = movement;
    const length = Math.hypot(dx, dy);
    if (length > 1) {
      dx /= length;
      dy /= length;
    }
    if (dx || dy)
      p.direction =
        Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
    const oldX = p.x,
      oldY = p.y;
    // Axis-separated substeps prevent tunnelling through narrow trunks and fences.
    const steps = Math.max(1, Math.ceil((PLAYER_SPEED * dt) / 5));
    for (let i = 0; i < steps; i++) {
      const x = p.x + (dx * PLAYER_SPEED * dt) / steps;
      if (dx && this.world.canMove(p.x, p.y, x, p.y, this.elapsed)) p.x = x;
      const y = p.y + (dy * PLAYER_SPEED * dt) / steps;
      if (dy && this.world.canMove(p.x, p.y, p.x, y, this.elapsed)) p.y = y;
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
    this.combat.update(this, dt);
    if (this.elapsed >= this.questCheckAt) {
      this.questCheckAt = this.elapsed + 0.25;
      this.checkQuests();
    }
    if (this.openChest && !this.nearChest()) this.openChest = false;
    if (this.elapsed >= this.pruneAt) {
      this.world.prune(this.elapsed);
      this.pruneAt = this.elapsed + 1;
    }
  }
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
    // Important interactions win over distant decor: a chest at your feet beats
    // a berry bush a few steps away.
    const chest = this.nearChest();
    if (chest) return { kind: 'chest', entity: chest };
    const resource = this.getTarget();
    if (resource) return { kind: 'resource', entity: resource };
    const fire = this.nearCampfire(INTERACTION_DISTANCE);
    if (fire) return { kind: 'campfire', entity: fire };
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
      target.type === 'tree' || target.type === 'branch'
        ? 'wood'
        : target.type === 'rock' || target.type === 'pebble'
          ? 'stone'
          : target.type === 'mushroom'
            ? 'mushroom'
            : target.type === 'herb'
              ? 'herb'
              : target.type === 'crystal'
                ? 'crystal'
                : 'berry';
    const quantity = ['tree', 'rock'].includes(target.type)
      ? 5
      : ['bush', 'mushroom', 'herb', 'crystal'].includes(target.type)
        ? 1
        : 2;
    if (this.inventory[reward] + quantity > MAX_STACK) {
      this.emit('deny', { x: target.x, y: target.y });
      this.emit('message', { text: `${ITEMS[reward].name} đã đầy.`, tone: 'warning' });
      return false;
    }
    const state = this.world.consume(target, this.elapsed);
    if (!state) return false;
    let text =
      target.type === 'tree' ? 'Chặt cây' : target.type === 'rock' ? 'Khai thác đá' : 'Thu thập';
    if (['bush', 'mushroom', 'herb', 'crystal'].includes(target.type) || state.remaining === 0) {
      const added = this.addItem(reward, quantity);
      if (reward === 'berry') {
        this.stats.berries += added;
        this.addItem('fiber', 1);
      } else if (reward === 'mushroom') this.stats.mushrooms += added;
      else if (reward === 'herb') {
        this.stats.herbs += added;
        this.addItem('fiber', 1);
      } else if (reward === 'crystal') this.stats.crystals += added;
      else this.stats[reward] += added;
      text = `+${added} ${ITEMS[reward].name.toLowerCase()}`;
      if (reward === 'berry' || reward === 'herb') text += ' · +1 sợi';
    }
    this.emit('gather', { x: target.x, y: target.y, text, item: reward });
    return true;
  }
  attack() {
    return this.combat.attack(this);
  }
  currentQuest() {
    const quest = activeQuest(this);
    return {
      id: quest.id,
      title: quest.title,
      description: quest.description,
      progress: quest.progress(this),
      done: this.progression.completed.includes(quest.id),
    };
  }
  checkQuests() {
    // Journey quests unlock in order. Rewards are committed in the same
    // synchronous transaction as completion, so rapid input/reload cannot claim twice.
    const quest = QUESTS.find((q) => !this.progression.completed.includes(q.id));
    if (!quest || !quest.test(this)) return false;
    const reward = Object.entries(quest.reward ?? {});
    if (reward.some(([item, count]) => this.inventory[item] > MAX_STACK - count)) return false;
    this.progression.completed.push(quest.id);
    if (!this.progression.claimed.includes(quest.id)) {
      for (const [item, count] of reward) this.inventory[item] += count;
      this.progression.claimed.push(quest.id);
    }
    this.emit('quest', { quest: quest.id, text: `Hoàn thành: ${quest.title}` });
    return true;
  }
  campUpgradeInfo() {
    const next = CAMP_LEVELS.find((entry) => entry.level === this.camp.level + 1);
    return { current: CAMP_LEVELS[this.camp.level - 1], next: next ?? null };
  }
  canUpgradeCamp() {
    const next = this.campUpgradeInfo().next;
    if (
      !next ||
      !this.home ||
      Math.hypot(this.player.x - this.home.x, this.player.y - this.home.y) > 150
    )
      return false;
    return Object.entries(next.costs).every(([id, count]) => this.inventory[id] >= count);
  }
  upgradeCamp() {
    const next = this.campUpgradeInfo().next;
    if (!next) {
      this.emit('message', { text: 'Căn trại đã đạt cấp cao nhất.' });
      return false;
    }
    if (!this.home || Math.hypot(this.player.x - this.home.x, this.player.y - this.home.y) > 150) {
      this.emit('message', { text: 'Hãy trở về gần lửa trại để nâng cấp.', tone: 'warning' });
      return false;
    }
    if (!this.canUpgradeCamp()) {
      this.emit('message', { text: 'Chưa đủ vật liệu cho lần nâng cấp này.', tone: 'warning' });
      return false;
    }
    for (const [id, count] of Object.entries(next.costs)) this.inventory[id] -= count;
    this.camp.level = next.level;
    this.emit('campUpgrade', {
      x: this.home.x,
      y: this.home.y,
      text: `${next.name} đã hoàn thành · ${next.benefit}`,
    });
    this.checkQuests();
    return true;
  }
  eat(item = 'berry') {
    if (this.dead) return false;
    const foods = {
      berry: { hunger: BERRY_HUNGER, health: BERRY_HEALTH, id: 'berry' },
      cooked: { hunger: COOKED_HUNGER, health: COOKED_HEALTH, id: 'cooked' },
      mushroom: { hunger: MUSHROOM_HUNGER, health: MUSHROOM_HEALTH, id: 'mushroom' },
      salve: { hunger: 0, health: SALVE_HEALTH, id: 'salve' },
    };
    const food = foods[item] ?? foods.berry;
    if (!this.inventory[food.id]) {
      const hints = {
        berry: 'Hết quả rồi. Tìm một bụi quả mọng nhé.',
        cooked: 'Chưa có quả nướng. Đứng gần lửa và nhấn E khi còn quả mọng.',
        mushroom: 'Chưa có nấm. Tìm nơi ẩm thấp trong rừng sâu hoặc rừng sương.',
        salve: 'Chưa có cao dán. Chế từ 2 nấm và 1 thảo mộc.',
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
    this.player.health = Math.min(100, this.player.health + food.health);
    this.emit('eat', {
      text:
        food.id === 'salve' ? `+${food.health} máu` : `+${food.hunger} no · +${food.health} máu`,
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
  canCraft(id) {
    const recipe = RECIPES.find((r) => r.id === id);
    return (
      !!recipe &&
      !this.dead &&
      (!recipe.unique || this.inventory[id] === 0) &&
      this.inventory[id] < MAX_STACK &&
      (!recipe.campLevel || this.camp.level >= recipe.campLevel) &&
      Object.entries(recipe.costs).every(([item, count]) => this.inventory[item] >= count)
    );
  }
  craft(id) {
    if (!this.canCraft(id)) return false;
    const recipe = RECIPES.find((r) => r.id === id);
    for (const [item, count] of Object.entries(recipe.costs)) this.inventory[item] -= count;
    this.inventory[id]++;
    this.stats.crafted++;
    if (id === 'torch') this.torchLit = true;
    this.emit('craft', { item: id, text: `Đã chế tạo ${ITEMS[id].name.toLowerCase()}` });
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
    const dir = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[this.player.direction];
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
    };
    this.emit('build', { x, y, item: type, text: texts[type] ?? 'Đã dựng công trình.' });
    return true;
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
    const { x, y, health, hunger, direction } = this.player;
    return {
      version: SAVE_VERSION,
      savedAt: Date.now(),
      elapsed: this.elapsed,
      player: { x, y, health, hunger, direction },
      inventory: { ...this.inventory },
      stats: { ...this.stats, explored: this.explored.size },
      torchLit: this.torchLit,
      home: this.home ? { ...this.home } : null,
      chest: { ...this.chest },
      explored: [...this.explored],
      discovered: [...this.discovered],
      camp: { level: this.camp.level },
      progression: {
        ...this.progression,
        completed: [...this.progression.completed],
        claimed: [...this.progression.claimed],
      },
      combat: this.combat.snapshot(this.elapsed),
      world: this.world.serialize(this.elapsed),
    };
  }
  static restore(data) {
    const game = new Game(data.world.seed);
    game.elapsed = data.elapsed;
    Object.assign(game.player, data.player);
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
    game.camp = { level: Math.max(1, Math.min(3, data.camp?.level ?? 1)) };
    game.progression = sanitizeProgression(data.progression);
    game.combat = new CombatSystem(game.world.seed, data.combat);
    game.dead = game.player.health <= 0;
    game.pruneAt = game.elapsed + 1;
    game.wasNight = getDayInfo(game.elapsed).isNight;
    return game;
  }
}
