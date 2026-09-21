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
