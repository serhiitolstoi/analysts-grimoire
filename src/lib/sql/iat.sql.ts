export const IAT_DISTRIBUTION_SQL = `
WITH user_sessions AS (
  SELECT
    user_id,
    session_id,
    MIN(timestamp::TIMESTAMP) AS session_start
  FROM events
  GROUP BY user_id, session_id
),
ordered AS (
  SELECT
    user_id,
    session_start,
    LAG(session_start) OVER (PARTITION BY user_id ORDER BY session_start) AS prev_start
  FROM user_sessions
),
iat AS (
  SELECT
    user_id,
    EPOCH(session_start - prev_start) / 86400.0 AS iat_days
  FROM ordered
  WHERE prev_start IS NOT NULL
    AND EPOCH(session_start - prev_start) / 86400.0 BETWEEN 0.01 AND 60
)
SELECT
  i.user_id,
  i.iat_days,
  CASE WHEN af.user_id IS NOT NULL THEN 'artifact_user' ELSE 'regular_user' END AS user_type
FROM iat i
LEFT JOIN (
  SELECT DISTINCT user_id
  FROM events
  WHERE event_type = 'artifact_created'
) af ON af.user_id = i.user_id
ORDER BY iat_days
`;

export const IAT_SUMMARY_SQL = `
WITH user_sessions AS (
  SELECT user_id, session_id, MIN(timestamp::TIMESTAMP) AS session_start
  FROM events GROUP BY user_id, session_id
),
ordered AS (
  SELECT
    user_id,
    session_start,
    LAG(session_start) OVER (PARTITION BY user_id ORDER BY session_start) AS prev_start
  FROM user_sessions
),
iat AS (
  SELECT
    user_id,
    EPOCH(session_start - prev_start) / 86400.0 AS iat_days
  FROM ordered
  WHERE prev_start IS NOT NULL
    AND EPOCH(session_start - prev_start) / 86400.0 BETWEEN 0.01 AND 60
),
artifact_users AS (
  SELECT DISTINCT user_id FROM events WHERE event_type = 'artifact_created'
)
SELECT
  CASE WHEN au.user_id IS NOT NULL THEN 'artifact_user' ELSE 'regular_user' END AS user_type,
  COUNT(*) AS n,
  ROUND(AVG(iat_days), 3) AS mean_iat_days,
  ROUND(MEDIAN(iat_days), 3) AS median_iat_days,
  ROUND(STDDEV(iat_days), 3) AS std_iat_days,
  ROUND(1.0 / AVG(iat_days), 4) AS lambda_estimate
FROM iat i
LEFT JOIN artifact_users au ON au.user_id = i.user_id
GROUP BY CASE WHEN au.user_id IS NOT NULL THEN 'artifact_user' ELSE 'regular_user' END
ORDER BY user_type
`;
