import {
  updateChecked as ReactDOMInputUpdateChecked,
  updateWrapper as ReactDOMInputUpdateWrapper,
} from './ReactDOMInput';
import {
  updateWrapper as ReactDOMTextareaUpdateWrapper,
} from './ReactDOMTextarea';
import {
  postUpdateWrapper as ReactDOMSelectPostUpdateWrapper,
} from './ReactDOMSelect';
import isCustomComponent from '../shared/isCustomComponent';
import { setValueForStyles } from '../shared/CSSPropertyOperations';
import setInnerHTML from './setInnterHTML';
import setTextContent from './setTextContent';
import { setValueForProperty } from './DOMPropertyOperations';
import { enableFlareAPI } from 'react-study/shared/ReactFeatureFlags';
import { getListeningSetForElement } from '../events/ReactBrowserEventEmitter';
import endsWith from 'react-study/shared/endsWith';
import { trapEventForResponderEventSystem } from '../events/ReactDOMEventListener';

const DANGEROUSLY_SET_INNER_HTML = 'dangerouslySetInnerHTML';
const SUPPRESS_CONTENT_EDITABLE_WARNING = 'suppressContentEditableWarning';
const SUPPRESS_HYDRATION_WARNING = 'suppressHydrationWarning';
const AUTOFOCUS = 'autoFocus';
const CHILDREN = 'children';
const STYLE = 'style';
const HTML = '__html';
const LISTENERS = 'listeners';

function noop() {}

export function trapClickOnNonInteractiveElement(node) {
  // Mobile Safari无法在非交互元素上正确触发冒泡click事件，这意味着委派的click listener不会触发。
  // 解决此错误的方法是在目标节点上附加一个空的click listener。
  // 只需使用onclick属性设置它，这样我们就不必为它管理任何簿记。不确定在删除侦听器时是否需要清除它。
  node.onclick = noop;
}


/**
 * 更新dom属性
 * @param {Element} domElement 
 * @param {Array<any>} updatePayload 
 * @param {boolean} wasCustomComponentTag 
 * @param {boolean} isCustomComponentTag 
 */
function updateDOMProperties(domElement, updatePayload, wasCustomComponentTag, isCustomComponentTag) {
  for (let i = 0; i < updatePayload.length; i += 2) {
    const propKey = updatePayload[i];
    const propValue = updatePayload[i + 1];
    if (propKey === STYLE) {
      setValueForStyles(domElement, propValue);
    } else if (propKey === DANGEROUSLY_SET_INNER_HTML) {
      setInnerHTML(domElement, propValue);
    } else if (propKey === CHILDREN) {
      setTextContent(domElement, propValue);
    } else {
      setValueForProperty(domElement, propKey, propValue, isCustomComponentTag);
    }
  }
}

/**
 * 应用diff TODO:关联函数没写
 * @param {Element} domElement 
 * @param {Array<any>} updatePayload 
 * @param {string} tag 
 * @param {Props} lastRawProps 
 * @param {Props} nextRawProps 
 */
export function updateProperties(domElement, updatePayload, tag, lastRawProps, nextRawProps) {
  /**
   * 
      在name之前更新*checked*。

      在更新过程中，有可能进行多次检查。

      当选中的radio试图更改名称时，浏览器将使另一个radio的选中为false。
   */
  if (
    tag === 'input' &&
    nextRawProps.type === 'radio' &&
    nextRawProps.name != null
  ) {
    ReactDOMInputUpdateChecked(domElement, nextRawProps);
  }

  const wasCustomComponentTag = isCustomComponent(tag, lastRawProps);
  const isCustomComponentTag = isCustomComponent(tag, nextRawProps);

  updateDOMProperties(domElement, updatePayload, wasCustomComponentTag, isCustomComponentTag);

  switch (tag) {
    case 'input':
      // 更新props后更新*inputs*的包装器。这必须在“updateDOMProperties”之后发生。否则，HTML5输入验证将引发警告并阻止分配新值。
      ReactDOMInputUpdateWrapper(domElement, nextRawProps);
      break;
    case 'textarea':
      ReactDOMTextareaUpdateWrapper(domElement, nextRawProps);
      break;
    case 'select':
      ReactDOMSelectPostUpdateWrapper(domElement, nextRawProps);
      break;
  }
}

export function listenToEventResponderEventTypes(eventTypes, element) {
  if (enableFlareAPI) {
    const listeningSet = getListeningSetForElement(element);

    for (let i = 0, length = eventTypes.length; i < length; ++i) {
      const eventType = eventTypes[i];
      const isPassive = !endsWith(eventType, '_active');
      const eventKey = isPassive ? eventType + '_passive' : eventType;
      const targetEventType = isPassive ? eventType : eventType.substring(0, eventType.length - 7);
      if (!listeningSet.has(eventKey)) {
        trapEventForResponderEventSystem(element, targetEventType, isPassive);
        listeningSet.add(eventKey);
      }
    }
  }
}