import { ArrowRight, BarChart3, BookOpen, CheckCircle2, Database, FlaskConical, GitBranch, Layers3, Sparkles, Upload } from 'lucide-react'
import './AboutCatBoost.css'

type Destination = 'Dataset' | 'Overview' | 'Ordered Boosting' | 'Tree Visualization' | 'Training Progress' | 'Feature Importance' | 'SHAP Analysis' | 'Hyperparameter Tuning' | 'Model Comparison' | 'Decision Boundary' | 'Prediction Explorer' | '3D Visualization'

export function AboutCatBoost({ onNavigate }: { onNavigate: (page: Destination) => void }) {
  return <div className="about-page">
    <section className="about-hero">
      <div className="about-hero-copy">
        <span className="about-kicker"><BookOpen size={14} /> YOUR GUIDE TO THE CATBOOST LAB</span>
        <h2>From dataset to <span>understanding</span></h2>
        <p>Learn how CatBoost makes predictions, run a model on your own data, and use the lab’s visual tools to understand what it learned.</p>
        <div className="about-hero-actions">
          <button className="about-primary" onClick={() => onNavigate('Dataset')}><Upload size={15} /> Start with a dataset <ArrowRight size={15} /></button>
          <button className="about-secondary" onClick={() => onNavigate('Overview')}>Explore the overview</button>
        </div>
      </div>
      <div className="about-hero-art" aria-hidden="true">
        <div className="about-art-orbit orbit-one" /><div className="about-art-orbit orbit-two" />
        <div className="about-art-core"><Layers3 size={31} /></div>
        <i className="about-art-node node-one" /><i className="about-art-node node-two" /><i className="about-art-node node-three" />
        <span className="about-art-label">BOOSTING · ROUND BY ROUND</span>
      </div>
    </section>

    <section className="about-section">
      <header className="about-section-heading"><div><span className="about-overline">THE MODEL</span><h2>What is CatBoost?</h2></div><p>CatBoost is a gradient-boosting library that builds an ensemble of decision trees. It is designed to work especially well with categorical features, often without requiring you to manually encode every category.</p></header>
      <div className="about-concepts">
        <article className="about-concept"><span className="about-concept-icon"><Database size={17} /></span><h3>Categorical features</h3><p>Use values such as product type or contract directly. CatBoost transforms categories into useful statistics as part of training.</p></article>
        <article className="about-concept"><span className="about-concept-icon"><Layers3 size={17} /></span><h3>Ordered learning</h3><p>Ordered statistics and boosting use carefully ordered examples to reduce target leakage and prediction shift during training.</p></article>
        <article className="about-concept"><span className="about-concept-icon"><GitBranch size={17} /></span><h3>Boosted trees</h3><p>Trees are added sequentially. Each new tree helps correct errors in the ensemble’s current predictions.</p></article>
      </div>
    </section>

    <section className="about-section workflow-section">
      <header className="about-section-heading"><div><span className="about-overline">YOUR WORKFLOW</span><h2>Run your first experiment</h2></div><p>Keep the target and task consistent as you iterate, so changes in results are easier to interpret.</p></header>
      <div className="about-workflow">
        {[
          { icon: Upload, title: 'Load your data', description: 'Upload a CSV or choose a built-in sample. Confirm the target column and classification or regression task.', action: 'Open Dataset', page: 'Dataset' as const },
          { icon: CheckCircle2, title: 'Check data quality', description: 'Review feature types and missing values. Choose a suitable imputation strategy for columns that need it.', action: 'Review dataset', page: 'Dataset' as const },
          { icon: FlaskConical, title: 'Train and compare runs', description: 'Train a baseline, then use Hyperparameter Tuning to test iteration count, depth, and learning rate.', action: 'Open experiments', page: 'Hyperparameter Tuning' as const },
          { icon: BarChart3, title: 'Inspect what changed', description: 'Compare training progress, feature importance, SHAP values, predictions, and tree structure.', action: 'View model overview', page: 'Overview' as const },
        ].map(({ icon: Icon, title, description, action, page }, index) => <article className="about-step" key={title}>
          <span className="about-step-number">0{index + 1}</span><span className="about-step-icon"><Icon size={17} /></span><h3>{title}</h3><p>{description}</p><button onClick={() => onNavigate(page)}>{action}<ArrowRight size={13} /></button>
        </article>)}
      </div>
    </section>

    <section className="about-section">
      <header className="about-section-heading"><div><span className="about-overline">EXPLORE THE LAB</span><h2>Choose a view for your question</h2></div><p>Move from model behavior to model explanations. Most analysis views become meaningful after you load data and train a model.</p></header>
      <div className="about-tools">
        {[
          { icon: Layers3, title: 'Ordered Boosting', description: 'Step through ordered statistics and boosting rounds.', page: 'Ordered Boosting' as const },
          { icon: GitBranch, title: 'Trees & progress', description: 'Inspect fitted splits and track loss across iterations.', page: 'Tree Visualization' as const },
          { icon: Sparkles, title: 'Importance & SHAP', description: 'Explore global feature ranking and per-prediction contributions.', page: 'SHAP Analysis' as const },
          { icon: FlaskConical, title: 'Experiments', description: 'Run controlled hyperparameter experiments and compare recorded results.', page: 'Hyperparameter Tuning' as const },
        ].map(({ icon: Icon, title, description, page }) => <button className="about-tool" key={title} onClick={() => onNavigate(page)}><Icon size={17} /><span><b>{title}</b><small>{description}</small></span><ArrowRight size={14} /></button>)}
      </div>
    </section>

    <aside className="about-note"><span><BookOpen size={16} /></span><p><b>A note about the visuals</b> Some overview metrics and comparison examples are illustrative until you train on an uploaded or sample dataset. Dataset inspection, training, ordered statistics, fitted-tree details, feature importance, SHAP, predictions, and experiment runs use the local API when available.</p></aside>
  </div>
}
