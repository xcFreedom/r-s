const EVENT_POOL_SIZE = 10;

/**
 * @see http://www.w3.org/TR/DOM-Level-3-Events/
 */
const EventInterface = {
  type: null,
  target: null,
  // current在dispatching的设置
  currentTargat: function() {
    return null;
  },
  eventPhase: null,
  bubbles: null,
  cancelable: null,
  timeStamp: function(event) {
    return event.timeStamp || Date.now();
  },
  defaultPrevented: null,
  isTrusted: null,
}

function functionThatReturnsTrue() {
  return true;
}

function functionThatReturnsFalse() {
  return false;
}


/**
 * - 合成事件由事件插件分派，通常是响应顶级事件委派处理程序。
 * 
 * - 这些系统通常应该使用 池 来减少垃圾回收的频率。系统应检查isPersistent，以确定事件在发送后是否应该释放到池中。需要持久化事件的用户应该调用persist。
 * 
 * - 合成事件（和子类）通过规范化浏览器特性来实现DOM Level 3事件API。子类不一定要实现DOM接口；自定义应用程序特定事件也可以将其子类化。
 */

function SyntheticEvent(dispatchConfig, targetInst, nativeEvent, nativeEventTarget) {
  this.dispatchConfig = dispatchConfig;
  this._targetInst = targetInst;
  this.nativeEvent = nativeEvent;

  const Interface = this.constructor.Interface;
  for (const propName in Interface) {
    if (!Interface.hasOwnProperty(propName)) {
      continue;
    }
    const normalize = Interface[propName];
    if (normalize) {
      this[propName] = normalize(nativeEvent);
    } else {
      if (propName === 'target') {
        this.target = nativeEventTarget;
      } else {
        this[propName] = nativeEvent[propName];
      }
    }
  }

  /**
   * event.defaultPrevented标明事件是否调用了event.preventDefault()方法。
   */
  const defaultPrevented = nativeEvent.defaultPrevented != null ? nativeEvent.defaultPrevented : nativeEvent.returnValue === false;
  if (defaultPrevented) {
    this.isDefaultPrevented = functionThatReturnsTrue;
  } else {
    this.isDefaultPrevented = functionThatReturnsFalse;
  }
  this.isPropagationStopped = functionThatReturnsFalse;
  return this;
}

Object.assign(SyntheticEvent.prototype, {
  preventDefault() {
    this.defaultPrevented = true;
    const event = this.nativeEvent;
    if (!event) {
      return;
    }
    if (event.preventDefault) {
      event.preventDefault();
    } else if (typeof event.returnValue !== 'undefined') {
      event.returnValue = false;
    }
    this.isDefaultPrevented = functionThatReturnsTrue;
  },

  stopPropagation() {
    const event = this.nativeEvent;
    if (!event) {
      return;
    }
    if (event.stopPropagation) {
      event.stopPropagation();
    } else if (typeof event.cancelBubble !== 'undefined') {
      event.cancelBubble = true;
    }

    this.isPropagationStopped = functionThatReturnsTrue;
  },

  /**
   * 我们在每个事件循环之后释放所有已调度的SyntheticEvent，并将他们添加回池中。这允许一种方法来保留不会添加回池中的引用。
   */
  persist() {
    this.isPersistent = functionThatReturnsTrue;
  },

  /**
   * 检查此事件是否应该释放回池中。
   * true -> 不释放
   */
  isPersistent: functionThatReturnsFalse,

  destructor() {
    const Interface = this.constructor.Interface;
    for (const propName in Interface) {
      this[propName] = null;
    }
    this.dispatchConfig = null;
    this._targetInst = null;
    this.nativeEvent = null;
    this.isDefaultPrevented = functionThatReturnsFalse;
    this.isPropagationStopped = functionThatReturnsFalse;
    this._dispatchListeners = null;
    this._dispatchInstances = null;
  }
});

SyntheticEvent.Interface = EventInterface;

SyntheticEvent.extend = function(Interface) {
  const Super = this;

  const E = function() {};
  E.prototype = Super.prototype;
  const prototype = new E();
  
  function Class() {
    return Super.apply(this, arguments);
  }
  Object.assing(prototype, Class.prototype);
  Class.prototype = prototype;
  Class.prototype.constructor = Class;

  Class.Interface = Object.assign({}, Super.Interface, Interface);
  Class.extend = Super.extend;
  addEventPoolingTo(Class);

  return Class;
}

function getPooledEvent(dispatchConfig, targetInst, nativeEvent, nativeInst) {
  const EventConstructor = this;
  if (EventConstructor.eventPool.length) {
    const instance = EventConstructor.eventPool.pop();
    EventConstructor.call(instance, dispatchConfig, targetInst, nativeEvent, nativeInst);
    return instance; 
  }
  return new EventConstructor(dispatchConfig, targetInst, nativeEvent, nativeInst);
}

function releasePooledEvent(event) {
  const EventConstructor = this;
  event.destructor();
  if (EventConstructor.eventPool.length < EVENT_POOL_SIZE) {
    EventConstructor.eventPool.push(event);
  }
}

function addEventPoolingTo(EventConstructor) {
  EventConstructor.eventPool = [];
  EventConstructor.getPooled = getPooledEvent;
  EventConstructor.release = releasePooledEvent;
}

export default SyntheticEvent;