import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DatasetProfile, FeatureDistribution } from './visualizationTypes'

const EMPTY_FEATURES: DatasetProfile['features'] = []

function DistributionChart({ distribution }: { distribution: FeatureDistribution }) {
  if (distribution.kind === 'histogram') {
    const bins = distribution.bins ?? []
    return <div className="distribution-chart">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={bins} margin={{ top: 14, right: 18, bottom: 12, left: 0 }}>
          <CartesianGrid strokeDasharray="3 4" vertical={false} />
          <XAxis dataKey="lower" tickFormatter={(value: number) => Number(value).toPrecision(3)} minTickGap={24} />
          <YAxis allowDecimals={false} />
          <Tooltip labelFormatter={(_, payload) => {
            const bin = payload?.[0]?.payload as { lower: number; upper: number } | undefined
            return bin ? `${bin.lower.toPrecision(4)} to ${bin.upper.toPrecision(4)}` : ''
          }} />
          <Bar dataKey="count" name="Rows" fill="var(--chart-blue)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <div className="boxplot-card">
        <span>Range and quartiles</span>
        <svg viewBox="0 0 600 46" role="img" aria-label={`Box plot from ${distribution.minimum} to ${distribution.maximum}; median ${distribution.median}`}>
          {(() => {
            const min = distribution.minimum ?? 0
            const max = distribution.maximum ?? 1
            const spread = max - min || 1
            const scale = (value: number) => 12 + ((value - min) / spread) * 576
            return <>
              <line x1={scale(min)} x2={scale(max)} y1="22" y2="22" className="boxplot-whisker" />
              <line x1={scale(min)} x2={scale(min)} y1="14" y2="30" className="boxplot-cap" />
              <line x1={scale(max)} x2={scale(max)} y1="14" y2="30" className="boxplot-cap" />
              <rect x={scale(distribution.q1 ?? min)} y="10" width={Math.max(2, scale(distribution.q3 ?? max) - scale(distribution.q1 ?? min))} height="24" rx="4" className="boxplot-range" />
              <line x1={scale(distribution.median ?? min)} x2={scale(distribution.median ?? min)} y1="8" y2="36" className="boxplot-median" />
              <circle cx={scale(distribution.mean ?? min)} cy="22" r="4" className="boxplot-mean" />
            </>
          })()}
        </svg>
        <small>Whiskers: observed min–max · box: 25th–75th percentile · line: median · dot: mean</small>
      </div>
      <p className="chart-explainer">Histogram of observed values. Median {distribution.median?.toPrecision(4)} · mean {distribution.mean?.toPrecision(4)} · range {distribution.minimum?.toPrecision(4)}–{distribution.maximum?.toPrecision(4)}.</p>
    </div>
  }
  const values = distribution.values ?? []
  return <div className="distribution-chart">
    <ResponsiveContainer width="100%" height={Math.max(280, values.length * 38)}>
      <BarChart data={values} layout="vertical" margin={{ top: 8, right: 25, bottom: 8, left: 12 }}>
        <CartesianGrid strokeDasharray="3 4" horizontal={false} />
        <XAxis type="number" allowDecimals={false} />
        <YAxis type="category" dataKey="value" width={150} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="count" name="Rows" fill="var(--chart-blue)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
    <p className="chart-explainer">{distribution.other_count
      ? `Top ${values.length} categories shown. ${distribution.other_count.toLocaleString()} rows belong to other categories.`
      : 'Observed count for each category; missing values are excluded from this chart.'}</p>
  </div>
}

export function DatasetExplorer({ data, target, setTarget, task, setTask, selectedFeature, setSelectedFeature, method, setMethod, impute, busy, loadSample, upload }: {
  data: DatasetProfile | null
  target: string
  setTarget: (target: string) => void
  task: 'classification' | 'regression'
  setTask: (task: 'classification' | 'regression') => void
  selectedFeature: string
  setSelectedFeature: (feature: string) => void
  method: string
  setMethod: (method: string) => void
  impute: (allMissing?: boolean) => void
  busy: boolean
  loadSample: (path: string) => void
  upload: (file?: File) => void
}) {
  const [search, setSearch] = useState('')
  const features = data?.features ?? EMPTY_FEATURES
  const selected = features.find((feature) => feature.name === selectedFeature) ?? features[0]
  const missingFeatures = features.filter((feature) => feature.missing > 0)
  const fillableMissing = missingFeatures.filter((feature) => feature.missing < (data?.rows ?? 0) && (method === 'mode' || feature.type === 'Numerical'))
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return features.filter((feature) => !term || feature.name.toLowerCase().includes(term))
  }, [features, search])
  if (!data) return <div className="empty-state">
    <span className="empty-icon">01</span>
    <h2>Start with a dataset</h2>
    <p>Upload a CSV or open a small sample. Dataset profiles and plots use your data, not demo values.</p>
    <div className="empty-actions">
      <label className="button-primary">Upload CSV<input type="file" accept=".csv,text/csv" onChange={(event) => upload(event.target.files?.[0])} disabled={busy} /></label>
      <select aria-label="Load sample CSV" defaultValue="" onChange={(event) => loadSample(event.target.value)} disabled={busy}>
        <option value="" disabled>Choose a sample</option>
        <option value="/samples/customer-churn.csv">Customer churn</option>
        <option value="/samples/house-prices.csv">House prices</option>
        <option value="/samples/flower-species.csv">Flower species</option>
      </select>
    </div>
  </div>
  return <div className="dataset-page">
    <div className="dataset-kpis">
      <article><span>Rows</span><b>{data.rows.toLocaleString()}</b></article>
      <article><span>Columns</span><b>{data.columns.toLocaleString()}</b></article>
      <article><span>Missing cells</span><b>{data.missing.toLocaleString()}</b></article>
      <article><span>Missing share</span><b>{(data.missing / (data.rows * data.columns) * 100).toFixed(2)}%</b></article>
    </div>
    {data.missing > 0 && <section className="workspace-card missing-action-card">
      <div><span className="section-kicker">DATA QUALITY</span><h2>{data.missing.toLocaleString()} missing cells found</h2><p>Choose a fill method. Mean and median apply to numeric columns; mode works for numeric and categorical columns. Entirely empty columns need at least one observed value first.</p></div>
      <label className="field-label">Fill method<select value={method} onChange={(event) => setMethod(event.target.value)}><option value="mean">Mean · numeric</option><option value="median">Median · numeric</option><option value="mode">Mode · all column types</option></select></label>
      <button className="button-primary" onClick={() => impute(true)} disabled={busy || !fillableMissing.length}>{busy ? 'Filling…' : `Fill ${fillableMissing.length} eligible column${fillableMissing.length === 1 ? '' : 's'}`}</button>
    </section>}
    <section className="workspace-card data-setup">
      <div><span className="section-kicker">MODEL SETUP</span><h2>Choose what the model learns</h2><p>Set the target column and match the task to its values.</p></div>
      <label className="field-label">Target column<select value={target} onChange={(event) => setTarget(event.target.value)}>{features.map((feature) => <option key={feature.name}>{feature.name}</option>)}</select></label>
      <label className="field-label">Learning task<select value={task} onChange={(event) => setTask(event.target.value as 'classification' | 'regression')}><option value="classification">Classification</option><option value="regression">Regression</option></select></label>
    </section>
    <section className="chart-card data-target-card">
      <div className="chart-title"><b>Target distribution · {target}</b><span>{task === 'classification' ? 'Count per class' : 'Observed target values'}</span></div>
      <DistributionChart distribution={data.target_distribution} />
    </section>
    <div className="dataset-layout">
      <section className="chart-card feature-list-card">
        <div className="section-inline-heading"><div><h3>Feature profiles</h3><p>Search a column to inspect its distribution and missingness.</p></div><span className="count-pill">{features.length} columns</span></div>
        <input className="search-field" type="search" placeholder="Search columns…" aria-label="Search features" value={search} onChange={(event) => setSearch(event.target.value)} />
        <div className="feature-list">
          {filtered.map((feature) => <button key={feature.name} className={selected?.name === feature.name ? 'active' : ''} onClick={() => setSelectedFeature(feature.name)}>
            <span><b>{feature.name}</b><small>{feature.type} · {feature.unique.toLocaleString()} unique</small></span>
            <span className={feature.missing ? 'missing-badge' : 'missing-badge clear'}>{feature.missing.toLocaleString()} missing · {feature.missing_percent.toFixed(1)}%</span>
          </button>)}
        </div>
        <div className="missing-summary"><b>Missing values by column</b>{features.filter((feature) => feature.missing > 0).length
          ? features.filter((feature) => feature.missing > 0).sort((a, b) => b.missing_percent - a.missing_percent).map((feature) => <div key={feature.name}><span>{feature.name}</span><i><b style={{ width: `${feature.missing_percent}%` }} /></i><strong>{feature.missing_percent.toFixed(1)}%</strong></div>)
          : <p>No missing values in this dataset.</p>}
        </div>
      </section>
      <section className="chart-card feature-profile-card">
        {selected ? <>
          <div className="chart-title"><b>{selected.name}</b><span>{selected.type} · {selected.unique.toLocaleString()} unique · {selected.missing.toLocaleString()} missing ({selected.missing_percent.toFixed(1)}%)</span></div>
          <DistributionChart distribution={selected.distribution} />
          {selected.missing > 0 && <div className="imputation-controls">
            <label className="field-label">Fill missing values with<select value={method} onChange={(event) => setMethod(event.target.value)}><option value="mean" disabled={selected.type !== 'Numerical'}>Mean</option><option value="median" disabled={selected.type !== 'Numerical'}>Median</option><option value="mode">Mode</option></select></label>
            <button className="button-primary" onClick={() => impute(false)} disabled={busy || selected.missing === data.rows || (selected.type === 'Categorical' && method !== 'mode')}>{busy ? 'Filling…' : `Impute ${selected.name}`}</button>
          </div>}
          {selected.missing > 0 && selected.type === 'Categorical' && <p className="chart-explainer">Categorical columns can be filled with the most frequent value (mode).</p>}
          {selected.missing === data.rows && <p className="chart-explainer">This column is entirely empty, so there is no value to calculate. Add observed values before imputing it.</p>}
        </> : <p className="empty-copy">No columns match that search.</p>}
      </section>
    </div>
    <section className="chart-card preview-card">
      <div className="section-inline-heading"><div><h3>First rows</h3><p>Raw preview from the active dataset.</p></div><label className="button-secondary">Replace CSV<input type="file" accept=".csv,text/csv" onChange={(event) => upload(event.target.files?.[0])} disabled={busy} /></label></div>
      <div className="table-scroll"><table><thead><tr>{features.map((feature) => <th key={feature.name}>{feature.name}</th>)}</tr></thead>
        <tbody>{data.preview.slice(0, 8).map((row, index) => <tr key={index}>{features.map((feature) => <td key={feature.name}>{String(row[feature.name] ?? '—')}</td>)}</tr>)}</tbody>
      </table></div>
    </section>
  </div>
}
