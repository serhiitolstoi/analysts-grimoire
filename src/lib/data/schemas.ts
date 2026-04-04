export interface User {
  user_id: string;
  signup_date: string;            // ISO date YYYY-MM-DD
  cohort_month: string;           // YYYY-MM
  plan: "free" | "pro" | "team";
  onboarding_completed: boolean;
  country: string;
  acquired_via: "organic" | "paid" | "referral" | "trial";
}

export interface Event {
  event_id: string;
  user_id: string;
  session_id: string;
  conversation_id: string;
  event_type: "message_sent" | "artifact_created" | "code_run" | "file_upload";
  timestamp: string;              // ISO datetime YYYY-MM-DDTHH:MM:SS
  latency_ms: number;             // response latency
  token_count: number;            // input + output tokens
  model: string;
}

export interface Conversation {
  conversation_id: string;
  user_id: string;
  started_at: string;
  ended_at: string;
  message_count: number;
  has_artifact: boolean;
  has_code: boolean;
  total_tokens: number;
}

export interface Subscription {
  user_id: string;
  plan: "free" | "pro" | "team";
  started_at: string;
  ended_at: string | null;        // null = still active
  churn_reason: "price" | "latency" | "quality" | "competitor" | "inactive" | null;
}

export interface Dataset {
  users: User[];
  events: Event[];
  conversations: Conversation[];
  subscriptions: Subscription[];
}
