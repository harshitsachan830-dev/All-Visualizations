import React from 'react';
import { Activity, Layers3 } from 'lucide-react';
import { DBSCANResult, PCAResult, ThemeMode, ColorPalette } from '../types/pca';
import { Plotly2DProjection } from './Plotly2DProjection';
import { Plotly3DProjection } from './Plotly3DProjection';

interface DBSCANVisualizationStudioProps {
  pcaResult: PCAResult;
  result2D: DBSCANResult | null;
  result3D: DBSCANResult | null;
  eps: number;
  minSamples: number;
  onEpsChange: (eps: number) => void;
  onMinSamplesChange: (minSamples: number) => void;
  theme: ThemeMode;
  colorPalette: ColorPalette;
}

export const DBSCANVisualizationStudio: React.FC<DBSCANVisualizationStudioProps> = ({
  pcaResult, result2D, result3D, eps, minSamples, onEpsChange, onMinSamplesChange, theme, colorPalette
}) => {
  const [view, setView] = React.useState<'2d' | '3d'>('2d');
  const isDark = theme === 'dark';
  const text = isDark ? '#e2e8f0' : '#0f172a';
  const muted = isDark ? '#94a3b8' : '#64748b';
  const border = isDark ? 'rgba(56,189,248,.22)' : '#dbe4ee';
  const result = view === '2d' ? result2D : result3D;

  const cardStyle: React.CSSProperties = {
    background: isDark ? 'rgba(13,19,33,.9)' : '#ffffff',
    border: `1px solid ${border}`,
    borderRadius: 14,
    boxShadow: isDark ? 'var(--card-shadow)' : '0 8px 20px rgba(15,23,42,.05)'
  };

  const metric = (title: string, value: string, note: string, color: string) => (
    <div key={title} style={{ ...cardStyle, minWidth: 0, padding: '13px 15px', borderTop: `2px solid ${color}` }}>
      <div style={{ color: muted, fontSize: 10, fontWeight: 700 }}>{title}</div>
      <div style={{ color: text, fontSize: 22, fontWeight: 800, marginTop: 4 }}>{value}</div>
      <div style={{ color: muted, fontSize: 9.5, marginTop: 3 }}>{note}</div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, color: text }}>
      <section style={{ ...cardStyle, padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <span style={{ width: 38, height: 38, borderRadius: 10, display: 'grid', placeItems: 'center', color: '#22d3ee', background: 'rgba(34,211,238,.12)' }}><Layers3 size={19} /></span>
            <div>
              <div style={{ color: '#22d3ee', fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase' }}>Density-based cluster explorer</div>
              <h2 style={{ fontSize: 19, margin: '2px 0 0' }}>DBSCAN · 2D and 3D</h2>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {[['2d', '2D · PC1 / PC2'], ['3d', '3D · PC1 / PC2 / PC3']].map(([id, label]) => {
              const active = view === id;
              const disabled = id === '3d' && (!result3D || pcaResult.nComponents < 3);
              return <button key={id} disabled={disabled} onClick={() => setView(id as '2d' | '3d')} style={{ padding: '8px 11px', borderRadius: 8, border: `1px solid ${active ? '#22d3ee' : border}`, background: active ? 'rgba(34,211,238,.14)' : 'transparent', color: disabled ? muted : active ? '#22d3ee' : text, fontSize: 11, fontWeight: 800, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? .55 : 1 }}>{label}</button>;
            })}
          </div>
        </div>
        <p style={{ color: muted, fontSize: 11, lineHeight: 1.55, margin: '10px 0 0 49px' }}>
          Compare density groups in the first two PCs or in the first three PCs. DBSCAN is recalculated in the selected dimensional space, so cluster counts can differ between 2D and 3D. Noise samples are shown separately.
        </p>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, .9fr) minmax(0, 2fr)', gap: 12, alignItems: 'stretch' }}>
        <div style={{ ...cardStyle, padding: 16, display: 'flex', flexDirection: 'column', gap: 13 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 800 }}><Activity size={16} color="#22d3ee" /> DBSCAN settings</div>
          <label style={{ display: 'grid', gap: 6, fontSize: 11, fontWeight: 700 }}>
            Epsilon (ε) <span style={{ color: '#22d3ee', fontSize: 15 }}>{eps.toFixed(2)}</span>
            <input aria-label="DBSCAN epsilon" type="range" min="0.1" max="5" step="0.05" value={eps} onChange={event => onEpsChange(Number(event.target.value))} style={{ accentColor: '#22d3ee', width: '100%' }} />
            <span style={{ color: muted, fontSize: 10, fontWeight: 400 }}>Neighborhood radius in the selected PCA space.</span>
          </label>
          <label style={{ display: 'grid', gap: 6, fontSize: 11, fontWeight: 700 }}>
            Minimum samples
            <input aria-label="DBSCAN minimum samples" type="number" min="2" max="50" step="1" value={minSamples} onChange={event => onMinSamplesChange(Math.max(2, Math.min(50, Number(event.target.value) || 2)))} style={{ padding: '8px 10px', borderRadius: 8, border: `1px solid ${border}`, background: isDark ? '#101a2c' : '#f8fafc', color: text, fontSize: 12 }} />
            <span style={{ color: muted, fontSize: 10, fontWeight: 400 }}>Points needed to form a dense neighborhood.</span>
          </label>
          <div style={{ color: muted, fontSize: 10, lineHeight: 1.5, padding: 10, borderRadius: 8, background: isDark ? 'rgba(148,163,184,.07)' : '#f1f5f9' }}>
            Current run: <b style={{ color: text }}>{view.toUpperCase()}</b> · {view === '2d' ? 'PC1 and PC2 distance' : 'PC1, PC2, and PC3 distance'} · {pcaResult.transformedData.length.toLocaleString()} samples
          </div>
        </div>

        <div style={{ minWidth: 0, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
          {metric('2D clusters', result2D?.nClusters.toLocaleString() ?? 'Unavailable', 'DBSCAN on PC1 and PC2', '#22d3ee')}
          {metric('3D clusters', result3D?.nClusters.toLocaleString() ?? 'Unavailable', 'DBSCAN on PC1, PC2, and PC3', '#a78bfa')}
          {metric(`${view.toUpperCase()} noise`, result ? `${result.noiseCount.toLocaleString()} (${((result.noiseCount / Math.max(1, pcaResult.transformedData.length)) * 100).toFixed(1)}%)` : 'Unavailable', 'Samples outside dense groups', '#fb7185')}
        </div>
      </section>

      <section style={{ ...cardStyle, padding: 8, minWidth: 0 }}>
        {view === '2d' ? (
          result2D ? <Plotly2DProjection pcaResult={pcaResult} dbscanResult={result2D} theme={theme} colorPalette={colorPalette} allowAxisSelection={false} /> : <div style={{ padding: 36, textAlign: 'center', color: muted }}>2D DBSCAN needs at least two usable components.</div>
        ) : result3D ? (
          <Plotly3DProjection pcaResult={pcaResult} dbscanResult={result3D} theme={theme} colorPalette={colorPalette} allowAxisSelection={false} />
        ) : (
          <div style={{ padding: 36, textAlign: 'center', color: muted }}>3D DBSCAN needs at least three retained principal components.</div>
        )}
      </section>
    </div>
  );
};
