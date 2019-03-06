import { noTimeout } from './ReactFiberHostConfig';
import { createHostRootFiber } from './ReactFiber';
import { enableSchedulerTracing } from '../../shared/ReactFeatureFlags';
import { NoWork } from './ReactFiberExpirationTime';
import { unstable_getThreadID } from '../../scheduler/tracing';
/**
 * 创建fiber根组件
 * @param {*} containerInfo 
 * @param {*} isConcurrent 
 * @param {*} hydrate 
 */
export function createFiberRoot(containerInfo, isConcurrent, hydrate) {
  const uninitializedFiber = createHostRootFiber(isConcurrent); // 创建为初始化的fiber

  let root;
  if (enableSchedulerTracing) { // 如果开启调度程序跟踪
    root = {
      current: uninitializedFiber,
      containerInfo: containerInfo,
      pendingChildren: null,

      earliestPendingTime: NoWork,
      latestPendingTime: NoWork,
      earliestSuspendedTime: NoWork,
      latestSuspendedTime: NoWork,
      latestPingedTime: NoWork,

      pingCache: null,
      
      didError: false,

      pendingCommitExpirationTime: NoWork,
      finishedWork: null,
      timeoutHandle: noTimeout,
      context: null,
      pendingContext: null,
      hydrate,
      nextExpirationTimeToWorkOn: NoWork,
      expirationTime: NoWork,
      firstBatch: null,
      nextScheuledRoot: null,

      interactionThreadID: unstable_getThreadID(),
      memoizedInteractions: new Set(),
      pendingInteractionMap: new Map(),
    };
  } else {
    root = {
      current: uninitializedFiber,
      containerInfo: containerInfo,
      pendingChildren: null,

      pingCache: null,

      earliestPendingTime: NoWork,
      latestPendingTime: NoWork,
      earliestSuspendedTime: NoWork,
      latestSuspendedTime: NoWork,
      latestPingedTime: NoWork,

      didError: false,

      pendingCommitExpirationTime: NoWork,
      finishedWork: null,
      timeoutHandle: noTimeout,
      context: null,
      pendingContext: null,
      hydrate,
      nextExpirationTimeToWorkOn: NoWork,
      expirationTime: NoWork,
      firstBatch: null,
      nextScheuledRoot: null,
    };
  }

  uninitializedFiber.stateNode = root;

  return root;
}