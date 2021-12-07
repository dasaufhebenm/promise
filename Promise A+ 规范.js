function toMicrotaskQueue(callback) {
  if (globalThis.process && globalThis.process.nextTick) {
    process.nextTick(callback);
  } else if (MutationObserver) {
    const p = document.createElement("p");
    const osv = new MutationObserver(callback);
    osv.observe(p, { childList: true });
    p.innerHTML = "1";
  } else {
    setTimeout(callback, 0);
  }
}
function isPromise(obj) {
  return !!(obj && typeof obj === "object" && typeof obj.then === "function");
}
const PENDING = "pending";
const FULLFILLED = "fulFilled";
const REJECTED = "rejected";
class MyPromise {
  constructor(executor) {
    if (typeof executor !== "function") {
      throw TypeError(`Promise resolver ${executor} is not a function`);
    }
    this._state = PENDING;
    this._value = undefined;
    this._handlerQueue = [];
    try {
      executor(this._resolve.bind(this), this._reject.bind(this));
    } catch (err) {
      this._reject(err);
    }
  }
  _toHandlersQueue(executor, onState, resolve, reject) {
    this._handlerQueue.push({ executor, onState, resolve, reject });
  }
  _changeState(newState, value) {
    if (this._state === PENDING) {
      this._state = newState;
      this._value = value;
    }
  }
  _resolve(data) {
    this._changeState(FULLFILLED, data);
    this._runHandlerQueue();
  }
  _reject(reason) {
    this._changeState(REJECTED, reason);
    this._runHandlerQueue();
  }
  _runHandlerQueue() {
    if (this._state === PENDING) {
      return;
    }
    while (this._handlerQueue[0]) {
      this._runOneHandler(this._handlerQueue[0]);
      this._handlerQueue.shift();
    }
  }
  _runOneHandler({ executor, onState, resolve, reject }) {
    toMicrotaskQueue(() => {
      if (this._state !== onState) {
        return;
      }
      if (typeof executor !== "function") {
        this._state === FULLFILLED ? resolve(this._value) : reject(this._value);
      } else {
        try {
          const result = executor(this._value);
          if (isPromise(result)) {
            result.then(resolve, reject);
          } else {
            resolve(result);
          }
        } catch (err) {
          reject(err);
        }
      }
    });
  }
  then(onFulfilled, onRejected) {
    return new MyPromise((resolve, reject) => {
      this._toHandlersQueue(onFulfilled, FULLFILLED, resolve, reject);
      this._toHandlersQueue(onRejected, REJECTED, resolve, reject);
      this._runHandlerQueue();
    });
  }
}
