import type { GameSettings, GameState, ObjectTypeId } from './types';

const DIFFICULTY_MULTIPLIER: Record<GameSettings['difficulty'], number> = {
  EASY: 0.7,
  NORMAL: 1,
  HARD: 1.4,
};

export interface StageRules {
  stage: number;
  threshold: number;
  allowedTypes: ObjectTypeId[];
  dropProbability: number;
  maxSimultaneous: number;
  moveRange: number;
  targetWidth: number;
}

/**
 * One shared table both attacker and defender read from. Stages are earned by points,
 * never by difficulty or turn count — every stage-up gives the attacker a new block type
 * AND gives the defender a matching counter (more move range or a leaner hitbox), so later
 * stages don't just get harder for one side. Thresholds are tuned against the balance-check
 * simulation in scripts/train-learned.mjs, not guessed.
 */
export const STAGE_TABLE: StageRules[] = [
  { stage: 1, threshold: 0, allowedTypes: ['NORMAL'], dropProbability: 0.5, maxSimultaneous: 1, moveRange: 1, targetWidth: 2.0 },
  { stage: 2, threshold: 60, allowedTypes: ['NORMAL', 'FAST'], dropProbability: 0.58, maxSimultaneous: 1, moveRange: 2, targetWidth: 2.0 },
  { stage: 3, threshold: 140, allowedTypes: ['NORMAL', 'FAST', 'SLOW'], dropProbability: 0.7, maxSimultaneous: 2, moveRange: 2, targetWidth: 1.8 },
  { stage: 4, threshold: 260, allowedTypes: ['NORMAL', 'FAST', 'SLOW', 'WIDE'], dropProbability: 0.74, maxSimultaneous: 2, moveRange: 3, targetWidth: 1.8 },
  { stage: 5, threshold: 420, allowedTypes: ['NORMAL', 'FAST', 'SLOW', 'WIDE', 'SMALL'], dropProbability: 0.7, maxSimultaneous: 2, moveRange: 4, targetWidth: 1.4 },
];

export function getStageForPoints(points: number): number {
  for (let i = STAGE_TABLE.length - 1; i >= 0; i--) {
    if (points >= STAGE_TABLE[i].threshold) return STAGE_TABLE[i].stage;
  }
  return 1;
}

export function getStageRules(stage: number): StageRules {
  const clamped = Math.min(Math.max(stage, 1), STAGE_TABLE.length);
  return STAGE_TABLE[clamped - 1];
}

/** Shared progress metric — same formula regardless of who's attacking or defending. */
export function getStageProgressPoints(turn: number, dodges: number, nearMisses: number): number {
  return turn * 10 + dodges * 15 + nearMisses * 5;
}

export interface DifficultyParams {
  /** Chance the AI swaps its chosen move for a random legal one — the one lever every tier honors. */
  mistakeChance: number;
  tacticalHorizonMultiplier: number;
  strategicSearchDepth: number;
  strategicRolloutTurns: number;
  strategicCandidateColumns: number;
}

export const AI_DIFFICULTY_PARAMS: Record<GameSettings['difficulty'], DifficultyParams> = {
  EASY: { mistakeChance: 0.25, tacticalHorizonMultiplier: 0.6, strategicSearchDepth: 2, strategicRolloutTurns: 4, strategicCandidateColumns: 3 },
  NORMAL: { mistakeChance: 0.08, tacticalHorizonMultiplier: 1.0, strategicSearchDepth: 3, strategicRolloutTurns: 6, strategicCandidateColumns: 6 },
  HARD: { mistakeChance: 0, tacticalHorizonMultiplier: 1.4, strategicSearchDepth: 4, strategicRolloutTurns: 8, strategicCandidateColumns: 9 },
};

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
