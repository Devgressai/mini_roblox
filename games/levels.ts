/**
 * Level data: blocks, stars, mega coins per level.
 */

import type { BlockMaterialType } from '../engine/Block.js';

export interface LevelBlock {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  material_type: BlockMaterialType;
}

export interface LevelStar {
  x: number;
  y: number;
}

export interface LevelMegaCoin {
  x: number;
  y: number;
}

export interface LevelData {
  name: string;
  blocks: LevelBlock[];
  stars: LevelStar[];
  megaCoins: LevelMegaCoin[];
}

const GROUND = 0;

export const LEVELS: LevelData[] = [
  {
    name: 'Launch Pad',
    blocks: [
      { id: 'p1', x: 4, y: GROUND, w: 6, h: 0.8, material_type: 'normal' },
      { id: 'p2', x: 14, y: GROUND, w: 4, h: 0.8, material_type: 'ice' },
      { id: 'p3', x: 10, y: 3, w: 3, h: 0.6, material_type: 'slime' },
      { id: 'p4', x: 20, y: 2, w: 5, h: 0.6, material_type: 'normal' },
      { id: 'p5', x: 26, y: GROUND, w: 8, h: 0.8, material_type: 'ice' },
      { id: 'p6', x: -6, y: 2.5, w: 4, h: 0.6, material_type: 'slime' },
    ],
    stars: [
      { x: 7, y: 4.5 }, { x: 12, y: 4 }, { x: 11.5, y: 5.5 }, { x: 22, y: 5 },
      { x: 28, y: 4 }, { x: -4, y: 5.5 }, { x: 17, y: 6 }, { x: 0, y: 8 },
    ],
    megaCoins: [{ x: 15, y: 6 }, { x: -2, y: 7 }],
  },
  {
    name: 'Sky Steps',
    blocks: [
      { id: 'p1', x: 0, y: GROUND, w: 5, h: 0.8, material_type: 'normal' },
      { id: 'p2', x: 8, y: 2.5, w: 4, h: 0.6, material_type: 'ice' },
      { id: 'p3', x: 15, y: 5, w: 4, h: 0.6, material_type: 'slime' },
      { id: 'p4', x: 22, y: 7.5, w: 5, h: 0.6, material_type: 'normal' },
      { id: 'p5', x: 30, y: 10, w: 6, h: 0.8, material_type: 'ice' },
      { id: 'p6', x: 12, y: 8, w: 3, h: 0.5, material_type: 'bouncy' },
      { id: 'p7', x: -5, y: 4, w: 4, h: 0.6, material_type: 'normal' },
    ],
    stars: [
      { x: 10, y: 5.5 }, { x: 17, y: 8 }, { x: 24, y: 10.5 }, { x: 32, y: 13 },
      { x: 13, y: 11 }, { x: 2, y: 6 }, { x: -2, y: 7 },
    ],
    megaCoins: [{ x: 26, y: 10.5 }, { x: 10, y: 9 }],
  },
  {
    name: 'Ice Cavern',
    blocks: [
      { id: 'p1', x: -8, y: GROUND, w: 6, h: 0.8, material_type: 'ice' },
      { id: 'p2', x: 2, y: GROUND, w: 5, h: 0.8, material_type: 'ice' },
      { id: 'p3', x: 12, y: 3, w: 4, h: 0.6, material_type: 'ice' },
      { id: 'p4', x: 20, y: 6, w: 4, h: 0.6, material_type: 'slime' },
      { id: 'p5', x: 28, y: 9, w: 5, h: 0.8, material_type: 'ice' },
      { id: 'p6', x: 6, y: 5, w: 3, h: 0.5, material_type: 'ice' },
      { id: 'p7', x: 16, y: 8, w: 3, h: 0.5, material_type: 'bouncy' },
      { id: 'p8', x: 24, y: 12, w: 4, h: 0.6, material_type: 'normal' },
    ],
    stars: [
      { x: 0, y: 5 }, { x: 14, y: 6.5 }, { x: 22, y: 9.5 }, { x: 30, y: 12 },
      { x: 8, y: 8 }, { x: 18, y: 11 }, { x: 4, y: 8 }, { x: 26, y: 15 },
    ],
    megaCoins: [{ x: 14, y: 10 }, { x: 28, y: 12.5 }, { x: 0, y: 7 }],
  },
  {
    name: 'Bouncy Towers',
    blocks: [
      { id: 'p1', x: 0, y: GROUND, w: 4, h: 0.8, material_type: 'bouncy' },
      { id: 'p2', x: 7, y: 4, w: 3, h: 0.6, material_type: 'bouncy' },
      { id: 'p3', x: 13, y: 8, w: 3, h: 0.6, material_type: 'slime' },
      { id: 'p4', x: 19, y: 12, w: 4, h: 0.6, material_type: 'bouncy' },
      { id: 'p5', x: 26, y: 16, w: 5, h: 0.8, material_type: 'normal' },
      { id: 'p6', x: 10, y: 12, w: 3, h: 0.5, material_type: 'bouncy' },
      { id: 'p7', x: 4, y: 7, w: 3, h: 0.5, material_type: 'ice' },
      { id: 'p8', x: 22, y: 8, w: 3, h: 0.5, material_type: 'slime' },
    ],
    stars: [
      { x: 8.5, y: 7 }, { x: 14.5, y: 11 }, { x: 21, y: 15 }, { x: 28.5, y: 19 },
      { x: 11.5, y: 15 }, { x: 5, y: 10 }, { x: 17, y: 14 }, { x: 2, y: 5 },
    ],
    megaCoins: [{ x: 20, y: 15 }, { x: 14, y: 16 }, { x: 8, y: 11 }],
  },
  {
    name: 'Summit',
    blocks: [
      { id: 'p1', x: -6, y: GROUND, w: 5, h: 0.8, material_type: 'normal' },
      { id: 'p2', x: 4, y: 5, w: 4, h: 0.6, material_type: 'ice' },
      { id: 'p3', x: 12, y: 10, w: 4, h: 0.6, material_type: 'slime' },
      { id: 'p4', x: 20, y: 15, w: 4, h: 0.6, material_type: 'bouncy' },
      { id: 'p5', x: 28, y: 20, w: 6, h: 0.8, material_type: 'normal' },
      { id: 'p6', x: 8, y: 14, w: 3, h: 0.5, material_type: 'ice' },
      { id: 'p7', x: 16, y: 18, w: 3, h: 0.5, material_type: 'bouncy' },
      { id: 'p8', x: 24, y: 14, w: 3, h: 0.5, material_type: 'slime' },
      { id: 'p9', x: 0, y: 9, w: 3, h: 0.5, material_type: 'normal' },
    ],
    stars: [
      { x: 6, y: 8 }, { x: 14, y: 13 }, { x: 22, y: 18 }, { x: 31, y: 23 },
      { x: 10, y: 17 }, { x: 18, y: 21 }, { x: 2, y: 12 }, { x: 26, y: 17 },
      { x: 0, y: 14 },
    ],
    megaCoins: [{ x: 30, y: 23 }, { x: 16, y: 21 }, { x: 10, y: 17 }, { x: 4, y: 12 }],
  },
];

export const STORAGE_KEYS = {
  megaCoins: 'mini_roblox_mega_coins',
  upgrades: 'mini_roblox_upgrades',
} as const;

export function getMegaCoins(): number {
  const v = localStorage.getItem(STORAGE_KEYS.megaCoins);
  return v != null ? Math.max(0, parseInt(v, 10)) : 0;
}

export function addMegaCoins(n: number): number {
  const v = getMegaCoins() + n;
  localStorage.setItem(STORAGE_KEYS.megaCoins, String(v));
  return v;
}

export function spendMegaCoins(n: number): boolean {
  const v = getMegaCoins();
  if (v < n) return false;
  localStorage.setItem(STORAGE_KEYS.megaCoins, String(v - n));
  return true;
}

export interface Upgrades {
  superPack: boolean;
}

export function getUpgrades(): Upgrades {
  const v = localStorage.getItem(STORAGE_KEYS.upgrades);
  if (!v) return { superPack: false };
  try {
    const o = JSON.parse(v) as Upgrades;
    return { superPack: !!o.superPack };
  } catch {
    return { superPack: false };
  }
}

export function setSuperPackOwned(owned: boolean): void {
  const u = getUpgrades();
  u.superPack = owned;
  localStorage.setItem(STORAGE_KEYS.upgrades, JSON.stringify(u));
}
