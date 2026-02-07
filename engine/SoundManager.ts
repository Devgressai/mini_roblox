/**
 * SoundManager - loads and plays Place, Break, and Step with dramatic pitch variation.
 * Uses the Web Audio API (native). Optional URLs for loaded assets; falls back to procedural sounds.
 */

export type SoundType = 'Place' | 'Break' | 'Step';

export interface SoundManagerOptions {
  /** Optional URLs for each sound (e.g. { Place: '/sounds/place.mp3' }). If missing, uses procedural fallback. */
  sounds?: Partial<Record<SoundType, string>>;
  /** Pitch variation in semitones (±). e.g. 1.5 = ±1.5 semitones (100 cents each). */
  pitchVariance?: number;
  /** Master volume 0..1 */
  volume?: number;
}

export class SoundManager {
  private ctx: AudioContext | null = null;
  private buffers: Partial<Record<SoundType, AudioBuffer>> = {};
  private readonly soundUrls: Partial<Record<SoundType, string>>;
  private readonly pitchVariance: number;
  private readonly volume: number;

  constructor(options: SoundManagerOptions = {}) {
    this.soundUrls = options.sounds ?? {};
    this.pitchVariance = options.pitchVariance ?? 1.5;
    this.volume = Math.max(0, Math.min(1, options.volume ?? 0.4));
  }

  private getContext(): AudioContext | null {
    if (this.ctx?.state === 'suspended') this.ctx.resume();
    return this.ctx ?? null;
  }

  /** Call once (e.g. on first user interaction) to enable audio. */
  init(): void {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }

  /**
   * Load a sound from URL. Call before play_dramatic if using asset files.
   */
  async loadSound(soundType: SoundType, url: string): Promise<void> {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const res = await fetch(url);
      const arrayBuffer = await res.arrayBuffer();
      const buffer = await ctx.decodeAudioData(arrayBuffer);
      this.buffers[soundType] = buffer;
    } catch (e) {
      console.warn(`SoundManager: failed to load ${soundType} from ${url}`, e);
    }
  }

  /**
   * Load all sounds that have URLs in options. Call after init().
   */
  async loadAll(): Promise<void> {
    const entries = Object.entries(this.soundUrls) as [SoundType, string][];
    await Promise.all(entries.map(([type, url]) => this.loadSound(type, url)));
  }

  /**
   * Play the sound with slight random pitch variation to avoid repetition.
   * @param volumeOverride 0..1, e.g. 1 for max volume (Break).
   */
  play_dramatic(sound_type: SoundType, options?: { volume?: number }): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const vol = options?.volume != null ? Math.max(0, Math.min(1, options.volume)) : this.volume;
    const buffer = this.buffers[sound_type];
    if (buffer) {
      this.playBuffer(ctx, buffer, vol);
    } else {
      this.playProcedural(ctx, sound_type, vol);
    }
  }

  private playBuffer(ctx: AudioContext, buffer: AudioBuffer, volume?: number): void {
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gainNode = ctx.createGain();
    gainNode.gain.value = volume ?? this.volume;
    source.connect(gainNode);
    gainNode.connect(ctx.destination);

    const cents = (Math.random() * 2 - 1) * this.pitchVariance * 100;
    source.detune.value = cents;
    source.start(0);
  }

  private playProcedural(ctx: AudioContext, sound_type: SoundType, volume?: number): void {
    const vol = volume ?? this.volume;
    const variance = this.pitchVariance / 10;
    const rate = 1 + (Math.random() * 2 - 1) * Math.min(variance, 0.2);
    const now = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);
    gainNode.gain.setValueAtTime(vol, now);

    switch (sound_type) {
      case 'Place':
        this.procTone(ctx, gainNode, now, 120, 0.06, 0.12, rate);
        this.procTone(ctx, gainNode, now + 0.04, 200, 0.04, 0.08, rate * 1.2);
        break;
      case 'Break':
        this.procNoise(ctx, gainNode, now, 0.06, 0.5, vol);
        this.procTone(ctx, gainNode, now + 0.02, 80, 0.05, 0.1, rate * 0.8);
        break;
      case 'Step':
        this.procTone(ctx, gainNode, now, 100, 0.01, 0.06, rate);
        break;
      default:
        break;
    }
  }

  private procTone(
    ctx: AudioContext,
    gainNode: GainNode,
    start: number,
    freq: number,
    attack: number,
    decay: number,
    rate: number
  ): void {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * rate, start);
    osc.connect(gainNode);
    const g = gainNode.gain;
    g.setValueAtTime(0, start);
    g.linearRampToValueAtTime(1, start + attack);
    g.exponentialRampToValueAtTime(0.01, start + attack + decay);
    osc.start(start);
    osc.stop(start + attack + decay);
  }

  private procNoise(
    ctx: AudioContext,
    gainNode: GainNode,
    start: number,
    duration: number,
    amp: number,
    volume: number = this.volume
  ): void {
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * amp;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(gainNode);
    const g = gainNode.gain;
    g.setValueAtTime(volume * 0.5, start);
    g.exponentialRampToValueAtTime(0.01, start + duration);
    source.start(start);
    source.stop(start + duration);
  }
}
