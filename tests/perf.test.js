// Guardrails for the world queries that run every frame. The timing budget is
// deliberately loose: it only fails when an accidental full-world scan returns.
import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { World } from '../src/world.js';
import { MAX_STRUCTURES } from '../src/config.js';

const settlement = (count = MAX_STRUCTURES) =>
  Array.from({ length: count }, (_, i) => ({
    id: `built:${i}`,
    type: i % 2 ? 'wall' : 'campfire',
    x: Math.cos((i / count) * Math.PI * 2) * (140 + (i % 8) * 104),
    y: Math.sin((i / count) * Math.PI * 2) * (140 + (i % 8) * 104),
  }));

test('the structure index rebuilds only when the structures array changes', () => {
  const world = new World(5);
  assert.equal(world.structureIndex().size, 0);
  assert.equal(
    world.structureIndex().get('0,0'),
    undefined,
    'an empty settlement must not invent buckets',
  );
  world.structures.push({ id: 'built:0', type: 'wall', x: 0, y: 0 });
  const bucket = world.structureIndex().get('0,0');
  assert.equal(bucket.length, 1);
  assert.equal(world.structureIndex().get('0,0'), bucket, 'unchanged structures reuse the index');
  world.structures.push({ id: 'built:1', type: 'wall', x: 1, y: 1 });
  assert.equal(world.structureIndex().get('0,0').length, 2);
  world.structures = [];
  assert.equal(world.structureIndex().size, 0, 'a replaced array must be re-indexed');
});

test('proximity queries return only the structures that matter', () => {
  const world = new World(5);
  world.structures = [
    { id: 'built:0', type: 'wall', x: 20, y: 0 },
    { id: 'built:1', type: 'campfire', x: 30, y: 0 },
    { id: 'built:2', type: 'wall', x: 900, y: 900 },
  ];
  const near = world.structuresNear(0, 0);
  assert.deepEqual(
    near.map((structure) => structure.id),
    ['built:0', 'built:1'],
  );
  assert.equal(world.structuresNear(900, 900).length, 1);
  assert.equal(world.structuresNear(9000, 9000), null);
  world.structures = settlement();
  const inSettlement = world.structuresNear(140, 0);
  assert.ok(inSettlement.length > 0 && inSettlement.length < world.structures.length);
});

test('buildings still keep resources from regrowing, including on chunk borders', () => {
  const world = new World(1);
  const structure = { id: 'built:0', type: 'wall', x: 511, y: 511 };
  world.structures = [structure];
  const entity = { id: 'x,y:0', type: 'tree', x: 512, y: 512, variant: 0.5 };
  // The wall sits in the neighbouring bucket and must still be found.
  assert.deepEqual(world.structuresNear(entity.x, entity.y), [structure]);
  assert.deepEqual(world.structuresNear(entity.x + 200, entity.y), null);
});

test('queries in a full settlement stay far below a frame budget', () => {
  const world = new World(21);
  world.structures = settlement();
  const bounds = { x: -600, y: -400, width: 1200, height: 800 };
  const iterations = 600;
  for (let i = 0; i < 60; i++) world.getEntities(bounds, i * 0.05);
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    world.getEntities(bounds, i * 0.05);
    world.canMove(0, 0, i % 300, i % 200, i * 0.05);
  }
  const perQuery = (performance.now() - start) / iterations;
  assert.ok(perQuery < 8, `world queries averaged ${perQuery.toFixed(2)} ms per iteration`);
});
