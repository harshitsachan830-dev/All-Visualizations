import React, { useState, useMemo } from 'react';
import Plot from 'react-plotly.js';
import { Layers, Activity, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { PCAResult, ScalingStrategy, ThemeMode } from '../types/pca';
import { computeReconstruction } from '../utils/math';

interface ReconstructionStudioProps {
  pcaResult: PCAResult;
  scaling: ScalingStrategy;
  theme?: ThemeMode;
}

export const ReconstructionStudio: React.FC<ReconstructionStudioProps> = ({
  pcaResult,
  scaling,
  theme = 'dark'
}) => {
  const isDark = theme === 'dark';
  const [retainedK, setRetainedK] = useState<number>(Math.min(3, pcaResult.nComponents));
  const [selectedSampleIdx, setSelectedSampleIdx] = useState<number>(0);

  const report = useMemo(() => {
    return computeReconstruction(pcaResult, retainedK, scaling);
  }, [pcaResult, retainedK, scaling]);

  // Reconstruction loss curve for K = 1..p
  const lossCurve = useMemo(() => {
    const kVals = Array.from({ length: pcaResult.nComponents }, (_, i) => i + 1);
    const mses: number[] = [];
    const explainedPct: number[] = [];

    kVals.forEach(k => {
      const rep = computeReconstruction(pcaResult, k, scaling);
      mses.push(rep.mseTotal);
      explainedPct.push(Number((rep.explainedVarianceRatio * 100).toFixed(1)));
    });

    return { kVals, mses, explainedPct };
  }, [pcaResult, scaling]);

  // Sample reconstruction comparison
  const sampleOriginal = pcaResult.rawMatrix[selectedSampleIdx] || [];
  const sampleReconstructed = useMemo(() => {
    const p = pcaResult.featureNames.length;
    const coords = pcaResult.transformedData[selectedSampleIdx]?.coords || [];
    const recon: number[] = [];

    for (let j = 0; j < p; j++) {
      let reconZ_j = 0;
      for (let m = 0; m < retainedK; m++) {
        reconZ_j += coords[m] * pcaResult.eigenvectors[m][j];
      }

      let reconX_j = reconZ_j;
      if (scaling === 'standard') {
        reconX_j = reconZ_j * pcaResult.stdVector[j] + pcaResult.meanVector[j];
      } else if (scaling === 'minmax') {
        const range = pcaResult.maxVector[j] - pcaResult.minVector[j];
        reconX_j = (reconZ_j + 0.5) * range + pcaResult.minVector[j];
      } else if (scaling === 'robust') {
        reconX_j = reconZ_j * pcaResult.iqrVector[j] + pcaResult.medianVector[j];
      } else {
        reconX_j = reconZ_j + pcaResult.meanVector[j];
      }

      recon.push(Number(reconX_j.toFixed(2)));
    }
    return recon;
  }, [pcaResult, selectedSampleIdx, retainedK, scaling]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Banner */}
      <div style={{
        background: isDark ? 'var(--bg-card)' : '#ffffff',
        borderRadius: 14,
        border: `1px solid ${isDark ? 'var(--border-card)' : '#e2e8f0'}`,
        padding: '20px 24px',
        boxShadow: isDark ? 'var(--card-shadow)' : '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: isDark ? '#f8fafc' : '#0f172a', margin: 0 }}>
              Reconstruction Fidelity & Inverse Projection Manifold
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: isDark ? '#94a3b8' : '#64748b' }}>
              Formula: <span style={{ fontFamily: 'monospace', fontWeight: 600, color: isDark ? '#00f5d4' : '#0284c7' }}>X̂ = Scores[:, 1..K] × V[1..K, :]ᵀ + μ</span>. Measures how much original signal is preserved vs lost.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{
              background: isDark ? 'rgba(16, 185, 129, 0.12)' : '#f0fdf4',
              border: `1px solid ${isDark ? 'rgba(16, 185, 129, 0.3)' : '#bbf7d0'}`,
              padding: '8px 14px',
              borderRadius: 10,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: isDark ? '#10b981' : '#166534' }}>Variance Retained</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: isDark ? '#10b981' : '#15803d' }}>
                {(report.explainedVarianceRatio * 100).toFixed(1)}%
              </div>
            </div>

            <div style={{
              background: isDark ? 'rgba(239, 68, 68, 0.12)' : '#fef2f2',
              border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.3)' : '#fecaca'}`,
              padding: '8px 14px',
              borderRadius: 10,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: isDark ? '#f87171' : '#991b1b' }}>Total RMSE Loss</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: isDark ? '#f87171' : '#b91c1c' }}>
                {report.rmseTotal.toFixed(3)}
              </div>
            </div>
          </div>
        </div>

        {/* Retained Components Slider */}
        <div style={{
          background: isDark ? 'rgba(22, 33, 56, 0.6)' : '#f8fafc',
          padding: '14px 18px',
          borderRadius: 10,
          border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'}`
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#cbd5e1' : '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Layers size={16} color={isDark ? '#00f5d4' : '#0284c7'} />
              Retained Components (K) for Inverse Projection:
            </span>
            <span style={{ fontSize: 15, fontWeight: 700, color: isDark ? '#00f5d4' : '#0284c7' }}>
              {retainedK} of {pcaResult.nComponents} Components
            </span>
          </div>
          <input
            type="range"
            min="1"
            max={pcaResult.nComponents}
            value={retainedK}
            onChange={e => setRetainedK(Number(e.target.value))}
            style={{ width: '100%', cursor: 'pointer', accentColor: isDark ? '#00f5d4' : '#0284c7' }}
          />
        </div>
      </div>

      {/* Two Column Visualizer */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: 20 }}>
        {/* Loss Curve */}
        <div style={{
          background: isDark ? 'var(--bg-card)' : '#ffffff',
          borderRadius: 14,
          border: `1px solid ${isDark ? 'var(--border-card)' : '#e2e8f0'}`,
          padding: '18px 20px',
          boxShadow: isDark ? 'var(--card-shadow)' : '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: isDark ? '#f8fafc' : '#0f172a', margin: '0 0 12px 0' }}>
            Reconstruction MSE Loss vs Retained PCs
          </h3>
          <div style={{ height: 320 }}>
            <Plot
              data={[
                {
                  x: lossCurve.kVals,
                  y: lossCurve.mses,
                  type: 'scatter',
                  mode: 'lines+markers',
                  line: { color: isDark ? '#ff007f' : '#dc2626', width: 2.5 },
                  marker: { size: 6, color: isDark ? '#ff007f' : '#b91c1c' },
                  name: 'Mean Squared Error'
                }
              ]}
              layout={{
                autosize: true,
                margin: { l: 45, r: 20, t: 10, b: 40 },
                paper_bgcolor: 'transparent',
                plot_bgcolor: isDark ? '#090e1a' : '#fafafa',
                xaxis: {
                  title: { text: 'Number of Retained Components (K)', font: { size: 11, color: isDark ? '#94a3b8' : '#475569' } },
                  gridcolor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
                  zerolinecolor: isDark ? 'rgba(0, 245, 212, 0.3)' : '#cbd5e1',
                  tickfont: { color: isDark ? '#94a3b8' : '#64748b' }
                },
                yaxis: {
                  title: { text: 'Mean Squared Error (MSE)', font: { size: 11, color: isDark ? '#94a3b8' : '#475569' } },
                  gridcolor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
                  zerolinecolor: isDark ? 'rgba(0, 245, 212, 0.3)' : '#cbd5e1',
                  tickfont: { color: isDark ? '#94a3b8' : '#64748b' }
                }
              }}
              useResizeHandler={true}
              style={{ width: '100%', height: '100%' }}
              config={{ displayModeBar: false }}
            />
          </div>
        </div>

        {/* Individual Sample Comparison Bar Chart */}
        <div style={{
          background: isDark ? 'var(--bg-card)' : '#ffffff',
          borderRadius: 14,
          border: `1px solid ${isDark ? 'var(--border-card)' : '#e2e8f0'}`,
          padding: '18px 20px',
          boxShadow: isDark ? 'var(--card-shadow)' : '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: isDark ? '#f8fafc' : '#0f172a', margin: 0 }}>
              Sample #{selectedSampleIdx} Original vs Reconstructed
            </h3>
            <select
              value={selectedSampleIdx}
              onChange={e => setSelectedSampleIdx(Number(e.target.value))}
              style={{
                padding: '4px 8px',
                borderRadius: 6,
                border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.15)' : '#cbd5e1'}`,
                background: isDark ? 'rgba(22, 33, 56, 0.9)' : '#f8fafc',
                color: isDark ? '#f8fafc' : '#0f172a',
                fontSize: 12,
                fontWeight: 600
              }}
            >
              {pcaResult.transformedData.slice(0, 20).map((p, i) => (
                <option key={i} value={i} style={{ background: isDark ? '#0f172a' : '#ffffff', color: isDark ? '#f8fafc' : '#0f172a' }}>
                  Sample #{p.id} ({p.label})
                </option>
              ))}
            </select>
          </div>

          <div style={{ height: 320 }}>
            <Plot
              data={[
                {
                  x: pcaResult.featureNames.slice(0, 10),
                  y: sampleOriginal.slice(0, 10),
                  name: 'Original',
                  type: 'bar',
                  marker: { color: isDark ? 'rgba(148, 163, 184, 0.4)' : '#94a3b8' }
                },
                {
                  x: pcaResult.featureNames.slice(0, 10),
                  y: sampleReconstructed.slice(0, 10),
                  name: `Reconstructed (K=${retainedK})`,
                  type: 'bar',
                  marker: { color: isDark ? '#00f5d4' : '#0284c7' }
                }
              ]}
              layout={{
                barmode: 'group',
                autosize: true,
                margin: { l: 40, r: 20, t: 10, b: 40 },
                paper_bgcolor: 'transparent',
                plot_bgcolor: isDark ? '#090e1a' : '#fafafa',
                legend: {
                  orientation: 'h',
                  y: 1.15,
                  font: { color: isDark ? '#cbd5e1' : '#334155' }
                },
                xaxis: {
                  gridcolor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
                  tickfont: { color: isDark ? '#94a3b8' : '#64748b' }
                },
                yaxis: {
                  gridcolor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
                  tickfont: { color: isDark ? '#94a3b8' : '#64748b' }
                }
              }}
              useResizeHandler={true}
              style={{ width: '100%', height: '100%' }}
              config={{ displayModeBar: false }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
