import React, { useMemo, useState } from 'react';
import Plot from 'react-plotly.js';
import { Info, HelpCircle, BarChart3, Radio } from 'lucide-react';
import { PCAResult, ThemeMode, ColorPalette } from '../types/pca';
import { getPaletteDef } from '../utils/colors';

interface FeatureRadarStudioProps {
  pcaResult: PCAResult;
  theme?: ThemeMode;
  colorPalette?: ColorPalette;
}

export const FeatureRadarStudio: React.FC<FeatureRadarStudioProps> = ({
  pcaResult,
  theme = 'dark',
  colorPalette = 'cyber'
}) => {
  const isDark = theme === 'dark';
  const palette = getPaletteDef(colorPalette);

  const [topCount, setTopCount] = useState<number>(8);
  const [selectedPC, setSelectedPC] = useState<number>(0);

  // Ranked features by overall importance
  const sortedLoadings = useMemo(() => {
    return [...pcaResult.loadings].sort((a, b) => b.importance - a.importance);
  }, [pcaResult]);

  const topFeatures = sortedLoadings.slice(0, topCount);

  // Radar plot data: Each top feature has an r-profile across PC1..PC4
  const radarData = useMemo(() => {
    const pcAxes = ['PC1', 'PC2', 'PC3', 'PC4', 'PC1']; // Close loop
    const traces: any[] = [];

    topFeatures.slice(0, 6).forEach((feat, idx) => {
      const rVals = [
        Math.abs(feat.vector[0] || 0),
        Math.abs(feat.vector[1] || 0),
        Math.abs(feat.vector[2] || 0),
        Math.abs(feat.vector[3] || 0),
        Math.abs(feat.vector[0] || 0)
      ];

      const col = palette.labelColors[idx % palette.labelColors.length];

      traces.push({
        type: 'scatterpolar',
        r: rVals,
        theta: pcAxes,
        fill: 'toself',
        name: feat.feature,
        line: { color: col, width: 2 },
        fillcolor: `${col}22`,
        marker: { size: 6, color: col }
      });
    });

    return traces;
  }, [topFeatures, palette]);

  // Ranked horizontal bar chart for Selected PC
  const barData = useMemo(() => {
    const rankedForPC = [...pcaResult.loadings]
      .map(l => ({
        feature: l.feature,
        val: l.vector[selectedPC] || 0,
        absVal: Math.abs(l.vector[selectedPC] || 0)
      }))
      .sort((a, b) => a.absVal - b.absVal)
      .slice(-10);

    const colors = rankedForPC.map(item =>
      item.val >= 0 ? '#00f5d4' : '#ff007f'
    );

    return [
      {
        type: 'bar',
        y: rankedForPC.map(d => d.feature),
        x: rankedForPC.map(d => Number(d.val.toFixed(3))),
        orientation: 'h',
        marker: {
          color: colors,
          line: { width: 1, color: isDark ? '#ffffff' : '#0f172a' }
        },
        text: rankedForPC.map(d => d.val.toFixed(2)),
        textposition: 'auto',
        hoverinfo: 'x+y'
      }
    ];
  }, [pcaResult, selectedPC, isDark]);

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
        gap: 18
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            Feature Signatures & Radar Decomposition
            <Info size={15} color={isDark ? '#94a3b8' : '#64748b'} style={{ cursor: 'pointer' }} />
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: isDark ? '#94a3b8' : '#64748b' }}>
            Multivariate polar fingerprint comparison across principal components, accompanied by directional feature weight rankings.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: isDark ? '#cbd5e1' : '#475569' }}>
            PC Target:
          </span>
          <select
            value={selectedPC}
            onChange={e => setSelectedPC(Number(e.target.value))}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              background: isDark ? 'var(--bg-input)' : '#ffffff',
              color: isDark ? '#f8fafc' : '#0f172a',
              border: `1px solid ${isDark ? 'var(--border-card)' : '#cbd5e1'}`,
              fontSize: 12,
              fontWeight: 700
            }}
          >
            {Array.from({ length: Math.min(6, pcaResult.nComponents) }, (_, i) => (
              <option key={i} value={i}>
                PC{i + 1} ({((pcaResult.explainedVariance[i] || 0) * 100).toFixed(1)}%)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid: Radar on left, Ranked Bar chart on right */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 20 }}>
        {/* 1. Radar Polar Spider Plot */}
        <div style={{
          background: isDark ? 'rgba(9, 14, 26, 0.7)' : '#f8fafc',
          borderRadius: 12,
          padding: '16px 18px',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}`,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: isDark ? '#f8fafc' : '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Radio size={14} color="#00f5d4" />
              Polar Component Fingerprints (PC1–PC4)
            </h4>
            <span style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b' }}>Top 6 Features</span>
          </div>

          <div style={{ minHeight: 360, width: '100%' }}>
            <Plot
              data={radarData}
              layout={{
                autosize: true,
                margin: { l: 40, r: 40, t: 25, b: 25 },
                paper_bgcolor: 'transparent',
                polar: {
                  bgcolor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#ffffff',
                  radialaxis: {
                    visible: true,
                    range: [0, 0.6],
                    tickfont: { size: 9, color: isDark ? '#94a3b8' : '#64748b' },
                    gridcolor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'
                  },
                  angularaxis: {
                    tickfont: { size: 11, color: isDark ? '#00f5d4' : '#0284c7', weight: 'bold' },
                    gridcolor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'
                  }
                },
                legend: {
                  orientation: 'h',
                  x: 0,
                  y: -0.15,
                  font: { size: 10, color: isDark ? '#f8fafc' : '#0f172a' }
                }
              }}
              useResizeHandler={true}
              style={{ width: '100%', height: '100%' }}
              config={{ displayModeBar: false, responsive: true }}
            />
          </div>
        </div>

        {/* 2. Ranked Directional Weights */}
        <div style={{
          background: isDark ? 'rgba(9, 14, 26, 0.7)' : '#f8fafc',
          borderRadius: 12,
          padding: '16px 18px',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}`,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: isDark ? '#f8fafc' : '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <BarChart3 size={14} color="#ff007f" />
              Top Feature Weights on PC{selectedPC + 1}
            </h4>
            <span style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b' }}>
              Green: Positive | Pink: Negative
            </span>
          </div>

          <div style={{ minHeight: 360, width: '100%' }}>
            <Plot
              data={barData}
              layout={{
                autosize: true,
                margin: { l: 85, r: 25, t: 15, b: 35 },
                paper_bgcolor: 'transparent',
                plot_bgcolor: isDark ? '#090e1a' : '#fafafa',
                xaxis: {
                  title: { text: `Loading on PC${selectedPC + 1}`, font: { size: 11, color: isDark ? '#94a3b8' : '#64748b' } },
                  gridcolor: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                  zerolinecolor: isDark ? '#ffffff' : '#0f172a',
                  zerolinewidth: 1.5,
                  tickfont: { size: 10, color: isDark ? '#94a3b8' : '#64748b' }
                },
                yaxis: {
                  tickfont: { size: 11, color: isDark ? '#f8fafc' : '#0f172a', weight: 'bold' }
                }
              }}
              useResizeHandler={true}
              style={{ width: '100%', height: '100%' }}
              config={{ displayModeBar: false, responsive: true }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
