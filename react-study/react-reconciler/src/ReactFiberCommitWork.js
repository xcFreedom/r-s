import { Passive, NoEffect, Snapshot, ContentReset, Placement, Update } from "react-study/shared/ReactSideEffectTags";
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
  UnmountLayout,
  MountLayout,
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
  updateFundamentalComponent,
  unmountResponderInstance,
  unmountFundamentalComponent,
  removeChild,
  removeChildFromContainer,
  clearSuspenseBoundary,
  clearSuspenseBoundaryFromContainer,
  commitMount,
  commitHydratedSuspenseInstance,
} from './ReactFiberHostConfig';
import { enableFundamentalAPI, enableSuspenseCallback, enableSchedulerTracing, enableFlareAPI, enableScopeAPI, enableSuspenseServerRenderer, enableProfilerTimer } from "react-study/shared/ReactFeatureFlags";
import { markCommitTimeOfFallback, resolveRetryThenable, captureCommitPhaseError } from "./ReactFiberWorkLoop";
import { unstable_wrap as Schedule_tracing_wrap } from '../../scheduler/tracing'
import { updateEventListeners } from "./ReactFiberEvents";
import { onCommitUnmount } from "./ReactFiberDevToolsHook";
import { NormalPriority, runWithPriority } from "./SchedulerWithReactIntegration";
import { resolveDefaultProps } from "./ReactFiberLazyComponent";
import { commitUpdateQueue } from "./ReactUpdateQueue";
import { getPublicInstance } from "react-study/react-dom/src/client/ReactDOMHostConfig";
import { getCommitTime } from "./ReactProfilerTimer";

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
            // 元素类型与真实类型相等，一般情况下是相等的
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
 * 处理effect list，effect函数的销毁与创建，
 * useEffect生成effect时，tag为UnmountPassive | MountPassive
 * commitBeforeMutationEffect传入tag: UnmountSnapshot, NoHookEffect，destory/create都不触发
 * commitPassiveHookEffects第一次: UnmountPassive, NoHookEffect，触发destory
 * commitPassiveHookEffects第二次: NoHookEffect，MountPassive，触发create
 * commitWork调用时: UnmountMutation，MountMutation
 * TODO:看到useEffect相关的创建更新流程之后再回来详细理解。
 * @param {number} unmountTag 
 * @param {number} mountTag 
 * @param {Fiber} finishedWork 
 */
function commitHookEffectList(unmountTag, mountTag, finishedWork) {
  const updateQueue = finishedWork.updateQueue;
  let lastEffect = updateQueue !== null ? updateQueue.lastEffect : null;
  if (lastEffect !== null) {
    // 找到第一个effect, 开始遍历
    const firstEffect = lastEffect.next;
    let effect = firstEffect;
    do {
      // 卸载时执行destory，只要不是NoHookEffect，就会执行destory
      if ((effect.tag & unmountTag) !== NoHookEffect) {
        const destory = effect.destory;
        effect.destory = undefined;
        if (destory !== undefined) {
          destory();
        }
      }
      // 装载时执行create
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
 * 提交被动的effects
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
 * commit阶段，触发生命周期
 * @param {FiberRoot} finishedRoot 
 * @param {Fiber} current 
 * @param {Fiber} finishedWork 
 * @param {ExpirationTime} committedExpirationTime 
 */
export function commitLifeCycles(finishedRoot, current, finishedWork, committedExpirationTime) {
  switch (finishedWork.tag) {
    case FunctionComponent:
    case ForwardRef:
    case SimpleMemoComponent: {
      commitHookEffectList(UnmountLayout, MountLayout, finishedWork);
      break;
    }
    case ClassComponent: {
      const instance = finishedWork.stateNode;
      if (finishedWork.effectTag & Update) {
        // work-in-progress不存在认为，fiber第一次初始化
        if (current === null) {
          startPhaseTimer(finishedWork, 'componentDidMount');
          // 我们可以在这里更新实例属性和状态，但是我们依赖于在最后一次呈现期间设置它们。
          instance.componentDidMount();
          stopPhaseTimer();
        } else {
          // TODO: elementType与type何时不等，需要在fiber初始化阶段知道，暂时还不明白
          const prevProps = finishedWork.elementType === finishedWork.type ? current.memoizedProps : resolveDefaultProps(finishedWork.type, current.memoizedProps);
          const prevState = current.memoizedState;
          startPhaseTimer(finishedWork, 'componentDidUpdate');
          // 我们可以在这里更新实例属性和状态，但是我们依赖于在最后一次呈现期间设置它们。
          instance.componentDidUpdate(prevProps, prevState. instance.__reactInternalSnapshotBeforeUpdate);
          stopPhaseTimer();
        }
      }
      const updateQueue = finishedWork.updateQueue;
      if (updateQueue !== null) {
        // 我们可以在这里更新实例属性和状态，但是我们依赖于在最后一次呈现期间设置它们。
        commitUpdateQueue(finishedWork, updateQueue, instance, committedExpirationTime);
      }
      return;
    }
    case HostRoot: {
      const updateQueue = finishedWork.updateQueue;
      if (updateQueue !== null) {
        let instance = null;
        if (finishedWork.child !== null) {
          switch (finishedWork.child.tag) {
            case HostComponent:
              instance = getPublicInstance(finishedWork.child.stateNode);
              break;
            case ClassComponent:
              instance = finishedWork.child.stateNode;
              break;
          }
        }
        commitUpdateQueue(finishedWork, updateQueue, instance, committedExpirationTime);
      }
      return;
    }
    case HostComponent: {
      const instance = finishedWork.stateNode;
      // 渲染器可以安排在HostComponent mounted之后完成的工作
      // （例如，DOM渲染器可以安排输入和表单控件的自动聚焦）。
      // 这些效果只应在组件首次mount时提交，即没有current/alternate组件时提交。
      if (current === null && finishedWork.effectTag & Update) {
        const type = finishedWork.type;
        const props = finishedWork.memoizedProps;
        commitMount(instance, type, props, finishedWork);
      }
      return;
    }
    case HostText: {
      // 没有text的生命周期
      return;
    }
    case HostPortal: {
      // 没有portal的生命周期
      return;
    }
    case Profiler: {
      if (enableProfilerTimer) {
        const onRender = finishedWork.memoizedProps.onRender;
        if (typeof onRender === 'function') {
          if (enableSchedulerTracing) {
            onRender(
              finishedWork.memoizedProps.id,
              current === null ? 'mount' : 'update',
              finishedWork.actualDuration,
              finishedWork.treeBaseDuration,
              finishedWork.actualStartTime,
              getCommitTime(),
              finishedRoot.memoizedInteractions,
            );
          } else {
            onRender(
              finishedWork.memoizedProps.id,
              current === null ? 'mount' : 'update',
              finishedWork.actualDuration,
              finishedWork.treeBaseDuration,
              finishedWork.actualStartTime,
              getCommitTime(),
            );
          }
        }
      }
      return;
    }
    case SuspenseComponent: {
      commitSuspenseHydrationCallbacks(finishedRoot, finishedWork);
      return;
    }
    case SuspenseListComponent:
    case IncompleteClassComponent:
    case FundamentalComponent:
    case ScopeComponent:
      return;
    default:
      // warn
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
 * 添加ref
 * @param {Fiber} finishedWork 
 */
export function commitAttachRef(finishedWork) {
  const ref = finishedWork.ref;
  if (ref !== null) {
    const instance = finishedWork.stateNode;
    let instanceToUse;
    switch (finishedWork.tag) {
      case HostComponent:
        instanceToUse = getPublicInstance(instance);
        break;
      default:
        instanceToUse = instance;
    }

    // 移动到外部以确保DCE使用此标志
    if (enableScopeAPI && finishedWork.tag === ScopeComponent) {
      instanceToUse = instance.methods;
    }
    if (typeof ref === 'function') {
      ref(instanceToUse);
    } else {
      ref.current = instanceToUse;
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
 * 函数类型的组件，执行effect的销毁函数、class组件卸载ref，然后执行willUnmount钩子
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
      return;
    }
    case HostComponent: {
      if (enableFlareAPI) {
        const dependencies = current.dependencies;

        if (dependencies !== null) {
          const respondersMap = dependencies.responders;
          if (respondersMap !== null) {
            const responderInstances = Array.from(respondersMap.values());
            for (let i = 0, length = responderInstances.length; i < length; i++) {
              const responderInstance = responderInstances[i];
              unmountResponderInstance(responderInstance);
            }
            dependencies.responders = null;
          }
        }
      }
      safelyDetachRef(current);
      return;
    }
    case HostPortal: {
      if (supportsMutation) {
        unmountHostComponents(finishedRoot, current, renderPriorityLevel);
      } else if (supportsPersistence) {
        // skip not react-dom
      }
      return;
    }
    case FundamentalComponent: {
      if (enableFundamentalAPI) {
        const fundamentalInstance = current.stateNode;
        if (fundamentalInstance !== null) {
          unmountFundamentalComponent(fundamentalInstance);
          current.stateNode = null;
        }
      }
      return;
    }
    case DehydratedFragment: {
      if (enableSuspenseCallback) {
        const hydrationCallbacks = finishedRoot.hydrationCallbacks;
        if (hydrationCallbacks !== null) {
          const onDeleted = hydrationCallbacks.onDeleted;
          if (onDeleted) {
            onDeleted(current.stateNode);
          }
        }
      }
      return;
    }
    case ScopeComponent: {
      if (enableScopeAPI) {
        safelyDetachRef(current);
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
    commitUnmount(finishedRoot, node, renderPriorityLevel);
    // 访问子节点，因为它们可能包含更多的复合节点或宿主节点。
    // 跳过portals，因为commitUnmount()当前递归访问它们。
    if (
      node.child !== null &&
      // 如果启用supportsMutation上面进行了commitUnmount，如果没有启用，这里执行
      (!supportsMutation || node.tag !== HostPortal)
    ) {
      node.child.return = node;
      node = node.child;
      continue;
    }
    if (node === root) {
      return;
    }
    // 如果已经访问到最后一个子节点
    while (node.sibling === null) {
      if (node.return === null || node.return === root) {
        return;
      }
      // 切换回父节点
      node = node.return;
    }

    // 子节点访问完之后，切换到自己的兄弟节点
    node.sibling.return = node.return;
    node = node.sibling;
  }
}


/**
 * 清空fiber
 * @param {Fiber} current 
 */
function detachFiber(current) {
  const alternate = current.alternate;
  // Cut off the return pointers to disconnect it from the tree. Ideally, we
  // should clear the child pointer of the parent alternate to let this
  // get GC:ed but we don't know which for sure which parent is the current
  // one so we'll settle for GC:ing the subtree of this child. This child
  // itself will be GC:ed when the parent updates the next time.
  current.return = null;
  current.child = null;
  current.memoizedState = null;
  current.updateQueue = null;
  current.dependencies = null;
  current.alternate = null;
  current.firstEffect = null;
  current.lastEffect = null;
  current.pendingProps = null;
  current.memoizedProps = null;
  if (alternate !== null) {
    detachFiber(alternate);
  }
}

/**
 * 使Portal容器为空
 * @param {Fiber} current 
 */
function emptyPortalContainer(current) {
  if (!supportsPersistence) {
    return;
  }
  const portal = current.stateNode;
  const { containerInfo } = portal;
  // react-native-renderer
  const emptyChildSet = createContainerChildSet(containerInfo);
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

    if (node.tag === HostComponent || node.tag === HostText) { // 如果当前节点是一个dom节点
      commitNestedUnmounts(finishedRoot, node, renderPriorityLevel);
      // 在所有子节点都卸载之后，现在可以安全地从树中删除节点。
      if (currentParentIsContainer) {
        removeChildFromContainer(currentParent, node.stateNode);
      } else {
        removeChild(currentParent, node.stateNode);
      }
      // 子节点已经遍历，无需再次遍历
    } else if (enableFundamentalAPI && node.tag === FundamentalComponent) {
      const fundamentalNode = node.stateNode.instance;
      commitNestedUnmounts(finishedRoot, node, renderPriorityLevel);
      if (currentParentIsContainer) {
        removeChildFromContainer(currentParent, fundamentalNode);
      } else {
        removeChild(currentParent, fundamentalNode);
      }
    } else if (enableSuspenseServerRenderer && node.tag === DehydratedFragment) {
      if (enableSuspenseCallback) {
        const hydrationCallbacks = finishedRoot.hydrationCallbacks;
        if (hydrationCallbacks !== null) {
          const onDeleted = hydrationCallbacks.onDeleted;
          if (onDeleted) {
            onDeleted(node.state);
          }
        }
      }

      if (currentParentIsContainer) {
        clearSuspenseBoundaryFromContainer(currentParent, node.stateNode);
      } else {
        clearSuspenseBoundary(currentParent, node.stateNode);
      }
    } else if (node.tag === HostPortal) {
      if (node.child !== null) {
        // 当node为Portal时，它自身才是真实的parent
        currentParent = node.stateNode.containerInfo;
        currentParentIsContainer = true;

        // Portal组件内部也会包含其他种类的组件
        node.child.return = node;
        node = node.child;
        continue;
      }
    } else {
      commitUnmount(finishedRoot, node, renderPriorityLevel);
      if (node.child !== null) {
        node.child.return = node;
        node = node.child;
        continue;
      }
    }

    if (node === current) {
      return;
    }

    while (node.sibling === null) {
      if (node.return === null || node.return === current) {
        return;
      }
      node = node.return;
      if (node.tag === HostPortal) {
        // 因为node.tag === HostPortal的情况下，直接将currentParent = node.stateNode.containerInfo;
        // 这里不重设currentParentIsValid为false的话，下一次循环开始时，currentParent会出错。
        currentParentIsValid = false;
      }
    }
    node.sibling.return = node.return;
    node = node.sibling;
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
    commitNestedUnmounts(finishedRoot, current, renderPriorityLevel);
  }
  detachFiber(current);
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
 * suspense 注水后的回调？？TODO:
 * @param {FiberRoot} finishedRoot 
 * @param {Fiber} finishedWork 
 */
function commitSuspenseHydrationCallbacks(finishedRoot, finishedWork) {
  if (!supportsHydration) {
    return;
  }
  const newState = finishedWork.memoizedState;
  if (newState === null) {
    const current = finishedWork.alternate;
    if (current !== null) {
      const prevState = current.memoizedState;
      if (prevState !== null) {
        const suspenseInstance = prevState.dehydrated;
        if (suspenseInstance !== null) {
          commitHydratedSuspenseInstance(suspenseInstance);
          if (enableSuspenseCallback) {
            const hydrationCallbacks = finishedRoot.hydrationCallbacks;
            if (hydrationCallbacks !== null) {
              onHydrated = hydrationCallbacks.onHydrated;
              if (onHydrated) {
                onHydrated(suspenseInstance);
              }
            }
          }
        }
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