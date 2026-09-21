import {
  BIOMES,
  CHUNK_SIZE,
  LANDMARK_TYPES,
  MAX_CACHED_CHUNKS,
  RESOURCES,
  WORLD_GEN_VERSION,
  WORLD_LIMIT,
} from './config.js';

// Buildings keep resources from regrowing on their footprint. Checking every
// building for every entity made the cost of a base grow with its size, so
// structures are bucketed into a coarse grid instead.
export const STRUCTURE_CELL = 64;
export const STRUCTURE_CLEARANCE = {
  wall: 48,
  campfire: 42,
  chest: 42,
  lantern: 40,
  default: 42,
};
export const clearanceFor = (type) => STRUCTURE_CLEARANCE[type] ?? STRUCTURE_CLEARANCE.default;

// An integer hash preserves signs; unlike abs(x ^ y), opposite chunks do not mirror.
export function hash(seed, x, y) {
  let h = (seed ^ Math.imul(x, 374761393) ^ Math.imul(y, 668265263)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}
export function randomGenerator(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Deterministic value noise for biomes. Seed + position = same biome forever,
// independent of visitation order or frame rate.
function latticeNoise(seed, lx, ly) {
  let h = (seed ^ Math.imul(lx, 374761393) ^ Math.imul(ly, 668265263)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function valueNoise(seed, x, y, scale) {
  const fx = x / scale,
    fy = y / scale;
  const lx = Math.floor(fx),
    ly = Math.floor(fy);
  const tx = fx - lx,
    ty = fy - ly;
  const sx = tx * tx * (3 - 2 * tx),
    sy = ty * ty * (3 - 2 * ty);
  const a = latticeNoise(seed, lx, ly);
  const b = latticeNoise(seed, lx + 1, ly);
  const c = latticeNoise(seed, lx, ly + 1);
  const d = latticeNoise(seed, lx + 1, ly + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

export function biomeAt(seed, x, y) {
  const dist = Math.hypot(x, y);
  if (dist < 380) return 'meadow';
  const moisture = valueNoise((seed ^ 0x1234abcd) >>> 0, x, y, 950);
  const density = valueNoise((seed ^ 0x5678ef01) >>> 0, x, y, 720);
  const rocky = valueNoise((seed ^ 0x9abc2345) >>> 0, x, y, 1250);
  if (rocky > 0.72 && dist > 800) return 'rocky';
  if (moisture < 0.3 && dist > 1100) return 'mistgrove';
  if (density > 0.74 && dist > 2200) return 'ancient';
  if (density > 0.62) return 'deepwood';
  if (density < 0.36 && dist < 2600) return 'meadow';
  if (moisture > 0.62 && density > 0.5) return 'deepwood';
  return 'woodland';
}

const starters = [
  ['bush', -75, -65],
  ['bush', 110, 65],
  ['branch', 80, -28],
  ['branch', -95, 65],
  ['branch', 38, -130],
  ['pebble', 15, 103],
  ['pebble', 143, -92],
  ['pebble', -137, -5],
  ['tree', 202, 50],
  ['tree', -192, -125],
  ['rock', -195, 108],
];

function makeChunkV1(seed, cx, cy) {
  const random = randomGenerator(hash(seed, cx, cy));
  const entities = [];
  const types = [
    ...Array(16).fill('tree'),
    'bush',
    'bush',
    'bush',
    'bush',
    'branch',
    'branch',
    'branch',
    'pebble',
    'pebble',
    'pebble',
    'rock',
    'rock',
  ];
  for (const [i, type] of types.entries()) {
    const x = cx * CHUNK_SIZE + 28 + random() * (CHUNK_SIZE - 56);
    const y = cy * CHUNK_SIZE + 28 + random() * (CHUNK_SIZE - 56);
    const variant = random();
    // The safe clearing depends on the spawn, never on the moving player.
    if (Math.hypot(x, y) < 235 || entities.some((e) => Math.hypot(x - e.x, y - e.y) < 55)) continue;
    entities.push({ id: `${cx},${cy}:${i}`, type, x, y, variant });
  }
  starters.forEach(([type, x, y], i) => {
    if (Math.floor(x / CHUNK_SIZE) === cx && Math.floor(y / CHUNK_SIZE) === cy) {
      entities.push({ id: `start:${i}`, type, x, y, variant: random() });
    }
  });
  const decorations = Array.from({ length: 26 }, () => ({
    x: cx * CHUNK_SIZE + random() * CHUNK_SIZE,
    y: cy * CHUNK_SIZE + random() * CHUNK_SIZE,
    variant: random(),
  }));
  return { entities, decorations };
}

function makeChunkV2(seed, cx, cy) {
  const random = randomGenerator(hash(seed, cx, cy));
  const entities = [];
  // Guarantee early access to the new gathering loop near spawn. Placed first
  // so random candidates grow around them instead of over them.
  const guarantees = [
    ['mushroom', 260, -180],
    ['herb', -260, 220],
  ];
  guarantees.forEach(([type, x, y], gi) => {
    if (Math.floor(x / CHUNK_SIZE) === cx && Math.floor(y / CHUNK_SIZE) === cy) {
      if (Math.hypot(x, y) >= 235) {
        // A dedicated stream keeps the main random sequence untouched.
        const variant = randomGenerator(hash(seed, 5000 + gi, 6000))();
        entities.push({ id: `start:gar${gi}`, type, x, y, variant, biome: 'meadow' });
      }
    }
  });
  // Candidate list is fixed order so IDs stay stable; biome gates acceptance.
  const types = [
    ...Array(14).fill('tree'),
    'bush',
    'bush',
    'bush',
    'bush',
    'mushroom',
    'mushroom',
    'mushroom',
    'herb',
    'herb',
    'branch',
    'branch',
    'branch',
    'pebble',
    'pebble',
    'rock',
    'rock',
    'crystal',
  ];
  for (const [i, type] of types.entries()) {
    const x = cx * CHUNK_SIZE + 28 + random() * (CHUNK_SIZE - 56);
    const y = cy * CHUNK_SIZE + 28 + random() * (CHUNK_SIZE - 56);
    const variant = random();
    const gate = random();
    if (Math.hypot(x, y) < 235 || entities.some((e) => Math.hypot(x - e.x, y - e.y) < 55)) continue;
    const biome = biomeAt(seed, x, y);
    const density = BIOMES[biome]?.density ?? 1;
    let accept = true;
    if (type === 'tree') accept = gate < Math.min(1, density);
    else if (type === 'bush') accept = biome === 'rocky' ? gate < 0.3 : gate < 0.9;
    else if (type === 'mushroom')
      accept =
        biome === 'mistgrove' || biome === 'deepwood' || biome === 'ancient'
          ? gate < 0.95
          : gate < 0.35;
    else if (type === 'herb')
      accept = biome === 'meadow' || biome === 'mistgrove' ? gate < 0.9 : gate < 0.4;
    else if (type === 'rock' || type === 'pebble')
      accept = biome === 'rocky' ? gate < 0.95 : gate < 0.7;
    else if (type === 'crystal')
      accept = (biome === 'rocky' || biome === 'ancient' || biome === 'deepwood') && gate < 0.8;
    if (!accept) continue;
    entities.push({ id: `${cx},${cy}:${i}`, type, x, y, variant, biome });
  }
  starters.forEach(([type, x, y], i) => {
    if (Math.floor(x / CHUNK_SIZE) === cx && Math.floor(y / CHUNK_SIZE) === cy) {
      entities.push({ id: `start:${i}`, type, x, y, variant: random(), biome: 'meadow' });
    }
  });
  const decorations = Array.from({ length: 30 }, () => ({
    x: cx * CHUNK_SIZE + random() * CHUNK_SIZE,
    y: cy * CHUNK_SIZE + random() * CHUNK_SIZE,
    variant: random(),
    flower: random(),
  }));
  const landmarks = [];
  const centerX = cx * CHUNK_SIZE + CHUNK_SIZE / 2,
    centerY = cy * CHUNK_SIZE + CHUNK_SIZE / 2;
  // Every journey gets one landmark within a short walk of home, in a
  // deterministic direction, so the first expedition always pays off.
  const gh = hash(seed, 913, 547);
  const gAngle = ((gh % 360) / 360) * Math.PI * 2;
  const gDist = 1150 + ((gh >>> 9) % 500);
  const gx = Math.round((Math.cos(gAngle) * gDist) / CHUNK_SIZE);
  const gy = Math.round((Math.sin(gAngle) * gDist) / CHUNK_SIZE);
  if (Math.hypot(centerX, centerY) > 700) {
    const h = hash((seed ^ 0x51ab3f29) >>> 0, cx, cy);
    if (h % 100 < 7 || (cx === gx && cy === gy)) {
      const h2 = hash((seed ^ 0x77aa11cd) >>> 0, cx + 131, cy - 57);
      const type = LANDMARK_TYPES[h % LANDMARK_TYPES.length];
      const baseX = cx * CHUNK_SIZE + 110 + (h2 % 292);
      const baseY = cy * CHUNK_SIZE + 110 + ((h2 >>> 9) % 292);
      // Nudge the landmark until it clears solid obstacles; overlapping a bush
      // or a flower is fine, overlapping a tree trunk is not.
      const solid = entities.filter(
        (e) => e.type === 'tree' || e.type === 'rock' || e.type === 'crystal',
      );
      const candidates = [
        [baseX, baseY],
        [baseX + 95, baseY],
        [baseX, baseY + 95],
        [baseX - 95, baseY],
        [baseX, baseY - 95],
        [baseX + 95, baseY + 95],
      ];
      for (const [x, y] of candidates) {
        if (Math.hypot(x, y) <= 600) continue;
        if (solid.some((e) => Math.hypot(x - e.x, y - e.y) < 52)) continue;
        landmarks.push({ id: `lm:${cx},${cy}`, type, x, y, variant: ((h >>> 8) % 1000) / 1000 });
        break;
      }
    }
  }
  return { entities, decorations, landmarks };
}

export function makeChunk(seed, cx, cy, generationVersion = 1) {
  if ((generationVersion ?? 1) >= 2) return makeChunkV2(seed >>> 0, cx, cy);
  return makeChunkV1(seed >>> 0, cx, cy);
}

export function hitbox(entity) {
  if (entity.type === 'tree' || entity.type === 'ancientTree')
    return { x: entity.x - 12, y: entity.y - 10, width: 24, height: 19 };
  if (entity.type === 'rock') return { x: entity.x - 19, y: entity.y - 11, width: 38, height: 25 };
  if (entity.type === 'crystal')
    return { x: entity.x - 14, y: entity.y - 8, width: 28, height: 16 };
  if (entity.type === 'wall') return { x: entity.x - 25, y: entity.y - 7, width: 50, height: 14 };
  if (entity.type === 'pond') return { x: entity.x - 52, y: entity.y - 30, width: 104, height: 60 };
  if (entity.type === 'giantRock')
    return { x: entity.x - 34, y: entity.y - 20, width: 68, height: 40 };
  return null;
}
export function overlaps(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export class World {
  constructor(seed = 404, changes = [], structures = [], generationVersion = WORLD_GEN_VERSION) {
    this.seed = seed >>> 0;
    this.generationVersion = generationVersion ?? WORLD_GEN_VERSION;
    this.chunks = new Map();
    this.changes = new Map(changes.map((change) => [change.id, { ...change }]));
    this.structures = structures.map((s) => ({ ...s }));
    this.structureGrid = new Map();
    this.indexedStructures = null;
    this.indexedCount = -1;
  }
  biomeAt(x, y) {
    if (this.generationVersion < 2) return 'woodland';
    return biomeAt(this.seed, x, y);
  }
  // The index repairs itself whenever the public structures array changes,
  // because tests and the save system both replace it wholesale.
  structureIndex() {
    if (this.indexedStructures === this.structures && this.indexedCount === this.structures.length)
      return this.structureGrid;
    this.structureGrid.clear();
    for (const structure of this.structures) {
      const key = `${Math.floor(structure.x / STRUCTURE_CELL)},${Math.floor(structure.y / STRUCTURE_CELL)}`;
      const bucket = this.structureGrid.get(key);
      if (bucket) bucket.push(structure);
      else this.structureGrid.set(key, [structure]);
    }
    this.indexedStructures = this.structures;
    this.indexedCount = this.structures.length;
    return this.structureGrid;
  }
  // Structures close enough to keep a resource from regrowing at this point.
  structuresNear(x, y) {
    const grid = this.structureIndex(),
      cx = Math.floor(x / STRUCTURE_CELL),
      cy = Math.floor(y / STRUCTURE_CELL);
    let result = null;
    for (let gy = cy - 1; gy <= cy + 1; gy++) {
      for (let gx = cx - 1; gx <= cx + 1; gx++) {
        const bucket = grid.get(`${gx},${gy}`);
        if (!bucket) continue;
        for (const structure of bucket)
          if (Math.hypot(structure.x - x, structure.y - y) < clearanceFor(structure.type))
            (result ??= []).push(structure);
      }
    }
    return result;
  }
  getChunk(cx, cy) {
    const key = `${cx},${cy}`;
    let chunk = this.chunks.get(key);
    if (chunk) this.chunks.delete(key);
    else chunk = makeChunk(this.seed, cx, cy, this.generationVersion);
    this.chunks.set(key, chunk);
    while (this.chunks.size > MAX_CACHED_CHUNKS)
      this.chunks.delete(this.chunks.keys().next().value);
    return chunk;
  }
  getState(entity, elapsed) {
    const change = this.changes.get(entity.id);
    if (change && elapsed < change.respawnAt) return change;
    if (change) this.changes.delete(entity.id);
    const charges = RESOURCES[entity.type]?.charges ?? 1;
    return { remaining: charges, respawnAt: 0 };
  }
  getEntities(bounds, elapsed) {
    const result = [];
    // One chunk margin also covers canopies and the hand-authored spawn clearing.
    const minX = Math.floor((bounds.x - 110) / CHUNK_SIZE);
    const maxX = Math.floor((bounds.x + bounds.width + 110) / CHUNK_SIZE);
    const minY = Math.floor((bounds.y - 110) / CHUNK_SIZE);
    const maxY = Math.floor((bounds.y + bounds.height + 110) / CHUNK_SIZE);
    for (let cy = minY; cy <= maxY; cy++) {
      for (let cx = minX; cx <= maxX; cx++) {
        for (const entity of this.getChunk(cx, cy).entities) {
          if (
            entity.x < bounds.x - 100 ||
            entity.x > bounds.x + bounds.width + 100 ||
            entity.y < bounds.y - 100 ||
            entity.y > bounds.y + bounds.height + 120
          )
            continue;
          // A placed structure owns its footprint; depleted resources cannot regrow through it.
          if (this.structuresNear(entity.x, entity.y)) continue;
          result.push({ ...entity, ...this.getState(entity, elapsed) });
        }
      }
    }
    return result;
  }
  getLandmarks(bounds) {
    if (this.generationVersion < 2) return [];
    const result = [];
    const minX = Math.floor((bounds.x - 120) / CHUNK_SIZE);
    const maxX = Math.floor((bounds.x + bounds.width + 120) / CHUNK_SIZE);
    const minY = Math.floor((bounds.y - 120) / CHUNK_SIZE);
    const maxY = Math.floor((bounds.y + bounds.height + 120) / CHUNK_SIZE);
    for (let cy = minY; cy <= maxY; cy++) {
      for (let cx = minX; cx <= maxX; cx++) {
        const chunk = this.getChunk(cx, cy);
        for (const landmark of chunk.landmarks ?? []) {
          if (
            landmark.x < bounds.x - 120 ||
            landmark.x > bounds.x + bounds.width + 120 ||
            landmark.y < bounds.y - 120 ||
            landmark.y > bounds.y + bounds.height + 140
          )
            continue;
          result.push(landmark);
        }
      }
    }
    return result;
  }
  landmarksNear(x, y, radius = 90) {
    const found = this.getLandmarks({
      x: x - radius,
      y: y - radius,
      width: radius * 2,
      height: radius * 2,
    });
    return found.filter((l) => Math.hypot(l.x - x, l.y - y) < radius);
  }
  consume(entity, elapsed) {
    const state = this.getState(entity, elapsed);
    if (state.remaining <= 0) return null;
    const respawn = RESOURCES[entity.type]?.respawn ?? 60;
    const next = {
      id: entity.id,
      remaining: state.remaining - 1,
      respawnAt: elapsed + respawn,
    };
    this.changes.set(entity.id, next);
    return next;
  }
  prune(elapsed) {
    for (const [id, state] of this.changes) if (elapsed >= state.respawnAt) this.changes.delete(id);
  }
  isBlocked(x, y, elapsed, radius = 11) {
    if (Math.abs(x) > WORLD_LIMIT || Math.abs(y) > WORLD_LIMIT) return true;
    const player = { x: x - radius, y: y - radius, width: radius * 2, height: radius * 2 };
    const stops = (entity) => {
      if (entity.remaining === 0) return false;
      const box = hitbox(entity);
      return !!box && overlaps(player, box);
    };
    const nearby = this.getEntities({ x: x - 50, y: y - 50, width: 100, height: 100 }, elapsed);
    if (nearby.some(stops)) return true;
    if (this.structuresNear(x, y)?.some(stops) ?? false) return true;
    if (this.generationVersion >= 2) {
      const landmarks = this.getLandmarks({ x: x - 80, y: y - 80, width: 160, height: 160 });
      if (landmarks.some(stops)) return true;
    }
    return false;
  }
  canMove(fromX, fromY, x, y, elapsed) {
    if (Math.abs(x) > WORLD_LIMIT || Math.abs(y) > WORLD_LIMIT) return false;
    const box = (px, py) => ({ x: px - 11, y: py - 11, width: 22, height: 22 });
    const before = box(fromX, fromY),
      after = box(x, y);
    const blocks = (entity) => {
      if (entity.remaining === 0) return false;
      const obstacle = hitbox(entity);
      if (!obstacle || !overlaps(after, obstacle)) return false;
      if (!overlaps(before, obstacle)) return true;
      // If a tree regrows around the player, permit escape, but never move deeper.
      const cx = obstacle.x + obstacle.width / 2,
        cy = obstacle.y + obstacle.height / 2;
      return Math.hypot(x - cx, y - cy) <= Math.hypot(fromX - cx, fromY - cy);
    };
    const nearby = this.getEntities({ x: x - 50, y: y - 50, width: 100, height: 100 }, elapsed);
    if (nearby.some(blocks)) return false;
    if (this.structuresNear(x, y)?.some(blocks) ?? false) return false;
    if (this.generationVersion >= 2) {
      const landmarks = this.getLandmarks({ x: x - 80, y: y - 80, width: 160, height: 160 });
      if (landmarks.some(blocks)) return false;
    }
    return true;
  }
  serialize(elapsed) {
    this.prune(elapsed);
    return {
      seed: this.seed,
      generationVersion: this.generationVersion,
      changes: [...this.changes.values()],
      structures: this.structures.map((s) => ({ ...s })),
    };
  }
}
