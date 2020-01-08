import {
  enableSelectiveHydration,
} from '../../../shared/ReactFeatureFlags';
import {
  attemptToDispatchEvent, trapEventForResponderEventSystem,
} from './ReactDOMEventListener';
import { getListeningSetForElement, listenToTopLevel } from './ReactBrowserEventEmitter';
import {
  getInstanceFromNode
} from '../client/ReactDOMComponentTree';
import {
  TOP_MOUSE_DOWN,
  TOP_MOUSE_UP,
  TOP_TOUCH_CANCEL,
  TOP_TOUCH_END,
  TOP_TOUCH_START,
  TOP_AUX_CLICK,
  TOP_DOUBLE_CLICK,
  TOP_POINTER_CANCEL,
  TOP_POINTER_DOWN,
  TOP_POINTER_UP,
  TOP_DRAG_END,
  TOP_DRAG_START,
  TOP_DROP,
  TOP_COMPOSITION_END,
  TOP_COMPOSITION_START,
  TOP_KEY_DOWN,
  TOP_KEY_PRESS,
  TOP_KEY_UP,
  TOP_INPUT,
  TOP_TEXT_INPUT,
  TOP_CLOSE,
  TOP_CANCEL,
  TOP_COPY,
  TOP_CUT,
  TOP_PASTE,
  TOP_CLICK,
  TOP_CHANGE,
  TOP_CONTEXT_MENU,
  TOP_RESET,
  TOP_SUBMIT,
  TOP_DRAG_ENTER,
  TOP_DRAG_LEAVE,
  TOP_MOUSE_OVER,
  TOP_MOUSE_OUT,
  TOP_POINTER_OVER,
  TOP_POINTER_OUT,
  TOP_GOT_POINTER_CAPTURE,
  TOP_LOST_POINTER_CAPTURE,
  TOP_FOCUS,
  TOP_BLUR,
} from './DOMTopLevelEventTypes';
import { IS_REPLAYED } from '../../../legacy-events/EventSystemFlags';
import { unsafeCastDOMTopLevelTypeToString } from 'react-study/legacy-events/TopLevelEventTypes';
import {
  unstable_scheduleCallback as scheduleCallback,
} from '../../../scheduler';
import { NormalPriority } from 'react-study/scheduler/src/SchedulerPriorities';

// 尝试同步混合 (fiber: Object) => void;
let attemptSynchronousHydration;
export function setAttemptSynchronousHydration(fn) {
  attemptSynchronousHydration = fn;
}

// 尝试 (fiber: Object) => void;
let attemptUserBlockingHydration;
export function setAttemptUserBlockingHydration(fn) {
  attemptUserBlockingHydration = fn;
}

// (fiber: Object) => void;
let attemptContinuousHydration;
export function setAttemptContinuousHydration(fn) {
  attemptContinuousHydration = fn;
}
// (fiber: Object) => void;
let attemptHydrationAtCurrentPriority;
export function setAttemptHydrationAtCurrentPriority(fn) {
  attemptHydrationAtCurrentPriority = fn;
}

// 有计划的尝试replay
let hasScheduledReplayAttempt = false;

// 要重播的离散事件队列。
let queuedDiscreteEvents = [];

// 指示是否有任何连续事件目标对于早期救助不为空。
let hasAnyQueuedConinuousEvents = false;

// 每个连续事件类型的最后一个。如果最后一个目标脱水，我们只需要重放最后一个。
let queuedFocus = null;
let queuedDrag = null;
let queuedMouse = null;
// 对于指针事件，每个pointerId可以有一个最新事件。
let queuedPointers = new Map();
let queuedPointerCaptures = new Map();
/**
 * type QuquedHydrationTarget = {
 *    blockedOn: null | Container | SuspenseInstance,
 *    target: Node,
 *    priority: number,
 * };
 * 
 * queuedExplicitHydrationTargets: Array<QuquedHydrationTarget>
 */
let queuedExplicitHydrationTargets = [];

export function hasQueuedDiscreteEvents() {
  return queuedDiscreteEvents.length > 0;
}

const discreteReplayableEvents = [
  TOP_MOUSE_DOWN,
  TOP_MOUSE_UP,
  TOP_TOUCH_CANCEL,
  TOP_TOUCH_END,
  TOP_TOUCH_START,
  TOP_AUX_CLICK,
  TOP_DOUBLE_CLICK,
  TOP_POINTER_CANCEL,
  TOP_POINTER_DOWN,
  TOP_POINTER_UP,
  TOP_DRAG_END,
  TOP_DRAG_START,
  TOP_DROP,
  TOP_COMPOSITION_END,
  TOP_COMPOSITION_START,
  TOP_KEY_DOWN,
  TOP_KEY_PRESS,
  TOP_KEY_UP,
  TOP_INPUT,
  TOP_TEXT_INPUT,
  TOP_CLOSE,
  TOP_CANCEL,
  TOP_COPY,
  TOP_CUT,
  TOP_PASTE,
  TOP_CLICK,
  TOP_CHANGE,
  TOP_CONTEXT_MENU,
  TOP_RESET,
  TOP_SUBMIT,
];

const continuousReplayableEvents = [
  TOP_FOCUS,
  TOP_BLUR,
  TOP_DRAG_ENTER,
  TOP_DRAG_LEAVE,
  TOP_MOUSE_OVER,
  TOP_MOUSE_OUT,
  TOP_POINTER_OVER,
  TOP_POINTER_OUT,
  TOP_GOT_POINTER_CAPTURE,
  TOP_LOST_POINTER_CAPTURE,
];

// 可重复使用的事件类型
export function isReplayableDiscreteEvent(eventType) {
  return discreteReplayableEvents.indexOf(eventType) > -1;
}

function trapReplayableEvent(topLevelType, document, listeningSet) {
  listenToTopLevel(topLevelType, document, listeningSet);
  if (enableFlareAPI) {
    // Trap events for the responder system 响应程序系统的陷阱事件。
    const passiveEventKey = unsafeCastDOMTopLevelTypeToString(topLevelType) + '_passive';
    if (!listeningSet.has(passiveEventKey)) {
      trapEventForResponderEventSystem(document, topLevelType, true);
      listeningSet.add(passiveEventKey);
    }

    const activeEventKey = unsafeCastDOMTopLevelTypeToString(topLevelType) + '_active';
    if (!listeningSet.has(activeEventKey)) {
      trapEventForResponderEventSystem(document, topLevelType, false);
      listeningSet.add(activeEventKey);
    }
  }
}

export function eagerlyTrapReplayableEvents(document) {
  const listeningSet = getListeningSetForElement(document);

  // Discrete
  discreteReplayableEvents.forEach(topLevelType => {
    trapReplayableEvent(topLevelType, document, listeningSet);
  });
  // Continuous
  continuousReplayableEvents.forEach(topLevelType => {
    trapReplayableEvent(topLevelType, document, listeningSet);
  });
}

function createQueuedReplayableEvent(blockedOn, topLevelType, eventSystemFlags, nativeEvent) {
  return {
    blockedOn,
    topLevelType,
    eventSystemFlags: eventSystemFlags | IS_REPLAYED,
    nativeEvent,
  };
}

export function queueDiscreteEvent(blockedOn, topLevelType, eventSystemFlags, nativeEvent) {
  const queuedEvent = createQueuedReplayableEvent(blockedOn, topLevelType, eventSystemFlags, nativeEvent);
  queuedDiscreteEvents.push(queuedEvent);
  if (enableSelectiveHydration) {
    if (queuedDiscreteEvents.length === 1) {
      // 如果这是第一个离散事件，我们可以同步解除锁定，这样 preventDefault 仍然可以工作。
      while (queuedEvent.blockedOn !== null) {
        let fiber = getInstanceFromNode(queuedEvent.blockedOn);
        if (fiber === null) {
          break;
        }
        attemptSynchronousHydration(fiber);
        if (queuedEvent.blockedOn === null) {
          // 通过hydration后，再次尝试
          replayUnblockedEvents();
          // 如果在内部被重新锁定，可能需要尝试hydration
          continue;
        } else {
          // 被阻止的情况下，先放弃稍后重试
          break;
        }
      }
    }
  }
}

// 将此类型的连续事件的重播重置为无事件。
export function clearIfContinuousEvent(topLevelType, nativeEvent) {
  switch (topLevelType) {
    case TOP_FOCUS:
    case TOP_BLUR:
      queuedFocus = null;
      break;
    case TOP_DRAG_ENTER:
    case TOP_DRAG_LEAVE:
      queuedDrag = null;
      break;
    case TOP_MOUSE_OVER:
    case TOP_MOUSE_OUT:
      queuedMouse = null;
      break;
    case TOP_POINTER_OVER:
    case TOP_POINTER_OUT: {
      let pointerId = nativeEvent.pointerId;
      queuedPointers.delete(pointerId);
      break;
    }
    case TOP_GOT_POINTER_CAPTURE:
    case TOP_LOST_POINTER_CAPTURE: {
      let pointerId = nativeEvent.pointerId;
      queuedPointerCaptures.delete(pointerId);
      break;
    }
  }
}

// 累计或创建连续排队的可重放事件
function accumulateOrCreateContinuousQueuedReplayableEvent(existingQueuedEvent, blockedOn, topLevelType, eventSystemFlags, nativeEvent) {
  if (existingQueuedEvent === null || existingQueuedEvent.nativeEvent !== nativeEvent) {
    let queuedEvent = createQueuedReplayableEvent(blockedOn, topLevelType, eventSystemFlags, nativeEvent);
    if (blockedOn !== null) {
      let fiber = getInstanceFromNode(blockedOn);
      if (fiber !== null) {
        // 尝试增加fiber优先级
        attemptContinuousHydration(fiber);
      }
    }
    return queuedEvent;
  }

  // 如果我们已经将这个确切的事件排队，那是因为不同的事件系统有不同的DOM事件监听器。我们可以累积标志并存储一个要重播的事件。
  existingQueuedEvent.eventSystemFlags |= eventSystemFlags;
  return existingQueuedEvent;

}

export function queueIfContinuousEvent(blockedOn, topLevelType, eventSystemFlags, nativeEvent) {
  /**
   * - 这些设置将relatedTarget设置为空，因为重播的事件将被视为从窗口外部（没有目标）移动到目标上，一旦它水合物。我们可以克隆事件而不是变异。
   */
  switch (topLevelType) {
    case TOP_FOCUS: {
      const focusEvent = nativeEvent;
      queuedFocus = accumulateOrCreateContinuousQueuedReplayableEvent(queuedFocus, blockedOn, topLevelType, eventSystemFlags, focusEvent);
      return true;
    }
    case TOP_DRAG_ENTER: {
      const dragEvent = nativeEvent;
      queuedDrag = accumulateOrCreateContinuousQueuedReplayableEvent(queuedDrag, blockedOn, topLevelType, eventSystemFlags, dragEvent);
      return true;
    }
    case TOP_MOUSE_OVER: {
      const mouseEvent = nativeEvent;
      queuedMouse = accumulateOrCreateContinuousQueuedReplayableEvent(queuedMouse, blockedOn, topLevelType, eventSystemFlags, mouseEvent);
      return true;
    }
    case TOP_POINTER_OVER: {
      const pointerEvent = nativeEvent;
      const pointerId = pointerEvent.pointerId;
      queuedPointers.set(pointerId, accumulateOrCreateContinuousQueuedReplayableEvent(queuedPointers.get(pointerId) || null, blockedOn, topLevelType, eventSystemFlags, pointerEvent));
      return true;
    }
    case TOP_GOT_POINTER_CAPTURE: {
      const pointerEvent = nativeEvent;
      const pointerId = pointerEvent.pointerId;
      queuedPointerCaptures.set(
        pointerId,
        accumulateOrCreateContinuousQueuedReplayableEvent(
          queuedPointerCaptures.get(pointerId) || null,
          blockedOn,
          topLevelType,
          eventSystemFlags,
          pointerEvent,
        ),
      );
      return true;
    }
  }
  return false;
}

function attemptReplayContinuousQueuedEvent(queuedEvent) {
  if (queuedEvent.blockedOn !== null) {
    return false;
  }
  let nextBlockedOn = attemptToDispatchEvent(queuedEvent.topLevelType, queuedEvent.eventSystemFlags, queuedEvent.nativeEvent);
  if (nextBlockedOn !== null) {
    let fiber = getInstanceFromNode(nextBlockedOn);
    if (fiber !== null) {
      attemptContinuousHydration(fiber);
    }
    queuedEvent.blockedOn = nextBlockedOn;
    return false;
  }
  return true;
}


function replayUnblockedEvents() {
  hasScheduledReplayAttempt = false;

  // 第一次replay离散事件
  while (queuedDiscreteEvents.length > 0) {
    let nextDiscreteEvent = queuedDiscreteEvents[0];
    if (nextDiscreteEvent.blockedOn !== null) {
      // 还是被锁
      // 增加优先级已接触锁定
      // 下一个离散事件
      let fiber = getInstanceFromNode(nextDiscreteEvent.blockedOn);
      if (fiber !== null) {
        attemptUserBlockingHydration(fiber);
      }
      break;
    }
    let nextBlockedOn = attemptToDispatchEvent(nextDiscreteEvent.topLevelType, nextDiscreteEvent.eventSystemFlags, nextDiscreteEvent.nativeEvent);
    if (nextBlockedOn !== null) {
      // 如果还是被锁定，等会再试
      nextDiscreteEvent.blockedOn = nextBlockedOn;
    } else {
      // 我们成功的重播了第一个事件，进行下一个吧
      queuedDiscreteEvents.shift();
    }
  }

  // 下一步重播任何连续事件。
  if (queuedFocus !== null && attemptReplayContinuousQueuedEvent(queuedFocus)) {
    queuedFocus = null;
  }
  if (queuedDrag !== null && attemptReplayContinuousQueuedEvent(queuedDrag)) {
    queuedDrag = null;
  }
  if (queuedMouse !== null && attemptReplayContinuousQueuedEvent(queuedMouse)) {
    queuedMouse = null;
  }
  queuedPointers.forEach(attemptReplayContinuousQueuedEvent);
  queuedPointerCaptures.forEach(attemptReplayContinuousQueuedEvent);
}

/**
 * 调度回调，如果是未阻塞的
 * @param {QueueReplayableEvent} queuedEvent 
 * @param {Element|SuspenseInstance} unblocked 
 */
function scheduleCallbackIfUnblocked(queuedEvent, unblocked) {
  if (queuedEvent.blockedOn === unblocked) {
    queuedEvent.blockedOn = null;
    if (!hasScheduledReplayAttempt) {
      hasScheduledReplayAttempt = true;
      // 安排回调以尝试重播当前已解除阻止的尽可能多的事件。第一个可能还没有被解除阻塞。我们可以提前检查以避免安排不必要的回调。
      scheduleCallback(NormalPriority, replayUnblockedEvents);
    }
  }
}

/**
 * 如果事件被阻止，重试
 * @param {Element|SuspenseInstance} unblocked 
 */
export function retryIfBlockedOn(unblocked) {
  // 将此上被阻止的任何内容标记为不再被阻止且符合重播条件。
  if (queuedDiscreteEvents.length > 0) {
    scheduleCallbackIfUnblocked
  }
}