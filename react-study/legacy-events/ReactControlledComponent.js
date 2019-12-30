import { getInstanceFromNode } from "../react-dom/src/client/ReactDOMComponentTree";

// 用于在触发更改事件后还原受控状态。
let restoreImpl = null;
let restoreTarget = null;
let restoreQueue = null;

function restoreStateOfTarget(target) {
  // 在事件循环结束时执行此转换，以便始终在这里接收正确的fiber;
  const internalInstance = getInstanceFromNode(target);
  if (!internalInstance) {
    // Unmounted
    return;
  }
  const props = getFiberCurrentPropsFromNode(internalInstance.stateNode);
  restoreImpl(internalInstance.stateNode, internalInstance.type, props);
}

export function needsStateRestore() {
  return restoreTarget !== null || restoreQueue !== null;
};

export function restoreStateIfNeeded() {
  if (!restoreTarget) {
    return;
  }
  const target = restoreTarget;
  const queuedTargets = restoreQueue;
  restoreTarget = null;
  restoreQueue = null;

  restoreStateOfTarget(target);
  if (queuedTargets) {
    for (let i = 0; i < queuedTargets.length; i++) {
      restoreStateOfTarget(queuedTargets[i]);
    }
  }
}