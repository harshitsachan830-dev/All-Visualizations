import React, { useState, useRef, useEffect } from 'react';
import {
  BookOpen,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Layers,
  Activity,
  Sliders,
  Maximize2,
  HelpCircle
} from 'lucide-react';
import { PCAResult } from '../types/pca';

interface StepByStepEducatorProps {
  pcaResult: PCAResult;
}

export const StepByStepEducator: React.FC<StepByStepEducatorProps> = ({ pcaResult }) => {
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1: Centering animation slider (0 = raw, 1 = centered)
  const [centerProgress, setCenterProgress] = useState<number>(1);
  const centeringCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Step 4: Projection slider (0 = 2D space, 1 = projected onto PC1 line)
  const [projectionProgress, setProjectionProgress] = useState<number>(0);
  const projectionCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Covariance cell hover
  const [hoveredCovCell, setHoveredCovCell] = useState<{ row: number; col: number; val: number } | null>(null);

  // Render Step 1 Centering Canvas
  useEffect(() => {
    if (currentStep !== 1) return;
    const canvas = centeringCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    ctx.fillStyle = '#05070b';
    ctx.fillRect(0, 0, width, height);

    // Pick first two features for demonstration
    const feat1 = pcaResult.featureNames[0];
    const feat2 = pcaResult.featureNames[1];
    const mean1 = pcaResult.meanVector[0];
    const mean2 = pcaResult.meanVector[1];

    const rawPts = pcaResult.transformedData.map(pt => ({
      rawX: pt.original[feat1] || 0,
      rawY: pt.original[feat2] || 0,
      label: pt.label
    }));

    // Find bounds
    const allX = rawPts.map(p => p.rawX);
    const allY = rawPts.map(p => p.rawY);
    const minX = Math.min(...allX);
    const maxX = Math.max(...allX);
    const minY = Math.min(...allY);
    const maxY = Math.max(...allY);

    const spanX = Math.max(maxX - minX, 1);
    const spanY = Math.max(maxY - minY, 1);

    // Coordinate mapping
    const originCanvasX = width / 2;
    const originCanvasY = height / 2;
    const scale = Math.min(width, height) * 0.35;

    // Draw grid and origin crosshair
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, originCanvasY);
    ctx.lineTo(width, originCanvasY);
    ctx.moveTo(originCanvasX, 0);
    ctx.lineTo(originCanvasX, height);
    ctx.stroke();

    // Draw Mean Point marker (shifts with progress)
    const currentMeanX = originCanvasX + (mean1 * (1 - centerProgress) - mean1 * (1 - centerProgress)) * (scale / spanX);
    const currentMeanY = originCanvasY;

    // Draw data points transitioning from raw (offset) to centered (around origin 0,0)
    for (const p of rawPts) {
      // Interpolate from raw position to centered position
      const interpX = p.rawX - mean1 * centerProgress;
      const interpY = p.rawY - mean2 * centerProgress;

      const px = originCanvasX + (interpX / spanX) * scale;
      const py = originCanvasY - (interpY / spanY) * scale;

      ctx.beginPath();
      ctx.arc(px, py, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Draw Mean Indicator circle at origin when centered
    ctx.beginPath();
    ctx.arc(originCanvasX, originCanvasY, 8, 0, Math.PI * 2);
    ctx.strokeStyle = '#ff007f';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [currentStep, centerProgress, pcaResult]);

  // Render Step 4 Projection Canvas
  useEffect(() => {
    if (currentStep !== 4) return;
    const canvas = projectionCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    ctx.fillStyle = '#05070b';
    ctx.fillRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const scale = Math.min(width, height) * 0.38;

    // Draw PC1 Principal Axis (horizontal line)
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, centerY);
    ctx.lineTo(width - 40, centerY);
    ctx.stroke();

    // Draw PC2 Axis (vertical line) with fading opacity as projectionProgress increases
    ctx.strokeStyle = `rgba(255, 0, 127, ${0.4 * (1 - projectionProgress * 0.8)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(centerX, 40);
    ctx.lineTo(centerX, height - 40);
    ctx.stroke();

    const maxPC1 = Math.max(...pcaResult.transformedData.map(p => Math.abs(p.pc1))) || 1;
    const maxPC2 = Math.max(...pcaResult.transformedData.map(p => Math.abs(p.pc2))) || 1;

    for (const pt of pcaResult.transformedData) {
      const origX = centerX + (pt.pc1 / maxPC1) * scale;
      const origY = centerY - (pt.pc2 / maxPC2) * scale;

      // Target position on PC1 axis
      const projectedX = origX;
      const projectedY = centerY;

      // Current position based on projectionProgress
      const curX = origX + (projectedX - origX) * projectionProgress;
      const curY = origY + (projectedY - origY) * projectionProgress;

      // Draw drop projection ray line
      if (projectionProgress > 0) {
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.15 * projectionProgress})`;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(origX, origY);
        ctx.lineTo(curX, curY);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.beginPath();
      ctx.arc(curX, curY, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#00ff88';
      ctx.fill();
    }
  }, [currentStep, projectionProgress, pcaResult]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Step Tracker Navigation */}
      <div className="glass-panel" style={{ padding: '16px 24px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'var(--accent-lime)',
            color: '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: 15
          }}>
            {currentStep}
          </div>
          <div>
            <h2 style={{ fontSize: 17, margin: 0, fontWeight: 700 }}>
              {currentStep === 1 && 'Step 1: Data Centering (Mean Subtraction)'}
              {currentStep === 2 && 'Step 2: Covariance Matrix (Co-variation of Features)'}
              {currentStep === 3 && 'Step 3: Eigen-Decomposition (Axes of Maximum Spread)'}
              {currentStep === 4 && 'Step 4: Projection into Principal Component Subspace'}
            </h2>
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
              Step {currentStep} of 4 • Visual Intuition &amp; Mathematical Rigor
            </span>
          </div>
        </div>

        {/* Step Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
            disabled={currentStep === 1}
            className="btn-secondary"
            style={{ opacity: currentStep === 1 ? 0.4 : 1, padding: '6px 12px', fontSize: 12 }}
          >
            <ArrowLeft size={14} />
            <span>Previous Step</span>
          </button>

          <button
            onClick={() => setCurrentStep(prev => Math.min(4, prev + 1))}
            disabled={currentStep === 4}
            className="btn-primary"
            style={{ opacity: currentStep === 4 ? 0.4 : 1, padding: '6px 14px', fontSize: 12 }}
          >
            <span>Next Step</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* STEP 1: CENTERING */}
      {currentStep === 1 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20 }}>
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3 style={{ fontSize: 17, margin: 0, fontWeight: 700, color: 'var(--accent-cyan)' }}>
              Why Must Data Be Centered?
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              PCA is an algorithm about <strong>variance</strong> (spread around the center of mass). If your data is located far away from the origin $(0, 0)$, the first component would point towards the mean rather than capturing the actual spread of the data!
            </p>
            <div style={{ background: 'rgba(0, 240, 255, 0.06)', border: '1px solid rgba(0, 240, 255, 0.25)', padding: '12px 16px', borderRadius: 10, fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent-cyan)' }}>
              X_centered = X - Mean(X)
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              By subtracting the mean vector $\mu$, the center of mass of the data cloud lands precisely at $(0, 0)$.
            </p>

            {/* Interactive Slider */}
            <div style={{ marginTop: 'auto', background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700 }}>Interactive Centering Transition:</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-cyan)' }}>
                  {centerProgress === 1 ? 'Centered at (0, 0)' : centerProgress === 0 ? 'Raw Offset' : `${Math.round(centerProgress * 100)}% Centered`}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={centerProgress}
                onChange={(e) => setCenterProgress(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent-cyan)', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
                <span>Original Offset</span>
                <span>Fully Mean-Centered</span>
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '16px', position: 'relative', height: 420 }}>
            <canvas ref={centeringCanvasRef} style={{ width: '100%', height: '100%', borderRadius: 12, display: 'block' }} />
            <div style={{ position: 'absolute', bottom: 24, left: 24, background: 'rgba(0,0,0,0.8)', padding: '6px 12px', borderRadius: 8, fontSize: 11, color: '#f1f5f9', border: '1px solid var(--border-subtle)' }}>
              Cyan: Data Points • Pink Ring: Center of Mass (0, 0)
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: COVARIANCE MATRIX */}
      {currentStep === 2 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 20 }}>
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3 style={{ fontSize: 17, margin: 0, fontWeight: 700, color: 'var(--accent-magenta)' }}>
              The Covariance Matrix: Measuring Co-variation
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Once centered, we calculate how each variable varies with every other variable. If variable A increases whenever variable B increases, their covariance is positive.
            </p>
            <div style={{ background: 'rgba(255, 0, 127, 0.06)', border: '1px solid rgba(255, 0, 127, 0.25)', padding: '12px 16px', borderRadius: 10, fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent-magenta)' }}>
              Cov(X, Y) = Σ ((x_i - μ_x) * (y_i - μ_y)) / (N - 1)
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              - Diagonal entries represent the individual variance of each feature.<br />
              - Off-diagonal entries represent joint covariance between pairs of features.
            </p>

            {hoveredCovCell && (
              <div style={{ marginTop: 'auto', background: 'rgba(255, 255, 255, 0.05)', padding: '14px', borderRadius: 10, border: '1px solid var(--accent-magenta)' }}>
                <span style={{ fontSize: 11, color: 'var(--accent-magenta)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Inspecting Cell:
                </span>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginTop: 2 }}>
                  {pcaResult.featureNames[hoveredCovCell.row]} × {pcaResult.featureNames[hoveredCovCell.col]}
                </div>
                <div style={{ fontSize: 14, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', marginTop: 4 }}>
                  Covariance: {hoveredCovCell.val.toFixed(4)}
                </div>
              </div>
            )}
          </div>

          {/* Interactive Heatmap Matrix */}
          <div className="glass-panel" style={{ padding: '24px', overflowX: 'auto' }}>
            <h4 style={{ fontSize: 15, marginBottom: 12, fontWeight: 700 }}>
              Feature Covariance Heatmap ({pcaResult.featureNames.length} × {pcaResult.featureNames.length})
            </h4>
            <div style={{ display: 'inline-block', background: '#030407', padding: 12, borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${pcaResult.featureNames.length}, 46px)`, gap: 3 }}>
                {pcaResult.covarianceMatrix.map((row, rIdx) =>
                  row.map((val, cIdx) => {
                    const isDiag = rIdx === cIdx;
                    // Compute max off-diagonal for scaling
                    const intensity = Math.min(1, Math.abs(val) / (pcaResult.covarianceMatrix[0][0] || 1));
                    const bgColor = val >= 0 ? `rgba(0, 240, 255, ${0.15 + intensity * 0.75})` : `rgba(255, 0, 127, ${0.15 + intensity * 0.75})`;

                    return (
                      <div
                        key={`${rIdx}-${cIdx}`}
                        onMouseEnter={() => setHoveredCovCell({ row: rIdx, col: cIdx, val })}
                        onMouseLeave={() => setHoveredCovCell(null)}
                        style={{
                          width: 46,
                          height: 46,
                          background: bgColor,
                          borderRadius: 6,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 10,
                          fontWeight: 700,
                          color: '#ffffff',
                          cursor: 'pointer',
                          border: isDiag ? '1px solid rgba(255, 255, 255, 0.4)' : '1px solid transparent',
                          transform: hoveredCovCell?.row === rIdx && hoveredCovCell?.col === cIdx ? 'scale(1.1)' : 'none',
                          transition: 'transform 0.15s ease'
                        }}
                      >
                        {val.toFixed(1)}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: EIGEN-DECOMPOSITION */}
      {currentStep === 3 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20 }}>
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3 style={{ fontSize: 17, margin: 0, fontWeight: 700, color: 'var(--accent-lime)' }}>
              Eigen-Decomposition: Finding Directions of Maximum Variance
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              We diagonalize the Covariance Matrix using the <strong>Jacobi Eigenvalue Solver</strong> to discover its eigenvectors and eigenvalues.
            </p>
            <div style={{ background: 'rgba(0, 255, 136, 0.06)', border: '1px solid rgba(0, 255, 136, 0.25)', padding: '12px 16px', borderRadius: 10, fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent-lime)' }}>
              Σ * v = λ * v
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              - <strong>Eigenvector (v):</strong> A direction in space along which the data is stretched.<br />
              - <strong>Eigenvalue (λ):</strong> The magnitude of the stretch (the exact amount of variance along that eigenvector).
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Because the covariance matrix is symmetric, all eigenvectors are <strong>strictly orthogonal (90 degrees to each other)</strong>!
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '24px' }}>
            <h4 style={{ fontSize: 15, marginBottom: 12, fontWeight: 700 }}>
              Ranked Eigenvalues &amp; Variance Capture
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pcaResult.eigenvalues.slice(0, 6).map((val, idx) => {
                const evr = ((pcaResult.explainedVariance[idx] || 0) * 100).toFixed(1);
                return (
                  <div key={idx} style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, color: idx === 0 ? 'var(--accent-cyan)' : idx === 1 ? 'var(--accent-magenta)' : 'var(--accent-lime)' }}>
                        Eigenvector #{idx + 1} (PC{idx + 1})
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-gold)' }}>
                        λ = {val.toFixed(4)} ({evr}%)
                      </span>
                    </div>
                    <div style={{ width: '100%', height: 6, background: 'rgba(255, 255, 255, 0.1)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${evr}%`, height: '100%', background: idx === 0 ? 'var(--accent-cyan)' : idx === 1 ? 'var(--accent-magenta)' : 'var(--accent-lime)' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: PROJECTION */}
      {currentStep === 4 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20 }}>
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3 style={{ fontSize: 17, margin: 0, fontWeight: 700, color: 'var(--accent-gold)' }}>
              Subspace Projection: Compressing Dimensions
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              The final step projects each original high-dimensional sample onto the top $K$ principal eigenvectors using a matrix dot product.
            </p>
            <div style={{ background: 'rgba(255, 183, 0, 0.06)', border: '1px solid rgba(255, 183, 0, 0.25)', padding: '12px 16px', borderRadius: 10, fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent-gold)' }}>
              T = Z * W_k
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Watch below as high-dimensional points collapse along the orthogonal drop lines onto the PC1 axis, preserving maximal variance with minimal information loss.
            </p>

            <div style={{ marginTop: 'auto', background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700 }}>Interactive 1D Projection Animation:</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-gold)' }}>
                  {projectionProgress === 1 ? 'Fully Projected (1D)' : projectionProgress === 0 ? 'Original 2D Plane' : `${Math.round(projectionProgress * 100)}% Collapse`}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={projectionProgress}
                onChange={(e) => setProjectionProgress(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent-gold)', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
                <span>2D Plane</span>
                <span>Projected onto PC1 Line</span>
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '16px', position: 'relative', height: 420 }}>
            <canvas ref={projectionCanvasRef} style={{ width: '100%', height: '100%', borderRadius: 12, display: 'block' }} />
            <div style={{ position: 'absolute', bottom: 24, left: 24, background: 'rgba(0,0,0,0.85)', padding: '6px 12px', borderRadius: 8, fontSize: 11, color: '#f1f5f9', border: '1px solid var(--border-subtle)' }}>
              Cyan Line: PC1 Principal Axis • Lime Nodes: Projected Samples
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
