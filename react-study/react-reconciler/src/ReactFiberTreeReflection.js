import { Placement, Hydrating, NoEffect } from '../../shared/ReactSideEffectTags';
import { HostRoot, SuspenseComponent } from '../../shared/ReactWorkTags';

export function getNearestMountedFiber(fiber) {
  let node = fiber;
  let nearestMounted = fiber;
  if (!fiber.alternate) {
    /**
     * 如果没有alternate，可能是一个没有插入的新树。
     * 如果是这样的话，则这个fiber将会对它产生等待插入的效果
     */
    let nextNode = node;
    do {
      node = nextNode;
      if ((node.effectTag & (Placment | Hydrating)) !== NoEffect) {
        /**
         * 这是一个正在插入/工作中的hydration，那么离他最近的可能已经是mounted的fiber是它的父fiber。
         * 我们需要继续确定父fiber是否已经mounted
         */
        nearestMounted = node.return;
      }
      nextNode = node.return;
    } while (nextNode);
  } else {
    while (node.return) {
      node = node.return;
    }
  }
  if (node.tag === HostRoot) {
    // TODO: Check if this was a nested HostRoot when used with
    // renderContainerIntoSubtree.
    return nearestMounted;
  }
  /**
   * - 如果我们没有找到root、意味着我们在一个已经卸载的树中遍历。
   */
  return null;
}

export function getSuspenseInstanceFromFiber(fiber) {
  if (fiber.tag === SuspenseComponent) {
    let suspenseState = fiber.memoizedState;
    if (suspenseState === null) {
      const current = fiber.alternate;
      if (current !== null) {
        suspenseState = current.memoizedState;
      }
    }
    if (suspenseState !== null) {
      // TODO: 未找到dehydrated在哪
      return suspenseState.dehydrated;
    }
  }
  return null;
}

export function getContainerFromFiber(fiber) {
  return fiber.tag === HostRoot ? (fiber.stateNode.containerInfo) : null
}