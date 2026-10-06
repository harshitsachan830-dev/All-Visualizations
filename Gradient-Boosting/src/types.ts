export type Task = 'classification' | 'regression'
export type ImputationMethod = 'mean' | 'median' | 'mode'

export interface DatasetInput {
  rows: Record<string, unknown>[]
  target: string
  task: Task
  imputation: Record<string, ImputationMethod>
}

export interface ModelSummary {
  model_type: string
  task: Task
  dataset: string
  target: string
  n_estimators: number
  learning_rate: number
  max_depth: number
  subsample: number
  score: number
  score_label: string
  final_loss: number
  loss_label: string
  training_time: number
  train_rows: number
  validation_rows: number
  feature_names: string[]
  classes: (string | number)[]
}

export interface RoundMetric {
  round: number
  train_loss: number
  valid_loss: number
  train_score: number
  valid_score: number
}

export interface TreeMetadata {
  round: number
  depth: number
  leaves: number
  split_features: string[]
  weight: number
}

export interface LocalEffect {
  feature: string
  value: unknown
  effect: number
}

export interface ModelSample {
  sample_id: string
  features: Record<string, unknown>
  actual: string | number
  prediction: string | number
  confidence: number | null
  residual: number
  abs_error: number
  correct: boolean | null
  local_effects: LocalEffect[]
}

export interface SampleHistoryPoint {
  round: number
  prediction: string | number
  residual: number
  abs_error: number
}

export interface SampleHistory {
  sample_id: string
  history: SampleHistoryPoint[]
}

export interface DecisionBoundary {
  dataset: string
  x_feature: string
  y_feature: string
  x_values: number[]
  y_values: number[]
  surface: (string | number)[][]
  surface_history: { round: number; surface: (string | number)[][] }[]
  points: {
    sample_id: string
    x: number
    y: number
    actual: string | number
    prediction: string | number
  }[]
  classes: (string | number)[]
  task: Task
}

export interface TrainingResult {
  summary: ModelSummary
  rounds: RoundMetric[]
  trees: TreeMetadata[]
  feature_importance: { feature: string; importance: number }[]
  samples: ModelSample[]
  sample_history: SampleHistory[]
  boundary: DecisionBoundary | null
  selected_sample: ModelSample | null
}