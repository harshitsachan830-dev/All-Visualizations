# 🌌 K-Means 3D Visualization Studio

An interactive, production-grade 3D educational machine learning visualizer built with **React 19**, **TypeScript**, **Three.js (WebGL)**, and **Recharts**.

Built strictly according to the product specification in `KMeans_Full_3D_Visualization_Report_Final.docx`.

---

## ✨ Key Capabilities

### 🎯 3D-First Hero Visualization
- **True WebGL 3D Scatter Scene**: Orbit rotate, zoom, and pan smoothly at 60 FPS.
- **Centroids**: Distinct 3D glowing octahedron markers with pulsing halo rings.
- **3D Trajectory Trails**: Visualize the spatial path traveled by each centroid across Lloyd iterations.
- **Distance Rays**: Inspect any point or query point with glowing rays connecting to all centroids, highlighting the shortest distance.
- **Cluster Hulls**: Toggle translucent wireframe bounding spheres enclosing each cluster.
- **Camera Presets**: Isometric, Top-Down (X-Z), Front (X-Y), Side (Y-Z), and Reset.

### 🧹 Data Preprocessing & Imputation Engine
- **Custom CSV Drag-and-Drop**: Upload any custom CSV dataset.
- **Messy Data Handling**: 4 built-in imputation strategies:
  - **Mean** (Average value replacement)
  - **Median** (50th percentile replacement)
  - **Mode** (Most frequent category/value replacement)
  - **Drop Rows** (Removes rows with missing entries)
- **Built-in Sample Datasets**:
  - 🌸 **Iris Flowers** (4D classic clustering dataset)
  - 🛒 **Customer Segments** (5D dataset with intentional missing values to demo imputation)
  - 🔵 **Gaussian Blobs** (3 natural geometric clusters in 3D)

### 📊 Full Analytical Suite (Left-Side Navigation Architecture)
- **MODEL**: Overview, Dataset & Cleaning, 3D Visualization, Clustering Process.
- **INSPECT**: Cluster Analysis (size, spread, outliers), Centroid Movement ($\Delta\mu$ decay), Point Assignment (distance breakdown).
- **QUALITY**: Elbow Method (WCSS curve with automatic knee detection), Silhouette Analysis (per-cluster cohesion), Cluster Comparison.
- **EXPLAIN**: Prediction Explorer ("Where Would This Point Go?"), PCA 3D View (PC1, PC2, PC3 dimensionality reduction with explained variance).
- **EXPERIMENT**: Parameter Tuning (K slider, K-Means++ vs Random seeding, tolerance, seed control), Run Comparison (session history audit).
- **HELP**: Notes & Theory (Objective formulas, Lloyd's algorithm, limitations).

---

## 🚀 Running Locally

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build production bundle
npm run build
```

Open [http://localhost:5174/](http://localhost:5174/) in your browser.
