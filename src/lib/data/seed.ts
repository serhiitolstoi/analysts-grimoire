import seedrandom from "seedrandom";

export type RNG = ReturnType<typeof createRNG>;

export function createRNG(seed: number | string) {
  const rng = seedrandom(String(seed));

  return {
    /** Uniform [0, 1) */
    random(): number {
      return rng();
    },

    /** Uniform integer [min, max) */
    randInt(min: number, max: number): number {
      return Math.floor(min + rng() * (max - min));
    },

    /** Normal distribution using Box-Muller */
    normal(mean: number, std: number): number {
      const u1 = rng();
      const u2 = rng();
      const z = Math.sqrt(-2 * Math.log(u1 + 1e-10)) * Math.cos(2 * Math.PI * u2);
      return mean + std * z;
    },

    /** Exponential distribution with rate lambda */
    exponential(lambda: number): number {
      return -Math.log(1 - rng() + 1e-10) / lambda;
    },

    /** Log-normal: exp(normal(mu, sigma)) */
    logNormal(mu: number, sigma: number): number {
      const u1 = rng();
      const u2 = rng();
      const z = Math.sqrt(-2 * Math.log(u1 + 1e-10)) * Math.cos(2 * Math.PI * u2);
      return Math.exp(mu + sigma * z);
    },

    /** Pick a random element from an array */
    pick<T>(arr: readonly T[]): T {
      return arr[Math.floor(rng() * arr.length)];
    },

    /** Pick with weights */
    weighted<T>(items: readonly T[], weights: number[]): T {
      const total = weights.reduce((a, b) => a + b, 0);
      let r = rng() * total;
      for (let i = 0; i < items.length; i++) {
        r -= weights[i];
        if (r <= 0) return items[i];
      }
      return items[items.length - 1];
    },

    /** Boolean with given probability */
    chance(p: number): boolean {
      return rng() < p;
    },

    /** Shuffle array in place (Fisher-Yates) */
    shuffle<T>(arr: T[]): T[] {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
  };
}
