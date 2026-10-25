export type MissingValueStrategy = 'mean' | 'median' | 'mode' | 'drop';
export type ScalingStrategy = 'standard' | 'minmax' | 'robust' | 'none';
export type ReductionMethod = 'standard_pca' | 'kernel_pca' | 'sparse_pca';
export type AnalysisSpace = 'retained_pcs' | 'all_features' | 'display_2d' | 'display_3d';
export type ThemeMode = 'dark' | 'light';
export type ColorPalette = 'cyber' | 'scientific' | 'warm' | 'aurora';

export interface RawDataRow {
  [key: string]: string | number | null | undefined;
}

export interface CleanedDataRow {
  _id: number;
  _label: string;
  [key: string]: any;
}

export interface PCADataPoint {
  id: number;
  label: string;
  original: Record<string, number>;
  pc1: number;
  pc2: number;
  pc3: number;
  coords: number[]; // All principal component values
  cluster?: number; // From DBSCAN or K-Means (-1 for noise)
  clusterName?: string;
  reconstructionError?: number;
}

export interface PCALoading {
  feature: string;
  pc1: number;
  pc2: number;
  pc3: number;
  vector: number[];
  importance: number; // overall magnitude across top PCs
}

export interface PCAResult {
  featureNames: string[];
  eigenvalues: number[];
  eigenvectors: number[][]; // eigenvectors[componentIndex][featureIndex]
  explainedVariance: number[]; // Ratio per PC e.g. 0.42 (42%)
  cumulativeVariance: number[]; // Cumulative sum e.g. 0.42, 0.65, 0.78, 0.92
  transformedData: PCADataPoint[];
  loadings: PCALoading[];
  meanVector: number[];
  stdVector: number[];
  minVector: number[];
  maxVector: number[];
  medianVector: number[];
  iqrVector: number[];
  rawMatrix: number[][];
  centeredMatrix: number[][];
  covarianceMatrix: number[][];
  correlationMatrix: number[][];
  totalVariance: number;
  nComponents: number;
}

export interface ColumnProfile {
  name: string;
  isNumeric: boolean;
  totalCount: number;
  missingCount: number;
  missingPercentage: number;
  uniqueValues: number;
  mean?: number;
  median?: number;
  mode?: number | string;
  min?: number;
  max?: number;
  std?: number;
  isConstant?: boolean;
}

export interface DatasetInfo {
  id: string;
  name: string;
  category: string;
  description: string;
  rawCsv?: string;
  rows: RawDataRow[];
  headers: string[];
  numericColumns: string[];
  categoricalColumns: string[];
  defaultLabelCol: string;
  defaultFeatures: string[];
  isMessy?: boolean;
}

export interface ImputationReport {
  strategy: MissingValueStrategy;
  imputedCellsCount: number;
  imputedPerColumn: Record<string, { count: number; value: number | string }>;
  droppedRowsCount: number;
  finalRowCount: number;
}

export interface DBSCANParams {
  eps: number;
  minSamples: number;
  analysisSpace: AnalysisSpace;
}

export interface DBSCANResult {
  labels: number[]; // -1 is noise, 0, 1, 2... are cluster IDs
  nClusters: number;
  noiseCount: number;
  clusterStats: {
    id: number;
    name: string;
    count: number;
    percentage: number;
    color: string;
  }[];
}

export interface ReconstructionReport {
  k: number;
  mseTotal: number;
  rmseTotal: number;
  explainedVarianceRatio: number;
  lostVarianceRatio: number;
  featureErrors: {
    feature: string;
    mse: number;
    relativeFidelity: number; // 0 to 1
  }[];
  sampleErrors: number[];
}
