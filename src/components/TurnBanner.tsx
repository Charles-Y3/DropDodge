import type { Phase, Role } from '../game/types';

interface Props {
  phase: Phase;
  humanRole: Role;
}

export function TurnBanner({ phase, humanRole }: Props) {
  const isAttackerTurn = phase === 'ATTACKER_TURN';
  const isDefenderTurn = phase === 'DEFENDER_TURN';

  const label = isAttackerTurn
    ? `ATTACKER'S TURN${humanRole === 'attacker' ? ' — YOU' : ' — AI'}`
    : isDefenderTurn
      ? `DEFENDER'S TURN${humanRole === 'defender' ? ' — YOU' : ' — AI'}`
      : phase === 'RESOLVING'
        ? 'RESOLVING…'
        : 'GAME OVER';

  const colorClasses = isAttackerTurn
    ? 'bg-orange-500 text-orange-950'
    : isDefenderTurn
      ? 'bg-sky-500 text-sky-950'
      : 'bg-slate-700 text-slate-100';

  return (
    <div
      className={`w-full rounded-lg px-4 py-2 text-center font-bold tracking-wide text-sm sm:text-base transition-colors duration-200 ${colorClasses}`}
    >
      {label}
    </div>
  );
}
