/**
 * Calculates estimated gas and CTC cost according to official Creditcoin equation:
 * Cost ≈ 2.3e-5 + 2.9e-7 * continuityHashCount CTC
 */
export function calculateVerificationCost(continuityCount: number = 2): {
  ctcCost: string;
  usdEstimate: string;
  latencyBlocks: number;
} {
  const ctc = 0.000023 + 0.00000029 * continuityCount;
  return {
    ctcCost: `${ctc.toFixed(6)} tCTC`,
    usdEstimate: `< $0.0001 USD`,
    latencyBlocks: 1, // Synchronous in 1 block (~15s)
  };
}
