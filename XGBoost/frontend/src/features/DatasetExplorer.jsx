import { useState, useMemo } from "react";
import { fetchSampleCsv } from "../services/api";

export default function DatasetExplorer({
  file,
  setFile,
  preview,
  setPreview,
  target,
  setTarget,
  task,
  setTask,
  imputationStrategy = "median",
  setImputationStrategy,
  error,
  setError,
  onProceedToTraining,
  sampleDatasets = [],
}) {
  const [loadingSample, setLoadingSample] = useState(false);
  const [tableSearch, setTableSearch] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 8;

  // CSV Line Parser supporting quoted fields
  function parseCsvContent(text, fileName = "dataset.csv") {
    const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
    if (lines.length < 2) {
      throw new Error("CSV file must contain a header and at least one data row.");
    }

    function parseLine(line) {
      const fields = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"' && inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = !inQuotes;
        } else if (ch === "," && !inQuotes) {
          fields.push(current.trim());
          current = "";
        } else {
          current += ch;
        }
      }
      fields.push(current.trim());
      return fields;
    }

    const columns = parseLine(lines[0]).map((c, i) => c || `col_${i + 1}`);
    const rows = lines.slice(1).map(parseLine);

    // Compute column profiles
    const profiles = columns.map((col, idx) => {
      let missingCount = 0;
      const values = [];
      let numericCount = 0;
      const uniqueSet = new Set();

      for (const row of rows) {
        const val = row[idx];
        if (val === undefined || val === null || val.trim() === "") {
          missingCount++;
        } else {
          uniqueSet.add(val);
          const num = Number(val);
          if (!isNaN(num) && val.trim() !== "") {
            numericCount++;
            values.push(num);
          }
        }
      }

      const isNumeric = numericCount > (rows.length - missingCount) * 0.7;
      let minVal = null, maxVal = null, meanVal = null;
      if (isNumeric && values.length > 0) {
        minVal = Math.min(...values);
        maxVal = Math.max(...values);
        meanVal = values.reduce((a, b) => a + b, 0) / values.length;
      }

      return {
        column: col,
        type: isNumeric ? "Numeric" : "Categorical",
        missing: missingCount,
        missingPct: ((missingCount / Math.max(1, rows.length)) * 100).toFixed(1),
        unique: uniqueSet.size,
        min: minVal !== null ? minVal.toFixed(2) : "—",
        max: maxVal !== null ? maxVal.toFixed(2) : "—",
        mean: meanVal !== null ? meanVal.toFixed(2) : "—",
      };
    });

    const defaultTarget = columns[columns.length - 1];
    const targetProfile = profiles.find((p) => p.column === defaultTarget);
    const suggestedTask =
      targetProfile?.type === "Categorical" || (targetProfile?.unique && targetProfile.unique <= 10)
        ? "classification"
        : "regression";

    return {
      columns,
      rows,
      rowCount: rows.length,
      profiles,
      defaultTarget,
      suggestedTask,
      missingCells: profiles.reduce((sum, p) => sum + p.missing, 0),
    };
  }

  async function handleFileInput(e) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setError("");

    if (!selected.name.toLowerCase().endsWith(".csv")) {
      setError("Please select a standard CSV file.");
      return;
    }

    try {
      const text = await selected.text();
      const parsed = parseCsvContent(text, selected.name);
      setFile(selected);
      setPreview(parsed);
      setTarget(parsed.defaultTarget);
      setTask(parsed.suggestedTask);
    } catch (err) {
      setError(err.message || "Failed to parse CSV file.");
    }
  }

  async function handleLoadSample(sampleId) {
    setError("");
    setLoadingSample(true);
    try {
      const csvText = await fetchSampleCsv(sampleId);
      const parsed = parseCsvContent(csvText, `${sampleId}.csv`);
      const blob = new Blob([csvText], { type: "text/csv" });
      const syntheticFile = new File([blob], `${sampleId}.csv`, { type: "text/csv" });

      setFile(syntheticFile);
      setPreview(parsed);
      setTarget(parsed.defaultTarget);
      setTask(parsed.suggestedTask);
    } catch (err) {
      setError(`Failed to load sample dataset: ${err.message}`);
    } finally {
      setLoadingSample(false);
    }
  }

  // Filtered preview rows
  const filteredRows = useMemo(() => {
    if (!preview?.rows) return [];
    if (!tableSearch.trim()) return preview.rows;
    const term = tableSearch.toLowerCase();
    return preview.rows.filter((r) => r.some((cell) => cell.toLowerCase().includes(term)));
  }, [preview, tableSearch]);

  const totalPages = Math.ceil((filteredRows.length || 1) / pageSize);
  const currentRows = filteredRows.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="section-container">
      <div className="section-intro">
        <div>
          <span className="eyebrow">STEP 1 · DATA INGESTION & AUDIT</span>
          <h2>Dataset Explorer & Schema Inspector</h2>
          <p>
            Upload your dataset or choose from preloaded benchmarks. Review feature statistics, missing value rates, and select the prediction target.
          </p>
        </div>
        {preview && (
          <button className="primary-button" onClick={onProceedToTraining}>
            Configure & Train Model →
          </button>
        )}
      </div>

      {/* Preloaded Sample Datasets Bar */}
      <div className="sample-datasets-card">
        <div className="sample-header">
          <div>
            <strong>Quick-Load Benchmark Datasets</strong>
            <span>One-click testing without manual CSV downloads</span>
          </div>
          {loadingSample && <span className="loading-badge">Loading dataset...</span>}
        </div>
        <div className="sample-grid">
          {sampleDatasets.map((s) => (
            <button
              key={s.id}
              className={`sample-button ${preview?.defaultTarget === s.target ? "active-sample" : ""}`}
              onClick={() => handleLoadSample(s.id)}
              disabled={loadingSample}
            >
              <div className="sample-title">
                <span className="sample-dot" />
                <strong>{s.name}</strong>
              </div>
              <span className="sample-desc">{s.description}</span>
              <div className="sample-tags">
                <span className={`tag-pill ${s.task}`}>{s.task.toUpperCase()}</span>
                <span className="target-pill">Target: {s.target}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Upload Zone & Dataset Config Grid */}
      <div className="data-config-grid">
        <div className="upload-dropzone">
          <input
            type="file"
            id="csv-file-input"
            accept=".csv"
            onChange={handleFileInput}
            style={{ display: "none" }}
          />
          <label htmlFor="csv-file-input" className="dropzone-label">
            <div className="dropzone-icon">⇪</div>
            <strong>{file ? file.name : "Select or Drop a CSV File"}</strong>
            <span>Maximum size 30 MB · Standard comma-separated format</span>
            <span className="browse-btn">Browse Files</span>
          </label>
        </div>

        {preview && (
          <div className="target-config-card">
            <h3>Target & Objective Specification</h3>
            <p>Declare your modeling target and confirm the learning task.</p>

            <div className="control-row">
              <label>Target Column (Y)</label>
              <select
                value={target}
                onChange={(e) => {
                  const newTarget = e.target.value;
                  setTarget(newTarget);
                  const p = preview.profiles.find((x) => x.column === newTarget);
                  if (p?.type === "Categorical" || (p?.unique && p.unique <= 10)) {
                    setTask("classification");
                  } else {
                    setTask("regression");
                  }
                }}
              >
                {preview.columns.map((c) => (
                  <option key={c} value={c}>
                    {c} ({preview.profiles.find((x) => x.column === c)?.type})
                  </option>
                ))}
              </select>
            </div>

            <div className="control-row">
              <label>Task Type</label>
              <div className="task-toggle-group">
                <button
                  type="button"
                  className={`task-btn ${task === "regression" ? "active" : ""}`}
                  onClick={() => setTask("regression")}
                >
                  ◈ Regression (Continuous)
                </button>
                <button
                  type="button"
                  className={`task-btn ${task === "classification" ? "active" : ""}`}
                  onClick={() => setTask("classification")}
                >
                  ◉ Classification (Discrete)
                </button>
              </div>
            </div>

            <div className="control-row">
              <label>Missing Value Imputation</label>
              <div className="task-toggle-group">
                <button
                  type="button"
                  className={`task-btn ${imputationStrategy === "median" ? "active" : ""}`}
                  onClick={() => setImputationStrategy && setImputationStrategy("median")}
                  title="Fills missing numeric values with column median (robust to outliers)"
                >
                  Median (Default)
                </button>
                <button
                  type="button"
                  className={`task-btn ${imputationStrategy === "mean" ? "active" : ""}`}
                  onClick={() => setImputationStrategy && setImputationStrategy("mean")}
                  title="Fills missing numeric values with column average"
                >
                  Mean (Average)
                </button>
                <button
                  type="button"
                  className={`task-btn ${imputationStrategy === "mode" ? "active" : ""}`}
                  onClick={() => setImputationStrategy && setImputationStrategy("mode")}
                  title="Fills missing values with most frequent occurrence"
                >
                  Mode (Frequent)
                </button>
                <button
                  type="button"
                  className={`task-btn ${imputationStrategy === "zero" ? "active" : ""}`}
                  onClick={() => setImputationStrategy && setImputationStrategy("zero")}
                  title="Fills missing values with zero"
                >
                  Zero (0.0)
                </button>
              </div>
            </div>

            <div className="target-summary-pill">
              Selected Target: <strong>{target}</strong> · Task:{" "}
              <strong style={{ color: task === "regression" ? "#38bdf8" : "#ec4899" }}>
                {task.toUpperCase()}
              </strong> · Imputation:{" "}
              <strong style={{ color: "#a855f7" }}>
                {imputationStrategy.toUpperCase()}
              </strong>
            </div>
          </div>
        )}
      </div>

      {/* Dataset Summary Cards */}
      {preview && (
        <>
          <div className="stats-row">
            <div className="stat-card">
              <span className="stat-label">TOTAL ROWS</span>
              <h3>{preview.rowCount.toLocaleString()}</h3>
              <span className="stat-sub">Valid records parsed</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">TOTAL COLUMNS</span>
              <h3>{preview.columns.length}</h3>
              <span className="stat-sub">
                {preview.profiles.filter((p) => p.type === "Numeric").length} Numeric ·{" "}
                {preview.profiles.filter((p) => p.type === "Categorical").length} Categorical
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-label">MISSING CELLS</span>
              <h3 style={{ color: preview.missingCells > 0 ? "#facc15" : "#4ade80" }}>
                {preview.missingCells.toLocaleString()}
              </h3>
              <span className="stat-sub">
                {preview.missingCells > 0
                  ? "Will be automatically imputed"
                  : "Complete dataset with zero nulls"}
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-label">DATASET MEMORY</span>
              <h3>~{(preview.rowCount * preview.columns.length * 8 / 1024).toFixed(1)} KB</h3>
              <span className="stat-sub">Estimated in-memory footprint</span>
            </div>
          </div>

          {/* Column Profile Table */}
          <div className="table-card">
            <div className="table-card-header">
              <div>
                <h3>Feature Schema & Distribution Metrics</h3>
                <p>Auditing column types, variance, and null rates across the dataset</p>
              </div>
            </div>
            <div className="table-wrapper">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Column Name</th>
                    <th>Inferred Type</th>
                    <th>Missing Count</th>
                    <th>Missing %</th>
                    <th>Unique Values</th>
                    <th>Min</th>
                    <th>Max</th>
                    <th>Mean</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.profiles.map((p) => (
                    <tr key={p.column} className={p.column === target ? "target-row" : ""}>
                      <td>
                        <strong>{p.column}</strong>
                        {p.column === target && <span className="target-tag">Target</span>}
                      </td>
                      <td>
                        <span className={`type-badge ${p.type.toLowerCase()}`}>{p.type}</span>
                      </td>
                      <td>{p.missing}</td>
                      <td>
                        <span style={{ color: Number(p.missingPct) > 10 ? "#f87171" : "#a3e635" }}>
                          {p.missingPct}%
                        </span>
                      </td>
                      <td>{p.unique}</td>
                      <td>{p.min}</td>
                      <td>{p.max}</td>
                      <td>{p.mean}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Interactive Data Preview */}
          <div className="table-card">
            <div className="table-card-header">
              <div>
                <h3>Interactive Data Preview ({filteredRows.length} rows)</h3>
                <p>Inspect sample row values across all features</p>
              </div>
              <div className="table-search-box">
                <input
                  type="text"
                  placeholder="Filter rows by keyword..."
                  value={tableSearch}
                  onChange={(e) => {
                    setTableSearch(e.target.value);
                    setPage(0);
                  }}
                />
              </div>
            </div>

            <div className="table-wrapper">
              <table className="custom-table preview-table">
                <thead>
                  <tr>
                    <th>#</th>
                    {preview.columns.map((c) => (
                      <th key={c} className={c === target ? "target-col-head" : ""}>
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {currentRows.map((r, rIdx) => (
                    <tr key={rIdx}>
                      <td className="row-num">{page * pageSize + rIdx + 1}</td>
                      {preview.columns.map((_, cIdx) => (
                        <td key={cIdx} className={preview.columns[cIdx] === target ? "target-col-cell" : ""}>
                          {r[cIdx] !== undefined && r[cIdx] !== "" ? r[cIdx] : <i className="null-text">null</i>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="table-pagination">
              <span>
                Showing page {page + 1} of {Math.max(1, totalPages)}
              </span>
              <div className="page-buttons">
                <button
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  ← Previous
                </button>
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
