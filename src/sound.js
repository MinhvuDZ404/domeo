// All audio is synthesised in the browser: no external files, no licences to
// track, and the game keeps working when an AudioContext is unavailable.
const NOTES = {
  gather: [420, 570],
  craft: [392, 494, 587],
  build: [294, 392, 494],
  eat: [500, 650],
  deny: [220, 165],
  death: [280, 220, 160],
};
const CHIRPS = [
  [1180, 1520],
  [1320, 990, 1240],
  [880, 1170],
];

export class Sound {
  constructor({ createContext } = {}) {
    this.enabled = false;
    this.volume = 0.7;
    this.ambient = true;
    this.night = false;
    this.hidden = false;
    this.context = null;
    this.master = null;
    this.ambientNodes = null;
    this.chirpTimer = null;
    this.createContext =
      createContext ?? (() => new (globalThis.AudioContext ?? globalThis.webkitAudioContext)());
  }
  get available() {
    return this.context !== null;
  }
  // Browsers only allow audio after a user gesture, so this runs on the first tap.
  unlock() {
    if (!this.enabled) return;
    try {
      this.context ??= this.createContext();
      this.master ??= this.buildMaster();
      if (!this.context) return;
      if (this.context.state === 'suspended') this.context.resume().catch(() => {});
      this.updateMasterGain();
      if (this.ambient) this.startAmbient();
    } catch {
      this.context = null;
      this.master = null;
      this.enabled = false;
    }
  }
  buildMaster() {
    const master = this.context.createGain();
    master.gain.value = 0;
    master.connect(this.context.destination);
    return master;
  }
  updateMasterGain() {
    if (!this.master || !this.context) return;
    const target = this.enabled && !this.hidden ? this.volume * 0.9 : 0;
    try {
      this.master.gain.setTargetAtTime(target, this.context.currentTime, 0.05);
    } catch {
      this.master.gain.value = target;
    }
  }
  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled) {
      this.unlock();
      if (this.ambient) this.startAmbient();
    } else this.stopAmbient();
    this.updateMasterGain();
    return this.enabled;
  }
  setVolume(value) {
    this.volume = Math.min(1, Math.max(0, Number(value) || 0));
    this.updateMasterGain();
  }
  setAmbient(enabled) {
    this.ambient = !!enabled;
    if (this.enabled && this.ambient) {
      this.unlock();
      this.startAmbient();
    } else this.stopAmbient();
  }
  // Ambient layers only change when the mood of the world changes.
  setNight(night) {
    if (this.night === night) return;
    this.night = night;
    if (this.ambientNodes) this.updateAmbientGain();
  }
  setHidden(hidden) {
    if (this.hidden === hidden) return;
    this.hidden = hidden;
    this.updateMasterGain();
    if (hidden) this.stopAmbient();
    else if (this.enabled) {
      // Returning to the tab may need the context resumed before it can play.
      this.unlock();
      if (this.ambient) this.startAmbient();
    }
  }
  buildNoiseBuffer() {
    const seconds = 2.5,
      rate = this.context.sampleRate,
      buffer = this.context.createBuffer(1, Math.floor(rate * seconds), rate),
      data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      // A one-pole filter turns white noise into a soft wind-like hiss.
      last = (last + (Math.random() * 2 - 1) * 0.35) * 0.97;
      data[i] = last;
    }
    return buffer;
  }
  startAmbient() {
    if (this.ambientNodes || !this.context || !this.master || this.context.state !== 'running')
      return;
    try {
      const node = { sources: [], extra: [] };
      const noise = this.context.createBufferSource();
      noise.buffer = this.buildNoiseBuffer();
      noise.loop = true;
      const filter = this.context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 340;
      const gain = this.context.createGain();
      gain.gain.value = 0;
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      const lfo = this.context.createOscillator();
      lfo.frequency.value = 0.06;
      const lfoGain = this.context.createGain();
      lfoGain.gain.value = 0.22;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      noise.start();
      lfo.start();
      node.sources.push(noise, lfo);
      node.extra.push(filter, gain, lfoGain);
      node.gain = gain;
      this.ambientNodes = node;
      this.updateAmbientGain();
      this.scheduleChirp();
    } catch {
      this.ambientNodes = null;
    }
  }
  updateAmbientGain() {
    const node = this.ambientNodes;
    if (!node?.gain || !this.context) return;
    const level = this.night ? 0.12 : 0.28;
    try {
      node.gain.gain.setTargetAtTime(level, this.context.currentTime, 1.5);
    } catch {
      node.gain.gain.value = level;
    }
  }
  scheduleChirp() {
    if (this.chirpTimer || this.night) return;
    this.chirpTimer = setTimeout(
      () => {
        this.chirpTimer = null;
        if (!this.enabled || !this.ambient || this.hidden || this.night || !this.context) return;
        if (this.context.state === 'running') {
          const notes = CHIRPS[Math.floor(Math.random() * CHIRPS.length)];
          notes.forEach((frequency, i) => this.blip(frequency, 0.05 + i * 0.11, 0.06, 0.35));
        }
        this.scheduleChirp();
      },
      6000 + Math.random() * 9000,
    );
  }
  blip(frequency, delay, gainLevel, duration) {
    const context = this.context,
      oscillator = context.createOscillator(),
      gain = context.createGain();
    const start = context.currentTime + delay;
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(gainLevel, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0008, start + duration);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }
  play(type) {
    if (!this.enabled || !this.context || !this.master || this.context.state !== 'running') return;
    const notes = NOTES[type];
    if (!notes) return;
    const step = type === 'deny' ? 0.05 : 0.085;
    notes.forEach((frequency, i) => this.blip(frequency, i * step, 0.045, 0.18));
  }
  stopAmbient() {
    if (this.chirpTimer) {
      clearTimeout(this.chirpTimer);
      this.chirpTimer = null;
    }
    const node = this.ambientNodes;
    if (!node) return;
    this.ambientNodes = null;
    for (const source of node.sources) {
      try {
        source.stop();
        source.disconnect();
      } catch {
        // Already stopped; nothing to release.
      }
    }
    for (const part of [node.gain, ...node.extra]) part?.disconnect?.();
  }
}
