// The 3.0 release keeps the 2.0 save structure: a journey started before the
// update must load, play and save again without regenerating its world.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { validateSave, readSave, writeSave } from '../src/storage.js';
import { GAME_VERSION, SAVE_KEY, SAVE_VERSION } from '../src/config.js';

// A save written by the 2.0 build, including a harvested bush and a campfire.
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

test('the release keeps save version 1 and reports itself as 3.0', () => {
  assert.equal(GAME_VERSION, '3.0.0');
  assert.equal(SAVE_VERSION, 1);
  assert.equal(new Game(1).snapshot().version, 1);
});

test('a 2.0 journey still validates, restores and saves without losing anything', () => {
  const data = domeoTwoSave();
  assert.equal(validateSave(data), true);
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
  assert.deepEqual(restored.inventory, data.inventory);
  assert.deepEqual(restored.world.structures, data.world.structures);
  // The harvested bush is still two charges short of full.
  assert.equal(restored.world.getState({ id: 'start:0', type: 'bush' }, 96.35).remaining, 1);
  // Playing on does not move the world to another generation.
  restored.update(0.05, { x: 1, y: 0 });
  const saved = restored.snapshot();
  assert.equal(saved.world.seed, 404);
  assert.equal(writeSave(saved, storage).ok, true);
  assert.equal(readSave(storage).data.world.seed, 404);
});

test('a 2.0 save with a full inventory of every item is still accepted', () => {
  const data = domeoTwoSave();
  for (const key of Object.keys(data.inventory)) data.inventory[key] = 1;
  data.inventory.berry = 999;
  assert.equal(validateSave(data), true);
});
