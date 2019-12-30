import { noTimeout } from './ReactFiberHostConfig';
import { createHostRootFiber } from './ReactFiber';
import {
  enableSchedulerTracing,
  enableSuspenseCallback,
} from '../../shared/ReactFeatureFlags';
import { NoWork } from './ReactFiberExpirationTime';
import { unstable_getThreadID } from '../../scheduler/tracing';
import { NoPriority } from './SchedulerWithReactIntegration'


function FiberRootNode(containerInfo, tag, hydrate) {
  this.tag = tag;
  this.current = null;
  this.containerInfo = containerInfo;
  this.pendingChildren = null;
  this.pingCache = null;
  this.finishedExpirationTime = NoWork;
  this.finishedWork = null;
  this.timeoutHandle = noTimeout;
  this.context = nul;
  this.pendingContext = null;
  this.hydrate = hydrate;
  this.callbackNode = null;
  this.callbackPriority = NoPriority;
  this.firstPendingTime = NoWork;
  this.firstSuspendedTime = NoWork;
  
  this.lastSuspendedTime = NoWork;
  this.nextKnownPendingLevel = NoWork;
  this.lastPingedTime = NoWork;
  this.lastExpiredTime = NoWork;

  if (enableSchedulerTracing) {
    this.interactionThreadID = unstable_getThreadID();
    this.memoizedInteractions = new Set();
    this.pendingInteractionMap = new Map();
  }
  if (enableSuspenseCallback) {
    this.hydrationCallbacks = null;
  }
}


/**
 * 创建fiber根组件
 * @param {*} containerInfo 
 * @param {*} tag 
 * @param {*} hydrate 
 */
export function createFiberRoot(containerInfo, tag, hydrate, hydrationCallbacks) {
  const root = new FiberRootNode(containerInfo, tag, hydrate);
  if (enableSuspenseCallback) {
    root.hydrationCallbacks = hydrationCallbacks;
  }

  const uninitializedFiber = createHostRootFiber(tag);
  root.current = uninitializedFiber;
  uninitializedFiber.stateNode = root;

  return root;
}

export function markRootExpiredAtTime(root, expirationTime) {
  const lastExpiredTime = root.lastExpiredTime;
  if (lastExpiredTime === NoWork || lastExpiredTime > expirationTime) {
    root.lastExpiredTime = expirationTime;
  }
}