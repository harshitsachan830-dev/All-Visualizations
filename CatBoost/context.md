# Project Context

## Product intent

Help users understand CatBoost through a calm, section-based workflow: dataset profiling, model training, task-appropriate evaluation, explainability, response-surface exploration, and controlled tuning. Charts must use active dataset/model responses. When real results are unavailable, show an actionable empty state rather than illustrative values.

## Navigation

The main sections are Dataset, Training, Evaluation, Explain AI, 3D Explorer, Tuning, and CatBoost Guide. Dataset and training setup stay separate from evaluation and explanation so the first screen does not overload users. Advanced ordered-statistic details are tucked into the Training section; the guide explains the full workflow and what training controls change.

## CSV and dataset profile contract

`POST /api/dataset/upload` accepts multipart field `file` containing a CSV. Limits: 20 MiB, 500,000 rows, and 500 columns. It returns `{name, rows, columns, target, task, missing, target_distribution, features, preview}`; the last CSV column is the initial target.

Each feature includes type, unique and missing counts, missing percentage, and a distribution. Numerical columns return histogram bins, min/max, mean, median, and quartiles. Categorical columns return the top ten counts and remainder count. `GET /api/dataset?target=...&task=...` recalculates the target profile for the requested target/task.

`POST /api/dataset/impute` accepts `{method: "mean" | "median" | "mode", columns?: string[]}`. Mean/median are restricted to numeric fields; mode supports either type. Empty columns without observed values are rejected. The imputed frame remains active in the API process and subsequent training uses it.

## Model and evaluation contracts

- `POST /api/train`: returns fitted task/target, validation metrics, actual training history, best iteration, CatBoost feature importance, and task-specific evaluation data.
- Classification metrics include accuracy, weighted precision/recall/F1, log loss, and ROC-AUC when defined. The evaluation payload includes held-out labels, confusion counts, and class probabilities.
- Regression metrics include R², MAE, and RMSE. The evaluation payload includes held-out actual and predicted values for actual-vs-predicted, residual, and residual-distribution plots.
- `GET /api/ordered-step`: seeded permutation, selected row/category, eligible prior count/sum, and ordered statistic.
- `GET /api/boundary`: model predictions across a 41 × 41 robust-range grid for two numeric features, plus up to 500 evenly sampled observed rows and target values. Other inputs use the training reference profile.
- `GET /api/importance`, `GET /api/shap`, `POST /api/predict`: CatBoost feature importance, local/global SHAP data, and prediction with probabilities/contributions.
- `GET|POST /api/experiments`: in-memory run history and experiment results.

SHAP values explain model behavior, not real-world causation. Classification and regression use distinct evaluation views. The 2D response heatmap remains available alongside four interactive 3D regression presentation modes: a prediction overview, polynomial-style surface, observed scatter plus response surface, and a CatBoost nonlinear view with actual/predicted connectors. The polynomial-style view is still CatBoost output, not a separately trained polynomial model.

API data is process memory, not durable storage. Vite proxies `/api` to `127.0.0.1:8000` in development. CatBoost training requires a Python runtime with a compatible wheel; README recommends Python 3.10–3.13.

## Stack

React 19 + TypeScript + Vite; Recharts; lucide-react; Three.js; FastAPI; pandas; scikit-learn; CatBoost.
