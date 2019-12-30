import { enableFlareAPI } from "react-study/shared/ReactFeatureFlags";
import { canUseDOM } from "react-study/shared/ExecutionEnvironment";

export let passiveBrowserEventsSupported = false;

if (enableFlareAPI && canUseDOM) {
  try {
    const options = {};
    Object.defineProperty(options, 'passive', {
      get() {
        passiveBrowserEventsSupported = true
      },
    });
    window.addEventListener('test', options, options);
    window.removeEventListener('test', options, options);
  } catch (e) {
    passiveBrowserEventsSupported = false;
  }
}