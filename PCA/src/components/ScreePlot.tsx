import React, { useState } from 'react';
import {
  BarChart2,
  TrendingUp,
  Layers,
  Award,
  CheckCircle2,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { PCAResult } from '../types/pca';

interface ScreePlotProps {
  pcaResult: PCAResult;
}

export const ScreePlot: React.FC<ScreePlotProps> = ({ pcaResult }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [selectedK, setSelectedK] = useState<number>(Math.min(3, pcaResult.nComponents));

  const totalFeatures = pcaResult.nComponents;
  const retainedVariance = ((pcaResult.cumulativeVariance[selectedK - 1] || 0) * 100).toFixed(2);
  const lostVariance = (100 - Number(retainedVariance)).toFixed(2);

  // Kaiser criterion: Eigenvalue >= 1.0
  const kaiserCount = pcaResult.eigenvalues.filter(val => val >= 1.0).length;

  // Chart dimensions
  const chartHeight = 320;
  const paddingBottom = 40;
  const paddingTop = 30;
  const usableHeight = chartHeight - paddingBottom - paddingTop;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Dimensionality Reduction Decision Card */}
      <div className="glass-panel" style={{
        padding: '20px 24px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 20,
        background: 'linear-gradient(135deg, rgba(14, 18, 28, 0.9) 0%, rgba(8, 10, 15, 0.9) 100%)'
      }}>
        {/* Retain Dimensions Slider */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Layers size={15} color="var(--accent-cyan)" />
              Target Dimensions to Retain (K):
            </span>
            <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent-cyan)' }}>
              {selectedK} / {totalFeatures} PCs
            </span>
          </div>

          <input
            type="range"
            min="1"
            max={totalFeatures}
            value={selectedK}
            onChange={(e) => setSelectedK(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent-cyan)', cursor: 'pointer', height: 6 }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
            <span>1 PC (Fastest)</span>
            <span>{Math.ceil(totalFeatures / 2)} PCs</span>
            <span>{totalFeatures} PCs (Full)</span>
          </div>
        </div>

        {/* Retained vs Lost Metric Summary */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ flex: 1, background: 'rgba(0, 240, 255, 0.06)', border: '1px solid rgba(0, 240, 255, 0.25)', padding: '12px 16px', borderRadius: 12 }}>
            <span style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              Information Retained
            </span>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent-cyan)', marginTop: 2 }}>
              {retainedVariance}%
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Using top {selectedK} components
            </span>
          </div>

          <div style={{ flex: 1, background: 'rgba(255, 0, 127, 0.06)', border: '1px solid rgba(255, 0, 127, 0.25)', padding: '12px 16px', borderRadius: 12 }}>
            <span style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              Information Lost
            </span>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent-magenta)', marginTop: 2 }}>
              {lostVariance}%
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Discarding {totalFeatures - selectedK} components
            </span>
          </div>
        </div>

        {/* Kaiser Rule Badge */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', padding: '12px 16px', borderRadius: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Award size={15} color="var(--accent-gold)" />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-gold)' }}>
              Kaiser-Guttman Rule
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
            Recommends retaining <strong style={{ color: '#fff' }}>{Math.max(1, kaiserCount)} components</strong> with Eigenvalue ≥ 1.0 (explaining more than 1 raw variable's worth of variance).
          </p>
        </div>
      </div>

      {/* Interactive Scree Chart Canvas / SVG Container */}
      <div className="glass-panel" style={{ padding: '24px', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 18, margin: 0, fontWeight: 700 }}>
              Scree Plot: Explained Variance & "Elbow" Curve
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, marginTop: 4 }}>
              Bars depict individual variance ratio per component. The glowing curve indicates cumulative total information retained.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: 'linear-gradient(180deg, #00f0ff, #0077ff)' }} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Individual Variance (%)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 14, height: 3, background: 'var(--accent-magenta)', borderRadius: 2 }} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Cumulative Variance Curve</span>
            </div>
          </div>
        </div>

        {/* Scree Chart SVG */}
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <svg
            viewBox={`0 0 ${Math.max(700, totalFeatures * 70)} ${chartHeight}`}
            style={{ width: '100%', height: chartHeight, display: 'block' }}
          >
            {/* 80% and 90% horizontal benchmark lines */}
            {(() => {
              const y80 = paddingTop + usableHeight * (1 - 0.8);
              const y90 = paddingTop + usableHeight * (1 - 0.9);
              const svgWidth = Math.max(700, totalFeatures * 70);
              return (
                <g>
                  {/* 80% line */}
                  <line
                    x1="40"
                    y1={y80}
                    x2={svgWidth - 20}
                    y2={y80}
                    stroke="rgba(0, 255, 136, 0.4)"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                  <text x="45" y={y80 - 6} fill="var(--accent-lime)" fontSize="10" fontWeight="600">
                    80% Variance Threshold
                  </text>

                  {/* 90% line */}
                  <line
                    x1="40"
                    y1={y90}
                    x2={svgWidth - 20}
                    y2={y90}
                    stroke="rgba(255, 183, 0, 0.4)"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                  <text x="45" y={y90 - 6} fill="var(--accent-gold)" fontSize="10" fontWeight="600">
                    90% High Precision Threshold
                  </text>
                </g>
              );
            })()}

            {/* Bars and Cumulative Line Nodes */}
            {(() => {
              const svgWidth = Math.max(700, totalFeatures * 70);
              const colWidth = (svgWidth - 80) / totalFeatures;
              const barWidth = Math.min(36, colWidth * 0.55);

              // Calculate cumulative curve coordinates
              const points = pcaResult.cumulativeVariance.map((cumVal, idx) => {
                const x = 50 + idx * colWidth + colWidth / 2;
                const y = paddingTop + usableHeight * (1 - cumVal);
                return { x, y, cumVal };
              });

              const pathString = points.reduce((acc, pt, idx) => {
                return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
              }, '');

              return (
                <g>
                  {/* Cumulative line path */}
                  <path
                    d={pathString}
                    fill="none"
                    stroke="var(--accent-magenta)"
                    strokeWidth="3"
                    filter="drop-shadow(0 0 8px rgba(255, 0, 127, 0.5))"
                  />

                  {/* Bars for each component */}
                  {pcaResult.explainedVariance.map((variance, idx) => {
                    const xCenter = 50 + idx * colWidth + colWidth / 2;
                    const barHeight = usableHeight * variance;
                    const barY = paddingTop + usableHeight - barHeight;
                    const isSelected = idx < selectedK;
                    const isHovered = hoveredIdx === idx;

                    return (
                      <g
                        key={idx}
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={() => setHoveredIdx(idx)}
                        onMouseLeave={() => setHoveredIdx(null)}
                        onClick={() => setSelectedK(idx + 1)}
                      >
                        {/* Bar */}
                        <rect
                          x={xCenter - barWidth / 2}
                          y={barY}
                          width={barWidth}
                          height={Math.max(4, barHeight)}
                          rx={6}
                          fill={
                            isHovered
                              ? '#00f0ff'
                              : isSelected
                              ? 'url(#cyanGradient)'
                              : 'rgba(255, 255, 255, 0.15)'
                          }
                          filter={isSelected ? 'drop-shadow(0 0 8px rgba(0, 240, 255, 0.35))' : 'none'}
                        />

                        {/* Bar percentage label */}
                        <text
                          x={xCenter}
                          y={barY - 8}
                          textAnchor="middle"
                          fill={isSelected ? '#00f0ff' : 'var(--text-dim)'}
                          fontSize="11"
                          fontWeight="700"
                        >
                          {(variance * 100).toFixed(1)}%
                        </text>

                        {/* PC Axis Label */}
                        <text
                          x={xCenter}
                          y={chartHeight - 14}
                          textAnchor="middle"
                          fill={isSelected ? '#ffffff' : 'var(--text-dim)'}
                          fontSize="12"
                          fontWeight={isSelected ? '700' : '500'}
                        >
                          PC{idx + 1}
                        </text>

                        {/* Cumulative Node Circle */}
                        <circle
                          cx={points[idx].x}
                          cy={points[idx].y}
                          r={isHovered ? 7 : 5}
                          fill="#ff007f"
                          stroke="#ffffff"
                          strokeWidth="2"
                          filter="drop-shadow(0 0 6px #ff007f)"
                        />

                        {/* Cumulative percentage tooltip label */}
                        <text
                          x={points[idx].x}
                          y={points[idx].y - 12}
                          textAnchor="middle"
                          fill="#ff007f"
                          fontSize="10"
                          fontWeight="700"
                        >
                          {(points[idx].cumVal * 100).toFixed(1)}%
                        </text>
                      </g>
                    );
                  })}
                </g>
              );
            })()}

            {/* Gradient definition */}
            <defs>
              <linearGradient id="cyanGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00f0ff" stopOpacity="1" />
                <stop offset="100%" stopColor="#0072ff" stopOpacity="0.8" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* Component Details Matrix Table */}
      <div className="glass-panel" style={{ padding: '20px 24px', overflowX: 'auto' }}>
        <h3 style={{ fontSize: 16, marginBottom: 14, fontWeight: 700 }}>
          Principal Component Spectrum Breakdown
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-dim)' }}>
              <th style={{ padding: '10px 14px' }}>Component</th>
              <th style={{ padding: '10px 14px' }}>Eigenvalue (λ)</th>
              <th style={{ padding: '10px 14px' }}>Explained Variance Ratio</th>
              <th style={{ padding: '10px 14px' }}>Cumulative Variance</th>
              <th style={{ padding: '10px 14px' }}>Kaiser Status</th>
            </tr>
          </thead>
          <tbody>
            {pcaResult.eigenvalues.map((val, idx) => {
              const evr = ((pcaResult.explainedVariance[idx] || 0) * 100).toFixed(2);
              const cum = ((pcaResult.cumulativeVariance[idx] || 0) * 100).toFixed(2);
              const passesKaiser = val >= 1.0;

              return (
                <tr
                  key={idx}
                  style={{
                    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                    background: idx < selectedK ? 'rgba(0, 240, 255, 0.03)' : 'transparent'
                  }}
                >
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: idx < selectedK ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
                    PC{idx + 1}
                  </td>
                  <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    {val.toFixed(4)}
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    {evr}%
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--accent-magenta)' }}>
                    {cum}%
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    {passesKaiser ? (
                      <span className="badge badge-gold" style={{ fontSize: 10 }}>
                        <Award size={11} /> Retain (λ ≥ 1.0)
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                        λ &lt; 1.0
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
