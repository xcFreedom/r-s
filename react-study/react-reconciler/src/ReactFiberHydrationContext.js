import {
  supportsHydration,
  supportsMutation,
  shouldSetTextContent,
  getNextHydratableSibling,
  getNextHydratableInstanceAfterSuspenseInstance,
} from './ReactFiberHostConfig';
import { HostComponent, HostRoot, SuspenseComponent } from 'react-study/shared/ReactWorkTags';
import { createFiberFromHostInstanceForDeletion } from './ReactFiber';
import { Deletion } from 'react-study/shared/ReactSideEffectTags';


// 在hydration context上堆栈中最深的fiber
// 这可能是插入或hydration
let hydrationParentFiber = null;
let nextHydratableInstance = null;
let isHydrating = false;

/**
 * 删除hydration节点
 * @param {Fiber} returnFiber 
 * @param {Element} instance 
 */
function deleteHydratableInstance(returnFiber, instance) {
  const childToDelete = createFiberFromHostInstanceForDeletion();
  childToDelete.stateNode = instance;
  childToDelete.return = returnFiber;
  childToDelete.effectTag = Deletion;

  // 这可能看起来像是它进行的第一次删除。
  // 但是，这些children不属于reconciliation列表的一部分。
  // 即使我们中止并重新恢复children，也会再次尝试hydrate，节点仍在host tree中，因此这些节点将被重新创建。
  if (returnFiber.lastEffect !== null) {
    returnFiber.lastEffect.nextEffect = childToDelete;
    returnFiber.lastEffect = childToDelete;
  } else {
    returnFiber.firstEffect = returnFiber.lastEffect = childToDelete;
  }
}

/**
 * 为host实例hydration作准备
 * @param {Fiber} fiber 
 * @param {Element} rootContainerInstance 
 * @param {HostContext} hostContext 
 */
export function prepareToHydrateHostInstance(fiber, rootContainerInstance, hostContext) {
  // TODO: 暂时放弃hydrate相关的内容
}

export function prepareToHydrateHostTextInstance(fiber) {
  // TODO: 暂时放弃hydrate相关的内容
}

function skipPastDehydratedSuspenseInstance(fiber) {
  let suspenseState = fiber.memoizedState;
  let suspenseInstance = suspenseState !== null ? suspenseState.dehydrated : null;
  return getNextHydratableInstanceAfterSuspenseInstance(suspenseInstance);
}


/**
 * 退出，并前往下一个Host节点进行hydration
 * @param {Fiber} fiber 
 */
function popToNextHostParent(fiber) {
  let parent = fiber.return;
  while (
    parent !== null &&
    parent.tag !== HostComponent &&
    parent.tag !== HostRoot &&
    parent.tag !== SuspenseComponent
  ) {
    parent = parent.return;
  }
  hydrationParentFiber = parent;
}

/**
 * 
 * @param {Fiber} fiber 
 * @returns {boolean}
 */
export function popHydrationState(fiber) {
  if (!supportsHydration) {
    return false;
  }

  if (fiber !== hydrationParentFiber) {
    // 在这个插入树中，我们比当前hydration context更下层，
    return false;
  }

  if (!isHydrating) {
    // 如果我们现在没有hydrating，但是我们在一个hydration上下文中。
    // 那么我们是一个要插入的状态，现在需要我们在hydration的兄弟，然后继续进行;
    popToNextHostParent(fiber);
    isHydrating = true;
    return false;
  }

  const type = fiber.type;

  // 如果我们有任何剩余的hydratable节点，我们现在需要删除他们。
  // 我们会比head和body更加深入，因为他们往往有其他的未知节点。
  // 我们还会忽略纯文本内容的组件
  if (
    fiber.tag !== HostComponent ||
    (
      type !== 'head' &&
      type !== 'body' &&
      !shouldSetTextContent(type, fiber.memoizedProps)
    )
  ) {
    let nextInstance = nextHydratableInstance;
    while (nextInstance) {
      // 创建一个待删除的fiber，挂载到fiber上
      deleteHydratableInstance(fiber, nextInstance);
      // 找到元素的所有element、text节点
      nextInstance = getNextHydratableSibling(nextInstance);
    }
  }

  popToNextHostParent(fiber);
  if (fiber.tag === SuspenseComponent) {
    nextHydratableInstance = skipPastDehydratedSuspenseInstance(fiber);
  } else {
    nextHydratableInstance = hydrationParentFiber ? getNextHydratableSibling(fiber.stateNode) : null;
  }
  return true;
}

/**
 * 重置hydrate状态
 */
export function resetHydrationState() {
  if (!supportsHydration) {
    return;
  }

  hydrationParentFiber = null;
  nextHydratableInstance = null;
  isHydrating = false;
}