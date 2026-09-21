import {
  CHUNK_SIZE,
  MAX_CACHED_CHUNKS,
  RESOURCES,
  WORLD_GEN_VERSION,
  WORLD_LIMIT,
} from './config.js';

// Buildings keep resources from regrowing on their footprint. Checking every
// building for every entity made the cost of a base grow with its size, so
// structures are bucketed into a coarse grid instead.
export const STRUCTURE_CELL = 64;
export const STRUCTURE_CLEARANCE = { wall: 48, campfire: 42, chest: 42, default: 42 };
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

export function makeChunk(seed, cx, cy) {
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

export function hitbox(entity) {
  if (entity.type === 'tree') return { x: entity.x - 12, y: entity.y - 10, width: 24, height: 19 };
  if (entity.type === 'rock') return { x: entity.x - 19, y: entity.y - 11, width: 38, height: 25 };
  if (entity.type === 'wall') return { x: entity.x - 25, y: entity.y - 7, width: 50, height: 14 };
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
    else chunk = makeChunk(this.seed, cx, cy);
    this.chunks.set(key, chunk);
    while (this.chunks.size > MAX_CACHED_CHUNKS)
      this.chunks.delete(this.chunks.keys().next().value);
    return chunk;
  }
  getState(entity, elapsed) {
    const change = this.changes.get(entity.id);
    if (change && elapsed < change.respawnAt) return change;
    if (change) this.changes.delete(entity.id);
    return { remaining: RESOURCES[entity.type].charges, respawnAt: 0 };
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
  consume(entity, elapsed) {
    const state = this.getState(entity, elapsed);
    if (state.remaining <= 0) return null;
    const next = {
      id: entity.id,
      remaining: state.remaining - 1,
      respawnAt: elapsed + RESOURCES[entity.type].respawn,
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
    return nearby.some(stops) || (this.structuresNear(x, y)?.some(stops) ?? false);
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
    return !(this.structuresNear(x, y)?.some(blocks) ?? false);
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
