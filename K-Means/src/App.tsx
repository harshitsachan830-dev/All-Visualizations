import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  DataPoint,
  ImputationMethod,
  ColumnProfile,
  parseCSV,
  parseCSVString,
  computeColumnProfiles,
  imputeMissingValues,
  countMissing,
} from './utils/csv';
import {
  KMeansRunConfig,
  KMeansRunResult,
  runKMeans,
  computeElbowCurve,
  getClusterColor,
} from './utils/kmeans';

// View Components
import { OverviewView } from './components/views/OverviewView';
import { DatasetView } from './components/views/DatasetView';
import { ThreeDExplorerView } from './components/views/ThreeDExplorerView';
import { ClusteringProcessView } from './components/views/ClusteringProcessView';
import { ClusterAnalysisView } from './components/views/ClusterAnalysisView';
import { CentroidMovementView } from './components/views/CentroidMovementView';
import { PointAssignmentView } from './components/views/PointAssignmentView';
import { ElbowView } from './components/views/ElbowView';
import { SilhouetteView } from './components/views/SilhouetteView';
import { ClusterComparisonView } from './components/views/ClusterComparisonView';
import { PredictionExplorerView } from './components/views/PredictionExplorerView';
import { PCA3DView } from './components/views/PCA3DView';
import { ParameterTuningView } from './components/views/ParameterTuningView';
import { RunComparisonView } from './components/views/RunComparisonView';
import { AboutKMeansStudioView } from './components/views/AboutKMeansStudioView';

// Icons
import {
  LayoutDashboard,
  Database,
  Box,
  PlayCircle,
  PieChart,
  GitCommit,
  Crosshair,
  TrendingDown,
  Sparkles,
  Columns,
  Target,
  Network,
  Sliders,
  History,
  BookOpen,
  Zap,
} from 'lucide-react';

const getSuggestedFeatures = (data: DataPoint[], columns: string[]): string[] => {
  const numericColumns = columns.filter((column) =>
    data.some((row) => typeof row[column] === 'number' && !isNaN(row[column]))
  );
  const featureColumns = numericColumns.filter((column) => !/(?:^|[_\s-])id$/i.test(column));
  return featureColumns.length >= 3 ? featureColumns : numericColumns;
};

// Default embedded Iris CSV for guaranteed zero-delay load
const EMBEDDED_IRIS_CSV = `sepal_length,sepal_width,petal_length,petal_width
5.1,3.5,1.4,0.2
4.9,3.0,1.4,0.2
4.7,3.2,1.3,0.2
4.6,3.1,1.5,0.2
5.0,3.6,1.4,0.2
5.4,3.9,1.7,0.4
4.6,3.4,1.4,0.3
5.0,3.4,1.5,0.2
4.4,2.9,1.4,0.2
4.9,3.1,1.5,0.1
5.4,3.7,1.5,0.2
4.8,3.4,1.6,0.2
4.8,3.0,1.4,0.1
4.3,3.0,1.1,0.1
5.8,4.0,1.2,0.2
5.7,4.4,1.5,0.4
5.4,3.9,1.3,0.4
5.1,3.5,1.4,0.3
5.7,3.8,1.7,0.3
5.1,3.8,1.5,0.3
5.4,3.4,1.7,0.2
5.1,3.7,1.5,0.4
4.6,3.6,1.0,0.2
5.1,3.3,1.7,0.5
4.8,3.4,1.9,0.2
5.0,3.0,1.6,0.2
5.0,3.4,1.6,0.4
5.2,3.5,1.5,0.2
5.2,3.4,1.4,0.2
4.7,3.2,1.6,0.2
4.8,3.1,1.6,0.2
5.4,3.4,1.5,0.4
5.2,4.1,1.5,0.1
5.5,4.2,1.4,0.2
4.9,3.1,1.5,0.2
5.0,3.2,1.2,0.2
5.5,3.5,1.3,0.2
4.9,3.6,1.4,0.1
4.4,3.0,1.3,0.2
5.1,3.4,1.5,0.2
5.0,3.5,1.3,0.3
4.5,2.3,1.3,0.3
4.4,3.2,1.3,0.2
5.0,3.5,1.6,0.6
5.1,3.8,1.9,0.4
4.8,3.0,1.4,0.3
5.1,3.8,1.6,0.2
4.6,3.2,1.4,0.2
5.3,3.7,1.5,0.2
5.0,3.3,1.4,0.2
7.0,3.2,4.7,1.4
6.4,3.2,4.5,1.5
6.9,3.1,4.9,1.5
5.5,2.3,4.0,1.3
6.5,2.8,4.6,1.5
5.7,2.8,4.5,1.3
6.3,3.3,4.7,1.6
4.9,2.4,3.3,1.0
6.6,2.9,4.6,1.3
5.2,2.7,3.9,1.4
5.0,2.0,3.5,1.0
5.9,3.0,4.2,1.5
6.0,2.2,4.0,1.0
6.1,2.9,4.7,1.4
5.6,2.9,3.6,1.3
6.7,3.1,4.4,1.4
5.6,3.0,4.5,1.5
5.8,2.7,4.1,1.0
6.2,2.2,4.5,1.5
5.6,2.5,3.9,1.1
5.9,3.2,4.8,1.8
6.1,2.8,4.0,1.3
6.3,2.5,4.9,1.5
6.1,2.8,4.7,1.2
6.4,2.9,4.3,1.3
6.6,3.0,4.4,1.4
6.8,2.8,4.8,1.4
6.7,3.0,5.0,1.7
6.0,2.9,4.5,1.5
5.7,2.6,3.5,1.0
5.5,2.4,3.8,1.1
5.5,2.4,3.7,1.0
5.8,2.7,3.9,1.2
6.0,2.7,5.1,1.6
5.4,3.0,4.5,1.5
6.0,3.4,4.5,1.6
6.7,3.1,4.7,1.5
6.3,2.3,4.4,1.3
5.6,3.0,4.1,1.3
5.5,2.5,4.0,1.3
5.5,2.6,4.4,1.2
6.1,3.0,4.6,1.4
5.8,2.6,4.0,1.2
5.0,2.3,3.3,1.0
5.6,2.7,4.2,1.3
5.7,3.0,4.2,1.2
5.7,2.9,4.2,1.3
6.2,2.9,4.3,1.3
5.1,2.5,3.0,1.1
5.7,2.8,4.1,1.3
6.3,3.3,6.0,2.5
5.8,2.7,5.1,1.9
7.1,3.0,5.9,2.1
6.3,2.9,5.6,1.8
6.5,3.0,5.8,2.2
7.6,3.0,6.6,2.1
4.9,2.5,4.5,1.7
7.3,2.9,6.3,1.8
6.7,2.5,5.8,1.8
7.2,3.6,6.1,2.5
6.5,3.2,5.1,2.0
6.4,2.7,5.3,1.9
6.8,3.0,5.5,2.1
5.7,2.5,5.0,2.0
5.8,2.8,5.1,2.4
6.4,3.2,5.3,2.3
6.5,3.0,5.5,1.8
7.7,3.8,6.7,2.2
7.7,2.6,6.9,2.3
6.0,2.2,5.0,1.5
6.9,3.2,5.7,2.3
5.6,2.8,4.9,2.0
7.7,2.8,6.7,2.0
6.3,2.7,4.9,1.8
6.7,3.3,5.7,2.1
7.2,3.2,6.0,1.8
6.2,2.8,4.8,1.8
6.1,3.0,4.9,1.8
6.4,2.8,5.6,2.1
7.2,3.0,5.8,1.6
7.4,2.8,6.1,1.9
7.9,3.8,6.4,2.0
6.4,2.8,5.6,2.2
6.3,2.8,5.1,1.5
6.1,2.6,5.6,1.4
7.7,3.0,6.1,2.3
6.3,3.4,5.6,2.4`;

type NavTabId =
  | 'overview'
  | 'dataset'
  | '3d-explorer'
  | 'process'
  | 'cluster-analysis'
  | 'centroid-movement'
  | 'point-assignment'
  | 'elbow'
  | 'silhouette'
  | 'cluster-comparison'
  | 'prediction-explorer'
  | 'pca-3d'
  | 'tuning'
  | 'run-comparison'
  | 'theory';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTabId>('overview');
  const [activeDatasetName, setActiveDatasetName] = useState<string>('Iris Flowers');

  // Raw dataset data
  const [rawDataset, setRawDataset] = useState<{
    data: DataPoint[];
    columns: string[];
    rawData: Record<string, unknown>[];
  }>(() => parseCSVString(EMBEDDED_IRIS_CSV));

  // Imputation method & clean data
  const [imputationMethod, setImputationMethod] = useState<ImputationMethod>('mean');

  const cleanData = useMemo(() => {
    return imputeMissingValues(rawDataset.data, rawDataset.columns, imputationMethod);
  }, [rawDataset.data, rawDataset.columns, imputationMethod]);

  const rawMissingCount = useMemo(() => {
    return countMissing(rawDataset.data, rawDataset.columns);
  }, [rawDataset.data, rawDataset.columns]);

  const currentMissingCount = useMemo(() => {
    return countMissing(cleanData, rawDataset.columns);
  }, [cleanData, rawDataset.columns]);

  const columnProfiles = useMemo(() => {
    return computeColumnProfiles(cleanData, rawDataset.columns);
  }, [cleanData, rawDataset.columns]);

  const numericColumns = useMemo(() => {
    return columnProfiles.filter((column) => column.isNumeric).map((column) => column.name);
  }, [columnProfiles]);

  // Selected 3D Features (X, Y, Z)
  const [features, setFeatures] = useState<[string, string, string]>(() => {
    const defaultCols = ['sepal_length', 'sepal_width', 'petal_length'];
    return [defaultCols[0], defaultCols[1], defaultCols[2]];
  });

  // Keep 3D features valid when columns change
  useEffect(() => {
    const suggestedFeatures = getSuggestedFeatures(cleanData, rawDataset.columns);
    if (suggestedFeatures.length >= 3) {
      if (!suggestedFeatures.includes(features[0]) || !suggestedFeatures.includes(features[1]) || !suggestedFeatures.includes(features[2])) {
        setFeatures([suggestedFeatures[0], suggestedFeatures[1], suggestedFeatures[2]]);
      }
    }
  }, [cleanData, rawDataset.columns, features]);

  // Model Hyperparameters
  const [runConfig, setRunConfig] = useState<KMeansRunConfig>({
    k: 3,
    initMethod: 'k-means++',
    maxIterations: 40,
    tolerance: 1e-4,
    seed: 42,
  });

  // Current Model Run Result
  const [runResult, setRunResult] = useState<KMeansRunResult>(() => {
    return runKMeans(cleanData, features, runConfig);
  });

  // Re-run model when cleanData, features, or runConfig change
  const executeRun = useCallback((newConfig?: KMeansRunConfig) => {
    const cfg = newConfig || runConfig;
    if (newConfig) setRunConfig(newConfig);
    const res = runKMeans(cleanData, features, cfg);
    setRunResult(res);
    setCurrentIteration(res.totalIterations);
    return res;
  }, [cleanData, features, runConfig]);

  // Run history list
  const [runHistory, setRunHistory] = useState<{ id: number; timestamp: string; result: KMeansRunResult }[]>([
    { id: 1, timestamp: new Date().toLocaleTimeString(), result: runResult },
  ]);

  const handleRunModel = (cfg: KMeansRunConfig) => {
    const res = executeRun(cfg);
    setRunHistory((prev) => [
      ...prev,
      { id: prev.length + 1, timestamp: new Date().toLocaleTimeString(), result: res },
    ]);
  };

  // Recalculate when dataset or features change
  useEffect(() => {
    if (cleanData.length > 0 && features[0] && features[1] && features[2]) {
      const res = runKMeans(cleanData, features, runConfig);
      setRunResult(res);
      setCurrentIteration(res.totalIterations);
    }
  }, [cleanData, features, runConfig]);

  // Elbow Data (WCSS vs K=1..8)
  const elbowData = useMemo(() => {
    if (cleanData.length === 0 || !features[0] || !features[1] || !features[2]) return [];
    return computeElbowCurve(cleanData, features, 8, runConfig.seed);
  }, [cleanData, features, runConfig.seed]);

  // Animation Playback State
  const [currentIteration, setCurrentIteration] = useState<number>(runResult.totalIterations);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playSpeed, setPlaySpeed] = useState<number>(1);
  const playTimerRef = useRef<number | null>(null);

  // Selected Point & Cluster Isolation
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [isolatedCluster, setIsolatedCluster] = useState<number | null>(null);

  // Playback timer effect
  useEffect(() => {
    if (isPlaying) {
      const delay = Math.max(100, Math.round(900 / playSpeed));
      playTimerRef.current = window.setInterval(() => {
        setCurrentIteration((prev) => {
          if (prev >= runResult.totalIterations) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, delay);
    } else {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    }
    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, playSpeed, runResult.totalIterations]);

  // Current iteration snapshot
  const currentSnapshot = runResult.iterations[currentIteration] || runResult.finalIteration;

  // File Upload Handler
  const handleFileUpload = (file: File) => {
    parseCSV(
      file,
      (data, columns, raw) => {
        setRawDataset({ data, columns, rawData: raw });
        setActiveDatasetName(file.name.replace(/\.[^/.]+$/, ''));
        const suggestedFeatures = getSuggestedFeatures(data, columns);
        if (suggestedFeatures.length >= 3) {
          setFeatures([suggestedFeatures[0], suggestedFeatures[1], suggestedFeatures[2]]);
        }
      },
      (err) => alert(`Error reading CSV: ${err}`)
    );
  };

  // Sample CSV Loader
  const handleLoadSample = (sampleKey: 'iris' | 'customers' | 'blobs') => {
    fetch(`/samples/${sampleKey}.csv`)
      .then((res) => res.text())
      .then((text) => {
        const parsed = parseCSVString(text);
        setRawDataset(parsed);
        const nameMap = {
          iris: 'Iris Flowers (4D)',
          customers: 'Customer Segmentation (Messy Data)',
          blobs: 'Gaussian Blobs (3 Clusters)',
        };
        setActiveDatasetName(nameMap[sampleKey]);
        const suggestedFeatures = getSuggestedFeatures(parsed.data, parsed.columns);
        if (suggestedFeatures.length >= 3) {
          setFeatures([suggestedFeatures[0], suggestedFeatures[1], suggestedFeatures[2]]);
        }
      })
      .catch(() => {
        // Fallback for Iris
        if (sampleKey === 'iris') {
          const parsed = parseCSVString(EMBEDDED_IRIS_CSV);
          setRawDataset(parsed);
          setActiveDatasetName('Iris Flowers (4D)');
        }
      });
  };

  return (
    <div className="app-container">
      {/* ── LEFT NAVIGATION SIDEBAR ────────────────── */}
      <aside className="sidebar">
        {/* Brand Header */}
        <div className="sidebar-header">
          <div className="brand-badge">
            <Box size={18} />
          </div>
          <div>
            <div className="brand-title">K-Means Studio</div>
            <div className="brand-subtitle">Interactive 3D Visualizer</div>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className="sidebar-nav">
          {/* Section: MODEL */}
          <div>
            <div className="nav-section-title">Model</div>
            <button
              className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <LayoutDashboard size={15} /> Overview
            </button>
            <button
              className={`nav-item ${activeTab === 'dataset' ? 'active' : ''}`}
              onClick={() => setActiveTab('dataset')}
            >
              <Database size={15} /> Dataset & Cleaning
            </button>
            <button
              className={`nav-item ${activeTab === '3d-explorer' ? 'active' : ''}`}
              onClick={() => setActiveTab('3d-explorer')}
            >
              <Box size={15} /> 3D Visualization
            </button>
            <button
              className={`nav-item ${activeTab === 'process' ? 'active' : ''}`}
              onClick={() => setActiveTab('process')}
            >
              <PlayCircle size={15} /> Clustering Process
            </button>
          </div>

          {/* Section: INSPECT */}
          <div>
            <div className="nav-section-title">Inspect</div>
            <button
              className={`nav-item ${activeTab === 'cluster-analysis' ? 'active' : ''}`}
              onClick={() => setActiveTab('cluster-analysis')}
            >
              <PieChart size={15} /> Cluster Analysis
            </button>
            <button
              className={`nav-item ${activeTab === 'centroid-movement' ? 'active' : ''}`}
              onClick={() => setActiveTab('centroid-movement')}
            >
              <GitCommit size={15} /> Centroid Movement
            </button>
            <button
              className={`nav-item ${activeTab === 'point-assignment' ? 'active' : ''}`}
              onClick={() => setActiveTab('point-assignment')}
            >
              <Crosshair size={15} /> Point Assignment
            </button>
          </div>

          {/* Section: QUALITY */}
          <div>
            <div className="nav-section-title">Quality</div>
            <button
              className={`nav-item ${activeTab === 'elbow' ? 'active' : ''}`}
              onClick={() => setActiveTab('elbow')}
            >
              <TrendingDown size={15} /> Elbow Method
            </button>
            <button
              className={`nav-item ${activeTab === 'silhouette' ? 'active' : ''}`}
              onClick={() => setActiveTab('silhouette')}
            >
              <Sparkles size={15} /> Silhouette Analysis
            </button>
            <button
              className={`nav-item ${activeTab === 'cluster-comparison' ? 'active' : ''}`}
              onClick={() => setActiveTab('cluster-comparison')}
            >
              <Columns size={15} /> Cluster Comparison
            </button>
          </div>

          {/* Section: EXPLAIN */}
          <div>
            <div className="nav-section-title">Explain</div>
            <button
              className={`nav-item ${activeTab === 'prediction-explorer' ? 'active' : ''}`}
              onClick={() => setActiveTab('prediction-explorer')}
            >
              <Target size={15} /> Prediction Explorer
            </button>
            <button
              className={`nav-item ${activeTab === 'pca-3d' ? 'active' : ''}`}
              onClick={() => setActiveTab('pca-3d')}
            >
              <Network size={15} /> PCA 3D View
            </button>
          </div>

          {/* Section: EXPERIMENT */}
          <div>
            <div className="nav-section-title">Experiment</div>
            <button
              className={`nav-item ${activeTab === 'tuning' ? 'active' : ''}`}
              onClick={() => setActiveTab('tuning')}
            >
              <Sliders size={15} /> Parameter Tuning
            </button>
            <button
              className={`nav-item ${activeTab === 'run-comparison' ? 'active' : ''}`}
              onClick={() => setActiveTab('run-comparison')}
            >
              <History size={15} /> Run Comparison
            </button>
          </div>

          {/* Section: HELP */}
          <div>
            <div className="nav-section-title">Help</div>
            <button
              className={`nav-item ${activeTab === 'theory' ? 'active' : ''}`}
              onClick={() => setActiveTab('theory')}
            >
              <BookOpen size={15} /> About K-Means Studio
            </button>
          </div>
        </nav>
      </aside>

      {/* ── MAIN CONTENT VIEWPORT ──────────────────── */}
      <main className="main-viewport">
        {/* Top Header Bar */}
        <header className="top-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
              Dataset: <span style={{ color: '#00e0ba' }}>{activeDatasetName}</span>
            </span>
            <span style={{ color: '#334155' }}>|</span>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              {cleanData.length} Points · K = <strong style={{ color: '#ff3483' }}>{runConfig.k}</strong> · Seed: {runConfig.seed}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                background: runResult.converged ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                color: runResult.converged ? '#4ade80' : '#facc15',
                border: `1px solid ${runResult.converged ? '#22c55e' : '#eab308'}`,
                borderRadius: '12px',
                padding: '3px 10px',
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              {runResult.converged ? '✓ Converged' : '⚠ Active'}
            </span>

            <button
              className="primary-btn"
              onClick={() => handleRunModel({ ...runConfig, seed: runConfig.seed + 1 })}
              title="Retrain model with incremented seed"
            >
              <Zap size={14} /> Retrain Run
            </button>
          </div>
        </header>

        {/* Dynamic Page Views Canvas */}
        <div className="content-canvas">
          {activeTab === 'overview' && (
            <OverviewView
              data={cleanData}
              features={features}
              runResult={runResult}
              currentIteration={currentIteration}
              currentSnapshot={currentSnapshot}
              isPlaying={isPlaying}
              playSpeed={playSpeed}
              onPlayToggle={() => {
                if (currentIteration >= runResult.totalIterations) setCurrentIteration(0);
                setIsPlaying(!isPlaying);
              }}
              onIterationChange={(iter) => {
                setIsPlaying(false);
                setCurrentIteration(iter);
              }}
              onSpeedChange={(spd) => setPlaySpeed(spd)}
              onReset={() => {
                setIsPlaying(false);
                setCurrentIteration(0);
              }}
              elbowData={elbowData}
              onNavigateTab={(tab) => setActiveTab(tab as NavTabId)}
              isolatedCluster={isolatedCluster}
              onToggleIsolateCluster={(c) => setIsolatedCluster(c)}
            />
          )}

          {activeTab === 'dataset' && (
            <DatasetView
              data={cleanData}
              columns={rawDataset.columns}
              columnProfiles={columnProfiles}
              features={features}
              onFeaturesChange={(newFeats) => setFeatures(newFeats)}
              imputationMethod={imputationMethod}
              onImputationMethodChange={(m) => setImputationMethod(m)}
              rawMissingCount={rawMissingCount}
              currentMissingCount={currentMissingCount}
              onFileUpload={handleFileUpload}
              onLoadSample={handleLoadSample}
              activeDatasetName={activeDatasetName}
            />
          )}

          {activeTab === '3d-explorer' && (
            <ThreeDExplorerView
              data={cleanData}
              features={features}
              runResult={runResult}
              currentIteration={currentIteration}
              currentSnapshot={currentSnapshot}
              selectedPointIndex={selectedPointIndex}
              onSelectPoint={(idx) => setSelectedPointIndex(idx)}
              isolatedCluster={isolatedCluster}
              onToggleIsolateCluster={(c) => setIsolatedCluster(c)}
            />
          )}

          {activeTab === 'process' && (
            <ClusteringProcessView
              data={cleanData}
              features={features}
              runResult={runResult}
              currentIteration={currentIteration}
              currentSnapshot={currentSnapshot}
              isPlaying={isPlaying}
              playSpeed={playSpeed}
              onPlayToggle={() => {
                if (currentIteration >= runResult.totalIterations) setCurrentIteration(0);
                setIsPlaying(!isPlaying);
              }}
              onIterationChange={(iter) => {
                setIsPlaying(false);
                setCurrentIteration(iter);
              }}
              onSpeedChange={(spd) => setPlaySpeed(spd)}
              onReset={() => {
                setIsPlaying(false);
                setCurrentIteration(0);
              }}
            />
          )}

          {activeTab === 'cluster-analysis' && (
            <ClusterAnalysisView
              data={cleanData}
              features={features}
              runResult={runResult}
              currentSnapshot={currentSnapshot}
            />
          )}

          {activeTab === 'centroid-movement' && (
            <CentroidMovementView
              data={cleanData}
              features={features}
              runResult={runResult}
              currentIteration={currentIteration}
              currentSnapshot={currentSnapshot}
            />
          )}

          {activeTab === 'point-assignment' && (
            <PointAssignmentView
              data={cleanData}
              features={features}
              runResult={runResult}
              currentIteration={currentIteration}
              currentSnapshot={currentSnapshot}
              selectedPointIndex={selectedPointIndex}
              onSelectPoint={(idx) => setSelectedPointIndex(idx)}
            />
          )}

          {activeTab === 'elbow' && (
            <ElbowView
              elbowData={elbowData}
              currentK={runConfig.k}
              onApplyK={(k) => handleRunModel({ ...runConfig, k })}
            />
          )}

          {activeTab === 'silhouette' && (
            <SilhouetteView runResult={runResult} />
          )}

          {activeTab === 'cluster-comparison' && (
            <ClusterComparisonView
              data={cleanData}
              features={features}
              runResult={runResult}
            />
          )}

          {activeTab === 'prediction-explorer' && (
            <PredictionExplorerView
              data={cleanData}
              features={features}
              runResult={runResult}
            />
          )}

          {activeTab === 'pca-3d' && (
            <PCA3DView
              data={cleanData}
              allNumericFeatures={numericColumns}
              runResult={runResult}
            />
          )}

          {activeTab === 'tuning' && (
            <ParameterTuningView
              currentConfig={runConfig}
              onRunModel={(cfg) => handleRunModel(cfg)}
              lastRunResult={runResult}
            />
          )}

          {activeTab === 'run-comparison' && (
            <RunComparisonView
              runHistory={runHistory}
              onRestoreRun={(cfg) => handleRunModel(cfg)}
            />
          )}

          {activeTab === 'theory' && <AboutKMeansStudioView />}
        </div>
      </main>
    </div>
  );
}
