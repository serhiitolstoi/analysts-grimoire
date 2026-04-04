/**
 * Master data generator for The Analyst's Grimoire.
 *
 * Produces 12 months of relational event data for a simulated Claude-like AI product.
 *
 * HIDDEN SIGNALS (discoverable through analytics modules):
 *   1. ARTIFACT HABIT:      Users who create artifacts have IAT reduced by 40% (lambda *= 1/0.6)
 *   2. LATENCY-CHURN:       Events with latency_ms > 2000 accumulate frustration → churn spike
 *   3. ONBOARDING BARRIER:  Failed onboarding → power user path blocked → accelerated churn
 *   4. QUALITY ELASTICITY:  Low model quality → fewer artifacts → weaker habit loop → higher churn
 */

import { createRNG } from "./seed";
import type { SimulationParams } from "../simulation/parameters";
import type { Dataset, User, Event, Conversation, Subscription } from "./schemas";

// ─── Constants ──────────────────────────────────────────────────────────────

const SIMULATION_START = new Date("2024-01-01T00:00:00");
const SIMULATION_END   = new Date("2024-12-31T23:59:59");
const TOTAL_USERS = 2200;

const COUNTRIES   = ["US","US","US","GB","DE","CA","FR","AU","IN","BR","JP","NL"] as const;
const CHANNELS    = ["organic","organic","paid","referral","trial"] as const;
const PLANS       = ["free","free","free","pro","pro","team"] as const;
const MODELS      = ["claude-3-5-sonnet","claude-3-5-sonnet","claude-3-opus","claude-3-haiku"];

// Session IAT base: average ~1.8 days between sessions (lambda in days^-1)
const BASE_IAT_LAMBDA = 1 / 1.8;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function addMs(date: Date, ms: number): Date {
  return new Date(date.getTime() + ms);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function uuid(rng: ReturnType<typeof createRNG>, prefix: string): string {
  const hex = () => Math.floor(rng.random() * 0xffff).toString(16).padStart(4, "0");
  return `${prefix}_${hex()}${hex()}${hex()}${hex()}`;
}

function isoDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function isoDateTime(d: Date): string {
  return d.toISOString().slice(0, 19);
}

// Spread users across 12 cohort months with slight growth trend
function buildCohortSchedule(rng: ReturnType<typeof createRNG>): Date[] {
  const dates: Date[] = [];
  const monthWeights = [60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 190];
  const total = monthWeights.reduce((a, b) => a + b, 0);

  for (let m = 0; m < 12; m++) {
    const count = Math.round((monthWeights[m] / total) * TOTAL_USERS);
    const monthStart = new Date(2024, m, 1);
    const monthEnd   = new Date(2024, m + 1, 0, 23, 59, 59);
    for (let i = 0; i < count; i++) {
      const t = monthStart.getTime() + rng.random() * (monthEnd.getTime() - monthStart.getTime());
      dates.push(new Date(t));
    }
  }
  return dates;
}

// ─── Main Generator ──────────────────────────────────────────────────────────

export function generateDataset(params: SimulationParams): Dataset {
  const rng = createRNG(params.seed);

  const users: User[] = [];
  const events: Event[] = [];
  const conversations: Conversation[] = [];
  const subscriptions: Subscription[] = [];

  const signupDates = buildCohortSchedule(rng).sort((a, b) => a.getTime() - b.getTime());

  for (let ui = 0; ui < signupDates.length; ui++) {
    const userId = uuid(rng, "u");
    const signupDate = signupDates[ui];
    const cohortMonth = `${signupDate.getFullYear()}-${String(signupDate.getMonth() + 1).padStart(2, "0")}`;
    const plan = rng.pick(PLANS);
    const country = rng.pick(COUNTRIES);
    const acquiredVia = rng.pick(CHANNELS);

    // Onboarding: higher friction param → more failures
    const onboardingFailed = rng.chance(params.onboardingFriction * 0.7);
    const onboardingCompleted = !onboardingFailed;

    users.push({
      user_id: userId,
      signup_date: isoDate(signupDate),
      cohort_month: cohortMonth,
      plan,
      onboarding_completed: onboardingCompleted,
      country,
      acquired_via: acquiredVia,
    });

    // ── Subscription ─────────────────────────────────────────────────────────
    const subStart = isoDateTime(signupDate);
    let churned = false;
    let churnDate: Date | null = null;
    let churnReason: Subscription["churn_reason"] = null;

    // Compute initial churn probability over the 12 month window
    // Failed onboarding → very high early churn
    let baseChurnProb = onboardingFailed
      ? 0.85
      : plan === "free" ? 0.55 : plan === "pro" ? 0.30 : 0.15;

    subscriptions.push({
      user_id: userId,
      plan,
      started_at: subStart,
      ended_at: null,  // will be filled in below after event simulation
      churn_reason: null,
    });

    // ── Event simulation ─────────────────────────────────────────────────────
    if (onboardingFailed) {
      // No events — failed to activate
      subscriptions[subscriptions.length - 1].ended_at = isoDateTime(
        addDays(signupDate, rng.randInt(1, 5))
      );
      subscriptions[subscriptions.length - 1].churn_reason = "inactive";
      continue;
    }

    // User-level characteristics
    let isArtifactUser = false;          // becomes true after first artifact
    let frustrationScore = 0;            // accumulates from high-latency events
    const frustrationThreshold = rng.randInt(3, 10);  // personal tolerance

    // IAT lambda — artifact users will get this boosted (40% shorter IAT = lambda / 0.6)
    let sessionLambda = BASE_IAT_LAMBDA;

    // Number of active weeks this user generates (geometric distribution)
    const maxWeeks = Math.floor((SIMULATION_END.getTime() - signupDate.getTime()) / (7 * 86_400_000));
    const weeklyRetainProb = onboardingCompleted
      ? (plan === "team" ? 0.93 : plan === "pro" ? 0.88 : 0.78)
      : 0.60;

    let currentDate = addDays(signupDate, rng.exponential(2)); // first session within first few days

    let weekIndex = 0;
    while (
      currentDate < SIMULATION_END &&
      weekIndex < maxWeeks &&
      !churned
    ) {
      // Check if user churns this week from frustration
      if (frustrationScore >= frustrationThreshold) {
        churned = true;
        churnDate = addDays(currentDate, rng.randInt(1, 7));
        churnReason = "latency";
        break;
      }

      // Generate a session
      const sessionId = uuid(rng, "s");
      const sessionStart = currentDate;

      // Number of conversations in this session (1-4)
      const numConversations = rng.randInt(1, 4);
      let sessionEnd = sessionStart;

      for (let ci = 0; ci < numConversations; ci++) {
        const convId = uuid(rng, "c");
        const convStart = addMs(sessionEnd, rng.randInt(500, 30_000));
        let convEnd = convStart;
        let hasArtifact = false;
        let hasCode = false;
        let totalTokens = 0;
        let msgCount = 0;

        // Messages in conversation (2-20)
        const numMessages = rng.randInt(2, plan === "team" ? 20 : 12);

        for (let mi = 0; mi < numMessages; mi++) {
          const eventId = uuid(rng, "e");
          const msgTime = addMs(convEnd, rng.randInt(2_000, 60_000));

          // Latency: log-normal, scaled by latencyFactor
          // Base: mu=6.0, sigma=0.8 → median ~400ms, mean ~500ms
          const rawLatency = rng.logNormal(6.0, 0.8) * params.latencyFactor;
          const latencyMs = clamp(Math.round(rawLatency), 50, 30_000);

          // HIDDEN SIGNAL: high latency accumulates frustration
          if (latencyMs > 2000) {
            frustrationScore += 1;
          }

          // Token count: log-normal
          const tokens = Math.round(clamp(rng.logNormal(6.5, 0.9), 100, 8_000));
          totalTokens += tokens;

          // Event type distribution — quality affects artifact creation
          const artifactProb = 0.18 * params.modelQuality;
          const codeProb = 0.10 * params.modelQuality;

          let eventType: Event["event_type"] = "message_sent";
          const roll = rng.random();
          if (roll < artifactProb) {
            eventType = "artifact_created";
            hasArtifact = true;
            // HIDDEN SIGNAL: first artifact unlocks habit acceleration
            if (!isArtifactUser) {
              isArtifactUser = true;
              sessionLambda = BASE_IAT_LAMBDA / 0.6; // 40% shorter IAT
            }
          } else if (roll < artifactProb + codeProb) {
            eventType = "code_run";
            hasCode = true;
          } else if (roll < artifactProb + codeProb + 0.03) {
            eventType = "file_upload";
          }

          events.push({
            event_id: eventId,
            user_id: userId,
            session_id: sessionId,
            conversation_id: convId,
            event_type: eventType,
            timestamp: isoDateTime(msgTime),
            latency_ms: latencyMs,
            token_count: tokens,
            model: rng.pick(MODELS),
          });

          convEnd = msgTime;
          msgCount++;
        }

        conversations.push({
          conversation_id: convId,
          user_id: userId,
          started_at: isoDateTime(convStart),
          ended_at: isoDateTime(convEnd),
          message_count: msgCount,
          has_artifact: hasArtifact,
          has_code: hasCode,
          total_tokens: totalTokens,
        });

        sessionEnd = convEnd;
      }

      // Advance to next session using IAT
      const iatDays = rng.exponential(sessionLambda);
      currentDate = addDays(sessionEnd, iatDays);
      weekIndex = Math.floor((currentDate.getTime() - signupDate.getTime()) / (7 * 86_400_000));

      // Weekly retention check
      if (!rng.chance(weeklyRetainProb)) {
        churned = true;
        churnDate = addDays(currentDate, rng.randInt(0, 14));
        churnReason = rng.weighted(
          ["price", "quality", "competitor", "inactive"],
          [0.25, 0.25 * (1 - params.modelQuality), 0.15, 0.35]
        ) as Subscription["churn_reason"];
      }
    }

    // Finalize subscription
    const subEntry = subscriptions[subscriptions.length - 1];
    if (churned && churnDate && churnDate < SIMULATION_END) {
      subEntry.ended_at = isoDateTime(churnDate);
      subEntry.churn_reason = churnReason;
    }
  }

  return { users, events, conversations, subscriptions };
}
