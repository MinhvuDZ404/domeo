import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  normalizeSettings,
  readSettings,
  validateSettings,
  writeSettings,
} from '../src/settings.js';

const memoryStorage = (initial = {}) => {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, value),
    map,
  };
};

test('default settings are complete, valid and independent of the journey save', () => {
  assert.equal(validateSettings(DEFAULT_SETTINGS), true);
  assert.notEqual(SETTINGS_KEY, 'domeo.journey.v1');
  assert.equal(Object.isFrozen(DEFAULT_SETTINGS), true);
});

test('missing or unreadable settings fall back to defaults without an error', () => {
  const empty = readSettings(memoryStorage());
  assert.deepEqual(empty.settings, DEFAULT_SETTINGS);
  assert.equal(empty.error, null);
  assert.equal(empty.repaired, false);
  const blocked = readSettings({
    getItem() {
      throw new Error('blocked');
    },
  });
  assert.deepEqual(blocked.settings, DEFAULT_SETTINGS);
  assert.ok(blocked.error);
});

test('broken or hand-edited settings are repaired instead of trusted', () => {
  for (const raw of [
    '{broken',
    'null',
    '[]',
    '{"volume":5}',
    '{"volume":"loud","ambient":"yes","particles":1,"motion":"warp","debug":null}',
  ]) {
    const storage = memoryStorage({ [SETTINGS_KEY]: raw });
    const result = readSettings(storage);
    assert.equal(result.repaired, true);
    assert.equal(validateSettings(result.settings), true);
    assert.ok(result.settings.volume >= 0 && result.settings.volume <= 1);
    assert.equal(typeof result.settings.ambient, 'boolean');
    assert.ok(['system', 'on', 'off'].includes(result.settings.motion));
  }
  assert.equal(
    readSettings(memoryStorage({ [SETTINGS_KEY]: JSON.stringify({ volume: -3 }) })).settings.volume,
    0,
  );
  assert.equal(
    readSettings(memoryStorage({ [SETTINGS_KEY]: JSON.stringify({ volume: 9 }) })).settings.volume,
    1,
  );
});

test('oversized settings payloads are rejected before parsing', () => {
  const storage = memoryStorage({ [SETTINGS_KEY]: ' '.repeat(4097) });
  const result = readSettings(storage);
  assert.deepEqual(result.settings, DEFAULT_SETTINGS);
  assert.ok(result.error);
  assert.equal(result.repaired, true);
});

test('settings round-trip through storage and survive a blocked writer', () => {
  const storage = memoryStorage();
  const written = writeSettings({ ...DEFAULT_SETTINGS, volume: 0.35, ambient: false }, storage);
  assert.equal(written.ok, true);
  assert.deepEqual(readSettings(storage).settings, {
    ...DEFAULT_SETTINGS,
    volume: 0.35,
    ambient: false,
  });
  const failed = writeSettings(DEFAULT_SETTINGS, {
    setItem() {
      throw new Error('quota');
    },
  });
  assert.equal(failed.ok, false);
  assert.ok(failed.error);
  assert.deepEqual(failed.settings, DEFAULT_SETTINGS);
});

test('unknown keys never leak into saved settings', () => {
  const normalized = normalizeSettings({ ...DEFAULT_SETTINGS, mystery: 'x' });
  assert.equal('mystery' in normalized, false);
  assert.equal(validateSettings(normalized), true);
  assert.equal(validateSettings({ ...DEFAULT_SETTINGS, mystery: 'x' }), false);
  assert.equal(validateSettings({ ...DEFAULT_SETTINGS, motion: 'on' }), true);
});
