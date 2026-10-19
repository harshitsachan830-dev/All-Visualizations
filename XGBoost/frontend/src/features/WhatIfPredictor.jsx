import { useState, useEffect } from "react";
import { predictSingleApi } from "../services/api";

export default function WhatIfPredictor({ result, task, onAddPredictionToHistory }) {
  const [formValues, setFormValues] = useState({});
  const [predicting, setPredicting] = useState(false);
  const [predictionResponse, setPredictionResponse] = useState(null);
  const [predictError, setPredictError] = useState("");

  const featureList = result?.features || [];

  // Initialize input fields to default 0 or baseline
  useEffect(() => {
    if (featureList.length > 0) {
      const init = {};
      featureList.forEach((f) => {
        // Find in SHAP values median if available
        const fObj = result.shap_summary?.features?.find((x) => x.feature === f);
        if (fObj && fObj.values && fObj.values.length > 0) {
          const sorted = [...fObj.values].sort((a, b) => a - b);
          init[f] = sorted[Math.floor(sorted.length / 2)] || 0;
        } else {
          init[f] = 0;
        }
      });
      setFormValues(init);
    }
  }, [result, featureList]);

  function handleInputChange(feature, val) {
    setFormValues((prev) => ({
      ...prev,
      [feature]: val === "" ? "" : Number(val),
    }));
  }

  async function handlePredictSubmit(e) {
    e.preventDefault();
    setPredicting(true);
    setPredictError("");
    try {
      const res = await predictSingleApi(formValues);
      setPredictionResponse(res);
      if (onAddPredictionToHistory) {
        onAddPredictionToHistory({
          timestamp: new Date().toLocaleTimeString(),
          prediction: res.prediction,
          probabilities: res.probabilities,
          inputs: { ...formValues },
        });
      }
    } catch (err) {
      setPredictError(err.message || "Prediction inference failed.");
    } finally {
      setPredicting(false);
    }
  }

  if (!result) {
    return (
      <div className="section-container">
        <div className="empty-panel">
          <div className="empty-icon">⇲</div>
          <h3>What-If Predictor Awaiting Trained Model</h3>
          <p>Train an XGBoost model in Step 2 to enable real-time scenario simulation and inference.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="section-container">
      <div className="section-intro">
        <div>
          <span className="eyebrow">STEP 6 · REAL-TIME SCENARIO SIMULATOR</span>
          <h2>Interactive "What-If" Inference Engine</h2>
          <p>
            Simulate hypothetical feature combinations and observe model predictions, class probabilities, and response sensitivity in real time.
          </p>
        </div>
      </div>

      <div className="predictor-layout-grid">
        {/* Interactive Feature Inputs Form */}
        <div className="table-card predictor-inputs-card">
          <div className="table-card-header">
            <div>
              <h3>Feature Input Values</h3>
              <p>Adjust individual values to simulate custom test scenarios</p>
            </div>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => {
                const reset = {};
                featureList.forEach((f) => (reset[f] = 0));
                setFormValues(reset);
              }}
            >
              Reset to Zero
            </button>
          </div>

          <form onSubmit={handlePredictSubmit}>
            <div className="features-inputs-scroll">
              {featureList.map((feature) => (
                <div key={feature} className="feature-input-row">
                  <div className="feat-name-wrap">
                    <label>{feature}</label>
                  </div>
                  <input
                    type="number"
                    step="any"
                    value={formValues[feature] ?? 0}
                    onChange={(e) => handleInputChange(feature, e.target.value)}
                    required
                  />
                </div>
              ))}
            </div>

            <div className="form-submit-row">
              <button type="submit" className="primary-button predict-btn" disabled={predicting}>
                {predicting ? "Running Inference..." : "⚡ Compute What-If Prediction"}
              </button>
            </div>
          </form>

          {predictError && <div className="error-banner">{predictError}</div>}
        </div>

        {/* Prediction Results Gauge & Outcome Display */}
        <div className="table-card predictor-output-card">
          <div className="table-card-header">
            <div>
              <h3>Simulated Inference Result</h3>
              <p>Instant evaluation output from the trained XGBoost booster</p>
            </div>
          </div>

          {predictionResponse ? (
            <div className="prediction-result-display">
              <div className="result-hero-box">
                <span className="result-label">
                  {task === "classification" ? "PREDICTED OUTCOME / CLASS" : "PREDICTED TARGET VALUE"}
                </span>
                <h1 className="result-value">
                  {task === "classification"
                    ? `Class ${predictionResponse.prediction}`
                    : predictionResponse.prediction.toLocaleString(undefined, {
                        maximumFractionDigits: 4,
                      })}
                </h1>
                <span className="result-target-tag">Target: {result.target}</span>
              </div>

              {/* Class Probability Distribution if Classification */}
              {task === "classification" && predictionResponse.probabilities && (
                <div className="probabilities-box">
                  <h4>Class Probability Distribution</h4>
                  <div className="prob-bars-list">
                    {predictionResponse.probabilities.map((prob, cIdx) => (
                      <div key={cIdx} className="prob-bar-row">
                        <div className="prob-bar-label">
                          <span>Class {cIdx}</span>
                          <strong>{(prob * 100).toFixed(1)}%</strong>
                        </div>
                        <div className="prob-track">
                          <div
                            className="prob-fill"
                            style={{
                              width: `${prob * 100}%`,
                              background: cIdx === 1 ? "#ec4899" : "#38bdf8",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="result-context-info">
                <strong>Simulated Configuration:</strong>
                <p>
                  Evaluated with {featureList.length} active features passed directly to the in-memory fitted model.
                </p>
              </div>
            </div>
          ) : (
            <div className="empty-panel" style={{ height: 280 }}>
              <div className="empty-icon">⚡</div>
              <p>Adjust inputs on the left and click "Compute What-If Prediction" to view the response.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
