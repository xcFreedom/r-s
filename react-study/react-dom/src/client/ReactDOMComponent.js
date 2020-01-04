function noop() {}

export function trapClickOnNonInteractiveElement(node) {
  // Mobile Safari无法在非交互元素上正确触发冒泡click事件，这意味着委派的click listener不会触发。
  // 解决此错误的方法是在目标节点上附加一个空的click listener。
  // 只需使用onclick属性设置它，这样我们就不必为它管理任何簿记。不确定在删除侦听器时是否需要清除它。
  node.onclick = noop;
}