import { markRootExpiredAtTime } from "./ReactFiberRoot";
import { NoWork, Sync } from "./ReactFiberExpirationTime";
import { ImmediatePriority } from "../../scheduler/src/SchedulerPriorities";

/**
 * - 使用此函数为fiberRoot安排任务。每个fiberRoot只有一个任务；
 * - 如果任务已经被调度，我们将检查，以确保现有任务的到期时间与fiberRoot所工作的下一个到期时间相同
 * - 这个函数在每次更新之前调用，并且在退出任务之前就被调用
 * @param {*} root FiberRoot
 */
function ensureRootIsScheduled(root) {
  const lastExpiredTime = root.lastExpiredTime;
  if (lastExpiredTime !== NoWork) {
    // 特殊情况：过期的任务应同步刷新
    root.callbackExpirationTime = Sync;
    root.callbackPriority = ImmediatePriority;
    root.callbackNode = scheduleSyncCallback
  }
}

export function flushRoot(root, expirationTime) {
  markRootExpiredAtTime(root, expirationTime);
  ensureRootIsScheduled(root);
}