import SimpleEventPlugin from './SimpleEventPlugin';
import { DiscreteEvent, UserBlockingEvent, ContinuousEvent } from '../../../shared/ReactTypes';
import { flushDiscreteUpdatesIfNeeded, discreteUpdates } from '../../../legacy-events/ReactGenericBatching';
import {
  hasQueuedDiscreteEvents,
  isReplayableDiscreteEvent,
  queueDiscreteEvent,
  clearIfContinuousEvent,
} from './ReactDOMEventReplaying';
import getEventTarget from './getEventTarget';
import { getClosestInstanceFromNode } from '../client/ReactDOMComponentTree';
import {
  getNearestMountedFiber,
  getSuspenseInstanceFromFiber,
  getContainerFromFiber,
} from '../../../react-reconciler/src/ReactFiberTreeReflection';
import { SuspenseComponent, HostRoot } from '../../../shared/ReactWorkTags';
import { enableFlareAPI } from '../../../shared/ReactFeatureFlags';
import {
  PLUGIN_EVENT_SYSTEM, RESPONDER_EVENT_SYSTEM, IS_PASSIVE, IS_ACTIVE, PASSIVE_NOT_SUPPORTED,
} from '../../../legacy-events/EventSystemFlags';
import {
  batchedEventUpdates,
} from '../../../legacy-events/ReactGenericBatching';
import { dispatchEventForResponderEventSystem } from './DOMEventResponderSystem';
import {
  unstable_runWithPriority as runWithPriority,
} from 'react-study/scheduler';
import { UserBlockingPriority } from 'react-study/scheduler/src/SchedulerPriorities';
import { addEventCaptureListener, addEventBubbleListener, addEventCaptureListenerWithPassiveFlag } from './Eventlistener';
import { getRawEventName } from './DOMTopLevelEventTypes';
import { passiveBrowserEventsSupported } from './checkPassiveEvents';

const { getEventPriority } = SimpleEventPlugin;

const CALLBACK_BOOKKEEPING_POOL_SIZE = 10;
const callbackBookkeepingPool = [];

// 用于在顶级回调中存储祖先层次结构
function getTopLevelCallbackBookKeeping(topLevelType, nativeEvent, targetInst, eventSystemFlags) {
  if (callbackBookkeepingPool.length) {
    const instance = callbackBookkeepingPool.pop();
    instance.topLevelType = topLevelType;
    instance.eventSystemFlags = eventSystemFlags;
    instance.nativeEvent = nativeEvent;
    instance.targetInst = targetInst;
    return instance;
  }
  return {
    topLevelType,
    eventSystemFlags,
    nativeEvent,
    targetInst,
    ancestors: [],
  };
}

function releaseTopLevelCallbackBookKeeping(instance) {
  instance.topLevelType = null;
  instance.nativeEvent = null;
  instance.targetInst = null;
  instance.ancestors.length = 0;
  if (callbackBookkeepingPool.length < CALLBACK_BOOKKEEPING_POOL_SIZE) {
    callbackBookkeepingPool.push(instance);
  }
}

function handleTopLevel(bookKeeping) {
  // TODO: 待补充
}

export let _enabled = true;

export function setEnabled(enabled) {
  _enabled = !!enabled;
}

export function isEnabled() {
  return _enabled;
}

export function trapBubbledEvent(topLevelType, element) {
  trapEventForPluginEventSystem(element, topLevelType, false);
}

export function trapCapturedEvent(topLevelType, element) {
  trapEventForPluginEventSystem(element, topLevelType, true);
}

export function trapEventForResponderEventSystem(element, topLevelType, passive) {
  if (enableFlareAPI) {
    const rawEventName = getRawEventName(topLevelType);
    let eventFlags = RESPONDER_EVENT_SYSTEM;
    // 如果不支持被动选项，则事件将是主动的而不是被动的，但我们将其标记为使用不受支持。这样响应程序事件插件就知道了，并且可以在需要时提供polyfill。
    if (passive) {
      if (passiveBrowserEventsSupported) {
        eventFlags |= IS_PASSIVE;
      } else {
        eventFlags |= IS_ACTIVE;
        eventFlags |= PASSIVE_NOT_SUPPORTED;
        passive = false;
      }
    } else {
      eventFlags |= IS_ACTIVE;
    }

    //  Check if interactive and wrap in discreteUpdates 检查是否交互式，并以离散更新形式包装
    const listener = dispatchEvent.bind(null, topLevelType, eventFlags);
    if (passiveBrowserEventsSupported) {
      addEventCaptureListenerWithPassiveFlag(element, rawEventName, listener, passive);
    } else {
      addEventCaptureListener(element, rawEventName, listener);
    }
  }
}

function trapEventForPluginEventSystem(element, topLevelType, capture) {
  let listener;
  switch (getEventPriority(topLevelType)) {
    case DiscreteEvent:
      listener = dispatchDiscreteEvent.bind(null, topLevelType, PLUGIN_EVENT_SYSTEM);
      break;
    case UserBlockingEvent:
      listener = dispatchUserBlockingUpdate.bind(null, topLevelType, PLUGIN_EVENT_SYSTEM);
      break;
    case ContinuousEvent:
    default:
      listener = dispatchEvent.bind(null, topLevelType, PLUGIN_EVENT_SYSTEM);
      break;
  }

  const rawEventName = getRawEventName(topLevelType);
  if (capture) {
    addEventCaptureListener(element, rawEventName, listener);
  } else {
    addEventBubbleListener(element, rawEventName, listener);
  }
}

function dispatchDiscreteEvent(topLevelType, eventSystemFlags, nativeEvent) {
  flushDiscreteUpdatesIfNeeded(nativeEvent.timeStamp);
  discreteUpdates(dispatchEvent, topLevelType, eventSystemFlags, nativeEvent);
}

function dispatchUserBlockingUpdate(topLevelType, eventSystemFlags, nativeEvent) {
  runWithPriority(UserBlockingPriority, dispatchEvent.bind(null, topLevelType, eventSystemFlags, nativeEvent));
}

function dispatchEventForPluginEventSystem(topLevelType, eventSystemFlags, nativeEvent, targetInst) {
  const bookKeeping = getTopLevelCallbackBookKeeping(topLevelType, nativeEvent, targetInst, eventSystemFlags);
  try {
    //在同一周期中处理的事件队列允许“preventDefault”。
    batchedEventUpdates(handleTopLevel, bookKeeping);
  } finally {
    releaseTopLevelCallbackBookKeeping(bookKeeping);
  }
}

export function dispatchEvent(topLevelType, eventSystemFlags, nativeEvent) {
  if (!_enabled) {
    return;
  }
  if (hasQueuedDiscreteEvents() && isReplayableDiscreteEvent(topLevelType)) {
    /**
     * 如果我们已经有一个离散事件队列，而这是另一个离散事件，那么我们就不能不管它的目标是什么都分发它，因为它们需要按顺序分发。
     */
    queueDiscreteEvent(null, topLevelType, eventSystemFlags, nativeEvent);
    return;
  }

  const blockedOn = attemptToDispatchEvent(topLevelType, eventSystemFlags, nativeEvent);

  if (blockedOn === null) {
    // 我们成功的dispatch了事件
    clearIfContinuousEvent(topLevelType, nativeEvent);
    return;
  }

  if (isReplayableDiscreteEvent(topLevelType)) {
    // 这将在目标可用后重新播放。
    queueDiscreteEvent(blockedOn, topLevelType, eventSystemFlags, nativeEvent);
    return;
  }

  if (queueIfContinuousEvent(blockedOn, topLevelType, eventSystemFlags, nativeEvent)) {
    return;
  }

  // 只有当我们不排队时才需要清除，因为排队是累积的。
  clearIfContinuousEvent(topLevelType, nativeEvent);

  // 这是不可重放的，因此我们将调用它，但没有目标，以防事件系统需要跟踪它。
  if (enableFlareAPI) {
    if (eventSystemFlags & PLUGIN_EVENT_SYSTEM) {
      dispatchEventForPluginEventSystem(topLevelType, eventSystemFlags, nativeEvent, null);
    }
    if (eventSystemFlags & RESPONDER_EVENT_SYSTEM) {
      dispatchEventForResponderEventSystem(topLevelType, null, nativeEvent, getEventTarget(native), eventSystemFlags);
    }
  } else {
    dispatchEventForPluginEventSystem(topLevelType, eventSystemFlags, nativeEvent, null);
  }
}


export function attemptToDispatchEvent(topLevelType, eventSystemFlags, nativeEvent) {
  const nativeEventTarget = getEventTarget(nativeEvent);
  let targetInst = getClosestInstanceFromNode(nativeEventTarget);

  if (targetInst !== null) {
    let nearestMounted = getNearestMountedFiber(targetInst);
    if (nearestMounted === null) {
      // 这颗树已经被卸载了，分配不到目标;
      targetInst = null;
    } else {
      const tag = nearestMounted.tag;
      if (tag === SuspenseComponent) {
        let instance = getSuspenseInstanceFromFiber(nearestMounted);
        if (instance !== null) {
          /**
           * - 将稍后要重播的事件排队
           * - 中止调度，因为不希望这个事件通过事件系统调度两次
           */
          return instance;
        }
        /**
         * - 这不应该发生，出了问题，但是为了避免阻塞整个系统，在没有目标的情况下调度事件。
         */
        targetInst = null;
      } else if (tag === HostRoot) {
        const root = nearestMounted.stateNode;
        if (root.hydrate) {
          // 如果在重播过程中发生这种情况，可能会出现问题，从而阻塞整个系统
          return getContainerFromFiber(nearestMounted);
        }
        targetInst = null;
      } else if (nearestMounted !== targetInst) {
        /**
         * - 如果在committing组件的mount之前我们得到了一个事件，（比如img的onload事件），那么现在忽略它（将其视为非React树上的事件）。
         * - 我们还可以考虑将事件排队并在mount后将其dispatch。
         */
        targetInst = null;
      }
    }
  }

  if (enableFlareAPI) {
    if (eventSystemFlags & PLUGIN_EVENT_SYSTEM) {
      dispatchEventForPluginEventSystem(topLevelType, eventSystemFlags, nativeEvent, targetInst);
    }
    if (eventSystemFlags & RESPONDER_EVENT_SYSTEM) {
      // react flare event system
      dispatchEventForResponderEventSystem(topLevelType. targetInst, nativeEvent, nativeEventTarget, eventSystemFlags);
    }
  } else {
    dispatchEventForPluginEventSystem(topLevelType, eventSystemFlags, nativeEvent, targetInst);
  }
  return null;
}