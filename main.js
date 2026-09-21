import { Game } from './src/game.js';
import { Renderer } from './src/renderer.js';
import { Input } from './src/input.js';
import { UI } from './src/ui.js';
import { Sound } from './src/sound.js';
import { GAME_LABEL, GAME_VERSION, ITEMS, getDayInfo } from './src/config.js';
import {
  readSave,
  writeSave,
  parseImportedSave,
  claimLock,
  heartbeatLock,
  releaseLock,
  sessionId,
} from './src/storage.js';
import { DEFAULT_SETTINGS, readSettings, writeSettings } from './src/settings.js';
import { icon } from './src/icons.js';

const $ = (id) => document.getElementById(id);
const loadedSettings = readSettings();
let preferences = loadedSettings.settings;
// ?debug=1 shows the diagnostics overlay for this visit; it is never stored, and
// the first manual change to the setting takes over from it.
let debugFromUrl = new URLSearchParams(location.search).has('debug');
const debugEnabled = () => preferences.debug || debugFromUrl;
const renderer = new Renderer($('gameCanvas'), { settings: preferences });
const sound = new Sound();
sound.setVolume(preferences.volume);
sound.setAmbient(preferences.ambient);
let game = new Game(404);
game.player.x = 420;
game.player.y = 220; // A frozen woodland vignette for the title screen.
let mode = 'menu',
  returnMode = 'menu',
  hasJourney = false,
  mousePoint = null,
  ready = false;
let stored = readSave(),
  autosaveAt = 15,
  lastTime = performance.now(),
  lastUI = 0;
let completedGoals = 0,
  saveWarningShown = false,
  frameStats = { frames: 0, total: 0, since: performance.now(), fps: 0, average: 0 };

const ui = new UI({
  action: handleAction,
  setting: applySetting,
  resetSettings: resetSettings,
  craft: (id) => {
    if (mode !== 'inventory') return;
    if (game.craft(id)) {
      handleEvents();
      ui.renderInventory(game);
      save(false);
    }
  },
  useItem,
  selectTab: (tab) => {
    ui.setTab(tab);
    ui.renderInventory(game);
  },
  transfer: (item, toChest) => {
    if (game.transfer(item, toChest)) {
      ui.renderInventory(game);
      save(false);
    }
  },
  upgradeCamp: () => {
    if (game.upgradeCamp()) {
      handleEvents();
      save(false);
    } else handleEvents();
  },
});
const input = new Input({
  active: () => mode === 'playing',
  action: handleAction,
  point: (x, y) => {
    mousePoint = renderer.screenToWorld(x, y);
  },
  place: () => {
    if (game.placement && mousePoint) {
      game.place(mousePoint.x, mousePoint.y);
      handleEvents();
      ui.render(game, game.getTarget());
    }
  },
  resetPoint: () => {
    mousePoint = null;
  },
});
ui.updateContinue(stored.data, stored.error);
ui.setVersion(GAME_LABEL, GAME_VERSION);
syncSettingsUI();
if (loadedSettings.error) ui.toast(loadedSettings.error, 'warning');
if (loadedSettings.repaired && !loadedSettings.error)
  ui.toast('Cài đặt cũ đã được đưa về giá trị mặc định.', 'warning');

function setMode(next) {
  input.clear();
  mousePoint = null;
  mode = next;
  lastTime = performance.now();
  lastUI = 0;
  if (hasJourney) ui.render(game, game.getTarget());
}
function commitSettings(next) {
  const result = writeSettings(next);
  preferences = result.settings;
  if (!result.ok) ui.toast(result.error, 'warning');
  renderer.applySettings(preferences);
  sound.setVolume(preferences.volume);
  sound.setAmbient(preferences.ambient);
  if (debugEnabled()) frameStats.since = performance.now();
  syncSettingsUI();
}
function syncSettingsUI() {
  ui.syncSettings(preferences, { debug: debugEnabled() });
}
let lastVolumeBlip = 0;
function applySetting(key, value) {
  if (key === 'debug') debugFromUrl = false;
  commitSettings({ ...preferences, [key]: value });
  if (key === 'volume' && sound.enabled && performance.now() - lastVolumeBlip > 400) {
    lastVolumeBlip = performance.now();
    sound.play('gather');
  }
}
function resetSettings() {
  commitSettings({ ...DEFAULT_SETTINGS });
  ui.toast('Đã trả cài đặt về mặc định.');
}
function openSettings() {
  if (!ready) return;
  if (mode !== 'settings') returnMode = mode;
  setMode('settings');
  syncSettingsUI();
  ui.openDialog('settings-dialog');
}
function toggleSound() {
  const on = sound.toggle();
  $('sound-button').innerHTML = icon(on ? 'volume' : 'muted', 20);
  $('sound-button').setAttribute('aria-pressed', String(on));
  $('sound-button').setAttribute('aria-label', on ? 'Tắt âm thanh' : 'Bật âm thanh');
  $('sound-button').title = on ? 'Tắt âm thanh' : 'Bật âm thanh';
  if (on) {
    sound.setVolume(preferences.volume);
    sound.setAmbient(preferences.ambient);
    sound.play('gather');
  }
  return on;
}
const tabId = sessionId();
function save(manual = false) {
  if (!hasJourney) return true;
  const lock = heartbeatLock(undefined, tabId);
  if (lock.foreign) {
    ui.toast('Tab khác đang chơi hành trình này. Không ghi đè.', 'warning');
    return false;
  }
  const data = game.snapshot(),
    result = writeSave(data);
  ui.saved(result.ok);
  if (result.ok) {
    stored = { data, error: null };
    saveWarningShown = false;
    if (manual) ui.toast('Đã cất giữ hành trình của bạn.');
  } else if (manual || !saveWarningShown) {
    ui.toast(result.error, 'warning');
    saveWarningShown = true;
  }
  return result.ok;
}
function startJourney(data = null) {
  if (!ready) return;
  const lock = claimLock(undefined, tabId);
  if (lock.foreign) {
    ui.toast('Hành trình đang mở ở tab khác. Đóng tab kia rồi thử lại.', 'warning');
    return;
  }
  game = data ? Game.restore(data) : new Game();
  hasJourney = true;
  renderer.reset();
  ui.closeDialogs();
  ui.setMenu(false);
  completedGoals = game.goals().filter((goal) => goal.done).length;
  autosaveAt = game.elapsed + 15;
  ui.lastGoalSignature = '';
  setMode('playing');
  ui.render(game, game.getTarget());
  save(false);
  sound.unlock();
  ui.toast(
    data
      ? 'Chào mừng trở lại. Rừng vẫn đang đợi bạn.'
      : 'Chào người lữ khách. Bắt đầu bằng một bụi quả nhé.',
  );
}
function openInventory(tab = 'bag') {
  if (!['playing', 'inventory'].includes(mode)) return;
  if (mode !== 'inventory') {
    setMode('inventory');
    ui.openDialog('inventory-dialog');
  }
  ui.setTab(tab);
  ui.renderInventory(game);
}
function closeOverlay() {
  if (mode === 'help' || mode === 'settings') {
    const previous = returnMode;
    ui.closeDialogs();
    setMode(previous);
    // Every modal screen comes back exactly as it was left.
    if (previous === 'paused') ui.openDialog('pause-dialog');
    else if (previous === 'confirm') ui.openDialog('confirm-dialog');
    else if (previous === 'gameover') ui.gameOver(game);
    return;
  }
  if (mode === 'confirm') {
    ui.closeDialogs();
    setMode('menu');
    return;
  }
  if (['paused', 'inventory'].includes(mode)) {
    ui.closeDialogs();
    setMode('playing');
  }
}
function pause() {
  if (mode !== 'playing') return;
  setMode('paused');
  save(false);
  ui.openDialog('pause-dialog');
}
function toMenu() {
  // If persistence is blocked, do not silently abandon a still-active journey.
  if (hasJourney && !game.dead && !save(false)) {
    ui.toast('Chưa thể lưu. Hành trình vẫn được giữ trong phiên này.', 'warning');
    return;
  }
  hasJourney = false;
  ui.closeDialogs();
  setMode('menu');
  ui.setMenu(true);
  ui.updateContinue(stored.data, stored.error);
}
function useItem(id) {
  if (!['playing', 'inventory'].includes(mode)) return;
  if (id === 'berry' || id === 'cooked' || id === 'mushroom' || id === 'salve') game.eat(id);
  else if (id === 'torch') game.toggleTorch();
  else if (id === 'home') game.setHome();
  else if (id === 'campfire' || id === 'wall' || id === 'chest' || id === 'lantern') {
    if (game.placement === id && mode === 'playing') game.placement = null;
    else if (game.beginPlacement(id)) {
      ui.closeDialogs();
      setMode('playing');
    }
  } else if (['axe', 'pickaxe'].includes(id)) {
    if (game.inventory[id])
      ui.toast(
        `${ITEMS[id].name} được tự động dùng khi nhấn E gần ${id === 'axe' ? 'cây' : 'tảng đá'}.`,
      );
    else openInventory('craft');
  }
  handleEvents();
  ui.render(game, game.getTarget());
}
function handleAction(action) {
  if (!ready) return;
  if (action === 'escape') {
    if (mode === 'playing') {
      if (game.placement) {
        game.placement = null;
        mousePoint = null;
        ui.render(game);
      } else pause();
    } else closeOverlay();
    return;
  }
  if (['bag', 'craft'].includes(action)) {
    if (mode === 'inventory' && ui.tab === action) closeOverlay();
    else openInventory(action);
    return;
  }
  if (action === 'mute') {
    toggleSound();
    return;
  }
  if (action === 'options') {
    // Settings may only be opened where closing them has an obvious destination.
    if (mode === 'settings') closeOverlay();
    else if (['menu', 'playing', 'paused', 'inventory'].includes(mode)) openSettings();
    return;
  }
  if (mode !== 'playing') return;
  if (action === 'attack') {
    game.attack();
    handleEvents();
  } else if (action === 'camp') {
    ui.openCamp(game);
    setMode('inventory');
  } else if (action === 'interact') {
    if (game.placement) {
      const point = mousePoint || game.placementPoint();
      game.place(point.x, point.y);
      handleEvents();
    } else {
      game.interact();
      if (game.openChest) openInventory('chest');
    }
  } else if (action === 'eat') useItem('berry');
  else if (action === 'home') {
    game.setHome();
    handleEvents();
  } else if (action in ITEMS) useItem(action);
}
function handleEvents() {
  for (const event of game.drainEvents()) {
    try {
      sound.play(event.type, event);
    } catch {
      // Audio must never break gameplay.
    }
    if (event.type === 'gather') {
      renderer.addEffect(event);
      const kind =
        event.item === 'stone'
          ? 'stone'
          : event.item === 'crystal'
            ? 'glow'
            : event.item === 'wood'
              ? 'leaf'
              : 'leaf';
      renderer.addBurst(kind, event.x, event.y);
    } else if (event.type === 'deny') {
      renderer.addBurst('deny', event.x, event.y);
      ui.denied();
    } else if (event.type === 'discovery') {
      renderer.addEffect(event);
      renderer.addBurst('glow', event.x, event.y);
      renderer.addShake(0.35);
      save(false);
      if (event.text) ui.toast(event.text);
    } else if (event.type === 'hit' || event.type === 'playerHit') {
      renderer.addEffect(event);
      renderer.addBurst(event.type === 'hit' ? 'spark' : 'deny', event.x, event.y);
      renderer.addShake(event.type === 'playerHit' ? 0.28 : 0.12);
    } else if (event.type === 'enemyDeath') {
      renderer.addEffect(event);
      renderer.addBurst('glow', event.x, event.y);
    } else if (event.type === 'campUpgrade' || event.type === 'quest') {
      if (event.x !== undefined) renderer.addBurst('glow', event.x, event.y);
      if (event.text) ui.toast(event.text);
      save(false);
    } else if (event.type === 'death') {
      setMode('gameover');
      save(false);
      ui.gameOver(game);
    } else {
      if (event.type === 'build') {
        renderer.addEffect(event);
        renderer.addBurst('spark', event.x, event.y);
        renderer.addShake(0.22);
        save(false);
      }
      if (event.text) ui.toast(event.text, event.tone);
    }
  }
  const goals = game.goals();
  const count = goals.filter((goal) => goal.done).length;
  if (count > completedGoals && mode !== 'menu') {
    completedGoals = count;
    ui.toast(
      count === goals.length
        ? 'Bạn đã có một nơi để trở về. Khu rừng còn rất rộng.'
        : `Một bước nhỏ đã hoàn thành · ${count}/${goals.length} mục tiêu`,
    );
  }
}

$('new-button').addEventListener('click', () => {
  sound.unlock();
  if (stored.data && stored.data.player.health > 0) {
    setMode('confirm');
    ui.openDialog('confirm-dialog');
  } else startJourney();
});
$('continue-button').addEventListener('click', () => {
  // Re-read in case another tab has updated or removed the save.
  stored = readSave();
  if (stored.data && stored.data.player.health > 0) startJourney(stored.data);
  else {
    ui.updateContinue(stored.data, stored.error);
    ui.toast(stored.error || 'Không còn hành trình để tiếp tục.', 'warning');
  }
});
$('confirm-new-button').addEventListener('click', () => startJourney());
$('restart-button').addEventListener('click', () => startJourney());
$('pause-button').addEventListener('click', pause);
$('resume-button').addEventListener('click', closeOverlay);
$('save-button').addEventListener('click', () => save(true));
$('pause-save-button').addEventListener('click', () => save(true));
$('home-button').addEventListener('click', toMenu);
$('death-home-button').addEventListener('click', toMenu);
$('inventory-button').addEventListener('click', () => openInventory('bag'));
$('cancel-placement').addEventListener('click', () => {
  game.placement = null;
  mousePoint = null;
  ui.render(game);
});
$('help-button').addEventListener('click', () => {
  if (!ready) return;
  returnMode = mode;
  setMode('help');
  ui.openDialog('help-dialog');
});
$('sound-button').addEventListener('click', toggleSound);
$('settings-button').addEventListener('click', openSettings);
$('pause-settings-button').addEventListener('click', openSettings);
$('export-button').addEventListener('click', () => {
  if (!hasJourney) return;
  const blob = new Blob([JSON.stringify(game.snapshot(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'domeo-hanh-trinh.json';
  link.click();
  URL.revokeObjectURL(url);
  ui.toast('Đã xuất bản lưu ra tệp JSON.');
});
$('import-file').addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  const parsed = parseImportedSave(await file.text());
  if (!parsed.data) {
    ui.toast(parsed.error, 'warning');
    return;
  }
  if (stored.data && stored.data.player.health > 0) {
    if (!confirm('Nhập bản lưu sẽ thay thế hành trình hiện tại. Tiếp tục?')) return;
  }
  const written = writeSave(parsed.data);
  if (!written.ok) {
    ui.toast(written.error, 'warning');
    return;
  }
  stored = { data: parsed.data, error: null };
  startJourney(parsed.data);
});
window.addEventListener('blur', () => {
  if (mode === 'playing') pause();
});
document.addEventListener('visibilitychange', () => {
  sound.setHidden(document.hidden);
  if (document.hidden && hasJourney) {
    if (mode === 'playing') pause();
    else save(false);
  }
});
window.addEventListener('pagehide', () => {
  if (hasJourney) save(false);
  releaseLock(undefined, tabId);
});
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    input.clear();
    lastTime = performance.now();
    if (mode === 'playing') pause();
  }
});

function loop(now) {
  const raw = now - lastTime;
  const dt = Math.min(raw / 1000, 0.05);
  lastTime = now;
  if (ready) {
    if (mode === 'playing') {
      game.update(dt, input.movement());
      if (input.interacting && !game.placement) game.interact();
      handleEvents();
      if (game.elapsed >= autosaveAt) {
        save(false);
        autosaveAt = game.elapsed + 15;
      }
    }
    // Overlays opened from the title screen keep the title screen behind them.
    const isMenu =
      mode === 'menu' ||
      mode === 'confirm' ||
      (['help', 'settings'].includes(mode) && returnMode === 'menu');
    const target = isMenu ? null : game.getTarget();
    renderer.render(game, {
      menu: isMenu,
      target: mode === 'playing' ? target : null,
      placement: game.placement ? mousePoint || game.placementPoint() : null,
      time: now,
    });
    if (now - lastUI > 120) {
      if (!isMenu) ui.render(game, target);
      if (mode === 'playing') {
        const day = getDayInfo(game.elapsed);
        sound.setNight(day.isNight);
        try {
          const weather = game.weather();
          sound.setWeather(weather.type, weather.intensity);
          const fire = game.nearCampfire(280);
          const level = fire
            ? Math.max(0, 1 - Math.hypot(fire.x - game.player.x, fire.y - game.player.y) / 280)
            : game.torchLit
              ? 0.22
              : 0;
          sound.setFire(level);
        } catch {
          // Ambient audio follows the world; it never blocks the loop.
        }
      }
      lastUI = now;
    }
    if (debugEnabled()) {
      frameStats.frames++;
      frameStats.total += raw;
      if (now - frameStats.since > 500) {
        frameStats.fps = Math.round((frameStats.frames * 1000) / (now - frameStats.since));
        frameStats.average = frameStats.total / frameStats.frames;
        let extra = '';
        try {
          const day = getDayInfo(game.elapsed);
          const weather = hasJourney ? game.weather().type : 'clear';
          const biome = hasJourney ? game.biome() : 'woodland';
          extra = ` · Ngày ${day.day} ${day.clock} · ${weather} · ${biome} · gen${game.world.generationVersion}`;
        } catch {
          extra = '';
        }
        ui.debug(
          `${frameStats.fps} FPS · ${frameStats.average.toFixed(1)} ms/khung · ` +
            `${renderer.stats.entities} vật thể · ${renderer.stats.structures} công trình · ` +
            `${renderer.stats.particles} hạt · ${renderer.stats.lights} nguồn sáng · ` +
            `DPR ${renderer.dpr.toFixed(2)} · ${Math.round(renderer.width)}×${Math.round(renderer.height)}${extra}`,
        );
        frameStats = { ...frameStats, frames: 0, total: 0, since: now };
      }
    }
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
renderer
  .load()
  .then((allLoaded) => {
    ready = true;
    $('loading-state').hidden = true;
    $('new-button').disabled = false;
    if (!allLoaded)
      ui.toast('Một số hình ảnh chưa tải được. Bạn vẫn có thể chơi với hình thay thế.', 'warning');
  })
  .catch((error) => {
    console.error('Unable to load the woodland assets:', error);
    // Canvas placeholders allow play even when a browser rejects an image decode.
    ready = true;
    $('loading-state').hidden = true;
    $('new-button').disabled = false;
    ui.toast('Đang dùng đồ họa thay thế. Hãy tải lại trang để thử tải hình ảnh.', 'warning');
  });
