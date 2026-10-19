import { useState, useEffect } from "react";

export default function TrainingSection({
  file,
  target,
  task,
  imputationStrategy = "median",
  setImputationStrategy,
  training,
  onTrain,
  result,
  error,
  onOpen3D,
  onOpen2D,
  hyperparams,
  setHyperparams,
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let interval = null;
    if (training) {
      setElapsed(0);
      interval = setInterval(() => {
        setElapsed((e) => Math.round((e + 0.1) * 10) / 10);
      }, 100);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [training]);

  function handleChange(field, val) {
    setHyperparams((prev) => ({ ...prev, [field]: val }));
  }

  const metrics = result?.metrics || {};

  return (
    <div className="section-container">
      <div className="section-intro">
        <div>
          <span className="eyebrow">STEP 2 · MODEL HYPERPARAMETERS & FITTING</span>
          <h2>XGBoost Model Training & Evaluation</h2>
          <p>
            Tune tree depth, learning rate, and boosting rounds. Train the model and inspect real-time performance metrics.
          </p>
        </div>
      </div>

      {/* Hyperparameter Configuration Panel */}
      <div className="training-panel-grid">
        <div className="hyperparams-card">
          <div className="card-header-styled">
            <h3>Hyperparameter Optimization</h3>
            <span className="param-badge">XGBoost 2.x Engine</span>
          </div>

          <div className="slider-group">
            <div className="slider-header">
              <label>Missing Value Imputation</label>
              <strong>{imputationStrategy.toUpperCase()}</strong>
            </div>
            <div className="imputation-toggle-mini">
              {["median", "mean", "mode", "zero"].map((strat) => (
                <button
                  key={strat}
                  type="button"
                  className={`mini-strat-btn ${imputationStrategy === strat ? "active" : ""}`}
                  onClick={() => setImputationStrategy && setImputationStrategy(strat)}
                >
                  {strat.charAt(0).toUpperCase() + strat.slice(1)}
                </button>
              ))}
            </div>
            <span className="slider-desc">
              {imputationStrategy === "median" && "Fills missing values with column median (resilient to outliers)"}
              {imputationStrategy === "mean" && "Fills missing values with arithmetic mean"}
              {imputationStrategy === "mode" && "Fills missing values with most frequent value"}
              {imputationStrategy === "zero" && "Fills missing values with constant 0.0"}
            </span>
          </div>

          <div className="slider-group">
            <div className="slider-header">
              <label>Number of Estimators (n_estimators)</label>
              <strong>{hyperparams.n_estimators}</strong>
            </div>
            <input
              type="range"
              min="10"
              max="400"
              step="10"
              value={hyperparams.n_estimators}
              onChange={(e) => handleChange("n_estimators", Number(e.target.value))}
            />
            <span className="slider-desc">Total sequential gradient boosted trees in the ensemble</span>
          </div>

          <div className="slider-group">
            <div className="slider-header">
              <label>Maximum Tree Depth (max_depth)</label>
              <strong>{hyperparams.max_depth}</strong>
            </div>
            <input
              type="range"
              min="2"
              max="12"
              step="1"
              value={hyperparams.max_depth}
              onChange={(e) => handleChange("max_depth", Number(e.target.value))}
            />
            <span className="slider-desc">Controls tree depth and maximum feature interaction complexity</span>
          </div>

          <div className="slider-group">
            <div className="slider-header">
              <label>Learning Rate (eta)</label>
              <strong>{hyperparams.learning_rate}</strong>
            </div>
            <input
              type="range"
              min="0.01"
              max="0.4"
              step="0.01"
              value={hyperparams.learning_rate}
              onChange={(e) => handleChange("learning_rate", Number(e.target.value))}
            />
            <span className="slider-desc">Step size shrinkage to prevent overfitting</span>
          </div>

          <div className="slider-group">
            <div className="slider-header">
              <label>Subsample Ratio</label>
              <strong>{hyperparams.subsample}</strong>
            </div>
            <input
              type="range"
              min="0.4"
              max="1.0"
              step="0.05"
              value={hyperparams.subsample}
              onChange={(e) => handleChange("subsample", Number(e.target.value))}
            />
            <span className="slider-desc">Fraction of training rows randomly sampled per round</span>
          </div>

          <div className="slider-group">
            <div className="slider-header">
              <label>Column Sample by Tree (colsample_bytree)</label>
              <strong>{hyperparams.colsample_bytree}</strong>
            </div>
            <input
              type="range"
              min="0.4"
              max="1.0"
              step="0.05"
              value={hyperparams.colsample_bytree}
              onChange={(e) => handleChange("colsample_bytree", Number(e.target.value))}
            />
            <span className="slider-desc">Subsample ratio of columns when constructing each tree</span>
          </div>

          <div className="action-buttons-wrap">
            <button
              className="primary-button train-big-btn"
              onClick={onTrain}
              disabled={training || !file}
            >
              {training ? (
                <>
                  <span className="spinner" /> Fitting Trees ({elapsed}s)...
                </>
              ) : (
                <>⚡ Train XGBoost Model</>
              )}
            </button>
            {!file && <span className="warning-text">Load or select a dataset first</span>}
          </div>
        </div>

        {/* Model State & Summary Card */}
        <div className="model-status-card">
          <div className="card-header-styled">
            <h3>Active Model Pipeline</h3>
            <span className={`status-pill-badge ${result ? "trained" : "idle"}`}>
              {result ? "Trained & Validated" : "Awaiting Training"}
            </span>
          </div>

          <div className="summary-list">
            <div className="summary-item">
              <span>Target Feature:</span>
              <strong>{target || "None Selected"}</strong>
            </div>
            <div className="summary-item">
              <span>Task Formulation:</span>
              <strong style={{ textTransform: "uppercase" }}>{task}</strong>
            </div>
            <div className="summary-item">
              <span>Objective Function:</span>
              <code>
                {task === "regression" ? "reg:squarederror" : "binary:logistic"}
              </code>
            </div>
            <div className="summary-item">
              <span>Train / Test Split:</span>
              <strong>80% Train / 20% Test (Stratified)</strong>
            </div>
            <div className="summary-item">
              <span>Imputation Strategy:</span>
              <strong style={{ color: "#a855f7" }}>
                {result?.imputation?.strategy ? result.imputation.strategy.toUpperCase() : imputationStrategy.toUpperCase()}
              </strong>
            </div>
            {result?.imputation && (
              <div className="summary-item">
                <span>Imputed Null Cells:</span>
                <strong style={{ color: result.imputation.total_nulls > 0 ? "#facc15" : "#4ade80" }}>
                  {result.imputation.total_nulls} missing cells filled
                </strong>
              </div>
            )}
            {result && (
              <>
                <div className="summary-item">
                  <span>Training Duration:</span>
                  <strong>{result.training_time_seconds} seconds</strong>
                </div>
                <div className="summary-item">
                  <span>Training Samples:</span>
                  <strong>{result.train_rows} rows</strong>
                </div>
                <div className="summary-item">
                  <span>Test Samples:</span>
                  <strong>{result.test_rows} rows</strong>
                </div>
                <div className="summary-item">
                  <span>Ensemble Size:</span>
                  <strong>{result.hyperparameters?.n_estimators || 150} trees</strong>
                </div>
              </>
            )}
          </div>

          {result && (
            <div className="quick-nav-box">
              <span className="nav-box-title">Model ready! Jump to visualizations:</span>
              <div className="quick-nav-btns">
                <button className="jump-btn jump-3d" onClick={onOpen3D}>
                  ◈ Open 3D Studio ({result.task})
                </button>
                <button className="jump-btn jump-2d" onClick={onOpen2D}>
                  ▦ Open 2D Visualizations
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Primary Metric Cards Grid */}
      {result && (
        <div className="metrics-section">
          <div className="section-subheading">
            <div>
              <h3>Test Set Performance Metrics</h3>
              <p>Evaluated on the held-out 20% validation split</p>
            </div>
          </div>

          <div className="metrics-grid">
            {task === "regression" ? (
              <>
                <div className="metric-card highlight">
                  <div className="metric-top">
                    <span>COEFFICIENT OF DETERMINATION</span>
                    <b>R²</b>
                  </div>
                  <h2>{(metrics.r2 ?? 0).toFixed(4)}</h2>
                  <p>
                    {metrics.r2 > 0.8
                      ? "Excellent fit explaining >80% variance"
                      : metrics.r2 > 0.5
                      ? "Moderate fit on validation set"
                      : "Low explained variance"}
                  </p>
                </div>

                <div className="metric-card">
                  <div className="metric-top">
                    <span>MEAN ABSOLUTE ERROR</span>
                    <b>MAE</b>
                  </div>
                  <h2>{(metrics.mae ?? 0).toFixed(4)}</h2>
                  <p>Average magnitude of prediction errors in target units</p>
                </div>

                <div className="metric-card">
                  <div className="metric-top">
                    <span>ROOT MEAN SQUARED ERROR</span>
                    <b>RMSE</b>
                  </div>
                  <h2>{(metrics.rmse ?? 0).toFixed(4)}</h2>
                  <p>Square root of mean squared prediction deviations</p>
                </div>

                <div className="metric-card">
                  <div className="metric-top">
                    <span>EXPLAINED VARIANCE</span>
                    <b>EV</b>
                  </div>
                  <h2>{(metrics.explained_variance ?? 0).toFixed(4)}</h2>
                  <p>Proportion of variation explained by tree splits</p>
                </div>
              </>
            ) : (
              <>
                <div className="metric-card highlight">
                  <div className="metric-top">
                    <span>TEST ACCURACY</span>
                    <b>ACC</b>
                  </div>
                  <h2>{((metrics.accuracy ?? 0) * 100).toFixed(2)}%</h2>
                  <p>Overall correct classification rate</p>
                </div>

                <div className="metric-card">
                  <div className="metric-top">
                    <span>PRECISION</span>
                    <b>PREC</b>
                  </div>
                  <h2>{((metrics.precision ?? 0) * 100).toFixed(2)}%</h2>
                  <p>True positive accuracy among positive predictions</p>
                </div>

                <div className="metric-card">
                  <div className="metric-top">
                    <span>RECALL</span>
                    <b>REC</b>
                  </div>
                  <h2>{((metrics.recall ?? 0) * 100).toFixed(2)}%</h2>
                  <p>Proportion of actual positive samples identified</p>
                </div>

                <div className="metric-card">
                  <div className="metric-top">
                    <span>F1 SCORE</span>
                    <b>F1</b>
                  </div>
                  <h2>{(metrics.f1 ?? 0).toFixed(4)}</h2>
                  <p>Harmonic mean of precision and recall</p>
                </div>

                {metrics.roc_auc !== undefined && (
                  <div className="metric-card">
                    <div className="metric-top">
                      <span>AREA UNDER ROC</span>
                      <b>AUC</b>
                    </div>
                    <h2>{(metrics.roc_auc ?? 0).toFixed(4)}</h2>
                    <p>Degree of separability between classes</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
