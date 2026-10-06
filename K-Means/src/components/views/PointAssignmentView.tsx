import React, { useState } from 'react';
import { ThreeScatterPlot } from '../ThreeScatterPlot';
import { KMeansRunResult, IterationSnapshot, euclideanDistance } from '../../utils/kmeans';
import { Crosshair, Award, ArrowRight, Compass } from 'lucide-react';

interface PointAssignmentViewProps {
  data: Record<string, number>[];
  features: [string, string, string];
  runResult: KMeansRunResult;
  currentIteration: number;
  currentSnapshot: IterationSnapshot;
  selectedPointIndex: number | null;
  onSelectPoint: (idx: number | null) => void;
}

export const PointAssignmentView: React.FC<PointAssignmentViewProps> = ({
  data,
  features,
  runResult,
  currentIteration,
  currentSnapshot,
  selectedPointIndex,
  onSelectPoint,
}) => {
  const activeIndex = selectedPointIndex !== null && selectedPointIndex < data.length ? selectedPointIndex : 0;
  const activeRow = data[activeIndex] || {};
  const activeCoords = features.map((f) => activeRow[f] ?? 0);
  const centroids = currentSnapshot.centroids;

  // Calculate distance from active point to all centroids
  const distances = centroids.map((c) => {
    const d = euclideanDistance(activeCoords, c.coordinates);
    return {
      id: c.id,
      color: c.color,
      coords: c.coordinates,
      dist: parseFloat(d.toFixed(4)),
    };
  });

  distances.sort((a, b) => a.dist - b.dist);
  const winner = distances[0];
  const second = distances[1] || distances[0];
  const margin = parseFloat((second.dist - winner.dist).toFixed(4));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px', height: '100%' }}>
      {/* Left: 3D Scene with Active Point and Distance Rays */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ flex: 1, minHeight: '520px', position: 'relative' }}>
          <ThreeScatterPlot
            data={data}
            features={features}
            currentSnapshot={currentSnapshot}
            allSnapshots={runResult.iterations}
            currentIteration={currentIteration}
            normalizationBounds={runResult.normalizationBounds}
            selectedPointIndex={activeIndex}
            onSelectPoint={onSelectPoint}
            showTrajectories={false}
            showDistanceRays={true}
            showHulls={false}
            showGrid={true}
            pointSize={1.5}
            height="100%"
          />

          <div
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              background: 'rgba(15, 23, 42, 0.9)',
              backdropFilter: 'blur(8px)',
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid #334155',
              fontSize: '12px',
              color: '#f8fafc',
            }}
          >
            Inspecting Point <strong style={{ color: '#00e0ba' }}>#{activeIndex}</strong> · Click any point in 3D to inspect
          </div>
        </div>
      </div>

      {/* Right: Point Selector & Distance Breakdown Table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
        {/* Point Selection Widget */}
        <div
          style={{
            background: '#0d111a',
            border: '1px solid #1e293b',
            borderRadius: '10px',
            padding: '18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Crosshair size={18} color="#7c3aed" />
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
              Point Inspector
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Point ID:</span>
            <input
              type="number"
              min={0}
              max={data.length - 1}
              value={activeIndex}
              onChange={(e) => {
                const val = Math.max(0, Math.min(data.length - 1, Number(e.target.value)));
                onSelectPoint(val);
              }}
              style={{
                width: '80px',
                background: '#131824',
                border: '1px solid #334155',
                borderRadius: '6px',
                color: '#f8fafc',
                padding: '6px 10px',
                fontSize: '13px',
              }}
            />
            <span style={{ fontSize: '11px', color: '#64748b' }}>of {data.length - 1}</span>
          </div>

          <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
            <strong>Raw Coordinates:</strong>
            <div
              style={{
                fontFamily: 'monospace',
                background: '#131824',
                padding: '8px 12px',
                borderRadius: '6px',
                marginTop: '4px',
                color: '#f8fafc',
              }}
            >
              {features.map((f, i) => `${f}: ${activeCoords[i]}`).join(' | ')}
            </div>
          </div>
        </div>

        {/* Winner Decision Card */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.15), rgba(0, 224, 186, 0.15))',
            border: '1px solid #7c3aed',
            borderRadius: '10px',
            padding: '18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Award size={18} color="#00e0ba" />
            <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
              Assigned Winner: Cluster {winner.id}
            </h4>
          </div>

          <p style={{ color: '#cbd5e1', fontSize: '12px', lineHeight: '1.5', margin: 0 }}>
            Minimum Euclidean distance is <strong style={{ color: '#00e0ba' }}>{winner.dist}</strong> to Centroid {winner.id}.
            Margin of separation over 2nd candidate (Cluster {second.id}) is <strong>+{margin}</strong>.
          </p>
        </div>

        {/* Distance to Each Centroid Table */}
        <div
          style={{
            background: '#0d111a',
            border: '1px solid #1e293b',
            borderRadius: '10px',
            padding: '18px',
          }}
        >
          <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', margin: '0 0 10px 0' }}>
            Distance to All Centroids ||x - μ_k||
          </h4>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ color: '#64748b', borderBottom: '1px solid #1e293b', textAlign: 'left' }}>
                <th style={{ padding: '8px' }}>Cluster</th>
                <th style={{ padding: '8px' }}>Distance</th>
                <th style={{ padding: '8px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {distances.map((d, rank) => {
                const isWinner = rank === 0;
                return (
                  <tr
                    key={d.id}
                    style={{
                      borderBottom: '1px solid #131824',
                      background: isWinner ? 'rgba(0, 224, 186, 0.1)' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '8px', fontWeight: isWinner ? 700 : 400, color: d.color }}>
                      Cluster {d.id}
                    </td>
                    <td style={{ padding: '8px', fontFamily: 'monospace', color: isWinner ? '#00e0ba' : '#cbd5e1' }}>
                      {d.dist}
                    </td>
                    <td style={{ padding: '8px' }}>
                      {isWinner ? (
                        <span style={{ color: '#00e0ba', fontWeight: 600 }}>Winner (Min)</span>
                      ) : (
                        <span style={{ color: '#64748b' }}>+{parseFloat((d.dist - winner.dist).toFixed(4))}</span>
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
  );
};
