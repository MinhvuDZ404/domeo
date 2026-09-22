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

test('cooking a berry at a campfire yields cooked food', () => {
  const game = new Game(1);
  game.world.structures.push({ id: 'built:0', type: 'campfire', x: 0, y: 0 });
  Object.assign(game.player, { x: 10, y: 10 });
  assert.equal(game.cook(), true);
  assert.equal(game.inventory.berry, 2);
  assert.equal(game.inventory.cooked, 1);
  Object.assign(game.player, { hunger: 40, health: 40 });
  assert.equal(game.eat('cooked'), true);
  assert.equal(game.inventory.cooked, 0);
});

test('chest transfer moves one item without duplicating it', () => {
  const game = new Game(1);
  game.world.structures.push({ id: 'built:0', type: 'chest', x: 0, y: 0 });
  game.openChest = true;
  game.inventory.wood = 4;
  assert.equal(game.transfer('wood', true), true);
  assert.equal(game.inventory.wood, 3);
  assert.equal(game.chest.wood, 1);
  assert.equal(game.transfer('wood', false), true);
  assert.equal(game.inventory.wood, 4);
  assert.equal(game.chest.wood, 0);
});

test('a refused action emits exactly one deny event and never a fake reward', () => {
  const game = new Game(1);
  Object.assign(game.player, { x: 180, y: 50 });
  game.drainEvents();
  assert.equal(harvest(game), false);
  const denied = game.drainEvents().filter((event) => event.type === 'deny');
  assert.equal(denied.length, 1);
  assert.equal(typeof denied[0].x, 'number');
  assert.equal(typeof denied[0].y, 'number');
  assert.equal(game.inventory.wood, 0);
});

test('nothing in reach and a successful harvest do not produce deny feedback', () => {
  const game = new Game(1);
  // Find genuinely open ground instead of assuming where the forest is empty.
  let open = null;
  for (let x = -400; x <= 400 && !open; x += 37)
    for (let y = -400; y <= 400 && !open; y += 41) {
      Object.assign(game.player, { x, y });
      if (game.getTarget() === null) open = { x, y };
    }
  assert.ok(open, 'the generated world should contain open ground');
  Object.assign(game.player, open);
  game.drainEvents();
  assert.equal(harvest(game), false);
  assert.deepEqual(game.drainEvents(), []);
  Object.assign(game.player, { x: -75, y: -45 });
  assert.equal(harvest(game), true);
  assert.equal(game.drainEvents().filter((event) => event.type === 'deny').length, 0);
});

test('an invalid build spot reports a deny event without spending the structure', () => {
  const game = new Game(1);
  game.inventory.wall = 1;
  game.beginPlacement('wall');
  game.drainEvents();
  assert.equal(game.place(0, 0), false);
  assert.equal(game.drainEvents().filter((event) => event.type === 'deny').length, 1);
  assert.equal(game.inventory.wall, 1);
  assert.equal(game.world.structures.length, 0);
});

test('a full inventory refuses the harvest and warns the player', () => {
  const game = new Game(1);
  Object.assign(game.player, { x: -75, y: -45 });
  game.inventory.berry = MAX_STACK;
  game.drainEvents();
  assert.equal(harvest(game), false);
  const events = game.drainEvents();
  assert.ok(events.some((event) => event.type === 'deny'));
  assert.ok(events.some((event) => event.type === 'message'));
  assert.equal(game.world.changes.size, 0);
});

const nearGuarantee = (game, x, y) => {
  Object.assign(game.player, { x, y: y + 25 });
  game.drainEvents();
};

test('mushrooms and herbs gather near home; herbs also yield fiber', () => {
  const game = new Game(404);
  nearGuarantee(game, 260, -180);
  assert.equal(game.getFocus()?.entity.type, 'mushroom');
  assert.equal(harvest(game), true);
  assert.equal(game.inventory.mushroom, 1);
  assert.equal(game.stats.mushrooms, 1);
  nearGuarantee(game, -260, 220);
  assert.equal(game.getFocus()?.entity.type, 'herb');
  assert.equal(harvest(game), true);
  assert.equal(game.inventory.herb, 1);
  assert.equal(game.inventory.fiber, 1);
  assert.equal(game.stats.herbs, 1);
});

test('crystals require a pickaxe and regrow slowly', () => {
  const game = new Game(404);
  const crystal = game.world
    .getEntities({ x: -3000, y: -3000, width: 6000, height: 6000 }, 0)
    .find((e) => e.type === 'crystal' && e.remaining > 0);
  assert.ok(crystal, 'seed 404 should grow at least one crystal');
  Object.assign(game.player, { x: crystal.x, y: crystal.y + 20 });
  assert.equal(harvest(game), false);
  game.inventory.pickaxe = 1;
  assert.equal(harvest(game), true);
  assert.equal(game.inventory.crystal, 1);
  assert.equal(game.stats.crystals, 1);
  const state = game.world.getState(crystal, game.elapsed);
  assert.equal(state.remaining, 1);
  assert.equal(state.respawnAt, game.elapsed + 300);
});

test('mushrooms feed a little and salves heal a lot, never above the maximum', () => {
  const game = new Game(1);
  Object.assign(game.player, { hunger: 40, health: 40 });
  Object.assign(game.inventory, { mushroom: 2, salve: 1 });
  assert.equal(game.eat('mushroom'), true);
  assert.equal(game.inventory.mushroom, 1);
  assert.equal(game.player.hunger, 55);
  assert.equal(game.player.health, 42);
  assert.equal(game.eat('salve'), true);
  assert.equal(game.inventory.salve, 0);
  assert.equal(game.player.health, 77);
  Object.assign(game.player, { health: 90 });
  game.inventory.salve = 1;
  assert.equal(game.eat('salve'), true);
  assert.equal(game.player.health, 100);
});

test('a healthy player cannot waste a salve', () => {
  const game = new Game(1);
  game.inventory.salve = 1;
  assert.equal(game.eat('salve'), false);
  assert.equal(game.inventory.salve, 1);
});

test('salve and lantern recipes consume their exact costs', () => {
  const game = new Game(1);
  Object.assign(game.inventory, { mushroom: 2, herb: 1, wood: 4, fiber: 2, crystal: 1 });
  assert.equal(game.canCraft('salve'), true);
  assert.equal(game.craft('salve'), true);
  assert.equal(game.inventory.salve, 1);
  assert.equal(game.inventory.mushroom, 0);
  assert.equal(game.inventory.herb, 0);
  assert.equal(game.canCraft('salve'), false);
  assert.equal(game.craft('lantern'), true);
  assert.equal(game.inventory.lantern, 1);
  assert.equal(game.inventory.wood, 0);
  assert.equal(game.inventory.crystal, 0);
});

test('a lantern is placed like other structures and recorded in the save', () => {
  const game = new Game(404);
  Object.assign(game.player, { x: 0, y: 0, direction: 'left' });
  game.inventory.lantern = 1;
  assert.equal(game.beginPlacement('lantern'), true);
  const point = game.placementPoint();
  assert.deepEqual(point, { x: -64, y: 0 });
  assert.equal(game.place(point.x, point.y), true);
  assert.equal(game.inventory.lantern, 0);
  assert.deepEqual(game.world.structures, [{ id: 'built:0', type: 'lantern', x: -64, y: 0 }]);
  assert.deepEqual(game.snapshot().world.structures, game.world.structures);
});

test('structures cannot be raised on top of a landmark', () => {
  const game = new Game(7);
  const [landmark] = game.world.getLandmarks({ x: -2000, y: -2000, width: 4000, height: 4000 });
  assert.ok(landmark);
  Object.assign(game.player, { x: landmark.x + 120, y: landmark.y });
  game.inventory.wall = 1;
  assert.equal(game.beginPlacement('wall'), true);
  assert.equal(game.canPlace(landmark.x, landmark.y), false);
  assert.equal(game.place(landmark.x, landmark.y), false);
  assert.equal(game.inventory.wall, 1);
});

test('discovering a landmark rewards once and survives a save round-trip', () => {
  const game = new Game(7);
  const landmarks = game.world.getLandmarks({ x: -2000, y: -2000, width: 4000, height: 4000 });
  landmarks.sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y));
  Object.assign(game.player, { x: landmarks[0].x + 100, y: landmarks[0].y });
  game.update(0.05, { x: 0, y: 0 });
  const events = game.drainEvents();
  assert.equal(game.discovered.size, 1);
  assert.equal(game.stats.landmarks, 1);
  assert.ok(events.some((event) => event.type === 'discovery'));
  const berries = game.inventory.berry;
  tick(game, 2);
  game.drainEvents();
  assert.equal(game.discovered.size, 1);
  assert.equal(game.inventory.berry, berries);
  const restored = Game.restore(game.snapshot());
  assert.equal(restored.discovered.size, 1);
  assert.equal(restored.stats.landmarks, 1);
  restored.update(0.05, { x: 0, y: 0 });
  assert.ok(!restored.drainEvents().some((event) => event.type === 'discovery'));
});

test('the journal tracks eleven goals, including forage, brew and discovery', () => {
  const game = new Game(7);
  assert.equal(game.goals().length, 11);
  assert.ok(game.goals().every((goal) => !goal.done));
  game.stats.mushrooms = 1;
  assert.ok(game.goals().find((goal) => goal.label.includes('nấm')).done);
  game.inventory.salve = 1;
  assert.ok(game.goals().find((goal) => goal.label.includes('cao dán')).done);
  game.stats.landmarks = 1;
  assert.ok(game.goals().find((goal) => goal.label.includes('địa danh')).done);
});

test('each dusk-to-night crossing counts exactly one survived night', () => {
  const game = new Game(1);
  game.elapsed = 430;
  game.update(0.05, { x: 0, y: 0 });
  assert.equal(game.stats.nights, 0);
  game.elapsed = 433;
  game.update(0.05, { x: 0, y: 0 });
  assert.equal(game.stats.nights, 1);
  game.update(0.05, { x: 0, y: 0 });
  assert.equal(game.stats.nights, 1);
});

test('biome and weather readings follow the seed, not the frame rate', () => {
  const a = new Game(42),
    b = new Game(42);
  Object.assign(a.player, { x: 1500, y: -800 });
  Object.assign(b.player, { x: 1500, y: -800 });
  a.elapsed = 500;
  b.elapsed = 500;
  assert.equal(a.biome(), b.biome());
  assert.deepEqual(a.weather(), b.weather());
  assert.ok(['clear', 'cloud', 'mist', 'rain'].includes(a.weather().type));
});

// ---- 5.1: survival, fighting and the way back -----------------------------
test('warmth drains in the cold and comes back beside a fire', () => {
  const game = new Game(404);
  game.elapsed = 1440 * 0.62; // night
  const start = game.player.warmth;
  for (let i = 0; i < 200; i++) game.update(0.05, { x: 0, y: 0 });
  assert.ok(game.player.warmth < start, 'a night in the open has to cost warmth');
  const cold = game.player.warmth;
  game.world.structures.push({ id: 'built:0', type: 'campfire', x: 10, y: 0 });
  game.home = { x: 10, y: 0 };
  game.refreshCamp();
  for (let i = 0; i < 400; i++) game.update(0.05, { x: 0, y: 0 });
  assert.ok(game.player.warmth > cold, 'a fire must give warmth back');
  assert.ok(game.player.warmth <= 100);
});

test('being cold hurts, being warm does not', () => {
  const warm = new Game(404);
  const health = warm.player.health;
  for (let i = 0; i < 200; i++) warm.update(0.05, { x: 0, y: 0 });
  assert.equal(warm.player.health, health, 'daytime warmth is free');

  const cold = new Game(404);
  cold.elapsed = 1440 * 0.62;
  cold.player.warmth = 4;
  cold.player.hunger = 100;
  for (let i = 0; i < 200; i++) cold.update(0.05, { x: 0, y: 0 });
  assert.ok(cold.player.health < 100, 'freezing damages the player');
  assert.ok(cold.player.health > 0, 'and it is slow enough to walk home');
});

test('walking regenerates stamina; sprinting spends it', () => {
  const game = new Game(404);
  game.update(0.05, { x: 1, y: 0 });
  game.player.stamina = 40;
  game.sprinting = false;
  for (let i = 0; i < 20; i++) game.update(0.05, { x: 1, y: 0 });
  const walked = game.player.stamina;
  assert.ok(walked > 40, 'walking is free and gives stamina back');
  game.sprinting = true;
  for (let i = 0; i < 20; i++) game.update(0.05, { x: 1, y: 0 });
  assert.ok(game.player.stamina < walked, 'sprinting costs stamina');
});

test('an exhausted player still attacks, but weakly', () => {
  const game = new Game(404);
  const enemy = game.enemies.spawn('stalker', game.player.x + 30, game.player.y);
  game.player.stamina = 100;
  game.attack({ x: 1, y: 0 });
  const strong = 26 - enemy.health;
  enemy.health = 26;
  game.cooldown = 0;
  game.player.stamina = 1;
  game.attack({ x: 1, y: 0 });
  const weak = 26 - enemy.health;
  assert.ok(strong > 0 && weak > 0, 'a swing must always land while there is a target');
  assert.ok(weak < strong, 'a tired swing is weaker');
  assert.ok(game.player.stamina >= 0, 'stamina never goes negative');
});

test('dodging needs stamina and refuses politely when there is none', () => {
  const game = new Game(404);
  game.player.stamina = 100;
  assert.equal(game.dodge({ x: 0, y: 1 }), true);
  game.player.dodge = 0;
  game.player.stamina = 2;
  assert.equal(game.dodge({ x: 0, y: 1 }), false);
  const denied = game.drainEvents().find((event) => event.type === 'message');
  assert.ok(denied, 'the refusal must be explainable');
});

test('dying is a setback, not a wipe: the journey wakes up at home', () => {
  const game = new Game(404);
  game.world.structures.push({ id: 'built:0', type: 'campfire', x: 300, y: -200 });
  game.home = { x: 300, y: -200 };
  game.inventory.axe = 1;
  game.inventory.wood = 12;
  game.stats.distance = 900;
  game.quests.report('gather', 'wood', 4);
  game.damagePlayer(999, { type: 'stalker' });
  assert.equal(game.dead, true);
  assert.equal(game.stats.deaths, 1);
  assert.equal(game.revive(), true);
  assert.equal(game.dead, false);
  assert.equal(game.player.x, 318);
  assert.equal(game.player.y, -174);
  assert.ok(game.player.health >= 40);
  assert.equal(game.inventory.axe, 1, 'death must never take the tools');
  assert.equal(game.inventory.wood, 12);
  assert.equal(game.quests.state('journey_fire').status, 'active', 'quests survive death');
  // And the save is a normal save: it loads, it validates, it keeps playing.
  const restored = Game.restore(game.snapshot());
  assert.equal(restored.dead, false);
  assert.equal(restored.stats.deaths, 1);
  assert.equal(restored.inventory.axe, 1);
});

test('a save carries the whole 5.1 journey: quests, flags, warmth and camp', () => {
  const game = new Game(404);
  game.world.structures.push({ id: 'built:0', type: 'shelter', x: 20, y: 0 });
  game.home = { x: 0, y: 0 };
  game.world.structures.push({ id: 'built:1', type: 'campfire', x: 0, y: 0 });
  game.refreshCamp();
  game.reportQuest('build', 'campfire', 1, { nearHome: true });
  game.reportQuest('cook', 'cooked', 1);
  game.claimQuest('journey_fire');
  game.player.warmth = 61;
  game.player.stamina = 42;
  game.flags.beaconLit = true;
  const data = game.snapshot();
  const restored = Game.restore(data);
  assert.equal(restored.quests.status('journey_fire'), 'claimed');
  assert.equal(restored.quests.isUnlocked('recipe:workbench'), true);
  assert.equal(restored.player.warmth, 61);
  assert.equal(restored.player.stamina, 42);
  assert.equal(restored.flags.beaconLit, true);
  assert.equal(restored.campSummary().level, 2);
  assert.equal(restored.campState().inside, true);
  // A restored journey keeps working: crafting, quests and combat all alive.
  restored.inventory.wood = 20;
  restored.inventory.stone = 20;
  assert.equal(restored.canCraft('workbench'), true);
  assert.equal(restored.canCraft('campfire'), true);
  restored.update(0.05, { x: 1, y: 0 });
  assert.equal(restored.elapsed > 0, true);
});
