/* ============================================
   SOLANA TREASURE HUNT — AudioManager
   Procedural 8-bit Sound Effects + Background Music
   ============================================ */

class AudioManager {
  constructor() {
    this.enabled = true;
    this.volume = 0.2;
    this.ctx = null;
    this._musicNodes = null;
    this._melodyInterval = null;
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();
    } catch (e) {
      console.warn("Web Audio API is not supported in this browser", e);
    }
  }

  createOsc(type, freq, duration, gainStart, gainEnd) {
    if (!this.enabled || !this.ctx) return null;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    gainNode.gain.setValueAtTime(gainStart * this.volume, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(Math.max(0.0001, gainEnd * this.volume), this.ctx.currentTime + duration);
    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);
    return { osc, gainNode };
  }

  /* ─── Procedural background music ────────── */

  startMusic() {
    if (!this.ctx || this._musicNodes) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const nodes = [];

    // --- Bass drone: sine ~130Hz, very low gain ---
    const bassOsc = this.ctx.createOscillator();
    const bassGain = this.ctx.createGain();
    bassOsc.type = 'sine';
    bassOsc.frequency.value = 130.81;
    bassGain.gain.value = 0.04 * this.volume;
    bassOsc.connect(bassGain);
    bassGain.connect(this.ctx.destination);
    bassOsc.start(now);
    nodes.push(bassOsc, bassGain);

    // --- Pad layer: root + fifth chord with tremolo ---
    const padRoot = this.ctx.createOscillator();
    const padFifth = this.ctx.createOscillator();
    const padGain = this.ctx.createGain();
    const tremoloOsc = this.ctx.createOscillator();
    const tremoloGain = this.ctx.createGain();

    padRoot.type = 'sine';
    padRoot.frequency.value = 261.63; // C4
    padFifth.type = 'sine';
    padFifth.frequency.value = 392.00; // G4

    padGain.gain.value = 0.03 * this.volume;

    // Tremolo LFO at 0.2Hz
    tremoloOsc.type = 'sine';
    tremoloOsc.frequency.value = 0.2;
    tremoloGain.gain.value = 0.012 * this.volume;

    tremoloOsc.connect(tremoloGain);
    tremoloGain.connect(padGain.gain);

    padRoot.connect(padGain);
    padFifth.connect(padGain);
    padGain.connect(this.ctx.destination);

    padRoot.start(now);
    padFifth.start(now);
    tremoloOsc.start(now);
    nodes.push(padRoot, padFifth, padGain, tremoloOsc, tremoloGain);

    // --- Melody layer: pentatonic notes every ~2s ---
    const pentatonic = [261.63, 293.66, 329.63, 392.00, 440.00]; // C4 D4 E4 G4 A4
    const scheduleMelody = () => {
      if (!this._musicNodes) return;
      const count = 3 + Math.floor(Math.random() * 5);
      for (let i = 0; i < count; i++) {
        const freq = pentatonic[Math.floor(Math.random() * pentatonic.length)];
        const startTime = this.ctx.currentTime + i * 0.45;
        const dur = 0.5 + Math.random() * 0.3;

        const melOsc = this.ctx.createOscillator();
        const melGain = this.ctx.createGain();
        melOsc.type = 'triangle';
        melOsc.frequency.value = freq;
        melGain.gain.setValueAtTime(0.0001, startTime);
        melGain.gain.linearRampToValueAtTime(0.06 * this.volume, startTime + 0.05);
        melGain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);
        melOsc.connect(melGain);
        melGain.connect(this.ctx.destination);
        melOsc.start(startTime);
        melOsc.stop(startTime + dur + 0.01);
      }
    };

    scheduleMelody();
    this._melodyInterval = setInterval(scheduleMelody, 2200);

    this._musicNodes = nodes;
  }

  stopMusic() {
    if (this._melodyInterval) {
      clearInterval(this._melodyInterval);
      this._melodyInterval = null;
    }
    if (this._musicNodes) {
      for (const node of this._musicNodes) {
        try { if (node.stop) node.stop(); } catch (_) {}
        try { node.disconnect(); } catch (_) {}
      }
      this._musicNodes = null;
    }
  }

  /* ─── Sound Effects ──────────────────────── */

  playFootstep() {
    const audio = this.createOsc('triangle', 60, 0.08, 0.5, 0.01);
    if (!audio) return;
    audio.osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.08);
    audio.osc.start();
    audio.osc.stop(this.ctx.currentTime + 0.08);
  }

  playDiscovery() {
    const now = this.ctx ? this.ctx.currentTime : 0;
    const note1 = this.createOsc('sine', 523.25, 0.15, 0.3, 0.01);
    if (note1) { note1.osc.start(); note1.osc.stop(now + 0.15); }
    setTimeout(() => {
      const note2 = this.createOsc('sine', 659.25, 0.2, 0.3, 0.01);
      if (note2) { note2.osc.start(); note2.osc.stop(this.ctx.currentTime + 0.2); }
    }, 80);
  }

  playChestOpen() {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const creak = this.createOsc('triangle', 180, 0.25, 0.4, 0.01);
    if (creak) {
      creak.osc.frequency.exponentialRampToValueAtTime(80, now + 0.25);
      creak.osc.start(); creak.osc.stop(now + 0.25);
    }
    setTimeout(() => {
      const coin = this.createOsc('sine', 987.77, 0.3, 0.5, 0.01);
      if (coin) {
        coin.osc.frequency.exponentialRampToValueAtTime(1318.51, this.ctx.currentTime + 0.15);
        coin.osc.start(); coin.osc.stop(this.ctx.currentTime + 0.3);
      }
    }, 120);
  }

  playReward(rarity) {
    if (!this.enabled || !this.ctx) return;
    if (rarity === 'legendary' || rarity === 'jackpot' || rarity === 'epic') {
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        setTimeout(() => {
          const s = this.createOsc('triangle', freq, 0.4, 0.4, 0.01);
          if (s) { s.osc.start(); s.osc.stop(this.ctx.currentTime + 0.4); }
        }, idx * 100);
      });
    } else {
      const notes = [587.33, 880.00];
      notes.forEach((freq, idx) => {
        setTimeout(() => {
          const s = this.createOsc('sine', freq, 0.25, 0.3, 0.01);
          if (s) { s.osc.start(); s.osc.stop(this.ctx.currentTime + 0.25); }
        }, idx * 80);
      });
    }
  }

  playCountdown() {
    const audio = this.createOsc('sine', 440, 0.1, 0.3, 0.01);
    if (!audio) return;
    audio.osc.start(); audio.osc.stop(this.ctx.currentTime + 0.1);
  }

  playRoundStart() {
    if (!this.enabled || !this.ctx) return;
    const notes = [261.63, 329.63, 392.00, 523.25];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        const s = this.createOsc('square', freq, 0.35, 0.25, 0.01);
        if (s) { s.osc.start(); s.osc.stop(this.ctx.currentTime + 0.35); }
      }, idx * 120);
    });
  }

  playEmpty() {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const p1 = this.createOsc('sawtooth', 220, 0.3, 0.3, 0.01);
    if (p1) {
      p1.osc.frequency.linearRampToValueAtTime(180, now + 0.3);
      p1.osc.start(); p1.osc.stop(now + 0.3);
    }
    setTimeout(() => {
      const p2 = this.createOsc('sawtooth', 180, 0.45, 0.3, 0.01);
      if (p2) {
        p2.osc.frequency.linearRampToValueAtTime(140, this.ctx.currentTime + 0.45);
        p2.osc.start(); p2.osc.stop(this.ctx.currentTime + 0.45);
      }
    }, 280);
  }

  playClick() {
    const audio = this.createOsc('sine', 600, 0.04, 0.25, 0.01);
    if (!audio) return;
    audio.osc.start(); audio.osc.stop(this.ctx.currentTime + 0.04);
  }

  toggle() {
    this.enabled = !this.enabled;
    if (!this.enabled) this.stopMusic();
    else this.startMusic();
    return this.enabled;
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
  }
}

window.AudioManager = AudioManager;
