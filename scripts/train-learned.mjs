#!/usr/bin/env node
/**
 * Offline trainer for the "Learned" AI tier's tiny defender policy network.
 *
 * This is a Node-only script (never shipped, never runs at runtime). It duplicates the
 * minimal slice of game constants and physics from src/game/objectTypes.ts,
 * src/game/PhysicsEngine.ts and src/game/CollisionEngine.ts needed to simulate episodes —
 * keep these two in sync if the real game's arena/object constants ever change.
 *
 * Trains a 10-input -> 8-hidden(tanh) -> 3-output feedforward net via a simple
 * evolutionary strategy (no ML deps), evaluated by average turns-survived across random
 * episodes with randomly spawning objects. Writes the winning weights to
 * src/controllers/learned/weights.ts.
 *
 * Run: node scripts/train-learned.mjs
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Mirrors src/game/objectTypes.ts ---
const ARENA_WIDTH = 12;
const ARENA_HEIGHT = 10;
const TARGET_WIDTH = 2;
const TARGET_Y = ARENA_HEIGHT - 1;
const TARGET_HEIGHT = 1;
const OBJECT_TYPES = [
  { speed: 1, width: 1, height: 1 }, // NORMAL
  { speed: 2, width: 1, height: 1 }, // FAST
  { speed: 0.5, width: 1, height: 1 }, // SLOW
  { speed: 1, width: 3, height: 1 }, // WIDE
  { speed: 1, width: 0.6, height: 1 }, // SMALL
];

// --- Mirrors src/game/CollisionEngine.ts + PhysicsEngine.ts ---
function checkCollision(before, after, target) {
  const sweptTop = Math.min(before.y, after.y);
  const sweptBottom = Math.max(before.y + before.height, after.y + after.height);
  if (!(sweptBottom >= TARGET_Y && sweptTop <= TARGET_Y + TARGET_HEIGHT)) return false;
  return after.x + after.width > target.x && after.x < target.x + target.width;
}
function clampTargetX(x, targetWidth) {
  return Math.min(Math.max(x, 0), ARENA_WIDTH - targetWidth);
}

// --- Mirrors src/controllers/learned/features.ts ---
const FEATURE_SIZE = 10;
const MOVE_ORDER = ['LEFT', 'STAY', 'RIGHT'];
function encodeFeatures(target, objects) {
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
  features.push(target.x / ARENA_WIDTH, target.width / ARENA_WIDTH);
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

const EPISODE_LENGTH = 40;
const SPAWN_PROBABILITY = 0.5;

function simulateEpisode(weights, rng) {
  let target = { x: (ARENA_WIDTH - TARGET_WIDTH) / 2, width: TARGET_WIDTH };
  let objects = [];

  for (let turn = 0; turn < EPISODE_LENGTH; turn++) {
    if (rng() < SPAWN_PROBABILITY) {
      const type = OBJECT_TYPES[Math.floor(rng() * OBJECT_TYPES.length)];
      const x = rng() * (ARENA_WIDTH - type.width);
      objects.push({ x, y: 0, width: type.width, height: type.height, speed: type.speed });
    }

    const features = encodeFeatures(target, objects);
    const move = MOVE_ORDER[argmax(forward(features, weights))];
    const delta = move === 'LEFT' ? -1 : move === 'RIGHT' ? 1 : 0;
    const nextTarget = { x: clampTargetX(target.x + delta, target.width), width: target.width };

    const advanced = objects.map((o) => ({ ...o, y: o.y + o.speed }));
    if (objects.some((o, i) => checkCollision(o, advanced[i], nextTarget))) return turn;

    objects = advanced.filter((o) => o.y < ARENA_HEIGHT + o.height);
    target = nextTarget;
  }
  return EPISODE_LENGTH;
}

function fitness(weights, rng, episodes = 25) {
  let total = 0;
  for (let i = 0; i < episodes; i++) total += simulateEpisode(weights, rng);
  return total / episodes;
}

function train() {
  const rng = mulberry32(42);
  const POPULATION = 50;
  const GENERATIONS = 150;
  const ELITE = 8;

  let population = Array.from({ length: POPULATION }, () => ({ weights: randomWeights(rng), fitness: -1 }));

  for (let gen = 0; gen < GENERATIONS; gen++) {
    for (const individual of population) {
      individual.fitness = fitness(individual.weights, rng);
    }
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

const best = train();
console.log(`Final best fitness: ${best.fitness.toFixed(2)} / ${EPISODE_LENGTH} turns survived on average`);

const output = `// Auto-generated by scripts/train-learned.mjs — do not hand-edit.
// Trained defender policy: avg survival ${best.fitness.toFixed(2)}/${EPISODE_LENGTH} turns across random episodes.
import type { NetworkWeights } from './network';

export const LEARNED_WEIGHTS: NetworkWeights = ${JSON.stringify(best.weights, null, 2)};
`;

writeFileSync(join(__dirname, '..', 'src', 'controllers', 'learned', 'weights.ts'), output);
console.log('Wrote src/controllers/learned/weights.ts');
