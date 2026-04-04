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
