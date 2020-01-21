import { NoWork } from "./ReactFiberExpirationTime";
import { HostComponent, HostRoot } from "react-study/shared/ReactWorkTags";
import { mountResponderInstance } from "./ReactFiberHostConfig";

const emptyObject = {};
const isArray = Array.isArray;

export function createResponderInstance(responder, responderProps, responderState, fiber) {
  return {
    fiber,
    props: responderProps,
    responder,
    rootEventTypes: null,
    state: responderState,
  };
}

function mountEventResponder(responder, responderProps, fiber, respondersMap, rootContainerInstance) {
  let responderState = emptyObject;
  const getInitialState = responder.getInitialState;
  if (getInitialState !== null) {
    responderState = getInitialState(responderProps);
  }

  const responderInstance = createResponderInstance(responder, responderProps, responderState, fiber);

  if (!rootContainerInstance) {
    let node = fiber;
    while (node !== null) {
      const tag = node.tag;
      if (tag === HostComponent) {
        rootContainerInstance = node.stateNode;
        break;
      } else if (tag === HostRoot) {
        rootContainerInstance = node.stateNode.containerInfo;
        break;
      }
      node = node.return;
    }
  }

  mountResponderInstance(responder, responderInstance, responderProps, responderState, rootContainerInstance);

  respondersMap.set(responder, responderInstance);
}


function updateEventListener(listener, fiber, visistedResponders, respondersMap, rootContainerInstance) {
  let responder;
  let props;
  if (listener) {
    responder = listener.responder;
    props = listener.props;
  }

  const listenerProps = props;
  if (visistedResponders.has(responder)) {
    return;
  }
  visistedResponders.add(responder);
  const responderInstance = respondersMap.get(responder);
  if (responderInstance === undefined) {
    mountEventResponder(responder, listenerProps, fiber, respondersMap, rootContainerInstance);
  } else {
    // 更新（仅在提交阶段发生）
    responderInstance.props = listenerProps;
    responderInstance.fiber = fiber;
  }
}

/**
 * 遍历更新事件监听器
 * @param {any} listeners 
 * @param {Fiber} fiber 
 * @param {Element} rootContainerInstance 
 */
export function updateEventListeners(listeners, fiber, rootContainerInstance) {
  const visistedResponders = new Set();
  let dependencies = fiber.dependencies;
  if (listeners != null) {
    if (dependencies === null) {
      dependencies = fiber.dependencies = {
        expirationTime: NoWork,
        firstContext: null,
        responders: new Map(),
      };
    }

    let respondersMap = dependencies.responders;
    if (respondersMap === null) {
      respondersMap = new Map();
    }
    if (isArray(listeners)) {
      for (let i = 0, length = listeners.length; i < length; i++) {
        const listener = listeners[i];
        updateEventListener(listener, fiber, visistedResponders, respondersMap);
      }
    } else {
      updateEventListener(listeners, fiber, visistedResponders, respondersMap, rootContainerInstance);
    }
  }
}

export function createResponderListener(responder, props) {
  const eventResponderListener = {
    responder,
    props,
  };
  return eventResponderListener;
}