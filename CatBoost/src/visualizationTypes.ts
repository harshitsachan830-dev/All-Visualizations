export type DistributionBin = {
  lower: number
  upper: number
  count: number
}

export type CategoryCount = {
  value: string
  count: number
}

export type FeatureDistribution = {
  kind: 'histogram' | 'categories'
  bins?: DistributionBin[]
  values?: CategoryCount[]
  other_count?: number
  minimum?: number
  maximum?: number
  mean?: number
  median?: number
  q1?: number
  q3?: number
}

export type DatasetFeature = {
  name: string
  type: 'Numerical' | 'Categorical'
  missing: number
  missing_percent: number
  unique: number
  distribution: FeatureDistribution
}

export type DatasetProfile = {
  name: string
  rows: number
  columns: number
  target: string
  task: 'classification' | 'regression'
  missing: number
  target_distribution: FeatureDistribution
  features: DatasetFeature[]
  preview: Record<string, unknown>[]
}

export type TrainingHistoryPoint = {
  iteration: number
  train: number
  validation: number
}

export type ModelEvaluation = {
  labels?: Array<string | number>
  confusion_matrix?: number[][]
  actual: Array<string | number>
  predicted: Array<string | number>
  probabilities?: number[][]
}

export type TrainingResult = {
  task: 'classification' | 'regression'
  target: string
  metrics: Record<string, number>
  iterations: number
  best_iteration: number | null
  history_metric: string
  train_history: TrainingHistoryPoint[]
  training_time: number
  importance: Array<{ feature: string; score: number }>
  evaluation: ModelEvaluation
}

export type PredictionResult = {
  prediction: string | number
  raw_output_class?: string | number
  probabilities?: Record<string, number>
  contributions: Array<{ feature: string; value: unknown; shap_value: number }>
  base_value: number
}

export type ShapSummaryFeature = {
  feature: string
  feature_type: 'Numerical' | 'Categorical'
  mean_abs_shap: number
  points: Array<{ feature_value: unknown; shap_value: number }>
}

export type ShapResult = {
  feature_names: string[]
  feature_values: unknown[]
  shap_values: number[]
  base_value: number
  global_importance: Array<{ feature: string; mean_abs_shap: number }>
  summary: ShapSummaryFeature[]
  output: string
}
