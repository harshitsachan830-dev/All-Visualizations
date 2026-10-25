import React, { useMemo, useState } from 'react';
import Plot from 'react-plotly.js';
import { Info, HelpCircle } from 'lucide-react';
import { PCAResult, ThemeMode } from '../types/pca';

interface FeatureCorrelationCircleProps {
  pcaResult: PCAResult;
  theme: ThemeMode;
}

export const FeatureCorrelationCircle: React.FC<FeatureCorrelationCircleProps> = ({
  pcaResult,
  theme
}) => {
  const [pcX, setPcX] = useState<number>(0);
  const [pcY, setPcY] = useState<number>(1);

  const isDark = theme === 'dark';

  const correlationData = useMemo(() => {
    const traces: any[] = [];

    // 1. Outer Unit Circle (Radius 1.0)
    const circleSteps = 100;
    const unitX: number[] = [];
    const unitY: number[] = [];
    const halfX: number[] = [];
    const halfY: number[] = [];

    for (let i = 0; i <= circleSteps; i++) {
      const t = (i / circleSteps) * 2 * Math.PI;
      unitX.push(Math.cos(t));
      unitY.push(Math.sin(t));
      halfX.push(0.707 * Math.cos(t)); // 50% variance threshold
      halfY.push(0.707 * Math.sin(t));
    }

    traces.push({
      x: unitX,
      y: unitY,
      mode: 'lines',
      type: 'scatter',
      name: 'Unit Circle (r=1.0)',
      line: { color: isDark ? 'rgba(56, 189, 248, 0.4)' : 'rgba(2, 132, 199, 0.5)', width: 1.5, dash: 'dash' },
      hoverinfo: 'none',
      showlegend: false
    });

    traces.push({
      x: halfX,
      y: halfY,
      mode: 'lines',
      type: 'scatter',
      name: '50% Variance Circle (r=0.71)',
      line: { color: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)', width: 1, dash: 'dot' },
      hoverinfo: 'none',
      showlegend: false
    });

    // 2. Feature Vectors (Loadings on PC_x and PC_y)
    const arrowX: (number | null)[] = [];
    const arrowY: (number | null)[] = [];
    const annotations: any[] = [];

    const colors = [
      '#00f5d4', '#f59e0b', '#38bdf8', '#fb7185', '#a78bfa',
      '#34d399', '#f43f5e', '#60a5fa', '#f97316', '#c084fc'
    ];

    pcaResult.loadings.slice(0, 15).forEach((l, idx) => {
      // Correlation coefficient = eigenvector[pc][feat] * sqrt(eigenvalue[pc])
      const weightX = pcaResult.eigenvectors[pcX]?.[idx] || 0;
      const weightY = pcaResult.eigenvectors[pcY]?.[idx] || 0;
      const rX = Math.max(-1, Math.min(1, weightX * Math.sqrt(pcaResult.eigenvalues[pcX] || 1)));
      const rY = Math.max(-1, Math.min(1, weightY * Math.sqrt(pcaResult.eigenvalues[pcY] || 1)));

      const col = colors[idx % colors.length];

      arrowX.push(0, rX, null);
      arrowY.push(0, rY, null);

      annotations.push({
        x: rX,
        y: rY,
        text: l.feature,
        showarrow: true,
        arrowhead: 2,
        arrowsize: 1.2,
        arrowwidth: 2,
        arrowcolor: col,
        ax: 0,
        ay: 0,
        font: {
          size: 11,
          color: isDark ? '#f8fafc' : '#0f172a',
          weight: 'bold'
        }
      });
    });

    traces.push({
      x: arrowX,
      y: arrowY,
      mode: 'lines',
      type: 'scatter',
      name: 'Feature Correlations',
      line: { color: isDark ? '#38bdf8' : '#0284c7', width: 2 },
      hoverinfo: 'none',
      showlegend: false
    });

    return { traces, annotations };
  }, [pcaResult, pcX, pcY, isDark]);

  return (
    <div style={{
      background: isDark ? 'var(--bg-card)' : '#ffffff',
      borderRadius: 14,
      border: `1px solid ${isDark ? 'var(--border-card)' : '#e2e8f0'}`,
      boxShadow: isDark ? 'var(--card-shadow)' : '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
      padding: '20px 24px',
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            Feature Correlation Circle (PCA Unit Disk)
            <Info size={14} color="#64748b" style={{ cursor: 'pointer' }} />
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: isDark ? '#94a3b8' : '#64748b' }}>
            Arrows near the outer circle indicate well-represented features. Arrows pointing together indicate strong positive correlation.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select
            value={pcX}
            onChange={e => setPcX(Number(e.target.value))}
            style={{
              padding: '4px 8px',
              borderRadius: 6,
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#cbd5e1'}`,
              background: isDark ? '#0b1120' : '#f8fafc',
              color: isDark ? '#f8fafc' : '#0f172a',
              fontSize: 12,
              fontWeight: 600
            }}
          >
            {Array.from({ length: pcaResult.nComponents }, (_, i) => (
              <option key={i} value={i}>PC{i + 1} (Horiz)</option>
            ))}
          </select>

          <select
            value={pcY}
            onChange={e => setPcY(Number(e.target.value))}
            style={{
              padding: '4px 8px',
              borderRadius: 6,
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#cbd5e1'}`,
              background: isDark ? '#0b1120' : '#f8fafc',
              color: isDark ? '#f8fafc' : '#0f172a',
              fontSize: 12,
              fontWeight: 600
            }}
          >
            {Array.from({ length: pcaResult.nComponents }, (_, i) => (
              <option key={i} value={i}>PC{i + 1} (Vert)</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 380, width: '100%' }}>
        <Plot
          data={correlationData.traces}
          layout={{
            autosize: true,
            margin: { l: 40, r: 40, t: 20, b: 40 },
            paper_bgcolor: 'transparent',
            plot_bgcolor: isDark ? '#0b1120' : '#fafafa',
            annotations: correlationData.annotations,
            xaxis: {
              range: [-1.2, 1.2],
              title: { text: `PC${pcX + 1} Correlation`, font: { color: isDark ? '#cbd5e1' : '#334155' } },
              gridcolor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
              zerolinecolor: isDark ? '#38bdf8' : '#94a3b8',
              zerolinewidth: 1.5
            },
            yaxis: {
              range: [-1.2, 1.2],
              scaleanchor: 'x',
              scaleratio: 1,
              title: { text: `PC${pcY + 1} Correlation`, font: { color: isDark ? '#cbd5e1' : '#334155' } },
              gridcolor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
              zerolinecolor: isDark ? '#38bdf8' : '#94a3b8',
              zerolinewidth: 1.5
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
