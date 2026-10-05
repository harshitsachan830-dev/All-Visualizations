import React, { useState } from 'react';
import {
  UploadCloud,
  X,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Download
} from 'lucide-react';
import Papa from 'papaparse';
import { DatasetInfo, RawDataRow } from '../types/pca';
import { profileColumns } from '../utils/math';

interface CSVUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDatasetLoaded: (dataset: DatasetInfo) => void;
}

export const CSVUploadModal: React.FC<CSVUploadModalProps> = ({
  isOpen,
  onClose,
  onDatasetLoaded
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const processCsvFile = (file: File) => {
    setErrorMsg(null);
    setFileName(file.name);
    setIsProcessing(true);

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
        const categoricalCols = profiles.filter(p => !p.isNumeric).map(p => p.name);

        if (numericCols.length < 2) {
          setErrorMsg('CSV must contain at least 2 numeric feature columns for PCA.');
          return;
        }

        // Pick default label: first categorical column or last column
        const defaultLabel = categoricalCols.length > 0 ? categoricalCols[0] : headers[headers.length - 1];

        // Filter out label from default numeric features if label happens to be in numericCols
        const defaultFeatures = numericCols.filter(c => c !== defaultLabel);

        const hasMissing = profiles.some(p => p.missingCount > 0);

        const newDataset: DatasetInfo = {
          id: `custom_${Date.now()}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          category: 'User Upload',
          description: `Custom dataset uploaded by user containing ${rawRows.length} rows and ${headers.length} columns.`,
          rows: rawRows,
          headers,
          numericColumns: numericCols,
          categoricalColumns: categoricalCols,
          defaultLabelCol: defaultLabel,
          defaultFeatures: defaultFeatures.length >= 2 ? defaultFeatures : numericCols,
          isMessy: hasMissing
        };

        onDatasetLoaded(newDataset);
        onClose();
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

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: 20
    }}>
      <div className="glass-panel" style={{
        maxWidth: 580,
        width: '100%',
        padding: '28px',
        background: 'rgba(10, 14, 22, 0.98)',
        border: '1px solid var(--accent-cyan)',
        boxShadow: '0 0 40px rgba(0, 240, 255, 0.25)',
        position: 'relative'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            background: 'rgba(255, 255, 255, 0.05)',
            color: 'var(--text-muted)',
            borderRadius: '50%',
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'rgba(0, 240, 255, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--accent-cyan)'
          }}>
            <UploadCloud size={22} color="var(--accent-cyan)" />
          </div>
          <div>
            <h2 style={{ fontSize: 18, margin: 0, fontWeight: 800 }}>
              Upload Your Dataset (CSV)
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: 0 }}>
              Supports messy CSVs with missing/empty cells • Auto Imputation ready
            </p>
          </div>
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          style={{
            border: isDragging ? '2px dashed var(--accent-cyan)' : '2px dashed rgba(255, 255, 255, 0.15)',
            background: isDragging ? 'rgba(0, 240, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
            borderRadius: 14,
            padding: '36px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            marginTop: 18
          }}
          onClick={() => document.getElementById('csv-file-input')?.click()}
        >
          <input
            id="csv-file-input"
            type="file"
            accept=".csv"
            onChange={handleFileInput}
            style={{ display: 'none' }}
          />

          <FileSpreadsheet size={40} color={isDragging ? 'var(--accent-cyan)' : 'var(--text-dim)'} style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
            Click to Browse or Drag &amp; Drop CSV File
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
            Comma-separated values (.csv) • Headers in row 1
          </p>

          {fileName && (
            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--accent-lime)', fontWeight: 600 }}>
              Loaded: {fileName}
            </div>
          )}
        </div>

        {/* Error message */}
        {errorMsg && (
          <div style={{
            marginTop: 14,
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            padding: '10px 14px',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: '#f87171',
            fontSize: 12
          }}>
            <AlertTriangle size={15} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Sample Template Download */}
        <div style={{
          marginTop: 20,
          background: 'rgba(255, 255, 255, 0.03)',
          padding: '12px 16px',
          borderRadius: 10,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>
              Want to test with a messy CSV?
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
              Download our ready-made template containing deliberate missing cells
            </div>
          </div>
          <button
            onClick={downloadSampleTemplate}
            className="btn-secondary"
            style={{ padding: '6px 12px', fontSize: 11 }}
          >
            <Download size={13} />
            <span>Sample CSV</span>
          </button>
        </div>
      </div>
    </div>
  );
};
