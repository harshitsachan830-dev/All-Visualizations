import { useState, useRef, useCallback } from "react";
import {
  parseCsvRaw,
  cleanCsv,
  isMissingCsvValue,
  type ParsedCsvResult,
  type MissingStrategy,
  type CleanedDataset,
} from "./csvParser";

type UploadPhase =
  | "idle"
  | "dragging"
  | "parsed"
  | "cleaning"
  | "ready"
  | "error";

type CsvUploadProps = {
  onDatasetReady: (dataset: CleanedDataset, filename: string) => void;
};

const STRATEGY_LABELS: Record<MissingStrategy, string> = {
  mean: "Fill with Mean",
  median: "Fill with Median",
  mode: "Fill with Mode",
  drop: "Drop Rows with Missing Values",
};

const STRATEGY_DESCRIPTIONS: Record<MissingStrategy, string> = {
  mean: "Fill numeric columns with their average; categorical columns use their most common value.",
  median:
    "Fill numeric columns with their middle value; categorical columns use their most common value.",
  mode: "Fill missing values with the most frequent value in each column.",
  drop: "Remove rows with missing selected inputs or target labels.",
};

const DEMO_MESSY_CSV = `petal_length_cm,petal_width_cm,flower_class
1.4,0.2,Flower A
1.3,,Flower A
1.5,0.2,Flower A
1.4,0.2,Flower A
4.7,1.4,Flower B
4.5,1.5,Flower B
,1.3,Flower B
4.9,1.5,Flower B
1.7,0.4,Flower A
4.8,1.8,Flower B
1.5,0.3,Flower A
5.0,1.7,Flower B
1.6,0.2,Flower A
4.5,1.3,Flower B`;

const DEMO_TOO_MESSY_CSV = `petal_length_cm,petal_width_cm,flower_class
1.4,,Flower A
,,Unknown
bad_val,0.2,Flower A
,,Flower B
4.7,,Flower B
,,Flower C
,1.3,Flower B`;

const CSV_TEMPLATE = `petal_length_cm,petal_width_cm,flower_class
1.4,0.2,Flower A
1.3,0.2,Flower A
1.5,0.2,Flower A
4.7,1.4,Flower B
4.5,1.5,Flower B
4.9,1.5,Flower B
1.7,0.4,Flower A
4.8,1.8,Flower B
1.5,0.3,Flower A
5.0,1.7,Flower B
1.6,0.2,Flower A
4.6,1.4,Flower B`;

function IssueIcon({ level }: { level: "error" | "warning" | "info" }) {
  if (level === "error") return <span className="issue-icon error">✕</span>;
  if (level === "warning") return <span className="issue-icon warning">⚠</span>;
  return <span className="issue-icon info">ℹ</span>;
}

export function CsvUpload({ onDatasetReady }: CsvUploadProps) {
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [filename, setFilename] = useState("");
  const [parseResult, setParseResult] = useState<ParsedCsvResult | null>(null);
  const [missingStrategy, setMissingStrategy] =
    useState<MissingStrategy>("mean");
  const [removeDuplicates, setRemoveDuplicates] = useState(true);
  const [targetColumn, setTargetColumn] = useState("");
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [cleaned, setCleaned] = useState<CleanedDataset | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeTab, setActiveTab] = useState<"options" | "preview">("options");
  const fileRef = useRef<HTMLInputElement>(null);

  const loadCsvContent = useCallback((text: string, name: string) => {
    setFilename(name);
    try {
      const result = parseCsvRaw(text);
      setParseResult(result);
      setCleaned(null);
      const suggestedTarget =
        result.targetCandidates.find((column) =>
          /(^|[_\s])(class|label|target|outcome|result|churn|species|category)([_\s]|$)/i.test(
            column,
          ),
        ) ?? result.targetCandidates[0] ?? "";
      setTargetColumn(suggestedTarget);
      setSelectedFeatures(
        result.featureCandidates.filter((column) => column !== suggestedTarget),
      );
      setPhase("parsed");
      setErrorMsg("");
      setActiveTab("options");
    } catch (err) {
      setErrorMsg(String(err));
      setPhase("error");
    }
  }, []);

  const handleFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setErrorMsg("Please upload a .csv file.");
      setPhase("error");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      loadCsvContent(text, file.name);
    };
    reader.readAsText(file);
  }, [loadCsvContent]);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setPhase("idle");
      const file = event.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setPhase("dragging");
  };

  const onDragLeave = () => {
    if (phase === "dragging") setPhase("idle");
  };

  const onFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleFile(file);
    event.target.value = "";
  };

  const loadDemoMessy = () => {
    loadCsvContent(DEMO_MESSY_CSV, "messy_sample_field_data.csv");
  };

  const loadDemoTooMessy = () => {
    loadCsvContent(DEMO_TOO_MESSY_CSV, "damaged_corrupted_data.csv");
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "flower_dataset_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const applyClean = () => {
    if (!parseResult) return;
    try {
      const result = cleanCsv(
        parseResult,
        missingStrategy,
        removeDuplicates,
        targetColumn,
        selectedFeatures,
      );
      if (result.rows.length < 8) {
        setErrorMsg(
          `Only ${result.rows.length} usable rows remain. Select different columns or adjust cleaning; at least 8 are required.`,
        );
        return;
      }
      setCleaned(result);
      setPhase("ready");
      setActiveTab("preview");
      setErrorMsg("");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const useDataset = () => {
    if (!cleaned) return;
    onDatasetReady(cleaned, filename);
  };

  const reset = () => {
    setPhase("idle");
    setParseResult(null);
    setCleaned(null);
    setErrorMsg("");
    setFilename("");
    setActiveTab("options");
  };

  const hasIssues =
    parseResult &&
    (parseResult.missingValueCount > 0 ||
      parseResult.duplicateCount > 0);
  const previewColumns = cleaned
    ? [...cleaned.featureNames, cleaned.targetName]
    : [
        ...(selectedFeatures.length
          ? selectedFeatures.slice(0, 7)
          : (parseResult?.columns.filter((column) => column !== targetColumn).slice(0, 7) ?? [])),
        ...(targetColumn ? [targetColumn] : []),
      ];
  const previewRows = cleaned
    ? cleaned.rows.slice(0, 8).map((row) => ({
        cells: [...row.features.map((value) => String(Number(value.toFixed(3)))), row.label],
        hasMissing: false,
      }))
    : (parseResult?.rawRows.slice(0, 8).map((row) => ({
        cells: previewColumns.map((column) =>
          isMissingCsvValue(row[column]) ? "—" : row[column].trim(),
        ),
        hasMissing: previewColumns.some((column) =>
          isMissingCsvValue(row[column]),
        ),
      })) ?? []);

  return (
    <div className="csv-upload-wrapper">
      {/* Quick sample bar */}
      <div className="csv-quick-actions">
        <span className="csv-quick-label">QUICK TEST:</span>
        <button
          type="button"
          className="csv-quick-btn"
          onClick={loadDemoMessy}
          title="Load CSV with missing cells and duplicates to test data cleaning"
        >
          <span className="quick-icon">🧪</span> Try Messy Sample CSV
        </button>
        <button
          type="button"
          className="csv-quick-btn"
          onClick={loadDemoTooMessy}
          title="Load heavily damaged CSV to test refinement warning"
        >
          <span className="quick-icon">⚠️</span> Try "Too Messy" CSV
        </button>
        <button
          type="button"
          className="csv-quick-btn csv-quick-btn--template"
          onClick={downloadTemplate}
          title="Download sample format template"
        >
          <span className="quick-icon">📥</span> Download Template
        </button>
      </div>

      {/* Drop zone — shown when idle/dragging/error */}
      {(phase === "idle" || phase === "dragging" || phase === "error") && (
        <div
          className={`csv-dropzone ${phase === "dragging" ? "is-dragging" : ""} ${phase === "error" ? "is-error" : ""}`}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => fileRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Drop a CSV file here or click to browse"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileRef.current?.click();
            }
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="csv-file-input"
            id="csv-file-input"
            aria-label="Upload CSV file"
            onChange={onFileInput}
          />
          <div className="csv-dropzone-glow" />
          <div className="csv-dropzone-icon" aria-hidden="true">
            {phase === "error" ? "✕" : phase === "dragging" ? "↓" : "⤒"}
          </div>
          <p className="csv-dropzone-title">
            {phase === "error"
              ? "Upload failed"
              : phase === "dragging"
                ? "Drop file to upload"
                : "Drag & drop your CSV file here"}
          </p>
          <p className="csv-dropzone-hint">
            {phase === "error"
              ? errorMsg
              : "Supports CSV files with a header row, feature columns, and a categorical target"}
          </p>
          <span className="csv-browse-pill">Browse from computer</span>
          {phase === "error" && (
            <button
              type="button"
              className="csv-retry-btn"
              onClick={(e) => {
                e.stopPropagation();
                reset();
              }}
            >
              Try again
            </button>
          )}
        </div>
      )}

      {/* Parse result panel */}
      {(phase === "parsed" || phase === "cleaning" || phase === "ready") &&
        parseResult && (
          <div className="csv-result-panel">
            {/* File header */}
            <div className="csv-result-header">
              <div className="csv-file-badge">
                <span className="csv-file-icon" aria-hidden="true">
                  📄
                </span>
                <div>
                  <strong>{filename}</strong>
                  <span className="csv-row-count">
                    {parseResult.rawRows.length} rows · {parseResult.columns.length} columns detected
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="csv-close-btn"
                onClick={reset}
                aria-label="Close and upload a different file"
              >
                ✕ Upload another
              </button>
            </div>

            {/* Too messy warning */}
            {parseResult.tooMessy && (
              <div className="csv-too-messy">
                <span className="too-messy-icon" aria-hidden="true">
                  ⚠️
                </span>
                <div>
                  <strong>This CSV cannot be used yet</strong>
                  <p>
                    {parseResult.rawRows.length < 8
                      ? "At least 8 rows are required for a train/test split."
                      : parseResult.targetCandidates.length === 0
                        ? "No suitable classification target was found. A target needs between 2 and 30 distinct values."
                        : "Check that the CSV has a header row and valid column names."}
                  </p>
                  <ul>
                    <li>Choose a column containing class/category labels as the target.</li>
                    <li>Use one or more numeric or low-cardinality categorical feature columns.</li>
                    <li>Missing feature values can be imputed; missing target values are dropped.</li>
                  </ul>
                </div>
              </div>
            )}

            {errorMsg && !parseResult.tooMessy && (
              <div className="csv-issue csv-issue-error" role="alert">
                <IssueIcon level="error" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Issues list */}
            <div className="csv-issues-list" aria-label="CSV data quality issues">
              {parseResult.issues.map((issue, i) => (
                <div key={i} className={`csv-issue csv-issue-${issue.level}`}>
                  <IssueIcon level={issue.level} />
                  <span>{issue.message}</span>
                </div>
              ))}
            </div>

            {/* Sub-navigation tabs: Cleaning Options vs Data Preview */}
            {!parseResult.tooMessy && (
              <div className="csv-panel-tabs">
                <button
                  type="button"
                  className={`csv-panel-tab ${activeTab === "options" ? "is-active" : ""}`}
                  onClick={() => setActiveTab("options")}
                >
                  ⚙️ Cleaning Controls
                </button>
                <button
                  type="button"
                  className={`csv-panel-tab ${activeTab === "preview" ? "is-active" : ""}`}
                  onClick={() => setActiveTab("preview")}
                >
                  👁 Data Preview ({cleaned ? `${cleaned.rows.length} clean rows` : `${parseResult.rawRows.length} raw rows`})
                </button>
              </div>
            )}

            {/* TAB 1: Cleaning options */}
            {!parseResult.tooMessy && activeTab === "options" && (
              <div className="csv-clean-section">
                <div className="csv-clean-header-row">
                  <div>
                    <p className="csv-clean-title">
                      DATA IMPUTATION &amp; DEDUPLICATION
                    </p>
                    <p className="csv-clean-description">
                      Select a classification target and input columns, then choose how missing feature values are handled.
                    </p>
                  </div>
                  {!hasIssues && (
                    <span className="csv-clean-tag">✓ Clean Dataset</span>
                  )}
                </div>

                <div className="csv-column-options">
                  <label className="dashboard-select-label" htmlFor="csv-target">
                    TARGET / CLASS COLUMN
                    <select
                      id="csv-target"
                      value={targetColumn}
                      onChange={(event) => {
                        const target = event.target.value;
                        setTargetColumn(target);
                        setSelectedFeatures((current) =>
                          current.filter((column) => column !== target),
                        );
                      }}
                    >
                      {(parseResult?.targetCandidates ?? []).map((column) => (
                        <option key={column} value={column}>
                          {column} ·{" "}
                          {new Set(
                            (parseResult?.rawRows ?? [])
                              .map((row) => row[column]?.trim())
                              .filter(Boolean),
                          ).size}{" "}
                          classes
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="csv-feature-picker">
                    <p className="csv-strategy-label">
                      INPUT FEATURES <small>(choose at least one)</small>
                    </p>
                    <div className="csv-feature-options">
                      {(parseResult?.featureCandidates ?? [])
                        .filter((column) => column !== targetColumn)
                        .map((column) => (
                          <label key={column} className="csv-feature-option">
                            <input
                              type="checkbox"
                              checked={selectedFeatures.includes(column)}
                              onChange={(event) =>
                                setSelectedFeatures((current) =>
                                  event.target.checked
                                    ? [...current, column]
                                    : current.filter((item) => item !== column),
                                )
                              }
                            />
                            <span>{column}</span>
                            <small>{parseResult?.columnKinds[column]}</small>
                          </label>
                        ))}
                    </div>
                    {(parseResult?.columns.length ?? 0) >
                      (parseResult?.featureCandidates.length ?? 0) && (
                      <small className="csv-clean-description">
                        High-cardinality columns (such as IDs, emails, or dates) are excluded from model inputs.
                      </small>
                    )}
                  </div>
                </div>

                {parseResult.missingValueCount > 0 ? (
                  <div className="csv-strategy-group">
                    <p className="csv-strategy-label">
                      Select method for missing feature values. Numeric columns use this method; categorical columns use their most common value. Missing target labels are dropped.
                    </p>
                    <div className="csv-strategy-cards">
                      {(
                        ["mean", "median", "mode", "drop"] as MissingStrategy[]
                      ).map((strategy) => (
                        <button
                          key={strategy}
                          type="button"
                          className={`csv-strategy-card ${missingStrategy === strategy ? "is-selected" : ""}`}
                          onClick={() => setMissingStrategy(strategy)}
                          aria-pressed={missingStrategy === strategy}
                        >
                          <div className="strategy-card-top">
                            <span className="strategy-indicator" />
                            <span className="strategy-name">
                              {STRATEGY_LABELS[strategy]}
                            </span>
                          </div>
                          <span className="strategy-desc">
                            {STRATEGY_DESCRIPTIONS[strategy]}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="csv-strategy-clean-notice">
                    <span>✨</span> No missing cells detected.
                  </div>
                )}

                {parseResult.duplicateCount > 0 ? (
                  <label className="csv-duplicate-toggle">
                    <input
                      type="checkbox"
                      checked={removeDuplicates}
                      onChange={(e) => setRemoveDuplicates(e.target.checked)}
                    />
                    <span>
                      Deduplicate rows: Remove <strong>{parseResult.duplicateCount}</strong>{" "}
                      exact duplicate row(s)
                    </span>
                  </label>
                ) : (
                  <div className="csv-duplicate-clean-notice">
                    <span>✨</span> No duplicate rows detected.
                  </div>
                )}

                <div className="csv-clean-actions">
                  <button
                    type="button"
                    className="csv-apply-btn"
                    onClick={applyClean}
                  >
                    Apply Cleaning &amp; Preview
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: Data Table Preview */}
            {!parseResult.tooMessy && activeTab === "preview" && (
              <div className="csv-preview-table-container">
                <div className="csv-preview-table-header">
                  <span>
                    {cleaned ? "Previewing Cleaned Dataset" : "Previewing Raw CSV Rows"}
                  </span>
                  <span className="csv-preview-count">
                    Showing first {Math.min(8, cleaned?.rows.length ?? parseResult.rawRows.length)} rows
                  </span>
                </div>
                <table className="csv-preview-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      {previewColumns.map((column) => (
                        <th key={column}>{column}</th>
                      ))}
                      <th>status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, i) => (
                      <tr key={i}>
                        <td className="row-index">{i + 1}</td>
                        {row.cells.map((cell, cellIndex) => (
                          <td key={previewColumns[cellIndex]}>
                            {cell === "—" ? (
                              <span className="cell-pill cell-pill--missing">Missing</span>
                            ) : (
                              cell
                            )}
                          </td>
                        ))}
                        <td>
                          {cleaned ? (
                            <span className="cell-pill cell-pill--ok">✓ Usable</span>
                          ) : row.hasMissing ? (
                            <span className="cell-pill cell-pill--warn">Needs Imputation</span>
                          ) : (
                            <span className="cell-pill cell-pill--ok">Valid</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Ready state: summary & activate button */}
            {phase === "ready" && cleaned && !parseResult.tooMessy && (
              <div className="csv-ready-panel">
                <div className="csv-clean-summary">
                  <span className="clean-summary-icon" aria-hidden="true">
                    ✓
                  </span>
                  <div>
                    <strong>
                      Dataset processed successfully · {cleaned.rows.length} usable observations
                    </strong>
                    <div className="csv-summary-tags">
                      {cleaned.droppedCount > 0 && (
                        <span className="summary-tag summary-tag--drop">
                          {cleaned.droppedCount} row(s) dropped
                        </span>
                      )}
                      {cleaned.imputedCount > 0 && (
                        <span className="summary-tag summary-tag--impute">
                          {cleaned.imputedCount} value(s) filled using {missingStrategy}
                        </span>
                      )}
                      <span className="summary-tag summary-tag--ready">
                        Ready for train/test split
                      </span>
                    </div>
                    {cleaned.rows.length < 8 && (
                      <span className="clean-warn">
                        ⚠ Only {cleaned.rows.length} rows remain — at least 8
                        are required to train the forest.
                      </span>
                    )}
                  </div>
                </div>
                <div className="csv-ready-actions">
                  <button
                    type="button"
                    className="csv-edit-btn"
                    onClick={() => {
                      setPhase("parsed");
                      setActiveTab("options");
                    }}
                  >
                    Adjust Cleaning Settings
                  </button>
                  <button
                    type="button"
                    className="csv-use-btn"
                    disabled={cleaned.rows.length < 8}
                    onClick={useDataset}
                  >
                    Activate Dataset &amp; Train Forest →
                  </button>
                </div>
              </div>
            )}

            {/* Too-messy: only allow re-upload */}
            {parseResult.tooMessy && (
              <div className="csv-clean-actions">
                <button
                  type="button"
                  className="csv-apply-btn csv-apply-btn--retry"
                  onClick={reset}
                >
                  Upload a different file
                </button>
              </div>
            )}
          </div>
        )}
    </div>
  );
}
