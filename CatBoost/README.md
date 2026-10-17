# CatBoost Visualizer

A React dashboard and FastAPI service for exploring CatBoost training, evaluation, feature importance, SHAP explanations, and dataset quality. Visualizations are generated from an uploaded CSV and fitted model; unavailable results are shown as clear empty states instead of fabricated example charts.

The workspace is organized into separate **Dataset**, **Training**, **Evaluation**, **Explain AI**, **3D Explorer**, **Tuning**, and **CatBoost Guide** sections. It has white light mode and near-black dark mode, with blue/cyan accents, responsive layouts, and high-resolution interactive charts.

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

## Deploy on Render

The repository includes a Blueprint at `CatBoost/render.yaml` that defines a static frontend and a Python API service. In Render, choose **New + → Blueprint**, connect `harshitsachan830-dev/All-Visualizations`, and set the Blueprint file path to `CatBoost/render.yaml`. Render builds both services and wires the frontend API URL and backend CORS origin automatically. When deployment finishes, open the `catboost-frontend` static-site URL.

Uploads, trained models, and experiment history are held in API process memory; they are cleared whenever the API restarts or its free instance spins down. Use a paid Render web-service instance for a more reliable training experience. Do not treat the service's temporary filesystem as permanent dataset storage.

## CSV upload and missing values

Open **Dataset** and choose a `.csv` file (maximum 20 MB, 500,000 rows, and 500 columns). The API returns column types, unique counts, missing counts and percentages, numeric histograms and quartiles, categorical counts, target distribution, and the first 100 records. The final CSV column is selected as the initial target; change it before training if needed.

When missing values are found, the Dataset page offers a prominent fill action. Choose **mean** or **median** to fill all eligible numeric columns, or **mode** to fill numeric and categorical columns. You can also select a feature and impute only that column. Imputation updates the in-memory dataset used by subsequent training. An all-empty column cannot be imputed because it has no observed value to calculate.

The Dataset page also has three built-in examples: customer churn (binary classification), house prices (regression), and flower species (multiclass classification). Selecting a sample loads it through the same API flow as a user-uploaded CSV. Feature summaries and charts always reflect the active dataset.

## Model visualizations

- **Training:** CatBoost training and validation metric history, best validation iteration, current iteration, fitted tree count, and elapsed training time.
- **Evaluation:** Classification metrics, count/row-normalized confusion matrix, ROC and precision–recall curves; regression R², MAE, RMSE, actual-vs-predicted, residual, and residual-distribution plots.
- **Explain AI:** Switchable CatBoost `PredictionValuesChange` / mean absolute SHAP ranking, a SHAP summary colored by feature values, and a local SHAP waterfall for a selected row. SHAP describes model behavior, not causality.
- **3D Explorer:** Choose among four CatBoost regression views: a prediction overview, a polynomial-style surface, a surface with observed-row scatter, and a nonlinear CatBoost surface with actual/predicted connectors. “Polynomial-style” describes the presentation only; no polynomial model is fitted. A separate 2D heatmap is available. Other model inputs in the response surface are fixed to a training reference profile.
- **Tuning:** Experiments run against the same deterministic validation split and update the active model visualizations when complete.
- **CatBoost Guide:** In-app workflow instructions, parameter-change tradeoffs, chart-reading notes, and an accessible overview of boosting, symmetric trees, ordered categorical statistics, and validation.

Charts include plain-language interpretation and labels. Evaluation uses a held-out validation split; it is not a guarantee of future performance.

Single-feature PDP/ICE plots and pairwise SHAP interaction analysis remain possible follow-up views.

## API

All application routes are under `/api`:

| Route | Purpose |
| --- | --- |
| `GET /health` | Service and CatBoost availability |
| `GET /dataset?target=...&task=...` | Dataset schema, target profile, missingness, feature distributions, and preview |
| `POST /dataset/upload` | Parse and inspect a CSV multipart upload |
| `POST /dataset/impute` | Fill selected or all missing columns using mean, median, or mode |
| `POST /train` | Train CatBoost and return task-specific validation metrics, evaluation data, history, and importance |
| `GET /ordered-step` | Permutation and ordered target-statistic details for one row |
| `GET /boundary` | 41 × 41 prediction grid and sampled observations for two numeric model features |
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

The API stores the active dataset, model, and experiments in process memory. Restarting the API clears that session. Uploaded files are parsed in memory and are not persisted.

## Project layout

```text
backend/main.py           FastAPI routes and CatBoost lifecycle
src/dashboard.tsx         Section navigation and model workflow
src/DatasetExplorer.tsx   Dataset profiles, distributions, and missingness
src/ModelEvaluation.tsx   Task-aware held-out evaluation plots
src/Explainability.tsx    Feature ranking, SHAP summary, and waterfall
src/BoundaryExplorer.tsx  2D model response heatmap
src/ModelSurface3D.tsx    Lazy-loaded Three.js response surface
src/CatBoostGuide.tsx     In-app CatBoost usage and parameter guide
src/ExperimentRunner.tsx  CatBoost experiment runner/history
src/dashboard-v2.css      Responsive light/dark design system
tests/test_api.py         Upload, imputation, and model workflow tests
context.md                Product scope and API contracts
```