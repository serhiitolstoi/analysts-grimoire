// Weekly engagement time series: WAU, new users, churned users
export const WEEKLY_ENGAGEMENT_SQL = `
WITH weekly_active AS (
  SELECT
    DATE_TRUNC('week', timestamp::DATE) AS week_start,
    COUNT(DISTINCT user_id)             AS wau
  FROM events
  GROUP BY 1
),
weekly_new AS (
  SELECT
    DATE_TRUNC('week', signup_date::DATE) AS week_start,
    COUNT(*)                               AS new_users
  FROM users
  WHERE onboarding_completed = true
  GROUP BY 1
),
weekly_churned AS (
  SELECT
    DATE_TRUNC('week', ended_at::DATE) AS week_start,
    COUNT(*)                            AS churned_users
  FROM subscriptions
  WHERE ended_at IS NOT NULL
  GROUP BY 1
)
SELECT
  wa.week_start,
  wa.wau,
  COALESCE(wn.new_users,     0) AS new_users,
  COALESCE(wc.churned_users, 0) AS churned_users,
  wa.wau - COALESCE(wn.new_users, 0) AS returning_users
FROM weekly_active wa
LEFT JOIN weekly_new     wn ON wn.week_start = wa.week_start
LEFT JOIN weekly_churned wc ON wc.week_start = wa.week_start
ORDER BY wa.week_start
`;

// Daily active users (last 90 days of the sim period)
export const DAU_SQL = `
WITH date_range AS (
  SELECT
    MIN(timestamp::DATE) AS min_d,
    MAX(timestamp::DATE) AS max_d
  FROM events
)
SELECT
  timestamp::DATE                     AS day,
  COUNT(DISTINCT user_id)             AS dau,
  COUNT(DISTINCT session_id)          AS sessions,
  COUNT(*)                            AS total_events
FROM events, date_range
WHERE timestamp::DATE >= date_range.max_d - INTERVAL 90 DAYS
GROUP BY 1
ORDER BY 1
`;

// Event-type mix over time (weekly share)
export const EVENT_MIX_SQL = `
SELECT
  DATE_TRUNC('week', timestamp::DATE) AS week_start,
  event_type,
  COUNT(*)                            AS n
FROM events
GROUP BY 1, 2
ORDER BY 1, 2
`;
