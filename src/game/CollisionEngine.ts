import type { FallingObject, Target } from './types';
import { TARGET_HEIGHT, TARGET_Y } from './objectTypes';

/**
 * Checks the object's swept path over one fall step against the target's fixed
 * band, not just its landing point — otherwise a fast object (speed > 1 row/turn)
 * could skip over the target row without ever overlapping it on an exact frame.
 */
export function checkCollision(objectBefore: FallingObject, objectAfter: FallingObject, target: Target): boolean {
  const sweptTop = Math.min(objectBefore.y, objectAfter.y);
  const sweptBottom = Math.max(objectBefore.y + objectBefore.height, objectAfter.y + objectAfter.height);

  const verticalOverlap = sweptBottom >= TARGET_Y && sweptTop <= TARGET_Y + TARGET_HEIGHT;
  if (!verticalOverlap) return false;

  const objectLeft = objectAfter.x;
  const objectRight = objectAfter.x + objectAfter.width;
  const targetLeft = target.x;
  const targetRight = target.x + target.width;

  return objectRight > targetLeft && objectLeft < targetRight;
}

export function isNearMiss(objectAfter: FallingObject, target: Target, margin = 0.75): boolean {
  const verticalNear = objectAfter.y + objectAfter.height >= TARGET_Y - margin && objectAfter.y <= TARGET_Y + TARGET_HEIGHT;
  if (!verticalNear) return false;

  const objectLeft = objectAfter.x;
  const objectRight = objectAfter.x + objectAfter.width;
  const targetLeft = target.x - margin;
  const targetRight = target.x + target.width + margin;

  return objectRight > targetLeft && objectLeft < targetRight;
}
