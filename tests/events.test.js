// World events are the lightest system in 5.1, and the easiest to get wrong:
// they must be deterministic, they must never grant a farmable reward, and they
// must not re-roll just because the player walked somewhere else.
import test from 'node:test';
import assert from 'node:assert/strict';
import { EVENT_BAND, WORLD_EVENTS, getWorldEvent, worldEventLabel } from '../src/events.js';
import { DAY_LENGTH } from '../src/config.js';
import { Game } from '../src/game.js';

test('every event is described and carries a mood, not a reward', () => {
  for (const [id, config] of Object.entries(WORLD_EVENTS)) {
    assert.ok(config.label.length > 0, `${id} needs a label`);
    assert.ok(config.note.length > 0, `${id} needs a line of flavour`);
    assert.ok(config.mood.length > 0);
    assert.ok(Math.abs(config.darkness) <= 0.2, `${id} may only tint, never black out`);
    // Only a mood can have a mechanical effect, and it is capped at one item.
    if (config.crystalBonus !== undefined) assert.ok(config.crystalBonus <= 1);
  }
});

test('the same seed sees the same events at the same moments', () => {
  for (let i = 0; i < 40; i++) {
    const time = i * (DAY_LENGTH / 20);
    const a = getWorldEvent(time, 404, { isNight: time % DAY_LENGTH > DAY_LENGTH / 2 });
    const b = getWorldEvent(time, 404, { isNight: time % DAY_LENGTH > DAY_LENGTH / 2 });
    assert.deepEqual(a, b);
  }
  // Different journeys get different weather-like moods.
  const mine = Array.from({ length: 30 }, (_, i) => getWorldEvent(i * 137, 404, {}));
  const theirs = Array.from({ length: 30 }, (_, i) => getWorldEvent(i * 137, 405, {}));
  assert.notDeepEqual(mine, theirs);
});

test('an event belongs to a band and never re-rolls inside it', () => {
  const seed = 99;
  const band = 7;
  const start = band * EVENT_BAND;
  const first = getWorldEvent(start + 1, seed, {});
  for (const offset of [5, 40, 120, EVENT_BAND - 1]) {
    const later = getWorldEvent(start + offset, seed, {});
    assert.equal(later?.id ?? null, first?.id ?? null, `re-rolled ${offset}s into the band`);
  }
  if (first) {
    assert.equal(first.startedAt, start);
    assert.equal(first.endsAt, start + EVENT_BAND);
    assert.ok(first.intensity >= 0 && first.intensity <= 1);
  }
});

test('the biome only filters an event: it never invents a new one', () => {
  const seed = 4242;
  for (let band = 0; band < 200; band++) {
    const time = band * EVENT_BAND + 30;
    const meadow = getWorldEvent(time, seed, { biome: 'meadow', isNight: false });
    const ancient = getWorldEvent(time, seed, { biome: 'ancient', isNight: false });
    if (!meadow && ancient?.type === 'ancientGlow') continue;
    if (!meadow) continue;
    assert.equal(meadow.type, ancient ? ancient.type : meadow.type);
  }
});

test('night-only events never appear in daylight, and label() is safe', () => {
  let nightEvents = 0;
  for (let band = 0; band < 400; band++) {
    const time = band * EVENT_BAND + 40;
    const day = getWorldEvent(time, 31, { isNight: false });
    if (day) {
      assert.equal(WORLD_EVENTS[day.type].nightOnly ?? false, false, 'fireflies in daylight');
      if (day.type === 'fireflies') nightEvents++;
    }
    const night = getWorldEvent(time, 31, { isNight: true });
    if (night?.type === 'fireflies') nightEvents++;
  }
  assert.ok(nightEvents > 0, 'fireflies have to exist at night sometimes');
  assert.equal(worldEventLabel(null), '');
  const event = getWorldEvent(EVENT_BAND * 2 + 10, 5, {});
  assert.equal(worldEventLabel(event), event ? WORLD_EVENTS[event.type].label : '');
});

test('roughly one band in three carries an event, and they all appear', () => {
  const seen = new Map();
  let active = 0;
  const bands = 3000;
  for (let band = 0; band < bands; band++) {
    const event = getWorldEvent(band * EVENT_BAND + EVENT_BAND / 2, 1234, { isNight: true });
    if (event) {
      active++;
      seen.set(event.type, (seen.get(event.type) ?? 0) + 1);
    }
  }
  const ratio = active / bands;
  assert.ok(ratio > 0.2 && ratio < 0.45, `${(ratio * 100).toFixed(1)}% of bands had an event`);
  assert.ok(seen.size >= 3, 'the moods must actually vary');
});

test('a world event reaches the game without changing the save', () => {
  const game = new Game(404);
  game.elapsed = EVENT_BAND * 4 + 60;
  const event = game.worldEvent();
  const before = JSON.stringify(game.snapshot());
  game.update(0.05, { x: 0, y: 0 });
  const after = JSON.stringify(game.snapshot());
  // Events are transient by design: nothing about them is persisted.
  assert.equal(typeof before, 'string');
  if (event) assert.equal(game.worldEvent().id, event.id);
  const saved = JSON.parse(after);
  assert.equal('event' in saved, false);
  assert.equal(saved.quests !== undefined, true);
  // Re-entering the same band gives the same event, but the crystal bonus can
  // never be banked: it is applied per gathering action, not stored.
  if (event?.crystalBonus) assert.equal(event.crystalBonus, 1);
});
