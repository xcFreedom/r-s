import {
  markRootExpiredAtTime,
  markRootSuspendedAtTime,
  markRootUpdatedAtTime,
  markRootFinishedAtTime,
} from "./ReactFiberRoot";
import { NoWork, Sync } from "./ReactFiberExpirationTime";
import { ImmediatePriority, NormalPriority } from "../../scheduler/src/SchedulerPriorities";
import {
  scheduleSyncCallback,
  getCurrentPriorityLevel,
  runWithPriority,
  NoPriority,
  scheduleCallback,
  flushSyncCallbackQueue,
} from "./SchedulerWithReactIntegration";
import { enableSchedulerTracing, enableProfilerTimer } from "react-study/shared/ReactFeatureFlags";
import { __interactionsRef, __subscriberRef } from "react-study/scheduler/tracing";
import {
  commitPassiveHookEffects,
  commitBeforeMutationLifeCycles as commitBeforeMutationEffectOnFiber,
  commitResetTextContent,
  commitDetachRef,
  commitPlacement,
} from "./ReactFiberCommitWork";
import { HostRoot, ClassComponent } from "react-study/shared/ReactWorkTags";
import { createCapturedValue } from "./ReactCapturedValue";
import { createRootErrorUpdate, createClassErrorUpdate } from "./ReactFiberThrow";
import { enqueueUpdate } from "./ReactUpdateQueue";
import {
  startCommitTimer,
  startCommitSnapshotEffectsTimer,
  recordEffect,
  stopCommitSnapshotEffectsTimer,
  startCommitHostEffectsTimer,
} from "./ReactDebugFiberPerf";
import { PerformedWork, Snapshot, Passive, ContentReset, Placement, Update, Deletion, Hydrating, PlacementAndUpdate, HydratingAndUpdate } from "react-study/shared/ReactSideEffectTags";
import ReactCurrentOwner from "react-study/react/src/ReactCurrentOwner";
import {
  prepareForCommit,
} from "./ReactFiberHostConfig";
import { NoEffect } from "./ReactHookEffectTags";
import {
  setCurrentFiber as setCurrentDebugFiberInDev,
  resetCurrentFiber as resetCurrentDebugFiberInDEV,
} from './ReactCurrentFiber';
import { recordCommitTime } from "./ReactProfilerTimer";


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

let nextEffect = null;
let hasUncaughtError = false;
let firstUncaughtError = null;
let legacyErrorBoundariesThatAlreadyFailed = null;

let rootDoesHavePassiveEffects = false;
let rootWithPendingPassiveEffects = null;
let pendingPassiveEffectsRenderPriority = NoPriority;
let pendingPassiveEffectsExpirationTime = NoWork;



/**
 * - 这被分成一个单独的函数，这样我们就可以用挂起的工作标记一个fiber，而不将其视为源自事件的典型更新；例如，重试一个挂起的边界不是一个更新，但它确实会安排纤程上的工作。
 */
function markUpdateTimeFromFiberToRoot(fiber, expirationTime) {
  if (fiber.expirationTime < expirationTime) {
    fiber.expirationTime = expirationTime;
  }
  let alternate = fiber.alternate;
  if (alternate !== null && alternate.expirationTime < expirationTime) {
    alternate.expirationTime = expirationTime;
  }

  // 将父路径移动到根目录并更新子到期时间。
  let node = fiber.return;
  let root = null;
  if (node === null && fiber.tag === HostRoot) {
    root = fiber.stateNode;
  } else {
    while (node !== null) {
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

  if (root !== null) {
    if (workInProgressRoot === root) {
      // 接收到正在呈现的树的更新。在这个根上标记为未处理的工作。
      markUnprocessedUpdateTime(expirationTime);

      if (workInProgressRootExitStatus === RootSuspendedWithDelay) {
        // 根已被延迟挂起，这意味着此呈现肯定不会完成。既然我们有了一个新的更新，就在标记传入的更新之前，现在将其标记为挂起。这会中断当前呈现并切换到更新。
        markRootSuspendedAtTime(root, renderExpirationTime);
      }
    }
    // 标记root有一个等待的更新
    markRootUpdatedAtTime(root, expirationTime);
  }

  return root;
}


/**
 * - 使用此函数为fiberRoot安排任务。每个fiberRoot只有一个任务；
 * - 如果任务已经被调度，我们将检查，以确保现有任务的到期时间与fiberRoot所工作的下一个到期时间相同
 * - 这个函数在每次更新之前调用，并且在退出任务之前就被调用
 * @param {*} root FiberRoot
 */
function ensureRootIsScheduled(root) {
  const lastExpiredTime = root.lastExpiredTime;
  if (lastExpiredTime !== NoWork) {
    // 特殊情况：过期的任务应同步刷新
    root.callbackExpirationTime = Sync;
    root.callbackPriority = ImmediatePriority;
    root.callbackNode = scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root));
  }
}

export function flushRoot(root, expirationTime) {
  markRootExpiredAtTime(root, expirationTime);
  ensureRootIsScheduled(root);
}

// 这是不通过调度程序的同步任务的入口点
function performSyncWorkOnRoot(root) {
  // 检查此根目录上是否有过期的工作。否则，在同步时渲染。
  const lastExpiredTime = root.lastExpiredTime;
  const expirationTime = lastExpiredTime !== NoWork ? lastExpiredTime : Sync;
  if (root.finishedExpirationTime === expirationTime) {
    // 此时已存在挂起的提交。
    commitRoot(root);
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

/**
 * 标记未处理的更新时间
 * @param {ExpirationTime} expirationTime 
 */
export function markUnprocessedUpdateTime(expirationTime) {
  if (expirationTime > workInProgressRootNextUnprocessedUpdateTime) {
    workInProgressRootNextUnprocessedUpdateTime = RootSuspended;
  }
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

  // 更新此根目录上的第一个和最后一个挂起时间。新的第一个等待时间是根纤维上剩下的时间。
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
  }
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
 * commit阶段二：
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
      }
      case PlacementAndUpdate: {

      }
      case Hydrating: {

      }
      case HydratingAndUpdate: {

      }
      case Update: {

      }
      case Deletion: {

      }
    }
  }
}

export function flushPassiveEffects() {
  if (pendingPassiveEffectsRenderPriority !== NoPriority) {
    const priorityLevel = pendingPassiveEffectsRenderPriority > NormalPriority ? NormalPriority : pendingPassiveEffectsRenderPriority;
    pendingPassiveEffectsRenderPriority = NoPriority;
    return runWithPriority(priorityLevel, flushPassiveEffectsImpl);
  }
}

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

function captureCommitPhaseError(sourceFiber, error) {
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

// 计算线程id
function computedThreadID(root, expirationTime) {
  // 每个根和过期时间的交互线程都是唯一的。
  return expirationTime * 1000 + root.interactionThreadID;
}

/**
 * 
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
      const threadID = computedThreadID(root, expirationTime);
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
      const threadID = computedThreadID(root, committedExpirationTime);
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