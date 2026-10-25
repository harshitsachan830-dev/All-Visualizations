import React, { useMemo, useState } from 'react';
import { ThreeScatterPlot } from './ThreeScatterPlot';
import {
  runKMeans,
  KMeansRunResult,
  getClusterColor,
} from '../utils/kmeans';
import { PCAResult, ThemeMode, ColorPalette } from '../types/pca';
import { Network, Sparkles, RefreshCw, Layers } from 'lucide-react';

interface KMeansStudio3DProps {
  pcaResult: PCAResult;
  datasetName?: string;
  theme?: ThemeMode;
  colorPalette?: ColorPalette;
}

export const KMeansStudio3D: React.FC<KMeansStudio3DProps> = ({
  pcaResult,
  datasetName = 'Iris Flowers',
  theme = 'dark',
}) => {
  const isDark = theme === 'dark';

  // K-Means Configuration
  const [k, setK] = useState<number>(3);
  const [seed, setSeed] = useState<number>(42);
  const [showHulls, setShowHulls] = useState<boolean>(true);
  const [showRays, setShowRays] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showAxes, setShowAxes] = useState<boolean>(true);
  const [pointSize, setPointSize] = useState<number>(1.6);
  const [isolatedCluster, setIsolatedCluster] = useState<number | null>(null);

  // Extract 3D projected data (PC1, PC2, PC3)
  const projectedData: Record<string, number>[] = useMemo(() => {
    return pcaResult.transformedData.map(pt => ({
      PC1: pt.coords[0] ?? pt.pc1 ?? 0,
      PC2: pt.coords[1] ?? pt.pc2 ?? 0,
      PC3: pt.coords[2] ?? pt.pc3 ?? 0,
    }));
  }, [pcaResult.transformedData]);

  // Execute full production K-Means engine with snapshots
  const kmeansResult: KMeansRunResult = useMemo(() => {
    return runKMeans(
      projectedData,
      ['PC1', 'PC2', 'PC3'],
      {
        k,
        initMethod: 'k-means++',
        maxIterations: 40,
        tolerance: 1e-4,
        seed,
      }
    );
  }, [projectedData, k, seed]);

  const ev1 = pcaResult.explainedVariance[0] ?? 0.5;
  const ev2 = pcaResult.explainedVariance[1] ?? 0.3;
  const ev3 = pcaResult.explainedVariance[2] ?? 0.16;
  const totalEV = ((ev1 + ev2 + ev3) * 100).toFixed(1);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        width: '100%',
      }}
    >
      {/* ── Top Header Bar (matches ModelMind K-Means Studio) ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          background: isDark ? 'rgba(10, 15, 29, 0.85)' : '#ffffff',
          backdropFilter: 'blur(12px)',
          padding: '12px 18px',
          borderRadius: '12px',
          border: `1px solid ${isDark ? 'rgba(124, 77, 255, 0.22)' : '#e2e8f0'}`,
          boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.4)' : 'var(--card-shadow)',
        }}
      >
        {/* Left: Studio Brand Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #7c3aed, #ff3483)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '18px',
              fontWeight: 800,
              boxShadow: '0 0 16px rgba(124, 77, 255, 0.45)',
            }}
          >
            ⬡
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2
                style={{
                  fontSize: '16px',
                  fontWeight: 800,
                  color: isDark ? '#f8fafc' : '#0f172a',
                  margin: 0,
                  letterSpacing: '-0.01em',
                }}
              >
                PCA 3D View
              </h2>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '2px 7px',
                  borderRadius: '12px',
                  background: 'rgba(0, 224, 186, 0.15)',
                  border: '1px solid rgba(0, 224, 186, 0.4)',
                  color: '#00e0ba',
                }}
              >
                Latent 3D Clustering
              </span>
            </div>
            <p
              style={{
                fontSize: '11px',
                color: isDark ? '#94a3b8' : '#64748b',
                margin: '2px 0 0 0',
              }}
            >
              Interactive 3D Visualizer
            </p>
          </div>
        </div>

        {/* Center: Dataset Breadcrumb & Cluster Meta */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '13px',
            color: isDark ? '#cbd5e1' : '#334155',
            background: isDark ? 'rgba(15, 23, 42, 0.7)' : '#f1f5f9',
            padding: '6px 14px',
            borderRadius: '8px',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
          }}
        >
          <span>
            Dataset:{' '}
            <strong style={{ color: '#00e0ba', fontWeight: 700 }}>
              {datasetName}
            </strong>
          </span>
          <span style={{ color: isDark ? '#475569' : '#cbd5e1' }}>|</span>
          <span>
            {projectedData.length} Points · K ={' '}
            <strong style={{ color: '#ff3483', fontWeight: 800 }}>
              {kmeansResult.config.k}
            </strong>{' '}
            · Seed: {kmeansResult.config.seed}
          </span>
        </div>

        {/* Right: Interactive K-selector, Layers & Seed */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* K buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: isDark ? '#94a3b8' : '#64748b', fontWeight: 600, marginRight: 2 }}>
              K:
            </span>
            {[2, 3, 4, 5, 6].map(kVal => (
              <button
                key={kVal}
                onClick={() => setK(kVal)}
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '6px',
                  border: k === kVal ? '1px solid #ff3483' : `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
                  background: k === kVal ? 'linear-gradient(135deg, #7c3aed, #ff3483)' : isDark ? '#1e293b' : '#f8fafc',
                  color: k === kVal ? '#ffffff' : isDark ? '#cbd5e1' : '#334155',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: k === kVal ? '0 0 10px rgba(255, 52, 131, 0.4)' : 'none',
                }}
              >
                {kVal}
              </button>
            ))}
          </div>

          {/* Seed Input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: isDark ? '#94a3b8' : '#64748b', fontWeight: 600 }}>
              Seed:
            </span>
            <input
              type="number"
              value={seed}
              onChange={e => setSeed(parseInt(e.target.value) || 0)}
              style={{
                width: '48px',
                height: '26px',
                borderRadius: '6px',
                border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
                background: isDark ? '#1e293b' : '#f8fafc',
                color: isDark ? '#f8fafc' : '#0f172a',
                fontSize: '11px',
                fontWeight: 600,
                textAlign: 'center',
                padding: '0 4px',
              }}
            />
            <button
              onClick={() => setSeed(Math.floor(Math.random() * 900) + 10)}
              title="Randomize Seed"
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '6px',
                border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
                background: isDark ? '#1e293b' : '#f8fafc',
                color: isDark ? '#cbd5e1' : '#334155',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={12} />
            </button>
          </div>

          {/* Layer toggles */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={() => setShowHulls(!showHulls)}
              style={{
                height: '26px',
                borderRadius: '6px',
                padding: '0 8px',
                border: showHulls ? '1px solid #00e0ba' : `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
                background: showHulls ? 'rgba(0, 224, 186, 0.15)' : isDark ? '#1e293b' : '#f8fafc',
                color: showHulls ? '#00e0ba' : isDark ? '#94a3b8' : '#64748b',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Hulls
            </button>
            <button
              onClick={() => setShowRays(!showRays)}
              style={{
                height: '26px',
                borderRadius: '6px',
                padding: '0 8px',
                border: showRays ? '1px solid #00e0ba' : `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
                background: showRays ? 'rgba(0, 224, 186, 0.15)' : isDark ? '#1e293b' : '#f8fafc',
                color: showRays ? '#00e0ba' : isDark ? '#94a3b8' : '#64748b',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Rays
            </button>
            <button
              onClick={() => setShowGrid(!showGrid)}
              style={{
                height: '26px',
                borderRadius: '6px',
                padding: '0 8px',
                border: showGrid ? '1px solid #00e0ba' : `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
                background: showGrid ? 'rgba(0, 224, 186, 0.15)' : isDark ? '#1e293b' : '#f8fafc',
                color: showGrid ? '#00e0ba' : isDark ? '#94a3b8' : '#64748b',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Grid
            </button>
            <button
              onClick={() => setShowAxes(!showAxes)}
              style={{
                height: '26px',
                borderRadius: '6px',
                padding: '0 8px',
                border: showAxes ? '1px solid #7c3aed' : `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
                background: showAxes ? 'rgba(124, 77, 255, 0.22)' : isDark ? '#1e293b' : '#f8fafc',
                color: showAxes ? '#c4b5fd' : isDark ? '#94a3b8' : '#64748b',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Axes (PC1-3)
            </button>
          </div>
        </div>
      </div>

      {/* ── Main 3D Card (Dicto matching screenshot) ── */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '620px',
          background: '#06070a',
          borderRadius: '14px',
          border: '1px solid rgba(124, 77, 255, 0.28)',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.7), 0 0 50px rgba(124, 77, 255, 0.08)',
          overflow: 'hidden',
        }}
      >
        {/* Top-Left Badge from Screenshot */}
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            background: 'rgba(15, 23, 42, 0.92)',
            backdropFilter: 'blur(8px)',
            padding: '6px 14px',
            borderRadius: '8px',
            border: '1px solid #7c3aed',
            fontSize: '12px',
            color: '#f8fafc',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)',
            pointerEvents: 'none',
          }}
        >
          <strong style={{ color: '#ffffff', letterSpacing: '0.01em' }}>
            PCA 3D View
          </strong>{' '}
          <span style={{ color: '#cbd5e1' }}>
            (PC1, PC2, PC3 Linear Combinations)
          </span>
        </div>

        {/* Live Three.js WebGL Scatter Scene */}
        <ThreeScatterPlot
          data={projectedData}
          features={['PC1', 'PC2', 'PC3']}
          varianceRatios={[ev1, ev2, ev3]}
          showAxes={showAxes}
          currentSnapshot={kmeansResult.finalIteration}
          allSnapshots={kmeansResult.iterations}
          currentIteration={kmeansResult.totalIterations}
          normalizationBounds={kmeansResult.normalizationBounds}
          isolatedCluster={isolatedCluster}
          showTrajectories={true}
          showDistanceRays={showRays}
          showHulls={showHulls}
          showGrid={showGrid}
          pointSize={pointSize}
          height="100%"
          defaultAutoRotate={true}
          autoRotateSpeed={1.8}
        />
      </div>

      {/* ── Cluster Filter Badges ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap',
          background: isDark ? 'rgba(10, 15, 29, 0.65)' : '#ffffff',
          padding: '10px 16px',
          borderRadius: '10px',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
        }}
      >
        <span style={{ fontSize: '12px', fontWeight: 700, color: isDark ? '#94a3b8' : '#64748b' }}>
          Cluster Focus:
        </span>
        <button
          onClick={() => setIsolatedCluster(null)}
          style={{
            padding: '4px 12px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            border: isolatedCluster === null ? '1px solid #38bdf8' : `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
            background: isolatedCluster === null ? 'rgba(56, 189, 248, 0.2)' : isDark ? '#1e293b' : '#f8fafc',
            color: isolatedCluster === null ? '#38bdf8' : isDark ? '#cbd5e1' : '#475569',
          }}
        >
          All Clusters ({kmeansResult.config.k})
        </button>
        {Array.from({ length: kmeansResult.config.k }, (_, c) => {
          const col = getClusterColor(c);
          const isSelected = isolatedCluster === c;
          const count = kmeansResult.finalIteration.clusterSizes[c] ?? 0;
          return (
            <button
              key={c}
              onClick={() => setIsolatedCluster(isSelected ? null : c)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                border: `1px solid ${col}`,
                background: isSelected ? col : `${col}18`,
                color: isSelected ? '#000000' : col,
                boxShadow: isSelected ? `0 0 12px ${col}` : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: isSelected ? '#000000' : col,
                }}
              />
              Cluster {c} ({count} pts)
            </button>
          );
        })}
      </div>

      {/* ── Analytical Suite Bottom Row (from PCA3DView) ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Card 1: Principal Component Projection Explanation */}
        <div
          style={{
            background: isDark ? 'rgba(124, 58, 237, 0.12)' : 'rgba(124, 58, 237, 0.06)',
            border: '1px solid #7c3aed',
            borderRadius: '12px',
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Network size={18} color="#a78bfa" />
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: isDark ? '#f8fafc' : '#0f172a', margin: 0 }}>
              Principal Component Projection
            </h3>
          </div>
          <p style={{ color: isDark ? '#cbd5e1' : '#475569', fontSize: '12px', lineHeight: '1.6', margin: 0 }}>
            The 3D coordinates shown are <strong>orthogonal linear combinations</strong> of all {pcaResult.featureNames.length} original features ({pcaResult.featureNames.slice(0, 6).join(', ')}{pcaResult.featureNames.length > 6 ? '...' : ''}), oriented along directions of maximal dataset variance.
          </p>
        </div>

        {/* Card 2: Explained Variance Breakdown */}
        <div
          style={{
            background: isDark ? '#0d111a' : '#ffffff',
            border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`,
            borderRadius: '12px',
            padding: '16px 18px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: isDark ? '#f8fafc' : '#0f172a', margin: 0 }}>
              Explained Variance Ratio
            </h4>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#4ade80',
                background: 'rgba(74, 222, 128, 0.14)',
                border: '1px solid rgba(74, 222, 128, 0.3)',
                padding: '2px 8px',
                borderRadius: '10px',
              }}
            >
              Cum: {totalEV}%
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { label: 'PC1 (Max Variance)', val: ev1, color: '#00e0ba' },
              { label: 'PC2 (Orthogonal 2nd)', val: ev2, color: '#7c3aed' },
              { label: 'PC3 (Orthogonal 3rd)', val: ev3, color: '#ff3483' },
            ].map(pc => (
              <div key={pc.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                  <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}>{pc.label}</span>
                  <span style={{ fontWeight: 700, color: pc.color }}>{(pc.val * 100).toFixed(1)}%</span>
                </div>
                <div style={{ width: '100%', height: '5px', background: isDark ? '#1e293b' : '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
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
        </div>

        {/* Card 3: Included High-D Features */}
        <div
          style={{
            background: isDark ? '#0d111a' : '#ffffff',
            border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`,
            borderRadius: '12px',
            padding: '16px 18px',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 700, color: isDark ? '#94a3b8' : '#64748b', marginBottom: '8px' }}>
            High-D Features Projected ({pcaResult.featureNames.length}):
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '110px', overflowY: 'auto' }}>
            {pcaResult.featureNames.map(f => (
              <span
                key={f}
                style={{
                  background: isDark ? '#131824' : '#f1f5f9',
                  border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
                  borderRadius: '4px',
                  padding: '3px 8px',
                  fontSize: '11px',
                  color: isDark ? '#cbd5e1' : '#334155',
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
