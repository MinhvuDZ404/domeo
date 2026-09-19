export class Sound {
  constructor() {
    this.enabled = false;
    this.context = null;
  }
  unlock() {
    if (!this.enabled) return;
    try {
      this.context ??= new (window.AudioContext || window.webkitAudioContext)();
      if (this.context.state === 'suspended') this.context.resume().catch(() => {});
    } catch {
      this.enabled = false;
    }
  }
  toggle() {
    this.enabled = !this.enabled;
    this.unlock();
    return this.enabled;
  }
  play(type) {
    if (!this.enabled || !this.context || this.context.state !== 'running') return;
    const notes = {
      gather: [420, 570],
      craft: [392, 494, 587],
      build: [294, 392, 494],
      eat: [500, 650],
      death: [280, 220, 160],
    }[type];
    if (!notes) return;
    const context = this.context;
    notes.forEach((frequency, i) => {
      const oscillator = context.createOscillator(),
        gain = context.createGain();
      const start = context.currentTime + i * 0.085;
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.045, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.18);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    });
  }
}
