import { useEffect, useState } from 'react'
import { apiUrl } from './api'
import './BoundaryExplorer.css'

type Feature = { name: string; type: string }
type BoundaryData = { feature_x: string; feature_y: string; x: number[]; y: number[]; predictions: number[]; samples: Array<Record<string, number | string | null> & { target?: number | string | null; row?: number }>; classes: Array<string | number>; iteration: number }

const CLASS_COLORS = ['#267b66', '#d2864f', '#6175b5', '#a35d76', '#7b6a36', '#5a8c91']

export function BoundaryExplorer({ features, target, iteration, setIteration, task, maxIteration }: { features: Feature[]; target: string; iteration: number; setIteration: (value: number) => void; task: string; maxIteration: number }) {
  const numeric = features.filter((feature) => feature.type === 'Numerical' && feature.name !== target)
  const [featureX, setFeatureX] = useState(numeric[0]?.name ?? '')
  const [featureY, setFeatureY] = useState(numeric[1]?.name ?? numeric[0]?.name ?? '')
  const [result, setResult] = useState<BoundaryData | null>(null)
  const [error, setError] = useState('')
  const featureKey = numeric.map((feature) => feature.name).join('|')
  const activeX = numeric.some((feature) => feature.name === featureX) ? featureX : numeric[0]?.name ?? ''
  const activeY = numeric.some((feature) => feature.name === featureY && feature.name !== activeX) ? featureY : numeric.find((feature) => feature.name !== activeX)?.name ?? ''
  const selectedIteration = Math.min(iteration, maxIteration)
  const readyResult = result?.feature_x === activeX && result.feature_y === activeY && result.iteration === selectedIteration ? result : null

  useEffect(() => {
    if (!activeX || !activeY || activeX === activeY) return
    const controller = new AbortController()
    fetch(apiUrl(`/api/boundary?feature_x=${encodeURIComponent(activeX)}&feature_y=${encodeURIComponent(activeY)}&iteration=${selectedIteration}`), { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.detail || 'Train a model to render its boundary.')
        return payload as BoundaryData
      })
      .then((payload) => { setResult(payload); setError('') })
      .catch((reason: unknown) => { if (!controller.signal.aborted) { setResult(null); setError(reason instanceof Error ? reason.message : 'Boundary data is unavailable.') } })
    return () => controller.abort()
  }, [activeX, activeY, selectedIteration, featureKey])

  const width = 760
  const height = 500
  const plot = { left: 78, top: 24, width: 650, height: 385 }
  const minPrediction = Math.min(...(readyResult?.predictions ?? [0]))
  const maxPrediction = Math.max(...(readyResult?.predictions ?? [1]))
  const spread = maxPrediction - minPrediction || 1
  const sampleX = readyResult?.x ?? []
  const sampleY = readyResult?.y ?? []
  return <div className="boundary-explorer">
    <div className="boundary-controls"><label>Feature 1<select value={activeX} onChange={(event) => setFeatureX(event.target.value)}>{numeric.map((feature) => <option key={feature.name}>{feature.name}</option>)}</select></label><label>Feature 2<select value={activeY} onChange={(event) => setFeatureY(event.target.value)}>{numeric.filter((feature) => feature.name !== activeX).map((feature) => <option key={feature.name}>{feature.name}</option>)}</select></label><label>Tree count <b>{selectedIteration}</b><input type="range" min="1" max={Math.max(1, maxIteration)} value={selectedIteration} onChange={(event) => setIteration(Number(event.target.value))} /></label></div>
    {readyResult ? <div className="boundary-live-plot"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${task} decision boundary at iteration ${readyResult.iteration}`}>
      {readyResult.predictions.map((prediction, index) => {
        const columns = readyResult.x.length
        const rows = readyResult.y.length
        const column = index % columns
        const row = Math.floor(index / columns)
        const ratio = Math.max(0, Math.min(1, (prediction - minPrediction) / spread))
        const red = Math.round(52 + (27 - 52) * ratio)
        const green = Math.round(120 + (184 - 120) * ratio)
        const blue = Math.round(246 + (187 - 246) * ratio)
        return <rect key={index} x={plot.left + column * plot.width / columns} y={plot.top + (rows - row - 1) * plot.height / rows} width={plot.width / columns + .5} height={plot.height / rows + .5} fill={`rgba(${red},${green},${blue},${.24 + ratio * .28})`}>
          <title>{`${activeX} ${sampleX[column]?.toPrecision(4)}, ${activeY} ${sampleY[row]?.toPrecision(4)} · response ${prediction.toPrecision(4)}`}</title>
        </rect>
      })}
      {[0, .5, 1].map((fraction) => <g key={`grid-${fraction}`}>
        <line x1={plot.left + fraction * plot.width} x2={plot.left + fraction * plot.width} y1={plot.top} y2={plot.top + plot.height} className="boundary-gridline" />
        <line x1={plot.left} x2={plot.left + plot.width} y1={plot.top + fraction * plot.height} y2={plot.top + fraction * plot.height} className="boundary-gridline" />
      </g>)}
      {readyResult.samples.map((sample, index) => {
        const xValue = sample[activeX]
        const yValue = sample[activeY]
        if (xValue === null || yValue === null || xValue === undefined || yValue === undefined) return null
        const numericX = Number(xValue)
        const numericY = Number(yValue)
        if (!Number.isFinite(numericX) || !Number.isFinite(numericY)) return null
        const x = plot.left + (numericX - sampleX[0]) / (sampleX[sampleX.length - 1] - sampleX[0] || 1) * plot.width
        const y = plot.top + plot.height - (numericY - sampleY[0]) / (sampleY[sampleY.length - 1] - sampleY[0] || 1) * plot.height
        const classIndex = readyResult.classes.findIndex((label) => String(label) === String(sample.target))
        const color = task === 'classification' && classIndex >= 0 ? CLASS_COLORS[classIndex % CLASS_COLORS.length] : '#344f40'
        return <circle key={index} cx={x} cy={y} r="2.6" fill={color} stroke="white" strokeWidth=".8">
          <title>{`Row ${(sample.row ?? index) + 1}: ${activeX} ${xValue}, ${activeY} ${yValue}${sample.target === null || sample.target === undefined ? '' : ` · actual ${sample.target}`}`}</title>
        </circle>
      })}
      <line x1={plot.left} x2={plot.left + plot.width} y1={plot.top + plot.height} y2={plot.top + plot.height} className="boundary-axis" />
      <line x1={plot.left} x2={plot.left} y1={plot.top} y2={plot.top + plot.height} className="boundary-axis" />
      {[0, .5, 1].map((fraction) => {
        const index = Math.round(fraction * (sampleX.length - 1))
        const yIndex = Math.round(fraction * (sampleY.length - 1))
        return <g key={`ticks-${fraction}`} className="boundary-tick">
          <text x={plot.left + fraction * plot.width} y={plot.top + plot.height + 22} textAnchor="middle">{sampleX[index]?.toPrecision(4)}</text>
          <text x={plot.left - 12} y={plot.top + plot.height - fraction * plot.height + 4} textAnchor="end">{sampleY[yIndex]?.toPrecision(4)}</text>
        </g>
      })}
      <text x={plot.left + plot.width / 2} y="475" textAnchor="middle" className="boundary-axis-label">{activeX}</text>
      <text x="19" y={plot.top + plot.height / 2} textAnchor="middle" className="boundary-axis-label" transform={`rotate(-90 19 ${plot.top + plot.height / 2})`}>{activeY}</text>
    </svg><div className="boundary-legend">
      <span><i className="boundary-response-range" />Predicted {task === 'classification' ? 'probability' : 'value'} <b>{minPrediction.toPrecision(3)}–{maxPrediction.toPrecision(3)}</b></span>
      {task === 'classification' ? readyResult.classes.map((label, index) => <span key={String(label)}><i className="boundary-observation" style={{ background: CLASS_COLORS[index % CLASS_COLORS.length] }} />Observed {String(label)}</span>) : <span><i className="boundary-observation" />Observed rows</span>}
      <span>{activeX} × {activeY}</span>
    </div></div> : <div className="boundary-empty"><span>{!activeX || !activeY ? 'Choose two numeric features to inspect the model boundary.' : error || 'Computing the model boundary…'}</span></div>}
  </div>
}