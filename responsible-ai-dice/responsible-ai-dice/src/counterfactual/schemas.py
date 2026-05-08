from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional, Union

from pydantic import BaseModel, Field


ScalarValue = Union[str, int, float, bool]


class CounterfactualRequest(BaseModel):
    modelId: Optional[float] = Field(default=None, example=11.01)
    datasetId: Optional[float] = Field(default=None, example=12.02)
    inputRow: Optional[Dict[str, Any]] = Field(default=None, example={'age': 42, 'income': 90000})
    inputIndex: int = Field(default=0, ge=0)
    desiredClass: Optional[Union[ScalarValue, Literal['opposite']]] = Field(default='opposite')
    totalCounterfactuals: int = Field(default=3, ge=1, le=10)
    targetColumn: Optional[str] = Field(default=None, example='approved')
    featureNames: Optional[List[str]] = Field(default=None, example=['age', 'income'])
    continuousFeatures: Optional[List[str]] = Field(default=None, example=['age', 'income'])
    categoricalFeatures: Optional[List[str]] = Field(default=None, example=['gender'])
    allowFeaturesToVary: Optional[List[str]] = Field(default=None, example=['income'])
    modelPath: Optional[str] = Field(default=None, example='/tmp/model.joblib')
    datasetRecords: Optional[List[Dict[str, Any]]] = Field(default=None)
    modelName: Optional[str] = Field(default=None, example='Loan Approval Model')
    datasetName: Optional[str] = Field(default=None, example='banking_loan_training')


class CounterfactualReportRequest(CounterfactualRequest):
    batchId: float = Field(example=1234.0)


class CounterfactualChange(BaseModel):
    featureName: str
    originalValue: Any
    counterfactualValue: Any
    absoluteChange: Optional[float] = None


class CounterfactualExample(BaseModel):
    counterfactualIndex: int
    predictedClass: Any
    changedFeatureCount: int
    distanceL1: float
    data: Dict[str, Any]
    changedFeatures: List[CounterfactualChange]
    interpretation: str


class CounterfactualSummary(BaseModel):
    counterfactualCount: int
    averageChangedFeatures: float
    averageDistanceL1: float


class CounterfactualResult(BaseModel):
    modelName: str
    datasetName: str
    modelType: str
    targetColumn: str
    featureNames: List[str]
    inputIndex: int
    predictedClass: Any
    desiredClass: Any
    originalInstance: Dict[str, Any]
    counterfactuals: List[CounterfactualExample]
    summary: CounterfactualSummary


class CounterfactualResponse(BaseModel):
    status: Literal['SUCCESS', 'FAILURE']
    message: str
    result: Optional[CounterfactualResult] = None


class ReportResponse(BaseModel):
    status: Literal['SUCCESS', 'FAILURE']
    message: str
