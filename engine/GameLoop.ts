/**
 * GameLoop - main loop with fixed timestep and render callbacks.
 */

export interface GameLoopCallbacks {
  update?: (dt: number) => void;
  render?: (dt: number) => void;
}

let rafId: number | null = null;
let lastTime = 0;
const targetDt = 1 / 60;
let accumulator = 0;

export function startGameLoop(callbacks: GameLoopCallbacks): void {
  if (rafId != null) cancelAnimationFrame(rafId);
  lastTime = performance.now();
  accumulator = 0;

  function tick(now: number): void {
    const frameDt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;
    accumulator += frameDt;

    while (accumulator >= targetDt) {
      callbacks.update?.(targetDt);
      accumulator -= targetDt;
    }

    callbacks.render?.(frameDt);
    rafId = requestAnimationFrame(tick);
  }

  rafId = requestAnimationFrame(tick);
}

export function stopGameLoop(): void {
  if (rafId != null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

export function getTargetDt(): number {
  return targetDt;
}
