/**
 * UpdateQueue是一个按优先级排列更新的链接列表
 * 
 * 就像fibers一样，更新队列也是成对出现的：current队列(表示屏幕可见状态)，和work-in-progress队列（可以在commit前对其进行异步修改和处理）-这是一种双缓冲的形式。
 * 如果一个工作中的render在完成之前被丢弃，我们通过复制current队列来创建一个新的work-in-progress。
 * 
 * 两个队列共享一个persistent singly-linked list（持久的单链表)。为了安排一个Update，我们把它添加到两个队列的末尾。每个队列维护一个指向 persistent singly-linked list中还没有处理的第一个Update
 * work-in-progress队列的指针位置总是大于或等于current队列，因为我们总是处理current队列。
 * 
 * 当我们交换work-in-progress队列时，current队列的指针只在commit阶段更新
 * 
 * 例如：
 * 
 * Current pointer:        A - B - C - D - E - F
 * Work-in-progress pointer:           D - E - F
 *                                     ^
 *                                     The work-in-progress队列比current处理更多的Update
 * 
 * 之所以我们把两个队列都添加上，是因为如果不这样做，可能会删除从来没处理过的Update。
 * 例如，如果我们只向work-in-progress队列添加Update，一些Update可能会在我们通过复制current队列来重启work-in-progress渲染时丢失。
 * 类似地，如果我们只向current队列添加Update，一些Update可能会在work-in-progress队列提交和与current队列交换时丢失。
 * 通过向两个队列添加Update，我们保住这个Update将成为下一个work-in-progress的一部分(而且，因为work-in-progress队列一旦commit就会成为current队列，所以不存在两次应用相同Update的危险)
 * 
 * Update不是按优先级排序，而是按插入排序；新的Update总是添加到列表的末尾
 * 
 * 不过，优先级仍然很重要。在render阶段处理Update队列时，只有足够高优先级的Update会被包含在结果中。
 * 
 * 如果我们因为一个Update没有足够的优先级而跳过它，那么它将保留在队列中，稍后在较低优先级的render阶段中进行处理
 * 
 * 至关重要的是，跳过一个Update之后的所有Update都将保留在队列中，*不管它们的优先级*
 * 
 * 这意味着高优先级的更新有时会以两个不同的优先级处理两次。
 * 
 * 我们还追踪了一个base state，它表示队列被应用之前的第一次更新的state；
 * 
 * 例如：
 *  给定一个base state，为''. 以及一下更新队列
 * 
 *     A1 - B2 - C1 - D2
 * 
 *  数字表示优先级，状态用字母表示，通过附加字母表示应用到前一个状态。那么React把这些更新作为两个单独的render处理，每个不同的优先级是一个：
 * 
 *  first render 优先级 1 ：
 *      Base state: ''
 *      Updates: [A1, C1]
 *      Result state: 'AC'
 *  
 *  second render 优先级2
 *      
 *      Base state: 'A'         <- base state不包括C，因为B2被跳过了
 *      Updates: [B2, C1, D2]   <- C1重新添加到B2的顶部
 *      Result state: 'ABCD'
 * 
 *  因为按照插入顺序处理更新，并且在跳过前面的更新时，重新设置高优先级更新的位置，所以不管优先级如何，最终结果都是确定的
 *  中间状态可能因系统资源不同，但最终状态始终相同
 */


export const UpdateState   = 0; // 更新state
export const ReplaceState  = 1; // 替换state
export const ForceUpdate   = 2; // 强制更新
export const CaptureUpdate = 3; // 捕获更新

/**
 * 创建更新队列
 * @param {State} baseState 
 * @returns {UpdateQueue}
 */
export function createUpdateQueue(baseState) {
  const queue = {
    baseState,
    firstUpdate: null,
    lastUpdate: null,
    firstCapturedUpdate: null,
    lastCapturedUpdate: null,
    firstEffect: null,
    lastEffect: null,
    firstCapturedEffect: null,
    lastCapturedEffect: null,
  };
  return queue;
}

/**
 * 创建更新
 * @param {ExpirationTime} expirationTime 
 * @returns {Update}
 */
export function createUpdate(expirationTime) {
  return {
    expirationTime,

    tag: UpdateState,
    payload: null,
    callback: null,

    next: null,
    nextEffect: null
  };
}

function appendUpdateToQueue(queue, update) {
  // 添加更新到队尾
  if (queue.lastUpdate === null) {
    // 队列是空的
    queue.firstUpdate = queue.lastUpdate = update;
  } else {
    queue.lastUpdate.next = update;
    queue.lastUpdate = update;
  }
}

/**
 * 复制当前更新队列
 * @param {UpdateQueue} currentQueue
 * @return {UpdateQueue}
 */
function cloneUpdateQueue(currentQueue) {
  const queue = {
    baseState: currentQueue.baseState,
    firstUpdate: currentQueue.firstUpdate,
    lastUpdate: currentQueue.lastUpdate,

    firstCapturedUpdate: null,
    lastCapturedUpdate: null,

    firstEffect: null,
    lastEffect: null,

    firstCapturedEffect: null,
    lastCapturedEffect: null,
  };
  return queue;
}

/**
 * type Update<State> = {
    expirationTime: ExpirationTime,

    tag: 0 | 1 | 2 | 3,
    payload: any,
    callback: (() => mixed) | null,

    next: Update<State> | null,
    nextEffect: Update<State> | null,
  }
 * @param {Fiber} fiber 
 * @param {Update} update 
 */
export function enqueueUpdate(fiber, update) {
  // 更新队列是惰性创建的
  const alternate = fiber.alternate;
  let queue1;
  let queue2;
  if (alternate === null) {
    // 只有一个fiber
    queue1 = fiber.updateQueue;
    queue2 = null;
    if (queue1 === null) {
      queue1 = fiber.updateQueue = createUpdateQueue(fiber.memoizedState);
    }
  } else {
    // 两个owners
    queue1 = fiber.updateQueue;
    queue2 = alternate.updateQueue;
    if (queue1 === null) {
      if (queue2 === null) {
        // 两个fiber都没有更新队列，创建新的
        queue1 = fiber.updateQueue = createUpdateQueue(fiber.memoizedState);
        queue2 = alternate.updateQueue = createUpdateQueue(alternate.memoizedState);
      } else {
        // 只有一个fiber有更新队列，复制然后创建一个新的
        queue1 = fiber.updateQueue = cloneUpdateQueue(queue2);
      }
    } else {
      if (queue2 === null) {
        // 只有一个fiber有更新队列，复制然后创建一个新的
        queue2 = alternate.updateQueue = cloneUpdateQueue(queue1);
      } else {
        // 两个都有更新队列
      }
    }
  }

  if (queue2 === null || queue1 === queue2) {
    // 只有一个单独队列
    appendUpdateToQueue(queue1, update);
  } else {
    // 这里是两个队列，我们需要添加更新到两个队列中，
    // 考虑到列表的持久结构，我们不希望相同的更新被添加多次
    if (queue1.lastUpdate === null || queue2.lastUpdate === null) {
      // 其中一个队列不是空的，我们必须把更新添加到两个队列中
      appendUpdateToQueue(queue1, update);
      appendUpdateToQueue(queue2, update);
    } else {
      // 两个队列都是非空的。由于结构共享，两个列表中的最后更新是相同的。因此，只添加到一个列表中。
      appendUpdateToQueue(queue1, update);
      // 但是我们仍然需要更新queue2的lastUpdate指针
      queue2.lastUpdate = update;
    }
  }

}