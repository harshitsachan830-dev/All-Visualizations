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

  // Build dynamic filter pills from actual DBSCAN output (not hardcoded)
  const filterOptions = useMemo(() => {
    const opts: { id: number | 'all'; label: string; color?: string }[] = [
      { id: 'all', label: 'All Samples' }
    ];
    if (dbscanResult) {
      // Add each real cluster found (exclude noise from main list)
      dbscanResult.clusterStats
        .filter(s => s.id !== -1)
        .forEach(stat => {
          opts.push({
            id: stat.id,
            label: stat.name,
            color: palette.clusterColors[stat.id] || stat.color
          });
        });
      // Add noise only if there are noise points
      const noiseCount = dbscanResult.noiseCount ?? 0;
      if (noiseCount > 0) {
        opts.push({
          id: -1,
          label: `Noise (${noiseCount})`,
          color: palette.clusterColors[-1] || '#64748b'
        });
      }
    }
    return opts;
  }, [dbscanResult, palette]);

  // Ensure activeFilter is valid whenever clusters change
  const validFilter = useMemo(() => {
    if (activeFilter === 'all') return 'all';
    const ids = filterOptions.map(o => o.id);
    return ids.includes(activeFilter) ? activeFilter : 'all' as const;
  }, [activeFilter, filterOptions]);

  const parcoordsData = useMemo(() => {
    let indices = pcaResult.transformedData.map((_, i) => i);
    if (validFilter !== 'all' && dbscanResult) {
      indices = indices.filter(i => (dbscanResult.labels[i] ?? -1) === validFilter);
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

    // Build dynamic colorscale from actual clusters found
    const actualClusters = dbscanResult?.clusterStats ?? [];
    const noiseStat = actualClusters.find(s => s.id === -1);
    const realClusters = actualClusters.filter(s => s.id !== -1);

    // Order: noise first, then clusters by id
    const orderedIds: number[] = [];
    if (noiseStat || (dbscanResult?.noiseCount ?? 0) > 0) orderedIds.push(-1);
    realClusters.forEach(s => orderedIds.push(s.id));
    if (orderedIds.length === 0) orderedIds.push(0); // fallback

    const totalSteps = orderedIds.length;
    const clusterIndexMap: Record<number, number> = {};
    orderedIds.forEach((cid, idx) => { clusterIndexMap[cid] = idx; });

    // Assign numeric step value (0..1) to each point
    const clusterSteps = indices.map(i => {
      const c = dbscanResult?.labels[i] ?? -1;
      const idx = clusterIndexMap[c] ?? 0;
      return (idx + 0.5) / totalSteps;
    });

    // Build colorscale
    const colorscale: [number, string][] = [];
    orderedIds.forEach((cid, idx) => {
      const color = cid === -1
        ? (palette.clusterColors[-1] || '#64748b')
        : (palette.clusterColors[cid] || actualClusters.find(s => s.id === cid)?.color || '#00f5d4');
      const lo = idx / totalSteps;
      const hi = (idx + 1) / totalSteps;
      colorscale.push([lo, color]);
      colorscale.push([Math.min(hi, 1.0), color]);
    });
    if (colorscale.length === 0) {
      colorscale.push([0, '#00f5d4'], [1, '#00f5d4']);
    }
    // Ensure exact [0..1] endpoints
    colorscale[0][0] = 0;
    colorscale[colorscale.length - 1][0] = 1.0;

    // Build colorbar ticks
    const tickvals = orderedIds.map((_, idx) => (idx + 0.5) / totalSteps);
    const ticktext = orderedIds.map(cid =>
      cid === -1 ? 'Noise' : (actualClusters.find(s => s.id === cid)?.name || `Cluster ${cid + 1}`)
    );

    return [
      {
        type: 'parcoords',
        line: {
          color: clusterSteps,
          colorscale,
          showscale: true,
          colorbar: {
            title: { text: 'Cluster', font: { size: 11, color: isDark ? '#e2e8f0' : '#334155' } },
            tickvals,
            ticktext,
            tickfont: { color: isDark ? '#94a3b8' : '#64748b', size: 10 },
            len: 0.85
          }
        },
        dimensions
      }
    ];
  }, [pcaResult, dbscanResult, numPCs, validFilter, isDark, palette]);

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
            Parallel Coordinates Stream Projection (PC1 &ndash; PC{numPCs})
            <Info size={14} color={isDark ? '#94a3b8' : '#64748b'} style={{ cursor: 'pointer' }} />
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: isDark ? '#94a3b8' : '#64748b' }}>
            Trace high-dimensional sample trajectories through orthogonal axes. Click cluster pills to isolate trajectories or drag vertical axes to brush-select subsets.
          </p>
        </div>

        {/* Dynamic Cluster Filter Buttons — only shows clusters that actually exist */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: isDark ? '#94a3b8' : '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Filter size={13} /> Filter:
          </span>
          {filterOptions.map(f => {
            const isActive = validFilter === f.id;
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
        <span>
          {dbscanResult
            ? `DBSCAN found ${dbscanResult.nClusters} cluster${dbscanResult.nClusters !== 1 ? 's' : ''} + ${dbscanResult.noiseCount} noise points. Adjust \u03b5 and min_samples in Clustering settings to change cluster count.`
            : 'Run analysis to generate cluster assignments. Parallel coordinates allow visual inspection of high-dimensional subspace separability.'}
        </span>
      </div>
    </div>
  );
};
