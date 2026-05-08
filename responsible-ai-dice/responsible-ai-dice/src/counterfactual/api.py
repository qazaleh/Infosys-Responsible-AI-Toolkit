from __future__ import annotations

from fastapi import APIRouter, HTTPException

from counterfactual.schemas import (
    CounterfactualReportRequest,
    CounterfactualRequest,
    CounterfactualResponse,
    ReportResponse,
)
from counterfactual.service import CounterfactualService


router = APIRouter()
service = CounterfactualService()


@router.get('/health')
def health() -> dict:
    try:
        return service.health()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post('/rai/v1/dice/counterfactual', response_model=CounterfactualResponse)
def generate_counterfactual(payload: CounterfactualRequest) -> CounterfactualResponse:
    try:
        result = service.generate_counterfactual(payload)
        return CounterfactualResponse(
            status='SUCCESS',
            message='Counterfactuals generated successfully.',
            result=result,
        )
    except (FileNotFoundError, NotImplementedError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ImportError as exc:
        raise HTTPException(status_code=500, detail=f'Dependency/import error: {exc}') from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post('/rai/v1/dice/report', response_model=ReportResponse)
def generate_report(payload: CounterfactualReportRequest) -> ReportResponse:
    try:
        response = service.generate_report(payload)
        return ReportResponse(**response)
    except (FileNotFoundError, NotImplementedError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ImportError as exc:
        raise HTTPException(status_code=500, detail=f'Dependency/import error: {exc}') from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
