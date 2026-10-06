# Gradient Boosting Visualizer

An interactive React dashboard backed by scikit-learn. The app makes sequential learning visible through staged tree corrections, residual history, animated decision regions, training and validation curves, feature importance, and a local sample explainer.

## Requirements

- Node.js 20.19+ or 22.12+
- Python 3.11+

## Run locally

Install frontend dependencies once:

```sh
npm install
```

Install the model API dependencies in a virtual environment:

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

Start the API in one terminal:

```sh
python -m uvicorn main:app --reload --port 8000
```

Start the dashboard in a second terminal:

```sh
npm run dev
```

Open the Vite URL printed in the terminal, normally `http://localhost:5173`.

## Dashboard

- **Overview:** validation score, loss, active tree count, training time, the staged boosting story, synchronized loss/score curves, decision boundary, residual focus, and feature importance.
- **Boosting Rounds:** play or pause the round animation, step by one tree, or move the round slider. Metrics, sample residuals, weak learner details, and the cached decision surface follow the selected round.
- **Decision Boundary:** inspect the model response over the first two numeric input features. Misclassified validation points have a white outline; select a point to link it to the sample views.
- **Residual Focus:** compare remaining errors at the active round and select a difficult validation sample.
- **Feature Analysis:** compare ensemble feature importance with one-feature counterfactual effects for a selected sample.
- **Tree Inspector:** inspect the selected learner's depth, leaves, split features, shrinkage weight, and place in the ensemble.
- **Prediction Explainer:** inspect the predicted class/value, confidence when applicable, actual target, residual, and local feature effects.
- **Dataset Explorer:** upload a CSV, choose a target and classification/regression task, inspect a preview, and choose mean, median, or mode for missing numeric feature values. Categorical feature gaps use mode. Rows with an empty target are excluded rather than imputed.
- **Gradient Boosting Lab:** read a detailed guide to the project, staged gradient-boosting theory, the effect of each model setting, available dashboard features, the training workflow, and interpretation limits.

The Iris classification and Diabetes regression datasets are available from the dataset selector. `sample_missing_values.csv` is included to try the import and imputation workflow. Model settings include estimators, learning rate, maximum tree depth, subsampling, loss, and a fixed random seed. Export downloads the staged experiment artifacts as JSON.

## API

- `GET /api/health` reports service status.
- `GET /api/datasets` lists built-in datasets.
- `POST /api/train` trains once and returns model summary, per-round train/validation metrics, tree metadata, sample predictions and residual histories, feature importance, local explanations, and per-round decision surfaces.

The Vite development server proxies `/api` to `http://127.0.0.1:8000`. The API is intended for local development; it does not persist uploaded data or trained models.

## Checks

```sh
npm run build
npm run lint
python3 -m py_compile main.py
```
