import Papa from "papaparse";
import { getTrainingFlowers, type Flower } from "./model";

export type CsvIssueLevel = "error" | "warning" | "info";
export type CsvIssue = {
  level: CsvIssueLevel;
  message: string;
  count?: number;
};
export type MissingStrategy = "mean" | "median" | "mode" | "drop";
export type RawCsvRow = Record<string, string>;
export type CsvColumnKind = "numeric" | "categorical";

export type ParsedCsvResult = {
  rawRows: RawCsvRow[];
  issues: CsvIssue[];
  tooMessy: boolean;
  columns: string[];
  columnKinds: Record<string, CsvColumnKind>;
  targetCandidates: string[];
  singleClassColumns: string[];
  featureCandidates: string[];
  missingValueCount: number;
  duplicateCount: number;
  invalidNumericCount: number;
};

export type CleanedDataset = {
  rows: Flower[];
  featureNames: string[];
  classLabels: string[];
  targetName: string;
  droppedCount: number;
  imputedCount: number;
  sourceRowCount: number;
  missingRowCount: number;
  duplicateCount: number;
};

const MAX_CATEGORY_VALUES = 16;
const MAX_TARGET_CLASSES = 30;
const MISSING_TOKENS = new Set(["", "na", "n/a", "null", "none", "nan", "?"]);

export function isMissingCsvValue(value: string | undefined) {
  return MISSING_TOKENS.has((value ?? "").trim().toLowerCase());
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
    : (sorted[mid] ?? 0);
}

function mostFrequent(values: string[]): string {
  const frequencies = new Map<string, number>();
  for (const value of values)
    frequencies.set(value, (frequencies.get(value) ?? 0) + 1);
  return [...frequencies].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
}

/** Inspect a CSV without assuming any particular dataset schema. */
export function parseCsvRaw(csvText: string): ParsedCsvResult {
  const result = Papa.parse<RawCsvRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });
  const columns = result.meta.fields ?? [];
  const rawRows = result.data;
  const issues: CsvIssue[] = [];
  const columnKinds: Record<string, CsvColumnKind> = {};
  let missingValueCount = 0;
  let invalidNumericCount = 0;

  for (const row of rawRows) {
    if (columns.some((column) => isMissingCsvValue(row[column]))) missingValueCount++;
  }
  for (const column of columns) {
    const present = rawRows
      .map((row) => row[column]?.trim() ?? "")
      .filter((value) => !isMissingCsvValue(value));
    const numeric = present.filter((value) => Number.isFinite(Number(value)));
    columnKinds[column] =
      present.length > 0 && numeric.length / present.length >= 0.8
        ? "numeric"
        : "categorical";
    if (columnKinds[column] === "numeric")
      invalidNumericCount += present.filter(
        (value) => !Number.isFinite(Number(value)),
      ).length;
  }

  const targetCandidates = columns.filter((column) => {
    const values = new Set(
      rawRows
        .map((row) => row[column]?.trim())
        .filter((value) => !isMissingCsvValue(value)),
    );
    return values.size >= 2 && values.size <= MAX_TARGET_CLASSES;
  });
  const singleClassColumns = columns.filter((column) => {
    const values = new Set(
      rawRows
        .map((row) => row[column]?.trim())
        .filter((value) => !isMissingCsvValue(value)),
    );
    return values.size === 1;
  });
  targetCandidates.sort((left, right) => {
    const targetHint =
      /(^|[_\s])(class|label|target|outcome|result|churn|species|category|type)([_\s]|$)/i;
    const score = (column: string) => {
      const classes = new Set(
        rawRows
          .map((row) => row[column]?.trim())
          .filter((value) => !isMissingCsvValue(value)),
      ).size;
      return (
        (targetHint.test(column) ? 10 : 0) +
        (columnKinds[column] === "categorical" ? 3 : 0) -
        classes / 100
      );
    };
    return score(right) - score(left);
  });
  const featureCandidates = columns.filter((column) => {
    const values = new Set(
      rawRows
        .map((row) => row[column]?.trim())
        .filter((value) => !isMissingCsvValue(value)),
    );
    return (
      !/(^|[_\s])(id|identifier|email|date|timestamp|name|uuid|index)([_\s]|$)/i.test(
        column,
      ) &&
      values.size >= 1 &&
      (columnKinds[column] === "numeric" ||
        values.size <= MAX_CATEGORY_VALUES)
    );
  });

  const seen = new Set<string>();
  let duplicateCount = 0;
  for (const row of rawRows) {
    const key = JSON.stringify(
      columns.map((column) =>
        isMissingCsvValue(row[column]) ? "" : row[column].trim(),
      ),
    );
    if (seen.has(key)) duplicateCount++;
    else seen.add(key);
  }

  if (result.errors.length > 0)
    issues.push({
      level: "error",
      message: `CSV parse error: ${result.errors[0]?.message ?? "Unknown error"}`,
    });
  if (columns.length < 2)
    issues.push({
      level: "error",
      message: "The CSV needs a header row and at least two columns.",
    });
  if (targetCandidates.length === 0)
    issues.push({
      level: "error",
      message: singleClassColumns.length
        ? `Single-class target detected in ${singleClassColumns.join(", ")}. A classification target needs at least 2 distinct classes.`
        : rawRows.length === 0
          ? "The CSV is empty or contains only a header row."
          : "No classification target found. A target column must contain between 2 and 30 distinct values.",
    });
  if (rawRows.length < 8)
    issues.push({
      level: "error",
      message: `CSV has only ${rawRows.length} row(s). At least 8 are required for a train/test split.`,
    });
  if (missingValueCount > 0)
    issues.push({
      level: "warning",
      message: `${missingValueCount} row(s) contain empty cells or common missing-value markers. Choose a cleaning strategy before training.`,
      count: missingValueCount,
    });
  if (invalidNumericCount > 0)
    issues.push({
      level: "warning",
      message: `${invalidNumericCount} non-numeric value(s) were found in numeric columns and will be handled as missing data.`,
      count: invalidNumericCount,
    });
  if (duplicateCount > 0)
    issues.push({
      level: "info",
      message: `${duplicateCount} duplicate row(s) detected. You can choose to remove them.`,
      count: duplicateCount,
    });
  if (issues.length === 0)
    issues.push({
      level: "info",
      message: `CSV looks usable — ${rawRows.length} rows and ${columns.length} columns detected.`,
    });

  return {
    rawRows,
    issues,
    tooMessy:
      columns.length < 2 ||
      targetCandidates.length === 0 ||
      rawRows.length < 8 ||
      result.errors.length > 0,
    columns,
    columnKinds,
    targetCandidates,
    singleClassColumns,
    featureCandidates,
    missingValueCount,
    duplicateCount,
    invalidNumericCount,
  };
}

/** Clean selected columns and encode categorical predictors for classification. */
export function cleanCsv(
  parseResult: ParsedCsvResult,
  missingStrategy: MissingStrategy,
  removeDuplicates: boolean,
  targetName: string,
  selectedFeatures: string[],
): CleanedDataset {
  if (!parseResult.targetCandidates.includes(targetName))
    throw new Error("Select a valid classification target column.");
  if (selectedFeatures.length === 0)
    throw new Error("Select at least one feature column.");
  if (selectedFeatures.includes(targetName))
    throw new Error("The target column cannot also be used as a feature.");

  const chosenColumns = [targetName, ...selectedFeatures];
  let rows = parseResult.rawRows.map((row) => ({ ...row }));
  let droppedCount = 0;
  let imputedCount = 0;

  if (removeDuplicates) {
    const seen = new Set<string>();
    rows = rows.filter((row) => {
      const key = JSON.stringify(
        parseResult.columns.map((column) =>
          isMissingCsvValue(row[column]) ? "" : row[column].trim(),
        ),
      );
      if (seen.has(key)) {
        droppedCount++;
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  const targetRows = rows.filter((row) => {
    if (!isMissingCsvValue(row[targetName])) return true;
    droppedCount++;
    return false;
  });

  const rowsByClass = new Map<string, RawCsvRow[]>();
  for (const row of targetRows) {
    const label = row[targetName].trim();
    const group = rowsByClass.get(label) ?? [];
    group.push(row);
    rowsByClass.set(label, group);
  }
  const trainingRows = [...rowsByClass.values()].flatMap((group) =>
    group.length < 2
      ? group
      : group.filter((_, index) => index % 4 !== 0),
  );

  const valuesByColumn = new Map<string, string[]>();
  for (const column of selectedFeatures) {
    const values = trainingRows
      .map((row) => row[column]?.trim() ?? "")
      .filter((value) => !isMissingCsvValue(value));
    valuesByColumn.set(column, values);
  }

  const fillValues = new Map<string, string>();
  for (const column of selectedFeatures) {
    const values = valuesByColumn.get(column) ?? [];
    if (parseResult.columnKinds[column] === "numeric") {
      const numbers = values
        .map(Number)
        .filter((value) => Number.isFinite(value));
      if (numbers.length === 0)
        throw new Error(`Column "${column}" has no valid values to impute from.`);
      let fill: number;
      if (missingStrategy === "mean") {
        fill = numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
      } else if (missingStrategy === "median") {
        fill = median(numbers);
      } else {
        fill = Number(mostFrequent(numbers.map(String)));
      }
      fillValues.set(column, String(fill));
    } else {
      if (values.length === 0)
        throw new Error(`Column "${column}" has no values to impute from.`);
      fillValues.set(column, mostFrequent(values));
    }
  }

  const completeRows = targetRows.filter((row) => {
    const hasMissing = chosenColumns.some((column) => {
      const value = row[column]?.trim() ?? "";
      return isMissingCsvValue(value) || (
        parseResult.columnKinds[column] === "numeric" &&
        !Number.isFinite(Number(value))
      );
    });
    if (missingStrategy === "drop" && hasMissing) {
      droppedCount++;
      return false;
    }
    return true;
  });

  const categoriesByFeature = new Map<string, string[]>();
  for (const column of selectedFeatures) {
    if (parseResult.columnKinds[column] === "categorical") {
      const categories = [
        ...new Set(
          trainingRows
            .map((row) =>
              isMissingCsvValue(row[column])
                ? fillValues.get(column)!
                : row[column].trim(),
            )
            .filter((value) => !isMissingCsvValue(value)),
        ),
      ].sort();
      if (categories.length > MAX_CATEGORY_VALUES)
        throw new Error(
          `Column "${column}" has more than ${MAX_CATEGORY_VALUES} categories and cannot be encoded safely.`,
        );
      categoriesByFeature.set(column, categories);
    }
  }

  const featureNames = selectedFeatures.flatMap((column) => {
    const categories = categoriesByFeature.get(column);
    return categories
      ? categories.map((category) => `${column} = ${category}`)
      : [column];
  });
  const cleanedRows: Flower[] = [];

  for (const [id, row] of completeRows.entries()) {
    const features: number[] = [];
    for (const column of selectedFeatures) {
      const original = row[column]?.trim() ?? "";
      const invalidNumeric =
        parseResult.columnKinds[column] === "numeric" &&
        !isMissingCsvValue(original) &&
        !Number.isFinite(Number(original));
      const missing = isMissingCsvValue(original) || invalidNumeric;
      const value = missing ? fillValues.get(column)! : original;
      if (missing && missingStrategy !== "drop") imputedCount++;
      const categories = categoriesByFeature.get(column);
      if (categories) {
        features.push(...categories.map((category) => Number(value === category)));
      } else {
        features.push(Number(value));
      }
    }
    if (features.some((value) => !Number.isFinite(value))) {
      droppedCount++;
      continue;
    }
    cleanedRows.push({ id, features, label: row[targetName].trim() });
  }

  const classLabels = [...new Set(cleanedRows.map((row) => row.label))].sort();
  if (classLabels.length < 2)
    throw new Error("At least two target classes must remain after cleaning.");
  const trainingLabels = new Set(
    getTrainingFlowers(cleanedRows).map((row) => row.label),
  );
  const labelsWithoutTrainingRows = classLabels.filter(
    (label) => !trainingLabels.has(label),
  );
  if (labelsWithoutTrainingRows.length > 0)
    throw new Error(
      `These target classes have no training examples: ${labelsWithoutTrainingRows.join(", ")}. Add more rows for each class.`,
    );
  return {
    rows: cleanedRows,
    featureNames,
    classLabels,
    targetName,
    droppedCount,
    imputedCount,
    sourceRowCount: parseResult.rawRows.length,
    missingRowCount: parseResult.missingValueCount,
    duplicateCount: parseResult.duplicateCount,
  };
}
