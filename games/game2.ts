/**
 * Game 2 - 2D top-down coin collector. Arrow keys move, collect coins. Graphics: player, coins, floor.
 */

import { startGameLoop, stopGameLoop } from '../engine/GameLoop.js';
import { initInput, endInputFrame, isKeyDown } from '../engine/Input.js';
import { createPlayer, type PlayerState } from '../engine/Player.js';
import {
  createWorld,
  addEntity,
  removeEntity,
  worldStep,
  type WorldState,
} from '../engine/World.js';
import {
  createCamera,
  worldToScreen,
  drawRect,
  drawPlayerTopDown,
  drawCoin,
  type Camera2D,
} from '../engine/Renderer2D.js';

let player: PlayerState;
let world: WorldState;
let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D | null;
let camera: Camera2D;
let score = 0;
let gameTime = 0;
const COIN_IDS: string[] = [];
const PICKUP_RADIUS = 1.8;
const MOVE_SPEED = 7;
const PLAYER_RADIUS = 0.6;
const ARENA_SIZE = 24;

function spawnCoins(w: WorldState, count: number): void {
  for (let i = 0; i < count; i++) {
    const id = `coin_${i}`;
    COIN_IDS.push(id);
    addEntity(w, {
      id,
      position: {
        x: (Math.random() - 0.5) * ARENA_SIZE * 0.8,
        y: 0,
        z: (Math.random() - 0.5) * ARENA_SIZE * 0.8,
      },
      type: 'trigger',
      data: { value: 1 },
    });
  }
}

function checkPickups(w: WorldState, p: PlayerState): void {
  for (const id of COIN_IDS.slice()) {
    const e = w.entities.find((x) => x.id === id);
    if (!e) continue;
    const dx = p.position.x - e.position.x;
    const dz = p.position.z - e.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < PICKUP_RADIUS) {
      score += (e.data?.value as number) ?? 1;
      removeEntity(w, id);
      COIN_IDS.splice(COIN_IDS.indexOf(id), 1);
    }
  }
}

export function startGame2(mount: HTMLElement): () => void {
  initInput();
  player = createPlayer({ position: { x: 0, y: 0, z: 0 }, name: 'Player' });
  world = createWorld();
  score = 0;
  gameTime = 0;
  COIN_IDS.length = 0;

  addEntity(world, {
    id: 'player',
    position: { ...player.position },
    velocity: { x: 0, y: 0, z: 0 },
    type: 'player',
  });
  spawnCoins(world, 12);

  canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  canvas.style.background = '#0f172a';
  canvas.style.display = 'block';
  mount.innerHTML = '';
  mount.appendChild(canvas);
  ctx = canvas.getContext('2d');
  camera = createCamera(canvas.width, canvas.height, 24);

  startGameLoop({
    update(dt) {
      gameTime += dt;
      const vx = (isKeyDown('ArrowRight') ? 1 : 0) - (isKeyDown('ArrowLeft') ? 1 : 0);
      const vz = (isKeyDown('ArrowDown') ? 1 : 0) - (isKeyDown('ArrowUp') ? 1 : 0);
      player.velocity.x = vx * MOVE_SPEED;
      player.velocity.z = vz * MOVE_SPEED;
      player.position.x += player.velocity.x * dt;
      player.position.z += player.velocity.z * dt;
      const half = ARENA_SIZE / 2;
      player.position.x = Math.max(-half, Math.min(half, player.position.x));
      player.position.z = Math.max(-half, Math.min(half, player.position.z));
      worldStep(world, dt, player);
      checkPickups(world, player);
      endInputFrame();
    },
    render() {
      if (!ctx) return;
      const w = canvas.width;
      const h = canvas.height;

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);

      camera.centerX = player.position.x;
      camera.centerY = player.position.z;

      drawRect(ctx, camera, -ARENA_SIZE / 2, -ARENA_SIZE / 2, ARENA_SIZE, ARENA_SIZE, {
        fill: '#1e293b',
        stroke: '#334155',
        strokeWidth: 3,
      }, false);

      const gridStep = 4;
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.5)';
      ctx.lineWidth = 1;
      for (let g = -ARENA_SIZE / 2; g <= ARENA_SIZE / 2; g += gridStep) {
        const v1 = worldToScreen(camera, g, -ARENA_SIZE / 2, false);
        const v2 = worldToScreen(camera, g, ARENA_SIZE / 2, false);
        ctx.beginPath();
        ctx.moveTo(v1.sx, v1.sy);
        ctx.lineTo(v2.sx, v2.sy);
        ctx.stroke();
        const h1 = worldToScreen(camera, -ARENA_SIZE / 2, g, false);
        const h2 = worldToScreen(camera, ARENA_SIZE / 2, g, false);
        ctx.beginPath();
        ctx.moveTo(h1.sx, h1.sy);
        ctx.lineTo(h2.sx, h2.sy);
        ctx.stroke();
      }

      for (const e of world.entities) {
        if (e.type === 'trigger') {
          drawCoin(ctx, camera, e.position.x, e.position.z, 0.5, gameTime, false);
        }
      }

      drawPlayerTopDown(ctx, camera, player.position.x, player.position.z, PLAYER_RADIUS);

      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, w, 36);
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 18px system-ui';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`Score: ${score}`, 12, 10);
      const coinsLeft = world.entities.filter((e) => e.type === 'trigger').length;
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '14px system-ui';
      ctx.fillText(`Coins left: ${coinsLeft} · Arrow keys move`, 12, 28);
    },
  });

  return () => stopGameLoop();
}
