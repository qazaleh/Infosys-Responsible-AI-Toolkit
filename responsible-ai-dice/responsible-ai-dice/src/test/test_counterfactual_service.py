import tempfile
import unittest
from pathlib import Path

import joblib
import pandas as pd
from sklearn.datasets import load_breast_cancer
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression

from counterfactual.schemas import CounterfactualRequest
from counterfactual.service import CounterfactualService


class CounterfactualServiceTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        dataset = load_breast_cancer(as_frame=True)
        cls.dataframe = dataset.frame.copy()
        cls.target_column = 'target'
        cls.synthetic_dataframe = cls._build_synthetic_dataframe()
        cls.synthetic_target_column = 'approved'

    @staticmethod
    def _build_synthetic_dataframe() -> pd.DataFrame:
        rows = []
        for age in range(25, 61, 5):
            for income in range(20000, 100001, 10000):
                for hours_per_week in range(20, 61, 10):
                    rows.append(
                        {
                            'age': age,
                            'income': income,
                            'hours_per_week': hours_per_week,
                            'approved': int(income >= 60000),
                        }
                    )
        return pd.DataFrame(rows)

    def _save_model(self, estimator, features: pd.DataFrame, labels: pd.Series) -> str:
        estimator.fit(features, labels)
        temp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(temp_dir.cleanup)
        model_path = Path(temp_dir.name) / 'model.joblib'
        joblib.dump(estimator, model_path)
        return str(model_path)

    def _run_counterfactual_check(self, estimator, total_counterfactuals: int = 1) -> None:
        features = self.dataframe.drop(columns=[self.target_column])
        labels = self.dataframe[self.target_column]
        model_path = self._save_model(estimator, features, labels)

        request = CounterfactualRequest(
            modelPath=model_path,
            datasetRecords=self.dataframe.head(50).to_dict(orient='records'),
            targetColumn=self.target_column,
            inputIndex=0,
            desiredClass='opposite',
            totalCounterfactuals=total_counterfactuals,
        )
        result = CounterfactualService().generate_counterfactual(request)

        self.assertGreaterEqual(len(result.counterfactuals), 1)
        self.assertEqual(result.inputIndex, 0)
        self.assertEqual(result.targetColumn, self.target_column)

    def _build_synthetic_request(self, **overrides) -> CounterfactualRequest:
        features = self.synthetic_dataframe.drop(columns=[self.synthetic_target_column])
        labels = self.synthetic_dataframe[self.synthetic_target_column]
        model_path = self._save_model(
            LogisticRegression(max_iter=1000),
            features,
            labels,
        )

        payload = {
            'modelPath': model_path,
            'datasetRecords': self.synthetic_dataframe.to_dict(orient='records'),
            'targetColumn': self.synthetic_target_column,
            'inputIndex': 0,
            'desiredClass': 'opposite',
            'totalCounterfactuals': 2,
        }
        payload.update(overrides)
        return CounterfactualRequest.model_validate(payload)

    def test_logistic_regression_counterfactual(self) -> None:
        self._run_counterfactual_check(LogisticRegression(max_iter=500), total_counterfactuals=1)

    def test_random_forest_counterfactual(self) -> None:
        self._run_counterfactual_check(RandomForestClassifier(n_estimators=20, random_state=7))

    def test_empty_constraints_still_work_like_before(self) -> None:
        result = CounterfactualService().generate_counterfactual(self._build_synthetic_request())
        self.assertGreaterEqual(len(result.counterfactuals), 1)

    def test_immutable_feature_is_not_changed(self) -> None:
        request = self._build_synthetic_request(features_to_ignore=['age'])
        result = CounterfactualService().generate_counterfactual(request)

        original_age = result.originalInstance['age']
        self.assertGreaterEqual(len(result.counterfactuals), 1)
        for example in result.counterfactuals:
            self.assertEqual(example.data['age'], original_age)
            self.assertNotIn('age', [change.featureName for change in example.changedFeatures])

    def test_permitted_range_limits_income(self) -> None:
        request = self._build_synthetic_request(
            permitted_range={'income': [65000, 75000]}
        )
        result = CounterfactualService().generate_counterfactual(request)

        self.assertGreaterEqual(len(result.counterfactuals), 1)
        for example in result.counterfactuals:
            self.assertGreaterEqual(float(example.data['income']), 65000.0)
            self.assertLessEqual(float(example.data['income']), 75000.0)

    def test_invalid_immutable_feature_name_returns_clear_validation_error(self) -> None:
        request = self._build_synthetic_request(immutable_features=['unknown_feature'])

        with self.assertRaisesRegex(
            ValueError,
            r'immutable features.*unknown_feature',
        ):
            CounterfactualService().generate_counterfactual(request)

    def test_invalid_permitted_range_feature_name_returns_clear_validation_error(self) -> None:
        request = self._build_synthetic_request(
            permitted_range={'unknown_feature': [1, 2]}
        )

        with self.assertRaisesRegex(
            ValueError,
            r'permitted_range features.*unknown_feature',
        ):
            CounterfactualService().generate_counterfactual(request)

    def test_invalid_permitted_range_shape_returns_clear_validation_error(self) -> None:
        request = self._build_synthetic_request(
            permitted_range={'income': [65000]}
        )

        with self.assertRaisesRegex(
            ValueError,
            r'permitted_range for "income" must be a two-item list',
        ):
            CounterfactualService().generate_counterfactual(request)


if __name__ == '__main__':
    unittest.main()
