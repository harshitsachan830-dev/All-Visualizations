# Project Context

## Product intent

Teach CatBoost's model story through connected views: categorical features, ordered target statistics, sequential tree growth, improving predictions, and local/global explanations. The default workspace is an overview dashboard with a premium charcoal interface, restrained purple/indigo accent, compact metric cards, and responsive analytics panels.

## Navigation

About CatBoost, Overview, Dataset, Ordered Boosting, Tree Visualization, Training Progress, Decision Boundary, Feature Importance, SHAP Analysis, Prediction Explorer, 3D Visualization, Hyperparameter Tuning, Model Comparison, and Settings. The About CatBoost page introduces the model concepts, guides users through loading data and running experiments, and links to the relevant lab views.

## Shared interaction state

- Iteration is shared between ordered boosting, training progress, boundary snapshots, and selected tree context.
- Selected sample is shared between ordered rows, tree path, prediction details, and local SHAP presentation.
- Feature selection links dataset inspection to feature importance and SHAP views.
- Animation supports play, pause, step, scrub, and reset.
- Dataset upload changes the active schema and resets the previous model.

## CSV and imputation contract

`POST /api/dataset/upload` accepts multipart field `file` containing a CSV. Limits: 20 MiB, 500,000 rows, and 500 columns. It returns `{name, rows, columns, target, task, missing, features, preview}`; the last CSV column is the initial target. Missing tokens include empty cells, `NA`, `N/A`, `null`, `None`, and `?`.

`POST /api/dataset/impute` accepts `{method: "mean" | "median" | "mode", columns?: string[]}`. Mean/median are restricted to numeric fields; mode supports either type. Empty columns without observed values are rejected. The imputed frame remains active in the API process and subsequent training uses it.

## Model/API contracts

- `POST /api/train`: task, target, iterations, depth, learning rate, regularization, and seed in; validation metrics, feature metadata, training history, importance, duration, settings, and fitted iteration count out.
- `GET /api/ordered-step`: seeded permutation, selected row/category, eligible prior count/sum, and ordered statistic.
- `GET /api/tree/{tree_id}`: split conditions and leaf values. Exact sample counts/gains are not promised because CatBoost does not consistently expose them.
- `GET /api/boundary`: grid predictions over two numeric model features.
- `GET /api/importance`, `GET /api/shap`, `POST /api/predict`: global importance, row SHAP/baseline, and prediction with probability/contributions.
- `GET|POST /api/experiments`: in-memory run history and experiment results.

API data is session-scoped process memory, not durable storage. Vite proxies `/api` to `127.0.0.1:8000` in development. CatBoost training requires a Python runtime with a compatible CatBoost wheel; README currently recommends Python 3.10–3.13.

## Stack and current boundary

React 19 + TypeScript + Vite; Recharts; lucide-react; Three.js; FastAPI; pandas; scikit-learn; CatBoost. Upload, schema inspection, mean/median/mode imputation, classification/regression training, metrics/history, feature importance, ordered statistics, SHAP/prediction explanation, 2D and 3D numeric response surfaces, fitted-tree split/leaf details, and experiment runs/history use real API responses.

The 3D view is a separate lazy-loaded page. It plots model probability (binary/multiclass confidence) or regression output as a height/color surface, overlays dataset observations, and supports X/Y feature selection, tree-count checkpoints, slider updates, orbit, pan, zoom, and camera reset. It requires a trained model and two numeric features. The overview opens with clearly labeled illustrative sample metrics; its compact tree drawing and categorical distribution are examples, not active-model output. Comparison metrics, editable prediction inputs, and settings remain demo UI. The dedicated tree page adds actual split/leaf data below its sketch, while the SHAP page contains the live prediction and contribution breakdown.