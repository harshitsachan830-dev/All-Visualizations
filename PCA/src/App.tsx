import React, { useState, useMemo } from 'react';
import Papa from 'papaparse';
import {
  ActiveTab,
  Header
} from './components/Header';
import { PCA2DPlot } from './components/PCA2DPlot';
import { PCA3DPlot } from './components/PCA3DPlot';
import { ScreePlot } from './components/ScreePlot';
import { BiplotView } from './components/BiplotView';
import { StepByStepEducator } from './components/StepByStepEducator';
import { MessyDataStudio } from './components/MessyDataStudio';
import { AboutGuide } from './components/AboutGuide';
import { CSVUploadModal } from './components/CSVUploadModal';
import {
  DatasetInfo,
  MissingValueStrategy,
  RawDataRow,
  ScalingStrategy
} from './types/pca';
import { getPresetDatasets } from './utils/datasets';
import { imputeAndCleanData, performPCA, profileColumns } from './utils/math';

export function App() {
  const [datasets, setDatasets] = useState<DatasetInfo[]>(getPresetDatasets());
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('iris');
  const [activeTab, setActiveTab] = useState<ActiveTab>('2d');

  // Active dataset
  const activeDataset = useMemo(() => {
    return datasets.find(d => d.id === selectedDatasetId) || datasets[0];
  }, [datasets, selectedDatasetId]);

  // Selected features & label column state
  const [featureOverrides, setFeatureOverrides] = useState<Record<string, string[]>>({});
  const [labelOverrides, setLabelOverrides] = useState<Record<string, string>>({});

  const selectedFeatures = useMemo(() => {
    return featureOverrides[activeDataset.id] || activeDataset.defaultFeatures;
  }, [featureOverrides, activeDataset]);

  const labelCol = useMemo(() => {
    return labelOverrides[activeDataset.id] || activeDataset.defaultLabelCol;
  }, [labelOverrides, activeDataset]);

  // Imputation & scaling strategies
  const [imputationStrategy, setImputationStrategy] = useState<MissingValueStrategy>('mean');
  const [scaling, setScaling] = useState<ScalingStrategy>('standard');

  // CSV upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Column profiles of current dataset
  const columnProfiles = useMemo(() => {
    return profileColumns(activeDataset.rows, activeDataset.headers);
  }, [activeDataset]);

  // Total missing cells
  const missingCellsCount = useMemo(() => {
    return columnProfiles.reduce((acc, c) => acc + c.missingCount, 0);
  }, [columnProfiles]);

  // Clean data using selected imputation strategy
  const { cleanedRows, report: imputationReport } = useMemo(() => {
    return imputeAndCleanData(
      activeDataset.rows,
      selectedFeatures,
      labelCol,
      imputationStrategy
    );
  }, [activeDataset, selectedFeatures, labelCol, imputationStrategy]);

  // Compute PCA Result
  const pcaResult = useMemo(() => {
    return performPCA(cleanedRows, selectedFeatures, labelCol, scaling);
  }, [cleanedRows, selectedFeatures, labelCol, scaling]);

  // Handlers
  const handleSelectDataset = (id: string) => {
    setSelectedDatasetId(id);
    const targetDataset = datasets.find(d => d.id === id);
    if (targetDataset?.isMessy) {
      // If user switches to messy dataset, default to mean imputation
      setImputationStrategy('mean');
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
    if (newDataset.isMessy) {
      setActiveTab('cleaner');
    } else {
      setActiveTab('2d');
    }
  };

  const handleExportCleanedCsv = () => {
    const csvString = Papa.unparse(cleanedRows);
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${activeDataset.name.toLowerCase().replace(/\s+/g, '_')}_cleaned_${imputationStrategy}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#000000', color: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      {/* Header with Navigation & Quick Controls */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        datasets={datasets}
        selectedDatasetId={selectedDatasetId}
        onSelectDataset={handleSelectDataset}
        missingCellsCount={missingCellsCount}
        imputationStrategy={imputationStrategy}
        onSelectImputation={setImputationStrategy}
        scaling={scaling}
        onSelectScaling={setScaling}
        onOpenUpload={() => setIsUploadOpen(true)}
      />

      {/* Main Workspace Body */}
      <main style={{ maxWidth: 1600, width: '100%', margin: '0 auto', padding: '24px 20px', flex: 1 }}>
        {activeTab === '2d' && (
          <PCA2DPlot
            pcaResult={pcaResult}
            datasetName={activeDataset.name}
            selectedFeatures={selectedFeatures}
          />
        )}

        {activeTab === '3d' && (
          <PCA3DPlot
            pcaResult={pcaResult}
            datasetName={activeDataset.name}
          />
        )}

        {activeTab === 'scree' && (
          <ScreePlot pcaResult={pcaResult} />
        )}

        {activeTab === 'biplot' && (
          <BiplotView pcaResult={pcaResult} />
        )}

        {activeTab === 'educator' && (
          <StepByStepEducator pcaResult={pcaResult} />
        )}

        {activeTab === 'cleaner' && (
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
            onExportCleanedCsv={handleExportCleanedCsv}
          />
        )}

        {activeTab === 'about' && <AboutGuide />}
      </main>

      {/* CSV Upload Modal */}
      <CSVUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onDatasetLoaded={handleDatasetLoaded}
      />

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        padding: '16px 24px',
        textAlign: 'center',
        fontSize: 12,
        color: 'var(--text-dim)',
        background: '#040508'
      }}>
        <div style={{ maxWidth: 1600, margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div>
            PCA Matrix Studio • Eigen-decomposition powered by Jacobi Rotation Algorithm
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <span>Auto-Rotate 3D Engine</span>
            <span>•</span>
            <span>Mean / Median / Mode Imputation</span>
            <span>•</span>
            <span>Obsidian Black UI</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
