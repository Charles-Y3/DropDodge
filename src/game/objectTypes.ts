import type { ObjectTypeDef, ObjectTypeId } from './types';

export const ARENA_WIDTH = 12;
export const ARENA_HEIGHT = 10;
export const TARGET_WIDTH = 2;
export const TARGET_Y = ARENA_HEIGHT - 1;
export const TARGET_HEIGHT = 1;

export const OBJECT_TYPES: Record<ObjectTypeId, ObjectTypeDef> = {
  NORMAL: { id: 'NORMAL', label: 'Normal', speed: 1, width: 1, height: 1, color: '#38bdf8' },
  FAST: { id: 'FAST', label: 'Fast', speed: 2, width: 1, height: 1, color: '#f87171' },
  SLOW: { id: 'SLOW', label: 'Slow', speed: 0.5, width: 1, height: 1, color: '#34d399' },
  WIDE: { id: 'WIDE', label: 'Wide', speed: 1, width: 3, height: 1, color: '#fbbf24' },
  SMALL: { id: 'SMALL', label: 'Small', speed: 1, width: 0.6, height: 1, color: '#c084fc' },
};

export const OBJECT_TYPE_LIST = Object.values(OBJECT_TYPES);
