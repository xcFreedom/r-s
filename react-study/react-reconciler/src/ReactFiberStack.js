
const valueStack = [];

let index = -1;

/**
 * 创建cursor
 * @param {*} defaultValue 
 */
function createCursor(defaultValue) {
  return {
    current: defaultValue
  };
}


function pop(cursor, fiber) {
  if (index < 0) {
    return;
  }

  cursor.current = valueStack[index];

  valueStack[index] = null;
  
  index--;
}

export {
  createCursor,
  pop
};