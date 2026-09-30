import { useEffect, useMemo, useRef, useState } from 'react';
import { GameEngine, toSnapshot } from '../game/GameEngine';
import { getStageRules } from '../game/GameRules';
import type { AttackerAction, DefenderAction, GameSettings, GameState, ObjectTypeId, Role } from '../game/types';
import { LearnedController } from '../controllers/LearnedController';
import { StrategicController } from '../controllers/StrategicController';
import { TacticalController } from '../controllers/TacticalController';
import type { Controller } from '../controllers/types';

function humanRoleFor(settings: GameSettings): Role {
  return settings.mode === 'PLAYER_DODGES' ? 'defender' : 'attacker';
}

const CONTROLLERS: Record<GameSettings['aiDifficulty'], Controller> = {
  TACTICAL: TacticalController,
  STRATEGIC: StrategicController,
  LEARNED: LearnedController,
};

export function useGameEngine(settings: GameSettings) {
  const engineRef = useRef<GameEngine | undefined>(undefined);
  if (!engineRef.current) engineRef.current = new GameEngine(settings);
  const engine = engineRef.current;

  const [state, setState] = useState<GameState>(() => engine.getState());
  const [isThinking, setIsThinking] = useState(false);

  useEffect(() => engine.subscribe(setState), [engine]);

  const humanRole = humanRoleFor(settings);
  const aiController = useMemo(() => CONTROLLERS[settings.aiDifficulty], [settings.aiDifficulty]);
  const turnIntervalMs = Math.max(settings.turnIntervalSeconds * 1000, 150);

  useEffect(() => {
    let cancelled = false;

    if (state.phase === 'ATTACKER_TURN' && humanRole !== 'attacker') {
      const timer = setTimeout(async () => {
        setIsThinking(true);
        try {
          const action = (await aiController.decide(toSnapshot(state), 'attacker')) as AttackerAction;
          if (!cancelled) engine.submitAttackerAction(action);
        } finally {
          if (!cancelled) setIsThinking(false);
        }
      }, turnIntervalMs);
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }

    if (state.phase === 'DEFENDER_TURN' && humanRole !== 'defender') {
      const timer = setTimeout(async () => {
        setIsThinking(true);
        try {
          const action = (await aiController.decide(toSnapshot(state), 'defender')) as DefenderAction;
          if (!cancelled) engine.submitDefenderAction(action);
        } finally {
          if (!cancelled) setIsThinking(false);
        }
      }, turnIntervalMs);
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }

    if (state.phase === 'RESOLVING') {
      const timer = setTimeout(() => engine.resolve(), turnIntervalMs);
      return () => clearTimeout(timer);
    }

    return undefined;
  }, [state.phase, state.turn, humanRole, aiController, engine, turnIntervalMs]);

  const stageRules = getStageRules(state.stage);

  const dropObject = (position: number, objectType: ObjectTypeId) => {
    if (humanRole !== 'attacker' || state.phase !== 'ATTACKER_TURN') return;
    engine.submitAttackerAction({ type: 'DROP', position, objectType });
  };

  const waitAsAttacker = () => {
    if (humanRole !== 'attacker' || state.phase !== 'ATTACKER_TURN') return;
    engine.submitAttackerAction({ type: 'WAIT' });
  };

  const moveDefender = (direction: 'LEFT' | 'STAY' | 'RIGHT') => {
    if (humanRole !== 'defender' || state.phase !== 'DEFENDER_TURN') return;
    engine.submitDefenderAction({ type: direction });
  };

  return {
    state,
    humanRole,
    stageRules,
    isThinking,
    dropObject,
    waitAsAttacker,
    moveDefender,
  };
}
