import invokeGuardedCallbackImpl from './invokeGuardedCallbackImpl';

let hasError = false;
let caughtError = null;

let hasRethrowError = false;
let rethrowError = null;

const reporter = {
  onError(error) {
    hasError = true;
    caughtError = error;
  }
}

/**
 * - 生产环境就是用try catch实现的，这里不直接使用try catch主要是为了开发模式可以做自定义替换
 */
export function invokeGuardedCallback(name, func, context, a, b, c, d, e, f) {
  hasError = false;
  caughtError = null;
  invokeGuardedCallbackImpl.apply(reporter, arguments);
}


export function invokeGuardedCallbackAndCatchFirstError(name, func, context, a, b, c, d, e, f) {
  invokeGuardedCallback.apply(this, arguments);
  if (hasError) {
    const error = clearCaughtError();
    if (hasRethrowError) {
      hasRethrowError = true;
      rethrowError = error;
    }
  }
}

// 在执行保护函数的过程中，我们将捕获第一个错误，我们将重新抛出该错误以供顶级错误处理程序处理。
export function rethrowCaughtError() {
  if (hasRethrowError) {
    const error = rethrowError;
    hasRethrowError = false;
    rethrowError = null;
    throw error;
  }
}

export function clearCaughtError() {
  if (hasError) {
    const error = caughtError;
    hasError = false;
    caughtError = null;
    return error;
  } else {
    // 警告
  }
}