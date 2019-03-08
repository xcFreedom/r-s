export const Pending  = 0;
export const Resolved = 1;
export const Rejected = 2;

export function refineResolvedLazyComponent(lazyComponent) {
  return lazyComponent._status === Resolved ? lazyComponent._result : null;
}