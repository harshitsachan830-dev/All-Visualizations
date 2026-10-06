import { useEffect, useState } from 'react'
import './BoundaryExplorer.css'

type Feature = { name: string; type: string }
type BoundaryData = { feature_x: string; feature_y: string; x: number[]; y: number[]; predictions: number[]; samples: Record<string, number | null>[]; iteration: number }

export function BoundaryExplorer({ features, target, iteration, setIteration, task }: { features: Feature[]; target: string; iteration: number; setIteration: (value: number) => void; task: string }) {
  const numeric = features.filter((feature) => feature.type === 'Numerical' && feature.name !== target)
  const [featureX, setFeatureX] = useState(numeric[0]?.name ?? '')
  const [featureY, setFeatureY] = useState(numeric[1]?.name ?? numeric[0]?.name ?? '')
  const [result, setResult] = useState<BoundaryData | null>(null)
  const [error, setError] = useState('')
  const featureKey = numeric.map((feature) => feature.name).join('|')
  const activeX = numeric.some((feature) => feature.name === featureX) ? featureX : numeric[0]?.name ?? ''
  const activeY = numeric.some((feature) => feature.name === featureY && feature.name !== activeX) ? featureY : numeric.find((feature) => feature.name !== activeX)?.name ?? ''
  const readyResult = result?.feature_x === activeX && result.feature_y === activeY && result.iteration === iteration ? result : null

  useEffect(() => {
    if (!activeX || !activeY || activeX === activeY) return
    const controller = new AbortController()
    fetch(`/api/boundary?feature_x=${encodeURIComponent(activeX)}&feature_y=${encodeURIComponent(activeY)}&iteration=${iteration}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.detail || 'Train a model to render its boundary.')
        return payload as BoundaryData
      })
      .then((payload) => { setResult(payload); setError('') })
      .catch((reason: unknown) => { if (!controller.signal.aborted) { setResult(null); setError(reason instanceof Error ? reason.message : 'Boundary data is unavailable.') } })
    return () => controller.abort()
  }, [activeX, activeY, iteration, featureKey])

  const width = 320
  const height = 210
  const minPrediction = Math.min(...(readyResult?.predictions ?? [0]))
  const maxPrediction = Math.max(...(readyResult?.predictions ?? [1]))
  const spread = maxPrediction - minPrediction || 1
  const sampleX = readyResult?.x ?? []
  const sampleY = readyResult?.y ?? []
  return <div className="boundary-explorer">
    <div className="boundary-controls"><label>Feature 1<select value={activeX} onChange={(event) => setFeatureX(event.target.value)}>{numeric.map((feature) => <option key={feature.name}>{feature.name}</option>)}</select></label><label>Feature 2<select value={activeY} onChange={(event) => setFeatureY(event.target.value)}>{numeric.filter((feature) => feature.name !== activeX).map((feature) => <option key={feature.name}>{feature.name}</option>)}</select></label><label>Iteration <b>{iteration}</b><input type="range" min="1" max="200" value={iteration} onChange={(event) => setIteration(Number(event.target.value))} /></label></div>
    {readyResult ? <div className="boundary-live-plot"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${task} decision boundary at iteration ${readyResult.iteration}`}>
      {readyResult.predictions.map((prediction, index) => {
        const columns = readyResult.x.length
        const rows = readyResult.y.length
        const column = index % columns
        const row = Math.floor(index / columns)
        const ratio = Math.max(0, Math.min(1, (prediction - minPrediction) / spread))
        const color = task === 'classification' ? (ratio >= .5 ? '108,83,225' : '211,132,92') : '108,83,225'
        return <rect key={index} x={column * width / columns} y={(rows - row - 1) * height / rows} width={width / columns + .4} height={height / rows + .4} fill={`rgba(${color},${.09 + ratio * .28})`} />
      })}
      {readyResult.samples.map((sample, index) => {
        const xValue = sample[activeX]
        const yValue = sample[activeY]
        if (xValue === null || yValue === null || xValue === undefined || yValue === undefined) return null
        const x = (xValue - sampleX[0]) / (sampleX[sampleX.length - 1] - sampleX[0] || 1) * width
        const y = height - (yValue - sampleY[0]) / (sampleY[sampleY.length - 1] - sampleY[0] || 1) * height
        return <circle key={index} cx={x} cy={y} r="2.6" fill={index % 3 ? '#7058df' : '#d08453'} stroke="white" strokeWidth=".8" />
      })}
    </svg><div className="boundary-legend"><span><i className="boundary-class-a" />Class region A</span><span><i className="boundary-class-b" />Class region B</span><span>{activeX} × {activeY}</span></div></div> : <div className="boundary-empty"><span>{!activeX || !activeY ? 'Choose two numeric features to inspect the model boundary.' : error || 'Computing the model boundary…'}</span></div>}
  </div>
}