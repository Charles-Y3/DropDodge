import type { GameSettings, GameState, ObjectTypeId } from './types';

const DIFFICULTY_MULTIPLIER: Record<GameSettings['difficulty'], number> = {
  EASY: 0.7,
  NORMAL: 1,
  HARD: 1.4,
};

export interface StageParams {
  stage: number;
  allowedTypes: ObjectTypeId[];
  dropProbability: number;
  maxSimultaneous: number;
}

const STAGE_TYPE_UNLOCKS: ObjectTypeId[][] = [
  ['NORMAL'],
  ['NORMAL', 'FAST'],
  ['NORMAL', 'FAST', 'SLOW'],
  ['NORMAL', 'FAST', 'SLOW', 'WIDE'],
  ['NORMAL', 'FAST', 'SLOW', 'WIDE', 'SMALL'],
];

export function getStageParams(turn: number, difficulty: GameSettings['difficulty']): StageParams {
  const effectiveTurn = turn * DIFFICULTY_MULTIPLIER[difficulty];
  const stage = Math.min(Math.floor(effectiveTurn / 4), 5);
  const allowedTypes = STAGE_TYPE_UNLOCKS[Math.min(stage, STAGE_TYPE_UNLOCKS.length - 1)];
  const dropProbability = Math.min(0.5 + stage * 0.08, 0.9);
  const maxSimultaneous = stage < 2 ? 1 : stage < 4 ? 2 : 3;

  return { stage: stage + 1, allowedTypes, dropProbability, maxSimultaneous };
}

export function calculateScore(state: GameState): number {
  const difficultyBonus = DIFFICULTY_MULTIPLIER[state.settings.difficulty];

  if (state.settings.mode === 'PLAYER_DODGES') {
    const base = state.turn * 10 + state.dodges * 15 + state.nearMisses * 5;
    return Math.round(base * difficultyBonus);
  }

  // PLAYER_ATTACKS: reward landing the hit quickly, otherwise a small
  // consolation score for how many close calls were forced.
  if (state.winner === 'ATTACKER') {
    const turnsRemaining = Math.max(state.totalTurns - state.turn, 0);
    return Math.round((500 + turnsRemaining * 20) * difficultyBonus);
  }
  return Math.round(state.nearMisses * 30 * difficultyBonus);
}
