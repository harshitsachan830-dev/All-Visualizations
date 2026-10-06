from __future__ import annotations

import io
import math
import os
import time
from typing import Any, Literal

import numpy as np
import pandas as pd
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sklearn.metrics import accuracy_score, log_loss, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split

try:
    from catboost import CatBoostClassifier, CatBoostError, CatBoostRegressor, Pool
except ImportError:
    CatBoostClassifier = CatBoostRegressor = Pool = None  # type: ignore[assignment,misc]
    CatBoostError = Exception


MAX_UPLOAD_BYTES = 20 * 1024 * 1024
MAX_ROWS = 500_000
MAX_COLUMNS = 500
app = FastAPI(title="CatBoost Visualizer API", version="1.0.0")
frontend_origins = [
    origin.strip().rstrip("/")
    for origin in os.getenv("FRONTEND_ORIGINS", "").split(",")
    if origin.strip()
]
frontend_origins = [
    origin if origin.startswith(("http://", "https://")) else f"https://{origin}"
    for origin in frontend_origins
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        *frontend_origins,
    ],
    allow_origin_regex=r"https://catboost-frontend\.onrender\.com",
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

frame: pd.DataFrame | None = None
dataset_name = "Uploaded dataset"
model: Any = None
model_task: str | None = None
target_name: str | None = None
feature_names: list[str] = []
categorical_names: list[str] = []
training_defaults: dict[str, Any] = {}
validation_pool: Any = None
experiments: list[dict[str, Any]] = []


class ImputeRequest(BaseModel):
    method: Literal["mean", "median", "mode"]
    columns: list[str] | None = None


class TrainRequest(BaseModel):
    target: str | None = None
    task: Literal["classification", "regression"] = "classification"
    iterations: int = Field(default=200, ge=10, le=1000)
    depth: int = Field(default=6, ge=2, le=12)
    learning_rate: float = Field(default=0.05, gt=0, le=1)
    l2_leaf_reg: float = Field(default=3.0, ge=0, le=100)
    random_strength: float = Field(default=1.0, ge=0, le=100)
    random_seed: int = 42


class OrderedStepRequest(BaseModel):
    iteration: int = Field(default=1, ge=1)
    selected_row: int = Field(default=0, ge=0)
    feature: str | None = None


class PredictionRequest(BaseModel):
    row: dict[str, Any]


def require_dataset() -> pd.DataFrame:
    if frame is None:
        raise HTTPException(status_code=409, detail="Upload a CSV dataset first")
    return frame


def require_model() -> Any:
    if model is None:
        raise HTTPException(status_code=409, detail="Train a model first")
    return model


def json_value(value: Any) -> Any:
    if value is None or pd.isna(value):
        return None
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating,)):
        return float(value)
    if isinstance(value, (np.bool_,)):
        return bool(value)
    if isinstance(value, (pd.Timestamp,)):
        return value.isoformat()
    return value.item() if isinstance(value, np.generic) else value


def dataset_payload(data: pd.DataFrame) -> dict[str, Any]:
    features = []
    for name in data.columns:
        column = data[name]
        numeric = pd.api.types.is_numeric_dtype(column)
        features.append(
            {
                "name": str(name),
                "type": "Numerical" if numeric else "Categorical",
                "missing": int(column.isna().sum()),
                "unique": int(column.nunique(dropna=True)),
            }
        )
    preview = [
        {str(key): json_value(value) for key, value in record.items()}
        for record in data.head(100).astype(object).to_dict(orient="records")
    ]
    target = target_name if target_name in data.columns else str(data.columns[-1])
    target_values = data[target].dropna()
    inferred_task = (
        "regression"
        if pd.api.types.is_numeric_dtype(target_values)
        and target_values.nunique() > 20
        else "classification"
    )
    return {
        "name": dataset_name,
        "rows": len(data),
        "columns": len(data.columns),
        "target": target,
        "task": inferred_task,
        "missing": int(data.isna().sum().sum()),
        "features": features,
        "preview": preview,
    }


def normalized_features(data: pd.DataFrame, columns: list[str]) -> tuple[pd.DataFrame, dict[str, Any]]:
    result = data.loc[:, columns].copy()
    defaults: dict[str, Any] = {}
    for name in columns:
        series = result[name]
        if pd.api.types.is_numeric_dtype(series):
            value = series.median()
            if pd.isna(value):
                value = 0.0
            result[name] = series.fillna(value)
        else:
            modes = series.dropna().mode()
            value = modes.iloc[0] if not modes.empty else "(missing)"
            result[name] = series.fillna(value).astype(str)
        defaults[name] = json_value(value)
    return result, defaults


def make_pool(data: pd.DataFrame, labels: pd.Series | None = None) -> Any:
    if Pool is None:
        raise HTTPException(
            status_code=503,
            detail="CatBoost is not installed. Use Python 3.10–3.13 and install requirements.txt.",
        )
    return Pool(data, label=labels, cat_features=categorical_names)


def history_payload(metric_history: dict[str, dict[str, list[float]]], iterations: int) -> list[dict[str, float]]:
    learn = metric_history.get("learn", {})
    validation = metric_history.get("validation", {})
    metric_name = next(iter(learn), None)
    validation_name = next(iter(validation), metric_name)
    if metric_name is None:
        return []
    train_values = learn[metric_name]
    valid_values = validation.get(validation_name, train_values)
    indices = np.linspace(0, min(len(train_values), len(valid_values)) - 1, min(100, len(train_values))).astype(int)
    return [
        {
            "iteration": int(index + 1),
            "train": float(train_values[index]),
            "validation": float(valid_values[index]),
        }
        for index in indices
    ]


def train(request: TrainRequest) -> dict[str, Any]:
    global model, model_task, target_name, feature_names, categorical_names
    global training_defaults, validation_pool
    data = require_dataset()
    if CatBoostClassifier is None:
        raise HTTPException(
            status_code=503,
            detail="CatBoost is not installed. Use Python 3.10–3.13 and install requirements.txt.",
        )
    selected_target = request.target or str(data.columns[-1])
    if selected_target not in data.columns:
        raise HTTPException(status_code=422, detail=f"Unknown target column: {selected_target}")
    valid = data.loc[data[selected_target].notna()].copy()
    if len(valid) < 10:
        raise HTTPException(status_code=422, detail="At least 10 rows with a target value are required")
    labels = valid[selected_target]
    if request.task == "classification" and labels.nunique() < 2:
        raise HTTPException(status_code=422, detail="Classification requires at least two target classes")
    if request.task == "regression" and not pd.api.types.is_numeric_dtype(labels):
        raise HTTPException(
            status_code=422,
            detail="Regression requires a numeric target column. Choose a numeric target or switch to classification.",
        )
    features = valid.drop(columns=[selected_target])
    if features.empty:
        raise HTTPException(status_code=422, detail="The dataset needs at least one feature besides the target")
    categorical_names = [name for name in features if not pd.api.types.is_numeric_dtype(features[name])]
    features, training_defaults = normalized_features(features, list(features.columns))
    feature_names = list(features.columns)
    stratify = labels if request.task == "classification" and labels.value_counts().min() >= 2 else None
    try:
        x_train, x_valid, y_train, y_valid = train_test_split(
            features, labels, test_size=0.2, random_state=request.random_seed, stratify=stratify
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=f"Could not make a validation split: {error}") from error

    loss = "RMSE" if request.task == "regression" else ("Logloss" if labels.nunique() == 2 else "MultiClass")
    estimator = CatBoostRegressor if request.task == "regression" else CatBoostClassifier
    candidate = estimator(
        iterations=request.iterations,
        depth=request.depth,
        learning_rate=request.learning_rate,
        l2_leaf_reg=request.l2_leaf_reg,
        random_strength=request.random_strength,
        loss_function=loss,
        random_seed=request.random_seed,
        verbose=False,
        allow_writing_files=False,
    )
    start = time.perf_counter()
    try:
        candidate.fit(
            x_train,
            y_train,
            cat_features=categorical_names,
            eval_set=(x_valid, y_valid),
            early_stopping_rounds=30,
            verbose=False,
        )
    except CatBoostError as error:
        raise HTTPException(status_code=422, detail=f"CatBoost could not train this dataset: {error}") from error
    elapsed = time.perf_counter() - start
    prediction = candidate.predict(x_valid).reshape(-1)
    if request.task == "regression":
        metrics = {
            "rmse": float(math.sqrt(mean_squared_error(y_valid, prediction))),
            "r2": float(r2_score(y_valid, prediction)),
        }
    else:
        probabilities = candidate.predict_proba(x_valid)
        metrics = {"accuracy": float(accuracy_score(y_valid, prediction))}
        try:
            metrics["log_loss"] = float(log_loss(y_valid, probabilities, labels=candidate.classes_))
        except ValueError:
            metrics["log_loss"] = float("nan")

    model = candidate
    model_task = request.task
    target_name = selected_target
    validation_pool = make_pool(x_valid)
    scores = candidate.get_feature_importance(type="PredictionValuesChange")
    ranked = sorted(
        ({"feature": name, "score": float(score)} for name, score in zip(feature_names, scores)),
        key=lambda item: item["score"],
        reverse=True,
    )
    history = history_payload(candidate.get_evals_result(), request.iterations)
    return {
        "task": request.task,
        "target": selected_target,
        "metrics": metrics,
        "iterations": int(candidate.tree_count_),
        "train_history": history,
        "training_time": elapsed,
        "importance": ranked,
        "feature_metadata": dataset_payload(data)["features"],
        "settings": request.model_dump(),
    }


@app.get("/api/health")
def health() -> dict[str, Any]:
    return {"status": "ok", "catboost_available": CatBoostClassifier is not None, "dataset_loaded": frame is not None}


@app.get("/api/dataset")
def get_dataset() -> dict[str, Any]:
    return dataset_payload(require_dataset())


@app.post("/api/dataset/upload")
async def upload_dataset(file: UploadFile = File(...)) -> dict[str, Any]:
    global frame, dataset_name, model, model_task, target_name, feature_names, categorical_names, experiments
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=415, detail="Upload a .csv file")
    content = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="CSV files must be 20 MB or smaller")
    try:
        data = pd.read_csv(
            io.BytesIO(content),
            encoding="utf-8-sig",
            na_values=["", " ", "NA", "N/A", "null", "NULL", "None", "?"],
            keep_default_na=True,
            low_memory=False,
        )
        data.replace(r"^\s*$", np.nan, regex=True, inplace=True)
    except (UnicodeDecodeError, pd.errors.ParserError, ValueError) as error:
        raise HTTPException(status_code=422, detail=f"Could not parse CSV: {error}") from error
    if data.empty or len(data.columns) < 2:
        raise HTTPException(status_code=422, detail="CSV must contain data rows and at least two columns")
    if len(data) > MAX_ROWS or len(data.columns) > MAX_COLUMNS:
        raise HTTPException(status_code=413, detail="CSV exceeds the limit of 500,000 rows or 500 columns")
    data.columns = [str(column).strip() for column in data.columns]
    if any(not column for column in data.columns) or len(set(data.columns)) != len(data.columns):
        raise HTTPException(status_code=422, detail="CSV column names must be non-empty and unique")
    frame = data
    dataset_name = file.filename
    target_name = str(data.columns[-1])
    model = model_task = None
    feature_names = categorical_names = []
    experiments = []
    return dataset_payload(data)


@app.post("/api/dataset/impute")
def impute_dataset(request: ImputeRequest) -> dict[str, Any]:
    global frame, model, model_task
    data = require_dataset()
    columns = request.columns or [name for name in data if data[name].isna().any()]
    if not columns:
        raise HTTPException(status_code=422, detail="Select at least one column")
    updated = data.copy()
    for name in columns:
        if name not in updated:
            raise HTTPException(status_code=422, detail=f"Unknown column: {name}")
        series = updated[name]
        if not series.isna().any():
            continue
        if request.method in {"mean", "median"}:
            if not pd.api.types.is_numeric_dtype(series):
                raise HTTPException(status_code=422, detail=f"{request.method.title()} imputation requires a numeric column: {name}")
            fill_value = series.mean() if request.method == "mean" else series.median()
            if pd.isna(fill_value):
                raise HTTPException(status_code=422, detail=f"Cannot impute an entirely empty column: {name}")
        else:
            modes = series.dropna().mode()
            if modes.empty:
                raise HTTPException(status_code=422, detail=f"Cannot impute an entirely empty column: {name}")
            fill_value = modes.iloc[0]
        updated[name] = series.fillna(fill_value)
    frame = updated
    model = None
    model_task = None
    return dataset_payload(updated)


@app.post("/api/train")
def train_model(request: TrainRequest) -> dict[str, Any]:
    return train(request)


@app.get("/api/importance")
def get_importance() -> dict[str, Any]:
    fitted = require_model()
    scores = fitted.get_feature_importance(type="PredictionValuesChange")
    result = sorted(
        ({"feature": name, "score": float(score)} for name, score in zip(feature_names, scores)),
        key=lambda item: item["score"],
        reverse=True,
    )
    return {"importance_type": "PredictionValuesChange", "features": result}


@app.get("/api/ordered-step")
def ordered_step(
    iteration: int = 1, selected_row: int = 0, feature: str | None = None
) -> dict[str, Any]:
    data = require_dataset()
    if iteration < 1 or selected_row < 0 or selected_row >= len(data):
        raise HTTPException(status_code=422, detail="Iteration or selected row is out of range")
    selected_feature = feature or next((name for name in data if not pd.api.types.is_numeric_dtype(data[name])), str(data.columns[0]))
    if selected_feature not in data:
        raise HTTPException(status_code=422, detail=f"Unknown feature: {selected_feature}")
    order = np.random.default_rng(42 + iteration).permutation(len(data))
    position = int(np.where(order == selected_row)[0][0])
    category = data.iloc[selected_row][selected_feature]
    prior_rows = [int(row) for row in order[:position] if data.iloc[row][selected_feature] == category]
    positives = 0
    if target_name in data and model_task != "regression":
        targets = data[target_name].dropna()
        positive_class = model.classes_[-1] if model is not None else (targets.astype(str).sort_values().iloc[-1] if not targets.empty else None)
        positives = sum(
            str(data.iloc[row][target_name]) == str(positive_class)
            for row in prior_rows
            if pd.notna(data.iloc[row][target_name])
        )
    statistic = (positives + 0.5) / (len(prior_rows) + 1)
    return {
        "iteration": iteration,
        "permutation": [int(row) for row in order[: min(len(order), 50)]],
        "selected_row": selected_row,
        "current_row": {str(key): json_value(value) for key, value in data.iloc[selected_row].items()},
        "feature": selected_feature,
        "category": json_value(category),
        "prior_count": len(prior_rows),
        "prior_target_sum": positives,
        "statistic": statistic,
    }


@app.get("/api/tree/{tree_id}")
def get_tree(tree_id: int) -> dict[str, Any]:
    fitted = require_model()
    if tree_id < 0 or tree_id >= fitted.tree_count_:
        raise HTTPException(status_code=404, detail="Tree index is outside the trained model")
    splits: list[str] = []
    if validation_pool is not None and hasattr(fitted, "_get_tree_splits"):
        splits = fitted._get_tree_splits(tree_id, validation_pool)
    leaves = fitted.get_leaf_values()
    counts = fitted.get_tree_leaf_counts()
    start = int(sum(counts[:tree_id]))
    leaf_values = [float(value) for value in leaves[start : start + counts[tree_id]]]
    return {
        "tree_id": tree_id,
        "depth": int(round(math.log2(max(1, int(counts[tree_id]))))),
        "split_conditions": splits,
        "nodes": [{"id": index, "split": split} for index, split in enumerate(splits)],
        "leaf_values": leaf_values,
        "note": "CatBoost exposes exact leaf values and split conditions; per-node sample counts and gains are not public for every model type.",
    }


@app.get("/api/boundary")
def get_boundary(feature_x: str, feature_y: str, iteration: int | None = None) -> dict[str, Any]:
    fitted = require_model()
    data = require_dataset()
    if feature_x not in feature_names or feature_y not in feature_names or feature_x == feature_y:
        raise HTTPException(status_code=422, detail="Choose two distinct model features")
    if feature_x in categorical_names or feature_y in categorical_names:
        raise HTTPException(status_code=422, detail="Decision boundaries require two numeric features")
    x_values = data[feature_x].dropna()
    y_values = data[feature_y].dropna()
    if x_values.empty or y_values.empty:
        raise HTTPException(status_code=422, detail="Selected features do not have numeric values")
    x_axis = np.linspace(float(x_values.quantile(0.02)), float(x_values.quantile(0.98)), 25)
    y_axis = np.linspace(float(y_values.quantile(0.02)), float(y_values.quantile(0.98)), 25)
    base = {name: training_defaults[name] for name in feature_names}
    points = pd.DataFrame([{**base, feature_x: x, feature_y: y} for y in y_axis for x in x_axis], columns=feature_names)
    tree_limit = max(1, min(iteration or fitted.tree_count_, fitted.tree_count_))
    boundary_pool = make_pool(points)
    if model_task == "classification":
        probabilities = fitted.predict_proba(boundary_pool, ntree_end=tree_limit)
        response_values = probabilities[:, 1] if probabilities.shape[1] == 2 else probabilities.max(axis=1)
        predictions = response_values.tolist()
    else:
        predictions = [
            json_value(value)
            for value in fitted.predict(boundary_pool, ntree_end=tree_limit).reshape(-1)
        ]
    samples = [
        {feature_x: json_value(row[feature_x]), feature_y: json_value(row[feature_y])}
        for _, row in data[[feature_x, feature_y]].head(500).iterrows()
    ]
    return {"feature_x": feature_x, "feature_y": feature_y, "iteration": tree_limit, "x": x_axis.tolist(), "y": y_axis.tolist(), "predictions": predictions, "samples": samples}


@app.get("/api/shap")
def get_shap(sample: int = 0, limit: int = 200) -> dict[str, Any]:
    fitted = require_model()
    data = require_dataset()
    if sample < 0 or sample >= len(data):
        raise HTTPException(status_code=422, detail="Sample index is out of range")
    features = data.drop(columns=[target_name]).iloc[: max(1, min(limit, 500))].copy()
    features, _ = normalized_features(features, feature_names)
    values = np.asarray(fitted.get_feature_importance(make_pool(features), type="ShapValues"))
    local = values[sample] if sample < len(values) else values[0]
    if local.ndim > 1:
        local = local[0]
    global_values = np.abs(values)
    if global_values.ndim == 3:
        global_values = global_values.mean(axis=1)
    mean_abs = global_values[:, :-1].mean(axis=0)
    return {
        "feature_names": feature_names,
        "feature_values": [json_value(data.iloc[sample][name]) for name in feature_names],
        "shap_values": [float(value) for value in local[:-1]],
        "base_value": float(local[-1]),
        "global_importance": [
            {"feature": name, "mean_abs_shap": float(value)}
            for name, value in zip(feature_names, mean_abs)
        ],
        "output": model_task,
    }


@app.post("/api/predict")
def predict(request: PredictionRequest) -> dict[str, Any]:
    fitted = require_model()
    values = {name: request.row.get(name, training_defaults[name]) for name in feature_names}
    row = pd.DataFrame([values], columns=feature_names)
    for name in categorical_names:
        row[name] = row[name].fillna(training_defaults[name]).astype(str)
    for name in feature_names:
        if name not in categorical_names:
            row[name] = pd.to_numeric(row[name], errors="coerce").fillna(training_defaults[name])
    pool = make_pool(row)
    prediction = fitted.predict(pool).reshape(-1)[0]
    explanation = np.asarray(fitted.get_feature_importance(pool, type="ShapValues"))
    local = explanation[0]
    if local.ndim > 1:
        local = local[0]
    contributions = sorted(
        ({"feature": name, "value": json_value(values[name]), "shap_value": float(value)} for name, value in zip(feature_names, local[:-1])),
        key=lambda item: abs(item["shap_value"]),
        reverse=True,
    )
    result: dict[str, Any] = {"input": values, "prediction": json_value(prediction), "contributions": contributions, "base_value": float(local[-1])}
    if model_task == "classification":
        result["probabilities"] = {str(label): float(probability) for label, probability in zip(fitted.classes_, fitted.predict_proba(pool)[0])}
    return result


@app.get("/api/experiments")
def list_experiments() -> dict[str, Any]:
    return {"experiments": experiments}


@app.post("/api/experiments")
def run_experiment(request: TrainRequest) -> dict[str, Any]:
    result = train(request)
    record = {"run_id": len(experiments) + 1, "configuration": request.model_dump(), "metrics": result["metrics"], "training_time": result["training_time"], "iterations": result["iterations"]}
    experiments.append(record)
    return record