/**
 * Game 1 - 2D platformer: move with A/D, jump with Space. Graphics: player, platforms, ground.
 */

import { startGameLoop, stopGameLoop } from '../engine/GameLoop.js';
import { initInput, endInputFrame, isKeyDown, isKeyJustPressed } from '../engine/Input.js';
import { createPlayer, type PlayerState } from '../engine/Player.js';
import {
  createWorld,
  addEntity,
  worldStep,
  type WorldState,
} from '../engine/World.js';
import {
  createCamera,
  worldToScreen,
  drawRect,
  drawPlayerSideView,
  type Camera2D,
} from '../engine/Renderer2D.js';

const PLAYER_W = 0.8;
const PLAYER_H = 1.2;
const MOVE_SPEED = 6;
const JUMP_VEL = 10;
const GRAVITY = 22;
const GROUND_Y = 0;

interface Platform {
  x: number;
  y: number;
  w: number;
  h: number;
}

let player: PlayerState;
let world: WorldState;
let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D | null;
let camera: Camera2D;
let platforms: Platform[];
let gameTime = 0;

function checkPlatformCollision(px: number, py: number, vx: number, vy: number): { x: number; y: number; grounded: boolean } {
  let x = px;
  let y = py;
  let grounded = false;
  const footY = py - PLAYER_H;
  const left = px - PLAYER_W / 2;
  const right = px + PLAYER_W / 2;

  for (const p of platforms) {
    const top = p.y + p.h;
    const bottom = p.y;
    const pLeft = p.x;
    const pRight = p.x + p.w;
    const overlapX = right > pLeft && left < pRight;
    if (!overlapX) continue;
    if (vy <= 0 && footY <= top && footY + vy * 0.016 >= top - 0.2) {
      y = top + PLAYER_H;
      grounded = true;
      break;
    }
    if (vy > 0 && py + PLAYER_H >= bottom && py + PLAYER_H + vy * 0.016 <= bottom + 0.2) {
      y = bottom - PLAYER_H - 0.01;
      vy = 0;
    }
  }
  if (!grounded && footY <= GROUND_Y) {
    y = GROUND_Y + PLAYER_H;
    grounded = true;
  }
  return { x, y, grounded };
}

export function startGame1(mount: HTMLElement): () => void {
  initInput();
  gameTime = 0;
  player = createPlayer({
    position: { x: 0, y: GROUND_Y + PLAYER_H, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    name: 'Player',
  });

  platforms = [
    { x: 4, y: GROUND_Y, w: 6, h: 0.8 },
    { x: 14, y: GROUND_Y, w: 4, h: 0.8 },
    { x: 10, y: 3, w: 3, h: 0.6 },
    { x: 20, y: 2, w: 5, h: 0.6 },
    { x: 26, y: GROUND_Y, w: 8, h: 0.8 },
    { x: -6, y: 2.5, w: 4, h: 0.6 },
  ];

  world = createWorld();
  addEntity(world, {
    id: 'player',
    position: { ...player.position },
    velocity: { ...player.velocity },
    type: 'player',
  });
  for (const p of platforms) {
    addEntity(world, {
      id: `plat_${p.x}_${p.y}`,
      position: { x: p.x, y: p.y, z: 0 },
      type: 'block',
      data: { size: { x: p.w, y: p.h, z: 1 } },
    });
  }

  canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  canvas.style.background = '#0f172a';
  canvas.style.display = 'block';
  mount.innerHTML = '';
  mount.appendChild(canvas);
  ctx = canvas.getContext('2d');
  camera = createCamera(canvas.width, canvas.height, 28);

  startGameLoop({
    update(dt) {
      gameTime += dt;
      const vx = (isKeyDown('KeyD') ? 1 : 0) - (isKeyDown('KeyA') ? 1 : 0);
      player.velocity.x = vx * MOVE_SPEED;
      if (player.grounded && isKeyJustPressed('Space')) {
        player.velocity.y = JUMP_VEL;
        player.grounded = false;
      }
      if (!player.grounded) player.velocity.y -= GRAVITY * dt;

      player.position.x += player.velocity.x * dt;
      player.position.y += player.velocity.y * dt;

      const coll = checkPlatformCollision(
        player.position.x,
        player.position.y,
        player.velocity.x,
        player.velocity.y
      );
      player.position.x = coll.x;
      player.position.y = coll.y;
      player.grounded = coll.grounded;
      if (coll.grounded) player.velocity.y = 0;

      camera.centerX = player.position.x;
      camera.centerY = Math.max(GROUND_Y + 2, player.position.y);
      worldStep(world, dt, player);
      endInputFrame();
    },
    render() {
      if (!ctx) return;
      const w = canvas.width;
      const h = canvas.height;

      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#1e3a5f');
      sky.addColorStop(0.6, '#0f172a');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      const { sx: gx, sy: gy } = worldToScreen(camera, -50, 0, true);
      const groundW = 200 * camera.pixelsPerUnit;
      const groundH = 20;
      ctx.fillStyle = '#14532d';
      ctx.fillRect(gx, gy, groundW, groundH);
      ctx.strokeStyle = '#166534';
      ctx.lineWidth = 2;
      ctx.strokeRect(gx, gy, groundW, groundH);

      for (const p of platforms) {
        drawRect(ctx, camera, p.x, p.y, p.w, p.h, {
          fill: '#475569',
          stroke: '#64748b',
          strokeWidth: 2,
        }, true);
      }

      const facingRight = player.velocity.x >= 0;
      drawPlayerSideView(ctx, camera, player.position.x, player.position.y, PLAYER_W, PLAYER_H, facingRight);

      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, w, 32);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '14px system-ui';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('A/D move · Space jump', 12, 8);
    },
  });

  return () => stopGameLoop();
}
