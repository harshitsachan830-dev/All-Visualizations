import React, { useRef } from 'react';
import {
  DataPoint,
  ImputationMethod,
  ColumnProfile,
} from '../../utils/csv';
import {
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle,
  Database,
  ArrowRight,
  Filter,
} from 'lucide-react';

interface DatasetViewProps {
  data: DataPoint[];
  columns: string[];
  columnProfiles: ColumnProfile[];
  features: [string, string, string];
  onFeaturesChange: (features: [string, string, string]) => void;
  imputationMethod: ImputationMethod;
  onImputationMethodChange: (method: ImputationMethod) => void;
  rawMissingCount: number;
  currentMissingCount: number;
  onFileUpload: (file: File) => void;
  onLoadSample: (sampleKey: 'iris' | 'customers' | 'blobs') => void;
  activeDatasetName: string;
}

export const DatasetView: React.FC<DatasetViewProps> = ({
  data,
  columns,
  columnProfiles,
  features,
  onFeaturesChange,
  imputationMethod,
  onImputationMethodChange,
  rawMissingCount,
  currentMissingCount,
  onFileUpload,
  onLoadSample,
  activeDatasetName,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const numericColumns = columnProfiles.filter((c) => c.isNumeric).map((c) => c.name);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', maxWidth: '1200px' }}>
      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          background: '#0d111a',
          border: '1px solid #1e293b',
          borderRadius: '12px',
          padding: '16px 20px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={18} color="#7c3aed" />
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
              Dataset & Preprocessing
            </h2>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '13px', margin: '4px 0 0 0' }}>
            Current active dataset: <strong style={{ color: '#00e0ba' }}>{activeDatasetName}</strong> ({data.length} rows, {columns.length} columns)
          </p>
        </div>

        {/* Quick Sample Selector */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>Load Preset:</span>
          {(['iris', 'customers', 'blobs'] as const).map((s) => (
            <button
              key={s}
              onClick={() => onLoadSample(s)}
              style={{
                background: activeDatasetName.toLowerCase().includes(s) ? '#7c3aed' : '#1e293b',
                color: activeDatasetName.toLowerCase().includes(s) ? '#ffffff' : '#cbd5e1',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: 500,
                textTransform: 'capitalize',
              }}
            >
              {s === 'customers' ? 'Customers (Messy)' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Upload & Imputation Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '18px' }}>
        {/* CSV Upload Dropzone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            background: '#0d111a',
            border: '2px dashed #334155',
            borderRadius: '12px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'border-color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#7c3aed')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#334155')}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                onFileUpload(file);
              }
              e.currentTarget.value = '';
            }}
          />
          <Upload size={32} color="#7c3aed" style={{ marginBottom: '10px' }} />
          <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '14px' }}>
            Upload Custom CSV Dataset
          </div>
          <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px', textAlign: 'center' }}>
            Drag and drop your file here, or click to browse (.csv)
          </div>
        </div>

        {/* Missing Values & Imputation Engine */}
        <div
          style={{
            background: '#0d111a',
            border: '1px solid #1e293b',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>
              Missing Data Imputation
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {rawMissingCount > 0 ? (
                <span
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#f87171',
                    border: '1px solid rgba(239,68,68,0.3)',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <AlertTriangle size={12} /> {rawMissingCount} missing values detected
                </span>
              ) : (
                <span
                  style={{
                    background: 'rgba(34, 197, 94, 0.15)',
                    color: '#4ade80',
                    border: '1px solid rgba(34,197,94,0.3)',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <CheckCircle size={12} /> Zero missing values
                </span>
              )}
            </div>
          </div>

          <p style={{ color: '#cbd5e1', fontSize: '12px', margin: 0 }}>
            If your CSV is messy or has incomplete cells, select a strategy to clean and fill the data before clustering:
          </p>

          {/* Imputation Pills */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {(
              [
                { id: 'mean', label: 'Mean', desc: 'Average value' },
                { id: 'median', label: 'Median', desc: '50th percentile' },
                { id: 'mode', label: 'Mode', desc: 'Most frequent' },
                { id: 'drop', label: 'Drop', desc: 'Remove rows' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                onClick={() => onImputationMethodChange(opt.id)}
                style={{
                  background: imputationMethod === opt.id ? '#7c3aed' : '#171d2b',
                  color: imputationMethod === opt.id ? '#ffffff' : '#cbd5e1',
                  border: `1px solid ${imputationMethod === opt.id ? '#7c3aed' : '#2d3748'}`,
                  borderRadius: '8px',
                  padding: '10px 8px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '13px' }}>{opt.label}</div>
                <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '2px' }}>{opt.desc}</div>
              </button>
            ))}
          </div>

          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            Status after imputation:{' '}
            <strong style={{ color: currentMissingCount === 0 ? '#4ade80' : '#f87171' }}>
              {currentMissingCount} missing values remaining
            </strong>
          </div>
        </div>
      </div>

      {/* 3D Feature Coordinate Mapping */}
      <div
        style={{
          background: '#0d111a',
          border: '1px solid #1e293b',
          borderRadius: '12px',
          padding: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Filter size={18} color="#00e0ba" />
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
            3D Feature Axes Mapping
          </h3>
        </div>
        <p style={{ color: '#cbd5e1', fontSize: '12px', marginBottom: '16px' }}>
          Choose which 3 numerical attributes map to the X, Y, and Z axes of the 3D visualization scene:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
          {(['X', 'Y', 'Z'] as const).map((axis, i) => (
            <div key={axis}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: i === 0 ? '#f87171' : i === 1 ? '#4ade80' : '#60a5fa', marginBottom: '6px' }}>
                {axis}-Axis Feature:
              </label>
              <select
                value={features[i]}
                onChange={(e) => {
                  const newFeatures: [string, string, string] = [...features];
                  newFeatures[i] = e.target.value;
                  onFeaturesChange(newFeatures);
                }}
                style={{
                  width: '100%',
                  background: '#131824',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: '#f8fafc',
                  padding: '8px 12px',
                  fontSize: '13px',
                }}
              >
                {numericColumns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Schema & Column Profiler Table */}
      <div
        style={{
          background: '#0d111a',
          border: '1px solid #1e293b',
          borderRadius: '12px',
          padding: '20px',
        }}
      >
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc', margin: '0 0 14px 0' }}>
          Feature Profiler & Schema Summary
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1e293b', color: '#94a3b8', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px' }}>Column</th>
                <th style={{ padding: '10px 12px' }}>Type</th>
                <th style={{ padding: '10px 12px' }}>Min</th>
                <th style={{ padding: '10px 12px' }}>Max</th>
                <th style={{ padding: '10px 12px' }}>Mean</th>
                <th style={{ padding: '10px 12px' }}>Std Dev</th>
                <th style={{ padding: '10px 12px' }}>Missing</th>
                <th style={{ padding: '10px 12px' }}>3D Mapping</th>
              </tr>
            </thead>
            <tbody>
              {columnProfiles.map((col) => {
                const isMappedX = features[0] === col.name;
                const isMappedY = features[1] === col.name;
                const isMappedZ = features[2] === col.name;

                return (
                  <tr key={col.name} style={{ borderBottom: '1px solid #131824', color: '#f8fafc' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{col.name}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span
                        style={{
                          background: col.isNumeric ? 'rgba(59, 130, 246, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                          color: col.isNumeric ? '#60a5fa' : '#facc15',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '11px',
                        }}
                      >
                        {col.isNumeric ? 'numeric' : 'categorical'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>{col.min}</td>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>{col.max}</td>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>{col.mean}</td>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>{col.std}</td>
                    <td style={{ padding: '10px 12px' }}>
                      {col.missingCount > 0 ? (
                        <span style={{ color: '#f87171' }}>{col.missingCount}</span>
                      ) : (
                        <span style={{ color: '#4ade80' }}>0</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {isMappedX && <span style={{ color: '#f87171', fontWeight: 600 }}>X Axis</span>}
                      {isMappedY && <span style={{ color: '#4ade80', fontWeight: 600 }}>Y Axis</span>}
                      {isMappedZ && <span style={{ color: '#60a5fa', fontWeight: 600 }}>Z Axis</span>}
                      {!isMappedX && !isMappedY && !isMappedZ && <span style={{ color: '#64748b' }}>—</span>}
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
