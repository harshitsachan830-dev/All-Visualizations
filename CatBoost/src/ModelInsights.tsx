import { Pause, Play, RotateCcw } from 'lucide-react'
import './ModelInsights.css'

type OrderedInfo = { category: unknown; prior_count: number; prior_target_sum: number; statistic: number }
type ShapResult = { feature_names: string[]; shap_values: number[]; base_value: number; global_importance: { feature: string; mean_abs_shap: number }[] }
type PredictionResult = { prediction: string | number; probabilities?: Record<string, number>; contributions: { feature: string; value: unknown; shap_value: number }[] }

export function OrderedBoostingView({ iteration, setIteration, sample, setSample, playing, setPlaying, info }: { iteration: number; setIteration: (value: number) => void; sample: number; setSample: (value: number) => void; playing: boolean; setPlaying: (value: boolean) => void; info: OrderedInfo | null }) {
  const priorCount = info?.prior_count ?? 4
  const priorSum = info?.prior_target_sum ?? 2
  const statistic = info?.statistic ?? 0.5
  return <div className="boosting">
    <div className="steps">{['Permute rows', 'Ordered stats', 'Grow tree', 'Update residuals', 'Add to ensemble'].map((label, index) => <div className={index <= iteration % 5 ? 'current' : ''} key={label}><b>{`0${index + 1}`}</b>{label}</div>)}</div>
    <div className="row-card"><div className="row-caption">PERMUTED TRAINING ROWS <span>seed 42 · round {Math.floor(iteration / 5) + 1}</span></div>
      <div className="row-line"><small>ROW</small>{[5, 2, 8, 1, 6, 4, 3, 7].map((row) => <button key={row} className={row === sample % 8 + 1 ? 'chosen' : ''} onClick={() => setSample(row)}>{`0${row}`}</button>)}</div>
      <div className="row-line targets"><small>Y</small>{['No', 'Yes', 'No', 'Yes', 'No', 'Yes', 'No', 'No'].map((label, index) => <span className={label === 'Yes' ? 'yes' : ''} key={index}>{label}</span>)}</div>
      <div className="stat-box"><span className="feature-monogram">O</span><span><b>Ordered target statistic</b><small>Category = {String(info?.category ?? 'Month-to-month')} · {priorCount} eligible prior rows</small></span><strong>({priorSum} + 0.5) / ({priorCount} + 1)<b>{statistic.toFixed(3)}</b></strong></div>
    </div>
    <div className="boost-controls"><button aria-label="Previous iteration" onClick={() => setIteration(Math.max(1, iteration - 1))}>‹</button><button className="play" aria-label={playing ? 'Pause' : 'Play'} onClick={() => setPlaying(!playing)}>{playing ? <Pause size={13} /> : <Play size={13} fill="currentColor" />}</button><button aria-label="Next iteration" onClick={() => setIteration(Math.min(200, iteration + 1))}>›</button><button className="reset" aria-label="Reset" onClick={() => { setPlaying(false); setIteration(1) }}><RotateCcw size={12} /></button><label><input aria-label="Boosting iteration" type="range" min="1" max="200" value={iteration} onChange={(event) => setIteration(Number(event.target.value))} /><span>Iteration <b>{iteration}</b> / 200</span></label><select aria-label="Playback speed"><option>1×</option><option>0.5×</option><option>2×</option></select></div>
  </div>
}

export function ExplanationView({ shap, prediction, sample, setSample }: { shap: ShapResult | null; prediction: PredictionResult | null; sample: number; setSample: (value: number) => void }) {
  const ranked = shap?.global_importance.slice().sort((a, b) => b.mean_abs_shap - a.mean_abs_shap).slice(0, 6)
  const output = prediction ? String(prediction.prediction) : 'No churn'
  const probability = prediction?.probabilities?.[output]
  const contributions = prediction?.contributions.slice(0, 5) ?? []
  return <div className="insight-view">
    <div className="insight-summary"><span>GLOBAL FEATURE IMPACT</span>{ranked?.length ? ranked.map((item) => <div key={item.feature}><b>{item.feature}</b><i><em style={{ width: `${Math.min(100, item.mean_abs_shap * 100)}%` }} /></i><small>{item.mean_abs_shap.toFixed(3)}</small></div>) : <p>Train a model to compute global SHAP values for this dataset.</p>}</div>
    <div className="insight-local"><span>LOCAL PREDICTION · SAMPLE #{sample}</span><div className="insight-prediction"><b>{output}</b>{probability === undefined ? <small>Awaiting trained prediction</small> : <strong>{(probability * 100).toFixed(1)}%</strong>}</div><label>Sample index<input aria-label="Sample index" type="number" min="1" value={sample} onChange={(event) => setSample(Math.max(1, Number(event.target.value)))} /></label>{contributions.length ? contributions.map((item) => <div className="insight-contribution" key={item.feature}><span>{item.feature}<small>{String(item.value ?? 'missing')}</small></span><i><em style={{ width: `${Math.min(100, Math.abs(item.shap_value) * 100)}%`, marginLeft: item.shap_value < 0 ? 'auto' : 0 }} /></i><b className={item.shap_value < 0 ? 'negative' : ''}>{item.shap_value > 0 ? '+' : ''}{item.shap_value.toFixed(3)}</b></div>) : <p>Select a sample after training to load local contributions.</p>}</div>
  </div>
}