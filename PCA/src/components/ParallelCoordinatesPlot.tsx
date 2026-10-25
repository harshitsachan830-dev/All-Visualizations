import React, { useMemo, useState } from 'react';
import Plot from 'react-plotly.js';
import { Info, HelpCircle, Filter } from 'lucide-react';
import { PCAResult, DBSCANResult, ThemeMode, ColorPalette } from '../types/pca';
import { getPaletteDef } from '../utils/colors';

interface ParallelCoordinatesPlotProps {
  pcaResult: PCAResult;
  dbscanResult: DBSCANResult | null;
  theme?: ThemeMode;
  colorPalette?: ColorPalette;
}

export const ParallelCoordinatesPlot: React.FC<ParallelCoordinatesPlotProps> = ({
  pcaResult,
  dbscanResult,
  theme = 'dark',
  colorPalette = 'cyber'
}) => {
  const [activeFilter, setActiveFilter] = useState<number | 'all'>('all');
  const numPCs = Math.min(6, pcaResult.nComponents);

  const isDark = theme === 'dark';
  const palette = getPaletteDef(colorPalette);

  const parcoordsData = useMemo(() => {
    let indices = pcaResult.transformedData.map((_, i) => i);
    if (activeFilter !== 'all' && dbscanResult) {
      indices = indices.filter(i => (dbscanResult.labels[i] ?? -1) === activeFilter);
    }

    const dimensions = Array.from({ length: numPCs }, (_, k) => {
      const allVals = pcaResult.transformedData.map(p => p.coords[k] || 0);
      const minVal = Math.min(...allVals);
      const maxVal = Math.max(...allVals);
      const varPct = ((pcaResult.explainedVariance[k] || 0) * 100).toFixed(0);

      return {
        range: [minVal, maxVal],
        label: `PC${k + 1} (${varPct}%)`,
        values: indices.map(i => pcaResult.transformedData[i].coords[k] || 0),
        tickfont: { color: isDark ? '#94a3b8' : '#64748b', size: 10 },
        labelfont: { color: isDark ? '#00f5d4' : '#0284c7', size: 12, weight: 'bold' }
      };
    });

    // Map cluster IDs to distinct numeric steps: Noise=-1 -> 0, C1=0 -> 1, C2=1 -> 2, C3=2 -> 3
    const clusterSteps = indices.map(i => {
      const c = dbscanResult?.labels[i] ?? -1;
      return c === -1 ? 0 : c + 1;
    });

    const c0 = palette.clusterColors[-1] || '#64748b';
    const c1 = palette.clusterColors[0] || '#00f5d4';
    const c2 = palette.clusterColors[1] || '#ff007f';
    const c3 = palette.clusterColors[2] || '#ffb703';

    return [
      {
        type: 'parcoords',
        line: {
          color: clusterSteps,
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
          showscale: true,
          colorbar: {
            title: { text: 'Cluster', font: { size: 11, color: isDark ? '#e2e8f0' : '#334155' } },
            tickvals: [0.125, 0.375, 0.625, 0.875],
            ticktext: ['Noise', 'Cluster 1', 'Cluster 2', 'Cluster 3'],
            tickfont: { color: isDark ? '#94a3b8' : '#64748b', size: 10 },
            len: 0.85
          }
        },
        dimensions
      }
    ];
  }, [pcaResult, dbscanResult, numPCs, activeFilter, isDark, palette]);

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            Parallel Coordinates Stream Projection (PC1 – PC{numPCs})
            <Info size={14} color={isDark ? '#94a3b8' : '#64748b'} style={{ cursor: 'pointer' }} />
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: isDark ? '#94a3b8' : '#64748b' }}>
            Trace high-dimensional sample trajectories through orthogonal axes. Click cluster pills to isolate trajectories or drag vertical axes to brush-select subsets.
          </p>
        </div>

        {/* Cluster Filter Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: isDark ? '#94a3b8' : '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Filter size={13} /> Filter:
          </span>
          {[
            { id: 'all', label: 'All Samples' },
            { id: 0, label: 'Cluster 1', color: palette.clusterColors[0] },
            { id: 1, label: 'Cluster 2', color: palette.clusterColors[1] },
            { id: 2, label: 'Cluster 3', color: palette.clusterColors[2] },
            { id: -1, label: 'Noise Only', color: palette.clusterColors[-1] }
          ].map(f => {
            const isActive = activeFilter === f.id;
            return (
              <button
                key={String(f.id)}
                onClick={() => setActiveFilter(f.id as any)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 20,
                  border: `1px solid ${isActive ? (f.color || '#00f5d4') : isDark ? 'rgba(255,255,255,0.1)' : '#cbd5e1'}`,
                  background: isActive ? `${f.color || '#00f5d4'}22` : isDark ? 'rgba(22, 33, 56, 0.5)' : '#ffffff',
                  color: isActive ? (f.color || (isDark ? '#00f5d4' : '#0284c7')) : isDark ? '#94a3b8' : '#64748b',
                  fontSize: 12,
                  fontWeight: isActive ? 800 : 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 440, width: '100%' }}>
        <Plot
          data={parcoordsData}
          layout={{
            autosize: true,
            margin: { l: 60, r: 60, t: 30, b: 25 },
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent'
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
        <span>Report Guide (Section 4): Parallel coordinates allow visual inspection of high-dimensional subspace separability without collapsing into a single plane.</span>
      </div>
    </div>
  );
};
