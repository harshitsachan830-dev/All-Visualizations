# Project Context: PCA Visualization Studio

## Objective
Build a world-class, educational, and production-grade Principal Component Analysis (PCA) interactive web application with a pure black background, neon accent color palette, rich 2D and 3D visualizers (including an **Auto-Rotate** button for the 3D space), CSV upload with messy-data handling (Mean, Median, Mode imputation), feature scaling, and step-by-step mathematical decomposition walkthroughs.

## User Specifications
- **Black Background**: Ultra-modern deep dark UI (#000000 / #090a0f) with high-contrast glowing elements.
- **PCA Visualization**: Make PCA intuitive and crystal clear for everyone through interactive visualization.
- **Messy CSV Upload Section**:
  - Accept user CSV files.
  - Automatically detect missing / empty / NaN values.
  - Provide missing data filling options: **Mean**, **Median**, or **Mode** (plus drop rows option).
  - Feature column selection and target class/label selection.
- **3D Visualization**: Include a 3D visualization with an **Auto Rotate** toggle button.
- **Explainable Visualizations**:
  - 2D PCA projection scatter with zoom/pan and point details.
  - 3D PCA projection with Three.js orbit controls, lighting, and auto-rotation.
  - Scree Plot (Eigenvalues & Cumulative Explained Variance).
  - Biplot Loading Vectors (arrows indicating original feature directions in PC space).
  - Covariance / Correlation Heatmap.
  - Step-by-Step PCA educator breakdown (Centering -> Covariance -> Eigenvalues/Eigenvectors -> Projection).
- **Timely Documentation**: Keep `context.md` and `README.md` updated so anyone or a new conversation can seamlessly continue.

## Mathematical Formulation Implemented
1. **Centering & Scaling**:
   $$X_{centered} = X - \mu$$
   Standardized: $Z = \frac{X - \mu}{\sigma}$
2. **Covariance Matrix**:
   $$\Sigma = \frac{1}{n-1} Z^T Z$$
3. **Eigen-decomposition**:
   $$\Sigma v_i = \lambda_i v_i$$
   Sorted by $\lambda_1 \ge \lambda_2 \ge \dots \ge \lambda_p \ge 0$.
4. **Explained Variance Ratio**:
   $$\text{EVR}_i = \frac{\lambda_i}{\sum_{j=1}^p \lambda_j}$$
5. **Subspace Projection**:
   $$T = Z \cdot W_k \quad \text{where } W_k = [v_1, v_2, \dots, v_k]$$
6. **Feature Loadings / Biplot**:
   $$\text{Loading}_{j, i} = v_{j, i} \cdot \sqrt{\lambda_i}$$

## Color Palette & Theme Tokens
- Background: `#000000` (Pure Obsidian Black)
- Card / Panel Glass: `rgba(18, 20, 29, 0.85)` with `backdrop-filter: blur(16px)` and subtle glowing border `rgba(255, 255, 255, 0.08)`
- Primary Accent (Cyan): `#00f0ff`
- Secondary Accent (Magenta/Pink): `#ff007f`
- Tertiary Accent (Neon Lime): `#00ff88`
- Warning / Energy (Gold): `#ffb700`
- Lavender / PC3: `#b55fe6`
- Typography: Inter / SF Pro font family with tabular numerics for mathematical precision.

## Architecture Status
- [x] Initialized README.md and context.md
- [x] React + Vite + TypeScript application bootstrapped (manually, no npx scaffolding needed)
- [x] PCA mathematical engine: mean-centering, StandardScaler/MinMax/raw, Jacobi Eigen-solver, covariance matrix, explained variance, cumulative variance, loadings
- [x] 2D PCA Canvas Visualizer with pan/zoom, Biplot loading vectors, confidence ellipses, axis selector, point hover tooltips, PNG export
- [x] 3D Three.js PCA Visualizer with AUTO-ROTATE toggle button + speed slider, orbital controls, camera presets (Iso/Top/Side), 3D loading arrows (gold), floor grid, cluster legend, raycasting hover tooltips
- [x] Scree Plot & Cumulative Variance Chart: interactive bars, cumulative curve, 80%/90% thresholds, Kaiser criterion rule, K-slider, component breakdown table
- [x] Biplot & Loadings View: 2D correlation circle, feature arrow vectors, loading importance table with sort-by
- [x] Messy CSV Cleaner Studio: missing cell detection, Mean / Median / Mode / Drop imputation cards, interactive data preview table with gold highlights, feature column checklist, label selector, export cleaned CSV
- [x] Step-by-Step Educational Walkthrough: Step 1 (interactive centering canvas), Step 2 (covariance heatmap with hover inspect), Step 3 (eigenvalue ranking bars), Step 4 (interactive 1D projection animation)
- [x] CSV Upload Modal with drag-and-drop, PapaParse parsing, auto-detection of numeric/categorical columns, sample messy CSV template download
- [x] 4 Curated Preset Datasets: Iris (clean, 150 samples), Messy Customer Analytics (100 samples, missing values), Wine Recognition (13 features), 3D Helical Swarm (generated twin spirals + core, designed for 3D spatial rotation)
- [x] **CRITICAL BUG FIXED**: `isMissing()` function now correctly treats only empty/sentinel tokens as missing — not arbitrary categorical strings like 'setosa', 'versicolor', 'virginica'. This restores multi-class color-coding in 2D and 3D views.
- [x] `profileColumns()` fixed to separately count true missing cells vs. valid text label cells
- [x] Pure obsidian black theme (#000000) with neon accent palette: Cyan (#00f0ff), Magenta (#ff007f), Lime (#00ff88), Gold (#ffb700), Purple (#a855f7), glassmorphism panels
- [x] App runs at http://127.0.0.1:5175/ (Vite dev server)

## For Next Conversation Continuation
If context limit reached, open a new conversation and read:
- `/Users/harshit9793/PCA/context.md` ← this file (full architecture)
- `/Users/harshit9793/PCA/README.md` ← feature overview
- Project location: `/Users/harshit9793/PCA/`
- Dev server: `cd /Users/harshit9793/PCA && npm run dev`
- Port: 5175 (127.0.0.1)
- All source in `/Users/harshit9793/PCA/src/`

## Potential Enhancements (Next Session)
- Add Reconstruction / Inverse PCA back-projection visual
- Add kernel PCA option (RBF kernel) for nonlinear data
- Add animation "play" button for Step 1 and Step 4 educational slides
- Add a correlation heatmap standalone tab for feature pair analysis
- Export PCA results as JSON (eigenvalues, loadings, projections)
