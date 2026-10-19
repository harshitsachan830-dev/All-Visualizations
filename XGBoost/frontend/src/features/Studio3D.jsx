import { useState, useMemo, useEffect } from "react";
import Plot from "react-plotly.js";
import { fetchDynamicSurface } from "../services/api";

export default function Studio3D({ result, task, theme }) {
  const [active3DTab, setActive3DTab] = useState("surface");
  const [colorscale, setColorscale] = useState("Viridis");
  const [showContourCompanion, setShowContourCompanion] = useState(true);

  // Dynamic surface state
  const [surfFeatureX, setSurfFeatureX] = useState("");
  const [surfFeatureY, setSurfFeatureY] = useState("");
  const [baselineMode, setBaselineMode] = useState("median");
  const [dynamicSurfaceData, setDynamicSurfaceData] = useState(null);
  const [loadingSurface, setLoadingSurface] = useState(false);
  const [surfaceError, setSurfaceError] = useState("");

  // Importance criterion state
  const [importanceType, setImportanceType] = useState("gain"); // gain, weight, cover

  // Tree selector state
  const [selectedTreeIndex, setSelectedTreeIndex] = useState(0);

  // SHAP dependence feature selectors
  const [shapFeat1, setShapFeat1] = useState("");
  const [shapFeat2, setShapFeat2] = useState("");

  const featureList = useMemo(() => {
    return result?.features || [];
  }, [result]);

  // Initialize feature selectors
  useEffect(() => {
    if (result?.prediction_surface) {
      setSurfFeatureX(result.prediction_surface.x_feature);
      setSurfFeatureY(result.prediction_surface.y_feature);
      setDynamicSurfaceData(result.prediction_surface);
    } else if (featureList.length >= 2) {
      setSurfFeatureX(featureList[0]);
      setSurfFeatureY(featureList[1]);
    }

    if (featureList.length >= 2) {
      setShapFeat1(featureList[0]);
      setShapFeat2(featureList[1]);
    }
  }, [result, featureList]);

  // Recalculate dynamic surface when user changes features or baseline
  async function handleRecalculateSurface() {
    if (!surfFeatureX || !surfFeatureY) return;
    setLoadingSurface(true);
    setSurfaceError("");
    try {
      const data = await fetchDynamicSurface({
        feature_x: surfFeatureX,
        feature_y: surfFeatureY,
        baseline_mode: baselineMode,
      });
      setDynamicSurfaceData(data);
    } catch (err) {
      setSurfaceError(err.message || "Failed to calculate 3D surface.");
    } finally {
      setLoadingSurface(false);
    }
  }

  const isLight = theme === "light";

  // Base layout token matching the design system
  const baseLayout3D = {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { color: isLight ? "#1e293b" : "#e5e7eb", family: "'DM Sans', sans-serif" },
    margin: { l: 20, r: 20, t: 30, b: 20 },
    scene: {
      xaxis: {
        backgroundcolor: isLight ? "#f8fafc" : "#0f0f18",
        gridcolor: isLight ? "rgba(203, 213, 225, 0.7)" : "#282338",
        showbackground: true,
        zerolinecolor: isLight ? "#6366f1" : "#8b5cf6",
        color: isLight ? "#475569" : "#c4b5fd",
      },
      yaxis: {
        backgroundcolor: isLight ? "#f8fafc" : "#0f0f18",
        gridcolor: isLight ? "rgba(203, 213, 225, 0.7)" : "#282338",
        showbackground: true,
        zerolinecolor: isLight ? "#6366f1" : "#8b5cf6",
        color: isLight ? "#475569" : "#c4b5fd",
      },
      zaxis: {
        backgroundcolor: isLight ? "#f8fafc" : "#0f0f18",
        gridcolor: isLight ? "rgba(203, 213, 225, 0.7)" : "#282338",
        showbackground: true,
        zerolinecolor: isLight ? "#6366f1" : "#8b5cf6",
        color: isLight ? "#475569" : "#c4b5fd",
      },
      camera: {
        eye: { x: 1.5, y: 1.5, z: 1.2 },
      },
    },
    autosize: true,
  };

  if (!result) {
    return (
      <div className="section-container">
        <div className="empty-panel">
          <div className="empty-icon">◈</div>
          <h3>3D Visualization Studio Awaiting Trained Model</h3>
          <p>
            Upload a dataset in Step 1 and train your XGBoost model in Step 2 to generate rotatable 3D surfaces and scatter visualizations.
          </p>
        </div>
      </div>
    );
  }

  // List of all 12 core 3D visualizers from Section 4A of the document
  const menuItems = [
    { id: "surface", label: "3D Prediction Surface", icon: "◈", applicable: "Both" },
    { id: "actual_pred", label: "3D Actual vs Predicted", icon: "⤢", applicable: "Regression" },
    { id: "importance", label: "3D Feature Importance", icon: "▥", applicable: "Both" },
    { id: "shap_summary", label: "3D SHAP Summary", icon: "◉", applicable: "Both" },
    { id: "shap_dep", label: "3D SHAP Dependence", icon: "✣", applicable: "Both" },
    { id: "pdp", label: "3D Partial Dependence", icon: "⌘", applicable: "Both" },
    { id: "residual_surf", label: "3D Residual Surface", icon: "◎", applicable: "Regression" },
    { id: "learning_curve", label: "3D Learning Curve", icon: "⌁", applicable: "Both" },
    { id: "tree", label: "3D Tree Structure", icon: "⎇", applicable: "Both" },
    { id: "interaction", label: "3D Feature Interaction", icon: "☵", applicable: "Both" },
    { id: "error_dist", label: "3D Error Distribution", icon: "▤", applicable: "Regression" },
    { id: "roc_surface", label: "3D ROC Surface", icon: "↗", applicable: "Classification" },
  ];

  return (
    <div className="section-container">
      <div className="section-intro">
        <div>
          <span className="eyebrow">STEP 3 · 3D EXPLORATION STUDIO</span>
          <h2>Spatial 3D Model Visualizations</h2>
          <p>
            Explore non-linear model decision boundaries, residual landscapes, and spatial interaction topologies with full 3D rotation, zoom, and slice inspection.
          </p>
        </div>

        {/* Global 3D Color Scale Control */}
        <div className="studio-top-controls">
          <label>Color Theme:</label>
          <select value={colorscale} onChange={(e) => setColorscale(e.target.value)}>
            <option value="Viridis">Viridis (Perceptual)</option>
            <option value="Plasma">Plasma (Neon Glow)</option>
            <option value="Spectral">Spectral (Rainbow)</option>
            <option value="Electric">Electric (High Contrast)</option>
            <option value="Cividis">Cividis (Colorblind Friendly)</option>
          </select>
        </div>
      </div>

      {/* Systematic 3D Tabs Bar */}
      <div className="studio-subtabs-bar">
        {menuItems.map((item) => {
          const isWarning =
            (item.applicable === "Classification" && task === "regression") ||
            (item.applicable === "Regression" && task === "classification");

          return (
            <button
              key={item.id}
              className={`studio-subtab-btn ${active3DTab === item.id ? "active" : ""} ${
                isWarning ? "inapplicable" : ""
              }`}
              onClick={() => setActive3DTab(item.id)}
            >
              <span className="btn-icon">{item.icon}</span>
              <span className="btn-text">{item.label}</span>
              {isWarning && <span className="inapplicable-dot" title={`Primarily for ${item.applicable}`} />}
            </button>
          );
        })}
      </div>

      {/* 1. 3D Prediction Surface */}
      {active3DTab === "surface" && (
        <div className="chart-workbench">
          <div className="workbench-header">
            <div>
              <h3>3D Prediction Surface & Response Landscape</h3>
              <p className="chart-purpose">
                Shows the model’s prediction Z across two varying continuous features (X & Y) while fixing all remaining features at their baseline values.
              </p>
            </div>
            <div className="companion-toggle">
              <label>
                <input
                  type="checkbox"
                  checked={showContourCompanion}
                  onChange={(e) => setShowContourCompanion(e.target.checked)}
                />
                Show 2D Contour Companion
              </label>
            </div>
          </div>

          {/* Feature and Baseline Controls */}
          <div className="surface-controls-bar">
            <div className="param-item">
              <label>X-Axis Feature:</label>
              <select value={surfFeatureX} onChange={(e) => setSurfFeatureX(e.target.value)}>
                {featureList.map((f) => (
                  <option key={f} value={f} disabled={f === surfFeatureY}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div className="param-item">
              <label>Y-Axis Feature:</label>
              <select value={surfFeatureY} onChange={(e) => setSurfFeatureY(e.target.value)}>
                {featureList.map((f) => (
                  <option key={f} value={f} disabled={f === surfFeatureX}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div className="param-item">
              <label>Fixed Features Baseline:</label>
              <select value={baselineMode} onChange={(e) => setBaselineMode(e.target.value)}>
                <option value="median">Dataset Median (Default)</option>
                <option value="mean">Dataset Mean</option>
                <option value="min">Dataset Minimum</option>
                <option value="max">Dataset Maximum</option>
                <option value="zero">Zero Fill</option>
              </select>
            </div>

            <button
              className="primary-button small-btn"
              onClick={handleRecalculateSurface}
              disabled={loadingSurface}
            >
              {loadingSurface ? "Recalculating..." : "↻ Update Surface"}
            </button>
          </div>

          {surfaceError && <div className="error-banner">{surfaceError}</div>}

          {dynamicSurfaceData ? (
            <div className="chart-display-grid">
              <div className="plot-container">
                <Plot
                  data={[
                    {
                      type: "surface",
                      x: dynamicSurfaceData.x_values,
                      y: dynamicSurfaceData.y_values,
                      z: dynamicSurfaceData.z_values,
                      colorscale: colorscale,
                      colorbar: {
                        title: dynamicSurfaceData.z_label,
                        titleside: "right",
                        thickness: 15,
                        len: 0.7,
                      },
                      contours: {
                        z: { show: true, usecolormap: true, highlightcolor: "#fff", project: { z: false } },
                      },
                    },
                  ]}
                  layout={{
                    ...baseLayout3D,
                    title: `3D Prediction Surface: ${dynamicSurfaceData.x_feature} vs ${dynamicSurfaceData.y_feature}`,
                    height: 540,
                    scene: {
                      ...baseLayout3D.scene,
                      xaxis: { ...baseLayout3D.scene.xaxis, title: dynamicSurfaceData.x_feature },
                      yaxis: { ...baseLayout3D.scene.yaxis, title: dynamicSurfaceData.y_feature },
                      zaxis: { ...baseLayout3D.scene.zaxis, title: dynamicSurfaceData.z_label },
                    },
                  }}
                  useResizeHandler
                  style={{ width: "100%" }}
                  config={{ responsive: true, displaylogo: false }}
                />
              </div>

              {showContourCompanion && (
                <div className="companion-contour-box">
                  <div className="companion-header">
                    <h4>2D Top-Down Contour Companion</h4>
                    <span>Isoline projections of model response</span>
                  </div>
                  <Plot
                    data={[
                      {
                        type: "contour",
                        x: dynamicSurfaceData.x_values,
                        y: dynamicSurfaceData.y_values,
                        z: dynamicSurfaceData.z_values,
                        colorscale: colorscale,
                        contours: { coloring: "heatmap", showlabels: true },
                      },
                    ]}
                    layout={{
                      paper_bgcolor: "rgba(0,0,0,0)",
                      plot_bgcolor: "rgba(0,0,0,0)",
                      font: { color: isLight ? "#1e293b" : "#e5e7eb" },
                      margin: { l: 60, r: 20, t: 30, b: 50 },
                      height: 480,
                      xaxis: { title: dynamicSurfaceData.x_feature, gridcolor: isLight ? "rgba(203, 213, 225, 0.7)" : "#282338" },
                      yaxis: { title: dynamicSurfaceData.y_feature, gridcolor: isLight ? "rgba(203, 213, 225, 0.7)" : "#282338" },
                    }}
                    useResizeHandler
                    style={{ width: "100%" }}
                    config={{ responsive: true, displaylogo: false }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="empty-panel">Surface data not generated yet.</div>
          )}

          <div className="insight-callout">
            <strong>Key Insight:</strong> Curvature along the surface indicates non-linear interaction terms learned by XGBoost splits. Flat planes indicate additive linear behavior between these two features.
          </div>
        </div>
      )}

      {/* 2. 3D Actual vs Predicted Scatter */}
      {active3DTab === "actual_pred" && (
        <div className="chart-workbench">
          <div className="workbench-header">
            <div>
              <h3>3D Actual vs Predicted vs Residual Magnitude</h3>
              <p className="chart-purpose">
                Plots observed ground truth against model prediction, with residual magnitude on the vertical axis to highlight high-error sample clusters.
              </p>
            </div>
          </div>

          {task === "classification" ? (
            <div className="warning-banner">
              <strong>Notice:</strong> Actual vs Predicted scatter is designed for continuous regression targets. In classification, discrete target values appear in parallel rows.
            </div>
          ) : null}

          <div className="plot-container">
            {(() => {
              const preds = result.predictions || [];
              const actuals = preds.map((p) => p.actual);
              const predicted = preds.map((p) => p.predicted);
              const residuals = preds.map((p) => Math.abs(p.residual));
              const minVal = Math.min(...actuals, ...predicted);
              const maxVal = Math.max(...actuals, ...predicted);

              return (
                <Plot
                  data={[
                    {
                      type: "scatter3d",
                      mode: "markers",
                      x: actuals,
                      y: predicted,
                      z: residuals,
                      marker: {
                        size: 4,
                        color: residuals,
                        colorscale: colorscale,
                        opacity: 0.85,
                        colorbar: { title: "Residual |y - ŷ|", thickness: 14 },
                      },
                      hovertemplate:
                        "Actual: %{x:.2f}<br>Predicted: %{y:.2f}<br>Residual: %{z:.2f}<extra></extra>",
                    },
                    {
                      type: "scatter3d",
                      mode: "lines",
                      x: [minVal, maxVal],
                      y: [minVal, maxVal],
                      z: [0, 0],
                      line: { color: "#38bdf8", width: 4, dash: "dash" },
                      name: "Ideal y = ŷ (Zero Error)",
                    },
                  ]}
                  layout={{
                    ...baseLayout3D,
                    title: "3D Actual vs. Predicted vs. Residual Deviation",
                    height: 560,
                    scene: {
                      ...baseLayout3D.scene,
                      xaxis: { ...baseLayout3D.scene.xaxis, title: "Actual Ground Truth (y)" },
                      yaxis: { ...baseLayout3D.scene.yaxis, title: "Model Predicted (ŷ)" },
                      zaxis: { ...baseLayout3D.scene.zaxis, title: "Absolute Residual |y - ŷ|" },
                    },
                  }}
                  useResizeHandler
                  style={{ width: "100%" }}
                  config={{ responsive: true, displaylogo: false }}
                />
              );
            })()}
          </div>

          <div className="insight-callout">
            <strong>Key Insight:</strong> Points adhering closely to the dashed cyan line indicate accurate predictions. Elevated points reveal regions where XGBoost underperformed.
          </div>
        </div>
      )}

      {/* 3. 3D Feature Importance Bars */}
      {active3DTab === "importance" && (
        <div className="chart-workbench">
          <div className="workbench-header">
            <div>
              <h3>3D Feature Importance Bars</h3>
              <p className="chart-purpose">
                Displays ranked features along the spatial axis with height representing importance score.
              </p>
            </div>
            <div className="type-toggle-group">
              <button
                className={`type-btn ${importanceType === "gain" ? "active" : ""}`}
                onClick={() => setImportanceType("gain")}
              >
                Gain (Split Quality)
              </button>
              <button
                className={`type-btn ${importanceType === "weight" ? "active" : ""}`}
                onClick={() => setImportanceType("weight")}
              >
                Weight (Frequency)
              </button>
              <button
                className={`type-btn ${importanceType === "cover" ? "active" : ""}`}
                onClick={() => setImportanceType("cover")}
              >
                Cover (Sample Volume)
              </button>
            </div>
          </div>

          <div className="plot-container">
            {(() => {
              const breakdown = result.feature_importance_breakdown || {};
              const items = (breakdown[importanceType] || result.feature_importance || []).slice(0, 15);
              const names = items.map((it) => it.feature);
              const ranks = items.map((_, i) => i + 1);
              const scores = items.map((it) => it.importance);

              return (
                <Plot
                  data={[
                    {
                      type: "scatter3d",
                      mode: "markers+lines",
                      x: ranks,
                      y: names,
                      z: scores,
                      marker: {
                        size: 6,
                        color: scores,
                        colorscale: colorscale,
                      },
                      line: { width: 3, color: "#a855f7" },
                      hovertemplate:
                        "Feature: %{y}<br>Rank: %{x}<br>Score (%{text}): %{z:.4f}<extra></extra>",
                      text: items.map(() => importanceType.toUpperCase()),
                    },
                  ]}
                  layout={{
                    ...baseLayout3D,
                    title: `3D Feature Importance Topology (${importanceType.toUpperCase()})`,
                    height: 540,
                    scene: {
                      ...baseLayout3D.scene,
                      xaxis: { ...baseLayout3D.scene.xaxis, title: "Importance Rank" },
                      yaxis: { ...baseLayout3D.scene.yaxis, title: "Feature Name" },
                      zaxis: { ...baseLayout3D.scene.zaxis, title: `${importanceType.toUpperCase()} Score` },
                    },
                  }}
                  useResizeHandler
                  style={{ width: "100%" }}
                  config={{ responsive: true, displaylogo: false }}
                />
              );
            })()}
          </div>

          <div className="insight-callout">
            <strong>Importance Metric Definitions:</strong> Gain calculates the relative contribution of the feature to the model; Weight counts how many times a feature is used to split data across all trees; Cover measures the relative quantity of observations concerned by this feature.
          </div>
        </div>
      )}

      {/* 4. 3D SHAP Summary */}
      {active3DTab === "shap_summary" && (
        <div className="chart-workbench">
          <div className="workbench-header">
            <div>
              <h3>3D SHAP Attribution Cloud</h3>
              <p className="chart-purpose">
                Projects sample-level SHAP contributions across features, colored by normalized feature value to show directional influence in 3D.
              </p>
            </div>
          </div>

          {result.shap_summary?.features?.length > 0 ? (
            <div className="plot-container">
              {(() => {
                const feats = result.shap_summary.features.slice(0, 10);
                const x_vals = [];
                const y_vals = [];
                const z_vals = [];
                const color_vals = [];

                feats.forEach((f, fIdx) => {
                  const sVals = f.shap_values || [];
                  const rawVals = f.values || [];
                  const minR = Math.min(...rawVals);
                  const maxR = Math.max(...rawVals);
                  const range = maxR > minR ? maxR - minR : 1;

                  sVals.forEach((sv, i) => {
                    x_vals.push(sv);
                    y_vals.push(f.feature);
                    z_vals.push(fIdx + 1);
                    const normalized = (rawVals[i] - minR) / range;
                    color_vals.push(normalized);
                  });
                });

                return (
                  <Plot
                    data={[
                      {
                        type: "scatter3d",
                        mode: "markers",
                        x: x_vals,
                        y: y_vals,
                        z: z_vals,
                        marker: {
                          size: 3.5,
                          color: color_vals,
                          colorscale: "Viridis",
                          colorbar: { title: "Feature Value (Low→High)", thickness: 12 },
                          opacity: 0.8,
                        },
                        hovertemplate:
                          "Feature: %{y}<br>SHAP Impact: %{x:.4f}<extra></extra>",
                      },
                    ]}
                    layout={{
                      ...baseLayout3D,
                      title: "3D SHAP Global Attribution Distribution",
                      height: 560,
                      scene: {
                        ...baseLayout3D.scene,
                        xaxis: { ...baseLayout3D.scene.xaxis, title: "SHAP Impact on Prediction" },
                        yaxis: { ...baseLayout3D.scene.yaxis, title: "Feature" },
                        zaxis: { ...baseLayout3D.scene.zaxis, title: "Rank Order" },
                      },
                    }}
                    useResizeHandler
                    style={{ width: "100%" }}
                    config={{ responsive: true, displaylogo: false }}
                  />
                );
              })()}
            </div>
          ) : (
            <div className="empty-panel">SHAP summary calculations not available for this run.</div>
          )}

          <div className="insight-callout">
            <strong>Key Insight:</strong> Points to the right (positive SHAP) push the prediction higher; points to the left lower it. The color indicates whether high or low values of that feature drove the effect.
          </div>
        </div>
      )}

      {/* 5. 3D SHAP Dependence */}
      {active3DTab === "shap_dep" && (
        <div className="chart-workbench">
          <div className="workbench-header">
            <div>
              <h3>3D SHAP Dependence Surface</h3>
              <p className="chart-purpose">
                Shows the SHAP attribution value of a primary feature along X and Y, with secondary interacting feature values along Z.
              </p>
            </div>
          </div>

          <div className="surface-controls-bar">
            <div className="param-item">
              <label>Primary Feature (X):</label>
              <select value={shapFeat1} onChange={(e) => setShapFeat1(e.target.value)}>
                {featureList.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div className="param-item">
              <label>Interacting Feature (Z):</label>
              <select value={shapFeat2} onChange={(e) => setShapFeat2(e.target.value)}>
                {featureList.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="plot-container">
            {(() => {
              const fObj1 = result.shap_summary?.features?.find((f) => f.feature === shapFeat1);
              const fObj2 = result.shap_summary?.features?.find((f) => f.feature === shapFeat2);

              if (!fObj1) {
                return <div className="empty-panel">Selected feature not found in SHAP summary.</div>;
              }

              const x = fObj1.values || [];
              const y = fObj1.shap_values || [];
              const z = fObj2 ? fObj2.values || [] : x;

              return (
                <Plot
                  data={[
                    {
                      type: "scatter3d",
                      mode: "markers",
                      x: x,
                      y: y,
                      z: z,
                      marker: {
                        size: 5,
                        color: y,
                        colorscale: colorscale,
                        colorbar: { title: "SHAP Value", thickness: 12 },
                      },
                      hovertemplate:
                        `${shapFeat1}: %{x:.2f}<br>SHAP: %{y:.4f}<br>${shapFeat2}: %{z:.2f}<extra></extra>`,
                    },
                  ]}
                  layout={{
                    ...baseLayout3D,
                    title: `3D SHAP Dependence: ${shapFeat1} vs SHAP vs ${shapFeat2}`,
                    height: 540,
                    scene: {
                      ...baseLayout3D.scene,
                      xaxis: { ...baseLayout3D.scene.xaxis, title: shapFeat1 },
                      yaxis: { ...baseLayout3D.scene.yaxis, title: `SHAP (${shapFeat1})` },
                      zaxis: { ...baseLayout3D.scene.zaxis, title: shapFeat2 },
                    },
                  }}
                  useResizeHandler
                  style={{ width: "100%" }}
                  config={{ responsive: true, displaylogo: false }}
                />
              );
            })()}
          </div>
        </div>
      )}

      {/* 6. 3D Partial Dependence Surface */}
      {active3DTab === "pdp" && (
        <div className="chart-workbench">
          <div className="workbench-header">
            <div>
              <h3>3D Partial Dependence Surface (PDP)</h3>
              <p className="chart-purpose">
                Shows the marginal impact of two features on the model prediction while averaging over the effects of all other features.
              </p>
            </div>
          </div>

          {result.partial_dependence_surface ? (
            <div className="plot-container">
              <Plot
                data={[
                  {
                    type: "surface",
                    x: result.partial_dependence_surface.grid_a,
                    y: result.partial_dependence_surface.grid_b,
                    z: result.partial_dependence_surface.z_values,
                    colorscale: colorscale,
                    contours: {
                      z: { show: true, usecolormap: true, highlightcolor: "#fff" },
                    },
                  },
                ]}
                layout={{
                  ...baseLayout3D,
                  title: `3D Partial Dependence: ${result.partial_dependence_surface.feature_a} × ${result.partial_dependence_surface.feature_b}`,
                  height: 540,
                  scene: {
                    ...baseLayout3D.scene,
                    xaxis: { ...baseLayout3D.scene.xaxis, title: result.partial_dependence_surface.feature_a },
                    yaxis: { ...baseLayout3D.scene.yaxis, title: result.partial_dependence_surface.feature_b },
                    zaxis: { ...baseLayout3D.scene.zaxis, title: "Marginal Model Response" },
                  },
                }}
                useResizeHandler
                style={{ width: "100%" }}
                config={{ responsive: true, displaylogo: false }}
              />
            </div>
          ) : (
            <div className="empty-panel">Partial dependence surface not available for this run.</div>
          )}
        </div>
      )}

      {/* 7. 3D Residual Surface */}
      {active3DTab === "residual_surf" && (
        <div className="chart-workbench">
          <div className="workbench-header">
            <div>
              <h3>3D Residual Surface Topology</h3>
              <p className="chart-purpose">
                Displays the prediction residuals across feature space to identify heteroscedasticity or non-linear error pockets.
              </p>
            </div>
          </div>

          {task === "classification" ? (
            <div className="warning-banner">
              <strong>Notice:</strong> Residual surfaces are primarily formulated for regression tasks with continuous residuals.
            </div>
          ) : null}

          <div className="plot-container">
            {(() => {
              const preds = result.predictions || [];
              const actuals = preds.map((p) => p.actual);
              const predicted = preds.map((p) => p.predicted);
              const res = preds.map((p) => p.residual);

              return (
                <Plot
                  data={[
                    {
                      type: "scatter3d",
                      mode: "markers",
                      x: actuals,
                      y: predicted,
                      z: res,
                      marker: {
                        size: 4,
                        color: res,
                        colorscale: "Spectral",
                        colorbar: { title: "Residual (y - ŷ)" },
                      },
                      hovertemplate:
                        "Actual: %{x:.2f}<br>Pred: %{y:.2f}<br>Residual: %{z:.2f}<extra></extra>",
                    },
                  ]}
                  layout={{
                    ...baseLayout3D,
                    title: "3D Residual Deviation Field",
                    height: 540,
                    scene: {
                      ...baseLayout3D.scene,
                      xaxis: { ...baseLayout3D.scene.xaxis, title: "Actual (y)" },
                      yaxis: { ...baseLayout3D.scene.yaxis, title: "Predicted (ŷ)" },
                      zaxis: { ...baseLayout3D.scene.zaxis, title: "Signed Residual (y - ŷ)" },
                    },
                  }}
                  useResizeHandler
                  style={{ width: "100%" }}
                  config={{ responsive: true, displaylogo: false }}
                />
              );
            })()}
          </div>
        </div>
      )}

      {/* 8. 3D Learning Curve */}
      {active3DTab === "learning_curve" && (
        <div className="chart-workbench">
          <div className="workbench-header">
            <div>
              <h3>3D Boosting Round & Evaluation Trajectory</h3>
              <p className="chart-purpose">
                Visualizes train vs validation error progression across boosting rounds with loss differential ribbons in 3D.
              </p>
            </div>
          </div>

          {result.learning_curve ? (
            <div className="plot-container">
              {(() => {
                const lc = result.learning_curve;
                const rounds = lc.rounds || [];
                const train = lc.training || [];
                const val = lc.validation || [];
                const gap = val.map((v, i) => Math.abs(v - (train[i] || 0)));

                return (
                  <Plot
                    data={[
                      {
                        type: "scatter3d",
                        mode: "lines+markers",
                        name: "Training Loss",
                        x: rounds,
                        y: Array(rounds.length).fill(0),
                        z: train,
                        line: { color: "#38bdf8", width: 4 },
                        marker: { size: 3 },
                      },
                      {
                        type: "scatter3d",
                        mode: "lines+markers",
                        name: "Validation Loss",
                        x: rounds,
                        y: Array(rounds.length).fill(1),
                        z: val,
                        line: { color: "#ec4899", width: 4 },
                        marker: { size: 3 },
                      },
                      {
                        type: "scatter3d",
                        mode: "lines",
                        name: "Generalization Gap",
                        x: rounds,
                        y: Array(rounds.length).fill(0.5),
                        z: gap,
                        line: { color: "#a855f7", width: 2, dash: "dot" },
                      },
                    ]}
                    layout={{
                      ...baseLayout3D,
                      title: `3D Evaluation History (${lc.metric})`,
                      height: 540,
                      scene: {
                        ...baseLayout3D.scene,
                        xaxis: { ...baseLayout3D.scene.xaxis, title: "Boosting Round (Iteration)" },
                        yaxis: {
                          ...baseLayout3D.scene.yaxis,
                          title: "Series",
                          tickvals: [0, 0.5, 1],
                          ticktext: ["Train", "Gap", "Validation"],
                        },
                        zaxis: { ...baseLayout3D.scene.zaxis, title: `Loss (${lc.metric})` },
                      },
                    }}
                    useResizeHandler
                    style={{ width: "100%" }}
                    config={{ responsive: true, displaylogo: false }}
                  />
                );
              })()}
            </div>
          ) : (
            <div className="empty-panel">Evaluation history not available.</div>
          )}
        </div>
      )}

      {/* 9. 3D Tree Structure */}
      {active3DTab === "tree" && (
        <div className="chart-workbench">
          <div className="workbench-header">
            <div>
              <h3>3D Hierarchical Tree Structure</h3>
              <p className="chart-purpose">
                Spatial arrangement of boosting tree levels, feature split nodes, and sample weights in 3D coordinate space.
              </p>
            </div>
            <div className="tree-selector">
              <label>Select Tree Index:</label>
              <select
                value={selectedTreeIndex}
                onChange={(e) => setSelectedTreeIndex(Number(e.target.value))}
              >
                {(result.trees || [{ tree_index: 0 }]).map((t, i) => (
                  <option key={i} value={i}>
                    Tree #{i} (Round {i + 1})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="plot-container">
            {(() => {
              const currentTree = result.trees?.[selectedTreeIndex]?.structure || result.first_tree;
              if (!currentTree) {
                return <div className="empty-panel">No tree structure dump available.</div>;
              }

              // Flatten tree nodes into 3D positions
              const nodes = [];
              const edges_x = [];
              const edges_y = [];
              const edges_z = [];

              function traverse(node, depth = 0, xPos = 0, spread = 4) {
                if (!node) return;
                const nodeObj = {
                  id: node.nodeid,
                  depth: depth,
                  x: xPos,
                  y: node.cover || 50,
                  z: -depth,
                  split: node.split || "Leaf",
                  threshold: node.split_condition !== undefined ? node.split_condition.toFixed(2) : "—",
                  leaf: node.leaf !== undefined ? node.leaf.toFixed(4) : null,
                };
                nodes.push(nodeObj);

                if (node.children) {
                  node.children.forEach((child, cIdx) => {
                    const childX = xPos + (cIdx === 0 ? -spread : spread);
                    edges_x.push(xPos, childX, null);
                    edges_y.push(node.cover || 50, child.cover || 40, null);
                    edges_z.push(-depth, -(depth + 1), null);
                    traverse(child, depth + 1, childX, spread * 0.55);
                  });
                }
              }

              traverse(currentTree);

              return (
                <Plot
                  data={[
                    {
                      type: "scatter3d",
                      mode: "lines",
                      x: edges_x,
                      y: edges_y,
                      z: edges_z,
                      line: { color: "#64748b", width: 3 },
                      hoverinfo: "none",
                    },
                    {
                      type: "scatter3d",
                      mode: "markers+text",
                      x: nodes.map((n) => n.x),
                      y: nodes.map((n) => n.y),
                      z: nodes.map((n) => n.z),
                      text: nodes.map((n) => n.split),
                      textposition: "top center",
                      marker: {
                        size: 7,
                        color: nodes.map((n) => (n.leaf !== null ? "#22c55e" : "#a855f7")),
                        colorscale: "Plasma",
                      },
                      hovertemplate:
                        "Node: %{text}<br>Depth: %{z}<br>Cover: %{y}<extra></extra>",
                    },
                  ]}
                  layout={{
                    ...baseLayout3D,
                    title: `3D Spatial Topology of Tree #${selectedTreeIndex}`,
                    height: 560,
                    scene: {
                      ...baseLayout3D.scene,
                      xaxis: { ...baseLayout3D.scene.xaxis, title: "Horizontal Branch Spread" },
                      yaxis: { ...baseLayout3D.scene.yaxis, title: "Node Cover / Sample Weight" },
                      zaxis: { ...baseLayout3D.scene.zaxis, title: "Tree Depth Level" },
                    },
                  }}
                  useResizeHandler
                  style={{ width: "100%" }}
                  config={{ responsive: true, displaylogo: false }}
                />
              );
            })()}
          </div>
        </div>
      )}

      {/* 10. 3D Feature Interaction */}
      {active3DTab === "interaction" && (
        <div className="chart-workbench">
          <div className="workbench-header">
            <div>
              <h3>3D Pairwise Feature Interaction Columns</h3>
              <p className="chart-purpose">
                Pairwise interaction strength represented as 3D columns to expose non-additive coupling between feature pairs.
              </p>
            </div>
          </div>

          {result.feature_interactions?.interactions?.length > 0 ? (
            <div className="plot-container">
              {(() => {
                const pairs = result.feature_interactions.interactions.slice(0, 16);
                const x = pairs.map((p) => p.feature_1);
                const y = pairs.map((p) => p.feature_2);
                const z = pairs.map((p) => p.strength);

                return (
                  <Plot
                    data={[
                      {
                        type: "scatter3d",
                        mode: "markers+lines",
                        x: x,
                        y: y,
                        z: z,
                        marker: {
                          size: 7,
                          color: z,
                          colorscale: colorscale,
                          colorbar: { title: "Interaction Strength" },
                        },
                        line: { width: 3, color: "#22d3ee" },
                        hovertemplate:
                          "%{x} × %{y}<br>Strength: %{z:.5f}<extra></extra>",
                      },
                    ]}
                    layout={{
                      ...baseLayout3D,
                      title: "3D Feature Interaction Strength",
                      height: 540,
                      scene: {
                        ...baseLayout3D.scene,
                        xaxis: { ...baseLayout3D.scene.xaxis, title: "Feature 1" },
                        yaxis: { ...baseLayout3D.scene.yaxis, title: "Feature 2" },
                        zaxis: { ...baseLayout3D.scene.zaxis, title: "Interaction Strength (SHAP)" },
                      },
                    }}
                    useResizeHandler
                    style={{ width: "100%" }}
                    config={{ responsive: true, displaylogo: false }}
                  />
                );
              })()}
            </div>
          ) : (
            <div className="empty-panel">Interaction data not available.</div>
          )}
        </div>
      )}

      {/* 11. 3D Prediction Error Distribution */}
      {active3DTab === "error_dist" && (
        <div className="chart-workbench">
          <div className="workbench-header">
            <div>
              <h3>3D Prediction Error & Residual Density Surface</h3>
              <p className="chart-purpose">
                Bivariate distribution showing residual error bins across predicted target value brackets.
              </p>
            </div>
          </div>

          {result.error_distribution_3d ? (
            <div className="plot-container">
              <Plot
                data={[
                  {
                    type: "surface",
                    x: result.error_distribution_3d.residual_bins,
                    y: result.error_distribution_3d.predicted_bins,
                    z: result.error_distribution_3d.counts,
                    colorscale: colorscale,
                  },
                ]}
                layout={{
                  ...baseLayout3D,
                  title: "3D Residual Error Density Surface",
                  height: 540,
                  scene: {
                    ...baseLayout3D.scene,
                    xaxis: { ...baseLayout3D.scene.xaxis, title: "Residual Error Bin (y - ŷ)" },
                    yaxis: { ...baseLayout3D.scene.yaxis, title: "Predicted Value Bracket (ŷ)" },
                    zaxis: { ...baseLayout3D.scene.zaxis, title: "Sample Count Density" },
                  },
                }}
                useResizeHandler
                style={{ width: "100%" }}
                config={{ responsive: true, displaylogo: false }}
              />
            </div>
          ) : (
            <div className="empty-panel">Error distribution mesh not available.</div>
          )}
        </div>
      )}

      {/* 12. 3D ROC Surface */}
      {active3DTab === "roc_surface" && (
        <div className="chart-workbench">
          <div className="workbench-header">
            <div>
              <h3>3D ROC & Threshold Manifold</h3>
              <p className="chart-purpose">
                Traces False Positive Rate (X) and True Positive Rate (Y) against Decision Threshold (Z) in 3D coordinate space.
              </p>
            </div>
          </div>

          {task !== "classification" ? (
            <div className="warning-banner">
              <strong>Rule 5 Compliance:</strong> The ROC curve is exclusively a classification metric and requires discrete labels and probability outputs. In regression mode, this visualization is unavailable.
            </div>
          ) : result.classification_diagnostics?.roc_curve ? (
            <div className="plot-container">
              {(() => {
                const roc = result.classification_diagnostics.roc_curve;
                return (
                  <Plot
                    data={[
                      {
                        type: "scatter3d",
                        mode: "lines+markers",
                        x: roc.fpr,
                        y: roc.tpr,
                        z: roc.thresholds,
                        marker: {
                          size: 4,
                          color: roc.thresholds,
                          colorscale: "Plasma",
                          colorbar: { title: "Decision Threshold" },
                        },
                        line: { width: 5, color: "#ec4899" },
                        hovertemplate:
                          "FPR: %{x:.3f}<br>TPR: %{y:.3f}<br>Threshold: %{z:.3f}<extra></extra>",
                      },
                    ]}
                    layout={{
                      ...baseLayout3D,
                      title: "3D ROC Threshold Trajectory",
                      height: 560,
                      scene: {
                        ...baseLayout3D.scene,
                        xaxis: { ...baseLayout3D.scene.xaxis, title: "False Positive Rate (1 - Specificity)" },
                        yaxis: { ...baseLayout3D.scene.yaxis, title: "True Positive Rate (Sensitivity)" },
                        zaxis: { ...baseLayout3D.scene.zaxis, title: "Cutoff Probability Threshold" },
                      },
                    }}
                    useResizeHandler
                    style={{ width: "100%" }}
                    config={{ responsive: true, displaylogo: false }}
                  />
                );
              })()}
            </div>
          ) : (
            <div className="empty-panel">ROC diagnostics not available.</div>
          )}
        </div>
      )}
    </div>
  );
}
