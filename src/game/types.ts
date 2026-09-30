export type Phase = 'ATTACKER_TURN' | 'DEFENDER_TURN' | 'RESOLVING' | 'GAME_OVER';

export type Winner = 'ATTACKER' | 'DEFENDER' | null;

export type ObjectTypeId = 'NORMAL' | 'FAST' | 'SLOW' | 'WIDE' | 'SMALL';

export interface ObjectTypeDef {
  id: ObjectTypeId;
  label: string;
  speed: number;
  width: number;
  height: number;
  color: string;
}

export interface FallingObject {
  id: number;
  typeId: ObjectTypeId;
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  color: string;
  countedNearMiss?: boolean;
}

export type Role = 'attacker' | 'defender';

export type AIDifficulty = 'TACTICAL' | 'STRATEGIC' | 'LEARNED';

export type GameMode = 'PLAYER_DODGES' | 'PLAYER_ATTACKS';

export type DefenderAction = { type: 'LEFT' | 'STAY' | 'RIGHT' };

export type AttackerAction =
  | { type: 'DROP'; position: number; objectType: ObjectTypeId }
  | { type: 'WAIT' };

export type Action = DefenderAction | AttackerAction;

export interface GameSettings {
  mode: GameMode;
  aiDifficulty: AIDifficulty;
  totalTurns: number;
  /** Pacing between turns — not user-configurable while the game is fully turn-based. */
  turnIntervalSeconds: number;
  difficulty: 'EASY' | 'NORMAL' | 'HARD';
}

export interface Target {
  x: number;
  width: number;
}

export interface TurnEvent {
  kind: 'DROPPED' | 'WAITED' | 'MOVED' | 'DODGED' | 'CLOSE_CALL' | 'HIT' | 'STAGE_UP';
  detail?: string;
}

export interface GameState {
  phase: Phase;
  turn: number;
  totalTurns: number;
  arenaWidth: number;
  target: Target;
  fallingObjects: FallingObject[];
  settings: GameSettings;
  winner: Winner;
  score: number;
  dodges: number;
  nearMisses: number;
  stage: number;
  stageProgressPoints: number;
  lastEvent: TurnEvent | null;
}

export interface GameStateSnapshot {
  turn: number;
  totalTurns: number;
  arenaWidth: number;
  target: Target;
  fallingObjects: FallingObject[];
  settings: GameSettings;
  stage: number;
}
