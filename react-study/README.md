hydrate：注水，ssr时服务器输出字符串，而浏览器需要根据字符串完成react的初始化工作，这个过程就是hydrate。
hydrate 描述的是 ReactDOM 复用 ReactDOMServer 服务端渲染的内容时尽可能保留结构，并补充事件绑定等 Client 特有内容的过程。

dehydrate：脱水，一般指的是服务器端渲染时，准备纯数据的过程，这些数据随HTML一起发送给浏览器。


```
interface BaseFiberRoot {
  // root节点
  containerInfo: any;
  // 当前应用对应的fiber，就是RootFiber
  current: Fiber;

  /**
  * 以下的优先级是用来区分
  * 1) 没有提交(committed)的任务
  * 2) 没有提交的挂起任务
  * 3) 没有提交的可能被挂起的任务
  */

  // 最老和最新的提交的时候被挂起的任务
  earlisestSuspendedTime: ExpirationTime;
  latestSuspendedTime: ExpirationTime;
   
  // 最新的通过一个promise被resolve并且可以重新尝试的优先级
  latestPingedTime: ExpirationTime;


  didError: boolean;

  // 正在等待提交的任务的expirationTime
  pendingCommitExpirationTime: ExpirationTime;

  // 已经完成的任务的fiberRoot对象，如果只有一个Root，那他永远只可能是这个Root对应的fiber，或者null
  // 在commit阶段只会处理这个值对应的任务
  finishedWork: Fiber | null;

  // 再任务被挂起时，通过setTimeout设置的返回内容
  // 用来下一次如果有新的任务挂起时清理还没触发的timeout
  timeoutHandle: TimeoutHandle | NoTimeout;

  // 顶层context，只有主动调用renderSubtreeIntoContainer才会有用
  context: Object;
  pendingContext: Object;

  hydrate: boolean;

  // 当前root上剩余的过期时间，标记要执行哪个优先级的任务
  nextExpirationTimeToWorkOn: ExpirationTime;

  // 当前更新对应的过期时间
  expirationTime: ExpirationTime;

  firstBatch: Batch | null;

  // root之间关联的链表结构。
  nextScheduledRoot: FiberRoot | null; 
}
```


### Fiber

每一个ReactElement对应一个Fiber对象

记录节点状态

串联树结构

```
interface FiberNode {
  // 记录组件类型
  tag: WorkTag;
}
```


## Responder
React新的事件系统支持
```
import { PressResponder } from 'react-events/press';
<div responders={<PressResponder />} />
```

## createFundamental

这是个啥玩意，还没明白