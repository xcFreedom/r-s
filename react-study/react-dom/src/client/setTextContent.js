import { TEXT_NODE } from '../shared/HTMLNodeType';

/**
 * 
 * @param {Element} node 
 * @param {string} text 
 */
export default function setTextContent(node, text) {
  if (text) {
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