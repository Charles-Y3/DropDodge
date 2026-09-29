import type { FallingObject } from './types';
import { ARENA_HEIGHT } from './objectTypes';

/** Advances every falling object by one discrete turn step. */
export function advanceObjects(objects: FallingObject[]): FallingObject[] {
  return objects.map((obj) => ({ ...obj, y: obj.y + obj.speed }));
}

/** Objects that have fallen past the arena floor are gone — they missed. */
export function pruneLandedObjects(objects: FallingObject[]): FallingObject[] {
  return objects.filter((obj) => obj.y < ARENA_HEIGHT + obj.height);
}

export function clampTargetX(x: number, targetWidth: number, arenaWidth: number): number {
  return Math.min(Math.max(x, 0), arenaWidth - targetWidth);
}
