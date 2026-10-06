import { useEffect, useState } from 'react'
import {
  Activity, AlertCircle, BarChart3, BookOpen, BrainCircuit, Check, ChevronDown,
  CircleGauge, Clock3, Database, Download, FileSpreadsheet, Gauge,
  GitBranch, LayoutDashboard, Layers3, Settings2, Sparkles, Trees, Upload,
} from 'lucide-react'
import DatasetStudio from './DatasetStudio'
import GradientBoostingLab from './GradientBoostingLab'
import {
  BoostingPanel, DecisionBoundaryPanel, FeaturePanel, PredictionExplainer,
  ResidualPanel, SampleList, TrainingCharts, TreeInspector,
} from './Visuals'
import type { DatasetInput, Task, TrainingResult } from './types'
import './App.css'

type View = 'overview' | 'rounds' | 'boundary' | 'residuals' | 'features' | 'trees' | 'explainer' | 'datasets' | 'lab' | 'settings'

const navigation: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'rounds', label: 'Boosting Rounds', icon: GitBranch },
  { id: 'boundary', label: 'Decision Boundary', icon: Activity },
  { id: 'residuals', label: 'Residual Focus', icon: BarChart3 },
  { id: 'features', label: 'Feature Analysis', icon: Sparkles },
  { id: 'trees', label: 'Tree Inspector', icon: Trees },
  { id: 'explainer', label: 'Prediction Explainer', icon: CircleGauge },
  { id: 'datasets', label: 'Dataset Explorer', icon: Database },
  { id: 'lab', label: 'Gradient Boosting Lab', icon: BookOpen },
]

const pageCopy: Record<View, { title: string; subtitle: string }> = {
  overview: { title: 'Gradient Boosting', subtitle: 'Watch weak learners correct the errors left by the ensemble.' },
  rounds: { title: 'Boosting Rounds', subtitle: 'Follow the ensemble as each small tree updates the current prediction.' },
  boundary: { title: 'Decision Boundary', subtitle: 'Explore how the selected boosting round reshapes the model response.' },
  residuals: { title: 'Residual Focus', subtitle: 'Find the samples and classes the current ensemble still misses.' },
  features: { title: 'Feature Analysis', subtitle: 'Inspect ensemble-wide importance and local sample effects.' },
  trees: { title: 'Tree Inspector', subtitle: 'Select a boosting stage to inspect the weak learner it added.' },
  explainer: { title: 'Prediction Explainer', subtitle: 'Trace a sample prediction through feature-level counterfactuals.' },
  datasets: { title: 'Dataset Explorer', subtitle: 'Import and prepare a dataset for an experiment.' },
  lab: { title: 'Gradient Boosting Lab', subtitle: 'A complete guide to the project, the algorithm, and how to read every experiment.' },
  settings: { title: 'Experiment Settings', subtitle: 'Tune the model before running a new experiment.' },
}

const defaultParameters = { n_estimators: 80, learning_rate: 0.08, max_depth: 2, subsample: 0.85, loss: 'log_loss' }

function App() {
  const [view, setView] = useState<View>('overview')
  const [datasetId, setDatasetId] = useState('iris')
  const [datasetLabel, setDatasetLabel] = useState('Iris')
  const [task, setTask] = useState<Task>('classification')
  const [customDataset, setCustomDataset] = useState<DatasetInput | null>(null)
  const [parameters, setParameters] = useState(defaultParameters)
  const [result, setResult] = useState<TrainingResult | null>(null)
  const [round, setRound] = useState(1)
  const [selectedSample, setSelectedSample] = useState('')
  const [playing, setPlaying] = useState(false)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    const loadDefault = async () => {
      setBusy(true)
      try {
        const response = await fetch('/api/train', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataset: 'iris', task: 'classification', ...defaultParameters }),
          signal: controller.signal,
        })
        if (!response.ok) throw new Error((await response.json()).detail ?? 'Training failed.')
        const data = await response.json() as TrainingResult
        setResult(data)
        setRound(data.rounds.length)
        setSelectedSample(data.samples[0]?.sample_id ?? '')
        setError('')
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Could not reach the training API.')
      } finally {
        if (!controller.signal.aborted) setBusy(false)
      }
    }
    void loadDefault()
    return () => controller.abort()
  }, [])

  const runTraining = async (datasetInput?: DatasetInput) => {
    setBusy(true)
    setPlaying(false)
    setError('')
    const activeTask = datasetInput?.task ?? task
    const activeDataset = datasetInput ? 'custom' : datasetId
    const payload = {
      dataset: activeDataset,
      task: activeTask,
      target: datasetInput?.target ?? customDataset?.target,
      rows: datasetInput?.rows ?? customDataset?.rows,
      imputation: datasetInput?.imputation ?? customDataset?.imputation,
      ...parameters,
      loss: activeTask === 'classification' && !['log_loss', 'exponential'].includes(parameters.loss)
        ? 'log_loss'
        : activeTask === 'regression' && !['squared_error', 'absolute_error', 'huber', 'quantile'].includes(parameters.loss)
          ? 'squared_error'
          : parameters.loss,
    }
    try {
      const response = await fetch('/api/train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const body = await response.json()
        throw new Error(body.detail ?? 'Training failed. Check the dataset and model settings.')
      }
      const data = await response.json() as TrainingResult
      setResult(data)
      setRound(data.rounds.length)
      setSelectedSample(data.samples[0]?.sample_id ?? '')
      if (datasetInput) {
        setCustomDataset(datasetInput)
        setDatasetId('custom')
        setDatasetLabel('Custom CSV')
        setTask(datasetInput.task)
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not reach the local training API.')
    } finally {
      setBusy(false)
    }
  }

  const maxRound = result?.rounds.length ?? 1
  useEffect(() => {
    if (!playing || !result) return
    const timer = window.setInterval(() => {
      setRound((current) => {
        if (current >= maxRound) {
          setPlaying(false)
          return maxRound
        }
        return current + 1
      })
    }, 680)
    return () => window.clearInterval(timer)
  }, [playing, maxRound, result])

  const setViewFromNav = (nextView: View) => {
    setPlaying(false)
    setView(nextView)
  }

  const exportReport = () => {
    if (!result) return
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'gradient-boosting-experiment.json'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const metadata = result?.rounds[Math.max(0, round - 1)]
  const scoreValue = result?.summary.task === 'classification'
    ? `${((metadata?.valid_score ?? 0) * 100).toFixed(1)}%`
    : (metadata?.valid_score ?? 0).toFixed(3)
  const sampleHistory = result?.sample_history ?? []
  const page = pageCopy[view]

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => setViewFromNav('overview')} aria-label="Gradient Boosting Visualizer home">
          <span className="brand-mark"><BrainCircuit size={28} strokeWidth={2.2} /></span>
          <span><strong>Gradient</strong><small>BOOST LAB</small></span>
        </button>
        <div className="nav-caption">WORKSPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          {navigation.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${view === id ? 'active' : ''}`} onClick={() => setViewFromNav(id)}><Icon size={17} strokeWidth={2.2} /><span>{label}</span>{id === 'datasets' && datasetId === 'custom' && <i className="nav-dot" />}</button>)}
        </nav>
        <div className="sidebar-bottom">
          {result && <div className="sidebar-run-state"><span className="status-led" /><span><small>LAST RUN</small><strong>{result.summary.model_type.replace('GradientBoosting', 'Gradient Boosting')}</strong></span></div>}
          <button className={`nav-item settings-nav ${view === 'settings' ? 'active' : ''}`} onClick={() => setViewFromNav('settings')}><Settings2 size={17} /><span>Model settings</span></button>
          <div className="sidebar-credit"><span>GB</span><span>Local experiment<small>scikit-learn engine</small></span></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="top-header">
          <div className="heading-copy"><div className="eyebrow">MODEL EXPLORER <span>/</span> {view.toUpperCase()}</div><h1>{page.title}</h1><p>{page.subtitle}</p></div>
          <div className="header-controls">
            <label className="select-control dataset-select"><span>DATASET</span><span className="select-icon"><FileSpreadsheet size={14} /></span><select value={datasetId} onChange={(event) => { const value = event.target.value; const nextTask = value === 'diabetes' ? 'regression' : 'classification'; setDatasetId(value); setDatasetLabel(value === 'diabetes' ? 'Diabetes' : value === 'custom' ? 'Custom CSV' : 'Iris'); if (value !== 'custom') { setTask(nextTask); setParameters((current) => ({ ...current, loss: nextTask === 'regression' ? 'squared_error' : 'log_loss' })) } }}><option value="iris">Iris</option><option value="diabetes">Diabetes · regression</option>{customDataset && <option value="custom">Custom CSV</option>}</select><ChevronDown size={13} className="select-chevron" /></label>
            <label className="select-control task-select"><span>MODEL TYPE</span><span className="select-icon warm"><Layers3 size={14} /></span><select value={task} onChange={(event) => { setTask(event.target.value as Task); setParameters((current) => ({ ...current, loss: event.target.value === 'regression' ? 'squared_error' : 'log_loss' })) }}><option value="classification">Classifier</option><option value="regression">Regressor</option></select><ChevronDown size={13} className="select-chevron" /></label>
            {result && <button className="icon-button export-button" onClick={exportReport} aria-label="Export model report" title="Export experiment JSON"><Download size={16} /></button>}
            <button className="primary-button train-button" onClick={() => void runTraining()} disabled={busy}><Sparkles size={15} />{busy ? 'Training…' : 'Train model'}</button>
          </div>
        </header>

        <div className="parameter-strip">
          <span className="strip-label"><Settings2 size={13} /> MODEL PARAMETERS</span>
          <label><span>Estimators</span><select value={parameters.n_estimators} onChange={(event) => setParameters((current) => ({ ...current, n_estimators: Number(event.target.value) }))}>{[20, 40, 80, 120, 200, 300, 500].map((value) => <option key={value}>{value}</option>)}</select></label>
          <label className="range-control"><span>Learning rate <b>{parameters.learning_rate.toFixed(2)}</b></span><input aria-label="Learning rate" type="range" min="0.01" max="0.3" step="0.01" value={parameters.learning_rate} onChange={(event) => setParameters((current) => ({ ...current, learning_rate: Number(event.target.value) }))} /></label>
          <label><span>Max depth</span><select value={parameters.max_depth} onChange={(event) => setParameters((current) => ({ ...current, max_depth: Number(event.target.value) }))}>{[1, 2, 3, 4, 5].map((value) => <option key={value}>{value}</option>)}</select></label>
          <label><span>Subsample</span><select value={parameters.subsample} onChange={(event) => setParameters((current) => ({ ...current, subsample: Number(event.target.value) }))}>{[0.5, 0.65, 0.8, 0.85, 1].map((value) => <option key={value} value={value}>{value.toFixed(2)}</option>)}</select></label>
          <label><span>Loss</span><select value={parameters.loss} onChange={(event) => setParameters((current) => ({ ...current, loss: event.target.value }))}>{task === 'classification' ? <><option value="log_loss">Log loss</option><option value="exponential">Exponential</option></> : <><option value="squared_error">Squared error</option><option value="absolute_error">Absolute error</option><option value="huber">Huber</option><option value="quantile">Quantile</option></>}</select></label>
          <button className="reset-control" onClick={() => { setParameters(defaultParameters); setRound(1); setPlaying(false) }}>Reset <span>↺</span></button>
        </div>

        {error && <div className="error-banner"><AlertCircle size={16} /><span>{error}</span>{!result && <button onClick={() => void runTraining()}>Retry</button>}</div>}

        {busy && !result ? <div className="loading-state"><span className="loading-mark"><Trees size={23} /></span><strong>Growing the first ensemble</strong><span>Preparing the dataset and staging model rounds…</span></div> : result ? (
          <>
            {view !== 'datasets' && view !== 'settings' && view !== 'lab' && <section className="metric-grid">
              <Metric icon={Gauge} label={result.summary.score_label} value={scoreValue} note={`Validation · round ${round}`} tone="green" />
              <Metric icon={Activity} label={`${result.summary.loss_label} · current`} value={(metadata?.valid_loss ?? result.summary.final_loss).toFixed(4)} note={`Train ${(metadata?.train_loss ?? 0).toFixed(4)}`} tone="pink" />
              <Metric icon={Trees} label="Estimators" value={String(round)} note={`of ${result.summary.n_estimators} trees`} tone="amber" />
              <Metric icon={Clock3} label="Training time" value={`${result.summary.training_time.toFixed(2)}s`} note={`${result.summary.train_rows} train · ${result.summary.validation_rows} valid`} tone="red" />
            </section>}
            {view === 'overview' && <><div className="dashboard-top-grid"><BoostingPanel result={result} round={round} onRoundChange={setRound} playing={playing} onTogglePlay={() => setPlaying((current) => !current)} /><TrainingCharts rounds={result.rounds} activeRound={round} scoreLabel={result.summary.score_label} /></div><div className="dashboard-bottom-grid"><DecisionBoundaryPanel boundary={result.boundary} round={round} selectedSample={selectedSample} onSelectSample={setSelectedSample} /><ResidualPanel history={sampleHistory} round={round} task={task} selectedSample={selectedSample} /><FeaturePanel result={result} /></div><div className="overview-foot"><span><Check size={13} /> {datasetLabel} · target <b>{result.summary.target}</b></span><span>{result.summary.model_type} · seed 42</span><button onClick={() => setViewFromNav('explainer')}>Inspect a prediction <ChevronDown size={13} /></button></div></>}
            {view === 'rounds' && <div className="focus-layout"><div><BoostingPanel result={result} round={round} onRoundChange={setRound} playing={playing} onTogglePlay={() => setPlaying((current) => !current)} /><TrainingCharts rounds={result.rounds} activeRound={round} scoreLabel={result.summary.score_label} /></div><div><TreeInspector trees={result.trees} activeRound={round} onRoundChange={setRound} /><ResidualPanel history={sampleHistory} round={round} task={task} selectedSample={selectedSample} /></div></div>}
            {view === 'boundary' && <div className="focus-layout wide-focus"><DecisionBoundaryPanel boundary={result.boundary} round={round} selectedSample={selectedSample} onSelectSample={setSelectedSample} large /><div><ResidualPanel history={sampleHistory} round={round} task={task} selectedSample={selectedSample} /><SampleList samples={result.samples} selectedId={selectedSample} onSelect={setSelectedSample} /></div></div>}
            {view === 'residuals' && <div className="focus-layout wide-focus"><ResidualPanel history={sampleHistory} round={round} task={task} selectedSample={selectedSample} /><div><DecisionBoundaryPanel boundary={result.boundary} round={round} selectedSample={selectedSample} onSelectSample={setSelectedSample} /><SampleList samples={result.samples} selectedId={selectedSample} onSelect={setSelectedSample} /></div></div>}
            {view === 'features' && <div className="focus-layout"><FeaturePanel result={result} large /><PredictionExplainer samples={result.samples} selectedId={selectedSample} onSelect={setSelectedSample} task={task} dataset={result.summary.dataset} /></div>}
            {view === 'trees' && <div className="focus-layout"><TreeInspector trees={result.trees} activeRound={round} onRoundChange={setRound} /><div><TrainingCharts rounds={result.rounds} activeRound={round} scoreLabel={result.summary.score_label} /><BoostingPanel result={result} round={round} onRoundChange={setRound} playing={playing} onTogglePlay={() => setPlaying((current) => !current)} /></div></div>}
            {view === 'explainer' && <div className="focus-layout"><PredictionExplainer samples={result.samples} selectedId={selectedSample} onSelect={setSelectedSample} task={task} dataset={result.summary.dataset} /><div><DecisionBoundaryPanel boundary={result.boundary} round={round} selectedSample={selectedSample} onSelectSample={setSelectedSample} /><SampleList samples={result.samples} selectedId={selectedSample} onSelect={setSelectedSample} /></div></div>}
            {view === 'datasets' && <DatasetStudio onUseDataset={(dataset) => { setViewFromNav('overview'); void runTraining(dataset) }} />}
            {view === 'lab' && <GradientBoostingLab />}
            {view === 'settings' && <div className="settings-view"><section className="panel settings-summary"><div className="eyebrow">ACTIVE EXPERIMENT</div><h2>{result.summary.model_type}</h2><p>Current run · {datasetLabel} · target {result.summary.target}</p><div className="settings-detail-grid"><span>Training rows<strong>{result.summary.train_rows}</strong></span><span>Validation rows<strong>{result.summary.validation_rows}</strong></span><span>Features<strong>{result.summary.feature_names.length}</strong></span><span>Random state<strong>42</strong></span></div><button className="quiet-button" onClick={exportReport}><Download size={15} /> Export run data</button></section><section className="panel settings-note"><div className="eyebrow">CURRENT PARAMETERS</div><h3>Ensemble configuration</h3><p>Change the model controls in the top bar, then run a new experiment. Each run trains once and returns its staged artifacts for playback.</p><div className="settings-detail-grid"><span>Estimators<strong>{parameters.n_estimators}</strong></span><span>Learning rate<strong>{parameters.learning_rate.toFixed(2)}</strong></span><span>Max depth<strong>{parameters.max_depth}</strong></span><span>Subsample<strong>{parameters.subsample.toFixed(2)}</strong></span><span>Objective<strong>{parameters.loss.replace('_', ' ')}</strong></span></div></section></div>}
          </>
        ) : view === 'datasets' ? <DatasetStudio onUseDataset={(dataset) => { setViewFromNav('overview'); void runTraining(dataset) }} /> : <div className="loading-state"><span className="loading-mark"><Upload size={23} /></span><strong>Training service unavailable</strong><span>Start the local FastAPI service and retry the experiment.</span></div>}

        <footer className="page-footer"><span><span className="footer-led" /> Gradient Boosting Visualizer</span><span>Model artifacts cached for this session</span><span>Built with scikit-learn <b>·</b> v1</span></footer>
      </main>
    </div>
  )
}

function Metric({ icon: Icon, label, value, note, tone }: { icon: typeof Gauge; label: string; value: string; note: string; tone: string }) {
  return <div className={`metric-card metric-${tone}`}><span className="metric-icon"><Icon size={19} strokeWidth={2.2} /></span><div className="metric-copy"><span>{label}</span><strong>{value}</strong><small>{note}</small></div><div className="metric-spark" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></div></div>
}

export default App
