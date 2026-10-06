import React from 'react';
import { ThreeScatterPlot } from '../ThreeScatterPlot';
import {
  KMeansRunResult,
  IterationSnapshot,
  getClusterColor,
} from '../../utils/kmeans';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Sparkles,
  Layers,
  Activity,
  CheckCircle2,
  Clock,
  Hash,
} from 'lucide-react';

interface OverviewViewProps {
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
  elbowData: { k: number; inertia: number }[];
  onNavigateTab: (tabId: string) => void;
  isolatedCluster: number | null;
  onToggleIsolateCluster: (c: number | null) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
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
  elbowData,
  onNavigateTab,
  isolatedCluster,
  onToggleIsolateCluster,
}) => {
  const finalIter = runResult.finalIteration;
  const isFinished = currentSnapshot.isConverged || currentIteration >= runResult.totalIterations;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
      {/* KPI Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
        }}
      >
        <div className="kpi-card" onClick={() => onNavigateTab('elbow')} style={{ cursor: 'pointer' }}>
          <div className="kpi-header">
            <span className="kpi-title">Inertia (WCSS)</span>
            <Activity size={16} color="#00e0ba" />
          </div>
          <div className="kpi-val" style={{ color: '#00e0ba' }}>
            {Math.round(currentSnapshot.inertia || finalIter.inertia).toLocaleString()}
          </div>
          <div className="kpi-sub">Within-cluster sum of squares</div>
        </div>

        <div className="kpi-card" onClick={() => onNavigateTab('silhouette')} style={{ cursor: 'pointer' }}>
          <div className="kpi-header">
            <span className="kpi-title">Silhouette Score</span>
            <Sparkles size={16} color="#7c3aed" />
          </div>
          <div className="kpi-val" style={{ color: '#a78bfa' }}>
            {runResult.silhouette.average.toFixed(3)}
          </div>
          <div className="kpi-sub">
            {runResult.silhouette.average > 0.5 ? 'Strong separation' : 'Moderate clustering'}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Iterations</span>
            <Hash size={16} color="#38bdf8" />
          </div>
          <div className="kpi-val" style={{ color: '#38bdf8' }}>
            {currentIteration} <span style={{ fontSize: '14px', color: '#64748b' }}>/ {runResult.totalIterations}</span>
          </div>
          <div className="kpi-sub">
            {runResult.converged ? 'Stabilized within tolerance' : 'Max iterations reached'}
          </div>
        </div>

        <div className="kpi-card" onClick={() => onNavigateTab('cluster-analysis')} style={{ cursor: 'pointer' }}>
          <div className="kpi-header">
            <span className="kpi-title">Clusters (K)</span>
            <Layers size={16} color="#ff3483" />
          </div>
          <div className="kpi-val" style={{ color: '#ff3483' }}>
            {runResult.config.k}
          </div>
          <div className="kpi-sub">{data.length} total data points</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Compute Runtime</span>
            <Clock size={16} color="#ffcf00" />
          </div>
          <div className="kpi-val" style={{ color: '#ffcf00' }}>
            {runResult.runtimeMs} ms
          </div>
          <div className="kpi-sub">Local browser WebGL</div>
        </div>
      </div>

      {/* Main Hero 3D Section */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 340px',
          gap: '20px',
          flex: 1,
          minHeight: '520px',
        }}
      >
        {/* Left: 3D Scatter + Playback Bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ flex: 1, minHeight: '440px', position: 'relative' }}>
            <ThreeScatterPlot
              data={data}
              features={features}
              currentSnapshot={currentSnapshot}
              allSnapshots={runResult.iterations}
              currentIteration={currentIteration}
              normalizationBounds={runResult.normalizationBounds}
              isolatedCluster={isolatedCluster}
              showTrajectories={true}
              showDistanceRays={true}
              showHulls={false}
              showGrid={true}
              height="100%"
            />

            {/* Cluster Legend overlay */}
            <div
              style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                display: 'flex',
                gap: '6px',
                flexWrap: 'wrap',
                background: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(8px)',
                padding: '6px 10px',
                borderRadius: '8px',
                border: '1px solid #334155',
                zIndex: 10,
              }}
            >
              {currentSnapshot.centroids.map((c) => {
                const isSelected = isolatedCluster === c.id;
                const count = currentSnapshot.clusterSizes[c.id] ?? 0;
                return (
                  <button
                    key={c.id}
                    onClick={() => onToggleIsolateCluster(isSelected ? null : c.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      background: isSelected ? c.color : '#1e293b',
                      color: isSelected ? '#000000' : '#f8fafc',
                      fontWeight: isSelected ? 700 : 500,
                      border: `1px solid ${c.color}`,
                      borderRadius: '5px',
                      padding: '3px 8px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    title={`Click to isolate Cluster ${c.id}`}
                  >
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: isSelected ? '#000000' : c.color,
                      }}
                    />
                    C{c.id} ({count})
                  </button>
                );
              })}
              {isolatedCluster !== null && (
                <button
                  onClick={() => onToggleIsolateCluster(null)}
                  style={{
                    background: '#334155',
                    color: '#cbd5e1',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '3px 7px',
                    fontSize: '10px',
                    cursor: 'pointer',
                  }}
                >
                  Show All
                </button>
              )}
            </div>
          </div>

          {/* Iteration Rail & Scrubber Controls */}
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
                title="Previous Iteration"
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
                title={isPlaying ? 'Pause' : 'Play K-Means Iteration Loop'}
              >
                {isPlaying ? <Pause size={15} /> : <Play size={15} />}
              </button>
              <button
                className="ctrl-btn"
                onClick={() => onIterationChange(Math.min(runResult.totalIterations, currentIteration + 1))}
                disabled={currentIteration >= runResult.totalIterations || isPlaying}
                title="Next Iteration"
              >
                <SkipForward size={14} />
              </button>
              <button
                className="ctrl-btn"
                onClick={onReset}
                disabled={isPlaying}
                title="Reset to Iteration 0"
              >
                <RotateCcw size={14} />
              </button>
            </div>

            {/* Slider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
              <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
                t={currentIteration}
              </span>
              <input
                type="range"
                min={0}
                max={runResult.totalIterations}
                value={currentIteration}
                onChange={(e) => onIterationChange(Number(e.target.value))}
                style={{
                  flex: 1,
                  accentColor: '#7c3aed',
                  cursor: 'pointer',
                }}
              />
              <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
                max={runResult.totalIterations}
              </span>
            </div>

            {/* Speed Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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

        {/* Right: Narrative + Analytical Mini Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Lloyd's Process Card */}
          <div
            style={{
              background: '#0d111a',
              border: '1px solid #1e293b',
              borderRadius: '10px',
              padding: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Sparkles size={16} color="#a78bfa" />
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
                Algorithm Step Narrative
              </h3>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '10px',
              }}
            >
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
              {isFinished && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#4ade80', fontSize: '11px' }}>
                  <CheckCircle2 size={13} /> Converged
                </span>
              )}
            </div>

            <p style={{ color: '#cbd5e1', fontSize: '12px', lineHeight: '1.6', margin: 0 }}>
              {currentSnapshot.phaseNarrative}
            </p>

            {/* Stepper pills */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '6px',
                marginTop: '14px',
              }}
            >
              {[
                { label: '0. Init', active: currentIteration === 0 },
                { label: '1. Assign', active: currentIteration > 0 && !isFinished },
                { label: '2. Mean', active: currentIteration > 0 && !isFinished },
              ].map((step, idx) => (
                <div
                  key={idx}
                  style={{
                    background: step.active ? 'rgba(124, 58, 237, 0.25)' : '#131824',
                    border: `1px solid ${step.active ? '#7c3aed' : '#1e293b'}`,
                    color: step.active ? '#e9d5ff' : '#64748b',
                    padding: '4px 6px',
                    borderRadius: '5px',
                    fontSize: '10px',
                    textAlign: 'center',
                    fontWeight: 500,
                  }}
                >
                  {step.label}
                </div>
              ))}
            </div>
          </div>

          {/* Mini Elbow Chart */}
          <div
            style={{
              background: '#0d111a',
              border: '1px solid #1e293b',
              borderRadius: '10px',
              padding: '14px',
              cursor: 'pointer',
              transition: 'border 0.2s',
            }}
            onClick={() => onNavigateTab('elbow')}
            title="Click to view full Elbow Analysis"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc' }}>
                Elbow Curve (K vs WCSS)
              </span>
              <span style={{ fontSize: '10px', color: '#7c3aed' }}>View Page →</span>
            </div>
            <div style={{ height: '100px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={elbowData}>
                  <XAxis dataKey="k" stroke="#475569" fontSize={10} tickLine={false} />
                  <YAxis hide domain={['dataMin', 'dataMax']} />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', borderColor: '#334155', borderRadius: '6px', fontSize: '11px' }}
                    labelFormatter={(k) => `K = ${k}`}
                    formatter={(val: any) => [Number(val).toLocaleString(), 'Inertia']}
                  />
                  <Line
                    type="monotone"
                    dataKey="inertia"
                    stroke="#00e0ba"
                    strokeWidth={2}
                    dot={{ fill: '#00e0ba', r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Mini Silhouette Scores */}
          <div
            style={{
              background: '#0d111a',
              border: '1px solid #1e293b',
              borderRadius: '10px',
              padding: '14px',
              cursor: 'pointer',
            }}
            onClick={() => onNavigateTab('silhouette')}
            title="Click to view full Silhouette Analysis"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc' }}>
                Cluster Silhouette Scores
              </span>
              <span style={{ fontSize: '10px', color: '#7c3aed' }}>View Page →</span>
            </div>
            <div style={{ height: '90px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={Object.entries(runResult.silhouette.clusterScores).map(([cid, score]) => ({
                    cluster: `C${cid}`,
                    id: Number(cid),
                    score,
                  }))}
                  layout="vertical"
                >
                  <XAxis type="number" domain={[-0.2, 1]} hide />
                  <YAxis type="category" dataKey="cluster" stroke="#94a3b8" fontSize={10} width={28} />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', borderColor: '#334155', borderRadius: '6px', fontSize: '11px' }}
                    formatter={(val: any) => [val, 'Silhouette']}
                  />
                  <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                    {Object.entries(runResult.silhouette.clusterScores).map(([cid]) => (
                      <Cell key={cid} fill={getClusterColor(Number(cid))} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
