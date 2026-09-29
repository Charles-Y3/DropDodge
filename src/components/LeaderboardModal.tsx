import type { LeaderboardEntry } from '../utils/storage';

interface Props {
  entries: LeaderboardEntry[];
  onClose: () => void;
  onClear: () => void;
}

export function LeaderboardModal({ entries, onClose, onClear }: Props) {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-[80vh] w-full max-w-sm flex-col rounded-xl bg-slate-800 p-5 text-slate-100">
        <h2 className="mb-3 text-xl font-bold">Leaderboard</h2>

        {entries.length === 0 ? (
          <p className="mb-4 text-sm text-slate-400">No scores yet — play a round!</p>
        ) : (
          <ol className="mb-4 flex-1 space-y-1 overflow-y-auto text-sm">
            {entries.map((entry, i) => (
              <li key={entry.id} className="flex justify-between rounded bg-slate-700/50 px-2 py-1">
                <span>
                  {i + 1}. {entry.playerName}
                </span>
                <span className="font-semibold">{entry.score}</span>
              </li>
            ))}
          </ol>
        )}

        <div className="flex gap-2">
          <button onClick={onClear} className="flex-1 rounded-lg bg-slate-600 py-2 text-sm font-semibold">
            Clear
          </button>
          <button onClick={onClose} className="flex-1 rounded-lg bg-orange-500 py-2 font-bold text-orange-950">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
