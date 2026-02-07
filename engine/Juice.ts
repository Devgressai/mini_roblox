/**
 * Juice - extra feedback for block break (camera shake + Break at max volume) and place (pop scale tween).
 */

import type { FeedbackManager } from './FeedbackManager.js';
import type { SoundManager } from './SoundManager.js';

const POP_DURATION = 0.2;

/** Ease-out-back for a satisfying pop. */
function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export interface JuiceOptions {
  feedback: FeedbackManager;
  soundManager: SoundManager;
  /** Shake intensity when a block is broken (0..1). */
  breakShake?: number;
}

export class Juice {
  private feedback: FeedbackManager;
  private soundManager: SoundManager;
  private breakShake: number;
  private placeTweens: Map<string, number> = new Map();

  constructor(options: JuiceOptions) {
    this.feedback = options.feedback;
    this.soundManager = options.soundManager;
    this.breakShake = options.breakShake ?? 1.2;
  }

  /** Call when a block is broken: brief camera shake + Break sound at max volume. */
  onBlockBroken(): void {
    this.feedback.addShake(this.breakShake);
    this.soundManager.play_dramatic('Break', { volume: 1 });
  }

  /** Call when a block is placed: start pop scale-up tween. */
  onBlockPlaced(blockId: string, now: number): void {
    this.placeTweens.set(blockId, now);
  }

  /**
   * Get current scale for a block (0..1) if it's in the place-pop animation, else null (use 1).
   */
  getPlaceScale(blockId: string, now: number): number | null {
    const start = this.placeTweens.get(blockId);
    if (start == null) return null;
    const elapsed = now - start;
    if (elapsed >= POP_DURATION) {
      this.placeTweens.delete(blockId);
      return null;
    }
    const t = elapsed / POP_DURATION;
    return easeOutBack(t);
  }

  /** Call each frame to clean finished tweens (optional; getPlaceScale already removes). */
  update(_dt: number): void {}
}
