import type { Action, GameStateSnapshot, Role } from '../game/types';
import { encodeFeatures, MOVE_ORDER } from './learned/features';
import { argmax, forward } from './learned/network';
import { LEARNED_WEIGHTS } from './learned/weights';
import { StrategicController } from './StrategicController';

/**
 * A small trained policy network for defending — a 10-input/8-hidden/3-output MLP whose
 * weights came from an offline evolutionary-search self-play run (scripts/train-learned.mjs),
 * not hand-written rules or an explicit search tree. Inference only at runtime.
 *
 * Attacking reuses Strategic's adversarial simulation — training a second policy network
 * for the continuous drop-position/type action space was out of scope for this pass.
 */
function decideDefender(snapshot: GameStateSnapshot): Action {
  const features = encodeFeatures(snapshot);
  const logits = forward(features, LEARNED_WEIGHTS);
  return { type: MOVE_ORDER[argmax(logits)] };
}

export const LearnedController = {
  async decide(snapshot: GameStateSnapshot, role: Role): Promise<Action> {
    return role === 'defender' ? decideDefender(snapshot) : StrategicController.decide(snapshot, role);
  },
};
