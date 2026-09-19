import { CHUNK_SIZE, RESOURCES, getDayInfo, clamp } from './config.js';

const ASSETS = {
  grass: 'assets/environment/grass.png',
  tree: 'assets/environment/tree.png',
  player: 'assets/sprites/player_walk_new.png',
};
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
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.camera = { x: 0, y: 0 };
    this.width = 0;
    this.height = 0;
    this.zoom = 1;
    this.images = {};
    this.frames = {};
    this.effects = [];
    this.light = surface(1, 1);
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.resize();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
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
    this.dpr = Math.min(
      window.devicePixelRatio || 1,
      2,
      Math.sqrt(8_000_000 / (this.width * this.height)),
    );
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.light.width = this.canvas.width;
    this.light.height = this.canvas.height;
    this.ctx.imageSmoothingEnabled = false;
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
  reset() {
    this.effects.length = 0;
  }
  render(game, { menu = false, target = null, placement = null, time = performance.now() } = {}) {
    const ctx = this.ctx,
      p = game.player;
    this.zoom = menu
      ? this.width < 700
        ? 1.5
        : 1.7
      : clamp(Math.min(this.width / 1000, this.height / 730), 1.1, 1.5);
    this.camera.x = p.x - (this.width * (menu ? 0.71 : 0.5)) / this.zoom;
    this.camera.y = p.y - (this.height * (menu ? 0.53 : 0.52)) / this.zoom;
    const bounds = {
      ...this.camera,
      width: this.width / this.zoom,
      height: this.height / this.zoom,
    };
    const world = game.world.getEntities(bounds, game.elapsed);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = '#435b3d';
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.save();
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.camera.x, -this.camera.y);
    ctx.fillStyle = this.ground || '#435b3d';
    ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
    this.drawGround(game, bounds);
    if (target && !menu && !game.placement) {
      ctx.strokeStyle = '#d7dea280';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(target.x, target.y + 2, 26, 12, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    const objects = [
      ...world,
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
      if (obj.type === 'player') this.drawPlayer(p, game.torchLit, time);
      else this.drawEntity(obj, time, p);
    }
    if (game.placement && placement && !menu) {
      const valid = game.canPlace(placement.x, placement.y);
      ctx.save();
      ctx.globalAlpha = 0.65;
      this.drawEntity({ ...placement, type: game.placement }, time, p);
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
    this.drawLight(game, menu, time);
    if (!this.reducedMotion) this.drawAtmosphere(game, time, menu);
    ctx.save();
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.camera.x, -this.camera.y);
    this.drawEffects(time);
    ctx.restore();
  }
  drawGround(game, bounds) {
    const ctx = this.ctx;
    // A soft clearing is anchored to the world rather than moving with the camera.
    const clearing = ctx.createRadialGradient(0, 0, 20, 0, 0, 185);
    clearing.addColorStop(0, '#8e8b5544');
    clearing.addColorStop(1, '#8e8b5500');
    ctx.fillStyle = clearing;
    ctx.fillRect(-185, -185, 370, 370);
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
        for (const d of game.world.getChunk(cx, cy).decorations) {
          ctx.save();
          ctx.translate(Math.round(d.x), Math.round(d.y));
          if (d.variant < 0.16) {
            ctx.fillStyle = '#9b98714a';
            ctx.beginPath();
            ctx.ellipse(0, 0, 18 + d.variant * 40, 10, -0.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#c0b88b42';
            ctx.fillRect(-8, -4, 4, 2);
            ctx.fillRect(6, 3, 3, 2);
          } else if (d.variant < 0.55) {
            ctx.strokeStyle = '#88a96e66';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-6, 2);
            ctx.lineTo(-9, -5);
            ctx.moveTo(-2, 3);
            ctx.lineTo(-3, -9);
            ctx.moveTo(2, 3);
            ctx.lineTo(6, -4);
            ctx.stroke();
          } else if (d.variant > 0.86) {
            ctx.fillStyle = '#344c30';
            ctx.fillRect(-2, -1, 4, 3);
            ctx.fillStyle = d.variant > 0.94 ? '#d5c594bb' : '#adb985aa';
            ctx.fillRect(-4, -4, 3, 3);
            ctx.fillRect(2, -6, 2, 2);
          }
          ctx.restore();
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
  drawEntity(entity, time, player) {
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
      const flicker = this.reducedMotion ? 0 : Math.sin(time / 110) * 3;
      ctx.fillStyle = '#c58945';
      ctx.beginPath();
      ctx.moveTo(x - 13, y - 3);
      ctx.quadraticCurveTo(x - 17, y - 13, x - 5, y - 26 - flicker);
      ctx.quadraticCurveTo(x - 4, y - 15, x + 2, y - 34 + flicker);
      ctx.quadraticCurveTo(x + 6, y - 20, x + 12, y - 13);
      ctx.quadraticCurveTo(x + 16, y + 3, x - 13, y - 3);
      ctx.fill();
      ctx.fillStyle = '#edc575';
      ctx.beginPath();
      ctx.moveTo(x - 7, y);
      ctx.quadraticCurveTo(x - 11, y - 9, x, y - 21);
      ctx.quadraticCurveTo(x, y - 8, x + 6, y - 10);
      ctx.quadraticCurveTo(x + 12, y + 2, x - 7, y);
      ctx.fill();
      ctx.fillStyle = '#fff0b1';
      ctx.beginPath();
      ctx.ellipse(x, y - 3, 4, 7, 0, 0, Math.PI * 2);
      ctx.fill();
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
    }
  }
  drawPlayer(player, torchLit, time) {
    const ctx = this.ctx,
      { x, y } = player;
    this.shadow(x, y, 14, 6);
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
    if (torchLit) {
      ctx.fillStyle = '#8d7245';
      ctx.fillRect(x + 15, y - 28, 3, 17);
      ctx.fillStyle = '#efc97f';
      ctx.beginPath();
      ctx.ellipse(x + 16, y - 33, 4, 7 + Math.sin(time / 150), 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  drawLight(game, menu, time) {
    const ctx = this.ctx;
    const day = getDayInfo(game.elapsed);
    const darkness = menu ? 0.06 : 0.68 * (1 - day.daylight);
    if (darkness < 0.02) return;
    const light = this.light.getContext('2d');
    light.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    light.clearRect(0, 0, this.width, this.height);
    light.globalCompositeOperation = 'source-over';
    light.fillStyle = `rgba(9, 23, 35, ${darkness})`;
    light.fillRect(0, 0, this.width, this.height);
    const lights = [
      {
        x: game.player.x,
        y: game.player.y - 20,
        radius: game.torchLit ? 190 : 60,
        strength: game.torchLit ? 1 : 0.6,
      },
      ...game.world.structures
        .filter((s) => s.type === 'campfire')
        .map((s) => ({ ...s, radius: 200, strength: 1 })),
    ];
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
  drawAtmosphere(game, time, menu) {
    const ctx = this.ctx,
      night = getDayInfo(game.elapsed).isNight && !menu;
    for (let i = 0; i < 17; i++) {
      const x =
        (((i * 137.7 + Math.sin(time / 5500 + i) * 38 - this.camera.x * 0.25) % this.width) +
          this.width) %
        this.width;
      const y =
        (((i * 233.2 - time / (night ? 450 : 230) - this.camera.y * 0.1) % this.height) +
          this.height) %
        this.height;
      const alpha = (Math.sin(time / 1400 + i) + 1) * (night ? 0.26 : 0.11);
      ctx.fillStyle = `rgba(221,225,162,${alpha})`;
      ctx.fillRect(x, y, night ? 2 : 1.5, night ? 2 : 1.5);
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
