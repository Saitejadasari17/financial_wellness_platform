from typing import Dict, List

from app.utils.db import get_db_cursor


def _get_or_assign_cluster(user_id: str) -> int:
    with get_db_cursor() as cursor:
        cursor.execute(
            "SELECT cluster_id FROM user_clusters WHERE user_id = %s LIMIT 1",
            (user_id,),
        )
        row = cursor.fetchone()
        if row:
            return int(row["cluster_id"])
    return 0


def recommend_investments(user_id: str) -> List[Dict]:
    cluster_id = _get_or_assign_cluster(user_id)

    with get_db_cursor() as cursor:
        cursor.execute(
            """
            SELECT COUNT(DISTINCT user_id) AS total_users
            FROM user_clusters
            WHERE cluster_id = %s
            """,
            (cluster_id,),
        )
        total_users_row = cursor.fetchone()
        total_users = int(total_users_row["total_users"] or 1)

        cursor.execute(
            """
            SELECT i.investment_type, COUNT(*) AS count
            FROM investments i
            WHERE i.user_id IN (
                SELECT user_id FROM user_clusters WHERE cluster_id = %s
            )
            GROUP BY i.investment_type
            ORDER BY count DESC
            LIMIT 10
            """,
            (cluster_id,),
        )
        rows = cursor.fetchall()

    recommendations: List[Dict] = []
    for row in rows:
        popularity = float(row["count"]) / float(total_users)
        recommendations.append(
            {
                "name": row["investment_type"],
                "popularity": round(popularity, 4),
                "reason": "Popular among users in your group",
            }
        )

    return recommendations


def recommend_career(user_id: str) -> List[Dict]:
    cluster_id = _get_or_assign_cluster(user_id)

    mapping = {
        0: [
            ("Cloud Engineer", "High demand role with strong salary growth", "8L-16L"),
            ("Data Analyst", "Fast entry path with measurable salary uplift", "6L-12L"),
        ],
        1: [
            ("Senior QA Engineer", "Stable growth with certification-driven progress", "9L-18L"),
            ("Project Coordinator", "Transition option with management trajectory", "7L-14L"),
        ],
        2: [
            ("Product Manager", "Better leverage of current income potential", "18L-35L"),
            ("Solutions Architect", "Fits high-earner profile with long-term upside", "20L-40L"),
        ],
        3: [
            ("Junior Software Engineer", "Strong fundamentals and long runway", "5L-10L"),
            ("Support Engineer", "Immediate job entry with learning path", "4L-8L"),
        ],
        4: [
            ("Engineering Manager", "Natural progression from stable mid-career base", "22L-45L"),
            ("Data Engineer", "High-value skill path for experienced professionals", "15L-30L"),
        ],
        5: [
            ("Sales Operations Specialist", "Practical transition with near-term gains", "6L-12L"),
            ("Business Analyst", "Balanced path for income and stability", "7L-14L"),
        ],
    }

    options = mapping.get(cluster_id, mapping[0])
    return [
        {"title": title, "reason": reason, "expected_salary_band": salary}
        for title, reason, salary in options
    ]
