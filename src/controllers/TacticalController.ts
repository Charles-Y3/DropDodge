import { AI_DIFFICULTY_PARAMS, getStageRules } from '../game/GameRules';
import { ARENA_HEIGHT } from '../game/objectTypes';
import { clampTargetX } from '../game/PhysicsEngine';
import type { Action, DefenderAction, FallingObject, GameStateSnapshot, Role } from '../game/types';
import { applyMistakeChance } from './difficulty';
import { turnsUntilCollision } from './predict';

/**
 * Single-ply risk lookahead: for each candidate move, estimate how many turns until
 * it would be hit, and take whichever is safest. The lookahead horizon must reach at
 * least as far as the slowest object needs to fall — with a horizon shorter than that,
 * every candidate reads back "safe" for most of the game and the defender never moves
 * until it's already too late (the bug this fixes: was a fixed HORIZON=5 turns, but a
 * SLOW object takes up to ARENA_HEIGHT / 0.5 = 20 turns to land). Difficulty scales this
 * horizon further — Hard plans further ahead, Easy plans less.
 */
function horizonFor(fallingObjects: FallingObject[], horizonMultiplier: number): number {
  const slowestSpeed = fallingObjects.reduce((min, obj) => Math.min(min, obj.speed), 1);
  return Math.max(5, Math.ceil((ARENA_HEIGHT / slowestSpeed) * horizonMultiplier));
}

function decideDefender(snapshot: GameStateSnapshot): Action {
  const { target, fallingObjects, arenaWidth, stage, settings } = snapshot;
  const moveRange = getStageRules(stage).moveRange;
  const horizon = horizonFor(fallingObjects, AI_DIFFICULTY_PARAMS[settings.difficulty].tacticalHorizonMultiplier);
  const candidates: DefenderAction['type'][] = ['STAY', 'LEFT', 'RIGHT'];

  let best: DefenderAction['type'] = 'STAY';
  let bestRisk = -1;

  for (const move of candidates) {
    const delta = move === 'LEFT' ? -moveRange : move === 'RIGHT' ? moveRange : 0;
    const candidateX = clampTargetX(target.x + delta, target.width, arenaWidth);

    const minTurns = fallingObjects.length
      ? Math.min(...fallingObjects.map((obj) => turnsUntilCollision(obj, candidateX, target.width, horizon)))
      : Infinity;
    const risk = minTurns === Infinity ? horizon + 1 : minTurns;

    if (risk > bestRisk) {
      bestRisk = risk;
      best = move;
    }
  }

  return { type: best };
}

function decideAttacker(snapshot: GameStateSnapshot): Action {
  const { stage, target, fallingObjects, arenaWidth } = snapshot;
  const rules = getStageRules(stage);

  if (fallingObjects.length >= rules.maxSimultaneous) return { type: 'WAIT' };
  if (Math.random() > rules.dropProbability) return { type: 'WAIT' };

  const objectType = rules.allowedTypes[Math.floor(Math.random() * rules.allowedTypes.length)];
  const jitter = (Math.random() - 0.5) * 2;
  const position = Math.min(Math.max(target.x + target.width / 2 + jitter, 0), arenaWidth - 1);

  return { type: 'DROP', position, objectType };
}

export const TacticalController = {
  async decide(snapshot: GameStateSnapshot, role: Role): Promise<Action> {
    const action = role === 'defender' ? decideDefender(snapshot) : decideAttacker(snapshot);
    return applyMistakeChance(action, role, snapshot.settings);
  },
};
