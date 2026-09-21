import { getDayInfo } from './config.js';
import { hash } from './world.js';

export const ENEMY_TYPES = {
  stalker: {
    name: 'Kẻ Rình Lá',
    health: 34,
    speed: 72,
    damage: 9,
    range: 30,
    notice: 220,
    windup: 0.55,
  },
  guardian: {
    name: 'Hộ Vệ Đá',
    health: 72,
    speed: 42,
    damage: 16,
    range: 38,
    notice: 190,
    windup: 0.9,
  },
  wisp: {
    name: 'Bóng Đêm',
    health: 24,
    speed: 88,
    damage: 8,
    range: 27,
    notice: 250,
    windup: 0.45,
  },
  ancient: {
    name: 'Hộ Vệ Cổ',
    health: 210,
    speed: 48,
    damage: 20,
    range: 45,
    notice: 320,
    windup: 1.05,
  },
};

const safeNumber = (n, fallback = 0) => (Number.isFinite(n) ? n : fallback);
export class CombatSystem {
  constructor(seed, saved = {}) {
    this.seed = seed >>> 0;
    this.enemies = [];
    this.kills = Number.isInteger(saved.kills) ? Math.max(0, saved.kills) : 0;
    this.defeated = new Map(
      Array.isArray(saved.defeated)
        ? saved.defeated
            .filter((e) => e && typeof e.id === 'string' && Number.isFinite(e.until))
            .slice(-80)
            .map((e) => [e.id, e.until])
        : [],
    );
    this.attackCooldown = 0;
    this.playerIFrames = 0;
    this.tick = 0;
    this.spawnTick = 0;
  }
  snapshot(elapsed) {
    return {
      kills: this.kills,
      defeated: [...this.defeated]
        .filter(([, until]) => until > elapsed)
        .slice(-80)
        .map(([id, until]) => ({ id, until })),
    };
  }
  safeRadius(game) {
    return game.camp.level >= 2 ? 250 : 175;
  }
  spawn(game) {
    if (!game.home || game.stats.campfires < 1) return;
    const p = game.player;
    const cx = Math.floor(p.x / 420),
      cy = Math.floor(p.y / 420);
    const day = getDayInfo(game.elapsed);
    const distanceHome = Math.hypot(p.x - game.home.x, p.y - game.home.y);
    if (distanceHome < this.safeRadius(game) + 100) return;
    const candidates = [];
    for (let oy = -1; oy <= 1; oy++)
      for (let ox = -1; ox <= 1; ox++) {
        const x = cx + ox,
          y = cy + oy;
        const h = hash(this.seed ^ 0x51c0b47, x, y);
        if (h % 100 >= (day.isNight ? 34 : 18)) continue;
        const id = `enemy:${x},${y}`;
        if (this.defeated.get(id) > game.elapsed || this.enemies.some((e) => e.id === id)) continue;
        const angle = ((h >>> 8) % 628) / 100;
        const radius = 180 + ((h >>> 18) % 130);
        const ex = x * 420 + 210 + Math.cos(angle) * radius * 0.25;
        const ey = y * 420 + 210 + Math.sin(angle) * radius * 0.25;
        const d = Math.hypot(ex - p.x, ey - p.y);
        if (
          d < 150 ||
          d > 620 ||
          Math.hypot(ex - game.home.x, ey - game.home.y) < this.safeRadius(game)
        )
          continue;
        let type =
          day.isNight && h % 3 === 0
            ? 'wisp'
            : game.world.biomeAt(ex, ey) === 'rocky'
              ? 'guardian'
              : 'stalker';
        candidates.push({ id, type, x: ex, y: ey, h });
      }
    // The culmination is one deterministic elite, only after the beacon is lit.
    if (game.camp.level >= 3 && !game.progression.guardianDefeated) {
      const angle = (this.seed % 628) / 100;
      const ex = game.home.x + Math.cos(angle) * 1450;
      const ey = game.home.y + Math.sin(angle) * 1450;
      if (
        Math.hypot(ex - p.x, ey - p.y) < 650 &&
        !this.enemies.some((e) => e.id === 'enemy:ancient')
      )
        candidates.push({ id: 'enemy:ancient', type: 'ancient', x: ex, y: ey, h: this.seed });
    }
    for (const c of candidates.slice(0, Math.max(0, 7 - this.enemies.length))) {
      const def = ENEMY_TYPES[c.type];
      this.enemies.push({
        ...c,
        health: def.health,
        maxHealth: def.health,
        state: 'idle',
        timer: 0,
        hitFlash: 0,
      });
    }
  }
  attack(game) {
    if (game.dead || this.attackCooldown > 0) return false;
    this.attackCooldown = game.inventory.refinedBlade ? 0.42 : 0.58;
    const dir = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[game.player.direction];
    const damage = game.inventory.refinedBlade ? 24 : game.inventory.axe ? 15 : 9;
    let hits = 0;
    for (const enemy of this.enemies) {
      const dx = enemy.x - game.player.x,
        dy = enemy.y - game.player.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 68 || (dx * dir[0] + dy * dir[1]) / Math.max(1, distance) < 0.15) continue;
      enemy.health -= damage;
      enemy.hitFlash = 0.14;
      enemy.state = 'chase';
      enemy.timer = 0;
      hits++;
      game.emit('hit', { x: enemy.x, y: enemy.y, text: `−${damage}` });
    }
    game.emit('attack', {
      x: game.player.x,
      y: game.player.y,
      direction: game.player.direction,
      hit: hits > 0,
    });
    return true;
  }
  update(game, dt) {
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.playerIFrames = Math.max(0, this.playerIFrames - dt);
    this.spawnTick -= dt;
    if (this.spawnTick <= 0) {
      this.spawnTick = 1.25;
      this.spawn(game);
    }
    this.tick -= dt;
    if (this.tick > 0) return;
    const step = 0.1;
    this.tick = step;
    const p = game.player;
    for (const e of this.enemies) {
      const def = ENEMY_TYPES[e.type];
      e.timer = Math.max(0, e.timer - step);
      e.hitFlash = Math.max(0, e.hitFlash - step);
      const dx = p.x - e.x,
        dy = p.y - e.y,
        d = Math.hypot(dx, dy);
      const homeDistance = game.home ? Math.hypot(e.x - game.home.x, e.y - game.home.y) : Infinity;
      if (homeDistance < this.safeRadius(game)) e.state = 'retreat';
      else if (e.state === 'windup') {
        if (e.timer <= 0) {
          if (d <= def.range + 12 && this.playerIFrames <= 0) {
            p.health = Math.max(0, p.health - def.damage);
            this.playerIFrames = 0.8;
            game.emit('playerHit', { x: p.x, y: p.y, text: `−${def.damage} máu`, enemy: e.type });
          }
          e.state = 'chase';
          e.timer = 0.55;
        }
      } else if (d <= def.range && e.timer <= 0) {
        e.state = 'windup';
        e.timer = def.windup;
        game.emit('telegraph', { x: e.x, y: e.y, enemy: e.type });
      } else if (d < def.notice || e.state === 'chase') {
        e.state = 'chase';
        if (d > def.range * 0.8 && d > 0) {
          const nx = e.x + (dx / d) * def.speed * step,
            ny = e.y + (dy / d) * def.speed * step;
          if (!game.world.isBlocked(nx, ny, game.elapsed, 10)) {
            e.x = nx;
            e.y = ny;
          }
        }
      } else e.state = 'idle';
      if (e.state === 'retreat' && game.home) {
        const rx = e.x - game.home.x,
          ry = e.y - game.home.y,
          rd = Math.max(1, Math.hypot(rx, ry));
        e.x += (rx / rd) * def.speed * step;
        e.y += (ry / rd) * def.speed * step;
      }
    }
    for (const e of this.enemies.filter((enemy) => enemy.health <= 0)) {
      this.kills++;
      this.defeated.set(e.id, e.type === 'ancient' ? Number.MAX_SAFE_INTEGER : game.elapsed + 300);
      let shard =
        e.type === 'guardian' || e.type === 'ancient' || hash(this.seed, this.kills, 17) % 2 === 0;
      if (shard) {
        game.addItem('guardianShard', 1);
        game.progression.fragmentsFound++;
      }
      if (e.type === 'ancient') game.progression.guardianDefeated = true;
      game.emit('enemyDeath', {
        x: e.x,
        y: e.y,
        enemy: e.type,
        text: `${defName(e.type)} tan vào rừng${shard ? ' · +1 mảnh hộ vệ' : ''}`,
      });
    }
    this.enemies = this.enemies.filter(
      (e) => e.health > 0 && Math.hypot(e.x - p.x, e.y - p.y) < 900,
    );
    for (const [id, until] of this.defeated) if (until <= game.elapsed) this.defeated.delete(id);
  }
}
const defName = (type) => ENEMY_TYPES[type]?.name ?? 'Sinh vật';
