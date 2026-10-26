import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Download, Info, Play, RotateCcw, Sparkles, StopCircle } from 'lucide-react';
import { ColorPalette, PCAResult, ScalingStrategy, ThemeMode } from '../types/pca';
import { ThreeScatterPlot } from './ThreeScatterPlot';
import { Centroid3D, getClusterColor, IterationSnapshot } from '../utils/kmeans';

interface TSNEStudioProps {
  pcaResult: PCAResult;
  datasetName: string;
  scaling: ScalingStrategy;
  theme: ThemeMode;
  colorPalette: ColorPalette;
}

type Embedding = {
  positions: number[];
  outputDimensions: number;
  history: { iteration: number; kl: number }[];
  kl: number;
  neighborhoodRetention: number;
  sampleIndices: number[];
};

const MAX_POINTS = 600;
const COLORS = ['#22d3ee', '#fb7185', '#a78bfa', '#34d399', '#fbbf24', '#60a5fa', '#f472b6', '#a3e635', '#fb923c', '#2dd4bf'];

function colorForLabel(label: string) {
  let hash = 2166136261;
  for (let i = 0; i < label.length; i++) hash = Math.imul(hash ^ label.charCodeAt(i), 16777619);
  return COLORS[(hash >>> 0) % COLORS.length];
}

function seededSample(length: number, max: number): number[] {
  if (length <= max) return Array.from({ length }, (_, index) => index);
  // Reservoir sample with a fixed seed makes repeated runs comparable.
  const sample = Array.from({ length: max }, (_, index) => index);
  let state = 17431;
  for (let i = max; i < length; i++) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const index = state % (i + 1);
    if (index < max) sample[index] = i;
  }
  return sample.sort((a, b) => a - b);
}

function escapeCsv(value: string | number) {
  const text = String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export const TSNEStudio: React.FC<TSNEStudioProps> = ({ pcaResult, datasetName, scaling, theme, colorPalette }) => {
  const isDark = theme === 'dark';
  const text = isDark ? '#e2e8f0' : '#0f172a';
  const muted = isDark ? '#94a3b8' : '#64748b';
  const card = isDark ? 'rgba(13,19,33,0.88)' : '#ffffff';
  const border = isDark ? 'rgba(56,189,248,0.22)' : '#dbe4ee';
  const inputBg = isDark ? '#101a2c' : '#f8fafc';
  const workerRef = useRef<Worker | null>(null);
  const [perplexity, setPerplexity] = useState(30);
  const [learningRate, setLearningRate] = useState(200);
  const [iterations, setIterations] = useState(500);
  const [outputDimensions, setOutputDimensions] = useState(3);
  const [viewMode, setViewMode] = useState<'2d' | '3d' | 'pairs'>('3d');
  const [axisX, setAxisX] = useState(1);
  const [axisY, setAxisY] = useState(2);
  const [showHulls, setShowHulls] = useState(true);
  const [showRays, setShowRays] = useState(true);
  const [showCentroids, setShowCentroids] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showAxes, setShowAxes] = useState(true);
  const [isolatedCluster, setIsolatedCluster] = useState<number | null>(null);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [initialization, setInitialization] = useState<'pca' | 'random'>('pca');
  const [seed, setSeed] = useState(42);
  const [colorMode, setColorMode] = useState<'label' | 'single'>('label');
  const [running, setRunning] = useState(false);
  const [iteration, setIteration] = useState(0);
  const [progressKL, setProgressKL] = useState<number | null>(null);
  const [embedding, setEmbedding] = useState<Embedding | null>(null);
  const [error, setError] = useState('');

  const sampleIndices = useMemo(() => seededSample(pcaResult.transformedData.length, MAX_POINTS), [pcaResult]);
  const labels = useMemo(() => pcaResult.transformedData.map(point => point.label || 'Unlabeled'), [pcaResult]);
  const classNames = useMemo(() => Array.from(new Set(labels)).sort((a, b) => a.localeCompare(b)), [labels]);
  const effectivePerplexity = Math.min(perplexity, Math.max(2, Math.floor((sampleIndices.length - 1) / 3)));

  useEffect(() => {
    setEmbedding(null);
    setIteration(0);
    setProgressKL(null);
    setError('');
    return () => workerRef.current?.terminate();
  }, [pcaResult]);

  const runEmbedding = () => {
    if (sampleIndices.length < 5) {
      setError('Choose or upload a dataset with at least 5 usable rows to create a t-SNE map.');
      return;
    }
    workerRef.current?.terminate();
    const worker = new Worker(new URL('../utils/tsne.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    setRunning(true);
    setViewMode(outputDimensions === 3 ? '3d' : outputDimensions > 3 ? 'pairs' : '2d');
    setEmbedding(null);
    setIteration(0);
    setProgressKL(null);
    setError('');
    setIsolatedCluster(null);
    setSelectedPointIndex(null);
    const input = sampleIndices.map(index => pcaResult.centeredMatrix[index]);
    const initial = initialization === 'pca'
      ? sampleIndices.map(index => pcaResult.transformedData[index].coords)
      : [];
    worker.onmessage = event => {
      const message = event.data;
      if (message.type === 'started') return;
      if (message.type === 'progress') {
        setIteration(message.iteration);
        setProgressKL(message.kl);
      } else if (message.type === 'complete') {
        setEmbedding({ ...message.result, sampleIndices });
        setIteration(iterations);
        setProgressKL(message.result.kl);
        setRunning(false);
        worker.terminate();
        if (workerRef.current === worker) workerRef.current = null;
      } else if (message.type === 'error') {
        setError(message.message || 't-SNE could not complete.');
        setRunning(false);
        worker.terminate();
        if (workerRef.current === worker) workerRef.current = null;
      }
    };
    worker.onerror = () => {
      setError('The t-SNE worker stopped unexpectedly. Try fewer iterations or a smaller dataset.');
      setRunning(false);
      worker.terminate();
      if (workerRef.current === worker) workerRef.current = null;
    };
    worker.postMessage({
      type: 'run', data: input, initial, perplexity: effectivePerplexity,
      learningRate, iterations, seed, outputDimensions
    });
  };

  const stopEmbedding = () => {
    workerRef.current?.terminate();
    workerRef.current = null;
    setRunning(false);
  };

  const exportCsv = () => {
    if (!embedding) return;
    const rows = [['sample_id', 'label', ...Array.from({ length: embedding.outputDimensions }, (_, i) => `tSNE_${i + 1}`)].join(',')];
    embedding.sampleIndices.forEach((sourceIndex, i) => {
      rows.push([
        sourceIndex + 1,
        escapeCsv(labels[sourceIndex]),
        ...Array.from({ length: embedding.outputDimensions }, (_, d) => embedding.positions[i * embedding.outputDimensions + d])
      ].join(','));
    });
    const url = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${datasetName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_tsne_embedding.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const traces = useMemo(() => {
    if (!embedding) return [];
    const manyLabels = classNames.length > 12;
    const groups = colorMode === 'single' ? ['All samples'] : manyLabels ? ['Labels (hover for value)'] : classNames;
    return groups.map((group, groupIndex) => {
      const indices = embedding.sampleIndices
        .map((sourceIndex, pointIndex) => ({ sourceIndex, pointIndex }))
        .filter(({ sourceIndex }) => colorMode === 'single' || manyLabels || labels[sourceIndex] === group);
      return {
        type: viewMode === '3d' ? 'scatter3d' as const : 'scatter' as const,
        mode: 'markers' as const,
        name: group,
        x: indices.map(({ pointIndex }) => embedding.positions[pointIndex * embedding.outputDimensions + (viewMode === 'pairs' ? axisX - 1 : 0)]),
        y: indices.map(({ pointIndex }) => embedding.positions[pointIndex * embedding.outputDimensions + (viewMode === 'pairs' ? axisY - 1 : 1)]),
        z: viewMode === '3d' ? indices.map(({ pointIndex }) => embedding.positions[pointIndex * embedding.outputDimensions + 2]) : undefined,
        customdata: indices.map(({ sourceIndex }) => [sourceIndex + 1, labels[sourceIndex]]),
        marker: {
          size: 8,
          color: colorMode === 'single' ? (isDark ? '#22d3ee' : '#0284c7') : manyLabels ? indices.map(({ sourceIndex }) => colorForLabel(labels[sourceIndex])) : COLORS[groupIndex % COLORS.length],
          opacity: 0.82,
          line: { width: 0.6, color: isDark ? '#07111d' : '#ffffff' }
        },
        hovertemplate: viewMode === '3d'
          ? '<b>Sample %{customdata[0]}</b><br>Label: %{customdata[1]}<br>t-SNE 1: %{x:.3f}<br>t-SNE 2: %{y:.3f}<br>t-SNE 3: %{z:.3f}<extra>%{fullData.name}</extra>'
          : `<b>Sample %{customdata[0]}</b><br>Label: %{customdata[1]}<br>t-SNE ${viewMode === 'pairs' ? axisX : 1}: %{x:.3f}<br>t-SNE ${viewMode === 'pairs' ? axisY : 2}: %{y:.3f}<extra>%{fullData.name}</extra>`
      };
    });
  }, [embedding, classNames, colorMode, labels, isDark, pcaResult, viewMode, axisX, axisY]);

  const spatial = useMemo(() => {
    if (!embedding || embedding.outputDimensions !== 3 || viewMode !== '3d') return null;
    const names = Array.from(new Set(embedding.sampleIndices.map(sourceIndex => labels[sourceIndex]))).sort((a, b) => a.localeCompare(b));
    const clusterNames: string[] = [];
    const clusterIdByName = new Map<string, number>();
    names.forEach(name => {
      if (name.toLowerCase() === 'noise') clusterIdByName.set(name, -1);
      else { clusterIdByName.set(name, clusterNames.length); clusterNames.push(name); }
    });
    const features: [string, string, string] = ['t-SNE 1', 't-SNE 2', 't-SNE 3'];
    const data = embedding.sampleIndices.map((sourceIndex, pointIndex) => ({
      't-SNE 1': embedding.positions[pointIndex * 3],
      't-SNE 2': embedding.positions[pointIndex * 3 + 1],
      't-SNE 3': embedding.positions[pointIndex * 3 + 2],
    }));
    const coordinates = data.map(row => [row['t-SNE 1'], row['t-SNE 2'], row['t-SNE 3']]);
    const bounds = {
      min: [0, 1, 2].map(axis => Math.min(...coordinates.map(point => point[axis]))),
      max: [0, 1, 2].map(axis => Math.max(...coordinates.map(point => point[axis])))
    };
    const labelsByPoint = embedding.sampleIndices.map(sourceIndex => clusterIdByName.get(labels[sourceIndex]) ?? -1);
    const centroids: Centroid3D[] = clusterNames.map((name, id) => {
      const members = coordinates.filter((_, index) => labelsByPoint[index] === id);
      const mean = [0, 1, 2].map(axis => members.reduce((sum, point) => sum + point[axis], 0) / members.length);
      return { id, coordinates: mean, normalizedCoords: [0, 0, 0], color: getClusterColor(id), size: members.length };
    });
    const pointDistances = coordinates.map((point, index) => {
      const centroid = centroids[labelsByPoint[index]];
      return centroid ? Math.hypot(point[0] - centroid.coordinates[0], point[1] - centroid.coordinates[1], point[2] - centroid.coordinates[2]) : 0;
    });
    const snapshot: IterationSnapshot = {
      iteration: 0, phase: 'converged', phaseNarrative: 't-SNE label-group summary', centroids,
      labels: labelsByPoint, inertia: pointDistances.reduce((sum, distance) => sum + distance ** 2, 0),
      centroidShifts: centroids.map(() => 0), clusterSizes: centroids.map(centroid => centroid.size),
      pointDistances, isConverged: true
    };
    return { data, features, bounds, snapshot, clusterNames };
  }, [embedding, labels, viewMode]);

  const history = embedding?.history || [];
  const historyMax = Math.max(...history.map(item => item.kl), 1);
  const chartPoints = history.map((item, index) => {
    const x = history.length <= 1 ? 0 : (index / (history.length - 1)) * 100;
    const y = 100 - (item.kl / historyMax) * 88;
    return `${x},${y}`;
  }).join(' ');
  const scatterRows = (traces as any[]).flatMap(trace => (trace.x || []).map((x: number, index: number) => ({
    x, y: trace.y?.[index], label: trace.customdata?.[index]?.[1] || trace.name,
    sample: trace.customdata?.[index]?.[0] || index + 1,
    color: Array.isArray(trace.marker?.color) ? trace.marker.color[index] : trace.marker?.color || '#22d3ee'
  }))).filter(point => Number.isFinite(point.x) && Number.isFinite(point.y));
  const minX = Math.min(...scatterRows.map(point => point.x), 0);
  const maxX = Math.max(...scatterRows.map(point => point.x), 0);
  const minY = Math.min(...scatterRows.map(point => point.y), 0);
  const maxY = Math.max(...scatterRows.map(point => point.y), 0);
  const rangeX = Math.max(maxX - minX, 1e-9);
  const rangeY = Math.max(maxY - minY, 1e-9);
  const svgX = (value: number) => 62 + ((value - minX) / rangeX) * 810;
  const svgY = (value: number) => 416 - ((value - minY) / rangeY) * 360;
  const parameterStyle: React.CSSProperties = {
    width: '100%', padding: '9px 10px', border: `1px solid ${border}`, borderRadius: 8,
    color: text, background: inputBg, fontSize: 12, outlineColor: '#22d3ee'
  };
  const cardStyle: React.CSSProperties = {
    background: card, border: `1px solid ${border}`, borderRadius: 14, boxShadow: isDark ? 'var(--card-shadow)' : '0 8px 20px rgba(15,23,42,.05)'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, color: text }}>
      <section style={{ ...cardStyle, padding: '20px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap' }}>
        <div style={{ maxWidth: 760 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ display: 'grid', placeItems: 'center', width: 34, height: 34, borderRadius: 10, background: 'rgba(34,211,238,.12)', color: '#22d3ee' }}><Sparkles size={18} /></span>
            <div>
              <div style={{ color: '#22d3ee', fontSize: 10, fontWeight: 800, letterSpacing: '.13em', textTransform: 'uppercase' }}>Nonlinear neighborhood map</div>
              <h2 style={{ fontSize: 21, margin: '1px 0 0', lineHeight: 1.2 }}>t-SNE Embedding Lab</h2>
            </div>
          </div>
          <p style={{ fontSize: 12, color: muted, lineHeight: 1.6, margin: '11px 0 0 43px' }}>
            t-SNE rearranges samples so nearby rows in the selected, scaled feature space tend to stay nearby in this map. Color shows the dataset label; it does not influence the layout.
          </p>
        </div>
        <div style={{ minWidth: 220, padding: '12px 14px', borderRadius: 10, background: isDark ? 'rgba(34,211,238,.07)' : '#ecfeff', border: `1px solid ${isDark ? 'rgba(34,211,238,.18)' : '#a5f3fc'}` }}>
          <div style={{ display: 'flex', gap: 7, alignItems: 'center', color: isDark ? '#a5f3fc' : '#0e7490', fontSize: 11, fontWeight: 800 }}><Info size={13} /> HOW TO READ THIS MAP</div>
          <div style={{ marginTop: 6, color: muted, fontSize: 11, lineHeight: 1.55 }}>Tight groups suggest local similarity. In 3D, drag to orbit and select a point to compare its distances to group centers. Far-apart group distances and the t-SNE axes are not direct measurements.</div>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 310px) minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
        <div style={{ ...cardStyle, padding: 17, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800 }}>Embedding controls</div>
            <div style={{ fontSize: 11, color: muted, marginTop: 3 }}>Input: {pcaResult.featureNames.length} selected, {pcaResult.featureNames.length === 1 ? 'feature' : 'features'} · {scalingName(scaling)}</div>
          </div>

          <label style={{ display: 'grid', gap: 5, fontSize: 11, fontWeight: 700 }}>
            Perplexity <span style={{ color: '#22d3ee' }}>{effectivePerplexity}{effectivePerplexity !== perplexity ? ` (limited for this sample)` : ''}</span>
            <input type="range" min="5" max="50" step="1" value={perplexity} onChange={event => setPerplexity(Number(event.target.value))} style={{ accentColor: '#22d3ee' }} />
            <span style={{ color: muted, fontSize: 10, fontWeight: 500 }}>Neighborhood scale. Try 5–15 for finer local structure or 30–50 for broader neighborhoods.</span>
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <label style={{ display: 'grid', gap: 5, fontSize: 11, fontWeight: 700 }}>Output dimensions
              <select value={outputDimensions} onChange={event => { const value = Number(event.target.value); setOutputDimensions(value); setAxisX(axis => Math.min(axis, value)); setAxisY(axis => Math.min(axis, value)); }} style={parameterStyle}>
                {[2, 3, 4, 5, 6].map(value => <option key={value} value={value}>{value}D</option>)}
              </select>
            </label>
            <label style={{ display: 'grid', gap: 5, fontSize: 11, fontWeight: 700 }}>Learning rate
              <select value={learningRate} onChange={event => setLearningRate(Number(event.target.value))} style={parameterStyle}>
                {[50, 100, 200, 500, 800].map(value => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <label style={{ display: 'grid', gap: 5, fontSize: 11, fontWeight: 700 }}>Iterations
              <select value={iterations} onChange={event => setIterations(Number(event.target.value))} style={parameterStyle}>
                {[250, 500, 750, 1000].map(value => <option key={value} value={value}>{value.toLocaleString()}</option>)}
              </select>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <label style={{ display: 'grid', gap: 5, fontSize: 11, fontWeight: 700 }}>Initialization
              <select value={initialization} onChange={event => setInitialization(event.target.value as 'pca' | 'random')} style={parameterStyle}>
                <option value="pca">PCA informed</option><option value="random">Random</option>
              </select>
            </label>
            <label style={{ display: 'grid', gap: 5, fontSize: 11, fontWeight: 700 }}>Seed
              <input type="number" min="1" max="999999" value={seed} onChange={event => setSeed(Math.max(1, Number(event.target.value) || 1))} style={parameterStyle} />
            </label>
          </div>

          <div style={{ padding: '10px 11px', borderRadius: 9, background: isDark ? 'rgba(148,163,184,.07)' : '#f1f5f9', color: muted, fontSize: 10.5, lineHeight: 1.55 }}>
            <b style={{ color: text }}>Sampling:</b> {sampleIndices.length.toLocaleString()} of {pcaResult.transformedData.length.toLocaleString()} rows{pcaResult.transformedData.length > MAX_POINTS ? `; deterministic 600-row cap keeps browser computation responsive.` : '.'}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {running ? <button onClick={stopEmbedding} style={actionStyle('#f43f5e')}><StopCircle size={15} /> Stop</button> : <button onClick={runEmbedding} style={actionStyle('#0891b2')}><Play size={15} /> {embedding ? 'Re-run embedding' : 'Run t-SNE'}</button>}
            {embedding && !running && <button title="Reset embedding" onClick={() => { setEmbedding(null); setIteration(0); setProgressKL(null); }} style={secondaryStyle(text, border)}><RotateCcw size={14} /></button>}
          </div>
          {running && <div aria-live="polite" style={{ fontSize: 11, color: muted }}><Activity size={13} style={{ verticalAlign: 'middle', marginRight: 5, color: '#22d3ee' }} /> Optimizing neighborhoods · iteration {iteration.toLocaleString()} / {iterations.toLocaleString()}</div>}
          {error && <div role="alert" style={{ padding: 10, background: 'rgba(244,63,94,.1)', border: '1px solid rgba(244,63,94,.3)', borderRadius: 8, color: isDark ? '#fda4af' : '#be123c', fontSize: 11 }}>{error}</div>}
        </div>

        <div style={{ ...cardStyle, minWidth: 0, minHeight: 535, overflow: 'hidden' }}>
          <div style={{ padding: '15px 18px 5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div><h3 style={{ fontSize: 15, margin: 0 }}>{viewMode === '3d' ? '3D sample space' : viewMode === 'pairs' ? 'Higher-dimensional pair view' : '2D sample map'}</h3><div style={{ color: muted, fontSize: 10.5, marginTop: 3 }}>{embedding ? `${embedding.sampleIndices.length.toLocaleString()} embedded rows · ${embedding.outputDimensions}D output · hover for sample details` : `Ready to run · ${outputDimensions}D output · 600-row browser limit`}</div></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              {embedding && <select aria-label="Embedding view" value={viewMode} onChange={event => setViewMode(event.target.value as '2d' | '3d' | 'pairs')} style={{ ...parameterStyle, width: 120, padding: '7px 9px' }}><option value="2d">2D view</option>{embedding.outputDimensions >= 3 && <option value="3d">3D view</option>}{embedding.outputDimensions > 3 && <option value="pairs">Dimension pairs</option>}</select>}
              {embedding && embedding.outputDimensions > 3 && viewMode === 'pairs' && <>
                <select aria-label="Horizontal dimension" value={axisX} onChange={event => setAxisX(Number(event.target.value))} style={{ ...parameterStyle, width: 86, padding: '7px 8px' }}>{Array.from({ length: embedding.outputDimensions }, (_, i) => <option key={i} value={i + 1}>Dim {i + 1} X</option>)}</select>
                <select aria-label="Vertical dimension" value={axisY} onChange={event => setAxisY(Number(event.target.value))} style={{ ...parameterStyle, width: 86, padding: '7px 8px' }}>{Array.from({ length: embedding.outputDimensions }, (_, i) => <option key={i} value={i + 1}>Dim {i + 1} Y</option>)}</select>
              </>}
              {embedding && viewMode === '3d' && <>
                <button onClick={() => setShowHulls(value => !value)} style={toggleStyle(showHulls, text, border)}>Hulls</button>
                <button onClick={() => setShowRays(value => !value)} style={toggleStyle(showRays, text, border)}>Rays</button>
                <button onClick={() => setShowCentroids(value => !value)} style={toggleStyle(showCentroids, text, border)}>Centroids</button>
                <button onClick={() => setShowGrid(value => !value)} style={toggleStyle(showGrid, text, border)}>Grid</button>
                <button onClick={() => setShowAxes(value => !value)} style={toggleStyle(showAxes, text, border)}>Axes</button>
              </>}
              {(!embedding || viewMode !== '3d') && <select aria-label="Point color" value={colorMode} onChange={event => setColorMode(event.target.value as 'label' | 'single')} style={{ ...parameterStyle, width: 130, padding: '7px 9px' }}><option value="label">Color by label</option><option value="single">Single color</option></select>}
              {embedding && <button onClick={exportCsv} style={secondaryStyle(text, border)}><Download size={14} /> CSV</button>}
            </div>
          </div>
          {embedding && viewMode === '3d' && spatial ? <>
            <ThreeScatterPlot
              data={spatial.data}
              features={spatial.features}
              currentSnapshot={spatial.snapshot}
              allSnapshots={[spatial.snapshot]}
              currentIteration={0}
              normalizationBounds={spatial.bounds}
              selectedPointIndex={selectedPointIndex}
              onSelectPoint={setSelectedPointIndex}
              isolatedCluster={isolatedCluster}
              showTrajectories={false}
              showDistanceRays={showRays}
              showHulls={showHulls}
              showCentroids={showCentroids}
              showGrid={showGrid}
              showAxes={showAxes}
              pointSize={1.25}
              height={590}
              defaultAutoRotate
              autoRotateSpeed={1.8}
              clusterNames={spatial.clusterNames}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', padding: '10px 14px', borderTop: `1px solid ${border}` }}>
              <span style={{ color: muted, fontSize: 10, fontWeight: 800, marginRight: 3 }}>Cluster focus:</span>
              <button onClick={() => setIsolatedCluster(null)} style={toggleStyle(isolatedCluster === null, text, border)}>All groups ({spatial.clusterNames.length})</button>
              {spatial.clusterNames.map((name, cluster) => {
                const count = spatial.snapshot.clusterSizes[cluster] || 0;
                return <button key={name} onClick={() => setIsolatedCluster(isolatedCluster === cluster ? null : cluster)} style={toggleStyle(isolatedCluster === cluster, text, border)}>{name} ({count})</button>;
              })}
            </div>
          </> : embedding ? <svg viewBox="0 0 920 480" role="img" aria-label={`${embedding.outputDimensions}D t-SNE embedding, currently showing dimensions ${viewMode === 'pairs' ? `${axisX} and ${axisY}` : '1 and 2'}`} style={{ width: '100%', height: 480, display: 'block', padding: '4px 14px 12px' }}>
            {[0, 1, 2, 3, 4].map(tick => {
              const x = 62 + tick * 202.5;
              const y = 56 + tick * 90;
              const xValue = minX + (tick / 4) * rangeX;
              const yValue = maxY - (tick / 4) * rangeY;
              return <g key={tick}>
                <line x1={x} y1="56" x2={x} y2="416" stroke={isDark ? 'rgba(148,163,184,.14)' : '#e2e8f0'} />
                <line x1="62" y1={y} x2="872" y2={y} stroke={isDark ? 'rgba(148,163,184,.14)' : '#e2e8f0'} />
                <text x={x} y="438" textAnchor="middle" fill={muted} fontSize="10">{xValue.toFixed(1)}</text>
                <text x="51" y={y + 3} textAnchor="end" fill={muted} fontSize="10">{yValue.toFixed(1)}</text>
              </g>;
            })}
            <line x1="62" y1="416" x2="872" y2="416" stroke={border} />
            <line x1="62" y1="56" x2="62" y2="416" stroke={border} />
            <text x="467" y="468" textAnchor="middle" fill={muted} fontSize="12">t-SNE {viewMode === 'pairs' ? axisX : 1}</text>
            <text x="16" y="236" textAnchor="middle" fill={muted} fontSize="12" transform="rotate(-90 16 236)">t-SNE {viewMode === 'pairs' ? axisY : 2}</text>
            {scatterRows.map((point, index) => <circle key={`${point.sample}-${index}`} cx={svgX(point.x)} cy={svgY(point.y)} r="4.2" fill={point.color} fillOpacity=".84" stroke={isDark ? '#07111d' : '#ffffff'} strokeWidth=".8">
              <title>{`Sample ${point.sample} · ${point.label}\nt-SNE ${viewMode === 'pairs' ? axisX : 1}: ${point.x.toFixed(3)}\nt-SNE ${viewMode === 'pairs' ? axisY : 2}: ${point.y.toFixed(3)}`}</title>
            </circle>)}
            {scatterRows.length === 0 && <text x="467" y="240" textAnchor="middle" fill={muted} fontSize="14">No finite embedding coordinates to display</text>}
          </svg> : <div style={{ height: 470, display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
            <div style={{ maxWidth: 350 }}>
              <div style={{ width: 128, height: 128, margin: '0 auto 17px', borderRadius: '50%', background: 'radial-gradient(circle at 36% 35%, rgba(34,211,238,.75) 0 4px, transparent 5px), radial-gradient(circle at 68% 38%, rgba(167,139,250,.8) 0 5px, transparent 6px), radial-gradient(circle at 45% 68%, rgba(251,113,133,.8) 0 4px, transparent 5px), radial-gradient(circle at 57% 49%, rgba(52,211,153,.8) 0 5px, transparent 6px), radial-gradient(circle, rgba(34,211,238,.14), transparent 70%)', border: `1px solid ${border}` }} />
              <div style={{ fontSize: 14, fontWeight: 800 }}>Your embedding appears here</div>
              <p style={{ color: muted, fontSize: 11, marginTop: 6, lineHeight: 1.6 }}>Start with the selected dataset and features. Adjust neighborhood scale and rerun to compare how the local structure changes.</p>
            </div>
          </div>}
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
        <MetricCard title="Rows in map" value={embedding ? embedding.sampleIndices.length.toLocaleString() : `${sampleIndices.length.toLocaleString()} ready`} note={pcaResult.transformedData.length > MAX_POINTS ? 'Subsampled for speed' : 'All usable rows'} color="#22d3ee" cardStyle={cardStyle} muted={muted} text={text} />
        <MetricCard title="Neighborhood retention @10" value={embedding ? `${embedding.neighborhoodRetention.toFixed(1)}%` : '—'} note="Share of 10 nearest input-space neighbors kept nearby" color="#a78bfa" cardStyle={cardStyle} muted={muted} text={text} />
        <MetricCard title="Final KL divergence" value={embedding ? embedding.kl.toFixed(3) : progressKL !== null ? progressKL.toFixed(3) : '—'} note="Optimization trace; compare runs on this same dataset" color="#fb7185" cardStyle={cardStyle} muted={muted} text={text} />
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(260px, 1fr)', gap: 12 }}>
        <div style={{ ...cardStyle, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}><h3 style={{ fontSize: 13, margin: 0 }}>Optimization progress</h3><span style={{ fontSize: 10, color: muted }}>{running ? `${iteration} / ${iterations} iterations` : embedding ? `${history.length} checkpoints` : 'Appears after running'}</span></div>
          {history.length > 1 ? <div style={{ marginTop: 10, height: 105, position: 'relative' }}><svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%', overflow: 'visible' }}><line x1="0" y1="96" x2="100" y2="96" stroke={border} strokeDasharray="2 3" /><polyline points={chartPoints} fill="none" stroke="#22d3ee" strokeWidth="1.8" vectorEffect="non-scaling-stroke" /></svg><div style={{ display: 'flex', justifyContent: 'space-between', color: muted, fontSize: 9, marginTop: 4 }}><span>Iteration 1</span><span>Iteration {history[history.length - 1].iteration}</span></div></div> : <div style={{ height: 105, display: 'grid', placeItems: 'center', color: muted, fontSize: 10 }}>Run t-SNE to see the KL divergence trace</div>}
        </div>
        <div style={{ ...cardStyle, padding: 16 }}>
          <h3 style={{ fontSize: 13, margin: '0 0 7px' }}>What this score means</h3>
          <p style={{ color: muted, fontSize: 10.5, lineHeight: 1.6, margin: 0 }}>Neighborhood retention compares each sample’s 10 nearest neighbors before and after mapping. Higher means more of those local relationships were preserved. t-SNE mainly explains local neighborhoods; cluster size, gaps, and global distances can shift between runs.</p>
          <div style={{ marginTop: 9, color: isDark ? '#fbbf24' : '#92400e', fontSize: 10, lineHeight: 1.5 }}>Labels only color the points. Treat separation as a pattern to inspect, not proof that the groups are statistically distinct.</div>
        </div>
      </section>
      <div style={{ color: muted, fontSize: 10, padding: '0 3px' }}>Source data: {datasetName} · Numeric values use the current preprocessing imputation and scaling settings · Palette: {colorPalette}</div>
    </div>
  );
};

function scalingName(scaling: ScalingStrategy) {
  return scaling === 'standard' ? 'standard scaled' : scaling === 'minmax' ? 'min-max scaled' : scaling === 'robust' ? 'robust scaled' : 'raw centered';
}

const actionStyle = (color: string): React.CSSProperties => ({
  flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px 12px', border: 'none', borderRadius: 9, background: color, color: '#fff', fontWeight: 800, fontSize: 11, cursor: 'pointer'
});

const secondaryStyle = (text: string, border: string): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 10px', border: `1px solid ${border}`, borderRadius: 8, background: 'transparent', color: text, fontSize: 10.5, fontWeight: 700, cursor: 'pointer'
});

const toggleStyle = (active: boolean, text: string, border: string): React.CSSProperties => ({
  ...secondaryStyle(text, border),
  color: active ? '#05232b' : text,
  background: active ? '#22d3ee' : 'transparent',
  borderColor: active ? '#22d3ee' : border,
  whiteSpace: 'nowrap'
});

const MetricCard: React.FC<{ title: string; value: string; note: string; color: string; cardStyle: React.CSSProperties; muted: string; text: string }> = ({ title, value, note, color, cardStyle, muted, text }) => (
  <div style={{ ...cardStyle, padding: '13px 15px', borderTop: `2px solid ${color}` }}>
    <div style={{ fontSize: 10, color: muted, fontWeight: 700 }}>{title}</div>
    <div style={{ fontSize: 22, color: text, fontWeight: 800, marginTop: 4 }}>{value}</div>
    <div style={{ color: muted, fontSize: 9.5, marginTop: 3, lineHeight: 1.4 }}>{note}</div>
  </div>
);
