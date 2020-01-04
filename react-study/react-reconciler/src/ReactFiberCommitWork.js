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
} from "react-study/shared/ReactWorkTags";
import {
  NoEffect as NoHookEffect,
  UnmountPassive,
  MountPassive,
  UnmountSnapshot,
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
} from './ReactFiberHostConfig';
import { enableFundamentalAPI } from "react-study/shared/ReactFeatureFlags";

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
 * 
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
 * 
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
 * 重置textContent
 * @param {Fiber} current 
 */
export function commitResetTextContent(current) {
  if (!supportsMutation) {
    return;
  }
  resetTextContent(current.stateNode);
}