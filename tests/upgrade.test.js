// 4.0 migrates a 2.0/3.0 save (schema 1) to schema 2 without changing the world.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { validateSave, readSave, writeSave, migrateSave } from '../src/storage.js';
import { GAME_VERSION, SAVE_KEY, SAVE_VERSION, WORLD_GEN_VERSION } from '../src/config.js';

function domeoTwoSave() {
  return {
    version: 1,
    savedAt: 1758271200000,
    elapsed: 96.35,
    player: { x: 214.5, y: -88.25, health: 74, hunger: 41.5, direction: 'left' },
    inventory: {
      berry: 6,
      wood: 12,
      stone: 5,
      fiber: 3,
      axe: 1,
      pickaxe: 0,
      campfire: 1,
      torch: 0,
      wall: 2,
    },
    stats: { berries: 9, wood: 12, stone: 5, crafted: 3, campfires: 1, distance: 4210.75 },
    torchLit: false,
    world: {
      seed: 404,
      changes: [{ id: 'start:0', remaining: 1, respawnAt: 110 }],
      structures: [{ id: 'built:0', type: 'campfire', x: 192, y: -64 }],
    },
  };
}

test('the release reports itself as 4.0 and writes save version 2', () => {
  assert.equal(GAME_VERSION, '4.0.0');
  assert.equal(SAVE_VERSION, 2);
  assert.equal(new Game(1).snapshot().version, 2);
  assert.equal(new Game(1).world.generationVersion, WORLD_GEN_VERSION);
});

test('a 2.0 journey still validates, restores and saves without losing anything', () => {
  const data = domeoTwoSave();
  assert.equal(validateSave(data), true);
  const migrated = migrateSave(data);
  assert.equal(migrated.version, 2);
  assert.equal(migrated.inventory.cooked, 0);
  assert.equal(migrated.inventory.chest, 0);
  assert.equal(migrated.home, null);
  const storage = {
    map: new Map([[SAVE_KEY, JSON.stringify(data)]]),
    getItem(key) {
      return this.map.get(key) ?? null;
    },
    setItem(key, value) {
      this.map.set(key, value);
    },
  };
  const loaded = readSave(storage).data;
  const restored = Game.restore(loaded);
  assert.equal(restored.elapsed, data.elapsed);
  assert.equal(restored.inventory.berry, 6);
  assert.equal(restored.inventory.axe, 1);
  assert.equal(restored.inventory.cooked, 0);
  assert.deepEqual(restored.world.structures, data.world.structures);
  assert.equal(
    restored.world.getState({ id: 'start:0', type: 'bush' }, 96.35).remaining,
    1,
  );
  restored.update(0.05, { x: 1, y: 0 });
  const saved = restored.snapshot();
  assert.equal(saved.world.seed, 404);
  assert.equal(saved.world.generationVersion, WORLD_GEN_VERSION);
  assert.equal(writeSave(saved, storage).ok, true);
  assert.equal(readSave(storage).data.world.seed, 404);
});

test('a 2.0 save with a full inventory of every item is still accepted', () => {
  const data = domeoTwoSave();
  for (const key of Object.keys(data.inventory)) data.inventory[key] = 1;
  data.inventory.berry = 999;
  assert.equal(validateSave(data), true);
});
