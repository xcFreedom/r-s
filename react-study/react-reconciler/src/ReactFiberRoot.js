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
  // 根的类型（legacy、batched、concurrent），对应的分别是ReactDOM.render、ReactDOM.createSyncRoot、ReactDOM.createRoot
  this.tag = tag; 

  // FiberRoot对应的Fiber，也称之为RootFiber，是整个fiber树的根节点
  this.current = null;
  
  // 和fiberRoot关联的host节点信息
  this.containerInfo = containerInfo;

  // 仅由持久更新使用，暂时还未看到
  this.pendingChildren = null;

  // Map，主要记录的是Suspense组件使用时，throw的promise，与其expirationTime的映射
  this.pingCache = null;
  // 这应该标记的是root完成工作的expirationTime
  this.finishedExpirationTime = NoWork;
  // 已经完成的workInProgress HostRoot，它准备进入commit阶段
  this.finishedWork = null;
  // 在任务被挂起时，通过setTimeout设置的返回内容，下一次如果有新的任务挂起时清理还没触发的timeout
  this.timeoutHandle = noTimeout;
  // 顶层contex对象，使用renderSubtreeIntoContainer会产生
  this.context = null;
  this.pendingContext = null;

  // 确定是否应该在初始安装时进行注水
  this.hydrate = hydrate;
  // Scheduler.scheduleCallback返回的节点
  this.callbackNode = null;
  // 与此root关联的回调优先级
  this.callbackPriority = NoPriority;

  // 如此多的expirationTime，应该是用来区分
  // 1) 没有commit的任务                 
  // 2) 没有commit的挂起任务              suspendedTime
  // 3) 没有commit的可能被挂起的任务        pendingTime，所有任务进来一开始都是这个状态

  // root中存在的最早挂起的到期时间
  this.firstPendingTime = NoWork;
  // root中存在的最早暂停的expirationTime
  this.firstSuspendedTime = NoWork;
  // root中存在的最晚暂停的expirationTime
  this.lastSuspendedTime = NoWork;
  // 挂起后下一个已知的expirationTime
  this.nextKnownPendingLevel = NoWork;
  // Suspense组件通知root重新渲染的最晚expirationTime
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
 * 判断root这某个时间是否是挂起的，如果有挂起时间，且第一个暂停时间优先级大于等于传入的时间，且最后一个暂停时间优先级小于等于传入的时间
 * 则表明，传入的时间，root在暂停状态
 * @param {FiberRoot} root 
 * @param {ExpirationTime} expirationTime 
 * @returns {boolean}
 */
export function isRootSuspendedAtTime(root, expirationTime) {
  const firstSuspendedTime = root.firstSuspendedTime;
  const lastSuspendedTime = root.lastSuspendedTime;
  return (
    firstSuspendedTime !== NoWork &&
    (firstSuspendedTime >= expirationTime &&
      lastSuspendedTime <= expirationTime)
  );
}

/**
 * 标记root挂起的时间
 * 
 * @param {FiberRoot} root 
 * @param {ExpirationTime} expirationTime 
 */
export function markRootSuspendedAtTime(root, expirationTime) {
  const firstSuspendedTime = root.firstSuspendedTime;
  const lastSuspendedTime = root.lastSuspendedTime;
  // 如果第一次挂起的优先级小于当前传入的优先级
  if (firstSuspendedTime < expirationTime) {
    root.firstSuspendedTime = expirationTime;
  }
  // 如果最后挂起的优先级大于
  if (lastSuspendedTime > expirationTime || firstSuspendedTime === NoWork) {
    root.lastSuspendedTime = expirationTime;
  }

  if (expirationTime <= root.lastPingedTime) {
    root.lastPingedTime = NoWork;
  }
}

/**
 * 标记root上的pendingTime、suspendedTime、nextKnownPendingLevel
 * @param {FiberRoot} root 
 * @param {ExpirationTime} expirationTime 
 */
export function markRootUpdatedAtTime(root, expirationTime) {
  // 如果当前传入的expirationTime优先级更高，应将此优先级置于firstPendingTime
  const firstPendingTime = root.firstPendingTime;
  if (expirationTime > firstPendingTime) {
    root.firstPendingTime = expirationTime;
  }

  // 更新挂起时间的范围。将优先级较低或等于此更新的所有内容都视为未挂起。
  const firstSuspendedTime = root.firstSuspendedTime;
  if (firstSuspendedTime !== NoWork) {
    // 如果此优先级比firstSuspendedTime更高，则清空下面的expirationTime
    // TODO:暂时没明白
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