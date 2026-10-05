import React from 'react';
import {
  Compass,
  Box,
  Layers,
  BarChart2,
  BookOpen,
  Wand2,
  UploadCloud,
  CheckCircle,
  AlertTriangle,
  Rotate3d,
  Sparkles
} from 'lucide-react';
import { DatasetInfo, MissingValueStrategy, ScalingStrategy } from '../types/pca';

export type ActiveTab = '2d' | '3d' | 'scree' | 'biplot' | 'educator' | 'cleaner';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  datasets: DatasetInfo[];
  selectedDatasetId: string;
  onSelectDataset: (id: string) => void;
  missingCellsCount: number;
  imputationStrategy: MissingValueStrategy;
  onSelectImputation: (strategy: MissingValueStrategy) => void;
  scaling: ScalingStrategy;
  onSelectScaling: (scaling: ScalingStrategy) => void;
  onOpenUpload: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  datasets,
  selectedDatasetId,
  onSelectDataset,
  missingCellsCount,
  imputationStrategy,
  onSelectImputation,
  scaling,
  onSelectScaling,
  onOpenUpload
}) => {
  const currentDataset = datasets.find(d => d.id === selectedDatasetId);

  return (
    <header style={{
      borderBottom: '1px solid var(--border-subtle)',
      background: 'rgba(5, 7, 10, 0.95)',
      backdropFilter: 'blur(20px)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      padding: '12px 24px'
    }}>
      <div style={{
        maxWidth: 1600,
        margin: '0 auto',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16
      }}>
        {/* Brand & Dataset Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #00f0ff 0%, #a855f7 50%, #ff007f 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(0, 240, 255, 0.5)'
            }}>
              <Rotate3d size={22} color="#000000" strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h1 style={{ fontSize: 18, margin: 0, fontWeight: 800, letterSpacing: '-0.03em' }}>
                  PCA <span style={{ color: 'var(--accent-cyan)' }}>MATRIX</span> STUDIO
                </h1>
                <span className="badge badge-cyan">v2.5</span>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: 0 }}>
                High-Dimensional Reduction & 3D Interactive Spatial Engine
              </p>
            </div>
          </div>

          {/* Dataset Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255, 255, 255, 0.04)', padding: '4px 10px', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
            <Layers size={14} color="var(--accent-cyan)" />
            <select
              value={selectedDatasetId}
              onChange={(e) => onSelectDataset(e.target.value)}
              style={{
                background: 'transparent',
                color: 'var(--text-main)',
                border: 'none',
                outline: 'none',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id} style={{ background: '#0a0d14', color: '#fff' }}>
                  {d.name} {d.isMessy ? '⚠️ (Messy)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Upload Button */}
          <button
            onClick={onOpenUpload}
            className="btn-secondary"
            style={{ padding: '6px 12px', fontSize: 12 }}
            title="Upload your own messy or clean CSV file"
          >
            <UploadCloud size={14} color="var(--accent-cyan)" />
            <span>Upload CSV</span>
          </button>
        </div>

        {/* Missing Values Status & Imputation Control */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {missingCellsCount > 0 ? (
            <div
              onClick={() => setActiveTab('cleaner')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(255, 183, 0, 0.1)',
                border: '1px solid rgba(255, 183, 0, 0.3)',
                padding: '4px 12px',
                borderRadius: 8,
                cursor: 'pointer'
              }}
              title="Click to view and configure missing values in Data Cleaner"
            >
              <AlertTriangle size={14} color="var(--accent-gold)" />
              <span style={{ fontSize: 12, color: 'var(--accent-gold)', fontWeight: 600 }}>
                {missingCellsCount} Missing Cells
              </span>
              <span className="badge badge-gold" style={{ fontSize: 10 }}>
                Filled: {imputationStrategy.toUpperCase()}
              </span>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(0, 255, 136, 0.08)',
              border: '1px solid rgba(0, 255, 136, 0.2)',
              padding: '4px 10px',
              borderRadius: 8
            }}>
              <CheckCircle size={13} color="var(--accent-lime)" />
              <span style={{ fontSize: 11, color: 'var(--accent-lime)', fontWeight: 600 }}>
                Dataset Complete (0 Missing)
              </span>
            </div>
          )}

          {/* Quick Imputation Selector */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '3px 8px',
            borderRadius: 8,
            border: '1px solid var(--border-subtle)'
          }}>
            <Wand2 size={13} color="var(--accent-purple)" />
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Impute:</span>
            {(['mean', 'median', 'mode', 'drop'] as MissingValueStrategy[]).map((strat) => (
              <button
                key={strat}
                onClick={() => onSelectImputation(strat)}
                style={{
                  padding: '3px 7px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'capitalize',
                  background: imputationStrategy === strat ? 'rgba(168, 85, 247, 0.25)' : 'transparent',
                  color: imputationStrategy === strat ? 'var(--accent-purple)' : 'var(--text-dim)',
                  border: imputationStrategy === strat ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid transparent'
                }}
              >
                {strat}
              </button>
            ))}
          </div>

          {/* Normalization / Scaling Selector */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '3px 8px',
            borderRadius: 8,
            border: '1px solid var(--border-subtle)'
          }}>
            <Sparkles size={13} color="var(--accent-cyan)" />
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Scale:</span>
            <select
              value={scaling}
              onChange={(e) => onSelectScaling(e.target.value as ScalingStrategy)}
              style={{
                background: 'transparent',
                color: 'var(--text-main)',
                border: 'none',
                outline: 'none',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <option value="standard" style={{ background: '#0a0d14' }}>StandardScaler (Z-Score)</option>
              <option value="minmax" style={{ background: '#0a0d14' }}>Min-Max [0, 1]</option>
              <option value="none" style={{ background: '#0a0d14' }}>Raw Centered Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div style={{
        maxWidth: 1600,
        margin: '12px auto 0',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        overflowX: 'auto',
        paddingBottom: 2
      }}>
        <button
          onClick={() => setActiveTab('2d')}
          className={`tab-btn ${activeTab === '2d' ? 'active' : ''}`}
        >
          <Compass size={15} />
          <span>2D PCA Space</span>
        </button>

        <button
          onClick={() => setActiveTab('3d')}
          className={`tab-btn ${activeTab === '3d' ? 'active' : ''}`}
        >
          <Box size={15} />
          <span>3D Space & Auto-Rotate</span>
          <span className="badge badge-magenta" style={{ fontSize: 9, padding: '1px 5px' }}>3D</span>
        </button>

        <button
          onClick={() => setActiveTab('scree')}
          className={`tab-btn ${activeTab === 'scree' ? 'active' : ''}`}
        >
          <BarChart2 size={15} />
          <span>Scree Plot & Variance</span>
        </button>

        <button
          onClick={() => setActiveTab('biplot')}
          className={`tab-btn ${activeTab === 'biplot' ? 'active' : ''}`}
        >
          <Layers size={15} />
          <span>Biplot & Loadings</span>
        </button>

        <button
          onClick={() => setActiveTab('educator')}
          className={`tab-btn ${activeTab === 'educator' ? 'active' : ''}`}
        >
          <BookOpen size={15} />
          <span>Step-by-Step Walkthrough</span>
          <span className="badge badge-lime" style={{ fontSize: 9, padding: '1px 5px' }}>LEARN</span>
        </button>

        <button
          onClick={() => setActiveTab('cleaner')}
          className={`tab-btn ${activeTab === 'cleaner' ? 'active' : ''}`}
        >
          <Wand2 size={15} />
          <span>Messy CSV Cleaner</span>
          {missingCellsCount > 0 && (
            <span className="badge badge-gold" style={{ fontSize: 9, padding: '1px 5px' }}>
              {missingCellsCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
