// Combat is the newest and riskiest system in 5.1, so it is tested directly
// against its own module: deterministic spawns, the AI state machine, honest
// hit tests, i-frames, loot and the hard caps.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ENEMIES, ENEMY_IDS, EnemyDirector, spawnRoll } from '../src/combat.js';
import { Game } from '../src/game.js';
import {
  CAMP_SAFE_RADIUS,
  HIT_INVULNERABILITY,
  MAX_ENEMIES,
  MAX_PROJECTILES,
  SPAWN_GRACE_SECONDS,
  SPAWN_MAX_DISTANCE,
  SPAWN_MIN_DISTANCE,
} from '../src/config.js';

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

test('every creature is fully specified and no id is duplicated', () => {
  assert.equal(new Set(ENEMY_IDS).size, ENEMY_IDS.length);
  for (const [id, config] of Object.entries(ENEMIES)) {
    assert.equal(config.id, id);
    assert.ok(config.name.length > 0);
    assert.ok(config.health > 0);
    assert.ok(config.damage > 0);
    assert.ok(config.speed > 0 && config.chaseSpeed >= config.speed);
    assert.ok(config.attackRange > 0);
    assert.ok(config.noticeRange > config.attackRange);
    assert.ok(config.windup >= 0.3, `${id} must telegraph its attack`);
    assert.ok(config.recover > 0);
    assert.ok(config.biomes.length > 0);
    assert.ok(Array.isArray(config.loot));
  }
});

test('spawn rolls are deterministic and seed-dependent', () => {
  const a = spawnRoll(404, 120, 3).a;
  const b = spawnRoll(404, 120, 3).a;
  const c = spawnRoll(405, 120, 3).a;
  const d = spawnRoll(404, 121, 3).a;
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.notEqual(a, d);
  assert.ok(a >= 0 && a < 1);
});

test('a new journey gets quiet minutes before anything can spawn', () => {
  const game = new Game(11);
  const director = game.enemies;
  assert.ok(SPAWN_GRACE_SECONDS >= 30);
  for (let i = 0; i < 20; i++) game.update(0.05, { x: 1, y: 0 });
  assert.equal(director.trySpawn(), null);
});

test('spawns stay inside the band around the player and outside the camp', () => {
  const game = new Game(21);
  game.home = { x: game.player.x, y: game.player.y };
  game.elapsed = SPAWN_GRACE_SECONDS + 1; // past the quiet opening minutes
  // Spawning never generates terrain: the candidate band has to exist first.
  // In the browser the renderer keeps the visible area generated, so this
  // mirrors a player standing in a forest they can already see.
  game.world.getEntities(
    { x: game.player.x - 1400, y: game.player.y - 1400, width: 2800, height: 2800 },
    0,
  );
  const director = game.enemies;
  let spawned = 0;
  for (let i = 0; i < 4000; i++) {
    const enemy = director.trySpawn();
    if (!enemy) continue;
    spawned++;
    const gap = distance(enemy, game.player);
    assert.ok(gap >= SPAWN_MIN_DISTANCE - 1, `spawned ${gap.toFixed(0)}px away`);
    assert.ok(gap <= SPAWN_MAX_DISTANCE + 1, `spawned ${gap.toFixed(0)}px away`);
    assert.ok(distance(enemy, game.home) >= CAMP_SAFE_RADIUS - 1, 'spawned inside the camp bubble');
    enemy.alive = false;
  }
  assert.ok(spawned > 0, 'the director must be able to spawn at all');
});

test('the creature cap is never exceeded, however long the journey runs', () => {
  const game = new Game(33);
  game.maxEnemies = 4;
  for (let i = 0; i < 6000; i++) game.update(0.05, { x: 0.4, y: 0.6 });
  assert.ok(game.enemies.enemiesActive <= 4, `${game.enemies.enemiesActive} creatures alive`);
  assert.ok(MAX_ENEMIES >= 4);
  assert.ok(game.enemies.enemies.length <= 12, 'the "alive" list must not grow forever');
});

test('nightlings only exist at night and vanish at dawn', () => {
  const game = new Game(5);
  const director = game.enemies;
  game.elapsed = 200; // daytime
  let seen = 0;
  for (let i = 0; i < 400; i++) {
    const enemy = director.trySpawn();
    if (!enemy) continue;
    assert.notEqual(enemy.type, 'nightling');
    if (enemy.type === 'nightling') seen++;
    enemy.alive = false;
  }
  assert.equal(seen, 0);
  game.elapsed = 900; // night
  const nightling = director.spawn('nightling', game.player.x + 200, game.player.y);
  assert.ok(nightling);
  game.elapsed = 1200; // dawn
  director.update(0.2);
  assert.equal(nightling.alive, false);
});

test('a creature walks through idle, notice, chase and windup before it strikes', () => {
  const game = new Game(8);
  const director = game.enemies;
  const enemy = director.spawn('stalker', game.player.x + 150, game.player.y);
  const seen = [];
  const log = [];
  for (let i = 0; i < 600; i++) {
    game.update(0.05, { x: 0, y: 0 });
    if (!seen.includes(enemy.state)) seen.push(enemy.state);
    for (const event of game.drainEvents()) {
      if (event.type === 'enemyTelegraph') log.push({ kind: 'telegraph', id: event.id });
      if (event.type === 'enemyStrike') log.push({ kind: 'strike', id: event.id });
    }
    if (log.some((entry) => entry.kind === 'strike')) break;
  }
  const telegraphs = log.filter((entry) => entry.kind === 'telegraph');
  const strikes = log.filter((entry) => entry.kind === 'strike');
  assert.ok(seen.includes('notice'), 'a creature must react before it charges');
  assert.ok(seen.indexOf('notice') < seen.indexOf('chase'), 'noticing has to come before chasing');
  assert.ok(seen.includes('chase'), 'the creature must chase the player');
  assert.ok(seen.includes('windup'), 'the creature must wind up before hitting');
  assert.ok(telegraphs.length > 0, 'the wind-up has to be announced');
  assert.equal(strikes.length > 0, true);
  // The telegraph for a strike always arrives before that strike does.
  assert.ok(
    log.indexOf(telegraphs[0]) < log.indexOf(strikes[0]),
    'the wind-up must be announced first',
  );
  assert.equal(telegraphs[0].id, strikes[0].id);
});

test('being hit applies damage once and then grants a moment of grace', () => {
  const game = new Game(3);
  const director = game.enemies;
  const enemy = director.spawn('stalker', game.player.x + 30, game.player.y);
  assert.equal(director.damagePlayer(8, enemy), true);
  assert.equal(game.player.health, 92);
  // The very next frame cannot take a second hit.
  assert.equal(director.damagePlayer(8, enemy), false);
  assert.equal(game.player.health, 92);
  assert.ok(HIT_INVULNERABILITY > 0.5);
  game.elapsed += HIT_INVULNERABILITY + 0.01;
  assert.equal(director.damagePlayer(8, enemy), true);
  assert.equal(game.player.health, 84);
});

test('a dodge is invulnerable, and it is the dodge that grants the grace', () => {
  const game = new Game(4);
  const enemy = game.enemies.spawn('stalker', game.player.x + 40, game.player.y);
  assert.equal(game.dodge({ x: 1, y: 0 }), true);
  assert.equal(game.enemies.damagePlayer(20, enemy), false);
  assert.equal(game.player.health, 100);
  // The dodge also spends stamina and actually moves the player.
  assert.ok(game.player.stamina < 100);
  const before = game.player.x;
  game.update(0.05, { x: 0, y: 0 });
  assert.ok(game.player.x > before, 'the roll must carry the player forward');
});

test('the player swing only hits what is actually in front of them', () => {
  const game = new Game(6);
  const director = game.enemies;
  const front = director.spawn('stalker', game.player.x + 30, game.player.y);
  const behind = director.spawn('stalker', game.player.x - 30, game.player.y);
  const far = director.spawn('stalker', game.player.x + 400, game.player.y);
  const hits = director.playerAttack({
    direction: { x: 1, y: 0 },
    weapon: { damage: 9, range: 56, arc: 1.8, knockback: 18 },
    x: game.player.x,
    y: game.player.y,
  });
  assert.deepEqual(hits, [front]);
  assert.equal(front.health, ENEMIES.stalker.health - 9);
  assert.equal(behind.health, ENEMIES.stalker.health);
  assert.equal(far.health, ENEMIES.stalker.health);
});

test('killing a creature rolls its loot, counts the kill and feeds the quests', () => {
  const game = new Game(12);
  const director = game.enemies;
  const enemy = director.spawn('stalker', game.player.x + 30, game.player.y);
  const events = [];
  const fiber = game.inventory.fiber;
  director.damageEnemy(enemy, 999, { x: game.player.x, y: game.player.y });
  for (const event of game.drainEvents()) events.push(event);
  const death = events.find((event) => event.type === 'enemyDeath');
  assert.ok(death, 'a kill must be reported');
  assert.equal(death.creature, 'stalker');
  assert.ok(Array.isArray(death.loot) && death.loot.length > 0);
  assert.ok(game.inventory.fiber > fiber, 'loot must reach the inventory');
  assert.equal(game.stats.kills, 1);
  assert.match(death.lootText, /sợi/);
});

test('the grove keeper is placed once, and killing it clears the grove', () => {
  const game = new Game(404);
  const grove = game.world.grove();
  assert.ok(grove, 'generation 3 always has a grove');
  const keeper = game.enemies.spawnGroveKeeper(grove);
  assert.equal(keeper.type, 'groveKeeper');
  assert.equal(keeper.elite, true);
  assert.equal(game.enemies.spawnGroveKeeper(grove), keeper, 'only one keeper per grove');
  game.enemies.damageEnemy(keeper, keeper.maxHealth, { x: keeper.x, y: keeper.y });
  assert.equal(game.flags.groveCleared, true);
  assert.equal(game.enemies.spawnGroveKeeper(grove), null, 'a cleared grove stays cleared');
});

test('a ranged creature fires, the shot travels and it expires', () => {
  const game = new Game(15);
  const director = game.enemies;
  const sporeling = director.spawn('sporeling', game.player.x + 200, game.player.y);
  game.player.health = 100;
  const shots = [];
  for (let i = 0; i < 400; i++) {
    game.update(0.05, { x: 0, y: 0 });
    for (const event of game.drainEvents()) {
      if (event.type === 'enemyStrike' && event.ranged) shots.push(event);
    }
    if (shots.length && game.player.health < 100) break;
  }
  assert.ok(shots.length > 0, 'the sporeling must actually attack');
  assert.ok(game.player.health < 100, 'a spore must hurt when it lands');
  assert.ok(director.projectiles.length <= MAX_PROJECTILES);
  // Projectiles always expire, even when nothing stops them.
  game.enemies.projectiles = [
    {
      id: 'test',
      type: 'sporeling',
      x: game.player.x + 900,
      y: game.player.y + 900,
      vx: 0,
      vy: 0,
      age: 0,
      life: 0.2,
      damage: 7,
      radius: 9,
    },
  ];
  // `Game.update` clamps dt, so this is ten simulated frames rather than one.
  for (let i = 0; i < 10; i++) game.update(0.05, { x: 0, y: 0 });
  assert.equal(director.projectiles.length, 0);
  sporeling.alive = false;
});

test('a creature that is dragged away walks home instead of chasing forever', () => {
  const game = new Game(19);
  const director = game.enemies;
  const enemy = director.spawn('stalker', game.player.x + 120, game.player.y);
  const home = { x: enemy.spawnX, y: enemy.spawnY };
  // Teleport the player far away with the creature in tow.
  game.player.x += 2000;
  game.player.y += 2000;
  enemy.x = game.player.x - 100;
  enemy.y = game.player.y;
  let returned = false;
  for (let i = 0; i < 2000; i++) {
    director.update(0.05);
    if (enemy.state === 'return') returned = true;
    if (returned && Math.hypot(enemy.x - home.x, enemy.y - home.y) < 40) break;
    enemy.x = game.player.x - 100;
    enemy.y = game.player.y;
  }
  assert.ok(returned, 'leashing must send a creature home');
});

test('a creature that is out of sight stops costing time', () => {
  const game = new Game(23);
  const director = game.enemies;
  const near = director.spawn('stalker', game.player.x + 200, game.player.y);
  const far = director.spawn('stalker', game.player.x + 1400, game.player.y);
  director.update(0.05);
  assert.equal(near.sleeping, false);
  assert.equal(far.sleeping, true);
  // Well past the sleep distance, it is removed instead of being simulated.
  far.x = game.player.x + 3000;
  director.update(0.05);
  assert.equal(far.alive, false);
});

test('threat rises only for creatures that noticed the player', () => {
  const game = new Game(29);
  const director = game.enemies;
  assert.equal(director.threat(), 0);
  const enemy = director.spawn('stalker', game.player.x + 300, game.player.y);
  enemy.state = 'idle';
  const idle = director.threat();
  enemy.state = 'chase';
  enemy.x = game.player.x + 60;
  const chasing = director.threat();
  assert.ok(idle > 0);
  assert.ok(chasing > idle, 'a charging creature is more dangerous than an idle one');
  assert.ok(chasing <= 1);
});

test('combat never breaks the world limits: dead creatures are reused, not leaked', () => {
  const game = new Game(31);
  const director = game.enemies;
  for (let i = 0; i < 50; i++) {
    const enemy = director.spawn('stalker', game.player.x + 100, game.player.y);
    director.damageEnemy(enemy, 999, { x: 0, y: 0 });
  }
  // Everything died, so nothing is alive: a spawn-free stretch must stay empty.
  assert.equal(director.enemiesActive, 0);
  assert.ok(director.enemies.length <= 150, 'the corpse list is pruned');
});
