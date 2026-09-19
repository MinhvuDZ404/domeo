import { ITEMS, RECIPES, RESOURCES, getDayInfo } from './config.js';
import { MOTION_MODES, percentToVolume, volumeToPercent } from './settings.js';
import { icon, fillIcons } from './icons.js';

const $ = (id) => document.getElementById(id);
const MOTION_LABELS = {
  system: 'Theo hệ thống',
  on: 'Luôn giảm',
  off: 'Luôn bật đầy đủ',
};
export class UI {
  constructor({ action, craft, useItem, selectTab, setting = () => {}, resetSettings = () => {} }) {
    this.action = action;
    this.selectedItem = 'berry';
    this.tab = 'bag';
    this.lastGoalSignature = '';
    fillIcons();
    $('inventory-grid').innerHTML = Object.entries(ITEMS)
      .map(
        ([id, item]) =>
          `<button class="item-card" data-item="${id}" aria-label="${item.name}" aria-pressed="false"><small>0</small>${icon(item.icon, 32)}<strong>${item.name}</strong></button>`,
      )
      .join('');
    $('recipe-list').innerHTML = RECIPES.map((recipe) => {
      const item = ITEMS[recipe.id];
      return `<article class="recipe-card" data-recipe="${recipe.id}"><div class="recipe-heading"><div class="recipe-icon">${icon(item.icon, 27)}</div><div><h3>${item.name}</h3><small>${item.kind}</small></div><button data-craft="${recipe.id}" aria-label="Chế tạo ${item.name.toLowerCase()}">Chế tạo</button></div><p>${item.description}</p><div class="recipe-costs">${Object.entries(
        recipe.costs,
      )
        .map(
          ([id, count]) =>
            `<span class="cost" data-cost="${id}" title="${ITEMS[id].name}">${icon(ITEMS[id].icon, 13)}<span>0/${count} ${ITEMS[id].name.toLowerCase()}</span></span>`,
        )
        .join('')}</div></article>`;
    }).join('');
    $('inventory-grid').addEventListener('click', (event) => {
      const card = event.target.closest('[data-item]');
      if (card) {
        this.selectedItem = card.dataset.item;
        this.renderInventory(this.game);
      }
    });
    $('recipe-list').addEventListener('click', (event) => {
      const button = event.target.closest('[data-craft]');
      if (button && !button.disabled) craft(button.dataset.craft);
    });
    $('item-action').addEventListener('click', () => useItem(this.selectedItem));
    document
      .querySelectorAll('[data-slot]')
      .forEach((button) => button.addEventListener('click', () => useItem(button.dataset.slot)));
    document.querySelectorAll('[data-tab]').forEach((button) => {
      button.addEventListener('click', () => selectTab(button.dataset.tab));
      button.addEventListener('keydown', (event) => {
        if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
          event.preventDefault();
          const tab =
            event.key === 'Home'
              ? 'bag'
              : event.key === 'End'
                ? 'craft'
                : this.tab === 'bag'
                  ? 'craft'
                  : 'bag';
          selectTab(tab);
          $(`${tab}-tab`).focus();
        }
      });
    });
    $('journal-toggle').addEventListener('click', () => {
      const collapsed = document.querySelector('.journal-card').classList.toggle('collapsed');
      $('journal-toggle').setAttribute('aria-expanded', String(!collapsed));
    });
    document
      .querySelectorAll('[data-close]')
      .forEach((button) => button.addEventListener('click', () => action('escape')));
    const volume = $('settings-volume');
    volume.addEventListener('input', () => {
      // The slider reports 0-100; settings store a 0-1 fraction.
      const level = percentToVolume(volume.value);
      $('settings-volume-value').textContent = `${volumeToPercent(level)}%`;
      setting('volume', level);
    });
    for (const key of ['ambient', 'particles', 'debug'])
      $(`settings-${key}`).addEventListener('change', (event) =>
        setting(key, event.target.checked),
      );
    $('settings-motion').addEventListener('change', (event) =>
      setting('motion', event.target.value),
    );
    $('settings-reset').addEventListener('click', () => resetSettings());
    document.querySelectorAll('dialog').forEach((dialog) => {
      dialog.addEventListener('cancel', (event) => {
        event.preventDefault();
        action('escape');
      });
      dialog.addEventListener('keydown', (event) => {
        if (event.key !== 'Tab') return;
        const focusable = [
          ...dialog.querySelectorAll('button:not(:disabled), [tabindex]:not([tabindex="-1"])'),
        ].filter((el) => el.tabIndex >= 0 && el.getClientRects().length > 0);
        const first = focusable[0],
          last = focusable.at(-1);
        if (!first) {
          event.preventDefault();
          return;
        }
        if (
          event.shiftKey &&
          (document.activeElement === first || !focusable.includes(document.activeElement))
        ) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === last || !focusable.includes(document.activeElement))
        ) {
          event.preventDefault();
          first.focus();
        }
      });
    });
  }
  // The label comes from src/config.js, never from user input.
  setVersion(label, version) {
    $('edition-label').innerHTML = `THẾ GIỚI NHỎ · NHỮNG CHUYẾN ĐI LỚN <i>${label}</i>`;
    $('game-version').textContent = `Domeo ${label} · bản dựng ${version}`;
  }
  // `debug` may differ from the stored setting when ?debug=1 asked for it.
  syncSettings(settings, { debug = settings.debug } = {}) {
    const volume = volumeToPercent(settings.volume);
    $('settings-volume').value = String(volume);
    $('settings-volume-value').textContent = `${volume}%`;
    for (const key of ['ambient', 'particles']) $(`settings-${key}`).checked = settings[key];
    $('settings-debug').checked = debug;
    const motion = MOTION_MODES.includes(settings.motion) ? settings.motion : 'system';
    $('settings-motion').value = motion;
    $('settings-motion-note').textContent = MOTION_LABELS[motion];
    this.setDebugVisible(debug);
  }
  setDebugVisible(visible) {
    $('debug-overlay').hidden = !visible;
  }
  debug(text) {
    $('debug-overlay').textContent = text;
  }
  // A refused action flashes the prompt instead of silently doing nothing.
  denied() {
    const prompt = $('interaction-prompt');
    prompt.classList.remove('denied');
    void prompt.offsetWidth;
    prompt.classList.add('denied');
    setTimeout(() => prompt.classList.remove('denied'), 600);
  }
  setMenu(isMenu) {
    $('app').classList.toggle('in-menu', isMenu);
    $('app').classList.toggle('in-game', !isMenu);
    $('main-menu').hidden = !isMenu;
    $('game-hud').hidden = isMenu;
    $('world-clock').hidden = isMenu;
    $('pause-button').hidden = isMenu;
    $('save-button').hidden = isMenu;
  }
  updateContinue(data, error = null) {
    const alive = data && data.player.health > 0;
    $('continue-button').hidden = !alive;
    $('new-button').className = `button ${alive ? 'button-quiet' : 'button-primary'}`;
    $('new-label').textContent = alive ? 'Một hành trình mới' : 'Bắt đầu khám phá';
    const note = $('menu-save-note');
    if (error) note.textContent = error;
    else if (alive)
      note.textContent = `Ngày ${getDayInfo(data.elapsed).day} · Đã lưu trên trình duyệt này. Khu rừng đang đợi bạn.`;
    else if (data) note.textContent = 'Chuyến đi cũ đã khép lại. Một khởi đầu khác đang chờ.';
    else
      note.innerHTML = '<span class="status-dot"></span> Không vội vàng. Cứ đi theo cách của bạn.';
  }
  openDialog(id) {
    this.closeDialogs();
    $(id).append($('toast-region'));
    $(id).showModal();
  }
  closeDialogs() {
    $('app').append($('toast-region'));
    document.querySelectorAll('dialog[open]').forEach((dialog) => dialog.close());
  }
  setTab(tab) {
    this.tab = tab;
    for (const name of ['bag', 'craft']) {
      $(`${name}-tab`).setAttribute('aria-selected', String(tab === name));
      $(`${name}-tab`).tabIndex = tab === name ? 0 : -1;
      $(`${name}-panel`).hidden = tab !== name;
    }
    if ($('inventory-dialog').open) $(`${tab}-tab`).focus();
  }
  render(game, target = null) {
    this.game = game;
    const p = game.player,
      day = getDayInfo(game.elapsed);
    for (const [id, value] of [
      ['health', p.health],
      ['hunger', p.hunger],
    ]) {
      const rounded = Math.ceil(value),
        bar = $(`${id}-bar`);
      $(`${id}-value`).firstChild.nodeValue = `${rounded} `;
      bar.firstElementChild.style.width = `${value}%`;
      bar.setAttribute('aria-valuenow', String(rounded));
      bar.classList.toggle('low', value < 25);
    }
    $('day-label').textContent = `NGÀY ${String(day.day).padStart(2, '0')}`;
    $('clock-label').textContent = `${day.clock} · ${day.label}`;
    const timeIcon = day.isNight ? 'moon' : 'sun';
    if ($('time-icon').dataset.current !== timeIcon) {
      $('time-icon').innerHTML = icon(timeIcon, 22);
      $('time-icon').dataset.current = timeIcon;
    }
    $('coordinates').textContent = `${Math.round(p.x)}, ${Math.round(p.y)}`;
    document.querySelectorAll('[data-count]').forEach((el) => {
      el.textContent = String(game.inventory[el.dataset.count]);
    });
    document.querySelectorAll('[data-slot]').forEach((el) => {
      const id = el.dataset.slot;
      el.classList.toggle('empty', game.inventory[id] === 0);
      const active = game.placement === id || (id === 'torch' && game.torchLit);
      el.classList.toggle('active', active);
      if (['campfire', 'wall', 'torch'].includes(id))
        el.setAttribute('aria-pressed', String(active));
    });
    $('interaction-prompt').hidden = !target || !!game.placement || game.dead;
    if (target) {
      const resource = RESOURCES[target.type],
        missing = resource.tool && !game.inventory[resource.tool];
      $('interaction-label').textContent = missing
        ? `Cần ${ITEMS[resource.tool].name.toLowerCase()}`
        : resource.label;
      $('interaction-detail').textContent = missing ? 'Nhấn C để chế tạo' : 'Giữ để tiếp tục';
      $('interaction-prompt').classList.toggle('warning', !!missing);
    }
    $('placement-bar').hidden = !game.placement;
    if (game.placement)
      $('placement-name').textContent = `Đặt ${ITEMS[game.placement].name.toLowerCase()}`;
    $('touch-interact').querySelector('small').textContent = game.placement
      ? 'ĐẶT XUỐNG'
      : 'HÁI LƯỢM';
    const goals = game.goals(),
      count = goals.filter((goal) => goal.done).length;
    const signature = goals.map((goal) => Number(goal.done)).join('');
    if (signature !== this.lastGoalSignature) {
      this.lastGoalSignature = signature;
      $('goal-count').textContent = `${count}/${goals.length}`;
      // Keep the journal compact: previous step, current step, then the next step.
      const current = goals.findIndex((goal) => !goal.done);
      const start =
        current < 0 ? goals.length - 3 : Math.max(0, Math.min(current - 1, goals.length - 3));
      $('goal-list').innerHTML = goals
        .slice(start, start + 3)
        .map(
          (goal, index) =>
            `<li class="goal ${goal.done ? 'done' : start + index === current ? 'active' : ''}"><span class="goal-dot">${goal.done ? icon('check', 11) : ''}</span><div><strong>${goal.label}</strong><small>${goal.hint}</small></div></li>`,
        )
        .join('');
    }
    if ($('inventory-dialog').open) this.renderInventory(game);
  }
  renderInventory(game) {
    if (!game) return;
    this.game = game;
    $('bag-total').textContent = String(
      Object.values(game.inventory).reduce((sum, count) => sum + count, 0),
    );
    document.querySelectorAll('[data-item]').forEach((card) => {
      const id = card.dataset.item;
      card.querySelector('small').textContent = `×${game.inventory[id]}`;
      card.classList.toggle('empty', game.inventory[id] === 0);
      card.classList.toggle('selected', id === this.selectedItem);
      card.setAttribute('aria-pressed', String(id === this.selectedItem));
      card.setAttribute('aria-label', `${ITEMS[id].name}, ${game.inventory[id]}`);
    });
    const item = ITEMS[this.selectedItem];
    $('item-detail').innerHTML =
      `<div class="detail-heading"><h3>${item.name}</h3><small>${item.kind}</small></div><p>${item.description}</p>`;
    const action = $('item-action');
    action.hidden = !['berry', 'campfire', 'wall', 'torch'].includes(this.selectedItem);
    action.disabled = !game.inventory[this.selectedItem];
    action.textContent =
      this.selectedItem === 'berry'
        ? 'Ăn một quả · +25 no'
        : this.selectedItem === 'torch'
          ? game.torchLit
            ? 'Tắt đuốc'
            : 'Thắp đuốc'
          : 'Mang ra đặt';
    for (const recipe of RECIPES) {
      const card = document.querySelector(`[data-recipe="${recipe.id}"]`),
        button = card.querySelector('button');
      button.disabled = !game.canCraft(recipe.id);
      button.textContent = recipe.unique && game.inventory[recipe.id] > 0 ? 'Đã có' : 'Chế tạo';
      for (const [id, needed] of Object.entries(recipe.costs)) {
        const cost = card.querySelector(`[data-cost="${id}"]`);
        cost.classList.toggle('missing', game.inventory[id] < needed);
        cost.lastElementChild.textContent = `${game.inventory[id]}/${needed} ${ITEMS[id].name.toLowerCase()}`;
      }
    }
  }
  toast(text, tone = '') {
    const region = $('toast-region');
    const existing = [...region.children].find((node) => node.textContent === text);
    if (existing) return;
    while (region.children.length >= 3) region.firstElementChild.remove();
    const node = document.createElement('div');
    node.className = `toast ${tone}`;
    node.textContent = text;
    region.append(node);
    setTimeout(() => {
      node.classList.add('leaving');
      setTimeout(() => node.remove(), 250);
    }, 3200);
  }
  saved(ok) {
    $('save-label').textContent = ok ? 'Đã lưu' : 'Chưa lưu';
    $('save-button').classList.toggle('saved', ok);
  }
  gameOver(game) {
    $('journey-stats').innerHTML =
      `<div><strong>${Math.floor(game.elapsed / 60)}:${String(Math.floor(game.elapsed % 60)).padStart(2, '0')}</strong><span>PHÚT KHÁM PHÁ</span></div><div><strong>${Math.floor(game.stats.distance / 64)}</strong><span>Ô ĐẤT ĐÃ ĐI</span></div><div><strong>${game.stats.crafted}</strong><span>VẬT PHẨM TẠO RA</span></div>`;
    this.openDialog('gameover-dialog');
  }
}
