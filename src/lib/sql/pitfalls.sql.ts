// Analytics Pitfalls SQL — four classic traps in product data analysis

// ── 1. Simpson's Paradox ─────────────────────────────────────────────────────
// Trap:   paid acquisition looks healthier than organic overall
// Truth:  paid is worse in EVERY plan tier — confounded by plan mix

export const SIMPSONS_AGGREGATE_SQL = `
-- TRAP VIEW: aggregate makes paid look equal/better than organic
SELECT
  acquired_via                                                         AS channel,
  COUNT(*)                                                             AS users,
  SUM(CASE WHEN s.ended_at IS NOT NULL THEN 1 ELSE 0 END)             AS churned,
  ROUND(
    SUM(CASE WHEN s.ended_at IS NOT NULL THEN 1 ELSE 0 END) * 100.0
    / COUNT(*), 1
  )                                                                    AS churn_pct
FROM users u
JOIN subscriptions s ON s.user_id = u.user_id
WHERE acquired_via IN ('organic', 'paid')
GROUP BY acquired_via
ORDER BY acquired_via
`;

export const SIMPSONS_SEGMENTED_SQL = `
-- CORRECT VIEW: segmented by plan — paid is worse in every tier
SELECT
  u.plan,
  acquired_via                                                         AS channel,
  COUNT(*)                                                             AS users,
  ROUND(
    SUM(CASE WHEN s.ended_at IS NOT NULL THEN 1 ELSE 0 END) * 100.0
    / COUNT(*), 1
  )                                                                    AS churn_pct
FROM users u
JOIN subscriptions s ON s.user_id = u.user_id
WHERE acquired_via IN ('organic', 'paid')
GROUP BY u.plan, acquired_via
ORDER BY u.plan, acquired_via
`;

// ── 2. Survivorship Bias ─────────────────────────────────────────────────────
// Trap:   measuring only currently-active users massively inflates retention
// Truth:  include churned users for honest cohort picture

export const SURVIVOR_BIASED_SQL = `
-- TRAP VIEW: only users who had activity in H2 (the "survivors")
SELECT
  u.cohort_month,
  COUNT(DISTINCT u.user_id)                                    AS users_in_sample,
  ROUND(AVG(msg.total_msgs), 0)                                AS avg_messages,
  ROUND(AVG(
    DATEDIFF('day', u.signup_date::DATE, msg.last_seen)
  ), 0)                                                        AS avg_active_days
FROM users u
JOIN (
  SELECT
    user_id,
    COUNT(CASE WHEN event_type = 'message_sent' THEN 1 END) AS total_msgs,
    MAX(timestamp::DATE)                                     AS last_seen
  FROM events
  GROUP BY user_id
) msg ON msg.user_id = u.user_id
WHERE msg.last_seen >= '2024-07-01'   -- ← survivorship filter (the bug)
GROUP BY u.cohort_month
ORDER BY u.cohort_month
`;

export const SURVIVOR_UNBIASED_SQL = `
-- CORRECT VIEW: all users, including those who churned early
SELECT
  u.cohort_month,
  COUNT(DISTINCT u.user_id)                                    AS total_users,
  SUM(CASE WHEN s.ended_at IS NULL THEN 1 ELSE 0 END)         AS still_active,
  ROUND(
    SUM(CASE WHEN s.ended_at IS NULL THEN 1 ELSE 0 END) * 100.0
    / COUNT(*), 1
  )                                                            AS active_pct,
  ROUND(AVG(COALESCE(msg.total_msgs, 0)), 0)                  AS avg_messages_all
FROM users u
JOIN subscriptions s ON s.user_id = u.user_id
LEFT JOIN (
  SELECT user_id,
    COUNT(CASE WHEN event_type = 'message_sent' THEN 1 END) AS total_msgs
  FROM events
  GROUP BY user_id
) msg ON msg.user_id = u.user_id
GROUP BY u.cohort_month
ORDER BY u.cohort_month
`;

// ── 3. Novelty Effect ────────────────────────────────────────────────────────
// Trap:   feature adoption looks great at launch — it's just new-user excitement
// Truth:  week-since-signup curve shows decay to true steady state

export const NOVELTY_SQL = `
-- Artifact adoption rate by week since signup
-- Week 0–2 spike = novelty; flattening after week 4 = true habit rate
SELECT
  DATEDIFF('week', u.signup_date::DATE, e.week_start) AS weeks_since_signup,
  COUNT(DISTINCT e.user_id)                            AS active_users,
  ROUND(
    SUM(e.artifact_events) * 100.0
    / NULLIF(SUM(e.total_events), 0), 1
  )                                                    AS artifact_share_pct,
  ROUND(AVG(e.total_events), 1)                        AS avg_events_per_user
FROM (
  SELECT
    user_id,
    DATE_TRUNC('week', timestamp::DATE)                    AS week_start,
    COUNT(*)                                               AS total_events,
    COUNT(CASE WHEN event_type = 'artifact_created' THEN 1 END) AS artifact_events
  FROM events
  GROUP BY user_id, DATE_TRUNC('week', timestamp::DATE)
) e
JOIN users u ON u.user_id = e.user_id
WHERE DATEDIFF('week', u.signup_date::DATE, e.week_start) BETWEEN 0 AND 16
GROUP BY DATEDIFF('week', u.signup_date::DATE, e.week_start)
ORDER BY 1
`;

// ── 4. Goodhart's Law ────────────────────────────────────────────────────────
// Trap:   messages_sent goes UP when quality drops — looks like engagement win
// Truth:  users are sending more messages because they can't get good answers
// Demonstrates why proxy metrics break when they become targets

export const GOODHARTS_SQL = `
-- When quality drops, messages/user rises but artifact conversion falls
-- Shows the inverse relationship between "engagement" and "value"
SELECT
  DATE_TRUNC('week', timestamp::DATE)                                   AS week_start,
  COUNT(DISTINCT user_id)                                               AS active_users,
  ROUND(
    COUNT(CASE WHEN event_type = 'message_sent' THEN 1 END)::DOUBLE
    / COUNT(DISTINCT user_id), 1
  )                                                                     AS msgs_per_user,
  ROUND(
    COUNT(CASE WHEN event_type = 'artifact_created' THEN 1 END) * 100.0
    / NULLIF(COUNT(CASE WHEN event_type = 'message_sent' THEN 1 END), 0), 2
  )                                                                     AS artifact_conversion_pct,
  ROUND(
    AVG(latency_ms) / 1000.0, 2
  )                                                                     AS avg_latency_s
FROM events
GROUP BY DATE_TRUNC('week', timestamp::DATE)
ORDER BY 1
`;
