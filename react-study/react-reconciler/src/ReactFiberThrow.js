import { createUpdate, CaptureUpdate } from './ReactUpdateQueue';
import { onUncaughtError, markLegacyErrorBoundaryAsFailed } from './ReactFiberWorkLoop';
import { logError } from './ReactFiberCommitWork';

export function createRootErrorUpdate(fiber, errorInfo, expirationTime) {
  const update = createUpdate(expirationTime, null);

  update.tag = CaptureUpdate;

  update.payload = { element: null };
  const error = errorInfo.value;
  update.callback = () => {
    onUncaughtError(error);
    logError(fiber, errorInfo)
  };
  return update;
}

export function createClassErrorUpdate(fiber, errorInfo, expirationTime) {
  const update = createUpdate(expirationTime, null);
  update.tag = CaptureUpdate;
  const getDerivedStateFromError = fiber.type.getDerivedStateFromError;
  if (typeof getDerivedStateFromError === 'function') {
    const error = errorInfo.value;
    update.payload = () => {
      logError(fiber, errorInfo);
      return getDerivedStateFromError(error);
    };
  }

  const inst = fiber.stateNode;
  if (inst !== null && typeof inst.componentDidCatch === 'function') {
    update.callback = function callback() {
      if (typeof getDerivedStateFromError !== 'function') {
        // 为了保持错误边界的预先存在的重试行为，我们跟踪在这批中哪些已经失败。在我们返回到浏览器之前，这将被重置。
        markLegacyErrorBoundaryAsFailed(this);

        // 如果componentDidCatch是唯一定义的错误边界方法，则仅在此记录
        logError(fiber, errorInfo);
      }
      const error = errorInfo.value;
      const stack = errorInfo.stack;
      this.componentDidCatch(error, {
        componentStack: stack !== null ? stack : '',
      });
    }
  }

  return update;
}