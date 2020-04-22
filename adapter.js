/**
 * 基于axios对wx.request wx.upload 进行封装，后续可用于async await
 */
function noop() { }

function formatParams(params) {
  let result = [];

  for (let i in params) {
    result.push(encodeURIComponent(i) + '=' + encodeURIComponent(params[i]));
  }

  return result.join('&');
}

function isAbsolute(url) {
  return /^(?:http|https|\/\/)/.test(url);
}

function settle(resolve, reject, response) {
  let validateStatus = response.config.validateStatus;
  if (!validateStatus || validateStatus(response.status)) {
    resolve(response);
  } else {
    reject(createError(
      'Request failed with status code ' + response.status,
      response.config,
      null,
      response.request,
      response
    ));
  }
}

function createError(message, config, code, request, response) {
  let error = new Error(message);
  return enhanceError(error, config, code, request, response);
}

function enhanceError(error, config, code, request, response) {
  error.config = config;
  if (code) {
    error.code = code;
  }
  error.request = request;
  error.response = response;
  return error;
}

const METHOD = {
  defaults: 'request',
  upload: 'uploadFile',
  download: 'downloadFile'
};

const BEFORE = {
  defaults(options, config) {
    options.data = config.data;
    options.method = (config.method || 'get').toUpperCase();
    // 这里让我想一想
    let responseType = config.responseType;

    options.dataType = responseType || 'json',
    options.responseType = responseType === 'arraybuffer' ? 'arraybuffer' : 'text';
  },

  upload(options, config) {
    options.name = config.name;
    options.filePath = config.filePath;
    options.formData = config.formData || {};
  },

  download(options, config) {
    if (config.filePath) {
      options.filePath = config.filePath;
    }
  }
};

const AFTER = {
  defaults(request, config) {
    if (config.onHeadersReceived) {
      request.onHeadersReceived(config.onHeadersReceived);
    }
  },

  upload(request, config) {
    if (config.onUploadProgress) {
      request.onProgressUpdate(config.onUploadProgress);
    }
  },

  download(request, config) {
    if (config.onDownloadProgress) {
      request.onProgressUpdate(config.onDownloadProgress);
    }
  }
};

const COMPLETE = {
  defaults(request, config) {
    if (config.onHeadersReceived) {
      request.offHeadersReceived(config.onHeadersReceived);
    }
  },

  upload(request, config) {
    if (config.onUploadProgress) {
      request.offProgressUpdate(config.onUploadProgress);
    }
  },

  download(request, config) {
    if (config.onDownloadProgress) {
      request.offProgressUpdate(config.onDownloadProgress);
    }
  }
};

const SUCCESS = {
  defaults(res, response) {
    response.data = res.data;
  },

  download(res, response) {
    let data = response.data = {};

    if (res.filePath) {
      data.filePath = res.filePath;
    }

    if (res.tempFilePath) {
      data.tempFilePath = res.tempFilePath;
    }
  }
}

function getMap(map, method) {
  return map[method] || map.defaults;
}

function triggerSelfAndDefaults(map, method, args) {
  let fn = getMap(map, method);
  let fns = [fn];

  if (fn !== map.defaults) {
    fns.push(map.defaults);
  }

  fns.forEach(cb => cb.apply(null, args));
}

/**
 * 基于axios的wx.request和wx.uploadFile适配器
 */
export default function adapter(config) {
  return new Promise((resolve, reject) => {
    let url = config.url;

    if (config.params) {
      let params = formatParams(config.params);

      if (params) {
        url += (url.indexOf('?') >= 0 ? '&' : '?') + params;
      }
    }

    if (!isAbsolute(url)) {
      url = config.baseURL + url;
    }

    let request = null;
    let status = 'pending';
    let method = config.method || 'get';

    let options = {
      url,
      header: config.headers,
      timeout: config.timeout || 0,

      success(res) {
        if (status !== 'pending') {
          return;
        }

        status = 'succeed';

        res.header.cookies = res.cookies || [];

        let response = {
          status: res.statusCode,
          statusText: res.errMsg,
          headers: res.header,
          config: config,
          request: request
        };

        getMap(SUCCESS, method)(res, response);

        settle(resolve, reject, response);
      },

      fail(e) {
        if (status !== 'pending') {
          return;
        }

        status = 'failed';

        reject(createError(e.errMsg || 'Network Error', config, null, request));
      },

      complete() {
        if (request) {
          triggerSelfAndDefaults(COMPLETE, method, [ request, config ]);
          request = null;
        }
      }
    };

    getMap(BEFORE, method)(options, config);

    let m = getMap(METHOD, method);

    request = wx[m](options);

    triggerSelfAndDefaults(AFTER, method, [request, config]);

    if (config.cancelToken) {

      config.cancelToken.promise.then(cancel => {
        if (!request) {
          return;
        }

        triggerSelfAndDefaults(COMPLETE, method, [request, config]);

        request.abort();

        request = null;

        reject(cancel);
      });
    }
  });
}