#!/usr/bin/env node
/**
 * Offline trainer for the "Learned" AI tier's tiny defender policy network, plus a
 * balance-check mode for the stage/points progression system.
 *
 * This is a Node-only script (never shipped, never runs at runtime). It duplicates the
 * minimal slice of game constants and physics from src/game/objectTypes.ts,
 * src/game/PhysicsEngine.ts, src/game/CollisionEngine.ts, and the STAGE_TABLE in
 * src/game/GameRules.ts needed to simulate episodes — keep these in sync if the real
 * game's arena/object/stage constants ever change.
 *
 * Run:
 *   node scripts/train-learned.mjs             — trains the Learned defender network,
 *                                                 writes src/controllers/learned/weights.ts
 *   node scripts/train-learned.mjs --balance    — simulates full matches with a Tactical-
 *                                                 style attacker vs defender and reports
 *                                                 the attacker/defender win split and
 *                                                 average stage reached, to sanity-check
 *                                                 that STAGE_TABLE keeps the match fair
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Mirrors src/game/objectTypes.ts ---
const ARENA_WIDTH = 12;
const ARENA_HEIGHT = 10;
const TARGET_Y = ARENA_HEIGHT - 1;
const TARGET_HEIGHT = 1;
const OBJECT_TYPES = {
  NORMAL: { speed: 1, width: 1, height: 1 },
  FAST: { speed: 2, width: 1, height: 1 },
  SLOW: { speed: 0.5, width: 1, height: 1 },
  WIDE: { speed: 1, width: 3, height: 1 },
  SMALL: { speed: 1, width: 0.6, height: 1 },
};

// --- Mirrors STAGE_TABLE in src/game/GameRules.ts ---
const STAGE_TABLE = [
  { stage: 1, threshold: 0, allowedTypes: ['NORMAL'], dropProbability: 0.5, maxSimultaneous: 1, moveRange: 1, targetWidth: 2.0 },
  { stage: 2, threshold: 60, allowedTypes: ['NORMAL', 'FAST'], dropProbability: 0.58, maxSimultaneous: 1, moveRange: 2, targetWidth: 2.0 },
  { stage: 3, threshold: 140, allowedTypes: ['NORMAL', 'FAST', 'SLOW'], dropProbability: 0.7, maxSimultaneous: 2, moveRange: 2, targetWidth: 1.8 },
  { stage: 4, threshold: 260, allowedTypes: ['NORMAL', 'FAST', 'SLOW', 'WIDE'], dropProbability: 0.74, maxSimultaneous: 2, moveRange: 3, targetWidth: 1.8 },
  { stage: 5, threshold: 420, allowedTypes: ['NORMAL', 'FAST', 'SLOW', 'WIDE', 'SMALL'], dropProbability: 0.7, maxSimultaneous: 2, moveRange: 4, targetWidth: 1.4 },
];
function getStageForPoints(points) {
  for (let i = STAGE_TABLE.length - 1; i >= 0; i--) if (points >= STAGE_TABLE[i].threshold) return STAGE_TABLE[i].stage;
  return 1;
}
function getStageRules(stage) {
  return STAGE_TABLE[Math.min(Math.max(stage, 1), STAGE_TABLE.length) - 1];
}
function stageProgressPoints(turn, dodges, nearMisses) {
  return turn * 10 + dodges * 15 + nearMisses * 5;
}

// --- Mirrors src/game/CollisionEngine.ts + PhysicsEngine.ts ---
function checkCollision(before, after, target) {
  const sweptTop = Math.min(before.y, after.y);
  const sweptBottom = Math.max(before.y + before.height, after.y + after.height);
  if (!(sweptBottom >= TARGET_Y && sweptTop <= TARGET_Y + TARGET_HEIGHT)) return false;
  return after.x + after.width > target.x && after.x < target.x + target.width;
}
function isNearMiss(after, target, margin = 0.75) {
  const verticalNear = after.y + after.height >= TARGET_Y - margin && after.y <= TARGET_Y + TARGET_HEIGHT;
  if (!verticalNear) return false;
  return after.x + after.width > target.x - margin && after.x < target.x + target.width + margin;
}
function clampTargetX(x, targetWidth, arenaWidth = ARENA_WIDTH) {
  return Math.min(Math.max(x, 0), arenaWidth - targetWidth);
}

// --- Mirrors src/controllers/learned/features.ts ---
const FEATURE_SIZE = 11;
const MOVE_ORDER = ['LEFT', 'STAY', 'RIGHT'];
function encodeFeatures(target, objects, stage) {
  const sorted = [...objects].sort((a, b) => b.y - a.y);
  const features = [];
  for (let i = 0; i < 2; i++) {
    const obj = sorted[i];
    if (obj) {
      features.push((obj.x - target.x) / ARENA_WIDTH, obj.y / ARENA_HEIGHT, obj.speed / 2, obj.width / ARENA_WIDTH);
    } else {
      features.push(0, -1, 0, 0);
    }
  }
  features.push(target.x / ARENA_WIDTH, target.width / ARENA_WIDTH, getStageRules(stage).moveRange / 3);
  return features;
}

// --- Mirrors src/controllers/learned/network.ts ---
const HIDDEN = 8;
const OUTPUT = 3;
function forward(features, w) {
  const hidden = w.w1.map((row, i) => Math.tanh(row.reduce((s, wi, j) => s + wi * features[j], 0) + w.b1[i]));
  return w.w2.map((row, i) => row.reduce((s, wi, j) => s + wi * hidden[j], 0) + w.b2[i]);
}
function argmax(values) {
  let best = 0;
  for (let i = 1; i < values.length; i++) if (values[i] > values[best]) best = i;
  return best;
}

// --- Seeded RNG for reproducible training ---
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomWeights(rng, scale = 0.6) {
  const rnd = () => (rng() * 2 - 1) * scale;
  return {
    w1: Array.from({ length: HIDDEN }, () => Array.from({ length: FEATURE_SIZE }, rnd)),
    b1: Array.from({ length: HIDDEN }, rnd),
    w2: Array.from({ length: OUTPUT }, () => Array.from({ length: HIDDEN }, rnd)),
    b2: Array.from({ length: OUTPUT }, rnd),
  };
}

function mutate(weights, rng, rate) {
  const jitter = (v) => v + (rng() * 2 - 1) * rate;
  return {
    w1: weights.w1.map((row) => row.map(jitter)),
    b1: weights.b1.map(jitter),
    w2: weights.w2.map((row) => row.map(jitter)),
    b2: weights.b2.map(jitter),
  };
}

// --- Shared staged-attacker step, used by both training and the balance check ---
function stageAttackerDrop(target, objects, stage, rng) {
  const rules = getStageRules(stage);
  if (objects.length >= rules.maxSimultaneous) return null;
  if (rng() > rules.dropProbability) return null;

  const type = rules.allowedTypes[Math.floor(rng() * rules.allowedTypes.length)];
  const def = OBJECT_TYPES[type];
  const jitter = (rng() - 0.5) * 2;
  const x = Math.min(Math.max(target.x + target.width / 2 + jitter, 0), ARENA_WIDTH - def.width);
  return { x, y: 0, width: def.width, height: def.height, speed: def.speed };
}

const EPISODE_LENGTH = 60;

function simulateEpisode(weights, rng) {
  let stage = 1;
  let rules = getStageRules(stage);
  let target = { x: (ARENA_WIDTH - rules.targetWidth) / 2, width: rules.targetWidth };
  let objects = [];
  let dodges = 0;
  let nearMisses = 0;

  for (let turn = 1; turn <= EPISODE_LENGTH; turn++) {
    const dropped = stageAttackerDrop(target, objects, stage, rng);
    if (dropped) objects.push(dropped);

    const features = encodeFeatures(target, objects, stage);
    const move = MOVE_ORDER[argmax(forward(features, weights))];
    const delta = move === 'LEFT' ? -rules.moveRange : move === 'RIGHT' ? rules.moveRange : 0;
    const nextTarget = { x: clampTargetX(target.x + delta, target.width), width: target.width };

    const advanced = objects.map((o) => ({ ...o, y: o.y + o.speed }));
    if (objects.some((o, i) => checkCollision(o, advanced[i], nextTarget))) return { turn, stage, won: false };

    let survivors = [];
    for (const o of advanced) {
      if (isNearMiss(o, nextTarget)) nearMisses++;
      if (o.y < ARENA_HEIGHT + o.height) survivors.push(o);
      else dodges++;
    }
    objects = survivors;
    target = nextTarget;

    const points = stageProgressPoints(turn, dodges, nearMisses);
    const nextStage = getStageForPoints(points);
    if (nextStage > stage) {
      stage = nextStage;
      rules = getStageRules(stage);
      target = { x: clampTargetX(target.x, rules.targetWidth), width: rules.targetWidth };
    }
  }
  return { turn: EPISODE_LENGTH, stage, won: true };
}

function fitness(weights, rng, episodes = 25) {
  let total = 0;
  for (let i = 0; i < episodes; i++) total += simulateEpisode(weights, rng).turn;
  return total / episodes;
}

function train() {
  const rng = mulberry32(42);
  const POPULATION = 50;
  const GENERATIONS = 150;
  const ELITE = 8;

  let population = Array.from({ length: POPULATION }, () => ({ weights: randomWeights(rng), fitness: -1 }));

  for (let gen = 0; gen < GENERATIONS; gen++) {
    for (const individual of population) individual.fitness = fitness(individual.weights, rng);
    population.sort((a, b) => b.fitness - a.fitness);

    if (gen % 20 === 0 || gen === GENERATIONS - 1) {
      console.log(`gen ${gen}: best avg survival ${population[0].fitness.toFixed(2)} / ${EPISODE_LENGTH} turns`);
    }

    const elite = population.slice(0, ELITE);
    const next = [...elite];
    while (next.length < POPULATION) {
      if (rng() < 0.1) {
        next.push({ weights: randomWeights(rng), fitness: -1 });
      } else {
        const parent = elite[Math.floor(rng() * elite.length)];
        next.push({ weights: mutate(parent.weights, rng, 0.15), fitness: -1 });
      }
    }
    population = next;
  }

  population.sort((a, b) => b.fitness - a.fitness);
  return population[0];
}

function runTraining() {
  const best = train();
  console.log(`Final best fitness: ${best.fitness.toFixed(2)} / ${EPISODE_LENGTH} turns survived on average`);

  const output = `// Auto-generated by scripts/train-learned.mjs — do not hand-edit.
// Trained defender policy: avg survival ${best.fitness.toFixed(2)}/${EPISODE_LENGTH} turns across random episodes.
import type { NetworkWeights } from './network';

export const LEARNED_WEIGHTS: NetworkWeights = ${JSON.stringify(best.weights, null, 2)};
`;

  writeFileSync(join(__dirname, '..', 'src', 'controllers', 'learned', 'weights.ts'), output);
  console.log('Wrote src/controllers/learned/weights.ts');
}

// --- Balance check: a Tactical-style reactive defender vs a stage-gated attacker,
// across many full matches, to sanity-check STAGE_TABLE keeps the match fair. This
// mirrors TacticalController's real multi-object risk evaluation (min turns-to-collision
// across ALL falling objects per candidate, not just the nearest threat) — it checks the
// Tactical tier specifically (the baseline every other tier builds on), not Strategic's
// search or Learned's trained network.
function turnsUntilCollision(obj, targetX, targetWidth, horizon) {
  if (!(obj.x + obj.width > targetX && obj.x < targetX + targetWidth)) return Infinity;
  let y = obj.y;
  for (let step = 1; step <= horizon; step++) {
    const prevY = y;
    y += obj.speed;
    const sweptBottom = Math.max(prevY + obj.height, y + obj.height);
    if (sweptBottom >= TARGET_Y && Math.min(prevY, y) <= TARGET_Y + TARGET_HEIGHT) return step;
    if (y > TARGET_Y + TARGET_HEIGHT) return Infinity;
  }
  return Infinity;
}

function tacticalMove(target, objects, moveRange) {
  const slowestSpeed = objects.reduce((min, o) => Math.min(min, o.speed), 1);
  const horizon = Math.max(5, Math.ceil(ARENA_HEIGHT / slowestSpeed));
  const candidates = ['STAY', 'LEFT', 'RIGHT'];
  let best = 'STAY';
  let bestRisk = -1;

  for (const move of candidates) {
    const delta = move === 'LEFT' ? -moveRange : move === 'RIGHT' ? moveRange : 0;
    const candidateX = clampTargetX(target.x + delta, target.width);
    const minTurns = objects.length
      ? Math.min(...objects.map((o) => turnsUntilCollision(o, candidateX, target.width, horizon)))
      : Infinity;
    const risk = minTurns === Infinity ? horizon + 1 : minTurns;
    if (risk > bestRisk) {
      bestRisk = risk;
      best = move;
    }
  }
  return best;
}

function simulateBalanceMatch(rng, totalTurns) {
  let stage = 1;
  let rules = getStageRules(stage);
  let target = { x: (ARENA_WIDTH - rules.targetWidth) / 2, width: rules.targetWidth };
  let objects = [];
  let dodges = 0;
  let nearMisses = 0;

  for (let turn = 1; turn <= totalTurns; turn++) {
    const dropped = stageAttackerDrop(target, objects, stage, rng);
    if (dropped) objects.push(dropped);

    const move = tacticalMove(target, objects, rules.moveRange);
    const delta = move === 'LEFT' ? -rules.moveRange : move === 'RIGHT' ? rules.moveRange : 0;
    const nextTarget = { x: clampTargetX(target.x + delta, target.width), width: target.width };

    const advanced = objects.map((o) => ({ ...o, y: o.y + o.speed }));
    if (objects.some((o, i) => checkCollision(o, advanced[i], nextTarget))) {
      return { winner: 'ATTACKER', stage, turn };
    }

    let survivors = [];
    for (const o of advanced) {
      if (isNearMiss(o, nextTarget)) nearMisses++;
      if (o.y < ARENA_HEIGHT + o.height) survivors.push(o);
      else dodges++;
    }
    objects = survivors;
    target = nextTarget;

    const points = stageProgressPoints(turn, dodges, nearMisses);
    const nextStage = getStageForPoints(points);
    if (nextStage > stage) {
      stage = nextStage;
      rules = getStageRules(stage);
      target = { x: clampTargetX(target.x, rules.targetWidth), width: rules.targetWidth };
    }
  }
  return { winner: 'DEFENDER', stage, turn: totalTurns };
}

function runBalanceCheck() {
  const rng = mulberry32(7);
  const MATCHES = 500;
  for (const totalTurns of [15, 25, 40, 60]) {
    let attackerWins = 0;
    let stageSum = 0;
    for (let i = 0; i < MATCHES; i++) {
      const result = simulateBalanceMatch(rng, totalTurns);
      if (result.winner === 'ATTACKER') attackerWins++;
      stageSum += result.stage;
    }
    const attackerWinRate = ((attackerWins / MATCHES) * 100).toFixed(1);
    const defenderWinRate = (100 - attackerWins / MATCHES * 100).toFixed(1);
    console.log(
      `turns=${totalTurns}: attacker ${attackerWinRate}% / defender ${defenderWinRate}% ` +
        `(avg final stage ${(stageSum / MATCHES).toFixed(2)}/${STAGE_TABLE.length})`
    );
  }
}

if (process.argv.includes('--balance')) {
  runBalanceCheck();
} else {
  runTraining();
}
