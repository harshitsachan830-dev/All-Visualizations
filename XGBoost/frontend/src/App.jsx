import { useState, useEffect } from "react";
import "./App.css";

import {
  checkBackendHealth,
  fetchSampleDatasets,
  trainModelApi,
  getActivePort,
  setActivePort,
} from "./services/api";

import DatasetExplorer from "./features/DatasetExplorer";
import TrainingSection from "./features/TrainingSection";
import Studio3D from "./features/Studio3D";
import Studio2D from "./features/Studio2D";
import ExplainabilityStudio from "./features/ExplainabilityStudio";
import WhatIfPredictor from "./features/WhatIfPredictor";
import ModelBenchmark from "./features/ModelBenchmark";
import ReportsSection from "./features/ReportsSection";
import TheorySection from "./features/TheorySection";

export default function App() {
  // Theme State with localStorage persistence
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("modelmind_theme") || "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("modelmind_theme", theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }

  // Navigation State
  const [activeTab, setActiveTab] = useState("dataset");

  // Dataset State
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [target, setTarget] = useState("");
  const [task, setTask] = useState("regression");
  const [imputationStrategy, setImputationStrategy] = useState("median");
  const [sampleDatasets, setSampleDatasets] = useState([]);

  // Model & Training State
  const [training, setTraining] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [hyperparams, setHyperparams] = useState({
    n_estimators: 150,
    max_depth: 5,
    learning_rate: 0.05,
    subsample: 1.0,
    colsample_bytree: 1.0,
  });

  // History State
  const [predictionHistory, setPredictionHistory] = useState([]);

  // Backend Health & Port State
  const [backendHealth, setBackendHealth] = useState({ connected: false, port: getActivePort() });

  // Initial check on mount
  useEffect(() => {
    async function init() {
      const health = await checkBackendHealth();
      setBackendHealth(health);

      const samples = await fetchSampleDatasets();
      setSampleDatasets(samples);
    }
    init();
  }, []);

  // Train action
  async function handleTrain() {
    if (!file || !target) {
      setError("Please select a dataset and target feature first.");
      setActiveTab("dataset");
      return;
    }

    setTraining(true);
    setError("");
    try {
      const data = await trainModelApi({
        file,
        target,
        task,
        imputation_strategy: imputationStrategy,
        ...hyperparams,
      });
      setResult(data);
    } catch (err) {
      setError(err.message || "Model training failed.");
    } finally {
      setTraining(false);
    }
  }

  // Switch active port
  async function togglePort() {
    const nextPort = backendHealth.port === "8000" ? "8001" : "8000";
    setActivePort(nextPort);
    const health = await checkBackendHealth();
    setBackendHealth(health);
  }

  const navItems = [
    { id: "dataset", step: "1", label: "Dataset Explorer", icon: "▤", subtitle: "Schema & Inspection" },
    { id: "training", step: "2", label: "Training & Hyperparams", icon: "⚙", subtitle: "Fitting & Metric Cards" },
    { id: "studio3d", step: "3", label: "3D Visualizations Studio", icon: "◈", subtitle: "12 Spatial Topologies" },
    { id: "studio2d", step: "4", label: "2D Visualizations Studio", icon: "▦", subtitle: "16 Diagnostic Charts" },
    { id: "explain", step: "5", label: "Explainability Studio", icon: "◉", subtitle: "SHAP & Feature Attribution" },
    { id: "whatif", step: "6", label: "What-If Simulator", icon: "⇲", subtitle: "Real-time Scenario Testing" },
    { id: "benchmark", step: "7", label: "Model Benchmark", icon: "⇄", subtitle: "XGBoost vs RF vs DT" },
    { id: "reports", step: "8", label: "Reports & Data Export", icon: "▣", subtitle: "CSV & Diagnostic Logs" },
    { id: "theory", step: "9", label: "XGBoost Theory & Guide", icon: "📖", subtitle: "Architecture & Visuals Guide" },
  ];

  return (
    <div className="app-shell">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">M</div>
          <div>
            <h2>ModelMind</h2>
            <span>XGBOOST VISUALIZATION STUDIO</span>
          </div>
        </div>

        <div className="nav-label">SYSTEMATIC WORKFLOW</div>
        <nav className="nav-list">
          {navItems.map((item) => {
            const isCompleted =
              (item.id === "dataset" && preview) ||
              (item.id === "training" && result) ||
              (result && ["studio3d", "studio2d", "explain", "whatif", "benchmark", "reports"].includes(item.id)) ||
              (item.id === "theory");

            return (
              <button
                key={item.id}
                className={`nav-item ${activeTab === item.id ? "selected" : ""}`}
                onClick={() => setActiveTab(item.id)}
              >
                <span className="step-num">{item.step}</span>
                <span className="nav-symbol">{item.icon}</span>
                <div className="nav-text-block">
                  <strong>{item.label}</strong>
                  <span className="nav-sub">{item.subtitle}</span>
                </div>
                {isCompleted && <span className="nav-check">✓</span>}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Model Status Footer */}
        <div className="sidebar-bottom">
          <div className={`status-dot ${result ? "dot-trained" : "dot-idle"}`} />
          <div className="sidebar-status-meta">
            <strong>{result ? "XGBoost Model Fitted" : preview ? "Dataset Loaded" : "System Ready"}</strong>
            <span>
              {result
                ? `${result.hyperparameters?.n_estimators || 150} Trees · Depth ${result.hyperparameters?.max_depth || 5}`
                : preview
                ? `${preview.rowCount} rows · ${preview.columns.length} cols`
                : "Select or upload a dataset"}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-area">
        {/* Top Header Bar */}
        <header className="topbar">
          <div className="breadcrumb">
            ModelMind Studio <span>/</span>{" "}
            <strong>{navItems.find((n) => n.id === activeTab)?.label}</strong>
          </div>

          <div className="top-actions">
            {result && (
              <div className="top-task-badge">
                <span className={`tag-pill ${result.task}`}>{result.task.toUpperCase()}</span>
                <span className="top-target-text">Target: <strong>{result.target}</strong></span>
              </div>
            )}

            {/* Backend Health & Port Toggle */}
            <button className="status-pill-btn" onClick={togglePort} title="Click to switch API port">
              <i className={backendHealth.connected ? "dot-active" : "dot-inactive"} />
              API · Port {backendHealth.port} {backendHealth.connected ? "(Connected)" : "(Offline)"}
            </button>

            {/* Light / Dark Mode Toggle Button */}
            <button
              className="theme-toggle-btn"
              onClick={toggleTheme}
              title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
              aria-label="Toggle Color Theme"
            >
              <span className="theme-toggle-track">
                <span className="theme-toggle-thumb">
                  {theme === "dark" ? "🌙" : "☀️"}
                </span>
              </span>
              <span className="theme-toggle-text">
                {theme === "dark" ? "Dark Mode" : "Light Mode"}
              </span>
            </button>

            <div className="avatar">MM</div>
          </div>
        </header>

        {/* Global Error Banner */}
        {error && (
          <div className="global-error-banner">
            <span>⚠ {error}</span>
            <button onClick={() => setError("")}>✕</button>
          </div>
        )}

        {/* Section Router */}
        <div className="content-view">
          {activeTab === "dataset" && (
            <DatasetExplorer
              file={file}
              setFile={setFile}
              preview={preview}
              setPreview={setPreview}
              target={target}
              setTarget={setTarget}
              task={task}
              setTask={setTask}
              imputationStrategy={imputationStrategy}
              setImputationStrategy={setImputationStrategy}
              error={error}
              setError={setError}
              sampleDatasets={sampleDatasets}
              onProceedToTraining={() => setActiveTab("training")}
            />
          )}

          {activeTab === "training" && (
            <TrainingSection
              file={file}
              target={target}
              task={task}
              imputationStrategy={imputationStrategy}
              setImputationStrategy={setImputationStrategy}
              training={training}
              onTrain={handleTrain}
              result={result}
              error={error}
              hyperparams={hyperparams}
              setHyperparams={setHyperparams}
              onOpen3D={() => setActiveTab("studio3d")}
              onOpen2D={() => setActiveTab("studio2d")}
            />
          )}

          {activeTab === "studio3d" && (
            <Studio3D result={result} task={task} theme={theme} />
          )}

          {activeTab === "studio2d" && (
            <Studio2D result={result} task={task} theme={theme} />
          )}

          {activeTab === "explain" && (
            <ExplainabilityStudio result={result} theme={theme} />
          )}

          {activeTab === "whatif" && (
            <WhatIfPredictor
              result={result}
              task={task}
              onAddPredictionToHistory={(entry) =>
                setPredictionHistory((prev) => [entry, ...prev.slice(0, 49)])
              }
            />
          )}

          {activeTab === "benchmark" && (
            <ModelBenchmark
              currentFile={file}
              currentTarget={target}
              currentTask={task}
              theme={theme}
            />
          )}

          {activeTab === "reports" && (
            <ReportsSection
              result={result}
              task={task}
              predictionHistory={predictionHistory}
            />
          )}

          {activeTab === "theory" && (
            <TheorySection theme={theme} />
          )}
        </div>

        {/* Footer */}
        <footer>
          <span>MODELMIND</span> • XGBoost Visualization & Explainability Platform
          <span className="footer-right">
            Based on ModelMind Visualization Project Plan Specification • 2D & 3D Analytics
          </span>
        </footer>
      </main>
    </div>
  );
}
