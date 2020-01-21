import { enableUserTimingAPI } from '../../shared/ReactFeatureFlags';
import getComponentName from '../../shared/getComponentName';
import {
  HostRoot,
  HostComponent,
  HostText,
  HostPortal,
  Fragment,
  ContextProvider,
  ContextConsumer,
  Mode,
} from '../../shared/ReactWorkTags';

const reactEmoji = '\u269B';
const warningEmoji = '\u26D4';
const supportsUserTiming = 
  typeof performance !== 'undefined' &&
  typeof performance.mark === 'function' &&
  typeof performance.clearMarks === 'function' &&
  typeof performance.measuer === 'function' &&
  typeof performance.clearMeasures === 'function';

// 跟踪当前的fiber，以便我们知道在暂停时展开的路径
let currentFiber = null

// 如果我们处在用户代码中，那么它是哪一个fiber和方法？重用'currentFiber'会让人困惑，因为用户代码fiber在commit阶段也会发生变化，但是我们不需要解开它（因为commit阶段的生命周期与tree不相似）
let currentPhase = null;
let currentPhaseFiber = null;
// 生命周期钩子更新了吗？这通常是一个性能问题，因此我们将跟踪它，并将其包括在报告中。跟踪级联更新引起的提交。
let isCommiting = false;
let hasScheduledUpdateInCurrentCommit = false;
let hasScheduledUpdateInCurrentPhase = false;
let commitCountInCurrentWorkLoop = 0;
let effectCountInCurrentCommit = 0;
let isWaitingForCallback = false;

// 在提交阶段，我们仅针对每个方法名显示一次测量，以避免延长提交阶段的测量开销。
const labelsInCurrentCommit = new Set();

const formatMarkName = (markName) => {
  return `${reactEmoji} ${markName}`;
};

const formatLabel = (label, warning) => {
  const prefix = warning ? `${warningEmoji} ` : `${reactEmoji} `;
  const suffix = warning ? ` Warning: ${warning}` : '';
  return `${prefix}${label}${suffix}`;
};

const beginMark = (markName) => {
  performance.mark(formatMarkName(markName));
};

const clearMark = (markName) => {
  performance.clearMarks(formatMarkName(markName));
};

const endMark = (label, markName, warning) => {
  const formattedMarkName = formatMarkName(markName);
  const formattedLabel = formatLabel(label, warning); 
  try {
    performance.measure(formattedLabel, formattedMarkName);
  } catch (err) {

  }

  performance.clearMarks(formattedMarkName);
  performance.clearMeasures(formattedLabel);
}

const getFiberMarkName = (label, debugID) => {
  return `${label} (#${debugID})`;
};

const getFiberLabel = (componentName, isMounted, phase) => {
  if (phase === null) {
    // 复合组件总测量时间
    return `${componentName} [${isMounted ? 'update' : 'mount'}]`;
  } else {
    // 复合组件方法
    return `${componentName}.${phase}`;
  }
};

const beginFiberMark = (fiber, phase) => {
  const componentName = getComponentName(fiber.type) || 'Unknown';
  const debugID = fiber._debugID;
  const isMounted = fiber.alternate !== null;
  const label = getFiberLabel(componentName, isMounted, phase);

  if (isCommiting && labelsInCurrentCommit.has(label)) {
    // 在提交阶段，我们不显示重复的标签，因为每个度量都有固定的开销，并且我们不想将提交阶段扩展到不必要的范围之外。
    return false;
  }
  labelsInCurrentCommit.add(label);

  const markName = getFiberMarkName(label, debugID);
  beginMark(markName);
  return true;
};

const clearFiberMark = (fiber, phase) => {
  const componentName = getComponentName(fiber.type) || 'Unknown';
  const debugID = fiber._debugID;
  const isMounted = fiber.alternate !== null;
  const label = getFiberLabel(componentName, isMounted, phase);
  const markName = getFiberMarkName(label, debugID);
  clearMark(markName);
};

const endFiberMark = (fiber, phase, warning) => {
  const componentName = getComponentName(fiber.type) || 'Unknown';
  const debugID = fiber._debugID;
  const isMounted = fiber.alternate;
  const label = getFiberLabel(componentName, isMounted, phase);
  const markName = getFiberMarkName(label, debugID);
  endMark(label, markName, warning);
};

/**
 * 
 * @param {Fiber} fiber 
 * @returns {Boolean}
 */
const shouldIgnoreFiber = (fiber) => {
  // Host Component应该在当前时间线被跳过
  switch (fiber.tag) {
    case HostRoot:
    case HostComponent:
    case HostText:
    case HostPortal:
    case Fragment:
    case ContextProvider:
    case ContextConsumer:
    case Mode:
      return true;
    default:
      return false;
  }
}

const clearPendingPhaseMeasurement = () => {
  if (currentPhase !== null && currentPhaseFiber !== null) {
    clearFiberMark(currentPhaseFiber, currentPhase);
  }
  currentPhaseFiber = null;
  currentPhase = null;
  hasScheduledUpdateInCurrentPhase = false;
}

const resumeTimersRecursively = (fiber) => {
  if (fiber.return !== null) {
    resumeTimersRecursively(fiber.return);
  }
  if (fiber._debugsIsCurrentlyTiming) {
    beginFiberMark(fiber, null);
  }
};

const resumeTimers = () => {
  // 恢复在上次延迟循环期间活动的所有度量
  if (currentFiber !== null) {
    resumeTimersRecursively(currentFiber);
  }
};

export function recordEffect() {
  if (enableUserTimingAPI) {
    effectCountInCurrentCommit++;
  }
}

export function recordScheduleUpdate() {
  if (enableUserTimingAPI) {
    if (isCommiting) {
      hasScheduledUpdateInCurrentCommit = true;
    }
    if (
      currentPhase !== null &&
      currentPhase !== 'componentWillMount' &&
      currentPhase !== 'componentWillReceiveProps'
    ) {
      hasScheduledUpdateInCurrentPhase = true;
    }
  }
}

export function startWorkTimer(fiber) {
  if (enableUserTimingAPI) {
    if (!supportsUserTiming || shouldIgnoreFiber(fiber)) {
      return;
    }
  }
}

export function stopWorkTimer(fiber) {
  if (enableUserTimingAPI) {
    // 暂时忽略
  }
}

export function startPhaseTimer(fiber, phase) {
  if (enableUserTimingAPI) {
    if (!supportsUserTiming) {
      return;
    }
    clearPendingPhaseMeasurement();
    if (!beginFiberMark(fiber, phase)) {
      return;
    }
    currentPhaseFiber = fiber;
    currentPhase = phase;
  }
}

export function stopPhaseTimer() {
  if (enableUserTimingAPI) {
    if (!supportsUserTiming) {
      return;
    }
    if (currentPhase !== null && currentPhaseFiber !== null) {
      const warning = hasScheduledUpdateInCurrentPhase
        ? 'Scheduled a cascading update'
        : null;
      endFiberMark(currentPhaseFiber, currentPhase, warning);
    }
    currentPhase = null;
    currentPhaseFiber = null;
  }
}

/**
 * 
 * @param {Fiber | null} nextUnitOfWork 
 */
export function startWorkLoopTimer(nextUnitOfWork) {
  if (enableUserTimingAPI) {
    currentFiber = nextUnitOfWork;
    if (!supportsUserTiming) {
      return;
    }
    commitCountInCurrentWorkLoop = 0;

    // 这是最高级的调用，其他测量在其内部执行
    beginMark('(React Tree Reconciliation)');
    // 恢复在最后一个循环中进行的所有度量
    resumeTimers();
  }
}

export function startCommitTimer() {
  if (enableUserTimingAPI) {
    if (!supportsUserTiming) {
      return;
    }
    isCommiting = true;
    hasScheduledUpdateInCurrentCommit = false;
    labelsInCurrentCommit.clear();
    beginMark('(Committing Changes)');
  }
}

export function stopCommitTimer() {
  if (enableUserTimingAPI) {
    if (!supportsUserTiming) {
      return;
    }

    let warning = null;
    if (hasScheduledUpdateInCurrentCommit) {
      warning = 'Lifecycle hook scheduled a cascading update';
    } else if (commitCountInCurrentWorkLoop > 0) {
      warning = 'Caused by a cascading update in earlier commit';
    }

    hasScheduledUpdateInCurrentCommit = false;
    commitCountInCurrentWorkLoop++;
    isCommitting = false;
    labelsInCurrentCommit.clear();

    endMark('(Committing Changes)', '(Committing Changes)', warning);
  }
}

export function startCommitSnapshotEffectsTimer() {
  if (enableUserTimingAPI) {
    if (!supportsUserTiming) {
      return;
    }
    effectCountInCurrentCommit = 0;
    beginMark('(Committing Snapshot Effects)');
  }
}

export function stopCommitSnapshotEffectsTimer() {
  if (enableUserTimingAPI) {
    if (!supportsUserTiming) {
      return;
    }
    const count = effectCountInCurrentCommit;
    effectCountInCurrentCommit = 0;
    endMark(
      `(Committing Snapshot Effects: ${count} Total)`,
      '(Committing Snapshot Effects)',
      null,
    );
  }
}

export function startCommitHostEffectsTimer() {
  if (enableUserTimingAPI) {
    if (!supportsUserTiming) {
      return;
    }
    effectCountInCurrentCommit = 0;
    beginMark('(Committing Host Effects)')
  }
}

export function stopCommitHostEffectsTimer() {
  if (enableUserTimingAPI) {
    if (!supportsUserTiming) {
      return;
    }
    const count = effectCountInCurrentCommit;
    effectCountInCurrentCommit = 0;
    endMark(
      `(Committing Host Effects: ${count} Total)`,
      '(Committing Host Effects)',
      null,
    );
  }
}

export function startCommitLifeCyclesTimer() {
  if (enableUserTimingAPI) {
    if (!supportsUserTiming) {
      return;
    }
    effectCountInCurrentCommit = 0;
    beginMark('(Calling Lifecycle Methods)')
  }
}

export function stopCommitLifeCyclesTimer(): void {
  if (enableUserTimingAPI) {
    if (!supportsUserTiming) {
      return;
    }
    const count = effectCountInCurrentCommit;
    effectCountInCurrentCommit = 0;
    endMark(
      `(Calling Lifecycle Methods: ${count} Total)`,
      '(Calling Lifecycle Methods)',
      null,
    );
  }
}