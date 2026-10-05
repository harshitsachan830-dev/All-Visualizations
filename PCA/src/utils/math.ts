import {
  ColumnProfile,
  ImputationReport,
  MissingValueStrategy,
  PCADataPoint,
  PCALoading,
  PCAResult,
  RawDataRow,
  ScalingStrategy
} from '../types/pca';

// Check if a value is null, undefined, NaN, empty string, or a known missing sentinel.
// NOTE: Non-empty, non-sentinel strings (e.g. 'setosa', 'Group A') are NOT considered missing —
// they are valid categorical labels.
export function isMissing(val: any): boolean {
  if (val === null || val === undefined) return true;
  if (typeof val === 'number') return isNaN(val);
  if (typeof val === 'string') {
    const trimmed = val.trim();
    // Empty or explicit missing sentinels only
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

// Check if a string value looks like a numeric value (for feature imputation)
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

// Convert value to number or null
export function parseNumeric(val: any): number | null {
  if (isMissing(val)) return null;
  const num = typeof val === 'number' ? val : Number(String(val).trim());
  return isNaN(num) ? null : num;
}

// Compute mean of valid numbers
export function calculateMean(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sum = arr.reduce((acc, v) => acc + v, 0);
  return sum / arr.length;
}

// Compute median of valid numbers
export function calculateMedian(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

// Compute mode of an array of numbers or strings
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

// Compute standard deviation
export function calculateStd(arr: number[], mean: number): number {
  if (arr.length <= 1) return 1;
  const variance = arr.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (arr.length - 1);
  return Math.sqrt(Math.max(variance, 1e-12));
}

// Profile dataset columns
export function profileColumns(rows: RawDataRow[], headers: string[]): ColumnProfile[] {
  return headers.map(header => {
    const rawValues = rows.map(r => r[header]);
    const validNumbers: number[] = [];
    let missingCount = 0;

    for (const val of rawValues) {
      if (isMissing(val)) {
        // Truly missing: null, undefined, empty string, NaN sentinel
        missingCount++;
      } else {
        const num = parseNumeric(val);
        if (num !== null) {
          validNumbers.push(num);
        }
        // else: it's a valid non-empty string (label/category) — not missing
      }
    }

    const isNumeric = validNumbers.length > 0 && validNumbers.length / rows.length > 0.6;
    const uniqueValues = new Set(rawValues.filter(v => !isMissing(v))).size;
    const mean = isNumeric && validNumbers.length > 0 ? calculateMean(validNumbers) : undefined;
    const median = isNumeric && validNumbers.length > 0 ? calculateMedian(validNumbers) : undefined;
    const mode = isNumeric && validNumbers.length > 0 ? calculateMode(validNumbers) : calculateMode(rawValues.filter(v => !isMissing(v)) as any);
    const min = isNumeric && validNumbers.length > 0 ? Math.min(...validNumbers) : undefined;
    const max = isNumeric && validNumbers.length > 0 ? Math.max(...validNumbers) : undefined;
    const std = isNumeric && validNumbers.length > 0 && mean !== undefined ? calculateStd(validNumbers, mean) : undefined;

    return {
      name: header,
      isNumeric,
      totalCount: rows.length,
      missingCount,
      missingPercentage: rows.length > 0 ? (missingCount / rows.length) * 100 : 0,
      uniqueValues,
      mean,
      median,
      mode,
      min,
      max,
      std
    };
  });
}

// Clean and impute messy CSV rows
export function imputeAndCleanData(
  rows: RawDataRow[],
  selectedFeatures: string[],
  labelCol: string,
  strategy: MissingValueStrategy
): { cleanedRows: RawDataRow[]; report: ImputationReport } {
  // Pre-calculate column stats for features
  const colStats: Record<string, { mean: number; median: number; mode: number | string }> = {};

  for (const feature of selectedFeatures) {
    const validNums: number[] = [];
    for (const row of rows) {
      const n = parseNumeric(row[feature]);
      if (n !== null) validNums.push(n);
    }
    const mean = validNums.length > 0 ? calculateMean(validNums) : 0;
    const median = validNums.length > 0 ? calculateMedian(validNums) : 0;
    const mode = validNums.length > 0 ? calculateMode(validNums) : 0;
    colStats[feature] = { mean, median, mode };
  }

  // Pre-calculate label mode if label is missing
  const validLabels: string[] = [];
  for (const row of rows) {
    const l = row[labelCol];
    if (!isMissing(l)) validLabels.push(String(l));
  }
  const defaultLabel = validLabels.length > 0 ? String(calculateMode(validLabels)) : 'Sample';

  const report: ImputationReport = {
    strategy,
    imputedCellsCount: 0,
    imputedPerColumn: {},
    droppedRowsCount: 0,
    finalRowCount: 0
  };

  for (const feature of selectedFeatures) {
    let fillVal: number | string = 0;
    if (strategy === 'mean') fillVal = Number(colStats[feature].mean.toFixed(4));
    else if (strategy === 'median') fillVal = Number(colStats[feature].median.toFixed(4));
    else if (strategy === 'mode') fillVal = colStats[feature].mode;

    report.imputedPerColumn[feature] = { count: 0, value: fillVal };
  }

  if (strategy === 'drop') {
    const filteredRows: RawDataRow[] = [];
    for (const row of rows) {
      let hasMissingFeature = false;
      for (const feature of selectedFeatures) {
        if (isMissing(row[feature])) {
          hasMissingFeature = true;
          break;
        }
      }
      if (!hasMissingFeature) {
        filteredRows.push({
          ...row,
          [labelCol]: isMissing(row[labelCol]) ? defaultLabel : row[labelCol]
        });
      } else {
        report.droppedRowsCount++;
      }
    }
    report.finalRowCount = filteredRows.length;
    return { cleanedRows: filteredRows, report };
  }

  // Mean / Median / Mode Imputation
  const cleanedRows: RawDataRow[] = [];

  for (const row of rows) {
    const newRow: RawDataRow = { ...row };

    // Handle label missing
    if (isMissing(newRow[labelCol])) {
      newRow[labelCol] = defaultLabel;
    }

    // Handle each feature missing
    for (const feature of selectedFeatures) {
      if (isMissing(newRow[feature])) {
        const fillVal = report.imputedPerColumn[feature].value;
        newRow[feature] = fillVal;
        report.imputedCellsCount++;
        report.imputedPerColumn[feature].count++;
      } else {
        newRow[feature] = Number(newRow[feature]);
      }
    }
    cleanedRows.push(newRow);
  }

  report.finalRowCount = cleanedRows.length;
  return { cleanedRows, report };
}

// Compute Covariance Matrix of scaled data matrix Z (N x P)
// If Z is centered/standardized: Cov = (1 / (N - 1)) * (Z^T * Z)
export function computeCovarianceMatrix(Z: number[][]): number[][] {
  const n = Z.length;
  if (n <= 1) return [[1]];
  const p = Z[0].length;
  const cov: number[][] = Array.from({ length: p }, () => Array(p).fill(0));

  for (let j = 0; j < p; j++) {
    for (let k = j; k < p; k++) {
      let sum = 0;
      for (let i = 0; i < n; i++) {
        sum += Z[i][j] * Z[i][k];
      }
      const val = sum / (n - 1);
      cov[j][k] = val;
      cov[k][j] = val; // Symmetric
    }
  }

  return cov;
}

// Jacobi Eigenvalue Algorithm for Real Symmetric Matrices
// Solves A * V = V * D, returning eigenvalues and orthogonal eigenvectors
export function jacobiEigenDecomposition(A: number[][], maxIterations = 100): { eigenvalues: number[]; eigenvectors: number[][] } {
  const n = A.length;
  // Deep clone matrix A
  const D: number[][] = A.map(row => [...row]);
  // Initialize eigenvectors V as Identity matrix
  const V: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  );

  let iterations = 0;
  const epsilon = 1e-15;

  while (iterations < maxIterations) {
    // Find largest off-diagonal element in absolute value
    let maxOffDiag = 0;
    let p = 0;
    let q = 1;

    for (let i = 0; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        const absVal = Math.abs(D[i][j]);
        if (absVal > maxOffDiag) {
          maxOffDiag = absVal;
          p = i;
          q = j;
        }
      }
    }

    if (maxOffDiag < epsilon) {
      break; // Converged
    }

    // Compute Jacobi rotation angle
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

    // Apply rotation to D
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

    // Accumulate eigenvectors in V
    for (let i = 0; i < n; i++) {
      const v_ip = V[i][p];
      const v_iq = V[i][q];
      V[i][p] = v_ip - s * (v_iq + tau * v_ip);
      V[i][q] = v_iq + s * (v_ip - tau * v_iq);
    }

    iterations++;
  }

  // Extract eigenvalues from diagonal of D
  const rawEigenvalues = D.map((row, i) => Math.max(0, row[i]));

  // Pair each eigenvalue with its corresponding eigenvector (column in V)
  const paired: { eigenvalue: number; eigenvector: number[] }[] = [];
  for (let j = 0; j < n; j++) {
    const colVector: number[] = [];
    for (let i = 0; i < n; i++) {
      colVector.push(V[i][j]);
    }

    // Ensure deterministic sign convention (largest magnitude entry positive)
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

  // Sort descending by eigenvalue
  paired.sort((a, b) => b.eigenvalue - a.eigenvalue);

  return {
    eigenvalues: paired.map(p => p.eigenvalue),
    eigenvectors: paired.map(p => p.eigenvector) // Each element is eigenvector for that PC
  };
}

// Full PCA Pipeline execution
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

  // 1. Build raw numerical matrix X
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

  // 2. Compute Column Means, Stds, Mins, Maxs
  const meanVector: number[] = [];
  const stdVector: number[] = [];
  const minVector: number[] = [];
  const maxVector: number[] = [];

  for (let j = 0; j < p; j++) {
    const colVals = X.map(r => r[j]);
    const mean = calculateMean(colVals);
    const std = calculateStd(colVals, mean);
    const min = Math.min(...colVals);
    const max = Math.max(...colVals);

    meanVector.push(mean);
    stdVector.push(std);
    minVector.push(min);
    maxVector.push(max);
  }

  // 3. Center and Scale matrix -> Z
  const Z: number[][] = [];
  for (let i = 0; i < n; i++) {
    const zRow: number[] = [];
    for (let j = 0; j < p; j++) {
      const val = X[i][j];
      let scaled = val - meanVector[j]; // mean-centered always
      if (scaling === 'standard') {
        scaled = scaled / (stdVector[j] > 1e-9 ? stdVector[j] : 1);
      } else if (scaling === 'minmax') {
        const range = maxVector[j] - minVector[j];
        scaled = range > 1e-9 ? (val - minVector[j]) / range - 0.5 : 0;
      }
      zRow.push(scaled);
    }
    Z.push(zRow);
  }

  // 4. Compute Covariance Matrix (and Correlation Matrix)
  const covarianceMatrix = computeCovarianceMatrix(Z);

  // Compute correlation matrix from X directly for reference
  const correlationMatrix: number[][] = Array.from({ length: p }, () => Array(p).fill(0));
  for (let j = 0; j < p; j++) {
    for (let k = 0; k < p; k++) {
      if (j === k) {
        correlationMatrix[j][k] = 1;
      } else {
        const covVal = covarianceMatrix[j][k];
        correlationMatrix[j][k] = Number((covVal / (stdVector[j] * stdVector[k] || 1)).toFixed(4));
        if (isNaN(correlationMatrix[j][k]) || !isFinite(correlationMatrix[j][k])) {
          correlationMatrix[j][k] = 0;
        }
      }
    }
  }

  // 5. Symmetric Eigen-decomposition using Jacobi solver
  const { eigenvalues, eigenvectors } = jacobiEigenDecomposition(covarianceMatrix);

  // 6. Calculate Explained Variance & Cumulative Variance
  const totalVariance = eigenvalues.reduce((acc, val) => acc + val, 0) || 1;
  const explainedVariance = eigenvalues.map(val => val / totalVariance);

  const cumulativeVariance: number[] = [];
  let runningSum = 0;
  for (const ratio of explainedVariance) {
    runningSum += ratio;
    cumulativeVariance.push(Math.min(1, runningSum));
  }

  // 7. Project data into Principal Component Space: T = Z * V
  // eigenvectors[k] is the k-th principal direction vector of length p
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

  // 8. Compute Feature Loadings (Eigenvector * sqrt(Eigenvalue))
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
    covarianceMatrix,
    correlationMatrix,
    totalVariance,
    nComponents: p
  };
}
