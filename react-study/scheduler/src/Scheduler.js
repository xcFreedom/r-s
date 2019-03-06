// 优先级
let ImmediatePriority    = 1; // 立即
let UserBlockingPriority = 2; // 用户阻止
let NormalPriority       = 3; // 正常
let LowPriority          = 4; // 低
let IdlePriority         = 5; // 空闲

// 回调函数存储为循环的双链表
let firstCallbackNode    = null;

let currentPriorityLevel    = NormalPriority;
let hasNativePerformanceNow = typeof performance === 'object' && typeof performance.now === 'function';


function unstable_getCurrentPriorityLevel() {
  return currentPriorityLevel;
}

function unstable_cancelCallback(callbackNode) {
  const next = callbackNode.next;
  if (next === null) {
    // 已经被取消
    return;
  }

  if (next === callbackNode) {
    // 这是唯一的调度回调，清空链表
    firstCallbackNode = null;
  } else {
    // 把它从列表中的位置移除
    if (callbackNode === firstCallbackNode) {
      firstCallbackNode = next;
    }
    const previous = callbackNode.previous;
    previous.next = next;
    next.previous = previous;
  }

  callbackNode.next = callbackNode.previous = null;
}


let localDate = Date;
let getCurrentTime;

if (hasNativePerformanceNow) {
  const Performance = performance;
  getCurrentTime = function() {
    return Performance.now();
  }
} else {
  getCurrentTime = function() {
    return localDate.now();
  }
}

export {
  ImmediatePriority as unstable_ImmediatePriority,
  UserBlockingPriority as unstable_UserBlockingPriority,
  NormalPriority as unstable_NormalPriority,
  LowPriority as unstable_LowPriority,
  IdlePriority as unstable_IdlePriority,
  unstable_cancelCallback,
  unstable_getCurrentPriorityLevel,
  getCurrentTime as unstable_now,
};