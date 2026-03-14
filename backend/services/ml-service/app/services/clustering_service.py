from typing import Dict, List

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

from app.config import settings
from app.utils.db import get_db_cursor


CLUSTER_LABELS = {
    0: "Young Overspenders",
    1: "Debt-Burdened Mid-Career",
    2: "High Earners Lost",
    3: "Fresh Starters",
    4: "Mid-Career Stable",
    5: "Struggling Earners",
}


def _fetch_training_rows() -> List[Dict]:
    with get_db_cursor() as cursor:
        cursor.execute(
            """
            SELECT
                u.id AS user_id,
                COALESCE(u.age, 30) AS age,
                COALESCE(u.monthly_income, 0) AS income,
                COALESCE(
                    SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END),
                    0
                ) AS total_income,
                COALESCE(
                    SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END),
                    0
                ) AS total_expense,
                COALESCE(
                    SUM(CASE WHEN t.type = 'expense' AND LOWER(t.category) = 'food' THEN t.amount ELSE 0 END),
                    0
                ) AS food_expense,
                COALESCE(
                    SUM(CASE WHEN t.type = 'emi' THEN t.amount ELSE 0 END),
                    0
                ) AS emi_total,
                CASE WHEN COUNT(i.id) > 0 THEN 1 ELSE 0 END AS has_investments
            FROM users u
            LEFT JOIN transactions t ON t.user_id = u.id
            LEFT JOIN investments i ON i.user_id = u.id
            GROUP BY u.id, u.age, u.monthly_income
            """
        )
        return [dict(row) for row in cursor.fetchall()]


def _build_feature_matrix(rows: List[Dict]) -> np.ndarray:
    features: List[List[float]] = []
    for row in rows:
        income = float(row["income"] or 0)
        total_income = float(row["total_income"] or 0)
        total_expense = float(row["total_expense"] or 0)
        food_expense = float(row["food_expense"] or 0)
        emi_total = float(row["emi_total"] or 0)
        has_investments = int(row["has_investments"] or 0)

        income_for_ratio = total_income if total_income > 0 else max(income, 1.0)
        savings_rate = max((income_for_ratio - total_expense) / income_for_ratio, -1.0)
        food_spending_ratio = food_expense / income_for_ratio
        emi_debt_ratio = emi_total / max(income, 1.0)

        features.append(
            [
                float(row["age"]) / 100.0,
                income / 200000.0,
                savings_rate,
                food_spending_ratio,
                emi_debt_ratio,
                float(has_investments),
            ]
        )

    return np.array(features, dtype=np.float64)


def _cluster_rows(rows: List[Dict]) -> pd.DataFrame:
    if not rows:
        return pd.DataFrame(columns=["user_id", "cluster_id", "confidence_score"])

    matrix = _build_feature_matrix(rows)
    cluster_count = min(settings.cluster_count, len(rows))
    scaler = StandardScaler()
    matrix_scaled = scaler.fit_transform(matrix)
    kmeans = KMeans(n_clusters=cluster_count, random_state=settings.random_state, n_init=10)
    labels = kmeans.fit_predict(matrix_scaled)

    distances = kmeans.transform(matrix_scaled)
    min_distances = distances[np.arange(len(labels)), labels]
    confidence = (1.0 / (1.0 + min_distances)).clip(0.0, 1.0)

    return pd.DataFrame(
        {
            "user_id": [row["user_id"] for row in rows],
            "cluster_id": labels.astype(int),
            "confidence_score": confidence.astype(float),
        }
    )


def assign_cluster_for_user(user_id: str) -> Dict:
    rows = _fetch_training_rows()
    clusters_df = _cluster_rows(rows)
    if clusters_df.empty:
        raise ValueError("No users available for clustering")

    target = clusters_df.loc[clusters_df["user_id"] == user_id]
    if target.empty:
        raise ValueError("User not found in training dataset")

    cluster_id = int(target.iloc[0]["cluster_id"])
    confidence_score = float(target.iloc[0]["confidence_score"])

    with get_db_cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO user_clusters (user_id, cluster_id, confidence_score, updated_at)
            VALUES (%s, %s, %s, NOW())
            ON CONFLICT (user_id) DO UPDATE SET
              cluster_id = EXCLUDED.cluster_id,
              confidence_score = EXCLUDED.confidence_score,
              updated_at = NOW()
            """,
            (user_id, cluster_id, confidence_score),
        )

    return {
        "user_id": user_id,
        "cluster_id": cluster_id,
        "confidence_score": round(confidence_score, 4),
        "cluster_label": CLUSTER_LABELS.get(cluster_id, "General Segment"),
    }
