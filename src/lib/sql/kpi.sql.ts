// Five live health KPIs computed in a single DuckDB pass
export const KPI_DASHBOARD_SQL = `
WITH onboarded AS (
  SELECT COUNT(DISTINCT user_id) AS n FROM users WHERE onboarding_completed = true
),
activated AS (
  SELECT COUNT(DISTINCT user_id) AS n FROM events WHERE event_type = 'message_sent'
),
artifact_users AS (
  SELECT COUNT(DISTINCT user_id) AS n FROM events WHERE event_type = 'artifact_created'
),
week4_ret AS (
  WITH c AS (
    SELECT user_id, cohort_month, signup_date::DATE AS sd
    FROM users WHERE onboarding_completed = true
  ),
  sizes AS (
    SELECT cohort_month, COUNT(DISTINCT user_id) AS n FROM c GROUP BY cohort_month
  ),
  w4 AS (
    SELECT c.cohort_month, COUNT(DISTINCT c.user_id) AS retained
    FROM c JOIN events e ON e.user_id = c.user_id
    WHERE FLOOR((e.timestamp::DATE - c.sd)::DOUBLE / 7)::INTEGER = 4
    GROUP BY c.cohort_month
  )
  SELECT
    ROUND(AVG(w4.retained::DOUBLE / NULLIF(s.n, 0)) * 100, 1) AS rate
  FROM w4 JOIN sizes s ON s.cohort_month = w4.cohort_month
),
churn_total AS (
  SELECT COUNT(*) AS churned FROM subscriptions WHERE ended_at IS NOT NULL
),
sub_total AS (
  SELECT COUNT(*) AS total FROM subscriptions
),
iat_med AS (
  WITH session_days AS (
    SELECT user_id, timestamp::DATE AS d FROM events
    GROUP BY user_id, timestamp::DATE
  ),
  gaps AS (
    SELECT user_id, d,
      LAG(d) OVER (PARTITION BY user_id ORDER BY d) AS prev_d
    FROM session_days
  )
  SELECT ROUND(
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (d - prev_d)::INTEGER), 1
  ) AS median_iat
  FROM gaps
  WHERE prev_d IS NOT NULL AND (d - prev_d)::INTEGER BETWEEN 1 AND 60
)
SELECT
  ROUND(activated.n::DOUBLE   / NULLIF(onboarded.n, 0) * 100, 1) AS activation_rate,
  COALESCE((SELECT rate FROM week4_ret), 0)                        AS week4_retention,
  ROUND(artifact_users.n::DOUBLE / NULLIF(onboarded.n, 0) * 100, 1) AS artifact_adoption,
  ROUND(churn_total.churned::DOUBLE / NULLIF(sub_total.total, 0) * 100, 1) AS overall_churn_pct,
  COALESCE((SELECT median_iat FROM iat_med), 0)                    AS median_iat_days
FROM onboarded, activated, artifact_users, churn_total, sub_total
`;
