import { useMemo, useState } from "react";
import {
  FLOWER_DATASETS,
  evaluateForest,
  getClassDistribution,
  getDecisionPath,
  getTrainingFlowers,
  getTestFlowers,
  getTreeFeatureIndex,
  trainForest,
  calculatePermutationImportance,
  makeDatasetFromRows,
  type ClassLabel,
  type Flower,
  type TreeNode,
  type TrainedForest,
  type FlowerDataset,
} from "./model";
import { CsvUpload } from "./CsvUpload";
import { type CleanedDataset } from "./csvParser";
import "./Explorer.css";

type View =
  | "datasets"
  | "forest"
  | "prediction"
  | "trees"
  | "paths"
  | "importance"
  | "quality"
  | "insights";

function format(value: number) {
  return value.toFixed(1);
}

function shortLabel(label: ClassLabel) {
  return label;
}

function classTone(index: number) {
  return `class-${["a", "b", "c", "d", "e", "f"][index % 6]}`;
}

function shapeTone(index: number, prefix: "bar" | "flower" | "point" | "shape" | "tile") {
  return `${prefix}-${["a", "b", "c", "d", "e", "f"][index % 6]}`;
}

const VIEW_ITEMS: Array<{ id: View; label: string; icon: string }> = [
  { id: "forest", label: "Overview", icon: "⌂" },
  { id: "prediction", label: "Prediction", icon: "◉" },
  { id: "trees", label: "Trees", icon: "♧" },
  { id: "paths", label: "Decision Paths", icon: "⇢" },
  { id: "importance", label: "Feature Importance", icon: "▥" },
  { id: "quality", label: "Evaluation", icon: "✓" },
  { id: "insights", label: "Data Insights", icon: "▦" },
];

function findNode(
  root: TreeNode,
  targetPath: string,
  currentPath = "",
): TreeNode {
  if (currentPath === targetPath) return root;
  if (targetPath.startsWith(`${currentPath}L`) && root.left)
    return findNode(root.left, targetPath, `${currentPath}L`);
  if (targetPath.startsWith(`${currentPath}R`) && root.right)
    return findNode(root.right, targetPath, `${currentPath}R`);
  return root;
}

type PositionedNode = {
  node: TreeNode;
  path: string;
  depth: number;
  slot: number;
};

function layoutNodes(root: TreeNode) {
  const nodes: PositionedNode[] = [];
  const countLeaves = (node: TreeNode): number => {
    if (!node.left && !node.right) return 1;
    return (
      (node.left ? countLeaves(node.left) : 0) +
      (node.right ? countLeaves(node.right) : 0)
    );
  };
  const leafCount = countLeaves(root);
  const visit = (
    node: TreeNode,
    path: string,
    depth: number,
    firstLeaf: number,
  ): number => {
    if (!node.left && !node.right) {
      nodes.push({ node, path, depth, slot: firstLeaf + 0.5 });
      return firstLeaf + 0.5;
    }

    const childCenters: number[] = [];
    let nextLeaf = firstLeaf;
    if (node.left) {
      childCenters.push(visit(node.left, `${path}L`, depth + 1, nextLeaf));
      nextLeaf += countLeaves(node.left);
    }
    if (node.right)
      childCenters.push(visit(node.right, `${path}R`, depth + 1, nextLeaf));
    const slot =
      childCenters.reduce((sum, center) => sum + center, 0) /
      childCenters.length;
    nodes.push({ node, path, depth, slot });
    return slot;
  };
  visit(root, "", 0, 0);
  return { nodes, leafCount };
}

function getActivePath(
  forest: TrainedForest,
  treeIndex: number,
  flower: Flower,
) {
  const path = getDecisionPath(forest, treeIndex, flower);
  const activeNodes = new Set([""]);
  let current = "";
  for (const step of path.steps) {
    current += step.passes ? "L" : "R";
    activeNodes.add(current);
  }
  activeNodes.add(path.leafPath);
  return { path, activeNodes };
}

function TreeDiagram({
  forest,
  treeIndex,
  flower,
  featureNames,
  classLabels,
  selectedNodePath,
  onSelectNode,
}: {
  forest: TrainedForest;
  treeIndex: number;
  flower: Flower;
  featureNames: string[];
  classLabels: string[];
  selectedNodePath: string;
  onSelectNode: (path: string) => void;
}) {
  const root = forest.trees[treeIndex];
  const layout = layoutNodes(root);
  const { nodes } = layout;
  const maxDepth = Math.max(...nodes.map((item) => item.depth));
  const width = Math.max(980, layout.leafCount * 230);
  const nodeWidth = 198;
  const nodeHeight = 90;
  const rowGap = 142;
  const top = 64;
  const height = top * 2 + maxDepth * rowGap + nodeHeight;
  const { path, activeNodes } = getActivePath(forest, treeIndex, flower);
  const activeEdges = new Set<string>();
  let activeKey = "";
  path.steps.forEach((step) => {
    activeKey += step.passes ? "L" : "R";
    activeEdges.add(activeKey);
  });
  const position = (item: PositionedNode) => ({
    x: (item.slot / layout.leafCount) * width,
    y: top + item.depth * rowGap,
  });

  return (
    <div className="tree-diagram-scroll">
      <svg
        className="tree-diagram"
        style={{ width: `${width}px` }}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Decision tree ${treeIndex + 1}. Select a node for details. The selected flower route is highlighted.`}
      >
        {nodes
          .filter(
            (item) =>
              item.depth < maxDepth && (item.node.left || item.node.right),
          )
          .map((item) => {
            const parent = position(item);
            return (["L", "R"] as const).map((direction) => {
              const childPath = `${item.path}${direction}`;
              const child = nodes.find(
                (candidate) => candidate.path === childPath,
              );
              if (!child) return null;
              const endpoint = position(child);
              const active = activeEdges.has(childPath);
              return (
                <g key={`${item.path}-${direction}`}>
                  <line
                    className={`tree-edge ${active ? "is-on-path" : ""}`}
                    x1={parent.x}
                    y1={parent.y + nodeHeight / 2}
                    x2={endpoint.x}
                    y2={endpoint.y - nodeHeight / 2}
                  />
                  <text
                    className={`tree-edge-label ${active ? "is-on-path" : ""}`}
                    x={(parent.x + endpoint.x) / 2}
                    y={(parent.y + endpoint.y) / 2 - 2}
                  >
                    {direction === "L" ? "YES" : "NO"}
                  </text>
                </g>
              );
            });
          })}
        {nodes.map((item) => {
          const point = position(item);
          const featureIndex = getTreeFeatureIndex(
            forest,
            treeIndex,
            item.node,
          );
          const isSplit =
            featureIndex !== undefined &&
            item.node.splitValue !== undefined &&
            Boolean(item.node.left || item.node.right);
          const distribution = getClassDistribution(item.node, classLabels.length);
          const predictedClass =
            classLabels[distribution.indexOf(Math.max(...distribution))] ??
            classLabels[0];
          const active = activeNodes.has(item.path);
          const selected = selectedNodePath === item.path;
          const label = isSplit
            ? `${featureNames[featureIndex]} less than ${format(item.node.splitValue!)}`
            : `Leaf predicts ${predictedClass}`;
          return (
            <g
              key={item.path || "root"}
              className={`tree-node ${active ? "is-on-path" : ""} ${selected ? "is-selected" : ""} ${isSplit ? "is-split" : "is-leaf"}`}
              role="button"
              tabIndex={0}
              aria-label={label}
              transform={`translate(${point.x - nodeWidth / 2}, ${point.y - nodeHeight / 2})`}
              onClick={() => onSelectNode(item.path)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectNode(item.path);
                }
              }}
            >
              <rect width={nodeWidth} height={nodeHeight} rx="10" />
              {isSplit ? (
                <>
                  <text className="tree-node-kicker" x="14" y="24">
                    SPLIT {item.depth + 1} ·{" "}
                    {featureNames[featureIndex]?.toUpperCase()}
                  </text>
                  <text className="tree-node-main" x="14" y="50">
                    Is {featureNames[featureIndex]?.toLowerCase()} &lt;{" "}
                    {format(item.node.splitValue!)}?
                  </text>
                  <text className="tree-node-meta" x="14" y="73">
                    {item.node.numberSamples ?? "—"} samples · Gini gain{" "}
                    {format(item.node.gain ?? 0)}
                  </text>
                </>
              ) : (
                <>
                  <text className="tree-node-kicker" x="14" y="24">
                    LEAF · {active ? "SELECTED PATH" : "OTHER BRANCH"}
                  </text>
                  <text className="tree-node-main" x="14" y="51">
                    Predict {predictedClass}
                  </text>
                  <text className="tree-node-meta" x="14" y="73">
                    {classLabels.map((label, index) =>
                      `${label}: ${Math.round((distribution[index] ?? 0) * 100)}%`,
                    ).join(" · ")}
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function TreeInspector({
  forest,
  treeIndex,
  flower,
  featureNames,
  classLabels,
  selectedNodePath,
  setSelectedNodePath,
  setTreeIndex,
  onBack,
  onFullTree,
}: {
  forest: TrainedForest;
  treeIndex: number;
  flower: Flower;
  featureNames: string[];
  classLabels: string[];
  selectedNodePath: string;
  setSelectedNodePath: (path: string) => void;
  setTreeIndex: (index: number) => void;
  onBack?: () => void;
  onFullTree?: () => void;
}) {
  const root = forest.trees[treeIndex];
  const { path } = getActivePath(forest, treeIndex, flower);
  const selectedNode = findNode(root, selectedNodePath);
  const selectedFeature = getTreeFeatureIndex(forest, treeIndex, selectedNode);
  const selectedIsSplit =
    selectedFeature !== undefined &&
    selectedNode.splitValue !== undefined &&
    Boolean(selectedNode.left || selectedNode.right);
  const selectedDistribution = getClassDistribution(selectedNode, classLabels.length);
  const leafDistribution = getClassDistribution(path.leaf, classLabels.length);
  const leafPrediction =
    classLabels[leafDistribution.indexOf(Math.max(...leafDistribution))] ??
    classLabels[0];

  return (
    <section className="inspector" aria-labelledby="inspector-title">
      <div className="inspector-heading">
        <div>
          <p className="eyebrow">
            TREE EXPLORER · T{String(treeIndex + 1).padStart(2, "0")}
          </p>
          <h3 id="inspector-title">Decision path</h3>
          <p className="inspector-intro">
            Tree {String(treeIndex + 1).padStart(2, "0")} · highlighted route
            for row #{String(flower.id + 1).padStart(2, "0")}
          </p>
        </div>
        <div className="tree-navigation">
          <button
            type="button"
            disabled={treeIndex === 0}
            onClick={() => {
              setTreeIndex(treeIndex - 1);
              setSelectedNodePath("");
            }}
          >
            ← Previous
          </button>
          <button
            type="button"
            disabled={treeIndex === forest.trees.length - 1}
            onClick={() => {
              setTreeIndex(treeIndex + 1);
              setSelectedNodePath("");
            }}
          >
            Next →
          </button>
          {onBack && (
            <button className="back-button" type="button" onClick={onBack}>
              Forest overview
            </button>
          )}
          {onFullTree && (
            <button className="full-tree-button" type="button" onClick={onFullTree}>
              View Full Tree
            </button>
          )}
        </div>
      </div>
      <div className="inspector-layout">
        <div className="tree-canvas-panel">
          <TreeDiagram
            forest={forest}
            treeIndex={treeIndex}
            flower={flower}
            featureNames={featureNames}
            classLabels={classLabels}
            selectedNodePath={selectedNodePath}
            onSelectNode={setSelectedNodePath}
          />
        </div>
        <aside className="inspector-side">
          <section className="node-detail">
            <span className="detail-kicker">SELECTED NODE</span>
            {selectedIsSplit ? (
              <>
                <strong>
                  {featureNames[selectedFeature!]} &lt;{" "}
                  {format(selectedNode.splitValue!)}
                </strong>
                <span>
                  {selectedNode.numberSamples ?? "Sample count unavailable"}{" "}
                  samples reached this split.
                </span>
                <span>Gini gain: {format(selectedNode.gain ?? 0)}.</span>
              </>
            ) : (
              <>
                <strong>
                  Leaf predicts{" "}
                  {classLabels[selectedDistribution.indexOf(Math.max(...selectedDistribution))] ?? classLabels[0]}
                </strong>
                <span>
                  Bootstrap class mix:{" "}
                  {classLabels.map((label, index) =>
                    `${label} ${Math.round((selectedDistribution[index] ?? 0) * 100)}%`,
                  ).join(" · ")}.
                </span>
                <span>Leaf sample count is not exposed by this model.</span>
              </>
            )}
          </section>
          <section className="path-summary" aria-live="polite">
            <span className="detail-kicker">
              WHY THIS TREE VOTED {shortLabel(leafPrediction)}
            </span>
            {path.steps.length === 0 ? (
              <span>This tree ends at its root leaf.</span>
            ) : (
              path.steps.map((step, index) => (
                <div
                  className="route-item"
                  key={`${step.featureIndex}-${index}`}
                >
                  <span className="route-number">{index + 1}</span>
                  <span className="route-copy">
                    <strong>
                      {featureNames[step.featureIndex]}{" "}
                      {step.passes ? "<" : "≥"} {format(step.node.splitValue!)}
                    </strong>
                    <small>Observation value: {format(step.value)}</small>
                  </span>
                  <span
                    className={`route-status ${step.passes ? "route-yes" : "route-no"}`}
                  >
                    {step.passes ? "Passed" : "No"}
                  </span>
                </div>
              ))
            )}
            <div
              className={`route-result ${classTone(classLabels.indexOf(leafPrediction))}`}
            >
              Leaf vote: {leafPrediction}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

function VoteDistribution({
  votes,
  classLabels,
}: {
  votes: ClassLabel[];
  classLabels: string[];
}) {
  const counts = classLabels.map(
    (label) => votes.filter((vote) => vote === label).length,
  );
  const predicted =
    classLabels[counts.indexOf(Math.max(...counts))] ?? classLabels[0];

  return (
    <div className="vote-distribution" aria-live="polite">
      <div className="distribution-head">
        <span>ENSEMBLE OUTPUT</span>
        <strong>{predicted}</strong>
      </div>
      <div
        className="distribution-bar"
        role="img"
        aria-label={counts
          .map((count, index) => `${count} trees vote for ${classLabels[index]}`)
          .join("; ")}
      >
        {counts.map((count, index) => (
          <span
            key={classLabels[index]}
            className={shapeTone(index, "bar")}
            style={{ width: `${(count / votes.length) * 100}%` }}
          />
        ))}
      </div>
      <div className="distribution-legend">
        {counts.map((count, index) => (
          <span key={classLabels[index]}>
            <i className={classTone(index)} />{" "}
            {classLabels[index]} <b>{count}</b>
          </span>
        ))}
      </div>
      <p>Vote share is a model output, not a calibrated probability.</p>
    </div>
  );
}

function App() {
  const [view, setView] = useState<View>("forest");
  const [treeCount, setTreeCount] = useState(5);
  const [maxDepth, setMaxDepth] = useState<number | null>(3);
  const [minSamples, setMinSamples] = useState(3);
  const [forestSeed, setForestSeed] = useState(42);
  const [datasetId, setDatasetId] = useState(FLOWER_DATASETS[0].id);
  const [selectedId, setSelectedId] = useState(
    getTestFlowers(FLOWER_DATASETS[0].flowers)[0].id,
  );
  const [selectedTree, setSelectedTree] = useState(0);
  const [selectedNodePath, setSelectedNodePath] = useState("");
  const [userDatasets, setUserDatasets] = useState<FlowerDataset[]>([]);
  const [showConfig, setShowConfig] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [importanceMethod, setImportanceMethod] = useState<"gini" | "permutation">("gini");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [inputMode, setInputMode] = useState<"dataset" | "manual">("dataset");
  const [manualFeatures, setManualFeatures] = useState<number[]>([]);

  const allDatasets = useMemo(
    () => [...FLOWER_DATASETS, ...userDatasets],
    [userDatasets],
  );
  const dataset =
    allDatasets.find((item) => item.id === datasetId) ?? allDatasets[0];
  const flowers = dataset.flowers;
  const featureNames = dataset.featureNames;
  const classLabels = dataset.classLabels;
  const trainingFlowers = getTrainingFlowers(flowers);
  const testFlowers = getTestFlowers(flowers);
  const forest = useMemo(() => {
    return trainForest(
      treeCount,
      maxDepth,
      forestSeed,
      flowers,
      classLabels,
      minSamples,
    );
  }, [treeCount, maxDepth, minSamples, forestSeed, flowers, classLabels]);
  const flower =
    flowers.find((item) => item.id === selectedId) ?? testFlowers[0];
  const predictionFlower: Flower = {
    ...flower,
    id: inputMode === "manual" ? -1 : flower.id,
    features:
      inputMode === "manual" && manualFeatures.length === featureNames.length
        ? manualFeatures
        : flower.features,
  };
  const votes = forest.predictEach(predictionFlower);
  const selectedTreePath = getDecisionPath(
    forest,
    selectedTree,
    predictionFlower,
  );
  const voteCounts = classLabels.map(
    (label) => votes.filter((vote) => vote === label).length,
  );
  const modelPrediction =
    classLabels[voteCounts.indexOf(Math.max(...voteCounts))] ?? classLabels[0];
  const modelAgreement = Math.max(...voteCounts);
  const evaluation = evaluateForest(forest, flowers, classLabels);
  const rootNode = forest.trees[selectedTree];
  const rootFeatureIndex = rootNode
    ? getTreeFeatureIndex(forest, selectedTree, rootNode)
    : undefined;
  const permutationValues = useMemo(
    () =>
      calculatePermutationImportance(forest, flowers, forestSeed),
    [forest, flowers, forestSeed],
  );
  const importance = featureNames.map((name, index) => ({
    name,
    value:
      importanceMethod === "gini"
        ? forest.importance[index] ?? 0
        : permutationValues[index] ?? 0,
  })).sort((left, right) => right.value - left.value);
  const totalClassCount = evaluation.classCounts.reduce((sum, count) => sum + count, 0);
  const trainPercent = Math.round((trainingFlowers.length / flowers.length) * 100);
  const testPercent = 100 - trainPercent;
  const isTestRow = (id: number) => testFlowers.some((row) => row.id === id);
  const featureMinimums = featureNames.map((_, index) =>
    Math.min(...flowers.map((item) => item.features[index] ?? 0)),
  );
  const featureMaximums = featureNames.map((_, index) =>
    Math.max(...flowers.map((item) => item.features[index] ?? 0)),
  );
  const xMin = featureMinimums[0] ?? 0;
  const xRange = (featureMaximums[0] ?? 1) - xMin || 1;
  const yMin = featureMinimums[1] ?? 0;
  const yRange = (featureMaximums[1] ?? 1) - yMin || 1;
  const decisionRegions = useMemo(
    () =>
      Array.from({ length: 18 * 12 }, (_, index) => {
        const column = index % 18;
        const row = Math.floor(index / 18);
        const features = featureNames.map((_, featureIndex) => {
          const min = featureMinimums[featureIndex] ?? 0;
          const range =
            (featureMaximums[featureIndex] ?? min + 1) - min || 1;
          if (featureIndex === 0) return min + (column / 17) * range;
          if (featureIndex === 1) return min + ((11 - row) / 11) * range;
          return flowers.reduce(
            (sum, item) => sum + (item.features[featureIndex] ?? 0),
            0,
          ) / flowers.length;
        });
        const point: Flower = {
          id: -1,
          features,
          label: classLabels[0],
        };
        return { column, row, prediction: forest.predict(point) };
      }),
    [classLabels, featureMaximums, featureMinimums, featureNames, flowers, forest],
  );

  function chooseFlower(id: number) {
    setSelectedId(id);
    setSelectedNodePath("");
    setInputMode("dataset");
  }

  function chooseTree(index: number) {
    setSelectedTree(index);
    setSelectedNodePath("");
  }

  function chooseDataset(id: string) {
    const nextDataset =
      allDatasets.find((item) => item.id === id) ?? allDatasets[0];
    setDatasetId(nextDataset.id);
    setSelectedId(getTestFlowers(nextDataset.flowers)[0].id);
    setManualFeatures([]);
    setInputMode("dataset");
    setSelectedTree(0);
    setSelectedNodePath("");
  }

  function handleUploadedDataset(cleaned: CleanedDataset, filename: string) {
    const id = `user-${Date.now()}`;
    const shortName = filename.replace(/\.csv$/i, "").slice(0, 28);
    try {
      const newDataset = makeDatasetFromRows(
        id,
        shortName,
        `Uploaded · ${cleaned.rows.length} rows`,
        cleaned.featureNames,
        cleaned.classLabels,
        cleaned.targetName,
        cleaned.rows,
        {
          sourceRows: cleaned.sourceRowCount,
          missingRows: cleaned.missingRowCount,
          duplicateRows: cleaned.duplicateCount,
          droppedRows: cleaned.droppedCount,
          imputedValues: cleaned.imputedCount,
        },
      );
      setUserDatasets((prev) => [...prev, newDataset]);
      // Immediately switch to the new dataset
      setDatasetId(id);
      setSelectedId(getTestFlowers(newDataset.flowers)[0].id);
      setManualFeatures([]);
      setInputMode("dataset");
      setSelectedTree(0);
      setSelectedNodePath("");
      setView("forest");
    } catch (err) {
      throw new Error(
        `Could not activate uploaded dataset: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  function refitForest() {
    setForestSeed((seed) => seed + 73);
    setSelectedTree(0);
    setSelectedNodePath("");
  }

  function exportReport() {
    const lines = [
      ["Metric", "Value"],
      ["Dataset", dataset.name],
      ["Target", dataset.targetName],
      ["Features", featureNames.join("; ")],
      ["Rows", String(flowers.length)],
      ["Training rows", String(trainingFlowers.length)],
      ["Test rows", String(testFlowers.length)],
      ["Split", `${trainPercent}/${testPercent}`],
      ["Trees", String(treeCount)],
      ["Criterion", "Gini"],
      ["Maximum depth", maxDepth === null ? "Auto" : String(maxDepth)],
      ["Minimum samples per leaf", String(minSamples)],
      ["Random seed", String(forestSeed)],
      ["Accuracy", String(evaluation.accuracy)],
      ["Macro precision", String(evaluation.macroPrecision)],
      ["Macro recall", String(evaluation.macroRecall)],
      ["Macro F1", String(evaluation.macroF1)],
      ["Weighted F1", String(evaluation.weightedF1)],
      ...classLabels.map((label, index) => [
        `Class count: ${label}`,
        String(evaluation.classCounts[index] ?? 0),
      ]),
    ];
    const csv = lines
      .map((row) =>
        row
          .map((cell) => `"${cell.replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${dataset.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-model-report.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function shareDashboard() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setActionMessage("Dashboard link copied.");
    } catch (error) {
      setActionMessage(
        `Could not copy dashboard link: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return (
    <div className={`workspace-shell ${isDarkTheme ? "theme-dark" : ""}`}>
      <aside className="workspace-sidebar">
        <a className="sidebar-brand" href="#top" aria-label="ModelMind home">
          <span className="sidebar-brand-mark">▥</span> ModelMind
        </a>
        <nav className="sidebar-nav" aria-label="Main navigation">
          <button type="button" className="sidebar-link" onClick={() => setView("forest")}>
            <span>⌂</span> Home
          </button>
          <button type="button" className={`sidebar-link ${view === "datasets" ? "is-current" : ""}`} onClick={() => setView("datasets")}>
            <span>⇧</span> Upload Dataset
          </button>
          <button type="button" className="sidebar-link" onClick={() => setView("datasets")}>
            <span>⚙</span> Data Preprocessing
          </button>
          <div className="sidebar-group-label">VISUALIZATIONS</div>
          <button
            type="button"
            className={`sidebar-link sidebar-link--nested ${view !== "datasets" ? "is-current" : ""}`}
            onClick={() => setView("forest")}
          >
            <span>♣</span> Random Forest
          </button>
          <div className="sidebar-divider" />
          {[
            ["Reports", "▧"],
            ["Settings", "⚙"],
          ].map(([label, icon]) => (
            <button type="button" className="sidebar-link" key={label} onClick={() => label === "Reports" && exportReport()}>
              <span>{icon}</span> {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-profile">
          <span className="profile-avatar">H</span>
          <span><strong>Harshit</strong><small>Local workspace</small></span>
          <span className="profile-chevron">⌄</span>
        </div>
      </aside>

      <main className="app-shell explorer-shell workspace-main">
      <header className="topbar workspace-topbar">
        <label className="workspace-search">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            placeholder="Search models, datasets, or features..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                const match = VIEW_ITEMS.find((item) =>
                  item.label.toLowerCase().includes(searchQuery.toLowerCase()),
                );
                if (match) setView(match.id);
              }
            }}
            aria-label="Search models, datasets, or features"
          />
          <kbd>⌘ K</kbd>
        </label>
        <div className="header-actions">
          <button className="toolbar-icon-button" type="button" aria-label="Toggle color theme" onClick={() => setIsDarkTheme((dark) => !dark)}>{isDarkTheme ? "☾" : "☼"}</button>
          <button className="toolbar-button" type="button" onClick={() => setShowHelp(true)}>ⓘ Docs</button>
          <button className="toolbar-button toolbar-button--accent" type="button" onClick={shareDashboard}>↗ Share</button>
          <button className="toolbar-button toolbar-button--primary" type="button" onClick={exportReport}>⇧ Export Report</button>
        </div>
      </header>

      <section className="intro explorer-intro" id="top">
        <div>
          <p className="eyebrow">RANDOM FOREST / CLASSIFICATION</p>
          <h1>Random Forest Explorer</h1>
          <p className="intro-copy">
            Understand how a Random Forest model makes predictions with interactive visualizations.
          </p>
        </div>
        <div className="intro-controls">
          <label className="dataset-picker" htmlFor="dataset-select">
            DATASET
            <select
              id="dataset-select"
              value={datasetId}
              onChange={(event) => chooseDataset(event.target.value)}
            >
              <optgroup label="Sample datasets">
                {FLOWER_DATASETS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </optgroup>
              {userDatasets.length > 0 && (
                <optgroup label="My uploads">
                  {userDatasets.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </label>
          <button
            type="button"
            className="upload-shortcut-btn"
            onClick={() => setView("datasets")}
            aria-label="Upload a CSV dataset"
          >
            ⤒ Upload CSV
          </button>
          <button className="train-button" type="button" onClick={refitForest}>▶ Train / Re-fit</button>
        </div>
      </section>

      <section className="model-summary" aria-label="Selected model summary">
        <div className="summary-stat">
          <span>Number of Trees</span>
          <strong>
            {treeCount}
            <small>All contributing</small>
          </strong>
        </div>
        <div className="summary-stat">
          <span>Test Accuracy</span>
          <strong>
            {Math.round(evaluation.accuracy * 100)}%
            <small>({evaluation.sampleCount} test samples)</small>
          </strong>
        </div>
        <div className="summary-stat">
          <span>Target</span>
          <strong>
            {dataset.targetName}<small>{classLabels.length} classes</small>
          </strong>
        </div>
        <div className="summary-stat">
          <span>Training / Testing</span>
          <strong>
            {trainingFlowers.length} / {testFlowers.length}
            <small>({trainPercent}% / {testPercent}%)</small>
          </strong>
        </div>
        <button
          className={`summary-stat config-summary ${showConfig ? "is-open" : ""}`}
          type="button"
          aria-expanded={showConfig}
          onClick={() => setShowConfig((open) => !open)}
        >
          <span>Model Parameters</span>
          <strong>
            <small>Criterion: Gini</small>
            <small>Max Depth: {maxDepth ?? "Auto"}</small>
            <small>Min Samples: {minSamples}</small>
            <small>Random State: {forestSeed}</small>
          </strong>
        </button>
      </section>

      {showConfig && (
        <section className="model-config-panel" aria-label="Model configuration">
          <div className="config-panel-heading">
            <div><strong>Random Forest configuration</strong><small>Changes update the fitted model immediately.</small></div>
            <button type="button" onClick={() => setShowConfig(false)} aria-label="Close model parameters">×</button>
          </div>
          <label>
            Number of trees
            <select value={treeCount} onChange={(event) => setTreeCount(Number(event.target.value))}>
              {[5, 10, 25, 50, 100].map((count) => <option key={count} value={count}>{count}</option>)}
            </select>
          </label>
          <label>
            Maximum depth
            <select value={maxDepth ?? "auto"} onChange={(event) => setMaxDepth(event.target.value === "auto" ? null : Number(event.target.value))}>
              <option value="auto">Auto (unlimited)</option>
              {[3, 5, 8, 12].map((depth) => <option key={depth} value={depth}>{depth}</option>)}
            </select>
          </label>
          <label>
            Minimum samples per leaf
            <select value={minSamples} onChange={(event) => setMinSamples(Number(event.target.value))}>
              {[2, 3, 5, 10].map((count) => <option key={count} value={count}>{count}</option>)}
            </select>
          </label>
          <label>
            Criterion
            <input value="Gini (library default)" readOnly />
          </label>
          <label>
            Random seed
            <input value={forestSeed} onChange={(event) => {
              const seed = Number(event.target.value);
              if (Number.isInteger(seed) && seed >= 0) setForestSeed(seed);
            }} type="number" min="0" />
          </label>
          <button type="button" className="train-button" onClick={() => setShowConfig(false)}>Apply &amp; Fit Model</button>
        </section>
      )}

      <nav
        className="view-tabs"
        role="tablist"
        aria-label="Model explorer views"
      >
        {VIEW_ITEMS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={view === id}
            aria-controls={`${id}-view`}
            onClick={() => setView(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      {actionMessage && (
        <div className="action-message" role="status">
          {actionMessage}
          <button type="button" onClick={() => setActionMessage("")} aria-label="Dismiss message">×</button>
        </div>
      )}

      {view === "datasets" && (
        <section
          id="datasets-view"
          className="model-view datasets-view"
          role="tabpanel"
          aria-label="Datasets"
        >
          <div className="view-heading">
            <div>
              <p className="eyebrow">00 / DATASETS</p>
              <h2>Manage your datasets</h2>
            </div>
          </div>

          <div className="datasets-layout">
            {/* Upload panel */}
            <section className="datasets-upload-section">
              <div className="datasets-section-header">
                <h3>Upload a CSV</h3>
                <p>
                  Upload a classification dataset with any column names. Select the target and input columns, handle missing values, and train the forest. At least 8 rows are required.
                </p>
              </div>
              <CsvUpload onDatasetReady={handleUploadedDataset} />
            </section>

            {/* All datasets list */}
            <section className="datasets-list-section">
              <div className="datasets-section-header">
                <h3>Available datasets</h3>
                <p>Select a dataset to activate it for all model views.</p>
              </div>
              <div className="datasets-list">
                {/* Sample datasets */}
                <p className="datasets-group-label">SAMPLE DATASETS</p>
                {FLOWER_DATASETS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`dataset-list-item ${
                      datasetId === item.id ? "is-active" : ""
                    }`}
                    onClick={() => {
                      chooseDataset(item.id);
                      setView("forest");
                    }}
                  >
                    <div className="dataset-item-info">
                      <strong>{item.name}</strong>
                      <span>{item.description}</span>
                      <span className="dataset-item-meta">
                        {item.flowers.length} rows
                      </span>
                    </div>
                    <span className="dataset-item-badge">
                      {datasetId === item.id ? "✓ Active" : "Use →"}
                    </span>
                  </button>
                ))}

                {/* User uploaded datasets */}
                {userDatasets.length > 0 && (
                  <>
                    <p className="datasets-group-label datasets-group-label--user">
                      MY UPLOADS
                    </p>
                    {userDatasets.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`dataset-list-item dataset-list-item--user ${
                          datasetId === item.id ? "is-active" : ""
                        }`}
                        onClick={() => {
                          chooseDataset(item.id);
                          setView("forest");
                        }}
                      >
                        <div className="dataset-item-info">
                          <strong>{item.name}</strong>
                          <span>{item.description}</span>
                          <span className="dataset-item-meta">
                            {item.flowers.length} rows
                          </span>
                        </div>
                        <span className="dataset-item-badge">
                          {datasetId === item.id ? "✓ Active" : "Use →"}
                        </span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            </section>
          </div>
        </section>
      )}

      {(view === "forest" || view === "trees" || view === "paths") && (
        <section
          id={`${view}-view`}
          className="model-view"
          role="tabpanel"
          aria-label={view === "forest" ? "Forest overview" : view === "trees" ? "Full tree explorer" : "Decision paths"}
        >
          {view === "forest" && (
            <>
          <div className="view-heading">
            <div>
              <p className="eyebrow">RANDOM FOREST / OVERVIEW</p>
              <h2>Model dashboard</h2>
            </div>
            <button className="how-it-works-button" type="button" onClick={() => setShowHelp(true)}>ⓘ How it works?</button>
          </div>
          <div className="forest-dashboard overview-grid">
            <section className="dashboard-card dataset-overview-card">
              <div className="dashboard-card-heading">
                <div>
                  <h3>Dataset Overview</h3>
                  <p>{dataset.name} · validated model inputs</p>
                </div>
                <span className="overview-card-icon">▦</span>
              </div>
              <div className="dataset-facts">
                <div><span>Total Rows</span><strong>{flowers.length}</strong></div>
                <div><span>Feature Columns</span><strong>{featureNames.length}</strong></div>
                <div><span>Target Column</span><strong>{dataset.targetName}</strong></div>
                <div><span>Missing Rows</span><strong>{dataset.dataQuality?.missingRows ?? 0}</strong></div>
                <div><span>Classes</span><strong>{classLabels.length}</strong></div>
              </div>
              <strong className="mini-chart-label">Class Distribution</strong>
              <div className="class-distribution-list">
                {classLabels.map((label, index) => {
                  const count = evaluation.classCounts[index] ?? 0;
                  const percent = totalClassCount ? (count / totalClassCount) * 100 : 0;
                  return (
                    <div className="class-distribution-row" key={label}>
                      <span className={classTone(index)}>{label}</span>
                      <div className="class-distribution-track">
                        <i className={shapeTone(index, "bar")} style={{ width: `${percent}%` }} />
                      </div>
                      <b>{count} <small>{percent.toFixed(0)}%</small></b>
                    </div>
                  );
                })}
              </div>
            </section>

            <section
              className="dashboard-card forest-vote-card"
              aria-labelledby="forest-vote-title"
            >
              <div className="dashboard-card-heading">
                <div>
                  <h3 id="forest-vote-title">Forest vote</h3>
                  <p>
                    How the trees voted for observation #
                    {String(flower.id + 1).padStart(2, "0")}
                  </p>
                </div>
                <button
                  className="text-action"
                  type="button"
                  onClick={() => chooseTree(0)}
                >
                  View trees
                </button>
              </div>
              <VoteDistribution votes={votes} classLabels={classLabels} />
              <div className="tree-tiles">
                {votes.map((vote, index) => (
                  <button
                    key={index}
                    type="button"
                    className={`tree-tile ${selectedTree === index ? "is-selected" : ""} ${shapeTone(classLabels.indexOf(vote), "tile")}`}
                    aria-pressed={selectedTree === index}
                    onClick={() => chooseTree(index)}
                  >
                    <span>T{String(index + 1).padStart(2, "0")}</span>
                    <i aria-hidden="true">
                      {classLabels.indexOf(vote) === 0 ? "●" : "◆"}
                    </i>
                    <strong>{vote}</strong>
                  </button>
                ))}
              </div>
            </section>
            <section
              className="dashboard-card feature-card"
              aria-labelledby="top-features-title"
            >
              <div className="dashboard-card-heading">
                <div>
                  <h3 id="top-features-title">Top features</h3>
                  <p>{importanceMethod === "gini" ? "Gini decrease · full forest" : "Permutation · held-out rows"}</p>
                </div>
                <div className="importance-method-switch" role="group" aria-label="Feature importance method">
                  <button type="button" aria-pressed={importanceMethod === "gini"} onClick={() => setImportanceMethod("gini")}>Gini</button>
                  <button type="button" aria-pressed={importanceMethod === "permutation"} onClick={() => setImportanceMethod("permutation")}>Permutation</button>
                </div>
              </div>
              <div className="dashboard-importance">
                {importance.map((feature) => (
                  <div className="dashboard-importance-row" key={feature.name}>
                    <span>{feature.name}</span>
                    <div className="importance-track">
                      <span
                        style={{
                          width: `${Math.max(0, feature.value * 100)}%`,
                        }}
                      />
                    </div>
                    <strong>{feature.value.toFixed(2)}</strong>
                  </div>
                ))}
              </div>
              <p className="dashboard-note">
                {importanceMethod === "gini"
                  ? "Forest-wide split importance; it does not imply causation."
                  : "Accuracy decrease after shuffling each feature on held-out test rows. Not causal."}
              </p>
            </section>

            <section className="dashboard-card model-performance-card">
              <div className="dashboard-card-heading">
                <div><h3>Model Performance</h3><p>Held-out test · {evaluation.sampleCount} rows</p></div>
                <span className="performance-icon">✓</span>
              </div>
              <div className="performance-mini-metrics">
                <div><span>Accuracy</span><strong>{Math.round(evaluation.accuracy * 100)}%</strong></div>
                <div><span>Macro F1</span><strong>{Math.round(evaluation.macroF1 * 100)}%</strong></div>
                <div><span>Precision</span><strong>{Math.round(evaluation.macroPrecision * 100)}%</strong></div>
                <div><span>Recall</span><strong>{Math.round(evaluation.macroRecall * 100)}%</strong></div>
              </div>
              <p className="performance-caption">Macro-average gives each target class equal weight.</p>
              {evaluation.sampleCount < 10 && (
                <p className="small-test-warning" role="status">Small test set: metrics may be unstable.</p>
              )}
            </section>

            <section className="dashboard-card tree-preview-card">
              <div className="dashboard-card-heading">
                <div><h3>Tree Explorer</h3><p>Tree {selectedTree + 1} · fitted root split</p></div>
                <span className="tree-preview-icon">♧</span>
              </div>
              <label className="dashboard-select-label" htmlFor="overview-tree-select">
                SELECT TREE
                <select id="overview-tree-select" value={selectedTree} onChange={(event) => chooseTree(Number(event.target.value))}>
                  {forest.trees.map((_, index) => <option key={index} value={index}>Tree {index + 1}</option>)}
                </select>
              </label>
              <div className="tree-preview-rule">
                {rootNode?.splitValue !== undefined && rootFeatureIndex !== undefined ? (
                  <>
                    <strong>{featureNames[rootFeatureIndex]} &lt; {format(rootNode.splitValue)}?</strong>
                    <small>Samples: {rootNode.numberSamples ?? "—"} · Gini gain: {format(rootNode.gain ?? 0)}</small>
                  </>
                ) : <strong>This tree predicts from its root leaf.</strong>}
              </div>
              <button className="full-tree-button" type="button" onClick={() => setView("trees")}>View Full Tree →</button>
            </section>

            <section
              className="dashboard-card prediction-card"
              aria-labelledby="prediction-details-title"
            >
              <div className="dashboard-card-heading">
                <div>
                  <h3 id="prediction-details-title">Make a Prediction</h3>
                  <p>Use input features or a row from this dataset</p>
                </div>
              </div>
              <div className="prediction-mode-switch" role="tablist" aria-label="Prediction input mode">
                <button
                  type="button"
                  role="tab"
                  aria-selected={inputMode === "manual"}
                  onClick={() => {
                    setManualFeatures([...flower.features]);
                    setInputMode("manual");
                  }}
                >Input Features</button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={inputMode === "dataset"}
                  onClick={() => setInputMode("dataset")}
                >Select from Dataset</button>
              </div>
              {inputMode === "manual" ? (
                <div className="manual-feature-inputs">
                  {featureNames.map((name, index) => {
                    const min = featureMinimums[index] ?? 0;
                    const max = featureMaximums[index] ?? 1;
                    const range = max - min || 1;
                    const value = manualFeatures[index] ?? flower.features[index] ?? min;
                    return (
                      <label key={name}>
                        <span>{name}<b>{format(value)}</b></span>
                        <input
                          type="range"
                          min={min}
                          max={max}
                          step={range > 1 ? range / 100 : 0.01}
                          value={value}
                          onChange={(event) => setManualFeatures((current) => {
                            const next = current.length === featureNames.length ? [...current] : [...flower.features];
                            next[index] = Number(event.target.value);
                            return next;
                          })}
                        />
                        <small>{format(min)} <i /> {format(max)}</small>
                      </label>
                    );
                  })}
                </div>
              ) : (
              <label
                className="dashboard-select-label"
                htmlFor="forest-observation-select"
              >
                OBSERVATION
                <select
                  id="forest-observation-select"
                  value={selectedId}
                  onChange={(event) => chooseFlower(Number(event.target.value))}
                >
                  {flowers.map((item) => (
                    <option key={item.id} value={item.id}>
                      Row #{String(item.id + 1).padStart(2, "0")} ·{" "}
                      {item.label} · {isTestRow(item.id) ? "test" : "train"}
                    </option>
                  ))}
                </select>
              </label>
              )}
              <div
                className={`prediction-result ${classTone(classLabels.indexOf(modelPrediction))}`}
              >
                <span>PREDICTED CLASS</span>
                <strong>{modelPrediction}</strong>
                <small>
                  {modelAgreement} of {treeCount} trees agree
                </small>
              </div>
              <div className="prediction-features">
                {featureNames.slice(0, 3).map((name, index) => (
                  <span key={name}>
                    {name} <b>{format(predictionFlower.features[index] ?? 0)}</b>
                  </span>
                ))}
                {featureNames.length > 4 && (
                  <span>+{featureNames.length - 4} more model inputs</span>
                )}
              </div>
            </section>
          </div>
          <section className="decision-explanation-card">
            <div className="dashboard-card-heading">
              <div><h3>How the Forest Decided</h3><p>Tree votes followed by the selected tree’s real decision route.</p></div>
              <span className="route-vote-summary">{modelAgreement} / {treeCount} majority votes → {modelPrediction}</span>
            </div>
            <div className="explanation-votes">
              {votes.map((vote, index) => (
                <button
                  key={index}
                  type="button"
                  className={`explanation-tree ${selectedTree === index ? "is-selected" : ""} ${classTone(classLabels.indexOf(vote))}`}
                  onClick={() => chooseTree(index)}
                  aria-pressed={selectedTree === index}
                >
                  <small>Tree {index + 1}</small><strong>{vote}</strong>
                </button>
              ))}
            </div>
            <div className="explanation-route">
              <strong>Why this prediction?</strong>
              {selectedTreePath.steps.length === 0 ? (
                <span>This tree has no split and predicts {votes[selectedTree]} from its root.</span>
              ) : selectedTreePath.steps.map((step, index) => (
                <span key={`${step.featureIndex}-${index}`}>
                  <b>{index + 1}</b> {featureNames[step.featureIndex]} = {format(step.value)} {step.passes ? "<" : "≥"} {format(step.node.splitValue ?? 0)} · {step.node.numberSamples ?? "—"} samples · Gini gain {format(step.node.gain ?? 0)} · {step.passes ? "left branch" : "right branch"}
                </span>
              ))}
            </div>
          </section>
            </>
          )}
          <TreeInspector
            forest={forest}
            treeIndex={selectedTree}
            flower={predictionFlower}
            featureNames={featureNames}
            classLabels={classLabels}
            selectedNodePath={selectedNodePath}
            setSelectedNodePath={setSelectedNodePath}
            setTreeIndex={chooseTree}
            onBack={() => setView("forest")}
            onFullTree={() => setView(view === "trees" ? "forest" : "trees")}
          />
        </section>
      )}

      {view === "prediction" && (
        <section
          id="prediction-view"
          className="model-view"
          role="tabpanel"
          aria-label="Prediction explorer"
        >
          <div className="view-heading prediction-heading">
            <div>
              <p className="eyebrow">02 / OBSERVATION</p>
              <h2>Inspect one observation</h2>
            </div>
            <label className="observation-picker" htmlFor="observation-select">
              SELECT OBSERVATION
              <select
                id="observation-select"
                value={selectedId}
                onChange={(event) => chooseFlower(Number(event.target.value))}
              >
                {flowers.map((item) => (
                  <option key={item.id} value={item.id}>
                    Row #{String(item.id + 1).padStart(2, "0")} ·{" "}
                    {item.label} · {isTestRow(item.id) ? "test" : "train"}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="prediction-grid">
            <section
              className="sample-detail"
              aria-label={`Row ${flower.id + 1} feature values`}
            >
              <div className="sample-detail-heading">
                <div>
                  <span className="section-label">CURRENT EXAMPLE</span>
                  <h3>Row #{String(flower.id + 1).padStart(2, "0")}</h3>
                </div>
                <span
                  className={`split-badge ${isTestRow(flower.id) ? "is-test" : ""}`}
                >
                  {isTestRow(flower.id) ? "TEST ROW" : "TRAIN ROW"}
                </span>
              </div>
              <div className="feature-table">
                <div>
                  <span>FEATURE</span>
                  <span>VALUE</span>
                </div>
                {featureNames.slice(0, 8).map((name, index) => (
                  <div key={name}>
                    <strong>{name}</strong>
                    <span>{format(flower.features[index] ?? 0)}</span>
                  </div>
                ))}
                <div>
                  <strong>{dataset.targetName} · observed</strong>
                  <span>{flower.label}</span>
                </div>
              </div>
              <p className="sample-note">
                Values shown are the encoded model inputs for this observation.
              </p>
              <div className="prediction-chart">
                <div className="chart-title">
                  <span>{featureNames[0]}{featureNames[1] ? ` × ${featureNames[1]}` : ""}</span>
                  <span>TRAIN / TEST</span>
                </div>
                <svg
                  className="chart"
                  viewBox="0 0 620 340"
                  role="img"
                  aria-label={`Observations plotted by ${featureNames[0]} and ${featureNames[1] ?? "the first feature only"}. Held-out test rows have outlined markers.`}
                >
                  <defs>
                    <pattern
                      id="plot-grid"
                      width="30"
                      height="30"
                      patternUnits="userSpaceOnUse"
                    >
                      <path
                        d="M 30 0 L 0 0 0 30"
                        fill="none"
                        stroke="rgba(29,43,69,0.08)"
                        strokeWidth="1"
                      />
                    </pattern>
                  </defs>
                  <rect
                    x="56"
                    y="16"
                    width="536"
                    height="276"
                    fill="url(#plot-grid)"
                  />
                  {decisionRegions.map((cell) => (
                    <rect
                      key={`${cell.column}-${cell.row}`}
                      x={56 + (cell.column / 18) * 536}
                      y={16 + (cell.row / 12) * 276}
                      width={536 / 18 + 1}
                      height={276 / 12 + 1}
                      className={`decision-cell ${shapeTone(classLabels.indexOf(cell.prediction), "flower")}`}
                    />
                  ))}
                  <rect
                    x="56"
                    y="16"
                    width="536"
                    height="276"
                    fill="url(#plot-grid)"
                  />
                  <line
                    x1="56"
                    y1="292"
                    x2="592"
                    y2="292"
                    className="axis-line"
                  />
                  <line
                    x1="56"
                    y1="16"
                    x2="56"
                    y2="292"
                    className="axis-line"
                  />
                  {Array.from({ length: 7 }, (_, index) => index).map((tick) => (
                    <g key={tick} className="tick-label">
                      <line
                        x1={56 + (tick / 6) * 536}
                        y1="292"
                        x2={56 + (tick / 6) * 536}
                        y2="297"
                        className="axis-line"
                      />
                      <text
                        x={56 + (tick / 6) * 536}
                        y="312"
                        textAnchor="middle"
                      >
                        {format(xMin + (tick / 6) * xRange)}
                      </text>
                    </g>
                  ))}
                  {Array.from({ length: 5 }, (_, index) => index).map((tick) => (
                    <g key={tick} className="tick-label">
                      <text
                        x="44"
                        y={292 - (tick / 4) * 276 + 4}
                        textAnchor="end"
                      >
                        {featureNames.length > 1
                          ? format(yMin + (tick / 4) * yRange)
                          : ""}
                      </text>
                    </g>
                  ))}
                  {flowers.map((item) => {
                    const cx =
                      56 + (((item.features[0] ?? xMin) - xMin) / xRange) * 536;
                    const cy =
                      featureNames.length > 1
                        ? 292 -
                          (((item.features[1] ?? yMin) - yMin) / yRange) * 276
                        : 154;
                    const isSelected = item.id === flower.id;
                    const isTest = isTestRow(item.id);
                    return (
                      <g
                        key={item.id}
                        className={`flower-point ${shapeTone(classLabels.indexOf(item.label), "point")} ${isTest ? "is-test" : ""}`}
                        onClick={() => chooseFlower(item.id)}
                        role="button"
                        tabIndex={0}
                        aria-label={`Select row ${item.id + 1}, ${item.label}, ${featureNames[0]} ${format(item.features[0] ?? 0)}${featureNames[1] ? `, ${featureNames[1]} ${format(item.features[1] ?? 0)}` : ""}, ${isTest ? "test" : "training"} row`}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            chooseFlower(item.id);
                          }
                        }}
                      >
                        {isSelected && (
                          <circle
                            cx={cx}
                            cy={cy}
                            r="11"
                            className="selection-ring"
                          />
                        )}
                        {classLabels.indexOf(item.label) === 0 ? (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={isSelected ? 6 : 4.5}
                            className="point-core"
                          />
                        ) : (
                          <rect
                            x={cx - 4}
                            y={cy - 4}
                            width={isSelected ? 12 : 9}
                            height={isSelected ? 12 : 9}
                            transform={`rotate(45 ${cx} ${cy})`}
                            className="point-core"
                          />
                        )}
                      </g>
                    );
                  })}
                  <text
                    x="324"
                    y="336"
                    className="axis-title"
                    textAnchor="middle"
                  >
                    {featureNames[0]?.toUpperCase()}
                  </text>
                  <text
                    x="13"
                    y="154"
                    className="axis-title y-axis-title"
                    textAnchor="middle"
                    transform="rotate(-90 13 154)"
                  >
                    {featureNames[1]?.toUpperCase() ?? "SINGLE FEATURE"}
                  </text>
                </svg>
                <div className="chart-legend">
                  <span>
                    <i className={shapeTone(0, "shape")} /> {classLabels[0]}
                  </span>
                  {classLabels.slice(1).map((label) => (
                    <span key={label}>
                      <i className={shapeTone(classLabels.indexOf(label), "shape")} /> {label}
                    </span>
                  ))}
                  <span>
                    <i className="split-badge is-test">T</i> Held-out test
                  </span>
                </div>
              </div>
            </section>
            <section
              className="prediction-outcomes"
              aria-label="Per-tree predictions"
            >
              <VoteDistribution votes={votes} classLabels={classLabels} />
              <p className="section-label outcome-label">
                TREE-BY-TREE OUTPUTS{" "}
                <span>Select a tree to inspect its route</span>
              </p>
              <div className="outcome-list">
                {votes.map((vote, index) => (
                  <button
                    key={index}
                    type="button"
                    className={`outcome-row ${selectedTree === index ? "is-selected" : ""}`}
                    aria-pressed={selectedTree === index}
                    onClick={() => chooseTree(index)}
                  >
                    <span>T{String(index + 1).padStart(2, "0")}</span>
                    <span
                      className={
                        classTone(classLabels.indexOf(vote))
                      }
                    >
                      {classLabels.indexOf(vote) === 0 ? "●" : "◆"} {vote}
                    </span>
                    <span>
                      {selectedTree === index ? "ROUTE OPEN" : "Inspect →"}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </div>
          <TreeInspector
            forest={forest}
            treeIndex={selectedTree}
            flower={flower}
            featureNames={featureNames}
            classLabels={classLabels}
            selectedNodePath={selectedNodePath}
            setSelectedNodePath={setSelectedNodePath}
            setTreeIndex={chooseTree}
            onBack={() => setView("forest")}
          />
        </section>
      )}

      {(view === "quality" || view === "importance") && (
        <section
          id={`${view}-view`}
          className="model-view quality-view"
          role="tabpanel"
          aria-label={view === "quality" ? "Model quality" : "Feature importance"}
        >
          <div className="view-heading">
            <div>
              <p className="eyebrow">{view === "quality" ? "MODEL EVALUATION" : "MODEL EXPLANATION"}</p>
              <h2>{view === "quality" ? "How did it do on unseen rows?" : "Feature importance"}</h2>
            </div>
            <span className="split-badge is-test">
              {dataset.name.toUpperCase()} · TEST {evaluation.sampleCount} /{" "}
              {flowers.length}
            </span>
          </div>
          {view === "quality" && <p className="evaluation-context">
            These {evaluation.sampleCount} rows were excluded from training.
            Metrics below describe this held-out test split only.
          </p>}
          {view === "quality" && <div className="metric-strip">
            <div>
              <span>TEST ACCURACY</span>
              <strong>{Math.round(evaluation.accuracy * 100)}%</strong>
              <small>
                Correct predictions / {evaluation.sampleCount} test rows
              </small>
            </div>
            <div>
              <span>MACRO PRECISION</span>
              <strong>{Math.round(evaluation.macroPrecision * 100)}%</strong>
              <small>Average across {classLabels.length} classes</small>
            </div>
            <div>
              <span>MACRO RECALL</span>
              <strong>{Math.round(evaluation.macroRecall * 100)}%</strong>
              <small>Average across {classLabels.length} classes</small>
            </div>
            <div>
              <span>MACRO F1</span>
              <strong>{Math.round(evaluation.macroF1 * 100)}%</strong>
              <small>Equal weight per class</small>
            </div>
            <div>
              <span>WEIGHTED F1</span>
              <strong>{Math.round(evaluation.weightedF1 * 100)}%</strong>
              <small>Weighted by class support</small>
            </div>
          </div>}
          {view === "quality" && evaluation.sampleCount < 10 && (
            <p className="small-test-warning" role="status">
              The held-out test set contains only {evaluation.sampleCount} rows; performance estimates may be unstable.
            </p>
          )}
          <div className={`quality-grid ${view === "importance" ? "quality-grid--importance-only" : ""}`}>
            {view === "quality" && (
            <section
              className="quality-section"
              aria-labelledby="confusion-title"
            >
              <p className="eyebrow">
                TEST SET · {evaluation.sampleCount} ROWS
              </p>
              <h3 id="confusion-title">Confusion matrix</h3>
              <p className="quality-subtitle">
                Rows are the observed class. Columns are the model prediction.
              </p>
              <table className="confusion-table">
                <thead>
                  <tr>
                    <th scope="col">OBSERVED ↓ / PREDICTED →</th>
                    {classLabels.map((label) => (
                      <th scope="col" key={label}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {classLabels.map((label, row) => (
                    <tr key={label}>
                      <th scope="row">{label}</th>
                      {classLabels.map((_, column) => (
                        <td
                          key={column}
                          className={
                            row === column ? "correct-cell" : "error-cell"
                          }
                        >
                          {evaluation.confusion[row][column]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="table-note">
                <i className="correct-key" /> Correct{" "}
                <i className="error-key" /> Incorrect
              </p>
            </section>
            )}
            <section
              className="quality-section importance-section"
              aria-labelledby="importance-title"
            >
              <p className="eyebrow">FITTED FOREST · {treeCount} TREES</p>
              <h3 id="importance-title">Feature importance</h3>
              <div className="importance-method-switch" role="group" aria-label="Feature importance method">
                <button type="button" aria-pressed={importanceMethod === "gini"} onClick={() => setImportanceMethod("gini")}>Gini Importance</button>
                <button type="button" aria-pressed={importanceMethod === "permutation"} onClick={() => setImportanceMethod("permutation")}>Permutation Importance</button>
              </div>
              <p className="quality-subtitle">
                {importanceMethod === "gini"
                  ? "Normalized decrease in Gini across the complete fitted forest."
                  : "Held-out accuracy decrease after shuffling a feature."}
              </p>
              <div className="importance-list">
                {importance.map((feature, rank) => (
                  <div className="importance-row" key={feature.name}>
                    <span className="importance-rank">0{rank + 1}</span>
                    <strong>{feature.name}</strong>
                    <div className="importance-track">
                      <span
                        style={{
                          width: `${Math.max(0, feature.value * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="importance-value">
                      {importanceMethod === "gini"
                        ? `${Math.round(feature.value * 100)}%`
                        : feature.value.toFixed(3)}
                    </span>
                  </div>
                ))}
              </div>
              <p className="importance-warning">
                {importanceMethod === "gini"
                  ? "This forest-wide split-importance measure does not imply causation; correlated features can distort it."
                  : `Permutation importance uses the ${evaluation.sampleCount} held-out test rows. It measures predictive reliance, not causation.`}
              </p>
            </section>
          </div>
        </section>
      )}

      {view === "insights" && (
        <section id="insights-view" className="model-view insights-view" role="tabpanel" aria-label="Data insights">
          <div className="view-heading">
            <div><p className="eyebrow">DATASET / VALIDATION</p><h2>Data Insights</h2></div>
            <span className="split-badge is-test">{dataset.name} · {flowers.length} rows</span>
          </div>
          <div className="insights-grid">
            <section className="quality-section">
              <h3>Dataset validation</h3>
              <p className="quality-subtitle">The original CSV is parsed separately from the cleaned model matrix.</p>
              <div className="validation-summary">
                <div><span>Source rows</span><strong>{dataset.dataQuality?.sourceRows ?? flowers.length}</strong></div>
                <div><span>Missing-value rows</span><strong>{dataset.dataQuality?.missingRows ?? 0}</strong></div>
                <div><span>Duplicate rows</span><strong>{dataset.dataQuality?.duplicateRows ?? 0}</strong></div>
                <div><span>Rows dropped</span><strong>{dataset.dataQuality?.droppedRows ?? 0}</strong></div>
                <div><span>Values imputed</span><strong>{dataset.dataQuality?.imputedValues ?? 0}</strong></div>
                <div><span>Model-ready rows</span><strong>{flowers.length}</strong></div>
              </div>
              <p className="importance-warning">Target labels are never imputed. Imputation values and categorical encodings are learned from training rows only.</p>
            </section>
            <section className="quality-section">
              <h3>Class distribution</h3>
              <p className="quality-subtitle">{dataset.targetName} · all validated rows</p>
              <div className="insight-class-list">
                {classLabels.map((label, index) => {
                  const count = evaluation.classCounts[index] ?? 0;
                  const percentage = totalClassCount ? (count / totalClassCount) * 100 : 0;
                  return <div key={label} className="insight-class-row">
                    <span className={classTone(index)}>{label}</span>
                    <div className="class-distribution-track"><i className={shapeTone(index, "bar")} style={{ width: `${percentage}%` }} /></div>
                    <b>{count} <small>{percentage.toFixed(1)}%</small></b>
                  </div>;
                })}
              </div>
            </section>
          </div>
        </section>
      )}

      <footer className="page-footer">
        <span>MODELMIND / RANDOM FOREST</span>
        <span>MODEL OUTPUTS · NOT GUARANTEES</span>
      </footer>
      {showHelp && (
        <div className="help-modal-backdrop" role="presentation" onClick={() => setShowHelp(false)}>
          <section className="help-modal" role="dialog" aria-modal="true" aria-labelledby="help-modal-title" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="help-modal-close" onClick={() => setShowHelp(false)} aria-label="Close documentation">×</button>
            <p className="eyebrow">QUICK GUIDE</p>
            <h2 id="help-modal-title">How this forest works</h2>
            <p>Each tree is fitted on a bootstrap sample of the training rows. Trees vote independently, and the most-voted class becomes the forest prediction.</p>
            <ul>
              <li>The split is stratified by target class; test rows are held out from fitting.</li>
              <li>Accuracy, macro/weighted F1, and confusion counts use held-out rows only.</li>
              <li>Gini importance summarizes split use. Permutation importance measures held-out accuracy change after shuffling.</li>
              <li>Tree vote share is not a calibrated probability, and feature importance does not establish causation.</li>
            </ul>
            <button className="train-button" type="button" onClick={() => setShowHelp(false)}>Got it</button>
          </section>
        </div>
      )}
    </main>
    </div>
  );
}

export default App;
