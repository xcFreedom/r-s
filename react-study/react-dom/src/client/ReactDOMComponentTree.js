import { HostComponent, HostText, SuspenseComponent, HostRoot } from "../../../shared/ReactWorkTags";
import {
  getParentSuspenseInstance,
} from './ReactDOMHostConfig';

const randomKey = Math.random().toString(36).slice(2);

const internalInstanceKey = '__reactInternalInstance$' + randomKey;
const internalEventHandlersKey = '__reactEventHandlers$' + randomKey;
const internalContainerInstanceKey = '__reactContainere$' + randomKey;

export function markContainerAsRoot(hostRoot, node) {
  node[internalContainerInstanceKey] = hostRoot;
}

/**
 * - 给定一个DOM节点，返回最近的HostComponent或HostText fiber祖先。
 * - 如果目标节点是hydrate部分或者是还未渲染的子树的一部分，这也可能返回一个SuspenseComponent或HostRoot来表示
 * - 从概念上来说，HostRoot fiber是Container节点的子节点。
 * - 因此，如果将Container节点作为targetNode传递，实际上就不会得到HostRoot。
 * - 要找到HostRoot，需要Container节点的一个后代节点
 * - 同样的道理也适用与Suspense
 * 
 */
export function getClosestInstanceFromNode(targetNode) {
  let targetInst = targetNode[internalInstanceKey];
  if (targetInst) {
    // 这里不返回HostRoot或SuspenseComponent
    return targetInst;
  }

  // 如果是直接event target而不是React持有的dom节点，我们将会查看它的祖先节点是否存在React持有的dom节点
  let parentNode = targetNode.parentNode;
  while (parentNode) {
    /**
     * - 我们将检查这是否是一个包含React Nodes的Container Root。
     * - 我们首先要检查这一点，因为如果我们是脱水容器的child，我们不要先找到它的内部container，然后再继续查看parent instance。
     * - 我们不会直接在targetNode上检查此字段，因为fiber在概念上位于Container节点与它的第一个子节点之间。
     * - fiber不在容器节点周围
     * - 如果不是Container，我们将检查它是否为instance
     */
    targetInst = parentNode[internalContainerInstanceKey] || parentNode[internalInstanceKey];
    if (targetInst) {
      /**
       * 因为这不是事件的直接目标，所以我们可能已经跨过脱水的DOM节点到达这里。不过，它们也可能是非反应节点。我们需要回答哪一个。
       */

      // If we the instance doesn't have any children, then there can't be
      // a nested suspense boundary within it. So we can use this as a fast
      // bailout. Most of the time, when people add non-React children to
      // the tree, it is using a ref to a child-less DOM node.
      // Normally we'd only need to check one of the fibers because if it
      // has ever gone from having children to deleting them or vice versa
      // it would have deleted the dehydrated boundary nested inside already.
      // However, since the HostRoot starts out with an alternate it might
      // have one on the alternate so we need to check in case this was a
      // root.
      const alternate = targetInst.alternate;
      if (
        targetInst.child !== null ||
        (alternate !== null && alternate.child !== null)
      ) {
        // 接下来要知道跳过的节点是否是Suspense，如果是，要知道是哪一个
        let suspenseInstance = getParentSuspenseInstance(targetNode);
        while (suspenseInstance !== null) {
          /**
           * - 如果我们找到了Suspense Instance，这意味着我们还没开始hydrated。
           * - 即使我们在hydrating后降注释留在DOM中，并且DOM中已经可以被hydrated了，我们在不会在这个过程中找到它们。
           * - 因为如果target已经被hydrated。它就会有internalInstanceKey。
           * - 让我们将与SuspenseComponent关联的fiber作为最深处的实例
           */
          let targetSuspenseInst = suspenseInstance[internalInstanceKey];
          if (targetSuspenseInst) {
            return targetSuspenseInst;
          }

          /**
           * - 如果我们没有从注释中找到fiber，这也许是因为我们还没有开始hydrate
           * - 可能还有一个父边界不在这个边界上，所以我们需要找到最外层的已知边界
           */
          suspenseInstance = getParentSuspenseInstance(suspenseInstance);
          /**
           * - 如果我们没有找到一个，那意味着parent Host Component也没有被注水，我们return
           */
        }
      }
      return targetInst;
    }
    targetNode = parentNode;
    parentNode = targetNode.parentNode;
  }
  return null;
}

export function getInstanceFromNode(node) {
  const inst = node[internalInstanceKey] || node[internalContainerInstanceKey];
  if (inst) {
    if (
      inst.tag === HostComponent ||
      inst.tag === HostText ||
      inst.tag === SuspenseComponent ||
      inst.tag === HostRoot
    ) {
      return inst;
    } else {
      return null;
    }
  }
  return null;
}

export function getFiberCurrentPropsFromNode(node) {
  return node[internalEventHandlersKey] || null;
}
export function updateFiberProps(node, props) {
  node[internalEventHandlersKey] = props;
}