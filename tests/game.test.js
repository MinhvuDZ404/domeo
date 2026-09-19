import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { MAX_STACK, MAX_STRUCTURES } from '../src/config.js';

const tick = (game, seconds, movement) => {
  for (let i = 0; i < seconds * 20; i++) game.update(0.05, movement);
};
const harvest = (game) => {
  game.cooldown = 0;
  return game.interact();
};

test('walking diagonally is no faster than walking straight', () => {
  const straight = new Game(1),
    diagonal = new Game(1);
  tick(straight, 0.5, { x: 1, y: 0 });
  tick(diagonal, 0.5, { x: 1, y: 1 });
  assert.ok(Math.abs(Math.hypot(diagonal.player.x, diagonal.player.y) - straight.player.x) < 1e-8);
});
test('long frame gaps are capped and cannot starve or teleport a player', () => {
  const game = new Game(1);
  game.update(500, { x: 1, y: 0 });
  assert.equal(game.elapsed, 0.05);
  assert.equal(game.player.x, 8.5);
  assert.ok(game.player.hunger > 99);
});
test('movement cannot tunnel through tree hitboxes', () => {
  const game = new Game(1);
  Object.assign(game.player, { x: 150, y: 50 });
  tick(game, 1, { x: 1, y: 0 });
  assert.ok(game.player.x <= 179);
  assert.ok(game.player.x > 150);
});
test('a regrown tree does not permanently trap the player', () => {
  const game = new Game(1);
  Object.assign(game.player, { x: 202, y: 50 });
  tick(game, 0.5, { x: 1, y: 0 });
  assert.ok(game.player.x > 230);
});
test('gathering berries puts them in inventory without automatically eating them', () => {
  const game = new Game(1);
  Object.assign(game.player, { x: -75, y: -45, hunger: 50 });
  assert.equal(harvest(game), true);
  assert.equal(game.inventory.berry, 4);
  assert.equal(game.inventory.fiber, 1);
  assert.equal(game.player.hunger, 50);
  assert.equal(game.stats.berries, 1);
  assert.equal(harvest(game), true);
  assert.equal(harvest(game), true);
  assert.equal(harvest(game), false);
});
test('gathering respects an action cooldown', () => {
  const game = new Game(1);
  Object.assign(game.player, { x: -75, y: -45 });
  assert.equal(game.interact(), true);
  assert.equal(game.interact(), false);
  assert.equal(game.inventory.berry, 4);
});
test('eating consumes exactly one berry and clamps hunger and health', () => {
  const game = new Game(1);
  Object.assign(game.player, { hunger: 90, health: 99 });
  assert.equal(game.eat(), true);
  assert.equal(game.inventory.berry, 2);
  assert.equal(game.player.hunger, 100);
  assert.equal(game.player.health, 100);
  assert.equal(game.eat(), false);
  assert.equal(game.inventory.berry, 2);
});
test('empty food inventory cannot create hunger or negative counts', () => {
  const game = new Game(1);
  game.inventory.berry = 0;
  game.player.hunger = 20;
  assert.equal(game.eat(), false);
  assert.equal(game.player.hunger, 20);
  assert.equal(game.inventory.berry, 0);
});
test('crafting subtracts recipe costs exactly once; unique tools cannot be duplicated', () => {
  const game = new Game(1);
  Object.assign(game.inventory, { wood: 10, stone: 10 });
  assert.equal(game.craft('axe'), true);
  assert.equal(game.inventory.wood, 6);
  assert.equal(game.inventory.stone, 8);
  assert.equal(game.inventory.axe, 1);
  assert.equal(game.craft('axe'), false);
  assert.equal(game.inventory.wood, 6);
  assert.equal(game.stats.crafted, 1);
});
test('failed and unknown recipes do not consume resources', () => {
  const game = new Game(1);
  game.inventory.wood = 3;
  const inventory = { ...game.inventory };
  assert.equal(game.craft('axe'), false);
  assert.equal(game.craft('__proto__'), false);
  assert.deepEqual(game.inventory, inventory);
});
test('trees require a crafted axe and three interactions yield five wood', () => {
  const game = new Game(1);
  Object.assign(game.player, { x: 180, y: 50 });
  assert.equal(harvest(game), false);
  assert.equal(game.inventory.wood, 0);
  game.inventory.axe = 1;
  assert.equal(harvest(game), true);
  assert.equal(game.inventory.wood, 0);
  harvest(game);
  harvest(game);
  assert.equal(game.inventory.wood, 5);
  assert.equal(game.stats.wood, 5);
  assert.equal(game.world.isBlocked(202, 50, game.elapsed), false);
});
test('stone deposits require a pickaxe and yield stone after three hits', () => {
  const game = new Game(1);
  Object.assign(game.player, { x: -195, y: 130 });
  assert.equal(harvest(game), false);
  game.inventory.pickaxe = 1;
  harvest(game);
  harvest(game);
  harvest(game);
  assert.equal(game.inventory.stone, 5);
});
test('full inventory does not destroy harvestable resources', () => {
  const game = new Game(1);
  Object.assign(game.player, { x: -75, y: -45 });
  game.inventory.berry = MAX_STACK;
  assert.equal(harvest(game), false);
  assert.equal(game.world.changes.size, 0);
});
test('placement consumes one crafted structure, not raw materials', () => {
  const game = new Game(1);
  game.inventory.campfire = 2;
  assert.equal(game.beginPlacement('campfire'), true);
  assert.equal(game.place(0, -64), true);
  assert.equal(game.inventory.campfire, 1);
  assert.equal(game.world.structures.length, 1);
  assert.equal(game.stats.campfires, 1);
  assert.equal(game.placement, null);
});
test('invalid placement does not consume the structure', () => {
  const game = new Game(1);
  game.inventory.wall = 1;
  game.beginPlacement('wall');
  for (const point of [
    [0, 0],
    [500, 0],
    [80, -28],
    [NaN, 10],
  ])
    assert.equal(game.place(...point), false);
  assert.equal(game.inventory.wall, 1);
  assert.equal(game.world.structures.length, 0);
});
test('structures cannot overlap and the building limit is enforced', () => {
  const game = new Game(1);
  game.inventory.campfire = 2;
  game.beginPlacement('campfire');
  game.place(0, -64);
  game.beginPlacement('campfire');
  assert.equal(game.place(0, -64), false);
  game.world.structures = Array.from({ length: MAX_STRUCTURES }, (_, i) => ({
    id: `built:${i}`,
    type: 'wall',
    x: 500 + i * 100,
    y: 500,
  }));
  assert.equal(game.place(0, -64), false);
});
test('campfires heal only when a living player is sufficiently fed and nearby', () => {
  const game = new Game(1);
  game.world.structures.push({ id: 'built:0', type: 'campfire', x: 0, y: -64 });
  game.player.health = 50;
  tick(game, 1);
  assert.ok(game.player.health > 52);
  game.player.hunger = 10;
  const health = game.player.health;
  tick(game, 1);
  assert.equal(game.player.health, health);
});
test('crafting a torch activates it and it can be toggled', () => {
  const game = new Game(1);
  assert.equal(game.toggleTorch(), false);
  Object.assign(game.inventory, { wood: 3, fiber: 2 });
  assert.equal(game.craft('torch'), true);
  assert.equal(game.torchLit, true);
  assert.equal(game.toggleTorch(), true);
  assert.equal(game.torchLit, false);
});
test('starvation ends the run once and stops further state changes', () => {
  const game = new Game(1);
  Object.assign(game.player, { health: 0.1, hunger: 0 });
  game.update(0.05);
  assert.equal(game.dead, true);
  assert.equal(game.player.health, 0);
  const elapsed = game.elapsed;
  game.update(0.05);
  assert.equal(game.elapsed, elapsed);
  assert.equal(game.eat(), false);
  assert.equal(game.craft('axe'), false);
  assert.equal(game.interact(), false);
  assert.equal(game.drainEvents().filter((e) => e.type === 'death').length, 1);
});
test('a new run resets inventory, goals, resources, structures and survival stats', () => {
  const a = new Game(1);
  a.inventory.axe = 1;
  a.stats.campfires = 5;
  a.world.structures.push({ id: 'built:0', type: 'wall', x: 60, y: 60 });
  const b = new Game(1);
  assert.equal(b.inventory.axe, 0);
  assert.equal(b.inventory.berry, 3);
  assert.equal(b.world.structures.length, 0);
  assert.equal(b.stats.campfires, 0);
  assert.equal(
    b.goals().some((goal) => goal.done),
    false,
  );
});
