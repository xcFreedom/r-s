import { noTimeout } from './ReactFiberHostConfig';
import { createHostRootFiber } from './ReactFiber';
import {
  enableSchedulerTracing,
  enableSuspenseCallback,
} from '../../shared/ReactFeatureFlags';
import { NoWork } from './ReactFiberExpirationTime';
import { unstable_getThreadID } from '../../scheduler/tracing';
import { NoPriority } from './SchedulerWithReactIntegration'


function FiberRootNode(containerInfo, tag, hydrate) {
  this.tag = tag;
  this.current = null;
  this.containerInfo = containerInfo;
  this.pendingChildren = null;
  this.pingCache = null;
  this.finishedExpirationTime = NoWork;
  this.finishedWork = null;
  this.timeoutHandle = noTimeout;
  this.context = nul;
  this.pendingContext = null;
  this.hydrate = hydrate;
  this.callbackNode = null;
  this.callbackPriority = NoPriority;
  this.firstPendingTime = NoWork;
  this.firstSuspendedTime = NoWork;
  
  this.lastSuspendedTime = NoWork;
  this.nextKnownPendingLevel = NoWork;
  this.lastPingedTime = NoWork;
  this.lastExpiredTime = NoWork;

  if (enableSchedulerTracing) {
    this.interactionThreadID = unstable_getThreadID();
    this.memoizedInteractions = new Set();
    this.pendingInteractionMap = new Map();
  }
  if (enableSuspenseCallback) {
    this.hydrationCallbacks = null;
  }
}


/**
 * 创建fiber根组件
 * @param {*} containerInfo 
 * @param {*} tag 
 * @param {*} hydrate 
 */
export function createFiberRoot(containerInfo, tag, hydrate, hydrationCallbacks) {
  const root = new FiberRootNode(containerInfo, tag, hydrate);
  if (enableSuspenseCallback) {
    root.hydrationCallbacks = hydrationCallbacks;
  }

  const uninitializedFiber = createHostRootFiber(tag);
  root.current = uninitializedFiber;
  uninitializedFiber.stateNode = root;

  return root;
}

/**
 * 标记root延迟的时间
 * @param {FiberRoot} root 
 * @param {ExpirationTime} expirationTime 
 */
export function markRootSuspendedAtTime(root, expirationTime) {
  const firstSuspendedTime = root.firstSuspendedTime;
  const lastSuspendedTime = root.lastSuspendedTime;
  if (firstSuspendedTime < expirationTime) {
    root.firstSuspendedTime = expirationTime;
  }
  if (lastSuspendedTime > expirationTime || firstSuspendedTime === NoWork) {
    root.lastSuspendedTime = expirationTime;
  }

  if (expirationTime <= root.lastPingedTime) {
    root.lastPingedTime = NoWork;
  }
}

/**
 * 标记root已更新的时间
 * @param {FiberRoot} root 
 * @param {ExpirationTime} expirationTime 
 */
export function markRootUpdatedAtTime(root, expirationTime) {
  // 更新等待时间范围
  const firstPendingTime = root.firstPendingTime;
  if (expirationTime > firstPendingTime) {
    root.firstPendingTime = expirationTime;
  }

  // 更新挂起时间的范围。将优先级较低或等于此更新的所有内容都视为未挂起。
  const firstSuspendedTime = root.firstSuspendedTime;
  if (firstSuspendedTime !== NoWork) {
    if (expirationTime >= firstSuspendedTime) {
      root.firstSuspendedTime = root.lastSuspendedTime = root.nextKnownPendingLevel = NoWork;
    } else if (expirationTime >= root.lastSuspendedTime) {
      root.lastSuspendedTime = expirationTime + 1;
    }

    // 这是挂起的级别。检查它的优先级是否高于下一个已知的挂起级别。
    if (expirationTime > root.nextKnownPendingLevel) {
      root.nextKnownPendingLevel = expirationTime;
    }
  }
}


/**
 * 标记root完成时间
 * @param {FiberRoot} root 
 * @param {ExpirationTime} finishedExpirationTime 
 * @param {ExpirationTIme} remainingExpirationTime 
 */
export function markRootFinishedAtTime(root, finishedExpirationTime, remainingExpirationTime) {
  // 更新pending times范围
  root.firstPendingTime = remainingExpirationTime;

  // 更新挂起时间的范围。将优先级更高或等于此更新的所有内容都视为未挂起。
  if (finishedExpirationTime <= root.lastSuspendedTime) {
    // 整个暂停范围现在没有暂停。
    root.firstSuspendedTime = root.lastSuspendedTime = root.nextKnownPendingLevel = NoWork;
  } else if (finishedExpirationTime <= root.firstSuspendedTime) {
    // 部分暂停范围现在未暂停。缩小范围以包含从非挂起时间（非包含）到上次挂起时间之间的所有内容。
    root.firstSuspendedTime = finishedExpirationTime - 1;
  }

  if (finishedExpirationTime <= root.lastPingedTime) {
    root.lastPingedTime = NoWork;
  }

  if (finishedExpirationTime <= root.lastExpiredTime) {
    root.lastExpiredTime = NoWork;
  }

}

export function markRootExpiredAtTime(root, expirationTime) {
  const lastExpiredTime = root.lastExpiredTime;
  if (lastExpiredTime === NoWork || lastExpiredTime > expirationTime) {
    root.lastExpiredTime = expirationTime;
  }
}