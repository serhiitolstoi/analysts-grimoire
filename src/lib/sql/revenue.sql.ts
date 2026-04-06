// Synthetic plan pricing: Free $0 · Pro $20/mo · Team $50/mo
// (Embedded in SQL via VALUES CTE so it travels with every query)

// Monthly MRR trend + paid subscriber count
export const MRR_TREND_SQL = `
WITH plan_prices AS (
  SELECT * FROM (VALUES ('free', 0), ('pro', 20), ('team', 50)) AS t(plan, monthly_price)
),
months AS (
  SELECT DISTINCT DATE_TRUNC('month', signup_date::DATE) AS month_start
  FROM users
  ORDER BY 1
),
mrr AS (
  SELECT
    m.month_start,
    SUM(pp.monthly_price)                                   AS mrr,
    COUNT(*) FILTER (WHERE s.plan != 'free')                AS paid_subs,
    COUNT(*)                                                AS total_subs,
    SUM(pp.monthly_price) FILTER (WHERE s.plan = 'pro')     AS pro_mrr,
    SUM(pp.monthly_price) FILTER (WHERE s.plan = 'team')    AS team_mrr
  FROM months m
  JOIN subscriptions s ON
        s.started_at::DATE <  m.month_start + INTERVAL 1 MONTH
    AND (s.ended_at IS NULL OR s.ended_at::DATE >= m.month_start)
  JOIN plan_prices pp ON pp.plan = s.plan
  GROUP BY m.month_start
)
SELECT * FROM mrr ORDER BY month_start
`;

// ARPU, avg tenure, and estimated LTV per plan tier
export const PLAN_LTV_SQL = `
WITH plan_prices AS (
  SELECT * FROM (VALUES ('free', 0), ('pro', 20), ('team', 50)) AS t(plan, monthly_price)
),
max_date AS (
  SELECT MAX(ended_at::DATE) AS d FROM subscriptions WHERE ended_at IS NOT NULL
),
sub_stats AS (
  SELECT
    s.plan,
    pp.monthly_price                                              AS arpu,
    COUNT(DISTINCT s.user_id)                                     AS total_users,
    COUNT(*) FILTER (WHERE s.ended_at IS NULL)                    AS active_users,
    ROUND(AVG(
      DATEDIFF('day',
        s.started_at::DATE,
        COALESCE(s.ended_at::DATE, (SELECT d FROM max_date))
      ) / 30.0
    ), 1)                                                         AS avg_months_retained,
    ROUND(AVG(
      pp.monthly_price *
      DATEDIFF('day',
        s.started_at::DATE,
        COALESCE(s.ended_at::DATE, (SELECT d FROM max_date))
      ) / 30.0
    ), 0)                                                         AS avg_ltv
  FROM subscriptions s
  JOIN plan_prices pp ON pp.plan = s.plan
  GROUP BY s.plan, pp.monthly_price
)
SELECT
  plan,
  arpu,
  total_users,
  active_users,
  ROUND(active_users::DOUBLE / NULLIF(total_users, 0) * 100, 1) AS retention_pct,
  avg_months_retained,
  avg_ltv,
  ROUND(avg_ltv * total_users, 0)                               AS total_revenue
FROM sub_stats
ORDER BY arpu DESC
`;

// Cohort-level revenue: total revenue generated per signup cohort
export const COHORT_REVENUE_SQL = `
WITH plan_prices AS (
  SELECT * FROM (VALUES ('free', 0), ('pro', 20), ('team', 50)) AS t(plan, monthly_price)
),
max_date AS (
  SELECT MAX(ended_at::DATE) AS d FROM subscriptions WHERE ended_at IS NOT NULL
),
cohort_rev AS (
  SELECT
    u.cohort_month,
    COUNT(DISTINCT u.user_id)                                     AS cohort_size,
    SUM(pp.monthly_price *
      DATEDIFF('day',
        s.started_at::DATE,
        COALESCE(s.ended_at::DATE, (SELECT d FROM max_date))
      ) / 30.0
    )                                                             AS total_revenue,
    ROUND(AVG(
      pp.monthly_price *
      DATEDIFF('day',
        s.started_at::DATE,
        COALESCE(s.ended_at::DATE, (SELECT d FROM max_date))
      ) / 30.0
    ), 0)                                                         AS avg_ltv_per_user
  FROM users u
  JOIN subscriptions s ON s.user_id = u.user_id
  JOIN plan_prices pp ON pp.plan = s.plan
  WHERE u.onboarding_completed = true
  GROUP BY u.cohort_month
)
SELECT * FROM cohort_rev ORDER BY cohort_month
`;
