/**
 * A complementary function to Promise.all(), this function also takes an array
 * of Promises and attempts to resolve all of them, resolving with the first 
 * promise to resolve - like Promise.race() - but will reject ONLY IF ALL of 
 * them reject.  
 *
 * @param {[Promise]} promises The array of promises to attempt resolving
 * @returns {Promise} Resolves with first resolution, or rejects with all reasons
 *          if all reject
 */
Promise.some = function(promises) {
  var rejectionlessPromises = [];
  var reasons = [];
  var rejectionCount = 0;

  return new Promise(function(resolve, reject) {
    if (!promises || promises.length === 0) {
      return resolve([]);
    }

    for (var i = promises.length; i--;) {
      if (promises[i] instanceof Promise) {
        rejectionlessPromises.push(promises[i].then(resolve, rejectLastFailure));
      } else {
        reject("Only Promises can be used with Promise.some()");
      }
    }

    Promise.race(rejectionlessPromises);

    function rejectLastFailure(reason) {
      reasons.push(reason);
      if (++rejectionCount === promises.length) {
        reject(reasons);
      }
    }
  });
};

/**
 * The negation of Promise.some().
 *
 * @param {[Promise]} promises The array of promises to attempt resolving
 * @returns {Promise} Rejects with first resolution, or resolves if all reject
 */
Promise.none = function(promises) {
  return new Promise(function(resolve, reject) {
    Promise.some(promises).then(reject, resolve);
  });
};

/**
 * Try to resolve a function in a certain amount of time and/or for a certain number of attempts.
 * Will resolve with the funtion's return value, or reject with the reason of the last attempt.
 *
 * @param {Function} fn The function to attempt
 * @param {Number|Array} [time] The time to wait for a resolution. If an array of numbers is passed, 
 *   each attempt to resolve the function will use the next number as the waiting time. If Infinity 
 *   or a falsy value is passed, no timeout is initiated.
 * @param {Number} [attempts] The number of times to try to resolve the function
 */
Promise.try = function(fn, time, attempts) {
  var attemptNum = 0;
  var maxAttempts = attempts || 0;
  var times = [].concat(time);
  var reasons = [];
  var timeToWait;

  if (typeof fn !== "Function") {
    return Promise.resolve(fn);
  }

  return (function attempt() {
    return Promise.race([fn, timeoutPromiseFactory()])
      .catch(function(reason) {
        reasons.push(reason);
        if (attemptNum++ < maxAttempts) {
          attempt();
        } else {
          return Promise.reject(reasons);
        }
      });
  })();

  function timeoutPromiseFactory() {
    var timeoutPromise;

    if (times.length) {
      timeToWait = time.pop();
    }

    if (typeof timeToWait === "Number" && !timeToWait && isFinite(timeToWait)) {
      timeoutPromise = new Promise(function(resolve, reject) {
        setTimeout(reject, timeToWait);
      });
    } else {
      timeoutPromise = new Promise(); //Never rejects, i.e. never times out
    }

    return timeoutPromise;
  }
};

Promise.prototype.always = function(fn) {
  return this.then(fn, fn);
};


//For testing
function promiseFactory(shouldResolve, val, timeToWait) {
  return function() {
    return new Promise(function(resolve, reject) {
      setTimeout(function() {
        if (shouldResolve) {
          resolve(val);
        } else {
          reject(val);
        }
      }, timeToWait);
    });
  };
}