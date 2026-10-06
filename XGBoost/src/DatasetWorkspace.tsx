import { useState } from 'react'
import {
  Activity,
  ArrowRight,
  Check,
  CircleAlert,
  Database,
  FileSpreadsheet,
  LoaderCircle,
  Sparkles,
  Upload,
  X,
} from 'lucide-react'
import './App.css'

type Task = 'classification' | 'regression'
type CsvColumn = {
  name: string
  kind: 'numeric' | 'categorical'
  likely_identifier: boolean
  missing_count: number
  missing_percent: number
  unique_count: number
  sample_values: (string | number | null)[]
}

type CsvProfile = {
  filename: string
  delimiter: string
  row_count: number
  column_count: number
  duplicate_rows: number
  duplicate_headers: string[]
  parse_warnings: string[]
  missing_cells: number
  columns: CsvColumn[]
  target_candidates: { name: string; suggested_task: Task; unique_count: number; suggested: number; likely_identifier: boolean }[]
  warnings: { level: 'warning' | 'info'; message: string }[]
  blockers: string[]
  preview: Record<string, string | number | null>[]
}

type CsvPrediction = {
  source_row: number
  split: 'train' | 'test'
  actual: string | number
  prediction: string | number
  confidence?: number
  probabilities?: Record<string, number>
  residual?: number
  features: Record<string, string | number | null>
}

type TrainedDataset = {
  filename: string
  target_column: string
  task: Task
  rows_uploaded: number
  rows_trained: number
  rows_tested: number
  duplicate_rows_found: number
  missing_target_rows_dropped: number
  missing_feature_cells: number
  preprocessing: {
    numeric_missing: string
    categorical_missing: string
    duplicate_rows: string
    excluded_columns: string[]
    feature_columns: string[]
  }
  metrics: Record<string, number | string[] | number[][] | null>
  feature_importance: { feature: string; gain: number }[]
  predictions: CsvPrediction[]
  prediction_count: number
  predictions_truncated: boolean
  warnings: { level: 'warning' | 'info'; message: string }[]
}

type DatasetWorkspaceProps = {
  file: File | null
  profile: CsvProfile | null
  trained: TrainedDataset | null
  task: Task
  targetColumn: string
  numericMissing: string
  categoricalMissing: string
  duplicatePolicy: string
  excludedColumns: string[]
  busy: boolean
  error: string
  dragging: boolean
  selectedPredictionRow: number | null
  onFile: (file: File) => Promise<void>
  onSample: (sampleName: string) => Promise<void>
  onTrain: () => Promise<void>
  onReset: () => void
  onTarget: (target: string) => void
  onTask: (task: Task) => void
  onNumericMissing: (strategy: string) => void
  onCategoricalMissing: (strategy: string) => void
  onDuplicatePolicy: (policy: string) => void
  onExcludedColumns: (columns: string[]) => void
  onDragging: (dragging: boolean) => void
  onSelectedPredictionRow: (row: number | null) => void
}

export default function DatasetWorkspace({
  file,
  profile,
  trained,
  task,
  targetColumn,
  numericMissing,
  categoricalMissing,
  duplicatePolicy,
  excludedColumns,
  busy,
  error,
  dragging,
  selectedPredictionRow,
  onFile,
  onSample,
  onTrain,
  onReset,
  onTarget,
  onTask,
  onNumericMissing,
  onCategoricalMissing,
  onDuplicatePolicy,
  onExcludedColumns,
  onDragging,
  onSelectedPredictionRow,
}: DatasetWorkspaceProps) {
  const [predictionSplit, setPredictionSplit] = useState<'test' | 'train' | 'all'>('test')
  const [showAllRows, setShowAllRows] = useState(false)
  const candidates = profile?.target_candidates ?? []
  const trainAllowed = Boolean(file && profile && profile.blockers.length === 0 && targetColumn)
  const allPredictions = trained?.predictions ?? []
  const splitCounts = {
    all: allPredictions.length,
    test: allPredictions.filter((row) => row.split === 'test').length,
    train: allPredictions.filter((row) => row.split === 'train').length,
  }
  const filteredPredictions = allPredictions.filter((row) => predictionSplit === 'all' || row.split === predictionSplit)
  const visiblePredictions = showAllRows ? filteredPredictions : filteredPredictions.slice(0, 100)
  const selectedRow = allPredictions.find((row) => row.source_row === selectedPredictionRow)
  const previewColumns = profile?.columns.slice(0, 8) ?? []
  const excludedSet = new Set(excludedColumns)

  const selectFile = (files: FileList | null) => {
    const selectedFile = files?.[0]
    if (selectedFile) void onFile(selectedFile)
  }

  const toggleExcluded = (column: string) => {
    onExcludedColumns(excludedSet.has(column)
      ? excludedColumns.filter((item) => item !== column)
      : [...excludedColumns, column])
  }

  const metrics = trained?.task === 'classification'
    ? [
        { label: 'Test accuracy', value: trained.metrics.accuracy },
        { label: 'Precision', value: trained.metrics.precision },
        { label: 'Recall', value: trained.metrics.recall },
        { label: 'F1 score', value: trained.metrics.f1 },
      ]
    : trained
      ? [
          { label: 'Test MAE', value: trained.metrics.mae },
          { label: 'Test RMSE', value: trained.metrics.rmse },
          { label: 'Test R²', value: trained.metrics.r2 },
          { label: 'Test rows', value: trained.rows_tested },
        ]
      : []

  const metricText = (value: number | string[] | number[][] | null | undefined, label: string) => {
    if (typeof value !== 'number') return '—'
    if (label.includes('rows')) return Math.round(value).toLocaleString()
    if (label.includes('MAE') || label.includes('RMSE') || label.includes('R²')) return value.toFixed(3)
    return `${(value * 100).toFixed(1)}%`
  }

  return (
    <div className="dataset-workspace">
      <section className="panel dataset-intro-panel">
        <div className="dataset-intro-heading">
          <span className="dataset-intro-icon"><Database size={19} /></span>
          <div><h2>Upload a CSV to get started</h2><p>Review data quality, choose how to fill missing values, train XGBoost, and explore predictions for your rows.</p></div>
        </div>
        {!file ? (
          <label
            className={`csv-dropzone ${dragging ? 'csv-dropzone-active' : ''} ${busy ? 'csv-dropzone-busy' : ''}`}
            onDragOver={(event) => { event.preventDefault(); onDragging(true) }}
            onDragLeave={() => onDragging(false)}
            onDrop={(event) => { event.preventDefault(); onDragging(false); selectFile(event.dataTransfer.files) }}
          >
            <input className="csv-file-input" type="file" accept=".csv,text/csv" onChange={(event) => selectFile(event.currentTarget.files)} />
            <span className="upload-icon">{busy ? <LoaderCircle className="spin-icon" size={23} /> : <Upload size={22} />}</span>
            <strong>{busy ? 'Inspecting your CSV…' : 'Drop a CSV here or browse files'}</strong>
            <small>CSV · up to 15 MB · files are processed for this session and not saved</small>
          </label>
        ) : (
          <div className="selected-file-row">
            <span className="selected-file-icon"><FileSpreadsheet size={19} /></span>
            <span className="selected-file-copy"><strong>{file.name}</strong><small>{(file.size / 1024).toFixed(0)} KB · {profile ? `${profile.row_count.toLocaleString()} rows · ${profile.column_count} columns` : 'Reading file…'}</small></span>
            {busy && <LoaderCircle className="spin-icon upload-spinner" size={18} />}
            <button type="button" className="file-remove" onClick={onReset} aria-label="Remove uploaded CSV" title="Remove file"><X size={16} /></button>
          </div>
        )}
        <div className="sample-datasets">
          <span>TRY A SAMPLE</span>
          <button type="button" disabled={busy} onClick={() => void onSample('telco_churn_sample.csv')}><FileSpreadsheet size={15} /><span><strong>Telco churn</strong><small>Classification · duplicates + blanks</small></span><ArrowRight size={14} /></button>
          <button type="button" disabled={busy} onClick={() => void onSample('home_prices_sample.csv')}><FileSpreadsheet size={15} /><span><strong>Home prices</strong><small>Regression · numeric + category blanks</small></span><ArrowRight size={14} /></button>
        </div>
        {error && <div className="dataset-error" role="alert"><CircleAlert size={17} /><span>{error}</span></div>}
      </section>

      {profile && <>
        <div className="profile-summary">
          <article><span>ROWS</span><strong>{profile.row_count.toLocaleString()}</strong><small>CSV records</small></article>
          <article><span>COLUMNS</span><strong>{profile.column_count}</strong><small>Detected fields</small></article>
          <article><span>MISSING CELLS</span><strong>{profile.missing_cells.toLocaleString()}</strong><small>Across all fields</small></article>
          <article><span>DUPLICATE ROWS</span><strong>{profile.duplicate_rows.toLocaleString()}</strong><small>Exact matches</small></article>
        </div>

        {profile.blockers.length > 0 && <section className="dataset-blockers" role="alert"><div className="quality-alert-icon"><CircleAlert size={18} /></div><div><strong>This CSV needs refinement before training</strong>{profile.blockers.map((message) => <p key={message}>{message}</p>)}</div></section>}
        {profile.warnings.length > 0 && <section className="dataset-notices" aria-label="CSV quality notices">{profile.warnings.map((notice, index) => <div className={`dataset-notice notice-${notice.level}`} key={`${notice.message}-${index}`}><span>{notice.level === 'info' ? <Check size={14} /> : <CircleAlert size={15} />}</span><p>{notice.message}</p></div>)}</section>}

        <div className="dataset-config-grid">
          <section className="panel cleanup-panel">
            <div className="dataset-panel-heading"><div><span className="dataset-step-number">01</span><h2>Choose target & missing-value rules</h2></div><small>Applied only for this training run</small></div>
            <div className="dataset-form-grid">
              <label className="dataset-field"><span>Target column</span><select value={targetColumn} onChange={(event) => { onTarget(event.target.value); onExcludedColumns(excludedColumns.filter((column) => column !== event.target.value)) }}><option value="">Choose the value to predict</option>{profile.columns.map((column) => <option value={column.name} key={column.name}>{column.name}{column.likely_identifier ? ' · likely ID' : candidates.some((candidate) => candidate.name === column.name && candidate.suggested > 0) ? ' · suggested' : ''}</option>)}</select></label>
              <label className="dataset-field"><span>Prediction type</span><select value={task} onChange={(event) => onTask(event.target.value as Task)}><option value="classification">Classification</option><option value="regression">Regression</option></select></label>
              <label className="dataset-field"><span>Numeric missing values</span><select value={numericMissing} onChange={(event) => onNumericMissing(event.target.value)}><option value="median">Fill with median</option><option value="mean">Fill with mean</option><option value="mode">Fill with mode (most common)</option><option value="drop_rows">Drop rows missing numeric values</option></select><small>Mean, median, or mode is calculated from training rows only.</small></label>
              <label className="dataset-field"><span>Category missing values</span><select value={categoricalMissing} onChange={(event) => onCategoricalMissing(event.target.value)}><option value="mode">Fill with mode (most common category)</option><option value="constant">Fill with “Unknown”</option><option value="drop_rows">Drop rows missing categories</option></select><small>Mean and median apply to numeric columns; mode also works for categories.</small></label>
              <label className="dataset-field"><span>Exact duplicate rows</span><select value={duplicatePolicy} onChange={(event) => onDuplicatePolicy(event.target.value)}><option value="drop">Remove duplicates, keep first</option><option value="keep">Keep duplicates</option></select></label>
            </div>
            <div className="exclude-columns"><div className="exclude-heading"><strong>Feature columns</strong><small>Uncheck fields to exclude. The target cannot be used as an input.</small></div><div className="exclude-list">{profile.columns.filter((column) => column.name !== targetColumn).map((column) => <label key={column.name} className={`exclude-option ${excludedSet.has(column.name) ? 'exclude-option-off' : ''}`}><input type="checkbox" checked={!excludedSet.has(column.name)} onChange={() => toggleExcluded(column.name)} /><span>{column.name}</span><small>{column.kind}</small></label>)}</div></div>
            <div className="train-actions"><span><Sparkles size={15} />XGBoost · 80 trees · 75/25 train/test split</span><button type="button" className="train-button" disabled={!trainAllowed || busy} onClick={() => void onTrain()}>{busy ? <><LoaderCircle className="spin-icon" size={16} />Training…</> : <><Activity size={16} />Train & predict</>}</button></div>
          </section>

          <section className="panel data-preview-panel">
            <div className="dataset-panel-heading"><div><span className="dataset-step-number">02</span><h2>Data preview</h2></div><small>First {profile.preview.length} rows</small></div>
            <div className="data-preview-meta"><span>{profile.filename}</span><span>Delimiter: {profile.delimiter === '\t' ? 'tab' : profile.delimiter}</span></div>
            <div className="data-table-wrap"><table className="data-table"><thead><tr>{previewColumns.map((column) => <th key={column.name}>{column.name}<small>{column.missing_percent}% missing</small></th>)}</tr></thead><tbody>{profile.preview.map((row, rowIndex) => <tr key={rowIndex}>{previewColumns.map((column) => <td className={row[column.name] === null ? 'missing-cell' : ''} key={column.name}>{row[column.name] === null ? 'Missing' : String(row[column.name])}</td>)}</tr>)}</tbody></table></div>
            {profile.column_count > previewColumns.length && <p className="preview-more">Showing {previewColumns.length} of {profile.column_count} columns.</p>}
          </section>
        </div>
      </>}

      {trained && <section className="dataset-results">
        <div className="dataset-results-heading"><div><span className="dataset-step-number">03</span><h2>Predictions from {trained.filename}</h2><p>Metrics use the held-out test split only. Each row is labeled train or test.</p></div><button type="button" className="restore-button" onClick={() => void onTrain()} disabled={busy}>{busy ? 'Training…' : 'Retrain with these settings'}</button></div>
        <div className="dataset-result-metrics">{metrics.map((metric) => <article className="metric-card" key={metric.label}><span>{metric.label}</span><strong>{metricText(metric.value, metric.label)}</strong><small>Test split · n = {trained.rows_tested}</small></article>)}<article className="metric-card"><span>TRAINING ROWS</span><strong>{trained.rows_trained.toLocaleString()}</strong><small>After selected cleanup</small></article></div>
        {trained.warnings.length > 0 && <div className="dataset-result-notes">{trained.warnings.map((notice, index) => <p className={`result-note result-note-${notice.level}`} key={`${notice.message}-${index}`}>{notice.level === 'info' ? <Check size={14} /> : <CircleAlert size={14} />}{notice.message}</p>)}</div>}
        <section className="panel prediction-results-panel">
          <div className="dataset-panel-heading"><div><h2>Row predictions</h2><small>{trained.prediction_count.toLocaleString()} uploaded rows · {trained.predictions_truncated ? 'first 500 returned' : 'all rows returned'}</small></div><div className="prediction-filter" role="group" aria-label="Filter prediction rows">{(['test', 'train', 'all'] as const).map((split) => <button key={split} type="button" className={predictionSplit === split ? 'prediction-filter-active' : ''} onClick={() => { setPredictionSplit(split); onSelectedPredictionRow(null) }}>{split === 'all' ? `All ${splitCounts.all}` : `${split[0].toUpperCase()}${split.slice(1)} ${splitCounts[split]}`}</button>)}</div></div>
          <div className="prediction-table-wrap"><table className="data-table prediction-table"><thead><tr><th>CSV row</th><th>Split</th><th>Actual {trained.target_column}</th><th>Model prediction</th>{trained.task === 'classification' ? <th>Confidence</th> : <th>Residual</th>}</tr></thead><tbody>{visiblePredictions.map((row) => <tr className={selectedPredictionRow === row.source_row ? 'prediction-row-selected' : ''} key={row.source_row}><td><button type="button" className="row-select-button" onClick={() => onSelectedPredictionRow(selectedPredictionRow === row.source_row ? null : row.source_row)}>Row {row.source_row}</button></td><td><span className={`split-chip split-${row.split}`}>{row.split}</span></td><td>{String(row.actual)}</td><td><strong>{String(row.prediction)}</strong></td><td>{trained.task === 'classification' ? `${((row.confidence ?? 0) * 100).toFixed(1)}%` : row.residual?.toFixed(2)}</td></tr>)}</tbody></table></div>
          {selectedRow && <div className="selected-prediction-detail"><div><span>SELECTED CSV ROW {selectedRow.source_row}</span><strong>{selectedRow.split.toUpperCase()} · actual {String(selectedRow.actual)} · predicted {String(selectedRow.prediction)}</strong></div><div className="selected-feature-list">{Object.entries(selectedRow.features).map(([name, value]) => <span key={name}><small>{name}</small><strong>{value === null ? 'Missing' : String(value)}</strong></span>)}</div></div>}
          {filteredPredictions.length > 100 && <button type="button" className="show-more-rows" onClick={() => setShowAllRows((current) => !current)}>{showAllRows ? 'Show first 100 rows' : `Show all ${filteredPredictions.length} returned rows`}</button>}
        </section>
        <section className="panel model-importance-results"><div className="dataset-panel-heading"><div><h2>Feature importance</h2><small>Gain from the fitted XGBoost model · not a causal explanation</small></div></div><div className="model-gain-list">{trained.feature_importance.slice(0, 8).map((item) => <div className="model-gain-row" key={item.feature}><span>{item.feature}</span><div><i style={{ width: `${Math.max(item.gain * 100, 2)}%` }} /></div><strong>{item.gain.toFixed(3)}</strong></div>)}</div></section>
      </section>}
    </div>
  )
}