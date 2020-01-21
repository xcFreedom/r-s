import {
  IndeterminateComponent,
  LazyComponent,
  SimpleMemoComponent,
  FunctionComponent,
  ClassComponent,
  HostRoot,
  HostComponent,
  HostText,
  FundamentalComponent,
  HostPortal,
  ForwardRef,
  SuspenseComponent,
  Fragment,
  Profiler,
  Mode,
  ContextProvider,
  ContextConsumer,
  MemoComponent,
  IncompleteClassComponent,
  SuspenseListComponent,
  ScopeComponent,
} from "react-study/shared/ReactWorkTags";
import {
  isContextProvider as isLegacyContextProvider,
  popContext as popLegacyContext,
  popTopLevelContextObject as popTopLevelLegacyContextObject,
} from './ReactFiberContext';
import {
  popHostContainer,
  getHostContext,
  popHostContext,
  getRootHostContainer,
} from "./ReactFiberHostContext";
import { popHydrationState, prepareToHydrateHostInstance } from "./ReactFiberHydrationContext";
import { Update, Ref, DidCapture, NoEffect } from "react-study/shared/ReactSideEffectTags";
import { supportsMutation } from "react-study/react-dom/src/client/ReactDOMHostConfig";
import { enableFundamentalAPI, enableFlareAPI, enableSuspenseServerRenderer } from "react-study/shared/ReactFeatureFlags";
import {
  appendInitialChild,
  prepareUpdate,
  createInstance,
  finalizeInitialChildren,
  createTextInstance,
} from './ReactFiberHostConfig';
import { popSuspenseContext } from "./ReactFiberSuspenseContext";
import { popProvider } from "./ReactFiberNewContext";

function markUpdate(workInProgress) {
  // 将fiber的effectTag用Update更新，这里会讲Placement变更为PlacementAndUpdate;
  workInProgress.effectTag |= Update;
}

function markRef(workInProgress) {
  workInProgress.effectTag |= Ref;
}

supportsMutation === true; // 这里省略了下面几个变量的判断赋值（appendAllChildren/updateHostContainer/updateHostComponent/updateHostText）
/**
 * 添加所有的children
 * @param {Element} parent 
 * @param {Fiber} workInProgress 
 * @param {boolean} needsVisibilityToggle 
 * @param {boolean} isHidden 
 */
function appendAllChildren(parent, workInProgress, needsVisibilityToggle, isHidden) {
  // 我们只创建了顶部fiber，但需要递归其子节点，找到所有的终端节点
  let node = workInProgress.child;
  // 遍历兄弟/child，添加到parent上。
  while (node !== null) {
    // 真实dom元素，直接插入
    if (node.tag === HostComponent || node.tag === HostText) {
      appendInitialChild(parent, node.stateNode);
    } else if (enableFundamentalAPI && node.tag === FundamentalComponent) {
      appendInitialChild(parent, node.stateNode.instance);
    } else if (node.tag === HostPortal) {
      // 如果我们有一个child是Portal组件，那么不遍历它的children
      // 相反我们将直接从Portal中的每个child获取插入
    } else if (node.child !== null) { // 这里不奇怪，进入此分支，说明此fiber不是对应真实的dom元素，只有真实的dom元素才需要添加到parent内
      // 如果node还有子节点，向下递归
      node.child.return = node;
      node = node.child;
      continue;
    }

    if (node === workInProgress) {
      return;
    }

    // 当元素没有child，也没有sibling时，向上返回
    while (node.sibling === null) {
      if (node.return === null || node.return === workInProgress) {
        return;
      }
      node = node.return;
    }

    // 当node没有child，但是还有兄弟节点时，向右递归
    node.sibling.return = node.return;
    node = node.sibling;
  }
}

function updateHostContainer(workInProgress) {}

/**
 * 更新hostComponent。判断新老props是否相等，如果不想等，计算需要更新的payload，设置到workInProgress的updateQueue上。
 * 如果存在更新，为workInProgress的effectTag增加Update变更
 * @param {Fiber} current 
 * @param {Fiber} workInProgress 
 * @param {string} type 
 * @param {Props} newProps 
 * @param {Element} rootContainerInstance 
 */
function updateHostComponent(current, workInProgress, type, newProps, rootContainerInstance) {
  // 如果我们有alternate、意味着这是一个update，我们需要安排一个side-effect更新
  const oldProps = current.memoizedProps;
  if (oldProps === newProps) {
    // mutation模式下，足够了。因为即使children改变了，我们也不会碰这个节点
    return;
  }

  // 如果我们因为有一个children更新而获取了一个更新。我们没有newProps，所以我们必须重用他们
  const instance = workInProgress.stateNode;
  const currentHostContext = getHostContext();
  const updatePayload = prepareUpdate(instance, type, oldProps, newProps, rootContainerInstance, currentHostContext);

  workInProgress.updateQueue = updatePayload;

  // 如果updatePayload指示有更新或有新的ref，我们就将其标记为更新。
  // 所有的work都在commitWork函数中完成
  if (updatePayload) {
    markUpdate(workInProgress);
  }
}

/**
 * 如果hostText需要更新，为workInProgress的effectTag增加Update标记
 * @param {Fiber} current 
 * @param {Fiber} workInProgress 
 * @param {string} oldText 
 * @param {string} newText 
 */
function updateHostText(current, workInProgress, oldText, newText) {
  if (oldText !== newText) {
    markUpdate(workInProgress);
  }
}


/**
 * TODO: 完成工作
 * @param {Fiber} current 
 * @param {Fiber} workInProgress 
 * @param {ExpirationTime} renderExpiratio
 * nTime 
 * @returns {Fiber}
 */
export function completeWork(current, workInProgress, renderExpirationTime) {
  const newProps = workInProgress.pendingProps;

  switch (workInProgress.tag) {
    case IndeterminateComponent:
      break;
    case LazyComponent:
      break;
    case SimpleMemoComponent:
    case FunctionComponent:
      break;
    case ClassComponent: {
      const Component = workInProgress.type;
      if (isLegacyContextProvider(Component)) {
        popLegacyContext(workInProgress);
      }
      break;
    }
    case HostRoot: {
      popHostContainer(workInProgress);
      popTopLevelLegacyContextObject(workInProgress);
      const fiberRoot = workInProgress.stateNode;
      if (fiberRoot.pendingContext) {
        fiberRoot.context = fiberRoot.pendingContext;
        fiberRoot.pendingContext = null;
      }
      // current与workInProgress互为alternate，如果current为null，这意味着还没有进行过初次渲染
      if (current === null || current.child === null) {
        // 如果我们已经hydrated，pop可以删除所有为hydrated的children
        let wasHydrated = popHydrationState(workInProgress);
        if (wasHydrated) {
          // 如果我们已经hydrated，那么我们需要为fiber上的effectList安排一次更新。
          markUpdate(workInProgress);
        }
      }
      updateHostContainer(workInProgress);
      break;
    }
    case HostComponent: {
      popHostContext(workInProgress);
      const rootContainerInstance = getRootHostContainer();
      const type = workInProgress.type;
      // 非初次渲染
      if (current !== null && workInProgress.stateNode != null) {
        updateHostComponent(current, workInProgress, type, newProps, rootContainerInstance);

        if (enableFlareAPI) {
          const prevListeners = current.memoizedProps.listeners;
          const nextListeners = newProps.listeners;
          if (prevListeners !== nextListeners) {
            markUpdate(workInProgress);
          }
        }

        if (current.ref !== workInProgress.ref) {
          markRef(workInProgress);
        }
      } else {
        // 初次
        if (!newProps) {
          break;
        }

        const currentHostContext = getHostContext();
        let wasHydrated = popHydrationState(workInProgress);
        if (wasHydrated) {
          if (prepareToHydrateHostInstance(workInProgress, rootContainerInstance, currentHostContext)) {
            // 如果需要在commit阶段应用对hydrated节点的更改，在此标记
            markUpdate(workInProgress);
          }

          if (enableFlareAPI) {
            const listeners = newProps.listeners;
            // TODO:暂时放弃flare
          }
        } else {
          // 创建dom实例
          let instance = createInstance(type, newProps, rootContainerInstance, currentHostContext, workInProgress);
          // 添加children到实例上
          appendAllChildren(instance, workInProgress, false, false);

          workInProgress.stateNode = instance;

          if (enableFlareAPI) {
            // TODO:暂时放弃flare
          }

          // 某些renderer需要提交时effects才能进行初始mount。(例如DOMrenderer支持某些元素的自动focus)
          // 确保scheduled此类渲染器用于以后的work
          if (finalizeInitialChildren(instance, type, newProps, rootContainerInstance, currentHostContext)) {
            markUpdate(workInProgress);
          }
        }

        if (workInProgress.ref !== null) {
          // 如果宿主节点有ref，需要安排回调
          markRef(workInProgress);
        }
      }
      break;
    }
    case HostText: {
      let nextText = newProps;
      if (current && workInProgress.stateNode != null) {
        const oldText = current.memoizedProps;
        // 如果有alternate，说明这是一个update，需要scheduler去更新effect
        updateHostText(current, workInProgress, oldText, newText);
      } else {
        const rootContainerInstance = getRootHostContainer();
        const currentHostContext = getHostContext();
        let wasHydrated = popHydrationState(workInProgress);
        if (wasHydrated) {
          if (prepareToHydrateHostInstance(workInProgress)) {
            markUpdate(workInProgress);
          }
        } else {
          workInProgress.stateNode = createTextInstance(nextText, rootContainerInstance, currentHostContext, workInProgress);
        }
      }
      break;
    }
    case ForwardRef:
      break;
    case SuspenseComponent: {
      popSuspenseContext(workInProgress);
      const nextState = workInProgress.memoizedState;

      if (enableSuspenseServerRenderer) {
        // 暂时忽略suspense的服务端渲染
      }

      if ((workInProgress.effectTag & DidCapture) !== NoEffect) {
        // 如果已经触发过suspended，re-render
        workInProgress.expirationTime = renderExpirationTime;
        // 不要重置effectList
        return workInProgress;
      }

      const nextDidTimeout = nextState !== null;
      let prevDidTimeout = false;
      if (current === null) { // 说明还未渲染
        if (workInProgress.memoizedProps.fallback !== undefined) {
          popHydrationState(workInProgress);
        }
      } else {
        const prevState = current.memoizedState;

        prevDidTimeout = prevState !== null;
        if (!nextDidTimeout && prevState !== null) {
          // 刚刚从fallback转为children，删除fallback
          const currentFallbackChild = current.child.sibling;
          if (currentFallbackChild !== null) {
            // 删除父fiber的effect list的开头
            const first = workInProgress.firstEffect;
            if (first !== null) {
              workInProgress.firstEffect = currentFallbackChild;
              currentFallbackChild.nextEffect = first;
            } else {
              workInProgress.firstEffect = workInProgress.lastEffect = currentFallbackChild;
              currentFallbackChild.nextEffect = null;
            }
          }
        }
      }

      if (nextDidTimeout & !prevDidTimeout) {
        // TODO: Suspense相关逻辑暂时放弃
      }
    }
    case Fragment:
      break;
    case Mode:
      break;
    case Profiler:
      break;
    case HostPortal:
      popHostContainer(workInProgress);
      updateHostContainer(workInProgress);
      break;
    case ContextProvider:
      popProvider(workInProgress);
      break;
    case ContextConsumer:
      break;
    case MemoComponent:
      break;
    case IncompleteClassComponent: {
      // 与类组件大小写相同。我把它放在这里，这样标签是连续的，以确保这个开关被编译成跳转表。
      const Component = workInProgress.type;
      if (isLegacyContextProvider(Component)) {
        popLegacyContext(workInProgress);
      }
      break;
    }
    case SuspenseListComponent: {
      // TODO: Suspense相关逻辑暂时放弃      
    }
    case FundamentalComponent: {
      // 忽略，暂时不明白Fundamental是怎么使用的
      break;
    }
    case ScopeComponent: {
      // 忽略，暂时不明白ScopeComponent怎么使用的.
      break;
    }
    default:
      break;
  }

  return null;
}