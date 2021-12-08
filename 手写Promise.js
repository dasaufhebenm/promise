/*
  创建一个 Promise 对象的时候，比如 new Promise((resolve, reject) => {...}); 时，
  会执行 类Promise 的构造器 constructor ，
  constructor 接收的参数 (resolve, reject) => {...} 是一个函数，这个函数表示 Promise 任务的执行流程

  下面把 constructor 接收的函数参数 取名为 executor                                                                                             
    -> constructor(executor) {}

  如果 executor 不是函数，会报错而且不会生成 Promise 对象，
  如果 executor 执行过程中出错，会改变 Promise 对象状态为 rejected、值为 错误信息 （除非在报错之前 Promise 对象已经是完成状态、也就是已经执行了 resolve 或者 reject ）
  
  executor 函数在 constructor 函数执行时会被立即执行, 
  executor 函数（如果有定义相应的形参）会被传入两个参数 _resolve 和 _reject ， _resolve 和 _reject 都是函数     
      -> executor(this._resolve, this._reject);

  如果 executor 函数中执行了 resolve 函数， 
                          相当于执行了 _resolve ， _resolve 函数 会让 Promise 任务成功，并且会把 _resolve 函数执行时接收的实参作为任务成功的数据，
  如果 executor 函数中执行了 reject 函数， 
                          相当于执行了 _reject ， _reject 函数 会让 Promise 任务失败，并且会把 _reject 函数执行时接收的实参作为任务失败的原因，

      让 Promise 状态为 fulFilled 或 rejected                        ->   把 _state 变为 "fulFilled" / "rejected"
      把 resolve 函数 / reject 函数 执行时接收的实参作为任务完成的数据     ->   给 _result 赋值为 resolve 函数 / reject 函数 执行时接收的实参

  _resolve 函数 和 _reject 函数 可以直接在 constructor 里面定义，但是看起来不好看，所以下面把 _resolve 函数 和 _reject 函数 定义到原型上，因为不希望被外部调用，所以命名时在前面加下划线：
*/

// class MyPromise {
//   constructor(executor) {
//     this._state = "pending";
//     this._result = undefined;
//     executor(this._resolve, this._reject);
//   }
//   _resolve(data) {
//     // console.log("任务成功", data);
//     this._state = "fulFilled";
//     this._result = data;
//   }
//   _reject(reason) {
//     // console.log("任务失败", reason);
//     this._state = "rejected";
//     this._result = reason;
//   }
// }

// new MyPromise((resolve, reject) => {
//   resolve(1);
// });

/*
 🟡 上面代码执行时会出现错误，

    执行 constructor((resolve, reject) => {resolve(1);}) 时：

    执行到 executor(this._resolve, this._reject); 这一行，
    也就是 执行 (resolve, reject) => {resolve(1);}，
    先把实参赋值给形参，也就是把 this._resolve 赋值给 resolve , 
    所以执行 resolve(1) 相当于执行 _resolve(1)     
    而谁调用 _resolve 函数、 _resolve 函数里的 this 就指向谁，
    现在 _resolve(1) 是直接调用的， this 本来指向全局变量，
    但是因为 _resolve 函数是在 class 里定义的，类中的所有代码均在严格模式下执行，
    所以直接调用 _resolve 函数时它里面的 this 指向 undefined ，而 undefined._state 会报错

 为了让这时候的 this 指向的是 Promise 对象，给 resolve 赋值时就不能直接赋值成 this._resolve ， 
 而是赋值成 this._resolve.bind(this) , 函数名.bind(x) 返回一个新函数，这个新函数执行时其内部的 this 永远指向 x

*/

// 改成下面这样：

// class MyPromise {
//   constructor(executor) {
//     this._state = "pending";
//     this._result = undefined;
//     executor(this._resolve.bind(this), this._reject.bind(this));
//   }
//   _resolve(data) {
//     this._state = "fulFilled";
//     this._result = data;
//   }
//   _reject(reason) {
//     this._state = "rejected";
//     this._result = reason;
//   }
// }

/*
🟢 进一步改进上面的代码，因为 字符串 "pending" "fulFilled" "rejected" 会被经常用到，为了方便维护，把它们各自设为一个常量：
*/

// const PENDING = "pending";
// const FULFILLED = "fulFilled";
// const REJECTED = "rejected";
// class MyPromise {
//   constructor(executor) {
//     this._state = PENDING;
//     this._result = undefined;
//     executor(this._resolve.bind(this), this._reject.bind(this));
//   }
//   _resolve(data) {
//     this._state = FULFILLED;
//     this._result = data;
//   }
//   _reject(reason) {
//     this._state = REJECTED;
//     this._result = reason;
//   }
// }

/*
🟢 进一步改进上面的代码，因为存在重复代码（改变 _state 和 _result ），所以把 改变 _state 和 _result 这个过程封装成一个函数 _changeState(newState,result)
*/

// const PENDING = "pending";
// const FULFILLED = "fulFilled";
// const REJECTED = "rejected";
// class MyPromise {
//   constructor(executor) {
//     this._state = PENDING;
//     this._result = undefined;
//     executor(this._resolve.bind(this), this._reject.bind(this));
//   }
//   _changeState(newState, result) {
//     this._state = newState;
//     this._result = result;
//   }
//   _resolve(data) {
//     this._changeState(FULFILLED, data);
//   }
//   _reject(reason) {
//     this._changeState(REJECTED, reason);
//   }
// }

/*
🟡 上面代码存在问题，因为 Promise 对象任务完成后的状态一旦确定就不能修改
*/

// const PENDING = "pending";
// const FULFILLED = "fulFilled";
// const REJECTED = "rejected";
// class MyPromise {
//   constructor(executor) {
//     this._state = PENDING;
//     this._result = undefined;
//     executor(this._resolve.bind(this), this._reject.bind(this));
//   }
//   _changeState(newState, result) {
//     if (this._state === PENDING) {
//       this._state = newState;
//       this._result = result;
//     }
//   }
//   _resolve(data) {
//     this._changeState(FULFILLED, data);
//   }
//   _reject(reason) {
//     this._changeState(REJECTED, reason);
//   }
// }

/*
🟡 上面代码存在问题，因为如果 executor 在执行过程中出现错误，
   Promise 对象的 _state 和 _result 也要改变（除非在出现错误之前 Promise 对象 的状态已经确定下来了），变为 rejected 和 错误信息 
*/

// const PENDING = "pending";
// const FULFILLED = "fulFilled";
// const REJECTED = "rejected";
// class MyPromise {
//   constructor(executor) {
//     this._state = PENDING;
//     this._result = undefined;
//     try {
//       executor(this._resolve.bind(this), this._reject.bind(this));
//     } catch (err) {
//       this._reject(err);
//     }
//   }
//   _changeState(newState, result) {
//     if (this._state === PENDING) {
//       this._state = newState;
//       this._result = result;
//     }
//   }
//   _resolve(data) {
//     this._changeState(FULFILLED, data);
//   }
//   _reject(reason) {
//     console.log(12345);
//     this._changeState(REJECTED, reason);
//   }
// }

/*
🔴 下面开始实现 then 函数

then 函数接收两个参数 onFulfilled 和 onRejected ， onFulfilled 和 onRejected 都是函数，

🔴 then 函数 最终返回一个 MyPromise 对象 p1 ， return new MyPromise((resolve, reject) => {...});

    函数 (resolve, reject) => {...} 是立即被执行的，所以可以把 then 函数要执行的代码放到 ... 里面

    1. 把 onFulfilled 函数和 onRejected 函数都放到一个队列，这个队列用一个数组 _handlerQueue 来表示，
    2. 依次处理这个 _handlerQueue 中 符合条件（如果 Promise 对象的 _state 为 FULFILLED 时要执行的 / 如果 Promise 对象的 _state 为 REJECTED 时要执行的） 的函数
        _handlerQueue 中的函数在执行时接收一个参数，值为 Promise 对象的 _result

        如果要判断放到 _handlerQueue 里的函数是否 符合条件，就不能 仅仅放入函数，即不能简单的执行 this._handlerQueue.push(onFulfilled, onRejected);
        而是 放入一个对象 F，这个对象 F 包含 函数 和 这个函数是在 Promise 对象的 _state 的值为什么的时候才会被执行的，
        _handlerQueue ，形如：
        [
          {executor: fn1, onState: FULFILLED },
          {executor: fn2, onState: REJECTED },
          {executor: fn3, onState: FULFILLED },
          ... 
        ]
        另外 _handlerQueue 里的函数的执行结果 会作为 要执行 p1 的 resolve 还是 reject 的判断条件 以及 p1 的 resolve 或者 reject 执行时接收的实参，
        所以要把 p1 的 resolve 和 reject 都放到对象 F 里面方便以后执行，
        _handlerQueue ，形如：
        [
          {executor: fn1, onState: FULFILLED, resolve: resolve, reject: reject },
          {executor: fn2, onState: REJECTED, resolve: resolve, reject: reject },
          {executor: fn3, onState: FULFILLED, resolve: resolve, reject: reject },
          ... 
        ]
        将 把对象 F 放入 _handlerQueue 这个功能 封装成函数 _toHandlerQueue
        将 处理 _handlerQueue 里的函数 这个功能 封装成函数 _runHandlerQueue      
        
        -> 🟢 当 Promise 对象的状态发生改变，也就是 执行了 _changeState 的时候，也需要运行 _runHandlerQueue


        1. 如果 _handlerQueue 中的函数执行过程中没有出错，

              如果 _handlerQueue 中的函数的返回值 是一个 Promise 对象 p2 
              那么 then 的返回值 p1 的 _state 和  _result 和 p2 保持一致
            
              如果 _handlerQueue 中的函数的返回值 不是一个 Promise 对象 
              那么 then 的返回值 p1 的 _state 为 fulFilled ， _result 值为 _handlerQueue 中的函数的返回值，

        2. 如果 _handlerQueue 中的函数执行过程中出错， 
              那么 then 的返回值 p1 的 _state 为 rejected ， _result 值为 _handlerQueue 中的函数执行过程中抛出的错误信息

        3. 如果 then 执行的时候 没有接收到参数 或者 接收到的参数不是函数，p1 的 _state 和 _result 和原对象一样

        以上要改变 p1 的 _state 和 _result 都要通过调用 p1 的 resolve 或者 reject 来实现 

*/

/* 
      怎么把一个函数放入微队列？    Vue 里的写法跟下面差不多

      Promise 是 ES6 提出的， node 和 浏览器 都支持，在 node 和 浏览器 都可以用 Promise
      
        1. 如果在 node ：
              node 的全局对象有一个 process 属性是一个对象并且这个对象有一个 nextTick 属性， nextTick 就是 node 的微队列，通过 process.nextTick(callback); 可以把 callback 放到微队列
              浏览器 的全局对象没有 process 属性

        2. 如果在支持 MutationObserver 的浏览器：
              MutationObserver 对象可以用来监测一个 DOM 对象有没有发生变化，创建 MutationObserver 对象时可以传入一个回调函数 callback ， 通过 .observe() 可以指定监听哪一个 DOM 对象 和 监听这个 DOM 对象什么方面的变化，当发生变化的时候，回调函数 callback 就会被放入微队列

              const p = document.createElement("p");
              setTimeout(() => {
                console.log("宏队列");
              }, 0);
              const osv = new MutationObserver(() => {
                console.log("微队列");
              });
              osv.observe(p, { childList: true });
              p.innerHTML = "1";
              console.log("不需要进入事件队列");

              上面代码的输出顺序是：不需要进入事件队列 微队列 宏队列

              所以可以通过上面代码利用 MutationObserver 对象把一个函数放入微队列

        3. 如果在其他环境：
              setTimeout(callback, 0); 可以把 callback 放到宏队列
  */

// 传入一个函数， toMicrotaskQueue 会把callback这个函数放到微队列
// function toMicrotaskQueue(callback) {
//   if (globalThis.process && globalThis.process.nextTick) {
//     /*
//     注意上面这行不能缺少 globalThis. 只写成 if (process && process.nextTick) { 会报错 "process is not defined" ，因为 process 会被当作未被定义的变量
//     globalThis 是一个关键字，指代全局对象
//                 浏览器的 globalThis === window
//                 node的  globalThis === global
//     */
//     process.nextTick(callback);
//   } else if (MutationObserver) {
//     const p = document.createElement("p");
//     const osv = new MutationObserver(callback);
//     osv.observe(p, { childList: true });
//     p.innerHTML = "1";
//   } else {
//     setTimeout(callback, 0);
//   }
// }

//

// function isPromise(obj) {
//   // return obj && typeof obj === "object" && typeof obj.then === "function";
//   // 如果希望返回的结果只能是true或者false（而不会有undefined或者0），写成下面这样：
//   // !! 意思是先取反再取反，反反得正，可以通过这种方式转换成布尔类型
//   return !!(obj && typeof obj === "object" && typeof obj.then === "function");
// }

// const PENDING = "pending";
// const FULFILLED = "fulFilled";
// const REJECTED = "rejected";

// class MyPromise {
//   constructor(executor) {
//     if (typeof executor !== "function") {
//       throw TypeError(`Promise resolver ${executor} is not a function`);
//     }
//     this._state = PENDING;
//     this._result = undefined;
//     this._handlerQueue = [];
//     try {
//       executor(this._resolve.bind(this), this._reject.bind(this));
//     } catch (err) {
//       this._reject(err);
//     }
//   }
//   /**
//    * 把 MyPromise 对象状态为已决时 要处理的东西及处理的前提 放入 _handlesQueue
//    * @param {Function} executor MyPromise 对象状态为已决时可能会执行的函数
//    * @param {String} onState MyPromise 对象的 _state 值为 onState 才会执行 executor
//    * @param {Function} resolve 如果 executor 不是函数可能会执行 resolve ， 如果 executor 是函数而且其执行过程没有出错就执行 resolve
//    * @param {Function} reject 如果 executor 不是函数可能会执行 reject ，如果 executor 是函数而且其执行出错就执行 reject
//    */
//   _toHandlerQueue(executor, onState, resolve, reject) {
//     this._handlerQueue.push({ executor, onState, resolve, reject });
//   }
//   _changeState(newState, result) {
//     if (this._state === PENDING) {
//       this._state = newState;
//       this._result = result;
//     }
//   }
//   _resolve(data) {
//     this._changeState(FULFILLED, data);
//     this._runHandlerQueue();
//   }
//   _reject(reason) {
//     this._changeState(REJECTED, reason);
//     this._runHandlerQueue();
//   }
//   _runHandlerQueue() {
//     if (this._state === PENDING) {
//       return;
//     }
//     while (this._handlerQueue[0]) {
//       this._runOneHandler(this._handlerQueue[0]);
//       this._handlerQueue.shift();
//     }
//   }
//   _runOneHandler({ executor, onState, resolve, reject }) {
//     //上面直接解构而不是用 handler 代替，因为如果后面调用函数时比如用 handler.executor 会导致 this 指向 handler
//     toMicrotaskQueue(() => {
//       if (this._state !== onState) {
//         return;
//       }
//       if (typeof executor !== "function") {
//         this._state === FULFILLED ? resolve(this._result) : reject(this._result);
//       } else {
//         try {
//           const result = executor(this._result);
//           if (isPromise(result)) {
//             result.then(resolve, reject);
//             // 如果 p2 成功了就调用 p1 的 resolve 那么 p1 就也会成功 ，如果 p2 失败了就调用 p1 的 reject 那么 p1 就也会失败
//           } else {
//             resolve(result);
//           }
//         } catch (err) {
//           reject(err);
//         }
//       }
//     });
//   }
//   then(onFulfilled, onRejected) {
//     return new MyPromise((resolve, reject) => {
//       this._toHandlerQueue(onFulfilled, FULFILLED, resolve, reject);
//       this._toHandlerQueue(onRejected, REJECTED, resolve, reject);
//       this._runHandlerQueue();
//     });
//   }
// }

// 🟡 至此已经 MyPromise 完成了 Promise A+ 规范，可以和官方的 Promise 互操作，也可以使用 async 和 await

// const pro1 = new MyPromise((resolve, reject) => {
//   resolve(1);
// });
// pro1
//   .then((data) => {
//     console.log(data);
//     return Promise.resolve(2);
//   })
//   .then((data) => {
//     console.log(data);
//   });

// 上面输出 1 2

// function delay(duration) {
//   return new MyPromise((resolve) => {
//     setTimeout(resolve, duration);
//   });
// }
// (async function () {
//   console.log("start");
//   await delay(500);
//   console.log("ok");
// })();

// 上面输出 start ok

// 🟡 下面在上面基础上增加 catch finally resolve reject all allSettled race 方法，这些都不属于 Promise A+ 规范的范畴

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
const FULFILLED = "fulFilled";
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
  _toHandlersQueue(executor, onState, resolve, reject) {
    this._handlerQueue.push({ executor, onState, resolve, reject });
  }
  _changeState(newState, result) {
    if (this._state === PENDING) {
      this._state = newState;
      this._result = result;
    }
  }
  _resolve(data) {
    this._changeState(FULFILLED, data);
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
    if (this._state !== onState) {
      return;
    }
    toMicrotaskQueue(() => {
      if (typeof executor !== "function") {
        this._state === FULFILLED
          ? resolve(this._result)
          : reject(this._result);
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
  then(onFulfilled, onRejected) {
    return new MyPromise((resolve, reject) => {
      this._toHandlersQueue(onFulfilled, FULFILLED, resolve, reject);
      this._toHandlersQueue(onRejected, REJECTED, resolve, reject);
      this._runHandlerQueue();
    });
  }

  // 🟡  以下内容不属于 Promise A+ 规范的范畴

  catch(onRejected) {
    return this.then(null, onRejected);
  }

  /* 🟡
  Promise 的实例方法 finally , p.finally(onSettled) 返回一个 Promise 对象 p2 , p2 的状态和数据和 p 一致， onSettled 只有在 p 状态为已决时才会被放入微队列，而且 onSettled 函数不会被传入任何参数、 onSettled 函数的返回值也不会影响 p2 的结果， onSettled 就只是执行而已

          如果 onSettled 执行过程中出错，那么 p2 状态为 rejected ，数据为抛出的错误
          -> 这部分其实由 构造器 处理，因为 onSettled 、 onFulfilled 、 onRejected 这些进入到 _handlerQueue 的函数都相当于 构造器 接收的 executor 
  */

  finally(onSettled) {
    return this.then(
      (value) => {
        onSettled();
        return value;
      },
      (reason) => {
        onSettled();
        throw reason; // 通过抛出错误让 p2 失败
      }
    );
  }

  /* 🟡

  Promise 的静态方法 resolve(data) ,
  返回一个值为 data 、 状态为 fulFilled 的新的 Promise 对象，也就是 new Promise((resolve) => { resolve(data);})

  特殊情况：
  1. 如果 data 是 ES6 的 Promise 对象，那么 resolve(data) 的返回值为 data 本身 

      const p1 = Promise.reject(1);
      const p2 = Promise.resolve(p1);
      console.log(p1); // Promise {<rejected>: 1}
      console.log(p2); // Promise {<rejected>: 1}
      console.log(p1 === p2); // true

  2. 如果 data 是 PromiseLike 对象，也就是实现了 Promise A+ 规范的对象，返回一个新的 Promise 对象，状态和 data 保持一致

  也就是说，特殊情况1直接返回data，其他情况返回一个新的 Promise 对象

  */
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
  /* 🟡

  Promise.all(proms)  

  返回一个任务， proms 里的任务全部成功则成功，任何一个失败则失败
  成功的数据为所有任务的数据组成的数组，数组的每一项的顺序和 proms 迭代的顺序一样（而不是谁先完成谁的数据排在前面），失败的数据为第一个失败任务的数据
  
  proms 是一个可迭代对象，每次迭代的结果 prom 是一个 Promise 对象，如果 prom 不是 Promise 对象，就替代为 Promise.resolve(prom) ,相当于全部迭代结果都替代为  Promise.resolve(prom) ，因为如果 prom 是 Promise 对象 / PromiseLike 对象，那么 Promise.resolve(prom) 的返回值（一个 Promise 对象）的状态和数据 ==== prom 的状态和数据

  如果 proms 没有迭代结果，比如是个空数组，那么 Promise.all(proms) 返回的 Promise 对象状态为 fulFilled ,值为 []

  如果 proms 不是可迭代对象，抛出错误，构造器会接住并处理

  */
  static all(proms) {
    return new MyPromise((resolve, reject) => {
      if (!proms || typeof proms[Symbol.iterator] !== "function") {
        throw new TypeError(`${proms} is not iterable`);
      }
      const valueArr = [];
      let promCounter = 0;
      let onFulFilledCounter = 0;
      for (const prom of proms) {
        const index = promCounter;
        /* 
        上面这个 index 因为是在 for-of 循环里用 let 声明的，所以可以保证只在当次 for-of 循环中生效，也就是每次都是一个新的 index （如果把这里的 let 改成 var 会产生闭包问题）
        */
        promCounter++;
        MyPromise.resolve(prom).then((value) => {
          valueArr[index] = value; // 因为 valueArr 的每一项的顺序和 proms 迭代的顺序一样，所以这句不能用 valueArr.push(value);
          onFulFilledCounter++; // 每当有一个任务成功都会导致 onFulFilledCounter+1 同时 valueArr 增加一项，当 onFulFilledCounter 的值也就是 valueArr 的长度等于 promCounter 也就是 proms 的任务总数，证明任务全部成功
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

  /* 🟡
    Promise.any(proms) 这个方法袁老师没有讲，下面代码 _state 没有问题，问题是如果 全部任务失败/proms为空数组，这两种情况下 _result 的内容 和 原生的不一样
    返回一个任务， proms 任一任务成功则成功，数据为第一个成功的任务的数据，任务全部失败则失败
  */

  static any(proms) {
    return new MyPromise((resolve, reject) => {
      if (!proms || typeof proms[Symbol.iterator] !== "function") {
        throw new TypeError(`${proms} is not iterable`);
      }
      const reasonArr = [];
      let promCounter = 0;
      let onRejectedCounter = 0;
      for (const prom of proms) {
        const index = promCounter;
        promCounter++;
        MyPromise.resolve(prom).then(
          (value) => {
            resolve(value);
          },
          (reason) => {
            reasonArr[index] = reason;
            onRejectedCounter++;
            if (onRejectedCounter === promCounter) {
              reject(reasonArr);
              // reject(new Error(`All promises were rejected`));
            }
          }
        );
      }
      if (promCounter === 0) {
        reject();
        // reject(new Error(`All promises were rejected`));
      }
    });
  }

  /* 🟡

  Promise.allSettled(proms)    返回一个任务， proms 全部已决则成功，该任务不会失败

      const p = Promise.allSettled([Promise.reject("a"), Promise.resolve(1)]);
      p 的 result 是 一个数组:
      [
        {status: 'rejected', reason: 'a'},
        {status: 'fulfilled', value: 1}
      ]

  */

  // static allSettled(proms) {
  //   return new MyPromise((resolve) => {
  //     if (!proms || typeof proms[Symbol.iterator] !== "function") {
  //       throw new TypeError(`${proms} is not iterable`);
  //     }
  //     const resultArr = [];
  //     let promCounter = 0;
  //     let onRejectedCounter = 0;
  //     let onFulFilledCounter = 0;
  //     for (const prom of proms) {
  //       const index = promCounter;
  //       promCounter++;
  //       MyPromise.resolve(prom).then(
  //         (value) => {
  //           resultArr[index] = { status: FULFILLED, value };
  //           onFulFilledCounter++;
  //           if (onFulFilledCounter + onRejectedCounter === promCounter) {
  //             resolve(resultArr);
  //           }
  //         },
  //         (reason) => {
  //           resultArr[index] = { status: REJECTED, reason };
  //           onRejectedCounter++;
  //           if (onRejectedCounter + onRejectedCounter === promCounter) {
  //             resolve(resultArr);
  //           }
  //         }
  //       );
  //     }
  //     if (promCounter === 0) {
  //       resolve([]);
  //     }
  //   });
  // }

  /* 🟢 
  
  上面的 allSettled 写得太复杂，可以直接利用 all ，因为 all 的参数就是 proms ，只要确保 proms 里的每一个 Promise 对象都肯定成功 ， all 返回的 Promise 对象一定成功
  要确保 proms 里的每一个 Promise 对象都肯定成功 -> 把每一个 Promise 对象都换成 它.then()

  */

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

  /* 🟡
    Promise.race(proms)          返回一个任务， proms 任一已决则已决，状态和其一致
  */
  static race(proms) {
    return new MyPromise((resolve, reject) => {
      for (const prom of proms) {
        MyPromise.resolve(prom).then(resolve, reject);
      }
    });
  }
}
