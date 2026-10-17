import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ModelEvaluation as Evaluation, TrainingResult } from './visualizationTypes'

const EMPTY_LABELS: Array<string | number> = []

function metricLabel(name: string, value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) return '—'
  return name === 'accuracy' || name === 'precision' || name === 'recall' || name === 'f1' || name === 'roc_auc'
    ? `${(value * 100).toFixed(1)}%`
    : value.toFixed(3)
}

function EvaluationMetric({ title, value, help }: { title: string; value: string; help: string }) {
  return <article className="metric-card" title={help}><span>{title}</span><strong>{value}</strong><small>{help}</small></article>
}

function RocAndPrecisionRecall({ evaluation }: { evaluation: Evaluation }) {
  const labels = evaluation.labels ?? EMPTY_LABELS
  const [selectedClass, setSelectedClass] = useState(String(labels.at(-1) ?? ''))
  const [threshold, setThreshold] = useState(0.5)
  const positiveIndex = Math.max(0, labels.findIndex((label) => String(label) === selectedClass))
  const curves = useMemo(() => {
    const actual = evaluation.actual
    const probabilities = evaluation.probabilities
    if (!probabilities?.length || !labels.length || actual.length !== probabilities.length) return null
    const points = actual.map((value, index) => ({
      positive: String(value) === String(labels[positiveIndex]),
      probability: probabilities[index]?.[positiveIndex] ?? 0,
    })).sort((left, right) => right.probability - left.probability)
    const positives = points.filter((point) => point.positive).length
    const negatives = points.length - positives
    if (!positives || !negatives) return null
    let truePositive = 0
    let falsePositive = 0
    const roc = [{ fpr: 0, tpr: 0 }]
    const precisionRecall = [{ recall: 0, precision: 1 }]
    for (const point of points) {
      if (point.positive) truePositive += 1
      else falsePositive += 1
      roc.push({ fpr: falsePositive / negatives, tpr: truePositive / positives })
      precisionRecall.push({
        recall: truePositive / positives,
        precision: truePositive / (truePositive + falsePositive),
      })
    }
    const bins = Array.from({ length: 10 }, () => ({ predictedTotal: 0, positiveCount: 0, count: 0 }))
    let squaredError = 0
    for (const point of points) {
      const originalProbability = point.probability
      const index = Math.min(9, Math.floor(originalProbability * 10))
      bins[index].predictedTotal += originalProbability
      bins[index].positiveCount += Number(point.positive)
      bins[index].count += 1
      squaredError += (originalProbability - Number(point.positive)) ** 2
    }
    const calibration = bins.filter((bin) => bin.count > 0).map((bin) => ({
      predicted: bin.predictedTotal / bin.count,
      observed: bin.positiveCount / bin.count,
      count: bin.count,
    }))
    return { roc, precisionRecall, points, calibration, brier: squaredError / points.length, positives, negatives }
  }, [evaluation, labels, positiveIndex])

  if (!labels.length || !evaluation.probabilities?.length) return <p className="empty-copy">Probability scores were not returned for this model.</p>
  const tp = curves?.points.filter((point) => point.positive && point.probability >= threshold).length ?? 0
  const fp = curves?.points.filter((point) => !point.positive && point.probability >= threshold).length ?? 0
  const thresholdPrecision = tp + fp ? tp / (tp + fp) : 0
  const thresholdRecall = curves?.positives ? tp / curves.positives : 0
  const falsePositiveRate = curves?.negatives ? fp / curves.negatives : 0
  return <div className="curve-section">
    <div className="section-inline-heading">
      <div><h3>Classification curves</h3><p>One-vs-rest curves use held-out probability scores.</p></div>
      <label className="field-label">Positive class
        <select value={String(labels[positiveIndex])} onChange={(event) => setSelectedClass(event.target.value)}>
          {labels.map((label) => <option key={String(label)} value={String(label)}>{String(label)}</option>)}
        </select>
      </label>
    </div>
    {curves ? <div className="curve-grid">
      <div className="chart-card">
        <div className="chart-title"><b>ROC curve</b><span>False-positive rate vs true-positive rate</span></div>
        <div className="chart-area">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={curves.roc} margin={{ top: 12, right: 14, bottom: 4, left: -12 }}>
              <CartesianGrid strokeDasharray="3 4" vertical={false} />
              <XAxis dataKey="fpr" type="number" domain={[0, 1]} tickFormatter={(value: number) => `${Math.round(value * 100)}%`} />
              <YAxis dataKey="tpr" type="number" domain={[0, 1]} tickFormatter={(value: number) => `${Math.round(value * 100)}%`} />
              <Tooltip formatter={(value) => `${(Number(value) * 100).toFixed(1)}%`} />
              <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]} stroke="#aeb8b0" strokeDasharray="5 5" />
              <Line dataKey="tpr" type="monotone" stroke="var(--chart-blue)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="chart-card">
        <div className="chart-title"><b>Precision–recall curve</b><span>Precision vs recall for the selected class</span></div>
        <div className="chart-area">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={curves.precisionRecall} margin={{ top: 12, right: 14, bottom: 4, left: -12 }}>
              <CartesianGrid strokeDasharray="3 4" vertical={false} />
              <XAxis dataKey="recall" type="number" domain={[0, 1]} tickFormatter={(value: number) => `${Math.round(value * 100)}%`} />
              <YAxis dataKey="precision" type="number" domain={[0, 1]} tickFormatter={(value: number) => `${Math.round(value * 100)}%`} />
              <Tooltip formatter={(value) => `${(Number(value) * 100).toFixed(1)}%`} />
              <Line dataKey="precision" type="stepAfter" stroke="var(--chart-amber)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div> : <p className="empty-copy">Curves need both positive and negative examples in the validation sample.</p>}
    {curves && <details className="advanced-disclosure calibration-disclosure">
      <summary><span>Calibration and decision threshold</span><small>Inspect how probabilities match observed outcomes and adjust the classification cutoff.</small></summary>
      <div className="evaluation-chart-grid">
        <section className="chart-card">
          <div className="chart-title"><b>Calibration</b><span>Perfectly calibrated points follow the diagonal.</span></div>
          <div className="chart-area">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 12, right: 14, bottom: 12, left: 0 }}>
                <CartesianGrid strokeDasharray="3 4" />
                <XAxis type="number" dataKey="predicted" name="Mean predicted probability" domain={[0, 1]} tickFormatter={(value: number) => `${Math.round(value * 100)}%`} />
                <YAxis type="number" dataKey="observed" name="Observed positive fraction" domain={[0, 1]} tickFormatter={(value: number) => `${Math.round(value * 100)}%`} />
                <Tooltip formatter={(value, name) => [ `${(Number(value) * 100).toFixed(1)}%`, name ]} />
                <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]} stroke="#aeb8b0" strokeDasharray="5 5" />
                <Scatter data={curves.calibration} fill="var(--chart-blue)" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <p className="chart-explainer">Brier score {curves.brier.toFixed(4)} · lower is better. Calibration bins contain held-out rows.</p>
        </section>
        <section className="chart-card threshold-card">
          <div className="chart-title"><b>Threshold explorer</b><span>Positive class: {String(labels[positiveIndex])}</span></div>
          <label className="field-label threshold-control">Decision threshold · {(threshold * 100).toFixed(0)}%
            <input type="range" min="0" max="1" step=".01" value={threshold} onChange={(event) => setThreshold(Number(event.target.value))} />
          </label>
          <div className="threshold-metrics">
            <EvaluationMetric title="Precision" value={`${(thresholdPrecision * 100).toFixed(1)}%`} help="Share of predicted positives that are correct." />
            <EvaluationMetric title="Recall" value={`${(thresholdRecall * 100).toFixed(1)}%`} help="Share of actual positives found." />
            <EvaluationMetric title="False-positive rate" value={`${(falsePositiveRate * 100).toFixed(1)}%`} help="Share of actual negatives marked positive." />
          </div>
          <p className="chart-explainer">This changes the cutoff applied to the held-out probability scores; it does not retrain the model.</p>
        </section>
      </div>
    </details>}
  </div>
}

function ClassificationEvaluation({ result }: { result: TrainingResult }) {
  const [normalized, setNormalized] = useState(false)
  const evaluation = result.evaluation
  const labels = evaluation.labels ?? []
  const matrix = evaluation.confusion_matrix ?? []
  return <div className="evaluation-content">
    <div className="metric-grid">
      <EvaluationMetric title="Accuracy" value={metricLabel('accuracy', result.metrics.accuracy)} help="Share of held-out rows predicted correctly." />
      <EvaluationMetric title="Precision" value={metricLabel('precision', result.metrics.precision)} help="Weighted precision across target classes." />
      <EvaluationMetric title="Recall" value={metricLabel('recall', result.metrics.recall)} help="Weighted recall across target classes." />
      <EvaluationMetric title="F1 score" value={metricLabel('f1', result.metrics.f1)} help="Weighted harmonic mean of precision and recall." />
      <EvaluationMetric title="ROC-AUC" value={metricLabel('roc_auc', result.metrics.roc_auc)} help="Weighted one-vs-rest ranking score, when defined." />
    </div>
    <section className="chart-card confusion-card">
      <div className="section-inline-heading">
        <div><h3>Confusion matrix</h3><p>Rows are actual classes; columns are model predictions.</p></div>
        <label className="toggle-field"><input type="checkbox" checked={normalized} onChange={(event) => setNormalized(event.target.checked)} /> Row percentages</label>
      </div>
      {matrix.length ? <div className="table-scroll">
        <table className="confusion-table">
          <thead><tr><th>Actual ↓ / predicted →</th>{labels.map((label) => <th key={String(label)}>{String(label)}</th>)}</tr></thead>
          <tbody>{matrix.map((row, rowIndex) => {
            const total = row.reduce((sum, count) => sum + count, 0)
            return <tr key={String(labels[rowIndex])}>
              <th>{String(labels[rowIndex])}</th>
              {row.map((count, columnIndex) => <td key={`${rowIndex}-${columnIndex}`} style={{ '--cell-intensity': `${total ? count / total : 0}` } as CSSProperties}>
                <span>{normalized ? `${total ? (count / total * 100).toFixed(1) : '0.0'}%` : count.toLocaleString()}</span>
              </td>)}
            </tr>
          })}</tbody>
        </table>
      </div> : <p className="empty-copy">No confusion matrix was returned.</p>}
      <p className="chart-explainer">Darker cells mean more validation examples. The diagonal is correct; off-diagonal cells show which classes are confused.</p>
    </section>
    <RocAndPrecisionRecall evaluation={evaluation} />
  </div>
}

function RegressionEvaluation({ result }: { result: TrainingResult }) {
  const pairs = result.evaluation.actual.map((actual, index) => {
    const predicted = Number(result.evaluation.predicted[index])
    const value = Number(actual)
    return { actual: value, predicted, residual: value - predicted }
  }).filter((point) => Number.isFinite(point.actual) && Number.isFinite(point.predicted))
  const minValue = Math.min(...pairs.flatMap((point) => [point.actual, point.predicted]))
  const maxValue = Math.max(...pairs.flatMap((point) => [point.actual, point.predicted]))
  const binCount = 16
  const residualMin = Math.min(...pairs.map((point) => point.residual))
  const residualMax = Math.max(...pairs.map((point) => point.residual))
  const range = residualMax - residualMin || 1
  const histogram = Array.from({ length: binCount }, (_, index) => ({
    bin: `${(residualMin + range * index / binCount).toPrecision(3)}`,
    count: 0,
  }))
  pairs.forEach(({ residual }) => {
    const index = Math.min(binCount - 1, Math.floor((residual - residualMin) / range * binCount))
    histogram[index].count += 1
  })
  return <div className="evaluation-content">
    <div className="metric-grid">
      <EvaluationMetric title="R²" value={metricLabel('r2', result.metrics.r2)} help="Variance explained on held-out data; negative values are possible." />
      <EvaluationMetric title="MAE" value={metricLabel('mae', result.metrics.mae)} help="Average absolute error in target units." />
      <EvaluationMetric title="RMSE" value={metricLabel('rmse', result.metrics.rmse)} help="Root-mean-square error in target units; larger misses weigh more." />
    </div>
    {result.metrics.r2 < 0 && <p className="inline-note">This held-out R² is negative: predicting the validation-set mean would have performed better on these rows.</p>}
    <div className="evaluation-chart-grid">
      <section className="chart-card">
        <div className="chart-title"><b>Actual vs predicted</b><span>Each point is a held-out example; points near the dashed line are closer predictions.</span></div>
        <div className="chart-area">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 12, right: 14, bottom: 12, left: 0 }}>
              <CartesianGrid strokeDasharray="3 4" />
              <XAxis type="number" dataKey="actual" name="Actual" domain={[minValue, maxValue]} />
              <YAxis type="number" dataKey="predicted" name="Predicted" domain={[minValue, maxValue]} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <ReferenceLine segment={[{ x: minValue, y: minValue }, { x: maxValue, y: maxValue }]} stroke="#83968b" strokeDasharray="5 5" />
              <Scatter data={pairs} fill="var(--chart-blue)" fillOpacity={0.72} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="chart-card">
        <div className="chart-title"><b>Residual plot</b><span>Residuals should scatter around zero without a visible pattern.</span></div>
        <div className="chart-area">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 12, right: 14, bottom: 12, left: 0 }}>
              <CartesianGrid strokeDasharray="3 4" />
              <XAxis type="number" dataKey="predicted" name="Predicted" />
              <YAxis type="number" dataKey="residual" name="Residual" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <ReferenceLine y={0} stroke="#83968b" strokeDasharray="5 5" />
              <Scatter data={pairs} fill="var(--chart-amber)" fillOpacity={0.72} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="chart-card">
        <div className="chart-title"><b>Residual distribution</b><span>Residual = actual − predicted; values near zero indicate smaller error.</span></div>
        <div className="chart-area">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={histogram} margin={{ top: 12, right: 12, bottom: 4, left: -12 }}>
              <CartesianGrid strokeDasharray="3 4" vertical={false} />
              <XAxis dataKey="bin" hide />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="var(--chart-amber)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  </div>
}

export function ModelEvaluation({ result }: { result: TrainingResult }) {
  return <div className="evaluation-page">
    <p className="chart-explainer">These metrics and plots use the held-out validation split from this training run. Results describe model performance, not certainty about future data.</p>
    {result.task === 'classification'
      ? <ClassificationEvaluation result={result} />
      : <RegressionEvaluation result={result} />}
  </div>
}
