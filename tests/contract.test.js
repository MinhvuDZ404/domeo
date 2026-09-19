// Static checks between the markup, the scripts and the stylesheet. They catch
// the mistakes a browser would only reveal after a click.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { ITEMS } from '../src/config.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (path) => readFile(`${root}${path}`, 'utf8');

const [html, main, ui, input, icons, styles] = await Promise.all([
  read('index.html'),
  read('main.js'),
  read('src/ui.js'),
  read('src/input.js'),
  read('src/icons.js'),
  read('styles.css'),
]);

const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]));

test('every element the scripts look up exists in the markup', () => {
  const missing = new Set();
  for (const source of [main, ui, input])
    for (const match of source.matchAll(
      /\$\(\s*'([^']+)'\s*\)|getElementById\(\s*'([^']+)'\s*\)/g,
    )) {
      const id = match[1] ?? match[2];
      if (!ids.has(id)) missing.add(id);
    }
  assert.deepEqual([...missing], []);
});

test('every icon name used by the markup or scripts exists', () => {
  const known = new Set([...icons.matchAll(/^\s{2}([A-Za-z]+):\s*'</gm)].map((match) => match[1]));
  const used = new Set([
    ...[...html.matchAll(/data-icon="([^"]+)"/g)].map((match) => match[1]),
    ...[...`${main}${ui}`.matchAll(/\bicon\(\s*'([^']+)'/g)].map((match) => match[1]),
  ]);
  const missing = [...used].filter((name) => !known.has(name));
  assert.deepEqual(missing, []);
  assert.ok(known.size > 20);
});

test('hotbar slots and crafting recipes only reference real items', () => {
  const slots = [...html.matchAll(/data-slot="([^"]+)"/g)].map((match) => match[1]);
  assert.ok(slots.length >= 6);
  for (const slot of slots) assert.ok(slot in ITEMS, `${slot} is not an item`);
});

test('dialogs used by the game are declared as such in the markup', () => {
  for (const id of [...ids].filter((id) => id.endsWith('-dialog')))
    assert.match(html, new RegExp(`<dialog[^>]*id="${id}"`), `${id} is not a <dialog>`);
  assert.match(main, /'settings-dialog'/);
  assert.match(main, /'help-dialog'|'pause-dialog'/);
});

test('settings controls are wired to the settings keys the game reads', () => {
  for (const id of [
    'settings-volume',
    'settings-volume-value',
    'settings-ambient',
    'settings-particles',
    'settings-motion',
    'settings-motion-note',
    'settings-debug',
    'settings-reset',
  ])
    assert.ok(ids.has(id), `${id} is missing from index.html`);
  for (const key of ['volume', 'ambient', 'particles', 'motion', 'debug'])
    assert.match(ui, new RegExp(`\\b${key}\\b`));
});

test('the stylesheet styles every class the settings dialog relies on', () => {
  for (const selector of ['.settings-dialog', '.settings-list', '.settings-row', '.debug-overlay'])
    assert.ok(styles.includes(selector), `${selector} has no styles`);
  assert.match(html, /class="[^"]*settings-dialog/);
  assert.match(html, /id="debug-overlay"/);
});
