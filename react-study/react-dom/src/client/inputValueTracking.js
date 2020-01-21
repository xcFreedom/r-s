/**
 * 是否为checkbox/radio类型的input
 * @param {Element} elem 
 */
function isCheckable(elem) {
  const type = elem.type;
  const nodeName = elem.nodeName;
  return (
    nodeName &&
    nodeName.toLowerCase() === 'input' &&
    (type === 'checkbox' || type === 'radio')
  );
}

function getTracker(node) {
  return node._valueTracker;
}

function detachTracker(node) {
  node._valueTracker = null;
}

/**
 * 获取node节点上的跟踪值，暂时还没明白这个值有什么意义。只知道input value改变时，currentValue会变
 * @param {Element} node 
 */
function trackValueOnNode(node) {
  const valueField = isCheckable(node) ? 'checked' : 'value';
  const descriptor = Object.getOwnPropertyDescriptor(node.constructor.prototype, valueField);

  let currentValue = '' + node[valueField];

  if (
    node.hasOwnProperty(valueField) ||
    typeof descriptor === 'undefined' ||
    typeof descriptor.get !== 'function' ||
    typeof descriptor.set !== 'function'
  ) {
    return;
  }

  const {get, set} = descriptor;
  Object.defineProperty(node, valueField, {
    configurable: true,
    get: function() {
      return get.call(this);
    },
    set: function(value) {
      currentValue = '' + value;
      set.call(this, value);
    },
  });

  // 我们本可以第一次通过的，但它在IE11和Edge 14/15中触发了一个bug。再次调用defineProperty（）应该是等效的。
  Object.defineProperty(node, valueField, {
    enumerable: descriptor.enumerable,
  });

  const tracker = {
    getValue() {
      return currentValue;
    },
    setValue(value) {
      currentValue = '' + value;
    },
    stopTracking() {
      detachTracker(node);
      delete node[valueField];
    },
  };

  return tracker;
}

export function track(node) {
  if (getTracker(node)) {
    return;
  }

  node._valueTracker = trackValueOnNode(node);
}