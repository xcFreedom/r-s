import { getStackByFiberInDevAndProd } from "./ReactCurrentFiber";

/**
 * 创建已经被捕获的错误
 * @param {any} value 
 * @param {Fiber} source 
 */
export function createCapturedValue(value, source) {
  return {
    value,
    source,
    stack: getStackByFiberInDevAndProd(source),
  };
}