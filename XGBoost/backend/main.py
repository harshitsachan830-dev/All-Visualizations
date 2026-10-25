import io
import json
import os
import time
from threading import Lock
from typing import Any, Optional

import numpy as np
import pandas as pd
import xgboost as xgb
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    mean_absolute_error,
    mean_squared_error,
    r2_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

app = FastAPI(
    title="ModelMind XGBoost API",
    description="Model training, visualization, and explainability backend",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "https://xgboostapi.onrender.com",
        "*",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for active trained model and context
MODEL_STATE = {
    "model": None,
    "feature_names": [],
    "task": None,
    "X_train": None,
    "y_train": None,
    "X_test": None,
    "y_test": None,
}
MODEL_LOCK = Lock()


@app.get("/")
def home():
    return {
        "app": "ModelMind XGBoost API",
        "status": "running",
        "version": "2.0.0",
    }


@app.get("/health")
@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "xgboost_version": xgb.__version__,
        "jupyter_port": 8899,
    }


@app.get("/pretrained")
def get_pretrained_result():
    """Return a pre-trained model result JSON so the UI loads instantly without needing to train."""
    candidates = [
        os.path.join(os.path.dirname(__file__), "pretrained_result.json"),
        os.path.join(os.path.dirname(__file__), "..", "backend", "pretrained_result.json"),
        os.path.join(os.getcwd(), "backend", "pretrained_result.json"),
        "backend/pretrained_result.json",
        "pretrained_result.json",
    ]
    for path in candidates:
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
    raise HTTPException(404, "Pre-trained result not found. Please train a model first.")


@app.get("/samples")
def list_samples():
    """List available preloaded sample datasets."""
    return [
        {
            "id": "employee_attrition",
            "name": "⭐ Employee Attrition (Default Demo)",
            "task": "classification",
            "target": "attrition",
            "filename": "employee_attrition_demo.csv",
            "description": "1,000 employee records across 24 features — age, salary, satisfaction, overtime, department. Perfect for XGBoost classification.",
        },
        {
            "id": "house_prices",
            "name": "House Prices (Regression)",
            "task": "regression",
            "target": "house_price",
            "filename": "02_regression_house_prices.csv",
            "description": "500 properties with square footage, rooms, age, and location.",
        },
        {
            "id": "customer_churn",
            "name": "Customer Churn (Classification)",
            "task": "classification",
            "target": "churn",
            "filename": "xgboost_customer_churn_1000_rows_100_missing.csv",
            "description": "1,000 subscriber accounts with usage metrics, contract type, and churn status.",
        },
        {
            "id": "nulls_benchmark",
            "name": "Nulls Benchmark (Regression)",
            "task": "regression",
            "target": "target",
            "filename": "xgboost_1000_rows_with_nulls.csv",
            "description": "1,000-row regression benchmark dataset containing missing numeric and categorical values.",
        },
        {
            "id": "loan_repayment_nulls",
            "name": "Loan Repayment with Nulls (Regression)",
            "task": "regression",
            "target": "repayment_capacity",
            "filename": "loan_repayment_with_nulls.csv",
            "description": "250 applicant records with annual income, credit score, and missing values ready for mean, median, or mode imputation.",
        },
    ]


@app.get("/samples/{sample_id}")
def get_sample_csv(sample_id: str):
    """Retrieve the raw CSV text for a sample dataset."""
    mapping = {
        "employee_attrition": "employee_attrition_demo.csv",
        "house_prices": "02_regression_house_prices.csv",
        "customer_churn": "xgboost_customer_churn_1000_rows_100_missing.csv",
        "nulls_benchmark": "xgboost_1000_rows_with_nulls.csv",
        "loan_repayment_nulls": "loan_repayment_with_nulls.csv",
    }
    filename = mapping.get(sample_id)
    if not filename:
        raise HTTPException(404, f"Sample dataset '{sample_id}' not found.")

    candidates = [
        os.path.join(os.path.dirname(__file__), "samples", filename),
        os.path.join(os.path.dirname(__file__), "..", "samples", filename),
        os.path.join(os.getcwd(), "samples", filename),
        os.path.join(os.getcwd(), "..", "samples", filename),
        filename,
    ]
    resolved = None
    for cand in candidates:
        if os.path.exists(cand):
            resolved = cand
            break

    if not resolved:
        raise HTTPException(404, f"Sample dataset '{sample_id}' file '{filename}' not found.")

    with open(resolved, "r", encoding="utf-8") as f:
        content = f.read()
    return PlainTextResponse(content, media_type="text/csv")


def calculate_feature_interactions(model, X, feature_names, max_samples=100):
    """Calculate the strongest pairwise SHAP interactions."""
    try:
        import shap
        X_sample = X.iloc[:max_samples].copy()
        explainer = shap.TreeExplainer(model)
        values = explainer.shap_interaction_values(X_sample)

        if isinstance(values, list):
            values = np.mean(np.abs(np.asarray(values)), axis=0)
        else:
            values = np.asarray(values)
            if values.ndim == 4:
                values = np.mean(np.abs(values), axis=0)

        matrix = np.mean(np.abs(values), axis=0)

        if matrix.ndim != 2:
            raise ValueError("Unexpected SHAP interaction matrix shape.")

        interactions = []
        count = min(len(feature_names), matrix.shape[0])

        for i in range(count):
            for j in range(i + 1, min(count, matrix.shape[1])):
                interactions.append({
                    "feature_1": str(feature_names[i]),
                    "feature_2": str(feature_names[j]),
                    "strength": float(matrix[i, j]),
                })

        interactions.sort(key=lambda item: item["strength"], reverse=True)

        return {
            "status": "success",
            "features": list(feature_names),
            "interactions": interactions[:30],
            "samples_analyzed": len(X_sample),
        }

    except Exception as error:
        return {
            "status": "unavailable",
            "message": str(error),
            "features": list(feature_names),
            "interactions": [],
        }


@app.post("/train")
async def train_model(
    file: UploadFile = File(...),
    target: str = Form(...),
    task: str = Form("regression"),
    imputation_strategy: str = Form("median"),
    n_estimators: int = Form(150),
    max_depth: int = Form(5),
    learning_rate: float = Form(0.05),
    subsample: float = Form(1.0),
    colsample_bytree: float = Form(1.0),
):
    started = time.perf_counter()

    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(400, "Please upload a valid CSV file.")

    if task not in {"regression", "classification"}:
        raise HTTPException(400, "Task must be either regression or classification.")

    try:
        content = await file.read()
        if len(content) > 30 * 1024 * 1024:
            raise HTTPException(413, "CSV file exceeds maximum size of 30 MB.")
        df = pd.read_csv(io.BytesIO(content))
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(400, f"Could not parse CSV: {exc}") from exc

    if df.empty or len(df.columns) < 2:
        raise HTTPException(400, "Dataset must contain at least one feature column and a target column.")

    if target not in df.columns:
        raise HTTPException(400, f"Target column '{target}' not found in dataset columns: {list(df.columns)}")

    # Clean missing/infinite targets
    df = df.replace([np.inf, -np.inf], np.nan)
    df = df.dropna(subset=[target])

    if len(df) < 10:
        raise HTTPException(400, "At least 10 valid non-null target rows are required for training.")

    y = df[target].copy()
    X = df.drop(columns=[target]).copy()

    # Drop zero-variance columns
    X = X.loc[:, X.nunique(dropna=True) > 1]
    if X.empty:
        raise HTTPException(400, "No usable feature columns with variance remain after target separation.")

    # Record missing values before imputation
    raw_null_counts = {str(col): int(X[col].isna().sum()) for col in X.columns if X[col].isna().sum() > 0}
    total_nulls = int(sum(raw_null_counts.values()))

    # Apply selected imputation strategy (mean, median, mode, zero)
    clean_strat = (imputation_strategy or "median").lower().strip()
    if clean_strat not in {"mean", "median", "mode", "zero"}:
        clean_strat = "median"

    imputed_values = {}
    for col in X.columns:
        if pd.api.types.is_numeric_dtype(X[col]):
            if clean_strat == "mean":
                fill_val = float(X[col].mean()) if not pd.isna(X[col].mean()) else 0.0
            elif clean_strat == "mode":
                m_vals = X[col].mode(dropna=True)
                fill_val = float(m_vals.iloc[0]) if not m_vals.empty else float(X[col].median() if not pd.isna(X[col].median()) else 0.0)
            elif clean_strat == "zero":
                fill_val = 0.0
            else:  # median (default)
                fill_val = float(X[col].median()) if not pd.isna(X[col].median()) else 0.0

            if not np.isfinite(fill_val):
                fill_val = 0.0
            imputed_values[str(col)] = round(fill_val, 4)
            X[col] = X[col].fillna(fill_val)
        else:
            # Categorical column
            if clean_strat == "mode":
                cat_mode = X[col].mode(dropna=True)
                fill_val = str(cat_mode.iloc[0]) if not cat_mode.empty else "Missing"
            else:
                fill_val = "Missing"
            imputed_values[str(col)] = fill_val
            X[col] = X[col].fillna(fill_val)

    # One-hot encode categoricals and sanitize infinite values
    X = pd.get_dummies(X, drop_first=False, dtype=float)
    X = X.replace([np.inf, -np.inf], np.nan).fillna(0.0)

    # Detect if user selected classification on continuous target with high cardinality
    if task == "classification" and pd.api.types.is_float_dtype(y) and y.nunique() > 25:
        task = "regression"  # Auto-fallback to regression for continuous targets like loan repayment capacity

    if task == "regression":
        y = pd.to_numeric(y, errors="coerce")
        valid = y.notna()
        X = X.loc[valid]
        y = y.loc[valid].astype(float)

        if len(y) < 10 or y.nunique() < 2:
            raise HTTPException(400, "Regression requires at least 10 rows and 2 distinct numeric target values.")
        stratify = None
    else:
        y = y.astype(str)
        if y.nunique() < 2:
            raise HTTPException(400, "Classification requires at least two distinct target classes.")
        encoder = LabelEncoder()
        y = pd.Series(encoder.fit_transform(y), index=y.index)
        # Safe stratify: only stratify if every class has >= 2 samples
        if y.value_counts().min() >= 2:
            stratify = y
        else:
            stratify = None

    if len(X) < 10:
        raise HTTPException(400, "Not enough valid samples remain after data cleaning.")

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=stratify,
    )

    # Initialize XGBoost model with requested hyper-parameters
    n_est = max(10, min(500, int(n_estimators)))
    depth = max(2, min(15, int(max_depth)))
    lr = max(0.001, min(1.0, float(learning_rate)))
    sub = max(0.2, min(1.0, float(subsample)))
    col = max(0.2, min(1.0, float(colsample_bytree)))

    if task == "regression":
        model = xgb.XGBRegressor(
            n_estimators=n_est,
            max_depth=depth,
            learning_rate=lr,
            subsample=sub,
            colsample_bytree=col,
            objective="reg:squarederror",
            random_state=42,
            n_jobs=2,
        )
    else:
        model = xgb.XGBClassifier(
            n_estimators=n_est,
            max_depth=depth,
            learning_rate=lr,
            subsample=sub,
            colsample_bytree=col,
            eval_metric="logloss",
            random_state=42,
            n_jobs=2,
        )

    try:
        model.fit(
            X_train,
            y_train,
            eval_set=[(X_train, y_train), (X_test, y_test)],
            verbose=False,
        )

        with MODEL_LOCK:
            MODEL_STATE["model"] = model
            MODEL_STATE["feature_names"] = list(X_train.columns)
            MODEL_STATE["task"] = task
            MODEL_STATE["X_train"] = X_train.copy()
            MODEL_STATE["y_train"] = y_train.copy()
            MODEL_STATE["X_test"] = X_test.copy()
            MODEL_STATE["y_test"] = y_test.copy()

        predictions = model.predict(X_test)
    except Exception as exc:
        raise HTTPException(400, f"Model training failed: {exc}") from exc

    # Metrics calculation
    if task == "regression":
        r2 = float(r2_score(y_test, predictions))
        mae = float(mean_absolute_error(y_test, predictions))
        rmse = float(np.sqrt(mean_squared_error(y_test, predictions)))
        explained_var = float(1.0 - (np.var(y_test - predictions) / (np.var(y_test) + 1e-9)))
        max_err = float(np.max(np.abs(y_test - predictions)))
        metrics = {
            "r2": r2,
            "mae": mae,
            "rmse": rmse,
            "explained_variance": explained_var,
            "max_error": max_err,
        }
    else:
        average = "binary" if y.nunique() == 2 else "weighted"
        acc = float(accuracy_score(y_test, predictions))
        prec = float(precision_score(y_test, predictions, average=average, zero_division=0))
        rec = float(recall_score(y_test, predictions, average=average, zero_division=0))
        f1 = float(f1_score(y_test, predictions, average=average, zero_division=0))
        metrics = {
            "accuracy": acc,
            "precision": prec,
            "recall": rec,
            "f1": f1,
        }
        if y.nunique() == 2 and hasattr(model, "predict_proba"):
            try:
                metrics["roc_auc"] = float(roc_auc_score(y_test, model.predict_proba(X_test)[:, 1]))
            except Exception:
                pass

    # Multi-method Feature Importance (gain, weight, cover)
    booster = model.get_booster()
    score_gain = booster.get_score(importance_type="gain")
    score_weight = booster.get_score(importance_type="weight")
    score_cover = booster.get_score(importance_type="cover")

    def format_importance(score_dict):
        items = []
        for col_name in X_train.columns:
            val = float(score_dict.get(col_name, 0.0))
            items.append({"feature": str(col_name), "importance": val})
        items.sort(key=lambda x: x["importance"], reverse=True)
        return items

    importance_gain = format_importance(score_gain)
    importance_weight = format_importance(score_weight)
    importance_cover = format_importance(score_cover)

    # 3D Prediction Surface for top 2 features with baseline=median
    surface = None
    try:
        top_features = [item["feature"] for item in importance_gain if item["feature"] in X_train.columns][:2]
        if len(top_features) == 2:
            fa, fb = top_features
            low_a, high_a = X_train[fa].quantile([0.05, 0.95])
            low_b, high_b = X_train[fb].quantile([0.05, 0.95])
            if high_a > low_a and high_b > low_b:
                grid_a = np.linspace(float(low_a), float(high_a), 20)
                grid_b = np.linspace(float(low_b), float(high_b), 20)
                baseline = X_train.median(numeric_only=True)
                grid_rows = []
                for val_b in grid_b:
                    for val_a in grid_a:
                        row = baseline.copy()
                        row[fa] = val_a
                        row[fb] = val_b
                        grid_rows.append(row)
                grid_frame = pd.DataFrame(grid_rows, columns=X_train.columns)
                if task == "classification":
                    probabilities = model.predict_proba(grid_frame)
                    grid_preds = probabilities[:, 1] if probabilities.shape[1] == 2 else probabilities.max(axis=1)
                    surface_label = "Class 1 Probability" if probabilities.shape[1] == 2 else "Max Class Probability"
                else:
                    grid_preds = model.predict(grid_frame)
                    surface_label = "Predicted Target"
                surface = {
                    "x_feature": str(fa),
                    "y_feature": str(fb),
                    "z_label": surface_label,
                    "baseline_mode": "median",
                    "x_values": grid_a.tolist(),
                    "y_values": grid_b.tolist(),
                    "z_values": np.asarray(grid_preds, dtype=float).reshape(len(grid_b), len(grid_a)).tolist(),
                }
    except Exception:
        surface = None

    # 3D Partial Dependence Surface (grid of top 2 features)
    pdp_surface = None
    try:
        if surface is not None:
            pdp_surface = {
                "feature_a": surface["x_feature"],
                "feature_b": surface["y_feature"],
                "grid_a": surface["x_values"],
                "grid_b": surface["y_values"],
                "z_values": surface["z_values"],
            }
    except Exception:
        pdp_surface = None

    # Learning Curve
    learning_curve = None
    try:
        history = model.evals_result()
        metric_names = list(history.get("validation_0", {}).keys())
        if metric_names:
            m_name = metric_names[0]
            train_scores = history["validation_0"][m_name]
            val_scores = history["validation_1"][m_name]
            learning_curve = {
                "metric": m_name,
                "rounds": list(range(1, len(train_scores) + 1)),
                "training": [float(v) for v in train_scores],
                "validation": [float(v) for v in val_scores],
            }
    except Exception:
        learning_curve = None

    # 1D Partial Dependence
    partial_dependence = []
    try:
        baseline = X_train.median(numeric_only=True)
        top_pdp = [item["feature"] for item in importance_gain if item["feature"] in X_train.columns][:5]
        for f_name in top_pdp:
            lo, hi = X_train[f_name].quantile([0.05, 0.95])
            if hi > lo:
                grid = np.linspace(float(lo), float(hi), 25)
                rows = []
                for val in grid:
                    r = baseline.copy()
                    r[f_name] = val
                    rows.append(r)
                g_frame = pd.DataFrame(rows, columns=X_train.columns)
                if task == "classification":
                    probs = model.predict_proba(g_frame)
                    vals = probs[:, 1] if probs.shape[1] == 2 else probs.max(axis=1)
                    lbl = "Class Probability"
                else:
                    vals = model.predict(g_frame)
                    lbl = "Average Prediction"
                partial_dependence.append({
                    "feature": str(f_name),
                    "x_values": grid.tolist(),
                    "y_values": [float(v) for v in vals],
                    "output_label": lbl,
                })
    except Exception:
        partial_dependence = []

    # Tree Structure Dumps (First 5 trees)
    tree_dumps = []
    try:
        raw_trees = model.get_booster().get_dump(dump_format="json")
        for i, t_json in enumerate(raw_trees[:5]):
            tree_dumps.append({"tree_index": i, "structure": json.loads(t_json)})
    except Exception:
        tree_dumps = []

    # 3D Prediction Error Distribution (2D histogram grid of residuals x predicted)
    residuals_arr = (y_test.to_numpy() - predictions) if hasattr(y_test, "to_numpy") else (np.asarray(y_test) - predictions)
    error_distribution_3d = None
    try:
        hist_2d, x_edges, y_edges = np.histogram2d(residuals_arr, predictions, bins=[12, 10])
        error_distribution_3d = {
            "residual_bins": [float(0.5 * (x_edges[i] + x_edges[i+1])) for i in range(len(x_edges)-1)],
            "predicted_bins": [float(0.5 * (y_edges[j] + y_edges[j+1])) for j in range(len(y_edges)-1)],
            "counts": hist_2d.tolist(),
            "mean_error": float(np.mean(residuals_arr)),
            "std_error": float(np.std(residuals_arr)),
        }
    except Exception:
        error_distribution_3d = None

    # SHAP Explanations
    shap_summary = None
    try:
        import shap
        explain_rows = X_test.iloc[:80].copy()
        explainer = shap.TreeExplainer(model)
        shap_vals = explainer.shap_values(explain_rows)
        shap_arr = np.asarray(shap_vals)
        if shap_arr.ndim == 3:
            class_idx = 1 if shap_arr.shape[2] > 1 else 0
            shap_arr = shap_arr[:, :, class_idx]

        if shap_arr.ndim == 2:
            feat_exps = []
            for idx, c_name in enumerate(explain_rows.columns):
                c_vals = shap_arr[:, idx]
                f_vals = explain_rows.iloc[:, idx].to_numpy()
                feat_exps.append({
                    "feature": str(c_name),
                    "mean_abs_shap": float(np.mean(np.abs(c_vals))),
                    "values": [float(v) if np.isfinite(v) else 0.0 for v in f_vals],
                    "shap_values": [float(v) if np.isfinite(v) else 0.0 for v in c_vals],
                })
            feat_exps.sort(key=lambda item: item["mean_abs_shap"], reverse=True)
            shap_summary = {
                "sample_count": int(len(explain_rows)),
                "features": feat_exps[:15],
            }
    except Exception as exc:
        shap_summary = {
            "error": str(exc)[:300],
            "sample_count": 0,
            "features": [],
        }

    # Classification Diagnostics
    classification_diagnostics = None
    if task == "classification":
        try:
            from sklearn.calibration import calibration_curve
            from sklearn.metrics import confusion_matrix, precision_recall_curve, roc_curve

            class_labels = sorted(int(v) for v in np.unique(y))
            matrix = confusion_matrix(y_test, predictions, labels=class_labels)
            classification_diagnostics = {
                "class_labels": class_labels,
                "confusion_matrix": matrix.tolist(),
            }

            if len(class_labels) == 2 and hasattr(model, "predict_proba"):
                probs = model.predict_proba(X_test)[:, 1]
                fpr, tpr, thresh = roc_curve(y_test, probs)
                classification_diagnostics["roc_curve"] = {
                    "fpr": fpr.tolist(),
                    "tpr": tpr.tolist(),
                    "thresholds": [float(v) if np.isfinite(v) else 0.0 for v in thresh],
                }

                prec, rec, pr_thresh = precision_recall_curve(y_test, probs)
                classification_diagnostics["precision_recall_curve"] = {
                    "precision": prec.tolist(),
                    "recall": rec.tolist(),
                    "thresholds": [float(v) if np.isfinite(v) else 0.0 for v in pr_thresh],
                }

                # Calibration curve
                prob_true, prob_pred = calibration_curve(y_test, probs, n_bins=10)
                classification_diagnostics["calibration_curve"] = {
                    "prob_true": [float(v) for v in prob_true],
                    "prob_pred": [float(v) for v in prob_pred],
                }

                # Cumulative gain
                order = np.argsort(-probs)
                y_sorted = np.asarray(y_test)[order]
                total_pos = max(1, np.sum(y_sorted))
                cum_pos = np.cumsum(y_sorted) / total_pos
                pop_pct = np.linspace(0, 1, len(y_sorted) + 1)
                gain_pct = np.insert(cum_pos, 0, 0)
                sample_indices = np.linspace(0, len(pop_pct) - 1, min(60, len(pop_pct))).astype(int)
                classification_diagnostics["cumulative_gain"] = {
                    "population_pct": [float(pop_pct[i]) for i in sample_indices],
                    "gain_pct": [float(gain_pct[i]) for i in sample_indices],
                }
        except Exception as exc:
            classification_diagnostics = {"error": str(exc)[:300]}

    # Pairwise feature interactions
    feature_interactions = calculate_feature_interactions(
        model=model,
        X=X_test,
        feature_names=list(X_test.columns),
        max_samples=80,
    )

    elapsed_time = round(time.perf_counter() - started, 3)

    return {
        "status": "success",
        "task": task,
        "target": target,
        "rows": int(len(X)),
        "features": [str(c) for c in X.columns],
        "train_rows": int(len(X_train)),
        "test_rows": int(len(X_test)),
        "metrics": metrics,
        "imputation": {
            "strategy": clean_strat,
            "total_nulls": total_nulls,
            "null_counts": raw_null_counts,
            "imputed_values": imputed_values,
        },
        "feature_importance": importance_gain,
        "feature_importance_breakdown": {
            "gain": importance_gain,
            "weight": importance_weight,
            "cover": importance_cover,
        },
        "prediction_surface": surface,
        "partial_dependence_surface": pdp_surface,
        "shap_summary": shap_summary,
        "classification_diagnostics": classification_diagnostics,
        "learning_curve": learning_curve,
        "feature_interactions": feature_interactions,
        "partial_dependence": partial_dependence,
        "first_tree": tree_dumps[0]["structure"] if tree_dumps else None,
        "trees": tree_dumps,
        "error_distribution_3d": error_distribution_3d,
        "predictions": [
            {
                "actual": float(act),
                "predicted": float(prd),
                "residual": float(act - prd),
            }
            for act, prd in zip(y_test, predictions)
        ],
        "training_time_seconds": elapsed_time,
        "hyperparameters": {
            "n_estimators": n_est,
            "max_depth": depth,
            "learning_rate": lr,
            "subsample": sub,
            "colsample_bytree": col,
        },
    }


class SurfaceRequest(BaseModel):
    feature_x: str
    feature_y: str
    baseline_mode: str = "median"  # median, mean, min, max, zero


@app.post("/surface")
async def dynamic_surface(req: SurfaceRequest):
    """Dynamically recalculate the 3D prediction surface for any feature pair and baseline."""
    with MODEL_LOCK:
        model = MODEL_STATE.get("model")
        X_train = MODEL_STATE.get("X_train")
        task = MODEL_STATE.get("task")

    if model is None or X_train is None:
        raise HTTPException(400, "Train a model first before generating custom surfaces.")

    fx = req.feature_x
    fy = req.feature_y
    if fx not in X_train.columns or fy not in X_train.columns:
        raise HTTPException(400, f"Features '{fx}' and '{fy}' must exist in the model features.")

    low_x, high_x = X_train[fx].quantile([0.05, 0.95])
    low_y, high_y = X_train[fy].quantile([0.05, 0.95])
    if high_x <= low_x or high_y <= low_y:
        raise HTTPException(400, "Selected features have insufficient variance.")

    grid_x = np.linspace(float(low_x), float(high_x), 20)
    grid_y = np.linspace(float(low_y), float(high_y), 20)

    if req.baseline_mode == "mean":
        baseline = X_train.mean(numeric_only=True)
    elif req.baseline_mode == "min":
        baseline = X_train.min(numeric_only=True)
    elif req.baseline_mode == "max":
        baseline = X_train.max(numeric_only=True)
    elif req.baseline_mode == "zero":
        baseline = pd.Series(0.0, index=X_train.columns)
    else:
        baseline = X_train.median(numeric_only=True)

    grid_rows = []
    for vy in grid_y:
        for vx in grid_x:
            row = baseline.copy()
            row[fx] = vx
            row[fy] = vy
            grid_rows.append(row)

    grid_frame = pd.DataFrame(grid_rows, columns=X_train.columns)

    if task == "classification":
        probs = model.predict_proba(grid_frame)
        z_vals = probs[:, 1] if probs.shape[1] == 2 else probs.max(axis=1)
        z_label = "Class 1 Probability" if probs.shape[1] == 2 else "Max Class Probability"
    else:
        z_vals = model.predict(grid_frame)
        z_label = "Predicted Target"

    return {
        "status": "success",
        "x_feature": fx,
        "y_feature": fy,
        "baseline_mode": req.baseline_mode,
        "z_label": z_label,
        "x_values": grid_x.tolist(),
        "y_values": grid_y.tolist(),
        "z_values": np.asarray(z_vals, dtype=float).reshape(len(grid_y), len(grid_x)).tolist(),
    }


class PredictionRequest(BaseModel):
    features: dict[str, Any]


@app.post("/predict")
async def predict_single(request: PredictionRequest):
    """Run an individual inference request using current model."""
    with MODEL_LOCK:
        model = MODEL_STATE["model"]
        feature_names = list(MODEL_STATE["feature_names"])
        task = MODEL_STATE["task"]

    if model is None or not feature_names:
        raise HTTPException(400, "Train a model before requesting predictions.")

    row = {}
    for name in feature_names:
        val = request.features.get(name)
        if val is None:
            # Fall back to 0.0 if not provided
            row[name] = 0.0
        else:
            try:
                row[name] = float(val)
            except (ValueError, TypeError):
                row[name] = 0.0

    frame = pd.DataFrame([row], columns=feature_names)
    try:
        pred = model.predict(frame)[0]
        response = {
            "prediction": float(pred),
            "task": task,
            "features": row,
        }
        if task == "classification" and hasattr(model, "predict_proba"):
            response["probabilities"] = [float(v) for v in model.predict_proba(frame)[0]]
        return response
    except Exception as error:
        raise HTTPException(400, f"Prediction failed: {error}")


@app.post("/compare-models")
async def compare_models(
    file: UploadFile = File(...),
    target: str = Form(...),
    task: str = Form("regression"),
):
    """Benchmark XGBoost vs Random Forest vs Decision Tree on identical data splits."""
    from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
    from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor

    if task not in ("regression", "classification"):
        raise HTTPException(400, "Task must be regression or classification.")

    try:
        content = await file.read()
        df = pd.read_csv(io.BytesIO(content))
        if target not in df.columns:
            raise HTTPException(400, f"Target column '{target}' was not found.")

        df = df.dropna(subset=[target])
        y = df[target]
        X = df.drop(columns=[target])

        X = X.loc[:, X.nunique(dropna=True) > 1]
        X = pd.get_dummies(X, dummy_na=True, dtype=float)
        X = X.replace([np.inf, -np.inf], np.nan)
        X = X.fillna(X.median(numeric_only=True)).fillna(0.0)

        if task == "regression":
            y = pd.to_numeric(y, errors="coerce")
            valid = y.notna()
            X = X.loc[valid]
            y = y.loc[valid].astype(float)
            stratify = None
        else:
            y = y.astype(str)
            if y.nunique() < 2 or y.value_counts().min() < 2:
                raise HTTPException(400, "Classification requires at least two classes with >=2 samples each.")
            y = pd.Series(LabelEncoder().fit_transform(y), index=y.index)
            stratify = y

        if len(X) < 10 or y.nunique() < 2:
            raise HTTPException(400, "Not enough usable rows for comparison.")

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=stratify
        )

        if task == "regression":
            models = {
                "XGBoost": xgb.XGBRegressor(
                    n_estimators=100, max_depth=5, learning_rate=0.05,
                    objective="reg:squarederror", random_state=42, n_jobs=2
                ),
                "Random Forest": RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=2),
                "Decision Tree": DecisionTreeRegressor(random_state=42),
            }
        else:
            models = {
                "XGBoost": xgb.XGBClassifier(
                    n_estimators=100, max_depth=5, learning_rate=0.05,
                    eval_metric="logloss", random_state=42, n_jobs=2
                ),
                "Random Forest": RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=2),
                "Decision Tree": DecisionTreeClassifier(random_state=42),
            }

        results = []
        for name, m in models.items():
            t0 = time.perf_counter()
            m.fit(X_train, y_train)
            preds = m.predict(X_test)
            dur = time.perf_counter() - t0

            if task == "regression":
                mets = {
                    "r2": float(r2_score(y_test, preds)),
                    "mae": float(mean_absolute_error(y_test, preds)),
                    "rmse": float(np.sqrt(mean_squared_error(y_test, preds))),
                }
            else:
                avg = "binary" if y.nunique() == 2 else "weighted"
                mets = {
                    "accuracy": float(accuracy_score(y_test, preds)),
                    "precision": float(precision_score(y_test, preds, average=avg, zero_division=0)),
                    "recall": float(recall_score(y_test, preds, average=avg, zero_division=0)),
                    "f1": float(f1_score(y_test, preds, average=avg, zero_division=0)),
                }

            results.append({
                "model": name,
                "metrics": mets,
                "training_and_prediction_seconds": round(dur, 4),
            })

        return {
            "task": task,
            "target": target,
            "train_rows": len(X_train),
            "test_rows": len(X_test),
            "results": results,
        }
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(400, f"Model comparison failed: {error}")
