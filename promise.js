const Pending = 0;
const Fulfilled = 1;
const Rejected = 2;

function getThen(value) {
  const t = typeof value;
  if (value && (t === 'object' || t === 'function')) {
    const then = value.then;
    if (typeof then === 'function') {
      return then;
    }
  }
  return null;
}

function doResolve(fn, onFulfilled, onRejected) {
  let done = false;
  try {
    fn(function(value) {
      if (!done) {
        done = true;
        onFulfilled(value);
      }
    }, function(error) {
      if (!done) {
        done = true;
        onRejected(error);
      }
    });
  } catch (error) {
    if (!done) {
      done = true;
      onRejected(error)
    }
  }
}

class MyPromise {
  constructor(fn) {
    let state = Pending;
    let value = null;
    let handlers = [];

    function fulfill(result) {
      state = Fulfilled;
      value = result;
      handlers.forEach(handle);
      handlers = null;
    }

    function reject(error) {
      state = Rejected;
      value = error;
      handlers.forEach(handle);
      handlers = null
    }

    function resolve(result) {
      try {
        const then = getThen(result);
        if (then) {
          return doResolve(then.bind(result), resolve, reject);
        }
        fulfill(result);
      } catch (e) {
        reject(e);
      }
    }

    function handle(handler) {
      if (state === Pending) {
        handlers.push(handler);
      } else {
        if (state === Fulfilled && typeof handler.onFulfilled === 'function') {
          handler.onFulfilled(value);
        }
        if (state === Rejected && typeof handler.onRejected === 'function') {
          handler.onRejected(value);
        }
      }
    }

    this.done = function(onFulfilled, onRejected) {
      setTimeout(function() {
        handle({
          onFulfilled,
          onRejected
        });
      }, 0);
    };

    this.then = function(onFulfilled, onRejected) {
      return new Promise((resolve, reject) => {
        return this.done(function(result) {
          if (typeof onFulfilled === 'function') {
            try {
              return resolve(onFulfilled(result));
            } catch (error) {
              return reject(error);
            }
          } else {
            return resolve(result);
          }
        }, function(error) {
          if (typeof onRejected === 'function') {
            try {
               return resolve(onRejected(error));
            } catch (error) {
              return reject(error);
            }
          } else {
            return reject(error);
          }
        });
      });
    }

    doResolve(fn, resolve, reject);
  }
}