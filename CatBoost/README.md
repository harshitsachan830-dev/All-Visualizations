# CatBoost Visualizer

A React dashboard and FastAPI service for exploring CatBoost training, ordered categorical statistics, trees, feature importance, SHAP explanations, predictions, and dataset quality. The dashboard starts with illustrative demo values; uploads, imputation, and training use the local API.

Open **About CatBoost** in the sidebar for a model primer and a guided path through dataset upload, training, experiments, and the visualization views. It also labels which areas use live local API results and which comparison/overview examples are illustrative.

## Requirements

- Node.js 20.19+ or 22.12+
- Python 3.10–3.13 (CatBoost wheels may not be available for every newer Python release)

## Run locally

In one terminal, create a virtual environment and start the API:

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8000
```

In another terminal, install and start the frontend:

```sh
npm install
npm run dev
```

Open the Vite URL printed in the terminal (normally `http://localhost:5173`). The Vite development server proxies `/api` requests to FastAPI on port 8000. Health and interactive OpenAPI docs are available at `http://localhost:8000/api/health` and `http://localhost:8000/docs`.

Run backend workflow tests with `python -m pip install -r requirements-dev.txt` followed by `python -m unittest discover -s tests -v`.

## CSV upload and missing values

Open **Dataset** and choose a `.csv` file (maximum 20 MB, 500,000 rows, and 500 columns). The API returns column types, unique counts, missing-cell counts, and the first 100 records. The final CSV column is selected as the initial target; change it before training if needed.

Select a feature with missing values and choose **mean**, **median**, or **mode**. Mean and median require numeric columns; mode supports numeric or categorical columns. Imputation updates the in-memory dataset used by subsequent training. An all-empty column cannot be imputed because it has no observed value to calculate.

The Dataset page also has **Try a sample CSV** with three built-in examples: customer churn (binary classification, 24 rows), house prices (regression, 24 rows), and flower species (multiclass classification, 39 rows). Each includes missing values for testing imputation. Selecting an example loads it through the same API flow as a user-uploaded CSV and infers its task from the target column.

## API

All application routes are under `/api`:

| Route | Purpose |
| --- | --- |
| `GET /health` | Service and CatBoost availability |
| `GET /dataset` | Dataset schema, missingness, summaries, and preview |
| `POST /dataset/upload` | Parse and inspect a CSV multipart upload |
| `POST /dataset/impute` | Fill selected or all missing columns using mean, median, or mode |
| `POST /train` | Train a CatBoost classifier or regressor and return metrics/history |
| `GET /ordered-step` | Permutation and ordered target-statistic details for one row |
| `GET /tree/{tree_id}` | Split conditions and leaf values for a trained tree |
| `GET /boundary` | Prediction grid for two numeric model features |
| `GET /importance` | Model feature-importance scores |
| `GET /shap` | Per-row SHAP values, baseline, and global SHAP ranking |
| `POST /predict` | Prediction, probabilities, and SHAP contributions for one row |
| `GET /experiments`, `POST /experiments` | Experiment history and model runs |

Training request example:

```json
{
  "target": "Churn",
  "task": "classification",
  "iterations": 200,
  "depth": 6,
  "learning_rate": 0.05
}
```

The API stores the active dataset, model, and experiments in process memory. Restarting the API clears that session. Uploaded files are parsed in memory and are not persisted. CatBoost exposes split strings and leaf values, but not consistent per-node sample counts and gains for all model types.

## Project layout

```text
backend/main.py           FastAPI routes and CatBoost lifecycle
src/dashboard.tsx         Responsive dashboard and navigation
src/ModelInsights.tsx     Ordered-boosting and SHAP/prediction views
src/BoundaryExplorer.tsx  Live model decision-boundary grid
src/ModelSurface3D.tsx    Lazy-loaded Three.js probability/value surface
src/TreeInspector.tsx     Fitted-tree split and leaf details
src/ExperimentRunner.tsx  CatBoost experiment runner/history
src/dashboard.css         Dashboard design system
tests/test_api.py         Upload, imputation, and model workflow tests
context.md                Product scope and API contracts
```