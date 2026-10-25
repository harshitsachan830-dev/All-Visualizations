import React, { useState } from 'react';
import {
  UploadCloud,
  X,
  FileSpreadsheet,
  AlertTriangle,
  Download,
  Wand2,
  ChevronRight
} from 'lucide-react';
import Papa from 'papaparse';
import { DatasetInfo, RawDataRow } from '../types/pca';
import { profileColumns } from '../utils/math';

interface CSVUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDatasetLoaded: (dataset: DatasetInfo) => void;
}

type ImputeStrategy = 'mean' | 'median' | 'mode' | 'none';

interface ColProfile {
  name: string;
  missingCount: number;
  isNumeric: boolean;
  strategy: ImputeStrategy;
}

// ── Imputation helpers ──────────────────────────────────────────────────────
function colValues(rows: RawDataRow[], col: string): number[] {
  return rows
    .map(r => r[col])
    .filter(v => v !== null && v !== undefined && v !== '' && !isNaN(Number(v)))
    .map(Number);
}

function calcMean(vals: number[]): number {
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

function calcMedian(vals: number[]): number {
  if (!vals.length) return 0;
  const s = [...vals].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

function calcMode(vals: number[]): number {
  if (!vals.length) return 0;
  const freq: Record<string, number> = {};
  vals.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
  let best = vals[0], bestCount = 0;
  Object.entries(freq).forEach(([k, c]) => { if (c > bestCount) { bestCount = c; best = Number(k); } });
  return best;
}

function modeString(rows: RawDataRow[], col: string): string {
  const freq: Record<string, number> = {};
  rows.forEach(r => {
    const v = String(r[col] ?? '').trim();
    if (v) freq[v] = (freq[v] || 0) + 1;
  });
  let best = '', bestCount = 0;
  Object.entries(freq).forEach(([k, c]) => { if (c > bestCount) { bestCount = c; best = k; } });
  return best;
}

function applyImputation(rows: RawDataRow[], profiles: ColProfile[]): RawDataRow[] {
  const fillMap: Record<string, string | number> = {};
  profiles.forEach(p => {
    if (p.missingCount === 0 || p.strategy === 'none') return;
    if (p.isNumeric) {
      const vals = colValues(rows, p.name);
      if (p.strategy === 'mean') fillMap[p.name] = calcMean(vals);
      else if (p.strategy === 'median') fillMap[p.name] = calcMedian(vals);
      else if (p.strategy === 'mode') fillMap[p.name] = calcMode(vals);
    } else {
      if (p.strategy === 'mode') fillMap[p.name] = modeString(rows, p.name);
    }
  });

  return rows.map(row => {
    const newRow = { ...row };
    Object.entries(fillMap).forEach(([col, fill]) => {
      const v = row[col];
      if (v === null || v === undefined || v === '') {
        newRow[col] = fill as any;
      }
    });
    return newRow;
  });
}

// ── Component ───────────────────────────────────────────────────────────────
export const CSVUploadModal: React.FC<CSVUploadModalProps> = ({
  isOpen,
  onClose,
  onDatasetLoaded
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Imputation state
  const [pendingRows, setPendingRows] = useState<RawDataRow[] | null>(null);
  const [pendingFile, setPendingFile] = useState<string>('');
  const [colProfiles, setColProfiles] = useState<ColProfile[]>([]);
  const [globalStrategy, setGlobalStrategy] = useState<ImputeStrategy>('mean');

  if (!isOpen) return null;

  const isDark = true;

  const buildAndLoad = (rows: RawDataRow[], fname: string) => {
    const headers = Object.keys(rows[0] || {});
    const profiles = profileColumns(rows, headers);
    const numericCols = profiles.filter(p => p.isNumeric).map(p => p.name);
    const categoricalCols = profiles.filter(p => !p.isNumeric).map(p => p.name);
    const defaultLabel = categoricalCols.length > 0 ? categoricalCols[0] : headers[headers.length - 1];
    const defaultFeatures = numericCols.filter(c => c !== defaultLabel);
    const hasMissing = profiles.some(p => p.missingCount > 0);

    const dataset: DatasetInfo = {
      id: `custom_${Date.now()}`,
      name: fname.replace(/\.[^/.]+$/, ''),
      category: 'User Upload',
      description: `Custom dataset uploaded by user containing ${rows.length} rows and ${headers.length} columns.`,
      rows,
      headers,
      numericColumns: numericCols,
      categoricalColumns: categoricalCols,
      defaultLabelCol: defaultLabel,
      defaultFeatures: defaultFeatures.length >= 2 ? defaultFeatures : numericCols,
      isMessy: hasMissing
    };
    onDatasetLoaded(dataset);
    onClose();
  };

  const processCsvFile = (file: File) => {
    setErrorMsg(null);
    setFileName(file.name);
    setIsProcessing(true);
    setPendingRows(null);
    setColProfiles([]);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      dynamicTyping: true,
      complete: (results) => {
        setIsProcessing(false);
        if (results.errors.length > 0 && results.data.length === 0) {
          setErrorMsg(`Error parsing CSV: ${results.errors[0].message}`);
          return;
        }

        const rawRows = results.data as RawDataRow[];
        if (rawRows.length < 3) {
          setErrorMsg('CSV must contain at least 3 rows of data for PCA analysis.');
          return;
        }
        const headers = Object.keys(rawRows[0] || {});
        if (headers.length < 2) {
          setErrorMsg('CSV must contain at least 2 columns.');
          return;
        }

        const profiles = profileColumns(rawRows, headers);
        const numericCols = profiles.filter(p => p.isNumeric).map(p => p.name);
        if (numericCols.length < 2) {
          setErrorMsg('CSV must contain at least 2 numeric feature columns for PCA.');
          return;
        }

        const hasMissing = profiles.some(p => p.missingCount > 0);

        if (hasMissing) {
          // Build per-column profile for imputation UI
          const cp: ColProfile[] = profiles.map(p => ({
            name: p.name,
            missingCount: p.missingCount,
            isNumeric: p.isNumeric,
            strategy: p.isNumeric ? 'mean' : 'mode'
          }));
          setPendingRows(rawRows);
          setPendingFile(file.name);
          setColProfiles(cp);
        } else {
          buildAndLoad(rawRows, file.name);
        }
      },
      error: (err) => {
        setIsProcessing(false);
        setErrorMsg(`Failed to read file: ${err.message}`);
      }
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (!file.name.toLowerCase().endsWith('.csv')) {
        setErrorMsg('Please upload a valid .csv file.');
        return;
      }
      processCsvFile(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processCsvFile(e.target.files[0]);
    }
  };

  const applyGlobalStrategy = (strat: ImputeStrategy) => {
    setGlobalStrategy(strat);
    setColProfiles(prev => prev.map(p => ({
      ...p,
      strategy: p.isNumeric ? strat : (strat === 'mean' || strat === 'median' ? 'mode' : strat)
    })));
  };

  const handleApplyAndLoad = () => {
    if (!pendingRows) return;
    const cleaned = applyImputation(pendingRows, colProfiles);
    buildAndLoad(cleaned, pendingFile);
  };

  const downloadSampleTemplate = () => {
    const sampleCsv = `ID,Feature_A,Feature_B,Feature_C,Feature_D,Category\n1,12.5,45.2,1.2,,Group Alpha\n2,14.1,,1.8,88.4,Group Alpha\n3,11.9,48.0,0.9,79.1,Group Alpha\n4,25.4,85.1,4.5,120.5,Group Beta\n5,27.1,88.9,,135.0,Group Beta\n6,24.8,81.4,4.1,118.2,Group Beta\n7,45.1,120.3,9.2,210.4,Group Gamma\n8,,118.5,8.9,205.1,Group Gamma\n9,48.6,125.0,9.8,,Group Gamma`;
    const blob = new Blob([sampleCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'messy_pca_sample_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const missingCols = colProfiles.filter(p => p.missingCount > 0);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 20
    }}>
      <div className="glass-panel" style={{
        maxWidth: pendingRows ? 680 : 580,
        width: '100%',
        padding: '28px',
        background: 'rgba(10, 14, 22, 0.98)',
        border: '1px solid var(--accent-cyan)',
        boxShadow: '0 0 40px rgba(0, 240, 255, 0.25)',
        position: 'relative',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        {/* Close */}
        <button onClick={onClose} style={{
          position: 'absolute', top: 20, right: 20,
          background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)',
          borderRadius: '50%', width: 32, height: 32,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <X size={18} />
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'rgba(0, 240, 255, 0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid var(--accent-cyan)'
          }}>
            <UploadCloud size={22} color="var(--accent-cyan)" />
          </div>
          <div>
            <h2 style={{ fontSize: 18, margin: 0, fontWeight: 800 }}>
              {pendingRows ? '🔧 Null Value Imputation' : 'Upload Your Dataset (CSV)'}
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: 0 }}>
              {pendingRows
                ? `${missingCols.length} column(s) with missing values detected • Choose fill strategy`
                : 'Supports messy CSVs with missing/empty cells • Auto Imputation ready'}
            </p>
          </div>
        </div>

        {/* ── IMPUTATION PANEL ── */}
        {pendingRows ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Global strategy bar */}
            <div style={{
              background: 'rgba(0, 245, 212, 0.07)',
              border: '1px solid rgba(0, 245, 212, 0.25)',
              borderRadius: 12, padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap'
            }}>
              <Wand2 size={16} color="#00f5d4" />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#00f5d4' }}>Apply same strategy to all:</span>
              {(['mean', 'median', 'mode', 'none'] as ImputeStrategy[]).map(s => (
                <button
                  key={s}
                  onClick={() => applyGlobalStrategy(s)}
                  style={{
                    padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    border: '1px solid',
                    borderColor: globalStrategy === s ? '#00f5d4' : 'rgba(255,255,255,0.15)',
                    background: globalStrategy === s ? 'rgba(0,245,212,0.18)' : 'transparent',
                    color: globalStrategy === s ? '#00f5d4' : '#94a3b8',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>

            {/* Per-column list */}
            <div style={{
              background: 'rgba(22, 33, 56, 0.6)',
              borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)',
              overflow: 'hidden'
            }}>
              {/* Table header */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 80px 90px 200px',
                padding: '8px 16px', fontSize: 11, fontWeight: 700,
                color: '#64748b', borderBottom: '1px solid rgba(255,255,255,0.06)',
                textTransform: 'uppercase', letterSpacing: 1
              }}>
                <span>Column</span>
                <span>Type</span>
                <span>Missing</span>
                <span>Fill Strategy</span>
              </div>

              {missingCols.map((col, idx) => (
                <div key={col.name} style={{
                  display: 'grid', gridTemplateColumns: '1fr 80px 90px 200px',
                  padding: '10px 16px', alignItems: 'center',
                  borderBottom: idx < missingCols.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'
                }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', fontFamily: 'var(--font-mono)' }}>
                    {col.name}
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                    background: col.isNumeric ? 'rgba(99, 102, 241, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                    color: col.isNumeric ? '#818cf8' : '#fbbf24',
                    textAlign: 'center', width: 'fit-content'
                  }}>
                    {col.isNumeric ? 'Numeric' : 'Categ'}
                  </span>
                  <span style={{
                    fontSize: 12, fontWeight: 700,
                    color: col.missingCount > 10 ? '#f87171' : '#fb923c'
                  }}>
                    {col.missingCount} nulls
                  </span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {(col.isNumeric
                      ? (['mean', 'median', 'mode', 'none'] as ImputeStrategy[])
                      : (['mode', 'none'] as ImputeStrategy[])
                    ).map(s => (
                      <button
                        key={s}
                        onClick={() => setColProfiles(prev => prev.map(p =>
                          p.name === col.name ? { ...p, strategy: s } : p
                        ))}
                        style={{
                          padding: '3px 10px', borderRadius: 16, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                          border: '1px solid',
                          borderColor: col.strategy === s ? '#00f5d4' : 'rgba(255,255,255,0.12)',
                          background: col.strategy === s ? 'rgba(0,245,212,0.2)' : 'rgba(255,255,255,0.04)',
                          color: col.strategy === s ? '#00f5d4' : '#64748b',
                          transition: 'all 0.12s ease'
                        }}
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div style={{
              fontSize: 12, color: '#94a3b8',
              background: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: 8
            }}>
              📊 <strong style={{ color: '#f1f5f9' }}>{pendingFile}</strong> — {pendingRows.length} rows,&nbsp;
              {missingCols.reduce((a, c) => a + c.missingCount, 0)} missing cells across {missingCols.length} columns.
              Imputation fills only null/empty cells; existing values remain unchanged.
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setPendingRows(null); setColProfiles([]); setFileName(null); }}
                style={{
                  padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#94a3b8'
                }}
              >
                ← Back
              </button>
              <button
                onClick={handleApplyAndLoad}
                style={{
                  padding: '9px 22px', borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: 'pointer',
                  background: 'linear-gradient(135deg, #00f5d4 0%, #0284c7 100%)',
                  border: 'none', color: '#060913',
                  display: 'flex', alignItems: 'center', gap: 8,
                  boxShadow: '0 0 18px rgba(0,245,212,0.35)'
                }}
              >
                <ChevronRight size={16} />
                Apply & Load Dataset
              </button>
            </div>
          </div>
        ) : (
          /* ── UPLOAD PANEL ── */
          <>
            {/* Drop Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              style={{
                border: isDragging ? '2px dashed var(--accent-cyan)' : '2px dashed rgba(255, 255, 255, 0.15)',
                background: isDragging ? 'rgba(0, 240, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                borderRadius: 14, padding: '36px 20px', textAlign: 'center', cursor: 'pointer',
                transition: 'all 0.2s ease', marginTop: 18
              }}
              onClick={() => document.getElementById('csv-file-input')?.click()}
            >
              <input id="csv-file-input" type="file" accept=".csv" onChange={handleFileInput} style={{ display: 'none' }} />
              <FileSpreadsheet size={40} color={isDragging ? 'var(--accent-cyan)' : 'var(--text-dim)'} style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
                Click to Browse or Drag &amp; Drop CSV File
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                Comma-separated values (.csv) • Headers in row 1
              </p>
              {isProcessing && (
                <div style={{ marginTop: 12, fontSize: 12, color: '#00f5d4', fontWeight: 600 }}>
                  ⏳ Parsing file…
                </div>
              )}
              {fileName && !isProcessing && (
                <div style={{ marginTop: 12, fontSize: 12, color: 'var(--accent-lime)', fontWeight: 600 }}>
                  Loaded: {fileName}
                </div>
              )}
            </div>

            {/* Error */}
            {errorMsg && (
              <div style={{
                marginTop: 14, background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)', padding: '10px 14px', borderRadius: 8,
                display: 'flex', alignItems: 'center', gap: 8, color: '#f87171', fontSize: 12
              }}>
                <AlertTriangle size={15} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Sample template */}
            <div style={{
              marginTop: 20, background: 'rgba(255, 255, 255, 0.03)',
              padding: '12px 16px', borderRadius: 10,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Want to test with a messy CSV?</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                  Download our ready-made template containing deliberate missing cells
                </div>
              </div>
              <button onClick={downloadSampleTemplate} className="btn-secondary" style={{ padding: '6px 12px', fontSize: 11 }}>
                <Download size={13} />
                <span>Sample CSV</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
