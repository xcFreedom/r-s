import { NoWork } from "./ReactFiberExpirationTime";

/**
 * 
 * @param {FiberRoot} root 
 * @param {ExpirationTime} expirationTime 
 */
export function markPendingPriorityLevel(root, expirationTime) {
  // 如果在完成一个失败的root和重试它之间存在间隙，则可能会安排其他的更新，清除“didError”，以防更新足以修复错误。
  root.didError = false;

  // 更新最晚和最早的等待时间
  const earliestPendingTime = root.earliestPendingTime;
  if (earliestPendingTime === NoWork) {
    // 没有其他等待中的更新
    root.earliestPendingTime = root.latestPendingTime = expirationTime;
  } else {
    if (earliestPendingTime < expirationTime) {
      // 这是最早的等待更新
      root.earliestPendingTime = expirationTime;
    } else {
      const latestPendingTime = root.latestPendingTime;
      if (latestPendingTime > expirationTime) {
        // 这是最晚的等待更新
        root.latestPendingTime = expirationTime;
      }
    }
  }
  findNextExpirationTimeToWorkOn(expirationTime, root);
}

/**
 * 找到下一个到期时间
 * @param {*} completedExpirationTime 
 * @param {*} root 
 */
function findNextExpirationTimeToWorkOn(completedExpirationTime, root) {
  const earliestSuspendedTime = root.earliestSuspendedTime;
  const latestSuspendedTime = root.latestSuspendedTime;
  const earliestPendingTime = root.earliestPendingTime;
  const latestPingedTime = root.latestPingedTime;

  // 在最早的时间内工作，如果做不到，在最晚的时间工作
  let nextExpirationTimeToWorkOn = earliestPendingTime !== NoWork ? earliestPendingTime : latestPingedTime;

  // 如果没有等待或者紧迫的工作，检查是否有低优先级的暂停的工作需要完成
  if (
    nextExpirationTimeToWorkOn === NoWork &&
    (completedExpirationTime === NoWork ||
      latestSuspendedTime < completedExpirationTime)
  ) {
    // 优先级最低的暂停工作是下一步最有可能提交的工作，再次开始渲染它，这样如果它超时，就可以提交了
    nextExpirationTimeToWorkOn = latestSuspendedTime;
  }

  let expirationTime = nextExpirationTimeToWorkOn;
  if (expirationTime !== NoWork && earliestSuspendedTime > expirationTime) {
    expirationTime = earliestSuspendedTime;
  }

  root.nextExpirationTimeToWorkOn = nextExpirationTimeToWorkOn;
  root.expirationTime = expirationTime;
}