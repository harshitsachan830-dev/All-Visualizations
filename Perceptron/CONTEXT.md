# Project Context

## Product goal

Create an educational Perceptron visualization tool that makes the learning process tangible. The primary story is not "many charts"; it is "the model moves a line to correct mistakes." Every feature must serve that story or teach a concept the Perceptron illustrates.

## Source report

The UI and interaction direction comes from `Perceptron_Visualization_Report_Final.docx` in the user's Downloads folder. All three blueprint phases have now been implemented.

## Current implementation status

### Phase 1 — MVP (complete ✅)
- React + Vite single-page frontend, in-browser Perceptron with deterministic replay
- Starter linearly-separable two-feature dataset + noisy/overlapping dataset
- CSV importer: quoted-field parsing, explicit feature/target mapping, mean/median/mode filling
- Dataset Explorer: feature ranges, class counts, row-level status, cleaned-CSV export
- Animated 2D decision boundary (hero feature)
- Step-by-step math breakdown: score → threshold → update rule per sample
- Synchronized error trend, weight/bias history charts, confusion matrix, precision, recall, F1
- Prediction Explorer: point on boundary chart with live score display
- Interactive Playground: click to add samples, convergence status
- Learning-rate comparison table, Theory & Notes page

### Phase 2 — Polished (complete ✅)
- **Animation speed selector**: 0.25×, 0.5×, 1×, 2×, 4× via control bar
- **Previous boundary dashed line**: shown in grey/dashed when boundary shifts
- **Accuracy over steps chart**: separate accuracy line chart alongside misclassified chart
- **Boundary snapshots panel**: auto-selected milestones (step 0, 10%, 25%, 50%, final) — click any to jump
- **Class balance bar**: visual coral/indigo bar in Dataset Explorer showing class distribution %
- **Dark / Light theme toggle**: full CSS-custom-property theming via `data-theme` attribute
- **Undo last point**: remove most recently added point in playground
- Expanded comparison table: added F1 column, `comp-active` highlight for current config
- Responsive layout improvements: wrapping control fields, 900px breakpoint

### Phase 3 — Advanced (complete ✅)
- **Interactive 3D decision plane**: canvas-based perspective projection (no external 3D library) — shows score surface z = w·x + b, data points floating at their score height, decision boundary at z=0, full drag-to-rotate interaction
- **Drag existing playground points**: mousedown on any point to reposition; model retrains live
- **Shareable replay link**: `Share` button encodes step/rate/epochs in URL hash; anyone with the link reopens the exact state
- **Training report export**: `Export report` downloads a .txt file with dataset summary, hyperparameters, final weights, metrics, and per-step accuracy log

## Design system

- Primary: indigo / purple (`#5b5bd6`)
- Class 0 and error: restrained coral (`#f07167`)
- Success: muted green (`#24a57a`)
- Surfaces: warm white (light) / deep navy (dark)
- Typography: Manrope (UI) + DM Mono (code/equations) + Playfair Display (heading)
- CSS custom properties power both light and dark themes via `[data-theme="dark"]`

## Architecture

- Single file: `src/main.jsx` (~550 lines) — all components, algorithm, and state
- `src/styles.css` — token-based CSS with full dark/light theme, all component styles
- No backend, no persistence — fully client-side
- 3D view uses browser Canvas 2D API with hand-written perspective projection (no Three.js/Plotly)

## Deliberate scope limits

- Client-side only; no API or database
- Perceptron is a two-feature linear classifier; the 3D view is the score *plane*, never a nonlinear surface
- Model comparison is limited to learning-rate configurations on the same dataset

## Known extension opportunities

1. Multi-feature support (>2 features, PCA projection for visualization)
2. Feature scaling (standardization before training)
3. WebGL accelerated 3D (Three.js) for smoother large-dataset rendering
4. Persistent experiment snapshots via localStorage
5. Animated boundary displacement (smooth CSS/RAF interpolation between old and new line)