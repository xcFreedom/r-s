/**
 *  1. 入口是ReactDOM.render，所以直接寻找ReactDOM.render的实现
 *  
 */
/*
type Root = {
  render(children: ReactNodeList, callback: ?() => mixed): Work,
  unmount(callback: ?() => mixed): Work,
  legacy_renderSubtreeIntoContainer(
    parentComponent: ?React$Component<any, any>,
    children: ReactNodeList,
    callback: ?() => mixed,
  ): Work,
  createBatch(): Batch,

  _internalRoot: FiberRoot,
}
*/

import {
  ELEMENT_NODE,
  COMMENT_NODE,
  DOCUMENT_NODE,
  DOCUMENT_FRAGMENT_NODE,
} from '../shared/DOMProperty';

import { ROOT_ATTRIBUTE_NAME } from '../shared/DOMProperty';
import {
  createContainer,
  unbatchedUpdates,
  updateContainer,
} from '../../../react-reconciler/inline.dom';

/**
 * 渲染子树进入容器 
 * @param {?React$Component<any, any>} [parentComponent] 
 * @param {ReactNodeList} children 
 * @param {DOMContainer} container 
 * @param {boolean} forceHydrate 
 * @param {Function} [callback] 
 */
function legacyRenderSubtreeIntoContainer(
  parentComponent, // null
  children, // <App />
  container, // DivElement
  forceHydrate, // false
  callback // undefined
) {
  let root = container._reactRootContainer;
  // 页面初次渲染是，container未添加标记，此时container._reactRootContainer为undefined，此时forceHydrate为false
  if (!root) {
     // ReactDOM.render传入的container是html元素，走这里
     // 预测是将container作为项目的根组件处理
    root = container._reactRootContainer = legacyCreateRootFromDOMContainer(container, forceHydrate);
    if (typeof callback === 'function') {
      const originalCallback = callback;
      callback = function() {
        const instance = getPublicRootInstance(root._internalRoot);
        originalCallback.call(instance);
      };
    }

    unbatchedUpdates(() => {
      if (parentComponent != null) {
        root.legacy_renderSubtreeInfoContainer(
          parentComponent,
          children,
          callback,
        );
      } else {
        root.render(children, callback);
      }
    });

    
  } else {

  }
}

/**
 * 从DOM容器中创建root
 * @param {DOMContainer} container 
 * @param {boolean} forceHydrate
 * @return {Root} Root
 */
function legacyCreateRootFromDOMContainer(container, forceHydrate) {
  const shouldHydrate = forceHydrate || shouldHydrateDueToLegacyHeuristic(container);
  // 页面初始化时一般情况，shouldHydrate为false
  if (!shouldHydrate) {
    // 清除container的children
    let rootSibling;
    while ((rootSibling = container.lastChild)) {
      container.removeChild(rootSibling);
    }
  }

  // 默认根节点不是异步的
  const isConcurrent = false;
  return new ReactRoot(container, isConcurrent, shouldHydrate);
}

/**
 * container是否为React的根组件
 * @param {*} container 
 */
function shouldHydrateDueToLegacyHeuristic(container) { 
  const rootElement = getReactRootElementInContainer(container);
  // rootElement存在，且nodeType是元素节点，且有属性  data-reactroot
  return !!(
    rootElement &&
    rootElement.nodeType === ELEMENT_NODE &&
    rootElement.hasAttribute(ROOT_ATTRIBUTE_NAME)
  )
}

/**
 * 从container中获取React的根容器
 * @param {HTMLElement} container
 */
function getReactRootElementInContainer(container) { // DivElement
  if (!container) {
    return null;
  }

  if (container.nodeType === DOCUMENT_NODE) {
    return container.documentElement;
  } else {
    return container.firstChild;
  }
}

//----------------------------------------------------------------- ReactWork start ------------------------------------------------
/**
 * type Work = {
 *  then(onCommit: () => mixed): void,
 *  _onCommit: () => void;
 *  _callbacks: Array<() => mixed> | null,
 *  _didCommit: boolean,
 * };
 */
function ReactWork() {
  this._callbacks = null;
  this._didCommit = false;
  // 通过使用Work对象列表替换更新队列中的回调，避免需要绑定。
  this._onCommit = this._onCommit.bind(this);
}

/**
 * 如果已经执行过commit，则立即执行onCommit，否则将onCommit添加到this._callbacks中
 * @param {Function} onCommit () => mixed
 * @returns void
 */
ReactWork.prototype.then = function(onCommit) {
  if (this._didCommit) {
    onCommit();
    return;
  }
  let callbacks = this._callbacks;
  if (callbacks === null) {
    callbacks = this._callbacks = [];
  }
  callbacks.push(onCommit);
}

ReactWork.prototype._onCommit = function() {
  if (this._didCommit) {
    return;
  }
  this._didCommit = true;
  const callbacks = this._callbacks;
  if (callbacks === null) {
    return;
  }
  for (let i = 0; i < callbacks.length; i++) {
    callbacks[i]();
  }
}

//----------------------------------------------------------------- ReactWork end --------------------------------------------------

//----------------------------------------------------------------- ReactRoot start ------------------------------------------------

function ReactRoot(container, isConcurrent, hydrate) {
  const root = createContainer(container, isConcurrent, hydrate); // 创建根结点，也就是创建rootFiber
  this._internalRoot = root;
}

/**
 * @param {ReactNodeList} children
 * @param {Function} [callback] () => mixed;
 * @returns {Work}
 */
ReactRoot.prototype.render = function(children, callback) {
  const root = this._internalRoot;
  const work = new ReactWork();
  callback = callback === undefined ? null : callback;
  if (callback !== null) {
    work.then(callback);
  }
  updateContainer(children, root, null, work._onCommit);
  return work;
}

//----------------------------------------------------------------- ReactRoot end ---------------------------------------------------

const ReactDOM = {
  /**
   * React内部实现用了很多基于Flow的类型系统，对Flow的语法不了解，很多type定义更是找不到位置。。。
   * @param {*} element   React$Element<any>
   * @param {*} container DOMContainer
   * @param {*} callback  ?Function
   * @example ReactDOM.render(<App />, document.getElementById('app'));
   */
  render(element, container, callback) { // React组件入口
    return legacyRenderSubtreeIntoContainer( // 从container开始渲染子树
      null,
      element, // <App />
      container, // DivElement
      false,
      callback // undefined
    );
  }
};


export default ReactDOM;