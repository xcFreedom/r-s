export function push(heap, node) {
  const index = heap.length;
  heap.push(node);
  siftUp(heap, node, index);
}

export function peek(heap) {
  const first = heap[0];
  return first === undefined ? null : first;
}

function siftUp(heap, node, i) {
  let index = i;
  while (true) {
    const parentIndex = Math.floor((index - 1) / 2);
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

function compare(a, b) {
  const diff = a.sortIndex - b.sortIndex;
  return diff !== 0 ? diff : a.id - b.id;
}