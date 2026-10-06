import { useRef, useState } from 'react'
import Papa from 'papaparse'
import { AlertCircle, ArrowRight, Check, FileSpreadsheet, FileUp, Rows3, Table2 } from 'lucide-react'
import type { DatasetInput, ImputationMethod, Task } from './types'

type ParsedFile = {
  name: string
  columns: string[]
  rows: Record<string, unknown>[]
}

interface DatasetStudioProps {
  onUseDataset: (dataset: DatasetInput) => void
}

const isMissing = (value: unknown) =>
  value === null || value === undefined || (typeof value === 'string' && value.trim() === '')

function DatasetStudio({ onUseDataset }: DatasetStudioProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<ParsedFile | null>(null)
  const [target, setTarget] = useState('')
  const [task, setTask] = useState<Task>('classification')
  const [methods, setMethods] = useState<Record<string, ImputationMethod>>({})
  const [message, setMessage] = useState('')
  const [dragging, setDragging] = useState(false)

  const loadFile = (selectedFile?: File) => {
    if (!selectedFile) return
    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      setMessage('Choose a CSV file to continue.')
      return
    }
    Papa.parse<Record<string, unknown>>(selectedFile, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: 'greedy',
      complete: (result) => {
        const columns = result.meta.fields?.filter(Boolean) ?? []
        const rows = result.data.filter((row) => columns.some((column) => column in row))
        if (!columns.length || !rows.length) {
          setMessage('This CSV has no readable header and data rows.')
          return
        }
        setFile({ name: selectedFile.name, columns, rows })
        setTarget(columns.at(-1) ?? '')
        setMethods(Object.fromEntries(columns.map((column) => {
          const values = rows.map((row) => row[column]).filter((value) => !isMissing(value))
          const numeric = values.length > 0 && values.every((value) => typeof value === 'number' && Number.isFinite(value))
          return [column, numeric ? 'median' : 'mode']
        })))
        setMessage(result.errors[0]?.message ?? '')
      },
      error: (error) => setMessage(error.message),
    })
  }

  if (!file) {
    return (
      <section className="dataset-studio">
        <div className="page-heading">
          <div>
            <div className="eyebrow">DATA WORKSPACE</div>
            <h2>Bring your own dataset</h2>
            <p>Inspect columns, choose a target, and resolve missing values before training.</p>
          </div>
          <span className="format-note"><FileSpreadsheet size={15} /> CSV · up to 25 MB</span>
        </div>
        <input
          ref={inputRef}
          className="visually-hidden"
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => loadFile(event.target.files?.[0])}
        />
        <button
          className={`upload-zone ${dragging ? 'is-dragging' : ''}`}
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => { event.preventDefault(); setDragging(false); loadFile(event.dataTransfer.files[0]) }}
        >
          <span className="upload-icon"><FileUp size={24} /></span>
          <strong>Drop a CSV file here</strong>
          <span>or browse from your computer</span>
          <span className="upload-cta">Choose CSV file</span>
        </button>
        <div className="studio-footnote">
          <Rows3 size={16} /> Your file stays in this local app session. Data is sent to the local training API only when you train.
        </div>
        {message && <p className="inline-error"><AlertCircle size={15} />{message}</p>}
      </section>
    )
  }

  const columnInfo = file.columns.map((column) => {
    const values = file.rows.map((row) => row[column]).filter((value) => !isMissing(value))
    const numeric = values.length > 0 && values.every((value) => typeof value === 'number' && Number.isFinite(value))
    const missing = file.rows.length - values.length
    return { column, values, numeric, missing }
  })
  const missingColumns = columnInfo.filter((item) => item.missing > 0 && item.column !== target)
  const targetMissing = columnInfo.find((item) => item.column === target)?.missing ?? 0
  const previewRows = file.rows.slice(0, 8)
  const usableRows = file.rows.filter((row) => !isMissing(row[target])).length
  const canTrain = Boolean(target) && usableRows >= 8 && file.columns.some((column) => column !== target)

  const impute = () => {
    const validRows = file.rows.filter((row) => !isMissing(row[target]))
    const fillValues = new Map<string, unknown>()
    for (const info of missingColumns) {
      if (!info.values.length) {
        setMessage(`Column “${info.column}” has no values to use for imputation.`)
        return
      }
      const method = methods[info.column] ?? 'mode'
      if (method !== 'mode' && !info.numeric) {
        setMessage(`Use mode for the categorical “${info.column}” column.`)
        return
      }
      if (method === 'mean') {
        fillValues.set(info.column, info.values.reduce<number>((sum, value) => sum + Number(value), 0) / info.values.length)
      } else if (method === 'median') {
        const sorted = info.values.map(Number).sort((left, right) => left - right)
        const middle = Math.floor(sorted.length / 2)
        fillValues.set(info.column, sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2)
      } else {
        const counts = new Map<string, { value: unknown; count: number }>()
        for (const value of info.values) {
          const key = String(value)
          const entry = counts.get(key) ?? { value, count: 0 }
          entry.count += 1
          counts.set(key, entry)
        }
        fillValues.set(info.column, [...counts.values()].sort((left, right) => right.count - left.count)[0].value)
      }
    }
    const rows = validRows.map((row) => Object.fromEntries(file.columns.map((column) => [
      column,
      isMissing(row[column]) && fillValues.has(column) ? fillValues.get(column) : row[column],
    ])))
    onUseDataset({ rows, target, task, imputation: methods })
  }

  return (
    <section className="dataset-studio">
      <div className="page-heading">
        <div>
          <div className="eyebrow">DATA WORKSPACE / IMPORT</div>
          <h2>{file.name}</h2>
          <p>Review the preview, set your prediction target, and choose how each incomplete feature is filled.</p>
        </div>
        <button className="quiet-button" type="button" onClick={() => { setFile(null); setMessage('') }}>Choose another file</button>
      </div>

      <div className="dataset-summary-strip">
        <span><Table2 size={15} /> {file.columns.length} columns</span>
        <span><Rows3 size={15} /> {file.rows.length.toLocaleString()} rows</span>
        <span className={missingColumns.length || targetMissing ? 'warn-text' : 'good-text'}>
          {missingColumns.length || targetMissing ? <AlertCircle size={15} /> : <Check size={15} />}
          {missingColumns.length + (targetMissing ? 1 : 0)} columns with missing values
        </span>
      </div>

      <div className="dataset-config">
        <label className="field-control">
          <span>Prediction target</span>
          <select value={target} onChange={(event) => setTarget(event.target.value)}>
            {file.columns.map((column) => <option key={column} value={column}>{column}</option>)}
          </select>
        </label>
        <label className="field-control">
          <span>Problem type</span>
          <select value={task} onChange={(event) => setTask(event.target.value as Task)}>
            <option value="classification">Classification</option>
            <option value="regression">Regression</option>
          </select>
        </label>
      </div>

      <div className="studio-section-head">
        <div><h3>Missing values</h3><p>Target rows with no label are excluded. Feature gaps use your selected method.</p></div>
        <span className="section-count">{missingColumns.length} feature columns</span>
      </div>
      {missingColumns.length ? (
        <div className="missing-table">
          <div className="missing-row missing-header"><span>Column</span><span>Type</span><span>Missing</span><span>Fill method</span></div>
          {missingColumns.map((info) => (
            <div className="missing-row" key={info.column}>
              <strong>{info.column}</strong>
              <span>{info.numeric ? 'Numeric' : 'Categorical'}</span>
              <span className="warn-text">{info.missing} <small>({Math.round(info.missing / file.rows.length * 100)}%)</small></span>
              <select
                aria-label={`Imputation method for ${info.column}`}
                value={methods[info.column] ?? 'mode'}
                onChange={(event) => setMethods((previous) => ({ ...previous, [info.column]: event.target.value as ImputationMethod }))}
              >
                {info.numeric && <><option value="mean">Mean</option><option value="median">Median</option></>}
                <option value="mode">Mode</option>
              </select>
            </div>
          ))}
          {targetMissing > 0 && <div className="target-note"><AlertCircle size={15} /> {targetMissing} rows without a {target} value will be excluded.</div>}
        </div>
      ) : (
        <div className="all-clear"><Check size={16} /> No missing feature values found. Target rows are ready to train.</div>
      )}

      <div className="studio-section-head preview-head">
        <div><h3>Data preview</h3><p>First {previewRows.length} rows · empty cells are highlighted</p></div>
      </div>
      <div className="table-scroll">
        <table className="data-table">
          <thead><tr>{file.columns.map((column) => <th key={column}>{column}{column === target && <span className="target-tag">target</span>}</th>)}</tr></thead>
          <tbody>{previewRows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {file.columns.map((column) => <td className={isMissing(row[column]) ? 'missing-cell' : ''} key={column}>{isMissing(row[column]) ? 'Missing' : String(row[column])}</td>)}
            </tr>
          ))}</tbody>
        </table>
      </div>

      <div className="studio-actions">
        {message && <p className="inline-error"><AlertCircle size={15} />{message}</p>}
        <span>{usableRows.toLocaleString()} labeled rows will be used</span>
        <button className="primary-button" type="button" disabled={!canTrain} onClick={impute}>
          Use dataset & train <ArrowRight size={16} />
        </button>
      </div>
    </section>
  )
}

export default DatasetStudio