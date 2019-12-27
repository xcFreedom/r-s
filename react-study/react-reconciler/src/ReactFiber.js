import {
  NoMode,
  ConcurrentMode,
  BatchedMode,
  StrictMode,
  ProfileMode,
} from './ReactTypeOfMode';
import {
  HostRoot
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
  this.tag         = tag;
  this.key         = key;
  this.elementType = null;
  this.type        = null;
  this.stateNode   = null;

  // Fiber
  this.return  = null;
  this.child   = null;
  this.sibling = null;
  this.index   = 0;

  this.ref = null;

  this.pendingProps = pendingProps;
  this.memoizedProps = null;
  this.updateQueue = null;
  this.memoizedState = null;
  this.contextDependencies = null;

  this.mode = mode;

  // Effects(影响)
  this.effectTag = NoEffect;
  this.nextEffect = null;

  this.firstEffect = null;
  this.lastEffect = null;

  this.expirationTime = NoWork;
  this.childExpirationTime = NoWork;

  this.alternate = null;

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
  } else {
    // TODO
  }

  workInProgress.childExpirationTime = current.childExpirationTime;
  workInProgress.expirationTime = current.expirationTimel

  workInProgress.child = current.child;
  workInProgress.memoizedProps = current.memoizedProps;
  workInProgress.memoizedState = current.memoizedState;
  workInProgress.updateQueue = current.updateQueue;
  workInProgress.contextDependencies = current.contextDependencies;

  // 这些将在父进程的reconciliation被充血
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