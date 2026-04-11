// Metric Tree: decompose North Star (MRR) into driver metrics
// Each CTE computes one node of the tree

export const METRIC_TREE_SQL = `
WITH plan_prices AS (
  SELECT * FROM (VALUES ('free', 0), ('pro', 20), ('team', 50)) AS t(plan, monthly_price)
),
max_date AS (
  SELECT MAX(signup_date::DATE) AS d FROM users
),
total_signups AS (
  SELECT COUNT(*) AS n FROM users
),
onboarded AS (
  SELECT COUNT(*) AS n FROM users WHERE onboarding_completed = true
),
activated AS (
  SELECT COUNT(DISTINCT user_id) AS n
  FROM events
),
artifact_users AS (
  SELECT COUNT(DISTINCT user_id) AS n
  FROM events WHERE event_type = 'artifact_created'
),
code_users AS (
  SELECT COUNT(DISTINCT user_id) AS n
  FROM events WHERE event_type = 'code_run'
),
paid_subs AS (
  SELECT
    COUNT(*) FILTER (WHERE s.plan != 'free')       AS paid_count,
    COUNT(*) FILTER (WHERE s.plan  = 'pro')        AS pro_count,
    COUNT(*) FILTER (WHERE s.plan  = 'team')       AS team_count,
    SUM(pp.monthly_price)                          AS mrr,
    SUM(pp.monthly_price) FILTER (WHERE s.plan = 'pro')  AS pro_mrr,
    SUM(pp.monthly_price) FILTER (WHERE s.plan = 'team') AS team_mrr
  FROM subscriptions s
  JOIN plan_prices pp ON pp.plan = s.plan
  WHERE s.ended_at IS NULL
),
retention AS (
  SELECT
    ROUND(COUNT(DISTINCT e2.user_id)::DOUBLE /
      NULLIF(COUNT(DISTINCT e1.user_id), 0) * 100, 1) AS week4_retention
  FROM (SELECT DISTINCT user_id FROM events
        WHERE timestamp::DATE <= (SELECT d FROM max_date) - INTERVAL 28 DAYS) e1
  LEFT JOIN (
    SELECT DISTINCT user_id FROM events
    WHERE timestamp::DATE > (SELECT d FROM max_date) - INTERVAL 28 DAYS
  ) e2 ON e2.user_id = e1.user_id
),
session_gaps AS (
  SELECT AVG(gap_days) AS avg_iat_days
  FROM (
    SELECT user_id,
      DATEDIFF('day',
        LAG(timestamp::DATE) OVER (PARTITION BY user_id ORDER BY timestamp),
        timestamp::DATE
      ) AS gap_days
    FROM (SELECT DISTINCT user_id, DATE_TRUNC('day', timestamp::TIMESTAMP) AS timestamp FROM events) d
  ) g
  WHERE gap_days > 0 AND gap_days < 30
)
SELECT
  ts.n                                                          AS total_signups,
  ob.n                                                          AS onboarded,
  ROUND(ob.n::DOUBLE / NULLIF(ts.n, 0) * 100, 1)              AS onboarding_rate,
  ac.n                                                          AS activated_users,
  ROUND(ac.n::DOUBLE / NULLIF(ob.n, 0) * 100, 1)              AS activation_rate,
  au.n                                                          AS artifact_users,
  ROUND(au.n::DOUBLE / NULLIF(ac.n, 0) * 100, 1)              AS artifact_adoption_rate,
  cu.n                                                          AS code_users,
  ROUND(cu.n::DOUBLE / NULLIF(ac.n, 0) * 100, 1)              AS code_adoption_rate,
  ps.paid_count,
  ps.pro_count,
  ps.team_count,
  ROUND(ps.paid_count::DOUBLE / NULLIF(ac.n, 0) * 100, 1)     AS conversion_rate,
  ps.mrr,
  ps.pro_mrr,
  ps.team_mrr,
  ROUND(ps.mrr::DOUBLE / NULLIF(ps.paid_count, 0), 2)         AS arpu,
  r.week4_retention,
  ROUND(sg.avg_iat_days, 1)                                    AS avg_iat_days
FROM total_signups ts, onboarded ob, activated ac, artifact_users au,
     code_users cu, paid_subs ps, retention r, session_gaps sg
`;

// Monthly time-series for each metric node (sparklines)
export const METRIC_SENSITIVITY_SQL = `
WITH plan_prices AS (
  SELECT * FROM (VALUES ('free', 0), ('pro', 20), ('team', 50)) AS t(plan, monthly_price)
),
months AS (
  SELECT DISTINCT DATE_TRUNC('month', signup_date::DATE) AS m FROM users ORDER BY 1
),
monthly AS (
  SELECT
    m.m AS month,
    -- Signups this month
    (SELECT COUNT(*) FROM users WHERE DATE_TRUNC('month', signup_date::DATE) = m.m) AS signups,
    -- Onboarded this month
    (SELECT COUNT(*) FROM users WHERE DATE_TRUNC('month', signup_date::DATE) = m.m AND onboarding_completed = true) AS onboarded,
    -- Active users this month
    (SELECT COUNT(DISTINCT user_id) FROM events WHERE DATE_TRUNC('month', timestamp::DATE) = m.m) AS active_users,
    -- Artifact users this month
    (SELECT COUNT(DISTINCT user_id) FROM events WHERE DATE_TRUNC('month', timestamp::DATE) = m.m AND event_type = 'artifact_created') AS artifact_users,
    -- MRR for this month
    (SELECT COALESCE(SUM(pp.monthly_price), 0)
     FROM subscriptions s JOIN plan_prices pp ON pp.plan = s.plan
     WHERE s.started_at::DATE < m.m + INTERVAL 1 MONTH
       AND (s.ended_at IS NULL OR s.ended_at::DATE >= m.m)) AS mrr,
    -- Paid subs
    (SELECT COUNT(*)
     FROM subscriptions s
     WHERE s.plan != 'free'
       AND s.started_at::DATE < m.m + INTERVAL 1 MONTH
       AND (s.ended_at IS NULL OR s.ended_at::DATE >= m.m)) AS paid_subs
  FROM months m
)
SELECT
  month,
  signups,
  onboarded,
  active_users,
  artifact_users,
  mrr,
  paid_subs,
  ROUND(onboarded::DOUBLE / NULLIF(signups, 0) * 100, 1) AS onboarding_rate,
  ROUND(artifact_users::DOUBLE / NULLIF(active_users, 0) * 100, 1) AS artifact_rate,
  ROUND(mrr::DOUBLE / NULLIF(paid_subs, 0), 2) AS arpu
FROM monthly
ORDER BY month
`;

// Per-user behavioral drivers vs revenue (scatter data)
export const DRIVER_CORRELATION_SQL = `
WITH plan_prices AS (
  SELECT * FROM (VALUES ('free', 0), ('pro', 20), ('team', 50)) AS t(plan, monthly_price)
),
max_date AS (
  SELECT MAX(ended_at::DATE) AS d FROM subscriptions WHERE ended_at IS NOT NULL
),
user_behavior AS (
  SELECT
    e.user_id,
    COUNT(*)                                                    AS total_events,
    COUNT(DISTINCT e.session_id)                                AS sessions,
    COUNT(*) FILTER (WHERE e.event_type = 'artifact_created')   AS artifacts,
    COUNT(DISTINCT DATE_TRUNC('day', e.timestamp::TIMESTAMP))   AS active_days
  FROM events e
  GROUP BY e.user_id
),
user_revenue AS (
  SELECT
    s.user_id,
    s.plan,
    pp.monthly_price *
      DATEDIFF('day', s.started_at::DATE,
        COALESCE(s.ended_at::DATE, (SELECT d FROM max_date))
      ) / 30.0 AS ltv
  FROM subscriptions s
  JOIN plan_prices pp ON pp.plan = s.plan
)
SELECT
  ub.user_id,
  ub.total_events,
  ub.sessions,
  ub.artifacts,
  ub.active_days,
  COALESCE(ur.ltv, 0) AS ltv,
  ur.plan
FROM user_behavior ub
LEFT JOIN user_revenue ur ON ur.user_id = ub.user_id
`;
