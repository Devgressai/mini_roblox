/**
 * AudioManager - single place for all game audio. Supports pitch-shift for variety.
 * Uses Web Audio API with procedural (synthesized) sounds so no asset files are required.
 */

export type SoundId = 'jump' | 'place' | 'break' | 'select';

export interface AudioManagerOptions {
  /** Pitch random range: play at basePitch * (1 + random in [-pitchVariance, +pitchVariance]). */
  pitchVariance?: number;
  /** Master volume 0..1 */
  volume?: number;
}

export class AudioManager {
  private ctx: AudioContext | null = null;
  private readonly pitchVariance: number;
  private readonly volume: number;

  constructor(options: AudioManagerOptions = {}) {
    this.pitchVariance = options.pitchVariance ?? 0.15;
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

  /** Play a one-shot with optional pitch variation. Returns playback rate used. */
  play(soundId: SoundId, options?: { pitchMin?: number; pitchMax?: number }): number {
    const ctx = this.getContext();
    if (!ctx) return 1;

    const variance = this.pitchVariance;
    const pitchMin = options?.pitchMin ?? 1 - variance;
    const pitchMax = options?.pitchMax ?? 1 + variance;
    const rate = pitchMin + Math.random() * (pitchMax - pitchMin);

    const now = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);
    gainNode.gain.setValueAtTime(this.volume, now);

    switch (soundId) {
      case 'jump':
        this.playTone(ctx, gainNode, now, 180, 0.08, 0.15, rate);
        break;
      case 'place':
        this.playTone(ctx, gainNode, now, 120, 0.06, 0.12, rate);
        this.playTone(ctx, gainNode, now + 0.04, 200, 0.04, 0.08, rate * 1.2);
        break;
      case 'break':
        this.playNoise(ctx, gainNode, now, 0.06, 0.5, rate);
        this.playTone(ctx, gainNode, now + 0.02, 80, 0.05, 0.1, rate * 0.8);
        break;
      case 'select':
        this.playTone(ctx, gainNode, now, 400, 0.02, 0.05, rate);
        break;
      default:
        break;
    }

    return rate;
  }

  private playTone(
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

  private playNoise(
    ctx: AudioContext,
    gainNode: GainNode,
    start: number,
    duration: number,
    amp: number,
    _rate: number
  ): void {
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * amp;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(gainNode);
    const g = gainNode.gain;
    g.setValueAtTime(this.volume * 0.5, start);
    g.exponentialRampToValueAtTime(0.01, start + duration);
    source.start(start);
    source.stop(start + duration);
  }
}
