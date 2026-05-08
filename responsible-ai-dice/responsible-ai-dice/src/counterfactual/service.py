from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Any, Dict, Iterable, List, Optional
from zipfile import ZIP_DEFLATED, ZipFile

import dice_ml
import joblib
import numpy as np
import pandas as pd
import requests
from sklearn.base import BaseEstimator
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

from counterfactual.reporting import DiceReportBuilder
from counterfactual.repository import WorkbenchRepository
from counterfactual.schemas import (
    CounterfactualChange,
    CounterfactualExample,
    CounterfactualReportRequest,
    CounterfactualRequest,
    CounterfactualResult,
    CounterfactualSummary,
)


log = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


SUPPORTED_ESTIMATORS = (LogisticRegression, RandomForestClassifier)


@dataclass
class LoadedAssets:
    model: Any
    model_name: str
    dataset: pd.DataFrame
    dataset_name: str
    target_column: str
    feature_names: List[str]
    continuous_features: List[str]
    categorical_features: List[str]
    input_index: int
    query_instance: pd.DataFrame
    model_type: str
    desired_class_input: Any
    total_counterfactuals: int
    allow_features_to_vary: List[str] | str


class CounterfactualService:
    def __init__(self, repository: WorkbenchRepository | None = None) -> None:
        self.repository = repository

    def _repository(self) -> WorkbenchRepository:
        if self.repository is None:
            self.repository = WorkbenchRepository()
        return self.repository

    def health(self) -> dict[str, Any]:
        self._repository().ping()
        return {'status': 'ok', 'service': 'dice-counterfactual'}

    def generate_counterfactual(self, request: CounterfactualRequest) -> CounterfactualResult:
        assets = self._load_assets(request)
        estimator = self._resolve_supported_estimator(assets.model)

        model_wrapper = dice_ml.Model(model=assets.model, backend='sklearn')
        data_wrapper = dice_ml.Data(
            dataframe=assets.dataset,
            continuous_features=assets.continuous_features,
            outcome_name=assets.target_column,
        )
        explainer = dice_ml.Dice(data_wrapper, model_wrapper, method='random')

        predicted_class = self._to_python(assets.model.predict(assets.query_instance)[0])
        desired_class = self._resolve_desired_class(
            desired_class_input=assets.desired_class_input,
            predicted_class=predicted_class,
            model=assets.model,
        )
        dice_desired_class = (
            'opposite'
            if isinstance(assets.desired_class_input, str)
            and assets.desired_class_input.lower() == 'opposite'
            else desired_class
        )

        try:
            cf_examples = explainer.generate_counterfactuals(
                assets.query_instance,
                total_CFs=assets.total_counterfactuals,
                desired_class=dice_desired_class,
                features_to_vary=assets.allow_features_to_vary,
            )
        except Exception as exc:
            raise ValueError(f'DiCE could not generate counterfactuals: {exc}') from exc

        final_cf_df = self._extract_counterfactual_dataframe(cf_examples)
        if final_cf_df.empty:
            raise ValueError('DiCE could not generate counterfactuals for the selected instance.')

        examples = self._build_counterfactual_examples(
            original_row=assets.query_instance.iloc[0],
            counterfactual_df=final_cf_df,
            feature_names=assets.feature_names,
            target_column=assets.target_column,
        )

        summary = CounterfactualSummary(
            counterfactualCount=len(examples),
            averageChangedFeatures=round(
                float(np.mean([example.changedFeatureCount for example in examples])), 3
            ),
            averageDistanceL1=round(float(np.mean([example.distanceL1 for example in examples])), 4),
        )

        return CounterfactualResult(
            modelName=assets.model_name,
            datasetName=assets.dataset_name,
            modelType=type(estimator).__name__,
            targetColumn=assets.target_column,
            featureNames=assets.feature_names,
            inputIndex=assets.input_index,
            predictedClass=predicted_class,
            desiredClass=desired_class,
            originalInstance=self._serialize_row(assets.query_instance.iloc[0], assets.feature_names),
            counterfactuals=examples,
            summary=summary,
        )

    def generate_report(self, request: CounterfactualReportRequest) -> dict[str, Any]:
        report_url = os.getenv('REPORT_URL')
        if not report_url:
            raise RuntimeError('REPORT_URL is not configured for the DiCE service.')

        repository = self._repository()
        tenet_id = repository.get_tenet_id('Explainability')
        batch = repository.get_batch(request.batchId, tenet_id)
        report_request = request.model_copy(
            update={
                'modelId': batch['ModelId'],
                'datasetId': batch['DataId'],
            }
        )

        repository.update_batch_status(request.batchId, 'Started')
        try:
            result = self.generate_counterfactual(report_request)
            with TemporaryDirectory() as temp_dir:
                output_dir = Path(temp_dir) / 'output'
                output_dir.mkdir(parents=True, exist_ok=True)

                html_path = output_dir / 'explanationreport.html'
                html_path.write_text(DiceReportBuilder.build_html(result.model_dump()), encoding='utf-8')

                csv_path = output_dir / 'counterfactuals.csv'
                self._write_counterfactual_csv(csv_path, result)

                zip_path = Path(temp_dir) / 'report.zip'
                with ZipFile(zip_path, 'w', ZIP_DEFLATED) as zip_file:
                    for file_path in output_dir.iterdir():
                        zip_file.write(file_path, arcname=f'output/{file_path.name}')

                html_file_id = repository.save_file(
                    zip_path.read_bytes(),
                    filename='dice_counterfactual_report.zip',
                    content_type='application/zip',
                    tenet='Explainability',
                )
                repository.create_html_record(
                    batch_id=request.batchId,
                    tenet_id=tenet_id,
                    report_name='dice_counterfactual_report.zip',
                    html_file_id=html_file_id,
                )

            response = requests.post(
                report_url,
                data={'batchId': str(request.batchId)},
                timeout=180,
                verify=os.getenv('VERIFY_SSL', 'false').lower() in ('true', '1', 'yes'),
            )
            response.raise_for_status()
            report_response = response.json()
            if report_response.get('status') != 'SUCCESS':
                raise RuntimeError(report_response.get('message') or 'Reporting conversion failed.')

            repository.update_batch_status(request.batchId, 'Completed')
            return {'status': 'SUCCESS', 'message': 'DiCE report generated successfully.'}
        except Exception:
            repository.update_batch_status(request.batchId, 'Failed')
            raise

    def _load_assets(self, request: CounterfactualRequest) -> LoadedAssets:
        if request.modelId is not None and request.datasetId is not None:
            return self._load_registered_assets(request)
        if request.modelPath and request.datasetRecords:
            return self._load_inline_assets(request)
        raise ValueError(
            'Provide either modelId + datasetId or modelPath + datasetRecords for counterfactual generation.'
        )

    def _load_registered_assets(self, request: CounterfactualRequest) -> LoadedAssets:
        repository = self._repository()
        model_record = repository.get_model_record(request.modelId)
        dataset_record = repository.get_dataset_record(request.datasetId)

        model_bytes = repository.read_gridfs_file(model_record['ModelData'])['data']
        model = self._normalize_model(joblib.load(BytesIO(model_bytes)))

        dataset_attribute_names = ['groundTruthClassLabel', 'fileName']
        dataset_attribute_values = repository.get_dataset_attribute_values(
            request.datasetId, dataset_attribute_names
        )
        target_column = request.targetColumn or dataset_attribute_values[0]
        dataset_file_name = dataset_attribute_values[1]

        dataset_bytes = repository.read_gridfs_file(dataset_record['SampleData'])['data']
        dataset = self._load_dataframe_from_bytes(dataset_bytes, dataset_file_name)

        model_name = request.modelName or model_record.get('ModelName') or f'model_{request.modelId}'
        dataset_name = request.datasetName or dataset_record.get('DataSetName') or f'dataset_{request.datasetId}'
        return self._build_loaded_assets(
            request=request,
            model=model,
            model_name=model_name,
            dataset=dataset,
            dataset_name=dataset_name,
            target_column=target_column,
        )

    def _load_inline_assets(self, request: CounterfactualRequest) -> LoadedAssets:
        model_path = Path(request.modelPath or '')
        if not model_path.exists():
            raise FileNotFoundError(f'Model file does not exist: {model_path}')
        model = self._normalize_model(joblib.load(model_path))
        dataset = pd.DataFrame(request.datasetRecords or [])
        if dataset.empty:
            raise ValueError('datasetRecords must contain at least one row for DiCE generation.')
        if not request.targetColumn:
            raise ValueError('targetColumn is required when using inline datasetRecords.')
        return self._build_loaded_assets(
            request=request,
            model=model,
            model_name=request.modelName or model_path.stem,
            dataset=dataset,
            dataset_name=request.datasetName or 'inline_dataset',
            target_column=request.targetColumn,
        )

    def _build_loaded_assets(
        self,
        request: CounterfactualRequest,
        model: Any,
        model_name: str,
        dataset: pd.DataFrame,
        dataset_name: str,
        target_column: str,
    ) -> LoadedAssets:
        if target_column not in dataset.columns:
            raise ValueError(
                f'Target column "{target_column}" is missing from the dataset used for DiCE.'
            )

        feature_names = list(request.featureNames or [col for col in dataset.columns if col != target_column])
        missing_features = [feature_name for feature_name in feature_names if feature_name not in dataset.columns]
        if missing_features:
            raise ValueError(f'Requested feature names are missing from the dataset: {missing_features}')

        continuous_features, categorical_features = self._infer_feature_types(
            dataset=dataset,
            feature_names=feature_names,
            continuous_features=request.continuousFeatures,
            categorical_features=request.categoricalFeatures,
        )
        query_instance = self._build_query_instance(
            dataset=dataset,
            feature_names=feature_names,
            input_row=request.inputRow,
            input_index=request.inputIndex,
        )

        return LoadedAssets(
            model=model,
            model_name=model_name,
            dataset=dataset[feature_names + [target_column]].copy(),
            dataset_name=dataset_name,
            target_column=target_column,
            feature_names=feature_names,
            continuous_features=continuous_features,
            categorical_features=categorical_features,
            input_index=request.inputIndex,
            query_instance=query_instance,
            model_type=type(self._resolve_supported_estimator(model)).__name__,
            desired_class_input=request.desiredClass,
            total_counterfactuals=request.totalCounterfactuals,
            allow_features_to_vary=request.allowFeaturesToVary or 'all',
        )

    def _load_dataframe_from_bytes(self, dataset_bytes: bytes, file_name: str) -> pd.DataFrame:
        extension = Path(file_name).suffix.lower()
        if extension == '.csv':
            return pd.read_csv(BytesIO(dataset_bytes))
        if extension == '.parquet':
            return pd.read_parquet(BytesIO(dataset_bytes))
        raise ValueError(f'Unsupported dataset file type for DiCE: {extension or file_name}')

    def _build_query_instance(
        self,
        dataset: pd.DataFrame,
        feature_names: List[str],
        input_row: Optional[Dict[str, Any]],
        input_index: int,
    ) -> pd.DataFrame:
        if input_row is not None:
            query_df = pd.DataFrame([input_row])
            missing_features = [feature for feature in feature_names if feature not in query_df.columns]
            if missing_features:
                raise ValueError(f'inputRow is missing required features: {missing_features}')
            ordered_query_df = query_df[feature_names].copy()
            for feature_name in feature_names:
                ordered_query_df[feature_name] = ordered_query_df[feature_name].astype(
                    dataset[feature_name].dtype, copy=False, errors='ignore'
                )
            return ordered_query_df

        if input_index >= len(dataset.index):
            raise ValueError(
                f'inputIndex {input_index} is out of range for the dataset size {len(dataset.index)}.'
            )
        return dataset.loc[[dataset.index[input_index]], feature_names].copy()

    def _infer_feature_types(
        self,
        dataset: pd.DataFrame,
        feature_names: List[str],
        continuous_features: Optional[List[str]],
        categorical_features: Optional[List[str]],
    ) -> tuple[List[str], List[str]]:
        if continuous_features is not None or categorical_features is not None:
            return list(continuous_features or []), list(categorical_features or [])

        inferred_continuous: List[str] = []
        inferred_categorical: List[str] = []
        for feature_name in feature_names:
            if pd.api.types.is_numeric_dtype(dataset[feature_name]):
                inferred_continuous.append(feature_name)
            else:
                inferred_categorical.append(feature_name)
        return inferred_continuous, inferred_categorical

    def _normalize_model(self, model: Any) -> Any:
        if isinstance(model, dict):
            for key in ('model', 'estimator', 'pipeline', 'classifier'):
                candidate = model.get(key)
                if candidate is not None:
                    return candidate
        return model

    def _resolve_supported_estimator(self, model: Any) -> BaseEstimator:
        candidate = model

        if isinstance(candidate, Pipeline):
            final_estimator = candidate.steps[-1][1]
            if isinstance(final_estimator, SUPPORTED_ESTIMATORS):
                return final_estimator
        if isinstance(candidate, SUPPORTED_ESTIMATORS):
            return candidate
        raise NotImplementedError(
            f'Unsupported model type for DiCE: {type(candidate).__name__}. Only LogisticRegression and RandomForestClassifier are supported.'
        )

    def _resolve_desired_class(self, desired_class_input: Any, predicted_class: Any, model: Any) -> Any:
        classes = list(getattr(model, 'classes_', []))
        if not classes:
            raise ValueError('The selected model does not expose classes_ required for counterfactual generation.')

        if desired_class_input is None:
            if len(classes) == 2:
                return self._to_python(classes[1] if classes[0] == predicted_class else classes[0])
            raise ValueError('desiredClass is required for non-binary classification models.')

        if isinstance(desired_class_input, str) and desired_class_input.lower() == 'opposite':
            if len(classes) != 2:
                raise ValueError('desiredClass="opposite" is only valid for binary classification models.')
            return self._to_python(classes[1] if classes[0] == predicted_class else classes[0])

        for class_value in classes:
            if str(class_value) == str(desired_class_input):
                return self._to_python(class_value)

        raise ValueError(f'Invalid desired class "{desired_class_input}". Allowed classes: {classes}')

    def _extract_counterfactual_dataframe(self, cf_examples: Any) -> pd.DataFrame:
        examples = getattr(cf_examples, 'cf_examples_list', None) or []
        if not examples:
            return pd.DataFrame()
        final_cfs_df = getattr(examples[0], 'final_cfs_df', None)
        if final_cfs_df is None:
            return pd.DataFrame()
        return final_cfs_df.copy()

    def _build_counterfactual_examples(
        self,
        original_row: pd.Series,
        counterfactual_df: pd.DataFrame,
        feature_names: List[str],
        target_column: str,
    ) -> List[CounterfactualExample]:
        examples: List[CounterfactualExample] = []
        for index, (_, cf_row) in enumerate(counterfactual_df.iterrows(), start=1):
            changed_features: List[CounterfactualChange] = []
            distance_l1 = 0.0
            for feature_name in feature_names:
                original_value = self._to_python(original_row[feature_name])
                counterfactual_value = self._to_python(cf_row[feature_name])
                if self._values_equal(original_value, counterfactual_value):
                    continue
                absolute_change = self._absolute_change(original_value, counterfactual_value)
                if absolute_change is not None:
                    distance_l1 += absolute_change
                changed_features.append(
                    CounterfactualChange(
                        featureName=feature_name,
                        originalValue=original_value,
                        counterfactualValue=counterfactual_value,
                        absoluteChange=round(absolute_change, 4) if absolute_change is not None else None,
                    )
                )

            predicted_value = self._to_python(cf_row[target_column]) if target_column in cf_row else None
            changed_feature_names = [change.featureName for change in changed_features]
            interpretation = (
                f'This counterfactual changes {", ".join(changed_feature_names)} to move the prediction.'
                if changed_feature_names
                else 'No feature changes were required for this counterfactual.'
            )
            examples.append(
                CounterfactualExample(
                    counterfactualIndex=index,
                    predictedClass=predicted_value,
                    changedFeatureCount=len(changed_features),
                    distanceL1=round(distance_l1, 4),
                    data=self._serialize_row(cf_row, feature_names),
                    changedFeatures=changed_features,
                    interpretation=interpretation,
                )
            )
        return examples

    def _serialize_row(self, row: pd.Series, feature_names: Iterable[str]) -> Dict[str, Any]:
        return {feature_name: self._to_python(row[feature_name]) for feature_name in feature_names}

    def _values_equal(self, left: Any, right: Any) -> bool:
        if pd.isna(left) and pd.isna(right):
            return True
        return left == right

    def _absolute_change(self, left: Any, right: Any) -> Optional[float]:
        try:
            return abs(float(right) - float(left))
        except (TypeError, ValueError):
            return None

    def _to_python(self, value: Any) -> Any:
        if isinstance(value, (np.generic,)):
            return value.item()
        return value

    def _write_counterfactual_csv(self, csv_path: Path, result: CounterfactualResult) -> None:
        rows: List[Dict[str, Any]] = []
        for example in result.counterfactuals:
            row = {
                'counterfactualIndex': example.counterfactualIndex,
                'predictedClass': example.predictedClass,
                'changedFeatureCount': example.changedFeatureCount,
                'distanceL1': example.distanceL1,
                'interpretation': example.interpretation,
            }
            row.update(example.data)
            rows.append(row)
        pd.DataFrame(rows).to_csv(csv_path, index=False)
