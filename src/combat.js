// Combat for Domeo 5.1.
//
// Design rules that the code below follows on purpose:
//   * Danger is readable: every real attack has a wind-up the player can see,
//     hear and step out of.
//   * Combat is a layer over exploration, not the point of the game: enemies
//     are rare, telegraphed, and every one of them can be walked away from.
//   * Bounded work: fixed 6 Hz AI ticks, a hard enemy cap, sleeping entities
//     outside the simulation radius and projectiles that always expire.
//
// Nothing here touches the DOM, so the state machine is directly testable from
// Node (see tests/combat.test.js).
import {
  ENEMY_AI_INTERVAL,
  ENEMY_LEASH_DISTANCE,
  ENEMY_SLEEP_DISTANCE,
  HIT_INVULNERABILITY,
  MAX_ENEMIES,
  MAX_PROJECTILES,
  SPAWN_GRACE_SECONDS,
  SPAWN_INTERVAL,
  SPAWN_MAX_DISTANCE,
  SPAWN_MIN_DISTANCE,
  CAMP_SAFE_RADIUS,
  WORLD_LIMIT,
} from './config.js';
import { hash, randomGenerator } from './world.js';

// `fear` is the health fraction under which an enemy breaks off and runs.
export const ENEMIES = {
  stalker: {
    id: 'stalker',
    name: 'Kẻ rình rừng',
    health: 26,
    damage: 8,
    speed: 86,
    chaseSpeed: 124,
    radius: 24,
    attackRange: 40,
    noticeRange: 215,
    windup: 0.52,
    strike: 0.16,
    recover: 0.8,
    fear: 0.34,
    biomes: ['meadow', 'woodland', 'deepwood', 'mistgrove'],
    loot: [
      ['fiber', 1, 2],
      ['berry', 0, 1],
    ],
  },
  guardian: {
    id: 'guardian',
    name: 'Đá canh',
    health: 68,
    damage: 14,
    speed: 40,
    chaseSpeed: 60,
    radius: 30,
    attackRange: 48,
    noticeRange: 200,
    windup: 0.95,
    strike: 0.22,
    recover: 1.25,
    fear: 0,
    biomes: ['rocky', 'ancient'],
    nearLandmark: true,
    loot: [
      ['fragment', 1, 1],
      ['stone', 1, 3],
    ],
  },
  nightling: {
    id: 'nightling',
    name: 'Bóng đêm',
    health: 18,
    damage: 6,
    speed: 100,
    chaseSpeed: 146,
    radius: 20,
    attackRange: 34,
    noticeRange: 250,
    windup: 0.38,
    strike: 0.12,
    recover: 0.65,
    fear: 0.5,
    nightOnly: true,
    fadesAtDawn: true,
    biomes: ['meadow', 'woodland', 'deepwood', 'mistgrove', 'rocky', 'ancient'],
    loot: [['moonEssence', 0, 1]],
  },
  sporeling: {
    id: 'sporeling',
    name: 'Nấm phun bào tử',
    health: 24,
    damage: 7,
    speed: 56,
    chaseSpeed: 74,
    radius: 22,
    attackRange: 250,
    noticeRange: 330,
    windup: 0.72,
    strike: 0.12,
    recover: 1.6,
    fear: 0.3,
    ranged: true,
    projectile: { speed: 190, life: 2.2, damage: 7, radius: 9 },
    biomes: ['mistgrove', 'deepwood', 'ancient'],
    loot: [
      ['mushroom', 1, 2],
      ['fiber', 0, 1],
    ],
  },
  groveKeeper: {
    id: 'groveKeeper',
    name: 'Người giữ rừng cổ',
    health: 150,
    damage: 20,
    speed: 52,
    chaseSpeed: 78,
    radius: 40,
    attackRange: 62,
    noticeRange: 360,
    windup: 1.15,
    strike: 0.24,
    recover: 1.35,
    fear: 0,
    elite: true,
    slam: { radius: 118 },
    biomes: ['ancient'],
    loot: [
      ['fragment', 2, 3],
      ['ancientWood', 1, 2],
      ['moonEssence', 1, 1],
    ],
  },
};

export const ENEMY_IDS = Object.keys(ENEMIES);
const RETREAT_SECONDS = 2.6;
const NOTICE_SECONDS = 0.35;

const distance = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

/**
 * A deterministic spawn roll: same seed, same tick, same candidate → same
 * position and same creature. Spawns are never drawn from Math.random.
 */
export function spawnRoll(seed, tick, index) {
  const rng = randomGenerator(hash(seed ^ 0x5f1c7b3d, tick, index * 7 + 1));
  return { rng, a: rng(), b: rng(), c: rng() };
}

export class EnemyDirector {
  /**
   * @param {object} context
   *   world, player            live simulation objects (never copied)
   *   seed                     world seed
   *   time()                   current simulation time in seconds
   *   isNight()                day-cycle reading
   *   biomeAt(x, y)            biome lookup
   *   camp()                   { x, y } of the home fire, or null
   *   flags                    persistent world flags (shared with the save)
   *   emit(type, data)         gameplay event sink (audio, VFX, stats, quests)
   *   damagePlayer(amount, source) applies damage; returns true when it landed
   *   maxEnemies               optional override (tests, low-end devices)
   */
  constructor(context) {
    this.context = context;
    this.enemies = [];
    this.projectiles = [];
    this.spawnTimer = SPAWN_GRACE_SECONDS;
    this.aiTimer = ENEMY_AI_INTERVAL;
    this.tick = 0;
    this.spawnIndex = 0;
    this.invulnerableUntil = -1;
    this.lastHitAt = -1;
  }
  get enemiesActive() {
    return this.enemies.filter((enemy) => enemy.alive).length;
  }
  get projectileCount() {
    return this.projectiles.length;
  }
  get maxEnemies() {
    return this.context.maxEnemies ?? MAX_ENEMIES;
  }
  time() {
    return this.context.time();
  }
  emit(type, data) {
    this.context.emit(type, data);
  }
  // ---- spawning -----------------------------------------------------------
  /**
   * One deterministic candidate position per roll index. Returns null when the
   * spot is unusable (too close, inside a camp bubble, blocked, or the wrong
   * biome), which is what keeps spawns from piling up in one clearing.
   */
  candidate(roll) {
    const { world, player } = this.context;
    const angle = roll.a * Math.PI * 2;
    const radius = SPAWN_MIN_DISTANCE + roll.b * (SPAWN_MAX_DISTANCE - SPAWN_MIN_DISTANCE);
    const x = player.x + Math.cos(angle) * radius;
    const y = player.y + Math.sin(angle) * radius;
    // Cheap, world-free rejections first. Touching the world (isBlocked) can
    // generate a chunk, so it is always the last thing a candidate does.
    if (Math.abs(x) > WORLD_LIMIT || Math.abs(y) > WORLD_LIMIT) return null;
    const camp = this.context.camp();
    if (camp && distance(x, y, camp.x, camp.y) < CAMP_SAFE_RADIUS) return null;
    if (this.tooCloseToOthers(x, y)) return null;
    const biome = this.context.biomeAt(x, y);
    const type = this.pickType(biome, roll.c, x, y);
    if (!type) return null;
    // Never generate terrain just to place a creature: if the spot has not been
    // walked into view yet, this candidate is skipped instead.
    if (world.isChunkCached && !world.isChunkCached(x, y)) return null;
    if (world.isBlocked(x, y, this.time(), 12)) return null;
    return { x, y, biome, type };
  }
  tooCloseToOthers(x, y) {
    let near = 0;
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      if (distance(enemy.x, enemy.y, x, y) < SPAWN_MIN_DISTANCE * 0.9) near++;
    }
    return near >= 2;
  }
  /**
   * Biome and time decide what can appear. Nightlings only exist at night;
   * guardians only near stone; the grove keeper is never a random spawn.
   */
  pickType(biome, roll, x, y) {
    const night = this.context.isNight();
    const options = [];
    const push = (type, weight) => {
      const config = ENEMIES[type];
      if (!config) return;
      if (config.nightOnly && !night) return;
      if (config.biomes && !config.biomes.includes(biome)) return;
      if (type === 'guardian' && !this.nearLandmark(x, y)) return;
      options.push({ type, weight });
    };
    push('stalker', 3);
    push('nightling', night ? 2.4 : 0);
    push('sporeling', 1.4);
    push('guardian', biome === 'rocky' || biome === 'ancient' ? 1.6 : 0);
    // `night_eye` thins out the night population instead of removing it.
    const best = options.find((option) => option.type === 'nightling');
    if (best && this.context.flags?.nightEye) best.weight *= 0.55;
    if (!options.length) return null;
    const total = options.reduce((sum, option) => sum + option.weight, 0);
    let pick = roll * total;
    for (const option of options) {
      pick -= option.weight;
      if (pick <= 0) return option.type;
    }
    return options.at(-1).type;
  }
  nearLandmark(x, y) {
    const landmarks = this.context.world.landmarksNear?.(x, y, 460) ?? [];
    return landmarks.some((landmark) =>
      ['stoneCircle', 'giantRock', 'shrine'].includes(landmark.type),
    );
  }
  /**
   * One spawn attempt per interval. The roll index advances every attempt, so
   * a blocked spot is simply the next candidate — never a retry loop.
   */
  trySpawn() {
    if (this.time() < SPAWN_GRACE_SECONDS) return null;
    if (this.enemiesActive >= this.maxEnemies) return null;
    for (let attempt = 0; attempt < 6; attempt++) {
      const roll = spawnRoll(this.context.seed, this.tick, this.spawnIndex++);
      const spot = this.candidate(roll);
      if (!spot) continue;
      return this.spawn(spot.type, spot.x, spot.y, { roll });
    }
    return null;
  }
  spawn(type, x, y, { roll = null } = {}) {
    const config = ENEMIES[type];
    if (!config) return null;
    const id = `e${this.tick}-${this.spawnIndex}-${type}`;
    const rng = roll?.rng ?? randomGenerator(hash(this.context.seed, this.tick, this.spawnIndex));
    const enemy = {
      id,
      type,
      config,
      x,
      y,
      spawnX: x,
      spawnY: y,
      health: config.health,
      maxHealth: config.health,
      state: 'idle',
      stateTime: 0,
      stateAge: 0,
      alert: false,
      moving: false,
      facing: 'down',
      swing: 0,
      cooldown: 0,
      wanderAngle: rng() * Math.PI * 2,
      wanderTimer: 1 + rng() * 3,
      rng,
      alive: true,
      elite: !!config.elite,
      name: config.name,
      damageFlash: 0,
      knockX: 0,
      knockY: 0,
      vanish: 0,
    };
    this.enemies.push(enemy);
    this.emit('enemySpawn', {
      id,
      type,
      name: config.name,
      x,
      y,
      elite: enemy.elite,
    });
    return enemy;
  }
  /** The grove keeper is placed, never rolled: one guardian per grove. */
  spawnGroveKeeper(grove) {
    if (this.context.flags?.groveCleared) return null;
    const existing = this.enemies.find((enemy) => enemy.type === 'groveKeeper' && enemy.alive);
    if (existing) return existing;
    return this.spawn('groveKeeper', grove.x, grove.y - 26);
  }
  // ---- damage -------------------------------------------------------------
  get invulnerable() {
    return this.time() < this.invulnerableUntil;
  }
  /** Applies damage to the player, honouring dodge/grace i-frames. */
  damagePlayer(amount, source = null) {
    if (this.invulnerable) return false;
    const applied = this.context.damagePlayer(amount, source);
    if (!applied) return false;
    this.invulnerableUntil = this.time() + HIT_INVULNERABILITY;
    this.lastHitAt = this.time();
    this.emit('playerHurt', {
      x: this.context.player.x,
      y: this.context.player.y,
      amount,
      source: source?.type ?? null,
      name: source?.name ?? null,
    });
    return true;
  }
  damageEnemy(enemy, amount, { x = enemy.x, y = enemy.y, knockback = 0 } = {}) {
    if (!enemy?.alive || amount <= 0) return false;
    enemy.health = Math.max(0, enemy.health - amount);
    enemy.damageFlash = 0.18;
    this.emit('enemyHit', {
      id: enemy.id,
      type: enemy.type,
      name: enemy.name,
      x,
      y,
      amount,
      health: enemy.health,
      maxHealth: enemy.maxHealth,
      elite: enemy.elite,
    });
    if (knockback > 0) {
      const length = Math.hypot(x - enemy.x, y - enemy.y) || 1;
      enemy.x += ((x - enemy.x) / length) * knockback;
      enemy.y += ((y - enemy.y) / length) * knockback;
    }
    // Being hit always wakes an enemy: no silent sniping from the dark.
    if (enemy.health > 0) {
      enemy.alert = true;
      if (['idle', 'wander', 'notice'].includes(enemy.state)) this.setState(enemy, 'chase');
      if (enemy.cooldown <= 0 && enemy.health / enemy.maxHealth <= enemy.config.fear)
        this.setState(enemy, 'retreat');
    } else {
      this.slay(enemy, enemy.x, enemy.y);
    }
    return true;
  }
  slay(enemy, x, y) {
    if (!enemy.alive) return;
    enemy.alive = false;
    const loot = [];
    for (const [item, min, max] of enemy.config.loot ?? []) {
      const roll = enemy.rng();
      const count = min + Math.floor(roll * (max - min + 1));
      if (count > 0) loot.push([item, count]);
    }
    this.emit('enemyDeath', {
      id: enemy.id,
      type: enemy.type,
      name: enemy.name,
      x,
      y,
      elite: enemy.elite,
      loot,
      fade: enemy.config.fadesAtDawn ? 'dawn' : null,
    });
  }
  /**
   * A player swing. The hit test is honest: reach plus the creature's own
   * radius, and a real arc in the direction the player is facing.
   */
  playerAttack({ direction, weapon, x, y }) {
    const hits = [];
    if (!weapon || !direction) return hits;
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const gap = distance(enemy.x, enemy.y, x, y);
      if (gap > weapon.range + enemy.config.radius * 0.8) continue;
      const toX = enemy.x - x,
        toY = enemy.y - y;
      const length = Math.hypot(toX, toY) || 1;
      const cosine = (toX / length) * direction.x + (toY / length) * direction.y;
      const angle = Math.acos(Math.max(-1, Math.min(1, cosine)));
      if (angle > weapon.arc / 2) continue;
      this.damageEnemy(enemy, weapon.damage, {
        x,
        y,
        knockback: weapon.knockback ?? 0,
      });
      hits.push(enemy);
    }
    return hits;
  }
  clearNear(x, y, radius) {
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      if (distance(enemy.x, enemy.y, x, y) <= radius) {
        enemy.alive = false;
        enemy.vanish = 1;
      }
    }
    this.projectiles.length = 0;
  }
  // ---- simulation ---------------------------------------------------------
  setState(enemy, state) {
    enemy.state = state;
    enemy.stateTime = 0;
    if (state === 'notice') this.emit('enemyNotice', { id: enemy.id, x: enemy.x, y: enemy.y });
    if (state === 'windup')
      this.emit('enemyTelegraph', {
        id: enemy.id,
        type: enemy.type,
        name: enemy.name,
        x: enemy.x,
        y: enemy.y,
        radius: enemy.config.attackRange + (enemy.config.slam?.radius ?? 0),
        windup: enemy.config.windup,
        elite: enemy.elite,
      });
  }
  update(dt) {
    if (!(dt > 0)) return;
    this.tick++;
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = SPAWN_INTERVAL;
      this.trySpawn();
    }
    this.aiTimer -= dt;
    const think = this.aiTimer <= 0;
    if (think) this.aiTimer = ENEMY_AI_INTERVAL;
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      enemy.cooldown = Math.max(0, enemy.cooldown - dt);
      enemy.stateTime += dt;
      enemy.damageFlash = Math.max(0, enemy.damageFlash - dt);
      const gap = distance(enemy.x, enemy.y, this.context.player.x, this.context.player.y);
      // Distant creatures are put to sleep: no AI, no work, no spawn churn.
      if (gap > ENEMY_SLEEP_DISTANCE) {
        enemy.sleeping = true;
        if (gap > ENEMY_SLEEP_DISTANCE * 1.6) {
          enemy.alive = false;
          enemy.sleeping = false;
        }
        continue;
      }
      enemy.sleeping = false;
      if (think) this.think(enemy, gap);
      this.step(enemy, dt);
    }
    this.updateProjectiles(dt);
    if (this.enemies.length > this.maxEnemies * 3)
      this.enemies = this.enemies.filter((enemy) => enemy.alive);
  }
  think(enemy, gap) {
    const config = enemy.config;
    const night = this.context.isNight();
    if (config.fadesAtDawn && !night && enemy.state !== 'retreat') {
      enemy.alive = false;
      enemy.vanish = 1;
      this.emit('enemyVanish', { id: enemy.id, type: enemy.type, x: enemy.x, y: enemy.y });
      return;
    }
    // Homesickness: everything eventually walks back to where it came from.
    const leash = distance(enemy.x, enemy.y, enemy.spawnX, enemy.spawnY);
    if (leash > ENEMY_LEASH_DISTANCE && !['return', 'retreat'].includes(enemy.state)) {
      this.setState(enemy, 'return');
      return;
    }
    switch (enemy.state) {
      case 'idle':
        enemy.wanderTimer -= ENEMY_AI_INTERVAL;
        if (enemy.wanderTimer <= 0) {
          enemy.wanderTimer = 1.4 + enemy.rng() * 3.2;
          enemy.wanderAngle = enemy.rng() * Math.PI * 2;
          this.setState(enemy, 'wander');
        } else if (this.canNotice(enemy, gap)) {
          this.setState(enemy, 'notice');
        }
        break;
      case 'wander':
        enemy.wanderTimer -= ENEMY_AI_INTERVAL;
        if (this.canNotice(enemy, gap)) this.setState(enemy, 'notice');
        else if (enemy.wanderTimer <= 0) this.setState(enemy, 'idle');
        break;
      case 'notice':
        if (enemy.stateTime >= NOTICE_SECONDS) this.setState(enemy, 'chase');
        break;
      case 'chase':
        if (gap <= config.attackRange) this.setState(enemy, 'windup');
        else if (gap > config.noticeRange * 2.4) this.setState(enemy, 'return');
        else if (enemy.health / enemy.maxHealth <= config.fear) this.setState(enemy, 'retreat');
        break;
      case 'windup':
        if (enemy.stateTime >= config.windup) this.setState(enemy, 'strike');
        break;
      case 'strike':
        this.executeAttack(enemy);
        this.setState(enemy, 'recover');
        break;
      case 'recover':
        if (enemy.stateTime >= config.recover) {
          if (enemy.health / enemy.maxHealth <= config.fear) this.setState(enemy, 'retreat');
          else if (gap <= config.noticeRange * 1.6) this.setState(enemy, 'chase');
          else this.setState(enemy, 'return');
        }
        break;
      case 'retreat':
        if (enemy.stateTime >= RETREAT_SECONDS) this.setState(enemy, 'return');
        break;
      case 'return':
        if (leash < 26) this.setState(enemy, 'idle');
        else if (enemy.health / enemy.maxHealth > config.fear && this.canNotice(enemy, gap))
          this.setState(enemy, 'notice');
        break;
      default:
        this.setState(enemy, 'idle');
    }
  }
  /**
   * `quiet_step` shrinks the distance at which a creature reacts, but it never
   * makes the player invisible: walking into one is still noticed.
   */
  canNotice(enemy, gap) {
    const quiet = this.context.flags?.quietStep ? 0.85 : 1;
    return gap <= enemy.config.noticeRange * quiet;
  }
  /** Movement runs every frame, decisions run at 6 Hz, and both are bounded. */
  step(enemy, dt) {
    const config = enemy.config;
    const player = this.context.player;
    let vx = 0,
      vy = 0;
    const gap = distance(enemy.x, enemy.y, player.x, player.y);
    switch (enemy.state) {
      case 'chase': {
        const length = Math.hypot(player.x - enemy.x, player.y - enemy.y) || 1;
        vx = ((player.x - enemy.x) / length) * config.chaseSpeed;
        vy = ((player.y - enemy.y) / length) * config.chaseSpeed;
        // Ranged creatures hold their distance instead of hugging the player.
        if (config.ranged && gap <= config.attackRange * 0.7) {
          vx *= 0.2;
          vy *= 0.2;
        }
        break;
      }
      case 'wander':
        vx = Math.cos(enemy.wanderAngle) * config.speed * 0.55;
        vy = Math.sin(enemy.wanderAngle) * config.speed * 0.55;
        break;
      case 'windup': {
        const length = Math.hypot(player.x - enemy.x, player.y - enemy.y) || 1;
        vx = ((player.x - enemy.x) / length) * config.speed * 0.35;
        vy = ((player.y - enemy.y) / length) * config.speed * 0.35;
        break;
      }
      case 'retreat': {
        const length = Math.hypot(player.x - enemy.x, player.y - enemy.y) || 1;
        vx = (-(player.x - enemy.x) / length) * config.chaseSpeed;
        vy = (-(player.y - enemy.y) / length) * config.chaseSpeed;
        break;
      }
      case 'return': {
        const length = Math.hypot(enemy.spawnX - enemy.x, enemy.spawnY - enemy.y) || 1;
        vx = ((enemy.spawnX - enemy.x) / length) * config.speed;
        vy = ((enemy.spawnY - enemy.y) / length) * config.speed;
        break;
      }
      default:
        vx = 0;
        vy = 0;
    }
    if (enemy.state === 'strike') {
      vx = 0;
      vy = 0;
    }
    enemy.vx = vx;
    enemy.vy = vy;
    const moving = Math.hypot(vx, vy) > 1;
    enemy.moving = moving;
    if (moving) {
      const nx = enemy.x + vx * dt;
      const ny = enemy.y + vy * dt;
      const radius = Math.max(8, config.radius * 0.45);
      if (!this.context.world.isBlocked(nx, enemy.y, this.time(), radius)) enemy.x = nx;
      if (!this.context.world.isBlocked(enemy.x, ny, this.time(), radius)) enemy.y = ny;
      enemy.facing =
        Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 'right' : 'left') : vy > 0 ? 'down' : 'up';
    }
  }
  executeAttack(enemy) {
    const config = enemy.config;
    const player = this.context.player;
    if (config.ranged && config.projectile && this.projectiles.length < MAX_PROJECTILES) {
      const length = Math.hypot(player.x - enemy.x, player.y - enemy.y) || 1;
      const aim = { x: (player.x - enemy.x) / length, y: (player.y - enemy.y) / length };
      this.projectiles.push({
        id: `p${this.tick}-${this.projectiles.length}`,
        type: enemy.type,
        x: enemy.x,
        y: enemy.y - config.radius * 0.4,
        vx: aim.x * config.projectile.speed,
        vy: aim.y * config.projectile.speed,
        age: 0,
        life: config.projectile.life,
        damage: config.projectile.damage,
        radius: config.projectile.radius,
      });
      this.emit('enemyStrike', {
        id: enemy.id,
        type: enemy.type,
        x: enemy.x,
        y: enemy.y,
        ranged: true,
        hit: false,
      });
      return;
    }
    const slam = config.slam?.radius ?? 0;
    const reach = Math.max(config.attackRange, slam);
    const gap = distance(enemy.x, enemy.y, player.x, player.y);
    const landed = gap <= reach + 12;
    if (landed) this.damagePlayer(config.damage, enemy);
    this.emit('enemyStrike', {
      id: enemy.id,
      type: enemy.type,
      name: enemy.name,
      x: enemy.x,
      y: enemy.y,
      ranged: false,
      slam: slam > 0,
      hit: landed,
      distance: gap,
    });
  }
  updateProjectiles(dt) {
    if (!this.projectiles.length) return;
    const player = this.context.player;
    const keep = [];
    for (const shot of this.projectiles) {
      shot.age += dt;
      shot.life -= dt;
      if (shot.life <= 0) continue;
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
      if (distance(shot.x, shot.y, player.x, player.y) < shot.radius + 12) {
        this.damagePlayer(shot.damage, { type: shot.type, name: ENEMIES[shot.type]?.name });
        this.emit('projectileHit', { id: shot.id, type: shot.type, x: shot.x, y: shot.y });
        continue;
      }
      if (this.context.world.isBlocked(shot.x, shot.y, this.time(), 4)) {
        this.emit('projectileHit', {
          id: shot.id,
          type: shot.type,
          x: shot.x,
          y: shot.y,
          wall: true,
        });
        continue;
      }
      keep.push(shot);
    }
    this.projectiles = keep;
  }
  /** Everything the HUD, the balance script and the debug overlay read. */
  threat() {
    const { player } = this.context;
    let level = 0;
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const config = ENEMIES[enemy.type] ?? {};
      const range = (config.noticeRange ?? 220) * 1.5;
      const gap = distance(enemy.x, enemy.y, player.x, player.y);
      if (gap > range) continue;
      const closeness = Math.max(0, Math.min(1, 1 - gap / range));
      const alert =
        enemy.state === 'chase' || enemy.state === 'windup' || enemy.state === 'strike'
          ? 1
          : enemy.state === 'notice' || enemy.state === 'recover'
            ? 0.7
            : 0.35;
      level = Math.max(level, closeness * alert);
    }
    return level;
  }
  summary() {
    const { player } = this.context;
    let nearest = null;
    let nearestDistance = Infinity;
    let elite = null;
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const gap = distance(enemy.x, enemy.y, player.x, player.y);
      if (gap < nearestDistance) {
        nearest = enemy;
        nearestDistance = gap;
      }
      if (enemy.elite && gap < 700 && (!elite || enemy.health > elite.health))
        elite = { name: enemy.name, health: enemy.health, maxHealth: enemy.maxHealth };
    }
    return {
      count: this.enemiesActive,
      projectiles: this.projectiles.length,
      nearest: nearest
        ? { type: nearest.type, name: nearest.name, distance: nearestDistance }
        : null,
      elite,
    };
  }
}
