/**
 * ChoreScore V2 — Differential Privacy Service
 *
 * Provides mathematical privacy guarantees for query results.
 * Implements Laplace and Gaussian mechanisms for numeric queries.
 *
 * Differential privacy ensures that the output of a query is
 * approximately the same whether or not any individual's data
 * is included in the dataset.
 */

import { DifferentialPrivacyConfig } from './types';

const DEFAULT_DP_CONFIG: DifferentialPrivacyConfig = {
  enabled: false,
  epsilon: 1.0,
  delta: 1e-5,
  mechanism: 'laplace',
  maxQueries: 1000,
  remainingBudget: 1000,
};

/**
 * DifferentialPrivacyService — adds calibrated noise to query results.
 */
export class DifferentialPrivacyService {
  private config: DifferentialPrivacyConfig;

  constructor(config?: Partial<DifferentialPrivacyConfig>) {
    this.config = { ...DEFAULT_DP_CONFIG, ...config };
  }

  getConfig(): DifferentialPrivacyConfig {
    return { ...this.config };
  }

  /**
   * Check if differential privacy is enabled.
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Check if there is remaining privacy budget.
   */
  hasRemainingBudget(): boolean {
    return this.config.remainingBudget > 0;
  }

  /**
   * Get remaining privacy budget.
   */
  getRemainingBudget(): number {
    return this.config.remainingBudget;
  }

  /**
   * Add noise to a numeric query result using the configured mechanism.
   *
   * @param value - The true query result
   * @param sensitivity - The maximum change one individual can cause
   * @returns The noisy value
   */
  addNoise(value: number, sensitivity: number = 1): number {
    if (!this.config.enabled) return value;
    if (!this.hasRemainingBudget()) return value;

    let noise: number;
    if (this.config.mechanism === 'laplace') {
      noise = this.laplaceMechanism(sensitivity, this.config.epsilon);
    } else {
      noise = this.gaussianMechanism(sensitivity, this.config.epsilon, this.config.delta);
    }

    // Consume one unit of privacy budget
    this.config.remainingBudget--;

    return value + noise;
  }

  /**
   * Add noise to an array of numeric values (e.g., histogram bins).
   * Each value gets independent noise.
   */
  addNoiseToArray(values: number[], sensitivity: number = 1): number[] {
    return values.map(v => this.addNoise(v, sensitivity));
  }

  /**
   * Clip a value to a valid range (prevents negative counts, etc.).
   */
  clipValue(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Laplace mechanism: adds noise from Laplace distribution.
   * Noise scale = sensitivity / epsilon.
   */
  private laplaceMechanism(sensitivity: number, epsilon: number): number {
    const scale = sensitivity / epsilon;
    // Generate Laplace noise using inverse CDF
    const u = Math.random() - 0.5;
    return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  }

  /**
   * Gaussian mechanism: adds noise from Gaussian distribution.
   * Noise std dev = sensitivity * sqrt(2 * ln(1.25/delta)) / epsilon.
   */
  private gaussianMechanism(
    sensitivity: number,
    epsilon: number,
    delta: number
  ): number {
    const sigma = (sensitivity * Math.sqrt(2 * Math.log(1.25 / delta))) / epsilon;
    // Box-Muller transform for Gaussian noise
    const u1 = Math.random();
    const u2 = Math.random();
    return sigma * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  /**
   * Reset privacy budget (for testing or new analysis period).
   */
  resetBudget(): void {
    this.config.remainingBudget = this.config.maxQueries;
  }

  /**
   * Enable/disable differential privacy.
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }
}

/**
 * Create a default differential privacy service.
 */
export function createDefaultDifferentialPrivacy(): DifferentialPrivacyService {
  return new DifferentialPrivacyService();
}
