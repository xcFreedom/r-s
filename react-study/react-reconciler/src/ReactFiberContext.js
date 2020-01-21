import { createCursor, pop, push } from './ReactFiberStack';
import { disableLegacyContext } from 'react-study/shared/ReactFeatureFlags';

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

function popTopLevelContextObject(fiber) {
  pop(didPerformWorkStackCursor, fiber);
  pop(contextStackCursor, fiber);
}

/**
 * 添加顶层context对象到contextStachCursor，添加context是否改变的标记到didPerformWorkStackCursor
 * @param {Fiber} fiber 
 * @param {Object} context 
 * @param {boolean} didChange 
 */
export function pushTopLevelContextObject(fiber, context, didChange) {
  push(contextStackCursor, context, fiber);
  push(didPerformWorkStackCursor, didChange, fiber);
}

/**
 * 
 * @param {Fiber} workInProgress 
 * @param {Function} Component 
 * @param {boolean} didPushOwnContextIfProvider 
 */
export function getUnmaskedContext(workInProgress, Component, didPushOwnContextIfProvider) {
  if (disableLegacyContext) {
    return emptyContextObject;
  } else {
    if (didPushOwnContextIfProvider && isContextProvider(Component)) {
      // 如果fiber本身是一个context provider，那么当我们读取它的上下文时，我们可能已经在堆栈上推送了它自己的child context。
      // context provider不应该看到自己的child context，因此我们读取上一个context（即parent context），而不是context provider
      return previousContext;
    }
    return contextStackCursor.current;
  }
}

/**
 * 缓存context
 * @param {Fiber} workInProgress 
 * @param {Object} unmaskedContext 
 * @param {Object} maskedContext 
 */
function cacheContext(workInProgress, unmaskedContext, maskedContext) {
  if (disableLegacyContext) {
    return;
  } else {
    const instance = workInProgress.stateNode;
    instance.__reactInternalMemoizedUnmaskedChildContext = unmaskedContext;
    instance.__reactInternalMemoizedMaskedChildContext = maskedContext;
  }
}

/**
 * 
 * @param {Fiber} workInProgress 
 * @param {Object} unmaskedContext 
 */
export function getMaskedContext(workInProgress, unmaskedContext) {
  if (disableLegacyContext) {
    return emptyContextObject;
  } else {
    const type = workInProgress.type;
    const contextTypes = type.contextTypes;
    if (!contextTypes) {
      return emptyContextObject;
    }

    // 除非unmasked context改变，否则不要重新创建masked context
    // 否则将导致对componentWillReceiveProps的不必要调用
    // 如果componentWillReceiveProps调用setState，这可能会触发无限循环
    const instance = workInProgress.stateNode;
    if (instance && instance.__reactInternalMemoizedUnmaskedChildContext === unmaskedContext) {
      return instance.__reactInternalMemoizedMaskedChildContext;
    }

    const context = {};
    for (let key in contextTypes) {
      context[key] = unmaskedContext[key];
    }

    // 缓存unmadked context，以便我们可以避免重新创建masked context，
    // 上下文是在类组件实例话之前创建的，因此检查实例
    if (instance) {
      cacheContext(workInProgress, unmaskedContext, context);
    }

    return context;
  }
}

/**
 * context是否发生改变
 * @returns {boolean}
 */
export function hasContextChanged() {
  if (disableLegacyContext) {
    return false;
  } else {
    return didPerformWorkStackCursor.current;
  }
}

export function isContextProvider(type) {
  const childContextTypes = type.childContextTypes;
  return childContextTypes !== null && childContextTypes !== undefined;
}

/**
 * 将context的提供者推入栈
 * @param {Fiber} workInProgress 
 */
export function pushContextProvider(workInProgress) {
  const instance = workInProgress.stateNode;
  // 我们尽早推送context以确保堆栈完整性。
  // 如果实例还不存在，我们将首先推入null，然后再将新值替换到堆栈上
  const memoizedMergedChildContext = (instance && instance.__reactInternalMemoizedMergedChildContext) || emptyContextObject;

  // 记录父context，后面可以进行merge
  // 继承父级的didPerformWork，以避免意外阻塞更新，也就是为了保证ReactFiberStack内部valueStack的完整性
  previousContext = contextStackCursor.current;
  push(contextStackCursor, memoizedMergedChildContext, workInProgress);
  push(didPerformWorkStackCursor, didPerformWorkStackCursor.current, workInProgress);

  return true;
}

export {
  popContext,
  popTopLevelContextObject,
};