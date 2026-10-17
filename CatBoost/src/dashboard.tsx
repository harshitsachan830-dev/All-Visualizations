import { lazy, Suspense, useEffect, useState } from 'react'
import {
  BarChart3,
  BookOpen,
  ChevronDown,
  CircleHelp,
  Database,
  FlaskConical,
  GitBranch,
  Layers3,
  Menu,
  Moon,
  Play,
  Sparkles,
  Sun,
  Upload,
  X,
} from 'lucide-react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { apiUrl } from './api'
import { DatasetExplorer } from './DatasetExplorer'
import { FeatureImportanceView, ExplainabilityView } from './Explainability'
import { CatBoostGuide } from './CatBoostGuide'
import { ModelEvaluation } from './ModelEvaluation'
import { BoundaryExplorer } from './BoundaryExplorer'
import { ExperimentRunner } from './ExperimentRunner'
import type { DatasetProfile, PredictionResult, ShapResult, TrainingHistoryPoint, TrainingResult } from './visualizationTypes'
import './state.css'
import './dashboard-v2.css'

const ModelSurface3D = lazy(() => import('./ModelSurface3D').then((module) => ({ default: module.ModelSurface3D })))

const pages = [
  { name: 'Dataset', icon: Database, group: 'WORKSPACE' },
  { name: 'Training', icon: Play, group: 'WORKSPACE' },
  { name: 'Evaluation', icon: BarChart3, group: 'ANALYSIS' },
  { name: 'Explain AI', icon: Sparkles, group: 'ANALYSIS' },
  { name: '3D Explorer', icon: Layers3, group: 'EXPLORE' },
  { name: 'Tuning', icon: FlaskConical, group: 'EXPLORE' },
  { name: 'CatBoost Guide', icon: BookOpen, group: 'LEARN' },
] as const
type Page = typeof pages[number]['name']
type Health = { status: string; catboost_available: boolean; dataset_loaded: boolean }
type OrderedStep = { category: unknown; prior_count: number; prior_target_sum: number; statistic: number }

const descriptions: Record<Page, string> = {
  Dataset: 'Profile your target and features before training.',
  Training: 'Track the fitted model’s learning curve and training settings.',
  Evaluation: 'Review task-specific performance on held-out data.',
  'Explain AI': 'See global feature effects and explain one prediction.',
  '3D Explorer': 'Explore how two numeric features change the model response.',
  Tuning: 'Run controlled experiments and compare their validation scores.',
  'CatBoost Guide': 'Learn how to use the studio, tune CatBoost, and read each visualization.',
}

export default function Dashboard() {
  const [page, setPage] = useState<Page>('Dataset')
  const [data, setData] = useState<DatasetProfile | null>(null)
  const [target, setTarget] = useState('')
  const [task, setTask] = useState<'classification' | 'regression'>('classification')
  const [selectedFeature, setSelectedFeature] = useState('')
  const [method, setMethod] = useState('median')
  const [sample, setSample] = useState(1)
  const [iteration, setIteration] = useState(1)
  const [iterations, setIterations] = useState(200)
  const [depth, setDepth] = useState(6)
  const [rate, setRate] = useState(.05)
  const [trained, setTrained] = useState<TrainingResult | null>(null)
  const [prediction, setPrediction] = useState<PredictionResult | null>(null)
  const [shap, setShap] = useState<ShapResult | null>(null)
  const [orderedStep, setOrderedStep] = useState<OrderedStep | null>(null)
  const [health, setHealth] = useState<Health | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [surfaceView, setSurfaceView] = useState<'2d' | '3d'>('3d')
  const [theme, setTheme] = useState<'light' | 'dark'>(() => window.localStorage.getItem('catboost-theme') === 'dark' ? 'dark' : 'light')

  useEffect(() => { document.body.classList.remove('nav-open') }, [page])
  useEffect(() => { window.localStorage.setItem('catboost-theme', theme) }, [theme])

  useEffect(() => {
    let active = true
    let loaded = false
    async function refresh() {
      try {
        const response = await fetch(apiUrl('/api/health'))
        if (!response.ok) throw new Error('Could not check the API health.')
        const status = await response.json() as Health
        if (!active) return
        setHealth(status)
        if (status.dataset_loaded && !loaded) {
          const datasetResponse = await fetch(apiUrl('/api/dataset'))
          if (!datasetResponse.ok) throw new Error('Could not restore the active dataset.')
          const restored = await datasetResponse.json() as DatasetProfile
          if (!active) return
          loaded = true
          applyDataset(restored)
        } else if (!status.dataset_loaded) {
          loaded = false
          if (active) setData(null)
        }
      } catch {
        if (active) setHealth(null)
      }
    }
    function applyDataset(profile: DatasetProfile) {
      const firstMissing = profile.features.find((feature) => feature.missing > 0 && feature.type === 'Numerical')
        ?? profile.features.find((feature) => feature.missing > 0)
      setData(profile)
      setTarget(profile.target)
      setTask(profile.task)
      setSelectedFeature(firstMissing?.name ?? profile.features.find((feature) => feature.type === 'Numerical')?.name ?? profile.features[0]?.name ?? '')
      setMethod(firstMissing?.type === 'Categorical' ? 'mode' : 'median')
      setSample(1)
    }
    void refresh()
    const timer = window.setInterval(() => void refresh(), 3000)
    return () => { active = false; window.clearInterval(timer) }
  }, [])

  useEffect(() => {
    if (!trained || trained.target !== target || trained.task !== task || !data || !health?.dataset_loaded) return
    let active = true
    const controller = new AbortController()
    const sampleIndex = Math.min(Math.max(sample - 1, 0), data.preview.length - 1)
    const row = data.preview[sampleIndex]
    if (!row) return
    async function refreshExplanation() {
      try {
        const [shapResponse, predictionResponse] = await Promise.all([
          fetch(apiUrl(`/api/shap?sample=${sampleIndex}`), { signal: controller.signal }),
          fetch(apiUrl('/api/predict'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ row }),
            signal: controller.signal,
          }),
        ])
        const shapPayload = await shapResponse.json()
        const predictionPayload = await predictionResponse.json()
        if (!shapResponse.ok) throw new Error(shapPayload.detail || 'Could not calculate SHAP values.')
        if (!predictionResponse.ok) throw new Error(predictionPayload.detail || 'Could not calculate the prediction.')
        if (active) {
          setShap(shapPayload as ShapResult)
          setPrediction(predictionPayload as PredictionResult)
          setMessage('')
        }
      } catch (error) {
        if (!controller.signal.aborted && active) setMessage(error instanceof Error ? error.message : 'Could not calculate the explanation.')
      }
    }
    void refreshExplanation()
    return () => { active = false; controller.abort() }
  }, [data, health?.dataset_loaded, sample, target, task, trained])

  useEffect(() => {
    if (!trained || trained.target !== target || trained.task !== task || !data || !health?.dataset_loaded) return
    let active = true
    const controller = new AbortController()
    const feature = data.features.find((item) => item.type === 'Categorical')?.name ?? selectedFeature
    if (!feature) return
    fetch(apiUrl(`/api/ordered-step?iteration=${iteration}&selected_row=${Math.min(sample - 1, data.rows - 1)}&feature=${encodeURIComponent(feature)}`), { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.detail || 'Could not calculate ordered statistics.')
        return result as OrderedStep
      })
      .then((result) => { if (active) setOrderedStep(result) })
      .catch((error: unknown) => { if (!controller.signal.aborted && active) setMessage(error instanceof Error ? error.message : 'Could not calculate ordered statistics.') })
    return () => { active = false; controller.abort() }
  }, [data, health?.dataset_loaded, iteration, sample, selectedFeature, target, task, trained])

  async function upload(file?: File) {
    if (!file) return
    setBusy(true)
    setMessage('')
    try {
      const form = new FormData()
      form.append('file', file)
      const response = await fetch(apiUrl('/api/dataset/upload'), { method: 'POST', body: form })
      const result = await response.json()
      if (!response.ok) throw new Error(result.detail || 'Upload failed.')
      const profile = result as DatasetProfile
      const firstMissing = profile.features.find((feature) => feature.missing > 0 && feature.type === 'Numerical')
        ?? profile.features.find((feature) => feature.missing > 0)
      setData(profile)
      setTarget(profile.target)
      setTask(profile.task)
      setSelectedFeature(firstMissing?.name ?? profile.features.find((feature) => feature.type === 'Numerical')?.name ?? profile.features[0]?.name ?? '')
      setMethod(firstMissing?.type === 'Categorical' ? 'mode' : 'median')
      setSample(1)
      setTrained(null)
      setShap(null)
      setPrediction(null)
      setPage('Dataset')
      setMessage(`${file.name} loaded · ${profile.rows.toLocaleString()} rows`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not upload the CSV.')
    } finally {
      setBusy(false)
    }
  }

  async function loadSample(path: string) {
    if (!path) return
    try {
      const response = await fetch(path)
      if (!response.ok) throw new Error(`Could not load sample CSV: ${path}`)
      const name = path.split('/').pop() ?? 'sample.csv'
      await upload(new File([await response.blob()], name, { type: 'text/csv' }))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load sample CSV.')
    }
  }

  async function impute(allMissing = false) {
    if (!data) return
    const missingFeatures = data.features.filter((feature) => feature.missing > 0)
    const columns = allMissing
      ? missingFeatures.filter((feature) => feature.missing < data.rows && (method === 'mode' || feature.type === 'Numerical')).map((feature) => feature.name)
      : selectedFeature ? [selectedFeature] : []
    if (!columns.length) {
      setMessage(method === 'mode' ? 'There are no missing values to fill.' : 'No numeric columns with missing values can use mean or median.')
      return
    }
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch(apiUrl('/api/dataset/impute'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, columns }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.detail || 'Imputation failed.')
      setData(result as DatasetProfile)
      setTrained(null)
      setShap(null)
      setPrediction(null)
      const skippedCategorical = allMissing && method !== 'mode' ? missingFeatures.filter((feature) => feature.type === 'Categorical' && feature.missing < data.rows).length : 0
      const entirelyEmpty = allMissing ? missingFeatures.filter((feature) => feature.missing === data.rows).length : 0
      setMessage(`${columns.length === 1 ? columns[0] : `${columns.length} columns`} filled with ${method}.${skippedCategorical ? ` ${skippedCategorical} categorical column(s) skipped; choose mode to fill those.` : ''}${entirelyEmpty ? ` ${entirelyEmpty} entirely empty column(s) still need observed values.` : ''} Train again to update visualizations.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not impute missing values.')
    } finally {
      setBusy(false)
    }
  }

  async function chooseTarget(value: string) {
    if (!value || !data) return
    setTarget(value)
    setTrained(null)
    setShap(null)
    setPrediction(null)
    try {
      const response = await fetch(apiUrl(`/api/dataset?target=${encodeURIComponent(value)}&task=${task}`))
      const result = await response.json()
      if (!response.ok) throw new Error(result.detail || 'Could not profile the selected target.')
      const profile = result as DatasetProfile
      setData(profile)
      setTask(profile.task)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not profile the selected target.')
    }
  }

  async function chooseTask(value: 'classification' | 'regression') {
    setTask(value)
    setTrained(null)
    setShap(null)
    setPrediction(null)
    if (!data) return
    try {
      const response = await fetch(apiUrl(`/api/dataset?target=${encodeURIComponent(target)}&task=${value}`))
      const result = await response.json()
      if (!response.ok) throw new Error(result.detail || 'Could not profile the selected task.')
      setData(result as DatasetProfile)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not profile the selected task.')
    }
  }

  async function train() {
    if (!data) {
      setPage('Dataset')
      setMessage('Load a CSV dataset before training.')
      return
    }
    setBusy(true)
    setMessage('')
    setTrained(null)
    setShap(null)
    setPrediction(null)
    try {
      const response = await fetch(apiUrl('/api/train'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, task, iterations, depth, learning_rate: rate }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.detail || 'Training failed.')
      const model = result as TrainingResult
      setTrained(model)
      setIteration(model.best_iteration ?? model.iterations)
      setMessage(`Model trained in ${model.training_time.toFixed(2)} seconds.`)
      setPage('Training')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not train the model.')
    } finally {
      setBusy(false)
    }
  }

  const fitted = Boolean(trained && trained.task === task && data)
  const activePage: Page = pages.some((item) => item.name === page) ? page : 'Dataset'
  const navGroups = [...new Set(pages.map((item) => item.group))]
  const maxIterations = trained?.iterations ?? iterations
  const selectedHistory = trained?.train_history.find((point) => point.iteration >= iteration)
  const bestValidation = trained?.train_history.reduce<TrainingHistoryPoint | null>((best, point) => {
    if (!best) return point
    return trained.task === 'regression'
      ? point.validation < best.validation ? point : best
      : point.validation < best.validation ? point : best
  }, null)

  return <div className="studio-shell" data-theme={theme}>
    <aside className="studio-sidebar">
      <button className="studio-brand" onClick={() => setPage('Dataset')}><span className="brand-mark"><Layers3 size={19} /></span><span><b>CatBoost</b><small>Model studio</small></span></button>
      <div className="dataset-status"><span className={data ? 'status-dot ready' : 'status-dot'} /><span><b>{data?.name ?? 'No dataset loaded'}</b><small>{data ? `${data.rows.toLocaleString()} rows · ${task}` : 'Load data to get started'}</small></span><ChevronDown size={15} /></div>
      <nav className="studio-nav" aria-label="Main navigation">
        {navGroups.map((group) => <div className="studio-nav-group" key={group}>
          <span className="nav-group-label">{group}</span>
          {pages.filter((item) => item.group === group).map(({ name, icon: Icon }) => <button key={name} className={`studio-nav-item ${activePage === name ? 'active' : ''}`} onClick={() => { document.body.classList.remove('nav-open'); setPage(name) }}>
            <Icon size={17} strokeWidth={1.8} /><span>{name}</span>
            {name === 'Dataset' && data && <i className="nav-ready-mark" />}
          </button>)}
        </div>)}
      </nav>
      <div className="sidebar-footer">
        <div className="connection-status"><span className={`status-dot ${health?.status === 'ok' ? 'ready' : ''}`} />API {health?.status === 'ok' ? 'connected' : 'offline'}</div>
        <div className="sidebar-footer-links"><button onClick={() => setPage('Dataset')}><CircleHelp size={15} />Quick start</button><span>CatBoost model lab</span></div>
      </div>
    </aside>
    <main className="studio-main">
      <header className="studio-topbar">
        <button className="mobile-menu icon-button" aria-label="Open navigation" onClick={() => document.body.classList.toggle('nav-open')}><Menu size={19} /></button>
        <div className="breadcrumb"><span>Model workspace</span><i>/</i><b>{activePage}</b></div>
        <div className="topbar-actions">
          {data && <label className="sample-control">Row <input type="number" aria-label="Selected row" min="1" max={data.rows} value={sample} onChange={(event) => setSample(Math.min(data.rows, Math.max(1, Number(event.target.value) || 1)))} /><span>/ {data.rows.toLocaleString()}</span></label>}
          <button className="theme-toggle icon-button" type="button" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}</button>
        </div>
      </header>
      <div className="studio-content">
        <header className="page-heading">
          <div><span className="eyebrow">CATBOOST MODEL STUDIO</span><h1>{activePage}</h1><p>{descriptions[activePage]}</p></div>
          <div className="heading-actions">
            {data && <label className="button-secondary"><Upload size={15} />Change CSV<input type="file" accept=".csv,text/csv" onChange={(event) => upload(event.target.files?.[0])} disabled={busy} /></label>}
            <button className="button-primary" onClick={train} disabled={busy || !health?.catboost_available}><Sparkles size={15} />{busy ? 'Working…' : fitted ? 'Retrain model' : 'Train model'}</button>
          </div>
        </header>
        {message && <div className="status-message" role="status">{message}<button aria-label="Dismiss" onClick={() => setMessage('')}><X size={15} /></button></div>}
        {!health?.catboost_available && health && <div className="status-message error" role="status">CatBoost is not available in the connected API. Check the backend Python environment.</div>}
        {activePage === 'Dataset' && <DatasetExplorer
          data={data}
          target={target}
          setTarget={chooseTarget}
          task={task}
          setTask={chooseTask}
          selectedFeature={selectedFeature}
          setSelectedFeature={setSelectedFeature}
          method={method}
          setMethod={setMethod}
          impute={impute}
          busy={busy}
          loadSample={loadSample}
          upload={upload}
        />}
        {activePage === 'Training' && (fitted && trained ? <div className="training-page">
          <div className="training-kpis">
            <article><span>{trained.history_metric}</span><b>{selectedHistory?.validation.toFixed(4) ?? '—'}</b><small>validation at iteration {selectedHistory?.iteration ?? iteration}</small></article>
            <article><span>Best validation</span><b>{bestValidation?.validation.toFixed(4) ?? '—'}</b><small>{bestValidation ? `iteration ${bestValidation.iteration}` : 'not reported'}</small></article>
            <article><span>Trees built</span><b>{trained.iterations.toLocaleString()}</b><small>of {iterations.toLocaleString()} requested</small></article>
            <article><span>Training time</span><b>{trained.training_time.toFixed(2)}s</b><small>elapsed time</small></article>
          </div>
          <section className="chart-card training-chart-card">
            <div className="chart-title"><b>Learning curve</b><span>{trained.history_metric} · {trained.task === 'regression' ? 'lower is better' : 'lower is better'}</span></div>
            <p className="chart-explainer">Training and validation metrics from the fitted CatBoost model. The dashed line marks the selected tree count.</p>
            {trained.train_history.length ? <div className="training-chart-area">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trained.train_history} margin={{ top: 18, right: 18, bottom: 8, left: 4 }}>
                  <CartesianGrid strokeDasharray="3 4" vertical={false} />
                  <XAxis dataKey="iteration" type="number" domain={[1, trained.iterations]} tickLine={false} />
                  <YAxis tickLine={false} width={62} />
                  <Tooltip labelFormatter={(value) => `Iteration ${value}`} />
                  <Line type="monotone" dataKey="train" name="Training" stroke="var(--chart-blue)" strokeWidth={2.7} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="validation" name="Validation" stroke="var(--chart-amber)" strokeWidth={2.7} dot={false} isAnimationActive={false} />
                  <ReferenceLine x={iteration} stroke="#68746c" strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </div> : <p className="empty-copy">This model did not return a training history.</p>}
            <label className="iteration-control">Selected iteration <b>{iteration}</b><input type="range" min="1" max={maxIterations} value={Math.min(iteration, maxIterations)} onChange={(event) => setIteration(Number(event.target.value))} /></label>
          </section>
          <section className="chart-card model-controls-card">
            <div className="chart-title"><b>Training configuration</b><span>Changes take effect on the next run.</span></div>
            <div className="training-settings">
              <label className="field-label">Target<select value={target} onChange={(event) => setTarget(event.target.value)}>{data?.features.map((feature) => <option key={feature.name}>{feature.name}</option>)}</select></label>
              <label className="field-label">Task<select value={task} onChange={(event) => setTask(event.target.value as 'classification' | 'regression')}><option value="classification">Classification</option><option value="regression">Regression</option></select></label>
              <label className="field-label">Iterations · {iterations}<input type="range" min="10" max="1000" step="10" value={iterations} onChange={(event) => setIterations(Number(event.target.value))} /></label>
              <label className="field-label">Tree depth · {depth}<input type="range" min="2" max="12" value={depth} onChange={(event) => setDepth(Number(event.target.value))} /></label>
              <label className="field-label">Learning rate · {rate.toFixed(2)}<input type="range" min=".01" max=".3" step=".01" value={rate} onChange={(event) => setRate(Number(event.target.value))} /></label>
              <button className="button-primary" onClick={train} disabled={busy}><Sparkles size={15} />{busy ? 'Training…' : 'Run training'}</button>
            </div>
          </section>
          <OrderedLearningSummary step={orderedStep} iteration={iteration} />
        </div> : <EmptyModel page="Training" navigate={() => setPage(data ? 'Dataset' : 'Dataset')} />)}
        {activePage === 'Evaluation' && (fitted && trained
          ? <ModelEvaluation result={trained} />
          : <EmptyModel page="Evaluation" navigate={() => setPage('Dataset')} />)}
        {activePage === 'Explain AI' && (fitted && data
          ? <div className="explain-page"><FeatureImportanceView result={trained!} shap={shap} /><ExplainabilityView result={shap} prediction={prediction} sample={sample} setSample={setSample} rowCount={data.rows} classLabels={trained!.evaluation.labels ?? []} /></div>
          : <EmptyModel page="Explain AI" navigate={() => setPage('Dataset')} />)}
        {activePage === '3D Explorer' && (fitted
          ? <div className="surface-page">
            <p className="chart-explainer">{task === 'regression'
              ? 'Choose one of four CatBoost regression views below. Polynomial-style describes the surface appearance, not a separate algorithm. Select two numeric features; other inputs stay at the training reference profile.'
              : 'The four screenshot-inspired views are for regression. To see them, choose a numeric target and Regression task in Training, retrain, then return here. Classification continues to show its probability response surface.'}</p>
            <div className="surface-mode-tabs view-mode-tabs" role="tablist" aria-label="Response surface dimension">
              <button className={surfaceView === '2d' ? 'selected' : ''} role="tab" aria-selected={surfaceView === '2d'} onClick={() => setSurfaceView('2d')}>2D heatmap</button>
              <button className={surfaceView === '3d' ? 'selected' : ''} role="tab" aria-selected={surfaceView === '3d'} onClick={() => setSurfaceView('3d')}>3D surface + data</button>
            </div>
            {surfaceView === '2d'
              ? <section className="chart-card"><div className="chart-title"><b>Model response heatmap</b><span>Color encodes predicted probability or target value.</span></div><BoundaryExplorer features={data?.features ?? []} target={target} iteration={iteration} setIteration={setIteration} task={task} maxIteration={trained?.iterations ?? 1} /></section>
              : <Suspense fallback={<div className="empty-state compact"><h2>Loading the 3D surface</h2><p>Preparing the interactive model response view.</p></div>}><ModelSurface3D features={data?.features ?? []} target={target} task={task} iteration={iteration} setIteration={setIteration} trainedIterations={trained?.iterations ?? 0} darkMode={theme === 'dark'} /></Suspense>}
          </div>
          : <EmptyModel page="3D Explorer" navigate={() => setPage('Training')} />)}
        {activePage === 'Tuning' && (data
          ? <ExperimentRunner target={target} task={task} depth={depth} setDepth={setDepth} rate={rate} setRate={setRate} onTrainingComplete={(result) => { setTrained(result); setIteration(result.best_iteration ?? result.iterations); setShap(null); setPrediction(null) }} />
          : <EmptyModel page="Tuning" navigate={() => setPage('Dataset')} />)}
        {activePage === 'CatBoost Guide' && <CatBoostGuide navigate={setPage} />}
        <footer className="studio-footer"><span>CatBoost model studio</span><span>{data ? `${data.name} · ${data.rows.toLocaleString()} rows` : 'Ready for your dataset'}</span></footer>
      </div>
    </main>
  </div>
}

function EmptyModel({ page, navigate }: { page: string; navigate: () => void }) {
  return <div className="empty-state">
    <span className="empty-icon">↗</span><h2>{page} needs a trained model</h2>
    <p>Load a CSV, set the target and task, then train CatBoost to see real results here.</p>
    <button className="button-primary" onClick={navigate}>Open dataset setup</button>
  </div>
}

function OrderedLearningSummary({ step, iteration }: { step: OrderedStep | null; iteration: number }) {
  if (!step) return <details className="advanced-disclosure"><summary><span><GitBranch size={16} />Ordered categorical statistic</span><small>Train a model and load a dataset to inspect a real permutation.</small></summary></details>
  return <details className="advanced-disclosure">
    <summary><span><GitBranch size={16} />Ordered categorical statistic</span><small>Iteration {iteration} · selected category {String(step.category)}</small></summary>
    <p>Prior target statistic: <b>{step.statistic.toFixed(4)}</b> from {step.prior_target_sum} positive targets across {step.prior_count} matching preceding rows. Only earlier rows in the deterministic permutation contribute.</p>
  </details>
}
