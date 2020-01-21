import MAX_SIGNED_31_BIT_INT from './maxSigned31BitInt';
import { ImmediatePriority, IdlePriotity, UserBlockingPriority, NormalPriority } from './SchedulerWithReactIntegration';

export const NoWork = 0;
export const Never  = 1;
export const Idle   = 2;
let ConinuousHydration = 3;
export const Sync   = MAX_SIGNED_31_BIT_INT;
export const Batched = Sync - 1;

const UNIT_SIZE = 10;
const MAGIC_NUMBER_OFFSET = MAX_SIGNED_31_BIT_INT - 1;

// 1个到期时间单位表示10毫秒。
export function msToExpirationTime(ms) {
  // 总是加一个偏移量，这样我们就不会和现在的MAGIC_NUMBER_OFFSET冲突。
  return MAGIC_NUMBER_OFFSET - ((ms / UNIT_SIZE) | 0);
}

export function expirationTimeToMs(expirationTime) {
  return (MAGIC_NUMBER_OFFSET - expirationTime) * UNIT_SIZE;
}

/**
 * （num / precision取整）* precision + precision
 * @param {Number} num 
 * @param {Number} precision 
 * @returns {Number}
 */
function ceiling(num, precision) {
  return (((num / precision) | 0) + 1) * precision;
}

/**
 * 计算过期时段
 * @param {ExpirationTime} currentTime 
 * @param {Number} expirationInMs 
 * @param {Number} bucketSizeMs 
 * @returns {ExpirationTime}
 */
function computeExpirationBucket(currentTime, expirationInMs, bucketSizeMs) {
  return MAGIC_NUMBER_OFFSET - ceiling(MAGIC_NUMBER_OFFSET - currentTime + expirationInMs / UNIT_SIZE, bucketSizeMs / UNIT_SIZE);
}


export const LOW_PRIORITY_EXPIRATION = 5000;
export const LOW_PRIORITY_BATCH_SIZE = 250;

/**
 * 计算异步的expirationTime
 * @param {ExpirationTime} currentTime 
 */
export function computeAsyncExpiration(currentTime) {
  // MAGIC_NUMBER_OFFSET - ceiling(MAGIC_NUMBER_OFFSET - currentTime + 500, 25);
  return computeExpirationBucket(currentTime, LOW_PRIORITY_EXPIRATION, LOW_PRIORITY_BATCH_SIZE);
}

export function computeSuspenseExpiration(currentTime, timeoutMs) {
  return computeExpirationBucket(currentTime, timeoutMs, LOW_PRIORITY_BATCH_SIZE);
}


/**
 * react故意为dev中的交互式更新设置比生产中更高的到期时间
 * 
 * 如果主线程被阻塞太久以至于你达到了期限，那么这是一个可以通过更好的调度来解决的问题。
 * 
 * 人们将更有可能注意到这一点，并在开发过程中使用较长的到期时间来修复它。
 * 
 * 在生产中，我们通过快速到期来选择更好的用户体验，以掩盖调度问题。
 */
export const HIGH_PRIORITY_EXPIRATION = __DEV__ ? 500 : 150;
export const HIGH_PRIORITY_BATCH_SIZE = 100;

/**
 * 计算交互有效期
 * @param {ExpirationTime} currentTime 
 * @returns {ExpirationTime}
 */
export function computeInteractiveExpiration(currentTime) {
  // MAGIC_NUMBER_OFFSET - ceiling(MAGIC_NUMBER_OFFSET - currentTime + 15, 10);
  return computeExpirationBucket(currentTime, HIGH_PRIORITY_EXPIRATION, HIGH_PRIORITY_BATCH_SIZE);
}


/**
 * 从expirationTime获取内部优先级
 * @param {ExpirationTime} currentTime 
 * @param {ExpirationTime} expirationTime 
 * @returns {ReactPriorityLevel}
 */
export function interPriorityFromExpirationTime(currentTime, expirationTime) {
  if (expirationTime === Sync) { // Sync模式返回最高优先级
    return ImmediatePriority;
  }
  if (expirationTime === Never || expirationTime == Idle) {
    return IdlePriotity;
  }

  const msUntil = expirationTimeToMs(expirationTime) - expirationTimeToMs(currentTime);

  // 如果expirationTime小于currentTime
  if (msUntil <= 0) {
    return ImmediatePriority;
  }

  if (msUntil <= HIGH_PRIORITY_EXPIRATION + HIGH_PRIORITY_BATCH_SIZE) {
    return UserBlockingPriority;
  }

  if (msUntil <= LOW_PRIORITY_EXPIRATION + LOW_PRIORITY_BATCH_SIZE) {
    return NormalPriority;
  }

  return IdlePriotity;
}