import { useState } from 'react';
import type { GameState } from '../game/types';

interface Props {
  state: GameState;
  defaultPlayerName: string;
  onSubmitScore: (name: string) => void;
  onPlayAgain: () => void;
  onHome: () => void;
}

export function Results({ state, defaultPlayerName, onSubmitScore, onPlayAgain, onHome }: Props) {
  const [name, setName] = useState(defaultPlayerName);
  const [saved, setSaved] = useState(false);
  const humanWon =
    (state.settings.mode === 'PLAYER_DODGES' && state.winner === 'DEFENDER') ||
    (state.settings.mode === 'PLAYER_ATTACKS' && state.winner === 'ATTACKER');

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/70 p-4">
      <div className="flex w-full max-w-xs flex-col items-center gap-4 rounded-2xl bg-slate-900 p-6 text-center shadow-2xl">
        <h2 className={`text-3xl font-black ${humanWon ? 'text-emerald-400' : 'text-red-400'}`}>
          {humanWon ? 'YOU WIN!' : 'YOU LOSE'}
        </h2>
        <p className="text-slate-400">
          {state.winner === 'ATTACKER' ? 'The target was hit.' : 'The target survived every turn.'}
        </p>

        <div className="grid w-full grid-cols-2 gap-3 text-slate-200">
          <Stat label="Turns Survived" value={state.turn} />
          <Stat label="Score" value={state.score} />
          <Stat label="Dodges" value={state.dodges} />
          <Stat label="Near Misses" value={state.nearMisses} />
        </div>

        {!saved && (
          <div className="flex w-full gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={16}
              className="min-w-0 flex-1 rounded-lg bg-slate-700 px-3 py-2 text-slate-100"
            />
            <button
              onClick={() => {
                onSubmitScore(name || 'Player');
                setSaved(true);
              }}
              className="rounded-lg bg-orange-500 px-4 py-2 font-bold text-orange-950"
            >
              SAVE
            </button>
          </div>
        )}

        <div className="flex w-full gap-3 pt-2">
          <button onClick={onHome} className="flex-1 rounded-xl bg-slate-700 py-3 font-semibold text-slate-100">
            HOME
          </button>
          <button
            onClick={onPlayAgain}
            className="flex-1 rounded-xl bg-orange-500 py-3 font-bold text-orange-950 active:scale-95 transition-transform"
          >
            PLAY AGAIN
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-slate-800 py-2">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
}
