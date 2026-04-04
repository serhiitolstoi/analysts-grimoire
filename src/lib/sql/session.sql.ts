export const SESSION_INTENSITY_SQL = `
WITH session_stats AS (
  SELECT
    session_id,
    user_id,
    MIN(timestamp::TIMESTAMP) AS session_start,
    MAX(timestamp::TIMESTAMP) AS session_end,
    COUNT(*) AS event_count,
    SUM(token_count) AS total_tokens,
    COUNT(DISTINCT conversation_id) AS conversation_count,
    SUM(CASE WHEN event_type = 'artifact_created' THEN 1 ELSE 0 END) AS artifact_count,
    SUM(CASE WHEN event_type = 'code_run' THEN 1 ELSE 0 END) AS code_count,
    EPOCH(MAX(timestamp::TIMESTAMP) - MIN(timestamp::TIMESTAMP)) / 60.0 AS duration_min
  FROM events
  GROUP BY session_id, user_id
  HAVING COUNT(*) > 1 AND EPOCH(MAX(timestamp::TIMESTAMP) - MIN(timestamp::TIMESTAMP)) / 60.0 > 0
)
SELECT
  session_id,
  user_id,
  duration_min,
  event_count,
  total_tokens,
  artifact_count,
  code_count,
  CASE
    WHEN duration_min >= 15 AND event_count >= 8 THEN 'deep_work'
    WHEN duration_min >= 5  AND event_count >= 4 THEN 'focused'
    WHEN duration_min >= 2  AND event_count >= 2 THEN 'quick_check'
    ELSE 'glance'
  END AS session_type,
  ROUND(total_tokens::DOUBLE / NULLIF(duration_min, 0), 1) AS token_density
FROM session_stats
ORDER BY RANDOM()
LIMIT 5000
`;
