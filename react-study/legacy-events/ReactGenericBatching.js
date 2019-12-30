import {
  needsStateRestore,
  restoreStateIfNeeded,
} from './ReactControlledComponent';

import { enableFlareAPI } from '../shared/ReactFeatureFlags';
import { invokeGuardedCallbackAndCatchFirstError } from '../shared/ReactErrorUtils';

let batchedUpdatesImpl = function(fn, bookkeeping) {
  return fn(bookkeeping);
}
let discreteUpdatesImpl = function(fn, a, b, c) {
  return fn(a, b, c);
}

let flushDiscreteUpdatesImpl = function() {};
let batchedEventUpdatesImpl = batchedUpdatesImpl;

// 是 内部的 event handler
let isInsideEventHandler = false;
// 是处理中的事件更新
let isBatchingEventUpdates = false;

function finishEventHandler() {
  // 在这里，我们要等到所有更新都已传播，这在层内使用受控组件时非常重要：
  // 然后我们恢复任何受控组件的状态。
  const controlledComponentsHavePendingUpdates = needsStateRestore();
  if (controlledComponentsHavePendingUpdates) {
    /**
     * - 如果触发了受控组件的事件，则可能需要将DOM节点的状态还原回受控值。
     * - 当React在不接触DOM的情况下退出更新时必要的。
     */
    flushDiscreteUpdatesImpl();
    restoreStateIfNeeded();
  }
}

export function batchedEventUpdates(fn, a, b) {
  if (isBatchingEventUpdates) {
    // 如果我们当前在另一批次中，则需要等到它完全完成后才能还原状态。
    return fn(a, b);
  }
  isBatchingEventUpdates = true;
  try {
    return batchedEventUpdatesImpl(fn, a, b);
  } finally {
    isBatchingEventUpdates = false;
    finishEventHandler();
  }
}

export function executeUserEventHandler(fn, value) {
  const previouslyInEventHandler = isInsideEventHandler;
  try {
    isInsideEventHandler = true;
    const type = typeof value === 'object' && value !== null ? value.type : '';
    invokeGuardedCallbackAndCatchFirstError(type, fn, undefined, value);
  } finally {
    isInsideEventHandler = previouslyInEventHandler;
  }
}

export function discreteUpdates(fn, a, b, c) {
  const prevIsInsideEventHandler = isInsideEventHandler;
  isInsideEventHandler = true;
  try {
    return discreteUpdatesImpl(fn, a, b, c);
  } finally {
    isInsideEventHandler = prevIsInsideEventHandler;
    if (!isInsideEventHandler) {
      finishEventHandler();
    }
  }
}

// 最后一次刷洗事件时间
let lastFlushedEventTimeStamp = 0;
// 在需要时刷洗离散的更新
export function flushDiscreteUpdatesIfNeeded(timeStamp) {
  /**
   *  - event.timeStamp不太可靠，因为不同浏览器提供时间戳的方式不一致。
   *  - 有些浏览器为所有事件提供高准确度的时间戳，有些浏览器则不是
   *  - firefox 52版本以下甚至将两个时间戳混合在一期。
   *  - 有些浏览器甚至会报告负的时间戳，或者某些情况下为0的时间戳（iOS9）
   *  - 如果时间戳为0，我们就避免阻止刷新，这可能会影响语义。
   *  - 例如：如果先前的刷新删除/添加在后续刷新中激发的事件listerners。然而，这与我们在这一变化之前的行为相同，因此风险很低。
   */
  if (
    !isInsideEventHandler &&
    (!enableFlareAPI ||
      (timeStamp === 0 || lastFlushedEventTimeStamp !== timeStamp))
  ) {
    lastFlushedEventTimeStamp = timeStamp;
    flushDiscreteUpdatesImpl();
  }
}