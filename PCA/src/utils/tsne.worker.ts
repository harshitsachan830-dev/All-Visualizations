/// <reference lib="webworker" />

type TSNERequest = {
  type: 'run';
  data: number[][];
  initial: number[][];
  perplexity: number;
  learningRate: number;
  iterations: number;
  seed: number;
  outputDimensions: number;
};

const ctx: DedicatedWorkerGlobalScope = self as DedicatedWorkerGlobalScope;

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function gaussian(random: () => number) {
  const u = Math.max(random(), 1e-12);
  const v = random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function runTSNE(request: TSNERequest) {
  const { data, initial, learningRate, iterations, outputDimensions } = request;
  const n = data.length;
  const dimensions = data[0]?.length || 0;
  if (n < 4 || dimensions === 0) throw new Error('t-SNE needs at least 4 samples and one numeric feature.');

  const distances = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      let sum = 0;
      for (let k = 0; k < dimensions; k++) {
        const delta = data[i][k] - data[j][k];
        sum += delta * delta;
      }
      distances[i * n + j] = sum;
      distances[j * n + i] = sum;
    }
  }

  const targetEntropy = Math.log(Math.min(request.perplexity, Math.max(2, n - 1)));
  const conditional = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    let beta = 1;
    let lower = -Infinity;
    let upper = Infinity;
    const row = new Float64Array(n);
    for (let search = 0; search < 50; search++) {
      let sum = 0;
      let weighted = 0;
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const p = Math.exp(-distances[i * n + j] * beta);
        row[j] = p;
        sum += p;
        weighted += distances[i * n + j] * p;
      }
      const safeSum = Math.max(sum, 1e-300);
      const entropy = Math.log(safeSum) + (beta * weighted) / safeSum;
      const difference = entropy - targetEntropy;
      if (Math.abs(difference) < 1e-5) break;
      if (difference > 0) {
        lower = beta;
        beta = Number.isFinite(upper) ? (beta + upper) / 2 : beta * 2;
      } else {
        upper = beta;
        beta = Number.isFinite(lower) ? (beta + lower) / 2 : beta / 2;
      }
    }
    let sum = 0;
    for (let j = 0; j < n; j++) sum += row[j];
    for (let j = 0; j < n; j++) conditional[i * n + j] = row[j] / Math.max(sum, 1e-300);
  }

  const probabilities = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j) probabilities[i * n + j] = (conditional[i * n + j] + conditional[j * n + i]) / (2 * n);
    }
  }

  const random = seededRandom(request.seed);
  const y = new Float64Array(n * outputDimensions);
  if (initial.length === n) {
    const means = new Float64Array(outputDimensions);
    for (const point of initial) for (let d = 0; d < outputDimensions; d++) means[d] += point[d] || 0;
    for (let d = 0; d < outputDimensions; d++) means[d] /= n;
    let scale = 0;
    for (const point of initial) for (let d = 0; d < outputDimensions; d++) scale = Math.max(scale, Math.abs((point[d] || 0) - means[d]));
    scale = scale > 1e-12 ? 0.01 / scale : 0.01;
    for (let i = 0; i < n; i++) {
      for (let d = 0; d < outputDimensions; d++) {
        y[i * outputDimensions + d] = ((initial[i][d] || 0) - means[d]) * scale + gaussian(random) * 1e-4;
      }
    }
  } else {
    for (let i = 0; i < n * outputDimensions; i++) y[i] = gaussian(random) * 1e-4;
  }

  const velocity = new Float64Array(n * outputDimensions);
  const gains = new Float64Array(n * outputDimensions).fill(1);
  const numerators = new Float64Array(n * n);
  const gradients = new Float64Array(n * outputDimensions);
  const history: { iteration: number; kl: number }[] = [];
  let finalKL = 0;

  for (let iteration = 0; iteration < iterations; iteration++) {
    let qSum = 0;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let squaredDistance = 0;
        for (let d = 0; d < outputDimensions; d++) {
          const delta = y[i * outputDimensions + d] - y[j * outputDimensions + d];
          squaredDistance += delta * delta;
        }
        const value = 1 / (1 + squaredDistance);
        numerators[i * n + j] = value;
        numerators[j * n + i] = value;
        qSum += 2 * value;
      }
    }
    qSum = Math.max(qSum, 1e-300);
    gradients.fill(0);
    let kl = 0;
    const exaggeration = iteration < Math.min(100, Math.floor(iterations * 0.2)) ? 4 : 1;

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const q = Math.max(numerators[i * n + j] / qSum, 1e-300);
        const p = probabilities[i * n + j];
        if (p > 0) kl += p * Math.log(p / q);
        const multiplier = 4 * (p * exaggeration - q) * numerators[i * n + j];
        for (let d = 0; d < outputDimensions; d++) {
          gradients[i * outputDimensions + d] += multiplier * (y[i * outputDimensions + d] - y[j * outputDimensions + d]);
        }
      }
    }
    finalKL = kl;

    const momentum = iteration < 250 ? 0.5 : 0.8;
    for (let i = 0; i < n * outputDimensions; i++) {
      const grad = gradients[i];
      gains[i] = (Math.sign(grad) !== Math.sign(velocity[i]) ? gains[i] + 0.2 : gains[i] * 0.8);
      gains[i] = Math.max(gains[i], 0.01);
      velocity[i] = momentum * velocity[i] - learningRate * gains[i] * grad;
      y[i] += velocity[i];
    }
    const center = new Float64Array(outputDimensions);
    for (let i = 0; i < n; i++) for (let d = 0; d < outputDimensions; d++) center[d] += y[i * outputDimensions + d];
    for (let d = 0; d < outputDimensions; d++) center[d] /= n;
    for (let i = 0; i < n; i++) for (let d = 0; d < outputDimensions; d++) y[i * outputDimensions + d] -= center[d];

    if ((iteration + 1) % 25 === 0 || iteration + 1 === iterations) {
      history.push({ iteration: iteration + 1, kl: finalKL });
      ctx.postMessage({
        type: 'progress',
        iteration: iteration + 1,
        total: iterations,
        kl: finalKL,
        positions: Array.from(y)
      });
    }
  }

  const neighbors = Math.min(10, n - 1);
  let overlap = 0;
  for (let i = 0; i < n; i++) {
    const inputNearest = Array.from({ length: n }, (_, j) => j)
      .filter(j => j !== i)
      .sort((a, b) => distances[i * n + a] - distances[i * n + b])
      .slice(0, neighbors);
    const embeddedNearest: number[] = [];
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      embeddedNearest.push(j);
    }
    embeddedNearest.sort((a, b) => {
      let aDistance = 0, bDistance = 0;
      for (let d = 0; d < outputDimensions; d++) {
        const ad = y[i * outputDimensions + d] - y[a * outputDimensions + d];
        const bd = y[i * outputDimensions + d] - y[b * outputDimensions + d];
        aDistance += ad * ad;
        bDistance += bd * bd;
      }
      return aDistance - bDistance;
    });
    const retained = new Set(embeddedNearest.slice(0, neighbors));
    overlap += inputNearest.filter(index => retained.has(index)).length / neighbors;
  }

  return {
    positions: Array.from(y),
    outputDimensions,
    history,
    kl: finalKL,
    neighborhoodRetention: (overlap / n) * 100
  };
}

ctx.onmessage = (event: MessageEvent<TSNERequest>) => {
  if (event.data.type !== 'run') return;
  try {
    ctx.postMessage({ type: 'started' });
    ctx.postMessage({ type: 'complete', result: runTSNE(event.data) });
  } catch (error) {
    ctx.postMessage({ type: 'error', message: error instanceof Error ? error.message : 't-SNE could not complete.' });
  }
};
