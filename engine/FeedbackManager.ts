/**
 * FeedbackManager - dramatic feedback for actions: sound + screen shake.
 * Uses AudioManager for jump/select; optional SoundManager for Place/Break/Step.
 */

import type { AudioManager } from './AudioManager.js';
import type { SoundManager } from './SoundManager.js';

export interface FeedbackManagerOptions {
  audio: AudioManager;
  /** Optional: use for Place, Break (and Step when game calls onStep). */
  soundManager?: SoundManager;
  /** Max shake displacement in pixels */
  shakeMagnitude?: number;
  /** How fast shake decays per second */
  shakeDecay?: number;
}

export class FeedbackManager {
  private audio: AudioManager;
  private soundManager: SoundManager | undefined;
  private shakeMagnitude: number;
  private shakeDecay: number;
  private shakeIntensity = 0;
  private shakeX = 0;
  private shakeY = 0;

  constructor(options: FeedbackManagerOptions) {
    this.audio = options.audio;
    this.soundManager = options.soundManager;
    this.shakeMagnitude = options.shakeMagnitude ?? 8;
    this.shakeDecay = options.shakeDecay ?? 6;
  }

  onJump(): void {
    this.audio.play('jump');
    this.addShake(1);
  }

  onPlace(): void {
    if (this.soundManager) this.soundManager.play_dramatic('Place');
    else this.audio.play('place');
    this.addShake(0.7);
  }

  onBreak(): void {
    if (this.soundManager) this.soundManager.play_dramatic('Break');
    else this.audio.play('break');
    this.addShake(1.2);
  }

  onStep(): void {
    if (this.soundManager) this.soundManager.play_dramatic('Step');
  }

  /** Call when player lands; impactSpeed is downward velocity (positive = hard landing). */
  onLand(impactSpeed: number): void {
    this.audio.play('land');
    const amount = Math.min(1, 0.2 + Math.abs(impactSpeed) / 18);
    this.addShake(amount);
  }

  onSelect(): void {
    this.audio.play('select');
    this.addShake(0.15);
  }

  /** Add shake (0..1 scale). */
  addShake(amount: number): void {
    this.shakeIntensity = Math.min(1, this.shakeIntensity + amount);
  }

  /** Call each frame; returns current offset in pixels. Apply e.g. ctx.translate(x, y) before drawing. */
  getShakeOffset(dt: number): { x: number; y: number } {
    this.shakeIntensity = Math.max(0, this.shakeIntensity - this.shakeDecay * dt);
    if (this.shakeIntensity <= 0) {
      this.shakeX = 0;
      this.shakeY = 0;
      return { x: 0, y: 0 };
    }
    const max = this.shakeMagnitude * this.shakeIntensity;
    this.shakeX = (Math.random() * 2 - 1) * max;
    this.shakeY = (Math.random() * 2 - 1) * max;
    return { x: this.shakeX, y: this.shakeY };
  }
}
