/**
 * Game 1 - 2D platformer sandbox: arrows move, Space jump, E place / Q break.
 * Includes: Inventory, Hotbar, Material Physics (slippery/bouncy), Dramatic Feedback (sound + screen shake).
 */

import { startGameLoop, stopGameLoop } from '../engine/GameLoop.js';
import { initInput, endInputFrame, isKeyDown, isKeyJustPressed } from '../engine/Input.js';
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
  drawPlayerSideView,
  type Camera2D,
} from '../engine/Renderer2D.js';
import { AudioManager } from '../engine/AudioManager.js';
import { SoundManager } from '../engine/SoundManager.js';
import { FeedbackManager } from '../engine/FeedbackManager.js';
import { applyResponse, type MaterialType } from '../engine/MaterialPhysics.js';
import { Block, type BlockMaterialType } from '../engine/Block.js';
import { Inventory, type ItemId } from '../engine/Inventory.js';
import { createHotbar } from '../ui/Hotbar.js';
import { Juice } from '../engine/Juice.js';

const PLAYER_W = 0.8;
const PLAYER_H = 1.2;
const MOVE_SPEED = 6;
const JUMP_VEL = 10;
const GRAVITY = 22;
const GROUND_Y = 0;
const PLACE_REACH = 2.5;
const BLOCK_SIZE = 1;

/** Map hotbar item to block material_type for Place Block. */
function itemToMaterial(item: ItemId): BlockMaterialType {
  if (item === 'empty') return 'stone';
  return item;
}

function blockColor(material_type: BlockMaterialType): { fill: string; stroke: string } {
  switch (material_type) {
    case 'stone': return { fill: '#475569', stroke: '#64748b' };
    case 'wood': return { fill: '#a16207', stroke: '#854d0e' };
    case 'ice': return { fill: '#bae6fd', stroke: '#0ea5e9' };
    case 'slime': return { fill: '#86efac', stroke: '#22c55e' };
    case 'glow': return { fill: '#fef08a', stroke: '#eab308' };
    case 'slippery': return { fill: '#7dd3fc', stroke: '#0ea5e9' };
    case 'bouncy': return { fill: '#f87171', stroke: '#dc2626' };
    default: return { fill: '#475569', stroke: '#64748b' };
  }
}

let player: PlayerState;
let world: WorldState;
let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D | null;
let camera: Camera2D;
let blocks: Block[];
let gameTime = 0;
let audio: AudioManager;
let feedback: FeedbackManager;
let juice: Juice;
let inventory: Inventory;
let placeIdCounter = 0;
let cleanupHotbar: (() => void) | undefined;
let stepCooldown = 0;
const STEP_INTERVAL = 0.2;
let wasGrounded = true;
let prevVy = 0;
let landSquashTime = 0;
let jumpStretchTime = 0;
let canDoubleJump = false;
const LAND_SQUASH_DURATION = 0.14;
const JUMP_STRETCH_DURATION = 0.1;
const DOUBLE_JUMP_VEL = JUMP_VEL * 0.92;
const CAMERA_LEAD = 0.14;

interface BreakParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
}
let breakParticles: BreakParticle[] = [];

/** Returns the block directly beneath the player (the one they're standing on or landing on). */
function getBlockBeneathPlayer(): Block | undefined {
  const footY = player.position.y - PLAYER_H;
  const left = player.position.x - PLAYER_W / 2;
  const right = player.position.x + PLAYER_W / 2;
  let best: Block | undefined;
  for (const b of blocks) {
    if (!b.overlapsX(left, right)) continue;
    if (footY > b.top) continue;
    if (!best || b.top > best.top) best = b;
  }
  return best;
}

function checkBlockCollision(
  px: number,
  py: number,
  vx: number,
  vy: number
): { x: number; y: number; grounded: boolean; landedMaterial?: MaterialType } {
  let x = px;
  let y = py;
  let grounded = false;
  let landedMaterial: MaterialType | undefined;
  const footY = py - PLAYER_H;
  const left = px - PLAYER_W / 2;
  const right = px + PLAYER_W / 2;

  for (const b of blocks) {
    if (!b.overlapsX(left, right)) continue;
    if (b.isLandingOnTop(footY, vy)) {
      y = b.top + PLAYER_H;
      grounded = true;
      landedMaterial = b.material_type;
      break;
    }
    if (b.isHittingCeiling(py + PLAYER_H, vy)) {
      y = b.bottom - PLAYER_H - 0.01;
      const vel = { x: player.velocity.x, y: player.velocity.y };
      applyResponse(vel, { x: 0, y: -1 }, b.material_type);
      player.velocity.x = vel.x;
      player.velocity.y = vel.y;
    }
  }
  if (!grounded && footY <= GROUND_Y) {
    y = GROUND_Y + PLAYER_H;
    grounded = true;
    landedMaterial = 'normal';
  }
  if (grounded && landedMaterial) {
    const vel = { x: player.velocity.x, y: player.velocity.y };
    applyResponse(vel, { x: 0, y: 1 }, landedMaterial);
    player.velocity.x = vel.x;
    player.velocity.y = vel.y;
  }
  return { x, y, grounded, landedMaterial };
}

function findBlockInFront(): Block | undefined {
  const dir = player.velocity.x >= 0 ? 1 : -1;
  const checkX = player.position.x + dir * (PLAYER_W / 2 + BLOCK_SIZE);
  const checkY = player.position.y - PLAYER_H / 2;
  for (const b of blocks) {
    if (b.left <= checkX + BLOCK_SIZE && b.right >= checkX - BLOCK_SIZE &&
        b.bottom <= checkY + BLOCK_SIZE && b.top >= checkY - BLOCK_SIZE)
      return b;
  }
  return undefined;
}

function placeBlock(): void {
  if (!inventory.hasPlaceableSelected()) return;
  const dir = player.velocity.x >= 0 ? 1 : -1;
  const gx = Math.floor((player.position.x + dir * (PLAYER_W / 2 + BLOCK_SIZE)) / BLOCK_SIZE) * BLOCK_SIZE;
  const gy = Math.floor((player.position.y - PLAYER_H) / BLOCK_SIZE) * BLOCK_SIZE;
  if (gy < GROUND_Y) return;
  for (const b of blocks) {
    const overlap = gx < b.right && gx + BLOCK_SIZE > b.left && gy < b.top && gy + BLOCK_SIZE > b.bottom;
    if (overlap) return;
  }
  const item = inventory.getSelectedItem();
  const id = `placed_${++placeIdCounter}`;
  const material_type = itemToMaterial(item);
  blocks.push(new Block({ id, x: gx, y: gy, w: BLOCK_SIZE, h: BLOCK_SIZE, material_type }));
  addEntity(world, {
    id,
    position: { x: gx, y: gy, z: 0 },
    type: 'block',
    data: { size: { x: BLOCK_SIZE, y: BLOCK_SIZE, z: 1 }, material_type },
  });
  inventory.consumeSelected(1);
  feedback.onPlace();
  juice.onBlockPlaced(id, gameTime);
}

function spawnBreakParticles(cx: number, cy: number, color: string): void {
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.5;
    const speed = 2 + Math.random() * 3;
    breakParticles.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1,
      life: 0.35 + Math.random() * 0.15,
      maxLife: 0.5,
      color,
    });
  }
}

function breakBlock(): void {
  const b = findBlockInFront();
  if (!b || b.id.startsWith('plat_')) return;
  const colors = blockColor(b.material_type);
  spawnBreakParticles(b.x + b.w / 2, b.y + b.h / 2, colors.fill);
  blocks = blocks.filter((bl) => bl.id !== b.id);
  removeEntity(world, b.id);
  juice.onBlockBroken();
}

export function startGame1(mount: HTMLElement): () => void {
  initInput();
  gameTime = 0;
  placeIdCounter = 0;
  audio = new AudioManager({ pitchVariance: 0.12, volume: 0.35 });
  const soundManager = new SoundManager({ pitchVariance: 1.5, volume: 0.35 });
  soundManager.init();
  feedback = new FeedbackManager({ audio, soundManager, shakeMagnitude: 10, shakeDecay: 5 });
  juice = new Juice({ feedback, soundManager, breakShake: 1.2 });
  inventory = new Inventory();

  player = createPlayer({
    position: { x: 0, y: GROUND_Y + PLAYER_H, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    name: 'Player',
  });

  blocks = [
    new Block({ id: 'plat_1', x: 4, y: GROUND_Y, w: 6, h: 0.8, material_type: 'normal' }),
    new Block({ id: 'plat_2', x: 14, y: GROUND_Y, w: 4, h: 0.8, material_type: 'ice' }),
    new Block({ id: 'plat_3', x: 10, y: 3, w: 3, h: 0.6, material_type: 'slime' }),
    new Block({ id: 'plat_4', x: 20, y: 2, w: 5, h: 0.6, material_type: 'normal' }),
    new Block({ id: 'plat_5', x: 26, y: GROUND_Y, w: 8, h: 0.8, material_type: 'ice' }),
    new Block({ id: 'plat_6', x: -6, y: 2.5, w: 4, h: 0.6, material_type: 'slime' }),
  ];

  world = createWorld();
  addEntity(world, {
    id: 'player',
    position: { ...player.position },
    velocity: { ...player.velocity },
    type: 'player',
  });
  for (const b of blocks) {
    addEntity(world, {
      id: b.id,
      position: { x: b.x, y: b.y, z: 0 },
      type: 'block',
      data: { size: { x: b.w, y: b.h, z: 1 }, material_type: b.material_type },
    });
  }

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position: relative;';
  mount.innerHTML = '';
  mount.appendChild(wrapper);

  canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  canvas.style.background = '#0f172a';
  canvas.style.display = 'block';
  wrapper.appendChild(canvas);
  ctx = canvas.getContext('2d');
  camera = createCamera(canvas.width, canvas.height, 28);

  cleanupHotbar = createHotbar(wrapper, inventory);

  startGameLoop({
    update(dt) {
      gameTime += dt;
      audio.init();

      for (let i = 0; i < 5; i++) {
        if (isKeyJustPressed(`Digit${i + 1}` as 'Digit1')) {
          inventory.setSelectedIndex(i);
          feedback.onSelect();
        }
      }
      if (isKeyJustPressed('KeyE')) placeBlock();
      if (isKeyJustPressed('KeyQ')) breakBlock();

      const vx = (isKeyDown('ArrowRight') ? 1 : 0) - (isKeyDown('ArrowLeft') ? 1 : 0);
      const prevX = player.position.x;
      player.velocity.x = vx * MOVE_SPEED;
      if (player.grounded && isKeyJustPressed('Space')) {
        player.velocity.y = JUMP_VEL;
        player.grounded = false;
        jumpStretchTime = JUMP_STRETCH_DURATION;
        feedback.onJump();
      } else if (!player.grounded && canDoubleJump && isKeyJustPressed('Space')) {
        player.velocity.y = DOUBLE_JUMP_VEL;
        canDoubleJump = false;
        jumpStretchTime = JUMP_STRETCH_DURATION * 0.7;
        feedback.onJump();
      }
      if (!player.grounded) player.velocity.y -= GRAVITY * dt;

      player.position.x += player.velocity.x * dt;
      player.position.y += player.velocity.y * dt;

      prevVy = player.velocity.y;
      const coll = checkBlockCollision(
        player.position.x,
        player.position.y,
        player.velocity.x,
        player.velocity.y
      );
      player.position.x = coll.x;
      player.position.y = coll.y;
      player.grounded = coll.grounded;
      if (coll.grounded && player.velocity.y <= 0) player.velocity.y = 0;
      if (coll.grounded && player.velocity.y > 0) player.grounded = false;

      if (coll.grounded && !wasGrounded && prevVy < -3) {
        feedback.onLand(prevVy);
        landSquashTime = LAND_SQUASH_DURATION;
      }
      if (wasGrounded && !coll.grounded) canDoubleJump = true;
      if (coll.grounded) canDoubleJump = false;
      wasGrounded = coll.grounded;

      landSquashTime = Math.max(0, landSquashTime - dt);
      jumpStretchTime = Math.max(0, jumpStretchTime - dt);

      breakParticles = breakParticles.filter((p) => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 12 * dt;
        p.life -= dt;
        return p.life > 0;
      });

      stepCooldown -= dt;
      if (coll.grounded && Math.abs(player.position.x - prevX) > 0.01 && stepCooldown <= 0) {
        feedback.onStep();
        stepCooldown = STEP_INTERVAL;
      }

      camera.centerX = player.position.x + player.velocity.x * CAMERA_LEAD;
      camera.centerY = Math.max(GROUND_Y + 2, player.position.y);
      worldStep(world, dt, player);
      endInputFrame();
    },
    render(dt) {
      if (!ctx) return;
      const w = canvas.width;
      const h = canvas.height;
      const { x: shakeX, y: shakeY } = feedback.getShakeOffset(dt);

      ctx.save();
      ctx.translate(shakeX, shakeY);

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

      for (const b of blocks) {
        const scale = juice.getPlaceScale(b.id, gameTime) ?? 1;
        const colors = blockColor(b.material_type);
        const wx = b.x + (b.w * (1 - scale)) / 2;
        const wy = b.y + (b.h * (1 - scale)) / 2;
        const ww = b.w * scale;
        const wh = b.h * scale;
        drawRect(ctx, camera, wx, wy, ww, wh, {
          fill: colors.fill,
          stroke: colors.stroke,
          strokeWidth: 2,
        }, true);
      }

      for (const p of breakParticles) {
        const { sx, sy } = worldToScreen(camera, p.x, p.y, true);
        const alpha = p.life / p.maxLife;
        const size = 3 + (1 - alpha) * 2;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.fillRect(sx - size / 2, sy - size / 2, size, size);
        ctx.globalAlpha = 1;
      }

      let scaleX = 1;
      let scaleY = 1;
      if (landSquashTime > 0) {
        const t = 1 - landSquashTime / LAND_SQUASH_DURATION;
        const e = 1 - (1 - t) * (1 - t);
        scaleX = 1 + 0.25 * (1 - e);
        scaleY = 1 - 0.3 * (1 - e);
      } else if (jumpStretchTime > 0) {
        const t = 1 - jumpStretchTime / JUMP_STRETCH_DURATION;
        const e = 1 - (1 - t) * (1 - t);
        scaleX = 1 - 0.12 * (1 - e);
        scaleY = 1 + 0.18 * (1 - e);
      }
      const facingRight = player.velocity.x >= 0;
      drawPlayerSideView(ctx, camera, player.position.x, player.position.y, PLAYER_W * scaleX, PLAYER_H * scaleY, facingRight);

      ctx.restore();

      const blockBeneath = getBlockBeneathPlayer();
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, w, 32);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '14px system-ui';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('← → move · Space jump (double jump in air) · E place · Q break · 1–5 hotbar', 12, 8);
      if (blockBeneath) {
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`Standing on: ${blockBeneath.material_type}`, 12, 22);
      }
    },
  });

  return () => {
    stopGameLoop();
    cleanupHotbar?.();
  };
}
