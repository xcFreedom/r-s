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

## ExpirationTime

1. Sync模式
2. 异步模式
3. 指定Context


## Commit Phase

1. 阶段一：BeforeMutationEffects
    1. BeforeMutationLifeCycles 在fiber变化前，对于函数组件执行useEffect的销毁函数，对于class组件，如果有更新尝试执行getSnapshotBeforeUpdate生命周期
    2. effectTag与Passive相关时， 执行flushPassiveEffects，最后也是执行commitPassiveHookEffects，但是这个函数整体作用还未明白。
    3. finishPendingInteractions，结束等待中的Interactions，现在还未明白Interaction在整个react中表示什么。
    4. flushSyncCallbackQueue，执行同步任务队列。当root上有过期任务时，会把优先级设为ImmediatePriority，填入SyncQueue，在这个阶段会清理。SyncQueue里面的callback会进入commit阶段
2. 阶段二：MutationEffects
    这个阶段，遍历Fiber树，提交更新、新增、删除
3. 阶段三：LayoutEffects
    1. commitLifeCycles，funcationComponent提交hook变动，classComponent执行didMount/didUpdate，提交updateQueue

## Interaction
那是他妈的什么玩意

```
    interface Interaction {
        __count: number;
        id: number;
        name: string;
        timestamp: number;
    }
```


## Hook

```
typeof HookEffectTag = NoEffect | UnmountSnapshot | UnmountMutation | MountMutation | UnmountLayout | MountLayout | MountPassive | UnmountPassive;
type Hook = {
  memoizedState: any,

  baseState: any,
  baseUpdate: Update<any, any> | null,
  queue: UpdateQueue<any, any> | null,

  next: Hook | null,
};

type Effect = {
  tag: HookEffectTag,
  create: () => (() => void) | void,
  destroy: (() => void) | void,
  deps: Array<mixed> | null,
  next: Effect,
};

type Update<S, A> = {
  expirationTime: ExpirationTime,
  suspenseConfig: null | SuspenseConfig,
  action: A,
  eagerReducer: ((S, A) => S) | null,
  eagerState: S | null,
  next: Update<S, A> | null,

  priority?: ReactPriorityLevel,
};

type UpdateQueue<S, A> = {
  last: Update<S, A> | null,
  dispatch: (A => mixed) | null,
  lastRenderedReducer: ((S, A) => S) | null,
  lastRenderedState: S | null,
};


type FunctionComponentUpdateQueue = {
    lastEffect: Effect | null
};
```

现在我们有一个只包含`const [count, setCount] = useState(0)`的函数组件。大概流程应该是这样的
1. 设置currentlyRenderingFiber
2. mountState(0)
3. 产生新的hook和queue，hook的memoizedState为0、baseState为0，update的dispatch为dispatchAction.bind(null, currentlyRenderingFiber, queue)
4. 执行setCount(1)，就是调用dipatchAction(fiber, queue, 1);
5. dispatchAction执行
   条件一：
   1. 如果当前的currentlyRenderingFiber不是此fiber，则计算新的expirationTime，创建新的Update，设置update的expirationTime，设置update的action为1，把update添加到queue的末尾。如果queue没有设置过update，或者queue上的update还是循环链表的结构，则保持这个结构。
   2. 如果当前fiber上没有工作，立即计算这个update的结果，更新到update的eagerState
   3. 调用scheduleWork，调度更新
   
   条件二：
   1. 如果当前的currentlyRenderingFiber就是此fiber，或者fiber的alternate，这说明这个组件在render过程中，产生了更新
   2. 设置didScheduleRenderPhaseUpdate为true
   3. 创建新的Update，expirationTime为当前fiber的renderExpirationTime，设置action为新的state
   4. 把update与queue，添加到renderPhaseUpdates这个map中，update在queue的末尾
6. 当render到此fiber时，useState对应updateState，也就是updateReducer(basicStateReducer, initialState);
7. 先不考虑re-render的情况，从此updateWorkInProgressHook()函数获取当前的hook，从hook上取到queue，如果hook/queue上没有更新，直接返回hook的state。如果有更新则根据expirationTime决定计算哪些update，将没有计算的update的第一个设置到hook的baseUpdate上，更新hook与queue上此次计算的state。下次执行到此的时候，因为baseUpdate已经改变了，这里解开循环链表，但是我感觉不解开好像也可以，暂时没明白为什么要做这一步
8. 如果是re-render的情况，则从renderPhaseUpdates中获取update，遍历update链表，更新hook的state

Effect：
```
type Effect = {
  tag: HookEffectTag,
  create: () => (() => void) | void,
  destroy: (() => void) | void,
  deps: Array<mixed> | null,
  next: Effect,
};
```
## ScheduleWork

* 找到更新对应的FiberRoot节点。
* 如果符合条件，重置stack
* 如果符合条件，就请求工作调度