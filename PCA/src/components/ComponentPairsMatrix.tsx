import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';
import { Info, HelpCircle } from 'lucide-react';
import { PCAResult, DBSCANResult, ThemeMode, ColorPalette } from '../types/pca';
import { getPaletteDef } from '../utils/colors';

interface ComponentPairsMatrixProps {
  pcaResult: PCAResult;
  dbscanResult: DBSCANResult | null;
  theme?: ThemeMode;
  colorPalette?: ColorPalette;
}

export const ComponentPairsMatrix: React.FC<ComponentPairsMatrixProps> = ({
  pcaResult,
  dbscanResult,
  theme = 'dark',
  colorPalette = 'cyber'
}) => {
  const numPCs = Math.min(4, pcaResult.nComponents);
  const isDark = theme === 'dark';
  const palette = getPaletteDef(colorPalette);

  const splomData = useMemo(() => {
    const dimensions = Array.from({ length: numPCs }, (_, k) => {
      const varPct = ((pcaResult.explainedVariance[k] || 0) * 100).toFixed(0);
      return {
        label: `PC${k + 1} (${varPct}%)`,
        values: pcaResult.transformedData.map(p => p.coords[k] || 0)
      };
    });

    const clusterColors = pcaResult.transformedData.map((_, idx) => {
      const c = dbscanResult?.labels[idx] ?? -1;
      return c === -1 ? 0 : c + 1;
    });

    const c0 = palette.clusterColors[-1] || '#64748b';
    const c1 = palette.clusterColors[0] || '#00f5d4';
    const c2 = palette.clusterColors[1] || '#ff007f';
    const c3 = palette.clusterColors[2] || '#ffb703';

    return [
      {
        type: 'splom',
        dimensions,
        text: pcaResult.transformedData.map(p => `Sample #${p.id} (${p.label})`),
        marker: {
          color: clusterColors,
          colorscale: [
            [0.0, c0],
            [0.24, c0],
            [0.25, c1],
            [0.49, c1],
            [0.50, c2],
            [0.74, c2],
            [0.75, c3],
            [1.0, c3]
          ],
          size: 6,
          opacity: 0.88,
          line: { width: 0.6, color: '#ffffff' }
        }
      }
    ];
  }, [pcaResult, dbscanResult, numPCs, palette]);

  return (
    <div
      className="glass-panel"
      style={{
        background: isDark ? 'var(--bg-card)' : 'var(--bg-card)',
        borderRadius: 16,
        border: `1px solid ${isDark ? 'var(--border-card)' : 'var(--border-card)'}`,
        boxShadow: isDark ? 'var(--card-shadow)' : 'var(--card-shadow)',
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 520,
        gap: 16
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            Component Pairs Matrix (SPLOM: PC1 – PC{numPCs})
            <Info size={14} color={isDark ? '#94a3b8' : '#64748b'} style={{ cursor: 'pointer' }} />
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: isDark ? '#94a3b8' : '#64748b' }}>
            Simultaneously view all 2D orthogonal slices through your data. Drag to select samples across subplots to evaluate subspace clustering.
          </p>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 450, width: '100%' }}>
        <Plot
          data={splomData}
          layout={{
            autosize: true,
            margin: { l: 50, r: 20, t: 20, b: 40 },
            paper_bgcolor: 'transparent',
            plot_bgcolor: isDark ? '#090e1a' : '#fafafa',
            hovermode: 'closest'
          }}
          useResizeHandler={true}
          style={{ width: '100%', height: '100%' }}
          config={{ displayModeBar: true, displaylogo: false, responsive: true }}
        />
      </div>

      <div style={{
        padding: '10px 14px',
        background: isDark ? 'rgba(22, 33, 56, 0.5)' : '#f8fafc',
        borderRadius: 8,
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
        fontSize: 12,
        color: isDark ? '#94a3b8' : '#64748b',
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }}>
        <HelpCircle size={15} color={isDark ? '#38bdf8' : '#94a3b8'} />
        <span>Report Section 4: A single 2D projection can project distinct clusters on top of each other. The component pairs matrix ensures no orthogonal cluster is overlooked.</span>
      </div>
    </div>
  );
};
