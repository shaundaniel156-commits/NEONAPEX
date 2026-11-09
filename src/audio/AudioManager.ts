/**
 * Centralised Web Audio manager.
 *
 *  - Buses: master -> dialogue / music / ambient / sfx.
 *  - Sound effects are synthesised procedurally (no samples, no AI services).
 *  - Ambient beds (room tone, street, market, rain, night) are generated noise
 *    networks that cross-fade when scenes change.
 *  - Music is a small procedural sequencer (pad + pluck + bass) with a mood per scene.
 *  - Any legally obtained audio can be dropped into public/audio and listed in
 *    public/audio/manifest.json to replace the generated music/ambience/dialogue.
 */
import { hash } from '../core/MathUtils';

export type SfxName =
  | 'footstep' | 'keypress' | 'phone_buzz' | 'door' | 'thunder' | 'laptop_crash' | 'click'
  | 'notification' | 'coin' | 'whoosh' | 'boda' | 'horn' | 'chair' | 'paper' | 'sigh' | 'cheer' | 'success' | 'power_cut';
export type AmbientName = 'home' | 'street' | 'market' | 'rain' | 'night';
export type MusicMood = 'warm' | 'hopeful' | 'tender' | 'tense' | 'sad' | 'resolve' | 'triumph';

interface Manifest {
  dialogue?: Record<string, string>;
  music?: Partial<Record<MusicMood, string>>;
  ambient?: Partial<Record<AmbientName, string>>;
}

interface Bed {
  gain: GainNode;
  nodes: AudioNode[];
  stop: () => void;
}

const MOODS: Record<MusicMood, { bpm: number; root: number; chords: number[][]; pluck: boolean; bass: boolean; cutoff: number; pad: number; pluckGain: number }> = {
  // chords as semitone offsets from the root (triads / 7ths)
  warm: { bpm: 76, root: 57 /* A3 */, chords: [[0, 4, 7, 11], [5, 9, 12, 16], [7, 11, 14, 17], [2, 5, 9, 12]], pluck: true, bass: true, cutoff: 1400, pad: 0.16, pluckGain: 0.12 },
  hopeful: { bpm: 96, root: 60, chords: [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]], pluck: true, bass: true, cutoff: 2200, pad: 0.14, pluckGain: 0.16 },
  tender: { bpm: 66, root: 55, chords: [[0, 4, 7, 11], [9, 12, 16, 19], [5, 9, 12, 16], [7, 11, 14, 17]], pluck: true, bass: false, cutoff: 1100, pad: 0.18, pluckGain: 0.08 },
  tense: { bpm: 84, root: 50, chords: [[0, 3, 7], [0, 3, 7, 10], [-2, 1, 5], [-1, 2, 6]], pluck: false, bass: true, cutoff: 700, pad: 0.17, pluckGain: 0 },
  sad: { bpm: 58, root: 52, chords: [[0, 3, 7], [8, 12, 15], [5, 8, 12], [3, 7, 10]], pluck: true, bass: true, cutoff: 900, pad: 0.2, pluckGain: 0.07 },
  resolve: { bpm: 104, root: 55, chords: [[0, 3, 7], [8, 12, 15], [10, 14, 17], [0, 3, 7]], pluck: true, bass: true, cutoff: 1800, pad: 0.15, pluckGain: 0.14 },
  triumph: { bpm: 108, root: 60, chords: [[0, 4, 7, 11], [5, 9, 12], [7, 11, 14], [9, 12, 16]], pluck: true, bass: true, cutoff: 2600, pad: 0.16, pluckGain: 0.18 },
};

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

export class AudioManager {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private bus!: Record<'dialogue' | 'music' | 'ambient' | 'sfx', GainNode>;
  private volume = 0.9;
  private muted = false;
  private manifest: Manifest = {};
  private buffers = new Map<string, AudioBuffer>();
  private noiseBuffer: AudioBuffer | null = null;

  // ambient
  private ambientName: AmbientName | null = null;
  private ambientRequested: AmbientName | null = null;
  private bed: Bed | null = null;

  // music
  private mood: MusicMood | null = null;
  private moodRequested: MusicMood | null = null;
  private musicVolumeRequested = 1;
  private musicGain: GainNode | null = null;
  private padFilter: BiquadFilterNode | null = null;
  private padOsc: { osc: OscillatorNode; gain: GainNode }[] = [];
  private musicStart = 0;
  private nextBeat = 0;
  private bufferMusic: AudioBufferSourceNode | null = null;
  private lastSfx = new Map<string, number>();

  get ready(): boolean {
    return !!this.ctx;
  }

  /** Must be called from a user gesture (autoplay policy). */
  async init(): Promise<void> {
    if (this.ctx) {
      if (this.ctx.state !== 'running') await this.ctx.resume();
      return;
    }
    const ctx = new AudioContext();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(ctx.destination);
    this.bus = {
      dialogue: ctx.createGain(),
      music: ctx.createGain(),
      ambient: ctx.createGain(),
      sfx: ctx.createGain(),
    };
    this.bus.music.gain.value = 0.55;
    this.bus.ambient.gain.value = 0.5;
    this.bus.sfx.gain.value = 0.8;
    for (const b of Object.values(this.bus)) b.connect(this.master);
    // 4 s of white noise reused by every generator
    const len = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buf;
    if (ctx.state !== 'running') await ctx.resume();
    await this.loadManifest();
  }

  private async loadManifest(): Promise<void> {
    try {
      const res = await fetch('audio/manifest.json', { cache: 'no-cache' });
      if (res.ok) this.manifest = (await res.json()) as Manifest;
    } catch {
      this.manifest = {};
    }
  }

  /** Load (and cache) an audio file from public/audio. */
  async loadBuffer(url: string): Promise<AudioBuffer | null> {
    if (!this.ctx) return null;
    if (this.buffers.has(url)) return this.buffers.get(url)!;
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.arrayBuffer();
      const buf = await this.ctx.decodeAudioData(data);
      this.buffers.set(url, buf);
      return buf;
    } catch {
      return null;
    }
  }

  /** Recorded dialogue file for a line id, if listed in the manifest. */
  dialogueFile(lineId: string): string | null {
    const f = this.manifest.dialogue?.[lineId];
    return f ? `audio/dialogue/${f}` : null;
  }

  /** Play a decoded buffer on a bus. Returns the source so it can be stopped. */
  playBuffer(buf: AudioBuffer, bus: keyof AudioManager['bus'], volume = 1, offset = 0): AudioBufferSourceNode | null {
    if (!this.ctx) return null;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = volume;
    src.connect(g).connect(this.bus[bus]);
    src.start(0, Math.max(0, offset));
    return src;
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx!.currentTime, 0.05);
  }
  getVolume(): number {
    return this.volume;
  }
  setMuted(m: boolean): void {
    this.muted = m;
    this.setVolume(this.volume);
  }

  /** Pause / resume everything (used by the timeline). */
  async suspend(): Promise<void> {
    if (this.ctx && this.ctx.state === 'running') await this.ctx.suspend();
  }
  async resume(): Promise<void> {
    if (this.ctx && this.ctx.state === 'suspended') await this.ctx.resume();
  }

  /* ------------------------------------------------------------- sfx --- */

  play(name: SfxName, opts: { volume?: number; pitch?: number } = {}): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    // rate-limit identical sfx so seeks / dense events don't stack
    const now = ctx.currentTime;
    if ((this.lastSfx.get(name) ?? -1) > now - 0.04) return;
    this.lastSfx.set(name, now);
    const vol = opts.volume ?? 0.6;
    const pitch = opts.pitch ?? 1;
    const out = this.bus.sfx;
    const env = (g: GainNode, a: number, d: number, peak = 1, t0 = now) => {
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(peak, t0 + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
    };
    const noise = (dur: number, filter: BiquadFilterType, freq: number, q = 1, gainPeak = 1, t0 = now) => {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      src.playbackRate.value = pitch;
      const f = ctx.createBiquadFilter();
      f.type = filter;
      f.frequency.value = freq;
      f.Q.value = q;
      const g = ctx.createGain();
      env(g, 0.005, dur, gainPeak * vol, t0);
      src.connect(f).connect(g).connect(out);
      src.start(t0, Math.random() * 3);
      src.stop(t0 + dur + 0.1);
      return g;
    };
    const tone = (type: OscillatorType, freq: number, dur: number, peak = 0.4, t0 = now, slideTo?: number) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(freq * pitch, t0);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo * pitch, t0 + dur);
      const g = ctx.createGain();
      env(g, 0.005, dur, peak * vol, t0);
      o.connect(g).connect(out);
      o.start(t0);
      o.stop(t0 + dur + 0.1);
    };
    switch (name) {
      case 'footstep':
        noise(0.09, 'lowpass', 500, 0.8, 0.9);
        noise(0.04, 'bandpass', 1800, 2, 0.25);
        break;
      case 'keypress':
        noise(0.03, 'highpass', 2500, 1, 0.5);
        tone('square', 1800 + Math.random() * 600, 0.02, 0.05);
        break;
      case 'click':
        noise(0.03, 'bandpass', 3000, 3, 0.6);
        break;
      case 'phone_buzz':
        for (let i = 0; i < 3; i++) {
          const t0 = now + i * 0.35;
          tone('sawtooth', 110, 0.22, 0.12, t0);
          noise(0.22, 'bandpass', 220, 4, 0.3, t0);
        }
        break;
      case 'notification':
        tone('sine', 880, 0.12, 0.3);
        tone('sine', 1320, 0.25, 0.25, now + 0.12);
        break;
      case 'success':
        [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, 0.35, 0.22, now + i * 0.11));
        break;
      case 'door':
        noise(0.15, 'lowpass', 300, 1, 1.0);
        tone('sine', 80, 0.25, 0.4);
        noise(0.05, 'bandpass', 2500, 2, 0.3, now + 0.12);
        break;
      case 'chair':
        noise(0.3, 'lowpass', 400, 1, 0.6);
        break;
      case 'paper':
        noise(0.25, 'highpass', 1200, 0.7, 0.35);
        break;
      case 'thunder': {
        const g = noise(2.6, 'lowpass', 180, 0.5, 1.4);
        g.gain.setValueAtTime(0.001, now);
        g.gain.linearRampToValueAtTime(vol * 1.4, now + 0.25);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);
        noise(1.2, 'lowpass', 600, 0.5, 0.5, now + 0.1);
        break;
      }
      case 'laptop_crash':
        tone('sawtooth', 220, 0.5, 0.2, now, 40);
        noise(0.4, 'lowpass', 900, 1, 0.5, now + 0.05);
        tone('square', 160, 0.08, 0.15, now + 0.5);
        tone('square', 160, 0.08, 0.15, now + 0.7);
        break;
      case 'power_cut':
        tone('sine', 120, 0.8, 0.3, now, 30);
        noise(0.15, 'bandpass', 2000, 2, 0.4);
        break;
      case 'coin':
        tone('sine', 2200, 0.15, 0.2);
        tone('sine', 2900, 0.3, 0.15, now + 0.05);
        break;
      case 'whoosh': {
        const g = noise(0.5, 'bandpass', 800, 0.7, 0.6);
        g.gain.linearRampToValueAtTime(vol * 0.6, now + 0.2);
        break;
      }
      case 'boda':
        for (let i = 0; i < 24; i++) tone('sawtooth', 70 + i * 4, 0.12, 0.06, now + i * 0.06);
        noise(1.5, 'bandpass', 500, 1, 0.3);
        break;
      case 'horn':
        tone('square', 420, 0.35, 0.12);
        tone('square', 530, 0.35, 0.12);
        break;
      case 'sigh':
        noise(0.7, 'bandpass', 900, 0.8, 0.25);
        break;
      case 'cheer':
        for (let i = 0; i < 6; i++) noise(0.6 + Math.random() * 0.4, 'bandpass', 600 + Math.random() * 900, 1.5, 0.3, now + Math.random() * 0.3);
        break;
    }
  }

  /* --------------------------------------------------------- ambience --- */

  requestAmbient(name: AmbientName | null): void {
    this.ambientRequested = name;
  }
  requestMusic(mood: MusicMood | null, volume = 1): void {
    this.moodRequested = mood;
    this.musicVolumeRequested = volume;
  }

  private makeNoiseSource(rate = 1): AudioBufferSourceNode {
    const src = this.ctx!.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    src.playbackRate.value = rate;
    src.start(0, Math.random() * 3);
    return src;
  }

  private buildBed(name: AmbientName): Bed {
    const ctx = this.ctx!;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(this.bus.ambient);
    const nodes: AudioNode[] = [];
    const stops: (() => void)[] = [];
    const chain = (src: AudioNode, ...rest: AudioNode[]) => {
      let n = src;
      for (const r of rest) {
        n.connect(r);
        n = r;
      }
      n.connect(gain);
      nodes.push(src, ...rest);
    };
    const lfo = (target: AudioParam, freq: number, depth: number, base: number) => {
      const o = ctx.createOscillator();
      o.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = depth;
      target.value = base;
      o.connect(g).connect(target);
      o.start();
      stops.push(() => o.stop());
      nodes.push(o, g);
    };
    const filt = (type: BiquadFilterType, f: number, q = 1) => {
      const b = ctx.createBiquadFilter();
      b.type = type;
      b.frequency.value = f;
      b.Q.value = q;
      return b;
    };
    const g = (v: number) => {
      const n = ctx.createGain();
      n.gain.value = v;
      return n;
    };
    switch (name) {
      case 'home': {
        const n = this.makeNoiseSource(0.5);
        chain(n, filt('lowpass', 260), g(0.12));
        stops.push(() => n.stop());
        break;
      }
      case 'street': {
        const n = this.makeNoiseSource(0.8);
        const gg = g(0.22);
        lfo(gg.gain, 0.13, 0.06, 0.22);
        chain(n, filt('bandpass', 700, 0.6), gg);
        stops.push(() => n.stop());
        const eng = ctx.createOscillator();
        eng.type = 'sawtooth';
        const eg = g(0.05);
        lfo(eng.frequency, 0.21, 12, 78);
        chain(eng, filt('lowpass', 220), eg);
        eng.start();
        stops.push(() => eng.stop());
        break;
      }
      case 'market': {
        const n = this.makeNoiseSource(1);
        const gg = g(0.2);
        lfo(gg.gain, 0.37, 0.08, 0.2);
        chain(n, filt('bandpass', 1100, 0.8), gg);
        const n2 = this.makeNoiseSource(0.6);
        const g2 = g(0.1);
        lfo(g2.gain, 0.9, 0.06, 0.1);
        chain(n2, filt('bandpass', 400, 1.2), g2);
        stops.push(() => n.stop(), () => n2.stop());
        break;
      }
      case 'rain':
      case 'night': {
        const n = this.makeNoiseSource(1);
        const gg = g(0.3);
        lfo(gg.gain, 0.08, 0.05, 0.3);
        chain(n, filt('highpass', 1200), filt('lowpass', 7000), gg);
        const n2 = this.makeNoiseSource(0.4);
        chain(n2, filt('lowpass', 150), g(0.25));
        stops.push(() => n.stop(), () => n2.stop());
        if (name === 'night') {
          const cr = ctx.createOscillator();
          cr.frequency.value = 4200;
          const cg = g(0);
          lfo(cg.gain, 19, 0.012, 0.012);
          chain(cr, cg);
          cr.start();
          stops.push(() => cr.stop());
        }
        break;
      }
    }
    return { gain, nodes, stop: () => stops.forEach((s) => s()) };
  }

  private switchAmbient(name: AmbientName | null): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (this.bed) {
      const old = this.bed;
      old.gain.gain.setTargetAtTime(0, t, 0.6);
      setTimeout(() => {
        old.stop();
        old.nodes.forEach((n) => n.disconnect());
        old.gain.disconnect();
      }, 2500);
      this.bed = null;
    }
    this.ambientName = name;
    if (!name) return;
    const file = this.manifest.ambient?.[name];
    if (file) {
      const bed: Bed = { gain: this.ctx.createGain(), nodes: [], stop: () => {} };
      bed.gain.gain.value = 0;
      bed.gain.connect(this.bus.ambient);
      this.bed = bed;
      this.loadBuffer(`audio/effects/${file}`).then((buf) => {
        if (!buf || this.bed !== bed) return;
        const src = this.ctx!.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        src.connect(bed.gain);
        src.start();
        bed.stop = () => src.stop();
        bed.nodes.push(src);
      });
      bed.gain.gain.setTargetAtTime(1, t, 0.8);
      return;
    }
    this.bed = this.buildBed(name);
    this.bed.gain.gain.setTargetAtTime(1, t, 0.8);
  }

  /* ------------------------------------------------------------ music --- */

  private stopMusic(): void {
    if (!this.ctx || !this.musicGain) return;
    const t = this.ctx.currentTime;
    const g = this.musicGain;
    const oscs = this.padOsc;
    const bufSrc = this.bufferMusic;
    g.gain.setTargetAtTime(0, t, 1.0);
    setTimeout(() => {
      oscs.forEach((o) => {
        try { o.osc.stop(); } catch { /* already stopped */ }
      });
      try { bufSrc?.stop(); } catch { /* ignore */ }
      g.disconnect();
    }, 4000);
    this.musicGain = null;
    this.padOsc = [];
    this.bufferMusic = null;
    this.mood = null;
  }

  private startMusic(mood: MusicMood): void {
    const ctx = this.ctx!;
    this.stopMusic();
    this.mood = mood;
    const m = MOODS[mood];
    const g = ctx.createGain();
    g.gain.value = 0;
    g.connect(this.bus.music);
    this.musicGain = g;
    const t = ctx.currentTime;
    g.gain.setTargetAtTime(this.musicVolumeRequested, t, 1.5);
    const file = this.manifest.music?.[mood];
    if (file) {
      this.loadBuffer(`audio/music/${file}`).then((buf) => {
        if (!buf || this.musicGain !== g) return;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        src.connect(g);
        src.start();
        this.bufferMusic = src;
      });
      return;
    }
    // pad: 2 detuned triangle oscillators per chord note through a low-pass filter
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = m.cutoff;
    filter.Q.value = 0.7;
    filter.connect(g);
    this.padFilter = filter;
    this.padOsc = [];
    for (let v = 0; v < 4; v++) {
      for (const det of [-6, 6]) {
        const osc = ctx.createOscillator();
        osc.type = v % 2 ? 'triangle' : 'sawtooth';
        osc.detune.value = det;
        const og = ctx.createGain();
        og.gain.value = 0;
        osc.connect(og).connect(filter);
        osc.start();
        this.padOsc.push({ osc, gain: og });
      }
    }
    this.musicStart = t + 0.1;
    this.nextBeat = 0;
  }

  private scheduleMusic(): void {
    const ctx = this.ctx;
    if (!ctx || !this.mood || !this.musicGain || this.bufferMusic) return;
    const m = MOODS[this.mood];
    const beat = 60 / m.bpm;
    const lookahead = 0.4;
    const now = ctx.currentTime;
    while (this.musicStart + this.nextBeat * beat < now + lookahead) {
      const b = this.nextBeat;
      const tb = this.musicStart + b * beat;
      const bar = Math.floor(b / 4);
      const chord = m.chords[bar % m.chords.length];
      // pad chord change on bar boundaries
      if (b % 4 === 0) {
        chord.forEach((semi, i) => {
          const f = midi(m.root + semi);
          for (let k = 0; k < 2; k++) {
            const o = this.padOsc[i * 2 + k];
            if (!o) continue;
            o.osc.frequency.setTargetAtTime(f, tb, 0.08);
            o.gain.gain.setTargetAtTime(m.pad * (k ? 0.6 : 0.4), tb, 0.6);
          }
        });
        for (let i = chord.length; i < 4; i++) for (let k = 0; k < 2; k++) this.padOsc[i * 2 + k]?.gain.gain.setTargetAtTime(0, tb, 0.3);
        if (m.bass) {
          const o = ctx.createOscillator();
          o.type = 'sine';
          o.frequency.value = midi(m.root + chord[0] - 12);
          const og = ctx.createGain();
          og.gain.setValueAtTime(0.0001, tb);
          og.gain.linearRampToValueAtTime(0.22, tb + 0.05);
          og.gain.exponentialRampToValueAtTime(0.0001, tb + beat * 3.6);
          o.connect(og).connect(this.musicGain);
          o.start(tb);
          o.stop(tb + beat * 4);
        }
      }
      // pluck arpeggio on 8ths, pattern chosen by hash so it varies but is deterministic
      if (m.pluck) {
        for (let e = 0; e < 2; e++) {
          const te = tb + e * beat * 0.5;
          const idx = Math.floor(hash(b * 2 + e + 13) * (chord.length + 1));
          if (hash(b * 7 + e) < 0.25) continue; // rests
          const semi = idx < chord.length ? chord[idx] : chord[0] + 12;
          const f = midi(m.root + 12 + semi);
          const o = ctx.createOscillator();
          o.type = 'sine';
          o.frequency.value = f;
          const o2 = ctx.createOscillator();
          o2.type = 'triangle';
          o2.frequency.value = f * 2;
          const og = ctx.createGain();
          og.gain.setValueAtTime(0.0001, te);
          og.gain.linearRampToValueAtTime(m.pluckGain, te + 0.01);
          og.gain.exponentialRampToValueAtTime(0.0001, te + beat * 0.9);
          const og2 = ctx.createGain();
          og2.gain.value = 0.2;
          o.connect(og);
          o2.connect(og2).connect(og);
          og.connect(this.musicGain);
          o.start(te);
          o2.start(te);
          o.stop(te + beat);
          o2.stop(te + beat);
        }
      }
      this.nextBeat++;
    }
  }

  /** Called every frame by the Director. */
  update(playing: boolean): void {
    if (!this.ctx) return;
    if (this.ambientRequested !== this.ambientName) this.switchAmbient(this.ambientRequested);
    if (this.moodRequested !== this.mood) {
      if (this.moodRequested) this.startMusic(this.moodRequested);
      else this.stopMusic();
    } else if (this.musicGain) {
      this.musicGain.gain.setTargetAtTime(this.musicVolumeRequested, this.ctx.currentTime, 0.5);
    }
    // requests are re-issued every frame by active events; clear so silence is the default
    this.ambientRequested = null;
    this.moodRequested = null;
    if (playing) this.scheduleMusic();
  }
}
