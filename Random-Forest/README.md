# Random Forest Explorer

A visual-first Random Forest classification app. Explore forest votes, fitted decision trees and paths, feature importance, predictions, and held-out evaluation metrics.

## Features

- Upload CSV classification datasets with selectable target and input columns.
- Handle missing feature values with mean, median, or mode imputation, or drop rows; target labels are never imputed.
- Use numeric and low-cardinality categorical features with generic class labels.
- Inspect dataset quality, class distributions, individual tree predictions, decision paths, and confusion-matrix metrics.
- Compare normalized Gini and held-out permutation feature importance.
- Adjust forest size, maximum tree depth, minimum leaf samples, and random seed.
- Export model settings and evaluation results as a CSV report.

## Run locally

```sh
npm install
npm run dev
```

Create a production build with `npm run build`; check lint with `npm run lint`.

See [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) for implementation details and validation status.
