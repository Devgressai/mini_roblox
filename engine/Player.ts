/**
 * Player - character/entity controlled by the user.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface PlayerState {
  position: Vec3;
  velocity: Vec3;
  grounded: boolean;
  health: number;
  name: string;
}

const DEFAULT_PLAYER: PlayerState = {
  position: { x: 0, y: 0, z: 0 },
  velocity: { x: 0, y: 0, z: 0 },
  grounded: false,
  health: 100,
  name: 'Player',
};

export function createPlayer(overrides?: Partial<PlayerState>): PlayerState {
  return { ...DEFAULT_PLAYER, ...overrides };
}

export function clonePosition(p: Vec3): Vec3 {
  return { x: p.x, y: p.y, z: p.z };
}

export function addVec3(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function scaleVec3(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}
