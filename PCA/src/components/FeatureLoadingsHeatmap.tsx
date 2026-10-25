import React from 'react';
import Plot from 'react-plotly.js';
import { Info } from 'lucide-react';
import { PCAResult, ThemeMode } from '../types/pca';

interface FeatureLoadingsHeatmapProps {
  pcaResult: PCAResult;
  theme?: ThemeMode;
}

export const FeatureLoadingsHeatmap: React.FC<FeatureLoadingsHeatmapProps> = ({
  pcaResult,
  theme = 'dark'
}) => {
  const isDark = theme === 'dark';
  const numFeatures = Math.min(8, pcaResult.featureNames.length);
  const numPCs = Math.min(5, pcaResult.nComponents);

  const yLabels = pcaResult.featureNames.slice(0, numFeatures);
  const xLabels = Array.from({ length: numPCs }, (_, i) => `PC${i + 1}`);

  const zValues: number[][] = [];
  const textValues: string[][] = [];

  for (let j = 0; j < numFeatures; j++) {
    const rowZ: number[] = [];
    const rowText: string[] = [];
    for (let k = 0; k < numPCs; k++) {
      const weight = (pcaResult.eigenvectors[k] && pcaResult.eigenvectors[k][j]) ? pcaResult.eigenvectors[k][j] : 0;
      const loading = weight * Math.sqrt(Math.max(0, pcaResult.eigenvalues[k] || 1));
      const normVal = Math.max(-1, Math.min(1, loading));
      rowZ.push(Number(normVal.toFixed(2)));
      rowText.push(`${yLabels[j]} on ${xLabels[k]}: ${normVal.toFixed(2)}`);
    }
    zValues.push(rowZ);
    textValues.push(rowText);
  }

  return (
    <div style={{
      background: isDark ? 'var(--bg-card)' : '#ffffff',
      borderRadius: 14,
      border: `1px solid ${isDark ? 'var(--border-card)' : '#e2e8f0'}`,
      boxShadow: isDark ? 'var(--card-shadow)' : '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
      padding: '16px 20px',
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          Feature loadings
          <Info size={14} color="#64748b" style={{ cursor: 'pointer' }} />
        </h3>
        <span style={{ fontSize: 11, fontWeight: 600, color: isDark ? '#94a3b8' : '#64748b' }}>
          Weights [ -1 to +1 ]
        </span>
      </div>

      <div style={{ flex: 1, minHeight: 220, width: '100%' }}>
        <Plot
          data={[
            {
              z: zValues,
              x: xLabels,
              y: yLabels,
              type: 'heatmap',
              colorscale: [
                [0, '#2563eb'],    // negative: electric blue
                [0.5, isDark ? '#0f172a' : '#f8fafc'], // zero
                [1, '#f97316']     // positive: fiery orange
              ],
              zmin: -1.0,
              zmax: 1.0,
              text: textValues,
              hoverinfo: 'text',
              colorbar: {
                len: 0.95,
                thickness: 12,
                tickvals: [-1.0, -0.5, 0.0, 0.5, 1.0],
                tickfont: { size: 10, color: isDark ? '#cbd5e1' : '#64748b' }
              }
            }
          ]}
          layout={{
            autosize: true,
            margin: { l: 70, r: 40, t: 15, b: 35 },
            paper_bgcolor: 'transparent',
            plot_bgcolor: isDark ? '#0b1120' : '#fafafa',
            xaxis: {
              tickfont: { size: 11, color: isDark ? '#cbd5e1' : '#475569' }
            },
            yaxis: {
              tickfont: { size: 11, color: isDark ? '#f8fafc' : '#334155' },
              autorange: 'reversed'
            }
          }}
          useResizeHandler={true}
          style={{ width: '100%', height: '100%' }}
          config={{ displayModeBar: false }}
        />
      </div>
    </div>
  );
};
