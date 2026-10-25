import React from 'react';
import { Database, AlertCircle, CheckCircle2, ShieldCheck, Tag } from 'lucide-react';
import { DatasetInfo, ColumnProfile, ThemeMode } from '../types/pca';

interface DataModuleProps {
  activeDataset: DatasetInfo;
  columnProfiles: ColumnProfile[];
  selectedFeatures: string[];
  onToggleFeature: (feat: string) => void;
  labelCol: string;
  onSelectLabelCol: (col: string) => void;
  onOpenUpload: () => void;
  theme?: ThemeMode;
}

export const DataModule: React.FC<DataModuleProps> = ({
  activeDataset,
  columnProfiles,
  selectedFeatures,
  onToggleFeature,
  labelCol,
  onSelectLabelCol,
  onOpenUpload,
  theme = 'dark'
}) => {
  const isDark = theme === 'dark';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Overview Card */}
      <div style={{
        background: isDark ? 'var(--bg-card)' : '#ffffff',
        borderRadius: 14,
        border: `1px solid ${isDark ? 'var(--border-card)' : '#e2e8f0'}`,
        padding: '20px 24px',
        boxShadow: isDark ? 'var(--card-shadow)' : '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: isDark ? '#f8fafc' : '#0f172a', margin: 0 }}>
              Dataset Profiling & Feature Roles
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: isDark ? '#94a3b8' : '#64748b' }}>
              {activeDataset.description}
            </p>
          </div>

          <button
            onClick={onOpenUpload}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              background: isDark ? 'linear-gradient(135deg, #0284c7 0%, #00f5d4 100%)' : '#0284c7',
              color: isDark ? '#070a12' : '#ffffff',
              border: 'none',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: isDark ? '0 0 15px rgba(0,245,212,0.3)' : 'none'
            }}
          >
            Upload Custom CSV
          </button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 14,
          marginTop: 16
        }}>
          <div style={{
            background: isDark ? 'rgba(22, 33, 56, 0.6)' : '#f8fafc',
            padding: '12px 16px',
            borderRadius: 10,
            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'}`
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: isDark ? '#94a3b8' : '#64748b' }}>Total Samples</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a', marginTop: 2 }}>{activeDataset.rows.length.toLocaleString()}</div>
          </div>

          <div style={{
            background: isDark ? 'rgba(22, 33, 56, 0.6)' : '#f8fafc',
            padding: '12px 16px',
            borderRadius: 10,
            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'}`
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: isDark ? '#94a3b8' : '#64748b' }}>Total Columns</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a', marginTop: 2 }}>{activeDataset.headers.length}</div>
          </div>

          <div style={{
            background: isDark ? 'rgba(0, 245, 212, 0.08)' : '#f8fafc',
            padding: '12px 16px',
            borderRadius: 10,
            border: `1px solid ${isDark ? 'rgba(0, 245, 212, 0.25)' : '#e2e8f0'}`
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: isDark ? '#00f5d4' : '#64748b' }}>Selected PCA Features</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: isDark ? '#00f5d4' : '#0284c7', marginTop: 2 }}>{selectedFeatures.length}</div>
          </div>

          <div style={{
            background: isDark ? 'rgba(22, 33, 56, 0.6)' : '#f8fafc',
            padding: '12px 16px',
            borderRadius: 10,
            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'}`
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: isDark ? '#94a3b8' : '#64748b' }}>Color / Label Column</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {labelCol || 'None'}
            </div>
          </div>
        </div>
      </div>

      {/* Columns Schema & Role Table */}
      <div style={{
        background: isDark ? 'var(--bg-card)' : '#ffffff',
        borderRadius: 14,
        border: `1px solid ${isDark ? 'var(--border-card)' : '#e2e8f0'}`,
        padding: '20px 24px',
        boxShadow: isDark ? 'var(--card-shadow)' : '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
      }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: isDark ? '#f8fafc' : '#0f172a', margin: '0 0 14px 0' }}>
          Column Roles & Validation Checklist
        </h3>

        <div style={{ overflowX: 'auto', border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'}`, borderRadius: 10 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{
                background: isDark ? 'rgba(22, 33, 56, 0.8)' : '#f8fafc',
                borderBottom: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'}`,
                color: isDark ? '#94a3b8' : '#475569',
                fontWeight: 600
              }}>
                <th style={{ padding: '11px 14px' }}>Feature Name</th>
                <th style={{ padding: '11px 14px' }}>Role</th>
                <th style={{ padding: '11px 14px' }}>Type</th>
                <th style={{ padding: '11px 14px' }}>Missing</th>
                <th style={{ padding: '11px 14px' }}>Mean ± Std</th>
                <th style={{ padding: '11px 14px' }}>Min / Max</th>
                <th style={{ padding: '11px 14px' }}>Validation Status</th>
              </tr>
            </thead>
            <tbody>
              {columnProfiles.map(col => {
                const isSelected = selectedFeatures.includes(col.name);
                const isLabel = labelCol === col.name;

                return (
                  <tr key={col.name} style={{ borderBottom: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9'}` }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: isDark ? '#f8fafc' : '#0f172a' }}>
                      {col.name}
                    </td>

                    <td style={{ padding: '10px 14px' }}>
                      {col.isNumeric ? (
                        <button
                          onClick={() => onToggleFeature(col.name)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 700,
                            border: `1px solid ${isSelected ? (isDark ? '#00f5d4' : '#bae6fd') : (isDark ? 'rgba(255, 255, 255, 0.12)' : '#cbd5e1')}`,
                            background: isSelected ? (isDark ? 'rgba(0, 245, 212, 0.15)' : '#e0f2fe') : (isDark ? 'rgba(22, 33, 56, 0.5)' : '#ffffff'),
                            color: isSelected ? (isDark ? '#00f5d4' : '#0369a1') : (isDark ? '#94a3b8' : '#64748b'),
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {isSelected ? '✓ Input Feature' : '+ Excluded'}
                        </button>
                      ) : (
                        <button
                          onClick={() => onSelectLabelCol(col.name)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 700,
                            border: `1px solid ${isLabel ? (isDark ? '#ff007f' : '#fbcfe8') : (isDark ? 'rgba(255, 255, 255, 0.12)' : '#cbd5e1')}`,
                            background: isLabel ? (isDark ? 'rgba(255, 0, 127, 0.15)' : '#fdf2f8') : (isDark ? 'rgba(22, 33, 56, 0.5)' : '#ffffff'),
                            color: isLabel ? (isDark ? '#ff007f' : '#be185d') : (isDark ? '#94a3b8' : '#64748b'),
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {isLabel ? '★ Active Label' : 'Set as Label'}
                        </button>
                      )}
                    </td>

                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 10,
                        fontSize: 11,
                        fontWeight: 600,
                        background: col.isNumeric ? (isDark ? 'rgba(16, 185, 129, 0.15)' : '#f0fdf4') : (isDark ? 'rgba(22, 33, 56, 0.6)' : '#f8fafc'),
                        color: col.isNumeric ? (isDark ? '#10b981' : '#166534') : (isDark ? '#94a3b8' : '#475569'),
                        border: `1px solid ${col.isNumeric ? (isDark ? 'rgba(16, 185, 129, 0.3)' : '#bbf7d0') : (isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0')}`
                      }}>
                        {col.isNumeric ? 'Numeric' : 'Categorical'}
                      </span>
                    </td>

                    <td style={{ padding: '10px 14px', color: col.missingCount > 0 ? (isDark ? '#f87171' : '#b91c1c') : (isDark ? '#94a3b8' : '#64748b') }}>
                      {col.missingCount} ({col.missingPercentage.toFixed(1)}%)
                    </td>

                    <td style={{ padding: '10px 14px', color: isDark ? '#cbd5e1' : '#475569', fontFamily: 'monospace' }}>
                      {col.isNumeric && col.mean !== undefined
                        ? `${col.mean.toFixed(2)} ± ${col.std?.toFixed(2)}`
                        : '-'}
                    </td>

                    <td style={{ padding: '10px 14px', color: isDark ? '#cbd5e1' : '#475569', fontFamily: 'monospace' }}>
                      {col.isNumeric && col.min !== undefined
                        ? `[${col.min.toFixed(1)}, ${col.max?.toFixed(1)}]`
                        : '-'}
                    </td>

                    <td style={{ padding: '10px 14px' }}>
                      {col.isConstant ? (
                        <span style={{ color: isDark ? '#fbbf24' : '#d97706', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <AlertCircle size={14} /> Zero Variance (Constant)
                        </span>
                      ) : (
                        <span style={{ color: isDark ? '#00f5d4' : '#16a34a', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle2 size={14} /> Valid Dimension
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
