import {
  __interactionsRef, __subscriberRef
} from '../../scheduler/tracing';
import {
  unstable_getCurrentPriorityLevel as getCurrentPriorityLevel,
  unstable_ImmediatePriority as ImmediatePriority,
  unstable_UserBlockingPriority as UserBlockingPriority,
  unstable_NormalPriority as NormalPriority,
  unstable_LowPriority as LowPriority,
  unstable_IdlePriority as IdlePriority,
} from '../../scheduler';
import {
  now,
  noTimeout,
  cancelPassiveEffects,
} from './ReactFiberHostConfig';
import {
  markPendingPriorityLevel,
} from './ReactFiberPendingPriority';
import {
  ClassComponent,
} from '../../shared/ReactWorkTags';
import {
  enableSchedulerTracing
} from '../../shared/ReactFeatureFlags';
import ReactSharedInternals from '../../shared/ReactSharedInternals';
import {
  recordScheduleUpdate,
  startWorkLoopTimer,
  startWorkTimer,
} from './ReactDebugFiberPerf';
import {
  createWorkInProgress,
} from './ReactFiber';
import {
  NoWork,
  Sync,
  Never,
  msToExpirationTime,
  computeInteractiveExpiration,
} from './ReactFiberExpirationTime';
import { ConcurrentMode, NoContext } from './ReactTypeOfMode';
import { unwindInterruptedWork } from './ReactFiberUnwindWork';
import { ContextOnlyDispatcher } from './ReactFiberHooks';

const { ReactCurrentDispatcher, ReactCurrentOwner } = ReactSharedInternals;

let isWorking      = false;

// 正在开展的下一项正在进行的工作
let nextUnitOfWork = null; // Fiber | null
let nextRoot       = null; // FiberRoot | null
// 当前渲染工作的时间
let nextRenderExpirationTime    = NoWorkl // ExpirationTime
let nextLatestAbsoluteTimeoutMs = -1;
let nextRenderDidError          = false;

// 下一在提交中产生effect的fiber
let nextEffect                  = null;

let isCommitting                = false;
let passiveEffectCallbackHandle = null;
let passiveEffectCallback       = null; // 消极的副作用回调？

// 当前渲染工作的时间
let nextRenderExpirationTime = NoWork;

// 用于性能跟踪 Fiber | null
let interruptedBy = null;

function flushPassiveEffects() {
  if (passiveEffectCallbackHandle !== null) {
    cancelPassiveEffects(passiveEffectCallbackHandle);
  }
  if (passiveEffectCallback !== null) {
    // 调用scheduled的callback，而不是直接调用commitpassiveeffects，确保正常更新
    passiveEffectCallback();
  }
}

function resetStack() {
  if (nextUnitOfWork !== null) {
    // TODO
  }

  nextRoot = null;
  nextRenderExpirationTime = NoWork;
  nextLatestAbsoluteTimeoutMs = -1;
  nextRenderDidError = false;
  nextUnitOfWork = null;
}

/**
 * 执行工作单元
 * @param {Fiber} workInProgress 
 * @returns {Fiber}
 */
function performUnitOfWork(workInProgress) {
  // The current, flushed, state of the fiber is the alternate
  // 理想情况下， 不应该依赖于此，但是依赖于此意味者我们不需要对正在进行的工作进行额外的研究
  const current = workInProgress.alternate;

  // 看看开始这项工作是否会产生更多的工作
  startWorkTimer(workInProgress);
}

function workLoop(isYieldy) {
  if (!isYieldy) {
    while (nextUnitOfWork !== null) {
      nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    }
  } else {
    // TODO
  }
}


/**
 * 
 * @param {FiberRoot} root 
 * @param {Boolean} isYieldy 
 */
function renderRoot(root, isYieldy) {
  flushPassiveEffects();

  isWorking = true;
  const previousDispatcher = ReactCurrentDispatcher.current;
  ReactCurrentDispatcher.current = ContextOnlyDispatcher;
  
  const expirationTime = root.nextExpirationTimeToWorkOn;

  // 检查是否从一个新的堆栈开始，或者是否从以前生成的工作中恢复。
  if (
    expirationTime !== nextRenderExpirationTime ||
    root !== nextRoot ||
    nextUnitOfWork === null
  ) {
    // 重置堆栈，从root开始工作
    resetStack();
    nextRoot = root;
    nextRenderExpirationTime = expirationTime;
    nextUnitOfWork = createWorkInProgress(next.current, null, nextRenderExpirationTime);
    root.pendingCommitExpirationTime = NoWork;

    if (enableSchedulerTracing) {
      // 确定这批工作当前包括哪些交互，以便我们可以准确地确定花在它上面的时间，并将在render节点触发的级联工作与之关联
      const interactions = new Set();
      root.pendingInteractionMap.forEach((scheduledInteractions, scheduledExpirationTime) => {
        if (scheduledExpirationTime >= expirationTime) {
          scheduledInteractions.forEach(interaction => interactions.add(interaction));
        }
      });

      // 把当前的interactions存储在FiberRoot上，原因如下：
      // 我们可以在renderRoot()这样的热函数中重用它，而不需要重新计算它。
      // 我们还将在commitWork()中使用它来传递给任何Profiler onRender()钩子
      // 这还为DevTools提供了在调用onCommitRoot()钩子时访问它的方法。
      root.memoizedInteractions = interactions;

      if (interactions.size > 0) {
        const subscriber = __subscriberRef.current;
        if (subscriber !== null) {
          // TODO
        }
      }
    }
  }

  let prevInteractions = null; // Set<Interactions>
  if (enableSchedulerTracing) {
    prevInteractions = __interactionsRef.current;
    __interactionsRef.current = root.memoizedInteractions;
  }

  let didFatal = false;

  startWorkLoopTimer(nextUnitOfWork);

  do {
    try {
      workLoop(isYieldy);
    } catch (thrownValue) {

    }
  } while (true)
}

/**
 * 计算线程ID
 * @param {ExpirationTime} expirationTime 
 * @param {Number} interactionThreadID 
 * @returns {Number}
 */
function computeThreadID(expirationTime, interactionThreadID) {
  return expirationTime * 100 + interactionThreadID;
}

/**
 * 计算Fiber有效期
 * @param {ExpirationTime} currentTime 
 * @param {Fiber} fiber 
 */
function computeExpirationForFiber(currentTime, fiber) {
  const priorityLevel = getCurrentPriorityLevel(); // 获取当前的优先级
  
  let expirationTime;
  if ((fiber.mode & ConcurrentMode) === NoContext) {
    // 并发情况之外，更新总是同步的
    expirationTime = Sync;
  } else if (isWorking && !isCommitting) {
    // 在render阶段，更新将在当前render期间内过期。
    expirationTime = nextRenderExpirationTime;
  } else {
    // 在正常情况下，根据优先级不同，决定过期时间
    switch (priorityLevel) {
      case ImmediatePriority: // 优先级为立即，则同步更新
        expirationTime = Sync;
        break;
      case UserBlockingPriority: // 优先级为用户阻塞
        expirationTime = computeInteractiveExpiration(currentTime);
        break;
      case LowPriority:
      case IdlePriority:
        expirationTime = Never;
        break;
      default:
        console.warn('未知优先级')
    }
  }
  // 如果我们正在渲染一个树，不要在渲染中的有效时间内更新
  if (nextRoot !== null && expirationTime === nextRenderExpirationTime) {
    expirationTime = -1;
  }

  // 跟踪最低待处理的交互式到期时间，这允许我们在需要时同步刷新所有交互式的更新。
  if (
    priorityLevel === UserBlockingPriority &&
    (
      lowestPriorityPendingInteractiveExpirationTime === NoWork || expirationTime < lowestPriorityPendingInteractiveExpirationTime
    )
  ) {
    lowestPriorityPendingInteractiveExpirationTime = expirationTime;
  }
  
  return expirationTime;
}


/**
 * 
 * @param {Fiber} fiber 
 * @param {ExpirationTime} expirationTime 
 * @returns {FiberRoot | null}
 */
function scheduleWorkToRoot(fiber, expirationTime) {
  recordScheduleUpdate();

  if (__DEV__) {
    if (fiber.tag === ClassComponent) {
      const instance = fiber.stateNode;
    }
  }

  // 更新fiber的过期时间
  if (fiber.expirationTime < expirationTime) {
    fiber.expirationTime = expirationTime;
  }

  let alternate = fiber.alternate;
  if (alternate !== null && alternate.expirationTime < expirationTime) {
    alternate.expirationTime = expirationTime;
  }

  //将parent路径移动到root，更新child过期时间
  let node = fiber.return;
  let root = null;
  if (node === null && fiber.tag === HostRoot) { // 如果是Root节点
    root = fiber.stateNode;
  } else {
    while(node !== null) {
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

  if (enableSchedulerTracing) {
    if (root !== null) {
      const interactions = __interactionsRef.current;
      if (interactions.size > 0) {
        const pendingInteractionMap = root.pendingInteractionMap;
        const pendingInteractions = pendingInteractions.get(expirationTime);
        if (pendingInteractions != null) {
          interactions.forEach(interaction => {
            if (!pendingInteractions.has(interaction)) {
              // Update the pending async work count for previously unscheduled interaction.
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
          const threadID = computeThreadID(expirationTime, root.interactionThreadID);
          subscriber.onWorkScheduled(interactions, threadID);
        }
      }
    }
  }
  return root;
}


/**
 * 
 * @param {Fiber} fiber 
 * @param {ExpirationTime} expirationTime 
 */
function scheduleWork(fiber, expirationTime) {
  const root = scheduleWorkToRoot(fiber, expirationTime);
  if (root === null) {
    if (__DEV__) {
      //...
    }
    return;
  }

  if (!isWorking && nextRenderExpirationTime !== NoWork && expirationTime > nextRenderExpirationTime) {
    //TODO 这是一种干扰（用于性能追踪）
    interruptedBy = fiber;
    resetStack();
  }

  markPendingPriorityLevel(root, expirationTime);
  // 如果在渲染阶段，我们不需要为更新安排到root，因为我们将会在退出前进行
  if (!isWorking || isCommitting || nextRoot !== root) {
    const rootExpirationTime = root.expirationTime;
    requestWork(root, rootExpirationTime);
  }

}

let firstScheduledRoot        = null; // FiberRoot | null;
let lastScheduledRoot         = null; // 最后调度器的root FiberRoot | null

let nextFlushedRoot           = null; // FiberRoot | null
let nextFlushedExpirationTime = NoWork; // ExpiationTime
let lowestPriorityPendingInteractiveExpirationTime = NoWork;


let isRendering               = false; // 是否正在渲染

let isBatchingUpdates         = false; // 批量更新
let isUnbatchingUpdates       = false; // 非批量更新

let originalStartTimeMs       = now(); // 最初的开始时间
let currentRendererTime       = msToExpirationTime(originalStartTimeMs);
let currentSchedulerTime      = currentRendererTime; // 当前调度器时间


/**
 * 重新计算当前渲染器时间
 */
function recomputeCurrentRendererTime() {
  const currentTimeMs = now() - originalStartTimeMs;
  currentRendererTime = msToExpirationTime(currentTimeMs);
}

/**
 * 调度程序调用requestCurrentTime来计算到期时间
 * 通过添加到当前时间（开始时间）来计算到期时间。但是，如果在同一事件中安排了两次更新，我们应该将它们的开始时间视为同时进行的，即使实际的时间在第一次和第二次调用之间已经提前
 * 换句话说，由于到期时间决定了批量更新的方式，因此所以我们希望在相同事件中发生的所有具有相同优先级的更新都接收相同的过期时间。
 * 我们跟踪两个独立的时间：当前的“渲染器”时间和当前的“调度程序”时间，渲染器时间可以随时更新；它的存在只是为了最小化调用的性能
 * 但是，调度器时间只能在没有挂起的工作或者我们确定没有处于事件中时更新。
 */
function requestCurrentTime() {
  if (isRendering) {
    // 在渲染中，返回最新读取的时间。
    return currentRendererTime;
  }
  // 检查是否有未完成的工作
  findHighestPriorityRoot();
  if (nextFlushedExpirationTime === NoWork || nextFlushedExpirationTime === Never) {
    // 如果没有待处理的工作，或者待处理的工作在屏幕外，我们可以在没有撕裂风险的情况下读取当前时间。
    recomputeCurrentRendererTime();
    currentSchedulerTime = currentRendererTime; // 把当前调度器时间设置为当前渲染器时间
    return currentSchedulerTime;
  }
  // 已经有待处理的工作。我们可能正在进行浏览器事件。如果我们读取当前事件，它可能会导致同一事件中的多个更新接收不同的过期时间，从而导致撕裂。返回上次读取时间。在下次空闲回调期间，时间将被更新。
  return currentSchedulerTime;

}

/**
 * 每当root接受到一个更新，就会调用requestWork。在将来的某个时候，renderer会调用renderRoot
 * @param {FiberRoot} root 
 * @param {ExpirationTime} expirationTime 
 */
function requestWork(root, expirationTime) {
  addRootToSchedule(root, expirationTime);
  if (isRendering) {
    // 防止再次进入，剩余工作将安排在当前渲染批处理的末尾
    return;
  }

  if (isBatchingUpdates) {
    // 在批处理结束时冲洗工作
    if (isUnbatchingUpdates) {
      nextFlushedRoot = root;
      nextFlushedExpirationTime = Sync;
      performWorkOnRoot(root, Sync, false);
    }
    return;
  }

  if (expirationTime === Sync) {
    performSyncWork();
  } else {
    // TODO
  }
}

/**
 * 把fiberRoot添加到schedule
 * @param {FiberRoot} root 
 * @param {ExpirationTime} expirationTime 
 */
function addRootToSchedule(root, expirationTime) {
  // 检查root是否已是schedule的一部分
  if (root.nextScheduledRoot === null) {
    // root是没有被安排计划的，添加它
    root.expirationTime = expirationTime;
    if (lastScheduledRoot === null) {
      firstScheduledRoot = lastScheduledRoot = root;
      root.nextScheduledRoot = root;
    } else {
      lastScheduledRoot.nextScheduledRoot = root;
      lastScheduledRoot = root;
      lastScheduledRoot.nextScheduledRoot = firstScheduledRoot;
    }
  } else {
    // root已经呗安排计划，但是它的优先级可能要增加
    const remainingExpirationTime = root.expirationTime;
    if (expirationTime > remainingExpirationTime) {
      // 更新优先级
      root.expirationTime = expirationTime;
    }
  }
}

/**
 * 找到最高优先级的root
 */
function findHighestPriorityRoot() {
  let highestPriorityWork = NoWork;
  let highestPriorityRoot = null;
  if (lastScheduledRoot !== null) {
    let previousScheduledRoot = lastScheduledRoot;
    let root = firstScheduledRoot;
    while (root !== null) {
      const remainingExpirationTime = root.expirationTime;
      if (remainingExpirationTime === NoWork) {
        // 这个root不再工作了。把它从scheduler中移除
        if (root === root.nextScheduledRoot) {
          // 列表中只有一个root
          root.nextScheduledRoot = null;
          firstScheduledRoot = lastScheduledRoot = null;
          break;
        } else if (root === firstScheduledRoot) {
          // 列表中第一个root
          const next = root.nextScheduledRoot;
          firstScheduledRoot = next;
          lastScheduledRoot.nextScheduledRoot = next;
          root.nextScheduledRoot = null;
          break;
        } else {
          previousScheduledRoot.nextScheduledRoot = root.nextScheduledRoot;
          root.nextScheduledRoot = null;
        }
        root = previousScheduledRoot.nextScheduledRoot;
      } else {
        if (remainingExpirationTime > highestPriorityWork) {
          // 更新优先级到更高
          highestPriorityWork = remainingExpirationTime;
          highestPriorityRoot = root;
        }
        if (root === lastScheduledRoot) {
          break;
        }
        if (highestPriorityWork === Sync) {
          // 根据定义Sync是最高优先级，因此可以停止搜索
          break;
        }

        previousScheduledRoot = root;
        root = root.nextScheduledRoot;
      }
    }
  }
  nextFlushedRoot = highestPriorityRoot;
  nextFlushedExpirationTime = highestPriorityWork;
}

/**
 * unbatchedUpdates<A, R> 批处理应该在渲染器级别实现，而不是在协调器内部。
 * 
 * 
 * @param {Function} fn (a: A) => R
 * @param {*} a
 * @returns R
 */
function unbatchedUpdates(fn, a) {
  if (isBatchingUpdates && !isUnbatchingUpdates) { // 如果是批量更新，并且非批量更新为false
    isUnbatchingUpdates = true; // 批量更新设为true
    try {
      return fn(a); // 执行fn，这里注意try 与finally的关系，先执行fn()，return前将isUnbatchingUpdates设为false
    } finally {
      isUnbatchingUpdates = false; // 非批量更新设为false
    }
  }
  return fn(a);
}

/**
 * TODO
 * @param {FiberRoot} root 
 * @param {ExpirationTime} expirationTime 
 * @param {Boolean} isYieldy 
 */
function performWorkOnRoot(root, expirationTime, isYieldy) {
  isRendering = true;

  // 检查是同步工作还是异步工作
  if (!isYieldy) {
    // 不断的冲洗工作
    // 非生产性工作并不一定意味着过期的工作。renderer可能希望在不生产的情况下执行一些工作，但也不需要root完成（通过触发placeholders）
    let finishedWork = root.finishedWork;
    if (finishedWork !== null) {
      // TODO
    } else {
      root.finishedWork = null;
      // 如果这个root以前挂起，清除它现有的超时，因为我们将再次尝试render
      const timeoutHandle = root.timeoutHandle;
      if (timeoutHandle !== noTimeout) {
        // TODO
      }
      renderRoot(root, isYieldy);
    }
  } else {
    // TODO
  }
}

function performSyncWork() {
  performWork(Sync, false);
}


function performWork(minExpirationTime, isYieldy) {
  // 继续在root上工作，直到没有更多工作，或者有更高优先级的时间。
  findHighestPriorityRoot();

  if (isYieldy) {
    // TODO
  } else {
    while(
      nextFlushedRoot !== null &&
      nextFlushedExpirationTime !== NoWork &&
      minExpirationTime <= nextFlushedExpirationTime
    ) {
      performWorkOnRoot(nextFlushedRoot, nextFlushedExpirationTime, false);
    }
  }
}

export {
  computeExpirationForFiber,
  unbatchedUpdates,
  requestCurrentTime,
  flushPassiveEffects,
  scheduleWork,
};