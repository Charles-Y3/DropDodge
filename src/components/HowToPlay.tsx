interface Props {
  onClose: () => void;
}

export function HowToPlay({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/70 p-4">
      <div className="max-w-sm rounded-xl bg-slate-800 p-5 text-slate-100">
        <h2 className="mb-3 text-xl font-bold">How to Play</h2>
        <ul className="mb-4 list-disc space-y-2 pl-5 text-sm text-slate-300">
          <li>Drop Dodge is turn-based. The attacker always moves first, then the defender.</li>
          <li>Attacker's turn: tap the arena to drop an object in that column, or wait.</li>
          <li>Defender's turn: move LEFT, STAY, or RIGHT to avoid whatever is falling.</li>
          <li>A banner always shows whose turn it is.</li>
          <li>The defender wins by surviving all turns; the attacker wins by landing a hit.</li>
          <li>You play one role against an AI opponent — pick Tactical, Strategic, or Learned in setup.</li>
          <li>Blocks unlock as you earn points mid-match — every new block type also gives the defender a matching upgrade (more move range or a leaner hitbox), so it stays fair as stages climb.</li>
          <li>Difficulty (Easy/Normal/Hard) only changes how well the AI plays — it doesn't affect what unlocks.</li>
        </ul>
        <button onClick={onClose} className="w-full rounded-lg bg-orange-500 py-2 font-bold text-orange-950">
          GOT IT
        </button>
      </div>
    </div>
  );
}
