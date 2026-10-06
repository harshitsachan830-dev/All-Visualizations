import React from 'react';
import { KMeansRunResult, getClusterColor } from '../../utils/kmeans';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { Sparkles, HelpCircle, CheckCircle2 } from 'lucide-react';

interface SilhouetteViewProps {
  runResult: KMeansRunResult;
}

export const SilhouetteView: React.FC<SilhouetteViewProps> = ({ runResult }) => {
  const { average, clusterScores, sampleScores } = runResult.silhouette;

  const clusterChartData = Object.entries(clusterScores).map(([cid, score]) => ({
    cluster: `Cluster ${cid}`,
    id: Number(cid),
    score,
  }));

  // Interpretation qualitative label
  const getQualityText = (s: number) => {
    if (s > 0.7) return { label: 'Strong Structure', color: '#4ade80' };
    if (s > 0.5) return { label: 'Reasonable Structure', color: '#00e0ba' };
    if (s > 0.25) return { label: 'Weak Structure', color: '#facc15' };
    return { label: 'No Substantial Structure', color: '#f87171' };
  };

  const quality = getQualityText(average);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', maxWidth: '1100px' }}>
      {/* Header KPI Card */}
      <div
        style={{
          background: '#0d111a',
          border: '1px solid #1e293b',
          borderRadius: '12px',
          padding: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} color="#7c3aed" />
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
              Silhouette Quality Analysis
            </h2>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '13px', margin: '4px 0 0 0' }}>
            Measures how well each point fits within its cluster compared to neighboring clusters (-1 to +1).
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>
              Mean Silhouette Coefficient
            </div>
            <div style={{ fontSize: '32px', fontWeight: 700, color: quality.color }}>
              {average.toFixed(3)}
            </div>
          </div>
          <div
            style={{
              background: 'rgba(124, 58, 237, 0.15)',
              border: `1px solid ${quality.color}`,
              borderRadius: '8px',
              padding: '8px 14px',
              color: quality.color,
              fontWeight: 600,
              fontSize: '13px',
            }}
          >
            {quality.label}
          </div>
        </div>
      </div>

      {/* Per-Cluster Silhouette Scores */}
      <div
        style={{
          background: '#0d111a',
          border: '1px solid #1e293b',
          borderRadius: '12px',
          padding: '24px',
        }}
      >
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc', margin: '0 0 16px 0' }}>
          Per-Cluster Cohesion vs Separation
        </h3>

        <div style={{ height: '260px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={clusterChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <XAxis dataKey="cluster" stroke="#64748b" />
              <YAxis domain={[-0.2, 1]} stroke="#64748b" />
              <Tooltip
                contentStyle={{ background: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                formatter={(val: any) => [val, 'Silhouette Score']}
              />
              <ReferenceLine y={average} stroke="#a78bfa" strokeDasharray="3 3" label={{ value: `Avg (${average})`, fill: '#a78bfa', fontSize: 11 }} />
              <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                {clusterChartData.map((c) => (
                  <Cell key={c.id} fill={getClusterColor(c.id)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Formula & Educational Explanation */}
      <div
        style={{
          background: '#0d111a',
          border: '1px solid #1e293b',
          borderRadius: '12px',
          padding: '20px',
        }}
      >
        <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc', margin: '0 0 10px 0' }}>
          Mathematical Definition of Silhouette Score s(i)
        </h4>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px' }}>
          <div style={{ background: '#131824', padding: '14px', borderRadius: '8px' }}>
            <div style={{ fontWeight: 600, color: '#00e0ba', marginBottom: '4px' }}>
              Formula:
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '13px', color: '#f8fafc' }}>
              s(i) = [ b(i) - a(i) ] / max(a(i), b(i))
            </div>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '8px 0 0 0', lineHeight: '1.5' }}>
              Where <strong>a(i)</strong> is the average intra-cluster distance of point i to all other points in the same cluster, and <strong>b(i)</strong> is the minimum average distance to points in any other cluster.
            </p>
          </div>

          <div style={{ background: '#131824', padding: '14px', borderRadius: '8px' }}>
            <div style={{ fontWeight: 600, color: '#ff3483', marginBottom: '4px' }}>
              Interpretation Guide:
            </div>
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#cbd5e1', lineHeight: '1.6' }}>
              <li><strong>+1.0</strong>: Sample is well far away from neighboring clusters.</li>
              <li><strong>0.0</strong>: Sample is on or very close to the decision boundary.</li>
              <li><strong>-1.0</strong>: Sample might have been assigned to the wrong cluster.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
