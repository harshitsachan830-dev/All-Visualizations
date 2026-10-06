import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceDot,
} from 'recharts';
import { TrendingDown, CheckCircle, ArrowRight, Zap } from 'lucide-react';

interface ElbowViewProps {
  elbowData: { k: number; inertia: number }[];
  currentK: number;
  onApplyK: (k: number) => void;
}

export const ElbowView: React.FC<ElbowViewProps> = ({
  elbowData,
  currentK,
  onApplyK,
}) => {
  // Find elbow point using second derivative heuristic
  let optimalK = 3;
  let maxCurvature = -1;

  for (let i = 1; i < elbowData.length - 1; i++) {
    const prev = elbowData[i - 1].inertia;
    const curr = elbowData[i].inertia;
    const next = elbowData[i + 1].inertia;
    const curvature = (prev - curr) - (curr - next);
    if (curvature > maxCurvature) {
      maxCurvature = curvature;
      optimalK = elbowData[i].k;
    }
  }

  const optimalPoint = elbowData.find((d) => d.k === optimalK);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', maxWidth: '1100px' }}>
      {/* Header Banner */}
      <div
        style={{
          background: '#0d111a',
          border: '1px solid #1e293b',
          borderRadius: '12px',
          padding: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingDown size={20} color="#00e0ba" />
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
              The Elbow Method (WCSS vs K)
            </h2>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '13px', margin: '4px 0 0 0' }}>
            Inspect diminishing returns in Within-Cluster Sum of Squares (Inertia) as K increases.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', color: '#cbd5e1' }}>
            Algorithmic Recommendation: <strong style={{ color: '#00e0ba' }}>K = {optimalK}</strong>
          </span>
          <button
            onClick={() => onApplyK(optimalK)}
            disabled={currentK === optimalK}
            style={{
              background: currentK === optimalK ? '#1e293b' : '#7c3aed',
              color: currentK === optimalK ? '#64748b' : '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: currentK === optimalK ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Zap size={14} /> {currentK === optimalK ? 'Active K' : `Switch to K=${optimalK}`}
          </button>
        </div>
      </div>

      {/* Main Elbow Chart */}
      <div
        style={{
          background: '#0d111a',
          border: '1px solid #1e293b',
          borderRadius: '12px',
          padding: '24px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
            Inertia (Within-Cluster Sum of Squares) Curve
          </h3>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
            Current Model: <strong style={{ color: '#ff3483' }}>K = {currentK}</strong>
          </span>
        </div>

        <div style={{ height: '360px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={elbowData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
              <XAxis
                dataKey="k"
                stroke="#64748b"
                label={{ value: 'Number of Clusters (K)', position: 'insideBottom', offset: -10, fill: '#94a3b8' }}
              />
              <YAxis
                stroke="#64748b"
                label={{ value: 'Inertia (WCSS)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
              />
              <Tooltip
                contentStyle={{ background: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                labelFormatter={(k) => `K = ${k} clusters`}
                formatter={(val: any) => [Number(val).toLocaleString(), 'Inertia (WCSS)']}
              />
              <Line
                type="monotone"
                dataKey="inertia"
                stroke="#00e0ba"
                strokeWidth={3}
                dot={{ fill: '#00e0ba', r: 5 }}
                activeDot={{ r: 8 }}
              />
              {optimalPoint && (
                <ReferenceDot
                  x={optimalPoint.k}
                  y={optimalPoint.inertia}
                  r={8}
                  fill="#ff3483"
                  stroke="#ffffff"
                  strokeWidth={2}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Diminishing Returns Breakdown Table */}
      <div
        style={{
          background: '#0d111a',
          border: '1px solid #1e293b',
          borderRadius: '12px',
          padding: '20px',
        }}
      >
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc', margin: '0 0 12px 0' }}>
          Delta Analysis: Marginal Inertia Reduction
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ color: '#64748b', borderBottom: '1px solid #1e293b', textAlign: 'left' }}>
                <th style={{ padding: '10px' }}>K Clusters</th>
                <th style={{ padding: '10px' }}>Inertia (WCSS)</th>
                <th style={{ padding: '10px' }}>Marginal Reduction (Δ)</th>
                <th style={{ padding: '10px' }}>Reduction Rate</th>
                <th style={{ padding: '10px' }}>Selection</th>
              </tr>
            </thead>
            <tbody>
              {elbowData.map((d, i) => {
                const prevInertia = i > 0 ? elbowData[i - 1].inertia : d.inertia;
                const delta = prevInertia - d.inertia;
                const pct = prevInertia > 0 ? ((delta / prevInertia) * 100).toFixed(1) : '0';
                const isOptimal = d.k === optimalK;
                const isCurrent = d.k === currentK;

                return (
                  <tr
                    key={d.k}
                    style={{
                      borderBottom: '1px solid #131824',
                      background: isCurrent ? 'rgba(124, 58, 237, 0.15)' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '10px', fontWeight: 600, color: isOptimal ? '#00e0ba' : '#f8fafc' }}>
                      K = {d.k} {isOptimal && '⭐ Recommended Elbow'}
                    </td>
                    <td style={{ padding: '10px', fontFamily: 'monospace', color: '#00e0ba' }}>
                      {d.inertia.toLocaleString()}
                    </td>
                    <td style={{ padding: '10px', fontFamily: 'monospace', color: i === 0 ? '#64748b' : '#ff3483' }}>
                      {i === 0 ? '—' : `-${delta.toLocaleString()}`}
                    </td>
                    <td style={{ padding: '10px', color: '#94a3b8' }}>
                      {i === 0 ? 'Base' : `-${pct}%`}
                    </td>
                    <td style={{ padding: '10px' }}>
                      <button
                        onClick={() => onApplyK(d.k)}
                        disabled={isCurrent}
                        style={{
                          background: isCurrent ? '#334155' : '#1e293b',
                          color: isCurrent ? '#94a3b8' : '#cbd5e1',
                          border: '1px solid #334155',
                          borderRadius: '4px',
                          padding: '4px 10px',
                          fontSize: '11px',
                          cursor: isCurrent ? 'default' : 'pointer',
                        }}
                      >
                        {isCurrent ? 'Current' : 'Select K'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
