import { OBJECT_TYPE_LIST } from '../game/objectTypes';
import type { ObjectTypeId } from '../game/types';

interface AttackerProps {
  disabled: boolean;
  objectType: ObjectTypeId;
  onSelectType: (type: ObjectTypeId) => void;
  onWait: () => void;
}

export function AttackerControls({ disabled, objectType, onSelectType, onWait }: AttackerProps) {
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-slate-800/80 p-3">
      <div className="flex gap-1 overflow-x-auto">
        {OBJECT_TYPE_LIST.map((type) => (
          <button
            key={type.id}
            disabled={disabled}
            onClick={() => onSelectType(type.id)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              objectType === type.id ? 'text-slate-950' : 'bg-slate-700 text-slate-200'
            } ${disabled ? 'opacity-40' : ''}`}
            style={objectType === type.id ? { backgroundColor: type.color } : undefined}
          >
            {type.label}
          </button>
        ))}
      </div>

      <p className="text-center text-xs text-slate-400">
        {disabled ? 'Waiting…' : 'Tap the arena above to drop it in that column'}
      </p>

      <button
        disabled={disabled}
        onClick={onWait}
        className="rounded-lg bg-slate-600 py-3 font-bold text-slate-100 disabled:opacity-40"
      >
        WAIT
      </button>
    </div>
  );
}

interface DefenderProps {
  disabled: boolean;
  onMove: (direction: 'LEFT' | 'STAY' | 'RIGHT') => void;
}

export function DefenderControls({ disabled, onMove }: DefenderProps) {
  return (
    <div className="flex gap-2 rounded-xl bg-slate-800/80 p-3">
      <button
        disabled={disabled}
        onClick={() => onMove('LEFT')}
        className="flex-1 rounded-lg bg-sky-500 py-4 text-xl font-bold text-sky-950 disabled:opacity-40"
      >
        ← LEFT
      </button>
      <button
        disabled={disabled}
        onClick={() => onMove('STAY')}
        className="flex-1 rounded-lg bg-slate-600 py-4 text-xl font-bold text-slate-100 disabled:opacity-40"
      >
        ● STAY
      </button>
      <button
        disabled={disabled}
        onClick={() => onMove('RIGHT')}
        className="flex-1 rounded-lg bg-sky-500 py-4 text-xl font-bold text-sky-950 disabled:opacity-40"
      >
        RIGHT →
      </button>
    </div>
  );
}
