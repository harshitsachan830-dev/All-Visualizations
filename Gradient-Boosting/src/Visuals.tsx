import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ArrowDownRight, ArrowUpRight, CircleHelp, Pause, Play, SkipBack, SkipForward, Trees } from 'lucide-react'
import type { DecisionBoundary, ModelSample, RoundMetric, SampleHistory, Task, TrainingResult, TreeMetadata } from './types'

const COLORS = ['#62e982', '#ff4f9a', '#b74aff', '#ffb847', '#47cdd0']
const chartTooltipStyle = {
  background: '#121b1d',
  border: '1px solid #2b3a3c',
  borderRadius: 7,
  color: '#e7efed',
  fontSize: 11,
}

function PanelTitle({ title, detail, aside }: { title: string; detail?: string; aside?: React.ReactNode }) {
  return <div className="panel-title-row"><div><h3>{title}</h3>{detail && <p>{detail}</p>}</div>{aside}</div>
}

export function BoostingPanel({
  result,
  round,
  onRoundChange,
  playing,
  onTogglePlay,
}: {
  result: TrainingResult
  round: number
  onRoundChange: (round: number) => void
  playing: boolean
  onTogglePlay: () => void
}) {
  const tree = result.trees[Math.max(0, round - 1)]
  const priorTree = result.trees[Math.max(0, round - 2)]
  const metric = result.rounds[Math.max(0, round - 1)]
  const currentError = metric?.valid_loss ?? 0
  const improvement = result.rounds[Math.max(0, round - 2)]?.valid_loss
  const reduction = improvement && improvement > 0 ? Math.max(0, (improvement - currentError) / improvement * 100) : 0

  return (
    <section className="panel boosting-panel" id="boosting-panel">
      <PanelTitle
        title="Boosting rounds"
        detail="Each tree learns from the errors the ensemble still makes."
        aside={<span className="live-tag"><i /> ROUND {round}</span>}
      />
      <div className="boost-canvas">
        <div className="boost-grid" />
        <div className="boost-flow" aria-label={`Boosting round ${round} of ${result.rounds.length}`}>
          <div className="flow-node baseline-node">
            <span className="node-symbol">ƒ₀</span>
            <strong>Baseline</strong>
            <small>initial guess</small>
          </div>
          <div className="flow-link"><span>residuals</span><b>›</b></div>
          <div className="flow-node tree-node faded-tree">
            <span className="tree-glyph"><i /><i /><i /><i /></span>
            <strong>Tree {Math.max(1, round - 1)}</strong>
            <small>{priorTree?.split_features[0] ?? 'first correction'}</small>
          </div>
          <div className="flow-link update-link"><span>× {result.summary.learning_rate.toFixed(2)}</span><b>›</b></div>
          <div className="flow-node tree-node active-tree">
            <span className="tree-glyph"><i /><i /><i /><i /></span>
            <strong>Tree {round}</strong>
            <small>{tree?.split_features[0] ?? 'weak learner'}</small>
          </div>
          <div className="flow-link"><span>add to ensemble</span><b>›</b></div>
          <div className="flow-node ensemble-node">
            <span className="ensemble-symbol">Σ</span>
            <strong>Fₘ(x)</strong>
            <small>current model</small>
          </div>
        </div>
        <div className="round-insight-row">
          <div className="round-insight"><span className="insight-icon"><Trees size={16} /></span><span><small>Current weak learner</small><strong>Depth {tree?.depth ?? 0} · {tree?.leaves ?? 0} leaves</strong></span></div>
          <div className="round-insight"><span className="insight-icon rose"><ArrowDownRight size={16} /></span><span><small>Validation loss</small><strong>{currentError.toFixed(4)}{reduction > 0 && <em> −{reduction.toFixed(1)}%</em>}</strong></span></div>
          <div className="round-insight"><span className="insight-icon gold"><CircleHelp size={16} /></span><span><small>Split focus</small><strong>{tree?.split_features.join(', ') || 'No split yet'}</strong></span></div>
        </div>
      </div>
      <div className="round-controls">
        <button className="icon-button" aria-label="Previous round" title="Previous round" onClick={() => onRoundChange(Math.max(1, round - 1))}><SkipBack size={15} /></button>
        <button className="play-button" aria-label={playing ? 'Pause animation' : 'Play animation'} title={playing ? 'Pause' : 'Play'} onClick={onTogglePlay}>{playing ? <Pause size={15} /> : <Play size={15} fill="currentColor" />}</button>
        <button className="icon-button" aria-label="Next round" title="Next round" onClick={() => onRoundChange(Math.min(result.rounds.length, round + 1))}><SkipForward size={15} /></button>
        <div className="round-slider-wrap">
          <div className="slider-label"><span>ROUND <strong>{round}</strong></span><span>{result.rounds.length} ESTIMATORS</span></div>
          <input aria-label="Boosting round" type="range" min="1" max={result.rounds.length} value={round} onChange={(event) => onRoundChange(Number(event.target.value))} />
        </div>
        <span className="round-number">{String(round).padStart(2, '0')}<small> / {result.rounds.length}</small></span>
      </div>
    </section>
  )
}

export function TrainingCharts({ rounds, activeRound, scoreLabel }: { rounds: RoundMetric[]; activeRound: number; scoreLabel: string }) {
  const visibleRounds = rounds.slice(0, Math.max(activeRound, 1))
  return (
    <section className="panel training-charts" id="training-progress">
      <PanelTitle title="Training progress" detail="Validation tracks generalization as trees are added." aside={<span className="chart-unit">BY ROUND</span>} />
      <div className="chart-block loss-chart">
        <div className="chart-legend"><span><i className="legend-dot orange" />Training loss</span><span><i className="legend-dot pink" />Validation loss</span></div>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={visibleRounds} margin={{ top: 8, right: 7, left: -18, bottom: 0 }}>
            <CartesianGrid stroke="#263235" strokeDasharray="3 5" vertical={false} />
            <XAxis dataKey="round" tick={{ fill: '#8b9a9c', fontSize: 9 }} tickLine={false} axisLine={{ stroke: '#344145' }} minTickGap={28} />
            <YAxis tick={{ fill: '#8b9a9c', fontSize: 9 }} tickLine={false} axisLine={false} width={32} />
            <Tooltip contentStyle={chartTooltipStyle} labelFormatter={(value) => `Round ${value}`} />
            <Line type="monotone" dataKey="train_loss" name="Training loss" stroke="#ffad3d" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="valid_loss" name="Validation loss" stroke="#ff3785" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-divider" />
      <div className="chart-block score-chart">
        <div className="chart-legend"><span><i className="legend-dot orange" />Training {scoreLabel}</span><span><i className="legend-dot pink" />Validation {scoreLabel}</span></div>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={visibleRounds} margin={{ top: 8, right: 7, left: -18, bottom: 0 }}>
            <CartesianGrid stroke="#263235" strokeDasharray="3 5" vertical={false} />
            <XAxis dataKey="round" tick={{ fill: '#8b9a9c', fontSize: 9 }} tickLine={false} axisLine={{ stroke: '#344145' }} minTickGap={28} />
            <YAxis tick={{ fill: '#8b9a9c', fontSize: 9 }} tickLine={false} axisLine={false} width={32} domain={['auto', 'auto']} />
            <Tooltip contentStyle={chartTooltipStyle} labelFormatter={(value) => `Round ${value}`} />
            <Line type="monotone" dataKey="train_score" name={`Training ${scoreLabel}`} stroke="#ffad3d" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="valid_score" name={`Validation ${scoreLabel}`} stroke="#ff3785" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-footer"><span>Early stopping is not enabled</span><span>Round {activeRound} of {rounds.length}</span></div>
    </section>
  )
}

export function DecisionBoundaryPanel({
  boundary,
  round = 1,
  selectedSample,
  onSelectSample,
  large = false,
}: {
  boundary: DecisionBoundary | null
  round?: number
  selectedSample?: string
  onSelectSample?: (sampleId: string) => void
  large?: boolean
}) {
  if (!boundary) {
    return <section className={`panel boundary-panel ${large ? 'panel-large' : ''}`}><PanelTitle title="Decision boundary" detail="Select two numeric features to inspect the model response." /><div className="empty-chart">A two-feature response surface appears when the dataset has at least two numeric inputs.</div></section>
  }
  const xMin = boundary.x_values[0]
  const xMax = boundary.x_values.at(-1) ?? 1
  const yMin = boundary.y_values[0]
  const yMax = boundary.y_values.at(-1) ?? 1
  const activeSurface = boundary.surface_history[round - 1]?.surface ?? boundary.surface
  const responseValues = activeSurface.flat().map(Number)
  const responseMin = Math.min(...responseValues)
  const responseMax = Math.max(...responseValues)
  const classIndex = (value: string | number) => boundary.classes.findIndex((item) => String(item) === String(value))
  const classColor = (value: string | number) => COLORS[(classIndex(value) + COLORS.length) % COLORS.length]
  const responseColor = (value: string | number) => `hsl(${132 - ((Number(value) - responseMin) / (responseMax - responseMin || 1)) * 105}, 75%, 52%)`
  const pointColor = (value: string | number) => boundary.task === 'classification' ? classColor(value) : responseColor(value)
  const chartPoints = boundary.points.slice(0, large ? 180 : 90)

  return (
    <section className={`panel boundary-panel ${large ? 'panel-large' : ''}`} id="decision-boundary">
      <PanelTitle
        title={boundary.task === 'classification' ? 'Decision boundary' : 'Feature response'}
        detail={`${boundary.x_feature} × ${boundary.y_feature} · validation samples`}
        aside={<span className="chart-unit">ROUND {round} SURFACE</span>}
      />
      <div className="boundary-plot">
        <div className="boundary-axis-y">{boundary.y_feature}</div>
        <div className="boundary-axis-x">{boundary.x_feature}</div>
        <div className="boundary-surface" style={{ gridTemplateColumns: `repeat(${boundary.x_values.length}, 1fr)` }}>
          {activeSurface.flatMap((row, rowIndex) => row.map((value, columnIndex) => (
            <span
              className="surface-cell"
              key={`${rowIndex}-${columnIndex}`}
              style={{ backgroundColor: boundary.task === 'classification' ? `${classColor(value)}40` : responseColor(value) }}
            />
          )))}
          <svg className="boundary-points" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Validation samples on the decision boundary">
            {chartPoints.map((point) => {
              const x = ((point.x - xMin) / (xMax - xMin || 1)) * 96 + 2
              const y = 98 - ((point.y - yMin) / (yMax - yMin || 1)) * 96
              const selected = point.sample_id === selectedSample
              const incorrect = boundary.task === 'classification' && String(point.actual) !== String(point.prediction)
              return <circle key={point.sample_id} cx={x} cy={y} r={selected ? 1.6 : 1.1} fill={pointColor(boundary.task === 'classification' ? point.actual : point.prediction)} stroke={incorrect || selected ? '#fff' : 'transparent'} strokeWidth={selected ? 0.7 : 0.45} onClick={() => onSelectSample?.(point.sample_id)} />
            })}
          </svg>
        </div>
        <span className="axis-min axis-x-min">{xMin.toPrecision(3)}</span><span className="axis-max axis-x-max">{xMax.toPrecision(3)}</span>
        <span className="axis-min axis-y-min">{yMin.toPrecision(3)}</span><span className="axis-max axis-y-max">{yMax.toPrecision(3)}</span>
      </div>
      <div className="class-legend">{boundary.task === 'classification' ? <>{boundary.classes.map((label, index) => <span key={String(label)}><i style={{ backgroundColor: COLORS[index % COLORS.length] }} />{className(label, boundary.dataset)}</span>)}<span className="legend-outlined"><i />Misclassified</span></> : <><span><i className="response-gradient" />Lower response</span><span><i className="response-gradient high" />Higher response</span></>}</div>
    </section>
  )
}

function className(label: string | number, dataset?: string) {
  if (dataset !== 'iris') return String(label)
  const irisLabels: Record<string, string> = { '0': 'Setosa', '1': 'Versicolor', '2': 'Virginica' }
  return irisLabels[String(label)] ?? String(label)
}

export function ResidualPanel({ history, round, task, selectedSample }: { history: SampleHistory[]; round: number; task: Task; selectedSample: string }) {
  const chartData = history.map((sample) => {
    const point = sample.history[Math.max(0, Math.min(sample.history.length - 1, round - 1))]
    return { sample: sample.sample_id, error: task === 'classification' ? point?.abs_error : point?.residual, magnitude: point?.abs_error, selected: sample.sample_id === selectedSample }
  }).filter((item) => item.error !== undefined)
  const sorted = [...chartData].sort((left, right) => (right.magnitude ?? 0) - (left.magnitude ?? 0)).slice(0, 8)

  return (
    <section className="panel residual-panel" id="residuals">
      <PanelTitle title="Residual focus" detail={task === 'classification' ? 'Probability error · current round' : 'Actual − predicted · current round'} aside={<span className="round-pill">R{round}</span>} />
      <div className="chart-block residual-chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData.slice(0, 32)} margin={{ top: 6, right: 4, left: -25, bottom: 0 }}>
            <CartesianGrid stroke="#263235" strokeDasharray="3 5" vertical={false} />
            <XAxis dataKey="sample" tick={{ fill: '#7f8e90', fontSize: 8 }} tickLine={false} axisLine={{ stroke: '#344145' }} interval={5} />
            <YAxis tick={{ fill: '#7f8e90', fontSize: 8 }} tickLine={false} axisLine={false} width={34} />
            <Tooltip contentStyle={chartTooltipStyle} labelFormatter={(value) => `Sample ${value}`} />
            <Bar dataKey="error" name={task === 'classification' ? 'Probability error' : 'Residual'} radius={[3, 3, 0, 0]}>
              {chartData.slice(0, 32).map((item) => <Cell key={item.sample} fill={item.selected ? '#ffb847' : '#ff4f9a'} fillOpacity={item.selected ? 1 : 0.66} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="hardest-samples"><span>Largest remaining errors</span>{sorted.slice(0, 4).map((item) => <span className="hard-sample" key={item.sample}><i />{item.sample}<b>{(item.magnitude ?? 0).toFixed(2)}</b></span>)}</div>
    </section>
  )
}

export function FeaturePanel({ result, large = false }: { result: TrainingResult; large?: boolean }) {
  const data = result.feature_importance.slice(0, large ? 12 : 6)
  return (
    <section className={`panel feature-panel ${large ? 'panel-large' : ''}`} id="feature-analysis">
      <PanelTitle title="Feature importance" detail="Split-based contribution across the ensemble." aside={<span className="chart-unit">GAIN</span>} />
      <div className="chart-block feature-chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 2, right: 28, left: 0, bottom: 2 }}>
            <CartesianGrid stroke="#263235" strokeDasharray="3 5" horizontal={false} />
            <XAxis type="number" tick={{ fill: '#879497', fontSize: 9 }} tickLine={false} axisLine={{ stroke: '#344145' }} />
            <YAxis type="category" dataKey="feature" width={large ? 110 : 86} tick={{ fill: '#d0dbd8', fontSize: 10 }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={chartTooltipStyle} formatter={(value) => [Number(value).toFixed(3), 'Importance']} />
            <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
              {data.map((item, index) => <Cell key={item.feature} fill={COLORS[(index + 1) % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="feature-note"><CircleHelp size={13} /> Importance shows which features the trees split on, not causal effect.</div>
    </section>
  )
}

export function TreeInspector({ trees, activeRound, onRoundChange }: { trees: TreeMetadata[]; activeRound: number; onRoundChange: (round: number) => void }) {
  const tree = trees[Math.max(0, activeRound - 1)]
  return (
    <section className="panel tree-inspector" id="tree-inspector">
      <PanelTitle title="Weak learner inspector" detail="A compact view of the selected boosting stage." aside={<span className="round-pill">TREE {activeRound}</span>} />
      <div className="tree-summary-grid">
        <div><span>Tree depth</span><strong>{tree?.depth ?? 0}</strong></div>
        <div><span>Leaf nodes</span><strong>{tree?.leaves ?? 0}</strong></div>
        <div><span>Ensemble weight</span><strong>{tree?.weight.toFixed(2) ?? '—'}</strong></div>
      </div>
      <div className="tree-split-view">
        <div className="mini-tree-diagram" aria-hidden="true">
          <span className="tree-root-node" /><span className="tree-branch left" /><span className="tree-branch right" />
          <span className="tree-child child-one" /><span className="tree-child child-two" /><span className="tree-child child-three" /><span className="tree-child child-four" />
        </div>
        <div className="split-copy"><small>Most-used split features</small>{tree?.split_features.map((feature, index) => <span key={feature}><i style={{ background: COLORS[index] }} />{feature}</span>)}</div>
      </div>
      <div className="tree-timeline"><span>Ensemble timeline</span><div>{trees.map((item) => <button key={item.round} className={item.round === activeRound ? 'current' : ''} title={`Inspect tree ${item.round}`} aria-label={`Inspect tree ${item.round}`} onClick={() => onRoundChange(item.round)} />)}</div></div>
    </section>
  )
}

export function PredictionExplainer({ samples, selectedId, onSelect, task, dataset }: { samples: ModelSample[]; selectedId: string; onSelect: (sampleId: string) => void; task: Task; dataset: string }) {
  const sample = samples.find((item) => item.sample_id === selectedId) ?? samples[0]
  const effects = sample?.local_effects ?? []
  const maxEffect = Math.max(...effects.map((item) => Math.abs(item.effect)), 0.001)
  const correct = sample && String(sample.actual) === String(sample.prediction)
  return (
    <section className="panel prediction-panel" id="prediction-explainer">
      <PanelTitle title="Prediction explainer" detail="One-feature counterfactual effects around a baseline sample." aside={<span className="chart-unit">LOCAL VIEW</span>} />
      <div className="prediction-controls">
        <label className="field-control"><span>Validation sample</span><select value={sample?.sample_id ?? ''} onChange={(event) => onSelect(event.target.value)}>{samples.map((item) => <option value={item.sample_id} key={item.sample_id}>Sample {item.sample_id}</option>)}</select></label>
        {sample && <div className="prediction-result"><div><small>Predicted {task === 'classification' ? 'class' : 'value'}</small><strong>{className(sample.prediction, dataset)}</strong></div><span className={correct ? 'good-text' : 'warn-text'}>{correct ? 'Correct' : 'Needs review'}</span></div>}
      </div>
      {sample && <div className="prediction-confidence-row"><span>Actual <b>{className(sample.actual, dataset)}</b></span>{sample.confidence !== null && <span>Confidence <b>{(sample.confidence * 100).toFixed(1)}%</b></span>}<span>Residual <b>{sample.residual.toFixed(3)}</b></span></div>}
      <div className="effects-list">
        {effects.length ? effects.map((effect) => (
          <div className="effect-row" key={effect.feature}>
            <span className="effect-name">{effect.feature}<small>{String(effect.value)}</small></span>
            <div className="effect-track"><i className={effect.effect >= 0 ? 'positive' : 'negative'} style={{ width: `${Math.max(4, Math.abs(effect.effect) / maxEffect * 100)}%` }} /></div>
            <strong className={effect.effect >= 0 ? 'positive-text' : 'negative-text'}>{effect.effect >= 0 ? '+' : ''}{effect.effect.toFixed(3)}</strong>
          </div>
        )) : <div className="empty-chart compact">No local effects are available for this sample.</div>}
      </div>
      <div className="feature-note"><CircleHelp size={13} /> Effects are one-feature substitutions against the training baseline; interactions are not apportioned.</div>
    </section>
  )
}

export function SampleList({ samples, selectedId, onSelect }: { samples: ModelSample[]; selectedId: string; onSelect: (sampleId: string) => void }) {
  return <div className="sample-list">{samples.slice(0, 20).map((sample) => <button key={sample.sample_id} className={sample.sample_id === selectedId ? 'selected' : ''} onClick={() => onSelect(sample.sample_id)}><span>Sample {sample.sample_id}</span><span>{String(sample.actual)} → {String(sample.prediction)}</span><strong className={sample.correct ? 'good-text' : 'warn-text'}>{sample.abs_error.toFixed(2)}</strong></button>)}</div>
}

export function RoundWaterfall({ rounds, activeRound }: { rounds: RoundMetric[]; activeRound: number }) {
  const data = useMemo(() => rounds.slice(0, Math.max(1, activeRound)).filter((_, index) => index % Math.max(1, Math.floor(activeRound / 32)) === 0), [rounds, activeRound])
  const scoreUp = (rounds[Math.max(0, activeRound - 1)]?.valid_score ?? 0) >= (rounds[Math.max(0, activeRound - 2)]?.valid_score ?? 0)
  return <div className="cumulative-prediction"><span>Cumulative model score</span><strong>{scoreUp ? <ArrowUpRight size={17} /> : <ArrowDownRight size={17} />}{(rounds[Math.max(0, activeRound - 1)]?.valid_score ?? 0).toFixed(3)}</strong><div className="waterfall-bars">{data.slice(-24).map((point) => <i key={point.round} title={`Round ${point.round}: ${point.valid_score.toFixed(3)}`} style={{ height: `${Math.max(8, (point.valid_score + 0.15) * 66)}%` }} />)}</div><small>Validation {rounds[Math.max(0, activeRound - 1)]?.round ?? 0} / {rounds.length} rounds</small></div>
}