import React from 'react';
import { ThreeScatterPlot } from '../ThreeScatterPlot';
import { KMeansRunResult, IterationSnapshot } from '../../utils/kmeans';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, Activity, CheckCircle, Info } from 'lucide-react';

interface ClusteringProcessViewProps {
  data: Record<string, number>[];
  features: [string, string, string];
  runResult: KMeansRunResult;
  currentIteration: number;
  currentSnapshot: IterationSnapshot;
  isPlaying: boolean;
  playSpeed: number;
  onPlayToggle: () => void;
  onIterationChange: (iter: number) => void;
  onSpeedChange: (speed: number) => void;
  onReset: () => void;
}

export const ClusteringProcessView: React.FC<ClusteringProcessViewProps> = ({
  data,
  features,
  runResult,
  currentIteration,
  currentSnapshot,
  isPlaying,
  playSpeed,
  onPlayToggle,
  onIterationChange,
  onSpeedChange,
  onReset,
}) => {
  const isFinished = currentSnapshot.isConverged || currentIteration >= runResult.totalIterations;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px', height: '100%' }}>
      {/* Left: 3D Scene + Scrubber */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ flex: 1, minHeight: '480px', position: 'relative' }}>
          <ThreeScatterPlot
            data={data}
            features={features}
            currentSnapshot={currentSnapshot}
            allSnapshots={runResult.iterations}
            currentIteration={currentIteration}
            normalizationBounds={runResult.normalizationBounds}
            showTrajectories={true}
            showDistanceRays={true}
            showHulls={false}
            showGrid={true}
            height="100%"
          />
        </div>

        {/* Player Controls Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            background: '#0d111a',
            border: '1px solid #1e293b',
            padding: '12px 18px',
            borderRadius: '10px',
          }}
        >
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              className="ctrl-btn"
              onClick={() => onIterationChange(Math.max(0, currentIteration - 1))}
              disabled={currentIteration === 0 || isPlaying}
              title="Previous Step"
            >
              <SkipBack size={14} />
            </button>
            <button
              className="ctrl-btn play-active"
              onClick={onPlayToggle}
              style={{
                background: isPlaying ? '#ff3483' : '#7c3aed',
                color: '#ffffff',
              }}
              title={isPlaying ? 'Pause' : 'Play Lloyd Loop'}
            >
              {isPlaying ? <Pause size={15} /> : <Play size={15} />}
            </button>
            <button
              className="ctrl-btn"
              onClick={() => onIterationChange(Math.min(runResult.totalIterations, currentIteration + 1))}
              disabled={currentIteration >= runResult.totalIterations || isPlaying}
              title="Next Step"
            >
              <SkipForward size={14} />
            </button>
            <button
              className="ctrl-btn"
              onClick={onReset}
              disabled={isPlaying}
              title="Reset"
            >
              <RotateCcw size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
            <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
              Iter {currentIteration}
            </span>
            <input
              type="range"
              min={0}
              max={runResult.totalIterations}
              value={currentIteration}
              onChange={(e) => onIterationChange(Number(e.target.value))}
              style={{ flex: 1, accentColor: '#7c3aed', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
              of {runResult.totalIterations}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '4px' }}>
            {[0.5, 1, 2, 4].map((spd) => (
              <button
                key={spd}
                onClick={() => onSpeedChange(spd)}
                style={{
                  background: playSpeed === spd ? '#7c3aed' : '#1e293b',
                  color: playSpeed === spd ? '#ffffff' : '#94a3b8',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '3px 7px',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Step-by-Step Educational Narrative & Iteration Audit Log */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
        {/* Current State Card */}
        <div
          style={{
            background: '#0d111a',
            border: '1px solid #1e293b',
            borderRadius: '10px',
            padding: '18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
              Phase {currentIteration === 0 ? '0' : currentIteration} of {runResult.totalIterations}
            </span>
            <span
              style={{
                background: isFinished ? 'rgba(34, 197, 94, 0.2)' : 'rgba(124, 58, 237, 0.2)',
                color: isFinished ? '#4ade80' : '#c084fc',
                border: `1px solid ${isFinished ? '#22c55e' : '#7c3aed'}`,
                borderRadius: '12px',
                padding: '2px 8px',
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
              }}
            >
              {currentSnapshot.phase}
            </span>
          </div>

          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#f8fafc', margin: '0 0 8px 0' }}>
            {currentIteration === 0
              ? 'Seeding Starting Centroids'
              : isFinished
              ? 'Centroid Stability Achieved'
              : 'Partitioning & Centroid Migration'}
          </h3>

          <p style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: '1.6', margin: 0 }}>
            {currentSnapshot.phaseNarrative}
          </p>

          <div
            style={{
              marginTop: '16px',
              padding: '12px',
              background: '#131824',
              borderRadius: '8px',
              border: '1px solid #1e293b',
              fontSize: '12px',
              color: '#94a3b8',
              lineHeight: '1.5',
            }}
          >
            <div style={{ color: '#f8fafc', fontWeight: 600, marginBottom: '4px' }}>
              Lloyd's Algorithm Invariant:
            </div>
            In each iteration, points are assigned to the nearest centroid under Euclidean distance:
            <div style={{ fontFamily: 'monospace', color: '#00e0ba', margin: '4px 0' }}>
              arg min_k ||x_i - μ_k||²
            </div>
            Then centroids are updated to the mean of their assigned cluster points:
            <div style={{ fontFamily: 'monospace', color: '#ff3483', margin: '4px 0' }}>
              μ_k = (1 / |S_k|) ∑_{'{x ∈ S_k}'} x
            </div>
          </div>
        </div>

        {/* Iteration Audit Table */}
        <div
          style={{
            background: '#0d111a',
            border: '1px solid #1e293b',
            borderRadius: '10px',
            padding: '16px',
            flex: 1,
          }}
        >
          <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', margin: '0 0 10px 0' }}>
            Iteration Convergence History
          </h4>

          <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
              <thead>
                <tr style={{ color: '#64748b', borderBottom: '1px solid #1e293b' }}>
                  <th style={{ padding: '6px 8px' }}>Iter</th>
                  <th style={{ padding: '6px 8px' }}>WCSS</th>
                  <th style={{ padding: '6px 8px' }}>Max Shift</th>
                  <th style={{ padding: '6px 8px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {runResult.iterations.map((snap) => {
                  const maxShift = snap.centroidShifts.length > 0 ? Math.max(...snap.centroidShifts) : 0;
                  const isCurrent = snap.iteration === currentIteration;

                  return (
                    <tr
                      key={snap.iteration}
                      onClick={() => onIterationChange(snap.iteration)}
                      style={{
                        background: isCurrent ? 'rgba(124, 58, 237, 0.2)' : 'transparent',
                        cursor: 'pointer',
                        borderBottom: '1px solid #131824',
                      }}
                    >
                      <td style={{ padding: '6px 8px', fontWeight: isCurrent ? 700 : 400, color: isCurrent ? '#c084fc' : '#cbd5e1' }}>
                        t={snap.iteration}
                      </td>
                      <td style={{ padding: '6px 8px', fontFamily: 'monospace', color: '#00e0ba' }}>
                        {Math.round(snap.inertia).toLocaleString()}
                      </td>
                      <td style={{ padding: '6px 8px', fontFamily: 'monospace', color: '#94a3b8' }}>
                        {maxShift.toFixed(4)}
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        {snap.isConverged ? (
                          <span style={{ color: '#4ade80' }}>✓ Done</span>
                        ) : (
                          <span style={{ color: '#64748b' }}>active</span>
                        )}
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
