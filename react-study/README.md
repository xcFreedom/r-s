## React源码尝试解读

### 思路
  ```react```源码本身不容易查阅，facebook开发```react```时，内部可能提供了一套文件路径机制。其次文件拆分细致，不了解整体架构的前提下，实在是过于困难，思路: 在我们使用```react```的时候，整个项目的入口是```ReactDOM.render```，基于这个思路，去探究```react```源码实现，不知道是不是一个可行方案。

### 项目结构

|-- create-subscription   // 组件里订阅额外数据的工具
|-- events                // React事件相关
|-- react-art             // 画图相关
|-- react-dom             // ReactDOM
|-- react-reconciler      // React调制器
|-- react-scheduler       // 规划React初始化，更新等等
|-- react-test-renderer   // 实验性的React渲染器
|-- shared                // 公共代码
|-- simple-cache-provider // 为React应用提供缓存

### ReactDOM.render

根组件进入流程

```
  ReactDOM.render(
    <App />,
    document.getElementById('app'),
  )
```

1.  ```
      ReactDOM.render(element: 根组件, container: 根元素) => legacyRenderSubtreeIntoContainer(null, element, container, false, callback)
    ```
2.  ```
      // ReactDOM.js
      legacyRenderSubtreeIntoContainer(parentComponent: null, children: 根组件, container: 根元素, forceHydrate: false, callback);
        let root = container._reactRootContainer; // => undefined
        root = container._reactRootContainer = legacyCreateRootFromDOMContainer(container, forceHydrate)
    ```
    1.  ```
          // ReactDON.js
          legacyCreateRootFromDOMContainer(container: 根元素, forceHydrate: false)
            const shouldHydrate = forceHydrate || shouldHydrateDueToLegacyHeuristic(container); // => false
            if (!shouldHydrate) {
              let rootSibling;
              while ((rootSibling = container.lastChild)) { // 清空元素
                container.removeChild(rootSibling);
              }
            }
            // 默认情况下，不开启异步模式
            const isConcurrent = false;
            return new ReactRoot(container, isConcurrent, shouldHydrate);
        ```

        1.  ```
              // 是否由遗留元素确认开启hydrate
              shouldHydrateDueToLegacyHeuristic(container: 根元素)
                const rootElement = getReactRootElementInContainer(container); // => null
                return !!(
                  rootElement &&
                  rootElement.nodeType === ELEMENT_NODE &&
                  rootElement.hasAttribute(ROOT_ATTRIBUTE_NAME)
                )

            ```

            1.  ```
                  getReactRootElementInContainer(container: 根元素)
                    if (container.nodeType === DOCUMENT_NODE) {
                      return container.documentElement;
                    } else {
                      return container.firstChild;
                    }
                ```
    2.  ```
          // ReactDOM.js
          ReactRoot(container: 根元素, isConcurrent: false, hydrate: false)
            const root = createContainer(container, isConcurrent, hydrate);
            this._internalRoot = root;
        ```

        1.  ```
              // react-reconciler -> ReactFiberReconciler.js 创建container
              createContainer(containerInfo: 根元素, isConcurrent: false, hydrate: false)
                return createFiberRoot(containerInfo, isConcurrent, hydrate);
            ```

            1.  ```
                  // react-reconciler -> ReactFiberRoot.js 创建根Fiber
                  createFiberRoot(containerInfo: 根元素, isConcurrent: false, hydrate: false)
                    const uninitializedFiber = createHostRootFiber(isConcurrent); // FiberNode

                    let root;
                    if (enableSchedulerTracing) {

                    }

                ```

                1.  ```
                      // react-reconciler -> ReactFiber.js
                      createHostRootFiber(isConcurrent: false) 创建主机根Fiber
                        // ConcurrentMode -> 0b001, StrictMode -> 0b010, NoContext: 0b000
                        let mode = isConcurrent ? (ConcurrentMode | StrictMode) : NoContext; // => 0b000
                        // HostRoot -> 3, 主树的根，可嵌套在另一个节点中
                        return createFiber(HostRoot, null, null, mode);
                    ```
                2.  ```
                      // react-reconciler -> ReactFiber.js 创建Fiber
                      createFiber(tag: 3, pendingProps: null, key: null, mode: 0b000)
                        return new FiberNode(tag, pendingProps, key, mode);
                    ```
                3.  ```
                      // react-reconciler -> ReactFiber.js Fiber节点类
                      FiberNode(tag: 3, pendingProps: null, key: null, mode: 0b000)
                        // Instance
                        this.tag                    = tag; // 3
                        this.key                    = key; // null
                        this.elementType            = null;
                        this.type                   = null;
                        this.stateNode              = null;

                        // Fiber
                        this.return                 = null;
                        this.child                  = null;
                        this.sibling                = null;
                        this.index                  = 0;
                        
                        // ref
                        this.ref                    = null;

                        // update
                        this.pendingProps           = pendingProps; // null
                        this.memoizedProps          = null;
                        this.updateQueue            = null;
                        this.memoizedState          = null;
                        this.firstContextDependency = null; // 第一个上下文依赖

                        this.mode                   = mode; // 0b000

                        // effects 效果
                        this.effectTag              = NoEffect; // 0b000000000000
                        this.nextEffect             = null;
                        this.firstEffect            = null;
                        this.lastEffect             = null;
                        
                        this.expirationTime         = NoWork; // 0
                        this.childExpirationTime    = NoWork; // 0

                        this.alternate              = null;

                        if (enableProfilerTimer) {
                          this.actualDuration       = Number.NaN;
                          this.actualStartTime      = Number.NaN;
                          this.selfBaseDuration     = Number.NaN;
                          this.treeBaseDuration     = Number.NaN;

                          this.actualDuration       = 0;
                          this.actualStartTime      = 0;
                          this.selfBaseDuration     = 0;
                          this.treeBaseDuration     = 0;
                        }

                    ```