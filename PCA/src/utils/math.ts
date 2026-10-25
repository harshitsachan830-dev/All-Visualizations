import {
  ColumnProfile,
  DBSCANResult,
  ImputationReport,
  MissingValueStrategy,
  PCADataPoint,
  PCALoading,
  PCAResult,
  RawDataRow,
  ReconstructionReport,
  ScalingStrategy
} from '../types/pca';

// Check if a value is null, undefined, NaN, empty string, or a known missing sentinel.
export function isMissing(val: any): boolean {
  if (val === null || val === undefined) return true;
  if (typeof val === 'number') return isNaN(val);
  if (typeof val === 'string') {
    const trimmed = val.trim();
    return (
      trimmed === '' ||
      trimmed === '?' ||
      trimmed.toLowerCase() === 'nan' ||
      trimmed.toLowerCase() === 'null' ||
      trimmed.toLowerCase() === 'na' ||
      trimmed.toLowerCase() === 'none' ||
      trimmed.toLowerCase() === 'n/a'
    );
  }
  return false;
}

export function isNumericString(val: any): boolean {
  if (val === null || val === undefined) return false;
  if (typeof val === 'number') return !isNaN(val);
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed === '') return false;
    return !isNaN(Number(trimmed));
  }
  return false;
}

export function parseNumeric(val: any): number | null {
  if (isMissing(val)) return null;
  const num = typeof val === 'number' ? val : Number(String(val).trim());
  return isNaN(num) ? null : num;
}

export function calculateMean(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sum = arr.reduce((acc, v) => acc + v, 0);
  return sum / arr.length;
}

export function calculateMedian(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export function calculateQuantile(arr: number[], q: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

export function calculateMode(arr: (number | string)[]): number | string {
  if (arr.length === 0) return 0;
  const freqMap = new Map<number | string, number>();
  let maxFreq = 0;
  let modeVal = arr[0];

  for (const v of arr) {
    const count = (freqMap.get(v) || 0) + 1;
    freqMap.set(v, count);
    if (count > maxFreq) {
      maxFreq = count;
      modeVal = v;
    }
  }
  return modeVal;
}

export function calculateStd(arr: number[], mean: number): number {
  if (arr.length <= 1) return 1;
  const variance = arr.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (arr.length - 1);
  return Math.sqrt(Math.max(variance, 1e-12));
}

export function profileColumns(rows: RawDataRow[], headers: string[]): ColumnProfile[] {
  return headers.map(header => {
    const rawValues = rows.map(r => r[header]);
    const validNumbers: number[] = [];
    let missingCount = 0;
    const uniqueSet = new Set<any>();

    for (const v of rawValues) {
      if (isMissing(v)) {
        missingCount++;
      } else {
        uniqueSet.add(v);
        const parsed = parseNumeric(v);
        if (parsed !== null) {
          validNumbers.push(parsed);
        }
      }
    }

    const totalCount = rows.length;
    const missingPercentage = totalCount > 0 ? (missingCount / totalCount) * 100 : 0;
    const isNumeric = validNumbers.length >= (totalCount - missingCount) * 0.8 && validNumbers.length > 0;

    let mean: number | undefined;
    let median: number | undefined;
    let std: number | undefined;
    let min: number | undefined;
    let max: number | undefined;

    if (isNumeric && validNumbers.length > 0) {
      mean = calculateMean(validNumbers);
      median = calculateMedian(validNumbers);
      std = calculateStd(validNumbers, mean);
      min = Math.min(...validNumbers);
      max = Math.max(...validNumbers);
    }

    const nonMissing = rawValues.filter((v): v is string | number => !isMissing(v));
    const mode = nonMissing.length > 0 ? calculateMode(nonMissing) : undefined;
    const isConstant = isNumeric && min !== undefined && max !== undefined && min === max;

    return {
      name: header,
      isNumeric,
      totalCount,
      missingCount,
      missingPercentage,
      uniqueValues: uniqueSet.size,
      mean,
      median,
      mode,
      min,
      max,
      std,
      isConstant
    };
  });
}

export function imputeAndCleanData(
  rows: RawDataRow[],
  selectedFeatures: string[],
  labelCol: string,
  strategy: MissingValueStrategy
): { cleanedRows: RawDataRow[]; report: ImputationReport } {
  let imputedCellsCount = 0;
  const imputedPerColumn: Record<string, { count: number; value: number | string }> = {};

  selectedFeatures.forEach(feat => {
    imputedPerColumn[feat] = { count: 0, value: 0 };
  });

  if (strategy === 'drop') {
    const keptRows: RawDataRow[] = [];
    let droppedCount = 0;

    for (const r of rows) {
      let hasMissingFeature = false;
      for (const feat of selectedFeatures) {
        if (isMissing(r[feat])) {
          hasMissingFeature = true;
          break;
        }
      }
      if (hasMissingFeature) {
        droppedCount++;
      } else {
        keptRows.push({ ...r });
      }
    }

    return {
      cleanedRows: keptRows,
      report: {
        strategy,
        imputedCellsCount: 0,
        imputedPerColumn,
        droppedRowsCount: droppedCount,
        finalRowCount: keptRows.length
      }
    };
  }

  const replacementValues: Record<string, number> = {};

  for (const feat of selectedFeatures) {
    const validNums = rows
      .map(r => parseNumeric(r[feat]))
      .filter((v): v is number => v !== null);

    let replacement = 0;
    if (strategy === 'mean') {
      replacement = calculateMean(validNums);
    } else if (strategy === 'median') {
      replacement = calculateMedian(validNums);
    } else if (strategy === 'mode') {
      const modeVal = calculateMode(validNums);
      replacement = typeof modeVal === 'number' ? modeVal : Number(modeVal) || 0;
    }

    replacementValues[feat] = Number(replacement.toFixed(4));
    imputedPerColumn[feat].value = replacementValues[feat];
  }

  const cleanedRows: RawDataRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const srcRow = rows[i];
    const newRow: RawDataRow = { ...srcRow };

    for (const feat of selectedFeatures) {
      if (isMissing(newRow[feat])) {
        newRow[feat] = replacementValues[feat];
        imputedCellsCount++;
        imputedPerColumn[feat].count++;
      } else {
        newRow[feat] = parseNumeric(newRow[feat]);
      }
    }

    cleanedRows.push(newRow);
  }

  return {
    cleanedRows,
    report: {
      strategy,
      imputedCellsCount,
      imputedPerColumn,
      droppedRowsCount: 0,
      finalRowCount: cleanedRows.length
    }
  };
}

export function computeCovarianceMatrix(Z: number[][]): number[][] {
  const n = Z.length;
  const p = Z[0].length;
  const cov: number[][] = Array.from({ length: p }, () => Array(p).fill(0));
  const denom = n > 1 ? n - 1 : 1;

  for (let j1 = 0; j1 < p; j1++) {
    for (let j2 = j1; j2 < p; j2++) {
      let sum = 0;
      for (let i = 0; i < n; i++) {
        sum += Z[i][j1] * Z[i][j2];
      }
      const val = sum / denom;
      cov[j1][j2] = val;
      cov[j2][j1] = val;
    }
  }
  return cov;
}

export function jacobiEigenDecomposition(A: number[][], maxIterations = 200, epsilon = 1e-10) {
  const n = A.length;
  const V: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  );
  const D: number[][] = A.map(row => [...row]);

  let iterations = 0;
  while (iterations < maxIterations) {
    let maxOffDiag = 0;
    let p = 0;
    let q = 1;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const absVal = Math.abs(D[i][j]);
        if (absVal > maxOffDiag) {
          maxOffDiag = absVal;
          p = i;
          q = j;
        }
      }
    }

    if (maxOffDiag < epsilon) break;

    const app = D[p][p];
    const aqq = D[q][q];
    const apq = D[p][q];

    const theta = (aqq - app) / (2 * apq);
    let t: number;
    if (theta >= 0) {
      t = 1 / (theta + Math.sqrt(1 + theta * theta));
    } else {
      t = -1 / (-theta + Math.sqrt(1 + theta * theta));
    }

    const c = 1 / Math.sqrt(1 + t * t);
    const s = t * c;
    const tau = s / (1 + c);

    D[p][p] = app - t * apq;
    D[q][q] = aqq + t * apq;
    D[p][q] = 0;
    D[q][p] = 0;

    for (let i = 0; i < n; i++) {
      if (i !== p && i !== q) {
        const a_ip = D[i][p];
        const a_iq = D[i][q];
        D[i][p] = a_ip - s * (a_iq + tau * a_ip);
        D[p][i] = D[i][p];
        D[i][q] = a_iq + s * (a_ip - tau * a_iq);
        D[q][i] = D[i][q];
      }
    }

    for (let i = 0; i < n; i++) {
      const v_ip = V[i][p];
      const v_iq = V[i][q];
      V[i][p] = v_ip - s * (v_iq + tau * v_ip);
      V[i][q] = v_iq + s * (v_ip - tau * v_iq);
    }

    iterations++;
  }

  const rawEigenvalues = D.map((row, i) => Math.max(0, row[i]));
  const paired: { eigenvalue: number; eigenvector: number[] }[] = [];

  for (let j = 0; j < n; j++) {
    const colVector: number[] = [];
    for (let i = 0; i < n; i++) {
      colVector.push(V[i][j]);
    }

    let maxIdx = 0;
    let maxMag = 0;
    for (let i = 0; i < n; i++) {
      if (Math.abs(colVector[i]) > maxMag) {
        maxMag = Math.abs(colVector[i]);
        maxIdx = i;
      }
    }
    if (colVector[maxIdx] < 0) {
      for (let i = 0; i < n; i++) {
        colVector[i] = -colVector[i];
      }
    }

    paired.push({
      eigenvalue: rawEigenvalues[j],
      eigenvector: colVector
    });
  }

  paired.sort((a, b) => b.eigenvalue - a.eigenvalue);

  return {
    eigenvalues: paired.map(p => p.eigenvalue),
    eigenvectors: paired.map(p => p.eigenvector)
  };
}

export function performPCA(
  rows: RawDataRow[],
  selectedFeatures: string[],
  labelCol: string,
  scaling: ScalingStrategy = 'standard'
): PCAResult {
  const n = rows.length;
  const p = selectedFeatures.length;

  if (n === 0 || p === 0) {
    throw new Error('Dataset or selected features cannot be empty for PCA calculation.');
  }

  const X: number[][] = [];
  const labels: string[] = [];

  for (let i = 0; i < n; i++) {
    const row = rows[i];
    const rowVals: number[] = [];
    for (let j = 0; j < p; j++) {
      const val = Number(row[selectedFeatures[j]]) || 0;
      rowVals.push(val);
    }
    X.push(rowVals);
    labels.push(row[labelCol] !== undefined && row[labelCol] !== null ? String(row[labelCol]) : `Sample ${i + 1}`);
  }

  const meanVector: number[] = [];
  const stdVector: number[] = [];
  const minVector: number[] = [];
  const maxVector: number[] = [];
  const medianVector: number[] = [];
  const iqrVector: number[] = [];

  for (let j = 0; j < p; j++) {
    const colVals = X.map(r => r[j]);
    const mean = calculateMean(colVals);
    const std = calculateStd(colVals, mean);
    const min = Math.min(...colVals);
    const max = Math.max(...colVals);
    const median = calculateMedian(colVals);
    const q1 = calculateQuantile(colVals, 0.25);
    const q3 = calculateQuantile(colVals, 0.75);
    const iqr = Math.max(q3 - q1, 1e-6);

    meanVector.push(mean);
    stdVector.push(std);
    minVector.push(min);
    maxVector.push(max);
    medianVector.push(median);
    iqrVector.push(iqr);
  }

  const Z: number[][] = [];
  for (let i = 0; i < n; i++) {
    const zRow: number[] = [];
    for (let j = 0; j < p; j++) {
      const val = X[i][j];
      let scaled = val - meanVector[j];
      if (scaling === 'standard') {
        scaled = scaled / (stdVector[j] > 1e-9 ? stdVector[j] : 1);
      } else if (scaling === 'minmax') {
        const range = maxVector[j] - minVector[j];
        scaled = range > 1e-9 ? (val - minVector[j]) / range - 0.5 : 0;
      } else if (scaling === 'robust') {
        scaled = (val - medianVector[j]) / iqrVector[j];
      }
      zRow.push(scaled);
    }
    Z.push(zRow);
  }

  const covarianceMatrix = computeCovarianceMatrix(Z);
  const correlationMatrix = computeCovarianceMatrix(
    Z.map(row => row.map((v, j) => (stdVector[j] > 1e-9 ? v : 0)))
  );

  const { eigenvalues, eigenvectors } = jacobiEigenDecomposition(covarianceMatrix);
  const totalVariance = eigenvalues.reduce((acc, v) => acc + v, 0);

  const explainedVariance: number[] = [];
  const cumulativeVariance: number[] = [];
  let runningSum = 0;

  for (let k = 0; k < p; k++) {
    const ratio = totalVariance > 1e-12 ? eigenvalues[k] / totalVariance : 0;
    explainedVariance.push(ratio);
    runningSum += ratio;
    cumulativeVariance.push(Math.min(1, runningSum));
  }

  const transformedData: PCADataPoint[] = [];

  for (let i = 0; i < n; i++) {
    const coords: number[] = [];
    const zRow = Z[i];

    for (let k = 0; k < p; k++) {
      const eigenvec = eigenvectors[k];
      let projection = 0;
      for (let j = 0; j < p; j++) {
        projection += zRow[j] * eigenvec[j];
      }
      coords.push(projection);
    }

    const origObj: Record<string, number> = {};
    for (let j = 0; j < p; j++) {
      origObj[selectedFeatures[j]] = X[i][j];
    }

    transformedData.push({
      id: i,
      label: labels[i],
      original: origObj,
      pc1: coords[0] || 0,
      pc2: coords[1] || 0,
      pc3: coords[2] || 0,
      coords
    });
  }

  const loadings: PCALoading[] = [];
  for (let j = 0; j < p; j++) {
    const v1 = eigenvectors[0] ? eigenvectors[0][j] * Math.sqrt(Math.max(0, eigenvalues[0])) : 0;
    const v2 = eigenvectors[1] ? eigenvectors[1][j] * Math.sqrt(Math.max(0, eigenvalues[1])) : 0;
    const v3 = eigenvectors[2] ? eigenvectors[2][j] * Math.sqrt(Math.max(0, eigenvalues[2])) : 0;

    const fullVector: number[] = [];
    for (let k = 0; k < p; k++) {
      fullVector.push(eigenvectors[k][j] * Math.sqrt(Math.max(0, eigenvalues[k])));
    }

    const importance = Math.sqrt(v1 * v1 + v2 * v2 + v3 * v3);

    loadings.push({
      feature: selectedFeatures[j],
      pc1: v1,
      pc2: v2,
      pc3: v3,
      vector: fullVector,
      importance
    });
  }

  return {
    featureNames: selectedFeatures,
    eigenvalues,
    eigenvectors,
    explainedVariance,
    cumulativeVariance,
    transformedData,
    loadings,
    meanVector,
    stdVector,
    minVector,
    maxVector,
    medianVector,
    iqrVector,
    rawMatrix: X,
    centeredMatrix: Z,
    covarianceMatrix,
    correlationMatrix,
    totalVariance,
    nComponents: p
  };
}

// ----------------------------------------------------
// DBSCAN Density-Based Clustering Algorithm
// ----------------------------------------------------
const CLUSTER_COLORS = [
  '#0d9488', // teal
  '#ea580c', // orange
  '#2563eb', // blue
  '#9333ea', // purple
  '#16a34a', // green
  '#dc2626', // red
  '#d97706', // amber
  '#0891b2'  // cyan
];
const NOISE_COLOR = '#94a3b8'; // slate noise

export function runDBSCAN(
  points: number[][],
  eps: number,
  minSamples: number,
  weights?: number[]
): DBSCANResult {
  const n = points.length;
  const labels = new Array<number>(n).fill(-2); // -2: unvisited
  let clusterId = 0;

  // Use variance weights or default to 2D-dominant weighting if points have > 2 dimensions
  const d = points[0]?.length || 1;
  const w = weights && weights.length >= d
    ? weights.slice(0, d)
    : d > 2
      // Normalize weights so lower noise components don't artificially blow up Euclidean distance
      ? [1.0, 1.0, ...new Array(d - 2).fill(0.25)]
      : new Array(d).fill(1.0);

  // Weighted Euclidean distance
  const dist = (p1: number[], p2: number[]): number => {
    let sum = 0;
    for (let i = 0; i < d; i++) {
      const diff = p1[i] - p2[i];
      sum += diff * diff * (w[i] || 1);
    }
    return Math.sqrt(sum);
  };

  const getNeighbors = (idx: number): number[] => {
    const neighbors: number[] = [];
    const target = points[idx];
    for (let i = 0; i < n; i++) {
      if (dist(target, points[i]) <= eps) {
        neighbors.push(i);
      }
    }
    return neighbors;
  };

  for (let i = 0; i < n; i++) {
    if (labels[i] !== -2) continue; // already processed

    const neighbors = getNeighbors(i);
    if (neighbors.length < minSamples) {
      labels[i] = -1; // Mark as noise initially
    } else {
      labels[i] = clusterId;
      const seedQueue = [...neighbors];

      let qIdx = 0;
      while (qIdx < seedQueue.length) {
        const neighborIdx = seedQueue[qIdx++];

        if (labels[neighborIdx] === -1) {
          labels[neighborIdx] = clusterId; // Noise upgraded to border point
        }

        if (labels[neighborIdx] !== -2) continue;

        labels[neighborIdx] = clusterId;
        const subNeighbors = getNeighbors(neighborIdx);
        if (subNeighbors.length >= minSamples) {
          for (const sub of subNeighbors) {
            if (!seedQueue.includes(sub)) {
              seedQueue.push(sub);
            }
          }
        }
      }

      clusterId++;
    }
  }

  // Count cluster sizes
  const counts: Record<number, number> = {};
  for (let i = 0; i < n; i++) {
    const l = labels[i];
    counts[l] = (counts[l] || 0) + 1;
  }

  const noiseCount = counts[-1] || 0;
  const stats: DBSCANResult['clusterStats'] = [];

  // Vibrant, rich modern palette
  const VIBRANT_PALETTE = [
    '#0ea5e9', // Vibrant Sky Blue / Cyan
    '#f97316', // Fiery Sunset Orange
    '#3b82f6', // Electric Royal Blue
    '#10b981', // Vibrant Emerald Green
    '#8b5cf6', // Electric Purple
    '#ec4899', // Bright Pink
    '#eab308'  // Golden Amber
  ];

  for (let c = 0; c < clusterId; c++) {
    const count = counts[c] || 0;
    stats.push({
      id: c,
      name: `Cluster ${c + 1}`,
      count,
      percentage: Number(((count / n) * 100).toFixed(1)),
      color: VIBRANT_PALETTE[c % VIBRANT_PALETTE.length]
    });
  }

  if (noiseCount > 0) {
    stats.push({
      id: -1,
      name: 'Noise',
      count: noiseCount,
      percentage: Number(((noiseCount / n) * 100).toFixed(1)),
      color: '#94a3b8' // Slate noise
    });
  }

  return {
    labels,
    nClusters: clusterId,
    noiseCount,
    clusterStats: stats
  };
}

// ----------------------------------------------------
// K-Means Clustering Algorithm
// ----------------------------------------------------
export function runKMeans(points: number[][], k: number, maxIter = 50): { labels: number[]; centroids: number[][] } {
  const n = points.length;
  const d = points[0]?.length || 1;
  if (k >= n) {
    return {
      labels: points.map((_, i) => i),
      centroids: points
    };
  }

  // Initial centroids: spaced picks
  const centroids: number[][] = [];
  const step = Math.floor(n / k);
  for (let i = 0; i < k; i++) {
    centroids.push([...points[Math.min(i * step, n - 1)]]);
  }

  const labels = new Array<number>(n).fill(0);
  let changed = true;
  let iter = 0;

  while (changed && iter < maxIter) {
    changed = false;
    iter++;

    // Assign points to closest centroid
    for (let i = 0; i < n; i++) {
      let minDist = Infinity;
      let bestCluster = 0;
      for (let c = 0; c < k; c++) {
        let sum = 0;
        for (let j = 0; j < d; j++) {
          const diff = points[i][j] - centroids[c][j];
          sum += diff * diff;
        }
        if (sum < minDist) {
          minDist = sum;
          bestCluster = c;
        }
      }
      if (labels[i] !== bestCluster) {
        labels[i] = bestCluster;
        changed = true;
      }
    }

    // Recompute centroids
    const sums: number[][] = Array.from({ length: k }, () => Array(d).fill(0));
    const counts = new Array<number>(k).fill(0);

    for (let i = 0; i < n; i++) {
      const c = labels[i];
      counts[c]++;
      for (let j = 0; j < d; j++) {
        sums[c][j] += points[i][j];
      }
    }

    for (let c = 0; c < k; c++) {
      if (counts[c] > 0) {
        for (let j = 0; j < d; j++) {
          centroids[c][j] = sums[c][j] / counts[c];
        }
      }
    }
  }

  return { labels, centroids };
}

// ----------------------------------------------------
// Reconstruction Error & Inverse Transform
// ----------------------------------------------------
export function computeReconstruction(
  pcaResult: PCAResult,
  retainedK: number,
  scaling: ScalingStrategy
): ReconstructionReport {
  const n = pcaResult.rawMatrix.length;
  const p = pcaResult.featureNames.length;
  const k = Math.min(Math.max(1, retainedK), p);

  // Z_recon = Scores(:, 1..k) * V(1..k, :)
  // Scores[i][m] = pcaResult.transformedData[i].coords[m]
  // V[m][j] = pcaResult.eigenvectors[m][j]
  const sampleErrors: number[] = [];
  const featureSqErrors: number[] = new Array(p).fill(0);
  let totalSqError = 0;

  for (let i = 0; i < n; i++) {
    const coords = pcaResult.transformedData[i].coords;
    let sampleSqErr = 0;

    for (let j = 0; j < p; j++) {
      let reconZ_j = 0;
      for (let m = 0; m < k; m++) {
        reconZ_j += coords[m] * pcaResult.eigenvectors[m][j];
      }

      // Invert scaling to obtain reconstructed original X
      let reconX_j = reconZ_j;
      if (scaling === 'standard') {
        reconX_j = reconZ_j * pcaResult.stdVector[j] + pcaResult.meanVector[j];
      } else if (scaling === 'minmax') {
        const range = pcaResult.maxVector[j] - pcaResult.minVector[j];
        reconX_j = (reconZ_j + 0.5) * range + pcaResult.minVector[j];
      } else if (scaling === 'robust') {
        reconX_j = reconZ_j * pcaResult.iqrVector[j] + pcaResult.medianVector[j];
      } else {
        reconX_j = reconZ_j + pcaResult.meanVector[j];
      }

      const originalX_j = pcaResult.rawMatrix[i][j];
      const diff = originalX_j - reconX_j;
      const diffSq = diff * diff;

      featureSqErrors[j] += diffSq;
      sampleSqErr += diffSq;
      totalSqError += diffSq;
    }

    sampleErrors.push(sampleSqErr / p);
  }

  const mseTotal = totalSqError / (n * p);
  const rmseTotal = Math.sqrt(mseTotal);

  const featureErrors = pcaResult.featureNames.map((name, j) => {
    const mse = featureSqErrors[j] / n;
    const origVar = Math.pow(pcaResult.stdVector[j], 2) || 1;
    const fidelity = Math.max(0, Math.min(1, 1 - mse / origVar));
    return {
      feature: name,
      mse,
      relativeFidelity: Number(fidelity.toFixed(4))
    };
  });

  const explainedVarianceRatio = pcaResult.cumulativeVariance[k - 1] || 0;
  const lostVarianceRatio = Math.max(0, 1 - explainedVarianceRatio);

  return {
    k,
    mseTotal,
    rmseTotal,
    explainedVarianceRatio,
    lostVarianceRatio,
    featureErrors,
    sampleErrors
  };
}
