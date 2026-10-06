import React, { useState } from 'react';
import { KMeansRunConfig, KMeansRunResult } from '../../utils/kmeans';
import { Sliders, RefreshCw, Play, CheckCircle } from 'lucide-react';

interface ParameterTuningViewProps {
  currentConfig: KMeansRunConfig;
  onRunModel: (config: KMeansRunConfig) => void;
  lastRunResult: KMeansRunResult;
}

export const ParameterTuningView: React.FC<ParameterTuningViewProps> = ({
  currentConfig,
  onRunModel,
  lastRunResult,
}) => {
  const [k, setK] = useState(currentConfig.k);
  const [initMethod, setInitMethod] = useState<'k-means++' | 'random'>(currentConfig.initMethod);
  const [maxIter, setMaxIter] = useState(currentConfig.maxIterations);
  const [tolerance, setTolerance] = useState(currentConfig.tolerance);
  const [seed, setSeed] = useState(currentConfig.seed);

  const handleApply = () => {
    onRunModel({
      k,
      initMethod,
      maxIterations: maxIter,
      tolerance,
      seed,
    });
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '22px', maxWidth: '1100px' }}>
      {/* Parameter Controls Panel */}
      <div
        style={{
          background: '#0d111a',
          border: '1px solid #1e293b',
          borderRadius: '12px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sliders size={20} color="#7c3aed" />
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
            Hyperparameter Workbench
          </h2>
        </div>

        {/* K Slider */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
              Number of Clusters (K):
            </label>
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#00e0ba' }}>
              {k}
            </span>
          </div>
          <input
            type="range"
            min={2}
            max={10}
            value={k}
            onChange={(e) => setK(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#7c3aed', cursor: 'pointer' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
            <span>K = 2</span>
            <span>K = 10</span>
          </div>
        </div>

        {/* Initialization Method */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#f8fafc', marginBottom: '8px' }}>
            Initialization Seeding Strategy:
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {[
              { id: 'k-means++', label: 'K-Means++', desc: 'Distance-weighted (Recommended)' },
              { id: 'random', label: 'Random Sampling', desc: 'Uniform random point pick' },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setInitMethod(m.id as any)}
                style={{
                  background: initMethod === m.id ? '#7c3aed' : '#131824',
                  color: initMethod === m.id ? '#ffffff' : '#cbd5e1',
                  border: `1px solid ${initMethod === m.id ? '#7c3aed' : '#334155'}`,
                  borderRadius: '8px',
                  padding: '10px',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '13px' }}>{m.label}</div>
                <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '2px' }}>{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Max Iterations */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
              Maximum Iterations:
            </label>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#38bdf8' }}>
              {maxIter}
            </span>
          </div>
          <input
            type="range"
            min={5}
            max={100}
            step={5}
            value={maxIter}
            onChange={(e) => setMaxIter(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#7c3aed', cursor: 'pointer' }}
          />
        </div>

        {/* Convergence Tolerance */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#f8fafc', marginBottom: '6px' }}>
            Convergence Tolerance (ε):
          </label>
          <select
            value={tolerance}
            onChange={(e) => setTolerance(Number(e.target.value))}
            style={{
              width: '100%',
              background: '#131824',
              border: '1px solid #334155',
              borderRadius: '6px',
              color: '#f8fafc',
              padding: '8px 12px',
              fontSize: '13px',
            }}
          >
            <option value={1e-3}>1e-3 (Coarse / Fast)</option>
            <option value={1e-4}>1e-4 (Standard Default)</option>
            <option value={1e-5}>1e-5 (Strict Precision)</option>
          </select>
        </div>

        {/* Random Seed */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
              Random Seed (Reproducibility):
            </label>
            <button
              onClick={() => setSeed(Math.floor(Math.random() * 99999))}
              style={{
                background: '#1e293b',
                color: '#cbd5e1',
                border: '1px solid #334155',
                borderRadius: '4px',
                padding: '3px 8px',
                fontSize: '11px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <RefreshCw size={11} /> Randomize
            </button>
          </div>
          <input
            type="number"
            value={seed}
            onChange={(e) => setSeed(Number(e.target.value))}
            style={{
              width: '100%',
              background: '#131824',
              border: '1px solid #334155',
              borderRadius: '6px',
              color: '#f8fafc',
              padding: '8px 12px',
              fontSize: '13px',
              fontFamily: 'monospace',
            }}
          />
        </div>

        {/* Run Button */}
        <button
          onClick={handleApply}
          style={{
            background: 'linear-gradient(135deg, #7c3aed, #ff3483)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginTop: '8px',
            boxShadow: '0 4px 14px rgba(124, 58, 237, 0.4)',
          }}
        >
          <Play size={16} /> Retrain K-Means with Settings
        </button>
      </div>

      {/* Right: Convergence Diagnosis */}
      <div
        style={{
          background: '#0d111a',
          border: '1px solid #1e293b',
          borderRadius: '12px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
          Latest Run Diagnostics
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ background: '#131824', padding: '12px', borderRadius: '8px' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Convergence Status</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: lastRunResult.converged ? '#4ade80' : '#facc15', marginTop: '2px' }}>
              {lastRunResult.converged ? '✓ Stabilized within tolerance' : '⚠ Stopped at max iterations'}
            </div>
          </div>

          <div style={{ background: '#131824', padding: '12px', borderRadius: '8px' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Total Iterations Required</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#38bdf8', marginTop: '2px' }}>
              {lastRunResult.totalIterations} steps
            </div>
          </div>

          <div style={{ background: '#131824', padding: '12px', borderRadius: '8px' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Final Model Inertia (WCSS)</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#00e0ba', marginTop: '2px' }}>
              {Math.round(lastRunResult.finalInertia).toLocaleString()}
            </div>
          </div>

          <div style={{ background: '#131824', padding: '12px', borderRadius: '8px' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Average Silhouette Score</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#a78bfa', marginTop: '2px' }}>
              {lastRunResult.silhouette.average.toFixed(3)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
