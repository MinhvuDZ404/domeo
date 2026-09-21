// Scripted playthroughs of the real game logic (no browser needed) that report
// how long the opening of a journey takes. Run with:
//   npm run balance             print the report
//   npm run balance -- --write  refresh the results block in docs/BALANCE.md
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Game } from '../src/game.js';
import {
  BERRY_HUNGER,
  DAY_LENGTH,
  HUNGER_DRAIN_PER_SECOND,
  INTERACTION_DISTANCE,
  ITEMS,
  MUSHROOM_HEALTH,
  MUSHROOM_HUNGER,
  RECIPES,
  RESOURCES,
  SALVE_HEALTH,
  getDayInfo,
} from '../src/config.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const write = process.argv.includes('--write');
const seedArg = process.argv.indexOf('--seeds');
const seedCount = seedArg > -1 ? Number(process.argv[seedArg + 1]) || 5 : 5;
const MAX_SECONDS = 20 * 60;

function randomGenerator(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// What the bot still wants: first a campfire, then one salve, then exploration.
function wantedResource(game, random, forageDone) {
  const inventory = game.inventory;
  const needsBerries = inventory.berry < 3 && game.player.hunger < 85;
  const woodTarget = inventory.axe > 0 ? 10 : 4;
  const stoneTarget = inventory.axe > 0 ? 6 : 2;
  const list = [];
  if (needsBerries) list.push('bush');
  if (inventory.wood < woodTarget) list.push(inventory.axe > 0 ? 'tree' : 'branch');
  if (inventory.stone < stoneTarget) list.push('pebble');
  if (game.stats.campfires > 0 && !forageDone) {
    if ((inventory.mushroom ?? 0) < 3) list.push('mushroom');
    if ((inventory.herb ?? 0) < 2) list.push('herb');
    if ((inventory.crystal ?? 0) < 1) list.push('crystal');
  }
  if (!list.length) return null;
  // Fix a wandering bot's preference order so runs stay reproducible.
  return list[Math.floor(random() * list.length)];
}

function nearestLandmark(game, radius = 2600) {
  const player = game.player;
  const landmarks = game.world.getLandmarks({
    x: player.x - radius,
    y: player.y - radius,
    width: radius * 2,
    height: radius * 2,
  });
  let best = null,
    bestDistance = Infinity;
  for (const landmark of landmarks) {
    if (game.discovered.has(landmark.id)) continue;
    const distance = Math.hypot(landmark.x - player.x, landmark.y - player.y);
    if (distance < bestDistance) {
      best = landmark;
      bestDistance = distance;
    }
  }
  return best;
}

function nearestResource(game, type, radius = 900) {
  const player = game.player;
  const entities = game.world.getEntities(
    { x: player.x - radius, y: player.y - radius, width: radius * 2, height: radius * 2 },
    game.elapsed,
  );
  let best = null,
    bestDistance = Infinity;
  for (const entity of entities) {
    if (entity.type !== type || entity.remaining <= 0) continue;
    const distance = Math.hypot(entity.x - player.x, entity.y - player.y);
    if (distance < bestDistance) {
      best = entity;
      bestDistance = distance;
    }
  }
  return best;
}

function play(seed) {
  const game = new Game(seed);
  const random = randomGenerator(seed);
  const milestones = {};
  const mark = (name, condition) => {
    if (milestones[name] === undefined && condition) milestones[name] = game.elapsed;
  };
  let campfiresCrafted = 0,
    berriesEaten = 0,
    salvesCrafted = 0,
    stuckTicks = 0,
    stuckEvents = 0,
    avoid = null,
    avoidUntil = 0;
  const dt = 0.05,
    steps = MAX_SECONDS / dt;

  for (let step = 0; step < steps; step++) {
    const player = game.player;
    const before = { x: player.x, y: player.y };

    // Survival first: eat before the bar gets uncomfortable.
    if (inventoryCount(game, 'berry') > 0 && player.hunger < 50 && game.eat()) berriesEaten++;

    const type = wantedResource(game, random, salvesCrafted > 0);
    let movement = { x: 0, y: 0 };
    let hasTarget = false;
    if (type) {
      const target = nearestResource(game, type);
      if (target) {
        hasTarget = true;
        const dx = target.x - player.x,
          dy = target.y - player.y;
        const distance = Math.hypot(dx, dy) || 1;
        if (distance <= INTERACTION_DISTANCE * 0.85) game.interact();
        movement = { x: dx / distance, y: dy / distance };
      }
    }
    if (!hasTarget && game.stats.campfires > 0) {
      // Nothing left to gather nearby: go find a landmark.
      const landmark = nearestLandmark(game);
      if (landmark) {
        const dx = landmark.x - player.x,
          dy = landmark.y - player.y;
        const distance = Math.hypot(dx, dy) || 1;
        movement = { x: dx / distance, y: dy / distance };
      }
    }
    if (avoid && game.elapsed < avoidUntil)
      movement = { x: movement.x + avoid.x, y: movement.y + avoid.y };

    game.update(dt, movement);

    // The bot has no path planner: when it stops making progress it sidesteps.
    const moved = Math.hypot(player.x - before.x, player.y - before.y);
    if (moved < 0.4) stuckTicks++;
    else stuckTicks = 0;
    if (stuckTicks > 12) {
      stuckEvents++;
      const angle = random() * Math.PI * 2;
      avoid = { x: Math.cos(angle) * 1.6, y: Math.sin(angle) * 1.6 };
      avoidUntil = game.elapsed + 0.9;
      stuckTicks = 0;
    }

    // Craft as soon as the ingredients exist, in build order.
    for (const recipe of RECIPES) {
      if (!['axe', 'pickaxe', 'campfire', 'salve'].includes(recipe.id)) continue;
      if (game.canCraft(recipe.id)) {
        game.craft(recipe.id);
        if (recipe.id === 'campfire') campfiresCrafted++;
        if (recipe.id === 'salve') salvesCrafted++;
      }
    }
    if (inventoryCount(game, 'campfire') > 0) {
      if (game.placement !== 'campfire') game.beginPlacement('campfire');
      game.place(game.placementPoint().x, game.placementPoint().y);
    }
    game.drainEvents();

    mark('firstBerry', game.stats.berries >= 1);
    mark('toolAxe', inventoryCount(game, 'axe') > 0);
    mark('toolPickaxe', inventoryCount(game, 'pickaxe') > 0);
    mark('campfireCrafted', campfiresCrafted > 0);
    mark('campfirePlaced', game.stats.campfires > 0);
    mark('forage', game.stats.mushrooms + game.stats.herbs + game.stats.crystals >= 1);
    mark('salve', salvesCrafted > 0);
    mark('landmark', game.discovered.size > 0);
    mark('firstNight', getDayInfo(game.elapsed).isNight);
    mark('day2', getDayInfo(game.elapsed).day >= 2);
    if (game.dead) {
      milestones.died = game.elapsed;
      break;
    }
    if (game.stats.campfires > 0 && getDayInfo(game.elapsed).day >= 2) break;
  }

  return {
    seed,
    elapsed: game.elapsed,
    died: game.dead,
    berriesEaten,
    health: game.player.health,
    hunger: game.player.hunger,
    distance: game.stats.distance,
    gathered: {
      berries: game.stats.berries,
      wood: game.stats.wood,
      stone: game.stats.stone,
    },
    landmarks: game.discovered.size,
    stuckEvents,
    milestones,
  };
}

function inventoryCount(game, id) {
  return game.inventory[id] ?? 0;
}

// A player who never gathers: measures how much slack a relaxed session has.
function survive(seed) {
  const game = new Game(seed);
  const random = randomGenerator(seed + 500);
  let berriesEaten = 0,
    angle = random() * Math.PI * 2;
  const dt = 0.05,
    steps = (30 * 60) / dt;
  for (let step = 0; step < steps; step++) {
    if (game.dead) break;
    if (inventoryCount(game, 'berry') > 0 && game.player.hunger < 50 && game.eat()) berriesEaten++;
    if (step % 40 === 0) angle = random() * Math.PI * 2;
    game.update(dt, { x: Math.cos(angle), y: Math.sin(angle) });
    game.drainEvents();
  }
  return {
    seed,
    died: game.dead,
    elapsed: game.elapsed,
    berriesEaten,
    hunger: game.player.hunger,
    landmarks: game.discovered.size,
  };
}

const seconds = (value) =>
  value === undefined
    ? '—'
    : `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`;

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

const runs = Array.from({ length: seedCount }, (_, index) => play(index + 1));
const idleRuns = Array.from({ length: seedCount }, (_, index) => survive(index + 1));
const milestoneNames = [
  ['firstBerry', 'Hái quả đầu tiên'],
  ['toolAxe', 'Chế tạo rìu'],
  ['toolPickaxe', 'Chế tạo cuốc'],
  ['campfireCrafted', 'Chế tạo lửa trại'],
  ['campfirePlaced', 'Dựng lửa trại'],
  ['forage', 'Hái nấm/thảo dược/tinh thể đầu tiên'],
  ['salve', 'Chế tạo cao thảo dược'],
  ['landmark', 'Khám phá địa danh đầu tiên'],
  ['firstNight', 'Đêm đầu tiên buông xuống'],
  ['day2', 'Sang ngày thứ hai'],
];
const reached = (name) => runs.filter((run) => run.milestones[name] !== undefined).length;

const lines = [
  `- **Cấu hình đo:** ${seedCount} hành trình mô phỏng, mỗi hành trình tối đa 20 phút trong game, bước thời gian 0,05 giây.`,
  `- **Cách chạy lại:** \`npm run balance\` (thêm \`-- --seeds 10\` để đo nhiều seed hơn).`,
  '',
  '| Mốc | Số lần đạt | Trung vị | Nhanh nhất | Chậm nhất |',
  '| --- | --- | --- | --- | --- |',
];
for (const [key, label] of milestoneNames) {
  const times = runs
    .filter((run) => run.milestones[key] !== undefined)
    .map((run) => run.milestones[key]);
  lines.push(
    `| ${label} | ${reached(key)}/${runs.length} | ${seconds(times.length ? median(times) : undefined)} | ${seconds(times.length ? Math.min(...times) : undefined)} | ${seconds(times.length ? Math.max(...times) : undefined)} |`,
  );
}
lines.push(
  '',
  '| Kết quả cuối mỗi hành trình | Trung vị | Nhỏ nhất | Lớn nhất |',
  '| --- | --- | --- | --- |',
  `| Thời gian chơi mô phỏng | ${seconds(median(runs.map((run) => run.elapsed)))} | ${seconds(Math.min(...runs.map((run) => run.elapsed)))} | ${seconds(Math.max(...runs.map((run) => run.elapsed)))} |`,
  `| Quãng đường | ${Math.round(median(runs.map((run) => run.distance)))} px | ${Math.round(Math.min(...runs.map((run) => run.distance)))} px | ${Math.round(Math.max(...runs.map((run) => run.distance)))} px |`,
  `| Sức khỏe còn lại | ${Math.round(median(runs.map((run) => run.health)))} | ${Math.round(Math.min(...runs.map((run) => run.health)))} | ${Math.round(Math.max(...runs.map((run) => run.health)))} |`,
  `| Độ no còn lại | ${Math.round(median(runs.map((run) => run.hunger)))} | ${Math.round(Math.min(...runs.map((run) => run.hunger)))} | ${Math.round(Math.max(...runs.map((run) => run.hunger)))} |`,
  `| Số lần kẹt vật cản | ${median(runs.map((run) => run.stuckEvents))} | ${Math.min(...runs.map((run) => run.stuckEvents))} | ${Math.max(...runs.map((run) => run.stuckEvents))} |`,
  `| Địa danh đã khám phá | ${median(runs.map((run) => run.landmarks))} | ${Math.min(...runs.map((run) => run.landmarks))} | ${Math.max(...runs.map((run) => run.landmarks))} |`,
  `| Hành trình kết thúc vì kiệt sức | ${runs.filter((run) => run.died).length}/${runs.length} | | |`,
  '',
  '### Kịch bản B — người chơi không hái lượm',
  '',
  'Không thu thập gì thêm, chỉ đi dạo và ăn 3 quả ban đầu (có thể nhặt quà từ địa danh nếu tình cờ đi ngang):',
  '',
  '| Kết quả | Trung vị | Nhỏ nhất | Lớn nhất |',
  '| --- | --- | --- | --- |',
  `| Thời điểm kiệt sức | ${seconds(median(idleRuns.map((run) => run.elapsed)))} | ${seconds(Math.min(...idleRuns.map((run) => run.elapsed)))} | ${seconds(Math.max(...idleRuns.map((run) => run.elapsed)))} |`,
  `| Số hành trình kiệt sức | ${idleRuns.filter((run) => run.died).length}/${idleRuns.length} | | |`,
  `| Quả đã ăn | ${median(idleRuns.map((run) => run.berriesEaten))} | ${Math.min(...idleRuns.map((run) => run.berriesEaten))} | ${Math.max(...idleRuns.map((run) => run.berriesEaten))} |`,
  `| Địa danh tình cờ đi ngang | ${median(idleRuns.map((run) => run.landmarks))} | ${Math.min(...idleRuns.map((run) => run.landmarks))} | ${Math.max(...idleRuns.map((run) => run.landmarks))} |`,
  '',
  'Số liệu này dùng chung hằng số với game thật (`src/config.js`), nên khi chỉnh cân bằng hãy chạy lại báo cáo này.',
);

const table = lines.join('\n');
console.log(table);

const constants = [
  ['Độ no giảm', `${HUNGER_DRAIN_PER_SECOND}/giây`],
  ['Đói kiệt gây sát thương', `${ITEMS.berry ? 3 : 3}/giây`],
  ['Quả mọng hồi', `+${BERRY_HUNGER} no`],
  ['Chu kỳ ngày', `${DAY_LENGTH} giây`],
  ['Lửa trại hồi máu', '2,5 máu/giây khi đứng gần và đủ no'],
  [
    'Rìu đá',
    `${RECIPES.find((r) => r.id === 'axe').costs.wood} gỗ + ${RECIPES.find((r) => r.id === 'axe').costs.stone} đá`,
  ],
  [
    'Lửa trại',
    `${RECIPES.find((r) => r.id === 'campfire').costs.wood} gỗ + ${RECIPES.find((r) => r.id === 'campfire').costs.stone} đá`,
  ],
  ['Cây cho', `${RESOURCES.tree.charges} nhát → 5 gỗ`],
  ['Bụi quả hồi sau', `${RESOURCES.bush.respawn} giây`],
  ['Nấm cho', `1 nấm ăn được (+${MUSHROOM_HUNGER} no, +${MUSHROOM_HEALTH} máu) hoặc làm cao`],
  ['Thảo dược cho', '1 thảo dược + 1 sợi'],
  ['Tinh thể hồi sau', `${RESOURCES.crystal.respawn} giây`],
  [
    'Cao thảo dược',
    `${RECIPES.find((r) => r.id === 'salve').costs.mushroom} nấm + ${RECIPES.find((r) => r.id === 'salve').costs.herb} thảo dược → +${SALVE_HEALTH} máu`,
  ],
  [
    'Đèn lồng',
    `${RECIPES.find((r) => r.id === 'lantern').costs.wood} gỗ + ${RECIPES.find((r) => r.id === 'lantern').costs.fiber} sợi + ${RECIPES.find((r) => r.id === 'lantern').costs.crystal} tinh thể`,
  ],
];

if (write) {
  const path = `${root}docs/BALANCE.md`;
  const block = `${table}\n\n## Hằng số đang dùng\n\n| Nội dung | Giá trị |\n| --- | --- |\n${constants
    .map(([name, value]) => `| ${name} | ${value} |`)
    .join('\n')}`;
  let document = '';
  try {
    document = await readFile(path, 'utf8');
  } catch {
    document = '';
  }
  const begin = '<!-- BEGIN:BALANCE-RESULTS -->',
    end = '<!-- END:BALANCE-RESULTS -->';
  if (document.includes(begin) && document.includes(end))
    document = `${document.slice(0, document.indexOf(begin) + begin.length)}\n${block}\n${document.slice(document.indexOf(end))}`;
  else document = `# Cân bằng Domeo 3.0\n\n${begin}\n${block}\n${end}\n`;
  await writeFile(path, document);
  console.log(`\nĐã cập nhật ${path}`);
}
