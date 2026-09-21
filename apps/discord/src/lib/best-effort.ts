export interface BestEffortStep {
  label: string;
  run: () => Promise<void>;
}

/** Runs every step even if earlier ones throw; returns the labels of the steps that failed. */
export async function runBestEffort(steps: BestEffortStep[]): Promise<string[]> {
  const failed: string[] = [];
  for (const step of steps) {
    try {
      // Sequential on purpose: these hit Discord's per-guild rate limits.
      // eslint-disable-next-line no-await-in-loop
      await step.run();
    } catch (error) {
      console.error(`[best-effort] ${step.label} failed:`, error);
      failed.push(step.label);
    }
  }
  return failed;
}
