// Code-generated artwork for Domeo 5.0. Every function is deterministic:
// same (variant, seed) inputs always draw the same picture. Runtime animation
// only uses the shared `time` phase passed by the renderer, never Math.random.
export function mulberry(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function sway(time, speed = 1, phase = 0) {
  return Math.sin(time / (900 / speed) + phase);
}

function ellipse(ctx, x, y, rx, ry, rotation = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2);
  ctx.fill();
}

// ---- small plants -------------------------------------------------------
export function drawFlower(ctx, x, y, variant = 0.5, scale = 1) {
  const rand = mulberry(Math.floor(variant * 100000));
  const petals = 5 + Math.floor(rand() * 3);
  const colors = ['#e8e4f0', '#f2c9d4', '#f5e3a8', '#d9c8f0'];
  const petal = colors[Math.floor(rand() * colors.length)];
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.strokeStyle = '#4d6b45';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -9);
  ctx.stroke();
  ctx.fillStyle = '#5d7f4e';
  ctx.beginPath();
  ctx.ellipse(-2.5, -4, 3, 1.6, -0.5, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2 + rand() * 0.3;
    ctx.fillStyle = petal;
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * 3.4, -11 + Math.sin(a) * 3.4, 2.6, 1.9, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#e8b84b';
  ctx.beginPath();
  ctx.arc(0, -11, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawGrassTuft(ctx, x, y, variant = 0.5, phase = 0, palette = '#88a96e') {
  const rand = mulberry(Math.floor(variant * 100000) + 7);
  const blades = 4 + Math.floor(rand() * 3);
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = palette;
  ctx.lineWidth = 1.3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i < blades; i++) {
    const bx = (rand() - 0.5) * 12;
    const h = 6 + rand() * 8;
    const lean = (rand() - 0.5) * 6 + phase * 2;
    ctx.moveTo(bx, 1);
    ctx.quadraticCurveTo(bx + lean * 0.4, -h * 0.6, bx + lean, -h);
  }
  ctx.stroke();
  ctx.restore();
}

export function drawMushroomCluster(ctx, x, y, variant = 0.5, remaining = 2, time = 0) {
  const rand = mulberry(Math.floor(variant * 99991) + 31);
  const spots = [
    [-9, 0, 1],
    [2, -2, 1.25],
    [11, 1, 0.85],
  ];
  const bob = Math.sin(time / 1400 + variant * 6) * 0.6;
  spots.slice(0, Math.max(1, remaining)).forEach(([dx, dy, s], i) => {
    const r = rand();
    const mx = x + dx,
      my = y + dy + bob * (i % 2 ? 1 : -1);
    ctx.fillStyle = '#152a244d';
    ctx.beginPath();
    ctx.ellipse(mx + 1, my + 1, 7 * s, 3 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8ddc4';
    ctx.fillRect(mx - 2.5 * s, my - 9 * s, 5 * s, 10 * s);
    ctx.fillStyle = '#c9bda0';
    ctx.fillRect(mx - 2.5 * s, my - 9 * s, 1.6 * s, 10 * s);
    const cap = r > 0.45 ? '#b9604f' : '#8a5f8f';
    const capDark = r > 0.45 ? '#8f4436' : '#684668';
    ctx.fillStyle = capDark;
    ctx.beginPath();
    ctx.ellipse(mx, my - 9 * s, 9 * s, 6.5 * s, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = cap;
    ctx.beginPath();
    ctx.ellipse(mx, my - 10 * s, 8 * s, 5.5 * s, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#f2e9d2';
    ctx.beginPath();
    ctx.arc(mx - 3 * s, my - 12 * s, 1.3 * s, 0, Math.PI * 2);
    ctx.arc(mx + 2.5 * s, my - 13.5 * s, 1 * s, 0, Math.PI * 2);
    ctx.arc(mx + 0.5 * s, my - 10.5 * s, 0.8 * s, 0, Math.PI * 2);
    ctx.fill();
  });
  if (remaining <= 0) {
    ctx.fillStyle = '#5d6b4d88';
    ctx.fillRect(x - 8, y - 2, 16, 3);
  }
}

export function drawHerbPlant(ctx, x, y, variant = 0.5, remaining = 2, time = 0) {
  const rand = mulberry(Math.floor(variant * 77777) + 91);
  const lean = Math.sin(time / 1100 + variant * 9) * 1.5;
  const stems = Math.max(1, remaining + 1);
  for (let i = 0; i < stems; i++) {
    const dx = (rand() - 0.5) * 22;
    const h = 14 + rand() * 10;
    const curve = (rand() - 0.5) * 8 + lean;
    ctx.strokeStyle = i % 2 ? '#5d8a52' : '#4d7a48';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + dx, y);
    ctx.quadraticCurveTo(x + dx + curve * 0.4, y - h * 0.6, x + dx + curve, y - h);
    ctx.stroke();
    const tipX = x + dx + curve,
      tipY = y - h;
    ctx.fillStyle = i % 2 ? '#7fb069' : '#93c47d';
    ctx.beginPath();
    ctx.ellipse(tipX - 3, tipY + 3, 4.5, 2.2, -0.6, 0, Math.PI * 2);
    ctx.ellipse(tipX + 3, tipY + 6, 4.5, 2.2, 0.6, 0, Math.PI * 2);
    ctx.fill();
    if (remaining > 0) {
      ctx.fillStyle = '#e9f2c8';
      ctx.beginPath();
      ctx.arc(tipX, tipY - 1, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (remaining <= 0) {
    ctx.fillStyle = '#4d6b45aa';
    ctx.fillRect(x - 9, y - 4, 18, 4);
  }
}

export function drawCrystalCluster(ctx, x, y, variant = 0.5, remaining = 2, time = 0) {
  const rand = mulberry(Math.floor(variant * 55555) + 17);
  const glint = 0.5 + 0.5 * Math.sin(time / 700 + variant * 12);
  const shards = [
    [-10, 0, 18, -0.25],
    [0, -2, 26, 0.08],
    [10, 0, 15, 0.3],
  ];
  ctx.fillStyle = '#152a244d';
  ctx.beginPath();
  ctx.ellipse(x + 2, y + 2, 20, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4a5248';
  ctx.beginPath();
  ctx.ellipse(x, y, 16, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  const count = remaining > 0 ? shards.length : 1;
  shards.slice(0, count).forEach(([dx, dy, h], i) => {
    const w = 7 + rand() * 3;
    const cx = x + dx,
      base = y + dy;
    const grad = ctx.createLinearGradient(cx, base, cx, base - h);
    grad.addColorStop(0, '#3d5a78');
    grad.addColorStop(0.55, '#6fa8c9');
    grad.addColorStop(1, '#cfeaf5');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(cx - w / 2, base);
    ctx.lineTo(cx - w / 2 + 1.5, base - h + 5);
    ctx.lineTo(cx, base - h);
    ctx.lineTo(cx + w / 2, base - h + 6);
    ctx.lineTo(cx + w / 2, base);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = `rgba(230,245,255,${0.25 + glint * 0.4})`;
    ctx.fillRect(cx - 1, base - h + 4 + i, 1.6, h * 0.5);
  });
  if (remaining > 0 && glint > 0.86) {
    ctx.fillStyle = '#ffffffcc';
    ctx.fillRect(x + 4, y - 24, 2, 2);
  }
}

// ---- structures ---------------------------------------------------------
export function drawLanternPost(ctx, x, y, time = 0, lit = true) {
  ctx.fillStyle = '#152a244d';
  ctx.beginPath();
  ctx.ellipse(x + 2, y + 2, 14, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4a3d2c';
  ctx.fillRect(x - 3, y - 52, 6, 54);
  ctx.fillStyle = '#6b5a3e';
  ctx.fillRect(x - 3, y - 52, 2, 54);
  ctx.fillStyle = '#3a3226';
  ctx.beginPath();
  ctx.moveTo(x - 9, y - 52);
  ctx.lineTo(x + 9, y - 52);
  ctx.lineTo(x + 5, y - 58);
  ctx.lineTo(x - 5, y - 58);
  ctx.closePath();
  ctx.fill();
  const flicker = lit ? Math.sin(time / 130) * 1.2 : 0;
  ctx.fillStyle = '#2c3844';
  ctx.fillRect(x - 7, y - 48, 14, 20);
  if (lit) {
    const glow = ctx.createRadialGradient(x, y - 38, 1, x, y - 38, 16);
    glow.addColorStop(0, '#ffe9ad');
    glow.addColorStop(0.5, '#e8a95a');
    glow.addColorStop(1, '#e8a95a00');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 16, y - 54 + flicker, 32, 32);
    ctx.fillStyle = '#ffedbe';
    ctx.beginPath();
    ctx.ellipse(x, y - 38 + flicker * 0.4, 4, 7, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = '#5a6a78';
    ctx.fillRect(x - 4, y - 44, 8, 12);
  }
  ctx.strokeStyle = '#2c2620';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x - 7, y - 48, 14, 20);
  ctx.fillStyle = '#2c2620';
  ctx.fillRect(x - 2, y - 28, 4, 4);
}

// ---- fire ----------------------------------------------------------------
export function drawFire(ctx, x, y, scale = 1, time = 0, reducedMotion = false) {
  const flicker = reducedMotion ? 0 : Math.sin(time / 110) * 3;
  const swayX = reducedMotion ? 0 : Math.sin(time / 260) * 1.5;
  ctx.save();
  ctx.translate(x + swayX, y);
  ctx.scale(scale, scale);
  const outer = ctx.createRadialGradient(0, -8, 2, 0, -8, 30);
  outer.addColorStop(0, 'rgba(255,190,90,0.55)');
  outer.addColorStop(1, 'rgba(255,140,60,0)');
  ctx.fillStyle = outer;
  ctx.beginPath();
  ctx.arc(0, -8, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c58945';
  ctx.beginPath();
  ctx.moveTo(-13, -3);
  ctx.quadraticCurveTo(-17, -13, -5, -26 - flicker);
  ctx.quadraticCurveTo(-4, -15, 2, -34 + flicker);
  ctx.quadraticCurveTo(6, -20, 12, -13);
  ctx.quadraticCurveTo(16, 3, -13, -3);
  ctx.fill();
  ctx.fillStyle = '#edc575';
  ctx.beginPath();
  ctx.moveTo(-7, 0);
  ctx.quadraticCurveTo(-11, -9, 0, -21 - flicker * 0.5);
  ctx.quadraticCurveTo(0, -8, 6, -10);
  ctx.quadraticCurveTo(12, 2, -7, 0);
  ctx.fill();
  ctx.fillStyle = '#fff0b1';
  ctx.beginPath();
  ctx.ellipse(0, -3, 4, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ---- tree overlays (legacy PNG stays, code adds identity) -----------------
export function drawTreeOverlay(ctx, x, y, width, height, variant = 0.5, biome = 'woodland') {
  const rand = mulberry(Math.floor(variant * 88888) + 5);
  if (biome === 'mistgrove' || biome === 'ancient') {
    ctx.fillStyle = biome === 'ancient' ? '#6fae6a55' : '#9fc4b055';
    for (let i = 0; i < 4; i++) {
      const mx = x - width * 0.22 + rand() * width * 0.44;
      const my = y - height * 0.25 - rand() * height * 0.45;
      ctx.beginPath();
      ctx.ellipse(mx, my, 6 + rand() * 8, 4 + rand() * 5, rand(), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (variant > 0.78) {
    ctx.fillStyle = '#f2d8e055';
    for (let i = 0; i < 5; i++) {
      const fx = x - width * 0.25 + rand() * width * 0.5;
      const fy = y - height * 0.4 - rand() * height * 0.4;
      ctx.fillRect(fx, fy, 2.5, 2.5);
    }
  }
  if (biome === 'rocky') {
    ctx.fillStyle = '#00000022';
    ctx.fillRect(x - 6, y - 26, 12, 26);
  }
}

export function drawAncientTree(ctx, x, y, variant = 0.5, time = 0) {
  const rand = mulberry(Math.floor(variant * 44444) + 3);
  const breath = Math.sin(time / 2400 + variant * 5) * 1.5;
  ctx.fillStyle = '#152a2455';
  ctx.beginPath();
  ctx.ellipse(x + 6, y + 4, 52, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4a3a28';
  ctx.beginPath();
  ctx.moveTo(x - 26, y + 2);
  ctx.quadraticCurveTo(x - 30, y - 70, x - 18, y - 120);
  ctx.lineTo(x + 18, y - 120);
  ctx.quadraticCurveTo(x + 30, y - 70, x + 26, y + 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#5d4c34';
  for (let i = 0; i < 5; i++) {
    const rx = x - 18 + rand() * 36;
    ctx.fillRect(rx, y - 110 + rand() * 30, 2.5, 60 + rand() * 40);
  }
  ctx.fillStyle = '#3d5238';
  for (const [dx, dy, rx, ry] of [
    [-34, -138, 44, 30],
    [30, -142, 46, 32],
    [0, -162 + breath, 52, 36],
    [-8, -120, 40, 24],
  ]) {
    ctx.beginPath();
    ctx.ellipse(x + dx, y + dy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#557a4a66';
  for (let i = 0; i < 8; i++) {
    const lx = x - 50 + rand() * 100;
    const ly = y - 170 + rand() * 50;
    ctx.beginPath();
    ctx.ellipse(lx, ly, 10 + rand() * 10, 6 + rand() * 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (variant > 0.4) {
    ctx.fillStyle = '#ffe9ad88';
    for (let i = 0; i < 4; i++) {
      const fx = x - 40 + rand() * 80;
      const fy = y - 160 + rand() * 40;
      ctx.fillRect(fx, fy, 2, 2);
    }
  }
}

// ---- landmarks ------------------------------------------------------------
export function drawLandmark(ctx, type, x, y, variant = 0.5, time = 0, night = false) {
  switch (type) {
    case 'stoneCircle':
      return drawStoneCircle(ctx, x, y, variant);
    case 'oldCamp':
      return drawOldCamp(ctx, x, y, variant);
    case 'shrine':
      return drawShrine(ctx, x, y, variant, time, night);
    case 'ancientTree':
      return drawAncientTree(ctx, x, y, variant, time);
    case 'pond':
      return drawPond(ctx, x, y, variant, time);
    case 'giantRock':
      return drawGiantRock(ctx, x, y, variant);
    default:
      return drawStoneCircle(ctx, x, y, variant);
  }
}

function drawStoneCircle(ctx, x, y, variant) {
  const rand = mulberry(Math.floor(variant * 33333) + 11);
  ctx.fillStyle = '#152a244d';
  ctx.beginPath();
  ctx.ellipse(x, y + 2, 58, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7a7a5e33';
  ctx.beginPath();
  ctx.ellipse(x, y, 48, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + variant;
    const sx = x + Math.cos(a) * 44;
    const sy = y + Math.sin(a) * 15;
    const h = 22 + rand() * 18;
    const w = 10 + rand() * 5;
    ctx.fillStyle = '#152a2433';
    ctx.beginPath();
    ctx.ellipse(sx + 2, sy + 2, w * 0.8, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6f7a6c';
    ctx.beginPath();
    ctx.moveTo(sx - w / 2, sy);
    ctx.lineTo(sx - w / 2 + 2, sy - h);
    ctx.lineTo(sx + w / 2 - 2, sy - h - 3);
    ctx.lineTo(sx + w / 2, sy);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#9aa394';
    ctx.fillRect(sx - w / 2 + 2, sy - h, 3, h * 0.7);
    if (rand() > 0.5) {
      ctx.fillStyle = '#5d7a4e88';
      ctx.fillRect(sx - 3, sy - 8, 5, 6);
    }
  }
  ctx.fillStyle = '#8f9a8a';
  ctx.beginPath();
  ctx.ellipse(x, y - 2, 8, 5, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawOldCamp(ctx, x, y, variant) {
  const rand = mulberry(Math.floor(variant * 22222) + 21);
  ctx.fillStyle = '#716c5333';
  ctx.beginPath();
  ctx.ellipse(x, y, 52, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.fillStyle = i % 2 ? '#7a7560' : '#8a8570';
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(a) * 20, y + Math.sin(a) * 10, 5.5, 4, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#3d3830';
  ctx.beginPath();
  ctx.ellipse(x, y, 13, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5a544a';
  ctx.fillRect(x - 8, y - 4, 16, 3);
  for (let i = 0; i < 3; i++) {
    const lx = x - 30 + rand() * 60;
    const ly = y + 6 + rand() * 10;
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(rand() - 0.5);
    ctx.fillStyle = '#5d4e38';
    ctx.fillRect(-14, -3, 28, 6);
    ctx.fillStyle = '#8a7850';
    ctx.fillRect(-14, -3, 28, 2);
    ctx.restore();
  }
  ctx.fillStyle = '#4a5a40';
  ctx.save();
  ctx.translate(x + 34, y - 6);
  ctx.rotate(0.12);
  ctx.fillRect(-2, -30, 4, 32);
  ctx.fillStyle = '#6b5a3e';
  ctx.fillRect(-12, -34, 24, 10);
  ctx.fillStyle = '#3d3224';
  ctx.fillRect(-12, -30, 24, 1.5);
  ctx.restore();
}

function drawShrine(ctx, x, y, variant, time, night) {
  const glow = night ? 0.5 + 0.3 * Math.sin(time / 900) : 0.25;
  ctx.fillStyle = '#152a244d';
  ctx.beginPath();
  ctx.ellipse(x, y + 2, 34, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#6f7a6c';
  ctx.fillRect(x - 20, y - 8, 40, 10);
  ctx.fillStyle = '#7d887a';
  ctx.fillRect(x - 16, y - 34, 32, 28);
  ctx.fillStyle = '#8f9a8a';
  ctx.beginPath();
  ctx.moveTo(x - 20, y - 34);
  ctx.lineTo(x, y - 46);
  ctx.lineTo(x + 20, y - 34);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#3d4a42';
  ctx.fillRect(x - 7, y - 26, 14, 20);
  const grad = ctx.createRadialGradient(x, y - 16, 1, x, y - 16, 14);
  grad.addColorStop(0, `rgba(190,230,255,${0.5 + glow * 0.4})`);
  grad.addColorStop(1, 'rgba(120,180,220,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(x - 14, y - 30, 28, 28);
  ctx.fillStyle = '#cfe8f5';
  ctx.beginPath();
  ctx.arc(x, y - 16, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5d7a4e99';
  ctx.fillRect(x - 16, y - 10, 6, 5);
  ctx.fillRect(x + 10, y - 12, 5, 4);
}

function drawPond(ctx, x, y, variant, time) {
  const rand = mulberry(Math.floor(variant * 11111) + 41);
  ctx.fillStyle = '#152a2433';
  ctx.beginPath();
  ctx.ellipse(x, y + 2, 66, 30, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#6b7a5e';
  ctx.beginPath();
  ctx.ellipse(x, y, 60, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  const water = ctx.createLinearGradient(x, y - 22, x, y + 22);
  water.addColorStop(0, '#5d8a9a');
  water.addColorStop(0.5, '#3d6a80');
  water.addColorStop(1, '#2c4f63');
  ctx.fillStyle = water;
  ctx.beginPath();
  ctx.ellipse(x, y, 52, 21, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(220,240,250,0.35)';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 3; i++) {
    const phase = (time / 2200 + variant * 2 + i * 0.33) % 1;
    const rx = 8 + phase * 36;
    const ry = 3 + phase * 13;
    ctx.globalAlpha = Math.max(0, 0.5 - phase * 0.5);
    ctx.beginPath();
    ctx.ellipse(x + Math.sin(variant * 9 + i) * 10, y + (i - 1) * 4, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(230,245,255,0.5)';
  ctx.fillRect(x - 20, y - 8, 14, 1.5);
  ctx.fillRect(x + 8, y + 4, 10, 1.5);
  for (let i = 0; i < 4; i++) {
    const a = rand() * Math.PI * 2;
    const rx = 58 + rand() * 8;
    const bx = x + Math.cos(a) * rx;
    const by = y + Math.sin(a) * rx * 0.42;
    ctx.fillStyle = '#4d6b45';
    ctx.fillRect(bx - 1, by - 8, 2, 9);
    ctx.fillRect(bx - 4, by - 6, 2, 7);
    ctx.fillRect(bx + 2, by - 7, 2, 8);
  }
}

function drawGiantRock(ctx, x, y, variant) {
  const rand = mulberry(Math.floor(variant * 66666) + 51);
  ctx.fillStyle = '#152a2455';
  ctx.beginPath();
  ctx.ellipse(x + 4, y + 3, 46, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5d665f';
  ctx.beginPath();
  ctx.moveTo(x - 44, y + 4);
  ctx.lineTo(x - 40, y - 34);
  ctx.lineTo(x - 18, y - 62);
  ctx.lineTo(x + 14, y - 68);
  ctx.lineTo(x + 40, y - 30);
  ctx.lineTo(x + 44, y + 5);
  ctx.lineTo(x + 12, y + 12);
  ctx.lineTo(x - 24, y + 11);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#8a9484';
  ctx.beginPath();
  ctx.moveTo(x - 40, y - 34);
  ctx.lineTo(x - 18, y - 62);
  ctx.lineTo(x + 14, y - 68);
  ctx.lineTo(x + 6, y - 30);
  ctx.lineTo(x - 14, y - 12);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#a8b0a2';
  ctx.fillRect(x - 16, y - 56, 12, 3);
  ctx.fillRect(x - 8, y - 40, 8, 2.5);
  ctx.fillStyle = '#465d40';
  ctx.fillRect(x + 8, y + 2, 18, 7);
  ctx.fillRect(x + 18, y - 3, 14, 6);
  if (variant > 0.3) {
    ctx.fillStyle = '#9fd4e8';
    for (let i = 0; i < 3; i++) {
      const cx = x - 20 + rand() * 40;
      const cy = y - 40 + rand() * 25;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rand() - 0.5);
      ctx.fillRect(-2, -8, 4, 10);
      ctx.beginPath();
      ctx.moveTo(-2, -8);
      ctx.lineTo(0, -12);
      ctx.lineTo(2, -8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
}

// ---- 5.1 creatures --------------------------------------------------------
// Every creature is drawn from the same ingredients as the rest of the game:
// silhouette first, then a palette, a highlight, a shadow, and one animation
// state that reads at a glance. `state.state` is the AI state, so the picture
// always matches what the creature is actually about to do.

function legs(ctx, x, y, count, spread, phase, palette, height = 8) {
  ctx.fillStyle = palette;
  for (let i = 0; i < count; i++) {
    const offset = (i - (count - 1) / 2) * spread;
    const lift = Math.sin(phase + i * 1.3) * 1.6;
    ctx.fillRect(x + offset - 1.6, y - 2 + lift, 3.2, height);
  }
}

function eyes(ctx, x, y, spread, color, glow = 1) {
  ctx.fillStyle = color;
  ctx.globalAlpha = glow;
  ctx.fillRect(x - spread - 2, y, 3, 2.6);
  ctx.fillRect(x + spread - 1, y, 3, 2.6);
  ctx.globalAlpha = 1;
}

export function drawStalker(ctx, x, y, variant = 0.5, state = {}, time = 0) {
  const rand = mulberry(Math.floor(variant * 90001) + 13);
  const walk = state.moving ? Math.sin(time / 90) : Math.sin(time / 900) * 0.4;
  const crouch = state.state === 'windup' ? 6 : state.state === 'chase' ? 2 : 0;
  const flash = state.flash > 0;
  const body = flash ? '#e8e6dc' : '#2b3a2c';
  const back = flash ? '#f2efe4' : state.state === 'notice' ? '#4a6140' : '#3a5138';
  const bob = Math.sin(time / 260) * 0.8;
  ctx.save();
  ctx.translate(x, y - crouch + bob);
  const facing = state.facing === 'left' ? -1 : 1;
  ctx.scale(facing, 1);
  ctx.fillStyle = '#152a2444';
  ctx.beginPath();
  ctx.ellipse(0, 4, 21, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  legs(ctx, 0, 2, 4, 9, walk, flash ? '#cfcabb' : '#232f24', 9 - crouch * 0.4);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(-2, -4, 19, 8.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(12, -6);
  ctx.lineTo(24, -10 + Math.sin(time / 200) * 2);
  ctx.lineTo(23, -4 + Math.sin(time / 200) * 2);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-14, -8);
  ctx.quadraticCurveTo(-26, -16 + Math.sin(time / 240) * 3, -30, -30);
  ctx.quadraticCurveTo(-22, -20, -16, -12);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = back;
  ctx.beginPath();
  ctx.ellipse(-2, -8, 15, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Head and ears.
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(16, -9, 9, 7, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(11, -14);
  ctx.lineTo(13, -22);
  ctx.lineTo(17, -14);
  ctx.closePath();
  ctx.moveTo(18, -14);
  ctx.lineTo(21, -21);
  ctx.lineTo(23, -13);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = state.state === 'notice' || state.state === 'chase' ? '#f4d68a' : '#c9a75f';
  ctx.beginPath();
  ctx.moveTo(24, -8);
  ctx.lineTo(28, -7);
  ctx.lineTo(24, -5);
  ctx.closePath();
  ctx.fill();
  eyes(ctx, 18, -11, 3, state.state === 'windup' ? '#ff9a6a' : '#e8d27a', 0.75 + (flash ? 0.4 : 0));
  // Mossy shoulder accents keep it part of this forest, not a generic wolf.
  ctx.fillStyle = '#5d7a4e88';
  ctx.fillRect(-9, -12, 5, 3);
  ctx.fillRect(3, -11, 4, 2.5);
  ctx.restore();
}

export function drawStoneGuardian(ctx, x, y, variant = 0.5, state = {}, time = 0) {
  const rand = mulberry(Math.floor(variant * 55555) + 71);
  const step = state.moving ? Math.sin(time / 150) : 0;
  const raise = state.state === 'windup' ? 14 : state.state === 'strike' ? -6 : 0;
  const flash = state.flash > 0;
  const rock = flash ? '#f0ece2' : '#6d756b';
  const rockLight = flash ? '#ffffff' : '#98a091';
  const core = state.state === 'windup' ? '#ffd9a0' : '#9fd4e8';
  ctx.save();
  ctx.translate(x, y + Math.sin(time / 420) * 0.6);
  ctx.fillStyle = '#152a244d';
  ctx.beginPath();
  ctx.ellipse(0, 3, 28, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  // Legs and feet stay chunky: this thing should feel heavy.
  ctx.fillStyle = '#575f57';
  ctx.fillRect(-19 + step * 2, -12, 13, 15);
  ctx.fillRect(6 - step * 2, -12, 13, 15);
  ctx.fillStyle = rock;
  ctx.beginPath();
  ctx.moveTo(-25, -16);
  ctx.lineTo(-19, -52);
  ctx.lineTo(19, -54);
  ctx.lineTo(26, -14);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rockLight;
  ctx.beginPath();
  ctx.moveTo(-19, -52);
  ctx.lineTo(19, -54);
  ctx.lineTo(12, -40);
  ctx.lineTo(-14, -38);
  ctx.closePath();
  ctx.fill();
  // shoulders and arms
  ctx.fillStyle = '#5f685e';
  ctx.beginPath();
  ctx.ellipse(-22, -50 - raise * 0.4, 12, 9, 0.3, 0, Math.PI * 2);
  ctx.ellipse(22, -51 - raise * 0.4, 12, 9, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rock;
  ctx.fillRect(-32, -48 + raise * 0.2, 12, 26 - raise);
  ctx.fillRect(20, -49 + raise * 0.2, 12, 26 - raise);
  ctx.fillStyle = '#4c554d';
  ctx.fillRect(-34, -24 + raise * 0.2 - raise * 0.4, 16, 10);
  ctx.fillRect(18, -25 + raise * 0.2 - raise * 0.4, 16, 10);
  // head
  ctx.fillStyle = rockLight;
  ctx.beginPath();
  ctx.moveTo(-12, -66);
  ctx.lineTo(-6, -84);
  ctx.lineTo(8, -86);
  ctx.lineTo(14, -68);
  ctx.closePath();
  ctx.fill();
  eyes(ctx, 0, -76, 5, core, 0.85);
  // glowing core, mossy back
  const glow = ctx.createRadialGradient(0, -40, 1, 0, -40, 16);
  glow.addColorStop(0, core);
  glow.addColorStop(1, 'rgba(159,212,232,0)');
  ctx.fillStyle = glow;
  ctx.globalAlpha = 0.5 + Math.sin(time / 600) * 0.12;
  ctx.beginPath();
  ctx.arc(0, -40, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.moveTo(-4, -46);
  ctx.lineTo(3, -40);
  ctx.lineTo(-2, -33);
  ctx.lineTo(5, -38);
  ctx.lineTo(2, -31);
  ctx.lineTo(-4, -37);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#4e6b45aa';
  ctx.fillRect(-16, -46, 12, 5);
  ctx.fillRect(8, -49, 8, 4);
  ctx.fillRect(-9, -22, 10, 4);
  ctx.restore();
}

export function drawNightling(ctx, x, y, variant = 0.5, state = {}, time = 0) {
  const rand = mulberry(Math.floor(variant * 77777) + 29);
  const float = Math.sin(time / 520 + variant * 8) * 4;
  const flash = state.flash > 0;
  const body = flash ? '#f4f2ff' : '#232a44';
  ctx.save();
  ctx.translate(x, y - 14 + float);
  ctx.fillStyle = '#10183033';
  ctx.beginPath();
  ctx.ellipse(0, 18 - float, 14, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Wisp body: a hood, then tattered ribbons that never settle.
  const sway = Math.sin(time / 300 + variant * 4) * 3;
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-13, 6);
  ctx.quadraticCurveTo(-16, -14, 0, -20);
  ctx.quadraticCurveTo(16, -14, 13, 6);
  ctx.quadraticCurveTo(6, 12, 0, 8);
  ctx.quadraticCurveTo(-6, 12, -13, 6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = flash ? '#dfe6ff' : '#323a5c';
  for (let i = 0; i < 4; i++) {
    const t = i / 3 - 0.5;
    const wobble = Math.sin(time / 260 + i * 1.1) * 2.5;
    ctx.beginPath();
    ctx.moveTo(t * 22, 6);
    ctx.quadraticCurveTo(t * 22 + wobble, 16, t * 20 + wobble * 1.6, 24 + sway * 0.4);
    ctx.lineTo(t * 22 + 4, 6);
    ctx.closePath();
    ctx.fill();
  }
  // Pale rim light and eyes: readable on a dark screen.
  const rim = ctx.createLinearGradient(0, -20, 0, 8);
  rim.addColorStop(0, flash ? '#ffffff' : '#8fa8dd99');
  rim.addColorStop(1, 'rgba(143,168,221,0)');
  ctx.fillStyle = rim;
  ctx.beginPath();
  ctx.moveTo(-13, 6);
  ctx.quadraticCurveTo(-16, -14, 0, -20);
  ctx.quadraticCurveTo(16, -14, 13, 6);
  ctx.quadraticCurveTo(0, 0, -13, 6);
  ctx.closePath();
  ctx.fill();
  eyes(ctx, 0, -10, 4, state.state === 'windup' ? '#ffd0e0' : '#cfe8f5', 0.9);
  ctx.restore();
}

export function drawSporeling(ctx, x, y, variant = 0.5, state = {}, time = 0) {
  const rand = mulberry(Math.floor(variant * 33331) + 37);
  const walk = state.moving ? Math.sin(time / 130) : 0;
  const puff = state.state === 'windup' ? 1 + Math.abs(Math.sin(time / 70)) * 0.35 : 1;
  const flash = state.flash > 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#152a2444';
  ctx.beginPath();
  ctx.ellipse(0, 3, 17, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = flash ? '#f2ece0' : '#d8cbaa';
  ctx.fillRect(-9 + walk, -16, 7, 17);
  ctx.fillRect(2 - walk, -16, 7, 17);
  ctx.fillStyle = flash ? '#fff6e4' : '#7d6b52';
  ctx.fillRect(-10 + walk, -4, 9, 5);
  ctx.fillRect(1 - walk, -4, 9, 5);
  // cap
  const cap = state.state === 'windup' ? '#c76a5c' : flash ? '#ffffff' : '#a8524c';
  ctx.fillStyle = '#4a3a33';
  ctx.beginPath();
  ctx.ellipse(0, -13, 8 * puff, 8 * puff, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = cap;
  ctx.beginPath();
  ctx.ellipse(0, -18, 21 * puff, 13 * puff, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = flash ? '#ffffff' : '#d8877d';
  ctx.beginPath();
  ctx.ellipse(-4, -22, 12 * puff, 6 * puff, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#f2e9d2';
  ctx.beginPath();
  ctx.arc(-8, -24, 2.2, 0, Math.PI * 2);
  ctx.arc(4, -26, 1.7, 0, Math.PI * 2);
  ctx.arc(12, -20, 1.4, 0, Math.PI * 2);
  ctx.fill();
  eyes(ctx, 0, -10, 4, state.state === 'windup' ? '#ffe9ad' : '#3d2f26', 1);
  ctx.restore();
}

export function drawGroveKeeper(ctx, x, y, variant = 0.5, state = {}, time = 0) {
  const rand = mulberry(Math.floor(variant * 22223) + 61);
  const breathe = Math.sin(time / 900) * 1.4;
  const raise = state.state === 'windup' ? 16 : 0;
  const flash = state.flash > 0;
  const bark = flash ? '#f4efe3' : '#4a3a28';
  ctx.save();
  ctx.translate(x, y + breathe * 0.3);
  ctx.fillStyle = '#152a2455';
  ctx.beginPath();
  ctx.ellipse(0, 4, 34, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  // Root-legs.
  ctx.fillStyle = '#3d3022';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 14, -6);
    ctx.quadraticCurveTo(side * 26, 0, side * 30, 4);
    ctx.lineTo(side * 12, 4);
    ctx.closePath();
    ctx.fill();
  }
  // Torso: a split trunk with a glowing heartwood.
  ctx.fillStyle = bark;
  ctx.beginPath();
  ctx.moveTo(-22, -8);
  ctx.quadraticCurveTo(-26, -60, -16, -96);
  ctx.lineTo(16, -96);
  ctx.quadraticCurveTo(26, -60, 22, -8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = flash ? '#ffffff' : '#5d4c34';
  for (let i = 0; i < 5; i++) {
    const bx = -18 + rand() * 36;
    ctx.fillRect(bx, -92 + rand() * 30, 2.6, 40 + rand() * 44);
  }
  const heart = ctx.createRadialGradient(0, -58, 2, 0, -58, 30);
  heart.addColorStop(0, state.state === 'windup' ? '#ffd9a0' : '#bff0d0');
  heart.addColorStop(1, 'rgba(191,240,208,0)');
  ctx.fillStyle = heart;
  ctx.globalAlpha = 0.55 + Math.sin(time / 700) * 0.15;
  ctx.beginPath();
  ctx.arc(0, -58, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = state.state === 'windup' ? '#ffe1ad' : '#a8e8bd';
  ctx.beginPath();
  ctx.moveTo(-6, -70);
  ctx.lineTo(5, -58);
  ctx.lineTo(-3, -44);
  ctx.lineTo(8, -54);
  ctx.lineTo(3, -40);
  ctx.lineTo(-7, -56);
  ctx.closePath();
  ctx.fill();
  // Arms: long branches that rise before a slam.
  ctx.strokeStyle = bark;
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 20, -80);
    ctx.quadraticCurveTo(
      side * (38 + raise * 0.2),
      -70 - raise * 0.6,
      side * (34 + raise * 0.3),
      -30 - raise,
    );
    ctx.stroke();
  }
  // Head with antlers.
  ctx.fillStyle = flash ? '#ffffff' : '#57462f';
  ctx.beginPath();
  ctx.moveTo(-12, -96);
  ctx.quadraticCurveTo(0, -112, 12, -96);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#6f5c3e';
  ctx.lineWidth = 3;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 8, -104);
    ctx.lineTo(side * 22, -128);
    ctx.moveTo(side * 15, -116);
    ctx.lineTo(side * 26, -110);
    ctx.stroke();
  }
  eyes(ctx, 0, -100, 5, '#cfe8f5', 0.9);
  ctx.fillStyle = '#4e7a4eaa';
  ctx.fillRect(-18, -86, 12, 5);
  ctx.fillRect(6, -74, 12, 5);
  ctx.restore();
}

export function drawCreature(ctx, type, x, y, variant, state, time) {
  switch (type) {
    case 'stalker':
      return drawStalker(ctx, x, y, variant, state, time);
    case 'guardian':
      return drawStoneGuardian(ctx, x, y, variant, state, time);
    case 'nightling':
      return drawNightling(ctx, x, y, variant, state, time);
    case 'sporeling':
      return drawSporeling(ctx, x, y, variant, state, time);
    case 'groveKeeper':
      return drawGroveKeeper(ctx, x, y, variant, state, time);
    default:
      return drawStalker(ctx, x, y, variant, state, time);
  }
}

// ---- 5.1 structures -------------------------------------------------------
export function drawWorkbench(ctx, x, y, time = 0) {
  ctx.fillStyle = '#152a244d';
  ctx.beginPath();
  ctx.ellipse(x + 3, y + 3, 34, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5c4a32';
  ctx.fillRect(x - 30, y - 26, 60, 7);
  ctx.fillStyle = '#8a7048';
  ctx.fillRect(x - 30, y - 26, 60, 3);
  ctx.fillStyle = '#4a3d2c';
  ctx.fillRect(x - 26, y - 19, 7, 20);
  ctx.fillRect(x + 19, y - 19, 7, 20);
  // A saw and a half-finished haft on the bench: it should read as a workshop.
  ctx.save();
  ctx.translate(x - 12, y - 30);
  ctx.rotate(-0.18 + Math.sin(time / 1400) * 0.02);
  ctx.fillStyle = '#b9c0bd';
  ctx.beginPath();
  ctx.moveTo(-13, 0);
  ctx.lineTo(11, -3);
  ctx.lineTo(13, 2);
  ctx.lineTo(-13, 4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#6f4b2f';
  ctx.fillRect(11, -3, 7, 6);
  ctx.restore();
  ctx.save();
  ctx.translate(x + 16, y - 30);
  ctx.rotate(0.35);
  ctx.fillStyle = '#7a6543';
  ctx.fillRect(-3, -8, 6, 18);
  ctx.fillStyle = '#a8b0a2';
  ctx.beginPath();
  ctx.moveTo(-6, -8);
  ctx.lineTo(6, -8);
  ctx.lineTo(0, -16);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#c9b27a';
  ctx.fillRect(x - 24, y - 24, 4, 3);
}

export function drawShelter(ctx, x, y, time = 0) {
  ctx.fillStyle = '#152a2455';
  ctx.beginPath();
  ctx.ellipse(x + 4, y + 4, 46, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  // A-frame tent of stitched leaves, with a warm slit at the front.
  ctx.fillStyle = '#3f5a3c';
  ctx.beginPath();
  ctx.moveTo(x - 44, y + 2);
  ctx.lineTo(x - 30, y - 52);
  ctx.lineTo(x + 30, y - 52);
  ctx.lineTo(x + 44, y + 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#4f7048';
  ctx.beginPath();
  ctx.moveTo(x - 30, y - 52);
  ctx.lineTo(x + 30, y - 52);
  ctx.lineTo(x + 22, y - 30);
  ctx.lineTo(x - 22, y - 30);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2f4430';
  ctx.beginPath();
  ctx.moveTo(x - 18, y + 2);
  ctx.lineTo(x - 7, y - 34);
  ctx.lineTo(x + 7, y - 34);
  ctx.lineTo(x + 18, y + 2);
  ctx.closePath();
  ctx.fill();
  const inner = ctx.createLinearGradient(x, y - 34, x, y);
  inner.addColorStop(0, 'rgba(255,196,120,0.55)');
  inner.addColorStop(1, 'rgba(255,150,80,0.05)');
  ctx.fillStyle = inner;
  ctx.beginPath();
  ctx.moveTo(x - 13, y + 1);
  ctx.lineTo(x - 5, y - 28);
  ctx.lineTo(x + 5, y - 28);
  ctx.lineTo(x + 13, y + 1);
  ctx.closePath();
  ctx.fill();
  // Ridge pole and lashings.
  ctx.strokeStyle = '#6b5a3e';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 34, y - 56);
  ctx.lineTo(x + 34, y - 56);
  ctx.stroke();
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (const dx of [-22, 0, 22]) {
    ctx.moveTo(x + dx, y - 56);
    ctx.lineTo(x + dx * 0.7, y - 30);
  }
  ctx.stroke();
  ctx.fillStyle = '#8fb06f88';
  ctx.fillRect(x - 40, y - 6, 10, 4);
  ctx.fillRect(x + 30, y - 4, 12, 4);
}

export function drawMapTable(ctx, x, y, time = 0) {
  ctx.fillStyle = '#152a244d';
  ctx.beginPath();
  ctx.ellipse(x + 3, y + 3, 30, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4a3d2c';
  ctx.fillRect(x - 24, y - 12, 6, 14);
  ctx.fillRect(x + 18, y - 12, 6, 14);
  ctx.fillStyle = '#6b5a3e';
  ctx.fillRect(x - 30, y - 20, 60, 9);
  ctx.fillStyle = '#8a7048';
  ctx.fillRect(x - 30, y - 20, 60, 3);
  // Parchment with a coastline, a river and two pins.
  ctx.fillStyle = '#e6dcc0';
  ctx.fillRect(x - 22, y - 18, 44, 6);
  ctx.fillStyle = '#c9bda0';
  ctx.fillRect(x - 22, y - 15, 44, 1.4);
  ctx.fillStyle = '#7d9c8c';
  ctx.fillRect(x - 18, y - 17, 12, 4);
  ctx.fillStyle = '#9fb0c4';
  ctx.fillRect(x - 2, y - 17, 9, 2);
  ctx.fillStyle = '#c47a66';
  ctx.fillRect(x + 12, y - 18, 3, 3);
  ctx.fillStyle = '#e0b96a';
  ctx.beginPath();
  ctx.arc(x - 16, y - 21, 2, 0, Math.PI * 2);
  ctx.fill();
  // A compass rose that keeps a slow, alive glint.
  ctx.save();
  ctx.translate(x + 20, y - 26);
  ctx.rotate(Math.sin(time / 2600) * 0.12);
  ctx.strokeStyle = '#c9b27a';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#e0b96a';
  ctx.beginPath();
  ctx.moveTo(0, -5);
  ctx.lineTo(2, 0);
  ctx.lineTo(0, 5);
  ctx.lineTo(-2, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawBeacon(ctx, x, y, time = 0, lit = false) {
  ctx.fillStyle = '#152a244d';
  ctx.beginPath();
  ctx.ellipse(x + 4, y + 3, 26, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  // Stone base, tapered tower, iron basket on top.
  ctx.fillStyle = '#5f685e';
  ctx.beginPath();
  ctx.ellipse(x, y, 24, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7d887a';
  ctx.beginPath();
  ctx.moveTo(x - 17, y);
  ctx.lineTo(x - 11, y - 74);
  ctx.lineTo(x + 11, y - 74);
  ctx.lineTo(x + 17, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#98a091';
  for (let i = 0; i < 5; i++) {
    const ty = y - i * 14 - 4;
    ctx.fillRect(x - 13 + (i % 2) * 2, ty, 12, 3);
  }
  ctx.fillStyle = '#3d4a42';
  ctx.fillRect(x - 9, y - 68, 18, 4);
  ctx.fillStyle = '#2c3844';
  ctx.beginPath();
  ctx.moveTo(x - 11, y - 74);
  ctx.lineTo(x + 11, y - 74);
  ctx.lineTo(x + 8, y - 88);
  ctx.lineTo(x - 8, y - 88);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#2c2620';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  if (lit) {
    const flame = 1 + (Math.sin(time / 130) + 1) * 0.1;
    const glow = ctx.createRadialGradient(x, y - 92, 2, x, y - 92, 60 * flame);
    glow.addColorStop(0, 'rgba(255,236,180,0.85)');
    glow.addColorStop(0.35, 'rgba(240,170,90,0.35)');
    glow.addColorStop(1, 'rgba(240,170,90,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y - 92, 60 * flame, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2c178';
    ctx.beginPath();
    ctx.moveTo(x - 7, y - 88);
    ctx.quadraticCurveTo(x - 3, y - 104 - flame * 3, x, y - 108 - flame * 4);
    ctx.quadraticCurveTo(x + 4, y - 102 - flame * 3, x + 7, y - 88);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff2c4';
    ctx.beginPath();
    ctx.ellipse(x, y - 94, 3.4, 7 * flame, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = '#5a6a78';
    ctx.fillRect(x - 5, y - 84, 10, 10);
  }
}

export function drawSeat(ctx, x, y) {
  ctx.fillStyle = '#152a2444';
  ctx.beginPath();
  ctx.ellipse(x + 2, y + 3, 18, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5c4a32';
  ctx.fillRect(x - 16, y - 20, 32, 7);
  ctx.fillStyle = '#8a7048';
  ctx.fillRect(x - 16, y - 20, 32, 3);
  ctx.fillStyle = '#4a3d2c';
  ctx.fillRect(x - 12, y - 13, 5, 14);
  ctx.fillRect(x + 7, y - 13, 5, 14);
  ctx.fillStyle = '#6b5a3e';
  ctx.fillRect(x - 14, y - 16, 28, 2);
}

export function drawPlanter(ctx, x, y, time = 0) {
  ctx.fillStyle = '#152a2444';
  ctx.beginPath();
  ctx.ellipse(x + 2, y + 3, 16, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#6b4b34';
  ctx.beginPath();
  ctx.moveTo(x - 14, y - 12);
  ctx.lineTo(x + 14, y - 12);
  ctx.lineTo(x + 10, y + 2);
  ctx.lineTo(x - 10, y + 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#8a6a4a';
  ctx.fillRect(x - 14, y - 12, 28, 3);
  ctx.fillStyle = '#4d6b45';
  ctx.beginPath();
  ctx.ellipse(x - 5, y - 16, 7, 4, -0.3, 0, Math.PI * 2);
  ctx.ellipse(x + 6, y - 17, 6, 3.5, 0.3, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 4; i++) {
    const fx = x - 8 + i * 5.4;
    const fy = y - 20 - (i % 2) * 3 + Math.sin(time / 1300 + i) * 0.6;
    ctx.fillStyle = ['#f2c9d4', '#f5e3a8', '#e8e4f0', '#d9c8f0'][i % 4];
    ctx.beginPath();
    ctx.arc(fx, fy, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8b84b';
    ctx.fillRect(fx - 0.8, fy - 0.8, 1.6, 1.6);
  }
}

export function drawStandingStone(ctx, x, y, variant = 0.5) {
  const rand = mulberry(Math.floor(variant * 12345) + 7);
  const lean = (rand() - 0.5) * 0.18;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(lean);
  ctx.fillStyle = '#152a244d';
  ctx.beginPath();
  ctx.ellipse(3, 3, 17, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#6d756b';
  ctx.beginPath();
  ctx.moveTo(-12, 2);
  ctx.lineTo(-9, -44);
  ctx.lineTo(-2, -56);
  ctx.lineTo(9, -46);
  ctx.lineTo(12, 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#98a091';
  ctx.beginPath();
  ctx.moveTo(-9, -44);
  ctx.lineTo(-2, -56);
  ctx.lineTo(2, -20);
  ctx.lineTo(-4, 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#c9b27a';
  ctx.fillRect(-2, -36, 3, 12);
  ctx.fillRect(-7, -24, 4, 3);
  ctx.fillStyle = '#4e6b45aa';
  ctx.fillRect(-8, -8, 8, 4);
  ctx.restore();
}

// ---- 5.1 resources --------------------------------------------------------
export function drawIronwood(ctx, x, y, variant = 0.5, remaining = 3, time = 0) {
  const rand = mulberry(Math.floor(variant * 91942) + 5);
  const height = 120 + rand() * 30;
  ctx.fillStyle = '#152a2455';
  ctx.beginPath();
  ctx.ellipse(x + 4, y, 26, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3a2f24';
  ctx.beginPath();
  ctx.moveTo(x - 13, y);
  ctx.quadraticCurveTo(x - 17, y - height * 0.6, x - 8, y - height);
  ctx.lineTo(x + 9, y - height);
  ctx.quadraticCurveTo(x + 17, y - height * 0.6, x + 13, y);
  ctx.closePath();
  ctx.fill();
  // Pale living veins: the visual promise of "ancient wood".
  ctx.fillStyle = remaining > 0 ? '#a8e8bd' : '#5c6b5e';
  for (let i = 0; i < 4; i++) {
    const vy = y - 14 - i * (height / 4.6);
    ctx.fillRect(x - 9 + (i % 2) * 3, vy, 5 + (i % 3) * 3, 2.4);
  }
  ctx.fillStyle = '#5d4c34';
  ctx.fillRect(x - 4, y - height * 0.55, 3, height * 0.4);
  const glint = 0.4 + 0.35 * Math.sin(time / 900 + variant * 7);
  ctx.globalAlpha = remaining > 0 ? glint : 0.2;
  ctx.fillStyle = '#cfe8f5';
  ctx.beginPath();
  ctx.arc(x + 3, y - height + 10, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  if (remaining <= 0) {
    ctx.fillStyle = '#6e6443';
    ctx.fillRect(x - 10, y - 6, 20, 8);
  }
}

export function drawGeode(ctx, x, y, variant = 0.5, remaining = 3, time = 0) {
  const rand = mulberry(Math.floor(variant * 47411) + 11);
  const pulse = 0.55 + 0.45 * Math.sin(time / 780 + variant * 5);
  ctx.fillStyle = '#152a244d';
  ctx.beginPath();
  ctx.ellipse(x + 3, y + 3, 26, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5d665f';
  ctx.beginPath();
  ctx.moveTo(-24, 4);
  ctx.lineTo(-20, -16);
  ctx.lineTo(-6, -26);
  ctx.lineTo(14, -24);
  ctx.lineTo(24, -8);
  ctx.lineTo(22, 5);
  ctx.lineTo(4, 10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#8a9484';
  ctx.beginPath();
  ctx.moveTo(-20, -16);
  ctx.lineTo(-6, -26);
  ctx.lineTo(14, -24);
  ctx.lineTo(6, -10);
  ctx.lineTo(-8, -6);
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.translate(x, y - 12);
  ctx.rotate(rand() - 0.5);
  const core = ctx.createLinearGradient(0, -12, 0, 12);
  core.addColorStop(0, '#cfeaf5');
  core.addColorStop(0.5, '#6fa8c9');
  core.addColorStop(1, '#3d5a78');
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.moveTo(-9, 2);
  ctx.lineTo(-4, -12);
  ctx.lineTo(5, -14);
  ctx.lineTo(10, 0);
  ctx.lineTo(2, 8);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = remaining > 0 ? 0.35 + pulse * 0.5 : 0.15;
  ctx.fillStyle = '#cfe8f5';
  ctx.fillRect(-2, -10, 3, 12);
  ctx.globalAlpha = 1;
  ctx.restore();
  if (remaining <= 0) {
    ctx.fillStyle = '#4a524866';
    ctx.beginPath();
    ctx.ellipse(x, y, 16, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---- ancient grove --------------------------------------------------------
export function drawAncientGrove(
  ctx,
  x,
  y,
  variant = 0.5,
  time = 0,
  night = false,
  cleared = false,
) {
  const rand = mulberry(Math.floor(variant * 81818) + 3);
  const breath = Math.sin(time / 2600) * 1.6;
  ctx.fillStyle = '#152a2455';
  ctx.beginPath();
  ctx.ellipse(x + 6, y + 6, 92, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  // A ring of trunks, each leaning slightly inward.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + variant;
    const tx = x + Math.cos(a) * 74;
    const ty = y + Math.sin(a) * 30;
    const h = 96 + rand() * 42;
    ctx.fillStyle = '#3d3226';
    ctx.beginPath();
    ctx.moveTo(tx - 8, ty);
    ctx.lineTo(tx - 5 + Math.cos(a) * 6, ty - h);
    ctx.lineTo(tx + 5 + Math.cos(a) * 6, ty - h);
    ctx.lineTo(tx + 8, ty);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#4e6b45aa';
    ctx.fillRect(tx - 5, ty - 12, 5, 8);
    if (i % 2 === 0) {
      ctx.fillStyle = '#2c4f3a';
      ctx.beginPath();
      ctx.ellipse(tx + Math.cos(a) * 6, ty - h - 4, 26, 15, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // The heart: an altar of light, dimmer once the keeper is gone.
  const glow = cleared ? 0.35 : 0.62;
  const halo = ctx.createRadialGradient(x, y - 20, 4, x, y - 20, 70 + breath * 3);
  halo.addColorStop(0, `rgba(202,245,214,${0.4 * glow + 0.15})`);
  halo.addColorStop(0.5, `rgba(150,220,190,${0.18 * glow})`);
  halo.addColorStop(1, 'rgba(150,220,190,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(x, y - 20, 70 + breath * 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#6f7a6c';
  ctx.beginPath();
  ctx.ellipse(x, y - 4, 30, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8f9a8a';
  ctx.fillRect(x - 16, y - 18, 32, 12);
  ctx.fillStyle = '#5d7a4e99';
  ctx.fillRect(x - 20, y - 6, 8, 5);
  ctx.fillRect(x + 13, y - 8, 7, 5);
  if (!cleared) {
    ctx.fillStyle = `rgba(226,247,214,${0.6 + Math.sin(time / 620) * 0.2})`;
    ctx.beginPath();
    ctx.ellipse(x, y - 30 + breath * 0.3, 8, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#a8e8bd';
    ctx.fillRect(x - 1.5, y - 44, 3, 12);
  } else {
    ctx.fillStyle = '#7d887a';
    ctx.beginPath();
    ctx.ellipse(x, y - 12, 9, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (night) {
    ctx.fillStyle = 'rgba(190,230,255,0.25)';
    ctx.fillRect(x - 60, y - 96, 120, 2);
  }
}

// ---- 5.1 effects ----------------------------------------------------------
export function drawSlashArc(ctx, x, y, angle, progress, reach = 56) {
  const alpha = Math.max(0, 1 - progress);
  ctx.save();
  ctx.translate(x, y - 12);
  ctx.rotate(angle);
  const sweep = 1.5;
  const start = -sweep / 2 + progress * sweep;
  ctx.strokeStyle = `rgba(240,246,220,${0.75 * alpha})`;
  ctx.lineWidth = 5 - progress * 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, 0, reach * (0.86 + progress * 0.2), start, start + 0.6);
  ctx.stroke();
  ctx.strokeStyle = `rgba(255,255,255,${0.35 * alpha})`;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(0, 0, reach * (0.9 + progress * 0.2), start + 0.1, start + 0.45);
  ctx.stroke();
  ctx.restore();
}

export function drawTelegraphRing(ctx, x, y, radius, progress, elite = false) {
  const grow = 0.35 + progress * 0.65;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, 0.45);
  ctx.strokeStyle = elite
    ? `rgba(255,150,120,${0.5 + progress * 0.45})`
    : `rgba(232,214,150,${0.4 + progress * 0.45})`;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(0, 0, radius * grow, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = elite
    ? `rgba(255,120,90,${0.12 + progress * 0.16})`
    : `rgba(232,200,140,${0.08 + progress * 0.14})`;
  ctx.beginPath();
  ctx.arc(0, 0, radius * grow, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawSporeShot(ctx, x, y, age = 0) {
  const wobble = Math.sin(age * 9) * 1.6;
  ctx.fillStyle = 'rgba(196,150,140,0.35)';
  ctx.beginPath();
  ctx.arc(x - wobble * 2, y - wobble, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8d7bd';
  ctx.beginPath();
  ctx.arc(x, y, 4.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#a8524c';
  ctx.beginPath();
  ctx.arc(x - 1, y - 1, 2.2, 0, Math.PI * 2);
  ctx.fill();
}

export function drawFireflies(ctx, x, y, count, time, seed = 0) {
  const rand = mulberry(seed + 17);
  for (let i = 0; i < count; i++) {
    const ax = x + (rand() - 0.5) * 260;
    const ay = y + (rand() - 0.5) * 180;
    const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(time / 900 + i * 1.7 + rand() * 3));
    ctx.fillStyle = `rgba(214,244,150,${0.55 * twinkle})`;
    ctx.beginPath();
    ctx.arc(
      ax + Math.sin(time / 1600 + i) * 12,
      ay + Math.cos(time / 2100 + i) * 8,
      1.7,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
}
