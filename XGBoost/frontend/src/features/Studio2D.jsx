import { useState, useMemo } from "react";
import Plot from "react-plotly.js";

export default function Studio2D({ result, task, theme }) {
  const [activeSubcategory, setActiveSubcategory] = useState("fit");
  const [importanceMetric, setImportanceMetric] = useState("gain"); // gain, weight, cover
  const [selectedPdpIndex, setSelectedPdpIndex] = useState(0);
  const [selectedTreeIndex, setSelectedTreeIndex] = useState(0);
  const [shapDepFeat, setShapDepFeat] = useState("");

  const isLight = theme === "light";

  const baseLayout2D = {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { color: isLight ? "#1e293b" : "#e5e7eb", family: "'DM Sans', sans-serif" },
    margin: { l: 70, r: 30, t: 40, b: 60 },
    xaxis: { gridcolor: isLight ? "rgba(203, 213, 225, 0.7)" : "#282338", zerolinecolor: isLight ? "#6366f1" : "#8b5cf6" },
    yaxis: { gridcolor: isLight ? "rgba(203, 213, 225, 0.7)" : "#282338", zerolinecolor: isLight ? "#6366f1" : "#8b5cf6" },
    autosize: true,
  };

  const featureList = useMemo(() => {
    return result?.features || [];
  }, [result]);

  if (!result) {
    return (
      <div className="section-container">
        <div className="empty-panel">
          <div className="empty-icon">▦</div>
          <h3>2D Visualizations Studio Awaiting Trained Model</h3>
          <p>
            Upload a dataset in Step 1 and train your XGBoost model in Step 2 to generate performance, importance, and diagnostic charts.
          </p>
        </div>
      </div>
    );
  }

  const subtabs = [
    { id: "fit", label: "Model Fit & Residuals (4)", icon: "⤢" },
    { id: "features", label: "Features & Interactions (3)", icon: "▥" },
    { id: "trees", label: "Trees & Marginal Effects (4)", icon: "⎇" },
    { id: "classification", label: "Classification Diagnostics (5)", icon: "↗", onlyClass: true },
  ];

  return (
    <div className="section-container">
      <div className="section-intro">
        <div>
          <span className="eyebrow">STEP 4 · 2D DIAGNOSTIC STUDIO</span>
          <h2>Comprehensive 2D Visualizations</h2>
          <p>
            All 16 core 2D statistical charts categorized systematically for thorough model diagnostics, feature inspection, and threshold calibration.
          </p>
        </div>
      </div>

      {/* Subcategory Navigation Pills */}
      <div className="studio-subtabs-bar">
        {subtabs.map((tab) => {
          const isWarning = tab.onlyClass && task === "regression";
          return (
            <button
              key={tab.id}
              className={`studio-subtab-btn ${activeSubcategory === tab.id ? "active" : ""} ${
                isWarning ? "inapplicable" : ""
              }`}
              onClick={() => setActiveSubcategory(tab.id)}
            >
              <span className="btn-icon">{tab.icon}</span>
              <span className="btn-text">{tab.label}</span>
              {isWarning && <span className="inapplicable-dot" title="Classification Only" />}
            </button>
          );
        })}
      </div>

      {/* ============================================================== */}
      {/* SUBCATEGORY 1: MODEL FIT & RESIDUALS (4 Charts) */}
      {/* ============================================================== */}
      {activeSubcategory === "fit" && (
        <div className="charts-2d-grid">
          {/* Chart 1: Actual vs. Predicted */}
          <div className="chart-card-2d">
            <div className="card-top-info">
              <div>
                <h3>1. Actual vs. Predicted Scatter</h3>
                <p className="chart-desc">
                  Compares ground-truth target values against XGBoost predictions with an ideal y = ŷ reference line.
                </p>
              </div>
            </div>

            {(() => {
              const preds = result.predictions || [];
              const actuals = preds.map((p) => p.actual);
              const predicted = preds.map((p) => p.predicted);
              const minVal = Math.min(...actuals, ...predicted);
              const maxVal = Math.max(...actuals, ...predicted);

              return (
                <Plot
                  data={[
                    {
                      type: "scatter",
                      mode: "markers",
                      x: actuals,
                      y: predicted,
                      marker: { color: "#a855f7", size: 6, opacity: 0.75 },
                      name: "Test Observations",
                      hovertemplate: "Actual: %{x:.2f}<br>Predicted: %{y:.2f}<extra></extra>",
                    },
                    {
                      type: "scatter",
                      mode: "lines",
                      x: [minVal, maxVal],
                      y: [minVal, maxVal],
                      line: { color: "#38bdf8", width: 2, dash: "dash" },
                      name: "Ideal y = ŷ",
                    },
                  ]}
                  layout={{
                    ...baseLayout2D,
                    title: "Observed vs. Predicted Distribution",
                    height: 380,
                    xaxis: { ...baseLayout2D.xaxis, title: "Actual Ground Truth" },
                    yaxis: { ...baseLayout2D.yaxis, title: "Predicted Value" },
                  }}
                  useResizeHandler
                  style={{ width: "100%" }}
                  config={{ responsive: true, displaylogo: false }}
                />
              );
            })()}

            <div className="chart-footer-note">
              R² = {(result.metrics?.r2 ?? 0).toFixed(4)} · MAE = {(result.metrics?.mae ?? 0).toFixed(4)}
            </div>
          </div>

          {/* Chart 2: Residual Plot */}
          <div className="chart-card-2d">
            <div className="card-top-info">
              <div>
                <h3>2. Residuals vs. Fitted Plot</h3>
                <p className="chart-desc">
                  Plots residuals (y - ŷ) against predicted values to verify error homoscedasticity around the zero reference line.
                </p>
              </div>
            </div>

            {(() => {
              const preds = result.predictions || [];
              const predicted = preds.map((p) => p.predicted);
              const residuals = preds.map((p) => p.residual);

              return (
                <Plot
                  data={[
                    {
                      type: "scatter",
                      mode: "markers",
                      x: predicted,
                      y: residuals,
                      marker: {
                        color: residuals.map((r) => (r >= 0 ? "#22d3ee" : "#f43f5e")),
                        size: 6,
                        opacity: 0.75,
                      },
                      name: "Residuals",
                      hovertemplate: "Fitted: %{x:.2f}<br>Residual: %{y:.2f}<extra></extra>",
                    },
                    {
                      type: "scatter",
                      mode: "lines",
                      x: [Math.min(...predicted), Math.max(...predicted)],
                      y: [0, 0],
                      line: { color: "#e2e8f0", width: 1.5, dash: "dash" },
                      name: "Zero Line (y = 0)",
                    },
                  ]}
                  layout={{
                    ...baseLayout2D,
                    title: "Residual Error Spread",
                    height: 380,
                    xaxis: { ...baseLayout2D.xaxis, title: "Fitted Predicted Value (ŷ)" },
                    yaxis: { ...baseLayout2D.yaxis, title: "Signed Residual (y - ŷ)" },
                  }}
                  useResizeHandler
                  style={{ width: "100%" }}
                  config={{ responsive: true, displaylogo: false }}
                />
              );
            })()}

            <div className="chart-footer-note">
              Unbiased models exhibit random symmetrical scatter centered around y = 0.
            </div>
          </div>

          {/* Chart 3: Prediction Error Distribution */}
          <div className="chart-card-2d">
            <div className="card-top-info">
              <div>
                <h3>3. Prediction Error Distribution</h3>
                <p className="chart-desc">
                  Histogram and distribution density of prediction residuals, verifying normality and symmetry.
                </p>
              </div>
            </div>

            {(() => {
              const preds = result.predictions || [];
              const residuals = preds.map((p) => p.residual);

              return (
                <Plot
                  data={[
                    {
                      type: "histogram",
                      x: residuals,
                      nbinsx: 25,
                      marker: {
                        color: "#8b5cf6",
                        line: { color: "#c4b5fd", width: 1 },
                      },
                      name: "Residual Counts",
                      hovertemplate: "Residual Range: %{x}<br>Count: %{y}<extra></extra>",
                    },
                  ]}
                  layout={{
                    ...baseLayout2D,
                    title: "Residual Error Frequency Histogram",
                    height: 380,
                    xaxis: { ...baseLayout2D.xaxis, title: "Residual Error (y - ŷ)" },
                    yaxis: { ...baseLayout2D.yaxis, title: "Frequency Count" },
                  }}
                  useResizeHandler
                  style={{ width: "100%" }}
                  config={{ responsive: true, displaylogo: false }}
                />
              );
            })()}

            <div className="chart-footer-note">
              A bell curve centered at zero confirms absence of systematic model bias.
            </div>
          </div>

          {/* Chart 4: Training & Validation Learning Curve */}
          <div className="chart-card-2d">
            <div className="card-top-info">
              <div>
                <h3>4. Training & Validation Learning Curve</h3>
                <p className="chart-desc">
                  Loss progression by boosting round for both training and validation sets.
                </p>
              </div>
            </div>

            {result.learning_curve ? (
              <Plot
                data={[
                  {
                    type: "scatter",
                    mode: "lines",
                    x: result.learning_curve.rounds,
                    y: result.learning_curve.training,
                    line: { color: "#38bdf8", width: 2.5 },
                    name: "Train Loss",
                  },
                  {
                    type: "scatter",
                    mode: "lines",
                    x: result.learning_curve.rounds,
                    y: result.learning_curve.validation,
                    line: { color: "#ec4899", width: 2.5 },
                    name: "Val Loss",
                  },
                ]}
                layout={{
                  ...baseLayout2D,
                  title: `Loss by Iteration (${result.learning_curve.metric})`,
                  height: 380,
                  xaxis: { ...baseLayout2D.xaxis, title: "Boosting Round (n_estimators)" },
                  yaxis: { ...baseLayout2D.yaxis, title: `Metric Score (${result.learning_curve.metric})` },
                }}
                useResizeHandler
                style={{ width: "100%" }}
                config={{ responsive: true, displaylogo: false }}
              />
            ) : (
              <div className="empty-panel">Evaluation history unavailable.</div>
            )}

            <div className="chart-footer-note">
              Divergence between train and validation curves indicates the onset of overfitting.
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUBCATEGORY 2: FEATURES & INTERACTIONS (3 Charts) */}
      {/* ============================================================== */}
      {activeSubcategory === "features" && (
        <div className="charts-2d-grid">
          {/* Chart 5: Feature Importance Horizontal Bars */}
          <div className="chart-card-2d full-width">
            <div className="card-top-info">
              <div>
                <h3>5. Ranked Feature Importance</h3>
                <p className="chart-desc">
                  Horizontal bar chart supporting Gain (split quality improvement), Weight (frequency of split occurrences), and Cover (observation volume).
                </p>
              </div>
              <div className="type-toggle-group">
                <button
                  className={`type-btn ${importanceMetric === "gain" ? "active" : ""}`}
                  onClick={() => setImportanceMetric("gain")}
                >
                  Gain (Quality)
                </button>
                <button
                  className={`type-btn ${importanceMetric === "weight" ? "active" : ""}`}
                  onClick={() => setImportanceMetric("weight")}
                >
                  Weight (Frequency)
                </button>
                <button
                  className={`type-btn ${importanceMetric === "cover" ? "active" : ""}`}
                  onClick={() => setImportanceMetric("cover")}
                >
                  Cover (Samples)
                </button>
              </div>
            </div>

            {(() => {
              const breakdown = result.feature_importance_breakdown || {};
              const items = (breakdown[importanceMetric] || result.feature_importance || []).slice(0, 15);
              const names = items.map((i) => i.feature).reverse();
              const values = items.map((i) => i.importance).reverse();

              return (
                <Plot
                  data={[
                    {
                      type: "bar",
                      orientation: "h",
                      x: values,
                      y: names,
                      marker: {
                        color: values,
                        colorscale: "Viridis",
                      },
                      hovertemplate: "Feature: %{y}<br>Importance (%{text}): %{x:.4f}<extra></extra>",
                      text: items.map(() => importanceMetric.toUpperCase()),
                    },
                  ]}
                  layout={{
                    ...baseLayout2D,
                    title: `Top Influential Features (${importanceMetric.toUpperCase()})`,
                    height: Math.max(380, items.length * 30),
                    margin: { l: 150, r: 30, t: 40, b: 50 },
                    xaxis: { ...baseLayout2D.xaxis, title: `${importanceMetric.toUpperCase()} Importance Score` },
                    yaxis: { ...baseLayout2D.yaxis, title: "" },
                  }}
                  useResizeHandler
                  style={{ width: "100%" }}
                  config={{ responsive: true, displaylogo: false }}
                />
              );
            })()}

            <div className="chart-footer-note">
              Rule 5 Compliance: Importance denotes predictive leverage, not causal directionality.
            </div>
          </div>

          {/* Chart 6: Feature Interaction Heatmap */}
          <div className="chart-card-2d">
            <div className="card-top-info">
              <div>
                <h3>6. Feature Interaction Heatmap</h3>
                <p className="chart-desc">
                  Pairwise interaction matrix with color scaling to highlight non-linear couplings.
                </p>
              </div>
            </div>

            {result.feature_interactions?.interactions?.length > 0 ? (
              (() => {
                const feats = (result.feature_interactions.features || []).slice(0, 8);
                const inters = result.feature_interactions.interactions || [];
                const matrix = feats.map((a) =>
                  feats.map((b) => {
                    if (a === b) return 0;
                    const match = inters.find(
                      (it) =>
                        (it.feature_1 === a && it.feature_2 === b) ||
                        (it.feature_1 === b && it.feature_2 === a)
                    );
                    return match ? match.strength : 0;
                  })
                );

                return (
                  <Plot
                    data={[
                      {
                        type: "heatmap",
                        x: feats,
                        y: feats,
                        z: matrix,
                        colorscale: "Plasma",
                        hovertemplate: "%{y} × %{x}<br>Strength: %{z:.4f}<extra></extra>",
                      },
                    ]}
                    layout={{
                      ...baseLayout2D,
                      title: "Pairwise SHAP Interaction Matrix",
                      height: 420,
                      margin: { l: 120, r: 30, t: 30, b: 100 },
                      xaxis: { tickangle: -45 },
                      yaxis: { autorange: "reversed" },
                    }}
                    useResizeHandler
                    style={{ width: "100%" }}
                    config={{ responsive: true, displaylogo: false }}
                  />
                );
              })()
            ) : (
              <div className="empty-panel">Interaction matrix unavailable.</div>
            )}
          </div>

          {/* Chart 7: 2D Prediction vs Feature Contour */}
          <div className="chart-card-2d">
            <div className="card-top-info">
              <div>
                <h3>7. Prediction Contour Map</h3>
                <p className="chart-desc">
                  Top-down isoline contour companion projecting model response across the primary feature pair.
                </p>
              </div>
            </div>

            {result.prediction_surface ? (
              <Plot
                data={[
                  {
                    type: "contour",
                    x: result.prediction_surface.x_values,
                    y: result.prediction_surface.y_values,
                    z: result.prediction_surface.z_values,
                    colorscale: "Viridis",
                    contours: { coloring: "heatmap", showlabels: true },
                  },
                ]}
                layout={{
                  ...baseLayout2D,
                  title: `2D Contour: ${result.prediction_surface.x_feature} vs ${result.prediction_surface.y_feature}`,
                  height: 420,
                  xaxis: { ...baseLayout2D.xaxis, title: result.prediction_surface.x_feature },
                  yaxis: { ...baseLayout2D.yaxis, title: result.prediction_surface.y_feature },
                }}
                useResizeHandler
                style={{ width: "100%" }}
                config={{ responsive: true, displaylogo: false }}
              />
            ) : (
              <div className="empty-panel">Contour data unavailable.</div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUBCATEGORY 3: TREES & MARGINAL EFFECTS (4 Charts) */}
      {/* ============================================================== */}
      {activeSubcategory === "trees" && (
        <div className="charts-2d-grid">
          {/* Chart 8: Readable Tree Split Diagram */}
          <div className="chart-card-2d full-width">
            <div className="card-top-info">
              <div>
                <h3>8. Decision Tree Split Hierarchy</h3>
                <p className="chart-desc">
                  Inspect split decisions, thresholds, sample covers, and leaf values for individual boosting trees.
                </p>
              </div>
              <div className="tree-selector">
                <label>Tree Round:</label>
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

            {(() => {
              const currentTree = result.trees?.[selectedTreeIndex]?.structure || result.first_tree;
              if (!currentTree) {
                return <div className="empty-panel">Tree structure not found.</div>;
              }

              // Flatten nodes
              const nodeItems = [];
              function flatten(node, depth = 0, path = "Root") {
                if (!node) return;
                nodeItems.push({
                  id: node.nodeid,
                  depth,
                  path,
                  isLeaf: node.leaf !== undefined,
                  split: node.split,
                  cond: node.split_condition,
                  cover: node.cover,
                  leafVal: node.leaf,
                });
                if (node.children) {
                  node.children.forEach((c, idx) => {
                    flatten(c, depth + 1, `${path} → ${idx === 0 ? "Yes" : "No"}`);
                  });
                }
              }
              flatten(currentTree);

              return (
                <div className="tree-split-table-wrap">
                  <table className="custom-table tree-table">
                    <thead>
                      <tr>
                        <th>Node ID</th>
                        <th>Depth</th>
                        <th>Branch Path</th>
                        <th>Split Rule / Decision</th>
                        <th>Sample Cover</th>
                        <th>Leaf Output / Weight</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nodeItems.map((n) => (
                        <tr key={n.id} className={n.isLeaf ? "leaf-row" : ""}>
                          <td>#{n.id}</td>
                          <td>
                            <span className="depth-badge">L{n.depth}</span>
                          </td>
                          <td className="branch-path">{n.path}</td>
                          <td>
                            {n.isLeaf ? (
                              <span className="leaf-badge">🍃 Terminal Leaf</span>
                            ) : (
                              <strong>
                                {n.split} &lt; {n.cond?.toFixed(2)}
                              </strong>
                            )}
                          </td>
                          <td>{n.cover?.toFixed(1) || "—"}</td>
                          <td style={{ color: n.leafVal >= 0 ? "#4ade80" : "#f87171" }}>
                            {n.isLeaf ? n.leafVal?.toFixed(4) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>

          {/* Chart 9: Partial Dependence Plot (1D) */}
          <div className="chart-card-2d">
            <div className="card-top-info">
              <div>
                <h3>9. 1D Partial Dependence Plot (PDP)</h3>
                <p className="chart-desc">
                  Average model prediction response across the distribution of a single feature.
                </p>
              </div>
              <select
                value={selectedPdpIndex}
                onChange={(e) => setSelectedPdpIndex(Number(e.target.value))}
              >
                {(result.partial_dependence || []).map((p, i) => (
                  <option key={i} value={i}>
                    {p.feature}
                  </option>
                ))}
              </select>
            </div>

            {(() => {
              const pdp = result.partial_dependence?.[selectedPdpIndex];
              if (!pdp) return <div className="empty-panel">PDP data unavailable.</div>;

              return (
                <Plot
                  data={[
                    {
                      type: "scatter",
                      mode: "lines+markers",
                      x: pdp.x_values,
                      y: pdp.y_values,
                      line: { color: "#a855f7", width: 3 },
                      marker: { size: 5, color: "#c084fc" },
                      name: "Marginal Effect",
                    },
                  ]}
                  layout={{
                    ...baseLayout2D,
                    title: `Partial Dependence: ${pdp.feature}`,
                    height: 380,
                    xaxis: { ...baseLayout2D.xaxis, title: pdp.feature },
                    yaxis: { ...baseLayout2D.yaxis, title: pdp.output_label },
                  }}
                  useResizeHandler
                  style={{ width: "100%" }}
                  config={{ responsive: true, displaylogo: false }}
                />
              );
            })()}
          </div>

          {/* Chart 10: SHAP Summary Beeswarm */}
          <div className="chart-card-2d">
            <div className="card-top-info">
              <div>
                <h3>10. SHAP Summary / Beeswarm</h3>
                <p className="chart-desc">
                  Global feature impact and directionality: red represents high feature values; blue represents low values.
                </p>
              </div>
            </div>

            {result.shap_summary?.features?.length > 0 ? (
              (() => {
                const feats = result.shap_summary.features.slice(0, 10).reverse();
                const traces = [];

                feats.forEach((f) => {
                  const sVals = f.shap_values || [];
                  const rawVals = f.values || [];
                  const minR = Math.min(...rawVals);
                  const maxR = Math.max(...rawVals);
                  const range = maxR > minR ? maxR - minR : 1;

                  traces.push({
                    type: "scatter",
                    mode: "markers",
                    x: sVals,
                    y: Array(sVals.length).fill(f.feature),
                    marker: {
                      size: 6,
                      color: rawVals.map((v) => (v - minR) / range),
                      colorscale: "Plasma",
                      opacity: 0.75,
                    },
                    name: f.feature,
                    hoverinfo: "x",
                    showlegend: false,
                  });
                });

                return (
                  <Plot
                    data={traces}
                    layout={{
                      ...baseLayout2D,
                      title: "SHAP Beeswarm Distribution",
                      height: 380,
                      margin: { l: 140, r: 30, t: 30, b: 50 },
                      xaxis: { ...baseLayout2D.xaxis, title: "SHAP Value (Impact on Model Output)" },
                    }}
                    useResizeHandler
                    style={{ width: "100%" }}
                    config={{ responsive: true, displaylogo: false }}
                  />
                );
              })()
            ) : (
              <div className="empty-panel">SHAP values unavailable.</div>
            )}
          </div>

          {/* Chart 11: SHAP Dependence Plot */}
          <div className="chart-card-2d full-width">
            <div className="card-top-info">
              <div>
                <h3>11. 2D SHAP Dependence Plot</h3>
                <p className="chart-desc">
                  Plots a feature’s value against its SHAP attribution, revealing non-linear threshold effects.
                </p>
              </div>
              <select
                value={shapDepFeat || result.features?.[0]}
                onChange={(e) => setShapDepFeat(e.target.value)}
              >
                {featureList.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            {(() => {
              const activeFeat = shapDepFeat || result.features?.[0];
              const fObj = result.shap_summary?.features?.find((f) => f.feature === activeFeat);

              if (!fObj) {
                return <div className="empty-panel">Feature not present in SHAP sample.</div>;
              }

              return (
                <Plot
                  data={[
                    {
                      type: "scatter",
                      mode: "markers",
                      x: fObj.values,
                      y: fObj.shap_values,
                      marker: {
                        color: fObj.shap_values,
                        colorscale: "Viridis",
                        size: 7,
                        colorbar: { title: "SHAP Value" },
                      },
                      hovertemplate: `${activeFeat}: %{x:.2f}<br>SHAP Attribution: %{y:.4f}<extra></extra>`,
                    },
                  ]}
                  layout={{
                    ...baseLayout2D,
                    title: `SHAP Dependence: ${activeFeat}`,
                    height: 380,
                    xaxis: { ...baseLayout2D.xaxis, title: `${activeFeat} Value` },
                    yaxis: { ...baseLayout2D.yaxis, title: `SHAP Value for ${activeFeat}` },
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

      {/* ============================================================== */}
      {/* SUBCATEGORY 4: CLASSIFICATION DIAGNOSTICS (5 Charts) */}
      {/* ============================================================== */}
      {activeSubcategory === "classification" && (
        <div className="charts-2d-grid">
          {task !== "classification" ? (
            <div className="warning-banner full-width">
              <strong>Rule 5 Notice:</strong> ROC Curves, Precision-Recall Curves, Confusion Matrices, Calibration Curves, and Cumulative Gain are strictly classification diagnostics. Since the active model is trained for <strong>REGRESSION</strong>, these plots require discrete target classes and probability scores.
            </div>
          ) : (
            <>
              {/* Chart 12: ROC Curve */}
              <div className="chart-card-2d">
                <div className="card-top-info">
                  <div>
                    <h3>12. Receiver Operating Characteristic (ROC)</h3>
                    <p className="chart-desc">
                      Trade-off between True Positive Rate and False Positive Rate across all decision cutoffs.
                    </p>
                  </div>
                </div>

                {result.classification_diagnostics?.roc_curve ? (
                  <Plot
                    data={[
                      {
                        type: "scatter",
                        mode: "lines",
                        x: result.classification_diagnostics.roc_curve.fpr,
                        y: result.classification_diagnostics.roc_curve.tpr,
                        line: { color: "#ec4899", width: 3 },
                        name: `XGBoost (AUC = ${(result.metrics?.roc_auc ?? 0).toFixed(4)})`,
                      },
                      {
                        type: "scatter",
                        mode: "lines",
                        x: [0, 1],
                        y: [0, 1],
                        line: { color: "#64748b", width: 1.5, dash: "dash" },
                        name: "Random Chance (AUC = 0.5)",
                      },
                    ]}
                    layout={{
                      ...baseLayout2D,
                      title: "ROC Discrimination Curve",
                      height: 380,
                      xaxis: { ...baseLayout2D.xaxis, title: "False Positive Rate (1 - Specificity)" },
                      yaxis: { ...baseLayout2D.yaxis, title: "True Positive Rate (Sensitivity)" },
                    }}
                    useResizeHandler
                    style={{ width: "100%" }}
                    config={{ responsive: true, displaylogo: false }}
                  />
                ) : (
                  <div className="empty-panel">ROC curve data unavailable.</div>
                )}

                <div className="chart-footer-note">
                  AUC = {(result.metrics?.roc_auc ?? 0).toFixed(4)} · Closer to top-left indicates superior separation.
                </div>
              </div>

              {/* Chart 13: Precision-Recall Curve */}
              <div className="chart-card-2d">
                <div className="card-top-info">
                  <div>
                    <h3>13. Precision–Recall Curve</h3>
                    <p className="chart-desc">
                      Precision vs. Recall trade-off, especially vital for imbalanced classification scenarios.
                    </p>
                  </div>
                </div>

                {result.classification_diagnostics?.precision_recall_curve ? (
                  <Plot
                    data={[
                      {
                        type: "scatter",
                        mode: "lines",
                        x: result.classification_diagnostics.precision_recall_curve.recall,
                        y: result.classification_diagnostics.precision_recall_curve.precision,
                        line: { color: "#38bdf8", width: 3 },
                        name: "Precision-Recall",
                      },
                    ]}
                    layout={{
                      ...baseLayout2D,
                      title: "Precision vs. Recall Curve",
                      height: 380,
                      xaxis: { ...baseLayout2D.xaxis, title: "Recall (Completeness)" },
                      yaxis: { ...baseLayout2D.yaxis, title: "Precision (Positive Predictive Value)" },
                    }}
                    useResizeHandler
                    style={{ width: "100%" }}
                    config={{ responsive: true, displaylogo: false }}
                  />
                ) : (
                  <div className="empty-panel">Precision-Recall data unavailable.</div>
                )}

                <div className="chart-footer-note">
                  Evaluates performance without being skewed by large numbers of true negatives.
                </div>
              </div>

              {/* Chart 14: Confusion Matrix */}
              <div className="chart-card-2d">
                <div className="card-top-info">
                  <div>
                    <h3>14. Confusion Matrix Heatmap</h3>
                    <p className="chart-desc">
                      Cross-tabulation of actual versus predicted classes with classification accuracy.
                    </p>
                  </div>
                </div>

                {result.classification_diagnostics?.confusion_matrix ? (
                  (() => {
                    const matrix = result.classification_diagnostics.confusion_matrix;
                    const labels = (result.classification_diagnostics.class_labels || [0, 1]).map(
                      (l) => `Class ${l}`
                    );

                    return (
                      <Plot
                        data={[
                          {
                            type: "heatmap",
                            x: labels,
                            y: labels,
                            z: matrix,
                            colorscale: "Plasma",
                            text: matrix.map((row) => row.map(String)),
                            texttemplate: "%{text}",
                            textfont: { size: 16, color: "#ffffff" },
                            hovertemplate: "Actual: %{y}<br>Predicted: %{x}<br>Count: %{z}<extra></extra>",
                          },
                        ]}
                        layout={{
                          ...baseLayout2D,
                          title: "Confusion Matrix Counts",
                          height: 380,
                          xaxis: { ...baseLayout2D.xaxis, title: "Predicted Class" },
                          yaxis: { ...baseLayout2D.yaxis, title: "Actual Ground Truth", autorange: "reversed" },
                        }}
                        useResizeHandler
                        style={{ width: "100%" }}
                        config={{ responsive: true, displaylogo: false }}
                      />
                    );
                  })()
                ) : (
                  <div className="empty-panel">Confusion matrix unavailable.</div>
                )}

                <div className="chart-footer-note">
                  Diagonal cells represent correctly classified true positives and true negatives.
                </div>
              </div>

              {/* Chart 15: Calibration Curve */}
              <div className="chart-card-2d">
                <div className="card-top-info">
                  <div>
                    <h3>15. Calibration Reliability Curve</h3>
                    <p className="chart-desc">
                      Plots predicted model probabilities against observed empirical positive frequency.
                    </p>
                  </div>
                </div>

                {result.classification_diagnostics?.calibration_curve ? (
                  <Plot
                    data={[
                      {
                        type: "scatter",
                        mode: "lines+markers",
                        x: result.classification_diagnostics.calibration_curve.prob_pred,
                        y: result.classification_diagnostics.calibration_curve.prob_true,
                        line: { color: "#22c55e", width: 3 },
                        marker: { size: 7, color: "#86efac" },
                        name: "XGBoost Calibration",
                      },
                      {
                        type: "scatter",
                        mode: "lines",
                        x: [0, 1],
                        y: [0, 1],
                        line: { color: "#94a3b8", width: 1.5, dash: "dash" },
                        name: "Perfect Calibration",
                      },
                    ]}
                    layout={{
                      ...baseLayout2D,
                      title: "Probability Calibration Curve",
                      height: 380,
                      xaxis: { ...baseLayout2D.xaxis, title: "Mean Predicted Probability" },
                      yaxis: { ...baseLayout2D.yaxis, title: "Fraction of Positives" },
                    }}
                    useResizeHandler
                    style={{ width: "100%" }}
                    config={{ responsive: true, displaylogo: false }}
                  />
                ) : (
                  <div className="empty-panel">Calibration data unavailable.</div>
                )}

                <div className="chart-footer-note">
                  Adherence to the diagonal proves predicted 80% chances correspond to 80% true outcomes.
                </div>
              </div>

              {/* Chart 16: Cumulative Gain Curve */}
              <div className="chart-card-2d full-width">
                <div className="card-top-info">
                  <div>
                    <h3>16. Cumulative Gain Curve</h3>
                    <p className="chart-desc">
                      Percentage of total positive targets reached when targeting a given fraction of the total population.
                    </p>
                  </div>
                </div>

                {result.classification_diagnostics?.cumulative_gain ? (
                  <Plot
                    data={[
                      {
                        type: "scatter",
                        mode: "lines",
                        x: result.classification_diagnostics.cumulative_gain.population_pct.map(
                          (v) => v * 100
                        ),
                        y: result.classification_diagnostics.cumulative_gain.gain_pct.map(
                          (v) => v * 100
                        ),
                        line: { color: "#a855f7", width: 3.5 },
                        name: "XGBoost Model",
                      },
                      {
                        type: "scatter",
                        mode: "lines",
                        x: [0, 100],
                        y: [0, 100],
                        line: { color: "#64748b", width: 2, dash: "dash" },
                        name: "Baseline (Random Selection)",
                      },
                    ]}
                    layout={{
                      ...baseLayout2D,
                      title: "Cumulative Gain Chart",
                      height: 380,
                      xaxis: { ...baseLayout2D.xaxis, title: "% of Sample Population Contacted / Targeted" },
                      yaxis: { ...baseLayout2D.yaxis, title: "% of Total Positive Targets Captured" },
                    }}
                    useResizeHandler
                    style={{ width: "100%" }}
                    config={{ responsive: true, displaylogo: false }}
                  />
                ) : (
                  <div className="empty-panel">Cumulative gain data unavailable.</div>
                )}

                <div className="chart-footer-note">
                  A steep initial ascent indicates high ranking effectiveness for targeting top prospects or fraud cases.
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
