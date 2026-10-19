import { useState } from "react";

export default function ReportsSection({ result, task, predictionHistory = [] }) {
  const [downloadSuccess, setDownloadSuccess] = useState("");

  if (!result) {
    return (
      <div className="section-container">
        <div className="empty-panel">
          <div className="empty-icon">▣</div>
          <h3>Reports & Export Studio Awaiting Trained Model</h3>
          <p>Train a model to download prediction CSVs and audit diagnostic reports.</p>
        </div>
      </div>
    );
  }

  function downloadCsvPredictions() {
    const preds = result.predictions || [];
    if (!preds.length) return;

    const headers = ["Index", "Actual", "Predicted", "Residual"];
    const rows = preds.map((p, i) => [
      i + 1,
      p.actual,
      p.predicted,
      p.residual.toFixed(5),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `xgboost_predictions_${result.target}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setDownloadSuccess("Predictions CSV exported successfully!");
    setTimeout(() => setDownloadSuccess(""), 4000);
  }

  function downloadSummaryJson() {
    const reportData = {
      project: "ModelMind XGBoost Studio",
      timestamp: new Date().toISOString(),
      task: result.task,
      target: result.target,
      training_samples: result.train_rows,
      test_samples: result.test_rows,
      metrics: result.metrics,
      hyperparameters: result.hyperparameters,
      top_features: (result.feature_importance || []).slice(0, 10),
      training_duration_seconds: result.training_time_seconds,
    };

    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(reportData, null, 2));
    const dlAnchor = document.createElement("a");
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `modelmind_report_${result.target}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
    setDownloadSuccess("Model diagnostic report exported successfully!");
    setTimeout(() => setDownloadSuccess(""), 4000);
  }

  return (
    <div className="section-container">
      <div className="section-intro">
        <div>
          <span className="eyebrow">STEP 8 · EXPORT & AUDIT REPORTING</span>
          <h2>Diagnostic Reports & Data Export</h2>
          <p>
            Download complete model performance summaries, export hold-out set prediction residuals to CSV, and review simulation history.
          </p>
        </div>

        <div className="export-action-btns">
          <button className="primary-button" onClick={downloadCsvPredictions}>
            ⇩ Download Predictions CSV
          </button>
          <button className="secondary-btn" onClick={downloadSummaryJson}>
            ⇩ Export Diagnostic JSON Report
          </button>
        </div>
      </div>

      {downloadSuccess && <div className="success-banner">{downloadSuccess}</div>}

      {/* Model Specification Card */}
      <div className="table-card" style={{ marginBottom: 24 }}>
        <div className="table-card-header">
          <div>
            <h3>Active Model Specification Summary</h3>
            <p>Architectural and evaluation metadata</p>
          </div>
        </div>

        <div className="summary-list horizontal-list">
          <div className="summary-item">
            <span>Model Engine:</span>
            <strong>XGBoost 2.x Gradient Boosting</strong>
          </div>
          <div className="summary-item">
            <span>Target Field:</span>
            <strong>{result.target}</strong>
          </div>
          <div className="summary-item">
            <span>Task Formulation:</span>
            <strong style={{ textTransform: "uppercase" }}>{result.task}</strong>
          </div>
          <div className="summary-item">
            <span>Trees Trained:</span>
            <strong>{result.hyperparameters?.n_estimators || 150} trees</strong>
          </div>
          <div className="summary-item">
            <span>Max Tree Depth:</span>
            <strong>Depth {result.hyperparameters?.max_depth || 5}</strong>
          </div>
          <div className="summary-item">
            <span>Fitting Duration:</span>
            <strong>{result.training_time_seconds} seconds</strong>
          </div>
        </div>
      </div>

      {/* What-If Simulation History Table */}
      <div className="table-card">
        <div className="table-card-header">
          <div>
            <h3>What-If Simulation History ({predictionHistory.length} queries)</h3>
            <p>Log of all dynamic inferences executed in the current session</p>
          </div>
        </div>

        {predictionHistory.length > 0 ? (
          <div className="table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Predicted Target Output</th>
                  <th>Class Probabilities</th>
                  <th>Inputs Snapshot</th>
                </tr>
              </thead>
              <tbody>
                {predictionHistory.map((h, i) => (
                  <tr key={i}>
                    <td>{h.timestamp}</td>
                    <td>
                      <strong style={{ color: "#a855f7" }}>
                        {typeof h.prediction === "number"
                          ? h.prediction.toFixed(4)
                          : h.prediction}
                      </strong>
                    </td>
                    <td>
                      {h.probabilities
                        ? h.probabilities.map((p, idx) => `C${idx}: ${(p * 100).toFixed(1)}%`).join(" · ")
                        : "—"}
                    </td>
                    <td>
                      <code>{JSON.stringify(h.inputs).slice(0, 80)}...</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-panel" style={{ padding: 30 }}>
            No interactive simulations run yet. Use Step 6 (What-If Predictor) to test hypothetical inputs.
          </div>
        )}
      </div>
    </div>
  );
}
