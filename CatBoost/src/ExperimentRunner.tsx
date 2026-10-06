import { useEffect, useState } from 'react'
import { FlaskConical } from 'lucide-react'
import './ExperimentRunner.css'

type Experiment = { run_id: number; configuration: { iterations: number; depth: number; learning_rate: number }; metrics: Record<string, number>; training_time: number; iterations: number }

export function ExperimentRunner({ target, task, depth, setDepth, rate, setRate }: { target: string; task: string; depth: number; setDepth: (value: number) => void; rate: number; setRate: (value: number) => void }) {
  const [iterations, setIterations] = useState(200)
  const [l2, setL2] = useState(3)
  const [randomStrength, setRandomStrength] = useState(1)
  const [runs, setRuns] = useState<Experiment[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('/api/experiments').then((response) => response.json()).then((result) => setRuns(result.experiments ?? [])).catch(() => {})
  }, [])

  async function runExperiment() {
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch('/api/experiments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target, task, iterations, depth, learning_rate: rate, l2_leaf_reg: l2, random_strength: randomStrength }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.detail || 'Experiment failed')
      setRuns((current) => [...current, result])
      setMessage(`Run ${result.run_id} completed in ${result.training_time.toFixed(2)} seconds.`)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Experiment failed') }
    finally { setBusy(false) }
  }

  return <div className="experiment-layout"><section className="panel experiment-controls"><header className="panel-head"><div><h2>Experiment configuration</h2><p>Change parameters and compare on the same validation split.</p></div></header><div className="setting-fields">
    <label>Iterations <input type="number" min="10" max="1000" step="10" value={iterations} onChange={(event) => setIterations(Math.max(10, Math.min(1000, Number(event.target.value))))} /></label>
    <label>Tree depth · {depth}<input type="range" min="2" max="10" value={depth} onChange={(event) => setDepth(Number(event.target.value))} /></label>
    <label>Learning rate · {rate.toFixed(2)}<input type="range" min=".01" max=".3" step=".01" value={rate} onChange={(event) => setRate(Number(event.target.value))} /></label>
    <label>L2 regularization<input type="number" min="0" max="100" value={l2} onChange={(event) => setL2(Number(event.target.value))} /></label>
    <label>Random strength<input type="number" min="0" max="100" value={randomStrength} onChange={(event) => setRandomStrength(Number(event.target.value))} /></label>
    <label>Loss function<select value={task === 'regression' ? 'RMSE' : 'Logloss'} disabled><option>Logloss</option><option>RMSE</option></select></label>
    <button className="primary-button" onClick={runExperiment} disabled={busy}><FlaskConical size={14} />{busy ? 'Training…' : 'Run experiment'}</button>
    {message && <p className="experiment-message" role="status">{message}</p>}
  </div></section><section className="panel experiment-history"><header className="panel-head"><div><h2>Experiment history</h2><p>{runs.length} run{runs.length === 1 ? '' : 's'} · {task} · target {target}</p></div></header><div className="table-scroll"><table><thead><tr><th>RUN</th><th>DEPTH</th><th>RATE</th><th>ITERATIONS</th><th>VALIDATION</th><th>TIME</th></tr></thead><tbody>{runs.map((run) => <tr key={run.run_id}><td>Experiment {run.run_id}</td><td>{run.configuration.depth}</td><td>{run.configuration.learning_rate.toFixed(2)}</td><td>{run.iterations}</td><td>{(run.metrics.accuracy ?? run.metrics.r2 ?? run.metrics.rmse)?.toFixed(3) ?? '—'}</td><td>{run.training_time.toFixed(2)}s</td></tr>)}</tbody></table>{!runs.length && <p className="experiment-empty">Run an experiment to add model results to this history.</p>}</div></section></div>
}