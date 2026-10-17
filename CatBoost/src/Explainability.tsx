import { useMemo, useState } from 'react'
import type { ShapResult, TrainingResult } from './visualizationTypes'

const palette = ['#277b66', '#d2864f', '#6175b5', '#a35d76', '#7b6a36', '#5a8c91']

function numericValue(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function ShapSummary({ result }: { result: ShapResult }) {
  const rows = result.summary.slice(0, 12)
  const maxAbs = Math.max(0.001, ...rows.flatMap((row) => row.points.map((point) => Math.abs(point.shap_value))))
  const left = 180
  const right = 940
  const rowHeight = 34
  const top = 20
  const height = top + rows.length * rowHeight + 30
  const x = (value: number) => left + ((value + maxAbs) / (2 * maxAbs)) * (right - left)
  return <div className="shap-summary">
    <div className="chart-title"><b>SHAP summary</b><span>Each dot is a validation row; horizontal position is its contribution to model output.</span></div>
    <div className="shap-svg-scroll">
      <svg viewBox={`0 0 960 ${height}`} role="img" aria-label="SHAP summary plot of feature contributions and feature values">
        <line x1={x(0)} x2={x(0)} y1={top - 8} y2={top + rows.length * rowHeight} className="shap-zero-line" />
        {rows.map((row, rowIndex) => {
          const values = row.points.map((point) => numericValue(point.feature_value))
          const numeric = row.feature_type === 'Numerical' && values.every((value) => value !== null)
          const numericValues = values.filter((value): value is number => value !== null)
          const valueMin = Math.min(...numericValues, 0)
          const valueMax = Math.max(...numericValues, 1)
          const categories = [...new Set(row.points.map((point) => String(point.feature_value ?? 'Missing')))]
          return <g key={row.feature}>
            <text x="8" y={top + rowIndex * rowHeight + 4} className="shap-feature-label">{row.feature}</text>
            {row.points.map((point, pointIndex) => {
              const number = numericValue(point.feature_value)
              const color = numeric && number !== null
                ? `hsl(${Math.round(221 - (number - valueMin) / (valueMax - valueMin || 1) * 174)} 66% 48%)`
                : palette[Math.max(0, categories.indexOf(String(point.feature_value ?? 'Missing'))) % palette.length]
              const jitter = ((pointIndex * 17 + rowIndex * 11) % 15) - 7
              return <circle
                key={`${row.feature}-${pointIndex}`}
                cx={x(point.shap_value)}
                cy={top + rowIndex * rowHeight + jitter}
                r="3.2"
                fill={color}
                fillOpacity=".76"
              >
                <title>{`${row.feature}: ${String(point.feature_value ?? 'missing')} · SHAP ${point.shap_value.toFixed(4)}`}</title>
              </circle>
            })}
            <text x="952" y={top + rowIndex * rowHeight + 4} textAnchor="end" className="shap-importance-label">{row.mean_abs_shap.toFixed(3)}</text>
          </g>
        })}
        <line x1={left} x2={right} y1={top + rows.length * rowHeight + 5} y2={top + rows.length * rowHeight + 5} className="shap-axis-line" />
        {[-1, -0.5, 0, 0.5, 1].map((fraction) => {
          const value = fraction * maxAbs
          return <g key={fraction}>
            <line x1={x(value)} x2={x(value)} y1={top + rows.length * rowHeight + 5} y2={top + rows.length * rowHeight + 9} className="shap-axis-line" />
            <text x={x(value)} y={height - 5} textAnchor="middle" className="shap-axis-label">{value.toFixed(2)}</text>
          </g>
        })}
      </svg>
    </div>
    <div className="shap-legend">
      <span><i className="shap-low" />Lower feature value</span>
      <span><i className="shap-high" />Higher feature value</span>
      <span>Color represents the actual feature value; categories use distinct hues.</span>
    </div>
    <p className="chart-explainer">Features are ordered by mean absolute SHAP value. Positive contributions move the model output higher; negative contributions move it lower. Attribution is not causation, and correlated features can share attribution.</p>
  </div>
}

function ShapWaterfall({ featureNames, featureValues, values, baseValue, title }: {
  featureNames: string[]
  featureValues: unknown[]
  values: number[]
  baseValue: number
  title: string
}) {
  const impacts = useMemo(() => values.map((value, index) => ({
    name: featureNames[index] ?? `Feature ${index + 1}`,
    featureValue: featureValues[index],
    value,
  })).sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).slice(0, 8), [featureNames, featureValues, values])
  const total = values.reduce((sum, value) => sum + value, baseValue)
  const cumulative = [baseValue]
  impacts.forEach((impact) => cumulative.push(cumulative.at(-1)! + impact.value))
  const min = Math.min(0, ...cumulative)
  const max = Math.max(0, ...cumulative)
  const span = max - min || 1
  const y = (value: number) => 20 + (1 - (value - min) / span) * 190
  const chartWidth = Math.max(720, impacts.length * 88 + 140)
  const plotWidth = chartWidth - 100
  const stepWidth = Math.min(54, plotWidth / (impacts.length + 1) * 0.58)
  const stepGap = plotWidth / (impacts.length + 1)
  return <div className="waterfall-wrap">
    <div className="chart-title"><b>{title}</b><span>Baseline + feature contributions = model output on the raw prediction scale.</span></div>
    <div className="waterfall-scroll">
      <svg viewBox={`0 0 ${chartWidth} 290`} role="img" aria-label="SHAP waterfall showing the baseline and ordered feature contributions">
        {[0, 0.5, 1].map((fraction) => {
          const value = min + span * fraction
          return <g key={fraction}>
            <line x1="76" x2={chartWidth - 16} y1={y(value)} y2={y(value)} className="waterfall-gridline" />
            <text x="68" y={y(value) + 4} textAnchor="end" className="waterfall-value">{value.toFixed(2)}</text>
          </g>
        })}
        <line x1="76" x2={chartWidth - 16} y1={y(0)} y2={y(0)} className="waterfall-zero" />
        <rect x={76 + stepGap - stepWidth / 2} y={y(baseValue)} width={stepWidth} height={Math.max(2, y(0) - y(baseValue))} rx="4" className="waterfall-base" />
        <text x={76 + stepGap} y="238" textAnchor="middle" className="waterfall-feature">Baseline</text>
        <text x={76 + stepGap} y={Math.min(y(baseValue), y(0)) - 7} textAnchor="middle" className="waterfall-value">{baseValue.toFixed(3)}</text>
        {impacts.map((impact, index) => {
          const start = cumulative[index]
          const end = cumulative[index + 1]
          const x = 76 + stepGap * (index + 2) - stepWidth / 2
          const height = Math.max(2, Math.abs(y(end) - y(start)))
          return <g key={impact.name}>
            <line x1={x - (stepGap - stepWidth) / 2} x2={x} y1={y(start)} y2={y(start)} className="waterfall-connector" />
            <rect x={x} y={Math.min(y(start), y(end))} width={stepWidth} height={height} rx="4" className={impact.value >= 0 ? 'waterfall-positive' : 'waterfall-negative'}>
              <title>{`${impact.name} = ${String(impact.featureValue ?? 'missing')}; contribution ${impact.value.toFixed(4)}`}</title>
            </rect>
            <text x={x + stepWidth / 2} y="238" textAnchor="middle" className="waterfall-feature">{impact.name}</text>
            <text x={x + stepWidth / 2} y={Math.min(y(start), y(end)) - 7} textAnchor="middle" className="waterfall-value">{impact.value > 0 ? '+' : ''}{impact.value.toFixed(2)}</text>
          </g>
        })}
        <rect x={chartWidth - 86} y={y(total)} width={stepWidth} height={Math.max(2, y(0) - y(total))} rx="4" className="waterfall-total" />
        <text x={chartWidth - 60} y="238" textAnchor="middle" className="waterfall-feature">Output</text>
        <text x={chartWidth - 60} y={Math.min(y(total), y(0)) - 7} textAnchor="middle" className="waterfall-value">{total.toFixed(3)}</text>
      </svg>
    </div>
  </div>
}

export function FeatureImportanceView({ result, shap }: { result: TrainingResult; shap: ShapResult | null }) {
  const [method, setMethod] = useState<'prediction-change' | 'shap'>('prediction-change')
  const shapImportance = shap?.summary.map((item) => ({ feature: item.feature, score: item.mean_abs_shap })) ?? []
  const useShap = method === 'shap' && shapImportance.length > 0
  const importance = useShap ? shapImportance : result.importance
  const maxScore = Math.max(0.000001, ...importance.map((item) => item.score))
  return <div className="importance-page">
    <section className="chart-card">
      <div className="chart-title"><b>Feature importance</b><label className="importance-method">Method<select value={method} onChange={(event) => setMethod(event.target.value as 'prediction-change' | 'shap')} disabled={!shapImportance.length}><option value="prediction-change">Prediction change</option><option value="shap">Mean |SHAP|</option></select></label></div>
      <div className="importance-list">{importance.map((item, index) => <div key={item.feature} className="importance-row">
        <span className="importance-rank">{String(index + 1).padStart(2, '0')}</span>
        <span className="importance-name">{item.feature}</span>
        <span className="importance-track"><i style={{ width: `${item.score / maxScore * 100}%` }} /></span>
        <b>{item.score.toFixed(2)}</b>
      </div>)}</div>
      <p className="chart-explainer">{useShap
        ? 'Mean absolute SHAP ranks each feature by average contribution magnitude across validation rows; it does not show direction or causality.'
        : 'CatBoost PredictionValuesChange ranks how much predictions change when a feature is used by the fitted trees. It does not show direction or causality.'}</p>
    </section>
  </div>
}

export function ExplainabilityView({ result, prediction, sample, setSample, rowCount, classLabels }: {
  result: ShapResult | null
  prediction: { prediction: string | number; raw_output_class?: string | number; probabilities?: Record<string, number>; contributions: Array<{ feature: string; value: unknown; shap_value: number }>; base_value: number } | null
  sample: number
  setSample: (value: number) => void
  rowCount: number
  classLabels: Array<string | number>
}) {
  if (!result || !prediction) return <div className="empty-state compact"><h2>SHAP needs a trained model</h2><p>Load data and train CatBoost to see real feature contributions.</p></div>
  const waterfallValues = prediction.contributions.map((item) => item.shap_value)
  const waterfallNames = prediction.contributions.map((item) => item.feature)
  const waterfallFeatures = prediction.contributions.map((item) => item.value)
  const predictionProbability = prediction.probabilities?.[String(prediction.prediction)]
  const scaleLabel = result.output === 'regression'
    ? 'Target units'
    : classLabels.length === 2
      ? `Raw log-odds for class ${String(classLabels[1])}`
      : `Raw model margin for class ${String(prediction.raw_output_class ?? prediction.prediction)}`
  return <div className="explainability-page">
    <div className="section-inline-heading">
      <div><h2>Explain model behavior</h2><p>Global patterns and one-row explanations from the fitted CatBoost model.</p></div>
      <label className="field-label">Validation row
        <input type="number" min="1" max={rowCount} value={sample} onChange={(event) => setSample(Math.min(rowCount, Math.max(1, Number(event.target.value) || 1)))} />
      </label>
    </div>
    <ShapSummary result={result} />
    <section className="chart-card local-explanation">
      <div className="section-inline-heading">
        <div><h3>Why this row received this prediction</h3><p>Selected row #{sample} · prediction {String(prediction.prediction)}{predictionProbability === undefined ? '' : ` · ${(predictionProbability * 100).toFixed(1)}% probability`}</p></div>
        <span className="scale-pill">{scaleLabel}</span>
      </div>
      <ShapWaterfall
        featureNames={waterfallNames}
        featureValues={waterfallFeatures}
        values={waterfallValues}
        baseValue={prediction.base_value}
        title="Local SHAP waterfall"
      />
    </section>
    <p className="attribution-note">SHAP describes how this model arrived at its output. It does not establish cause and effect; related features may share or redistribute attribution.</p>
  </div>
}
