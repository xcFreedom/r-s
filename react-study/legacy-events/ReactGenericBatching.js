import { enableFlareAPI } from '../shared/ReactFeatureFlags';

let flushDiscreteUpdatesImpl = function() {};

// 是 内部的 event handler
let isInsideEventHandler = false;
// 是处理中的事件更新
let isBatchingEventUpdates = false;

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