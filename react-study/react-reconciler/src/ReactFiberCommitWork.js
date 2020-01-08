import { Passive, NoEffect, Snapshot, ContentReset, Placement } from "react-study/shared/ReactSideEffectTags";
import {
  FunctionComponent,
  ForwardRef,
  SimpleMemoComponent,
  ClassComponent,
  HostRoot,
  HostComponent,
  HostText,
  HostPortal,
  IncompleteClassComponent,
  FundamentalComponent,
  DehydratedFragment,
  MemoComponent,
  Profiler,
  SuspenseComponent,
  SuspenseListComponent,
  ScopeComponent,
} from "react-study/shared/ReactWorkTags";
import {
  NoEffect as NoHookEffect,
  UnmountPassive,
  MountPassive,
  UnmountSnapshot,
  UnmountMutation,
  MountMutation,
} from "./ReactHookEffectTags";
import { getStackByFiberInDevAndProd } from "./ReactCurrentFiber";
import getComponentName from "react-study/shared/getComponentName";
import { startPhaseTimer, stopPhaseTimer } from "./ReactDebugFiberPerf";
import {
  supportsMutation,
  resetTextContent,
  insertInContainerBefore,
  insertBefore,
  appendChildToContainer,
  appendChild,
  hideInstance,
  unhideInstance,
  hideTextInstance,
  unhideTextInstance,
  supportsHydration,
  commitHydratedContainer,
  supportsPersistence,
  commitUpdate,
  commitTextUpdate,
  updateFundamentalComponent
} from './ReactFiberHostConfig';
import { enableFundamentalAPI, enableSuspenseCallback, enableSchedulerTracing, enableFlareAPI, enableScopeAPI } from "react-study/shared/ReactFeatureFlags";
import { markCommitTimeOfFallback, resolveRetryThenable, captureCommitPhaseError } from "./ReactFiberWorkLoop";
import { unstable_wrap as Schedule_tracing_wrap } from '../../scheduler/tracing'
import { updateEventListeners } from "./ReactFiberEvents";
import { onCommitUnmount } from "./ReactFiberDevToolsHook";
import { NormalPriority, runWithPriority } from "./SchedulerWithReactIntegration";

const PossiblyWeakSet = typeof WeakSet === 'function' ? WeakSet : Set;

/**
 * 
 * @param {Fiber} boundary 
 * @param {*} errorInfo 
 */
export function logError(boundary, errorInfo) {
  const source = errorInfo.value;
  let stack = errorInfo.stack;
  if (stack === null && source !== null) {
    stack = getStackByFiberInDevAndProd(source);
  }

  const capturedError = {
    componentName: source !== null ? getComponentName(source.type) : null,
    componentStack: stack !== null ? stack : '',
    error: errorInfo.value,
    errorBoundary: null,
    errorBoundaryName: null,
    errorboundaryFound: false,
    willRetry: false,
  };

  if (boundary !== null && boundary.tag === ClassComponent) {
    capturedError.errorBoundary = boundary.stateNode;
    capturedError.errorBoundaryName = getComponentName(boundary.type);
    capturedError.errorboundaryFound = true;
    capturedError.willRetry = true;
  }

  try {
    logCapturedError(capturedError);
  } catch (e) {
    setTimeout(() => {
      throw e
    });
  }
}

function callComponentWillUnmountWithTimer(current, instance) {
  startPhaseTimer(current, 'componentWillUnmount');
  instance.props = current.memoizedProps;
  instance.state = current.memoizedState;
  instance.componentWillUnmount();
  stopPhaseTimer();
}

/**
 * 安全的执行componentWillUnmount，捕获错误，以便它们不会中断卸载。
 * @param {Fiber} current 
 * @param {object} instance 
 */
function safelyCallComponentWillUnmount(current, instance) {
  try {
    callComponentWillUnmountWithTimer(current, instance);
  } catch (unmountError) {
    captureCommitPhaseError(current, unmountError);
  }
}

/**
 * 安全的删除ref
 * @param {Fiber} current 
 */
function safelyDetachRef(current) {
  const ref = current.ref;
  if (ref !== null) {
    if (typeof ref === 'function') {
      try {
        ref(null);
      } catch (refError) {
        captureCommitPhaseError(current, refError);
      }
    } else {
      ref.current = null;
    }
  }
}

/**
 * 安全的调用effect的销毁函数
 * @param {Fiber} current 
 * @param {Function} destory 
 */
function safelyCallDestory(current, destory) {
  try {
    destory();
  } catch (err) {
    captureCommitPhaseError(current, error);
  }
}

/**
 * @param {Fiber} current 
 * @param {Fiber} finishedWork 
 */
export function commitBeforeMutationLifeCycles(current, finishedWork) {
  switch (finishedWork.tag) {
    case FunctionComponent:
    case ForwardRef:
    case SimpleMemoComponent: {
      commitHookEffectList(UnmountSnapshot, NoHookEffect, finishedWork);
      return;
    }
    case ClassComponent: {
      if (finishedWork.effectTag & Snapshot) {
        if (current !== null) {
          const prevProps = current.memoizedProps;
          const prevState = current.memoizedState;
          startPhaseTimer(finishedWork, 'getSnapshotBeforeUpdate');
          const instance = finishedWork.stateNode;
          // 我们可以在这里更新实例属性和状态，但是我们依赖于在最后一次呈现期间设置它们。
          const snapshot = instance.getSnapshotBeforeUpdate(
            // TODO:暂时还没发现elementType是啥
            finishedWork.elementType === finishedWork.type ? prevProps : resolveDefaultProps(finishedWork.type, prevProps),
            prevState,
          );
          instance.__reactInternalSnapshotBeforeUpdate = snapshot;
          stopPhaseTimer();
        }
      }
      return;
    }
    case HostRoot:
    case HostComponent:
    case HostText:
    case HostPortal:
    case IncompleteClassComponent:
      return;
    default:
      console.warn('....');
  }
}

/**
 * 处理effect list
 * @param {number} unmountTag 
 * @param {number} mountTag 
 * @param {Fiber} finishedWork 
 */
function commitHookEffectList(unmountTag, mountTag, finishedWork) {
  const updateQueue = finishedWork.updateQueue;
  let lastEffect = updateQueue !== null ? updateQueue.lastEffect : null;
  if (lastEffect !== null) {
    const firstEffect = lastEffect.next;
    let effect = firstEffect;
    do {
      if ((effect.tag & unmountTag) !== NoHookEffect) {
        // Unmount
        const destory = effect.destory;
        effect.destory = undefined;
        if (destory !== undefined) {
          destory();
        }
      }
      if ((effect.tag & mountTag) !== NoHookEffect) {
        // Mount
        const create = effect.create;
        effect.destory = create();
      }
      effect = effect.next();
    } while (effect !== firstEffect);
  }
}

/**
 * @param {Fiber} finishedWork 
 */
export function commitPassiveHookEffects(finishedWork) {
  if ((finishedWork.effectTag & Passive) !== NoEffect) {
    switch (finishedWork.tag) {
      case FunctionComponent:
      case ForwardRef:
      case SimpleMemoComponent: {
        commitHookEffectList(UnmountPassive, NoHookEffect, finishedWork);
        commitHookEffectList(NoHookEffect, MountPassive, finishedWork);
        break;
      }
      default:
        break;
    }
  }
}

/**
 * 隐藏/显示所有的children
 * @param {Fiber} finishedWork 
 * @param {Boolean} isHidden 
 */
function hideOrUnhideAllChildren(finishedWork, isHidden) {
  if (supportsMutation) {
    // 我们只插入了顶部的fiber，但是我们需要递归它的子节点，来找到所有的终端节点。
    let node = finishedWork;
    while (true) {
      // 普通dom节点，控制display显示/隐藏，猜测可能是为了当child都添加完之后，才会显示，但是unhide里面是根据props来控制display的。暂时还不明白
      if (node.tag === HostComponent) {
        const instance = node.stateNode;
        if (isHidden) {
          hideInstance(instance);
        } else {
          unhideInstance(node.stateNode, node.memoizedProps);
        }
      } else if (node.tag === HostText) {
        const instance = node.stateNode;
        if (isHidden) {
          hideTextInstance(instance);
        } else {
          unhideTextInstance(instance, node.memoizedProps);
        }
      } else if (
        node.tag === SuspenseComponent &&
        node.memoizedState !== null &&
        node.memoizedState.dehydrated === null
      ) {
        // TODO: 暂时还不明白为什么是node.child.sibling，可能Suspnse组件的child的兄弟节点才是真实的children
        // 找到超时的嵌套挂起组件。跳过应该保持隐藏的主子片段。
        const fallbackChildFragement = node.child.sibling;
        fallbackChildFragement.return = node;
        node = fallbackChildFragement;
        continue;
      } else if (node.child !== null) {
        node.child.return = node;
        node = node.child;
        continue;
      }
      if (node === finishedWork) {
        return;
      }
      while (node.sibling === null) {
        if (node.return === null || node.return === finishedWork) {
          return;
        }
        node = node.return;
      }
      node.sibling.return = node.return;
      node = node.sibling;
    }
  }
}

/**
 * ref
 * @param {Fiber} current 
 */
export function commitDetachRef(current) {
  const currentRef = current.ref;
  if (currentRef !== null) {
    if (typeof currentRef === 'function') {
      currentRef(null);
    } else {
      currentRef.current = null;
    }
  }
}

/**
 * 用户发起的错误（生命周期和refs）不应中断删除，因此不要让它们抛出。主机发起的错误应该会中断删除，所以没关系
 * @param {FiberRoot} finishedRoot 
 * @param {Fiber} current 
 * @param {RenderPriorityLevel} renderPriorityLevel 
 */
function commitUnmount(finishedRoot, current, renderPriorityLevel) {
  onCommitUnmount(current); // dev tools
  switch (current.tag) {
    case FunctionComponent:
    case ForwardRef:
    case MemoComponent:
    case SimpleMemoComponent: {
      const updateQueue = current.updateQueue;
      if (updateQueue !== null) {
        const lastEffect = updateQueue.lastEffect;
        if (lastEffect !== null) {
          const firstEffect = lastEffect.next;

          // 当owner fiber被删除时，在同步commit阶段调用effect hook的销毁函数。这是对实现复杂性的让步，在被动effect阶段调用它（通常是在更新期间依赖关系发生更改时）
          // 需要再次遍历已删除的fiber的子级，或者将卸载effect作为fiber effect list的一部分包括在内。
          // 因为这是在同步提交阶段，所以我们需要更改优先级。
          const priorityLevel = renderPriorityLevel > NormalPriority ? NormalPriority : renderPriorityLevel;
          runWithPriority(priorityLevel, () => {
            let effect = firstEffect;
            do {
              const destory = effect.destory;
              if (destory !== undefined) {
                safelyCallDestory(current, destory);
              }
              effect = effect.next;
            } while (effect !== firstEffect);
          });
        }
      }
      break;
    }
    case ClassComponent: {
      safelyDetachRef(current);
      const instance = current.stateNode;
      if (typeof instance.componentWillUnmount === 'function') {
        safelyCallComponentWillUnmount(current, instance);
      }
    }
  }
}

/**
 * 提交嵌套的unmount
 * @param {FiberRoot} finishedRoot 
 * @param {Fiber} root 
 * @param {ReactPriorityLevel} renderPriorityLevel 
 */
function commitNestedUnmounts(finishedRoot, root, renderPriorityLevel) {
  // 当我们在已经移除的节点中时，我们不想在内部节点上调用removeChild，因为它们的top已经移除。
  // 我们还希望从树中移除此节点之前，在所有的children上调用componentWillUnmount。
  // 因此，在节点内，执行一次内部循环
  let node = root;
  while (true) {

  }
}


/**
 * 
 * @param {Fiber} finishedWork 
 */
function commitContainer(finishedWork) {
  if (!supportsPersistence) {
    return;
  }

  // 不是浏览器渲染。
  switch (finishedWork.tag) {
    case ClassComponent:
    case HostComponent:
    case HostText:
    case FundamentalComponent: {
      return;
    }
    case HostRoot:
    case HostPortal: {
      const portalOrRoot = finishedWork.stateNode;
      const { containerInfo, pendingChildren } = portalOrRoot;
      replaceContainerChildren(containerInfo, pendingChildren);
    }
    default: 
      // warn
  }
}

/**
 * 找到某个fiber的祖先fiber，这个祖先fiber的stateNode一个DOM元素
 * @param {Fiber} fiber 
 */
function getHostParentFiber(fiber) {
  let parent = fiber.return;
  while (parent !== null) {
    if (isHostParent(parent)) {
      return parent;
    }
    parent = parent.return;
  }
  // invariant
}

/**
 * 现在看来，这个函数是为了找到一个对应真实DOM元素、Portal的fiber
 * @param {Fiber} fiber 
 */
function isHostParent(fiber) {
  return (
    fiber.tag === HostComponent ||
    fiber.tag === HostRoot ||
    fiber.tag === HostPortal
  );
}

/**
 * 找到Host fiber的下一个兄弟节点。至于为什么逻辑要这样写，暂时还不明白TODO:
 * 循环 -> 如果没有下一个兄弟节点
 *            -> 如果是根节点，或者host节点
 *                   -> 返回null
 *            -> 如果不是，向上递归
 *     -> 如果有兄弟节点
 *     -> 设置兄弟节点的父节点 等于 自己的父节点
 *     -> 自己切换成自己的兄弟节点，
 *     -> 如果不是Host节点、Fragment节点
 *            -> 如果此节点是新的，或者没有子节点，或者是Portal节点 跳出到最外层循环
 *            -> 设置子节点的父节点是自己，自己切换成子节点
 * @param {Fiber} fiber 
 */
function getHostSibling(fiber) {
  // 我们将向前搜索树，直到找到一个兄弟主机节点。不幸的是，如果连续进行多个插入，我们必须搜索它们。这将导致对下一个兄弟的指数搜索。
  let node = fiber;
  siblings: while (true) {
    while (node.sibling === null) {
      if (node.return === null || isHostParent(node.return)) {
        return null;
      }
      node = node.return;
    }

    node.sibling.return = node.return;
    node = node.sibling;
    while (
      node.tag !== HostComponent &&
      node.tag !== HostText &&
      node.tag !== DehydratedFragment
    ) {
      // 如果它不是host node，可能在它内部有一个host node。
      // 试着向下搜索，直到找到它
      if (node.effectTag & Placement) {
        // 如果没有child，试着其他兄弟节点
        continue siblings;
      }

      // 跳过portal，因为它不属于此树
      if (node.child === null || node.tag === HostPortal) {
        continue siblings;
      } else {
        node.child.return = node;
        node = node.child;
      }
    }

    // 如果此fiber的更新类型不是新增，返回fiber的实例
    if (!(node.effectTag & Placement)) {
      return node.stateNode;
    }
  }
}

/**
 * commit 添加节点 TODO:没搞懂
 * @param {Fiber} finishedWork 
 */
export function commitPlacement(finishedWork) {
  if (!supportsMutation) {
    return;
  }

  // 先找到fiber
  const parentFiber = getHostParentFiber(finishedWork);

  // 注意：这两个变量必须始终一起更新。
  let parent;
  let isContainer;
  const parentStateNode = parentFiber.stateNode;
  switch (parentFiber.tag) {
    case HostComponent:
      parent = parentStateNode;
      isContainer = false;
      break;
    case HostRoot:
      parent = parentStateNode.containerInfo;
      isContainer = true;
      break;
    case HostPortal:
      parent = parentStateNode.containerInfo;
      isContainer = true;
      break;
    case FundamentalComponent:
      if (enableFundamentalAPI) {
        parent = parentStateNode.instance;
        inContainer = false;
      }
    default:
      // invariant()
  }
  if (parentFiber.effectTag & ContentReset) {
    // 在进行任何插入之前重置父级的文本内容
    resetTextContent(parent);
    // 清除
    parentFiber.effectTag &= ~ContentReset;
  }

  const before = getHostSibling(finishedWork);
  // 我们只插入了顶部的fiber, 但是我们需要递归它的子节点来找到所有的终端节点。
  let node = finishedWork;
  while (true) {
    const isHost = node.tag === HostComponent || node.tag === HostText;
    // 从这里可以看出，HostComponent、HostText对应的真实的dom节点。
    if (isHost || (enableFundamentalAPI && node.tag === FundamentalComponent)) {
      const stateNode = isHost ? node.stateNode : node.stateNode.instance;
      // 这里可以发现，before是为了找到新的dom节点应该在谁之前，parent是要插入节点的父节点
      if (before) {
        if (isContainer) {
          insertInContainerBefore(parent, stateNode, before);
        } else {
          insertBefore(parent, stateNode, before);
        }
      } else {
        if (isContainer) {
          appendChildToContainer(parent, stateNode);
        } else {
          appendChild(parent, stateNode);
        }
      }
    } else if (node.tag === HostPortal) {
      // 如果插入本身是一个Portal，那么我们不想遍历它的子级。相反，我们将直接从Portal中的每个子项获取插入。
    } else if (node.child !== null) {
      node.child.return = node;
      node = node.child;
      continue;
    }
    if (node === finishedWork) {
      return;
    }
    while (node.sibling === null) {
      if (node.return === null || node.return === finishedWork) {
        return;
      }
      node = node.return;
    }
    node.sibling.return = node.return;
    node = node.sibling;
  }
}

/**
 * 递归删除host节点，解除引用，并且调用componentWillUnmount
 * @param {FiberRoot} finishedRoot 
 * @param {Fiber} current 
 * @param {ReactPriorityLevel} renderPriorityLevel 
 */
function unmountHostComponents(finishedRoot, current, renderPriorityLevel) {
  // 我们只删除了顶部的fiber，但是我们需要递归它的子节点来找到所有的终端节点。
  let node = current;

  // 如果currentParentIsValid为false，则每次迭代currentParent都会填充节点的宿主父节点。
  let currentParentIsValid = false;

  // 这两个变量必须一起更新
  let currentParent;
  let currentParentIsContainer;

  while (true) {
    if (!currentParentIsValid) {
      let parent = node.return;
      findParent: while (true) {
        const parentStateNode = parent.stateNode;
        switch (parent.tag) {
          case HostComponent:
            currentParent = parentStateNode;
            currentParentIsContainer = false;
            break findParent;
          case HostRoot:
            currentParent = parentStateNode.containerInfo;
            currentParentIsContainer = true;
            break findParent;
          case HostPortal:
            currentParent = parentStateNode.containerInfo;
            currentParentIsContainer = true;
            break findParent;
          case FundamentalComponent:
            if (enableFundamentalAPI) {
              currentParent = parentStateNode.instance;
              currentParentIsContainer = false;
            }
        }
        parent = parent.return;
      }
      currentParentIsValid = true;
    }

    if (node.tag === HostComponent || node.tag === HostText) {
      commitNestedUnmounts()
    }
  }
}

/**
 * 删除
 * @param {FiberRoot} finishedRoot 
 * @param {Fiber} current 
 * @param {ReactPriorityLevel} renderPriorityLevel 
 */
export function commitDeletion(finishedRoot, current, renderPriorityLevel) {
  if (supportsMutation) {
    // 递归地从父节点中删除所有主机节点。
    // 分离引用并对整个子树调用componentWillUnmount（）。
    unmountHostComponents(finishedRoot, current, renderPriorityLevel);
  } else {

  }
}

/**
 * 更新
 * @param {Fiber} current 
 * @param {Fiber} finishedWork 
 */
export function commitWork(current, finishedWork) {
  if (!supportsMutation) {
    switch (finishedWork.tag) {
      case FunctionComponent:
      case ForwardRef:
      case MemoComponent:
      case SimpleMemoComponent: {
        commitHookEffectList(UnmountMutation, MountMutation, finishedWork);
        return;
      }
      case Profiler: {
        return;
      }
      case SuspenseComponent: {
        commitSuspenseComponent(finishedWork);
        attachSuspenseRetryListeners(finishedWork);
        return;
      }
      case SuspenseListComponent: {
        attachSuspenseRetryListeners(finishedWork);
        return;
      }
      case HostRoot: {
        if (supportsHydration) {
          const root = finishedWork.stateNode;
          if (root.hydrate) {
            // 只需要注水一次
            root.hydrate = false;
            commitHydratedContainer(root.containerInfo);
          }
        }
        break;
      }
    }

    commitContainer(finishedWork);
    return;
  }

  switch (finishedWork.tag) {
    case FunctionComponent:
    case ForwardRef:
    case MemoComponent:
    case SimpleMemoComponent: {
      // 我们目前从未使用MountMutation, 但useLayout使用UnmountMutation。
      commitHookEffectList(UnmountMutation, MountMutation, finishedWork);
      return;
    }
    case ClassComponent: {
      return;
    }
    case HostComponent: {
      const instance = finishedWork.stateNode;
      if (instance !== null) {
        // commit先前准备的工作
        const newProps = finishedWork.memoizedProps;
        // 对于hydration，我们重用更新路径，但我们将oldProps视为newProps。
        // 在这种情况下，updatePayload将包含真正的更改。
        const oldProps = current !== null ? current.memoizedProps : newProps;
        const type = finishedWork.type;
        const updatePayload = finishedWork.updateQueue;
        finishedWork.updateQueue = null;
        if (updatePayload !== null) {
          commitUpdate(instance, updatePayload, type, oldProps, newProps, finishedWork);
        }
        if (enableFlareAPI) {
          const prevListeners = oldProps.listeners;
          const nextListeners = newProps.listeners;
          if (prevListeners !== nextListeners) {
            updateEventListeners(nextListeners, finishedWork, null);
          }
        }
      }
      return;
    }
    case HostText: {
      const textInstance = finishedWork.stateNode;
      const newText = finishedWork.memoizedProps;
      const oldText = current !== null ? current.memoizedProps : newText;
      commitTextUpdate(textInstance, oldText, newText);
      return;
    }
    case HostRoot: {
      if (supportsHydration) {
        const root = finishedWork.stateNode;
        if (root.hydrate) {
          root.hydrate = false;
          commitHydratedContainer(root.containerInfo);
        }
      }
      return;
    }
    case Profiler: {
      return;
    }
    case SuspenseComponent: {
      commitSuspenseComponent(finishedWork);
      attachSuspenseRetryListeners(finishedWork);
      return;
    }
    case SuspenseListComponent: {
      attachSuspenseRetryListeners(finishedWork);
      return;
    }
    case IncompleteClassComponent: {
      return;
    }
    case FundamentalComponent: {
      if (enableFundamentalAPI) {
        const fundamentalInstance = finishedWork.stateNode;
        updateFundamentalComponent(fundamentalInstance);
      }
    }
    case ScopeComponent: {
      if (enableScopeAPI) {
        const scopeInstance = finishedWork.stateNode;
        scopeInstance.fiber = finishedWork;
        if (enableFlareAPI) {
          const newProps = finishedWork.memoizedProps;
          const oldProps = current !== null ? current.memoizedProps : newProps;
          const prevListeners = oldProps.listeners;
          const nextListeners = newProps.listeners;
          if (prevListeners !== nextListeners) {
            updateEventListeners(nextListeners, finishedWork, null);
          }
        }
      }
      return;
    }
    default: {
      // warn
    }
  }
}

/**
 * Suspense组件
 * @param {Fiber} finishedWork 
 */
function commitSuspenseComponent(finishedWork) {
  let newState = finishedWork.memoizedState;
  let newDidTimeout;
  let primaryChildParent = finishedWork;
  if (newState === null) {
    newDidTimeout = false;
  } else {
    newDidTimeout = true;
    primaryChildParent = finishedWork.child;
    markCommitTimeOfFallback();
  }

  if (supportsMutation && primaryChildParent !== null) {
    hideOrUnhideAllChildren(primaryChildParent, newDidTimeout);
  }

  if (enableSuspenseCallback && newState !== null) {
    const suspenseCallback = finishedWork.memoizedProps.suspenseCallback;
    if (typeof suspenseCallback === 'function') {
      const thenables = finishedWork.updateQueue;
      if (thenables !== null) {
        suspenseCallback(new Set(thenables));
      }
    }
  }
}

/**
 * 附加Suspense重试listener
 * @param {Fiber} finishedWork 
 */
function attachSuspenseRetryListeners(finishedWork) {
  // 如果suspense对应的组件刚刚超时, 它将会有thenable的Set.
  // 遍历所有的thenable，添加一个listener，方便当那个Promise变成resolve状态时, React尝试在主状态下重新呈现边界。
  const thenables = finishedWork.updateQueue;
  if (thenables !== null) {
    finishedWork.updateQueue = null;
    let retryCache = finishedWork.stateNode;
    if (retryCache === null) {
      retryCache = finishedWork.stateNode = new PossiblyWeakSet();
    }
    thenables.forEach(thenable => {
      // 使用边界fiber放置冗余listener
      let retry = resolveRetryThenable.bind(null, finishedWork, thenable);
      if (!retryCache.has(thenable)) {
        if (enableSchedulerTracing) {
          if (thenable.__reactDoNotTraceInteractions !== true) {
            retry = Schedule_tracing_wrap(retry);
          }
        }
        retryCache.add(thenable);
        thenable.then(retry, retry);
      }
    });
  }
}

/**
 * 重置textContent
 * @param {Fiber} current 
 */
export function commitResetTextContent(current) {
  if (!supportsMutation) {
    return;
  }
  resetTextContent(current.stateNode);
}