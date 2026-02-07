/**
 * Block - world block with material_type. Used for collision and physics (ice = low friction, slime = bounce on land).
 */

import type { MaterialType } from './MaterialPhysics.js';

export type BlockMaterialType = MaterialType;

export interface BlockParams {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  material_type: BlockMaterialType;
}

export class Block {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  /** Determines physics: ice = 80% friction reduction, slime = vertical impulse (bounce) on land. */
  readonly material_type: BlockMaterialType;

  constructor(params: BlockParams) {
    this.id = params.id;
    this.x = params.x;
    this.y = params.y;
    this.w = params.w;
    this.h = params.h;
    this.material_type = params.material_type;
  }

  get top(): number {
    return this.y + this.h;
  }

  get left(): number {
    return this.x;
  }

  get right(): number {
    return this.x + this.w;
  }

  get bottom(): number {
    return this.y;
  }

  /** True if the given AABB (left, right, footY) overlaps this block horizontally. */
  overlapsX(left: number, right: number): boolean {
    return right > this.left && left < this.right;
  }

  /** True if player foot at footY is landing on top of this block (within threshold). */
  isLandingOnTop(footY: number, vy: number, threshold: number = 0.2): boolean {
    return vy <= 0 && footY <= this.top && footY + vy * 0.016 >= this.top - threshold;
  }

  /** True if player head (playerTop) is hitting ceiling of this block. */
  isHittingCeiling(playerTop: number, vy: number, threshold: number = 0.2): boolean {
    return vy > 0 && playerTop >= this.bottom && playerTop + vy * 0.016 <= this.bottom + threshold;
  }
}
