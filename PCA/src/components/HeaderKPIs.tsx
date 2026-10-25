import React from 'react';
import { Database, Binary, Layers, PieChart, UploadCloud, FileDown, Sun, Moon, Palette, Sparkles } from 'lucide-react';
import { ThemeMode, ColorPalette } from '../types/pca';
import { PALETTES } from '../utils/colors';

interface HeaderKPIsProps {
  datasetName: string;
  runIndex?: number;
  totalRecords: number;
  inputFeaturesCount: number;
  retainedPCs: number;
  retainedVariancePct: number;
  theme: ThemeMode;
  onToggleTheme: () => void;
  colorPalette: ColorPalette;
  onSelectColorPalette: (pal: ColorPalette) => void;
  onOpenUpload: () => void;
  onExportReport: () => void;
  onLoadDemoData: () => void;
}

export const HeaderKPIs: React.FC<HeaderKPIsProps> = ({
  datasetName,
  runIndex = 1,
  totalRecords,
  inputFeaturesCount,
  retainedPCs,
  retainedVariancePct,
  theme,
  onToggleTheme,
  colorPalette,
  onSelectColorPalette,
  onOpenUpload,
  onExportReport,
  onLoadDemoData
}) => {
  const isDark = theme === 'dark';

  return (
    <header style={{
      background: isDark ? 'var(--bg-card)' : 'var(--bg-card)',
      borderBottom: `1px solid ${isDark ? 'var(--border-card)' : 'var(--border-card)'}`,
      padding: '16px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      backdropFilter: 'blur(16px)',
      boxShadow: isDark ? '0 4px 25px rgba(0,0,0,0.5)' : '0 1px 3px rgba(0,0,0,0.05)'
    }}>
      {/* Top action row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 13, color: isDark ? '#94a3b8' : '#64748b', fontWeight: 600 }}>
            {datasetName} <span style={{ color: isDark ? '#334155' : '#cbd5e1' }}>/</span> <span style={{ color: isDark ? '#00f5d4' : '#0284c7', fontWeight: 700 }}>Run {runIndex.toString().padStart(2, '0')}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Palette Selector */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: isDark ? 'rgba(22, 33, 56, 0.7)' : '#e2e8f0',
            padding: '4px 8px',
            borderRadius: 8
          }}>
            <Palette size={14} color={isDark ? '#00f5d4' : '#0284c7'} />
            <span style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#94a3b8' : '#64748b' }}>Palette:</span>
            <select
              value={colorPalette}
              onChange={e => onSelectColorPalette(e.target.value as ColorPalette)}
              style={{
                background: 'transparent',
                border: 'none',
                color: isDark ? '#f8fafc' : '#0f172a',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              {Object.keys(PALETTES).map(key => (
                <option key={key} value={key} style={{ background: isDark ? '#0f172a' : '#ffffff' }}>
                  {PALETTES[key].name}
                </option>
              ))}
            </select>
          </div>

          {/* Theme Mode Toggle Button */}
          <button
            onClick={onToggleTheme}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 8,
              border: `1px solid ${isDark ? 'rgba(0, 245, 212, 0.35)' : '#cbd5e1'}`,
              background: isDark ? 'rgba(15, 23, 42, 0.8)' : '#f8fafc',
              color: isDark ? '#00f5d4' : '#0f172a',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: isDark ? '0 0 15px rgba(0, 245, 212, 0.15)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            {isDark ? <Sun size={14} color="#ffb703" /> : <Moon size={14} color="#6366f1" />}
            {isDark ? 'Light Editorial' : 'Dark Hologram'}
          </button>

          <button
            onClick={onLoadDemoData}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 20,
              border: isDark ? '1px solid rgba(255, 183, 3, 0.4)' : '1px solid #fed7aa',
              background: isDark ? 'rgba(255, 183, 3, 0.12)' : '#fff7ed',
              color: isDark ? '#ffb703' : '#c2410c',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <Sparkles size={13} />
            Demo data • Concept preview
          </button>

          <button
            onClick={onOpenUpload}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 8,
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#cbd5e1'}`,
              background: isDark ? 'rgba(30, 41, 59, 0.6)' : '#ffffff',
              color: isDark ? '#f8fafc' : '#0f172a',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <UploadCloud size={15} color={isDark ? '#00f5d4' : '#0284c7'} />
            Import dataset
          </button>

          <button
            onClick={onExportReport}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(135deg, #00f5d4 0%, #0284c7 100%)',
              color: '#060913',
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 2px 12px rgba(0, 245, 212, 0.35)'
            }}
          >
            <FileDown size={15} color="#060913" />
            Export report
          </button>
        </div>
      </div>

      {/* Main Title & 4 KPI Cards */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{
            fontSize: 24,
            fontWeight: 800,
            color: isDark ? '#f8fafc' : '#0f172a',
            margin: 0,
            letterSpacing: '-0.02em',
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}>
            Projection workspace
            <span style={{
              fontSize: 12,
              fontWeight: 800,
              padding: '3px 10px',
              borderRadius: 16,
              background: isDark ? 'rgba(0, 245, 212, 0.15)' : '#eff6ff',
              color: isDark ? '#00f5d4' : '#0284c7',
              border: `1px solid ${isDark ? 'rgba(0, 245, 212, 0.35)' : '#bae6fd'}`
            }}>
              High-D Studio
            </span>
          </h1>
        </div>

        {/* 4 Cards Grid */}
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {/* Card 1: Records */}
          <div style={{
            background: isDark ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%)' : '#ffffff',
            border: `1px solid ${isDark ? 'rgba(0, 245, 212, 0.25)' : '#e2e8f0'}`,
            borderRadius: 12,
            padding: '10px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            minWidth: 140,
            boxShadow: isDark ? '0 4px 15px rgba(0, 245, 212, 0.08)' : '0 2px 4px rgba(0,0,0,0.03)'
          }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: isDark ? 'rgba(0, 245, 212, 0.15)' : '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Database size={19} color={isDark ? '#00f5d4' : '#0284c7'} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a', lineHeight: 1.1 }}>
                {totalRecords.toLocaleString()}
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: isDark ? '#94a3b8' : '#64748b' }}>Records</div>
            </div>
          </div>

          {/* Card 2: Features */}
          <div style={{
            background: isDark ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%)' : '#ffffff',
            border: `1px solid ${isDark ? 'rgba(255, 183, 3, 0.25)' : '#e2e8f0'}`,
            borderRadius: 12,
            padding: '10px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            minWidth: 140,
            boxShadow: isDark ? '0 4px 15px rgba(255, 183, 3, 0.08)' : '0 2px 4px rgba(0,0,0,0.03)'
          }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: isDark ? 'rgba(255, 183, 3, 0.15)' : '#fff7ed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Binary size={19} color={isDark ? '#ffb703' : '#ea580c'} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a', lineHeight: 1.1 }}>
                {inputFeaturesCount}
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: isDark ? '#94a3b8' : '#64748b' }}>Input features</div>
            </div>
          </div>

          {/* Card 3: Retained PCs */}
          <div style={{
            background: isDark ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%)' : '#ffffff',
            border: `1px solid ${isDark ? 'rgba(139, 92, 246, 0.25)' : '#e2e8f0'}`,
            borderRadius: 12,
            padding: '10px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            minWidth: 140,
            boxShadow: isDark ? '0 4px 15px rgba(139, 92, 246, 0.08)' : '0 2px 4px rgba(0,0,0,0.03)'
          }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: isDark ? 'rgba(139, 92, 246, 0.15)' : '#faf5ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Layers size={19} color={isDark ? '#8b5cf6' : '#7c3aed'} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a', lineHeight: 1.1 }}>
                {retainedPCs}
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: isDark ? '#94a3b8' : '#64748b' }}>Retained PCs</div>
            </div>
          </div>

          {/* Card 4: Retained variance % */}
          <div style={{
            background: isDark ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%)' : '#ffffff',
            border: `1px solid ${isDark ? 'rgba(255, 0, 127, 0.25)' : '#e2e8f0'}`,
            borderRadius: 12,
            padding: '10px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            minWidth: 140,
            boxShadow: isDark ? '0 4px 15px rgba(255, 0, 127, 0.08)' : '0 2px 4px rgba(0,0,0,0.03)'
          }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: isDark ? 'rgba(255, 0, 127, 0.15)' : '#fdf2f8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <PieChart size={19} color={isDark ? '#ff007f' : '#e11d48'} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: isDark ? '#ff007f' : '#e11d48', lineHeight: 1.1 }}>
                {retainedVariancePct.toFixed(0)}%
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: isDark ? '#94a3b8' : '#64748b' }}>Retained variance</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
