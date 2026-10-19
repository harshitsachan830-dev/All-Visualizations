import { useState } from "react";

export default function TheorySection() {
  const [activeTab, setActiveTab] = useState("hyperparams-matrix");
  const [selectedParam, setSelectedParam] = useState("learning_rate");
  const [direction, setDirection] = useState("increase"); // "increase" | "decrease"
  const [activeVisGroup, setActiveVisGroup] = useState("3d");

  // Comprehensive parameter database detailing increase vs decrease effects
  const paramDatabase = {
    learning_rate: {
      name: "learning_rate (eta)",
      category: "Optimization / Shrinkage",
      defaultVal: "0.05 – 0.1",
      range: "0.001 to 1.0",
      mathSymbol: "η",
      summary: "Scales the contribution of each newly added tree to prevent individual trees from dominating the ensemble.",
      increase: {
        title: "When You INCREASE Learning Rate (e.g. 0.05 → 0.3+)",
        modelEffect: "Each tree's prediction is weighted more heavily. The model converges much faster with fewer iterations.",
        biasVariance: "Reduces Bias quickly, but increases Variance substantially.",
        surfaceVisual: "3D prediction surface develops sharp peaks, steep cliffs, and aggressive stepped plateaus. Loss landscape shows high-frequency fluctuations.",
        overfittingRisk: "HIGH: High risk of memorizing noisy data points and failing to generalize on the test split.",
        speedEffect: "Fast training (needs fewer trees), but narrower margin of error.",
        guidance: "Use higher learning rate for fast prototyping or very large datasets where training hundreds of trees is too slow.",
      },
      decrease: {
        title: "When You DECREASE Learning Rate (e.g. 0.1 → 0.01)",
        modelEffect: "Each tree makes conservative micro-adjustments. Leaves ample room for future trees to correct remaining residuals smoothly.",
        biasVariance: "Reduces Variance; slightly increases Bias if ensemble size is insufficient.",
        surfaceVisual: "3D prediction surface becomes ultra-smooth, continuous, and organic. Gradient contours curve gently without jagged local artifacts.",
        overfittingRisk: "LOW: Much more robust against overfitting and outlier noise.",
        speedEffect: "Requires proportionally more trees (higher n_estimators) to reach optimal convergence.",
        guidance: "The gold standard for production models: pair a lower learning rate (0.01–0.05) with higher n_estimators (200–500) and early stopping.",
      },
    },
    max_depth: {
      name: "max_depth",
      category: "Tree Complexity & Topology",
      defaultVal: "3 – 6",
      range: "2 to 15",
      mathSymbol: "d",
      summary: "Maximum allowable depth of each decision tree, controlling how many consecutive feature splits can occur in any branch.",
      increase: {
        title: "When You INCREASE max_depth (e.g. 4 → 8+)",
        modelEffect: "Enables trees to capture higher-order feature interactions (e.g., interactions among 6+ features simultaneously).",
        biasVariance: "Drastically lowers Bias on training data; dramatically increases Variance.",
        surfaceVisual: "3D surface fractures into intricate geometric spikes, micro-crevasses, and localized 'islands'. Decision boundaries hug individual data clusters.",
        overfittingRisk: "VERY HIGH: High likelihood of memorizing outliers and spurious correlations in the training set.",
        speedEffect: "Memory and computation scale exponentially with depth (O(2ᵈ)). Training slows down significantly.",
        guidance: "Rarely exceed depth 8 in tabular domains. If interactions are critical, consider explicit feature engineering instead.",
      },
      decrease: {
        title: "When You DECREASE max_depth (e.g. 6 → 2 or 3)",
        modelEffect: "Constrains trees to shallow decision stumps. Trees focus strictly on dominant global trends rather than idiosyncratic localized subsets.",
        biasVariance: "Reduces Variance; may increase Bias if the underlying physical phenomenon has complex non-linear interactions.",
        surfaceVisual: "3D surface becomes broader and more planar or piecewise-linear, eliminating micro-ripples and overfitting bumps.",
        overfittingRisk: "MINIMAL: Highly generalized decision boundaries that transfer well to unseen environments.",
        speedEffect: "Extremely fast training and lightweight model artifacts.",
        guidance: "Ideal for noisy datasets, small sample sizes (<1,000 rows), or when high interpretability is required.",
      },
    },
    n_estimators: {
      name: "n_estimators (num_boost_round)",
      category: "Ensemble Architecture",
      defaultVal: "100 – 300",
      range: "10 to 1000+",
      mathSymbol: "T",
      summary: "The total number of sequential boosting rounds and additive decision trees built in the ensemble.",
      increase: {
        title: "When You INCREASE n_estimators (e.g. 50 → 300+)",
        modelEffect: "The model continues fitting increasingly subtle residual errors that previous trees left unexplained.",
        biasVariance: "Monotonically decreases training error. Eventually increases test variance once optimal capacity is exceeded.",
        surfaceVisual: "3D surface refines finer localized contours. In late stages without regularization, tiny overfitting dents appear near individual data points.",
        overfittingRisk: "MODERATE to HIGH: If learning_rate is high, excessive trees will overfit. If paired with low learning rate, benefits accuracy.",
        speedEffect: "Linear increase in training duration and inference latency.",
        guidance: "Monitor test set learning curves! Find the inflection point where validation loss stops declining, or use early stopping rounds.",
      },
      decrease: {
        title: "When You DECREASE n_estimators (e.g. 200 → 30)",
        modelEffect: "Ensemble terminates before capturing the complete multi-feature functional mapping.",
        biasVariance: "High Bias; model is underfit and fails to capture non-linear relationships.",
        surfaceVisual: "3D surface appears overly flat or coarse, failing to track the true topography of target responses.",
        overfittingRisk: "NONE: But results in suboptimal R² or Accuracy scores due to underfitting.",
        speedEffect: "Near-instantaneous training.",
        guidance: "Use low estimators for initial smoke testing, schema validation, and hyperparameter sweep screening.",
      },
    },
    subsample: {
      name: "subsample",
      category: "Stochastic Regularization",
      defaultVal: "0.8 – 1.0",
      range: "0.1 to 1.0",
      mathSymbol: "ρ_row",
      summary: "Fraction of training rows randomly sampled without replacement prior to growing each tree (Stochastic Gradient Boosting).",
      increase: {
        title: "When You INCREASE subsample (e.g. 0.6 → 1.0)",
        modelEffect: "Every tree has access to 100% of the training dataset. Splits are deterministic based on complete empirical statistics.",
        biasVariance: "Lowest Bias for individual trees; slightly higher correlation between consecutive trees.",
        surfaceVisual: "Surface is smooth and fully deterministic. However, outlier rows exert stronger pull on leaf values.",
        overfittingRisk: "MODERATE: Can overfit if outliers or noisy rows are consistently included in every boosting iteration.",
        speedEffect: "Full computation across all rows.",
        guidance: "Use 1.0 when dataset is clean, high quality, and small.",
      },
      decrease: {
        title: "When You DECREASE subsample (e.g. 1.0 → 0.7)",
        modelEffect: "Introduces bagging-style randomness. Consecutive trees observe different subsets of the data, decorrelating the ensemble.",
        biasVariance: "Significantly decreases Variance; slightly increases Bias per tree.",
        surfaceVisual: "Reduces overfitting ripples caused by localized outlier clusters in the 3D response topology.",
        overfittingRisk: "LOW: Strongly protects against overfitting on noisy real-world data.",
        speedEffect: "Faster training per tree because fewer samples are scanned during split evaluations.",
        guidance: "Setting subsample between 0.7 and 0.85 is a standard competitive Kaggle/industry best practice.",
      },
    },
    colsample_bytree: {
      name: "colsample_bytree",
      category: "Feature Subsampling",
      defaultVal: "0.7 – 1.0",
      range: "0.1 to 1.0",
      mathSymbol: "ρ_col",
      summary: "Subsample ratio of feature columns chosen randomly when constructing each individual decision tree.",
      increase: {
        title: "When You INCREASE colsample_bytree (e.g. 0.6 → 1.0)",
        modelEffect: "All features are available for split consideration at every node.",
        biasVariance: "Dominant high-importance features will repeatedly be chosen for root and early splits across all trees.",
        surfaceVisual: "Surface aligns strongly with the top 1 or 2 dominant features, potentially suppressing subtle secondary signals.",
        overfittingRisk: "MODERATE: Strong features dominate while weaker but predictive secondary features get overlooked.",
        speedEffect: "Evaluates all feature columns for split gain at each candidate threshold.",
        guidance: "Use 1.0 if you have fewer than 5 features total.",
      },
      decrease: {
        title: "When You DECREASE colsample_bytree (e.g. 1.0 → 0.7)",
        modelEffect: "Forces some trees to grow without dominant features, allowing secondary and tertiary features to find their own predictive splits.",
        biasVariance: "Decorrelates trees and builds a substantially more diverse ensemble.",
        surfaceVisual: "3D interactions between secondary features become visible and active instead of being overshadowed.",
        overfittingRisk: "LOW: Provides excellent regularization, especially when feature count is moderate to high.",
        speedEffect: "Faster tree construction since fewer feature splits need to be computed.",
        guidance: "Recommended setting: 0.6 – 0.8 for datasets with 8+ features.",
      },
    },
    gamma: {
      name: "gamma (min_split_loss)",
      category: "Pruning Regularization",
      defaultVal: "0 – 0.2",
      range: "0 to 10+",
      mathSymbol: "γ",
      summary: "Minimum loss reduction (gain) required to make a further partition on a leaf node. Serves as pre-pruning threshold.",
      increase: {
        title: "When You INCREASE gamma (e.g. 0 → 2.0+)",
        modelEffect: "Trees stop splitting unless a proposed split produces significant objective reduction.",
        biasVariance: "Increases Bias; strongly prevents Variance and tree complexity.",
        surfaceVisual: "Surfaces become clean and blocky with fewer micro-splits. Small local fluctuations disappear.",
        overfittingRisk: "VERY LOW: Acts as an aggressive pruning mechanism against spurious splits.",
        speedEffect: "Builds smaller, shallower trees with fewer total nodes.",
        guidance: "Increase gamma when trees are over-branching on noise.",
      },
      decrease: {
        title: "When You DECREASE gamma (e.g. 1.0 → 0)",
        modelEffect: "Allows nodes to split even if the gain improvement is minimal.",
        biasVariance: "Lowers Bias; allows trees to expand to full max_depth.",
        surfaceVisual: "Complex fine-grained topological details are preserved.",
        overfittingRisk: "HIGHER: May create splits that capture random noise.",
        speedEffect: "Allows trees to grow to their maximum depth limit.",
        guidance: "Default is 0. Pair with L2 regularization (lambda) if you want smooth continuous shrinkage instead of hard cutoffs.",
      },
    },
    reg_lambda: {
      name: "reg_lambda (L2 Regularization)",
      category: "Weight Shrinkage",
      defaultVal: "1.0",
      range: "0 to 100+",
      mathSymbol: "λ",
      summary: "L2 regularization term on leaf weights. Directly penalizes extreme leaf values in the optimal weight formula: $w_j^* = -G_j / (H_j + \\lambda)$.",
      increase: {
        title: "When You INCREASE reg_lambda (e.g. 1.0 → 10.0+)",
        modelEffect: "Forces all leaf output weights closer to zero. Prevents extreme, wild predictions in low-density feature space.",
        biasVariance: "Smoothes prediction outputs; shrinks confidence extremes.",
        surfaceVisual: "3D prediction surface dampens vertical amplitude. Peaks and troughs flatten towards the global baseline.",
        overfittingRisk: "VERY LOW: Primary defense against extreme predictions and numerical instability.",
        speedEffect: "Negligible computational impact.",
        guidance: "Increase lambda when 3D residual surface shows extreme localized spikes or when test error blows up on edge cases.",
      },
      decrease: {
        title: "When You DECREASE reg_lambda (e.g. 1.0 → 0.01)",
        modelEffect: "Leaves are allowed to take on large, unconstrained numerical weights.",
        biasVariance: "Enables aggressive fitting of target magnitudes; risk of high variance.",
        surfaceVisual: "Surface features dramatic elevation changes and steep gradients.",
        overfittingRisk: "HIGH: Outliers in small leaves can produce unbounded predictions.",
        speedEffect: "No change.",
        guidance: "Keep ≥ 1.0 unless predicting unscaled targets with very small loss scales.",
      },
    },
    min_child_weight: {
      name: "min_child_weight",
      category: "Sample Weight Floor",
      defaultVal: "1",
      range: "1 to 20+",
      mathSymbol: "H_min",
      summary: "Minimum sum of instance Hessian (second derivative) weights needed in a child leaf node to permit further splitting.",
      increase: {
        title: "When You INCREASE min_child_weight (e.g. 1 → 5+)",
        modelEffect: "Prevents trees from creating leaves that isolate only a tiny handful of training samples.",
        biasVariance: "Increases Bias; strongly guards against sample-specific overfitting.",
        surfaceVisual: "Eliminates needle-like single-point spikes in the 3D scatter and prediction mesh.",
        overfittingRisk: "VERY LOW: Direct constraint against overfitting to isolated rare rows.",
        speedEffect: "Prunes unnecessary terminal nodes early.",
        guidance: "Essential for noisy data. Set to 3–10 for datasets with >1,000 rows.",
      },
      decrease: {
        title: "When You DECREASE min_child_weight (e.g. 5 → 1)",
        modelEffect: "Allows leaves containing very few samples or even single observations.",
        biasVariance: "Maximizes sensitivity to rare subgroups.",
        surfaceVisual: "Captures minute localized phenomena, but risks creating sharp spikes for outliers.",
        overfittingRisk: "HIGH if data has noise or labeling errors.",
        speedEffect: "Allows deeper, more granular tree construction.",
        guidance: "Use 1 when rare anomaly detection is the primary goal.",
      },
    },
  };

  // Detailed guide for all 12 3D visualizations
  const visualizers3D = [
    {
      id: "surface",
      name: "3D Prediction Surface & Response Landscape",
      icon: "◈",
      purpose: "Visualizes the model's non-linear regression or probability landscape across any two continuous features while holding other features at baseline.",
      howToRead: "Look for curvature, steep cliffs (high sensitivity regions), and flat plateaus (feature saturation). Gentle continuous slopes indicate well-regularized models.",
      anomalyCheck: "Sharp needle spikes indicate overfitting to localized data clusters; flat planes indicate weak feature influence.",
    },
    {
      id: "actual_pred",
      name: "3D Actual vs Predicted Spatial Deviation",
      icon: "⤢",
      purpose: "Renders true actual target values (Z) vs model predictions (Y) alongside a primary feature (X), with a 45° ideal parity diagonal.",
      howToRead: "Points clustering tightly along the 45-degree diagonal indicate high accuracy. Color encoding shows residual error magnitude.",
      anomalyCheck: "Asymmetric fan-out patterns indicate heteroscedasticity (error variance growing with target magnitude).",
    },
    {
      id: "importance",
      name: "3D Multi-Metric Feature Importance Cylinder",
      icon: "▥",
      purpose: "Combines Gain (accuracy improvement), Weight/Frequency (split count), and Cover (sample representation) into a 3D cylindrical coordinate view.",
      howToRead: "Features high in all 3 metrics are the dominant global drivers of the model. High frequency but low gain indicates secondary splitter features.",
      anomalyCheck: "A single towering bar means the model is dangerously over-reliant on one feature.",
    },
    {
      id: "shap_summary",
      name: "3D SHAP Spatial Beeswarm Distribution",
      icon: "◉",
      purpose: "Attribution cloud mapping each feature's SHAP impact value (X), raw feature magnitude (Z), and feature ranking (Y).",
      howToRead: "Points to the right increase the prediction; points to the left decrease it. Color gradients show whether high or low values drive the effect.",
      anomalyCheck: "Non-monotonic color transitions indicate non-linear threshold effects or complex interaction splits.",
    },
    {
      id: "shap_dep",
      name: "3D SHAP Dependence & Interaction Topology",
      icon: "✣",
      purpose: "Visualizes how the SHAP contribution of Feature A changes across values of Feature B in true 3D spatial coordinates.",
      howToRead: "Vertical spread in SHAP values at a fixed X value reveals strong interaction effects governed by the secondary feature Z.",
      anomalyCheck: "Flat horizontal lines mean zero interaction; curved saddles indicate multiplicative cross-feature synergy.",
    },
    {
      id: "pdp",
      name: "3D Partial Dependence Dual-Feature Surface",
      icon: "⌘",
      purpose: "Computes marginal expectation of model predictions across a 2D feature grid, averaging out all other dataset features.",
      howToRead: "Shows pure marginal relationships free from sample correlation noise. Ideal for policy planning and sensitivity testing.",
      anomalyCheck: "Look for non-additive surfaces (curved twists in the plane) which prove non-linear feature interactions exist.",
    },
    {
      id: "residual_surf",
      name: "3D Residual Error Surface Landscape",
      icon: "◎",
      purpose: "Projects residuals (Actual - Predicted) over two primary features to uncover spatial systematic bias.",
      howToRead: "An ideal model shows random scatter centered around Z = 0. Distinct peaks or valleys reveal sub-populations where the model systematically under- or over-estimates.",
      anomalyCheck: "Systematic waves or domes prove that the model is missing key polynomial interaction terms.",
    },
    {
      id: "learning_curve",
      name: "3D Boosting Iteration Convergence Ribbon",
      icon: "⌁",
      purpose: "Tracks training vs validation error trajectories across every sequential boosting round.",
      howToRead: "Training error drops monotonically. The optimal ensemble size is the minimum of the validation loss trajectory.",
      anomalyCheck: "A widening gap between train and test ribbons signals the onset of overfitting.",
    },
    {
      id: "tree",
      name: "3D Ensemble Decision Tree Topology",
      icon: "⎇",
      purpose: "Constructs a spatial hierarchical node graph of individual boosted trees with split thresholds, gains, and leaf weights.",
      howToRead: "Roots sit at the top; branches split left (True) and right (False). Node colors indicate gradient magnitude.",
      anomalyCheck: "Excessively deep unbranched twigs indicate dead nodes that can be pruned with higher gamma.",
    },
    {
      id: "interaction",
      name: "3D Pairwise SHAP Interaction Matrix",
      icon: "☵",
      purpose: "Quantifies the mathematical interaction energy between all unique feature pairs in a 3D bar matrix.",
      howToRead: "Tall bars identify feature pairs that multiply or suppress each other's effects inside tree splits.",
      anomalyCheck: "Identifies hidden feature synergies that linear models (like Ridge or Lasso) completely miss.",
    },
    {
      id: "error_dist",
      name: "3D Residual Density & Error Distribution Mesh",
      icon: "▤",
      purpose: "Generates a 3D elevation mesh of residual density across the feature plane.",
      howToRead: "High density mounds show where errors are concentrated. Normal distribution around zero indicates well-specified variance.",
      anomalyCheck: "Heavy right or left tails reveal asymmetric prediction risk (e.g., underpredicting high loans).",
    },
    {
      id: "roc_surface",
      name: "3D ROC & Threshold Probability Manifold",
      icon: "↗",
      purpose: "Classification topology plotting False Positive Rate (X), True Positive Rate (Y), and Decision Threshold (Z).",
      howToRead: "Allows dynamic spatial inspection of the optimal classification cutoff for custom precision-recall tradeoffs.",
      anomalyCheck: "Steep drop-offs indicate poor probability calibration near critical decision thresholds.",
    },
  ];

  // 16 2D Visualizations list
  const visualizers2D = [
    { title: "Residuals vs Predicted", tab: "Model Performance", desc: "Checks homoscedasticity and zero-mean error assumptions." },
    { title: "Quantile-Quantile (Q-Q) Plot", tab: "Model Performance", desc: "Compares residual distribution against theoretical normal quantiles." },
    { title: "Actual vs Predicted Scatter", tab: "Model Performance", desc: "Evaluates fit tightness along the ideal 45-degree identity reference line." },
    { title: "Cumulative Gain & Lift Chart", tab: "Model Performance", desc: "Measures ranking effectiveness compared to random selection." },
    { title: "Feature Importance: Gain Ranking", tab: "Feature Analysis", desc: "Ranks features by total fractional loss reduction contributed across all trees." },
    { title: "Feature Importance: Split Frequency", tab: "Feature Analysis", desc: "Ranks features by the raw count of times chosen as a split criterion." },
    { title: "Feature Importance: Cover (Sample Weight)", tab: "Feature Analysis", desc: "Measures average number of observations affected by splits on each feature." },
    { title: "SHAP Beeswarm Summary Plot", tab: "Feature Analysis", desc: "Combines feature magnitude and directional attribution for all validation rows." },
    { title: "1D Partial Dependence Curves", tab: "Feature Analysis", desc: "Isolates the isolated marginal effect of single continuous features." },
    { title: "SHAP Pairwise Interaction Heatmap", tab: "Feature Analysis", desc: "Pairwise matrix detailing second-order interaction strengths." },
    { title: "Tree Depth & Node Distribution", tab: "Tree Diagnostics", desc: "Inspects leaf counts, maximum depths, and structural balance." },
    { title: "Leaf Value Distribution Histogram", tab: "Tree Diagnostics", desc: "Verifies that leaf weights remain well-regularized without extreme outliers." },
    { title: "Sequential Boosting Loss Trajectory", tab: "Tree Diagnostics", desc: "Train vs Test loss decline across boosting rounds." },
    { title: "ROC & Precision-Recall Curves", tab: "Tree Diagnostics", desc: "Classification diagnostic curves with AUC scores and optimal operating cutoffs." },
    { title: "Correlation Heatmap Matrix", tab: "Data Distributions", desc: "Identifies multicollinearity between raw input features." },
    { title: "Feature Value Distributions by Target", tab: "Data Distributions", desc: "Kernel density plots of features split by target bins or classes." },
  ];

  const currentParam = paramDatabase[selectedParam];

  return (
    <div className="section-container theory-studio-container">
      {/* Section Header */}
      <div className="section-intro">
        <div>
          <span className="eyebrow">STEP 9 · MASTERCLASS & KNOWLEDGE BASE</span>
          <h2>XGBoost Architecture, Hyperparameter Dynamics & Visualization Guide</h2>
          <p>
            An in-depth theoretical and practical compendium. Understand exactly how Gradient Boosted Trees work under the hood, how adjusting hyperparameters impacts accuracy and surfaces, and how to interpret every 2D & 3D chart.
          </p>
        </div>
      </div>

      {/* Main Subtabs Navigation */}
      <div className="studio-subtabs-bar">
        <button
          className={`studio-subtab-btn ${activeTab === "hyperparams-matrix" ? "active" : ""}`}
          onClick={() => setActiveTab("hyperparams-matrix")}
        >
          <span className="btn-icon">⚡</span>
          <span className="btn-text">Hyperparameter Dynamics Matrix</span>
        </button>
        <button
          className={`studio-subtab-btn ${activeTab === "core-mechanics" ? "active" : ""}`}
          onClick={() => setActiveTab("core-mechanics")}
        >
          <span className="btn-icon">∑</span>
          <span className="btn-text">Mathematical Foundations</span>
        </button>
        <button
          className={`studio-subtab-btn ${activeTab === "visualizations-guide" ? "active" : ""}`}
          onClick={() => setActiveTab("visualizations-guide")}
        >
          <span className="btn-icon">◈</span>
          <span className="btn-text">3D & 2D Visualizations Guide</span>
        </button>
        <button
          className={`studio-subtab-btn ${activeTab === "imputation-guide" ? "active" : ""}`}
          onClick={() => setActiveTab("imputation-guide")}
        >
          <span className="btn-icon">⚙</span>
          <span className="btn-text">Null Imputation Strategies</span>
        </button>
        <button
          className={`studio-subtab-btn ${activeTab === "cheat-sheet" ? "active" : ""}`}
          onClick={() => setActiveTab("cheat-sheet")}
        >
          <span className="btn-icon">📋</span>
          <span className="btn-text">Code Recipes & Best Practices</span>
        </button>
      </div>

      {/* TAB 1: Hyperparameter Dynamics Matrix (Increase vs Decrease) */}
      {activeTab === "hyperparams-matrix" && (
        <div className="theory-block-workbench">
          <div className="workbench-header">
            <div>
              <h3>Interactive Hyperparameter Sensitivity Simulator</h3>
              <p className="chart-purpose">
                Select any XGBoost hyperparameter below and toggle between <strong>[ ▲ Increase ]</strong> and <strong>[ ▼ Decrease ]</strong> to see exactly what happens mathematically, visually on 3D surfaces, and in terms of overfitting risk.
              </p>
            </div>
          </div>

          {/* Parameter Picker Badges */}
          <div className="param-pills-selector">
            {Object.keys(paramDatabase).map((key) => {
              const p = paramDatabase[key];
              return (
                <button
                  key={key}
                  className={`param-pill-btn ${selectedParam === key ? "active" : ""}`}
                  onClick={() => setSelectedParam(key)}
                >
                  <span className="param-symbol">{p.mathSymbol}</span>
                  <span className="param-title">{p.name}</span>
                </button>
              );
            })}
          </div>

          {/* Active Parameter Detail Card */}
          {currentParam && (
            <div className="interactive-param-card">
              <div className="param-card-header">
                <div>
                  <div className="param-meta-tags">
                    <span className="param-category-tag">{currentParam.category}</span>
                    <span className="param-range-tag">Range: {currentParam.range}</span>
                    <span className="param-default-tag">Typical: {currentParam.defaultVal}</span>
                  </div>
                  <h2>{currentParam.name}</h2>
                  <p className="param-summary-text">{currentParam.summary}</p>
                </div>

                {/* Direction Toggle Switch */}
                <div className="direction-toggle-box">
                  <span className="direction-label">Simulate Change:</span>
                  <div className="direction-btn-group">
                    <button
                      className={`dir-btn increase ${direction === "increase" ? "active" : ""}`}
                      onClick={() => setDirection("increase")}
                    >
                      ▲ When You INCREASE
                    </button>
                    <button
                      className={`dir-btn decrease ${direction === "decrease" ? "active" : ""}`}
                      onClick={() => setDirection("decrease")}
                    >
                      ▼ When You DECREASE
                    </button>
                  </div>
                </div>
              </div>

              {/* Dynamic Impact Breakdown Grid */}
              <div className="dynamics-impact-grid">
                {(() => {
                  const state = direction === "increase" ? currentParam.increase : currentParam.decrease;
                  const isIncrease = direction === "increase";

                  return (
                    <>
                      <div className="impact-card highlight-card">
                        <div className="impact-icon">{isIncrease ? "📈" : "📉"}</div>
                        <h4>Core Model Behavior</h4>
                        <p>{state.modelEffect}</p>
                      </div>

                      <div className="impact-card">
                        <div className="impact-icon">⚖️</div>
                        <h4>Bias vs. Variance Tradeoff</h4>
                        <p>{state.biasVariance}</p>
                      </div>

                      <div className="impact-card surface-card">
                        <div className="impact-icon">◈</div>
                        <h4>Visual Impact on 3D Prediction Surface</h4>
                        <p>{state.surfaceVisual}</p>
                      </div>

                      <div className="impact-card risk-card">
                        <div className="impact-icon">⚠️</div>
                        <h4>Overfitting / Underfitting Risk</h4>
                        <p>{state.overfittingRisk}</p>
                      </div>

                      <div className="impact-card speed-card">
                        <div className="impact-icon">⏱️</div>
                        <h4>Training Speed & Computation</h4>
                        <p>{state.speedEffect}</p>
                      </div>

                      <div className="impact-card recommendation-card">
                        <div className="impact-icon">💡</div>
                        <h4>Expert Practical Guidance</h4>
                        <p>{state.guidance}</p>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Quick Comparison Master Table */}
          <div className="theory-table-section">
            <div className="table-card-header">
              <h3>Comprehensive Hyperparameter Tuning Cheat Sheet</h3>
              <span>At-a-glance reference for all critical parameters</span>
            </div>
            <div className="table-responsive-wrapper">
              <table className="custom-data-table theory-table">
                <thead>
                  <tr>
                    <th>Parameter</th>
                    <th>Default</th>
                    <th>What INCREASING Does</th>
                    <th>What DECREASING Does</th>
                    <th>Visual 3D Surface Effect</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>learning_rate</code> (eta)</td>
                    <td>0.05 – 0.1</td>
                    <td>Faster convergence, higher risk of jagged overfitting</td>
                    <td>Smoother gradient descent, needs more trees (T)</td>
                    <td>High → sharp spikes; Low → organic, smooth curves</td>
                  </tr>
                  <tr>
                    <td><code>max_depth</code></td>
                    <td>4 – 6</td>
                    <td>Captures high-order feature interactions, high variance</td>
                    <td>Simpler additive trees, forces global trend fitting</td>
                    <td>High → micro-islands & cliffs; Low → gentle contours</td>
                  </tr>
                  <tr>
                    <td><code>n_estimators</code></td>
                    <td>100 – 300</td>
                    <td>Fits subtle residuals, eventual overfitting if learning rate is high</td>
                    <td>Underfitting; fails to capture non-linear relationships</td>
                    <td>High → fine detail; Low → coarse flat topology</td>
                  </tr>
                  <tr>
                    <td><code>subsample</code></td>
                    <td>0.8 – 1.0</td>
                    <td>Deterministic splits using 100% of rows, sensitive to outliers</td>
                    <td>Stochastic regularization, decorrelates trees</td>
                    <td>Low → dampens noise ripples caused by sample anomalies</td>
                  </tr>
                  <tr>
                    <td><code>colsample_bytree</code></td>
                    <td>0.7 – 0.9</td>
                    <td>Dominant features chosen repeatedly at root splits</td>
                    <td>Forces trees to explore secondary/tertiary features</td>
                    <td>Low → exposes subtle multi-feature 3D interactions</td>
                  </tr>
                  <tr>
                    <td><code>gamma</code> (min_loss)</td>
                    <td>0 – 0.2</td>
                    <td>Aggressively prunes splits with low gain improvement</td>
                    <td>Allows trees to grow to full depth without pruning</td>
                    <td>High → broader piecewise terraces, fewer micro-cuts</td>
                  </tr>
                  <tr>
                    <td><code>reg_lambda</code> (L2)</td>
                    <td>1.0</td>
                    <td>Shrinks leaf weights towards zero, suppresses wild extremes</td>
                    <td>Allows unbounded leaf values, fits sharp spikes</td>
                    <td>High → pulls extreme peaks/valleys towards global mean</td>
                  </tr>
                  <tr>
                    <td><code>min_child_weight</code></td>
                    <td>1 – 5</td>
                    <td>Stops splitting if leaf has too few samples/Hessian</td>
                    <td>Permits single-sample leaves, fits isolated outliers</td>
                    <td>High → eliminates single-point needle spikes</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Mathematical Foundations */}
      {activeTab === "core-mechanics" && (
        <div className="theory-block-workbench">
          <div className="math-explainer-grid">
            <div className="math-concept-card">
              <span className="concept-step">FOUNDATION 1</span>
              <h3>Additive Ensembling Principle</h3>
              <p>
                XGBoost does not train trees independently like Random Forests (which use bagging). Instead, it uses <strong>boosting</strong>: each new tree <em>f_t(x)</em> is trained to predict the <em>residual error</em> or negative gradient of the existing ensemble <em>ŷᵢ⁽ᵗ⁻¹⁾</em>:
              </p>
              <div className="formula-box">
                <code>
                  {"ŷᵢ⁽ᵗ⁾ = ŷᵢ⁽ᵗ⁻¹⁾ + η · f_t(xᵢ) = ∑ₖ₌₁ᵗ η · fₖ(xᵢ)"}
                </code>
              </div>
              <p>
                Where <strong>η (eta)</strong> is the learning rate (shrinkage factor) that scales each tree's update to guarantee numerical stability.
              </p>
            </div>

            <div className="math-concept-card">
              <span className="concept-step">FOUNDATION 2</span>
              <h3>The Regularized Objective Function</h3>
              <p>
                Unlike standard gradient boosting implementations that minimize only loss, XGBoost adds an explicit model complexity regularization penalty <strong>Ω(f)</strong>:
              </p>
              <div className="formula-box">
                <code>
                  {"ℒ⁽ᵗ⁾ = ∑ᵢ₌₁ⁿ l(yᵢ, ŷᵢ⁽ᵗ⁻¹⁾ + f_t(xᵢ)) + Ω(f_t)"}
                </code>
              </div>
              <p>The complexity penalty explicitly penalizes tree depth (number of leaves <em>T</em>) and leaf weight magnitude:</p>
              <div className="formula-box">
                <code>
                  {"Ω(f) = γ·T + ½ λ ∑ⱼ₌₁ᵀ wⱼ² + α ∑ⱼ₌₁ᵀ |wⱼ|"}
                </code>
              </div>
            </div>

            <div className="math-concept-card full-span">
              <span className="concept-step">FOUNDATION 3</span>
              <h3>Second-Order Taylor Approximation (Why XGBoost is So Fast)</h3>
              <p>
                Traditional gradient boosting computes only the first derivative (gradient <em>gᵢ</em>). XGBoost expands the loss function using a <strong>2nd-order Taylor series</strong>, capturing both the slope (direction) and the curvature (Hessian <em>hᵢ</em>):
              </p>
              <div className="formula-box large-formula">
                <code>
                  {"ℒ⁽ᵗ⁾ ≈ ∑ᵢ₌₁ⁿ [ gᵢ f_t(xᵢ) + ½ hᵢ f_t²(xᵢ) ] + γ·T + ½ λ ∑ⱼ₌₁ᵀ wⱼ²"}
                </code>
              </div>
              <div className="gradient-definition-grid">
                <div className="gradient-item">
                  <strong>First Order Gradient (gᵢ):</strong>
                  <code>gᵢ = ∂ l(yᵢ, ŷ) / ∂ ŷ</code>
                  <span>Indicates the direction and magnitude of the error step.</span>
                </div>
                <div className="gradient-item">
                  <strong>Second Order Hessian (hᵢ):</strong>
                  <code>hᵢ = ∂² l(yᵢ, ŷ) / ∂ ŷ²</code>
                  <span>Indicates curvature/confidence (for squared error loss, hᵢ = 1).</span>
                </div>
              </div>
            </div>

            <div className="math-concept-card">
              <span className="concept-step">FOUNDATION 4</span>
              <h3>Optimal Leaf Weights Formulation</h3>
              <p>
                Setting the partial derivative ∂ℒ / ∂wⱼ = 0, XGBoost solves in closed form for the exact optimal prediction weight wⱼ* for any leaf node j:
              </p>
              <div className="formula-box">
                <code>
                  {"wⱼ* = - ( ∑_{i ∈ Iⱼ} gᵢ ) / ( ∑_{i ∈ Iⱼ} hᵢ + λ ) = - Gⱼ / (Hⱼ + λ)"}
                </code>
              </div>
              <p>
                Where <strong>Gⱼ</strong> is the sum of gradients in leaf <em>j</em>, <strong>Hⱼ</strong> is the sum of Hessians, and <strong>λ</strong> acts as an L2 regularizer damping large weights.
              </p>
            </div>

            <div className="math-concept-card">
              <span className="concept-step">FOUNDATION 5</span>
              <h3>Split Finding Quality Score (Gain)</h3>
              <p>
                To decide whether to split a leaf into left and right children, XGBoost calculates the exact loss reduction (Gain):
              </p>
              <div className="formula-box">
                <code>
                  {"Gain = ½ [ G_L²/(H_L + λ) + G_R²/(H_R + λ) - (G_L + G_R)²/(H_L + H_R + λ) ] - γ"}
                </code>
              </div>
              <p>
                If <strong>Gain ≤ 0</strong>, the split is not made. This is why <strong>γ (gamma)</strong> serves as automatic pre-pruning.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Visualizations Guide */}
      {activeTab === "visualizations-guide" && (
        <div className="theory-block-workbench">
          <div className="workbench-header">
            <div>
              <h3>Visual Analytics Interpretation Guide</h3>
              <p className="chart-purpose">
                ModelMind implements all 12 3D spatial visualizers and 16 2D diagnostic plots from the specification. Learn how to extract actionable debugging insights from each topology.
              </p>
            </div>
            <div className="vis-group-toggle">
              <button
                className={`task-btn ${activeVisGroup === "3d" ? "active" : ""}`}
                onClick={() => setActiveVisGroup("3d")}
              >
                ◈ 12 Spatial 3D Topologies
              </button>
              <button
                className={`task-btn ${activeVisGroup === "2d" ? "active" : ""}`}
                onClick={() => setActiveVisGroup("2d")}
              >
                ▦ 16 Diagnostic 2D Charts
              </button>
            </div>
          </div>

          {activeVisGroup === "3d" && (
            <div className="visualizers-3d-grid">
              {visualizers3D.map((vis, idx) => (
                <div key={vis.id} className="vis-card">
                  <div className="vis-card-top">
                    <span className="vis-num">3D.{idx + 1}</span>
                    <span className="vis-icon">{vis.icon}</span>
                  </div>
                  <h4>{vis.name}</h4>
                  <p className="vis-purpose">{vis.purpose}</p>

                  <div className="vis-callout read-callout">
                    <strong>How to Read:</strong> {vis.howToRead}
                  </div>
                  <div className="vis-callout anomaly-callout">
                    <strong>Anomaly Check:</strong> {vis.anomalyCheck}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeVisGroup === "2d" && (
            <div className="visualizers-2d-grid-display">
              {visualizers2D.map((vis, idx) => (
                <div key={idx} className="vis-2d-card">
                  <div className="vis-2d-header">
                    <span className="vis-2d-tag">{vis.tab}</span>
                    <span className="vis-2d-idx">2D.{idx + 1}</span>
                  </div>
                  <h4>{vis.title}</h4>
                  <p>{vis.desc}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Imputation & Sparsity Guide */}
      {activeTab === "imputation-guide" && (
        <div className="theory-block-workbench">
          <div className="workbench-header">
            <div>
              <h3>Missing Value Imputation Strategies in Tabular Machine Learning</h3>
              <p className="chart-purpose">
                How different imputation strategies work, when to apply them, and how XGBoost's native sparsity-aware split algorithm handles missing entries.
              </p>
            </div>
          </div>

          <div className="imputation-strategies-grid">
            <div className="impute-card">
              <div className="impute-badge median">MEDIAN (RECOMMENDED FOR NUMERIC)</div>
              <h4>Median Imputation (50th Percentile)</h4>
              <p>
                Replaces missing cells in each numeric column with the middle value of the sorted non-null data.
              </p>
              <ul>
                <li><strong>Robust against Outliers:</strong> Unlike the mean, extreme values (e.g. billion-dollar incomes) do not skew the median.</li>
                <li><strong>Preserves Scale:</strong> Keeps the imputed points right in the realistic center of the feature space.</li>
                <li><strong>Best For:</strong> Financial data, incomes, debt-to-income ratios, house prices.</li>
              </ul>
            </div>

            <div className="impute-card">
              <div className="impute-badge mean">MEAN (ARITHMETIC AVERAGE)</div>
              <h4>Mean Imputation (Arithmetic Average)</h4>
              <p>
                Fills missing values with the sum of all observed values divided by sample count: μ = (1/N) ∑ x_i.
              </p>
              <ul>
                <li><strong>Zero Bias on Expected Value:</strong> Leaves the overall column mean unchanged.</li>
                <li><strong>Vulnerability:</strong> Highly sensitive to long tails and extreme outliers.</li>
                <li><strong>Best For:</strong> Uniformly or normally distributed physical measurements (e.g. age, temperature, dimensions).</li>
              </ul>
            </div>

            <div className="impute-card">
              <div className="impute-badge mode">MODE (MOST FREQUENT VALUE)</div>
              <h4>Mode Imputation (Highest Frequency)</h4>
              <p>
                Fills missing cells with the most frequently observed category or discrete numeric value in the column.
              </p>
              <ul>
                <li><strong>Natural for Categorical:</strong> The only direct statistical central tendency metric applicable to strings/categories.</li>
                <li><strong>Discrete Preservation:</strong> Guarantees that the imputed value is an actual realistic value that exists in the dataset.</li>
                <li><strong>Best For:</strong> Existing loan counts, ratings, credit tiers, payment flags.</li>
              </ul>
            </div>

            <div className="impute-card">
              <div className="impute-badge zero">ZERO (CONSTANT 0.0)</div>
              <h4>Zero Fill Constant (0.0)</h4>
              <p>
                Explicitly replaces NaN with numeric 0.0, treating missingness as absence.
              </p>
              <ul>
                <li><strong>Semantic Meaning:</strong> Useful when null implies non-occurrence (e.g. missing 'existing_loans' = 0 loans).</li>
                <li><strong>Caution:</strong> Can distort columns where zero is a valid distinct measurement (e.g. temperature or credit score).</li>
                <li><strong>Best For:</strong> Count columns, penalties, historical incidents.</li>
              </ul>
            </div>
          </div>

          <div className="native-sparsity-banner">
            <div className="sparsity-icon">⚡</div>
            <div className="sparsity-content">
              <h4>XGBoost Native Sparsity-Aware Split Finding (Sparsity Path)</h4>
              <p>
                In addition to pre-imputing in ModelMind, XGBoost has a built-in <strong>Default Direction</strong> mechanism. When a feature has missing values during training, XGBoost evaluates split gain by routing all missing instances to the left child, then to the right child. It automatically picks whichever direction yields the highest split gain! At inference time, any future missing value in that feature automatically follows that learned optimal default branch.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Code Recipes & Production Cheatsheet */}
      {activeTab === "cheat-sheet" && (
        <div className="theory-block-workbench">
          <div className="workbench-header">
            <div>
              <h3>Production XGBoost Code Recipes & Diagnostics</h3>
              <p className="chart-purpose">
                Copy-pasteable Python code snippets implementing early stopping, SHAP tree explainers, dynamic surface extraction, and hyperparameter tuning.
              </p>
            </div>
          </div>

          <div className="code-snippets-stack">
            <div className="code-snippet-card">
              <div className="code-card-header">
                <strong>1. Production Regression Pipeline with Imputation & Early Stopping</strong>
                <span className="lang-tag">Python 3 / XGBoost 2.x</span>
              </div>
              <pre className="code-block">
{`import xgboost as xgb
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_squared_error

# 1. Ingest dataset and handle missing values
df = pd.read_csv("loan_repayment_data.csv")
X = df.drop(columns=["repayment_capacity"])
y = df["repayment_capacity"]

# Impute numeric features with median (ModelMind strategy)
X = X.fillna(X.median(numeric_only=True)).fillna(0.0)
X = pd.get_dummies(X, drop_first=False, dtype=float)

# 2. Train/Test split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# 3. Configure XGBoost Regressor with optimal regularization
model = xgb.XGBRegressor(
    n_estimators=300,
    max_depth=5,
    learning_rate=0.03,        # Conservative shrinkage
    subsample=0.8,             # Row bagging
    colsample_bytree=0.8,      # Column subsampling
    reg_lambda=1.5,            # L2 weight shrinkage
    gamma=0.1,                 # Pre-pruning threshold
    early_stopping_rounds=20,  # Stops when validation error plateaus
    eval_metric="rmse",
    random_state=42,
    n_jobs=-1
)

# 4. Fit model with validation monitoring
model.fit(
    X_train, y_train,
    eval_set=[(X_train, y_train), (X_test, y_test)],
    verbose=False
)

# 5. Evaluate held-out generalization
preds = model.predict(X_test)
print(f"R2 Score: {r2_score(y_test, preds):.4f}")
print(f"RMSE:     {mean_squared_error(y_test, preds, squared=False):.2f}")`}
              </pre>
            </div>

            <div className="code-snippet-card">
              <div className="code-card-header">
                <strong>2. Extracting 3D Prediction Surface Mesh Coordinates in Python</strong>
                <span className="lang-tag">NumPy & Meshgrid</span>
              </div>
              <pre className="code-block">
{`import numpy as np

def generate_3d_surface(model, X_train, feat_x, feat_y, grid_size=35):
    # Compute feature ranges
    x_min, x_max = X_train[feat_x].min(), X_train[feat_x].max()
    y_min, y_max = X_train[feat_y].min(), X_train[feat_y].max()

    gx = np.linspace(x_min, x_max, grid_size)
    gy = np.linspace(y_min, y_max, grid_size)
    grid_x, grid_y = np.meshgrid(gx, gy)

    # Fix all other features at baseline median
    baseline = X_train.median(numeric_only=True).to_dict()
    eval_df = pd.DataFrame([baseline] * (grid_size * grid_size))
    eval_df[feat_x] = grid_x.ravel()
    eval_df[feat_y] = grid_y.ravel()

    # Predict Z surface
    grid_z = model.predict(eval_df).reshape(grid_size, grid_size)
    return gx, gy, grid_z`}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
