function push(heap, node) {
  const index = heap.length;
  heap.push(node);
  siftUp(heap, node, index);
}

function peek(heap) {
  const first = heap[0];
  return first === undefined ? null : first;
}

function pop(heap) {
  const first = heap[0];
  if (first !== undefined) {
    const last = heap.pop();
    if (last !== first) {
      heap[0] = last;
      siftDown(heap, last, 0);
    }
    return first;
  } else {
    return null;
  }
}

function siftUp(heap, node, i) {
  let index = i;
  while (true) {
    const parentIndex = Math.floor((index - 1) / 2);
    console.log(parentIndex);
    const parent = heap[parentIndex];
    if (parent !== undefined && compare(parent, node) > 0) {
      // parent更大，调换顺序
      heap[parentIndex] = node;
      heap[index] = parent;
      index = parentIndex;
    } else {
      return;
    }
  }
}

function siftDown(heap, node, i) {
  let index = i;
  const length = heap.length;
  while (index < length) {
    const leftIndex = (index + 1) * 2 - 1;
    const left = heap[leftIndex];
    const rightIndex = leftIndex + 1;
    const right = heap[rightIndex];
    // 如果左或右节点较小，请与其中较小的节点交换。
    if (left !== undefined && compare(left, node) < 0) {
      if (right !== undefined && compare(right, left) < 0) {
        heap[index] = right;
        heap[rightIndex] = node;
        index = rightIndex;
      } else {
        heap[index] = left;
        heap[leftIndex] = node;
        index = leftIndex;
      }
    } else if (right !== undefined && compare(right, node) < 0) {
      heap[index] = right;
      heap[rightIndex] = node;
      index = rightIndex;
    } else {
      return;
    }
  }
}

function compare(a, b) {
  const diff = a.sortIndex - b.sortIndex;
  return diff !== 0 ? diff : a.id - b.id;
}


let sortIndex = 1;
var heap = [];

for (let i = 0; i < 10; i++) {
  push(heap, {
    sortIndex: sortIndex++,
    id: Math.random(),
    push: '1'
  });
}
console.log(heap);
let t = heap[4];
heap[4] = heap[1];
heap[1] = t;
console.log(heap);
pop(heap);
console.log(heap);