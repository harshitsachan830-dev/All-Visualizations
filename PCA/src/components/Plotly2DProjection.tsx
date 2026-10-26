import React, { useMemo, useState } from 'react';
import Plot from 'react-plotly.js';
import { Info, Layers, Eye, Sliders, Sparkles, Activity } from 'lucide-react';
import { PCAResult, DBSCANResult, ThemeMode, ColorPalette } from '../types/pca';
import { getPaletteDef } from '../utils/colors';

interface Plotly2DProjectionProps {
  pcaResult: PCAResult;
  dbscanResult: DBSCANResult | null;
  theme?: ThemeMode;
  colorPalette?: ColorPalette;
  allowAxisSelection?: boolean;
}

export const Plotly2DProjection: React.FC<Plotly2DProjectionProps> = ({
  pcaResult,
  dbscanResult,
  theme = 'dark',
  colorPalette = 'cyber',
  allowAxisSelection = true
}) => {
  const [pcX, setPcX] = useState<number>(0); // PC1
  const [pcY, setPcY] = useState<number>(1); // PC2
  const [colorMode, setColorMode] = useState<'dbscan' | 'label' | 'density' | 'feature' | 'error'>('dbscan');
  const [selectedFeature, setSelectedFeature] = useState<string>(pcaResult.featureNames[0] || '');
  const [showEllipses, setShowEllipses] = useState<boolean>(true);
  const [showContours, setShowContours] = useState<boolean>(false);
  const [showVectors, setShowVectors] = useState<boolean>(true);
  const [showCentroids, setShowCentroids] = useState<boolean>(true);
  const [pointSize, setPointSize] = useState<number>(7.5);
  const [pointOpacity, setPointOpacity] = useState<number>(0.9);

  const isDark = theme === 'dark';
  const palette = getPaletteDef(colorPalette);

  const nComponents = pcaResult.nComponents;
  const varX = ((pcaResult.explainedVariance[pcX] || 0) * 100).toFixed(1);
  const varY = ((pcaResult.explainedVariance[pcY] || 0) * 100).toFixed(1);
  const displayedVariance = (
    ((pcaResult.explainedVariance[pcX] || 0) + (pcaResult.explainedVariance[pcY] || 0)) * 100
  ).toFixed(1);

  // Helper to generate 2D Gaussian confidence ellipse coordinates
  const generateEllipse = (xs: number[], ys: number[], strokeColor: string, name: string) => {
    if (xs.length < 5) return null;
    const n = xs.length;
    const meanX = xs.reduce((a, b) => a + b, 0) / n;
    const meanY = ys.reduce((a, b) => a + b, 0) / n;

    let sxx = 0, syy = 0, sxy = 0;
    for (let i = 0; i < n; i++) {
      const dx = xs[i] - meanX;
      const dy = ys[i] - meanY;
      sxx += dx * dx;
      syy += dy * dy;
      sxy += dx * dy;
    }
    sxx /= n - 1;
    syy /= n - 1;
    sxy /= n - 1;

    const trace = sxx + syy;
    const det = sxx * syy - sxy * sxy;
    const disc = Math.max(0, Math.sqrt(Math.max(0, trace * trace - 4 * det)));
    const lambda1 = Math.max(0, (trace + disc) / 2);
    const lambda2 = Math.max(0, (trace - disc) / 2);

    const theta = 0.5 * Math.atan2(2 * sxy, sxx - syy);
    const a = 2.0 * Math.sqrt(lambda1); // ~95% confidence radius
    const b = 2.0 * Math.sqrt(lambda2);

    const ellipseX: number[] = [];
    const ellipseY: number[] = [];
    const steps = 60;

    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * 2 * Math.PI;
      const x0 = a * Math.cos(t);
      const y0 = b * Math.sin(t);
      const xr = meanX + x0 * Math.cos(theta) - y0 * Math.sin(theta);
      const yr = meanY + x0 * Math.sin(theta) + y0 * Math.cos(theta);
      ellipseX.push(xr);
      ellipseY.push(yr);
    }

    // Convert hex or rgb to transparent fill
    let fillColor = 'rgba(0, 245, 212, 0.12)';
    if (strokeColor.startsWith('#')) {
      const hex = strokeColor.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16) || 0;
      const g = parseInt(hex.substring(2, 4), 16) || 0;
      const b = parseInt(hex.substring(4, 6), 16) || 0;
      fillColor = `rgba(${r}, ${g}, ${b}, 0.14)`;
    }

    return {
      x: ellipseX,
      y: ellipseY,
      mode: 'lines',
      type: 'scatter',
      name: `${name} (95% CI)`,
      line: { color: strokeColor, width: 2, dash: 'dash' },
      fill: 'toself',
      fillcolor: fillColor,
      hoverinfo: 'none',
      showlegend: false
    };
  };

  const plotData = useMemo(() => {
    const traces: any[] = [];
    const points = pcaResult.transformedData;
    const xs = points.map(p => p.coords[pcX] || 0);
    const ys = points.map(p => p.coords[pcY] || 0);

    // 1. Optional 2D Density Contours (KDE background)
    if (showContours) {
      traces.push({
        x: xs,
        y: ys,
        type: 'histogram2dcontour',
        colorscale: palette.densityScale,
        showscale: false,
        reversescale: false,
        ncontours: 18,
        contours: {
          coloring: 'heatmap',
          showlines: true
        },
        opacity: isDark ? 0.45 : 0.28,
        hoverinfo: 'none'
      });
    }

    // 2. Main Points based on color mode
    if (colorMode === 'density') {
      // Local density proxy by PC radius
      const densities = points.map(p => {
        const x = p.coords[pcX] || 0;
        const y = p.coords[pcY] || 0;
        return Math.exp(-0.15 * (x * x + y * y));
      });

      traces.push({
        x: xs,
        y: ys,
        mode: 'markers',
        type: 'scatter',
        text: points.map(p => `Sample #${p.id}<br>Class: ${p.label}<br>PC${pcX + 1}: ${p.coords[pcX].toFixed(2)}<br>PC${pcY + 1}: ${p.coords[pcY].toFixed(2)}`),
        hoverinfo: 'text',
        marker: {
          size: pointSize,
          color: densities,
          colorscale: palette.densityScale,
          showscale: true,
          colorbar: {
            title: { text: 'Density', font: { size: 10, color: isDark ? '#e2e8f0' : '#334155' } },
            thickness: 10,
            len: 0.8,
            tickfont: { color: isDark ? '#94a3b8' : '#64748b', size: 9 }
          },
          opacity: pointOpacity,
          line: { width: 0.8, color: isDark ? '#ffffff' : '#0f172a' }
        }
      });
    } else if (colorMode === 'feature') {
      const featVals = points.map(p => p.original[selectedFeature] || 0);
      traces.push({
        x: xs,
        y: ys,
        mode: 'markers',
        type: 'scatter',
        text: points.map(p => `Sample #${p.id}<br>Class: ${p.label}<br>${selectedFeature}: ${(p.original[selectedFeature] || 0).toFixed(2)}`),
        hoverinfo: 'text',
        marker: {
          size: pointSize,
          color: featVals,
          colorscale: 'Plasma',
          showscale: true,
          colorbar: {
            title: { text: selectedFeature, font: { size: 10, color: isDark ? '#e2e8f0' : '#334155' } },
            thickness: 10,
            len: 0.8,
            tickfont: { color: isDark ? '#94a3b8' : '#64748b', size: 9 }
          },
          opacity: pointOpacity,
          line: { width: 0.8, color: '#ffffff' }
        }
      });
    } else if (colorMode === 'error') {
      const errors = points.map(p => p.reconstructionError || 0);
      traces.push({
        x: xs,
        y: ys,
        mode: 'markers',
        type: 'scatter',
        text: points.map(p => `Sample #${p.id}<br>Class: ${p.label}<br>MSE Loss: ${(p.reconstructionError || 0).toFixed(3)}`),
        hoverinfo: 'text',
        marker: {
          size: pointSize,
          color: errors,
          colorscale: 'Portland',
          showscale: true,
          colorbar: {
            title: { text: 'MSE Loss', font: { size: 10, color: isDark ? '#e2e8f0' : '#334155' } },
            thickness: 10,
            len: 0.8,
            tickfont: { color: isDark ? '#94a3b8' : '#64748b', size: 9 }
          },
          opacity: pointOpacity,
          line: { width: 0.8, color: '#ffffff' }
        }
      });
    } else if (colorMode === 'dbscan' && dbscanResult) {
      const clusterMap: Record<number, { x: number[]; y: number[]; text: number[]; names: string[] }> = {};

      points.forEach((p, idx) => {
        const clusterId = dbscanResult.labels[idx] ?? -1;
        if (!clusterMap[clusterId]) {
          clusterMap[clusterId] = { x: [], y: [], text: [], names: [] };
        }
        clusterMap[clusterId].x.push(p.coords[pcX] || 0);
        clusterMap[clusterId].y.push(p.coords[pcY] || 0);
        clusterMap[clusterId].text.push(p.id);
        clusterMap[clusterId].names.push(p.label);
      });

      const centroidXs: number[] = [];
      const centroidYs: number[] = [];
      const centroidLabels: string[] = [];
      const centroidColors: string[] = [];

      dbscanResult.clusterStats.forEach(stat => {
        const group = clusterMap[stat.id];
        if (!group) return;

        const color = palette.clusterColors[stat.id] || stat.color;

        // Confidence Ellipse
        if (showEllipses && stat.id !== -1 && group.x.length > 5) {
          const ellipseTrace = generateEllipse(group.x, group.y, color, stat.name);
          if (ellipseTrace) traces.push(ellipseTrace);
        }

        // Compute centroid
        if (showCentroids && stat.id !== -1 && group.x.length > 0) {
          const mx = group.x.reduce((a, b) => a + b, 0) / group.x.length;
          const my = group.y.reduce((a, b) => a + b, 0) / group.y.length;
          centroidXs.push(mx);
          centroidYs.push(my);
          centroidLabels.push(`C${stat.id + 1}`);
          centroidColors.push(color);
        }

        // Scatter points
        traces.push({
          x: group.x,
          y: group.y,
          mode: 'markers',
          type: 'scatter',
          name: stat.name,
          text: group.names.map((name, i) => `Sample #${group.text[i]}<br>Class: ${name}<br>Status: ${stat.name}`),
          hoverinfo: 'text+x+y',
          marker: {
            size: stat.id === -1 ? pointSize * 0.75 : pointSize,
            color,
            opacity: stat.id === -1 ? 0.45 : pointOpacity,
            symbol: stat.id === -1 ? 'diamond-open' : 'circle',
            line: {
              width: stat.id === -1 ? 1.2 : 0.8,
              color: stat.id === -1 ? (isDark ? '#cbd5e1' : '#64748b') : '#ffffff'
            }
          }
        });
      });

      // Centroid markers
      if (showCentroids && centroidXs.length > 0) {
        traces.push({
          x: centroidXs,
          y: centroidYs,
          mode: 'markers+text',
          type: 'scatter',
          name: 'Cluster Centroids',
          text: centroidLabels,
          textposition: 'top center',
          textfont: {
            color: isDark ? '#ffffff' : '#0f172a',
            size: 12,
            weight: 'bold'
          },
          marker: {
            size: 14,
            color: centroidColors,
            symbol: 'diamond',
            line: { width: 2, color: isDark ? '#000000' : '#ffffff' }
          },
          hoverinfo: 'text'
        });
      }
    } else {
      // By canonical label
      const labelMap: Record<string, { x: number[]; y: number[]; text: number[] }> = {};
      points.forEach(p => {
        const lbl = p.label || 'Unknown';
        if (!labelMap[lbl]) {
          labelMap[lbl] = { x: [], y: [], text: [] };
        }
        labelMap[lbl].x.push(p.coords[pcX] || 0);
        labelMap[lbl].y.push(p.coords[pcY] || 0);
        labelMap[lbl].text.push(p.id);
      });

      let cIdx = 0;
      Object.keys(labelMap).forEach(lbl => {
        const group = labelMap[lbl];
        const color = palette.labelColors[cIdx % palette.labelColors.length];

        if (showEllipses && group.x.length > 5) {
          const ellipseTrace = generateEllipse(group.x, group.y, color, lbl);
          if (ellipseTrace) traces.push(ellipseTrace);
        }

        traces.push({
          x: group.x,
          y: group.y,
          mode: 'markers',
          type: 'scatter',
          name: lbl,
          text: group.text.map(id => `Sample #${id}<br>Class: ${lbl}`),
          hoverinfo: 'text+x+y',
          marker: {
            size: pointSize,
            color,
            opacity: pointOpacity,
            line: { width: 0.8, color: '#ffffff' }
          }
        });
        cIdx++;
      });
    }

    // Biplot feature vector arrows
    if (showVectors && pcaResult.loadings.length > 0) {
      const allX = points.map(p => p.coords[pcX] || 0);
      const maxCoord = Math.max(...allX.map(Math.abs), 1);
      const topLoadings = [...pcaResult.loadings]
        .sort((a, b) => b.importance - a.importance)
        .slice(0, 6);

      const maxLoading = Math.max(
        ...topLoadings.map(l => Math.hypot(l.vector[pcX] || 0, l.vector[pcY] || 0)),
        0.001
      );
      const scaleFactor = (maxCoord * 0.75) / maxLoading;

      const arrowX: (number | null)[] = [];
      const arrowY: (number | null)[] = [];
      const annotations: any[] = [];

      topLoadings.forEach((l, idx) => {
        const vx = (l.vector[pcX] || 0) * scaleFactor;
        const vy = (l.vector[pcY] || 0) * scaleFactor;

        arrowX.push(0, vx, null);
        arrowY.push(0, vy, null);

        const arrowColor = ['#ff007f', '#00f5d4', '#ffb703', '#8b5cf6', '#38bdf8', '#10b981'][idx % 6];

        annotations.push({
          x: vx,
          y: vy,
          ax: 0,
          ay: 0,
          xref: 'x',
          yref: 'y',
          axref: 'x',
          ayref: 'y',
          showarrow: true,
          arrowhead: 3,
          arrowsize: 1.4,
          arrowwidth: 2.2,
          arrowcolor: arrowColor,
          text: l.feature,
          font: {
            color: arrowColor,
            size: 11,
            family: 'Plus Jakarta Sans',
            weight: 700
          },
          bgcolor: isDark ? 'rgba(9, 14, 26, 0.85)' : 'rgba(255, 255, 255, 0.9)',
          bordercolor: arrowColor,
          borderwidth: 1,
          borderpad: 3
        });
      });

      traces.push({
        x: arrowX,
        y: arrowY,
        mode: 'lines',
        type: 'scatter',
        name: 'Feature Loadings',
        line: { color: palette.biplotVectorColor, width: 2 },
        hoverinfo: 'none',
        showlegend: false
      });

      return { traces, annotations };
    }

    return { traces, annotations: [] };
  }, [
    pcaResult,
    dbscanResult,
    pcX,
    pcY,
    colorMode,
    selectedFeature,
    showEllipses,
    showContours,
    showVectors,
    showCentroids,
    pointSize,
    pointOpacity,
    isDark,
    palette
  ]);

  return (
    <div
      className="glass-panel"
      style={{
        background: isDark ? 'var(--bg-card)' : 'var(--bg-card)',
        borderRadius: 16,
        border: `1px solid ${isDark ? 'var(--border-card)' : 'var(--border-card)'}`,
        padding: '18px 20px',
        boxShadow: isDark ? 'var(--card-shadow)' : 'var(--card-shadow)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }}
    >
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a', margin: 0 }}>
            2D PCA Projection
          </h2>
          <span
            title="Projects high-dimensional dataset onto orthogonal eigenvectors PCX and PCY. Shows sample variance, clusters, and 95% confidence intervals."
            style={{ cursor: 'pointer', color: isDark ? '#94a3b8' : '#64748b' }}
          >
            <Info size={15} />
          </span>
        </div>

        {/* Color Mode Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              background: isDark ? 'rgba(22, 33, 56, 0.7)' : '#e2e8f0',
              borderRadius: 8,
              padding: 2,
              gap: 2,
              fontSize: 12,
              fontWeight: 600
            }}
          >
            {[
              { id: 'dbscan', label: 'Clusters' },
              { id: 'label', label: 'Subtypes' },
              { id: 'density', label: 'Density' },
              { id: 'feature', label: 'Feature' },
              { id: 'error', label: 'MSE Error' }
            ].map(m => {
              const active = colorMode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setColorMode(m.id as any)}
                  style={{
                    padding: '4px 9px',
                    border: 'none',
                    borderRadius: 6,
                    background: active
                      ? isDark
                        ? 'linear-gradient(135deg, #00f5d4 0%, #0284c7 100%)'
                        : '#ffffff'
                      : 'transparent',
                    color: active ? (isDark ? '#060913' : '#0284c7') : isDark ? '#94a3b8' : '#64748b',
                    fontWeight: active ? 800 : 600,
                    cursor: 'pointer',
                    boxShadow: active ? '0 2px 6px rgba(0,0,0,0.15)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {m.label}
                </button>
              );
            })}
          </div>

          {/* Variance badge */}
          <div
            className="pulse-badge"
            style={{
              fontSize: 12,
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              color: isDark ? '#00f5d4' : '#0284c7',
              background: isDark ? 'rgba(0, 245, 212, 0.12)' : '#e0f2fe',
              padding: '4px 10px',
              borderRadius: 20,
              border: `1px solid ${isDark ? 'rgba(0, 245, 212, 0.35)' : '#bae6fd'}`
            }}
          >
            Variance: {displayedVariance}%
          </div>
        </div>
      </div>

      {/* Feature Selector (if feature mode selected) */}
      {colorMode === 'feature' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: isDark ? '#cbd5e1' : '#475569' }}>
            Color by Gene:
          </span>
          <select
            value={selectedFeature}
            onChange={e => setSelectedFeature(e.target.value)}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              background: isDark ? 'var(--bg-input)' : '#ffffff',
              color: isDark ? '#f8fafc' : '#0f172a',
              border: `1px solid ${isDark ? 'var(--border-card)' : '#cbd5e1'}`,
              fontSize: 12,
              fontWeight: 600
            }}
          >
            {pcaResult.featureNames.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
      )}

      {/* Axis & Layer Controls Toolbar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          padding: '6px 12px',
          background: isDark ? 'rgba(22, 33, 56, 0.45)' : 'rgba(241, 245, 249, 0.8)',
          borderRadius: 10,
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}`
        }}
      >
        {/* Axes dropdowns */}
        {allowAxisSelection && <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 700, color: isDark ? '#94a3b8' : '#475569' }}>X axis</span>
            <select
              value={pcX}
              onChange={e => setPcX(Number(e.target.value))}
              style={{
                padding: '3px 8px',
                borderRadius: 6,
                border: `1px solid ${isDark ? 'var(--border-card)' : '#cbd5e1'}`,
                background: isDark ? 'var(--bg-input)' : '#ffffff',
                color: isDark ? '#f8fafc' : '#0f172a',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {Array.from({ length: nComponents }, (_, i) => (
                <option key={i} value={i}>
                  PC{i + 1} ({((pcaResult.explainedVariance[i] || 0) * 100).toFixed(0)}%)
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 700, color: isDark ? '#94a3b8' : '#475569' }}>Y axis</span>
            <select
              value={pcY}
              onChange={e => setPcY(Number(e.target.value))}
              style={{
                padding: '3px 8px',
                borderRadius: 6,
                border: `1px solid ${isDark ? 'var(--border-card)' : '#cbd5e1'}`,
                background: isDark ? 'var(--bg-input)' : '#ffffff',
                color: isDark ? '#f8fafc' : '#0f172a',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {Array.from({ length: nComponents }, (_, i) => (
                <option key={i} value={i}>
                  PC{i + 1} ({((pcaResult.explainedVariance[i] || 0) * 100).toFixed(0)}%)
                </option>
              ))}
            </select>
          </div>
        </div>}

        {/* Layer Toggles & Point Size Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          {/* 95% Confidence Ellipses */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: isDark ? '#cbd5e1' : '#334155' }}>
            <input
              type="checkbox"
              checked={showEllipses}
              onChange={e => setShowEllipses(e.target.checked)}
              style={{ accentColor: '#00f5d4' }}
            />
            <span>95% Ellipses</span>
          </label>

          {/* Density Contours */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: isDark ? '#cbd5e1' : '#334155' }}>
            <input
              type="checkbox"
              checked={showContours}
              onChange={e => setShowContours(e.target.checked)}
              style={{ accentColor: '#00f5d4' }}
            />
            <span>KDE Contours</span>
          </label>

          {/* Biplot Vectors */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: isDark ? '#cbd5e1' : '#334155' }}>
            <input
              type="checkbox"
              checked={showVectors}
              onChange={e => setShowVectors(e.target.checked)}
              style={{ accentColor: '#00f5d4' }}
            />
            <span>Biplot Vectors</span>
          </label>

          {/* Point size slider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b' }}>Size</span>
            <input
              type="range"
              min="4"
              max="14"
              step="0.5"
              value={pointSize}
              onChange={e => setPointSize(Number(e.target.value))}
              style={{ width: 60 }}
            />
          </div>
        </div>
      </div>

      {/* 2D Plot Container */}
      <div style={{ minHeight: 520, width: '100%', position: 'relative' }}>
        <Plot
          data={plotData.traces}
          layout={{
            autosize: true,
            height: 520,
            margin: { l: 55, r: 25, t: 25, b: 50 },
            paper_bgcolor: 'transparent',
            plot_bgcolor: isDark ? '#090e1a' : '#fafcff',
            xaxis: {
              title: {
                text: `<b>PC${pcX + 1}</b> (${varX}% variance)`,
                font: { size: 12, color: isDark ? '#f8fafc' : '#0f172a', family: 'Outfit' }
              },
              gridcolor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(203, 213, 225, 0.7)',
              zerolinecolor: isDark ? 'rgba(0, 245, 212, 0.4)' : '#94a3b8',
              zerolinewidth: 1.5,
              tickfont: { color: isDark ? '#94a3b8' : '#64748b', size: 10 }
            },
            yaxis: {
              title: {
                text: `<b>PC${pcY + 1}</b> (${varY}% variance)`,
                font: { size: 12, color: isDark ? '#f8fafc' : '#0f172a', family: 'Outfit' }
              },
              gridcolor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(203, 213, 225, 0.7)',
              zerolinecolor: isDark ? 'rgba(0, 245, 212, 0.4)' : '#94a3b8',
              zerolinewidth: 1.5,
              tickfont: { color: isDark ? '#94a3b8' : '#64748b', size: 10 }
            },
            legend: {
              orientation: 'v',
              x: 0.88,
              y: 0.98,
              bgcolor: isDark ? 'rgba(9, 14, 26, 0.8)' : 'rgba(255, 255, 255, 0.85)',
              bordercolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
              borderwidth: 1,
              font: { size: 11, color: isDark ? '#f8fafc' : '#0f172a' }
            },
            hoverlabel: {
              bgcolor: isDark ? '#0f172a' : '#ffffff',
              bordercolor: isDark ? '#00f5d4' : '#0284c7',
              font: { color: isDark ? '#ffffff' : '#000000', size: 12, family: 'Plus Jakarta Sans' }
            },
            annotations: plotData.annotations
          }}
          useResizeHandler={true}
          style={{ width: '100%', height: '100%' }}
          config={{
            displayModeBar: true,
            displaylogo: false,
            responsive: true,
            modeBarButtonsToRemove: ['lasso2d']
          }}
        />
      </div>
    </div>
  );
};
