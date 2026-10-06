import { useEffect, useState } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Check,
  ChevronDown,
  Database,
  Gauge,
  Pause,
  Play,
  RotateCcw,
  Route,
  SlidersHorizontal,
  Sparkles,
  Target,
  TreePine,
} from "lucide-react";
import DatasetWorkspace from "./DatasetWorkspace";
import XGBoostGuide from "./XGBoostGuide";
import "./App.css";

type FeatureKey =
  | "tenure"
  | "charge"
  | "tickets"
  | "contract"
  | "delay"
  | "addons"
  | "usage"
  | "complaints";
type Task = "classification" | "regression";
type View = "journey" | "prediction" | "quality" | "datasets" | "guide";
type BranchScores = { low: [number, number]; high: [number, number] };
type Split = { feature: FeatureKey; threshold: number };
type TreeRound = {
  title: string;
  root: Split;
  low: Split;
  high: Split;
  earlyLeafBranch?: "low" | "high";
  classification: BranchScores;
  regression: BranchScores;
};
type Example = {
  id: string;
  split: "Test" | "Validation" | "Train";
  truth: "Churn" | "Retained";
  actualBill: number;
  features: Record<FeatureKey, number>;
};
type CsvColumn = {
  name: string;
  kind: "numeric" | "categorical";
  likely_identifier: boolean;
  missing_count: number;
  missing_percent: number;
  unique_count: number;
  sample_values: (string | number | null)[];
};
type CsvProfile = {
  filename: string;
  delimiter: string;
  row_count: number;
  column_count: number;
  duplicate_rows: number;
  duplicate_headers: string[];
  parse_warnings: string[];
  missing_cells: number;
  columns: CsvColumn[];
  target_candidates: {
    name: string;
    suggested_task: Task;
    unique_count: number;
    suggested: number;
    likely_identifier: boolean;
  }[];
  warnings: { level: "warning" | "info"; message: string }[];
  blockers: string[];
  preview: Record<string, string | number | null>[];
};
type CsvPrediction = {
  source_row: number;
  split: "train" | "test";
  actual: string | number;
  prediction: string | number;
  confidence?: number;
  probabilities?: Record<string, number>;
  residual?: number;
  features: Record<string, string | number | null>;
};
type TrainedDataset = {
  filename: string;
  target_column: string;
  task: Task;
  rows_uploaded: number;
  rows_trained: number;
  rows_tested: number;
  duplicate_rows_found: number;
  missing_target_rows_dropped: number;
  missing_feature_cells: number;
  preprocessing: {
    numeric_missing: string;
    categorical_missing: string;
    duplicate_rows: string;
    excluded_columns: string[];
    feature_columns: string[];
  };
  metrics: Record<string, number | string[] | number[][] | null>;
  feature_importance: { feature: string; gain: number }[];
  predictions: CsvPrediction[];
  prediction_count: number;
  predictions_truncated: boolean;
  warnings: { level: "warning" | "info"; message: string }[];
};

const learningRate = 0.3;
const featureInfo: Record<FeatureKey, { label: string; unit: string }> = {
  tenure: { label: "Tenure", unit: "months" },
  charge: { label: "Monthly charge", unit: "$ / mo" },
  tickets: { label: "Support tickets", unit: "last 90 days" },
  contract: { label: "Contract term", unit: "months" },
  delay: { label: "Payment delay", unit: "days" },
  addons: { label: "Active add-ons", unit: "count" },
  usage: { label: "Data usage", unit: "GB / mo" },
  complaints: { label: "Complaints", unit: "last 6 mo" },
};

const examples: Example[] = [
  {
    id: "C-042",
    split: "Test",
    truth: "Churn",
    actualBill: 94.5,
    features: {
      tenure: 7,
      charge: 94,
      tickets: 4,
      contract: 1,
      delay: 8,
      addons: 1,
      usage: 41,
      complaints: 3,
    },
  },
  {
    id: "C-118",
    split: "Validation",
    truth: "Retained",
    actualBill: 68.2,
    features: {
      tenure: 38,
      charge: 68,
      tickets: 0,
      contract: 24,
      delay: 0,
      addons: 4,
      usage: 22,
      complaints: 0,
    },
  },
  {
    id: "C-207",
    split: "Test",
    truth: "Retained",
    actualBill: 82.1,
    features: {
      tenure: 16,
      charge: 82,
      tickets: 2,
      contract: 12,
      delay: 2,
      addons: 2,
      usage: 31,
      complaints: 1,
    },
  },
];

const rounds: TreeRound[] = [
  {
    title: "Early tenure signal",
    root: { feature: "tenure", threshold: 18 },
    low: { feature: "charge", threshold: 85 },
    high: { feature: "contract", threshold: 12 },
    classification: { low: [1.7, 1.25], high: [-0.5, -0.9] },
    regression: { low: [7.2, 4.6], high: [-2.4, -3.8] },
  },
  {
    title: "Price sensitivity",
    root: { feature: "charge", threshold: 82 },
    low: { feature: "tenure", threshold: 24 },
    high: { feature: "contract", threshold: 12 },
    classification: { low: [0.15, 0.5], high: [0.75, 1.15] },
    regression: { low: [-1.2, 0.7], high: [4.8, 7.4] },
  },
  {
    title: "Support friction",
    root: { feature: "tickets", threshold: 2 },
    low: { feature: "complaints", threshold: 0 },
    high: { feature: "delay", threshold: 4 },
    classification: { low: [-0.2, 0.15], high: [0.9, 1.2] },
    regression: { low: [-0.5, 0.4], high: [-2.2, -3.4] },
  },
  {
    title: "Payment behavior",
    root: { feature: "delay", threshold: 3 },
    low: { feature: "addons", threshold: 2 },
    high: { feature: "charge", threshold: 90 },
    earlyLeafBranch: "low",
    classification: { low: [-0.35, -0.1], high: [0.5, 0.85] },
    regression: { low: [-0.4, -0.9], high: [1.1, 2.7] },
  },
  {
    title: "Contract stability",
    root: { feature: "contract", threshold: 12 },
    low: { feature: "tenure", threshold: 10 },
    high: { feature: "tenure", threshold: 30 },
    classification: { low: [0.7, 0.95], high: [0.1, -0.2] },
    regression: { low: [1.4, 2.1], high: [0.2, -0.8] },
  },
  {
    title: "Usage pattern",
    root: { feature: "usage", threshold: 35 },
    low: { feature: "addons", threshold: 1 },
    high: { feature: "charge", threshold: 88 },
    classification: { low: [-0.15, 0.05], high: [0.25, 0.6] },
    regression: { low: [-1.4, -0.7], high: [1.8, 3.4] },
  },
  {
    title: "Service experience",
    root: { feature: "complaints", threshold: 1 },
    low: { feature: "tickets", threshold: 1 },
    high: { feature: "tenure", threshold: 12 },
    classification: { low: [-0.35, -0.2], high: [0.45, 0.9] },
    regression: { low: [-0.6, -0.2], high: [-1.5, -2.5] },
  },
  {
    title: "Final adjustment",
    root: { feature: "addons", threshold: 2 },
    low: { feature: "contract", threshold: 12 },
    high: { feature: "charge", threshold: 78 },
    classification: { low: [0.3, 0.5], high: [-0.45, -0.7] },
    regression: { low: [0.8, 1.4], high: [-1.6, -2.4] },
  },
];

function sigmoid(value: number) {
  return 1 / (1 + Math.exp(-value));
}

function formatSigned(value: number, digits = 2) {
  return `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(digits)}`;
}

function contributionFor(
  tree: TreeRound,
  features: Record<FeatureKey, number>,
  task: Task,
) {
  const rootHigh = features[tree.root.feature] >= tree.root.threshold;
  const branch = rootHigh ? ("high" as const) : ("low" as const);
  const isLeafBranch = tree.earlyLeafBranch === branch;
  const nextSplit = isLeafBranch ? undefined : rootHigh ? tree.high : tree.low;
  const secondaryHigh = nextSplit
    ? features[nextSplit.feature] >= nextSplit.threshold
    : false;
  const leafScore = tree[task][branch][secondaryHigh ? 1 : 0];
  return {
    rootHigh,
    secondaryHigh,
    nextSplit,
    branch,
    leafScore,
    contribution: leafScore * learningRate,
  };
}

function App() {
  const [task, setTask] = useState<Task>("classification");
  const [view, setView] = useState<View>("journey");
  const [exampleIndex, setExampleIndex] = useState(0);
  const [selectedRound, setSelectedRound] = useState(4);
  const [isPlaying, setIsPlaying] = useState(false);
  const [importance, setImportance] = useState<"Gain" | "Cover" | "Weight">(
    "Gain",
  );
  const [overrides, setOverrides] = useState<
    Partial<Record<FeatureKey, number>>
  >({});
  const [selectedNode, setSelectedNode] = useState("root");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvProfile, setCsvProfile] = useState<CsvProfile | null>(null);
  const [trainedDataset, setTrainedDataset] = useState<TrainedDataset | null>(
    null,
  );
  const [datasetTask, setDatasetTask] = useState<Task>("classification");
  const [targetColumn, setTargetColumn] = useState("");
  const [numericMissing, setNumericMissing] = useState("median");
  const [categoricalMissing, setCategoricalMissing] = useState("mode");
  const [duplicatePolicy, setDuplicatePolicy] = useState("drop");
  const [excludedColumns, setExcludedColumns] = useState<string[]>([]);
  const [datasetBusy, setDatasetBusy] = useState(false);
  const [datasetError, setDatasetError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [selectedPredictionRow, setSelectedPredictionRow] = useState<
    number | null
  >(null);

  const example = examples[exampleIndex];
  const features = { ...example.features, ...overrides };
  const baseValue = task === "classification" ? -1.1 : 72.4;
  const steps = rounds.map((tree) => contributionFor(tree, features, task));
  const cumulative = [baseValue];
  steps.forEach((step) =>
    cumulative.push(cumulative[cumulative.length - 1] + step.contribution),
  );
  const finalValue = cumulative[cumulative.length - 1];
  const treeIndex = Math.max(0, Math.min(rounds.length - 1, selectedRound - 1));
  const activeTree = rounds[treeIndex];
  const activeStep = steps[treeIndex];
  const finalProbability = sigmoid(finalValue);

  useEffect(() => {
    if (!isPlaying || selectedRound >= rounds.length) return;
    const timer = window.setTimeout(() => {
      setSelectedRound((round) => Math.min(round + 1, rounds.length));
      if (selectedRound + 1 >= rounds.length) setIsPlaying(false);
    }, 800);
    return () => window.clearTimeout(timer);
  }, [isPlaying, selectedRound]);

  const predictionLabel = (value: number) =>
    task === "classification"
      ? `${(sigmoid(value) * 100).toFixed(1)}%`
      : `$${value.toFixed(2)}`;
  const contributionLabel = (value: number) =>
    task === "classification"
      ? `${formatSigned(value)} margin`
      : `${formatSigned(value)} $ / mo`;
  const changeExample = (index: number) => {
    setExampleIndex(index);
    setOverrides({});
  };
  const setFeature = (key: FeatureKey, value: number) => {
    setOverrides((current) => ({ ...current, [key]: value }));
  };

  const profileCsvFile = async (file: File) => {
    setCsvFile(file);
    setCsvProfile(null);
    setTrainedDataset(null);
    setDatasetError("");
    setDatasetBusy(true);
    setExcludedColumns([]);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/profile", {
        method: "POST",
        body: form,
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.detail || "Could not inspect this CSV.");
      const profile = payload as CsvProfile;
      setCsvProfile(profile);
      setExcludedColumns(
        profile.columns
          .filter((column) => column.likely_identifier)
          .map((column) => column.name),
      );
      const suggestedTarget =
        profile.target_candidates.find(
          (candidate) => !candidate.likely_identifier,
        )?.name ??
        profile.columns.at(-1)?.name ??
        "";
      setTargetColumn(suggestedTarget);
      const candidate = profile.target_candidates.find(
        (item) => item.name === suggestedTarget,
      );
      if (candidate) setDatasetTask(candidate.suggested_task);
    } catch (error) {
      setDatasetError(
        error instanceof Error ? error.message : "Could not inspect this CSV.",
      );
    } finally {
      setDatasetBusy(false);
    }
  };

  const loadSampleCsv = async (sampleName: string) => {
    setDatasetError("");
    setDatasetBusy(true);
    try {
      const response = await fetch(`/samples/${sampleName}`);
      if (!response.ok) throw new Error("Could not load this sample CSV.");
      const blob = await response.blob();
      const file = new File([blob], sampleName, { type: "text/csv" });
      await profileCsvFile(file);
      if (sampleName === "home_prices_sample.csv") {
        setTargetColumn("price_usd");
        setDatasetTask("regression");
      } else if (sampleName === "telco_churn_sample.csv") {
        setTargetColumn("churn");
        setDatasetTask("classification");
      }
    } catch (error) {
      setDatasetError(
        error instanceof Error
          ? error.message
          : "Could not load this sample CSV.",
      );
      setDatasetBusy(false);
    }
  };

  const trainUploadedCsv = async () => {
    if (!csvFile || !csvProfile || !targetColumn) return;
    setDatasetBusy(true);
    setDatasetError("");
    try {
      const form = new FormData();
      form.append("file", csvFile);
      form.append("target_column", targetColumn);
      form.append("task", datasetTask);
      form.append("numeric_missing", numericMissing);
      form.append("categorical_missing", categoricalMissing);
      form.append("duplicate_rows", duplicatePolicy);
      form.append("excluded_columns", JSON.stringify(excludedColumns));
      const response = await fetch("/api/train", {
        method: "POST",
        body: form,
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(
          payload.detail || "XGBoost could not train on this CSV.",
        );
      setTrainedDataset(payload as TrainedDataset);
      setTask(datasetTask);
      setSelectedPredictionRow(null);
    } catch (error) {
      setDatasetError(
        error instanceof Error
          ? error.message
          : "XGBoost could not train on this CSV.",
      );
    } finally {
      setDatasetBusy(false);
    }
  };

  const resetDataset = () => {
    setCsvFile(null);
    setCsvProfile(null);
    setTrainedDataset(null);
    setDatasetError("");
    setTargetColumn("");
    setExcludedColumns([]);
    setSelectedPredictionRow(null);
  };

  const navItems: { id: View; label: string; icon: typeof Route }[] = [
    { id: "journey", label: "Boosting journey", icon: Route },
    { id: "prediction", label: "Prediction explorer", icon: Target },
    { id: "quality", label: "Model quality", icon: BarChart3 },
    { id: "datasets", label: "Upload CSV", icon: Database },
    { id: "guide", label: "XGBoost guide", icon: BookOpen },
  ];

  return (
    <div className="app-shell">
      <header className="topbar">
        <a
          className="brand"
          href="#journey"
          onClick={() => setView("journey")}
          aria-label="BoostLab home"
        >
          <span className="brand-mark">
            <span />
            <span />
            <span />
          </span>
          <span>BoostLab</span>
        </a>
        <div className="topbar-divider" />
        <nav className="top-links" aria-label="Primary navigation">
          <button type="button" onClick={() => setView("journey")}>
            Models
          </button>
          <button
            type="button"
            className={view === "datasets" ? "top-link-active" : ""}
            onClick={() => setView("datasets")}
          >
            Upload CSV
          </button>
        </nav>
        <div className="topbar-spacer" />
        <span className="demo-pill">
          <span className="status-dot" />
          {view === "datasets"
            ? trainedDataset
              ? "CSV model trained"
              : "CSV workspace"
            : "Illustrative demo"}
        </span>
      </header>

      <div className="workspace">
        <aside className="sidebar">
          <div className="sidebar-label">WORKSPACE</div>
          <nav className="main-nav" aria-label="Main navigation">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                className={`nav-item ${view === id ? "is-active" : ""}`}
                onClick={() => setView(id)}
              >
                <Icon size={17} strokeWidth={1.8} />
                <span>{label}</span>
                {view === id && <span className="nav-active-mark" />}
              </button>
            ))}
          </nav>
          <div className="sidebar-rule" />
          <div className="sidebar-label">MODEL</div>
          <div className="model-mini">
            <div className="model-mini-icon">
              <TreePine size={16} />
            </div>
            <div>
              <strong>Retention v1</strong>
              <small>8 boosting rounds</small>
            </div>
            <span className="live-dot" />
          </div>
          <div className="model-facts">
            <div>
              <span>Objective</span>
              <strong>
                {task === "classification"
                  ? "binary:logistic"
                  : "reg:squarederror"}
              </strong>
            </div>
            <div>
              <span>Learning rate</span>
              <strong>0.30</strong>
            </div>
            <div>
              <span>Max depth</span>
              <strong>2</strong>
            </div>
          </div>
          <div className="sidebar-bottom">
            <span className="sidebar-bottom-mark">
              <Sparkles size={14} />
            </span>
            <span>
              <strong>Learning lab</strong>
              <small>Explore boosting, one tree at a time.</small>
            </span>
          </div>
        </aside>

        <main className="main-content" id="journey">
          <div className="page-heading">
            <div>
              <div className="breadcrumb">
                <span>MODELS</span>
                <span className="crumb-slash">/</span>
                <span>CUSTOMER CHURN</span>
                <span className="crumb-slash">/</span>
                <span className="crumb-current">XGBOOST</span>
              </div>
              <h1>
                {view === "journey"
                  ? "XGBoost Prediction Explorer"
                  : view === "prediction"
                    ? "Prediction Explorer"
                    : view === "quality"
                      ? "Model quality"
                      : view === "datasets"
                        ? "Upload CSV & predict"
                        : "XGBoost, explained"}
              </h1>
              <p className="page-subtitle">
                {view === "journey"
                  ? "See how each tree corrects the prediction from the previous round."
                  : view === "prediction"
                    ? "Change a feature and follow its effect through every tree."
                    : view === "quality"
                      ? "Training signals and evaluation, round by round."
                      : view === "datasets"
                        ? "Upload your data, choose how to fill missing values, then train and explore predictions."
                        : "A practical, visual guide to how boosted trees learn and how to tune them."}
              </p>
            </div>
            {view !== "datasets" && view !== "guide" && (
              <label className="task-select">
                <span className="sr-only">Prediction task</span>
                <select
                  value={task}
                  onChange={(event) => setTask(event.target.value as Task)}
                >
                  <option value="classification">Binary classification</option>
                  <option value="regression">Regression</option>
                </select>
                <ChevronDown size={16} />
              </label>
            )}
          </div>

          {view !== "datasets" && view !== "guide" && (
            <section className="summary-strip" aria-label="Model summary">
              <div className="summary-intro">
                <span className="summary-icon">
                  <Activity size={18} />
                </span>
                <span>
                  <strong>Boosting rounds</strong>
                  <small>{rounds.length} total · best iteration 7</small>
                </span>
              </div>
              <div className="summary-cell">
                <span>LEARNING RATE</span>
                <strong>{learningRate.toFixed(2)}</strong>
                <small>Scaled tree updates</small>
              </div>
              <div className="summary-cell">
                <span>TEST ACCURACY</span>
                <strong>84.6%</strong>
                <small>Held-out · n = 400</small>
              </div>
              <div className="summary-cell summary-final">
                <span>FINAL PREDICTION</span>
                <strong>
                  {task === "classification"
                    ? finalProbability >= 0.5
                      ? "Likely to churn"
                      : "Likely to stay"
                    : predictionLabel(finalValue)}
                </strong>
                <small>
                  {task === "classification"
                    ? `${(finalProbability * 100).toFixed(1)}% probability`
                    : "USD per month"}
                </small>
              </div>
            </section>
          )}

          {view !== "datasets" && (
            <div className="view-tabs" role="tablist" aria-label="Model views">
              {navItems.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  className={view === id ? "tab-active" : ""}
                  type="button"
                  role="tab"
                  aria-selected={view === id}
                  onClick={() => setView(id)}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>
          )}

          {view === "journey" && (
            <>
              <div className="journey-section-heading">
                <div>
                  <h2>How the prediction changed</h2>
                  <p>
                    Customer {example.id} · select a boosting round to inspect
                    the tree responsible.
                  </p>
                </div>
              </div>
              <div className="journey-layout">
                <section className="panel journey-panel">
                  <div className="panel-heading">
                    <div className="panel-title-wrap">
                      <div>
                        <h2>Prediction trajectory</h2>
                        <p>
                          Base score plus the scaled contribution from each
                          tree.
                        </p>
                      </div>
                    </div>
                    <div className="chart-legend">
                      <span>
                        <i className="legend-line" />
                        Running prediction
                      </span>
                      <span>
                        <i className="legend-dot" />
                        Selected round
                      </span>
                    </div>
                  </div>
                  <div className="journey-chart-wrap">
                    <div className="chart-y-labels">
                      <span>{task === "classification" ? "100%" : "$90"}</span>
                      <span>{task === "classification" ? "75%" : "$80"}</span>
                      <span>{task === "classification" ? "50%" : "$70"}</span>
                      <span>{task === "classification" ? "25%" : "$60"}</span>
                    </div>
                    <JourneyChart
                      values={cumulative}
                      task={task}
                      selectedRound={selectedRound}
                      onSelectRound={setSelectedRound}
                    />
                  </div>
                  <div className="persistent-legend">
                    <span>
                      <i className="legend-base" />
                      Base prediction
                    </span>
                    <span>
                      <i className="legend-contribution" />
                      Tree contribution
                    </span>
                    <span>
                      <i className="legend-current" />
                      Current prediction
                    </span>
                    <span>
                      <i className="legend-final" />
                      Final prediction
                    </span>
                  </div>
                </section>
                <aside className="panel round-update-panel">
                  <div className="round-update-heading">
                    <div>
                      <span>
                        ROUND {String(treeIndex + 1).padStart(2, "0")} UPDATE
                      </span>
                      <h2>
                        {activeStep.contribution >= 0
                          ? "Prediction moves up"
                          : "Prediction moves down"}
                      </h2>
                      <p>{activeTree.title}</p>
                    </div>
                    <span
                      className={`update-direction ${activeStep.contribution >= 0 ? "positive-text" : "negative-text"}`}
                    >
                      {activeStep.contribution >= 0 ? "↑" : "↓"}
                    </span>
                  </div>
                  <div className="update-row">
                    <span>PREDICTION BEFORE</span>
                    <strong>{predictionLabel(cumulative[treeIndex])}</strong>
                  </div>
                  <div className="update-row">
                    <span>TREE LEAF SCORE</span>
                    <strong
                      className={
                        activeStep.leafScore >= 0
                          ? "positive-text"
                          : "negative-text"
                      }
                    >
                      {formatSigned(activeStep.leafScore)}
                      {task === "classification" ? " margin" : " $ / mo"}
                    </strong>
                  </div>
                  <div className="update-row">
                    <span>LEARNING RATE × {learningRate.toFixed(2)}</span>
                    <strong
                      className={
                        activeStep.contribution >= 0
                          ? "positive-text"
                          : "negative-text"
                      }
                    >
                      {contributionLabel(activeStep.contribution)}
                    </strong>
                  </div>
                  <div className="update-result">
                    <span>PREDICTION AFTER</span>
                    <strong>
                      {predictionLabel(cumulative[treeIndex + 1])}
                    </strong>
                  </div>
                  <div className="update-controls">
                    <span>
                      {selectedRound === 0
                        ? "Base prediction"
                        : `Round ${selectedRound} of ${rounds.length}`}
                    </span>
                    <div className="play-controls">
                      <button
                        type="button"
                        title="Previous round"
                        aria-label="Previous round"
                        disabled={selectedRound === 0}
                        onClick={() => {
                          setIsPlaying(false);
                          setSelectedRound((round) => Math.max(0, round - 1));
                        }}
                      >
                        <ArrowLeft size={16} />
                      </button>
                      <button
                        type="button"
                        className="play-button"
                        title={isPlaying ? "Pause playback" : "Play rounds"}
                        aria-label={
                          isPlaying ? "Pause playback" : "Play rounds"
                        }
                        onClick={() => {
                          if (selectedRound >= rounds.length)
                            setSelectedRound(0);
                          setIsPlaying((playing) => !playing);
                        }}
                      >
                        {isPlaying ? (
                          <Pause size={15} fill="currentColor" />
                        ) : (
                          <Play size={15} fill="currentColor" />
                        )}
                      </button>
                      <button
                        type="button"
                        title="Next round"
                        aria-label="Next round"
                        disabled={selectedRound === rounds.length}
                        onClick={() => {
                          setIsPlaying(false);
                          setSelectedRound((round) =>
                            Math.min(rounds.length, round + 1),
                          );
                        }}
                      >
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                </aside>
              </div>

              <div className="tree-section-heading">
                <div>
                  <h2>Decision Tree Visualization</h2>
                  <p>
                    The highlighted path shows why Round {treeIndex + 1} made
                    its correction.
                  </p>
                </div>
                <div className="tree-legend" aria-label="Tree diagram legend">
                  <span><i className="legend-split" />Split node</span>
                  <span><i className="legend-leaf" />Leaf node</span>
                  <span><i className="legend-yes" />Yes branch</span>
                  <span><i className="legend-no" />No branch</span>
                </div>
              </div>
              <div className="detail-grid">
                <section className="panel tree-panel">
                  <div className="panel-heading compact-heading">
                    <div className="panel-title-wrap">
                      <span className="section-index">02</span>
                      <div>
                        <h2>
                          Round {String(treeIndex + 1).padStart(2, "0")} tree
                        </h2>
                        <p>
                          {activeTree.title} · selected path for {example.id}
                        </p>
                      </div>
                    </div>
                    <button
                      className="quiet-icon-button"
                      title="Tree depth"
                      type="button"
                    >
                      <SlidersHorizontal size={15} />
                    </button>
                  </div>
                  <TreeDiagram
                    tree={activeTree}
                    features={features}
                    activeStep={activeStep}
                    selectedNode={selectedNode}
                    onSelectNode={setSelectedNode}
                    task={task}
                  />
                  <div className="tree-footnote">
                    <span>
                      <i className="path-key" />
                      Selected example path
                    </span>
                    <span>
                      Depth 2 <span className="footnote-dot">·</span>{" "}
                      {activeTree.earlyLeafBranch ? "3" : "4"} leaf outputs
                    </span>
                  </div>
                </section>
                <section className="panel explanation-panel">
                  <div className="panel-heading compact-heading">
                    <div className="panel-title-wrap">
                      <span className="section-index">03</span>
                      <div>
                        <h2>Why this correction?</h2>
                        <p>Follow the active path to its leaf.</p>
                      </div>
                    </div>
                    <span className="path-badge">
                      <span />
                      ACTIVE PATH
                    </span>
                  </div>
                  <div className="path-list">
                    <div className="path-step">
                      <span className="path-step-number">01</span>
                      <div>
                        <small>ROOT SPLIT</small>
                        <strong>
                          {featureInfo[activeTree.root.feature].label} ≥{" "}
                          {activeTree.root.threshold}{" "}
                          {featureInfo[activeTree.root.feature].unit}
                        </strong>
                        <span>
                          Your row: {features[activeTree.root.feature]}{" "}
                          {featureInfo[activeTree.root.feature].unit}{" "}
                          <b>
                            {activeStep.rootHigh
                              ? "→ Yes branch"
                              : "→ No branch"}
                          </b>
                        </span>
                      </div>
                      <Check size={15} />
                    </div>
                    {activeStep.nextSplit ? (
                      <div className="path-step">
                        <span className="path-step-number">02</span>
                        <div>
                          <small>SECOND SPLIT</small>
                          <strong>
                            {featureInfo[activeStep.nextSplit.feature].label} ≥{" "}
                            {activeStep.nextSplit.threshold}{" "}
                            {featureInfo[activeStep.nextSplit.feature].unit}
                          </strong>
                          <span>
                            Your row: {features[activeStep.nextSplit.feature]}{" "}
                            {featureInfo[activeStep.nextSplit.feature].unit}{" "}
                            <b>
                              {activeStep.secondaryHigh
                                ? "→ Yes branch"
                                : "→ No branch"}
                            </b>
                          </span>
                        </div>
                        <Check size={15} />
                      </div>
                    ) : (
                      <div className="path-step">
                        <span className="path-step-number">02</span>
                        <div>
                          <small>LEAF ROUTE</small>
                          <strong>This branch ends at a leaf</strong>
                          <span>Reached directly from the root split.</span>
                        </div>
                        <Check size={15} />
                      </div>
                    )}
                  </div>
                  <div className="contribution-equation">
                    <div>
                      <span>LEAF SCORE</span>
                      <strong>{formatSigned(activeStep.leafScore)}</strong>
                    </div>
                    <span className="equation-op">×</span>
                    <div>
                      <span>LEARNING RATE</span>
                      <strong>{learningRate.toFixed(2)}</strong>
                    </div>
                    <span className="equation-op">=</span>
                    <div className="equation-result">
                      <span>TREE CONTRIBUTION</span>
                      <strong
                        className={
                          activeStep.contribution >= 0
                            ? "positive-text"
                            : "negative-text"
                        }
                      >
                        {contributionLabel(activeStep.contribution)}
                      </strong>
                    </div>
                  </div>
                  <div className="before-after">
                    <div>
                      <span>BEFORE ROUND {treeIndex + 1}</span>
                      <strong>{predictionLabel(cumulative[treeIndex])}</strong>
                    </div>
                    <ArrowRight size={16} />
                    <div>
                      <span>AFTER ROUND {treeIndex + 1}</span>
                      <strong>
                        {predictionLabel(cumulative[treeIndex + 1])}
                      </strong>
                    </div>
                  </div>
                  {selectedNode !== "root" && (
                    <div className="node-detail">
                      <span>SELECTED NODE</span>
                      <strong>{selectedNode}</strong>
                      <button
                        type="button"
                        onClick={() => setSelectedNode("root")}
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </section>
              </div>
            </>
          )}

          {view === "prediction" && (
            <section className="prediction-view">
              <div className="prediction-layout">
                <section className="panel feature-panel">
                  <div className="panel-heading">
                    <div className="panel-title-wrap">
                      <span className="section-index">01</span>
                      <div>
                        <h2>Choose an example</h2>
                        <p>
                          Evaluation rows · {example.split.toLowerCase()} split
                        </p>
                      </div>
                    </div>
                    <button
                      className="restore-button"
                      type="button"
                      onClick={() => setOverrides({})}
                    >
                      <RotateCcw size={14} />
                      Restore original
                    </button>
                  </div>
                  <div className="example-selector">
                    {examples.map((item, index) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`example-option ${exampleIndex === index ? "example-selected" : ""}`}
                        onClick={() => changeExample(index)}
                      >
                        <span className="example-radio">
                          {exampleIndex === index && <i />}
                        </span>
                        <span>
                          <strong>{item.id}</strong>
                          <small>
                            {item.split} row · actual{" "}
                            {task === "classification"
                              ? item.truth
                              : `$${item.actualBill.toFixed(2)}`}
                          </small>
                        </span>
                        <ArrowRight size={14} />
                      </button>
                    ))}
                  </div>
                  <div className="feature-table-heading">
                    <span>FEATURE</span>
                    <span>VALUE</span>
                    <span>UNIT</span>
                  </div>
                  <div className="feature-table">
                    {(Object.keys(featureInfo) as FeatureKey[]).map((key) => (
                      <label className="feature-row" key={key}>
                        <span>{featureInfo[key].label}</span>
                        <input
                          type="number"
                          value={features[key]}
                          onChange={(event) =>
                            setFeature(key, Number(event.target.value))
                          }
                          aria-label={`${featureInfo[key].label} for ${example.id}`}
                        />
                        <small>{featureInfo[key].unit}</small>
                      </label>
                    ))}
                  </div>
                  <div className="feature-note">
                    <Sparkles size={14} />
                    <span>
                      Edits update each tree route and contribution instantly.
                    </span>
                  </div>
                </section>
                <section className="panel ledger-panel">
                  <div className="panel-heading">
                    <div className="panel-title-wrap">
                      <span className="section-index">02</span>
                      <div>
                        <h2>Prediction breakdown</h2>
                        <p>Base value + scaled leaf scores = final output</p>
                      </div>
                    </div>
                    <span className="round-count">{rounds.length} ROUNDS</span>
                  </div>
                  <div className="ledger-list">
                    <div className="ledger-row ledger-base">
                      <span className="ledger-index">00</span>
                      <span className="ledger-description">
                        <strong>
                          Base{" "}
                          {task === "classification" ? "margin" : "estimate"}
                        </strong>
                        <small>Model starting value</small>
                      </span>
                      <span className="ledger-change">—</span>
                      <strong className="ledger-total">
                        {predictionLabel(baseValue)}
                      </strong>
                    </div>
                    {steps.map((step, index) => (
                      <button
                        type="button"
                        className={`ledger-row ${selectedRound === index + 1 ? "ledger-selected" : ""}`}
                        key={rounds[index].title}
                        onClick={() => {
                          setSelectedRound(index + 1);
                          setView("journey");
                        }}
                      >
                        <span className="ledger-index">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="ledger-description">
                          <strong>{rounds[index].title}</strong>
                          <small>
                            η {learningRate.toFixed(2)} × leaf{" "}
                            {formatSigned(step.leafScore)}
                          </small>
                        </span>
                        <span
                          className={`ledger-change ${step.contribution >= 0 ? "positive-text" : "negative-text"}`}
                        >
                          {formatSigned(step.contribution)}
                        </span>
                        <strong className="ledger-total">
                          {predictionLabel(cumulative[index + 1])}
                        </strong>
                      </button>
                    ))}
                  </div>
                  <div className="ledger-final">
                    <span>
                      <Check size={15} />
                      FINAL{" "}
                      {task === "classification"
                        ? finalProbability >= 0.5
                          ? "CHURN PROBABILITY"
                          : "RETAINED PROBABILITY"
                        : "MONTHLY ESTIMATE"}
                    </span>
                    <strong>{predictionLabel(finalValue)}</strong>
                    <small>
                      {task === "classification"
                        ? `Raw margin ${finalValue.toFixed(2)} → sigmoid → ${finalProbability >= 0.5 ? "Churn" : "Retained"}`
                        : "USD per month"}
                    </small>
                  </div>
                </section>
              </div>
            </section>
          )}

          {view === "quality" && (
            <section className="quality-view">
              <div className="quality-metrics">
                {(task === "classification"
                  ? [
                      {
                        label: "Accuracy",
                        value: "84.6%",
                        note: "test · n = 400",
                        icon: Target,
                      },
                      {
                        label: "Precision",
                        value: "81.2%",
                        note: "test · n = 400",
                        icon: Check,
                      },
                      {
                        label: "Recall",
                        value: "77.9%",
                        note: "test · n = 400",
                        icon: Activity,
                      },
                      {
                        label: "F1 score",
                        value: "79.5%",
                        note: "test · n = 400",
                        icon: Gauge,
                      },
                    ]
                  : [
                      {
                        label: "MAE",
                        value: "$8.42",
                        note: "test · n = 400",
                        icon: Target,
                      },
                      {
                        label: "RMSE",
                        value: "$11.08",
                        note: "test · n = 400",
                        icon: Activity,
                      },
                      {
                        label: "Train rows",
                        value: "1,280",
                        note: "training split",
                        icon: Database,
                      },
                      {
                        label: "Test rows",
                        value: "400",
                        note: "held-out split",
                        icon: Check,
                      },
                    ]
                ).map(({ label, value, note, icon: Icon }) => (
                  <article className="metric-card" key={label}>
                    <div className="metric-top">
                      <span>{label}</span>
                      <Icon size={16} />
                    </div>
                    <strong>{value}</strong>
                    <small>{note}</small>
                  </article>
                ))}
              </div>
              <div className="quality-grid">
                <section className="panel loss-panel">
                  <div className="panel-heading">
                    <div className="panel-title-wrap">
                      <span className="section-index">01</span>
                      <div>
                        <h2>Training progress</h2>
                        <p>
                          {task === "classification" ? "Log loss" : "RMSE"} by
                          boosting round · validation split n = 320
                        </p>
                      </div>
                    </div>
                    <span className="metric-legend">
                      <i />
                      Training <i className="validation-dot" />
                      Validation
                    </span>
                  </div>
                  <LossChart
                    task={task}
                    selectedRound={selectedRound}
                    onSelectRound={setSelectedRound}
                  />
                  <div className="early-stop-note">
                    <span className="early-stop-marker">!</span>
                    <span>
                      <strong>Best iteration: 7</strong> · Validation loss
                      starts to rise at round 8.
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRound(7);
                        setView("journey");
                      }}
                    >
                      Inspect round <ArrowRight size={13} />
                    </button>
                  </div>
                </section>
                <section className="panel importance-panel">
                  <div className="panel-heading">
                    <div className="panel-title-wrap">
                      <span className="section-index">02</span>
                      <div>
                        <h2>Feature importance</h2>
                        <p>Which features did trees use?</p>
                      </div>
                    </div>
                  </div>
                  <div
                    className="importance-tabs"
                    role="group"
                    aria-label="Feature importance measure"
                  >
                    {(["Gain", "Cover", "Weight"] as const).map((metric) => (
                      <button
                        type="button"
                        className={
                          importance === metric ? "importance-selected" : ""
                        }
                        onClick={() => setImportance(metric)}
                        key={metric}
                      >
                        {metric}
                      </button>
                    ))}
                  </div>
                  <p className="importance-explainer">
                    {importance === "Gain"
                      ? "Average improvement in the loss from splits on this feature."
                      : importance === "Cover"
                        ? "Average number of rows affected by splits on this feature."
                        : "How often this feature appears in a tree split."}
                  </p>
                  <ImportanceBars metric={importance} />
                </section>
              </div>
              <section className="panel quality-context">
                <div className="context-symbol">
                  <Database size={17} />
                </div>
                <div>
                  <strong>Evaluation context</strong>
                  <p>
                    Training 1,280 rows <i /> Validation 320 rows <i /> Test 400
                    rows{" "}
                    <span className="context-note">
                      · Illustrative demo metrics, not fitted model results.
                    </span>
                  </p>
                </div>
                <span className="objective-tag">
                  {task === "classification"
                    ? "binary:logistic"
                    : "reg:squarederror"}
                </span>
              </section>
            </section>
          )}

          {view === "datasets" && (
            <DatasetWorkspace
              file={csvFile}
              profile={csvProfile}
              trained={trainedDataset}
              task={datasetTask}
              targetColumn={targetColumn}
              numericMissing={numericMissing}
              categoricalMissing={categoricalMissing}
              duplicatePolicy={duplicatePolicy}
              excludedColumns={excludedColumns}
              busy={datasetBusy}
              error={datasetError}
              dragging={isDragging}
              selectedPredictionRow={selectedPredictionRow}
              onFile={profileCsvFile}
              onSample={loadSampleCsv}
              onTrain={trainUploadedCsv}
              onReset={resetDataset}
              onTarget={setTargetColumn}
              onTask={setDatasetTask}
              onNumericMissing={setNumericMissing}
              onCategoricalMissing={setCategoricalMissing}
              onDuplicatePolicy={setDuplicatePolicy}
              onExcludedColumns={setExcludedColumns}
              onDragging={setIsDragging}
              onSelectedPredictionRow={setSelectedPredictionRow}
            />
          )}

          {view === "guide" && (
            <XGBoostGuide onOpenUpload={() => setView("datasets")} />
          )}

          <footer className="app-footer">
            <span>
              <span className="footer-mark">T</span> TREEHOUSE <i /> BOOSTING
              LAB
            </span>
            <span>Demo data is illustrative. No model has been fitted.</span>
            <button type="button" onClick={() => setView("quality")}>
              Model configuration <ArrowUpRight size={13} />
            </button>
          </footer>
        </main>
      </div>
    </div>
  );
}

function JourneyChart({
  values,
  task,
  selectedRound,
  onSelectRound,
}: {
  values: number[];
  task: Task;
  selectedRound: number;
  onSelectRound: (round: number) => void;
}) {
  const displayValues =
    task === "classification"
      ? values.map((value) => sigmoid(value) * 100)
      : values;
  const min = task === "classification" ? 0 : 60;
  const max = task === "classification" ? 100 : 90;
  const x = (index: number) => 20 + index * (660 / (displayValues.length - 1));
  const y = (value: number) => 12 + ((max - value) / (max - min)) * 126;
  const path = displayValues
    .map((value, index) => `${index === 0 ? "M" : "L"} ${x(index)} ${y(value)}`)
    .join(" ");
  const area = `${path} L ${x(displayValues.length - 1)} 148 L ${x(0)} 148 Z`;

  return (
    <svg
      className="journey-chart"
      viewBox="0 0 700 165"
      preserveAspectRatio="none"
      role="group"
      aria-label={`Prediction trajectory across ${displayValues.length - 1} rounds`}
    >
      {[0, 1, 2, 3].map((line) => (
        <line
          key={line}
          x1="20"
          x2="680"
          y1={12 + line * 42}
          y2={12 + line * 42}
          className="chart-gridline"
        />
      ))}
      <path d={area} className="chart-area" />
      <path d={path} className="chart-path" />
      {displayValues.map((value, index) => (
        <g key={index}>
          <line
            x1={x(index)}
            x2={x(index)}
            y1="149"
            y2={y(value)}
            className={`chart-stem ${index === selectedRound ? "stem-selected" : ""}`}
          />
          <circle
            cx={x(index)}
            cy={y(value)}
            r={
              index === selectedRound
                ? 5.5
                : index === displayValues.length - 1
                  ? 4.5
                  : 3.1
            }
            className={`chart-point ${index === selectedRound ? "point-selected" : index === displayValues.length - 1 ? "point-final" : ""}`}
            role="button"
            tabIndex={0}
            aria-label={`Select ${index === 0 ? "base prediction" : `round ${index}`}`}
            onClick={() => onSelectRound(index)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelectRound(index);
              }
            }}
          />
        </g>
      ))}
      <text
        x={x(selectedRound)}
        y={Math.max(y(displayValues[selectedRound]) - 12, 10)}
        textAnchor="middle"
        className="chart-callout"
      >
        {task === "classification"
          ? `${displayValues[selectedRound].toFixed(1)}%`
          : `$${displayValues[selectedRound].toFixed(1)}`}
      </text>
      {displayValues.map((_, index) => (
        <text
          key={`x${index}`}
          x={x(index)}
          y="162"
          textAnchor="middle"
          className="chart-x-label"
        >
          {index === 0 ? "BASE" : `R${index}`}
        </text>
      ))}
    </svg>
  );
}

function TreeDiagram({
  tree,
  features,
  activeStep,
  selectedNode,
  onSelectNode,
  task,
}: {
  tree: TreeRound;
  features: Record<FeatureKey, number>;
  activeStep: ReturnType<typeof contributionFor>;
  selectedNode: string;
  onSelectNode: (node: string) => void;
  task: Task;
}) {
  const branches = [
    {
      key: "low",
      label: `NO · < ${tree.root.threshold}`,
      split: tree.low,
      active: !activeStep.rootHigh,
    },
    {
      key: "high",
      label: `YES · ≥ ${tree.root.threshold}`,
      split: tree.high,
      active: activeStep.rootHigh,
    },
  ] as const;

  return (
    <div className="tree-canvas">
      <button
        type="button"
        className={`tree-root tree-node ${selectedNode === "root" ? "node-selected" : ""} node-on-path`}
        onClick={() => onSelectNode("root")}
      >
        <span className="node-kind">SPLIT</span>
        <strong>{featureInfo[tree.root.feature].label}</strong>
        <small>
          ≥ {tree.root.threshold} {featureInfo[tree.root.feature].unit}
        </small>
        <em>yours: {features[tree.root.feature]}</em>
      </button>
      <div className="tree-fork">
        {branches.map(({ key, label, split, active }) => {
          const leaves = tree[task][key];
          const isLeaf = tree.earlyLeafBranch === key;
          const secondActive =
            active && activeStep.nextSplit?.feature === split.feature;
          const activeLeafIndex = activeStep.secondaryHigh ? 1 : 0;

          return (
            <div
              className={`tree-branch ${key === "low" ? "branch-no" : "branch-yes"} ${active ? "branch-active" : "branch-muted"}`}
              key={key}
            >
              <div
                className={`branch-label ${active ? "branch-label-active" : ""}`}
              >
                {label}
              </div>
              {isLeaf ? (
                <button
                  type="button"
                  className={`tree-leaf direct-leaf ${active && !activeStep.nextSplit ? "leaf-active" : ""} ${leaves[0] >= 0 ? "leaf-positive" : "leaf-negative"}`}
                  onClick={() => onSelectNode(`${key} branch · leaf`)}
                >
                  <span>LEAF SCORE</span>
                  <strong>{formatSigned(leaves[0])}</strong>
                  <small>
                    SCALED {formatSigned(leaves[0] * learningRate)}{" "}
                    {task === "classification" ? "margin" : "$ / mo"}
                  </small>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className={`tree-node secondary-node ${secondActive ? "node-on-path" : ""} ${selectedNode === key ? "node-selected" : ""}`}
                    onClick={() => onSelectNode(key)}
                  >
                    <span className="node-kind">SPLIT</span>
                    <strong>{featureInfo[split.feature].label}</strong>
                    <small>
                      ≥ {split.threshold} {featureInfo[split.feature].unit}
                    </small>
                    <em>yours: {features[split.feature]}</em>
                  </button>
                  <div className="leaf-pair">
                    {leaves.map((score, leafIndex) => {
                      const selectedLeaf =
                        active && !isLeaf && leafIndex === activeLeafIndex;
                      return (
                        <button
                          key={leafIndex}
                          type="button"
                          className={`tree-leaf ${selectedLeaf ? "leaf-active" : ""} ${score >= 0 ? "leaf-positive" : "leaf-negative"}`}
                          onClick={() =>
                            onSelectNode(
                              `${key} branch · leaf ${leafIndex + 1}`,
                            )
                          }
                        >
                          <span>
                            {leafIndex === 0 ? "NO LEAF" : "YES LEAF"}
                          </span>
                          <strong>{formatSigned(score)}</strong>
                          <small>
                            SCALED {formatSigned(score * learningRate)}{" "}
                            {task === "classification" ? "margin" : "$ / mo"}
                          </small>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LossChart({
  task,
  selectedRound,
  onSelectRound,
}: {
  task: Task;
  selectedRound: number;
  onSelectRound: (round: number) => void;
}) {
  const training =
    task === "classification"
      ? [0.69, 0.57, 0.49, 0.43, 0.39, 0.36, 0.34, 0.32, 0.31]
      : [31, 25, 21, 18, 16, 14, 13, 12, 11.8];
  const validation =
    task === "classification"
      ? [0.7, 0.59, 0.51, 0.46, 0.42, 0.4, 0.39, 0.385, 0.4]
      : [32, 27, 23, 20, 18.2, 17.1, 16.8, 16.5, 17.2];
  const min = task === "classification" ? 0.25 : 10;
  const max = task === "classification" ? 0.75 : 34;
  const x = (index: number) => 32 + index * 47;
  const y = (value: number) => 14 + ((max - value) / (max - min)) * 128;
  const makePath = (data: number[]) =>
    data
      .map((value, index) => `${index ? "L" : "M"} ${x(index)} ${y(value)}`)
      .join(" ");

  return (
    <svg
      className="loss-chart"
      viewBox="0 0 450 176"
      role="img"
      aria-label="Illustrative training and validation loss by boosting round"
    >
      {[0, 1, 2, 3].map((line) => (
        <line
          key={line}
          x1="30"
          x2="410"
          y1={16 + line * 40}
          y2={16 + line * 40}
          className="chart-gridline"
        />
      ))}
      <line
        x1={x(7)}
        x2={x(7)}
        y1="12"
        y2="148"
        className="best-iteration-line"
      />
      <text
        x={x(7)}
        y="10"
        textAnchor="middle"
        className="best-iteration-label"
      >
        BEST
      </text>
      <path d={makePath(training)} className="loss-training-path" />
      <path d={makePath(validation)} className="loss-validation-path" />
      {validation.map((value, index) => (
        <circle
          key={index}
          cx={x(index)}
          cy={y(value)}
          r={selectedRound === index ? 5 : 3}
          className={`loss-point ${selectedRound === index ? "loss-point-selected" : ""}`}
          onClick={() => onSelectRound(index)}
        />
      ))}
      {training.map((_, index) => (
        <text
          key={`label-${index}`}
          x={x(index)}
          y="166"
          textAnchor="middle"
          className="chart-x-label"
          onClick={() => onSelectRound(index)}
        >
          {index === 0 ? "BASE" : index}
        </text>
      ))}
    </svg>
  );
}

function ImportanceBars({ metric }: { metric: "Gain" | "Cover" | "Weight" }) {
  const scores =
    metric === "Gain"
      ? [88, 73, 59, 47, 39, 28]
      : metric === "Cover"
        ? [66, 91, 48, 74, 53, 34]
        : [92, 61, 81, 46, 58, 33];
  const names = [
    "Contract term",
    "Tenure",
    "Monthly charge",
    "Payment delay",
    "Support tickets",
    "Data usage",
  ];
  return (
    <div className="importance-bars">
      {names.map((name, index) => (
        <div className="importance-row" key={name}>
          <span>{name}</span>
          <div className="importance-track">
            <i
              style={{
                width: `${scores[index]}%`,
                animationDelay: `${index * 45}ms`,
              }}
            />
          </div>
          <strong>{scores[index]}</strong>
        </div>
      ))}
    </div>
  );
}

export default App;
