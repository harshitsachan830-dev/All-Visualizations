# MLP Visualizer

An interactive MLP learning dashboard inspired by the supplied visualization report and mockup. It includes linked 2D/3D architecture views, epoch-based training charts, class decision regions, feature analysis, and activation maps.

## Run locally

```sh
npm install
npm run dev
```

Run `npm run build` for the production build and `npm run lint` for lint checks.

## Data workflow

Choose one of the bundled Iris, Titanic, Wine Quality, and Student Performance examples, or upload a UTF-8 CSV. The import review lets you choose a prediction target and a per-column missing-value strategy. Numeric features support mean, median, or mode; categorical features and missing target labels use mode. Headers are normalized, duplicate rows and rows with extra fields are skipped, categorical features are encoded, and numeric features are standardized. Cleaned data can be exported as CSV.

Training runs a two-hidden-layer ReLU MLP with a softmax classifier in the browser. A stratified holdout set drives the validation curves; the selected sample and epoch are reflected across the network, prediction, charts, and feature-space views. Bundled CSVs are compact teaching samples rather than the full upstream datasets.
