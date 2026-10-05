import React from 'react';
import {
  Wand2,
  AlertTriangle,
  CheckCircle,
  FileText,
  Sliders,
  Sparkles,
  Download,
  Trash2,
  HelpCircle,
  ListFilter
} from 'lucide-react';
import {
  ColumnProfile,
  ImputationReport,
  MissingValueStrategy,
  RawDataRow,
  ScalingStrategy
} from '../types/pca';
import { isMissing } from '../utils/math';

interface MessyDataStudioProps {
  rawRows: RawDataRow[];
  headers: string[];
  columnProfiles: ColumnProfile[];
  selectedFeatures: string[];
  onToggleFeature: (feature: string) => void;
  labelCol: string;
  onSelectLabelCol: (col: string) => void;
  imputationStrategy: MissingValueStrategy;
  onSelectImputation: (strategy: MissingValueStrategy) => void;
  scaling: ScalingStrategy;
  onSelectScaling: (scaling: ScalingStrategy) => void;
  imputationReport: ImputationReport;
  onExportCleanedCsv: () => void;
}

export const MessyDataStudio: React.FC<MessyDataStudioProps> = ({
  rawRows,
  headers,
  columnProfiles,
  selectedFeatures,
  onToggleFeature,
  labelCol,
  onSelectLabelCol,
  imputationStrategy,
  onSelectImputation,
  scaling,
  onSelectScaling,
  imputationReport,
  onExportCleanedCsv
}) => {
  const totalMissing = columnProfiles.reduce((acc, c) => acc + c.missingCount, 0);
  const totalCells = rawRows.length * headers.length;
  const missingPct = totalCells > 0 ? ((totalMissing / totalCells) * 100).toFixed(1) : '0';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Banner: Messy CSV Preprocessing Studio */}
      <div className="glass-panel" style={{
        padding: '22px 26px',
        background: 'linear-gradient(135deg, rgba(25, 20, 10, 0.9) 0%, rgba(10, 12, 18, 0.9) 100%)',
        border: '1px solid rgba(255, 183, 0, 0.25)'
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Wand2 size={22} color="var(--accent-gold)" />
              <h2 style={{ fontSize: 18, margin: 0, fontWeight: 800 }}>
                Messy CSV Cleaning &amp; Imputation Studio
              </h2>
              {totalMissing > 0 ? (
                <span className="badge badge-gold">
                  <AlertTriangle size={12} /> {totalMissing} Missing Cells Detected
                </span>
              ) : (
                <span className="badge badge-lime">
                  <CheckCircle size={12} /> 100% Clean (0 Missing)
                </span>
              )}
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, marginTop: 6 }}>
              PCA requires a complete, numerical data matrix. When uploaded CSVs have blank, null, or NaN entries, choose your imputation method below to cleanly handle them before decomposition.
            </p>
          </div>

          <button
            onClick={onExportCleanedCsv}
            className="btn-primary"
            style={{ padding: '8px 16px', fontSize: 13 }}
            title="Download the sanitized CSV dataset"
          >
            <Download size={15} />
            <span>Download Cleaned CSV</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 14,
          marginTop: 18
        }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Total Rows</span>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginTop: 2 }}>
              {rawRows.length} Samples
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Total Columns</span>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginTop: 2 }}>
              {headers.length} Variables
            </div>
          </div>

          <div style={{ background: 'rgba(255, 183, 0, 0.06)', padding: '12px 16px', borderRadius: 10, border: '1px solid rgba(255, 183, 0, 0.2)' }}>
            <span style={{ fontSize: 11, color: 'var(--accent-gold)', textTransform: 'uppercase' }}>Missing Cells</span>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent-gold)', marginTop: 2 }}>
              {totalMissing} ({missingPct}%)
            </div>
          </div>

          <div style={{ background: 'rgba(0, 240, 255, 0.06)', padding: '12px 16px', borderRadius: 10, border: '1px solid rgba(0, 240, 255, 0.2)' }}>
            <span style={{ fontSize: 11, color: 'var(--accent-cyan)', textTransform: 'uppercase' }}>Active PCA Features</span>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent-cyan)', marginTop: 2 }}>
              {selectedFeatures.length} Numeric Cols
            </div>
          </div>
        </div>
      </div>

      {/* Imputation Strategy Selector Cards */}
      <div className="glass-panel" style={{ padding: '22px 26px' }}>
        <h3 style={{ fontSize: 16, marginBottom: 12, fontWeight: 700 }}>
          Select Missing Value Handling Strategy
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 14
        }}>
          {/* MEAN */}
          <div
            onClick={() => onSelectImputation('mean')}
            style={{
              padding: '16px',
              borderRadius: 12,
              cursor: 'pointer',
              background: imputationStrategy === 'mean' ? 'rgba(0, 240, 255, 0.12)' : 'rgba(255, 255, 255, 0.03)',
              border: imputationStrategy === 'mean' ? '2px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
              boxShadow: imputationStrategy === 'mean' ? '0 0 20px var(--accent-cyan-glow)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: imputationStrategy === 'mean' ? 'var(--accent-cyan)' : '#fff' }}>
                Mean (Average)
              </span>
              {imputationStrategy === 'mean' && <CheckCircle size={16} color="var(--accent-cyan)" />}
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
              Replaces missing numerical cells with the arithmetic mean of the column. Standard choice for normally distributed data.
            </p>
          </div>

          {/* MEDIAN */}
          <div
            onClick={() => onSelectImputation('median')}
            style={{
              padding: '16px',
              borderRadius: 12,
              cursor: 'pointer',
              background: imputationStrategy === 'median' ? 'rgba(168, 85, 247, 0.12)' : 'rgba(255, 255, 255, 0.03)',
              border: imputationStrategy === 'median' ? '2px solid var(--accent-purple)' : '1px solid var(--border-subtle)',
              boxShadow: imputationStrategy === 'median' ? '0 0 20px var(--accent-purple-glow)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: imputationStrategy === 'median' ? 'var(--accent-purple)' : '#fff' }}>
                Median (Robust)
              </span>
              {imputationStrategy === 'median' && <CheckCircle size={16} color="var(--accent-purple)" />}
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
              Replaces missing cells with the 50th percentile. Highly recommended when datasets have extreme outliers or skewed distributions.
            </p>
          </div>

          {/* MODE */}
          <div
            onClick={() => onSelectImputation('mode')}
            style={{
              padding: '16px',
              borderRadius: 12,
              cursor: 'pointer',
              background: imputationStrategy === 'mode' ? 'rgba(0, 255, 136, 0.12)' : 'rgba(255, 255, 255, 0.03)',
              border: imputationStrategy === 'mode' ? '2px solid var(--accent-lime)' : '1px solid var(--border-subtle)',
              boxShadow: imputationStrategy === 'mode' ? '0 0 20px var(--accent-lime-glow)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: imputationStrategy === 'mode' ? 'var(--accent-lime)' : '#fff' }}>
                Mode (Most Common)
              </span>
              {imputationStrategy === 'mode' && <CheckCircle size={16} color="var(--accent-lime)" />}
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
              Replaces missing values with the most frequent value in the column. Ideal for discrete counts and categorical features.
            </p>
          </div>

          {/* DROP */}
          <div
            onClick={() => onSelectImputation('drop')}
            style={{
              padding: '16px',
              borderRadius: 12,
              cursor: 'pointer',
              background: imputationStrategy === 'drop' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255, 255, 255, 0.03)',
              border: imputationStrategy === 'drop' ? '2px solid #ef4444' : '1px solid var(--border-subtle)',
              boxShadow: imputationStrategy === 'drop' ? '0 0 20px rgba(239, 68, 68, 0.4)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: imputationStrategy === 'drop' ? '#ef4444' : '#fff' }}>
                Drop Incomplete Rows
              </span>
              {imputationStrategy === 'drop' && <CheckCircle size={16} color="#ef4444" />}
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
              Discards any sample that contains at least one missing feature value. (Preserves pristine data, but reduces sample size).
            </p>
          </div>
        </div>
      </div>

      {/* Feature Checklist & Label Selector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {/* Numeric Features Checkbox List */}
        <div className="glass-panel" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 15, margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ListFilter size={16} color="var(--accent-cyan)" />
              PCA Feature Columns
            </h3>
            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
              {selectedFeatures.length} selected
            </span>
          </div>

          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
            Check the numeric variables to include in the covariance matrix and PCA calculation.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto', paddingRight: 6 }}>
            {columnProfiles.map((col) => {
              const isChecked = selectedFeatures.includes(col.name);
              return (
                <label
                  key={col.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: isChecked ? 'rgba(0, 240, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                    border: isChecked ? '1px solid rgba(0, 240, 255, 0.3)' : '1px solid var(--border-subtle)',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggleFeature(col.name)}
                      style={{ accentColor: 'var(--accent-cyan)', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: 13, fontWeight: 600, color: isChecked ? '#fff' : 'var(--text-dim)' }}>
                      {col.name}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {col.missingCount > 0 && (
                      <span className="badge badge-gold" style={{ fontSize: 10 }}>
                        {col.missingCount} missing
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                      {col.isNumeric ? 'numeric' : 'text'}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Target Label / Cluster Column Selector */}
        <div className="glass-panel" style={{ padding: '20px 24px' }}>
          <h3 style={{ fontSize: 15, marginBottom: 8, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={16} color="var(--accent-magenta)" />
            Cluster / Category Label Column
          </h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
            Select the column used to color-code the scatter plot points in 2D and 3D visualizers.
          </p>

          <select
            value={labelCol}
            onChange={(e) => onSelectLabelCol(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 10,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 600,
              outline: 'none',
              cursor: 'pointer',
              marginBottom: 16
            }}
          >
            {headers.map((h) => (
              <option key={h} value={h} style={{ background: '#0a0d14' }}>
                {h} {columnProfiles.find(c => c.name === h)?.uniqueValues} unique classes
              </option>
            ))}
          </select>

          {/* Normalization Strategy */}
          <h4 style={{ fontSize: 13, marginBottom: 6, fontWeight: 700, color: 'var(--accent-cyan)' }}>
            Scaling / Normalization:
          </h4>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['standard', 'minmax', 'none'] as ScalingStrategy[]).map((strat) => (
              <button
                key={strat}
                onClick={() => onSelectScaling(strat)}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  background: scaling === strat ? 'rgba(0, 240, 255, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                  color: scaling === strat ? 'var(--accent-cyan)' : 'var(--text-dim)',
                  border: scaling === strat ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)'
                }}
              >
                {strat === 'standard' ? 'Z-Score (Standard)' : strat === 'minmax' ? 'Min-Max' : 'Raw'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Live Data Table with Missing Cells Highlighted */}
      <div className="glass-panel" style={{ padding: '20px 24px', overflowX: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <h3 style={{ fontSize: 16, margin: 0, fontWeight: 700 }}>
              Interactive Data Inspector &amp; Imputation Preview
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: 0, marginTop: 4 }}>
              Missing cells are flagged in gold with their computed {imputationStrategy.toUpperCase()} fill value.
            </p>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Showing first 25 rows
          </span>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-dim)' }}>
              <th style={{ padding: '8px 12px' }}>#</th>
              {headers.map((h) => {
                const profile = columnProfiles.find(c => c.name === h);
                return (
                  <th key={h} style={{ padding: '8px 12px' }}>
                    <div>{h}</div>
                    {profile && profile.missingCount > 0 && (
                      <div style={{ fontSize: 10, color: 'var(--accent-gold)' }}>
                        {profile.missingCount} missing
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rawRows.slice(0, 25).map((row, rowIdx) => (
              <tr
                key={rowIdx}
                style={{
                  borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                  background: rowIdx % 2 === 0 ? 'rgba(255, 255, 255, 0.01)' : 'transparent'
                }}
              >
                <td style={{ padding: '8px 12px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                  {rowIdx + 1}
                </td>
                {headers.map((h) => {
                  const val = row[h];
                  const missing = isMissing(val);
                  const imputedInfo = imputationReport.imputedPerColumn[h];

                  return (
                    <td
                      key={h}
                      style={{
                        padding: '8px 12px',
                        background: missing ? 'rgba(255, 183, 0, 0.12)' : 'transparent'
                      }}
                    >
                      {missing ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: 'rgba(255, 183, 0, 0.25)',
                          color: 'var(--accent-gold)',
                          fontWeight: 700,
                          fontSize: 11
                        }}>
                          FILL: {imputedInfo ? imputedInfo.value : 'NaN'}
                        </span>
                      ) : (
                        <span style={{ color: selectedFeatures.includes(h) ? '#f1f5f9' : 'var(--text-dim)' }}>
                          {String(val)}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
