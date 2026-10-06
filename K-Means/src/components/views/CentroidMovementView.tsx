import React, { useState } from 'react';
import { ThreeScatterPlot } from '../ThreeScatterPlot';
import { KMeansRunResult, IterationSnapshot, getClusterColor, euclideanDistance } from '../../utils/kmeans';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import { TrendingDown, Activity, Compass } from 'lucide-react';

interface CentroidMovementViewProps {
  data: Record<string, number>[];
  features: [string, string, string];
  runResult: KMeansRunResult;
  currentIteration: number;
  currentSnapshot: IterationSnapshot;
}

export const CentroidMovementView: React.FC<CentroidMovementViewProps> = ({
  data,
  features,
  runResult,
  currentIteration,
  currentSnapshot,
}) => {
  const [isolatedCluster, setIsolatedCluster] = useState<number | null>(null);

  // Compute movement per iteration for each centroid
  const movementChartData = runResult.iterations.slice(1).map((snap) => {
    const entry: Record<string, any> = {
      iteration: `t=${snap.iteration}`,
      iterNum: snap.iteration,
    };
    snap.centroids.forEach((c, idx) => {
      entry[`C${c.id}`] = parseFloat((snap.centroidShifts[idx] ?? 0).toFixed(4));
    });
    return entry;
  });

  // Calculate total path distance traveled per centroid
  const totalTravel = runResult.iterations[0].centroids.map((_, cId) => {
    let dist = 0;
    for (let i = 1; i < runResult.iterations.length; i++) {
      const prev = runResult.iterations[i - 1].centroids[cId].coordinates;
      const curr = runResult.iterations[i].centroids[cId].coordinates;
      dist += euclideanDistance(prev, curr);
    }
    return {
      id: cId,
      color: getClusterColor(cId),
      totalDistance: parseFloat(dist.toFixed(4)),
      finalShift: parseFloat((runResult.finalIteration.centroidShifts[cId] ?? 0).toFixed(5)),
    };
  });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '20px', height: '100%' }}>
      {/* Left: 3D Trajectory Hero */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ flex: 1, minHeight: '520px', position: 'relative' }}>
          <ThreeScatterPlot
            data={data}
            features={features}
            currentSnapshot={currentSnapshot}
            allSnapshots={runResult.iterations}
            currentIteration={currentIteration}
            normalizationBounds={runResult.normalizationBounds}
            isolatedCluster={isolatedCluster}
            showTrajectories={true}
            showDistanceRays={false}
            showHulls={false}
            showGrid={true}
            pointSize={1.2}
            height="100%"
          />

          <div
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              background: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(8px)',
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid #334155',
              fontSize: '12px',
              color: '#f8fafc',
            }}
          >
            <strong>Centroid 3D Paths</strong> (Iteration 0 → {currentIteration})
          </div>
        </div>
      </div>

      {/* Right: Convergence Magnitude & Travel Statistics */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
        {/* Movement Magnitude Line Chart */}
        <div
          style={{
            background: '#0d111a',
            border: '1px solid #1e293b',
            borderRadius: '10px',
            padding: '18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <TrendingDown size={18} color="#00e0ba" />
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
              Centroid Shift Magnitude (Δμ)
            </h3>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '12px', margin: '0 0 12px 0' }}>
            Euclidean distance shifted per iteration. Rapid decay towards zero demonstrates algorithmic convergence:
          </p>

          <div style={{ height: '200px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={movementChartData}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis dataKey="iteration" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ background: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px', color: '#fff' }}
                />
                {totalTravel.map((c) => (
                  <Line
                    key={c.id}
                    type="monotone"
                    dataKey={`C${c.id}`}
                    name={`Cluster ${c.id}`}
                    stroke={c.color}
                    strokeWidth={2}
                    dot={{ fill: c.color, r: 3 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Travel Summary Table */}
        <div
          style={{
            background: '#0d111a',
            border: '1px solid #1e293b',
            borderRadius: '10px',
            padding: '18px',
          }}
        >
          <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc', margin: '0 0 12px 0' }}>
            Trajectory Migration Summary
          </h4>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ color: '#64748b', borderBottom: '1px solid #1e293b', textAlign: 'left' }}>
                <th style={{ padding: '8px' }}>Centroid</th>
                <th style={{ padding: '8px' }}>Total Traveled</th>
                <th style={{ padding: '8px' }}>Final Δμ</th>
                <th style={{ padding: '8px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {totalTravel.map((c) => {
                const isIso = isolatedCluster === c.id;
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid #131824', color: '#cbd5e1' }}>
                    <td style={{ padding: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: c.color }} />
                      Cluster {c.id}
                    </td>
                    <td style={{ padding: '8px', fontFamily: 'monospace', color: '#00e0ba' }}>
                      {c.totalDistance}
                    </td>
                    <td style={{ padding: '8px', fontFamily: 'monospace', color: '#94a3b8' }}>
                      {c.finalShift}
                    </td>
                    <td style={{ padding: '8px' }}>
                      <button
                        onClick={() => setIsolatedCluster(isIso ? null : c.id)}
                        style={{
                          background: isIso ? c.color : '#1e293b',
                          color: isIso ? '#000' : '#f8fafc',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '2px 8px',
                          fontSize: '11px',
                          cursor: 'pointer',
                        }}
                      >
                        {isIso ? 'Isolating' : 'Isolate'}
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
