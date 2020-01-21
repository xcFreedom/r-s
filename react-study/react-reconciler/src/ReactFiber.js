import {
  NoMode,
  ConcurrentMode,
  BatchedMode,
  StrictMode,
  ProfileMode,
} from './ReactTypeOfMode';
import {
  HostRoot, HostComponent
} from '../../shared/ReactWorkTags';
import { NoEffect } from '../../shared/ReactSideEffectTags';

import { NoWork } from './ReactFiberEx'

// import { enableProfilerTimer } from '../../shared/ReactFeatureFlags';
// import { isDevToolsPresent } from './ReactFiberDevToolsHook';
import { createFiberRoot } from './ReactFiberRoot';
import { enableProfilerTimer } from 'react-study/shared/ReactFeatureFlags';
import { ConcurrentRoot, BatchedRoot } from 'react-study/shared/ReactRootTags';
import { isDevToolsPersent } from './ReactFiberDevToolsHook';

/**
 * 
 * @param {WorkTag} tag 
 * @param {mixed} pendingProps 
 * @param {null | string} key 
 * @param {TypeOfMode} mode 
 */
function FiberNode(tag, pendingProps, key, mode) {
  // Instance
  this.tag         = tag; // 标记不同的组件类型
  this.key         = key;
  this.elementType = null; // 表示fiber的对应元素的类型，比如'div'，Class
  this.type        = null; // 表示fiber的真实类型，异步组件resolved之后返回的组件类型
  this.stateNode   = null; // fiber对应的实例

  // Fiber
  this.return  = null; // fiber的父级fiber
  this.child   = null; // fiber的第一个子child fiber
  this.sibling = null; // fiber的右兄弟节点
  this.index   = 0; // 如果由数组渲染出列表，index对应的就是fiber的位置，index与key一起才能做数组的diff

  this.ref = null;

  this.pendingProps = pendingProps; // 新的props
  this.memoizedProps = null; // 当前的props
  this.updateQueue = null; // fiber上的更新队列，该Fiber对应的组件产生的Update会存放在这个队列里面
  this.memoizedState = null; // 当前的state
  this.dependencies = null; // fiber的context、events

  this.mode = mode; // ./ReactTypeOfMode，默认继承父Fiber的mode

  // Effects(影响)
  this.effectTag = NoEffect; // 表示当前fiber要更新的方式 shared/ReactSideEffectTag.js
  this.nextEffect = null; // 指向下一个有更新的fiber

  this.firstEffect = null; // 子节点中所有有更新的节点中的第一个fiber
  this.lastEffect = null; // 子节点中所有有更新的节点中的最后一个fiber

  this.expirationTime = NoWork; // 过期时间(优先级)
  this.childExpirationTime = NoWork; // 当前节点的所有子节点的那个最大的优先级

  this.alternate = null; // 双缓冲

  if (enableProfilerTimer) {
    this.actualDuration = Number.NaN;
    this.actualStartTIme = Number.NaN;
    this.selfBaseDuration = Number.NaN;
    this.treeBaseDuration = Number.NaN;

    this.actualDuration = 0;
    this.actualStartTIme = -1;
    this.selfBaseDuration = 0;
    this.treeBaseDuration = 0;
  }
}

/**
 * 创建Fiber，FiberNode的工厂函数
 * @param {WorkTag} tag  标记
 * @param {mixed} pendingProps 等待props
 * @param {null | string} key  组件的key
 * @param {TypeOfMode} mode    Fiber的mode
 * @return Fiber
 */
const createFiber = function(tag, pendingProps, key, mode) {
  return new FiberNode(tag, pendingProps, key, mode);
}

/**
 * 被用于创建一个交替工作的Fiber
 * @param {Fiber} current 
 * @param {any} pendingProps 
 * @param {ExpirationTime} expirationTime 
 * @returns {Fiber}
 */
export function createWorkInProgress(current, pendingProps, expirationTime) {
  let workInProgress = current.alternate;
  if (workInProgress === null) {
    // 我们使用双缓冲池技术，因为我们知道我们最多只需要一个树的两个版本
    // 我们汇集了我们可以重用的“其他”未使用节点。
    // 这样做是为了避免给从不更新的内容分配额外的对象
    // 它还允许我们在需要的时候回收内存
    workInProgress = createFiber(current.tag, pendingProps, current.key, current.mode);
    workInProgress.elementType = current.elementType;
    workInProgress.type = current.type;
    workInProgress.stateNode = current.stateNode;

    workInProgress.alternate = current;
    current.alternate = workInProgress;
  } else {
    workInProgress.pendingProps = pendingProps;

    // 已经存在alternate，重置effectTag
    workInProgress.effectTag = NoEffect;

    // effect list不再有效了
    workInProgress.nextEffect = null;
    workInProgress.firstEffect = null;
    workInProgress.lastEffect = null;

  }

  workInProgress.childExpirationTime = current.childExpirationTime;
  workInProgress.expirationTime = current.expirationTimel

  workInProgress.child = current.child;
  workInProgress.memoizedProps = current.memoizedProps;
  workInProgress.memoizedState = current.memoizedState;
  workInProgress.updateQueue = current.updateQueue;
  
  // 克隆依赖项。这在render阶段发生过变化，因为无法与current fiber共享
  const currentDependencies = current.dependencies;
  workInProgress.dependencies = currentDependencies === null ? null : {
    expirationTime: currentDependencies.expirationTime,
    firstContext: currentDependencies.firstContext,
    responders: currentDependencies.responders,
  };
  

  // 这些属性将在parent reconcili的时候被覆盖
  workInProgress.sibling = current.sibling;
  workInProgress.index = current.index;
  workInProgress.ref = current.ref;

  if (enableProfilerTimer) {
    workInProgress.selfBaseDuration = current.selfBaseDuration;
    workInProgress.treeBaseDuration = current.treeBaseDuration;
  }

  return workInProgress;
}


/**
 * 创建主根fiber
 * @param {boolean} tag 
 */
export function createHostRootFiber(tag) {
  let mode;

  if (tag === ConcurrentRoot) {
    mode = ConcurrentMode | BatchedMode | StrictMode;
  } else if (tag === BatchedRoot) {
    mode = BatchedMode | StrictMode;
  } else {
    mode = NoMode;
  }

  if (enableProfilerTimer && isDevToolsPersent) {
    mode |= ProfileMode;
  }

  return createFiber(HostRoot, null, null, mode);
}

export function createFiberFromHostInstanceForDeletion() {
  const fiber = createFiber(HostComponent, null, null, NoMode);
  fiber.elementType = 'DELETED';
  fiber.type = 'DELETED';
  return fiber;
}