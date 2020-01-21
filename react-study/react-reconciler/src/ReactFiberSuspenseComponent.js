
/**
 * 是否应该捕获suspense
 * @param {Fiber} workInProgerss 
 * @param {boolean} hasInvisibleParent 
 */
export function shouldCaptureSuspense(workInProgerss, hasInvisibleParent) {
  // 如果主子项刚刚suspensed，则捕获并render fallback。否则，不捕获并冒泡到下一个boundary
  const nextState = workInProgerss.memoizedState;
  if (nextState !== null) {
    if (nextState.debydrated !== null) {
      // 脱水的boundary总是被捕获
      return true;
    }
    return false;
  }

  const props = workInProgerss.memoizedProps;
  // 为了capture、Suspense组件必须有一个fallback属性
  if (props.fallback === undefined) {
    return false;
  }

  // 规则的边界总是被捕获
  if (props.unstable_avoidThisFallback !== true) {
    return true;
  }

  // 
  if (hasInvisibleParent) {
    return false;
  }

  // 如果parent不能处理，这里必须处理
  return true;
}