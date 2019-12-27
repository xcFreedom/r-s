import { HostComponent } from '../../shared/ReactWorkTags';

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

  return scheduleRootUpdate(current, element, expirationTime, callback);
}


/**
 * 调度Root更新
 * @param {Fiber} current 
 * @param {ReactNodeList} element 
 * @param {ExpirationTime} expirationTime 
 * @param {Function} [callback] 
 */
function scheduleRootUpdate(current, element, expirationTime, callback) {
  if (__DEV__) {
    // ...
  }
  const update = createUpdate(expirationTime);
  // React DevTools目前依赖此属性
  update.payload = { element };

  callback = callback === undefined ? null : callback;
  if (callback !== null) {
    update.callback = callback;
  }

  flushPassiveEffects();
  enqueueUpdate(current, update);
  scheduleWork(current, expirationTime);

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

export function getPublicRootInstance(container) {
  const containerFiber = container.current;
  if (!containerFiber.child) {
    return null;
  }
  switch (containerFiber.child.tag) {
    case HostComponent:
      return getPublicInstance(containerFiber.child.stateNode);
    default:
      return containerFiber.child.stateNode;
  }
}