# PCA (Principal Component Analysis) Interactive Visualizer & Studio

A state-of-the-art, interactive 2D and 3D Principal Component Analysis (PCA) exploration platform and educational suite designed with a sleek, ultra-modern dark theme.

## Core Features
1. **Interactive 2D PCA Space**:
   - Scatter plot of PC1 vs PC2 (or customizable PC axes).
   - Biplot loading vectors showing feature contributions.
   - Cluster confidence ellipses and convex hulls.
   - Interactive hover cards displaying sample details, original features, and projection coordinates.
   - Zoom, pan, and coordinate inspection.

2. **Full 3D PCA Space (Three.js)**:
   - Interactive 3D point cloud of PC1, PC2, and PC3.
   - **Auto-Rotate Toggle Button** for continuous rotation and 360-degree spatial perspective.
   - 3D Loading vectors (eigenvector rays in 3D).
   - Grid planes, glowing coordinate axes, and orbital controls.

3. **Scree Plot & Explained Variance**:
   - Bar chart of explained variance ratio per principal component.
   - Cumulative variance curve with 80% & 90% information retention markers.
   - Kaiser criterion indicator (Eigenvalue > 1.0).

4. **Messy CSV Data Upload & Preprocessing Studio**:
   - Drag & drop CSV file upload.
   - Automatic detection of missing, null, NaN, and blank values with visual highlights.
   - **Missing Value Imputation**:
     - **Mean** imputation
     - **Median** imputation
     - **Mode** imputation
     - Drop incomplete rows
   - Feature Scaling / Normalization (StandardScaler Z-Score, Min-Max, or Raw Centering).
   - Dynamic selection of numerical feature columns and categorical label/color columns.

5. **Step-by-Step PCA Educational Walkthrough**:
   - Step 1: Data Matrix & Centering (Subtracting Mean)
   - Step 2: Covariance Matrix computation with interactive correlation heatmap
   - Step 3: Eigen-decomposition (Eigenvalues & Eigenvectors)
   - Step 4: Projection into Principal Component subspace

6. **Curated Benchmark Datasets**:
   - Iris Flower Dataset (150 samples, 4 features, 3 species)
   - Wine Cultivars Dataset (178 samples, 13 chemical features, 3 classes)
   - Breast Cancer Wisconsin (569 samples, 30 features, Malignant / Benign)
   - Customer Spending & Demographics (Synthetic messy dataset with missing values for testing Mean/Median/Mode imputation)
   - 3D Swiss Roll / Spiral Clusters (3D geometric point clouds)

## Tech Stack
- **Framework**: React 18 / Vite / TypeScript
- **3D Engine**: Three.js with OrbitControls
- **2D Visualizations**: Canvas & SVG interactive rendering engines
- **CSV Engine**: PapaParse with automatic type coercion and error handling
- **Icons**: Lucide React
- **Math Engine**: Custom pure-TS PCA pipeline (Jacobi Eigen-solver, StandardScaler, MinMax, Covariance matrix)
- **Design**: Premium Black Theme (#000000) with Neon Accents (Cyan #00f0ff, Magenta #ff007f, Gold #ffb700, Lime #00ff88, Purple #a855f7) and Glassmorphism

## Running Locally
```bash
npm install
npm run dev
```
Open `http://127.0.0.1:5175/` in your browser.

> **Note:** Port 5175 is configured in `vite.config.ts` — do not change it without updating the dev server.

## Bug Fix Log
| Date | Issue | Fix |
|------|-------|-----|
| 2026-10-02 | `isMissing()` treated all non-numeric strings (e.g. 'setosa') as missing → all Iris points showed as "Sample" with single color | Fixed sentinel-only check: only empty/NaN/null/'?'/'na'/'none'/'n/a' are missing |
| 2026-10-02 | `profileColumns()` counted valid label strings as missing cells | Separated `isMissing()` check from numeric-ability check |

## Continuing This Project (Next Session)
If the context limit is reached, start a new conversation and reference:
- `context.md` — complete architecture reference
- `README.md` — this file
- Run `cd /Users/harshit9793/PCA && npm run dev` to start dev server
- App runs at `http://127.0.0.1:5175/`
