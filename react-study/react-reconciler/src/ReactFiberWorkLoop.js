import {
  markRootExpiredAtTime,
  markRootSuspendedAtTime,
  markRootUpdatedAtTime,
  markRootFinishedAtTime,
  isRootSuspendedAtTime,
} from "./ReactFiberRoot";
import { NoWork, Sync, msToExpirationTime, computeSuspenseExpiration, LOW_PRIORITY_EXPIRATION, computeInteractiveExpiration, Idle, Batched, Never, interPriorityFromExpirationTime, expirationTimeToMs } from "./ReactFiberExpirationTime";
import {
  scheduleSyncCallback,
  getCurrentPriorityLevel,
  runWithPriority,
  NoPriority,
  scheduleCallback,
  flushSyncCallbackQueue,
  now,
  NormalPriority,
  ImmediatePriority,
  UserBlockingPriority,
  LowPriority,
  IdlePriotity,
  requestPaint,
} from "./SchedulerWithReactIntegration";
import { enableSchedulerTracing, enableProfilerTimer, enableSuspenseServerRenderer, disableSchedulerTimeoutBasedOnReactExpirationTime } from "react-study/shared/ReactFeatureFlags";
import { __interactionsRef, __subscriberRef } from "react-study/scheduler/tracing";
import {
  commitPassiveHookEffects,
  commitBeforeMutationLifeCycles as commitBeforeMutationEffectOnFiber,
  commitLifeCycles as commitLayoutEffectOnFiber,
  commitResetTextContent,
  commitDetachRef,
  commitPlacement,
  commitWork,
  commitAttachRef,
} from "./ReactFiberCommitWork";
import { HostRoot, ClassComponent, SuspenseComponent, SuspenseListComponent } from "react-study/shared/ReactWorkTags";
import { createCapturedValue } from "./ReactCapturedValue";
import { createRootErrorUpdate, createClassErrorUpdate, throwException } from "./ReactFiberThrow";
import { enqueueUpdate } from "./ReactUpdateQueue";
import {
  startCommitTimer,
  startCommitSnapshotEffectsTimer,
  recordEffect,
  stopCommitSnapshotEffectsTimer,
  startCommitHostEffectsTimer,
  stopCommitHostEffectsTimer,
  startCommitLifeCyclesTimer,
  stopCommitLifeCyclesTimer,
  stopCommitTimer,
  startWorkLoopTimer,
  stopWorkTimer,
  recordScheduleUpdate,
  startWorkTimer,
} from "./ReactDebugFiberPerf";
import {
  PerformedWork,
  Snapshot,
  Passive,
  ContentReset,
  Placement,
  Update,
  Deletion,
  Hydrating,
  PlacementAndUpdate,
  HydratingAndUpdate,
  Callback,
  Ref,
  Incomplete,
  HostEffectMask,
} from "react-study/shared/ReactSideEffectTags";
import ReactCurrentOwner from "react-study/react/src/ReactCurrentOwner";
import {
  prepareForCommit,
  cancelTimeout,
} from "./ReactFiberHostConfig";
import { NoEffect } from "./ReactHookEffectTags";
import {
  setCurrentFiber as setCurrentDebugFiberInDev,
  resetCurrentFiber as resetCurrentDebugFiberInDEV,
} from './ReactCurrentFiber';
import { recordCommitTime } from "./ReactProfilerTimer";
import {
  BatchedMode,
  NoMode,
  ConcurrentMode,
  ProfileMode,
} from "./ReactTypeOfMode";
import { resetAfterCommit } from "./ReactFiberHostConfig";
import { onCommitRoot } from "./ReactFiberDevToolsHook";
import { noTimeout } from "react-study/react-dom/src/client/ReactDOMHostConfig";
import { unwindInterruptedWork, unwindWork } from "./ReactFiberUnwindWork";
import { createWorkInProgress } from "./ReactFiber";
import ReactCurrentDispatcher from "react-study/react/src/ReactCurrentDispatcher";
import { ContextOnlyDispatcher, resetHooks } from "./ReactFiberHooks";
import { resetContextDependencies } from "./ReactFiberNewContext";
import { completeWork } from "./ReactFiberCompleteWork";


const NoContext = /*                    */ 0b000000;
const BatchedContext = /*               */ 0b000001;
const EventContext = /*                 */ 0b000010;
const DiscreteEventContext = /*         */ 0b000100;
const LegacyUnbatchedContext = /*       */ 0b001000;
const RenderContext = /*                */ 0b010000;
const CommitContext = /*                */ 0b100000;

const RootIncomplete = 0;
const RootFatalErrored = 1;
const RootErrored = 2;
const RootSuspended = 3;
const RootSuspendedWithDelay = 4;
const RootCompleted = 5;

// 描述我们在React执行堆栈中的位置
let executionContext = NoContext;
// FiberRoot：正在工作root
let workInProgressRoot = null;
// Fiber，正在工作的fiber
let workInProgress = null;
// 渲染的过期时间
let renderExpirationTime = NoWork;
// root是否已完成、出错、挂起等。
let workInProgressRootExitStatus = RootIncomplete;
// 致命错误
let workInProgressRootFatalError = null;
// 在此呈现期间处理的更新之间的最新事件时间。
// 这在概念上是一个时间戳，但用expiration time表示，因为我们主要处理热路径中的到期时间，所以这避免了在热路径中发生转换。
// work in progress root最后的处理时间
let workInProgressRootLatestProcessedExpirationTime = Sync;
// work in progress root最后的Suspense过期时间
let workInProgressRootLatestSuspenseTimeout = Sync;
let workInProgressRootCanSuspendUsingConfig = null;
// 在此渲染期间访问的组件所遗留的工作。只包括未处理的更新，而不包括children中的工作。
let workInProgressRootNextUnprocessedUpdateTime = NoWork;

// 如果在渲染时ping，我们并不总是立即重新启动。此标志确定如果以后发生机会，是否值得重新启动。
let workInProgressRootHasPendingPing = false;
// The most recent time we committed a fallback. This lets us ensure a train
// model where we don't commit new loading states in too quick succession.
let globalMostRecentFallbackTime = 0;
const FALLBACK_THROTTLE_MS = 500;

// Fiber
let nextEffect = null;
let hasUncaughtError = false;
let firstUncaughtError = null;
// Set
let legacyErrorBoundariesThatAlreadyFailed = null;

// boolean
let rootDoesHavePassiveEffects = false;
// FiberRoot
let rootWithPendingPassiveEffects = null;
// ReactPriorityLevel
let pendingPassiveEffectsRenderPriority = NoPriority;
// ExpirationTime
let pendingPassiveEffectsExpirationTime = NoWork;

let rootsWithPendingDiscreteUpdates = null; // Map<FiberRoot, ExpirationTime>

// 使用这些来防止嵌套更新的无限循环
const NESTED_UPDATE_LIMIT = 50;
let nestedUpdateCount = 0;
// FiberRoot
let rootWithNestedUpdates = null;

const NESTED_PASSIVE_UPDATE_LIMIT = 50;
let nestedPassiveUpdateCount = 0;

// Fiber 被哪个fiber打断
let interruptedBy = null;

// 标记在commit阶段的，需要重新调度的等待的interaction的expirationTime。
// 使它们能够跨在渲染期间生成新work的组件进行跟踪。
// E.g：隐藏边界、suspended SSR hydration SuspenseList
// Array<ExpirationTime> 渲染期间产生的工作
let spawnedWorkDuringRender = null;

// 过期时间是通过添加到当前时间（开始时间）来计算的。
// 但是，如果两个更新被安排在同一事件中，我们应该将它们的开始时间视为同时的，
// 即使实际时钟时间在第一次和第二次调用之间提前。

// 换句话说，由于过期时间决定了更新的批处理方式，
// 因此我们希望在同一事件中发生的优先级相同的所有更新都接收到相同的过期时间。否则我们会流泪。
let currentEventTime = NoWork;

/**
 * 获取当前的更新时间
 */
export function requestCurrentTimeForUpdate() {
  // 如果当前不是commit、render上下文，计算currentTime
  if ((executionContext & (RenderContext | CommitContext)) !== NoContext) {
    return msToExpirationTime(now());
  }

  // 如果当前的批处理时间存在，则返回，这应该是为了保证统一批处理的expirationTime相同
  if (currentEventTime !== NoWork) {
    return currentEventTime;
  }

  // 如果当前没有工作，则计算此次批处理更新的expiraitonTime，并返回
  currentEventTime = msToExpirationTime(now());
  return currentEventTime;
}

export function getCurrentTime() {
  return msToExpirationTime(now());
}

/**
 * 
 * @param {ExpirationTime} currentTime 
 * @param {Fiber} fiber 
 * @param {null | SuspenseConfig} suspenseConfig 
 */
export function computeExpirationForFiber(currentTime, fiber, suspenseConfig) {
  const mode = fiber.mode;
  if ((mode & BatchedMode) === NoMode) {
    return Sync;
  }

  const priorityLevel = getCurrentPriorityLevel();
  if ((mode & ConcurrentMode) === NoMode) {
    return priorityLevel === ImmediatePriority ? Sync : Batched;
  }

  if ((executionContext & RenderContext) !== NoContext) {
    return renderExpirationTime;
  }

  let expirationTime;
  if (suspenseConfig !== null) {
    expirationTime = computeSuspenseExpiration(currentTime, suspenseConfig.timeoutMs | 0 || LOW_PRIORITY_EXPIRATION);
  } else {
    switch (priorityLevel) {
      case ImmediatePriority:
        expirationTime = Sync;
        break;
      case UserBlockingPriority:
        expirationTime = computeInteractiveExpiration(currentTime);
        break;
      case NormalPriority:
      case LowPriority:
        expirationTime = computeAsyncExpiration(currentTime);
        break;
      case IdlePriotity:
        expirationTime = Idle;
        break;
      default:
        // warn
    }
  }

  // 如果正在渲染树，请不要在已渲染的过期时间更新。
  if (workInProgressRoot !== null && expirationTime === renderExpirationTime) {
    // 这是将此更新移动到单独批处理中的技巧
    expirationTime -= 1;
  }

  return expirationTime;
}

/**
 * 调度fiber上的更新
 * @param {Fiber} fiber 
 * @param {ExpirationTime} expirationTime 
 */
export function scheduleUpdateOnFiber(fiber, expirationTime) {
  // 检查嵌套更新的计数是否超限
  checkForNestedUpdates();

  // 更新fiber与root的expirationTime相关字段
  const root = markUpdateTimeFromFiberToRoot(fiber, expirationTime);

  if (root === null) {
    // 
    return;
  }

  // 记录当前有更新在调度
  recordScheduleUpdate();

  // 获取当前scheduler保存的调度优先级
  const priorityLevel = getCurrentPriorityLevel();

  if (expirationTime === Sync) {
    if (
      // 如果在非批处理的更新 & 当前执行上下文是render/commit
      (executionContext & LegacyUnbatchedContext) !== NoContext &&
      (executionContext & (RenderContext | CommitContext)) === NoContext
    ) {
      // 在根目录上注册挂起的interactions以避免丢失跟踪的interaction数据
      schedulePendingInteractions(root, expirationTime);

      // 这是一个遗留的边缘案例。
      // batchedUpdates中ReactDOM.render的root初始装载应该是同步的。
      // 但是布局更新应该推迟到批处理结束
      performSyncWorkOnRoot(root);
    } else {
      ensureRootIsScheduled(root);
      schedulePendingInteractions(root, expirationTime);
      if (executionContext === NoContext) {
        // 现在刷新同步工作，除非我们已经在工作或者在批处理中。
        // 这是在scheduleUpdateOnfiber而不是schedulecallbackForFiber内部故意设置的
        // 以保留在不立即刷新回调的情况下调度回调的功能。我们只对用户发起的更新执行此操作，以保留同步模式历史行为
        flushSyncCallbackQueue();
      }
    }
  } else {
    ensureRootIsScheduled(root);
    schedulePendingInteractions(root, expirationTime);
  }

  if (
    // 只有在用户阻塞优先级，或更高级别的更新才被认为是离散的，即使是离散事件中也是如此
    (executionContext & DiscreteEventContext) !== NoContext &&
    (priorityLevel === UserBlockingPriority ||
      priorityLevel === ImmediatePriority)
  ) {
    // 这是一个离散事件的结果。跟踪每个根的最低优先级离散更新
    // 以便在需要时尽早刷新他们
    if (rootsWithPendingDiscreteUpdates === null) {
      rootsWithPendingDiscreteUpdates = new Map([[root, expirationTime]]);
    } else {
      const lastDiscreteTime = rootsWithPendingDiscreteUpdates.get(root);
      if (lastDiscreteTime === undefined || lastDiscreteTime > expirationTime) {
        rootsWithPendingDiscreteUpdates.set(root, expirationTime);
      }
    }
  }
}

export const scheduleWork = scheduleUpdateOnFiber;


/**
 * 更新fiber的expirationTime字段（当前更新对应的过期时间）为传入的值
 *  - 步骤一：判断是否需要更新fiber与alternate的expirationTime
 *  - 步骤二：向上遍历所有祖先fiber，判断是否需要更新祖先节点的childExpiraitonTime
 *  - 步骤三：直到遍历到root后，如果root就是当前工作的root，先记录下一个未完成的expiraitonTime（workInProgressRootNextUnprocessedUpdateTime）
 *  - 步骤四：如果当前root的工作退出原因是 挂起&delay，则将root上suspendedTime与expiraitonTime比较，firstSuspendedTime取更大，lastSuspendedTime取更小的。TODO:
 *  - 步骤五：调用markRootUpdatedAtTime，更新root的pendingTime、suspendedTime、pingTime
 *  - 这被分成一个单独的函数，这样我们就可以用挂起的工作标记一个fiber，而不将其视为源自事件的典型更新；例如，重试一个挂起的边界不是一个更新，但它确实会安排纤程上的工作。
 * @param {Fiber} fiber 
 * @param {ExpirationTime} expirationTime 
 */
function markUpdateTimeFromFiberToRoot(fiber, expirationTime) {
  // 更新fiber的expirationTime
  if (fiber.expirationTime < expirationTime) {
    fiber.expirationTime = expirationTime;
  }
  // 更新current fiber的expirationTime
  let alternate = fiber.alternate;
  if (alternate !== null && alternate.expirationTime < expirationTime) {
    alternate.expirationTime = expirationTime;
  }

  // 将父路径移动到根目录并更新childExpirationTime。
  let node = fiber.return;
  let root = null;
  if (node === null && fiber.tag === HostRoot) {
    root = fiber.stateNode;
  } else {
    while (node !== null) {
      // 向上递归，如果传入的expirationTime，如果之前的childExpirationTime的优先级小于传入的expirationTime，更新他
      // 保证fiber的childExpirationTime永远标记child里面最早应该更新的那一个
      alternate = node.alternate;
      if (node.childExpirationTime < expirationTime) {
        node.childExpirationTime = expirationTime;
        if (alternate !== null && alternate.childExpirationTime < expirationTime) {
          alternate.childExpirationTime = expirationTime;
        }
      } else if (alternate !== null && alternate.childExpirationTime < expirationTime) {
        alternate.childExpirationTime = expirationTime;
      }
      if (node.return === null && node.tag === HostRoot) {
        root = node.stateNode;
        break;
      }
      node = node.return;
    }
  }
  
  // root不等于null，说明要不然这个fiber就是root，要不然此次的expirationTime的优先级高于所有更新的优先级
  if (root !== null) {
    // 如果当前工作的root就是我们计算出来的root
    if (workInProgressRoot === root) {
      // 那么如果此expirationTime 高于 原本应该下一个进行的expirationTime
      // 那么将下一个应该的进行的expirationTime，设置为此expirationTime
      // 这就意味着下一次更新将会处理expirationTime为此expirationTime的update。
      markUnprocessedUpdateTime(expirationTime);

      // 如果当前工作root退出的原因是因为Suspense组件的Deply，意味着此次render肯定不会完成
      if (workInProgressRootExitStatus === RootSuspendedWithDelay) {
        //既然我们有了一个新的更新，就在标记传入的更新之前，现在将其标记为挂起。这会中断当前呈现并切换到更新。
        // TODO:后面暂时看不懂了，因为还没有理解renderExpirationTime、firstSuspendedTime等字段的含义
        markRootSuspendedAtTime(root, renderExpirationTime);
      }
    }
    // 标记root有一个等待的更新
    markRootUpdatedAtTime(root, expirationTime);
  }

  return root;
}


/**
 * 获取下一个工作的expirationTime
 * @param {FiberRoot} root 
 * @returns {ExpirationTime}
 */
function getNextRootExpirationTimeToWorkOn(root) {
  // 考虑到可能被挂起的level，或者已经收到ping的level
  // 确认root应该渲染的下一个expirationTime
  const lastExpiredTime = root.lastExpiredTime;
  // 如果root上已经存在过期的任务，直接返回过期的expiraitonTime
  if (lastExpiredTime !== NoWork) {
    return lastExpiredTime;
  }

  // "pending"是指任何尚未提交的更新，包括是否已挂起
  // 因此，"suspended"是“pending”的子集
  const firstPendingTime = root.firstPendingTime;
  if (!isRootSuspendedAtTime(root, firstPendingTime)) {
    // 最高优先级时间，不在挂起范围内，直接返回
    return firstPendingTime;
  }

  // 如果高优先级的时间在挂起范围内，检查是否存在我们知道的较低级别的优先级
  // 或者检查我们是否收到ping。优先使用高优先级的那个
  const lastPingedTime = root.lastPingedTime;
  const nextKnownPendingLevel = root.nextKnownPendingLevel;
  return lastPingedTime > nextKnownPendingLevel ? lastPingedTime : nextKnownPendingLevel;
}

/**
 * 保证root被调度
 * - 使用此函数为fiberRoot安排任务。每个fiberRoot只有一个任务；
 * - 如果任务已经被调度，我们将检查，以确保现有任务的到期时间与fiberRoot所工作的下一个到期时间相同
 * - 这个函数在每次更新之前调用，并且在退出任务之前就被调用
 * 
 * - 如果root上存在最后过期任务，Sync模式执行
 * @param {*} root FiberRoot
 */
function ensureRootIsScheduled(root) {
  const lastExpiredTime = root.lastExpiredTime;
  // 如果root上存在已经过期的任务
  if (lastExpiredTime !== NoWork) {
    // 将优先级设为最高，立即安排调度
    root.callbackExpirationTime = Sync;
    root.callbackPriority = ImmediatePriority;
    root.callbackNode = scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root));
    return;
  }

  // 拿到下一个工作的expirationTime
  const expirationTime = getNextRootExpirationTimeToWorkOn(root);
  const existingCallbackNode = root.callbackNode;

  if (expirationTime === NoWork) {
    // 没有工作要做的话就清空之前记录的调度信息
    if (existingCallbackNode !== null) {
      root.callbackNode = null;
      root.callbackExpirationTime = NoWork;
      root.callbackPriority = NoPriority;
    }
    return;
  }

  // TODO: 这里暂时没理清楚
  const currentTime = requestCurrentTimeForUpdate();
  const priorityLevel = interPriorityFromExpirationTime(currentTime, expirationTime);

  // 如果现在有render任务，确认它的优先级和expirationTime是否正确
  // 否则，会将它取消，然后安排一个新的
  if (existingCallbackNode !== null) {
    const existingCallbackPriority = root.callbackPriority;
    const existingCallbackExpirationTime = root.callbackExpirationTime;

    // 确认expirationTime相同，并且现有的任务优先级大于等于此任务的优先级
    if (existingCallbackExpirationTime === expirationTime && existingCallbackPriority >= priorityLevel) {
      // 现有的回调足够使用
      return;
    }
    // 需要安排一个新的任务
    cancelCallback(existingCallbackNode);
  }

  root.callbackExpirationTime = expirationTime;
  root.callbackPriority = priorityLevel;

  let callbackNode;
  if (expirationTime === Sync) {
    // sync react回调安排在一个特殊的内部队列上：syncQueue
    callbackNode = scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root));
  } else if (disableSchedulerTimeoutBasedOnReactExpirationTime) {
    callbackNode = scheduleCallback(priorityLevel, performConcurrentWorkOnRoot.bind(null, root));
  } else {
    // 根据expirationTime计算任务超时时间，这也会影响排序，因为任务是按超时顺序处理的
    callbackNode = scheduleCallback(priorityLevel, performConcurrentWorkOnRoot.bind(null, root), {
      timeout: expirationTimeToMs(expirationTime) - now(),
    });
  }
  // callbackNode就是scheduleCallback返回的task
  root.callbackNode = callbackNode;
}

/**
 * root异步任务  TODO:核心
 * @param {FiberRoot} root 
 * @param {boolean} didTimeout 是否已过期
 */
function performConcurrentWorkOnRoot(root, didTimeout) {

}

/**
 * 这是不通过调度程序的同步任务的入口点
 * @param {FiberRoot} root 
 */
function performSyncWorkOnRoot(root) {
  // 检查此根目录上是否有过期的工作。否则，在同步时渲染。
  const lastExpiredTime = root.lastExpiredTime;
  const expirationTime = lastExpiredTime !== NoWork ? lastExpiredTime : Sync;
  // 如果root上的work完成的过期时间，就等于最后的过期时间，或者是Sync
  if (root.finishedExpirationTime === expirationTime) {
    // 此时已存在挂起的提交。
    commitRoot(root);
  } else {
    flushPassiveEffects();

    // 如果根或到期时间发生了变化，扔掉现有的堆栈并准备一个新的堆栈。否则我们将继续我们离开的地方。
    if (root !== workInProgressRoot || expirationTime !== renderExpirationTime) {
      prepareFreshStack(root, expirationTime);
      startWorkOnPendingInteractions(root, expirationTime);
    }

    // 如果有一个workInProgress fiber，这意味着这个root上还有工作
    if (workInProgress !== null) {
      const prevExecutionContext = executionContext;
      executionContext |= RenderContext;
      const prevDispatcher = pushDispatcher(root);
      const prevInteractions = pushInteractions(root);
      startWorkLoopTimer(workInProgress);
      do {
        try {
          workLoopSync();
          break;
        } catch (thrownValue) {
          handleError(root, thrownValue);
        }
      } while (true);
    }

  }
}


/**
 * 刷新root上的任务
 * @param {FiberRoot} root 
 * @param {ExpirationTime} expirationTime 
 */
export function flushRoot(root, expirationTime) {
  // 更新root上的过期时间
  markRootExpiredAtTime(root, expirationTime);
  // 确保root被调度
  ensureRootIsScheduled(root);
  // 如果当前不是render、commit，冲洗同步队列
  if ((executionContext & (RenderContext | CommitContext)) === NoContext) {
    flushSyncCallbackQueue();
  }
}


/**
 * 准备新堆栈
 * @param {FiberRoot} root 
 * @param {ExpirationTime} expirationTime 
 */
function prepareFreshStack(root, expirationTime) {
  root.finishedWork = null;
  root.finishedExpirationTime = NoWork;

  const timeoutHandle = root.timeoutHandle;
  if (timeoutHandle !== noTimeout) {
    // 根以前挂起并计划了提交回退状态的超时。现在我们有了额外的工作，取消超时。
    root.timeoutHandle = noTimeout;
    cancelTimeout(timeoutHandle);
  }

  // 如果旧的workInProgress存在，则需要把它的中断的工作移除
  if (workInProgress !== null) {
    let interruptedWork = workInProgress.return;
    while (interruptedWork !== null) {
      unwindInterruptedWork(interruptedWork);
      interruptedWork = interruptedWork.return;
    }
  }

  // 重设workInProgressRoot
  workInProgressRoot = root;
  workInProgress = createWorkInProgress(root.current, null, expirationTime);
  renderExpirationTime = expirationTime;
  workInProgressRootExitStatus = RootIncomplete;
  workInProgressRootFatalError = null;
  workInProgressRootLatestProcessedExpirationTime = Sync;
  workInProgressRootLatestSuspenseTimeout = Sync;
  workInProgressRootCanSuspendUsingConfig = null;
  workInProgressRootNextUnprocessedUpdateTime = NoWork;
  workInProgressRootHasPendingPing = false;

  if (enableSchedulerTracing) {
    spawnedWorkDuringRender = null;
  }
}

/**
 * TODO:如果在work loop过程中出错了。首先清楚render过程的fiber相关的全局变量。设置hooks的处理对象为空，防止hooks的执行产生影响
 * 
 * @param {FiberRoot} root 
 * @param {Error} thrownValue 
 */
function handleError(root, thrownValue) {
  do {
    try {
      // 重置在render阶段设置的module-level状态
      resetContextDependencies();
      resetHooks();
      // resetCurrentDebugFiberInDEV();

      if (workInProgress === null || workInProgress.return === null) {
        // 预计将在非root fiber上工作
        // 这是一个致命错误，因为没有祖先可以处理它
        // root应该捕获所有错误边界未捕获的错误
        workInProgressRootExitStatus = RootFatalErrored;
        workInProgressRootFatalError = thrownValue;
        return null;
      }

      throwException(root, workInProgress.return, workInProgress, thrownValue, renderExpirationTime);
      workInProgress = completeUnitOfWork(workInProgress);
    } catch (yetAnotherThrownValue) {
      thrownValue = yetAnotherThrownValue;
      continue;
    }
    // 回到正常的workloop
    return;
  } while (true);
}

function pushDispatcher(root) {
  const prevDispatcher = ReactCurrentDispatcher.current;
  ReactCurrentDispatcher.current = ContextOnlyDispatcher;
  if (prevDispatcher === null) {
    return ContextOnlyDispatcher;
  } else {
    return prevDispatcher;
  }
}


function pushInteractions(root) {
  if (enableSchedulerTracing) {
    const prevInteractions = __interactionsRef.current;
    __interactionsRef.current = root.memoizedInteractions;
    return prevInteractions;
  }
  return null;
}

function popInteractions(prevInteractions) {
  if (enableSchedulerTracing) {
    __interactionsRef.current = prevInteractions;
  }
}

export function markCommitTimeOfFallback() {
  globalMostRecentFallbackTime = now();
}

/**
 * 标记render事件时间和config
 * @param {ExpirationTime} expirationTime 
 * @param {SuspenseConfig} suspenseConfig 
 */
export function markRenderEventTimeAndConfig(expirationTime, suspenseConfig) {
  if (
    expirationTime < workInProgressRootLatestProcessedExpirationTime &&
    expirationTime > Idle
  ) {
    workInProgressRootLatestProcessedExpirationTime = expirationTime;
  }
  if (suspenseConfig !== null) {
    if (
      expirationTime < workInProgressRootLatestSuspenseTimeout &&
      expirationTime > Idle
    ) {
      workInProgressRootLatestSuspenseTimeout = expirationTime;
      workInProgressRootCanSuspendUsingConfig = suspenseConfig;
    }
  }
}

/**
 * 标记当前工作的root上，下一个未处理更新的expirationTime
 * @param {ExpirationTime} expirationTime 
 */
export function markUnprocessedUpdateTime(expirationTime) {
  if (expirationTime > workInProgressRootNextUnprocessedUpdateTime) {
    workInProgressRootNextUnprocessedUpdateTime = expirationTime;
  }
}

/**
 * 如果当前root退出状态不是已完成，则将其标记为已出错
 */
export function renderDidError() {
  if (workInProgressRootExitStatus !== RootCompleted) {
    workInProgressRootExitStatus = RootErrored;
  }
}

/**
 * 同步执行
 * 已经超时，不再检查expirationTime
 */
function workLoopSync() {
  while (workInProgress !== null) {
    workInProgress = performUnitOfWork(workInProgress);
  }
}

/**
 * 执行工作单元
 * - 此fiber的当前刷新状态是alternate。
 * - 理想情况下，不应该依赖于此，但依赖于此意味着我们不需要在进行中的workInProgress附加字段
 * @param {Fiber} unitOfWork 
 * @returns {Fiber | null}
 */
function performUnitOfWork(unitOfWork) {
  const current = unitOfWork.alternate;

  startWorkTimer(unitOfWork);
  setCurrentDebugFiberInDev(unitOfWork);

  let next;
  if (enableProfilerTimer && (unitOfWork.mode & ProfileMode) !== NoMode) {
    // startProfilerTimer(unitOfWork) profile暂时不考虑
    next = beginWork(current, unitOfWork, renderExpirationTime);
    // stopProfilerTimerIfRunningAndRecordDelta(unitOfWork, true);
  } else {
    next = beginWork(current, unitOfWork, renderExpirationTime);
  }

  resetCurrentDebugFiberInDEV();

  unitOfWork.memoizedProps = unitOfWork.pendingProps;
  if (next === null) {
    // 如果没有产生新的工作，完成当前的工作单元
    next = completeUnitOfWork(unitOfWork);
  }

  ReactCurrentOwner.current = null;
  return next;
}


/**
 * 完成工作单元 TODO:核心逻辑
 * @param {Fiber} unitOfWork 
 * @returns {Fiber}
 */
function completeUnitOfWork(unitOfWork) {
  // 尝试完成当前工作单元，然后移动到下一个兄弟
  // 如果没有更多兄弟了，返回到父fiber
  workInProgress = unitOfWork;
  do {
    // 此fiber的当前刷新state是alternate。
    // 理想情况下，不应该依赖与此，但这样依赖意味着我们不需要在work in progress上附加字段
    const current = workInProgress.alternate;
    const returnFiber = workInProgress.return;

    // 检查工作是否完成或是否有东西抛出
    if ((workInProgress.effectTag & Incomplete) === NoEffect) {
      setCurrentDebugFiberInDev(workInProgress);
      let next;
      if (!enableProfilerTimer || (workInProgress.effectTag & ProfileMode) === NoMode) {
        next = completeWork(current, workInProgress, renderExpirationTime);
      } else {
        // startProfilerTimer
        next = completeWork(current, workInProgress, renderExpirationTime);
        // stopProfilerIfRunningAndRecordDelta(workInProgress, false);
      }
      stopWorkTimer(workInProgress);
      resetCurrentDebugFiberInDEV();
      resetChildExpirationTime(workInProgress);

      // 如果这个fiber的completeWork过程，产生了新的work，这里直接返回，不再继续
      // 事实上目前completeWork中产生新work的只有SuspenseComponent/SuspenseListComponent
      if (next !== null) {
        return next;
      }

      if (returnFiber !== null && (returnFiber.effectTag & Incomplete) === NoEffect) { // 如果兄弟节点没有完成，不要在parent Fiber上附加effect
        // 将子树和此fiber的所有effect，附加到parent的effectList中。
        // child的完成顺序影响side-effect的顺序
        if (returnFiber.firstEffect === null) {
          returnFiber.firstEffect = workInProgress.firstEffect;
        }
        // 把child的effectList添加到parent的effectList上。
        if (workInProgress.lastEffect !== null) {
          if (returnFiber.lastEffect !== null) {
            returnFiber.lastEffect.nextEffect = workInProgress.firstEffect;
          }
          returnFiber.lastEffect = workInProgress.lastEffect;
        }

        // 如果此fiber有side-effects, 我们在children的side-effects之后再加上它。
        // 如果需要的话，我们可以通过在effect list上进行多次传递来提前执行某些side-effect。
        // 我们不想把自己的副作用安排在自己effectList中。因为如果最终重用了child，我们还需要在自己的末尾添加effect
        const effectTag = workInProgress.effectTag;

        // 创建effectList时，跳过NoWork和PerformedWork标记，DevTools读取PerformedWork effect。但不提交
        if (effectTag > PerformedWork) {
          // 再把自己添加到parent的effectList上。
          if (returnFiber.lastEffect !== null) {
            returnFiber.lastEffect.nextEffect = workInProgress;
          } else {
            returnFiber.firstEffect = workInProgress;
          }
          returnFiber.lastEffect = workInProgress;
        }
      }
    } else {
      // 如果这个fiber没有完成，有东西丢了。
      // 在不进入完整阶段的情况下，从堆栈中弹出值。如果这是一个boundary，则在可能的情况下捕获
      const next = unwindWork(workInProgress, renderExpirationTime);

      // fiber没有完成，不需要重设expirationTime;

      // 忽略ProfilerTime
      if (next !== null) {
        next.effectTag &= HostEffectMask;
        return next;
      }

      if (returnFiber !== null) {
        // 标记父fiber未完成，情况effect List
        returnFiber.firstEffect = returnFiber.lastEffect = null;
        returnFiber.effectTag |= Incomplete;
      }
    }

    const siblingFiber = workInProgress.sibling;
    if (siblingFiber !== null) {
      // 如果父fiber下有更多的work要做，返回next
      return siblingFiber;
    }

    // 否则，返回父级
    workInProgress = returnFiber;
  } while (workInProgress !== null);

  if (workInProgressRootExitStatus === RootIncomplete) {
    workInProgressRootExitStatus = RootCompleted;
  }
  return null;
}

/**
 * 获取还需处理的过期时间
 * @param {Fiber} fiber 
 */
function getRemainingExpirationTime(fiber) {
  const updateExpirationTime = fiber.expirationTime;
  const childExpirationTime = fiber.childExpirationTime;
  return updateExpirationTime > childExpirationTime ? updateExpirationTime : childExpirationTime;
}

/**
 * 重新计算fiber的childExpirationTime
 * @param {Fiber} completedWork 
 */
function resetChildExpirationTime(completedWork) {
  if (
    renderExpirationTime !== Never &&
    completeWork.childExpirationTime === Never
  ) {
    // 这个组件的children被隐藏。不要冒泡到他们的expirationTime
    return;
  }

  let newChildExpirationTime = NoWork;

  // 最早的到期时间
  if (enableProfilerTimer && (completeWork.mode & ProfileMode) !== NoWork) {
    //TODO: 暂时忽略Profiler
  } else {
    let child = completeWork.child;
    // 遍历fiber的直接child，找到child中expirationTime最大的那个。
    while (child !== null) {
      const childUpdateExpirationTime = child.expirationTime;
      const childChildExpirationTime = child.childExpirationTime;
      if (childUpdateExpirationTime > newChildExpirationTime) {
        newChildExpirationTime = childUpdateExpirationTime;
      }
      if (childChildExpirationTime > newChildExpirationTime) {
        newChildExpirationTime = childChildExpirationTime;
      }
      child = child.sibling;
    }
  }

  // 重设fiber的childExpirationTime为后代中expirationTime最大的那个，
  completeWork.childExpirationTime = newChildExpirationTime;
}

function commitRoot(root) {
  const renderPriorityLevel = getCurrentPriorityLevel();
  runWithPriority(ImmediatePriority, commitRootImpl.bind(null, root, renderPriorityLevel)); 
}

function commitRootImpl(root, renderPriorityLevel) {
  flushPassiveEffects();
  // DEV flushRenderPhaseStrictModeWarningsInDEV();

  const finishedWork = root.finishedWork;
  const expirationTime = root.finishedExpirationTime;
  if (finishedWork === null) {
    return null;
  }
  root.finishedWork = null;
  root.finishedExpirationTime = NoWork;

  // commitRoot从不返回continuation；它总是同步完成。所以我们现在可以清除这些，以便安排新的回调。
  root.callbackNode = null;
  root.callbackExpirationTime = NoWork;
  root.callbackPriority = NoPriority;
  root.nextKnownPendingLevel = NoWork;

  startCommitTimer();

  // 更新此根目录上的第一个和最后一个挂起时间。新的第一个等待时间是FiberRoot上剩下的时间。
  const remainingExpirationTimeBeforeCommit = getRemainingExpirationTime(finishedWork);
  markRootFinishedAtTime(root, expirationTime, remainingExpirationTimeBeforeCommit);

  if (root === workInProgressRoot) {
    // reset
    workInProgressRoot = null;
    workInProgress = null;
    renderExpirationTime = NoWork;
  } else {
    // 这表示我们上一次处理的根与现在提交的根不同。这通常发生在挂起的根超时时。
  }

  let firstEffect;
  if (finishedWork.effectTag > PerformedWork) {
    // fiber的effect列表只包含它的children，不包含自身。
    // 所以，如果root有一个effect，我们需要把它添加到list结尾。
    // 如果root有一个effetc，结果列表是属于root的父级的集合
    // 也就是说所有树中的effect包含root
    if (finishedWork.lastEffect !== null) {
      finishedWork.lastEffect.nextEffect = finishedWork;
      firstEffect = finishedWork.firstEffect;
    } else {
      firstEffect = finishedWork;
    }
  } else {
    // root上没有effect
    firstEffect = finishedWork.firstEffect;
  }

  if (firstEffect !== null) {
    const prevExecutionContext = executionContext;
    executionContext |= CommitContext;
    const prevInteractions = pushInteractions(root);

    // 在生命周期开始前重置
    ReactCurrentOwner.current = null;

    // commit阶段分为几个子阶段，对每个阶段的effect list进行单独传递：所有的mutation effect先于layout effect

    // 第一个阶段是“before mutation”阶段。我们在这个阶段读取host tree的state，然后再改变它。这也是调用getSnapshotBeforeUpdate的地方
    startCommitSnapshotEffectsTimer();
    prepareForCommit(root.containerInfo);
    nextEffect = firstEffect;
    do {
      try {
        commitBeforeMutationEffects();
      } catch (error) {
        // commitBeforeMutationEffects会遍历fiber，这里的do-while循环和catch都是为了保证commitBeforeMutationEffects内部出错的时候还能正确的继续
        // 后面阶段类似代码同理
        console.error('Should be working on an effect.');
        captureCommitPhaseError(nextEffect, error);
        nextEffect = nextEffect.nextEffect;
      }
    } while (nextEffect !== null);
    stopCommitSnapshotEffectsTimer();

    if (enableProfilerTimer) {
      // 标记此批中所有探查器共享的当前提交时间。这使它们能够在以后分组。
      recordCommitTime();
    }

    // 下一个阶段是mutation phase，这里将改变host tree
    startCommitHostEffectsTimer();
    nextEffect = firstEffect;
    do {
      try {
        commitMutationEffects(root, renderPriorityLevel);
      } catch (error) {
        captureCommitPhaseError(nextEffect, error);
        nextEffect = nextEffect.nextEffect;
      }
    } while (nextEffect !== null);
    stopCommitHostEffectsTimer();
    resetAfterCommit();

    // work-in-progress tree现在成为了current tree, 这必须发生在mutation阶段之后
    // 这样做是为了，componentWillUnmount期间获取到的树仍是上一个树。
    // 但是在layout阶段之前，已经完成的工作应该成为current tree，这样在componentDidMount/componentDidUpdate阶段才能获取正确的。
    root.current = finishedWork;

    // 下一个阶段是layout阶段，在这里我们调用在宿主树发生变异后读取它的效果。这方面的惯用用例是布局，但是由于遗留原因，类组件生命周期也会在这里触发。
    startCommitLifeCyclesTimer();
    nextEffect = firstEffect;
    do {
      try {
        commitLayoutEffects(root, expirationTime);
      } catch (error) {
        captureCommitPhaseError(nextEffect, error);
        nextEffect = nextEffect.nextEffect;
      }
    } while (nextEffect !== null);
    stopCommitLifeCyclesTimer();

    nextEffect = null;

    // 通知Scheduler在帧末尾结束，这样浏览器有机会绘制
    requestPaint();

    if (enableSchedulerTracing) {
      popInteractions(prevInteractions);
    }

    executionContext = prevExecutionContext;
  } else {
    // No Effects.
    root.current = finishedWork;

    // 只是记录时间。。。
    startCommitSnapshotEffectsTimer();
    stopCommitSnapshotEffectsTimer();
    if (enableProfilerTimer) {
      recordCommitTime();
    }
    startCommitHostEffectsTimer();
    stopCommitHostEffectsTimer();
    startCommitLifeCyclesTimer();
    stopCommitLifeCyclesTimer();
  }

  stopCommitTimer();

  const rootDidHavePassiveEffects = rootDoesHavePassiveEffects;
  if (rootDoesHavePassiveEffects) {
    // 此提交有passive effects。隐藏他们。在刷新layout工作之后再安排回调
    rootDoesHavePassiveEffects = false;
    rootWithPendingPassiveEffects = root;
    pendingPassiveEffectsExpirationTime = expirationTime;
    pendingPassiveEffectsRenderPriority = renderPriorityLevel;
  } else {
    // 现在我们已经完成了effect list，所以让我们清除nexteffect指针来帮助GC。如果我们有被动效果，我们会在flushPassiveEffects中清除。
    nextEffect = firstEffect;
    while (nextEffect !== null) {
      const nextNextEffect = nextEffect.nextEffect;
      nextEffect.nextEffect = null;
      nextEffect = nextNextEffect;
    }
  }

  // 检查这个根上是否还有剩余工作
  const remainingExpirationTime = root.firstPendingTime;
  if (remainingExpirationTime !== NoWork) {
    if (enableSchedulerTracing) {
      if (spawnedWorkDuringRender !== null) {
        const expirationTimes = spawnedWorkDuringRender;
        spawnedWorkDuringRender = null;
        for (let i = 0; i < expirationTimes.length; i++) {
          scheduleInteractions(root, expirationTimes[i], root.memoizedInteractions);
        }
      }
      schedulePendingInteractions(root, remainingExpirationTime);
    }
  } else {
    legacyErrorBoundariesThatAlreadyFailed = null;
  }

  if (enableSchedulerTracing) {
    if (!rootDidHavePassiveEffects) {
      // 如果没有被动影响，那么我们可以完成挂起的交互。否则，我们将等到被动效果被刷新之后。等到剩下的工作安排好之后再做，这样我们就不会在有隐藏工作的时候过早地发出完成交互的信号。
      finishPendingInteractions(root, expirationTime);
    }
  }

  if (remainingExpirationTime === Sync) {
    // 计算根在未完成的情况下同步重新呈现的次数。如果太多，则表示无限更新循环。
    if (root = rootWithNestedUpdates) {
      nestedUpdateCount++;
    } else {
      nestedUpdateCount = 0;
      rootWithNestedUpdates = root;
    }
  } else {
    nestedUpdateCount = 0;
  }

  onCommitRoot(finishedWork.stateNode, expirationTime);

  // 在退出“commitRoot”之前，请调用此命令，以确保在此根上进行任何额外的工作。
  ensureRootIsScheduled(root);

  // TODO:
}

/**
 * commit阶段一：在fiber改变之前
 * - 情况一（effectTag为Snapshot）：如果是ClassComponent主要是执行getSnapshotBeforeUpdate | FunctionComponent主要是执行useEffect？
 * - 情况二（effectTag为Passive）: 暂时还没搞懂
 */
function commitBeforeMutationEffects() {
  while (nextEffect !== null) {
    const effectTag = nextEffect.effectTag;
    if ((effectTag & Snapshot) !== NoEffect) {
      setCurrentDebugFiberInDev(nextEffect);
      recordEffect();

      const current = nextEffect.alternate;
      commitBeforeMutationEffectOnFiber(current, nextEffect);

      resetCurrentDebugFiberInDEV();
    }
    if ((effectTag & Passive) !== NoEffect) {
      // 如果存在被动效果，请安排回调以尽早刷新。
      if (!rootDoesHavePassiveEffects) {
        scheduleCallback(NormalPriority, () => {
          flushPassiveEffects();
          return null;
        });
      }
    }
    nextEffect = nextEffect.nextEffect;
  }
}

/**
 * commit阶段二：MutationEffects
 * @param {FiberRoot} root 
 * @param {*} renderPriorityLevel 
 */
function commitMutationEffects(root, renderPriorityLevel) {

  // 原react-TODO 应该把这个函数的大部分转移到commitWork。
  while (nextEffect !== null) {
    setCurrentDebugFiberInDev(nextEffect);
    const effectTag = nextEffect.effectTag;

    if (effectTag & ContentReset) { // TODO:什么情况下effectTag会是ContentReset。。。
      commitResetTextContent(nextEffect);
    }

    if (effectTag & Ref) {
      const current = nextEffect.alternate;
      if (current !== null) {
        // 这里看起来像是ref重设为null了。什么时候会设置回去呢。。
        commitDetachRef(current);
      }
    }

    /**
     * - 下面的switch语句只关系防止、更新和删除。
     * - 为了避免需要为每个可能的位图值添加大小写，我们从effectTag中删除了次要效果，然后打开该值。
     */
    let primaryEffectTag = effectTag & (Placement | Update | Deletion | Hydrating);
    switch (primaryEffectTag) {
      case Placement: {
        commitPlacement(nextEffect);
        nextEffect.effectTag &= ~Placement;
        break;
      }
      case PlacementAndUpdate: {
        commitPlacement(nextEffect);
        // 清除effect标签中的“placement”，这样我们就知道在调用componentDidMount之类的任何生命周期之前，已经插入了它。
        nextEffect.effectTag &= ~Placement;

        // Update
        const current = nextEffect.alternate;
        commitWork(current, nextEffect);
        break;
      }
      case Hydrating: {
        nextEffect.effectTag &= ~Hydrating;
        break;
      }
      case HydratingAndUpdate: {
        nextEffect.effectTag &= ~Hydrating;
        // update
        const current = nextEffect.alternate;
        commitWork(current, nextEffect);
        break;
      }
      case Update: {
        const current = nextEffect.alternate;
        commitWork(current, nextEffect);
        break;
      }
      case Deletion: {
        commitDeletion(root, nextEffect, renderPriorityLevel);
        break;
      }
    }

    recordEffect();

    resetCurrentDebugFiberInDEV();
    nextEffect = nextEffect.nextEffect;
  }
}


/**
 * commit阶段三：Layout
 * @param {FiberRoot} root 
 * @param {ExpirationTime} committedExpirationTime 
 */
function commitLayoutEffects(root, committedExpirationTime) {
  // 这个函数的大部分未来会移动到ReactFiberCommitWork
  while (nextEffect !== null) {
    const effectTag = nextEffect.effectTag;
    // fiber的更新类型是Update、PlacementAndUpdate、Callback
    // 触发相应的组件hook或者生命周期
    if (effectTag & (Update | Callback)) {
      recordEffect();
      const current = nextEffect.alternate;
      commitLayoutEffectOnFiber(root, current, nextEffect, committedExpirationTime);
    }

    if (effectTag & Ref) {
      recordEffect();
      commitAttachRef(nextEffect);
    }

    resetCurrentDebugFiberInDEV();
    nextEffect = nextEffect.nextEffect;
  }
}

/**
 * 刷新消极的effects
 */
export function flushPassiveEffects() {
  // 如果等待的消极的effects渲染优先级不是空
  if (pendingPassiveEffectsRenderPriority !== NoPriority) {
    // 保证优先级不大于NormalPriority
    const priorityLevel = pendingPassiveEffectsRenderPriority > NormalPriority ? NormalPriority : pendingPassiveEffectsRenderPriority;
    // 清空
    pendingPassiveEffectsRenderPriority = NoPriority;
    // 
    return runWithPriority(priorityLevel, flushPassiveEffectsImpl);
  }
}

/**
 * TODO:BeforeMutationEffects 核心步骤二，暂未明白
 */
function flushPassiveEffectsImpl() {
  if (rootWithPendingPassiveEffects === null) {
    return false;
  }
  const root = rootWithPendingPassiveEffects;
  const expirationTime = pendingPassiveEffectsExpirationTime;
  rootWithPendingPassiveEffects = null;
  pendingPassiveEffectsExpirationTime = NoWork;
  
  const prevExecutionContext = executionContext;
  executionContext |= CommitContext;
  const prevInteractions = pushInteractions(root);

  // 注意：这目前假定根fiber没有被动影响，因为根不属于其自身的影响列表。这在未来可能会改变。
  let effect = root.current.firstEffect;
  while (effect !== null) {
    try {
      commitPassiveHookEffects(effect);
    } catch (error) {
      captureCommitPhaseError(effect, error);
    }
    const nextNextEffect = effect.nextEffect;
    // 删除指针
    effect.nextEffect = null;
    effect = nextNextEffect;
  }

  if (enableSchedulerTracing) {
    popInteractions(prevInteractions);
    finishPendingInteractions(root, expirationTime);
  }

  executionContext = prevExecutionContext;

  flushSyncCallbackQueue();

  // 如果计划了其他被动效果，则增加一个计数器。如果超过限制，我们会发出警告。
  nestedPassiveUpdateCount = rootWithPendingPassiveEffects === null ? 0 : nestedPassiveUpdateCount + 1;

  return true;
}

// 是已知的旧错误边界
export function isAlreadyFailedLegacyErrorBoundary(instance) {
  return (
    legacyErrorBoundariesThatAlreadyFailed !== null &&
    legacyErrorBoundariesThatAlreadyFailed.has(instance)
  );
}

// 将旧错误边界标记为失败
export function markLegacyErrorBoundaryAsFailed(instance) {
  if (legacyErrorBoundariesThatAlreadyFailed === null) {
    legacyErrorBoundariesThatAlreadyFailed = new Set([instance]);
  } else {
    legacyErrorBoundariesThatAlreadyFailed.add(instance);
  }
}

function prepareToThrowUncaughtError(error) {
  if (!hasUncaughtError) {
    hasUncaughtError = true;
    firstUncaughtError = error;
  }
}

export const onUncaughtError = prepareToThrowUncaughtError;

function captureCommitPhaseErrorOnRoot(rootFiber, sourceFiber, error) {
  const errorInfo = createCapturedValue(error, sourceFiber);
  const update = createRootErrorUpdate(rootFiber, errorInfo, Sync);
  enqueueUpdate(rootFiber, update);
  const root = markUpdateTimeFromFiberToRoot(rootFiber, Sync);
  if (root !== null) {
    ensureRootIsScheduled(root);
    schedulePendingInteractions(root, Sync);
  }
}

/**
 * 捕获提交阶段的error
 * @param {Fiber} sourceFiber 
 * @param {Error} error 
 */
export function captureCommitPhaseError(sourceFiber, error) {
  if (sourceFiber.tag === HostRoot) {
    // 错误被抛出到根目录。没有父级，因此根本身应该捕获它。
    captureCommitPhaseErrorOnRoot(sourceFiber, sourceFiber, error);
    return;
  }

  let fiber = sourceFiber.return;
  // 如果不是root、或者classComponent没有设置didCatch的生命周期，则一直向上查找
  while (fiber !== null) {
    if (fiber.tag === HostRoot) {
      captureCommitPhaseErrorOnRoot(fiber, sourceFiber, error);
      return;
    } else if (fiber.tag === ClassComponent) {
      const ctor = fiber.type;
      const instance = fiber.stateNode;
      // 如果组件内设置了getDerivedStateFromError / componentDidCatch
      if (
        typeof ctor.getDerivedStateFromError === 'function' ||
        (typeof instance.componentDidCatch === 'function' &&
          !isAlreadyFailedLegacyErrorBoundary(instance))
      ) {
        const errorInfo = createCapturedValue(error, sourceFiber);
        const update = createClassErrorUpdate(fiber, errorInfo, Sync);
        enqueueUpdate(fiber, update);
        // update进入更新队列后，调用markUpdateTimeFromFiberToRoot，向上更新时间，找到root后返回
        const root = markUpdateTimeFromFiberToRoot(fiber, Sync);
        if (root !== null) {
          ensureRootIsScheduled(root);
          schedulePendingInteractions(root, Sync);
        }
        return;
      }
    }
    fiber = fiber.return;
  }
}


/**
 * fiberRoot上的ping回调函数，处理SuspenseComponent
 * @param {FiberRoot} root 
 * @param {Thenable} thenable 
 * @param {ExpirationTime} suspendedTime 
 */
export function pingSuspendedRoot(root, thenable, suspendedTime) {
  const pingCache = root.pingCache;
  if (pingCache !== null) {
    // thenable已经是resolved状态，所以我们不需要在记录，因为它不可能再次抛出
    pingCache.delete(thenable);
  }

  // 如果当前是此root在工作，并且当前进行的任务优先级就是此suspense listener的expiratioinTime
  if (workInProgressRoot === root && renderExpirationTime === suspendedTime) {
    // 接收到与当前render的优先级相同的ping。我们可能想重新开始这个render。这应该反映根目录完成后是否挂起的逻辑。

    // 如果我们被延迟暂停，我们会一直暂停，这样我们就可以重新启动。
    // 如果在没有任何更新的情况下suspended，则可能是retry
    // 如果在重试的早期，我们可以restart
    // 我们无法确定是否最终会在这个render过程中处理此update，但是在此之前我们不太可能达到ping
    // 因为达到root的大多数更新通常非常快
    if (
      workInProgressRootExitStatus === RootSuspendedWithDelay ||
      (workInProgressRootExitStatus === RootSuspended &&
        workInProgressRootLatestProcessedExpirationTime === Sync && 
        now() - globalMostRecentFallbackTime < FALLBACK_THROTTLE_MS)
    ) {
      // 从root重启，不需要安排ping，因为我们已经在处理这棵树了
      prepareFreshStack(root, renderExpirationTime);
    } else {
      // 即便我们现在不能开始，我们之后可能有机会开始。因此，我们将此渲染标记为具有ping
      workInProgressRootHasPendingPing = true;
    }
    return;
  }

  if (!isRootSuspendedAtTime(root, suspendedTime)) {
    // 此时root不再挂起
    return;
  }

  const lastPingedTime = root.lastPingedTime;
  if (lastPingedTime !== NoWork && lastPingedTime < suspendedTime) {
    // 已经安排了更低优先级的ping
    return;
  }

  root.lastPingedTime = suspendedTime;
  if (root.finishedExpirationTime === suspendedTime) {
    // 如果这里有一个pending fallback在等待提交，丢掉它
    root.finishedExpirationTime = NoWork;
    root.finishedWork = null;
  }

  ensureRootIsScheduled(root);
  schedulePendingInteractions(root, suspendedTime);
}


function retryTimedOutBoundary(boundaryFiber, retryTime) {
  // The boundary fiber (a Suspense component or SuspenseList component)
  // previously was rendered in its fallback state. One of the promises that
  // suspended it has resolved, which means at least part of the tree was
  // likely unblocked. Try rendering again, at a new expiration time.
  if (retryTime === NoWork) {
    const suspenseConfig = null;
    const currentTime = requestCurrentTimeForUpdate();
    retryTime = computeExpirationForFiber(currentTime, boundaryFiber, suspenseConfig);
  }

  const root = markUpdateTimeFromFiberToRoot(boundaryFiber, retryTime);
  if (root !== null) {
    ensureRootIsScheduled(root);
    schedulePendingInteractions(root, retryTime);
  }
}

/**
 * 解决重试的thenable
 * @param {Fiber} boundaryFiber 
 * @param {Thenable} thenable 
 */
export function resolveRetryThenable(boundaryFiber, thenable) {
  let retryTime = NoWork;
  let retryCache;
  if (enableSuspenseServerRenderer) {
    switch (boundaryFiber.tag) {
      case SuspenseComponent:
        retryCache = boundaryFiber.stateNode;
        const suspenseState = boundaryFiber.memoizedState;
        if (suspenseState !== null) {
          retryTime = suspenseState.retryTime;
        }
        break;
      case SuspenseListComponent:
        retryCache = boundaryFiber.stateNode;
        break;
      default:
        //warning
    }
  } else {
    retryCache = boundaryFiber.stateNode;
  }

  if (retryCache !== null) {
    retryCache.delete(thenable);
  }

  retryTimedOutBoundary(boundaryFiber, retryTime);
}

/**
 * TODO:
 */
function checkForNestedUpdates() {
  if (nestedUpdateCount > NESTED_UPDATE_LIMIT) {
    nestedUpdateCount = 0;
    rootWithNestedUpdates = null;
    // 警告，超出更新深度范围
  }
}

// 计算线程id
function computeThreadID(root, expirationTime) {
  // 每个根和过期时间的交互线程都是唯一的。
  return expirationTime * 1000 + root.interactionThreadID;
}

/**
 * TODO:暂时没明白
 * @param {ExpirationTime} expirationTime 
 */
export function markSpawnedWork(expirationTime) {
  if (!enableSchedulerTracing) {
    return;
  }

  if (spawnedWorkDuringRender === null) {
    spawnedWorkDuringRender = [expirationTime];
  } else {
    spawnedWorkDuringRender.push(expirationTime);
  }
}

/**
 * TODO:
 * @param {FiberRoot} root 
 * @param {ExpirationTime} expirationTime 
 * @param {Set} interactions 
 */
function scheduleInteractions(root, expirationTime, interactions) {
  if (!enableSchedulerTracing) {
    return;
  }

  if (interactions.size > 0) {
    const pendingInteractionMap = root.pendingInteractionMap;
    const pendingInteractions = pendingInteractionMap.get(expirationTime);
    if (pendingInteractions != null) {
      interactions.forEach(interaction => {
        if (!pendingInteractions.has(interaction)) {
          // 更新先前未计划交互的挂起异步工作计数。
          interaction.__count++;
        }

        pendingInteractions.add(interaction);
      });
    } else {
      pendingInteractionMap.set(expirationTime, new Set(interactions));

      interactions.forEach(interaction => {
        interaction.__count++;
      });
    }

    const subscriber = __subscriberRef.current;
    if (subscriber !== null) {
      const threadID = computeThreadID(root, expirationTime);
      subscriber.onWorkScheduled(interactions, threadID);
    }
  }
}

/**
 * 安排等待的交互
 * @param {FiberRoot} root 
 * @param {ExpirationTime} expirationTime 
 */
function schedulePendingInteractions(root, expirationTime) {
  if (!enableSchedulerTracing) {
    return;
  }

  scheduleInteractions(root, expirationTime, __interactionsRef.current);
}

/**
 * 在root上启动新工作时调用此函数。
 * @param {FiberRoot} root 
 * @param {ExpirationTime} expirationTime 
 */
function startWorkOnPendingInteractions(root, expirationTime) {
  if (!enableSchedulerTracing) {
    return;
  }

  // 确定此批工作当前包括哪些交互
  // 以便我们可以准确地确定处理它所花费的时间，并使在render阶段触发的级联工作与之关联。
  const interactions = new Set();
  // 从等待交互map中找到？？？
  root.pendingInteractionMap.forEach((scheduledInteractions, scheduledExpirationTime) => {
    if (scheduledExpirationTime >= expirationTime) {
      scheduledInteractions.forEach(interaction => interactions.add(interaction));
    }
  });

  // 把当前的一组interactions存储在FiberRoot上有一下原因：
  // 我们可以在诸如performConcurrentWorkOnRoot()这样的热函数重用它，而不必重新计算
  // 我们还将在commitWork()中使用它来传递给任何Profiler的onRender()钩子。
  // 这也为DevTools提供了在调用onCommitRoot()钩子时访问它的方法
  root.memoizedInteractions = interactions;

  if (interactions.size > 0) {
    const subscriber = __subscriberRef.current;
    if (subscriber !== null) {
      const threadID = computeThreadID(root, expirationTime);
      try {
        subscriber.onWorkStarted(interactions, threadID);
      } catch (error) {
        scheduleCallback(ImmediatePriority, () => {
          throw error;
        });
      }
    }
  }
}


/**
 * 结束正在等待的交互
 * @param {FiberRoot} root 
 * @param {ExpirationTime} committedExpirationTime 
 */
function finishPendingInteractions(root, committedExpirationTime) {
  if (!enableSchedulerTracing) {
    return;
  }

  const earliestRemainingTimeAfterCommit = root.firstPendingTime;

  let subscriber;

  try {
    subscriber = __subscriberRef.current;
    if (subscriber !== null && root.memoizedInteractions.size > 0) {
      const threadID = computeThreadID(root, committedExpirationTime);
      subscriber.onWorkStopped(root.memoizedInteractions, threadID); // TODO: where is onWorkStopped -> Scheduler/src/TracingSubscription
    }
  } catch (error) {
    // 如果subscriber报错，需要在单独的task中重新抛错
    scheduleCallback(ImmediatePriority, () => {
      throw error;
    });
  } finally {
    // 从pending Map中清除已完成的interaction。除非render被挂起或计划了级联工作，在这种情况下，将pending interactions保留到后续render。
    const pendingInteractionMap = root.pendingInteractionMap;
    pendingInteractionMap.forEach((scheduledInteractions, scheduledExpirationTime) => {
      // 只有在完成后才能减少挂起的交互计数。如果仍有当前优先级的工作，则表示我们正在等待suspense data。
      if (scheduledExpirationTime > earliestRemainingTimeAfterCommit) {
        pendingInteractionMap.delete(scheduledExpirationTime);
        scheduledInteractions.forEach(interaction => {
          interaction.__count--;

          if (subscriber !== null && interaction.__count === 0) {
            try {
              subscriber.onInteractionScheduledWorkCompleted(interaction); // TODO: where is onWorkStopped -> Scheduler/src/TracingSubscription
            } catch (error) {
              scheduleCallback(ImmediatePriority, () => {
                throw error;
              });
            }
          }
        });
      }
    });
  }
}