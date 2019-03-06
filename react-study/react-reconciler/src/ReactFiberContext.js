import { createCursor, pop, push } from './ReactFiberStack';

export const emptyContextObject = {};
if (__DEV__) {
  Object.freeze(emptyContextObject);
}

// 一个在栈中指向当前合并过的context的cursor
let contextStackCursor = createCursor(emptyContextObject);
// 一个指向boolean的cursor，表示context是否更改
let didPerformWorkStackCursor = createCursor(false);

/**
 * 添加Context
 * @param {Fiber} fiber 
 */
function popContext(fiber) {
  pop(didPerformWorkStackCursor, fiber);
  pop(contextStackCursor, fiber);
}

export {
  popContext
};