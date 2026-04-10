// A/B Testing SQL — splits users 50/50 via hash and compares key product metrics

export const AB_COMPARISON_SQL = `
WITH ab_assignment AS (
  SELECT
    user_id,
    CASE WHEN hash(user_id) % 2 = 0 THEN 'Control' ELSE 'Treatment' END AS ab_group
  FROM users
  WHERE onboarding_completed = true
),
user_metrics AS (
  SELECT
    a.user_id,
    a.ab_group,
    MAX(CASE WHEN e.event_type = 'message_sent'     THEN 1 ELSE 0 END)::INT AS activated,
    MAX(CASE WHEN e.event_type = 'artifact_created' THEN 1 ELSE 0 END)::INT AS used_artifact,
    MAX(CASE WHEN e.event_type = 'code_run'         THEN 1 ELSE 0 END)::INT AS used_code,
    COUNT(CASE WHEN e.event_type = 'message_sent'   THEN 1 END)              AS message_count
  FROM ab_assignment a
  LEFT JOIN events e ON e.user_id = a.user_id
  GROUP BY a.user_id, a.ab_group
)
SELECT
  ab_group,
  COUNT(*)                                         AS n,
  SUM(activated)                                   AS n_activated,
  SUM(used_artifact)                               AS n_artifact,
  SUM(used_code)                                   AS n_code,
  ROUND(AVG(activated::DOUBLE)     * 100, 2)       AS activation_rate,
  ROUND(AVG(used_artifact::DOUBLE) * 100, 2)       AS artifact_rate,
  ROUND(AVG(used_code::DOUBLE)     * 100, 2)       AS code_rate,
  ROUND(AVG(message_count::DOUBLE), 1)             AS avg_messages
FROM user_metrics
GROUP BY ab_group
ORDER BY ab_group
`;

// Weekly WAU trend split by A/B group (shows convergence of two random groups)
export const AB_WEEKLY_SQL = `
WITH ab_assignment AS (
  SELECT
    user_id,
    CASE WHEN hash(user_id) % 2 = 0 THEN 'Control' ELSE 'Treatment' END AS ab_group
  FROM users
  WHERE onboarding_completed = true
),
weekly_metrics AS (
  SELECT
    a.ab_group,
    DATE_TRUNC('week', e.timestamp::DATE) AS week_start,
    COUNT(DISTINCT e.user_id)              AS active_users
  FROM ab_assignment a
  JOIN events e ON e.user_id = a.user_id
  GROUP BY a.ab_group, DATE_TRUNC('week', e.timestamp::DATE)
)
SELECT
  week_start,
  MAX(CASE WHEN ab_group = 'Control'   THEN active_users END) AS control_wau,
  MAX(CASE WHEN ab_group = 'Treatment' THEN active_users END) AS treatment_wau
FROM weekly_metrics
GROUP BY week_start
ORDER BY week_start
`;

// Retention curve per A/B group (week N retention from signup)
export const AB_RETENTION_SQL = `
WITH ab_assignment AS (
  SELECT
    user_id,
    CASE WHEN hash(user_id) % 2 = 0 THEN 'Control' ELSE 'Treatment' END AS ab_group
  FROM users
  WHERE onboarding_completed = true
),
cohort_activity AS (
  SELECT
    a.user_id,
    a.ab_group,
    DATEDIFF('week', u.signup_date::DATE, e.timestamp::DATE) AS week_num
  FROM ab_assignment a
  JOIN users u    ON u.user_id = a.user_id
  JOIN events e   ON e.user_id = a.user_id
  WHERE DATEDIFF('week', u.signup_date::DATE, e.timestamp::DATE) BETWEEN 0 AND 12
)
SELECT
  week_num,
  ab_group,
  COUNT(DISTINCT user_id) AS active_users
FROM cohort_activity
GROUP BY week_num, ab_group
ORDER BY week_num, ab_group
`;
