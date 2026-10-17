import { ArrowRight, BookOpen, BrainCircuit, ChartNoAxesCombined, Database, SlidersHorizontal } from 'lucide-react'

type GuideSection = 'Dataset' | 'Training' | 'Evaluation' | 'Explain AI' | '3D Explorer' | 'Tuning'

const steps = [
  { number: '01', title: 'Prepare your data', copy: 'Upload a CSV, choose the column you want to predict, and confirm the task. Review missing values and feature ranges before fitting.', icon: Database, section: 'Dataset' as const },
  { number: '02', title: 'Train a baseline', copy: 'Start with the defaults. CatBoost selects a validation split and learns trees until it reaches the iteration limit or early stopping applies.', icon: BrainCircuit, section: 'Training' as const },
  { number: '03', title: 'Check the evidence', copy: 'Use held-out evaluation plots to see where predictions are wrong. Then inspect global feature importance and one-row SHAP explanations.', icon: ChartNoAxesCombined, section: 'Evaluation' as const },
  { number: '04', title: 'Explore and improve', copy: 'Compare the fitted response surface with observed targets, then inspect per-row prediction gaps and residual patterns in 3D.', icon: SlidersHorizontal, section: '3D Explorer' as const },
]

const controls = [
  { name: 'Iterations', what: 'The maximum number of boosting steps (trees).', raise: 'Allows more trees to refine the fit; training takes longer and may eventually overfit.', watch: 'The training curve gains more points. Early stopping can stop before this limit; the fitted tree count is shown separately.' },
  { name: 'Tree depth', what: 'How many feature decisions a tree can combine.', raise: 'Lets trees model more complex interactions, but increases capacity, training cost, and overfitting risk.', watch: 'Training and validation curves may separate more; the response surface can become more detailed or less smooth.' },
  { name: 'Learning rate', what: 'How strongly each new tree updates the current model.', raise: 'Usually learns faster with fewer trees, but each step is larger and can make validation results less stable.', watch: 'A higher rate can move the learning curve faster; compare validation quality at the best iteration, not just the training score.' },
  { name: 'L2 regularization', what: 'Penalizes large leaf values to make individual updates more conservative.', raise: 'Can reduce overly strong responses and help generalization, but too much can underfit.', watch: 'Predictions and the response surface may vary less sharply. Evaluation on held-out rows is the check.' },
  { name: 'Random strength', what: 'Adds randomness to score calculations when selecting tree splits.', raise: 'Can encourage different, less brittle splits; too much randomness may reduce fit quality.', watch: 'Training may be less deterministic across seeds and feature importance can shift. Compare repeated runs before drawing conclusions.' },
]

export function CatBoostGuide({ navigate }: { navigate: (section: GuideSection) => void }) {
  return <article className="guide-page">
    <section className="guide-hero">
      <span className="guide-icon"><BookOpen size={21} /></span>
      <div><span className="section-kicker">A PRACTICAL FIELD GUIDE</span><h2>CatBoost, from first CSV to model insight</h2><p>A plain-language guide to training, reading the charts, and understanding what changes when you tune the model.</p></div>
    </section>

    <section className="guide-section">
      <div className="guide-section-heading"><span>START HERE</span><h3>How to use this model studio</h3><p>Follow the workflow in order. Each section uses your active dataset or fitted model.</p></div>
      <div className="guide-steps">{steps.map(({ number, title, copy, icon: Icon, section }) => <button className="guide-step" key={number} onClick={() => navigate(section)}>
        <span className="guide-step-top"><i>{number}</i><Icon size={17} /></span><strong>{title}</strong><p>{copy}</p><span className="guide-step-link">Open {section}<ArrowRight size={13} /></span>
      </button>)}</div>
    </section>

    <section className="guide-section">
      <div className="guide-section-heading"><span>TRAINING CONTROLS</span><h3>What if I increase this?</h3><p>Change one control at a time. More complexity is not automatically better; choose settings using validation results.</p></div>
      <div className="guide-table-wrap"><table className="guide-table"><thead><tr><th>Setting</th><th>What it controls</th><th>Effect of increasing it</th><th>What to watch in the studio</th></tr></thead><tbody>{controls.map((control) => <tr key={control.name}><th>{control.name}</th><td>{control.what}</td><td>{control.raise}</td><td>{control.watch}</td></tr>)}</tbody></table></div>
      <div className="guide-callout"><strong>Early stopping can limit the effect of more iterations.</strong><span>Training monitors a held-out validation split and may stop when its score stops improving. “Iterations requested” is a ceiling; “trees built” is what the fitted model actually contains.</span></div>
    </section>

    <section className="guide-section">
      <div className="guide-section-heading"><span>THE IDEA</span><h3>How CatBoost learns</h3><p>CatBoost is a gradient-boosted decision-tree algorithm designed to work particularly well with categorical columns.</p></div>
      <div className="guide-concepts">
        <section><b>01 · Start with a simple prediction</b><p>The model begins with a baseline estimate. For regression this is a numeric value; for classification it represents class scores or probabilities.</p></section>
        <section><b>02 · Learn from the remaining error</b><p>Each new tree is fitted to improve the current model. It splits rows into groups using feature conditions and assigns an update to each leaf. The ensemble adds these small updates together.</p></section>
        <section><b>03 · Keep each tree deliberately structured</b><p>CatBoost commonly uses symmetric (oblivious) trees: the same split condition is applied at each level. This structure makes predictions efficient and is one reason its trees can be inspected as a compact sequence of decisions.</p></section>
        <section><b>04 · Handle categories without target leakage</b><p>Instead of requiring manual one-hot encoding for every category, CatBoost can build ordered target statistics. Rows are ordered so a row’s statistic is calculated from eligible preceding examples, helping avoid using that row’s own target to encode it.</p></section>
        <section><b>05 · Check generalization, not just fit</b><p>The validation set is held aside during fitting and helps compare settings. A lower training loss alone does not prove a better model; use validation metrics and error charts to look for useful performance on unseen rows.</p></section>
        <section><b>06 · Explanations describe the model, not cause</b><p>Feature importance ranks influence. SHAP attributes a prediction to feature contributions relative to a baseline. Neither proves that changing a feature in the real world will cause the predicted outcome.</p></section>
      </div>
    </section>

    <section className="guide-section">
      <div className="guide-section-heading"><span>READ THE VIEWS</span><h3>What each visualization can—and cannot—tell you</h3></div>
      <div className="guide-chart-notes">
        <section><b>Learning curve</b><p>Training and validation metrics by tree count. The gap can signal a generalization problem, but it is not proof on its own.</p></section>
        <section><b>Evaluation</b><p>Regression plots show value errors; classification plots show class errors and probability behavior. These use held-out rows, not a promise of future performance.</p></section>
        <section><b>2D / 3D response surface</b><p>Shows predictions as two selected numeric features vary. Every other feature is held at its reference value, so this is a conditional slice, not the model’s complete behavior.</p></section>
        <section><b>Regression overview</b><p>The surface shows CatBoost predictions as the selected numeric features vary. Other model inputs stay at a reference profile; this is not a separately fitted linear-regression plane.</p></section>
        <section><b>Polynomial-style surface</b><p>This uses CatBoost predictions with a smooth, wireframed presentation and observed rows. “Polynomial-style” describes the visual style only; no polynomial model is fitted.</p></section>
        <section><b>Scatter + regression surface</b><p>Real rows appear at their observed target values over the CatBoost response surface, making the distance between data and model visible.</p></section>
        <section><b>CatBoost nonlinear</b><p>The response mesh is shown with actual and predicted row values joined by connectors. This reveals how the fitted CatBoost model responds across the feature pair and where its predictions differ from observations.</p></section>
        <section><b>Feature importance and SHAP</b><p>Importance shows ranking; SHAP adds direction and local contributions. Correlated inputs may share attribution, and attribution is not causation.</p></section>
        <section><b>Tuning comparison</b><p>Compare runs on the same validation split, including score and elapsed time. A tiny score improvement may not justify a much slower or more complex model.</p></section>
      </div>
    </section>

    <footer className="guide-footer"><BrainCircuit size={18} /><span>Best practice: train a baseline, inspect held-out errors, change one setting, then compare again.</span></footer>
  </article>
}
