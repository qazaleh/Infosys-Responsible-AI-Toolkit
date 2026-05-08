from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from counterfactual.api import router


app = FastAPI(
    title='Responsible AI DiCE Counterfactual Service',
    version='1.0.0',
    description='Isolated DiCE-based counterfactual explainability service for tabular models.',
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=False,
    allow_methods=['GET', 'POST'],
    allow_headers=['*'],
)

app.include_router(router)
