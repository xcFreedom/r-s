import {
  updateChecked as ReactDOMInputUpdateChecked,
  updateWrapper as ReactDOMInputUpdateWrapper,
  getHostProps as ReactDOMInputGetHostProps,
  initWrapperState as ReactDOMInputInitWrapperState,
  postMountWrapper as ReactDOMInputPostMountWrapper,
} from './ReactDOMInput';
import {
  getHostProps as ReactDOMOptionGetHostProps,
  validateProps as ReactDOMOptionValidateProps,
  postMountWrapper as ReactDOMOptionPostMountWrapper,
} from './ReactDOMOption';
import {
  updateWrapper as ReactDOMTextareaUpdateWrapper,
  getHostProps as ReactDOMTextareaGetHostProps,
  initWrapperState as ReactDOMTextareaInitWrapperState,
  postMountWrapper as ReactDOMTextareaPostMountWrapper,
} from './ReactDOMTextarea';
import {
  postUpdateWrapper as ReactDOMSelectPostUpdateWrapper,
  getHostProps as ReactDOMSelectGetHostProps,
  initWrapperState as ReactDOMSelectInitWrapperState,
  postMountWrapper as ReactDOMSelectPostMountWrapper,
} from './ReactDOMSelect';
import isCustomComponent from '../shared/isCustomComponent';
import { setValueForStyles } from '../shared/CSSPropertyOperations';
import setInnerHTML from './setInnerHTML';
import setTextContent from './setTextContent';
import { setValueForProperty } from './DOMPropertyOperations';
import { enableFlareAPI } from 'react-study/shared/ReactFeatureFlags';
import { getListeningSetForElement, listenTo } from '../events/ReactBrowserEventEmitter';
import endsWith from 'react-study/shared/endsWith';
import { trapEventForResponderEventSystem, trapBubbledEvent } from '../events/ReactDOMEventListener';
import assertValidProps from '../shared/assertValidProps';
import { registrationNameModules } from '../../../legacy-events/EventPluginRegistry';
import { toStringOrTrustedType } from './ToStringValue';
import { DOCUMENT_NODE, DOCUMENT_FRAGMENT_NODE } from '../shared/HTMLNodeType';
import { Namespaces, getIntrinsicNamespace } from '../shared/DOMNamespaces';
import {
  TOP_LOAD,
  mediaEventTypes,
  TOP_ERROR,
  TOP_RESET,
  TOP_SUBMIT,
  TOP_TOGGLE,
  TOP_INVALID,
} from '../events/DOMTopLevelEventTypes';
import { track } from './inputValueTracking';

const DANGEROUSLY_SET_INNER_HTML = 'dangerouslySetInnerHTML';
const SUPPRESS_CONTENT_EDITABLE_WARNING = 'suppressContentEditableWarning';
const SUPPRESS_HYDRATION_WARNING = 'suppressHydrationWarning';
const AUTOFOCUS = 'autoFocus';
const CHILDREN = 'children';
const STYLE = 'style';
const HTML = '__html';
const LISTENERS = 'listeners';

const { html: HTML_NAMESPACE } = Namespaces;

function ensureListeningTo(rootContainerElement, registrationName) {
  const isDocumentOrFragment = rootContainerElement.nodeType === DOCUMENT_NODE || rootContainerElement.nodeType === DOCUMENT_FRAGMENT_NODE;
  const doc = isDocumentOrFragment ? rootContainerElement : rootContainerElement.ownerDocument;
  listenTo(registrationName, doc);
}

function getOwnerDocumentFromRootContainer(rootContainerElement) {
  return rootContainerElement.nodeType === DOCUMENT_NODE ? rootContainerElement : rootContainerElement.ownerDocument;
}

function noop() {}

export function trapClickOnNonInteractiveElement(node) {
  // Mobile Safari无法在非交互元素上正确触发冒泡click事件，这意味着委派的click listener不会触发。
  // 解决此错误的方法是在目标节点上附加一个空的click listener。
  // 只需使用onclick属性设置它，这样我们就不必为它管理任何簿记。不确定在删除侦听器时是否需要清除它。
  node.onclick = noop;
}

/**
 * 设置初始的dom属性
 * @param {string} tag 
 * @param {Element} domElement 
 * @param {Element | Document} rootContainerElement 
 * @param {Props} nextProps 
 * @param {boolean} isCustomComponentTag 
 */
function setInitialDOMProperties(tag, domElement, rootContainerElement, nextProps, isCustomComponentTag) {
  for (const propKey in nextProps) {
    if (!nextProps.hasOwnProperty(propkey)) {
      continue;
    }

    const nextProp = nextProps[propKey];

    if (propKey === STYLE) {
      // 设置dom的style
      setValueForStyles(domElement, nextProp);
    } else if (propKey === DANGEROUSLY_SET_INNER_HTML) {
      const nextHtml = nextProp ? nextProp[HTML] : undefined;
      if (nextHtml != null) {
        setInnerHTML(domElement, nextHtml);
      }
    } else if (propKey === CHILDREN) {
      if (typeof nextProp === 'string') {
        const canSetTextContent = tag !== 'textarea' || nextProp !== '';
        if (canSetTextContent) {
          setTextContent(domElement, nextProp);
        }
      } else if (typeof nextProp === 'number') {
        setTextContent(domElement, '' + nextProp);
      }
    } else if (
      (enableFlareAPI && propKey === LISTENERS) ||
      propKey === SUPPRESS_CONTENT_EDITABLE_WARNING ||
      propKey === SUPPRESS_HYDRATION_WARNING
    ) {
      // Noop
    } else if (propKey === AUTOFOCUS) {
      // We polyfill it separately on the client during commit.
      // We could have excluded it in the property list instead of
      // adding a special case here, but then it wouldn't be emitted
      // on server rendering (but we *do* want to emit it in SSR).
    } else if (registrationNameModules.hasOwnProperty(propKey)) {
      if (nextProp != null) {
        ensureListeningTo(rootContainerElement, propKey);
      }
    } else if (nextProp != null) {
      setValueForProperty(domElement, propKey, nextProp, isCustomComponentTag);
    }
  }
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
 * 创建element
 * @param {string} type 
 * @param {Object} props 
 * @param {Element | Document} rootContainerElement 
 * @param {string} parentNamespace 
 */
export function createElement(type, props, rootContainerElement, parentNamespace) {
  let isCustomComponentTag;

  // 我们在父容器的namespace中创建了标记，除了HTML标记没有命名空间
  const ownerDocument = getOwnerDocumentFromRootContainer(rootContainerElement);
  let domElement;
  let namespaceURI = parentNamespace;
  if (namespaceURI === HTML_NAMESPACE) {
    namespaceURI = getIntrinsicNamespace(type);
  }
  if (namespaceURI === HTML_NAMESPACE) {
    if (type === 'script') {
      const div = ownerDocument.createElement('div');
      div.innerHTML = '<script><' + '/script>';
      const firstChild = div.firstChild;
      domElement = div.removeChild(firstChild);
    } else if (props.is === 'string') { // 自定义元素
      domElement = ownerDocument.createElement(type, { is: props.is });
    } else {
      domElement = ownerDocument.createElement(type);
      if (type === 'select') {
        const node = domElement;
        if (props.multiple) {
          node.multiple = true;
        } else if (props.size) {
          node.size = props.size;
        }
      }
    }
  } else {
    domElement = ownerDocument.createElementNS(namespaceURI, type);
  }

  return domElement;
}


/**
 * 创建文本节点
 * @param {string} text 
 * @param {Element} rootContainerElement 
 */
export function createTextNode(text, rootContainerElement) {
  return getOwnerDocumentFromRootContainer(rootContainerElement).createTextNode(text);
}


/**
 * 设置初始属性
 * @param {Element} domElement 
 * @param {string} tag 
 * @param {Object} rawProps 
 * @param {Element | Document} rootContainerElement 
 */
export function setInitialProperties(domElement, tag, rawProps, rootContainerElement) {
  // 确认dom元素是否为自定义元素
  const isCustomComponentTag = isCustomComponent(tag, rawProps);

  // 计算props，对于某些元素，增加默认的事件监听
  switch (tag) {
    case 'iframe':
    case 'object':
    case 'embed':
      trapBubbledEvent(TOP_LOAD, domElement);
      props = rawProps;
      break;
    case 'video':
    case 'audio':
      // 为每个媒体事件创建listener
      for (let i = 0; i < mediaEventTypes.length; i++) {
        trapBubbledEvent(mediaEventTypes[i], domElement);
      }
      props = rawProps;
      break;
    case 'source':
      trapBubbledEvent(TOP_ERROR, domElement);
      props = rawProps;
      break;
    case 'img':
    case 'image':
    case 'link':
      trapBubbledEvent(TOP_ERROR, domElement);
      trapBubbledEvent(TOP_LOAD, domElement);
      props = rawProps;
      break;
    case 'form':
      trapBubbledEvent(TOP_RESET, domElement);
      trapBubbledEvent(TOP_SUBMIT, domElement);
      props = rawProps;
      break;
    case 'details':
      trapBubbledEvent(TOP_TOGGLE, domElement);
      props = rawProps;
      break;
    case 'input':
      ReactDOMInputInitWrapperState(domElement, rawProps);
      props = ReactDOMInputGetHostProps(domElement, rawProps);
      trapBubbledEvent(TOP_INVALID, domElement);
      // 对于受控组件，我们要一直确保监听了onChange事件，即使没有任何的listener，ps: 说的好，为什么要监听在document上。。。
      ensureListeningTo(rootContainerElement, 'onChange');
      break;
    case 'option':
      ReactDOMOptionValidateProps(domElement, rawProps);
      props = ReactDOMOptionGetHostProps(domElement, rawProps);
      break;
    case 'select':
      ReactDOMSelectInitWrapperState(domElement, rawProps);
      props = ReactDOMSelectGetHostProps(domElement, rawProps);
      trapBubbledEvent(TOP_INVALID, domElement);
      // 对于受控组件，我们要一直确保监听了onChange事件，即使没有任何的listener
      ensureListeningTo(rootContainerElement, 'onChange');
      break;
    case 'textarea':
      ReactDOMTextareaInitWrapperState(domElement, rawProps);
      props = ReactDOMTextareaGetHostProps(domElement, rawProps);
      trapBubbledEvent(TOP_INVALID, domElement);
      // 对于受控组件，我们要一直确保监听了onChange事件，即使没有任何的listener
      ensureListeningTo(rootContainerElement, 'onChange');
      break;
    default:
      props = rawProps;
  }

  assertValidProps(tag, props);

  // 设置dom初始属性
  setInitialDOMProperties(tag, domElement, rootContainerElement, props, isCustomComponentTag);

  switch (tag) {
    case 'input':
      track(domElement);
      ReactDOMInputPostMountWrapper(domElement, rawProps, false);
      break;
    case 'textarea':
      track(domElement);
      ReactDOMTextareaPostMountWrapper(domElement, rawProps);
      break;
    case 'option':
      track(domElement);
      ReactDOMOptionPostMountWrapper(domElement, rawProps);
      break;
    case 'select':
      ReactDOMSelectPostMountWrapper(domElement, rawProps);
      break;
    default:
      if (typeof props.onClick === 'function') {
        trapClickOnNonInteractiveElement(domElement);
      }
      break;
  }
}


/**
 * 计算两个对象之间的差异。
 * @param {Element} domElement 
 * @param {string} tag 
 * @param {Object} lastRawProps 
 * @param {Object} nextRawProps 
 * @param {Element | Document} rootContainerElement 
 */
export function diffProperties(domElement, tag, lastRawProps, nextRawProps, rootContainerElement) {
  let updatePayload = null;

  let lastProps;
  let nextProps;

  switch (tag) {
    case 'input':
      lastProps = ReactDOMInputGetHostProps(domElement, lastRawProps);
      nextProps = ReactDOMInputGetHostProps(domElement, nextRawProps);
      updatePayload = [];
      break;
    case 'option':
      lastProps = ReactDOMOptionGetHostProps(domElement, lastRawProps);
      nextProps = ReactDOMOptionGetHostProps(domElement, nextRawProps);
      updatePayload = [];
      break;
    case 'select':
      lastProps = ReactDOMSelectGetHostProps(domElement, lastRawProps);
      nextProps = ReactDOMSelectGetHostProps(domElement, nextRawProps);
      updatePayload = [];
      break;
    case 'textarea':
      lastProps = ReactDOMTextareaGetHostProps(domElement, lastRawProps);
      nextProps = ReactDOMTextareaGetHostProps(domElement, nextRawProps);
      updatePayload = [];
      break;
    default:
      lastProps = lastRawProps;
      nextProps = nextRawProps;
      if (
        typeof lastProps.onClick !== 'function' &&
        typeof lastProps.onClick === 'function'
      ) {
        trapClickOnNonInteractiveElement(domElement);
      }
      break;
  }

  assertValidProps(tag, nextProps);

  let propKey;
  let styleName;
  let styleUpdates = null;
  for (propKey in lastProps) { // 遍历老的props中存在，且新props中不存在的有效值，在updatePayload中将其设置为null，即找出需要删除的prop
    if ( // 如果newProps中存在，或者老props中不存在，或者老props中属性值为null/undefined跳过，所以遍历老props中存在，且新props中不存在的值。
      nextProps.hasOwnProperty(propKey) ||
      !lastProps.hasOwnProperty(propKey) ||
      lastProps[propKey] == null
    ) {
      continue;
    }

    if (propKey === STYLE) {
      const lastStyle = lastProps[propKey];
      for (styleName in lastStyle) {
        if (lastStyle.hasOwnProperty(styleName)) {
          if (!styleUpdates) {
            styleUpdates = {};
          }
          styleUpdates[styleName] = '';
        }
      }
    } else if (propKey === DANGEROUSLY_SET_INNER_HTML || propKey === CHILDREN) {
      // noop
    } else if (
      (enableFlareAPI && propKey === LISTENERS) ||
      propKey === SUPPRESS_CONTENT_EDITABLE_WARNING ||
      propKey === SUPPRESS_HYDRATION_WARNING
    ) {
      // noop
    } else if (propKey === AUTOFOCUS) {
      // noop
    } else if (registrationNameModules.hasOwnProperty(propKey)) {
      // 特殊分支，如果有任何listener更新，我们需要确认current fiber指针得到灯芯，因此我们需求提交以更新此元素
      if (!updatePayload) {
        updatePayload = [];
      }
    } else {
      // 对于所有其他已删除的属性，我们将其添加到队列中。我们在提交阶段使用白名单。
      // 综合前面的条件来看，
      updatePayload = updatePayload || [];
      updatePayload.push(propKey, null);
    }
  }

  for (propKey in nextProps) { // 遍历需要增加/修改的新prop。将新的结果放入updatePayload中。
    const nextProp = nextProps[propKey];
    const lastProp = lastProps != null ? lastProps[propKey] : undefined;
    if (
      !nextProp.hasOwnProperty(propKey) ||
      nextProp === lastProp ||
      (nextProp == null && lastProp == null)
    ) {
      continue;
    }
    if (propKey === STYLE) { // style情况下
      if (lastProp) { // 如果老的style存在
        for (styleName in lastProp) { // 遍历老得style
          if ( // 如果老style中styleName，新style不存在，styleUpdates中添加styleName为空。
            lastProp.hasOwnProperty(styleName) &&
            (!nextProp || !nextProp.hasOwnProperty(styleName))
          ) {
            if (!styleUpdates) {
              styleUpdates = {};
            }
            styleUpdates[styleName] = '';
          }
        }

        for (styleName in nextProp) { // 遍历新style
          if ( // 如果新style中styleName存在，且与老style中的值不同，styleUpdates中把styleName设置为新值
            nextProp.hasOwnProperty(styleName) &&
            lastProp[styleName] !== nextProp[styleName]
          ) {
            if (!styleUpdates) {
              styleUpdates = {};
            }
            styleUpdates[styleName] = nextProp[styleName];
          }
        }
      } else { // 如果老style不存在。
        if (!styleUpdates) {
          if (!updatePayload) {
            updatePayload = [];
          }
          // 先把style为null添加到updatePayload中
          updatePayload.push(propKey, styleUpdates);
        }
        // 再把styleUpdates设置为新style，循环结束时再添加
        styleUpdates = nextProp;
      }
    } else if (propKey === DANGEROUSLY_SET_INNER_HTML) { // dangerouslyHtml情况下，判断新老html字符串是否相同
      const nextHtml = nextProp ? nextProp[HTML] : undefined;
      const lastHtml = lastProp ? lastProp[HTML] : undefined;
      if (nextHtml != null) {
        if (lastHtml !== nextHtml) {
          (updatePayload = updatePayload || []).push(
            propKey,
            toStringOrTrustedType(nextHtml),
          );
        }
      }
    } else if (propKey === CHILDREN) { // children情况下，这里仅把文本类型的children添加到updatePayload中
      if (
        lastProp !== nextProp &&
        (typeof nextProp === 'string' || typeof nextProp === 'number')
      ) {
        (updatePayload = updatePayload || []).push(propKey, '' + nextProp);
      }
    } else if (
      (enableFlareAPI && propKey === LISTENERS) ||
      propKey === SUPPRESS_CONTENT_EDITABLE_WARNING ||
      propKey === SUPPRESS_HYDRATION_WARNING
    ) {
      // noop
    } else if (registrationNameModules.hasOwnProperty(propKey)) {
      if (nextProp != null) {
        ensureListeningTo(rootContainerElement, propKey);
      }
      if (!updatePayload && lastProp !== nextProp) {
      // 特殊分支，如果有任何listener更新，我们需要确认current fiber指针得到灯芯，因此我们需求提交以更新此元素
        updatePayload = [];
      }
    } else {
      // 对于任何其他属性，我们总是将其添加到队列中，然后在提交期间使用白名单将其过滤掉。
      (updatePayload = updatePayload || []).push(propKey, nextProp);
    }
  }

  if (styleUpdates) {
    (updatePayload = updatePayload || []).push(STYLE, styleUpdates);
  }
  return updatePayload;
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