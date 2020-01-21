import { createWorkInProgress } from "./ReactFiber";

/**
 * 克隆子fibers
 * @param {Fiber|null} current 
 * @param {Fiber} workInProgress 
 */
export function cloneChildFibers(current, workInProgress) {
  // 没有child，直接返回
  if (workInProgress.child === null) {
    return;
  }

  let currentChild = workInProgress.child;
  let newChild = createWorkInProgress(currentChild, currentChild.pendingProps, currentChild.expirationTime);
  workInProgress.child = newChild;

  newChild.return = workInProgress;

  while (currentChild.sibling !== null) {
    currentChild = currentChild.sibling;
    newChild = newChild.sibling = createWorkInProgress(currentChild, currentChild.pendingProps, currentChild.expirationTime);
    newChild.return = workInProgress;
  }
  newChild.sibling = null;
}