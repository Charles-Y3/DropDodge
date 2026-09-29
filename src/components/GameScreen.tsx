import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { ARENA_HEIGHT } from '../game/objectTypes';
import type { GameSettings, GameState, ObjectTypeId } from '../game/types';
import { useGameEngine } from '../hooks/useGameEngine';
import { AttackerControls, DefenderControls } from './Controls';
import { TurnBanner } from './TurnBanner';

interface Props {
  settings: GameSettings;
  onGameOver: (state: GameState) => void;
}

const AI_LABELS: Record<GameSettings['aiDifficulty'], string> = {
  TACTICAL: 'Tactical',
  STRATEGIC: 'Strategic',
  LEARNED: 'Learned',
  NEEDLE: 'Needle',
};

export function GameScreen({ settings, onGameOver }: Props) {
  const { state, humanRole, stage, isThinking, dropObject, waitAsAttacker, moveDefender } = useGameEngine(settings);
  const reportedRef = useRef(false);
  const arenaRef = useRef<HTMLDivElement>(null);
  const [objectType, setObjectType] = useState<ObjectTypeId>('NORMAL');

  useEffect(() => {
    if (state.phase === 'GAME_OVER' && !reportedRef.current) {
      reportedRef.current = true;
      onGameOver(state);
    }
  }, [state, onGameOver]);

  const canDrop = humanRole === 'attacker' && state.phase === 'ATTACKER_TURN';

  const handleArenaClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!canDrop || !arenaRef.current) return;
    const rect = arenaRef.current.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const position = Math.min(Math.max(ratio, 0), 1) * state.arenaWidth;
    dropObject(position, objectType);
  };

  return (
    <div className="flex h-full w-full flex-col gap-3 p-3 sm:p-4">
      <div className="flex items-center justify-between text-slate-200 text-sm sm:text-base font-semibold">
        <span>Turn {state.turn} / {state.totalTurns}</span>
        <span>Stage {stage.stage}</span>
        <span className="text-xs font-normal text-slate-400">
          AI: {AI_LABELS[settings.aiDifficulty]}
          {isThinking ? '…' : ''}
        </span>
      </div>

      <TurnBanner phase={state.phase} humanRole={humanRole} />

      <div
        ref={arenaRef}
        onClick={handleArenaClick}
        className={`relative flex-1 overflow-hidden rounded-xl border border-slate-700 bg-slate-800/60 ${
          canDrop ? 'cursor-pointer' : ''
        }`}
        style={{ minHeight: 260 }}
      >
        {state.fallingObjects.map((obj) => (
          <div
            key={obj.id}
            className="absolute rounded-md shadow-md transition-[left,top] duration-150 ease-linear"
            style={{
              left: `${(obj.x / state.arenaWidth) * 100}%`,
              top: `${(obj.y / ARENA_HEIGHT) * 100}%`,
              width: `${(obj.width / state.arenaWidth) * 100}%`,
              height: `${(obj.height / ARENA_HEIGHT) * 100}%`,
              backgroundColor: obj.color,
            }}
            title={obj.typeId}
          />
        ))}

        <div
          className="absolute bottom-0 rounded-t-md bg-emerald-400 shadow-lg transition-[left] duration-150 ease-linear"
          style={{
            left: `${(state.target.x / state.arenaWidth) * 100}%`,
            width: `${(state.target.width / state.arenaWidth) * 100}%`,
            height: `${(1 / ARENA_HEIGHT) * 100}%`,
          }}
        />

        {state.lastEvent?.kind === 'CLOSE_CALL' && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-2xl font-black text-amber-300">
            CLOSE!
          </div>
        )}
      </div>

      <div className="flex justify-between text-xs text-slate-400">
        <span>Dodges: {state.dodges}</span>
        <span>Near misses: {state.nearMisses}</span>
      </div>

      {humanRole === 'attacker' ? (
        <AttackerControls
          disabled={state.phase !== 'ATTACKER_TURN'}
          objectType={objectType}
          onSelectType={setObjectType}
          onWait={waitAsAttacker}
        />
      ) : (
        <DefenderControls disabled={state.phase !== 'DEFENDER_TURN'} onMove={moveDefender} />
      )}
    </div>
  );
}
