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
  drawRocketSideView,
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
import {
  LEVELS,
  getMegaCoins,
  addMegaCoins,
  spendMegaCoins,
  getUpgrades,
  setSuperPackOwned,
  type LevelData,
} from './levels.js';

const PLAYER_W = 0.8;
const PLAYER_H = 1.2;
const BASE_JUMP_VEL = 10;
const MOVE_SPEED = 6;
const GRAVITY = 22;
const GROUND_Y = 0;
const SUPER_PACK_MULT = 1.4;
const SUPER_PACK_COST = 5;
const MEGA_COIN_RADIUS = 0.45;
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
const CAMERA_LEAD = 0.14;
let JUMP_VEL = BASE_JUMP_VEL;
let DOUBLE_JUMP_VEL = BASE_JUMP_VEL * 0.92;

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

interface Star {
  id: string;
  x: number;
  y: number;
  collected: boolean;
}
interface MegaCoin {
  id: string;
  x: number;
  y: number;
  collected: boolean;
}
let stars: Star[] = [];
let megaCoins: MegaCoin[] = [];
let score = 0;
let currentLevelIndex = 0;
let levelCompleteShown = false;
let shopVisible = false;
let levelCompleteOverlay: HTMLElement | null = null;
let shopOverlay: HTMLElement | null = null;
let fuel = 1;
const FUEL_MAX = 1;
const FUEL_DRAIN_RATE = 0.35;
const FUEL_REFILL_RATE = 0.15;
const STAR_RADIUS = 0.35;

interface ExhaustParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}
let exhaustParticles: ExhaustParticle[] = [];
const EXHAUST_SPAWN_RATE = 0.02;
let exhaustAccum = 0;

function applyUpgrades(): void {
  const u = getUpgrades();
  JUMP_VEL = BASE_JUMP_VEL * (u.superPack ? SUPER_PACK_MULT : 1);
  DOUBLE_JUMP_VEL = JUMP_VEL * 0.92;
}

function loadLevel(wrapper: HTMLElement, levelIndex: number): void {
  if (levelIndex < 0 || levelIndex >= LEVELS.length) return;
  currentLevelIndex = levelIndex;
  levelCompleteShown = false;
  const level = LEVELS[levelIndex];
  blocks = level.blocks.map((b) => new Block(b));
  stars = level.stars.map((s, i) => ({ id: `star_${levelIndex}_${i}`, x: s.x, y: s.y, collected: false }));
  megaCoins = level.megaCoins.map((m, i) => ({ id: `mega_${levelIndex}_${i}`, x: m.x, y: m.y, collected: false }));
  score = 0;
  fuel = FUEL_MAX;
  breakParticles = [];
  exhaustParticles = [];
  wasGrounded = true;
  canDoubleJump = false;
  landSquashTime = 0;
  jumpStretchTime = 0;
  placeIdCounter = 0;

  player.position.x = 0;
  player.position.y = GROUND_Y + PLAYER_H;
  player.velocity.x = 0;
  player.velocity.y = 0;
  player.grounded = true;

  world.entities = world.entities.filter((e) => e.id === 'player');
  world.entities[0]!.position.x = player.position.x;
  world.entities[0]!.position.y = player.position.y;
  world.entities[0]!.velocity!.x = 0;
  world.entities[0]!.velocity!.y = 0;
  for (const b of blocks) {
    addEntity(world, {
      id: b.id,
      position: { x: b.x, y: b.y, z: 0 },
      type: 'block',
      data: { size: { x: b.w, y: b.h, z: 1 }, material_type: b.material_type },
    });
  }

  if (levelCompleteOverlay) levelCompleteOverlay.style.display = 'none';
  if (shopOverlay) shopOverlay.style.display = 'none';
}

function showLevelCompleteOverlay(wrapper: HTMLElement): void {
  if (levelCompleteOverlay) {
    levelCompleteOverlay.style.display = 'flex';
    const title = levelCompleteOverlay.querySelector('.level-complete-title') as HTMLElement;
    const sub = levelCompleteOverlay.querySelector('.level-complete-sub') as HTMLElement;
    const nextBtn = levelCompleteOverlay.querySelector('.level-complete-next') as HTMLButtonElement;
    const isLast = currentLevelIndex >= LEVELS.length - 1;
    title.textContent = isLast ? 'All levels complete!' : `Level ${currentLevelIndex + 1} complete!`;
    sub.textContent = `Stars collected. Mega coins saved to your balance.`;
    nextBtn.textContent = isLast ? 'Play again' : 'Next level';
    return;
  }
  const overlay = document.createElement('div');
  overlay.className = 'level-complete-overlay';
  overlay.style.cssText = `
    position: absolute; inset: 0; background: rgba(15,23,42,0.9); display: flex; flex-direction: column;
    align-items: center; justify-content: center; z-index: 200; gap: 16px;
  `;
  const title = document.createElement('div');
  title.className = 'level-complete-title';
  title.style.cssText = 'font-size: 28px; font-weight: bold; color: #fbbf24;';
  const sub = document.createElement('div');
  sub.className = 'level-complete-sub';
  sub.style.cssText = 'color: #94a3b8; font-size: 14px;';
  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display: flex; gap: 12px; margin-top: 8px;';
  const nextBtn = document.createElement('button');
  nextBtn.className = 'level-complete-next';
  nextBtn.textContent = 'Next level';
  nextBtn.style.cssText = 'padding: 12px 24px; font-size: 16px; cursor: pointer; background: #22c55e; color: #fff; border: none; border-radius: 8px;';
  const shopBtn = document.createElement('button');
  shopBtn.textContent = 'Shop';
  shopBtn.style.cssText = 'padding: 12px 24px; font-size: 16px; cursor: pointer; background: #6366f1; color: #fff; border: none; border-radius: 8px;';
  nextBtn.addEventListener('click', () => {
    if (currentLevelIndex >= LEVELS.length - 1) loadLevel(wrapper, 0);
    else loadLevel(wrapper, currentLevelIndex + 1);
  });
  shopBtn.addEventListener('click', () => {
    if (levelCompleteOverlay) levelCompleteOverlay.style.display = 'none';
    showShop(wrapper);
  });
  btnRow.appendChild(nextBtn);
  btnRow.appendChild(shopBtn);
  overlay.appendChild(title);
  overlay.appendChild(sub);
  overlay.appendChild(btnRow);
  wrapper.appendChild(overlay);
  levelCompleteOverlay = overlay;
  title.textContent = `Level ${currentLevelIndex + 1} complete!`;
  sub.textContent = `Stars collected. Mega coins saved to your balance.`;
}

function showShop(wrapper: HTMLElement): void {
  if (shopOverlay) {
    shopOverlay.style.display = 'flex';
    (shopOverlay.querySelector('.shop-coins') as HTMLElement).textContent = `Mega coins: ${getMegaCoins()}`;
    (shopOverlay.querySelector('.shop-super') as HTMLElement).textContent = getUpgrades().superPack ? 'Super Pack (owned)' : `Super Pack — Fly 40% higher (${SUPER_PACK_COST} mega coins)`;
    return;
  }
  const overlay = document.createElement('div');
  overlay.className = 'shop-overlay';
  overlay.style.cssText = `
    position: absolute; inset: 0; background: rgba(15,23,42,0.95); display: flex; flex-direction: column;
    align-items: center; justify-content: center; z-index: 210; gap: 20px;
  `;
  const title = document.createElement('div');
  title.textContent = 'Shop';
  title.style.cssText = 'font-size: 24px; font-weight: bold; color: #e2e8f0;';
  const coinsEl = document.createElement('div');
  coinsEl.className = 'shop-coins';
  coinsEl.textContent = `Mega coins: ${getMegaCoins()}`;
  coinsEl.style.cssText = 'color: #fbbf24; font-size: 18px;';
  const superEl = document.createElement('div');
  superEl.className = 'shop-super';
  superEl.style.cssText = 'color: #94a3b8;';
  const buyBtn = document.createElement('button');
  buyBtn.textContent = 'Buy Super Pack';
  buyBtn.style.cssText = 'padding: 12px 24px; font-size: 16px; cursor: pointer; background: #6366f1; color: #fff; border: none; border-radius: 8px;';
  buyBtn.addEventListener('click', () => {
    if (getUpgrades().superPack) return;
    if (spendMegaCoins(SUPER_PACK_COST)) {
      setSuperPackOwned(true);
      applyUpgrades();
      superEl.textContent = 'Super Pack (owned)';
      coinsEl.textContent = `Mega coins: ${getMegaCoins()}`;
      buyBtn.disabled = true;
    }
  });
  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close';
  closeBtn.style.cssText = 'padding: 10px 20px; font-size: 14px; cursor: pointer; background: #475569; color: #fff; border: none; border-radius: 6px;';
  closeBtn.addEventListener('click', () => {
    shopOverlay!.style.display = 'none';
    if (levelCompleteShown && levelCompleteOverlay) levelCompleteOverlay.style.display = 'flex';
  });
  overlay.appendChild(title);
  overlay.appendChild(coinsEl);
  overlay.appendChild(superEl);
  overlay.appendChild(buyBtn);
  overlay.appendChild(closeBtn);
  wrapper.appendChild(overlay);
  shopOverlay = overlay;
  superEl.textContent = getUpgrades().superPack ? 'Super Pack (owned)' : `Super Pack — Fly 40% higher (${SUPER_PACK_COST} mega coins)`;
  buyBtn.disabled = getUpgrades().superPack;
}

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

  world = createWorld();
  addEntity(world, {
    id: 'player',
    position: { ...player.position },
    velocity: { ...player.velocity },
    type: 'player',
  });

  applyUpgrades();

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

  const shopBtn = document.createElement('button');
  shopBtn.textContent = 'Shop';
  shopBtn.style.cssText = 'position: absolute; top: 10px; right: 158px; z-index: 60; padding: 4px 10px; font-size: 12px; cursor: pointer; background: #6366f1; color: #fff; border: none; border-radius: 4px;';
  shopBtn.addEventListener('click', () => showShop(wrapper));
  wrapper.appendChild(shopBtn);

  loadLevel(wrapper, 0);

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
      if (player.grounded && isKeyJustPressed('Space') && fuel > 0.05) {
        player.velocity.y = JUMP_VEL;
        player.grounded = false;
        jumpStretchTime = JUMP_STRETCH_DURATION;
        feedback.onJump();
      } else if (!player.grounded && canDoubleJump && isKeyJustPressed('Space') && fuel > 0.05) {
        player.velocity.y = DOUBLE_JUMP_VEL;
        canDoubleJump = false;
        jumpStretchTime = JUMP_STRETCH_DURATION * 0.7;
        feedback.onJump();
      }
      const thrusting = !player.grounded && player.velocity.y > 0.5;
      if (thrusting) {
        fuel = Math.max(0, fuel - FUEL_DRAIN_RATE * dt);
      } else if (player.grounded) {
        fuel = Math.min(FUEL_MAX, fuel + FUEL_REFILL_RATE * dt);
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

      for (const star of stars) {
        if (star.collected) continue;
        const dx = player.position.x - star.x;
        const dy = player.position.y - PLAYER_H * 0.5 - star.y;
        if (Math.sqrt(dx * dx + dy * dy) < PLAYER_W * 0.6 + STAR_RADIUS) {
          star.collected = true;
          score += 100;
          feedback.onSelect();
        }
      }

      for (const mc of megaCoins) {
        if (mc.collected) continue;
        const dx = player.position.x - mc.x;
        const dy = player.position.y - PLAYER_H * 0.5 - mc.y;
        if (Math.sqrt(dx * dx + dy * dy) < PLAYER_W * 0.6 + MEGA_COIN_RADIUS) {
          mc.collected = true;
          addMegaCoins(1);
          feedback.onPlace();
        }
      }

      if (stars.every((s) => s.collected) && !levelCompleteShown) {
        levelCompleteShown = true;
        showLevelCompleteOverlay(wrapper);
      }

      exhaustAccum += dt;
      if (thrusting && exhaustAccum >= EXHAUST_SPAWN_RATE) {
        exhaustAccum = 0;
        const dir = player.velocity.x >= 0 ? 1 : -1;
        for (let i = 0; i < 2; i++) {
          exhaustParticles.push({
            x: player.position.x + (Math.random() - 0.5) * PLAYER_W * 0.5,
            y: player.position.y - PLAYER_H,
            vx: (Math.random() - 0.5) * 2 - dir * 0.5,
            vy: -2 - Math.random() * 3,
            life: 0.25 + Math.random() * 0.15,
          });
        }
      }
      exhaustParticles = exhaustParticles.filter((p) => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
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

      for (const p of exhaustParticles) {
        const { sx, sy } = worldToScreen(camera, p.x, p.y, true);
        const alpha = p.life / 0.35;
        ctx.fillStyle = `rgba(251, 146, 60, ${alpha * 0.8})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 2 + (1 - alpha) * 2, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const star of stars) {
        if (star.collected) continue;
        const { sx, sy } = worldToScreen(camera, star.x, star.y, true);
        const r = STAR_RADIUS * camera.pixelsPerUnit;
        const bounce = Math.sin(gameTime * 3) * 3;
        ctx.fillStyle = '#fef08a';
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, sy + bounce, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#fbbf24';
        ctx.font = `${Math.round(r * 0.8)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('★', sx, sy + bounce);
      }

      for (const mc of megaCoins) {
        if (mc.collected) continue;
        const { sx, sy } = worldToScreen(camera, mc.x, mc.y, true);
        const r = MEGA_COIN_RADIUS * camera.pixelsPerUnit;
        const bounce = Math.sin(gameTime * 2.5 + 1) * 4;
        const pulse = 1 + 0.15 * Math.sin(gameTime * 4);
        ctx.fillStyle = '#a78bfa';
        ctx.strokeStyle = '#7c3aed';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(sx, sy + bounce, r * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#fbbf24';
        ctx.font = `bold ${Math.round(r * 1.2)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('◆', sx, sy + bounce);
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
      const thrusting = !player.grounded && player.velocity.y > 0.5;
      drawRocketSideView(ctx, camera, player.position.x, player.position.y, PLAYER_W * scaleX, PLAYER_H * scaleY, facingRight, thrusting, gameTime);

      ctx.restore();

      const blockBeneath = getBlockBeneathPlayer();
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, w, 48);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '14px system-ui';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`Level ${currentLevelIndex + 1}/${LEVELS.length}: ${LEVELS[currentLevelIndex]?.name ?? ''}`, 12, 8);
      ctx.fillStyle = '#fbbf24';
      ctx.fillText(`★ ${score}`, 12, 24);
      ctx.fillStyle = '#a78bfa';
      ctx.fillText(`◆ Mega: ${getMegaCoins()}`, 80, 24);
      const fuelPct = Math.max(0, Math.min(1, fuel));
      ctx.fillStyle = '#334155';
      ctx.fillRect(w - 152, 8, 140, 12);
      ctx.fillStyle = fuelPct > 0.25 ? '#22c55e' : fuelPct > 0.1 ? '#eab308' : '#ef4444';
      ctx.fillRect(w - 150, 10, 136 * fuelPct, 8);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1;
      ctx.strokeRect(w - 152, 8, 140, 12);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px system-ui';
      ctx.fillText('Fuel', w - 148, 18);
      if (blockBeneath) {
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`On: ${blockBeneath.material_type}`, 12, 38);
      }
    },
  });

  return () => {
    stopGameLoop();
    cleanupHotbar?.();
    shopBtn.remove();
    levelCompleteOverlay?.remove();
    shopOverlay?.remove();
  };
}
