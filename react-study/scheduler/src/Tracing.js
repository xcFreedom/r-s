import { enableSchedulerTracing } from '../../shared/ReactFeatureFlags';

// 用于生成唯一ID的计数器
let threadIDCounter = 0;

// 一组当前跟踪的交互，交互“堆栈”-意思是新跟踪的交互被附加到以前的活动集。当交互超出范围时，将恢复上一组.
let interactionsRef = null;

// Listener(s) 通知交互何时开始和结束
let subscriberRef = null;

if (enableSchedulerTracing) {
  interactionsRef = {
    current: new Set(),
  };
  subscriberRef = {
    current: null,
  };
}

export { interactionsRef as __interactionsRef, subscriberRef as __subscriberRef };

/**
 * @returns number
 * */
export function unstable_getThreadID() {
  return ++threadIDCounter;
}