import {
  ArrowDown, ArrowRight, BarChart3, BookOpen, Braces, CircleHelp,
  Database, GitBranch, Layers3, Lightbulb, SlidersHorizontal, Sparkles, Trees,
} from 'lucide-react'
import './GradientBoostingLab.css'

const experimentFeatures = [
  { icon: GitBranch, title: 'Boosting Rounds', detail: 'Play, pause, step through, or scrub cached stages. The active round synchronizes metrics, residuals, tree details, and the boundary.' },
  { icon: BarChart3, title: 'Training Progress', detail: 'Compare training and validation loss and score by round to see learning progress and spot a widening generalization gap.' },
  { icon: Layers3, title: 'Decision Boundary', detail: 'Explore model response over the first two numeric features. Selectable validation points link back to sample views.' },
  { icon: BarChart3, title: 'Residual Focus', detail: 'Follow sample errors over boosting rounds and find validation examples that remain difficult for the ensemble.' },
  { icon: Sparkles, title: 'Feature Analysis', detail: 'Review ensemble feature importance alongside local one-feature substitutions for a selected validation example.' },
  { icon: Trees, title: 'Tree Inspector', detail: 'Inspect a stage’s depth, leaves, split-feature summaries, shrinkage weight, and position in the ensemble.' },
  { icon: CircleHelp, title: 'Prediction Explainer', detail: 'Examine a validation prediction, actual target, confidence when available, residual, and local feature effects.' },
  { icon: Database, title: 'Dataset Explorer', detail: 'Load a CSV, choose the target and task, preview records, and select missing-value imputation before training.' },
]

const parameterEffects = [
  {
    name: 'Number of estimators', setting: '2–500 trees',
    up: 'Adds more correction stages and can improve fit, but costs more time and may eventually overfit.',
    down: 'Trains faster and limits model complexity, but too few rounds can leave systematic errors.',
  },
  {
    name: 'Learning rate', setting: '0.01–0.30',
    up: 'Each tree has a larger influence. Learning may be faster, but updates are less gradual.',
    down: 'Shrinks each tree’s contribution. This often calls for more estimators and can make fitting slower.',
  },
  {
    name: 'Maximum depth', setting: '1–5',
    up: 'Lets each weak learner model more interactions and complex patterns, with greater overfitting risk.',
    down: 'Produces simpler trees, but may underfit complex relationships.',
  },
  {
    name: 'Subsample', setting: '0.50–1.00',
    up: 'Uses more training rows per stage; 1.00 uses all rows.',
    down: 'Adds stochasticity that can regularize the fit, but each tree learns from fewer examples.',
  },
]

const workflow = [
  ['Prepare data', 'Choose Iris, Diabetes, or a CSV. The target is separated from features; rows without a target are excluded. Missing feature values are imputed, and categorical columns are one-hot encoded.'],
  ['Hold out validation data', 'A fixed-seed train/validation split keeps examples aside to estimate generalization. Classification is stratified when class counts allow it.'],
  ['Fit the ensemble once', 'The API trains a scikit-learn GradientBoostingClassifier or GradientBoostingRegressor using the selected settings.'],
  ['Record every stage', 'Staged predictions produce per-round train/validation loss and score. Tree metadata, sample histories, feature importance, and (when possible) response surfaces are calculated.'],
  ['Explore without refitting', 'The dashboard changes the selected round using cached outputs. Change a setting or dataset and train again to create a new experiment.'],
]

function SectionHeading({ number, title, detail }: { number: string; title: string; detail: string }) {
  return <div className="lab-section-heading"><span>{number}</span><div><h2>{title}</h2><p>{detail}</p></div></div>
}

function GradientBoostingLab() {
  return (
    <div className="lab-page">
      <section className="lab-hero" id="lab-project">
        <div className="lab-hero-copy">
          <span className="lab-kicker"><BookOpen size={13} /> PROJECT FIELD GUIDE</span>
          <h2>Small trees.<br /><em>One stronger model.</em></h2>
          <p>This project turns gradient boosting into an interactive experiment. Instead of seeing only a final score, follow how a sequence of shallow decision trees gradually corrects the current model.</p>
          <a className="lab-hero-link" href="#lab-how-it-works">Explore the method <ArrowDown size={14} /></a>
        </div>
        <div className="lab-equation" aria-label="The ensemble adds scaled tree corrections">
          <span className="lab-equation-label">THE ENSEMBLE</span>
          <strong>F<sub>m</sub>(x) = F<sub>m−1</sub>(x) + η h<sub>m</sub>(x)</strong>
          <span><b>current model</b><i>+</i><b>small tree correction</b></span>
          <small>Repeat for each boosting round</small>
        </div>
        <div className="lab-hero-stats"><span><strong>01</strong> fit a baseline</span><span><strong>02</strong> learn what remains</span><span><strong>03</strong> add a shrunken correction</span></div>
      </section>

      <nav className="lab-toc" aria-label="Gradient Boosting Lab contents">
        <a href="#lab-project-overview">The project</a><a href="#lab-how-it-works">How boosting works</a>
        <a href="#lab-controls">Tune the model</a><a href="#lab-features">What you can explore</a>
        <a href="#lab-workflow">A training run</a><a href="#lab-reading-results">Read the results</a><a href="#lab-limitations">Scope & limitations</a>
      </nav>

      <section className="lab-section" id="lab-project-overview">
        <SectionHeading number="01" title="What this project does" detail="A local, full-stack workbench for understanding staged tree ensembles." />
        <div className="lab-project-grid">
          <article className="lab-card lab-project-intro">
            <span className="lab-card-icon"><Braces size={17} /></span><h3>From dataset to explanation</h3>
            <p>Gradient Boosting Visualizer is a React and TypeScript dashboard backed by a local FastAPI service and scikit-learn. It trains classification and regression models, then makes the fitted model’s stages and validation behavior explorable in one shared workspace.</p>
            <div className="lab-tech-tags"><span>React + TypeScript</span><span>FastAPI</span><span>scikit-learn</span><span>pandas</span></div>
          </article>
          <article className="lab-card lab-purpose-card">
            <span className="lab-card-icon warm"><Lightbulb size={17} /></span><h3>The learning goal</h3>
            <p>Connect a model setting to a visible outcome: how trees change loss, predictions, errors, and feature response as rounds accumulate.</p>
            <div className="lab-purpose-flow"><span>Data</span><ArrowRight size={13} /><span>Boosted trees</span><ArrowRight size={13} /><span>Evidence</span></div>
          </article>
        </div>
      </section>

      <section className="lab-section" id="lab-how-it-works">
        <SectionHeading number="02" title="How gradient boosting works" detail="Boosting is sequential: each new learner is trained to improve the ensemble already built." />
        <div className="lab-theory-grid">
          <article className="lab-card lab-theory-main">
            <span className="lab-card-icon"><GitBranch size={17} /></span><h3>Build the answer in stages</h3>
            <ol className="lab-theory-steps">
              <li><b>Start with a baseline.</b> The initial model gives a simple prediction before trees are added.</li>
              <li><b>Measure what is still wrong.</b> At each stage, the algorithm computes the negative gradient of the chosen loss, often called a pseudo-residual. For squared-error regression, it corresponds to the residual.</li>
              <li><b>Fit a small tree to that signal.</b> The tree partitions feature space into regions and estimates a correction for each region.</li>
              <li><b>Shrink and add the correction.</b> The learning rate η scales the tree’s contribution before it is added to the ensemble.</li>
              <li><b>Repeat.</b> The next tree responds to the updated ensemble, not just the original problem.</li>
            </ol>
          </article>
          <aside className="lab-card lab-residual-card">
            <span className="lab-card-icon pink"><SlidersHorizontal size={17} /></span><h3>Why “gradient”?</h3>
            <p>The model minimizes a loss function. Its gradient indicates how predictions should move to reduce that loss; fitting each tree to the negative gradient gives a descent step in function space.</p>
            <div className="lab-mini-equation"><span>loss gradient</span><ArrowRight size={13} /><b>correction direction</b></div>
            <small>For classification, the correction signal comes from the classification loss—not simply the raw class label minus the prediction.</small>
          </aside>
        </div>
        <div className="lab-stage-ribbon"><span>INITIAL GUESS</span><ArrowRight size={14} /><span>LOSS GRADIENT</span><ArrowRight size={14} /><span>WEAK TREE</span><ArrowRight size={14} /><span>SHRUNKEN UPDATE</span><ArrowRight size={14} /><b>UPDATED ENSEMBLE</b></div>
      </section>

      <section className="lab-section" id="lab-controls">
        <SectionHeading number="03" title="What happens when you tune a setting?" detail="These are useful expectations, not guarantees: data size, noise, loss, and feature interactions matter." />
        <div className="lab-parameter-list">
          {parameterEffects.map(({ name, setting, up, down }, index) => (
            <article className="lab-card lab-parameter-card" key={name}>
              <div className="lab-parameter-title"><span>0{index + 1}</span><div><h3>{name}</h3><small>{setting}</small></div></div>
              <div className="lab-change"><span className="up-change">INCREASE</span><p>{up}</p></div>
              <div className="lab-change"><span className="down-change">DECREASE</span><p>{down}</p></div>
            </article>
          ))}
        </div>
        <div className="lab-card lab-loss-card">
          <div><span className="lab-card-icon warm"><SlidersHorizontal size={17} /></span><h3>Loss function</h3><p>The loss defines what “better” means for each prediction step. Available choices depend on the task.</p></div>
          <div className="lab-loss-options">
            <p><b>Classification</b><span><code>log_loss</code> optimizes class probabilities; <code>exponential</code> is an alternative boosting loss.</span></p>
            <p><b>Regression</b><span><code>squared_error</code> penalizes large errors strongly; <code>absolute_error</code> is less sensitive to outliers; <code>huber</code> blends both; <code>quantile</code> targets a conditional quantile.</span></p>
          </div>
        </div>
        <div className="lab-tip"><Lightbulb size={15} /><p><b>Useful experiment:</b> lower the learning rate and increase estimators, then compare validation curves. This changes two linked controls, so treat it as a trade-off to explore—not a guaranteed recipe for a better score.</p></div>
      </section>

      <section className="lab-section" id="lab-features">
        <SectionHeading number="04" title="What you can explore" detail="Each view presents a different lens on the same fitted experiment." />
        <div className="lab-feature-grid">
          {experimentFeatures.map(({ icon: Icon, title, detail }, index) => (
            <article className="lab-card lab-feature-card" key={title}>
              <span className="lab-feature-index">0{index + 1}</span><span className="lab-card-icon"><Icon size={16} /></span>
              <h3>{title}</h3><p>{detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="lab-section" id="lab-workflow">
        <SectionHeading number="05" title="Inside a training run" detail="Training happens on the local API; the browser explores the returned stages." />
        <div className="lab-workflow">
          {workflow.map(([title, detail], index) => (
            <article className="lab-workflow-step" key={title}>
              <span className="lab-workflow-number">{String(index + 1).padStart(2, '0')}</span>
              {index < workflow.length - 1 && <i aria-hidden="true" />}
              <div><h3>{title}</h3><p>{detail}</p></div>
            </article>
          ))}
        </div>
        <div className="lab-card lab-data-card">
          <span className="lab-card-icon warm"><Database size={17} /></span>
          <div><h3>Data choices in this project</h3><p>Iris is the built-in classification example; Diabetes is the built-in regression example. CSV features can be numeric or categorical. Numeric missing values can use mean, median, or mode; categorical gaps use mode. Empty targets are dropped, and completely empty feature columns are removed.</p></div>
        </div>
      </section>

      <section className="lab-section" id="lab-reading-results">
        <SectionHeading number="06" title="How to read the results" detail="Use held-out validation behavior—not training fit alone—to judge whether added complexity is helping." />
        <div className="lab-reading-grid">
          <article className="lab-card"><span className="lab-card-icon"><BarChart3 size={17} /></span><h3>Loss and score</h3><p>Loss measures the objective being optimized; lower is generally better. Accuracy is the classification score, while R² is the regression score. Validation estimates performance on held-out data.</p></article>
          <article className="lab-card"><span className="lab-card-icon pink"><GitBranch size={17} /></span><h3>Generalization gap</h3><p>If training loss keeps falling while validation loss turns upward, later stages may be fitting training-specific patterns. Prefer useful validation behavior, not automatically the final round.</p></article>
          <article className="lab-card"><span className="lab-card-icon warm"><Trees size={17} /></span><h3>Residuals and trees</h3><p>Sample histories show whether individual examples improve across stages. Tree summaries expose complexity and common split features, but a split is not proof of causation.</p></article>
          <article className="lab-card"><span className="lab-card-icon"><Sparkles size={17} /></span><h3>Feature effects</h3><p>Feature importance summarizes the ensemble. Local effects compare one-feature substitutions against a baseline row; they are not SHAP values or causal effects.</p></article>
        </div>
      </section>

      <section className="lab-section lab-boundary-section" id="lab-limitations">
        <SectionHeading number="07" title="Scope, assumptions, and limitations" detail="Know what each visualization does—and what it does not claim." />
        <div className="lab-limitations">
          <p><b>One holdout split:</b> results depend on the fixed random seed and validation split; the app does not report cross-validation uncertainty.</p>
          <p><b>Two-feature slice:</b> the surface varies the first two numeric columns and holds remaining features at a typical training row. It is not the full high-dimensional decision boundary.</p>
          <p><b>Local counterfactuals:</b> explanations change one value at a time against a baseline. Feature interactions are not allocated, and the result is not causal.</p>
          <p><b>Session-local artifacts:</b> the local API does not persist uploaded datasets or fitted models. Export downloads the experiment response as JSON.</p>
          <p><b>Teaching tool, not a deployment recipe:</b> use domain-appropriate evaluation and additional testing before relying on a model in production.</p>
        </div>
      </section>
      <div className="lab-endnote"><BookOpen size={14} /><span>Start with a small change, train again, then follow the validation curve and sample histories round by round.</span><a href="#lab-project">Back to top <ArrowRight size={12} /></a></div>
    </div>
  )
}

export default GradientBoostingLab
