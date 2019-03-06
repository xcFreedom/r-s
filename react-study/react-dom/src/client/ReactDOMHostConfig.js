export {
  unstable_now as now,
  unstable_cancelCallback as cancelDeferredCallback,
} from '../../../scheduler';

export const noTimeout = -1;

export function getPublicInstance(instance) {
  return instance;
}

export const cancelPassiveEffects = cancelDeferredCallback;