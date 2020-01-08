export const isDevToolsPersent = false; // 不考虑开发模式

export function onCommitUnmount(fiber) {
  if (typeof onCommitFiberUnmount === 'function') {
    onCommitFiberUnmount(fiber);
  }
}