import type { Action, GameStateSnapshot, Role } from '../game/types';

export interface Controller {
  /** Always async so every tier — pure-function heuristics and network-calling ones alike — share one call shape. */
  decide(snapshot: GameStateSnapshot, role: Role): Promise<Action>;
}
