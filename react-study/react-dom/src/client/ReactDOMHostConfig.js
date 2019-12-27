import { COMMENT_NODE } from '../shared/HTMLNodeType';

export {
  unstable_now as now,
  unstable_cancelCallback as cancelDeferredCallback,
} from '../../../scheduler';


const SUSPENSE_START_DATA = '$';
const SUSPENSE_END_DATA = '/$';
const SUSPENSE_PENDING_START_DATA = '$?';
const SUSPENSE_FALLBACK_START_DATA = '$!';


export const noTimeout = -1;

export function getPublicInstance(instance) {
  return instance;
}

export const cancelPassiveEffects = cancelDeferredCallback;


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