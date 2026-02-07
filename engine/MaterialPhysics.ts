/**
 * MaterialPhysics - material-based response: friction (slippery) and restitution (bouncy).
 * Applied when resolving collisions (e.g. player vs platform).
 */

export type MaterialType = 'normal' | 'slippery' | 'bouncy' | 'ice' | 'slime' | 'stone' | 'wood' | 'glow';

export interface MaterialDef {
  /** 0 = no friction, 1 = full friction. Ice = 20% of normal (80% reduction). */
  friction: number;
  /** 0 = no bounce, 1 = full bounce. Slime = vertical impulse on land. */
  restitution: number;
}

const NORMAL_FRICTION = 0.85;

const MATERIALS: Record<MaterialType, MaterialDef> = {
  normal: { friction: NORMAL_FRICTION, restitution: 0 },
  slippery: { friction: 0.15, restitution: 0 },
  bouncy: { friction: 0.6, restitution: 0.85 },
  ice: { friction: NORMAL_FRICTION * 0.2, restitution: 0 },
  slime: { friction: NORMAL_FRICTION, restitution: 0.65 },
  stone: { friction: NORMAL_FRICTION, restitution: 0 },
  wood: { friction: NORMAL_FRICTION, restitution: 0 },
  glow: { friction: NORMAL_FRICTION, restitution: 0 },
};

export function getMaterial(type: MaterialType): MaterialDef {
  return MATERIALS[type];
}

export interface Vec2 {
  x: number;
  y: number;
}

/**
 * Apply material response: friction along surface, bounce along normal.
 * velocity: in/out velocity (e.g. player).
 * normal: unit vector pointing away from surface (e.g. (0,1) for floor).
 * material: surface material.
 */
export function applyResponse(
  velocity: Vec2,
  normal: Vec2,
  materialType: MaterialType = 'normal'
): void {
  const mat = getMaterial(materialType);

  const nx = normal.x;
  const ny = normal.y;
  const vn = velocity.x * nx + velocity.y * ny;
  if (vn < 0) {
    velocity.x -= vn * nx * (1 + mat.restitution);
    velocity.y -= vn * ny * (1 + mat.restitution);
  }

  const tx = -ny;
  const ty = nx;
  const vt = velocity.x * tx + velocity.y * ty;
  velocity.x = vt * mat.friction * tx + velocity.x * (1 - mat.friction);
  velocity.y = vt * mat.friction * ty + velocity.y * (1 - mat.friction);
}
