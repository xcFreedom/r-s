import { createUpdate, CaptureUpdate, ForceUpdate, enqueueUpdate, enqueueCapturedUpdate } from './ReactUpdateQueue';
import { onUncaughtError, markLegacyErrorBoundaryAsFailed, pingSuspendedRoot, renderDidError, isAlreadyFailedLegacyErrorBoundary } from './ReactFiberWorkLoop';
import { logError } from './ReactFiberCommitWork';
import { Incomplete, DidCapture, LifecycleEffectMask, ShouldCapture, NoEffect } from 'react-study/shared/ReactSideEffectTags';
import { hasSuspenseContext, suspenseStackCursor, InvisibleParentSuspenseContext } from './ReactFiberSuspenseContext';
import { SuspenseComponent, ClassComponent, IncompleteClassComponent, HostRoot } from 'react-study/shared/ReactWorkTags';
import { shouldCaptureSuspense } from './ReactFiberSuspenseComponent';
import { BatchedMode, NoMode } from './ReactTypeOfMode';
import { Sync } from './ReactFiberExpirationTime';
import getComponentName from 'react-study/shared/getComponentName';
import { getStackByFiberInDevAndProd } from './ReactCurrentFiber';
import { createCapturedValue } from './ReactCapturedValue';


const PossiblyWeakMap = typeof WeakMap === 'function' ? WeakMap : Map;

/**
 * 创建root上的错误update
 * @param {Fiber} fiber 
 * @param {CaputedValue} errorInfo 
 * @param {ExpirationTime} expirationTime 
 * @returns {Update}
 */
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


/**
 * 床架class组件的error update
 * @param {Fiber} fiber 
 * @param {CapturedValue} errorInfo 
 * @param {ExpirationTime} expirationTime 
 * @returns {Update}
 */
export function createClassErrorUpdate(fiber, errorInfo, expirationTime) {
  // 根据过期时间创建一个update
  const update = createUpdate(expirationTime, null);
  // 将update的类型设置为捕获更新
  update.tag = CaptureUpdate;
  const getDerivedStateFromError = fiber.type.getDerivedStateFromError;
  if (typeof getDerivedStateFromError === 'function') {
    const error = errorInfo.value;
    update.payload = () => {
      logError(fiber, errorInfo);
      // 尝试执行组件的getDerivedStateFromError钩子
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
      // 尝试执行组件的componentDidCatch钩子
      this.componentDidCatch(error, {
        componentStack: stack !== null ? stack : '',
      });
    }
  }

  return update;
}


/**
 * 将一个listener附加到root的ping上，但是只有在当前render到期时间的情况下，才存在
 * @param {FiberRoot} root 
 * @param {ExpirationTime} renderExpirationTime 
 * @param {Thenable} thenable 
 */
function attachPingListener(root, renderExpirationTime, thenable) {
  let pingCache = root.pingCache;
  let threadIDs;
  if (pingCache === null) {
    pingCache = root.pingCache = new PossiblyWeakMap();
    threadIDs = new Set();
    pingCache.set(thenable, threadIDs);
  } else {
    threadIDs = pingCache.get(thenable);
    if (threadIDs === undefined) {
      threadIDs = new Set();
      pingCache.set(thenable, threadIDs);
    }
  }

  if (!threadIDs.has(renderExpirationTime)) {
    // 使用threadId来防止多余的lisntener
    threadIDs.add(renderExpirationTime);
    let ping = pingSuspendedRoot.bind(null, root, thenable, renderExpirationTime);
    thenable.then(ping, ping);
  }
}

/**
 * 
 * @param {FiberRoot} root 
 * @param {Fiber} returnFiber 
 * @param {Fiber} sourceFiber 
 * @param {any} value 
 * @param {ExpirationTime} renderExpirationTime 
 */
export function throwException(root, returnFiber, sourceFiber, value, renderExpirationTime) {
  // 将出错的fiber标记为未完成
  sourceFiber.effectTag = Incomplete;
  // 清空出错fiber的effectList
  sourceFiber.firstEffect = sourceFiber.lastEffect = null;

  // 这里是处理异步错误
  if (
    value !== null &&
    typeof value === 'object' &&
    typeof value.then === 'function'
  ) {
    // 如果这个错误是一个promise
    const thenable = value;

    let hasInvisibleParentBoundary = hasSuspenseContext(suspenseStackCursor.current, InvisibleParentSuspenseContext);

    // Schedule最近的Suspense重新render，展示超时的view
    let workInProgress = returnFiber;
    // TODO:待完成
    do {
      // Suspense组件处理promise的错误，与一般组件不同
      if (workInProgress.tag === SuspenseComponent && shouldCaptureSuspense(workInProgress, hasInvisibleParentBoundary)) {
        // 找到最近的错误边界

        // 把promise藏在边界的fiber上。如果边界超时，我们将附加listener将边界翻转回正常状态
        const thenables = workInProgress.updateQueue;
        // 如果这个fiber上，没有updatequeue
        if (thenables === null) {
          const updateQueue = new Set();
          updateQueue.add(thenable);
          workInProgress.updateQueue = updateQueue;
        } else {
          thenables.add(thenable);
        }

        // 如果边界在批处理模式之外，我们不应该暂停commit。假装挂起的组件render null并且保持。
        // 在commit阶段，我们将安排后续的同步更新来重新渲染Suspense.

        // 注意：挂起的组件是否在批处理树中并不重要，如果Suspense不在这范围内，我们就不应该暂停提交
        if ((workInProgress.mode & BatchedMode) === NoMode) {
          workInProgress.effectTag |= DidCapture;

          // 即使fiber还没完成，我们还是要把它固定下来。
          // 但我们不应该调用任何生命周期钩子。移除所有的生命周期effect tags和Incomplete tag
          sourceFiber.effectTag &= ~(LifecycleEffectMask | Incomplete);

          if (sourceFiber.tag === ClassComponent) {
            const currentSourceFiber = sourceFiber.alternate;
            if (currentSourceFiber === null) {
              // 新的mount. 更改tag，以免将其误认为已完成的classComponent。
              // 例如：我们不应该在它被删除后，还调用componentWillUnmount
              sourceFiber.tag = IncompleteClassComponent;
            } else {
              // 我们再次尝试渲染时，我们不应重用current fiber
              // 因为已知它处于不一致的状态。使用强制更新来帮忙脱离困境
              const update = createUpdate(Sync, null);
              update.tag = ForceUpdate;
              enqueueUpdate(sourceFiber, update);
            }
          }

          // source fiber未完成，用Sync优先级标记它，以指示它仍有挂起的工作
          sourceFiber.expirationTime = Sync;

          // 退出但不暂停
          return;
        }

        // 确认boundary处于concurrent mode树中，继续正常的挂起路径。

        // 之后，我们将使用一组试探法来确定此呈现过程是运行到完成、重新启动还是“挂起”提交。
        // 实际的逻辑是在不同的地方展开的

        // 第一个原则是，如果我们要在complete root时挂起，那么如果我们得到一个可能取消挂起的update或者ping，我们也应该重新启动，反之亦然。
        // 挂起的唯一原因是您认为可能需要在commit之前重新启动。
        // 然后，仅仅在暂停期间重启是没有意义的。

        // 过于积极地重新启动也不好，因为它会耗尽任何中间加载状态。所以我们用试探法来决定什么时候

        // Suspense 启发

        // 如果没有抛出promise，或者所有的fallbacks都都已显示，则不要挂起/restart

        // 如果这是新的Suspense的初次render，并且触发了fallback，那么不要挂起/restart
        // 我们要确保尽快的显示初始加载状态

        // 如果遇到“delayed”情况（useDeferredValue？），例如从content切换会fallback，则应始终挂起/restart。
        // SuspenseConfig适用于这个例子。

        // 如果我们已经显示了一个fallback，并且它被“重试”，允许我们显示另一个level，但是仍然会有一个内部边界显示fallback
        // 那么自上次在树中的任何位置显示fallback以来，我们暂停/restart 500ms。
        // 这有效的将渐进加载限制为一致的commit序列。
        // 这也为我们提供了一个restart的机会，以便稍早到达completed状态

        // 如果由于批处理而产生歧义，则优先解决：
        // 1. delayed      2. initial render       3. retry

        // 我们希望确保忙碌状态不会被强制commit，我们希望确保新的初始加载状态能够进口commit

        attachPingListener(root, renderExpirationTime, thenable);

        workInProgress.effectTag |= ShouldCapture;
        workInProgress.expirationTime = renderExpirationTime;

        return;
      }

      // 这个边界已经在此渲染期间捕获，继续下一个边界
      workInProgress = workInProgress.return;
    } while (workInProgress !== null);

    value = new Error(
      (getComponentName(sourceFiber.type) || 'A React component') +
        ' suspended while rendering, but no fallback UI was specified.\n' +
        '\n' +
        'Add a <Suspense fallback=...> component higher in the tree to ' +
        'provide a loading indicator or placeholder to display.' +
        getStackByFiberInDevAndProd(sourceFiber),
    );
  }

  // 找不到可以处理此类异常的边界。重新开始并再次遍历父路径，将这次异常视为错误。
  renderDidError();
  value = createCapturedValue(value, sourceFiber);
  let workInProgress = returnFiber;
  do {
    switch (workInProgress.tag) {
      case HostRoot: {
        const errorInfo = value;
        // 标记fiber的effectTag增加ShouldCapture
        workInProgress.effectTag |= ShouldCapture;
        // 设置fiber的expirationTime
        workInProgress.expirationTime = renderExpirationTime;
        // 创建错误更新
        const update = createRootErrorUpdate(workInProgress, errorInfo, renderExpirationTime);
        // 将更新添加到捕获队列
        enqueueCapturedUpdate(workInProgress, update);
        return;
      }
      case ClassComponent: {
        const errorInfo = value;
        const ctor = workInProgress.type;
        const instance = workInProgress.stateNode;
        if (
          (workInProgress.effectTag & DidCapture) === NoEffect &&
          (typeof ctor.getDerivedStateFromError === 'function' ||
            (instance !== null &&
              typeof instance.componentDidCatch === 'function' &&
              !isAlreadyFailedLegacyErrorBoundary(instance))) 
        ) {
          workInProgress.effectTag |= ShouldCapture;
          workInProgress.expirationTime = renderExpirationTime;
          const update = createClassErrorUpdate(workInProgress, errorInfo, renderExpirationTime);
          enqueueCapturedUpdate(workInProgress, update);
          return;
        }
        break;
      }
      default:
        break;
    }
    workInProgress = workInProgress.return;
  } while (workInProgress !== null);
}