import { RandomForestClassifier, RandomForestRegression } from "ml-random-forest";
import Papa from "papaparse";
import gardenCsv from "./data/garden-bed.csv?raw";
import greenhouseCsv from "./data/greenhouse-trials.csv?raw";

export type ClassLabel = string;
export type Flower = {
  id: number;
  features: number[];
  label: ClassLabel;
};

export type FlowerDataset = {
  id: string;
  name: string;
  description: string;
  featureNames: string[];
  classLabels: ClassLabel[];
  targetName: string;
  problemType?: "classification" | "regression";
  flowers: Flower[];
  dataQuality?: {
    sourceRows: number;
    missingRows: number;
    duplicateRows: number;
    droppedRows: number;
    imputedValues: number;
  };
};

type CsvFlowerRow = {
  petal_length_cm: string;
  petal_width_cm: string;
  flower_class: string;
};

export type TreeNode = {
  splitColumn?: number;
  splitValue?: number;
  numberSamples?: number;
  gain?: number;
  distribution?: { getRow: (row: number) => number[] } | number[][] | number;
  left?: TreeNode;
  right?: TreeNode;
};

type ForestEngine = {
  train: (features: number[][], labels: number[]) => void;
  predict: (features: number[][]) => number[];
  predictionValues: (features: number[][]) => {
    get: (row: number, column: number) => number;
  };
  featureImportance: () => number[];
  estimators: Array<{ root: TreeNode }>;
  indexes: number[][];
  oobResults?: Array<{ true: number; all: number[]; predicted: number }>;
};

type RegressionEngine = {
  train: (features:number[][], values:number[])=>void;
  predict: (features:number[][])=>number[];
  featureImportance: ()=>number[];
  estimators: Array<{root:TreeNode}>;
  indexes:number[][];
};

export type TrainedForest = {
  trees: TreeNode[];
  featureIndexes: number[][];
  importance: number[];
  predict: (flower: Flower) => ClassLabel;
  predictEach: (flower: Flower) => ClassLabel[];
  predictTree: (treeIndex: number, flower: Flower) => ClassLabel;
  oobErrorByTree: number[];
  oobScore: number | null;
};

export type TrainedRegressionForest = {
  trees: TreeNode[];
  importance: number[];
  predict: (row:Flower)=>number;
  predictEach: (row:Flower)=>number[];
};

export type RegressionMetrics = { mae:number; rmse:number; r2:number; sampleCount:number; actual:number[]; predicted:number[] };

export type Evaluation = {
  confusion: number[][];
  accuracy: number;
  precision: number[];
  recall: number[];
  f1: number[];
  macroPrecision: number;
  macroRecall: number;
  macroF1: number;
  weightedF1: number;
  classCounts: number[];
  sampleCount: number;
};

export const FEATURE_NAMES = ["Petal length", "Petal width"];
export const CLASS_LABELS = ["Flower A", "Flower B"];

function parseDataset(
  id: string,
  name: string,
  description: string,
  source: string,
): FlowerDataset {
  const result = Papa.parse<CsvFlowerRow>(source, {
    header: true,
    skipEmptyLines: true,
  });
  if (result.errors.length > 0)
    throw new Error(`Could not parse ${name}: ${result.errors[0].message}`);

  const flowers = result.data.map((row, index) => {
    const length = Number(row.petal_length_cm);
    const width = Number(row.petal_width_cm);
    if (!Number.isFinite(length) || !Number.isFinite(width)) {
      throw new Error(
        `${name}, row ${index + 2}: petal measurements must be numeric.`,
      );
    }
    if (!CLASS_LABELS.includes(row.flower_class)) {
      throw new Error(`${name}, row ${index + 2}: unknown flower class.`);
    }
    return { id: index, features: [length, width], label: row.flower_class };
  });

  if (flowers.length < 8)
    throw new Error(`${name} needs at least 8 rows for a train/test split.`);
  return {
    id,
    name,
    description,
    featureNames: [...FEATURE_NAMES],
    classLabels: [...CLASS_LABELS],
    targetName: "Flower class",
    flowers,
  };
}

export const BUNDLED_DATASETS: FlowerDataset[] = [
  parseDataset(
    "garden-bed",
    "Garden bed",
    "Mixed lengths with a clear size trend.",
    gardenCsv,
  ),
  parseDataset(
    "greenhouse-trials",
    "Greenhouse trials",
    "Class differences show up mainly in petal width.",
    greenhouseCsv,
  ),
];

/** Build a dataset from validated, encoded classification rows. */
export function makeDatasetFromRows(
  id: string,
  name: string,
  description: string,
  featureNames: string[],
  classLabels: string[],
  targetName: string,
  rows: Flower[],
  dataQuality?: FlowerDataset["dataQuality"],
  problemType: "classification" | "regression" = "classification",
): FlowerDataset {
  if (rows.length < 8)
    throw new Error("Dataset needs at least 8 rows for a train/test split.");
  if (featureNames.length === 0 || (problemType === "classification" && classLabels.length < 2))
    throw new Error("Choose at least one feature and a valid target.");
  return {
    id,
    name,
    description,
    featureNames,
    classLabels,
    targetName,
    problemType,
    flowers: rows,
    dataQuality,
  };
}

export function trainRegressionForest(treeCount:number, depth:number|null, seed:number, flowers:Flower[], minSamples=3, maxFeatures=Math.max(1,Math.floor(Math.sqrt(flowers[0]?.features.length??1))), gainThreshold=.01):TrainedRegressionForest {
  const training=getTrainingFlowers(flowers);
  const engine=new RandomForestRegression({nEstimators:treeCount,maxFeatures:Math.max(1,Math.min(training[0]?.features.length??1,maxFeatures)),replacement:false,useSampleBagging:true,noOOB:true,seed,selectionMethod:"mean",treeOptions:{maxDepth:depth??Infinity,minNumSamples:minSamples,gainThreshold}}) as unknown as RegressionEngine;
  const value=(row:Flower)=>Number(row.label);
  engine.train(training.map(getFeatures),training.map(value));
  const predictEach=(row:Flower)=>engine.predict([getFeatures(row)]);
  return {trees:engine.estimators.map(estimator=>estimator.root),importance:engine.featureImportance(),predict:row=>engine.predict([getFeatures(row)])[0]??0,predictEach};
}

export function evaluateRegression(forest:TrainedRegressionForest, flowers:Flower[]):RegressionMetrics {
  const test=getTestFlowers(flowers), actual=test.map(row=>Number(row.label)), predicted=test.map(row=>forest.predict(row));
  const mae=actual.length?actual.reduce((sum,value,index)=>sum+Math.abs(value-(predicted[index]??0)),0)/actual.length:0;
  const mse=actual.length?actual.reduce((sum,value,index)=>sum+(value-(predicted[index]??0))**2,0)/actual.length:0;
  const mean=actual.length?actual.reduce((sum,value)=>sum+value,0)/actual.length:0;
  const total=actual.reduce((sum,value)=>sum+(value-mean)**2,0);
  return {mae,rmse:Math.sqrt(mse),r2:total?1-actual.reduce((sum,value,index)=>sum+(value-(predicted[index]??0))**2,0)/total:0,sampleCount:test.length,actual,predicted};
}

export const FLOWER_DATASETS: FlowerDataset[] = [...BUNDLED_DATASETS];

function heldOutIds(flowers: Flower[]) {
  const byClass = new Map<string, Flower[]>();
  for (const flower of flowers) {
    const group = byClass.get(flower.label) ?? [];
    group.push(flower);
    byClass.set(flower.label, group);
  }
  const selected = new Set<number>();
  for (const group of byClass.values()) {
    const ordered = [...group].sort((a, b) => a.id - b.id);
    if (ordered.length < 2) continue;
    ordered.forEach((flower, index) => {
      if (index % 4 === 0) selected.add(flower.id);
    });
  }
  return selected;
}

export function getTrainingFlowers(flowers: Flower[]) {
  const testIds = heldOutIds(flowers);
  return flowers.filter((flower) => !testIds.has(flower.id));
}

export function getTestFlowers(flowers: Flower[]) {
  const testIds = heldOutIds(flowers);
  return flowers.filter((flower) => testIds.has(flower.id));
}

export function getFeatures(flower: Flower) {
  return flower.features;
}

export function trainForest(
  treeCount: number,
  depth: number | null,
  seed: number,
  flowers: Flower[],
  classLabels: ClassLabel[],
  minSamples = 3,
  maxFeatures = Math.max(1, Math.floor(Math.sqrt(flowers[0]?.features.length ?? 1))),
  gainThreshold = 0.01,
): TrainedForest {
  const trainingFlowers = getTrainingFlowers(flowers);
  const makeEngine = (noOOB: boolean) => new RandomForestClassifier({
    nEstimators: treeCount,
    maxFeatures: Math.max(1, Math.min(trainingFlowers[0]?.features.length ?? 1, maxFeatures)),
    replacement: false,
    useSampleBagging: true,
    noOOB,
    seed,
    treeOptions: {
      maxDepth: depth ?? Infinity,
      minNumSamples: minSamples,
      gainThreshold,
    },
  }) as unknown as ForestEngine;
  const encode = (label: ClassLabel) => classLabels.indexOf(label);
  const decode = (value: number) => classLabels[Math.round(value)] ?? classLabels[0];

  let engine = makeEngine(false);
  try {
    engine.train(trainingFlowers.map(getFeatures), trainingFlowers.map((flower) => encode(flower.label)));
  } catch {
    // ml-random-forest can fail while summarizing OOB votes when very few trees
    // leave a sample with no votes. Keep the fitted forest usable without OOB.
    engine = makeEngine(true);
    engine.train(trainingFlowers.map(getFeatures), trainingFlowers.map((flower) => encode(flower.label)));
  }

  function predictEach(flower: Flower) {
    const predictions = engine.predictionValues([getFeatures(flower)]);
    return engine.estimators.map((_, index) =>
      decode(predictions.get(0, index)),
    );
  }

  const oobRows = engine.oobResults ?? [];
  const oobErrorByTree = Array.from({ length: treeCount }, (_, treeIndex) => {
    const eligible = oobRows.filter((row) => row.all.length > treeIndex);
    if (!eligible.length) return 0;
    const errors = eligible.filter((row) => {
      const counts = new Map<number, number>();
      row.all.slice(0, treeIndex + 1).forEach((vote) => counts.set(vote, (counts.get(vote) ?? 0) + 1));
      const predicted = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
      return predicted !== row.true;
    }).length;
    return errors / eligible.length;
  });
  const finalOobRows = oobRows.filter((row) => row.all.length > 0);
  const oobScore = finalOobRows.length
    ? 1 - finalOobRows.filter((row) => row.predicted !== row.true).length / finalOobRows.length
    : null;

  return {
    trees: engine.estimators.map((estimator) => estimator.root),
    featureIndexes: engine.indexes,
    importance: engine.featureImportance(),
    predict: (flower) => decode(engine.predict([getFeatures(flower)])[0]),
    predictEach,
    predictTree: (treeIndex, flower) => {
      let node = engine.estimators[treeIndex]?.root;
      while (node?.left && node.right && node.splitColumn !== undefined && node.splitValue !== undefined) {
        const feature = engine.indexes[treeIndex]?.[node.splitColumn];
        if (feature === undefined) break;
        node = (getFeatures(flower)[feature] ?? 0) < node.splitValue ? node.left : node.right;
      }
      const dist = node ? getClassDistribution(node, classLabels.length) : [];
      return decode(dist.indexOf(Math.max(...dist)));
    },
    oobErrorByTree,
    oobScore,
  };
}


export function evaluateForest(
  forest: TrainedForest,
  flowers: Flower[],
  classLabels: ClassLabel[],
): Evaluation {
  const confusion = classLabels.map(() => classLabels.map(() => 0));
  const testFlowers = getTestFlowers(flowers);
  const classCounts = classLabels.map(
    (label) => flowers.filter((flower) => flower.label === label).length,
  );
  let correct = 0;

  for (const flower of testFlowers) {
    const actual = classLabels.indexOf(flower.label);
    const predicted = classLabels.indexOf(forest.predict(flower));
    if (actual < 0 || predicted < 0) continue;
    confusion[actual][predicted]++;
    if (actual === predicted) correct++;
  }

  const precision = classLabels.map((_, index) => {
    const predictedCount = confusion.reduce((sum, row) => sum + row[index], 0);
    return predictedCount ? confusion[index][index] / predictedCount : 0;
  });
  const recall = classLabels.map((_, index) => {
    const actualCount = confusion[index].reduce((sum, value) => sum + value, 0);
    return actualCount ? confusion[index][index] / actualCount : 0;
  });
  const f1 = classLabels.map((_, index) => {
    const p = precision[index] ?? 0;
    const r = recall[index] ?? 0;
    return p + r ? (2 * p * r) / (p + r) : 0;
  });
  const macro = (values: number[]) =>
    values.length
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : 0;
  const totalClassCount = classCounts.reduce((sum, count) => sum + count, 0);
  const weightedF1 = totalClassCount
    ? f1.reduce(
        (sum, value, index) =>
          sum + value * ((classCounts[index] ?? 0) / totalClassCount),
        0,
      )
    : 0;

  return {
    confusion,
    accuracy: testFlowers.length ? correct / testFlowers.length : 0,
    precision,
    recall,
    f1,
    macroPrecision: macro(precision),
    macroRecall: macro(recall),
    macroF1: macro(f1),
    weightedF1,
    classCounts,
    sampleCount: testFlowers.length,
  };
}

export function calculatePermutationImportance(
  forest: TrainedForest,
  flowers: Flower[],
  seed: number,
) {
  const testFlowers = getTestFlowers(flowers);
  if (testFlowers.length < 2)
    return flowers[0]?.features.map(() => 0) ?? [];

  const accuracy = (rows: Flower[]) => {
    let correct = 0;
    for (const row of rows) {
      if (forest.predict(row) === row.label) correct++;
    }
    return correct / rows.length;
  };
  const baseline = accuracy(testFlowers);
  let state = seed >>> 0;
  const random = () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };

  return testFlowers[0]!.features.map((_, featureIndex) => {
    const permutedValues = testFlowers.map(
      (row) => row.features[featureIndex] ?? 0,
    );
    for (let index = permutedValues.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(random() * (index + 1));
      [permutedValues[index], permutedValues[swapIndex]] = [
        permutedValues[swapIndex]!,
        permutedValues[index]!,
      ];
    }
    const permuted = testFlowers.map((row, index) => {
      const features = [...row.features];
      features[featureIndex] = permutedValues[index]!;
      return { ...row, features };
    });
    return Math.max(0, baseline - accuracy(permuted));
  });
}

export function getDecisionPath(
  forest: TrainedForest,
  treeIndex: number,
  flower: Flower,
) {
  const steps: Array<{
    node: TreeNode;
    featureIndex: number;
    value: number;
    passes: boolean;
  }> = [];
  let node = forest.trees[treeIndex];
  let leafPath = "";

  while (
    node?.left &&
    node.right &&
    node.splitColumn !== undefined &&
    node.splitValue !== undefined
  ) {
    const featureIndex = forest.featureIndexes[treeIndex][node.splitColumn];
    const value = getFeatures(flower)[featureIndex];
    const passes = value < node.splitValue;
    steps.push({ node, featureIndex, value, passes });
    leafPath += passes ? "L" : "R";
    node = passes ? node.left : node.right;
  }

  return { steps, leaf: node, leafPath };
}

export function getClassDistribution(node: TreeNode, classCount = 2) {
  const distribution = node.distribution;
  if (!distribution) return Array.from({ length: classCount }, () => 0);
  const values = typeof distribution === "number" ? [] : Array.isArray(distribution)
    ? (distribution[0] ?? [])
    : distribution.getRow(0);
  return Array.from({ length: classCount }, (_, index) => values[index] ?? 0);
}

export function getTreeFeatureIndex(
  forest: TrainedForest,
  treeIndex: number,
  node: TreeNode,
) {
  if (node.splitColumn === undefined) return undefined;
  return forest.featureIndexes[treeIndex][node.splitColumn];
}
