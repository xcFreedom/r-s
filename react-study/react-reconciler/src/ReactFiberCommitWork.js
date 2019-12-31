import { Passive, NoEffect } from "react-study/shared/ReactSideEffectTags";
import { FunctionComponent, ForwardRef, SimpleMemoComponent, ClassComponent } from "react-study/shared/ReactWorkTags";
import {
  NoEffect as NoHookEffect,
  UnmountPassive,
  MountPassive,
} from "./ReactHookEffectTags";
import { getStackByFiberInDevAndProd } from "./ReactCurrentFiber";
import getComponentName from "react-study/shared/getComponentName";

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
 * 
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