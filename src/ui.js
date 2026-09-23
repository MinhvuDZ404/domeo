import { BIOMES, CHUNK_SIZE, ITEMS, PLACEABLE, RECIPES, RESOURCES, getDayInfo } from './config.js';
import { deathReport } from './game.js';
import { MOTION_MODES, QUALITY_MODES, percentToVolume, volumeToPercent } from './settings.js';
import { CAMP_TIERS } from './camp.js';
import { PASSIVES, QUESTS, QUEST_GROUPS } from './quests.js';
import { icon, fillIcons } from './icons.js';

const $ = (id) => document.getElementById(id);
// Below this a dodge (24) or a swing is no longer affordable, so the stamina
// bar warns slightly before the player is refused.
const DRAW_STAMINA_WARNING = 28;
// A compact change signature for side quests, so the DOM is only touched when
// something actually changed.
function questsSignature(quests, game) {
  return quests
    .map((quest) => {
      const progress = game.quests.progressOf(quest);
      return `${quest.id}:${progress.map((objective) => objective.value).join('.')}`;
    })
    .join('|');
}
const MOTION_LABELS = {
  system: 'Theo hệ thống',
  on: 'Luôn giảm',
  off: 'Luôn bật đầy đủ',
};
export class UI {
  constructor({
    action,
    craft,
    useItem,
    selectTab,
    transfer = () => {},
    setting = () => {},
    resetSettings = () => {},
    claimQuest = () => {},
  }) {
    this.action = action;
    this.transfer = transfer;
    this.claimQuest = claimQuest;
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
      return `<article class="recipe-card" data-recipe="${recipe.id}"><div class="recipe-heading"><div class="recipe-icon">${icon(item.icon, 27)}</div><div><h3>${item.name}</h3><small>${item.kind}</small></div><button data-craft="${recipe.id}" aria-label="Chế tạo ${item.name.toLowerCase()}">Chế tạo</button></div><p>${item.description}</p><p class="recipe-note" hidden></p><div class="recipe-costs">${Object.entries(
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
        if (this.game?.openChest && event.detail === 2) this.transfer(card.dataset.item, true);
      }
    });
    $('chest-grid')?.addEventListener('click', (event) => {
      const card = event.target.closest('[data-chest]');
      if (card) this.transfer(card.dataset.chest, false);
    });
    $('stash-selected')?.addEventListener('click', () => {
      if (this.selectedItem) this.transfer(this.selectedItem, true);
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
          const tabs = ['bag', 'craft', 'chest'].filter(
            (name) => $(`${name}-tab`) && !$(`${name}-tab`).hidden,
          );
          const index = tabs.indexOf(this.tab);
          const tab =
            event.key === 'Home'
              ? tabs[0]
              : event.key === 'End'
                ? tabs.at(-1)
                : event.key === 'ArrowLeft'
                  ? tabs[(index - 1 + tabs.length) % tabs.length]
                  : tabs[(index + 1) % tabs.length];
          selectTab(tab);
          $(`${tab}-tab`).focus();
        }
      });
    });
    $('journal-toggle').addEventListener('click', () => {
      const collapsed = document.querySelector('.journal-card').classList.toggle('collapsed');
      $('journal-toggle').setAttribute('aria-expanded', String(!collapsed));
    });
    $('journal-open').addEventListener('click', () => action('journal'));
    // Rewards are claimed by hand: the journal is where the player decides that
    // a finished quest is really finished.
    $('journal-list').addEventListener('click', (event) => {
      const button = event.target.closest('[data-claim]');
      if (button && !button.disabled) claimQuest(button.dataset.claim);
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
    for (const key of ['ambient', 'particles', 'debug', 'shake'])
      $(`settings-${key}`)?.addEventListener('change', (event) =>
        setting(key, event.target.checked),
      );
    $('settings-motion').addEventListener('change', (event) =>
      setting('motion', event.target.value),
    );
    $('settings-quality')?.addEventListener('change', (event) =>
      setting('quality', event.target.value),
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
    if ($('settings-shake')) $('settings-shake').checked = settings.shake !== false;
    $('settings-debug').checked = debug;
    const motion = MOTION_MODES.includes(settings.motion) ? settings.motion : 'system';
    $('settings-motion').value = motion;
    $('settings-motion-note').textContent = MOTION_LABELS[motion];
    if ($('settings-quality')) {
      const quality = QUALITY_MODES.includes(settings.quality) ? settings.quality : 'auto';
      $('settings-quality').value = quality;
    }
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
    for (const name of ['bag', 'craft', 'chest']) {
      const button = $(`${name}-tab`),
        panel = $(`${name}-panel`);
      if (!button || !panel) continue;
      button.setAttribute('aria-selected', String(tab === name));
      button.tabIndex = tab === name ? 0 : -1;
      panel.hidden = tab !== name;
    }
    if ($('inventory-dialog').open) $(`${tab}-tab`)?.focus();
  }
  render(game, target = null) {
    this.game = game;
    const p = game.player,
      day = getDayInfo(game.elapsed);
    // Each vital warns at the point where it starts to matter: health below the
    // injury vignette, warmth before the cold starts biting, hunger and stamina
    // when the next action would be refused.
    const LOW = { health: 32, hunger: 25, warmth: 30, stamina: DRAW_STAMINA_WARNING };
    for (const [id, value] of [
      ['health', p.health],
      ['hunger', p.hunger],
      ['warmth', p.warmth ?? 100],
      ['stamina', p.stamina ?? 100],
    ]) {
      const rounded = Math.ceil(value),
        bar = $(`${id}-bar`);
      $(`${id}-value`).firstChild.nodeValue = `${rounded} `;
      bar.firstElementChild.style.width = `${value}%`;
      bar.setAttribute('aria-valuenow', String(rounded));
      bar.classList.toggle('low', value < LOW[id]);
    }
    $('day-label').textContent = `NGÀY ${String(day.day).padStart(2, '0')}`;
    $('clock-label').textContent = `${day.clock} · ${day.label}`;
    const weather = game.weather ? game.weather() : null;
    const weatherIcon =
      weather?.type === 'rain' ? 'rain' : weather?.type === 'mist' ? 'mist' : null;
    const timeIcon = weatherIcon ?? (day.isNight ? 'moon' : 'sun');
    if ($('time-icon').dataset.current !== timeIcon) {
      $('time-icon').innerHTML = icon(timeIcon, 22);
      $('time-icon').dataset.current = timeIcon;
    }
    $('coordinates').textContent = `${Math.round(p.x)}, ${Math.round(p.y)}`;
    const locationName = $('location-name');
    if (locationName) {
      const biome = game.biome ? game.biome() : 'woodland';
      const event = game.worldEvent ? game.worldEvent() : null;
      const text = [BIOMES[biome]?.name ?? 'Rừng tĩnh lặng', weather?.label, event?.label]
        .filter(Boolean)
        .join(' · ');
      if (locationName.textContent !== text) locationName.textContent = text;
    }
    document.querySelectorAll('[data-count]').forEach((el) => {
      el.textContent = String(game.inventory[el.dataset.count]);
    });
    document.querySelectorAll('[data-slot]').forEach((el) => {
      const id = el.dataset.slot;
      el.classList.toggle('empty', game.inventory[id] === 0);
      const active = game.placement === id || (id === 'torch' && game.torchLit);
      el.classList.toggle('active', active);
      if (['campfire', 'wall', 'chest', 'torch'].includes(id))
        el.setAttribute('aria-pressed', String(active));
    });
    const focus = game.getFocus();
    $('interaction-prompt').hidden = !focus || !!game.placement || game.dead;
    if (focus?.kind === 'resource') {
      const target = focus.entity;
      const resource = RESOURCES[target.type],
        missing = resource.tool && !game.inventory[resource.tool];
      $('interaction-label').textContent = missing
        ? `Cần ${ITEMS[resource.tool].name.toLowerCase()}`
        : resource.label;
      $('interaction-detail').textContent = missing ? 'Nhấn C để chế tạo' : 'Giữ để tiếp tục';
      $('interaction-prompt').classList.toggle('warning', !!missing);
    } else if (focus?.kind === 'chest') {
      $('interaction-label').textContent = 'Mở rương gỗ';
      $('interaction-detail').textContent = 'Cất hoặc lấy đồ';
      $('interaction-prompt').classList.remove('warning');
    } else if (focus?.kind === 'beacon') {
      $('interaction-label').textContent = game.flags?.beaconLit
        ? 'Đèn hiệu đã sáng'
        : 'Thắp đèn hiệu';
      $('interaction-detail').textContent = game.flags?.beaconLit
        ? 'Ánh sáng vẫn còn đó'
        : 'Cần hạt giống bình minh';
      $('interaction-prompt').classList.toggle(
        'warning',
        !game.flags?.beaconLit && !game.inventory.ancientSeed,
      );
    } else if (focus?.kind === 'shelter') {
      const wait = Math.ceil((game.restReadyAt ?? 0) - game.elapsed);
      const ready = wait <= 0;
      $('interaction-label').textContent = ready ? 'Nghỉ một lát' : 'Vừa nghỉ rồi';
      $('interaction-detail').textContent = ready
        ? 'Hồi máu và hơi ấm'
        : `Thử lại sau ${wait} giây`;
      $('interaction-prompt').classList.toggle('warning', !ready);
    } else if (focus?.kind === 'campfire') {
      $('interaction-label').textContent = game.inventory.berry
        ? 'Nướng quả mọng'
        : game.home
          ? 'Lửa nhà bạn'
          : 'Đánh dấu nhà';
      $('interaction-detail').textContent = game.inventory.berry
        ? 'Một quả thành quả nướng'
        : 'La bàn sẽ nhớ chỗ này';
      $('interaction-prompt').classList.remove('warning');
    }
    this.renderWayfinding(game);
    $('placement-bar').hidden = !game.placement;
    if (game.placement)
      $('placement-name').textContent = `Đặt ${ITEMS[game.placement].name.toLowerCase()}`;
    $('touch-interact').querySelector('small').textContent = game.placement
      ? 'ĐẶT XUỐNG'
      : 'HÁI LƯỢM';
    this.renderQuestTracker(game);
    this.renderSideQuests(game);
    this.renderCamp(game);
    this.renderThreat(game);
    const footer = $('journal-footer');
    if (footer) {
      const text =
        game.stats.landmarks > 0
          ? `Đã khám phá ${game.stats.landmarks} địa danh · Mỗi điều nhỏ bé, một khởi đầu.`
          : 'Mỗi điều nhỏ bé, một khởi đầu.';
      if (footer.textContent !== text) footer.textContent = text;
    }
    if ($('inventory-dialog').open) this.renderInventory(game);
    if ($('journal-dialog').open && this.journalChanged(game)) this.renderJournal(game);
  }
  // ---- 5.1: quests, camp and danger ---------------------------------------
  /**
   * The tracker is the one line of quest information that is always on screen:
   * the current step of the main journey, never the whole list.
   */
  renderQuestTracker(game) {
    const summary = game.questSummary ? game.questSummary() : null;
    const title = $('quest-title'),
      objective = $('quest-objective'),
      count = $('quest-count'),
      progress = $('quest-progress'),
      rewards = $('quest-rewards');
    if (!title) return;
    const signature = summary
      ? `${summary.id}:${summary.status}:${summary.objective}:${summary.value}:${summary.pendingRewards}`
      : 'none';
    if (signature === this.lastQuestSignature) return;
    this.lastQuestSignature = signature;
    if (!summary) {
      title.textContent = 'Khu rừng đang chờ';
      objective.textContent = 'Đi theo hướng bạn muốn.';
      count.textContent = '';
      progress.firstElementChild.style.width = '0%';
      progress.setAttribute('aria-valuenow', '0');
      rewards.hidden = true;
      return;
    }
    title.textContent = summary.title;
    objective.textContent =
      summary.status === 'done' ? 'Xong rồi — mở nhật ký để nhận thưởng.' : summary.objective;
    count.textContent =
      summary.value === null || summary.status === 'done'
        ? ''
        : `${summary.value}/${summary.count}`;
    const percent = Math.round(summary.percent * 100);
    progress.firstElementChild.style.width = `${percent}%`;
    progress.setAttribute('aria-valuenow', String(percent));
    rewards.hidden = summary.pendingRewards === 0;
    if (summary.pendingRewards > 0)
      rewards.innerHTML = `${icon('banner', 13)} ${summary.pendingRewards} phần thưởng đang chờ · nhấn N`;
  }
  /** Side quests live under the tracker, at most three at a time. */
  renderSideQuests(game) {
    const list = $('goal-list');
    if (!list || !game.quests) return;
    const claimed = game.quests.claimedCount ? game.quests.claimedCount() : 0;
    const active = game.quests.active().filter((quest) => quest.group !== 'journey');
    const signature = `${claimed}/${questsSignature(active, game)}`;
    if (signature === this.lastGoalSignature) return;
    this.lastGoalSignature = signature;
    $('goal-count').textContent = `${game.quests.completedCount()}/${QUESTS.length}`;
    if (!active.length) {
      list.innerHTML = `<li class="goal"><span class="goal-dot">${icon('leaf', 11)}</span><div><strong>Chưa có việc nào khác</strong><small>Hành trình chính vẫn đang chờ bạn.</small></div></li>`;
      return;
    }
    list.innerHTML = active
      .slice(0, 3)
      .map((quest) => {
        const progress = game.quests.progressOf(quest);
        const done = progress.filter((objective) => objective.complete).length;
        const next = progress.find((objective) => !objective.complete) ?? progress[0];
        return `<li class="goal active"><span class="goal-dot">${done === progress.length ? icon('check', 11) : ''}</span><div><strong>${quest.title}</strong><small>${next.label} · ${next.value}/${next.count}</small></div></li>`;
      })
      .join('');
  }
  renderCamp(game) {
    const panel = $('camp-panel');
    if (!panel || !game.home) {
      if (panel) panel.hidden = true;
      return;
    }
    panel.hidden = false;
    const summary = game.campSummary();
    const signature = `${summary.level}/${summary.placed}/${summary.built.join(',')}`;
    if (signature === this.lastCampSignature) return;
    this.lastCampSignature = signature;
    $('camp-level').textContent = summary.level > 0 ? `Cấp ${summary.level}` : 'Chưa dựng gì';
    $('camp-next').textContent = summary.next
      ? `Tiếp theo: ${summary.next.tier.name} — ${summary.next.tier.benefit}`
      : 'Trại đã đủ đầy. Khu rừng vẫn còn rộng.';
    $('camp-list').innerHTML = CAMP_TIERS.map((tier) => {
      const built = summary.built.includes(tier.id);
      return `<li class="camp-item ${built ? 'built' : ''}"><span class="camp-dot">${built ? icon('check', 11) : ''}</span><span>${tier.name}</span></li>`;
    }).join('');
  }
  /** One badge, shown only when something is actually aware of the player. */
  renderThreat(game) {
    const badge = $('threat-badge');
    if (!badge || !game.enemies) return;
    const summary = game.enemies.summary();
    const level = game.enemies.threat ? game.enemies.threat() : 0;
    const near =
      summary.alerted ??
      (summary.nearest && summary.nearest.distance < 420 ? summary.nearest : null);
    const show = level > 0.18 || !!summary.elite || !!summary.alerted;
    if (badge.hidden !== !show) badge.hidden = !show;
    if (!show) {
      // Nothing to say: clear the signature so the badge re-renders next time.
      if (this.lastThreatSignature) this.lastThreatSignature = '';
      return;
    }
    const verb = {
      notice: 'đã thấy bạn',
      chase: 'đang tới',
      windup: 'sắp đánh',
      strike: 'đánh',
      recover: 'vừa đánh',
      retreat: 'đang lùi',
    }[near?.state];
    const text = summary.elite
      ? `${summary.elite.name} · ${Math.round(summary.elite.health)}/${summary.elite.maxHealth}`
      : near
        ? `${near.name}${verb ? ` · ${verb}` : ''}`
        : 'Có gì đó đang tới';
    if (text !== this.lastThreatSignature) {
      this.lastThreatSignature = text;
      $('threat-text').textContent = text;
    }
    badge.classList.toggle('danger', level > 0.7);
  }
  // The full journal: every quest the player can see, grouped, with rewards.
  /**
   * Whether the journal would read differently than the last time it was drawn.
   * The dialog is open for as long as the player is reading it, so rebuilding it
   * on every UI tick would churn the DOM (and any click target inside it) for no
   * reason at all.
   */
  journalChanged(game) {
    if (!game.quests) return false;
    const signature =
      `${game.quests.claimedCount()}:${game.stats.quests}:${game.journeyComplete ? 1 : 0}:` +
      game.quests.defs
        .map(
          (quest) =>
            `${quest.id}:${game.quests.status(quest.id)}:` +
            game.quests
              .progressOf(quest)
              .map((objective) => objective.value)
              .join(','),
        )
        .join('|');
    if (signature === this.lastJournalSignature) return false;
    this.lastJournalSignature = signature;
    return true;
  }
  renderJournal(game) {
    const list = $('journal-list');
    if (!list || !game.quests) return;
    // Keep the signature in step: claiming from the journal draws it directly,
    // so the next tick must not immediately rebuild the same card again.
    this.journalChanged(game);
    const visible = game.quests.defs.filter((quest) => game.quests.status(quest.id) !== 'locked');
    const claimed = game.quests.claimedCount();
    $('journal-summary').textContent =
      `${claimed}/${QUESTS.length} phần thưởng đã nhận · ${game.stats.quests} nhiệm vụ hoàn thành` +
      (game.journeyComplete ? ' · Hành trình đã trọn vẹn.' : '');
    if (!visible.length) {
      list.innerHTML = '<p class="section-note">Chưa có gì trong nhật ký.</p>';
      return;
    }
    list.innerHTML = QUEST_GROUPS.map((group) => {
      const quests = visible.filter((quest) => quest.group === group.id);
      if (!quests.length) return '';
      const entries = quests
        .map((quest) => {
          const status = game.quests.status(quest.id);
          const progress = game.quests.progressOf(quest);
          const objectives = progress
            .map(
              (objective) =>
                `<li class="${objective.complete ? 'done' : ''}"><span class="goal-dot">${objective.complete ? icon('check', 10) : ''}</span><span>${objective.label}</span><small>${objective.value}/${objective.count}</small></li>`,
            )
            .join('');
          const rewards = [];
          for (const [item, count] of Object.entries(quest.reward?.items ?? {}))
            rewards.push(`${count} ${ITEMS[item].name.toLowerCase()}`);
          for (const key of quest.reward?.recipes ?? []) {
            const id = key.replace('recipe:', '');
            if (ITEMS[id]) rewards.push(`công thức ${ITEMS[id].name.toLowerCase()}`);
          }
          for (const key of quest.reward?.passives ?? []) {
            const passive = PASSIVES[key.replace('passive:', '')];
            if (passive) rewards.push(passive.name);
          }
          const claimable = status === 'done';
          return `<article class="quest-card ${status}" data-quest="${quest.id}">
  <header><div><h3>${quest.title}</h3><small>${quest.description}</small></div><span class="quest-status">${status === 'claimed' ? 'Đã nhận' : claimable ? 'Chờ thưởng' : 'Đang làm'}</span></header>
  <ul class="quest-objectives">${objectives}</ul>
  ${rewards.length ? `<p class="quest-reward-line">${icon('banner', 13)} ${rewards.join(' · ')}</p>` : ''}
  ${claimable ? `<button class="button button-dark" data-claim="${quest.id}">Nhận phần thưởng</button>` : ''}
  ${status === 'active' ? `<p class="quest-hint">${quest.hint ?? ''}</p>` : ''}
</article>`;
        })
        .join('');
      return `<section class="journal-group"><h3 class="journal-group-title">${group.label}</h3>${entries}</section>`;
    }).join('');
  }
  // The needle points at the marked home and the mini-map keeps the chunks
  // already walked, redrawn from the explored set (the world is never stored).
  renderWayfinding(game) {
    const needle = $('compass-needle'),
      label = $('compass-distance');
    const compass = game.compass();
    if (needle) {
      const degrees = compass ? Math.round((compass.angle * 180) / Math.PI) : 0;
      if (needle.dataset.angle !== String(degrees)) {
        needle.dataset.angle = String(degrees);
        needle.style.transform = `rotate(${degrees}deg)`;
      }
      needle.closest('.compass-widget')?.classList.toggle('no-home', !compass);
    }
    if (label) {
      const text = !compass
        ? 'Chưa có nhà'
        : compass.distance < 40
          ? 'Bạn đang ở nhà'
          : `Cách ${Math.max(1, Math.round(compass.distance / 16))} bước`;
      if (label.textContent !== text) label.textContent = text;
    }
    this.renderMiniMap(game);
  }
  renderMiniMap(game) {
    const canvas = $('mini-map'),
      ctx = canvas?.getContext('2d');
    if (!ctx) return;
    const cell = 12,
      columns = Math.max(1, Math.floor(canvas.width / cell)),
      rows = Math.max(1, Math.floor(canvas.height / cell));
    const originX = Math.floor(game.player.x / CHUNK_SIZE) - Math.floor(columns / 2),
      originY = Math.floor(game.player.y / CHUNK_SIZE) - Math.floor(rows / 2);
    ctx.fillStyle = '#16241c';
    ctx.fillRect(0, 0, columns * cell, rows * cell);
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        if (!game.explored.has(`${originX + column},${originY + row}`)) continue;
        ctx.fillStyle = '#3d5c46';
        ctx.fillRect(column * cell, row * cell, cell - 1, cell - 1);
      }
    }
    if (game.home) {
      const column = Math.floor(game.home.x / CHUNK_SIZE) - originX,
        row = Math.floor(game.home.y / CHUNK_SIZE) - originY;
      if (column >= 0 && column < columns && row >= 0 && row < rows) {
        ctx.fillStyle = '#e0b96a';
        ctx.fillRect(column * cell + 2, row * cell + 2, cell - 5, cell - 5);
      }
    }
    // Discovered landmarks appear; the undiscovered stay secret.
    if (game.discovered?.size && game.world.generationVersion >= 2) {
      try {
        const landmarks = game.world.getLandmarks({
          x: originX * CHUNK_SIZE,
          y: originY * CHUNK_SIZE,
          width: columns * CHUNK_SIZE,
          height: rows * CHUNK_SIZE,
        });
        for (const landmark of landmarks) {
          if (!game.discovered.has(landmark.id)) continue;
          const column = Math.floor(landmark.x / CHUNK_SIZE) - originX,
            row = Math.floor(landmark.y / CHUNK_SIZE) - originY;
          if (column < 0 || column >= columns || row < 0 || row >= rows) continue;
          ctx.fillStyle = '#9fd4e8';
          ctx.fillRect(column * cell + 4, row * cell + 4, 4, 4);
        }
      } catch {
        // The mini-map must never break the HUD.
      }
    }
    // The player dot keeps world precision inside their own chunk cell.
    const x = (game.player.x / CHUNK_SIZE - originX) * cell,
      y = (game.player.y / CHUNK_SIZE - originY) * cell;
    ctx.fillStyle = '#f2f6e4';
    ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
    ctx.strokeStyle = '#4d6b53';
    ctx.strokeRect(0.5, 0.5, columns * cell - 1, rows * cell - 1);
  }
  // The chest tab is only reachable while a chest is open; its cards mirror the bag.
  renderChest(game) {
    const tab = $('chest-tab'),
      grid = $('chest-grid');
    const open = !!game.openChest;
    if (tab) {
      const wasHidden = tab.hidden;
      tab.hidden = !open;
      if (!open && this.tab === 'chest') this.setTab('bag');
      else if (open && wasHidden) tab.focus();
    }
    if (!grid) return;
    if (!open) {
      // Nothing lingers in the panel once the chest is left behind.
      if (grid.childElementCount) grid.replaceChildren();
      return;
    }
    if (!grid.childElementCount) {
      grid.innerHTML = Object.entries(ITEMS)
        .map(
          ([id, item]) =>
            `<button class="item-card" data-chest="${id}" aria-label="${item.name}"><small>×0</small>${icon(item.icon, 32)}<strong>${item.name}</strong></button>`,
        )
        .join('');
    }
    for (const card of grid.querySelectorAll('[data-chest]')) {
      const id = card.dataset.chest,
        count = game.chest[id] ?? 0;
      card.querySelector('small').textContent = `×${count}`;
      card.classList.toggle('empty', count === 0);
      card.disabled = count === 0;
      card.setAttribute('aria-label', `${ITEMS[id].name}, ${count}`);
    }
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
    const foodLabels = {
      berry: 'Ăn một quả · +25 no',
      cooked: 'Ăn quả nướng · +40 no',
      mushroom: 'Ăn nấm · +15 no',
      meal: 'Ăn một bữa · +55 no',
      tea: 'Uống trà · hồi sức bền',
      salve: game.passive?.('herbalist') ? 'Dùng cao dán · +45 máu' : 'Dùng cao dán · +35 máu',
    };
    const placeable = PLACEABLE.includes(this.selectedItem);
    action.hidden = !(
      this.selectedItem in foodLabels ||
      placeable ||
      this.selectedItem === 'torch'
    );
    action.disabled = !game.inventory[this.selectedItem];
    action.textContent =
      this.selectedItem in foodLabels
        ? foodLabels[this.selectedItem]
        : this.selectedItem === 'torch'
          ? game.torchLit
            ? 'Tắt đuốc'
            : 'Thắp đuốc'
          : 'Mang ra đặt';
    this.renderChest(game);
    const stash = $('stash-selected');
    if (stash) stash.hidden = !game.openChest;
    for (const recipe of RECIPES) {
      const card = document.querySelector(`[data-recipe="${recipe.id}"]`),
        button = card.querySelector('button');
      const blocked = game.craftBlocked(recipe.id);
      button.disabled = blocked !== null;
      button.textContent =
        recipe.unique && game.inventory[recipe.id] > 0
          ? 'Đã có'
          : blocked === 'blueprint'
            ? 'Chưa học'
            : blocked?.startsWith('station:')
              ? 'Cần chỗ'
              : 'Chế tạo';
      const note = card.querySelector('.recipe-note');
      if (note) {
        const station = recipe.station ? ITEMS[recipe.station]?.name.toLowerCase() : '';
        const text =
          blocked === 'blueprint'
            ? 'Học công thức này từ nhật ký.'
            : blocked?.startsWith('station:')
              ? `Đứng gần ${station} để chế.`
              : recipe.station
                ? `Chế cạnh ${station}.`
                : '';
        if (note.textContent !== text) note.textContent = text;
        note.hidden = !text;
      }
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
    const report = deathReport(game.deathCause);
    const lead = $('death-lead');
    const reason = $('death-reason');
    if (lead) lead.textContent = report.lead;
    if (reason) reason.textContent = report.detail;
    $('journey-stats').innerHTML =
      `<div><strong>${Math.floor(game.elapsed / 60)}:${String(Math.floor(game.elapsed % 60)).padStart(2, '0')}</strong><span>PHÚT KHÁM PHÁ</span></div><div><strong>${Math.floor(game.stats.distance / 64)}</strong><span>Ô ĐẤT ĐÃ ĐI</span></div><div><strong>${game.stats.crafted}</strong><span>VẬT PHẨM TẠO RA</span></div>`;
    this.openDialog('gameover-dialog');
  }
}
