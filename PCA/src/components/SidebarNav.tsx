import React, { useState } from 'react';
import {
  Database,
  Sliders,
  Compass,
  Layers,
  Shapes,
  GitCompare,
  Play,
  UploadCloud,
  FileDown,
  Sun,
  Moon,
  Palette,
  Sparkles,
  Binary,
  PieChart,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Zap
} from 'lucide-react';
import { DatasetInfo, ScalingStrategy, ReductionMethod, ThemeMode, ColorPalette } from '../types/pca';
import { PALETTES } from '../utils/colors';

export type ActiveNavModule = 'data' | 'preprocessing' | 'projection' | 'components' | 'clustering' | 'compare' | 'guide';

interface SidebarNavProps {
  activeModule: ActiveNavModule;
  onSelectModule: (module: ActiveNavModule) => void;
  datasets: DatasetInfo[];
  selectedDatasetId: string;
  onSelectDataset: (id: string) => void;
  reductionMethod: ReductionMethod;
  onSelectReductionMethod: (m: ReductionMethod) => void;
  scaling: ScalingStrategy;
  onSelectScaling: (s: ScalingStrategy) => void;
  retainedComponents: number;
  maxComponents: number;
  onRetainedComponentsChange: (k: number) => void;
  onRunAnalysis: () => void;
  onOpenUpload: () => void;
  theme: ThemeMode;
  // New props moved from HeaderKPIs
  runIndex?: number;
  totalRecords?: number;
  inputFeaturesCount?: number;
  retainedVariancePct?: number;
  colorPalette?: ColorPalette;
  onSelectColorPalette?: (pal: ColorPalette) => void;
  onToggleTheme?: () => void;
  onExportReport?: () => void;
  onLoadDemoData?: () => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  activeModule,
  onSelectModule,
  datasets,
  selectedDatasetId,
  onSelectDataset,
  reductionMethod,
  onSelectReductionMethod,
  scaling,
  onSelectScaling,
  retainedComponents,
  maxComponents,
  onRetainedComponentsChange,
  onRunAnalysis,
  onOpenUpload,
  theme,
  runIndex = 1,
  totalRecords = 0,
  inputFeaturesCount = 0,
  retainedVariancePct = 0,
  colorPalette = 'cyber',
  onSelectColorPalette,
  onToggleTheme,
  onExportReport,
  onLoadDemoData,
}) => {
  const isDark = theme === 'dark';
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [guideOpen, setGuideOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);

  const navItems: { id: ActiveNavModule; label: string; icon: any; count?: string }[] = [
    { id: 'data',          label: 'Data',        icon: Database },
    { id: 'preprocessing', label: 'Preprocessing', icon: Sliders },
    { id: 'projection',    label: 'Projection',  icon: Compass, count: 'Live' },
    { id: 'components',    label: 'Components',  icon: Layers },
    { id: 'clustering',    label: 'Clustering',  icon: Shapes },
    { id: 'compare',       label: 'Compare',     icon: GitCompare },
    { id: 'guide',         label: 'PCA Theory & Guide', icon: BookOpen, count: 'Guide' }
  ];

  const kpiCards = [
    { icon: Database,  color: '#00f5d4', label: 'Records',       value: totalRecords.toLocaleString() },
    { icon: Binary,    color: '#ffb703', label: 'Features',      value: String(inputFeaturesCount) },
    { icon: Layers,    color: '#8b5cf6', label: 'Retained PCs',  value: String(retainedComponents) },
    { icon: PieChart,  color: '#ff007f', label: 'Variance',      value: `${retainedVariancePct.toFixed(0)}%` },
  ];

  const sectionLabel = (text: string) => (
    <div style={{
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.08em', color: isDark ? '#475569' : '#94a3b8',
      padding: '0 16px', marginBottom: 4, marginTop: 10
    }}>{text}</div>
  );

  return (
    <aside style={{
      width: 240,
      background: isDark ? 'var(--bg-sidebar)' : '#ffffff',
      borderRight: `1px solid ${isDark ? 'var(--border-card)' : '#e2e8f0'}`,
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      userSelect: 'none',
      overflowY: 'auto',
      transition: 'background-color 0.25s ease'
    }}>

      {/* ── Brand Header ── */}
      <div style={{
        padding: '16px 16px 12px',
        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9'}`,
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: 'linear-gradient(135deg, #00f5d4 0%, #0284c7 50%, #6366f1 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#ffffff', fontWeight: 800, fontSize: 17,
          boxShadow: isDark ? '0 0 14px rgba(0,245,212,0.35)' : '0 2px 6px rgba(2,132,199,0.3)'
        }}>⚛</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            PCA Visualization
          </div>
          <div style={{ fontSize: 10, color: isDark ? '#64748b' : '#94a3b8', fontWeight: 500 }}>
            Dimensionality Reduction Studio
          </div>
        </div>
      </div>

      {/* ── Dataset + Run badge ── */}
      <div style={{ padding: '10px 16px 6px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 5
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: isDark ? '#475569' : '#94a3b8' }}>
            Active Dataset
          </span>
          <span style={{
            fontSize: 10, fontWeight: 800, padding: '1px 7px', borderRadius: 10,
            background: isDark ? 'rgba(0,245,212,0.15)' : '#e0f2fe',
            color: isDark ? '#00f5d4' : '#0369a1',
            border: `1px solid ${isDark ? 'rgba(0,245,212,0.3)' : '#bae6fd'}`
          }}>
            Run {String(runIndex).padStart(2, '0')}
          </span>
        </div>
        <select
          value={selectedDatasetId}
          onChange={e => onSelectDataset(e.target.value)}
          style={{
            width: '100%', padding: '6px 8px', borderRadius: 6,
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#cbd5e1'}`,
            background: isDark ? '#0b1120' : '#f8fafc',
            fontSize: 11, fontWeight: 600, color: isDark ? '#f8fafc' : '#0f172a', cursor: 'pointer'
          }}
        >
          {datasets.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      {/* ── 4 KPI Mini-Cards ── */}
      <div style={{ padding: '4px 12px 8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {kpiCards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} style={{
              background: isDark ? `${card.color}0d` : '#f8fafc',
              border: `1px solid ${card.color}30`,
              borderRadius: 8, padding: '7px 8px',
              display: 'flex', alignItems: 'center', gap: 7
            }}>
              <Icon size={13} color={card.color} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a', lineHeight: 1 }}>
                  {card.value}
                </div>
                <div style={{ fontSize: 9, fontWeight: 600, color: isDark ? '#64748b' : '#94a3b8', marginTop: 1 }}>
                  {card.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Navigation Links ── */}
      <div style={{ padding: '4px 10px', display: 'flex', flexDirection: 'column', gap: 2, borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9'}` }}>
        {sectionLabel('Navigation')}
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeModule === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectModule(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                borderRadius: 8, border: 'none',
                background: isActive ? (isDark ? 'rgba(56,189,248,0.15)' : '#eff6ff') : 'transparent',
                color: isActive ? (isDark ? '#38bdf8' : '#0284c7') : (isDark ? '#94a3b8' : '#475569'),
                fontWeight: isActive ? 700 : 500, fontSize: 13, cursor: 'pointer',
                textAlign: 'left', transition: 'all 0.15s ease',
                boxShadow: isActive && isDark ? '0 0 12px rgba(56,189,248,0.12)' : 'none'
              }}
            >
              <Icon size={16} color={isActive ? (isDark ? '#38bdf8' : '#0284c7') : (isDark ? '#64748b' : '#94a3b8')} />
              <span>{item.label}</span>
              {item.count && (
                <span style={{
                  marginLeft: 'auto', fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 8,
                  background: isDark ? 'rgba(0,245,212,0.2)' : '#e0f2fe',
                  color: isDark ? '#00f5d4' : '#0369a1'
                }}>{item.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Analysis Settings (collapsible) ── */}
      <div style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9'}` }}>
        <button
          onClick={() => setSettingsOpen(o => !o)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 16px', border: 'none', background: 'transparent',
            cursor: 'pointer', color: isDark ? '#94a3b8' : '#64748b'
          }}
        >
          {settingsOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Analysis Settings
          </span>
        </button>

        {settingsOpen && (
          <div style={{ padding: '0 16px 12px' }}>
            {/* Reduction Method */}
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: isDark ? '#94a3b8' : '#64748b', marginBottom: 3 }}>
                Reduction method
              </label>
              <select
                value={reductionMethod}
                onChange={e => onSelectReductionMethod(e.target.value as ReductionMethod)}
                style={{
                  width: '100%', padding: '5px 7px', borderRadius: 6,
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#cbd5e1'}`,
                  background: isDark ? '#0f172a' : '#ffffff',
                  fontSize: 11, fontWeight: 600, color: isDark ? '#f8fafc' : '#0f172a'
                }}
              >
                <option value="standard_pca">Standard PCA</option>
                <option value="kernel_pca">Kernel PCA (RBF)</option>
                <option value="sparse_pca">Sparse PCA</option>
              </select>
            </div>

            {/* Scaling */}
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: isDark ? '#94a3b8' : '#64748b', marginBottom: 3 }}>
                Scaling
              </label>
              <select
                value={scaling}
                onChange={e => onSelectScaling(e.target.value as ScalingStrategy)}
                style={{
                  width: '100%', padding: '5px 7px', borderRadius: 6,
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#cbd5e1'}`,
                  background: isDark ? '#0f172a' : '#ffffff',
                  fontSize: 11, fontWeight: 600, color: isDark ? '#f8fafc' : '#0f172a'
                }}
              >
                <option value="standard">Standard scaler</option>
                <option value="robust">Robust scaler (IQR)</option>
                <option value="minmax">Min-max scaler</option>
                <option value="none">None (Raw centering)</option>
              </select>
            </div>

            {/* Components slider */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: isDark ? '#94a3b8' : '#64748b' }}>Retained components</span>
                <span style={{
                  fontSize: 11, fontWeight: 800, color: isDark ? '#38bdf8' : '#0f172a',
                  background: isDark ? 'rgba(56,189,248,0.2)' : '#e2e8f0',
                  padding: '1px 6px', borderRadius: 4
                }}>{retainedComponents}</span>
              </div>
              <input
                type="range" min="2" max={maxComponents} value={retainedComponents}
                onChange={e => onRetainedComponentsChange(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#38bdf8', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: isDark ? '#475569' : '#94a3b8', marginTop: 1 }}>
                <span>2</span><span>{maxComponents}</span>
              </div>
            </div>

            {/* Run Analysis */}
            <button
              onClick={onRunAnalysis}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '9px 14px', borderRadius: 8, border: 'none',
                background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 50%, #4f46e5 100%)',
                color: '#ffffff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(37,99,235,0.35)'
              }}
            >
              <Play size={13} fill="#ffffff" />
              Run analysis
            </button>
          </div>
        )}
      </div>

      {/* ── PCA Quick Guide & Parameter Impact (collapsible) ── */}
      <div style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9'}` }}>
        <button
          onClick={() => setGuideOpen(o => !o)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 16px', border: 'none', background: 'transparent',
            cursor: 'pointer', color: isDark ? '#94a3b8' : '#64748b'
          }}
        >
          {guideOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: isDark ? '#00f5d4' : '#0284c7' }}>
            ⚡ PCA Guide &amp; Impact
          </span>
        </button>

        {guideOpen && (
          <div style={{ padding: '0 12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{
              background: isDark ? 'rgba(0, 245, 212, 0.08)' : '#f0fdf4',
              border: `1px solid ${isDark ? 'rgba(0, 245, 212, 0.25)' : '#bbf7d0'}`,
              borderRadius: 8, padding: '8px 10px', fontSize: 11,
              color: isDark ? '#cbd5e1' : '#334155'
            }}>
              <div style={{ fontWeight: 800, color: isDark ? '#00f5d4' : '#15803d', marginBottom: 2 }}>
                ▲ Increasing K (PCs)
              </div>
              <div style={{ lineHeight: 1.4 }}>Higher variance retained, lower reconstruction RMSE, but retains more noise.</div>
            </div>

            <div style={{
              background: isDark ? 'rgba(255, 0, 127, 0.08)' : '#fef2f2',
              border: `1px solid ${isDark ? 'rgba(255, 0, 127, 0.25)' : '#fecaca'}`,
              borderRadius: 8, padding: '8px 10px', fontSize: 11,
              color: isDark ? '#cbd5e1' : '#334155'
            }}>
              <div style={{ fontWeight: 800, color: isDark ? '#ff007f' : '#b91c1c', marginBottom: 2 }}>
                ▼ Decreasing K (PCs)
              </div>
              <div style={{ lineHeight: 1.4 }}>Simpler 2D/3D model, removes noise, but causes higher information loss.</div>
            </div>

            <div style={{
              background: isDark ? 'rgba(22, 33, 56, 0.6)' : '#f8fafc',
              border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'}`,
              borderRadius: 8, padding: '8px 10px', fontSize: 11,
              color: isDark ? '#94a3b8' : '#64748b'
            }}>
              <div style={{ fontWeight: 700, color: isDark ? '#f8fafc' : '#0f172a', marginBottom: 2 }}>
                🎯 Epsilon (ε) &amp; MinSamples
              </div>
              <div style={{ lineHeight: 1.4 }}>Higher ε merges clusters; higher MinSamples strictly filters noise.</div>
            </div>

            <button
              onClick={() => onSelectModule('guide')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '7px 10px', borderRadius: 8,
                background: isDark ? 'linear-gradient(135deg, rgba(0,245,212,0.15) 0%, rgba(2,132,199,0.25) 100%)' : '#e0f2fe',
                color: isDark ? '#00f5d4' : '#0284c7',
                border: `1px solid ${isDark ? 'rgba(0,245,212,0.3)' : '#bae6fd'}`,
                fontSize: 11, fontWeight: 800, cursor: 'pointer'
              }}
            >
              <BookOpen size={13} />
              Open Full Theory &amp; Manual →
            </button>
          </div>
        )}
      </div>

      {/* ── Appearance & Tools (collapsible) ── */}
      <div style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9'}` }}>
        <button
          onClick={() => setAppearanceOpen(o => !o)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 16px', border: 'none', background: 'transparent',
            cursor: 'pointer', color: isDark ? '#94a3b8' : '#64748b'
          }}
        >
          {appearanceOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Appearance &amp; Tools
          </span>
        </button>

        {appearanceOpen && (
          <div style={{ padding: '0 12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>

            {/* Palette selector */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: isDark ? 'rgba(22,33,56,0.7)' : '#f1f5f9',
              padding: '5px 10px', borderRadius: 8
            }}>
              <Palette size={13} color={isDark ? '#00f5d4' : '#0284c7'} />
              <span style={{ fontSize: 10, fontWeight: 700, color: isDark ? '#94a3b8' : '#64748b' }}>Palette</span>
              <select
                value={colorPalette}
                onChange={e => onSelectColorPalette?.(e.target.value as ColorPalette)}
                style={{
                  marginLeft: 'auto', background: 'transparent', border: 'none',
                  color: isDark ? '#f8fafc' : '#0f172a', fontSize: 11, fontWeight: 700,
                  cursor: 'pointer', outline: 'none'
                }}
              >
                {Object.keys(PALETTES).map(key => (
                  <option key={key} value={key} style={{ background: isDark ? '#0f172a' : '#ffffff' }}>
                    {PALETTES[key].name}
                  </option>
                ))}
              </select>
            </div>

            {/* Theme toggle */}
            <button
              onClick={onToggleTheme}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
                borderRadius: 8, border: `1px solid ${isDark ? 'rgba(0,245,212,0.3)' : '#cbd5e1'}`,
                background: isDark ? 'rgba(15,23,42,0.7)' : '#f8fafc',
                color: isDark ? '#00f5d4' : '#0f172a', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                width: '100%', transition: 'all 0.15s ease'
              }}
            >
              {isDark ? <Sun size={13} color="#ffb703" /> : <Moon size={13} color="#6366f1" />}
              {isDark ? 'Light Editorial' : 'Dark Hologram'}
            </button>

            {/* Demo data */}
            <button
              onClick={onLoadDemoData}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
                borderRadius: 8, border: isDark ? '1px solid rgba(255,183,3,0.35)' : '1px solid #fed7aa',
                background: isDark ? 'rgba(255,183,3,0.1)' : '#fff7ed',
                color: isDark ? '#ffb703' : '#c2410c', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                width: '100%'
              }}
            >
              <Sparkles size={13} />
              Demo data
            </button>

            {/* Import dataset */}
            <button
              onClick={onOpenUpload}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
                borderRadius: 8, border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#cbd5e1'}`,
                background: isDark ? 'rgba(30,41,59,0.6)' : '#ffffff',
                color: isDark ? '#f8fafc' : '#0f172a', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                width: '100%'
              }}
            >
              <UploadCloud size={13} color={isDark ? '#00f5d4' : '#0284c7'} />
              Import dataset
            </button>

            {/* Export report */}
            <button
              onClick={onExportReport}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
                borderRadius: 8, border: 'none',
                background: 'linear-gradient(135deg, #00f5d4 0%, #0284c7 100%)',
                color: '#060913', fontSize: 11, fontWeight: 800, cursor: 'pointer',
                width: '100%', boxShadow: '0 2px 10px rgba(0,245,212,0.3)'
              }}
            >
              <FileDown size={13} color="#060913" />
              Export report
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
