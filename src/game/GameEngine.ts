import { checkCollision, isNearMiss } from './CollisionEngine';
import { calculateScore } from './GameRules';
import { ARENA_WIDTH, OBJECT_TYPES, TARGET_WIDTH } from './objectTypes';
import { advanceObjects, clampTargetX, pruneLandedObjects } from './PhysicsEngine';
import type {
  AttackerAction,
  DefenderAction,
  FallingObject,
  GameSettings,
  GameState,
  GameStateSnapshot,
} from './types';

function initialState(settings: GameSettings): GameState {
  return {
    phase: 'ATTACKER_TURN',
    turn: 1,
    totalTurns: Math.max(1, settings.totalTurns),
    arenaWidth: ARENA_WIDTH,
    target: { x: (ARENA_WIDTH - TARGET_WIDTH) / 2, width: TARGET_WIDTH },
    fallingObjects: [],
    settings,
    winner: null,
    score: 0,
    dodges: 0,
    nearMisses: 0,
    lastEvent: null,
  };
}

export function toSnapshot(state: GameState): GameStateSnapshot {
  return {
    turn: state.turn,
    totalTurns: state.totalTurns,
    arenaWidth: state.arenaWidth,
    target: state.target,
    fallingObjects: state.fallingObjects,
    settings: state.settings,
  };
}

type Listener = (state: GameState) => void;

export class GameEngine {
  private state: GameState;
  private listeners = new Set<Listener>();
  private nextObjectId = 1;
  private pendingDefenderAction: DefenderAction | null = null;

  constructor(settings: GameSettings) {
    this.state = initialState(settings);
  }

  getState(): GameState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    for (const listener of this.listeners) listener(this.state);
  }

  submitAttackerAction(action: AttackerAction) {
    if (this.state.phase !== 'ATTACKER_TURN') return;

    if (action.type === 'DROP') {
      const typeDef = OBJECT_TYPES[action.objectType];
      const x = Math.min(Math.max(action.position, 0), this.state.arenaWidth - typeDef.width);
      const newObject: FallingObject = {
        id: this.nextObjectId++,
        typeId: typeDef.id,
        x,
        y: 0,
        width: typeDef.width,
        height: typeDef.height,
        speed: typeDef.speed,
        color: typeDef.color,
      };
      this.state = {
        ...this.state,
        fallingObjects: [...this.state.fallingObjects, newObject],
        phase: 'DEFENDER_TURN',
        lastEvent: { kind: 'DROPPED', detail: typeDef.label },
      };
    } else {
      this.state = { ...this.state, phase: 'DEFENDER_TURN', lastEvent: { kind: 'WAITED' } };
    }
    this.notify();
  }

  submitDefenderAction(action: DefenderAction) {
    if (this.state.phase !== 'DEFENDER_TURN') return;
    this.pendingDefenderAction = action;
    this.state = { ...this.state, phase: 'RESOLVING', lastEvent: { kind: 'MOVED', detail: action.type } };
    this.notify();
  }

  /** Commits the movement + physics step queued by submitDefenderAction. */
  resolve() {
    if (this.state.phase !== 'RESOLVING' || !this.pendingDefenderAction) return;

    const move = this.pendingDefenderAction.type === 'LEFT' ? -1 : this.pendingDefenderAction.type === 'RIGHT' ? 1 : 0;
    const target = {
      ...this.state.target,
      x: clampTargetX(this.state.target.x + move, this.state.target.width, this.state.arenaWidth),
    };

    const objectsBefore = this.state.fallingObjects;
    const objectsAfter = advanceObjects(objectsBefore);

    let hit = false;
    for (let i = 0; i < objectsBefore.length; i++) {
      if (checkCollision(objectsBefore[i], objectsAfter[i], target)) {
        hit = true;
        break;
      }
    }

    let nearMisses = this.state.nearMisses;
    const flaggedObjects = objectsAfter.map((obj) => {
      if (!obj.countedNearMiss && isNearMiss(obj, target)) {
        nearMisses += 1;
        return { ...obj, countedNearMiss: true };
      }
      return obj;
    });

    const survived = pruneLandedObjects(flaggedObjects);
    const dodges = this.state.dodges + (flaggedObjects.length - survived.length);

    this.pendingDefenderAction = null;

    if (hit) {
      const withResult: GameState = {
        ...this.state,
        target,
        fallingObjects: survived,
        phase: 'GAME_OVER',
        winner: 'ATTACKER',
        dodges,
        nearMisses,
        lastEvent: { kind: 'HIT' },
      };
      this.state = { ...withResult, score: calculateScore(withResult) };
      this.notify();
      return;
    }

    const nextTurn = this.state.turn + 1;
    if (nextTurn > this.state.totalTurns) {
      const withResult: GameState = {
        ...this.state,
        target,
        fallingObjects: survived,
        turn: this.state.turn,
        phase: 'GAME_OVER',
        winner: 'DEFENDER',
        dodges,
        nearMisses,
        lastEvent: { kind: 'DODGED' },
      };
      this.state = { ...withResult, score: calculateScore(withResult) };
      this.notify();
      return;
    }

    this.state = {
      ...this.state,
      target,
      fallingObjects: survived,
      turn: nextTurn,
      phase: 'ATTACKER_TURN',
      dodges,
      nearMisses,
      lastEvent: { kind: 'DODGED' },
    };
    this.notify();
  }
}
