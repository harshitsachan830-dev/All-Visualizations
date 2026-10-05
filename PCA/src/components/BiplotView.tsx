import React, { useState } from 'react';
import {
  Compass,
  ArrowUpRight,
  HelpCircle,
  TrendingUp,
  BarChart,
  Layers,
  Sparkles
} from 'lucide-react';
import { PCALoading, PCAResult } from '../types/pca';

interface BiplotViewProps {
  pcaResult: PCAResult;
}

export const BiplotView: React.FC<BiplotViewProps> = ({ pcaResult }) => {
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'importance' | 'pc1' | 'pc2' | 'pc3'>('importance');

  // Sorted loadings
  const sortedLoadings = [...pcaResult.loadings].sort((a, b) => {
    if (sortField === 'importance') return b.importance - a.importance;
    if (sortField === 'pc1') return Math.abs(b.pc1) - Math.abs(a.pc1);
    if (sortField === 'pc2') return Math.abs(b.pc2) - Math.abs(a.pc2);
    if (sortField === 'pc3') return Math.abs(b.pc3) - Math.abs(a.pc3);
    return 0;
  });

  const plotSize = 420;
  const center = plotSize / 2;
  const radius = plotSize * 0.42;

  // Maximum loading magnitude for normalizing arrows inside unit circle
  const maxMag = Math.max(...pcaResult.loadings.map(l => Math.hypot(l.pc1, l.pc2))) || 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Educational Guide: How to Read Biplots */}
      <div className="glass-panel" style={{
        padding: '20px 24px',
        background: 'linear-gradient(135deg, rgba(20, 15, 30, 0.9) 0%, rgba(8, 10, 16, 0.9) 100%)',
        border: '1px solid rgba(168, 85, 247, 0.25)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Sparkles size={20} color="var(--accent-purple)" />
          <h2 style={{ fontSize: 17, margin: 0, fontWeight: 700 }}>
            Biplot & Feature Loadings: Understanding What Drives the Components
          </h2>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 16,
          fontSize: 13,
          color: 'var(--text-muted)'
        }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontWeight: 700, color: 'var(--accent-gold)' }}>1. Arrow Direction & Sign:</span>
            <p style={{ margin: 0, marginTop: 4 }}>
              Arrows point toward the direction of increasing values for that original variable in the PC coordinate space.
            </p>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>2. Angles Between Arrows:</span>
            <p style={{ margin: 0, marginTop: 4 }}>
              Narrow angle (&lt;90°) = Strong positive correlation. Right angle (90°) = Uncorrelated. Opposite angle (180°) = Negative correlation.
            </p>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontWeight: 700, color: 'var(--accent-magenta)' }}>3. Arrow Length (Magnitude):</span>
            <p style={{ margin: 0, marginTop: 4 }}>
              Longer arrows mean the variable is strongly captured and preserved in this 2D plane (high quality of representation).
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Loading Circle Plot & Table */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 20 }}>
        {/* Correlation / Loading Circle Plot */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h3 style={{ fontSize: 16, marginBottom: 8, fontWeight: 700, alignSelf: 'flex-start' }}>
            2D Feature Correlation Circle (PC1 vs PC2)
          </h3>
          <p style={{ fontSize: 12, color: 'var(--text-dim)', alignSelf: 'flex-start', marginBottom: 16 }}>
            Vectors projected from origin (0, 0) into PC1 &amp; PC2 subspace
          </p>

          <svg
            width={plotSize}
            height={plotSize}
            style={{
              background: '#04060a',
              borderRadius: 16,
              border: '1px solid var(--border-subtle)',
              boxShadow: '0 0 25px rgba(0, 0, 0, 0.8)'
            }}
          >
            {/* Outer Reference Circles */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="rgba(255, 255, 255, 0.12)"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            <circle
              cx={center}
              cy={center}
              r={radius * 0.5}
              fill="none"
              stroke="rgba(255, 255, 255, 0.06)"
              strokeWidth="1"
              strokeDasharray="2 2"
            />

            {/* Coordinate Crosshairs */}
            <line
              x1="20"
              y1={center}
              x2={plotSize - 20}
              y2={center}
              stroke="rgba(0, 240, 255, 0.3)"
              strokeWidth="1.5"
            />
            <line
              x1={center}
              y1="20"
              x2={center}
              y2={plotSize - 20}
              stroke="rgba(255, 0, 127, 0.3)"
              strokeWidth="1.5"
            />

            {/* Axis Labels */}
            <text x={plotSize - 16} y={center - 8} fill="var(--accent-cyan)" fontSize="11" fontWeight="700" textAnchor="end">
              +PC1
            </text>
            <text x="16" y={center - 8} fill="var(--accent-cyan)" fontSize="11" fontWeight="700" textAnchor="start">
              -PC1
            </text>
            <text x={center + 8} y="24" fill="var(--accent-magenta)" fontSize="11" fontWeight="700" textAnchor="start">
              +PC2
            </text>
            <text x={center + 8} y={plotSize - 14} fill="var(--accent-magenta)" fontSize="11" fontWeight="700" textAnchor="start">
              -PC2
            </text>

            {/* Feature Loading Vector Arrows */}
            {pcaResult.loadings.map((loading) => {
              const normX = (loading.pc1 / maxMag) * radius;
              const normY = -(loading.pc2 / maxMag) * radius; // Invert Y
              const targetX = center + normX;
              const targetY = center + normY;
              const isHovered = hoveredFeature === loading.feature;

              const angle = Math.atan2(normY, normX);
              const headLen = 8;

              return (
                <g
                  key={loading.feature}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredFeature(loading.feature)}
                  onMouseLeave={() => setHoveredFeature(null)}
                >
                  {/* Arrow Ray */}
                  <line
                    x1={center}
                    y1={center}
                    x2={targetX}
                    y2={targetY}
                    stroke={isHovered ? 'var(--accent-cyan)' : 'var(--accent-gold)'}
                    strokeWidth={isHovered ? 3 : 2}
                    filter={isHovered ? 'drop-shadow(0 0 8px #00f0ff)' : 'none'}
                  />

                  {/* Arrow Head */}
                  <polygon
                    points={`
                      ${targetX},${targetY}
                      ${targetX - headLen * Math.cos(angle - Math.PI / 6)},${targetY - headLen * Math.sin(angle - Math.PI / 6)}
                      ${targetX - headLen * Math.cos(angle + Math.PI / 6)},${targetY - headLen * Math.sin(angle + Math.PI / 6)}
                    `}
                    fill={isHovered ? 'var(--accent-cyan)' : 'var(--accent-gold)'}
                  />

                  {/* Label */}
                  <text
                    x={targetX + Math.cos(angle) * 14}
                    y={targetY + Math.sin(angle) * 14 + 4}
                    textAnchor={Math.cos(angle) >= 0 ? 'start' : 'end'}
                    fill={isHovered ? '#ffffff' : 'var(--text-main)'}
                    fontSize={isHovered ? '12' : '10'}
                    fontWeight={isHovered ? '800' : '600'}
                  >
                    {loading.feature}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Loading Ranking Table */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, margin: 0, fontWeight: 700 }}>
              Feature Weights &amp; Importance
            </h3>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['importance', 'pc1', 'pc2', 'pc3'] as const).map((field) => (
                <button
                  key={field}
                  onClick={() => setSortField(field)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    background: sortField === field ? 'rgba(0, 240, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    color: sortField === field ? 'var(--accent-cyan)' : 'var(--text-dim)',
                    border: sortField === field ? '1px solid var(--accent-cyan)' : '1px solid transparent'
                  }}
                >
                  {field}
                </button>
              ))}
            </div>
          </div>

          <div style={{ overflowX: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-dim)' }}>
                  <th style={{ padding: '8px 10px' }}>Variable</th>
                  <th style={{ padding: '8px 10px' }}>PC1 Weight</th>
                  <th style={{ padding: '8px 10px' }}>PC2 Weight</th>
                  <th style={{ padding: '8px 10px' }}>PC3 Weight</th>
                  <th style={{ padding: '8px 10px' }}>Overall Impact</th>
                </tr>
              </thead>
              <tbody>
                {sortedLoadings.map((loading) => {
                  const isHovered = hoveredFeature === loading.feature;
                  return (
                    <tr
                      key={loading.feature}
                      onMouseEnter={() => setHoveredFeature(loading.feature)}
                      onMouseLeave={() => setHoveredFeature(null)}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                        background: isHovered ? 'rgba(0, 240, 255, 0.08)' : 'transparent',
                        cursor: 'pointer'
                      }}
                    >
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: isHovered ? 'var(--accent-cyan)' : '#f1f5f9' }}>
                        {loading.feature}
                      </td>
                      <td style={{
                        padding: '8px 10px',
                        fontFamily: 'var(--font-mono)',
                        color: loading.pc1 >= 0 ? 'var(--accent-cyan)' : 'var(--accent-magenta)'
                      }}>
                        {loading.pc1 >= 0 ? `+${loading.pc1.toFixed(3)}` : loading.pc1.toFixed(3)}
                      </td>
                      <td style={{
                        padding: '8px 10px',
                        fontFamily: 'var(--font-mono)',
                        color: loading.pc2 >= 0 ? 'var(--accent-cyan)' : 'var(--accent-magenta)'
                      }}>
                        {loading.pc2 >= 0 ? `+${loading.pc2.toFixed(3)}` : loading.pc2.toFixed(3)}
                      </td>
                      <td style={{
                        padding: '8px 10px',
                        fontFamily: 'var(--font-mono)',
                        color: loading.pc3 >= 0 ? 'var(--accent-cyan)' : 'var(--accent-magenta)'
                      }}>
                        {loading.pc3 >= 0 ? `+${loading.pc3.toFixed(3)}` : loading.pc3.toFixed(3)}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{
                            width: 60,
                            height: 6,
                            background: 'rgba(255, 255, 255, 0.1)',
                            borderRadius: 3,
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${Math.min(100, (loading.importance / maxMag) * 100)}%`,
                              height: '100%',
                              background: 'var(--accent-gold)'
                            }} />
                          </div>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--accent-gold)' }}>
                            {loading.importance.toFixed(2)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
