import { enableFlareAPI } from "../../../shared/ReactFeatureFlags";
import { DOCUMENT_NODE } from "../shared/HTMLNodeType";
import { batchedEventUpdates, flushDiscreteUpdatesIfNeeded, discreteUpdates } from "../../../legacy-events/ReactGenericBatching";
import { IS_PASSIVE, PASSIVE_NOT_SUPPORTED } from "../../../legacy-events/EventSystemFlags";
import { HostPortal, HostComponent, ScopeComponent } from "../../../shared/ReactWorkTags";
import { DiscreteEvent, UserBlockingEvent, ContinuousEvent } from "../../../shared/ReactTypes";
import * as Scheduler from '../../../scheduler';

const {
  unstable_UserBlockingPriority: UserBlockingPriority,
  unstable_runWithPriority: runWithPriority,
} = Scheduler;

const rootEventTypesToEventResponderInstances = new Map();

// 不要传播到下一个响应者
const DoNotPropagateToNextResponder = 0;
// 传播到下一个响应器
const PropagateToNextResponder = 1;

let currentTimeStamp = 0;
let currentInstance = null;
let currentDocument = null;
let currentPropagationBehavior = DoNotPropagateToNextResponder;

const eventResponderContext = {
  dispatchEvent(eventValue, eventListener, eventPriority) {
    validateResponderContext();
    validateEventValue(eventValue);
    switch (eventPriority) {
      case DiscreteEvent: {
        flushDiscreteUpdatesIfNeeded(currentTimeStamp);
        discreteUpdates(() => executeUserEventHandler(eventListener, eventValue));
        break;
      }
      case UserBlockingEvent: {
        runWithPriority(UserBlockingPriority, () => executeUserEventHandler(eventListener, eventValue));
        break;
      }
      case ContinuousEvent: {
        executeUserEventHandler(eventListener, eventValue);
      }
    }
  },
  // TODO: 待补充
};

function validateEventValue(eventValue) {
  if (typeof eventValue === 'object' && eventValue !== null) {
    const { target, type, timeStamp } = eventValue;

    if (target == null || type == null || timeStamp == null) {
      throw new Error('context.dispatchEvent: "target", "timeStamp", and "type" fields on event object are required.',)
    }
    // ...下面都是dev环境警告
  }
}

function createDOMResponderEvent(topLevelType, nativeEvent, nativeEventTarget, passive, passiveSupported) {
  const { buttons, pointerType } = nativeEvent;
  let eventPointerType = '';
  if (pointerType !== undefined) {
    eventPointerType = pointerType;
  } else if (pointerType.key !== undefined) {
    eventPointerType = 'keyboard';
  } else if (buttons !== undefined) {
    eventPointerType = 'mouse';
  } else if (nativeEvent.changedTouches !== undefined) {
    eventPointerType = 'touch';
  }

  return {
    nativeEvent,
    passive,
    passiveSupported,
    pointerType: eventPointerType,
    target: nativeEventTarget,
    type: topLevelType,
  };
}

function responderEventTypesContainType(eventTypes, type) {
  for (let i = 0, len = eventTypes.length; i < len; i++) {
    if (eventTypes[i] === type) {
      return true;
    }
  }
  return false;
}

function validateResponderTargetEventTypes(eventType, responder) {
  const { targetEventTypes } = responder;
  // 验证目标事件在responder中存在
  if (targetEventTypes !== null) {
    return responderEventTypesContainType(targetEventTypes, eventType);
  }
  return false;
}

// 遍历和处理事件响应程序实例
function traverseAndHandleEventResponderInstances(topLevelType, targetFiber, nativeEvent, nativeEventTarget, eventSystemFlags) {
  const isPassiveEvent = (eventSystemFlags & IS_PASSIVE) !== 0;
  const isPassiveSupported = (eventSystemFlags & PASSIVE_NOT_SUPPORTED) === 0;
  const isPassive = isPassiveEvent || !isPassiveSupported;
  const eventType = isPassive ? topLevelType : `${topLevelType}_active`;
  // 按照这个顺序触发事件响应器：
  // - 冒泡事件响应
  // - root响应阶段
  const visitedResponders = new Set();
  const responderEvent = createDOMResponderEvent(topLevelType, nativeEvent, nativeEventTarget, isPassiveEvent, isPassiveSupported);
  let node = targetFiber;
  let insidePortal = false;
  while (node !== null) {
    const { dependencies, tag } = node;
    if (tag === HostPortal) {
      insidePortal = true;
    } else if (
      (tag === HostComponent || tag === ScopeComponent) &&
      dependencies !== null
    ) {
      const respondersMap = dependencies.responders;
      if (respondersMap !== null) {
        const responderInstances = Array.from(respondersMap.values());
        for (let i = 0, length = responderInstances.length; i < length; i++) {
          const responderInstance = responderInstances[i];
          const { props, responder, state } = responderInstance;
          if (
            !visitedResponders.has(responder) &&
            validateResponderTargetEventTypes(eventType, responder) &&
            (!insidePortal || responder.targetPortalPropagation)
          ) {
            visitedResponders.add(responder);
            const onEvent = responder.onEvent;
            if (onEvent !== null) {
              currentInstance = responderInstance;
              onEvent(responderEvent, eventResponderContext, props, state);
              if (currentPropagationBehavior === PropagateToNextResponder) {
                visitedResponders.delete(responder);
                currentPropagationBehavior = DoNotPropagateToNextResponder;
              }
            }
          }
        }
      }
    }

    node = node.return;
  }

  // Root 阶段
  const rootEventResponderInstances = rootEventTypesToEventResponderInstances.get(eventType);
  if (rootEventResponderInstances !== undefined) {
    const responderInstances = Array.from(rootEventResponderInstances);

    for (let i = 0; i < responderInstances.length; i++) {
      const responderInstance = responderInstances[i];
      const { props, responder, state } = responderInstance;
      const onRootEvent = responder.onRootEvent;
      if (onRootEvent !== null) {
        currentInstance = responderInstance;
        onRootEvent(responderEvent, eventResponderContext, props. state);
      }
    }
  }

}

export function mountEventResponder(responder, responderInstance, props, state) {
  const onMount = responder.onMount;
  if (onMount !== null) {
    const previousInstance = currentInstance;
    currentInstance = responderInstance;
    try {
      batchedEventUpdates(() => {
        onMount(eventResponderContext, props, state);
      })
    } finally {
      currentInstance = previousInstance;
    }
  }
}

export function unmountEventResponder(responderInstance) {
  const responder = responderInstance.responder;
  const onUnmount = responder.onUnmount;
  if (onUnmount !== null) {
    let { props, state } = responderInstance;
    const previousInstance = currentInstance;
    currentInstance = responderInstance;
    try {
      batchedEventUpdates(() => {
        onUnmount(eventResponderContext, props, state);
      });
    } finally {
      currentInstance = previousInstance;
    }
  }

  const rootEventTypsSet = responderInstance.rootEventTypes;
  if (rootEventTypsSet !== null) {
    const rootEventTypes = Array.from(rootEventTypsSet);

    for (let i = 0; i < rootEventTypes.length; i++) {
      const topLevelEventType = rootEventTypes[i];
      let rootEventResponderInstances = rootEventTypesToEventResponderInstances.get(topLevelEventType);
      if (rootEventResponderInstances !== undefined) {
        rootEventResponderInstances.delete(responderInstance);
      }
    }
  }
}

function validateResponderContext() {
  // invariant(currentInstance !== null, '.....);
}


export function dispatchEventForResponderEventSystem(topLevelType, targetFiber, nativeEvent, nativeEventTarget, eventSystemFlags) {
  if (enableFlareAPI) {
    const previousInstance = currentInstance;
    const previousTimeStamp = currentTimeStamp;
    const previousDocument = currentDocument;
    const previousPropagationBehavior = currentPropagationBehavior;
    currentPropagationBehavior = DoNotPropagateToNextResponder;

    currentDocument = nativeEventTarget.nodeType === DOCUMENT_NODE ? nativeEventTarget : nativeEventTarget.ownerDocument;
    currentTimeStamp = nativeEvent.timeStamp;
    try {
      batchedEventUpdates(() => {
        traverseAndHandleEventResponderInstances(topLevelType, targetFiber, nativeEvent, nativeEventTarget, eventSystemFlags);
      });
    } finally {
      currentInstance = previousInstance;
      currentTimeStamp = previousTimeStamp;
      currentDocument = previousDocument;
      currentPropagationBehavior = previousPropagationBehavior;
    }
  }
}

export function addRootEventTypesForResponderInstance(responderInstance, rootEventTypes) {
  for (let i = 0; i < rootEventTypes.length; i++) {
    const rootEventType = rootEventTypes[i];
    registerRootEventType(rootEventType, responderInstance);
  }
}

function registerRootEventType(rootEventType, eventResponderInstance) {
  let rootEventResponderInstances = rootEventTypesToEventResponderInstances.get(rootEventType);

  if (rootEventResponderInstances === undefined) {
    rootEventResponderInstances = new Set();
    rootEventTypesToEventResponderInstances.set(rootEventType, rootEventResponderInstances);
  }

  let rootEventTypesSet = eventResponderInstance.rootEventTypes;
  if (rootEventTypesSet) {
    rootEventTypesSet = eventResponderInstance.rootEventTypes = new Set();
  }
  rootEventTypesSet.add(rootEventType);
  rootEventResponderInstances.add(eventResponderInstance);
}