import { useState } from "react";
import Plot from "react-plotly.js";

export default function ExplainabilityStudio({ result, theme }) {
  const [selectedSampleIndex, setSelectedSampleIndex] = useState(0);
  const isLight = theme === "light";

  if (!result) {
    return (
      <div className="section-container">
        <div className="empty-panel">
          <div className="empty-icon">◉</div>
          <h3>Explainability Studio Awaiting Trained Model</h3>
          <p>Train an XGBoost model to inspect SHAP attributions, feature dependencies, and sample breakdowns.</p>
        </div>
      </div>
    );
  }

  const shapFeatures = result.shap_summary?.features || [];
  const interactions = result.feature_interactions?.interactions || [];
  const testPredictions = result.predictions || [];

  return (
    <div className="section-container">
      <div className="section-intro">
        <div>
          <span className="eyebrow">STEP 5 · EXPLAINABILITY & SHAP DEEP DIVE</span>
          <h2>Model Interpretability & Attribution Analysis</h2>
          <p>
            Understand how each feature influences predictions globally and dissect individual sample decision pathways using TreeSHAP game-theoretic values.
          </p>
        </div>
      </div>

      {/* Global SHAP Importance Table & Pairwise Interactions */}
      <div className="training-panel-grid">
        {/* Table of Top Global SHAP Features */}
        <div className="table-card">
          <div className="table-card-header">
            <div>
              <h3>Global Feature Attribution (Mean |SHAP|)</h3>
              <p>Average magnitude of feature impact across test samples</p>
            </div>
          </div>
          <div className="table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Feature Name</th>
                  <th>Mean |SHAP|</th>
                  <th>Relative Impact</th>
                </tr>
              </thead>
              <tbody>
                {shapFeatures.map((f, idx) => {
                  const maxShap = shapFeatures[0]?.mean_abs_shap || 1;
                  const pct = Math.min(100, (f.mean_abs_shap / maxShap) * 100);
                  return (
                    <tr key={f.feature}>
                      <td>#{idx + 1}</td>
                      <td>
                        <strong>{f.feature}</strong>
                      </td>
                      <td>{f.mean_abs_shap.toFixed(4)}</td>
                      <td>
                        <div className="mini-progress-bar">
                          <div className="mini-fill" style={{ width: `${pct}%` }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pairwise SHAP Interactions */}
        <div className="table-card">
          <div className="table-card-header">
            <div>
              <h3>Strongest Pairwise Feature Interactions</h3>
              <p>Top non-additive effects detected by TreeSHAP interaction tensors</p>
            </div>
          </div>
          <div className="table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Feature A × Feature B</th>
                  <th>Interaction Strength</th>
                </tr>
              </thead>
              <tbody>
                {interactions.slice(0, 10).map((item, idx) => (
                  <tr key={idx}>
                    <td>#{idx + 1}</td>
                    <td>
                      <strong>{item.feature_1}</strong> <span style={{ color: "#a855f7" }}>×</span>{" "}
                      <strong>{item.feature_2}</strong>
                    </td>
                    <td>{item.strength.toFixed(5)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Single-Sample Attribution Breakdown (Waterfall style) */}
      <div className="chart-card-2d full-width" style={{ marginTop: 24 }}>
        <div className="card-top-info">
          <div>
            <h3>Sample-Level SHAP Waterfall Attribution</h3>
            <p className="chart-desc">
              Select an individual test sample to see which features pushed its prediction higher (green) or lower (pink).
            </p>
          </div>
          <div className="sample-picker">
            <label>Test Sample Index:</label>
            <select
              value={selectedSampleIndex}
              onChange={(e) => setSelectedSampleIndex(Number(e.target.value))}
            >
              {testPredictions.slice(0, 30).map((p, i) => (
                <option key={i} value={i}>
                  Sample #{i + 1} (Actual: {p.actual.toFixed(2)}, Pred: {p.predicted.toFixed(2)})
                </option>
              ))}
            </select>
          </div>
        </div>

        {(() => {
          const sample = testPredictions[selectedSampleIndex];
          // Gather sample SHAP values
          const sampleAttributions = shapFeatures.map((f) => ({
            feature: f.feature,
            value: f.values?.[selectedSampleIndex] ?? 0,
            shap: f.shap_values?.[selectedSampleIndex] ?? 0,
          }));

          sampleAttributions.sort((a, b) => Math.abs(b.shap) - Math.abs(a.shap));
          const topAttributions = sampleAttributions.slice(0, 10).reverse();

          return (
            <div className="chart-display-grid">
              <Plot
                data={[
                  {
                    type: "bar",
                    orientation: "h",
                    x: topAttributions.map((a) => a.shap),
                    y: topAttributions.map((a) => `${a.feature} (${a.value.toFixed(1)})`),
                    marker: {
                      color: topAttributions.map((a) => (a.shap >= 0 ? "#22c55e" : "#f43f5e")),
                    },
                    hovertemplate:
                      "Feature: %{y}<br>SHAP Contribution: %{x:.4f}<extra></extra>",
                  },
                ]}
                layout={{
                  paper_bgcolor: "rgba(0,0,0,0)",
                  plot_bgcolor: "rgba(0,0,0,0)",
                  font: { color: isLight ? "#1e293b" : "#e5e7eb" },
                  margin: { l: 180, r: 30, t: 30, b: 50 },
                  height: 380,
                  xaxis: { title: "SHAP Impact on Single Prediction (y - Base)", zerolinecolor: isLight ? "#6366f1" : "#8b5cf6", gridcolor: isLight ? "rgba(203, 213, 225, 0.7)" : "#282338" },
                  yaxis: { title: "", gridcolor: isLight ? "rgba(203, 213, 225, 0.7)" : "#282338" },
                }}
                useResizeHandler
                style={{ width: "100%" }}
                config={{ responsive: true, displaylogo: false }}
              />

              {sample && (
                <div className="sample-summary-card">
                  <h4>Sample #{selectedSampleIndex + 1} Metadata</h4>
                  <div className="summary-list">
                    <div className="summary-item">
                      <span>Ground Truth (Actual):</span>
                      <strong>{sample.actual.toFixed(4)}</strong>
                    </div>
                    <div className="summary-item">
                      <span>Model Prediction:</span>
                      <strong>{sample.predicted.toFixed(4)}</strong>
                    </div>
                    <div className="summary-item">
                      <span>Residual Error:</span>
                      <strong style={{ color: Math.abs(sample.residual) < 0.2 ? "#4ade80" : "#f87171" }}>
                        {sample.residual.toFixed(4)}
                      </strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
