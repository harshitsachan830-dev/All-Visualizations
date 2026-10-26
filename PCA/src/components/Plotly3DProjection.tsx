import React, { useMemo, useState, useEffect, useRef } from 'react';
import Plot from 'react-plotly.js';
import { Info, RotateCcw, Box, Compass, Play, Pause, Maximize2 } from 'lucide-react';
import { PCAResult, DBSCANResult, ThemeMode, ColorPalette } from '../types/pca';
import { getPaletteDef } from '../utils/colors';

interface Plotly3DProjectionProps {
  pcaResult: PCAResult;
  dbscanResult: DBSCANResult | null;
  theme?: ThemeMode;
  colorPalette?: ColorPalette;
  allowAxisSelection?: boolean;
}

export const Plotly3DProjection: React.FC<Plotly3DProjectionProps> = ({
  pcaResult,
  dbscanResult,
  theme = 'dark',
  colorPalette = 'cyber',
  allowAxisSelection = true
}) => {
  const [pcX, setPcX] = useState<number>(0); // PC1
  const [pcY, setPcY] = useState<number>(1); // PC2
  const [pcZ, setPcZ] = useState<number>(2); // PC3
  const [colorMode, setColorMode] = useState<'dbscan' | 'label' | 'density'>('dbscan');
  const [showCentroids, setShowCentroids] = useState<boolean>(true);
  const [show3DBiplot, setShow3DBiplot] = useState<boolean>(true);
  const [showClusterEnvelopes, setShowClusterEnvelopes] = useState<boolean>(true);
  const [pointSize, setPointSize] = useState<number>(5.5);
  const [isRotating, setIsRotating] = useState<boolean>(false);
  const [cameraAngle, setCameraAngle] = useState<number>(0);

  const isDark = theme === 'dark';
  const palette = getPaletteDef(colorPalette);

  const nComponents = pcaResult.nComponents;
  const varX = ((pcaResult.explainedVariance[pcX] || 0) * 100).toFixed(1);
  const varY = ((pcaResult.explainedVariance[pcY] || 0) * 100).toFixed(1);
  const varZ = ((pcaResult.explainedVariance[pcZ] || 0) * 100).toFixed(1);
  const displayedVariance = (
    ((pcaResult.explainedVariance[pcX] || 0) +
      (pcaResult.explainedVariance[pcY] || 0) +
      (pcaResult.explainedVariance[pcZ] || 0)) *
    100
  ).toFixed(1);

  // Auto-rotation loop
  useEffect(() => {
    let animId: number;
    if (isRotating) {
      const step = () => {
        setCameraAngle(prev => (prev + 0.02) % (2 * Math.PI));
        animId = requestAnimationFrame(step);
      };
      animId = requestAnimationFrame(step);
    }
    return () => cancelAnimationFrame(animId);
  }, [isRotating]);

  // Compute camera eye position based on angle or presets
  const cameraEye = useMemo(() => {
    if (isRotating) {
      const r = 2.0;
      return {
        x: r * Math.cos(cameraAngle),
        y: r * Math.sin(cameraAngle),
        z: 1.2
      };
    }
    return { x: 1.55, y: 1.55, z: 1.15 };
  }, [isRotating, cameraAngle]);

  const plotData = useMemo(() => {
    const traces: any[] = [];
    const points = pcaResult.transformedData;

    if (colorMode === 'density') {
      const densities = points.map(p => {
        const x = p.coords[pcX] || 0;
        const y = p.coords[pcY] || 0;
        const z = p.coords[pcZ] || 0;
        return Math.exp(-0.12 * (x * x + y * y + z * z));
      });

      traces.push({
        x: points.map(p => p.coords[pcX] || 0),
        y: points.map(p => p.coords[pcY] || 0),
        z: points.map(p => p.coords[pcZ] || 0),
        mode: 'markers',
        type: 'scatter3d',
        name: 'Samples',
        text: points.map(p => `Sample #${p.id}<br>Class: ${p.label}<br>PC${pcX + 1}: ${(p.coords[pcX] || 0).toFixed(2)}<br>PC${pcY + 1}: ${(p.coords[pcY] || 0).toFixed(2)}<br>PC${pcZ + 1}: ${(p.coords[pcZ] || 0).toFixed(2)}`),
        hoverinfo: 'text',
        marker: {
          size: pointSize,
          color: densities,
          colorscale: palette.densityScale,
          showscale: true,
          colorbar: {
            title: { text: 'Density', font: { size: 10, color: isDark ? '#ffffff' : '#000000' } },
            thickness: 10,
            len: 0.7
          },
          opacity: 0.9,
          line: { width: 0.8, color: '#ffffff' }
        }
      });
    } else if (colorMode === 'dbscan' && dbscanResult) {
      const clusterMap: Record<number, { x: number[]; y: number[]; z: number[]; text: number[]; names: string[] }> = {};

      points.forEach((p, idx) => {
        const clusterId = dbscanResult.labels[idx] ?? -1;
        if (!clusterMap[clusterId]) {
          clusterMap[clusterId] = { x: [], y: [], z: [], text: [], names: [] };
        }
        clusterMap[clusterId].x.push(p.coords[pcX] || 0);
        clusterMap[clusterId].y.push(p.coords[pcY] || 0);
        clusterMap[clusterId].z.push(p.coords[pcZ] || 0);
        clusterMap[clusterId].text.push(p.id);
        clusterMap[clusterId].names.push(p.label);
      });

      const centroidXs: number[] = [];
      const centroidYs: number[] = [];
      const centroidZs: number[] = [];
      const centroidColors: string[] = [];
      const centroidTexts: string[] = [];

      dbscanResult.clusterStats.forEach(stat => {
        const group = clusterMap[stat.id];
        if (!group) return;

        const color = palette.clusterColors[stat.id] || stat.color;

        // Calculate 3D centroid
        if (stat.id !== -1 && group.x.length > 0) {
          const meanX = group.x.reduce((a, b) => a + b, 0) / group.x.length;
          const meanY = group.y.reduce((a, b) => a + b, 0) / group.y.length;
          const meanZ = group.z.reduce((a, b) => a + b, 0) / group.z.length;
          centroidXs.push(meanX);
          centroidYs.push(meanY);
          centroidZs.push(meanZ);
          centroidColors.push(color);
          centroidTexts.push(`Centroid: ${stat.name} (n=${group.x.length})`);

          // 3D Cluster Envelope (Translucent glowing sphere beacon)
          if (showClusterEnvelopes && group.x.length > 10) {
            traces.push({
              x: [meanX],
              y: [meanY],
              z: [meanZ],
              mode: 'markers',
              type: 'scatter3d',
              name: `${stat.name} Halo`,
              marker: {
                size: 26,
                color,
                opacity: 0.18,
                symbol: 'circle'
              },
              hoverinfo: 'none',
              showlegend: false
            });
          }
        }

        // Scatter points
        traces.push({
          x: group.x,
          y: group.y,
          z: group.z,
          mode: 'markers',
          type: 'scatter3d',
          name: stat.name,
          text: group.names.map((name, i) => `Sample #${group.text[i]}<br>Class: ${name}<br>Status: ${stat.name}`),
          hoverinfo: 'text',
          marker: {
            size: stat.id === -1 ? pointSize * 0.75 : pointSize,
            color,
            opacity: stat.id === -1 ? 0.4 : 0.9,
            symbol: stat.id === -1 ? 'diamond' : 'circle',
            line: {
              width: stat.id === -1 ? 0.8 : 0.8,
              color: stat.id === -1 ? (isDark ? '#94a3b8' : '#64748b') : '#ffffff'
            }
          }
        });
      });

      // Centroids
      if (showCentroids && centroidXs.length > 0) {
        traces.push({
          x: centroidXs,
          y: centroidYs,
          z: centroidZs,
          mode: 'markers+text',
          type: 'scatter3d',
          name: 'Cluster Centroids',
          text: centroidTexts.map((_, i) => `C${i + 1}`),
          textposition: 'top center',
          textfont: { color: isDark ? '#ffffff' : '#0f172a', size: 12, weight: 'bold' },
          marker: {
            size: 10,
            color: centroidColors,
            symbol: 'diamond',
            line: { width: 2, color: isDark ? '#ffffff' : '#0f172a' },
            opacity: 1
          },
          hoverinfo: 'text'
        });
      }
    } else {
      const labelMap: Record<string, { x: number[]; y: number[]; z: number[]; text: number[] }> = {};
      points.forEach(p => {
        const lbl = p.label || 'Unknown';
        if (!labelMap[lbl]) {
          labelMap[lbl] = { x: [], y: [], z: [], text: [] };
        }
        labelMap[lbl].x.push(p.coords[pcX] || 0);
        labelMap[lbl].y.push(p.coords[pcY] || 0);
        labelMap[lbl].z.push(p.coords[pcZ] || 0);
        labelMap[lbl].text.push(p.id);
      });

      let cIdx = 0;
      Object.keys(labelMap).forEach(lbl => {
        const group = labelMap[lbl];
        const color = palette.labelColors[cIdx % palette.labelColors.length];

        traces.push({
          x: group.x,
          y: group.y,
          z: group.z,
          mode: 'markers',
          type: 'scatter3d',
          name: lbl,
          text: group.text.map(id => `Sample #${id}<br>Class: ${lbl}`),
          hoverinfo: 'text',
          marker: {
            size: pointSize,
            color,
            opacity: 0.9,
            line: { width: 0.8, color: '#ffffff' }
          }
        });
        cIdx++;
      });
    }

    // 3D Biplot vectors
    if (show3DBiplot && pcaResult.loadings.length > 0) {
      const allX = points.map(p => p.coords[pcX] || 0);
      const maxCoord = Math.max(...allX.map(Math.abs), 1);
      const topLoadings = [...pcaResult.loadings]
        .sort((a, b) => b.importance - a.importance)
        .slice(0, 5);

      const maxLoading = Math.max(
        ...topLoadings.map(l =>
          Math.hypot(l.vector[pcX] || 0, l.vector[pcY] || 0, l.vector[pcZ] || 0)
        ),
        0.001
      );
      const scaleFactor = (maxCoord * 0.8) / maxLoading;

      topLoadings.forEach((l, idx) => {
        const vx = (l.vector[pcX] || 0) * scaleFactor;
        const vy = (l.vector[pcY] || 0) * scaleFactor;
        const vz = (l.vector[pcZ] || 0) * scaleFactor;

        const rayColor = ['#ff007f', '#00f5d4', '#ffb703', '#8b5cf6', '#38bdf8'][idx % 5];

        traces.push({
          x: [0, vx],
          y: [0, vy],
          z: [0, vz],
          mode: 'lines+text',
          type: 'scatter3d',
          name: `3D Ray: ${l.feature}`,
          text: ['', l.feature],
          textposition: 'top right',
          textfont: { color: rayColor, size: 11, weight: 'bold' },
          line: { color: rayColor, width: 6 },
          hoverinfo: 'text'
        });
      });
    }

    return traces;
  }, [
    pcaResult,
    dbscanResult,
    pcX,
    pcY,
    pcZ,
    colorMode,
    showCentroids,
    show3DBiplot,
    showClusterEnvelopes,
    pointSize,
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
            3D PCA Projection
          </h2>
          <span
            title="WebGL high-performance 3D projection along PCX, PCY, and PCZ. Fully rotatable with cluster halos, 3D centroids, and biplot rays."
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
              { id: 'density', label: 'Density' }
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
                        ? 'linear-gradient(135deg, #ff007f 0%, #8b5cf6 100%)'
                        : '#ffffff'
                      : 'transparent',
                    color: active ? '#ffffff' : isDark ? '#94a3b8' : '#64748b',
                    fontWeight: active ? 800 : 600,
                    cursor: 'pointer',
                    boxShadow: active ? '0 2px 6px rgba(0,0,0,0.15)' : 'none'
                  }}
                >
                  {m.label}
                </button>
              );
            })}
          </div>

          <div
            className="pulse-badge"
            style={{
              fontSize: 12,
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              color: isDark ? '#ff007f' : '#0284c7',
              background: isDark ? 'rgba(255, 0, 127, 0.12)' : '#e0f2fe',
              padding: '4px 10px',
              borderRadius: 20,
              border: `1px solid ${isDark ? 'rgba(255, 0, 127, 0.35)' : '#bae6fd'}`
            }}
          >
            3D Variance: {displayedVariance}%
          </div>
        </div>
      </div>

      {/* Toolbar */}
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
        {/* XYZ axis selects */}
        {allowAxisSelection && <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontWeight: 700, color: isDark ? '#94a3b8' : '#475569' }}>X</span>
            <select
              value={pcX}
              onChange={e => setPcX(Number(e.target.value))}
              style={{
                padding: '3px 6px',
                borderRadius: 6,
                border: `1px solid ${isDark ? 'var(--border-card)' : '#cbd5e1'}`,
                background: isDark ? 'var(--bg-input)' : '#ffffff',
                color: isDark ? '#f8fafc' : '#0f172a',
                fontSize: 12,
                fontWeight: 700
              }}
            >
              {Array.from({ length: nComponents }, (_, i) => (
                <option key={i} value={i}>PC{i + 1} ({((pcaResult.explainedVariance[i] || 0) * 100).toFixed(0)}%)</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontWeight: 700, color: isDark ? '#94a3b8' : '#475569' }}>Y</span>
            <select
              value={pcY}
              onChange={e => setPcY(Number(e.target.value))}
              style={{
                padding: '3px 6px',
                borderRadius: 6,
                border: `1px solid ${isDark ? 'var(--border-card)' : '#cbd5e1'}`,
                background: isDark ? 'var(--bg-input)' : '#ffffff',
                color: isDark ? '#f8fafc' : '#0f172a',
                fontSize: 12,
                fontWeight: 700
              }}
            >
              {Array.from({ length: nComponents }, (_, i) => (
                <option key={i} value={i}>PC{i + 1} ({((pcaResult.explainedVariance[i] || 0) * 100).toFixed(0)}%)</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontWeight: 700, color: isDark ? '#94a3b8' : '#475569' }}>Z</span>
            <select
              value={pcZ}
              onChange={e => setPcZ(Number(e.target.value))}
              style={{
                padding: '3px 6px',
                borderRadius: 6,
                border: `1px solid ${isDark ? 'var(--border-card)' : '#cbd5e1'}`,
                background: isDark ? 'var(--bg-input)' : '#ffffff',
                color: isDark ? '#f8fafc' : '#0f172a',
                fontSize: 12,
                fontWeight: 700
              }}
            >
              {Array.from({ length: nComponents }, (_, i) => (
                <option key={i} value={i}>PC{i + 1} ({((pcaResult.explainedVariance[i] || 0) * 100).toFixed(0)}%)</option>
              ))}
            </select>
          </div>
        </div>}

        {/* Action buttons: Orbit toggle, Halo, Centroids */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Continuous auto-orbit button */}
          <button
            onClick={() => setIsRotating(r => !r)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 10px',
              borderRadius: 6,
              border: `1px solid ${isRotating ? '#00f5d4' : isDark ? 'rgba(255,255,255,0.1)' : '#cbd5e1'}`,
              background: isRotating
                ? 'linear-gradient(135deg, rgba(0,245,212,0.2) 0%, rgba(255,0,127,0.2) 100%)'
                : isDark ? 'rgba(30,41,59,0.6)' : '#ffffff',
              color: isRotating ? '#00f5d4' : isDark ? '#f8fafc' : '#0f172a',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {isRotating ? <Pause size={12} /> : <Play size={12} />}
            {isRotating ? 'Pause Orbit' : 'Auto Orbit'}
          </button>

          <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 11, fontWeight: 600, color: isDark ? '#cbd5e1' : '#334155' }}>
            <input
              type="checkbox"
              checked={showClusterEnvelopes}
              onChange={e => setShowClusterEnvelopes(e.target.checked)}
              style={{ accentColor: '#ff007f' }}
            />
            <span>3D Halos</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 11, fontWeight: 600, color: isDark ? '#cbd5e1' : '#334155' }}>
            <input
              type="checkbox"
              checked={show3DBiplot}
              onChange={e => setShow3DBiplot(e.target.checked)}
              style={{ accentColor: '#00f5d4' }}
            />
            <span>3D Rays</span>
          </label>

          {/* Point size slider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b' }}>Size</span>
            <input
              type="range"
              min="3"
              max="10"
              step="0.5"
              value={pointSize}
              onChange={e => setPointSize(Number(e.target.value))}
              style={{ width: 50 }}
            />
          </div>
        </div>
      </div>

      {/* 3D WebGL Canvas */}
      <div style={{ minHeight: 680, width: '100%', position: 'relative' }}>
        <Plot
          data={plotData}
          layout={{
            autosize: true,
            height: 680,
            margin: { l: 0, r: 0, t: 0, b: 0 },
            paper_bgcolor: 'transparent',
            scene: {
              camera: { eye: cameraEye },
              xaxis: {
                title: { text: `PC${pcX + 1} (${varX}%)`, font: { size: 11, color: isDark ? '#f8fafc' : '#0f172a' } },
                backgroundcolor: isDark ? 'rgba(9, 14, 26, 0.7)' : '#f8fafc',
                gridcolor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
                showbackground: true,
                zerolinecolor: isDark ? 'rgba(0, 245, 212, 0.4)' : '#94a3b8'
              },
              yaxis: {
                title: { text: `PC${pcY + 1} (${varY}%)`, font: { size: 11, color: isDark ? '#f8fafc' : '#0f172a' } },
                backgroundcolor: isDark ? 'rgba(9, 14, 26, 0.7)' : '#f8fafc',
                gridcolor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
                showbackground: true,
                zerolinecolor: isDark ? 'rgba(0, 245, 212, 0.4)' : '#94a3b8'
              },
              zaxis: {
                title: { text: `PC${pcZ + 1} (${varZ}%)`, font: { size: 11, color: isDark ? '#f8fafc' : '#0f172a' } },
                backgroundcolor: isDark ? 'rgba(13, 19, 33, 0.8)' : '#f1f5f9',
                gridcolor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
                showbackground: true,
                zerolinecolor: isDark ? 'rgba(0, 245, 212, 0.4)' : '#94a3b8'
              }
            },
            legend: {
              orientation: 'v',
              x: 0.82,
              y: 0.95,
              bgcolor: isDark ? 'rgba(9, 14, 26, 0.85)' : 'rgba(255, 255, 255, 0.85)',
              bordercolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
              borderwidth: 1,
              font: { size: 11, color: isDark ? '#f8fafc' : '#0f172a' }
            }
          }}
          useResizeHandler={true}
          style={{ width: '100%', height: '100%' }}
          config={{
            displayModeBar: true,
            displaylogo: false,
            responsive: true
          }}
        />
      </div>
    </div>
  );
};
