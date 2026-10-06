import React, { useRef, useState } from 'react';
import { ThreeScatterPlot, ThreeScatterPlotRef } from '../ThreeScatterPlot';
import { KMeansRunResult, IterationSnapshot, getClusterColor } from '../../utils/kmeans';
import { Box, Eye, Layers, Compass, Sliders, RotateCcw } from 'lucide-react';

interface ThreeDExplorerViewProps {
  data: Record<string, number>[];
  features: [string, string, string];
  runResult: KMeansRunResult;
  currentIteration: number;
  currentSnapshot: IterationSnapshot;
  selectedPointIndex: number | null;
  onSelectPoint: (idx: number | null) => void;
  isolatedCluster: number | null;
  onToggleIsolateCluster: (c: number | null) => void;
}

export const ThreeDExplorerView: React.FC<ThreeDExplorerViewProps> = ({
  data,
  features,
  runResult,
  currentIteration,
  currentSnapshot,
  selectedPointIndex,
  onSelectPoint,
  isolatedCluster,
  onToggleIsolateCluster,
}) => {
  const plotRef = useRef<ThreeScatterPlotRef>(null);

  // Layer toggles
  const [showTrajectories, setShowTrajectories] = useState(true);
  const [showDistanceRays, setShowDistanceRays] = useState(true);
  const [showHulls, setShowHulls] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [pointSize, setPointSize] = useState(1.6);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', height: '100%' }}>
      {/* Top Toolbar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          background: '#0d111a',
          border: '1px solid #1e293b',
          borderRadius: '10px',
          padding: '10px 16px',
        }}
      >
        {/* Layer Toggles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Layers size={14} /> Layers:
          </span>

          {[
            { label: 'Trajectories', active: showTrajectories, toggle: () => setShowTrajectories(!showTrajectories) },
            { label: 'Distance Rays', active: showDistanceRays, toggle: () => setShowDistanceRays(!showDistanceRays) },
            { label: 'Cluster Hulls', active: showHulls, toggle: () => setShowHulls(!showHulls) },
            { label: '3D Floor Grid', active: showGrid, toggle: () => setShowGrid(!showGrid) },
          ].map((l) => (
            <button
              key={l.label}
              onClick={l.toggle}
              style={{
                background: l.active ? 'rgba(124, 58, 237, 0.25)' : '#1e293b',
                color: l.active ? '#c084fc' : '#94a3b8',
                border: `1px solid ${l.active ? '#7c3aed' : '#334155'}`,
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '11px',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              {l.active ? '✓ ' : ''}{l.label}
            </button>
          ))}
        </div>

        {/* Point Size Slider & Camera presets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Point Size:</span>
            <input
              type="range"
              min={0.8}
              max={3.5}
              step={0.2}
              value={pointSize}
              onChange={(e) => setPointSize(Number(e.target.value))}
              style={{ width: '80px', accentColor: '#7c3aed', cursor: 'pointer' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '4px' }}>
            {(['iso', 'top', 'front', 'side'] as const).map((preset) => (
              <button
                key={preset}
                onClick={() => plotRef.current?.setCameraPreset(preset)}
                style={{
                  background: '#1e293b',
                  color: '#f8fafc',
                  border: '1px solid #334155',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {preset}
              </button>
            ))}
            <button
              onClick={() => plotRef.current?.toggleAutoRotate()}
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
              title="Toggle Auto-Rotation"
            >
              🔄 Auto-Rotate
            </button>
            <button
              onClick={() => plotRef.current?.resetCamera()}
              style={{
                background: '#1e293b',
                color: '#cbd5e1',
                border: '1px solid #334155',
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '11px',
                cursor: 'pointer',
              }}
              title="Reset View"
            >
              <RotateCcw size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Full Dedicated 3D Canvas */}
      <div style={{ flex: 1, minHeight: '620px', position: 'relative' }}>
        <ThreeScatterPlot
          ref={plotRef}
          data={data}
          features={features}
          currentSnapshot={currentSnapshot}
          allSnapshots={runResult.iterations}
          currentIteration={currentIteration}
          normalizationBounds={runResult.normalizationBounds}
          selectedPointIndex={selectedPointIndex}
          onSelectPoint={onSelectPoint}
          isolatedCluster={isolatedCluster}
          showTrajectories={showTrajectories}
          showDistanceRays={showDistanceRays}
          showHulls={showHulls}
          showGrid={showGrid}
          pointSize={pointSize}
          height="100%"
        />

        {/* Floating Cluster Filter Palette */}
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            right: '16px',
            background: 'rgba(15, 23, 42, 0.9)',
            backdropFilter: 'blur(10px)',
            border: '1px solid #334155',
            borderRadius: '10px',
            padding: '10px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            zIndex: 10,
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>
            Filter by Cluster:
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', maxWidth: '300px' }}>
            {currentSnapshot.centroids.map((c) => {
              const isIso = isolatedCluster === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => onToggleIsolateCluster(isIso ? null : c.id)}
                  style={{
                    background: isIso ? c.color : '#1e293b',
                    color: isIso ? '#000000' : '#f8fafc',
                    fontWeight: isIso ? 700 : 500,
                    border: `1px solid ${c.color}`,
                    borderRadius: '5px',
                    padding: '3px 8px',
                    fontSize: '11px',
                    cursor: 'pointer',
                  }}
                >
                  Cluster {c.id}
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
                  borderRadius: '5px',
                  padding: '3px 8px',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                Reset Filter
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
