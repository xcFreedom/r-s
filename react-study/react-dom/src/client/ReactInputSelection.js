import getActiveElement from './getActiveElement';
import { getOffsets } from './ReactDOMSelection';

function isTextNode(node) {
  return node && node.nodeType === TEXT_NODE;
}

function containsNode(outerNode, innerNode) {
  if (!outerNode || !innerNode) {
    return false;
  } else if (outerNode === innerNode) {
    return true;
  } else if (isTextNode(outerNode)) {
    return false;
  } else if (isTextNode(innerNode)) {
    return containsNode(outerNode, innerNode.parentNode);
  } else if ('contains' in outerNode) {
    return outerNode.contains(innerNode);
  } else if (outerNode.compareDocumentPosition) {
    return !!(outerNode.compareDocumentPosition(innerNode) & 16);
  } else {
    return false;
  }
}

function isInDocument(node) {
  return (
    node &&
    node.ownerDocument &&
    containsNode(node.ownerDocument.documentElement, node)
  );
}

function isSameOriginFrame(iframe) {
  try {
    // 通过获取iframe内部信息来判断是否同源
    return typeof iframe.contentWindow.location.href === 'string';
  } catch (err) {
    return false;
  }
}
/**
 * - 循环获取焦点元素，iframe情况
 */
function getActiveElementDeep() {
  let win = window;
  let element = getActiveElement();
  while (element instanceof win.HTMLIFrameElement) {
    if (isSameOriginFrame(element)) {
      win = element.contentWindow;
    } else {
      return element;
    }
    element = getActiveElement(win.document);
  }
  return element;
}

/**
 * 检测元素是否具有选择能力
 * @param {Element} elem 
 */
export function hasSelectionCapabilities(elem) {
  const nodeName = elem && elem.nodeName && elem.nodeName.toLowerCase();
  return (
    nodeName &&
    ((nodeName === 'input' &&
      (elem.type === 'text' ||
        elem.type === 'search' ||
        elem.type === 'tel' ||
        elem.type === 'url' ||
        elem.type === 'password')) ||
      nodeName === 'textarea' ||
      elem.contentEditable === 'true')
  );
}

/**
 * - 获取当前选择区信息
 */
export function getSelectionInformation() {
  const focusedElem = getActiveElementDeep();
  return {
    focusedElem,
    selectionRange: hasSelectionCapabilities(focusedElem) ? getSelection(focusedElem) : null,
  }
}

/**
 * 如果任何选择信息可能丢失，请将其还原。这在执行可以删除dom节点并将其放回的操作时非常有用，这会导致焦点丢失。
 */
export function restoreSelection(priorSelectionInformation) {
  // 获取当前聚焦元素
  const curFocusedElem = getActiveElementDeep();
  const priorFocusedElem = priorSelectionInformation.focusedElem;
  const priorSelectionRange = priorSelectionInformation.selectionRange;
  // 如果当前聚集元素改变，原元素还在document中
  if (curFocusedElem !== priorFocusedElem && isInDocument(priorFocusedElem)) {
    // 如果原来元素还具有选择区能力
    if (priorSelectionRange !== null && hasSelectionCapabilities(priorFocusedElem)) {
      // 重新设置选择区
      setSelection(priorFocusedElem, priorSelectionRange);
    }

    // 找到元素所有父节点，重新聚焦原来元素，然后保持滚动位置不变
    // Focusing a node can change the scroll position, which is undesirable
    const ancestors = [];
    let ancestor = priorFocusedElem;
    while ((ancestor = ancestor.parentNode)) {
      if (ancestor.nodeType === ELEMENT_NODE) {
        ancestors.push({
          element: ancestor,
          left: ancestor.scrollLeft,
          top: ancestor.scrollTop,
        });
      }
    }

    if (typeof priorFocusedElem.focus === 'function') {
      priorFocusedElem.focus();
    }

    for (let i = 0; i < ancestors.length; i++) {
      const info = ancestors[i];
      info.element.scrollLeft = info.left;
      info.element.scrollTop = info.top;
    }
  }
}

/**
 * - 获取teatarea、input或可编辑内容节点的选择范围。
 * @param {Element} input 
 * @return {start: selectionStart, end: selectionEnd}
 */
export function getSelection(input) {
  let selection;

  if ('selectionStart' in input) {
    // 现代浏览器的input/textarea
    selection = {
      start: input.selectionStart,
      end: input.selectionEnd,
    };
  } else {
    // contentEditable="true"的节点，或者老的ie
    selection = getOffsets(input);
  }

  return selection || { start: 0, end: 0 };
}

/**
 * 设置元素的选择区
 * @param {Element} input 
 * @param {*} offsets 
 */
export function setSelection(input, offsets) {
  let { start, end } = offsets;
  if (end === undefined) {
    end = start;
  }

  if ('selectionStart' in input) {
    input.selectionStart = start;
    input.selectionEnd = Math.min(end, input.value.length);
  } else {
    setOffsets(input, offsets);
  }
}