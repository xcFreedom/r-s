import {
  enableSelectiveHydration,
} from '../../../shared/ReactFeatureFlags';
import {
  attemptToDispatchEvent,
} from './ReactDOMEventListener';
import { getListeningSetForElement } from './ReactBrowserEventEmitter';
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

// 尝试同步混合
let attemptSynchronousHydration;
export function setAttemptSynchronousHydration(fn) {
  attemptSynchronousHydration = fn;
}

// 尝试
let attemptUserBlockingHydration;
export function setAttemptUserBlockingHydration(fn) {
  attemptUserBlockingHydration = fn;
}

// 有计划的尝试replay
let hasScheduledReplayAttempt = false;


let queuedDiscreteEvents = [];
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

// 可重复使用的事件类型
export function isReplayableDiscreteEvent(eventType) {
  return discreteReplayableEvents.indexOf(eventType) > -1;
}

function trapReplayableEvent(topLevelType, document, listeningSet) {
  listenToTopLevel
}

export function eagerlyTrapReplayableEvents(document) {
  const listeningSet = getListeningSetForElement(document);

  discreteReplayableEvents.forEach(topLevelType => {
    trapReplayableEvent();
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
          break;
        } else {
          // 被阻止的情况下，先放弃稍后重试
          break;
        }
      }
    }
  }
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
    let nextBlockedOn = attemptToDispatchEvent
  }
}