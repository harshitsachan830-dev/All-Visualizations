import Papa from 'papaparse'

export type Strategy = 'mean' | 'median' | 'mode'
export type CsvRow = string[]
export type ColumnInfo = { name: string; numeric: boolean; missing: number; values: string[] }
export type ParsedCsv = { headers: string[]; rows: CsvRow[]; columns: ColumnInfo[]; duplicateCount: number; malformedRows: number; parseErrors: number }
export type Dataset = { headers: string[]; target: string; features: string[]; rows: CsvRow[]; x: number[][]; y: number[]; classes: string[]; importance: number[]; trainingIndices: number[]; validationIndices: number[] }

const missingTokens = new Set(['', 'na', 'n/a', 'null', 'none', 'nan', 'missing', '?'])
const missing = (value: string | undefined) => value === undefined || missingTokens.has(value.trim().toLowerCase())
const numeric = (value: string) => value.trim() !== '' && Number.isFinite(Number(value))

export function parseCsv(text: string): ParsedCsv {
  const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: 'greedy', dynamicTyping: false })
  const seen = new Map<string, number>()
  const headers = (parsed.meta.fields ?? []).map((header) => {
    const base = header.trim().replace(/^\uFEFF/, '').replace(/\s+/g, '_').replace(/[^\w.-]/g, '').toLowerCase() || 'column'
    const count = (seen.get(base) ?? 0) + 1
    seen.set(base, count)
    return count === 1 ? base : `${base}_${count}`
  })
  const malformed = parsed.data.filter((record) => {
    const extra = (record as Record<string, unknown>).__parsed_extra
    return Array.isArray(extra) && extra.length > 0
  })
  const rawRows = parsed.data.filter((record) => !(record as Record<string, unknown>).__parsed_extra).map((record) => (parsed.meta.fields ?? []).map((header) => String(record[header] ?? '').trim()))
  const nonEmpty = rawRows.filter((row) => row.some((value) => !missing(value)))
  const rows: CsvRow[] = []
  const keys = new Set<string>()
  let duplicateCount = 0
  for (const row of nonEmpty) {
    const key = JSON.stringify(row)
    if (keys.has(key)) duplicateCount += 1
    else { keys.add(key); rows.push(row) }
  }
  const columns = headers.map((name, index) => {
    const values = rows.map((row) => row[index] ?? '').filter((value) => !missing(value))
    return { name, numeric: values.length > 0 && values.every(numeric), missing: rows.length - values.length, values }
  })
  return { headers, rows, columns, duplicateCount, malformedRows: malformed.length, parseErrors: parsed.errors.length }
}

function mode(values: string[]) {
  const counts = new Map<string, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '0'
}

function fill(values: string[], isNumeric: boolean, strategy: Strategy) {
  if (!values.length) return '0'
  if (!isNumeric || strategy === 'mode') return mode(values)
  const sorted = values.map(Number).sort((a, b) => a - b)
  if (strategy === 'mean') return String(sorted.reduce((sum, value) => sum + value, 0) / sorted.length)
  const mid = Math.floor(sorted.length / 2)
  return String(sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2)
}

export function makeDataset(parsed: ParsedCsv, target: string, strategies: Record<string, Strategy>): Dataset {
  const targetIndex = parsed.headers.indexOf(target)
  if (targetIndex < 0) throw new Error('Choose a target column to train against.')
  if (parsed.rows.length < 2) throw new Error('Add at least two non-empty rows to train the model.')
  const rows = parsed.rows.map((row) => row.map((value, index) => missing(value) ? fill(parsed.columns[index].values, parsed.columns[index].numeric, index === targetIndex ? 'mode' : strategies[parsed.columns[index].name] ?? (parsed.columns[index].numeric ? 'median' : 'mode')) : value))
  const classes = [...new Set(rows.map((row) => row[targetIndex]))].sort()
  if (classes.length < 2) throw new Error('The target column needs at least two different classes.')
  const indexes = parsed.headers.map((_, index) => index).filter((index) => index !== targetIndex)
  if (!indexes.length) throw new Error('Keep at least one feature column besides the target.')
  const features = indexes.map((index) => parsed.headers[index])
  const encoded = indexes.map((index) => {
    const values = rows.map((row) => row[index])
    if (parsed.columns[index].numeric) return values.map(Number)
    const categories = [...new Set(values)].sort()
    const lookup = new Map(categories.map((value, category) => [value, category]))
    return values.map((value) => lookup.get(value) ?? 0)
  })
  const x = rows.map((_, rowIndex) => encoded.map((column) => column[rowIndex]))
  for (let feature = 0; feature < features.length; feature += 1) {
    const values = x.map((row) => row[feature])
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length
    const deviation = Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length) || 1
    for (const row of x) row[feature] = (row[feature] - mean) / deviation
  }
  const y = rows.map((row) => classes.indexOf(row[targetIndex]))
  const trainingIndices: number[] = []
  const validationIndices: number[] = []
  classes.forEach((_, classIndex) => {
    const group = y.flatMap((label, index) => label === classIndex ? [index] : [])
    const holdoutCount = group.length > 1 ? Math.max(1, Math.floor(group.length * 0.2)) : 0
    validationIndices.push(...group.slice(0, holdoutCount))
    trainingIndices.push(...group.slice(holdoutCount))
  })
  if (!validationIndices.length) validationIndices.push(...trainingIndices)
  const rawImportance = features.map((_, feature) => Math.sqrt(classes.reduce((sum, _, classIndex) => {
    const group = x.filter((__, index) => y[index] === classIndex).map((row) => row[feature])
    const avg = group.reduce((total, value) => total + value, 0) / Math.max(1, group.length)
    return sum + avg * avg
  }, 0) / classes.length))
  const maxImportance = Math.max(...rawImportance, 0.0001)
  return { headers: parsed.headers, target, features, rows, x, y, classes, importance: rawImportance.map((value) => value / maxImportance), trainingIndices, validationIndices }
}