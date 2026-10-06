# Project Context

## Purpose

This project visualizes how gradient boosting improves a model one weak learner at a time. Its primary interaction is a shared boosting-round state: the selected round updates the round timeline, train/validation curves, residuals, validation score, tree inspector, and decision response surface together.

## Architecture

- `src/App.tsx` owns dataset/model controls, training state, navigation, and the shared selected round/sample.
- `src/Visuals.tsx` renders charts and model inspection panels from the current training response.
- `src/DatasetStudio.tsx` parses CSVs in the browser, previews missing cells, selects target/task, and applies explicit imputation before training.
- `src/types.ts` defines the frontend contract for API results.
- `main.py` exposes the FastAPI API and uses scikit-learn `GradientBoostingClassifier` or `GradientBoostingRegressor`.
- `vite.config.ts` proxies local `/api` requests to the Python API on port 8000.

## Training response

`POST /api/train` returns:

- A model summary and one metric row per estimator.
- Tree depth, leaves, split features, and learning-rate weight per stage.
- Validation samples with predictions, actual values, residuals, and one-feature counterfactual effects.
- Per-sample residual/prediction history across boosting rounds.
- Feature importance aggregated back to original input columns.
- A 24×24 response surface for every boosting round using the first two numeric features; custom datasets without two numeric features omit the surface.

Training is performed once per request. The UI selects from cached stages rather than fitting a new model for each animation frame.

## Data preparation

CSV parsing happens locally in the browser. The user selects the target, problem type, and fill method for each column with missing feature values. Mean and median are offered for numeric features; mode is available for numeric and categorical features. Rows missing the target are not imputed and are excluded. The selected records and imputation choices are sent only to the local API when training begins.

The built-in Iris and Diabetes datasets select their respective classification and regression workflows. For custom CSVs, the selected task is used. Categorical features are one-hot encoded by the backend.

## Boundaries and caveats

- The response surface varies the first two numeric features and holds other inputs at their training-set mode. It is a two-feature slice, not a full high-dimensional boundary.
- The explainer uses one-feature substitutions against a baseline row. It is a local counterfactual aid, not SHAP and does not allocate feature interactions.
- Local explanations cover the first 12 ranked input features and sample histories cover up to 40 validation samples to keep browser payloads bounded.
- Dataset files and fitted estimators are held in request/session memory only; neither is written to disk by the API.
- The API and development CORS settings are designed for local use, not deployment.