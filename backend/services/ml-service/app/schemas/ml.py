from typing import Literal

from pydantic import BaseModel, Field


class ClusterUserRequest(BaseModel):
    user_id: str = Field(min_length=1)


class ClusterUserResponse(BaseModel):
    user_id: str
    cluster_id: int
    confidence_score: float
    cluster_label: str


class InvestmentRecommendation(BaseModel):
    name: str
    popularity: float
    reason: str


class CareerRecommendation(BaseModel):
    title: str
    reason: str
    expected_salary_band: str


class SpendingPredictionRequest(BaseModel):
    user_id: str = Field(min_length=1)
    months_ahead: int = Field(default=1, ge=1, le=6)


class SpendingPredictionResponse(BaseModel):
    user_id: str
    predicted_amount: float
    currency: Literal["INR"] = "INR"
    months_ahead: int
