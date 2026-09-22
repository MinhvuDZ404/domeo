import {
  BIOMES,
  CAMP_RADIUS,
  CHUNK_SIZE,
  DODGE_DURATION,
  RESOURCES,
  clamp,
  getDayInfo,
  getWeather,
} from './config.js';
import { DEFAULT_SETTINGS } from './settings.js';
import {
  drawAncientGrove,
  drawBeacon,
  drawCreature,
  drawCrystalCluster,
  drawFire,
  drawFireflies,
  drawGeode,
  drawHerbPlant,
  drawIronwood,
  drawLanternPost,
  drawLandmark,
  drawMapTable,
  drawMushroomCluster,
  drawPlanter,
  drawSeat,
  drawShelter,
  drawSlashArc,
  drawSporeShot,
  drawStandingStone,
  drawTelegraphRing,
  drawTreeOverlay,
  drawWorkbench,
} from './art.js';
import { ENEMIES } from './combat.js';

const ASSETS = {
  grass: 'assets/environment/grass.png',
  tree: 'assets/environment/tree.png',
  player: 'assets/sprites/player_walk_new.png',
};
// Small, bounded bursts. Particles are decoration only: they never affect play.
const PARTICLES = {
  leaf: {
    colors: ['#9fbf6a', '#7d9c56', '#c6d69a'],
    gravity: 26,
    spread: 52,
    life: 0.95,
    count: 8,
  },
  stone: {
    colors: ['#a8b0a2', '#7d8a7e', '#cfd3c4'],
    gravity: 95,
    spread: 42,
    life: 0.8,
    count: 7,
  },
  spark: {
    colors: ['#f2cd7d', '#e8a95a', '#fff2c4'],
    gravity: -14,
    spread: 36,
    life: 0.9,
    count: 9,
  },
  deny: { colors: ['#dd9a86', '#c47a66'], gravity: 44, spread: 28, life: 0.55, count: 5 },
  ember: {
    colors: ['#f2a35a', '#e87a3d', '#ffd98a'],
    gravity: -32,
    spread: 22,
    life: 1.1,
    count: 8,
  },
  glow: {
    colors: ['#cfe8f5', '#9fd4e8', '#fff6d8'],
    gravity: -8,
    spread: 44,
    life: 1.2,
    count: 12,
  },
  heal: {
    colors: ['#a8d8a0', '#7fb069', '#e9f2c8'],
    gravity: -20,
    spread: 30,
    life: 1,
    count: 8,
  },
  petal: {
    colors: ['#e8e4f0', '#f2c9d4', '#f5e3a8'],
    gravity: 18,
    spread: 36,
    life: 1.1,
    count: 6,
  },
  // Combat feedback. High priority: they are the only cue some hits get.
  slash: {
    colors: ['#f4f7e2', '#dfe8c2', '#ffffff'],
    gravity: 0,
    spread: 90,
    life: 0.3,
    count: 6,
  },
  hit: {
    colors: ['#ffe2b0', '#f2b46a', '#ffffff'],
    gravity: 60,
    spread: 120,
    life: 0.42,
    count: 8,
  },
  blood: {
    colors: ['#8f4a44', '#b0605a', '#5d3a36'],
    gravity: 150,
    spread: 70,
    life: 0.5,
    count: 7,
  },
  spore: {
    colors: ['#d8bfae', '#a8524c', '#f0e2c8'],
    gravity: 22,
    spread: 58,
    life: 0.7,
    count: 7,
  },
  echo: {
    colors: ['#bfe8d0', '#8fd8b0', '#eaf7e6'],
    gravity: -6,
    spread: 46,
    life: 0.8,
    count: 8,
  },
};
const HIGH_PRIORITY_PARTICLES = new Set(['slash', 'hit', 'blood', 'spore', 'spark', 'ember']);
const LOW_PRIORITY_PARTICLES = new Set(['petal', 'leaf', 'dust']);
const MAX_PARTICLES_HIGH = 180;
const MAX_PARTICLES_MEDIUM = 120;
const MAX_PARTICLES_LOW = 60;
const MAX_VISIBLE_LIGHTS_HIGH = 8;
const MAX_VISIBLE_LIGHTS_LOW = 4;
function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    const timeout = setTimeout(() => resolve(null), 8000);
    img.onload = () => {
      clearTimeout(timeout);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timeout);
      resolve(null);
    };
    img.src = src; // Register handlers first, including for cached assets.
  });
}
function surface(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export class Renderer {
  constructor(canvas, { settings = DEFAULT_SETTINGS } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.camera = { x: 0, y: 0 };
    this.cameraInit = false;
    this.trauma = 0;
    this.width = 0;
    this.height = 0;
    this.zoom = 1;
    this.images = {};
    this.frames = {};
    this.effects = [];
    this.combatFx = [];
    this.particles = [];
    this.decorationCache = new WeakMap();
    this.settings = { ...DEFAULT_SETTINGS, ...settings };
    this.lastFrame = null;
    this.stats = { entities: 0, structures: 0, particles: 0, lights: 0, enemies: 0 };
    this.light = surface(1, 1);
    this.prefersReducedMotion = globalThis.matchMedia
      ? matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;
    this.resize();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
  }
  // A player choice of "less movement" wins over the system preference.
  get reducedMotion() {
    if (this.settings.motion === 'on') return true;
    if (this.settings.motion === 'off') return false;
    return this.prefersReducedMotion;
  }
  get motionEffects() {
    return !this.reducedMotion;
  }
  get quality() {
    const q = this.settings.quality ?? 'auto';
    if (q !== 'auto') return q;
    // Auto: small screens get the light path, desktops get the full look.
    if (typeof this.width === 'number' && this.width < 700) return 'low';
    return 'medium';
  }
  get particleCap() {
    const q = this.quality;
    if (q === 'low') return MAX_PARTICLES_LOW;
    if (q === 'high') return MAX_PARTICLES_HIGH;
    return MAX_PARTICLES_MEDIUM;
  }
  get maxLights() {
    return this.quality === 'low' ? MAX_VISIBLE_LIGHTS_LOW : MAX_VISIBLE_LIGHTS_HIGH;
  }
  applySettings(settings) {
    this.settings = { ...DEFAULT_SETTINGS, ...settings };
    if (!this.settings.particles) this.particles.length = 0;
    while (this.particles.length > this.particleCap) this.particles.shift();
  }
  addShake(amount = 0.2) {
    if (!this.settings.shake || this.reducedMotion) return;
    this.trauma = clamp(this.trauma + amount, 0, 1);
  }
  async load() {
    await Promise.all(
      Object.entries(ASSETS).map(async ([key, src]) => {
        this.images[key] = await loadImage(src);
      }),
    );
    const tile = surface(64, 64),
      tileCtx = tile.getContext('2d');
    tileCtx.fillStyle = '#4c6240';
    tileCtx.fillRect(0, 0, 64, 64);
    if (this.images.grass) {
      tileCtx.globalAlpha = 0.23;
      tileCtx.drawImage(this.images.grass, 0, 0, 64, 64);
    }
    tileCtx.globalAlpha = 0.23;
    tileCtx.fillStyle = '#304b38';
    tileCtx.fillRect(0, 0, 64, 64);
    this.ground = this.ctx.createPattern(tile, 'repeat');
    this.trees = [0, 1, 2].map((index) => {
      const tree = surface(80, 128),
        ctx = tree.getContext('2d');
      if (this.images.tree) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(this.images.tree, 0, 0, 80, 128);
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = ['rgba(39,63,43,.38)', 'rgba(91,94,44,.33)', 'rgba(34,65,55,.42)'][index];
        ctx.fillRect(0, 0, 80, 128);
      }
      return tree;
    });
    this.prepareFrames();
    return Object.values(this.images).every(Boolean);
  }
  prepareFrames() {
    const image = this.images.player;
    if (!image) return;
    const source = surface(image.width, image.height),
      ctx = source.getContext('2d');
    ctx.drawImage(image, 0, 0);
    const xs = [128, 294, 502, 710, 918, 1126, 1334, 1542];
    const ys = { down: 1, left: 220, right: 439, up: 658 };
    for (const [direction, sy] of Object.entries(ys)) {
      this.frames[direction] = xs.map((sx, index) => {
        const sw = index === 0 ? 166 : 208,
          sh = 219;
        const data = ctx.getImageData(sx, sy, sw, sh).data;
        let left = sw,
          right = 0,
          top = sh,
          bottom = 0;
        for (let y = 0; y < sh; y++)
          for (let x = 0; x < sw; x++) {
            if (data[(y * sw + x) * 4 + 3] > 50) {
              left = Math.min(left, x);
              right = Math.max(right, x);
              top = Math.min(top, y);
              bottom = Math.max(bottom, y);
            }
          }
        if (left > right) return { sx, sy, sw, sh };
        // Trim transparent margins, then use a fixed scale (not a stretched first frame).
        return { sx: sx + left, sy: sy + top, sw: right - left + 1, sh: bottom - top + 1 };
      });
    }
  }
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.width = Math.max(1, rect.width);
    this.height = Math.max(1, rect.height);
    const budget = this.quality === 'low' ? 4_000_000 : 8_000_000;
    this.dpr = Math.min(
      window.devicePixelRatio || 1,
      2,
      Math.sqrt(budget / (this.width * this.height)),
    );
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.light.width = this.canvas.width;
    this.light.height = this.canvas.height;
    this.ctx.imageSmoothingEnabled = false;
    this.vignette = {};
    this.campWash = null;
  }
  screenToWorld(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: Math.round(((clientX - rect.left) / this.zoom + this.camera.x) / 16) * 16,
      y: Math.round(((clientY - rect.top) / this.zoom + this.camera.y) / 16) * 16,
    };
  }
  addEffect(event) {
    if (event.x === undefined) return;
    this.effects.push({ ...event, born: performance.now() });
    if (this.effects.length > 30) this.effects.shift();
  }
  // Feedback for a completed or refused action. Disabled by the player setting,
  // by reduced motion, or when the particle budget is already used up.
  addBurst(kind, x, y) {
    const style = PARTICLES[kind];
    if (!style || !this.motionEffects || !this.settings.particles) return;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const cap = this.particleCap;
    // Ambient decoration yields to gameplay feedback when the pool is full:
    // a hit that cannot be seen is worse than a leaf that is not drawn.
    if (this.particles.length >= cap) {
      if (LOW_PRIORITY_PARTICLES.has(kind)) return;
      const droppable = this.particles.findIndex((p) => LOW_PRIORITY_PARTICLES.has(p.kind));
      if (droppable >= 0) this.particles.splice(droppable, 1);
      else if (!HIGH_PRIORITY_PARTICLES.has(kind)) return;
      else this.particles.shift();
    }
    const count = Math.min(style.count, Math.max(0, cap - this.particles.length));
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2,
        speed = style.spread * (0.35 + Math.random() * 0.65);
      this.particles.push({
        kind,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.6 - (style.gravity < 0 ? 30 : 0),
        age: 0,
        life: style.life * (0.7 + Math.random() * 0.5),
        size:
          kind === 'spark' || kind === 'ember'
            ? 1.6 + Math.random() * 1.4
            : 1.8 + Math.random() * 1.2,
        color: style.colors[i % style.colors.length],
      });
    }
    this.stats.particles = this.particles.length;
  }
  updateParticles(dt) {
    if (!this.particles.length) return;
    const gravityOf = (kind) => PARTICLES[kind]?.gravity ?? 40;
    for (const particle of this.particles) {
      particle.age += dt;
      particle.vy += gravityOf(particle.kind) * dt;
      particle.vx *= 1 - Math.min(0.9, dt * 2.4);
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
    }
    this.particles = this.particles.filter((particle) => particle.age < particle.life);
    this.stats.particles = this.particles.length;
  }
  reset() {
    this.effects.length = 0;
    this.combatFx.length = 0;
    this.particles.length = 0;
    this.cameraInit = false;
    this.trauma = 0;
  }
  render(game, { menu = false, target = null, placement = null, time = performance.now() } = {}) {
    const ctx = this.ctx,
      p = game.player;
    const dt = this.lastFrame === null ? 0 : clamp((time - this.lastFrame) / 1000, 0, 0.05);
    this.lastFrame = time;
    this.zoom = menu
      ? this.width < 700
        ? 1.5
        : 1.7
      : clamp(Math.min(this.width / 1000, this.height / 730), 1.1, 1.5);
    // Smooth follow with a subtle look-ahead so movement feels alive but never laggy.
    const lookAhead = p.moving && !this.reducedMotion ? 26 : 0;
    const lookX = p.direction === 'right' ? lookAhead : p.direction === 'left' ? -lookAhead : 0;
    const lookY = p.direction === 'down' ? lookAhead : p.direction === 'up' ? -lookAhead : 0;
    const targetX = p.x + lookX - (this.width * (menu ? 0.71 : 0.5)) / this.zoom;
    const targetY = p.y + lookY - (this.height * (menu ? 0.53 : 0.52)) / this.zoom;
    if (!this.cameraInit || menu) {
      this.camera.x = targetX;
      this.camera.y = targetY;
      this.cameraInit = true;
    } else {
      const ease = Math.min(1, dt * 7);
      this.camera.x += (targetX - this.camera.x) * ease;
      this.camera.y += (targetY - this.camera.y) * ease;
    }
    this.trauma = Math.max(0, this.trauma - dt * 2.2);
    const shake = this.trauma * this.trauma * (this.reducedMotion ? 0 : 9);
    const shakeX = shake ? Math.sin(time / 31) * shake : 0;
    const shakeY = shake ? Math.cos(time / 43) * shake : 0;
    const camX = this.camera.x + shakeX,
      camY = this.camera.y + shakeY;
    const bounds = {
      x: camX,
      y: camY,
      width: this.width / this.zoom,
      height: this.height / this.zoom,
    };
    const world = game.world.getEntities(bounds, game.elapsed);
    const landmarks = game.world.generationVersion >= 2 ? game.world.getLandmarks(bounds) : [];
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = '#435b3d';
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.save();
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-camX, -camY);
    ctx.fillStyle = this.ground || '#435b3d';
    ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
    this.drawGround(game, bounds);
    this.drawCampGround(game, time);
    this.drawTelegraphs(game, time);
    if (target && !menu && !game.placement) {
      ctx.strokeStyle = '#d7dea280';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(target.x, target.y + 2, 26, 12, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    const enemies = menu || !game.enemies ? [] : game.enemies.enemies;
    const objects = [
      ...world,
      ...landmarks.map((l) => ({ ...l, remaining: 1, landmark: true })),
      ...enemies
        .filter(
          (enemy) =>
            enemy.alive &&
            enemy.x > bounds.x - 140 &&
            enemy.x < bounds.x + bounds.width + 140 &&
            enemy.y > bounds.y - 160 &&
            enemy.y < bounds.y + bounds.height + 200,
        )
        .map((enemy) => ({ type: 'enemy', x: enemy.x, y: enemy.y, enemy })),
      ...game.world.structures.filter(
        (s) =>
          s.x > bounds.x - 100 &&
          s.x < bounds.x + bounds.width + 100 &&
          s.y > bounds.y - 100 &&
          s.y < bounds.y + bounds.height + 100,
      ),
      { type: 'player', x: p.x, y: p.y },
    ];
    objects.sort((a, b) => a.y - b.y);
    for (const obj of objects) {
      try {
        if (obj.type === 'player') this.drawPlayer(p, game.torchLit, time, game);
        else if (obj.type === 'enemy') this.drawEnemy(obj.enemy, time);
        else this.drawEntity(obj, time, p, game);
      } catch {
        // One broken decoration must never kill the whole frame.
      }
    }
    if (!menu && game.enemies) {
      this.drawEnemyBars(enemies, time);
      this.drawProjectiles(game, time);
    }
    if (game.placement && placement && !menu) {
      const valid = game.canPlace(placement.x, placement.y);
      ctx.save();
      ctx.globalAlpha = 0.65;
      this.drawEntity({ ...placement, type: game.placement }, time, p, game);
      ctx.fillStyle = valid ? '#bddd7738' : '#db8b7038';
      ctx.strokeStyle = valid ? '#ccdfa0' : '#e2a18b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(placement.x, placement.y + 4, 32, 17, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    this.drawGrading(game, menu);
    if (!menu && getDayInfo(game.elapsed).nightFactor > 0.45) this.drawStars(game, time);
    this.drawLight(game, menu, time);
    this.drawWeather(game, time, menu, camX, camY);
    if (!menu) this.drawEventLayer(game, time, camX, camY);
    this.drawWarmth(game, menu, time);
    if (this.motionEffects) this.drawAtmosphere(game, time, menu);
    ctx.save();
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-camX, -camY);
    this.drawCombatFx(game, time);
    this.drawParticles();
    this.drawEffects(time);
    ctx.restore();
    this.updateParticles(dt);
    this.stats.enemies = game.enemies ? game.enemies.enemiesActive : 0;
    this.stats.entities = world.length + landmarks.length + this.stats.enemies;
    this.stats.structures = game.world.structures.length;
  }
  // A light hand on colour: warm when the sun is low, cool and dim at night.
  drawGrading(game, menu) {
    const ctx = this.ctx,
      day = getDayInfo(game.elapsed);
    const weather = game.weather ? game.weather() : getWeather(game.elapsed, game.world.seed);
    const warmth = menu ? 0.25 : day.warmth;
    const night = menu ? 0 : day.nightFactor * (1 - warmth * 0.55);
    if (warmth > 0.03) {
      ctx.fillStyle = `rgba(228, 152, 82, ${(0.13 * warmth).toFixed(4)})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }
    if (!menu && day.dusk > 0.03) {
      ctx.fillStyle = `rgba(120, 80, 140, ${(0.09 * day.dusk).toFixed(4)})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }
    if (!menu && day.dawn > 0.03) {
      ctx.fillStyle = `rgba(240, 180, 170, ${(0.07 * Math.min(1, day.dawn)).toFixed(4)})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }
    if (night > 0.03) {
      ctx.fillStyle = `rgba(43, 66, 104, ${(0.14 * night).toFixed(4)})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }
    if (!menu && (weather.type === 'cloud' || weather.type === 'rain')) {
      ctx.fillStyle = `rgba(60, 75, 90, ${(0.1 * weather.intensity).toFixed(4)})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }
    // A world event is a mood, so it only ever tints the existing grading.
    const event = menu || !game.worldEvent ? null : game.worldEvent();
    if (event && event.darkness !== 0) {
      const dark = event.darkness * (0.6 + event.intensity * 0.4);
      ctx.fillStyle =
        dark < 0 ? `rgba(255,236,190,${(-dark).toFixed(4)})` : `rgba(30,40,55,${dark.toFixed(4)})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }
  }
  drawStars(game, time) {
    if (this.quality === 'low') return;
    const ctx = this.ctx;
    const day = getDayInfo(game.elapsed);
    const alpha = clamp((day.nightFactor - 0.45) * 1.6, 0, 0.85);
    if (alpha <= 0.02) return;
    ctx.save();
    for (let i = 0; i < 70; i++) {
      const sx = (i * 173.3 + 41) % this.width;
      const sy = (i * 97.7 + 13) % (this.height * 0.7);
      const twinkle = 0.5 + 0.5 * Math.sin(time / (500 + (i % 5) * 160) + i * 1.7);
      ctx.globalAlpha = alpha * (0.35 + twinkle * 0.65);
      ctx.fillStyle = i % 9 === 0 ? '#cfe0ff' : '#e8ecff';
      const s = i % 11 === 0 ? 2 : 1;
      ctx.fillRect(sx, sy, s, s);
    }
    ctx.restore();
  }
  // Decoration variants are bucketed once per chunk, so a frame only changes
  // drawing state a handful of times per chunk instead of once per tuft.
  decorationBuckets(chunk) {
    let buckets = this.decorationCache.get(chunk);
    if (!buckets) {
      buckets = { shade: [], blades: [], stones: [], flowers: [] };
      for (const decoration of chunk.decorations) {
        if (decoration.variant < 0.16) buckets.shade.push(decoration);
        else if (decoration.variant < 0.55) buckets.blades.push(decoration);
        else if (decoration.variant > 0.86) buckets.stones.push(decoration);
        if (decoration.flower !== undefined && decoration.flower > 0.8)
          buckets.flowers.push(decoration);
      }
      this.decorationCache.set(chunk, buckets);
    }
    return buckets;
  }
  drawGround(game, bounds) {
    const ctx = this.ctx;
    const v2 = game.world.generationVersion >= 2;
    if (v2) {
      // Per-chunk biome wash keeps transitions soft without per-pixel cost.
      for (
        let cy = Math.floor(bounds.y / CHUNK_SIZE);
        cy <= Math.floor((bounds.y + bounds.height) / CHUNK_SIZE);
        cy++
      ) {
        for (
          let cx = Math.floor(bounds.x / CHUNK_SIZE);
          cx <= Math.floor((bounds.x + bounds.width) / CHUNK_SIZE);
          cx++
        ) {
          const biome = game.world.biomeAt(
            cx * CHUNK_SIZE + CHUNK_SIZE / 2,
            cy * CHUNK_SIZE + CHUNK_SIZE / 2,
          );
          const color = BIOMES[biome]?.ground ?? '#4c6240';
          ctx.fillStyle = color + '55';
          ctx.fillRect(cx * CHUNK_SIZE, cy * CHUNK_SIZE, CHUNK_SIZE, CHUNK_SIZE);
        }
      }
    }
    // A soft clearing is anchored to the world rather than moving with the camera.
    const clearing = ctx.createRadialGradient(0, 0, 20, 0, 0, 185);
    clearing.addColorStop(0, '#8e8b5544');
    clearing.addColorStop(1, '#8e8b5500');
    ctx.fillStyle = clearing;
    ctx.fillRect(-185, -185, 370, 370);
    const margin = 60;
    const minX = bounds.x - margin,
      maxX = bounds.x + bounds.width + margin,
      minY = bounds.y - margin,
      maxY = bounds.y + bounds.height + margin;
    for (
      let cy = Math.floor(bounds.y / CHUNK_SIZE);
      cy <= Math.floor((bounds.y + bounds.height) / CHUNK_SIZE);
      cy++
    ) {
      for (
        let cx = Math.floor(bounds.x / CHUNK_SIZE);
        cx <= Math.floor((bounds.x + bounds.width) / CHUNK_SIZE);
        cx++
      ) {
        const buckets = this.decorationBuckets(game.world.getChunk(cx, cy));
        const visible = (decoration) =>
          decoration.x > minX && decoration.x < maxX && decoration.y > minY && decoration.y < maxY;
        if (buckets.shade.length) {
          ctx.fillStyle = '#9b98714a';
          ctx.beginPath();
          for (const d of buckets.shade) {
            if (!visible(d)) continue;
            const x = Math.round(d.x),
              y = Math.round(d.y);
            ctx.moveTo(x + 18 + d.variant * 40, y);
            ctx.ellipse(x, y, 18 + d.variant * 40, 10, -0.4, 0, Math.PI * 2);
          }
          ctx.fill();
        }
        ctx.fillStyle = '#c0b88b42';
        for (const d of buckets.shade) {
          if (!visible(d)) continue;
          ctx.fillRect(Math.round(d.x) - 8, Math.round(d.y) - 4, 4, 2);
          ctx.fillRect(Math.round(d.x) + 6, Math.round(d.y) + 3, 3, 2);
        }
        const biomeGrass = v2
          ? (BIOMES[
              game.world.biomeAt(cx * CHUNK_SIZE + CHUNK_SIZE / 2, cy * CHUNK_SIZE + CHUNK_SIZE / 2)
            ]?.grass ?? '#88a96e')
          : '#88a96e';
        ctx.strokeStyle = biomeGrass + '66';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (const d of buckets.blades) {
          if (!visible(d)) continue;
          const x = Math.round(d.x),
            y = Math.round(d.y);
          ctx.moveTo(x - 6, y + 2);
          ctx.lineTo(x - 9, y - 5);
          ctx.moveTo(x - 2, y + 3);
          ctx.lineTo(x - 3, y - 9);
          ctx.moveTo(x + 2, y + 3);
          ctx.lineTo(x + 6, y - 4);
        }
        ctx.stroke();
        if (buckets.flowers.length && v2) {
          for (const d of buckets.flowers) {
            if (!visible(d)) continue;
            const x = Math.round(d.x),
              y = Math.round(d.y);
            ctx.fillStyle = d.flower > 0.93 ? '#f2c9d4' : d.flower > 0.87 ? '#f5e3a8' : '#e8e4f0';
            ctx.fillRect(x - 1, y - 8, 3, 3);
            ctx.fillStyle = '#4d6b45';
            ctx.fillRect(x, y - 5, 1, 6);
          }
        }
        for (const d of buckets.stones) {
          if (!visible(d)) continue;
          const x = Math.round(d.x),
            y = Math.round(d.y);
          ctx.fillStyle = '#344c30';
          ctx.fillRect(x - 2, y - 1, 4, 3);
          ctx.fillStyle = d.variant > 0.94 ? '#d5c594bb' : '#adb985aa';
          ctx.fillRect(x - 4, y - 4, 3, 3);
          ctx.fillRect(x + 2, y - 6, 2, 2);
        }
      }
    }
  }
  shadow(x, y, width, height = width * 0.4) {
    const ctx = this.ctx;
    ctx.fillStyle = '#152a244d';
    ctx.beginPath();
    ctx.ellipse(x + 3, y + 3, width, height, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  drawEntity(entity, time, player, game) {
    const ctx = this.ctx,
      { x, y, type } = entity;
    if (type === 'tree') {
      if (entity.remaining === 0) {
        this.shadow(x, y, 14, 7);
        ctx.fillStyle = '#6e6443';
        ctx.fillRect(x - 9, y - 8, 18, 11);
        ctx.fillStyle = '#a09266';
        ctx.beginPath();
        ctx.ellipse(x, y - 8, 9, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        return;
      }
      this.shadow(x + 7, y, 35, 12);
      const variation = entity.variant ?? 0.5;
      const width = 69 + variation * 24,
        height = 112 + variation * 35;
      ctx.save();
      if (
        player &&
        player.y < y - 4 &&
        player.y > y - height + 20 &&
        Math.abs(player.x - x) < width * 0.45
      )
        ctx.globalAlpha = 0.42;
      if (this.images.tree)
        ctx.drawImage(
          this.trees[Math.floor(variation * 3) % 3],
          Math.round(x - width / 2),
          Math.round(y - height + 10),
          width,
          height,
        );
      else {
        ctx.fillStyle = '#685b3d';
        ctx.fillRect(x - 5, y - 25, 10, 32);
        ctx.fillStyle = '#294a31';
        ctx.beginPath();
        ctx.ellipse(x, y - 62, 28, 57, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      drawTreeOverlay(ctx, x, y, width, height, variation, entity.biome ?? 'woodland');
      ctx.restore();
    } else if (type === 'bush') {
      this.shadow(x, y, 23, 8);
      ctx.fillStyle = '#294c36';
      ctx.beginPath();
      ctx.arc(x - 12, y - 10, 13, 0, Math.PI * 2);
      ctx.arc(x + 3, y - 16, 16, 0, Math.PI * 2);
      ctx.arc(x + 16, y - 7, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5a7947';
      ctx.beginPath();
      ctx.arc(x - 12, y - 15, 10, 0, Math.PI * 2);
      ctx.arc(x + 2, y - 24, 11, 0, Math.PI * 2);
      ctx.arc(x + 15, y - 11, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8b9e5888';
      [
        [-13, -20],
        [-2, -31],
        [12, -14],
        [1, -13],
      ].forEach(([dx, dy]) => ctx.fillRect(x + dx, y + dy, 4, 2));
      if (entity.remaining > 0) {
        [
          [-15, -13],
          [0, -23],
          [13, -8],
        ]
          .slice(0, entity.remaining)
          .forEach(([dx, dy]) => {
            ctx.fillStyle = '#b96c65';
            ctx.beginPath();
            ctx.arc(x + dx, y + dy, 3.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#e5a191';
            ctx.fillRect(x + dx - 1, y + dy - 2, 2, 2);
          });
      }
    } else if (type === 'branch') {
      if (entity.remaining === 0) return;
      this.shadow(x, y, 20, 6);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-0.4);
      ctx.fillStyle = '#65563a';
      ctx.fillRect(-20, -5, 37, 8);
      ctx.fillStyle = '#a28c59';
      ctx.fillRect(-20, -6, 37, 3);
      ctx.fillStyle = '#b5a775';
      ctx.fillRect(-21, -5, 4, 7);
      ctx.fillRect(14, -5, 4, 7);
      ctx.strokeStyle = '#796a45';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, -3);
      ctx.lineTo(7, -12);
      ctx.stroke();
      ctx.restore();
    } else if (type === 'pebble' || type === 'rock') {
      if (entity.remaining === 0) return;
      const scale = type === 'pebble' ? 0.54 : 1;
      this.shadow(x, y, 25 * scale, 9 * scale);
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      ctx.fillStyle = '#647266';
      ctx.beginPath();
      ctx.moveTo(-25, 4);
      ctx.lineTo(-23, -14);
      ctx.lineTo(-10, -26);
      ctx.lineTo(11, -29);
      ctx.lineTo(24, -11);
      ctx.lineTo(26, 5);
      ctx.lineTo(9, 12);
      ctx.lineTo(-16, 11);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#919d87';
      ctx.beginPath();
      ctx.moveTo(-23, -14);
      ctx.lineTo(-10, -26);
      ctx.lineTo(11, -29);
      ctx.lineTo(7, -12);
      ctx.lineTo(-6, -4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#b3b79c';
      ctx.fillRect(-9, -23, 7, 3);
      ctx.fillStyle = '#465d40';
      ctx.fillRect(7, 4, 12, 5);
      ctx.fillRect(12, 1, 10, 4);
      ctx.restore();
    } else if (type === 'mushroom') {
      drawMushroomCluster(ctx, x, y, entity.variant ?? 0.5, entity.remaining ?? 2, time);
    } else if (type === 'herb') {
      drawHerbPlant(ctx, x, y, entity.variant ?? 0.5, entity.remaining ?? 2, time);
    } else if (type === 'ironwood') {
      drawIronwood(ctx, x, y, entity.variant ?? 0.5, entity.remaining ?? 3, time);
    } else if (type === 'geode') {
      drawGeode(ctx, x, y, entity.variant ?? 0.5, entity.remaining ?? 3, time);
    } else if (type === 'workbench') {
      drawWorkbench(ctx, x, y, time);
    } else if (type === 'shelter') {
      drawShelter(ctx, x, y, time);
    } else if (type === 'maptable') {
      drawMapTable(ctx, x, y, time);
    } else if (type === 'beacon') {
      drawBeacon(ctx, x, y, time, !!game?.flags?.beaconLit);
    } else if (type === 'seat') {
      drawSeat(ctx, x, y);
    } else if (type === 'planter') {
      drawPlanter(ctx, x, y, time);
    } else if (type === 'standingStone') {
      drawStandingStone(ctx, x, y, entity.variant ?? 0.5);
    } else if (type === 'crystal') {
      if (entity.remaining === 0) {
        ctx.fillStyle = '#4a524866';
        ctx.beginPath();
        ctx.ellipse(x, y, 12, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        return;
      }
      drawCrystalCluster(ctx, x, y, entity.variant ?? 0.5, entity.remaining ?? 2, time);
    } else if (type === 'campfire') {
      this.shadow(x, y, 27, 10);
      ctx.fillStyle = '#716c53';
      ctx.beginPath();
      ctx.ellipse(x, y, 26, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        ctx.fillStyle = i % 2 ? '#98a087' : '#858b73';
        ctx.beginPath();
        ctx.ellipse(
          x + Math.cos(angle) * 23,
          y + Math.sin(angle) * 12,
          6,
          4.5,
          angle,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(0.3);
      ctx.fillStyle = '#594534';
      ctx.fillRect(-19, -5, 38, 7);
      ctx.rotate(-0.6);
      ctx.fillRect(-18, -5, 36, 7);
      ctx.restore();
      drawFire(ctx, x, y, 1, time, this.reducedMotion);
    } else if (type === 'lantern') {
      drawLanternPost(ctx, x, y, time, true);
    } else if (type === 'chest') {
      this.shadow(x, y, 22, 9);
      ctx.fillStyle = '#5c4a32';
      ctx.fillRect(x - 18, y - 22, 36, 24);
      ctx.fillStyle = '#8a7048';
      ctx.fillRect(x - 16, y - 20, 32, 8);
      ctx.fillStyle = '#c9b27a';
      ctx.fillRect(x - 16, y - 20, 32, 3);
      ctx.fillStyle = '#d4c48a';
      ctx.fillRect(x - 3, y - 14, 6, 8);
      ctx.fillStyle = '#3d3224';
      ctx.fillRect(x - 18, y - 12, 36, 2);
    } else if (type === 'wall') {
      this.shadow(x, y, 29, 7);
      ctx.fillStyle = '#66563a';
      ctx.fillRect(x - 26, y - 25, 52, 7);
      ctx.fillRect(x - 26, y - 11, 52, 7);
      for (const dx of [-20, 20]) {
        ctx.fillStyle = '#7b6d49';
        ctx.fillRect(x + dx - 4, y - 33, 8, 40);
        ctx.fillStyle = '#aa9865';
        ctx.fillRect(x + dx - 4, y - 33, 3, 40);
        ctx.fillStyle = '#48523b';
        ctx.fillRect(x + dx - 1, y - 23, 2, 2);
      }
    } else if (type === 'ancientGrove') {
      const night = game ? getDayInfo(game.elapsed).isNight : false;
      drawAncientGrove(ctx, x, y, entity.variant ?? 0.5, time, night, !!game?.flags?.groveCleared);
      this.drawGroveArches(ctx, x, y, time);
    } else if (
      type === 'stoneCircle' ||
      type === 'oldCamp' ||
      type === 'shrine' ||
      type === 'ancientTree' ||
      type === 'pond' ||
      type === 'giantRock'
    ) {
      const night = game ? getDayInfo(game.elapsed).isNight : false;
      if (type === 'ancientTree' && player) {
        ctx.save();
        if (player.y < y - 4 && player.y > y - 200 && Math.abs(player.x - x) < 60)
          ctx.globalAlpha = 0.5;
        drawLandmark(ctx, type, x, y, entity.variant ?? 0.5, time, night);
        ctx.restore();
      } else {
        drawLandmark(ctx, type, x, y, entity.variant ?? 0.5, time, night);
      }
    }
  }
  drawPlayer(player, torchLit, time, game = null) {
    const ctx = this.ctx,
      { x, y } = player;
    // A dodge is drawn as a low, committed roll, so the i-frame window stays
    // visible even when the player is surrounded.
    const rolling = (player.dodge ?? 0) > 0;
    this.shadow(x, y, rolling ? 18 : 14, rolling ? 4 : 6);
    if (rolling) {
      const progress = Math.min(1, 1 - (player.dodge ?? 0) / DODGE_DURATION);
      ctx.save();
      ctx.globalAlpha = 0.3 * (1 - progress);
      ctx.fillStyle = '#e8e2c8';
      ctx.beginPath();
      ctx.ellipse(x - (player.dodgeX ?? 0) * 16, y - 14, 13 - progress * 4, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.translate(x, y - 14);
      ctx.rotate(((player.dodgeX ?? 0) >= 0 ? 1 : -1) * progress * Math.PI * 2);
      this.drawPlayerBody(player, time, -14);
      ctx.restore();
      this.drawSwing(player, game);
      return;
    }
    this.drawPlayerBody(player, time, 0);
    if (torchLit) {
      ctx.fillStyle = '#8d7245';
      ctx.fillRect(x + 15, y - 28, 3, 17);
      ctx.fillStyle = '#efc97f';
      ctx.beginPath();
      ctx.ellipse(x + 16, y - 33, 4, 7 + Math.sin(time / 150), 0, 0, Math.PI * 2);
      ctx.fill();
    }
    this.drawSwing(player, game);
  }
  drawPlayerBody(player, time, offsetY) {
    const ctx = this.ctx,
      x = player.x,
      y = player.y + offsetY;
    const frame = this.frames[player.direction]?.[player.frame];
    if (this.images.player && frame) {
      const width = frame.sw * 0.34,
        height = frame.sh * 0.34;
      ctx.drawImage(
        this.images.player,
        frame.sx,
        frame.sy,
        frame.sw,
        frame.sh,
        Math.round(x - width / 2),
        Math.round(y - height + 3),
        width,
        height,
      );
    } else {
      ctx.fillStyle = '#cfb9a1';
      ctx.fillRect(x - 7, y - 40, 14, 15);
      ctx.fillStyle = '#b4c3aa';
      ctx.fillRect(x - 10, y - 26, 20, 20);
      ctx.fillStyle = '#253131';
      ctx.fillRect(x - 8, y - 8, 6, 10);
      ctx.fillRect(x + 2, y - 8, 6, 10);
    }
  }
  // The swing arc is drawn from the same numbers the hit test uses.
  drawSwing(player, game) {
    if (!(player.swing > 0)) return;
    const weapon = game?.weapon ? game.weapon() : null;
    // player.swing counts down from the attack animation length.
    const progress = Math.min(1, Math.max(0, 1 - player.swing / (this.swingDuration ?? 0.26)));
    const angles = { right: 0, left: Math.PI, up: -Math.PI / 2, down: Math.PI / 2 };
    drawSlashArc(
      this.ctx,
      player.x,
      player.y,
      angles[player.direction] ?? 0,
      progress,
      weapon?.range ?? 52,
    );
  }

  drawLight(game, menu, time) {
    const ctx = this.ctx;
    const day = getDayInfo(game.elapsed);
    const weather = game.weather ? game.weather() : getWeather(game.elapsed, game.world.seed);
    let darkness = menu ? 0.06 : 0.68 * day.nightFactor;
    if (!menu && (weather.type === 'cloud' || weather.type === 'rain'))
      darkness = Math.min(0.72, darkness + 0.12 * weather.intensity);
    if (!menu && weather.type === 'mist') darkness = Math.min(0.72, darkness + 0.06);
    const event = menu || !game.worldEvent ? null : game.worldEvent();
    if (event) darkness = Math.max(0, darkness + event.darkness * event.intensity);
    if (!menu && game.passive?.('night_eye')) darkness *= 0.88;
    if (!menu) darkness = Math.max(0, darkness - (this.campGlow ?? 0));
    if (darkness < 0.02) {
      this.stats.lights = 0;
      return;
    }
    const light = this.light.getContext('2d');
    light.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    light.clearRect(0, 0, this.width, this.height);
    light.globalCompositeOperation = 'source-over';
    light.fillStyle = `rgba(9, 23, 35, ${darkness})`;
    light.fillRect(0, 0, this.width, this.height);
    const view = {
      x: this.camera.x - 260,
      y: this.camera.y - 260,
      width: this.width / this.zoom + 520,
      height: this.height / this.zoom + 520,
    };
    const inView = (s) =>
      s.x > view.x && s.x < view.x + view.width && s.y > view.y && s.y < view.y + view.height;
    const fires = game.world.structures
      .filter((s) => s.type === 'campfire' && inView(s))
      .map((s) => ({
        x: s.x,
        y: s.y,
        radius: 200,
        strength: 1,
        distance: Math.hypot(s.x - game.player.x, s.y - game.player.y),
      }));
    const lanterns = game.world.structures
      .filter((s) => s.type === 'lantern' && inView(s))
      .map((s) => ({
        x: s.x,
        y: s.y - 38,
        radius: 175,
        strength: 0.95,
        distance: Math.hypot(s.x - game.player.x, s.y - game.player.y),
      }));
    const beacons = game.world.structures
      .filter((s) => s.type === 'beacon' && game.flags?.beaconLit && inView(s))
      .map((s) => ({
        x: s.x,
        y: s.y - 92,
        radius: 300,
        strength: 1,
        distance: Math.hypot(s.x - game.player.x, s.y - game.player.y),
      }));
    const shelters = game.world.structures
      .filter((s) => s.type === 'shelter' && inView(s))
      .map((s) => ({
        x: s.x,
        y: s.y - 24,
        radius: 120,
        strength: 0.55,
        distance: Math.hypot(s.x - game.player.x, s.y - game.player.y),
      }));
    const groves =
      game.world.generationVersion >= 3 && !menu
        ? game.world
            .getLandmarks({
              x: this.camera.x - 200,
              y: this.camera.y - 200,
              width: this.width / this.zoom + 400,
              height: this.height / this.zoom + 400,
            })
            .filter((l) => l.type === 'ancientGrove')
            .map((s) => ({
              x: s.x,
              y: s.y - 20,
              radius: 150,
              strength: 0.6,
              distance: Math.hypot(s.x - game.player.x, s.y - game.player.y),
            }))
        : [];
    const shrines =
      game.world.generationVersion >= 2
        ? game.world
            .getLandmarks({
              x: this.camera.x - 200,
              y: this.camera.y - 200,
              width: this.width / this.zoom + 400,
              height: this.height / this.zoom + 400,
            })
            .filter((l) => l.type === 'shrine')
            .map((s) => ({
              x: s.x,
              y: s.y - 16,
              radius: 110,
              strength: 0.7,
              distance: Math.hypot(s.x - game.player.x, s.y - game.player.y),
            }))
        : [];
    // Only the closest fires are drawn: uncapped gradients cost more than they
    // can add on a screen that cannot show them all anyway.
    const lights = [
      {
        x: game.player.x,
        y: game.player.y - 20,
        radius: game.torchLit ? 190 : 60,
        strength: game.torchLit ? 1 : 0.6,
      },
      ...[...fires, ...lanterns, ...beacons, ...shelters, ...groves, ...shrines]
        .sort((a, b) => a.distance - b.distance)
        .slice(0, this.maxLights)
        .map(({ x, y, radius, strength }) => ({ x, y, radius, strength })),
    ];
    this.stats.lights = lights.length;
    light.globalCompositeOperation = 'destination-out';
    for (const source of lights) {
      const x = (source.x - this.camera.x) * this.zoom,
        y = (source.y - this.camera.y) * this.zoom;
      const r = source.radius * this.zoom + (this.reducedMotion ? 0 : Math.sin(time / 350) * 3);
      const gradient = light.createRadialGradient(x, y, 0, x, y, r);
      gradient.addColorStop(0, `rgba(0,0,0,${source.strength})`);
      gradient.addColorStop(0.3, `rgba(0,0,0,${source.strength * 0.8})`);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      light.fillStyle = gradient;
      light.fillRect(x - r, y - r, r * 2, r * 2);
    }
    light.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.light, 0, 0, this.width, this.height);
  }
  drawWeather(game, time, menu, camX = this.camera.x, camY = this.camera.y) {
    if (menu || this.quality === 'low') {
      if (menu) return;
      // Low quality still shows a hint of rain so weather stays readable.
      const weather = game.weather ? game.weather() : getWeather(game.elapsed, game.world.seed);
      if (weather.type !== 'rain' || weather.intensity < 0.1) return;
      const ctx = this.ctx;
      ctx.save();
      ctx.strokeStyle = `rgba(170,200,220,${0.25 * weather.intensity})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 24; i++) {
        const x = (i * 97.3 + time / 22) % (this.width + 40);
        const y = (i * 211.7 + time / 14) % (this.height + 40);
        ctx.moveTo(this.width - x, y - 20);
        ctx.lineTo(this.width - x - 5, y - 8);
      }
      ctx.stroke();
      ctx.restore();
      return;
    }
    const ctx = this.ctx;
    const weather = game.weather ? game.weather() : getWeather(game.elapsed, game.world.seed);
    if (weather.type === 'rain' && weather.intensity > 0.05) {
      ctx.save();
      ctx.strokeStyle = `rgba(170,200,220,${0.32 * weather.intensity})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      const drops = this.quality === 'high' ? 110 : 70;
      for (let i = 0; i < drops; i++) {
        const x = (i * 97.3 + time / 20 + Math.sin(i * 3.1) * 30) % (this.width + 60);
        const y = (i * 211.7 + time / 12) % (this.height + 60);
        ctx.moveTo(this.width - x, y - 30);
        ctx.lineTo(this.width - x - 6, y - 14);
      }
      ctx.stroke();
      ctx.restore();
    }
    if (
      (weather.type === 'mist' || weather.type === 'cloud') &&
      weather.intensity > 0.05 &&
      !menu
    ) {
      ctx.save();
      const drift = this.reducedMotion ? 0 : Math.sin(time / 4200) * 60;
      for (let i = 0; i < 3; i++) {
        const gx = this.width * (0.25 + i * 0.25) + drift * (i % 2 ? 1 : -1);
        const gy = this.height * (0.3 + (i % 2) * 0.3);
        const radius = Math.max(this.width, this.height) * 0.42;
        const fog = ctx.createRadialGradient(gx, gy, 10, gx, gy, radius);
        const alpha = (weather.type === 'mist' ? 0.14 : 0.07) * weather.intensity;
        fog.addColorStop(0, `rgba(200,215,205,${alpha})`);
        fog.addColorStop(1, 'rgba(200,215,205,0)');
        ctx.fillStyle = fog;
        ctx.fillRect(0, 0, this.width, this.height);
      }
      ctx.restore();
    }
  }
  drawAtmosphere(game, time, menu) {
    const ctx = this.ctx,
      day = getDayInfo(game.elapsed),
      night = day.isNight && !menu;
    const count = this.quality === 'low' ? 9 : this.quality === 'high' ? 24 : 17;
    for (let i = 0; i < count; i++) {
      const x =
        (((i * 137.7 + Math.sin(time / 5500 + i) * 38 - this.camera.x * 0.25) % this.width) +
          this.width) %
        this.width;
      const y =
        (((i * 233.2 - time / (night ? 450 : 230) - this.camera.y * 0.1) % this.height) +
          this.height) %
        this.height;
      const alpha = (Math.sin(time / 1400 + i) + 1) * (night ? 0.26 : 0.11);
      ctx.fillStyle = night ? `rgba(190,230,150,${alpha})` : `rgba(221,225,162,${alpha})`;
      ctx.fillRect(x, y, night ? 2 : 1.5, night ? 2 : 1.5);
    }
    // Dawn mist breathes low over the ground.
    if (!menu && (day.dawn > 0.25 || day.phase < 0.12) && this.quality !== 'low') {
      ctx.save();
      const drift = this.reducedMotion ? 0 : Math.sin(time / 3600) * 40;
      const haze = ctx.createLinearGradient(0, this.height * 0.45, 0, this.height);
      haze.addColorStop(0, 'rgba(220,228,210,0)');
      haze.addColorStop(1, `rgba(220,228,210,${0.1 * Math.min(1, day.dawn + 0.4)})`);
      ctx.fillStyle = haze;
      ctx.fillRect(drift * 0.2, 0, this.width, this.height);
      ctx.restore();
    }
    // Light rays through the canopy at golden hours.
    if (!menu && day.warmth > 0.4 && this.quality === 'high') {
      ctx.save();
      ctx.globalAlpha = 0.1 * day.warmth;
      ctx.fillStyle = '#ffe9b8';
      ctx.beginPath();
      ctx.moveTo(this.width * 0.72, 0);
      ctx.lineTo(this.width * 0.84, 0);
      ctx.lineTo(this.width * 0.5, this.height);
      ctx.lineTo(this.width * 0.34, this.height);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    if (menu) {
      const gradient = ctx.createLinearGradient(this.width * 0.9, 0, this.width * 0.5, this.height);
      gradient.addColorStop(0, '#cfdb9b0d');
      gradient.addColorStop(1, '#cfdb9b00');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(this.width * 0.78, 0);
      ctx.lineTo(this.width * 0.93, 0);
      ctx.lineTo(this.width * 0.62, this.height);
      ctx.lineTo(this.width * 0.34, this.height);
      ctx.closePath();
      ctx.fill();
    }
  }
  drawParticles() {
    if (!this.particles.length) return;
    const ctx = this.ctx;
    ctx.save();
    for (const particle of this.particles) {
      const progress = particle.age / particle.life;
      ctx.globalAlpha = Math.max(0, 1 - progress * progress);
      ctx.fillStyle = particle.color;
      const size = particle.size * (1 - progress * 0.35);
      ctx.fillRect(Math.round(particle.x), Math.round(particle.y), size, size);
    }
    ctx.restore();
  }

  // ---- 5.1: creatures, combat and camp -----------------------------------
  /** Stable per-creature variation, so one stalker never looks like the next. */
  creatureVariant(enemy) {
    let h = 2166136261;
    for (let i = 0; i < enemy.id.length; i++) {
      h ^= enemy.id.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return ((h >>> 0) % 1000) / 1000;
  }
  drawEnemy(enemy, time) {
    const config = ENEMIES[enemy.type];
    if (!config) return;
    drawCreature(
      this.ctx,
      enemy.type,
      enemy.x,
      enemy.y,
      this.creatureVariant(enemy),
      {
        state: enemy.state,
        facing: enemy.facing,
        flash: enemy.flash,
        alert: enemy.alert,
        moving: !!(enemy.vx || enemy.vy),
      },
      time,
    );
  }
  // Health bars only appear where they carry information: an enemy that has
  // been hit, or an elite. Nothing floats over an untouched animal.
  drawEnemyBars(enemies, time) {
    const ctx = this.ctx;
    const HEIGHTS = {
      stalker: 42,
      guardian: 96,
      nightling: 48,
      sporeling: 46,
      groveKeeper: 136,
    };
    for (const enemy of enemies) {
      if (!enemy.alive || enemy.health >= enemy.maxHealth) continue;
      const y = enemy.y - (HEIGHTS[enemy.type] ?? 46);
      const width = enemy.elite ? 54 : 30;
      const ratio = clamp(enemy.health / enemy.maxHealth, 0, 1);
      ctx.fillStyle = 'rgba(12,22,18,0.62)';
      ctx.fillRect(Math.round(enemy.x - width / 2), Math.round(y), width, enemy.elite ? 6 : 4);
      ctx.fillStyle = enemy.elite ? '#e0836a' : '#cfd8a6';
      ctx.fillRect(
        Math.round(enemy.x - width / 2 + 1),
        Math.round(y + 1),
        (width - 2) * ratio,
        enemy.elite ? 4 : 2,
      );
      if (enemy.flash > 0) {
        ctx.fillStyle = `rgba(255,255,255,${Math.min(0.5, enemy.flash)})`;
        ctx.fillRect(Math.round(enemy.x - width / 2), Math.round(y), width, enemy.elite ? 6 : 4);
      }
    }
  }
  drawProjectiles(game, time) {
    const shots = game.enemies?.projectiles;
    if (!shots?.length) return;
    const ctx = this.ctx;
    for (const shot of shots) {
      if (shot.type === 'sporeling') drawSporeShot(ctx, shot.x, shot.y, shot.age);
      else {
        ctx.fillStyle = '#d8c7a0';
        ctx.beginPath();
        ctx.arc(shot.x, shot.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  // Ground decals for every wind-up. This is the promise the player reacts to.
  drawTelegraphs(game, time) {
    if (!game.enemies?.enemies?.length) return;
    const ctx = this.ctx;
    for (const enemy of game.enemies.enemies) {
      if (enemy.state !== 'windup') continue;
      const config = ENEMIES[enemy.type];
      if (!config) continue;
      const progress = clamp(enemy.stateTime / config.windup, 0, 1);
      drawTelegraphRing(
        ctx,
        enemy.x,
        enemy.y,
        config.slam?.radius ?? config.attackRange + 22,
        progress,
        !!config.elite,
      );
    }
  }
  addCombatFx(kind, data) {
    if (!this.motionEffects) return;
    if (this.combatFx.length > 24) this.combatFx.shift();
    this.combatFx.push({ kind, born: performance.now(), ...data });
  }
  drawCombatFx(game, time) {
    if (!this.combatFx.length && !this.slashes?.length) return;
    const now = performance.now();
    this.combatFx = this.combatFx.filter((fx) => now - fx.born < 420);
    for (const fx of this.combatFx) {
      const progress = clamp((now - fx.born) / (fx.ttl ?? 320), 0, 1);
      if (fx.kind === 'slash')
        drawSlashArc(this.ctx, fx.x, fx.y, fx.angle ?? 0, progress, fx.reach ?? 56);
      else if (fx.kind === 'dodge') {
        this.ctx.fillStyle = `rgba(220,228,196,${0.25 * (1 - progress)})`;
        this.ctx.beginPath();
        this.ctx.ellipse(fx.x, fx.y, 16 + progress * 22, 7 + progress * 8, 0, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
  }
  // The camp reads as settled ground even before anything is built on it.
  drawCampGround(game, time) {
    const home = game.home;
    if (!home) {
      this.campGlow = 0;
      return;
    }
    const ctx = this.ctx;
    const day = getDayInfo(game.elapsed);
    const night = day.nightFactor;
    if (!this.campWash || this.campWash.x !== home.x || this.campWash.y !== home.y) {
      const gradient = ctx.createRadialGradient(home.x, home.y, 24, home.x, home.y, CAMP_RADIUS);
      gradient.addColorStop(0, 'rgba(214,186,120,0.16)');
      gradient.addColorStop(0.6, 'rgba(206,180,124,0.08)');
      gradient.addColorStop(1, 'rgba(206,180,124,0)');
      this.campWash = { x: home.x, y: home.y, gradient };
    }
    ctx.save();
    ctx.globalAlpha = 0.55 + night * 0.45;
    ctx.fillStyle = this.campWash.gradient;
    ctx.beginPath();
    ctx.arc(home.x, home.y, CAMP_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // A lit beacon lifts the whole camp out of the dark.
    this.campGlow = game.flags?.beaconLit ? 0.1 * night + 0.02 : 0;
  }
  // Tree trunks framing the grove, plus the shafts of light between them.
  drawGroveArches(ctx, x, y, time) {
    for (const side of [-1, 1]) {
      const tx = x + side * 132;
      ctx.fillStyle = '#3a2f24';
      ctx.beginPath();
      ctx.moveTo(tx - 12, y + 6);
      ctx.quadraticCurveTo(tx - 18, y - 70, tx - side * 26, y - 108);
      ctx.lineTo(tx - side * 12, y - 112);
      ctx.quadraticCurveTo(tx - 2, y - 70, tx + 12, y + 6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#2c4f3a';
      ctx.beginPath();
      ctx.ellipse(tx - side * 30, y - 120, 46, 26, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (this.quality === 'low') return;
    ctx.save();
    ctx.globalAlpha = 0.1 + Math.sin(time / 3200) * 0.02;
    ctx.fillStyle = '#e6f5d8';
    ctx.beginPath();
    ctx.moveTo(x - 30, y - 150);
    ctx.lineTo(x + 30, y - 150);
    ctx.lineTo(x + 66, y + 10);
    ctx.lineTo(x - 66, y + 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  // Cold and injury are the two states the player must never miss.
  drawWarmth(game, menu, time) {
    if (menu) return;
    const ctx = this.ctx;
    const warmth = game.player.warmth ?? 100;
    const health = game.player.health ?? 100;
    this.warmthPulse = (this.warmthPulse ?? 0) + 0.016;
    if (!this.vignette.cold) {
      const cold = ctx.createRadialGradient(
        this.width / 2,
        this.height / 2,
        Math.min(this.width, this.height) * 0.28,
        this.width / 2,
        this.height / 2,
        Math.max(this.width, this.height) * 0.72,
      );
      cold.addColorStop(0, 'rgba(120,180,220,0)');
      cold.addColorStop(1, 'rgba(120,180,220,0.42)');
      this.vignette.cold = cold;
      const hurt = ctx.createRadialGradient(
        this.width / 2,
        this.height / 2,
        Math.min(this.width, this.height) * 0.3,
        this.width / 2,
        this.height / 2,
        Math.max(this.width, this.height) * 0.7,
      );
      hurt.addColorStop(0, 'rgba(150,40,40,0)');
      hurt.addColorStop(1, 'rgba(150,40,40,0.4)');
      this.vignette.hurt = hurt;
    }
    if (warmth < 45) {
      const strength =
        (1 - warmth / 45) * (this.reducedMotion ? 0.7 : 0.75 + Math.sin(this.warmthPulse) * 0.12);
      ctx.save();
      ctx.globalAlpha = clamp(strength, 0, 0.8);
      ctx.fillStyle = this.vignette.cold;
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.restore();
    }
    if (health < 32) {
      const strength = (1 - health / 32) * 0.85;
      ctx.save();
      ctx.globalAlpha = clamp(strength, 0, 0.85);
      ctx.fillStyle = this.vignette.hurt;
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.restore();
    }
  }
  // Fireflies and the mist surge: the two events that are pure atmosphere.
  drawEventLayer(game, time, camX, camY) {
    const event = game.worldEvent?.();
    if (!event || this.quality === 'low') return;
    if (event.type === 'fireflies') {
      const ctx = this.ctx;
      ctx.save();
      ctx.scale(this.zoom, this.zoom);
      ctx.translate(-camX, -camY);
      drawFireflies(
        ctx,
        game.player.x,
        game.player.y,
        Math.round(10 + event.intensity * 14),
        time,
        game.world.seed,
      );
      ctx.restore();
    }
  }
  drawEffects(time) {
    const ctx = this.ctx;
    this.effects = this.effects.filter((e) => time - e.born < 1300);
    for (const effect of this.effects) {
      const progress = (time - effect.born) / 1300;
      ctx.save();
      ctx.globalAlpha = Math.min(1, (1 - progress) * 2);
      ctx.font = '600 10px "Be Vietnam Pro", sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#182b20';
      ctx.shadowBlur = 4;
      ctx.fillStyle = '#e7edca';
      ctx.fillText(effect.text, effect.x, effect.y - 44 - (this.reducedMotion ? 0 : progress * 28));
      ctx.restore();
    }
  }
}
