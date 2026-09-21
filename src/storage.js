import {
  ITEMS,
  LOCK_KEY,
  MAX_DISCOVERIES,
  MAX_EXPLORED,
  MAX_STACK,
  MAX_STRUCTURES,
  PLACEABLE,
  SAVE_KEY,
  SAVE_VERSION,
  STAT_KEYS,
  UNIQUE_ITEMS,
  WORLD_LIMIT,
  emptyItems,
  emptyStats,
} from './config.js';

const number = (n, min = 0, max = Number.MAX_SAFE_INTEGER) =>
  typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max;
const integer = (n, min, max) => number(n, min, max) && Number.isInteger(n);
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

function validInventory(bag) {
  return (
    object(bag) &&
    Object.keys(ITEMS).every((id) => integer(bag[id], 0, UNIQUE_ITEMS.includes(id) ? 1 : MAX_STACK))
  );
}

export function migrateSave(data) {
  if (!object(data) || !integer(data.version, 1, SAVE_VERSION)) return null;
  if (data.version === SAVE_VERSION) return data;
  let current = data;
  // v1 (Domeo 2.0/3.0): no cooked/chest/home/explored/discovered, old world gen.
  if (current.version === 1) {
    current = {
      ...current,
      version: 2,
      inventory: { ...emptyItems(), ...current.inventory },
      stats: { ...emptyStats(), ...current.stats },
      home: null,
      chest: emptyItems(),
      explored: [],
      discovered: [],
      world: {
        ...current.world,
        generationVersion: 1,
      },
    };
  }
  // v2 (Domeo 4.0): 11 items, 9 stats, generation 1. v3 adds gathering,
  // discoveries and keeps the original world generator for old journeys.
  if (current.version === 2) {
    current = {
      ...current,
      version: 3,
      inventory: { ...emptyItems(), ...current.inventory },
      stats: { ...emptyStats(), ...current.stats },
      home: current.home ?? null,
      chest: { ...emptyItems(), ...current.chest },
      explored: Array.isArray(current.explored) ? current.explored : [],
      discovered: Array.isArray(current.discovered) ? current.discovered : [],
      world: {
        ...current.world,
        generationVersion: current.world?.generationVersion ?? 1,
      },
    };
  }
  return current.version === SAVE_VERSION ? current : null;
}

// Treat localStorage as untrusted input, including old/incomplete save formats.
export function validateSave(data) {
  const save = migrateSave(data);
  if (
    !save ||
    save.version !== SAVE_VERSION ||
    !number(save.savedAt) ||
    !number(save.elapsed) ||
    !object(save.player) ||
    !object(save.inventory) ||
    !object(save.stats) ||
    !object(save.world)
  )
    return false;
  const p = save.player;
  if (
    !number(p.x, -WORLD_LIMIT, WORLD_LIMIT) ||
    !number(p.y, -WORLD_LIMIT, WORLD_LIMIT) ||
    !number(p.health, 0, 100) ||
    !number(p.hunger, 0, 100) ||
    !['up', 'down', 'left', 'right'].includes(p.direction)
  )
    return false;
  if (!validInventory(save.inventory)) return false;
  if (!STAT_KEYS.every((id) => number(save.stats[id] ?? 0))) return false;
  if (typeof save.torchLit !== 'boolean' || !integer(save.world.seed, 0, 0xffffffff)) return false;
  if (!integer(save.world.generationVersion ?? 1, 1, 99)) return false;
  if (save.home !== null) {
    if (
      !object(save.home) ||
      !number(save.home.x, -WORLD_LIMIT, WORLD_LIMIT) ||
      !number(save.home.y, -WORLD_LIMIT, WORLD_LIMIT)
    )
      return false;
  }
  if (!validInventory(save.chest ?? emptyItems())) return false;
  if (!Array.isArray(save.explored) || save.explored.length > MAX_EXPLORED) return false;
  for (const key of save.explored) {
    if (typeof key !== 'string' || !/^-?\d{1,5},-?\d{1,5}$/.test(key)) return false;
  }
  if (!Array.isArray(save.discovered) || save.discovered.length > MAX_DISCOVERIES) return false;
  for (const key of save.discovered) {
    if (typeof key !== 'string' || !/^lm:-?\d{1,5},-?\d{1,5}$/.test(key)) return false;
  }
  const { changes, structures } = save.world;
  if (
    !Array.isArray(changes) ||
    changes.length > 10000 ||
    !Array.isArray(structures) ||
    structures.length > MAX_STRUCTURES
  )
    return false;
  const ids = new Set();
  for (const change of changes) {
    if (
      !object(change) ||
      typeof change.id !== 'string' ||
      !/^(start:(gar)?\d{1,2}|-?\d{1,5},-?\d{1,5}:\d{1,2})$/.test(change.id) ||
      ids.has(change.id) ||
      !integer(change.remaining, 0, 3) ||
      !number(change.respawnAt, 0, save.elapsed + 301)
    )
      return false;
    ids.add(change.id);
  }
  ids.clear();
  for (const s of structures) {
    if (
      !object(s) ||
      !PLACEABLE.includes(s.type) ||
      typeof s.id !== 'string' ||
      !/^built:\d{1,3}$/.test(s.id) ||
      ids.has(s.id) ||
      !number(s.x, -WORLD_LIMIT, WORLD_LIMIT) ||
      !number(s.y, -WORLD_LIMIT, WORLD_LIMIT)
    )
      return false;
    ids.add(s.id);
  }
  return true;
}
export function readSave(storage) {
  try {
    const raw = (storage ?? globalThis.localStorage).getItem(SAVE_KEY);
    if (!raw) return { data: null, error: null };
    if (raw.length > 2_000_000)
      return { data: null, error: 'Bản lưu quá lớn, không thể đọc an toàn.' };
    const data = migrateSave(JSON.parse(raw));
    if (!validateSave(data))
      return {
        data: null,
        error: 'Bản lưu cũ hoặc không hợp lệ. Bạn có thể bắt đầu một chuyến đi mới.',
      };
    return { data, error: null };
  } catch {
    return { data: null, error: 'Không đọc được bản lưu. Trình duyệt có thể đang chặn bộ nhớ.' };
  }
}
export function writeSave(data, storage) {
  try {
    const migrated = migrateSave(data);
    if (!validateSave(migrated))
      return { ok: false, error: 'Dữ liệu chưa hợp lệ, chưa ghi đè bản lưu.' };
    (storage ?? globalThis.localStorage).setItem(SAVE_KEY, JSON.stringify(migrated));
    return { ok: true, error: null };
  } catch {
    return { ok: false, error: 'Chưa lưu được. Bộ nhớ trình duyệt có thể đã đầy hoặc bị chặn.' };
  }
}

export function parseImportedSave(raw) {
  if (typeof raw !== 'string') return { data: null, error: 'Tệp trống.' };
  if (raw.length > 2_000_000) return { data: null, error: 'Tệp quá lớn, không thể nhập.' };
  try {
    const data = migrateSave(JSON.parse(raw));
    if (!validateSave(data)) return { data: null, error: 'Tệp không phải bản lưu Domeo hợp lệ.' };
    return { data, error: null };
  } catch {
    return { data: null, error: 'Không đọc được tệp JSON.' };
  }
}

export function sessionId(session = globalThis.sessionStorage) {
  try {
    let id = session?.getItem('domeo.tab');
    if (!id) {
      id = `tab:${Math.random().toString(36).slice(2, 10)}`;
      session?.setItem('domeo.tab', id);
    }
    return id;
  } catch {
    return `tab:${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function readLock(storage) {
  try {
    const raw = (storage ?? globalThis.localStorage).getItem(LOCK_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!object(data) || typeof data.id !== 'string' || !number(data.at)) return null;
    return data;
  } catch {
    return null;
  }
}

export function claimLock(storage, id = sessionId()) {
  const store = storage ?? globalThis.localStorage;
  const existing = readLock(store);
  const now = Date.now();
  if (existing && existing.id !== id && now - existing.at < 15_000)
    return { ok: false, foreign: true, id: existing.id };
  try {
    store.setItem(LOCK_KEY, JSON.stringify({ id, at: now }));
    return { ok: true, foreign: false, id };
  } catch {
    return { ok: false, foreign: false, id };
  }
}

export function heartbeatLock(storage, id = sessionId()) {
  return claimLock(storage, id);
}

export function releaseLock(storage, id = sessionId()) {
  const store = storage ?? globalThis.localStorage;
  const existing = readLock(store);
  if (existing && existing.id !== id) return;
  try {
    store.removeItem(LOCK_KEY);
  } catch {
    /* ignore */
  }
}
