# ModelMind Studio — Enterprise XGBoost Visual Intelligence Engine

A comprehensive, state-of-the-art visual analytics platform and interpretability engine for **Extreme Gradient Boosting (XGBoost)** models. Built with **FastAPI**, **React 19**, **Vite**, **Plotly.js WebGL**, and a **Dual-Theme Studio Architecture**.

---

## 🌟 Key Highlights & Systematic Workflow (9 Steps)

ModelMind Studio implements a 9-step systematic machine learning workflow:

1. **Step 1: Dataset Explorer & Schema Inspector**
   - Automated schema detection, missing cell percentages, data type inference, and feature profiling.
   - **Missing Value Imputation Engine**: Support for `median`, `mean`, `mode`, and `zero` fill strategies, alongside native XGBoost sparsity-aware handling.
   - One-click benchmark loaders for regression (`house_prices`, `loan_repayment_nulls`, `nulls_benchmark`) and classification (`customer_churn`).

2. **Step 2: Training & Interactive Hyperparameter Studio**
   - Real-time model fitting with customizable parameters: `n_estimators`, `max_depth`, `learning_rate`, `subsample`, `colsample_bytree`.
   - Comprehensive performance metrics: RMSE, MAE, R², Pearson Correlation, and 5-Fold Cross-Validation mean & standard deviation.
   - Imputation audit cards tracking imputed cells and null handling.

3. **Step 3: 3D Visualizations Studio (12 Spatial Topologies)**
   - Interactive 3D WebGL rendering powered by Plotly:
     - **3D.1**: Dynamic Bivariate Target Prediction Surface with companion 2D contour maps and configurable baseline imputations (`median`, `mean`, `zero`).
     - **3D.2**: 3D Residual Topography ($X_1 \times X_2 \times \text{Residual}$).
     - **3D.3**: Decision Tree Hierarchy Spatial Mesh with multi-level split nodes.
     - **3D.4**: Feature Importance Landscape ($X_1 \times X_2 \times \text{Importance Score}$).
     - **3D.5**: Learning Rate Dynamics Manifold (Iterations vs Loss Surface).
     - **3D.6**: Cross-Validation Generalization Terrain across all 5 folds.
     - **3D.7**: SHAP Tri-Feature Interaction Mesh ($X_1 \times X_2 \times \text{SHAP Value}$).
     - **3D.8**: Partial Dependence Bivariate Surface.
     - **3D.9**: Residual Error Variance Envelope.
     - **3D.10**: Loss Gradient Topography ($g_i$ First Derivative vs $h_i$ Second Derivative).
     - **3D.11**: Feature Space Coverage & Uncertainty Volumes.
     - **3D.12**: Hyperparameter Optimization Landscape (Depth vs Learning Rate vs R²).

4. **Step 4: 2D Visualizations Studio (16 Diagnostic Charts)**
   - 16 specialized analytical charts:
     - Residuals vs Fitted
     - Actual vs Predicted Regression Line
     - Q-Q Normality Plot with theoretical quantiles
     - Residuals Distribution Histogram with KDE
     - Validation Learning Curves (Train vs Val Loss divergence)
     - Cumulative Boost Convergence Curve
     - Split Gain / Weight / Cover Feature Importance
     - Single-Feature Partial Dependence Plots (PDP)
     - Individual Conditional Expectation (ICE) Curves
     - Tree Architecture Topology Visualizer
     - Correlation Matrix Heatmap
     - Outlier Cook's Distance Leverage Diagnostic
     - SHAP Summary Beeswarm Plot
     - SHAP Single-Feature Dependence Scatter
     - ROC Curve with AUC score (classification)
     - Precision-Recall Curve with Average Precision (classification)

5. **Step 5: Explainability Studio (SHAP Attribution & Interactions)**
   - Global feature ranking and interaction matrices.
   - Local sample inspection with individual prediction waterfall breakdowns ($y - \text{Base}$).

6. **Step 6: Real-Time What-If Scenario Simulator**
   - Interactive sliders and numeric inputs for every independent feature.
   - Real-time client-side prediction scoring against the trained XGBoost tree ensemble.
   - Scenario comparison ledger logging deltas from baseline inputs.

7. **Step 7: Model Benchmark (Head-to-Head)**
   - Direct cross-validation benchmark comparing **XGBoost** against **Random Forest** and **Decision Trees** on identical data splits.
   - Multi-metric comparative bar chart and execution latency benchmarks.

8. **Step 8: Reports & Data Export**
   - Detailed model architecture and training parameter dumps.
   - Export full predictions CSV (`actual`, `predicted`, `residual`, `features`).
   - Diagnostic run logs and JSON metric exports.

9. **Step 9: XGBoost Theory, Architecture & Visualizations Guide**
   - **Hyperparameter Dynamics & Sensitivity Simulator**: Interactive toggle between `[ ▲ When You INCREASE ]` and `[ ▼ When You DECREASE ]` for all 8 parameters (`learning_rate`, `max_depth`, `n_estimators`, `subsample`, `colsample_bytree`, `gamma`, `reg_lambda`, `min_child_weight`) with 6 dynamic impact cards and summary table.
   - **Mathematical Foundations**: Step-by-step mathematical breakdown of additive boosting, regularized objective function $\Omega(f_t)$, 2nd-order Taylor expansion with $g_i$ and $h_i$, closed-form optimal leaf weights $w_j^* = -G_j / (H_j + \lambda)$, and split Gain formula.
   - **Visualizations Interpretation Guide**: How to read and detect anomalies on all 12 3D surfaces and 16 2D diagnostic plots.
   - **Missing Values & Sparsity Handling**: In-depth comparison of Median vs Mean vs Mode vs Zero Fill and native sparsity routing.
   - **Production Code Recipes**: Copy-pasteable Python scripts for early stopping and 3D mesh surface coordinate extraction.

---

## 🎨 Dual-Theme Design System

- **🌙 Cyber Obsidian (Dark Mode)**:
  - Deep cosmic obsidian background (`#080911`) with radial nebula lighting.
  - Frosted glassmorphism panels (`rgba(19, 17, 30, 0.85)`) with electric purple/magenta glow borders.
  - Glowing accents: Electric Violet (`#a855f7`), Neon Pink (`#ec4899`), Cyan Glow (`#22d3ee`), Emerald Spark (`#4ade80`).
- **☀️ Executive Platinum (Light Mode)**:
  - Clean porcelain canvas (`#f4f6fb`) with lavender ambient gradient.
  - Pure white elevated cards (`#ffffff`) with subtle drop shadows (`0 4px 20px -2px rgba(15, 23, 42, 0.06)`).
  - High-contrast deep slate typography (`#0f172a`), royal iris (`#7c3aed`), and vibrant fuchsia (`#db2777`).
- **One-Click Theme Toggle**: Located in the top header with smooth animated sliding thumb and automatic `localStorage` persistence.
- **Synchronized Plotly Engine**: All 3D meshes, 2D charts, and SHAP plots dynamically recolor their axes, fonts, and gridlines when switching themes.

---

## 🛠️ Project Structure

```
XGBoost/
├── backend/
│   ├── main.py                  # FastAPI server with XGBoost, imputation, 3D/2D APIs
│   ├── requirements.txt         # Python dependencies
│   └── samples/                 # Preloaded benchmark CSV datasets
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── src/
│   │   ├── App.jsx              # Main router, navigation sidebar, theme provider
│   │   ├── App.css              # Glassmorphic CSS design system, dark & light themes
│   │   ├── index.css            # Responsive layout & theme variables
│   │   ├── features/
│   │   │   ├── DatasetExplorer.jsx       # Step 1: Ingestion & Imputation
│   │   │   ├── TrainingSection.jsx       # Step 2: Training & Metrics
│   │   │   ├── Studio3D.jsx              # Step 3: 12 3D Spatial Topologies
│   │   │   ├── Studio2D.jsx              # Step 4: 16 2D Diagnostic Plots
│   │   │   ├── ExplainabilityStudio.jsx  # Step 5: SHAP Attributions
│   │   │   ├── WhatIfPredictor.jsx       # Step 6: What-If Simulator
│   │   │   ├── ModelBenchmark.jsx        # Step 7: Head-to-Head Comparison
│   │   │   ├── ReportsSection.jsx        # Step 8: Export & Diagnostic Logs
│   │   │   └── TheorySection.jsx         # Step 9: Architecture & Visuals Guide
│   │   └── services/
│   │       └── api.js                    # REST API client
├── samples/                     # CSV datasets for quick testing
└── docs/                        # Architecture & project plan specifications
```

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- Python 3.9+
- Node.js 18+ and npm

### 2. Backend Setup
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```
API Documentation will be available at: `http://127.0.0.1:8000/docs`

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open your browser at: `http://localhost:5173/`

---

## 📄 License
MIT License
