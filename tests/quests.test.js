// The quest journal is data plus a small state machine. These tests pin down the
// rules the rest of the game relies on: stable ids, gated unlocks, rewards that
// can only be claimed once, and a save that can never lie its way to a reward.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  KNOWN_UNLOCK_KEYS,
  PASSIVE_IDS,
  PASSIVES,
  QUESTS,
  QUEST_GROUPS,
  QUEST_IDS,
  QuestLog,
  getQuest,
  passiveKey,
  recipeKey,
} from '../src/quests.js';
import { ITEMS, RECIPES } from '../src/config.js';
import { Game } from '../src/game.js';
import { validateSave } from '../src/storage.js';

const byId = (id) => QUESTS.find((quest) => quest.id === id);

test('the quest list is well formed and every reference resolves', () => {
  assert.ok(QUESTS.length >= 12, 'a 5.1 journey needs a real spread of quests');
  assert.equal(new Set(QUEST_IDS).size, QUEST_IDS.length, 'ids must be unique');
  assert.deepEqual(
    QUEST_GROUPS.map((group) => group.id),
    [...new Set(QUESTS.map((quest) => quest.group))],
    'every group is used, and none is invented',
  );
  for (const quest of QUESTS) {
    assert.ok(quest.title && quest.description && quest.hint, `${quest.id} needs text`);
    assert.ok(quest.objectives.length > 0);
    for (const objective of quest.objectives) {
      assert.ok(objective.label, `${quest.id}/${objective.id} needs a label`);
      assert.ok(objective.count > 0);
    }
    for (const requirement of quest.requires ?? [])
      assert.ok(byId(requirement), `${quest.id} requires unknown quest ${requirement}`);
    for (const key of [...(quest.reward?.recipes ?? []), ...(quest.reward?.passives ?? [])])
      assert.ok(KNOWN_UNLOCK_KEYS.has(key), `${quest.id} grants unknown unlock ${key}`);
    for (const item of Object.keys(quest.reward?.items ?? {}))
      assert.ok(item in ITEMS, `${quest.id} grants unknown item ${item}`);
  }
  // The main journey is a single chain that ends in the finale.
  const journey = QUESTS.filter((quest) => quest.group === 'journey');
  assert.equal(journey.filter((quest) => !quest.requires).length, 1);
  assert.equal(journey.filter((quest) => quest.finale).length, 1);
  assert.equal(journey.at(-1).finale, true, 'the last journey step is the finale');
});

test('every recipe blueprint is reachable through some quest', () => {
  const granted = new Set(QUESTS.flatMap((quest) => quest.reward?.recipes ?? []));
  for (const recipe of RECIPES) {
    if (!recipe.requires) continue;
    assert.ok(granted.has(recipe.requires), `${recipe.id} is locked behind ${recipe.requires}`);
    assert.ok(KNOWN_UNLOCK_KEYS.has(recipe.requires));
  }
  for (const id of PASSIVE_IDS) assert.ok(PASSIVES[id].description.length > 10);
  assert.ok(granted.has(recipeKey('beacon')), 'the finale must unlock the beacon');
});

test('only the first step of the journey is open at the start', () => {
  const log = new QuestLog();
  assert.deepEqual(
    log.active().map((quest) => quest.id),
    ['journey_fire'],
  );
  assert.equal(log.status('journey_beacon'), 'locked');
  assert.equal(log.completedCount(), 0);
  assert.equal(log.percentComplete(byId('journey_fire')), 0);
});

test('objectives advance from gameplay events and complete exactly once', () => {
  const log = new QuestLog();
  assert.deepEqual(log.report('build', 'campfire', 1), []);
  assert.equal(log.state('journey_fire').progress.fire, 1);
  // An unrelated event must not touch anything.
  assert.deepEqual(log.report('gather', 'stone', 5), []);
  assert.deepEqual(
    log.report('cook', 'cooked', 1).map((quest) => quest.id),
    ['journey_fire'],
  );
  assert.equal(log.status('journey_fire'), 'done');
  // Reporting again does not re-complete it.
  assert.deepEqual(log.report('cook', 'cooked', 1), []);
  assert.equal(log.completedCount(), 1);
  assert.deepEqual(
    log.pending().map((quest) => quest.id),
    ['journey_fire'],
  );
});

test('finishing a quest opens the next one, and claiming rewards it once', () => {
  const log = new QuestLog();
  assert.equal(log.status('journey_camp'), 'locked');
  log.report('build', 'campfire', 1);
  log.report('cook', 'cooked', 1);
  const opened = log.sync();
  assert.deepEqual(
    opened.map((quest) => quest.id),
    ['journey_camp', 'region_meadow', 'disc_shrine'],
  );
  assert.equal(log.status('journey_camp'), 'active');
  assert.equal(log.markClaimed('journey_camp'), false, 'only finished quests can be claimed');
  assert.equal(log.markClaimed('journey_fire'), true);
  assert.equal(log.markClaimed('journey_fire'), false, 'a reward is granted once');
  assert.equal(log.isUnlocked(recipeKey('workbench')), true);
  assert.equal(log.claimedCount(), 1);
  // The next step is still locked behind its own objectives.
  assert.equal(log.status('journey_tools'), 'locked');
  // A claimed finale marks the journey as complete.
  assert.equal(log.journeyComplete(), false);
});

test('near-home objectives need the camp, and distance is a furthest point', () => {
  const log = new QuestLog();
  log.report('build', 'campfire', 1);
  log.report('cook', 'cooked', 1);
  log.sync();
  // A workbench far from home does not count.
  log.report('build', 'workbench', 1, { nearHome: false });
  assert.equal(log.state('journey_camp').progress.bench, 0);
  log.report('build', 'workbench', 1, { nearHome: true });
  assert.equal(log.state('journey_camp').progress.bench, 1);
  // Reaching distance 800 twice is not the same as reaching 1600.
  log.report('build', 'shelter', 1, { nearHome: true });
  log.report('build', 'chest', 1);
  log.sync();
  log.report('craft', 'knife', 1);
  log.report('craft', 'axe', 1);
  log.report('craft', 'salve', 1);
  log.sync();
  assert.equal(log.status('chal_far'), 'active');
  log.report('distance', 'any', 800);
  log.report('distance', 'any', 700);
  assert.equal(log.state('chal_far').progress.distance, 800, 'distance never goes backwards');
  log.report('distance', 'any', 2600);
  assert.equal(log.state('chal_far').progress.distance, 2600);
});

test('walking through the same biome twice counts once per quest', () => {
  const log = new QuestLog();
  log.report('build', 'campfire', 1);
  log.report('cook', 'cooked', 1);
  log.sync();
  assert.equal(log.state('journey_survey').status, 'locked');
  // Walk the biome objective of the survey quest once it is open.
  log.report('build', 'workbench', 1, { nearHome: true });
  log.report('build', 'shelter', 1, { nearHome: true });
  log.report('build', 'chest', 1);
  log.sync();
  log.report('craft', 'knife', 1);
  log.report('craft', 'axe', 1);
  log.report('craft', 'salve', 1);
  log.sync();
  for (let i = 0; i < 10; i++) log.report('biomes', 'meadow', 1);
  assert.equal(log.state('journey_survey').progress.biomes, 1);
  log.report('biomes', 'rocky', 1);
  log.report('biomes', 'deepwood', 1);
  log.report('biomes', 'mistgrove', 1);
  assert.equal(log.state('journey_survey').progress.biomes, 4);
});

test('the journal serialises and restores exactly what was earned', () => {
  const log = new QuestLog();
  log.report('build', 'campfire', 1);
  log.report('cook', 'cooked', 1);
  log.markClaimed('journey_fire');
  log.sync();
  log.report('build', 'workbench', 1, { nearHome: true });
  const data = log.serialize();
  assert.deepEqual(data.quests.journey_fire, {
    status: 'claimed',
    progress: { fire: 1, roast: 1 },
  });
  assert.equal(data.unlocked.includes(recipeKey('workbench')), true);
  const restored = QuestLog.restore(data);
  assert.equal(restored.status('journey_fire'), 'claimed');
  assert.equal(restored.state('journey_camp').progress.bench, 1);
  assert.equal(restored.isUnlocked(recipeKey('workbench')), true);
  assert.deepEqual(restored.serialize(), data);
});

test('a hand-edited journal is repaired instead of trusted', () => {
  const repaired = QuestLog.restore({
    quests: {
      journey_fire: { status: 'claimed', progress: { fire: 1 } },
      not_a_quest: { status: 'claimed', progress: {} },
    },
    unlocked: ['recipe:workbench', 'passive:not_real', 'nonsense'],
  });
  // Incomplete work cannot be claimed, so the quest goes back to active.
  assert.equal(repaired.status('journey_fire'), 'active');
  assert.equal(repaired.status('not_a_quest'), null);
  // Real unlocks survive, malformed keys are dropped...
  assert.equal(repaired.isUnlocked(recipeKey('workbench')), true);
  assert.equal(repaired.isUnlocked('nonsense'), false);
  // ...and a well-formed key that names nothing is inert: it unlocks no recipe
  // and no passive, because unlock checks always look the id up in the tables.
  assert.equal(repaired.isUnlocked(passiveKey('not_real')), true);
  assert.equal(PASSIVES.not_real, undefined);
  // The save validator is the layer that refuses such a payload outright.
  assert.equal(
    validateSave({
      ...new Game(5).snapshot(),
      quests: { quests: {}, unlocked: ['passive:not_real'] },
    }),
    false,
  );
  // Progress beyond the objective is clamped, not accepted.
  const clamped = QuestLog.restore({
    quests: { journey_fire: { status: 'active', progress: { fire: 99, roast: -4 } } },
  });
  assert.equal(clamped.state('journey_fire').progress.fire, 1);
  assert.equal(clamped.state('journey_fire').progress.roast, 0);
});

test('the whole main journey can be played through to the finale', () => {
  const game = new Game(404);
  const claim = () => {
    for (const quest of game.quests.pending()) assert.equal(game.claimQuest(quest.id), true);
  };
  const build = (type, nearHome = true) => {
    const x = nearHome ? 40 : 900;
    game.world.structures.push({ id: `built:${game.world.structures.length}`, type, x, y: 0 });
    game.reportQuest('build', type, 1, { nearHome });
  };
  // 1. A fire to come home to, and a roasted berry.
  build('campfire');
  game.home = { x: 0, y: 0 };
  game.inventory.berry = 1;
  assert.equal(game.cook(), true);
  assert.equal(game.quests.status('journey_fire'), 'done');
  claim();
  assert.equal(game.recipeUnlocked(game.recipe('workbench')), true);
  // 2. A camp.
  build('workbench');
  build('shelter');
  build('chest');
  claim();
  assert.equal(game.passive('camp_comfort'), true);
  // 3. Tools and medicine.
  game.inventory.wood = 40;
  game.inventory.stone = 40;
  game.inventory.herb = 4;
  game.inventory.mushroom = 4;
  assert.equal(game.craft('knife'), true);
  assert.equal(game.craft('axe'), true);
  assert.equal(game.craft('salve'), true);
  claim();
  assert.equal(game.passive('wayfinder'), true);
  assert.equal(game.recipeUnlocked(game.recipe('maptable')), true);
  // 4. See the forest: six landmarks, four biomes, two crystals.
  const landmarks = game.world
    .getLandmarks({ x: -3000, y: -3000, width: 6000, height: 6000 })
    .sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y))
    .slice(0, 6);
  for (const landmark of landmarks) {
    Object.assign(game.player, { x: landmark.x, y: landmark.y });
    game.discoverAt = 0;
    game.checkDiscoveries();
  }
  for (const biome of ['meadow', 'rocky', 'deepwood', 'mistgrove'])
    game.reportQuest('biomes', biome, 1);
  game.inventory.crystal = 0;
  game.reportQuest('gather', 'crystal', 2);
  game.inventory.crystal = 2;
  claim();
  assert.equal(game.flags.groveRevealed, true, 'the survey reveals the grove');
  // 5. The grove, and its keeper.
  const grove = game.world.grove();
  assert.ok(grove);
  Object.assign(game.player, { x: grove.x, y: grove.y });
  game.enemyCheckAt = 0;
  game.elapsed = 400;
  game.discoverAt = 0;
  game.checkDiscoveries();
  assert.equal(game.quests.status('journey_grove'), 'active', 'the keeper is still standing');
  assert.equal(game.discovered.size >= 7, true);
  game.updateEncounter();
  assert.equal(game.flags.keeperSeen, true);
  const keeper = game.enemies.enemies.find((enemy) => enemy.type === 'groveKeeper');
  assert.ok(keeper, 'walking into the grove wakes its keeper');
  // A real fight: the player swings until the keeper falls.
  game.inventory.blade = 1;
  let swings = 0;
  while (keeper.alive && swings < 400) {
    game.cooldown = 0;
    game.player.x = keeper.x - 40;
    game.player.y = keeper.y;
    game.attack({ x: 1, y: 0 });
    swings++;
  }
  assert.equal(keeper.alive, false, `the keeper must be beatable (${swings} swings)`);
  assert.ok(swings < 60, 'a blade should not need hundreds of hits');
  assert.equal(game.flags.groveCleared, true);
  assert.ok(game.inventory.fragment >= 1, 'the keeper drops stone fragments');
  assert.ok(game.inventory.ancientWood >= 1, 'and ancient wood');
  assert.equal(game.quests.status('journey_grove'), 'done');
  claim();
  assert.equal(game.passive('grove_blessing'), true);
  assert.equal(game.recipeUnlocked(game.recipe('beacon')), true);
  // 6. Light the beacon and finish the journey.
  game.inventory.ancientSeed = 1;
  game.inventory.wood = 40;
  game.inventory.stone = 40;
  game.inventory.moonEssence = 4;
  game.inventory.fragment = 4;
  game.inventory.crystal = 4;
  game.inventory.ancientWood = 6;
  build('beacon');
  Object.assign(game.player, { x: 40, y: 0 });
  game.cooldown = 0;
  assert.equal(game.lightBeacon(), true);
  assert.equal(game.flags.beaconLit, true);
  assert.equal(game.quests.status('journey_beacon'), 'done');
  claim();
  assert.equal(game.journeyComplete, true);
  assert.equal(game.stats.quests >= 6, true);
  // 7. Post-game: the sandbox quest opens and the world is still playable.
  assert.equal(game.quests.status('keep_building'), 'active');
  game.update(0.05, { x: 1, y: 0 });
  const saved = game.snapshot();
  assert.equal(saved.journeyComplete, true);
  assert.equal(saved.flags.beaconLit, true);
  assert.deepEqual(saved.flags.groveCleared, true);
  const restored = Game.restore(saved);
  assert.equal(restored.journeyComplete, true);
  assert.equal(restored.passive('dawnkeeper'), true);
  assert.equal(restored.quests.status('keep_building'), 'active');
});
