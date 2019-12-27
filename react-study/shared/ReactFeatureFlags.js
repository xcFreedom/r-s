export const enableUserTimingAPI = __DEV__;
// 收集Profiler子树的高级计时指标。
export const enableProfilerTimer = __DEV__; // 不考虑开发模式NODE_ENV === 'development';

// 跟踪哪些交互触发每个提交
export const enableSchedulerTracing = true; // __PROFILE__;

// SSR experiments
export const enableSuspenseServerRenderer = false; // __EXPERIMENTAL__;
export const enableSelectiveHydration = false; // __EXPERIMENTAL__;

export const enableSuspenseCallback = false;

export const enableFlareAPI = false;
