import io
import unittest

from fastapi.testclient import TestClient

from backend.main import app


def sample_csv() -> bytes:
    rows = ["tenure,spend,plan,churn"]
    for index in range(48):
        tenure = "" if index == 4 else str(index % 36)
        spend = "" if index == 8 else str(20 + (index % 17) * 2)
        plan = "" if index == 12 else ("annual" if index % 2 else "monthly")
        churn = "yes" if index % 3 == 0 else "no"
        rows.append(f"{tenure},{spend},{plan},{churn}")
    return ("\n".join(rows) + "\n").encode()


class ApiWorkflowTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)
        response = self.client.post(
            "/api/dataset/upload",
            files={"file": ("sample.csv", io.BytesIO(sample_csv()), "text/csv")},
        )
        self.assertEqual(response.status_code, 200, response.text)

    def test_render_frontend_can_call_api(self) -> None:
        response = self.client.options(
            "/api/dataset/upload",
            headers={
                "Origin": "https://catboost-frontend.onrender.com",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(
            response.headers["access-control-allow-origin"],
            "https://catboost-frontend.onrender.com",
        )

    def test_upload_profiles_missingness_and_filename(self) -> None:
        result = self.client.get("/api/dataset").json()
        self.assertEqual(result["name"], "sample.csv")
        self.assertEqual(result["rows"], 48)
        self.assertEqual(result["target"], "churn")
        self.assertEqual(result["missing"], 3)
        self.assertEqual(result["features"][0]["type"], "Numerical")
        self.assertAlmostEqual(result["features"][0]["missing_percent"], 100 / 48)
        self.assertEqual(result["features"][0]["distribution"]["kind"], "histogram")
        self.assertEqual(result["features"][2]["type"], "Categorical")
        self.assertEqual(result["features"][2]["distribution"]["kind"], "categories")
        self.assertEqual(result["target_distribution"]["kind"], "categories")

    def test_dataset_profile_can_change_target_column(self) -> None:
        result = self.client.get("/api/dataset", params={"target": "plan"})
        self.assertEqual(result.status_code, 200, result.text)
        self.assertEqual(result.json()["target"], "plan")
        self.assertEqual(result.json()["target_distribution"]["kind"], "categories")

    def test_mean_median_and_mode_imputation(self) -> None:
        for method, column in [("mean", "tenure"), ("median", "spend"), ("mode", "plan")]:
            response = self.client.post(
                "/api/dataset/impute", json={"method": method, "columns": [column]}
            )
            self.assertEqual(response.status_code, 200, response.text)
            self.assertEqual(response.json()["name"], "sample.csv")
        final = self.client.get("/api/dataset").json()
        self.assertEqual(final["missing"], 0)

    def test_numeric_imputation_rejects_categorical_columns(self) -> None:
        response = self.client.post(
            "/api/dataset/impute", json={"method": "median", "columns": ["plan"]}
        )
        self.assertEqual(response.status_code, 422)
        self.assertIn("numeric column", response.json()["detail"])

    def test_regression_rejects_categorical_target_with_actionable_error(self) -> None:
        response = self.client.post(
            "/api/train",
            json={"target": "churn", "task": "regression", "iterations": 12},
        )
        self.assertEqual(response.status_code, 422)
        self.assertIn("numeric target column", response.json()["detail"])

    def test_ordered_step_uses_only_preceding_matching_rows(self) -> None:
        response = self.client.get(
            "/api/ordered-step",
            params={"iteration": 4, "selected_row": 10, "feature": "plan"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        result = response.json()
        self.assertEqual(len(result["permutation"]), 48)
        self.assertGreaterEqual(result["statistic"], 0)
        self.assertLessEqual(result["statistic"], 1)
        self.assertEqual(result["selected_row"], 10)

    def test_regression_training_returns_numeric_metrics(self) -> None:
        rows = ["size,rooms,zone,price"]
        rows.extend(f"{index},{index % 8},zone-{index % 3},{index * 2.5 + index % 4}" for index in range(48))
        response = self.client.post(
            "/api/dataset/upload",
            files={"file": ("prices.csv", io.BytesIO(("\n".join(rows) + "\n").encode()), "text/csv")},
        )
        self.assertEqual(response.status_code, 200, response.text)
        trained = self.client.post(
            "/api/train",
            json={"target": "price", "task": "regression", "iterations": 20, "depth": 4},
        )
        self.assertEqual(trained.status_code, 200, trained.text)
        self.assertIn("rmse", trained.json()["metrics"])
        self.assertIn("mae", trained.json()["metrics"])
        self.assertIn("r2", trained.json()["metrics"])
        self.assertTrue(trained.json()["evaluation"]["actual"])
        self.assertEqual(
            len(trained.json()["evaluation"]["actual"]),
            len(trained.json()["evaluation"]["predicted"]),
        )
        boundary = self.client.get(
            "/api/boundary", params={"feature_x": "size", "feature_y": "rooms", "iteration": 10}
        )
        self.assertEqual(boundary.status_code, 200, boundary.text)
        self.assertTrue(all(isinstance(value, float) for value in boundary.json()["predictions"]))
        self.assertEqual(len(boundary.json()["predictions"]), 1681)
        samples = boundary.json()["samples"]
        self.assertEqual(len(samples), 48)
        self.assertIsInstance(samples[0]["row"], int)
        self.assertEqual(samples[-1]["target"], 120.5)
        self.assertIsInstance(samples[0]["prediction"], float)

    def test_multiclass_boundary_returns_confidence_values(self) -> None:
        rows = ["size,rooms,zone,kind"]
        rows.extend(
            f"{index % 24},{index % 9},zone-{index % 3},{['cedar', 'maple', 'pine'][index % 3]}"
            for index in range(72)
        )
        uploaded = self.client.post(
            "/api/dataset/upload",
            files={"file": ("species.csv", io.BytesIO(("\n".join(rows) + "\n").encode()), "text/csv")},
        )
        self.assertEqual(uploaded.status_code, 200, uploaded.text)
        trained = self.client.post(
            "/api/train",
            json={"target": "kind", "task": "classification", "iterations": 15, "depth": 3},
        )
        self.assertEqual(trained.status_code, 200, trained.text)
        boundary = self.client.get(
            "/api/boundary", params={"feature_x": "size", "feature_y": "rooms", "iteration": 10}
        )
        self.assertEqual(boundary.status_code, 200, boundary.text)
        values = boundary.json()["predictions"]
        self.assertTrue(all(0 <= value <= 1 for value in values))
        self.assertEqual(boundary.json()["classes"], ["cedar", "maple", "pine"])
        self.assertIn(boundary.json()["samples"][0]["target"], boundary.json()["classes"])
        row = self.client.get("/api/dataset").json()["preview"][0]
        prediction = self.client.post("/api/predict", json={"row": row})
        self.assertEqual(prediction.status_code, 200, prediction.text)
        self.assertEqual(prediction.json()["raw_output_class"], prediction.json()["prediction"])

    def test_experiment_run_is_recorded(self) -> None:
        response = self.client.post(
            "/api/experiments",
            json={"target": "churn", "task": "classification", "iterations": 12, "depth": 3},
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["run_id"], 1)
        self.assertIn("training_result", response.json())
        history = self.client.get("/api/experiments").json()["experiments"]
        self.assertEqual(len(history), 1)
        self.assertIn("accuracy", history[0]["metrics"])

    def test_training_shap_prediction_and_boundary(self) -> None:
        trained = self.client.post(
            "/api/train",
            json={"target": "churn", "task": "classification", "iterations": 20, "depth": 4},
        )
        self.assertEqual(trained.status_code, 200, trained.text)
        result = trained.json()
        self.assertIn("accuracy", result["metrics"])
        self.assertIn("precision", result["metrics"])
        self.assertIn("recall", result["metrics"])
        self.assertIn("f1", result["metrics"])
        self.assertTrue(result["train_history"])
        self.assertTrue(result["importance"])
        self.assertEqual(len(result["evaluation"]["labels"]), 2)
        self.assertEqual(len(result["evaluation"]["confusion_matrix"]), 2)

        shap = self.client.get("/api/shap", params={"sample": 0})
        self.assertEqual(shap.status_code, 200, shap.text)
        self.assertEqual(len(shap.json()["shap_values"]), 3)
        self.assertTrue(shap.json()["summary"])
        summary_by_name = {item["feature"]: item for item in shap.json()["summary"]}
        self.assertEqual(summary_by_name["plan"]["feature_type"], "Categorical")

        prediction = self.client.post(
            "/api/predict",
            json={"row": {"tenure": 8, "spend": 42, "plan": "annual"}},
        )
        self.assertEqual(prediction.status_code, 200, prediction.text)
        self.assertIn("probabilities", prediction.json())
        self.assertEqual(len(prediction.json()["contributions"]), 3)

        boundary = self.client.get(
            "/api/boundary", params={"feature_x": "tenure", "feature_y": "spend", "iteration": 10}
        )
        self.assertEqual(boundary.status_code, 200, boundary.text)
        self.assertEqual(len(boundary.json()["predictions"]), 1681)
        self.assertEqual(boundary.json()["iteration"], 10)


if __name__ == "__main__":
    unittest.main()