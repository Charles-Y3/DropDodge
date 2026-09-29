import { checkCollision } from '../game/CollisionEngine';
import { getStageParams } from '../game/GameRules';
import { OBJECT_TYPES } from '../game/objectTypes';
import { advanceObjects, clampTargetX, pruneLandedObjects } from '../game/PhysicsEngine';
import type {
  Action,
  DefenderAction,
  FallingObject,
  GameStateSnapshot,
  ObjectTypeId,
  Role,
  Target,
} from '../game/types';
import { TacticalController } from './TacticalController';

const MOVES: DefenderAction['type'][] = ['STAY', 'LEFT', 'RIGHT'];
const SEARCH_DEPTH = 3;
const ROLLOUT_TURNS = 6;
const CANDIDATE_COLUMNS = 6;

/**
 * Genuine multi-ply search (not a single-turn risk formula like Tactical): recursively
 * plays out its own next few moves against the ACTUAL physics/collision engine and picks
 * the move whose best continuation survives longest. It can't see the attacker's future
 * drops, so its planning horizon is bounded by what's already falling — same limitation
 * any lookahead search has without an opponent model.
 */
const SAFE = 999;

function bestSurvival(target: Target, objects: FallingObject[], arenaWidth: number, depth: number): number {
  if (objects.length === 0) return SAFE;
  if (depth <= 0) return 0;

  let best = -Infinity;
  for (const move of MOVES) {
    const delta = move === 'LEFT' ? -1 : move === 'RIGHT' ? 1 : 0;
    const candidateX = clampTargetX(target.x + delta, target.width, arenaWidth);
    const candidateTarget: Target = { x: candidateX, width: target.width };

    const advanced = advanceObjects(objects);
    const collided = objects.some((obj, i) => checkCollision(obj, advanced[i], candidateTarget));
    const score = collided ? 0 : 1 + bestSurvival(candidateTarget, pruneLandedObjects(advanced), arenaWidth, depth - 1);
    best = Math.max(best, score);
  }
  return best;
}

function decideDefender(snapshot: GameStateSnapshot): Action {
  const { target, fallingObjects, arenaWidth } = snapshot;
  let best: DefenderAction['type'] = 'STAY';
  let bestScore = -Infinity;

  for (const move of MOVES) {
    const delta = move === 'LEFT' ? -1 : move === 'RIGHT' ? 1 : 0;
    const candidateX = clampTargetX(target.x + delta, target.width, arenaWidth);
    const candidateTarget: Target = { x: candidateX, width: target.width };

    const advanced = advanceObjects(fallingObjects);
    const collided = fallingObjects.some((obj, i) => checkCollision(obj, advanced[i], candidateTarget));
    const score = collided
      ? 0
      : 1 + bestSurvival(candidateTarget, pruneLandedObjects(advanced), arenaWidth, SEARCH_DEPTH - 1);

    if (score > bestScore) {
      bestScore = score;
      best = move;
    }
  }

  return { type: best };
}

/** Rolls out a hypothetical drop against a Tactical defender to estimate how quickly it would land. */
async function simulateSurvivalAgainstTactical(
  snapshot: GameStateSnapshot,
  hypotheticalObject: FallingObject
): Promise<number> {
  let target = snapshot.target;
  let objects = [...snapshot.fallingObjects, hypotheticalObject];

  for (let turn = 0; turn < ROLLOUT_TURNS; turn++) {
    const rolloutSnapshot: GameStateSnapshot = { ...snapshot, target, fallingObjects: objects };
    const action = (await TacticalController.decide(rolloutSnapshot, 'defender')) as DefenderAction;
    const delta = action.type === 'LEFT' ? -1 : action.type === 'RIGHT' ? 1 : 0;
    const nextTarget: Target = { x: clampTargetX(target.x + delta, target.width, snapshot.arenaWidth), width: target.width };

    const advanced = advanceObjects(objects);
    const collided = objects.some((obj, i) => checkCollision(obj, advanced[i], nextTarget));
    if (collided) return turn;

    objects = pruneLandedObjects(advanced);
    target = nextTarget;
  }
  return ROLLOUT_TURNS;
}

/** Adversarial: samples drop columns/types and picks whichever a Tactical defender survives worst. */
async function decideAttacker(snapshot: GameStateSnapshot): Promise<Action> {
  const { turn, settings, target, fallingObjects, arenaWidth } = snapshot;
  const stage = getStageParams(turn, settings.difficulty);

  if (fallingObjects.length >= stage.maxSimultaneous) return { type: 'WAIT' };
  if (Math.random() > Math.max(stage.dropProbability, 0.6)) return { type: 'WAIT' };

  let bestPosition = target.x;
  let bestType: ObjectTypeId = stage.allowedTypes[0];
  let worstSurvival = Infinity;

  for (let i = 0; i < CANDIDATE_COLUMNS; i++) {
    const position = (i / (CANDIDATE_COLUMNS - 1)) * (arenaWidth - 1);
    for (const objectType of stage.allowedTypes) {
      const typeDef = OBJECT_TYPES[objectType];
      const hypothetical: FallingObject = {
        id: -1,
        typeId: objectType,
        x: position,
        y: 0,
        width: typeDef.width,
        height: typeDef.height,
        speed: typeDef.speed,
        color: typeDef.color,
      };
      const survival = await simulateSurvivalAgainstTactical(snapshot, hypothetical);
      if (survival < worstSurvival) {
        worstSurvival = survival;
        bestPosition = position;
        bestType = objectType;
      }
    }
  }

  return { type: 'DROP', position: bestPosition, objectType: bestType };
}

export const StrategicController = {
  async decide(snapshot: GameStateSnapshot, role: Role): Promise<Action> {
    return role === 'defender' ? decideDefender(snapshot) : decideAttacker(snapshot);
  },
};
