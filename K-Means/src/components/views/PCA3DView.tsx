import React, { useMemo } from 'react';
import { ThreeScatterPlot } from '../ThreeScatterPlot';
import {
  KMeansRunResult,
  computePCA3D,
  runKMeans,
  IterationSnapshot,
} from '../../utils/kmeans';
import { Network, Sparkles, AlertCircle, Info } from 'lucide-react';

interface PCA3DViewProps {
  data: Record<string, number>[];
  allNumericFeatures: string[];
  runResult: KMeansRunResult;
}

export const PCA3DView: React.FC<PCA3DViewProps> = ({
  data,
  allNumericFeatures,
  runResult,
}) => {
  // Compute PCA projection
  const pca = useMemo(() => {
    return computePCA3D(data, allNumericFeatures);
  }, [data, allNumericFeatures]);

  // Run K-Means on projected 3D data with current K config
  const pcaRunResult = useMemo(() => {
    return runKMeans(pca.projectedData, ['PC1', 'PC2', 'PC3'], {
      k: runResult.config.k,
      initMethod: 'k-means++',
      maxIterations: 40,
      tolerance: 1e-4,
      seed: runResult.config.seed,
    });
  }, [pca.projectedData, runResult.config.k, runResult.config.seed]);

  const [ev1, ev2, ev3] = pca.explainedVarianceRatio;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '20px', height: '100%' }}>
      {/* Left: 3D PCA Space */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ flex: 1, minHeight: '520px', position: 'relative' }}>
          <ThreeScatterPlot
            data={pca.projectedData}
            features={['PC1', 'PC2', 'PC3']}
            currentSnapshot={pcaRunResult.finalIteration}
            allSnapshots={pcaRunResult.iterations}
            currentIteration={pcaRunResult.totalIterations}
            normalizationBounds={pcaRunResult.normalizationBounds}
            showTrajectories={true}
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
              border: '1px solid #7c3aed',
              fontSize: '12px',
              color: '#f8fafc',
            }}
          >
            <strong>PCA 3D Space</strong> (PC1, PC2, PC3 Linear Combinations)
          </div>
        </div>
      </div>

      {/* Right: Explained Variance & Projection Details */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
        {/* Notice Card */}
        <div
          style={{
            background: 'rgba(124, 58, 237, 0.15)',
            border: '1px solid #7c3aed',
            borderRadius: '10px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Network size={18} color="#a78bfa" />
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
              Principal Component Projection
            </h3>
          </div>
          <p style={{ color: '#cbd5e1', fontSize: '12px', lineHeight: '1.5', margin: 0 }}>
            Note: The 3D coordinates shown are <strong>orthogonal linear combinations</strong> of all {allNumericFeatures.length} original features ({allNumericFeatures.join(', ')}), oriented along directions of maximal dataset variance.
          </p>
        </div>

        {/* Explained Variance Breakdown */}
        <div
          style={{
            background: '#0d111a',
            border: '1px solid #1e293b',
            borderRadius: '10px',
            padding: '18px',
          }}
        >
          <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc', margin: '0 0 14px 0' }}>
            Explained Variance Ratio
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { label: 'PC1 (Max Variance)', val: ev1, color: '#00e0ba' },
              { label: 'PC2 (Orthogonal 2nd)', val: ev2, color: '#7c3aed' },
              { label: 'PC3 (Orthogonal 3rd)', val: ev3, color: '#ff3483' },
            ].map((pc) => (
              <div key={pc.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ color: '#cbd5e1' }}>{pc.label}</span>
                  <span style={{ fontWeight: 600, color: pc.color }}>{(pc.val * 100).toFixed(1)}%</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: '#1e293b', borderRadius: '3px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${Math.min(100, pc.val * 100)}%`,
                      height: '100%',
                      background: pc.color,
                      borderRadius: '3px',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: '16px',
              padding: '12px',
              background: '#131824',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Cumulative 3D Variance:</span>
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#4ade80' }}>
              {(pca.totalExplainedVariance * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Input Features List */}
        <div
          style={{
            background: '#0d111a',
            border: '1px solid #1e293b',
            borderRadius: '10px',
            padding: '16px',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '8px' }}>
            Included High-D Features ({allNumericFeatures.length}):
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {allNumericFeatures.map((f) => (
              <span
                key={f}
                style={{
                  background: '#131824',
                  border: '1px solid #334155',
                  borderRadius: '4px',
                  padding: '3px 8px',
                  fontSize: '11px',
                  color: '#cbd5e1',
                }}
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
