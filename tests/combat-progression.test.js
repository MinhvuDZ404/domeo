import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { validateSave, migrateSave } from '../src/storage.js';

test('basic attack has a cooldown, deals damage once and dead enemies reward once', () => {
  const game = new Game(51);
  game.inventory.axe = 1;
  game.combat.enemies.push({
    id: 'enemy:9,9',
    type: 'stalker',
    x: 0,
    y: 45,
    health: 15,
    maxHealth: 34,
    state: 'idle',
    timer: 0,
    hitFlash: 0,
  });
  game.player.direction = 'down';
  assert.equal(game.attack(), true);
  assert.equal(game.attack(), false);
  assert.equal(game.combat.enemies[0].health, 0);
  game.combat.tick = 0;
  game.combat.update(game, 0.1);
  assert.equal(game.combat.kills, 1);
  game.combat.update(game, 0.1);
  assert.equal(game.combat.kills, 1);
});

test('enemy windup is telegraphed before damage and player i-frames prevent frame damage', () => {
  const game = new Game(52);
  game.home = { x: -1000, y: -1000 };
  game.combat.enemies.push({
    id: 'enemy:8,8',
    type: 'stalker',
    x: 0,
    y: 20,
    health: 34,
    maxHealth: 34,
    state: 'idle',
    timer: 0,
    hitFlash: 0,
  });
  game.combat.update(game, 0.1);
  assert.equal(game.player.health, 100);
  assert.equal(game.combat.enemies[0].state, 'windup');
  game.combat.enemies[0].timer = 0;
  game.combat.tick = 0;
  game.combat.update(game, 0.1);
  assert.equal(game.player.health, 91);
  game.combat.enemies[0].state = 'windup';
  game.combat.enemies[0].timer = 0;
  game.combat.tick = 0;
  game.combat.update(game, 0.1);
  assert.equal(game.player.health, 91);
});

test('quest completion and rewards are atomic and cannot be claimed twice', () => {
  const game = new Game(53);
  Object.assign(game.stats, { berries: 1, wood: 4, stone: 2 });
  assert.equal(game.checkQuests(), true);
  const fiber = game.inventory.fiber;
  assert.equal(game.checkQuests(), false);
  assert.equal(game.inventory.fiber, fiber);
  assert.equal(game.progression.completed.length, 1);
  assert.deepEqual(game.progression.completed, game.progression.claimed);
});

test('camp upgrades spend exact resources, enforce location and persist', () => {
  const game = new Game(54);
  game.home = { x: 0, y: 0 };
  Object.assign(game.inventory, { wood: 10, stone: 6, fiber: 3 });
  assert.equal(game.upgradeCamp(), true);
  assert.equal(game.camp.level, 2);
  assert.equal(game.inventory.wood + game.inventory.stone + game.inventory.fiber, 0);
  assert.equal(game.upgradeCamp(), false);
  const data = game.snapshot();
  assert.equal(validateSave(data), true);
  assert.equal(Game.restore(data).camp.level, 2);
});

test('invalid or double-claimed quest persistence is rejected', () => {
  const data = new Game(56).snapshot();
  data.progression.completed = ['journey.first_steps'];
  data.progression.claimed = ['journey.first_steps', 'journey.first_steps'];
  assert.equal(validateSave(data), false);
  data.progression.completed = [];
  data.progression.claimed = ['journey.home_fire'];
  assert.equal(validateSave(data), false);
});

test('a schema 3 Domeo 5.0 save migrates progression without changing its world', () => {
  const data = new Game(55).snapshot();
  data.version = 3;
  delete data.camp;
  delete data.progression;
  delete data.combat;
  for (const id of ['guardianShard', 'beaconCore', 'refinedBlade']) {
    delete data.inventory[id];
    delete data.chest[id];
  }
  const migrated = migrateSave(data);
  assert.equal(migrated.version, 4);
  assert.equal(migrated.world.seed, 55);
  assert.equal(migrated.world.generationVersion, data.world.generationVersion);
  assert.equal(migrated.camp.level, 1);
  assert.equal(migrated.inventory.guardianShard, 0);
  assert.equal(validateSave(migrated), true);
});
