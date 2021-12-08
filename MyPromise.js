function isPromise(obj) {
  return !!(obj && typeof obj === "object" && typeof obj.then === "function");
}
function toMicrotaskQueue(callback) {
  if (globalThis.process && globalThis.process.nextTick) {
    process.nextTick(callback);
  } else if (globalThis.MutationObserver) {
    const p = document.createElement("p");
    const osv = new MutationObserver(callback);
    osv.observe(p, { childList: true });
    p.innerHTML = "1";
  } else {
    setTimeout(callback, 0);
  }
}
const PENDING = "pending";
const FULFILLED = "fulfilled";
const REJECTED = "rejected";
class MyPromise {
  constructor(executor) {
    if (typeof executor !== "function") {
      throw TypeError(`Promise resolver ${executor} is not a function`);
    }
    this._state = PENDING;
    this._result = undefined;
    this._handlerQueue = [];
    try {
      executor(this._resolve.bind(this), this._reject.bind(this));
    } catch (err) {
      this._reject(err);
    }
  }
  _changeState(newState, result) {
    if (this._state === PENDING) {
      this._state = newState;
      this._result = result;
    }
  }
  _toHandlerQueue(executor, onState, resolve, reject) {
    this._handlerQueue.push({ executor, onState, resolve, reject });
  }
  _runOneHandler({ executor, onState, resolve, reject }) {
    if (this._state !== onState) {
      return;
    }
    toMicrotaskQueue(() => {
      if (typeof executor !== "function") {
        this.then(resolve, reject);
      } else {
        try {
          const result = executor(this._result);
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
  _runHandlerQueue() {
    if (this._state === PENDING) {
      return;
    }
    while (this._handlerQueue[0]) {
      this._runOneHandler(this._handlerQueue[0]);
      this._handlerQueue.shift();
    }
  }
  _consoleErr(reason) {
    if (this._state === FULFILLED) {
      return;
    }
    let hasOnRejected = false;
    for (const handler of this._handlerQueue) {
      if (handler.onState === REJECTED) {
        hasOnRejected = true;
      }
    }
    if (!hasOnRejected) {
      console.error(reason);
    }
  }
  _resolve(value) {
    toMicrotaskQueue(() => {
      this._changeState(FULFILLED, value);
      this._runHandlerQueue();
    });
  }
  _reject(reason) {
    toMicrotaskQueue(() => {
      this._consoleErr(reason);
      this._changeState(REJECTED, reason);
      this._runHandlerQueue();
    });
  }
  then(onFulfilled, onRejected) {
    return new MyPromise((resolve, reject) => {
      this._toHandlerQueue(onFulfilled, FULFILLED, resolve, reject);
      this._toHandlerQueue(onRejected, REJECTED, resolve, reject);
      this._runHandlerQueue();
    });
  }
  catch(onRejected) {
    return this.then(null, onRejected);
  }
  finally(onSettled) {
    return this.then(
      (value) => {
        onSettled();
        return value;
      },
      (reason) => {
        onSettled();
        throw reason;
      }
    );
  }
  static resolve(data) {
    if (data instanceof MyPromise) {
      return data;
    }
    return new MyPromise((resolve, reject) => {
      if (isPromise(data)) {
        data.then(resolve, reject);
      } else {
        resolve(data);
      }
    });
  }
  static reject(reason) {
    return new MyPromise((resolve, reject) => {
      reject(reason);
    });
  }
  static all(proms) {
    return new MyPromise((resolve, reject) => {
      if (typeof proms[Symbol.iterator] !== "function") {
        throw TypeError(`${proms} is not iterable`);
      }
      const valueArr = [];
      let promCounter = 0;
      let onFulFilledCounter = 0;
      for (const prom of proms) {
        const index = promCounter;
        promCounter++;
        MyPromise.resolve(prom).then((value) => {
          valueArr[index] = value;
          onFulFilledCounter++;
          if (onFulFilledCounter === promCounter) {
            resolve(valueArr);
          }
        }, reject);
      }
      if (promCounter === 0) {
        resolve([]);
      }
    });
  }
  static allSettled(proms) {
    const thenProms = [];
    for (const prom of proms) {
      thenProms.push(
        MyPromise.resolve(prom).then(
          (value) => ({ state: FULFILLED, value }),
          (reason) => ({ state: REJECTED, reason })
        )
      );
    }
    return MyPromise.all(thenProms);
  }
  static race(proms) {
    return new MyPromise((resolve, reject) => {
      for (const prom of proms) {
        MyPromise.resolve(prom).then(resolve, reject);
      }
    });
  }
}
