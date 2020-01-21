# Stack

在React的更新过程中有一个`stack`模块：
* react-reconciler/ReactFiberHydrationContext.js
* react-reconciler/ReactFiberHostContext.js
* react-reconciler/ReactFiberStack.js

遍历每个节点的过程中，`stack`扮演着存储`context`的橘色，它的构成是这样的：

```
// ReactFiberStack.js

const valueStack = [];
let index = -1;

function createCursor(defaultValue) {
  return {
    current: defaultValue,
  };
}

function isEmpty() {
  return index === -1;
}

function pop(cursor, fiber) {
  if (index < 0) {
    return;
  }

  cursor.current = valueStack[index];
  valueStack[index] = null;

  index--
}

function push(cursor, value, fiber) {
  index++;

  valueStack[index] = cursor.current;

  cursor.current = value;
}
```

所有的内容都会存储在`ReactFiberStack`的`valueStack`数组上。

这个数组包含了哪些cursor的数据呢？

1. `ReactFiberContext`的`contextStackCursor`、`didPerformWorkStackCursor`
2. `ReactFiberHostContext`的`contextStackCursor`、`contextFiberStackCursor`、`rootInstanceStackCursor`
3. `ReactFiberNewContext`的`valueCursor`
4. `ReactFiberSuspenseContext`的`suspenseStackCursor`

`valueStack`这个唯一的数组要存储这些不怎么相关的数据。

看上面代码可以知道，数据入出栈的顺序完全由`index`来控制。
所以React防止出现错乱的方式是**每个节点在`beginWork`的时候入栈，在`completeUnitOfWork`的时候出栈，严格按照遍历树的顺序**


## ReactFiberContext

`ReactFiberContext`里面的`contextStackCursor`、`didPerformWorkStackCursor`对应的是`childContext`的使用方式。

现有的代码里面使用时，会判断组件是否为ClassCompoent，而且是否存在childContextTypes。

使用`ReactFiberContext`内部函数时，都会为其加上legacy字样.

#### contextStackCursor

记录当前组件和他的父树一起提供给子树的`childContext`对象，初始默认为`emptyContextObject {}`

对`FiberRoot`会执行第一次`push`，除非自行调用`renderSubtreeIntoContainer`，不然`root`的`context`都是`{}`，除了初次渲染，`push`的值都是`false`，表明目前`context`没有变化
```
// 只有beginWork会通过pushHostRootContext或者updateHostRoot调用
function pushTopLevelContextObject(fiber, context, didChange) {
  push(contextStackCursor, context, fiber);
  push(didPerformWorkStackCursor, didChange, fiber);
}
```

之后只有`ClassComponent`能够提供`childContext`
在`updateClassComponent`、`mountIncompleteClassComponent`、`beginWork`的过程会调用`pushContextProvider`来推入新的子树`context`对象

```
function pushContextProvider(workInProgress) {
  const instance = workInProgress.stateNode;
  const memoizedMergedChildContext = (instance && instace.__reactInternalMemoizedMergedChildContext) || emptyContextObject;

  previousContext = contextStackCursor.current;
  push(contextStackCursor, memoizedMergeChildContext, workInProrgess);
  push(didPerformWorkStackCursor, didPerformWorkStackCursor.current, workInProgress);

  return true;
}
```

可以看到这里只是从`instance.__reactInternalMemoizedMergedChildContext`读取对象，但是