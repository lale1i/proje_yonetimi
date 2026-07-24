/**
 * Soft metallic chimes for string cloth interaction.
 * Country-tuned timbres (synthesized — no sample files):
 *  - China  → deep bronze temple / bianzhong-like bells
 *  - Japan  → bright glass furin (風鈴) wind chimes
 *  - Vietnam → warm mid bronze, soft temple-bell body
 *  - Kazakhstan → open steppe metal / temir-komuz twang
 *  - Russia → deeper church / kolokol bells
 *  - France → bright café / carillon sparkle
 *  - India → warm temple bronze / ghanta body
 *  - UK → soft handbell / village peal
 *  - Norway → clear cold glass / icy partials
 *  - Italy → warm mid bronze / campanile ring
 *  - USA → bright porch / handbell sparkle
 *  - Brazil → warm mid bronze / festa ring
 *  - Iran → deep courtyard / metallic windcatcher hum
 */

/** @typedef {{ freqs: number[], partials: { ratio: number, gain: number }[], duration: number, attack: number, peak: number, droop: number, noiseDur: number, noiseGain: number, noiseQ: number, noiseMul: number, shelfHz: number, shelfGain: number, minIntervalMs: number }} ChimeProfile */

/** @type {Record<string, ChimeProfile>} */
export const COUNTRY_CHIMES = {
  china: {
    freqs: [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25],
    partials: [
      { ratio: 1.0, gain: 0.62 },
      { ratio: 1.5, gain: 0.12 },
      { ratio: 2.0, gain: 0.2 },
      { ratio: 2.76, gain: 0.22 },
      { ratio: 4.07, gain: 0.06 }
    ],
    duration: 1.45,
    attack: 0.018,
    peak: 0.2,
    droop: 0.988,
    noiseDur: 0.05,
    noiseGain: 0.06,
    noiseQ: 2.5,
    noiseMul: 1.6,
    shelfHz: 1200,
    shelfGain: 1,
    minIntervalMs: 70
  },
  japan: {
    freqs: [659.25, 783.99, 880.0, 987.77, 1046.5, 1174.7, 1318.5, 1568.0],
    partials: [
      { ratio: 1.0, gain: 0.45 },
      { ratio: 2.0, gain: 0.28 },
      { ratio: 3.01, gain: 0.18 },
      { ratio: 4.2, gain: 0.1 },
      { ratio: 6.7, gain: 0.05 }
    ],
    duration: 0.85,
    attack: 0.004,
    peak: 0.16,
    droop: 0.996,
    noiseDur: 0.025,
    noiseGain: 0.12,
    noiseQ: 8,
    noiseMul: 3.4,
    shelfHz: 2800,
    shelfGain: 6,
    minIntervalMs: 42
  }
};

const FALLBACK = COUNTRY_CHIMES.china;

export class StringChimes {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.shelf = null;
    this.enabled = true;
    this.volume = 0.28;
    this.countryId = "china";
    this.profile = FALLBACK;
    this.lastStrikeAt = 0;
    this.activeVoices = 0;
    this.maxVoices = 10;
    this.lastParticleId = -1;
    this.prevX = 0;
    this.prevY = 0;
  }

  setCountry(id) {
    this.countryId = id;
    this.profile = COUNTRY_CHIMES[id] || FALLBACK;
    this.lastParticleId = -1;
    if (this.shelf) {
      this.shelf.frequency.value = this.profile.shelfHz;
      this.shelf.gain.value = this.profile.shelfGain;
    }
  }

  async ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;

      this.shelf = this.ctx.createBiquadFilter();
      this.shelf.type = "highshelf";
      this.shelf.frequency.value = this.profile.shelfHz;
      this.shelf.gain.value = this.profile.shelfGain;

      this.master.connect(this.shelf);
      this.shelf.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") {
      try {
        await this.ctx.resume();
      } catch (_) {
        return false;
      }
    }
    return true;
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master) this.master.gain.value = this.volume;
  }

  /**
   * @param {{ x: number, y: number, particle?: { id: number }, gridW?: number, intensity?: number, force?: boolean }} opts
   */
  async strike(opts = {}) {
    if (!this.enabled) return;
    const ok = await this.ensure();
    if (!ok || !this.ctx) return;

    const profile = this.profile;
    const now = performance.now();
    const force = !!opts.force;
    if (!force && now - this.lastStrikeAt < profile.minIntervalMs) return;
    if (this.activeVoices >= this.maxVoices) return;

    const particle = opts.particle;
    if (particle && particle.id === this.lastParticleId && !force) return;

    const dx = (opts.x ?? 0) - this.prevX;
    const dy = (opts.y ?? 0) - this.prevY;
    const speed = Math.hypot(dx, dy);
    this.prevX = opts.x ?? this.prevX;
    this.prevY = opts.y ?? this.prevY;

    let intensity = opts.intensity;
    if (intensity == null) {
      intensity = Math.min(1, 0.25 + speed / 40);
    }
    if (!force && intensity < 0.2 && speed < 1.5) return;

    this.lastStrikeAt = now;
    if (particle) this.lastParticleId = particle.id;

    const freqs = profile.freqs;
    const pitchT =
      particle && opts.gridW > 1
        ? (particle.id % opts.gridW) / (opts.gridW - 1)
        : Math.random();
    const idx = Math.min(
      freqs.length - 1,
      Math.max(
        0,
        Math.round(pitchT * (freqs.length - 1) + (Math.random() - 0.5))
      )
    );
    const freq = freqs[idx] * (0.985 + Math.random() * 0.03);

    this.#playBell(freq, intensity, profile);
  }

  #playBell(freq, intensity, profile) {
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const duration = profile.duration * (0.75 + intensity * 0.5);

    const voice = ctx.createGain();
    const peak = profile.peak * (0.55 + intensity * 0.7);
    voice.gain.setValueAtTime(0.0001, t);
    voice.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + profile.attack);
    voice.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    voice.connect(this.master);

    this.activeVoices += 1;
    window.setTimeout(() => {
      this.activeVoices = Math.max(0, this.activeVoices - 1);
    }, (duration + 0.05) * 1000);

    for (const { ratio, gain } of profile.partials) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      const f0 = freq * ratio;
      osc.frequency.setValueAtTime(f0, t);
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(20, f0 * profile.droop),
        t + duration
      );
      g.gain.value = gain;
      osc.connect(g);
      g.connect(voice);
      osc.start(t);
      osc.stop(t + duration + 0.02);
    }

    const noiseDur = profile.noiseDur;
    const buffer = ctx.createBuffer(
      1,
      Math.max(1, Math.floor(ctx.sampleRate * noiseDur)),
      ctx.sampleRate
    );
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.value = freq * profile.noiseMul;
    noiseFilter.Q.value = profile.noiseQ;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(
      Math.max(0.0001, profile.noiseGain * intensity),
      t
    );
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + noiseDur);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(voice);
    noise.start(t);
    noise.stop(t + noiseDur + 0.01);
  }
}

export const chimes = new StringChimes();
