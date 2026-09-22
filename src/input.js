const movementCodes = [
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowLeft',
  'ArrowDown',
  'ArrowRight',
];
const actions = {
  KeyB: 'bag',
  KeyC: 'craft',
  KeyF: 'eat',
  Digit1: 'eat',
  Digit2: 'axe',
  Digit3: 'pickaxe',
  Digit4: 'campfire',
  Digit5: 'torch',
  Digit6: 'wall',
  Digit7: 'chest',
  Digit8: 'lantern',
  KeyG: 'salve',
  KeyH: 'home',
  KeyQ: 'dodge',
  KeyN: 'journal',
  KeyT: 'target',
  KeyM: 'mute',
  KeyO: 'options',
  Escape: 'escape',
};
// Keys that are held rather than tapped. They are also the keys the game reads
// while the player is moving, so they must never be swallowed by a modal.
const heldKeys = ['Space', 'KeyJ', 'ShiftLeft', 'ShiftRight'];
// The four keys that stay reachable while a dialog is open.
const alwaysAvailable = ['KeyB', 'KeyC', 'KeyM', 'KeyO'];
export class Input {
  constructor({ active, action, point, place, resetPoint }) {
    this.keys = new Set();
    this.stick = { x: 0, y: 0 };
    this.touchInteract = false;
    this.touchAttack = false;
    this.active = active;
    window.addEventListener('keydown', (event) => {
      if (
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)
      )
        return;
      if (event.code === 'Escape') {
        event.preventDefault();
        if (!event.repeat) action('escape');
        return;
      }
      if (!active()) {
        // Bags, crafting, sound and settings stay reachable while paused.
        if (alwaysAvailable.includes(event.code) && !event.repeat) action(actions[event.code]);
        return;
      }
      if (
        movementCodes.includes(event.code) ||
        event.code === 'KeyE' ||
        heldKeys.includes(event.code)
      ) {
        event.preventDefault();
        this.keys.add(event.code);
        if (movementCodes.includes(event.code)) resetPoint();
        if (event.code === 'KeyE' && !event.repeat) action('interact');
        // A tap attacks immediately; holding it keeps attacking on cooldown.
        if ((event.code === 'Space' || event.code === 'KeyJ') && !event.repeat) action('attack');
      } else if (actions[event.code] || event.code === 'Tab') {
        event.preventDefault();
        if (!event.repeat) action(actions[event.code] || 'bag');
      }
    });
    window.addEventListener('keyup', (event) => this.keys.delete(event.code));
    window.addEventListener('blur', () => this.clear());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.clear();
    });
    const canvas = document.getElementById('gameCanvas');
    canvas.addEventListener('pointermove', (event) => {
      if (active() && event.pointerType === 'mouse') point(event.clientX, event.clientY);
    });
    canvas.addEventListener('pointerdown', (event) => {
      if (active() && event.button === 0) {
        point(event.clientX, event.clientY);
        place();
      }
    });
    canvas.addEventListener('pointerleave', resetPoint);
    const joystick = document.getElementById('joystick');
    this.knob = document.getElementById('joystick-knob');
    let pointerId = null;
    const moveStick = (event) => {
      const rect = joystick.getBoundingClientRect(),
        radius = rect.width * 0.32;
      let x = event.clientX - (rect.left + rect.width / 2),
        y = event.clientY - (rect.top + rect.height / 2);
      const distance = Math.hypot(x, y);
      if (distance > radius) {
        x *= radius / distance;
        y *= radius / distance;
      }
      this.stick = distance < 7 ? { x: 0, y: 0 } : { x: x / radius, y: y / radius };
      this.knob.style.transform = `translate(${x}px, ${y}px)`;
      resetPoint();
    };
    joystick.addEventListener('pointerdown', (event) => {
      if (!active() || pointerId !== null) return;
      event.preventDefault();
      pointerId = event.pointerId;
      joystick.setPointerCapture(event.pointerId);
      moveStick(event);
    });
    joystick.addEventListener('pointermove', (event) => {
      if (pointerId === event.pointerId && active()) moveStick(event);
    });
    const release = (event) => {
      if (event.pointerId === pointerId) {
        pointerId = null;
        this.stick = { x: 0, y: 0 };
        this.knob.style.transform = '';
      }
    };
    joystick.addEventListener('pointerup', release);
    joystick.addEventListener('pointercancel', release);
    joystick.addEventListener('lostpointercapture', release);
    this.releaseStick = () => {
      if (pointerId !== null && joystick.hasPointerCapture(pointerId))
        joystick.releasePointerCapture(pointerId);
      pointerId = null;
    };
    const interact = document.getElementById('touch-interact');
    interact.addEventListener('pointerdown', (event) => {
      if (!active()) return;
      event.preventDefault();
      interact.setPointerCapture(event.pointerId);
      this.touchInteract = true;
      action('interact');
    });
    interact.addEventListener('click', (event) => {
      if (event.detail === 0 && active()) action('interact');
    });
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture'])
      interact.addEventListener(event, () => {
        this.touchInteract = false;
      });
    document.getElementById('touch-eat').addEventListener('click', () => action('eat'));
    const attackButton = document.getElementById('touch-attack');
    attackButton?.addEventListener('pointerdown', (event) => {
      if (!active()) return;
      event.preventDefault();
      attackButton.setPointerCapture(event.pointerId);
      this.touchAttack = true;
      action('attack');
    });
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture'])
      attackButton?.addEventListener(event, () => {
        this.touchAttack = false;
      });
    document.getElementById('touch-dodge')?.addEventListener('click', () => action('dodge'));
  }
  movement() {
    const has = (...codes) => (codes.some((code) => this.keys.has(code)) ? 1 : 0);
    return {
      x: has('KeyD', 'ArrowRight') - has('KeyA', 'ArrowLeft') + this.stick.x,
      y: has('KeyS', 'ArrowDown') - has('KeyW', 'ArrowUp') + this.stick.y,
    };
  }
  get interacting() {
    return this.keys.has('KeyE') || this.touchInteract;
  }
  /** Held attack input: the loop re-attacks whenever the weapon is ready. */
  get attacking() {
    return this.keys.has('Space') || this.keys.has('KeyJ') || this.touchAttack;
  }
  /** Walking is always free; only sprinting, dodging and fighting cost stamina. */
  get sprinting() {
    return (
      this.keys.has('ShiftLeft') ||
      this.keys.has('ShiftRight') ||
      Math.hypot(this.stick.x, this.stick.y) > 0.92
    );
  }
  clear() {
    this.releaseStick?.();
    this.keys.clear();
    this.stick = { x: 0, y: 0 };
    this.touchInteract = false;
    this.touchAttack = false;
    if (this.knob) this.knob.style.transform = '';
  }
}
