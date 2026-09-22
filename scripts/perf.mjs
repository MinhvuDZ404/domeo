// Measures the DOM-free half of Domeo: simulation updates and world queries.
// Run with: npm run perf        (report only)
//           npm run perf:check  (fails when a budget is exceeded)
import { performance } from 'node:perf_hooks';
import { Game } from '../src/game.js';
import { World } from '../src/world.js';
import { CHUNK_SIZE, MAX_STRUCTURES } from '../src/config.js';

const check = process.argv.includes('--check');
const json = process.argv.includes('--json');

function percentile(sorted, ratio) {
  if (!sorted.length) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * ratio)));
  return sorted[index];
}

function summarize(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  const mean = samples.reduce((sum, value) => sum + value, 0) / (samples.length || 1);
  // A single sample can always be stolen by the operating system or by a GC
  // pause, so the frame budget is held against the worst frame after trimming
  // at most 0.1% of the samples. The untrimmed maximum is still reported.
  const trim = Math.min(3, Math.max(0, Math.floor(sorted.length * 0.001)));
  return {
    frames: samples.length,
    mean,
    p50: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    max: sorted.at(-1) ?? 0,
    budgetMax: sorted[Math.max(0, sorted.length - 1 - trim)] ?? 0,
    trimmed: trim,
  };
}

// A settlement-sized base: the worst realistic case for proximity queries.
function buildStructures(count = MAX_STRUCTURES) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2;
    const radius = 120 + (i % 10) * 96;
    return {
      id: `built:${i}`,
      type: i % 3 === 0 ? 'campfire' : 'wall',
      x: Math.round(Math.cos(angle) * radius),
      y: Math.round(Math.sin(angle) * radius),
    };
  });
}

function measureSimulation({ seconds = 180, seed = 7 } = {}) {
  const game = new Game(seed);
  game.world.structures = buildStructures(40);
  const steps = seconds * 20;
  const samples = [];
  // Warm-up: the first frames pay for the initial chunk generation and for
  // JIT-compiling the update path. Both are one-off costs of entering a new
  // area, not the steady-state cost of playing, so they are measured
  // separately (see docs/PERFORMANCE.md) and excluded from the frame budget.
  const warmup = [];
  for (let i = 0; i < 40; i++) {
    const t = -0.2 + i / 20;
    const start = performance.now();
    game.update(0.05, { x: Math.cos(t / 7), y: Math.sin(t / 5) });
    game.getTarget();
    game.drainEvents();
    warmup.push(performance.now() - start);
  }
  const coldStart = Math.max(...warmup);
  for (let i = 0; i < steps; i++) {
    const t = i / 20;
    const movement = { x: Math.cos(t / 7), y: Math.sin(t / 5) };
    const start = performance.now();
    game.update(0.05, movement);
    game.getTarget();
    if (i % 12 === 0) game.interact();
    if (game.inventory.berry && i % 240 === 0) game.eat();
    game.drainEvents();
    samples.push(performance.now() - start);
  }
  return { ...summarize(samples), coldStart };
}

function measureWorldQueries({ frames = 900, seed = 12 } = {}) {
  const world = new World(seed);
  world.structures = buildStructures(60);
  world.getEntities({ x: -600, y: -600, width: 1200, height: 1200 }, 0);
  const bounds = { x: 0, y: 0, width: 1200, height: 800 };
  const samples = [];
  for (let i = 0; i < frames; i++) {
    bounds.x = (i % 40) * 64 - 1280;
    bounds.y = Math.floor(i / 40) * CHUNK_SIZE - 640;
    const start = performance.now();
    const entities = world.getEntities(bounds, i * 0.05);
    world.prune(i * 0.05);
    samples.push(performance.now() - start + entities.length * 0);
  }
  return summarize(samples);
}

const budgets = {
  simulationP95: 2.5,
  simulationMax: 8,
  worldQueryP95: 1.2,
};

const report = {
  simulation: measureSimulation(),
  worldQuery: measureWorldQueries(),
};

if (json) console.log(JSON.stringify({ budgets, ...report }, null, 2));
else {
  const ms = (value) => `${value.toFixed(3)} ms`;
  console.log('Domeo simulation performance (Node ' + process.version + ')');
  console.log('workload                     frames     mean      p50      p95  worst*');
  console.log('(*) worst frame after trimming at most 3 of the slowest samples');
  for (const [name, stats] of Object.entries(report)) {
    console.log(
      `${name.padEnd(28)} ${String(stats.frames).padStart(6)} ${ms(stats.mean).padStart(9)} ${ms(
        stats.p50,
      ).padStart(8)} ${ms(stats.p95).padStart(8)} ${ms(stats.budgetMax).padStart(8)}`,
    );
    if (stats.coldStart !== undefined)
      console.log(`cold start (40 frames, not budgeted)   max ${ms(stats.coldStart)}`);
  }
  console.log(
    '\nbudgets: simulation p95 < ' +
      budgets.simulationP95 +
      ' ms, worst frame < ' +
      budgets.simulationMax +
      ' ms, world query p95 < ' +
      budgets.worldQueryP95 +
      ' ms',
  );
}

if (check) {
  const failures = [];
  if (report.simulation.p95 > budgets.simulationP95)
    failures.push(`simulation p95 ${report.simulation.p95.toFixed(3)} ms is over budget`);
  if (report.simulation.budgetMax > budgets.simulationMax)
    failures.push(
      `simulation worst frame ${report.simulation.budgetMax.toFixed(3)} ms is over budget ` +
        `(untrimmed max ${report.simulation.max.toFixed(3)} ms)`,
    );
  if (report.worldQuery.p95 > budgets.worldQueryP95)
    failures.push(`world query p95 ${report.worldQuery.p95.toFixed(3)} ms is over budget`);
  if (failures.length) {
    console.error('\n' + failures.join('\n'));
    process.exitCode = 1;
  } else console.log('\nAll performance budgets are met.');
}
