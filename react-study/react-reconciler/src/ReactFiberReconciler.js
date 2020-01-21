import { HostComponent, HostRoot } from '../../shared/ReactWorkTags';

import { getPublicInstance } from './ReactFiberHostConfig';
import {
  emptyContextObject,
} from './ReactFiberContext';
import { createFiberRoot } from './ReactFiberRoot';
import {
  unbatchedUpdates,
  requestCurrentTime,
  scheduleWork,
  computeExpirationForFiber,
  flushPassiveEffects,
} from './ReactFiberScheduler';
import { createUpdate, enqueueUpdate } from './ReactUpdateQueue';
import { flushRoot } from './ReactFiberWorkLoop';

/**
 * 
 * @param {React$Component} [parentComponent] 
 * @returns {Object}
 */
function getContextForSubtree(parentComponent) {
  if (!parentComponent) {
    return emptyContextObject;
  }
}

/**
 * 创建容器，createContainer只是createFiberRoot的包装函数
 * @param {Container} containerInfo 原始container信息
 * @param {boolean} tag    是否异步
 * @param {boolean} hydrate         是否混合
 * @return OpaqueRoot
 */
export function createContainer(containerInfo, tag, hydrate, hydrationCallbacks) {
  return createFiberRoot(containerInfo, tag, hydrate, hydrationCallbacks);
}


/**
 * 
 * @param {ReactNodeList} element 
 * @param {OpaqueRoot} container 
 * @param {React$Component<any, any>} [parentComponent] 
 * @param {Function} [callback] 
 * @returns ExpirationTime
 */
export function updateContainer(element, container, parentComponent, callback) {
  //初次渲染时                    <App />, FiberRoot,
  const current = container.current; // 从FiberRoot获取HostRootFiber
  const currentTime = requestCurrentTime(); // 获取当前时间
}

/**
 * 
 */
export function getPublicRootInstance(container) {
  const containerFiber = container.current;
  if (!containerFiber.child) {
    return null;
  }
  switch(containerFiber.child.tag) {
    case HostComponent:
      return getPublicInstance(containerFiber.child.stateNode);
    default:
      return containerFiber.child.stateNode;
  }
}

export function attemptSynchronousHydration(fiber) {
  switch (fiber.tag) {
    case HostRoot:
      let root = fiber.stateNode;
      if (root.hydrate) {
        flushRoot(root, root.firstPendingTime);
      }
      break;
  }
}

export function attemptUserBlockingHydration() {

}

export function attemptContinuousHydration() {

}

export function attemptHydrationAtCurrentPriority() {

}

export {
  unbatchedUpdates
};