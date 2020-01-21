export const enableUserTimingAPI = false;
// 收集Profiler子树的高级计时指标。
export const enableProfilerTimer = false; // 不考虑开发模式NODE_ENV === 'development';

// 跟踪哪些交互触发每个提交
export const enableSchedulerTracing = true; // __PROFILE__;

// SSR experiments
export const enableSuspenseServerRenderer = false; // __EXPERIMENTAL__;
export const enableSelectiveHydration = false; // __EXPERIMENTAL__;

export const enableSuspenseCallback = false;

// 实验性React Flare事件系统和事件组件支持。
export const enableFlareAPI = false;

// Experimental Host Component support.
export const enableFundamentalAPI = false;

export const enableTrustedTypesIntegration = false;

export const disableJavaScriptURLs = false;

export const disableInputAttributeSyncing = false;

// Experimental Scope support.
export const enableScopeAPI = false;

export const disableSchedulerTimeoutBasedOnReactExpirationTime = false;

export const disableLegacyContext = false;