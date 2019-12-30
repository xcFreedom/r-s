import * as Scheduler from '../../scheduler';

const {
  unstable_sche
  unstable_now: Scheduler_now,
} = Scheduler;

// 除了NoPriority之外，这些都对应于调度程序优先级。我们使用升序数字，所以我们可以像数字一样比较它们。它们从90开始，以避免与调度程序的优先级冲突。
export const ImmediatePriority = 99;
export const UserBlockingPriority = 98;
export const NormalPriority = 97;
export const LowPriority = 96;
export const IdlePriotity = 95;

export const NoPriority = 90;


let syncQueue = null;
let immediateQueueCallbackNode = null;
let isFlushingSyncQueue = false;
let initialTimeMs = Scheduler_now();

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
    immediateQueueCallbackNode = 
  }
}