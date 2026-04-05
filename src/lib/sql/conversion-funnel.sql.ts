export const CONVERSION_FUNNEL_SQL = `
WITH signup_events AS (
  SELECT user_id, signup_date::TIMESTAMP AS t FROM users
),
first_message AS (
  SELECT user_id, MIN(timestamp::TIMESTAMP) AS t
  FROM events WHERE event_type = 'message_sent'
  GROUP BY user_id
),
first_artifact AS (
  SELECT user_id, MIN(timestamp::TIMESTAMP) AS t
  FROM events WHERE event_type = 'artifact_created'
  GROUP BY user_id
),
first_code AS (
  SELECT user_id, MIN(timestamp::TIMESTAMP) AS t
  FROM events WHERE event_type = 'code_run'
  GROUP BY user_id
),
funnel AS (
  SELECT
    s.user_id,
    EPOCH(fm.t - s.t) / 3600.0     AS hours_to_first_message,
    EPOCH(fa.t - fm.t) / 3600.0    AS hours_to_first_artifact,
    EPOCH(fc.t - fm.t) / 3600.0    AS hours_to_first_code
  FROM signup_events s
  LEFT JOIN first_message fm ON fm.user_id = s.user_id
  LEFT JOIN first_artifact fa ON fa.user_id = s.user_id
  LEFT JOIN first_code fc ON fc.user_id = s.user_id
  WHERE fm.t IS NOT NULL
)
SELECT
  'signup_to_message' AS step,
  COUNT(*) AS n,
  ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY hours_to_first_message), 2) AS p25,
  ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY hours_to_first_message), 2) AS p50,
  ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY hours_to_first_message), 2) AS p75,
  ROUND(PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY hours_to_first_message), 2) AS p90
FROM funnel WHERE hours_to_first_message BETWEEN 0 AND 720

UNION ALL

SELECT
  'message_to_artifact' AS step,
  COUNT(*) AS n,
  ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY hours_to_first_artifact), 2) AS p25,
  ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY hours_to_first_artifact), 2) AS p50,
  ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY hours_to_first_artifact), 2) AS p75,
  ROUND(PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY hours_to_first_artifact), 2) AS p90
FROM funnel WHERE hours_to_first_artifact BETWEEN 0 AND 720

UNION ALL

SELECT
  'message_to_code' AS step,
  COUNT(*) AS n,
  ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY hours_to_first_code), 2) AS p25,
  ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY hours_to_first_code), 2) AS p50,
  ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY hours_to_first_code), 2) AS p75,
  ROUND(PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY hours_to_first_code), 2) AS p90
FROM funnel WHERE hours_to_first_code BETWEEN 0 AND 720

ORDER BY step
`;

// Classic drop-off funnel: how many users reach each activation milestone
export const CONVERSION_DROPOFF_SQL = `
WITH base AS (
  SELECT COUNT(DISTINCT user_id) AS total
  FROM users
  WHERE onboarding_completed = true
),
messaged AS (
  SELECT COUNT(DISTINCT user_id) AS n
  FROM events WHERE event_type = 'message_sent'
),
artifacted AS (
  SELECT COUNT(DISTINCT user_id) AS n
  FROM events WHERE event_type = 'artifact_created'
),
coded AS (
  SELECT COUNT(DISTINCT user_id) AS n
  FROM events WHERE event_type = 'code_run'
),
returned AS (
  -- Users with at least 2 distinct session days
  SELECT COUNT(*) AS n FROM (
    SELECT user_id
    FROM events
    GROUP BY user_id
    HAVING COUNT(DISTINCT timestamp::DATE) >= 2
  ) t
)
SELECT 1 AS seq, 'Completed Onboarding'   AS step, base.total      AS users, 100.0 AS pct_of_top FROM base
UNION ALL
SELECT 2,        'Sent First Message',     messaged.n,   ROUND(messaged.n::DOUBLE   / NULLIF(base.total,0)*100,1) FROM messaged,   base
UNION ALL
SELECT 3,        'Created First Artifact', artifacted.n, ROUND(artifacted.n::DOUBLE / NULLIF(base.total,0)*100,1) FROM artifacted, base
UNION ALL
SELECT 4,        'Ran First Code Block',   coded.n,      ROUND(coded.n::DOUBLE      / NULLIF(base.total,0)*100,1) FROM coded,      base
UNION ALL
SELECT 5,        'Returned (Day 2+)',       returned.n,   ROUND(returned.n::DOUBLE   / NULLIF(base.total,0)*100,1) FROM returned,   base
ORDER BY seq
`;

// Per-plan funnel: drop-off rates broken out by subscription plan
export const CONVERSION_BY_PLAN_SQL = `
WITH base AS (
  SELECT u.plan, COUNT(DISTINCT u.user_id) AS total
  FROM users u WHERE u.onboarding_completed = true
  GROUP BY u.plan
),
msg AS (
  SELECT u.plan, COUNT(DISTINCT e.user_id) AS n
  FROM events e JOIN users u ON u.user_id = e.user_id
  WHERE e.event_type = 'message_sent' GROUP BY u.plan
),
art AS (
  SELECT u.plan, COUNT(DISTINCT e.user_id) AS n
  FROM events e JOIN users u ON u.user_id = e.user_id
  WHERE e.event_type = 'artifact_created' GROUP BY u.plan
)
SELECT
  b.plan,
  b.total                                                   AS onboarded,
  COALESCE(m.n, 0)                                          AS messaged,
  COALESCE(a.n, 0)                                          AS artifact,
  ROUND(COALESCE(m.n,0)::DOUBLE / NULLIF(b.total,0)*100,1) AS msg_pct,
  ROUND(COALESCE(a.n,0)::DOUBLE / NULLIF(b.total,0)*100,1) AS art_pct
FROM base b
LEFT JOIN msg m ON m.plan = b.plan
LEFT JOIN art a ON a.plan = b.plan
ORDER BY b.plan
`;
