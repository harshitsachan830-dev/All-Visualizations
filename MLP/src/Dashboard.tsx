import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Papa from "papaparse";
import * as THREE from "three";
import {
  Activity,
  ArrowDownToLine,
  BrainCircuit,
  BookOpenText,
  Box,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  CircleHelp,
  Database,
  FileSpreadsheet,
  Gauge,
  Home,
  Layers3,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Upload,
  WandSparkles,
  X,
} from "lucide-react";
import {
  makeDataset,
  parseCsv,
  type Dataset,
  type ParsedCsv,
  type Strategy,
} from "./data";
import {
  createModel,
  evaluateModel,
  forward,
  trainEpoch,
  type ForwardResult,
  type Model,
} from "./model";
import "./Dashboard.css";

type HistoryPoint = {
  epoch: number;
  loss: number;
  accuracy: number;
  valLoss: number;
  valAccuracy: number;
};
type Sample = { name: string; file: string; detail: string };
const samples: Sample[] = [
  {
    name: "Iris flower",
    file: "iris.csv",
    detail: "Flower classification · 4 features",
  },
  {
    name: "Titanic survival",
    file: "titanic.csv",
    detail: "Passenger survival · mixed data",
  },
  {
    name: "Wine quality",
    file: "wine-quality.csv",
    detail: "Wine chemistry · 8 features",
  },
  {
    name: "Student performance",
    file: "student-performance.csv",
    detail: "Study habits · mixed data",
  },
];
const navigation = [
  { label: "Overview", icon: Home },
  { label: "Model Architecture", icon: BrainCircuit },
  { label: "Training Progress", icon: ChartNoAxesCombined },
  { label: "3D Visualization", icon: Box },
  { label: "Decision Boundary", icon: Layers3 },
  { label: "Feature Analysis", icon: Activity },
  { label: "Predictions", icon: Gauge },
  { label: "About MLP", icon: BookOpenText },
];
const initialHistory = (): HistoryPoint[] =>
  Array.from({ length: 201 }, (_, epoch) => ({
    epoch,
    loss: 0.78 * Math.exp(-epoch / 31) + 0.07 + Math.sin(epoch * 0.3) * 0.008,
    accuracy: Math.min(
      0.965,
      0.965 * (1 - Math.exp(-epoch / 24)) + Math.sin(epoch * 0.2) * 0.008,
    ),
    valLoss:
      0.92 * Math.exp(-epoch / 29) + 0.105 + Math.sin(epoch * 0.25) * 0.012,
    valAccuracy: Math.min(
      0.946,
      0.946 * (1 - Math.exp(-epoch / 27)) + Math.sin(epoch * 0.16) * 0.009,
    ),
  }));
function fitPreview(dataset: Dataset, model: Model): HistoryPoint[] {
  return Array.from({ length: 200 }, (_, index) => {
    const result = trainEpoch(model, dataset, 0.08);
    const validation = evaluateModel(model, dataset);
    return {
      epoch: index + 1,
      loss: result.loss,
      accuracy: result.accuracy,
      valLoss: validation.loss,
      valAccuracy: validation.accuracy,
    };
  });
}

function syncNetworkNodes(
  nodes: Array<{ mesh: THREE.Mesh; layer: number; index: number }>,
  activations: number[][],
) {
  for (const { mesh, layer, index } of nodes) {
    const amount = Math.max(0, Math.min(1, activations[layer]?.[index] ?? 0.5));
    mesh.scale.setScalar(0.78 + amount * 0.65);
    (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity =
      0.18 + amount * 0.42;
  }
}

function connectionWeight(model: Model, layer: number, source: number, target: number) {
  const weights = layer === 0 ? model.w1 : layer === 1 ? model.w2 : model.w3;
  return weights[target]?.[source] ?? 0;
}

function syncNetworkLinks(
  links: Array<{ line: THREE.Line; layer: number; source: number; target: number }>,
  model: Model,
  threshold: number,
) {
  const matrices = [model.w1, model.w2, model.w3];
  const largest = Math.max(0.0001, ...matrices.flat(2).map(Math.abs));
  const layerColors = ["#8f5cff", "#ee42a0", "#1dd38a"];
  for (const { line, layer, source, target } of links) {
    const weight = connectionWeight(model, layer, source, target);
    const strength = Math.abs(weight) / largest;
    const material = line.material as THREE.LineBasicMaterial;
    material.color.set(weight < 0 ? "#fb7185" : layerColors[layer]);
    material.opacity = strength < threshold ? 0.08 : 0.24 + strength * 0.56;
  }
}

function ThreeNetwork({
  dataset,
  sampleIndex,
  model,
  threshold,
  autoRotate,
  resetVersion,
}: {
  dataset: Dataset | null;
  sampleIndex: number;
  model: Model | null;
  threshold: number;
  autoRotate: boolean;
  resetVersion: number;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    group: THREE.Group;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    nodes: Array<{ mesh: THREE.Mesh; layer: number; index: number }>;
    links: Array<{ line: THREE.Line; layer: number; source: number; target: number }>;
  } | null>(null);
  const autoRotateRef = useRef(autoRotate);
  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);
  useEffect(() => {
    const active = sceneRef.current;
    if (!active) return;
    active.group.rotation.set(0, 0, 0);
    active.camera.position.set(0, 0, 15);
    active.camera.updateProjectionMatrix();
  }, [resetVersion]);
  useEffect(() => {
    if (!mountRef.current) return;
    const mount = mountRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#050505");
    const camera = new THREE.PerspectiveCamera(
      38,
      mount.clientWidth / mount.clientHeight,
      0.1,
      100,
    );
    camera.position.set(0, 0, 15);
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);
    const group = new THREE.Group();
    scene.add(group);
    const colors = ["#47b6ff", "#8f5cff", "#ee42a0", "#1dd38a"];
    const counts = [
      Math.min(dataset?.features.length ?? 4, 8),
      8,
      6,
      Math.min(dataset?.classes.length ?? 3, 5),
    ];
    const positions = counts.map((count, layer) =>
      Array.from(
        { length: count },
        (_, index) =>
          new THREE.Vector3(
            (layer - 1.5) * 3.7,
            (index - (count - 1) / 2) * Math.min(0.68, 3.8 / count),
            0,
          ),
      ),
    );
    const nodes: Array<{ mesh: THREE.Mesh; layer: number; index: number }> = [];
    const links: Array<{ line: THREE.Line; layer: number; source: number; target: number }> = [];
    const sphere = new THREE.SphereGeometry(0.14, 18, 14);
    positions.forEach((layer, layerIndex) =>
      layer.forEach((position, index) => {
        const material = new THREE.MeshStandardMaterial({
          color: colors[layerIndex],
          emissive: colors[layerIndex],
          emissiveIntensity: 0.4,
          roughness: 0.3,
        });
        const mesh = new THREE.Mesh(sphere, material);
        mesh.position.copy(position);
        group.add(mesh);
        nodes.push({ mesh, layer: layerIndex, index });
        const light = new THREE.PointLight(colors[layerIndex], 0.13, 1.2);
        light.position.copy(position);
        group.add(light);
      }),
    );
    for (let layer = 0; layer < positions.length - 1; layer += 1)
      positions[layer].forEach((from, source) =>
        positions[layer + 1].forEach((to, target) => {
          const geometry = new THREE.BufferGeometry().setFromPoints([from, to]);
          const material = new THREE.LineBasicMaterial({
            color: colors[layer + 1],
            transparent: true,
            opacity: 0.12,
          });
          const line = new THREE.Line(geometry, material);
          group.add(line);
          links.push({ line, layer, source, target });
        }),
      );
    scene.add(new THREE.AmbientLight("#b4cfff", 1.5));
    let frame = 0;
    let dragging = false;
    let downX = 0;
    let downY = 0;
    const onDown = (event: PointerEvent) => {
      dragging = true;
      downX = event.clientX;
      downY = event.clientY;
      renderer.domElement.setPointerCapture(event.pointerId);
    };
    const onMove = (event: PointerEvent) => {
      if (dragging) {
        group.rotation.y += (event.clientX - downX) * 0.006;
        group.rotation.x += (event.clientY - downY) * 0.006;
        downX = event.clientX;
        downY = event.clientY;
      }
    };
    const onUp = () => {
      dragging = false;
    };
    const onWheel = (event: WheelEvent) => {
      camera.position.z = Math.max(
        8,
        Math.min(23, camera.position.z + event.deltaY * 0.012),
      );
    };
    const resize = () => {
      if (mount.clientWidth && mount.clientHeight) {
        camera.aspect = mount.clientWidth / mount.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(mount.clientWidth, mount.clientHeight);
      }
    };
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("pointerup", onUp);
    renderer.domElement.addEventListener("pointerleave", onUp);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("resize", resize);
    const render = () => {
      frame = requestAnimationFrame(render);
      if (!dragging && autoRotateRef.current) group.rotation.y += 0.001;
      renderer.render(scene, camera);
    };
    render();
    sceneRef.current = { group, camera, renderer, nodes, links };
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [dataset]);

  useEffect(() => {
    const active = sceneRef.current;
    if (!active || !dataset?.x.length) return;
    const layers = forward(
      model ?? createModel(dataset.features.length, dataset.classes.length),
      dataset.x[Math.min(sampleIndex, dataset.x.length - 1)],
    ).layers;
    syncNetworkNodes(active.nodes, layers);
    if (model) syncNetworkLinks(active.links, model, threshold);
  }, [dataset, model, sampleIndex, threshold]);

  return (
    <div
      className="three-stage"
      ref={mountRef}
      aria-label="Interactive 3D neural network"
    >
      <div className="stage-labels">
        <span>INPUT</span>
        <span>HIDDEN LAYERS</span>
        <span>OUTPUT</span>
      </div>
      <span className="stage-hint">Drag to rotate · Scroll to zoom</span>
      <button
        className="stage-reset icon-button"
        title="Reset view"
        onClick={() => {
          if (sceneRef.current) {
            sceneRef.current.group.rotation.set(0, 0, 0);
            sceneRef.current.camera.position.set(0, 0, 15);
            sceneRef.current.camera.updateProjectionMatrix();
          }
        }}
      >
        <RotateCcw size={13} />
      </button>
    </div>
  );
}

function LineChart({
  history,
  epoch,
  metric,
}: {
  history: HistoryPoint[];
  epoch: number;
  metric: "loss" | "accuracy";
}) {
  const width = 390;
  const height = metric === "loss" ? 120 : 95;
  const left = 39;
  const right = 9;
  const top = 8;
  const bottom = 22;
  const points = history.slice(0, Math.max(epoch + 1, 2));
  const max =
    metric === "loss"
      ? Math.max(...points.map((point) => point.valLoss), 0.2) * 1.06
      : 1;
  const key = metric === "loss" ? "loss" : "accuracy";
  const validationKey = metric === "loss" ? "valLoss" : "valAccuracy";
  const path = (field: keyof HistoryPoint) =>
    points
      .map(
        (point, index) =>
          `${left + (index / Math.max(1, points.length - 1)) * (width - left - right)},${top + (1 - Number(point[field]) / max) * (height - top - bottom)}`,
      )
      .join(" ");
  const cursor = left + (epoch / 200) * (width - left - right);
  return (
    <svg
      className="chart-svg"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${metric} by epoch`}
    >
      {[0, 1, 2, 3].map((line) => (
        <g key={line}>
          <line
            x1={left}
            x2={width - right}
            y1={top + (line * (height - top - bottom)) / 3}
            y2={top + (line * (height - top - bottom)) / 3}
            className="grid-line"
          />
          <text
            x={left - 7}
            y={top + (line * (height - top - bottom)) / 3 + 3}
            textAnchor="end"
            className="axis-label"
          >
            {metric === "loss"
              ? (max * (1 - line / 3)).toFixed(1)
              : (1 - line / 3).toFixed(1)}
          </text>
        </g>
      ))}
      <line
        x1={cursor}
        x2={cursor}
        y1={top}
        y2={height - bottom}
        className="epoch-cursor"
      />
      <polyline points={path(key)} className="chart-line train-line" />
      <polyline
        points={path(validationKey)}
        className="chart-line validation-line"
      />
      {[0, 50, 100, 150, 200].map((tick) => (
        <text
          key={tick}
          x={left + (tick / 200) * (width - left - right)}
          y={height - 4}
          textAnchor="middle"
          className="axis-label"
        >
          {tick}
        </text>
      ))}
    </svg>
  );
}

function MetricCard({
  icon,
  color,
  label,
  value,
  values,
}: {
  icon: ReactNode;
  color: string;
  label: string;
  value: string;
  values: number[];
}) {
  const points = values.filter(
    (_, index) => index % Math.max(1, Math.floor(values.length / 16)) === 0,
  );
  const min = Math.min(...points);
  const max = Math.max(...points, min + 0.001);
  const coords = points
    .map(
      (point, index) =>
        `${(index / Math.max(1, points.length - 1)) * 68},${25 - ((point - min) / (max - min)) * 22}`,
    )
    .join(" ");
  return (
    <article className="metric-card">
      <span className={`metric-icon ${color}`}>{icon}</span>
      <div className="metric-copy">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <svg className="metric-spark" viewBox="0 0 70 28" aria-hidden="true">
        <polyline points={coords} />
      </svg>
    </article>
  );
}

function NetworkSvg({
  dataset,
  current,
  model,
  threshold,
}: {
  dataset: Dataset | null;
  current: ForwardResult | null;
  model: Model | null;
  threshold: number;
}) {
  const labels = dataset?.features.slice(0, 8) ?? [
    "Feature one",
    "Feature two",
    "Feature three",
  ];
  const classes = dataset?.classes ?? ["Class A", "Class B", "Class C"];
  const sizes = [labels.length, 8, 6, classes.length];
  const xs = [52, 218, 395, 550];
  const colors = ["#37aaf7", "#8c55ed", "#e949a3", "#21d18c"];
  const largestWeight = model
    ? Math.max(0.0001, ...[...model.w1.flat(), ...model.w2.flat(), ...model.w3.flat()].map(Math.abs))
    : 1;
  const y = (count: number, index: number) =>
    149 + (index - (count - 1) / 2) * Math.min(34, 194 / count);
  return (
    <svg
      className="network-svg"
      viewBox="0 0 600 300"
      aria-label="Neural network architecture"
    >
      {sizes
        .slice(0, -1)
        .flatMap((count, layer) =>
          Array.from({ length: count }, (_, from) =>
            Array.from({ length: sizes[layer + 1] }, (_, to) => {
              const weight = model ? connectionWeight(model, layer, from, to) : 0;
              const strength = Math.abs(weight) / largestWeight;
              return (
                <line
                  key={`${layer}-${from}-${to}`}
                  x1={xs[layer] + 10}
                  y1={y(count, from)}
                  x2={xs[layer + 1] - 10}
                  y2={y(sizes[layer + 1], to)}
                  stroke={weight < 0 ? "#fb7185" : colors[layer + 1]}
                  strokeWidth={0.4 + strength * 1.4}
                  strokeOpacity={
                    strength < threshold ? 0.025 : 0.1 + strength * 0.3
                  }
                >
                  <title>{`Layer ${layer + 1}, neuron ${from + 1} to neuron ${to + 1}, signed weight ${weight.toFixed(3)}`}</title>
                </line>
              );
            }),
          ),
        )
        .flat()}
      {sizes.map((count, layer) =>
        Array.from({ length: count }, (_, index) => {
          const activation = Math.max(
            0,
            Math.min(1, current?.layers[layer]?.[index] ?? 0.5),
          );
          const label =
            layer === 0
              ? labels[index]
              : layer === 3
                ? classes[index]
                : `N${index + 1}`;
                  const weightedSum = layer === 1 ? current?.z1[index] : layer === 2 ? current?.z2[index] : undefined;
                  const bias = layer === 1 ? model?.b1[index] : layer === 2 ? model?.b2[index] : layer === 3 ? model?.b3[index] : undefined;
          return (
            <g className="network-node" key={`${layer}-${index}`}>
              <circle
                cx={xs[layer]}
                cy={y(count, index)}
                r={8 + activation * 3}
                fill={colors[layer]}
                fillOpacity={0.2 + activation * 0.4}
                stroke={colors[layer]}
                strokeWidth="1.5"
              >
                <title>{`${label} · weighted sum ${weightedSum?.toFixed(3) ?? "n/a"} · bias ${bias?.toFixed(3) ?? "n/a"} · activation ${activation.toFixed(3)} · ${layer === 3 ? "softmax" : "ReLU"}`}</title>
              </circle>
              <circle
                cx={xs[layer]}
                cy={y(count, index)}
                r="3.5"
                fill={colors[layer]}
              />
              {(layer === 0 || layer === 3) && (
                <text
                  x={layer === 0 ? xs[layer] - 15 : xs[layer] + 15}
                  y={y(count, index) + 3}
                  textAnchor={layer === 0 ? "end" : "start"}
                  className="network-label"
                >
                  {label.length > 12 ? `${label.slice(0, 11)}…` : label}
                </text>
              )}
            </g>
          );
        }),
      )}
      {["INPUT", "HIDDEN 1", "HIDDEN 2", "OUTPUT"].map((label, index) => (
        <text
          key={label}
          x={xs[index]}
          y="22"
          textAnchor="middle"
          className="layer-label"
        >
          {label}
        </text>
      ))}
    </svg>
  );
}

function DecisionPlot({
  dataset,
  model,
  sampleIndex,
  onSelect,
}: {
  dataset: Dataset | null;
  model: Model | null;
  sampleIndex: number;
  onSelect: (index: number) => void;
}) {
  const points = (dataset?.x ?? []).slice(0, 250);
  const valuesX = (dataset?.x ?? []).map((row) => row[0] ?? 0);
  const valuesY = (dataset?.x ?? []).map((row) => row[1] ?? 0);
  const minX = Math.min(-2, ...valuesX);
  const maxX = Math.max(2, ...valuesX);
  const minY = Math.min(-2, ...valuesY);
  const maxY = Math.max(2, ...valuesY);
  const plot = { left: 42, top: 20, width: 258, height: 114 };
  const cellWidth = plot.width / 16;
  const cellHeight = plot.height / 8;
  const regions = useMemo(() => {
    if (!dataset || !model || !dataset.x.length) return [];
    const base = [...dataset.x[Math.min(sampleIndex, dataset.x.length - 1)]];
    return Array.from({ length: 8 }, (_, row) =>
      Array.from({ length: 16 }, (_, column) => {
        const input = [...base];
        input[0] = minX + ((column + 0.5) / 16) * (maxX - minX);
        input[1] = maxY - ((row + 0.5) / 8) * (maxY - minY);
        const probabilities = forward(model, input).layers[3];
        return probabilities.indexOf(Math.max(...probabilities));
      }),
    );
  }, [dataset, model, sampleIndex, minX, maxX, minY, maxY]);
  const classColors = ["#48a5ff", "#ee4c96", "#23d18b", "#f3c04c", "#9a75ee"];
  return (
    <svg
      className="decision-svg"
      viewBox="0 0 330 170"
      role="img"
      aria-label="Feature decision boundary"
    >
      {regions.map((row, rowIndex) => row.map((classIndex, columnIndex) => (
        <rect key={`${rowIndex}-${columnIndex}`} x={plot.left + columnIndex * cellWidth} y={plot.top + rowIndex * cellHeight} width={cellWidth + 0.3} height={cellHeight + 0.3} fill={classColors[classIndex % classColors.length]} opacity=".13" />
      )))}
      <path d="M42 20 L300 20 L300 134 L42 134 Z" fill="none" stroke="#31506d" strokeWidth=".7" />
      {[0, 1, 2, 3].map((line) => (
        <g key={line}>
          <path
            d={`M${42 + line * 7} ${20 + line * 3} L${36 + line * 7} 134`}
            stroke="#263d56"
            strokeWidth=".6"
          />
          <path
            d={`M42 ${20 + line * 37} L300 ${30 + line * 34}`}
            stroke="#263d56"
            strokeWidth=".6"
          />
        </g>
      ))}
      {points.map((row, index) => {
        const px = plot.left + (((row[0] ?? 0) - minX) / (maxX - minX)) * plot.width;
        const py = plot.top + (1 - ((row[1] ?? 0) - minY) / (maxY - minY)) * plot.height;
        const color = classColors[(dataset?.y[index] ?? 0) % classColors.length];
        return (
          <circle
            key={index}
            cx={px}
            cy={py}
            r={index === sampleIndex ? 4 : 2.3}
            fill={color}
            opacity={index === sampleIndex ? 1 : 0.6}
            stroke={index === sampleIndex ? "#fff" : "none"}
            strokeWidth="1.4"
            onClick={() => onSelect(index)}
            style={{ cursor: "pointer" }}
          />
        );
      })}
      <path
        d="M25 148 L307 148 M31 154 L31 18"
        stroke="#60738a"
        strokeWidth=".9"
      />
      <text x="165" y="166" className="plot-label" textAnchor="middle">
        {dataset?.features[0] ?? "Feature 1"}
      </text>
      <text
        x="12"
        y="85"
        className="plot-label"
        transform="rotate(-90 12 85)"
        textAnchor="middle"
      >
        {dataset?.features[1] ?? "Feature 2"}
      </text>
    </svg>
  );
}

function ActivationHeatmap({
  current,
  sampleIndex,
  selectedLayer,
  dataset,
  model,
}: {
  current: ForwardResult | null;
  sampleIndex: number;
  selectedLayer: string;
  dataset: Dataset | null;
  model: Model | null;
}) {
  const layerIndex =
    selectedLayer === "Layer 2" ? 2 : selectedLayer === "Output" ? 3 : 1;
  const startSample = Math.max(
    0,
    Math.min(sampleIndex - 10, (dataset?.x.length ?? 1) - 22),
  );
  const sampleCount = Math.min(22, dataset?.x.length ?? 1);
  const sampleActivations = Array.from({ length: sampleCount }, (_, column) => {
    const index = startSample + column;
    const result =
      dataset && model
        ? forward(model, dataset.x[index])
        : current;
    return {
      index,
      activations: result?.layers[layerIndex] ?? [],
    };
  });
  const layer =
    sampleActivations.find(({ index }) => index === sampleIndex)?.activations ??
    current?.layers[layerIndex] ??
    Array(layerIndex === 3 ? 3 : 8).fill(0.5);
  return (
    <div className="heatmap-wrap">
      <div
        className="heatmap-labels"
        style={{ gridTemplateRows: `repeat(${layer.length},1fr)` }}
      >
        {layer.map((_, index) => (
          <span key={index}>
            L{layerIndex}-N{index + 1}
          </span>
        ))}
      </div>
      <div
        className="heatmap-grid"
        style={{ gridTemplateColumns: `repeat(${sampleActivations.length},1fr)` }}
      >
        {sampleActivations.map(({ index, activations }) => (
          <div
            className="heatmap-column"
            key={index}
            style={{ gridTemplateRows: `repeat(${layer.length},1fr)` }}
          >
            {layer.map((_, row) => {
              const value = Math.max(0, Math.min(1, activations[row] ?? 0));
              return (
                <i
                  key={row}
                  title={`Neuron ${row + 1}, sample ${index + 1}: activation ${value.toFixed(3)}`}
                  style={{
                    background:
                      value < 0.5
                        ? `rgba(66,146,241,${0.12 + (0.5 - value) * 0.5})`
                        : `rgba(245,86,133,${0.12 + (value - 0.5) * 1.4})`,
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [activeNav, setActiveNav] = useState("Overview");
  const [viewMode, setViewMode] = useState<
    "3D Interactive" | "2D Network" | "Feature Space"
  >("3D Interactive");
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [datasetName, setDatasetName] = useState("Iris flower");
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [strategies, setStrategies] = useState<Record<string, Strategy>>({});
  const [target, setTarget] = useState("");
  const [uploadName, setUploadName] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [model, setModel] = useState<Model | null>(null);
  const modelRef = useRef<Model | null>(null);
  const trainingEpochRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const [history, setHistory] = useState(initialHistory);
  const [epoch, setEpoch] = useState(200);
  const [training, setTraining] = useState(false);
  const [hasTrainingRun, setHasTrainingRun] = useState(false);
  const [learningRate, setLearningRate] = useState(0.08);
  const [speed, setSpeed] = useState(1);
  const [sampleIndex, setSampleIndex] = useState(0);
  const [activationLayer, setActivationLayer] = useState("Layer 1");
  const [threshold, setThreshold] = useState(0.18);
  const [autoRotate, setAutoRotate] = useState(true);
  const [resetVersion, setResetVersion] = useState(0);
  const [selectedFeature, setSelectedFeature] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const current = useMemo(
    () =>
      dataset && model
        ? forward(model, dataset.x[Math.min(sampleIndex, dataset.x.length - 1)])
        : null,
    [dataset, model, sampleIndex],
  );
  const metric =
    history[Math.min(epoch, history.length - 1)] ?? history[history.length - 1];
  const predictionIndex = current
    ? current.layers[3].indexOf(Math.max(...current.layers[3]))
    : 0;

  useEffect(() => {
    void loadSample(samples[0]);
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
    };
  }, []);

  async function loadSample(sample: Sample) {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
    setTraining(false);
    setDatasetName(sample.name);
    const response = await fetch(`/samples/${sample.file}`);
    const nextParsed = parseCsv(await response.text());
    const nextTarget = nextParsed.headers[nextParsed.headers.length - 1];
    const nextStrategies = Object.fromEntries(
      nextParsed.columns.map((column) => [
        column.name,
        column.numeric ? "median" : "mode",
      ]),
    ) as Record<string, Strategy>;
    const nextDataset = makeDataset(nextParsed, nextTarget, nextStrategies);
    const nextModel = createModel(
      nextDataset.features.length,
      nextDataset.classes.length,
    );
    setParsed(nextParsed);
    setTarget(nextTarget);
    setStrategies(nextStrategies);
    setDataset(nextDataset);
    setModel(nextModel);
    modelRef.current = nextModel;
    setSampleIndex(0);
    setSelectedFeature(0);
    trainingEpochRef.current = 0;
    setHasTrainingRun(false);
    setEpoch(200);
    setHistory(fitPreview(nextDataset, nextModel));
  }

  function startTraining() {
    if (!dataset || training) return;
    const restarting = !hasTrainingRun || trainingEpochRef.current >= 200;
    if (restarting) {
      const nextModel = createModel(
        dataset.features.length,
        dataset.classes.length,
      );
      modelRef.current = nextModel;
      setModel({ ...nextModel });
      const initialTrain = evaluateModel(nextModel, dataset, "training");
      const initialValidation = evaluateModel(nextModel, dataset);
      setHistory([
        {
          epoch: 0,
          loss: initialTrain.loss,
          accuracy: initialTrain.accuracy,
          valLoss: initialValidation.loss,
          valAccuracy: initialValidation.accuracy,
        },
      ]);
      setEpoch(0);
      trainingEpochRef.current = 0;
      setHasTrainingRun(true);
    }
    setTraining(true);
    let currentEpoch = restarting ? 0 : trainingEpochRef.current;
    timerRef.current = window.setInterval(
      () => {
        const activeModel = modelRef.current;
        if (!activeModel) return;
        const result = trainEpoch(activeModel, dataset, learningRate);
        const validation = evaluateModel(activeModel, dataset);
        currentEpoch += 1;
        trainingEpochRef.current = currentEpoch;
        setModel({
          ...activeModel,
          w1: activeModel.w1.map((row) => [...row]),
          w2: activeModel.w2.map((row) => [...row]),
          w3: activeModel.w3.map((row) => [...row]),
        });
        setHistory((previous) => [
          ...previous,
          {
            epoch: currentEpoch,
            loss: result.loss,
            accuracy: result.accuracy,
            valLoss: validation.loss,
            valAccuracy: validation.accuracy,
          },
        ]);
        setEpoch(currentEpoch);
        if (currentEpoch >= 200) {
          if (timerRef.current !== null) window.clearInterval(timerRef.current);
          timerRef.current = null;
          setTraining(false);
        }
      },
      Math.max(8, 36 / speed),
    );
  }

  function pauseTraining() {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
    setTraining(false);
  }

  function openUpload(file: File) {
    setUploadName(file.name);
    setUploadError("");
    void file
      .text()
      .then((text) => {
        const nextParsed = parseCsv(text);
        setParsed(nextParsed);
        setTarget(nextParsed.headers[nextParsed.headers.length - 1] ?? "");
        setStrategies(
          Object.fromEntries(
            nextParsed.columns.map((column) => [
              column.name,
              column.numeric ? "median" : "mode",
            ]),
          ) as Record<string, Strategy>,
        );
        if (nextParsed.headers.length < 2 || nextParsed.rows.length < 2)
          setUploadError(
            "This file needs a header row, at least one feature, and two data rows.",
          );
        setUploadOpen(true);
      })
      .catch(() => {
        setUploadError("The file could not be read. Try a UTF-8 encoded CSV.");
        setUploadOpen(true);
      });
  }

  function applyCsv() {
    if (!parsed) return;
    try {
      const nextDataset = makeDataset(parsed, target, strategies);
      const nextModel = createModel(
        nextDataset.features.length,
        nextDataset.classes.length,
      );
      pauseTraining();
      setDataset(nextDataset);
      setModel(nextModel);
      modelRef.current = nextModel;
      setDatasetName(uploadName.replace(/\.csv$/i, "") || "Uploaded CSV");
      setSampleIndex(0);
      setSelectedFeature(0);
      trainingEpochRef.current = 0;
      setHasTrainingRun(false);
      setEpoch(200);
      setHistory(fitPreview(nextDataset, nextModel));
      setUploadOpen(false);
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Unable to prepare this CSV.",
      );
    }
  }

  function exportCleanCsv() {
    if (!dataset) return;
    const objectUrl = URL.createObjectURL(
      new Blob(
        [
          Papa.unparse({
            fields: [...dataset.features, dataset.target],
            data: dataset.rows,
          }),
        ],
        { type: "text/csv" },
      ),
    );
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `${datasetName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-clean.csv`;
    document.body.appendChild(link);
    link.click();
    window.setTimeout(() => {
      link.remove();
      URL.revokeObjectURL(objectUrl);
    }, 1000);
  }

  function navigate(label: string) {
    setActiveNav(label);
    const targets: Record<string, string> = {
      Overview: "overview",
      "Model Architecture": "network-architecture",
      "Training Progress": "training-progress",
      "3D Visualization": "network-architecture",
      "Decision Boundary": "decision-boundary",
      "Feature Analysis": "feature-analysis",
      Predictions: "prediction-summary",
      "About MLP": "about-mlp",
    };
    if (label === "3D Visualization") setViewMode("3D Interactive");
    if (label === "Model Architecture") setViewMode("2D Network");
    if (label !== "Overview" && label !== "About MLP")
      document
        .getElementById(targets[label])
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const missingCount =
    parsed?.columns.reduce((sum, column) => sum + column.missing, 0) ?? 0;
  const chosenSample =
    samples.find((sample) => sample.name === datasetName)?.name ??
    "__uploaded__";

  return (
    <div className={`app-shell ${activeNav === "About MLP" ? "about-open" : ""}`}>
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <BrainCircuit size={24} />
          </span>
          <span>MLP Visualizer</span>
        </div>
        <nav className="side-nav" aria-label="Main navigation">
          {navigation.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`nav-item ${activeNav === label ? "active" : ""}`}
              aria-current={activeNav === label ? "page" : undefined}
              aria-label={label}
              title={label}
              onClick={() => navigate(label)}
            >
              <Icon size={17} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <button
          className="nav-item sidebar-upload"
          aria-label="Upload CSV"
          title="Upload a CSV"
          onClick={() => fileInput.current?.click()}
        >
          <Upload size={17} />
          <span>Upload CSV</span>
        </button>
        <div className="sidebar-bottom">
          <div className="sidebar-foot">
            <i className="online-dot" /> MODEL READY <span>v1.0</span>
          </div>
        </div>
      </aside>
      <main className="main-content" id="overview">
        <header className="topbar">
          <div className="page-heading">
            <span className="eyebrow">INTERACTIVE LEARNING STUDIO</span>
            <h1>
              Multi-Layer Perceptron <span>(MLP)</span>
            </h1>
            <p>Explore how a neural network learns, one signal at a time.</p>
          </div>
          <div className="top-controls">
            <label className="select-control">
              <span>Dataset</span>
              <select
                value={chosenSample}
                onChange={(event) => {
                  const sample = samples.find(
                    (item) => item.name === event.target.value,
                  );
                  if (sample) void loadSample(sample);
                  else setUploadOpen(true);
                }}
              >
                {samples.map((sample) => (
                  <option key={sample.name}>{sample.name}</option>
                ))}
                <option value="__uploaded__">Uploaded CSV</option>
              </select>
              <ChevronDown size={14} />
            </label>
            <label className="select-control view-control">
              <span>View mode</span>
              <select
                value={viewMode}
                onChange={(event) =>
                  setViewMode(event.target.value as typeof viewMode)
                }
              >
                <option>3D Interactive</option>
                <option>2D Network</option>
                <option>Feature Space</option>
              </select>
              <ChevronDown size={14} />
            </label>
            <button
              className="train-button"
              onClick={training ? pauseTraining : startTraining}
            >
              {training ? (
                <Pause size={15} fill="currentColor" />
              ) : (
                <Play size={15} fill="currentColor" />
              )}
              <span>
                {training
                  ? "Pause"
                  : hasTrainingRun && trainingEpochRef.current < 200
                    ? "Resume training"
                    : "Re-train"}
              </span>
            </button>
            <input
              ref={fileInput}
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) openUpload(file);
                event.target.value = "";
              }}
            />
          </div>
        </header>
        <section className="metric-grid" aria-label="Model summary">
          <MetricCard
            icon={<Sparkles size={19} />}
            color="mint"
            label="Accuracy"
            value={`${((metric?.accuracy ?? 0) * 100).toFixed(1)}%`}
            values={history.map((point) => point.accuracy)}
          />
          <MetricCard
            icon={<Activity size={19} />}
            color="violet"
            label="Loss (final)"
            value={metric?.loss.toFixed(2) ?? "0.08"}
            values={history.map((point) => point.loss)}
          />
          <MetricCard
            icon={<Database size={19} />}
            color="blue"
            label="Epochs"
            value={`${epoch}`}
            values={history.map((point) => point.epoch / 200)}
          />
          <MetricCard
            icon={<Gauge size={19} />}
            color="rose"
            label="Training time"
            value={training ? "running" : "3.2s"}
            values={history.map((point) => point.accuracy)}
          />
        </section>
        <section className="main-grid">
          <article className="panel network-panel" id="network-architecture">
            <div className="panel-heading">
              <div>
                <h2>
                  {viewMode === "3D Interactive"
                    ? "3D Neural Network Architecture"
                    : viewMode === "2D Network"
                      ? "2D Network Architecture"
                      : "Feature Space Explorer"}
                </h2>
                <p>
                  Follow the signal from input features to the predicted class
                </p>
              </div>
              <span className="live-badge">
                <i />
                {training ? "TRAINING" : "LIVE"}
              </span>
            </div>
            <div className="network-wrap">
              {viewMode === "3D Interactive" ? (
                <ThreeNetwork
                  dataset={dataset}
                  sampleIndex={sampleIndex}
                  model={model}
                  threshold={threshold}
                  autoRotate={autoRotate}
                  resetVersion={resetVersion}
                />
              ) : viewMode === "Feature Space" ? (
                <DecisionPlot
                  dataset={dataset}
                  model={model}
                  sampleIndex={sampleIndex}
                  onSelect={setSampleIndex}
                />
              ) : (
                <NetworkSvg
                  dataset={dataset}
                  current={current}
                  model={model}
                  threshold={threshold}
                />
              )}
            </div>
            <div className="network-controls">
              <div className="view-toggle">
                <button
                  className={viewMode === "2D Network" ? "selected" : ""}
                  onClick={() => setViewMode("2D Network")}
                >
                  2D
                </button>
                <button
                  className={viewMode === "3D Interactive" ? "selected" : ""}
                  onClick={() => setViewMode("3D Interactive")}
                >
                  3D
                </button>
                <button
                  className={viewMode === "Feature Space" ? "selected" : ""}
                  onClick={() => setViewMode("Feature Space")}
                >
                  Space
                </button>
              </div>
              <label className="threshold-control">
                <span>Link threshold</span>
                <input
                  aria-label="Link threshold"
                  type="range"
                  min="0"
                  max=".8"
                  step=".02"
                  value={threshold}
                  onChange={(event) => setThreshold(Number(event.target.value))}
                />
              </label>
              <button
                className="subtle-button"
                title={autoRotate ? "Pause auto-rotation" : "Resume auto-rotation"}
                onClick={() => setAutoRotate((value) => !value)}
              >
                <RotateCcw size={14} />
                <span>{autoRotate ? "Pause rotation" : "Rotate"}</span>
              </button>
              <button
                className="subtle-button"
                title="Reset view"
                onClick={() => setResetVersion((value) => value + 1)}
              >
                <Maximize2 size={14} />
                <span>Reset view</span>
              </button>
            </div>
            <div className="sample-scrubber" id="prediction-summary">
              <div className="scrubber-label">
                <span>
                  Current sample{" "}
                  <b>{String(sampleIndex + 1).padStart(3, "0")}</b>
                  <small>of {dataset?.x.length ?? 0}</small>
                </span>
                <span className="prediction-label">
                  PREDICTED <b>{dataset?.classes[predictionIndex] ?? "-"}</b>
                  <small>
                    {((current?.layers[3][predictionIndex] ?? 0) * 100).toFixed(
                      1,
                    )}
                    %
                  </small>
                  <em>
                    TRUE {dataset?.classes[dataset?.y[sampleIndex] ?? 0] ?? "-"}
                  </em>
                </span>
              </div>
              <input
                aria-label="Current sample"
                type="range"
                min="0"
                max={Math.max(0, (dataset?.x.length ?? 1) - 1)}
                value={Math.min(
                  sampleIndex,
                  Math.max(0, (dataset?.x.length ?? 1) - 1),
                )}
                onChange={(event) => setSampleIndex(Number(event.target.value))}
              />
            </div>
          </article>
          <div className="right-stack">
            <article className="panel chart-panel" id="training-progress">
              <div className="panel-heading compact">
                <h2>Training loss</h2>
                <span className="legend">
                  <i className="legend-blue" />
                  Train <i className="legend-pink" />
                  Validation
                </span>
              </div>
              <LineChart history={history} epoch={epoch} metric="loss" />
              <div className="axis-caption">
                <span>LOSS</span>
                <span>Epochs</span>
              </div>
            </article>
            <article className="panel chart-panel accuracy-panel">
              <div className="panel-heading compact">
                <h2>Accuracy over epochs</h2>
                <span className="legend">
                  <i className="legend-blue" />
                  Train <i className="legend-pink" />
                  Validation
                </span>
              </div>
              <LineChart history={history} epoch={epoch} metric="accuracy" />
              <div className="axis-caption">
                <span>ACCURACY</span>
                <span>Epochs</span>
              </div>
            </article>
            <div className="epoch-control">
              <span>
                Epoch <b>{epoch}</b> / 200
              </span>
              <input
                aria-label="Select epoch"
                type="range"
                min="0"
                max="200"
                value={epoch}
                onChange={(event) => setEpoch(Number(event.target.value))}
              />
              <button
                className="icon-button tiny"
                title="Step one epoch"
                onClick={() => setEpoch((value) => Math.min(200, value + 1))}
              >
                <Play size={12} />
              </button>
            </div>
          </div>
        </section>
        <section className="insights-grid">
          <article className="panel decision-panel" id="decision-boundary">
            <div className="panel-heading">
              <div>
                <h2>Decision boundary</h2>
                <p>Feature-space view · first two features</p>
              </div>
              <button
                className="icon-button tiny"
                title="Open feature space"
                onClick={() => setViewMode("Feature Space")}
              >
                <Maximize2 size={13} />
              </button>
            </div>
            <DecisionPlot
              dataset={dataset}
              model={model}
              sampleIndex={sampleIndex}
              onSelect={setSampleIndex}
            />
          </article>
          <article className="panel importance-panel" id="feature-analysis">
            <div className="panel-heading">
              <div>
                <h2>Feature importance</h2>
                <p>Class-separation sensitivity</p>
              </div>
              <SlidersHorizontal size={15} className="muted-icon" />
            </div>
            <div className="importance-list">
              {(dataset?.features ?? []).slice(0, 4).map((feature, index) => (
                <button
                  key={feature}
                  className={`importance-row ${selectedFeature === index ? "chosen" : ""}`}
                  onClick={() => setSelectedFeature(index)}
                >
                  <span className="importance-name">
                    {feature.replaceAll("_", " ")}
                  </span>
                  <span className="bar-track">
                    <i
                      style={{
                        width: `${Math.max(7, (dataset?.importance[index] ?? 0) * 100)}%`,
                        background: [
                          "#fb4e8a",
                          "#ff9552",
                          "#388bfa",
                          "#8955dc",
                        ][index % 4],
                      }}
                    />
                  </span>
                  <b>{(dataset?.importance[index] ?? 0).toFixed(2)}</b>
                </button>
              ))}
            </div>
            <div className="feature-footnote">
              <i className="online-dot" />
              Selected:{" "}
              {dataset?.features[selectedFeature]?.replaceAll("_", " ") ??
                "feature"}{" "}
              · click to inspect
            </div>
          </article>
          <article className="panel activation-panel">
            <div className="panel-heading">
              <div>
                <h2>Activation map</h2>
                <p>
                  {activationLayer} · sample {sampleIndex + 1}
                </p>
              </div>
              <select
                className="mini-select"
                aria-label="Activation layer"
                value={activationLayer}
                onChange={(event) => setActivationLayer(event.target.value)}
              >
                <option>Layer 1</option>
                <option>Layer 2</option>
                <option>Output</option>
              </select>
            </div>
            <ActivationHeatmap
              current={current}
              sampleIndex={sampleIndex}
              selectedLayer={activationLayer}
              dataset={dataset}
              model={model}
            />
            <div className="heatmap-axis">
              <span>NEURONS</span>
              <span>NEARBY SAMPLES</span>
              <span className="heat-scale">
                0 <i /> 1
              </span>
            </div>
          </article>
        </section>
        <section className="panel about-section" id="about-mlp">
          <div className="about-heading">
            <span className="about-icon"><BookOpenText size={19} /></span>
            <div>
              <span className="eyebrow">LEARNING GUIDE</span>
              <h2>About MLP</h2>
              <p>
                A guided introduction to neural-network classification, the
                dashboard, and what its controls change.
              </p>
            </div>
          </div>
          <div className="about-grid">
            <article className="about-card about-wide">
              <h3>What is a multilayer perceptron?</h3>
              <p>
                A multilayer perceptron (MLP) is a feed-forward neural network:
                information moves from input features, through one or more
                hidden layers, to an output. Each neuron combines its inputs
                with learned weights and a bias, then applies an activation
                function. During training, the model adjusts those weights to
                make its predictions closer to the known labels.
              </p>
              <div className="formula">
                <span>weighted input</span> z = Σ (weight × input) + bias
                <span> · hidden activation</span> a = ReLU(z) = max(0, z)
              </div>
              <p>
                This project uses two ReLU hidden layers and a softmax output.
                Softmax turns output scores into class probabilities that sum
                to 1; the class with the highest probability is the prediction.
              </p>
            </article>
            <article className="about-card">
              <h3>How learning works here</h3>
              <ol className="about-steps">
                <li><b>Forward pass:</b> features flow through the network to produce probabilities.</li>
                <li><b>Measure error:</b> cross-entropy loss penalizes low probability for the true class.</li>
                <li><b>Backpropagate:</b> gradients show how each weight contributed to that error.</li>
                <li><b>Update:</b> gradient descent nudges weights in the direction that lowers loss.</li>
                <li><b>Repeat:</b> an epoch processes the training rows once (up to 1,200 rows per epoch).</li>
              </ol>
            </article>
            <article className="about-card">
              <h3>Network in this visualizer</h3>
              <p>
                Input neurons represent the selected dataset’s features. The
                hidden layers contain 8 and 6 neurons, respectively. The output
                has one neuron per target class. Node size and glow reflect
                activations; connection color reflects weight sign and
                brightness reflects relative weight strength.
              </p>
              <p>
                The 2D view labels nodes and exposes weight/bias details on
                hover. The 3D view can be dragged, zoomed, auto-rotated, and
                reset. The architecture itself is fixed in this project; the
                view selector changes only how it is displayed. To keep the
                3D diagram readable, it displays at most 8 input and 5 output
                nodes; the model still uses all selected features and classes.
              </p>
            </article>
            <article className="about-card about-wide">
              <h3>How to use the dashboard</h3>
              <div className="about-guide-grid">
                <p><b>1 · Choose data.</b> Select a bundled example or upload a CSV. Pick the column to predict and review how missing values are filled before using the cleaned dataset.</p>
                <p><b>2 · Explore a sample.</b> Move the sample slider or select a point on the decision plot to update the predicted class, confidence, network activations, and nearby-sample activation map.</p>
                <p><b>3 · Inspect the model.</b> Switch between 2D, 3D, and feature-space views. Hover nodes or links for details, adjust the link threshold, and use drag/scroll in 3D.</p>
                <p><b>4 · Train and compare.</b> Start training to initialize a fresh model, pause and resume to continue it, and read training/validation loss and accuracy as epochs progress.</p>
                <p><b>5 · Review results.</b> Compare the decision regions and feature summary, select an activation layer, and export the cleaned dataset as CSV if needed.</p>
              </div>
            </article>
            <article className="about-card about-wide">
              <h3>What happens when a setting changes?</h3>
              <div className="about-table-wrap">
                <table className="about-table">
                  <thead><tr><th>Control</th><th>Increase / change</th><th>Decrease / trade-off</th></tr></thead>
                  <tbody>
                    <tr><th>Learning rate</th><td>Larger weight updates can learn faster.</td><td>Smaller updates are steadier but may need more epochs; too large can overshoot or become unstable.</td></tr>
                    <tr><th>Training speed</th><td>More frequent updates finish sooner; it does not change the learning-rate size.</td><td>Slower updates are easier to watch, not inherently more accurate.</td></tr>
                    <tr><th>Epochs</th><td>More passes can improve fit until it levels off or overfits.</td><td>Fewer passes train less and may underfit. Selecting an epoch changes the chart cursor, not the saved weights.</td></tr>
                    <tr><th>Link threshold</th><td>Hides more weaker connections in the network view.</td><td>Shows more connections. This is a display filter; it does not modify weights or predictions.</td></tr>
                    <tr><th>Sample</th><td>Moves to another row, updating its prediction and activation views.</td><td>It does not train the model or change its weights.</td></tr>
                    <tr><th>Target column</th><td>Defines the labels the model learns; each distinct target value becomes a class.</td><td>Changing it creates a different classification task and can change the number of output neurons.</td></tr>
                    <tr><th>Missing-value strategy</th><td>Mean/median/mode changes how blanks are imputed and can affect learned patterns.</td><td>Mode is the available choice for categorical values and the target.</td></tr>
                  </tbody>
                </table>
              </div>
            </article>
            <article className="about-card">
              <h3>Reading the charts and analysis</h3>
              <p>
                Lower loss means predicted probabilities are closer to the
                correct labels; higher accuracy means more rows were classified
                correctly. A widening gap between training and validation
                results can indicate overfitting. The decision plot shows
                predictions from the first two standardized features while
                holding the other features at the selected sample’s values.
              </p>
              <p>
                The feature bars are a simple normalized class-mean separation
                score, not a learned-weight attribution or causal explanation.
                The activation map shows actual neuron activations for nearby
                rows in the selected layer.
              </p>
            </article>
            <article className="about-card">
              <h3>Data and important limitations</h3>
              <p>
                CSV headers are normalized; empty and common NA tokens are
                treated as missing; duplicate and malformed rows are skipped;
                numeric values are standardized and text values are ordinally
                encoded before training. A per-class holdout is used for
                validation when enough rows exist.
              </p>
              <p>
                This is an educational classifier, not a production model.
                Small samples may yield unstable metrics, the deterministic
                holdout depends on row order, and standardization is calculated
                before the split. These choices make validation illustrative,
                not an unbiased benchmark. The project currently supports
                classification, not numeric regression.
              </p>
            </article>
          </div>
        </section>
        <section className="bottom-controls">
          <div className="dataset-status">
            <FileSpreadsheet size={15} />
            <span>{datasetName}</span>
            <b>{dataset?.x.length.toLocaleString() ?? 0} rows</b>
            <span className="status-pill">
              {dataset?.features.length ?? 0} features
            </span>
            <span className="status-pill">
              {dataset?.classes.length ?? 0} classes
            </span>
          </div>
          <div className="global-actions">
            <label>
              Rate{" "}
              <input
                className="rate-input"
                type="number"
                min=".001"
                max="1"
                step=".01"
                value={learningRate}
                disabled={training}
                onChange={(event) =>
                  setLearningRate(Number(event.target.value))
                }
              />
            </label>
            <label>
              Speed{" "}
              <select
                value={speed}
                disabled={training}
                onChange={(event) => setSpeed(Number(event.target.value))}
              >
                <option value={0.5}>0.5×</option>
                <option value={1}>1×</option>
                <option value={2}>2×</option>
                <option value={4}>4×</option>
              </select>
            </label>
            <button className="text-action" onClick={exportCleanCsv}>
              <ArrowDownToLine size={14} />
              Export cleaned CSV
            </button>
          </div>
        </section>
      </main>
      {uploadOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setUploadOpen(false);
          }}
        >
          <section
            className="upload-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="upload-title"
          >
            <header className="modal-header">
              <div className="modal-title-icon">
                <WandSparkles size={19} />
              </div>
              <div>
                <span className="eyebrow">DATA PREPARATION</span>
                <h2 id="upload-title">Review your dataset</h2>
              </div>
              <button
                className="icon-button close-button"
                title="Close dialog"
                onClick={() => setUploadOpen(false)}
              >
                <X size={18} />
              </button>
            </header>
            <div className="modal-body">
              <div
                className="drop-zone"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const file = event.dataTransfer.files[0];
                  if (file) openUpload(file);
                }}
                onClick={() => fileInput.current?.click()}
              >
                <Upload size={20} />
                <strong>{uploadName || "Choose a CSV file"}</strong>
                <span>Drop a file here or browse from your device</span>
                <small>UTF-8 CSV · first row used as headers</small>
              </div>
              <div className="sample-picker">
                <div>
                  <b>Or explore a sample</b>
                  <span>Popular datasets, ready to use</span>
                </div>
                <div className="sample-list">
                  {samples.map((sample) => (
                    <button
                      key={sample.file}
                      onClick={() => {
                        void loadSample(sample);
                        setUploadOpen(false);
                      }}
                    >
                      <Database size={15} />
                      <span>
                        <b>{sample.name}</b>
                        <small>{sample.detail}</small>
                      </span>
                      <ChevronDown size={14} />
                    </button>
                  ))}
                </div>
              </div>
              {parsed && (
                <>
                  <div className="quality-summary">
                    <span>
                      <b>{parsed.rows.length.toLocaleString()}</b> usable rows
                    </span>
                    <span>
                      <b>{parsed.headers.length}</b> columns
                    </span>
                    <span className={missingCount ? "warning-stat" : ""}>
                      <b>{missingCount}</b> missing cells
                    </span>
                    <span>
                      <b>{parsed.duplicateCount}</b> duplicate rows
                    </span>
                    {parsed.malformedRows > 0 && (
                      <span className="warning-stat">
                        <b>{parsed.malformedRows}</b> malformed rows skipped
                      </span>
                    )}
                    {parsed.parseErrors > 0 && (
                      <span className="warning-stat">
                        <b>{parsed.parseErrors}</b> parse warnings
                      </span>
                    )}
                  </div>
                  <div className="target-picker">
                    <label htmlFor="target-column">Prediction target</label>
                    <select
                      id="target-column"
                      value={target}
                      onChange={(event) => {
                        const nextTarget = event.target.value;
                        setTarget(nextTarget);
                        setStrategies((value) => ({ ...value, [nextTarget]: "mode" }));
                      }}
                    >
                      {parsed.headers.map((header) => (
                        <option key={header}>{header}</option>
                      ))}
                    </select>
                  </div>
                  <div className="clean-table-wrap">
                    <table className="clean-table">
                      <thead>
                        <tr>
                          <th>Column</th>
                          <th>Type</th>
                          <th>Missing</th>
                          <th>Fill with</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsed.columns.map((column) => (
                          <tr key={column.name}>
                            <td>
                              {column.name}
                              {target === column.name && (
                                <span className="target-tag">TARGET</span>
                              )}
                            </td>
                            <td>{column.numeric ? "Numeric" : "Category"}</td>
                            <td>
                              {column.missing || (
                                <Check size={13} className="check-icon" />
                              )}
                            </td>
                            <td>
                              <select
                                aria-label={`Fill missing ${column.name}`}
                                value={
                                  target === column.name
                                    ? "mode"
                                    : strategies[column.name] ??
                                      (column.numeric ? "median" : "mode")
                                }
                                onChange={(event) =>
                                  setStrategies((value) => ({
                                    ...value,
                                    [column.name]: event.target
                                      .value as Strategy,
                                  }))
                                }
                              >
                                <option
                                  value="mean"
                                  disabled={!column.numeric || target === column.name}
                                >
                                  Mean
                                </option>
                                <option
                                  value="median"
                                  disabled={!column.numeric || target === column.name}
                                >
                                  Median
                                </option>
                                <option value="mode">Mode</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="clean-note">
                    <CircleHelp size={13} />
                    Blank/NA values are imputed, duplicate and malformed rows
                    removed, headers normalized, and text features encoded.
                  </p>
                </>
              )}
              {uploadError && <p className="upload-error">{uploadError}</p>}
            </div>
            <footer className="modal-footer">
              <button
                className="subtle-button"
                onClick={() => setUploadOpen(false)}
              >
                Cancel
              </button>
              <button
                className="train-button"
                disabled={!parsed || parsed.headers.length < 2}
                onClick={applyCsv}
              >
                <Check size={15} />
                Clean &amp; use dataset
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
