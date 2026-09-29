export interface NetworkWeights {
  w1: number[][];
  b1: number[];
  w2: number[][];
  b2: number[];
}

/** Forward pass only — no training at runtime, weights are baked in ahead of time. */
export function forward(features: number[], weights: NetworkWeights): number[] {
  const hidden = weights.w1.map(
    (row, i) => Math.tanh(row.reduce((sum, w, j) => sum + w * features[j], 0) + weights.b1[i])
  );
  return weights.w2.map((row, i) => row.reduce((sum, w, j) => sum + w * hidden[j], 0) + weights.b2[i]);
}

export function argmax(values: number[]): number {
  let best = 0;
  for (let i = 1; i < values.length; i++) if (values[i] > values[best]) best = i;
  return best;
}
