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

    def _run_counterfactual_check(self, estimator, total_counterfactuals: int = 1) -> None:
        features = self.dataframe.drop(columns=[self.target_column])
        labels = self.dataframe[self.target_column]
        estimator.fit(features, labels)

        with tempfile.TemporaryDirectory() as temp_dir:
            model_path = Path(temp_dir) / 'model.joblib'
            joblib.dump(estimator, model_path)

            request = CounterfactualRequest(
                modelPath=str(model_path),
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

    def test_logistic_regression_counterfactual(self) -> None:
        self._run_counterfactual_check(LogisticRegression(max_iter=500), total_counterfactuals=1)

    def test_random_forest_counterfactual(self) -> None:
        self._run_counterfactual_check(RandomForestClassifier(n_estimators=20, random_state=7))


if __name__ == '__main__':
    unittest.main()
