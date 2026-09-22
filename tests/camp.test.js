// Camp progression: what counts as the camp, what each tier unlocks, and the
// fact that a camp is derived from the world rather than stored twice.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CAMP_TIERS,
  CAMP_TIER_IDS,
  campBonuses,
  campLevel,
  campStructures,
  campSummary,
} from '../src/camp.js';
import { CAMP_RADIUS } from '../src/config.js';
import { Game } from '../src/game.js';
import { World } from '../src/world.js';

const structure = (type, x = 0, y = 0) => ({ id: `built:${type}${x}`, type, x, y });

test('the tiers are ordered, complete and each one promises something real', () => {
  assert.ok(CAMP_TIERS.length >= 4, '5.1 asks for at least one advanced structure');
  assert.deepEqual(
    CAMP_TIERS.map((tier) => tier.level),
    CAMP_TIERS.map((_, index) => index + 1),
  );
  for (const tier of CAMP_TIERS) {
    assert.ok(tier.name.length > 0);
    assert.ok(tier.benefit.length > 20, `${tier.id} needs a concrete benefit`);
    assert.equal(CAMP_TIER_IDS.includes(tier.id), true);
  }
  // The advanced structures are the ones the quest chain asks for.
  assert.ok(CAMP_TIER_IDS.includes('workbench'));
  assert.ok(CAMP_TIER_IDS.includes('shelter'));
  assert.ok(CAMP_TIER_IDS.includes('beacon'));
});

test('the camp is exactly the tiers built inside the camp radius', () => {
  const world = new World(404);
  const home = { x: 0, y: 0 };
  world.structures.push(
    structure('campfire', 0, 0),
    structure('workbench', 100, 0),
    structure('shelter', -140, 60),
    structure('seat', 20, 20), // not a tier
    structure('planter', 30, 30), // not a tier
    structure('campfire', CAMP_RADIUS + 200, 0), // outside the camp
  );
  const placed = campStructures(world, home);
  assert.equal(placed.length, 3);
  assert.equal(campLevel(world, home), 3);
  assert.equal(campLevel(world, null), 0);
  assert.deepEqual(campStructures(new World(1), home), []);
});

test('the camp level is the highest tier present, not the number of pieces', () => {
  const world = new World(7);
  const home = { x: 0, y: 0 };
  world.structures.push(structure('campfire'), structure('seat', 10, 10));
  assert.equal(campLevel(world, home), 1);
  // A beacon without a workbench still counts as level 5: the player can see
  // the camp they actually built, and the summary names what is missing.
  world.structures.push(structure('beacon', 60, 0));
  assert.equal(campLevel(world, home), 5);
  const summary = campSummary(world, home);
  assert.deepEqual(summary.built.sort(), ['beacon', 'campfire']);
  assert.equal(summary.placed, 2);
  assert.equal(summary.next.id, 'shelter');
  assert.equal(summary.next.tier.level, 2);
});

test('a finished camp has nothing left to suggest', () => {
  const world = new World(9);
  const home = { x: 0, y: 0 };
  CAMP_TIER_IDS.forEach((type, index) => world.structures.push(structure(type, index * 20, 0)));
  const summary = campSummary(world, home);
  assert.equal(summary.level, 5);
  assert.equal(summary.next, null);
});

test('camp bonuses only appear at the tier that earns them', () => {
  const fresh = campBonuses(0);
  assert.equal(fresh.hungerDrain, 1);
  assert.equal(fresh.warmthDrain, 1);
  assert.equal(fresh.workbench, false);
  assert.equal(fresh.beacon, false);
  const sheltered = campBonuses(2);
  assert.ok(sheltered.hungerDrain < 1, 'a shelter must reduce hunger use');
  assert.ok(sheltered.warmthDrain < 1, 'a shelter must keep warmth in');
  assert.equal(sheltered.shelterRest, true);
  assert.equal(sheltered.workbench, false);
  const full = campBonuses(5);
  assert.equal(full.workbench, true);
  assert.equal(full.mapTable, true);
  assert.equal(full.beacon, true);
});

test('the camp follows the player: no structures, no camp, no inventions', () => {
  const game = new Game(404);
  assert.equal(game.campSummary().level, 0);
  assert.equal(game.campState().inside, false);
  game.world.structures.push({ id: 'built:0', type: 'campfire', x: 40, y: 0 });
  game.home = { x: 0, y: 0 };
  game.refreshCamp();
  assert.equal(game.campState().inside, true);
  assert.equal(game.campState().nearFire, true, 'the fire is within its own heal radius');
  Object.assign(game.player, { x: 40, y: 0 });
  game.refreshCamp();
  assert.equal(game.campState().nearFire, true);
  assert.equal(game.campSummary().level, 1);
});

test('resting needs a shelter, food and a cooldown', () => {
  const game = new Game(404);
  assert.equal(game.rest(), false, 'there is nothing to rest in yet');
  game.world.structures.push({ id: 'built:0', type: 'shelter', x: 0, y: 0 });
  game.player.health = 40;
  game.player.hunger = 100;
  game.refreshCamp();
  assert.equal(game.rest(), true);
  assert.ok(game.player.health > 40, 'resting heals');
  assert.ok(game.player.hunger < 100, 'resting costs food');
  assert.equal(game.rest(), false, 'resting cannot be spammed');
  game.player.hunger = 3;
  game.elapsed += 120;
  const before = game.player.health;
  assert.equal(game.rest(), false);
  assert.equal(game.player.health, before, 'a hungry player cannot rest their way to health');
});

test('the beacon needs the seed, is lit once, and lights the way home', () => {
  const game = new Game(404);
  game.world.structures.push({ id: 'built:0', type: 'beacon', x: 0, y: 0 });
  game.home = { x: 0, y: 0 };
  assert.equal(game.lightBeacon(), false, 'no seed, no light');
  assert.equal(game.flags.beaconLit, false);
  game.inventory.ancientSeed = 1;
  assert.equal(game.lightBeacon(), true);
  assert.equal(game.flags.beaconLit, true);
  assert.equal(game.inventory.ancientSeed, 0, 'the seed is spent');
  assert.equal(game.lightBeacon(), false, 'and it only happens once');
});
