# Responsible AI DiCE Counterfactual Service

This module adds an isolated DiCE counterfactual explainability service to the toolkit. It is intentionally separated from `responsible-ai-explain` so DiCE dependencies cannot affect the existing SHAP, LIME, or global explainability flows.

## What it does

- exposes its own FastAPI service
- generates tabular counterfactual explanations with DiCE
- supports registered toolkit models and datasets from the workbench
- supports direct requests using a local model path plus inline dataset records
- creates downloadable PDF reports through the existing reporting service

## Supported model types

- `sklearn.linear_model.LogisticRegression`
- `sklearn.ensemble.RandomForestClassifier`

Other estimators return a clear `unsupported model type` error.

## Endpoints

- `GET /health`
- `POST /rai/v1/dice/counterfactual`
- `POST /rai/v1/dice/report`

## Docker Compose

The optimized compose file exposes this service on host port `8004` and container port `8000`.

Build and run only the DiCE service:

```bash
docker compose -f docker-compose.optimized.yml build dice-counterfactual
docker compose -f docker-compose.optimized.yml up -d dice-counterfactual
```

Run the explainability profile:

```bash
docker compose -f docker-compose.optimized.yml --profile explainability up -d
```

## Request examples

### 1. Use registered toolkit model and dataset

```json
{
  "modelId": 11.01,
  "datasetId": 12.02,
  "inputIndex": 0,
  "desiredClass": "opposite",
  "totalCounterfactuals": 3
}
```

### 2. Use a local model path and inline records

```json
{
  "modelPath": "/tmp/logistic_model.joblib",
  "datasetRecords": [
    { "age": 24, "income": 38000, "approved": 0 },
    { "age": 45, "income": 72000, "approved": 1 }
  ],
  "targetColumn": "approved",
  "inputIndex": 0,
  "desiredClass": 1,
  "totalCounterfactuals": 2
}
```

## Response shape

The counterfactual endpoint returns:

- original instance
- predicted class
- desired class
- generated counterfactual rows
- changed features per counterfactual
- distance and change summary
- model and dataset metadata

## Reporting

`POST /rai/v1/dice/report` reuses the existing reporting flow:

1. generate counterfactual output
2. build `output/explanationreport.html` and `output/counterfactuals.csv`
3. zip those artifacts
4. store the zip in the shared workbench database
5. call the reporting service to convert it into the downloadable PDF archive

This keeps report download behavior aligned with the rest of the toolkit.

## Manual validation

1. Start `mongo`, `reporting-tool`, `model-detail`, `ai-explain`, and `dice-counterfactual`.
2. Check health:

```bash
curl http://localhost:8004/health
```

3. Run a DiCE request with a registered LogisticRegression workbench model.
4. Run a DiCE request with a registered RandomForestClassifier workbench model.
5. Verify the existing explainability flow still works:
   - `POST http://localhost:8002/rai/v1/explainability/methods/get`
   - `POST http://localhost:8002/rai/v1/explainability/explanation/get`
6. Generate a DiCE report and download it through the existing reporting endpoint.
