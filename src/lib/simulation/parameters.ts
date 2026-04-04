export interface SimulationParams {
  latencyFactor: number;      // 0.5 – 3.0, multiplier on base response latency
  modelQuality: number;       // 0.0 – 1.0, affects artifact creation rate + message quality
  onboardingFriction: number; // 0.0 – 1.0, fraction of users who fail onboarding
  seed: number;               // deterministic PRNG seed
}

export const DEFAULT_PARAMS: SimulationParams = {
  latencyFactor: 1.0,
  modelQuality: 0.7,
  onboardingFriction: 0.3,
  seed: 42,
};

export const PARAM_RANGES = {
  latencyFactor:      { min: 0.5, max: 3.0, step: 0.05, label: "System Latency", unit: "x" },
  modelQuality:       { min: 0.0, max: 1.0, step: 0.01, label: "Model Quality",   unit: "%" },
  onboardingFriction: { min: 0.0, max: 1.0, step: 0.01, label: "Onboarding Friction", unit: "%" },
} as const;
