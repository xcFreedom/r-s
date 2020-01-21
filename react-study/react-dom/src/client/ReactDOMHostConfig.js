import { COMMENT_NODE, ELEMENT_NODE, TEXT_NODE, DOCUMENT_NODE, DOCUMENT_FRAGMENT_NODE } from '../shared/HTMLNodeType';

export {
  unstable_now as now,
  unstable_cancelCallback as cancelDeferredCallback,
} from '../../../scheduler';
import {
  isEnabled as ReactBrowserEventEmitterIsEnabled,
  setEnabled as ReactBrowserEventEmitterSetEnabled,
} from '../events/ReactBrowserEventEmitter';
import { getSelectionInformation, restoreSelection } from './ReactInputSelection';
import setTextContent from './setTextContent';
import {
  trapClickOnNonInteractiveElement,
  updateProperties,
  listenToEventResponderEventTypes,
  diffProperties,
  createElement,
  setInitialProperties,
  createTextNode,
} from './ReactDOMComponent';
import dangerousStyleValue from '../shared/dangerousStyleValue';
import { updateFiberProps, precacheFiberNode } from './ReactDOMComponentTree';
import { addRootEventTypesForResponderInstance, mountEventResponder, unmountEventResponder } from '../events/DOMEventResponderSystem';
import { enableFundamentalAPI, enableFlareAPI, enableSuspenseServerRenderer } from 'react-study/shared/ReactFeatureFlags';
import { retryIfBlockedOn } from '../events/ReactDOMEventReplaying';
import { getChildNamespace } from '../shared/DOMNamespaces';


const SUSPENSE_START_DATA = '$';
const SUSPENSE_END_DATA = '/$';
const SUSPENSE_PENDING_START_DATA = '$?';
const SUSPENSE_FALLBACK_START_DATA = '$!';

const STYLE = 'style';

let eventsEnabled = null;
let selectionInformation = null;

function shouldAutoFocusHostComponent(type, props) {
  switch (type) {
    case 'button':
    case 'input':
    case 'select':
    case 'textarea':
      return !!props.autoFocus;
  }
  return false;
}

/**
 * 获取root的context
 * @param {Element} rootContainerInstance 
 */
export function getRootHostContext(rootContainerInstance) {
  let type;
  let namespace;
  const nodeType = rootContainerInstance.nodeType;
  switch (nodeType) {
    case DOCUMENT_NODE:
    case DOCUMENT_FRAGMENT_NODE: {
      type = nodeType === DOCUMENT_NODE ? '#document' : '#fragment';
      let root = rootContainerInstance.documentElement;
      namespace = root ? root.namespaceURI : getChildNamespace(null, '');
      break;
    }
    default: {
      const container = nodeType === COMMENT_NODE
        ? rootContainerInstance.parentNode
        : rootContainerInstance;
      const ownNamespace = container.namespaceURI || null;
      type = container.tagName;
      namespace = getChildNamespace(ownNamespace, type);
      break;
    }
  }
  return namespace;
}

/**
 * 
 * @param {HostContext} parentHostContext 
 * @param {string} type 
 * @param {Element} rootContainerInstance 
 */
export function getChildHostContext(parentHostContext, type, rootContainerInstance) {
  const parentNamespace = parentHostContext;
  return getChildNamespace(parentNamespace, type);
}

export const noTimeout = -1;

export function getPublicInstance(instance) {
  return instance;
}

/**
 * Commit前的准备工作
 * @param {*} containerInfo 
 */
export function prepareForCommit(containerInfo) {
  eventsEnabled = ReactBrowserEventEmitterIsEnabled();
  selectionInformation = getSelectionInformation();
  ReactBrowserEventEmitterSetEnabled(false);
}

export function resetAfterCommit(containerInfo) {
  restoreSelection(selectionInformation);
  selectionInformation = null;
  ReactBrowserEventEmitterSetEnabled(eventsEnabled);
  eventsEnabled = null;
}

/**
 * 创建dom元素实例
 * @param {string} type 
 * @param {Props} props 
 * @param {Element} rootContainerInstance 
 * @param {HostContext} hostContext 
 * @param {Fiber?} internalInstanceHandle 
 */
export function createInstance(type, props, rootContainerInstance, hostContext, internalInstanceHandle) {
  let parentNamespace;
  // 获取元素的namespace
  parentNamespace = hostContext;
  // 创建dom元素
  const domElement = createElement(type, props, rootContainerInstance, parentNamespace);
  // dom元素与fiber绑定
  precacheFiberNode(internalInstanceHandle, domElement);
  // dom元素与props绑定
  updateFiberProps(domElement, props);
  return domElement;
}

export function appendInitialChild(parentInstance, child) { // ???这和appendChild函数有啥区别？
  parentInstance.appendChild(child);
}

/**
 * 初始化元素属性， 返回元素是否需要auto focus
 * @param {Element} domElement 
 * @param {string} type 
 * @param {Props} props 
 * @param {Element} rootContainerInstance 
 * @param {HostContext} hostContext 
 */
export function finalizeInitialChildren(domElement, type, props, rootContainerInstance, hostContext) {
  setInitialProperties(domElement, type, props, rootContainerInstance);
  return shouldAutoFocusHostComponent(type, props);
}

/**
 * 准备更新，就是对diffProperties的一层包装，计算需要更新的props
 * @param {Element} domElement 
 * @param {string} type 
 * @param {Props} oldProps 
 * @param {Props} newProps 
 * @param {Element} rootContainerInstance 
 * @param {HostContext} hostContext 
 */
export function prepareUpdate(domElement, type, oldProps, newProps, rootContainerInstance, hostContext) {
  return diffProperties(domElement, type, oldProps, newProps, rootContainerInstance);
}

/**
 * 根据fiber的type判断，这个节点是否应该设置textContent
 * @param {string} type 
 * @param {Props} props 
 * @returns {boolean}
 */
export function shouldSetTextContent(type, props) {
  return (
    type === 'textarea' ||
    type === 'option' ||
    type === 'noscript' ||
    typeof props.children === 'string' ||
    typeof props.children === 'number' ||
    (typeof props.dangerouslySetInnerHTML === 'object' &&
      props.dangerouslySetInnerHTML !== null &&
      props.dangerouslySetInnerHTML.__html !== null)
  );
}

/**
 * 是否应该删除子树
 * @param {srting} type 
 * @param {Props} props 
 * @returns {boolean}
 */
export function shouldDeprioritizeSubtree(type, props) {
  return !!props.hidden;
}


/**
 * 创建Text实例
 * @param {string} text 
 * @param {Element} rootContainerInstance 
 * @param {HostContext} hostContext 
 * @param {Fiber} internalInstanceHandle 
 */
export function createTextInstance(text, rootContainerInstance, hostContext, internalInstanceHandle) {
  // 创建文本节点
  const textNode = createTextNode(text, rootContainerInstance);
  // 将fiber挂载在dom节点上
  precacheFiberNode(internalInstanceHandle, textNode);
  return textNode;
}

export const isPrimaryRenderer = true;
export const warnsIfNotActing = true;

export const scheduleTimeout = typeof setTimeout === 'function' ? setTimeout: undefined;
export const cancelTimeout = typeof clearTimeout === 'function' ? clearTimeout : undefined;
export const noTimeout = -1;

// -------------------
//     Mutation
// -------------------

export const supportsMutation = true;

/**
 * commit Mount
 * @param {Element} domElement 
 * @param {string} type 
 * @param {Props} newProps 
 * @param {Object} internalInstanceHandle 
 */
export function commitMount(domElement, type, newProps, internalInstanceHandle) {
  if (shouldAutoFocusHostComponent(type, newProps)) {
    domElement.focus();
  }
}

/**
 * commitUpdate
 * @param {Element} domElement 
 * @param {Array<mixed>} updatePayload 
 * @param {string} type 
 * @param {Props} oldProps 
 * @param {Props} newProps 
 * @param {Object} internalInstanceHandle 
 */
export function commitUpdate(domElement, updatePayload, type, oldProps, newProps, internalInstanceHandle) {
  // 更新props句柄，以便我们知道哪些props是当前事件处理程序的props。
  updateFiberProps(domElement, newProps);
  // 对DOM节点应用diff。
  updateProperties(domElement, updatePayload, type, oldProps, newProps);
}

/**
 * 
 * @param {Element} domElement 
 */
export function resetTextContent(domElement) {
  setTextContent(domElement, '');
}

export function commitTextUpdate(textInstance, oldText, newText) {
  textInstance.nodeValue = newText;
}

export function appendChild(parentInstance, child) {
  parentInstance.appendChild(child);
}


export function appendChildToContainer(container, child) {
  let parentNode;
  if (container.nodeType === COMMENT_NODE) {
    parentNode = container.parentNode;
    parentNode.insertBefore(child, container);
  } else {
    parentNode = container;
    parentNode.appendChild(child);
  }

  // 这段代码是为了Portal处理
  const reactRootContainer = container._reactRootContainer;
  if (
    (reactRootContainer === null || reactRootContainer === undefined) &&
    parentNode.onclick === null
  ) {
    // 对于SVG、MathML或自定义元素，此转换可能不正确。
    trapClickOnNonInteractiveElement(parentNode);
  }
}

/**
 * 
 * @param {Element} parentInstance 
 * @param {Element} child 
 * @param {Element} beforeChild 
 */
export function insertBefore(parentInstance, child, beforeChild) {
  parentInstance.insertBefore(child, beforeChild);
}

/**
 * 插入节点
 * @param {Element} container 
 * @param {Element} child 
 * @param {Element} beforeChild 
 */
export function insertInContainerBefore(container, child, beforeChild) {
  if (container.nodeType === COMMENT_NODE) {
    container.parentNode.insertBefore(child, beforeChild);
  } else {
    container.insertBefore(child, beforeChild);
  }
}

/**
 * 删除节点
 * @param {Element} parentInstance 
 * @param {Element} child 
 */
export function removeChild(parentInstance, child) {
  parentInstance.removeChild(child);
}

/**
 * 删除节点
 * @param {Element} container 
 * @param {Element} child 
 */
export function removeChildFromContainer(container, child) {
  if (container.nodeType === COMMENT_NODE) {
    container.parentNode.removeChild(child);
  } else {
    container.removeChild(child);
  }
}

export function clearSuspenseBoundary(parentInstance, suspenseInstance) {
  let node = suspenseInstance;
  // 删除此挂起边界内的所有节点。
  // 可能有嵌套的节点，所以我们需要跟踪我们的深度，只有当我们回到顶部时才会爆发。
  let depth = 0;
  do {
    let nextNode = node.nextSibling;
    parentInstance.removeChild(node);
    if (nextNode && nextNode.nodeType === COMMENT_NODE) {
      let data = nextNode.data;
      if (data === SUSPENSE_END_DATA) {
        if (depth === 0) {
          parentInstance.removeChild(nextNode);
          retryIfBlockedOn(suspenseInstance);
          return;
        } else {
          depth--;
        }
      } else if (
        data === SUSPENSE_START_DATA ||
        data === SUSPENSE_PENDING_START_DATA ||
        data === SUSPENSE_FALLBACK_START_DATA
      ) {
        depth++;
      }
    }
    node = nextNode;
  } while (node);

  retryIfBlockedOn(suspenseInstance);
}

export function clearSuspenseBoundaryFromContainer(container, suspenseInstance) {
  if (container.nodeType === COMMENT_NODE) {
    clearSuspenseBoundary(container.parentNode, suspenseInstance);
  } else if (container.nodeType === ELEMENT_NODE) {
    clearSuspenseBoundary(container, suspenseInstance);
  } else {

  }
  retryIfBlockedOn(container);
}

/**
 * 隐藏dom
 * @param {Element} instance 
 */
export function hideInstance(instance) {
  const style = instance.style;
  if (typeof style.setProperty === 'function') {
    style.setProperty('display', 'none', 'important');
  } else {
    style.display = 'none';
  }
}

/**
 * 隐藏nodeValue
 * @param {Text} textInstance 
 */
export function hideTextInstance(textInstance) {
  textInstance.nodeValue = '';
}


/**
 * 显示元素
 * @param {Element} instance 
 * @param {Props} props 
 */
export function unhideInstance(instance, props) {
  const styleProp = props[STYLE];
  const display =
    styleProp !== undefined &&
    styleProp !== null &&
    (
      styleProp.hasOwnProperty('display')
        ? styleProp.display
        : null
    );
  instance.style.display = dangerousStyleValue('display', display);
}

export function unhideTextInstance(textInstance, text) {
  textInstance.nodeValue = text;
}

// -------------------
//     Hydration
// -------------------

export const supportsHydration = true;

function getNextHydratable(node) {
  for (; node != null; node = node.nextSibling) {
    const nodeType = node.nodeType;
    if (nodeType === ELEMENT_NODE || nodeType === TEXT_NODE) {
      break;
    }
    if (enableSuspenseServerRenderer) {
      if (nodeType === COMMENT_NODE) {
        const nodeData = node.data;
        if (
          nodeData === SUSPENSE_START_DATA ||
          nodeData === SUSPENSE_FALLBACK_START_DATA ||
          nodeData === SUSPENSE_PENDING_START_DATA
        ) {
          break;
        }
      }
    }
  }
  return node;
}

export function getNextHydratableSibling(instance) {
  return getNextHydratable(instance.nextSibling);
}

export function getNextHydratableInstanceAfterSuspenseInstance(suspenseInstance) {
  let node = suspenseInstance.nextSibling;
  // Skip past all nodes within this suspense boundary.
  // There might be nested nodes so we need to keep track of how
  // deep we are and only break out when we're back on top.
  let depth = 0;
  while (node) {
    if (node.nodeType === COMMENT_NODE) {
      let data = node.data;
      if (data === SUSPENSE_END_DATA) {
        if (depth === 0) {
          return getNextHydratableSibling(node);
        } else {
          depth--;
        }
      } else if (
        data === SUSPENSE_START_DATA ||
        data === SUSPENSE_FALLBACK_START_DATA ||
        data === SUSPENSE_PENDING_START_DATA
      ) {
        depth++;
      }
    }
    node = node.nextSibling;
  }
  // TODO: Warn, we didn't find the end comment boundary.
  return null;
}

/**
 * - 如果此节点是SuspenseInstance的直接子节点，则返回SuspenseInstance  即 （如果其先前的兄弟是带有SUSPENSE_x_START_DATA的注释）
 * - 否则返回null
 */
export function getParentSuspenseInstance(targetInstance) {
  let node = targetInstance.previousSibling;

  /**
   * - 跳过suspense边界的所有节点。
   * - 可能会存在嵌套的节点，因此我们需要知道自己嵌套层级，只有在回到顶部时才会触发
   */
  let depth = 0;
  while (node) {
    if (node.nodeType === COMMENT_NODE) {
      let data = node.data;
      if (
        data === SUSPENSE_START_DATA ||
        data === SUSPENSE_FALLBACK_START_DATA ||
        data === SUSPENSE_PENDING_START_DATA
      ) {
        if (depth === 0) {
          return node;
        } else {
          depth--;
        }
      } else if (data === SUSPENSE_END_DATA) {
        depth++;
      }
    }
    node = node.previousSibling;
  }
  return null;
}

/**
 * 
 * @param {Element} container 
 */
export function commitHydratedContainer(container) {
  // 如果在此上阻止了任何事件重播，重试。
  retryIfBlockedOn(container);
}

/**
 * 
 * @param {Comment} suspenseInstance 
 */
export function commitHydratedSuspenseInstance(suspenseInstance) {
  retryIfBlockedOn(suspenseInstance);
}

export function mountResponderInstance(responder, responderInstance, responderProps, responderState, instance) {
  const doc = instance.ownerDocument;
  const {
    rootEventTypes,
    targetEventTypes,
  } = responder;
  if (targetEventTypes !== null) {
    listenToEventResponderEventTypes(targetEventTypes, doc);
  }
  if (rootEventTypes !== null) {
    addRootEventTypesForResponderInstance(responderInstance, rootEventTypes);
    listenToEventResponderEventTypes(rootEventTypes, doc);
  }

  mountEventResponder(responder, responderInstance, responderProps, responderState);
  return responderInstance;
}

export function unmountResponderInstance(responderInstance) {
  if (enableFlareAPI) {
    unmountEventResponder(responderInstance);
  }
}

export function updateFundamentalComponent(fundamentalInstance) {
  if (enableFundamentalAPI) {
    const {
      impl,
      instance,
      prevProps,
      props,
      state,
    } = fundamentalInstance;
    const onUpdate = impl.onUpdate;
    if (onUpdate !== undefined) {
      onUpdate(null, instance, prevProps, props, state);
    }
  }
}
export function unmountFundamentalComponent(fundamentalInstance) {
  if (enableFundamentalAPI) {
    const { impl, instance, props, state } = fundamentalInstance;
    const onUnmount = impl.onUnmount;
    if (onUnmount !== undefined) {
      onUnmount(null, instance, props, state);
    }
  }
}