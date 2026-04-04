export const SURVIVAL_PREP_SQL = `
WITH user_lifecycle AS (
  SELECT
    u.user_id,
    u.signup_date::DATE AS signup_date,
    u.plan,
    u.onboarding_completed,
    s.ended_at::DATE AS churn_date,
    s.churn_reason,
    -- Artifact engagement flag
    CASE WHEN COUNT(DISTINCT CASE WHEN e.event_type = 'artifact_created' THEN e.event_id END) > 0
         THEN 1 ELSE 0 END AS is_artifact_user,
    -- High latency exposure
    CASE WHEN MAX(e.latency_ms) > 2000 THEN 1 ELSE 0 END AS had_high_latency,
    -- Days observed
    CASE
      WHEN s.ended_at IS NOT NULL
      THEN DATEDIFF('day', u.signup_date::DATE, s.ended_at::DATE)
      ELSE DATEDIFF('day', u.signup_date::DATE, DATE '2024-12-31')
    END AS days_observed,
    -- Event (churned = 1, censored = 0)
    CASE WHEN s.ended_at IS NOT NULL THEN 1 ELSE 0 END AS churned
  FROM users u
  LEFT JOIN subscriptions s ON s.user_id = u.user_id
  LEFT JOIN events e ON e.user_id = u.user_id
  GROUP BY u.user_id, u.signup_date, u.plan, u.onboarding_completed, s.ended_at, s.churn_reason
)
SELECT
  user_id,
  plan,
  onboarding_completed,
  is_artifact_user,
  had_high_latency,
  GREATEST(days_observed, 1) AS duration,
  churned,
  churn_reason
FROM user_lifecycle
WHERE days_observed IS NOT NULL AND days_observed >= 0
ORDER BY duration
`;
