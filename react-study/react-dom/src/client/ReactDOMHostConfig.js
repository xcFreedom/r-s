import { COMMENT_NODE } from '../shared/HTMLNodeType';

export {
  unstable_now as now,
  unstable_cancelCallback as cancelDeferredCallback,
} from '../../../scheduler';
import {
  isEnabled as ReactBrowserEventEmitterIsEnabled,
  setEnabled as ReactBrowserEventEmitterSetEnabled,
} from '../events/ReactBrowserEventEmitter';
import { getSelectionInformation } from './ReactInputSelection';
import setTextContent from './setTextContent';
import { trapClickOnNonInteractiveElement, updateProperties, listenToEventResponderEventTypes } from './ReactDOMComponent';
import dangerousStyleValue from '../shared/dangerousStyleValue';
import { updateFiberProps } from './ReactDOMComponentTree';
import { addRootEventTypesForResponderInstance, mountEventResponder } from '../events/DOMEventResponderSystem';
import { enableFundamentalAPI } from 'react-study/shared/ReactFeatureFlags';


const SUSPENSE_START_DATA = '$';
const SUSPENSE_END_DATA = '/$';
const SUSPENSE_PENDING_START_DATA = '$?';
const SUSPENSE_FALLBACK_START_DATA = '$!';

const STYLE = 'style';

let eventsEnabled = null;
let selectionInformation = null;


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

// -------------------
//     Mutation
// -------------------

export const supportsMutation = true;

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