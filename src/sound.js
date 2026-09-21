// All audio is synthesised in the browser: no external files, no licences to
// track, and the game keeps working when an AudioContext is unavailable.
const NOTES = {
  gather: [420, 570],
  craft: [392, 494, 587],
  build: [294, 392, 494],
  eat: [500, 650],
  deny: [220, 165],
  death: [280, 220, 160],
  discovery: [523, 659, 784, 1047],
  message: [660],
};
const CHIRPS = [
  [1180, 1520],
  [1320, 990, 1240],
  [880, 1170],
];
// Per-type cooldowns keep repeated actions (gather spam, footsteps) musical.
const COOLDOWNS = {
  gather: 90,
  step: 200,
  eat: 120,
  craft: 120,
  build: 150,
  deny: 200,
  discovery: 500,
  message: 0,
};

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
    this.rainNodes = null;
    this.chirpTimer = null;
    this.cricketTimer = null;
    this.crackleTimer = null;
    this.fireLevel = 0;
    this.weather = 'clear';
    this.lastPlay = new Map();
    this.noiseBuffer = null;
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
      this.applyWeatherNodes();
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
    if (this.enabled && this.ambient && !this.hidden) {
      if (night) {
        this.clearChirp();
        this.scheduleCricket();
      } else {
        this.clearCricket();
        this.scheduleChirp();
      }
    }
  }
  setWeather(type = 'clear', intensity = 0) {
    const next = type ?? 'clear';
    if (this.weather === next && Math.abs((this.weatherIntensity ?? 0) - intensity) < 0.05) return;
    this.weather = next;
    this.weatherIntensity = intensity;
    this.applyWeatherNodes();
  }
  setFire(level = 0) {
    const clamped = Math.min(1, Math.max(0, Number(level) || 0));
    this.fireLevel = clamped;
    if (clamped > 0.02 && this.enabled && !this.hidden) this.scheduleCrackle();
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
    if (this.noiseBuffer) return this.noiseBuffer;
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
    this.noiseBuffer = buffer;
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
      if (this.night) this.scheduleCricket();
      else this.scheduleChirp();
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
  applyWeatherNodes() {
    if (!this.context || !this.master) return;
    const wantRain = this.weather === 'rain' && (this.weatherIntensity ?? 0) > 0.05;
    if (!wantRain || !this.enabled || this.hidden || this.context.state !== 'running') {
      this.stopRain();
      return;
    }
    if (this.rainNodes) {
      try {
        this.rainNodes.gain.gain.setTargetAtTime(
          0.16 * (this.weatherIntensity ?? 0.5),
          this.context.currentTime,
          1.2,
        );
      } catch {}
      return;
    }
    try {
      const noise = this.context.createBufferSource();
      noise.buffer = this.buildNoiseBuffer();
      noise.loop = true;
      noise.playbackRate.value = 1.4;
      const filter = this.context.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 2400;
      filter.Q.value = 0.4;
      const gain = this.context.createGain();
      gain.gain.value = 0;
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      noise.start();
      gain.gain.setTargetAtTime(
        0.16 * (this.weatherIntensity ?? 0.5),
        this.context.currentTime,
        1.5,
      );
      this.rainNodes = { sources: [noise], extra: [filter, gain], gain };
    } catch {
      this.rainNodes = null;
    }
  }
  stopRain() {
    const node = this.rainNodes;
    if (!node) return;
    this.rainNodes = null;
    for (const source of node.sources) {
      try {
        source.stop();
        source.disconnect();
      } catch {}
    }
    for (const part of [node.gain, ...node.extra]) part?.disconnect?.();
  }
  clearChirp() {
    if (this.chirpTimer) {
      clearTimeout(this.chirpTimer);
      this.chirpTimer = null;
    }
  }
  clearCricket() {
    if (this.cricketTimer) {
      clearTimeout(this.cricketTimer);
      this.cricketTimer = null;
    }
  }
  clearCrackle() {
    if (this.crackleTimer) {
      clearTimeout(this.crackleTimer);
      this.crackleTimer = null;
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
  scheduleCricket() {
    if (this.cricketTimer || !this.night) return;
    this.cricketTimer = setTimeout(
      () => {
        this.cricketTimer = null;
        if (!this.enabled || !this.ambient || this.hidden || !this.night || !this.context) return;
        if (this.context.state === 'running') {
          const base = 3800 + Math.random() * 800;
          for (let i = 0; i < 3; i++) this.blip(base, i * 0.09, 0.028, 0.12);
        }
        this.scheduleCricket();
      },
      2200 + Math.random() * 2600,
    );
  }
  scheduleCrackle() {
    if (this.crackleTimer || this.fireLevel <= 0.02) return;
    this.crackleTimer = setTimeout(
      () => {
        this.crackleTimer = null;
        if (!this.enabled || this.hidden || !this.context || this.fireLevel <= 0.02) return;
        if (this.context.state === 'running') {
          // A short filtered pop; pitch and timing stay slightly irregular.
          const freq = 900 + Math.random() * 2200;
          this.blip(freq, 0, 0.05 * this.fireLevel + 0.012, 0.09);
          if (Math.random() < 0.3 * this.fireLevel)
            this.blip(freq * 0.5, 0.05, 0.03 * this.fireLevel, 0.12);
        }
        this.scheduleCrackle();
      },
      180 + Math.random() * 700 * (1.2 - this.fireLevel),
    );
  }
  blip(frequency, delay, gainLevel, duration) {
    try {
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
    } catch {}
  }
  footstep(surface = 'woodland') {
    if (!this.context || !this.master || this.context.state !== 'running') return;
    try {
      const context = this.context;
      const oscillator = context.createOscillator(),
        gain = context.createGain();
      const rocky = surface === 'rocky';
      const base = rocky ? 190 + Math.random() * 40 : 120 + Math.random() * 30;
      const start = context.currentTime;
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(base, start);
      oscillator.frequency.exponentialRampToValueAtTime(base * 0.6, start + 0.08);
      gain.gain.setValueAtTime(rocky ? 0.075 : 0.055, start);
      gain.gain.exponentialRampToValueAtTime(0.0008, start + 0.1);
      oscillator.connect(gain);
      gain.connect(this.master);
      oscillator.start(start);
      oscillator.stop(start + 0.12);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    } catch {}
  }
  play(type, data = {}) {
    if (!this.enabled || !this.context || !this.master || this.context.state !== 'running') return;
    const now = performance.now();
    const cooldown = COOLDOWNS[type] ?? 60;
    if (cooldown > 0 && now - (this.lastPlay.get(type) ?? -1e9) < cooldown) return;
    this.lastPlay.set(type, now);
    if (type === 'step') {
      this.footstep(data.surface);
      return;
    }
    if (type === 'gather' && data.item === 'crystal') {
      [880, 1174, 1568].forEach((frequency, i) => this.blip(frequency, i * 0.07, 0.04, 0.2));
      return;
    }
    const notes = NOTES[type];
    if (!notes) return;
    if (type === 'message') return; // Toasts stay silent; discoveries have their own chime.
    const step = type === 'deny' ? 0.05 : type === 'discovery' ? 0.11 : 0.085;
    const gain = type === 'discovery' ? 0.06 : 0.045;
    notes.forEach((frequency, i) => {
      // Slight humanisation so repeated actions never sound identical.
      const varied = frequency * (1 + (Math.random() - 0.5) * 0.03);
      this.blip(varied, i * step, gain, type === 'discovery' ? 0.32 : 0.18);
    });
  }
  stopAmbient() {
    this.clearChirp();
    this.clearCricket();
    this.clearCrackle();
    this.stopRain();
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
