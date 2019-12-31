import { getStackByFiberInDevAndProd } from "./ReactCurrentFiber";

export function createCapturedValue(value, source) {
  return {
    value,
    source,
    stack: getStackByFiberInDevAndProd(source),
  };
}