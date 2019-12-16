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
      pendingChildren: null, // 等待的children

      pingCache: null,

      earliestPendingTime: NoWork, // 最早更新时间
      latestPendingTime: NoWork,   // 最后更新时间
      earliestSuspendedTime: NoWork, // 最早暂停时间 这里的Suspended是否与React.Suspense有关联？
      latestSuspendedTime: NoWork,  // 最后暂停时间
      latestPingedTime: NoWork,    // 

      didError: false,

      pendingCommitExpirationTime: NoWork, // 等待提交的过期时间，这里的Commit是否对应ReactWork？
      finishedWork: null,       // 完成work
      timeoutHandle: noTimeout, // 超时handle
      context: null,
      pendingContext: null,
      hydrate,
      nextExpirationTimeToWorkOn: NoWork, // work开始的下一个过期时间
      expirationTime: NoWork, // 国旗时间
      firstBatch: null,
      nextScheuledRoot: null, // 下一个计划的Root
    };
  }

  uninitializedFiber.stateNode = root;

  return root;
}