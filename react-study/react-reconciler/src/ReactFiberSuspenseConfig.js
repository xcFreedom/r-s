import ReactSharedInternal from '../../shared/ReactSharedInternals';

const { ReactCurrentBatchConfig } = ReactSharedInternal;

/**
 * type SuspenseConfig = {
 *   timeoutMs: number,
 *   busyDelayMs?: number,
 *   busyMinDurationMs?: number,
 * }
 */

export function requestCurrentSuspenseConfig() {
  return ReactCurrentBatchConfig.suspense;
}