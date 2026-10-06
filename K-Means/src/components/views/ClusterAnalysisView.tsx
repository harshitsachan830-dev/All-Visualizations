import React, { useState } from 'react';
import {
  KMeansRunResult,
  IterationSnapshot,
  getClusterColor,
  euclideanDistance,
} from '../../utils/kmeans';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Layers, AlertCircle, TrendingUp, BarChart2 } from 'lucide-react';

interface ClusterAnalysisViewProps {
  data: Record<string, number>[];
  features: [string, string, string];
  runResult: KMeansRunResult;
  currentSnapshot: IterationSnapshot;
}

export const ClusterAnalysisView: React.FC<ClusterAnalysisViewProps> = ({
  data,
  features,
  runResult,
  currentSnapshot,
}) => {
  const [selectedClusterId, setSelectedClusterId] = useState<number>(0);
  const centroids = currentSnapshot.centroids;
  const labels = currentSnapshot.labels;

  // Compute cluster detailed stats
  const clusterStats = centroids.map((c) => {
    const assignedIndices: number[] = [];
    labels.forEach((lbl, idx) => {
      if (lbl === c.id) assignedIndices.push(idx);
    });

    const count = assignedIndices.length;
    const pct = data.length > 0 ? ((count / data.length) * 100).toFixed(1) : '0';

    // Distances of points to this centroid
    const dists: { index: number; dist: number }[] = assignedIndices.map((idx) => {
      const row = data[idx];
      const coords = features.map((f) => row[f] ?? 0);
      const d = euclideanDistance(coords, c.coordinates);
      return { index: idx, dist: d };
    });

    const avgDist = dists.length > 0 ? dists.reduce((a, b) => a + b.dist, 0) / dists.length : 0;
    const maxDist = dists.length > 0 ? Math.max(...dists.map((d) => d.dist)) : 0;

    // Top outliers (furthest 3 points from centroid)
    dists.sort((a, b) => b.dist - a.dist);
    const outliers = dists.slice(0, 4);

    return {
      id: c.id,
      color: c.color,
      count,
      pct,
      coordinates: c.coordinates,
      avgDist: parseFloat(avgDist.toFixed(4)),
      maxDist: parseFloat(maxDist.toFixed(4)),
      outliers,
    };
  });

  const activeCluster = clusterStats.find((c) => c.id === selectedClusterId) || clusterStats[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        {clusterStats.map((c) => (
          <div
            key={c.id}
            onClick={() => setSelectedClusterId(c.id)}
            style={{
              background: '#0d111a',
              border: `1px solid ${selectedClusterId === c.id ? c.color : '#1e293b'}`,
              borderRadius: '10px',
              padding: '16px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#f8fafc' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: c.color }} />
                Cluster {c.id}
              </span>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>{c.pct}% of total</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: c.color }}>
              {c.count} <span style={{ fontSize: '13px', color: '#64748b' }}>points</span>
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>
              Avg spread: <strong style={{ color: '#cbd5e1' }}>{c.avgDist}</strong>
            </div>
          </div>
        ))}
      </div>

      {/* Main Analysis Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Left: Size Distribution Bar Chart */}
        <div
          style={{
            background: '#0d111a',
            border: '1px solid #1e293b',
            borderRadius: '10px',
            padding: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <BarChart2 size={18} color="#00e0ba" />
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
              Cluster Size Distribution
            </h3>
          </div>

          <div style={{ height: '240px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={clusterStats}>
                <XAxis dataKey="id" stroke="#64748b" tickFormatter={(id) => `Cluster ${id}`} />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{ background: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                  formatter={(val: any) => [`${val} points`, 'Count']}
                  labelFormatter={(id) => `Cluster ${id}`}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {clusterStats.map((c) => (
                    <Cell key={c.id} fill={c.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Selected Cluster Deep-Dive */}
        <div
          style={{
            background: '#0d111a',
            border: '1px solid #1e293b',
            borderRadius: '10px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: activeCluster.color }} />
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
              Cluster {activeCluster.id} Profile
            </h3>
          </div>

          <div style={{ fontSize: '13px', color: '#cbd5e1' }}>
            <strong>Centroid Coordinate Vector:</strong>
            <div
              style={{
                fontFamily: 'monospace',
                background: '#131824',
                padding: '8px 12px',
                borderRadius: '6px',
                marginTop: '4px',
                color: activeCluster.color,
              }}
            >
              [{activeCluster.coordinates.map((val) => val.toFixed(3)).join(', ')}]
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ background: '#131824', padding: '10px', borderRadius: '6px' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>Mean Intra-Cluster Distance</div>
              <div style={{ fontSize: '18px', fontWeight: 600, color: '#00e0ba' }}>
                {activeCluster.avgDist}
              </div>
            </div>
            <div style={{ background: '#131824', padding: '10px', borderRadius: '6px' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>Max Radius to Edge</div>
              <div style={{ fontSize: '18px', fontWeight: 600, color: '#ff3483' }}>
                {activeCluster.maxDist}
              </div>
            </div>
          </div>

          {/* Outliers Table */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#f8fafc', marginBottom: '8px' }}>
              <AlertCircle size={14} color="#facc15" />
              Furthest Outlier Points (Boundary Candidates):
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ color: '#64748b', borderBottom: '1px solid #1e293b', textAlign: 'left' }}>
                    <th style={{ padding: '6px' }}>Point ID</th>
                    <th style={{ padding: '6px' }}>Coordinates ({features.join(', ')})</th>
                    <th style={{ padding: '6px' }}>Distance</th>
                  </tr>
                </thead>
                <tbody>
                  {activeCluster.outliers.map((o) => {
                    const row = data[o.index];
                    return (
                      <tr key={o.index} style={{ borderBottom: '1px solid #131824', color: '#cbd5e1' }}>
                        <td style={{ padding: '6px', fontWeight: 600 }}>#{o.index}</td>
                        <td style={{ padding: '6px', fontFamily: 'monospace' }}>
                          [{features.map((f) => row[f]).join(', ')}]
                        </td>
                        <td style={{ padding: '6px', color: '#ff3483', fontWeight: 600 }}>
                          {o.dist.toFixed(3)}
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
    </div>
  );
};
