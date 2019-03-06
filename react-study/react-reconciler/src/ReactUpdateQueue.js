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
 * @param {Update<State>} update 
 */
export function enqueueUpdate(fiber, update) {
  // 更新队列是惰性创建的
  const alternate = fiber.alternate;
  let queue1;
  let queue2;
  if (alternate === null) {
    // 只有一个fiber
    queue1 = fiber,updateQueue;
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

  if (queue1 === null || queue1 === queue2) {
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