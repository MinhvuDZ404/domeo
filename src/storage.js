import { ITEMS, MAX_STACK, MAX_STRUCTURES, SAVE_KEY, SAVE_VERSION, WORLD_LIMIT } from './config.js';

const number = (n, min = 0, max = Number.MAX_SAFE_INTEGER) =>
  typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max;
const integer = (n, min, max) => number(n, min, max) && Number.isInteger(n);
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

// Treat localStorage as untrusted input, including old/incomplete save formats.
export function validateSave(data) {
  if (
    !object(data) ||
    data.version !== SAVE_VERSION ||
    !number(data.savedAt) ||
    !number(data.elapsed) ||
    !object(data.player) ||
    !object(data.inventory) ||
    !object(data.stats) ||
    !object(data.world)
  )
    return false;
  const p = data.player;
  if (
    !number(p.x, -WORLD_LIMIT, WORLD_LIMIT) ||
    !number(p.y, -WORLD_LIMIT, WORLD_LIMIT) ||
    !number(p.health, 0, 100) ||
    !number(p.hunger, 0, 100) ||
    !['up', 'down', 'left', 'right'].includes(p.direction)
  )
    return false;
  if (
    !Object.keys(ITEMS).every((id) =>
      integer(data.inventory[id], 0, ['axe', 'pickaxe', 'torch'].includes(id) ? 1 : MAX_STACK),
    )
  )
    return false;
  if (
    !['berries', 'wood', 'stone', 'crafted', 'campfires', 'distance'].every((id) =>
      number(data.stats[id]),
    )
  )
    return false;
  if (typeof data.torchLit !== 'boolean' || !integer(data.world.seed, 0, 0xffffffff)) return false;
  const { changes, structures } = data.world;
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
      !/^(start:\d{1,2}|-?\d{1,5},-?\d{1,5}:\d{1,2})$/.test(change.id) ||
      ids.has(change.id) ||
      !integer(change.remaining, 0, 3) ||
      !number(change.respawnAt, 0, data.elapsed + 121)
    )
      return false;
    ids.add(change.id);
  }
  ids.clear();
  for (const s of structures) {
    if (
      !object(s) ||
      !['campfire', 'wall'].includes(s.type) ||
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
    const data = JSON.parse(raw);
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
    if (!validateSave(data))
      return { ok: false, error: 'Dữ liệu chưa hợp lệ, chưa ghi đè bản lưu.' };
    (storage ?? globalThis.localStorage).setItem(SAVE_KEY, JSON.stringify(data));
    return { ok: true, error: null };
  } catch {
    return { ok: false, error: 'Chưa lưu được. Bộ nhớ trình duyệt có thể đã đầy hoặc bị chặn.' };
  }
}
