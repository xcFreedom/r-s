import {
  ImmediatePriority,
  UserBlockingPriority,
  NormalPriority,
  LowPriority,
  IdlePriority,
} from './SchedulerPriorities';
import {
  getCurrentTime,
} from './SchedulerHostConfig';
import { enableProfiling } from './SchedulerFeatureFlags';
import { push, peek } from './SchedulerMinHeap';

const maxSigned31BitInt = 1073741823

const IMMEDIATE_PRIORITY_TIMEOUT = -1;
const USER_BLOCKING_PRIORITY = 250;
const NORMAL_PRIORITY_TIMEOUT = 5000;
const LOW_PRIORITY_TIMEOUT = 10000;
const IDLE_PRIORITY = maxSigned31BitInt;

const taskQueue = [];
const timerQueue = [];

let taskIdCounter = 1;

let currentPriorityLevel    = NormalPriority;

let isHostCallbackScheduled = false;
let isHostTimeoutScheduled = false;

function unstable_getCurrentPriorityLevel() {
  return currentPriorityLevel;
}

function unstable_cancelCallback(callbackNode) {
  // const next = callbackNode.next;
  // if (next === null) {
  //   // 已经被取消
  //   return;
  // }

  // if (next === callbackNode) {
  //   // 这是唯一的调度回调，清空链表
  //   firstCallbackNode = null;
  // } else {
  //   // 把它从列表中的位置移除
  //   if (callbackNode === firstCallbackNode) {
  //     firstCallbackNode = next;
  //   }
  //   const previous = callbackNode.previous;
  //   previous.next = next;
  //   next.previous = previous;
  // }

  // callbackNode.next = callbackNode.previous = null;
}


function unstable_runWithPriority(priorityLevel, eventHandler) {
  switch (priorityLevel) {
    case ImmediatePriority:
    case UserBlockingPriority:
    case NormalPriority:
    case LowPriority:
    case IdlePriority:
      break;
    default:
      priorityLevel = NormalPriority;
  }

  var previousPriorityLevel = currentPriorityLevel;
  currentPriorityLevel = priorityLevel;
  try {
    return eventHandler();
  } finally {
    currentPriorityLevel = previousPriorityLevel;
  }
}

function timeoutForPriorityLevel(priorityLevel) {
  switch (priorityLevel) {
    case ImmediatePriority:
      return IMMEDIATE_PRIORITY_TIMEOUT;
    case UserBlockingPriority:
      return USER_BLOCKING_PRIORITY;
    case IdlePriority:
      return IDLE_PRIORITY;
    case LowPriority:
      return LOW_PRIORITY_TIMEOUT;
    case NormalPriority:
    default:
      return NORMAL_PRIORITY_TIMEOUT;
  }
}

function unstable_scheduleCallback(priorityLevel, callback, options) {
  let currentTime = getCurrentTime();

  let startTime;
  let timeout;
  if (typeof options === 'object' && options !== null) {
    let delay = options.delay;
    if (typeof delay === 'number' && delay > 0) {
      startTime = currentTime + delay;
    } else {
      startTime = currentTime;
    }
    timeout = typeof options.timeout === 'number' ? options.timeout : timeoutForPriorityLevel(priorityLevel);
  } else {
    timeout = timeoutForPriorityLevel(priorityLevel);
    start = currentTime;
  }

  let expirationTime = startTime + timeout;
  const newTask = {
    id: taskIdCounter++,
    callback,
    priorityLevel,
    startTime,
    expirationTime,
    sortIndex: -1,
  };
  if (enableProfiling) {
    newTask.isQueued = false;
  }
  if (startTime > currentTime) {
    newTask.sortIndex = startTime;
    push(timerQueue, newTask);
    if (peek(taskQueue) === null && newTask === peek(timerQueue)) {
      // 所有任务都被延迟，这是延迟最早的任务。
      if (isHost)
    }
  }
}


export {
  ImmediatePriority as unstable_ImmediatePriority,
  UserBlockingPriority as unstable_UserBlockingPriority,
  NormalPriority as unstable_NormalPriority,
  LowPriority as unstable_LowPriority,
  IdlePriority as unstable_IdlePriority,
  unstable_runWithPriority,
  unstable_cancelCallback,
  unstable_getCurrentPriorityLevel,
  getCurrentTime as unstable_now,
};