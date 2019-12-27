/**
 * 将不能为空或未定义的项累积到第一个项中。 这用于通过避免数组分配来节省内存，从而牺牲了API的简洁性。
 *  由于current可以在传入之前为null，而在此函数之后不能为null，因此请确保将其分配回current：
 * 
 * `a = accumulateInto(a, b);`
 * 
 * 这个APi应该谨慎使用。
 */
function accumulateInto(current, next) {
  if (current === null) {
    return next;
  }

  if (Array.isArray(current)) {
    if (Array.isArray(next)) {
      current.push.apply(current, next);
      return current;
    }
    current.push(next);
    return current;
  }

  if (Array.isArray(next)) {
    return [current].concat(next);
  }
  return [current, next];
}

export default accumulateInto;