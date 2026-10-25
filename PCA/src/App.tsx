import React, { useState, useMemo, useEffect } from 'react';
import Papa from 'papaparse';
import { SidebarNav, ActiveNavModule } from './components/SidebarNav';

import { Plotly2DProjection } from './components/Plotly2DProjection';
import { Plotly3DProjection } from './components/Plotly3DProjection';
import { ExplainedVariancePlot } from './components/ExplainedVariancePlot';
import { FeatureLoadingsHeatmap } from './components/FeatureLoadingsHeatmap';
import { DBSCANClusterPanel } from './components/DBSCANClusterPanel';
import { ParallelCoordinatesPlot } from './components/ParallelCoordinatesPlot';
import { ComponentPairsMatrix } from './components/ComponentPairsMatrix';
import { FeatureCorrelationCircle } from './components/FeatureCorrelationCircle';
import { DataTableLinked } from './components/DataTableLinked';
import { DataModule } from './components/DataModule';
import { ReconstructionStudio } from './components/ReconstructionStudio';
import { CompareModule } from './components/CompareModule';
import { MessyDataStudio } from './components/MessyDataStudio';
import { FeatureRadarStudio } from './components/FeatureRadarStudio';
import { CSVUploadModal } from './components/CSVUploadModal';
import { EnhancedPCA3DSpace } from './components/EnhancedPCA3DSpace';
import { KMeansStudio3D } from './components/KMeansStudio3D';
import { PCATheoryGuide } from './components/PCATheoryGuide';
import {
  DatasetInfo,
  MissingValueStrategy,
  ScalingStrategy,
  ReductionMethod,
  AnalysisSpace,
  ThemeMode,
  ColorPalette
} from './types/pca';
import { getPresetDatasets } from './utils/datasets';
import {
  imputeAndCleanData,
  performPCA,
  profileColumns,
  runDBSCAN
} from './utils/math';

export type ProjectionSubTab = '2d_3d' | '3d_fullscreen' | 'enhanced_3d' | 'kmeans_3d' | 'parallel' | 'pairs' | 'radar' | 'correlation' | 'table';

export function App() {
  const [datasets, setDatasets] = useState<DatasetInfo[]>(getPresetDatasets());
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('genomics_20');
  const [activeModule, setActiveModule] = useState<ActiveNavModule>('projection');
  const [projectionTab, setProjectionTab] = useState<ProjectionSubTab>('2d_3d');

  // Theme & Aesthetics state
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [colorPalette, setColorPalette] = useState<ColorPalette>('cyber');

  // Sidebar Analysis Settings
  const [reductionMethod, setReductionMethod] = useState<ReductionMethod>('standard_pca');
  const [scaling, setScaling] = useState<ScalingStrategy>('standard');
  const [retainedComponents, setRetainedComponents] = useState<number>(10);
  const [runIndex, setRunIndex] = useState<number>(1);

  // Clustering Settings (DBSCAN)
  const [dbscanEps, setDbscanEps] = useState<number>(0.85);
  const [dbscanMinSamples, setDbscanMinSamples] = useState<number>(10);
  const [analysisSpace, setAnalysisSpace] = useState<AnalysisSpace>('display_2d');

  // Imputation
  const [imputationStrategy, setImputationStrategy] = useState<MissingValueStrategy>('mean');

  // Feature overrides
  const [featureOverrides, setFeatureOverrides] = useState<Record<string, string[]>>({});
  const [labelOverrides, setLabelOverrides] = useState<Record<string, string>>({});

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Update body class for themes
  useEffect(() => {
    document.body.className = theme === 'dark' ? 'theme-dark' : 'theme-light';
    document.body.style.backgroundColor = theme === 'dark' ? '#070a12' : '#f8fafc';
  }, [theme]);

  // Active dataset
  const activeDataset = useMemo(() => {
    return datasets.find(d => d.id === selectedDatasetId) || datasets[0];
  }, [datasets, selectedDatasetId]);

  const selectedFeatures = useMemo(() => {
    return featureOverrides[activeDataset.id] || activeDataset.defaultFeatures;
  }, [featureOverrides, activeDataset]);

  const labelCol = useMemo(() => {
    return labelOverrides[activeDataset.id] || activeDataset.defaultLabelCol;
  }, [labelOverrides, activeDataset]);

  // Column profiling
  const columnProfiles = useMemo(() => {
    return profileColumns(activeDataset.rows, activeDataset.headers);
  }, [activeDataset]);

  // Clean data using selected imputation strategy
  const { cleanedRows, report: imputationReport } = useMemo(() => {
    return imputeAndCleanData(
      activeDataset.rows,
      selectedFeatures,
      labelCol,
      imputationStrategy
    );
  }, [activeDataset, selectedFeatures, labelCol, imputationStrategy]);

  // Perform PCA calculation
  const pcaResult = useMemo(() => {
    return performPCA(cleanedRows, selectedFeatures, labelCol, scaling);
  }, [cleanedRows, selectedFeatures, labelCol, scaling]);

  // Run DBSCAN Clustering in 2D space (PC1, PC2) to clearly isolate the 3 clusters + noise
  const dbscanResult = useMemo(() => {
    if (!pcaResult || pcaResult.transformedData.length === 0) return null;

    // Cluster on PC1 and PC2 coordinates
    const clusteringPoints = pcaResult.transformedData.map(p => [p.pc1, p.pc2]);
    return runDBSCAN(clusteringPoints, dbscanEps, dbscanMinSamples);
  }, [pcaResult, dbscanEps, dbscanMinSamples]);

  // Max retained components available
  const maxComponents = Math.min(20, pcaResult.nComponents);

  // Retained variance % across selected retained components
  const retainedVariancePct = useMemo(() => {
    const k = Math.min(retainedComponents, pcaResult.nComponents);
    return (pcaResult.cumulativeVariance[k - 1] || 0) * 100;
  }, [pcaResult, retainedComponents]);

  // Handlers
  const handleSelectDataset = (id: string) => {
    setSelectedDatasetId(id);
    const target = datasets.find(d => d.id === id);
    if (target) {
      setRetainedComponents(Math.min(10, target.defaultFeatures.length));
    }
  };

  const handleToggleFeature = (feature: string) => {
    const current = selectedFeatures;
    let next: string[];
    if (current.includes(feature)) {
      if (current.length <= 2) {
        alert('PCA requires at least 2 features to compute.');
        return;
      }
      next = current.filter(f => f !== feature);
    } else {
      next = [...current, feature];
    }
    setFeatureOverrides(prev => ({ ...prev, [activeDataset.id]: next }));
  };

  const handleSelectLabelCol = (col: string) => {
    setLabelOverrides(prev => ({ ...prev, [activeDataset.id]: col }));
  };

  const handleDatasetLoaded = (newDataset: DatasetInfo) => {
    setDatasets(prev => [newDataset, ...prev]);
    setSelectedDatasetId(newDataset.id);
    setRetainedComponents(Math.min(10, newDataset.defaultFeatures.length));
    setActiveModule('projection');
  };

  const handleRunAnalysis = () => {
    setRunIndex(prev => prev + 1);
  };

  const handleExportReport = () => {
    const reportHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>PCA Analysis Report - ${activeDataset.name}</title>
        <style>
          body { font-family: -apple-system, sans-serif; padding: 40px; color: #0f172a; line-height: 1.6; }
          h1 { color: #0284c7; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
          .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
          th { background: #e2e8f0; }
        </style>
      </head>
      <body>
        <h1>PCA Analysis & Dimensionality Reduction Report</h1>
        <div class="card">
          <p><strong>Dataset:</strong> ${activeDataset.name}</p>
          <p><strong>Total Records:</strong> ${activeDataset.rows.length.toLocaleString()}</p>
          <p><strong>Input Features (${selectedFeatures.length}):</strong> ${selectedFeatures.join(', ')}</p>
          <p><strong>Scaling:</strong> ${scaling}</p>
          <p><strong>Retained Components:</strong> ${retainedComponents} PCs</p>
          <p><strong>Retained Variance:</strong> ${retainedVariancePct.toFixed(1)}%</p>
          <p><strong>DBSCAN Clusters:</strong> ${dbscanResult?.nClusters} clusters, ${dbscanResult?.noiseCount} noise points</p>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([reportHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${activeDataset.name.toLowerCase().replace(/\s+/g, '_')}_pca_report.html`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isDark = theme === 'dark';

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: isDark ? 'var(--bg-app)' : '#f8fafc',
      color: isDark ? '#f8fafc' : '#0f172a'
    }}>
      {/* 1. Left Sidebar Navigation */}
      <SidebarNav
        activeModule={activeModule}
        onSelectModule={setActiveModule}
        datasets={datasets}
        selectedDatasetId={selectedDatasetId}
        onSelectDataset={handleSelectDataset}
        reductionMethod={reductionMethod}
        onSelectReductionMethod={setReductionMethod}
        scaling={scaling}
        onSelectScaling={setScaling}
        retainedComponents={retainedComponents}
        maxComponents={maxComponents}
        onRetainedComponentsChange={setRetainedComponents}
        onRunAnalysis={handleRunAnalysis}
        onOpenUpload={() => setIsUploadOpen(true)}
        theme={theme}
        runIndex={runIndex}
        totalRecords={activeDataset.rows.length}
        inputFeaturesCount={selectedFeatures.length}
        retainedVariancePct={retainedVariancePct}
        colorPalette={colorPalette}
        onSelectColorPalette={setColorPalette}
        onToggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
        onExportReport={handleExportReport}
        onLoadDemoData={() => setSelectedDatasetId('genomics_20')}
      />

      {/* 2. Main Workspace Body */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowY: 'auto' }}>

        {/* Workspace Content Router */}
        <main style={{ padding: '20px 24px', flex: 1 }}>
          {/* Module 1: PROJECTION */}
          {activeModule === 'projection' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Top Sub-tabs Bar */}
              <div style={{
                display: 'flex',
                gap: 20,
                borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
                paddingBottom: 4
              }}>
                {[
                  { id: '2d_3d',        label: '2D + 3D Dual Studio' },
                  { id: '3d_fullscreen', label: '3D Fullscreen Immersive' },
                  { id: 'enhanced_3d',  label: '3D Space & Orbits' },
                  { id: 'kmeans_3d',    label: 'PCA 3D View' },
                  { id: 'parallel',     label: 'Parallel Coordinates Flow' },
                  { id: 'pairs',        label: 'Component Pairs SPLOM' },
                  { id: 'radar',        label: 'Radar & Feature Signatures' },
                  { id: 'correlation',  label: 'Correlation Circle' },
                  { id: 'table',        label: 'Data Table Explorer' }
                ].map(tab => {
                  const isActive = projectionTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setProjectionTab(tab.id as ProjectionSubTab)}
                      style={{
                        padding: '8px 10px',
                        border: 'none',
                        borderBottom: isActive
                          ? `2px solid ${isDark ? '#00f5d4' : '#0284c7'}`
                          : '2px solid transparent',
                        background: 'transparent',
                        color: isActive
                          ? isDark ? '#00f5d4' : '#0284c7'
                          : isDark ? '#94a3b8' : '#64748b',
                        fontWeight: isActive ? 800 : 500,
                        fontSize: 13.5,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Tab 1: 2D Studio */}
              {projectionTab === '2d_3d' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {/* Row 1: 2D Full Width */}
                  <div style={{ width: '100%' }}>
                    <Plotly2DProjection
                      pcaResult={pcaResult}
                      dbscanResult={dbscanResult}
                      theme={theme}
                      colorPalette={colorPalette}
                    />
                  </div>

                  {/* Row 2: 3 Cards */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    gap: 18,
                    alignItems: 'stretch'
                  }}>
                    <ExplainedVariancePlot pcaResult={pcaResult} theme={theme} />
                    <FeatureLoadingsHeatmap pcaResult={pcaResult} theme={theme} />
                    <DBSCANClusterPanel
                      dbscanResult={dbscanResult}
                      eps={dbscanEps}
                      minSamples={dbscanMinSamples}
                      onEpsChange={setDbscanEps}
                      onMinSamplesChange={setDbscanMinSamples}
                      analysisSpace={analysisSpace}
                      onAnalysisSpaceChange={setAnalysisSpace}
                      retainedPCs={retainedComponents}
                      theme={theme}
                      colorPalette={colorPalette}
                    />
                  </div>
                </div>
              )}

              {/* Tab 2: 3D Fullscreen Immersive */}
              {projectionTab === '3d_fullscreen' && (
                <div style={{ minHeight: 720 }}>
                  <Plotly3DProjection
                    pcaResult={pcaResult}
                    dbscanResult={dbscanResult}
                    theme={theme}
                    colorPalette={colorPalette}
                  />
                </div>
              )}

              {/* Tab 3: Enhanced 3D Space & Orbits */}
              {projectionTab === 'enhanced_3d' && (
                <EnhancedPCA3DSpace
                  pcaResult={pcaResult}
                  dbscanResult={dbscanResult}
                  theme={theme}
                  colorPalette={colorPalette}
                />
              )}

              {/* Tab 4: K-Means 3D Studio */}
              {projectionTab === 'kmeans_3d' && (
                <KMeansStudio3D
                  pcaResult={pcaResult}
                  datasetName={activeDataset.name}
                  theme={theme}
                  colorPalette={colorPalette}
                />
              )}

              {/* Tab 5: Parallel Coordinates */}

              {projectionTab === 'parallel' && (
                <ParallelCoordinatesPlot
                  pcaResult={pcaResult}
                  dbscanResult={dbscanResult}
                  theme={theme}
                  colorPalette={colorPalette}
                />
              )}

              {/* Tab 4: Component Pairs SPLOM */}
              {projectionTab === 'pairs' && (
                <ComponentPairsMatrix
                  pcaResult={pcaResult}
                  dbscanResult={dbscanResult}
                  theme={theme}
                  colorPalette={colorPalette}
                />
              )}

              {/* Tab 5: Radar & Feature Signatures */}
              {projectionTab === 'radar' && (
                <FeatureRadarStudio
                  pcaResult={pcaResult}
                  theme={theme}
                  colorPalette={colorPalette}
                />
              )}

              {/* Tab 6: Feature Correlation Circle */}
              {projectionTab === 'correlation' && (
                <FeatureCorrelationCircle
                  pcaResult={pcaResult}
                  theme={theme}
                />
              )}

              {/* Tab 7: Data Table */}
              {projectionTab === 'table' && (
                <DataTableLinked
                  pcaResult={pcaResult}
                  dbscanResult={dbscanResult}
                  datasetName={activeDataset.name}
                  theme={theme}
                />
              )}
            </div>
          )}

          {/* Module 2: DATA */}
          {activeModule === 'data' && (
            <DataModule
              activeDataset={activeDataset}
              columnProfiles={columnProfiles}
              selectedFeatures={selectedFeatures}
              onToggleFeature={handleToggleFeature}
              labelCol={labelCol}
              onSelectLabelCol={handleSelectLabelCol}
              onOpenUpload={() => setIsUploadOpen(true)}
              theme={theme}
            />
          )}

          {/* Module 3: PREPROCESSING */}
          {activeModule === 'preprocessing' && (
            <MessyDataStudio
              rawRows={activeDataset.rows}
              headers={activeDataset.headers}
              columnProfiles={columnProfiles}
              selectedFeatures={selectedFeatures}
              onToggleFeature={handleToggleFeature}
              labelCol={labelCol}
              onSelectLabelCol={handleSelectLabelCol}
              imputationStrategy={imputationStrategy}
              onSelectImputation={setImputationStrategy}
              scaling={scaling}
              onSelectScaling={setScaling}
              imputationReport={imputationReport}
              onExportCleanedCsv={() => {
                const csvString = Papa.unparse(cleanedRows);
                const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `${activeDataset.name.toLowerCase().replace(/\s+/g, '_')}_cleaned.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
            />
          )}

          {/* Module 4: COMPONENTS */}
          {activeModule === 'components' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <FeatureRadarStudio
                pcaResult={pcaResult}
                theme={theme}
                colorPalette={colorPalette}
              />
              <ReconstructionStudio
                pcaResult={pcaResult}
                scaling={scaling}
                theme={theme}
              />
              <FeatureCorrelationCircle
                pcaResult={pcaResult}
                theme={theme}
              />
            </div>
          )}

          {/* Module 5: CLUSTERING */}
          {activeModule === 'clustering' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{
                background: isDark ? 'var(--bg-card)' : '#ffffff',
                borderRadius: 14,
                border: `1px solid ${isDark ? 'var(--border-card)' : '#e2e8f0'}`,
                padding: '20px 24px',
                boxShadow: isDark ? 'var(--card-shadow)' : '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
              }}>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a', margin: 0 }}>
                  Density-Based Spatial Clustering (DBSCAN) Workspace
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: isDark ? '#94a3b8' : '#64748b' }}>
                  Unsupervised density clustering performed in the PCA orthogonal subspace. Separates arbitrary non-linear cluster topologies and identifies outlier noise points.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 18 }}>
                <DBSCANClusterPanel
                  dbscanResult={dbscanResult}
                  eps={dbscanEps}
                  minSamples={dbscanMinSamples}
                  onEpsChange={setDbscanEps}
                  onMinSamplesChange={setDbscanMinSamples}
                  analysisSpace={analysisSpace}
                  onAnalysisSpaceChange={setAnalysisSpace}
                  retainedPCs={retainedComponents}
                  theme={theme}
                  colorPalette={colorPalette}
                />

                <Plotly2DProjection
                  pcaResult={pcaResult}
                  dbscanResult={dbscanResult}
                  theme={theme}
                  colorPalette={colorPalette}
                />
              </div>
            </div>
          )}

          {/* Module 6: COMPARE */}
          {activeModule === 'compare' && (
            <CompareModule
              pcaResult={pcaResult}
              dbscanResult={dbscanResult}
              datasetName={activeDataset.name}
              scaling={scaling}
              reductionMethod={reductionMethod}
              retainedComponents={retainedComponents}
              theme={theme}
            />
          )}

          {/* Module 7: PCA THEORY & VISUALIZATION GUIDE */}
          {activeModule === 'guide' && (
            <PCATheoryGuide
              pcaResult={pcaResult}
              theme={theme}
              colorPalette={colorPalette}
            />
          )}
        </main>
      </div>

      {/* CSV Upload Modal */}
      <CSVUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onDatasetLoaded={handleDatasetLoaded}
      />
    </div>
  );
}

export default App;
