import {
  hasContextChanged as hasLegacyContextChanged,
  pushTopLevelContextObject,
  isContextProvider as isLegacyContextProvider,
  pushContextProvider as pushLegacyContextProvider,
  getUnmaskedContext,
  getMaskedContext,
} from './ReactFiberContext';
import {
  HostRoot,
  HostComponent,
  ClassComponent,
  HostPortal,
  Profiler,
  SuspenseComponent,
  SuspenseListComponent,
  IndeterminateComponent,
  LazyComponent,
} from 'react-study/shared/ReactWorkTags';
import { pushHostContainer, pushHostContext } from './ReactFiberHostContext';
import { resetHydrationState } from './ReactFiberHydrationContext';
import { ConcurrentMode } from './ReactTypeOfMode';
import {
  shouldDeprioritizeSubtree,
} from './ReactFiberHostConfig';
import { enableSchedulerTracing, enableSuspenseServerRenderer, enableUserTimingAPI, disableLegacyContext } from 'react-study/shared/ReactFeatureFlags';
import { pushProvider, prepareToReadContext } from './ReactFiberNewContext';
import { NoWork } from './ReactFiberExpirationTime';
import { markUnprocessedUpdateTime } from './ReactFiberWorkLoop';
import { cloneChildFibers } from './ReactChildFiber';
import { Placement, PerformedWork } from 'react-study/shared/ReactSideEffectTags';
import { renderWithHooks } from './ReactFiberHooks';

let didReceiveUpdate = false;


/**
 * 判断是否需要更新context对象。并记录context是否存在变更
 * @param {Fiber} workInProgress 
 */
function pushHostRootContext(workInProgress) {
  const root = workInProgress.stateNode;
  if (root.pendingContext) {
    pushTopLevelContextObject(workInProgress, root.pendingContext, root.pendingContext !== root.context);
  } else if (root.context) {
    // 应该一直设置
    pushTopLevelContextObject(workInProgress, root.context, false);
  }
  pushHostContainer(workInProgress, root.containerInfo);
}

/**
 * 安装不确定组件
 * @param {Fiber|null} _current 
 * @param {Fiber} workInProgress 
 * @param {any} Component 
 * @param {ExpirationTime} renderExpirationTime 
 */
function mountIndeterminateComponent(_current, workInProgress, Component, renderExpirationTime) {
  if (_current !== null) {
    // 不确定组件只有在不一致的状态下挂起，在非并发树中时才会挂载。
    // 我们想把它当作一个新的mount，即使它已经有一版本提交了。
    // 断开alternate
    _current.alternate = null;
    workInProgress.alternate = null;
    // 由于这是新的fiber，调度一个新增effect;
    workInProgress.effectTag |= Placement;
  }

  const props = workInProgress.pendingProps;
  let context;
  if (!disableLegacyContext) {
    const unmaskedContext = getUnmaskedContext(workInProgress, Component, false);
    context = getMaskedContext(workInProgress, unmaskedContext);
  }

  prepareToReadContext(workInProgress, renderExpirationTime);
  let value;

  value = renderWithHooks(null, workInProgress, Component, props, context, renderExpirationTime);

  // react devtools
  workInProgress.effectTag |= PerformedWork;

  if (
    typeof value === 'object' &&
    value !== null &&
    typeof value.render === 'function' &&
    value.$$typeof === undefined
  ) {

  }
}


export function markWorkInProgressReceivedUpdate() {
  didReceiveUpdate = true;
}

/**
 * 救助已完成的工作
 * @param {Fiber|null} current 
 * @param {Fiber} workInProgress 
 * @param {ExpirationTime} renderExpirationTime 
 */
function bailoutOnAlreadyFinishedWork(current, workInProgress, renderExpirationTime) {
  // cancelWorkTime(workInProgress);
  if (current !== null) {
    // 重用以前的依赖
    workInProgress.dependencies = current.dependencies;
  }

  const updateExpirationTime = workInProgress.expirationTime;
  if (updateExpirationTime !== NoWork) {
    markUnprocessedUpdateTime(updateExpirationTime);
  }
  
  // 检查child上是否有未完成的工作
  const childExpirationTime = workInProgress.childExpirationTime;
  if (childExpirationTime < renderExpirationTime) {
    // child上没有啥工作
    return null;
  } else {
    // fiber上的工作已经完成了，但是child上的还没有
    cloneChildFibers(current, workInProgress);
    return workInProgress.child;
  }
}


/**
 * 开始工作
 * @param {Fiber | null} current 
 * @param {Fiber} workInProgress 
 * @param {ExpirationTime} renderExpirationTime 
 */
export function beginWork(current, workInProgress, renderExpirationTime) {
  // 获取fiber的当前expirationTime
  const updateExpirationTime = workInProgress.expirationTime;
  if (current !== null) {
    const oldProps = current.memoizedProps;
    const newProps = workInProgress.memoizedProps;

    if (
      oldProps !== newProps ||
      hasLegacyContextChanged()
    ) {
      // 如果props或者context发生改变，将fiber标记为已执行工作。
      // 如果稍后确定props相等，则可能取消设置(memo)
      didReceiveUpdate = true;
    } else if (updateExpirationTime < renderExpirationTime) { // 说明这个任务可以开始了？
      didReceiveUpdate = false;
      // 如果此fiber上没有任何等待的work
      // 不进入begin阶段。
      // 还有一些bookkeeping我们需要在这里优化路径，主要是推到堆栈上
      switch (workInProgress.tag) {
        case HostRoot:
          pushHostRootContext(workInProgress);
          resetHydrationState();
          break;
        case HostComponent:
          pushHostContext(workInProgress);
          if (
            workInProgress.mode & ConcurrentMode &&
            renderExpirationTime !== Never &&
            shouldDeprioritizeSubtree(workInProgress.type, newProps)
          ) {
            if (enableSchedulerTracing) {
              markSpawnedWork(Never);
            }
            workInProgress.expirationTime = workInProgress.childExpirationTime = Never;
            return null;
          }
          break;
        case ClassComponent: {
          const Component = workInProgress.type;
          if (isLegacyContextProvider(Component)) {
            pushLegacyContextProvider(workInProgress);
          }
          break;
        }
        case HostPortal:
          pushHostContainer(workInProgress, workInProgress.stateNode.containerInfo);
          break;
        case ContextProvider: {
          const newValue = workInProgress.memoizedProps.value;
          pushProvider(workInProgress, newValue);
          break;
        }
        case Profiler: {
          break;
        }
        case SuspenseComponent: {
          // TODO:suspense暂时放弃
          const state = workInProgress.memoizedState;
          if (state !== null) {
            if (enableSuspenseServerRenderer) {
            }


          }
          break;
        }
        case SuspenseListComponent: {
          // TODO:suspenseList暂时放弃
        }
      }
      return bailoutOnAlreadyFinishedWork(current, workInProgress, renderExpirationTime);
    } else {
      // 已调度此fiber的update，但是没有产生的新props，或者老方式的context。
      // 将此设置为 false，如果更新队列或者context消费者生成了一个新值，则将其设置为true。
      // 否则，该组件将认为child并没有改变
      didReceiveUpdate = false;
    }
  } else {
    didReceiveUpdate = false;
  }

  // 进入开始阶段之前，清空expirationTime
  workInProgress.expirationTime = NoWork;

  switch (workInProgress.tag) {
    case IndeterminateComponent: {
      return mountIndeterminateComponent(current, workInProgress, workInProgress.type, renderExpirationTime);
    }
    case LazyComponent: {
      const elementType = workInProgress.elementType;
      return mountLazyComponent(current, workInProgress, elementType, updateExpirationTime, renderExpirationTime);
    }
    case FuncationComponent: {
      const Component = workInProgress.type;
      const unresolvedProps = workInProgress.pendingProps;
      const resolvedProps = 
    }
  }
}