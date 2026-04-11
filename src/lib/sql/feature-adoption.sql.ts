// Feature Adoption: S-curves, depth analysis, power users, time-to-adopt

// Cumulative adoption curves per feature type over time
export const ADOPTION_CURVE_SQL = `
WITH activated AS (
  SELECT COUNT(DISTINCT user_id) AS total FROM events
),
first_use AS (
  SELECT
    user_id,
    event_type,
    MIN(timestamp::DATE) AS first_used_on
  FROM events
  WHERE event_type IN ('artifact_created', 'code_run', 'file_upload')
  GROUP BY user_id, event_type
),
weekly AS (
  SELECT
    event_type,
    DATE_TRUNC('week', first_used_on) AS week,
    COUNT(DISTINCT user_id) AS new_adopters
  FROM first_use
  GROUP BY event_type, DATE_TRUNC('week', first_used_on)
)
SELECT
  w.event_type,
  w.week,
  w.new_adopters,
  SUM(w.new_adopters) OVER (PARTITION BY w.event_type ORDER BY w.week) AS cumulative_adopters,
  ROUND(SUM(w.new_adopters) OVER (PARTITION BY w.event_type ORDER BY w.week)::DOUBLE
    / (SELECT total FROM activated) * 100, 1) AS adoption_pct
FROM weekly w
ORDER BY w.event_type, w.week
`;

// Per-user feature depth and retention
export const ADOPTION_DEPTH_SQL = `
WITH user_features AS (
  SELECT
    e.user_id,
    COUNT(DISTINCT e.event_type) FILTER (
      WHERE e.event_type IN ('artifact_created', 'code_run', 'file_upload')
    ) AS feature_depth,
    COUNT(DISTINCT e.session_id) AS sessions,
    BOOL_OR(e.event_type = 'artifact_created') AS has_artifact,
    BOOL_OR(e.event_type = 'code_run') AS has_code,
    BOOL_OR(e.event_type = 'file_upload') AS has_upload
  FROM events e
  GROUP BY e.user_id
),
user_status AS (
  SELECT
    s.user_id,
    s.plan,
    CASE WHEN s.ended_at IS NULL THEN false ELSE true END AS is_churned
  FROM subscriptions s
)
SELECT
  CASE
    WHEN uf.feature_depth = 0 THEN '0 features'
    WHEN uf.feature_depth = 1 THEN '1 feature'
    WHEN uf.feature_depth = 2 THEN '2 features'
    ELSE '3+ features'
  END AS depth_bucket,
  COUNT(*) AS user_count,
  ROUND(AVG(uf.sessions), 1) AS avg_sessions,
  ROUND(COUNT(*) FILTER (WHERE us.is_churned = false)::DOUBLE /
    NULLIF(COUNT(*), 0) * 100, 1) AS retention_pct,
  ROUND(COUNT(*) FILTER (WHERE us.plan != 'free')::DOUBLE /
    NULLIF(COUNT(*), 0) * 100, 1) AS paid_pct
FROM user_features uf
LEFT JOIN user_status us ON us.user_id = uf.user_id
GROUP BY depth_bucket
ORDER BY depth_bucket
`;

// Power users vs single-feature users
export const POWER_USER_SQL = `
WITH plan_prices AS (
  SELECT * FROM (VALUES ('free', 0), ('pro', 20), ('team', 50)) AS t(plan, monthly_price)
),
max_date AS (
  SELECT MAX(ended_at::DATE) AS d FROM subscriptions WHERE ended_at IS NOT NULL
),
user_features AS (
  SELECT
    e.user_id,
    COUNT(DISTINCT e.event_type) FILTER (
      WHERE e.event_type IN ('artifact_created', 'code_run', 'file_upload')
    ) AS feature_depth,
    COUNT(DISTINCT e.session_id) AS sessions
  FROM events e
  GROUP BY e.user_id
),
user_revenue AS (
  SELECT
    s.user_id,
    s.plan,
    CASE WHEN s.ended_at IS NULL THEN false ELSE true END AS is_churned,
    pp.monthly_price *
      DATEDIFF('day', s.started_at::DATE,
        COALESCE(s.ended_at::DATE, (SELECT d FROM max_date))
      ) / 30.0 AS ltv,
    DATEDIFF('day', s.started_at::DATE,
      COALESCE(s.ended_at::DATE, (SELECT d FROM max_date))
    ) / 30.0 AS tenure_months
  FROM subscriptions s
  JOIN plan_prices pp ON pp.plan = s.plan
),
segments AS (
  SELECT
    uf.user_id,
    CASE
      WHEN uf.feature_depth >= 3 AND uf.sessions >= 10 THEN 'Power User'
      WHEN uf.feature_depth = 1 THEN 'Single Feature'
      ELSE 'Multi Feature'
    END AS segment,
    uf.sessions,
    uf.feature_depth,
    COALESCE(ur.ltv, 0) AS ltv,
    COALESCE(ur.tenure_months, 0) AS tenure_months,
    COALESCE(ur.is_churned, true) AS is_churned
  FROM user_features uf
  LEFT JOIN user_revenue ur ON ur.user_id = uf.user_id
)
SELECT
  segment,
  COUNT(*) AS user_count,
  ROUND(AVG(sessions), 1) AS avg_sessions,
  ROUND(AVG(feature_depth), 1) AS avg_depth,
  ROUND(AVG(ltv), 0) AS avg_ltv,
  ROUND(AVG(tenure_months), 1) AS avg_tenure_months,
  ROUND(COUNT(*) FILTER (WHERE is_churned = false)::DOUBLE /
    NULLIF(COUNT(*), 0) * 100, 1) AS retention_pct
FROM segments
GROUP BY segment
ORDER BY avg_ltv DESC
`;

// Time-to-adopt: days from signup to first use of each feature
export const TIME_TO_ADOPT_SQL = `
WITH first_use AS (
  SELECT
    e.user_id,
    e.event_type,
    MIN(e.timestamp::DATE) AS first_used_on
  FROM events e
  WHERE e.event_type IN ('artifact_created', 'code_run', 'file_upload')
  GROUP BY e.user_id, e.event_type
)
SELECT
  fu.event_type,
  DATEDIFF('day', u.signup_date::DATE, fu.first_used_on) AS days_to_adopt,
  COUNT(*) AS user_count
FROM first_use fu
JOIN users u ON u.user_id = fu.user_id
WHERE DATEDIFF('day', u.signup_date::DATE, fu.first_used_on) >= 0
GROUP BY fu.event_type, days_to_adopt
ORDER BY fu.event_type, days_to_adopt
`;
