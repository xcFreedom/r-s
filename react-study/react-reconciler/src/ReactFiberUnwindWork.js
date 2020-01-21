import {
  ClassComponent,
  HostRoot,
  HostComponent,
  HostPortal,
  ContextProvider,
  SuspenseComponent,
  DehydratedSuspenseComponent,
  IncompleteClassComponent,
  SuspenseListComponent,
} from '../../shared/ReactWorkTags';
import { popHostContainer, popHostContext } from './ReactFiberHostContext';
import {
  popContext as popLegacyContext,
  popTopLevelContextObject as popTopLevelLegacyContextObject,
  isContextProvider as isLegacyContextProvider,
} from './ReactFiberContext';
import { popSuspenseContext } from './ReactFiberSuspenseContext';
import { popProvider } from './ReactFiberNewContext';
import { ShouldCapture, DidCapture } from 'react-study/shared/ReactSideEffectTags';

/**
 * 解除work
 * @param {Fiber} workInProgress 
 * @param {ExpirationTime} renderExpirationTime 
 */
export function unwindWork(workInProgress, renderExpirationTime) {
  switch (workInProgress.tag) {
    case ClassComponent: {
      const Component = workInProgress.type;
      // 如果这个Component提供了context给child
      if (isLegacyContextProvider(Component)) {
        // Component解除时，还需要从performWorkStack和contextStack中移除此fiber
        popLegacyContext(workInProgress);
      }
      const effectTag = workInProgress.effectTag;
      if (effectTag & ShouldCapture) {
        workInProgress.effectTag = (effectTag & ~ShouldCapture) | DidCapture;
        return workInProgress;
      }
      return null;
    }
    case HostRoot: {
      popHostContainer(workInProgress);
      popTopLevelLegacyContextObject(workInProgress);
      const effectTag = workInProgress.effectTag;

      workInProgress.effectTag = (effectTag & ~ShouldCapture) | DidCapture;
      return workInProgress;
    }
    case HostComponent: {
      popHostContext(workInProgress);
      return null;
    }
    case SuspenseComponent: {
      popSuspenseContext(workInProgress);
      const effectTag = workInProgress.effectTag;
      if (effectTag & ShouldCapture) {
        workInProgress.effectTag = (effectTag & ~ShouldCapture) | DidCapture;
        // Captured a suspense effect. Re-render the boundary.
        return workInProgress;
      }
      return null;
    }
    case SuspenseListComponent: {
      popSuspenseContext(workInProgress);
      // SuspenseList doesn't actually catch anything. It should've been
      // caught by a nested boundary. If not, it should bubble through.
      return null;
    }
    case HostPortal:
      popHostContainer(workInProgress);
      return null;
    case ContextProvider:
      popProvider(workInProgress);
      return null;
    default:
      return null;
  }
}

/**
 * 解除中断工作
 * @param {Fiber} interruptedWork 
 */
function unwindInterruptedWork(interruptedWork) {
  switch (interruptedWork.tag) {
    case ClassComponent: {
      const childContextTypes = interruptedWork.type.childContextTypes;
      if (childContextTypes !== null && childContextTypes !== undefined) {
        popLegacyContext(interruptedWork);
      }
      break;
    }
    case HostRoot: {
      popHostContainer(interruptedWork);
      popTopLevelLegacyContextObject(interruptedWork);
      break;
    }
    case HostComponent: {
      popHostContext(interruptedWork);
      break;
    }
    case HostPortal: {
      popHostContainer(interruptedWork);
      break;
    }
    case SuspenseComponent:
      popSuspenseContext(interruptedWork);
      break;
    case SuspenseListComponent:
      popSuspenseContext(interruptedWork);
      break;
    case ContextProvider:
      popProvider(interruptedWork);
      break;
    default:
      break;
  }
}

export {
  unwindInterruptedWork
};