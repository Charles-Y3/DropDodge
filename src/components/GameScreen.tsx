import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { STAGE_TABLE } from '../game/GameRules';
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
};

const STAGE_ANNOUNCEMENTS: Record<number, string> = {
  2: 'STAGE 2 — FAST unlocked! You now move 2 columns per turn.',
  3: 'STAGE 3 — SLOW unlocked! Your hitbox is now leaner.',
  4: 'STAGE 4 — WIDE unlocked! You now move 3 columns per turn.',
  5: 'STAGE 5 — SMALL unlocked! You move 4 columns per turn with your leanest hitbox yet.',
};

export function GameScreen({ settings, onGameOver }: Props) {
  const { state, humanRole, isThinking, dropObject, waitAsAttacker, moveDefender } = useGameEngine(settings);
  const reportedRef = useRef(false);
  const arenaRef = useRef<HTMLDivElement>(null);
  const [objectType, setObjectType] = useState<ObjectTypeId>('NORMAL');
  const [stageBanner, setStageBanner] = useState<string | null>(null);

  useEffect(() => {
    if (state.phase === 'GAME_OVER' && !reportedRef.current) {
      reportedRef.current = true;
      onGameOver(state);
    }
  }, [state, onGameOver]);

  useEffect(() => {
    if (state.lastEvent?.kind === 'STAGE_UP') {
      setStageBanner(STAGE_ANNOUNCEMENTS[state.stage] ?? `STAGE ${state.stage}!`);
      const timer = setTimeout(() => setStageBanner(null), 2000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [state.lastEvent, state.stage]);

  const canDrop = humanRole === 'attacker' && state.phase === 'ATTACKER_TURN';

  const handleArenaClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!canDrop || !arenaRef.current) return;
    const rect = arenaRef.current.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const position = Math.min(Math.max(ratio, 0), 1) * state.arenaWidth;
    dropObject(position, objectType);
  };

  const currentThreshold = STAGE_TABLE[state.stage - 1]?.threshold ?? 0;
  const nextThreshold = STAGE_TABLE[state.stage]?.threshold;
  const stageProgressRatio = nextThreshold
    ? Math.min(Math.max((state.stageProgressPoints - currentThreshold) / (nextThreshold - currentThreshold), 0), 1)
    : 1;

  return (
    <div className="flex h-full w-full flex-col gap-3 p-3 sm:p-4">
      <div className="flex items-center justify-between text-slate-200 text-sm sm:text-base font-semibold">
        <span>Turn {state.turn} / {state.totalTurns}</span>
        <span>Stage {state.stage} / {STAGE_TABLE.length}</span>
        <span className="text-xs font-normal text-slate-400">
          AI: {AI_LABELS[settings.aiDifficulty]}
          {isThinking ? '…' : ''}
        </span>
      </div>

      <div className="h-1 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-amber-400 transition-[width] duration-300"
          style={{ width: `${stageProgressRatio * 100}%` }}
        />
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
          className="absolute bottom-0 rounded-t-md bg-emerald-400 shadow-lg transition-[left,width] duration-150 ease-linear"
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

        {stageBanner && (
          <div className="pointer-events-none absolute inset-x-2 top-2 rounded-lg bg-amber-400/95 px-3 py-2 text-center text-sm font-bold text-amber-950 shadow-lg">
            {stageBanner}
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
