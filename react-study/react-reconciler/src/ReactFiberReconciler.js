import { HostComponent } from '../../shared/ReactWorkTags';

import { getPublicInstance } from './ReactFiberHostConfig';
import {
  emptyContextObject,
} from './ReactFiberContext';
import { createFiberRoot } from './ReactFiberRoot';
import {
  unbatchedUpdates,
  requestCurrentTime,
  computeExpirationForFiber,
} from './ReactFiberScheduler';

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
 * 创建容器
 * @param {Container} containerInfo 原始container信息
 * @param {boolean} isConcurrent    是否异步
 * @param {boolean} hydrate         是否混合
 * @return OpaqueRoot
 */
export function createContainer(containerInfo, isConcurrent, hydrate) {
  return createFiberRoot(containerInfo, isConcurrent, hydrate);
}

/**
 * 在有效期内更新container
 * @param {ReactNodeList} element 
 * @param {OpaqueRoot} container 
 * @param {React$Component<any, any>} [parentComponent] 
 * @param {ExpirationTime} expirationTime 
 * @param {Function} [callback] 
 */
export function updateContainerAtExpirationTime(element, container, parentComponent, expirationTime, callback) {
  const current = container.current;
  if (__DEV__) {
    //...
  }
  const context = getContextForSubtree(parentComponent);
  if (container.context === null) {
    container.context = context;
  } else {
    container.pendingContext = context;
  }
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
  const current = container.current; // FiberNode
  const currentTime = requestCurrentTime(); // 获取当前时间
  const expirationTime = computeExpirationForFiber(currentTime, current); // 计算Fiber有效期
  return updateContainerAtExpirationTime(
    element,
    container,
    parentComponent,
    expirationTime,
    callback,
  );
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

export {
  unbatchedUpdates
};