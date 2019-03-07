/**
 * 跟踪当前所有者
 * 
 * 当前所有者的组件应该拥有目前正在建造的任何组件。
 */
const ReactCurrentOwner = {
  current: null, // null | Fiber
};

export default ReactCurrentOwner;