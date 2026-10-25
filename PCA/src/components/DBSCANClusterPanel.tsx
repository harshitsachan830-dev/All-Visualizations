import React from 'react';
import { Info, HelpCircle } from 'lucide-react';
import { DBSCANResult, AnalysisSpace, ThemeMode, ColorPalette } from '../types/pca';
import { getPaletteDef } from '../utils/colors';

interface DBSCANClusterPanelProps {
  dbscanResult: DBSCANResult | null;
  eps: number;
  minSamples: number;
  onEpsChange: (eps: number) => void;
  onMinSamplesChange: (minSamples: number) => void;
  analysisSpace: AnalysisSpace;
  onAnalysisSpaceChange?: (space: AnalysisSpace) => void;
  retainedPCs: number;
  theme?: ThemeMode;
  colorPalette?: ColorPalette;
}

export const DBSCANClusterPanel: React.FC<DBSCANClusterPanelProps> = ({
  dbscanResult,
  eps,
  minSamples,
  onEpsChange,
  onMinSamplesChange,
  analysisSpace,
  onAnalysisSpaceChange,
  retainedPCs,
  theme = 'dark',
  colorPalette = 'cyber'
}) => {
  const isDark = theme === 'dark';
  const palette = getPaletteDef(colorPalette);

  return (
    <div style={{
      background: isDark ? 'var(--bg-card)' : '#ffffff',
      borderRadius: 14,
      border: `1px solid ${isDark ? 'var(--border-card)' : '#e2e8f0'}`,
      boxShadow: isDark ? 'var(--card-shadow)' : '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
      padding: '16px 20px',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      justifyContent: 'space-between'
    }}>
      <div>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 6 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            DBSCAN clustering
            <Info size={14} color="#64748b" style={{ cursor: 'pointer' }} />
          </h3>
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            color: isDark ? '#38bdf8' : '#0284c7',
            background: isDark ? 'rgba(56, 189, 248, 0.15)' : '#eff6ff',
            padding: '2px 8px',
            borderRadius: 12,
            border: `1px solid ${isDark ? 'rgba(56, 189, 248, 0.3)' : '#bae6fd'}`
          }}>
            Analysis space: {retainedPCs} retained PCs
          </span>
        </div>

        {/* Hyperparameter Inputs */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: isDark ? '#cbd5e1' : '#334155' }}>eps (ε)</span>
            <input
              type="number"
              step="0.05"
              min="0.1"
              max="5.0"
              value={eps}
              onChange={e => onEpsChange(Math.max(0.1, Number(e.target.value)))}
              style={{
                width: 65,
                padding: '4px 6px',
                borderRadius: 6,
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#cbd5e1'}`,
                background: isDark ? '#0b1120' : '#f8fafc',
                fontSize: 12,
                fontWeight: 700,
                color: isDark ? '#f8fafc' : '#0f172a'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: isDark ? '#cbd5e1' : '#334155' }}>min_samples</span>
            <input
              type="number"
              step="1"
              min="2"
              max="50"
              value={minSamples}
              onChange={e => onMinSamplesChange(Math.max(2, Number(e.target.value)))}
              style={{
                width: 65,
                padding: '4px 6px',
                borderRadius: 6,
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#cbd5e1'}`,
                background: isDark ? '#0b1120' : '#f8fafc',
                fontSize: 12,
                fontWeight: 700,
                color: isDark ? '#f8fafc' : '#0f172a'
              }}
            />
          </div>
        </div>

        {/* Clusters Breakdown List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          {dbscanResult?.clusterStats.map(stat => (
            <div
              key={stat.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 13
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: palette.clusterColors[stat.id] || stat.color,
                    display: 'inline-block',
                    boxShadow: `0 0 10px ${palette.clusterColors[stat.id] || stat.color}`
                  }}
                />
                <span style={{ fontWeight: 700, color: isDark ? '#f8fafc' : '#1e293b' }}>{stat.name}</span>
              </div>
              <div style={{ color: isDark ? '#cbd5e1' : '#475569', fontSize: 12, fontWeight: 600 }}>
                {stat.count} points ({stat.percentage}%)
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Explanatory Note Callout */}
      <div style={{
        background: isDark ? 'rgba(11, 17, 32, 0.7)' : '#f8fafc',
        border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'}`,
        borderRadius: 8,
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        fontSize: 11,
        color: isDark ? '#94a3b8' : '#64748b',
        lineHeight: 1.4
      }}>
        <HelpCircle size={15} color={isDark ? '#38bdf8' : '#94a3b8'} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>Noise points are samples not assigned to any cluster based on density criteria.</span>
      </div>
    </div>
  );
};
