from fastapi import APIRouter, HTTPException, Query

from app.schemas.ml import (
    ClusterUserRequest,
    ClusterUserResponse,
    SpendingPredictionRequest,
    SpendingPredictionResponse,
)
from app.services.clustering_service import assign_cluster_for_user
from app.services.prediction_service import predict_spending
from app.services.recommendation_service import recommend_career, recommend_investments

router = APIRouter(prefix="/api/v1/ml", tags=["ml"])


@router.post("/cluster-user")
def cluster_user(payload: ClusterUserRequest):
    try:
        data = assign_cluster_for_user(payload.user_id)
        ClusterUserResponse(**data)
        return {"success": True, "data": data}
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Clustering failed") from exc


@router.get("/recommendations/investments")
def investment_recommendations(user_id: str = Query(min_length=1)):
    try:
        data = recommend_investments(user_id)
        return {"success": True, "data": data}
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to fetch recommendations") from exc


@router.get("/recommendations/career")
def career_recommendations(user_id: str = Query(min_length=1)):
    try:
        data = recommend_career(user_id)
        return {"success": True, "data": data}
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to fetch recommendations") from exc


@router.post("/predict/spending")
def spending_prediction(payload: SpendingPredictionRequest):
    try:
        data = predict_spending(payload.user_id, payload.months_ahead)
        SpendingPredictionResponse(**data)
        return {"success": True, "data": data}
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Prediction failed") from exc
