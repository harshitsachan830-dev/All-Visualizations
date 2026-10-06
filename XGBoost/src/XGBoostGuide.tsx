import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  CircleHelp,
  Database,
  GitBranch,
  Gauge,
  Target,
  Trees,
} from "lucide-react";
import "./App.css";

const trainingSteps = [
  {
    number: "01",
    title: "Start with a simple guess",
    text: "The model begins with a baseline prediction based on the training targets.",
    icon: Target,
  },
  {
    number: "02",
    title: "Find what is still wrong",
    text: "It measures error with a loss function. The next tree learns corrections that reduce that loss.",
    icon: BarChart3,
  },
  {
    number: "03",
    title: "Add a correcting tree",
    text: "A small decision tree learns where to adjust predictions. Its update is scaled by the learning rate.",
    icon: GitBranch,
  },
  {
    number: "04",
    title: "Repeat, then check",
    text: "Trees are added sequentially. Validation data helps decide when more trees stop helping.",
    icon: Trees,
  },
];

const parameters = [
  {
    name: "Learning rate",
    setting: "eta",
    increase: "Each tree makes a bigger correction; learning may be faster but less steady.",
    decrease: "Smaller, gentler updates; usually needs more trees.",
  },
  {
    name: "Number of trees",
    setting: "n_estimators",
    increase: "More correction rounds can improve fit, then add time and risk overfitting.",
    decrease: "Faster training, but too few rounds can leave patterns unexplained.",
  },
  {
    name: "Tree depth",
    setting: "max_depth",
    increase: "Captures more complex interactions; also makes trees easier to overfit.",
    decrease: "Simpler rules and often better generalization; too shallow can underfit.",
  },
  {
    name: "Row sampling",
    setting: "subsample",
    increase: "Each tree sees more training rows; values near 1 are less random.",
    decrease: "Adds randomness that can reduce overfitting; too little can underfit.",
  },
  {
    name: "Feature sampling",
    setting: "colsample_bytree",
    increase: "Each tree can consider more input features.",
    decrease: "Adds variation between trees; too little may hide useful signals.",
  },
  {
    name: "Split conservatism",
    setting: "gamma / min_child_weight",
    increase: "Requires a larger loss improvement or more data weight for a split, producing simpler trees.",
    decrease: "Allows more splits, which can fit subtle patterns or noise.",
  },
  {
    name: "Regularization",
    setting: "reg_alpha / reg_lambda",
    increase: "Penalizes complex leaf weights more; can calm overfitting.",
    decrease: "Allows larger leaf weights; too little can make predictions unstable.",
  },
];

export default function XGBoostGuide({
  onOpenUpload,
}: {
  onOpenUpload: () => void;
}) {
  return (
    <div className="guide-page">
      <section className="panel guide-intro">
        <span className="guide-eyebrow"><BookOpen size={14} /> A friendly model guide</span>
        <h2>XGBoost, one small correction at a time.</h2>
        <p>
          XGBoost (eXtreme Gradient Boosting) is a supervised learning
          algorithm that combines many decision trees trained on labeled
          examples. Each new tree focuses on errors left by earlier trees,
          helping the model make more accurate predictions.
        </p>
        <div className="guide-callout">
          <Trees size={20} />
          <p><strong>Think of it like editing a first draft.</strong> Make a prediction, inspect what is wrong, then add a small correction. XGBoost repeats that process and adds the corrections together.</p>
        </div>
      </section>

      <section className="guide-output-grid" aria-label="Prediction types">
        <article className="panel guide-output-card">
          <span className="guide-flow-icon guide-flow-split"><Target size={17} /></span>
          <div><h3>Classification</h3><p>Predicts a category, such as “churn” or “stay.” The objective turns model scores into probabilities or class labels.</p></div>
        </article>
        <article className="panel guide-output-card">
          <span className="guide-flow-icon guide-flow-leaf"><BarChart3 size={17} /></span>
          <div><h3>Regression</h3><p>Predicts a number, such as a price or monthly cost. Error measures how far predictions are from the true values.</p></div>
        </article>
      </section>

      <section className="guide-section" aria-labelledby="guide-process-heading">
        <div className="guide-section-heading">
          <span>THE LEARNING LOOP</span>
          <h2 id="guide-process-heading">How a boosted model learns</h2>
          <p>Training is sequential: every round builds on the current model.</p>
        </div>
        <div className="guide-steps">
          {trainingSteps.map(({ number, title, text, icon: Icon }) => (
            <article className="panel guide-step" key={number}>
              <div className="guide-step-top"><span>{number}</span><Icon size={18} /></div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="panel guide-reading">
        <div className="guide-section-heading">
          <span>READING A TREE</span>
          <h2>From a feature to a prediction</h2>
          <p>Follow one path from the top of a tree to one of its leaves.</p>
        </div>
        <div className="guide-tree-flow">
          <div><span className="guide-flow-icon guide-flow-split"><GitBranch size={17} /></span><strong>Split</strong><p>Ask a question about one feature, such as “payment delay ≥ 3 days?”</p></div>
          <ArrowRight className="guide-flow-arrow" size={17} />
          <div><span className="guide-flow-icon guide-flow-route"><CircleHelp size={17} /></span><strong>Choose a branch</strong><p>The row follows the yes or no rule based on its feature value.</p></div>
          <ArrowRight className="guide-flow-arrow" size={17} />
          <div><span className="guide-flow-icon guide-flow-leaf"><Check size={17} /></span><strong>Apply a leaf update</strong><p>The leaf adds a score to the model; later trees can adjust it again.</p></div>
        </div>
        <div className="guide-note"><CircleHelp size={15} /><p>A feature is an input column, like tenure or monthly charge. A split is a rule using that feature. A leaf is the tree’s output for rows that reach it.</p></div>
      </section>

      <section className="guide-section" aria-labelledby="guide-parameters-heading">
        <div className="guide-section-heading">
          <span>MODEL CONTROLS</span>
          <h2 id="guide-parameters-heading">What happens when a setting changes?</h2>
          <p>These are tendencies, not guarantees. The best setting depends on your data and should be checked on held-out data.</p>
        </div>
        <div className="guide-parameter-list">
          {parameters.map((parameter) => (
            <article className="panel guide-parameter" key={parameter.setting}>
              <div className="guide-parameter-name"><h3>{parameter.name}</h3><code>{parameter.setting}</code></div>
              <div><span className="guide-direction guide-up">If increased</span><p>{parameter.increase}</p></div>
              <div><span className="guide-direction guide-down">If decreased</span><p>{parameter.decrease}</p></div>
            </article>
          ))}
        </div>
        <div className="guide-note"><CircleHelp size={15} /><p><strong>Overfitting</strong> means the model fits training examples too closely and performs worse on new data. <strong>Underfitting</strong> means it is too simple to learn useful patterns. Use validation results to balance the two.</p></div>
      </section>

      <div className="guide-bottom-grid">
        <section className="panel guide-info-card">
          <div className="guide-section-heading">
            <span>UNDERSTANDING FEATURES</span>
            <h2>What does importance tell me?</h2>
          </div>
          <p>Feature importance summarizes how the fitted trees used the input columns. It can help you explore patterns, but it does not prove that a feature caused an outcome.</p>
          <ul>
            <li><strong>Gain:</strong> how much a feature’s splits improved the training objective.</li>
            <li><strong>Weight:</strong> how often a feature was used in a split.</li>
            <li><strong>Cover:</strong> how many training rows were affected by its splits.</li>
          </ul>
          <div className="guide-note"><CircleHelp size={15} /><p>Correlated features can share importance, and importance is not the same as a causal explanation.</p></div>
        </section>

        <section className="panel guide-info-card">
          <div className="guide-section-heading">
            <span>CHECKING RESULTS</span>
            <h2>How do I know if it is working?</h2>
          </div>
          <p>Compare performance on data the model did not train on. Training scores alone can look excellent even when a model does not generalize.</p>
          <ul>
            <li><strong>Classification:</strong> accuracy is the share of all predictions that are correct; precision is how many predicted positives are correct; recall is how many actual positives are found. F1 balances precision and recall.</li>
            <li><strong>Regression:</strong> MAE is average absolute error; RMSE gives larger errors extra weight; R² compares with a simple baseline and can be negative when the model is worse than that baseline.</li>
          </ul>
          <div className="guide-note"><Database size={15} /><p>Keep a test set untouched until final evaluation. Data leakage—using information unavailable at prediction time—can make scores misleading.</p></div>
        </section>
      </div>

      <div className="guide-note guide-data-note"><Database size={15} /><p><strong>For your CSV:</strong> input columns are features, and the column you choose to predict is the target. Missing feature values can be imputed before training; rows with a missing target cannot teach the model what to predict.</p></div>

      <section className="guide-next-step">
        <div><Gauge size={18} /><span><strong>Ready to try it with your own data?</strong><small>Upload a CSV, choose a target, and inspect the predictions.</small></span></div>
        <button type="button" onClick={onOpenUpload}>Go to CSV upload <ArrowRight size={15} /></button>
      </section>
    </div>
  );
}
