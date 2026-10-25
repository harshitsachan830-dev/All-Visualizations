import React from 'react';
import Plot from 'react-plotly.js';
import { Info } from 'lucide-react';
import { PCAResult, ThemeMode } from '../types/pca';

interface ExplainedVariancePlotProps {
  pcaResult: PCAResult;
  theme?: ThemeMode;
}

export const ExplainedVariancePlot: React.FC<ExplainedVariancePlotProps> = ({
  pcaResult,
  theme = 'dark'
}) => {
  const isDark = theme === 'dark';
  const maxK = Math.min(10, pcaResult.nComponents);
  const xLabels = Array.from({ length: maxK }, (_, i) => `PC${i + 1}`);
  const individualVariance = pcaResult.explainedVariance.slice(0, maxK).map(v => Number((v * 100).toFixed(1)));
  const cumulativeVariance = pcaResult.cumulativeVariance.slice(0, maxK).map(v => Number((v * 100).toFixed(1)));

  // Vibrant gradient colors for each bar
  const barColors = [
    '#00f5d4', '#06b6d4', '#0ea5e9', '#38bdf8', '#3b82f6',
    '#6366f1', '#818cf8', '#a855f7', '#c084fc', '#e879f9'
  ];

  const barTrace = {
    x: xLabels,
    y: individualVariance,
    name: 'Individual PC Variance',
    type: 'bar',
    marker: {
      color: barColors.slice(0, maxK),
      line: { color: isDark ? '#ffffff' : '#0284c7', width: 0.8 }
    },
    hoverinfo: 'x+y',
    hovertemplate: '%{x}: %{y}% variance<extra></extra>'
  };

  const lineTrace = {
    x: xLabels,
    y: cumulativeVariance,
    name: 'Cumulative % (right axis)',
    type: 'scatter',
    mode: 'lines+markers',
    yaxis: 'y2',
    line: { color: '#fb923c', width: 3 },
    marker: { size: 7, color: '#f97316', symbol: 'diamond' },
    hoverinfo: 'x+y',
    hovertemplate: 'Cumulative: %{y}%<extra></extra>'
  };

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
          Explained variance & scree
          <Info size={14} color="#64748b" style={{ cursor: 'pointer' }} />
        </h3>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#fb923c' }}>
          90% Target Band
        </span>
      </div>

      <div style={{ flex: 1, minHeight: 220, width: '100%' }}>
        <Plot
          data={[barTrace, lineTrace]}
          layout={{
            autosize: true,
            margin: { l: 40, r: 40, t: 15, b: 35 },
            paper_bgcolor: 'transparent',
            plot_bgcolor: isDark ? '#0b1120' : '#fafafa',
            xaxis: {
              title: { text: 'Principal component', font: { size: 11, color: isDark ? '#cbd5e1' : '#64748b' } },
              gridcolor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9'
            },
            yaxis: {
              title: { text: 'Explained (%)', font: { size: 10, color: isDark ? '#cbd5e1' : '#64748b' } },
              gridcolor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9',
              range: [0, Math.max(...individualVariance, 30) * 1.25]
            },
            yaxis2: {
              title: { text: 'Cumulative (%)', font: { size: 10, color: '#fb923c' } },
              overlaying: 'y',
              side: 'right',
              range: [0, 105],
              showgrid: false
            },
            legend: {
              orientation: 'h',
              x: 0.05,
              y: 1.18,
              font: { size: 10, color: isDark ? '#cbd5e1' : '#475569' }
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
