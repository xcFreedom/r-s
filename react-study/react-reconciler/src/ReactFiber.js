import {
  NoContext,
  ConcurrentMode,
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
  this.firstContextDependency = null;

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
 * 创建Fiber
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
 * 创建主根fiber
 * @param {boolean} isConcurrent 
 */
export function createHostRootFiber(isConcurrent) {
  let mode = isConcurrent ? (ConcurrentMode | StrictMode) : NoContext;

  if (enableProfilerTimer && isDevToolsPresent) {
    mode |= ProfileMode;
  }
  return createFiber(HostRoot, null, null, mode);
}