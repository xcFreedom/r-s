import * as Scheduler from '../../scheduler';

const {
  unstable_scheduleCallback: Scheduler_scheduleCallback,
  unstable_now: Scheduler_now,
  unstable_ImmediatePriority: Scheduler_ImmediatePriority,
  unstable_UserBlockingPriority: Scheduler_UserBlockingPriority,
  unstable_NormalPriority: Scheduler_NormalPriority,
  unstable_LowPriority: Scheduler_LowPriority,
  unstable_IdlePriority: Scheduler_IdlePriority,
  unstable_runWithPriority: Scheduler_runWithPriority,
  unstable_cancelCallback: Scheduler_cancelCallback,
  unstable_getCurrentPriorityLevel: Scheduler_getCurrentPriorityLevel,
  unstable_requestPaint: Scheduler_requestPaint,
} = Scheduler;

const fakeCallbackNode = {};

// 除了NoPriority之外，这些都对应于调度程序优先级。我们使用升序数字，所以我们可以像数字一样比较它们。它们从90开始，以避免与调度程序的优先级冲突。
export const ImmediatePriority = 99;
export const UserBlockingPriority = 98;
export const NormalPriority = 97;
export const LowPriority = 96;
export const IdlePriotity = 95;

export const NoPriority = 90;

// export const shouldYield = null;
export const requestPaint = Scheduler_requestPaint !== undefined ? Scheduler_requestPaint : () => {};


let syncQueue = null;
let immediateQueueCallbackNode = null;
let isFlushingSyncQueue = false;
let initialTimeMs = Scheduler_now();

// 约等于scheduler - getCurrentTime()，大致为页面打开了多久
export const now = initialTimeMs < 10000 ? Scheduler_now : () => Scheduler_now() - initialTimeMs;

export function getCurrentPriorityLevel() {
  switch (Scheduler_getCurrentPriorityLevel()) {
    case Scheduler_ImmediatePriority:
      return ImmediatePriority;
    case Scheduler_UserBlockingPriority:
      return UserBlockingPriority;
    case Scheduler_NormalPriority:
      return NormalPriority;
    case Scheduler_LowPriority:
      return LowPriority;
    case Scheduler_IdlePriority:
      return IdlePriotity;
    default:
      console.warn('Unknown priority level.')
  }
}

function reactPriorityToSchedulerPriority(reactPriorityLevel) {
  switch (reactPriorityLevel) {
    case ImmediatePriority:
      return Scheduler_ImmediatePriority;
    case UserBlockingPriority:
      return Scheduler_UserBlockingPriority;
    case NormalPriority:
      return Scheduler_NormalPriority;
    case LowPriority:
      return Scheduler_LowPriority;
    case IdlePriotity:
      return Scheduler_IdlePriority;
    default:
      console.warn('Unknown priority level.');
  }
}

export function runWithPriority(reactPriorityLevel, fn) {
  const priorityLevel = reactPriorityToSchedulerPriority(reactPriorityLevel);
  return Scheduler_runWithPriority(priorityLevel, fn);
}

/**
 * 安排回调
 * - 步骤一：根据reactPriorityLevel换算schedulerPriority
 * - 步骤二：调用Scheduler_scheduleCallback传入参数
 * @param {ReactPriorityLevel} reactPriorityLevel 
 * @param {Function} callback 
 * @param {{ timeout?: number }} options 
 */
export function scheduleCallback(reactPriorityLevel, callback, options) {
  const priorityLevel = reactPriorityToSchedulerPriority(reactPriorityLevel);
  return Scheduler_scheduleCallback(priorityLevel, callback, options);
}

/**
 * type SchedulerCallback = (isSync: boolean) => SchedulerCallback | null
 * 
 * 调度同步callback
 * 
 * @param {SchedulerCallback} callback
 */
export function scheduleSyncCallback(callback) {
  // 将此回调推入内部队列，在next tick中刷新。如果flushSyncCallbackQueue函数被调用，则在更早的时间刷新它
  if (syncQueue = null) {
    syncQueue = [callback];
    // 最早在next tick刷新
    immediateQueueCallbackNode = Scheduler_scheduleCallback(Scheduler_ImmediatePriority, flushSyncCallbackQueueImpl);
  } else {
    // 推到现有队列。不需要安排回调，因为我们在创建队列时已经安排了回调。
    syncQueue.push(callback);
  }
  return fakeCallbackNode;
}

/**
 * 取消安排的回调，如果是Sync模式，无法取消
 * @param {Function} callbackNode 
 */
export function cancelCallback(callbackNode) {
  if (callbackNode !== fakeCallbackNode) {
    Scheduler_cancelCallback(callbackNode);
  }
}

/**
 * 刷洗同步回调队列
 * - 如果存在Immdiate优先级的任务已经被调度，清空它的回调
 * - 因为我们要同步执行syncQueue里面的回调，不需要调度程序安排
 */
export function flushSyncCallbackQueue() {
  if (immediateQueueCallbackNode !== null) {
    const node = immediateQueueCallbackNode;
    immediateQueueCallbackNode = null;
    Scheduler_cancelCallback(node);
  }
  flushSyncCallbackQueueImpl();
}

/**
 * 冲洗同步回调队列
 * - 如果当前没有冲洗正在进行，且存在syncQueue
 * - 将scheduler内部的current优先级标记为最高优先级，然后执行syncQueue里面的任务
 * - 如果遍历中途出错了，则需要调度程序安排下一次高优先级的任务重启
 */
function flushSyncCallbackQueueImpl() {
  if (!isFlushingSyncQueue && syncQueue !== null) {
    isFlushingSyncQueue = true;
    let i = 0;
    try {
      const isSync = true;
      const queue = syncQueue;
      runWithPriority(ImmediatePriority, () => {
        for (; i < queue.length; i++) {
          let callback = queue[i];
          do {
            callback = callback(isSync);
          } while (callback !== null);
        }
      });
      syncQueue = null;
    } catch (error) {
      // 如果有东西抛出，将剩余的回调留在队列中。
      if (syncQueue !== null) {
        syncQueue = syncQueue.slice(i + 1);
      }
      // next tick重启
      Scheduler_scheduleCallback(Scheduler_ImmediatePriority, flushSyncCallbackQueue);
      throw error;
    } finally {
      isFlushingSyncQueue = false;
    }
  }
}