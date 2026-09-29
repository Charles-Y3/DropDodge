interface Props {
  onPlay: () => void;
  onOpenHowToPlay: () => void;
  onOpenLeaderboard: () => void;
}

export function MainMenu({ onPlay, onOpenHowToPlay, onOpenLeaderboard }: Props) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-6 text-center">
      <div>
        <h1 className="text-4xl font-black text-white tracking-tight">DROP DODGE</h1>
        <p className="mt-2 text-slate-400">Drop. Dodge. Survive.</p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <button
          onClick={onPlay}
          className="rounded-xl bg-orange-500 py-4 text-lg font-bold text-orange-950 shadow-lg active:scale-95 transition-transform"
        >
          PLAY
        </button>
        <button
          onClick={onOpenHowToPlay}
          className="rounded-xl bg-slate-700 py-3 font-semibold text-slate-100 active:scale-95 transition-transform"
        >
          HOW TO PLAY
        </button>
        <button
          onClick={onOpenLeaderboard}
          className="rounded-xl bg-slate-700 py-3 font-semibold text-slate-100 active:scale-95 transition-transform"
        >
          LEADERBOARD
        </button>
      </div>
    </div>
  );
}
