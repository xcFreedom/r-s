import {
  createCursor,
  pop,
  push,
} from './ReactFiberStack';
import {
  getRootHostContext,
  getChildHostContext,
} from './ReactFiberHostConfig';

const No_CONTEXT = {};

let contextStackCursor = createCursor(No_CONTEXT);
let contextFiberStackCursor = createCursor(No_CONTEXT);
let rootInstanceStackCursor = createCursor(No_CONTEXT);

function requiredContext(c) {
  return c;
}

export function getRootHostContainer() {
  const rootInstance = requiredContext(rootInstanceStackCursor.current);
  return rootInstance;
}

/**
 * 
 * @param {Fiber} fiber 
 * @param {Element} nextRootInstance 
 */
export function pushHostContainer(fiber, nextRootInstance) {
  // 将当前root实例推送到堆栈上
  // 这允许我们在portals被弹出时重置root
  push(rootInstanceStackCursor, nextRootInstance, fiber);
  // 跟踪上下文和提供它的fiber。
  // 这使我们能够只弹出提供独特上下文的fiber
  push(contextFiberStackCursor, fiber, fiber);

  // 最后，我们需要将hostcontext推送到堆栈中。
  // 但是，我们不能只调用getRootHostContext()并推送它，因为根据getRootHostContext()是否在renderer程序代码中抛出错误，堆栈上的条目数量会有所不同
  // 所以我们先推一个空值。这样我们就可以安全的消除错误。
  push(contextStackCursor, No_CONTEXT, fiber);
  const nextRootContext = getRootHostContext(nextRootInstance);
  // 现在知道这个函数不会抛错，就替换为真正的context
  pop(contextStackCursor, fiber);
  push(contextStackCursor, nextRootContext, fiber);
}

export function popHostContainer(fiber) {
  pop(contextStackCursor, fiber);
  pop(contextFiberStackCursor, fiber);
  pop(rootInstanceStackCursor, fiber);
}

export function getHostContext() {
  const context = requiredContext(contextStackCursor.current);
  return context;
}

/**
 * 添加host上下文
 * @param {Fiber} fiber 
 */
export function pushHostContext(fiber) {
  const rootInstance = requiredContext(rootInstanceStackCursor.current);
  const context = requiredContext(contextStackCursor.current);
  const nextContext = getChildHostContext(context, fiber.type, rootInstance);

  // 除非这个fiber的上下文与其他的不同，否则不要退
  if (context === newContext) {
    return;
  }

  // 跟踪上下文和提供它的fiber。
  // 这使我们能够只弹出提供独特context的fiber
  push(contextFiberStackCursor, fiber, fiber);
  push(contextStackCursor, nextContext, fiber);
}

export function popHostContext(fiber) {
  // 除非此fiber提供了当前context，否则不弹出
  // pushHostContext()只推送提供唯一context的fiber
  if (contextFiberStackCursor.current !== fiber) {
    return;
  }

  pop(contextStackCursor, fiber);
  pop(contextFiberStackCursor, fiber);
}