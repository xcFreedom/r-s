import { pop, createCursor, push } from "./ReactFiberStack";

const DefaultSuspenseContext = 0b00;

// Suspense上下文分为两部分。低位在子树的最下面继承，上位只影响这个立即的suspense边界
// 并重新设置每个新的边界或suspense list
const SubtreeSuspenseContextMask = 0b01;

// Subtree Flags:

// InvisibleParentSuspenseContext表示我们的父Suspense边界之一当前未显示可见的主内容。
// 因为他已经显示了一个fallback，或者还没有mounted。
// 我们可以使用这个来确定是否需要在parent触发fallback。如果不是，我们可能需要触发不需要的边界（和/或）
// 挂起commit以避免隐藏parent content
export const InvisibleParentSuspenseContext = 0b01;

// Shallow Flags:
// ForceSuspenseFallback可有SuspenseList用于在一个呈现过程中强制新添加项进入fallback状态
export const ForceSuspenseFallback = 0b10;

export const suspenseStackCursor = createCursor(DefaultSuspenseContext);

export function hasSuspenseContext(parentContext, flag) {
  return (parentContext & flag) !== 0;
}

export function setDefaultShallowSuspenseContext(parentContext) {
  return parentContext & SubtreeSuspenseContextMask;
}

export function setShallowSuspenseContext(parentContext, shallowContext) {
  return (parentContext & SubtreeSuspenseContextMask) | shallowContext;
}

/**
 * 
 * @param {number} parentContext 
 * @param {number} subtreeContext 
 */
export function addSubtreeSuspenseContext(parentContext, subtreeContext) {
  return parentContext | subtreeContext;
}


/**
 * 
 * @param {Fiber} fiber 
 * @param {number} newContext 
 */
export function pushSuspenseContext(fiber, newContext) {
  push(suspenseStackCursor, newContext, fiber);
}

export function popSuspenseContext(fiber) {
  pop(suspenseStackCursor, fiber);
}