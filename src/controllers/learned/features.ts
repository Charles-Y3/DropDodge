import { ARENA_HEIGHT } from '../../game/objectTypes';
import type { FallingObject, GameStateSnapshot } from '../../game/types';

export const FEATURE_SIZE = 10;
export const MOST_URGENT_OBJECTS = 2;
export const MOVE_ORDER = ['LEFT', 'STAY', 'RIGHT'] as const;

/** Encodes the two nearest falling objects plus target position into a fixed-size vector. */
export function encodeFeatures(snapshot: GameStateSnapshot): number[] {
  const { target, fallingObjects, arenaWidth } = snapshot;
  const sorted: (FallingObject | undefined)[] = [...fallingObjects].sort((a, b) => b.y - a.y);

  const features: number[] = [];
  for (let i = 0; i < MOST_URGENT_OBJECTS; i++) {
    const obj = sorted[i];
    if (obj) {
      features.push((obj.x - target.x) / arenaWidth, obj.y / ARENA_HEIGHT, obj.speed / 2, obj.width / arenaWidth);
    } else {
      features.push(0, -1, 0, 0);
    }
  }
  features.push(target.x / arenaWidth, target.width / arenaWidth);
  return features;
}
