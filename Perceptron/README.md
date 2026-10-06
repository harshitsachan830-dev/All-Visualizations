# Perceptron Learning Studio

An interactive single-layer Perceptron visualizer built around one idea: **every model update moves the decision boundary.** All three blueprint phases are complete.

## Features

### Core — Phase 1
- Animated, replayable 2D decision boundary with current-sample pulsing highlight
- Step-by-step breakdown: pre-update score and prediction, exact weight/bias changes, and resulting decision function
- Synchronized charts: misclassified samples trend, weight/bias history
- Confusion matrix, accuracy, precision, recall, and F1 score
- CSV upload with quoted-field parsing, feature/target mapping, and missing-value imputation (mean, median, or mode)
- Dataset Explorer: class balance, feature ranges, row-level prediction status, cleaned-CSV export
- Prediction Explorer: enter any point, see score and predicted class live on the boundary chart
- Interactive playground: click to add samples, observe convergence and non-convergence
- Learning-rate comparison table across η = 0.05–0.50
- Theory & Notes page with update rule, convergence theorem, and separability explanation

### Polish — Phase 2
- **Animation speed selector** — 0.25×, 0.5×, 1×, 2×, 4× in the control bar
- **Previous boundary dashed line** — grey dashed overlay shows where the line was before the last update
- **Accuracy over steps chart** — separate line chart alongside the misclassified samples chart
- **Boundary snapshots panel** — auto-selected training milestones; click any mini-chart to jump to that step
- **Class balance bar** — visual coral/indigo bar in Dataset Explorer showing per-class %
- **Dark / Light theme toggle** — full dark mode via CSS custom properties, toggle in sidebar
- **Undo last point** — remove the most recently added playground point
- Expanded comparison table with F1 column and current-config highlight

### Advanced — Phase 3
- **Interactive 3D decision plane** — resize-aware canvas perspective projection (no external library). Shows the score surface z = w·x + b with a uniform vertical fit scale so large scores stay in frame. Data points float at their score height, and the decision boundary is clipped to the visible feature grid. **Drag or touch to rotate.**
- **Drag existing playground points** — mousedown on any point to reposition; model retrains live
- **Shareable replay link** — the `Share` button encodes current step, learning rate, and epoch count in the URL hash; paste the link to open the exact replay state
- **Training report export** — `Export report` downloads a .txt file with dataset summary, hyperparameters, final weights/bias, all metrics, and a per-step accuracy log

## Run locally

```bash
npm install
npm run dev
```

Open the local Vite address shown in the terminal.

## CSV format

After upload, select any two numeric columns as plotted features and a target column with exactly two classes. The importer recognizes numeric values with simple units (for example, `65 kg` or `175 cm`), common missing-value markers (`NaN`, `N/A`, `unknown`), and common binary labels (`Male`/`Female`, `M`/`F`, `Yes`/`No`, `Y`/`N`). It suggests numeric features and a binary target when it can identify them; target options marked “2 classes” are valid Perceptron targets.

```csv
feature_1,feature_2,label
-1.3,-0.8,0
1.1,0.7,1
```

Blank, `NA`, and `null` fields are filled during import. Numeric columns use mean or median; categorical values use the mode. The Dataset Explorer can download the prepared data as a cleaned CSV.

## Keyboard / UI quick reference

| Control | Action |
|---|---|
| Play / Pause | Animate the training replay |
| ← → buttons | Step backward / forward one sample |
| Reset | Return to step 0 |
| Speed selector | Change animation speed (0.25×–4×) |
| Timeline scrubber | Jump to any step directly |
| Boundary snapshot | Click any mini-chart to jump to that milestone |
| Share button | Copy URL encoding current step + hyperparameters |
| Export report | Download full text report |
| Dark mode toggle | Switch light ↔ dark theme |
| 3D view button | Toggle interactive score-plane canvas |
| Playground drag | Mousedown on any point to reposition it live |

## Technical notes

Training uses the classic Perceptron rule:

`w ← w + η(y − ŷ)x` and `b ← b + η(y − ŷ)`

The app intentionally presents a 2D linear decision boundary and a linear 3D score *plane*. It does not imply that a single Perceptron learns nonlinear surfaces — that requires multiple layers (MLP).

The 3D view uses the browser's Canvas 2D API with a hand-written perspective projection, high-DPI scaling, and resize observation. No Three.js or Plotly dependency is required.
