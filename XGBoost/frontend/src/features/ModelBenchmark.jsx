import { useState } from "react";
import Plot from "react-plotly.js";
import { compareModelsApi } from "../services/api";

export default function ModelBenchmark({ currentFile, currentTarget, currentTask, theme }) {
  const [file, setFile] = useState(currentFile || null);
  const [target, setTarget] = useState(currentTarget || "");
  const [task, setTask] = useState(currentTask || "regression");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isLight = theme === "light";

  async function runBenchmark() {
    const activeF = file || currentFile;
    const activeT = target || currentTarget;
    const activeK = task || currentTask;

    if (!activeF || !activeT) {
      setError("Please select or load a dataset first.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const data = await compareModelsApi({
        file: activeF,
        target: activeT,
        task: activeK,
      });
      setResults(data.results || []);
    } catch (err) {
      setError(err.message || "Model benchmark failed.");
    } finally {
      setLoading(false);
    }
  }

  const metricKeys = results.length ? Object.keys(results[0].metrics || {}) : [];

  return (
    <div className="section-container">
      <div className="section-intro">
        <div>
          <span className="eyebrow">STEP 7 · ENSEMBLE BENCHMARK</span>
          <h2>Model Comparison & Competitive Benchmark</h2>
          <p>
            Evaluate XGBoost against Random Forest and single Decision Tree classifiers/regressors on the exact same train/test splits.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={runBenchmark}
          disabled={loading || (!file && !currentFile)}
        >
          {loading ? "Benchmarking Models..." : "⚡ Run Head-to-Head Benchmark"}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Benchmark Results */}
      {results.length > 0 ? (
        <div className="benchmark-results-container">
          {/* Comparative Metrics Table */}
          <div className="table-card">
            <div className="table-card-header">
              <div>
                <h3>Performance Comparison Matrix</h3>
                <p>Identical 80/20 train-test splits across all three architectures</p>
              </div>
            </div>

            <div className="table-wrapper">
              <table className="custom-table benchmark-table">
                <thead>
                  <tr>
                    <th>Algorithm</th>
                    {metricKeys.map((m) => (
                      <th key={m}>{m.toUpperCase()}</th>
                    ))}
                    <th>Training & Eval Time</th>
                    <th>Relative Speed</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => {
                    const isXgb = r.model === "XGBoost";
                    return (
                      <tr key={i} className={isXgb ? "highlight-row" : ""}>
                        <td>
                          <strong>{r.model}</strong>
                          {isXgb && <span className="winner-tag">Our Model</span>}
                        </td>
                        {metricKeys.map((m) => {
                          const val = r.metrics[m];
                          return (
                            <td key={m} className={isXgb ? "bold-metric" : ""}>
                              {typeof val === "number" ? val.toFixed(4) : val}
                            </td>
                          );
                        })}
                        <td>{r.training_and_prediction_seconds}s</td>
                        <td>
                          <span className={`speed-badge ${isXgb ? "fast" : ""}`}>
                            {isXgb ? "⚡ Accelerated" : "Standard"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Comparative Bar Chart */}
          <div className="chart-card-2d full-width" style={{ marginTop: 24 }}>
            <div className="card-top-info">
              <div>
                <h3>Comparative Metric Bar Visualizer</h3>
                <p className="chart-desc">
                  Direct visual comparison of model accuracy, error metrics, and training latency.
                </p>
              </div>
            </div>

            <Plot
              data={results.map((r, idx) => ({
                type: "bar",
                name: r.model,
                x: metricKeys.map((m) => m.toUpperCase()),
                y: metricKeys.map((m) => r.metrics[m] || 0),
                marker: {
                  color: ["#a855f7", "#38bdf8", "#ec4899"][idx % 3],
                },
              }))}
              layout={{
                paper_bgcolor: "rgba(0,0,0,0)",
                plot_bgcolor: "rgba(0,0,0,0)",
                font: { color: isLight ? "#1e293b" : "#e5e7eb" },
                barmode: "group",
                height: 400,
                xaxis: { gridcolor: isLight ? "rgba(203, 213, 225, 0.7)" : "#282338" },
                yaxis: { gridcolor: isLight ? "rgba(203, 213, 225, 0.7)" : "#282338", title: "Metric Score" },
              }}
              useResizeHandler
              style={{ width: "100%" }}
              config={{ responsive: true, displaylogo: false }}
            />
          </div>
        </div>
      ) : (
        <div className="empty-panel">
          <div className="empty-icon">⇄</div>
          <h3>Click "Run Head-to-Head Benchmark" to Compare Models</h3>
          <p>
            The backend will fit XGBoost (100 estimators), Random Forest (100 estimators), and Decision Tree on the current dataset.
          </p>
        </div>
      )}
    </div>
  );
}
