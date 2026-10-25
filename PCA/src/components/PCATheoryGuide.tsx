import React, { useState } from 'react';
import {
  BookOpen,
  Sliders,
  Compass,
  Layers,
  Shapes,
  GitCompare,
  Activity,
  TrendingUp,
  Sparkles,
  HelpCircle,
  Info,
  CheckCircle2,
  ArrowRight,
  ArrowUpRight,
  BarChart2,
  PieChart,
  Maximize2,
  Binary,
  Zap,
  AlertTriangle,
  RotateCw,
  Eye,
  Radio,
  FileSpreadsheet
} from 'lucide-react';
import { PCAResult, ThemeMode, ColorPalette } from '../types/pca';
import { StepByStepEducator } from './StepByStepEducator';

interface PCATheoryGuideProps {
  pcaResult: PCAResult;
  theme?: ThemeMode;
  colorPalette?: ColorPalette;
}

type GuideTab = 'theory' | 'parameters' | 'visualizers' | 'interactive' | 'faq';

export const PCATheoryGuide: React.FC<PCATheoryGuideProps> = ({
  pcaResult,
  theme = 'dark',
  colorPalette = 'cyber'
}) => {
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState<GuideTab>('parameters');
  const [expandedParam, setExpandedParam] = useState<string>('k_slider');

  const tabs: { id: GuideTab; label: string; icon: any; tag?: string }[] = [
    { id: 'parameters', label: 'Parameter Dynamics ("What Happens When You Change Values?")', icon: Sliders, tag: 'Must Read' },
    { id: 'visualizers', label: 'Visualization Studio Manual (All 9 Charts)', icon: Compass },
    { id: 'theory', label: 'Mathematical Foundations & Equations', icon: BookOpen },
    { id: 'interactive', label: 'Interactive Step-by-Step Lab', icon: Zap, tag: 'Canvas' },
    { id: 'faq', label: 'Rules of Thumb & FAQ', icon: HelpCircle }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Hero Banner */}
      <div style={{
        background: isDark
          ? 'linear-gradient(135deg, rgba(13, 19, 33, 0.95) 0%, rgba(9, 14, 26, 0.98) 100%)'
          : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        borderRadius: 16,
        border: `1px solid ${isDark ? 'var(--border-card)' : '#e2e8f0'}`,
        padding: '24px 28px',
        boxShadow: isDark ? 'var(--card-shadow)' : '0 4px 12px rgba(0,0,0,0.05)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 220,
          height: 220,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,245,212,0.12) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{
            fontSize: 11,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            padding: '3px 10px',
            borderRadius: 12,
            background: isDark ? 'rgba(0,245,212,0.15)' : '#e0f2fe',
            color: isDark ? '#00f5d4' : '#0369a1',
            border: `1px solid ${isDark ? 'rgba(0,245,212,0.3)' : '#bae6fd'}`
          }}>
            Complete Knowledge Base
          </span>
          <span style={{ fontSize: 12, color: isDark ? '#64748b' : '#94a3b8' }}>•</span>
          <span style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b', fontWeight: 600 }}>
            Dimensionality Reduction &amp; Interactive Studio Manual
          </span>
        </div>

        <h1 style={{
          fontSize: 24,
          fontWeight: 900,
          color: isDark ? '#f8fafc' : '#0f172a',
          margin: 0,
          fontFamily: 'Outfit, sans-serif'
        }}>
          PCA Theory, Parameter Dynamics &amp; Visualizer Manual
        </h1>
        <p style={{
          margin: '8px 0 0',
          fontSize: 14,
          color: isDark ? '#94a3b8' : '#475569',
          maxWidth: 920,
          lineHeight: 1.6
        }}>
          Explore the exact mathematics behind Principal Component Analysis, understand precisely what happens when parameters
          like <strong>Retained Components ($K$)</strong>, <strong>DBSCAN Epsilon ($\epsilon$)</strong>, and <strong>Scaling</strong> are altered, and learn how to interpret every visualization in this studio.
        </p>

        {/* Tab Switcher */}
        <div style={{
          display: 'flex',
          gap: 10,
          marginTop: 20,
          flexWrap: 'wrap',
          borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
          paddingTop: 16
        }}>
          {tabs.map(t => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: isActive
                    ? `1px solid ${isDark ? '#00f5d4' : '#0284c7'}`
                    : `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#cbd5e1'}`,
                  background: isActive
                    ? isDark ? 'rgba(0,245,212,0.12)' : '#e0f2fe'
                    : isDark ? 'rgba(22,33,56,0.6)' : '#ffffff',
                  color: isActive
                    ? isDark ? '#00f5d4' : '#0284c7'
                    : isDark ? '#cbd5e1' : '#475569',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={15} />
                <span>{t.label}</span>
                {t.tag && (
                  <span style={{
                    fontSize: 10,
                    fontWeight: 800,
                    padding: '2px 6px',
                    borderRadius: 6,
                    background: isDark ? 'rgba(255,0,127,0.2)' : '#fce7f3',
                    color: isDark ? '#ff007f' : '#be185d'
                  }}>
                    {t.tag}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PARAMETER DYNAMICS ("WHEN WE INCREASE THIS VALUE THEN WHAT HAPPENED") */}
      {/* ========================================================================= */}
      {activeTab === 'parameters' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{
            background: isDark ? 'var(--bg-card)' : '#ffffff',
            borderRadius: 14,
            border: `1px solid ${isDark ? 'var(--border-card)' : '#e2e8f0'}`,
            padding: '20px 24px',
            boxShadow: isDark ? 'var(--card-shadow)' : '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={20} color="#00f5d4" />
              Parameter Dynamics: What Happens When You Change Values?
            </h2>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: isDark ? '#94a3b8' : '#64748b' }}>
              Detailed breakdown of every adjustable parameter in this application, the mathematical impact of increasing vs. decreasing it, and practical consequences for downstream visualization and clustering.
            </p>
          </div>

          {/* Parameter 1: Retained Components (K) */}
          <div style={{
            background: isDark ? 'var(--bg-card)' : '#ffffff',
            borderRadius: 14,
            border: `1px solid ${isDark ? 'rgba(0,245,212,0.25)' : '#bae6fd'}`,
            padding: '22px 26px',
            boxShadow: isDark ? 'var(--card-shadow)' : '0 2px 6px rgba(0,0,0,0.05)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: isDark ? 'rgba(0,245,212,0.15)' : '#e0f2fe',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Layers size={18} color="#00f5d4" />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a', margin: 0 }}>
                    1. Retained Principal Components ($K$ Slider)
                  </h3>
                  <span style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b' }}>
                    Controls how many orthogonal eigenvectors (out of $p$ features) are preserved during projection and inverse reconstruction.
                  </span>
                </div>
              </div>
              <span style={{
                fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 8,
                background: isDark ? 'rgba(0,245,212,0.15)' : '#e0f2fe',
                color: isDark ? '#00f5d4' : '#0369a1'
              }}>
                Current Studio Value: K = {pcaResult.nComponents}
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: 16,
              marginTop: 12
            }}>
              {/* When Increased */}
              <div style={{
                background: isDark ? 'rgba(16, 185, 129, 0.08)' : '#f0fdf4',
                border: `1px solid ${isDark ? 'rgba(16, 185, 129, 0.25)' : '#bbf7d0'}`,
                borderRadius: 12,
                padding: '16px 18px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: isDark ? '#10b981' : '#15803d', fontWeight: 800, fontSize: 14 }}>
                  <span>▲ When You INCREASE K ($K \to p$)</span>
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: isDark ? '#cbd5e1' : '#334155', lineHeight: 1.65 }}>
                  <li><strong>Cumulative Variance Increases:</strong> Approaches 100%. More total informational energy of the original dataset is preserved.</li>
                  <li><strong>Reconstruction Error Drops:</strong> Mean Squared Error (MSE) and RMSE → 0. In the <em>Reconstruction Studio</em>, reconstructed bar heights match original values almost perfectly.</li>
                  <li><strong>Subtle Sub-populations Detected:</strong> Fine-grained phenotypic clusters separated only along minor axes (e.g. PC4 or PC5) become visible in higher-dimensional views.</li>
                  <li><strong>Downside (Noise Retention):</strong> If $K$ is set too high, random sensor noise, measurement error, and spurious correlations are captured rather than true global signal.</li>
                  <li><strong>Downside (Higher Dimensionality):</strong> Human visual intuition is limited to 2D and 3D; analyzing $K &gt; 3$ requires Parallel Coordinates or SPLOM matrices.</li>
                </ul>
              </div>

              {/* When Decreased */}
              <div style={{
                background: isDark ? 'rgba(239, 68, 68, 0.08)' : '#fef2f2',
                border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.25)' : '#fecaca'}`,
                borderRadius: 12,
                padding: '16px 18px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: isDark ? '#f87171' : '#b91c1c', fontWeight: 800, fontSize: 14 }}>
                  <span>▼ When You DECREASE K ($K \to 1$ or $2$)</span>
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: isDark ? '#cbd5e1' : '#334155', lineHeight: 1.65 }}>
                  <li><strong>Maximum Compression &amp; Simplicity:</strong> Data is compressed down to 1, 2, or 3 coordinates, allowing instant visualization on a flat monitor screen.</li>
                  <li><strong>Automatic Denoising:</strong> Higher-order noise orthogonal to the primary axes is discarded, leaving only dominant global trends.</li>
                  <li><strong>Downside (Information Loss):</strong> Uncaptured variance is permanently lost. Total RMSE reconstruction loss increases significantly.</li>
                  <li><strong>Downside (Cluster Collision):</strong> If two distinct biological or customer clusters are separated along PC3 or PC4, reducing $K=2$ will squash them together, creating the false impression of an overlapping group.</li>
                  <li><strong>Rule of Thumb:</strong> Choose $K$ where the Scree Plot exhibits an &ldquo;Elbow&rdquo; or where cumulative variance reaches <strong>80%–90%</strong>.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Parameter 2: Feature Scaling Strategy */}
          <div style={{
            background: isDark ? 'var(--bg-card)' : '#ffffff',
            borderRadius: 14,
            border: `1px solid ${isDark ? 'var(--border-card)' : '#e2e8f0'}`,
            padding: '22px 26px',
            boxShadow: isDark ? 'var(--card-shadow)' : '0 2px 6px rgba(0,0,0,0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: isDark ? 'rgba(255,183,3,0.15)' : '#fef3c7',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Sliders size={18} color="#ffb703" />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a', margin: 0 }}>
                  2. Preprocessing &amp; Feature Scaling Strategy
                </h3>
                <span style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b' }}>
                  Determines how raw columns with varying scales and units are transformed before calculating the covariance matrix.
                </span>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 14
            }}>
              <div style={{
                background: isDark ? 'rgba(22,33,56,0.6)' : '#f8fafc',
                padding: '14px 16px',
                borderRadius: 10,
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: isDark ? '#00f5d4' : '#0284c7' }}>
                  Standard Scaler (Z-Score)
                </span>
                <p style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b', margin: '4px 0 8px', fontFamily: 'monospace' }}>
                  z = (x - μ) / σ
                </p>
                <p style={{ fontSize: 12.5, color: isDark ? '#cbd5e1' : '#334155', margin: 0 }}>
                  <strong>Impact:</strong> Gives every feature equal initial weight ($\sigma^2 = 1$). Essential when features have different units (e.g. Salary in \$100k vs Age in 30). Prevents high-scale features from hijacking PC1.
                </p>
              </div>

              <div style={{
                background: isDark ? 'rgba(22,33,56,0.6)' : '#f8fafc',
                padding: '14px 16px',
                borderRadius: 10,
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: isDark ? '#ffb703' : '#b45309' }}>
                  Robust Scaler (IQR)
                </span>
                <p style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b', margin: '4px 0 8px', fontFamily: 'monospace' }}>
                  z = (x - median) / IQR
                </p>
                <p style={{ fontSize: 12.5, color: isDark ? '#cbd5e1' : '#334155', margin: 0 }}>
                  <strong>Impact:</strong> Uses median and Interquartile Range ($Q_3 - Q_1$). Immune to extreme outliers that would falsely inflate the standard deviation and skew principal axes.
                </p>
              </div>

              <div style={{
                background: isDark ? 'rgba(22,33,56,0.6)' : '#f8fafc',
                padding: '14px 16px',
                borderRadius: 10,
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: isDark ? '#8b5cf6' : '#6d28d9' }}>
                  MinMax Scaler
                </span>
                <p style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b', margin: '4px 0 8px', fontFamily: 'monospace' }}>
                  z = (x - min) / (max - min)
                </p>
                <p style={{ fontSize: 12.5, color: isDark ? '#cbd5e1' : '#334155', margin: 0 }}>
                  <strong>Impact:</strong> Compresses all features into strict $[0, 1]$ interval. Preserves zero entries in sparse datasets, but vulnerable to extreme outliers compressing normal range.
                </p>
              </div>

              <div style={{
                background: isDark ? 'rgba(22,33,56,0.6)' : '#f8fafc',
                padding: '14px 16px',
                borderRadius: 10,
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: isDark ? '#f87171' : '#b91c1c' }}>
                  No Scaling (Raw Centered)
                </span>
                <p style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b', margin: '4px 0 8px', fontFamily: 'monospace' }}>
                  z = x - μ
                </p>
                <p style={{ fontSize: 12.5, color: isDark ? '#cbd5e1' : '#334155', margin: 0 }}>
                  <strong>Impact:</strong> Features with larger numerical variances completely overpower the analysis. Only use if all columns share identical physical units and variance reflects true priority.
                </p>
              </div>
            </div>
          </div>

          {/* Parameter 3: DBSCAN Clustering (Epsilon & MinSamples) */}
          <div style={{
            background: isDark ? 'var(--bg-card)' : '#ffffff',
            borderRadius: 14,
            border: `1px solid ${isDark ? 'var(--border-card)' : '#e2e8f0'}`,
            padding: '22px 26px',
            boxShadow: isDark ? 'var(--card-shadow)' : '0 2px 6px rgba(0,0,0,0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: isDark ? 'rgba(139,92,246,0.15)' : '#ede9fe',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Shapes size={18} color="#8b5cf6" />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a', margin: 0 }}>
                  3. DBSCAN Density Clustering Parameters ($\epsilon$ &amp; MinSamples)
                </h3>
                <span style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b' }}>
                  Controls how unsupervised density clustering traverses the orthogonal PCA subspace.
                </span>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: 16
            }}>
              {/* Epsilon */}
              <div style={{
                background: isDark ? 'rgba(22,33,56,0.6)' : '#f8fafc',
                padding: '16px 18px',
                borderRadius: 12,
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`
              }}>
                <h4 style={{ fontSize: 14, fontWeight: 800, color: isDark ? '#00f5d4' : '#0284c7', margin: '0 0 8px 0' }}>
                  Epsilon ($\epsilon$) Neighborhood Radius
                </h4>
                <div style={{ fontSize: 13, color: isDark ? '#cbd5e1' : '#334155', lineHeight: 1.6 }}>
                  <p style={{ margin: '0 0 6px 0' }}>
                    <strong>▲ When $\epsilon$ is INCREASED:</strong> Search neighborhood expands. Points further apart connect as density-reachable. Result: <em>Clusters merge into fewer, larger groups</em>, and <em>noise count drops</em>. If $\epsilon$ is too large, the entire dataset collapses into 1 single mega-cluster.
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>▼ When $\epsilon$ is DECREASED:</strong> Search radius shrinks. Only tight, concentrated clusters survive. Result: <em>Clusters fracture into smaller pockets</em>, and <em>noise count spikes</em>. If $\epsilon$ is too small, every point is deemed isolated noise (-1).
                  </p>
                </div>
              </div>

              {/* MinSamples */}
              <div style={{
                background: isDark ? 'rgba(22,33,56,0.6)' : '#f8fafc',
                padding: '16px 18px',
                borderRadius: 12,
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`
              }}>
                <h4 style={{ fontSize: 14, fontWeight: 800, color: isDark ? '#ff007f' : '#be185d', margin: '0 0 8px 0' }}>
                  MinSamples (Core Point Threshold)
                </h4>
                <div style={{ fontSize: 13, color: isDark ? '#cbd5e1' : '#334155', lineHeight: 1.6 }}>
                  <p style={{ margin: '0 0 6px 0' }}>
                    <strong>▲ When MinSamples is INCREASED:</strong> Requires a denser neighborhood to establish a core point. Result: <em>Noise filtering becomes stricter</em>. Eliminates loose or spurious mini-clusters, but smaller authentic sub-clusters might be discarded as noise.
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>▼ When MinSamples is DECREASED:</strong> Even 2 or 3 nearby points can form a recognized cluster. Result: <em>Clusters form easily in sparse regions</em>, but random measurement clumps become false clusters.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: VISUALIZATION STUDIO MANUAL (ALL 9 VISUALIZERS) */}
      {/* ========================================================================= */}
      {activeTab === 'visualizers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{
            background: isDark ? 'var(--bg-card)' : '#ffffff',
            borderRadius: 14,
            border: `1px solid ${isDark ? 'var(--border-card)' : '#e2e8f0'}`,
            padding: '20px 24px',
            boxShadow: isDark ? 'var(--card-shadow)' : '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Compass size={20} color="#00f5d4" />
              Visualization Studio Manual: How to Use &amp; Read All 9 Charts
            </h2>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: isDark ? '#94a3b8' : '#64748b' }}>
              Every visualizer in PCA Matrix Studio provides a unique analytical lens into the high-dimensional data geometry. Here is how to operate and interpret each one.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 18 }}>
            {/* Visualizer 1 */}
            <div style={{
              background: isDark ? 'var(--bg-card)' : '#ffffff',
              borderRadius: 14,
              border: `1px solid ${isDark ? 'var(--border-card)' : '#e2e8f0'}`,
              padding: '20px',
              display: 'flex', flexDirection: 'column', gap: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: '#00f5d4', color: '#060913' }}>
                  TAB 1
                </span>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a', margin: 0 }}>
                  2D PCA Projection Studio
                </h3>
              </div>
              <p style={{ fontSize: 13, color: isDark ? '#94a3b8' : '#475569', margin: 0 }}>
                Plots every sample along the top two orthogonal axes: <strong>PC1</strong> (horizontal) and <strong>PC2</strong> (vertical).
              </p>
              <div style={{ background: isDark ? 'rgba(22,33,56,0.6)' : '#f8fafc', padding: '12px 14px', borderRadius: 10, fontSize: 12.5, color: isDark ? '#cbd5e1' : '#334155' }}>
                <div style={{ fontWeight: 700, color: isDark ? '#00f5d4' : '#0284c7', marginBottom: 4 }}>How to Interpret:</div>
                <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
                  <li><strong>Axes Percentage:</strong> The label (e.g. <code>PC1 (61.4%)</code>) shows the fraction of total variance captured by that axis.</li>
                  <li><strong>95% Confidence Ellipses:</strong> Outlines the bivariate Gaussian spread of each group. Tilted ellipses reveal correlated variance between PC1 and PC2.</li>
                  <li><strong>KDE Contours:</strong> Highlights high-density core clusters vs sparse outlier boundaries.</li>
                  <li><strong>Biplot Vectors (Arrows):</strong> Direction shows which features increase along that vector; length represents feature loading strength.</li>
                </ul>
              </div>
            </div>

            {/* Visualizer 2 */}
            <div style={{
              background: isDark ? 'var(--bg-card)' : '#ffffff',
              borderRadius: 14,
              border: `1px solid ${isDark ? 'var(--border-card)' : '#e2e8f0'}`,
              padding: '20px',
              display: 'flex', flexDirection: 'column', gap: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: '#ff007f', color: '#ffffff' }}>
                  TAB 2
                </span>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a', margin: 0 }}>
                  3D Fullscreen Immersive Space
                </h3>
              </div>
              <p style={{ fontSize: 13, color: isDark ? '#94a3b8' : '#475569', margin: 0 }}>
                Adds the 3rd dimension (<strong>PC3</strong>) to resolve visual ambiguities where points seem to overlap in 2D.
              </p>
              <div style={{ background: isDark ? 'rgba(22,33,56,0.6)' : '#f8fafc', padding: '12px 14px', borderRadius: 10, fontSize: 12.5, color: isDark ? '#cbd5e1' : '#334155' }}>
                <div style={{ fontWeight: 700, color: isDark ? '#ff007f' : '#be185d', marginBottom: 4 }}>How to Operate:</div>
                <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
                  <li><strong>Left-Click Drag:</strong> Rotates the 3D space freely around the centroid.</li>
                  <li><strong>Right-Click Drag:</strong> Pans the camera laterally.</li>
                  <li><strong>Scroll Wheel:</strong> Zooms in and out of tight clusters.</li>
                  <li><strong>Cluster Centroids:</strong> Diamond markers locate mathematical average coordinates for each cluster.</li>
                </ul>
              </div>
            </div>

            {/* Visualizer 3 */}
            <div style={{
              background: isDark ? 'var(--bg-card)' : '#ffffff',
              borderRadius: 14,
              border: `1px solid ${isDark ? 'var(--border-card)' : '#e2e8f0'}`,
              padding: '20px',
              display: 'flex', flexDirection: 'column', gap: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: '#8b5cf6', color: '#ffffff' }}>
                  TAB 3
                </span>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a', margin: 0 }}>
                  3D Space &amp; Orbits (Cleaned Cage)
                </h3>
              </div>
              <p style={{ fontSize: 13, color: isDark ? '#94a3b8' : '#475569', margin: 0 }}>
                Equipped with clean orbital gridlines, simplified axes, and interactive distance zoom slider (0.6x–2.2x).
              </p>
              <div style={{ background: isDark ? 'rgba(22,33,56,0.6)' : '#f8fafc', padding: '12px 14px', borderRadius: 10, fontSize: 12.5, color: isDark ? '#cbd5e1' : '#334155' }}>
                <div style={{ fontWeight: 700, color: isDark ? '#8b5cf6' : '#6d28d9', marginBottom: 4 }}>Key Features:</div>
                <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
                  <li><strong>No Opaque Cage Walls:</strong> Unobstructed view into dense cluster interiors.</li>
                  <li><strong>Tight Axis Bounds:</strong> Clustered points fill the viewport without excessive empty void.</li>
                  <li><strong>Distance Slider:</strong> Allows custom camera presets for presentation screenshots.</li>
                </ul>
              </div>
            </div>

            {/* Visualizer 4 */}
            <div style={{
              background: isDark ? 'var(--bg-card)' : '#ffffff',
              borderRadius: 14,
              border: `1px solid ${isDark ? 'var(--border-card)' : '#e2e8f0'}`,
              padding: '20px',
              display: 'flex', flexDirection: 'column', gap: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: '#ffb703', color: '#060913' }}>
                  TAB 4
                </span>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a', margin: 0 }}>
                  PCA 3D View (Centroid Radii)
                </h3>
              </div>
              <p style={{ fontSize: 13, color: isDark ? '#94a3b8' : '#475569', margin: 0 }}>
                Visualizes cluster membership with prominent centroid spheres and radial spokes linking members.
              </p>
              <div style={{ background: isDark ? 'rgba(22,33,56,0.6)' : '#f8fafc', padding: '12px 14px', borderRadius: 10, fontSize: 12.5, color: isDark ? '#cbd5e1' : '#334155' }}>
                <div style={{ fontWeight: 700, color: isDark ? '#ffb703' : '#b45309', marginBottom: 4 }}>How to Interpret:</div>
                <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
                  <li><strong>Centroid Spoke Rays:</strong> Show the distance of each point from its cluster mean.</li>
                  <li><strong>Noise Points:</strong> Displayed without connection spokes, illustrating their outlier status.</li>
                </ul>
              </div>
            </div>

            {/* Visualizer 5 */}
            <div style={{
              background: isDark ? 'var(--bg-card)' : '#ffffff',
              borderRadius: 14,
              border: `1px solid ${isDark ? 'var(--border-card)' : '#e2e8f0'}`,
              padding: '20px',
              display: 'flex', flexDirection: 'column', gap: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: '#0284c7', color: '#ffffff' }}>
                  TAB 5
                </span>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a', margin: 0 }}>
                  Parallel Coordinates Flow
                </h3>
              </div>
              <p style={{ fontSize: 13, color: isDark ? '#94a3b8' : '#475569', margin: 0 }}>
                Visualizes $K &gt; 3$ components at once by treating each PC as a vertical parallel axis.
              </p>
              <div style={{ background: isDark ? 'rgba(22,33,56,0.6)' : '#f8fafc', padding: '12px 14px', borderRadius: 10, fontSize: 12.5, color: isDark ? '#cbd5e1' : '#334155' }}>
                <div style={{ fontWeight: 700, color: isDark ? '#0284c7' : '#0369a1', marginBottom: 4 }}>How to Read:</div>
                <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
                  <li><strong>Polylines:</strong> Each ribbon line represents a single sample across PC1, PC2, ..., PC10.</li>
                  <li><strong>Cluster Signatures:</strong> Tightly bundled ribbons indicate cohesive sub-populations.</li>
                  <li><strong>Axis Brushing:</strong> Isolate anomalies that spike abnormally on specific components.</li>
                </ul>
              </div>
            </div>

            {/* Visualizer 6 */}
            <div style={{
              background: isDark ? 'var(--bg-card)' : '#ffffff',
              borderRadius: 14,
              border: `1px solid ${isDark ? 'var(--border-card)' : '#e2e8f0'}`,
              padding: '20px',
              display: 'flex', flexDirection: 'column', gap: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: '#10b981', color: '#ffffff' }}>
                  TAB 6
                </span>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a', margin: 0 }}>
                  Component Pairs SPLOM (Matrix)
                </h3>
              </div>
              <p style={{ fontSize: 13, color: isDark ? '#94a3b8' : '#475569', margin: 0 }}>
                Grid of pairwise 2D scatter plots comparing PC1 vs PC2, PC1 vs PC3, PC2 vs PC3, etc.
              </p>
              <div style={{ background: isDark ? 'rgba(22,33,56,0.6)' : '#f8fafc', padding: '12px 14px', borderRadius: 10, fontSize: 12.5, color: isDark ? '#cbd5e1' : '#334155' }}>
                <div style={{ fontWeight: 700, color: isDark ? '#10b981' : '#15803d', marginBottom: 4 }}>How to Read:</div>
                <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
                  <li><strong>Diagonal:</strong> Histograms of distribution along individual components.</li>
                  <li><strong>Off-Diagonal:</strong> Discovers which specific component pair best isolates a target cluster.</li>
                </ul>
              </div>
            </div>

            {/* Visualizer 7 */}
            <div style={{
              background: isDark ? 'var(--bg-card)' : '#ffffff',
              borderRadius: 14,
              border: `1px solid ${isDark ? 'var(--border-card)' : '#e2e8f0'}`,
              padding: '20px',
              display: 'flex', flexDirection: 'column', gap: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: '#f43f5e', color: '#ffffff' }}>
                  TAB 7
                </span>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a', margin: 0 }}>
                  Radar &amp; Feature Signatures
                </h3>
              </div>
              <p style={{ fontSize: 13, color: isDark ? '#94a3b8' : '#475569', margin: 0 }}>
                Multivariate polar fingerprint comparison across principal components, accompanied by directional feature weight rankings.
              </p>
              <div style={{ background: isDark ? 'rgba(22,33,56,0.6)' : '#f8fafc', padding: '12px 14px', borderRadius: 10, fontSize: 12.5, color: isDark ? '#cbd5e1' : '#334155' }}>
                <div style={{ fontWeight: 700, color: isDark ? '#f43f5e' : '#be185d', marginBottom: 4 }}>How to Read:</div>
                <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
                  <li><strong>Green Bars (Positive):</strong> Features that increase in value as this PC increases.</li>
                  <li><strong>Pink Bars (Negative):</strong> Features that decrease in value as this PC increases.</li>
                  <li><strong>Bar Length:</strong> Absolute importance of that feature to the component definition.</li>
                </ul>
              </div>
            </div>

            {/* Visualizer 8 */}
            <div style={{
              background: isDark ? 'var(--bg-card)' : '#ffffff',
              borderRadius: 14,
              border: `1px solid ${isDark ? 'var(--border-card)' : '#e2e8f0'}`,
              padding: '20px',
              display: 'flex', flexDirection: 'column', gap: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: '#06b6d4', color: '#ffffff' }}>
                  TAB 8
                </span>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a', margin: 0 }}>
                  Feature Correlation Circle
                </h3>
              </div>
              <p style={{ fontSize: 13, color: isDark ? '#94a3b8' : '#475569', margin: 0 }}>
                Plots variable vectors projected inside a unit circle ($r = 1$) to reveal linear relationships.
              </p>
              <div style={{ background: isDark ? 'rgba(22,33,56,0.6)' : '#f8fafc', padding: '12px 14px', borderRadius: 10, fontSize: 12.5, color: isDark ? '#cbd5e1' : '#334155' }}>
                <div style={{ fontWeight: 700, color: isDark ? '#06b6d4' : '#0891b2', marginBottom: 4 }}>Vector Angle Rules:</div>
                <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
                  <li><strong>Arrows close together (~0°):</strong> Strongly positively correlated features.</li>
                  <li><strong>Arrows at right angles (~90°):</strong> Uncorrelated / orthogonal features.</li>
                  <li><strong>Arrows pointing opposite (~180°):</strong> Strongly negatively correlated features.</li>
                  <li><strong>Near Circle Edge:</strong> Well represented on the 2D plane; near center = poorly represented.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MATHEMATICAL THEORY & EQUATIONS */}
      {/* ========================================================================= */}
      {activeTab === 'theory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{
            background: isDark ? 'var(--bg-card)' : '#ffffff',
            borderRadius: 14,
            border: `1px solid ${isDark ? 'var(--border-card)' : '#e2e8f0'}`,
            padding: '20px 24px',
            boxShadow: isDark ? 'var(--card-shadow)' : '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <BookOpen size={20} color="#00f5d4" />
              Mathematical Foundations &amp; Rigorous Derivations
            </h2>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: isDark ? '#94a3b8' : '#64748b' }}>
              Principal Component Analysis (PCA) mathematically seeks the orthogonal linear combination of variables that maximizes sample variance.
            </p>
          </div>

          {/* Derivation Steps */}
          <div style={{
            background: isDark ? 'var(--bg-card)' : '#ffffff',
            borderRadius: 14,
            border: `1px solid ${isDark ? 'var(--border-card)' : '#e2e8f0'}`,
            padding: '24px 28px',
            display: 'flex', flexDirection: 'column', gap: 20
          }}>
            {/* Step 1 */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#00f5d4' }}>STEP 1</span>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a', margin: 0 }}>
                  Mean Centering &amp; Standardization
                </h3>
              </div>
              <p style={{ fontSize: 13, color: isDark ? '#cbd5e1' : '#334155', lineHeight: 1.6, margin: 0 }}>
                Given an n × p data matrix X, compute column means μ_j and standard deviations σ_j.
                The standardized matrix $Z$ is computed as:
              </p>
              <div style={{
                background: isDark ? 'rgba(22,33,56,0.7)' : '#f1f5f9',
                padding: '10px 16px', borderRadius: 8, fontFamily: 'monospace', fontSize: 14,
                color: isDark ? '#00f5d4' : '#0284c7', margin: '8px 0', border: `1px solid ${isDark ? 'rgba(0,245,212,0.2)' : '#cbd5e1'}`
              }}>
                Z_ij = (X_ij - μ_j) / σ_j
              </div>
              <p style={{ fontSize: 12.5, color: isDark ? '#94a3b8' : '#64748b', margin: 0 }}>
                This centers the point cloud at the coordinate origin $(0, 0, \dots, 0)$ and ensures features with arbitrary measurement units have equal variance $= 1$.
              </p>
            </div>

            {/* Step 2 */}
            <div style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}`, paddingTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#ffb703' }}>STEP 2</span>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a', margin: 0 }}>
                  Sample Covariance / Correlation Matrix ($\Sigma$)
                </h3>
              </div>
              <p style={{ fontSize: 13, color: isDark ? '#cbd5e1' : '#334155', lineHeight: 1.6, margin: 0 }}>
                Compute the $p \times p$ symmetric, positive semi-definite covariance matrix $\Sigma$:
              </p>
              <div style={{
                background: isDark ? 'rgba(22,33,56,0.7)' : '#f1f5f9',
                padding: '10px 16px', borderRadius: 8, fontFamily: 'monospace', fontSize: 14,
                color: isDark ? '#ffb703' : '#b45309', margin: '8px 0', border: `1px solid ${isDark ? 'rgba(255,183,3,0.2)' : '#cbd5e1'}`
              }}>
                Σ = (1 / (n - 1)) · Zᵀ · Z
              </div>
              <p style={{ fontSize: 12.5, color: isDark ? '#94a3b8' : '#64748b', margin: 0 }}>
                Diagonal entries Σ_jj = Var(Z_j) = 1. Off-diagonal entries Σ_jk = Cov(Z_j, Z_k) = Corr(X_j, X_k).
              </p>
            </div>

            {/* Step 3 */}
            <div style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}`, paddingTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#8b5cf6' }}>STEP 3</span>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a', margin: 0 }}>
                  Eigenvalue Decomposition &amp; Singular Value Decomposition (SVD)
                </h3>
              </div>
              <p style={{ fontSize: 13, color: isDark ? '#cbd5e1' : '#334155', lineHeight: 1.6, margin: 0 }}>
                Solve the characteristic equation for eigenvalues $\lambda_k$ and orthonormal eigenvectors $v_k$:
              </p>
              <div style={{
                background: isDark ? 'rgba(22,33,56,0.7)' : '#f1f5f9',
                padding: '10px 16px', borderRadius: 8, fontFamily: 'monospace', fontSize: 14,
                color: isDark ? '#8b5cf6' : '#6d28d9', margin: '8px 0', border: `1px solid ${isDark ? 'rgba(139,92,246,0.2)' : '#cbd5e1'}`
              }}>
                Σ · v_k = λ_k · v_k    where ||v_k|| = 1 and v_iᵀ · v_j = 0 (for i ≠ j)
              </div>
              <p style={{ fontSize: 12.5, color: isDark ? '#94a3b8' : '#64748b', margin: 0 }}>
                Eigenvalues are sorted in descending order: λ₁ ≥ λ₂ ≥ ... ≥ λ_p ≥ 0.
                The total variance equals the sum of eigenvalues = p.
                The variance explained by component k is (λ_k / p).
              </p>
            </div>

            {/* Step 4 */}
            <div style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}`, paddingTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#ff007f' }}>STEP 4</span>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a', margin: 0 }}>
                  Projection &amp; Score Calculation
                </h3>
              </div>
              <p style={{ fontSize: 13, color: isDark ? '#cbd5e1' : '#334155', lineHeight: 1.6, margin: 0 }}>
                Project the standardized data onto the top $K$ principal eigenvectors $V_K = [v_1, v_2, \dots, v_K]$:
              </p>
              <div style={{
                background: isDark ? 'rgba(22,33,56,0.7)' : '#f1f5f9',
                padding: '10px 16px', borderRadius: 8, fontFamily: 'monospace', fontSize: 14,
                color: isDark ? '#ff007f' : '#be185d', margin: '8px 0', border: `1px solid ${isDark ? 'rgba(255,0,127,0.2)' : '#cbd5e1'}`
              }}>
                Scores T = Z · V_K   (n × K dimension)
              </div>
              <p style={{ fontSize: 12.5, color: isDark ? '#94a3b8' : '#64748b', margin: 0 }}>
                These scores T_i (PC1, PC2, PC3) are the exact coordinates plotted in the visualizers!
              </p>
            </div>

            {/* Step 5 */}
            <div style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}`, paddingTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#10b981' }}>STEP 5</span>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a', margin: 0 }}>
                  Inverse Reconstruction &amp; Loss Estimation
                </h3>
              </div>
              <p style={{ fontSize: 13, color: isDark ? '#cbd5e1' : '#334155', lineHeight: 1.6, margin: 0 }}>
                Reconstruct the approximation X̂ from the low-dimensional K components:
              </p>
              <div style={{
                background: isDark ? 'rgba(22,33,56,0.7)' : '#f1f5f9',
                padding: '10px 16px', borderRadius: 8, fontFamily: 'monospace', fontSize: 14,
                color: isDark ? '#10b981' : '#15803d', margin: '8px 0', border: `1px solid ${isDark ? 'rgba(16,185,129,0.2)' : '#cbd5e1'}`
              }}>
                Ẑ = T · V_Kᵀ = Z · V_K · V_Kᵀ    ==&gt;    X̂ = (Ẑ ⊙ σ) + μ
              </div>
              <p style={{ fontSize: 12.5, color: isDark ? '#94a3b8' : '#64748b', margin: 0 }}>
                Reconstruction error is calculated as MSE = (1 / (n · p)) ||X - X̂||².
                As K → p, X̂ → X and MSE → 0.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: INTERACTIVE STEP-BY-STEP LAB */}
      {/* ========================================================================= */}
      {activeTab === 'interactive' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{
            background: isDark ? 'var(--bg-card)' : '#ffffff',
            borderRadius: 14,
            border: `1px solid ${isDark ? 'var(--border-card)' : '#e2e8f0'}`,
            padding: '20px 24px',
            boxShadow: isDark ? 'var(--card-shadow)' : '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={20} color="#00f5d4" />
              Interactive Step-by-Step Educational Canvas Lab
            </h2>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: isDark ? '#94a3b8' : '#64748b' }}>
              Interact directly with the dynamic canvas animator below to see mean-centering, covariance matrix cells, eigenvector rotations, and score projections in real time.
            </p>
          </div>

          <StepByStepEducator pcaResult={pcaResult} />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: RULES OF THUMB & FAQ */}
      {/* ========================================================================= */}
      {activeTab === 'faq' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{
            background: isDark ? 'var(--bg-card)' : '#ffffff',
            borderRadius: 14,
            border: `1px solid ${isDark ? 'var(--border-card)' : '#e2e8f0'}`,
            padding: '20px 24px',
            boxShadow: isDark ? 'var(--card-shadow)' : '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <HelpCircle size={20} color="#00f5d4" />
              Practical Rules of Thumb &amp; Frequently Asked Questions
            </h2>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: isDark ? '#94a3b8' : '#64748b' }}>
              Common guidelines for choosing parameters and interpreting results in real-world data science.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 18 }}>
            <div style={{
              background: isDark ? 'var(--bg-card)' : '#ffffff',
              borderRadius: 14,
              border: `1px solid ${isDark ? 'var(--border-card)' : '#e2e8f0'}`,
              padding: '20px'
            }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: isDark ? '#00f5d4' : '#0284c7', margin: '0 0 8px 0' }}>
                How do I know how many PCs to retain?
              </h3>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: isDark ? '#cbd5e1' : '#334155', lineHeight: 1.65 }}>
                <li><strong>Elbow Rule (Scree Plot):</strong> Look for the bend where the explained variance per component flattens into a long shallow tail.</li>
                <li><strong>Cumulative Threshold:</strong> Keep enough components to exceed <strong>80% or 90%</strong> cumulative variance.</li>
                <li><strong>Kaiser Criterion:</strong> For standardized data, retain components with eigenvalue $\lambda_k &gt; 1$ (meaning the PC captures more variance than an individual raw feature).</li>
              </ul>
            </div>

            <div style={{
              background: isDark ? 'var(--bg-card)' : '#ffffff',
              borderRadius: 14,
              border: `1px solid ${isDark ? 'var(--border-card)' : '#e2e8f0'}`,
              padding: '20px'
            }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: isDark ? '#ffb703' : '#b45309', margin: '0 0 8px 0' }}>
                What does a negative loading value mean?
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: isDark ? '#cbd5e1' : '#334155', lineHeight: 1.65 }}>
                A negative loading indicates that the feature is <strong>inversely correlated</strong> with that principal component. If Feature $A$ has a loading of $-0.85$ on PC1, then samples located far to the positive right of PC1 will have very low values of Feature $A$, while samples to the far left will have high values. The sign of an eigenvector is arbitrary ($v$ and $-v$ describe the identical axis).
              </p>
            </div>

            <div style={{
              background: isDark ? 'var(--bg-card)' : '#ffffff',
              borderRadius: 14,
              border: `1px solid ${isDark ? 'var(--border-card)' : '#e2e8f0'}`,
              padding: '20px'
            }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: isDark ? '#ff007f' : '#be185d', margin: '0 0 8px 0' }}>
                When does Linear PCA fail?
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: isDark ? '#cbd5e1' : '#334155', lineHeight: 1.65 }}>
                PCA assumes data variations lie along linear hyperplanes. If your data forms complex non-linear manifolds (e.g. concentric circles, Swiss roll, or horseshoe shapes), linear PCA will compress them into an overlapping blob. In such cases, switch to <strong>Kernel PCA (RBF)</strong> in the <em>Compare Module</em> or use manifold learning algorithms like t-SNE / UMAP.
              </p>
            </div>

            <div style={{
              background: isDark ? 'var(--bg-card)' : '#ffffff',
              borderRadius: 14,
              border: `1px solid ${isDark ? 'var(--border-card)' : '#e2e8f0'}`,
              padding: '20px'
            }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: isDark ? '#8b5cf6' : '#6d28d9', margin: '0 0 8px 0' }}>
                Why run DBSCAN on PCA coordinates instead of raw data?
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: isDark ? '#cbd5e1' : '#334155', lineHeight: 1.65 }}>
                Running clustering directly on high-dimensional raw spaces ($p &gt; 50$) suffers from the <em>Curse of Dimensionality</em> (all pairwise Euclidean distances become equidistant and density becomes sparse). Projecting to the top orthogonal principal components eliminates correlated noise and focuses clustering purely on the highest-signal variance directions.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
