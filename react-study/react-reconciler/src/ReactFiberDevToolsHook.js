export const isDevToolsPersent = false; // 不考虑开发模式

export function injectInternals(internals) {
  // devTools
}

/**
 * 
 * @param {FiberRoot} root 
 * @param {ExpirationTime} expirationTime 
 */
export function onCommitRoot(root, expirationTime) {
  if (typeof onCommtiFiberRoot === 'function') {
    onCommtiFiberRoot(root, expirationTime);
  }
}

export function onCommitUnmount(fiber) {
  if (typeof onCommitFiberUnmount === 'function') {
    onCommitFiberUnmount(fiber);
  }
}