import { test, expect } from '@playwright/test';
import { Game } from '../../src/game.js';
import { SAVE_KEY } from '../../src/config.js';

async function ready(page) {
  await expect(page.locator('#new-button')).toBeEnabled();
  await expect(page.locator('#loading-state')).toBeHidden();
}
async function fresh(page) {
  await page.goto('/');
  await ready(page);
  await page.locator('#new-button').click();
  await expect(page.locator('#game-hud')).toBeVisible();
}
async function restore(page, data) {
  await page.goto('/');
  await ready(page);
  await page.evaluate(({ key, data }) => localStorage.setItem(key, JSON.stringify(data)), {
    key: SAVE_KEY,
    data,
  });
  await page.reload();
  await ready(page);
  await page.locator('#continue-button').click();
}
async function saved(page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)), SAVE_KEY);
}

test('title, keyboard movement, pause/resume, help and locally served assets', async ({ page }) => {
  const errors = [],
    external = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (!request.url().startsWith('http://127.0.0.1:5173')) external.push(request.url());
  });
  await page.goto('/');
  await ready(page);
  await expect(page).toHaveTitle('Domeo — Một chuyến đi hoang dã');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Đi lạc một chút.');
  await expect(page.locator('#edition-label')).toContainText('v5.1');
  await expect(page.locator('#edition-label i')).toHaveText('v5.1');
  await expect(page.locator('#continue-button')).toBeHidden();
  await page.locator('#help-button').click();
  await expect(page.locator('#help-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#help-dialog')).toBeHidden();
  await page.locator('#new-button').click();
  await expect(page.locator('#compass-distance')).toHaveText('Chưa có nhà');
  await page.keyboard.down('KeyD');
  await expect.poll(() => page.locator('#coordinates').textContent()).not.toBe('0, 0');
  await page.keyboard.up('KeyD');
  await page.keyboard.press('Escape');
  await expect(page.locator('#pause-dialog')).toBeVisible();
  const before = await saved(page),
    clock = await page.locator('#clock-label').textContent();
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(300);
  await page.keyboard.up('KeyW');
  expect((await saved(page)).elapsed).toBe(before.elapsed);
  await expect(page.locator('#clock-label')).toHaveText(clock);
  await page.locator('#pause-save-button').click();
  await expect(page.locator('#pause-dialog .toast-region')).toContainText('Đã cất giữ');
  await page.locator('#resume-button').click();
  await expect(page.locator('#pause-dialog')).toBeHidden();
  await expect.poll(() => page.locator('#clock-label').textContent()).not.toBe(clock);
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test('inventory pauses simulation, traps focus, and supports keyboard tabs', async ({ page }) => {
  await fresh(page);
  await page.keyboard.press('KeyB');
  await expect(page.locator('#inventory-dialog')).toBeVisible();
  await expect(page.locator('#bag-tab')).toHaveAttribute('aria-selected', 'true');
  await page.locator('#bag-tab').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#craft-tab')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('[data-craft="axe"]')).toBeDisabled();
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement.closest('#inventory-dialog'))).toBe(
      true,
    );
  }
  await page.waitForTimeout(150);
  const clock = await page.locator('#clock-label').textContent();
  await page.waitForTimeout(250);
  await expect(page.locator('#clock-label')).toHaveText(clock);
  await page.keyboard.press('Escape');
  await expect(page.locator('#inventory-dialog')).toBeHidden();
  await page.keyboard.press('KeyB');
  await page.keyboard.press('KeyB');
  await expect(page.locator('#inventory-dialog')).toBeHidden();
});

test('gather, eat, craft every recipe, place a fire and reload the saved world', async ({
  page,
}) => {
  const game = new Game(404);
  Object.assign(game.player, { x: -75, y: -45, health: 80, hunger: 50 });
  Object.assign(game.inventory, { wood: 40, stone: 30, fiber: 6 });
  await restore(page, game.snapshot());
  await expect(page.locator('#interaction-label')).toHaveText('Hái quả mọng');
  await page.keyboard.press('KeyE');
  await expect(page.locator('[data-count="berry"]')).toHaveText('4');
  await page.keyboard.press('KeyF');
  await expect(page.locator('[data-count="berry"]')).toHaveText('3');
  await expect(page.locator('#hunger-bar')).toHaveAttribute('aria-valuenow', '75');
  await page.keyboard.press('KeyC');
  for (const id of ['axe', 'pickaxe', 'campfire', 'torch', 'wall', 'chest']) {
    await expect(page.locator(`[data-craft="${id}"]`)).toBeEnabled();
    await page.locator(`[data-craft="${id}"]`).click();
  }
  await expect(page.locator('[data-craft="axe"]')).toHaveText('Đã có');
  await expect(page.locator('[data-craft="axe"]')).toBeDisabled();
  await page.locator('#bag-tab').click();
  await expect(page.locator('[data-item="wood"] small')).toHaveText('×14');
  await expect(page.locator('[data-item="stone"] small')).toHaveText('×20');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Digit4');
  await expect(page.locator('#placement-bar')).toBeVisible();
  const { width, height } = page.viewportSize();
  const zoom = Math.min(1.5, Math.max(1.1, Math.min(width / 1000, height / 730)));
  await page
    .locator('#gameCanvas')
    .click({ position: { x: width / 2 + 75 * zoom, y: height * 0.52 + 45 * zoom } });
  await expect(page.locator('#placement-bar')).toBeHidden();
  await expect(page.locator('[data-count="campfire"]')).toHaveText('0');
  expect((await saved(page)).world.structures).toEqual([
    { id: 'built:0', type: 'campfire', x: 0, y: 0 },
  ]);
  await page.keyboard.press('Digit5');
  await expect(page.locator('[data-slot="torch"]')).toHaveAttribute('aria-pressed', 'false');
  await page.locator('#save-button').click();
  const before = await saved(page);
  await page.reload();
  await ready(page);
  await expect(page.locator('#continue-button')).toBeVisible();
  await page.locator('#continue-button').click();
  await expect(page.locator('[data-count="axe"]')).toHaveText('1');
  const after = await saved(page);
  expect(after.inventory).toEqual(before.inventory);
  expect(after.world.structures).toEqual(before.world.structures);
  expect(after.world.changes.length).toBe(1);
  expect(after.torchLit).toBe(false);
});

test('forage, brew a salve, heal and light a lantern', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const picker = new Game(404);
  Object.assign(picker.player, { x: 260, y: -155 });
  await restore(page, picker.snapshot());
  await expect(page.locator('#interaction-label')).toHaveText('Hái nấm rừng');
  await page.keyboard.press('KeyE');
  await page.keyboard.press('KeyB');
  await expect(page.locator('[data-item="mushroom"] small')).toHaveText('×1');
  await page.keyboard.press('Escape');
  const game = new Game(404);
  Object.assign(game.player, { x: 0, y: 0, health: 50, hunger: 30, direction: 'left' });
  Object.assign(game.inventory, { mushroom: 2, herb: 1, lantern: 1 });
  await restore(page, game.snapshot());
  await page.keyboard.press('KeyC');
  await expect(page.locator('[data-craft="salve"]')).toBeEnabled();
  await page.locator('[data-craft="salve"]').click();
  await page.locator('#bag-tab').click();
  await expect(page.locator('[data-item="salve"] small')).toHaveText('×1');
  await expect(page.locator('[data-item="mushroom"] small')).toHaveText('×0');
  await page.keyboard.press('Escape');
  await page.keyboard.press('KeyG');
  await expect(page.locator('#health-bar')).toHaveAttribute('aria-valuenow', '85');
  await page.keyboard.press('Digit8');
  await expect(page.locator('#placement-bar')).toBeVisible();
  await expect(page.locator('#placement-name')).toHaveText('Đặt đèn lồng');
  await page.keyboard.press('KeyE');
  await expect(page.locator('#placement-bar')).toBeHidden();
  expect((await saved(page)).world.structures).toEqual([
    { id: 'built:0', type: 'lantern', x: -64, y: 0 },
  ]);
  expect(errors).toEqual([]);
});

test('walking to a landmark celebrates the discovery and remembers it', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const game = new Game(7);
  const landmarks = game.world.getLandmarks({ x: -2000, y: -2000, width: 4000, height: 4000 });
  landmarks.sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y));
  Object.assign(game.player, { x: landmarks[0].x + 100, y: landmarks[0].y });
  await restore(page, game.snapshot());
  await expect(page.locator('#toast-region')).toContainText('Đã khám phá', { timeout: 8000 });
  await expect(page.locator('#journal-footer')).toContainText('1 địa danh');
  await expect(page.locator('#goal-count')).not.toHaveText('0/11');
  expect((await saved(page)).discovered.length).toBe(1);
  expect(errors).toEqual([]);
});

test('a chest stores items both ways and the world keeps running around it', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const game = new Game(404);
  Object.assign(game.player, { x: 0, y: 0, health: 90, hunger: 60 });
  game.inventory.wood = 6;
  game.world.structures.push({ id: 'built:0', type: 'chest', x: 30, y: 0 });
  await restore(page, game.snapshot());
  await expect(page.locator('#interaction-label')).toHaveText('Mở rương gỗ');
  await page.keyboard.press('KeyE');
  await expect(page.locator('#inventory-dialog')).toBeVisible();
  // The chest panel used to be reachable only through a method that did not exist,
  // which killed the render loop and froze the whole journey.
  await expect(page.locator('#chest-tab')).toBeVisible();
  await expect(page.locator('#chest-panel')).toBeVisible();
  await expect(page.locator('[data-chest="wood"]')).toBeDisabled();
  await page.locator('#bag-tab').click();
  await page.locator('[data-item="wood"]').click();
  await page.locator('#stash-selected').click();
  await expect(page.locator('[data-item="wood"] small')).toHaveText('×5');
  await page.locator('#chest-tab').click();
  await expect(page.locator('[data-chest="wood"] small')).toHaveText('×1');
  await page.locator('[data-chest="wood"]').click();
  await expect(page.locator('[data-chest="wood"] small')).toHaveText('×0');
  await page.locator('#bag-tab').click();
  await expect(page.locator('[data-item="wood"] small')).toHaveText('×6');
  await page.keyboard.press('Escape');
  await expect(page.locator('#inventory-dialog')).toBeHidden();
  const clock = await page.locator('#clock-label').textContent();
  await page.waitForTimeout(400);
  await expect(page.locator('#clock-label')).not.toHaveText(clock);
  await page.keyboard.down('KeyD');
  await expect
    .poll(async () => Number((await page.locator('#coordinates').textContent()).split(',')[0]))
    .toBeGreaterThan(100);
  await page.keyboard.up('KeyD');
  await page.keyboard.press('KeyB');
  await expect(page.locator('#inventory-dialog')).toBeVisible();
  await expect(page.locator('#chest-tab')).toBeHidden();
  await page.keyboard.press('Escape');
  expect(errors).toEqual([]);
});

test('the compass and the mini-map follow the marked home', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const game = new Game(404);
  Object.assign(game.player, { x: 0, y: 0 });
  game.home = { x: 0, y: -320 };
  game.explored.add('1,0');
  await restore(page, game.snapshot());
  await expect(page.locator('#compass-distance')).toHaveText('Cách 20 bước');
  await expect(page.locator('#compass-needle')).toHaveAttribute('data-angle', '0');
  await expect(page.locator('.compass-widget')).not.toHaveClass(/no-home/);
  const painted = () =>
    page.evaluate(() => {
      const canvas = document.getElementById('mini-map');
      const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      const colors = new Set();
      for (let i = 0; i < data.length; i += 4)
        colors.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
      return colors.size;
    });
  await expect.poll(painted).toBeGreaterThan(2);
  const steps = async () =>
    Number(/(\d+)/.exec(await page.locator('#compass-distance').textContent())?.[1] ?? 0);
  await page.keyboard.down('KeyD');
  await expect.poll(() => page.locator('#compass-needle').getAttribute('data-angle')).not.toBe('0');
  await expect
    .poll(async () => Number((await page.locator('#coordinates').textContent()).split(',')[0]))
    .toBeGreaterThan(150);
  await page.keyboard.up('KeyD');
  expect(Number(await page.locator('#compass-needle').getAttribute('data-angle'))).toBeLessThan(0);
  expect(await steps()).toBeGreaterThanOrEqual(21);
  expect(errors).toEqual([]);
});

test('a depleted bush regrows through the day-clock boundary in the real game loop', async ({
  page,
}) => {
  const game = new Game(4);
  game.elapsed = 119;
  Object.assign(game.player, { x: -75, y: -45 });
  game.world.changes.set('start:0', { id: 'start:0', remaining: 0, respawnAt: 121 });
  await restore(page, game.snapshot());
  await expect(page.locator('#interaction-prompt')).toBeHidden();
  await expect(page.locator('#interaction-prompt')).toBeVisible({ timeout: 7000 });
  await page.keyboard.press('KeyE');
  await expect(page.locator('[data-count="berry"]')).toHaveText('4');
});

test('blur releases held movement keys and pauses the world', async ({ page }) => {
  await fresh(page);
  await page.keyboard.down('KeyD');
  await expect.poll(() => page.locator('#coordinates').textContent()).not.toBe('0, 0');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.locator('#pause-dialog')).toBeVisible();
  await page.waitForTimeout(180);
  const position = await page.locator('#coordinates').textContent();
  await page.locator('#resume-button').click();
  await page.waitForTimeout(300);
  await expect(page.locator('#coordinates')).toHaveText(position);
  await page.keyboard.up('KeyD');
});

test('game over offers a clean restart without reloading the page', async ({ page }) => {
  const game = new Game(4);
  Object.assign(game.player, { health: 0.1, hunger: 0 });
  await restore(page, game.snapshot());
  await expect(page.locator('#gameover-dialog')).toBeVisible();
  await expect(page.locator('#health-bar')).toHaveAttribute('aria-valuenow', '0');
  await page.locator('#restart-button').click();
  await expect(page.locator('#gameover-dialog')).toBeHidden();
  await expect(page.locator('#health-bar')).toHaveAttribute('aria-valuenow', '100');
  await expect(page.locator('[data-count="berry"]')).toHaveText('3');
});

test('starting over confirms before replacing an existing living journey', async ({ page }) => {
  const game = new Game(11);
  game.inventory.wood = 21;
  await page.goto('/');
  await ready(page);
  await page.evaluate(({ key, data }) => localStorage.setItem(key, JSON.stringify(data)), {
    key: SAVE_KEY,
    data: game.snapshot(),
  });
  await page.reload();
  await ready(page);
  await page.locator('#new-button').click();
  await expect(page.locator('#confirm-dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Giữ lại hành trình cũ' }).click();
  expect((await saved(page)).inventory.wood).toBe(21);
  await page.locator('#new-button').click();
  await page.locator('#confirm-new-button').click();
  await expect(page.locator('#game-hud')).toBeVisible();
  expect((await saved(page)).inventory.wood).toBe(0);
});

test('corrupt and inaccessible browser storage never prevents a new game', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await page.evaluate((key) => localStorage.setItem(key, '{broken'), SAVE_KEY);
  await page.reload();
  await ready(page);
  await expect(page.locator('#continue-button')).toBeHidden();
  await expect(page.locator('#menu-save-note')).toContainText('Không đọc được');
  await page.locator('#new-button').click();
  await expect(page.locator('#game-hud')).toBeVisible();
  const blocked = await context.newPage();
  await blocked.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new DOMException('Blocked', 'SecurityError');
    };
    Storage.prototype.setItem = () => {
      throw new DOMException('Blocked', 'SecurityError');
    };
  });
  await fresh(blocked);
  await expect(blocked.locator('#save-label')).toHaveText('Chưa lưu');
  await blocked.keyboard.press('Escape');
  await blocked.locator('#home-button').click();
  await expect(blocked.locator('#pause-dialog')).toBeVisible(); // Keep the in-memory run rather than silently lose it.
  await blocked.locator('#resume-button').click();
  await expect(blocked.locator('#game-hud')).toBeVisible();
  await blocked.close();
});

test('unavailable sprite assets use playable fallbacks', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/assets/**/*.png', (route) => route.abort());
  await fresh(page);
  await page.keyboard.down('KeyD');
  await expect.poll(() => page.locator('#coordinates').textContent()).not.toBe('0, 0');
  await page.keyboard.up('KeyD');
  expect(errors).toEqual([]);
});

test('all asset and module paths work beneath a GitHub Pages project subdirectory', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/domeo/**', async (route) => {
    const url = new URL(route.request().url());
    url.pathname = url.pathname.replace(/^\/domeo/, '');
    const response = await route.fetch({ url: url.toString() });
    await route.fulfill({ response });
  });
  await page.goto('/domeo/');
  await ready(page);
  await page.locator('#new-button').click();
  await expect(page.locator('#game-hud')).toBeVisible();
  await page.keyboard.press('KeyC');
  await expect(page.locator('#inventory-dialog')).toBeVisible();
  expect(errors).toEqual([]);
});

test('settings open from the menu and survive a reload without raising errors', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await ready(page);
  await page.locator('#settings-button').click();
  await expect(page.locator('#settings-dialog')).toBeVisible();
  await page.locator('#settings-volume').focus();
  for (let step = 0; step < 7; step++) await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#settings-volume-value')).toHaveText('35%');
  await page.locator('#settings-ambient').uncheck();
  await page.locator('#settings-motion').selectOption('on');
  await page.getByRole('button', { name: 'Xong' }).click();
  await expect(page.locator('#settings-dialog')).toBeHidden();
  await expect(page.locator('#main-menu')).toBeVisible();
  await page.reload();
  await ready(page);
  await page.keyboard.press('KeyO');
  await expect(page.locator('#settings-dialog')).toBeVisible();
  await expect(page.locator('#settings-volume')).toHaveValue('35');
  await expect(page.locator('#settings-ambient')).not.toBeChecked();
  await expect(page.locator('#settings-motion')).toHaveValue('on');
  await page.getByRole('button', { name: 'Trả về mặc định' }).click();
  await expect(page.locator('#settings-volume')).toHaveValue('70');
  await expect(page.locator('#settings-ambient')).toBeChecked();
  await expect(page.locator('#settings-motion')).toHaveValue('system');
  await page.keyboard.press('Escape');
  await expect(page.locator('#settings-dialog')).toBeHidden();
  await expect(page.locator('#main-menu')).toBeVisible();
  expect(errors).toEqual([]);
});

test('harvesting without the right tool flashes the prompt and explains why', async ({ page }) => {
  const game = new Game(404);
  Object.assign(game.player, { x: 180, y: 50, hunger: 80 });
  await restore(page, game.snapshot());
  await expect(page.locator('#interaction-label')).toHaveText('Cần rìu đá');
  await page.keyboard.press('KeyE');
  await expect(page.locator('#interaction-prompt')).toHaveClass(/denied/);
  await expect(page.locator('#toast-region')).toContainText('Bạn cần chế tạo rìu đá');
  await expect(page.locator('[data-count="axe"]')).toHaveText('0');
});

test('gathering and building play their feedback without raising errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const game = new Game(404);
  Object.assign(game.player, { x: -75, y: -45 });
  Object.assign(game.inventory, { wood: 10, stone: 10 });
  await restore(page, game.snapshot());
  await page.keyboard.press('KeyE');
  await expect(page.locator('[data-count="berry"]')).toHaveText('4');
  await page.keyboard.press('KeyC');
  await page.locator('[data-craft="campfire"]').click();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Digit4');
  await expect(page.locator('#placement-bar')).toBeVisible();
  const { width, height } = page.viewportSize();
  const zoom = Math.min(1.5, Math.max(1.1, Math.min(width / 1000, height / 730)));
  await page
    .locator('#gameCanvas')
    .click({ position: { x: width / 2 + 75 * zoom, y: height * 0.52 + 45 * zoom } });
  await expect(page.locator('#placement-bar')).toBeHidden();
  await expect(page.locator('[data-count="campfire"]')).toHaveText('0');
  await expect(page.locator('#toast-region')).toContainText('Một đốm lửa');
  expect(errors).toEqual([]);
});

test('the debug overlay can be requested with a query parameter', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?debug=1');
  await ready(page);
  await expect(page.locator('#debug-overlay')).toBeVisible();
  await page.locator('#new-button').click();
  await expect(page.locator('#debug-overlay')).toContainText('FPS');
  await expect(page.locator('#debug-overlay')).toContainText('vật thể');
  await expect(page.locator('#debug-overlay')).toContainText('ms/khung');
  await page.keyboard.press('KeyO');
  await expect(page.locator('#settings-debug')).toBeChecked();
  await page.keyboard.press('Escape');
  await expect(page.locator('#settings-dialog')).toBeHidden();
  expect(errors).toEqual([]);
});

test('helpers stay reachable when the browser blocks local storage', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Blocked', 'SecurityError');
    };
  });
  await page.goto('/');
  await ready(page);
  await page.locator('#settings-button').click();
  await expect(page.locator('#settings-dialog')).toBeVisible();
  await page.locator('#settings-volume').focus();
  for (let step = 0; step < 3; step++) await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#toast-region')).toContainText('Chưa lưu được cài đặt');
  await expect(page.locator('#settings-volume-value')).toHaveText('55%');
  await page.getByRole('button', { name: 'Xong' }).click();
  await page.locator('#new-button').click();
  await expect(page.locator('#game-hud')).toBeVisible();
  expect(errors).toEqual([]);
});

test.describe('touchscreen', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });
  test('joystick movement, gathering, eating and inventory work without a keyboard', async ({
    page,
    context,
  }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await fresh(page);
    await expect(page.locator('#joystick')).toBeVisible();
    const box = await page.locator('#joystick').boundingBox(),
      session = await context.newCDPSession(page);
    const x = box.x + box.width / 2,
      y = box.y + box.height / 2;
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: x - 26, y: y - 26 }],
    });
    await page.waitForTimeout(350);
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(page.locator('#interaction-label')).toHaveText('Hái quả mọng');
    await page.locator('#touch-interact').tap();
    await expect(page.locator('[data-count="berry"]')).toHaveText('4');
    await page.locator('#touch-eat').tap();
    await expect(page.locator('[data-count="berry"]')).toHaveText('3');
    await page.locator('#inventory-button').tap();
    await expect(page.locator('#inventory-dialog')).toBeVisible();
    await page.locator('#craft-tab').tap();
    await expect(page.locator('#craft-panel')).toBeVisible();
    await page.getByRole('button', { name: 'Đóng túi đồ' }).tap();
    await expect(page.locator('#inventory-dialog')).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(errors).toEqual([]);
  });
  test('settings stay reachable on a phone, from the top bar and the pause menu', async ({
    page,
  }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await fresh(page);
    for (const selector of ['#sound-button', '#settings-button', '#pause-button']) {
      const box = await page.locator(selector).boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(390);
      expect(box.width).toBeGreaterThanOrEqual(40);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.locator('#settings-button').tap();
    await expect(page.locator('#settings-dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Trả về mặc định' }).tap();
    await page.getByRole('button', { name: 'Xong' }).tap();
    await expect(page.locator('#settings-dialog')).toBeHidden();
    await expect(page.locator('#game-hud')).toBeVisible();
    await page.locator('#pause-button').tap();
    await page.locator('#pause-settings-button').tap();
    await expect(page.locator('#settings-dialog')).toBeVisible();
    await expect(page.locator('#pause-dialog')).toBeHidden();
    await page.getByRole('button', { name: 'Xong' }).tap();
    await expect(page.locator('#pause-dialog')).toBeVisible();
    await page.locator('#resume-button').tap();
    await expect(page.locator('#pause-dialog')).toBeHidden();
    expect(errors).toEqual([]);
  });
  test('compact portrait and landscape layouts keep the controls on screen', async ({ page }) => {
    for (const viewport of [
      { width: 320, height: 568 },
      { width: 844, height: 390 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto('/');
      await ready(page);
      const start = await page.locator('#new-button').boundingBox();
      expect(start.y).toBeGreaterThan(50);
      expect(start.y + start.height).toBeLessThan(viewport.height - 30);
      await page.locator('#new-button').tap();
      if (await page.locator('#confirm-dialog').isVisible())
        await page.locator('#confirm-new-button').tap();
      for (const selector of [
        '#joystick',
        '#touch-interact',
        '#inventory-button',
        '#pause-button',
      ]) {
        const box = await page.locator(selector).boundingBox();
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
        expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
      }
      await page.locator('#inventory-button').tap();
      await expect(page.locator('#inventory-dialog')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
  });
});

test('autosave runs after fifteen simulation seconds without user intervention', async ({
  page,
}) => {
  await page.clock.install();
  await fresh(page);
  const before = await saved(page);
  await page.clock.runFor(16000);
  const after = await saved(page);
  expect(after.elapsed).toBeGreaterThanOrEqual(before.elapsed + 15);
  expect(after.player.hunger).toBeLessThan(before.player.hunger);
  await expect(page.locator('#save-label')).toHaveText('Đã lưu');
});

test('sound toggle reflects its real state and can be switched off again', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await fresh(page);
  await page.locator('#sound-button').click();
  await expect(page.locator('#sound-button')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#sound-button')).toHaveAttribute('aria-label', 'Tắt âm thanh');
  await page.locator('#sound-button').click();
  await expect(page.locator('#sound-button')).toHaveAttribute('aria-pressed', 'false');
  expect(errors).toEqual([]);
});
