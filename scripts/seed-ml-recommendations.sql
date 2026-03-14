-- Seed minimal ML recommendation data.
-- Safe to run multiple times.

-- 1) Ensure every user has a cluster assignment.
INSERT INTO user_clusters (user_id, cluster_id, confidence_score)
SELECT
  u.id AS user_id,
  (ABS(('x' || SUBSTRING(REPLACE(u.id::text, '-', ''), 1, 8))::bit(32)::int) % 6) AS cluster_id,
  0.82 AS confidence_score
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM user_clusters uc WHERE uc.user_id = u.id
);

-- 2) Seed investments per cluster pattern (idempotent by user + type).
INSERT INTO investments (user_id, investment_type, amount)
SELECT uc.user_id, seeded.investment_type, seeded.amount
FROM user_clusters uc
JOIN LATERAL (
  SELECT 'Index Funds'::varchar AS investment_type, 5000::numeric AS amount
  WHERE uc.cluster_id IN (0, 2, 4)
  UNION ALL
  SELECT 'Gold ETF', 3000
  WHERE uc.cluster_id IN (0, 1, 5)
  UNION ALL
  SELECT 'Mutual Funds', 4000
  WHERE uc.cluster_id IN (1, 3, 4)
  UNION ALL
  SELECT 'Debt Fund', 3500
  WHERE uc.cluster_id IN (1, 5)
) seeded ON TRUE
WHERE NOT EXISTS (
  SELECT 1
  FROM investments i
  WHERE i.user_id = uc.user_id
    AND i.investment_type = seeded.investment_type
);
