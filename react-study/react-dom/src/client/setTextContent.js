import { TEXT_NODE } from '../shared/HTMLNodeType';

/**
 * 
 * @param {Element} node 
 * @param {string} text 
 */
export default function setTextContent(node, text) {
  if (text) {
    // 如果text存在，且node的第一个子节点是文本节点，使用nodeValue设置
    let firstChild = node.firstChild;

    if (
      firstChild &&
      firstChild === node.lastChild &&
      firstChild.nodeType === TEXT_NODE
    ) {
      firstChild.nodeValue = text;
      return;
    }
  }
  node.textContent = text;
}