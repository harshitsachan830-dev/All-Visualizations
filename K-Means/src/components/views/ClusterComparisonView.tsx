import React from 'react';
import { KMeansRunResult, getClusterColor, euclideanDistance } from '../../utils/kmeans';
import { Columns, Split, BarChart2 } from 'lucide-react';

interface ClusterComparisonViewProps {
  data: Record<string, number>[];
  features: [string, string, string];
  runResult: KMeansRunResult;
}

export const ClusterComparisonView: React.FC<ClusterComparisonViewProps> = ({
  data,
  features,
  runResult,
}) => {
  const centroids = runResult.finalIteration.centroids;
  const labels = runResult.finalIteration.labels;

  // Compute feature means per cluster
  const clusterProfiles = centroids.map((c) => {
    const assigned = data.filter((_, idx) => labels[idx] === c.id);
    const featureMeans: Record<string, number> = {};

    features.forEach((f) => {
      const sum = assigned.reduce((acc, row) => acc + (row[f] ?? 0), 0);
      featureMeans[f] = assigned.length > 0 ? parseFloat((sum / assigned.length).toFixed(3)) : 0;
    });

    return {
      id: c.id,
      color: c.color,
      count: assigned.length,
      featureMeans,
    };
  });

  // Centroid separation matrix (Pairwise Euclidean distance)
  const separationMatrix: number[][] = centroids.map((c1) =>
    centroids.map((c2) => parseFloat(euclideanDistance(c1.coordinates, c2.coordinates).toFixed(3)))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', maxWidth: '1100px' }}>
      {/* Header */}
      <div
        style={{
          background: '#0d111a',
          border: '1px solid #1e293b',
          borderRadius: '12px',
          padding: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Split size={20} color="#7c3aed" />
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
            Cluster Separation & Feature Comparison
          </h2>
        </div>
        <p style={{ color: '#94a3b8', fontSize: '13px', margin: '4px 0 0 0' }}>
          Compare feature averages and inter-cluster centroid distances across all {centroids.length} clusters.
        </p>
      </div>

      {/* Feature Means Comparison Table */}
      <div
        style={{
          background: '#0d111a',
          border: '1px solid #1e293b',
          borderRadius: '12px',
          padding: '20px',
        }}
      >
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc', margin: '0 0 14px 0' }}>
          Mean Feature Values by Cluster
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ color: '#64748b', borderBottom: '1px solid #1e293b', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px' }}>Cluster</th>
                <th style={{ padding: '10px 12px' }}>Points</th>
                {features.map((f) => (
                  <th key={f} style={{ padding: '10px 12px' }}>
                    Mean {f}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clusterProfiles.map((cp) => (
                <tr key={cp.id} style={{ borderBottom: '1px solid #131824', color: '#cbd5e1' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: cp.color }} />
                    Cluster {cp.id}
                  </td>
                  <td style={{ padding: '10px 12px' }}>{cp.count}</td>
                  {features.map((f) => (
                    <td key={f} style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#00e0ba' }}>
                      {cp.featureMeans[f]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Centroid Distance Matrix (Inter-cluster separation) */}
      <div
        style={{
          background: '#0d111a',
          border: '1px solid #1e293b',
          borderRadius: '12px',
          padding: '20px',
        }}
      >
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc', margin: '0 0 8px 0' }}>
          Centroid Pairwise Separation Matrix ||μ_i - μ_j||
        </h3>
        <p style={{ color: '#94a3b8', fontSize: '12px', margin: '0 0 16px 0' }}>
          High inter-centroid distances represent strong geometric separation between discovered clusters.
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'center' }}>
            <thead>
              <tr style={{ color: '#64748b', borderBottom: '1px solid #1e293b' }}>
                <th style={{ padding: '8px', textAlign: 'left' }}>Distance</th>
                {centroids.map((c) => (
                  <th key={c.id} style={{ padding: '8px', color: c.color }}>
                    Cluster {c.id}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {separationMatrix.map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #131824' }}>
                  <td style={{ padding: '8px', textAlign: 'left', fontWeight: 600, color: centroids[i].color }}>
                    Cluster {i}
                  </td>
                  {row.map((val, j) => (
                    <td
                      key={j}
                      style={{
                        padding: '8px',
                        fontFamily: 'monospace',
                        color: i === j ? '#475569' : '#f8fafc',
                        background: i === j ? 'rgba(30, 41, 59, 0.3)' : 'transparent',
                      }}
                    >
                      {val.toFixed(2)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
