export const RETENTION_HEATMAP_SQL = `
WITH cohorts AS (
  SELECT
    user_id,
    cohort_month,
    signup_date::DATE AS signup_date
  FROM users
  WHERE onboarding_completed = true
),
day_offsets AS (
  SELECT UNNEST(RANGE(0, 90)) AS day_offset
),
cohort_activity AS (
  SELECT
    c.cohort_month,
    c.user_id,
    (e.timestamp::DATE - c.signup_date)::INTEGER AS day_since_signup
  FROM cohorts c
  JOIN events e ON e.user_id = c.user_id
  WHERE (e.timestamp::DATE - c.signup_date)::INTEGER BETWEEN 0 AND 89
),
cohort_sizes AS (
  SELECT cohort_month, COUNT(DISTINCT user_id) AS cohort_size
  FROM cohorts
  GROUP BY cohort_month
),
retention AS (
  SELECT
    ca.cohort_month,
    d.day_offset,
    COUNT(DISTINCT CASE WHEN ca.day_since_signup = d.day_offset THEN ca.user_id END) AS active_users,
    cs.cohort_size
  FROM cohort_activity ca
  CROSS JOIN day_offsets d
  JOIN cohort_sizes cs ON cs.cohort_month = ca.cohort_month
  GROUP BY ca.cohort_month, d.day_offset, cs.cohort_size
)
SELECT
  r.cohort_month,
  r.day_offset,
  r.active_users,
  r.cohort_size,
  ROUND(r.active_users::DOUBLE / NULLIF(r.cohort_size, 0), 4) AS retention_rate
FROM retention r
WHERE r.cohort_size > 0
ORDER BY r.cohort_month, r.day_offset
`;

export const WEEKLY_RETENTION_SQL = `
WITH cohorts AS (
  SELECT user_id, cohort_month, signup_date::DATE AS signup_date
  FROM users WHERE onboarding_completed = true
),
cohort_sizes AS (
  SELECT cohort_month, COUNT(DISTINCT user_id) AS cohort_size
  FROM cohorts GROUP BY cohort_month
),
weekly_activity AS (
  SELECT
    c.cohort_month,
    c.user_id,
    FLOOR((e.timestamp::DATE - c.signup_date)::DOUBLE / 7)::INTEGER AS week_number
  FROM cohorts c
  JOIN events e ON e.user_id = c.user_id
  WHERE (e.timestamp::DATE - c.signup_date)::INTEGER BETWEEN 0 AND 83
),
retention AS (
  SELECT
    wa.cohort_month,
    wa.week_number,
    COUNT(DISTINCT wa.user_id) AS retained
  FROM weekly_activity wa
  GROUP BY wa.cohort_month, wa.week_number
)
SELECT
  r.cohort_month,
  r.week_number,
  r.retained,
  cs.cohort_size,
  ROUND(r.retained::DOUBLE / NULLIF(cs.cohort_size,0), 4) AS retention_rate
FROM retention r
JOIN cohort_sizes cs ON r.cohort_month = cs.cohort_month
ORDER BY r.cohort_month, r.week_number
`;

// N-Day retention: D1, D7, D14, D30, D60, D90 benchmarks per cohort
export const NDAY_RETENTION_SQL = `
WITH cohorts AS (
  SELECT user_id, cohort_month, signup_date::DATE AS signup_date
  FROM users WHERE onboarding_completed = true
),
cohort_sizes AS (
  SELECT cohort_month, COUNT(DISTINCT user_id) AS cohort_size
  FROM cohorts GROUP BY cohort_month
),
cohort_activity AS (
  SELECT
    c.cohort_month,
    c.user_id,
    (e.timestamp::DATE - c.signup_date)::INTEGER AS day_since_signup
  FROM cohorts c
  JOIN events e ON e.user_id = c.user_id
  WHERE (e.timestamp::DATE - c.signup_date)::INTEGER BETWEEN 0 AND 90
),
benchmarks(day_offset) AS (
  VALUES (1), (7), (14), (30), (60), (90)
)
SELECT
  ca.cohort_month,
  b.day_offset,
  COUNT(DISTINCT CASE WHEN ca.day_since_signup = b.day_offset THEN ca.user_id END) AS retained,
  cs.cohort_size,
  ROUND(
    COUNT(DISTINCT CASE WHEN ca.day_since_signup = b.day_offset THEN ca.user_id END)::DOUBLE
    / NULLIF(cs.cohort_size, 0),
    4
  ) AS retention_rate
FROM cohort_activity ca
CROSS JOIN benchmarks b
JOIN cohort_sizes cs ON cs.cohort_month = ca.cohort_month
GROUP BY ca.cohort_month, b.day_offset, cs.cohort_size
ORDER BY ca.cohort_month, b.day_offset
`;

// Segment comparison: artifact creators vs. non-creators weekly retention
export const SEGMENT_RETENTION_SQL = `
WITH artifact_users AS (
  SELECT DISTINCT user_id FROM events WHERE event_type = 'artifact_created'
),
cohorts AS (
  SELECT
    u.user_id,
    u.cohort_month,
    u.signup_date::DATE AS signup_date,
    CASE WHEN au.user_id IS NOT NULL THEN 'Artifact Creators' ELSE 'Non-Creators' END AS segment
  FROM users u
  LEFT JOIN artifact_users au ON au.user_id = u.user_id
  WHERE u.onboarding_completed = true
),
cohort_sizes AS (
  SELECT segment, COUNT(DISTINCT user_id) AS cohort_size
  FROM cohorts GROUP BY segment
),
weekly_activity AS (
  SELECT
    c.segment,
    c.user_id,
    FLOOR((e.timestamp::DATE - c.signup_date)::DOUBLE / 7)::INTEGER AS week_number
  FROM cohorts c
  JOIN events e ON e.user_id = c.user_id
  WHERE (e.timestamp::DATE - c.signup_date)::INTEGER BETWEEN 0 AND 83
),
retention AS (
  SELECT
    segment,
    week_number,
    COUNT(DISTINCT user_id) AS retained
  FROM weekly_activity
  GROUP BY segment, week_number
)
SELECT
  r.segment AS cohort_month,
  r.week_number,
  r.retained,
  cs.cohort_size,
  ROUND(r.retained::DOUBLE / NULLIF(cs.cohort_size, 0), 4) AS retention_rate
FROM retention r
JOIN cohort_sizes cs ON cs.segment = r.segment
ORDER BY r.segment, r.week_number
`;
