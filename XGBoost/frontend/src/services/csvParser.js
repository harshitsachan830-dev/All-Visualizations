// Shared CSV parser utility — supports quoted fields, auto type-detection, and column profiling

export function parseCsvContent(text, fileName = "dataset.csv") {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) {
    throw new Error("CSV file must contain a header and at least one data row.");
  }

  function parseLine(line) {
    const fields = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' && inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    fields.push(current.trim());
    return fields;
  }

  const columns = parseLine(lines[0]).map((c, i) => c || `col_${i + 1}`);
  const rows = lines.slice(1).map(parseLine);

  // Compute column profiles
  const profiles = columns.map((col, idx) => {
    let missingCount = 0;
    const values = [];
    let numericCount = 0;
    const uniqueSet = new Set();

    for (const row of rows) {
      const val = row[idx];
      if (val === undefined || val === null || val.trim() === "") {
        missingCount++;
      } else {
        uniqueSet.add(val);
        const num = Number(val);
        if (!isNaN(num) && val.trim() !== "") {
          numericCount++;
          values.push(num);
        }
      }
    }

    const isNumeric = numericCount > (rows.length - missingCount) * 0.7;
    let minVal = null, maxVal = null, meanVal = null;
    if (isNumeric && values.length > 0) {
      minVal = Math.min(...values);
      maxVal = Math.max(...values);
      meanVal = values.reduce((a, b) => a + b, 0) / values.length;
    }

    return {
      column: col,
      type: isNumeric ? "Numeric" : "Categorical",
      missing: missingCount,
      missingPct: ((missingCount / Math.max(1, rows.length)) * 100).toFixed(1),
      unique: uniqueSet.size,
      min: minVal !== null ? minVal.toFixed(2) : "—",
      max: maxVal !== null ? maxVal.toFixed(2) : "—",
      mean: meanVal !== null ? meanVal.toFixed(2) : "—",
    };
  });

  const defaultTarget = columns[columns.length - 1];
  const targetProfile = profiles.find((p) => p.column === defaultTarget);
  const suggestedTask =
    targetProfile?.type === "Categorical" || (targetProfile?.unique && targetProfile.unique <= 10)
      ? "classification"
      : "regression";

  return {
    columns,
    rows,
    rowCount: rows.length,
    profiles,
    defaultTarget,
    suggestedTask,
    missingCells: profiles.reduce((sum, p) => sum + p.missing, 0),
  };
}
