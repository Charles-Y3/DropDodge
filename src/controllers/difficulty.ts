import { AI_DIFFICULTY_PARAMS } from '../game/GameRules';
import type { Action, DefenderAction, GameSettings, Role } from '../game/types';

const DEFENDER_MOVES: DefenderAction['type'][] = ['LEFT', 'STAY', 'RIGHT'];

/**
 * The one lever every AI tier honors identically: with some chance (scaled by the
 * Easy/Normal/Hard difficulty setting), swap the tier's chosen move for a random legal
 * one instead. This is what makes "Difficulty" mean "how well the AI plays" even for
 * tiers (like Learned) that have no other tunable knob.
 */
export function applyMistakeChance(action: Action, role: Role, settings: GameSettings): Action {
  const { mistakeChance } = AI_DIFFICULTY_PARAMS[settings.difficulty];
  if (mistakeChance <= 0 || Math.random() > mistakeChance) return action;

  if (role === 'defender') {
    return { type: DEFENDER_MOVES[Math.floor(Math.random() * DEFENDER_MOVES.length)] };
  }
  return { type: 'WAIT' };
}
