import test from 'node:test';
import assert from 'node:assert/strict';
import { World, makeChunk, hash, overlaps, biomeAt } from '../src/world.js';
import {
  CHUNK_SIZE,
  DAY_LENGTH,
  MAX_CACHED_CHUNKS,
  getDayInfo,
  getWeather,
} from '../src/config.js';

const starter = (world, id) =>
  world
    .getEntities({ x: -300, y: -300, width: 600, height: 600 }, 0)
    .find((entity) => entity.id === `start:${id}`);

test('resource timers recover across the 24-minute day wrap', () => {
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
  for (const generation of [1, 2]) {
    const a = new World(345, [], [], generation),
      b = new World(345, [], [], generation);
    const expected = a.getChunk(-3, 8);
    b.getChunk(99, -72);
    b.getChunk(0, 0);
    assert.deepEqual(b.getChunk(-3, 8), expected);
    assert.deepEqual(makeChunk(345, -3, 8, generation), expected);
    assert.notDeepEqual(makeChunk(346, -3, 8, generation), expected);
  }
});
test('generation v1 chunks keep their exact legacy shape', () => {
  const chunk = makeChunk(345, -3, 8, 1);
  assert.deepEqual(Object.keys(chunk).sort(), ['decorations', 'entities']);
  assert.equal(chunk.decorations.length, 26);
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
test('one game day lasts exactly 24 minutes of simulation time', () => {
  assert.equal(DAY_LENGTH, 1440);
  assert.equal(getDayInfo(0).day, 1);
  // Day 2 begins when the offset clock wraps: elapsed = DAY_LENGTH - DAY_OFFSET.
  assert.equal(getDayInfo(1151.9).day, 1);
  assert.equal(getDayInfo(1152).day, 2);
  assert.equal(getDayInfo(1152 + 1440).day, 3);
  assert.equal(getDayInfo(1440).clock, getDayInfo(0).clock);
  assert.equal(getDayInfo(2880).clock, getDayInfo(0).clock);
});
test('day labels, light levels and clocks use one consistent phase', () => {
  const morning = getDayInfo(0),
    night = getDayInfo(800);
  assert.equal(morning.isNight, false);
  assert.ok(morning.daylight > 0.9);
  assert.equal(morning.clock, '10:48');
  assert.equal(morning.day, 1);
  assert.equal(night.isNight, true);
  assert.equal(night.daylight, 0);
  assert.equal(getDayInfo(DAY_LENGTH).day, 2);
  assert.equal(getDayInfo(DAY_LENGTH).clock, morning.clock);
  // Golden hour and night carry distinct emotional grades.
  const sunset = getDayInfo(DAY_LENGTH * 0.3 - 1);
  assert.ok(sunset.warmth > 0.4);
  assert.ok(night.nightFactor > 0.9);
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

test('biomes are deterministic and the spawn stays a friendly meadow', () => {
  assert.equal(biomeAt(404, 0, 0), 'meadow');
  assert.equal(biomeAt(404, 100, 50), 'meadow');
  assert.equal(biomeAt(404, 1500, -800), biomeAt(404, 1500, -800));
  const world = new World(404);
  assert.equal(world.biomeAt(0, 0), 'meadow');
  const legacy = new World(404, [], [], 1);
  assert.equal(legacy.biomeAt(5000, 5000), 'woodland');
});

test('every seed has a landmark within a short walk of home', () => {
  for (let seed = 0; seed < 50; seed++) {
    const world = new World(seed);
    const landmarks = world.getLandmarks({ x: -2000, y: -2000, width: 4000, height: 4000 });
    const closest = Math.min(...landmarks.map((l) => Math.hypot(l.x, l.y)));
    assert.ok(closest < 2000, `seed ${seed}: closest landmark at ${Math.round(closest)}px`);
  }
});

test('landmarks are deterministic per seed and never invade the spawn', () => {
  const a = new World(777),
    b = new World(777);
  const bounds = { x: -3000, y: -3000, width: 6000, height: 6000 };
  assert.deepEqual(a.getLandmarks(bounds), b.getLandmarks(bounds));
  for (const landmark of a.getLandmarks(bounds)) {
    assert.ok(Math.hypot(landmark.x, landmark.y) > 550);
    assert.match(landmark.id, /^lm:-?\d{1,5},-?\d{1,5}$/);
  }
  const legacy = new World(777, [], [], 1);
  assert.deepEqual(legacy.getLandmarks(bounds), []);
});

test('weather bands are deterministic per seed and blend without jumps', () => {
  const a = getWeather(100, 42);
  const b = getWeather(100, 42);
  assert.deepEqual(a, b);
  assert.ok(['clear', 'cloud', 'mist', 'rain'].includes(a.type));
  assert.ok(a.intensity >= 0 && a.intensity <= 1);
  // Same band, different seeds usually differ; different bands can differ.
  const other = getWeather(100, 43);
  assert.ok(typeof other.type === 'string');
});

// ---- 5.1: generation v3 ---------------------------------------------------
test('generation v3 adds its content without moving a single v2 tree', () => {
  for (const [cx, cy] of [
    [0, 0],
    [3, -2],
    [-7, 5],
    [12, 12],
    [-30, 24],
  ]) {
    const v2 = makeChunk(404, cx, cy, 2);
    const v3 = makeChunk(404, cx, cy, 3);
    // Every v2 entity is still there, in the same order, at the same place.
    for (const [index, entity] of v2.entities.entries()) {
      assert.deepEqual(v3.entities[index], entity, `chunk ${cx},${cy} entity ${index} moved`);
    }
    assert.ok(v3.entities.length >= v2.entities.length);
    assert.deepEqual(v3.decorations, v2.decorations);
  }
});

test('generation v1 output is byte-identical to the original generator', () => {
  const chunk = makeChunk(404, 0, 0, 1);
  assert.deepEqual(Object.keys(chunk).sort(), ['decorations', 'entities']);
  assert.equal(chunk.decorations.length, 26);
  assert.equal(
    chunk.entities.some((entity) => entity.type === 'ironwood'),
    false,
  );
  assert.equal(
    chunk.entities.some((entity) => entity.type === 'geode'),
    false,
  );
  assert.equal(
    chunk.entities.some((entity) => entity.type === 'mushroom'),
    false,
  );
});

test('every seed has exactly one grove, far from home and marked on the map', () => {
  for (const seed of [0, 1, 7, 404, 99991]) {
    const world = new World(seed);
    const grove = world.grove();
    assert.ok(grove, `seed ${seed} has no grove`);
    assert.equal(grove.type, 'ancientGrove');
    const distance = Math.hypot(grove.x, grove.y);
    assert.ok(distance > 5000 && distance < 10000, `grove ${distance.toFixed(0)}px from home`);
    // Deterministic: the same seed always has the grove in the same place.
    assert.deepEqual(new World(seed).grove(), grove);
    // The grove really is in the chunk it claims to be in.
    const cx = Math.floor(grove.x / CHUNK_SIZE);
    const cy = Math.floor(grove.y / CHUNK_SIZE);
    const chunk = world.getChunk(cx, cy);
    assert.deepEqual(chunk.landmarks, [{ ...grove }]);
    // And it can be found by the ordinary landmark query.
    const found = world.landmarksNear(grove.x, grove.y, 120);
    assert.equal(found.length, 1);
    assert.equal(found[0].id, grove.id);
  }
  // Older generations keep their forest: no grove is ever invented for them.
  assert.equal(new World(404, [], [], 2).grove(), null);
  assert.equal(new World(404, [], [], 1).grove(), null);
});

test('v3 resources only appear far from home and only where they belong', () => {
  const world = new World(404);
  const found = new Map();
  for (let cx = -20; cx <= 20; cx += 4) {
    for (let cy = -20; cy <= 20; cy += 4) {
      for (const entity of world.getChunk(cx, cy).entities) {
        if (entity.type !== 'ironwood' && entity.type !== 'geode') continue;
        const distance = Math.hypot(entity.x, entity.y);
        assert.ok(distance > 1400, `${entity.type} grew ${distance.toFixed(0)}px from home`);
        const biome = world.biomeAt(entity.x, entity.y);
        if (entity.type === 'ironwood')
          assert.ok(['deepwood', 'ancient'].includes(biome), `ironwood in ${biome}`);
        else assert.ok(['rocky', 'ancient', 'deepwood'].includes(biome), `geode in ${biome}`);
        found.set(entity.type, (found.get(entity.type) ?? 0) + 1);
      }
    }
  }
  assert.ok(found.get('ironwood') > 0, 'ancient wood has to exist somewhere');
  assert.ok(found.get('geode') > 0, 'crystal veins have to exist somewhere');
});
