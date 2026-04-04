/**
 * Transition Matrix SQL — Markov chain state transitions.
 * States: 'casual' (<3 events/week), 'active' (3-9), 'power' (10+), 'churned' (no events next week)
 */

export const TRANSITION_MATRIX_SQL = `
WITH weekly_activity AS (
  SELECT
    user_id,
    DATE_TRUNC('week', timestamp::TIMESTAMP) AS week,
    COUNT(*) AS event_count,
    COUNT(DISTINCT session_id) AS session_count,
    SUM(token_count) AS total_tokens
  FROM events
  GROUP BY user_id, DATE_TRUNC('week', timestamp::TIMESTAMP)
),
user_states AS (
  SELECT
    user_id,
    week,
    CASE
      WHEN event_count >= 10 THEN 'power'
      WHEN event_count >= 3  THEN 'active'
      ELSE 'casual'
    END AS state
  FROM weekly_activity
),
transitions AS (
  SELECT
    a.state          AS from_state,
    COALESCE(b.state, 'churned') AS to_state,
    COUNT(*)         AS n
  FROM user_states a
  LEFT JOIN user_states b
    ON  a.user_id = b.user_id
    AND b.week = a.week + INTERVAL '7 days'
  GROUP BY a.state, COALESCE(b.state, 'churned')
),
totals AS (
  SELECT from_state, SUM(n) AS total FROM transitions GROUP BY from_state
)
SELECT
  t.from_state,
  t.to_state,
  t.n,
  ROUND(t.n::DOUBLE / tot.total, 4) AS probability
FROM transitions t
JOIN totals tot ON t.from_state = tot.from_state
ORDER BY t.from_state, t.to_state
`;

/** Same matrix but only for events where system latency was high (>2s).
    Reveals the latency-churn hidden signal. */
export const TRANSITION_MATRIX_HIGH_LATENCY_SQL = `
WITH high_lat_users AS (
  SELECT DISTINCT user_id
  FROM events
  WHERE latency_ms > 2000
  GROUP BY user_id
  HAVING COUNT(*) >= 3
),
weekly_activity AS (
  SELECT
    e.user_id,
    DATE_TRUNC('week', e.timestamp::TIMESTAMP) AS week,
    COUNT(*) AS event_count
  FROM events e
  WHERE e.user_id IN (SELECT user_id FROM high_lat_users)
  GROUP BY e.user_id, DATE_TRUNC('week', e.timestamp::TIMESTAMP)
),
user_states AS (
  SELECT
    user_id,
    week,
    CASE
      WHEN event_count >= 10 THEN 'power'
      WHEN event_count >= 3  THEN 'active'
      ELSE 'casual'
    END AS state
  FROM weekly_activity
),
transitions AS (
  SELECT
    a.state AS from_state,
    COALESCE(b.state, 'churned') AS to_state,
    COUNT(*) AS n
  FROM user_states a
  LEFT JOIN user_states b
    ON  a.user_id = b.user_id
    AND b.week = a.week + INTERVAL '7 days'
  GROUP BY a.state, COALESCE(b.state, 'churned')
),
totals AS (
  SELECT from_state, SUM(n) AS total FROM transitions GROUP BY from_state
)
SELECT
  t.from_state,
  t.to_state,
  t.n,
  ROUND(t.n::DOUBLE / tot.total, 4) AS probability
FROM transitions t
JOIN totals tot ON t.from_state = tot.from_state
ORDER BY t.from_state, t.to_state
`;
