import { Game } from './src/game.js';
import { Renderer } from './src/renderer.js';
import { Input } from './src/input.js';
import { UI } from './src/ui.js';
import { Sound } from './src/sound.js';
import { ITEMS } from './src/config.js';
import { readSave, writeSave } from './src/storage.js';
import { icon } from './src/icons.js';

const $ = (id) => document.getElementById(id);
const renderer = new Renderer($('gameCanvas'));
const sound = new Sound();
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
  saveWarningShown = false;

const ui = new UI({
  action: handleAction,
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

function setMode(next) {
  input.clear();
  mousePoint = null;
  mode = next;
  lastTime = performance.now();
  lastUI = 0;
  if (hasJourney) ui.render(game, game.getTarget());
}
function save(manual = false) {
  if (!hasJourney) return true;
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
  if (mode === 'help') {
    const previous = returnMode;
    ui.closeDialogs();
    setMode(previous);
    if (previous === 'paused') ui.openDialog('pause-dialog');
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
  if (id === 'berry') game.eat();
  else if (id === 'torch') game.toggleTorch();
  else if (id === 'campfire' || id === 'wall') {
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
  if (mode !== 'playing') return;
  if (action === 'interact') {
    if (game.placement) {
      const point = mousePoint || game.placementPoint();
      game.place(point.x, point.y);
      handleEvents();
    } else game.interact();
  } else if (action === 'eat') useItem('berry');
  else if (action in ITEMS) useItem(action);
}
function handleEvents() {
  for (const event of game.drainEvents()) {
    sound.play(event.type);
    if (event.type === 'gather') renderer.addEffect(event);
    else if (event.type === 'death') {
      setMode('gameover');
      save(false);
      ui.gameOver(game);
    } else {
      if (event.type === 'build') {
        renderer.addEffect(event);
        save(false);
      }
      if (event.text) ui.toast(event.text, event.tone);
    }
  }
  const count = game.goals().filter((goal) => goal.done).length;
  if (count > completedGoals && mode !== 'menu') {
    completedGoals = count;
    ui.toast(
      count === 5
        ? 'Những bước đầu đã trọn vẹn. Khu rừng là của bạn.'
        : `Một bước nhỏ đã hoàn thành · ${count}/5 mục tiêu`,
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
$('sound-button').addEventListener('click', () => {
  const on = sound.toggle();
  $('sound-button').innerHTML = icon(on ? 'volume' : 'muted', 20);
  $('sound-button').setAttribute('aria-pressed', String(on));
  $('sound-button').setAttribute('aria-label', on ? 'Tắt âm thanh' : 'Bật âm thanh');
  $('sound-button').title = on ? 'Tắt âm thanh' : 'Bật âm thanh';
  if (on) sound.play('gather');
});
window.addEventListener('blur', () => {
  if (mode === 'playing') pause();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && hasJourney) {
    if (mode === 'playing') pause();
    else save(false);
  }
});
window.addEventListener('pagehide', () => {
  if (hasJourney) save(false);
});
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    input.clear();
    lastTime = performance.now();
    if (mode === 'playing') pause();
  }
});

function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
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
    const isMenu =
      mode === 'menu' || mode === 'confirm' || (mode === 'help' && returnMode === 'menu');
    const target = isMenu ? null : game.getTarget();
    renderer.render(game, {
      menu: isMenu,
      target: mode === 'playing' ? target : null,
      placement: game.placement ? mousePoint || game.placementPoint() : null,
      time: now,
    });
    if (now - lastUI > 120) {
      if (!isMenu) ui.render(game, target);
      lastUI = now;
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
