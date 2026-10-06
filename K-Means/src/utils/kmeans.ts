/**
 * Production-grade K-Means clustering engine with 3D support,
 * K-Means++ seeding, PCA projection, Silhouette analysis, Elbow curve,
 * and detailed iteration snapshots.
 */

export interface Point3D {
  id: number;
  originalIndex: number;
  coordinates: number[]; // arbitrary D-dim or 3D
  normalizedCoords: [number, number, number]; // normalized to [-50, 50] for 3D rendering
  clusterId: number;
  prevClusterId?: number;
  distanceToCentroid: number;
  rawData?: Record<string, unknown>;
}

export interface Centroid3D {
  id: number;
  coordinates: number[];
  normalizedCoords: [number, number, number];
  prevCoordinates?: number[];
  prevNormalizedCoords?: [number, number, number];
  color: string;
  size: number;
}

export type IterationPhase =
  | 'initialize'
  | 'assign'
  | 'recolor'
  | 'update'
  | 'measure'
  | 'converged';

export interface IterationSnapshot {
  iteration: number;
  phase: IterationPhase;
  phaseNarrative: string;
  centroids: Centroid3D[];
  labels: number[];
  inertia: number;
  centroidShifts: number[]; // distance each centroid moved in this step
  clusterSizes: number[];
  pointDistances: number[]; // distance from each point to assigned centroid
  isConverged: boolean;
}

export interface KMeansRunConfig {
  k: number;
  initMethod: 'k-means++' | 'random';
  maxIterations: number;
  tolerance: number;
  seed: number;
}

export interface KMeansRunResult {
  config: KMeansRunConfig;
  features: string[];
  iterations: IterationSnapshot[];
  finalIteration: IterationSnapshot;
  converged: boolean;
  totalIterations: number;
  runtimeMs: number;
  finalInertia: number;
  silhouette: {
    average: number;
    clusterScores: Record<number, number>;
    sampleScores: { id: number; cluster: number; score: number }[];
  };
  normalizationBounds: {
    min: number[];
    max: number[];
  };
}

// Curated high-contrast cluster color palette as defined in report blueprint
export const CLUSTER_COLORS = [
  '#00E0BA', // Mint / Cyan
  '#FF3483', // Vibrant Pink / Magenta
  '#FFCF00', // Electric Yellow
  '#91008D', // Deep Purple
  '#38BDF8', // Sky Blue
  '#F97316', // Vibrant Orange
  '#10B981', // Emerald
  '#EC4899', // Bright Rose
  '#A855F7', // Violet
  '#06B6D4', // Dark Cyan
];

export const getClusterColor = (id: number): string => {
  if (id < 0) return '#64748B'; // unassigned gray
  return CLUSTER_COLORS[id % CLUSTER_COLORS.length];
};

/** Seeded Pseudo-Random Number Generator (Mulberry32) */
export function createRNG(seed: number) {
  let s = Math.abs(seed | 0) || 12345;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t >>> 0) / 4294967296);
  };
}

export const euclideanDistance = (a: number[], b: number[]): number => {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
};

export const normalizeTo3D = (
  coords: number[],
  min: number[],
  max: number[],
  scale = 60
): [number, number, number] => {
  const norm = (val: number, i: number) => {
    const range = (max[i] - min[i]) || 1;
    return ((val - min[i]) / range - 0.5) * scale;
  };

  return [
    norm(coords[0] ?? 0, 0),
    norm(coords[1] ?? 0, 1),
    norm(coords[2] ?? 0, 2),
  ];
};

/**
 * Initialize centroids using K-Means++ or Uniform Random selection
 */
function initCentroids(
  rawPoints: number[][],
  k: number,
  method: 'k-means++' | 'random',
  rng: () => number
): number[][] {
  const n = rawPoints.length;
  if (n === 0) return [];
  if (n <= k) return rawPoints.map(p => [...p]);

  const chosen: number[][] = [];

  if (method === 'random') {
    const indices = new Set<number>();
    while (indices.size < k) {
      indices.add(Math.floor(rng() * n));
    }
    for (const idx of indices) {
      chosen.push([...rawPoints[idx]]);
    }
    return chosen;
  }

  // K-Means++ Seeding
  const firstIdx = Math.floor(rng() * n);
  chosen.push([...rawPoints[firstIdx]]);

  for (let step = 1; step < k; step++) {
    const distances = new Float64Array(n);
    let sumDistSq = 0;

    for (let i = 0; i < n; i++) {
      let minDist = Infinity;
      for (const c of chosen) {
        const d = euclideanDistance(rawPoints[i], c);
        if (d < minDist) minDist = d;
      }
      const dSq = minDist * minDist;
      distances[i] = dSq;
      sumDistSq += dSq;
    }

    if (sumDistSq === 0) {
      // Degenerate case, pick random remaining
      chosen.push([...rawPoints[Math.floor(rng() * n)]]);
      continue;
    }

    let threshold = rng() * sumDistSq;
    let selectedIdx = 0;
    for (let i = 0; i < n; i++) {
      threshold -= distances[i];
      if (threshold <= 0) {
        selectedIdx = i;
        break;
      }
    }
    chosen.push([...rawPoints[selectedIdx]]);
  }

  return chosen;
}

/**
 * Execute full K-Means run and record all iteration snapshots
 */
export function runKMeans(
  data: Record<string, number>[],
  features: string[],
  config: KMeansRunConfig
): KMeansRunResult {
  const startTime = performance.now();
  const rng = createRNG(config.seed);

  // Extract raw feature vectors
  const rawPoints: number[][] = data.map(row => features.map(f => row[f] ?? 0));
  const numPoints = rawPoints.length;
  const numFeatures = features.length;

  // Calculate min & max bounds for normalization
  const minVals = new Array(numFeatures).fill(Infinity);
  const maxVals = new Array(numFeatures).fill(-Infinity);

  for (const p of rawPoints) {
    for (let j = 0; j < numFeatures; j++) {
      if (p[j] < minVals[j]) minVals[j] = p[j];
      if (p[j] > maxVals[j]) maxVals[j] = p[j];
    }
  }

  const bounds = { min: minVals, max: maxVals };

  // Phase 0: Initialize
  const initialCentroidCoords = initCentroids(rawPoints, config.k, config.initMethod, rng);
  let currentCentroids: number[][] = initialCentroidCoords.map(c => [...c]);
  let currentLabels: number[] = new Array(numPoints).fill(-1);

  const iterations: IterationSnapshot[] = [];

  const createCentroidObjects = (
    coords: number[][],
    prevCoords?: number[][],
    sizes?: number[]
  ): Centroid3D[] => {
    return coords.map((c, i) => ({
      id: i,
      coordinates: [...c],
      normalizedCoords: normalizeTo3D(c, bounds.min, bounds.max),
      prevCoordinates: prevCoords ? [...prevCoords[i]] : undefined,
      prevNormalizedCoords: prevCoords
        ? normalizeTo3D(prevCoords[i], bounds.min, bounds.max)
        : undefined,
      color: getClusterColor(i),
      size: sizes ? sizes[i] : 0,
    }));
  };

  // Record initial state
  iterations.push({
    iteration: 0,
    phase: 'initialize',
    phaseNarrative: `Selected ${config.k} initial centroids using ${
      config.initMethod === 'k-means++' ? 'K-Means++ distance-weighted seeding' : 'Random sampling'
    }.`,
    centroids: createCentroidObjects(currentCentroids),
    labels: [...currentLabels],
    inertia: 0,
    centroidShifts: new Array(config.k).fill(0),
    clusterSizes: new Array(config.k).fill(0),
    pointDistances: new Array(numPoints).fill(0),
    isConverged: false,
  });

  let converged = false;
  let iter = 0;

  while (!converged && iter < config.maxIterations) {
    iter++;
    const prevCentroids = currentCentroids.map(c => [...c]);
    const prevLabels = [...currentLabels];

    // 1. Assign points to nearest centroid
    let assignmentChanged = false;
    const newLabels = new Array(numPoints);
    const pointDistances = new Array(numPoints);
    const clusterSizes = new Array(config.k).fill(0);
    let inertia = 0;

    for (let i = 0; i < numPoints; i++) {
      const p = rawPoints[i];
      let minDist = Infinity;
      let bestCluster = 0;

      for (let c = 0; c < config.k; c++) {
        const d = euclideanDistance(p, currentCentroids[c]);
        if (d < minDist) {
          minDist = d;
          bestCluster = c;
        }
      }

      newLabels[i] = bestCluster;
      pointDistances[i] = minDist;
      clusterSizes[bestCluster]++;
      inertia += minDist * minDist;

      if (bestCluster !== prevLabels[i]) {
        assignmentChanged = true;
      }
    }

    currentLabels = newLabels;

    // 2. Recompute centroids (means of assigned clusters)
    const newCentroids: number[][] = [];
    const centroidShifts: number[] = [];
    let maxShift = 0;

    for (let c = 0; c < config.k; c++) {
      const clusterPoints: number[][] = [];
      for (let i = 0; i < numPoints; i++) {
        if (currentLabels[i] === c) {
          clusterPoints.push(rawPoints[i]);
        }
      }

      if (clusterPoints.length === 0) {
        // Empty cluster fallback: keep previous or re-seed
        newCentroids.push([...prevCentroids[c]]);
        centroidShifts.push(0);
        continue;
      }

      const meanCoords = new Array(numFeatures).fill(0);
      for (const pt of clusterPoints) {
        for (let j = 0; j < numFeatures; j++) {
          meanCoords[j] += pt[j];
        }
      }
      for (let j = 0; j < numFeatures; j++) {
        meanCoords[j] /= clusterPoints.length;
      }

      const shift = euclideanDistance(prevCentroids[c], meanCoords);
      if (shift > maxShift) maxShift = shift;

      newCentroids.push(meanCoords);
      centroidShifts.push(shift);
    }

    currentCentroids = newCentroids;

    // Check convergence condition
    if (maxShift < config.tolerance || (!assignmentChanged && iter > 1)) {
      converged = true;
    }

    const narrative = converged
      ? `Algorithm converged at iteration ${iter}: Centroid shift (${maxShift.toFixed(
          5
        )}) is below tolerance ${config.tolerance}.`
      : `Iteration ${iter}: Points assigned to closest centroids. Centroids shifted by average ${
          (centroidShifts.reduce((a, b) => a + b, 0) / config.k).toFixed(4)
        }. Inertia dropped to ${Math.round(inertia)}.`;

    iterations.push({
      iteration: iter,
      phase: converged ? 'converged' : 'update',
      phaseNarrative: narrative,
      centroids: createCentroidObjects(currentCentroids, prevCentroids, clusterSizes),
      labels: [...currentLabels],
      inertia,
      centroidShifts,
      clusterSizes,
      pointDistances,
      isConverged: converged,
    });
  }

  const runtimeMs = Math.round(performance.now() - startTime);
  const finalIteration = iterations[iterations.length - 1];

  // Compute silhouette metrics for final state
  const silhouette = computeSilhouette(rawPoints, finalIteration.labels, config.k);

  return {
    config,
    features,
    iterations,
    finalIteration,
    converged,
    totalIterations: iterations.length - 1,
    runtimeMs,
    finalInertia: finalIteration.inertia,
    silhouette,
    normalizationBounds: bounds,
  };
}

/**
 * Silhouette score analysis using all points up to 500 rows and a deterministic sample above that.
 */
export function computeSilhouette(
  rawPoints: number[][],
  labels: number[],
  k: number
): {
  average: number;
  clusterScores: Record<number, number>;
  sampleScores: { id: number; cluster: number; score: number }[];
} {
  const n = rawPoints.length;
  if (k <= 1 || n <= k) {
    return { average: 0, clusterScores: {}, sampleScores: [] };
  }

  const maxSamples = 500;
  const sampledIndices = n <= maxSamples
    ? Array.from({ length: n }, (_, i) => i)
    : Array.from({ length: maxSamples }, (_, i) => Math.floor(i * n / maxSamples));
  const points = sampledIndices.map((index) => rawPoints[index]);
  const sampledLabels = sampledIndices.map((index) => labels[index]);

  // Pre-group indices by cluster
  const clusters: number[][] = Array.from({ length: k }, () => []);
  for (let i = 0; i < points.length; i++) {
    const c = sampledLabels[i];
    if (c >= 0 && c < k) {
      clusters[c].push(i);
    }
  }

  const sampleScores: { id: number; cluster: number; score: number }[] = [];
  const clusterSums: number[] = new Array(k).fill(0);
  const clusterCounts: number[] = new Array(k).fill(0);
  let totalSum = 0;

  for (let i = 0; i < points.length; i++) {
    const myCluster = sampledLabels[i];
    const myClusterPoints = clusters[myCluster];

    if (!myClusterPoints || myClusterPoints.length <= 1) {
      sampleScores.push({ id: sampledIndices[i], cluster: myCluster, score: 0 });
      continue;
    }

    // Mean intra-cluster distance a(i)
    let aSum = 0;
    for (const otherIdx of myClusterPoints) {
      if (i !== otherIdx) {
        aSum += euclideanDistance(points[i], points[otherIdx]);
      }
    }
    const a = aSum / (myClusterPoints.length - 1);

    // Mean nearest-cluster distance b(i)
    let b = Infinity;
    for (let c = 0; c < k; c++) {
      if (c === myCluster || clusters[c].length === 0) continue;
      let otherSum = 0;
      for (const otherIdx of clusters[c]) {
        otherSum += euclideanDistance(points[i], points[otherIdx]);
      }
      const meanDist = otherSum / clusters[c].length;
      if (meanDist < b) b = meanDist;
    }

    const s = Math.max(a, b) === 0 ? 0 : (b - a) / Math.max(a, b);
    sampleScores.push({ id: sampledIndices[i], cluster: myCluster, score: parseFloat(s.toFixed(4)) });

    clusterSums[myCluster] += s;
    clusterCounts[myCluster]++;
    totalSum += s;
  }

  const clusterScores: Record<number, number> = {};
  for (let c = 0; c < k; c++) {
    clusterScores[c] = clusterCounts[c] > 0
      ? parseFloat((clusterSums[c] / clusterCounts[c]).toFixed(4))
      : 0;
  }

  const average = parseFloat((totalSum / Math.max(points.length, 1)).toFixed(4));

  return { average, clusterScores, sampleScores };
}

/**
 * Compute Elbow curve (WCSS vs K) for K = 1 to maxK
 */
export function computeElbowCurve(
  data: Record<string, number>[],
  features: string[],
  maxK = 8,
  seed = 42
): { k: number; inertia: number }[] {
  const result: { k: number; inertia: number }[] = [];
  const maxSampleSize = 2000;
  const sample = data.length <= maxSampleSize
    ? data
    : Array.from({ length: maxSampleSize }, (_, i) => data[Math.floor(i * data.length / maxSampleSize)]);
  const rawPoints = sample.map((row) => features.map((feature) => row[feature] ?? 0));
  const limit = Math.min(maxK, rawPoints.length);

  for (let k = 1; k <= limit; k++) {
    const rng = createRNG(seed);
    let centroids = initCentroids(rawPoints, k, 'k-means++', rng);
    let inertia = 0;

    for (let iteration = 0; iteration < 30; iteration++) {
      const sums = Array.from({ length: k }, () => new Array(features.length).fill(0));
      const counts = new Array(k).fill(0);
      inertia = 0;

      for (const point of rawPoints) {
        let nearest = 0;
        let minDistance = Infinity;
        for (let c = 0; c < k; c++) {
          const distance = euclideanDistance(point, centroids[c]);
          if (distance < minDistance) {
            minDistance = distance;
            nearest = c;
          }
        }
        counts[nearest]++;
        inertia += minDistance * minDistance;
        for (let feature = 0; feature < features.length; feature++) {
          sums[nearest][feature] += point[feature];
        }
      }

      let maxShift = 0;
      const nextCentroids = centroids.map((centroid, c) => {
        if (counts[c] === 0) return centroid;
        const mean = sums[c].map((sum: number) => sum / counts[c]);
        maxShift = Math.max(maxShift, euclideanDistance(centroid, mean));
        return mean;
      });
      centroids = nextCentroids;
      if (maxShift < 1e-4) break;
    }

    result.push({ k, inertia: Math.round(inertia) });
  }

  return result;
}

/**
 * PCA 3D Dimensionality Reduction using Power Iteration & Covariance Deflation
 */
export function computePCA3D(
  data: Record<string, number>[],
  features: string[]
): {
  projectedData: Record<string, number>[];
  explainedVarianceRatio: [number, number, number];
  totalExplainedVariance: number;
} {
  const n = data.length;
  const d = features.length;

  if (n === 0 || d < 3) {
    // If fewer than 3 features, pad or return raw
    const projected = data.map(row => ({
      PC1: row[features[0]] ?? 0,
      PC2: row[features[1]] ?? 0,
      PC3: row[features[2]] ?? 0,
    }));
    return {
      projectedData: projected,
      explainedVarianceRatio: [0.5, 0.3, 0.2],
      totalExplainedVariance: 1.0,
    };
  }

  // 1. Center the data
  const means = new Array(d).fill(0);
  for (const row of data) {
    for (let j = 0; j < d; j++) {
      means[j] += row[features[j]] ?? 0;
    }
  }
  for (let j = 0; j < d; j++) means[j] /= n;

  const X: number[][] = data.map(row =>
    features.map((f, j) => (row[f] ?? 0) - means[j])
  );

  // 2. Covariance matrix (d x d)
  const cov: number[][] = Array.from({ length: d }, () => new Array(d).fill(0));
  for (let i = 0; i < d; i++) {
    for (let j = 0; j < d; j++) {
      let sum = 0;
      for (let r = 0; r < n; r++) {
        sum += X[r][i] * X[r][j];
      }
      cov[i][j] = sum / (n - 1 || 1);
    }
  }

  // Total variance (trace of covariance matrix)
  let totalVar = 0;
  for (let i = 0; i < d; i++) totalVar += cov[i][i];
  if (totalVar === 0) totalVar = 1;

  // 3. Power iteration to find top 3 eigenvectors
  const eigenvectors: number[][] = [];
  const eigenvalues: number[] = [];

  const matrixMultiplyVec = (mat: number[][], vec: number[]): number[] => {
    return mat.map(row => row.reduce((acc, val, idx) => acc + val * vec[idx], 0));
  };

  const vectorNorm = (vec: number[]): number => {
    return Math.sqrt(vec.reduce((acc, v) => acc + v * v, 0)) || 1;
  };

  for (let comp = 0; comp < 3; comp++) {
    let vec: number[] = new Array(d).fill(0).map((_, idx) => (idx === comp ? 1 : 0.5));
    let norm = vectorNorm(vec);
    vec = vec.map(v => v / norm);

    let lambda = 0;
    for (let iter = 0; iter < 40; iter++) {
      const nextVec = matrixMultiplyVec(cov, vec);
      lambda = vectorNorm(nextVec);
      vec = nextVec.map(v => v / lambda);
    }

    eigenvectors.push(vec);
    eigenvalues.push(lambda);

    // Deflate covariance matrix: Cov = Cov - lambda * (v * v^T)
    for (let r = 0; r < d; r++) {
      for (let c = 0; c < d; c++) {
        cov[r][c] -= lambda * vec[r] * vec[c];
      }
    }
  }

  // 4. Project data onto PC1, PC2, PC3
  const projectedData = X.map(row => {
    const pc1 = row.reduce((sum, val, idx) => sum + val * eigenvectors[0][idx], 0);
    const pc2 = row.reduce((sum, val, idx) => sum + val * eigenvectors[1][idx], 0);
    const pc3 = row.reduce((sum, val, idx) => sum + val * eigenvectors[2][idx], 0);
    return {
      PC1: parseFloat(pc1.toFixed(4)),
      PC2: parseFloat(pc2.toFixed(4)),
      PC3: parseFloat(pc3.toFixed(4)),
    };
  });

  const ev1 = parseFloat((eigenvalues[0] / totalVar).toFixed(4));
  const ev2 = parseFloat((eigenvalues[1] / totalVar).toFixed(4));
  const ev3 = parseFloat((eigenvalues[2] / totalVar).toFixed(4));
  const totalEV = parseFloat((ev1 + ev2 + ev3).toFixed(4));

  return {
    projectedData,
    explainedVarianceRatio: [ev1, ev2, ev3],
    totalExplainedVariance: totalEV,
  };
}

/**
 * Predict cluster for a 3D or arbitrary dimensional synthetic query point
 */
export function predictQueryPoint(
  queryCoords: number[],
  centroids: Centroid3D[]
): {
  predictedCluster: number;
  minDistance: number;
  winnerCentroid: Centroid3D;
  allDistances: { clusterId: number; distance: number; color: string }[];
  marginToSecond: number;
} {
  const distances = centroids.map(c => {
    const d = euclideanDistance(queryCoords, c.coordinates);
    return {
      clusterId: c.id,
      distance: parseFloat(d.toFixed(4)),
      color: c.color,
    };
  });

  distances.sort((a, b) => a.distance - b.distance);

  const winner = centroids.find(c => c.id === distances[0].clusterId)!;
  const secondDist = distances[1] ? distances[1].distance : distances[0].distance;

  return {
    predictedCluster: distances[0].clusterId,
    minDistance: distances[0].distance,
    winnerCentroid: winner,
    allDistances: distances,
    marginToSecond: parseFloat((secondDist - distances[0].distance).toFixed(4)),
  };
}
