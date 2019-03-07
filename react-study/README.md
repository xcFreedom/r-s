1. ReactDOM.js作为入口，调用```ReactDOM.render```.
2. ```ReactDOM.render```内调用```legacyRenderSubtreeIntoContainer```.
3. ```legacyRenderSubtreeIntoContainer```内调用```legacyCreateRootFromDOMContainer```从dom节点中创建```ReactRoot```.
4. ```legacyCreateRootFromDOMContainer```清理dom节点，返回```ReactRoot```的实例
5. ```ReactRoot```内调用```createContainer```创建```FiberRoot```，挂载到自身的```_internalRoot```属性上。
6. ```createContainer```是```createFiberRoot```的一层包装。
7. ```createFiberRoot```构造```FiberRoot```对象，调用```createHostRootFiber```创建一个```Fiber```对象作为```host root```。并把```FiberRoot```中的```current```属性指向这个```Fiber```，```Fiber```的```stateNode```指向```FiberRoot```。
8. ```legacyRenderSubtreeInfoContainer```在创建```ReactRoot```完成之后，调用```ReactRoot.render```开启初次页面渲染.
9. ```ReactRoot.render```中，首先创建一个```ReactWork```，然后调用```updateContainer```开始渲染过程。
10. ```updateContainer```中拿到```host root Fiber```，计算```ExpirationTime```，然后调用```updateContainerAtExpirationTime```
11. ```updateContainerAtExpirationTime```调用```getContextForSubtree```计算```context```，更新```FiberRoot```的```context```，然后调用```scheduleRootUpdate```。
12. ```scheduleRootUpdate```开始调度更新，首先根据```updateContainer```计算的```ExpirationTime```，调用```createUpdate```，创建一个```Update```。然后调用```enqueueUpdate```把```host root Fiber```和```Update```传入。
13. ```enqueueUpdate```根据```Fiber```的```alternate```和```updateQueue```创建两个更新队列