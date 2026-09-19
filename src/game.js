import {
  DAY_LENGTH,
  ITEMS,
  RECIPES,
  RESOURCES,
  PLAYER_SPEED,
  INTERACTION_DISTANCE,
  MAX_STACK,
  MAX_STRUCTURES,
  SAVE_VERSION,
  WORLD_LIMIT,
  clamp,
} from './config.js';
import { World } from './world.js';

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
    this.inventory = Object.fromEntries(
      Object.keys(ITEMS).map((key) => [key, key === 'berry' ? 3 : 0]),
    );
    this.stats = { berries: 0, wood: 0, stone: 0, crafted: 0, campfires: 0, distance: 0 };
    this.torchLit = false;
    this.placement = null;
    this.cooldown = 0;
    this.events = [];
    this.dead = false;
    this.pruneAt = 1;
  }
  emit(type, data = {}) {
    this.events.push({ type, ...data });
  }
  drainEvents() {
    return this.events.splice(0);
  }
  addItem(item, count) {
    const added = Math.min(count, MAX_STACK - this.inventory[item]);
    this.inventory[item] += added;
    return added;
  }
  update(dt, movement = { x: 0, y: 0 }) {
    if (this.dead || !Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 0.05); // Returning to a hidden tab cannot starve or teleport the player.
    this.elapsed += dt;
    this.cooldown = Math.max(0, this.cooldown - dt);
    const p = this.player;
    p.hunger = Math.max(0, p.hunger - dt * 0.22);
    if (p.hunger <= 0) p.health = Math.max(0, p.health - dt * 3);
    const byFire = this.world.structures.some(
      (s) => s.type === 'campfire' && Math.hypot(p.x - s.x, p.y - s.y) < 100,
    );
    if (byFire && p.hunger > 20) p.health = Math.min(100, p.health + dt * 2.5);
    if (p.health <= 0) {
      this.dead = true;
      this.placement = null;
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
    this.stats.distance += Math.hypot(p.x - oldX, p.y - oldY);
    p.animation = p.moving ? p.animation + dt : 0;
    p.frame = p.moving ? Math.floor(p.animation * 8) % 8 : 0;
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
  interact() {
    if (this.dead || this.placement || this.cooldown > 0) return false;
    const target = this.getTarget();
    if (!target) return false;
    this.cooldown = 0.38;
    const tool = RESOURCES[target.type].tool;
    if (tool && !this.inventory[tool]) {
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
          : 'berry';
    const quantity = ['tree', 'rock'].includes(target.type) ? 5 : target.type === 'bush' ? 1 : 2;
    if (this.inventory[reward] + quantity > MAX_STACK) {
      this.emit('message', { text: `${ITEMS[reward].name} đã đầy.`, tone: 'warning' });
      return false;
    }
    const state = this.world.consume(target, this.elapsed);
    if (!state) return false;
    let text = target.type === 'tree' ? 'Chặt cây' : 'Khai thác đá';
    if (target.type === 'bush' || state.remaining === 0) {
      const added = this.addItem(reward, quantity);
      if (reward === 'berry') {
        this.stats.berries += added;
        this.addItem('fiber', 1);
      } else this.stats[reward] += added;
      text = `+${added} ${ITEMS[reward].name.toLowerCase()}`;
      if (reward === 'berry') text += ' · +1 sợi';
    }
    this.emit('gather', { x: target.x, y: target.y, text, item: reward });
    return true;
  }
  eat() {
    if (this.dead) return false;
    if (!this.inventory.berry) {
      this.emit('message', { text: 'Hết quả rồi. Tìm một bụi quả mọng nhé.', tone: 'warning' });
      return false;
    }
    if (this.player.hunger >= 100 && this.player.health >= 100) {
      this.emit('message', { text: 'Bạn vẫn đang no. Để dành quả cho lát nữa nhé.' });
      return false;
    }
    this.inventory.berry--;
    this.player.hunger = Math.min(100, this.player.hunger + 25);
    this.player.health = Math.min(100, this.player.health + 3);
    this.emit('eat', { text: '+25 no · +3 máu' });
    return true;
  }
  canCraft(id) {
    const recipe = RECIPES.find((r) => r.id === id);
    return (
      !!recipe &&
      !this.dead &&
      (!recipe.unique || this.inventory[id] === 0) &&
      this.inventory[id] < MAX_STACK &&
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
    if (!['campfire', 'wall'].includes(type) || !this.inventory[type] || this.dead) {
      this.emit('message', { text: 'Bạn cần chế tạo công trình này trước.', tone: 'warning' });
      return false;
    }
    this.placement = type;
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
    return ![...nearby.filter((e) => e.remaining > 0), ...this.world.structures].some(
      (e) => Math.hypot(x - e.x, y - e.y) < (this.placement === 'wall' ? 48 : 42),
    );
  }
  place(x, y) {
    if (this.dead || !this.placement || !this.inventory[this.placement]) return false;
    if (!this.canPlace(x, y)) {
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
    this.placement = null;
    this.emit('build', {
      x,
      y,
      item: type,
      text: type === 'campfire' ? 'Một đốm lửa. Một nơi để trở về.' : 'Đã dựng hàng rào.',
    });
    return true;
  }
  goals() {
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
        label: 'Sống qua một chu kỳ',
        hint: 'Đừng quên ăn quả bằng phím F',
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
      stats: { ...this.stats },
      torchLit: this.torchLit,
      world: this.world.serialize(this.elapsed),
    };
  }
  static restore(data) {
    const game = new Game(data.world.seed);
    game.elapsed = data.elapsed;
    Object.assign(game.player, data.player);
    game.inventory = { ...data.inventory };
    game.stats = { ...data.stats };
    game.torchLit = data.torchLit && game.inventory.torch > 0;
    game.world = new World(data.world.seed, data.world.changes, data.world.structures);
    game.world.prune(game.elapsed);
    game.dead = game.player.health <= 0;
    game.pruneAt = game.elapsed + 1;
    return game;
  }
}
