from typing import Dict

from app.utils.db import get_db_cursor


def predict_spending(user_id: str, months_ahead: int) -> Dict:
    with get_db_cursor() as cursor:
        cursor.execute(
            """
            WITH monthly_expenses AS (
              SELECT
                DATE_TRUNC('month', transaction_date)::date AS month,
                SUM(amount) AS total
              FROM transactions
              WHERE user_id = %s AND type IN ('expense', 'emi')
              GROUP BY DATE_TRUNC('month', transaction_date)
              ORDER BY month DESC
              LIMIT 6
            )
            SELECT COALESCE(AVG(total), 0) AS avg_expense
            FROM monthly_expenses
            """,
            (user_id,),
        )
        avg_row = cursor.fetchone()

    avg_expense = float(avg_row["avg_expense"] or 0)
    growth_factor = 1 + (0.015 * months_ahead)
    predicted = avg_expense * growth_factor

    return {
        "user_id": user_id,
        "predicted_amount": round(predicted, 2),
        "currency": "INR",
        "months_ahead": months_ahead,
    }
