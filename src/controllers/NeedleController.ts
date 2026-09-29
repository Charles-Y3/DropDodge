import { OBJECT_TYPES } from '../game/objectTypes';
import type { Action, GameStateSnapshot, ObjectTypeId, Role } from '../game/types';
import { getNeedleSettings } from '../utils/aiSettings';
import { TacticalController } from './TacticalController';

/**
 * "Needle-style" tool-calling AI: sends the compact board state to an LLM and asks it to
 * call exactly one of a fixed set of tools. Bring-your-own API key (stored only in this
 * browser's localStorage, never sent anywhere but the request below).
 *
 * Security posture (see SECURITY_GUIDELINES.md — the model only ever PROPOSES):
 *  - No network call happens unless the user opted in by pasting their own key.
 *  - Egress is hardcoded to a single allowlisted host (api.anthropic.com) — no
 *    user-configurable arbitrary endpoint.
 *  - The model's reply is validated against a strict allowlist + schema (validateAction) —
 *    an unknown tool name, wrong argument type, or out-of-range value is rejected outright.
 *  - Any failure (missing key, network error, malformed/rejected reply) falls back to the
 *    deterministic Tactical controller rather than throwing or freezing the game — the same
 *    "fail closed to a safe default" pattern the guidelines call for.
 *  - Nothing sent to the model is a secret: only synthetic game numbers (positions, speeds).
 */

const ALLOWED_OBJECT_TYPES = Object.keys(OBJECT_TYPES) as ObjectTypeId[];

const DEFENDER_TOOLS = [
  { name: 'move_left', description: 'Move the target one column to the left.', input_schema: { type: 'object', properties: {} } },
  { name: 'stay', description: 'Keep the target in its current column.', input_schema: { type: 'object', properties: {} } },
  { name: 'move_right', description: 'Move the target one column to the right.', input_schema: { type: 'object', properties: {} } },
];

const ATTACKER_TOOLS = [
  {
    name: 'drop',
    description: 'Drop a falling object at a column to try to hit the target.',
    input_schema: {
      type: 'object',
      properties: {
        position: { type: 'number', description: 'Column position from 0 to the arena width.' },
        objectType: { type: 'string', enum: ALLOWED_OBJECT_TYPES },
      },
      required: ['position', 'objectType'],
    },
  },
  { name: 'wait', description: 'Do not drop anything this turn.', input_schema: { type: 'object', properties: {} } },
];

function describeState(snapshot: GameStateSnapshot, role: Role): string {
  const { target, fallingObjects, arenaWidth, turn, totalTurns } = snapshot;
  const objectLines = fallingObjects.length
    ? fallingObjects
        .map((o) => `- ${o.typeId} at x=${o.x.toFixed(1)} y=${o.y.toFixed(1)} speed=${o.speed} width=${o.width}`)
        .join('\n')
    : '(none currently falling)';

  return [
    'You are playing Drop Dodge, a turn-based dodge game. Objects fall straight down toward the bottom row.',
    `Arena spans x=0 to x=${arenaWidth}. Target occupies x=${target.x.toFixed(1)} to x=${(target.x + target.width).toFixed(1)}, at the bottom row.`,
    `Turn ${turn} of ${totalTurns}.`,
    'Falling objects:',
    objectLines,
    role === 'defender'
      ? 'Call exactly one tool: move_left, stay, or move_right to avoid being hit.'
      : 'Call exactly one tool: drop (with a position and objectType) to try to hit the target, or wait.',
  ].join('\n');
}

function validateAction(toolUse: { name: string; input: unknown }, role: Role, snapshot: GameStateSnapshot): Action {
  const input = (toolUse.input ?? {}) as Record<string, unknown>;

  if (role === 'defender') {
    if (toolUse.name === 'move_left') return { type: 'LEFT' };
    if (toolUse.name === 'move_right') return { type: 'RIGHT' };
    if (toolUse.name === 'stay') return { type: 'STAY' };
    throw new Error(`Unknown defender tool: ${toolUse.name}`);
  }

  if (toolUse.name === 'wait') return { type: 'WAIT' };
  if (toolUse.name === 'drop') {
    const { objectType, position } = input;
    if (typeof objectType !== 'string' || !ALLOWED_OBJECT_TYPES.includes(objectType as ObjectTypeId)) {
      throw new Error(`Unknown objectType: ${String(objectType)}`);
    }
    if (typeof position !== 'number' || !Number.isFinite(position)) {
      throw new Error(`Invalid position: ${String(position)}`);
    }
    const clamped = Math.min(Math.max(position, 0), snapshot.arenaWidth);
    return { type: 'DROP', position: clamped, objectType: objectType as ObjectTypeId };
  }
  throw new Error(`Unknown attacker tool: ${toolUse.name}`);
}

export const NeedleController = {
  async decide(snapshot: GameStateSnapshot, role: Role): Promise<Action> {
    const settings = getNeedleSettings();
    if (!settings.apiKey) return TacticalController.decide(snapshot, role);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': settings.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: settings.model,
          max_tokens: 200,
          tools: role === 'defender' ? DEFENDER_TOOLS : ATTACKER_TOOLS,
          tool_choice: { type: 'any' },
          messages: [{ role: 'user', content: describeState(snapshot, role) }],
        }),
      });

      if (!response.ok) throw new Error(`Needle request failed: ${response.status}`);
      const data = await response.json();
      const toolUse = Array.isArray(data.content) ? data.content.find((b: any) => b.type === 'tool_use') : undefined;
      if (!toolUse) throw new Error('Needle returned no tool call');

      return validateAction(toolUse, role, snapshot);
    } catch (err) {
      console.warn('[Needle] falling back to Tactical AI —', err instanceof Error ? err.message : err);
      return TacticalController.decide(snapshot, role);
    }
  },
};
