(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
/* smoothscroll v0.4.0 - 2018 - Dustan Kasten, Jeremias Menichelli - MIT License */
(function () {
  'use strict';

  // polyfill
  function polyfill() {
    // aliases
    var w = window;
    var d = document;

    // return if scroll behavior is supported and polyfill is not forced
    if (
      'scrollBehavior' in d.documentElement.style &&
      w.__forceSmoothScrollPolyfill__ !== true
    ) {
      return;
    }

    // globals
    var Element = w.HTMLElement || w.Element;
    var SCROLL_TIME = 468;

    // object gathering original scroll methods
    var original = {
      scroll: w.scroll || w.scrollTo,
      scrollBy: w.scrollBy,
      elementScroll: Element.prototype.scroll || scrollElement,
      scrollIntoView: Element.prototype.scrollIntoView
    };

    // define timing method
    var now =
      w.performance && w.performance.now
        ? w.performance.now.bind(w.performance)
        : Date.now;

    /**
     * indicates if a the current browser is made by Microsoft
     * @method isMicrosoftBrowser
     * @param {String} userAgent
     * @returns {Boolean}
     */
    function isMicrosoftBrowser(userAgent) {
      var userAgentPatterns = ['MSIE ', 'Trident/', 'Edge/'];

      return new RegExp(userAgentPatterns.join('|')).test(userAgent);
    }

    /*
     * IE has rounding bug rounding down clientHeight and clientWidth and
     * rounding up scrollHeight and scrollWidth causing false positives
     * on hasScrollableSpace
     */
    var ROUNDING_TOLERANCE = isMicrosoftBrowser(w.navigator.userAgent) ? 1 : 0;

    /**
     * changes scroll position inside an element
     * @method scrollElement
     * @param {Number} x
     * @param {Number} y
     * @returns {undefined}
     */
    function scrollElement(x, y) {
      this.scrollLeft = x;
      this.scrollTop = y;
    }

    /**
     * returns result of applying ease math function to a number
     * @method ease
     * @param {Number} k
     * @returns {Number}
     */
    function ease(k) {
      return 0.5 * (1 - Math.cos(Math.PI * k));
    }

    /**
     * indicates if a smooth behavior should be applied
     * @method shouldBailOut
     * @param {Number|Object} firstArg
     * @returns {Boolean}
     */
    function shouldBailOut(firstArg) {
      if (
        firstArg === null ||
        typeof firstArg !== 'object' ||
        firstArg.behavior === undefined ||
        firstArg.behavior === 'auto' ||
        firstArg.behavior === 'instant'
      ) {
        // first argument is not an object/null
        // or behavior is auto, instant or undefined
        return true;
      }

      if (typeof firstArg === 'object' && firstArg.behavior === 'smooth') {
        // first argument is an object and behavior is smooth
        return false;
      }

      // throw error when behavior is not supported
      throw new TypeError(
        'behavior member of ScrollOptions ' +
          firstArg.behavior +
          ' is not a valid value for enumeration ScrollBehavior.'
      );
    }

    /**
     * indicates if an element has scrollable space in the provided axis
     * @method hasScrollableSpace
     * @param {Node} el
     * @param {String} axis
     * @returns {Boolean}
     */
    function hasScrollableSpace(el, axis) {
      if (axis === 'Y') {
        return el.clientHeight + ROUNDING_TOLERANCE < el.scrollHeight;
      }

      if (axis === 'X') {
        return el.clientWidth + ROUNDING_TOLERANCE < el.scrollWidth;
      }
    }

    /**
     * indicates if an element has a scrollable overflow property in the axis
     * @method canOverflow
     * @param {Node} el
     * @param {String} axis
     * @returns {Boolean}
     */
    function canOverflow(el, axis) {
      var overflowValue = w.getComputedStyle(el, null)['overflow' + axis];

      return overflowValue === 'auto' || overflowValue === 'scroll';
    }

    /**
     * indicates if an element can be scrolled in either axis
     * @method isScrollable
     * @param {Node} el
     * @param {String} axis
     * @returns {Boolean}
     */
    function isScrollable(el) {
      var isScrollableY = hasScrollableSpace(el, 'Y') && canOverflow(el, 'Y');
      var isScrollableX = hasScrollableSpace(el, 'X') && canOverflow(el, 'X');

      return isScrollableY || isScrollableX;
    }

    /**
     * finds scrollable parent of an element
     * @method findScrollableParent
     * @param {Node} el
     * @returns {Node} el
     */
    function findScrollableParent(el) {
      var isBody;

      do {
        el = el.parentNode;

        isBody = el === d.body;
      } while (isBody === false && isScrollable(el) === false);

      isBody = null;

      return el;
    }

    /**
     * self invoked function that, given a context, steps through scrolling
     * @method step
     * @param {Object} context
     * @returns {undefined}
     */
    function step(context) {
      var time = now();
      var value;
      var currentX;
      var currentY;
      var elapsed = (time - context.startTime) / SCROLL_TIME;

      // avoid elapsed times higher than one
      elapsed = elapsed > 1 ? 1 : elapsed;

      // apply easing to elapsed time
      value = ease(elapsed);

      currentX = context.startX + (context.x - context.startX) * value;
      currentY = context.startY + (context.y - context.startY) * value;

      context.method.call(context.scrollable, currentX, currentY);

      // scroll more if we have not reached our destination
      if (currentX !== context.x || currentY !== context.y) {
        w.requestAnimationFrame(step.bind(w, context));
      }
    }

    /**
     * scrolls window or element with a smooth behavior
     * @method smoothScroll
     * @param {Object|Node} el
     * @param {Number} x
     * @param {Number} y
     * @returns {undefined}
     */
    function smoothScroll(el, x, y) {
      var scrollable;
      var startX;
      var startY;
      var method;
      var startTime = now();

      // define scroll context
      if (el === d.body) {
        scrollable = w;
        startX = w.scrollX || w.pageXOffset;
        startY = w.scrollY || w.pageYOffset;
        method = original.scroll;
      } else {
        scrollable = el;
        startX = el.scrollLeft;
        startY = el.scrollTop;
        method = scrollElement;
      }

      // scroll looping over a frame
      step({
        scrollable: scrollable,
        method: method,
        startTime: startTime,
        startX: startX,
        startY: startY,
        x: x,
        y: y
      });
    }

    // ORIGINAL METHODS OVERRIDES
    // w.scroll and w.scrollTo
    w.scroll = w.scrollTo = function() {
      // avoid action when no arguments are passed
      if (arguments[0] === undefined) {
        return;
      }

      // avoid smooth behavior if not required
      if (shouldBailOut(arguments[0]) === true) {
        original.scroll.call(
          w,
          arguments[0].left !== undefined
            ? arguments[0].left
            : typeof arguments[0] !== 'object'
              ? arguments[0]
              : w.scrollX || w.pageXOffset,
          // use top prop, second argument if present or fallback to scrollY
          arguments[0].top !== undefined
            ? arguments[0].top
            : arguments[1] !== undefined
              ? arguments[1]
              : w.scrollY || w.pageYOffset
        );

        return;
      }

      // LET THE SMOOTHNESS BEGIN!
      smoothScroll.call(
        w,
        d.body,
        arguments[0].left !== undefined
          ? ~~arguments[0].left
          : w.scrollX || w.pageXOffset,
        arguments[0].top !== undefined
          ? ~~arguments[0].top
          : w.scrollY || w.pageYOffset
      );
    };

    // w.scrollBy
    w.scrollBy = function() {
      // avoid action when no arguments are passed
      if (arguments[0] === undefined) {
        return;
      }

      // avoid smooth behavior if not required
      if (shouldBailOut(arguments[0])) {
        original.scrollBy.call(
          w,
          arguments[0].left !== undefined
            ? arguments[0].left
            : typeof arguments[0] !== 'object' ? arguments[0] : 0,
          arguments[0].top !== undefined
            ? arguments[0].top
            : arguments[1] !== undefined ? arguments[1] : 0
        );

        return;
      }

      // LET THE SMOOTHNESS BEGIN!
      smoothScroll.call(
        w,
        d.body,
        ~~arguments[0].left + (w.scrollX || w.pageXOffset),
        ~~arguments[0].top + (w.scrollY || w.pageYOffset)
      );
    };

    // Element.prototype.scroll and Element.prototype.scrollTo
    Element.prototype.scroll = Element.prototype.scrollTo = function() {
      // avoid action when no arguments are passed
      if (arguments[0] === undefined) {
        return;
      }

      // avoid smooth behavior if not required
      if (shouldBailOut(arguments[0]) === true) {
        // if one number is passed, throw error to match Firefox implementation
        if (typeof arguments[0] === 'number' && arguments[1] === undefined) {
          throw new SyntaxError('Value could not be converted');
        }

        original.elementScroll.call(
          this,
          // use left prop, first number argument or fallback to scrollLeft
          arguments[0].left !== undefined
            ? ~~arguments[0].left
            : typeof arguments[0] !== 'object' ? ~~arguments[0] : this.scrollLeft,
          // use top prop, second argument or fallback to scrollTop
          arguments[0].top !== undefined
            ? ~~arguments[0].top
            : arguments[1] !== undefined ? ~~arguments[1] : this.scrollTop
        );

        return;
      }

      var left = arguments[0].left;
      var top = arguments[0].top;

      // LET THE SMOOTHNESS BEGIN!
      smoothScroll.call(
        this,
        this,
        typeof left === 'undefined' ? this.scrollLeft : ~~left,
        typeof top === 'undefined' ? this.scrollTop : ~~top
      );
    };

    // Element.prototype.scrollBy
    Element.prototype.scrollBy = function() {
      // avoid action when no arguments are passed
      if (arguments[0] === undefined) {
        return;
      }

      // avoid smooth behavior if not required
      if (shouldBailOut(arguments[0]) === true) {
        original.elementScroll.call(
          this,
          arguments[0].left !== undefined
            ? ~~arguments[0].left + this.scrollLeft
            : ~~arguments[0] + this.scrollLeft,
          arguments[0].top !== undefined
            ? ~~arguments[0].top + this.scrollTop
            : ~~arguments[1] + this.scrollTop
        );

        return;
      }

      this.scroll({
        left: ~~arguments[0].left + this.scrollLeft,
        top: ~~arguments[0].top + this.scrollTop,
        behavior: arguments[0].behavior
      });
    };

    // Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = function() {
      // avoid smooth behavior if not required
      if (shouldBailOut(arguments[0]) === true) {
        original.scrollIntoView.call(
          this,
          arguments[0] === undefined ? true : arguments[0]
        );

        return;
      }

      // LET THE SMOOTHNESS BEGIN!
      var scrollableParent = findScrollableParent(this);
      var parentRects = scrollableParent.getBoundingClientRect();
      var clientRects = this.getBoundingClientRect();

      if (scrollableParent !== d.body) {
        // reveal element inside parent
        smoothScroll.call(
          this,
          scrollableParent,
          scrollableParent.scrollLeft + clientRects.left - parentRects.left,
          scrollableParent.scrollTop + clientRects.top - parentRects.top
        );

        // reveal parent in viewport unless is fixed
        if (w.getComputedStyle(scrollableParent).position !== 'fixed') {
          w.scrollBy({
            left: parentRects.left,
            top: parentRects.top,
            behavior: 'smooth'
          });
        }
      } else {
        // reveal element in viewport
        w.scrollBy({
          left: clientRects.left,
          top: clientRects.top,
          behavior: 'smooth'
        });
      }
    };
  }

  if (typeof exports === 'object' && typeof module !== 'undefined') {
    // commonjs
    module.exports = { polyfill: polyfill };
  } else {
    // global
    polyfill();
  }

}());

},{}],2:[function(require,module,exports){
(function(self) {
  'use strict';

  if (self.fetch) {
    return
  }

  var support = {
    searchParams: 'URLSearchParams' in self,
    iterable: 'Symbol' in self && 'iterator' in Symbol,
    blob: 'FileReader' in self && 'Blob' in self && (function() {
      try {
        new Blob()
        return true
      } catch(e) {
        return false
      }
    })(),
    formData: 'FormData' in self,
    arrayBuffer: 'ArrayBuffer' in self
  }

  if (support.arrayBuffer) {
    var viewClasses = [
      '[object Int8Array]',
      '[object Uint8Array]',
      '[object Uint8ClampedArray]',
      '[object Int16Array]',
      '[object Uint16Array]',
      '[object Int32Array]',
      '[object Uint32Array]',
      '[object Float32Array]',
      '[object Float64Array]'
    ]

    var isDataView = function(obj) {
      return obj && DataView.prototype.isPrototypeOf(obj)
    }

    var isArrayBufferView = ArrayBuffer.isView || function(obj) {
      return obj && viewClasses.indexOf(Object.prototype.toString.call(obj)) > -1
    }
  }

  function normalizeName(name) {
    if (typeof name !== 'string') {
      name = String(name)
    }
    if (/[^a-z0-9\-#$%&'*+.\^_`|~]/i.test(name)) {
      throw new TypeError('Invalid character in header field name')
    }
    return name.toLowerCase()
  }

  function normalizeValue(value) {
    if (typeof value !== 'string') {
      value = String(value)
    }
    return value
  }

  // Build a destructive iterator for the value list
  function iteratorFor(items) {
    var iterator = {
      next: function() {
        var value = items.shift()
        return {done: value === undefined, value: value}
      }
    }

    if (support.iterable) {
      iterator[Symbol.iterator] = function() {
        return iterator
      }
    }

    return iterator
  }

  function Headers(headers) {
    this.map = {}

    if (headers instanceof Headers) {
      headers.forEach(function(value, name) {
        this.append(name, value)
      }, this)
    } else if (Array.isArray(headers)) {
      headers.forEach(function(header) {
        this.append(header[0], header[1])
      }, this)
    } else if (headers) {
      Object.getOwnPropertyNames(headers).forEach(function(name) {
        this.append(name, headers[name])
      }, this)
    }
  }

  Headers.prototype.append = function(name, value) {
    name = normalizeName(name)
    value = normalizeValue(value)
    var oldValue = this.map[name]
    this.map[name] = oldValue ? oldValue+','+value : value
  }

  Headers.prototype['delete'] = function(name) {
    delete this.map[normalizeName(name)]
  }

  Headers.prototype.get = function(name) {
    name = normalizeName(name)
    return this.has(name) ? this.map[name] : null
  }

  Headers.prototype.has = function(name) {
    return this.map.hasOwnProperty(normalizeName(name))
  }

  Headers.prototype.set = function(name, value) {
    this.map[normalizeName(name)] = normalizeValue(value)
  }

  Headers.prototype.forEach = function(callback, thisArg) {
    for (var name in this.map) {
      if (this.map.hasOwnProperty(name)) {
        callback.call(thisArg, this.map[name], name, this)
      }
    }
  }

  Headers.prototype.keys = function() {
    var items = []
    this.forEach(function(value, name) { items.push(name) })
    return iteratorFor(items)
  }

  Headers.prototype.values = function() {
    var items = []
    this.forEach(function(value) { items.push(value) })
    return iteratorFor(items)
  }

  Headers.prototype.entries = function() {
    var items = []
    this.forEach(function(value, name) { items.push([name, value]) })
    return iteratorFor(items)
  }

  if (support.iterable) {
    Headers.prototype[Symbol.iterator] = Headers.prototype.entries
  }

  function consumed(body) {
    if (body.bodyUsed) {
      return Promise.reject(new TypeError('Already read'))
    }
    body.bodyUsed = true
  }

  function fileReaderReady(reader) {
    return new Promise(function(resolve, reject) {
      reader.onload = function() {
        resolve(reader.result)
      }
      reader.onerror = function() {
        reject(reader.error)
      }
    })
  }

  function readBlobAsArrayBuffer(blob) {
    var reader = new FileReader()
    var promise = fileReaderReady(reader)
    reader.readAsArrayBuffer(blob)
    return promise
  }

  function readBlobAsText(blob) {
    var reader = new FileReader()
    var promise = fileReaderReady(reader)
    reader.readAsText(blob)
    return promise
  }

  function readArrayBufferAsText(buf) {
    var view = new Uint8Array(buf)
    var chars = new Array(view.length)

    for (var i = 0; i < view.length; i++) {
      chars[i] = String.fromCharCode(view[i])
    }
    return chars.join('')
  }

  function bufferClone(buf) {
    if (buf.slice) {
      return buf.slice(0)
    } else {
      var view = new Uint8Array(buf.byteLength)
      view.set(new Uint8Array(buf))
      return view.buffer
    }
  }

  function Body() {
    this.bodyUsed = false

    this._initBody = function(body) {
      this._bodyInit = body
      if (!body) {
        this._bodyText = ''
      } else if (typeof body === 'string') {
        this._bodyText = body
      } else if (support.blob && Blob.prototype.isPrototypeOf(body)) {
        this._bodyBlob = body
      } else if (support.formData && FormData.prototype.isPrototypeOf(body)) {
        this._bodyFormData = body
      } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
        this._bodyText = body.toString()
      } else if (support.arrayBuffer && support.blob && isDataView(body)) {
        this._bodyArrayBuffer = bufferClone(body.buffer)
        // IE 10-11 can't handle a DataView body.
        this._bodyInit = new Blob([this._bodyArrayBuffer])
      } else if (support.arrayBuffer && (ArrayBuffer.prototype.isPrototypeOf(body) || isArrayBufferView(body))) {
        this._bodyArrayBuffer = bufferClone(body)
      } else {
        throw new Error('unsupported BodyInit type')
      }

      if (!this.headers.get('content-type')) {
        if (typeof body === 'string') {
          this.headers.set('content-type', 'text/plain;charset=UTF-8')
        } else if (this._bodyBlob && this._bodyBlob.type) {
          this.headers.set('content-type', this._bodyBlob.type)
        } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
          this.headers.set('content-type', 'application/x-www-form-urlencoded;charset=UTF-8')
        }
      }
    }

    if (support.blob) {
      this.blob = function() {
        var rejected = consumed(this)
        if (rejected) {
          return rejected
        }

        if (this._bodyBlob) {
          return Promise.resolve(this._bodyBlob)
        } else if (this._bodyArrayBuffer) {
          return Promise.resolve(new Blob([this._bodyArrayBuffer]))
        } else if (this._bodyFormData) {
          throw new Error('could not read FormData body as blob')
        } else {
          return Promise.resolve(new Blob([this._bodyText]))
        }
      }

      this.arrayBuffer = function() {
        if (this._bodyArrayBuffer) {
          return consumed(this) || Promise.resolve(this._bodyArrayBuffer)
        } else {
          return this.blob().then(readBlobAsArrayBuffer)
        }
      }
    }

    this.text = function() {
      var rejected = consumed(this)
      if (rejected) {
        return rejected
      }

      if (this._bodyBlob) {
        return readBlobAsText(this._bodyBlob)
      } else if (this._bodyArrayBuffer) {
        return Promise.resolve(readArrayBufferAsText(this._bodyArrayBuffer))
      } else if (this._bodyFormData) {
        throw new Error('could not read FormData body as text')
      } else {
        return Promise.resolve(this._bodyText)
      }
    }

    if (support.formData) {
      this.formData = function() {
        return this.text().then(decode)
      }
    }

    this.json = function() {
      return this.text().then(JSON.parse)
    }

    return this
  }

  // HTTP methods whose capitalization should be normalized
  var methods = ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT']

  function normalizeMethod(method) {
    var upcased = method.toUpperCase()
    return (methods.indexOf(upcased) > -1) ? upcased : method
  }

  function Request(input, options) {
    options = options || {}
    var body = options.body

    if (input instanceof Request) {
      if (input.bodyUsed) {
        throw new TypeError('Already read')
      }
      this.url = input.url
      this.credentials = input.credentials
      if (!options.headers) {
        this.headers = new Headers(input.headers)
      }
      this.method = input.method
      this.mode = input.mode
      if (!body && input._bodyInit != null) {
        body = input._bodyInit
        input.bodyUsed = true
      }
    } else {
      this.url = String(input)
    }

    this.credentials = options.credentials || this.credentials || 'omit'
    if (options.headers || !this.headers) {
      this.headers = new Headers(options.headers)
    }
    this.method = normalizeMethod(options.method || this.method || 'GET')
    this.mode = options.mode || this.mode || null
    this.referrer = null

    if ((this.method === 'GET' || this.method === 'HEAD') && body) {
      throw new TypeError('Body not allowed for GET or HEAD requests')
    }
    this._initBody(body)
  }

  Request.prototype.clone = function() {
    return new Request(this, { body: this._bodyInit })
  }

  function decode(body) {
    var form = new FormData()
    body.trim().split('&').forEach(function(bytes) {
      if (bytes) {
        var split = bytes.split('=')
        var name = split.shift().replace(/\+/g, ' ')
        var value = split.join('=').replace(/\+/g, ' ')
        form.append(decodeURIComponent(name), decodeURIComponent(value))
      }
    })
    return form
  }

  function parseHeaders(rawHeaders) {
    var headers = new Headers()
    // Replace instances of \r\n and \n followed by at least one space or horizontal tab with a space
    // https://tools.ietf.org/html/rfc7230#section-3.2
    var preProcessedHeaders = rawHeaders.replace(/\r?\n[\t ]+/g, ' ')
    preProcessedHeaders.split(/\r?\n/).forEach(function(line) {
      var parts = line.split(':')
      var key = parts.shift().trim()
      if (key) {
        var value = parts.join(':').trim()
        headers.append(key, value)
      }
    })
    return headers
  }

  Body.call(Request.prototype)

  function Response(bodyInit, options) {
    if (!options) {
      options = {}
    }

    this.type = 'default'
    this.status = options.status === undefined ? 200 : options.status
    this.ok = this.status >= 200 && this.status < 300
    this.statusText = 'statusText' in options ? options.statusText : 'OK'
    this.headers = new Headers(options.headers)
    this.url = options.url || ''
    this._initBody(bodyInit)
  }

  Body.call(Response.prototype)

  Response.prototype.clone = function() {
    return new Response(this._bodyInit, {
      status: this.status,
      statusText: this.statusText,
      headers: new Headers(this.headers),
      url: this.url
    })
  }

  Response.error = function() {
    var response = new Response(null, {status: 0, statusText: ''})
    response.type = 'error'
    return response
  }

  var redirectStatuses = [301, 302, 303, 307, 308]

  Response.redirect = function(url, status) {
    if (redirectStatuses.indexOf(status) === -1) {
      throw new RangeError('Invalid status code')
    }

    return new Response(null, {status: status, headers: {location: url}})
  }

  self.Headers = Headers
  self.Request = Request
  self.Response = Response

  self.fetch = function(input, init) {
    return new Promise(function(resolve, reject) {
      var request = new Request(input, init)
      var xhr = new XMLHttpRequest()

      xhr.onload = function() {
        var options = {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: parseHeaders(xhr.getAllResponseHeaders() || '')
        }
        options.url = 'responseURL' in xhr ? xhr.responseURL : options.headers.get('X-Request-URL')
        var body = 'response' in xhr ? xhr.response : xhr.responseText
        resolve(new Response(body, options))
      }

      xhr.onerror = function() {
        reject(new TypeError('Network request failed'))
      }

      xhr.ontimeout = function() {
        reject(new TypeError('Network request failed'))
      }

      xhr.open(request.method, request.url, true)

      if (request.credentials === 'include') {
        xhr.withCredentials = true
      } else if (request.credentials === 'omit') {
        xhr.withCredentials = false
      }

      if ('responseType' in xhr && support.blob) {
        xhr.responseType = 'blob'
      }

      request.headers.forEach(function(value, name) {
        xhr.setRequestHeader(name, value)
      })

      xhr.send(typeof request._bodyInit === 'undefined' ? null : request._bodyInit)
    })
  }
  self.fetch.polyfill = true
})(typeof self !== 'undefined' ? self : this);

},{}],3:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
var DB = 'https://nexus-catalog.firebaseio.com/posts.json?auth=7g7pyKKykN3N5ewrImhOaS6vwrFsc5fKkrk8ejzf';

var $loading = Array.from(document.querySelectorAll('.loading'));
var $articleList = document.getElementById('js-list');
var $nav = document.getElementById('js-nav');
var $parallax = document.querySelector('.parallax');
var $content = document.querySelector('.content');
var $title = document.getElementById('js-title');
var $upArrow = document.getElementById('js-arrow');
var $modal = document.querySelector('.modal');
var $lightbox = document.querySelector('.lightbox');
var $view = document.querySelector('.lightbox-view');
var sortIds = ['artist', 'title'];

exports.DB = DB;
exports.$loading = $loading;
exports.$articleList = $articleList;
exports.$nav = $nav;
exports.$parallax = $parallax;
exports.$content = $content;
exports.$title = $title;
exports.$upArrow = $upArrow;
exports.$modal = $modal;
exports.$lightbox = $lightbox;
exports.$view = $view;
exports.sortIds = sortIds;

},{}],4:[function(require,module,exports){
'use strict';

var _smoothscrollPolyfill = require('smoothscroll-polyfill');

var _smoothscrollPolyfill2 = _interopRequireDefault(_smoothscrollPolyfill);

require('whatwg-fetch');

var _templates = require('./templates');

var _utils = require('./utils');

var _constants = require('./constants');

var _modules = require('./modules');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var sortKey = 0; // 0 = artist, 1 = title
var entries = { byAuthor: [], byTitle: [] };

var setUpSortButtons = function setUpSortButtons() {
	_constants.sortIds.forEach(function (id) {
		var alt = id === 'artist' ? 'title' : 'artist';

		var $button = document.getElementById('js-by-' + id);
		var $altButton = document.getElementById('js-by-' + alt);

		$button.addEventListener('click', function () {
			(0, _utils.scrollToTop)();
			sortKey = !sortKey;
			renderEntries();

			$button.classList.add('active');
			$altButton.classList.remove('active');
		});
	});
};

var makeCitation = function makeCitation(entry, i) {
	var credit = entry.credit,
	    credit_link = entry.credit_link;

	var entryDescription = document.getElementById('slider-' + i).querySelector('.article-description');
	var citation = '<div class="article-credit">source: <a href="' + credit_link + '">' + credit + '</a></div>';

	entryDescription.insertAdjacentHTML('beforeend', citation);
};

var renderEntries = function renderEntries() {
	var entriesList = sortKey ? entries.byTitle : entries.byAuthor;

	_constants.$articleList.innerHTML = '';

	entriesList.forEach(function (entry, i) {
		_constants.$articleList.insertAdjacentHTML('beforeend', (0, _templates.articleTemplate)(entry, i));
		(0, _modules.makeSlider)(document.getElementById('slider-' + i));

		if (entry.credit) {
			makeCitation(entry, i);
		}
	});

	if (window.screen.width > 768) (0, _modules.attachImageListeners)();

	_constants.$articleList.classList.add('ready');

	(0, _modules.makeAlphabet)(sortKey);
};

var setDataAndSortByTitle = function setDataAndSortByTitle(data) {
	entries.byAuthor = data;
	entries.byTitle = data.slice(); // copies data for byTitle sort

	entries.byTitle.sort(function (a, b) {
		var aTitle = a.title[0].toUpperCase();
		var bTitle = b.title[0].toUpperCase();
		if (aTitle > bTitle) return 1;else if (aTitle < bTitle) return -1;else return 0;
	});
};

var fetchData = function fetchData() {
	fetch(_constants.DB).then(function (res) {
		return res.json();
	}).then(function (data) {
		setDataAndSortByTitle(data);
		renderEntries();
		(0, _utils.hideLoading)();
	}).catch(function (err) {
		return console.warn(err);
	});
};

var init = function init() {
	_smoothscrollPolyfill2.default.polyfill();
	fetchData();
	(0, _templates.renderNavLg)();
	setUpSortButtons();
	(0, _modules.attachUpArrowListeners)();
	(0, _modules.attachModalListeners)();
};

init();

},{"./constants":3,"./modules":8,"./templates":12,"./utils":14,"smoothscroll-polyfill":1,"whatwg-fetch":2}],5:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _constants = require('../constants');

var lightbox = false;
var x2 = false;
var viewClass = void 0;

var attachImageListeners = function attachImageListeners() {
	var $images = Array.from(document.querySelectorAll('.article-image'));

	$images.forEach(function (img) {
		img.addEventListener('click', function (evt) {
			if (!lightbox) {
				_constants.$lightbox.classList.add('show-img');
				_constants.$view.src = img.src;
				lightbox = true;
			}
		});
	});

	_constants.$lightbox.addEventListener('click', function (evt) {
		if (evt.target === _constants.$view) return;
		_constants.$lightbox.classList.remove('show-img');
		lightbox = false;
	});

	_constants.$view.addEventListener('click', function () {
		if (!x2) {
			viewClass = _constants.$view.width < window.innerWidth ? 'view-x2--sm' : 'view-x2';
			_constants.$view.classList.add(viewClass);
			setTimeout(function () {
				return x2 = true;
			}, 300);
		} else {
			_constants.$view.classList.remove(viewClass);
			_constants.$lightbox.classList.remove('show-img');
			x2 = false;
			lightbox = false;
		}
	});
};

exports.default = attachImageListeners;

},{"../constants":3}],6:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _constants = require('../constants');

var modal = false;
var attachModalListeners = function attachModalListeners() {
	var $find = document.getElementById('js-find');

	$find.addEventListener('click', function () {
		_constants.$modal.classList.add('show');
		modal = true;
	});

	_constants.$modal.addEventListener('click', function () {
		_constants.$modal.classList.remove('show');
		modal = false;
	});

	window.addEventListener('keydown', function () {
		if (modal) {
			setTimeout(function () {
				_constants.$modal.classList.remove('show');
				modal = false;
			}, 600);
		};
	});
};

exports.default = attachModalListeners;

},{"../constants":3}],7:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _constants = require('../constants');

var _utils = require('../utils');

var prev = void 0;
var current = 0;
var isShowing = false;

var attachUpArrowListeners = function attachUpArrowListeners() {
	_constants.$parallax.addEventListener('scroll', function () {
		var y = _constants.$title.getBoundingClientRect().y;

		if (current !== y) {
			prev = current;
			current = y;
		};

		if (y <= -50 && !isShowing) {
			_constants.$upArrow.classList.add('show');
			isShowing = true;
		} else if (y > -50 && isShowing) {
			_constants.$upArrow.classList.remove('show');
			isShowing = false;
		}
	});

	_constants.$upArrow.addEventListener('click', function () {
		return (0, _utils.scrollToTop)();
	});
};

exports.default = attachUpArrowListeners;

},{"../constants":3,"../utils":14}],8:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.makeSlider = exports.makeAlphabet = exports.attachImageListeners = exports.attachUpArrowListeners = exports.attachModalListeners = undefined;

var _attachModalListeners = require('./attachModalListeners');

var _attachModalListeners2 = _interopRequireDefault(_attachModalListeners);

var _attachUpArrowListeners = require('./attachUpArrowListeners');

var _attachUpArrowListeners2 = _interopRequireDefault(_attachUpArrowListeners);

var _attachImageListeners = require('./attachImageListeners');

var _attachImageListeners2 = _interopRequireDefault(_attachImageListeners);

var _makeAlphabet = require('./makeAlphabet');

var _makeAlphabet2 = _interopRequireDefault(_makeAlphabet);

var _makeSlider = require('./makeSlider');

var _makeSlider2 = _interopRequireDefault(_makeSlider);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.attachModalListeners = _attachModalListeners2.default;
exports.attachUpArrowListeners = _attachUpArrowListeners2.default;
exports.attachImageListeners = _attachImageListeners2.default;
exports.makeAlphabet = _makeAlphabet2.default;
exports.makeSlider = _makeSlider2.default;

},{"./attachImageListeners":5,"./attachModalListeners":6,"./attachUpArrowListeners":7,"./makeAlphabet":9,"./makeSlider":10}],9:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
var alphabet = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'r', 's', 't', 'u', 'v', 'w', 'y', 'z'];

var makeAlphabet = function makeAlphabet(sortKey) {
	var findFirstEntry = function findFirstEntry(char) {
		var selector = sortKey ? '.js-entry-title' : '.js-entry-artist';
		var prevSelector = !sortKey ? '.js-entry-title' : '.js-entry-artist';

		var $entries = Array.from(document.querySelectorAll(selector));
		var $prevEntries = Array.from(document.querySelectorAll(prevSelector));

		$prevEntries.forEach(function (entry) {
			return entry.removeAttribute('name');
		});

		return $entries.find(function (entry) {
			var node = entry.nextElementSibling;
			return node.innerHTML[0] === char || node.innerHTML[0] === char.toUpperCase();
		});
	};

	var attachAnchorListener = function attachAnchorListener($anchor, letter) {
		$anchor.addEventListener('click', function () {
			var letterNode = document.getElementById(letter);
			var target = void 0;

			if (!sortKey) {
				target = letter === 'a' ? document.getElementById('anchor-target') : letterNode.parentElement.parentElement.parentElement.parentElement.previousElementSibling.querySelector('.js-article-anchor-target');
			} else {
				target = letter === 'a' ? document.getElementById('anchor-target') : letterNode.parentElement.parentElement.parentElement.previousElementSibling.querySelector('.js-article-anchor-target');
			};

			target.scrollIntoView({ behavior: "smooth", block: "start" });
		});
	};

	var activeEntries = {};
	var $outer = document.querySelector('.alphabet__letters');
	$outer.innerHTML = '';

	alphabet.forEach(function (letter) {
		var $firstEntry = findFirstEntry(letter);
		var $anchor = document.createElement('a');

		if (!$firstEntry) return;

		$firstEntry.id = letter;
		$anchor.innerHTML = letter.toUpperCase();
		$anchor.className = 'alphabet__letter-anchor';

		attachAnchorListener($anchor, letter);
		$outer.appendChild($anchor);
	});
};

exports.default = makeAlphabet;

},{}],10:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
var makeSlider = function makeSlider($slider) {
	var $arrowNext = $slider.parentElement.querySelector('.arrow-next');
	var $arrowPrev = $slider.parentElement.querySelector('.arrow-prev');

	var current = $slider.firstElementChild;
	$arrowNext.addEventListener('click', function () {
		var next = current.nextElementSibling;
		if (next) {
			next.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
			current = next;
		}
	});

	$arrowPrev.addEventListener('click', function () {
		var prev = current.previousElementSibling;
		if (prev) {
			prev.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
			current = prev;
		}
	});
};

exports.default = makeSlider;

},{}],11:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
var imageTemplate = function imageTemplate(image) {
	return '\n<div class="article-image__outer">\n\t<img class="article-image" src="../../assets/images/' + image + '"></img>\n</div>\n';
};

var articleTemplate = function articleTemplate(entry, i) {
	var title = entry.title,
	    firstName = entry.firstName,
	    lastName = entry.lastName,
	    images = entry.images,
	    description = entry.description,
	    contents = entry.contents,
	    dimensions = entry.dimensions,
	    year = entry.year,
	    isbn = entry.isbn,
	    oclc = entry.oclc,
	    link = entry.link;


	var imageHTML = images.length ? images.map(function (image) {
		return imageTemplate(image);
	}).join('') : '';

	return '\n\t\t<article class="article__outer">\n\t\t\t<div class="article__inner">\n\t\t\t\t<div class="article__heading">\n\t\t\t\t\t<a class="js-entry-title"></a>\n\t\t\t\t\t<h2 class="article-heading__title">' + title + '</h2>\n\t\t\t\t\t<div class="article-heading__name">\n\t\t\t\t\t\t<span class="article-heading__name--first">' + firstName + '</span>\n\t\t\t\t\t\t<a class="js-entry-artist"></a>\n\t\t\t\t\t\t<span class="article-heading__name--last">' + lastName + '</span>\n\t\t\t\t\t</div>\n\t\t\t\t</div>\t\n\t\t\t\t<div class="article__slider-outer">\n\t\t\t\t\t<div class="article__slider-inner" id="slider-' + i + '">\n\t\t\t\t\t\t' + imageHTML + '\n\t\t\t\t\t\t<div class="article-description__outer">\n\t\t\t\t\t\t\t<div class="article-description">' + description + '</div>\n\t\t\t\t\t\t\t<div class="article-detail">' + contents + '</div>\n\t\t\t\t\t\t\t<div class="article-detail article-detail--margin">' + dimensions + '</div>\n\t\t\t\t\t\t\t<div class="article-detail article-detail--margin">' + year + '</div>\n\t\t\t\t\t\t\t<div class="article-detail article-detail--margin">' + isbn + '</div>\n\t\t\t\t\t\t\t<div class="article-detail">OCLC <a class="article-detail--link" target="_blank" href="' + link + '">' + oclc + '</a></div>\n\t\t\t\t\t\t</div>\n\t\t\t\t\t</div>\n\t\t\t\t\t<div class="article__scroll-controls">\n\t\t\t\t\t\t<span class="controls arrow-prev">\u2190</span> \n\t\t\t\t\t\t<span class="controls arrow-next">\u2192</span>\n\t\t\t\t\t</div>\n\t\t\t\t\t<p class="js-article-anchor-target"></p>\n\t\t\t</div>\n\t\t</article>\n\t';
};

exports.default = articleTemplate;

},{}],12:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.renderNavLg = exports.articleTemplate = undefined;

var _article = require('./article');

var _article2 = _interopRequireDefault(_article);

var _navLg = require('./navLg');

var _navLg2 = _interopRequireDefault(_navLg);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.articleTemplate = _article2.default;
exports.renderNavLg = _navLg2.default;

},{"./article":11,"./navLg":13}],13:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
var template = '<div class="nav__inner">\n\t\t<div class="nav__sort-by">\n\t\t\t<span class="sort-by__title">Sort by</span>\n\t\t\t<button class="sort-by sort-by__by-artist active" id="js-by-artist">Artist</button>\n\t\t\t<span class="sort-by__divider"> | </span>\n\t\t\t<button class="sort-by sort-by__by-title" id="js-by-title">Title</button>\n\t\t\t<span class="find" id="js-find">\n\t\t\t\t(<span class="find--inner">&#8984;F</span>)\n\t\t\t</span>\n\t\t</div>\n\t\t<div class="nav__alphabet">\n\t\t\t<span class="alphabet__title">Go to</span>\n\t\t\t<div class="alphabet__letters"></div>\n\t\t</div>\n\t</div>';

var renderNavLg = function renderNavLg() {
	var navOuter = document.getElementById('js-nav');
	navOuter.innerHTML = template;
};

exports.default = renderNavLg;

},{}],14:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.scrollToTop = exports.hideLoading = exports.debounce = undefined;

var _constants = require('../constants');

var debounce = function debounce(fn, time) {
  var timeout = void 0;

  return function () {
    var _this = this,
        _arguments = arguments;

    var functionCall = function functionCall() {
      return fn.apply(_this, _arguments);
    };

    clearTimeout(timeout);
    timeout = setTimeout(functionCall, time);
  };
};

var hideLoading = function hideLoading() {
  _constants.$loading.forEach(function (elem) {
    return elem.classList.add('ready');
  });
  _constants.$nav.classList.add('ready');
};

var scrollToTop = function scrollToTop() {
  var top = document.getElementById('anchor-target');
  top.scrollIntoView({ behavior: "smooth", block: "start" });
};

exports.debounce = debounce;
exports.hideLoading = hideLoading;
exports.scrollToTop = scrollToTop;

},{"../constants":3}]},{},[4])

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvc21vb3Roc2Nyb2xsLXBvbHlmaWxsL2Rpc3Qvc21vb3Roc2Nyb2xsLmpzIiwibm9kZV9tb2R1bGVzL3doYXR3Zy1mZXRjaC9mZXRjaC5qcyIsInNyYy9qcy9jb25zdGFudHMuanMiLCJzcmMvanMvaW5kZXguanMiLCJzcmMvanMvbW9kdWxlcy9hdHRhY2hJbWFnZUxpc3RlbmVycy5qcyIsInNyYy9qcy9tb2R1bGVzL2F0dGFjaE1vZGFsTGlzdGVuZXJzLmpzIiwic3JjL2pzL21vZHVsZXMvYXR0YWNoVXBBcnJvd0xpc3RlbmVycy5qcyIsInNyYy9qcy9tb2R1bGVzL2luZGV4LmpzIiwic3JjL2pzL21vZHVsZXMvbWFrZUFscGhhYmV0LmpzIiwic3JjL2pzL21vZHVsZXMvbWFrZVNsaWRlci5qcyIsInNyYy9qcy90ZW1wbGF0ZXMvYXJ0aWNsZS5qcyIsInNyYy9qcy90ZW1wbGF0ZXMvaW5kZXguanMiLCJzcmMvanMvdGVtcGxhdGVzL25hdkxnLmpzIiwic3JjL2pzL3V0aWxzL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2YkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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SSxnQkFBSjs7QUFFQSxTQUFPLFlBQVc7QUFBQTtBQUFBOztBQUNoQixRQUFNLGVBQWUsU0FBZixZQUFlO0FBQUEsYUFBTSxHQUFHLEtBQUgsQ0FBUyxLQUFULEVBQWUsVUFBZixDQUFOO0FBQUEsS0FBckI7O0FBRUEsaUJBQWEsT0FBYjtBQUNBLGNBQVUsV0FBVyxZQUFYLEVBQXlCLElBQXpCLENBQVY7QUFDRCxHQUxEO0FBTUQsQ0FURDs7QUFXQSxJQUFNLGNBQWMsU0FBZCxXQUFjLEdBQU07QUFDekIsc0JBQVMsT0FBVCxDQUFpQjtBQUFBLFdBQVEsS0FBSyxTQUFMLENBQWUsR0FBZixDQUFtQixPQUFuQixDQUFSO0FBQUEsR0FBakI7QUFDQSxrQkFBSyxTQUFMLENBQWUsR0FBZixDQUFtQixPQUFuQjtBQUNBLENBSEQ7O0FBS0EsSUFBTSxjQUFjLFNBQWQsV0FBYyxHQUFNO0FBQ3pCLE1BQUksTUFBTSxTQUFTLGNBQVQsQ0FBd0IsZUFBeEIsQ0FBVjtBQUNBLE1BQUksY0FBSixDQUFtQixFQUFDLFVBQVUsUUFBWCxFQUFxQixPQUFPLE9BQTVCLEVBQW5CO0FBQ0EsQ0FIRDs7UUFLUyxRLEdBQUEsUTtRQUFVLFcsR0FBQSxXO1FBQWEsVyxHQUFBLFciLCJmaWxlIjoiYnVuZGxlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIi8qIHNtb290aHNjcm9sbCB2MC40LjAgLSAyMDE4IC0gRHVzdGFuIEthc3RlbiwgSmVyZW1pYXMgTWVuaWNoZWxsaSAtIE1JVCBMaWNlbnNlICovXG4oZnVuY3Rpb24gKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgLy8gcG9seWZpbGxcbiAgZnVuY3Rpb24gcG9seWZpbGwoKSB7XG4gICAgLy8gYWxpYXNlc1xuICAgIHZhciB3ID0gd2luZG93O1xuICAgIHZhciBkID0gZG9jdW1lbnQ7XG5cbiAgICAvLyByZXR1cm4gaWYgc2Nyb2xsIGJlaGF2aW9yIGlzIHN1cHBvcnRlZCBhbmQgcG9seWZpbGwgaXMgbm90IGZvcmNlZFxuICAgIGlmIChcbiAgICAgICdzY3JvbGxCZWhhdmlvcicgaW4gZC5kb2N1bWVudEVsZW1lbnQuc3R5bGUgJiZcbiAgICAgIHcuX19mb3JjZVNtb290aFNjcm9sbFBvbHlmaWxsX18gIT09IHRydWVcbiAgICApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBnbG9iYWxzXG4gICAgdmFyIEVsZW1lbnQgPSB3LkhUTUxFbGVtZW50IHx8IHcuRWxlbWVudDtcbiAgICB2YXIgU0NST0xMX1RJTUUgPSA0Njg7XG5cbiAgICAvLyBvYmplY3QgZ2F0aGVyaW5nIG9yaWdpbmFsIHNjcm9sbCBtZXRob2RzXG4gICAgdmFyIG9yaWdpbmFsID0ge1xuICAgICAgc2Nyb2xsOiB3LnNjcm9sbCB8fCB3LnNjcm9sbFRvLFxuICAgICAgc2Nyb2xsQnk6IHcuc2Nyb2xsQnksXG4gICAgICBlbGVtZW50U2Nyb2xsOiBFbGVtZW50LnByb3RvdHlwZS5zY3JvbGwgfHwgc2Nyb2xsRWxlbWVudCxcbiAgICAgIHNjcm9sbEludG9WaWV3OiBFbGVtZW50LnByb3RvdHlwZS5zY3JvbGxJbnRvVmlld1xuICAgIH07XG5cbiAgICAvLyBkZWZpbmUgdGltaW5nIG1ldGhvZFxuICAgIHZhciBub3cgPVxuICAgICAgdy5wZXJmb3JtYW5jZSAmJiB3LnBlcmZvcm1hbmNlLm5vd1xuICAgICAgICA/IHcucGVyZm9ybWFuY2Uubm93LmJpbmQody5wZXJmb3JtYW5jZSlcbiAgICAgICAgOiBEYXRlLm5vdztcblxuICAgIC8qKlxuICAgICAqIGluZGljYXRlcyBpZiBhIHRoZSBjdXJyZW50IGJyb3dzZXIgaXMgbWFkZSBieSBNaWNyb3NvZnRcbiAgICAgKiBAbWV0aG9kIGlzTWljcm9zb2Z0QnJvd3NlclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSB1c2VyQWdlbnRcbiAgICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBpc01pY3Jvc29mdEJyb3dzZXIodXNlckFnZW50KSB7XG4gICAgICB2YXIgdXNlckFnZW50UGF0dGVybnMgPSBbJ01TSUUgJywgJ1RyaWRlbnQvJywgJ0VkZ2UvJ107XG5cbiAgICAgIHJldHVybiBuZXcgUmVnRXhwKHVzZXJBZ2VudFBhdHRlcm5zLmpvaW4oJ3wnKSkudGVzdCh1c2VyQWdlbnQpO1xuICAgIH1cblxuICAgIC8qXG4gICAgICogSUUgaGFzIHJvdW5kaW5nIGJ1ZyByb3VuZGluZyBkb3duIGNsaWVudEhlaWdodCBhbmQgY2xpZW50V2lkdGggYW5kXG4gICAgICogcm91bmRpbmcgdXAgc2Nyb2xsSGVpZ2h0IGFuZCBzY3JvbGxXaWR0aCBjYXVzaW5nIGZhbHNlIHBvc2l0aXZlc1xuICAgICAqIG9uIGhhc1Njcm9sbGFibGVTcGFjZVxuICAgICAqL1xuICAgIHZhciBST1VORElOR19UT0xFUkFOQ0UgPSBpc01pY3Jvc29mdEJyb3dzZXIody5uYXZpZ2F0b3IudXNlckFnZW50KSA/IDEgOiAwO1xuXG4gICAgLyoqXG4gICAgICogY2hhbmdlcyBzY3JvbGwgcG9zaXRpb24gaW5zaWRlIGFuIGVsZW1lbnRcbiAgICAgKiBAbWV0aG9kIHNjcm9sbEVsZW1lbnRcbiAgICAgKiBAcGFyYW0ge051bWJlcn0geFxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSB5XG4gICAgICogQHJldHVybnMge3VuZGVmaW5lZH1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzY3JvbGxFbGVtZW50KHgsIHkpIHtcbiAgICAgIHRoaXMuc2Nyb2xsTGVmdCA9IHg7XG4gICAgICB0aGlzLnNjcm9sbFRvcCA9IHk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogcmV0dXJucyByZXN1bHQgb2YgYXBwbHlpbmcgZWFzZSBtYXRoIGZ1bmN0aW9uIHRvIGEgbnVtYmVyXG4gICAgICogQG1ldGhvZCBlYXNlXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IGtcbiAgICAgKiBAcmV0dXJucyB7TnVtYmVyfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGVhc2Uoaykge1xuICAgICAgcmV0dXJuIDAuNSAqICgxIC0gTWF0aC5jb3MoTWF0aC5QSSAqIGspKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBpbmRpY2F0ZXMgaWYgYSBzbW9vdGggYmVoYXZpb3Igc2hvdWxkIGJlIGFwcGxpZWRcbiAgICAgKiBAbWV0aG9kIHNob3VsZEJhaWxPdXRcbiAgICAgKiBAcGFyYW0ge051bWJlcnxPYmplY3R9IGZpcnN0QXJnXG4gICAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAgICovXG4gICAgZnVuY3Rpb24gc2hvdWxkQmFpbE91dChmaXJzdEFyZykge1xuICAgICAgaWYgKFxuICAgICAgICBmaXJzdEFyZyA9PT0gbnVsbCB8fFxuICAgICAgICB0eXBlb2YgZmlyc3RBcmcgIT09ICdvYmplY3QnIHx8XG4gICAgICAgIGZpcnN0QXJnLmJlaGF2aW9yID09PSB1bmRlZmluZWQgfHxcbiAgICAgICAgZmlyc3RBcmcuYmVoYXZpb3IgPT09ICdhdXRvJyB8fFxuICAgICAgICBmaXJzdEFyZy5iZWhhdmlvciA9PT0gJ2luc3RhbnQnXG4gICAgICApIHtcbiAgICAgICAgLy8gZmlyc3QgYXJndW1lbnQgaXMgbm90IGFuIG9iamVjdC9udWxsXG4gICAgICAgIC8vIG9yIGJlaGF2aW9yIGlzIGF1dG8sIGluc3RhbnQgb3IgdW5kZWZpbmVkXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAodHlwZW9mIGZpcnN0QXJnID09PSAnb2JqZWN0JyAmJiBmaXJzdEFyZy5iZWhhdmlvciA9PT0gJ3Ntb290aCcpIHtcbiAgICAgICAgLy8gZmlyc3QgYXJndW1lbnQgaXMgYW4gb2JqZWN0IGFuZCBiZWhhdmlvciBpcyBzbW9vdGhcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuXG4gICAgICAvLyB0aHJvdyBlcnJvciB3aGVuIGJlaGF2aW9yIGlzIG5vdCBzdXBwb3J0ZWRcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAgICdiZWhhdmlvciBtZW1iZXIgb2YgU2Nyb2xsT3B0aW9ucyAnICtcbiAgICAgICAgICBmaXJzdEFyZy5iZWhhdmlvciArXG4gICAgICAgICAgJyBpcyBub3QgYSB2YWxpZCB2YWx1ZSBmb3IgZW51bWVyYXRpb24gU2Nyb2xsQmVoYXZpb3IuJ1xuICAgICAgKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBpbmRpY2F0ZXMgaWYgYW4gZWxlbWVudCBoYXMgc2Nyb2xsYWJsZSBzcGFjZSBpbiB0aGUgcHJvdmlkZWQgYXhpc1xuICAgICAqIEBtZXRob2QgaGFzU2Nyb2xsYWJsZVNwYWNlXG4gICAgICogQHBhcmFtIHtOb2RlfSBlbFxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBheGlzXG4gICAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAgICovXG4gICAgZnVuY3Rpb24gaGFzU2Nyb2xsYWJsZVNwYWNlKGVsLCBheGlzKSB7XG4gICAgICBpZiAoYXhpcyA9PT0gJ1knKSB7XG4gICAgICAgIHJldHVybiBlbC5jbGllbnRIZWlnaHQgKyBST1VORElOR19UT0xFUkFOQ0UgPCBlbC5zY3JvbGxIZWlnaHQ7XG4gICAgICB9XG5cbiAgICAgIGlmIChheGlzID09PSAnWCcpIHtcbiAgICAgICAgcmV0dXJuIGVsLmNsaWVudFdpZHRoICsgUk9VTkRJTkdfVE9MRVJBTkNFIDwgZWwuc2Nyb2xsV2lkdGg7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogaW5kaWNhdGVzIGlmIGFuIGVsZW1lbnQgaGFzIGEgc2Nyb2xsYWJsZSBvdmVyZmxvdyBwcm9wZXJ0eSBpbiB0aGUgYXhpc1xuICAgICAqIEBtZXRob2QgY2FuT3ZlcmZsb3dcbiAgICAgKiBAcGFyYW0ge05vZGV9IGVsXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGF4aXNcbiAgICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBjYW5PdmVyZmxvdyhlbCwgYXhpcykge1xuICAgICAgdmFyIG92ZXJmbG93VmFsdWUgPSB3LmdldENvbXB1dGVkU3R5bGUoZWwsIG51bGwpWydvdmVyZmxvdycgKyBheGlzXTtcblxuICAgICAgcmV0dXJuIG92ZXJmbG93VmFsdWUgPT09ICdhdXRvJyB8fCBvdmVyZmxvd1ZhbHVlID09PSAnc2Nyb2xsJztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBpbmRpY2F0ZXMgaWYgYW4gZWxlbWVudCBjYW4gYmUgc2Nyb2xsZWQgaW4gZWl0aGVyIGF4aXNcbiAgICAgKiBAbWV0aG9kIGlzU2Nyb2xsYWJsZVxuICAgICAqIEBwYXJhbSB7Tm9kZX0gZWxcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gYXhpc1xuICAgICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGlzU2Nyb2xsYWJsZShlbCkge1xuICAgICAgdmFyIGlzU2Nyb2xsYWJsZVkgPSBoYXNTY3JvbGxhYmxlU3BhY2UoZWwsICdZJykgJiYgY2FuT3ZlcmZsb3coZWwsICdZJyk7XG4gICAgICB2YXIgaXNTY3JvbGxhYmxlWCA9IGhhc1Njcm9sbGFibGVTcGFjZShlbCwgJ1gnKSAmJiBjYW5PdmVyZmxvdyhlbCwgJ1gnKTtcblxuICAgICAgcmV0dXJuIGlzU2Nyb2xsYWJsZVkgfHwgaXNTY3JvbGxhYmxlWDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBmaW5kcyBzY3JvbGxhYmxlIHBhcmVudCBvZiBhbiBlbGVtZW50XG4gICAgICogQG1ldGhvZCBmaW5kU2Nyb2xsYWJsZVBhcmVudFxuICAgICAqIEBwYXJhbSB7Tm9kZX0gZWxcbiAgICAgKiBAcmV0dXJucyB7Tm9kZX0gZWxcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBmaW5kU2Nyb2xsYWJsZVBhcmVudChlbCkge1xuICAgICAgdmFyIGlzQm9keTtcblxuICAgICAgZG8ge1xuICAgICAgICBlbCA9IGVsLnBhcmVudE5vZGU7XG5cbiAgICAgICAgaXNCb2R5ID0gZWwgPT09IGQuYm9keTtcbiAgICAgIH0gd2hpbGUgKGlzQm9keSA9PT0gZmFsc2UgJiYgaXNTY3JvbGxhYmxlKGVsKSA9PT0gZmFsc2UpO1xuXG4gICAgICBpc0JvZHkgPSBudWxsO1xuXG4gICAgICByZXR1cm4gZWw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogc2VsZiBpbnZva2VkIGZ1bmN0aW9uIHRoYXQsIGdpdmVuIGEgY29udGV4dCwgc3RlcHMgdGhyb3VnaCBzY3JvbGxpbmdcbiAgICAgKiBAbWV0aG9kIHN0ZXBcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gY29udGV4dFxuICAgICAqIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gICAgICovXG4gICAgZnVuY3Rpb24gc3RlcChjb250ZXh0KSB7XG4gICAgICB2YXIgdGltZSA9IG5vdygpO1xuICAgICAgdmFyIHZhbHVlO1xuICAgICAgdmFyIGN1cnJlbnRYO1xuICAgICAgdmFyIGN1cnJlbnRZO1xuICAgICAgdmFyIGVsYXBzZWQgPSAodGltZSAtIGNvbnRleHQuc3RhcnRUaW1lKSAvIFNDUk9MTF9USU1FO1xuXG4gICAgICAvLyBhdm9pZCBlbGFwc2VkIHRpbWVzIGhpZ2hlciB0aGFuIG9uZVxuICAgICAgZWxhcHNlZCA9IGVsYXBzZWQgPiAxID8gMSA6IGVsYXBzZWQ7XG5cbiAgICAgIC8vIGFwcGx5IGVhc2luZyB0byBlbGFwc2VkIHRpbWVcbiAgICAgIHZhbHVlID0gZWFzZShlbGFwc2VkKTtcblxuICAgICAgY3VycmVudFggPSBjb250ZXh0LnN0YXJ0WCArIChjb250ZXh0LnggLSBjb250ZXh0LnN0YXJ0WCkgKiB2YWx1ZTtcbiAgICAgIGN1cnJlbnRZID0gY29udGV4dC5zdGFydFkgKyAoY29udGV4dC55IC0gY29udGV4dC5zdGFydFkpICogdmFsdWU7XG5cbiAgICAgIGNvbnRleHQubWV0aG9kLmNhbGwoY29udGV4dC5zY3JvbGxhYmxlLCBjdXJyZW50WCwgY3VycmVudFkpO1xuXG4gICAgICAvLyBzY3JvbGwgbW9yZSBpZiB3ZSBoYXZlIG5vdCByZWFjaGVkIG91ciBkZXN0aW5hdGlvblxuICAgICAgaWYgKGN1cnJlbnRYICE9PSBjb250ZXh0LnggfHwgY3VycmVudFkgIT09IGNvbnRleHQueSkge1xuICAgICAgICB3LnJlcXVlc3RBbmltYXRpb25GcmFtZShzdGVwLmJpbmQodywgY29udGV4dCkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIHNjcm9sbHMgd2luZG93IG9yIGVsZW1lbnQgd2l0aCBhIHNtb290aCBiZWhhdmlvclxuICAgICAqIEBtZXRob2Qgc21vb3RoU2Nyb2xsXG4gICAgICogQHBhcmFtIHtPYmplY3R8Tm9kZX0gZWxcbiAgICAgKiBAcGFyYW0ge051bWJlcn0geFxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSB5XG4gICAgICogQHJldHVybnMge3VuZGVmaW5lZH1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzbW9vdGhTY3JvbGwoZWwsIHgsIHkpIHtcbiAgICAgIHZhciBzY3JvbGxhYmxlO1xuICAgICAgdmFyIHN0YXJ0WDtcbiAgICAgIHZhciBzdGFydFk7XG4gICAgICB2YXIgbWV0aG9kO1xuICAgICAgdmFyIHN0YXJ0VGltZSA9IG5vdygpO1xuXG4gICAgICAvLyBkZWZpbmUgc2Nyb2xsIGNvbnRleHRcbiAgICAgIGlmIChlbCA9PT0gZC5ib2R5KSB7XG4gICAgICAgIHNjcm9sbGFibGUgPSB3O1xuICAgICAgICBzdGFydFggPSB3LnNjcm9sbFggfHwgdy5wYWdlWE9mZnNldDtcbiAgICAgICAgc3RhcnRZID0gdy5zY3JvbGxZIHx8IHcucGFnZVlPZmZzZXQ7XG4gICAgICAgIG1ldGhvZCA9IG9yaWdpbmFsLnNjcm9sbDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNjcm9sbGFibGUgPSBlbDtcbiAgICAgICAgc3RhcnRYID0gZWwuc2Nyb2xsTGVmdDtcbiAgICAgICAgc3RhcnRZID0gZWwuc2Nyb2xsVG9wO1xuICAgICAgICBtZXRob2QgPSBzY3JvbGxFbGVtZW50O1xuICAgICAgfVxuXG4gICAgICAvLyBzY3JvbGwgbG9vcGluZyBvdmVyIGEgZnJhbWVcbiAgICAgIHN0ZXAoe1xuICAgICAgICBzY3JvbGxhYmxlOiBzY3JvbGxhYmxlLFxuICAgICAgICBtZXRob2Q6IG1ldGhvZCxcbiAgICAgICAgc3RhcnRUaW1lOiBzdGFydFRpbWUsXG4gICAgICAgIHN0YXJ0WDogc3RhcnRYLFxuICAgICAgICBzdGFydFk6IHN0YXJ0WSxcbiAgICAgICAgeDogeCxcbiAgICAgICAgeTogeVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gT1JJR0lOQUwgTUVUSE9EUyBPVkVSUklERVNcbiAgICAvLyB3LnNjcm9sbCBhbmQgdy5zY3JvbGxUb1xuICAgIHcuc2Nyb2xsID0gdy5zY3JvbGxUbyA9IGZ1bmN0aW9uKCkge1xuICAgICAgLy8gYXZvaWQgYWN0aW9uIHdoZW4gbm8gYXJndW1lbnRzIGFyZSBwYXNzZWRcbiAgICAgIGlmIChhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIGF2b2lkIHNtb290aCBiZWhhdmlvciBpZiBub3QgcmVxdWlyZWRcbiAgICAgIGlmIChzaG91bGRCYWlsT3V0KGFyZ3VtZW50c1swXSkgPT09IHRydWUpIHtcbiAgICAgICAgb3JpZ2luYWwuc2Nyb2xsLmNhbGwoXG4gICAgICAgICAgdyxcbiAgICAgICAgICBhcmd1bWVudHNbMF0ubGVmdCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICA/IGFyZ3VtZW50c1swXS5sZWZ0XG4gICAgICAgICAgICA6IHR5cGVvZiBhcmd1bWVudHNbMF0gIT09ICdvYmplY3QnXG4gICAgICAgICAgICAgID8gYXJndW1lbnRzWzBdXG4gICAgICAgICAgICAgIDogdy5zY3JvbGxYIHx8IHcucGFnZVhPZmZzZXQsXG4gICAgICAgICAgLy8gdXNlIHRvcCBwcm9wLCBzZWNvbmQgYXJndW1lbnQgaWYgcHJlc2VudCBvciBmYWxsYmFjayB0byBzY3JvbGxZXG4gICAgICAgICAgYXJndW1lbnRzWzBdLnRvcCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICA/IGFyZ3VtZW50c1swXS50b3BcbiAgICAgICAgICAgIDogYXJndW1lbnRzWzFdICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgICAgPyBhcmd1bWVudHNbMV1cbiAgICAgICAgICAgICAgOiB3LnNjcm9sbFkgfHwgdy5wYWdlWU9mZnNldFxuICAgICAgICApO1xuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gTEVUIFRIRSBTTU9PVEhORVNTIEJFR0lOIVxuICAgICAgc21vb3RoU2Nyb2xsLmNhbGwoXG4gICAgICAgIHcsXG4gICAgICAgIGQuYm9keSxcbiAgICAgICAgYXJndW1lbnRzWzBdLmxlZnQgIT09IHVuZGVmaW5lZFxuICAgICAgICAgID8gfn5hcmd1bWVudHNbMF0ubGVmdFxuICAgICAgICAgIDogdy5zY3JvbGxYIHx8IHcucGFnZVhPZmZzZXQsXG4gICAgICAgIGFyZ3VtZW50c1swXS50b3AgIT09IHVuZGVmaW5lZFxuICAgICAgICAgID8gfn5hcmd1bWVudHNbMF0udG9wXG4gICAgICAgICAgOiB3LnNjcm9sbFkgfHwgdy5wYWdlWU9mZnNldFxuICAgICAgKTtcbiAgICB9O1xuXG4gICAgLy8gdy5zY3JvbGxCeVxuICAgIHcuc2Nyb2xsQnkgPSBmdW5jdGlvbigpIHtcbiAgICAgIC8vIGF2b2lkIGFjdGlvbiB3aGVuIG5vIGFyZ3VtZW50cyBhcmUgcGFzc2VkXG4gICAgICBpZiAoYXJndW1lbnRzWzBdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBhdm9pZCBzbW9vdGggYmVoYXZpb3IgaWYgbm90IHJlcXVpcmVkXG4gICAgICBpZiAoc2hvdWxkQmFpbE91dChhcmd1bWVudHNbMF0pKSB7XG4gICAgICAgIG9yaWdpbmFsLnNjcm9sbEJ5LmNhbGwoXG4gICAgICAgICAgdyxcbiAgICAgICAgICBhcmd1bWVudHNbMF0ubGVmdCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICA/IGFyZ3VtZW50c1swXS5sZWZ0XG4gICAgICAgICAgICA6IHR5cGVvZiBhcmd1bWVudHNbMF0gIT09ICdvYmplY3QnID8gYXJndW1lbnRzWzBdIDogMCxcbiAgICAgICAgICBhcmd1bWVudHNbMF0udG9wICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8gYXJndW1lbnRzWzBdLnRvcFxuICAgICAgICAgICAgOiBhcmd1bWVudHNbMV0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1sxXSA6IDBcbiAgICAgICAgKTtcblxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIExFVCBUSEUgU01PT1RITkVTUyBCRUdJTiFcbiAgICAgIHNtb290aFNjcm9sbC5jYWxsKFxuICAgICAgICB3LFxuICAgICAgICBkLmJvZHksXG4gICAgICAgIH5+YXJndW1lbnRzWzBdLmxlZnQgKyAody5zY3JvbGxYIHx8IHcucGFnZVhPZmZzZXQpLFxuICAgICAgICB+fmFyZ3VtZW50c1swXS50b3AgKyAody5zY3JvbGxZIHx8IHcucGFnZVlPZmZzZXQpXG4gICAgICApO1xuICAgIH07XG5cbiAgICAvLyBFbGVtZW50LnByb3RvdHlwZS5zY3JvbGwgYW5kIEVsZW1lbnQucHJvdG90eXBlLnNjcm9sbFRvXG4gICAgRWxlbWVudC5wcm90b3R5cGUuc2Nyb2xsID0gRWxlbWVudC5wcm90b3R5cGUuc2Nyb2xsVG8gPSBmdW5jdGlvbigpIHtcbiAgICAgIC8vIGF2b2lkIGFjdGlvbiB3aGVuIG5vIGFyZ3VtZW50cyBhcmUgcGFzc2VkXG4gICAgICBpZiAoYXJndW1lbnRzWzBdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBhdm9pZCBzbW9vdGggYmVoYXZpb3IgaWYgbm90IHJlcXVpcmVkXG4gICAgICBpZiAoc2hvdWxkQmFpbE91dChhcmd1bWVudHNbMF0pID09PSB0cnVlKSB7XG4gICAgICAgIC8vIGlmIG9uZSBudW1iZXIgaXMgcGFzc2VkLCB0aHJvdyBlcnJvciB0byBtYXRjaCBGaXJlZm94IGltcGxlbWVudGF0aW9uXG4gICAgICAgIGlmICh0eXBlb2YgYXJndW1lbnRzWzBdID09PSAnbnVtYmVyJyAmJiBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHRocm93IG5ldyBTeW50YXhFcnJvcignVmFsdWUgY291bGQgbm90IGJlIGNvbnZlcnRlZCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgb3JpZ2luYWwuZWxlbWVudFNjcm9sbC5jYWxsKFxuICAgICAgICAgIHRoaXMsXG4gICAgICAgICAgLy8gdXNlIGxlZnQgcHJvcCwgZmlyc3QgbnVtYmVyIGFyZ3VtZW50IG9yIGZhbGxiYWNrIHRvIHNjcm9sbExlZnRcbiAgICAgICAgICBhcmd1bWVudHNbMF0ubGVmdCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICA/IH5+YXJndW1lbnRzWzBdLmxlZnRcbiAgICAgICAgICAgIDogdHlwZW9mIGFyZ3VtZW50c1swXSAhPT0gJ29iamVjdCcgPyB+fmFyZ3VtZW50c1swXSA6IHRoaXMuc2Nyb2xsTGVmdCxcbiAgICAgICAgICAvLyB1c2UgdG9wIHByb3AsIHNlY29uZCBhcmd1bWVudCBvciBmYWxsYmFjayB0byBzY3JvbGxUb3BcbiAgICAgICAgICBhcmd1bWVudHNbMF0udG9wICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8gfn5hcmd1bWVudHNbMF0udG9wXG4gICAgICAgICAgICA6IGFyZ3VtZW50c1sxXSAhPT0gdW5kZWZpbmVkID8gfn5hcmd1bWVudHNbMV0gOiB0aGlzLnNjcm9sbFRvcFxuICAgICAgICApO1xuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIGxlZnQgPSBhcmd1bWVudHNbMF0ubGVmdDtcbiAgICAgIHZhciB0b3AgPSBhcmd1bWVudHNbMF0udG9wO1xuXG4gICAgICAvLyBMRVQgVEhFIFNNT09USE5FU1MgQkVHSU4hXG4gICAgICBzbW9vdGhTY3JvbGwuY2FsbChcbiAgICAgICAgdGhpcyxcbiAgICAgICAgdGhpcyxcbiAgICAgICAgdHlwZW9mIGxlZnQgPT09ICd1bmRlZmluZWQnID8gdGhpcy5zY3JvbGxMZWZ0IDogfn5sZWZ0LFxuICAgICAgICB0eXBlb2YgdG9wID09PSAndW5kZWZpbmVkJyA/IHRoaXMuc2Nyb2xsVG9wIDogfn50b3BcbiAgICAgICk7XG4gICAgfTtcblxuICAgIC8vIEVsZW1lbnQucHJvdG90eXBlLnNjcm9sbEJ5XG4gICAgRWxlbWVudC5wcm90b3R5cGUuc2Nyb2xsQnkgPSBmdW5jdGlvbigpIHtcbiAgICAgIC8vIGF2b2lkIGFjdGlvbiB3aGVuIG5vIGFyZ3VtZW50cyBhcmUgcGFzc2VkXG4gICAgICBpZiAoYXJndW1lbnRzWzBdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBhdm9pZCBzbW9vdGggYmVoYXZpb3IgaWYgbm90IHJlcXVpcmVkXG4gICAgICBpZiAoc2hvdWxkQmFpbE91dChhcmd1bWVudHNbMF0pID09PSB0cnVlKSB7XG4gICAgICAgIG9yaWdpbmFsLmVsZW1lbnRTY3JvbGwuY2FsbChcbiAgICAgICAgICB0aGlzLFxuICAgICAgICAgIGFyZ3VtZW50c1swXS5sZWZ0ICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8gfn5hcmd1bWVudHNbMF0ubGVmdCArIHRoaXMuc2Nyb2xsTGVmdFxuICAgICAgICAgICAgOiB+fmFyZ3VtZW50c1swXSArIHRoaXMuc2Nyb2xsTGVmdCxcbiAgICAgICAgICBhcmd1bWVudHNbMF0udG9wICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8gfn5hcmd1bWVudHNbMF0udG9wICsgdGhpcy5zY3JvbGxUb3BcbiAgICAgICAgICAgIDogfn5hcmd1bWVudHNbMV0gKyB0aGlzLnNjcm9sbFRvcFxuICAgICAgICApO1xuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdGhpcy5zY3JvbGwoe1xuICAgICAgICBsZWZ0OiB+fmFyZ3VtZW50c1swXS5sZWZ0ICsgdGhpcy5zY3JvbGxMZWZ0LFxuICAgICAgICB0b3A6IH5+YXJndW1lbnRzWzBdLnRvcCArIHRoaXMuc2Nyb2xsVG9wLFxuICAgICAgICBiZWhhdmlvcjogYXJndW1lbnRzWzBdLmJlaGF2aW9yXG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgLy8gRWxlbWVudC5wcm90b3R5cGUuc2Nyb2xsSW50b1ZpZXdcbiAgICBFbGVtZW50LnByb3RvdHlwZS5zY3JvbGxJbnRvVmlldyA9IGZ1bmN0aW9uKCkge1xuICAgICAgLy8gYXZvaWQgc21vb3RoIGJlaGF2aW9yIGlmIG5vdCByZXF1aXJlZFxuICAgICAgaWYgKHNob3VsZEJhaWxPdXQoYXJndW1lbnRzWzBdKSA9PT0gdHJ1ZSkge1xuICAgICAgICBvcmlnaW5hbC5zY3JvbGxJbnRvVmlldy5jYWxsKFxuICAgICAgICAgIHRoaXMsXG4gICAgICAgICAgYXJndW1lbnRzWzBdID09PSB1bmRlZmluZWQgPyB0cnVlIDogYXJndW1lbnRzWzBdXG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBMRVQgVEhFIFNNT09USE5FU1MgQkVHSU4hXG4gICAgICB2YXIgc2Nyb2xsYWJsZVBhcmVudCA9IGZpbmRTY3JvbGxhYmxlUGFyZW50KHRoaXMpO1xuICAgICAgdmFyIHBhcmVudFJlY3RzID0gc2Nyb2xsYWJsZVBhcmVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgIHZhciBjbGllbnRSZWN0cyA9IHRoaXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cbiAgICAgIGlmIChzY3JvbGxhYmxlUGFyZW50ICE9PSBkLmJvZHkpIHtcbiAgICAgICAgLy8gcmV2ZWFsIGVsZW1lbnQgaW5zaWRlIHBhcmVudFxuICAgICAgICBzbW9vdGhTY3JvbGwuY2FsbChcbiAgICAgICAgICB0aGlzLFxuICAgICAgICAgIHNjcm9sbGFibGVQYXJlbnQsXG4gICAgICAgICAgc2Nyb2xsYWJsZVBhcmVudC5zY3JvbGxMZWZ0ICsgY2xpZW50UmVjdHMubGVmdCAtIHBhcmVudFJlY3RzLmxlZnQsXG4gICAgICAgICAgc2Nyb2xsYWJsZVBhcmVudC5zY3JvbGxUb3AgKyBjbGllbnRSZWN0cy50b3AgLSBwYXJlbnRSZWN0cy50b3BcbiAgICAgICAgKTtcblxuICAgICAgICAvLyByZXZlYWwgcGFyZW50IGluIHZpZXdwb3J0IHVubGVzcyBpcyBmaXhlZFxuICAgICAgICBpZiAody5nZXRDb21wdXRlZFN0eWxlKHNjcm9sbGFibGVQYXJlbnQpLnBvc2l0aW9uICE9PSAnZml4ZWQnKSB7XG4gICAgICAgICAgdy5zY3JvbGxCeSh7XG4gICAgICAgICAgICBsZWZ0OiBwYXJlbnRSZWN0cy5sZWZ0LFxuICAgICAgICAgICAgdG9wOiBwYXJlbnRSZWN0cy50b3AsXG4gICAgICAgICAgICBiZWhhdmlvcjogJ3Ntb290aCdcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gcmV2ZWFsIGVsZW1lbnQgaW4gdmlld3BvcnRcbiAgICAgICAgdy5zY3JvbGxCeSh7XG4gICAgICAgICAgbGVmdDogY2xpZW50UmVjdHMubGVmdCxcbiAgICAgICAgICB0b3A6IGNsaWVudFJlY3RzLnRvcCxcbiAgICAgICAgICBiZWhhdmlvcjogJ3Ntb290aCdcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIGlmICh0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAvLyBjb21tb25qc1xuICAgIG1vZHVsZS5leHBvcnRzID0geyBwb2x5ZmlsbDogcG9seWZpbGwgfTtcbiAgfSBlbHNlIHtcbiAgICAvLyBnbG9iYWxcbiAgICBwb2x5ZmlsbCgpO1xuICB9XG5cbn0oKSk7XG4iLCIoZnVuY3Rpb24oc2VsZikge1xuICAndXNlIHN0cmljdCc7XG5cbiAgaWYgKHNlbGYuZmV0Y2gpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIHZhciBzdXBwb3J0ID0ge1xuICAgIHNlYXJjaFBhcmFtczogJ1VSTFNlYXJjaFBhcmFtcycgaW4gc2VsZixcbiAgICBpdGVyYWJsZTogJ1N5bWJvbCcgaW4gc2VsZiAmJiAnaXRlcmF0b3InIGluIFN5bWJvbCxcbiAgICBibG9iOiAnRmlsZVJlYWRlcicgaW4gc2VsZiAmJiAnQmxvYicgaW4gc2VsZiAmJiAoZnVuY3Rpb24oKSB7XG4gICAgICB0cnkge1xuICAgICAgICBuZXcgQmxvYigpXG4gICAgICAgIHJldHVybiB0cnVlXG4gICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICB9XG4gICAgfSkoKSxcbiAgICBmb3JtRGF0YTogJ0Zvcm1EYXRhJyBpbiBzZWxmLFxuICAgIGFycmF5QnVmZmVyOiAnQXJyYXlCdWZmZXInIGluIHNlbGZcbiAgfVxuXG4gIGlmIChzdXBwb3J0LmFycmF5QnVmZmVyKSB7XG4gICAgdmFyIHZpZXdDbGFzc2VzID0gW1xuICAgICAgJ1tvYmplY3QgSW50OEFycmF5XScsXG4gICAgICAnW29iamVjdCBVaW50OEFycmF5XScsXG4gICAgICAnW29iamVjdCBVaW50OENsYW1wZWRBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgSW50MTZBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgVWludDE2QXJyYXldJyxcbiAgICAgICdbb2JqZWN0IEludDMyQXJyYXldJyxcbiAgICAgICdbb2JqZWN0IFVpbnQzMkFycmF5XScsXG4gICAgICAnW29iamVjdCBGbG9hdDMyQXJyYXldJyxcbiAgICAgICdbb2JqZWN0IEZsb2F0NjRBcnJheV0nXG4gICAgXVxuXG4gICAgdmFyIGlzRGF0YVZpZXcgPSBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiBvYmogJiYgRGF0YVZpZXcucHJvdG90eXBlLmlzUHJvdG90eXBlT2Yob2JqKVxuICAgIH1cblxuICAgIHZhciBpc0FycmF5QnVmZmVyVmlldyA9IEFycmF5QnVmZmVyLmlzVmlldyB8fCBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiBvYmogJiYgdmlld0NsYXNzZXMuaW5kZXhPZihPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKSkgPiAtMVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIG5vcm1hbGl6ZU5hbWUobmFtZSkge1xuICAgIGlmICh0eXBlb2YgbmFtZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIG5hbWUgPSBTdHJpbmcobmFtZSlcbiAgICB9XG4gICAgaWYgKC9bXmEtejAtOVxcLSMkJSYnKisuXFxeX2B8fl0vaS50ZXN0KG5hbWUpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIGNoYXJhY3RlciBpbiBoZWFkZXIgZmllbGQgbmFtZScpXG4gICAgfVxuICAgIHJldHVybiBuYW1lLnRvTG93ZXJDYXNlKClcbiAgfVxuXG4gIGZ1bmN0aW9uIG5vcm1hbGl6ZVZhbHVlKHZhbHVlKSB7XG4gICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHZhbHVlID0gU3RyaW5nKHZhbHVlKVxuICAgIH1cbiAgICByZXR1cm4gdmFsdWVcbiAgfVxuXG4gIC8vIEJ1aWxkIGEgZGVzdHJ1Y3RpdmUgaXRlcmF0b3IgZm9yIHRoZSB2YWx1ZSBsaXN0XG4gIGZ1bmN0aW9uIGl0ZXJhdG9yRm9yKGl0ZW1zKSB7XG4gICAgdmFyIGl0ZXJhdG9yID0ge1xuICAgICAgbmV4dDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IGl0ZW1zLnNoaWZ0KClcbiAgICAgICAgcmV0dXJuIHtkb25lOiB2YWx1ZSA9PT0gdW5kZWZpbmVkLCB2YWx1ZTogdmFsdWV9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHN1cHBvcnQuaXRlcmFibGUpIHtcbiAgICAgIGl0ZXJhdG9yW1N5bWJvbC5pdGVyYXRvcl0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGl0ZXJhdG9yXG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGl0ZXJhdG9yXG4gIH1cblxuICBmdW5jdGlvbiBIZWFkZXJzKGhlYWRlcnMpIHtcbiAgICB0aGlzLm1hcCA9IHt9XG5cbiAgICBpZiAoaGVhZGVycyBpbnN0YW5jZW9mIEhlYWRlcnMpIHtcbiAgICAgIGhlYWRlcnMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSwgbmFtZSkge1xuICAgICAgICB0aGlzLmFwcGVuZChuYW1lLCB2YWx1ZSlcbiAgICAgIH0sIHRoaXMpXG4gICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KGhlYWRlcnMpKSB7XG4gICAgICBoZWFkZXJzLmZvckVhY2goZnVuY3Rpb24oaGVhZGVyKSB7XG4gICAgICAgIHRoaXMuYXBwZW5kKGhlYWRlclswXSwgaGVhZGVyWzFdKVxuICAgICAgfSwgdGhpcylcbiAgICB9IGVsc2UgaWYgKGhlYWRlcnMpIHtcbiAgICAgIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGhlYWRlcnMpLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuICAgICAgICB0aGlzLmFwcGVuZChuYW1lLCBoZWFkZXJzW25hbWVdKVxuICAgICAgfSwgdGhpcylcbiAgICB9XG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5hcHBlbmQgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICAgIG5hbWUgPSBub3JtYWxpemVOYW1lKG5hbWUpXG4gICAgdmFsdWUgPSBub3JtYWxpemVWYWx1ZSh2YWx1ZSlcbiAgICB2YXIgb2xkVmFsdWUgPSB0aGlzLm1hcFtuYW1lXVxuICAgIHRoaXMubWFwW25hbWVdID0gb2xkVmFsdWUgPyBvbGRWYWx1ZSsnLCcrdmFsdWUgOiB2YWx1ZVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGVbJ2RlbGV0ZSddID0gZnVuY3Rpb24obmFtZSkge1xuICAgIGRlbGV0ZSB0aGlzLm1hcFtub3JtYWxpemVOYW1lKG5hbWUpXVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24obmFtZSkge1xuICAgIG5hbWUgPSBub3JtYWxpemVOYW1lKG5hbWUpXG4gICAgcmV0dXJuIHRoaXMuaGFzKG5hbWUpID8gdGhpcy5tYXBbbmFtZV0gOiBudWxsXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5oYXMgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMubWFwLmhhc093blByb3BlcnR5KG5vcm1hbGl6ZU5hbWUobmFtZSkpXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICAgIHRoaXMubWFwW25vcm1hbGl6ZU5hbWUobmFtZSldID0gbm9ybWFsaXplVmFsdWUodmFsdWUpXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5mb3JFYWNoID0gZnVuY3Rpb24oY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICBmb3IgKHZhciBuYW1lIGluIHRoaXMubWFwKSB7XG4gICAgICBpZiAodGhpcy5tYXAuaGFzT3duUHJvcGVydHkobmFtZSkpIHtcbiAgICAgICAgY2FsbGJhY2suY2FsbCh0aGlzQXJnLCB0aGlzLm1hcFtuYW1lXSwgbmFtZSwgdGhpcylcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5rZXlzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGl0ZW1zID0gW11cbiAgICB0aGlzLmZvckVhY2goZnVuY3Rpb24odmFsdWUsIG5hbWUpIHsgaXRlbXMucHVzaChuYW1lKSB9KVxuICAgIHJldHVybiBpdGVyYXRvckZvcihpdGVtcylcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLnZhbHVlcyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBpdGVtcyA9IFtdXG4gICAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlKSB7IGl0ZW1zLnB1c2godmFsdWUpIH0pXG4gICAgcmV0dXJuIGl0ZXJhdG9yRm9yKGl0ZW1zKVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuZW50cmllcyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBpdGVtcyA9IFtdXG4gICAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlLCBuYW1lKSB7IGl0ZW1zLnB1c2goW25hbWUsIHZhbHVlXSkgfSlcbiAgICByZXR1cm4gaXRlcmF0b3JGb3IoaXRlbXMpXG4gIH1cblxuICBpZiAoc3VwcG9ydC5pdGVyYWJsZSkge1xuICAgIEhlYWRlcnMucHJvdG90eXBlW1N5bWJvbC5pdGVyYXRvcl0gPSBIZWFkZXJzLnByb3RvdHlwZS5lbnRyaWVzXG4gIH1cblxuICBmdW5jdGlvbiBjb25zdW1lZChib2R5KSB7XG4gICAgaWYgKGJvZHkuYm9keVVzZWQpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgVHlwZUVycm9yKCdBbHJlYWR5IHJlYWQnKSlcbiAgICB9XG4gICAgYm9keS5ib2R5VXNlZCA9IHRydWVcbiAgfVxuXG4gIGZ1bmN0aW9uIGZpbGVSZWFkZXJSZWFkeShyZWFkZXIpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICByZWFkZXIub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlc29sdmUocmVhZGVyLnJlc3VsdClcbiAgICAgIH1cbiAgICAgIHJlYWRlci5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlamVjdChyZWFkZXIuZXJyb3IpXG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlYWRCbG9iQXNBcnJheUJ1ZmZlcihibG9iKSB7XG4gICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKClcbiAgICB2YXIgcHJvbWlzZSA9IGZpbGVSZWFkZXJSZWFkeShyZWFkZXIpXG4gICAgcmVhZGVyLnJlYWRBc0FycmF5QnVmZmVyKGJsb2IpXG4gICAgcmV0dXJuIHByb21pc2VcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlYWRCbG9iQXNUZXh0KGJsb2IpIHtcbiAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKVxuICAgIHZhciBwcm9taXNlID0gZmlsZVJlYWRlclJlYWR5KHJlYWRlcilcbiAgICByZWFkZXIucmVhZEFzVGV4dChibG9iKVxuICAgIHJldHVybiBwcm9taXNlXG4gIH1cblxuICBmdW5jdGlvbiByZWFkQXJyYXlCdWZmZXJBc1RleHQoYnVmKSB7XG4gICAgdmFyIHZpZXcgPSBuZXcgVWludDhBcnJheShidWYpXG4gICAgdmFyIGNoYXJzID0gbmV3IEFycmF5KHZpZXcubGVuZ3RoKVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2aWV3Lmxlbmd0aDsgaSsrKSB7XG4gICAgICBjaGFyc1tpXSA9IFN0cmluZy5mcm9tQ2hhckNvZGUodmlld1tpXSlcbiAgICB9XG4gICAgcmV0dXJuIGNoYXJzLmpvaW4oJycpXG4gIH1cblxuICBmdW5jdGlvbiBidWZmZXJDbG9uZShidWYpIHtcbiAgICBpZiAoYnVmLnNsaWNlKSB7XG4gICAgICByZXR1cm4gYnVmLnNsaWNlKDApXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciB2aWV3ID0gbmV3IFVpbnQ4QXJyYXkoYnVmLmJ5dGVMZW5ndGgpXG4gICAgICB2aWV3LnNldChuZXcgVWludDhBcnJheShidWYpKVxuICAgICAgcmV0dXJuIHZpZXcuYnVmZmVyXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gQm9keSgpIHtcbiAgICB0aGlzLmJvZHlVc2VkID0gZmFsc2VcblxuICAgIHRoaXMuX2luaXRCb2R5ID0gZnVuY3Rpb24oYm9keSkge1xuICAgICAgdGhpcy5fYm9keUluaXQgPSBib2R5XG4gICAgICBpZiAoIWJvZHkpIHtcbiAgICAgICAgdGhpcy5fYm9keVRleHQgPSAnJ1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgYm9keSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgdGhpcy5fYm9keVRleHQgPSBib2R5XG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuYmxvYiAmJiBCbG9iLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpKSB7XG4gICAgICAgIHRoaXMuX2JvZHlCbG9iID0gYm9keVxuICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LmZvcm1EYXRhICYmIEZvcm1EYXRhLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpKSB7XG4gICAgICAgIHRoaXMuX2JvZHlGb3JtRGF0YSA9IGJvZHlcbiAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5zZWFyY2hQYXJhbXMgJiYgVVJMU2VhcmNoUGFyYW1zLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpKSB7XG4gICAgICAgIHRoaXMuX2JvZHlUZXh0ID0gYm9keS50b1N0cmluZygpXG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuYXJyYXlCdWZmZXIgJiYgc3VwcG9ydC5ibG9iICYmIGlzRGF0YVZpZXcoYm9keSkpIHtcbiAgICAgICAgdGhpcy5fYm9keUFycmF5QnVmZmVyID0gYnVmZmVyQ2xvbmUoYm9keS5idWZmZXIpXG4gICAgICAgIC8vIElFIDEwLTExIGNhbid0IGhhbmRsZSBhIERhdGFWaWV3IGJvZHkuXG4gICAgICAgIHRoaXMuX2JvZHlJbml0ID0gbmV3IEJsb2IoW3RoaXMuX2JvZHlBcnJheUJ1ZmZlcl0pXG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuYXJyYXlCdWZmZXIgJiYgKEFycmF5QnVmZmVyLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpIHx8IGlzQXJyYXlCdWZmZXJWaWV3KGJvZHkpKSkge1xuICAgICAgICB0aGlzLl9ib2R5QXJyYXlCdWZmZXIgPSBidWZmZXJDbG9uZShib2R5KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCd1bnN1cHBvcnRlZCBCb2R5SW5pdCB0eXBlJylcbiAgICAgIH1cblxuICAgICAgaWYgKCF0aGlzLmhlYWRlcnMuZ2V0KCdjb250ZW50LXR5cGUnKSkge1xuICAgICAgICBpZiAodHlwZW9mIGJvZHkgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhpcy5oZWFkZXJzLnNldCgnY29udGVudC10eXBlJywgJ3RleHQvcGxhaW47Y2hhcnNldD1VVEYtOCcpXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUJsb2IgJiYgdGhpcy5fYm9keUJsb2IudHlwZSkge1xuICAgICAgICAgIHRoaXMuaGVhZGVycy5zZXQoJ2NvbnRlbnQtdHlwZScsIHRoaXMuX2JvZHlCbG9iLnR5cGUpXG4gICAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5zZWFyY2hQYXJhbXMgJiYgVVJMU2VhcmNoUGFyYW1zLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpKSB7XG4gICAgICAgICAgdGhpcy5oZWFkZXJzLnNldCgnY29udGVudC10eXBlJywgJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZDtjaGFyc2V0PVVURi04JylcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzdXBwb3J0LmJsb2IpIHtcbiAgICAgIHRoaXMuYmxvYiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcmVqZWN0ZWQgPSBjb25zdW1lZCh0aGlzKVxuICAgICAgICBpZiAocmVqZWN0ZWQpIHtcbiAgICAgICAgICByZXR1cm4gcmVqZWN0ZWRcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLl9ib2R5QmxvYikge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodGhpcy5fYm9keUJsb2IpXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUFycmF5QnVmZmVyKSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShuZXcgQmxvYihbdGhpcy5fYm9keUFycmF5QnVmZmVyXSkpXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUZvcm1EYXRhKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjb3VsZCBub3QgcmVhZCBGb3JtRGF0YSBib2R5IGFzIGJsb2InKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUobmV3IEJsb2IoW3RoaXMuX2JvZHlUZXh0XSkpXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdGhpcy5hcnJheUJ1ZmZlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAodGhpcy5fYm9keUFycmF5QnVmZmVyKSB7XG4gICAgICAgICAgcmV0dXJuIGNvbnN1bWVkKHRoaXMpIHx8IFByb21pc2UucmVzb2x2ZSh0aGlzLl9ib2R5QXJyYXlCdWZmZXIpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuYmxvYigpLnRoZW4ocmVhZEJsb2JBc0FycmF5QnVmZmVyKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy50ZXh0ID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgcmVqZWN0ZWQgPSBjb25zdW1lZCh0aGlzKVxuICAgICAgaWYgKHJlamVjdGVkKSB7XG4gICAgICAgIHJldHVybiByZWplY3RlZFxuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5fYm9keUJsb2IpIHtcbiAgICAgICAgcmV0dXJuIHJlYWRCbG9iQXNUZXh0KHRoaXMuX2JvZHlCbG9iKVxuICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5QXJyYXlCdWZmZXIpIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShyZWFkQXJyYXlCdWZmZXJBc1RleHQodGhpcy5fYm9keUFycmF5QnVmZmVyKSlcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUZvcm1EYXRhKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignY291bGQgbm90IHJlYWQgRm9ybURhdGEgYm9keSBhcyB0ZXh0JylcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodGhpcy5fYm9keVRleHQpXG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHN1cHBvcnQuZm9ybURhdGEpIHtcbiAgICAgIHRoaXMuZm9ybURhdGEgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudGV4dCgpLnRoZW4oZGVjb2RlKVxuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuanNvbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMudGV4dCgpLnRoZW4oSlNPTi5wYXJzZSlcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgLy8gSFRUUCBtZXRob2RzIHdob3NlIGNhcGl0YWxpemF0aW9uIHNob3VsZCBiZSBub3JtYWxpemVkXG4gIHZhciBtZXRob2RzID0gWydERUxFVEUnLCAnR0VUJywgJ0hFQUQnLCAnT1BUSU9OUycsICdQT1NUJywgJ1BVVCddXG5cbiAgZnVuY3Rpb24gbm9ybWFsaXplTWV0aG9kKG1ldGhvZCkge1xuICAgIHZhciB1cGNhc2VkID0gbWV0aG9kLnRvVXBwZXJDYXNlKClcbiAgICByZXR1cm4gKG1ldGhvZHMuaW5kZXhPZih1cGNhc2VkKSA+IC0xKSA/IHVwY2FzZWQgOiBtZXRob2RcbiAgfVxuXG4gIGZ1bmN0aW9uIFJlcXVlc3QoaW5wdXQsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fVxuICAgIHZhciBib2R5ID0gb3B0aW9ucy5ib2R5XG5cbiAgICBpZiAoaW5wdXQgaW5zdGFuY2VvZiBSZXF1ZXN0KSB7XG4gICAgICBpZiAoaW5wdXQuYm9keVVzZWQpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQWxyZWFkeSByZWFkJylcbiAgICAgIH1cbiAgICAgIHRoaXMudXJsID0gaW5wdXQudXJsXG4gICAgICB0aGlzLmNyZWRlbnRpYWxzID0gaW5wdXQuY3JlZGVudGlhbHNcbiAgICAgIGlmICghb3B0aW9ucy5oZWFkZXJzKSB7XG4gICAgICAgIHRoaXMuaGVhZGVycyA9IG5ldyBIZWFkZXJzKGlucHV0LmhlYWRlcnMpXG4gICAgICB9XG4gICAgICB0aGlzLm1ldGhvZCA9IGlucHV0Lm1ldGhvZFxuICAgICAgdGhpcy5tb2RlID0gaW5wdXQubW9kZVxuICAgICAgaWYgKCFib2R5ICYmIGlucHV0Ll9ib2R5SW5pdCAhPSBudWxsKSB7XG4gICAgICAgIGJvZHkgPSBpbnB1dC5fYm9keUluaXRcbiAgICAgICAgaW5wdXQuYm9keVVzZWQgPSB0cnVlXG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMudXJsID0gU3RyaW5nKGlucHV0KVxuICAgIH1cblxuICAgIHRoaXMuY3JlZGVudGlhbHMgPSBvcHRpb25zLmNyZWRlbnRpYWxzIHx8IHRoaXMuY3JlZGVudGlhbHMgfHwgJ29taXQnXG4gICAgaWYgKG9wdGlvbnMuaGVhZGVycyB8fCAhdGhpcy5oZWFkZXJzKSB7XG4gICAgICB0aGlzLmhlYWRlcnMgPSBuZXcgSGVhZGVycyhvcHRpb25zLmhlYWRlcnMpXG4gICAgfVxuICAgIHRoaXMubWV0aG9kID0gbm9ybWFsaXplTWV0aG9kKG9wdGlvbnMubWV0aG9kIHx8IHRoaXMubWV0aG9kIHx8ICdHRVQnKVxuICAgIHRoaXMubW9kZSA9IG9wdGlvbnMubW9kZSB8fCB0aGlzLm1vZGUgfHwgbnVsbFxuICAgIHRoaXMucmVmZXJyZXIgPSBudWxsXG5cbiAgICBpZiAoKHRoaXMubWV0aG9kID09PSAnR0VUJyB8fCB0aGlzLm1ldGhvZCA9PT0gJ0hFQUQnKSAmJiBib2R5KSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdCb2R5IG5vdCBhbGxvd2VkIGZvciBHRVQgb3IgSEVBRCByZXF1ZXN0cycpXG4gICAgfVxuICAgIHRoaXMuX2luaXRCb2R5KGJvZHkpXG4gIH1cblxuICBSZXF1ZXN0LnByb3RvdHlwZS5jbG9uZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgUmVxdWVzdCh0aGlzLCB7IGJvZHk6IHRoaXMuX2JvZHlJbml0IH0pXG4gIH1cblxuICBmdW5jdGlvbiBkZWNvZGUoYm9keSkge1xuICAgIHZhciBmb3JtID0gbmV3IEZvcm1EYXRhKClcbiAgICBib2R5LnRyaW0oKS5zcGxpdCgnJicpLmZvckVhY2goZnVuY3Rpb24oYnl0ZXMpIHtcbiAgICAgIGlmIChieXRlcykge1xuICAgICAgICB2YXIgc3BsaXQgPSBieXRlcy5zcGxpdCgnPScpXG4gICAgICAgIHZhciBuYW1lID0gc3BsaXQuc2hpZnQoKS5yZXBsYWNlKC9cXCsvZywgJyAnKVxuICAgICAgICB2YXIgdmFsdWUgPSBzcGxpdC5qb2luKCc9JykucmVwbGFjZSgvXFwrL2csICcgJylcbiAgICAgICAgZm9ybS5hcHBlbmQoZGVjb2RlVVJJQ29tcG9uZW50KG5hbWUpLCBkZWNvZGVVUklDb21wb25lbnQodmFsdWUpKVxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIGZvcm1cbiAgfVxuXG4gIGZ1bmN0aW9uIHBhcnNlSGVhZGVycyhyYXdIZWFkZXJzKSB7XG4gICAgdmFyIGhlYWRlcnMgPSBuZXcgSGVhZGVycygpXG4gICAgLy8gUmVwbGFjZSBpbnN0YW5jZXMgb2YgXFxyXFxuIGFuZCBcXG4gZm9sbG93ZWQgYnkgYXQgbGVhc3Qgb25lIHNwYWNlIG9yIGhvcml6b250YWwgdGFiIHdpdGggYSBzcGFjZVxuICAgIC8vIGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmM3MjMwI3NlY3Rpb24tMy4yXG4gICAgdmFyIHByZVByb2Nlc3NlZEhlYWRlcnMgPSByYXdIZWFkZXJzLnJlcGxhY2UoL1xccj9cXG5bXFx0IF0rL2csICcgJylcbiAgICBwcmVQcm9jZXNzZWRIZWFkZXJzLnNwbGl0KC9cXHI/XFxuLykuZm9yRWFjaChmdW5jdGlvbihsaW5lKSB7XG4gICAgICB2YXIgcGFydHMgPSBsaW5lLnNwbGl0KCc6JylcbiAgICAgIHZhciBrZXkgPSBwYXJ0cy5zaGlmdCgpLnRyaW0oKVxuICAgICAgaWYgKGtleSkge1xuICAgICAgICB2YXIgdmFsdWUgPSBwYXJ0cy5qb2luKCc6JykudHJpbSgpXG4gICAgICAgIGhlYWRlcnMuYXBwZW5kKGtleSwgdmFsdWUpXG4gICAgICB9XG4gICAgfSlcbiAgICByZXR1cm4gaGVhZGVyc1xuICB9XG5cbiAgQm9keS5jYWxsKFJlcXVlc3QucHJvdG90eXBlKVxuXG4gIGZ1bmN0aW9uIFJlc3BvbnNlKGJvZHlJbml0LCBvcHRpb25zKSB7XG4gICAgaWYgKCFvcHRpb25zKSB7XG4gICAgICBvcHRpb25zID0ge31cbiAgICB9XG5cbiAgICB0aGlzLnR5cGUgPSAnZGVmYXVsdCdcbiAgICB0aGlzLnN0YXR1cyA9IG9wdGlvbnMuc3RhdHVzID09PSB1bmRlZmluZWQgPyAyMDAgOiBvcHRpb25zLnN0YXR1c1xuICAgIHRoaXMub2sgPSB0aGlzLnN0YXR1cyA+PSAyMDAgJiYgdGhpcy5zdGF0dXMgPCAzMDBcbiAgICB0aGlzLnN0YXR1c1RleHQgPSAnc3RhdHVzVGV4dCcgaW4gb3B0aW9ucyA/IG9wdGlvbnMuc3RhdHVzVGV4dCA6ICdPSydcbiAgICB0aGlzLmhlYWRlcnMgPSBuZXcgSGVhZGVycyhvcHRpb25zLmhlYWRlcnMpXG4gICAgdGhpcy51cmwgPSBvcHRpb25zLnVybCB8fCAnJ1xuICAgIHRoaXMuX2luaXRCb2R5KGJvZHlJbml0KVxuICB9XG5cbiAgQm9keS5jYWxsKFJlc3BvbnNlLnByb3RvdHlwZSlcblxuICBSZXNwb25zZS5wcm90b3R5cGUuY2xvbmUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKHRoaXMuX2JvZHlJbml0LCB7XG4gICAgICBzdGF0dXM6IHRoaXMuc3RhdHVzLFxuICAgICAgc3RhdHVzVGV4dDogdGhpcy5zdGF0dXNUZXh0LFxuICAgICAgaGVhZGVyczogbmV3IEhlYWRlcnModGhpcy5oZWFkZXJzKSxcbiAgICAgIHVybDogdGhpcy51cmxcbiAgICB9KVxuICB9XG5cbiAgUmVzcG9uc2UuZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgcmVzcG9uc2UgPSBuZXcgUmVzcG9uc2UobnVsbCwge3N0YXR1czogMCwgc3RhdHVzVGV4dDogJyd9KVxuICAgIHJlc3BvbnNlLnR5cGUgPSAnZXJyb3InXG4gICAgcmV0dXJuIHJlc3BvbnNlXG4gIH1cblxuICB2YXIgcmVkaXJlY3RTdGF0dXNlcyA9IFszMDEsIDMwMiwgMzAzLCAzMDcsIDMwOF1cblxuICBSZXNwb25zZS5yZWRpcmVjdCA9IGZ1bmN0aW9uKHVybCwgc3RhdHVzKSB7XG4gICAgaWYgKHJlZGlyZWN0U3RhdHVzZXMuaW5kZXhPZihzdGF0dXMpID09PSAtMSkge1xuICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0ludmFsaWQgc3RhdHVzIGNvZGUnKVxuICAgIH1cblxuICAgIHJldHVybiBuZXcgUmVzcG9uc2UobnVsbCwge3N0YXR1czogc3RhdHVzLCBoZWFkZXJzOiB7bG9jYXRpb246IHVybH19KVxuICB9XG5cbiAgc2VsZi5IZWFkZXJzID0gSGVhZGVyc1xuICBzZWxmLlJlcXVlc3QgPSBSZXF1ZXN0XG4gIHNlbGYuUmVzcG9uc2UgPSBSZXNwb25zZVxuXG4gIHNlbGYuZmV0Y2ggPSBmdW5jdGlvbihpbnB1dCwgaW5pdCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHZhciByZXF1ZXN0ID0gbmV3IFJlcXVlc3QoaW5wdXQsIGluaXQpXG4gICAgICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KClcblxuICAgICAgeGhyLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgb3B0aW9ucyA9IHtcbiAgICAgICAgICBzdGF0dXM6IHhoci5zdGF0dXMsXG4gICAgICAgICAgc3RhdHVzVGV4dDogeGhyLnN0YXR1c1RleHQsXG4gICAgICAgICAgaGVhZGVyczogcGFyc2VIZWFkZXJzKHhoci5nZXRBbGxSZXNwb25zZUhlYWRlcnMoKSB8fCAnJylcbiAgICAgICAgfVxuICAgICAgICBvcHRpb25zLnVybCA9ICdyZXNwb25zZVVSTCcgaW4geGhyID8geGhyLnJlc3BvbnNlVVJMIDogb3B0aW9ucy5oZWFkZXJzLmdldCgnWC1SZXF1ZXN0LVVSTCcpXG4gICAgICAgIHZhciBib2R5ID0gJ3Jlc3BvbnNlJyBpbiB4aHIgPyB4aHIucmVzcG9uc2UgOiB4aHIucmVzcG9uc2VUZXh0XG4gICAgICAgIHJlc29sdmUobmV3IFJlc3BvbnNlKGJvZHksIG9wdGlvbnMpKVxuICAgICAgfVxuXG4gICAgICB4aHIub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QobmV3IFR5cGVFcnJvcignTmV0d29yayByZXF1ZXN0IGZhaWxlZCcpKVxuICAgICAgfVxuXG4gICAgICB4aHIub250aW1lb3V0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlamVjdChuZXcgVHlwZUVycm9yKCdOZXR3b3JrIHJlcXVlc3QgZmFpbGVkJykpXG4gICAgICB9XG5cbiAgICAgIHhoci5vcGVuKHJlcXVlc3QubWV0aG9kLCByZXF1ZXN0LnVybCwgdHJ1ZSlcblxuICAgICAgaWYgKHJlcXVlc3QuY3JlZGVudGlhbHMgPT09ICdpbmNsdWRlJykge1xuICAgICAgICB4aHIud2l0aENyZWRlbnRpYWxzID0gdHJ1ZVxuICAgICAgfSBlbHNlIGlmIChyZXF1ZXN0LmNyZWRlbnRpYWxzID09PSAnb21pdCcpIHtcbiAgICAgICAgeGhyLndpdGhDcmVkZW50aWFscyA9IGZhbHNlXG4gICAgICB9XG5cbiAgICAgIGlmICgncmVzcG9uc2VUeXBlJyBpbiB4aHIgJiYgc3VwcG9ydC5ibG9iKSB7XG4gICAgICAgIHhoci5yZXNwb25zZVR5cGUgPSAnYmxvYidcbiAgICAgIH1cblxuICAgICAgcmVxdWVzdC5oZWFkZXJzLmZvckVhY2goZnVuY3Rpb24odmFsdWUsIG5hbWUpIHtcbiAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIobmFtZSwgdmFsdWUpXG4gICAgICB9KVxuXG4gICAgICB4aHIuc2VuZCh0eXBlb2YgcmVxdWVzdC5fYm9keUluaXQgPT09ICd1bmRlZmluZWQnID8gbnVsbCA6IHJlcXVlc3QuX2JvZHlJbml0KVxuICAgIH0pXG4gIH1cbiAgc2VsZi5mZXRjaC5wb2x5ZmlsbCA9IHRydWVcbn0pKHR5cGVvZiBzZWxmICE9PSAndW5kZWZpbmVkJyA/IHNlbGYgOiB0aGlzKTtcbiIsImNvbnN0IERCID0gJ2h0dHBzOi8vbmV4dXMtY2F0YWxvZy5maXJlYmFzZWlvLmNvbS9wb3N0cy5qc29uP2F1dGg9N2c3cHlLS3lrTjNONWV3ckltaE9hUzZ2d3JGc2M1Zktrcms4ZWp6Zic7XG5cbmNvbnN0ICRsb2FkaW5nID0gQXJyYXkuZnJvbShkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcubG9hZGluZycpKTtcbmNvbnN0ICRhcnRpY2xlTGlzdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdqcy1saXN0Jyk7XG5jb25zdCAkbmF2ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2pzLW5hdicpO1xuY29uc3QgJHBhcmFsbGF4ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnBhcmFsbGF4Jyk7XG5jb25zdCAkY29udGVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5jb250ZW50Jyk7XG5jb25zdCAkdGl0bGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnanMtdGl0bGUnKTtcbmNvbnN0ICR1cEFycm93ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2pzLWFycm93Jyk7XG5jb25zdCAkbW9kYWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcubW9kYWwnKTtcbmNvbnN0ICRsaWdodGJveCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5saWdodGJveCcpO1xuY29uc3QgJHZpZXcgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcubGlnaHRib3gtdmlldycpO1xuY29uc3Qgc29ydElkcyA9IFsnYXJ0aXN0JywgJ3RpdGxlJ107XG5cbmV4cG9ydCB7IFxuXHREQixcblx0JGxvYWRpbmcsXG5cdCRhcnRpY2xlTGlzdCwgXG5cdCRuYXYsIFxuXHQkcGFyYWxsYXgsXG5cdCRjb250ZW50LFxuXHQkdGl0bGUsXG5cdCR1cEFycm93LFxuXHQkbW9kYWwsXG5cdCRsaWdodGJveCxcblx0JHZpZXcsXG5cdHNvcnRJZHNcbn07IiwiaW1wb3J0IHNtb290aHNjcm9sbCBmcm9tICdzbW9vdGhzY3JvbGwtcG9seWZpbGwnO1xuaW1wb3J0ICd3aGF0d2ctZmV0Y2gnOyBcblxuaW1wb3J0IHsgYXJ0aWNsZVRlbXBsYXRlLCByZW5kZXJOYXZMZyB9IGZyb20gJy4vdGVtcGxhdGVzJztcbmltcG9ydCB7IGRlYm91bmNlLCBoaWRlTG9hZGluZywgc2Nyb2xsVG9Ub3AgfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IERCLCAkYXJ0aWNsZUxpc3QsIHNvcnRJZHMgfSBmcm9tICcuL2NvbnN0YW50cyc7XG5pbXBvcnQgeyBhdHRhY2hNb2RhbExpc3RlbmVycywgYXR0YWNoVXBBcnJvd0xpc3RlbmVycywgYXR0YWNoSW1hZ2VMaXN0ZW5lcnMsIG1ha2VBbHBoYWJldCwgbWFrZVNsaWRlciB9IGZyb20gJy4vbW9kdWxlcyc7XG5cbmxldCBzb3J0S2V5ID0gMDsgLy8gMCA9IGFydGlzdCwgMSA9IHRpdGxlXG5sZXQgZW50cmllcyA9IHsgYnlBdXRob3I6IFtdLCBieVRpdGxlOiBbXSB9O1xuXG5jb25zdCBzZXRVcFNvcnRCdXR0b25zID0gKCkgPT4ge1xuXHRzb3J0SWRzLmZvckVhY2goaWQgPT4ge1xuXHRcdGNvbnN0IGFsdCA9IGlkID09PSAnYXJ0aXN0JyA/ICd0aXRsZScgOiAnYXJ0aXN0JztcblxuXHRcdGNvbnN0ICRidXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChganMtYnktJHtpZH1gKTtcblx0XHRjb25zdCAkYWx0QnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoYGpzLWJ5LSR7YWx0fWApO1xuXG5cdFx0JGJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHRcdHNjcm9sbFRvVG9wKCk7XG5cdFx0XHRzb3J0S2V5ID0gIXNvcnRLZXk7XG5cdFx0XHRyZW5kZXJFbnRyaWVzKCk7XG5cblx0XHRcdCRidXR0b24uY2xhc3NMaXN0LmFkZCgnYWN0aXZlJyk7XG5cdFx0XHQkYWx0QnV0dG9uLmNsYXNzTGlzdC5yZW1vdmUoJ2FjdGl2ZScpO1xuXHRcdH0pXG5cdH0pO1xufTtcblxuY29uc3QgbWFrZUNpdGF0aW9uID0gKGVudHJ5LCBpKSA9PiB7XG5cdGNvbnN0IHsgY3JlZGl0LCBjcmVkaXRfbGluayB9ID0gZW50cnk7XG5cdGNvbnN0IGVudHJ5RGVzY3JpcHRpb24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChgc2xpZGVyLSR7aX1gKS5xdWVyeVNlbGVjdG9yKCcuYXJ0aWNsZS1kZXNjcmlwdGlvbicpO1xuXHRjb25zdCBjaXRhdGlvbiA9IGA8ZGl2IGNsYXNzPVwiYXJ0aWNsZS1jcmVkaXRcIj5zb3VyY2U6IDxhIGhyZWY9XCIke2NyZWRpdF9saW5rfVwiPiR7Y3JlZGl0fTwvYT48L2Rpdj5gO1xuXHRcblx0ZW50cnlEZXNjcmlwdGlvbi5pbnNlcnRBZGphY2VudEhUTUwoJ2JlZm9yZWVuZCcsIGNpdGF0aW9uKTtcbn07XG5cbmNvbnN0IHJlbmRlckVudHJpZXMgPSAoKSA9PiB7XG5cdGNvbnN0IGVudHJpZXNMaXN0ID0gc29ydEtleSA/IGVudHJpZXMuYnlUaXRsZSA6IGVudHJpZXMuYnlBdXRob3I7XG5cblx0JGFydGljbGVMaXN0LmlubmVySFRNTCA9ICcnO1xuXG5cdGVudHJpZXNMaXN0LmZvckVhY2goKGVudHJ5LCBpKSA9PiB7XG5cdFx0JGFydGljbGVMaXN0Lmluc2VydEFkamFjZW50SFRNTCgnYmVmb3JlZW5kJywgYXJ0aWNsZVRlbXBsYXRlKGVudHJ5LCBpKSk7XG5cdFx0bWFrZVNsaWRlcihkb2N1bWVudC5nZXRFbGVtZW50QnlJZChgc2xpZGVyLSR7aX1gKSk7XG5cblx0XHRpZiAoZW50cnkuY3JlZGl0KSB7XG5cdFx0XHRtYWtlQ2l0YXRpb24oZW50cnksIGkpO1xuXHRcdH1cblx0fSk7XG5cblx0aWYgKHdpbmRvdy5zY3JlZW4ud2lkdGggPiA3NjgpIGF0dGFjaEltYWdlTGlzdGVuZXJzKCk7XG5cblx0JGFydGljbGVMaXN0LmNsYXNzTGlzdC5hZGQoJ3JlYWR5Jyk7XG5cblx0bWFrZUFscGhhYmV0KHNvcnRLZXkpO1xufTtcblxuY29uc3Qgc2V0RGF0YUFuZFNvcnRCeVRpdGxlID0gKGRhdGEpID0+IHtcblx0ZW50cmllcy5ieUF1dGhvciA9IGRhdGE7XG5cdGVudHJpZXMuYnlUaXRsZSA9IGRhdGEuc2xpY2UoKTsgLy8gY29waWVzIGRhdGEgZm9yIGJ5VGl0bGUgc29ydFxuXG5cdGVudHJpZXMuYnlUaXRsZS5zb3J0KChhLCBiKSA9PiB7XG5cdFx0bGV0IGFUaXRsZSA9IGEudGl0bGVbMF0udG9VcHBlckNhc2UoKTtcblx0XHRsZXQgYlRpdGxlID0gYi50aXRsZVswXS50b1VwcGVyQ2FzZSgpO1xuXHRcdGlmIChhVGl0bGUgPiBiVGl0bGUpIHJldHVybiAxO1xuXHRcdGVsc2UgaWYgKGFUaXRsZSA8IGJUaXRsZSkgcmV0dXJuIC0xO1xuXHRcdGVsc2UgcmV0dXJuIDA7XG5cdH0pO1xufTtcblxuY29uc3QgZmV0Y2hEYXRhID0gKCkgPT4ge1xuXHRmZXRjaChEQikudGhlbihyZXMgPT4gcmVzLmpzb24oKSlcblx0LnRoZW4oZGF0YSA9PiB7XG5cdFx0c2V0RGF0YUFuZFNvcnRCeVRpdGxlKGRhdGEpO1xuXHRcdHJlbmRlckVudHJpZXMoKTtcblx0XHRoaWRlTG9hZGluZygpO1xuXHR9KVxuXHQuY2F0Y2goZXJyID0+IGNvbnNvbGUud2FybihlcnIpKTtcbn07XG5cbmNvbnN0IGluaXQgPSAoKSA9PiB7XG5cdHNtb290aHNjcm9sbC5wb2x5ZmlsbCgpO1xuXHRmZXRjaERhdGEoKTtcblx0cmVuZGVyTmF2TGcoKTtcblx0c2V0VXBTb3J0QnV0dG9ucygpO1xuXHRhdHRhY2hVcEFycm93TGlzdGVuZXJzKCk7XG5cdGF0dGFjaE1vZGFsTGlzdGVuZXJzKCk7XG59O1xuXG5pbml0KCk7XG4iLCJpbXBvcnQgeyAkdmlldywgJGxpZ2h0Ym94IH0gZnJvbSAnLi4vY29uc3RhbnRzJztcblxubGV0IGxpZ2h0Ym94ID0gZmFsc2U7XG5sZXQgeDIgPSBmYWxzZTtcbmxldCB2aWV3Q2xhc3M7XG5cbmNvbnN0IGF0dGFjaEltYWdlTGlzdGVuZXJzID0gKCkgPT4ge1xuXHRjb25zdCAkaW1hZ2VzID0gQXJyYXkuZnJvbShkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuYXJ0aWNsZS1pbWFnZScpKTtcblxuXHQkaW1hZ2VzLmZvckVhY2goaW1nID0+IHtcblx0XHRpbWcuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZXZ0KSA9PiB7XG5cdFx0XHRpZiAoIWxpZ2h0Ym94KSB7XG5cdFx0XHRcdCRsaWdodGJveC5jbGFzc0xpc3QuYWRkKCdzaG93LWltZycpO1xuXHRcdFx0XHQkdmlldy5zcmMgPSBpbWcuc3JjO1xuXHRcdFx0XHRsaWdodGJveCA9IHRydWU7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0pO1xuXG5cdCRsaWdodGJveC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChldnQpID0+IHtcblx0XHRpZiAoZXZ0LnRhcmdldCA9PT0gJHZpZXcpIHJldHVybjtcblx0XHQkbGlnaHRib3guY2xhc3NMaXN0LnJlbW92ZSgnc2hvdy1pbWcnKTtcblx0XHRsaWdodGJveCA9IGZhbHNlO1xuXHR9KTtcblxuXHQkdmlldy5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHRpZiAoIXgyKSB7XG5cdFx0XHR2aWV3Q2xhc3MgPSAkdmlldy53aWR0aCA8IHdpbmRvdy5pbm5lcldpZHRoID8gJ3ZpZXcteDItLXNtJyA6ICd2aWV3LXgyJztcblx0XHRcdCR2aWV3LmNsYXNzTGlzdC5hZGQodmlld0NsYXNzKTtcblx0XHRcdHNldFRpbWVvdXQoKCkgPT4geDIgPSB0cnVlLCAzMDApO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQkdmlldy5jbGFzc0xpc3QucmVtb3ZlKHZpZXdDbGFzcyk7XG5cdFx0XHQkbGlnaHRib3guY2xhc3NMaXN0LnJlbW92ZSgnc2hvdy1pbWcnKTtcblx0XHRcdHgyID0gZmFsc2U7XG5cdFx0XHRsaWdodGJveCA9IGZhbHNlO1xuXHRcdH1cblx0fSk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCBhdHRhY2hJbWFnZUxpc3RlbmVyczsiLCJpbXBvcnQgeyAkbW9kYWwgfSBmcm9tICcuLi9jb25zdGFudHMnO1xuXG5sZXQgbW9kYWwgPSBmYWxzZTtcbmNvbnN0IGF0dGFjaE1vZGFsTGlzdGVuZXJzID0gKCkgPT4ge1xuXHRjb25zdCAkZmluZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdqcy1maW5kJyk7XG5cdFxuXHQkZmluZC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHQkbW9kYWwuY2xhc3NMaXN0LmFkZCgnc2hvdycpO1xuXHRcdG1vZGFsID0gdHJ1ZTtcblx0fSk7XG5cblx0JG1vZGFsLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuXHRcdCRtb2RhbC5jbGFzc0xpc3QucmVtb3ZlKCdzaG93Jyk7XG5cdFx0bW9kYWwgPSBmYWxzZTtcblx0fSk7XG5cblx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCAoKSA9PiB7XG5cdFx0aWYgKG1vZGFsKSB7XG5cdFx0XHRzZXRUaW1lb3V0KCgpID0+IHtcblx0XHRcdFx0JG1vZGFsLmNsYXNzTGlzdC5yZW1vdmUoJ3Nob3cnKTtcblx0XHRcdFx0bW9kYWwgPSBmYWxzZTtcblx0XHRcdH0sIDYwMCk7XG5cdFx0fTtcblx0fSk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCBhdHRhY2hNb2RhbExpc3RlbmVyczsiLCJpbXBvcnQgeyAkdGl0bGUsICRwYXJhbGxheCwgJHVwQXJyb3cgfSBmcm9tICcuLi9jb25zdGFudHMnO1xuaW1wb3J0IHsgc2Nyb2xsVG9Ub3AgfSBmcm9tICcuLi91dGlscyc7XG5cbmxldCBwcmV2O1xubGV0IGN1cnJlbnQgPSAwO1xubGV0IGlzU2hvd2luZyA9IGZhbHNlO1xuXG5jb25zdCBhdHRhY2hVcEFycm93TGlzdGVuZXJzID0gKCkgPT4ge1xuXHQkcGFyYWxsYXguYWRkRXZlbnRMaXN0ZW5lcignc2Nyb2xsJywgKCkgPT4ge1xuXHRcdGxldCB5ID0gJHRpdGxlLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLnk7XG5cblx0XHRpZiAoY3VycmVudCAhPT0geSkge1xuXHRcdFx0cHJldiA9IGN1cnJlbnQ7XG5cdFx0XHRjdXJyZW50ID0geTtcblx0XHR9O1xuXG5cdFx0aWYgKHkgPD0gLTUwICYmICFpc1Nob3dpbmcpIHtcblx0XHRcdCR1cEFycm93LmNsYXNzTGlzdC5hZGQoJ3Nob3cnKTtcblx0XHRcdGlzU2hvd2luZyA9IHRydWU7XG5cdFx0fSBlbHNlIGlmICh5ID4gLTUwICYmIGlzU2hvd2luZykge1xuXHRcdFx0JHVwQXJyb3cuY2xhc3NMaXN0LnJlbW92ZSgnc2hvdycpO1xuXHRcdFx0aXNTaG93aW5nID0gZmFsc2U7XG5cdFx0fVxuXHR9KTtcblxuXHQkdXBBcnJvdy5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHNjcm9sbFRvVG9wKCkpO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgYXR0YWNoVXBBcnJvd0xpc3RlbmVyczsiLCJpbXBvcnQgYXR0YWNoTW9kYWxMaXN0ZW5lcnMgZnJvbSAnLi9hdHRhY2hNb2RhbExpc3RlbmVycyc7XG5pbXBvcnQgYXR0YWNoVXBBcnJvd0xpc3RlbmVycyBmcm9tICcuL2F0dGFjaFVwQXJyb3dMaXN0ZW5lcnMnO1xuaW1wb3J0IGF0dGFjaEltYWdlTGlzdGVuZXJzIGZyb20gJy4vYXR0YWNoSW1hZ2VMaXN0ZW5lcnMnO1xuaW1wb3J0IG1ha2VBbHBoYWJldCBmcm9tICcuL21ha2VBbHBoYWJldCc7XG5pbXBvcnQgbWFrZVNsaWRlciBmcm9tICcuL21ha2VTbGlkZXInO1xuXG5leHBvcnQgeyBcblx0YXR0YWNoTW9kYWxMaXN0ZW5lcnMsIFxuXHRhdHRhY2hVcEFycm93TGlzdGVuZXJzLFxuXHRhdHRhY2hJbWFnZUxpc3RlbmVycyxcblx0bWFrZUFscGhhYmV0LCBcblx0bWFrZVNsaWRlciBcbn07IiwiY29uc3QgYWxwaGFiZXQgPSBbJ2EnLCAnYicsICdjJywgJ2QnLCAnZScsICdmJywgJ2cnLCAnaCcsICdpJywgJ2onLCAnaycsICdsJywgJ20nLCAnbicsICdvJywgJ3AnLCAncicsICdzJywgJ3QnLCAndScsICd2JywgJ3cnLCAneScsICd6J107XG5cbmNvbnN0IG1ha2VBbHBoYWJldCA9IChzb3J0S2V5KSA9PiB7XG5cdGNvbnN0IGZpbmRGaXJzdEVudHJ5ID0gKGNoYXIpID0+IHtcblx0XHRjb25zdCBzZWxlY3RvciA9IHNvcnRLZXkgPyAnLmpzLWVudHJ5LXRpdGxlJyA6ICcuanMtZW50cnktYXJ0aXN0Jztcblx0XHRjb25zdCBwcmV2U2VsZWN0b3IgPSAhc29ydEtleSA/ICcuanMtZW50cnktdGl0bGUnIDogJy5qcy1lbnRyeS1hcnRpc3QnO1xuXG5cdFx0Y29uc3QgJGVudHJpZXMgPSBBcnJheS5mcm9tKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpKTtcblx0XHRjb25zdCAkcHJldkVudHJpZXMgPSBBcnJheS5mcm9tKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwocHJldlNlbGVjdG9yKSk7XG5cblx0XHQkcHJldkVudHJpZXMuZm9yRWFjaChlbnRyeSA9PiBlbnRyeS5yZW1vdmVBdHRyaWJ1dGUoJ25hbWUnKSk7XG5cblx0XHRyZXR1cm4gJGVudHJpZXMuZmluZChlbnRyeSA9PiB7XG5cdFx0XHRsZXQgbm9kZSA9IGVudHJ5Lm5leHRFbGVtZW50U2libGluZztcblx0XHRcdHJldHVybiBub2RlLmlubmVySFRNTFswXSA9PT0gY2hhciB8fCBub2RlLmlubmVySFRNTFswXSA9PT0gY2hhci50b1VwcGVyQ2FzZSgpO1xuXHRcdH0pO1xuXHR9O1xuXG5cdGNvbnN0IGF0dGFjaEFuY2hvckxpc3RlbmVyID0gKCRhbmNob3IsIGxldHRlcikgPT4ge1xuXHRcdCRhbmNob3IuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0XHRjb25zdCBsZXR0ZXJOb2RlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQobGV0dGVyKTtcblx0XHRcdGxldCB0YXJnZXQ7XG5cblx0XHRcdGlmICghc29ydEtleSkge1xuXHRcdFx0XHR0YXJnZXQgPSBsZXR0ZXIgPT09ICdhJyA/IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhbmNob3ItdGFyZ2V0JykgOiBsZXR0ZXJOb2RlLnBhcmVudEVsZW1lbnQucGFyZW50RWxlbWVudC5wYXJlbnRFbGVtZW50LnBhcmVudEVsZW1lbnQucHJldmlvdXNFbGVtZW50U2libGluZy5xdWVyeVNlbGVjdG9yKCcuanMtYXJ0aWNsZS1hbmNob3ItdGFyZ2V0Jyk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0YXJnZXQgPSBsZXR0ZXIgPT09ICdhJyA/IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhbmNob3ItdGFyZ2V0JykgOiBsZXR0ZXJOb2RlLnBhcmVudEVsZW1lbnQucGFyZW50RWxlbWVudC5wYXJlbnRFbGVtZW50LnByZXZpb3VzRWxlbWVudFNpYmxpbmcucXVlcnlTZWxlY3RvcignLmpzLWFydGljbGUtYW5jaG9yLXRhcmdldCcpO1xuXHRcdFx0fTtcblxuXHRcdFx0dGFyZ2V0LnNjcm9sbEludG9WaWV3KHtiZWhhdmlvcjogXCJzbW9vdGhcIiwgYmxvY2s6IFwic3RhcnRcIn0pO1xuXHRcdH0pO1xuXHR9O1xuXG5cdGxldCBhY3RpdmVFbnRyaWVzID0ge307XG5cdGxldCAkb3V0ZXIgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuYWxwaGFiZXRfX2xldHRlcnMnKTtcblx0JG91dGVyLmlubmVySFRNTCA9ICcnO1xuXG5cdGFscGhhYmV0LmZvckVhY2gobGV0dGVyID0+IHtcblx0XHRsZXQgJGZpcnN0RW50cnkgPSBmaW5kRmlyc3RFbnRyeShsZXR0ZXIpO1xuXHRcdGxldCAkYW5jaG9yID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuXG5cdFx0aWYgKCEkZmlyc3RFbnRyeSkgcmV0dXJuO1xuXG5cdFx0JGZpcnN0RW50cnkuaWQgPSBsZXR0ZXI7XG5cdFx0JGFuY2hvci5pbm5lckhUTUwgPSBsZXR0ZXIudG9VcHBlckNhc2UoKTtcblx0XHQkYW5jaG9yLmNsYXNzTmFtZSA9ICdhbHBoYWJldF9fbGV0dGVyLWFuY2hvcic7XG5cblx0XHRhdHRhY2hBbmNob3JMaXN0ZW5lcigkYW5jaG9yLCBsZXR0ZXIpO1xuXHRcdCRvdXRlci5hcHBlbmRDaGlsZCgkYW5jaG9yKTtcblx0fSk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCBtYWtlQWxwaGFiZXQ7IiwiY29uc3QgbWFrZVNsaWRlciA9ICgkc2xpZGVyKSA9PiB7XG5cdGNvbnN0ICRhcnJvd05leHQgPSAkc2xpZGVyLnBhcmVudEVsZW1lbnQucXVlcnlTZWxlY3RvcignLmFycm93LW5leHQnKTtcblx0Y29uc3QgJGFycm93UHJldiA9ICRzbGlkZXIucGFyZW50RWxlbWVudC5xdWVyeVNlbGVjdG9yKCcuYXJyb3ctcHJldicpO1xuXG5cdGxldCBjdXJyZW50ID0gJHNsaWRlci5maXJzdEVsZW1lbnRDaGlsZDtcblx0JGFycm93TmV4dC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHRjb25zdCBuZXh0ID0gY3VycmVudC5uZXh0RWxlbWVudFNpYmxpbmc7XG5cdFx0aWYgKG5leHQpIHtcblx0XHRcdG5leHQuc2Nyb2xsSW50b1ZpZXcoe2JlaGF2aW9yOiBcInNtb290aFwiLCBibG9jazogXCJuZWFyZXN0XCIsIGlubGluZTogXCJjZW50ZXJcIn0pO1xuXHRcdFx0Y3VycmVudCA9IG5leHQ7XG5cdFx0fVxuXHR9KTtcblxuXHQkYXJyb3dQcmV2LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuXHRcdGNvbnN0IHByZXYgPSBjdXJyZW50LnByZXZpb3VzRWxlbWVudFNpYmxpbmc7XG5cdFx0aWYgKHByZXYpIHtcblx0XHRcdHByZXYuc2Nyb2xsSW50b1ZpZXcoe2JlaGF2aW9yOiBcInNtb290aFwiLCBibG9jazogXCJuZWFyZXN0XCIsIGlubGluZTogXCJjZW50ZXJcIn0pO1xuXHRcdFx0Y3VycmVudCA9IHByZXY7XG5cdFx0fVxuXHR9KVxufTtcblxuZXhwb3J0IGRlZmF1bHQgbWFrZVNsaWRlcjsiLCJjb25zdCBpbWFnZVRlbXBsYXRlID0gKGltYWdlKSA9PiBgXG48ZGl2IGNsYXNzPVwiYXJ0aWNsZS1pbWFnZV9fb3V0ZXJcIj5cblx0PGltZyBjbGFzcz1cImFydGljbGUtaW1hZ2VcIiBzcmM9XCIuLi8uLi9hc3NldHMvaW1hZ2VzLyR7aW1hZ2V9XCI+PC9pbWc+XG48L2Rpdj5cbmA7XG5cbmNvbnN0IGFydGljbGVUZW1wbGF0ZSA9IChlbnRyeSwgaSkgPT4ge1xuXHRjb25zdCB7IHRpdGxlLCBmaXJzdE5hbWUsIGxhc3ROYW1lLCBpbWFnZXMsIGRlc2NyaXB0aW9uLCBjb250ZW50cywgZGltZW5zaW9ucywgeWVhciwgaXNibiwgb2NsYywgbGluayB9ID0gZW50cnk7XG5cblx0Y29uc3QgaW1hZ2VIVE1MID0gaW1hZ2VzLmxlbmd0aCA/IFxuXHRcdGltYWdlcy5tYXAoaW1hZ2UgPT4gaW1hZ2VUZW1wbGF0ZShpbWFnZSkpLmpvaW4oJycpIDogJyc7XG5cblx0cmV0dXJuIGBcblx0XHQ8YXJ0aWNsZSBjbGFzcz1cImFydGljbGVfX291dGVyXCI+XG5cdFx0XHQ8ZGl2IGNsYXNzPVwiYXJ0aWNsZV9faW5uZXJcIj5cblx0XHRcdFx0PGRpdiBjbGFzcz1cImFydGljbGVfX2hlYWRpbmdcIj5cblx0XHRcdFx0XHQ8YSBjbGFzcz1cImpzLWVudHJ5LXRpdGxlXCI+PC9hPlxuXHRcdFx0XHRcdDxoMiBjbGFzcz1cImFydGljbGUtaGVhZGluZ19fdGl0bGVcIj4ke3RpdGxlfTwvaDI+XG5cdFx0XHRcdFx0PGRpdiBjbGFzcz1cImFydGljbGUtaGVhZGluZ19fbmFtZVwiPlxuXHRcdFx0XHRcdFx0PHNwYW4gY2xhc3M9XCJhcnRpY2xlLWhlYWRpbmdfX25hbWUtLWZpcnN0XCI+JHtmaXJzdE5hbWV9PC9zcGFuPlxuXHRcdFx0XHRcdFx0PGEgY2xhc3M9XCJqcy1lbnRyeS1hcnRpc3RcIj48L2E+XG5cdFx0XHRcdFx0XHQ8c3BhbiBjbGFzcz1cImFydGljbGUtaGVhZGluZ19fbmFtZS0tbGFzdFwiPiR7bGFzdE5hbWV9PC9zcGFuPlxuXHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHQ8L2Rpdj5cdFxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVwiYXJ0aWNsZV9fc2xpZGVyLW91dGVyXCI+XG5cdFx0XHRcdFx0PGRpdiBjbGFzcz1cImFydGljbGVfX3NsaWRlci1pbm5lclwiIGlkPVwic2xpZGVyLSR7aX1cIj5cblx0XHRcdFx0XHRcdCR7aW1hZ2VIVE1MfVxuXHRcdFx0XHRcdFx0PGRpdiBjbGFzcz1cImFydGljbGUtZGVzY3JpcHRpb25fX291dGVyXCI+XG5cdFx0XHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlLWRlc2NyaXB0aW9uXCI+JHtkZXNjcmlwdGlvbn08L2Rpdj5cblx0XHRcdFx0XHRcdFx0PGRpdiBjbGFzcz1cImFydGljbGUtZGV0YWlsXCI+JHtjb250ZW50c308L2Rpdj5cblx0XHRcdFx0XHRcdFx0PGRpdiBjbGFzcz1cImFydGljbGUtZGV0YWlsIGFydGljbGUtZGV0YWlsLS1tYXJnaW5cIj4ke2RpbWVuc2lvbnN9PC9kaXY+XG5cdFx0XHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlLWRldGFpbCBhcnRpY2xlLWRldGFpbC0tbWFyZ2luXCI+JHt5ZWFyfTwvZGl2PlxuXHRcdFx0XHRcdFx0XHQ8ZGl2IGNsYXNzPVwiYXJ0aWNsZS1kZXRhaWwgYXJ0aWNsZS1kZXRhaWwtLW1hcmdpblwiPiR7aXNibn08L2Rpdj5cblx0XHRcdFx0XHRcdFx0PGRpdiBjbGFzcz1cImFydGljbGUtZGV0YWlsXCI+T0NMQyA8YSBjbGFzcz1cImFydGljbGUtZGV0YWlsLS1saW5rXCIgdGFyZ2V0PVwiX2JsYW5rXCIgaHJlZj1cIiR7bGlua31cIj4ke29jbGN9PC9hPjwvZGl2PlxuXHRcdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdFx0PGRpdiBjbGFzcz1cImFydGljbGVfX3Njcm9sbC1jb250cm9sc1wiPlxuXHRcdFx0XHRcdFx0PHNwYW4gY2xhc3M9XCJjb250cm9scyBhcnJvdy1wcmV2XCI+4oaQPC9zcGFuPiBcblx0XHRcdFx0XHRcdDxzcGFuIGNsYXNzPVwiY29udHJvbHMgYXJyb3ctbmV4dFwiPuKGkjwvc3Bhbj5cblx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0XHQ8cCBjbGFzcz1cImpzLWFydGljbGUtYW5jaG9yLXRhcmdldFwiPjwvcD5cblx0XHRcdDwvZGl2PlxuXHRcdDwvYXJ0aWNsZT5cblx0YDtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGFydGljbGVUZW1wbGF0ZTsiLCJpbXBvcnQgYXJ0aWNsZVRlbXBsYXRlIGZyb20gJy4vYXJ0aWNsZSc7XG5pbXBvcnQgcmVuZGVyTmF2TGcgZnJvbSAnLi9uYXZMZyc7XG5cbmV4cG9ydCB7IGFydGljbGVUZW1wbGF0ZSwgcmVuZGVyTmF2TGcgfTsiLCJjb25zdCB0ZW1wbGF0ZSA9IFxuXHRgPGRpdiBjbGFzcz1cIm5hdl9faW5uZXJcIj5cblx0XHQ8ZGl2IGNsYXNzPVwibmF2X19zb3J0LWJ5XCI+XG5cdFx0XHQ8c3BhbiBjbGFzcz1cInNvcnQtYnlfX3RpdGxlXCI+U29ydCBieTwvc3Bhbj5cblx0XHRcdDxidXR0b24gY2xhc3M9XCJzb3J0LWJ5IHNvcnQtYnlfX2J5LWFydGlzdCBhY3RpdmVcIiBpZD1cImpzLWJ5LWFydGlzdFwiPkFydGlzdDwvYnV0dG9uPlxuXHRcdFx0PHNwYW4gY2xhc3M9XCJzb3J0LWJ5X19kaXZpZGVyXCI+IHwgPC9zcGFuPlxuXHRcdFx0PGJ1dHRvbiBjbGFzcz1cInNvcnQtYnkgc29ydC1ieV9fYnktdGl0bGVcIiBpZD1cImpzLWJ5LXRpdGxlXCI+VGl0bGU8L2J1dHRvbj5cblx0XHRcdDxzcGFuIGNsYXNzPVwiZmluZFwiIGlkPVwianMtZmluZFwiPlxuXHRcdFx0XHQoPHNwYW4gY2xhc3M9XCJmaW5kLS1pbm5lclwiPiYjODk4NDtGPC9zcGFuPilcblx0XHRcdDwvc3Bhbj5cblx0XHQ8L2Rpdj5cblx0XHQ8ZGl2IGNsYXNzPVwibmF2X19hbHBoYWJldFwiPlxuXHRcdFx0PHNwYW4gY2xhc3M9XCJhbHBoYWJldF9fdGl0bGVcIj5HbyB0bzwvc3Bhbj5cblx0XHRcdDxkaXYgY2xhc3M9XCJhbHBoYWJldF9fbGV0dGVyc1wiPjwvZGl2PlxuXHRcdDwvZGl2PlxuXHQ8L2Rpdj5gO1xuXG5jb25zdCByZW5kZXJOYXZMZyA9ICgpID0+IHtcblx0bGV0IG5hdk91dGVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2pzLW5hdicpO1xuXHRuYXZPdXRlci5pbm5lckhUTUwgPSB0ZW1wbGF0ZTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHJlbmRlck5hdkxnOyIsImltcG9ydCB7ICRsb2FkaW5nLCAkbmF2LCAkcGFyYWxsYXgsICRjb250ZW50LCAkdGl0bGUsICRhcnJvdywgJG1vZGFsLCAkbGlnaHRib3gsICR2aWV3IH0gZnJvbSAnLi4vY29uc3RhbnRzJztcblxuY29uc3QgZGVib3VuY2UgPSAoZm4sIHRpbWUpID0+IHtcbiAgbGV0IHRpbWVvdXQ7XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIGNvbnN0IGZ1bmN0aW9uQ2FsbCA9ICgpID0+IGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgXG4gICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uQ2FsbCwgdGltZSk7XG4gIH1cbn07XG5cbmNvbnN0IGhpZGVMb2FkaW5nID0gKCkgPT4ge1xuXHQkbG9hZGluZy5mb3JFYWNoKGVsZW0gPT4gZWxlbS5jbGFzc0xpc3QuYWRkKCdyZWFkeScpKTtcblx0JG5hdi5jbGFzc0xpc3QuYWRkKCdyZWFkeScpO1xufTtcblxuY29uc3Qgc2Nyb2xsVG9Ub3AgPSAoKSA9PiB7XG5cdGxldCB0b3AgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYW5jaG9yLXRhcmdldCcpO1xuXHR0b3Auc2Nyb2xsSW50b1ZpZXcoe2JlaGF2aW9yOiBcInNtb290aFwiLCBibG9jazogXCJzdGFydFwifSk7XG59O1xuXG5leHBvcnQgeyBkZWJvdW5jZSwgaGlkZUxvYWRpbmcsIHNjcm9sbFRvVG9wIH07Il0sInByZUV4aXN0aW5nQ29tbWVudCI6Ii8vIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtjaGFyc2V0PXV0Zi04O2Jhc2U2NCxleUoyWlhKemFXOXVJam96TENKemIzVnlZMlZ6SWpwYkltNXZaR1ZmYlc5a2RXeGxjeTlpY205M2MyVnlMWEJoWTJzdlgzQnlaV3gxWkdVdWFuTWlMQ0p1YjJSbFgyMXZaSFZzWlhNdmMyMXZiM1JvYzJOeWIyeHNMWEJ2YkhsbWFXeHNMMlJwYzNRdmMyMXZiM1JvYzJOeWIyeHNMbXB6SWl3aWJtOWtaVjl0YjJSMWJHVnpMM2RvWVhSM1p5MW1aWFJqYUM5bVpYUmphQzVxY3lJc0luTnlZeTlxY3k5amIyNXpkR0Z1ZEhNdWFuTWlMQ0p6Y21NdmFuTXZhVzVrWlhndWFuTWlMQ0p6Y21NdmFuTXZiVzlrZFd4bGN5OWhkSFJoWTJoSmJXRm5aVXhwYzNSbGJtVnljeTVxY3lJc0luTnlZeTlxY3k5dGIyUjFiR1Z6TDJGMGRHRmphRTF2WkdGc1RHbHpkR1Z1WlhKekxtcHpJaXdpYzNKakwycHpMMjF2WkhWc1pYTXZZWFIwWVdOb1ZYQkJjbkp2ZDB4cGMzUmxibVZ5Y3k1cWN5SXNJbk55WXk5cWN5OXRiMlIxYkdWekwybHVaR1Y0TG1weklpd2ljM0pqTDJwekwyMXZaSFZzWlhNdmJXRnJaVUZzY0doaFltVjBMbXB6SWl3aWMzSmpMMnB6TDIxdlpIVnNaWE12YldGclpWTnNhV1JsY2k1cWN5SXNJbk55WXk5cWN5OTBaVzF3YkdGMFpYTXZZWEowYVdOc1pTNXFjeUlzSW5OeVl5OXFjeTkwWlcxd2JHRjBaWE12YVc1a1pYZ3Vhbk1pTENKemNtTXZhbk12ZEdWdGNHeGhkR1Z6TDI1aGRreG5MbXB6SWl3aWMzSmpMMnB6TDNWMGFXeHpMMmx1WkdWNExtcHpJbDBzSW01aGJXVnpJanBiWFN3aWJXRndjR2x1WjNNaU9pSkJRVUZCTzBGRFFVRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUczdRVU4yWWtFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVRzN096czdPenRCUTJ4a1FTeEpRVUZOTEV0QlFVc3NLMFpCUVZnN08wRkJSVUVzU1VGQlRTeFhRVUZYTEUxQlFVMHNTVUZCVGl4RFFVRlhMRk5CUVZNc1owSkJRVlFzUTBGQk1FSXNWVUZCTVVJc1EwRkJXQ3hEUVVGcVFqdEJRVU5CTEVsQlFVMHNaVUZCWlN4VFFVRlRMR05CUVZRc1EwRkJkMElzVTBGQmVFSXNRMEZCY2tJN1FVRkRRU3hKUVVGTkxFOUJRVThzVTBGQlV5eGpRVUZVTEVOQlFYZENMRkZCUVhoQ0xFTkJRV0k3UVVGRFFTeEpRVUZOTEZsQlFWa3NVMEZCVXl4aFFVRlVMRU5CUVhWQ0xGZEJRWFpDTEVOQlFXeENPMEZCUTBFc1NVRkJUU3hYUVVGWExGTkJRVk1zWVVGQlZDeERRVUYxUWl4VlFVRjJRaXhEUVVGcVFqdEJRVU5CTEVsQlFVMHNVMEZCVXl4VFFVRlRMR05CUVZRc1EwRkJkMElzVlVGQmVFSXNRMEZCWmp0QlFVTkJMRWxCUVUwc1YwRkJWeXhUUVVGVExHTkJRVlFzUTBGQmQwSXNWVUZCZUVJc1EwRkJha0k3UVVGRFFTeEpRVUZOTEZOQlFWTXNVMEZCVXl4aFFVRlVMRU5CUVhWQ0xGRkJRWFpDTEVOQlFXWTdRVUZEUVN4SlFVRk5MRmxCUVZrc1UwRkJVeXhoUVVGVUxFTkJRWFZDTEZkQlFYWkNMRU5CUVd4Q08wRkJRMEVzU1VGQlRTeFJRVUZSTEZOQlFWTXNZVUZCVkN4RFFVRjFRaXhuUWtGQmRrSXNRMEZCWkR0QlFVTkJMRWxCUVUwc1ZVRkJWU3hEUVVGRExGRkJRVVFzUlVGQlZ5eFBRVUZZTEVOQlFXaENPenRSUVVkRExFVXNSMEZCUVN4Rk8xRkJRMEVzVVN4SFFVRkJMRkU3VVVGRFFTeFpMRWRCUVVFc1dUdFJRVU5CTEVrc1IwRkJRU3hKTzFGQlEwRXNVeXhIUVVGQkxGTTdVVUZEUVN4UkxFZEJRVUVzVVR0UlFVTkJMRTBzUjBGQlFTeE5PMUZCUTBFc1VTeEhRVUZCTEZFN1VVRkRRU3hOTEVkQlFVRXNUVHRSUVVOQkxGTXNSMEZCUVN4VE8xRkJRMEVzU3l4SFFVRkJMRXM3VVVGRFFTeFBMRWRCUVVFc1R6czdPenM3UVVNeFFrUTdPenM3UVVGRFFUczdRVUZGUVRzN1FVRkRRVHM3UVVGRFFUczdRVUZEUVRzN096dEJRVVZCTEVsQlFVa3NWVUZCVlN4RFFVRmtMRU1zUTBGQmFVSTdRVUZEYWtJc1NVRkJTU3hWUVVGVkxFVkJRVVVzVlVGQlZTeEZRVUZhTEVWQlFXZENMRk5CUVZNc1JVRkJla0lzUlVGQlpEczdRVUZGUVN4SlFVRk5MRzFDUVVGdFFpeFRRVUZ1UWl4blFrRkJiVUlzUjBGQlRUdEJRVU01UWl4dlFrRkJVU3hQUVVGU0xFTkJRV2RDTEdOQlFVMDdRVUZEY2tJc1RVRkJUU3hOUVVGTkxFOUJRVThzVVVGQlVDeEhRVUZyUWl4UFFVRnNRaXhIUVVFMFFpeFJRVUY0UXpzN1FVRkZRU3hOUVVGTkxGVkJRVlVzVTBGQlV5eGpRVUZVTEZsQlFXbERMRVZCUVdwRExFTkJRV2hDTzBGQlEwRXNUVUZCVFN4aFFVRmhMRk5CUVZNc1kwRkJWQ3haUVVGcFF5eEhRVUZxUXl4RFFVRnVRanM3UVVGRlFTeFZRVUZSTEdkQ1FVRlNMRU5CUVhsQ0xFOUJRWHBDTEVWQlFXdERMRmxCUVUwN1FVRkRka003UVVGRFFTeGhRVUZWTEVOQlFVTXNUMEZCV0R0QlFVTkJPenRCUVVWQkxGZEJRVkVzVTBGQlVpeERRVUZyUWl4SFFVRnNRaXhEUVVGelFpeFJRVUYwUWp0QlFVTkJMR05CUVZjc1UwRkJXQ3hEUVVGeFFpeE5RVUZ5UWl4RFFVRTBRaXhSUVVFMVFqdEJRVU5CTEVkQlVFUTdRVUZSUVN4RlFXUkVPMEZCWlVFc1EwRm9Ra1E3TzBGQmEwSkJMRWxCUVUwc1pVRkJaU3hUUVVGbUxGbEJRV1VzUTBGQlF5eExRVUZFTEVWQlFWRXNRMEZCVWl4RlFVRmpPMEZCUVVFc1MwRkRNVUlzVFVGRU1FSXNSMEZEUml4TFFVUkZMRU5CUXpGQ0xFMUJSREJDTzBGQlFVRXNTMEZEYkVJc1YwRkVhMElzUjBGRFJpeExRVVJGTEVOQlEyeENMRmRCUkd0Q096dEJRVVZzUXl4TFFVRk5MRzFDUVVGdFFpeFRRVUZUTEdOQlFWUXNZVUZCYTBNc1EwRkJiRU1zUlVGQmRVTXNZVUZCZGtNc1EwRkJjVVFzYzBKQlFYSkVMRU5CUVhwQ08wRkJRMEVzUzBGQlRTdzJSRUZCTWtRc1YwRkJNMFFzVlVGQk1rVXNUVUZCTTBVc1pVRkJUanM3UVVGRlFTeHJRa0ZCYVVJc2EwSkJRV3BDTEVOQlFXOURMRmRCUVhCRExFVkJRV2xFTEZGQlFXcEVPMEZCUTBFc1EwRk9SRHM3UVVGUlFTeEpRVUZOTEdkQ1FVRm5RaXhUUVVGb1FpeGhRVUZuUWl4SFFVRk5PMEZCUXpOQ0xFdEJRVTBzWTBGQll5eFZRVUZWTEZGQlFWRXNUMEZCYkVJc1IwRkJORUlzVVVGQlVTeFJRVUY0UkRzN1FVRkZRU3g1UWtGQllTeFRRVUZpTEVkQlFYbENMRVZCUVhwQ096dEJRVVZCTEdGQlFWa3NUMEZCV2l4RFFVRnZRaXhWUVVGRExFdEJRVVFzUlVGQlVTeERRVUZTTEVWQlFXTTdRVUZEYWtNc01FSkJRV0VzYTBKQlFXSXNRMEZCWjBNc1YwRkJhRU1zUlVGQk5rTXNaME5CUVdkQ0xFdEJRV2hDTEVWQlFYVkNMRU5CUVhaQ0xFTkJRVGRETzBGQlEwRXNNa0pCUVZjc1UwRkJVeXhqUVVGVUxHRkJRV3RETEVOQlFXeERMRU5CUVZnN08wRkJSVUVzVFVGQlNTeE5RVUZOTEUxQlFWWXNSVUZCYTBJN1FVRkRha0lzWjBKQlFXRXNTMEZCWWl4RlFVRnZRaXhEUVVGd1FqdEJRVU5CTzBGQlEwUXNSVUZRUkRzN1FVRlRRU3hMUVVGSkxFOUJRVThzVFVGQlVDeERRVUZqTEV0QlFXUXNSMEZCYzBJc1IwRkJNVUlzUlVGQkswSTdPMEZCUlM5Q0xIbENRVUZoTEZOQlFXSXNRMEZCZFVJc1IwRkJka0lzUTBGQk1rSXNUMEZCTTBJN08wRkJSVUVzTkVKQlFXRXNUMEZCWWp0QlFVTkJMRU5CYmtKRU96dEJRWEZDUVN4SlFVRk5MSGRDUVVGM1FpeFRRVUY0UWl4eFFrRkJkMElzUTBGQlF5eEpRVUZFTEVWQlFWVTdRVUZEZGtNc1UwRkJVU3hSUVVGU0xFZEJRVzFDTEVsQlFXNUNPMEZCUTBFc1UwRkJVU3hQUVVGU0xFZEJRV3RDTEV0QlFVc3NTMEZCVEN4RlFVRnNRaXhEUVVaMVF5eERRVVZRT3p0QlFVVm9ReXhUUVVGUkxFOUJRVklzUTBGQlowSXNTVUZCYUVJc1EwRkJjVUlzVlVGQlF5eERRVUZFTEVWQlFVa3NRMEZCU2l4RlFVRlZPMEZCUXpsQ0xFMUJRVWtzVTBGQlV5eEZRVUZGTEV0QlFVWXNRMEZCVVN4RFFVRlNMRVZCUVZjc1YwRkJXQ3hGUVVGaU8wRkJRMEVzVFVGQlNTeFRRVUZUTEVWQlFVVXNTMEZCUml4RFFVRlJMRU5CUVZJc1JVRkJWeXhYUVVGWUxFVkJRV0k3UVVGRFFTeE5RVUZKTEZOQlFWTXNUVUZCWWl4RlFVRnhRaXhQUVVGUExFTkJRVkFzUTBGQmNrSXNTMEZEU3l4SlFVRkpMRk5CUVZNc1RVRkJZaXhGUVVGeFFpeFBRVUZQTEVOQlFVTXNRMEZCVWl4RFFVRnlRaXhMUVVOQkxFOUJRVThzUTBGQlVEdEJRVU5NTEVWQlRrUTdRVUZQUVN4RFFWaEVPenRCUVdGQkxFbEJRVTBzV1VGQldTeFRRVUZhTEZOQlFWa3NSMEZCVFR0QlFVTjJRaXhQUVVGTkxHRkJRVTRzUlVGQlZTeEpRVUZXTEVOQlFXVTdRVUZCUVN4VFFVRlBMRWxCUVVrc1NVRkJTaXhGUVVGUU8wRkJRVUVzUlVGQlppeEZRVU5ETEVsQlJFUXNRMEZEVFN4blFrRkJVVHRCUVVOaUxIZENRVUZ6UWl4SlFVRjBRanRCUVVOQk8wRkJRMEU3UVVGRFFTeEZRVXhFTEVWQlRVTXNTMEZPUkN4RFFVMVBPMEZCUVVFc1UwRkJUeXhSUVVGUkxFbEJRVklzUTBGQllTeEhRVUZpTEVOQlFWQTdRVUZCUVN4RlFVNVFPMEZCVDBFc1EwRlNSRHM3UVVGVlFTeEpRVUZOTEU5QlFVOHNVMEZCVUN4SlFVRlBMRWRCUVUwN1FVRkRiRUlzWjBOQlFXRXNVVUZCWWp0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFTeERRVkJFT3p0QlFWTkJPenM3T3pzN096czdRVU14UmtFN08wRkJSVUVzU1VGQlNTeFhRVUZYTEV0QlFXWTdRVUZEUVN4SlFVRkpMRXRCUVVzc1MwRkJWRHRCUVVOQkxFbEJRVWtzYTBKQlFVbzdPMEZCUlVFc1NVRkJUU3gxUWtGQmRVSXNVMEZCZGtJc2IwSkJRWFZDTEVkQlFVMDdRVUZEYkVNc1MwRkJUU3hWUVVGVkxFMUJRVTBzU1VGQlRpeERRVUZYTEZOQlFWTXNaMEpCUVZRc1EwRkJNRUlzWjBKQlFURkNMRU5CUVZnc1EwRkJhRUk3TzBGQlJVRXNVMEZCVVN4UFFVRlNMRU5CUVdkQ0xHVkJRVTg3UVVGRGRFSXNUVUZCU1N4blFrRkJTaXhEUVVGeFFpeFBRVUZ5UWl4RlFVRTRRaXhWUVVGRExFZEJRVVFzUlVGQlV6dEJRVU4wUXl4UFFVRkpMRU5CUVVNc1VVRkJUQ3hGUVVGbE8wRkJRMlFzZVVKQlFWVXNVMEZCVml4RFFVRnZRaXhIUVVGd1FpeERRVUYzUWl4VlFVRjRRanRCUVVOQkxIRkNRVUZOTEVkQlFVNHNSMEZCV1N4SlFVRkpMRWRCUVdoQ08wRkJRMEVzWlVGQlZ5eEpRVUZZTzBGQlEwRTdRVUZEUkN4SFFVNUVPMEZCVDBFc1JVRlNSRHM3UVVGVlFTeHpRa0ZCVlN4blFrRkJWaXhEUVVFeVFpeFBRVUV6UWl4RlFVRnZReXhWUVVGRExFZEJRVVFzUlVGQlV6dEJRVU0xUXl4TlFVRkpMRWxCUVVrc1RVRkJTaXhMUVVGbExHZENRVUZ1UWl4RlFVRXdRanRCUVVNeFFpeDFRa0ZCVlN4VFFVRldMRU5CUVc5Q0xFMUJRWEJDTEVOQlFUSkNMRlZCUVROQ08wRkJRMEVzWVVGQlZ5eExRVUZZTzBGQlEwRXNSVUZLUkRzN1FVRk5RU3hyUWtGQlRTeG5Ra0ZCVGl4RFFVRjFRaXhQUVVGMlFpeEZRVUZuUXl4WlFVRk5PMEZCUTNKRExFMUJRVWtzUTBGQlF5eEZRVUZNTEVWQlFWTTdRVUZEVWl4bFFVRlpMR2xDUVVGTkxFdEJRVTRzUjBGQll5eFBRVUZQTEZWQlFYSkNMRWRCUVd0RExHRkJRV3hETEVkQlFXdEVMRk5CUVRsRU8wRkJRMEVzYjBKQlFVMHNVMEZCVGl4RFFVRm5RaXhIUVVGb1FpeERRVUZ2UWl4VFFVRndRanRCUVVOQkxHTkJRVmM3UVVGQlFTeFhRVUZOTEV0QlFVc3NTVUZCV0R0QlFVRkJMRWxCUVZnc1JVRkJORUlzUjBGQk5VSTdRVUZEUVN4SFFVcEVMRTFCU1U4N1FVRkRUaXh2UWtGQlRTeFRRVUZPTEVOQlFXZENMRTFCUVdoQ0xFTkJRWFZDTEZOQlFYWkNPMEZCUTBFc2QwSkJRVlVzVTBGQlZpeERRVUZ2UWl4TlFVRndRaXhEUVVFeVFpeFZRVUV6UWp0QlFVTkJMRkZCUVVzc1MwRkJURHRCUVVOQkxHTkJRVmNzUzBGQldEdEJRVU5CTzBGQlEwUXNSVUZZUkR0QlFWbEJMRU5CTDBKRU96dHJRa0ZwUTJVc2IwSTdPenM3T3pzN096dEJRM1pEWmpzN1FVRkZRU3hKUVVGSkxGRkJRVkVzUzBGQldqdEJRVU5CTEVsQlFVMHNkVUpCUVhWQ0xGTkJRWFpDTEc5Q1FVRjFRaXhIUVVGTk8wRkJRMnhETEV0QlFVMHNVVUZCVVN4VFFVRlRMR05CUVZRc1EwRkJkMElzVTBGQmVFSXNRMEZCWkRzN1FVRkZRU3hQUVVGTkxHZENRVUZPTEVOQlFYVkNMRTlCUVhaQ0xFVkJRV2RETEZsQlFVMDdRVUZEY2tNc2IwSkJRVThzVTBGQlVDeERRVUZwUWl4SFFVRnFRaXhEUVVGeFFpeE5RVUZ5UWp0QlFVTkJMRlZCUVZFc1NVRkJVanRCUVVOQkxFVkJTRVE3TzBGQlMwRXNiVUpCUVU4c1owSkJRVkFzUTBGQmQwSXNUMEZCZUVJc1JVRkJhVU1zV1VGQlRUdEJRVU4wUXl4dlFrRkJUeXhUUVVGUUxFTkJRV2xDTEUxQlFXcENMRU5CUVhkQ0xFMUJRWGhDTzBGQlEwRXNWVUZCVVN4TFFVRlNPMEZCUTBFc1JVRklSRHM3UVVGTFFTeFJRVUZQTEdkQ1FVRlFMRU5CUVhkQ0xGTkJRWGhDTEVWQlFXMURMRmxCUVUwN1FVRkRlRU1zVFVGQlNTeExRVUZLTEVWQlFWYzdRVUZEVml4alFVRlhMRmxCUVUwN1FVRkRhRUlzYzBKQlFVOHNVMEZCVUN4RFFVRnBRaXhOUVVGcVFpeERRVUYzUWl4TlFVRjRRanRCUVVOQkxGbEJRVkVzUzBGQlVqdEJRVU5CTEVsQlNFUXNSVUZIUnl4SFFVaElPMEZCU1VFN1FVRkRSQ3hGUVZCRU8wRkJVVUVzUTBGeVFrUTdPMnRDUVhWQ1pTeHZRanM3T3pzN096czdPMEZETVVKbU96dEJRVU5CT3p0QlFVVkJMRWxCUVVrc1lVRkJTanRCUVVOQkxFbEJRVWtzVlVGQlZTeERRVUZrTzBGQlEwRXNTVUZCU1N4WlFVRlpMRXRCUVdoQ096dEJRVVZCTEVsQlFVMHNlVUpCUVhsQ0xGTkJRWHBDTEhOQ1FVRjVRaXhIUVVGTk8wRkJRM0JETEhOQ1FVRlZMR2RDUVVGV0xFTkJRVEpDTEZGQlFUTkNMRVZCUVhGRExGbEJRVTA3UVVGRE1VTXNUVUZCU1N4SlFVRkpMR3RDUVVGUExIRkNRVUZRTEVkQlFTdENMRU5CUVhaRE96dEJRVVZCTEUxQlFVa3NXVUZCV1N4RFFVRm9RaXhGUVVGdFFqdEJRVU5zUWl4VlFVRlBMRTlCUVZBN1FVRkRRU3hoUVVGVkxFTkJRVlk3UVVGRFFUczdRVUZGUkN4TlFVRkpMRXRCUVVzc1EwRkJReXhGUVVGT0xFbEJRVmtzUTBGQlF5eFRRVUZxUWl4RlFVRTBRanRCUVVNelFpeDFRa0ZCVXl4VFFVRlVMRU5CUVcxQ0xFZEJRVzVDTEVOQlFYVkNMRTFCUVhaQ08wRkJRMEVzWlVGQldTeEpRVUZhTzBGQlEwRXNSMEZJUkN4TlFVZFBMRWxCUVVrc1NVRkJTU3hEUVVGRExFVkJRVXdzU1VGQlZ5eFRRVUZtTEVWQlFUQkNPMEZCUTJoRExIVkNRVUZUTEZOQlFWUXNRMEZCYlVJc1RVRkJia0lzUTBGQk1FSXNUVUZCTVVJN1FVRkRRU3hsUVVGWkxFdEJRVm83UVVGRFFUdEJRVU5FTEVWQlprUTdPMEZCYVVKQkxIRkNRVUZUTEdkQ1FVRlVMRU5CUVRCQ0xFOUJRVEZDTEVWQlFXMURPMEZCUVVFc1UwRkJUU3g1UWtGQlRqdEJRVUZCTEVWQlFXNURPMEZCUTBFc1EwRnVRa1E3TzJ0Q1FYRkNaU3h6UWpzN096czdPenM3T3p0QlF6VkNaanM3T3p0QlFVTkJPenM3TzBGQlEwRTdPenM3UVVGRFFUczdPenRCUVVOQk96czdPenM3VVVGSFF5eHZRaXhIUVVGQkxEaENPMUZCUTBFc2MwSXNSMEZCUVN4blF6dFJRVU5CTEc5Q0xFZEJRVUVzT0VJN1VVRkRRU3haTEVkQlFVRXNjMEk3VVVGRFFTeFZMRWRCUVVFc2IwSTdPenM3T3pzN08wRkRXRVFzU1VGQlRTeFhRVUZYTEVOQlFVTXNSMEZCUkN4RlFVRk5MRWRCUVU0c1JVRkJWeXhIUVVGWUxFVkJRV2RDTEVkQlFXaENMRVZCUVhGQ0xFZEJRWEpDTEVWQlFUQkNMRWRCUVRGQ0xFVkJRU3RDTEVkQlFTOUNMRVZCUVc5RExFZEJRWEJETEVWQlFYbERMRWRCUVhwRExFVkJRVGhETEVkQlFUbERMRVZCUVcxRUxFZEJRVzVFTEVWQlFYZEVMRWRCUVhoRUxFVkJRVFpFTEVkQlFUZEVMRVZCUVd0RkxFZEJRV3hGTEVWQlFYVkZMRWRCUVhaRkxFVkJRVFJGTEVkQlFUVkZMRVZCUVdsR0xFZEJRV3BHTEVWQlFYTkdMRWRCUVhSR0xFVkJRVEpHTEVkQlFUTkdMRVZCUVdkSExFZEJRV2hITEVWQlFYRkhMRWRCUVhKSExFVkJRVEJITEVkQlFURkhMRVZCUVN0SExFZEJRUzlITEVWQlFXOUlMRWRCUVhCSUxFTkJRV3BDT3p0QlFVVkJMRWxCUVUwc1pVRkJaU3hUUVVGbUxGbEJRV1VzUTBGQlF5eFBRVUZFTEVWQlFXRTdRVUZEYWtNc1MwRkJUU3hwUWtGQmFVSXNVMEZCYWtJc1kwRkJhVUlzUTBGQlF5eEpRVUZFTEVWQlFWVTdRVUZEYUVNc1RVRkJUU3hYUVVGWExGVkJRVlVzYVVKQlFWWXNSMEZCT0VJc2EwSkJRUzlETzBGQlEwRXNUVUZCVFN4bFFVRmxMRU5CUVVNc1QwRkJSQ3hIUVVGWExHbENRVUZZTEVkQlFTdENMR3RDUVVGd1JEczdRVUZGUVN4TlFVRk5MRmRCUVZjc1RVRkJUU3hKUVVGT0xFTkJRVmNzVTBGQlV5eG5Ra0ZCVkN4RFFVRXdRaXhSUVVFeFFpeERRVUZZTEVOQlFXcENPMEZCUTBFc1RVRkJUU3hsUVVGbExFMUJRVTBzU1VGQlRpeERRVUZYTEZOQlFWTXNaMEpCUVZRc1EwRkJNRUlzV1VGQk1VSXNRMEZCV0N4RFFVRnlRanM3UVVGRlFTeGxRVUZoTEU5QlFXSXNRMEZCY1VJN1FVRkJRU3hWUVVGVExFMUJRVTBzWlVGQlRpeERRVUZ6UWl4TlFVRjBRaXhEUVVGVU8wRkJRVUVzUjBGQmNrSTdPMEZCUlVFc1UwRkJUeXhUUVVGVExFbEJRVlFzUTBGQll5eHBRa0ZCVXp0QlFVTTNRaXhQUVVGSkxFOUJRVThzVFVGQlRTeHJRa0ZCYWtJN1FVRkRRU3hWUVVGUExFdEJRVXNzVTBGQlRDeERRVUZsTEVOQlFXWXNUVUZCYzBJc1NVRkJkRUlzU1VGQk9FSXNTMEZCU3l4VFFVRk1MRU5CUVdVc1EwRkJaaXhOUVVGelFpeExRVUZMTEZkQlFVd3NSVUZCTTBRN1FVRkRRU3hIUVVoTkxFTkJRVkE3UVVGSlFTeEZRV0pFT3p0QlFXVkJMRXRCUVUwc2RVSkJRWFZDTEZOQlFYWkNMRzlDUVVGMVFpeERRVUZETEU5QlFVUXNSVUZCVlN4TlFVRldMRVZCUVhGQ08wRkJRMnBFTEZWQlFWRXNaMEpCUVZJc1EwRkJlVUlzVDBGQmVrSXNSVUZCYTBNc1dVRkJUVHRCUVVOMlF5eFBRVUZOTEdGQlFXRXNVMEZCVXl4alFVRlVMRU5CUVhkQ0xFMUJRWGhDTEVOQlFXNUNPMEZCUTBFc1QwRkJTU3hsUVVGS096dEJRVVZCTEU5QlFVa3NRMEZCUXl4UFFVRk1MRVZCUVdNN1FVRkRZaXhoUVVGVExGZEJRVmNzUjBGQldDeEhRVUZwUWl4VFFVRlRMR05CUVZRc1EwRkJkMElzWlVGQmVFSXNRMEZCYWtJc1IwRkJORVFzVjBGQlZ5eGhRVUZZTEVOQlFYbENMR0ZCUVhwQ0xFTkJRWFZETEdGQlFYWkRMRU5CUVhGRUxHRkJRWEpFTEVOQlFXMUZMSE5DUVVGdVJTeERRVUV3Uml4aFFVRXhSaXhEUVVGM1J5d3lRa0ZCZUVjc1EwRkJja1U3UVVGRFFTeEpRVVpFTEUxQlJVODdRVUZEVGl4aFFVRlRMRmRCUVZjc1IwRkJXQ3hIUVVGcFFpeFRRVUZUTEdOQlFWUXNRMEZCZDBJc1pVRkJlRUlzUTBGQmFrSXNSMEZCTkVRc1YwRkJWeXhoUVVGWUxFTkJRWGxDTEdGQlFYcENMRU5CUVhWRExHRkJRWFpETEVOQlFYRkVMSE5DUVVGeVJDeERRVUUwUlN4aFFVRTFSU3hEUVVFd1Jpd3lRa0ZCTVVZc1EwRkJja1U3UVVGRFFUczdRVUZGUkN4VlFVRlBMR05CUVZBc1EwRkJjMElzUlVGQlF5eFZRVUZWTEZGQlFWZ3NSVUZCY1VJc1QwRkJUeXhQUVVFMVFpeEZRVUYwUWp0QlFVTkJMRWRCV0VRN1FVRlpRU3hGUVdKRU96dEJRV1ZCTEV0QlFVa3NaMEpCUVdkQ0xFVkJRWEJDTzBGQlEwRXNTMEZCU1N4VFFVRlRMRk5CUVZNc1lVRkJWQ3hEUVVGMVFpeHZRa0ZCZGtJc1EwRkJZanRCUVVOQkxGRkJRVThzVTBGQlVDeEhRVUZ0UWl4RlFVRnVRanM3UVVGRlFTeFZRVUZUTEU5QlFWUXNRMEZCYVVJc2EwSkJRVlU3UVVGRE1VSXNUVUZCU1N4alFVRmpMR1ZCUVdVc1RVRkJaaXhEUVVGc1FqdEJRVU5CTEUxQlFVa3NWVUZCVlN4VFFVRlRMR0ZCUVZRc1EwRkJkVUlzUjBGQmRrSXNRMEZCWkRzN1FVRkZRU3hOUVVGSkxFTkJRVU1zVjBGQlRDeEZRVUZyUWpzN1FVRkZiRUlzWTBGQldTeEZRVUZhTEVkQlFXbENMRTFCUVdwQ08wRkJRMEVzVlVGQlVTeFRRVUZTTEVkQlFXOUNMRTlCUVU4c1YwRkJVQ3hGUVVGd1FqdEJRVU5CTEZWQlFWRXNVMEZCVWl4SFFVRnZRaXg1UWtGQmNFSTdPMEZCUlVFc2RVSkJRWEZDTEU5QlFYSkNMRVZCUVRoQ0xFMUJRVGxDTzBGQlEwRXNVMEZCVHl4WFFVRlFMRU5CUVcxQ0xFOUJRVzVDTzBGQlEwRXNSVUZhUkR0QlFXRkJMRU5CYUVSRU96dHJRa0ZyUkdVc1dUczdPenM3T3pzN1FVTndSR1lzU1VGQlRTeGhRVUZoTEZOQlFXSXNWVUZCWVN4RFFVRkRMRTlCUVVRc1JVRkJZVHRCUVVNdlFpeExRVUZOTEdGQlFXRXNVVUZCVVN4aFFVRlNMRU5CUVhOQ0xHRkJRWFJDTEVOQlFXOURMR0ZCUVhCRExFTkJRVzVDTzBGQlEwRXNTMEZCVFN4aFFVRmhMRkZCUVZFc1lVRkJVaXhEUVVGelFpeGhRVUYwUWl4RFFVRnZReXhoUVVGd1F5eERRVUZ1UWpzN1FVRkZRU3hMUVVGSkxGVkJRVlVzVVVGQlVTeHBRa0ZCZEVJN1FVRkRRU3haUVVGWExHZENRVUZZTEVOQlFUUkNMRTlCUVRWQ0xFVkJRWEZETEZsQlFVMDdRVUZETVVNc1RVRkJUU3hQUVVGUExGRkJRVkVzYTBKQlFYSkNPMEZCUTBFc1RVRkJTU3hKUVVGS0xFVkJRVlU3UVVGRFZDeFJRVUZMTEdOQlFVd3NRMEZCYjBJc1JVRkJReXhWUVVGVkxGRkJRVmdzUlVGQmNVSXNUMEZCVHl4VFFVRTFRaXhGUVVGMVF5eFJRVUZSTEZGQlFTOURMRVZCUVhCQ08wRkJRMEVzWVVGQlZTeEpRVUZXTzBGQlEwRTdRVUZEUkN4RlFVNUVPenRCUVZGQkxGbEJRVmNzWjBKQlFWZ3NRMEZCTkVJc1QwRkJOVUlzUlVGQmNVTXNXVUZCVFR0QlFVTXhReXhOUVVGTkxFOUJRVThzVVVGQlVTeHpRa0ZCY2tJN1FVRkRRU3hOUVVGSkxFbEJRVW9zUlVGQlZUdEJRVU5VTEZGQlFVc3NZMEZCVEN4RFFVRnZRaXhGUVVGRExGVkJRVlVzVVVGQldDeEZRVUZ4UWl4UFFVRlBMRk5CUVRWQ0xFVkJRWFZETEZGQlFWRXNVVUZCTDBNc1JVRkJjRUk3UVVGRFFTeGhRVUZWTEVsQlFWWTdRVUZEUVR0QlFVTkVMRVZCVGtRN1FVRlBRU3hEUVhCQ1JEczdhMEpCYzBKbExGVTdPenM3T3pzN08wRkRkRUptTEVsQlFVMHNaMEpCUVdkQ0xGTkJRV2hDTEdGQlFXZENMRU5CUVVNc1MwRkJSRHRCUVVGQkxIbEhRVVZwUXl4TFFVWnFRenRCUVVGQkxFTkJRWFJDT3p0QlFVMUJMRWxCUVUwc2EwSkJRV3RDTEZOQlFXeENMR1ZCUVd0Q0xFTkJRVU1zUzBGQlJDeEZRVUZSTEVOQlFWSXNSVUZCWXp0QlFVRkJMRXRCUXpkQ0xFdEJSRFpDTEVkQlEzRkZMRXRCUkhKRkxFTkJRemRDTEV0QlJEWkNPMEZCUVVFc1MwRkRkRUlzVTBGRWMwSXNSMEZEY1VVc1MwRkVja1VzUTBGRGRFSXNVMEZFYzBJN1FVRkJRU3hMUVVOWUxGRkJSRmNzUjBGRGNVVXNTMEZFY2tVc1EwRkRXQ3hSUVVSWE8wRkJRVUVzUzBGRFJDeE5RVVJETEVkQlEzRkZMRXRCUkhKRkxFTkJRMFFzVFVGRVF6dEJRVUZCTEV0QlEwOHNWMEZFVUN4SFFVTnhSU3hMUVVSeVJTeERRVU5QTEZkQlJGQTdRVUZCUVN4TFFVTnZRaXhSUVVSd1FpeEhRVU54UlN4TFFVUnlSU3hEUVVOdlFpeFJRVVJ3UWp0QlFVRkJMRXRCUXpoQ0xGVkJSRGxDTEVkQlEzRkZMRXRCUkhKRkxFTkJRemhDTEZWQlJEbENPMEZCUVVFc1MwRkRNRU1zU1VGRU1VTXNSMEZEY1VVc1MwRkVja1VzUTBGRE1FTXNTVUZFTVVNN1FVRkJRU3hMUVVOblJDeEpRVVJvUkN4SFFVTnhSU3hMUVVSeVJTeERRVU5uUkN4SlFVUm9SRHRCUVVGQkxFdEJRM05FTEVsQlJIUkVMRWRCUTNGRkxFdEJSSEpGTEVOQlEzTkVMRWxCUkhSRU8wRkJRVUVzUzBGRE5FUXNTVUZFTlVRc1IwRkRjVVVzUzBGRWNrVXNRMEZETkVRc1NVRkVOVVE3T3p0QlFVZHlReXhMUVVGTkxGbEJRVmtzVDBGQlR5eE5RVUZRTEVkQlEycENMRTlCUVU4c1IwRkJVQ3hEUVVGWE8wRkJRVUVzVTBGQlV5eGpRVUZqTEV0QlFXUXNRMEZCVkR0QlFVRkJMRVZCUVZnc1JVRkJNRU1zU1VGQk1VTXNRMEZCSzBNc1JVRkJMME1zUTBGRWFVSXNSMEZEYjBNc1JVRkVkRVE3TzBGQlIwRXNkMDVCUzNsRExFdEJUSHBETEhGSVFVOXJSQ3hUUVZCc1JDeHZTRUZUYVVRc1VVRlVha1FzTUVwQllXOUVMRU5CWW5CRUxIZENRV05QTEZOQlpGQXNLMGRCWjBKNVF5eFhRV2hDZWtNc01FUkJhVUp2UXl4UlFXcENjRU1zYVVaQmEwSXlSQ3hWUVd4Q00wUXNhVVpCYlVJeVJDeEpRVzVDTTBRc2FVWkJiMEl5UkN4SlFYQkNNMFFzY1VoQmNVSXJSaXhKUVhKQ0wwWXNWVUZ4UW5kSExFbEJja0o0Unp0QlFXZERRU3hEUVhSRFJEczdhMEpCZDBObExHVTdPenM3T3pzN096czdRVU01UTJZN096czdRVUZEUVRzN096czdPMUZCUlZNc1pTeEhRVUZCTEdsQ08xRkJRV2xDTEZjc1IwRkJRU3hsT3pzN096czdPenRCUTBneFFpeEpRVUZOTEcxdFFrRkJUanM3UVVGcFFrRXNTVUZCVFN4alFVRmpMRk5CUVdRc1YwRkJZeXhIUVVGTk8wRkJRM3BDTEV0QlFVa3NWMEZCVnl4VFFVRlRMR05CUVZRc1EwRkJkMElzVVVGQmVFSXNRMEZCWmp0QlFVTkJMRlZCUVZNc1UwRkJWQ3hIUVVGeFFpeFJRVUZ5UWp0QlFVTkJMRU5CU0VRN08ydENRVXRsTEZjN096czdPenM3T3pzN1FVTjBRbVk3TzBGQlJVRXNTVUZCVFN4WFFVRlhMRk5CUVZnc1VVRkJWeXhEUVVGRExFVkJRVVFzUlVGQlN5eEpRVUZNTEVWQlFXTTdRVUZETjBJc1RVRkJTU3huUWtGQlNqczdRVUZGUVN4VFFVRlBMRmxCUVZjN1FVRkJRVHRCUVVGQk96dEJRVU5vUWl4UlFVRk5MR1ZCUVdVc1UwRkJaaXhaUVVGbE8wRkJRVUVzWVVGQlRTeEhRVUZITEV0QlFVZ3NRMEZCVXl4TFFVRlVMRVZCUVdVc1ZVRkJaaXhEUVVGT08wRkJRVUVzUzBGQmNrSTdPMEZCUlVFc2FVSkJRV0VzVDBGQllqdEJRVU5CTEdOQlFWVXNWMEZCVnl4WlFVRllMRVZCUVhsQ0xFbEJRWHBDTEVOQlFWWTdRVUZEUkN4SFFVeEVPMEZCVFVRc1EwRlVSRHM3UVVGWFFTeEpRVUZOTEdOQlFXTXNVMEZCWkN4WFFVRmpMRWRCUVUwN1FVRkRla0lzYzBKQlFWTXNUMEZCVkN4RFFVRnBRanRCUVVGQkxGZEJRVkVzUzBGQlN5eFRRVUZNTEVOQlFXVXNSMEZCWml4RFFVRnRRaXhQUVVGdVFpeERRVUZTTzBGQlFVRXNSMEZCYWtJN1FVRkRRU3hyUWtGQlN5eFRRVUZNTEVOQlFXVXNSMEZCWml4RFFVRnRRaXhQUVVGdVFqdEJRVU5CTEVOQlNFUTdPMEZCUzBFc1NVRkJUU3hqUVVGakxGTkJRV1FzVjBGQll5eEhRVUZOTzBGQlEzcENMRTFCUVVrc1RVRkJUU3hUUVVGVExHTkJRVlFzUTBGQmQwSXNaVUZCZUVJc1EwRkJWanRCUVVOQkxFMUJRVWtzWTBGQlNpeERRVUZ0UWl4RlFVRkRMRlZCUVZVc1VVRkJXQ3hGUVVGeFFpeFBRVUZQTEU5QlFUVkNMRVZCUVc1Q08wRkJRMEVzUTBGSVJEczdVVUZMVXl4UkxFZEJRVUVzVVR0UlFVRlZMRmNzUjBGQlFTeFhPMUZCUVdFc1Z5eEhRVUZCTEZjaUxDSm1hV3hsSWpvaVoyVnVaWEpoZEdWa0xtcHpJaXdpYzI5MWNtTmxVbTl2ZENJNklpSXNJbk52ZFhKalpYTkRiMjUwWlc1MElqcGJJaWhtZFc1amRHbHZiaWdwZTJaMWJtTjBhVzl1SUhJb1pTeHVMSFFwZTJaMWJtTjBhVzl1SUc4b2FTeG1LWHRwWmlnaGJsdHBYU2w3YVdZb0lXVmJhVjBwZTNaaGNpQmpQVndpWm5WdVkzUnBiMjVjSWowOWRIbHdaVzltSUhKbGNYVnBjbVVtSm5KbGNYVnBjbVU3YVdZb0lXWW1KbU1wY21WMGRYSnVJR01vYVN3aE1DazdhV1lvZFNseVpYUjFjbTRnZFNocExDRXdLVHQyWVhJZ1lUMXVaWGNnUlhKeWIzSW9YQ0pEWVc1dWIzUWdabWx1WkNCdGIyUjFiR1VnSjF3aUsya3JYQ0luWENJcE8zUm9jbTkzSUdFdVkyOWtaVDFjSWsxUFJGVk1SVjlPVDFSZlJrOVZUa1JjSWl4aGZYWmhjaUJ3UFc1YmFWMDllMlY0Y0c5eWRITTZlMzE5TzJWYmFWMWJNRjB1WTJGc2JDaHdMbVY0Y0c5eWRITXNablZ1WTNScGIyNG9jaWw3ZG1GeUlHNDlaVnRwWFZzeFhWdHlYVHR5WlhSMWNtNGdieWh1Zkh4eUtYMHNjQ3h3TG1WNGNHOXlkSE1zY2l4bExHNHNkQ2w5Y21WMGRYSnVJRzViYVYwdVpYaHdiM0owYzMxbWIzSW9kbUZ5SUhVOVhDSm1kVzVqZEdsdmJsd2lQVDEwZVhCbGIyWWdjbVZ4ZFdseVpTWW1jbVZ4ZFdseVpTeHBQVEE3YVR4MExteGxibWQwYUR0cEt5c3BieWgwVzJsZEtUdHlaWFIxY200Z2IzMXlaWFIxY200Z2NuMHBLQ2tpTENJdktpQnpiVzl2ZEdoelkzSnZiR3dnZGpBdU5DNHdJQzBnTWpBeE9DQXRJRVIxYzNSaGJpQkxZWE4wWlc0c0lFcGxjbVZ0YVdGeklFMWxibWxqYUdWc2JHa2dMU0JOU1ZRZ1RHbGpaVzV6WlNBcUwxeHVLR1oxYm1OMGFXOXVJQ2dwSUh0Y2JpQWdKM1Z6WlNCemRISnBZM1FuTzF4dVhHNGdJQzh2SUhCdmJIbG1hV3hzWEc0Z0lHWjFibU4wYVc5dUlIQnZiSGxtYVd4c0tDa2dlMXh1SUNBZ0lDOHZJR0ZzYVdGelpYTmNiaUFnSUNCMllYSWdkeUE5SUhkcGJtUnZkenRjYmlBZ0lDQjJZWElnWkNBOUlHUnZZM1Z0Wlc1ME8xeHVYRzRnSUNBZ0x5OGdjbVYwZFhKdUlHbG1JSE5qY205c2JDQmlaV2hoZG1sdmNpQnBjeUJ6ZFhCd2IzSjBaV1FnWVc1a0lIQnZiSGxtYVd4c0lHbHpJRzV2ZENCbWIzSmpaV1JjYmlBZ0lDQnBaaUFvWEc0Z0lDQWdJQ0FuYzJOeWIyeHNRbVZvWVhacGIzSW5JR2x1SUdRdVpHOWpkVzFsYm5SRmJHVnRaVzUwTG5OMGVXeGxJQ1ltWEc0Z0lDQWdJQ0IzTGw5ZlptOXlZMlZUYlc5dmRHaFRZM0p2Ykd4UWIyeDVabWxzYkY5ZklDRTlQU0IwY25WbFhHNGdJQ0FnS1NCN1hHNGdJQ0FnSUNCeVpYUjFjbTQ3WEc0Z0lDQWdmVnh1WEc0Z0lDQWdMeThnWjJ4dlltRnNjMXh1SUNBZ0lIWmhjaUJGYkdWdFpXNTBJRDBnZHk1SVZFMU1SV3hsYldWdWRDQjhmQ0IzTGtWc1pXMWxiblE3WEc0Z0lDQWdkbUZ5SUZORFVrOU1URjlVU1UxRklEMGdORFk0TzF4dVhHNGdJQ0FnTHk4Z2IySnFaV04wSUdkaGRHaGxjbWx1WnlCdmNtbG5hVzVoYkNCelkzSnZiR3dnYldWMGFHOWtjMXh1SUNBZ0lIWmhjaUJ2Y21sbmFXNWhiQ0E5SUh0Y2JpQWdJQ0FnSUhOamNtOXNiRG9nZHk1elkzSnZiR3dnZkh3Z2R5NXpZM0p2Ykd4VWJ5eGNiaUFnSUNBZ0lITmpjbTlzYkVKNU9pQjNMbk5qY205c2JFSjVMRnh1SUNBZ0lDQWdaV3hsYldWdWRGTmpjbTlzYkRvZ1JXeGxiV1Z1ZEM1d2NtOTBiM1I1Y0dVdWMyTnliMnhzSUh4OElITmpjbTlzYkVWc1pXMWxiblFzWEc0Z0lDQWdJQ0J6WTNKdmJHeEpiblJ2Vm1sbGR6b2dSV3hsYldWdWRDNXdjbTkwYjNSNWNHVXVjMk55YjJ4c1NXNTBiMVpwWlhkY2JpQWdJQ0I5TzF4dVhHNGdJQ0FnTHk4Z1pHVm1hVzVsSUhScGJXbHVaeUJ0WlhSb2IyUmNiaUFnSUNCMllYSWdibTkzSUQxY2JpQWdJQ0FnSUhjdWNHVnlabTl5YldGdVkyVWdKaVlnZHk1d1pYSm1iM0p0WVc1alpTNXViM2RjYmlBZ0lDQWdJQ0FnUHlCM0xuQmxjbVp2Y20xaGJtTmxMbTV2ZHk1aWFXNWtLSGN1Y0dWeVptOXliV0Z1WTJVcFhHNGdJQ0FnSUNBZ0lEb2dSR0YwWlM1dWIzYzdYRzVjYmlBZ0lDQXZLaXBjYmlBZ0lDQWdLaUJwYm1ScFkyRjBaWE1nYVdZZ1lTQjBhR1VnWTNWeWNtVnVkQ0JpY205M2MyVnlJR2x6SUcxaFpHVWdZbmtnVFdsamNtOXpiMlowWEc0Z0lDQWdJQ29nUUcxbGRHaHZaQ0JwYzAxcFkzSnZjMjltZEVKeWIzZHpaWEpjYmlBZ0lDQWdLaUJBY0dGeVlXMGdlMU4wY21sdVozMGdkWE5sY2tGblpXNTBYRzRnSUNBZ0lDb2dRSEpsZEhWeWJuTWdlMEp2YjJ4bFlXNTlYRzRnSUNBZ0lDb3ZYRzRnSUNBZ1puVnVZM1JwYjI0Z2FYTk5hV055YjNOdlpuUkNjbTkzYzJWeUtIVnpaWEpCWjJWdWRDa2dlMXh1SUNBZ0lDQWdkbUZ5SUhWelpYSkJaMlZ1ZEZCaGRIUmxjbTV6SUQwZ1d5ZE5VMGxGSUNjc0lDZFVjbWxrWlc1MEx5Y3NJQ2RGWkdkbEx5ZGRPMXh1WEc0Z0lDQWdJQ0J5WlhSMWNtNGdibVYzSUZKbFowVjRjQ2gxYzJWeVFXZGxiblJRWVhSMFpYSnVjeTVxYjJsdUtDZDhKeWtwTG5SbGMzUW9kWE5sY2tGblpXNTBLVHRjYmlBZ0lDQjlYRzVjYmlBZ0lDQXZLbHh1SUNBZ0lDQXFJRWxGSUdoaGN5QnliM1Z1WkdsdVp5QmlkV2NnY205MWJtUnBibWNnWkc5M2JpQmpiR2xsYm5SSVpXbG5hSFFnWVc1a0lHTnNhV1Z1ZEZkcFpIUm9JR0Z1WkZ4dUlDQWdJQ0FxSUhKdmRXNWthVzVuSUhWd0lITmpjbTlzYkVobGFXZG9kQ0JoYm1RZ2MyTnliMnhzVjJsa2RHZ2dZMkYxYzJsdVp5Qm1ZV3h6WlNCd2IzTnBkR2wyWlhOY2JpQWdJQ0FnS2lCdmJpQm9ZWE5UWTNKdmJHeGhZbXhsVTNCaFkyVmNiaUFnSUNBZ0tpOWNiaUFnSUNCMllYSWdVazlWVGtSSlRrZGZWRTlNUlZKQlRrTkZJRDBnYVhOTmFXTnliM052Wm5SQ2NtOTNjMlZ5S0hjdWJtRjJhV2RoZEc5eUxuVnpaWEpCWjJWdWRDa2dQeUF4SURvZ01EdGNibHh1SUNBZ0lDOHFLbHh1SUNBZ0lDQXFJR05vWVc1blpYTWdjMk55YjJ4c0lIQnZjMmwwYVc5dUlHbHVjMmxrWlNCaGJpQmxiR1Z0Wlc1MFhHNGdJQ0FnSUNvZ1FHMWxkR2h2WkNCelkzSnZiR3hGYkdWdFpXNTBYRzRnSUNBZ0lDb2dRSEJoY21GdElIdE9kVzFpWlhKOUlIaGNiaUFnSUNBZ0tpQkFjR0Z5WVcwZ2UwNTFiV0psY24wZ2VWeHVJQ0FnSUNBcUlFQnlaWFIxY201eklIdDFibVJsWm1sdVpXUjlYRzRnSUNBZ0lDb3ZYRzRnSUNBZ1puVnVZM1JwYjI0Z2MyTnliMnhzUld4bGJXVnVkQ2g0TENCNUtTQjdYRzRnSUNBZ0lDQjBhR2x6TG5OamNtOXNiRXhsWm5RZ1BTQjRPMXh1SUNBZ0lDQWdkR2hwY3k1elkzSnZiR3hVYjNBZ1BTQjVPMXh1SUNBZ0lIMWNibHh1SUNBZ0lDOHFLbHh1SUNBZ0lDQXFJSEpsZEhWeWJuTWdjbVZ6ZFd4MElHOW1JR0Z3Y0d4NWFXNW5JR1ZoYzJVZ2JXRjBhQ0JtZFc1amRHbHZiaUIwYnlCaElHNTFiV0psY2x4dUlDQWdJQ0FxSUVCdFpYUm9iMlFnWldGelpWeHVJQ0FnSUNBcUlFQndZWEpoYlNCN1RuVnRZbVZ5ZlNCclhHNGdJQ0FnSUNvZ1FISmxkSFZ5Ym5NZ2UwNTFiV0psY24xY2JpQWdJQ0FnS2k5Y2JpQWdJQ0JtZFc1amRHbHZiaUJsWVhObEtHc3BJSHRjYmlBZ0lDQWdJSEpsZEhWeWJpQXdMalVnS2lBb01TQXRJRTFoZEdndVkyOXpLRTFoZEdndVVFa2dLaUJyS1NrN1hHNGdJQ0FnZlZ4dVhHNGdJQ0FnTHlvcVhHNGdJQ0FnSUNvZ2FXNWthV05oZEdWeklHbG1JR0VnYzIxdmIzUm9JR0psYUdGMmFXOXlJSE5vYjNWc1pDQmlaU0JoY0hCc2FXVmtYRzRnSUNBZ0lDb2dRRzFsZEdodlpDQnphRzkxYkdSQ1lXbHNUM1YwWEc0Z0lDQWdJQ29nUUhCaGNtRnRJSHRPZFcxaVpYSjhUMkpxWldOMGZTQm1hWEp6ZEVGeVoxeHVJQ0FnSUNBcUlFQnlaWFIxY201eklIdENiMjlzWldGdWZWeHVJQ0FnSUNBcUwxeHVJQ0FnSUdaMWJtTjBhVzl1SUhOb2IzVnNaRUpoYVd4UGRYUW9abWx5YzNSQmNtY3BJSHRjYmlBZ0lDQWdJR2xtSUNoY2JpQWdJQ0FnSUNBZ1ptbHljM1JCY21jZ1BUMDlJRzUxYkd3Z2ZIeGNiaUFnSUNBZ0lDQWdkSGx3Wlc5bUlHWnBjbk4wUVhKbklDRTlQU0FuYjJKcVpXTjBKeUI4ZkZ4dUlDQWdJQ0FnSUNCbWFYSnpkRUZ5Wnk1aVpXaGhkbWx2Y2lBOVBUMGdkVzVrWldacGJtVmtJSHg4WEc0Z0lDQWdJQ0FnSUdacGNuTjBRWEpuTG1KbGFHRjJhVzl5SUQwOVBTQW5ZWFYwYnljZ2ZIeGNiaUFnSUNBZ0lDQWdabWx5YzNSQmNtY3VZbVZvWVhacGIzSWdQVDA5SUNkcGJuTjBZVzUwSjF4dUlDQWdJQ0FnS1NCN1hHNGdJQ0FnSUNBZ0lDOHZJR1pwY25OMElHRnlaM1Z0Wlc1MElHbHpJRzV2ZENCaGJpQnZZbXBsWTNRdmJuVnNiRnh1SUNBZ0lDQWdJQ0F2THlCdmNpQmlaV2hoZG1sdmNpQnBjeUJoZFhSdkxDQnBibk4wWVc1MElHOXlJSFZ1WkdWbWFXNWxaRnh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdkSEoxWlR0Y2JpQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ2FXWWdLSFI1Y0dWdlppQm1hWEp6ZEVGeVp5QTlQVDBnSjI5aWFtVmpkQ2NnSmlZZ1ptbHljM1JCY21jdVltVm9ZWFpwYjNJZ1BUMDlJQ2R6Ylc5dmRHZ25LU0I3WEc0Z0lDQWdJQ0FnSUM4dklHWnBjbk4wSUdGeVozVnRaVzUwSUdseklHRnVJRzlpYW1WamRDQmhibVFnWW1Wb1lYWnBiM0lnYVhNZ2MyMXZiM1JvWEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJtWVd4elpUdGNiaUFnSUNBZ0lIMWNibHh1SUNBZ0lDQWdMeThnZEdoeWIzY2daWEp5YjNJZ2QyaGxiaUJpWldoaGRtbHZjaUJwY3lCdWIzUWdjM1Z3Y0c5eWRHVmtYRzRnSUNBZ0lDQjBhSEp2ZHlCdVpYY2dWSGx3WlVWeWNtOXlLRnh1SUNBZ0lDQWdJQ0FuWW1Wb1lYWnBiM0lnYldWdFltVnlJRzltSUZOamNtOXNiRTl3ZEdsdmJuTWdKeUFyWEc0Z0lDQWdJQ0FnSUNBZ1ptbHljM1JCY21jdVltVm9ZWFpwYjNJZ0sxeHVJQ0FnSUNBZ0lDQWdJQ2NnYVhNZ2JtOTBJR0VnZG1Gc2FXUWdkbUZzZFdVZ1ptOXlJR1Z1ZFcxbGNtRjBhVzl1SUZOamNtOXNiRUpsYUdGMmFXOXlMaWRjYmlBZ0lDQWdJQ2s3WEc0Z0lDQWdmVnh1WEc0Z0lDQWdMeW9xWEc0Z0lDQWdJQ29nYVc1a2FXTmhkR1Z6SUdsbUlHRnVJR1ZzWlcxbGJuUWdhR0Z6SUhOamNtOXNiR0ZpYkdVZ2MzQmhZMlVnYVc0Z2RHaGxJSEJ5YjNacFpHVmtJR0Y0YVhOY2JpQWdJQ0FnS2lCQWJXVjBhRzlrSUdoaGMxTmpjbTlzYkdGaWJHVlRjR0ZqWlZ4dUlDQWdJQ0FxSUVCd1lYSmhiU0I3VG05a1pYMGdaV3hjYmlBZ0lDQWdLaUJBY0dGeVlXMGdlMU4wY21sdVozMGdZWGhwYzF4dUlDQWdJQ0FxSUVCeVpYUjFjbTV6SUh0Q2IyOXNaV0Z1ZlZ4dUlDQWdJQ0FxTDF4dUlDQWdJR1oxYm1OMGFXOXVJR2hoYzFOamNtOXNiR0ZpYkdWVGNHRmpaU2hsYkN3Z1lYaHBjeWtnZTF4dUlDQWdJQ0FnYVdZZ0tHRjRhWE1nUFQwOUlDZFpKeWtnZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnWld3dVkyeHBaVzUwU0dWcFoyaDBJQ3NnVWs5VlRrUkpUa2RmVkU5TVJWSkJUa05GSUR3Z1pXd3VjMk55YjJ4c1NHVnBaMmgwTzF4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNCcFppQW9ZWGhwY3lBOVBUMGdKMWduS1NCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCbGJDNWpiR2xsYm5SWGFXUjBhQ0FySUZKUFZVNUVTVTVIWDFSUFRFVlNRVTVEUlNBOElHVnNMbk5qY205c2JGZHBaSFJvTzF4dUlDQWdJQ0FnZlZ4dUlDQWdJSDFjYmx4dUlDQWdJQzhxS2x4dUlDQWdJQ0FxSUdsdVpHbGpZWFJsY3lCcFppQmhiaUJsYkdWdFpXNTBJR2hoY3lCaElITmpjbTlzYkdGaWJHVWdiM1psY21ac2IzY2djSEp2Y0dWeWRIa2dhVzRnZEdobElHRjRhWE5jYmlBZ0lDQWdLaUJBYldWMGFHOWtJR05oYms5MlpYSm1iRzkzWEc0Z0lDQWdJQ29nUUhCaGNtRnRJSHRPYjJSbGZTQmxiRnh1SUNBZ0lDQXFJRUJ3WVhKaGJTQjdVM1J5YVc1bmZTQmhlR2x6WEc0Z0lDQWdJQ29nUUhKbGRIVnlibk1nZTBKdmIyeGxZVzU5WEc0Z0lDQWdJQ292WEc0Z0lDQWdablZ1WTNScGIyNGdZMkZ1VDNabGNtWnNiM2NvWld3c0lHRjRhWE1wSUh0Y2JpQWdJQ0FnSUhaaGNpQnZkbVZ5Wm14dmQxWmhiSFZsSUQwZ2R5NW5aWFJEYjIxd2RYUmxaRk4wZVd4bEtHVnNMQ0J1ZFd4c0tWc25iM1psY21ac2IzY25JQ3NnWVhocGMxMDdYRzVjYmlBZ0lDQWdJSEpsZEhWeWJpQnZkbVZ5Wm14dmQxWmhiSFZsSUQwOVBTQW5ZWFYwYnljZ2ZId2diM1psY21ac2IzZFdZV3gxWlNBOVBUMGdKM05qY205c2JDYzdYRzRnSUNBZ2ZWeHVYRzRnSUNBZ0x5b3FYRzRnSUNBZ0lDb2dhVzVrYVdOaGRHVnpJR2xtSUdGdUlHVnNaVzFsYm5RZ1kyRnVJR0psSUhOamNtOXNiR1ZrSUdsdUlHVnBkR2hsY2lCaGVHbHpYRzRnSUNBZ0lDb2dRRzFsZEdodlpDQnBjMU5qY205c2JHRmliR1ZjYmlBZ0lDQWdLaUJBY0dGeVlXMGdlMDV2WkdWOUlHVnNYRzRnSUNBZ0lDb2dRSEJoY21GdElIdFRkSEpwYm1kOUlHRjRhWE5jYmlBZ0lDQWdLaUJBY21WMGRYSnVjeUI3UW05dmJHVmhibjFjYmlBZ0lDQWdLaTljYmlBZ0lDQm1kVzVqZEdsdmJpQnBjMU5qY205c2JHRmliR1VvWld3cElIdGNiaUFnSUNBZ0lIWmhjaUJwYzFOamNtOXNiR0ZpYkdWWklEMGdhR0Z6VTJOeWIyeHNZV0pzWlZOd1lXTmxLR1ZzTENBbldTY3BJQ1ltSUdOaGJrOTJaWEptYkc5M0tHVnNMQ0FuV1NjcE8xeHVJQ0FnSUNBZ2RtRnlJR2x6VTJOeWIyeHNZV0pzWlZnZ1BTQm9ZWE5UWTNKdmJHeGhZbXhsVTNCaFkyVW9aV3dzSUNkWUp5a2dKaVlnWTJGdVQzWmxjbVpzYjNjb1pXd3NJQ2RZSnlrN1hHNWNiaUFnSUNBZ0lISmxkSFZ5YmlCcGMxTmpjbTlzYkdGaWJHVlpJSHg4SUdselUyTnliMnhzWVdKc1pWZzdYRzRnSUNBZ2ZWeHVYRzRnSUNBZ0x5b3FYRzRnSUNBZ0lDb2dabWx1WkhNZ2MyTnliMnhzWVdKc1pTQndZWEpsYm5RZ2IyWWdZVzRnWld4bGJXVnVkRnh1SUNBZ0lDQXFJRUJ0WlhSb2IyUWdabWx1WkZOamNtOXNiR0ZpYkdWUVlYSmxiblJjYmlBZ0lDQWdLaUJBY0dGeVlXMGdlMDV2WkdWOUlHVnNYRzRnSUNBZ0lDb2dRSEpsZEhWeWJuTWdlMDV2WkdWOUlHVnNYRzRnSUNBZ0lDb3ZYRzRnSUNBZ1puVnVZM1JwYjI0Z1ptbHVaRk5qY205c2JHRmliR1ZRWVhKbGJuUW9aV3dwSUh0Y2JpQWdJQ0FnSUhaaGNpQnBjMEp2WkhrN1hHNWNiaUFnSUNBZ0lHUnZJSHRjYmlBZ0lDQWdJQ0FnWld3Z1BTQmxiQzV3WVhKbGJuUk9iMlJsTzF4dVhHNGdJQ0FnSUNBZ0lHbHpRbTlrZVNBOUlHVnNJRDA5UFNCa0xtSnZaSGs3WEc0Z0lDQWdJQ0I5SUhkb2FXeGxJQ2hwYzBKdlpIa2dQVDA5SUdaaGJITmxJQ1ltSUdselUyTnliMnhzWVdKc1pTaGxiQ2tnUFQwOUlHWmhiSE5sS1R0Y2JseHVJQ0FnSUNBZ2FYTkNiMlI1SUQwZ2JuVnNiRHRjYmx4dUlDQWdJQ0FnY21WMGRYSnVJR1ZzTzF4dUlDQWdJSDFjYmx4dUlDQWdJQzhxS2x4dUlDQWdJQ0FxSUhObGJHWWdhVzUyYjJ0bFpDQm1kVzVqZEdsdmJpQjBhR0YwTENCbmFYWmxiaUJoSUdOdmJuUmxlSFFzSUhOMFpYQnpJSFJvY205MVoyZ2djMk55YjJ4c2FXNW5YRzRnSUNBZ0lDb2dRRzFsZEdodlpDQnpkR1Z3WEc0Z0lDQWdJQ29nUUhCaGNtRnRJSHRQWW1wbFkzUjlJR052Ym5SbGVIUmNiaUFnSUNBZ0tpQkFjbVYwZFhKdWN5QjdkVzVrWldacGJtVmtmVnh1SUNBZ0lDQXFMMXh1SUNBZ0lHWjFibU4wYVc5dUlITjBaWEFvWTI5dWRHVjRkQ2tnZTF4dUlDQWdJQ0FnZG1GeUlIUnBiV1VnUFNCdWIzY29LVHRjYmlBZ0lDQWdJSFpoY2lCMllXeDFaVHRjYmlBZ0lDQWdJSFpoY2lCamRYSnlaVzUwV0R0Y2JpQWdJQ0FnSUhaaGNpQmpkWEp5Wlc1MFdUdGNiaUFnSUNBZ0lIWmhjaUJsYkdGd2MyVmtJRDBnS0hScGJXVWdMU0JqYjI1MFpYaDBMbk4wWVhKMFZHbHRaU2tnTHlCVFExSlBURXhmVkVsTlJUdGNibHh1SUNBZ0lDQWdMeThnWVhadmFXUWdaV3hoY0hObFpDQjBhVzFsY3lCb2FXZG9aWElnZEdoaGJpQnZibVZjYmlBZ0lDQWdJR1ZzWVhCelpXUWdQU0JsYkdGd2MyVmtJRDRnTVNBL0lERWdPaUJsYkdGd2MyVmtPMXh1WEc0Z0lDQWdJQ0F2THlCaGNIQnNlU0JsWVhOcGJtY2dkRzhnWld4aGNITmxaQ0IwYVcxbFhHNGdJQ0FnSUNCMllXeDFaU0E5SUdWaGMyVW9aV3hoY0hObFpDazdYRzVjYmlBZ0lDQWdJR04xY25KbGJuUllJRDBnWTI5dWRHVjRkQzV6ZEdGeWRGZ2dLeUFvWTI5dWRHVjRkQzU0SUMwZ1kyOXVkR1Y0ZEM1emRHRnlkRmdwSUNvZ2RtRnNkV1U3WEc0Z0lDQWdJQ0JqZFhKeVpXNTBXU0E5SUdOdmJuUmxlSFF1YzNSaGNuUlpJQ3NnS0dOdmJuUmxlSFF1ZVNBdElHTnZiblJsZUhRdWMzUmhjblJaS1NBcUlIWmhiSFZsTzF4dVhHNGdJQ0FnSUNCamIyNTBaWGgwTG0xbGRHaHZaQzVqWVd4c0tHTnZiblJsZUhRdWMyTnliMnhzWVdKc1pTd2dZM1Z5Y21WdWRGZ3NJR04xY25KbGJuUlpLVHRjYmx4dUlDQWdJQ0FnTHk4Z2MyTnliMnhzSUcxdmNtVWdhV1lnZDJVZ2FHRjJaU0J1YjNRZ2NtVmhZMmhsWkNCdmRYSWdaR1Z6ZEdsdVlYUnBiMjVjYmlBZ0lDQWdJR2xtSUNoamRYSnlaVzUwV0NBaFBUMGdZMjl1ZEdWNGRDNTRJSHg4SUdOMWNuSmxiblJaSUNFOVBTQmpiMjUwWlhoMExua3BJSHRjYmlBZ0lDQWdJQ0FnZHk1eVpYRjFaWE4wUVc1cGJXRjBhVzl1Um5KaGJXVW9jM1JsY0M1aWFXNWtLSGNzSUdOdmJuUmxlSFFwS1R0Y2JpQWdJQ0FnSUgxY2JpQWdJQ0I5WEc1Y2JpQWdJQ0F2S2lwY2JpQWdJQ0FnS2lCelkzSnZiR3h6SUhkcGJtUnZkeUJ2Y2lCbGJHVnRaVzUwSUhkcGRHZ2dZU0J6Ylc5dmRHZ2dZbVZvWVhacGIzSmNiaUFnSUNBZ0tpQkFiV1YwYUc5a0lITnRiMjkwYUZOamNtOXNiRnh1SUNBZ0lDQXFJRUJ3WVhKaGJTQjdUMkpxWldOMGZFNXZaR1Y5SUdWc1hHNGdJQ0FnSUNvZ1FIQmhjbUZ0SUh0T2RXMWlaWEo5SUhoY2JpQWdJQ0FnS2lCQWNHRnlZVzBnZTA1MWJXSmxjbjBnZVZ4dUlDQWdJQ0FxSUVCeVpYUjFjbTV6SUh0MWJtUmxabWx1WldSOVhHNGdJQ0FnSUNvdlhHNGdJQ0FnWm5WdVkzUnBiMjRnYzIxdmIzUm9VMk55YjJ4c0tHVnNMQ0I0TENCNUtTQjdYRzRnSUNBZ0lDQjJZWElnYzJOeWIyeHNZV0pzWlR0Y2JpQWdJQ0FnSUhaaGNpQnpkR0Z5ZEZnN1hHNGdJQ0FnSUNCMllYSWdjM1JoY25SWk8xeHVJQ0FnSUNBZ2RtRnlJRzFsZEdodlpEdGNiaUFnSUNBZ0lIWmhjaUJ6ZEdGeWRGUnBiV1VnUFNCdWIzY29LVHRjYmx4dUlDQWdJQ0FnTHk4Z1pHVm1hVzVsSUhOamNtOXNiQ0JqYjI1MFpYaDBYRzRnSUNBZ0lDQnBaaUFvWld3Z1BUMDlJR1F1WW05a2VTa2dlMXh1SUNBZ0lDQWdJQ0J6WTNKdmJHeGhZbXhsSUQwZ2R6dGNiaUFnSUNBZ0lDQWdjM1JoY25SWUlEMGdkeTV6WTNKdmJHeFlJSHg4SUhjdWNHRm5aVmhQWm1aelpYUTdYRzRnSUNBZ0lDQWdJSE4wWVhKMFdTQTlJSGN1YzJOeWIyeHNXU0I4ZkNCM0xuQmhaMlZaVDJabWMyVjBPMXh1SUNBZ0lDQWdJQ0J0WlhSb2IyUWdQU0J2Y21sbmFXNWhiQzV6WTNKdmJHdzdYRzRnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQnpZM0p2Ykd4aFlteGxJRDBnWld3N1hHNGdJQ0FnSUNBZ0lITjBZWEowV0NBOUlHVnNMbk5qY205c2JFeGxablE3WEc0Z0lDQWdJQ0FnSUhOMFlYSjBXU0E5SUdWc0xuTmpjbTlzYkZSdmNEdGNiaUFnSUNBZ0lDQWdiV1YwYUc5a0lEMGdjMk55YjJ4c1JXeGxiV1Z1ZER0Y2JpQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0x5OGdjMk55YjJ4c0lHeHZiM0JwYm1jZ2IzWmxjaUJoSUdaeVlXMWxYRzRnSUNBZ0lDQnpkR1Z3S0h0Y2JpQWdJQ0FnSUNBZ2MyTnliMnhzWVdKc1pUb2djMk55YjJ4c1lXSnNaU3hjYmlBZ0lDQWdJQ0FnYldWMGFHOWtPaUJ0WlhSb2IyUXNYRzRnSUNBZ0lDQWdJSE4wWVhKMFZHbHRaVG9nYzNSaGNuUlVhVzFsTEZ4dUlDQWdJQ0FnSUNCemRHRnlkRmc2SUhOMFlYSjBXQ3hjYmlBZ0lDQWdJQ0FnYzNSaGNuUlpPaUJ6ZEdGeWRGa3NYRzRnSUNBZ0lDQWdJSGc2SUhnc1hHNGdJQ0FnSUNBZ0lIazZJSGxjYmlBZ0lDQWdJSDBwTzF4dUlDQWdJSDFjYmx4dUlDQWdJQzh2SUU5U1NVZEpUa0ZNSUUxRlZFaFBSRk1nVDFaRlVsSkpSRVZUWEc0Z0lDQWdMeThnZHk1elkzSnZiR3dnWVc1a0lIY3VjMk55YjJ4c1ZHOWNiaUFnSUNCM0xuTmpjbTlzYkNBOUlIY3VjMk55YjJ4c1ZHOGdQU0JtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0FnSUM4dklHRjJiMmxrSUdGamRHbHZiaUIzYUdWdUlHNXZJR0Z5WjNWdFpXNTBjeUJoY21VZ2NHRnpjMlZrWEc0Z0lDQWdJQ0JwWmlBb1lYSm5kVzFsYm5Seld6QmRJRDA5UFNCMWJtUmxabWx1WldRcElIdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdU8xeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQXZMeUJoZG05cFpDQnpiVzl2ZEdnZ1ltVm9ZWFpwYjNJZ2FXWWdibTkwSUhKbGNYVnBjbVZrWEc0Z0lDQWdJQ0JwWmlBb2MyaHZkV3hrUW1GcGJFOTFkQ2hoY21kMWJXVnVkSE5iTUYwcElEMDlQU0IwY25WbEtTQjdYRzRnSUNBZ0lDQWdJRzl5YVdkcGJtRnNMbk5qY205c2JDNWpZV3hzS0Z4dUlDQWdJQ0FnSUNBZ0lIY3NYRzRnSUNBZ0lDQWdJQ0FnWVhKbmRXMWxiblJ6V3pCZExteGxablFnSVQwOUlIVnVaR1ZtYVc1bFpGeHVJQ0FnSUNBZ0lDQWdJQ0FnUHlCaGNtZDFiV1Z1ZEhOYk1GMHViR1ZtZEZ4dUlDQWdJQ0FnSUNBZ0lDQWdPaUIwZVhCbGIyWWdZWEpuZFcxbGJuUnpXekJkSUNFOVBTQW5iMkpxWldOMEoxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBL0lHRnlaM1Z0Wlc1MGMxc3dYVnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQTZJSGN1YzJOeWIyeHNXQ0I4ZkNCM0xuQmhaMlZZVDJabWMyVjBMRnh1SUNBZ0lDQWdJQ0FnSUM4dklIVnpaU0IwYjNBZ2NISnZjQ3dnYzJWamIyNWtJR0Z5WjNWdFpXNTBJR2xtSUhCeVpYTmxiblFnYjNJZ1ptRnNiR0poWTJzZ2RHOGdjMk55YjJ4c1dWeHVJQ0FnSUNBZ0lDQWdJR0Z5WjNWdFpXNTBjMXN3WFM1MGIzQWdJVDA5SUhWdVpHVm1hVzVsWkZ4dUlDQWdJQ0FnSUNBZ0lDQWdQeUJoY21kMWJXVnVkSE5iTUYwdWRHOXdYRzRnSUNBZ0lDQWdJQ0FnSUNBNklHRnlaM1Z0Wlc1MGMxc3hYU0FoUFQwZ2RXNWtaV1pwYm1Wa1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUQ4Z1lYSm5kVzFsYm5Seld6RmRYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lEb2dkeTV6WTNKdmJHeFpJSHg4SUhjdWNHRm5aVmxQWm1aelpYUmNiaUFnSUNBZ0lDQWdLVHRjYmx4dUlDQWdJQ0FnSUNCeVpYUjFjbTQ3WEc0Z0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUM4dklFeEZWQ0JVU0VVZ1UwMVBUMVJJVGtWVFV5QkNSVWRKVGlGY2JpQWdJQ0FnSUhOdGIyOTBhRk5qY205c2JDNWpZV3hzS0Z4dUlDQWdJQ0FnSUNCM0xGeHVJQ0FnSUNBZ0lDQmtMbUp2Wkhrc1hHNGdJQ0FnSUNBZ0lHRnlaM1Z0Wlc1MGMxc3dYUzVzWldaMElDRTlQU0IxYm1SbFptbHVaV1JjYmlBZ0lDQWdJQ0FnSUNBL0lINStZWEpuZFcxbGJuUnpXekJkTG14bFpuUmNiaUFnSUNBZ0lDQWdJQ0E2SUhjdWMyTnliMnhzV0NCOGZDQjNMbkJoWjJWWVQyWm1jMlYwTEZ4dUlDQWdJQ0FnSUNCaGNtZDFiV1Z1ZEhOYk1GMHVkRzl3SUNFOVBTQjFibVJsWm1sdVpXUmNiaUFnSUNBZ0lDQWdJQ0EvSUg1K1lYSm5kVzFsYm5Seld6QmRMblJ2Y0Z4dUlDQWdJQ0FnSUNBZ0lEb2dkeTV6WTNKdmJHeFpJSHg4SUhjdWNHRm5aVmxQWm1aelpYUmNiaUFnSUNBZ0lDazdYRzRnSUNBZ2ZUdGNibHh1SUNBZ0lDOHZJSGN1YzJOeWIyeHNRbmxjYmlBZ0lDQjNMbk5qY205c2JFSjVJRDBnWm5WdVkzUnBiMjRvS1NCN1hHNGdJQ0FnSUNBdkx5QmhkbTlwWkNCaFkzUnBiMjRnZDJobGJpQnVieUJoY21kMWJXVnVkSE1nWVhKbElIQmhjM05sWkZ4dUlDQWdJQ0FnYVdZZ0tHRnlaM1Z0Wlc1MGMxc3dYU0E5UFQwZ2RXNWtaV1pwYm1Wa0tTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJqdGNiaUFnSUNBZ0lIMWNibHh1SUNBZ0lDQWdMeThnWVhadmFXUWdjMjF2YjNSb0lHSmxhR0YyYVc5eUlHbG1JRzV2ZENCeVpYRjFhWEpsWkZ4dUlDQWdJQ0FnYVdZZ0tITm9iM1ZzWkVKaGFXeFBkWFFvWVhKbmRXMWxiblJ6V3pCZEtTa2dlMXh1SUNBZ0lDQWdJQ0J2Y21sbmFXNWhiQzV6WTNKdmJHeENlUzVqWVd4c0tGeHVJQ0FnSUNBZ0lDQWdJSGNzWEc0Z0lDQWdJQ0FnSUNBZ1lYSm5kVzFsYm5Seld6QmRMbXhsWm5RZ0lUMDlJSFZ1WkdWbWFXNWxaRnh1SUNBZ0lDQWdJQ0FnSUNBZ1B5QmhjbWQxYldWdWRITmJNRjB1YkdWbWRGeHVJQ0FnSUNBZ0lDQWdJQ0FnT2lCMGVYQmxiMllnWVhKbmRXMWxiblJ6V3pCZElDRTlQU0FuYjJKcVpXTjBKeUEvSUdGeVozVnRaVzUwYzFzd1hTQTZJREFzWEc0Z0lDQWdJQ0FnSUNBZ1lYSm5kVzFsYm5Seld6QmRMblJ2Y0NBaFBUMGdkVzVrWldacGJtVmtYRzRnSUNBZ0lDQWdJQ0FnSUNBL0lHRnlaM1Z0Wlc1MGMxc3dYUzUwYjNCY2JpQWdJQ0FnSUNBZ0lDQWdJRG9nWVhKbmRXMWxiblJ6V3pGZElDRTlQU0IxYm1SbFptbHVaV1FnUHlCaGNtZDFiV1Z1ZEhOYk1WMGdPaUF3WEc0Z0lDQWdJQ0FnSUNrN1hHNWNiaUFnSUNBZ0lDQWdjbVYwZFhKdU8xeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQXZMeUJNUlZRZ1ZFaEZJRk5OVDA5VVNFNUZVMU1nUWtWSFNVNGhYRzRnSUNBZ0lDQnpiVzl2ZEdoVFkzSnZiR3d1WTJGc2JDaGNiaUFnSUNBZ0lDQWdkeXhjYmlBZ0lDQWdJQ0FnWkM1aWIyUjVMRnh1SUNBZ0lDQWdJQ0IrZm1GeVozVnRaVzUwYzFzd1hTNXNaV1owSUNzZ0tIY3VjMk55YjJ4c1dDQjhmQ0IzTG5CaFoyVllUMlptYzJWMEtTeGNiaUFnSUNBZ0lDQWdmbjVoY21kMWJXVnVkSE5iTUYwdWRHOXdJQ3NnS0hjdWMyTnliMnhzV1NCOGZDQjNMbkJoWjJWWlQyWm1jMlYwS1Z4dUlDQWdJQ0FnS1R0Y2JpQWdJQ0I5TzF4dVhHNGdJQ0FnTHk4Z1JXeGxiV1Z1ZEM1d2NtOTBiM1I1Y0dVdWMyTnliMnhzSUdGdVpDQkZiR1Z0Wlc1MExuQnliM1J2ZEhsd1pTNXpZM0p2Ykd4VWIxeHVJQ0FnSUVWc1pXMWxiblF1Y0hKdmRHOTBlWEJsTG5OamNtOXNiQ0E5SUVWc1pXMWxiblF1Y0hKdmRHOTBlWEJsTG5OamNtOXNiRlJ2SUQwZ1puVnVZM1JwYjI0b0tTQjdYRzRnSUNBZ0lDQXZMeUJoZG05cFpDQmhZM1JwYjI0Z2QyaGxiaUJ1YnlCaGNtZDFiV1Z1ZEhNZ1lYSmxJSEJoYzNObFpGeHVJQ0FnSUNBZ2FXWWdLR0Z5WjNWdFpXNTBjMXN3WFNBOVBUMGdkVzVrWldacGJtVmtLU0I3WEc0Z0lDQWdJQ0FnSUhKbGRIVnlianRjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnTHk4Z1lYWnZhV1FnYzIxdmIzUm9JR0psYUdGMmFXOXlJR2xtSUc1dmRDQnlaWEYxYVhKbFpGeHVJQ0FnSUNBZ2FXWWdLSE5vYjNWc1pFSmhhV3hQZFhRb1lYSm5kVzFsYm5Seld6QmRLU0E5UFQwZ2RISjFaU2tnZTF4dUlDQWdJQ0FnSUNBdkx5QnBaaUJ2Ym1VZ2JuVnRZbVZ5SUdseklIQmhjM05sWkN3Z2RHaHliM2NnWlhKeWIzSWdkRzhnYldGMFkyZ2dSbWx5WldadmVDQnBiWEJzWlcxbGJuUmhkR2x2Ymx4dUlDQWdJQ0FnSUNCcFppQW9kSGx3Wlc5bUlHRnlaM1Z0Wlc1MGMxc3dYU0E5UFQwZ0oyNTFiV0psY2ljZ0ppWWdZWEpuZFcxbGJuUnpXekZkSUQwOVBTQjFibVJsWm1sdVpXUXBJSHRjYmlBZ0lDQWdJQ0FnSUNCMGFISnZkeUJ1WlhjZ1UzbHVkR0Y0UlhKeWIzSW9KMVpoYkhWbElHTnZkV3hrSUc1dmRDQmlaU0JqYjI1MlpYSjBaV1FuS1R0Y2JpQWdJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQWdJRzl5YVdkcGJtRnNMbVZzWlcxbGJuUlRZM0p2Ykd3dVkyRnNiQ2hjYmlBZ0lDQWdJQ0FnSUNCMGFHbHpMRnh1SUNBZ0lDQWdJQ0FnSUM4dklIVnpaU0JzWldaMElIQnliM0FzSUdacGNuTjBJRzUxYldKbGNpQmhjbWQxYldWdWRDQnZjaUJtWVd4c1ltRmpheUIwYnlCelkzSnZiR3hNWldaMFhHNGdJQ0FnSUNBZ0lDQWdZWEpuZFcxbGJuUnpXekJkTG14bFpuUWdJVDA5SUhWdVpHVm1hVzVsWkZ4dUlDQWdJQ0FnSUNBZ0lDQWdQeUIrZm1GeVozVnRaVzUwYzFzd1hTNXNaV1owWEc0Z0lDQWdJQ0FnSUNBZ0lDQTZJSFI1Y0dWdlppQmhjbWQxYldWdWRITmJNRjBnSVQwOUlDZHZZbXBsWTNRbklEOGdmbjVoY21kMWJXVnVkSE5iTUYwZ09pQjBhR2x6TG5OamNtOXNiRXhsWm5Rc1hHNGdJQ0FnSUNBZ0lDQWdMeThnZFhObElIUnZjQ0J3Y205d0xDQnpaV052Ym1RZ1lYSm5kVzFsYm5RZ2IzSWdabUZzYkdKaFkyc2dkRzhnYzJOeWIyeHNWRzl3WEc0Z0lDQWdJQ0FnSUNBZ1lYSm5kVzFsYm5Seld6QmRMblJ2Y0NBaFBUMGdkVzVrWldacGJtVmtYRzRnSUNBZ0lDQWdJQ0FnSUNBL0lINStZWEpuZFcxbGJuUnpXekJkTG5SdmNGeHVJQ0FnSUNBZ0lDQWdJQ0FnT2lCaGNtZDFiV1Z1ZEhOYk1WMGdJVDA5SUhWdVpHVm1hVzVsWkNBL0lINStZWEpuZFcxbGJuUnpXekZkSURvZ2RHaHBjeTV6WTNKdmJHeFViM0JjYmlBZ0lDQWdJQ0FnS1R0Y2JseHVJQ0FnSUNBZ0lDQnlaWFIxY200N1hHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lIWmhjaUJzWldaMElEMGdZWEpuZFcxbGJuUnpXekJkTG14bFpuUTdYRzRnSUNBZ0lDQjJZWElnZEc5d0lEMGdZWEpuZFcxbGJuUnpXekJkTG5SdmNEdGNibHh1SUNBZ0lDQWdMeThnVEVWVUlGUklSU0JUVFU5UFZFaE9SVk5USUVKRlIwbE9JVnh1SUNBZ0lDQWdjMjF2YjNSb1UyTnliMnhzTG1OaGJHd29YRzRnSUNBZ0lDQWdJSFJvYVhNc1hHNGdJQ0FnSUNBZ0lIUm9hWE1zWEc0Z0lDQWdJQ0FnSUhSNWNHVnZaaUJzWldaMElEMDlQU0FuZFc1a1pXWnBibVZrSnlBL0lIUm9hWE11YzJOeWIyeHNUR1ZtZENBNklINStiR1ZtZEN4Y2JpQWdJQ0FnSUNBZ2RIbHdaVzltSUhSdmNDQTlQVDBnSjNWdVpHVm1hVzVsWkNjZ1B5QjBhR2x6TG5OamNtOXNiRlJ2Y0NBNklINStkRzl3WEc0Z0lDQWdJQ0FwTzF4dUlDQWdJSDA3WEc1Y2JpQWdJQ0F2THlCRmJHVnRaVzUwTG5CeWIzUnZkSGx3WlM1elkzSnZiR3hDZVZ4dUlDQWdJRVZzWlcxbGJuUXVjSEp2ZEc5MGVYQmxMbk5qY205c2JFSjVJRDBnWm5WdVkzUnBiMjRvS1NCN1hHNGdJQ0FnSUNBdkx5QmhkbTlwWkNCaFkzUnBiMjRnZDJobGJpQnVieUJoY21kMWJXVnVkSE1nWVhKbElIQmhjM05sWkZ4dUlDQWdJQ0FnYVdZZ0tHRnlaM1Z0Wlc1MGMxc3dYU0E5UFQwZ2RXNWtaV1pwYm1Wa0tTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJqdGNiaUFnSUNBZ0lIMWNibHh1SUNBZ0lDQWdMeThnWVhadmFXUWdjMjF2YjNSb0lHSmxhR0YyYVc5eUlHbG1JRzV2ZENCeVpYRjFhWEpsWkZ4dUlDQWdJQ0FnYVdZZ0tITm9iM1ZzWkVKaGFXeFBkWFFvWVhKbmRXMWxiblJ6V3pCZEtTQTlQVDBnZEhKMVpTa2dlMXh1SUNBZ0lDQWdJQ0J2Y21sbmFXNWhiQzVsYkdWdFpXNTBVMk55YjJ4c0xtTmhiR3dvWEc0Z0lDQWdJQ0FnSUNBZ2RHaHBjeXhjYmlBZ0lDQWdJQ0FnSUNCaGNtZDFiV1Z1ZEhOYk1GMHViR1ZtZENBaFBUMGdkVzVrWldacGJtVmtYRzRnSUNBZ0lDQWdJQ0FnSUNBL0lINStZWEpuZFcxbGJuUnpXekJkTG14bFpuUWdLeUIwYUdsekxuTmpjbTlzYkV4bFpuUmNiaUFnSUNBZ0lDQWdJQ0FnSURvZ2ZuNWhjbWQxYldWdWRITmJNRjBnS3lCMGFHbHpMbk5qY205c2JFeGxablFzWEc0Z0lDQWdJQ0FnSUNBZ1lYSm5kVzFsYm5Seld6QmRMblJ2Y0NBaFBUMGdkVzVrWldacGJtVmtYRzRnSUNBZ0lDQWdJQ0FnSUNBL0lINStZWEpuZFcxbGJuUnpXekJkTG5SdmNDQXJJSFJvYVhNdWMyTnliMnhzVkc5d1hHNGdJQ0FnSUNBZ0lDQWdJQ0E2SUg1K1lYSm5kVzFsYm5Seld6RmRJQ3NnZEdocGN5NXpZM0p2Ykd4VWIzQmNiaUFnSUNBZ0lDQWdLVHRjYmx4dUlDQWdJQ0FnSUNCeVpYUjFjbTQ3WEc0Z0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUhSb2FYTXVjMk55YjJ4c0tIdGNiaUFnSUNBZ0lDQWdiR1ZtZERvZ2ZuNWhjbWQxYldWdWRITmJNRjB1YkdWbWRDQXJJSFJvYVhNdWMyTnliMnhzVEdWbWRDeGNiaUFnSUNBZ0lDQWdkRzl3T2lCK2ZtRnlaM1Z0Wlc1MGMxc3dYUzUwYjNBZ0t5QjBhR2x6TG5OamNtOXNiRlJ2Y0N4Y2JpQWdJQ0FnSUNBZ1ltVm9ZWFpwYjNJNklHRnlaM1Z0Wlc1MGMxc3dYUzVpWldoaGRtbHZjbHh1SUNBZ0lDQWdmU2s3WEc0Z0lDQWdmVHRjYmx4dUlDQWdJQzh2SUVWc1pXMWxiblF1Y0hKdmRHOTBlWEJsTG5OamNtOXNiRWx1ZEc5V2FXVjNYRzRnSUNBZ1JXeGxiV1Z1ZEM1d2NtOTBiM1I1Y0dVdWMyTnliMnhzU1c1MGIxWnBaWGNnUFNCbWRXNWpkR2x2YmlncElIdGNiaUFnSUNBZ0lDOHZJR0YyYjJsa0lITnRiMjkwYUNCaVpXaGhkbWx2Y2lCcFppQnViM1FnY21WeGRXbHlaV1JjYmlBZ0lDQWdJR2xtSUNoemFHOTFiR1JDWVdsc1QzVjBLR0Z5WjNWdFpXNTBjMXN3WFNrZ1BUMDlJSFJ5ZFdVcElIdGNiaUFnSUNBZ0lDQWdiM0pwWjJsdVlXd3VjMk55YjJ4c1NXNTBiMVpwWlhjdVkyRnNiQ2hjYmlBZ0lDQWdJQ0FnSUNCMGFHbHpMRnh1SUNBZ0lDQWdJQ0FnSUdGeVozVnRaVzUwYzFzd1hTQTlQVDBnZFc1a1pXWnBibVZrSUQ4Z2RISjFaU0E2SUdGeVozVnRaVzUwYzFzd1hWeHVJQ0FnSUNBZ0lDQXBPMXh1WEc0Z0lDQWdJQ0FnSUhKbGRIVnlianRjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnTHk4Z1RFVlVJRlJJUlNCVFRVOVBWRWhPUlZOVElFSkZSMGxPSVZ4dUlDQWdJQ0FnZG1GeUlITmpjbTlzYkdGaWJHVlFZWEpsYm5RZ1BTQm1hVzVrVTJOeWIyeHNZV0pzWlZCaGNtVnVkQ2gwYUdsektUdGNiaUFnSUNBZ0lIWmhjaUJ3WVhKbGJuUlNaV04wY3lBOUlITmpjbTlzYkdGaWJHVlFZWEpsYm5RdVoyVjBRbTkxYm1ScGJtZERiR2xsYm5SU1pXTjBLQ2s3WEc0Z0lDQWdJQ0IyWVhJZ1kyeHBaVzUwVW1WamRITWdQU0IwYUdsekxtZGxkRUp2ZFc1a2FXNW5RMnhwWlc1MFVtVmpkQ2dwTzF4dVhHNGdJQ0FnSUNCcFppQW9jMk55YjJ4c1lXSnNaVkJoY21WdWRDQWhQVDBnWkM1aWIyUjVLU0I3WEc0Z0lDQWdJQ0FnSUM4dklISmxkbVZoYkNCbGJHVnRaVzUwSUdsdWMybGtaU0J3WVhKbGJuUmNiaUFnSUNBZ0lDQWdjMjF2YjNSb1UyTnliMnhzTG1OaGJHd29YRzRnSUNBZ0lDQWdJQ0FnZEdocGN5eGNiaUFnSUNBZ0lDQWdJQ0J6WTNKdmJHeGhZbXhsVUdGeVpXNTBMRnh1SUNBZ0lDQWdJQ0FnSUhOamNtOXNiR0ZpYkdWUVlYSmxiblF1YzJOeWIyeHNUR1ZtZENBcklHTnNhV1Z1ZEZKbFkzUnpMbXhsWm5RZ0xTQndZWEpsYm5SU1pXTjBjeTVzWldaMExGeHVJQ0FnSUNBZ0lDQWdJSE5qY205c2JHRmliR1ZRWVhKbGJuUXVjMk55YjJ4c1ZHOXdJQ3NnWTJ4cFpXNTBVbVZqZEhNdWRHOXdJQzBnY0dGeVpXNTBVbVZqZEhNdWRHOXdYRzRnSUNBZ0lDQWdJQ2s3WEc1Y2JpQWdJQ0FnSUNBZ0x5OGdjbVYyWldGc0lIQmhjbVZ1ZENCcGJpQjJhV1YzY0c5eWRDQjFibXhsYzNNZ2FYTWdabWw0WldSY2JpQWdJQ0FnSUNBZ2FXWWdLSGN1WjJWMFEyOXRjSFYwWldSVGRIbHNaU2h6WTNKdmJHeGhZbXhsVUdGeVpXNTBLUzV3YjNOcGRHbHZiaUFoUFQwZ0oyWnBlR1ZrSnlrZ2UxeHVJQ0FnSUNBZ0lDQWdJSGN1YzJOeWIyeHNRbmtvZTF4dUlDQWdJQ0FnSUNBZ0lDQWdiR1ZtZERvZ2NHRnlaVzUwVW1WamRITXViR1ZtZEN4Y2JpQWdJQ0FnSUNBZ0lDQWdJSFJ2Y0RvZ2NHRnlaVzUwVW1WamRITXVkRzl3TEZ4dUlDQWdJQ0FnSUNBZ0lDQWdZbVZvWVhacGIzSTZJQ2R6Ylc5dmRHZ25YRzRnSUNBZ0lDQWdJQ0FnZlNrN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNBZ0lDOHZJSEpsZG1WaGJDQmxiR1Z0Wlc1MElHbHVJSFpwWlhkd2IzSjBYRzRnSUNBZ0lDQWdJSGN1YzJOeWIyeHNRbmtvZTF4dUlDQWdJQ0FnSUNBZ0lHeGxablE2SUdOc2FXVnVkRkpsWTNSekxteGxablFzWEc0Z0lDQWdJQ0FnSUNBZ2RHOXdPaUJqYkdsbGJuUlNaV04wY3k1MGIzQXNYRzRnSUNBZ0lDQWdJQ0FnWW1Wb1lYWnBiM0k2SUNkemJXOXZkR2duWEc0Z0lDQWdJQ0FnSUgwcE8xeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUgwN1hHNGdJSDFjYmx4dUlDQnBaaUFvZEhsd1pXOW1JR1Y0Y0c5eWRITWdQVDA5SUNkdlltcGxZM1FuSUNZbUlIUjVjR1Z2WmlCdGIyUjFiR1VnSVQwOUlDZDFibVJsWm1sdVpXUW5LU0I3WEc0Z0lDQWdMeThnWTI5dGJXOXVhbk5jYmlBZ0lDQnRiMlIxYkdVdVpYaHdiM0owY3lBOUlIc2djRzlzZVdacGJHdzZJSEJ2YkhsbWFXeHNJSDA3WEc0Z0lIMGdaV3h6WlNCN1hHNGdJQ0FnTHk4Z1oyeHZZbUZzWEc0Z0lDQWdjRzlzZVdacGJHd29LVHRjYmlBZ2ZWeHVYRzU5S0NrcE8xeHVJaXdpS0daMWJtTjBhVzl1S0hObGJHWXBJSHRjYmlBZ0ozVnpaU0J6ZEhKcFkzUW5PMXh1WEc0Z0lHbG1JQ2h6Wld4bUxtWmxkR05vS1NCN1hHNGdJQ0FnY21WMGRYSnVYRzRnSUgxY2JseHVJQ0IyWVhJZ2MzVndjRzl5ZENBOUlIdGNiaUFnSUNCelpXRnlZMmhRWVhKaGJYTTZJQ2RWVWt4VFpXRnlZMmhRWVhKaGJYTW5JR2x1SUhObGJHWXNYRzRnSUNBZ2FYUmxjbUZpYkdVNklDZFRlVzFpYjJ3bklHbHVJSE5sYkdZZ0ppWWdKMmwwWlhKaGRHOXlKeUJwYmlCVGVXMWliMndzWEc0Z0lDQWdZbXh2WWpvZ0owWnBiR1ZTWldGa1pYSW5JR2x1SUhObGJHWWdKaVlnSjBKc2IySW5JR2x1SUhObGJHWWdKaVlnS0daMWJtTjBhVzl1S0NrZ2UxeHVJQ0FnSUNBZ2RISjVJSHRjYmlBZ0lDQWdJQ0FnYm1WM0lFSnNiMklvS1Z4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnZEhKMVpWeHVJQ0FnSUNBZ2ZTQmpZWFJqYUNobEtTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQm1ZV3h6WlZ4dUlDQWdJQ0FnZlZ4dUlDQWdJSDBwS0Nrc1hHNGdJQ0FnWm05eWJVUmhkR0U2SUNkR2IzSnRSR0YwWVNjZ2FXNGdjMlZzWml4Y2JpQWdJQ0JoY25KaGVVSjFabVpsY2pvZ0owRnljbUY1UW5WbVptVnlKeUJwYmlCelpXeG1YRzRnSUgxY2JseHVJQ0JwWmlBb2MzVndjRzl5ZEM1aGNuSmhlVUoxWm1abGNpa2dlMXh1SUNBZ0lIWmhjaUIyYVdWM1EyeGhjM05sY3lBOUlGdGNiaUFnSUNBZ0lDZGJiMkpxWldOMElFbHVkRGhCY25KaGVWMG5MRnh1SUNBZ0lDQWdKMXR2WW1wbFkzUWdWV2x1ZERoQmNuSmhlVjBuTEZ4dUlDQWdJQ0FnSjF0dlltcGxZM1FnVldsdWREaERiR0Z0Y0dWa1FYSnlZWGxkSnl4Y2JpQWdJQ0FnSUNkYmIySnFaV04wSUVsdWRERTJRWEp5WVhsZEp5eGNiaUFnSUNBZ0lDZGJiMkpxWldOMElGVnBiblF4TmtGeWNtRjVYU2NzWEc0Z0lDQWdJQ0FuVzI5aWFtVmpkQ0JKYm5Rek1rRnljbUY1WFNjc1hHNGdJQ0FnSUNBblcyOWlhbVZqZENCVmFXNTBNekpCY25KaGVWMG5MRnh1SUNBZ0lDQWdKMXR2WW1wbFkzUWdSbXh2WVhRek1rRnljbUY1WFNjc1hHNGdJQ0FnSUNBblcyOWlhbVZqZENCR2JHOWhkRFkwUVhKeVlYbGRKMXh1SUNBZ0lGMWNibHh1SUNBZ0lIWmhjaUJwYzBSaGRHRldhV1YzSUQwZ1puVnVZM1JwYjI0b2IySnFLU0I3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdiMkpxSUNZbUlFUmhkR0ZXYVdWM0xuQnliM1J2ZEhsd1pTNXBjMUJ5YjNSdmRIbHdaVTltS0c5aWFpbGNiaUFnSUNCOVhHNWNiaUFnSUNCMllYSWdhWE5CY25KaGVVSjFabVpsY2xacFpYY2dQU0JCY25KaGVVSjFabVpsY2k1cGMxWnBaWGNnZkh3Z1puVnVZM1JwYjI0b2IySnFLU0I3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdiMkpxSUNZbUlIWnBaWGREYkdGemMyVnpMbWx1WkdWNFQyWW9UMkpxWldOMExuQnliM1J2ZEhsd1pTNTBiMU4wY21sdVp5NWpZV3hzS0c5aWFpa3BJRDRnTFRGY2JpQWdJQ0I5WEc0Z0lIMWNibHh1SUNCbWRXNWpkR2x2YmlCdWIzSnRZV3hwZW1WT1lXMWxLRzVoYldVcElIdGNiaUFnSUNCcFppQW9kSGx3Wlc5bUlHNWhiV1VnSVQwOUlDZHpkSEpwYm1jbktTQjdYRzRnSUNBZ0lDQnVZVzFsSUQwZ1UzUnlhVzVuS0c1aGJXVXBYRzRnSUNBZ2ZWeHVJQ0FnSUdsbUlDZ3ZXMTVoTFhvd0xUbGNYQzBqSkNVbUp5b3JMbHhjWGw5Z2ZINWRMMmt1ZEdWemRDaHVZVzFsS1NrZ2UxeHVJQ0FnSUNBZ2RHaHliM2NnYm1WM0lGUjVjR1ZGY25KdmNpZ25TVzUyWVd4cFpDQmphR0Z5WVdOMFpYSWdhVzRnYUdWaFpHVnlJR1pwWld4a0lHNWhiV1VuS1Z4dUlDQWdJSDFjYmlBZ0lDQnlaWFIxY200Z2JtRnRaUzUwYjB4dmQyVnlRMkZ6WlNncFhHNGdJSDFjYmx4dUlDQm1kVzVqZEdsdmJpQnViM0p0WVd4cGVtVldZV3gxWlNoMllXeDFaU2tnZTF4dUlDQWdJR2xtSUNoMGVYQmxiMllnZG1Gc2RXVWdJVDA5SUNkemRISnBibWNuS1NCN1hHNGdJQ0FnSUNCMllXeDFaU0E5SUZOMGNtbHVaeWgyWVd4MVpTbGNiaUFnSUNCOVhHNGdJQ0FnY21WMGRYSnVJSFpoYkhWbFhHNGdJSDFjYmx4dUlDQXZMeUJDZFdsc1pDQmhJR1JsYzNSeWRXTjBhWFpsSUdsMFpYSmhkRzl5SUdadmNpQjBhR1VnZG1Gc2RXVWdiR2x6ZEZ4dUlDQm1kVzVqZEdsdmJpQnBkR1Z5WVhSdmNrWnZjaWhwZEdWdGN5a2dlMXh1SUNBZ0lIWmhjaUJwZEdWeVlYUnZjaUE5SUh0Y2JpQWdJQ0FnSUc1bGVIUTZJR1oxYm1OMGFXOXVLQ2tnZTF4dUlDQWdJQ0FnSUNCMllYSWdkbUZzZFdVZ1BTQnBkR1Z0Y3k1emFHbG1kQ2dwWEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUI3Wkc5dVpUb2dkbUZzZFdVZ1BUMDlJSFZ1WkdWbWFXNWxaQ3dnZG1Gc2RXVTZJSFpoYkhWbGZWeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUgxY2JseHVJQ0FnSUdsbUlDaHpkWEJ3YjNKMExtbDBaWEpoWW14bEtTQjdYRzRnSUNBZ0lDQnBkR1Z5WVhSdmNsdFRlVzFpYjJ3dWFYUmxjbUYwYjNKZElEMGdablZ1WTNScGIyNG9LU0I3WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJwZEdWeVlYUnZjbHh1SUNBZ0lDQWdmVnh1SUNBZ0lIMWNibHh1SUNBZ0lISmxkSFZ5YmlCcGRHVnlZWFJ2Y2x4dUlDQjlYRzVjYmlBZ1puVnVZM1JwYjI0Z1NHVmhaR1Z5Y3lob1pXRmtaWEp6S1NCN1hHNGdJQ0FnZEdocGN5NXRZWEFnUFNCN2ZWeHVYRzRnSUNBZ2FXWWdLR2hsWVdSbGNuTWdhVzV6ZEdGdVkyVnZaaUJJWldGa1pYSnpLU0I3WEc0Z0lDQWdJQ0JvWldGa1pYSnpMbVp2Y2tWaFkyZ29ablZ1WTNScGIyNG9kbUZzZFdVc0lHNWhiV1VwSUh0Y2JpQWdJQ0FnSUNBZ2RHaHBjeTVoY0hCbGJtUW9ibUZ0WlN3Z2RtRnNkV1VwWEc0Z0lDQWdJQ0I5TENCMGFHbHpLVnh1SUNBZ0lIMGdaV3h6WlNCcFppQW9RWEp5WVhrdWFYTkJjbkpoZVNob1pXRmtaWEp6S1NrZ2UxeHVJQ0FnSUNBZ2FHVmhaR1Z5Y3k1bWIzSkZZV05vS0daMWJtTjBhVzl1S0dobFlXUmxjaWtnZTF4dUlDQWdJQ0FnSUNCMGFHbHpMbUZ3Y0dWdVpDaG9aV0ZrWlhKYk1GMHNJR2hsWVdSbGNsc3hYU2xjYmlBZ0lDQWdJSDBzSUhSb2FYTXBYRzRnSUNBZ2ZTQmxiSE5sSUdsbUlDaG9aV0ZrWlhKektTQjdYRzRnSUNBZ0lDQlBZbXBsWTNRdVoyVjBUM2R1VUhKdmNHVnlkSGxPWVcxbGN5aG9aV0ZrWlhKektTNW1iM0pGWVdOb0tHWjFibU4wYVc5dUtHNWhiV1VwSUh0Y2JpQWdJQ0FnSUNBZ2RHaHBjeTVoY0hCbGJtUW9ibUZ0WlN3Z2FHVmhaR1Z5YzF0dVlXMWxYU2xjYmlBZ0lDQWdJSDBzSUhSb2FYTXBYRzRnSUNBZ2ZWeHVJQ0I5WEc1Y2JpQWdTR1ZoWkdWeWN5NXdjbTkwYjNSNWNHVXVZWEJ3Wlc1a0lEMGdablZ1WTNScGIyNG9ibUZ0WlN3Z2RtRnNkV1VwSUh0Y2JpQWdJQ0J1WVcxbElEMGdibTl5YldGc2FYcGxUbUZ0WlNodVlXMWxLVnh1SUNBZ0lIWmhiSFZsSUQwZ2JtOXliV0ZzYVhwbFZtRnNkV1VvZG1Gc2RXVXBYRzRnSUNBZ2RtRnlJRzlzWkZaaGJIVmxJRDBnZEdocGN5NXRZWEJiYm1GdFpWMWNiaUFnSUNCMGFHbHpMbTFoY0Z0dVlXMWxYU0E5SUc5c1pGWmhiSFZsSUQ4Z2IyeGtWbUZzZFdVckp5d25LM1poYkhWbElEb2dkbUZzZFdWY2JpQWdmVnh1WEc0Z0lFaGxZV1JsY25NdWNISnZkRzkwZVhCbFd5ZGtaV3hsZEdVblhTQTlJR1oxYm1OMGFXOXVLRzVoYldVcElIdGNiaUFnSUNCa1pXeGxkR1VnZEdocGN5NXRZWEJiYm05eWJXRnNhWHBsVG1GdFpTaHVZVzFsS1YxY2JpQWdmVnh1WEc0Z0lFaGxZV1JsY25NdWNISnZkRzkwZVhCbExtZGxkQ0E5SUdaMWJtTjBhVzl1S0c1aGJXVXBJSHRjYmlBZ0lDQnVZVzFsSUQwZ2JtOXliV0ZzYVhwbFRtRnRaU2h1WVcxbEtWeHVJQ0FnSUhKbGRIVnliaUIwYUdsekxtaGhjeWh1WVcxbEtTQS9JSFJvYVhNdWJXRndXMjVoYldWZElEb2diblZzYkZ4dUlDQjlYRzVjYmlBZ1NHVmhaR1Z5Y3k1d2NtOTBiM1I1Y0dVdWFHRnpJRDBnWm5WdVkzUnBiMjRvYm1GdFpTa2dlMXh1SUNBZ0lISmxkSFZ5YmlCMGFHbHpMbTFoY0M1b1lYTlBkMjVRY205d1pYSjBlU2h1YjNKdFlXeHBlbVZPWVcxbEtHNWhiV1VwS1Z4dUlDQjlYRzVjYmlBZ1NHVmhaR1Z5Y3k1d2NtOTBiM1I1Y0dVdWMyVjBJRDBnWm5WdVkzUnBiMjRvYm1GdFpTd2dkbUZzZFdVcElIdGNiaUFnSUNCMGFHbHpMbTFoY0Z0dWIzSnRZV3hwZW1WT1lXMWxLRzVoYldVcFhTQTlJRzV2Y20xaGJHbDZaVlpoYkhWbEtIWmhiSFZsS1Z4dUlDQjlYRzVjYmlBZ1NHVmhaR1Z5Y3k1d2NtOTBiM1I1Y0dVdVptOXlSV0ZqYUNBOUlHWjFibU4wYVc5dUtHTmhiR3hpWVdOckxDQjBhR2x6UVhKbktTQjdYRzRnSUNBZ1ptOXlJQ2gyWVhJZ2JtRnRaU0JwYmlCMGFHbHpMbTFoY0NrZ2UxeHVJQ0FnSUNBZ2FXWWdLSFJvYVhNdWJXRndMbWhoYzA5M2JsQnliM0JsY25SNUtHNWhiV1VwS1NCN1hHNGdJQ0FnSUNBZ0lHTmhiR3hpWVdOckxtTmhiR3dvZEdocGMwRnlaeXdnZEdocGN5NXRZWEJiYm1GdFpWMHNJRzVoYldVc0lIUm9hWE1wWEc0Z0lDQWdJQ0I5WEc0Z0lDQWdmVnh1SUNCOVhHNWNiaUFnU0dWaFpHVnljeTV3Y205MGIzUjVjR1V1YTJWNWN5QTlJR1oxYm1OMGFXOXVLQ2tnZTF4dUlDQWdJSFpoY2lCcGRHVnRjeUE5SUZ0ZFhHNGdJQ0FnZEdocGN5NW1iM0pGWVdOb0tHWjFibU4wYVc5dUtIWmhiSFZsTENCdVlXMWxLU0I3SUdsMFpXMXpMbkIxYzJnb2JtRnRaU2tnZlNsY2JpQWdJQ0J5WlhSMWNtNGdhWFJsY21GMGIzSkdiM0lvYVhSbGJYTXBYRzRnSUgxY2JseHVJQ0JJWldGa1pYSnpMbkJ5YjNSdmRIbHdaUzUyWVd4MVpYTWdQU0JtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0IyWVhJZ2FYUmxiWE1nUFNCYlhWeHVJQ0FnSUhSb2FYTXVabTl5UldGamFDaG1kVzVqZEdsdmJpaDJZV3gxWlNrZ2V5QnBkR1Z0Y3k1d2RYTm9LSFpoYkhWbEtTQjlLVnh1SUNBZ0lISmxkSFZ5YmlCcGRHVnlZWFJ2Y2tadmNpaHBkR1Z0Y3lsY2JpQWdmVnh1WEc0Z0lFaGxZV1JsY25NdWNISnZkRzkwZVhCbExtVnVkSEpwWlhNZ1BTQm1kVzVqZEdsdmJpZ3BJSHRjYmlBZ0lDQjJZWElnYVhSbGJYTWdQU0JiWFZ4dUlDQWdJSFJvYVhNdVptOXlSV0ZqYUNobWRXNWpkR2x2YmloMllXeDFaU3dnYm1GdFpTa2dleUJwZEdWdGN5NXdkWE5vS0Z0dVlXMWxMQ0IyWVd4MVpWMHBJSDBwWEc0Z0lDQWdjbVYwZFhKdUlHbDBaWEpoZEc5eVJtOXlLR2wwWlcxektWeHVJQ0I5WEc1Y2JpQWdhV1lnS0hOMWNIQnZjblF1YVhSbGNtRmliR1VwSUh0Y2JpQWdJQ0JJWldGa1pYSnpMbkJ5YjNSdmRIbHdaVnRUZVcxaWIyd3VhWFJsY21GMGIzSmRJRDBnU0dWaFpHVnljeTV3Y205MGIzUjVjR1V1Wlc1MGNtbGxjMXh1SUNCOVhHNWNiaUFnWm5WdVkzUnBiMjRnWTI5dWMzVnRaV1FvWW05a2VTa2dlMXh1SUNBZ0lHbG1JQ2hpYjJSNUxtSnZaSGxWYzJWa0tTQjdYRzRnSUNBZ0lDQnlaWFIxY200Z1VISnZiV2x6WlM1eVpXcGxZM1FvYm1WM0lGUjVjR1ZGY25KdmNpZ25RV3h5WldGa2VTQnlaV0ZrSnlrcFhHNGdJQ0FnZlZ4dUlDQWdJR0p2WkhrdVltOWtlVlZ6WldRZ1BTQjBjblZsWEc0Z0lIMWNibHh1SUNCbWRXNWpkR2x2YmlCbWFXeGxVbVZoWkdWeVVtVmhaSGtvY21WaFpHVnlLU0I3WEc0Z0lDQWdjbVYwZFhKdUlHNWxkeUJRY205dGFYTmxLR1oxYm1OMGFXOXVLSEpsYzI5c2RtVXNJSEpsYW1WamRDa2dlMXh1SUNBZ0lDQWdjbVZoWkdWeUxtOXViRzloWkNBOUlHWjFibU4wYVc5dUtDa2dlMXh1SUNBZ0lDQWdJQ0J5WlhOdmJIWmxLSEpsWVdSbGNpNXlaWE4xYkhRcFhHNGdJQ0FnSUNCOVhHNGdJQ0FnSUNCeVpXRmtaWEl1YjI1bGNuSnZjaUE5SUdaMWJtTjBhVzl1S0NrZ2UxeHVJQ0FnSUNBZ0lDQnlaV3BsWTNRb2NtVmhaR1Z5TG1WeWNtOXlLVnh1SUNBZ0lDQWdmVnh1SUNBZ0lIMHBYRzRnSUgxY2JseHVJQ0JtZFc1amRHbHZiaUJ5WldGa1FteHZZa0Z6UVhKeVlYbENkV1ptWlhJb1lteHZZaWtnZTF4dUlDQWdJSFpoY2lCeVpXRmtaWElnUFNCdVpYY2dSbWxzWlZKbFlXUmxjaWdwWEc0Z0lDQWdkbUZ5SUhCeWIyMXBjMlVnUFNCbWFXeGxVbVZoWkdWeVVtVmhaSGtvY21WaFpHVnlLVnh1SUNBZ0lISmxZV1JsY2k1eVpXRmtRWE5CY25KaGVVSjFabVpsY2loaWJHOWlLVnh1SUNBZ0lISmxkSFZ5YmlCd2NtOXRhWE5sWEc0Z0lIMWNibHh1SUNCbWRXNWpkR2x2YmlCeVpXRmtRbXh2WWtGelZHVjRkQ2hpYkc5aUtTQjdYRzRnSUNBZ2RtRnlJSEpsWVdSbGNpQTlJRzVsZHlCR2FXeGxVbVZoWkdWeUtDbGNiaUFnSUNCMllYSWdjSEp2YldselpTQTlJR1pwYkdWU1pXRmtaWEpTWldGa2VTaHlaV0ZrWlhJcFhHNGdJQ0FnY21WaFpHVnlMbkpsWVdSQmMxUmxlSFFvWW14dllpbGNiaUFnSUNCeVpYUjFjbTRnY0hKdmJXbHpaVnh1SUNCOVhHNWNiaUFnWm5WdVkzUnBiMjRnY21WaFpFRnljbUY1UW5WbVptVnlRWE5VWlhoMEtHSjFaaWtnZTF4dUlDQWdJSFpoY2lCMmFXVjNJRDBnYm1WM0lGVnBiblE0UVhKeVlYa29ZblZtS1Z4dUlDQWdJSFpoY2lCamFHRnljeUE5SUc1bGR5QkJjbkpoZVNoMmFXVjNMbXhsYm1kMGFDbGNibHh1SUNBZ0lHWnZjaUFvZG1GeUlHa2dQU0F3T3lCcElEd2dkbWxsZHk1c1pXNW5kR2c3SUdrckt5a2dlMXh1SUNBZ0lDQWdZMmhoY25OYmFWMGdQU0JUZEhKcGJtY3Vabkp2YlVOb1lYSkRiMlJsS0hacFpYZGJhVjBwWEc0Z0lDQWdmVnh1SUNBZ0lISmxkSFZ5YmlCamFHRnljeTVxYjJsdUtDY25LVnh1SUNCOVhHNWNiaUFnWm5WdVkzUnBiMjRnWW5WbVptVnlRMnh2Ym1Vb1luVm1LU0I3WEc0Z0lDQWdhV1lnS0dKMVppNXpiR2xqWlNrZ2UxeHVJQ0FnSUNBZ2NtVjBkWEp1SUdKMVppNXpiR2xqWlNnd0tWeHVJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0IyWVhJZ2RtbGxkeUE5SUc1bGR5QlZhVzUwT0VGeWNtRjVLR0oxWmk1aWVYUmxUR1Z1WjNSb0tWeHVJQ0FnSUNBZ2RtbGxkeTV6WlhRb2JtVjNJRlZwYm5RNFFYSnlZWGtvWW5WbUtTbGNiaUFnSUNBZ0lISmxkSFZ5YmlCMmFXVjNMbUoxWm1abGNseHVJQ0FnSUgxY2JpQWdmVnh1WEc0Z0lHWjFibU4wYVc5dUlFSnZaSGtvS1NCN1hHNGdJQ0FnZEdocGN5NWliMlI1VlhObFpDQTlJR1poYkhObFhHNWNiaUFnSUNCMGFHbHpMbDlwYm1sMFFtOWtlU0E5SUdaMWJtTjBhVzl1S0dKdlpIa3BJSHRjYmlBZ0lDQWdJSFJvYVhNdVgySnZaSGxKYm1sMElEMGdZbTlrZVZ4dUlDQWdJQ0FnYVdZZ0tDRmliMlI1S1NCN1hHNGdJQ0FnSUNBZ0lIUm9hWE11WDJKdlpIbFVaWGgwSUQwZ0p5ZGNiaUFnSUNBZ0lIMGdaV3h6WlNCcFppQW9kSGx3Wlc5bUlHSnZaSGtnUFQwOUlDZHpkSEpwYm1jbktTQjdYRzRnSUNBZ0lDQWdJSFJvYVhNdVgySnZaSGxVWlhoMElEMGdZbTlrZVZ4dUlDQWdJQ0FnZlNCbGJITmxJR2xtSUNoemRYQndiM0owTG1Kc2IySWdKaVlnUW14dllpNXdjbTkwYjNSNWNHVXVhWE5RY205MGIzUjVjR1ZQWmloaWIyUjVLU2tnZTF4dUlDQWdJQ0FnSUNCMGFHbHpMbDlpYjJSNVFteHZZaUE5SUdKdlpIbGNiaUFnSUNBZ0lIMGdaV3h6WlNCcFppQW9jM1Z3Y0c5eWRDNW1iM0p0UkdGMFlTQW1KaUJHYjNKdFJHRjBZUzV3Y205MGIzUjVjR1V1YVhOUWNtOTBiM1I1Y0dWUFppaGliMlI1S1NrZ2UxeHVJQ0FnSUNBZ0lDQjBhR2x6TGw5aWIyUjVSbTl5YlVSaGRHRWdQU0JpYjJSNVhHNGdJQ0FnSUNCOUlHVnNjMlVnYVdZZ0tITjFjSEJ2Y25RdWMyVmhjbU5vVUdGeVlXMXpJQ1ltSUZWU1RGTmxZWEpqYUZCaGNtRnRjeTV3Y205MGIzUjVjR1V1YVhOUWNtOTBiM1I1Y0dWUFppaGliMlI1S1NrZ2UxeHVJQ0FnSUNBZ0lDQjBhR2x6TGw5aWIyUjVWR1Y0ZENBOUlHSnZaSGt1ZEc5VGRISnBibWNvS1Z4dUlDQWdJQ0FnZlNCbGJITmxJR2xtSUNoemRYQndiM0owTG1GeWNtRjVRblZtWm1WeUlDWW1JSE4xY0hCdmNuUXVZbXh2WWlBbUppQnBjMFJoZEdGV2FXVjNLR0p2WkhrcEtTQjdYRzRnSUNBZ0lDQWdJSFJvYVhNdVgySnZaSGxCY25KaGVVSjFabVpsY2lBOUlHSjFabVpsY2tOc2IyNWxLR0p2WkhrdVluVm1abVZ5S1Z4dUlDQWdJQ0FnSUNBdkx5QkpSU0F4TUMweE1TQmpZVzRuZENCb1lXNWtiR1VnWVNCRVlYUmhWbWxsZHlCaWIyUjVMbHh1SUNBZ0lDQWdJQ0IwYUdsekxsOWliMlI1U1c1cGRDQTlJRzVsZHlCQ2JHOWlLRnQwYUdsekxsOWliMlI1UVhKeVlYbENkV1ptWlhKZEtWeHVJQ0FnSUNBZ2ZTQmxiSE5sSUdsbUlDaHpkWEJ3YjNKMExtRnljbUY1UW5WbVptVnlJQ1ltSUNoQmNuSmhlVUoxWm1abGNpNXdjbTkwYjNSNWNHVXVhWE5RY205MGIzUjVjR1ZQWmloaWIyUjVLU0I4ZkNCcGMwRnljbUY1UW5WbVptVnlWbWxsZHloaWIyUjVLU2twSUh0Y2JpQWdJQ0FnSUNBZ2RHaHBjeTVmWW05a2VVRnljbUY1UW5WbVptVnlJRDBnWW5WbVptVnlRMnh2Ym1Vb1ltOWtlU2xjYmlBZ0lDQWdJSDBnWld4elpTQjdYRzRnSUNBZ0lDQWdJSFJvY205M0lHNWxkeUJGY25KdmNpZ25kVzV6ZFhCd2IzSjBaV1FnUW05a2VVbHVhWFFnZEhsd1pTY3BYRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJR2xtSUNnaGRHaHBjeTVvWldGa1pYSnpMbWRsZENnblkyOXVkR1Z1ZEMxMGVYQmxKeWtwSUh0Y2JpQWdJQ0FnSUNBZ2FXWWdLSFI1Y0dWdlppQmliMlI1SUQwOVBTQW5jM1J5YVc1bkp5a2dlMXh1SUNBZ0lDQWdJQ0FnSUhSb2FYTXVhR1ZoWkdWeWN5NXpaWFFvSjJOdmJuUmxiblF0ZEhsd1pTY3NJQ2QwWlhoMEwzQnNZV2x1TzJOb1lYSnpaWFE5VlZSR0xUZ25LVnh1SUNBZ0lDQWdJQ0I5SUdWc2MyVWdhV1lnS0hSb2FYTXVYMkp2WkhsQ2JHOWlJQ1ltSUhSb2FYTXVYMkp2WkhsQ2JHOWlMblI1Y0dVcElIdGNiaUFnSUNBZ0lDQWdJQ0IwYUdsekxtaGxZV1JsY25NdWMyVjBLQ2RqYjI1MFpXNTBMWFI1Y0dVbkxDQjBhR2x6TGw5aWIyUjVRbXh2WWk1MGVYQmxLVnh1SUNBZ0lDQWdJQ0I5SUdWc2MyVWdhV1lnS0hOMWNIQnZjblF1YzJWaGNtTm9VR0Z5WVcxeklDWW1JRlZTVEZObFlYSmphRkJoY21GdGN5NXdjbTkwYjNSNWNHVXVhWE5RY205MGIzUjVjR1ZQWmloaWIyUjVLU2tnZTF4dUlDQWdJQ0FnSUNBZ0lIUm9hWE11YUdWaFpHVnljeTV6WlhRb0oyTnZiblJsYm5RdGRIbHdaU2NzSUNkaGNIQnNhV05oZEdsdmJpOTRMWGQzZHkxbWIzSnRMWFZ5YkdWdVkyOWtaV1E3WTJoaGNuTmxkRDFWVkVZdE9DY3BYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJSDFjYmlBZ0lDQjlYRzVjYmlBZ0lDQnBaaUFvYzNWd2NHOXlkQzVpYkc5aUtTQjdYRzRnSUNBZ0lDQjBhR2x6TG1Kc2IySWdQU0JtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0FnSUNBZ2RtRnlJSEpsYW1WamRHVmtJRDBnWTI5dWMzVnRaV1FvZEdocGN5bGNiaUFnSUNBZ0lDQWdhV1lnS0hKbGFtVmpkR1ZrS1NCN1hHNGdJQ0FnSUNBZ0lDQWdjbVYwZFhKdUlISmxhbVZqZEdWa1hHNGdJQ0FnSUNBZ0lIMWNibHh1SUNBZ0lDQWdJQ0JwWmlBb2RHaHBjeTVmWW05a2VVSnNiMklwSUh0Y2JpQWdJQ0FnSUNBZ0lDQnlaWFIxY200Z1VISnZiV2x6WlM1eVpYTnZiSFpsS0hSb2FYTXVYMkp2WkhsQ2JHOWlLVnh1SUNBZ0lDQWdJQ0I5SUdWc2MyVWdhV1lnS0hSb2FYTXVYMkp2WkhsQmNuSmhlVUoxWm1abGNpa2dlMXh1SUNBZ0lDQWdJQ0FnSUhKbGRIVnliaUJRY205dGFYTmxMbkpsYzI5c2RtVW9ibVYzSUVKc2IySW9XM1JvYVhNdVgySnZaSGxCY25KaGVVSjFabVpsY2wwcEtWeHVJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2FXWWdLSFJvYVhNdVgySnZaSGxHYjNKdFJHRjBZU2tnZTF4dUlDQWdJQ0FnSUNBZ0lIUm9jbTkzSUc1bGR5QkZjbkp2Y2lnblkyOTFiR1FnYm05MElISmxZV1FnUm05eWJVUmhkR0VnWW05a2VTQmhjeUJpYkc5aUp5bGNiaUFnSUNBZ0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lDQWdJQ0J5WlhSMWNtNGdVSEp2YldselpTNXlaWE52YkhabEtHNWxkeUJDYkc5aUtGdDBhR2x6TGw5aWIyUjVWR1Y0ZEYwcEtWeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJSFJvYVhNdVlYSnlZWGxDZFdabVpYSWdQU0JtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0FnSUNBZ2FXWWdLSFJvYVhNdVgySnZaSGxCY25KaGVVSjFabVpsY2lrZ2UxeHVJQ0FnSUNBZ0lDQWdJSEpsZEhWeWJpQmpiMjV6ZFcxbFpDaDBhR2x6S1NCOGZDQlFjbTl0YVhObExuSmxjMjlzZG1Vb2RHaHBjeTVmWW05a2VVRnljbUY1UW5WbVptVnlLVnh1SUNBZ0lDQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdJQ0FnSUhKbGRIVnliaUIwYUdsekxtSnNiMklvS1M1MGFHVnVLSEpsWVdSQ2JHOWlRWE5CY25KaGVVSjFabVpsY2lsY2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUgxY2JseHVJQ0FnSUhSb2FYTXVkR1Y0ZENBOUlHWjFibU4wYVc5dUtDa2dlMXh1SUNBZ0lDQWdkbUZ5SUhKbGFtVmpkR1ZrSUQwZ1kyOXVjM1Z0WldRb2RHaHBjeWxjYmlBZ0lDQWdJR2xtSUNoeVpXcGxZM1JsWkNrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2NtVnFaV04wWldSY2JpQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ2FXWWdLSFJvYVhNdVgySnZaSGxDYkc5aUtTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQnlaV0ZrUW14dllrRnpWR1Y0ZENoMGFHbHpMbDlpYjJSNVFteHZZaWxjYmlBZ0lDQWdJSDBnWld4elpTQnBaaUFvZEdocGN5NWZZbTlrZVVGeWNtRjVRblZtWm1WeUtTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQlFjbTl0YVhObExuSmxjMjlzZG1Vb2NtVmhaRUZ5Y21GNVFuVm1abVZ5UVhOVVpYaDBLSFJvYVhNdVgySnZaSGxCY25KaGVVSjFabVpsY2lrcFhHNGdJQ0FnSUNCOUlHVnNjMlVnYVdZZ0tIUm9hWE11WDJKdlpIbEdiM0p0UkdGMFlTa2dlMXh1SUNBZ0lDQWdJQ0IwYUhKdmR5QnVaWGNnUlhKeWIzSW9KMk52ZFd4a0lHNXZkQ0J5WldGa0lFWnZjbTFFWVhSaElHSnZaSGtnWVhNZ2RHVjRkQ2NwWEc0Z0lDQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdVSEp2YldselpTNXlaWE52YkhabEtIUm9hWE11WDJKdlpIbFVaWGgwS1Z4dUlDQWdJQ0FnZlZ4dUlDQWdJSDFjYmx4dUlDQWdJR2xtSUNoemRYQndiM0owTG1admNtMUVZWFJoS1NCN1hHNGdJQ0FnSUNCMGFHbHpMbVp2Y20xRVlYUmhJRDBnWm5WdVkzUnBiMjRvS1NCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCMGFHbHpMblJsZUhRb0tTNTBhR1Z1S0dSbFkyOWtaU2xjYmlBZ0lDQWdJSDFjYmlBZ0lDQjlYRzVjYmlBZ0lDQjBhR2x6TG1wemIyNGdQU0JtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0FnSUhKbGRIVnliaUIwYUdsekxuUmxlSFFvS1M1MGFHVnVLRXBUVDA0dWNHRnljMlVwWEc0Z0lDQWdmVnh1WEc0Z0lDQWdjbVYwZFhKdUlIUm9hWE5jYmlBZ2ZWeHVYRzRnSUM4dklFaFVWRkFnYldWMGFHOWtjeUIzYUc5elpTQmpZWEJwZEdGc2FYcGhkR2x2YmlCemFHOTFiR1FnWW1VZ2JtOXliV0ZzYVhwbFpGeHVJQ0IyWVhJZ2JXVjBhRzlrY3lBOUlGc25SRVZNUlZSRkp5d2dKMGRGVkNjc0lDZElSVUZFSnl3Z0owOVFWRWxQVGxNbkxDQW5VRTlUVkNjc0lDZFFWVlFuWFZ4dVhHNGdJR1oxYm1OMGFXOXVJRzV2Y20xaGJHbDZaVTFsZEdodlpDaHRaWFJvYjJRcElIdGNiaUFnSUNCMllYSWdkWEJqWVhObFpDQTlJRzFsZEdodlpDNTBiMVZ3Y0dWeVEyRnpaU2dwWEc0Z0lDQWdjbVYwZFhKdUlDaHRaWFJvYjJSekxtbHVaR1Y0VDJZb2RYQmpZWE5sWkNrZ1BpQXRNU2tnUHlCMWNHTmhjMlZrSURvZ2JXVjBhRzlrWEc0Z0lIMWNibHh1SUNCbWRXNWpkR2x2YmlCU1pYRjFaWE4wS0dsdWNIVjBMQ0J2Y0hScGIyNXpLU0I3WEc0Z0lDQWdiM0IwYVc5dWN5QTlJRzl3ZEdsdmJuTWdmSHdnZTMxY2JpQWdJQ0IyWVhJZ1ltOWtlU0E5SUc5d2RHbHZibk11WW05a2VWeHVYRzRnSUNBZ2FXWWdLR2x1Y0hWMElHbHVjM1JoYm1ObGIyWWdVbVZ4ZFdWemRDa2dlMXh1SUNBZ0lDQWdhV1lnS0dsdWNIVjBMbUp2WkhsVmMyVmtLU0I3WEc0Z0lDQWdJQ0FnSUhSb2NtOTNJRzVsZHlCVWVYQmxSWEp5YjNJb0owRnNjbVZoWkhrZ2NtVmhaQ2NwWEc0Z0lDQWdJQ0I5WEc0Z0lDQWdJQ0IwYUdsekxuVnliQ0E5SUdsdWNIVjBMblZ5YkZ4dUlDQWdJQ0FnZEdocGN5NWpjbVZrWlc1MGFXRnNjeUE5SUdsdWNIVjBMbU55WldSbGJuUnBZV3h6WEc0Z0lDQWdJQ0JwWmlBb0lXOXdkR2x2Ym5NdWFHVmhaR1Z5Y3lrZ2UxeHVJQ0FnSUNBZ0lDQjBhR2x6TG1obFlXUmxjbk1nUFNCdVpYY2dTR1ZoWkdWeWN5aHBibkIxZEM1b1pXRmtaWEp6S1Z4dUlDQWdJQ0FnZlZ4dUlDQWdJQ0FnZEdocGN5NXRaWFJvYjJRZ1BTQnBibkIxZEM1dFpYUm9iMlJjYmlBZ0lDQWdJSFJvYVhNdWJXOWtaU0E5SUdsdWNIVjBMbTF2WkdWY2JpQWdJQ0FnSUdsbUlDZ2hZbTlrZVNBbUppQnBibkIxZEM1ZlltOWtlVWx1YVhRZ0lUMGdiblZzYkNrZ2UxeHVJQ0FnSUNBZ0lDQmliMlI1SUQwZ2FXNXdkWFF1WDJKdlpIbEpibWwwWEc0Z0lDQWdJQ0FnSUdsdWNIVjBMbUp2WkhsVmMyVmtJRDBnZEhKMVpWeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0IwYUdsekxuVnliQ0E5SUZOMGNtbHVaeWhwYm5CMWRDbGNiaUFnSUNCOVhHNWNiaUFnSUNCMGFHbHpMbU55WldSbGJuUnBZV3h6SUQwZ2IzQjBhVzl1Y3k1amNtVmtaVzUwYVdGc2N5QjhmQ0IwYUdsekxtTnlaV1JsYm5ScFlXeHpJSHg4SUNkdmJXbDBKMXh1SUNBZ0lHbG1JQ2h2Y0hScGIyNXpMbWhsWVdSbGNuTWdmSHdnSVhSb2FYTXVhR1ZoWkdWeWN5a2dlMXh1SUNBZ0lDQWdkR2hwY3k1b1pXRmtaWEp6SUQwZ2JtVjNJRWhsWVdSbGNuTW9iM0IwYVc5dWN5NW9aV0ZrWlhKektWeHVJQ0FnSUgxY2JpQWdJQ0IwYUdsekxtMWxkR2h2WkNBOUlHNXZjbTFoYkdsNlpVMWxkR2h2WkNodmNIUnBiMjV6TG0xbGRHaHZaQ0I4ZkNCMGFHbHpMbTFsZEdodlpDQjhmQ0FuUjBWVUp5bGNiaUFnSUNCMGFHbHpMbTF2WkdVZ1BTQnZjSFJwYjI1ekxtMXZaR1VnZkh3Z2RHaHBjeTV0YjJSbElIeDhJRzUxYkd4Y2JpQWdJQ0IwYUdsekxuSmxabVZ5Y21WeUlEMGdiblZzYkZ4dVhHNGdJQ0FnYVdZZ0tDaDBhR2x6TG0xbGRHaHZaQ0E5UFQwZ0owZEZWQ2NnZkh3Z2RHaHBjeTV0WlhSb2IyUWdQVDA5SUNkSVJVRkVKeWtnSmlZZ1ltOWtlU2tnZTF4dUlDQWdJQ0FnZEdoeWIzY2dibVYzSUZSNWNHVkZjbkp2Y2lnblFtOWtlU0J1YjNRZ1lXeHNiM2RsWkNCbWIzSWdSMFZVSUc5eUlFaEZRVVFnY21WeGRXVnpkSE1uS1Z4dUlDQWdJSDFjYmlBZ0lDQjBhR2x6TGw5cGJtbDBRbTlrZVNoaWIyUjVLVnh1SUNCOVhHNWNiaUFnVW1WeGRXVnpkQzV3Y205MGIzUjVjR1V1WTJ4dmJtVWdQU0JtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0J5WlhSMWNtNGdibVYzSUZKbGNYVmxjM1FvZEdocGN5d2dleUJpYjJSNU9pQjBhR2x6TGw5aWIyUjVTVzVwZENCOUtWeHVJQ0I5WEc1Y2JpQWdablZ1WTNScGIyNGdaR1ZqYjJSbEtHSnZaSGtwSUh0Y2JpQWdJQ0IyWVhJZ1ptOXliU0E5SUc1bGR5QkdiM0p0UkdGMFlTZ3BYRzRnSUNBZ1ltOWtlUzUwY21sdEtDa3VjM0JzYVhRb0p5WW5LUzVtYjNKRllXTm9LR1oxYm1OMGFXOXVLR0o1ZEdWektTQjdYRzRnSUNBZ0lDQnBaaUFvWW5sMFpYTXBJSHRjYmlBZ0lDQWdJQ0FnZG1GeUlITndiR2wwSUQwZ1lubDBaWE11YzNCc2FYUW9KejBuS1Z4dUlDQWdJQ0FnSUNCMllYSWdibUZ0WlNBOUlITndiR2wwTG5Ob2FXWjBLQ2t1Y21Wd2JHRmpaU2d2WEZ3ckwyY3NJQ2NnSnlsY2JpQWdJQ0FnSUNBZ2RtRnlJSFpoYkhWbElEMGdjM0JzYVhRdWFtOXBiaWduUFNjcExuSmxjR3hoWTJVb0wxeGNLeTluTENBbklDY3BYRzRnSUNBZ0lDQWdJR1p2Y20wdVlYQndaVzVrS0dSbFkyOWtaVlZTU1VOdmJYQnZibVZ1ZENodVlXMWxLU3dnWkdWamIyUmxWVkpKUTI5dGNHOXVaVzUwS0haaGJIVmxLU2xjYmlBZ0lDQWdJSDFjYmlBZ0lDQjlLVnh1SUNBZ0lISmxkSFZ5YmlCbWIzSnRYRzRnSUgxY2JseHVJQ0JtZFc1amRHbHZiaUJ3WVhKelpVaGxZV1JsY25Nb2NtRjNTR1ZoWkdWeWN5a2dlMXh1SUNBZ0lIWmhjaUJvWldGa1pYSnpJRDBnYm1WM0lFaGxZV1JsY25Nb0tWeHVJQ0FnSUM4dklGSmxjR3hoWTJVZ2FXNXpkR0Z1WTJWeklHOW1JRnhjY2x4Y2JpQmhibVFnWEZ4dUlHWnZiR3h2ZDJWa0lHSjVJR0YwSUd4bFlYTjBJRzl1WlNCemNHRmpaU0J2Y2lCb2IzSnBlbTl1ZEdGc0lIUmhZaUIzYVhSb0lHRWdjM0JoWTJWY2JpQWdJQ0F2THlCb2RIUndjem92TDNSdmIyeHpMbWxsZEdZdWIzSm5MMmgwYld3dmNtWmpOekl6TUNOelpXTjBhVzl1TFRNdU1seHVJQ0FnSUhaaGNpQndjbVZRY205alpYTnpaV1JJWldGa1pYSnpJRDBnY21GM1NHVmhaR1Z5Y3k1eVpYQnNZV05sS0M5Y1hISS9YRnh1VzF4Y2RDQmRLeTluTENBbklDY3BYRzRnSUNBZ2NISmxVSEp2WTJWemMyVmtTR1ZoWkdWeWN5NXpjR3hwZENndlhGeHlQMXhjYmk4cExtWnZja1ZoWTJnb1puVnVZM1JwYjI0b2JHbHVaU2tnZTF4dUlDQWdJQ0FnZG1GeUlIQmhjblJ6SUQwZ2JHbHVaUzV6Y0d4cGRDZ25PaWNwWEc0Z0lDQWdJQ0IyWVhJZ2EyVjVJRDBnY0dGeWRITXVjMmhwWm5Rb0tTNTBjbWx0S0NsY2JpQWdJQ0FnSUdsbUlDaHJaWGtwSUh0Y2JpQWdJQ0FnSUNBZ2RtRnlJSFpoYkhWbElEMGdjR0Z5ZEhNdWFtOXBiaWduT2ljcExuUnlhVzBvS1Z4dUlDQWdJQ0FnSUNCb1pXRmtaWEp6TG1Gd2NHVnVaQ2hyWlhrc0lIWmhiSFZsS1Z4dUlDQWdJQ0FnZlZ4dUlDQWdJSDBwWEc0Z0lDQWdjbVYwZFhKdUlHaGxZV1JsY25OY2JpQWdmVnh1WEc0Z0lFSnZaSGt1WTJGc2JDaFNaWEYxWlhOMExuQnliM1J2ZEhsd1pTbGNibHh1SUNCbWRXNWpkR2x2YmlCU1pYTndiMjV6WlNoaWIyUjVTVzVwZEN3Z2IzQjBhVzl1Y3lrZ2UxeHVJQ0FnSUdsbUlDZ2hiM0IwYVc5dWN5a2dlMXh1SUNBZ0lDQWdiM0IwYVc5dWN5QTlJSHQ5WEc0Z0lDQWdmVnh1WEc0Z0lDQWdkR2hwY3k1MGVYQmxJRDBnSjJSbFptRjFiSFFuWEc0Z0lDQWdkR2hwY3k1emRHRjBkWE1nUFNCdmNIUnBiMjV6TG5OMFlYUjFjeUE5UFQwZ2RXNWtaV1pwYm1Wa0lEOGdNakF3SURvZ2IzQjBhVzl1Y3k1emRHRjBkWE5jYmlBZ0lDQjBhR2x6TG05cklEMGdkR2hwY3k1emRHRjBkWE1nUGowZ01qQXdJQ1ltSUhSb2FYTXVjM1JoZEhWeklEd2dNekF3WEc0Z0lDQWdkR2hwY3k1emRHRjBkWE5VWlhoMElEMGdKM04wWVhSMWMxUmxlSFFuSUdsdUlHOXdkR2x2Ym5NZ1B5QnZjSFJwYjI1ekxuTjBZWFIxYzFSbGVIUWdPaUFuVDBzblhHNGdJQ0FnZEdocGN5NW9aV0ZrWlhKeklEMGdibVYzSUVobFlXUmxjbk1vYjNCMGFXOXVjeTVvWldGa1pYSnpLVnh1SUNBZ0lIUm9hWE11ZFhKc0lEMGdiM0IwYVc5dWN5NTFjbXdnZkh3Z0p5ZGNiaUFnSUNCMGFHbHpMbDlwYm1sMFFtOWtlU2hpYjJSNVNXNXBkQ2xjYmlBZ2ZWeHVYRzRnSUVKdlpIa3VZMkZzYkNoU1pYTndiMjV6WlM1d2NtOTBiM1I1Y0dVcFhHNWNiaUFnVW1WemNHOXVjMlV1Y0hKdmRHOTBlWEJsTG1Oc2IyNWxJRDBnWm5WdVkzUnBiMjRvS1NCN1hHNGdJQ0FnY21WMGRYSnVJRzVsZHlCU1pYTndiMjV6WlNoMGFHbHpMbDlpYjJSNVNXNXBkQ3dnZTF4dUlDQWdJQ0FnYzNSaGRIVnpPaUIwYUdsekxuTjBZWFIxY3l4Y2JpQWdJQ0FnSUhOMFlYUjFjMVJsZUhRNklIUm9hWE11YzNSaGRIVnpWR1Y0ZEN4Y2JpQWdJQ0FnSUdobFlXUmxjbk02SUc1bGR5QklaV0ZrWlhKektIUm9hWE11YUdWaFpHVnljeWtzWEc0Z0lDQWdJQ0IxY213NklIUm9hWE11ZFhKc1hHNGdJQ0FnZlNsY2JpQWdmVnh1WEc0Z0lGSmxjM0J2Ym5ObExtVnljbTl5SUQwZ1puVnVZM1JwYjI0b0tTQjdYRzRnSUNBZ2RtRnlJSEpsYzNCdmJuTmxJRDBnYm1WM0lGSmxjM0J2Ym5ObEtHNTFiR3dzSUh0emRHRjBkWE02SURBc0lITjBZWFIxYzFSbGVIUTZJQ2NuZlNsY2JpQWdJQ0J5WlhOd2IyNXpaUzUwZVhCbElEMGdKMlZ5Y205eUoxeHVJQ0FnSUhKbGRIVnliaUJ5WlhOd2IyNXpaVnh1SUNCOVhHNWNiaUFnZG1GeUlISmxaR2x5WldOMFUzUmhkSFZ6WlhNZ1BTQmJNekF4TENBek1ESXNJRE13TXl3Z016QTNMQ0F6TURoZFhHNWNiaUFnVW1WemNHOXVjMlV1Y21Wa2FYSmxZM1FnUFNCbWRXNWpkR2x2YmloMWNtd3NJSE4wWVhSMWN5a2dlMXh1SUNBZ0lHbG1JQ2h5WldScGNtVmpkRk4wWVhSMWMyVnpMbWx1WkdWNFQyWW9jM1JoZEhWektTQTlQVDBnTFRFcElIdGNiaUFnSUNBZ0lIUm9jbTkzSUc1bGR5QlNZVzVuWlVWeWNtOXlLQ2RKYm5aaGJHbGtJSE4wWVhSMWN5QmpiMlJsSnlsY2JpQWdJQ0I5WEc1Y2JpQWdJQ0J5WlhSMWNtNGdibVYzSUZKbGMzQnZibk5sS0c1MWJHd3NJSHR6ZEdGMGRYTTZJSE4wWVhSMWN5d2dhR1ZoWkdWeWN6b2dlMnh2WTJGMGFXOXVPaUIxY214OWZTbGNiaUFnZlZ4dVhHNGdJSE5sYkdZdVNHVmhaR1Z5Y3lBOUlFaGxZV1JsY25OY2JpQWdjMlZzWmk1U1pYRjFaWE4wSUQwZ1VtVnhkV1Z6ZEZ4dUlDQnpaV3htTGxKbGMzQnZibk5sSUQwZ1VtVnpjRzl1YzJWY2JseHVJQ0J6Wld4bUxtWmxkR05vSUQwZ1puVnVZM1JwYjI0b2FXNXdkWFFzSUdsdWFYUXBJSHRjYmlBZ0lDQnlaWFIxY200Z2JtVjNJRkJ5YjIxcGMyVW9ablZ1WTNScGIyNG9jbVZ6YjJ4MlpTd2djbVZxWldOMEtTQjdYRzRnSUNBZ0lDQjJZWElnY21WeGRXVnpkQ0E5SUc1bGR5QlNaWEYxWlhOMEtHbHVjSFYwTENCcGJtbDBLVnh1SUNBZ0lDQWdkbUZ5SUhob2NpQTlJRzVsZHlCWVRVeElkSFJ3VW1WeGRXVnpkQ2dwWEc1Y2JpQWdJQ0FnSUhob2NpNXZibXh2WVdRZ1BTQm1kVzVqZEdsdmJpZ3BJSHRjYmlBZ0lDQWdJQ0FnZG1GeUlHOXdkR2x2Ym5NZ1BTQjdYRzRnSUNBZ0lDQWdJQ0FnYzNSaGRIVnpPaUI0YUhJdWMzUmhkSFZ6TEZ4dUlDQWdJQ0FnSUNBZ0lITjBZWFIxYzFSbGVIUTZJSGhvY2k1emRHRjBkWE5VWlhoMExGeHVJQ0FnSUNBZ0lDQWdJR2hsWVdSbGNuTTZJSEJoY25ObFNHVmhaR1Z5Y3loNGFISXVaMlYwUVd4c1VtVnpjRzl1YzJWSVpXRmtaWEp6S0NrZ2ZId2dKeWNwWEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ2IzQjBhVzl1Y3k1MWNtd2dQU0FuY21WemNHOXVjMlZWVWt3bklHbHVJSGhvY2lBL0lIaG9jaTV5WlhOd2IyNXpaVlZTVENBNklHOXdkR2x2Ym5NdWFHVmhaR1Z5Y3k1blpYUW9KMWd0VW1WeGRXVnpkQzFWVWt3bktWeHVJQ0FnSUNBZ0lDQjJZWElnWW05a2VTQTlJQ2R5WlhOd2IyNXpaU2NnYVc0Z2VHaHlJRDhnZUdoeUxuSmxjM0J2Ym5ObElEb2dlR2h5TG5KbGMzQnZibk5sVkdWNGRGeHVJQ0FnSUNBZ0lDQnlaWE52YkhabEtHNWxkeUJTWlhOd2IyNXpaU2hpYjJSNUxDQnZjSFJwYjI1ektTbGNiaUFnSUNBZ0lIMWNibHh1SUNBZ0lDQWdlR2h5TG05dVpYSnliM0lnUFNCbWRXNWpkR2x2YmlncElIdGNiaUFnSUNBZ0lDQWdjbVZxWldOMEtHNWxkeUJVZVhCbFJYSnliM0lvSjA1bGRIZHZjbXNnY21WeGRXVnpkQ0JtWVdsc1pXUW5LU2xjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnZUdoeUxtOXVkR2x0Wlc5MWRDQTlJR1oxYm1OMGFXOXVLQ2tnZTF4dUlDQWdJQ0FnSUNCeVpXcGxZM1FvYm1WM0lGUjVjR1ZGY25KdmNpZ25UbVYwZDI5eWF5QnlaWEYxWlhOMElHWmhhV3hsWkNjcEtWeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQjRhSEl1YjNCbGJpaHlaWEYxWlhOMExtMWxkR2h2WkN3Z2NtVnhkV1Z6ZEM1MWNtd3NJSFJ5ZFdVcFhHNWNiaUFnSUNBZ0lHbG1JQ2h5WlhGMVpYTjBMbU55WldSbGJuUnBZV3h6SUQwOVBTQW5hVzVqYkhWa1pTY3BJSHRjYmlBZ0lDQWdJQ0FnZUdoeUxuZHBkR2hEY21Wa1pXNTBhV0ZzY3lBOUlIUnlkV1ZjYmlBZ0lDQWdJSDBnWld4elpTQnBaaUFvY21WeGRXVnpkQzVqY21Wa1pXNTBhV0ZzY3lBOVBUMGdKMjl0YVhRbktTQjdYRzRnSUNBZ0lDQWdJSGhvY2k1M2FYUm9RM0psWkdWdWRHbGhiSE1nUFNCbVlXeHpaVnh1SUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0JwWmlBb0ozSmxjM0J2Ym5ObFZIbHdaU2NnYVc0Z2VHaHlJQ1ltSUhOMWNIQnZjblF1WW14dllpa2dlMXh1SUNBZ0lDQWdJQ0I0YUhJdWNtVnpjRzl1YzJWVWVYQmxJRDBnSjJKc2IySW5YRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJSEpsY1hWbGMzUXVhR1ZoWkdWeWN5NW1iM0pGWVdOb0tHWjFibU4wYVc5dUtIWmhiSFZsTENCdVlXMWxLU0I3WEc0Z0lDQWdJQ0FnSUhob2NpNXpaWFJTWlhGMVpYTjBTR1ZoWkdWeUtHNWhiV1VzSUhaaGJIVmxLVnh1SUNBZ0lDQWdmU2xjYmx4dUlDQWdJQ0FnZUdoeUxuTmxibVFvZEhsd1pXOW1JSEpsY1hWbGMzUXVYMkp2WkhsSmJtbDBJRDA5UFNBbmRXNWtaV1pwYm1Wa0p5QS9JRzUxYkd3Z09pQnlaWEYxWlhOMExsOWliMlI1U1c1cGRDbGNiaUFnSUNCOUtWeHVJQ0I5WEc0Z0lITmxiR1l1Wm1WMFkyZ3VjRzlzZVdacGJHd2dQU0IwY25WbFhHNTlLU2gwZVhCbGIyWWdjMlZzWmlBaFBUMGdKM1Z1WkdWbWFXNWxaQ2NnUHlCelpXeG1JRG9nZEdocGN5azdYRzRpTENKamIyNXpkQ0JFUWlBOUlDZG9kSFJ3Y3pvdkwyNWxlSFZ6TFdOaGRHRnNiMmN1Wm1seVpXSmhjMlZwYnk1amIyMHZjRzl6ZEhNdWFuTnZiajloZFhSb1BUZG5OM0I1UzB0NWEwNHpUalZsZDNKSmJXaFBZVk0yZG5keVJuTmpOV1pMYTNKck9HVnFlbVluTzF4dVhHNWpiMjV6ZENBa2JHOWhaR2x1WnlBOUlFRnljbUY1TG1aeWIyMG9aRzlqZFcxbGJuUXVjWFZsY25sVFpXeGxZM1J2Y2tGc2JDZ25MbXh2WVdScGJtY25LU2s3WEc1amIyNXpkQ0FrWVhKMGFXTnNaVXhwYzNRZ1BTQmtiMk4xYldWdWRDNW5aWFJGYkdWdFpXNTBRbmxKWkNnbmFuTXRiR2x6ZENjcE8xeHVZMjl1YzNRZ0pHNWhkaUE5SUdSdlkzVnRaVzUwTG1kbGRFVnNaVzFsYm5SQ2VVbGtLQ2RxY3kxdVlYWW5LVHRjYm1OdmJuTjBJQ1J3WVhKaGJHeGhlQ0E5SUdSdlkzVnRaVzUwTG5GMVpYSjVVMlZzWldOMGIzSW9KeTV3WVhKaGJHeGhlQ2NwTzF4dVkyOXVjM1FnSkdOdmJuUmxiblFnUFNCa2IyTjFiV1Z1ZEM1eGRXVnllVk5sYkdWamRHOXlLQ2N1WTI5dWRHVnVkQ2NwTzF4dVkyOXVjM1FnSkhScGRHeGxJRDBnWkc5amRXMWxiblF1WjJWMFJXeGxiV1Z1ZEVKNVNXUW9KMnB6TFhScGRHeGxKeWs3WEc1amIyNXpkQ0FrZFhCQmNuSnZkeUE5SUdSdlkzVnRaVzUwTG1kbGRFVnNaVzFsYm5SQ2VVbGtLQ2RxY3kxaGNuSnZkeWNwTzF4dVkyOXVjM1FnSkcxdlpHRnNJRDBnWkc5amRXMWxiblF1Y1hWbGNubFRaV3hsWTNSdmNpZ25MbTF2WkdGc0p5azdYRzVqYjI1emRDQWtiR2xuYUhSaWIzZ2dQU0JrYjJOMWJXVnVkQzV4ZFdWeWVWTmxiR1ZqZEc5eUtDY3ViR2xuYUhSaWIzZ25LVHRjYm1OdmJuTjBJQ1IyYVdWM0lEMGdaRzlqZFcxbGJuUXVjWFZsY25sVFpXeGxZM1J2Y2lnbkxteHBaMmgwWW05NExYWnBaWGNuS1R0Y2JtTnZibk4wSUhOdmNuUkpaSE1nUFNCYkoyRnlkR2x6ZENjc0lDZDBhWFJzWlNkZE8xeHVYRzVsZUhCdmNuUWdleUJjYmx4MFJFSXNYRzVjZENSc2IyRmthVzVuTEZ4dVhIUWtZWEowYVdOc1pVeHBjM1FzSUZ4dVhIUWtibUYyTENCY2JseDBKSEJoY21Gc2JHRjRMRnh1WEhRa1kyOXVkR1Z1ZEN4Y2JseDBKSFJwZEd4bExGeHVYSFFrZFhCQmNuSnZkeXhjYmx4MEpHMXZaR0ZzTEZ4dVhIUWtiR2xuYUhSaWIzZ3NYRzVjZENSMmFXVjNMRnh1WEhSemIzSjBTV1J6WEc1OU95SXNJbWx0Y0c5eWRDQnpiVzl2ZEdoelkzSnZiR3dnWm5KdmJTQW5jMjF2YjNSb2MyTnliMnhzTFhCdmJIbG1hV3hzSnp0Y2JtbHRjRzl5ZENBbmQyaGhkSGRuTFdabGRHTm9KenNnWEc1Y2JtbHRjRzl5ZENCN0lHRnlkR2xqYkdWVVpXMXdiR0YwWlN3Z2NtVnVaR1Z5VG1GMlRHY2dmU0JtY205dElDY3VMM1JsYlhCc1lYUmxjeWM3WEc1cGJYQnZjblFnZXlCa1pXSnZkVzVqWlN3Z2FHbGtaVXh2WVdScGJtY3NJSE5qY205c2JGUnZWRzl3SUgwZ1puSnZiU0FuTGk5MWRHbHNjeWM3WEc1cGJYQnZjblFnZXlCRVFpd2dKR0Z5ZEdsamJHVk1hWE4wTENCemIzSjBTV1J6SUgwZ1puSnZiU0FuTGk5amIyNXpkR0Z1ZEhNbk8xeHVhVzF3YjNKMElIc2dZWFIwWVdOb1RXOWtZV3hNYVhOMFpXNWxjbk1zSUdGMGRHRmphRlZ3UVhKeWIzZE1hWE4wWlc1bGNuTXNJR0YwZEdGamFFbHRZV2RsVEdsemRHVnVaWEp6TENCdFlXdGxRV3h3YUdGaVpYUXNJRzFoYTJWVGJHbGtaWElnZlNCbWNtOXRJQ2N1TDIxdlpIVnNaWE1uTzF4dVhHNXNaWFFnYzI5eWRFdGxlU0E5SURBN0lDOHZJREFnUFNCaGNuUnBjM1FzSURFZ1BTQjBhWFJzWlZ4dWJHVjBJR1Z1ZEhKcFpYTWdQU0I3SUdKNVFYVjBhRzl5T2lCYlhTd2dZbmxVYVhSc1pUb2dXMTBnZlR0Y2JseHVZMjl1YzNRZ2MyVjBWWEJUYjNKMFFuVjBkRzl1Y3lBOUlDZ3BJRDArSUh0Y2JseDBjMjl5ZEVsa2N5NW1iM0pGWVdOb0tHbGtJRDArSUh0Y2JseDBYSFJqYjI1emRDQmhiSFFnUFNCcFpDQTlQVDBnSjJGeWRHbHpkQ2NnUHlBbmRHbDBiR1VuSURvZ0oyRnlkR2x6ZENjN1hHNWNibHgwWEhSamIyNXpkQ0FrWW5WMGRHOXVJRDBnWkc5amRXMWxiblF1WjJWMFJXeGxiV1Z1ZEVKNVNXUW9ZR3B6TFdKNUxTUjdhV1I5WUNrN1hHNWNkRngwWTI5dWMzUWdKR0ZzZEVKMWRIUnZiaUE5SUdSdlkzVnRaVzUwTG1kbGRFVnNaVzFsYm5SQ2VVbGtLR0JxY3kxaWVTMGtlMkZzZEgxZ0tUdGNibHh1WEhSY2RDUmlkWFIwYjI0dVlXUmtSWFpsYm5STWFYTjBaVzVsY2lnblkyeHBZMnNuTENBb0tTQTlQaUI3WEc1Y2RGeDBYSFJ6WTNKdmJHeFViMVJ2Y0NncE8xeHVYSFJjZEZ4MGMyOXlkRXRsZVNBOUlDRnpiM0owUzJWNU8xeHVYSFJjZEZ4MGNtVnVaR1Z5Ulc1MGNtbGxjeWdwTzF4dVhHNWNkRngwWEhRa1luVjBkRzl1TG1Oc1lYTnpUR2x6ZEM1aFpHUW9KMkZqZEdsMlpTY3BPMXh1WEhSY2RGeDBKR0ZzZEVKMWRIUnZiaTVqYkdGemMweHBjM1F1Y21WdGIzWmxLQ2RoWTNScGRtVW5LVHRjYmx4MFhIUjlLVnh1WEhSOUtUdGNibjA3WEc1Y2JtTnZibk4wSUcxaGEyVkRhWFJoZEdsdmJpQTlJQ2hsYm5SeWVTd2dhU2tnUFQ0Z2UxeHVYSFJqYjI1emRDQjdJR055WldScGRDd2dZM0psWkdsMFgyeHBibXNnZlNBOUlHVnVkSEo1TzF4dVhIUmpiMjV6ZENCbGJuUnllVVJsYzJOeWFYQjBhVzl1SUQwZ1pHOWpkVzFsYm5RdVoyVjBSV3hsYldWdWRFSjVTV1FvWUhOc2FXUmxjaTBrZTJsOVlDa3VjWFZsY25sVFpXeGxZM1J2Y2lnbkxtRnlkR2xqYkdVdFpHVnpZM0pwY0hScGIyNG5LVHRjYmx4MFkyOXVjM1FnWTJsMFlYUnBiMjRnUFNCZ1BHUnBkaUJqYkdGemN6MWNJbUZ5ZEdsamJHVXRZM0psWkdsMFhDSStjMjkxY21ObE9pQThZU0JvY21WbVBWd2lKSHRqY21Wa2FYUmZiR2x1YTMxY0lqNGtlMk55WldScGRIMDhMMkUrUEM5a2FYWStZRHRjYmx4MFhHNWNkR1Z1ZEhKNVJHVnpZM0pwY0hScGIyNHVhVzV6WlhKMFFXUnFZV05sYm5SSVZFMU1LQ2RpWldadmNtVmxibVFuTENCamFYUmhkR2x2YmlrN1hHNTlPMXh1WEc1amIyNXpkQ0J5Wlc1a1pYSkZiblJ5YVdWeklEMGdLQ2tnUFQ0Z2UxeHVYSFJqYjI1emRDQmxiblJ5YVdWelRHbHpkQ0E5SUhOdmNuUkxaWGtnUHlCbGJuUnlhV1Z6TG1KNVZHbDBiR1VnT2lCbGJuUnlhV1Z6TG1KNVFYVjBhRzl5TzF4dVhHNWNkQ1JoY25ScFkyeGxUR2x6ZEM1cGJtNWxja2hVVFV3Z1BTQW5KenRjYmx4dVhIUmxiblJ5YVdWelRHbHpkQzVtYjNKRllXTm9LQ2hsYm5SeWVTd2dhU2tnUFQ0Z2UxeHVYSFJjZENSaGNuUnBZMnhsVEdsemRDNXBibk5sY25SQlpHcGhZMlZ1ZEVoVVRVd29KMkpsWm05eVpXVnVaQ2NzSUdGeWRHbGpiR1ZVWlcxd2JHRjBaU2hsYm5SeWVTd2dhU2twTzF4dVhIUmNkRzFoYTJWVGJHbGtaWElvWkc5amRXMWxiblF1WjJWMFJXeGxiV1Z1ZEVKNVNXUW9ZSE5zYVdSbGNpMGtlMmw5WUNrcE8xeHVYRzVjZEZ4MGFXWWdLR1Z1ZEhKNUxtTnlaV1JwZENrZ2UxeHVYSFJjZEZ4MGJXRnJaVU5wZEdGMGFXOXVLR1Z1ZEhKNUxDQnBLVHRjYmx4MFhIUjlYRzVjZEgwcE8xeHVYRzVjZEdsbUlDaDNhVzVrYjNjdWMyTnlaV1Z1TG5kcFpIUm9JRDRnTnpZNEtTQmhkSFJoWTJoSmJXRm5aVXhwYzNSbGJtVnljeWdwTzF4dVhHNWNkQ1JoY25ScFkyeGxUR2x6ZEM1amJHRnpjMHhwYzNRdVlXUmtLQ2R5WldGa2VTY3BPMXh1WEc1Y2RHMWhhMlZCYkhCb1lXSmxkQ2h6YjNKMFMyVjVLVHRjYm4wN1hHNWNibU52Ym5OMElITmxkRVJoZEdGQmJtUlRiM0owUW5sVWFYUnNaU0E5SUNoa1lYUmhLU0E5UGlCN1hHNWNkR1Z1ZEhKcFpYTXVZbmxCZFhSb2IzSWdQU0JrWVhSaE8xeHVYSFJsYm5SeWFXVnpMbUo1VkdsMGJHVWdQU0JrWVhSaExuTnNhV05sS0NrN0lDOHZJR052Y0dsbGN5QmtZWFJoSUdadmNpQmllVlJwZEd4bElITnZjblJjYmx4dVhIUmxiblJ5YVdWekxtSjVWR2wwYkdVdWMyOXlkQ2dvWVN3Z1lpa2dQVDRnZTF4dVhIUmNkR3hsZENCaFZHbDBiR1VnUFNCaExuUnBkR3hsV3pCZExuUnZWWEJ3WlhKRFlYTmxLQ2s3WEc1Y2RGeDBiR1YwSUdKVWFYUnNaU0E5SUdJdWRHbDBiR1ZiTUYwdWRHOVZjSEJsY2tOaGMyVW9LVHRjYmx4MFhIUnBaaUFvWVZScGRHeGxJRDRnWWxScGRHeGxLU0J5WlhSMWNtNGdNVHRjYmx4MFhIUmxiSE5sSUdsbUlDaGhWR2wwYkdVZ1BDQmlWR2wwYkdVcElISmxkSFZ5YmlBdE1UdGNibHgwWEhSbGJITmxJSEpsZEhWeWJpQXdPMXh1WEhSOUtUdGNibjA3WEc1Y2JtTnZibk4wSUdabGRHTm9SR0YwWVNBOUlDZ3BJRDArSUh0Y2JseDBabVYwWTJnb1JFSXBMblJvWlc0b2NtVnpJRDArSUhKbGN5NXFjMjl1S0NrcFhHNWNkQzUwYUdWdUtHUmhkR0VnUFQ0Z2UxeHVYSFJjZEhObGRFUmhkR0ZCYm1SVGIzSjBRbmxVYVhSc1pTaGtZWFJoS1R0Y2JseDBYSFJ5Wlc1a1pYSkZiblJ5YVdWektDazdYRzVjZEZ4MGFHbGtaVXh2WVdScGJtY29LVHRjYmx4MGZTbGNibHgwTG1OaGRHTm9LR1Z5Y2lBOVBpQmpiMjV6YjJ4bExuZGhjbTRvWlhKeUtTazdYRzU5TzF4dVhHNWpiMjV6ZENCcGJtbDBJRDBnS0NrZ1BUNGdlMXh1WEhSemJXOXZkR2h6WTNKdmJHd3VjRzlzZVdacGJHd29LVHRjYmx4MFptVjBZMmhFWVhSaEtDazdYRzVjZEhKbGJtUmxjazVoZGt4bktDazdYRzVjZEhObGRGVndVMjl5ZEVKMWRIUnZibk1vS1R0Y2JseDBZWFIwWVdOb1ZYQkJjbkp2ZDB4cGMzUmxibVZ5Y3lncE8xeHVYSFJoZEhSaFkyaE5iMlJoYkV4cGMzUmxibVZ5Y3lncE8xeHVmVHRjYmx4dWFXNXBkQ2dwTzF4dUlpd2lhVzF3YjNKMElIc2dKSFpwWlhjc0lDUnNhV2RvZEdKdmVDQjlJR1p5YjIwZ0p5NHVMMk52Ym5OMFlXNTBjeWM3WEc1Y2JteGxkQ0JzYVdkb2RHSnZlQ0E5SUdaaGJITmxPMXh1YkdWMElIZ3lJRDBnWm1Gc2MyVTdYRzVzWlhRZ2RtbGxkME5zWVhOek8xeHVYRzVqYjI1emRDQmhkSFJoWTJoSmJXRm5aVXhwYzNSbGJtVnljeUE5SUNncElEMCtJSHRjYmx4MFkyOXVjM1FnSkdsdFlXZGxjeUE5SUVGeWNtRjVMbVp5YjIwb1pHOWpkVzFsYm5RdWNYVmxjbmxUWld4bFkzUnZja0ZzYkNnbkxtRnlkR2xqYkdVdGFXMWhaMlVuS1NrN1hHNWNibHgwSkdsdFlXZGxjeTVtYjNKRllXTm9LR2x0WnlBOVBpQjdYRzVjZEZ4MGFXMW5MbUZrWkVWMlpXNTBUR2x6ZEdWdVpYSW9KMk5zYVdOckp5d2dLR1YyZENrZ1BUNGdlMXh1WEhSY2RGeDBhV1lnS0NGc2FXZG9kR0p2ZUNrZ2UxeHVYSFJjZEZ4MFhIUWtiR2xuYUhSaWIzZ3VZMnhoYzNOTWFYTjBMbUZrWkNnbmMyaHZkeTFwYldjbktUdGNibHgwWEhSY2RGeDBKSFpwWlhjdWMzSmpJRDBnYVcxbkxuTnlZenRjYmx4MFhIUmNkRngwYkdsbmFIUmliM2dnUFNCMGNuVmxPMXh1WEhSY2RGeDBmVnh1WEhSY2RIMHBPMXh1WEhSOUtUdGNibHh1WEhRa2JHbG5hSFJpYjNndVlXUmtSWFpsYm5STWFYTjBaVzVsY2lnblkyeHBZMnNuTENBb1pYWjBLU0E5UGlCN1hHNWNkRngwYVdZZ0tHVjJkQzUwWVhKblpYUWdQVDA5SUNSMmFXVjNLU0J5WlhSMWNtNDdYRzVjZEZ4MEpHeHBaMmgwWW05NExtTnNZWE56VEdsemRDNXlaVzF2ZG1Vb0ozTm9iM2N0YVcxbkp5azdYRzVjZEZ4MGJHbG5hSFJpYjNnZ1BTQm1ZV3h6WlR0Y2JseDBmU2s3WEc1Y2JseDBKSFpwWlhjdVlXUmtSWFpsYm5STWFYTjBaVzVsY2lnblkyeHBZMnNuTENBb0tTQTlQaUI3WEc1Y2RGeDBhV1lnS0NGNE1pa2dlMXh1WEhSY2RGeDBkbWxsZDBOc1lYTnpJRDBnSkhacFpYY3VkMmxrZEdnZ1BDQjNhVzVrYjNjdWFXNXVaWEpYYVdSMGFDQS9JQ2QyYVdWM0xYZ3lMUzF6YlNjZ09pQW5kbWxsZHkxNE1pYzdYRzVjZEZ4MFhIUWtkbWxsZHk1amJHRnpjMHhwYzNRdVlXUmtLSFpwWlhkRGJHRnpjeWs3WEc1Y2RGeDBYSFJ6WlhSVWFXMWxiM1YwS0NncElEMCtJSGd5SUQwZ2RISjFaU3dnTXpBd0tUdGNibHgwWEhSOUlHVnNjMlVnZTF4dVhIUmNkRngwSkhacFpYY3VZMnhoYzNOTWFYTjBMbkpsYlc5MlpTaDJhV1YzUTJ4aGMzTXBPMXh1WEhSY2RGeDBKR3hwWjJoMFltOTRMbU5zWVhOelRHbHpkQzV5WlcxdmRtVW9KM05vYjNjdGFXMW5KeWs3WEc1Y2RGeDBYSFI0TWlBOUlHWmhiSE5sTzF4dVhIUmNkRngwYkdsbmFIUmliM2dnUFNCbVlXeHpaVHRjYmx4MFhIUjlYRzVjZEgwcE8xeHVmVHRjYmx4dVpYaHdiM0owSUdSbFptRjFiSFFnWVhSMFlXTm9TVzFoWjJWTWFYTjBaVzVsY25NN0lpd2lhVzF3YjNKMElIc2dKRzF2WkdGc0lIMGdabkp2YlNBbkxpNHZZMjl1YzNSaGJuUnpKenRjYmx4dWJHVjBJRzF2WkdGc0lEMGdabUZzYzJVN1hHNWpiMjV6ZENCaGRIUmhZMmhOYjJSaGJFeHBjM1JsYm1WeWN5QTlJQ2dwSUQwK0lIdGNibHgwWTI5dWMzUWdKR1pwYm1RZ1BTQmtiMk4xYldWdWRDNW5aWFJGYkdWdFpXNTBRbmxKWkNnbmFuTXRabWx1WkNjcE8xeHVYSFJjYmx4MEpHWnBibVF1WVdSa1JYWmxiblJNYVhOMFpXNWxjaWduWTJ4cFkyc25MQ0FvS1NBOVBpQjdYRzVjZEZ4MEpHMXZaR0ZzTG1Oc1lYTnpUR2x6ZEM1aFpHUW9KM05vYjNjbktUdGNibHgwWEhSdGIyUmhiQ0E5SUhSeWRXVTdYRzVjZEgwcE8xeHVYRzVjZENSdGIyUmhiQzVoWkdSRmRtVnVkRXhwYzNSbGJtVnlLQ2RqYkdsamF5Y3NJQ2dwSUQwK0lIdGNibHgwWEhRa2JXOWtZV3d1WTJ4aGMzTk1hWE4wTG5KbGJXOTJaU2duYzJodmR5Y3BPMXh1WEhSY2RHMXZaR0ZzSUQwZ1ptRnNjMlU3WEc1Y2RIMHBPMXh1WEc1Y2RIZHBibVJ2ZHk1aFpHUkZkbVZ1ZEV4cGMzUmxibVZ5S0NkclpYbGtiM2R1Snl3Z0tDa2dQVDRnZTF4dVhIUmNkR2xtSUNodGIyUmhiQ2tnZTF4dVhIUmNkRngwYzJWMFZHbHRaVzkxZENnb0tTQTlQaUI3WEc1Y2RGeDBYSFJjZENSdGIyUmhiQzVqYkdGemMweHBjM1F1Y21WdGIzWmxLQ2R6YUc5M0p5azdYRzVjZEZ4MFhIUmNkRzF2WkdGc0lEMGdabUZzYzJVN1hHNWNkRngwWEhSOUxDQTJNREFwTzF4dVhIUmNkSDA3WEc1Y2RIMHBPMXh1ZlR0Y2JseHVaWGh3YjNKMElHUmxabUYxYkhRZ1lYUjBZV05vVFc5a1lXeE1hWE4wWlc1bGNuTTdJaXdpYVcxd2IzSjBJSHNnSkhScGRHeGxMQ0FrY0dGeVlXeHNZWGdzSUNSMWNFRnljbTkzSUgwZ1puSnZiU0FuTGk0dlkyOXVjM1JoYm5Sekp6dGNibWx0Y0c5eWRDQjdJSE5qY205c2JGUnZWRzl3SUgwZ1puSnZiU0FuTGk0dmRYUnBiSE1uTzF4dVhHNXNaWFFnY0hKbGRqdGNibXhsZENCamRYSnlaVzUwSUQwZ01EdGNibXhsZENCcGMxTm9iM2RwYm1jZ1BTQm1ZV3h6WlR0Y2JseHVZMjl1YzNRZ1lYUjBZV05vVlhCQmNuSnZkMHhwYzNSbGJtVnljeUE5SUNncElEMCtJSHRjYmx4MEpIQmhjbUZzYkdGNExtRmtaRVYyWlc1MFRHbHpkR1Z1WlhJb0ozTmpjbTlzYkNjc0lDZ3BJRDArSUh0Y2JseDBYSFJzWlhRZ2VTQTlJQ1IwYVhSc1pTNW5aWFJDYjNWdVpHbHVaME5zYVdWdWRGSmxZM1FvS1M1NU8xeHVYRzVjZEZ4MGFXWWdLR04xY25KbGJuUWdJVDA5SUhrcElIdGNibHgwWEhSY2RIQnlaWFlnUFNCamRYSnlaVzUwTzF4dVhIUmNkRngwWTNWeWNtVnVkQ0E5SUhrN1hHNWNkRngwZlR0Y2JseHVYSFJjZEdsbUlDaDVJRHc5SUMwMU1DQW1KaUFoYVhOVGFHOTNhVzVuS1NCN1hHNWNkRngwWEhRa2RYQkJjbkp2ZHk1amJHRnpjMHhwYzNRdVlXUmtLQ2R6YUc5M0p5azdYRzVjZEZ4MFhIUnBjMU5vYjNkcGJtY2dQU0IwY25WbE8xeHVYSFJjZEgwZ1pXeHpaU0JwWmlBb2VTQStJQzAxTUNBbUppQnBjMU5vYjNkcGJtY3BJSHRjYmx4MFhIUmNkQ1IxY0VGeWNtOTNMbU5zWVhOelRHbHpkQzV5WlcxdmRtVW9KM05vYjNjbktUdGNibHgwWEhSY2RHbHpVMmh2ZDJsdVp5QTlJR1poYkhObE8xeHVYSFJjZEgxY2JseDBmU2s3WEc1Y2JseDBKSFZ3UVhKeWIzY3VZV1JrUlhabGJuUk1hWE4wWlc1bGNpZ25ZMnhwWTJzbkxDQW9LU0E5UGlCelkzSnZiR3hVYjFSdmNDZ3BLVHRjYm4wN1hHNWNibVY0Y0c5eWRDQmtaV1poZFd4MElHRjBkR0ZqYUZWd1FYSnliM2RNYVhOMFpXNWxjbk03SWl3aWFXMXdiM0owSUdGMGRHRmphRTF2WkdGc1RHbHpkR1Z1WlhKeklHWnliMjBnSnk0dllYUjBZV05vVFc5a1lXeE1hWE4wWlc1bGNuTW5PMXh1YVcxd2IzSjBJR0YwZEdGamFGVndRWEp5YjNkTWFYTjBaVzVsY25NZ1puSnZiU0FuTGk5aGRIUmhZMmhWY0VGeWNtOTNUR2x6ZEdWdVpYSnpKenRjYm1sdGNHOXlkQ0JoZEhSaFkyaEpiV0ZuWlV4cGMzUmxibVZ5Y3lCbWNtOXRJQ2N1TDJGMGRHRmphRWx0WVdkbFRHbHpkR1Z1WlhKekp6dGNibWx0Y0c5eWRDQnRZV3RsUVd4d2FHRmlaWFFnWm5KdmJTQW5MaTl0WVd0bFFXeHdhR0ZpWlhRbk8xeHVhVzF3YjNKMElHMWhhMlZUYkdsa1pYSWdabkp2YlNBbkxpOXRZV3RsVTJ4cFpHVnlKenRjYmx4dVpYaHdiM0owSUhzZ1hHNWNkR0YwZEdGamFFMXZaR0ZzVEdsemRHVnVaWEp6TENCY2JseDBZWFIwWVdOb1ZYQkJjbkp2ZDB4cGMzUmxibVZ5Y3l4Y2JseDBZWFIwWVdOb1NXMWhaMlZNYVhOMFpXNWxjbk1zWEc1Y2RHMWhhMlZCYkhCb1lXSmxkQ3dnWEc1Y2RHMWhhMlZUYkdsa1pYSWdYRzU5T3lJc0ltTnZibk4wSUdGc2NHaGhZbVYwSUQwZ1d5ZGhKeXdnSjJJbkxDQW5ZeWNzSUNka0p5d2dKMlVuTENBblppY3NJQ2RuSnl3Z0oyZ25MQ0FuYVNjc0lDZHFKeXdnSjJzbkxDQW5iQ2NzSUNkdEp5d2dKMjRuTENBbmJ5Y3NJQ2R3Snl3Z0ozSW5MQ0FuY3ljc0lDZDBKeXdnSjNVbkxDQW5kaWNzSUNkM0p5d2dKM2tuTENBbmVpZGRPMXh1WEc1amIyNXpkQ0J0WVd0bFFXeHdhR0ZpWlhRZ1BTQW9jMjl5ZEV0bGVTa2dQVDRnZTF4dVhIUmpiMjV6ZENCbWFXNWtSbWx5YzNSRmJuUnllU0E5SUNoamFHRnlLU0E5UGlCN1hHNWNkRngwWTI5dWMzUWdjMlZzWldOMGIzSWdQU0J6YjNKMFMyVjVJRDhnSnk1cWN5MWxiblJ5ZVMxMGFYUnNaU2NnT2lBbkxtcHpMV1Z1ZEhKNUxXRnlkR2x6ZENjN1hHNWNkRngwWTI5dWMzUWdjSEpsZGxObGJHVmpkRzl5SUQwZ0lYTnZjblJMWlhrZ1B5QW5MbXB6TFdWdWRISjVMWFJwZEd4bEp5QTZJQ2N1YW5NdFpXNTBjbmt0WVhKMGFYTjBKenRjYmx4dVhIUmNkR052Ym5OMElDUmxiblJ5YVdWeklEMGdRWEp5WVhrdVpuSnZiU2hrYjJOMWJXVnVkQzV4ZFdWeWVWTmxiR1ZqZEc5eVFXeHNLSE5sYkdWamRHOXlLU2s3WEc1Y2RGeDBZMjl1YzNRZ0pIQnlaWFpGYm5SeWFXVnpJRDBnUVhKeVlYa3Vabkp2YlNoa2IyTjFiV1Z1ZEM1eGRXVnllVk5sYkdWamRHOXlRV3hzS0hCeVpYWlRaV3hsWTNSdmNpa3BPMXh1WEc1Y2RGeDBKSEJ5WlhaRmJuUnlhV1Z6TG1admNrVmhZMmdvWlc1MGNua2dQVDRnWlc1MGNua3VjbVZ0YjNabFFYUjBjbWxpZFhSbEtDZHVZVzFsSnlrcE8xeHVYRzVjZEZ4MGNtVjBkWEp1SUNSbGJuUnlhV1Z6TG1acGJtUW9aVzUwY25rZ1BUNGdlMXh1WEhSY2RGeDBiR1YwSUc1dlpHVWdQU0JsYm5SeWVTNXVaWGgwUld4bGJXVnVkRk5wWW14cGJtYzdYRzVjZEZ4MFhIUnlaWFIxY200Z2JtOWtaUzVwYm01bGNraFVUVXhiTUYwZ1BUMDlJR05vWVhJZ2ZId2dibTlrWlM1cGJtNWxja2hVVFV4Yk1GMGdQVDA5SUdOb1lYSXVkRzlWY0hCbGNrTmhjMlVvS1R0Y2JseDBYSFI5S1R0Y2JseDBmVHRjYmx4dVhIUmpiMjV6ZENCaGRIUmhZMmhCYm1Ob2IzSk1hWE4wWlc1bGNpQTlJQ2drWVc1amFHOXlMQ0JzWlhSMFpYSXBJRDArSUh0Y2JseDBYSFFrWVc1amFHOXlMbUZrWkVWMlpXNTBUR2x6ZEdWdVpYSW9KMk5zYVdOckp5d2dLQ2tnUFQ0Z2UxeHVYSFJjZEZ4MFkyOXVjM1FnYkdWMGRHVnlUbTlrWlNBOUlHUnZZM1Z0Wlc1MExtZGxkRVZzWlcxbGJuUkNlVWxrS0d4bGRIUmxjaWs3WEc1Y2RGeDBYSFJzWlhRZ2RHRnlaMlYwTzF4dVhHNWNkRngwWEhScFppQW9JWE52Y25STFpYa3BJSHRjYmx4MFhIUmNkRngwZEdGeVoyVjBJRDBnYkdWMGRHVnlJRDA5UFNBbllTY2dQeUJrYjJOMWJXVnVkQzVuWlhSRmJHVnRaVzUwUW5sSlpDZ25ZVzVqYUc5eUxYUmhjbWRsZENjcElEb2diR1YwZEdWeVRtOWtaUzV3WVhKbGJuUkZiR1Z0Wlc1MExuQmhjbVZ1ZEVWc1pXMWxiblF1Y0dGeVpXNTBSV3hsYldWdWRDNXdZWEpsYm5SRmJHVnRaVzUwTG5CeVpYWnBiM1Z6Uld4bGJXVnVkRk5wWW14cGJtY3VjWFZsY25sVFpXeGxZM1J2Y2lnbkxtcHpMV0Z5ZEdsamJHVXRZVzVqYUc5eUxYUmhjbWRsZENjcE8xeHVYSFJjZEZ4MGZTQmxiSE5sSUh0Y2JseDBYSFJjZEZ4MGRHRnlaMlYwSUQwZ2JHVjBkR1Z5SUQwOVBTQW5ZU2NnUHlCa2IyTjFiV1Z1ZEM1blpYUkZiR1Z0Wlc1MFFubEpaQ2duWVc1amFHOXlMWFJoY21kbGRDY3BJRG9nYkdWMGRHVnlUbTlrWlM1d1lYSmxiblJGYkdWdFpXNTBMbkJoY21WdWRFVnNaVzFsYm5RdWNHRnlaVzUwUld4bGJXVnVkQzV3Y21WMmFXOTFjMFZzWlcxbGJuUlRhV0pzYVc1bkxuRjFaWEo1VTJWc1pXTjBiM0lvSnk1cWN5MWhjblJwWTJ4bExXRnVZMmh2Y2kxMFlYSm5aWFFuS1R0Y2JseDBYSFJjZEgwN1hHNWNibHgwWEhSY2RIUmhjbWRsZEM1elkzSnZiR3hKYm5SdlZtbGxkeWg3WW1Wb1lYWnBiM0k2SUZ3aWMyMXZiM1JvWENJc0lHSnNiMk5yT2lCY0luTjBZWEowWENKOUtUdGNibHgwWEhSOUtUdGNibHgwZlR0Y2JseHVYSFJzWlhRZ1lXTjBhWFpsUlc1MGNtbGxjeUE5SUh0OU8xeHVYSFJzWlhRZ0pHOTFkR1Z5SUQwZ1pHOWpkVzFsYm5RdWNYVmxjbmxUWld4bFkzUnZjaWduTG1Gc2NHaGhZbVYwWDE5c1pYUjBaWEp6SnlrN1hHNWNkQ1J2ZFhSbGNpNXBibTVsY2toVVRVd2dQU0FuSnp0Y2JseHVYSFJoYkhCb1lXSmxkQzVtYjNKRllXTm9LR3hsZEhSbGNpQTlQaUI3WEc1Y2RGeDBiR1YwSUNSbWFYSnpkRVZ1ZEhKNUlEMGdabWx1WkVacGNuTjBSVzUwY25rb2JHVjBkR1Z5S1R0Y2JseDBYSFJzWlhRZ0pHRnVZMmh2Y2lBOUlHUnZZM1Z0Wlc1MExtTnlaV0YwWlVWc1pXMWxiblFvSjJFbktUdGNibHh1WEhSY2RHbG1JQ2doSkdacGNuTjBSVzUwY25rcElISmxkSFZ5Ymp0Y2JseHVYSFJjZENSbWFYSnpkRVZ1ZEhKNUxtbGtJRDBnYkdWMGRHVnlPMXh1WEhSY2RDUmhibU5vYjNJdWFXNXVaWEpJVkUxTUlEMGdiR1YwZEdWeUxuUnZWWEJ3WlhKRFlYTmxLQ2s3WEc1Y2RGeDBKR0Z1WTJodmNpNWpiR0Z6YzA1aGJXVWdQU0FuWVd4d2FHRmlaWFJmWDJ4bGRIUmxjaTFoYm1Ob2IzSW5PMXh1WEc1Y2RGeDBZWFIwWVdOb1FXNWphRzl5VEdsemRHVnVaWElvSkdGdVkyaHZjaXdnYkdWMGRHVnlLVHRjYmx4MFhIUWtiM1YwWlhJdVlYQndaVzVrUTJocGJHUW9KR0Z1WTJodmNpazdYRzVjZEgwcE8xeHVmVHRjYmx4dVpYaHdiM0owSUdSbFptRjFiSFFnYldGclpVRnNjR2hoWW1WME95SXNJbU52Ym5OMElHMWhhMlZUYkdsa1pYSWdQU0FvSkhOc2FXUmxjaWtnUFQ0Z2UxeHVYSFJqYjI1emRDQWtZWEp5YjNkT1pYaDBJRDBnSkhOc2FXUmxjaTV3WVhKbGJuUkZiR1Z0Wlc1MExuRjFaWEo1VTJWc1pXTjBiM0lvSnk1aGNuSnZkeTF1WlhoMEp5azdYRzVjZEdOdmJuTjBJQ1JoY25KdmQxQnlaWFlnUFNBa2MyeHBaR1Z5TG5CaGNtVnVkRVZzWlcxbGJuUXVjWFZsY25sVFpXeGxZM1J2Y2lnbkxtRnljbTkzTFhCeVpYWW5LVHRjYmx4dVhIUnNaWFFnWTNWeWNtVnVkQ0E5SUNSemJHbGtaWEl1Wm1seWMzUkZiR1Z0Wlc1MFEyaHBiR1E3WEc1Y2RDUmhjbkp2ZDA1bGVIUXVZV1JrUlhabGJuUk1hWE4wWlc1bGNpZ25ZMnhwWTJzbkxDQW9LU0E5UGlCN1hHNWNkRngwWTI5dWMzUWdibVY0ZENBOUlHTjFjbkpsYm5RdWJtVjRkRVZzWlcxbGJuUlRhV0pzYVc1bk8xeHVYSFJjZEdsbUlDaHVaWGgwS1NCN1hHNWNkRngwWEhSdVpYaDBMbk5qY205c2JFbHVkRzlXYVdWM0tIdGlaV2hoZG1sdmNqb2dYQ0p6Ylc5dmRHaGNJaXdnWW14dlkyczZJRndpYm1WaGNtVnpkRndpTENCcGJteHBibVU2SUZ3aVkyVnVkR1Z5WENKOUtUdGNibHgwWEhSY2RHTjFjbkpsYm5RZ1BTQnVaWGgwTzF4dVhIUmNkSDFjYmx4MGZTazdYRzVjYmx4MEpHRnljbTkzVUhKbGRpNWhaR1JGZG1WdWRFeHBjM1JsYm1WeUtDZGpiR2xqYXljc0lDZ3BJRDArSUh0Y2JseDBYSFJqYjI1emRDQndjbVYySUQwZ1kzVnljbVZ1ZEM1d2NtVjJhVzkxYzBWc1pXMWxiblJUYVdKc2FXNW5PMXh1WEhSY2RHbG1JQ2h3Y21WMktTQjdYRzVjZEZ4MFhIUndjbVYyTG5OamNtOXNiRWx1ZEc5V2FXVjNLSHRpWldoaGRtbHZjam9nWENKemJXOXZkR2hjSWl3Z1lteHZZMnM2SUZ3aWJtVmhjbVZ6ZEZ3aUxDQnBibXhwYm1VNklGd2lZMlZ1ZEdWeVhDSjlLVHRjYmx4MFhIUmNkR04xY25KbGJuUWdQU0J3Y21WMk8xeHVYSFJjZEgxY2JseDBmU2xjYm4wN1hHNWNibVY0Y0c5eWRDQmtaV1poZFd4MElHMWhhMlZUYkdsa1pYSTdJaXdpWTI5dWMzUWdhVzFoWjJWVVpXMXdiR0YwWlNBOUlDaHBiV0ZuWlNrZ1BUNGdZRnh1UEdScGRpQmpiR0Z6Y3oxY0ltRnlkR2xqYkdVdGFXMWhaMlZmWDI5MWRHVnlYQ0krWEc1Y2REeHBiV2NnWTJ4aGMzTTlYQ0poY25ScFkyeGxMV2x0WVdkbFhDSWdjM0pqUFZ3aUxpNHZMaTR2WVhOelpYUnpMMmx0WVdkbGN5OGtlMmx0WVdkbGZWd2lQand2YVcxblBseHVQQzlrYVhZK1hHNWdPMXh1WEc1amIyNXpkQ0JoY25ScFkyeGxWR1Z0Y0d4aGRHVWdQU0FvWlc1MGNua3NJR2twSUQwK0lIdGNibHgwWTI5dWMzUWdleUIwYVhSc1pTd2dabWx5YzNST1lXMWxMQ0JzWVhOMFRtRnRaU3dnYVcxaFoyVnpMQ0JrWlhOamNtbHdkR2x2Yml3Z1kyOXVkR1Z1ZEhNc0lHUnBiV1Z1YzJsdmJuTXNJSGxsWVhJc0lHbHpZbTRzSUc5amJHTXNJR3hwYm1zZ2ZTQTlJR1Z1ZEhKNU8xeHVYRzVjZEdOdmJuTjBJR2x0WVdkbFNGUk5UQ0E5SUdsdFlXZGxjeTVzWlc1bmRHZ2dQeUJjYmx4MFhIUnBiV0ZuWlhNdWJXRndLR2x0WVdkbElEMCtJR2x0WVdkbFZHVnRjR3hoZEdVb2FXMWhaMlVwS1M1cWIybHVLQ2NuS1NBNklDY25PMXh1WEc1Y2RISmxkSFZ5YmlCZ1hHNWNkRngwUEdGeWRHbGpiR1VnWTJ4aGMzTTlYQ0poY25ScFkyeGxYMTl2ZFhSbGNsd2lQbHh1WEhSY2RGeDBQR1JwZGlCamJHRnpjejFjSW1GeWRHbGpiR1ZmWDJsdWJtVnlYQ0krWEc1Y2RGeDBYSFJjZER4a2FYWWdZMnhoYzNNOVhDSmhjblJwWTJ4bFgxOW9aV0ZrYVc1blhDSStYRzVjZEZ4MFhIUmNkRngwUEdFZ1kyeGhjM005WENKcWN5MWxiblJ5ZVMxMGFYUnNaVndpUGp3dllUNWNibHgwWEhSY2RGeDBYSFE4YURJZ1kyeGhjM005WENKaGNuUnBZMnhsTFdobFlXUnBibWRmWDNScGRHeGxYQ0krSkh0MGFYUnNaWDA4TDJneVBseHVYSFJjZEZ4MFhIUmNkRHhrYVhZZ1kyeGhjM005WENKaGNuUnBZMnhsTFdobFlXUnBibWRmWDI1aGJXVmNJajVjYmx4MFhIUmNkRngwWEhSY2REeHpjR0Z1SUdOc1lYTnpQVndpWVhKMGFXTnNaUzFvWldGa2FXNW5YMTl1WVcxbExTMW1hWEp6ZEZ3aVBpUjdabWx5YzNST1lXMWxmVHd2YzNCaGJqNWNibHgwWEhSY2RGeDBYSFJjZER4aElHTnNZWE56UFZ3aWFuTXRaVzUwY25rdFlYSjBhWE4wWENJK1BDOWhQbHh1WEhSY2RGeDBYSFJjZEZ4MFBITndZVzRnWTJ4aGMzTTlYQ0poY25ScFkyeGxMV2hsWVdScGJtZGZYMjVoYldVdExXeGhjM1JjSWo0a2UyeGhjM1JPWVcxbGZUd3ZjM0JoYmo1Y2JseDBYSFJjZEZ4MFhIUThMMlJwZGo1Y2JseDBYSFJjZEZ4MFBDOWthWFkrWEhSY2JseDBYSFJjZEZ4MFBHUnBkaUJqYkdGemN6MWNJbUZ5ZEdsamJHVmZYM05zYVdSbGNpMXZkWFJsY2x3aVBseHVYSFJjZEZ4MFhIUmNkRHhrYVhZZ1kyeGhjM005WENKaGNuUnBZMnhsWDE5emJHbGtaWEl0YVc1dVpYSmNJaUJwWkQxY0luTnNhV1JsY2kwa2UybDlYQ0krWEc1Y2RGeDBYSFJjZEZ4MFhIUWtlMmx0WVdkbFNGUk5USDFjYmx4MFhIUmNkRngwWEhSY2REeGthWFlnWTJ4aGMzTTlYQ0poY25ScFkyeGxMV1JsYzJOeWFYQjBhVzl1WDE5dmRYUmxjbHdpUGx4dVhIUmNkRngwWEhSY2RGeDBYSFE4WkdsMklHTnNZWE56UFZ3aVlYSjBhV05zWlMxa1pYTmpjbWx3ZEdsdmJsd2lQaVI3WkdWelkzSnBjSFJwYjI1OVBDOWthWFkrWEc1Y2RGeDBYSFJjZEZ4MFhIUmNkRHhrYVhZZ1kyeGhjM005WENKaGNuUnBZMnhsTFdSbGRHRnBiRndpUGlSN1kyOXVkR1Z1ZEhOOVBDOWthWFkrWEc1Y2RGeDBYSFJjZEZ4MFhIUmNkRHhrYVhZZ1kyeGhjM005WENKaGNuUnBZMnhsTFdSbGRHRnBiQ0JoY25ScFkyeGxMV1JsZEdGcGJDMHRiV0Z5WjJsdVhDSStKSHRrYVcxbGJuTnBiMjV6ZlR3dlpHbDJQbHh1WEhSY2RGeDBYSFJjZEZ4MFhIUThaR2wySUdOc1lYTnpQVndpWVhKMGFXTnNaUzFrWlhSaGFXd2dZWEowYVdOc1pTMWtaWFJoYVd3dExXMWhjbWRwYmx3aVBpUjdlV1ZoY24wOEwyUnBkajVjYmx4MFhIUmNkRngwWEhSY2RGeDBQR1JwZGlCamJHRnpjejFjSW1GeWRHbGpiR1V0WkdWMFlXbHNJR0Z5ZEdsamJHVXRaR1YwWVdsc0xTMXRZWEpuYVc1Y0lqNGtlMmx6WW01OVBDOWthWFkrWEc1Y2RGeDBYSFJjZEZ4MFhIUmNkRHhrYVhZZ1kyeGhjM005WENKaGNuUnBZMnhsTFdSbGRHRnBiRndpUGs5RFRFTWdQR0VnWTJ4aGMzTTlYQ0poY25ScFkyeGxMV1JsZEdGcGJDMHRiR2x1YTF3aUlIUmhjbWRsZEQxY0lsOWliR0Z1YTF3aUlHaHlaV1k5WENJa2UyeHBibXQ5WENJK0pIdHZZMnhqZlR3dllUNDhMMlJwZGo1Y2JseDBYSFJjZEZ4MFhIUmNkRHd2WkdsMlBseHVYSFJjZEZ4MFhIUmNkRHd2WkdsMlBseHVYSFJjZEZ4MFhIUmNkRHhrYVhZZ1kyeGhjM005WENKaGNuUnBZMnhsWDE5elkzSnZiR3d0WTI5dWRISnZiSE5jSWo1Y2JseDBYSFJjZEZ4MFhIUmNkRHh6Y0dGdUlHTnNZWE56UFZ3aVkyOXVkSEp2YkhNZ1lYSnliM2N0Y0hKbGRsd2lQdUtHa0R3dmMzQmhiajRnWEc1Y2RGeDBYSFJjZEZ4MFhIUThjM0JoYmlCamJHRnpjejFjSW1OdmJuUnliMnh6SUdGeWNtOTNMVzVsZUhSY0lqN2locEk4TDNOd1lXNCtYRzVjZEZ4MFhIUmNkRngwUEM5a2FYWStYRzVjZEZ4MFhIUmNkRngwUEhBZ1kyeGhjM005WENKcWN5MWhjblJwWTJ4bExXRnVZMmh2Y2kxMFlYSm5aWFJjSWo0OEwzQStYRzVjZEZ4MFhIUThMMlJwZGo1Y2JseDBYSFE4TDJGeWRHbGpiR1UrWEc1Y2RHQTdYRzU5TzF4dVhHNWxlSEJ2Y25RZ1pHVm1ZWFZzZENCaGNuUnBZMnhsVkdWdGNHeGhkR1U3SWl3aWFXMXdiM0owSUdGeWRHbGpiR1ZVWlcxd2JHRjBaU0JtY205dElDY3VMMkZ5ZEdsamJHVW5PMXh1YVcxd2IzSjBJSEpsYm1SbGNrNWhka3huSUdaeWIyMGdKeTR2Ym1GMlRHY25PMXh1WEc1bGVIQnZjblFnZXlCaGNuUnBZMnhsVkdWdGNHeGhkR1VzSUhKbGJtUmxjazVoZGt4bklIMDdJaXdpWTI5dWMzUWdkR1Z0Y0d4aGRHVWdQU0JjYmx4MFlEeGthWFlnWTJ4aGMzTTlYQ0p1WVhaZlgybHVibVZ5WENJK1hHNWNkRngwUEdScGRpQmpiR0Z6Y3oxY0ltNWhkbDlmYzI5eWRDMWllVndpUGx4dVhIUmNkRngwUEhOd1lXNGdZMnhoYzNNOVhDSnpiM0owTFdKNVgxOTBhWFJzWlZ3aVBsTnZjblFnWW5rOEwzTndZVzQrWEc1Y2RGeDBYSFE4WW5WMGRHOXVJR05zWVhOelBWd2ljMjl5ZEMxaWVTQnpiM0owTFdKNVgxOWllUzFoY25ScGMzUWdZV04wYVhabFhDSWdhV1E5WENKcWN5MWllUzFoY25ScGMzUmNJajVCY25ScGMzUThMMkoxZEhSdmJqNWNibHgwWEhSY2REeHpjR0Z1SUdOc1lYTnpQVndpYzI5eWRDMWllVjlmWkdsMmFXUmxjbHdpUGlCOElEd3ZjM0JoYmo1Y2JseDBYSFJjZER4aWRYUjBiMjRnWTJ4aGMzTTlYQ0p6YjNKMExXSjVJSE52Y25RdFlubGZYMko1TFhScGRHeGxYQ0lnYVdROVhDSnFjeTFpZVMxMGFYUnNaVndpUGxScGRHeGxQQzlpZFhSMGIyNCtYRzVjZEZ4MFhIUThjM0JoYmlCamJHRnpjejFjSW1acGJtUmNJaUJwWkQxY0ltcHpMV1pwYm1SY0lqNWNibHgwWEhSY2RGeDBLRHh6Y0dGdUlHTnNZWE56UFZ3aVptbHVaQzB0YVc1dVpYSmNJajRtSXpnNU9EUTdSand2YzNCaGJqNHBYRzVjZEZ4MFhIUThMM053WVc0K1hHNWNkRngwUEM5a2FYWStYRzVjZEZ4MFBHUnBkaUJqYkdGemN6MWNJbTVoZGw5ZllXeHdhR0ZpWlhSY0lqNWNibHgwWEhSY2REeHpjR0Z1SUdOc1lYTnpQVndpWVd4d2FHRmlaWFJmWDNScGRHeGxYQ0krUjI4Z2RHODhMM053WVc0K1hHNWNkRngwWEhROFpHbDJJR05zWVhOelBWd2lZV3h3YUdGaVpYUmZYMnhsZEhSbGNuTmNJajQ4TDJScGRqNWNibHgwWEhROEwyUnBkajVjYmx4MFBDOWthWFkrWUR0Y2JseHVZMjl1YzNRZ2NtVnVaR1Z5VG1GMlRHY2dQU0FvS1NBOVBpQjdYRzVjZEd4bGRDQnVZWFpQZFhSbGNpQTlJR1J2WTNWdFpXNTBMbWRsZEVWc1pXMWxiblJDZVVsa0tDZHFjeTF1WVhZbktUdGNibHgwYm1GMlQzVjBaWEl1YVc1dVpYSklWRTFNSUQwZ2RHVnRjR3hoZEdVN1hHNTlPMXh1WEc1bGVIQnZjblFnWkdWbVlYVnNkQ0J5Wlc1a1pYSk9ZWFpNWnpzaUxDSnBiWEJ2Y25RZ2V5QWtiRzloWkdsdVp5d2dKRzVoZGl3Z0pIQmhjbUZzYkdGNExDQWtZMjl1ZEdWdWRDd2dKSFJwZEd4bExDQWtZWEp5YjNjc0lDUnRiMlJoYkN3Z0pHeHBaMmgwWW05NExDQWtkbWxsZHlCOUlHWnliMjBnSnk0dUwyTnZibk4wWVc1MGN5YzdYRzVjYm1OdmJuTjBJR1JsWW05MWJtTmxJRDBnS0dadUxDQjBhVzFsS1NBOVBpQjdYRzRnSUd4bGRDQjBhVzFsYjNWME8xeHVYRzRnSUhKbGRIVnliaUJtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0JqYjI1emRDQm1kVzVqZEdsdmJrTmhiR3dnUFNBb0tTQTlQaUJtYmk1aGNIQnNlU2gwYUdsekxDQmhjbWQxYldWdWRITXBPMXh1SUNBZ0lGeHVJQ0FnSUdOc1pXRnlWR2x0Wlc5MWRDaDBhVzFsYjNWMEtUdGNiaUFnSUNCMGFXMWxiM1YwSUQwZ2MyVjBWR2x0Wlc5MWRDaG1kVzVqZEdsdmJrTmhiR3dzSUhScGJXVXBPMXh1SUNCOVhHNTlPMXh1WEc1amIyNXpkQ0JvYVdSbFRHOWhaR2x1WnlBOUlDZ3BJRDArSUh0Y2JseDBKR3h2WVdScGJtY3VabTl5UldGamFDaGxiR1Z0SUQwK0lHVnNaVzB1WTJ4aGMzTk1hWE4wTG1Ga1pDZ25jbVZoWkhrbktTazdYRzVjZENSdVlYWXVZMnhoYzNOTWFYTjBMbUZrWkNnbmNtVmhaSGtuS1R0Y2JuMDdYRzVjYm1OdmJuTjBJSE5qY205c2JGUnZWRzl3SUQwZ0tDa2dQVDRnZTF4dVhIUnNaWFFnZEc5d0lEMGdaRzlqZFcxbGJuUXVaMlYwUld4bGJXVnVkRUo1U1dRb0oyRnVZMmh2Y2kxMFlYSm5aWFFuS1R0Y2JseDBkRzl3TG5OamNtOXNiRWx1ZEc5V2FXVjNLSHRpWldoaGRtbHZjam9nWENKemJXOXZkR2hjSWl3Z1lteHZZMnM2SUZ3aWMzUmhjblJjSW4wcE8xeHVmVHRjYmx4dVpYaHdiM0owSUhzZ1pHVmliM1Z1WTJVc0lHaHBaR1ZNYjJGa2FXNW5MQ0J6WTNKdmJHeFViMVJ2Y0NCOU95SmRmUT09In0=
