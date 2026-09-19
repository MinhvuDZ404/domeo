import test from 'node:test';
import assert from 'node:assert/strict';
import { World, makeChunk, hash, overlaps } from '../src/world.js';
import { DAY_LENGTH, MAX_CACHED_CHUNKS, getDayInfo } from '../src/config.js';

const starter = (world, id) =>
  world
    .getEntities({ x: -300, y: -300, width: 600, height: 600 }, 0)
    .find((entity) => entity.id === `start:${id}`);

test('resource timers recover across the original 120-second day wrap', () => {
  const world = new World(123),
    bush = starter(world, 0);
  const harvestedAt = DAY_LENGTH - 5;
  world.consume(bush, harvestedAt);
  world.consume(bush, harvestedAt);
  world.consume(bush, harvestedAt);
  assert.equal(world.getState(bush, DAY_LENGTH + 1).remaining, 0);
  assert.equal(world.getState(bush, harvestedAt + 18).remaining, 3);
  assert.equal(world.changes.size, 0);
});
test('resource timers also recover after multiple complete days', () => {
  const world = new World(88),
    bush = starter(world, 0);
  for (let i = 0; i < 3; i++) world.consume(bush, 910);
  assert.equal(world.getState(bush, 927).remaining, 0);
  assert.equal(world.getState(bush, 928).remaining, 3);
});
test('chunk generation is deterministic and independent of visitation order', () => {
  const a = new World(345),
    b = new World(345);
  const expected = a.getChunk(-3, 8);
  b.getChunk(99, -72);
  b.getChunk(0, 0);
  assert.deepEqual(b.getChunk(-3, 8), expected);
  assert.deepEqual(makeChunk(345, -3, 8), expected);
  assert.notDeepEqual(makeChunk(346, -3, 8), expected);
});
test('signed chunk coordinates do not share a mirrored seed', () => {
  assert.notEqual(hash(404, 2, 3), hash(404, -2, -3));
  assert.notEqual(hash(404, 0, 1), hash(404, 0, -1));
});
test('chunk cache is bounded and evicted chunks regenerate identically', () => {
  const world = new World(99),
    original = world.getChunk(0, 0);
  for (let i = 1; i < 500; i++) world.getChunk(i, i);
  assert.equal(world.chunks.size, MAX_CACHED_CHUNKS);
  assert.deepEqual(world.getChunk(0, 0), original);
  assert.equal(world.chunks.size, MAX_CACHED_CHUNKS);
});
test('harvest state survives chunk eviction without caching the entire world', () => {
  const world = new World(10),
    bush = starter(world, 0);
  world.consume(bush, 0);
  for (let i = 1; i < 100; i++) world.getChunk(i, i);
  assert.equal(world.getState(bush, 10).remaining, 2);
  const saved = world.serialize(10);
  assert.ok(!('chunks' in saved));
  assert.equal(saved.changes.length, 1);
});
test('expired and partially harvested resource changes are pruned', () => {
  const world = new World(10),
    bush = starter(world, 0);
  world.consume(bush, 0);
  world.prune(19);
  assert.equal(world.changes.size, 0);
});
test('starter resources belong to their spatial chunks, including negative coordinates', () => {
  const world = new World(404);
  const tree = world
    .getEntities({ x: -260, y: -135, width: 25, height: 25 }, 0)
    .find((e) => e.id === 'start:9');
  assert.ok(tree);
  assert.ok(world.getChunk(-1, -1).entities.some((e) => e.id === 'start:0'));
  assert.ok(!world.getChunk(0, 0).entities.some((e) => e.id === 'start:0'));
});
test('fresh spawn is walkable for many world seeds', () => {
  for (let seed = 0; seed < 100; seed++) {
    const world = new World(seed);
    assert.equal(world.isBlocked(0, 0, 0), false);
  }
});
test('regrown trees allow a trapped player to walk outward, not further inward', () => {
  const world = new World(1);
  assert.equal(world.isBlocked(202, 50, 0), true);
  assert.equal(world.canMove(202, 50, 207, 50, 0), true);
  assert.equal(world.canMove(210, 50, 205, 50, 0), false);
});
test('collision rectangles touching at an edge are not overlapping', () => {
  const a = { x: 0, y: 0, width: 10, height: 10 };
  assert.equal(overlaps(a, { x: 10, y: 0, width: 10, height: 10 }), false);
  assert.equal(overlaps(a, { x: 9, y: 0, width: 10, height: 10 }), true);
});
test('day labels, light levels and clocks use one consistent phase', () => {
  const morning = getDayInfo(0),
    night = getDayInfo(70);
  assert.equal(morning.isNight, false);
  assert.ok(morning.daylight > 0.9);
  assert.equal(morning.clock, '10:48');
  assert.equal(morning.day, 1);
  assert.equal(night.isNight, true);
  assert.equal(night.daylight, 0);
  assert.equal(getDayInfo(DAY_LENGTH).day, 2);
  assert.equal(getDayInfo(DAY_LENGTH).clock, morning.clock);
});

test('resources cannot regrow through a placed structure', () => {
  const world = new World(1),
    tree = starter(world, 8);
  for (let i = 0; i < 3; i++) world.consume(tree, 0);
  world.structures.push({ id: 'built:0', type: 'campfire', x: tree.x, y: tree.y });
  const bounds = { x: tree.x - 50, y: tree.y - 50, width: 100, height: 100 };
  assert.equal(
    world.getEntities(bounds, 121).some((e) => e.id === tree.id),
    false,
  );
  assert.equal(world.isBlocked(tree.x, tree.y, 121), false);
});
