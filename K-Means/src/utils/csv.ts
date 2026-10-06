import Papa from 'papaparse';

export interface DataPoint {
  [key: string]: number;
}

export type ImputationMethod = 'mean' | 'median' | 'mode' | 'drop';

export interface ColumnProfile {
  name: string;
  isNumeric: boolean;
  min: number;
  max: number;
  mean: number;
  std: number;
  missingCount: number;
  totalCount: number;
}

export const parseCSV = (
  file: File,
  onComplete: (data: DataPoint[], columns: string[], rawData: Record<string, unknown>[]) => void,
  onError: (error: string) => void
) => {
  Papa.parse(file, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    complete: (results) => {
      const columns = (results.meta.fields || []).filter(c => c && c.trim() !== '');
      const raw = results.data as Record<string, unknown>[];

      const numericData = raw.map(row => {
        const newRow: DataPoint = {};
        for (const col of columns) {
          const val = row[col];
          if (typeof val === 'number' && !isNaN(val)) {
            newRow[col] = val;
          } else if (typeof val === 'string' && val.trim() !== '' && !isNaN(Number(val))) {
            newRow[col] = Number(val);
          } else {
            newRow[col] = NaN;
          }
        }
        return newRow;
      });

      onComplete(numericData, columns, raw);
    },
    error: (error) => {
      onError(error.message);
    }
  });
};

export const parseCSVString = (csvText: string): { data: DataPoint[]; columns: string[]; rawData: Record<string, unknown>[] } => {
  const results = Papa.parse(csvText, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  });

  const columns = (results.meta.fields || []).filter(c => c && c.trim() !== '');
  const raw = results.data as Record<string, unknown>[];

  const numericData = raw.map(row => {
    const newRow: DataPoint = {};
    for (const col of columns) {
      const val = row[col];
      if (typeof val === 'number' && !isNaN(val)) {
        newRow[col] = val;
      } else if (typeof val === 'string' && val.trim() !== '' && !isNaN(Number(val))) {
        newRow[col] = Number(val);
      } else {
        newRow[col] = NaN;
      }
    }
    return newRow;
  });

  return { data: numericData, columns, rawData: raw };
};

export const countMissing = (data: DataPoint[], columns: string[]): number => {
  let count = 0;
  const numericColumns = columns.filter((col) =>
    data.some((row) => typeof row[col] === 'number' && !isNaN(row[col]))
  );

  for (const row of data) {
    for (const col of numericColumns) {
      if (isNaN(row[col])) count++;
    }
  }
  return count;
};

export const computeColumnProfiles = (data: DataPoint[], columns: string[]): ColumnProfile[] => {
  return columns.map(col => {
    const valid = data.map(r => r[col]).filter(v => typeof v === 'number' && !isNaN(v));
    const missingCount = data.length - valid.length;
    const isNumeric = valid.length > 0;

    if (valid.length === 0) {
      return {
        name: col,
        isNumeric: false,
        min: 0,
        max: 0,
        mean: 0,
        std: 0,
        missingCount: 0,
        totalCount: data.length,
      };
    }

    let min = Infinity;
    let max = -Infinity;
    for (const value of valid) {
      if (value < min) min = value;
      if (value > max) max = value;
    }
    const sum = valid.reduce((a, b) => a + b, 0);
    const mean = sum / valid.length;
    const variance = valid.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (valid.length || 1);
    const std = Math.sqrt(variance);

    return {
      name: col,
      isNumeric,
      min: parseFloat(min.toFixed(4)),
      max: parseFloat(max.toFixed(4)),
      mean: parseFloat(mean.toFixed(4)),
      std: parseFloat(std.toFixed(4)),
      missingCount,
      totalCount: data.length,
    };
  });
};

export const imputeMissingValues = (
  data: DataPoint[],
  columns: string[],
  method: ImputationMethod
): DataPoint[] => {
  const numericColumns = columns.filter((col) =>
    data.some((row) => typeof row[col] === 'number' && !isNaN(row[col]))
  );

  if (method === 'drop') {
    return data.filter(row => numericColumns.every(col => !isNaN(row[col])));
  }

  const columnStats: Record<string, number> = {};

  for (const col of numericColumns) {
    const validValues = data.map(row => row[col]).filter(val => !isNaN(val));
    if (validValues.length === 0) {
      continue;
    }

    if (method === 'mean') {
      const sum = validValues.reduce((a, b) => a + b, 0);
      columnStats[col] = sum / validValues.length;
    } else if (method === 'median') {
      const sorted = [...validValues].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      columnStats[col] =
        sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    } else if (method === 'mode') {
      const counts: Record<string, number> = {};
      let maxCount = 0;
      let mode = validValues[0];
      for (const val of validValues) {
        const key = String(val);
        counts[key] = (counts[key] || 0) + 1;
        if (counts[key] > maxCount) {
          maxCount = counts[key];
          mode = val;
        }
      }
      columnStats[col] = mode;
    }
  }

  return data.map(row => {
    const newRow: DataPoint = { ...row };
    for (const col of numericColumns) {
      if (isNaN(newRow[col]) && columnStats[col] !== undefined) {
        newRow[col] = parseFloat(columnStats[col].toFixed(4));
      }
    }
    return newRow;
  });
};
