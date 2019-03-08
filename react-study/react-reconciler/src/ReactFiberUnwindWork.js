import {
  ClassComponent,
  HostRoot,
  HostComponent,
  HostPortal,
  ContextProvider,
  SuspenseComponent,
  DehydratedSuspenseComponent,
  IncompleteClassComponent,
} from '../../shared/ReactWorkTags';
import { popHostContainer } from './ReactFiberHostContext';
import {
  popContext as popLegacyContext,
  popTopLevelContextObject as popTopLevelLegacyContextObject,
} from './ReactFiberContext';

/**
 * 解除中断工作
 * @param {Fiber} interruptedWoek 
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
  }
}

export {
  unwindInterruptedWork
};