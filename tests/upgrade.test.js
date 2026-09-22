// 5.1 migrates 2.0/3.0 (schema 1), 4.0 (schema 2) and 5.0 (schema 3) saves to
// schema 4. Old journeys keep their original world generator (v1 or v2); only
// new journeys use generation v3 with biome resources, the grove and the quest
// journal.
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

function domeoFourSave() {
  const game = new Game(404);
  const snapshot = game.snapshot();
  // Simulate a 4.0-era payload: schema 2, generation 1, no v5 fields.
  const { discovered, ...rest } = snapshot;
  assert.ok(discovered !== undefined);
  return {
    ...rest,
    version: 2,
    inventory: Object.fromEntries(
      Object.entries(rest.inventory).filter(
        ([key]) => !['mushroom', 'herb', 'crystal', 'salve', 'lantern'].includes(key),
      ),
    ),
    stats: Object.fromEntries(
      Object.entries(rest.stats).filter(
        ([key]) => !['mushrooms', 'herbs', 'crystals', 'landmarks', 'nights'].includes(key),
      ),
    ),
    world: { ...rest.world, generationVersion: 1 },
  };
}

// The 16 items and 14 stats a Domeo 5.0 save could contain. Everything else in
// a current payload is 5.1 content and must be absent from a schema-3 save.
const FIVE_OH_ITEMS = [
  'berry',
  'cooked',
  'mushroom',
  'herb',
  'crystal',
  'salve',
  'wood',
  'stone',
  'fiber',
  'axe',
  'pickaxe',
  'campfire',
  'torch',
  'lantern',
  'wall',
  'chest',
];
const FIVE_OH_STATS = [
  'berries',
  'wood',
  'stone',
  'crafted',
  'campfires',
  'distance',
  'cooked',
  'chests',
  'explored',
  'mushrooms',
  'herbs',
  'crystals',
  'landmarks',
  'nights',
];

function domeoFiveSave() {
  const game = new Game(404);
  game.update(0.05, { x: 1, y: 0 });
  const snapshot = game.snapshot();
  const { quests, flags, journeyComplete, ...rest } = snapshot;
  assert.ok(quests && flags && journeyComplete !== undefined);
  return {
    ...rest,
    version: 3,
    // A 5.0 journey had generation 2 and no warmth/stamina fields at all.
    player: Object.fromEntries(
      Object.entries(rest.player).filter(([key]) => !['warmth', 'stamina'].includes(key)),
    ),
    inventory: Object.fromEntries(
      Object.entries(rest.inventory).filter(([key]) => FIVE_OH_ITEMS.includes(key)),
    ),
    stats: Object.fromEntries(
      Object.entries(rest.stats).filter(([key]) => FIVE_OH_STATS.includes(key)),
    ),
    world: { ...rest.world, generationVersion: 2 },
  };
}

test('the release reports itself as 5.1 and writes save version 4', () => {
  assert.match(GAME_VERSION, /^5\.1\.\d+$/);
  assert.equal(SAVE_VERSION, 4);
  assert.equal(new Game(1).snapshot().version, 4);
  assert.equal(new Game(1).world.generationVersion, WORLD_GEN_VERSION);
  assert.equal(WORLD_GEN_VERSION, 3);
});

test('a 2.0 journey still validates, restores and saves without losing anything', () => {
  const data = domeoTwoSave();
  assert.equal(validateSave(data), true);
  const migrated = migrateSave(data);
  assert.equal(migrated.version, 4);
  assert.equal(migrated.inventory.cooked, 0);
  assert.equal(migrated.inventory.chest, 0);
  assert.equal(migrated.inventory.mushroom, 0);
  assert.equal(migrated.inventory.lantern, 0);
  assert.equal(migrated.inventory.ancientWood, 0);
  assert.equal(migrated.inventory.ancientSeed, 0);
  assert.equal(migrated.home, null);
  assert.deepEqual(migrated.discovered, []);
  // 5.1 fields arrive with safe defaults, and the first quest is waiting.
  assert.equal(migrated.player.warmth, 100);
  assert.equal(migrated.player.stamina, 100);
  assert.deepEqual(migrated.flags, {
    groveCleared: false,
    beaconLit: false,
    groveRevealed: false,
    keeperSeen: false,
  });
  assert.equal(migrated.journeyComplete, false);
  // The old world generator is preserved: the forest must not shift.
  assert.equal(migrated.world.generationVersion, 1);
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
  assert.equal(restored.world.generationVersion, 1);
  assert.equal(restored.world.getState({ id: 'start:0', type: 'bush' }, 96.35).remaining, 1);
  restored.update(0.05, { x: 1, y: 0 });
  const saved = restored.snapshot();
  assert.equal(saved.world.seed, 404);
  assert.equal(saved.world.generationVersion, 1);
  assert.equal(writeSave(saved, storage).ok, true);
  assert.equal(readSave(storage).data.world.seed, 404);
});

test('a 4.0 journey migrates to schema 4 and keeps its world', () => {
  const data = domeoFourSave();
  assert.equal(validateSave(data), true);
  const migrated = migrateSave(data);
  assert.equal(migrated.version, 4);
  assert.equal(migrated.world.generationVersion, 1);
  assert.equal(migrated.inventory.salve, 0);
  assert.equal(migrated.stats.landmarks, 0);
  const restored = Game.restore(migrateSave(data));
  assert.equal(restored.world.generationVersion, 1);
  assert.equal(restored.discovered.size, 0);
  assert.equal(restored.quests.status('journey_fire'), 'active');
});

test('a 5.0 journey migrates to schema 4 and starts the quest journal', () => {
  const data = domeoFiveSave();
  assert.equal(validateSave(data), true);
  const migrated = migrateSave(data);
  assert.equal(migrated.version, 4);
  assert.equal(migrated.player.warmth, 100);
  assert.equal(migrated.player.stamina, 100);
  assert.deepEqual(migrated.quests, { quests: {}, unlocked: [] });
  // The old world generator is preserved: a 5.0 forest must not shift.
  assert.equal(migrated.world.generationVersion, 2);
  const restored = Game.restore(migrated);
  assert.equal(restored.world.generationVersion, 2);
  assert.equal(restored.world.grove(), null);
  assert.equal(restored.quests.status('journey_fire'), 'active');
  assert.equal(restored.quests.status('journey_beacon'), 'locked');
  assert.equal(restored.player.warmth, 100);
  // Re-saving keeps the journey at schema 4 with everything intact.
  const again = restored.snapshot();
  assert.equal(again.version, 4);
  assert.equal(again.world.generationVersion, 2);
});

test('a quest cannot be finished by editing the save', () => {
  const data = new Game(77).snapshot();
  data.quests = {
    quests: { journey_fire: { status: 'claimed', progress: { fire: 1, roast: 1 } } },
    unlocked: ['recipe:workbench'],
  };
  // A claim with the work actually done is structurally valid...
  assert.equal(validateSave(data), true);
  // ...but an unlock that does not exist is not.
  const fake = new Game(77).snapshot();
  fake.quests = fake.quests ?? {};
  fake.quests.unlocked = ['passive:not_a_real_passive'];
  assert.equal(validateSave(fake), false);
  // Progress beyond the objective is refused as corrupt.
  const over = new Game(77).snapshot();
  over.quests = { quests: { journey_fire: { status: 'done', progress: { fire: 9, roast: 1 } } } };
  assert.equal(validateSave(over), false);
  // And a claimed-but-incomplete quest is repaired instead of trusted.
  const incomplete = new Game(77).snapshot();
  incomplete.quests = {
    quests: { journey_fire: { status: 'claimed', progress: { fire: 1, roast: 0 } } },
    unlocked: ['recipe:workbench'],
  };
  const restored = Game.restore(incomplete);
  assert.equal(restored.quests.status('journey_fire'), 'active');
  assert.equal(restored.quests.isUnlocked('recipe:workbench'), true);
});

test('a 2.0 save with a full inventory of every item is still accepted', () => {
  const data = domeoTwoSave();
  for (const key of Object.keys(data.inventory)) data.inventory[key] = 1;
  data.inventory.berry = 999;
  assert.equal(validateSave(data), true);
});
