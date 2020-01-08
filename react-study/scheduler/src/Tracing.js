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

export function unstable_wrap(callback, threadID) {
  if (!enableSchedulerTracing) {
    return callback;
  }

  const wrappedInteractions = interactionsRef.current;

  let subscriber = subscriberRef.current;
  if (subscriber !== null) {
    subscriber.onWorkScheduled(wrappedInteractions, threadID);
  }

  wrappedInteractions.forEach(interaction => {
    interaction.__count++;
  });

  let hasRun = false;

  function wrapped() {
    const prevInteractions = interactionsRef.current;
    interactionsRef.current = wrappedInteractions;

    subscriber = subscriberRef.current;

    try {
      let returnValue;

      try {
        if (subscriber !== null) {
          subscriber.onWorkStarted(wrappedInteractions, threadID);
        }
      } finally {
        try {
          returnValue = callback.apply(undefined, arguments);
        } finally {
          interactionsRef.current = prevInteractions;

          if (subscriber !== null) {
            subscriber.onWorkStopped(wrappedInteractions, threadID);
          }
        }
      }

      return returnValue;
    } finally {
      if (!hasRun) {
        // 我们只希望包装的函数执行一次，但如果它执行了不止一次，只会减少一次未完成的交互计数。
        hasRun = true;

        // 更新所有包装的交互的挂起异步计数。如果这是其中任何一个的最后一个计划异步工作，请将它们标记为已完成。
        wrappedInteractions.forEach(interaction => {
          interaction.__count--;

          if (subscriber !== null && interaction.__count === 0) {
            subscriber.onInteractionScheduledWorkCompleted(interaction);
          }
        });
      }
    }
  }

  wrapped.cancel = function cancel() {
    subscriber = subscriberRef.current;

    try {
      if (subscriber !== null) {
        subscriber.onWorkCanceled(wrappedInteractions, threadID);
      }
    } finally {
      wrappedInteractions.forEach(interaction => {
        interaction.__count--;

        if (subscriber && interaction.__count === 0) {
          subscriber.onInteractionScheduledWorkCompleted(interaction);
        }
      });
    }
  };

  return wrapped;
}