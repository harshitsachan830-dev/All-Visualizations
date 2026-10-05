export type MissingValueStrategy = 'mean' | 'median' | 'mode' | 'drop';
export type ScalingStrategy = 'standard' | 'minmax' | 'none';

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
}

export interface PCALoading {
  feature: string;
  pc1: number;
  pc2: number;
  pc3: number;
  vector: number[];
  importance: number; // overall magnitude
}

export interface PCAResult {
  featureNames: string[];
  eigenvalues: number[];
  eigenvectors: number[][]; // Columns or rows depending on convention: eigenvectors[componentIndex][featureIndex]
  explainedVariance: number[]; // Ratio per PC e.g. 0.729
  cumulativeVariance: number[]; // Cumulative sum e.g. 0.729, 0.958, ...
  transformedData: PCADataPoint[];
  loadings: PCALoading[];
  meanVector: number[];
  stdVector: number[];
  minVector: number[];
  maxVector: number[];
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
