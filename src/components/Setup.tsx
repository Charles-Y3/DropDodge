import { useState, type ReactNode } from 'react';
import type { GameSettings } from '../game/types';

interface Props {
  initialSettings: GameSettings;
  onStart: (settings: GameSettings) => void;
}

const TURN_COUNTS = [15, 25, 40, 60];
const DIFFICULTIES: GameSettings['difficulty'][] = ['EASY', 'NORMAL', 'HARD'];

const AI_OPTIONS: { value: GameSettings['aiDifficulty']; label: string }[] = [
  { value: 'TACTICAL', label: 'Tactical' },
  { value: 'STRATEGIC', label: 'Strategic' },
  { value: 'LEARNED', label: 'Learned' },
];

const AI_DESCRIPTIONS: Record<GameSettings['aiDifficulty'], string> = {
  TACTICAL:
    'Single-turn risk lookahead — checks how many turns until each possible move gets hit and picks the safest one.',
  STRATEGIC:
    'Multi-move search — plays out several of its own future moves against the real physics engine to find the path that survives longest. Its attacker simulates against a Tactical defender to find the best drop.',
  LEARNED:
    "A small neural network trained offline via self-play (not hand-written rules or search) picks the defensive move. Attacking reuses Strategic's simulation.",
};

const DIFFICULTY_DESCRIPTIONS: Record<GameSettings['difficulty'], string> = {
  EASY: 'The AI makes frequent mistakes and plans less far ahead. Object variety and pacing are unaffected — that’s controlled by stage, which is the same at every difficulty.',
  NORMAL: 'The AI plays its chosen style (Tactical / Strategic / Learned) at its default skill level.',
  HARD: 'The AI rarely makes mistakes and plans further ahead (deeper search, wider lookahead). Object variety and pacing are still stage-based, not difficulty-based.',
};

export function Setup({ initialSettings, onStart }: Props) {
  const [settings, setSettings] = useState<GameSettings>(initialSettings);

  const update = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        <h2 className="text-center text-2xl font-bold text-white">GAME SETUP</h2>

        <Section title="GAME MODE">
          <RadioRow
            options={[
              { value: 'PLAYER_DODGES', label: 'Player Dodges' },
              { value: 'PLAYER_ATTACKS', label: 'Player Attacks' },
            ]}
            value={settings.mode}
            onChange={(v) => update('mode', v as GameSettings['mode'])}
          />
        </Section>

        <Section title="AI OPPONENT">
          <RadioRow
            options={AI_OPTIONS}
            value={settings.aiDifficulty}
            onChange={(v) => update('aiDifficulty', v as GameSettings['aiDifficulty'])}
          />
          <p className="mt-2 text-xs leading-relaxed text-slate-400">{AI_DESCRIPTIONS[settings.aiDifficulty]}</p>
        </Section>

        <Section title="TURNS">
          <RadioRow
            options={TURN_COUNTS.map((t) => ({ value: String(t), label: `${t}` }))}
            value={String(settings.totalTurns)}
            onChange={(v) => update('totalTurns', Number(v))}
          />
        </Section>

        <Section title="DIFFICULTY (AI SKILL)">
          <RadioRow
            options={DIFFICULTIES.map((d) => ({ value: d, label: d }))}
            value={settings.difficulty}
            onChange={(v) => update('difficulty', v as GameSettings['difficulty'])}
          />
          <p className="mt-2 text-xs leading-relaxed text-slate-400">{DIFFICULTY_DESCRIPTIONS[settings.difficulty]}</p>
        </Section>
      </div>

      <div className="p-5 pt-0">
        <button
          onClick={() => onStart(settings)}
          className="w-full rounded-xl bg-orange-500 py-4 text-lg font-bold text-orange-950 shadow-lg active:scale-95 transition-transform"
        >
          START
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</div>
      {children}
    </div>
  );
}

function RadioRow({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
            value === opt.value ? 'bg-orange-500 text-orange-950' : 'bg-slate-700 text-slate-200'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
