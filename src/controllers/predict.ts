import { TARGET_HEIGHT, TARGET_Y } from '../game/objectTypes';
import type { FallingObject } from '../game/types';

/** Would a target of the given x/width be hit by this object on its very next fall step? */
export function threatensNextStep(obj: FallingObject, targetX: number, targetWidth: number): boolean {
  const nextY = obj.y + obj.speed;
  const sweptTop = Math.min(obj.y, nextY);
  const sweptBottom = Math.max(obj.y + obj.height, nextY + obj.height);
  const verticalOverlap = sweptBottom >= TARGET_Y && sweptTop <= TARGET_Y + TARGET_HEIGHT;
  if (!verticalOverlap) return false;

  return obj.x + obj.width > targetX && obj.x < targetX + targetWidth;
}

/** Turns until this object would collide with a target fixed at targetX (Infinity if never). */
export function turnsUntilCollision(obj: FallingObject, targetX: number, targetWidth: number, horizon: number): number {
  const overlapsX = obj.x + obj.width > targetX && obj.x < targetX + targetWidth;
  if (!overlapsX) return Infinity;

  let y = obj.y;
  for (let step = 1; step <= horizon; step++) {
    const prevY = y;
    y += obj.speed;
    const sweptTop = Math.min(prevY, y);
    const sweptBottom = Math.max(prevY + obj.height, y + obj.height);
    if (sweptBottom >= TARGET_Y && sweptTop <= TARGET_Y + TARGET_HEIGHT) return step;
    if (y > TARGET_Y + TARGET_HEIGHT) return Infinity;
  }
  return Infinity;
}
