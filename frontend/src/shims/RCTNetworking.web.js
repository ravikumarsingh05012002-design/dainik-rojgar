let nextRequestId = 1;

function createSubscription() {
  return {
    remove() {
      // No-op on web fallback.
    },
  };
}

const RCTNetworking = {
  addListener() {
    return createSubscription();
  },
  removeListeners() {
    // No-op on web fallback.
  },
  sendRequest(
    _method,
    _trackingName,
    _url,
    _headers,
    _data,
    _responseType,
    _incrementalUpdates,
    _timeout,
    callback
  ) {
    const requestId = nextRequestId++;
    if (typeof callback === 'function') {
      callback(requestId);
    }
  },
  abortRequest() {
    // No-op on web fallback.
  },
  clearCookies(callback) {
    if (typeof callback === 'function') {
      callback(true);
    }
  },
};

module.exports = RCTNetworking;
module.exports.default = RCTNetworking;
