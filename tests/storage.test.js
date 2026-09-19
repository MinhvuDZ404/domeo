import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { validateSave, readSave, writeSave } from '../src/storage.js';
import { SAVE_KEY } from '../src/config.js';
const memoryStorage = () => {
  const map = new Map();
  return { getItem: (key) => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) };
};

test('save/restore preserves player, inventory, world changes, buildings, time and goals', () => {
  const game = new Game(111);
  game.elapsed = 115;
  Object.assign(game.player, { x: -75, y: -45, hunger: 55, health: 86 });
  game.interact();
  game.inventory.wood = 20;
  game.inventory.stone = 10;
  game.craft('campfire');
  game.world.structures.push({ id: 'built:0', type: 'wall', x: 200, y: 0 });
  const data = game.snapshot();
  assert.equal(validateSave(data), true);
  const storage = memoryStorage();
  assert.equal(writeSave(data, storage).ok, true);
  const loaded = readSave(storage);
  assert.equal(loaded.error, null);
  const restored = Game.restore(loaded.data);
  assert.equal(restored.elapsed, 115);
  assert.equal(restored.player.hunger, 55);
  assert.deepEqual(restored.inventory, game.inventory);
  assert.deepEqual(restored.stats, game.stats);
  assert.deepEqual(restored.world.serialize(115), game.world.serialize(115));
  assert.equal(restored.placement, null);
  assert.equal(restored.player.moving, false);
});
test('offline wall-clock time never advances survival or resource timers', () => {
  const game = new Game(1),
    data = game.snapshot();
  data.savedAt -= 86400000;
  assert.equal(Game.restore(data).elapsed, 0);
  assert.equal(Game.restore(data).player.hunger, 100);
});
test('missing save returns a clean empty result', () => {
  assert.deepEqual(readSave(memoryStorage()), { data: null, error: null });
});
test('malformed JSON, invalid versions and incomplete saves are rejected', () => {
  for (const raw of [
    '{oops',
    '{}',
    'null',
    '[1,2]',
    JSON.stringify({ ...new Game().snapshot(), version: 999 }),
  ]) {
    const storage = memoryStorage();
    storage.setItem(SAVE_KEY, raw);
    const loaded = readSave(storage);
    assert.equal(loaded.data, null);
    assert.ok(loaded.error);
  }
});
test('oversized local storage payload is rejected before parsing', () => {
  const storage = memoryStorage();
  storage.setItem(SAVE_KEY, ' '.repeat(2_000_001));
  assert.ok(readSave(storage).error);
});
test('invalid numeric values, items, coordinates and structures are rejected', () => {
  const changes = [
    (data) => {
      data.player.x = NaN;
    },
    (data) => {
      data.player.hunger = -1;
    },
    (data) => {
      data.player.health = 101;
    },
    (data) => {
      data.elapsed = Infinity;
    },
    (data) => {
      data.inventory.wood = -5;
    },
    (data) => {
      data.inventory.axe = 2;
    },
    (data) => {
      data.world.seed = 'x';
    },
    (data) => {
      data.player.direction = '__proto__';
    },
    (data) => {
      data.world.structures = [{ id: 'built:0', type: 'html', x: 50, y: 50 }];
    },
    (data) => {
      data.world.changes = [{ id: 'start:0', remaining: -1, respawnAt: 5 }];
    },
    (data) => {
      data.world.changes = [{ id: 'start:0', remaining: 0, respawnAt: 999999 }];
    },
  ];
  for (const mutate of changes) {
    const data = new Game(1).snapshot();
    mutate(data);
    assert.equal(validateSave(data), false);
  }
});
test('duplicate resource IDs are not accepted', () => {
  const data = new Game().snapshot();
  data.world.changes = [
    { id: 'start:0', remaining: 1, respawnAt: 10 },
    { id: 'start:0', remaining: 2, respawnAt: 10 },
  ];
  assert.equal(validateSave(data), false);
});
test('storage privacy/quota errors are reported instead of crashing', () => {
  const storage = {
    getItem() {
      throw new Error('blocked');
    },
    setItem() {
      throw new Error('quota');
    },
  };
  assert.ok(readSave(storage).error);
  assert.equal(writeSave(new Game().snapshot(), storage).ok, false);
});
test('an invalid snapshot never overwrites a valid existing save', () => {
  const storage = memoryStorage(),
    good = new Game(999).snapshot();
  writeSave(good, storage);
  assert.equal(writeSave({ ...good, inventory: {} }, storage).ok, false);
  assert.equal(readSave(storage).data.world.seed, 999);
});
