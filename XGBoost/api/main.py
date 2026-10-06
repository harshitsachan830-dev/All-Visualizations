from __future__ import annotations

import csv
import io
import json
import os
import re
import warnings
from pathlib import Path
from typing import Any, Literal

import numpy as np
import pandas as pd
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pandas.api.types import is_numeric_dtype
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    mean_absolute_error,
    mean_squared_error,
    precision_score,
    r2_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder, OneHotEncoder
from xgboost import XGBClassifier, XGBRegressor

MAX_FILE_BYTES = 15 * 1024 * 1024
MAX_ROWS = 250_000
PREVIEW_ROWS = 8
TARGET_NAMES = {"target", "label", "class", "outcome", "churn", "attrition", "y"}

app = FastAPI(title="BoostLab CSV model API", version="1.0.0")
allowed_origins = [
    origin.strip().rstrip("/")
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


def json_value(value: Any) -> Any:
    if value is None or pd.isna(value):
        return None
    if isinstance(value, np.generic):
        value = value.item()
    if isinstance(value, (pd.Timestamp, Path)):
        return value.isoformat() if isinstance(value, pd.Timestamp) else value.name
    if isinstance(value, (str, int, float, bool)):
        return value
    return str(value)


def unique_headers(headers: list[str]) -> tuple[list[str], list[str]]:
    counts: dict[str, int] = {}
    result: list[str] = []
    duplicates: list[str] = []
    for index, raw_header in enumerate(headers):
        base = raw_header.strip() or f"unnamed_column_{index + 1}"
        normalized = base.casefold()
        counts[normalized] = counts.get(normalized, 0) + 1
        if counts[normalized] > 1:
            duplicates.append(base)
            base = f"{base} ({counts[normalized]})"
        result.append(base)
    return result, duplicates


def parse_csv(filename: str, content: bytes) -> tuple[pd.DataFrame, dict[str, Any]]:
    if not filename.lower().endswith(".csv"):
        raise HTTPException(status_code=415, detail="Please upload a .csv file.")
    if not content:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")
    if len(content) > MAX_FILE_BYTES:
        raise HTTPException(status_code=413, detail="This CSV is over 15 MB. Split it into smaller files and try again.")

    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        try:
            text = content.decode("cp1252")
        except UnicodeDecodeError as error:
            raise HTTPException(status_code=400, detail="Could not read this file as UTF-8 or Windows-1252 text.") from error

    try:
        delimiter = csv.Sniffer().sniff(text[:8192], delimiters=",;\t|").delimiter
    except csv.Error:
        delimiter = ","

    try:
        reader = csv.reader(io.StringIO(text), delimiter=delimiter, strict=True)
        headers = next(reader)
        for line_number, row in enumerate(reader, start=2):
            if not row or all(not value.strip() for value in row):
                continue
            if len(row) != len(headers):
                raise HTTPException(
                    status_code=400,
                    detail=f"Row {line_number} has {len(row)} fields but the header has {len(headers)}. Repair the row and upload the CSV again.",
                )
    except HTTPException:
        raise
    except (StopIteration, csv.Error) as error:
        raise HTTPException(status_code=400, detail="Could not find a readable CSV header row.") from error

    cleaned_headers, duplicate_headers = unique_headers(headers)
    parse_warnings: list[str] = []
    try:
        with warnings.catch_warnings(record=True) as caught:
            warnings.simplefilter("always")
            frame = pd.read_csv(
                io.StringIO(text),
                sep=delimiter,
                header=0,
                names=cleaned_headers,
                engine="python",
                on_bad_lines="error",
                skipinitialspace=True,
            )
            parse_warnings = [str(item.message)[:240] for item in caught]
    except (pd.errors.ParserError, pd.errors.EmptyDataError, ValueError) as error:
        raise HTTPException(
            status_code=400,
            detail=f"The CSV structure could not be read ({error}). Check the delimiter and quoting, then upload it again.",
        ) from error

    if frame.shape[1] != len(cleaned_headers):
        raise HTTPException(status_code=400, detail="Rows have inconsistent column counts. Repair malformed rows and upload again.")
    if len(frame) > MAX_ROWS:
        raise HTTPException(status_code=413, detail="This CSV contains more than 250,000 rows. Please sample it before uploading.")
    if frame.shape[1] < 2:
        raise HTTPException(status_code=400, detail="The CSV needs at least one feature column and one target column.")
    if frame.empty:
        raise HTTPException(status_code=400, detail="The CSV has a header but no data rows.")

    metadata = {
        "filename": Path(filename).name,
        "delimiter": delimiter,
        "duplicate_headers": duplicate_headers,
        "parse_warnings": parse_warnings,
    }
    return frame, metadata


def column_kind(series: pd.Series) -> str:
    if is_numeric_dtype(series):
        return "numeric"
    non_missing = series.dropna()
    if len(non_missing):
        numeric = pd.to_numeric(non_missing, errors="coerce")
        if numeric.notna().mean() >= 0.9:
            return "numeric"
    return "categorical"


def profile_frame(frame: pd.DataFrame, metadata: dict[str, Any]) -> dict[str, Any]:
    duplicate_rows = int(frame.duplicated().sum())
    row_count, column_count = frame.shape
    stats: list[dict[str, Any]] = []
    for name in frame.columns:
        series = frame[name]
        missing_count = int(series.isna().sum())
        unique_count = int(series.nunique(dropna=True))
        kind = column_kind(series)
        header_tokens = set(re.split(r"[^a-z0-9]+", name.casefold()))
        likely_identifier = bool(header_tokens & {"id", "uuid", "identifier", "serial", "key"})
        likely_identifier = likely_identifier or (kind == "categorical" and unique_count / row_count >= 0.95)
        stats.append(
            {
                "name": name,
                "kind": kind,
            "likely_identifier": likely_identifier,
                "missing_count": missing_count,
                "missing_percent": round(missing_count / row_count * 100, 1),
                "unique_count": unique_count,
                "sample_values": [json_value(value) for value in series.dropna().head(3).tolist()],
            }
        )

    candidates = []
    for item in stats:
        name = item["name"]
        series = frame[name]
        if item["unique_count"] < 2:
            continue
        suggested_task = "classification" if item["unique_count"] <= 12 else "regression"
        if item["kind"] == "numeric" and item["unique_count"] > 12:
            suggested_task = "regression"
        elif item["kind"] == "categorical":
            suggested_task = "classification"
        candidate_score = -100 if item["likely_identifier"] else 10 if name.strip().casefold() in TARGET_NAMES else 0
        candidate_score += 3 if suggested_task == "classification" and not item["likely_identifier"] else 0
        candidates.append(
            {
                "name": name,
                "suggested_task": suggested_task,
                "unique_count": item["unique_count"],
                "suggested": candidate_score,
                "likely_identifier": item["likely_identifier"],
            }
        )
    candidates.sort(key=lambda item: item["suggested"], reverse=True)

    warnings_list: list[dict[str, str]] = []
    blockers: list[str] = []
    if row_count < 20:
        blockers.append(f"Only {row_count} rows were found. At least 20 are needed for a meaningful train/test split.")
    if row_count < 60:
        warnings_list.append({"level": "warning", "message": "Small datasets produce unstable evaluation metrics. Treat scores as a rough check."})
    if duplicate_rows:
        warnings_list.append({"level": "warning", "message": f"Found {duplicate_rows} exact duplicate row(s). Choose whether to keep the first copy or remove all copies before training."})
    if metadata["duplicate_headers"]:
        warnings_list.append({"level": "warning", "message": "Duplicate column names were renamed so they can be selected separately: " + ", ".join(metadata["duplicate_headers"]) + "."})
    high_missing = [item["name"] for item in stats if item["missing_percent"] >= 40]
    if high_missing:
        warnings_list.append({"level": "warning", "message": "These columns have at least 40% missing values: " + ", ".join(high_missing) + ". Review them or exclude them."})
    very_sparse = [item["name"] for item in stats if item["missing_percent"] >= 80]
    if very_sparse:
        warnings_list.append({"level": "warning", "message": "These columns are at least 80% blank and may need to be excluded: " + ", ".join(very_sparse) + "."})
    all_missing = [item["name"] for item in stats if item["missing_percent"] == 100]
    if all_missing:
        warnings_list.append({"level": "warning", "message": "Completely empty columns will be excluded automatically: " + ", ".join(all_missing) + "."})
    duplicate_ratio = duplicate_rows / row_count
    if duplicate_ratio >= 0.5:
        warnings_list.append({"level": "warning", "message": f"{duplicate_ratio:.0%} of rows are duplicates. Review the source before training."})
    if metadata["parse_warnings"]:
        warnings_list.append({"level": "warning", "message": "The CSV parser skipped or repaired irregular rows. Check the preview and consider fixing the source file."})
    missing_ratio = float(frame.isna().sum().sum()) / (row_count * column_count)
    if missing_ratio >= 0.85:
        blockers.append(f"{missing_ratio:.0%} of cells are missing. This file is too sparse to train reliably; refine it before continuing.")
    if column_count > 100:
        warnings_list.append({"level": "warning", "message": f"This file has {column_count} columns. Exclude unused fields before training to simplify the model."})

    return {
        "filename": metadata["filename"],
        "row_count": row_count,
        "column_count": column_count,
        "duplicate_rows": duplicate_rows,
        "duplicate_headers": metadata["duplicate_headers"],
        "parse_warnings": metadata["parse_warnings"],
        "missing_cells": int(frame.isna().sum().sum()),
        "columns": stats,
        "target_candidates": candidates,
        "warnings": warnings_list,
        "blockers": blockers,
        "preview": [
            {name: json_value(value) for name, value in row.items()}
            for row in frame.head(PREVIEW_ROWS).to_dict(orient="records")
        ],
    }


async def read_upload(file: UploadFile) -> tuple[pd.DataFrame, dict[str, Any]]:
    content = await file.read(MAX_FILE_BYTES + 1)
    return parse_csv(file.filename or "upload.csv", content)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "model": "XGBoost"}


@app.post("/api/profile")
async def profile_csv(file: UploadFile = File(...)) -> dict[str, Any]:
    frame, metadata = await read_upload(file)
    return profile_frame(frame, metadata)


@app.post("/api/train")
async def train_csv(
    file: UploadFile = File(...),
    target_column: str = Form(...),
    task: Literal["classification", "regression"] = Form(...),
    numeric_missing: Literal["median", "mean", "mode", "drop_rows"] = Form("median"),
    categorical_missing: Literal["mode", "constant", "drop_rows"] = Form("mode"),
    duplicate_rows: Literal["keep", "drop"] = Form("drop"),
    excluded_columns: str = Form("[]"),
) -> dict[str, Any]:
    frame, metadata = await read_upload(file)
    if target_column not in frame.columns:
        raise HTTPException(status_code=422, detail="The selected target column was not found in the uploaded CSV.")

    try:
        excluded = set(json.loads(excluded_columns))
    except (json.JSONDecodeError, TypeError) as error:
        raise HTTPException(status_code=422, detail="Feature exclusions were not valid.") from error

    original_rows = len(frame)
    original_duplicates = int(frame.duplicated().sum())
    if duplicate_rows == "drop":
        frame = frame.drop_duplicates(keep="first")
    rows_after_duplicates = len(frame)
    missing_target = int(frame[target_column].isna().sum())
    frame = frame.dropna(subset=[target_column]).copy()
    rows_after_target = len(frame)

    feature_columns = [
        name for name in frame.columns
        if name != target_column and name not in excluded
    ]
    if not feature_columns:
        raise HTTPException(status_code=422, detail="Keep at least one feature column in addition to the target.")

    target = frame[target_column]
    if task == "classification":
        target_labels = target.astype(str)
        unique_labels = target_labels.nunique()
        if unique_labels < 2:
            raise HTTPException(status_code=422, detail="Classification needs at least two target classes after cleanup.")
        if unique_labels > 20:
            raise HTTPException(status_code=422, detail=f"The selected target has {unique_labels} classes. Classification supports at most 20; check the target column or choose regression.")
        class_counts = target_labels.value_counts()
        if int(class_counts.min()) < 4:
            raise HTTPException(status_code=422, detail="Each class needs at least four rows so both training and test splits can contain it. Add more examples or merge rare classes.")
        label_encoder = LabelEncoder()
        y = label_encoder.fit_transform(target_labels)
    else:
        y = pd.to_numeric(target, errors="coerce")
        valid_target = y.notna()
        lost_targets = int((~valid_target).sum())
        frame = frame.loc[valid_target].copy()
        y = y.loc[valid_target].astype(float)
        missing_target += lost_targets
        rows_after_target = len(frame)
        if y.nunique() < 2:
            raise HTTPException(status_code=422, detail="Regression needs at least two distinct numeric target values. Choose a numeric target or classification instead.")
        label_encoder = None

    X = frame[feature_columns].copy()
    for column in X.columns:
        if column_kind(X[column]) == "numeric":
            X[column] = pd.to_numeric(X[column], errors="coerce")
        else:
            X[column] = X[column].map(lambda value: str(value) if pd.notna(value) else np.nan)

    empty_features = [column for column in X.columns if X[column].isna().all()]
    if empty_features:
        X = X.drop(columns=empty_features)
        feature_columns = [column for column in feature_columns if column not in empty_features]
    if X.empty or X.shape[1] == 0:
        raise HTTPException(status_code=422, detail="All feature columns are empty after cleanup. Keep a column with usable values.")

    numeric_features = [column for column in X.columns if is_numeric_dtype(X[column])]
    categorical_features = [column for column in X.columns if column not in numeric_features]
    missing_before = int(X.isna().sum().sum())
    rows_before_missing_policy = len(X)
    if numeric_missing == "drop_rows" and numeric_features:
        X = X.dropna(subset=numeric_features)
    if categorical_missing == "drop_rows" and categorical_features:
        X = X.dropna(subset=categorical_features)
    retained_indexes = X.index
    if len(X) != rows_before_missing_policy:
        y = pd.Series(y, index=frame.index).loc[retained_indexes]
    if len(X) < 20:
        raise HTTPException(status_code=422, detail=f"Only {len(X)} usable rows remain after cleanup. At least 20 are required; choose an imputation strategy or add rows.")

    numeric_features = [column for column in X.columns if is_numeric_dtype(X[column])]
    categorical_features = [column for column in X.columns if column not in numeric_features]
    numeric_strategy = "most_frequent" if numeric_missing == "mode" else numeric_missing
    transformers = []
    if numeric_features:
        transformers.append(("numeric", SimpleImputer(strategy=numeric_strategy), numeric_features))
    if categorical_features:
        categorical_imputer = SimpleImputer(strategy="constant", fill_value="Unknown") if categorical_missing == "constant" else SimpleImputer(strategy="most_frequent")
        transformers.append(("categorical", Pipeline([("imputer", categorical_imputer), ("one_hot", OneHotEncoder(handle_unknown="ignore"))]), categorical_features))
    preprocessor = ColumnTransformer(transformers=transformers, remainder="drop")

    stratify = y if task == "classification" else None
    try:
        X_train, X_test, y_train, y_test = train_test_split(
            X,
            y,
            test_size=0.25,
            random_state=42,
            stratify=stratify,
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=f"Could not create a reliable held-out split: {error}") from error

    if task == "classification":
        estimator = XGBClassifier(
            n_estimators=80,
            max_depth=3,
            learning_rate=0.08,
            subsample=0.9,
            colsample_bytree=0.9,
            min_child_weight=1,
            n_jobs=2,
            tree_method="hist",
            eval_metric="logloss" if len(label_encoder.classes_) == 2 else "mlogloss",
            random_state=42,
        )
    else:
        estimator = XGBRegressor(
            n_estimators=80,
            max_depth=3,
            learning_rate=0.08,
            subsample=0.9,
            colsample_bytree=0.9,
            min_child_weight=1,
            n_jobs=2,
            tree_method="hist",
            objective="reg:squarederror",
            random_state=42,
        )
    model = Pipeline([("preprocessor", preprocessor), ("model", estimator)])
    try:
        model.fit(X_train, y_train)
        raw_predictions = model.predict(X_test)
    except (ValueError, TypeError) as error:
        raise HTTPException(status_code=422, detail=f"XGBoost could not train on these columns: {error}") from error

    results: dict[str, Any]
    if task == "classification":
        predictions = label_encoder.inverse_transform(raw_predictions.astype(int))
        actual = label_encoder.inverse_transform(np.asarray(y_test, dtype=int))
        labels = [str(label) for label in label_encoder.classes_]
        precision_average = "binary" if len(labels) == 2 else "weighted"
        predicted_proba = model.predict_proba(X_test)
        results = {
            "accuracy": round(float(accuracy_score(actual, predictions)), 4),
            "precision": round(float(precision_score(actual, predictions, average=precision_average, pos_label=labels[1] if len(labels) == 2 else 1, zero_division=0)), 4),
            "recall": round(float(recall_score(actual, predictions, average=precision_average, pos_label=labels[1] if len(labels) == 2 else 1, zero_division=0)), 4),
            "f1": round(float(f1_score(actual, predictions, average=precision_average, pos_label=labels[1] if len(labels) == 2 else 1, zero_division=0)), 4),
            "confusion_matrix": confusion_matrix(actual, predictions, labels=labels).tolist(),
            "class_labels": labels,
        }
        if len(labels) == 2:
            results["roc_auc"] = round(float(roc_auc_score(y_test, predicted_proba[:, 1])), 4)
        prediction_rows = []
        all_predictions = model.predict(X)
        all_probabilities = model.predict_proba(X)
        all_actual = label_encoder.inverse_transform(np.asarray(y, dtype=int))
        train_indexes = set(X_train.index)
        for index, row_index in enumerate(X.index):
            predicted_label = label_encoder.inverse_transform([int(all_predictions[index])])[0]
            prediction_rows.append(
                {
                    "source_row": int(row_index) + 2,
                    "split": "train" if row_index in train_indexes else "test",
                    "actual": str(all_actual[index]),
                    "prediction": str(predicted_label),
                    "confidence": round(float(np.max(all_probabilities[index])), 4),
                    "probabilities": {label: round(float(all_probabilities[index][label_index]), 4) for label_index, label in enumerate(labels)},
                    "features": {name: json_value(X.iloc[index][name]) for name in feature_columns[:12]},
                }
            )
    else:
        predictions = raw_predictions.astype(float)
        actual = np.asarray(y_test, dtype=float)
        rmse = float(np.sqrt(mean_squared_error(actual, predictions)))
        results = {
            "mae": round(float(mean_absolute_error(actual, predictions)), 4),
            "rmse": round(rmse, 4),
            "r2": round(float(r2_score(actual, predictions)), 4) if len(actual) > 1 else None,
        }
        all_predictions = model.predict(X)
        train_indexes = set(X_train.index)
        prediction_rows = [
            {
                "source_row": int(row_index) + 2,
                "split": "train" if row_index in train_indexes else "test",
                "actual": round(float(y.loc[row_index]), 4),
                "prediction": round(float(all_predictions[index]), 4),
                "residual": round(float(y.loc[row_index] - all_predictions[index]), 4),
                "features": {name: json_value(X.iloc[index][name]) for name in feature_columns[:12]},
            }
            for index, row_index in enumerate(X.index)
        ]

    fitted_preprocessor = model.named_steps["preprocessor"]
    fitted_estimator = model.named_steps["model"]
    try:
        importance_names = fitted_preprocessor.get_feature_names_out()
    except (AttributeError, ValueError):
        importance_names = np.asarray(feature_columns)
    feature_importance = [
        {"feature": str(name).replace("numeric__", "").replace("categorical__", ""), "gain": round(float(score), 4)}
        for name, score in zip(importance_names, fitted_estimator.feature_importances_, strict=False)
    ]
    feature_importance.sort(key=lambda item: item["gain"], reverse=True)

    warnings_list = profile_frame(frame, metadata)["warnings"]
    if original_duplicates and duplicate_rows == "drop":
        warnings_list.append({"level": "info", "message": f"Removed {original_duplicates} exact duplicate row(s), keeping the first copy."})
    if missing_target:
        warnings_list.append({"level": "info", "message": f"Dropped {missing_target} row(s) with a missing target. Targets are never imputed."})
    if missing_before:
        numeric_method = {"median": "median", "mean": "mean", "mode": "mode"}.get(numeric_missing, "dropped rows")
        categorical_method = {"mode": "mode", "constant": "Unknown", "drop_rows": "dropped rows"}[categorical_missing]
        warnings_list.append({"level": "info", "message": f"Handled {missing_before} missing feature cell(s): numeric={numeric_method}, categorical={categorical_method}."})
    if excluded:
        warnings_list.append({"level": "info", "message": "Excluded feature columns: " + ", ".join(sorted(excluded)) + "."})
    if empty_features:
        warnings_list.append({"level": "info", "message": "Excluded all-empty feature columns: " + ", ".join(empty_features) + "."})
    if len(X) < 60:
        warnings_list.append({"level": "warning", "message": "This is a small dataset. Held-out metrics may vary substantially with another split."})

    return {
        "filename": metadata["filename"],
        "target_column": target_column,
        "task": task,
        "rows_uploaded": original_rows,
        "rows_after_duplicates": rows_after_duplicates,
        "rows_after_target_cleanup": rows_after_target,
        "rows_trained": len(X_train),
        "rows_tested": len(X_test),
        "duplicate_rows_found": original_duplicates,
        "missing_target_rows_dropped": missing_target,
        "missing_feature_cells": missing_before,
        "preprocessing": {
            "duplicate_rows": duplicate_rows,
            "numeric_missing": numeric_missing,
            "categorical_missing": categorical_missing,
            "excluded_columns": sorted(excluded),
            "feature_columns": feature_columns,
        },
        "metrics": results,
        "feature_importance": feature_importance[:15],
        "predictions": prediction_rows[:500],
        "prediction_count": len(prediction_rows),
        "predictions_truncated": len(prediction_rows) > 500,
        "warnings": warnings_list,
    }