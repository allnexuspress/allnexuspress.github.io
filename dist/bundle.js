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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvc21vb3Roc2Nyb2xsLXBvbHlmaWxsL2Rpc3Qvc21vb3Roc2Nyb2xsLmpzIiwibm9kZV9tb2R1bGVzL3doYXR3Zy1mZXRjaC9mZXRjaC5qcyIsInNyYy9qcy9jb25zdGFudHMuanMiLCJzcmMvanMvaW5kZXguanMiLCJzcmMvanMvbW9kdWxlcy9hdHRhY2hJbWFnZUxpc3RlbmVycy5qcyIsInNyYy9qcy9tb2R1bGVzL2F0dGFjaE1vZGFsTGlzdGVuZXJzLmpzIiwic3JjL2pzL21vZHVsZXMvYXR0YWNoVXBBcnJvd0xpc3RlbmVycy5qcyIsInNyYy9qcy9tb2R1bGVzL2luZGV4LmpzIiwic3JjL2pzL21vZHVsZXMvbWFrZUFscGhhYmV0LmpzIiwic3JjL2pzL21vZHVsZXMvbWFrZVNsaWRlci5qcyIsInNyYy9qcy90ZW1wbGF0ZXMvYXJ0aWNsZS5qcyIsInNyYy9qcy90ZW1wbGF0ZXMvaW5kZXguanMiLCJzcmMvanMvdGVtcGxhdGVzL25hdkxnLmpzIiwic3JjL2pzL3V0aWxzL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2YkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7OztBQ2xkQSxJQUFNLEtBQUssK0ZBQVg7O0FBRUEsSUFBTSxXQUFXLE1BQU0sSUFBTixDQUFXLFNBQVMsZ0JBQVQsQ0FBMEIsVUFBMUIsQ0FBWCxDQUFqQjtBQUNBLElBQU0sZUFBZSxTQUFTLGNBQVQsQ0FBd0IsU0FBeEIsQ0FBckI7QUFDQSxJQUFNLE9BQU8sU0FBUyxjQUFULENBQXdCLFFBQXhCLENBQWI7QUFDQSxJQUFNLFlBQVksU0FBUyxhQUFULENBQXVCLFdBQXZCLENBQWxCO0FBQ0EsSUFBTSxXQUFXLFNBQVMsYUFBVCxDQUF1QixVQUF2QixDQUFqQjtBQUNBLElBQU0sU0FBUyxTQUFTLGNBQVQsQ0FBd0IsVUFBeEIsQ0FBZjtBQUNBLElBQU0sV0FBVyxTQUFTLGNBQVQsQ0FBd0IsVUFBeEIsQ0FBakI7QUFDQSxJQUFNLFNBQVMsU0FBUyxhQUFULENBQXVCLFFBQXZCLENBQWY7QUFDQSxJQUFNLFlBQVksU0FBUyxhQUFULENBQXVCLFdBQXZCLENBQWxCO0FBQ0EsSUFBTSxRQUFRLFNBQVMsYUFBVCxDQUF1QixnQkFBdkIsQ0FBZDtBQUNBLElBQU0sVUFBVSxDQUFDLFFBQUQsRUFBVyxPQUFYLENBQWhCOztRQUdDLEUsR0FBQSxFO1FBQ0EsUSxHQUFBLFE7UUFDQSxZLEdBQUEsWTtRQUNBLEksR0FBQSxJO1FBQ0EsUyxHQUFBLFM7UUFDQSxRLEdBQUEsUTtRQUNBLE0sR0FBQSxNO1FBQ0EsUSxHQUFBLFE7UUFDQSxNLEdBQUEsTTtRQUNBLFMsR0FBQSxTO1FBQ0EsSyxHQUFBLEs7UUFDQSxPLEdBQUEsTzs7Ozs7QUMxQkQ7Ozs7QUFDQTs7QUFFQTs7QUFDQTs7QUFDQTs7QUFDQTs7OztBQUVBLElBQUksVUFBVSxDQUFkLEMsQ0FBaUI7QUFDakIsSUFBSSxVQUFVLEVBQUUsVUFBVSxFQUFaLEVBQWdCLFNBQVMsRUFBekIsRUFBZDs7QUFFQSxJQUFNLG1CQUFtQixTQUFuQixnQkFBbUIsR0FBTTtBQUM5QixvQkFBUSxPQUFSLENBQWdCLGNBQU07QUFDckIsTUFBTSxNQUFNLE9BQU8sUUFBUCxHQUFrQixPQUFsQixHQUE0QixRQUF4Qzs7QUFFQSxNQUFNLFVBQVUsU0FBUyxjQUFULFlBQWlDLEVBQWpDLENBQWhCO0FBQ0EsTUFBTSxhQUFhLFNBQVMsY0FBVCxZQUFpQyxHQUFqQyxDQUFuQjs7QUFFQSxVQUFRLGdCQUFSLENBQXlCLE9BQXpCLEVBQWtDLFlBQU07QUFDdkM7QUFDQSxhQUFVLENBQUMsT0FBWDtBQUNBOztBQUVBLFdBQVEsU0FBUixDQUFrQixHQUFsQixDQUFzQixRQUF0QjtBQUNBLGNBQVcsU0FBWCxDQUFxQixNQUFyQixDQUE0QixRQUE1QjtBQUNBLEdBUEQ7QUFRQSxFQWREO0FBZUEsQ0FoQkQ7O0FBa0JBLElBQU0sZUFBZSxTQUFmLFlBQWUsQ0FBQyxLQUFELEVBQVEsQ0FBUixFQUFjO0FBQUEsS0FDMUIsTUFEMEIsR0FDRixLQURFLENBQzFCLE1BRDBCO0FBQUEsS0FDbEIsV0FEa0IsR0FDRixLQURFLENBQ2xCLFdBRGtCOztBQUVsQyxLQUFNLG1CQUFtQixTQUFTLGNBQVQsYUFBa0MsQ0FBbEMsRUFBdUMsYUFBdkMsQ0FBcUQsc0JBQXJELENBQXpCO0FBQ0EsS0FBTSw2REFBMkQsV0FBM0QsVUFBMkUsTUFBM0UsZUFBTjs7QUFFQSxrQkFBaUIsa0JBQWpCLENBQW9DLFdBQXBDLEVBQWlELFFBQWpEO0FBQ0EsQ0FORDs7QUFRQSxJQUFNLGdCQUFnQixTQUFoQixhQUFnQixHQUFNO0FBQzNCLEtBQU0sY0FBYyxVQUFVLFFBQVEsT0FBbEIsR0FBNEIsUUFBUSxRQUF4RDs7QUFFQSx5QkFBYSxTQUFiLEdBQXlCLEVBQXpCOztBQUVBLGFBQVksT0FBWixDQUFvQixVQUFDLEtBQUQsRUFBUSxDQUFSLEVBQWM7QUFDakMsMEJBQWEsa0JBQWIsQ0FBZ0MsV0FBaEMsRUFBNkMsZ0NBQWdCLEtBQWhCLEVBQXVCLENBQXZCLENBQTdDO0FBQ0EsMkJBQVcsU0FBUyxjQUFULGFBQWtDLENBQWxDLENBQVg7O0FBRUEsTUFBSSxNQUFNLE1BQVYsRUFBa0I7QUFDakIsZ0JBQWEsS0FBYixFQUFvQixDQUFwQjtBQUNBO0FBQ0QsRUFQRDs7QUFTQSxLQUFJLE9BQU8sTUFBUCxDQUFjLEtBQWQsR0FBc0IsR0FBMUIsRUFBK0I7QUFDL0IsNEJBQWEsT0FBYjtBQUNBLENBaEJEOztBQWtCQSxJQUFNLHdCQUF3QixTQUF4QixxQkFBd0IsQ0FBQyxJQUFELEVBQVU7QUFDdkMsU0FBUSxRQUFSLEdBQW1CLElBQW5CO0FBQ0EsU0FBUSxPQUFSLEdBQWtCLEtBQUssS0FBTCxFQUFsQixDQUZ1QyxDQUVQOztBQUVoQyxTQUFRLE9BQVIsQ0FBZ0IsSUFBaEIsQ0FBcUIsVUFBQyxDQUFELEVBQUksQ0FBSixFQUFVO0FBQzlCLE1BQUksU0FBUyxFQUFFLEtBQUYsQ0FBUSxDQUFSLEVBQVcsV0FBWCxFQUFiO0FBQ0EsTUFBSSxTQUFTLEVBQUUsS0FBRixDQUFRLENBQVIsRUFBVyxXQUFYLEVBQWI7QUFDQSxNQUFJLFNBQVMsTUFBYixFQUFxQixPQUFPLENBQVAsQ0FBckIsS0FDSyxJQUFJLFNBQVMsTUFBYixFQUFxQixPQUFPLENBQUMsQ0FBUixDQUFyQixLQUNBLE9BQU8sQ0FBUDtBQUNMLEVBTkQ7QUFPQSxDQVhEOztBQWFBLElBQU0sWUFBWSxTQUFaLFNBQVksR0FBTTtBQUN2QixPQUFNLGFBQU4sRUFBVSxJQUFWLENBQWU7QUFBQSxTQUFPLElBQUksSUFBSixFQUFQO0FBQUEsRUFBZixFQUNDLElBREQsQ0FDTSxnQkFBUTtBQUNiLHdCQUFzQixJQUF0QjtBQUNBO0FBQ0E7QUFDQSxFQUxELEVBTUMsS0FORCxDQU1PO0FBQUEsU0FBTyxRQUFRLElBQVIsQ0FBYSxHQUFiLENBQVA7QUFBQSxFQU5QO0FBT0EsQ0FSRDs7QUFVQSxJQUFNLE9BQU8sU0FBUCxJQUFPLEdBQU07QUFDbEIsZ0NBQWEsUUFBYjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxDQVBEOztBQVNBOzs7Ozs7Ozs7QUN2RkE7O0FBRUEsSUFBSSxXQUFXLEtBQWY7QUFDQSxJQUFJLEtBQUssS0FBVDtBQUNBLElBQUksa0JBQUo7O0FBRUEsSUFBTSx1QkFBdUIsU0FBdkIsb0JBQXVCLEdBQU07QUFDbEMsS0FBTSxVQUFVLE1BQU0sSUFBTixDQUFXLFNBQVMsZ0JBQVQsQ0FBMEIsZ0JBQTFCLENBQVgsQ0FBaEI7O0FBRUEsU0FBUSxPQUFSLENBQWdCLGVBQU87QUFDdEIsTUFBSSxnQkFBSixDQUFxQixPQUFyQixFQUE4QixVQUFDLEdBQUQsRUFBUztBQUN0QyxPQUFJLENBQUMsUUFBTCxFQUFlO0FBQ2QseUJBQVUsU0FBVixDQUFvQixHQUFwQixDQUF3QixVQUF4QjtBQUNBLHFCQUFNLEdBQU4sR0FBWSxJQUFJLEdBQWhCO0FBQ0EsZUFBVyxJQUFYO0FBQ0E7QUFDRCxHQU5EO0FBT0EsRUFSRDs7QUFVQSxzQkFBVSxnQkFBVixDQUEyQixPQUEzQixFQUFvQyxVQUFDLEdBQUQsRUFBUztBQUM1QyxNQUFJLElBQUksTUFBSixLQUFlLGdCQUFuQixFQUEwQjtBQUMxQix1QkFBVSxTQUFWLENBQW9CLE1BQXBCLENBQTJCLFVBQTNCO0FBQ0EsYUFBVyxLQUFYO0FBQ0EsRUFKRDs7QUFNQSxrQkFBTSxnQkFBTixDQUF1QixPQUF2QixFQUFnQyxZQUFNO0FBQ3JDLE1BQUksQ0FBQyxFQUFMLEVBQVM7QUFDUixlQUFZLGlCQUFNLEtBQU4sR0FBYyxPQUFPLFVBQXJCLEdBQWtDLGFBQWxDLEdBQWtELFNBQTlEO0FBQ0Esb0JBQU0sU0FBTixDQUFnQixHQUFoQixDQUFvQixTQUFwQjtBQUNBLGNBQVc7QUFBQSxXQUFNLEtBQUssSUFBWDtBQUFBLElBQVgsRUFBNEIsR0FBNUI7QUFDQSxHQUpELE1BSU87QUFDTixvQkFBTSxTQUFOLENBQWdCLE1BQWhCLENBQXVCLFNBQXZCO0FBQ0Esd0JBQVUsU0FBVixDQUFvQixNQUFwQixDQUEyQixVQUEzQjtBQUNBLFFBQUssS0FBTDtBQUNBLGNBQVcsS0FBWDtBQUNBO0FBQ0QsRUFYRDtBQVlBLENBL0JEOztrQkFpQ2Usb0I7Ozs7Ozs7OztBQ3ZDZjs7QUFFQSxJQUFJLFFBQVEsS0FBWjtBQUNBLElBQU0sdUJBQXVCLFNBQXZCLG9CQUF1QixHQUFNO0FBQ2xDLEtBQU0sUUFBUSxTQUFTLGNBQVQsQ0FBd0IsU0FBeEIsQ0FBZDs7QUFFQSxPQUFNLGdCQUFOLENBQXVCLE9BQXZCLEVBQWdDLFlBQU07QUFDckMsb0JBQU8sU0FBUCxDQUFpQixHQUFqQixDQUFxQixNQUFyQjtBQUNBLFVBQVEsSUFBUjtBQUNBLEVBSEQ7O0FBS0EsbUJBQU8sZ0JBQVAsQ0FBd0IsT0FBeEIsRUFBaUMsWUFBTTtBQUN0QyxvQkFBTyxTQUFQLENBQWlCLE1BQWpCLENBQXdCLE1BQXhCO0FBQ0EsVUFBUSxLQUFSO0FBQ0EsRUFIRDs7QUFLQSxRQUFPLGdCQUFQLENBQXdCLFNBQXhCLEVBQW1DLFlBQU07QUFDeEMsTUFBSSxLQUFKLEVBQVc7QUFDVixjQUFXLFlBQU07QUFDaEIsc0JBQU8sU0FBUCxDQUFpQixNQUFqQixDQUF3QixNQUF4QjtBQUNBLFlBQVEsS0FBUjtBQUNBLElBSEQsRUFHRyxHQUhIO0FBSUE7QUFDRCxFQVBEO0FBUUEsQ0FyQkQ7O2tCQXVCZSxvQjs7Ozs7Ozs7O0FDMUJmOztBQUNBOztBQUVBLElBQUksYUFBSjtBQUNBLElBQUksVUFBVSxDQUFkO0FBQ0EsSUFBSSxZQUFZLEtBQWhCOztBQUVBLElBQU0seUJBQXlCLFNBQXpCLHNCQUF5QixHQUFNO0FBQ3BDLHNCQUFVLGdCQUFWLENBQTJCLFFBQTNCLEVBQXFDLFlBQU07QUFDMUMsTUFBSSxJQUFJLGtCQUFPLHFCQUFQLEdBQStCLENBQXZDOztBQUVBLE1BQUksWUFBWSxDQUFoQixFQUFtQjtBQUNsQixVQUFPLE9BQVA7QUFDQSxhQUFVLENBQVY7QUFDQTs7QUFFRCxNQUFJLEtBQUssQ0FBQyxFQUFOLElBQVksQ0FBQyxTQUFqQixFQUE0QjtBQUMzQix1QkFBUyxTQUFULENBQW1CLEdBQW5CLENBQXVCLE1BQXZCO0FBQ0EsZUFBWSxJQUFaO0FBQ0EsR0FIRCxNQUdPLElBQUksSUFBSSxDQUFDLEVBQUwsSUFBVyxTQUFmLEVBQTBCO0FBQ2hDLHVCQUFTLFNBQVQsQ0FBbUIsTUFBbkIsQ0FBMEIsTUFBMUI7QUFDQSxlQUFZLEtBQVo7QUFDQTtBQUNELEVBZkQ7O0FBaUJBLHFCQUFTLGdCQUFULENBQTBCLE9BQTFCLEVBQW1DO0FBQUEsU0FBTSx5QkFBTjtBQUFBLEVBQW5DO0FBQ0EsQ0FuQkQ7O2tCQXFCZSxzQjs7Ozs7Ozs7OztBQzVCZjs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7Ozs7UUFHQyxvQixHQUFBLDhCO1FBQ0Esc0IsR0FBQSxnQztRQUNBLG9CLEdBQUEsOEI7UUFDQSxZLEdBQUEsc0I7UUFDQSxVLEdBQUEsb0I7Ozs7Ozs7O0FDWEQsSUFBTSxXQUFXLENBQUMsR0FBRCxFQUFNLEdBQU4sRUFBVyxHQUFYLEVBQWdCLEdBQWhCLEVBQXFCLEdBQXJCLEVBQTBCLEdBQTFCLEVBQStCLEdBQS9CLEVBQW9DLEdBQXBDLEVBQXlDLEdBQXpDLEVBQThDLEdBQTlDLEVBQW1ELEdBQW5ELEVBQXdELEdBQXhELEVBQTZELEdBQTdELEVBQWtFLEdBQWxFLEVBQXVFLEdBQXZFLEVBQTRFLEdBQTVFLEVBQWlGLEdBQWpGLEVBQXNGLEdBQXRGLEVBQTJGLEdBQTNGLEVBQWdHLEdBQWhHLEVBQXFHLEdBQXJHLEVBQTBHLEdBQTFHLEVBQStHLEdBQS9HLEVBQW9ILEdBQXBILENBQWpCOztBQUVBLElBQU0sZUFBZSxTQUFmLFlBQWUsQ0FBQyxPQUFELEVBQWE7QUFDakMsS0FBTSxpQkFBaUIsU0FBakIsY0FBaUIsQ0FBQyxJQUFELEVBQVU7QUFDaEMsTUFBTSxXQUFXLFVBQVUsaUJBQVYsR0FBOEIsa0JBQS9DO0FBQ0EsTUFBTSxlQUFlLENBQUMsT0FBRCxHQUFXLGlCQUFYLEdBQStCLGtCQUFwRDs7QUFFQSxNQUFNLFdBQVcsTUFBTSxJQUFOLENBQVcsU0FBUyxnQkFBVCxDQUEwQixRQUExQixDQUFYLENBQWpCO0FBQ0EsTUFBTSxlQUFlLE1BQU0sSUFBTixDQUFXLFNBQVMsZ0JBQVQsQ0FBMEIsWUFBMUIsQ0FBWCxDQUFyQjs7QUFFQSxlQUFhLE9BQWIsQ0FBcUI7QUFBQSxVQUFTLE1BQU0sZUFBTixDQUFzQixNQUF0QixDQUFUO0FBQUEsR0FBckI7O0FBRUEsU0FBTyxTQUFTLElBQVQsQ0FBYyxpQkFBUztBQUM3QixPQUFJLE9BQU8sTUFBTSxrQkFBakI7QUFDQSxVQUFPLEtBQUssU0FBTCxDQUFlLENBQWYsTUFBc0IsSUFBdEIsSUFBOEIsS0FBSyxTQUFMLENBQWUsQ0FBZixNQUFzQixLQUFLLFdBQUwsRUFBM0Q7QUFDQSxHQUhNLENBQVA7QUFJQSxFQWJEOztBQWVBLEtBQU0sdUJBQXVCLFNBQXZCLG9CQUF1QixDQUFDLE9BQUQsRUFBVSxNQUFWLEVBQXFCO0FBQ2pELFVBQVEsZ0JBQVIsQ0FBeUIsT0FBekIsRUFBa0MsWUFBTTtBQUN2QyxPQUFNLGFBQWEsU0FBUyxjQUFULENBQXdCLE1BQXhCLENBQW5CO0FBQ0EsT0FBSSxlQUFKOztBQUVBLE9BQUksQ0FBQyxPQUFMLEVBQWM7QUFDYixhQUFTLFdBQVcsR0FBWCxHQUFpQixTQUFTLGNBQVQsQ0FBd0IsZUFBeEIsQ0FBakIsR0FBNEQsV0FBVyxhQUFYLENBQXlCLGFBQXpCLENBQXVDLGFBQXZDLENBQXFELGFBQXJELENBQW1FLHNCQUFuRSxDQUEwRixhQUExRixDQUF3RywyQkFBeEcsQ0FBckU7QUFDQSxJQUZELE1BRU87QUFDTixhQUFTLFdBQVcsR0FBWCxHQUFpQixTQUFTLGNBQVQsQ0FBd0IsZUFBeEIsQ0FBakIsR0FBNEQsV0FBVyxhQUFYLENBQXlCLGFBQXpCLENBQXVDLGFBQXZDLENBQXFELHNCQUFyRCxDQUE0RSxhQUE1RSxDQUEwRiwyQkFBMUYsQ0FBckU7QUFDQTs7QUFFRCxVQUFPLGNBQVAsQ0FBc0IsRUFBQyxVQUFVLFFBQVgsRUFBcUIsT0FBTyxPQUE1QixFQUF0QjtBQUNBLEdBWEQ7QUFZQSxFQWJEOztBQWVBLEtBQUksZ0JBQWdCLEVBQXBCO0FBQ0EsS0FBSSxTQUFTLFNBQVMsYUFBVCxDQUF1QixvQkFBdkIsQ0FBYjtBQUNBLFFBQU8sU0FBUCxHQUFtQixFQUFuQjs7QUFFQSxVQUFTLE9BQVQsQ0FBaUIsa0JBQVU7QUFDMUIsTUFBSSxjQUFjLGVBQWUsTUFBZixDQUFsQjtBQUNBLE1BQUksVUFBVSxTQUFTLGFBQVQsQ0FBdUIsR0FBdkIsQ0FBZDs7QUFFQSxNQUFJLENBQUMsV0FBTCxFQUFrQjs7QUFFbEIsY0FBWSxFQUFaLEdBQWlCLE1BQWpCO0FBQ0EsVUFBUSxTQUFSLEdBQW9CLE9BQU8sV0FBUCxFQUFwQjtBQUNBLFVBQVEsU0FBUixHQUFvQix5QkFBcEI7O0FBRUEsdUJBQXFCLE9BQXJCLEVBQThCLE1BQTlCO0FBQ0EsU0FBTyxXQUFQLENBQW1CLE9BQW5CO0FBQ0EsRUFaRDtBQWFBLENBaEREOztrQkFrRGUsWTs7Ozs7Ozs7QUNwRGYsSUFBTSxhQUFhLFNBQWIsVUFBYSxDQUFDLE9BQUQsRUFBYTtBQUMvQixLQUFNLGFBQWEsUUFBUSxhQUFSLENBQXNCLGFBQXRCLENBQW9DLGFBQXBDLENBQW5CO0FBQ0EsS0FBTSxhQUFhLFFBQVEsYUFBUixDQUFzQixhQUF0QixDQUFvQyxhQUFwQyxDQUFuQjs7QUFFQSxLQUFJLFVBQVUsUUFBUSxpQkFBdEI7QUFDQSxZQUFXLGdCQUFYLENBQTRCLE9BQTVCLEVBQXFDLFlBQU07QUFDMUMsTUFBTSxPQUFPLFFBQVEsa0JBQXJCO0FBQ0EsTUFBSSxJQUFKLEVBQVU7QUFDVCxRQUFLLGNBQUwsQ0FBb0IsRUFBQyxVQUFVLFFBQVgsRUFBcUIsT0FBTyxTQUE1QixFQUF1QyxRQUFRLFFBQS9DLEVBQXBCO0FBQ0EsYUFBVSxJQUFWO0FBQ0E7QUFDRCxFQU5EOztBQVFBLFlBQVcsZ0JBQVgsQ0FBNEIsT0FBNUIsRUFBcUMsWUFBTTtBQUMxQyxNQUFNLE9BQU8sUUFBUSxzQkFBckI7QUFDQSxNQUFJLElBQUosRUFBVTtBQUNULFFBQUssY0FBTCxDQUFvQixFQUFDLFVBQVUsUUFBWCxFQUFxQixPQUFPLFNBQTVCLEVBQXVDLFFBQVEsUUFBL0MsRUFBcEI7QUFDQSxhQUFVLElBQVY7QUFDQTtBQUNELEVBTkQ7QUFPQSxDQXBCRDs7a0JBc0JlLFU7Ozs7Ozs7O0FDdEJmLElBQU0sZ0JBQWdCLFNBQWhCLGFBQWdCLENBQUMsS0FBRDtBQUFBLHlHQUVpQyxLQUZqQztBQUFBLENBQXRCOztBQU1BLElBQU0sa0JBQWtCLFNBQWxCLGVBQWtCLENBQUMsS0FBRCxFQUFRLENBQVIsRUFBYztBQUFBLEtBQzdCLEtBRDZCLEdBQ3FFLEtBRHJFLENBQzdCLEtBRDZCO0FBQUEsS0FDdEIsU0FEc0IsR0FDcUUsS0FEckUsQ0FDdEIsU0FEc0I7QUFBQSxLQUNYLFFBRFcsR0FDcUUsS0FEckUsQ0FDWCxRQURXO0FBQUEsS0FDRCxNQURDLEdBQ3FFLEtBRHJFLENBQ0QsTUFEQztBQUFBLEtBQ08sV0FEUCxHQUNxRSxLQURyRSxDQUNPLFdBRFA7QUFBQSxLQUNvQixRQURwQixHQUNxRSxLQURyRSxDQUNvQixRQURwQjtBQUFBLEtBQzhCLFVBRDlCLEdBQ3FFLEtBRHJFLENBQzhCLFVBRDlCO0FBQUEsS0FDMEMsSUFEMUMsR0FDcUUsS0FEckUsQ0FDMEMsSUFEMUM7QUFBQSxLQUNnRCxJQURoRCxHQUNxRSxLQURyRSxDQUNnRCxJQURoRDtBQUFBLEtBQ3NELElBRHRELEdBQ3FFLEtBRHJFLENBQ3NELElBRHREO0FBQUEsS0FDNEQsSUFENUQsR0FDcUUsS0FEckUsQ0FDNEQsSUFENUQ7OztBQUdyQyxLQUFNLFlBQVksT0FBTyxNQUFQLEdBQ2pCLE9BQU8sR0FBUCxDQUFXO0FBQUEsU0FBUyxjQUFjLEtBQWQsQ0FBVDtBQUFBLEVBQVgsRUFBMEMsSUFBMUMsQ0FBK0MsRUFBL0MsQ0FEaUIsR0FDb0MsRUFEdEQ7O0FBR0Esd05BS3lDLEtBTHpDLHFIQU9rRCxTQVBsRCxvSEFTaUQsUUFUakQsMEpBYW9ELENBYnBELHdCQWNPLFNBZFAsK0dBZ0J5QyxXQWhCekMsMERBaUJvQyxRQWpCcEMsaUZBa0IyRCxVQWxCM0QsaUZBbUIyRCxJQW5CM0QsaUZBb0IyRCxJQXBCM0QscUhBcUIrRixJQXJCL0YsVUFxQndHLElBckJ4RztBQWdDQSxDQXRDRDs7a0JBd0NlLGU7Ozs7Ozs7Ozs7QUM5Q2Y7Ozs7QUFDQTs7Ozs7O1FBRVMsZSxHQUFBLGlCO1FBQWlCLFcsR0FBQSxlOzs7Ozs7OztBQ0gxQixJQUFNLG1tQkFBTjs7QUFpQkEsSUFBTSxjQUFjLFNBQWQsV0FBYyxHQUFNO0FBQ3pCLEtBQUksV0FBVyxTQUFTLGNBQVQsQ0FBd0IsUUFBeEIsQ0FBZjtBQUNBLFVBQVMsU0FBVCxHQUFxQixRQUFyQjtBQUNBLENBSEQ7O2tCQUtlLFc7Ozs7Ozs7Ozs7QUN0QmY7O0FBRUEsSUFBTSxXQUFXLFNBQVgsUUFBVyxDQUFDLEVBQUQsRUFBSyxJQUFMLEVBQWM7QUFDN0IsTUFBSSxnQkFBSjs7QUFFQSxTQUFPLFlBQVc7QUFBQTtBQUFBOztBQUNoQixRQUFNLGVBQWUsU0FBZixZQUFlO0FBQUEsYUFBTSxHQUFHLEtBQUgsQ0FBUyxLQUFULEVBQWUsVUFBZixDQUFOO0FBQUEsS0FBckI7O0FBRUEsaUJBQWEsT0FBYjtBQUNBLGNBQVUsV0FBVyxZQUFYLEVBQXlCLElBQXpCLENBQVY7QUFDRCxHQUxEO0FBTUQsQ0FURDs7QUFXQSxJQUFNLGNBQWMsU0FBZCxXQUFjLEdBQU07QUFDekIsc0JBQVMsT0FBVCxDQUFpQjtBQUFBLFdBQVEsS0FBSyxTQUFMLENBQWUsR0FBZixDQUFtQixPQUFuQixDQUFSO0FBQUEsR0FBakI7QUFDQSxrQkFBSyxTQUFMLENBQWUsR0FBZixDQUFtQixPQUFuQjtBQUNBLENBSEQ7O0FBS0EsSUFBTSxjQUFjLFNBQWQsV0FBYyxHQUFNO0FBQ3pCLE1BQUksTUFBTSxTQUFTLGNBQVQsQ0FBd0IsZUFBeEIsQ0FBVjtBQUNBLE1BQUksY0FBSixDQUFtQixFQUFDLFVBQVUsUUFBWCxFQUFxQixPQUFPLE9BQTVCLEVBQW5CO0FBQ0EsQ0FIRDs7UUFLUyxRLEdBQUEsUTtRQUFVLFcsR0FBQSxXO1FBQWEsVyxHQUFBLFciLCJmaWxlIjoiYnVuZGxlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIi8qIHNtb290aHNjcm9sbCB2MC40LjAgLSAyMDE4IC0gRHVzdGFuIEthc3RlbiwgSmVyZW1pYXMgTWVuaWNoZWxsaSAtIE1JVCBMaWNlbnNlICovXG4oZnVuY3Rpb24gKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgLy8gcG9seWZpbGxcbiAgZnVuY3Rpb24gcG9seWZpbGwoKSB7XG4gICAgLy8gYWxpYXNlc1xuICAgIHZhciB3ID0gd2luZG93O1xuICAgIHZhciBkID0gZG9jdW1lbnQ7XG5cbiAgICAvLyByZXR1cm4gaWYgc2Nyb2xsIGJlaGF2aW9yIGlzIHN1cHBvcnRlZCBhbmQgcG9seWZpbGwgaXMgbm90IGZvcmNlZFxuICAgIGlmIChcbiAgICAgICdzY3JvbGxCZWhhdmlvcicgaW4gZC5kb2N1bWVudEVsZW1lbnQuc3R5bGUgJiZcbiAgICAgIHcuX19mb3JjZVNtb290aFNjcm9sbFBvbHlmaWxsX18gIT09IHRydWVcbiAgICApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBnbG9iYWxzXG4gICAgdmFyIEVsZW1lbnQgPSB3LkhUTUxFbGVtZW50IHx8IHcuRWxlbWVudDtcbiAgICB2YXIgU0NST0xMX1RJTUUgPSA0Njg7XG5cbiAgICAvLyBvYmplY3QgZ2F0aGVyaW5nIG9yaWdpbmFsIHNjcm9sbCBtZXRob2RzXG4gICAgdmFyIG9yaWdpbmFsID0ge1xuICAgICAgc2Nyb2xsOiB3LnNjcm9sbCB8fCB3LnNjcm9sbFRvLFxuICAgICAgc2Nyb2xsQnk6IHcuc2Nyb2xsQnksXG4gICAgICBlbGVtZW50U2Nyb2xsOiBFbGVtZW50LnByb3RvdHlwZS5zY3JvbGwgfHwgc2Nyb2xsRWxlbWVudCxcbiAgICAgIHNjcm9sbEludG9WaWV3OiBFbGVtZW50LnByb3RvdHlwZS5zY3JvbGxJbnRvVmlld1xuICAgIH07XG5cbiAgICAvLyBkZWZpbmUgdGltaW5nIG1ldGhvZFxuICAgIHZhciBub3cgPVxuICAgICAgdy5wZXJmb3JtYW5jZSAmJiB3LnBlcmZvcm1hbmNlLm5vd1xuICAgICAgICA/IHcucGVyZm9ybWFuY2Uubm93LmJpbmQody5wZXJmb3JtYW5jZSlcbiAgICAgICAgOiBEYXRlLm5vdztcblxuICAgIC8qKlxuICAgICAqIGluZGljYXRlcyBpZiBhIHRoZSBjdXJyZW50IGJyb3dzZXIgaXMgbWFkZSBieSBNaWNyb3NvZnRcbiAgICAgKiBAbWV0aG9kIGlzTWljcm9zb2Z0QnJvd3NlclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSB1c2VyQWdlbnRcbiAgICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBpc01pY3Jvc29mdEJyb3dzZXIodXNlckFnZW50KSB7XG4gICAgICB2YXIgdXNlckFnZW50UGF0dGVybnMgPSBbJ01TSUUgJywgJ1RyaWRlbnQvJywgJ0VkZ2UvJ107XG5cbiAgICAgIHJldHVybiBuZXcgUmVnRXhwKHVzZXJBZ2VudFBhdHRlcm5zLmpvaW4oJ3wnKSkudGVzdCh1c2VyQWdlbnQpO1xuICAgIH1cblxuICAgIC8qXG4gICAgICogSUUgaGFzIHJvdW5kaW5nIGJ1ZyByb3VuZGluZyBkb3duIGNsaWVudEhlaWdodCBhbmQgY2xpZW50V2lkdGggYW5kXG4gICAgICogcm91bmRpbmcgdXAgc2Nyb2xsSGVpZ2h0IGFuZCBzY3JvbGxXaWR0aCBjYXVzaW5nIGZhbHNlIHBvc2l0aXZlc1xuICAgICAqIG9uIGhhc1Njcm9sbGFibGVTcGFjZVxuICAgICAqL1xuICAgIHZhciBST1VORElOR19UT0xFUkFOQ0UgPSBpc01pY3Jvc29mdEJyb3dzZXIody5uYXZpZ2F0b3IudXNlckFnZW50KSA/IDEgOiAwO1xuXG4gICAgLyoqXG4gICAgICogY2hhbmdlcyBzY3JvbGwgcG9zaXRpb24gaW5zaWRlIGFuIGVsZW1lbnRcbiAgICAgKiBAbWV0aG9kIHNjcm9sbEVsZW1lbnRcbiAgICAgKiBAcGFyYW0ge051bWJlcn0geFxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSB5XG4gICAgICogQHJldHVybnMge3VuZGVmaW5lZH1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzY3JvbGxFbGVtZW50KHgsIHkpIHtcbiAgICAgIHRoaXMuc2Nyb2xsTGVmdCA9IHg7XG4gICAgICB0aGlzLnNjcm9sbFRvcCA9IHk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogcmV0dXJucyByZXN1bHQgb2YgYXBwbHlpbmcgZWFzZSBtYXRoIGZ1bmN0aW9uIHRvIGEgbnVtYmVyXG4gICAgICogQG1ldGhvZCBlYXNlXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IGtcbiAgICAgKiBAcmV0dXJucyB7TnVtYmVyfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGVhc2Uoaykge1xuICAgICAgcmV0dXJuIDAuNSAqICgxIC0gTWF0aC5jb3MoTWF0aC5QSSAqIGspKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBpbmRpY2F0ZXMgaWYgYSBzbW9vdGggYmVoYXZpb3Igc2hvdWxkIGJlIGFwcGxpZWRcbiAgICAgKiBAbWV0aG9kIHNob3VsZEJhaWxPdXRcbiAgICAgKiBAcGFyYW0ge051bWJlcnxPYmplY3R9IGZpcnN0QXJnXG4gICAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAgICovXG4gICAgZnVuY3Rpb24gc2hvdWxkQmFpbE91dChmaXJzdEFyZykge1xuICAgICAgaWYgKFxuICAgICAgICBmaXJzdEFyZyA9PT0gbnVsbCB8fFxuICAgICAgICB0eXBlb2YgZmlyc3RBcmcgIT09ICdvYmplY3QnIHx8XG4gICAgICAgIGZpcnN0QXJnLmJlaGF2aW9yID09PSB1bmRlZmluZWQgfHxcbiAgICAgICAgZmlyc3RBcmcuYmVoYXZpb3IgPT09ICdhdXRvJyB8fFxuICAgICAgICBmaXJzdEFyZy5iZWhhdmlvciA9PT0gJ2luc3RhbnQnXG4gICAgICApIHtcbiAgICAgICAgLy8gZmlyc3QgYXJndW1lbnQgaXMgbm90IGFuIG9iamVjdC9udWxsXG4gICAgICAgIC8vIG9yIGJlaGF2aW9yIGlzIGF1dG8sIGluc3RhbnQgb3IgdW5kZWZpbmVkXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAodHlwZW9mIGZpcnN0QXJnID09PSAnb2JqZWN0JyAmJiBmaXJzdEFyZy5iZWhhdmlvciA9PT0gJ3Ntb290aCcpIHtcbiAgICAgICAgLy8gZmlyc3QgYXJndW1lbnQgaXMgYW4gb2JqZWN0IGFuZCBiZWhhdmlvciBpcyBzbW9vdGhcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuXG4gICAgICAvLyB0aHJvdyBlcnJvciB3aGVuIGJlaGF2aW9yIGlzIG5vdCBzdXBwb3J0ZWRcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAgICdiZWhhdmlvciBtZW1iZXIgb2YgU2Nyb2xsT3B0aW9ucyAnICtcbiAgICAgICAgICBmaXJzdEFyZy5iZWhhdmlvciArXG4gICAgICAgICAgJyBpcyBub3QgYSB2YWxpZCB2YWx1ZSBmb3IgZW51bWVyYXRpb24gU2Nyb2xsQmVoYXZpb3IuJ1xuICAgICAgKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBpbmRpY2F0ZXMgaWYgYW4gZWxlbWVudCBoYXMgc2Nyb2xsYWJsZSBzcGFjZSBpbiB0aGUgcHJvdmlkZWQgYXhpc1xuICAgICAqIEBtZXRob2QgaGFzU2Nyb2xsYWJsZVNwYWNlXG4gICAgICogQHBhcmFtIHtOb2RlfSBlbFxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBheGlzXG4gICAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAgICovXG4gICAgZnVuY3Rpb24gaGFzU2Nyb2xsYWJsZVNwYWNlKGVsLCBheGlzKSB7XG4gICAgICBpZiAoYXhpcyA9PT0gJ1knKSB7XG4gICAgICAgIHJldHVybiBlbC5jbGllbnRIZWlnaHQgKyBST1VORElOR19UT0xFUkFOQ0UgPCBlbC5zY3JvbGxIZWlnaHQ7XG4gICAgICB9XG5cbiAgICAgIGlmIChheGlzID09PSAnWCcpIHtcbiAgICAgICAgcmV0dXJuIGVsLmNsaWVudFdpZHRoICsgUk9VTkRJTkdfVE9MRVJBTkNFIDwgZWwuc2Nyb2xsV2lkdGg7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogaW5kaWNhdGVzIGlmIGFuIGVsZW1lbnQgaGFzIGEgc2Nyb2xsYWJsZSBvdmVyZmxvdyBwcm9wZXJ0eSBpbiB0aGUgYXhpc1xuICAgICAqIEBtZXRob2QgY2FuT3ZlcmZsb3dcbiAgICAgKiBAcGFyYW0ge05vZGV9IGVsXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGF4aXNcbiAgICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBjYW5PdmVyZmxvdyhlbCwgYXhpcykge1xuICAgICAgdmFyIG92ZXJmbG93VmFsdWUgPSB3LmdldENvbXB1dGVkU3R5bGUoZWwsIG51bGwpWydvdmVyZmxvdycgKyBheGlzXTtcblxuICAgICAgcmV0dXJuIG92ZXJmbG93VmFsdWUgPT09ICdhdXRvJyB8fCBvdmVyZmxvd1ZhbHVlID09PSAnc2Nyb2xsJztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBpbmRpY2F0ZXMgaWYgYW4gZWxlbWVudCBjYW4gYmUgc2Nyb2xsZWQgaW4gZWl0aGVyIGF4aXNcbiAgICAgKiBAbWV0aG9kIGlzU2Nyb2xsYWJsZVxuICAgICAqIEBwYXJhbSB7Tm9kZX0gZWxcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gYXhpc1xuICAgICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGlzU2Nyb2xsYWJsZShlbCkge1xuICAgICAgdmFyIGlzU2Nyb2xsYWJsZVkgPSBoYXNTY3JvbGxhYmxlU3BhY2UoZWwsICdZJykgJiYgY2FuT3ZlcmZsb3coZWwsICdZJyk7XG4gICAgICB2YXIgaXNTY3JvbGxhYmxlWCA9IGhhc1Njcm9sbGFibGVTcGFjZShlbCwgJ1gnKSAmJiBjYW5PdmVyZmxvdyhlbCwgJ1gnKTtcblxuICAgICAgcmV0dXJuIGlzU2Nyb2xsYWJsZVkgfHwgaXNTY3JvbGxhYmxlWDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBmaW5kcyBzY3JvbGxhYmxlIHBhcmVudCBvZiBhbiBlbGVtZW50XG4gICAgICogQG1ldGhvZCBmaW5kU2Nyb2xsYWJsZVBhcmVudFxuICAgICAqIEBwYXJhbSB7Tm9kZX0gZWxcbiAgICAgKiBAcmV0dXJucyB7Tm9kZX0gZWxcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBmaW5kU2Nyb2xsYWJsZVBhcmVudChlbCkge1xuICAgICAgdmFyIGlzQm9keTtcblxuICAgICAgZG8ge1xuICAgICAgICBlbCA9IGVsLnBhcmVudE5vZGU7XG5cbiAgICAgICAgaXNCb2R5ID0gZWwgPT09IGQuYm9keTtcbiAgICAgIH0gd2hpbGUgKGlzQm9keSA9PT0gZmFsc2UgJiYgaXNTY3JvbGxhYmxlKGVsKSA9PT0gZmFsc2UpO1xuXG4gICAgICBpc0JvZHkgPSBudWxsO1xuXG4gICAgICByZXR1cm4gZWw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogc2VsZiBpbnZva2VkIGZ1bmN0aW9uIHRoYXQsIGdpdmVuIGEgY29udGV4dCwgc3RlcHMgdGhyb3VnaCBzY3JvbGxpbmdcbiAgICAgKiBAbWV0aG9kIHN0ZXBcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gY29udGV4dFxuICAgICAqIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gICAgICovXG4gICAgZnVuY3Rpb24gc3RlcChjb250ZXh0KSB7XG4gICAgICB2YXIgdGltZSA9IG5vdygpO1xuICAgICAgdmFyIHZhbHVlO1xuICAgICAgdmFyIGN1cnJlbnRYO1xuICAgICAgdmFyIGN1cnJlbnRZO1xuICAgICAgdmFyIGVsYXBzZWQgPSAodGltZSAtIGNvbnRleHQuc3RhcnRUaW1lKSAvIFNDUk9MTF9USU1FO1xuXG4gICAgICAvLyBhdm9pZCBlbGFwc2VkIHRpbWVzIGhpZ2hlciB0aGFuIG9uZVxuICAgICAgZWxhcHNlZCA9IGVsYXBzZWQgPiAxID8gMSA6IGVsYXBzZWQ7XG5cbiAgICAgIC8vIGFwcGx5IGVhc2luZyB0byBlbGFwc2VkIHRpbWVcbiAgICAgIHZhbHVlID0gZWFzZShlbGFwc2VkKTtcblxuICAgICAgY3VycmVudFggPSBjb250ZXh0LnN0YXJ0WCArIChjb250ZXh0LnggLSBjb250ZXh0LnN0YXJ0WCkgKiB2YWx1ZTtcbiAgICAgIGN1cnJlbnRZID0gY29udGV4dC5zdGFydFkgKyAoY29udGV4dC55IC0gY29udGV4dC5zdGFydFkpICogdmFsdWU7XG5cbiAgICAgIGNvbnRleHQubWV0aG9kLmNhbGwoY29udGV4dC5zY3JvbGxhYmxlLCBjdXJyZW50WCwgY3VycmVudFkpO1xuXG4gICAgICAvLyBzY3JvbGwgbW9yZSBpZiB3ZSBoYXZlIG5vdCByZWFjaGVkIG91ciBkZXN0aW5hdGlvblxuICAgICAgaWYgKGN1cnJlbnRYICE9PSBjb250ZXh0LnggfHwgY3VycmVudFkgIT09IGNvbnRleHQueSkge1xuICAgICAgICB3LnJlcXVlc3RBbmltYXRpb25GcmFtZShzdGVwLmJpbmQodywgY29udGV4dCkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIHNjcm9sbHMgd2luZG93IG9yIGVsZW1lbnQgd2l0aCBhIHNtb290aCBiZWhhdmlvclxuICAgICAqIEBtZXRob2Qgc21vb3RoU2Nyb2xsXG4gICAgICogQHBhcmFtIHtPYmplY3R8Tm9kZX0gZWxcbiAgICAgKiBAcGFyYW0ge051bWJlcn0geFxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSB5XG4gICAgICogQHJldHVybnMge3VuZGVmaW5lZH1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzbW9vdGhTY3JvbGwoZWwsIHgsIHkpIHtcbiAgICAgIHZhciBzY3JvbGxhYmxlO1xuICAgICAgdmFyIHN0YXJ0WDtcbiAgICAgIHZhciBzdGFydFk7XG4gICAgICB2YXIgbWV0aG9kO1xuICAgICAgdmFyIHN0YXJ0VGltZSA9IG5vdygpO1xuXG4gICAgICAvLyBkZWZpbmUgc2Nyb2xsIGNvbnRleHRcbiAgICAgIGlmIChlbCA9PT0gZC5ib2R5KSB7XG4gICAgICAgIHNjcm9sbGFibGUgPSB3O1xuICAgICAgICBzdGFydFggPSB3LnNjcm9sbFggfHwgdy5wYWdlWE9mZnNldDtcbiAgICAgICAgc3RhcnRZID0gdy5zY3JvbGxZIHx8IHcucGFnZVlPZmZzZXQ7XG4gICAgICAgIG1ldGhvZCA9IG9yaWdpbmFsLnNjcm9sbDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNjcm9sbGFibGUgPSBlbDtcbiAgICAgICAgc3RhcnRYID0gZWwuc2Nyb2xsTGVmdDtcbiAgICAgICAgc3RhcnRZID0gZWwuc2Nyb2xsVG9wO1xuICAgICAgICBtZXRob2QgPSBzY3JvbGxFbGVtZW50O1xuICAgICAgfVxuXG4gICAgICAvLyBzY3JvbGwgbG9vcGluZyBvdmVyIGEgZnJhbWVcbiAgICAgIHN0ZXAoe1xuICAgICAgICBzY3JvbGxhYmxlOiBzY3JvbGxhYmxlLFxuICAgICAgICBtZXRob2Q6IG1ldGhvZCxcbiAgICAgICAgc3RhcnRUaW1lOiBzdGFydFRpbWUsXG4gICAgICAgIHN0YXJ0WDogc3RhcnRYLFxuICAgICAgICBzdGFydFk6IHN0YXJ0WSxcbiAgICAgICAgeDogeCxcbiAgICAgICAgeTogeVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gT1JJR0lOQUwgTUVUSE9EUyBPVkVSUklERVNcbiAgICAvLyB3LnNjcm9sbCBhbmQgdy5zY3JvbGxUb1xuICAgIHcuc2Nyb2xsID0gdy5zY3JvbGxUbyA9IGZ1bmN0aW9uKCkge1xuICAgICAgLy8gYXZvaWQgYWN0aW9uIHdoZW4gbm8gYXJndW1lbnRzIGFyZSBwYXNzZWRcbiAgICAgIGlmIChhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIGF2b2lkIHNtb290aCBiZWhhdmlvciBpZiBub3QgcmVxdWlyZWRcbiAgICAgIGlmIChzaG91bGRCYWlsT3V0KGFyZ3VtZW50c1swXSkgPT09IHRydWUpIHtcbiAgICAgICAgb3JpZ2luYWwuc2Nyb2xsLmNhbGwoXG4gICAgICAgICAgdyxcbiAgICAgICAgICBhcmd1bWVudHNbMF0ubGVmdCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICA/IGFyZ3VtZW50c1swXS5sZWZ0XG4gICAgICAgICAgICA6IHR5cGVvZiBhcmd1bWVudHNbMF0gIT09ICdvYmplY3QnXG4gICAgICAgICAgICAgID8gYXJndW1lbnRzWzBdXG4gICAgICAgICAgICAgIDogdy5zY3JvbGxYIHx8IHcucGFnZVhPZmZzZXQsXG4gICAgICAgICAgLy8gdXNlIHRvcCBwcm9wLCBzZWNvbmQgYXJndW1lbnQgaWYgcHJlc2VudCBvciBmYWxsYmFjayB0byBzY3JvbGxZXG4gICAgICAgICAgYXJndW1lbnRzWzBdLnRvcCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICA/IGFyZ3VtZW50c1swXS50b3BcbiAgICAgICAgICAgIDogYXJndW1lbnRzWzFdICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgICAgPyBhcmd1bWVudHNbMV1cbiAgICAgICAgICAgICAgOiB3LnNjcm9sbFkgfHwgdy5wYWdlWU9mZnNldFxuICAgICAgICApO1xuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gTEVUIFRIRSBTTU9PVEhORVNTIEJFR0lOIVxuICAgICAgc21vb3RoU2Nyb2xsLmNhbGwoXG4gICAgICAgIHcsXG4gICAgICAgIGQuYm9keSxcbiAgICAgICAgYXJndW1lbnRzWzBdLmxlZnQgIT09IHVuZGVmaW5lZFxuICAgICAgICAgID8gfn5hcmd1bWVudHNbMF0ubGVmdFxuICAgICAgICAgIDogdy5zY3JvbGxYIHx8IHcucGFnZVhPZmZzZXQsXG4gICAgICAgIGFyZ3VtZW50c1swXS50b3AgIT09IHVuZGVmaW5lZFxuICAgICAgICAgID8gfn5hcmd1bWVudHNbMF0udG9wXG4gICAgICAgICAgOiB3LnNjcm9sbFkgfHwgdy5wYWdlWU9mZnNldFxuICAgICAgKTtcbiAgICB9O1xuXG4gICAgLy8gdy5zY3JvbGxCeVxuICAgIHcuc2Nyb2xsQnkgPSBmdW5jdGlvbigpIHtcbiAgICAgIC8vIGF2b2lkIGFjdGlvbiB3aGVuIG5vIGFyZ3VtZW50cyBhcmUgcGFzc2VkXG4gICAgICBpZiAoYXJndW1lbnRzWzBdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBhdm9pZCBzbW9vdGggYmVoYXZpb3IgaWYgbm90IHJlcXVpcmVkXG4gICAgICBpZiAoc2hvdWxkQmFpbE91dChhcmd1bWVudHNbMF0pKSB7XG4gICAgICAgIG9yaWdpbmFsLnNjcm9sbEJ5LmNhbGwoXG4gICAgICAgICAgdyxcbiAgICAgICAgICBhcmd1bWVudHNbMF0ubGVmdCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICA/IGFyZ3VtZW50c1swXS5sZWZ0XG4gICAgICAgICAgICA6IHR5cGVvZiBhcmd1bWVudHNbMF0gIT09ICdvYmplY3QnID8gYXJndW1lbnRzWzBdIDogMCxcbiAgICAgICAgICBhcmd1bWVudHNbMF0udG9wICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8gYXJndW1lbnRzWzBdLnRvcFxuICAgICAgICAgICAgOiBhcmd1bWVudHNbMV0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1sxXSA6IDBcbiAgICAgICAgKTtcblxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIExFVCBUSEUgU01PT1RITkVTUyBCRUdJTiFcbiAgICAgIHNtb290aFNjcm9sbC5jYWxsKFxuICAgICAgICB3LFxuICAgICAgICBkLmJvZHksXG4gICAgICAgIH5+YXJndW1lbnRzWzBdLmxlZnQgKyAody5zY3JvbGxYIHx8IHcucGFnZVhPZmZzZXQpLFxuICAgICAgICB+fmFyZ3VtZW50c1swXS50b3AgKyAody5zY3JvbGxZIHx8IHcucGFnZVlPZmZzZXQpXG4gICAgICApO1xuICAgIH07XG5cbiAgICAvLyBFbGVtZW50LnByb3RvdHlwZS5zY3JvbGwgYW5kIEVsZW1lbnQucHJvdG90eXBlLnNjcm9sbFRvXG4gICAgRWxlbWVudC5wcm90b3R5cGUuc2Nyb2xsID0gRWxlbWVudC5wcm90b3R5cGUuc2Nyb2xsVG8gPSBmdW5jdGlvbigpIHtcbiAgICAgIC8vIGF2b2lkIGFjdGlvbiB3aGVuIG5vIGFyZ3VtZW50cyBhcmUgcGFzc2VkXG4gICAgICBpZiAoYXJndW1lbnRzWzBdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBhdm9pZCBzbW9vdGggYmVoYXZpb3IgaWYgbm90IHJlcXVpcmVkXG4gICAgICBpZiAoc2hvdWxkQmFpbE91dChhcmd1bWVudHNbMF0pID09PSB0cnVlKSB7XG4gICAgICAgIC8vIGlmIG9uZSBudW1iZXIgaXMgcGFzc2VkLCB0aHJvdyBlcnJvciB0byBtYXRjaCBGaXJlZm94IGltcGxlbWVudGF0aW9uXG4gICAgICAgIGlmICh0eXBlb2YgYXJndW1lbnRzWzBdID09PSAnbnVtYmVyJyAmJiBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHRocm93IG5ldyBTeW50YXhFcnJvcignVmFsdWUgY291bGQgbm90IGJlIGNvbnZlcnRlZCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgb3JpZ2luYWwuZWxlbWVudFNjcm9sbC5jYWxsKFxuICAgICAgICAgIHRoaXMsXG4gICAgICAgICAgLy8gdXNlIGxlZnQgcHJvcCwgZmlyc3QgbnVtYmVyIGFyZ3VtZW50IG9yIGZhbGxiYWNrIHRvIHNjcm9sbExlZnRcbiAgICAgICAgICBhcmd1bWVudHNbMF0ubGVmdCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICA/IH5+YXJndW1lbnRzWzBdLmxlZnRcbiAgICAgICAgICAgIDogdHlwZW9mIGFyZ3VtZW50c1swXSAhPT0gJ29iamVjdCcgPyB+fmFyZ3VtZW50c1swXSA6IHRoaXMuc2Nyb2xsTGVmdCxcbiAgICAgICAgICAvLyB1c2UgdG9wIHByb3AsIHNlY29uZCBhcmd1bWVudCBvciBmYWxsYmFjayB0byBzY3JvbGxUb3BcbiAgICAgICAgICBhcmd1bWVudHNbMF0udG9wICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8gfn5hcmd1bWVudHNbMF0udG9wXG4gICAgICAgICAgICA6IGFyZ3VtZW50c1sxXSAhPT0gdW5kZWZpbmVkID8gfn5hcmd1bWVudHNbMV0gOiB0aGlzLnNjcm9sbFRvcFxuICAgICAgICApO1xuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIGxlZnQgPSBhcmd1bWVudHNbMF0ubGVmdDtcbiAgICAgIHZhciB0b3AgPSBhcmd1bWVudHNbMF0udG9wO1xuXG4gICAgICAvLyBMRVQgVEhFIFNNT09USE5FU1MgQkVHSU4hXG4gICAgICBzbW9vdGhTY3JvbGwuY2FsbChcbiAgICAgICAgdGhpcyxcbiAgICAgICAgdGhpcyxcbiAgICAgICAgdHlwZW9mIGxlZnQgPT09ICd1bmRlZmluZWQnID8gdGhpcy5zY3JvbGxMZWZ0IDogfn5sZWZ0LFxuICAgICAgICB0eXBlb2YgdG9wID09PSAndW5kZWZpbmVkJyA/IHRoaXMuc2Nyb2xsVG9wIDogfn50b3BcbiAgICAgICk7XG4gICAgfTtcblxuICAgIC8vIEVsZW1lbnQucHJvdG90eXBlLnNjcm9sbEJ5XG4gICAgRWxlbWVudC5wcm90b3R5cGUuc2Nyb2xsQnkgPSBmdW5jdGlvbigpIHtcbiAgICAgIC8vIGF2b2lkIGFjdGlvbiB3aGVuIG5vIGFyZ3VtZW50cyBhcmUgcGFzc2VkXG4gICAgICBpZiAoYXJndW1lbnRzWzBdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBhdm9pZCBzbW9vdGggYmVoYXZpb3IgaWYgbm90IHJlcXVpcmVkXG4gICAgICBpZiAoc2hvdWxkQmFpbE91dChhcmd1bWVudHNbMF0pID09PSB0cnVlKSB7XG4gICAgICAgIG9yaWdpbmFsLmVsZW1lbnRTY3JvbGwuY2FsbChcbiAgICAgICAgICB0aGlzLFxuICAgICAgICAgIGFyZ3VtZW50c1swXS5sZWZ0ICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8gfn5hcmd1bWVudHNbMF0ubGVmdCArIHRoaXMuc2Nyb2xsTGVmdFxuICAgICAgICAgICAgOiB+fmFyZ3VtZW50c1swXSArIHRoaXMuc2Nyb2xsTGVmdCxcbiAgICAgICAgICBhcmd1bWVudHNbMF0udG9wICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8gfn5hcmd1bWVudHNbMF0udG9wICsgdGhpcy5zY3JvbGxUb3BcbiAgICAgICAgICAgIDogfn5hcmd1bWVudHNbMV0gKyB0aGlzLnNjcm9sbFRvcFxuICAgICAgICApO1xuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdGhpcy5zY3JvbGwoe1xuICAgICAgICBsZWZ0OiB+fmFyZ3VtZW50c1swXS5sZWZ0ICsgdGhpcy5zY3JvbGxMZWZ0LFxuICAgICAgICB0b3A6IH5+YXJndW1lbnRzWzBdLnRvcCArIHRoaXMuc2Nyb2xsVG9wLFxuICAgICAgICBiZWhhdmlvcjogYXJndW1lbnRzWzBdLmJlaGF2aW9yXG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgLy8gRWxlbWVudC5wcm90b3R5cGUuc2Nyb2xsSW50b1ZpZXdcbiAgICBFbGVtZW50LnByb3RvdHlwZS5zY3JvbGxJbnRvVmlldyA9IGZ1bmN0aW9uKCkge1xuICAgICAgLy8gYXZvaWQgc21vb3RoIGJlaGF2aW9yIGlmIG5vdCByZXF1aXJlZFxuICAgICAgaWYgKHNob3VsZEJhaWxPdXQoYXJndW1lbnRzWzBdKSA9PT0gdHJ1ZSkge1xuICAgICAgICBvcmlnaW5hbC5zY3JvbGxJbnRvVmlldy5jYWxsKFxuICAgICAgICAgIHRoaXMsXG4gICAgICAgICAgYXJndW1lbnRzWzBdID09PSB1bmRlZmluZWQgPyB0cnVlIDogYXJndW1lbnRzWzBdXG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBMRVQgVEhFIFNNT09USE5FU1MgQkVHSU4hXG4gICAgICB2YXIgc2Nyb2xsYWJsZVBhcmVudCA9IGZpbmRTY3JvbGxhYmxlUGFyZW50KHRoaXMpO1xuICAgICAgdmFyIHBhcmVudFJlY3RzID0gc2Nyb2xsYWJsZVBhcmVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgIHZhciBjbGllbnRSZWN0cyA9IHRoaXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cbiAgICAgIGlmIChzY3JvbGxhYmxlUGFyZW50ICE9PSBkLmJvZHkpIHtcbiAgICAgICAgLy8gcmV2ZWFsIGVsZW1lbnQgaW5zaWRlIHBhcmVudFxuICAgICAgICBzbW9vdGhTY3JvbGwuY2FsbChcbiAgICAgICAgICB0aGlzLFxuICAgICAgICAgIHNjcm9sbGFibGVQYXJlbnQsXG4gICAgICAgICAgc2Nyb2xsYWJsZVBhcmVudC5zY3JvbGxMZWZ0ICsgY2xpZW50UmVjdHMubGVmdCAtIHBhcmVudFJlY3RzLmxlZnQsXG4gICAgICAgICAgc2Nyb2xsYWJsZVBhcmVudC5zY3JvbGxUb3AgKyBjbGllbnRSZWN0cy50b3AgLSBwYXJlbnRSZWN0cy50b3BcbiAgICAgICAgKTtcblxuICAgICAgICAvLyByZXZlYWwgcGFyZW50IGluIHZpZXdwb3J0IHVubGVzcyBpcyBmaXhlZFxuICAgICAgICBpZiAody5nZXRDb21wdXRlZFN0eWxlKHNjcm9sbGFibGVQYXJlbnQpLnBvc2l0aW9uICE9PSAnZml4ZWQnKSB7XG4gICAgICAgICAgdy5zY3JvbGxCeSh7XG4gICAgICAgICAgICBsZWZ0OiBwYXJlbnRSZWN0cy5sZWZ0LFxuICAgICAgICAgICAgdG9wOiBwYXJlbnRSZWN0cy50b3AsXG4gICAgICAgICAgICBiZWhhdmlvcjogJ3Ntb290aCdcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gcmV2ZWFsIGVsZW1lbnQgaW4gdmlld3BvcnRcbiAgICAgICAgdy5zY3JvbGxCeSh7XG4gICAgICAgICAgbGVmdDogY2xpZW50UmVjdHMubGVmdCxcbiAgICAgICAgICB0b3A6IGNsaWVudFJlY3RzLnRvcCxcbiAgICAgICAgICBiZWhhdmlvcjogJ3Ntb290aCdcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIGlmICh0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAvLyBjb21tb25qc1xuICAgIG1vZHVsZS5leHBvcnRzID0geyBwb2x5ZmlsbDogcG9seWZpbGwgfTtcbiAgfSBlbHNlIHtcbiAgICAvLyBnbG9iYWxcbiAgICBwb2x5ZmlsbCgpO1xuICB9XG5cbn0oKSk7XG4iLCIoZnVuY3Rpb24oc2VsZikge1xuICAndXNlIHN0cmljdCc7XG5cbiAgaWYgKHNlbGYuZmV0Y2gpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIHZhciBzdXBwb3J0ID0ge1xuICAgIHNlYXJjaFBhcmFtczogJ1VSTFNlYXJjaFBhcmFtcycgaW4gc2VsZixcbiAgICBpdGVyYWJsZTogJ1N5bWJvbCcgaW4gc2VsZiAmJiAnaXRlcmF0b3InIGluIFN5bWJvbCxcbiAgICBibG9iOiAnRmlsZVJlYWRlcicgaW4gc2VsZiAmJiAnQmxvYicgaW4gc2VsZiAmJiAoZnVuY3Rpb24oKSB7XG4gICAgICB0cnkge1xuICAgICAgICBuZXcgQmxvYigpXG4gICAgICAgIHJldHVybiB0cnVlXG4gICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICB9XG4gICAgfSkoKSxcbiAgICBmb3JtRGF0YTogJ0Zvcm1EYXRhJyBpbiBzZWxmLFxuICAgIGFycmF5QnVmZmVyOiAnQXJyYXlCdWZmZXInIGluIHNlbGZcbiAgfVxuXG4gIGlmIChzdXBwb3J0LmFycmF5QnVmZmVyKSB7XG4gICAgdmFyIHZpZXdDbGFzc2VzID0gW1xuICAgICAgJ1tvYmplY3QgSW50OEFycmF5XScsXG4gICAgICAnW29iamVjdCBVaW50OEFycmF5XScsXG4gICAgICAnW29iamVjdCBVaW50OENsYW1wZWRBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgSW50MTZBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgVWludDE2QXJyYXldJyxcbiAgICAgICdbb2JqZWN0IEludDMyQXJyYXldJyxcbiAgICAgICdbb2JqZWN0IFVpbnQzMkFycmF5XScsXG4gICAgICAnW29iamVjdCBGbG9hdDMyQXJyYXldJyxcbiAgICAgICdbb2JqZWN0IEZsb2F0NjRBcnJheV0nXG4gICAgXVxuXG4gICAgdmFyIGlzRGF0YVZpZXcgPSBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiBvYmogJiYgRGF0YVZpZXcucHJvdG90eXBlLmlzUHJvdG90eXBlT2Yob2JqKVxuICAgIH1cblxuICAgIHZhciBpc0FycmF5QnVmZmVyVmlldyA9IEFycmF5QnVmZmVyLmlzVmlldyB8fCBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiBvYmogJiYgdmlld0NsYXNzZXMuaW5kZXhPZihPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKSkgPiAtMVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIG5vcm1hbGl6ZU5hbWUobmFtZSkge1xuICAgIGlmICh0eXBlb2YgbmFtZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIG5hbWUgPSBTdHJpbmcobmFtZSlcbiAgICB9XG4gICAgaWYgKC9bXmEtejAtOVxcLSMkJSYnKisuXFxeX2B8fl0vaS50ZXN0KG5hbWUpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIGNoYXJhY3RlciBpbiBoZWFkZXIgZmllbGQgbmFtZScpXG4gICAgfVxuICAgIHJldHVybiBuYW1lLnRvTG93ZXJDYXNlKClcbiAgfVxuXG4gIGZ1bmN0aW9uIG5vcm1hbGl6ZVZhbHVlKHZhbHVlKSB7XG4gICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHZhbHVlID0gU3RyaW5nKHZhbHVlKVxuICAgIH1cbiAgICByZXR1cm4gdmFsdWVcbiAgfVxuXG4gIC8vIEJ1aWxkIGEgZGVzdHJ1Y3RpdmUgaXRlcmF0b3IgZm9yIHRoZSB2YWx1ZSBsaXN0XG4gIGZ1bmN0aW9uIGl0ZXJhdG9yRm9yKGl0ZW1zKSB7XG4gICAgdmFyIGl0ZXJhdG9yID0ge1xuICAgICAgbmV4dDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IGl0ZW1zLnNoaWZ0KClcbiAgICAgICAgcmV0dXJuIHtkb25lOiB2YWx1ZSA9PT0gdW5kZWZpbmVkLCB2YWx1ZTogdmFsdWV9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHN1cHBvcnQuaXRlcmFibGUpIHtcbiAgICAgIGl0ZXJhdG9yW1N5bWJvbC5pdGVyYXRvcl0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGl0ZXJhdG9yXG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGl0ZXJhdG9yXG4gIH1cblxuICBmdW5jdGlvbiBIZWFkZXJzKGhlYWRlcnMpIHtcbiAgICB0aGlzLm1hcCA9IHt9XG5cbiAgICBpZiAoaGVhZGVycyBpbnN0YW5jZW9mIEhlYWRlcnMpIHtcbiAgICAgIGhlYWRlcnMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSwgbmFtZSkge1xuICAgICAgICB0aGlzLmFwcGVuZChuYW1lLCB2YWx1ZSlcbiAgICAgIH0sIHRoaXMpXG4gICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KGhlYWRlcnMpKSB7XG4gICAgICBoZWFkZXJzLmZvckVhY2goZnVuY3Rpb24oaGVhZGVyKSB7XG4gICAgICAgIHRoaXMuYXBwZW5kKGhlYWRlclswXSwgaGVhZGVyWzFdKVxuICAgICAgfSwgdGhpcylcbiAgICB9IGVsc2UgaWYgKGhlYWRlcnMpIHtcbiAgICAgIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGhlYWRlcnMpLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuICAgICAgICB0aGlzLmFwcGVuZChuYW1lLCBoZWFkZXJzW25hbWVdKVxuICAgICAgfSwgdGhpcylcbiAgICB9XG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5hcHBlbmQgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICAgIG5hbWUgPSBub3JtYWxpemVOYW1lKG5hbWUpXG4gICAgdmFsdWUgPSBub3JtYWxpemVWYWx1ZSh2YWx1ZSlcbiAgICB2YXIgb2xkVmFsdWUgPSB0aGlzLm1hcFtuYW1lXVxuICAgIHRoaXMubWFwW25hbWVdID0gb2xkVmFsdWUgPyBvbGRWYWx1ZSsnLCcrdmFsdWUgOiB2YWx1ZVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGVbJ2RlbGV0ZSddID0gZnVuY3Rpb24obmFtZSkge1xuICAgIGRlbGV0ZSB0aGlzLm1hcFtub3JtYWxpemVOYW1lKG5hbWUpXVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24obmFtZSkge1xuICAgIG5hbWUgPSBub3JtYWxpemVOYW1lKG5hbWUpXG4gICAgcmV0dXJuIHRoaXMuaGFzKG5hbWUpID8gdGhpcy5tYXBbbmFtZV0gOiBudWxsXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5oYXMgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMubWFwLmhhc093blByb3BlcnR5KG5vcm1hbGl6ZU5hbWUobmFtZSkpXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICAgIHRoaXMubWFwW25vcm1hbGl6ZU5hbWUobmFtZSldID0gbm9ybWFsaXplVmFsdWUodmFsdWUpXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5mb3JFYWNoID0gZnVuY3Rpb24oY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICBmb3IgKHZhciBuYW1lIGluIHRoaXMubWFwKSB7XG4gICAgICBpZiAodGhpcy5tYXAuaGFzT3duUHJvcGVydHkobmFtZSkpIHtcbiAgICAgICAgY2FsbGJhY2suY2FsbCh0aGlzQXJnLCB0aGlzLm1hcFtuYW1lXSwgbmFtZSwgdGhpcylcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5rZXlzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGl0ZW1zID0gW11cbiAgICB0aGlzLmZvckVhY2goZnVuY3Rpb24odmFsdWUsIG5hbWUpIHsgaXRlbXMucHVzaChuYW1lKSB9KVxuICAgIHJldHVybiBpdGVyYXRvckZvcihpdGVtcylcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLnZhbHVlcyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBpdGVtcyA9IFtdXG4gICAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlKSB7IGl0ZW1zLnB1c2godmFsdWUpIH0pXG4gICAgcmV0dXJuIGl0ZXJhdG9yRm9yKGl0ZW1zKVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuZW50cmllcyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBpdGVtcyA9IFtdXG4gICAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlLCBuYW1lKSB7IGl0ZW1zLnB1c2goW25hbWUsIHZhbHVlXSkgfSlcbiAgICByZXR1cm4gaXRlcmF0b3JGb3IoaXRlbXMpXG4gIH1cblxuICBpZiAoc3VwcG9ydC5pdGVyYWJsZSkge1xuICAgIEhlYWRlcnMucHJvdG90eXBlW1N5bWJvbC5pdGVyYXRvcl0gPSBIZWFkZXJzLnByb3RvdHlwZS5lbnRyaWVzXG4gIH1cblxuICBmdW5jdGlvbiBjb25zdW1lZChib2R5KSB7XG4gICAgaWYgKGJvZHkuYm9keVVzZWQpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgVHlwZUVycm9yKCdBbHJlYWR5IHJlYWQnKSlcbiAgICB9XG4gICAgYm9keS5ib2R5VXNlZCA9IHRydWVcbiAgfVxuXG4gIGZ1bmN0aW9uIGZpbGVSZWFkZXJSZWFkeShyZWFkZXIpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICByZWFkZXIub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlc29sdmUocmVhZGVyLnJlc3VsdClcbiAgICAgIH1cbiAgICAgIHJlYWRlci5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlamVjdChyZWFkZXIuZXJyb3IpXG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlYWRCbG9iQXNBcnJheUJ1ZmZlcihibG9iKSB7XG4gICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKClcbiAgICB2YXIgcHJvbWlzZSA9IGZpbGVSZWFkZXJSZWFkeShyZWFkZXIpXG4gICAgcmVhZGVyLnJlYWRBc0FycmF5QnVmZmVyKGJsb2IpXG4gICAgcmV0dXJuIHByb21pc2VcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlYWRCbG9iQXNUZXh0KGJsb2IpIHtcbiAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKVxuICAgIHZhciBwcm9taXNlID0gZmlsZVJlYWRlclJlYWR5KHJlYWRlcilcbiAgICByZWFkZXIucmVhZEFzVGV4dChibG9iKVxuICAgIHJldHVybiBwcm9taXNlXG4gIH1cblxuICBmdW5jdGlvbiByZWFkQXJyYXlCdWZmZXJBc1RleHQoYnVmKSB7XG4gICAgdmFyIHZpZXcgPSBuZXcgVWludDhBcnJheShidWYpXG4gICAgdmFyIGNoYXJzID0gbmV3IEFycmF5KHZpZXcubGVuZ3RoKVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2aWV3Lmxlbmd0aDsgaSsrKSB7XG4gICAgICBjaGFyc1tpXSA9IFN0cmluZy5mcm9tQ2hhckNvZGUodmlld1tpXSlcbiAgICB9XG4gICAgcmV0dXJuIGNoYXJzLmpvaW4oJycpXG4gIH1cblxuICBmdW5jdGlvbiBidWZmZXJDbG9uZShidWYpIHtcbiAgICBpZiAoYnVmLnNsaWNlKSB7XG4gICAgICByZXR1cm4gYnVmLnNsaWNlKDApXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciB2aWV3ID0gbmV3IFVpbnQ4QXJyYXkoYnVmLmJ5dGVMZW5ndGgpXG4gICAgICB2aWV3LnNldChuZXcgVWludDhBcnJheShidWYpKVxuICAgICAgcmV0dXJuIHZpZXcuYnVmZmVyXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gQm9keSgpIHtcbiAgICB0aGlzLmJvZHlVc2VkID0gZmFsc2VcblxuICAgIHRoaXMuX2luaXRCb2R5ID0gZnVuY3Rpb24oYm9keSkge1xuICAgICAgdGhpcy5fYm9keUluaXQgPSBib2R5XG4gICAgICBpZiAoIWJvZHkpIHtcbiAgICAgICAgdGhpcy5fYm9keVRleHQgPSAnJ1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgYm9keSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgdGhpcy5fYm9keVRleHQgPSBib2R5XG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuYmxvYiAmJiBCbG9iLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpKSB7XG4gICAgICAgIHRoaXMuX2JvZHlCbG9iID0gYm9keVxuICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LmZvcm1EYXRhICYmIEZvcm1EYXRhLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpKSB7XG4gICAgICAgIHRoaXMuX2JvZHlGb3JtRGF0YSA9IGJvZHlcbiAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5zZWFyY2hQYXJhbXMgJiYgVVJMU2VhcmNoUGFyYW1zLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpKSB7XG4gICAgICAgIHRoaXMuX2JvZHlUZXh0ID0gYm9keS50b1N0cmluZygpXG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuYXJyYXlCdWZmZXIgJiYgc3VwcG9ydC5ibG9iICYmIGlzRGF0YVZpZXcoYm9keSkpIHtcbiAgICAgICAgdGhpcy5fYm9keUFycmF5QnVmZmVyID0gYnVmZmVyQ2xvbmUoYm9keS5idWZmZXIpXG4gICAgICAgIC8vIElFIDEwLTExIGNhbid0IGhhbmRsZSBhIERhdGFWaWV3IGJvZHkuXG4gICAgICAgIHRoaXMuX2JvZHlJbml0ID0gbmV3IEJsb2IoW3RoaXMuX2JvZHlBcnJheUJ1ZmZlcl0pXG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuYXJyYXlCdWZmZXIgJiYgKEFycmF5QnVmZmVyLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpIHx8IGlzQXJyYXlCdWZmZXJWaWV3KGJvZHkpKSkge1xuICAgICAgICB0aGlzLl9ib2R5QXJyYXlCdWZmZXIgPSBidWZmZXJDbG9uZShib2R5KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCd1bnN1cHBvcnRlZCBCb2R5SW5pdCB0eXBlJylcbiAgICAgIH1cblxuICAgICAgaWYgKCF0aGlzLmhlYWRlcnMuZ2V0KCdjb250ZW50LXR5cGUnKSkge1xuICAgICAgICBpZiAodHlwZW9mIGJvZHkgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhpcy5oZWFkZXJzLnNldCgnY29udGVudC10eXBlJywgJ3RleHQvcGxhaW47Y2hhcnNldD1VVEYtOCcpXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUJsb2IgJiYgdGhpcy5fYm9keUJsb2IudHlwZSkge1xuICAgICAgICAgIHRoaXMuaGVhZGVycy5zZXQoJ2NvbnRlbnQtdHlwZScsIHRoaXMuX2JvZHlCbG9iLnR5cGUpXG4gICAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5zZWFyY2hQYXJhbXMgJiYgVVJMU2VhcmNoUGFyYW1zLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpKSB7XG4gICAgICAgICAgdGhpcy5oZWFkZXJzLnNldCgnY29udGVudC10eXBlJywgJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZDtjaGFyc2V0PVVURi04JylcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzdXBwb3J0LmJsb2IpIHtcbiAgICAgIHRoaXMuYmxvYiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcmVqZWN0ZWQgPSBjb25zdW1lZCh0aGlzKVxuICAgICAgICBpZiAocmVqZWN0ZWQpIHtcbiAgICAgICAgICByZXR1cm4gcmVqZWN0ZWRcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLl9ib2R5QmxvYikge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodGhpcy5fYm9keUJsb2IpXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUFycmF5QnVmZmVyKSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShuZXcgQmxvYihbdGhpcy5fYm9keUFycmF5QnVmZmVyXSkpXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUZvcm1EYXRhKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjb3VsZCBub3QgcmVhZCBGb3JtRGF0YSBib2R5IGFzIGJsb2InKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUobmV3IEJsb2IoW3RoaXMuX2JvZHlUZXh0XSkpXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdGhpcy5hcnJheUJ1ZmZlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAodGhpcy5fYm9keUFycmF5QnVmZmVyKSB7XG4gICAgICAgICAgcmV0dXJuIGNvbnN1bWVkKHRoaXMpIHx8IFByb21pc2UucmVzb2x2ZSh0aGlzLl9ib2R5QXJyYXlCdWZmZXIpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuYmxvYigpLnRoZW4ocmVhZEJsb2JBc0FycmF5QnVmZmVyKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy50ZXh0ID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgcmVqZWN0ZWQgPSBjb25zdW1lZCh0aGlzKVxuICAgICAgaWYgKHJlamVjdGVkKSB7XG4gICAgICAgIHJldHVybiByZWplY3RlZFxuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5fYm9keUJsb2IpIHtcbiAgICAgICAgcmV0dXJuIHJlYWRCbG9iQXNUZXh0KHRoaXMuX2JvZHlCbG9iKVxuICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5QXJyYXlCdWZmZXIpIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShyZWFkQXJyYXlCdWZmZXJBc1RleHQodGhpcy5fYm9keUFycmF5QnVmZmVyKSlcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUZvcm1EYXRhKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignY291bGQgbm90IHJlYWQgRm9ybURhdGEgYm9keSBhcyB0ZXh0JylcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodGhpcy5fYm9keVRleHQpXG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHN1cHBvcnQuZm9ybURhdGEpIHtcbiAgICAgIHRoaXMuZm9ybURhdGEgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudGV4dCgpLnRoZW4oZGVjb2RlKVxuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuanNvbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMudGV4dCgpLnRoZW4oSlNPTi5wYXJzZSlcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgLy8gSFRUUCBtZXRob2RzIHdob3NlIGNhcGl0YWxpemF0aW9uIHNob3VsZCBiZSBub3JtYWxpemVkXG4gIHZhciBtZXRob2RzID0gWydERUxFVEUnLCAnR0VUJywgJ0hFQUQnLCAnT1BUSU9OUycsICdQT1NUJywgJ1BVVCddXG5cbiAgZnVuY3Rpb24gbm9ybWFsaXplTWV0aG9kKG1ldGhvZCkge1xuICAgIHZhciB1cGNhc2VkID0gbWV0aG9kLnRvVXBwZXJDYXNlKClcbiAgICByZXR1cm4gKG1ldGhvZHMuaW5kZXhPZih1cGNhc2VkKSA+IC0xKSA/IHVwY2FzZWQgOiBtZXRob2RcbiAgfVxuXG4gIGZ1bmN0aW9uIFJlcXVlc3QoaW5wdXQsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fVxuICAgIHZhciBib2R5ID0gb3B0aW9ucy5ib2R5XG5cbiAgICBpZiAoaW5wdXQgaW5zdGFuY2VvZiBSZXF1ZXN0KSB7XG4gICAgICBpZiAoaW5wdXQuYm9keVVzZWQpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQWxyZWFkeSByZWFkJylcbiAgICAgIH1cbiAgICAgIHRoaXMudXJsID0gaW5wdXQudXJsXG4gICAgICB0aGlzLmNyZWRlbnRpYWxzID0gaW5wdXQuY3JlZGVudGlhbHNcbiAgICAgIGlmICghb3B0aW9ucy5oZWFkZXJzKSB7XG4gICAgICAgIHRoaXMuaGVhZGVycyA9IG5ldyBIZWFkZXJzKGlucHV0LmhlYWRlcnMpXG4gICAgICB9XG4gICAgICB0aGlzLm1ldGhvZCA9IGlucHV0Lm1ldGhvZFxuICAgICAgdGhpcy5tb2RlID0gaW5wdXQubW9kZVxuICAgICAgaWYgKCFib2R5ICYmIGlucHV0Ll9ib2R5SW5pdCAhPSBudWxsKSB7XG4gICAgICAgIGJvZHkgPSBpbnB1dC5fYm9keUluaXRcbiAgICAgICAgaW5wdXQuYm9keVVzZWQgPSB0cnVlXG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMudXJsID0gU3RyaW5nKGlucHV0KVxuICAgIH1cblxuICAgIHRoaXMuY3JlZGVudGlhbHMgPSBvcHRpb25zLmNyZWRlbnRpYWxzIHx8IHRoaXMuY3JlZGVudGlhbHMgfHwgJ29taXQnXG4gICAgaWYgKG9wdGlvbnMuaGVhZGVycyB8fCAhdGhpcy5oZWFkZXJzKSB7XG4gICAgICB0aGlzLmhlYWRlcnMgPSBuZXcgSGVhZGVycyhvcHRpb25zLmhlYWRlcnMpXG4gICAgfVxuICAgIHRoaXMubWV0aG9kID0gbm9ybWFsaXplTWV0aG9kKG9wdGlvbnMubWV0aG9kIHx8IHRoaXMubWV0aG9kIHx8ICdHRVQnKVxuICAgIHRoaXMubW9kZSA9IG9wdGlvbnMubW9kZSB8fCB0aGlzLm1vZGUgfHwgbnVsbFxuICAgIHRoaXMucmVmZXJyZXIgPSBudWxsXG5cbiAgICBpZiAoKHRoaXMubWV0aG9kID09PSAnR0VUJyB8fCB0aGlzLm1ldGhvZCA9PT0gJ0hFQUQnKSAmJiBib2R5KSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdCb2R5IG5vdCBhbGxvd2VkIGZvciBHRVQgb3IgSEVBRCByZXF1ZXN0cycpXG4gICAgfVxuICAgIHRoaXMuX2luaXRCb2R5KGJvZHkpXG4gIH1cblxuICBSZXF1ZXN0LnByb3RvdHlwZS5jbG9uZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgUmVxdWVzdCh0aGlzLCB7IGJvZHk6IHRoaXMuX2JvZHlJbml0IH0pXG4gIH1cblxuICBmdW5jdGlvbiBkZWNvZGUoYm9keSkge1xuICAgIHZhciBmb3JtID0gbmV3IEZvcm1EYXRhKClcbiAgICBib2R5LnRyaW0oKS5zcGxpdCgnJicpLmZvckVhY2goZnVuY3Rpb24oYnl0ZXMpIHtcbiAgICAgIGlmIChieXRlcykge1xuICAgICAgICB2YXIgc3BsaXQgPSBieXRlcy5zcGxpdCgnPScpXG4gICAgICAgIHZhciBuYW1lID0gc3BsaXQuc2hpZnQoKS5yZXBsYWNlKC9cXCsvZywgJyAnKVxuICAgICAgICB2YXIgdmFsdWUgPSBzcGxpdC5qb2luKCc9JykucmVwbGFjZSgvXFwrL2csICcgJylcbiAgICAgICAgZm9ybS5hcHBlbmQoZGVjb2RlVVJJQ29tcG9uZW50KG5hbWUpLCBkZWNvZGVVUklDb21wb25lbnQodmFsdWUpKVxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIGZvcm1cbiAgfVxuXG4gIGZ1bmN0aW9uIHBhcnNlSGVhZGVycyhyYXdIZWFkZXJzKSB7XG4gICAgdmFyIGhlYWRlcnMgPSBuZXcgSGVhZGVycygpXG4gICAgLy8gUmVwbGFjZSBpbnN0YW5jZXMgb2YgXFxyXFxuIGFuZCBcXG4gZm9sbG93ZWQgYnkgYXQgbGVhc3Qgb25lIHNwYWNlIG9yIGhvcml6b250YWwgdGFiIHdpdGggYSBzcGFjZVxuICAgIC8vIGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmM3MjMwI3NlY3Rpb24tMy4yXG4gICAgdmFyIHByZVByb2Nlc3NlZEhlYWRlcnMgPSByYXdIZWFkZXJzLnJlcGxhY2UoL1xccj9cXG5bXFx0IF0rL2csICcgJylcbiAgICBwcmVQcm9jZXNzZWRIZWFkZXJzLnNwbGl0KC9cXHI/XFxuLykuZm9yRWFjaChmdW5jdGlvbihsaW5lKSB7XG4gICAgICB2YXIgcGFydHMgPSBsaW5lLnNwbGl0KCc6JylcbiAgICAgIHZhciBrZXkgPSBwYXJ0cy5zaGlmdCgpLnRyaW0oKVxuICAgICAgaWYgKGtleSkge1xuICAgICAgICB2YXIgdmFsdWUgPSBwYXJ0cy5qb2luKCc6JykudHJpbSgpXG4gICAgICAgIGhlYWRlcnMuYXBwZW5kKGtleSwgdmFsdWUpXG4gICAgICB9XG4gICAgfSlcbiAgICByZXR1cm4gaGVhZGVyc1xuICB9XG5cbiAgQm9keS5jYWxsKFJlcXVlc3QucHJvdG90eXBlKVxuXG4gIGZ1bmN0aW9uIFJlc3BvbnNlKGJvZHlJbml0LCBvcHRpb25zKSB7XG4gICAgaWYgKCFvcHRpb25zKSB7XG4gICAgICBvcHRpb25zID0ge31cbiAgICB9XG5cbiAgICB0aGlzLnR5cGUgPSAnZGVmYXVsdCdcbiAgICB0aGlzLnN0YXR1cyA9IG9wdGlvbnMuc3RhdHVzID09PSB1bmRlZmluZWQgPyAyMDAgOiBvcHRpb25zLnN0YXR1c1xuICAgIHRoaXMub2sgPSB0aGlzLnN0YXR1cyA+PSAyMDAgJiYgdGhpcy5zdGF0dXMgPCAzMDBcbiAgICB0aGlzLnN0YXR1c1RleHQgPSAnc3RhdHVzVGV4dCcgaW4gb3B0aW9ucyA/IG9wdGlvbnMuc3RhdHVzVGV4dCA6ICdPSydcbiAgICB0aGlzLmhlYWRlcnMgPSBuZXcgSGVhZGVycyhvcHRpb25zLmhlYWRlcnMpXG4gICAgdGhpcy51cmwgPSBvcHRpb25zLnVybCB8fCAnJ1xuICAgIHRoaXMuX2luaXRCb2R5KGJvZHlJbml0KVxuICB9XG5cbiAgQm9keS5jYWxsKFJlc3BvbnNlLnByb3RvdHlwZSlcblxuICBSZXNwb25zZS5wcm90b3R5cGUuY2xvbmUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKHRoaXMuX2JvZHlJbml0LCB7XG4gICAgICBzdGF0dXM6IHRoaXMuc3RhdHVzLFxuICAgICAgc3RhdHVzVGV4dDogdGhpcy5zdGF0dXNUZXh0LFxuICAgICAgaGVhZGVyczogbmV3IEhlYWRlcnModGhpcy5oZWFkZXJzKSxcbiAgICAgIHVybDogdGhpcy51cmxcbiAgICB9KVxuICB9XG5cbiAgUmVzcG9uc2UuZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgcmVzcG9uc2UgPSBuZXcgUmVzcG9uc2UobnVsbCwge3N0YXR1czogMCwgc3RhdHVzVGV4dDogJyd9KVxuICAgIHJlc3BvbnNlLnR5cGUgPSAnZXJyb3InXG4gICAgcmV0dXJuIHJlc3BvbnNlXG4gIH1cblxuICB2YXIgcmVkaXJlY3RTdGF0dXNlcyA9IFszMDEsIDMwMiwgMzAzLCAzMDcsIDMwOF1cblxuICBSZXNwb25zZS5yZWRpcmVjdCA9IGZ1bmN0aW9uKHVybCwgc3RhdHVzKSB7XG4gICAgaWYgKHJlZGlyZWN0U3RhdHVzZXMuaW5kZXhPZihzdGF0dXMpID09PSAtMSkge1xuICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0ludmFsaWQgc3RhdHVzIGNvZGUnKVxuICAgIH1cblxuICAgIHJldHVybiBuZXcgUmVzcG9uc2UobnVsbCwge3N0YXR1czogc3RhdHVzLCBoZWFkZXJzOiB7bG9jYXRpb246IHVybH19KVxuICB9XG5cbiAgc2VsZi5IZWFkZXJzID0gSGVhZGVyc1xuICBzZWxmLlJlcXVlc3QgPSBSZXF1ZXN0XG4gIHNlbGYuUmVzcG9uc2UgPSBSZXNwb25zZVxuXG4gIHNlbGYuZmV0Y2ggPSBmdW5jdGlvbihpbnB1dCwgaW5pdCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHZhciByZXF1ZXN0ID0gbmV3IFJlcXVlc3QoaW5wdXQsIGluaXQpXG4gICAgICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KClcblxuICAgICAgeGhyLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgb3B0aW9ucyA9IHtcbiAgICAgICAgICBzdGF0dXM6IHhoci5zdGF0dXMsXG4gICAgICAgICAgc3RhdHVzVGV4dDogeGhyLnN0YXR1c1RleHQsXG4gICAgICAgICAgaGVhZGVyczogcGFyc2VIZWFkZXJzKHhoci5nZXRBbGxSZXNwb25zZUhlYWRlcnMoKSB8fCAnJylcbiAgICAgICAgfVxuICAgICAgICBvcHRpb25zLnVybCA9ICdyZXNwb25zZVVSTCcgaW4geGhyID8geGhyLnJlc3BvbnNlVVJMIDogb3B0aW9ucy5oZWFkZXJzLmdldCgnWC1SZXF1ZXN0LVVSTCcpXG4gICAgICAgIHZhciBib2R5ID0gJ3Jlc3BvbnNlJyBpbiB4aHIgPyB4aHIucmVzcG9uc2UgOiB4aHIucmVzcG9uc2VUZXh0XG4gICAgICAgIHJlc29sdmUobmV3IFJlc3BvbnNlKGJvZHksIG9wdGlvbnMpKVxuICAgICAgfVxuXG4gICAgICB4aHIub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QobmV3IFR5cGVFcnJvcignTmV0d29yayByZXF1ZXN0IGZhaWxlZCcpKVxuICAgICAgfVxuXG4gICAgICB4aHIub250aW1lb3V0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlamVjdChuZXcgVHlwZUVycm9yKCdOZXR3b3JrIHJlcXVlc3QgZmFpbGVkJykpXG4gICAgICB9XG5cbiAgICAgIHhoci5vcGVuKHJlcXVlc3QubWV0aG9kLCByZXF1ZXN0LnVybCwgdHJ1ZSlcblxuICAgICAgaWYgKHJlcXVlc3QuY3JlZGVudGlhbHMgPT09ICdpbmNsdWRlJykge1xuICAgICAgICB4aHIud2l0aENyZWRlbnRpYWxzID0gdHJ1ZVxuICAgICAgfSBlbHNlIGlmIChyZXF1ZXN0LmNyZWRlbnRpYWxzID09PSAnb21pdCcpIHtcbiAgICAgICAgeGhyLndpdGhDcmVkZW50aWFscyA9IGZhbHNlXG4gICAgICB9XG5cbiAgICAgIGlmICgncmVzcG9uc2VUeXBlJyBpbiB4aHIgJiYgc3VwcG9ydC5ibG9iKSB7XG4gICAgICAgIHhoci5yZXNwb25zZVR5cGUgPSAnYmxvYidcbiAgICAgIH1cblxuICAgICAgcmVxdWVzdC5oZWFkZXJzLmZvckVhY2goZnVuY3Rpb24odmFsdWUsIG5hbWUpIHtcbiAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIobmFtZSwgdmFsdWUpXG4gICAgICB9KVxuXG4gICAgICB4aHIuc2VuZCh0eXBlb2YgcmVxdWVzdC5fYm9keUluaXQgPT09ICd1bmRlZmluZWQnID8gbnVsbCA6IHJlcXVlc3QuX2JvZHlJbml0KVxuICAgIH0pXG4gIH1cbiAgc2VsZi5mZXRjaC5wb2x5ZmlsbCA9IHRydWVcbn0pKHR5cGVvZiBzZWxmICE9PSAndW5kZWZpbmVkJyA/IHNlbGYgOiB0aGlzKTtcbiIsImNvbnN0IERCID0gJ2h0dHBzOi8vbmV4dXMtY2F0YWxvZy5maXJlYmFzZWlvLmNvbS9wb3N0cy5qc29uP2F1dGg9N2c3cHlLS3lrTjNONWV3ckltaE9hUzZ2d3JGc2M1Zktrcms4ZWp6Zic7XG5cbmNvbnN0ICRsb2FkaW5nID0gQXJyYXkuZnJvbShkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcubG9hZGluZycpKTtcbmNvbnN0ICRhcnRpY2xlTGlzdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdqcy1saXN0Jyk7XG5jb25zdCAkbmF2ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2pzLW5hdicpO1xuY29uc3QgJHBhcmFsbGF4ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnBhcmFsbGF4Jyk7XG5jb25zdCAkY29udGVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5jb250ZW50Jyk7XG5jb25zdCAkdGl0bGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnanMtdGl0bGUnKTtcbmNvbnN0ICR1cEFycm93ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2pzLWFycm93Jyk7XG5jb25zdCAkbW9kYWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcubW9kYWwnKTtcbmNvbnN0ICRsaWdodGJveCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5saWdodGJveCcpO1xuY29uc3QgJHZpZXcgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcubGlnaHRib3gtdmlldycpO1xuY29uc3Qgc29ydElkcyA9IFsnYXJ0aXN0JywgJ3RpdGxlJ107XG5cbmV4cG9ydCB7IFxuXHREQixcblx0JGxvYWRpbmcsXG5cdCRhcnRpY2xlTGlzdCwgXG5cdCRuYXYsIFxuXHQkcGFyYWxsYXgsXG5cdCRjb250ZW50LFxuXHQkdGl0bGUsXG5cdCR1cEFycm93LFxuXHQkbW9kYWwsXG5cdCRsaWdodGJveCxcblx0JHZpZXcsXG5cdHNvcnRJZHNcbn07IiwiaW1wb3J0IHNtb290aHNjcm9sbCBmcm9tICdzbW9vdGhzY3JvbGwtcG9seWZpbGwnO1xuaW1wb3J0ICd3aGF0d2ctZmV0Y2gnOyBcblxuaW1wb3J0IHsgYXJ0aWNsZVRlbXBsYXRlLCByZW5kZXJOYXZMZyB9IGZyb20gJy4vdGVtcGxhdGVzJztcbmltcG9ydCB7IGRlYm91bmNlLCBoaWRlTG9hZGluZywgc2Nyb2xsVG9Ub3AgfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IERCLCAkYXJ0aWNsZUxpc3QsIHNvcnRJZHMgfSBmcm9tICcuL2NvbnN0YW50cyc7XG5pbXBvcnQgeyBhdHRhY2hNb2RhbExpc3RlbmVycywgYXR0YWNoVXBBcnJvd0xpc3RlbmVycywgYXR0YWNoSW1hZ2VMaXN0ZW5lcnMsIG1ha2VBbHBoYWJldCwgbWFrZVNsaWRlciB9IGZyb20gJy4vbW9kdWxlcyc7XG5cbmxldCBzb3J0S2V5ID0gMDsgLy8gMCA9IGFydGlzdCwgMSA9IHRpdGxlXG5sZXQgZW50cmllcyA9IHsgYnlBdXRob3I6IFtdLCBieVRpdGxlOiBbXSB9O1xuXG5jb25zdCBzZXRVcFNvcnRCdXR0b25zID0gKCkgPT4ge1xuXHRzb3J0SWRzLmZvckVhY2goaWQgPT4ge1xuXHRcdGNvbnN0IGFsdCA9IGlkID09PSAnYXJ0aXN0JyA/ICd0aXRsZScgOiAnYXJ0aXN0JztcblxuXHRcdGNvbnN0ICRidXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChganMtYnktJHtpZH1gKTtcblx0XHRjb25zdCAkYWx0QnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoYGpzLWJ5LSR7YWx0fWApO1xuXG5cdFx0JGJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHRcdHNjcm9sbFRvVG9wKCk7XG5cdFx0XHRzb3J0S2V5ID0gIXNvcnRLZXk7XG5cdFx0XHRyZW5kZXJFbnRyaWVzKCk7XG5cblx0XHRcdCRidXR0b24uY2xhc3NMaXN0LmFkZCgnYWN0aXZlJyk7XG5cdFx0XHQkYWx0QnV0dG9uLmNsYXNzTGlzdC5yZW1vdmUoJ2FjdGl2ZScpO1xuXHRcdH0pXG5cdH0pO1xufTtcblxuY29uc3QgbWFrZUNpdGF0aW9uID0gKGVudHJ5LCBpKSA9PiB7XG5cdGNvbnN0IHsgY3JlZGl0LCBjcmVkaXRfbGluayB9ID0gZW50cnk7XG5cdGNvbnN0IGVudHJ5RGVzY3JpcHRpb24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChgc2xpZGVyLSR7aX1gKS5xdWVyeVNlbGVjdG9yKCcuYXJ0aWNsZS1kZXNjcmlwdGlvbicpO1xuXHRjb25zdCBjaXRhdGlvbiA9IGA8ZGl2IGNsYXNzPVwiYXJ0aWNsZS1jcmVkaXRcIj5zb3VyY2U6IDxhIGhyZWY9XCIke2NyZWRpdF9saW5rfVwiPiR7Y3JlZGl0fTwvYT48L2Rpdj5gO1xuXHRcblx0ZW50cnlEZXNjcmlwdGlvbi5pbnNlcnRBZGphY2VudEhUTUwoJ2JlZm9yZWVuZCcsIGNpdGF0aW9uKTtcbn07XG5cbmNvbnN0IHJlbmRlckVudHJpZXMgPSAoKSA9PiB7XG5cdGNvbnN0IGVudHJpZXNMaXN0ID0gc29ydEtleSA/IGVudHJpZXMuYnlUaXRsZSA6IGVudHJpZXMuYnlBdXRob3I7XG5cblx0JGFydGljbGVMaXN0LmlubmVySFRNTCA9ICcnO1xuXG5cdGVudHJpZXNMaXN0LmZvckVhY2goKGVudHJ5LCBpKSA9PiB7XG5cdFx0JGFydGljbGVMaXN0Lmluc2VydEFkamFjZW50SFRNTCgnYmVmb3JlZW5kJywgYXJ0aWNsZVRlbXBsYXRlKGVudHJ5LCBpKSk7XG5cdFx0bWFrZVNsaWRlcihkb2N1bWVudC5nZXRFbGVtZW50QnlJZChgc2xpZGVyLSR7aX1gKSk7XG5cblx0XHRpZiAoZW50cnkuY3JlZGl0KSB7XG5cdFx0XHRtYWtlQ2l0YXRpb24oZW50cnksIGkpO1xuXHRcdH1cblx0fSk7XG5cblx0aWYgKHdpbmRvdy5zY3JlZW4ud2lkdGggPiA3NjgpIGF0dGFjaEltYWdlTGlzdGVuZXJzKCk7XG5cdG1ha2VBbHBoYWJldChzb3J0S2V5KTtcbn07XG5cbmNvbnN0IHNldERhdGFBbmRTb3J0QnlUaXRsZSA9IChkYXRhKSA9PiB7XG5cdGVudHJpZXMuYnlBdXRob3IgPSBkYXRhO1xuXHRlbnRyaWVzLmJ5VGl0bGUgPSBkYXRhLnNsaWNlKCk7IC8vIGNvcGllcyBkYXRhIGZvciBieVRpdGxlIHNvcnRcblxuXHRlbnRyaWVzLmJ5VGl0bGUuc29ydCgoYSwgYikgPT4ge1xuXHRcdGxldCBhVGl0bGUgPSBhLnRpdGxlWzBdLnRvVXBwZXJDYXNlKCk7XG5cdFx0bGV0IGJUaXRsZSA9IGIudGl0bGVbMF0udG9VcHBlckNhc2UoKTtcblx0XHRpZiAoYVRpdGxlID4gYlRpdGxlKSByZXR1cm4gMTtcblx0XHRlbHNlIGlmIChhVGl0bGUgPCBiVGl0bGUpIHJldHVybiAtMTtcblx0XHRlbHNlIHJldHVybiAwO1xuXHR9KTtcbn07XG5cbmNvbnN0IGZldGNoRGF0YSA9ICgpID0+IHtcblx0ZmV0Y2goREIpLnRoZW4ocmVzID0+IHJlcy5qc29uKCkpXG5cdC50aGVuKGRhdGEgPT4ge1xuXHRcdHNldERhdGFBbmRTb3J0QnlUaXRsZShkYXRhKTtcblx0XHRyZW5kZXJFbnRyaWVzKCk7XG5cdFx0aGlkZUxvYWRpbmcoKTtcblx0fSlcblx0LmNhdGNoKGVyciA9PiBjb25zb2xlLndhcm4oZXJyKSk7XG59O1xuXG5jb25zdCBpbml0ID0gKCkgPT4ge1xuXHRzbW9vdGhzY3JvbGwucG9seWZpbGwoKTtcblx0ZmV0Y2hEYXRhKCk7XG5cdHJlbmRlck5hdkxnKCk7XG5cdHNldFVwU29ydEJ1dHRvbnMoKTtcblx0YXR0YWNoVXBBcnJvd0xpc3RlbmVycygpO1xuXHRhdHRhY2hNb2RhbExpc3RlbmVycygpO1xufTtcblxuaW5pdCgpO1xuIiwiaW1wb3J0IHsgJHZpZXcsICRsaWdodGJveCB9IGZyb20gJy4uL2NvbnN0YW50cyc7XG5cbmxldCBsaWdodGJveCA9IGZhbHNlO1xubGV0IHgyID0gZmFsc2U7XG5sZXQgdmlld0NsYXNzO1xuXG5jb25zdCBhdHRhY2hJbWFnZUxpc3RlbmVycyA9ICgpID0+IHtcblx0Y29uc3QgJGltYWdlcyA9IEFycmF5LmZyb20oZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLmFydGljbGUtaW1hZ2UnKSk7XG5cblx0JGltYWdlcy5mb3JFYWNoKGltZyA9PiB7XG5cdFx0aW1nLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGV2dCkgPT4ge1xuXHRcdFx0aWYgKCFsaWdodGJveCkge1xuXHRcdFx0XHQkbGlnaHRib3guY2xhc3NMaXN0LmFkZCgnc2hvdy1pbWcnKTtcblx0XHRcdFx0JHZpZXcuc3JjID0gaW1nLnNyYztcblx0XHRcdFx0bGlnaHRib3ggPSB0cnVlO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9KTtcblxuXHQkbGlnaHRib3guYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZXZ0KSA9PiB7XG5cdFx0aWYgKGV2dC50YXJnZXQgPT09ICR2aWV3KSByZXR1cm47XG5cdFx0JGxpZ2h0Ym94LmNsYXNzTGlzdC5yZW1vdmUoJ3Nob3ctaW1nJyk7XG5cdFx0bGlnaHRib3ggPSBmYWxzZTtcblx0fSk7XG5cblx0JHZpZXcuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0aWYgKCF4Mikge1xuXHRcdFx0dmlld0NsYXNzID0gJHZpZXcud2lkdGggPCB3aW5kb3cuaW5uZXJXaWR0aCA/ICd2aWV3LXgyLS1zbScgOiAndmlldy14Mic7XG5cdFx0XHQkdmlldy5jbGFzc0xpc3QuYWRkKHZpZXdDbGFzcyk7XG5cdFx0XHRzZXRUaW1lb3V0KCgpID0+IHgyID0gdHJ1ZSwgMzAwKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0JHZpZXcuY2xhc3NMaXN0LnJlbW92ZSh2aWV3Q2xhc3MpO1xuXHRcdFx0JGxpZ2h0Ym94LmNsYXNzTGlzdC5yZW1vdmUoJ3Nob3ctaW1nJyk7XG5cdFx0XHR4MiA9IGZhbHNlO1xuXHRcdFx0bGlnaHRib3ggPSBmYWxzZTtcblx0XHR9XG5cdH0pO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgYXR0YWNoSW1hZ2VMaXN0ZW5lcnM7IiwiaW1wb3J0IHsgJG1vZGFsIH0gZnJvbSAnLi4vY29uc3RhbnRzJztcblxubGV0IG1vZGFsID0gZmFsc2U7XG5jb25zdCBhdHRhY2hNb2RhbExpc3RlbmVycyA9ICgpID0+IHtcblx0Y29uc3QgJGZpbmQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnanMtZmluZCcpO1xuXHRcblx0JGZpbmQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0JG1vZGFsLmNsYXNzTGlzdC5hZGQoJ3Nob3cnKTtcblx0XHRtb2RhbCA9IHRydWU7XG5cdH0pO1xuXG5cdCRtb2RhbC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHQkbW9kYWwuY2xhc3NMaXN0LnJlbW92ZSgnc2hvdycpO1xuXHRcdG1vZGFsID0gZmFsc2U7XG5cdH0pO1xuXG5cdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgKCkgPT4ge1xuXHRcdGlmIChtb2RhbCkge1xuXHRcdFx0c2V0VGltZW91dCgoKSA9PiB7XG5cdFx0XHRcdCRtb2RhbC5jbGFzc0xpc3QucmVtb3ZlKCdzaG93Jyk7XG5cdFx0XHRcdG1vZGFsID0gZmFsc2U7XG5cdFx0XHR9LCA2MDApO1xuXHRcdH07XG5cdH0pO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgYXR0YWNoTW9kYWxMaXN0ZW5lcnM7IiwiaW1wb3J0IHsgJHRpdGxlLCAkcGFyYWxsYXgsICR1cEFycm93IH0gZnJvbSAnLi4vY29uc3RhbnRzJztcbmltcG9ydCB7IHNjcm9sbFRvVG9wIH0gZnJvbSAnLi4vdXRpbHMnO1xuXG5sZXQgcHJldjtcbmxldCBjdXJyZW50ID0gMDtcbmxldCBpc1Nob3dpbmcgPSBmYWxzZTtcblxuY29uc3QgYXR0YWNoVXBBcnJvd0xpc3RlbmVycyA9ICgpID0+IHtcblx0JHBhcmFsbGF4LmFkZEV2ZW50TGlzdGVuZXIoJ3Njcm9sbCcsICgpID0+IHtcblx0XHRsZXQgeSA9ICR0aXRsZS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS55O1xuXG5cdFx0aWYgKGN1cnJlbnQgIT09IHkpIHtcblx0XHRcdHByZXYgPSBjdXJyZW50O1xuXHRcdFx0Y3VycmVudCA9IHk7XG5cdFx0fTtcblxuXHRcdGlmICh5IDw9IC01MCAmJiAhaXNTaG93aW5nKSB7XG5cdFx0XHQkdXBBcnJvdy5jbGFzc0xpc3QuYWRkKCdzaG93Jyk7XG5cdFx0XHRpc1Nob3dpbmcgPSB0cnVlO1xuXHRcdH0gZWxzZSBpZiAoeSA+IC01MCAmJiBpc1Nob3dpbmcpIHtcblx0XHRcdCR1cEFycm93LmNsYXNzTGlzdC5yZW1vdmUoJ3Nob3cnKTtcblx0XHRcdGlzU2hvd2luZyA9IGZhbHNlO1xuXHRcdH1cblx0fSk7XG5cblx0JHVwQXJyb3cuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiBzY3JvbGxUb1RvcCgpKTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGF0dGFjaFVwQXJyb3dMaXN0ZW5lcnM7IiwiaW1wb3J0IGF0dGFjaE1vZGFsTGlzdGVuZXJzIGZyb20gJy4vYXR0YWNoTW9kYWxMaXN0ZW5lcnMnO1xuaW1wb3J0IGF0dGFjaFVwQXJyb3dMaXN0ZW5lcnMgZnJvbSAnLi9hdHRhY2hVcEFycm93TGlzdGVuZXJzJztcbmltcG9ydCBhdHRhY2hJbWFnZUxpc3RlbmVycyBmcm9tICcuL2F0dGFjaEltYWdlTGlzdGVuZXJzJztcbmltcG9ydCBtYWtlQWxwaGFiZXQgZnJvbSAnLi9tYWtlQWxwaGFiZXQnO1xuaW1wb3J0IG1ha2VTbGlkZXIgZnJvbSAnLi9tYWtlU2xpZGVyJztcblxuZXhwb3J0IHsgXG5cdGF0dGFjaE1vZGFsTGlzdGVuZXJzLCBcblx0YXR0YWNoVXBBcnJvd0xpc3RlbmVycyxcblx0YXR0YWNoSW1hZ2VMaXN0ZW5lcnMsXG5cdG1ha2VBbHBoYWJldCwgXG5cdG1ha2VTbGlkZXIgXG59OyIsImNvbnN0IGFscGhhYmV0ID0gWydhJywgJ2InLCAnYycsICdkJywgJ2UnLCAnZicsICdnJywgJ2gnLCAnaScsICdqJywgJ2snLCAnbCcsICdtJywgJ24nLCAnbycsICdwJywgJ3InLCAncycsICd0JywgJ3UnLCAndicsICd3JywgJ3knLCAneiddO1xuXG5jb25zdCBtYWtlQWxwaGFiZXQgPSAoc29ydEtleSkgPT4ge1xuXHRjb25zdCBmaW5kRmlyc3RFbnRyeSA9IChjaGFyKSA9PiB7XG5cdFx0Y29uc3Qgc2VsZWN0b3IgPSBzb3J0S2V5ID8gJy5qcy1lbnRyeS10aXRsZScgOiAnLmpzLWVudHJ5LWFydGlzdCc7XG5cdFx0Y29uc3QgcHJldlNlbGVjdG9yID0gIXNvcnRLZXkgPyAnLmpzLWVudHJ5LXRpdGxlJyA6ICcuanMtZW50cnktYXJ0aXN0JztcblxuXHRcdGNvbnN0ICRlbnRyaWVzID0gQXJyYXkuZnJvbShkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKSk7XG5cdFx0Y29uc3QgJHByZXZFbnRyaWVzID0gQXJyYXkuZnJvbShkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKHByZXZTZWxlY3RvcikpO1xuXG5cdFx0JHByZXZFbnRyaWVzLmZvckVhY2goZW50cnkgPT4gZW50cnkucmVtb3ZlQXR0cmlidXRlKCduYW1lJykpO1xuXG5cdFx0cmV0dXJuICRlbnRyaWVzLmZpbmQoZW50cnkgPT4ge1xuXHRcdFx0bGV0IG5vZGUgPSBlbnRyeS5uZXh0RWxlbWVudFNpYmxpbmc7XG5cdFx0XHRyZXR1cm4gbm9kZS5pbm5lckhUTUxbMF0gPT09IGNoYXIgfHwgbm9kZS5pbm5lckhUTUxbMF0gPT09IGNoYXIudG9VcHBlckNhc2UoKTtcblx0XHR9KTtcblx0fTtcblxuXHRjb25zdCBhdHRhY2hBbmNob3JMaXN0ZW5lciA9ICgkYW5jaG9yLCBsZXR0ZXIpID0+IHtcblx0XHQkYW5jaG9yLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuXHRcdFx0Y29uc3QgbGV0dGVyTm9kZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGxldHRlcik7XG5cdFx0XHRsZXQgdGFyZ2V0O1xuXG5cdFx0XHRpZiAoIXNvcnRLZXkpIHtcblx0XHRcdFx0dGFyZ2V0ID0gbGV0dGVyID09PSAnYScgPyBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYW5jaG9yLXRhcmdldCcpIDogbGV0dGVyTm9kZS5wYXJlbnRFbGVtZW50LnBhcmVudEVsZW1lbnQucGFyZW50RWxlbWVudC5wYXJlbnRFbGVtZW50LnByZXZpb3VzRWxlbWVudFNpYmxpbmcucXVlcnlTZWxlY3RvcignLmpzLWFydGljbGUtYW5jaG9yLXRhcmdldCcpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGFyZ2V0ID0gbGV0dGVyID09PSAnYScgPyBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYW5jaG9yLXRhcmdldCcpIDogbGV0dGVyTm9kZS5wYXJlbnRFbGVtZW50LnBhcmVudEVsZW1lbnQucGFyZW50RWxlbWVudC5wcmV2aW91c0VsZW1lbnRTaWJsaW5nLnF1ZXJ5U2VsZWN0b3IoJy5qcy1hcnRpY2xlLWFuY2hvci10YXJnZXQnKTtcblx0XHRcdH07XG5cblx0XHRcdHRhcmdldC5zY3JvbGxJbnRvVmlldyh7YmVoYXZpb3I6IFwic21vb3RoXCIsIGJsb2NrOiBcInN0YXJ0XCJ9KTtcblx0XHR9KTtcblx0fTtcblxuXHRsZXQgYWN0aXZlRW50cmllcyA9IHt9O1xuXHRsZXQgJG91dGVyID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmFscGhhYmV0X19sZXR0ZXJzJyk7XG5cdCRvdXRlci5pbm5lckhUTUwgPSAnJztcblxuXHRhbHBoYWJldC5mb3JFYWNoKGxldHRlciA9PiB7XG5cdFx0bGV0ICRmaXJzdEVudHJ5ID0gZmluZEZpcnN0RW50cnkobGV0dGVyKTtcblx0XHRsZXQgJGFuY2hvciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcblxuXHRcdGlmICghJGZpcnN0RW50cnkpIHJldHVybjtcblxuXHRcdCRmaXJzdEVudHJ5LmlkID0gbGV0dGVyO1xuXHRcdCRhbmNob3IuaW5uZXJIVE1MID0gbGV0dGVyLnRvVXBwZXJDYXNlKCk7XG5cdFx0JGFuY2hvci5jbGFzc05hbWUgPSAnYWxwaGFiZXRfX2xldHRlci1hbmNob3InO1xuXG5cdFx0YXR0YWNoQW5jaG9yTGlzdGVuZXIoJGFuY2hvciwgbGV0dGVyKTtcblx0XHQkb3V0ZXIuYXBwZW5kQ2hpbGQoJGFuY2hvcik7XG5cdH0pO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgbWFrZUFscGhhYmV0OyIsImNvbnN0IG1ha2VTbGlkZXIgPSAoJHNsaWRlcikgPT4ge1xuXHRjb25zdCAkYXJyb3dOZXh0ID0gJHNsaWRlci5wYXJlbnRFbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJy5hcnJvdy1uZXh0Jyk7XG5cdGNvbnN0ICRhcnJvd1ByZXYgPSAkc2xpZGVyLnBhcmVudEVsZW1lbnQucXVlcnlTZWxlY3RvcignLmFycm93LXByZXYnKTtcblxuXHRsZXQgY3VycmVudCA9ICRzbGlkZXIuZmlyc3RFbGVtZW50Q2hpbGQ7XG5cdCRhcnJvd05leHQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0Y29uc3QgbmV4dCA9IGN1cnJlbnQubmV4dEVsZW1lbnRTaWJsaW5nO1xuXHRcdGlmIChuZXh0KSB7XG5cdFx0XHRuZXh0LnNjcm9sbEludG9WaWV3KHtiZWhhdmlvcjogXCJzbW9vdGhcIiwgYmxvY2s6IFwibmVhcmVzdFwiLCBpbmxpbmU6IFwiY2VudGVyXCJ9KTtcblx0XHRcdGN1cnJlbnQgPSBuZXh0O1xuXHRcdH1cblx0fSk7XG5cblx0JGFycm93UHJldi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHRjb25zdCBwcmV2ID0gY3VycmVudC5wcmV2aW91c0VsZW1lbnRTaWJsaW5nO1xuXHRcdGlmIChwcmV2KSB7XG5cdFx0XHRwcmV2LnNjcm9sbEludG9WaWV3KHtiZWhhdmlvcjogXCJzbW9vdGhcIiwgYmxvY2s6IFwibmVhcmVzdFwiLCBpbmxpbmU6IFwiY2VudGVyXCJ9KTtcblx0XHRcdGN1cnJlbnQgPSBwcmV2O1xuXHRcdH1cblx0fSlcbn07XG5cbmV4cG9ydCBkZWZhdWx0IG1ha2VTbGlkZXI7IiwiY29uc3QgaW1hZ2VUZW1wbGF0ZSA9IChpbWFnZSkgPT4gYFxuPGRpdiBjbGFzcz1cImFydGljbGUtaW1hZ2VfX291dGVyXCI+XG5cdDxpbWcgY2xhc3M9XCJhcnRpY2xlLWltYWdlXCIgc3JjPVwiLi4vLi4vYXNzZXRzL2ltYWdlcy8ke2ltYWdlfVwiPjwvaW1nPlxuPC9kaXY+XG5gO1xuXG5jb25zdCBhcnRpY2xlVGVtcGxhdGUgPSAoZW50cnksIGkpID0+IHtcblx0Y29uc3QgeyB0aXRsZSwgZmlyc3ROYW1lLCBsYXN0TmFtZSwgaW1hZ2VzLCBkZXNjcmlwdGlvbiwgY29udGVudHMsIGRpbWVuc2lvbnMsIHllYXIsIGlzYm4sIG9jbGMsIGxpbmsgfSA9IGVudHJ5O1xuXG5cdGNvbnN0IGltYWdlSFRNTCA9IGltYWdlcy5sZW5ndGggPyBcblx0XHRpbWFnZXMubWFwKGltYWdlID0+IGltYWdlVGVtcGxhdGUoaW1hZ2UpKS5qb2luKCcnKSA6ICcnO1xuXG5cdHJldHVybiBgXG5cdFx0PGFydGljbGUgY2xhc3M9XCJhcnRpY2xlX19vdXRlclwiPlxuXHRcdFx0PGRpdiBjbGFzcz1cImFydGljbGVfX2lubmVyXCI+XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlX19oZWFkaW5nXCI+XG5cdFx0XHRcdFx0PGEgY2xhc3M9XCJqcy1lbnRyeS10aXRsZVwiPjwvYT5cblx0XHRcdFx0XHQ8aDIgY2xhc3M9XCJhcnRpY2xlLWhlYWRpbmdfX3RpdGxlXCI+JHt0aXRsZX08L2gyPlxuXHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlLWhlYWRpbmdfX25hbWVcIj5cblx0XHRcdFx0XHRcdDxzcGFuIGNsYXNzPVwiYXJ0aWNsZS1oZWFkaW5nX19uYW1lLS1maXJzdFwiPiR7Zmlyc3ROYW1lfTwvc3Bhbj5cblx0XHRcdFx0XHRcdDxhIGNsYXNzPVwianMtZW50cnktYXJ0aXN0XCI+PC9hPlxuXHRcdFx0XHRcdFx0PHNwYW4gY2xhc3M9XCJhcnRpY2xlLWhlYWRpbmdfX25hbWUtLWxhc3RcIj4ke2xhc3ROYW1lfTwvc3Bhbj5cblx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0PC9kaXY+XHRcblx0XHRcdFx0PGRpdiBjbGFzcz1cImFydGljbGVfX3NsaWRlci1vdXRlclwiPlxuXHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlX19zbGlkZXItaW5uZXJcIiBpZD1cInNsaWRlci0ke2l9XCI+XG5cdFx0XHRcdFx0XHQke2ltYWdlSFRNTH1cblx0XHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlLWRlc2NyaXB0aW9uX19vdXRlclwiPlxuXHRcdFx0XHRcdFx0XHQ8ZGl2IGNsYXNzPVwiYXJ0aWNsZS1kZXNjcmlwdGlvblwiPiR7ZGVzY3JpcHRpb259PC9kaXY+XG5cdFx0XHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlLWRldGFpbFwiPiR7Y29udGVudHN9PC9kaXY+XG5cdFx0XHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlLWRldGFpbCBhcnRpY2xlLWRldGFpbC0tbWFyZ2luXCI+JHtkaW1lbnNpb25zfTwvZGl2PlxuXHRcdFx0XHRcdFx0XHQ8ZGl2IGNsYXNzPVwiYXJ0aWNsZS1kZXRhaWwgYXJ0aWNsZS1kZXRhaWwtLW1hcmdpblwiPiR7eWVhcn08L2Rpdj5cblx0XHRcdFx0XHRcdFx0PGRpdiBjbGFzcz1cImFydGljbGUtZGV0YWlsIGFydGljbGUtZGV0YWlsLS1tYXJnaW5cIj4ke2lzYm59PC9kaXY+XG5cdFx0XHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlLWRldGFpbFwiPk9DTEMgPGEgY2xhc3M9XCJhcnRpY2xlLWRldGFpbC0tbGlua1wiIHRhcmdldD1cIl9ibGFua1wiIGhyZWY9XCIke2xpbmt9XCI+JHtvY2xjfTwvYT48L2Rpdj5cblx0XHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlX19zY3JvbGwtY29udHJvbHNcIj5cblx0XHRcdFx0XHRcdDxzcGFuIGNsYXNzPVwiY29udHJvbHMgYXJyb3ctcHJldlwiPuKGkDwvc3Bhbj4gXG5cdFx0XHRcdFx0XHQ8c3BhbiBjbGFzcz1cImNvbnRyb2xzIGFycm93LW5leHRcIj7ihpI8L3NwYW4+XG5cdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdFx0PHAgY2xhc3M9XCJqcy1hcnRpY2xlLWFuY2hvci10YXJnZXRcIj48L3A+XG5cdFx0XHQ8L2Rpdj5cblx0XHQ8L2FydGljbGU+XG5cdGA7XG59O1xuXG5leHBvcnQgZGVmYXVsdCBhcnRpY2xlVGVtcGxhdGU7IiwiaW1wb3J0IGFydGljbGVUZW1wbGF0ZSBmcm9tICcuL2FydGljbGUnO1xuaW1wb3J0IHJlbmRlck5hdkxnIGZyb20gJy4vbmF2TGcnO1xuXG5leHBvcnQgeyBhcnRpY2xlVGVtcGxhdGUsIHJlbmRlck5hdkxnIH07IiwiY29uc3QgdGVtcGxhdGUgPSBcblx0YDxkaXYgY2xhc3M9XCJuYXZfX2lubmVyXCI+XG5cdFx0PGRpdiBjbGFzcz1cIm5hdl9fc29ydC1ieVwiPlxuXHRcdFx0PHNwYW4gY2xhc3M9XCJzb3J0LWJ5X190aXRsZVwiPlNvcnQgYnk8L3NwYW4+XG5cdFx0XHQ8YnV0dG9uIGNsYXNzPVwic29ydC1ieSBzb3J0LWJ5X19ieS1hcnRpc3QgYWN0aXZlXCIgaWQ9XCJqcy1ieS1hcnRpc3RcIj5BcnRpc3Q8L2J1dHRvbj5cblx0XHRcdDxzcGFuIGNsYXNzPVwic29ydC1ieV9fZGl2aWRlclwiPiB8IDwvc3Bhbj5cblx0XHRcdDxidXR0b24gY2xhc3M9XCJzb3J0LWJ5IHNvcnQtYnlfX2J5LXRpdGxlXCIgaWQ9XCJqcy1ieS10aXRsZVwiPlRpdGxlPC9idXR0b24+XG5cdFx0XHQ8c3BhbiBjbGFzcz1cImZpbmRcIiBpZD1cImpzLWZpbmRcIj5cblx0XHRcdFx0KDxzcGFuIGNsYXNzPVwiZmluZC0taW5uZXJcIj4mIzg5ODQ7Rjwvc3Bhbj4pXG5cdFx0XHQ8L3NwYW4+XG5cdFx0PC9kaXY+XG5cdFx0PGRpdiBjbGFzcz1cIm5hdl9fYWxwaGFiZXRcIj5cblx0XHRcdDxzcGFuIGNsYXNzPVwiYWxwaGFiZXRfX3RpdGxlXCI+R28gdG88L3NwYW4+XG5cdFx0XHQ8ZGl2IGNsYXNzPVwiYWxwaGFiZXRfX2xldHRlcnNcIj48L2Rpdj5cblx0XHQ8L2Rpdj5cblx0PC9kaXY+YDtcblxuY29uc3QgcmVuZGVyTmF2TGcgPSAoKSA9PiB7XG5cdGxldCBuYXZPdXRlciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdqcy1uYXYnKTtcblx0bmF2T3V0ZXIuaW5uZXJIVE1MID0gdGVtcGxhdGU7XG59O1xuXG5leHBvcnQgZGVmYXVsdCByZW5kZXJOYXZMZzsiLCJpbXBvcnQgeyAkbG9hZGluZywgJG5hdiwgJHBhcmFsbGF4LCAkY29udGVudCwgJHRpdGxlLCAkYXJyb3csICRtb2RhbCwgJGxpZ2h0Ym94LCAkdmlldyB9IGZyb20gJy4uL2NvbnN0YW50cyc7XG5cbmNvbnN0IGRlYm91bmNlID0gKGZuLCB0aW1lKSA9PiB7XG4gIGxldCB0aW1lb3V0O1xuXG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICBjb25zdCBmdW5jdGlvbkNhbGwgPSAoKSA9PiBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIFxuICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICB0aW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbkNhbGwsIHRpbWUpO1xuICB9XG59O1xuXG5jb25zdCBoaWRlTG9hZGluZyA9ICgpID0+IHtcblx0JGxvYWRpbmcuZm9yRWFjaChlbGVtID0+IGVsZW0uY2xhc3NMaXN0LmFkZCgncmVhZHknKSk7XG5cdCRuYXYuY2xhc3NMaXN0LmFkZCgncmVhZHknKTtcbn07XG5cbmNvbnN0IHNjcm9sbFRvVG9wID0gKCkgPT4ge1xuXHRsZXQgdG9wID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2FuY2hvci10YXJnZXQnKTtcblx0dG9wLnNjcm9sbEludG9WaWV3KHtiZWhhdmlvcjogXCJzbW9vdGhcIiwgYmxvY2s6IFwic3RhcnRcIn0pO1xufTtcblxuZXhwb3J0IHsgZGVib3VuY2UsIGhpZGVMb2FkaW5nLCBzY3JvbGxUb1RvcCB9OyJdLCJwcmVFeGlzdGluZ0NvbW1lbnQiOiIvLyMgc291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD11dGYtODtiYXNlNjQsZXlKMlpYSnphVzl1SWpvekxDSnpiM1Z5WTJWeklqcGJJbTV2WkdWZmJXOWtkV3hsY3k5aWNtOTNjMlZ5TFhCaFkyc3ZYM0J5Wld4MVpHVXVhbk1pTENKdWIyUmxYMjF2WkhWc1pYTXZjMjF2YjNSb2MyTnliMnhzTFhCdmJIbG1hV3hzTDJScGMzUXZjMjF2YjNSb2MyTnliMnhzTG1weklpd2libTlrWlY5dGIyUjFiR1Z6TDNkb1lYUjNaeTFtWlhSamFDOW1aWFJqYUM1cWN5SXNJbk55WXk5cWN5OWpiMjV6ZEdGdWRITXVhbk1pTENKemNtTXZhbk12YVc1a1pYZ3Vhbk1pTENKemNtTXZhbk12Ylc5a2RXeGxjeTloZEhSaFkyaEpiV0ZuWlV4cGMzUmxibVZ5Y3k1cWN5SXNJbk55WXk5cWN5OXRiMlIxYkdWekwyRjBkR0ZqYUUxdlpHRnNUR2x6ZEdWdVpYSnpMbXB6SWl3aWMzSmpMMnB6TDIxdlpIVnNaWE12WVhSMFlXTm9WWEJCY25KdmQweHBjM1JsYm1WeWN5NXFjeUlzSW5OeVl5OXFjeTl0YjJSMWJHVnpMMmx1WkdWNExtcHpJaXdpYzNKakwycHpMMjF2WkhWc1pYTXZiV0ZyWlVGc2NHaGhZbVYwTG1weklpd2ljM0pqTDJwekwyMXZaSFZzWlhNdmJXRnJaVk5zYVdSbGNpNXFjeUlzSW5OeVl5OXFjeTkwWlcxd2JHRjBaWE12WVhKMGFXTnNaUzVxY3lJc0luTnlZeTlxY3k5MFpXMXdiR0YwWlhNdmFXNWtaWGd1YW5NaUxDSnpjbU12YW5NdmRHVnRjR3hoZEdWekwyNWhka3huTG1weklpd2ljM0pqTDJwekwzVjBhV3h6TDJsdVpHVjRMbXB6SWwwc0ltNWhiV1Z6SWpwYlhTd2liV0Z3Y0dsdVozTWlPaUpCUVVGQk8wRkRRVUU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHM3UVVOMllrRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUczdPenM3T3p0QlEyeGtRU3hKUVVGTkxFdEJRVXNzSzBaQlFWZzdPMEZCUlVFc1NVRkJUU3hYUVVGWExFMUJRVTBzU1VGQlRpeERRVUZYTEZOQlFWTXNaMEpCUVZRc1EwRkJNRUlzVlVGQk1VSXNRMEZCV0N4RFFVRnFRanRCUVVOQkxFbEJRVTBzWlVGQlpTeFRRVUZUTEdOQlFWUXNRMEZCZDBJc1UwRkJlRUlzUTBGQmNrSTdRVUZEUVN4SlFVRk5MRTlCUVU4c1UwRkJVeXhqUVVGVUxFTkJRWGRDTEZGQlFYaENMRU5CUVdJN1FVRkRRU3hKUVVGTkxGbEJRVmtzVTBGQlV5eGhRVUZVTEVOQlFYVkNMRmRCUVhaQ0xFTkJRV3hDTzBGQlEwRXNTVUZCVFN4WFFVRlhMRk5CUVZNc1lVRkJWQ3hEUVVGMVFpeFZRVUYyUWl4RFFVRnFRanRCUVVOQkxFbEJRVTBzVTBGQlV5eFRRVUZUTEdOQlFWUXNRMEZCZDBJc1ZVRkJlRUlzUTBGQlpqdEJRVU5CTEVsQlFVMHNWMEZCVnl4VFFVRlRMR05CUVZRc1EwRkJkMElzVlVGQmVFSXNRMEZCYWtJN1FVRkRRU3hKUVVGTkxGTkJRVk1zVTBGQlV5eGhRVUZVTEVOQlFYVkNMRkZCUVhaQ0xFTkJRV1k3UVVGRFFTeEpRVUZOTEZsQlFWa3NVMEZCVXl4aFFVRlVMRU5CUVhWQ0xGZEJRWFpDTEVOQlFXeENPMEZCUTBFc1NVRkJUU3hSUVVGUkxGTkJRVk1zWVVGQlZDeERRVUYxUWl4blFrRkJka0lzUTBGQlpEdEJRVU5CTEVsQlFVMHNWVUZCVlN4RFFVRkRMRkZCUVVRc1JVRkJWeXhQUVVGWUxFTkJRV2hDT3p0UlFVZERMRVVzUjBGQlFTeEZPMUZCUTBFc1VTeEhRVUZCTEZFN1VVRkRRU3haTEVkQlFVRXNXVHRSUVVOQkxFa3NSMEZCUVN4Sk8xRkJRMEVzVXl4SFFVRkJMRk03VVVGRFFTeFJMRWRCUVVFc1VUdFJRVU5CTEUwc1IwRkJRU3hOTzFGQlEwRXNVU3hIUVVGQkxGRTdVVUZEUVN4TkxFZEJRVUVzVFR0UlFVTkJMRk1zUjBGQlFTeFRPMUZCUTBFc1N5eEhRVUZCTEVzN1VVRkRRU3hQTEVkQlFVRXNUenM3T3pzN1FVTXhRa1E3T3pzN1FVRkRRVHM3UVVGRlFUczdRVUZEUVRzN1FVRkRRVHM3UVVGRFFUczdPenRCUVVWQkxFbEJRVWtzVlVGQlZTeERRVUZrTEVNc1EwRkJhVUk3UVVGRGFrSXNTVUZCU1N4VlFVRlZMRVZCUVVVc1ZVRkJWU3hGUVVGYUxFVkJRV2RDTEZOQlFWTXNSVUZCZWtJc1JVRkJaRHM3UVVGRlFTeEpRVUZOTEcxQ1FVRnRRaXhUUVVGdVFpeG5Ra0ZCYlVJc1IwRkJUVHRCUVVNNVFpeHZRa0ZCVVN4UFFVRlNMRU5CUVdkQ0xHTkJRVTA3UVVGRGNrSXNUVUZCVFN4TlFVRk5MRTlCUVU4c1VVRkJVQ3hIUVVGclFpeFBRVUZzUWl4SFFVRTBRaXhSUVVGNFF6czdRVUZGUVN4TlFVRk5MRlZCUVZVc1UwRkJVeXhqUVVGVUxGbEJRV2xETEVWQlFXcERMRU5CUVdoQ08wRkJRMEVzVFVGQlRTeGhRVUZoTEZOQlFWTXNZMEZCVkN4WlFVRnBReXhIUVVGcVF5eERRVUZ1UWpzN1FVRkZRU3hWUVVGUkxHZENRVUZTTEVOQlFYbENMRTlCUVhwQ0xFVkJRV3RETEZsQlFVMDdRVUZEZGtNN1FVRkRRU3hoUVVGVkxFTkJRVU1zVDBGQldEdEJRVU5CT3p0QlFVVkJMRmRCUVZFc1UwRkJVaXhEUVVGclFpeEhRVUZzUWl4RFFVRnpRaXhSUVVGMFFqdEJRVU5CTEdOQlFWY3NVMEZCV0N4RFFVRnhRaXhOUVVGeVFpeERRVUUwUWl4UlFVRTFRanRCUVVOQkxFZEJVRVE3UVVGUlFTeEZRV1JFTzBGQlpVRXNRMEZvUWtRN08wRkJhMEpCTEVsQlFVMHNaVUZCWlN4VFFVRm1MRmxCUVdVc1EwRkJReXhMUVVGRUxFVkJRVkVzUTBGQlVpeEZRVUZqTzBGQlFVRXNTMEZETVVJc1RVRkVNRUlzUjBGRFJpeExRVVJGTEVOQlF6RkNMRTFCUkRCQ08wRkJRVUVzUzBGRGJFSXNWMEZFYTBJc1IwRkRSaXhMUVVSRkxFTkJRMnhDTEZkQlJHdENPenRCUVVWc1F5eExRVUZOTEcxQ1FVRnRRaXhUUVVGVExHTkJRVlFzWVVGQmEwTXNRMEZCYkVNc1JVRkJkVU1zWVVGQmRrTXNRMEZCY1VRc2MwSkJRWEpFTEVOQlFYcENPMEZCUTBFc1MwRkJUU3cyUkVGQk1rUXNWMEZCTTBRc1ZVRkJNa1VzVFVGQk0wVXNaVUZCVGpzN1FVRkZRU3hyUWtGQmFVSXNhMEpCUVdwQ0xFTkJRVzlETEZkQlFYQkRMRVZCUVdsRUxGRkJRV3BFTzBGQlEwRXNRMEZPUkRzN1FVRlJRU3hKUVVGTkxHZENRVUZuUWl4VFFVRm9RaXhoUVVGblFpeEhRVUZOTzBGQlF6TkNMRXRCUVUwc1kwRkJZeXhWUVVGVkxGRkJRVkVzVDBGQmJFSXNSMEZCTkVJc1VVRkJVU3hSUVVGNFJEczdRVUZGUVN4NVFrRkJZU3hUUVVGaUxFZEJRWGxDTEVWQlFYcENPenRCUVVWQkxHRkJRVmtzVDBGQldpeERRVUZ2UWl4VlFVRkRMRXRCUVVRc1JVRkJVU3hEUVVGU0xFVkJRV003UVVGRGFrTXNNRUpCUVdFc2EwSkJRV0lzUTBGQlowTXNWMEZCYUVNc1JVRkJOa01zWjBOQlFXZENMRXRCUVdoQ0xFVkJRWFZDTEVOQlFYWkNMRU5CUVRkRE8wRkJRMEVzTWtKQlFWY3NVMEZCVXl4alFVRlVMR0ZCUVd0RExFTkJRV3hETEVOQlFWZzdPMEZCUlVFc1RVRkJTU3hOUVVGTkxFMUJRVllzUlVGQmEwSTdRVUZEYWtJc1owSkJRV0VzUzBGQllpeEZRVUZ2UWl4RFFVRndRanRCUVVOQk8wRkJRMFFzUlVGUVJEczdRVUZUUVN4TFFVRkpMRTlCUVU4c1RVRkJVQ3hEUVVGakxFdEJRV1FzUjBGQmMwSXNSMEZCTVVJc1JVRkJLMEk3UVVGREwwSXNORUpCUVdFc1QwRkJZanRCUVVOQkxFTkJhRUpFT3p0QlFXdENRU3hKUVVGTkxIZENRVUYzUWl4VFFVRjRRaXh4UWtGQmQwSXNRMEZCUXl4SlFVRkVMRVZCUVZVN1FVRkRka01zVTBGQlVTeFJRVUZTTEVkQlFXMUNMRWxCUVc1Q08wRkJRMEVzVTBGQlVTeFBRVUZTTEVkQlFXdENMRXRCUVVzc1MwRkJUQ3hGUVVGc1FpeERRVVoxUXl4RFFVVlFPenRCUVVWb1F5eFRRVUZSTEU5QlFWSXNRMEZCWjBJc1NVRkJhRUlzUTBGQmNVSXNWVUZCUXl4RFFVRkVMRVZCUVVrc1EwRkJTaXhGUVVGVk8wRkJRemxDTEUxQlFVa3NVMEZCVXl4RlFVRkZMRXRCUVVZc1EwRkJVU3hEUVVGU0xFVkJRVmNzVjBGQldDeEZRVUZpTzBGQlEwRXNUVUZCU1N4VFFVRlRMRVZCUVVVc1MwRkJSaXhEUVVGUkxFTkJRVklzUlVGQlZ5eFhRVUZZTEVWQlFXSTdRVUZEUVN4TlFVRkpMRk5CUVZNc1RVRkJZaXhGUVVGeFFpeFBRVUZQTEVOQlFWQXNRMEZCY2tJc1MwRkRTeXhKUVVGSkxGTkJRVk1zVFVGQllpeEZRVUZ4UWl4UFFVRlBMRU5CUVVNc1EwRkJVaXhEUVVGeVFpeExRVU5CTEU5QlFVOHNRMEZCVUR0QlFVTk1MRVZCVGtRN1FVRlBRU3hEUVZoRU96dEJRV0ZCTEVsQlFVMHNXVUZCV1N4VFFVRmFMRk5CUVZrc1IwRkJUVHRCUVVOMlFpeFBRVUZOTEdGQlFVNHNSVUZCVlN4SlFVRldMRU5CUVdVN1FVRkJRU3hUUVVGUExFbEJRVWtzU1VGQlNpeEZRVUZRTzBGQlFVRXNSVUZCWml4RlFVTkRMRWxCUkVRc1EwRkRUU3huUWtGQlVUdEJRVU5pTEhkQ1FVRnpRaXhKUVVGMFFqdEJRVU5CTzBGQlEwRTdRVUZEUVN4RlFVeEVMRVZCVFVNc1MwRk9SQ3hEUVUxUE8wRkJRVUVzVTBGQlR5eFJRVUZSTEVsQlFWSXNRMEZCWVN4SFFVRmlMRU5CUVZBN1FVRkJRU3hGUVU1UU8wRkJUMEVzUTBGU1JEczdRVUZWUVN4SlFVRk5MRTlCUVU4c1UwRkJVQ3hKUVVGUExFZEJRVTA3UVVGRGJFSXNaME5CUVdFc1VVRkJZanRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVN4RFFWQkVPenRCUVZOQk96czdPenM3T3pzN1FVTjJSa0U3TzBGQlJVRXNTVUZCU1N4WFFVRlhMRXRCUVdZN1FVRkRRU3hKUVVGSkxFdEJRVXNzUzBGQlZEdEJRVU5CTEVsQlFVa3NhMEpCUVVvN08wRkJSVUVzU1VGQlRTeDFRa0ZCZFVJc1UwRkJka0lzYjBKQlFYVkNMRWRCUVUwN1FVRkRiRU1zUzBGQlRTeFZRVUZWTEUxQlFVMHNTVUZCVGl4RFFVRlhMRk5CUVZNc1owSkJRVlFzUTBGQk1FSXNaMEpCUVRGQ0xFTkJRVmdzUTBGQmFFSTdPMEZCUlVFc1UwRkJVU3hQUVVGU0xFTkJRV2RDTEdWQlFVODdRVUZEZEVJc1RVRkJTU3huUWtGQlNpeERRVUZ4UWl4UFFVRnlRaXhGUVVFNFFpeFZRVUZETEVkQlFVUXNSVUZCVXp0QlFVTjBReXhQUVVGSkxFTkJRVU1zVVVGQlRDeEZRVUZsTzBGQlEyUXNlVUpCUVZVc1UwRkJWaXhEUVVGdlFpeEhRVUZ3UWl4RFFVRjNRaXhWUVVGNFFqdEJRVU5CTEhGQ1FVRk5MRWRCUVU0c1IwRkJXU3hKUVVGSkxFZEJRV2hDTzBGQlEwRXNaVUZCVnl4SlFVRllPMEZCUTBFN1FVRkRSQ3hIUVU1RU8wRkJUMEVzUlVGU1JEczdRVUZWUVN4elFrRkJWU3huUWtGQlZpeERRVUV5UWl4UFFVRXpRaXhGUVVGdlF5eFZRVUZETEVkQlFVUXNSVUZCVXp0QlFVTTFReXhOUVVGSkxFbEJRVWtzVFVGQlNpeExRVUZsTEdkQ1FVRnVRaXhGUVVFd1FqdEJRVU14UWl4MVFrRkJWU3hUUVVGV0xFTkJRVzlDTEUxQlFYQkNMRU5CUVRKQ0xGVkJRVE5DTzBGQlEwRXNZVUZCVnl4TFFVRllPMEZCUTBFc1JVRktSRHM3UVVGTlFTeHJRa0ZCVFN4blFrRkJUaXhEUVVGMVFpeFBRVUYyUWl4RlFVRm5ReXhaUVVGTk8wRkJRM0pETEUxQlFVa3NRMEZCUXl4RlFVRk1MRVZCUVZNN1FVRkRVaXhsUVVGWkxHbENRVUZOTEV0QlFVNHNSMEZCWXl4UFFVRlBMRlZCUVhKQ0xFZEJRV3RETEdGQlFXeERMRWRCUVd0RUxGTkJRVGxFTzBGQlEwRXNiMEpCUVUwc1UwRkJUaXhEUVVGblFpeEhRVUZvUWl4RFFVRnZRaXhUUVVGd1FqdEJRVU5CTEdOQlFWYzdRVUZCUVN4WFFVRk5MRXRCUVVzc1NVRkJXRHRCUVVGQkxFbEJRVmdzUlVGQk5FSXNSMEZCTlVJN1FVRkRRU3hIUVVwRUxFMUJTVTg3UVVGRFRpeHZRa0ZCVFN4VFFVRk9MRU5CUVdkQ0xFMUJRV2hDTEVOQlFYVkNMRk5CUVhaQ08wRkJRMEVzZDBKQlFWVXNVMEZCVml4RFFVRnZRaXhOUVVGd1FpeERRVUV5UWl4VlFVRXpRanRCUVVOQkxGRkJRVXNzUzBGQlREdEJRVU5CTEdOQlFWY3NTMEZCV0R0QlFVTkJPMEZCUTBRc1JVRllSRHRCUVZsQkxFTkJMMEpFT3p0clFrRnBRMlVzYjBJN096czdPenM3T3p0QlEzWkRaanM3UVVGRlFTeEpRVUZKTEZGQlFWRXNTMEZCV2p0QlFVTkJMRWxCUVUwc2RVSkJRWFZDTEZOQlFYWkNMRzlDUVVGMVFpeEhRVUZOTzBGQlEyeERMRXRCUVUwc1VVRkJVU3hUUVVGVExHTkJRVlFzUTBGQmQwSXNVMEZCZUVJc1EwRkJaRHM3UVVGRlFTeFBRVUZOTEdkQ1FVRk9MRU5CUVhWQ0xFOUJRWFpDTEVWQlFXZERMRmxCUVUwN1FVRkRja01zYjBKQlFVOHNVMEZCVUN4RFFVRnBRaXhIUVVGcVFpeERRVUZ4UWl4TlFVRnlRanRCUVVOQkxGVkJRVkVzU1VGQlVqdEJRVU5CTEVWQlNFUTdPMEZCUzBFc2JVSkJRVThzWjBKQlFWQXNRMEZCZDBJc1QwRkJlRUlzUlVGQmFVTXNXVUZCVFR0QlFVTjBReXh2UWtGQlR5eFRRVUZRTEVOQlFXbENMRTFCUVdwQ0xFTkJRWGRDTEUxQlFYaENPMEZCUTBFc1ZVRkJVU3hMUVVGU08wRkJRMEVzUlVGSVJEczdRVUZMUVN4UlFVRlBMR2RDUVVGUUxFTkJRWGRDTEZOQlFYaENMRVZCUVcxRExGbEJRVTA3UVVGRGVFTXNUVUZCU1N4TFFVRktMRVZCUVZjN1FVRkRWaXhqUVVGWExGbEJRVTA3UVVGRGFFSXNjMEpCUVU4c1UwRkJVQ3hEUVVGcFFpeE5RVUZxUWl4RFFVRjNRaXhOUVVGNFFqdEJRVU5CTEZsQlFWRXNTMEZCVWp0QlFVTkJMRWxCU0VRc1JVRkhSeXhIUVVoSU8wRkJTVUU3UVVGRFJDeEZRVkJFTzBGQlVVRXNRMEZ5UWtRN08ydENRWFZDWlN4dlFqczdPenM3T3pzN08wRkRNVUptT3p0QlFVTkJPenRCUVVWQkxFbEJRVWtzWVVGQlNqdEJRVU5CTEVsQlFVa3NWVUZCVlN4RFFVRmtPMEZCUTBFc1NVRkJTU3haUVVGWkxFdEJRV2hDT3p0QlFVVkJMRWxCUVUwc2VVSkJRWGxDTEZOQlFYcENMSE5DUVVGNVFpeEhRVUZOTzBGQlEzQkRMSE5DUVVGVkxHZENRVUZXTEVOQlFUSkNMRkZCUVROQ0xFVkJRWEZETEZsQlFVMDdRVUZETVVNc1RVRkJTU3hKUVVGSkxHdENRVUZQTEhGQ1FVRlFMRWRCUVN0Q0xFTkJRWFpET3p0QlFVVkJMRTFCUVVrc1dVRkJXU3hEUVVGb1FpeEZRVUZ0UWp0QlFVTnNRaXhWUVVGUExFOUJRVkE3UVVGRFFTeGhRVUZWTEVOQlFWWTdRVUZEUVRzN1FVRkZSQ3hOUVVGSkxFdEJRVXNzUTBGQlF5eEZRVUZPTEVsQlFWa3NRMEZCUXl4VFFVRnFRaXhGUVVFMFFqdEJRVU16UWl4MVFrRkJVeXhUUVVGVUxFTkJRVzFDTEVkQlFXNUNMRU5CUVhWQ0xFMUJRWFpDTzBGQlEwRXNaVUZCV1N4SlFVRmFPMEZCUTBFc1IwRklSQ3hOUVVkUExFbEJRVWtzU1VGQlNTeERRVUZETEVWQlFVd3NTVUZCVnl4VFFVRm1MRVZCUVRCQ08wRkJRMmhETEhWQ1FVRlRMRk5CUVZRc1EwRkJiVUlzVFVGQmJrSXNRMEZCTUVJc1RVRkJNVUk3UVVGRFFTeGxRVUZaTEV0QlFWbzdRVUZEUVR0QlFVTkVMRVZCWmtRN08wRkJhVUpCTEhGQ1FVRlRMR2RDUVVGVUxFTkJRVEJDTEU5QlFURkNMRVZCUVcxRE8wRkJRVUVzVTBGQlRTeDVRa0ZCVGp0QlFVRkJMRVZCUVc1RE8wRkJRMEVzUTBGdVFrUTdPMnRDUVhGQ1pTeHpRanM3T3pzN096czdPenRCUXpWQ1pqczdPenRCUVVOQk96czdPMEZCUTBFN096czdRVUZEUVRzN096dEJRVU5CT3pzN096czdVVUZIUXl4dlFpeEhRVUZCTERoQ08xRkJRMEVzYzBJc1IwRkJRU3huUXp0UlFVTkJMRzlDTEVkQlFVRXNPRUk3VVVGRFFTeFpMRWRCUVVFc2MwSTdVVUZEUVN4VkxFZEJRVUVzYjBJN096czdPenM3TzBGRFdFUXNTVUZCVFN4WFFVRlhMRU5CUVVNc1IwRkJSQ3hGUVVGTkxFZEJRVTRzUlVGQlZ5eEhRVUZZTEVWQlFXZENMRWRCUVdoQ0xFVkJRWEZDTEVkQlFYSkNMRVZCUVRCQ0xFZEJRVEZDTEVWQlFTdENMRWRCUVM5Q0xFVkJRVzlETEVkQlFYQkRMRVZCUVhsRExFZEJRWHBETEVWQlFUaERMRWRCUVRsRExFVkJRVzFFTEVkQlFXNUVMRVZCUVhkRUxFZEJRWGhFTEVWQlFUWkVMRWRCUVRkRUxFVkJRV3RGTEVkQlFXeEZMRVZCUVhWRkxFZEJRWFpGTEVWQlFUUkZMRWRCUVRWRkxFVkJRV2xHTEVkQlFXcEdMRVZCUVhOR0xFZEJRWFJHTEVWQlFUSkdMRWRCUVROR0xFVkJRV2RITEVkQlFXaEhMRVZCUVhGSExFZEJRWEpITEVWQlFUQkhMRWRCUVRGSExFVkJRU3RITEVkQlFTOUhMRVZCUVc5SUxFZEJRWEJJTEVOQlFXcENPenRCUVVWQkxFbEJRVTBzWlVGQlpTeFRRVUZtTEZsQlFXVXNRMEZCUXl4UFFVRkVMRVZCUVdFN1FVRkRha01zUzBGQlRTeHBRa0ZCYVVJc1UwRkJha0lzWTBGQmFVSXNRMEZCUXl4SlFVRkVMRVZCUVZVN1FVRkRhRU1zVFVGQlRTeFhRVUZYTEZWQlFWVXNhVUpCUVZZc1IwRkJPRUlzYTBKQlFTOURPMEZCUTBFc1RVRkJUU3hsUVVGbExFTkJRVU1zVDBGQlJDeEhRVUZYTEdsQ1FVRllMRWRCUVN0Q0xHdENRVUZ3UkRzN1FVRkZRU3hOUVVGTkxGZEJRVmNzVFVGQlRTeEpRVUZPTEVOQlFWY3NVMEZCVXl4blFrRkJWQ3hEUVVFd1FpeFJRVUV4UWl4RFFVRllMRU5CUVdwQ08wRkJRMEVzVFVGQlRTeGxRVUZsTEUxQlFVMHNTVUZCVGl4RFFVRlhMRk5CUVZNc1owSkJRVlFzUTBGQk1FSXNXVUZCTVVJc1EwRkJXQ3hEUVVGeVFqczdRVUZGUVN4bFFVRmhMRTlCUVdJc1EwRkJjVUk3UVVGQlFTeFZRVUZUTEUxQlFVMHNaVUZCVGl4RFFVRnpRaXhOUVVGMFFpeERRVUZVTzBGQlFVRXNSMEZCY2tJN08wRkJSVUVzVTBGQlR5eFRRVUZUTEVsQlFWUXNRMEZCWXl4cFFrRkJVenRCUVVNM1FpeFBRVUZKTEU5QlFVOHNUVUZCVFN4clFrRkJha0k3UVVGRFFTeFZRVUZQTEV0QlFVc3NVMEZCVEN4RFFVRmxMRU5CUVdZc1RVRkJjMElzU1VGQmRFSXNTVUZCT0VJc1MwRkJTeXhUUVVGTUxFTkJRV1VzUTBGQlppeE5RVUZ6UWl4TFFVRkxMRmRCUVV3c1JVRkJNMFE3UVVGRFFTeEhRVWhOTEVOQlFWQTdRVUZKUVN4RlFXSkVPenRCUVdWQkxFdEJRVTBzZFVKQlFYVkNMRk5CUVhaQ0xHOUNRVUYxUWl4RFFVRkRMRTlCUVVRc1JVRkJWU3hOUVVGV0xFVkJRWEZDTzBGQlEycEVMRlZCUVZFc1owSkJRVklzUTBGQmVVSXNUMEZCZWtJc1JVRkJhME1zV1VGQlRUdEJRVU4yUXl4UFFVRk5MR0ZCUVdFc1UwRkJVeXhqUVVGVUxFTkJRWGRDTEUxQlFYaENMRU5CUVc1Q08wRkJRMEVzVDBGQlNTeGxRVUZLT3p0QlFVVkJMRTlCUVVrc1EwRkJReXhQUVVGTUxFVkJRV003UVVGRFlpeGhRVUZUTEZkQlFWY3NSMEZCV0N4SFFVRnBRaXhUUVVGVExHTkJRVlFzUTBGQmQwSXNaVUZCZUVJc1EwRkJha0lzUjBGQk5FUXNWMEZCVnl4aFFVRllMRU5CUVhsQ0xHRkJRWHBDTEVOQlFYVkRMR0ZCUVhaRExFTkJRWEZFTEdGQlFYSkVMRU5CUVcxRkxITkNRVUZ1UlN4RFFVRXdSaXhoUVVFeFJpeERRVUYzUnl3eVFrRkJlRWNzUTBGQmNrVTdRVUZEUVN4SlFVWkVMRTFCUlU4N1FVRkRUaXhoUVVGVExGZEJRVmNzUjBGQldDeEhRVUZwUWl4VFFVRlRMR05CUVZRc1EwRkJkMElzWlVGQmVFSXNRMEZCYWtJc1IwRkJORVFzVjBGQlZ5eGhRVUZZTEVOQlFYbENMR0ZCUVhwQ0xFTkJRWFZETEdGQlFYWkRMRU5CUVhGRUxITkNRVUZ5UkN4RFFVRTBSU3hoUVVFMVJTeERRVUV3Uml3eVFrRkJNVVlzUTBGQmNrVTdRVUZEUVRzN1FVRkZSQ3hWUVVGUExHTkJRVkFzUTBGQmMwSXNSVUZCUXl4VlFVRlZMRkZCUVZnc1JVRkJjVUlzVDBGQlR5eFBRVUUxUWl4RlFVRjBRanRCUVVOQkxFZEJXRVE3UVVGWlFTeEZRV0pFT3p0QlFXVkJMRXRCUVVrc1owSkJRV2RDTEVWQlFYQkNPMEZCUTBFc1MwRkJTU3hUUVVGVExGTkJRVk1zWVVGQlZDeERRVUYxUWl4dlFrRkJka0lzUTBGQllqdEJRVU5CTEZGQlFVOHNVMEZCVUN4SFFVRnRRaXhGUVVGdVFqczdRVUZGUVN4VlFVRlRMRTlCUVZRc1EwRkJhVUlzYTBKQlFWVTdRVUZETVVJc1RVRkJTU3hqUVVGakxHVkJRV1VzVFVGQlppeERRVUZzUWp0QlFVTkJMRTFCUVVrc1ZVRkJWU3hUUVVGVExHRkJRVlFzUTBGQmRVSXNSMEZCZGtJc1EwRkJaRHM3UVVGRlFTeE5RVUZKTEVOQlFVTXNWMEZCVEN4RlFVRnJRanM3UVVGRmJFSXNZMEZCV1N4RlFVRmFMRWRCUVdsQ0xFMUJRV3BDTzBGQlEwRXNWVUZCVVN4VFFVRlNMRWRCUVc5Q0xFOUJRVThzVjBGQlVDeEZRVUZ3UWp0QlFVTkJMRlZCUVZFc1UwRkJVaXhIUVVGdlFpeDVRa0ZCY0VJN08wRkJSVUVzZFVKQlFYRkNMRTlCUVhKQ0xFVkJRVGhDTEUxQlFUbENPMEZCUTBFc1UwRkJUeXhYUVVGUUxFTkJRVzFDTEU5QlFXNUNPMEZCUTBFc1JVRmFSRHRCUVdGQkxFTkJhRVJFT3p0clFrRnJSR1VzV1RzN096czdPenM3UVVOd1JHWXNTVUZCVFN4aFFVRmhMRk5CUVdJc1ZVRkJZU3hEUVVGRExFOUJRVVFzUlVGQllUdEJRVU12UWl4TFFVRk5MR0ZCUVdFc1VVRkJVU3hoUVVGU0xFTkJRWE5DTEdGQlFYUkNMRU5CUVc5RExHRkJRWEJETEVOQlFXNUNPMEZCUTBFc1MwRkJUU3hoUVVGaExGRkJRVkVzWVVGQlVpeERRVUZ6UWl4aFFVRjBRaXhEUVVGdlF5eGhRVUZ3UXl4RFFVRnVRanM3UVVGRlFTeExRVUZKTEZWQlFWVXNVVUZCVVN4cFFrRkJkRUk3UVVGRFFTeFpRVUZYTEdkQ1FVRllMRU5CUVRSQ0xFOUJRVFZDTEVWQlFYRkRMRmxCUVUwN1FVRkRNVU1zVFVGQlRTeFBRVUZQTEZGQlFWRXNhMEpCUVhKQ08wRkJRMEVzVFVGQlNTeEpRVUZLTEVWQlFWVTdRVUZEVkN4UlFVRkxMR05CUVV3c1EwRkJiMElzUlVGQlF5eFZRVUZWTEZGQlFWZ3NSVUZCY1VJc1QwRkJUeXhUUVVFMVFpeEZRVUYxUXl4UlFVRlJMRkZCUVM5RExFVkJRWEJDTzBGQlEwRXNZVUZCVlN4SlFVRldPMEZCUTBFN1FVRkRSQ3hGUVU1RU96dEJRVkZCTEZsQlFWY3NaMEpCUVZnc1EwRkJORUlzVDBGQk5VSXNSVUZCY1VNc1dVRkJUVHRCUVVNeFF5eE5RVUZOTEU5QlFVOHNVVUZCVVN4elFrRkJja0k3UVVGRFFTeE5RVUZKTEVsQlFVb3NSVUZCVlR0QlFVTlVMRkZCUVVzc1kwRkJUQ3hEUVVGdlFpeEZRVUZETEZWQlFWVXNVVUZCV0N4RlFVRnhRaXhQUVVGUExGTkJRVFZDTEVWQlFYVkRMRkZCUVZFc1VVRkJMME1zUlVGQmNFSTdRVUZEUVN4aFFVRlZMRWxCUVZZN1FVRkRRVHRCUVVORUxFVkJUa1E3UVVGUFFTeERRWEJDUkRzN2EwSkJjMEpsTEZVN096czdPenM3TzBGRGRFSm1MRWxCUVUwc1owSkJRV2RDTEZOQlFXaENMR0ZCUVdkQ0xFTkJRVU1zUzBGQlJEdEJRVUZCTEhsSFFVVnBReXhMUVVacVF6dEJRVUZCTEVOQlFYUkNPenRCUVUxQkxFbEJRVTBzYTBKQlFXdENMRk5CUVd4Q0xHVkJRV3RDTEVOQlFVTXNTMEZCUkN4RlFVRlJMRU5CUVZJc1JVRkJZenRCUVVGQkxFdEJRemRDTEV0QlJEWkNMRWRCUTNGRkxFdEJSSEpGTEVOQlF6ZENMRXRCUkRaQ08wRkJRVUVzUzBGRGRFSXNVMEZFYzBJc1IwRkRjVVVzUzBGRWNrVXNRMEZEZEVJc1UwRkVjMEk3UVVGQlFTeExRVU5ZTEZGQlJGY3NSMEZEY1VVc1MwRkVja1VzUTBGRFdDeFJRVVJYTzBGQlFVRXNTMEZEUkN4TlFVUkRMRWRCUTNGRkxFdEJSSEpGTEVOQlEwUXNUVUZFUXp0QlFVRkJMRXRCUTA4c1YwRkVVQ3hIUVVOeFJTeExRVVJ5UlN4RFFVTlBMRmRCUkZBN1FVRkJRU3hMUVVOdlFpeFJRVVJ3UWl4SFFVTnhSU3hMUVVSeVJTeERRVU52UWl4UlFVUndRanRCUVVGQkxFdEJRemhDTEZWQlJEbENMRWRCUTNGRkxFdEJSSEpGTEVOQlF6aENMRlZCUkRsQ08wRkJRVUVzUzBGRE1FTXNTVUZFTVVNc1IwRkRjVVVzUzBGRWNrVXNRMEZETUVNc1NVRkVNVU03UVVGQlFTeExRVU5uUkN4SlFVUm9SQ3hIUVVOeFJTeExRVVJ5UlN4RFFVTm5SQ3hKUVVSb1JEdEJRVUZCTEV0QlEzTkVMRWxCUkhSRUxFZEJRM0ZGTEV0QlJISkZMRU5CUTNORUxFbEJSSFJFTzBGQlFVRXNTMEZETkVRc1NVRkVOVVFzUjBGRGNVVXNTMEZFY2tVc1EwRkRORVFzU1VGRU5VUTdPenRCUVVkeVF5eExRVUZOTEZsQlFWa3NUMEZCVHl4TlFVRlFMRWRCUTJwQ0xFOUJRVThzUjBGQlVDeERRVUZYTzBGQlFVRXNVMEZCVXl4alFVRmpMRXRCUVdRc1EwRkJWRHRCUVVGQkxFVkJRVmdzUlVGQk1FTXNTVUZCTVVNc1EwRkJLME1zUlVGQkwwTXNRMEZFYVVJc1IwRkRiME1zUlVGRWRFUTdPMEZCUjBFc2QwNUJTM2xETEV0QlRIcERMSEZJUVU5clJDeFRRVkJzUkN4dlNFRlRhVVFzVVVGVWFrUXNNRXBCWVc5RUxFTkJZbkJFTEhkQ1FXTlBMRk5CWkZBc0swZEJaMEo1UXl4WFFXaENla01zTUVSQmFVSnZReXhSUVdwQ2NFTXNhVVpCYTBJeVJDeFZRV3hDTTBRc2FVWkJiVUl5UkN4SlFXNUNNMFFzYVVaQmIwSXlSQ3hKUVhCQ00wUXNjVWhCY1VJclJpeEpRWEpDTDBZc1ZVRnhRbmRITEVsQmNrSjRSenRCUVdkRFFTeERRWFJEUkRzN2EwSkJkME5sTEdVN096czdPenM3T3pzN1FVTTVRMlk3T3pzN1FVRkRRVHM3T3pzN08xRkJSVk1zWlN4SFFVRkJMR2xDTzFGQlFXbENMRmNzUjBGQlFTeGxPenM3T3pzN096dEJRMGd4UWl4SlFVRk5MRzF0UWtGQlRqczdRVUZwUWtFc1NVRkJUU3hqUVVGakxGTkJRV1FzVjBGQll5eEhRVUZOTzBGQlEzcENMRXRCUVVrc1YwRkJWeXhUUVVGVExHTkJRVlFzUTBGQmQwSXNVVUZCZUVJc1EwRkJaanRCUVVOQkxGVkJRVk1zVTBGQlZDeEhRVUZ4UWl4UlFVRnlRanRCUVVOQkxFTkJTRVE3TzJ0Q1FVdGxMRmM3T3pzN096czdPenM3UVVOMFFtWTdPMEZCUlVFc1NVRkJUU3hYUVVGWExGTkJRVmdzVVVGQlZ5eERRVUZETEVWQlFVUXNSVUZCU3l4SlFVRk1MRVZCUVdNN1FVRkROMElzVFVGQlNTeG5Ra0ZCU2pzN1FVRkZRU3hUUVVGUExGbEJRVmM3UVVGQlFUdEJRVUZCT3p0QlFVTm9RaXhSUVVGTkxHVkJRV1VzVTBGQlppeFpRVUZsTzBGQlFVRXNZVUZCVFN4SFFVRkhMRXRCUVVnc1EwRkJVeXhMUVVGVUxFVkJRV1VzVlVGQlppeERRVUZPTzBGQlFVRXNTMEZCY2tJN08wRkJSVUVzYVVKQlFXRXNUMEZCWWp0QlFVTkJMR05CUVZVc1YwRkJWeXhaUVVGWUxFVkJRWGxDTEVsQlFYcENMRU5CUVZZN1FVRkRSQ3hIUVV4RU8wRkJUVVFzUTBGVVJEczdRVUZYUVN4SlFVRk5MR05CUVdNc1UwRkJaQ3hYUVVGakxFZEJRVTA3UVVGRGVrSXNjMEpCUVZNc1QwRkJWQ3hEUVVGcFFqdEJRVUZCTEZkQlFWRXNTMEZCU3l4VFFVRk1MRU5CUVdVc1IwRkJaaXhEUVVGdFFpeFBRVUZ1UWl4RFFVRlNPMEZCUVVFc1IwRkJha0k3UVVGRFFTeHJRa0ZCU3l4VFFVRk1MRU5CUVdVc1IwRkJaaXhEUVVGdFFpeFBRVUZ1UWp0QlFVTkJMRU5CU0VRN08wRkJTMEVzU1VGQlRTeGpRVUZqTEZOQlFXUXNWMEZCWXl4SFFVRk5PMEZCUTNwQ0xFMUJRVWtzVFVGQlRTeFRRVUZUTEdOQlFWUXNRMEZCZDBJc1pVRkJlRUlzUTBGQlZqdEJRVU5CTEUxQlFVa3NZMEZCU2l4RFFVRnRRaXhGUVVGRExGVkJRVlVzVVVGQldDeEZRVUZ4UWl4UFFVRlBMRTlCUVRWQ0xFVkJRVzVDTzBGQlEwRXNRMEZJUkRzN1VVRkxVeXhSTEVkQlFVRXNVVHRSUVVGVkxGY3NSMEZCUVN4WE8xRkJRV0VzVnl4SFFVRkJMRmNpTENKbWFXeGxJam9pWjJWdVpYSmhkR1ZrTG1weklpd2ljMjkxY21ObFVtOXZkQ0k2SWlJc0luTnZkWEpqWlhORGIyNTBaVzUwSWpwYklpaG1kVzVqZEdsdmJpZ3BlMloxYm1OMGFXOXVJSElvWlN4dUxIUXBlMloxYm1OMGFXOXVJRzhvYVN4bUtYdHBaaWdoYmx0cFhTbDdhV1lvSVdWYmFWMHBlM1poY2lCalBWd2lablZ1WTNScGIyNWNJajA5ZEhsd1pXOW1JSEpsY1hWcGNtVW1KbkpsY1hWcGNtVTdhV1lvSVdZbUptTXBjbVYwZFhKdUlHTW9hU3doTUNrN2FXWW9kU2x5WlhSMWNtNGdkU2hwTENFd0tUdDJZWElnWVQxdVpYY2dSWEp5YjNJb1hDSkRZVzV1YjNRZ1ptbHVaQ0J0YjJSMWJHVWdKMXdpSzJrclhDSW5YQ0lwTzNSb2NtOTNJR0V1WTI5a1pUMWNJazFQUkZWTVJWOU9UMVJmUms5VlRrUmNJaXhoZlhaaGNpQndQVzViYVYwOWUyVjRjRzl5ZEhNNmUzMTlPMlZiYVYxYk1GMHVZMkZzYkNod0xtVjRjRzl5ZEhNc1puVnVZM1JwYjI0b2NpbDdkbUZ5SUc0OVpWdHBYVnN4WFZ0eVhUdHlaWFIxY200Z2J5aHVmSHh5S1gwc2NDeHdMbVY0Y0c5eWRITXNjaXhsTEc0c2RDbDljbVYwZFhKdUlHNWJhVjB1Wlhod2IzSjBjMzFtYjNJb2RtRnlJSFU5WENKbWRXNWpkR2x2Ymx3aVBUMTBlWEJsYjJZZ2NtVnhkV2x5WlNZbWNtVnhkV2x5WlN4cFBUQTdhVHgwTG14bGJtZDBhRHRwS3lzcGJ5aDBXMmxkS1R0eVpYUjFjbTRnYjMxeVpYUjFjbTRnY24wcEtDa2lMQ0l2S2lCemJXOXZkR2h6WTNKdmJHd2dkakF1TkM0d0lDMGdNakF4T0NBdElFUjFjM1JoYmlCTFlYTjBaVzRzSUVwbGNtVnRhV0Z6SUUxbGJtbGphR1ZzYkdrZ0xTQk5TVlFnVEdsalpXNXpaU0FxTDF4dUtHWjFibU4wYVc5dUlDZ3BJSHRjYmlBZ0ozVnpaU0J6ZEhKcFkzUW5PMXh1WEc0Z0lDOHZJSEJ2YkhsbWFXeHNYRzRnSUdaMWJtTjBhVzl1SUhCdmJIbG1hV3hzS0NrZ2UxeHVJQ0FnSUM4dklHRnNhV0Z6WlhOY2JpQWdJQ0IyWVhJZ2R5QTlJSGRwYm1SdmR6dGNiaUFnSUNCMllYSWdaQ0E5SUdSdlkzVnRaVzUwTzF4dVhHNGdJQ0FnTHk4Z2NtVjBkWEp1SUdsbUlITmpjbTlzYkNCaVpXaGhkbWx2Y2lCcGN5QnpkWEJ3YjNKMFpXUWdZVzVrSUhCdmJIbG1hV3hzSUdseklHNXZkQ0JtYjNKalpXUmNiaUFnSUNCcFppQW9YRzRnSUNBZ0lDQW5jMk55YjJ4c1FtVm9ZWFpwYjNJbklHbHVJR1F1Wkc5amRXMWxiblJGYkdWdFpXNTBMbk4wZVd4bElDWW1YRzRnSUNBZ0lDQjNMbDlmWm05eVkyVlRiVzl2ZEdoVFkzSnZiR3hRYjJ4NVptbHNiRjlmSUNFOVBTQjBjblZsWEc0Z0lDQWdLU0I3WEc0Z0lDQWdJQ0J5WlhSMWNtNDdYRzRnSUNBZ2ZWeHVYRzRnSUNBZ0x5OGdaMnh2WW1Gc2MxeHVJQ0FnSUhaaGNpQkZiR1Z0Wlc1MElEMGdkeTVJVkUxTVJXeGxiV1Z1ZENCOGZDQjNMa1ZzWlcxbGJuUTdYRzRnSUNBZ2RtRnlJRk5EVWs5TVRGOVVTVTFGSUQwZ05EWTRPMXh1WEc0Z0lDQWdMeThnYjJKcVpXTjBJR2RoZEdobGNtbHVaeUJ2Y21sbmFXNWhiQ0J6WTNKdmJHd2diV1YwYUc5a2MxeHVJQ0FnSUhaaGNpQnZjbWxuYVc1aGJDQTlJSHRjYmlBZ0lDQWdJSE5qY205c2JEb2dkeTV6WTNKdmJHd2dmSHdnZHk1elkzSnZiR3hVYnl4Y2JpQWdJQ0FnSUhOamNtOXNiRUo1T2lCM0xuTmpjbTlzYkVKNUxGeHVJQ0FnSUNBZ1pXeGxiV1Z1ZEZOamNtOXNiRG9nUld4bGJXVnVkQzV3Y205MGIzUjVjR1V1YzJOeWIyeHNJSHg4SUhOamNtOXNiRVZzWlcxbGJuUXNYRzRnSUNBZ0lDQnpZM0p2Ykd4SmJuUnZWbWxsZHpvZ1JXeGxiV1Z1ZEM1d2NtOTBiM1I1Y0dVdWMyTnliMnhzU1c1MGIxWnBaWGRjYmlBZ0lDQjlPMXh1WEc0Z0lDQWdMeThnWkdWbWFXNWxJSFJwYldsdVp5QnRaWFJvYjJSY2JpQWdJQ0IyWVhJZ2JtOTNJRDFjYmlBZ0lDQWdJSGN1Y0dWeVptOXliV0Z1WTJVZ0ppWWdkeTV3WlhKbWIzSnRZVzVqWlM1dWIzZGNiaUFnSUNBZ0lDQWdQeUIzTG5CbGNtWnZjbTFoYm1ObExtNXZkeTVpYVc1a0tIY3VjR1Z5Wm05eWJXRnVZMlVwWEc0Z0lDQWdJQ0FnSURvZ1JHRjBaUzV1YjNjN1hHNWNiaUFnSUNBdktpcGNiaUFnSUNBZ0tpQnBibVJwWTJGMFpYTWdhV1lnWVNCMGFHVWdZM1Z5Y21WdWRDQmljbTkzYzJWeUlHbHpJRzFoWkdVZ1lua2dUV2xqY205emIyWjBYRzRnSUNBZ0lDb2dRRzFsZEdodlpDQnBjMDFwWTNKdmMyOW1kRUp5YjNkelpYSmNiaUFnSUNBZ0tpQkFjR0Z5WVcwZ2UxTjBjbWx1WjMwZ2RYTmxja0ZuWlc1MFhHNGdJQ0FnSUNvZ1FISmxkSFZ5Ym5NZ2UwSnZiMnhsWVc1OVhHNGdJQ0FnSUNvdlhHNGdJQ0FnWm5WdVkzUnBiMjRnYVhOTmFXTnliM052Wm5SQ2NtOTNjMlZ5S0hWelpYSkJaMlZ1ZENrZ2UxeHVJQ0FnSUNBZ2RtRnlJSFZ6WlhKQloyVnVkRkJoZEhSbGNtNXpJRDBnV3lkTlUwbEZJQ2NzSUNkVWNtbGtaVzUwTHljc0lDZEZaR2RsTHlkZE8xeHVYRzRnSUNBZ0lDQnlaWFIxY200Z2JtVjNJRkpsWjBWNGNDaDFjMlZ5UVdkbGJuUlFZWFIwWlhKdWN5NXFiMmx1S0NkOEp5a3BMblJsYzNRb2RYTmxja0ZuWlc1MEtUdGNiaUFnSUNCOVhHNWNiaUFnSUNBdktseHVJQ0FnSUNBcUlFbEZJR2hoY3lCeWIzVnVaR2x1WnlCaWRXY2djbTkxYm1ScGJtY2daRzkzYmlCamJHbGxiblJJWldsbmFIUWdZVzVrSUdOc2FXVnVkRmRwWkhSb0lHRnVaRnh1SUNBZ0lDQXFJSEp2ZFc1a2FXNW5JSFZ3SUhOamNtOXNiRWhsYVdkb2RDQmhibVFnYzJOeWIyeHNWMmxrZEdnZ1kyRjFjMmx1WnlCbVlXeHpaU0J3YjNOcGRHbDJaWE5jYmlBZ0lDQWdLaUJ2YmlCb1lYTlRZM0p2Ykd4aFlteGxVM0JoWTJWY2JpQWdJQ0FnS2k5Y2JpQWdJQ0IyWVhJZ1VrOVZUa1JKVGtkZlZFOU1SVkpCVGtORklEMGdhWE5OYVdOeWIzTnZablJDY205M2MyVnlLSGN1Ym1GMmFXZGhkRzl5TG5WelpYSkJaMlZ1ZENrZ1B5QXhJRG9nTUR0Y2JseHVJQ0FnSUM4cUtseHVJQ0FnSUNBcUlHTm9ZVzVuWlhNZ2MyTnliMnhzSUhCdmMybDBhVzl1SUdsdWMybGtaU0JoYmlCbGJHVnRaVzUwWEc0Z0lDQWdJQ29nUUcxbGRHaHZaQ0J6WTNKdmJHeEZiR1Z0Wlc1MFhHNGdJQ0FnSUNvZ1FIQmhjbUZ0SUh0T2RXMWlaWEo5SUhoY2JpQWdJQ0FnS2lCQWNHRnlZVzBnZTA1MWJXSmxjbjBnZVZ4dUlDQWdJQ0FxSUVCeVpYUjFjbTV6SUh0MWJtUmxabWx1WldSOVhHNGdJQ0FnSUNvdlhHNGdJQ0FnWm5WdVkzUnBiMjRnYzJOeWIyeHNSV3hsYldWdWRDaDRMQ0I1S1NCN1hHNGdJQ0FnSUNCMGFHbHpMbk5qY205c2JFeGxablFnUFNCNE8xeHVJQ0FnSUNBZ2RHaHBjeTV6WTNKdmJHeFViM0FnUFNCNU8xeHVJQ0FnSUgxY2JseHVJQ0FnSUM4cUtseHVJQ0FnSUNBcUlISmxkSFZ5Ym5NZ2NtVnpkV3gwSUc5bUlHRndjR3g1YVc1bklHVmhjMlVnYldGMGFDQm1kVzVqZEdsdmJpQjBieUJoSUc1MWJXSmxjbHh1SUNBZ0lDQXFJRUJ0WlhSb2IyUWdaV0Z6WlZ4dUlDQWdJQ0FxSUVCd1lYSmhiU0I3VG5WdFltVnlmU0JyWEc0Z0lDQWdJQ29nUUhKbGRIVnlibk1nZTA1MWJXSmxjbjFjYmlBZ0lDQWdLaTljYmlBZ0lDQm1kVzVqZEdsdmJpQmxZWE5sS0dzcElIdGNiaUFnSUNBZ0lISmxkSFZ5YmlBd0xqVWdLaUFvTVNBdElFMWhkR2d1WTI5ektFMWhkR2d1VUVrZ0tpQnJLU2s3WEc0Z0lDQWdmVnh1WEc0Z0lDQWdMeW9xWEc0Z0lDQWdJQ29nYVc1a2FXTmhkR1Z6SUdsbUlHRWdjMjF2YjNSb0lHSmxhR0YyYVc5eUlITm9iM1ZzWkNCaVpTQmhjSEJzYVdWa1hHNGdJQ0FnSUNvZ1FHMWxkR2h2WkNCemFHOTFiR1JDWVdsc1QzVjBYRzRnSUNBZ0lDb2dRSEJoY21GdElIdE9kVzFpWlhKOFQySnFaV04wZlNCbWFYSnpkRUZ5WjF4dUlDQWdJQ0FxSUVCeVpYUjFjbTV6SUh0Q2IyOXNaV0Z1ZlZ4dUlDQWdJQ0FxTDF4dUlDQWdJR1oxYm1OMGFXOXVJSE5vYjNWc1pFSmhhV3hQZFhRb1ptbHljM1JCY21jcElIdGNiaUFnSUNBZ0lHbG1JQ2hjYmlBZ0lDQWdJQ0FnWm1seWMzUkJjbWNnUFQwOUlHNTFiR3dnZkh4Y2JpQWdJQ0FnSUNBZ2RIbHdaVzltSUdacGNuTjBRWEpuSUNFOVBTQW5iMkpxWldOMEp5QjhmRnh1SUNBZ0lDQWdJQ0JtYVhKemRFRnlaeTVpWldoaGRtbHZjaUE5UFQwZ2RXNWtaV1pwYm1Wa0lIeDhYRzRnSUNBZ0lDQWdJR1pwY25OMFFYSm5MbUpsYUdGMmFXOXlJRDA5UFNBbllYVjBieWNnZkh4Y2JpQWdJQ0FnSUNBZ1ptbHljM1JCY21jdVltVm9ZWFpwYjNJZ1BUMDlJQ2RwYm5OMFlXNTBKMXh1SUNBZ0lDQWdLU0I3WEc0Z0lDQWdJQ0FnSUM4dklHWnBjbk4wSUdGeVozVnRaVzUwSUdseklHNXZkQ0JoYmlCdlltcGxZM1F2Ym5Wc2JGeHVJQ0FnSUNBZ0lDQXZMeUJ2Y2lCaVpXaGhkbWx2Y2lCcGN5QmhkWFJ2TENCcGJuTjBZVzUwSUc5eUlIVnVaR1ZtYVc1bFpGeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2RISjFaVHRjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnYVdZZ0tIUjVjR1Z2WmlCbWFYSnpkRUZ5WnlBOVBUMGdKMjlpYW1WamRDY2dKaVlnWm1seWMzUkJjbWN1WW1Wb1lYWnBiM0lnUFQwOUlDZHpiVzl2ZEdnbktTQjdYRzRnSUNBZ0lDQWdJQzh2SUdacGNuTjBJR0Z5WjNWdFpXNTBJR2x6SUdGdUlHOWlhbVZqZENCaGJtUWdZbVZvWVhacGIzSWdhWE1nYzIxdmIzUm9YRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQm1ZV3h6WlR0Y2JpQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0x5OGdkR2h5YjNjZ1pYSnliM0lnZDJobGJpQmlaV2hoZG1sdmNpQnBjeUJ1YjNRZ2MzVndjRzl5ZEdWa1hHNGdJQ0FnSUNCMGFISnZkeUJ1WlhjZ1ZIbHdaVVZ5Y205eUtGeHVJQ0FnSUNBZ0lDQW5ZbVZvWVhacGIzSWdiV1Z0WW1WeUlHOW1JRk5qY205c2JFOXdkR2x2Ym5NZ0p5QXJYRzRnSUNBZ0lDQWdJQ0FnWm1seWMzUkJjbWN1WW1Wb1lYWnBiM0lnSzF4dUlDQWdJQ0FnSUNBZ0lDY2dhWE1nYm05MElHRWdkbUZzYVdRZ2RtRnNkV1VnWm05eUlHVnVkVzFsY21GMGFXOXVJRk5qY205c2JFSmxhR0YyYVc5eUxpZGNiaUFnSUNBZ0lDazdYRzRnSUNBZ2ZWeHVYRzRnSUNBZ0x5b3FYRzRnSUNBZ0lDb2dhVzVrYVdOaGRHVnpJR2xtSUdGdUlHVnNaVzFsYm5RZ2FHRnpJSE5qY205c2JHRmliR1VnYzNCaFkyVWdhVzRnZEdobElIQnliM1pwWkdWa0lHRjRhWE5jYmlBZ0lDQWdLaUJBYldWMGFHOWtJR2hoYzFOamNtOXNiR0ZpYkdWVGNHRmpaVnh1SUNBZ0lDQXFJRUJ3WVhKaGJTQjdUbTlrWlgwZ1pXeGNiaUFnSUNBZ0tpQkFjR0Z5WVcwZ2UxTjBjbWx1WjMwZ1lYaHBjMXh1SUNBZ0lDQXFJRUJ5WlhSMWNtNXpJSHRDYjI5c1pXRnVmVnh1SUNBZ0lDQXFMMXh1SUNBZ0lHWjFibU4wYVc5dUlHaGhjMU5qY205c2JHRmliR1ZUY0dGalpTaGxiQ3dnWVhocGN5a2dlMXh1SUNBZ0lDQWdhV1lnS0dGNGFYTWdQVDA5SUNkWkp5a2dlMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdaV3d1WTJ4cFpXNTBTR1ZwWjJoMElDc2dVazlWVGtSSlRrZGZWRTlNUlZKQlRrTkZJRHdnWld3dWMyTnliMnhzU0dWcFoyaDBPMXh1SUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0JwWmlBb1lYaHBjeUE5UFQwZ0oxZ25LU0I3WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJsYkM1amJHbGxiblJYYVdSMGFDQXJJRkpQVlU1RVNVNUhYMVJQVEVWU1FVNURSU0E4SUdWc0xuTmpjbTlzYkZkcFpIUm9PMXh1SUNBZ0lDQWdmVnh1SUNBZ0lIMWNibHh1SUNBZ0lDOHFLbHh1SUNBZ0lDQXFJR2x1WkdsallYUmxjeUJwWmlCaGJpQmxiR1Z0Wlc1MElHaGhjeUJoSUhOamNtOXNiR0ZpYkdVZ2IzWmxjbVpzYjNjZ2NISnZjR1Z5ZEhrZ2FXNGdkR2hsSUdGNGFYTmNiaUFnSUNBZ0tpQkFiV1YwYUc5a0lHTmhiazkyWlhKbWJHOTNYRzRnSUNBZ0lDb2dRSEJoY21GdElIdE9iMlJsZlNCbGJGeHVJQ0FnSUNBcUlFQndZWEpoYlNCN1UzUnlhVzVuZlNCaGVHbHpYRzRnSUNBZ0lDb2dRSEpsZEhWeWJuTWdlMEp2YjJ4bFlXNTlYRzRnSUNBZ0lDb3ZYRzRnSUNBZ1puVnVZM1JwYjI0Z1kyRnVUM1psY21ac2IzY29aV3dzSUdGNGFYTXBJSHRjYmlBZ0lDQWdJSFpoY2lCdmRtVnlabXh2ZDFaaGJIVmxJRDBnZHk1blpYUkRiMjF3ZFhSbFpGTjBlV3hsS0dWc0xDQnVkV3hzS1ZzbmIzWmxjbVpzYjNjbklDc2dZWGhwYzEwN1hHNWNiaUFnSUNBZ0lISmxkSFZ5YmlCdmRtVnlabXh2ZDFaaGJIVmxJRDA5UFNBbllYVjBieWNnZkh3Z2IzWmxjbVpzYjNkV1lXeDFaU0E5UFQwZ0ozTmpjbTlzYkNjN1hHNGdJQ0FnZlZ4dVhHNGdJQ0FnTHlvcVhHNGdJQ0FnSUNvZ2FXNWthV05oZEdWeklHbG1JR0Z1SUdWc1pXMWxiblFnWTJGdUlHSmxJSE5qY205c2JHVmtJR2x1SUdWcGRHaGxjaUJoZUdselhHNGdJQ0FnSUNvZ1FHMWxkR2h2WkNCcGMxTmpjbTlzYkdGaWJHVmNiaUFnSUNBZ0tpQkFjR0Z5WVcwZ2UwNXZaR1Y5SUdWc1hHNGdJQ0FnSUNvZ1FIQmhjbUZ0SUh0VGRISnBibWQ5SUdGNGFYTmNiaUFnSUNBZ0tpQkFjbVYwZFhKdWN5QjdRbTl2YkdWaGJuMWNiaUFnSUNBZ0tpOWNiaUFnSUNCbWRXNWpkR2x2YmlCcGMxTmpjbTlzYkdGaWJHVW9aV3dwSUh0Y2JpQWdJQ0FnSUhaaGNpQnBjMU5qY205c2JHRmliR1ZaSUQwZ2FHRnpVMk55YjJ4c1lXSnNaVk53WVdObEtHVnNMQ0FuV1NjcElDWW1JR05oYms5MlpYSm1iRzkzS0dWc0xDQW5XU2NwTzF4dUlDQWdJQ0FnZG1GeUlHbHpVMk55YjJ4c1lXSnNaVmdnUFNCb1lYTlRZM0p2Ykd4aFlteGxVM0JoWTJVb1pXd3NJQ2RZSnlrZ0ppWWdZMkZ1VDNabGNtWnNiM2NvWld3c0lDZFlKeWs3WEc1Y2JpQWdJQ0FnSUhKbGRIVnliaUJwYzFOamNtOXNiR0ZpYkdWWklIeDhJR2x6VTJOeWIyeHNZV0pzWlZnN1hHNGdJQ0FnZlZ4dVhHNGdJQ0FnTHlvcVhHNGdJQ0FnSUNvZ1ptbHVaSE1nYzJOeWIyeHNZV0pzWlNCd1lYSmxiblFnYjJZZ1lXNGdaV3hsYldWdWRGeHVJQ0FnSUNBcUlFQnRaWFJvYjJRZ1ptbHVaRk5qY205c2JHRmliR1ZRWVhKbGJuUmNiaUFnSUNBZ0tpQkFjR0Z5WVcwZ2UwNXZaR1Y5SUdWc1hHNGdJQ0FnSUNvZ1FISmxkSFZ5Ym5NZ2UwNXZaR1Y5SUdWc1hHNGdJQ0FnSUNvdlhHNGdJQ0FnWm5WdVkzUnBiMjRnWm1sdVpGTmpjbTlzYkdGaWJHVlFZWEpsYm5Rb1pXd3BJSHRjYmlBZ0lDQWdJSFpoY2lCcGMwSnZaSGs3WEc1Y2JpQWdJQ0FnSUdSdklIdGNiaUFnSUNBZ0lDQWdaV3dnUFNCbGJDNXdZWEpsYm5ST2IyUmxPMXh1WEc0Z0lDQWdJQ0FnSUdselFtOWtlU0E5SUdWc0lEMDlQU0JrTG1KdlpIazdYRzRnSUNBZ0lDQjlJSGRvYVd4bElDaHBjMEp2WkhrZ1BUMDlJR1poYkhObElDWW1JR2x6VTJOeWIyeHNZV0pzWlNobGJDa2dQVDA5SUdaaGJITmxLVHRjYmx4dUlDQWdJQ0FnYVhOQ2IyUjVJRDBnYm5Wc2JEdGNibHh1SUNBZ0lDQWdjbVYwZFhKdUlHVnNPMXh1SUNBZ0lIMWNibHh1SUNBZ0lDOHFLbHh1SUNBZ0lDQXFJSE5sYkdZZ2FXNTJiMnRsWkNCbWRXNWpkR2x2YmlCMGFHRjBMQ0JuYVhabGJpQmhJR052Ym5SbGVIUXNJSE4wWlhCeklIUm9jbTkxWjJnZ2MyTnliMnhzYVc1blhHNGdJQ0FnSUNvZ1FHMWxkR2h2WkNCemRHVndYRzRnSUNBZ0lDb2dRSEJoY21GdElIdFBZbXBsWTNSOUlHTnZiblJsZUhSY2JpQWdJQ0FnS2lCQWNtVjBkWEp1Y3lCN2RXNWtaV1pwYm1Wa2ZWeHVJQ0FnSUNBcUwxeHVJQ0FnSUdaMWJtTjBhVzl1SUhOMFpYQW9ZMjl1ZEdWNGRDa2dlMXh1SUNBZ0lDQWdkbUZ5SUhScGJXVWdQU0J1YjNjb0tUdGNiaUFnSUNBZ0lIWmhjaUIyWVd4MVpUdGNiaUFnSUNBZ0lIWmhjaUJqZFhKeVpXNTBXRHRjYmlBZ0lDQWdJSFpoY2lCamRYSnlaVzUwV1R0Y2JpQWdJQ0FnSUhaaGNpQmxiR0Z3YzJWa0lEMGdLSFJwYldVZ0xTQmpiMjUwWlhoMExuTjBZWEowVkdsdFpTa2dMeUJUUTFKUFRFeGZWRWxOUlR0Y2JseHVJQ0FnSUNBZ0x5OGdZWFp2YVdRZ1pXeGhjSE5sWkNCMGFXMWxjeUJvYVdkb1pYSWdkR2hoYmlCdmJtVmNiaUFnSUNBZ0lHVnNZWEJ6WldRZ1BTQmxiR0Z3YzJWa0lENGdNU0EvSURFZ09pQmxiR0Z3YzJWa08xeHVYRzRnSUNBZ0lDQXZMeUJoY0hCc2VTQmxZWE5wYm1jZ2RHOGdaV3hoY0hObFpDQjBhVzFsWEc0Z0lDQWdJQ0IyWVd4MVpTQTlJR1ZoYzJVb1pXeGhjSE5sWkNrN1hHNWNiaUFnSUNBZ0lHTjFjbkpsYm5SWUlEMGdZMjl1ZEdWNGRDNXpkR0Z5ZEZnZ0t5QW9ZMjl1ZEdWNGRDNTRJQzBnWTI5dWRHVjRkQzV6ZEdGeWRGZ3BJQ29nZG1Gc2RXVTdYRzRnSUNBZ0lDQmpkWEp5Wlc1MFdTQTlJR052Ym5SbGVIUXVjM1JoY25SWklDc2dLR052Ym5SbGVIUXVlU0F0SUdOdmJuUmxlSFF1YzNSaGNuUlpLU0FxSUhaaGJIVmxPMXh1WEc0Z0lDQWdJQ0JqYjI1MFpYaDBMbTFsZEdodlpDNWpZV3hzS0dOdmJuUmxlSFF1YzJOeWIyeHNZV0pzWlN3Z1kzVnljbVZ1ZEZnc0lHTjFjbkpsYm5SWktUdGNibHh1SUNBZ0lDQWdMeThnYzJOeWIyeHNJRzF2Y21VZ2FXWWdkMlVnYUdGMlpTQnViM1FnY21WaFkyaGxaQ0J2ZFhJZ1pHVnpkR2x1WVhScGIyNWNiaUFnSUNBZ0lHbG1JQ2hqZFhKeVpXNTBXQ0FoUFQwZ1kyOXVkR1Y0ZEM1NElIeDhJR04xY25KbGJuUlpJQ0U5UFNCamIyNTBaWGgwTG5rcElIdGNiaUFnSUNBZ0lDQWdkeTV5WlhGMVpYTjBRVzVwYldGMGFXOXVSbkpoYldVb2MzUmxjQzVpYVc1a0tIY3NJR052Ym5SbGVIUXBLVHRjYmlBZ0lDQWdJSDFjYmlBZ0lDQjlYRzVjYmlBZ0lDQXZLaXBjYmlBZ0lDQWdLaUJ6WTNKdmJHeHpJSGRwYm1SdmR5QnZjaUJsYkdWdFpXNTBJSGRwZEdnZ1lTQnpiVzl2ZEdnZ1ltVm9ZWFpwYjNKY2JpQWdJQ0FnS2lCQWJXVjBhRzlrSUhOdGIyOTBhRk5qY205c2JGeHVJQ0FnSUNBcUlFQndZWEpoYlNCN1QySnFaV04wZkU1dlpHVjlJR1ZzWEc0Z0lDQWdJQ29nUUhCaGNtRnRJSHRPZFcxaVpYSjlJSGhjYmlBZ0lDQWdLaUJBY0dGeVlXMGdlMDUxYldKbGNuMGdlVnh1SUNBZ0lDQXFJRUJ5WlhSMWNtNXpJSHQxYm1SbFptbHVaV1I5WEc0Z0lDQWdJQ292WEc0Z0lDQWdablZ1WTNScGIyNGdjMjF2YjNSb1UyTnliMnhzS0dWc0xDQjRMQ0I1S1NCN1hHNGdJQ0FnSUNCMllYSWdjMk55YjJ4c1lXSnNaVHRjYmlBZ0lDQWdJSFpoY2lCemRHRnlkRmc3WEc0Z0lDQWdJQ0IyWVhJZ2MzUmhjblJaTzF4dUlDQWdJQ0FnZG1GeUlHMWxkR2h2WkR0Y2JpQWdJQ0FnSUhaaGNpQnpkR0Z5ZEZScGJXVWdQU0J1YjNjb0tUdGNibHh1SUNBZ0lDQWdMeThnWkdWbWFXNWxJSE5qY205c2JDQmpiMjUwWlhoMFhHNGdJQ0FnSUNCcFppQW9aV3dnUFQwOUlHUXVZbTlrZVNrZ2UxeHVJQ0FnSUNBZ0lDQnpZM0p2Ykd4aFlteGxJRDBnZHp0Y2JpQWdJQ0FnSUNBZ2MzUmhjblJZSUQwZ2R5NXpZM0p2Ykd4WUlIeDhJSGN1Y0dGblpWaFBabVp6WlhRN1hHNGdJQ0FnSUNBZ0lITjBZWEowV1NBOUlIY3VjMk55YjJ4c1dTQjhmQ0IzTG5CaFoyVlpUMlptYzJWME8xeHVJQ0FnSUNBZ0lDQnRaWFJvYjJRZ1BTQnZjbWxuYVc1aGJDNXpZM0p2Ykd3N1hHNGdJQ0FnSUNCOUlHVnNjMlVnZTF4dUlDQWdJQ0FnSUNCelkzSnZiR3hoWW14bElEMGdaV3c3WEc0Z0lDQWdJQ0FnSUhOMFlYSjBXQ0E5SUdWc0xuTmpjbTlzYkV4bFpuUTdYRzRnSUNBZ0lDQWdJSE4wWVhKMFdTQTlJR1ZzTG5OamNtOXNiRlJ2Y0R0Y2JpQWdJQ0FnSUNBZ2JXVjBhRzlrSUQwZ2MyTnliMnhzUld4bGJXVnVkRHRjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnTHk4Z2MyTnliMnhzSUd4dmIzQnBibWNnYjNabGNpQmhJR1p5WVcxbFhHNGdJQ0FnSUNCemRHVndLSHRjYmlBZ0lDQWdJQ0FnYzJOeWIyeHNZV0pzWlRvZ2MyTnliMnhzWVdKc1pTeGNiaUFnSUNBZ0lDQWdiV1YwYUc5a09pQnRaWFJvYjJRc1hHNGdJQ0FnSUNBZ0lITjBZWEowVkdsdFpUb2djM1JoY25SVWFXMWxMRnh1SUNBZ0lDQWdJQ0J6ZEdGeWRGZzZJSE4wWVhKMFdDeGNiaUFnSUNBZ0lDQWdjM1JoY25SWk9pQnpkR0Z5ZEZrc1hHNGdJQ0FnSUNBZ0lIZzZJSGdzWEc0Z0lDQWdJQ0FnSUhrNklIbGNiaUFnSUNBZ0lIMHBPMXh1SUNBZ0lIMWNibHh1SUNBZ0lDOHZJRTlTU1VkSlRrRk1JRTFGVkVoUFJGTWdUMVpGVWxKSlJFVlRYRzRnSUNBZ0x5OGdkeTV6WTNKdmJHd2dZVzVrSUhjdWMyTnliMnhzVkc5Y2JpQWdJQ0IzTG5OamNtOXNiQ0E5SUhjdWMyTnliMnhzVkc4Z1BTQm1kVzVqZEdsdmJpZ3BJSHRjYmlBZ0lDQWdJQzh2SUdGMmIybGtJR0ZqZEdsdmJpQjNhR1Z1SUc1dklHRnlaM1Z0Wlc1MGN5QmhjbVVnY0dGemMyVmtYRzRnSUNBZ0lDQnBaaUFvWVhKbmRXMWxiblJ6V3pCZElEMDlQU0IxYm1SbFptbHVaV1FwSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1TzF4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNBdkx5QmhkbTlwWkNCemJXOXZkR2dnWW1Wb1lYWnBiM0lnYVdZZ2JtOTBJSEpsY1hWcGNtVmtYRzRnSUNBZ0lDQnBaaUFvYzJodmRXeGtRbUZwYkU5MWRDaGhjbWQxYldWdWRITmJNRjBwSUQwOVBTQjBjblZsS1NCN1hHNGdJQ0FnSUNBZ0lHOXlhV2RwYm1Gc0xuTmpjbTlzYkM1allXeHNLRnh1SUNBZ0lDQWdJQ0FnSUhjc1hHNGdJQ0FnSUNBZ0lDQWdZWEpuZFcxbGJuUnpXekJkTG14bFpuUWdJVDA5SUhWdVpHVm1hVzVsWkZ4dUlDQWdJQ0FnSUNBZ0lDQWdQeUJoY21kMWJXVnVkSE5iTUYwdWJHVm1kRnh1SUNBZ0lDQWdJQ0FnSUNBZ09pQjBlWEJsYjJZZ1lYSm5kVzFsYm5Seld6QmRJQ0U5UFNBbmIySnFaV04wSjF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0EvSUdGeVozVnRaVzUwYzFzd1hWeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBNklIY3VjMk55YjJ4c1dDQjhmQ0IzTG5CaFoyVllUMlptYzJWMExGeHVJQ0FnSUNBZ0lDQWdJQzh2SUhWelpTQjBiM0FnY0hKdmNDd2djMlZqYjI1a0lHRnlaM1Z0Wlc1MElHbG1JSEJ5WlhObGJuUWdiM0lnWm1Gc2JHSmhZMnNnZEc4Z2MyTnliMnhzV1Z4dUlDQWdJQ0FnSUNBZ0lHRnlaM1Z0Wlc1MGMxc3dYUzUwYjNBZ0lUMDlJSFZ1WkdWbWFXNWxaRnh1SUNBZ0lDQWdJQ0FnSUNBZ1B5QmhjbWQxYldWdWRITmJNRjB1ZEc5d1hHNGdJQ0FnSUNBZ0lDQWdJQ0E2SUdGeVozVnRaVzUwYzFzeFhTQWhQVDBnZFc1a1pXWnBibVZrWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJRDhnWVhKbmRXMWxiblJ6V3pGZFhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSURvZ2R5NXpZM0p2Ykd4WklIeDhJSGN1Y0dGblpWbFBabVp6WlhSY2JpQWdJQ0FnSUNBZ0tUdGNibHh1SUNBZ0lDQWdJQ0J5WlhSMWNtNDdYRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJQzh2SUV4RlZDQlVTRVVnVTAxUFQxUklUa1ZUVXlCQ1JVZEpUaUZjYmlBZ0lDQWdJSE50YjI5MGFGTmpjbTlzYkM1allXeHNLRnh1SUNBZ0lDQWdJQ0IzTEZ4dUlDQWdJQ0FnSUNCa0xtSnZaSGtzWEc0Z0lDQWdJQ0FnSUdGeVozVnRaVzUwYzFzd1hTNXNaV1owSUNFOVBTQjFibVJsWm1sdVpXUmNiaUFnSUNBZ0lDQWdJQ0EvSUg1K1lYSm5kVzFsYm5Seld6QmRMbXhsWm5SY2JpQWdJQ0FnSUNBZ0lDQTZJSGN1YzJOeWIyeHNXQ0I4ZkNCM0xuQmhaMlZZVDJabWMyVjBMRnh1SUNBZ0lDQWdJQ0JoY21kMWJXVnVkSE5iTUYwdWRHOXdJQ0U5UFNCMWJtUmxabWx1WldSY2JpQWdJQ0FnSUNBZ0lDQS9JSDUrWVhKbmRXMWxiblJ6V3pCZExuUnZjRnh1SUNBZ0lDQWdJQ0FnSURvZ2R5NXpZM0p2Ykd4WklIeDhJSGN1Y0dGblpWbFBabVp6WlhSY2JpQWdJQ0FnSUNrN1hHNGdJQ0FnZlR0Y2JseHVJQ0FnSUM4dklIY3VjMk55YjJ4c1FubGNiaUFnSUNCM0xuTmpjbTlzYkVKNUlEMGdablZ1WTNScGIyNG9LU0I3WEc0Z0lDQWdJQ0F2THlCaGRtOXBaQ0JoWTNScGIyNGdkMmhsYmlCdWJ5QmhjbWQxYldWdWRITWdZWEpsSUhCaGMzTmxaRnh1SUNBZ0lDQWdhV1lnS0dGeVozVnRaVzUwYzFzd1hTQTlQVDBnZFc1a1pXWnBibVZrS1NCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5Ymp0Y2JpQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0x5OGdZWFp2YVdRZ2MyMXZiM1JvSUdKbGFHRjJhVzl5SUdsbUlHNXZkQ0J5WlhGMWFYSmxaRnh1SUNBZ0lDQWdhV1lnS0hOb2IzVnNaRUpoYVd4UGRYUW9ZWEpuZFcxbGJuUnpXekJkS1NrZ2UxeHVJQ0FnSUNBZ0lDQnZjbWxuYVc1aGJDNXpZM0p2Ykd4Q2VTNWpZV3hzS0Z4dUlDQWdJQ0FnSUNBZ0lIY3NYRzRnSUNBZ0lDQWdJQ0FnWVhKbmRXMWxiblJ6V3pCZExteGxablFnSVQwOUlIVnVaR1ZtYVc1bFpGeHVJQ0FnSUNBZ0lDQWdJQ0FnUHlCaGNtZDFiV1Z1ZEhOYk1GMHViR1ZtZEZ4dUlDQWdJQ0FnSUNBZ0lDQWdPaUIwZVhCbGIyWWdZWEpuZFcxbGJuUnpXekJkSUNFOVBTQW5iMkpxWldOMEp5QS9JR0Z5WjNWdFpXNTBjMXN3WFNBNklEQXNYRzRnSUNBZ0lDQWdJQ0FnWVhKbmRXMWxiblJ6V3pCZExuUnZjQ0FoUFQwZ2RXNWtaV1pwYm1Wa1hHNGdJQ0FnSUNBZ0lDQWdJQ0EvSUdGeVozVnRaVzUwYzFzd1hTNTBiM0JjYmlBZ0lDQWdJQ0FnSUNBZ0lEb2dZWEpuZFcxbGJuUnpXekZkSUNFOVBTQjFibVJsWm1sdVpXUWdQeUJoY21kMWJXVnVkSE5iTVYwZ09pQXdYRzRnSUNBZ0lDQWdJQ2s3WEc1Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1TzF4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNBdkx5Qk1SVlFnVkVoRklGTk5UMDlVU0U1RlUxTWdRa1ZIU1U0aFhHNGdJQ0FnSUNCemJXOXZkR2hUWTNKdmJHd3VZMkZzYkNoY2JpQWdJQ0FnSUNBZ2R5eGNiaUFnSUNBZ0lDQWdaQzVpYjJSNUxGeHVJQ0FnSUNBZ0lDQitmbUZ5WjNWdFpXNTBjMXN3WFM1c1pXWjBJQ3NnS0hjdWMyTnliMnhzV0NCOGZDQjNMbkJoWjJWWVQyWm1jMlYwS1N4Y2JpQWdJQ0FnSUNBZ2ZuNWhjbWQxYldWdWRITmJNRjB1ZEc5d0lDc2dLSGN1YzJOeWIyeHNXU0I4ZkNCM0xuQmhaMlZaVDJabWMyVjBLVnh1SUNBZ0lDQWdLVHRjYmlBZ0lDQjlPMXh1WEc0Z0lDQWdMeThnUld4bGJXVnVkQzV3Y205MGIzUjVjR1V1YzJOeWIyeHNJR0Z1WkNCRmJHVnRaVzUwTG5CeWIzUnZkSGx3WlM1elkzSnZiR3hVYjF4dUlDQWdJRVZzWlcxbGJuUXVjSEp2ZEc5MGVYQmxMbk5qY205c2JDQTlJRVZzWlcxbGJuUXVjSEp2ZEc5MGVYQmxMbk5qY205c2JGUnZJRDBnWm5WdVkzUnBiMjRvS1NCN1hHNGdJQ0FnSUNBdkx5QmhkbTlwWkNCaFkzUnBiMjRnZDJobGJpQnVieUJoY21kMWJXVnVkSE1nWVhKbElIQmhjM05sWkZ4dUlDQWdJQ0FnYVdZZ0tHRnlaM1Z0Wlc1MGMxc3dYU0E5UFQwZ2RXNWtaV1pwYm1Wa0tTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJqdGNiaUFnSUNBZ0lIMWNibHh1SUNBZ0lDQWdMeThnWVhadmFXUWdjMjF2YjNSb0lHSmxhR0YyYVc5eUlHbG1JRzV2ZENCeVpYRjFhWEpsWkZ4dUlDQWdJQ0FnYVdZZ0tITm9iM1ZzWkVKaGFXeFBkWFFvWVhKbmRXMWxiblJ6V3pCZEtTQTlQVDBnZEhKMVpTa2dlMXh1SUNBZ0lDQWdJQ0F2THlCcFppQnZibVVnYm5WdFltVnlJR2x6SUhCaGMzTmxaQ3dnZEdoeWIzY2daWEp5YjNJZ2RHOGdiV0YwWTJnZ1JtbHlaV1p2ZUNCcGJYQnNaVzFsYm5SaGRHbHZibHh1SUNBZ0lDQWdJQ0JwWmlBb2RIbHdaVzltSUdGeVozVnRaVzUwYzFzd1hTQTlQVDBnSjI1MWJXSmxjaWNnSmlZZ1lYSm5kVzFsYm5Seld6RmRJRDA5UFNCMWJtUmxabWx1WldRcElIdGNiaUFnSUNBZ0lDQWdJQ0IwYUhKdmR5QnVaWGNnVTNsdWRHRjRSWEp5YjNJb0oxWmhiSFZsSUdOdmRXeGtJRzV2ZENCaVpTQmpiMjUyWlhKMFpXUW5LVHRjYmlBZ0lDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNBZ0lHOXlhV2RwYm1Gc0xtVnNaVzFsYm5SVFkzSnZiR3d1WTJGc2JDaGNiaUFnSUNBZ0lDQWdJQ0IwYUdsekxGeHVJQ0FnSUNBZ0lDQWdJQzh2SUhWelpTQnNaV1owSUhCeWIzQXNJR1pwY25OMElHNTFiV0psY2lCaGNtZDFiV1Z1ZENCdmNpQm1ZV3hzWW1GamF5QjBieUJ6WTNKdmJHeE1aV1owWEc0Z0lDQWdJQ0FnSUNBZ1lYSm5kVzFsYm5Seld6QmRMbXhsWm5RZ0lUMDlJSFZ1WkdWbWFXNWxaRnh1SUNBZ0lDQWdJQ0FnSUNBZ1B5QitmbUZ5WjNWdFpXNTBjMXN3WFM1c1pXWjBYRzRnSUNBZ0lDQWdJQ0FnSUNBNklIUjVjR1Z2WmlCaGNtZDFiV1Z1ZEhOYk1GMGdJVDA5SUNkdlltcGxZM1FuSUQ4Z2ZuNWhjbWQxYldWdWRITmJNRjBnT2lCMGFHbHpMbk5qY205c2JFeGxablFzWEc0Z0lDQWdJQ0FnSUNBZ0x5OGdkWE5sSUhSdmNDQndjbTl3TENCelpXTnZibVFnWVhKbmRXMWxiblFnYjNJZ1ptRnNiR0poWTJzZ2RHOGdjMk55YjJ4c1ZHOXdYRzRnSUNBZ0lDQWdJQ0FnWVhKbmRXMWxiblJ6V3pCZExuUnZjQ0FoUFQwZ2RXNWtaV1pwYm1Wa1hHNGdJQ0FnSUNBZ0lDQWdJQ0EvSUg1K1lYSm5kVzFsYm5Seld6QmRMblJ2Y0Z4dUlDQWdJQ0FnSUNBZ0lDQWdPaUJoY21kMWJXVnVkSE5iTVYwZ0lUMDlJSFZ1WkdWbWFXNWxaQ0EvSUg1K1lYSm5kVzFsYm5Seld6RmRJRG9nZEdocGN5NXpZM0p2Ykd4VWIzQmNiaUFnSUNBZ0lDQWdLVHRjYmx4dUlDQWdJQ0FnSUNCeVpYUjFjbTQ3WEc0Z0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUhaaGNpQnNaV1owSUQwZ1lYSm5kVzFsYm5Seld6QmRMbXhsWm5RN1hHNGdJQ0FnSUNCMllYSWdkRzl3SUQwZ1lYSm5kVzFsYm5Seld6QmRMblJ2Y0R0Y2JseHVJQ0FnSUNBZ0x5OGdURVZVSUZSSVJTQlRUVTlQVkVoT1JWTlRJRUpGUjBsT0lWeHVJQ0FnSUNBZ2MyMXZiM1JvVTJOeWIyeHNMbU5oYkd3b1hHNGdJQ0FnSUNBZ0lIUm9hWE1zWEc0Z0lDQWdJQ0FnSUhSb2FYTXNYRzRnSUNBZ0lDQWdJSFI1Y0dWdlppQnNaV1owSUQwOVBTQW5kVzVrWldacGJtVmtKeUEvSUhSb2FYTXVjMk55YjJ4c1RHVm1kQ0E2SUg1K2JHVm1kQ3hjYmlBZ0lDQWdJQ0FnZEhsd1pXOW1JSFJ2Y0NBOVBUMGdKM1Z1WkdWbWFXNWxaQ2NnUHlCMGFHbHpMbk5qY205c2JGUnZjQ0E2SUg1K2RHOXdYRzRnSUNBZ0lDQXBPMXh1SUNBZ0lIMDdYRzVjYmlBZ0lDQXZMeUJGYkdWdFpXNTBMbkJ5YjNSdmRIbHdaUzV6WTNKdmJHeENlVnh1SUNBZ0lFVnNaVzFsYm5RdWNISnZkRzkwZVhCbExuTmpjbTlzYkVKNUlEMGdablZ1WTNScGIyNG9LU0I3WEc0Z0lDQWdJQ0F2THlCaGRtOXBaQ0JoWTNScGIyNGdkMmhsYmlCdWJ5QmhjbWQxYldWdWRITWdZWEpsSUhCaGMzTmxaRnh1SUNBZ0lDQWdhV1lnS0dGeVozVnRaVzUwYzFzd1hTQTlQVDBnZFc1a1pXWnBibVZrS1NCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5Ymp0Y2JpQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0x5OGdZWFp2YVdRZ2MyMXZiM1JvSUdKbGFHRjJhVzl5SUdsbUlHNXZkQ0J5WlhGMWFYSmxaRnh1SUNBZ0lDQWdhV1lnS0hOb2IzVnNaRUpoYVd4UGRYUW9ZWEpuZFcxbGJuUnpXekJkS1NBOVBUMGdkSEoxWlNrZ2UxeHVJQ0FnSUNBZ0lDQnZjbWxuYVc1aGJDNWxiR1Z0Wlc1MFUyTnliMnhzTG1OaGJHd29YRzRnSUNBZ0lDQWdJQ0FnZEdocGN5eGNiaUFnSUNBZ0lDQWdJQ0JoY21kMWJXVnVkSE5iTUYwdWJHVm1kQ0FoUFQwZ2RXNWtaV1pwYm1Wa1hHNGdJQ0FnSUNBZ0lDQWdJQ0EvSUg1K1lYSm5kVzFsYm5Seld6QmRMbXhsWm5RZ0t5QjBhR2x6TG5OamNtOXNiRXhsWm5SY2JpQWdJQ0FnSUNBZ0lDQWdJRG9nZm41aGNtZDFiV1Z1ZEhOYk1GMGdLeUIwYUdsekxuTmpjbTlzYkV4bFpuUXNYRzRnSUNBZ0lDQWdJQ0FnWVhKbmRXMWxiblJ6V3pCZExuUnZjQ0FoUFQwZ2RXNWtaV1pwYm1Wa1hHNGdJQ0FnSUNBZ0lDQWdJQ0EvSUg1K1lYSm5kVzFsYm5Seld6QmRMblJ2Y0NBcklIUm9hWE11YzJOeWIyeHNWRzl3WEc0Z0lDQWdJQ0FnSUNBZ0lDQTZJSDUrWVhKbmRXMWxiblJ6V3pGZElDc2dkR2hwY3k1elkzSnZiR3hVYjNCY2JpQWdJQ0FnSUNBZ0tUdGNibHh1SUNBZ0lDQWdJQ0J5WlhSMWNtNDdYRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJSFJvYVhNdWMyTnliMnhzS0h0Y2JpQWdJQ0FnSUNBZ2JHVm1kRG9nZm41aGNtZDFiV1Z1ZEhOYk1GMHViR1ZtZENBcklIUm9hWE11YzJOeWIyeHNUR1ZtZEN4Y2JpQWdJQ0FnSUNBZ2RHOXdPaUIrZm1GeVozVnRaVzUwYzFzd1hTNTBiM0FnS3lCMGFHbHpMbk5qY205c2JGUnZjQ3hjYmlBZ0lDQWdJQ0FnWW1Wb1lYWnBiM0k2SUdGeVozVnRaVzUwYzFzd1hTNWlaV2hoZG1sdmNseHVJQ0FnSUNBZ2ZTazdYRzRnSUNBZ2ZUdGNibHh1SUNBZ0lDOHZJRVZzWlcxbGJuUXVjSEp2ZEc5MGVYQmxMbk5qY205c2JFbHVkRzlXYVdWM1hHNGdJQ0FnUld4bGJXVnVkQzV3Y205MGIzUjVjR1V1YzJOeWIyeHNTVzUwYjFacFpYY2dQU0JtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0FnSUM4dklHRjJiMmxrSUhOdGIyOTBhQ0JpWldoaGRtbHZjaUJwWmlCdWIzUWdjbVZ4ZFdseVpXUmNiaUFnSUNBZ0lHbG1JQ2h6YUc5MWJHUkNZV2xzVDNWMEtHRnlaM1Z0Wlc1MGMxc3dYU2tnUFQwOUlIUnlkV1VwSUh0Y2JpQWdJQ0FnSUNBZ2IzSnBaMmx1WVd3dWMyTnliMnhzU1c1MGIxWnBaWGN1WTJGc2JDaGNiaUFnSUNBZ0lDQWdJQ0IwYUdsekxGeHVJQ0FnSUNBZ0lDQWdJR0Z5WjNWdFpXNTBjMXN3WFNBOVBUMGdkVzVrWldacGJtVmtJRDhnZEhKMVpTQTZJR0Z5WjNWdFpXNTBjMXN3WFZ4dUlDQWdJQ0FnSUNBcE8xeHVYRzRnSUNBZ0lDQWdJSEpsZEhWeWJqdGNiaUFnSUNBZ0lIMWNibHh1SUNBZ0lDQWdMeThnVEVWVUlGUklSU0JUVFU5UFZFaE9SVk5USUVKRlIwbE9JVnh1SUNBZ0lDQWdkbUZ5SUhOamNtOXNiR0ZpYkdWUVlYSmxiblFnUFNCbWFXNWtVMk55YjJ4c1lXSnNaVkJoY21WdWRDaDBhR2x6S1R0Y2JpQWdJQ0FnSUhaaGNpQndZWEpsYm5SU1pXTjBjeUE5SUhOamNtOXNiR0ZpYkdWUVlYSmxiblF1WjJWMFFtOTFibVJwYm1kRGJHbGxiblJTWldOMEtDazdYRzRnSUNBZ0lDQjJZWElnWTJ4cFpXNTBVbVZqZEhNZ1BTQjBhR2x6TG1kbGRFSnZkVzVrYVc1blEyeHBaVzUwVW1WamRDZ3BPMXh1WEc0Z0lDQWdJQ0JwWmlBb2MyTnliMnhzWVdKc1pWQmhjbVZ1ZENBaFBUMGdaQzVpYjJSNUtTQjdYRzRnSUNBZ0lDQWdJQzh2SUhKbGRtVmhiQ0JsYkdWdFpXNTBJR2x1YzJsa1pTQndZWEpsYm5SY2JpQWdJQ0FnSUNBZ2MyMXZiM1JvVTJOeWIyeHNMbU5oYkd3b1hHNGdJQ0FnSUNBZ0lDQWdkR2hwY3l4Y2JpQWdJQ0FnSUNBZ0lDQnpZM0p2Ykd4aFlteGxVR0Z5Wlc1MExGeHVJQ0FnSUNBZ0lDQWdJSE5qY205c2JHRmliR1ZRWVhKbGJuUXVjMk55YjJ4c1RHVm1kQ0FySUdOc2FXVnVkRkpsWTNSekxteGxablFnTFNCd1lYSmxiblJTWldOMGN5NXNaV1owTEZ4dUlDQWdJQ0FnSUNBZ0lITmpjbTlzYkdGaWJHVlFZWEpsYm5RdWMyTnliMnhzVkc5d0lDc2dZMnhwWlc1MFVtVmpkSE11ZEc5d0lDMGdjR0Z5Wlc1MFVtVmpkSE11ZEc5d1hHNGdJQ0FnSUNBZ0lDazdYRzVjYmlBZ0lDQWdJQ0FnTHk4Z2NtVjJaV0ZzSUhCaGNtVnVkQ0JwYmlCMmFXVjNjRzl5ZENCMWJteGxjM01nYVhNZ1ptbDRaV1JjYmlBZ0lDQWdJQ0FnYVdZZ0tIY3VaMlYwUTI5dGNIVjBaV1JUZEhsc1pTaHpZM0p2Ykd4aFlteGxVR0Z5Wlc1MEtTNXdiM05wZEdsdmJpQWhQVDBnSjJacGVHVmtKeWtnZTF4dUlDQWdJQ0FnSUNBZ0lIY3VjMk55YjJ4c1Fua29lMXh1SUNBZ0lDQWdJQ0FnSUNBZ2JHVm1kRG9nY0dGeVpXNTBVbVZqZEhNdWJHVm1kQ3hjYmlBZ0lDQWdJQ0FnSUNBZ0lIUnZjRG9nY0dGeVpXNTBVbVZqZEhNdWRHOXdMRnh1SUNBZ0lDQWdJQ0FnSUNBZ1ltVm9ZWFpwYjNJNklDZHpiVzl2ZEdnblhHNGdJQ0FnSUNBZ0lDQWdmU2s3WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUM4dklISmxkbVZoYkNCbGJHVnRaVzUwSUdsdUlIWnBaWGR3YjNKMFhHNGdJQ0FnSUNBZ0lIY3VjMk55YjJ4c1Fua29lMXh1SUNBZ0lDQWdJQ0FnSUd4bFpuUTZJR05zYVdWdWRGSmxZM1J6TG14bFpuUXNYRzRnSUNBZ0lDQWdJQ0FnZEc5d09pQmpiR2xsYm5SU1pXTjBjeTUwYjNBc1hHNGdJQ0FnSUNBZ0lDQWdZbVZvWVhacGIzSTZJQ2R6Ylc5dmRHZ25YRzRnSUNBZ0lDQWdJSDBwTzF4dUlDQWdJQ0FnZlZ4dUlDQWdJSDA3WEc0Z0lIMWNibHh1SUNCcFppQW9kSGx3Wlc5bUlHVjRjRzl5ZEhNZ1BUMDlJQ2R2WW1wbFkzUW5JQ1ltSUhSNWNHVnZaaUJ0YjJSMWJHVWdJVDA5SUNkMWJtUmxabWx1WldRbktTQjdYRzRnSUNBZ0x5OGdZMjl0Ylc5dWFuTmNiaUFnSUNCdGIyUjFiR1V1Wlhod2IzSjBjeUE5SUhzZ2NHOXNlV1pwYkd3NklIQnZiSGxtYVd4c0lIMDdYRzRnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdMeThnWjJ4dlltRnNYRzRnSUNBZ2NHOXNlV1pwYkd3b0tUdGNiaUFnZlZ4dVhHNTlLQ2twTzF4dUlpd2lLR1oxYm1OMGFXOXVLSE5sYkdZcElIdGNiaUFnSjNWelpTQnpkSEpwWTNRbk8xeHVYRzRnSUdsbUlDaHpaV3htTG1abGRHTm9LU0I3WEc0Z0lDQWdjbVYwZFhKdVhHNGdJSDFjYmx4dUlDQjJZWElnYzNWd2NHOXlkQ0E5SUh0Y2JpQWdJQ0J6WldGeVkyaFFZWEpoYlhNNklDZFZVa3hUWldGeVkyaFFZWEpoYlhNbklHbHVJSE5sYkdZc1hHNGdJQ0FnYVhSbGNtRmliR1U2SUNkVGVXMWliMnduSUdsdUlITmxiR1lnSmlZZ0oybDBaWEpoZEc5eUp5QnBiaUJUZVcxaWIyd3NYRzRnSUNBZ1lteHZZam9nSjBacGJHVlNaV0ZrWlhJbklHbHVJSE5sYkdZZ0ppWWdKMEpzYjJJbklHbHVJSE5sYkdZZ0ppWWdLR1oxYm1OMGFXOXVLQ2tnZTF4dUlDQWdJQ0FnZEhKNUlIdGNiaUFnSUNBZ0lDQWdibVYzSUVKc2IySW9LVnh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdkSEoxWlZ4dUlDQWdJQ0FnZlNCallYUmphQ2hsS1NCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCbVlXeHpaVnh1SUNBZ0lDQWdmVnh1SUNBZ0lIMHBLQ2tzWEc0Z0lDQWdabTl5YlVSaGRHRTZJQ2RHYjNKdFJHRjBZU2NnYVc0Z2MyVnNaaXhjYmlBZ0lDQmhjbkpoZVVKMVptWmxjam9nSjBGeWNtRjVRblZtWm1WeUp5QnBiaUJ6Wld4bVhHNGdJSDFjYmx4dUlDQnBaaUFvYzNWd2NHOXlkQzVoY25KaGVVSjFabVpsY2lrZ2UxeHVJQ0FnSUhaaGNpQjJhV1YzUTJ4aGMzTmxjeUE5SUZ0Y2JpQWdJQ0FnSUNkYmIySnFaV04wSUVsdWREaEJjbkpoZVYwbkxGeHVJQ0FnSUNBZ0oxdHZZbXBsWTNRZ1ZXbHVkRGhCY25KaGVWMG5MRnh1SUNBZ0lDQWdKMXR2WW1wbFkzUWdWV2x1ZERoRGJHRnRjR1ZrUVhKeVlYbGRKeXhjYmlBZ0lDQWdJQ2RiYjJKcVpXTjBJRWx1ZERFMlFYSnlZWGxkSnl4Y2JpQWdJQ0FnSUNkYmIySnFaV04wSUZWcGJuUXhOa0Z5Y21GNVhTY3NYRzRnSUNBZ0lDQW5XMjlpYW1WamRDQkpiblF6TWtGeWNtRjVYU2NzWEc0Z0lDQWdJQ0FuVzI5aWFtVmpkQ0JWYVc1ME16SkJjbkpoZVYwbkxGeHVJQ0FnSUNBZ0oxdHZZbXBsWTNRZ1JteHZZWFF6TWtGeWNtRjVYU2NzWEc0Z0lDQWdJQ0FuVzI5aWFtVmpkQ0JHYkc5aGREWTBRWEp5WVhsZEoxeHVJQ0FnSUYxY2JseHVJQ0FnSUhaaGNpQnBjMFJoZEdGV2FXVjNJRDBnWm5WdVkzUnBiMjRvYjJKcUtTQjdYRzRnSUNBZ0lDQnlaWFIxY200Z2IySnFJQ1ltSUVSaGRHRldhV1YzTG5CeWIzUnZkSGx3WlM1cGMxQnliM1J2ZEhsd1pVOW1LRzlpYWlsY2JpQWdJQ0I5WEc1Y2JpQWdJQ0IyWVhJZ2FYTkJjbkpoZVVKMVptWmxjbFpwWlhjZ1BTQkJjbkpoZVVKMVptWmxjaTVwYzFacFpYY2dmSHdnWm5WdVkzUnBiMjRvYjJKcUtTQjdYRzRnSUNBZ0lDQnlaWFIxY200Z2IySnFJQ1ltSUhacFpYZERiR0Z6YzJWekxtbHVaR1Y0VDJZb1QySnFaV04wTG5CeWIzUnZkSGx3WlM1MGIxTjBjbWx1Wnk1allXeHNLRzlpYWlrcElENGdMVEZjYmlBZ0lDQjlYRzRnSUgxY2JseHVJQ0JtZFc1amRHbHZiaUJ1YjNKdFlXeHBlbVZPWVcxbEtHNWhiV1VwSUh0Y2JpQWdJQ0JwWmlBb2RIbHdaVzltSUc1aGJXVWdJVDA5SUNkemRISnBibWNuS1NCN1hHNGdJQ0FnSUNCdVlXMWxJRDBnVTNSeWFXNW5LRzVoYldVcFhHNGdJQ0FnZlZ4dUlDQWdJR2xtSUNndlcxNWhMWG93TFRsY1hDMGpKQ1VtSnlvckxseGNYbDlnZkg1ZEwya3VkR1Z6ZENodVlXMWxLU2tnZTF4dUlDQWdJQ0FnZEdoeWIzY2dibVYzSUZSNWNHVkZjbkp2Y2lnblNXNTJZV3hwWkNCamFHRnlZV04wWlhJZ2FXNGdhR1ZoWkdWeUlHWnBaV3hrSUc1aGJXVW5LVnh1SUNBZ0lIMWNiaUFnSUNCeVpYUjFjbTRnYm1GdFpTNTBiMHh2ZDJWeVEyRnpaU2dwWEc0Z0lIMWNibHh1SUNCbWRXNWpkR2x2YmlCdWIzSnRZV3hwZW1WV1lXeDFaU2gyWVd4MVpTa2dlMXh1SUNBZ0lHbG1JQ2gwZVhCbGIyWWdkbUZzZFdVZ0lUMDlJQ2R6ZEhKcGJtY25LU0I3WEc0Z0lDQWdJQ0IyWVd4MVpTQTlJRk4wY21sdVp5aDJZV3gxWlNsY2JpQWdJQ0I5WEc0Z0lDQWdjbVYwZFhKdUlIWmhiSFZsWEc0Z0lIMWNibHh1SUNBdkx5QkNkV2xzWkNCaElHUmxjM1J5ZFdOMGFYWmxJR2wwWlhKaGRHOXlJR1p2Y2lCMGFHVWdkbUZzZFdVZ2JHbHpkRnh1SUNCbWRXNWpkR2x2YmlCcGRHVnlZWFJ2Y2tadmNpaHBkR1Z0Y3lrZ2UxeHVJQ0FnSUhaaGNpQnBkR1Z5WVhSdmNpQTlJSHRjYmlBZ0lDQWdJRzVsZUhRNklHWjFibU4wYVc5dUtDa2dlMXh1SUNBZ0lDQWdJQ0IyWVhJZ2RtRnNkV1VnUFNCcGRHVnRjeTV6YUdsbWRDZ3BYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQjdaRzl1WlRvZ2RtRnNkV1VnUFQwOUlIVnVaR1ZtYVc1bFpDd2dkbUZzZFdVNklIWmhiSFZsZlZ4dUlDQWdJQ0FnZlZ4dUlDQWdJSDFjYmx4dUlDQWdJR2xtSUNoemRYQndiM0owTG1sMFpYSmhZbXhsS1NCN1hHNGdJQ0FnSUNCcGRHVnlZWFJ2Y2x0VGVXMWliMnd1YVhSbGNtRjBiM0pkSUQwZ1puVnVZM1JwYjI0b0tTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQnBkR1Z5WVhSdmNseHVJQ0FnSUNBZ2ZWeHVJQ0FnSUgxY2JseHVJQ0FnSUhKbGRIVnliaUJwZEdWeVlYUnZjbHh1SUNCOVhHNWNiaUFnWm5WdVkzUnBiMjRnU0dWaFpHVnljeWhvWldGa1pYSnpLU0I3WEc0Z0lDQWdkR2hwY3k1dFlYQWdQU0I3ZlZ4dVhHNGdJQ0FnYVdZZ0tHaGxZV1JsY25NZ2FXNXpkR0Z1WTJWdlppQklaV0ZrWlhKektTQjdYRzRnSUNBZ0lDQm9aV0ZrWlhKekxtWnZja1ZoWTJnb1puVnVZM1JwYjI0b2RtRnNkV1VzSUc1aGJXVXBJSHRjYmlBZ0lDQWdJQ0FnZEdocGN5NWhjSEJsYm1Rb2JtRnRaU3dnZG1Gc2RXVXBYRzRnSUNBZ0lDQjlMQ0IwYUdsektWeHVJQ0FnSUgwZ1pXeHpaU0JwWmlBb1FYSnlZWGt1YVhOQmNuSmhlU2hvWldGa1pYSnpLU2tnZTF4dUlDQWdJQ0FnYUdWaFpHVnljeTVtYjNKRllXTm9LR1oxYm1OMGFXOXVLR2hsWVdSbGNpa2dlMXh1SUNBZ0lDQWdJQ0IwYUdsekxtRndjR1Z1WkNob1pXRmtaWEpiTUYwc0lHaGxZV1JsY2xzeFhTbGNiaUFnSUNBZ0lIMHNJSFJvYVhNcFhHNGdJQ0FnZlNCbGJITmxJR2xtSUNob1pXRmtaWEp6S1NCN1hHNGdJQ0FnSUNCUFltcGxZM1F1WjJWMFQzZHVVSEp2Y0dWeWRIbE9ZVzFsY3lob1pXRmtaWEp6S1M1bWIzSkZZV05vS0daMWJtTjBhVzl1S0c1aGJXVXBJSHRjYmlBZ0lDQWdJQ0FnZEdocGN5NWhjSEJsYm1Rb2JtRnRaU3dnYUdWaFpHVnljMXR1WVcxbFhTbGNiaUFnSUNBZ0lIMHNJSFJvYVhNcFhHNGdJQ0FnZlZ4dUlDQjlYRzVjYmlBZ1NHVmhaR1Z5Y3k1d2NtOTBiM1I1Y0dVdVlYQndaVzVrSUQwZ1puVnVZM1JwYjI0b2JtRnRaU3dnZG1Gc2RXVXBJSHRjYmlBZ0lDQnVZVzFsSUQwZ2JtOXliV0ZzYVhwbFRtRnRaU2h1WVcxbEtWeHVJQ0FnSUhaaGJIVmxJRDBnYm05eWJXRnNhWHBsVm1Gc2RXVW9kbUZzZFdVcFhHNGdJQ0FnZG1GeUlHOXNaRlpoYkhWbElEMGdkR2hwY3k1dFlYQmJibUZ0WlYxY2JpQWdJQ0IwYUdsekxtMWhjRnR1WVcxbFhTQTlJRzlzWkZaaGJIVmxJRDhnYjJ4a1ZtRnNkV1VySnl3bkszWmhiSFZsSURvZ2RtRnNkV1ZjYmlBZ2ZWeHVYRzRnSUVobFlXUmxjbk11Y0hKdmRHOTBlWEJsV3lka1pXeGxkR1VuWFNBOUlHWjFibU4wYVc5dUtHNWhiV1VwSUh0Y2JpQWdJQ0JrWld4bGRHVWdkR2hwY3k1dFlYQmJibTl5YldGc2FYcGxUbUZ0WlNodVlXMWxLVjFjYmlBZ2ZWeHVYRzRnSUVobFlXUmxjbk11Y0hKdmRHOTBlWEJsTG1kbGRDQTlJR1oxYm1OMGFXOXVLRzVoYldVcElIdGNiaUFnSUNCdVlXMWxJRDBnYm05eWJXRnNhWHBsVG1GdFpTaHVZVzFsS1Z4dUlDQWdJSEpsZEhWeWJpQjBhR2x6TG1oaGN5aHVZVzFsS1NBL0lIUm9hWE11YldGd1cyNWhiV1ZkSURvZ2JuVnNiRnh1SUNCOVhHNWNiaUFnU0dWaFpHVnljeTV3Y205MGIzUjVjR1V1YUdGeklEMGdablZ1WTNScGIyNG9ibUZ0WlNrZ2UxeHVJQ0FnSUhKbGRIVnliaUIwYUdsekxtMWhjQzVvWVhOUGQyNVFjbTl3WlhKMGVTaHViM0p0WVd4cGVtVk9ZVzFsS0c1aGJXVXBLVnh1SUNCOVhHNWNiaUFnU0dWaFpHVnljeTV3Y205MGIzUjVjR1V1YzJWMElEMGdablZ1WTNScGIyNG9ibUZ0WlN3Z2RtRnNkV1VwSUh0Y2JpQWdJQ0IwYUdsekxtMWhjRnR1YjNKdFlXeHBlbVZPWVcxbEtHNWhiV1VwWFNBOUlHNXZjbTFoYkdsNlpWWmhiSFZsS0haaGJIVmxLVnh1SUNCOVhHNWNiaUFnU0dWaFpHVnljeTV3Y205MGIzUjVjR1V1Wm05eVJXRmphQ0E5SUdaMWJtTjBhVzl1S0dOaGJHeGlZV05yTENCMGFHbHpRWEpuS1NCN1hHNGdJQ0FnWm05eUlDaDJZWElnYm1GdFpTQnBiaUIwYUdsekxtMWhjQ2tnZTF4dUlDQWdJQ0FnYVdZZ0tIUm9hWE11YldGd0xtaGhjMDkzYmxCeWIzQmxjblI1S0c1aGJXVXBLU0I3WEc0Z0lDQWdJQ0FnSUdOaGJHeGlZV05yTG1OaGJHd29kR2hwYzBGeVp5d2dkR2hwY3k1dFlYQmJibUZ0WlYwc0lHNWhiV1VzSUhSb2FYTXBYRzRnSUNBZ0lDQjlYRzRnSUNBZ2ZWeHVJQ0I5WEc1Y2JpQWdTR1ZoWkdWeWN5NXdjbTkwYjNSNWNHVXVhMlY1Y3lBOUlHWjFibU4wYVc5dUtDa2dlMXh1SUNBZ0lIWmhjaUJwZEdWdGN5QTlJRnRkWEc0Z0lDQWdkR2hwY3k1bWIzSkZZV05vS0daMWJtTjBhVzl1S0haaGJIVmxMQ0J1WVcxbEtTQjdJR2wwWlcxekxuQjFjMmdvYm1GdFpTa2dmU2xjYmlBZ0lDQnlaWFIxY200Z2FYUmxjbUYwYjNKR2IzSW9hWFJsYlhNcFhHNGdJSDFjYmx4dUlDQklaV0ZrWlhKekxuQnliM1J2ZEhsd1pTNTJZV3gxWlhNZ1BTQm1kVzVqZEdsdmJpZ3BJSHRjYmlBZ0lDQjJZWElnYVhSbGJYTWdQU0JiWFZ4dUlDQWdJSFJvYVhNdVptOXlSV0ZqYUNobWRXNWpkR2x2YmloMllXeDFaU2tnZXlCcGRHVnRjeTV3ZFhOb0tIWmhiSFZsS1NCOUtWeHVJQ0FnSUhKbGRIVnliaUJwZEdWeVlYUnZja1p2Y2locGRHVnRjeWxjYmlBZ2ZWeHVYRzRnSUVobFlXUmxjbk11Y0hKdmRHOTBlWEJsTG1WdWRISnBaWE1nUFNCbWRXNWpkR2x2YmlncElIdGNiaUFnSUNCMllYSWdhWFJsYlhNZ1BTQmJYVnh1SUNBZ0lIUm9hWE11Wm05eVJXRmphQ2htZFc1amRHbHZiaWgyWVd4MVpTd2dibUZ0WlNrZ2V5QnBkR1Z0Y3k1d2RYTm9LRnR1WVcxbExDQjJZV3gxWlYwcElIMHBYRzRnSUNBZ2NtVjBkWEp1SUdsMFpYSmhkRzl5Um05eUtHbDBaVzF6S1Z4dUlDQjlYRzVjYmlBZ2FXWWdLSE4xY0hCdmNuUXVhWFJsY21GaWJHVXBJSHRjYmlBZ0lDQklaV0ZrWlhKekxuQnliM1J2ZEhsd1pWdFRlVzFpYjJ3dWFYUmxjbUYwYjNKZElEMGdTR1ZoWkdWeWN5NXdjbTkwYjNSNWNHVXVaVzUwY21sbGMxeHVJQ0I5WEc1Y2JpQWdablZ1WTNScGIyNGdZMjl1YzNWdFpXUW9ZbTlrZVNrZ2UxeHVJQ0FnSUdsbUlDaGliMlI1TG1KdlpIbFZjMlZrS1NCN1hHNGdJQ0FnSUNCeVpYUjFjbTRnVUhKdmJXbHpaUzV5WldwbFkzUW9ibVYzSUZSNWNHVkZjbkp2Y2lnblFXeHlaV0ZrZVNCeVpXRmtKeWtwWEc0Z0lDQWdmVnh1SUNBZ0lHSnZaSGt1WW05a2VWVnpaV1FnUFNCMGNuVmxYRzRnSUgxY2JseHVJQ0JtZFc1amRHbHZiaUJtYVd4bFVtVmhaR1Z5VW1WaFpIa29jbVZoWkdWeUtTQjdYRzRnSUNBZ2NtVjBkWEp1SUc1bGR5QlFjbTl0YVhObEtHWjFibU4wYVc5dUtISmxjMjlzZG1Vc0lISmxhbVZqZENrZ2UxeHVJQ0FnSUNBZ2NtVmhaR1Z5TG05dWJHOWhaQ0E5SUdaMWJtTjBhVzl1S0NrZ2UxeHVJQ0FnSUNBZ0lDQnlaWE52YkhabEtISmxZV1JsY2k1eVpYTjFiSFFwWEc0Z0lDQWdJQ0I5WEc0Z0lDQWdJQ0J5WldGa1pYSXViMjVsY25KdmNpQTlJR1oxYm1OMGFXOXVLQ2tnZTF4dUlDQWdJQ0FnSUNCeVpXcGxZM1FvY21WaFpHVnlMbVZ5Y205eUtWeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUgwcFhHNGdJSDFjYmx4dUlDQm1kVzVqZEdsdmJpQnlaV0ZrUW14dllrRnpRWEp5WVhsQ2RXWm1aWElvWW14dllpa2dlMXh1SUNBZ0lIWmhjaUJ5WldGa1pYSWdQU0J1WlhjZ1JtbHNaVkpsWVdSbGNpZ3BYRzRnSUNBZ2RtRnlJSEJ5YjIxcGMyVWdQU0JtYVd4bFVtVmhaR1Z5VW1WaFpIa29jbVZoWkdWeUtWeHVJQ0FnSUhKbFlXUmxjaTV5WldGa1FYTkJjbkpoZVVKMVptWmxjaWhpYkc5aUtWeHVJQ0FnSUhKbGRIVnliaUJ3Y205dGFYTmxYRzRnSUgxY2JseHVJQ0JtZFc1amRHbHZiaUJ5WldGa1FteHZZa0Z6VkdWNGRDaGliRzlpS1NCN1hHNGdJQ0FnZG1GeUlISmxZV1JsY2lBOUlHNWxkeUJHYVd4bFVtVmhaR1Z5S0NsY2JpQWdJQ0IyWVhJZ2NISnZiV2x6WlNBOUlHWnBiR1ZTWldGa1pYSlNaV0ZrZVNoeVpXRmtaWElwWEc0Z0lDQWdjbVZoWkdWeUxuSmxZV1JCYzFSbGVIUW9ZbXh2WWlsY2JpQWdJQ0J5WlhSMWNtNGdjSEp2YldselpWeHVJQ0I5WEc1Y2JpQWdablZ1WTNScGIyNGdjbVZoWkVGeWNtRjVRblZtWm1WeVFYTlVaWGgwS0dKMVppa2dlMXh1SUNBZ0lIWmhjaUIyYVdWM0lEMGdibVYzSUZWcGJuUTRRWEp5WVhrb1luVm1LVnh1SUNBZ0lIWmhjaUJqYUdGeWN5QTlJRzVsZHlCQmNuSmhlU2gyYVdWM0xteGxibWQwYUNsY2JseHVJQ0FnSUdadmNpQW9kbUZ5SUdrZ1BTQXdPeUJwSUR3Z2RtbGxkeTVzWlc1bmRHZzdJR2tyS3lrZ2UxeHVJQ0FnSUNBZ1kyaGhjbk5iYVYwZ1BTQlRkSEpwYm1jdVpuSnZiVU5vWVhKRGIyUmxLSFpwWlhkYmFWMHBYRzRnSUNBZ2ZWeHVJQ0FnSUhKbGRIVnliaUJqYUdGeWN5NXFiMmx1S0NjbktWeHVJQ0I5WEc1Y2JpQWdablZ1WTNScGIyNGdZblZtWm1WeVEyeHZibVVvWW5WbUtTQjdYRzRnSUNBZ2FXWWdLR0oxWmk1emJHbGpaU2tnZTF4dUlDQWdJQ0FnY21WMGRYSnVJR0oxWmk1emJHbGpaU2d3S1Z4dUlDQWdJSDBnWld4elpTQjdYRzRnSUNBZ0lDQjJZWElnZG1sbGR5QTlJRzVsZHlCVmFXNTBPRUZ5Y21GNUtHSjFaaTVpZVhSbFRHVnVaM1JvS1Z4dUlDQWdJQ0FnZG1sbGR5NXpaWFFvYm1WM0lGVnBiblE0UVhKeVlYa29ZblZtS1NsY2JpQWdJQ0FnSUhKbGRIVnliaUIyYVdWM0xtSjFabVpsY2x4dUlDQWdJSDFjYmlBZ2ZWeHVYRzRnSUdaMWJtTjBhVzl1SUVKdlpIa29LU0I3WEc0Z0lDQWdkR2hwY3k1aWIyUjVWWE5sWkNBOUlHWmhiSE5sWEc1Y2JpQWdJQ0IwYUdsekxsOXBibWwwUW05a2VTQTlJR1oxYm1OMGFXOXVLR0p2WkhrcElIdGNiaUFnSUNBZ0lIUm9hWE11WDJKdlpIbEpibWwwSUQwZ1ltOWtlVnh1SUNBZ0lDQWdhV1lnS0NGaWIyUjVLU0I3WEc0Z0lDQWdJQ0FnSUhSb2FYTXVYMkp2WkhsVVpYaDBJRDBnSnlkY2JpQWdJQ0FnSUgwZ1pXeHpaU0JwWmlBb2RIbHdaVzltSUdKdlpIa2dQVDA5SUNkemRISnBibWNuS1NCN1hHNGdJQ0FnSUNBZ0lIUm9hWE11WDJKdlpIbFVaWGgwSUQwZ1ltOWtlVnh1SUNBZ0lDQWdmU0JsYkhObElHbG1JQ2h6ZFhCd2IzSjBMbUpzYjJJZ0ppWWdRbXh2WWk1d2NtOTBiM1I1Y0dVdWFYTlFjbTkwYjNSNWNHVlBaaWhpYjJSNUtTa2dlMXh1SUNBZ0lDQWdJQ0IwYUdsekxsOWliMlI1UW14dllpQTlJR0p2WkhsY2JpQWdJQ0FnSUgwZ1pXeHpaU0JwWmlBb2MzVndjRzl5ZEM1bWIzSnRSR0YwWVNBbUppQkdiM0p0UkdGMFlTNXdjbTkwYjNSNWNHVXVhWE5RY205MGIzUjVjR1ZQWmloaWIyUjVLU2tnZTF4dUlDQWdJQ0FnSUNCMGFHbHpMbDlpYjJSNVJtOXliVVJoZEdFZ1BTQmliMlI1WEc0Z0lDQWdJQ0I5SUdWc2MyVWdhV1lnS0hOMWNIQnZjblF1YzJWaGNtTm9VR0Z5WVcxeklDWW1JRlZTVEZObFlYSmphRkJoY21GdGN5NXdjbTkwYjNSNWNHVXVhWE5RY205MGIzUjVjR1ZQWmloaWIyUjVLU2tnZTF4dUlDQWdJQ0FnSUNCMGFHbHpMbDlpYjJSNVZHVjRkQ0E5SUdKdlpIa3VkRzlUZEhKcGJtY29LVnh1SUNBZ0lDQWdmU0JsYkhObElHbG1JQ2h6ZFhCd2IzSjBMbUZ5Y21GNVFuVm1abVZ5SUNZbUlITjFjSEJ2Y25RdVlteHZZaUFtSmlCcGMwUmhkR0ZXYVdWM0tHSnZaSGtwS1NCN1hHNGdJQ0FnSUNBZ0lIUm9hWE11WDJKdlpIbEJjbkpoZVVKMVptWmxjaUE5SUdKMVptWmxja05zYjI1bEtHSnZaSGt1WW5WbVptVnlLVnh1SUNBZ0lDQWdJQ0F2THlCSlJTQXhNQzB4TVNCallXNG5kQ0JvWVc1a2JHVWdZU0JFWVhSaFZtbGxkeUJpYjJSNUxseHVJQ0FnSUNBZ0lDQjBhR2x6TGw5aWIyUjVTVzVwZENBOUlHNWxkeUJDYkc5aUtGdDBhR2x6TGw5aWIyUjVRWEp5WVhsQ2RXWm1aWEpkS1Z4dUlDQWdJQ0FnZlNCbGJITmxJR2xtSUNoemRYQndiM0owTG1GeWNtRjVRblZtWm1WeUlDWW1JQ2hCY25KaGVVSjFabVpsY2k1d2NtOTBiM1I1Y0dVdWFYTlFjbTkwYjNSNWNHVlBaaWhpYjJSNUtTQjhmQ0JwYzBGeWNtRjVRblZtWm1WeVZtbGxkeWhpYjJSNUtTa3BJSHRjYmlBZ0lDQWdJQ0FnZEdocGN5NWZZbTlrZVVGeWNtRjVRblZtWm1WeUlEMGdZblZtWm1WeVEyeHZibVVvWW05a2VTbGNiaUFnSUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNBZ0lIUm9jbTkzSUc1bGR5QkZjbkp2Y2lnbmRXNXpkWEJ3YjNKMFpXUWdRbTlrZVVsdWFYUWdkSGx3WlNjcFhHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lHbG1JQ2doZEdocGN5NW9aV0ZrWlhKekxtZGxkQ2duWTI5dWRHVnVkQzEwZVhCbEp5a3BJSHRjYmlBZ0lDQWdJQ0FnYVdZZ0tIUjVjR1Z2WmlCaWIyUjVJRDA5UFNBbmMzUnlhVzVuSnlrZ2UxeHVJQ0FnSUNBZ0lDQWdJSFJvYVhNdWFHVmhaR1Z5Y3k1elpYUW9KMk52Ym5SbGJuUXRkSGx3WlNjc0lDZDBaWGgwTDNCc1lXbHVPMk5vWVhKelpYUTlWVlJHTFRnbktWeHVJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2FXWWdLSFJvYVhNdVgySnZaSGxDYkc5aUlDWW1JSFJvYVhNdVgySnZaSGxDYkc5aUxuUjVjR1VwSUh0Y2JpQWdJQ0FnSUNBZ0lDQjBhR2x6TG1obFlXUmxjbk11YzJWMEtDZGpiMjUwWlc1MExYUjVjR1VuTENCMGFHbHpMbDlpYjJSNVFteHZZaTUwZVhCbEtWeHVJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2FXWWdLSE4xY0hCdmNuUXVjMlZoY21Ob1VHRnlZVzF6SUNZbUlGVlNURk5sWVhKamFGQmhjbUZ0Y3k1d2NtOTBiM1I1Y0dVdWFYTlFjbTkwYjNSNWNHVlBaaWhpYjJSNUtTa2dlMXh1SUNBZ0lDQWdJQ0FnSUhSb2FYTXVhR1ZoWkdWeWN5NXpaWFFvSjJOdmJuUmxiblF0ZEhsd1pTY3NJQ2RoY0hCc2FXTmhkR2x2Ymk5NExYZDNkeTFtYjNKdExYVnliR1Z1WTI5a1pXUTdZMmhoY25ObGREMVZWRVl0T0NjcFhHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lIMWNiaUFnSUNCOVhHNWNiaUFnSUNCcFppQW9jM1Z3Y0c5eWRDNWliRzlpS1NCN1hHNGdJQ0FnSUNCMGFHbHpMbUpzYjJJZ1BTQm1kVzVqZEdsdmJpZ3BJSHRjYmlBZ0lDQWdJQ0FnZG1GeUlISmxhbVZqZEdWa0lEMGdZMjl1YzNWdFpXUW9kR2hwY3lsY2JpQWdJQ0FnSUNBZ2FXWWdLSEpsYW1WamRHVmtLU0I3WEc0Z0lDQWdJQ0FnSUNBZ2NtVjBkWEp1SUhKbGFtVmpkR1ZrWEc0Z0lDQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0lDQnBaaUFvZEdocGN5NWZZbTlrZVVKc2IySXBJSHRjYmlBZ0lDQWdJQ0FnSUNCeVpYUjFjbTRnVUhKdmJXbHpaUzV5WlhOdmJIWmxLSFJvYVhNdVgySnZaSGxDYkc5aUtWeHVJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2FXWWdLSFJvYVhNdVgySnZaSGxCY25KaGVVSjFabVpsY2lrZ2UxeHVJQ0FnSUNBZ0lDQWdJSEpsZEhWeWJpQlFjbTl0YVhObExuSmxjMjlzZG1Vb2JtVjNJRUpzYjJJb1czUm9hWE11WDJKdlpIbEJjbkpoZVVKMVptWmxjbDBwS1Z4dUlDQWdJQ0FnSUNCOUlHVnNjMlVnYVdZZ0tIUm9hWE11WDJKdlpIbEdiM0p0UkdGMFlTa2dlMXh1SUNBZ0lDQWdJQ0FnSUhSb2NtOTNJRzVsZHlCRmNuSnZjaWduWTI5MWJHUWdibTkwSUhKbFlXUWdSbTl5YlVSaGRHRWdZbTlrZVNCaGN5QmliRzlpSnlsY2JpQWdJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ0lDQnlaWFIxY200Z1VISnZiV2x6WlM1eVpYTnZiSFpsS0c1bGR5QkNiRzlpS0Z0MGFHbHpMbDlpYjJSNVZHVjRkRjBwS1Z4dUlDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lIUm9hWE11WVhKeVlYbENkV1ptWlhJZ1BTQm1kVzVqZEdsdmJpZ3BJSHRjYmlBZ0lDQWdJQ0FnYVdZZ0tIUm9hWE11WDJKdlpIbEJjbkpoZVVKMVptWmxjaWtnZTF4dUlDQWdJQ0FnSUNBZ0lISmxkSFZ5YmlCamIyNXpkVzFsWkNoMGFHbHpLU0I4ZkNCUWNtOXRhWE5sTG5KbGMyOXNkbVVvZEdocGN5NWZZbTlrZVVGeWNtRjVRblZtWm1WeUtWeHVJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJSEpsZEhWeWJpQjBhR2x6TG1Kc2IySW9LUzUwYUdWdUtISmxZV1JDYkc5aVFYTkJjbkpoZVVKMVptWmxjaWxjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnZlZ4dUlDQWdJSDFjYmx4dUlDQWdJSFJvYVhNdWRHVjRkQ0E5SUdaMWJtTjBhVzl1S0NrZ2UxeHVJQ0FnSUNBZ2RtRnlJSEpsYW1WamRHVmtJRDBnWTI5dWMzVnRaV1FvZEdocGN5bGNiaUFnSUNBZ0lHbG1JQ2h5WldwbFkzUmxaQ2tnZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnY21WcVpXTjBaV1JjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnYVdZZ0tIUm9hWE11WDJKdlpIbENiRzlpS1NCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCeVpXRmtRbXh2WWtGelZHVjRkQ2gwYUdsekxsOWliMlI1UW14dllpbGNiaUFnSUNBZ0lIMGdaV3h6WlNCcFppQW9kR2hwY3k1ZlltOWtlVUZ5Y21GNVFuVm1abVZ5S1NCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCUWNtOXRhWE5sTG5KbGMyOXNkbVVvY21WaFpFRnljbUY1UW5WbVptVnlRWE5VWlhoMEtIUm9hWE11WDJKdlpIbEJjbkpoZVVKMVptWmxjaWtwWEc0Z0lDQWdJQ0I5SUdWc2MyVWdhV1lnS0hSb2FYTXVYMkp2WkhsR2IzSnRSR0YwWVNrZ2UxeHVJQ0FnSUNBZ0lDQjBhSEp2ZHlCdVpYY2dSWEp5YjNJb0oyTnZkV3hrSUc1dmRDQnlaV0ZrSUVadmNtMUVZWFJoSUdKdlpIa2dZWE1nZEdWNGRDY3BYRzRnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z1VISnZiV2x6WlM1eVpYTnZiSFpsS0hSb2FYTXVYMkp2WkhsVVpYaDBLVnh1SUNBZ0lDQWdmVnh1SUNBZ0lIMWNibHh1SUNBZ0lHbG1JQ2h6ZFhCd2IzSjBMbVp2Y20xRVlYUmhLU0I3WEc0Z0lDQWdJQ0IwYUdsekxtWnZjbTFFWVhSaElEMGdablZ1WTNScGIyNG9LU0I3WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUIwYUdsekxuUmxlSFFvS1M1MGFHVnVLR1JsWTI5a1pTbGNiaUFnSUNBZ0lIMWNiaUFnSUNCOVhHNWNiaUFnSUNCMGFHbHpMbXB6YjI0Z1BTQm1kVzVqZEdsdmJpZ3BJSHRjYmlBZ0lDQWdJSEpsZEhWeWJpQjBhR2x6TG5SbGVIUW9LUzUwYUdWdUtFcFRUMDR1Y0dGeWMyVXBYRzRnSUNBZ2ZWeHVYRzRnSUNBZ2NtVjBkWEp1SUhSb2FYTmNiaUFnZlZ4dVhHNGdJQzh2SUVoVVZGQWdiV1YwYUc5a2N5QjNhRzl6WlNCallYQnBkR0ZzYVhwaGRHbHZiaUJ6YUc5MWJHUWdZbVVnYm05eWJXRnNhWHBsWkZ4dUlDQjJZWElnYldWMGFHOWtjeUE5SUZzblJFVk1SVlJGSnl3Z0owZEZWQ2NzSUNkSVJVRkVKeXdnSjA5UVZFbFBUbE1uTENBblVFOVRWQ2NzSUNkUVZWUW5YVnh1WEc0Z0lHWjFibU4wYVc5dUlHNXZjbTFoYkdsNlpVMWxkR2h2WkNodFpYUm9iMlFwSUh0Y2JpQWdJQ0IyWVhJZ2RYQmpZWE5sWkNBOUlHMWxkR2h2WkM1MGIxVndjR1Z5UTJGelpTZ3BYRzRnSUNBZ2NtVjBkWEp1SUNodFpYUm9iMlJ6TG1sdVpHVjRUMllvZFhCallYTmxaQ2tnUGlBdE1Ta2dQeUIxY0dOaGMyVmtJRG9nYldWMGFHOWtYRzRnSUgxY2JseHVJQ0JtZFc1amRHbHZiaUJTWlhGMVpYTjBLR2x1Y0hWMExDQnZjSFJwYjI1ektTQjdYRzRnSUNBZ2IzQjBhVzl1Y3lBOUlHOXdkR2x2Ym5NZ2ZId2dlMzFjYmlBZ0lDQjJZWElnWW05a2VTQTlJRzl3ZEdsdmJuTXVZbTlrZVZ4dVhHNGdJQ0FnYVdZZ0tHbHVjSFYwSUdsdWMzUmhibU5sYjJZZ1VtVnhkV1Z6ZENrZ2UxeHVJQ0FnSUNBZ2FXWWdLR2x1Y0hWMExtSnZaSGxWYzJWa0tTQjdYRzRnSUNBZ0lDQWdJSFJvY205M0lHNWxkeUJVZVhCbFJYSnliM0lvSjBGc2NtVmhaSGtnY21WaFpDY3BYRzRnSUNBZ0lDQjlYRzRnSUNBZ0lDQjBhR2x6TG5WeWJDQTlJR2x1Y0hWMExuVnliRnh1SUNBZ0lDQWdkR2hwY3k1amNtVmtaVzUwYVdGc2N5QTlJR2x1Y0hWMExtTnlaV1JsYm5ScFlXeHpYRzRnSUNBZ0lDQnBaaUFvSVc5d2RHbHZibk11YUdWaFpHVnljeWtnZTF4dUlDQWdJQ0FnSUNCMGFHbHpMbWhsWVdSbGNuTWdQU0J1WlhjZ1NHVmhaR1Z5Y3locGJuQjFkQzVvWldGa1pYSnpLVnh1SUNBZ0lDQWdmVnh1SUNBZ0lDQWdkR2hwY3k1dFpYUm9iMlFnUFNCcGJuQjFkQzV0WlhSb2IyUmNiaUFnSUNBZ0lIUm9hWE11Ylc5a1pTQTlJR2x1Y0hWMExtMXZaR1ZjYmlBZ0lDQWdJR2xtSUNnaFltOWtlU0FtSmlCcGJuQjFkQzVmWW05a2VVbHVhWFFnSVQwZ2JuVnNiQ2tnZTF4dUlDQWdJQ0FnSUNCaWIyUjVJRDBnYVc1d2RYUXVYMkp2WkhsSmJtbDBYRzRnSUNBZ0lDQWdJR2x1Y0hWMExtSnZaSGxWYzJWa0lEMGdkSEoxWlZ4dUlDQWdJQ0FnZlZ4dUlDQWdJSDBnWld4elpTQjdYRzRnSUNBZ0lDQjBhR2x6TG5WeWJDQTlJRk4wY21sdVp5aHBibkIxZENsY2JpQWdJQ0I5WEc1Y2JpQWdJQ0IwYUdsekxtTnlaV1JsYm5ScFlXeHpJRDBnYjNCMGFXOXVjeTVqY21Wa1pXNTBhV0ZzY3lCOGZDQjBhR2x6TG1OeVpXUmxiblJwWVd4eklIeDhJQ2R2YldsMEoxeHVJQ0FnSUdsbUlDaHZjSFJwYjI1ekxtaGxZV1JsY25NZ2ZId2dJWFJvYVhNdWFHVmhaR1Z5Y3lrZ2UxeHVJQ0FnSUNBZ2RHaHBjeTVvWldGa1pYSnpJRDBnYm1WM0lFaGxZV1JsY25Nb2IzQjBhVzl1Y3k1b1pXRmtaWEp6S1Z4dUlDQWdJSDFjYmlBZ0lDQjBhR2x6TG0xbGRHaHZaQ0E5SUc1dmNtMWhiR2w2WlUxbGRHaHZaQ2h2Y0hScGIyNXpMbTFsZEdodlpDQjhmQ0IwYUdsekxtMWxkR2h2WkNCOGZDQW5SMFZVSnlsY2JpQWdJQ0IwYUdsekxtMXZaR1VnUFNCdmNIUnBiMjV6TG0xdlpHVWdmSHdnZEdocGN5NXRiMlJsSUh4OElHNTFiR3hjYmlBZ0lDQjBhR2x6TG5KbFptVnljbVZ5SUQwZ2JuVnNiRnh1WEc0Z0lDQWdhV1lnS0NoMGFHbHpMbTFsZEdodlpDQTlQVDBnSjBkRlZDY2dmSHdnZEdocGN5NXRaWFJvYjJRZ1BUMDlJQ2RJUlVGRUp5a2dKaVlnWW05a2VTa2dlMXh1SUNBZ0lDQWdkR2h5YjNjZ2JtVjNJRlI1Y0dWRmNuSnZjaWduUW05a2VTQnViM1FnWVd4c2IzZGxaQ0JtYjNJZ1IwVlVJRzl5SUVoRlFVUWdjbVZ4ZFdWemRITW5LVnh1SUNBZ0lIMWNiaUFnSUNCMGFHbHpMbDlwYm1sMFFtOWtlU2hpYjJSNUtWeHVJQ0I5WEc1Y2JpQWdVbVZ4ZFdWemRDNXdjbTkwYjNSNWNHVXVZMnh2Ym1VZ1BTQm1kVzVqZEdsdmJpZ3BJSHRjYmlBZ0lDQnlaWFIxY200Z2JtVjNJRkpsY1hWbGMzUW9kR2hwY3l3Z2V5QmliMlI1T2lCMGFHbHpMbDlpYjJSNVNXNXBkQ0I5S1Z4dUlDQjlYRzVjYmlBZ1puVnVZM1JwYjI0Z1pHVmpiMlJsS0dKdlpIa3BJSHRjYmlBZ0lDQjJZWElnWm05eWJTQTlJRzVsZHlCR2IzSnRSR0YwWVNncFhHNGdJQ0FnWW05a2VTNTBjbWx0S0NrdWMzQnNhWFFvSnlZbktTNW1iM0pGWVdOb0tHWjFibU4wYVc5dUtHSjVkR1Z6S1NCN1hHNGdJQ0FnSUNCcFppQW9ZbmwwWlhNcElIdGNiaUFnSUNBZ0lDQWdkbUZ5SUhOd2JHbDBJRDBnWW5sMFpYTXVjM0JzYVhRb0p6MG5LVnh1SUNBZ0lDQWdJQ0IyWVhJZ2JtRnRaU0E5SUhOd2JHbDBMbk5vYVdaMEtDa3VjbVZ3YkdGalpTZ3ZYRndyTDJjc0lDY2dKeWxjYmlBZ0lDQWdJQ0FnZG1GeUlIWmhiSFZsSUQwZ2MzQnNhWFF1YW05cGJpZ25QU2NwTG5KbGNHeGhZMlVvTDF4Y0t5OW5MQ0FuSUNjcFhHNGdJQ0FnSUNBZ0lHWnZjbTB1WVhCd1pXNWtLR1JsWTI5a1pWVlNTVU52YlhCdmJtVnVkQ2h1WVcxbEtTd2daR1ZqYjJSbFZWSkpRMjl0Y0c5dVpXNTBLSFpoYkhWbEtTbGNiaUFnSUNBZ0lIMWNiaUFnSUNCOUtWeHVJQ0FnSUhKbGRIVnliaUJtYjNKdFhHNGdJSDFjYmx4dUlDQm1kVzVqZEdsdmJpQndZWEp6WlVobFlXUmxjbk1vY21GM1NHVmhaR1Z5Y3lrZ2UxeHVJQ0FnSUhaaGNpQm9aV0ZrWlhKeklEMGdibVYzSUVobFlXUmxjbk1vS1Z4dUlDQWdJQzh2SUZKbGNHeGhZMlVnYVc1emRHRnVZMlZ6SUc5bUlGeGNjbHhjYmlCaGJtUWdYRnh1SUdadmJHeHZkMlZrSUdKNUlHRjBJR3hsWVhOMElHOXVaU0J6Y0dGalpTQnZjaUJvYjNKcGVtOXVkR0ZzSUhSaFlpQjNhWFJvSUdFZ2MzQmhZMlZjYmlBZ0lDQXZMeUJvZEhSd2N6b3ZMM1J2YjJ4ekxtbGxkR1l1YjNKbkwyaDBiV3d2Y21aak56SXpNQ056WldOMGFXOXVMVE11TWx4dUlDQWdJSFpoY2lCd2NtVlFjbTlqWlhOelpXUklaV0ZrWlhKeklEMGdjbUYzU0dWaFpHVnljeTV5WlhCc1lXTmxLQzljWEhJL1hGeHVXMXhjZENCZEt5OW5MQ0FuSUNjcFhHNGdJQ0FnY0hKbFVISnZZMlZ6YzJWa1NHVmhaR1Z5Y3k1emNHeHBkQ2d2WEZ4eVAxeGNiaThwTG1admNrVmhZMmdvWm5WdVkzUnBiMjRvYkdsdVpTa2dlMXh1SUNBZ0lDQWdkbUZ5SUhCaGNuUnpJRDBnYkdsdVpTNXpjR3hwZENnbk9pY3BYRzRnSUNBZ0lDQjJZWElnYTJWNUlEMGdjR0Z5ZEhNdWMyaHBablFvS1M1MGNtbHRLQ2xjYmlBZ0lDQWdJR2xtSUNoclpYa3BJSHRjYmlBZ0lDQWdJQ0FnZG1GeUlIWmhiSFZsSUQwZ2NHRnlkSE11YW05cGJpZ25PaWNwTG5SeWFXMG9LVnh1SUNBZ0lDQWdJQ0JvWldGa1pYSnpMbUZ3Y0dWdVpDaHJaWGtzSUhaaGJIVmxLVnh1SUNBZ0lDQWdmVnh1SUNBZ0lIMHBYRzRnSUNBZ2NtVjBkWEp1SUdobFlXUmxjbk5jYmlBZ2ZWeHVYRzRnSUVKdlpIa3VZMkZzYkNoU1pYRjFaWE4wTG5CeWIzUnZkSGx3WlNsY2JseHVJQ0JtZFc1amRHbHZiaUJTWlhOd2IyNXpaU2hpYjJSNVNXNXBkQ3dnYjNCMGFXOXVjeWtnZTF4dUlDQWdJR2xtSUNnaGIzQjBhVzl1Y3lrZ2UxeHVJQ0FnSUNBZ2IzQjBhVzl1Y3lBOUlIdDlYRzRnSUNBZ2ZWeHVYRzRnSUNBZ2RHaHBjeTUwZVhCbElEMGdKMlJsWm1GMWJIUW5YRzRnSUNBZ2RHaHBjeTV6ZEdGMGRYTWdQU0J2Y0hScGIyNXpMbk4wWVhSMWN5QTlQVDBnZFc1a1pXWnBibVZrSUQ4Z01qQXdJRG9nYjNCMGFXOXVjeTV6ZEdGMGRYTmNiaUFnSUNCMGFHbHpMbTlySUQwZ2RHaHBjeTV6ZEdGMGRYTWdQajBnTWpBd0lDWW1JSFJvYVhNdWMzUmhkSFZ6SUR3Z016QXdYRzRnSUNBZ2RHaHBjeTV6ZEdGMGRYTlVaWGgwSUQwZ0ozTjBZWFIxYzFSbGVIUW5JR2x1SUc5d2RHbHZibk1nUHlCdmNIUnBiMjV6TG5OMFlYUjFjMVJsZUhRZ09pQW5UMHNuWEc0Z0lDQWdkR2hwY3k1b1pXRmtaWEp6SUQwZ2JtVjNJRWhsWVdSbGNuTW9iM0IwYVc5dWN5NW9aV0ZrWlhKektWeHVJQ0FnSUhSb2FYTXVkWEpzSUQwZ2IzQjBhVzl1Y3k1MWNtd2dmSHdnSnlkY2JpQWdJQ0IwYUdsekxsOXBibWwwUW05a2VTaGliMlI1U1c1cGRDbGNiaUFnZlZ4dVhHNGdJRUp2WkhrdVkyRnNiQ2hTWlhOd2IyNXpaUzV3Y205MGIzUjVjR1VwWEc1Y2JpQWdVbVZ6Y0c5dWMyVXVjSEp2ZEc5MGVYQmxMbU5zYjI1bElEMGdablZ1WTNScGIyNG9LU0I3WEc0Z0lDQWdjbVYwZFhKdUlHNWxkeUJTWlhOd2IyNXpaU2gwYUdsekxsOWliMlI1U1c1cGRDd2dlMXh1SUNBZ0lDQWdjM1JoZEhWek9pQjBhR2x6TG5OMFlYUjFjeXhjYmlBZ0lDQWdJSE4wWVhSMWMxUmxlSFE2SUhSb2FYTXVjM1JoZEhWelZHVjRkQ3hjYmlBZ0lDQWdJR2hsWVdSbGNuTTZJRzVsZHlCSVpXRmtaWEp6S0hSb2FYTXVhR1ZoWkdWeWN5a3NYRzRnSUNBZ0lDQjFjbXc2SUhSb2FYTXVkWEpzWEc0Z0lDQWdmU2xjYmlBZ2ZWeHVYRzRnSUZKbGMzQnZibk5sTG1WeWNtOXlJRDBnWm5WdVkzUnBiMjRvS1NCN1hHNGdJQ0FnZG1GeUlISmxjM0J2Ym5ObElEMGdibVYzSUZKbGMzQnZibk5sS0c1MWJHd3NJSHR6ZEdGMGRYTTZJREFzSUhOMFlYUjFjMVJsZUhRNklDY25mU2xjYmlBZ0lDQnlaWE53YjI1elpTNTBlWEJsSUQwZ0oyVnljbTl5SjF4dUlDQWdJSEpsZEhWeWJpQnlaWE53YjI1elpWeHVJQ0I5WEc1Y2JpQWdkbUZ5SUhKbFpHbHlaV04wVTNSaGRIVnpaWE1nUFNCYk16QXhMQ0F6TURJc0lETXdNeXdnTXpBM0xDQXpNRGhkWEc1Y2JpQWdVbVZ6Y0c5dWMyVXVjbVZrYVhKbFkzUWdQU0JtZFc1amRHbHZiaWgxY213c0lITjBZWFIxY3lrZ2UxeHVJQ0FnSUdsbUlDaHlaV1JwY21WamRGTjBZWFIxYzJWekxtbHVaR1Y0VDJZb2MzUmhkSFZ6S1NBOVBUMGdMVEVwSUh0Y2JpQWdJQ0FnSUhSb2NtOTNJRzVsZHlCU1lXNW5aVVZ5Y205eUtDZEpiblpoYkdsa0lITjBZWFIxY3lCamIyUmxKeWxjYmlBZ0lDQjlYRzVjYmlBZ0lDQnlaWFIxY200Z2JtVjNJRkpsYzNCdmJuTmxLRzUxYkd3c0lIdHpkR0YwZFhNNklITjBZWFIxY3l3Z2FHVmhaR1Z5Y3pvZ2UyeHZZMkYwYVc5dU9pQjFjbXg5ZlNsY2JpQWdmVnh1WEc0Z0lITmxiR1l1U0dWaFpHVnljeUE5SUVobFlXUmxjbk5jYmlBZ2MyVnNaaTVTWlhGMVpYTjBJRDBnVW1WeGRXVnpkRnh1SUNCelpXeG1MbEpsYzNCdmJuTmxJRDBnVW1WemNHOXVjMlZjYmx4dUlDQnpaV3htTG1abGRHTm9JRDBnWm5WdVkzUnBiMjRvYVc1d2RYUXNJR2x1YVhRcElIdGNiaUFnSUNCeVpYUjFjbTRnYm1WM0lGQnliMjFwYzJVb1puVnVZM1JwYjI0b2NtVnpiMngyWlN3Z2NtVnFaV04wS1NCN1hHNGdJQ0FnSUNCMllYSWdjbVZ4ZFdWemRDQTlJRzVsZHlCU1pYRjFaWE4wS0dsdWNIVjBMQ0JwYm1sMEtWeHVJQ0FnSUNBZ2RtRnlJSGhvY2lBOUlHNWxkeUJZVFV4SWRIUndVbVZ4ZFdWemRDZ3BYRzVjYmlBZ0lDQWdJSGhvY2k1dmJteHZZV1FnUFNCbWRXNWpkR2x2YmlncElIdGNiaUFnSUNBZ0lDQWdkbUZ5SUc5d2RHbHZibk1nUFNCN1hHNGdJQ0FnSUNBZ0lDQWdjM1JoZEhWek9pQjRhSEl1YzNSaGRIVnpMRnh1SUNBZ0lDQWdJQ0FnSUhOMFlYUjFjMVJsZUhRNklIaG9jaTV6ZEdGMGRYTlVaWGgwTEZ4dUlDQWdJQ0FnSUNBZ0lHaGxZV1JsY25NNklIQmhjbk5sU0dWaFpHVnljeWg0YUhJdVoyVjBRV3hzVW1WemNHOXVjMlZJWldGa1pYSnpLQ2tnZkh3Z0p5Y3BYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnYjNCMGFXOXVjeTUxY213Z1BTQW5jbVZ6Y0c5dWMyVlZVa3duSUdsdUlIaG9jaUEvSUhob2NpNXlaWE53YjI1elpWVlNUQ0E2SUc5d2RHbHZibk11YUdWaFpHVnljeTVuWlhRb0oxZ3RVbVZ4ZFdWemRDMVZVa3duS1Z4dUlDQWdJQ0FnSUNCMllYSWdZbTlrZVNBOUlDZHlaWE53YjI1elpTY2dhVzRnZUdoeUlEOGdlR2h5TG5KbGMzQnZibk5sSURvZ2VHaHlMbkpsYzNCdmJuTmxWR1Y0ZEZ4dUlDQWdJQ0FnSUNCeVpYTnZiSFpsS0c1bGR5QlNaWE53YjI1elpTaGliMlI1TENCdmNIUnBiMjV6S1NsY2JpQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ2VHaHlMbTl1WlhKeWIzSWdQU0JtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0FnSUNBZ2NtVnFaV04wS0c1bGR5QlVlWEJsUlhKeWIzSW9KMDVsZEhkdmNtc2djbVZ4ZFdWemRDQm1ZV2xzWldRbktTbGNiaUFnSUNBZ0lIMWNibHh1SUNBZ0lDQWdlR2h5TG05dWRHbHRaVzkxZENBOUlHWjFibU4wYVc5dUtDa2dlMXh1SUNBZ0lDQWdJQ0J5WldwbFkzUW9ibVYzSUZSNWNHVkZjbkp2Y2lnblRtVjBkMjl5YXlCeVpYRjFaWE4wSUdaaGFXeGxaQ2NwS1Z4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNCNGFISXViM0JsYmloeVpYRjFaWE4wTG0xbGRHaHZaQ3dnY21WeGRXVnpkQzUxY213c0lIUnlkV1VwWEc1Y2JpQWdJQ0FnSUdsbUlDaHlaWEYxWlhOMExtTnlaV1JsYm5ScFlXeHpJRDA5UFNBbmFXNWpiSFZrWlNjcElIdGNiaUFnSUNBZ0lDQWdlR2h5TG5kcGRHaERjbVZrWlc1MGFXRnNjeUE5SUhSeWRXVmNiaUFnSUNBZ0lIMGdaV3h6WlNCcFppQW9jbVZ4ZFdWemRDNWpjbVZrWlc1MGFXRnNjeUE5UFQwZ0oyOXRhWFFuS1NCN1hHNGdJQ0FnSUNBZ0lIaG9jaTUzYVhSb1EzSmxaR1Z1ZEdsaGJITWdQU0JtWVd4elpWeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQnBaaUFvSjNKbGMzQnZibk5sVkhsd1pTY2dhVzRnZUdoeUlDWW1JSE4xY0hCdmNuUXVZbXh2WWlrZ2UxeHVJQ0FnSUNBZ0lDQjRhSEl1Y21WemNHOXVjMlZVZVhCbElEMGdKMkpzYjJJblhHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lISmxjWFZsYzNRdWFHVmhaR1Z5Y3k1bWIzSkZZV05vS0daMWJtTjBhVzl1S0haaGJIVmxMQ0J1WVcxbEtTQjdYRzRnSUNBZ0lDQWdJSGhvY2k1elpYUlNaWEYxWlhOMFNHVmhaR1Z5S0c1aGJXVXNJSFpoYkhWbEtWeHVJQ0FnSUNBZ2ZTbGNibHh1SUNBZ0lDQWdlR2h5TG5ObGJtUW9kSGx3Wlc5bUlISmxjWFZsYzNRdVgySnZaSGxKYm1sMElEMDlQU0FuZFc1a1pXWnBibVZrSnlBL0lHNTFiR3dnT2lCeVpYRjFaWE4wTGw5aWIyUjVTVzVwZENsY2JpQWdJQ0I5S1Z4dUlDQjlYRzRnSUhObGJHWXVabVYwWTJndWNHOXNlV1pwYkd3Z1BTQjBjblZsWEc1OUtTaDBlWEJsYjJZZ2MyVnNaaUFoUFQwZ0ozVnVaR1ZtYVc1bFpDY2dQeUJ6Wld4bUlEb2dkR2hwY3lrN1hHNGlMQ0pqYjI1emRDQkVRaUE5SUNkb2RIUndjem92TDI1bGVIVnpMV05oZEdGc2IyY3VabWx5WldKaGMyVnBieTVqYjIwdmNHOXpkSE11YW5OdmJqOWhkWFJvUFRkbk4zQjVTMHQ1YTA0elRqVmxkM0pKYldoUFlWTTJkbmR5Um5Oak5XWkxhM0pyT0dWcWVtWW5PMXh1WEc1amIyNXpkQ0FrYkc5aFpHbHVaeUE5SUVGeWNtRjVMbVp5YjIwb1pHOWpkVzFsYm5RdWNYVmxjbmxUWld4bFkzUnZja0ZzYkNnbkxteHZZV1JwYm1jbktTazdYRzVqYjI1emRDQWtZWEowYVdOc1pVeHBjM1FnUFNCa2IyTjFiV1Z1ZEM1blpYUkZiR1Z0Wlc1MFFubEpaQ2duYW5NdGJHbHpkQ2NwTzF4dVkyOXVjM1FnSkc1aGRpQTlJR1J2WTNWdFpXNTBMbWRsZEVWc1pXMWxiblJDZVVsa0tDZHFjeTF1WVhZbktUdGNibU52Ym5OMElDUndZWEpoYkd4aGVDQTlJR1J2WTNWdFpXNTBMbkYxWlhKNVUyVnNaV04wYjNJb0p5NXdZWEpoYkd4aGVDY3BPMXh1WTI5dWMzUWdKR052Ym5SbGJuUWdQU0JrYjJOMWJXVnVkQzV4ZFdWeWVWTmxiR1ZqZEc5eUtDY3VZMjl1ZEdWdWRDY3BPMXh1WTI5dWMzUWdKSFJwZEd4bElEMGdaRzlqZFcxbGJuUXVaMlYwUld4bGJXVnVkRUo1U1dRb0oycHpMWFJwZEd4bEp5azdYRzVqYjI1emRDQWtkWEJCY25KdmR5QTlJR1J2WTNWdFpXNTBMbWRsZEVWc1pXMWxiblJDZVVsa0tDZHFjeTFoY25KdmR5Y3BPMXh1WTI5dWMzUWdKRzF2WkdGc0lEMGdaRzlqZFcxbGJuUXVjWFZsY25sVFpXeGxZM1J2Y2lnbkxtMXZaR0ZzSnlrN1hHNWpiMjV6ZENBa2JHbG5hSFJpYjNnZ1BTQmtiMk4xYldWdWRDNXhkV1Z5ZVZObGJHVmpkRzl5S0NjdWJHbG5hSFJpYjNnbktUdGNibU52Ym5OMElDUjJhV1YzSUQwZ1pHOWpkVzFsYm5RdWNYVmxjbmxUWld4bFkzUnZjaWduTG14cFoyaDBZbTk0TFhacFpYY25LVHRjYm1OdmJuTjBJSE52Y25SSlpITWdQU0JiSjJGeWRHbHpkQ2NzSUNkMGFYUnNaU2RkTzF4dVhHNWxlSEJ2Y25RZ2V5QmNibHgwUkVJc1hHNWNkQ1JzYjJGa2FXNW5MRnh1WEhRa1lYSjBhV05zWlV4cGMzUXNJRnh1WEhRa2JtRjJMQ0JjYmx4MEpIQmhjbUZzYkdGNExGeHVYSFFrWTI5dWRHVnVkQ3hjYmx4MEpIUnBkR3hsTEZ4dVhIUWtkWEJCY25KdmR5eGNibHgwSkcxdlpHRnNMRnh1WEhRa2JHbG5hSFJpYjNnc1hHNWNkQ1IyYVdWM0xGeHVYSFJ6YjNKMFNXUnpYRzU5T3lJc0ltbHRjRzl5ZENCemJXOXZkR2h6WTNKdmJHd2dabkp2YlNBbmMyMXZiM1JvYzJOeWIyeHNMWEJ2YkhsbWFXeHNKenRjYm1sdGNHOXlkQ0FuZDJoaGRIZG5MV1psZEdOb0p6c2dYRzVjYm1sdGNHOXlkQ0I3SUdGeWRHbGpiR1ZVWlcxd2JHRjBaU3dnY21WdVpHVnlUbUYyVEdjZ2ZTQm1jbTl0SUNjdUwzUmxiWEJzWVhSbGN5YzdYRzVwYlhCdmNuUWdleUJrWldKdmRXNWpaU3dnYUdsa1pVeHZZV1JwYm1jc0lITmpjbTlzYkZSdlZHOXdJSDBnWm5KdmJTQW5MaTkxZEdsc2N5YzdYRzVwYlhCdmNuUWdleUJFUWl3Z0pHRnlkR2xqYkdWTWFYTjBMQ0J6YjNKMFNXUnpJSDBnWm5KdmJTQW5MaTlqYjI1emRHRnVkSE1uTzF4dWFXMXdiM0owSUhzZ1lYUjBZV05vVFc5a1lXeE1hWE4wWlc1bGNuTXNJR0YwZEdGamFGVndRWEp5YjNkTWFYTjBaVzVsY25Nc0lHRjBkR0ZqYUVsdFlXZGxUR2x6ZEdWdVpYSnpMQ0J0WVd0bFFXeHdhR0ZpWlhRc0lHMWhhMlZUYkdsa1pYSWdmU0JtY205dElDY3VMMjF2WkhWc1pYTW5PMXh1WEc1c1pYUWdjMjl5ZEV0bGVTQTlJREE3SUM4dklEQWdQU0JoY25ScGMzUXNJREVnUFNCMGFYUnNaVnh1YkdWMElHVnVkSEpwWlhNZ1BTQjdJR0o1UVhWMGFHOXlPaUJiWFN3Z1lubFVhWFJzWlRvZ1cxMGdmVHRjYmx4dVkyOXVjM1FnYzJWMFZYQlRiM0owUW5WMGRHOXVjeUE5SUNncElEMCtJSHRjYmx4MGMyOXlkRWxrY3k1bWIzSkZZV05vS0dsa0lEMCtJSHRjYmx4MFhIUmpiMjV6ZENCaGJIUWdQU0JwWkNBOVBUMGdKMkZ5ZEdsemRDY2dQeUFuZEdsMGJHVW5JRG9nSjJGeWRHbHpkQ2M3WEc1Y2JseDBYSFJqYjI1emRDQWtZblYwZEc5dUlEMGdaRzlqZFcxbGJuUXVaMlYwUld4bGJXVnVkRUo1U1dRb1lHcHpMV0o1TFNSN2FXUjlZQ2s3WEc1Y2RGeDBZMjl1YzNRZ0pHRnNkRUoxZEhSdmJpQTlJR1J2WTNWdFpXNTBMbWRsZEVWc1pXMWxiblJDZVVsa0tHQnFjeTFpZVMwa2UyRnNkSDFnS1R0Y2JseHVYSFJjZENSaWRYUjBiMjR1WVdSa1JYWmxiblJNYVhOMFpXNWxjaWduWTJ4cFkyc25MQ0FvS1NBOVBpQjdYRzVjZEZ4MFhIUnpZM0p2Ykd4VWIxUnZjQ2dwTzF4dVhIUmNkRngwYzI5eWRFdGxlU0E5SUNGemIzSjBTMlY1TzF4dVhIUmNkRngwY21WdVpHVnlSVzUwY21sbGN5Z3BPMXh1WEc1Y2RGeDBYSFFrWW5WMGRHOXVMbU5zWVhOelRHbHpkQzVoWkdRb0oyRmpkR2wyWlNjcE8xeHVYSFJjZEZ4MEpHRnNkRUoxZEhSdmJpNWpiR0Z6YzB4cGMzUXVjbVZ0YjNabEtDZGhZM1JwZG1VbktUdGNibHgwWEhSOUtWeHVYSFI5S1R0Y2JuMDdYRzVjYm1OdmJuTjBJRzFoYTJWRGFYUmhkR2x2YmlBOUlDaGxiblJ5ZVN3Z2FTa2dQVDRnZTF4dVhIUmpiMjV6ZENCN0lHTnlaV1JwZEN3Z1kzSmxaR2wwWDJ4cGJtc2dmU0E5SUdWdWRISjVPMXh1WEhSamIyNXpkQ0JsYm5SeWVVUmxjMk55YVhCMGFXOXVJRDBnWkc5amRXMWxiblF1WjJWMFJXeGxiV1Z1ZEVKNVNXUW9ZSE5zYVdSbGNpMGtlMmw5WUNrdWNYVmxjbmxUWld4bFkzUnZjaWduTG1GeWRHbGpiR1V0WkdWelkzSnBjSFJwYjI0bktUdGNibHgwWTI5dWMzUWdZMmwwWVhScGIyNGdQU0JnUEdScGRpQmpiR0Z6Y3oxY0ltRnlkR2xqYkdVdFkzSmxaR2wwWENJK2MyOTFjbU5sT2lBOFlTQm9jbVZtUFZ3aUpIdGpjbVZrYVhSZmJHbHVhMzFjSWo0a2UyTnlaV1JwZEgwOEwyRStQQzlrYVhZK1lEdGNibHgwWEc1Y2RHVnVkSEo1UkdWelkzSnBjSFJwYjI0dWFXNXpaWEowUVdScVlXTmxiblJJVkUxTUtDZGlaV1p2Y21WbGJtUW5MQ0JqYVhSaGRHbHZiaWs3WEc1OU8xeHVYRzVqYjI1emRDQnlaVzVrWlhKRmJuUnlhV1Z6SUQwZ0tDa2dQVDRnZTF4dVhIUmpiMjV6ZENCbGJuUnlhV1Z6VEdsemRDQTlJSE52Y25STFpYa2dQeUJsYm5SeWFXVnpMbUo1VkdsMGJHVWdPaUJsYm5SeWFXVnpMbUo1UVhWMGFHOXlPMXh1WEc1Y2RDUmhjblJwWTJ4bFRHbHpkQzVwYm01bGNraFVUVXdnUFNBbkp6dGNibHh1WEhSbGJuUnlhV1Z6VEdsemRDNW1iM0pGWVdOb0tDaGxiblJ5ZVN3Z2FTa2dQVDRnZTF4dVhIUmNkQ1JoY25ScFkyeGxUR2x6ZEM1cGJuTmxjblJCWkdwaFkyVnVkRWhVVFV3b0oySmxabTl5WldWdVpDY3NJR0Z5ZEdsamJHVlVaVzF3YkdGMFpTaGxiblJ5ZVN3Z2FTa3BPMXh1WEhSY2RHMWhhMlZUYkdsa1pYSW9aRzlqZFcxbGJuUXVaMlYwUld4bGJXVnVkRUo1U1dRb1lITnNhV1JsY2kwa2UybDlZQ2twTzF4dVhHNWNkRngwYVdZZ0tHVnVkSEo1TG1OeVpXUnBkQ2tnZTF4dVhIUmNkRngwYldGclpVTnBkR0YwYVc5dUtHVnVkSEo1TENCcEtUdGNibHgwWEhSOVhHNWNkSDBwTzF4dVhHNWNkR2xtSUNoM2FXNWtiM2N1YzJOeVpXVnVMbmRwWkhSb0lENGdOelk0S1NCaGRIUmhZMmhKYldGblpVeHBjM1JsYm1WeWN5Z3BPMXh1WEhSdFlXdGxRV3h3YUdGaVpYUW9jMjl5ZEV0bGVTazdYRzU5TzF4dVhHNWpiMjV6ZENCelpYUkVZWFJoUVc1a1UyOXlkRUo1VkdsMGJHVWdQU0FvWkdGMFlTa2dQVDRnZTF4dVhIUmxiblJ5YVdWekxtSjVRWFYwYUc5eUlEMGdaR0YwWVR0Y2JseDBaVzUwY21sbGN5NWllVlJwZEd4bElEMGdaR0YwWVM1emJHbGpaU2dwT3lBdkx5QmpiM0JwWlhNZ1pHRjBZU0JtYjNJZ1lubFVhWFJzWlNCemIzSjBYRzVjYmx4MFpXNTBjbWxsY3k1aWVWUnBkR3hsTG5OdmNuUW9LR0VzSUdJcElEMCtJSHRjYmx4MFhIUnNaWFFnWVZScGRHeGxJRDBnWVM1MGFYUnNaVnN3WFM1MGIxVndjR1Z5UTJGelpTZ3BPMXh1WEhSY2RHeGxkQ0JpVkdsMGJHVWdQU0JpTG5ScGRHeGxXekJkTG5SdlZYQndaWEpEWVhObEtDazdYRzVjZEZ4MGFXWWdLR0ZVYVhSc1pTQStJR0pVYVhSc1pTa2djbVYwZFhKdUlERTdYRzVjZEZ4MFpXeHpaU0JwWmlBb1lWUnBkR3hsSUR3Z1lsUnBkR3hsS1NCeVpYUjFjbTRnTFRFN1hHNWNkRngwWld4elpTQnlaWFIxY200Z01EdGNibHgwZlNrN1hHNTlPMXh1WEc1amIyNXpkQ0JtWlhSamFFUmhkR0VnUFNBb0tTQTlQaUI3WEc1Y2RHWmxkR05vS0VSQ0tTNTBhR1Z1S0hKbGN5QTlQaUJ5WlhNdWFuTnZiaWdwS1Z4dVhIUXVkR2hsYmloa1lYUmhJRDArSUh0Y2JseDBYSFJ6WlhSRVlYUmhRVzVrVTI5eWRFSjVWR2wwYkdVb1pHRjBZU2s3WEc1Y2RGeDBjbVZ1WkdWeVJXNTBjbWxsY3lncE8xeHVYSFJjZEdocFpHVk1iMkZrYVc1bktDazdYRzVjZEgwcFhHNWNkQzVqWVhSamFDaGxjbklnUFQ0Z1kyOXVjMjlzWlM1M1lYSnVLR1Z5Y2lrcE8xeHVmVHRjYmx4dVkyOXVjM1FnYVc1cGRDQTlJQ2dwSUQwK0lIdGNibHgwYzIxdmIzUm9jMk55YjJ4c0xuQnZiSGxtYVd4c0tDazdYRzVjZEdabGRHTm9SR0YwWVNncE8xeHVYSFJ5Wlc1a1pYSk9ZWFpNWnlncE8xeHVYSFJ6WlhSVmNGTnZjblJDZFhSMGIyNXpLQ2s3WEc1Y2RHRjBkR0ZqYUZWd1FYSnliM2RNYVhOMFpXNWxjbk1vS1R0Y2JseDBZWFIwWVdOb1RXOWtZV3hNYVhOMFpXNWxjbk1vS1R0Y2JuMDdYRzVjYm1sdWFYUW9LVHRjYmlJc0ltbHRjRzl5ZENCN0lDUjJhV1YzTENBa2JHbG5hSFJpYjNnZ2ZTQm1jbTl0SUNjdUxpOWpiMjV6ZEdGdWRITW5PMXh1WEc1c1pYUWdiR2xuYUhSaWIzZ2dQU0JtWVd4elpUdGNibXhsZENCNE1pQTlJR1poYkhObE8xeHViR1YwSUhacFpYZERiR0Z6Y3p0Y2JseHVZMjl1YzNRZ1lYUjBZV05vU1cxaFoyVk1hWE4wWlc1bGNuTWdQU0FvS1NBOVBpQjdYRzVjZEdOdmJuTjBJQ1JwYldGblpYTWdQU0JCY25KaGVTNW1jbTl0S0dSdlkzVnRaVzUwTG5GMVpYSjVVMlZzWldOMGIzSkJiR3dvSnk1aGNuUnBZMnhsTFdsdFlXZGxKeWtwTzF4dVhHNWNkQ1JwYldGblpYTXVabTl5UldGamFDaHBiV2NnUFQ0Z2UxeHVYSFJjZEdsdFp5NWhaR1JGZG1WdWRFeHBjM1JsYm1WeUtDZGpiR2xqYXljc0lDaGxkblFwSUQwK0lIdGNibHgwWEhSY2RHbG1JQ2doYkdsbmFIUmliM2dwSUh0Y2JseDBYSFJjZEZ4MEpHeHBaMmgwWW05NExtTnNZWE56VEdsemRDNWhaR1FvSjNOb2IzY3RhVzFuSnlrN1hHNWNkRngwWEhSY2RDUjJhV1YzTG5OeVl5QTlJR2x0Wnk1emNtTTdYRzVjZEZ4MFhIUmNkR3hwWjJoMFltOTRJRDBnZEhKMVpUdGNibHgwWEhSY2RIMWNibHgwWEhSOUtUdGNibHgwZlNrN1hHNWNibHgwSkd4cFoyaDBZbTk0TG1Ga1pFVjJaVzUwVEdsemRHVnVaWElvSjJOc2FXTnJKeXdnS0dWMmRDa2dQVDRnZTF4dVhIUmNkR2xtSUNobGRuUXVkR0Z5WjJWMElEMDlQU0FrZG1sbGR5a2djbVYwZFhKdU8xeHVYSFJjZENSc2FXZG9kR0p2ZUM1amJHRnpjMHhwYzNRdWNtVnRiM1psS0NkemFHOTNMV2x0WnljcE8xeHVYSFJjZEd4cFoyaDBZbTk0SUQwZ1ptRnNjMlU3WEc1Y2RIMHBPMXh1WEc1Y2RDUjJhV1YzTG1Ga1pFVjJaVzUwVEdsemRHVnVaWElvSjJOc2FXTnJKeXdnS0NrZ1BUNGdlMXh1WEhSY2RHbG1JQ2doZURJcElIdGNibHgwWEhSY2RIWnBaWGREYkdGemN5QTlJQ1IyYVdWM0xuZHBaSFJvSUR3Z2QybHVaRzkzTG1sdWJtVnlWMmxrZEdnZ1B5QW5kbWxsZHkxNE1pMHRjMjBuSURvZ0ozWnBaWGN0ZURJbk8xeHVYSFJjZEZ4MEpIWnBaWGN1WTJ4aGMzTk1hWE4wTG1Ga1pDaDJhV1YzUTJ4aGMzTXBPMXh1WEhSY2RGeDBjMlYwVkdsdFpXOTFkQ2dvS1NBOVBpQjRNaUE5SUhSeWRXVXNJRE13TUNrN1hHNWNkRngwZlNCbGJITmxJSHRjYmx4MFhIUmNkQ1IyYVdWM0xtTnNZWE56VEdsemRDNXlaVzF2ZG1Vb2RtbGxkME5zWVhOektUdGNibHgwWEhSY2RDUnNhV2RvZEdKdmVDNWpiR0Z6YzB4cGMzUXVjbVZ0YjNabEtDZHphRzkzTFdsdFp5Y3BPMXh1WEhSY2RGeDBlRElnUFNCbVlXeHpaVHRjYmx4MFhIUmNkR3hwWjJoMFltOTRJRDBnWm1Gc2MyVTdYRzVjZEZ4MGZWeHVYSFI5S1R0Y2JuMDdYRzVjYm1WNGNHOXlkQ0JrWldaaGRXeDBJR0YwZEdGamFFbHRZV2RsVEdsemRHVnVaWEp6T3lJc0ltbHRjRzl5ZENCN0lDUnRiMlJoYkNCOUlHWnliMjBnSnk0dUwyTnZibk4wWVc1MGN5YzdYRzVjYm14bGRDQnRiMlJoYkNBOUlHWmhiSE5sTzF4dVkyOXVjM1FnWVhSMFlXTm9UVzlrWVd4TWFYTjBaVzVsY25NZ1BTQW9LU0E5UGlCN1hHNWNkR052Ym5OMElDUm1hVzVrSUQwZ1pHOWpkVzFsYm5RdVoyVjBSV3hsYldWdWRFSjVTV1FvSjJwekxXWnBibVFuS1R0Y2JseDBYRzVjZENSbWFXNWtMbUZrWkVWMlpXNTBUR2x6ZEdWdVpYSW9KMk5zYVdOckp5d2dLQ2tnUFQ0Z2UxeHVYSFJjZENSdGIyUmhiQzVqYkdGemMweHBjM1F1WVdSa0tDZHphRzkzSnlrN1hHNWNkRngwYlc5a1lXd2dQU0IwY25WbE8xeHVYSFI5S1R0Y2JseHVYSFFrYlc5a1lXd3VZV1JrUlhabGJuUk1hWE4wWlc1bGNpZ25ZMnhwWTJzbkxDQW9LU0E5UGlCN1hHNWNkRngwSkcxdlpHRnNMbU5zWVhOelRHbHpkQzV5WlcxdmRtVW9KM05vYjNjbktUdGNibHgwWEhSdGIyUmhiQ0E5SUdaaGJITmxPMXh1WEhSOUtUdGNibHh1WEhSM2FXNWtiM2N1WVdSa1JYWmxiblJNYVhOMFpXNWxjaWduYTJWNVpHOTNiaWNzSUNncElEMCtJSHRjYmx4MFhIUnBaaUFvYlc5a1lXd3BJSHRjYmx4MFhIUmNkSE5sZEZScGJXVnZkWFFvS0NrZ1BUNGdlMXh1WEhSY2RGeDBYSFFrYlc5a1lXd3VZMnhoYzNOTWFYTjBMbkpsYlc5MlpTZ25jMmh2ZHljcE8xeHVYSFJjZEZ4MFhIUnRiMlJoYkNBOUlHWmhiSE5sTzF4dVhIUmNkRngwZlN3Z05qQXdLVHRjYmx4MFhIUjlPMXh1WEhSOUtUdGNibjA3WEc1Y2JtVjRjRzl5ZENCa1pXWmhkV3gwSUdGMGRHRmphRTF2WkdGc1RHbHpkR1Z1WlhKek95SXNJbWx0Y0c5eWRDQjdJQ1IwYVhSc1pTd2dKSEJoY21Gc2JHRjRMQ0FrZFhCQmNuSnZkeUI5SUdaeWIyMGdKeTR1TDJOdmJuTjBZVzUwY3ljN1hHNXBiWEJ2Y25RZ2V5QnpZM0p2Ykd4VWIxUnZjQ0I5SUdaeWIyMGdKeTR1TDNWMGFXeHpKenRjYmx4dWJHVjBJSEJ5WlhZN1hHNXNaWFFnWTNWeWNtVnVkQ0E5SURBN1hHNXNaWFFnYVhOVGFHOTNhVzVuSUQwZ1ptRnNjMlU3WEc1Y2JtTnZibk4wSUdGMGRHRmphRlZ3UVhKeWIzZE1hWE4wWlc1bGNuTWdQU0FvS1NBOVBpQjdYRzVjZENSd1lYSmhiR3hoZUM1aFpHUkZkbVZ1ZEV4cGMzUmxibVZ5S0NkelkzSnZiR3duTENBb0tTQTlQaUI3WEc1Y2RGeDBiR1YwSUhrZ1BTQWtkR2wwYkdVdVoyVjBRbTkxYm1ScGJtZERiR2xsYm5SU1pXTjBLQ2t1ZVR0Y2JseHVYSFJjZEdsbUlDaGpkWEp5Wlc1MElDRTlQU0I1S1NCN1hHNWNkRngwWEhSd2NtVjJJRDBnWTNWeWNtVnVkRHRjYmx4MFhIUmNkR04xY25KbGJuUWdQU0I1TzF4dVhIUmNkSDA3WEc1Y2JseDBYSFJwWmlBb2VTQThQU0F0TlRBZ0ppWWdJV2x6VTJodmQybHVaeWtnZTF4dVhIUmNkRngwSkhWd1FYSnliM2N1WTJ4aGMzTk1hWE4wTG1Ga1pDZ25jMmh2ZHljcE8xeHVYSFJjZEZ4MGFYTlRhRzkzYVc1bklEMGdkSEoxWlR0Y2JseDBYSFI5SUdWc2MyVWdhV1lnS0hrZ1BpQXROVEFnSmlZZ2FYTlRhRzkzYVc1bktTQjdYRzVjZEZ4MFhIUWtkWEJCY25KdmR5NWpiR0Z6YzB4cGMzUXVjbVZ0YjNabEtDZHphRzkzSnlrN1hHNWNkRngwWEhScGMxTm9iM2RwYm1jZ1BTQm1ZV3h6WlR0Y2JseDBYSFI5WEc1Y2RIMHBPMXh1WEc1Y2RDUjFjRUZ5Y205M0xtRmtaRVYyWlc1MFRHbHpkR1Z1WlhJb0oyTnNhV05ySnl3Z0tDa2dQVDRnYzJOeWIyeHNWRzlVYjNBb0tTazdYRzU5TzF4dVhHNWxlSEJ2Y25RZ1pHVm1ZWFZzZENCaGRIUmhZMmhWY0VGeWNtOTNUR2x6ZEdWdVpYSnpPeUlzSW1sdGNHOXlkQ0JoZEhSaFkyaE5iMlJoYkV4cGMzUmxibVZ5Y3lCbWNtOXRJQ2N1TDJGMGRHRmphRTF2WkdGc1RHbHpkR1Z1WlhKekp6dGNibWx0Y0c5eWRDQmhkSFJoWTJoVmNFRnljbTkzVEdsemRHVnVaWEp6SUdaeWIyMGdKeTR2WVhSMFlXTm9WWEJCY25KdmQweHBjM1JsYm1WeWN5YzdYRzVwYlhCdmNuUWdZWFIwWVdOb1NXMWhaMlZNYVhOMFpXNWxjbk1nWm5KdmJTQW5MaTloZEhSaFkyaEpiV0ZuWlV4cGMzUmxibVZ5Y3ljN1hHNXBiWEJ2Y25RZ2JXRnJaVUZzY0doaFltVjBJR1p5YjIwZ0p5NHZiV0ZyWlVGc2NHaGhZbVYwSnp0Y2JtbHRjRzl5ZENCdFlXdGxVMnhwWkdWeUlHWnliMjBnSnk0dmJXRnJaVk5zYVdSbGNpYzdYRzVjYm1WNGNHOXlkQ0I3SUZ4dVhIUmhkSFJoWTJoTmIyUmhiRXhwYzNSbGJtVnljeXdnWEc1Y2RHRjBkR0ZqYUZWd1FYSnliM2RNYVhOMFpXNWxjbk1zWEc1Y2RHRjBkR0ZqYUVsdFlXZGxUR2x6ZEdWdVpYSnpMRnh1WEhSdFlXdGxRV3h3YUdGaVpYUXNJRnh1WEhSdFlXdGxVMnhwWkdWeUlGeHVmVHNpTENKamIyNXpkQ0JoYkhCb1lXSmxkQ0E5SUZzbllTY3NJQ2RpSnl3Z0oyTW5MQ0FuWkNjc0lDZGxKeXdnSjJZbkxDQW5aeWNzSUNkb0p5d2dKMmtuTENBbmFpY3NJQ2RySnl3Z0oyd25MQ0FuYlNjc0lDZHVKeXdnSjI4bkxDQW5jQ2NzSUNkeUp5d2dKM01uTENBbmRDY3NJQ2QxSnl3Z0ozWW5MQ0FuZHljc0lDZDVKeXdnSjNvblhUdGNibHh1WTI5dWMzUWdiV0ZyWlVGc2NHaGhZbVYwSUQwZ0tITnZjblJMWlhrcElEMCtJSHRjYmx4MFkyOXVjM1FnWm1sdVpFWnBjbk4wUlc1MGNua2dQU0FvWTJoaGNpa2dQVDRnZTF4dVhIUmNkR052Ym5OMElITmxiR1ZqZEc5eUlEMGdjMjl5ZEV0bGVTQS9JQ2N1YW5NdFpXNTBjbmt0ZEdsMGJHVW5JRG9nSnk1cWN5MWxiblJ5ZVMxaGNuUnBjM1FuTzF4dVhIUmNkR052Ym5OMElIQnlaWFpUWld4bFkzUnZjaUE5SUNGemIzSjBTMlY1SUQ4Z0p5NXFjeTFsYm5SeWVTMTBhWFJzWlNjZ09pQW5MbXB6TFdWdWRISjVMV0Z5ZEdsemRDYzdYRzVjYmx4MFhIUmpiMjV6ZENBa1pXNTBjbWxsY3lBOUlFRnljbUY1TG1aeWIyMG9aRzlqZFcxbGJuUXVjWFZsY25sVFpXeGxZM1J2Y2tGc2JDaHpaV3hsWTNSdmNpa3BPMXh1WEhSY2RHTnZibk4wSUNSd2NtVjJSVzUwY21sbGN5QTlJRUZ5Y21GNUxtWnliMjBvWkc5amRXMWxiblF1Y1hWbGNubFRaV3hsWTNSdmNrRnNiQ2h3Y21WMlUyVnNaV04wYjNJcEtUdGNibHh1WEhSY2RDUndjbVYyUlc1MGNtbGxjeTVtYjNKRllXTm9LR1Z1ZEhKNUlEMCtJR1Z1ZEhKNUxuSmxiVzkyWlVGMGRISnBZblYwWlNnbmJtRnRaU2NwS1R0Y2JseHVYSFJjZEhKbGRIVnliaUFrWlc1MGNtbGxjeTVtYVc1a0tHVnVkSEo1SUQwK0lIdGNibHgwWEhSY2RHeGxkQ0J1YjJSbElEMGdaVzUwY25rdWJtVjRkRVZzWlcxbGJuUlRhV0pzYVc1bk8xeHVYSFJjZEZ4MGNtVjBkWEp1SUc1dlpHVXVhVzV1WlhKSVZFMU1XekJkSUQwOVBTQmphR0Z5SUh4OElHNXZaR1V1YVc1dVpYSklWRTFNV3pCZElEMDlQU0JqYUdGeUxuUnZWWEJ3WlhKRFlYTmxLQ2s3WEc1Y2RGeDBmU2s3WEc1Y2RIMDdYRzVjYmx4MFkyOXVjM1FnWVhSMFlXTm9RVzVqYUc5eVRHbHpkR1Z1WlhJZ1BTQW9KR0Z1WTJodmNpd2diR1YwZEdWeUtTQTlQaUI3WEc1Y2RGeDBKR0Z1WTJodmNpNWhaR1JGZG1WdWRFeHBjM1JsYm1WeUtDZGpiR2xqYXljc0lDZ3BJRDArSUh0Y2JseDBYSFJjZEdOdmJuTjBJR3hsZEhSbGNrNXZaR1VnUFNCa2IyTjFiV1Z1ZEM1blpYUkZiR1Z0Wlc1MFFubEpaQ2hzWlhSMFpYSXBPMXh1WEhSY2RGeDBiR1YwSUhSaGNtZGxkRHRjYmx4dVhIUmNkRngwYVdZZ0tDRnpiM0owUzJWNUtTQjdYRzVjZEZ4MFhIUmNkSFJoY21kbGRDQTlJR3hsZEhSbGNpQTlQVDBnSjJFbklEOGdaRzlqZFcxbGJuUXVaMlYwUld4bGJXVnVkRUo1U1dRb0oyRnVZMmh2Y2kxMFlYSm5aWFFuS1NBNklHeGxkSFJsY2s1dlpHVXVjR0Z5Wlc1MFJXeGxiV1Z1ZEM1d1lYSmxiblJGYkdWdFpXNTBMbkJoY21WdWRFVnNaVzFsYm5RdWNHRnlaVzUwUld4bGJXVnVkQzV3Y21WMmFXOTFjMFZzWlcxbGJuUlRhV0pzYVc1bkxuRjFaWEo1VTJWc1pXTjBiM0lvSnk1cWN5MWhjblJwWTJ4bExXRnVZMmh2Y2kxMFlYSm5aWFFuS1R0Y2JseDBYSFJjZEgwZ1pXeHpaU0I3WEc1Y2RGeDBYSFJjZEhSaGNtZGxkQ0E5SUd4bGRIUmxjaUE5UFQwZ0oyRW5JRDhnWkc5amRXMWxiblF1WjJWMFJXeGxiV1Z1ZEVKNVNXUW9KMkZ1WTJodmNpMTBZWEpuWlhRbktTQTZJR3hsZEhSbGNrNXZaR1V1Y0dGeVpXNTBSV3hsYldWdWRDNXdZWEpsYm5SRmJHVnRaVzUwTG5CaGNtVnVkRVZzWlcxbGJuUXVjSEpsZG1sdmRYTkZiR1Z0Wlc1MFUybGliR2x1Wnk1eGRXVnllVk5sYkdWamRHOXlLQ2N1YW5NdFlYSjBhV05zWlMxaGJtTm9iM0l0ZEdGeVoyVjBKeWs3WEc1Y2RGeDBYSFI5TzF4dVhHNWNkRngwWEhSMFlYSm5aWFF1YzJOeWIyeHNTVzUwYjFacFpYY29lMkpsYUdGMmFXOXlPaUJjSW5OdGIyOTBhRndpTENCaWJHOWphem9nWENKemRHRnlkRndpZlNrN1hHNWNkRngwZlNrN1hHNWNkSDA3WEc1Y2JseDBiR1YwSUdGamRHbDJaVVZ1ZEhKcFpYTWdQU0I3ZlR0Y2JseDBiR1YwSUNSdmRYUmxjaUE5SUdSdlkzVnRaVzUwTG5GMVpYSjVVMlZzWldOMGIzSW9KeTVoYkhCb1lXSmxkRjlmYkdWMGRHVnljeWNwTzF4dVhIUWtiM1YwWlhJdWFXNXVaWEpJVkUxTUlEMGdKeWM3WEc1Y2JseDBZV3h3YUdGaVpYUXVabTl5UldGamFDaHNaWFIwWlhJZ1BUNGdlMXh1WEhSY2RHeGxkQ0FrWm1seWMzUkZiblJ5ZVNBOUlHWnBibVJHYVhKemRFVnVkSEo1S0d4bGRIUmxjaWs3WEc1Y2RGeDBiR1YwSUNSaGJtTm9iM0lnUFNCa2IyTjFiV1Z1ZEM1amNtVmhkR1ZGYkdWdFpXNTBLQ2RoSnlrN1hHNWNibHgwWEhScFppQW9JU1JtYVhKemRFVnVkSEo1S1NCeVpYUjFjbTQ3WEc1Y2JseDBYSFFrWm1seWMzUkZiblJ5ZVM1cFpDQTlJR3hsZEhSbGNqdGNibHgwWEhRa1lXNWphRzl5TG1sdWJtVnlTRlJOVENBOUlHeGxkSFJsY2k1MGIxVndjR1Z5UTJGelpTZ3BPMXh1WEhSY2RDUmhibU5vYjNJdVkyeGhjM05PWVcxbElEMGdKMkZzY0doaFltVjBYMTlzWlhSMFpYSXRZVzVqYUc5eUp6dGNibHh1WEhSY2RHRjBkR0ZqYUVGdVkyaHZja3hwYzNSbGJtVnlLQ1JoYm1Ob2IzSXNJR3hsZEhSbGNpazdYRzVjZEZ4MEpHOTFkR1Z5TG1Gd2NHVnVaRU5vYVd4a0tDUmhibU5vYjNJcE8xeHVYSFI5S1R0Y2JuMDdYRzVjYm1WNGNHOXlkQ0JrWldaaGRXeDBJRzFoYTJWQmJIQm9ZV0psZERzaUxDSmpiMjV6ZENCdFlXdGxVMnhwWkdWeUlEMGdLQ1J6Ykdsa1pYSXBJRDArSUh0Y2JseDBZMjl1YzNRZ0pHRnljbTkzVG1WNGRDQTlJQ1J6Ykdsa1pYSXVjR0Z5Wlc1MFJXeGxiV1Z1ZEM1eGRXVnllVk5sYkdWamRHOXlLQ2N1WVhKeWIzY3RibVY0ZENjcE8xeHVYSFJqYjI1emRDQWtZWEp5YjNkUWNtVjJJRDBnSkhOc2FXUmxjaTV3WVhKbGJuUkZiR1Z0Wlc1MExuRjFaWEo1VTJWc1pXTjBiM0lvSnk1aGNuSnZkeTF3Y21WMkp5azdYRzVjYmx4MGJHVjBJR04xY25KbGJuUWdQU0FrYzJ4cFpHVnlMbVpwY25OMFJXeGxiV1Z1ZEVOb2FXeGtPMXh1WEhRa1lYSnliM2RPWlhoMExtRmtaRVYyWlc1MFRHbHpkR1Z1WlhJb0oyTnNhV05ySnl3Z0tDa2dQVDRnZTF4dVhIUmNkR052Ym5OMElHNWxlSFFnUFNCamRYSnlaVzUwTG01bGVIUkZiR1Z0Wlc1MFUybGliR2x1Wnp0Y2JseDBYSFJwWmlBb2JtVjRkQ2tnZTF4dVhIUmNkRngwYm1WNGRDNXpZM0p2Ykd4SmJuUnZWbWxsZHloN1ltVm9ZWFpwYjNJNklGd2ljMjF2YjNSb1hDSXNJR0pzYjJOck9pQmNJbTVsWVhKbGMzUmNJaXdnYVc1c2FXNWxPaUJjSW1ObGJuUmxjbHdpZlNrN1hHNWNkRngwWEhSamRYSnlaVzUwSUQwZ2JtVjRkRHRjYmx4MFhIUjlYRzVjZEgwcE8xeHVYRzVjZENSaGNuSnZkMUJ5WlhZdVlXUmtSWFpsYm5STWFYTjBaVzVsY2lnblkyeHBZMnNuTENBb0tTQTlQaUI3WEc1Y2RGeDBZMjl1YzNRZ2NISmxkaUE5SUdOMWNuSmxiblF1Y0hKbGRtbHZkWE5GYkdWdFpXNTBVMmxpYkdsdVp6dGNibHgwWEhScFppQW9jSEpsZGlrZ2UxeHVYSFJjZEZ4MGNISmxkaTV6WTNKdmJHeEpiblJ2Vm1sbGR5aDdZbVZvWVhacGIzSTZJRndpYzIxdmIzUm9YQ0lzSUdKc2IyTnJPaUJjSW01bFlYSmxjM1JjSWl3Z2FXNXNhVzVsT2lCY0ltTmxiblJsY2x3aWZTazdYRzVjZEZ4MFhIUmpkWEp5Wlc1MElEMGdjSEpsZGp0Y2JseDBYSFI5WEc1Y2RIMHBYRzU5TzF4dVhHNWxlSEJ2Y25RZ1pHVm1ZWFZzZENCdFlXdGxVMnhwWkdWeU95SXNJbU52Ym5OMElHbHRZV2RsVkdWdGNHeGhkR1VnUFNBb2FXMWhaMlVwSUQwK0lHQmNianhrYVhZZ1kyeGhjM005WENKaGNuUnBZMnhsTFdsdFlXZGxYMTl2ZFhSbGNsd2lQbHh1WEhROGFXMW5JR05zWVhOelBWd2lZWEowYVdOc1pTMXBiV0ZuWlZ3aUlITnlZejFjSWk0dUx5NHVMMkZ6YzJWMGN5OXBiV0ZuWlhNdkpIdHBiV0ZuWlgxY0lqNDhMMmx0Wno1Y2Jqd3ZaR2wyUGx4dVlEdGNibHh1WTI5dWMzUWdZWEowYVdOc1pWUmxiWEJzWVhSbElEMGdLR1Z1ZEhKNUxDQnBLU0E5UGlCN1hHNWNkR052Ym5OMElIc2dkR2wwYkdVc0lHWnBjbk4wVG1GdFpTd2diR0Z6ZEU1aGJXVXNJR2x0WVdkbGN5d2daR1Z6WTNKcGNIUnBiMjRzSUdOdmJuUmxiblJ6TENCa2FXMWxibk5wYjI1ekxDQjVaV0Z5TENCcGMySnVMQ0J2WTJ4akxDQnNhVzVySUgwZ1BTQmxiblJ5ZVR0Y2JseHVYSFJqYjI1emRDQnBiV0ZuWlVoVVRVd2dQU0JwYldGblpYTXViR1Z1WjNSb0lEOGdYRzVjZEZ4MGFXMWhaMlZ6TG0xaGNDaHBiV0ZuWlNBOVBpQnBiV0ZuWlZSbGJYQnNZWFJsS0dsdFlXZGxLU2t1YW05cGJpZ25KeWtnT2lBbkp6dGNibHh1WEhSeVpYUjFjbTRnWUZ4dVhIUmNkRHhoY25ScFkyeGxJR05zWVhOelBWd2lZWEowYVdOc1pWOWZiM1YwWlhKY0lqNWNibHgwWEhSY2REeGthWFlnWTJ4aGMzTTlYQ0poY25ScFkyeGxYMTlwYm01bGNsd2lQbHh1WEhSY2RGeDBYSFE4WkdsMklHTnNZWE56UFZ3aVlYSjBhV05zWlY5ZmFHVmhaR2x1WjF3aVBseHVYSFJjZEZ4MFhIUmNkRHhoSUdOc1lYTnpQVndpYW5NdFpXNTBjbmt0ZEdsMGJHVmNJajQ4TDJFK1hHNWNkRngwWEhSY2RGeDBQR2d5SUdOc1lYTnpQVndpWVhKMGFXTnNaUzFvWldGa2FXNW5YMTkwYVhSc1pWd2lQaVI3ZEdsMGJHVjlQQzlvTWo1Y2JseDBYSFJjZEZ4MFhIUThaR2wySUdOc1lYTnpQVndpWVhKMGFXTnNaUzFvWldGa2FXNW5YMTl1WVcxbFhDSStYRzVjZEZ4MFhIUmNkRngwWEhROGMzQmhiaUJqYkdGemN6MWNJbUZ5ZEdsamJHVXRhR1ZoWkdsdVoxOWZibUZ0WlMwdFptbHljM1JjSWo0a2UyWnBjbk4wVG1GdFpYMDhMM053WVc0K1hHNWNkRngwWEhSY2RGeDBYSFE4WVNCamJHRnpjejFjSW1wekxXVnVkSEo1TFdGeWRHbHpkRndpUGp3dllUNWNibHgwWEhSY2RGeDBYSFJjZER4emNHRnVJR05zWVhOelBWd2lZWEowYVdOc1pTMW9aV0ZrYVc1blgxOXVZVzFsTFMxc1lYTjBYQ0krSkh0c1lYTjBUbUZ0WlgwOEwzTndZVzQrWEc1Y2RGeDBYSFJjZEZ4MFBDOWthWFkrWEc1Y2RGeDBYSFJjZER3dlpHbDJQbHgwWEc1Y2RGeDBYSFJjZER4a2FYWWdZMnhoYzNNOVhDSmhjblJwWTJ4bFgxOXpiR2xrWlhJdGIzVjBaWEpjSWo1Y2JseDBYSFJjZEZ4MFhIUThaR2wySUdOc1lYTnpQVndpWVhKMGFXTnNaVjlmYzJ4cFpHVnlMV2x1Ym1WeVhDSWdhV1E5WENKemJHbGtaWEl0Skh0cGZWd2lQbHh1WEhSY2RGeDBYSFJjZEZ4MEpIdHBiV0ZuWlVoVVRVeDlYRzVjZEZ4MFhIUmNkRngwWEhROFpHbDJJR05zWVhOelBWd2lZWEowYVdOc1pTMWtaWE5qY21sd2RHbHZibDlmYjNWMFpYSmNJajVjYmx4MFhIUmNkRngwWEhSY2RGeDBQR1JwZGlCamJHRnpjejFjSW1GeWRHbGpiR1V0WkdWelkzSnBjSFJwYjI1Y0lqNGtlMlJsYzJOeWFYQjBhVzl1ZlR3dlpHbDJQbHh1WEhSY2RGeDBYSFJjZEZ4MFhIUThaR2wySUdOc1lYTnpQVndpWVhKMGFXTnNaUzFrWlhSaGFXeGNJajRrZTJOdmJuUmxiblJ6ZlR3dlpHbDJQbHh1WEhSY2RGeDBYSFJjZEZ4MFhIUThaR2wySUdOc1lYTnpQVndpWVhKMGFXTnNaUzFrWlhSaGFXd2dZWEowYVdOc1pTMWtaWFJoYVd3dExXMWhjbWRwYmx3aVBpUjdaR2x0Wlc1emFXOXVjMzA4TDJScGRqNWNibHgwWEhSY2RGeDBYSFJjZEZ4MFBHUnBkaUJqYkdGemN6MWNJbUZ5ZEdsamJHVXRaR1YwWVdsc0lHRnlkR2xqYkdVdFpHVjBZV2xzTFMxdFlYSm5hVzVjSWo0a2UzbGxZWEo5UEM5a2FYWStYRzVjZEZ4MFhIUmNkRngwWEhSY2REeGthWFlnWTJ4aGMzTTlYQ0poY25ScFkyeGxMV1JsZEdGcGJDQmhjblJwWTJ4bExXUmxkR0ZwYkMwdGJXRnlaMmx1WENJK0pIdHBjMkp1ZlR3dlpHbDJQbHh1WEhSY2RGeDBYSFJjZEZ4MFhIUThaR2wySUdOc1lYTnpQVndpWVhKMGFXTnNaUzFrWlhSaGFXeGNJajVQUTB4RElEeGhJR05zWVhOelBWd2lZWEowYVdOc1pTMWtaWFJoYVd3dExXeHBibXRjSWlCMFlYSm5aWFE5WENKZllteGhibXRjSWlCb2NtVm1QVndpSkh0c2FXNXJmVndpUGlSN2IyTnNZMzA4TDJFK1BDOWthWFkrWEc1Y2RGeDBYSFJjZEZ4MFhIUThMMlJwZGo1Y2JseDBYSFJjZEZ4MFhIUThMMlJwZGo1Y2JseDBYSFJjZEZ4MFhIUThaR2wySUdOc1lYTnpQVndpWVhKMGFXTnNaVjlmYzJOeWIyeHNMV052Ym5SeWIyeHpYQ0krWEc1Y2RGeDBYSFJjZEZ4MFhIUThjM0JoYmlCamJHRnpjejFjSW1OdmJuUnliMnh6SUdGeWNtOTNMWEJ5WlhaY0lqN2locEE4TDNOd1lXNCtJRnh1WEhSY2RGeDBYSFJjZEZ4MFBITndZVzRnWTJ4aGMzTTlYQ0pqYjI1MGNtOXNjeUJoY25KdmR5MXVaWGgwWENJKzRvYVNQQzl6Y0dGdVBseHVYSFJjZEZ4MFhIUmNkRHd2WkdsMlBseHVYSFJjZEZ4MFhIUmNkRHh3SUdOc1lYTnpQVndpYW5NdFlYSjBhV05zWlMxaGJtTm9iM0l0ZEdGeVoyVjBYQ0krUEM5d1BseHVYSFJjZEZ4MFBDOWthWFkrWEc1Y2RGeDBQQzloY25ScFkyeGxQbHh1WEhSZ08xeHVmVHRjYmx4dVpYaHdiM0owSUdSbFptRjFiSFFnWVhKMGFXTnNaVlJsYlhCc1lYUmxPeUlzSW1sdGNHOXlkQ0JoY25ScFkyeGxWR1Z0Y0d4aGRHVWdabkp2YlNBbkxpOWhjblJwWTJ4bEp6dGNibWx0Y0c5eWRDQnlaVzVrWlhKT1lYWk1aeUJtY205dElDY3VMMjVoZGt4bkp6dGNibHh1Wlhod2IzSjBJSHNnWVhKMGFXTnNaVlJsYlhCc1lYUmxMQ0J5Wlc1a1pYSk9ZWFpNWnlCOU95SXNJbU52Ym5OMElIUmxiWEJzWVhSbElEMGdYRzVjZEdBOFpHbDJJR05zWVhOelBWd2libUYyWDE5cGJtNWxjbHdpUGx4dVhIUmNkRHhrYVhZZ1kyeGhjM005WENKdVlYWmZYM052Y25RdFlubGNJajVjYmx4MFhIUmNkRHh6Y0dGdUlHTnNZWE56UFZ3aWMyOXlkQzFpZVY5ZmRHbDBiR1ZjSWo1VGIzSjBJR0o1UEM5emNHRnVQbHh1WEhSY2RGeDBQR0oxZEhSdmJpQmpiR0Z6Y3oxY0luTnZjblF0WW5rZ2MyOXlkQzFpZVY5Zllua3RZWEowYVhOMElHRmpkR2wyWlZ3aUlHbGtQVndpYW5NdFlua3RZWEowYVhOMFhDSStRWEowYVhOMFBDOWlkWFIwYjI0K1hHNWNkRngwWEhROGMzQmhiaUJqYkdGemN6MWNJbk52Y25RdFlubGZYMlJwZG1sa1pYSmNJajRnZkNBOEwzTndZVzQrWEc1Y2RGeDBYSFE4WW5WMGRHOXVJR05zWVhOelBWd2ljMjl5ZEMxaWVTQnpiM0owTFdKNVgxOWllUzEwYVhSc1pWd2lJR2xrUFZ3aWFuTXRZbmt0ZEdsMGJHVmNJajVVYVhSc1pUd3ZZblYwZEc5dVBseHVYSFJjZEZ4MFBITndZVzRnWTJ4aGMzTTlYQ0ptYVc1a1hDSWdhV1E5WENKcWN5MW1hVzVrWENJK1hHNWNkRngwWEhSY2RDZzhjM0JoYmlCamJHRnpjejFjSW1acGJtUXRMV2x1Ym1WeVhDSStKaU00T1RnME8wWThMM053WVc0K0tWeHVYSFJjZEZ4MFBDOXpjR0Z1UGx4dVhIUmNkRHd2WkdsMlBseHVYSFJjZER4a2FYWWdZMnhoYzNNOVhDSnVZWFpmWDJGc2NHaGhZbVYwWENJK1hHNWNkRngwWEhROGMzQmhiaUJqYkdGemN6MWNJbUZzY0doaFltVjBYMTkwYVhSc1pWd2lQa2R2SUhSdlBDOXpjR0Z1UGx4dVhIUmNkRngwUEdScGRpQmpiR0Z6Y3oxY0ltRnNjR2hoWW1WMFgxOXNaWFIwWlhKelhDSStQQzlrYVhZK1hHNWNkRngwUEM5a2FYWStYRzVjZER3dlpHbDJQbUE3WEc1Y2JtTnZibk4wSUhKbGJtUmxjazVoZGt4bklEMGdLQ2tnUFQ0Z2UxeHVYSFJzWlhRZ2JtRjJUM1YwWlhJZ1BTQmtiMk4xYldWdWRDNW5aWFJGYkdWdFpXNTBRbmxKWkNnbmFuTXRibUYySnlrN1hHNWNkRzVoZGs5MWRHVnlMbWx1Ym1WeVNGUk5UQ0E5SUhSbGJYQnNZWFJsTzF4dWZUdGNibHh1Wlhod2IzSjBJR1JsWm1GMWJIUWdjbVZ1WkdWeVRtRjJUR2M3SWl3aWFXMXdiM0owSUhzZ0pHeHZZV1JwYm1jc0lDUnVZWFlzSUNSd1lYSmhiR3hoZUN3Z0pHTnZiblJsYm5Rc0lDUjBhWFJzWlN3Z0pHRnljbTkzTENBa2JXOWtZV3dzSUNSc2FXZG9kR0p2ZUN3Z0pIWnBaWGNnZlNCbWNtOXRJQ2N1TGk5amIyNXpkR0Z1ZEhNbk8xeHVYRzVqYjI1emRDQmtaV0p2ZFc1alpTQTlJQ2htYml3Z2RHbHRaU2tnUFQ0Z2UxeHVJQ0JzWlhRZ2RHbHRaVzkxZER0Y2JseHVJQ0J5WlhSMWNtNGdablZ1WTNScGIyNG9LU0I3WEc0Z0lDQWdZMjl1YzNRZ1puVnVZM1JwYjI1RFlXeHNJRDBnS0NrZ1BUNGdabTR1WVhCd2JIa29kR2hwY3l3Z1lYSm5kVzFsYm5SektUdGNiaUFnSUNCY2JpQWdJQ0JqYkdWaGNsUnBiV1Z2ZFhRb2RHbHRaVzkxZENrN1hHNGdJQ0FnZEdsdFpXOTFkQ0E5SUhObGRGUnBiV1Z2ZFhRb1puVnVZM1JwYjI1RFlXeHNMQ0IwYVcxbEtUdGNiaUFnZlZ4dWZUdGNibHh1WTI5dWMzUWdhR2xrWlV4dllXUnBibWNnUFNBb0tTQTlQaUI3WEc1Y2RDUnNiMkZrYVc1bkxtWnZja1ZoWTJnb1pXeGxiU0E5UGlCbGJHVnRMbU5zWVhOelRHbHpkQzVoWkdRb0ozSmxZV1I1SnlrcE8xeHVYSFFrYm1GMkxtTnNZWE56VEdsemRDNWhaR1FvSjNKbFlXUjVKeWs3WEc1OU8xeHVYRzVqYjI1emRDQnpZM0p2Ykd4VWIxUnZjQ0E5SUNncElEMCtJSHRjYmx4MGJHVjBJSFJ2Y0NBOUlHUnZZM1Z0Wlc1MExtZGxkRVZzWlcxbGJuUkNlVWxrS0NkaGJtTm9iM0l0ZEdGeVoyVjBKeWs3WEc1Y2RIUnZjQzV6WTNKdmJHeEpiblJ2Vm1sbGR5aDdZbVZvWVhacGIzSTZJRndpYzIxdmIzUm9YQ0lzSUdKc2IyTnJPaUJjSW5OMFlYSjBYQ0o5S1R0Y2JuMDdYRzVjYm1WNGNHOXlkQ0I3SUdSbFltOTFibU5sTENCb2FXUmxURzloWkdsdVp5d2djMk55YjJ4c1ZHOVViM0FnZlRzaVhYMD0ifQ==
