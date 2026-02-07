/**
 * World - scene and entity container; runs physics and updates.
 */

import type { PlayerState, Vec3 } from './Player.js';

export interface WorldEntity {
  id: string;
  position: Vec3;
  velocity?: Vec3;
  type: 'player' | 'block' | 'trigger';
  data?: Record<string, unknown>;
}

export interface WorldState {
  entities: WorldEntity[];
  gravity: number;
  bounds: { min: Vec3; max: Vec3 };
}

const GRAVITY = -20;
const DEFAULT_BOUNDS = {
  min: { x: -100, y: -10, z: -100 },
  max: { x: 100, y: 200, z: 100 },
};

export function createWorld(options?: Partial<WorldState>): WorldState {
  return {
    entities: [],
    gravity: GRAVITY,
    bounds: DEFAULT_BOUNDS,
    ...options,
  };
}

export function addEntity(world: WorldState, entity: WorldEntity): void {
  if (!world.entities.find((e) => e.id === entity.id)) {
    world.entities.push(entity);
  }
}

export function removeEntity(world: WorldState, id: string): void {
  world.entities = world.entities.filter((e) => e.id !== id);
}

export function getEntity(world: WorldState, id: string): WorldEntity | undefined {
  return world.entities.find((e) => e.id === id);
}

export function worldStep(world: WorldState, dt: number, playerState?: PlayerState): void {
  const g = world.gravity * dt;
  const b = world.bounds;

  for (const e of world.entities) {
    if (e.type === 'player' && playerState) {
      e.position.x = playerState.position.x;
      e.position.y = playerState.position.y;
      e.position.z = playerState.position.z;
      if (e.velocity) {
        e.velocity.x = playerState.velocity.x;
        e.velocity.y = playerState.velocity.y;
        e.velocity.z = playerState.velocity.z;
      }
      continue;
    }
    if (e.velocity) {
      e.velocity.y += g;
      e.position.x += e.velocity.x * dt;
      e.position.y += e.velocity.y * dt;
      e.position.z += e.velocity.z * dt;
    }
    e.position.x = Math.max(b.min.x, Math.min(b.max.x, e.position.x));
    e.position.y = Math.max(b.min.y, Math.min(b.max.y, e.position.y));
    e.position.z = Math.max(b.min.z, Math.min(b.max.z, e.position.z));
  }
}
