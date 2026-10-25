import React, { useMemo, useState, useEffect, useRef } from 'react';
import Plot from 'react-plotly.js';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { PCAResult, DBSCANResult, ThemeMode, ColorPalette } from '../types/pca';
import { getPaletteDef } from '../utils/colors';

interface EnhancedPCA3DSpaceProps {
  pcaResult: PCAResult;
  dbscanResult: DBSCANResult | null;
  theme?: ThemeMode;
  colorPalette?: ColorPalette;
}

const VIEW_PRESETS: Record<string, { x: number; y: number; z: number }> = {
  iso:   { x: 1.25,  y: 1.25,  z: 0.8 },
  top:   { x: 0.001, y: 0.001, z: 1.5 },
  side:  { x: 0.001, y: 1.5,   z: 0.2 },
  front: { x: 1.5,   y: 0.001, z: 0.2 }
};

export const EnhancedPCA3DSpace: React.FC<EnhancedPCA3DSpaceProps> = ({
  pcaResult,
  dbscanResult,
  theme = 'dark',
  colorPalette = 'cyber'
}) => {
  // Axes
  const [pcX, setPcX] = useState(0);
  const [pcY, setPcY] = useState(1);
  const [pcZ, setPcZ] = useState(2);

  // Controls
  const [autoOrbit, setAutoOrbit]       = useState(true);
  const [orbitSpeed, setOrbitSpeed]     = useState(0.8);
  const [cameraDist, setCameraDist]     = useState(1.0);
  const [showAxLines, setShowAxLines]   = useState(true);
  const [showLoadings, setShowLoadings] = useState(true);
  const [showGrid, setShowGrid]         = useState(true);
  const [pointSize, setPointSize]       = useState(4.5);
  const [colorMode, setColorMode]       = useState<'dbscan' | 'label'>('dbscan');
  const [activePreset, setActivePreset] = useState('iso');

  // Camera orbit
  const [cameraAngle, setCameraAngle] = useState(0);
  const angleRef   = useRef(0);
  const orbitTimer = useRef<number | null>(null);

  const isDark = theme === 'dark';
  const palette = getPaletteDef(colorPalette);

  const nComponents = pcaResult.nComponents;
  const varX = ((pcaResult.explainedVariance[pcX] || 0) * 100).toFixed(1);
  const varY = ((pcaResult.explainedVariance[pcY] || 0) * 100).toFixed(1);
  const varZ = ((pcaResult.explainedVariance[pcZ] || 0) * 100).toFixed(1);

  /* ── Auto-orbit ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (orbitTimer.current) clearInterval(orbitTimer.current);
    if (autoOrbit && activePreset === 'iso') {
      orbitTimer.current = window.setInterval(() => {
        angleRef.current += 0.006 * orbitSpeed;
        setCameraAngle(angleRef.current);
      }, 50);
    }
    return () => { if (orbitTimer.current) clearInterval(orbitTimer.current); };
  }, [autoOrbit, orbitSpeed, activePreset]);

  const camera = useMemo(() => {
    if (activePreset !== 'iso') {
      const p = VIEW_PRESETS[activePreset];
      return {
        eye: { x: p.x * cameraDist, y: p.y * cameraDist, z: p.z * cameraDist },
        center: { x: 0, y: 0, z: 0 },
        up: { x: 0, y: 0, z: 1 }
      };
    }
    const r = 1.35 * cameraDist;
    return {
      eye: { x: r * Math.cos(cameraAngle), y: r * Math.sin(cameraAngle), z: 0.82 * cameraDist },
      center: { x: 0, y: 0, z: 0 },
      up: { x: 0, y: 0, z: 1 }
    };
  }, [cameraAngle, activePreset, cameraDist]);

  /* ── Point colours ──────────────────────────────────────────────────────── */
  const pointColors = useMemo(() => {
    const cols = palette.labelColors;
    if (colorMode === 'dbscan' && dbscanResult) {
      return dbscanResult.labels.map(l =>
        l === -1 ? 'rgba(148,163,184,0.35)' : cols[l % cols.length]
      );
    }
    const map = new Map<string, number>();
    let idx = 0;
    return pcaResult.transformedData.map(pt => {
      if (!map.has(pt.label)) map.set(pt.label, idx++);
      return cols[(map.get(pt.label) || 0) % cols.length];
    });
  }, [colorMode, dbscanResult, pcaResult.transformedData, palette.labelColors]);

  /* ── Plotly traces ──────────────────────────────────────────────────────── */
  const traces = useMemo(() => {
    const result: any[] = [];
    const td = pcaResult.transformedData;
    const xs = td.map(pt => pt.coords[pcX] ?? 0);
    const ys = td.map(pt => pt.coords[pcY] ?? 0);
    const zs = td.map(pt => pt.coords[pcZ] ?? 0);
    const allAbs = [...xs, ...ys, ...zs].map(Math.abs);
    const maxAbs = Math.max(...allAbs, 1);
    const axLen  = maxAbs * 1.08;

    /* Axis lines through origin */
    if (showAxLines) {
      const axDefs = [
        { from: [-axLen, 0, 0], to: [axLen, 0, 0], color: '#00f5d4', lbl: `PC${pcX + 1}` },
        { from: [0, -axLen, 0], to: [0, axLen, 0], color: '#ff2d9b', lbl: `PC${pcY + 1}` },
        { from: [0, 0, -axLen], to: [0, 0, axLen], color: '#ffd600', lbl: `PC${pcZ + 1}` }
      ];
      for (const ax of axDefs) {
        result.push({
          type: 'scatter3d', mode: 'lines',
          showlegend: false,
          x: [ax.from[0], ax.to[0]],
          y: [ax.from[1], ax.to[1]],
          z: [ax.from[2], ax.to[2]],
          line: { color: ax.color, width: 2 },
          opacity: 0.45,
          hoverinfo: 'none',
          name: ax.lbl + ' axis'
        });
        // Axis tip label
        result.push({
          type: 'scatter3d', mode: 'text',
          showlegend: false,
          x: [ax.to[0] * 1.05], y: [ax.to[1] * 1.05], z: [ax.to[2] * 1.05],
          text: [ax.lbl],
          textfont: { color: ax.color, size: 12, family: 'Outfit, system-ui' },
          hoverinfo: 'none'
        });
      }
    }

    /* Scatter samples */
    result.push({
      type: 'scatter3d', mode: 'markers',
      name: 'Samples',
      x: xs, y: ys, z: zs,
      text: td.map(pt => pt.label),
      hovertemplate:
        `<b>%{text}</b><br>PC${pcX + 1}: %{x:.2f}<br>PC${pcY + 1}: %{y:.2f}<br>PC${pcZ + 1}: %{z:.2f}<extra></extra>`,
      marker: {
        size: pointSize,
        color: pointColors,
        opacity: 0.88,
        line: { color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)', width: 0.4 }
      }
    });

    /* Top-5 biplot loadings */
    if (showLoadings && pcaResult.loadings.length > 0) {
      const mags = pcaResult.loadings.map(row =>
        Math.sqrt((row.vector[pcX] || 0) ** 2 + (row.vector[pcY] || 0) ** 2 + (row.vector[pcZ] || 0) ** 2)
      );
      const top5 = mags
        .map((m, i) => ({ m, i }))
        .sort((a, b) => b.m - a.m)
        .slice(0, 5);
      const scale = axLen * 0.72;
      const arrowCols = ['#00f5d4', '#ff2d9b', '#ffd600', '#7c4dff', '#ff6d00'];

      for (let rank = 0; rank < top5.length; rank++) {
        const { i } = top5[rank];
        const lx = (pcaResult.loadings[i].vector[pcX] || 0) * scale;
        const ly = (pcaResult.loadings[i].vector[pcY] || 0) * scale;
        const lz = (pcaResult.loadings[i].vector[pcZ] || 0) * scale;
        const col = arrowCols[rank % arrowCols.length];
        result.push({
          type: 'scatter3d', mode: 'lines+text',
          showlegend: false,
          x: [0, lx], y: [0, ly], z: [0, lz],
          text: ['', pcaResult.featureNames[i]],
          textposition: 'top center',
          textfont: { color: col, size: 11, family: 'Outfit, system-ui' },
          line: { color: col, width: 2 },
          hoverinfo: 'text',
          hovertext: pcaResult.featureNames[i],
          name: pcaResult.featureNames[i]
        });
      }
    }

    return result;
  }, [pcaResult, pcX, pcY, pcZ, pointColors, showAxLines, showLoadings, pointSize]);

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div
      className="glass-panel"
      style={{
        background: isDark ? '#040810' : '#f8faff',
        borderRadius: 16,
        border: `1px solid ${isDark ? 'rgba(0,245,212,0.18)' : '#e2e8f0'}`,
        padding: '18px 20px',
        boxShadow: isDark
          ? '0 0 60px rgba(0,245,212,0.06), 0 8px 32px rgba(0,0,0,0.5)'
          : 'var(--card-shadow)',
        display: 'flex', flexDirection: 'column', gap: 14
      }}
    >
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, fontSize: 20,
            background: 'linear-gradient(135deg, rgba(0,245,212,0.2), rgba(0,132,255,0.2))',
            border: '1px solid rgba(0,245,212,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>⊕</div>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: isDark ? '#f1f5f9' : '#0f172a', margin: 0 }}>
              3D Space &amp; Auto-Orbit
            </h2>
            <p style={{ fontSize: 11, color: isDark ? '#64748b' : '#94a3b8', margin: 0 }}>
              Principal-axis lines &amp; biplot vectors — rotate, zoom, and inspect
            </p>
          </div>
        </div>

        {/* Variance chips */}
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { lbl: `PC${pcX + 1}: ${varX}%`, color: '#00f5d4' },
            { lbl: `PC${pcY + 1}: ${varY}%`, color: '#ff2d9b' },
            { lbl: `PC${pcZ + 1}: ${varZ}%`, color: '#ffd600' }
          ].map(c => (
            <span key={c.lbl} style={{
              fontSize: 12, fontWeight: 800, fontFamily: 'var(--font-mono)',
              padding: '5px 12px', borderRadius: 20,
              background: `${c.color}18`, border: `1px solid ${c.color}55`,
              color: c.color
            }}>{c.lbl}</span>
          ))}
        </div>
      </div>

      {/* ── Controls toolbar ── */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center',
        padding: '10px 14px', borderRadius: 12,
        background: isDark ? 'rgba(22,33,56,0.5)' : 'rgba(241,245,249,0.8)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}`
      }}>
        {/* Orbit toggle */}
        <button
          onClick={() => { setAutoOrbit(a => !a); if (!autoOrbit) setActivePreset('iso'); }}
          style={{
            padding: '6px 14px', borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: 'pointer',
            border: `1px solid ${autoOrbit ? '#00f5d4' : 'rgba(255,255,255,0.15)'}`,
            background: autoOrbit ? 'rgba(0,245,212,0.14)' : 'transparent',
            color: autoOrbit ? '#00f5d4' : isDark ? '#64748b' : '#94a3b8',
            display: 'flex', alignItems: 'center', gap: 6,
            boxShadow: autoOrbit ? '0 0 12px rgba(0,245,212,0.18)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          {autoOrbit ? <Pause size={13} /> : <Play size={13} />}
          {autoOrbit ? 'PAUSE AUTO-ROTATE' : 'AUTO-ROTATE'}
        </button>

        {autoOrbit && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: isDark ? '#64748b' : '#94a3b8' }}>Speed</span>
            <input
              type="range" min="0.2" max="2.5" step="0.1" value={orbitSpeed}
              onChange={e => setOrbitSpeed(Number(e.target.value))}
              style={{ width: 68, accentColor: '#00f5d4' }}
            />
            <span style={{
              fontSize: 11, fontWeight: 800, color: '#00f5d4',
              fontFamily: 'var(--font-mono)', minWidth: 28
            }}>{orbitSpeed.toFixed(1)}×</span>
          </div>
        )}

        {/* Distance / Zoom slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: isDark ? '#64748b' : '#94a3b8' }}>Distance</span>
          <input
            type="range" min="0.6" max="2.2" step="0.05" value={cameraDist}
            onChange={e => setCameraDist(Number(e.target.value))}
            style={{ width: 68, accentColor: '#00f5d4' }}
            title="Adjust camera distance to data points"
          />
          <span style={{
            fontSize: 11, fontWeight: 800, color: '#00f5d4',
            fontFamily: 'var(--font-mono)', minWidth: 28
          }}>{cameraDist.toFixed(1)}×</span>
        </div>

        <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.1)' }} />

        {/* View presets */}
        <span style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#64748b' : '#94a3b8' }}>Views:</span>
        {[
          { id: 'iso',   label: '3D Iso' },
          { id: 'top',   label: `Top (${pcX + 1}–${pcY + 1})` },
          { id: 'side',  label: `Side (${pcX + 1}–${pcZ + 1})` },
          { id: 'front', label: `Front (${pcY + 1}–${pcZ + 1})` }
        ].map(v => (
          <button
            key={v.id}
            onClick={() => { setActivePreset(v.id); if (v.id !== 'iso') setAutoOrbit(false); }}
            style={{
              padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer',
              border: `1px solid ${activePreset === v.id ? 'rgba(0,245,212,0.55)' : 'rgba(255,255,255,0.1)'}`,
              background: activePreset === v.id ? 'rgba(0,245,212,0.12)' : 'transparent',
              color: activePreset === v.id ? '#00f5d4' : isDark ? '#475569' : '#94a3b8',
              transition: 'all 0.12s'
            }}
          >{v.label}</button>
        ))}

        <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.1)' }} />

        {/* Layer toggles */}
        {([
          { key: 'axlines',  label: 'Axis Lines',  val: showAxLines,  set: setShowAxLines },
          { key: 'loadings', label: 'Loadings',    val: showLoadings, set: setShowLoadings },
          { key: 'grid',     label: 'Grid',         val: showGrid,     set: setShowGrid }
        ] as { key: string; label: string; val: boolean; set: (v: boolean) => void }[]).map(l => (
          <button
            key={l.key}
            onClick={() => l.set(!l.val)}
            style={{
              padding: '4px 10px', borderRadius: 16, fontSize: 11, fontWeight: 700, cursor: 'pointer',
              border: `1px solid ${l.val ? 'rgba(0,245,212,0.45)' : 'rgba(255,255,255,0.1)'}`,
              background: l.val ? 'rgba(0,245,212,0.1)' : 'transparent',
              color: l.val ? '#00f5d4' : isDark ? '#475569' : '#94a3b8',
              transition: 'all 0.12s'
            }}
          >{l.val ? '✓ ' : ''}{l.label}</button>
        ))}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {[{ id: 'dbscan', label: 'Clusters' }, { id: 'label', label: 'Subtypes' }].map(m => (
            <button
              key={m.id}
              onClick={() => setColorMode(m.id as any)}
              style={{
                padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                border: `1px solid ${colorMode === m.id ? 'rgba(0,245,212,0.4)' : 'rgba(255,255,255,0.1)'}`,
                background: colorMode === m.id ? 'rgba(0,245,212,0.1)' : 'transparent',
                color: colorMode === m.id ? '#00f5d4' : isDark ? '#475569' : '#94a3b8'
              }}
            >{m.label}</button>
          ))}
          <span style={{ fontSize: 11, color: isDark ? '#64748b' : '#94a3b8' }}>Pts</span>
          <input
            type="range" min="2" max="11" step="0.5" value={pointSize}
            onChange={e => setPointSize(Number(e.target.value))}
            style={{ width: 55, accentColor: '#00f5d4' }}
          />
        </div>
      </div>

      {/* ── Axis selectors ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', fontSize: 12 }}>
        {[
          { label: 'X axis', color: '#00f5d4', val: pcX, set: setPcX },
          { label: 'Y axis', color: '#ff2d9b', val: pcY, set: setPcY },
          { label: 'Z axis', color: '#ffd600', val: pcZ, set: setPcZ }
        ].map(ax => (
          <div key={ax.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 700, color: ax.color, fontSize: 11 }}>━ {ax.label}</span>
            <select
              value={ax.val}
              onChange={e => ax.set(Number(e.target.value))}
              style={{
                padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                background: isDark ? 'var(--bg-input)' : '#fff',
                color: isDark ? '#f1f5f9' : '#0f172a',
                border: `1px solid ${ax.color}55`
              }}
            >
              {Array.from({ length: nComponents }, (_, i) => (
                <option key={i} value={i}>
                  PC{i + 1} ({((pcaResult.explainedVariance[i] || 0) * 100).toFixed(0)}%)
                </option>
              ))}
            </select>
          </div>
        ))}
        <button
          onClick={() => { setPcX(0); setPcY(1); setPcZ(2); setActivePreset('iso'); setAutoOrbit(true); setCameraDist(1.0); }}
          style={{
            padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer',
            background: 'transparent', border: '1px solid rgba(255,255,255,0.12)',
            color: isDark ? '#64748b' : '#94a3b8', display: 'flex', alignItems: 'center', gap: 5
          }}
        >
          <RotateCcw size={11} /> Reset
        </button>
      </div>

      {/* ── 3D Canvas ── */}
      <div style={{ minHeight: 600, width: '100%', position: 'relative' }}>
        <Plot
          data={traces}
          layout={{
            autosize: true, height: 600,
            margin: { l: 0, r: 0, t: 0, b: 0 },
            paper_bgcolor: 'transparent',
            scene: {
              camera,
              bgcolor: isDark ? '#040810' : '#fafcff',
              xaxis: {
                title: { text: `PC${pcX + 1} (${varX}%)`, font: { color: '#00f5d4', size: 10.5, family: 'Outfit, system-ui' } },
                gridcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                backgroundcolor: isDark ? 'rgba(10,16,30,0.2)' : 'rgba(240,244,250,0.4)',
                showbackground: false,
                zeroline: true,
                zerolinecolor: isDark ? 'rgba(0,245,212,0.22)' : '#cbd5e1',
                tickfont: { color: isDark ? '#64748b' : '#94a3b8', size: 9 },
                showgrid: showGrid
              },
              yaxis: {
                title: { text: `PC${pcY + 1} (${varY}%)`, font: { color: '#ff2d9b', size: 10.5, family: 'Outfit, system-ui' } },
                gridcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                backgroundcolor: isDark ? 'rgba(10,16,30,0.2)' : 'rgba(240,244,250,0.4)',
                showbackground: false,
                zeroline: true,
                zerolinecolor: isDark ? 'rgba(255,45,155,0.22)' : '#cbd5e1',
                tickfont: { color: isDark ? '#64748b' : '#94a3b8', size: 9 },
                showgrid: showGrid
              },
              zaxis: {
                title: { text: `PC${pcZ + 1} (${varZ}%)`, font: { color: '#ffd600', size: 10.5, family: 'Outfit, system-ui' } },
                gridcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                backgroundcolor: isDark ? 'rgba(10,16,30,0.2)' : 'rgba(240,244,250,0.4)',
                showbackground: false,
                zeroline: true,
                zerolinecolor: isDark ? 'rgba(255,214,0,0.22)' : '#cbd5e1',
                tickfont: { color: isDark ? '#64748b' : '#94a3b8', size: 9 },
                showgrid: showGrid
              }
            },
            legend: {
              x: 0.82, y: 0.98,
              bgcolor: isDark ? 'rgba(4,8,16,0.88)' : 'rgba(255,255,255,0.92)',
              bordercolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)',
              borderwidth: 1,
              font: { size: 11, color: isDark ? '#f1f5f9' : '#0f172a' }
            }
          }}
          useResizeHandler={true}
          style={{ width: '100%', height: '100%' }}
          config={{ displayModeBar: true, displaylogo: false, responsive: true }}
        />

        {/* AUTO-ROTATING badge */}
        {autoOrbit && activePreset === 'iso' && (
          <div style={{
            position: 'absolute', top: 14, left: 14,
            background: 'rgba(0,245,212,0.13)', border: '1px solid rgba(0,245,212,0.45)',
            borderRadius: 20, padding: '6px 14px',
            fontSize: 11, fontWeight: 800, color: '#00f5d4',
            display: 'flex', alignItems: 'center', gap: 7,
            backdropFilter: 'blur(8px)'
          }}>
            <span style={{ fontSize: 15 }}>⟳</span>
            AUTO-ROTATING ({orbitSpeed.toFixed(1)}×)
          </div>
        )}

        {/* 3D Spatial Axes legend (bottom-left) */}
        <div style={{
          position: 'absolute', bottom: 14, left: 14,
          background: isDark ? 'rgba(4,8,16,0.88)' : 'rgba(255,255,255,0.92)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
          borderRadius: 10, padding: '8px 14px',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{
            fontSize: 9, fontWeight: 800, color: isDark ? '#475569' : '#94a3b8',
            textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6
          }}>3D Spatial Axes</div>
          {[
            { color: '#00f5d4', lbl: `PC${pcX + 1} (X-Axis): ${varX}%` },
            { color: '#ff2d9b', lbl: `PC${pcY + 1} (Y-Axis): ${varY}%` },
            { color: '#ffd600', lbl: `PC${pcZ + 1} (Z-Axis): ${varZ}%` }
          ].map(ax => (
            <div key={ax.lbl} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
              <div style={{ width: 22, height: 2.5, background: ax.color, borderRadius: 2 }} />
              <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', color: ax.color }}>
                {ax.lbl}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
