import React, { useState } from 'react';
import { ThreeScatterPlot } from '../ThreeScatterPlot';
import {
  KMeansRunResult,
  predictQueryPoint,
  normalizeTo3D,
} from '../../utils/kmeans';
import { Sparkles, HelpCircle, Award, Target, RefreshCw } from 'lucide-react';

interface PredictionExplorerViewProps {
  data: Record<string, number>[];
  features: [string, string, string];
  runResult: KMeansRunResult;
}

export const PredictionExplorerView: React.FC<PredictionExplorerViewProps> = ({
  data,
  features,
  runResult,
}) => {
  const bounds = runResult.normalizationBounds;
  const centroids = runResult.finalIteration.centroids;

  // Initialize query coords at center of bounds
  const [queryValues, setQueryValues] = useState<[number, number, number]>([
    parseFloat(((bounds.min[0] + bounds.max[0]) / 2).toFixed(2)),
    parseFloat(((bounds.min[1] + bounds.max[1]) / 2).toFixed(2)),
    parseFloat(((bounds.min[2] + bounds.max[2]) / 2).toFixed(2)),
  ]);

  // Compute prediction
  const prediction = predictQueryPoint(queryValues, centroids);
  const normalizedQueryCoords = normalizeTo3D(queryValues, bounds.min, bounds.max);

  const resetToSample = () => {
    if (data.length > 0) {
      const row = data[Math.floor(Math.random() * data.length)];
      setQueryValues([
        parseFloat((row[features[0]] ?? 0).toFixed(2)),
        parseFloat((row[features[1]] ?? 0).toFixed(2)),
        parseFloat((row[features[2]] ?? 0).toFixed(2)),
      ]);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px', height: '100%' }}>
      {/* Left: 3D Scene with Interactive Query Marker and Centroid Rays */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ flex: 1, minHeight: '520px', position: 'relative' }}>
          <ThreeScatterPlot
            data={data}
            features={features}
            currentSnapshot={runResult.finalIteration}
            allSnapshots={runResult.iterations}
            currentIteration={runResult.totalIterations}
            normalizationBounds={bounds}
            queryPoint={{
              coordinates: normalizedQueryCoords,
              rawCoords: queryValues,
            }}
            showTrajectories={false}
            showDistanceRays={true}
            showHulls={true}
            showGrid={true}
            pointSize={1.4}
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
            🟡 Query Marker live in 3D scene · Adjust feature sliders to reposition
          </div>
        </div>
      </div>

      {/* Right: Interactive 3D Query Sliders & Decision Explanation */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
        {/* Input Sliders Card */}
        <div
          style={{
            background: '#0d111a',
            border: '1px solid #1e293b',
            borderRadius: '10px',
            padding: '18px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Target size={18} color="#00e0ba" />
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
                Query Coordinates
              </h3>
            </div>
            <button
              onClick={resetToSample}
              style={{
                background: '#1e293b',
                color: '#cbd5e1',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '11px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <RefreshCw size={11} /> Pick Random Point
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {features.map((f, i) => {
              const min = bounds.min[i];
              const max = bounds.max[i];
              const step = parseFloat(((max - min) / 100).toFixed(3)) || 0.1;

              return (
                <div key={f}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, color: i === 0 ? '#f87171' : i === 1 ? '#4ade80' : '#60a5fa' }}>
                      {f}:
                    </span>
                    <span style={{ fontFamily: 'monospace', color: '#f8fafc' }}>
                      {queryValues[i]}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={queryValues[i]}
                    onChange={(e) => {
                      const next = [...queryValues] as [number, number, number];
                      next[i] = Number(e.target.value);
                      setQueryValues(next);
                    }}
                    style={{
                      width: '100%',
                      accentColor: '#7c3aed',
                      cursor: 'pointer',
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b' }}>
                    <span>{min}</span>
                    <span>{max}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Prediction Outcome Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.2), rgba(0, 224, 186, 0.2))',
            border: `2px solid ${prediction.winnerCentroid.color}`,
            borderRadius: '10px',
            padding: '18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Award size={20} color={prediction.winnerCentroid.color} />
            <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
              Predicted Assignment: Cluster {prediction.predictedCluster}
            </h4>
          </div>

          <p style={{ color: '#cbd5e1', fontSize: '12px', lineHeight: '1.5', margin: 0 }}>
            Euclidean distance to closest centroid is <strong style={{ color: '#00e0ba' }}>{prediction.minDistance}</strong>.
            Confidence margin over 2nd closest cluster: <strong style={{ color: '#ffcf00' }}>+{prediction.marginToSecond}</strong>.
          </p>
        </div>

        {/* Real-time Distance Ranking Table */}
        <div
          style={{
            background: '#0d111a',
            border: '1px solid #1e293b',
            borderRadius: '10px',
            padding: '16px',
          }}
        >
          <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', margin: '0 0 10px 0' }}>
            Distance to All Centroids ||x - μ_k||
          </h4>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ color: '#64748b', borderBottom: '1px solid #1e293b', textAlign: 'left' }}>
                <th style={{ padding: '6px 8px' }}>Rank</th>
                <th style={{ padding: '6px 8px' }}>Cluster</th>
                <th style={{ padding: '6px 8px' }}>Distance</th>
                <th style={{ padding: '6px 8px' }}>Delta</th>
              </tr>
            </thead>
            <tbody>
              {prediction.allDistances.map((d, idx) => (
                <tr
                  key={d.clusterId}
                  style={{
                    borderBottom: '1px solid #131824',
                    background: idx === 0 ? 'rgba(0, 224, 186, 0.1)' : 'transparent',
                  }}
                >
                  <td style={{ padding: '6px 8px', color: '#94a3b8' }}>#{idx + 1}</td>
                  <td style={{ padding: '6px 8px', fontWeight: idx === 0 ? 700 : 400, color: d.color }}>
                    Cluster {d.clusterId}
                  </td>
                  <td style={{ padding: '6px 8px', fontFamily: 'monospace', color: idx === 0 ? '#00e0ba' : '#cbd5e1' }}>
                    {d.distance}
                  </td>
                  <td style={{ padding: '6px 8px', color: '#64748b' }}>
                    {idx === 0 ? 'Winner' : `+${parseFloat((d.distance - prediction.minDistance).toFixed(3))}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
