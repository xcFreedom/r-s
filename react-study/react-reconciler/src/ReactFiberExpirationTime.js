import MAX_SIGNED_31_BIT_INT from './maxSigned31BitInt';

export const NoWork = 0;
export const Never  = 1;
export const Sync   = MAX_SIGNED_31_BIT_INT;

const UNIT_SIZE = 10;
const MAGIC_NUMBER_OFFSET = MAX_SIGNED_31_BIT_INT - 1;

export function msToExpirationTime(ms) {
  return MAGIC_NUMBER_OFFSET - ((ms / UNIT_SIZE) | 0);
}

/**
 * 
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
  return computeExpirationBucket(currentTime, HIGH_PRIORITY_EXPIRATION, HIGH_PRIORITY_BATCH_SIZE);
}