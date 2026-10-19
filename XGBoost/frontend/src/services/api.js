// Smart API service for ModelMind XGBoost Backend with port fallback
let ACTIVE_PORT = localStorage.getItem("modelmind_port") || "8000";

export function getActivePort() {
  return ACTIVE_PORT;
}

export function setActivePort(port) {
  ACTIVE_PORT = String(port);
  localStorage.setItem("modelmind_port", ACTIVE_PORT);
}

export function getApiBase() {
  return `http://127.0.0.1:${ACTIVE_PORT}`;
}

export async function checkBackendHealth() {
  const ports = [ACTIVE_PORT, ACTIVE_PORT === "8000" ? "8001" : "8000"];
  for (const port of ports) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/health`, {
        signal: AbortSignal.timeout(1200),
      });
      if (res.ok) {
        const data = await res.json();
        if (port !== ACTIVE_PORT) {
          setActivePort(port);
        }
        return { connected: true, port, ...data };
      }
    } catch {
      // Try next port
    }
  }
  return { connected: false, port: ACTIVE_PORT };
}

export async function fetchSampleDatasets() {
  try {
    const res = await fetch(`${getApiBase()}/samples`);
    if (!res.ok) throw new Error("Could not fetch samples");
    return await res.json();
  } catch {
    return [
      {
        id: "house_prices",
        name: "House Prices (Regression)",
        task: "regression",
        target: "house_price",
        description: "500 properties with area, bedrooms, age, and location.",
      },
      {
        id: "customer_churn",
        name: "Customer Churn (Classification)",
        task: "classification",
        target: "churn",
        description: "1,000 accounts with spend, tenure, plan, and churn flag.",
      },
      {
        id: "nulls_benchmark",
        name: "Nulls Benchmark (Regression)",
        task: "regression",
        target: "target",
        description: "1,000-row benchmark with missing values.",
      },
    ];
  }
}

export async function fetchSampleCsv(sampleId) {
  const res = await fetch(`${getApiBase()}/samples/${sampleId}`);
  if (!res.ok) throw new Error(`Could not load sample dataset: ${sampleId}`);
  return await res.text();
}

export async function trainModelApi({
  file,
  target,
  task,
  imputation_strategy = "median",
  n_estimators = 150,
  max_depth = 5,
  learning_rate = 0.05,
  subsample = 1.0,
  colsample_bytree = 1.0,
}) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("target", target);
  formData.append("task", task);
  formData.append("imputation_strategy", imputation_strategy);
  formData.append("n_estimators", String(n_estimators));
  formData.append("max_depth", String(max_depth));
  formData.append("learning_rate", String(learning_rate));
  formData.append("subsample", String(subsample));
  formData.append("colsample_bytree", String(colsample_bytree));

  const res = await fetch(`${getApiBase()}/train`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Training failed on server.");
  }

  return await res.json();
}

export async function fetchDynamicSurface({ feature_x, feature_y, baseline_mode = "median" }) {
  const res = await fetch(`${getApiBase()}/surface`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ feature_x, feature_y, baseline_mode }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Surface calculation failed.");
  }

  return await res.json();
}

export async function predictSingleApi(features) {
  const res = await fetch(`${getApiBase()}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ features }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Prediction request failed.");
  }

  return await res.json();
}

export async function compareModelsApi({ file, target, task }) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("target", target);
  formData.append("task", task);

  const res = await fetch(`${getApiBase()}/compare-models`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Model comparison failed.");
  }

  return await res.json();
}
