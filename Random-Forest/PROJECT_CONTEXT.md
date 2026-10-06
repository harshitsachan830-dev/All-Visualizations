# Project Context

## Goal

Build a visual-first, beginner-friendly random forest explorer. Keep theory minimal while showing ensemble votes, a real tree path, feature importance, and evaluation on clearly separated held-out examples.

## Current State

- Vite + React + TypeScript app using `ml-random-forest`; verified dev server is `http://127.0.0.1:5177/`.
- Main workspace has a ModelMind-style persistent sidebar with Random Forest as its only listed visualization and an About Random Forest section. The About section explains the project workflow, CSV preparation, forest fitting, available exploration tools, evaluation, and scope/interpretation limits. The dashboard also has seven model views: Overview, Prediction, Trees, Decision Paths, Feature Importance, Evaluation, and Data Insights.
- Forest, Prediction, and Model quality tabs share one fitted classification model, selected observation, and selected tree.
- Two bundled CSVs: Garden bed and Greenhouse trials. Each has 40 rows and the shared schema `petal_length_cm,petal_width_cm,flower_class`; each selection uses 30 training rows and 10 held-out test rows. (Wildflower survey removed; only 2 sample CSVs retained as requested.)
- **Datasets tab**: Users can upload CSVs with their own column names, select a categorical classification target, and choose input columns. Numeric features are used directly; low-cardinality categorical features are one-hot encoded. ID/name/email/date and high-cardinality categorical columns are excluded from automatic input selection.
  - Common missing markers (empty, `NA`, `N/A`, `null`, `none`, `nan`, `?`) and invalid cells in numeric columns are identified. Numeric columns can be imputed with **Mean**, **Median**, or **Mode**; categorical features use their mode. Users can instead drop rows with missing selected inputs or target labels and can opt to remove duplicate rows.
  - Files need at least 8 rows, a target with 2–30 classes, and at least one selected feature. Missing target labels are dropped rather than imputed.
  - After cleaning, a preview and summary show remaining rows, dropped rows, and imputed values. An activated upload drives generic class labels and feature names through model training, predictions, tree paths, feature importance, and the confusion matrix.
  - Multiple uploads are supported in a session; user datasets appear in a "My uploads" optgroup in the dataset picker.
- Forest tab shows the ensemble vote, selectable individual tree outputs, and a selectable fitted tree diagram with the selected sample's route.
- Prediction tab lets users select an existing row, view feature values and per-tree outcomes, and inspect the same tree route.
- Evaluation shows held-out accuracy, macro precision/recall/F1, weighted F1, per-class F1/support, and a class-generic confusion matrix. Small held-out test sets are explicitly flagged.
- Feature importance can switch between the fitted forest's normalized Gini decrease and deterministic held-out permutation importance.
- Data Insights reports source/missing/duplicate/dropped/imputed/model-ready row counts and target class distribution.
- Forest overview follows the ModelMind-style dashboard: actual split/configuration, dataset and class summaries, forest votes, feature importance, held-out performance, tree preview, and prediction details.
- The selected tree explorer places the scrollable diagram beside node details and the selected observation's route.
- Tree nodes use larger split/leaf cards (198×90 SVG units) positioned by actual descendant leaves; diagram width grows with leaf count.
- Model settings expose tree count (5/10/25/50/100), maximum depth (Auto/3/5/8/12), minimum samples per leaf (2/3/5/10), and random seed. Gini is displayed as the library's actual default criterion. The Train/Re-fit action changes the deterministic seed.
- Prediction supports selecting a held-out/training observation or entering manual numeric model inputs; forest vote shares are labeled as uncalibrated.
- The dashboard exports a CSV report containing data, actual model settings, class counts, and held-out metrics, and offers link sharing with visible clipboard status.

## New files

- `src/csvParser.ts` — CSV parsing, validation (missing values, duplicates, bad classes, non-numeric), and cleaning logic (mean/median/mode imputation, drop strategy).
- `src/CsvUpload.tsx` — Drag-and-drop CSV upload component with quality report, cleaning options, and preview. Self-contained state machine.

## Design / Implementation Decisions

- Keep the first screen as the working visualization, not a marketing or lesson landing page.
- Train only on the training split; compute reported quality metrics only from held-out test rows.
- Use the fitted CART nodes and library-provided feature importance; do not display hand-authored split rules as trained model data.
- Keep the selected observation/tree synchronized across views and label all scores as model outputs.
- Follow the supplied ModelMind dashboard reference: light blue-gray canvas, white analytics panels, sidebar navigation, DM Sans/Manrope hierarchy, blue primary accents, and coral contrast for the second class. Keep the vote-share bar animated and use a subtle pulse to identify the selected point in the feature-space chart; do not imply that forest trees train sequentially.
- Main view composition is in `src/App.tsx`; model training and traversal are in `src/model.ts`; explorer styles are in `src/Explorer.css`.
- CSV parsing/cleaning utilities are pure functions in `src/csvParser.ts` with no side effects; `CsvUpload` component is self-contained.
- CSV upload supports classification, not regression. Numeric targets with a limited number of distinct values are interpreted as class labels; it does not infer continuous-target regression.

## Validation

- `npm run build` and `npm run lint` pass after the ModelMind dashboard and report-driven feature updates.
- Browser smoke checks passed for all seven view tabs, model configuration visibility, dark theme toggle, permutation importance, held-out evaluation metrics, CSV report export, and dashboard link copy.
- About Random Forest sidebar navigation and project guide verified in the browser; its four-step workflow, feature list, scope notes, and dataset link render without horizontal page overflow.
- Upload smoke test used the messy sample: median imputation, duplicate removal, cleaned preview, activation, and propagation into the model views all worked (13 usable rows, 2 imputed values, 1 duplicate removed).
- Checked dashboard layout at desktop and narrow mobile widths; Evaluation and Overview fit without document-level horizontal overflow. Mobile Evaluation badge wrapping was adjusted for long dataset labels.
- Dev server verified at `http://127.0.0.1:5177/`.
- Bundled CSVs: Garden bed and Greenhouse trials (2 samples, down from 3).
- Upload flow: drop zone → quality report → cleaning options → preview → "Use this dataset" activates it across all tabs.

## Next Session Handoff

Read this file first. Generic classification CSV upload is implemented in `src/CsvUpload.tsx` and `src/csvParser.ts`; model training, held-out metrics, and importance live in `src/model.ts`. Uploaded datasets retain their selected target, encoded features, class names, and quality metadata, then drive all views in `src/App.tsx`. User datasets are stored in `userDatasets` and merged with the two selectable sample datasets. Do not restore the flower-only upload schema. Keep regression out of scope unless explicitly requested, and keep held-out scoring and dataset selection synchronized across views. The app's verified local preview is `http://127.0.0.1:5177/`.

## Separate XGBoost Project

- `/Users/harshit9793/Xg boost/` is a standalone React + FastAPI app, not a dependency of the Random Forest visualizer.
- Its sample CSV flows were smoke-tested for classification and regression. The Home prices sample explicitly defaults to `price_usd` regression; Telco churn defaults to `churn` classification.
- Frontend build/lint pass. Run frontend with `cd "/Users/harshit9793/Xg boost" && npm run dev`; run the API separately with `npm run api` from that directory.
