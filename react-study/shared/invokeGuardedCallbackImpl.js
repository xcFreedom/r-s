let invokeGuardedCallbackImpl = function(name, func, context, a, b, c, d, e, f) {
  const funcArgs = Array.prototype.slice.call(arguments, 3);
  try {
    func.apply(context, funcArgs);
  } catch (error) {
    this.onError(error);
  }

  // dev模式逻辑不同，
}

export default invokeGuardedCallbackImpl;