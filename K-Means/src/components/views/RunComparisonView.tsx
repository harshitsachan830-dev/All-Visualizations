import React from 'react';
import { KMeansRunResult, KMeansRunConfig } from '../../utils/kmeans';
import { History, ArrowRight, RotateCcw } from 'lucide-react';

interface RunComparisonViewProps {
  runHistory: { id: number; timestamp: string; result: KMeansRunResult }[];
  onRestoreRun: (config: KMeansRunConfig) => void;
}

export const RunComparisonView: React.FC<RunComparisonViewProps> = ({
  runHistory,
  onRestoreRun,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', maxWidth: '1100px' }}>
      <div
        style={{
          background: '#0d111a',
          border: '1px solid #1e293b',
          borderRadius: '12px',
          padding: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <History size={20} color="#7c3aed" />
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
            Session Run History & Multi-Run Comparison
          </h2>
        </div>
        <p style={{ color: '#94a3b8', fontSize: '13px', margin: '4px 0 0 0' }}>
          Compare performance metrics, inertia, silhouette scores, and convergence across different runs and seeds.
        </p>
      </div>

      <div
        style={{
          background: '#0d111a',
          border: '1px solid #1e293b',
          borderRadius: '12px',
          padding: '20px',
        }}
      >
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc', margin: '0 0 14px 0' }}>
          Historical Runs ({runHistory.length})
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ color: '#64748b', borderBottom: '1px solid #1e293b', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px' }}>Run #</th>
                <th style={{ padding: '10px 12px' }}>Timestamp</th>
                <th style={{ padding: '10px 12px' }}>K</th>
                <th style={{ padding: '10px 12px' }}>Init Method</th>
                <th style={{ padding: '10px 12px' }}>Seed</th>
                <th style={{ padding: '10px 12px' }}>Final Inertia</th>
                <th style={{ padding: '10px 12px' }}>Silhouette</th>
                <th style={{ padding: '10px 12px' }}>Iterations</th>
                <th style={{ padding: '10px 12px' }}>Runtime</th>
                <th style={{ padding: '10px 12px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {runHistory.map((item, idx) => {
                const res = item.result;
                const isLatest = idx === runHistory.length - 1;

                return (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: '1px solid #131824',
                      background: isLatest ? 'rgba(124, 58, 237, 0.1)' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: isLatest ? '#a78bfa' : '#cbd5e1' }}>
                      Run #{item.id} {isLatest && '(Current)'}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#94a3b8', fontSize: '11px' }}>
                      {item.timestamp}
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: '#ff3483' }}>
                      {res.config.k}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: '11px', background: '#1e293b', padding: '2px 6px', borderRadius: '4px', color: '#cbd5e1' }}>
                        {res.config.initMethod}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>
                      {res.config.seed}
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#00e0ba' }}>
                      {Math.round(res.finalInertia).toLocaleString()}
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#38bdf8' }}>
                      {res.silhouette.average.toFixed(3)}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {res.totalIterations}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#94a3b8' }}>
                      {res.runtimeMs} ms
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <button
                        onClick={() => onRestoreRun(res.config)}
                        style={{
                          background: '#1e293b',
                          color: '#f8fafc',
                          border: '1px solid #334155',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          fontSize: '11px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <RotateCcw size={11} /> Restore
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
