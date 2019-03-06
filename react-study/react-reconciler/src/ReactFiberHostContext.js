import { createCursor, pop } from './ReactFiberStack';

const No_CONTEXT = {};

let contextStackCursor = createCursor(No_CONTEXT);
let contextFiberStackCursor = createCursor(No_CONTEXT);
let rootInstanceStackCursor = createCursor(No_CONTEXT);

function popHostContainer(fiber) {
  pop(contextStackCursor, fiber);
  pop(contextFiberStackCursor, fiber);
  pop(rootInstanceStackCursor, fiber);
}

export {
  popHostContainer
};