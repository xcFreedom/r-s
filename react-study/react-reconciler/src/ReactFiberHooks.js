import { readContext } from './ReactFiberNewContext';
import ReactCurrentDispatcher from 'react-study/react/src/ReactCurrentDispatcher';
import {
  NoWork,
} from './ReactFiberExpirationTime';
import { requestCurrentTimeForUpdate, computeExpirationForFiber, scheduleWork, markUnprocessedUpdateTime, markRenderEventTimeAndConfig } from './ReactFiberWorkLoop';
import { requestCurrentSuspenseConfig } from './ReactFiberSuspenseConfig';
import is from '../../shared/objectIs';
import { markWorkInProgressReceivedUpdate } from './ReactFiberBeginWork';
import {
  NoEffect as NoHookEffect, UnmountPassive, MountPassive, UnmountMutation, MountLayout,
} from './ReactHookEffectTags';
import {
  Update as UpdateEffect,
  Passive as PassiveEffect,
} from '../../shared/ReactSideEffectTags';
import * as Scheduler from '../../scheduler';
import ReactCurrentBatchConfig from 'react-study/react/src/ReactCurrentBatchConfig';

/**
 * 
 */

// 这些是在调用组件之前设置的。
let renderExpirationTime = NoWork;
// work-in-progress fiber。去了不同的名字，以区别work-in-prorgess hook
let currentlyRenderingFiber = null

// hooks作为链表存储在fiber的memoizedState字段中。
// 当前hooks列表是属于当前fiber的列表
// 在work-in-progress的hook列表是一个新的列表，将添加到work-in-progress fiber
let currentHook = null; // Hook
let nextCurrentHook = null; // Hook
let firstWorkInProgressHook = null; // Hook
let workInProgressHook = null; // Hook
let nextWorkInProgressHook = null; // Hook

let remainingExpirationTime = NoWork; // ExpirationTime
let componentUpdateQueue = null; // FunctionComponentUpdateQueue
let sideEffectTag = 0; // SideEffectTag

// 渲染期间计划的更新将在当前过程结束时出发立即re-render。
// 我们无法将这些更新存储在正常队列中，因为如果工作中止，则应将其丢弃。
// 因为这事一个相对罕见的情况，所以我们也不想在hook或queue对象类型中添加额外的字段
// 因此，我们将他们存储在 queue -> render-phase updates的map中，一旦组件完成而没有重新render，这些更新就会被丢弃，

// 是否在当前执行的render过程中计划了更新。
let didScheduleRenderPhaseUpdate = false;
// 延迟创建的render阶段的更新映射
let renderPhaseUpdates = null; // Map<UpdateQueue, Update>

// 防止无限循环的计数器
let numberOfReRenders = 0;
const RE_RENDER_LIMIT = 25;

// 在DEV中，这是当前正在执行的基元钩子的名称
let currentHookNameInDev = null;

//在DEV中，这个列表确保在呈现之间以相同的顺序调用钩子。
// 该列表存储初始呈现（挂载）期间使用的挂钩的顺序。
// 后续渲染（更新）引用此列表。
let hookTypesDev = null;
let hookTypesUpdateIndexDev = -1;

//在DEV中，它跟踪当前呈现组件是否需要忽略需要它们的钩子的依赖项（例如useffect或usemo）。如果是真的，这样的钩子将永远被“重新安装”。仅在热装期间使用。
let ignorePreviousDependencies = false;

function throwInvalidHookError() {
  console.error('Hooks can only be called inside the body of a function component.')
}

function areHookInputsEqual(nextDeps, prevDeps) {
  if (prevDeps === null) {
    return false;
  }
  for (let i = 0; i < prevDeps.length && i < nextDeps.length; i++) {
    if (is(nextDeps[i], prevDeps[i])) {
      continue;
    }
    return false;
  }
  return true;
}

/**
 * render过程，改变hook的执行函数
 * @param {Fiber} current 
 * @param {Fiber} workInProgress 
 * @param {any} Component 
 * @param {any} props 
 * @param {any} refOrContext 
 * @param {ExpirationTime} nextRenderExpirationTime 
 */
export function renderWithHooks(current, workInProgress, Component, props, refOrContext, nextRenderExpirationTime) {
  // 
  renderExpirationTime = nextRenderExpirationTime;
  currentlyRenderingFiber = workInProgress;
  nextCurrentHook = current !== null ? current.memoizedState : null;

  // 使用nextCurrentHook区分mount/update
  // 只有在至少使用一个有状态钩子的情况下才有效。
  // 非状态钩子（例如上下文）不会添加到memoizedState，
  // 因此在更新和装载期间，nextCurrentHook将为空。

  ReactCurrentDispatcher.current = nextCurrentHook === null ? HooksDispatcherOnMount : HooksDispatcherOnUpdate;

  let children = Component(props, refOrContext);

  if (didScheduleRenderPhaseUpdate) {
    do {
      didScheduleRenderPhaseUpdate = false;
      numberOfReRenders += 1;

      // 从头开始
      nextCurrentHook = current !== null ? current.memoizedState : null;
      nextWorkInProgressHook = firstWorkInProgressHook;

      currentHook = null;
      workInProgressHook = null;
      componentUpdateQueue = null;

      ReactCurrentDispatcher.current = HooksDispatcherOnUpdate;

      children = Component(props, refOrContext);
    } while (didScheduleRenderPhaseUpdate);

    renderPhaseUpdates = null;
    numberOfReRenders = 0;

  }

  // 我们可以假设上一个dispatcher始终是这个dispatcher
  // 因为我们在render阶段的开始设置它，并且不存在重进入。
  ReactCurrentDispatcher.current = ContextOnlyDispatcher;

  const renderedWork = currentlyRenderingFiber;

  renderedWork.memoizedState = firstWorkInProgressHook;
  renderedWork.expirationTime = remainingExpirationTime;
  renderedWork.updateQueue = componentUpdateQueue;
  renderedWork.effectTag |= sideEffectTag;

  const didRenderTooFewHooks = currentHook !== null && currentHook.next !== null;

  renderExpirationTime = NoWork;
  currentlyRenderingFiber = null;

  currentHook == null;
  nextCurrentHook = null;
  firstWorkInProgressHook = null;
  workInProgressHook = null;
  nextWorkInProgressHook = null;

  remainingExpirationTime = NoWork;
  componentUpdateQueue = null;
  sideEffectTag = 0;

  return children;
}

export function resetHooks() {
  // 我们可以假设上一个Dispatcher始终是这个Dispatcher
  // 因为我们在render阶段的开始设置它，并且不存在重进入。
  ReactCurrentDispatcher.current = ContextOnlyDispatcher;

  // 这用于在组件抛出时重置此模块的状态。如果我们确定组件是模块式组件，它也被称为内部 mountIndeterminateComponent( 安装不确定组件)。

  renderExpirationTime = NoWork;
  currentlyRenderingFiber = null;

  currentHook = null;
  nextCurrentHook = null;
  firstWorkInProgressHook = null;
  workInProgressHook = null;
  nextWorkInProgressHook = null;

  remainingExpirationTime = NoWork;
  componentUpdateQueue = null;
  sideEffectTag = 0;

  didScheduleRenderPhaseUpdate = false;
  renderPhaseUpdates = null;
  numberOfReRenders = 0;
}

/**
 * mount阶段创建hook
 * @returns {Hook}
 */
function mountWorkInProgressHook() {
  const hook = {
    memoizedState: null,
    baseState: null,
    queue: null,
    baseUpdate: null,
    next: null,
  };

  if (workInProgressHook === null) {
    // list中的第一个hook
    firstWorkInProgressHook = workInProgressHook = hook;
  } else {
    // 添加到末尾
    workInProgressHook = workInProgressHook.next = hook;
  }

  return workInProgressHook;
}

/**
 * 更新阶段的hook
 * 此函数用于更新和由render阶段更新触发的re-render，
 * 它假设有一个当前的hook可以克隆，或者有一个work-in-progress hook可以从以前的渲染过程中用作base
 * 当我们遍历到base list的末尾时，必须切换到用于mount的dispatcher
 * @returns {Hook}
 */
function updateWorkInProgressHook() {
  if (nextWorkInProgressHook !== null) {
    // 已经有一个work-in-progress，再利用它
    workInProgressHook = nextWorkInProgressHook;
    nextWorkInProgressHook = workInProgressHook.next;

    currentHook = nextCurrentHook;
    nextCurrentHook = currentHook !== null ? currentHook.next : null;
  } else {
    // 从current hook克隆
    currentHook = nextCurrentHook;
    const newHook = {
      memoizedState: currentHook.memoizedState,

      baseState: currentHook.baseState,
      queue: currentHook.queue,

      next: null,
    };

    if (workInProgressHook === null) {
      workInProgressHook = firstWorkInProgressHook = newHook;
    } else {
      workInProgressHook = workInProgressHook.next = newHook;
    }
    nextCurrentHook = currentHook.next;
  }
  return workInProgressHook;
}

/**
 * @returns {FunctionComponentUpdateQueue}
 */
function createFunctionComponentUpdateQueue() {
  return {
    lastEffect: null,
  };
}


function basicStateReducer(state, action) {
  return typeof action === 'function' ? action(state) : action;
}

// mount阶段的useReducer
function mountReducer(reducer, initialArg, init) {
  // 新建一个hook，添加到workInProgressHook末尾
  const hook = mountWorkInProgressHook();
  // 计算初始state
  let initialState;
  if (init !== undefined) {
    initialState = init(initialArg);
  } else {
    initialState = initialArg;
  }

  // 挂在初始state到hook上
  hook.memoizedState = hook.baseState = initialState;

  // 创建更新queue
  const queue = (hook.queue = {
    last: null,
    dispatch: null,
    lastRenderedReducer: reducer,
    lastRenderedState: initialState,
  });
  // 绑定dispatch的fiber和queue
  const dispatch = (queue.dispatch = (dispatchAction.bind(
    null,
    currentlyRenderingFiber,
    queue,
  )));
  // 返回state与dispatch
  return [hook.memoizedState, dispatch];
}

// 更新阶段的useReducer
function updateReducer(reducer, initialArg, init) {
  const hook = updateWorkInProgressHook();
  const queue = hook.queue;
  
  queue.lastRenderedReducer = reducer;

  if (numberOfReRenders > 0) {
    // 这是re-render，将新的render阶段更新应用与上一个work-in-progress hook
    const dispatch = queue.dispatch;
    if (renderPhaseUpdates !== null) {
      // renderPhaseUpdate是queue -> update链表的map
      const firstRenderPhaseUpdate = renderPhaseUpdates.get(queue);
      if (firstRenderPhaseUpdate !== undefined) {
        renderPhaseUpdates.delete(queue);
        let newState = hook.memoizedState;
        let update = firstRenderPhaseUpdate;
        do {
          // 处理此渲染阶段更新。我们不必检查优先级，因为它将始终与当前渲染的优先级相同。
          const action = update.action;
          newState = reducer(newState, action);
          update = update.next;
        } while (update !== null);

        // 标记fiber已工作，但前提是新状态与当前状态不同
        if (!is(newState, hook.memoizedState)) {
          markWorkInProgressReceivedUpdate();
        }

        hook.memoizedState = newState;

        // 除非队列为空，否则不要将从render阶段更新累积的状态保持为基本状态。
        if (hook.baseUpdate === queue.last) {
          hook.baseState = newState;
        }

        queue.lastRenderedState = newState;
        return [newState, dispatch];
      }
    }
    return [hook.memoizedState, dispatch];
  }

  // 队列里最后一次更新
  const last = queue.last;
  // 最后一次更新作为base state的一部分
  const baseUpdate = hook.baseUpdate;
  const baseState = hook.baseState;

  let first;
  if (baseUpdate !== null) {
    if (last !== null) {
      // 对于第一次更新，队列是一个循环链表，其中`queue.last.next = queue.first`
      // 一旦第一个更新提交，并且baseUpdate不再为空，我们就可以解开链表
      last.next = null;
    }
    first = baseUpdate.next;
  } else {
    first = last !== null ? last.next : null;
  }

  if (first !== null) {
    let newState = baseState;
    let newBaseState = null;
    let newBaseUpdate = null;
    let prevUpdate = baseUpdate;
    let update = first;
    let didSkip = false;
    do {
      const updateExpirationTime = update.expirationTime;
      if (updateExpirationTime < renderExpirationTime) {
        // 优先级不足，跳过此更新。
        // 如果这是第一个跳过的更新，则上一个update/state是新的baseUpdate/baseState
        // 当存在update优先级不足的情况时，记录第一个优先级不足的update
        // 最后更新hook的baseUpdate/baseState
        // 等到下次调度开始时，从这个update开始
        if (!didSkip) {
          didSkip = true;
          newBaseUpdate = prevUpdate;
          newBaseState = newState;
        }

        // 更新 队列中还需处理的优先级。
        if (updateExpirationTime > remainingExpirationTime) {
          remainingExpirationTime = updateExpirationTime;
          markUnprocessedUpdateTime(remainingExpirationTime);
        }
      } else {
        // 这个更新具有足够的优先级
        markRenderEventTimeAndConfig(update.expirationTime, update.suspenseConfig);

        // 处理此更新
        if (update.eagerReducer === reducer) {
          // mountReducer时候可能会计算过state
          newState = update.eagerState;
        } else {
          // 计算新的state
          const action = update.action;
          newState = reducer(newState, action);
        }
      }
      prevUpdate = update;
      update = update.next;
    } while (update !== null && update !== first);

    if (!didSkip) {
      newBaseUpdate = prevUpdate;
      newBaseState = newState;
    }

    if (!is(newState. hook.memoizedState)) {
      markWorkInProgressReceivedUpdate();
    }

    // 更新最新state
    hook.memoizedState = newState;
    hook.baseUpdate = newBaseUpdate;
    hook.baseState = newBaseState;

    // 更新queue上的state
    queue.lastRenderedState = newState;
  }

  const dispatch = queue.dispatch;
  return [hook.memoizedState, dispatch];
}

// mount阶段的useState
function mountState(initialState) {
  const hook = mountWorkInProgressHook();
  if (typeof initialState === 'function') {
    initialState = initialState();
  }
  hook.memoizedState = hook.baseState = initialState;
  const queue = (hook.queue = {
    last: null,
    dispatch: null,
    lastRenderedReducer: basicStateReducer,
    lastRenderedState: initialState,
  });
  const dispatch = (queue.dispatch = dispatchAction.bind(
    null,
    currentlyRenderingFiber,
    queue,
  ));
  return [hook.memoizedState, dispatch];
}

// update阶段的useState
function updateState(initialState) {
  return updateReducer(basicStateReducer, initialState);
}

// mount阶段的useRef
function mountRef(initialValue) {
  const hook = mountWorkInProgressHook();
  const ref = { current: initialValue };
  hook.memoizedState = ref;
  return ref;
}

// update阶段的useRef，这也是useRef可以保存可变值的原因
function updateRef(initialValue) {
  const hook = updateWorkInProgressHook();
  return hook.memoizedState;
}

function pushEffect(tag, create, destory, deps) {
  const effect = {
    tag,
    create,
    destory,
    deps,
    next: null,
  };
  if (componentUpdateQueue === null) {
    componentUpdateQueue = createFunctionComponentUpdateQueue();
    componentUpdateQueue.lastEffect = effect.next = effect;
  } else {
    const lastEffect = componentUpdateQueue.lastEffect;
    if (lastEffect === null) {
      componentUpdateQueue.lastEffect = effect.next = effect;
    } else {
      const firstEffect = lastEffect.next;
      lastEffect.next = effect;
      effect.next = firstEffect;
      componentUpdateQueue.lastEffect = effect;
    }
  }
}

function mountEffectImpl(fiberEffectTag, hookEffectTag, create, deps) {
  const hook = mountWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  sideEffectTag |= fiberEffectTag;
  hook.memoizedState = pushEffect(hookEffectTag, create, undefined, nextDeps);
}

function updateEffectImpl(fiberEffectTag, hookEffectTag, create, deps) {
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  let destory = undefined;

  if (currentHook !== null) {
    const prevEffect = currentHook.memoizedState;
    destory = prevEffect.destory;
    if (nextDeps !== null) {
      const prevDeps = prevEffect.deps;
      if (areHookInputsEqual(nextDeps, prevDeps)) {
        pushEffect(NoHookEffect, create, destory, nextDeps);
        return;
      }
    }
  }

  sideEffectTag |= fiberEffectTag;
  hook.memoizedState = pushEffect(hookEffectTag, create, destory, nextDeps);
}

// mount阶段的useEffect
function mountEffect(create, deps) {
  return mountEffectImpl(
    UpdateEffect | PassiveEffect, // 这里为什么这样设置fiberEffectTag
    UnmountPassive | MountPassive, // 为什么这样设置hookEffectTag
    create,
    deps,
  );
}

function updateEffect(create, deps) {
  return updateEffectImpl(
    UpdateEffect | PassiveEffect,
    UnmountPassive | MountPassive,
    create,
    deps,
  );
}

function mountLayoutEffect(create, deps) {
  return mountEffectImpl(
    UpdateEffect,
    UnmountMutation | MountLayout,
    create,
    deps,
  );
}

function updateLayoutEffect(create, deps) {
  return updateEffectImpl(
    UpdateEffect,
    UnmountMutation | MountLayout,
    create,
    deps,
  );
}

function imperativeHandleEffect(create, ref) {
  if (typeof ref === 'function') {
    const refCallback = ref;
    const inst = create();
    refCallback(inst);
    return () => {
      refCallback(null);
    };
  } else if (ref !== null && ref !== undefined) {
    const refObject = ref;
    const inst = create();
    refObject.current = inst;
    return () => {
      refObject.current = null;
    };
  }
}

function mountImperativeHandle(ref, create, deps) {
  const effectDeps = deps !== null && deps !== undefined ? deps.concat([ref]) : null;
  return mountEffectImpl(
    UpdateEffect,
    UnmountMutation | MountLayout,
    imperativeHandleEffect.bind(null, create, ref),
    effectDeps,
  );
}

function updateImperativeHandle(ref, create, deps) {
  const effectDeps = deps !== null && deps !== undefined ? deps.concat([ref]) : null;
  return updateEffectImpl(
    UpdateEffect,
    UnmountMutation | MountLayout,
    imperativeHandleEffect.bind(null, create, ref),
    effectDeps,
  );
}

function mountCallback(callback, deps) {
  const hook = mountWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  hook.memoizedState = [callback, nextDeps];
  return hook.memoizedState;
}

function updateCallback(callback, deps) {
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  const prevState = hook.memoizedState;
  if (prevState !== null) {
    if (nextDeps !== null) {
      const prevDeps = prevState[1];
      if (areHookInputsEqual(nextDeps, prevDeps)) {
        return prevState[0]
      }
    }
  }
  hook.memoizedState = [callback, nextDeps];
  return callback;
}

function mountMemo(nextCreate, deps) {
  const hook = mountWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  const nextValue = nextCreate();
  hook.memoizedState = [nextValue, nextDeps];
  return nextValue;
}

function updateMemo(nextCreate, deps) {
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  const prevState = hook.memoizedState;
  if (prevState !== null) {
    if (nextDeps !== null) {
      const prevDeps = prevState[1];
      if (areHookInputsEqual(nextDeps, prevDeps)) {
        return prevState[0];
      }
    }
  }
  const nextValue = nextCreate();
  hook.memoizedState = [nextValue, nextDeps];
  return nextValue;
}


function mountDeferredValue(value, config) {
  const [prevValue, setValue] = mountState(value);
  mountEffect(
    () => {
      // 设置优先级
      Scheduler.unstable_next(() => {
        const previousConfig = ReactCurrentBatchConfig.suspense;
        // 将timeoutMs配置填入ReactCurrentBatchConfig变量上保存。
        ReactCurrentBatchConfig.suspense = config === undefined ? null : config;
        try {
          // 调用dispatchAction
          // dispatchAction内获取suspenseConfig，计算expirationTime，然后调度work
          setValue(value);
        } finally {
          ReactCurrentBatchConfig.suspense = previousConfig;
        }
      });
    },
    [value, config],
  );
  return prevValue;
}

function updateDeferredValue(value, config) {
  const [prevValue, setValue] = updateState(value);
  updateEffect(
    () => {
      Scheduler.unstable_next(() => {
        const previousConfig = ReactCurrentBatchConfig.suspense;
        ReactCurrentBatchConfig.suspense = config === undefined ? null : config;
        try {
          setValue(value);
        } finally {
          ReactCurrentBatchConfig.suspense = previousConfig;
        }
      });
    },
    [value, config],
  );
  return prevValue;
}

function mountTransition(config) {
  const [isPending, setPending] = mountState(false);
  const startTransition = mountCallback(callback => {
    setPending(true);
    Scheduler.unstable_next(() => {
      const previousConfig = ReactCurrentBatchConfig.suspense;
      ReactCurrentBatchConfig.suspense = config === undefined ? null : config;
      try {
        setPending(false);
        callback();
      } finally {
        ReactCurrentBatchConfig.suspense = previousConfig;
      }
    });
  }, [config, isPending]);
  return [startTransition, isPending];
}

function updateTransition(config) {
  const [isPending, setPending] = updateState(false);
  const startTransition = updateCallback(
    callback => {
      setPending(true);
      Scheduler.unstable_next(() => {
        const previousConfig = ReactCurrentBatchConfig.suspense;
        ReactCurrentBatchConfig.suspense = config === undefined ? null : config;
        try {
          setPending(false);
          callback();
        } finally {
          ReactCurrentBatchConfig.suspense = previousConfig;
        }
      });
    },
    [config, isPending],
  );
  return [startTransition, isPending];
}

/**
 * 
 * @param {Fiber} fiber 
 * @param {UpdateQueue} queue 
 * @param {*} action 
 */
function dispatchAction(fiber, queue, action) {
  const alternate = fiber.alternate;
  if (
    fiber === currentlyRenderingFiber ||
    (alternate !== null && alternate === currentlyRenderingFiber)
  ) {
    // 这是render阶段update.
    // 把它保存在惰性创建的queue->update list的map中。
    // 在此渲染过程之后，我们将重新启动并在work-in-progress hook的顶部应用此更新
    didScheduleRenderPhaseUpdate = true;
    const update = {
      expirationTime: renderExpirationTime,
      suspenseConfig: null,
      action,
      eagerReducer: null,
      eagerState: null,
      next: null,
    };

    if (renderPhaseUpdates === null) {
      renderPhaseUpdates = new Map();
    }
    const firstRenderPhaseUpdate = renderPhaseUpdates.get(queue);
    // 不存在则新增，存在则把update添加到末尾。
    if (firstRenderPhaseUpdate === undefined) {
      renderPhaseUpdates.set(queue, update);
    } else {
      let lastRenderPhaseUpdate = firstRenderPhaseUpdate;
      while (lastRenderPhaseUpdate.next !== null) {
        lastRenderPhaseUpdate = lastRenderPhaseUpdate.next;
      }
      lastRenderPhaseUpdate.next = update;
    }
  } else {
    const currentTime = requestCurrentTimeForUpdate();
    const suspenseConfig = requestCurrentSuspenseConfig();
    const expirationTime = computeExpirationForFiber(currentTime, fiber, suspenseConfig);

    const update = {
      expirationTime,
      suspenseConfig,
      action,
      eagerReducer: null,
      eagerState: null,
      next: null,
    };

    const last = queue.last;
    if (last === null) {
      update.next = update;
    } else {
      const first = last.next;
      if (first !== null) {
        update.next = first;
      }
      last.next = update;
    }
    queue.last = update;

    // 如果当前fiber没有工作，可以在进入render阶段之前立即计算一次状态。
    if (
      fiber.expirationTime === NoWork &&
      (alternate === null || alternate.expirationTime === NoWork)
    ) {
      // 当前queue为空，这意味着我们可以在进入render阶段之前立即计算下一个状态，
      // 如果新的状态和现在的状态一样，我们也许能完全摆脱困境？？？
      const lastRenderedReducer = queue.lastRenderedReducer;
      if (lastRenderedReducer !== null) {
        // let prevDispatcher;
        try {
          const currentState = queue.lastRenderedState;
          const eagerState = lastRenderedReducer(currentState, action);
          // 将立即计算出的状态和用于计算他的reducer保存在update对象上。
          // 如果我们在进入render阶段时reducer没有改变，那么可以不再次调用reducer的情况下使用此状态
          update.eagerReducer = lastRenderedReducer;
          update.eagerState = eagerState;
          if (is(eagerState, currentState)) {
            // 快捷路径，我们可以在不安排re-render的情况下进行纾困
            // 如果组件由于不同的原因重新渲染，并且此时reducer已更改， 我们还是有可能需要在以后重新调整此更新
            return;
          }
        } catch (err) {
          // 忽略
        } finally {

        }
      }
    }
    // 调度工作
    scheduleWork(fiber, expirationTime);
  }
}

export const ContextOnlyDispatcher = {
  readContext,

  useCallback: throwInvalidHookError,
  useContext: throwInvalidHookError,
  useEffect: throwInvalidHookError,
  useImperativeHandle: throwInvalidHookError,
  useLayoutEffect: throwInvalidHookError,
  useMemo: throwInvalidHookError,
  useRef: throwInvalidHookError,
  useState: throwInvalidHookError,
  useDebugValue: throwInvalidHookError,
};

const HooksDispatcherOnMount = {
  readContext,

  useCallback: mountCallback,
  useContext: readContext,
  useEffect: mountEffect,
  useImperativeHandle: mountImperativeHandle,
  useLayoutEffect: mountLayoutEffect,
  useMemo: mountMemo,
  useReducer: mountReducer,
  useRef: mountRef,
  useState: mountState,
  useResponder: createResponderListener,
  useDeferredValue: mountDeferredValue,
  useTransition: mountTransition,
};

const HooksDispatcherOnUpdate = {
  readContext,

  useCallback: updateCallback,
  useContext: readContext,
  useEffect: updateEffect,
  useImperativeHandle: updateImperativeHandle,
  useLayoutEffect: updateLayoutEffect,
  useMemo: updateMemo,
  useReducer: updateReducer,
  useRef: updateRef,
  useState: updateState,
  useResponder: createResponderListener,
  useDeferredValue: updateDeferredValue,
  useTransition: updateTransition,
};