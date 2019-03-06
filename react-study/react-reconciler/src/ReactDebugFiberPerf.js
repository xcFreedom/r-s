import { enableUserTimingAPI } from '../../shared/ReactFeatureFlags';

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