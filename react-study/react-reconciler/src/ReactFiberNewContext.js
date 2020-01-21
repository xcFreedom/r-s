import MAX_SIGNED_31_BIT_INT from './maxSigned31BitInt';
import { NoWork } from './ReactFiberExpirationTime';
import { isPrimaryRenderer } from './ReactFiberHostConfig';
import { createCursor, pop, push } from './ReactFiberStack';
import { markWorkInProgressReceivedUpdate } from './ReactFiberBeginWork';

const valueCursor = createCursor(null);

let currentlyRenderingFiber = null;
let lastContextDependency = null;
let lastContextWithAllBitsObserved = null;

let isDisallowedContextReadInDEV = false;

export function resetContextDependencies() {
  // 这是在React产生执行之前调用的，以确保在呈现阶段之外不能调用“readContext”。
  currentlyRenderingFiber = null;
  lastContextDependency = null;
  lastContextWithAllBitsObserved = null;
}

export function pushProvider(providerFiber, nextValue) {
  const context = providerFiber.type._context;

  if (isPrimaryRenderer) {
    push(valueCursor, context._currentValue, providerFiber);

    context._currentValue = nextValue;
  } else {
    push(valueCursor, context._currentValue2, providerFiber);

    context._currentValue2 = nextValue;
  }
}


export function popProvider(providerFiber) {
  const currentValue = valueCursor.current;

  pop(valueCursor, providerFiber);

  const context = providerFiber.type._context;
  if (isPrimaryRenderer) {
    context._currentValue = currentValue;
  } else {
    context._currentValue2 = currentValue;
  }
}

/**
 * 
 * @param {Fiber} workInProgress 
 * @param {ExpirationTime} renderExpirationTime 
 */
export function prepareToReadContext(workInProgress, renderExpirationTime) {
  currentlyRenderingFiber = workInProgress;
  lastContextDependency = null;
  lastContextWithAllBitsObserved = null;

  const dependencies = workInProgress.dependencies;
  if (dependencies !== null) {
    const firstContext = dependencies.firstContext;
    if (firstContext !== null) {
      if (dependencies.expirationTime >= renderExpirationTime) {
        // context list有一个挂起的update。performed work this fiber
        markWorkInProgressReceivedUpdate();
      }
      // 重置workInProgress list
      dependencies.firstContext = null;
    }
  }
}

/**
 * 
 * @param {ReactContext} context 
 * @param {void | number | boolean} observedBits 
 */
export function readContext(context, observedBits) {
  if (lastContextWithAllBitsObserved === context) {
    // Nothing，已经观察了所有事
  } else if (observedBits === false || observedBits === 0) {
    // 不观察任何更新
  } else {
    let resolvedObservedBits;
    if (
      typeof observedBits !== 'number' ||
      observedBits === MAX_SIGNED_31_BIT_INT
    ) {
      // 观察所有更新
      lastContextWithAllBitsObserved = context;
      resolvedObservedBits = MAX_SIGNED_31_BIT_INT;
    } else {
      resolvedObservedBits = observedBits;
    }

    let contextItem = {
      context,
      observedBits: resolvedObservedBits,
      next: null,
    };

    if (lastContextDependency === null) {
      lastContextDependency = contextItem;
      currentlyRenderingFiber.dependencies = {
        expirationTime: NoWork,
        firstContext: contextItem,
        responders: null,
      };
    } else {
      lastContextDependency = lastContextDependency.next = contextItem;
    }
  }

  return isPrimaryRenderer ? context._currentValue : context._currentValue2;
}