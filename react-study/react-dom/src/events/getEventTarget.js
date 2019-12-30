import { TEXT_NODE } from '../shared/HTMLNodeType';
/**
 * - 获取从原生浏览器事件中获取target节点，因为浏览器DOM API存在兼容性问题
 */
function getEventTarget(nativeEvent) {
  let target = nativeEvent.target || nativeEvent.srcElement || window;

  // SVG ?
  if (target.correspondingUseElement) {
    target = target.correspondingUseElement;
  }

  // safari浏览器可能会在文本节点上触发事件
  return target.nodeType === TEXT_NODE ? target.parentNode : target;
}

export default getEventTarget;