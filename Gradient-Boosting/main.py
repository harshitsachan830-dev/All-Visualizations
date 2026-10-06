from __future__ import annotations

from collections import Counter
from time import perf_counter
from typing import Any, Literal

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sklearn.compose import ColumnTransformer
from sklearn.datasets import load_diabetes, load_iris
from sklearn.ensemble import GradientBoostingClassifier, GradientBoostingRegressor
from sklearn.metrics import accuracy_score, log_loss, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

app = FastAPI(title="Gradient Boosting Visualizer API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TrainRequest(BaseModel):
    dataset: Literal["iris", "diabetes", "custom"] = "iris"
    task: Literal["classification", "regression"] = "classification"
    target: str | None = None
    rows: list[dict[str, Any]] | None = None
    imputation: dict[str, Literal["mean", "median", "mode"]] = Field(default_factory=dict)
    n_estimators: int = Field(default=80, ge=2, le=500)
    learning_rate: float = Field(default=0.08, gt=0, le=1)
    max_depth: int = Field(default=2, ge=1, le=5)
    subsample: float = Field(default=0.85, gt=0, le=1)
    loss: str = "log_loss"
    random_state: int = 42
    validation_size: float = Field(default=0.25, ge=0.1, le=0.4)


def _dataset(request: TrainRequest) -> tuple[pd.DataFrame, str]:
    if request.dataset == "custom":
        if not request.rows:
            raise HTTPException(status_code=422, detail="Upload a CSV dataset before training.")
        frame = pd.DataFrame(request.rows)
        target = request.target or (str(frame.columns[-1]) if len(frame.columns) else "")
    elif request.dataset == "diabetes":
        bundle = load_diabetes(as_frame=True)
        frame = bundle.frame.copy()
        target = "target"
    else:
        bundle = load_iris(as_frame=True)
        frame = bundle.frame.copy()
        target = "target"

    if target not in frame.columns:
        raise HTTPException(status_code=422, detail=f"Target column '{target}' was not found.")
    frame = frame.replace(r"^\s*$", np.nan, regex=True)
    frame = frame.dropna(subset=[target])
    if len(frame) < 8:
        raise HTTPException(status_code=422, detail="At least 8 rows with a target value are required.")
    return frame, target


def _fill_missing(frame: pd.DataFrame, target: str, strategies: dict[str, str]) -> pd.DataFrame:
    clean = frame.copy()
    feature_columns = [column for column in clean.columns if column != target]
    all_empty = [column for column in feature_columns if clean[column].isna().all()]
    clean = clean.drop(columns=all_empty)
    for column in clean.columns:
        if column == target or not clean[column].isna().any():
            continue
        values = clean[column]
        requested = strategies.get(column, "mode")
        numeric = pd.api.types.is_numeric_dtype(values)
        strategy = requested if numeric else "mode"
        if strategy == "mean":
            replacement = values.mean()
        elif strategy == "median":
            replacement = values.median()
        else:
            modes = values.mode(dropna=True)
            if modes.empty:
                raise HTTPException(status_code=422, detail=f"Column '{column}' has no values to impute.")
            replacement = modes.iloc[0]
        clean[column] = values.fillna(replacement)
    return clean


def _json_value(value: Any) -> Any:
    if isinstance(value, np.generic):
        value = value.item()
    if pd.isna(value):
        return None
    return value


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/datasets")
def datasets() -> list[dict[str, str]]:
    return [
        {"id": "iris", "name": "Iris", "task": "classification", "target": "target"},
        {"id": "diabetes", "name": "Diabetes", "task": "regression", "target": "target"},
    ]


@app.post("/api/train")
def train(request: TrainRequest) -> dict[str, Any]:
    frame, target = _dataset(request)
    frame = _fill_missing(frame, target, request.imputation)
    X = frame.drop(columns=[target])
    y = frame[target]
    if X.shape[1] == 0:
        raise HTTPException(status_code=422, detail="At least one usable feature is required.")

    numeric_columns = X.select_dtypes(include=np.number).columns.tolist()
    categorical_columns = [column for column in X.columns if column not in numeric_columns]
    transformers: list[tuple[str, Any, list[str]]] = []
    if numeric_columns:
        transformers.append(("num", "passthrough", numeric_columns))
    if categorical_columns:
        transformers.append(("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), categorical_columns))
    prepare = ColumnTransformer(transformers, remainder="drop", verbose_feature_names_out=True)

    if request.task == "classification":
        loss = request.loss if request.loss in {"log_loss", "exponential"} else "log_loss"
        model = GradientBoostingClassifier(
            n_estimators=request.n_estimators,
            learning_rate=request.learning_rate,
            max_depth=request.max_depth,
            subsample=request.subsample,
            loss=loss,
            random_state=request.random_state,
        )
    else:
        loss = request.loss if request.loss in {"squared_error", "absolute_error", "huber", "quantile"} else "squared_error"
        model = GradientBoostingRegressor(
            n_estimators=request.n_estimators,
            learning_rate=request.learning_rate,
            max_depth=request.max_depth,
            subsample=request.subsample,
            loss=loss,
            random_state=request.random_state,
        )
    pipeline = Pipeline([("prepare", prepare), ("model", model)])

    stratify = None
    if request.task == "classification":
        counts = y.value_counts()
        n_classes = len(counts)
        validation_count = max(n_classes, round(len(y) * request.validation_size))
        if counts.min() >= 2 and validation_count < len(y):
            stratify = y
    try:
        X_train, X_valid, y_train, y_valid = train_test_split(
            X,
            y,
            test_size=request.validation_size,
            random_state=request.random_state,
            stratify=stratify,
        )
        training_started = perf_counter()
        pipeline.fit(X_train, y_train)
        training_time = perf_counter() - training_started
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error

    fitted_prepare = pipeline.named_steps["prepare"]
    fitted_model = pipeline.named_steps["model"]
    train_matrix = fitted_prepare.transform(X_train)
    valid_matrix = fitted_prepare.transform(X_valid)
    classes = [_json_value(value) for value in getattr(fitted_model, "classes_", [])]
    rounds: list[dict[str, Any]] = []
    valid_predictions_by_round: list[np.ndarray] = []

    if request.task == "classification":
        train_stages = fitted_model.staged_predict_proba(train_matrix)
        valid_stages = fitted_model.staged_predict_proba(valid_matrix)
        for round_number, (train_prob, valid_prob) in enumerate(zip(train_stages, valid_stages), start=1):
            train_pred = fitted_model.classes_[np.argmax(train_prob, axis=1)]
            valid_pred = fitted_model.classes_[np.argmax(valid_prob, axis=1)]
            rounds.append({
                "round": round_number,
                "train_loss": float(log_loss(y_train, train_prob, labels=fitted_model.classes_)),
                "valid_loss": float(log_loss(y_valid, valid_prob, labels=fitted_model.classes_)),
                "train_score": float(accuracy_score(y_train, train_pred)),
                "valid_score": float(accuracy_score(y_valid, valid_pred)),
            })
            valid_predictions_by_round.append(valid_prob)
        final_predictions = fitted_model.classes_[np.argmax(valid_predictions_by_round[-1], axis=1)]
        final_probability = valid_predictions_by_round[-1]
        primary_score = float(accuracy_score(y_valid, final_predictions))
        final_loss = rounds[-1]["valid_loss"]
        score_label = "Accuracy"
        loss_label = "Log loss"
    else:
        train_stages = fitted_model.staged_predict(train_matrix)
        valid_stages = fitted_model.staged_predict(valid_matrix)
        for round_number, (train_pred, valid_pred) in enumerate(zip(train_stages, valid_stages), start=1):
            rounds.append({
                "round": round_number,
                "train_loss": float(mean_squared_error(y_train, train_pred)),
                "valid_loss": float(mean_squared_error(y_valid, valid_pred)),
                "train_score": float(r2_score(y_train, train_pred)),
                "valid_score": float(r2_score(y_valid, valid_pred)),
            })
            valid_predictions_by_round.append(np.asarray(valid_pred))
        final_predictions = valid_predictions_by_round[-1]
        final_probability = None
        primary_score = float(r2_score(y_valid, final_predictions))
        final_loss = rounds[-1]["valid_loss"]
        score_label = "R²"
        loss_label = "MSE"

    feature_names = fitted_prepare.get_feature_names_out().tolist()
    raw_importances = fitted_model.feature_importances_
    importance_by_feature: Counter[str] = Counter()
    for name, importance in zip(feature_names, raw_importances):
        original = name.split("__", 1)[-1]
        if original in X.columns:
            source = original
        else:
            source = next((column for column in categorical_columns if original.startswith(f"{column}_")), original)
        importance_by_feature[source] += float(importance)
    feature_importance = [
        {"feature": feature, "importance": importance}
        for feature, importance in importance_by_feature.most_common()
    ]
    local_features = [feature for feature, _ in importance_by_feature.most_common(12)]

    estimators = fitted_model.estimators_
    tree_metadata: list[dict[str, Any]] = []
    for round_index, row_estimators in enumerate(estimators, start=1):
        trees = np.asarray(row_estimators, dtype=object).ravel()
        split_counts: Counter[str] = Counter()
        for tree in trees:
            tree_state = tree.tree_
            for feature_index in tree_state.feature:
                if feature_index >= 0 and feature_index < len(feature_names):
                    split_counts[feature_names[feature_index].split("__", 1)[-1]] += 1
        tree_metadata.append({
            "round": round_index,
            "depth": int(max(tree.tree_.max_depth for tree in trees)),
            "leaves": int(sum(tree.tree_.n_leaves for tree in trees)),
            "split_features": [name for name, _ in split_counts.most_common(3)],
            "weight": request.learning_rate,
        })

    sample_rows: list[dict[str, Any]] = []
    sample_history: list[dict[str, Any]] = []
    valid_indexes = X_valid.index.tolist()
    baseline_row = X_train.mode(dropna=True).iloc[0]
    if request.task == "classification":
        baseline_probability = pipeline.predict_proba(pd.DataFrame([baseline_row], columns=X.columns))[0]
    else:
        baseline_prediction = float(pipeline.predict(pd.DataFrame([baseline_row], columns=X.columns))[0])
    for index, row_values in enumerate(X_valid.head(80).to_dict(orient="records")):
        actual = _json_value(y_valid.iloc[index])
        predicted = _json_value(final_predictions[index])
        if request.task == "classification":
            true_class_index = int(np.flatnonzero(fitted_model.classes_ == y_valid.iloc[index])[0])
            confidence = float(final_probability[index].max())
            residual = float(1 - final_probability[index][true_class_index])
            correct = bool(predicted == actual)
        else:
            confidence = None
            residual = float(actual - predicted)
            correct = None
        local_effects = []
        if index < 40:
            for feature in local_features:
                counterfactual = baseline_row.copy()
                counterfactual[feature] = row_values[feature]
                counterfactual_frame = pd.DataFrame([counterfactual], columns=X.columns)
                if request.task == "classification":
                    predicted_class_index = int(np.flatnonzero(fitted_model.classes_ == final_predictions[index])[0])
                    counterfactual_value = float(pipeline.predict_proba(counterfactual_frame)[0][predicted_class_index])
                    baseline_value = float(baseline_probability[predicted_class_index])
                else:
                    counterfactual_value = float(pipeline.predict(counterfactual_frame)[0])
                    baseline_value = baseline_prediction
                local_effects.append({
                    "feature": feature,
                    "value": _json_value(row_values[feature]),
                    "effect": counterfactual_value - baseline_value,
                })
        sample_rows.append({
            "sample_id": str(valid_indexes[index]),
            "features": {column: _json_value(value) for column, value in row_values.items()},
            "actual": actual,
            "prediction": predicted,
            "confidence": confidence,
            "residual": residual,
            "abs_error": abs(residual),
            "correct": correct,
            "local_effects": local_effects,
        })
        if index < 40:
            history = []
            for round_index, stage in enumerate(valid_predictions_by_round, start=1):
                if request.task == "classification":
                    class_index = int(np.flatnonzero(fitted_model.classes_ == y_valid.iloc[index])[0])
                    round_prediction = fitted_model.classes_[int(np.argmax(stage[index]))]
                    round_residual = float(1 - stage[index][class_index])
                else:
                    round_prediction = stage[index]
                    round_residual = float(y_valid.iloc[index] - round_prediction)
                history.append({
                    "round": round_index,
                    "prediction": _json_value(round_prediction),
                    "residual": round_residual,
                    "abs_error": abs(round_residual),
                })
            sample_history.append({"sample_id": str(valid_indexes[index]), "history": history})

    numeric_features = X.select_dtypes(include=np.number).columns.tolist()
    boundary: dict[str, Any] | None = None
    if len(numeric_features) >= 2:
        x_feature, y_feature = numeric_features[:2]
        x_values = X[x_feature].astype(float)
        y_values = X[y_feature].astype(float)
        x_grid = np.linspace(float(x_values.min()), float(x_values.max()), 24)
        y_grid = np.linspace(float(y_values.min()), float(y_values.max()), 24)
        baseline = X.mode(dropna=True).iloc[0].to_dict()
        grid_rows = []
        for y_value in y_grid:
            for x_value in x_grid:
                point = baseline.copy()
                point[x_feature] = x_value
                point[y_feature] = y_value
                grid_rows.append(point)
        grid_frame = pd.DataFrame(grid_rows, columns=X.columns)
        grid_matrix = fitted_prepare.transform(grid_frame)
        surface_history = []
        for round_index, stage in enumerate(fitted_model.staged_predict(grid_matrix), start=1):
            surface_history.append({
                "round": round_index,
                "surface": [
                    [_json_value(value) for value in stage[row * len(x_grid):(row + 1) * len(x_grid)]]
                    for row in range(len(y_grid))
                ],
            })
        points = []
        for index in range(min(len(X_valid), 180)):
            points.append({
                "sample_id": str(valid_indexes[index]),
                "x": float(X_valid.iloc[index][x_feature]),
                "y": float(X_valid.iloc[index][y_feature]),
                "actual": _json_value(y_valid.iloc[index]),
                "prediction": _json_value(final_predictions[index]),
            })
        boundary = {
            "dataset": request.dataset,
            "x_feature": x_feature,
            "y_feature": y_feature,
            "x_values": [float(value) for value in x_grid],
            "y_values": [float(value) for value in y_grid],
            "surface": surface_history[-1]["surface"],
            "surface_history": surface_history,
            "points": points,
            "classes": classes,
            "task": request.task,
        }

    final_sample = sample_rows[0] if sample_rows else None
    return {
        "summary": {
            "model_type": "GradientBoostingClassifier" if request.task == "classification" else "GradientBoostingRegressor",
            "task": request.task,
            "dataset": request.dataset,
            "target": target,
            "n_estimators": len(rounds),
            "learning_rate": request.learning_rate,
            "max_depth": request.max_depth,
            "subsample": request.subsample,
            "score": primary_score,
            "score_label": score_label,
            "final_loss": final_loss,
            "loss_label": loss_label,
            "training_time": training_time,
            "train_rows": len(X_train),
            "validation_rows": len(X_valid),
            "feature_names": X.columns.tolist(),
            "classes": classes,
        },
        "rounds": rounds,
        "trees": tree_metadata,
        "feature_importance": feature_importance,
        "samples": sample_rows,
        "sample_history": sample_history,
        "boundary": boundary,
        "selected_sample": final_sample,
    }