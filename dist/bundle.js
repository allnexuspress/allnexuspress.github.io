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
"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});
var articleTemplate = "\n\t<article class=\"article__outer\">\n\t\t<div class=\"article__inner\">\n\t\t\t<div class=\"article__heading\">\n\t\t\t\t<a class=\"js-entry-title\"></a>\n\t\t\t\t<h2 class=\"article-heading__title\"></h2>\n\t\t\t\t<div class=\"article-heading__name\">\n\t\t\t\t\t<span class=\"article-heading__name--first\"></span>\n\t\t\t\t\t<a class=\"js-entry-artist\"></a>\n\t\t\t\t\t<span class=\"article-heading__name--last\"></span>\n\t\t\t\t</div>\n\t\t\t</div>\t\n\t\t\t<div class=\"article__images-outer\">\n\t\t\t\t<div class=\"article__images-inner\"></div>\n\t\t\t\t<p class=\"js-article-anchor-target\"></p>\n\t\t</div>\n\t</article>\n";

exports.default = articleTemplate;

},{}],4:[function(require,module,exports){
'use strict';

require('whatwg-fetch');

var _smoothscrollPolyfill = require('smoothscroll-polyfill');

var _smoothscrollPolyfill2 = _interopRequireDefault(_smoothscrollPolyfill);

var _navLg = require('./nav-lg');

var _navLg2 = _interopRequireDefault(_navLg);

var _articleTemplate = require('./article-template');

var _articleTemplate2 = _interopRequireDefault(_articleTemplate);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var DB = 'https://nexus-catalog.firebaseio.com/posts.json?auth=7g7pyKKykN3N5ewrImhOaS6vwrFsc5fKkrk8ejzf';
var alphabet = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'r', 's', 't', 'u', 'v', 'w', 'y', 'z'];

var $loading = Array.from(document.querySelectorAll('.loading'));
var $nav = document.getElementById('js-nav');
var $parallax = document.querySelector('.parallax');
var $content = document.querySelector('.content');
var $title = document.getElementById('js-title');
var $arrow = document.querySelector('.arrow');
var $modal = document.querySelector('.modal');
var $lightbox = document.querySelector('.lightbox');
var $view = document.querySelector('.lightbox-view');

var sortKey = 0; // 0 = artist, 1 = title
var entries = { byAuthor: [], byTitle: [] };
var currentLetter = 'A';

var lightbox = false;
var x2 = false;
var attachImageListeners = function attachImageListeners() {
	var $images = Array.from(document.querySelectorAll('.article-image'));

	$images.forEach(function (img) {
		img.addEventListener('click', function (evt) {
			if (!lightbox) {
				var src = img.src;
				// let type = img.width >= img.height ? 'l' : 'p';

				$lightbox.classList.add('show-img');
				$view.setAttribute('style', 'background-image: url(' + src + ')');
				lightbox = true;
			}
		});
	});

	$view.addEventListener('click', function () {
		if (lightbox) {
			$lightbox.classList.remove('show-img');
			$lightbox.firstElementChild.classList.remove('view-x2');
			lightbox = false;
		}
	});
};

var modal = false;
var attachModalListeners = function attachModalListeners() {
	var $find = document.getElementById('js-find');

	$find.addEventListener('click', function () {
		$modal.classList.add('show');
		modal = true;
	});

	$modal.addEventListener('click', function () {
		setTimeout(function () {
			$modal.classList.remove('show');
			modal = false;
		}, 500);
	});

	window.addEventListener('keydown', function () {
		if (modal) {
			setTimeout(function () {
				$modal.classList.remove('show');
				modal = false;
			}, 600);
		};
	});
};

var scrollToTop = function scrollToTop() {
	var thing = document.getElementById('anchor-target');
	thing.scrollIntoView({ behavior: "smooth", block: "start" });
};

var prev = void 0;
var current = 0;
var isShowing = false;
var attachArrowListeners = function attachArrowListeners() {
	$arrow.addEventListener('click', function () {
		scrollToTop();
	});

	$parallax.addEventListener('scroll', function () {

		var y = $title.getBoundingClientRect().y;
		if (current !== y) {
			prev = current;
			current = y;
		}

		if (y <= -50 && !isShowing) {
			$arrow.classList.add('show');
			isShowing = true;
		} else if (y > -50 && isShowing) {
			$arrow.classList.remove('show');
			isShowing = false;
		}
	});
};

var addSortButtonListeners = function addSortButtonListeners() {
	var $byArtist = document.getElementById('js-by-artist');
	var $byTitle = document.getElementById('js-by-title');
	$byArtist.addEventListener('click', function () {
		if (sortKey) {
			scrollToTop();
			sortKey = 0;
			$byArtist.classList.add('active');
			$byTitle.classList.remove('active');

			renderEntries();
		}
	});

	$byTitle.addEventListener('click', function () {
		if (!sortKey) {
			scrollToTop();
			sortKey = 1;
			$byTitle.classList.add('active');
			$byArtist.classList.remove('active');

			renderEntries();
		}
	});
};

var clearAnchors = function clearAnchors(prevSelector) {
	var $entries = Array.from(document.querySelectorAll(prevSelector));
	$entries.forEach(function (entry) {
		return entry.removeAttribute('name');
	});
};

var findFirstEntry = function findFirstEntry(char) {
	var selector = sortKey ? '.js-entry-title' : '.js-entry-artist';
	var prevSelector = !sortKey ? '.js-entry-title' : '.js-entry-artist';
	var $entries = Array.from(document.querySelectorAll(selector));

	clearAnchors(prevSelector);

	return $entries.find(function (entry) {
		var node = entry.nextElementSibling;
		return node.innerHTML[0] === char || node.innerHTML[0] === char.toUpperCase();
	});
};

var makeAlphabet = function makeAlphabet() {
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

var renderImages = function renderImages(images, $images) {
	images.forEach(function (image) {
		var src = '../../assets/images/' + image;
		var $img = document.createElement('IMG');
		$img.className = 'article-image';
		$img.src = src;
		$images.appendChild($img);
	});
};

var renderEntries = function renderEntries() {
	var $articleList = document.getElementById('js-list');
	var entriesList = sortKey ? entries.byTitle : entries.byAuthor;

	$articleList.innerHTML = '';

	entriesList.forEach(function (entry) {
		var title = entry.title,
		    lastName = entry.lastName,
		    firstName = entry.firstName,
		    images = entry.images,
		    description = entry.description,
		    detail = entry.detail;


		$articleList.insertAdjacentHTML('beforeend', _articleTemplate2.default);

		var $imagesNodes = document.querySelectorAll('.article__images-inner');
		var $images = $imagesNodes[$imagesNodes.length - 1];

		if (images.length) renderImages(images, $images);

		var $descriptionOuter = document.createElement('div');
		var $descriptionNode = document.createElement('p');
		var $detailNode = document.createElement('p');
		$descriptionOuter.classList.add('article-description__outer');
		$descriptionNode.classList.add('article-description');
		$detailNode.classList.add('article-detail');

		$descriptionNode.innerHTML = description;
		$detailNode.innerHTML = detail;

		$descriptionOuter.appendChild($descriptionNode, $detailNode);
		$images.appendChild($descriptionOuter);

		var $titleNodes = document.querySelectorAll('.article-heading__title');
		var $title = $titleNodes[$titleNodes.length - 1];

		var $firstNodes = document.querySelectorAll('.article-heading__name--first');
		var $first = $firstNodes[$firstNodes.length - 1];

		var $lastNodes = document.querySelectorAll('.article-heading__name--last');
		var $last = $lastNodes[$lastNodes.length - 1];

		$title.innerHTML = title;
		$first.innerHTML = firstName;
		$last.innerHTML = lastName;
	});

	attachImageListeners();
	makeAlphabet();
};

// this needs to be a deeper sort
var sortByTitle = function sortByTitle() {
	entries.byTitle.sort(function (a, b) {
		var aTitle = a.title[0].toUpperCase();
		var bTitle = b.title[0].toUpperCase();
		if (aTitle > bTitle) return 1;else if (aTitle < bTitle) return -1;else return 0;
	});
};

var setData = function setData(data) {
	entries.byAuthor = data;
	entries.byTitle = data.slice();
	sortByTitle();
	renderEntries();
};

var fetchData = function fetchData() {
	fetch(DB).then(function (res) {
		return res.json();
	}).then(function (data) {
		setData(data);
	}).then(function () {
		$loading.forEach(function (elem) {
			return elem.classList.add('ready');
		});
		$nav.classList.add('ready');
	}).catch(function (err) {
		return console.warn(err);
	});
};

var init = function init() {
	_smoothscrollPolyfill2.default.polyfill();
	fetchData();
	(0, _navLg2.default)();
	renderEntries();
	addSortButtonListeners();
	attachArrowListeners();
	attachModalListeners();
};

init();

},{"./article-template":3,"./nav-lg":5,"smoothscroll-polyfill":1,"whatwg-fetch":2}],5:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
var template = '<div class="nav__inner">\n\t\t<div class="nav__sort-by">\n\t\t\t<span class="sort-by__title">Sort by</span>\n\t\t\t<button class="sort-by__by-artist active" id="js-by-artist">Artist</button>\n\t\t\t<span class="sort-by__divider"> | </span>\n\t\t\t<button class="sort-by__by-title" id="js-by-title">Title</button>\n\t\t\t<span class="sort-by__divider find"> | </span>\n\t\t\t<span class="find" id="js-find">&#8984;F</span>\n\t\t</div>\n\t\t<div class="nav__alphabet">\n\t\t\t<span class="alphabet__title">Go to</span>\n\t\t\t<div class="alphabet__letters"></div>\n\t\t</div>\n\t</div>';

var navLg = function navLg() {
	var navOuter = document.getElementById('js-nav');
	navOuter.innerHTML = template;
};

exports.default = navLg;

},{}]},{},[4])

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvc21vb3Roc2Nyb2xsLXBvbHlmaWxsL2Rpc3Qvc21vb3Roc2Nyb2xsLmpzIiwibm9kZV9tb2R1bGVzL3doYXR3Zy1mZXRjaC9mZXRjaC5qcyIsInNyYy9qcy9hcnRpY2xlLXRlbXBsYXRlLmpzIiwic3JjL2pzL2luZGV4LmpzIiwic3JjL2pzL25hdi1sZy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdmJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNB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SUFBSixFQURjO0FBQUEsRUFBZixFQUVFLElBRkYsQ0FFTyxnQkFBUTtBQUNkLFVBQVEsSUFBUjtBQUNBLEVBSkQsRUFLQyxJQUxELENBS00sWUFBTTtBQUNYLFdBQVMsT0FBVCxDQUFpQjtBQUFBLFVBQVEsS0FBSyxTQUFMLENBQWUsR0FBZixDQUFtQixPQUFuQixDQUFSO0FBQUEsR0FBakI7QUFDQSxPQUFLLFNBQUwsQ0FBZSxHQUFmLENBQW1CLE9BQW5CO0FBQ0EsRUFSRCxFQVNDLEtBVEQsQ0FTTztBQUFBLFNBQU8sUUFBUSxJQUFSLENBQWEsR0FBYixDQUFQO0FBQUEsRUFUUDtBQVVELENBWEQ7O0FBYUEsSUFBTSxPQUFPLFNBQVAsSUFBTyxHQUFNO0FBQ2xCLGdDQUFhLFFBQWI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxDQVJEOztBQVVBOzs7Ozs7OztBQzdSQSxJQUFNLG9sQkFBTjs7QUFnQkEsSUFBTSxRQUFRLFNBQVIsS0FBUSxHQUFNO0FBQ25CLEtBQUksV0FBVyxTQUFTLGNBQVQsQ0FBd0IsUUFBeEIsQ0FBZjtBQUNBLFVBQVMsU0FBVCxHQUFxQixRQUFyQjtBQUNBLENBSEQ7O2tCQUtlLEsiLCJmaWxlIjoiYnVuZGxlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIi8qIHNtb290aHNjcm9sbCB2MC40LjAgLSAyMDE4IC0gRHVzdGFuIEthc3RlbiwgSmVyZW1pYXMgTWVuaWNoZWxsaSAtIE1JVCBMaWNlbnNlICovXG4oZnVuY3Rpb24gKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgLy8gcG9seWZpbGxcbiAgZnVuY3Rpb24gcG9seWZpbGwoKSB7XG4gICAgLy8gYWxpYXNlc1xuICAgIHZhciB3ID0gd2luZG93O1xuICAgIHZhciBkID0gZG9jdW1lbnQ7XG5cbiAgICAvLyByZXR1cm4gaWYgc2Nyb2xsIGJlaGF2aW9yIGlzIHN1cHBvcnRlZCBhbmQgcG9seWZpbGwgaXMgbm90IGZvcmNlZFxuICAgIGlmIChcbiAgICAgICdzY3JvbGxCZWhhdmlvcicgaW4gZC5kb2N1bWVudEVsZW1lbnQuc3R5bGUgJiZcbiAgICAgIHcuX19mb3JjZVNtb290aFNjcm9sbFBvbHlmaWxsX18gIT09IHRydWVcbiAgICApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBnbG9iYWxzXG4gICAgdmFyIEVsZW1lbnQgPSB3LkhUTUxFbGVtZW50IHx8IHcuRWxlbWVudDtcbiAgICB2YXIgU0NST0xMX1RJTUUgPSA0Njg7XG5cbiAgICAvLyBvYmplY3QgZ2F0aGVyaW5nIG9yaWdpbmFsIHNjcm9sbCBtZXRob2RzXG4gICAgdmFyIG9yaWdpbmFsID0ge1xuICAgICAgc2Nyb2xsOiB3LnNjcm9sbCB8fCB3LnNjcm9sbFRvLFxuICAgICAgc2Nyb2xsQnk6IHcuc2Nyb2xsQnksXG4gICAgICBlbGVtZW50U2Nyb2xsOiBFbGVtZW50LnByb3RvdHlwZS5zY3JvbGwgfHwgc2Nyb2xsRWxlbWVudCxcbiAgICAgIHNjcm9sbEludG9WaWV3OiBFbGVtZW50LnByb3RvdHlwZS5zY3JvbGxJbnRvVmlld1xuICAgIH07XG5cbiAgICAvLyBkZWZpbmUgdGltaW5nIG1ldGhvZFxuICAgIHZhciBub3cgPVxuICAgICAgdy5wZXJmb3JtYW5jZSAmJiB3LnBlcmZvcm1hbmNlLm5vd1xuICAgICAgICA/IHcucGVyZm9ybWFuY2Uubm93LmJpbmQody5wZXJmb3JtYW5jZSlcbiAgICAgICAgOiBEYXRlLm5vdztcblxuICAgIC8qKlxuICAgICAqIGluZGljYXRlcyBpZiBhIHRoZSBjdXJyZW50IGJyb3dzZXIgaXMgbWFkZSBieSBNaWNyb3NvZnRcbiAgICAgKiBAbWV0aG9kIGlzTWljcm9zb2Z0QnJvd3NlclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSB1c2VyQWdlbnRcbiAgICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBpc01pY3Jvc29mdEJyb3dzZXIodXNlckFnZW50KSB7XG4gICAgICB2YXIgdXNlckFnZW50UGF0dGVybnMgPSBbJ01TSUUgJywgJ1RyaWRlbnQvJywgJ0VkZ2UvJ107XG5cbiAgICAgIHJldHVybiBuZXcgUmVnRXhwKHVzZXJBZ2VudFBhdHRlcm5zLmpvaW4oJ3wnKSkudGVzdCh1c2VyQWdlbnQpO1xuICAgIH1cblxuICAgIC8qXG4gICAgICogSUUgaGFzIHJvdW5kaW5nIGJ1ZyByb3VuZGluZyBkb3duIGNsaWVudEhlaWdodCBhbmQgY2xpZW50V2lkdGggYW5kXG4gICAgICogcm91bmRpbmcgdXAgc2Nyb2xsSGVpZ2h0IGFuZCBzY3JvbGxXaWR0aCBjYXVzaW5nIGZhbHNlIHBvc2l0aXZlc1xuICAgICAqIG9uIGhhc1Njcm9sbGFibGVTcGFjZVxuICAgICAqL1xuICAgIHZhciBST1VORElOR19UT0xFUkFOQ0UgPSBpc01pY3Jvc29mdEJyb3dzZXIody5uYXZpZ2F0b3IudXNlckFnZW50KSA/IDEgOiAwO1xuXG4gICAgLyoqXG4gICAgICogY2hhbmdlcyBzY3JvbGwgcG9zaXRpb24gaW5zaWRlIGFuIGVsZW1lbnRcbiAgICAgKiBAbWV0aG9kIHNjcm9sbEVsZW1lbnRcbiAgICAgKiBAcGFyYW0ge051bWJlcn0geFxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSB5XG4gICAgICogQHJldHVybnMge3VuZGVmaW5lZH1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzY3JvbGxFbGVtZW50KHgsIHkpIHtcbiAgICAgIHRoaXMuc2Nyb2xsTGVmdCA9IHg7XG4gICAgICB0aGlzLnNjcm9sbFRvcCA9IHk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogcmV0dXJucyByZXN1bHQgb2YgYXBwbHlpbmcgZWFzZSBtYXRoIGZ1bmN0aW9uIHRvIGEgbnVtYmVyXG4gICAgICogQG1ldGhvZCBlYXNlXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IGtcbiAgICAgKiBAcmV0dXJucyB7TnVtYmVyfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGVhc2Uoaykge1xuICAgICAgcmV0dXJuIDAuNSAqICgxIC0gTWF0aC5jb3MoTWF0aC5QSSAqIGspKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBpbmRpY2F0ZXMgaWYgYSBzbW9vdGggYmVoYXZpb3Igc2hvdWxkIGJlIGFwcGxpZWRcbiAgICAgKiBAbWV0aG9kIHNob3VsZEJhaWxPdXRcbiAgICAgKiBAcGFyYW0ge051bWJlcnxPYmplY3R9IGZpcnN0QXJnXG4gICAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAgICovXG4gICAgZnVuY3Rpb24gc2hvdWxkQmFpbE91dChmaXJzdEFyZykge1xuICAgICAgaWYgKFxuICAgICAgICBmaXJzdEFyZyA9PT0gbnVsbCB8fFxuICAgICAgICB0eXBlb2YgZmlyc3RBcmcgIT09ICdvYmplY3QnIHx8XG4gICAgICAgIGZpcnN0QXJnLmJlaGF2aW9yID09PSB1bmRlZmluZWQgfHxcbiAgICAgICAgZmlyc3RBcmcuYmVoYXZpb3IgPT09ICdhdXRvJyB8fFxuICAgICAgICBmaXJzdEFyZy5iZWhhdmlvciA9PT0gJ2luc3RhbnQnXG4gICAgICApIHtcbiAgICAgICAgLy8gZmlyc3QgYXJndW1lbnQgaXMgbm90IGFuIG9iamVjdC9udWxsXG4gICAgICAgIC8vIG9yIGJlaGF2aW9yIGlzIGF1dG8sIGluc3RhbnQgb3IgdW5kZWZpbmVkXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAodHlwZW9mIGZpcnN0QXJnID09PSAnb2JqZWN0JyAmJiBmaXJzdEFyZy5iZWhhdmlvciA9PT0gJ3Ntb290aCcpIHtcbiAgICAgICAgLy8gZmlyc3QgYXJndW1lbnQgaXMgYW4gb2JqZWN0IGFuZCBiZWhhdmlvciBpcyBzbW9vdGhcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuXG4gICAgICAvLyB0aHJvdyBlcnJvciB3aGVuIGJlaGF2aW9yIGlzIG5vdCBzdXBwb3J0ZWRcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAgICdiZWhhdmlvciBtZW1iZXIgb2YgU2Nyb2xsT3B0aW9ucyAnICtcbiAgICAgICAgICBmaXJzdEFyZy5iZWhhdmlvciArXG4gICAgICAgICAgJyBpcyBub3QgYSB2YWxpZCB2YWx1ZSBmb3IgZW51bWVyYXRpb24gU2Nyb2xsQmVoYXZpb3IuJ1xuICAgICAgKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBpbmRpY2F0ZXMgaWYgYW4gZWxlbWVudCBoYXMgc2Nyb2xsYWJsZSBzcGFjZSBpbiB0aGUgcHJvdmlkZWQgYXhpc1xuICAgICAqIEBtZXRob2QgaGFzU2Nyb2xsYWJsZVNwYWNlXG4gICAgICogQHBhcmFtIHtOb2RlfSBlbFxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBheGlzXG4gICAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAgICovXG4gICAgZnVuY3Rpb24gaGFzU2Nyb2xsYWJsZVNwYWNlKGVsLCBheGlzKSB7XG4gICAgICBpZiAoYXhpcyA9PT0gJ1knKSB7XG4gICAgICAgIHJldHVybiBlbC5jbGllbnRIZWlnaHQgKyBST1VORElOR19UT0xFUkFOQ0UgPCBlbC5zY3JvbGxIZWlnaHQ7XG4gICAgICB9XG5cbiAgICAgIGlmIChheGlzID09PSAnWCcpIHtcbiAgICAgICAgcmV0dXJuIGVsLmNsaWVudFdpZHRoICsgUk9VTkRJTkdfVE9MRVJBTkNFIDwgZWwuc2Nyb2xsV2lkdGg7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogaW5kaWNhdGVzIGlmIGFuIGVsZW1lbnQgaGFzIGEgc2Nyb2xsYWJsZSBvdmVyZmxvdyBwcm9wZXJ0eSBpbiB0aGUgYXhpc1xuICAgICAqIEBtZXRob2QgY2FuT3ZlcmZsb3dcbiAgICAgKiBAcGFyYW0ge05vZGV9IGVsXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGF4aXNcbiAgICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBjYW5PdmVyZmxvdyhlbCwgYXhpcykge1xuICAgICAgdmFyIG92ZXJmbG93VmFsdWUgPSB3LmdldENvbXB1dGVkU3R5bGUoZWwsIG51bGwpWydvdmVyZmxvdycgKyBheGlzXTtcblxuICAgICAgcmV0dXJuIG92ZXJmbG93VmFsdWUgPT09ICdhdXRvJyB8fCBvdmVyZmxvd1ZhbHVlID09PSAnc2Nyb2xsJztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBpbmRpY2F0ZXMgaWYgYW4gZWxlbWVudCBjYW4gYmUgc2Nyb2xsZWQgaW4gZWl0aGVyIGF4aXNcbiAgICAgKiBAbWV0aG9kIGlzU2Nyb2xsYWJsZVxuICAgICAqIEBwYXJhbSB7Tm9kZX0gZWxcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gYXhpc1xuICAgICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGlzU2Nyb2xsYWJsZShlbCkge1xuICAgICAgdmFyIGlzU2Nyb2xsYWJsZVkgPSBoYXNTY3JvbGxhYmxlU3BhY2UoZWwsICdZJykgJiYgY2FuT3ZlcmZsb3coZWwsICdZJyk7XG4gICAgICB2YXIgaXNTY3JvbGxhYmxlWCA9IGhhc1Njcm9sbGFibGVTcGFjZShlbCwgJ1gnKSAmJiBjYW5PdmVyZmxvdyhlbCwgJ1gnKTtcblxuICAgICAgcmV0dXJuIGlzU2Nyb2xsYWJsZVkgfHwgaXNTY3JvbGxhYmxlWDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBmaW5kcyBzY3JvbGxhYmxlIHBhcmVudCBvZiBhbiBlbGVtZW50XG4gICAgICogQG1ldGhvZCBmaW5kU2Nyb2xsYWJsZVBhcmVudFxuICAgICAqIEBwYXJhbSB7Tm9kZX0gZWxcbiAgICAgKiBAcmV0dXJucyB7Tm9kZX0gZWxcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBmaW5kU2Nyb2xsYWJsZVBhcmVudChlbCkge1xuICAgICAgdmFyIGlzQm9keTtcblxuICAgICAgZG8ge1xuICAgICAgICBlbCA9IGVsLnBhcmVudE5vZGU7XG5cbiAgICAgICAgaXNCb2R5ID0gZWwgPT09IGQuYm9keTtcbiAgICAgIH0gd2hpbGUgKGlzQm9keSA9PT0gZmFsc2UgJiYgaXNTY3JvbGxhYmxlKGVsKSA9PT0gZmFsc2UpO1xuXG4gICAgICBpc0JvZHkgPSBudWxsO1xuXG4gICAgICByZXR1cm4gZWw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogc2VsZiBpbnZva2VkIGZ1bmN0aW9uIHRoYXQsIGdpdmVuIGEgY29udGV4dCwgc3RlcHMgdGhyb3VnaCBzY3JvbGxpbmdcbiAgICAgKiBAbWV0aG9kIHN0ZXBcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gY29udGV4dFxuICAgICAqIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gICAgICovXG4gICAgZnVuY3Rpb24gc3RlcChjb250ZXh0KSB7XG4gICAgICB2YXIgdGltZSA9IG5vdygpO1xuICAgICAgdmFyIHZhbHVlO1xuICAgICAgdmFyIGN1cnJlbnRYO1xuICAgICAgdmFyIGN1cnJlbnRZO1xuICAgICAgdmFyIGVsYXBzZWQgPSAodGltZSAtIGNvbnRleHQuc3RhcnRUaW1lKSAvIFNDUk9MTF9USU1FO1xuXG4gICAgICAvLyBhdm9pZCBlbGFwc2VkIHRpbWVzIGhpZ2hlciB0aGFuIG9uZVxuICAgICAgZWxhcHNlZCA9IGVsYXBzZWQgPiAxID8gMSA6IGVsYXBzZWQ7XG5cbiAgICAgIC8vIGFwcGx5IGVhc2luZyB0byBlbGFwc2VkIHRpbWVcbiAgICAgIHZhbHVlID0gZWFzZShlbGFwc2VkKTtcblxuICAgICAgY3VycmVudFggPSBjb250ZXh0LnN0YXJ0WCArIChjb250ZXh0LnggLSBjb250ZXh0LnN0YXJ0WCkgKiB2YWx1ZTtcbiAgICAgIGN1cnJlbnRZID0gY29udGV4dC5zdGFydFkgKyAoY29udGV4dC55IC0gY29udGV4dC5zdGFydFkpICogdmFsdWU7XG5cbiAgICAgIGNvbnRleHQubWV0aG9kLmNhbGwoY29udGV4dC5zY3JvbGxhYmxlLCBjdXJyZW50WCwgY3VycmVudFkpO1xuXG4gICAgICAvLyBzY3JvbGwgbW9yZSBpZiB3ZSBoYXZlIG5vdCByZWFjaGVkIG91ciBkZXN0aW5hdGlvblxuICAgICAgaWYgKGN1cnJlbnRYICE9PSBjb250ZXh0LnggfHwgY3VycmVudFkgIT09IGNvbnRleHQueSkge1xuICAgICAgICB3LnJlcXVlc3RBbmltYXRpb25GcmFtZShzdGVwLmJpbmQodywgY29udGV4dCkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIHNjcm9sbHMgd2luZG93IG9yIGVsZW1lbnQgd2l0aCBhIHNtb290aCBiZWhhdmlvclxuICAgICAqIEBtZXRob2Qgc21vb3RoU2Nyb2xsXG4gICAgICogQHBhcmFtIHtPYmplY3R8Tm9kZX0gZWxcbiAgICAgKiBAcGFyYW0ge051bWJlcn0geFxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSB5XG4gICAgICogQHJldHVybnMge3VuZGVmaW5lZH1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzbW9vdGhTY3JvbGwoZWwsIHgsIHkpIHtcbiAgICAgIHZhciBzY3JvbGxhYmxlO1xuICAgICAgdmFyIHN0YXJ0WDtcbiAgICAgIHZhciBzdGFydFk7XG4gICAgICB2YXIgbWV0aG9kO1xuICAgICAgdmFyIHN0YXJ0VGltZSA9IG5vdygpO1xuXG4gICAgICAvLyBkZWZpbmUgc2Nyb2xsIGNvbnRleHRcbiAgICAgIGlmIChlbCA9PT0gZC5ib2R5KSB7XG4gICAgICAgIHNjcm9sbGFibGUgPSB3O1xuICAgICAgICBzdGFydFggPSB3LnNjcm9sbFggfHwgdy5wYWdlWE9mZnNldDtcbiAgICAgICAgc3RhcnRZID0gdy5zY3JvbGxZIHx8IHcucGFnZVlPZmZzZXQ7XG4gICAgICAgIG1ldGhvZCA9IG9yaWdpbmFsLnNjcm9sbDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNjcm9sbGFibGUgPSBlbDtcbiAgICAgICAgc3RhcnRYID0gZWwuc2Nyb2xsTGVmdDtcbiAgICAgICAgc3RhcnRZID0gZWwuc2Nyb2xsVG9wO1xuICAgICAgICBtZXRob2QgPSBzY3JvbGxFbGVtZW50O1xuICAgICAgfVxuXG4gICAgICAvLyBzY3JvbGwgbG9vcGluZyBvdmVyIGEgZnJhbWVcbiAgICAgIHN0ZXAoe1xuICAgICAgICBzY3JvbGxhYmxlOiBzY3JvbGxhYmxlLFxuICAgICAgICBtZXRob2Q6IG1ldGhvZCxcbiAgICAgICAgc3RhcnRUaW1lOiBzdGFydFRpbWUsXG4gICAgICAgIHN0YXJ0WDogc3RhcnRYLFxuICAgICAgICBzdGFydFk6IHN0YXJ0WSxcbiAgICAgICAgeDogeCxcbiAgICAgICAgeTogeVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gT1JJR0lOQUwgTUVUSE9EUyBPVkVSUklERVNcbiAgICAvLyB3LnNjcm9sbCBhbmQgdy5zY3JvbGxUb1xuICAgIHcuc2Nyb2xsID0gdy5zY3JvbGxUbyA9IGZ1bmN0aW9uKCkge1xuICAgICAgLy8gYXZvaWQgYWN0aW9uIHdoZW4gbm8gYXJndW1lbnRzIGFyZSBwYXNzZWRcbiAgICAgIGlmIChhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIGF2b2lkIHNtb290aCBiZWhhdmlvciBpZiBub3QgcmVxdWlyZWRcbiAgICAgIGlmIChzaG91bGRCYWlsT3V0KGFyZ3VtZW50c1swXSkgPT09IHRydWUpIHtcbiAgICAgICAgb3JpZ2luYWwuc2Nyb2xsLmNhbGwoXG4gICAgICAgICAgdyxcbiAgICAgICAgICBhcmd1bWVudHNbMF0ubGVmdCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICA/IGFyZ3VtZW50c1swXS5sZWZ0XG4gICAgICAgICAgICA6IHR5cGVvZiBhcmd1bWVudHNbMF0gIT09ICdvYmplY3QnXG4gICAgICAgICAgICAgID8gYXJndW1lbnRzWzBdXG4gICAgICAgICAgICAgIDogdy5zY3JvbGxYIHx8IHcucGFnZVhPZmZzZXQsXG4gICAgICAgICAgLy8gdXNlIHRvcCBwcm9wLCBzZWNvbmQgYXJndW1lbnQgaWYgcHJlc2VudCBvciBmYWxsYmFjayB0byBzY3JvbGxZXG4gICAgICAgICAgYXJndW1lbnRzWzBdLnRvcCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICA/IGFyZ3VtZW50c1swXS50b3BcbiAgICAgICAgICAgIDogYXJndW1lbnRzWzFdICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgICAgPyBhcmd1bWVudHNbMV1cbiAgICAgICAgICAgICAgOiB3LnNjcm9sbFkgfHwgdy5wYWdlWU9mZnNldFxuICAgICAgICApO1xuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gTEVUIFRIRSBTTU9PVEhORVNTIEJFR0lOIVxuICAgICAgc21vb3RoU2Nyb2xsLmNhbGwoXG4gICAgICAgIHcsXG4gICAgICAgIGQuYm9keSxcbiAgICAgICAgYXJndW1lbnRzWzBdLmxlZnQgIT09IHVuZGVmaW5lZFxuICAgICAgICAgID8gfn5hcmd1bWVudHNbMF0ubGVmdFxuICAgICAgICAgIDogdy5zY3JvbGxYIHx8IHcucGFnZVhPZmZzZXQsXG4gICAgICAgIGFyZ3VtZW50c1swXS50b3AgIT09IHVuZGVmaW5lZFxuICAgICAgICAgID8gfn5hcmd1bWVudHNbMF0udG9wXG4gICAgICAgICAgOiB3LnNjcm9sbFkgfHwgdy5wYWdlWU9mZnNldFxuICAgICAgKTtcbiAgICB9O1xuXG4gICAgLy8gdy5zY3JvbGxCeVxuICAgIHcuc2Nyb2xsQnkgPSBmdW5jdGlvbigpIHtcbiAgICAgIC8vIGF2b2lkIGFjdGlvbiB3aGVuIG5vIGFyZ3VtZW50cyBhcmUgcGFzc2VkXG4gICAgICBpZiAoYXJndW1lbnRzWzBdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBhdm9pZCBzbW9vdGggYmVoYXZpb3IgaWYgbm90IHJlcXVpcmVkXG4gICAgICBpZiAoc2hvdWxkQmFpbE91dChhcmd1bWVudHNbMF0pKSB7XG4gICAgICAgIG9yaWdpbmFsLnNjcm9sbEJ5LmNhbGwoXG4gICAgICAgICAgdyxcbiAgICAgICAgICBhcmd1bWVudHNbMF0ubGVmdCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICA/IGFyZ3VtZW50c1swXS5sZWZ0XG4gICAgICAgICAgICA6IHR5cGVvZiBhcmd1bWVudHNbMF0gIT09ICdvYmplY3QnID8gYXJndW1lbnRzWzBdIDogMCxcbiAgICAgICAgICBhcmd1bWVudHNbMF0udG9wICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8gYXJndW1lbnRzWzBdLnRvcFxuICAgICAgICAgICAgOiBhcmd1bWVudHNbMV0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1sxXSA6IDBcbiAgICAgICAgKTtcblxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIExFVCBUSEUgU01PT1RITkVTUyBCRUdJTiFcbiAgICAgIHNtb290aFNjcm9sbC5jYWxsKFxuICAgICAgICB3LFxuICAgICAgICBkLmJvZHksXG4gICAgICAgIH5+YXJndW1lbnRzWzBdLmxlZnQgKyAody5zY3JvbGxYIHx8IHcucGFnZVhPZmZzZXQpLFxuICAgICAgICB+fmFyZ3VtZW50c1swXS50b3AgKyAody5zY3JvbGxZIHx8IHcucGFnZVlPZmZzZXQpXG4gICAgICApO1xuICAgIH07XG5cbiAgICAvLyBFbGVtZW50LnByb3RvdHlwZS5zY3JvbGwgYW5kIEVsZW1lbnQucHJvdG90eXBlLnNjcm9sbFRvXG4gICAgRWxlbWVudC5wcm90b3R5cGUuc2Nyb2xsID0gRWxlbWVudC5wcm90b3R5cGUuc2Nyb2xsVG8gPSBmdW5jdGlvbigpIHtcbiAgICAgIC8vIGF2b2lkIGFjdGlvbiB3aGVuIG5vIGFyZ3VtZW50cyBhcmUgcGFzc2VkXG4gICAgICBpZiAoYXJndW1lbnRzWzBdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBhdm9pZCBzbW9vdGggYmVoYXZpb3IgaWYgbm90IHJlcXVpcmVkXG4gICAgICBpZiAoc2hvdWxkQmFpbE91dChhcmd1bWVudHNbMF0pID09PSB0cnVlKSB7XG4gICAgICAgIC8vIGlmIG9uZSBudW1iZXIgaXMgcGFzc2VkLCB0aHJvdyBlcnJvciB0byBtYXRjaCBGaXJlZm94IGltcGxlbWVudGF0aW9uXG4gICAgICAgIGlmICh0eXBlb2YgYXJndW1lbnRzWzBdID09PSAnbnVtYmVyJyAmJiBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHRocm93IG5ldyBTeW50YXhFcnJvcignVmFsdWUgY291bGQgbm90IGJlIGNvbnZlcnRlZCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgb3JpZ2luYWwuZWxlbWVudFNjcm9sbC5jYWxsKFxuICAgICAgICAgIHRoaXMsXG4gICAgICAgICAgLy8gdXNlIGxlZnQgcHJvcCwgZmlyc3QgbnVtYmVyIGFyZ3VtZW50IG9yIGZhbGxiYWNrIHRvIHNjcm9sbExlZnRcbiAgICAgICAgICBhcmd1bWVudHNbMF0ubGVmdCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICA/IH5+YXJndW1lbnRzWzBdLmxlZnRcbiAgICAgICAgICAgIDogdHlwZW9mIGFyZ3VtZW50c1swXSAhPT0gJ29iamVjdCcgPyB+fmFyZ3VtZW50c1swXSA6IHRoaXMuc2Nyb2xsTGVmdCxcbiAgICAgICAgICAvLyB1c2UgdG9wIHByb3AsIHNlY29uZCBhcmd1bWVudCBvciBmYWxsYmFjayB0byBzY3JvbGxUb3BcbiAgICAgICAgICBhcmd1bWVudHNbMF0udG9wICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8gfn5hcmd1bWVudHNbMF0udG9wXG4gICAgICAgICAgICA6IGFyZ3VtZW50c1sxXSAhPT0gdW5kZWZpbmVkID8gfn5hcmd1bWVudHNbMV0gOiB0aGlzLnNjcm9sbFRvcFxuICAgICAgICApO1xuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIGxlZnQgPSBhcmd1bWVudHNbMF0ubGVmdDtcbiAgICAgIHZhciB0b3AgPSBhcmd1bWVudHNbMF0udG9wO1xuXG4gICAgICAvLyBMRVQgVEhFIFNNT09USE5FU1MgQkVHSU4hXG4gICAgICBzbW9vdGhTY3JvbGwuY2FsbChcbiAgICAgICAgdGhpcyxcbiAgICAgICAgdGhpcyxcbiAgICAgICAgdHlwZW9mIGxlZnQgPT09ICd1bmRlZmluZWQnID8gdGhpcy5zY3JvbGxMZWZ0IDogfn5sZWZ0LFxuICAgICAgICB0eXBlb2YgdG9wID09PSAndW5kZWZpbmVkJyA/IHRoaXMuc2Nyb2xsVG9wIDogfn50b3BcbiAgICAgICk7XG4gICAgfTtcblxuICAgIC8vIEVsZW1lbnQucHJvdG90eXBlLnNjcm9sbEJ5XG4gICAgRWxlbWVudC5wcm90b3R5cGUuc2Nyb2xsQnkgPSBmdW5jdGlvbigpIHtcbiAgICAgIC8vIGF2b2lkIGFjdGlvbiB3aGVuIG5vIGFyZ3VtZW50cyBhcmUgcGFzc2VkXG4gICAgICBpZiAoYXJndW1lbnRzWzBdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBhdm9pZCBzbW9vdGggYmVoYXZpb3IgaWYgbm90IHJlcXVpcmVkXG4gICAgICBpZiAoc2hvdWxkQmFpbE91dChhcmd1bWVudHNbMF0pID09PSB0cnVlKSB7XG4gICAgICAgIG9yaWdpbmFsLmVsZW1lbnRTY3JvbGwuY2FsbChcbiAgICAgICAgICB0aGlzLFxuICAgICAgICAgIGFyZ3VtZW50c1swXS5sZWZ0ICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8gfn5hcmd1bWVudHNbMF0ubGVmdCArIHRoaXMuc2Nyb2xsTGVmdFxuICAgICAgICAgICAgOiB+fmFyZ3VtZW50c1swXSArIHRoaXMuc2Nyb2xsTGVmdCxcbiAgICAgICAgICBhcmd1bWVudHNbMF0udG9wICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8gfn5hcmd1bWVudHNbMF0udG9wICsgdGhpcy5zY3JvbGxUb3BcbiAgICAgICAgICAgIDogfn5hcmd1bWVudHNbMV0gKyB0aGlzLnNjcm9sbFRvcFxuICAgICAgICApO1xuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdGhpcy5zY3JvbGwoe1xuICAgICAgICBsZWZ0OiB+fmFyZ3VtZW50c1swXS5sZWZ0ICsgdGhpcy5zY3JvbGxMZWZ0LFxuICAgICAgICB0b3A6IH5+YXJndW1lbnRzWzBdLnRvcCArIHRoaXMuc2Nyb2xsVG9wLFxuICAgICAgICBiZWhhdmlvcjogYXJndW1lbnRzWzBdLmJlaGF2aW9yXG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgLy8gRWxlbWVudC5wcm90b3R5cGUuc2Nyb2xsSW50b1ZpZXdcbiAgICBFbGVtZW50LnByb3RvdHlwZS5zY3JvbGxJbnRvVmlldyA9IGZ1bmN0aW9uKCkge1xuICAgICAgLy8gYXZvaWQgc21vb3RoIGJlaGF2aW9yIGlmIG5vdCByZXF1aXJlZFxuICAgICAgaWYgKHNob3VsZEJhaWxPdXQoYXJndW1lbnRzWzBdKSA9PT0gdHJ1ZSkge1xuICAgICAgICBvcmlnaW5hbC5zY3JvbGxJbnRvVmlldy5jYWxsKFxuICAgICAgICAgIHRoaXMsXG4gICAgICAgICAgYXJndW1lbnRzWzBdID09PSB1bmRlZmluZWQgPyB0cnVlIDogYXJndW1lbnRzWzBdXG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBMRVQgVEhFIFNNT09USE5FU1MgQkVHSU4hXG4gICAgICB2YXIgc2Nyb2xsYWJsZVBhcmVudCA9IGZpbmRTY3JvbGxhYmxlUGFyZW50KHRoaXMpO1xuICAgICAgdmFyIHBhcmVudFJlY3RzID0gc2Nyb2xsYWJsZVBhcmVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgIHZhciBjbGllbnRSZWN0cyA9IHRoaXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cbiAgICAgIGlmIChzY3JvbGxhYmxlUGFyZW50ICE9PSBkLmJvZHkpIHtcbiAgICAgICAgLy8gcmV2ZWFsIGVsZW1lbnQgaW5zaWRlIHBhcmVudFxuICAgICAgICBzbW9vdGhTY3JvbGwuY2FsbChcbiAgICAgICAgICB0aGlzLFxuICAgICAgICAgIHNjcm9sbGFibGVQYXJlbnQsXG4gICAgICAgICAgc2Nyb2xsYWJsZVBhcmVudC5zY3JvbGxMZWZ0ICsgY2xpZW50UmVjdHMubGVmdCAtIHBhcmVudFJlY3RzLmxlZnQsXG4gICAgICAgICAgc2Nyb2xsYWJsZVBhcmVudC5zY3JvbGxUb3AgKyBjbGllbnRSZWN0cy50b3AgLSBwYXJlbnRSZWN0cy50b3BcbiAgICAgICAgKTtcblxuICAgICAgICAvLyByZXZlYWwgcGFyZW50IGluIHZpZXdwb3J0IHVubGVzcyBpcyBmaXhlZFxuICAgICAgICBpZiAody5nZXRDb21wdXRlZFN0eWxlKHNjcm9sbGFibGVQYXJlbnQpLnBvc2l0aW9uICE9PSAnZml4ZWQnKSB7XG4gICAgICAgICAgdy5zY3JvbGxCeSh7XG4gICAgICAgICAgICBsZWZ0OiBwYXJlbnRSZWN0cy5sZWZ0LFxuICAgICAgICAgICAgdG9wOiBwYXJlbnRSZWN0cy50b3AsXG4gICAgICAgICAgICBiZWhhdmlvcjogJ3Ntb290aCdcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gcmV2ZWFsIGVsZW1lbnQgaW4gdmlld3BvcnRcbiAgICAgICAgdy5zY3JvbGxCeSh7XG4gICAgICAgICAgbGVmdDogY2xpZW50UmVjdHMubGVmdCxcbiAgICAgICAgICB0b3A6IGNsaWVudFJlY3RzLnRvcCxcbiAgICAgICAgICBiZWhhdmlvcjogJ3Ntb290aCdcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIGlmICh0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAvLyBjb21tb25qc1xuICAgIG1vZHVsZS5leHBvcnRzID0geyBwb2x5ZmlsbDogcG9seWZpbGwgfTtcbiAgfSBlbHNlIHtcbiAgICAvLyBnbG9iYWxcbiAgICBwb2x5ZmlsbCgpO1xuICB9XG5cbn0oKSk7XG4iLCIoZnVuY3Rpb24oc2VsZikge1xuICAndXNlIHN0cmljdCc7XG5cbiAgaWYgKHNlbGYuZmV0Y2gpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIHZhciBzdXBwb3J0ID0ge1xuICAgIHNlYXJjaFBhcmFtczogJ1VSTFNlYXJjaFBhcmFtcycgaW4gc2VsZixcbiAgICBpdGVyYWJsZTogJ1N5bWJvbCcgaW4gc2VsZiAmJiAnaXRlcmF0b3InIGluIFN5bWJvbCxcbiAgICBibG9iOiAnRmlsZVJlYWRlcicgaW4gc2VsZiAmJiAnQmxvYicgaW4gc2VsZiAmJiAoZnVuY3Rpb24oKSB7XG4gICAgICB0cnkge1xuICAgICAgICBuZXcgQmxvYigpXG4gICAgICAgIHJldHVybiB0cnVlXG4gICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICB9XG4gICAgfSkoKSxcbiAgICBmb3JtRGF0YTogJ0Zvcm1EYXRhJyBpbiBzZWxmLFxuICAgIGFycmF5QnVmZmVyOiAnQXJyYXlCdWZmZXInIGluIHNlbGZcbiAgfVxuXG4gIGlmIChzdXBwb3J0LmFycmF5QnVmZmVyKSB7XG4gICAgdmFyIHZpZXdDbGFzc2VzID0gW1xuICAgICAgJ1tvYmplY3QgSW50OEFycmF5XScsXG4gICAgICAnW29iamVjdCBVaW50OEFycmF5XScsXG4gICAgICAnW29iamVjdCBVaW50OENsYW1wZWRBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgSW50MTZBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgVWludDE2QXJyYXldJyxcbiAgICAgICdbb2JqZWN0IEludDMyQXJyYXldJyxcbiAgICAgICdbb2JqZWN0IFVpbnQzMkFycmF5XScsXG4gICAgICAnW29iamVjdCBGbG9hdDMyQXJyYXldJyxcbiAgICAgICdbb2JqZWN0IEZsb2F0NjRBcnJheV0nXG4gICAgXVxuXG4gICAgdmFyIGlzRGF0YVZpZXcgPSBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiBvYmogJiYgRGF0YVZpZXcucHJvdG90eXBlLmlzUHJvdG90eXBlT2Yob2JqKVxuICAgIH1cblxuICAgIHZhciBpc0FycmF5QnVmZmVyVmlldyA9IEFycmF5QnVmZmVyLmlzVmlldyB8fCBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiBvYmogJiYgdmlld0NsYXNzZXMuaW5kZXhPZihPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKSkgPiAtMVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIG5vcm1hbGl6ZU5hbWUobmFtZSkge1xuICAgIGlmICh0eXBlb2YgbmFtZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIG5hbWUgPSBTdHJpbmcobmFtZSlcbiAgICB9XG4gICAgaWYgKC9bXmEtejAtOVxcLSMkJSYnKisuXFxeX2B8fl0vaS50ZXN0KG5hbWUpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIGNoYXJhY3RlciBpbiBoZWFkZXIgZmllbGQgbmFtZScpXG4gICAgfVxuICAgIHJldHVybiBuYW1lLnRvTG93ZXJDYXNlKClcbiAgfVxuXG4gIGZ1bmN0aW9uIG5vcm1hbGl6ZVZhbHVlKHZhbHVlKSB7XG4gICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHZhbHVlID0gU3RyaW5nKHZhbHVlKVxuICAgIH1cbiAgICByZXR1cm4gdmFsdWVcbiAgfVxuXG4gIC8vIEJ1aWxkIGEgZGVzdHJ1Y3RpdmUgaXRlcmF0b3IgZm9yIHRoZSB2YWx1ZSBsaXN0XG4gIGZ1bmN0aW9uIGl0ZXJhdG9yRm9yKGl0ZW1zKSB7XG4gICAgdmFyIGl0ZXJhdG9yID0ge1xuICAgICAgbmV4dDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IGl0ZW1zLnNoaWZ0KClcbiAgICAgICAgcmV0dXJuIHtkb25lOiB2YWx1ZSA9PT0gdW5kZWZpbmVkLCB2YWx1ZTogdmFsdWV9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHN1cHBvcnQuaXRlcmFibGUpIHtcbiAgICAgIGl0ZXJhdG9yW1N5bWJvbC5pdGVyYXRvcl0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGl0ZXJhdG9yXG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGl0ZXJhdG9yXG4gIH1cblxuICBmdW5jdGlvbiBIZWFkZXJzKGhlYWRlcnMpIHtcbiAgICB0aGlzLm1hcCA9IHt9XG5cbiAgICBpZiAoaGVhZGVycyBpbnN0YW5jZW9mIEhlYWRlcnMpIHtcbiAgICAgIGhlYWRlcnMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSwgbmFtZSkge1xuICAgICAgICB0aGlzLmFwcGVuZChuYW1lLCB2YWx1ZSlcbiAgICAgIH0sIHRoaXMpXG4gICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KGhlYWRlcnMpKSB7XG4gICAgICBoZWFkZXJzLmZvckVhY2goZnVuY3Rpb24oaGVhZGVyKSB7XG4gICAgICAgIHRoaXMuYXBwZW5kKGhlYWRlclswXSwgaGVhZGVyWzFdKVxuICAgICAgfSwgdGhpcylcbiAgICB9IGVsc2UgaWYgKGhlYWRlcnMpIHtcbiAgICAgIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGhlYWRlcnMpLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuICAgICAgICB0aGlzLmFwcGVuZChuYW1lLCBoZWFkZXJzW25hbWVdKVxuICAgICAgfSwgdGhpcylcbiAgICB9XG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5hcHBlbmQgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICAgIG5hbWUgPSBub3JtYWxpemVOYW1lKG5hbWUpXG4gICAgdmFsdWUgPSBub3JtYWxpemVWYWx1ZSh2YWx1ZSlcbiAgICB2YXIgb2xkVmFsdWUgPSB0aGlzLm1hcFtuYW1lXVxuICAgIHRoaXMubWFwW25hbWVdID0gb2xkVmFsdWUgPyBvbGRWYWx1ZSsnLCcrdmFsdWUgOiB2YWx1ZVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGVbJ2RlbGV0ZSddID0gZnVuY3Rpb24obmFtZSkge1xuICAgIGRlbGV0ZSB0aGlzLm1hcFtub3JtYWxpemVOYW1lKG5hbWUpXVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24obmFtZSkge1xuICAgIG5hbWUgPSBub3JtYWxpemVOYW1lKG5hbWUpXG4gICAgcmV0dXJuIHRoaXMuaGFzKG5hbWUpID8gdGhpcy5tYXBbbmFtZV0gOiBudWxsXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5oYXMgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMubWFwLmhhc093blByb3BlcnR5KG5vcm1hbGl6ZU5hbWUobmFtZSkpXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICAgIHRoaXMubWFwW25vcm1hbGl6ZU5hbWUobmFtZSldID0gbm9ybWFsaXplVmFsdWUodmFsdWUpXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5mb3JFYWNoID0gZnVuY3Rpb24oY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICBmb3IgKHZhciBuYW1lIGluIHRoaXMubWFwKSB7XG4gICAgICBpZiAodGhpcy5tYXAuaGFzT3duUHJvcGVydHkobmFtZSkpIHtcbiAgICAgICAgY2FsbGJhY2suY2FsbCh0aGlzQXJnLCB0aGlzLm1hcFtuYW1lXSwgbmFtZSwgdGhpcylcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5rZXlzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGl0ZW1zID0gW11cbiAgICB0aGlzLmZvckVhY2goZnVuY3Rpb24odmFsdWUsIG5hbWUpIHsgaXRlbXMucHVzaChuYW1lKSB9KVxuICAgIHJldHVybiBpdGVyYXRvckZvcihpdGVtcylcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLnZhbHVlcyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBpdGVtcyA9IFtdXG4gICAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlKSB7IGl0ZW1zLnB1c2godmFsdWUpIH0pXG4gICAgcmV0dXJuIGl0ZXJhdG9yRm9yKGl0ZW1zKVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuZW50cmllcyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBpdGVtcyA9IFtdXG4gICAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlLCBuYW1lKSB7IGl0ZW1zLnB1c2goW25hbWUsIHZhbHVlXSkgfSlcbiAgICByZXR1cm4gaXRlcmF0b3JGb3IoaXRlbXMpXG4gIH1cblxuICBpZiAoc3VwcG9ydC5pdGVyYWJsZSkge1xuICAgIEhlYWRlcnMucHJvdG90eXBlW1N5bWJvbC5pdGVyYXRvcl0gPSBIZWFkZXJzLnByb3RvdHlwZS5lbnRyaWVzXG4gIH1cblxuICBmdW5jdGlvbiBjb25zdW1lZChib2R5KSB7XG4gICAgaWYgKGJvZHkuYm9keVVzZWQpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgVHlwZUVycm9yKCdBbHJlYWR5IHJlYWQnKSlcbiAgICB9XG4gICAgYm9keS5ib2R5VXNlZCA9IHRydWVcbiAgfVxuXG4gIGZ1bmN0aW9uIGZpbGVSZWFkZXJSZWFkeShyZWFkZXIpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICByZWFkZXIub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlc29sdmUocmVhZGVyLnJlc3VsdClcbiAgICAgIH1cbiAgICAgIHJlYWRlci5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlamVjdChyZWFkZXIuZXJyb3IpXG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlYWRCbG9iQXNBcnJheUJ1ZmZlcihibG9iKSB7XG4gICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKClcbiAgICB2YXIgcHJvbWlzZSA9IGZpbGVSZWFkZXJSZWFkeShyZWFkZXIpXG4gICAgcmVhZGVyLnJlYWRBc0FycmF5QnVmZmVyKGJsb2IpXG4gICAgcmV0dXJuIHByb21pc2VcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlYWRCbG9iQXNUZXh0KGJsb2IpIHtcbiAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKVxuICAgIHZhciBwcm9taXNlID0gZmlsZVJlYWRlclJlYWR5KHJlYWRlcilcbiAgICByZWFkZXIucmVhZEFzVGV4dChibG9iKVxuICAgIHJldHVybiBwcm9taXNlXG4gIH1cblxuICBmdW5jdGlvbiByZWFkQXJyYXlCdWZmZXJBc1RleHQoYnVmKSB7XG4gICAgdmFyIHZpZXcgPSBuZXcgVWludDhBcnJheShidWYpXG4gICAgdmFyIGNoYXJzID0gbmV3IEFycmF5KHZpZXcubGVuZ3RoKVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2aWV3Lmxlbmd0aDsgaSsrKSB7XG4gICAgICBjaGFyc1tpXSA9IFN0cmluZy5mcm9tQ2hhckNvZGUodmlld1tpXSlcbiAgICB9XG4gICAgcmV0dXJuIGNoYXJzLmpvaW4oJycpXG4gIH1cblxuICBmdW5jdGlvbiBidWZmZXJDbG9uZShidWYpIHtcbiAgICBpZiAoYnVmLnNsaWNlKSB7XG4gICAgICByZXR1cm4gYnVmLnNsaWNlKDApXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciB2aWV3ID0gbmV3IFVpbnQ4QXJyYXkoYnVmLmJ5dGVMZW5ndGgpXG4gICAgICB2aWV3LnNldChuZXcgVWludDhBcnJheShidWYpKVxuICAgICAgcmV0dXJuIHZpZXcuYnVmZmVyXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gQm9keSgpIHtcbiAgICB0aGlzLmJvZHlVc2VkID0gZmFsc2VcblxuICAgIHRoaXMuX2luaXRCb2R5ID0gZnVuY3Rpb24oYm9keSkge1xuICAgICAgdGhpcy5fYm9keUluaXQgPSBib2R5XG4gICAgICBpZiAoIWJvZHkpIHtcbiAgICAgICAgdGhpcy5fYm9keVRleHQgPSAnJ1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgYm9keSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgdGhpcy5fYm9keVRleHQgPSBib2R5XG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuYmxvYiAmJiBCbG9iLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpKSB7XG4gICAgICAgIHRoaXMuX2JvZHlCbG9iID0gYm9keVxuICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LmZvcm1EYXRhICYmIEZvcm1EYXRhLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpKSB7XG4gICAgICAgIHRoaXMuX2JvZHlGb3JtRGF0YSA9IGJvZHlcbiAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5zZWFyY2hQYXJhbXMgJiYgVVJMU2VhcmNoUGFyYW1zLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpKSB7XG4gICAgICAgIHRoaXMuX2JvZHlUZXh0ID0gYm9keS50b1N0cmluZygpXG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuYXJyYXlCdWZmZXIgJiYgc3VwcG9ydC5ibG9iICYmIGlzRGF0YVZpZXcoYm9keSkpIHtcbiAgICAgICAgdGhpcy5fYm9keUFycmF5QnVmZmVyID0gYnVmZmVyQ2xvbmUoYm9keS5idWZmZXIpXG4gICAgICAgIC8vIElFIDEwLTExIGNhbid0IGhhbmRsZSBhIERhdGFWaWV3IGJvZHkuXG4gICAgICAgIHRoaXMuX2JvZHlJbml0ID0gbmV3IEJsb2IoW3RoaXMuX2JvZHlBcnJheUJ1ZmZlcl0pXG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuYXJyYXlCdWZmZXIgJiYgKEFycmF5QnVmZmVyLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpIHx8IGlzQXJyYXlCdWZmZXJWaWV3KGJvZHkpKSkge1xuICAgICAgICB0aGlzLl9ib2R5QXJyYXlCdWZmZXIgPSBidWZmZXJDbG9uZShib2R5KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCd1bnN1cHBvcnRlZCBCb2R5SW5pdCB0eXBlJylcbiAgICAgIH1cblxuICAgICAgaWYgKCF0aGlzLmhlYWRlcnMuZ2V0KCdjb250ZW50LXR5cGUnKSkge1xuICAgICAgICBpZiAodHlwZW9mIGJvZHkgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhpcy5oZWFkZXJzLnNldCgnY29udGVudC10eXBlJywgJ3RleHQvcGxhaW47Y2hhcnNldD1VVEYtOCcpXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUJsb2IgJiYgdGhpcy5fYm9keUJsb2IudHlwZSkge1xuICAgICAgICAgIHRoaXMuaGVhZGVycy5zZXQoJ2NvbnRlbnQtdHlwZScsIHRoaXMuX2JvZHlCbG9iLnR5cGUpXG4gICAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5zZWFyY2hQYXJhbXMgJiYgVVJMU2VhcmNoUGFyYW1zLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpKSB7XG4gICAgICAgICAgdGhpcy5oZWFkZXJzLnNldCgnY29udGVudC10eXBlJywgJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZDtjaGFyc2V0PVVURi04JylcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzdXBwb3J0LmJsb2IpIHtcbiAgICAgIHRoaXMuYmxvYiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcmVqZWN0ZWQgPSBjb25zdW1lZCh0aGlzKVxuICAgICAgICBpZiAocmVqZWN0ZWQpIHtcbiAgICAgICAgICByZXR1cm4gcmVqZWN0ZWRcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLl9ib2R5QmxvYikge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodGhpcy5fYm9keUJsb2IpXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUFycmF5QnVmZmVyKSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShuZXcgQmxvYihbdGhpcy5fYm9keUFycmF5QnVmZmVyXSkpXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUZvcm1EYXRhKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjb3VsZCBub3QgcmVhZCBGb3JtRGF0YSBib2R5IGFzIGJsb2InKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUobmV3IEJsb2IoW3RoaXMuX2JvZHlUZXh0XSkpXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdGhpcy5hcnJheUJ1ZmZlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAodGhpcy5fYm9keUFycmF5QnVmZmVyKSB7XG4gICAgICAgICAgcmV0dXJuIGNvbnN1bWVkKHRoaXMpIHx8IFByb21pc2UucmVzb2x2ZSh0aGlzLl9ib2R5QXJyYXlCdWZmZXIpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuYmxvYigpLnRoZW4ocmVhZEJsb2JBc0FycmF5QnVmZmVyKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy50ZXh0ID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgcmVqZWN0ZWQgPSBjb25zdW1lZCh0aGlzKVxuICAgICAgaWYgKHJlamVjdGVkKSB7XG4gICAgICAgIHJldHVybiByZWplY3RlZFxuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5fYm9keUJsb2IpIHtcbiAgICAgICAgcmV0dXJuIHJlYWRCbG9iQXNUZXh0KHRoaXMuX2JvZHlCbG9iKVxuICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5QXJyYXlCdWZmZXIpIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShyZWFkQXJyYXlCdWZmZXJBc1RleHQodGhpcy5fYm9keUFycmF5QnVmZmVyKSlcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUZvcm1EYXRhKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignY291bGQgbm90IHJlYWQgRm9ybURhdGEgYm9keSBhcyB0ZXh0JylcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodGhpcy5fYm9keVRleHQpXG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHN1cHBvcnQuZm9ybURhdGEpIHtcbiAgICAgIHRoaXMuZm9ybURhdGEgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudGV4dCgpLnRoZW4oZGVjb2RlKVxuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuanNvbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMudGV4dCgpLnRoZW4oSlNPTi5wYXJzZSlcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgLy8gSFRUUCBtZXRob2RzIHdob3NlIGNhcGl0YWxpemF0aW9uIHNob3VsZCBiZSBub3JtYWxpemVkXG4gIHZhciBtZXRob2RzID0gWydERUxFVEUnLCAnR0VUJywgJ0hFQUQnLCAnT1BUSU9OUycsICdQT1NUJywgJ1BVVCddXG5cbiAgZnVuY3Rpb24gbm9ybWFsaXplTWV0aG9kKG1ldGhvZCkge1xuICAgIHZhciB1cGNhc2VkID0gbWV0aG9kLnRvVXBwZXJDYXNlKClcbiAgICByZXR1cm4gKG1ldGhvZHMuaW5kZXhPZih1cGNhc2VkKSA+IC0xKSA/IHVwY2FzZWQgOiBtZXRob2RcbiAgfVxuXG4gIGZ1bmN0aW9uIFJlcXVlc3QoaW5wdXQsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fVxuICAgIHZhciBib2R5ID0gb3B0aW9ucy5ib2R5XG5cbiAgICBpZiAoaW5wdXQgaW5zdGFuY2VvZiBSZXF1ZXN0KSB7XG4gICAgICBpZiAoaW5wdXQuYm9keVVzZWQpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQWxyZWFkeSByZWFkJylcbiAgICAgIH1cbiAgICAgIHRoaXMudXJsID0gaW5wdXQudXJsXG4gICAgICB0aGlzLmNyZWRlbnRpYWxzID0gaW5wdXQuY3JlZGVudGlhbHNcbiAgICAgIGlmICghb3B0aW9ucy5oZWFkZXJzKSB7XG4gICAgICAgIHRoaXMuaGVhZGVycyA9IG5ldyBIZWFkZXJzKGlucHV0LmhlYWRlcnMpXG4gICAgICB9XG4gICAgICB0aGlzLm1ldGhvZCA9IGlucHV0Lm1ldGhvZFxuICAgICAgdGhpcy5tb2RlID0gaW5wdXQubW9kZVxuICAgICAgaWYgKCFib2R5ICYmIGlucHV0Ll9ib2R5SW5pdCAhPSBudWxsKSB7XG4gICAgICAgIGJvZHkgPSBpbnB1dC5fYm9keUluaXRcbiAgICAgICAgaW5wdXQuYm9keVVzZWQgPSB0cnVlXG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMudXJsID0gU3RyaW5nKGlucHV0KVxuICAgIH1cblxuICAgIHRoaXMuY3JlZGVudGlhbHMgPSBvcHRpb25zLmNyZWRlbnRpYWxzIHx8IHRoaXMuY3JlZGVudGlhbHMgfHwgJ29taXQnXG4gICAgaWYgKG9wdGlvbnMuaGVhZGVycyB8fCAhdGhpcy5oZWFkZXJzKSB7XG4gICAgICB0aGlzLmhlYWRlcnMgPSBuZXcgSGVhZGVycyhvcHRpb25zLmhlYWRlcnMpXG4gICAgfVxuICAgIHRoaXMubWV0aG9kID0gbm9ybWFsaXplTWV0aG9kKG9wdGlvbnMubWV0aG9kIHx8IHRoaXMubWV0aG9kIHx8ICdHRVQnKVxuICAgIHRoaXMubW9kZSA9IG9wdGlvbnMubW9kZSB8fCB0aGlzLm1vZGUgfHwgbnVsbFxuICAgIHRoaXMucmVmZXJyZXIgPSBudWxsXG5cbiAgICBpZiAoKHRoaXMubWV0aG9kID09PSAnR0VUJyB8fCB0aGlzLm1ldGhvZCA9PT0gJ0hFQUQnKSAmJiBib2R5KSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdCb2R5IG5vdCBhbGxvd2VkIGZvciBHRVQgb3IgSEVBRCByZXF1ZXN0cycpXG4gICAgfVxuICAgIHRoaXMuX2luaXRCb2R5KGJvZHkpXG4gIH1cblxuICBSZXF1ZXN0LnByb3RvdHlwZS5jbG9uZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgUmVxdWVzdCh0aGlzLCB7IGJvZHk6IHRoaXMuX2JvZHlJbml0IH0pXG4gIH1cblxuICBmdW5jdGlvbiBkZWNvZGUoYm9keSkge1xuICAgIHZhciBmb3JtID0gbmV3IEZvcm1EYXRhKClcbiAgICBib2R5LnRyaW0oKS5zcGxpdCgnJicpLmZvckVhY2goZnVuY3Rpb24oYnl0ZXMpIHtcbiAgICAgIGlmIChieXRlcykge1xuICAgICAgICB2YXIgc3BsaXQgPSBieXRlcy5zcGxpdCgnPScpXG4gICAgICAgIHZhciBuYW1lID0gc3BsaXQuc2hpZnQoKS5yZXBsYWNlKC9cXCsvZywgJyAnKVxuICAgICAgICB2YXIgdmFsdWUgPSBzcGxpdC5qb2luKCc9JykucmVwbGFjZSgvXFwrL2csICcgJylcbiAgICAgICAgZm9ybS5hcHBlbmQoZGVjb2RlVVJJQ29tcG9uZW50KG5hbWUpLCBkZWNvZGVVUklDb21wb25lbnQodmFsdWUpKVxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIGZvcm1cbiAgfVxuXG4gIGZ1bmN0aW9uIHBhcnNlSGVhZGVycyhyYXdIZWFkZXJzKSB7XG4gICAgdmFyIGhlYWRlcnMgPSBuZXcgSGVhZGVycygpXG4gICAgLy8gUmVwbGFjZSBpbnN0YW5jZXMgb2YgXFxyXFxuIGFuZCBcXG4gZm9sbG93ZWQgYnkgYXQgbGVhc3Qgb25lIHNwYWNlIG9yIGhvcml6b250YWwgdGFiIHdpdGggYSBzcGFjZVxuICAgIC8vIGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmM3MjMwI3NlY3Rpb24tMy4yXG4gICAgdmFyIHByZVByb2Nlc3NlZEhlYWRlcnMgPSByYXdIZWFkZXJzLnJlcGxhY2UoL1xccj9cXG5bXFx0IF0rL2csICcgJylcbiAgICBwcmVQcm9jZXNzZWRIZWFkZXJzLnNwbGl0KC9cXHI/XFxuLykuZm9yRWFjaChmdW5jdGlvbihsaW5lKSB7XG4gICAgICB2YXIgcGFydHMgPSBsaW5lLnNwbGl0KCc6JylcbiAgICAgIHZhciBrZXkgPSBwYXJ0cy5zaGlmdCgpLnRyaW0oKVxuICAgICAgaWYgKGtleSkge1xuICAgICAgICB2YXIgdmFsdWUgPSBwYXJ0cy5qb2luKCc6JykudHJpbSgpXG4gICAgICAgIGhlYWRlcnMuYXBwZW5kKGtleSwgdmFsdWUpXG4gICAgICB9XG4gICAgfSlcbiAgICByZXR1cm4gaGVhZGVyc1xuICB9XG5cbiAgQm9keS5jYWxsKFJlcXVlc3QucHJvdG90eXBlKVxuXG4gIGZ1bmN0aW9uIFJlc3BvbnNlKGJvZHlJbml0LCBvcHRpb25zKSB7XG4gICAgaWYgKCFvcHRpb25zKSB7XG4gICAgICBvcHRpb25zID0ge31cbiAgICB9XG5cbiAgICB0aGlzLnR5cGUgPSAnZGVmYXVsdCdcbiAgICB0aGlzLnN0YXR1cyA9IG9wdGlvbnMuc3RhdHVzID09PSB1bmRlZmluZWQgPyAyMDAgOiBvcHRpb25zLnN0YXR1c1xuICAgIHRoaXMub2sgPSB0aGlzLnN0YXR1cyA+PSAyMDAgJiYgdGhpcy5zdGF0dXMgPCAzMDBcbiAgICB0aGlzLnN0YXR1c1RleHQgPSAnc3RhdHVzVGV4dCcgaW4gb3B0aW9ucyA/IG9wdGlvbnMuc3RhdHVzVGV4dCA6ICdPSydcbiAgICB0aGlzLmhlYWRlcnMgPSBuZXcgSGVhZGVycyhvcHRpb25zLmhlYWRlcnMpXG4gICAgdGhpcy51cmwgPSBvcHRpb25zLnVybCB8fCAnJ1xuICAgIHRoaXMuX2luaXRCb2R5KGJvZHlJbml0KVxuICB9XG5cbiAgQm9keS5jYWxsKFJlc3BvbnNlLnByb3RvdHlwZSlcblxuICBSZXNwb25zZS5wcm90b3R5cGUuY2xvbmUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKHRoaXMuX2JvZHlJbml0LCB7XG4gICAgICBzdGF0dXM6IHRoaXMuc3RhdHVzLFxuICAgICAgc3RhdHVzVGV4dDogdGhpcy5zdGF0dXNUZXh0LFxuICAgICAgaGVhZGVyczogbmV3IEhlYWRlcnModGhpcy5oZWFkZXJzKSxcbiAgICAgIHVybDogdGhpcy51cmxcbiAgICB9KVxuICB9XG5cbiAgUmVzcG9uc2UuZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgcmVzcG9uc2UgPSBuZXcgUmVzcG9uc2UobnVsbCwge3N0YXR1czogMCwgc3RhdHVzVGV4dDogJyd9KVxuICAgIHJlc3BvbnNlLnR5cGUgPSAnZXJyb3InXG4gICAgcmV0dXJuIHJlc3BvbnNlXG4gIH1cblxuICB2YXIgcmVkaXJlY3RTdGF0dXNlcyA9IFszMDEsIDMwMiwgMzAzLCAzMDcsIDMwOF1cblxuICBSZXNwb25zZS5yZWRpcmVjdCA9IGZ1bmN0aW9uKHVybCwgc3RhdHVzKSB7XG4gICAgaWYgKHJlZGlyZWN0U3RhdHVzZXMuaW5kZXhPZihzdGF0dXMpID09PSAtMSkge1xuICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0ludmFsaWQgc3RhdHVzIGNvZGUnKVxuICAgIH1cblxuICAgIHJldHVybiBuZXcgUmVzcG9uc2UobnVsbCwge3N0YXR1czogc3RhdHVzLCBoZWFkZXJzOiB7bG9jYXRpb246IHVybH19KVxuICB9XG5cbiAgc2VsZi5IZWFkZXJzID0gSGVhZGVyc1xuICBzZWxmLlJlcXVlc3QgPSBSZXF1ZXN0XG4gIHNlbGYuUmVzcG9uc2UgPSBSZXNwb25zZVxuXG4gIHNlbGYuZmV0Y2ggPSBmdW5jdGlvbihpbnB1dCwgaW5pdCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHZhciByZXF1ZXN0ID0gbmV3IFJlcXVlc3QoaW5wdXQsIGluaXQpXG4gICAgICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KClcblxuICAgICAgeGhyLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgb3B0aW9ucyA9IHtcbiAgICAgICAgICBzdGF0dXM6IHhoci5zdGF0dXMsXG4gICAgICAgICAgc3RhdHVzVGV4dDogeGhyLnN0YXR1c1RleHQsXG4gICAgICAgICAgaGVhZGVyczogcGFyc2VIZWFkZXJzKHhoci5nZXRBbGxSZXNwb25zZUhlYWRlcnMoKSB8fCAnJylcbiAgICAgICAgfVxuICAgICAgICBvcHRpb25zLnVybCA9ICdyZXNwb25zZVVSTCcgaW4geGhyID8geGhyLnJlc3BvbnNlVVJMIDogb3B0aW9ucy5oZWFkZXJzLmdldCgnWC1SZXF1ZXN0LVVSTCcpXG4gICAgICAgIHZhciBib2R5ID0gJ3Jlc3BvbnNlJyBpbiB4aHIgPyB4aHIucmVzcG9uc2UgOiB4aHIucmVzcG9uc2VUZXh0XG4gICAgICAgIHJlc29sdmUobmV3IFJlc3BvbnNlKGJvZHksIG9wdGlvbnMpKVxuICAgICAgfVxuXG4gICAgICB4aHIub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QobmV3IFR5cGVFcnJvcignTmV0d29yayByZXF1ZXN0IGZhaWxlZCcpKVxuICAgICAgfVxuXG4gICAgICB4aHIub250aW1lb3V0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlamVjdChuZXcgVHlwZUVycm9yKCdOZXR3b3JrIHJlcXVlc3QgZmFpbGVkJykpXG4gICAgICB9XG5cbiAgICAgIHhoci5vcGVuKHJlcXVlc3QubWV0aG9kLCByZXF1ZXN0LnVybCwgdHJ1ZSlcblxuICAgICAgaWYgKHJlcXVlc3QuY3JlZGVudGlhbHMgPT09ICdpbmNsdWRlJykge1xuICAgICAgICB4aHIud2l0aENyZWRlbnRpYWxzID0gdHJ1ZVxuICAgICAgfSBlbHNlIGlmIChyZXF1ZXN0LmNyZWRlbnRpYWxzID09PSAnb21pdCcpIHtcbiAgICAgICAgeGhyLndpdGhDcmVkZW50aWFscyA9IGZhbHNlXG4gICAgICB9XG5cbiAgICAgIGlmICgncmVzcG9uc2VUeXBlJyBpbiB4aHIgJiYgc3VwcG9ydC5ibG9iKSB7XG4gICAgICAgIHhoci5yZXNwb25zZVR5cGUgPSAnYmxvYidcbiAgICAgIH1cblxuICAgICAgcmVxdWVzdC5oZWFkZXJzLmZvckVhY2goZnVuY3Rpb24odmFsdWUsIG5hbWUpIHtcbiAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIobmFtZSwgdmFsdWUpXG4gICAgICB9KVxuXG4gICAgICB4aHIuc2VuZCh0eXBlb2YgcmVxdWVzdC5fYm9keUluaXQgPT09ICd1bmRlZmluZWQnID8gbnVsbCA6IHJlcXVlc3QuX2JvZHlJbml0KVxuICAgIH0pXG4gIH1cbiAgc2VsZi5mZXRjaC5wb2x5ZmlsbCA9IHRydWVcbn0pKHR5cGVvZiBzZWxmICE9PSAndW5kZWZpbmVkJyA/IHNlbGYgOiB0aGlzKTtcbiIsImNvbnN0IGFydGljbGVUZW1wbGF0ZSA9IGBcblx0PGFydGljbGUgY2xhc3M9XCJhcnRpY2xlX19vdXRlclwiPlxuXHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlX19pbm5lclwiPlxuXHRcdFx0PGRpdiBjbGFzcz1cImFydGljbGVfX2hlYWRpbmdcIj5cblx0XHRcdFx0PGEgY2xhc3M9XCJqcy1lbnRyeS10aXRsZVwiPjwvYT5cblx0XHRcdFx0PGgyIGNsYXNzPVwiYXJ0aWNsZS1oZWFkaW5nX190aXRsZVwiPjwvaDI+XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlLWhlYWRpbmdfX25hbWVcIj5cblx0XHRcdFx0XHQ8c3BhbiBjbGFzcz1cImFydGljbGUtaGVhZGluZ19fbmFtZS0tZmlyc3RcIj48L3NwYW4+XG5cdFx0XHRcdFx0PGEgY2xhc3M9XCJqcy1lbnRyeS1hcnRpc3RcIj48L2E+XG5cdFx0XHRcdFx0PHNwYW4gY2xhc3M9XCJhcnRpY2xlLWhlYWRpbmdfX25hbWUtLWxhc3RcIj48L3NwYW4+XG5cdFx0XHRcdDwvZGl2PlxuXHRcdFx0PC9kaXY+XHRcblx0XHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlX19pbWFnZXMtb3V0ZXJcIj5cblx0XHRcdFx0PGRpdiBjbGFzcz1cImFydGljbGVfX2ltYWdlcy1pbm5lclwiPjwvZGl2PlxuXHRcdFx0XHQ8cCBjbGFzcz1cImpzLWFydGljbGUtYW5jaG9yLXRhcmdldFwiPjwvcD5cblx0XHQ8L2Rpdj5cblx0PC9hcnRpY2xlPlxuYDtcblxuZXhwb3J0IGRlZmF1bHQgYXJ0aWNsZVRlbXBsYXRlOyIsImltcG9ydCAnd2hhdHdnLWZldGNoJztcbmltcG9ydCBzbW9vdGhzY3JvbGwgZnJvbSAnc21vb3Roc2Nyb2xsLXBvbHlmaWxsJztcbmltcG9ydCBuYXZMZyBmcm9tICcuL25hdi1sZyc7XG5pbXBvcnQgYXJ0aWNsZVRlbXBsYXRlIGZyb20gJy4vYXJ0aWNsZS10ZW1wbGF0ZSc7XG5cbmNvbnN0IERCID0gJ2h0dHBzOi8vbmV4dXMtY2F0YWxvZy5maXJlYmFzZWlvLmNvbS9wb3N0cy5qc29uP2F1dGg9N2c3cHlLS3lrTjNONWV3ckltaE9hUzZ2d3JGc2M1Zktrcms4ZWp6Zic7XG5jb25zdCBhbHBoYWJldCA9IFsnYScsICdiJywgJ2MnLCAnZCcsICdlJywgJ2YnLCAnZycsICdoJywgJ2knLCAnaicsICdrJywgJ2wnLCAnbScsICduJywgJ28nLCAncCcsICdyJywgJ3MnLCAndCcsICd1JywgJ3YnLCAndycsICd5JywgJ3onXTtcblxuY29uc3QgJGxvYWRpbmcgPSBBcnJheS5mcm9tKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5sb2FkaW5nJykpO1xuY29uc3QgJG5hdiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdqcy1uYXYnKTtcbmNvbnN0ICRwYXJhbGxheCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5wYXJhbGxheCcpO1xuY29uc3QgJGNvbnRlbnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuY29udGVudCcpO1xuY29uc3QgJHRpdGxlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2pzLXRpdGxlJyk7XG5jb25zdCAkYXJyb3cgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuYXJyb3cnKTtcbmNvbnN0ICRtb2RhbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5tb2RhbCcpO1xuY29uc3QgJGxpZ2h0Ym94ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmxpZ2h0Ym94Jyk7XG5jb25zdCAkdmlldyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5saWdodGJveC12aWV3Jyk7XG5cbmxldCBzb3J0S2V5ID0gMDsgLy8gMCA9IGFydGlzdCwgMSA9IHRpdGxlXG5sZXQgZW50cmllcyA9IHsgYnlBdXRob3I6IFtdLCBieVRpdGxlOiBbXSB9O1xubGV0IGN1cnJlbnRMZXR0ZXIgPSAnQSc7XG5cbmxldCBsaWdodGJveCA9IGZhbHNlO1xubGV0IHgyID0gZmFsc2U7XG5jb25zdCBhdHRhY2hJbWFnZUxpc3RlbmVycyA9ICgpID0+IHtcblx0bGV0ICRpbWFnZXMgPSBBcnJheS5mcm9tKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5hcnRpY2xlLWltYWdlJykpO1xuXG5cdCRpbWFnZXMuZm9yRWFjaChpbWcgPT4ge1xuXHRcdGltZy5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChldnQpID0+IHtcblx0XHRcdGlmICghbGlnaHRib3gpIHtcblx0XHRcdFx0bGV0IHNyYyA9IGltZy5zcmM7XG5cdFx0XHRcdC8vIGxldCB0eXBlID0gaW1nLndpZHRoID49IGltZy5oZWlnaHQgPyAnbCcgOiAncCc7XG5cdFx0XHRcdFxuXHRcdFx0XHQkbGlnaHRib3guY2xhc3NMaXN0LmFkZCgnc2hvdy1pbWcnKTtcblx0XHRcdFx0JHZpZXcuc2V0QXR0cmlidXRlKCdzdHlsZScsIGBiYWNrZ3JvdW5kLWltYWdlOiB1cmwoJHtzcmN9KWApO1xuXHRcdFx0XHRsaWdodGJveCA9IHRydWU7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0pO1xuXG5cdCR2aWV3LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuXHRcdGlmIChsaWdodGJveCkge1xuXHRcdFx0JGxpZ2h0Ym94LmNsYXNzTGlzdC5yZW1vdmUoJ3Nob3ctaW1nJyk7XG5cdFx0XHQkbGlnaHRib3guZmlyc3RFbGVtZW50Q2hpbGQuY2xhc3NMaXN0LnJlbW92ZSgndmlldy14MicpO1xuXHRcdFx0bGlnaHRib3ggPSBmYWxzZTtcblx0XHR9XG5cdH0pO1xufTtcblxubGV0IG1vZGFsID0gZmFsc2U7XG5jb25zdCBhdHRhY2hNb2RhbExpc3RlbmVycyA9ICgpID0+IHtcblx0Y29uc3QgJGZpbmQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnanMtZmluZCcpO1xuXHRcblx0JGZpbmQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0JG1vZGFsLmNsYXNzTGlzdC5hZGQoJ3Nob3cnKTtcblx0XHRtb2RhbCA9IHRydWU7XG5cdH0pO1xuXG5cdCRtb2RhbC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHRzZXRUaW1lb3V0KCgpID0+IHtcblx0XHRcdCRtb2RhbC5jbGFzc0xpc3QucmVtb3ZlKCdzaG93Jyk7XG5cdFx0XHRtb2RhbCA9IGZhbHNlO1xuXHRcdH0sIDUwMCk7XG5cdH0pO1xuXG5cdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgKCkgPT4ge1xuXHRcdGlmIChtb2RhbCkge1xuXHRcdFx0c2V0VGltZW91dCgoKSA9PiB7XG5cdFx0XHRcdCRtb2RhbC5jbGFzc0xpc3QucmVtb3ZlKCdzaG93Jyk7XG5cdFx0XHRcdG1vZGFsID0gZmFsc2U7XG5cdFx0XHR9LCA2MDApO1xuXHRcdH07XG5cdH0pO1xufVxuXG5jb25zdCBzY3JvbGxUb1RvcCA9ICgpID0+IHtcblx0bGV0IHRoaW5nID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2FuY2hvci10YXJnZXQnKTtcblx0dGhpbmcuc2Nyb2xsSW50b1ZpZXcoe2JlaGF2aW9yOiBcInNtb290aFwiLCBibG9jazogXCJzdGFydFwifSk7XG59XG5cbmxldCBwcmV2O1xubGV0IGN1cnJlbnQgPSAwO1xubGV0IGlzU2hvd2luZyA9IGZhbHNlO1xuY29uc3QgYXR0YWNoQXJyb3dMaXN0ZW5lcnMgPSAoKSA9PiB7XG5cdCRhcnJvdy5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHRzY3JvbGxUb1RvcCgpO1xuXHR9KTtcblxuXHQkcGFyYWxsYXguYWRkRXZlbnRMaXN0ZW5lcignc2Nyb2xsJywgKCkgPT4ge1xuXG5cdFx0bGV0IHkgPSAkdGl0bGUuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkueTtcblx0XHRpZiAoY3VycmVudCAhPT0geSkge1xuXHRcdFx0cHJldiA9IGN1cnJlbnQ7XG5cdFx0XHRjdXJyZW50ID0geTtcblx0XHR9XG5cblx0XHRpZiAoeSA8PSAtNTAgJiYgIWlzU2hvd2luZykge1xuXHRcdFx0JGFycm93LmNsYXNzTGlzdC5hZGQoJ3Nob3cnKTtcblx0XHRcdGlzU2hvd2luZyA9IHRydWU7XG5cdFx0fSBlbHNlIGlmICh5ID4gLTUwICYmIGlzU2hvd2luZykge1xuXHRcdFx0JGFycm93LmNsYXNzTGlzdC5yZW1vdmUoJ3Nob3cnKTtcblx0XHRcdGlzU2hvd2luZyA9IGZhbHNlO1xuXHRcdH1cblx0fSk7XG59O1xuXG5jb25zdCBhZGRTb3J0QnV0dG9uTGlzdGVuZXJzID0gKCkgPT4ge1xuXHRsZXQgJGJ5QXJ0aXN0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2pzLWJ5LWFydGlzdCcpO1xuXHRsZXQgJGJ5VGl0bGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnanMtYnktdGl0bGUnKTtcblx0JGJ5QXJ0aXN0LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuXHRcdGlmIChzb3J0S2V5KSB7XG5cdFx0XHRzY3JvbGxUb1RvcCgpO1xuXHRcdFx0c29ydEtleSA9IDA7XG5cdFx0XHQkYnlBcnRpc3QuY2xhc3NMaXN0LmFkZCgnYWN0aXZlJyk7XG5cdFx0XHQkYnlUaXRsZS5jbGFzc0xpc3QucmVtb3ZlKCdhY3RpdmUnKTtcblxuXHRcdFx0cmVuZGVyRW50cmllcygpO1xuXHRcdH1cblx0fSk7XG5cblx0JGJ5VGl0bGUuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0aWYgKCFzb3J0S2V5KSB7XG5cdFx0XHRzY3JvbGxUb1RvcCgpO1xuXHRcdFx0c29ydEtleSA9IDE7XG5cdFx0XHQkYnlUaXRsZS5jbGFzc0xpc3QuYWRkKCdhY3RpdmUnKTtcblx0XHRcdCRieUFydGlzdC5jbGFzc0xpc3QucmVtb3ZlKCdhY3RpdmUnKTtcblxuXHRcdFx0cmVuZGVyRW50cmllcygpO1xuXHRcdH1cblx0fSk7XG59O1xuXG5jb25zdCBjbGVhckFuY2hvcnMgPSAocHJldlNlbGVjdG9yKSA9PiB7XG5cdGxldCAkZW50cmllcyA9IEFycmF5LmZyb20oZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChwcmV2U2VsZWN0b3IpKTtcblx0JGVudHJpZXMuZm9yRWFjaChlbnRyeSA9PiBlbnRyeS5yZW1vdmVBdHRyaWJ1dGUoJ25hbWUnKSk7XG59O1xuXG5jb25zdCBmaW5kRmlyc3RFbnRyeSA9IChjaGFyKSA9PiB7XG5cdGxldCBzZWxlY3RvciA9IHNvcnRLZXkgPyAnLmpzLWVudHJ5LXRpdGxlJyA6ICcuanMtZW50cnktYXJ0aXN0Jztcblx0bGV0IHByZXZTZWxlY3RvciA9ICFzb3J0S2V5ID8gJy5qcy1lbnRyeS10aXRsZScgOiAnLmpzLWVudHJ5LWFydGlzdCc7XG5cdGxldCAkZW50cmllcyA9IEFycmF5LmZyb20oZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChzZWxlY3RvcikpO1xuXG5cdGNsZWFyQW5jaG9ycyhwcmV2U2VsZWN0b3IpO1xuXG5cdHJldHVybiAkZW50cmllcy5maW5kKGVudHJ5ID0+IHtcblx0XHRsZXQgbm9kZSA9IGVudHJ5Lm5leHRFbGVtZW50U2libGluZztcblx0XHRyZXR1cm4gbm9kZS5pbm5lckhUTUxbMF0gPT09IGNoYXIgfHwgbm9kZS5pbm5lckhUTUxbMF0gPT09IGNoYXIudG9VcHBlckNhc2UoKTtcblx0fSk7XG59O1xuXG5cbmNvbnN0IG1ha2VBbHBoYWJldCA9ICgpID0+IHtcblx0Y29uc3QgYXR0YWNoQW5jaG9yTGlzdGVuZXIgPSAoJGFuY2hvciwgbGV0dGVyKSA9PiB7XG5cdFx0JGFuY2hvci5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHRcdGNvbnN0IGxldHRlck5vZGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChsZXR0ZXIpO1xuXHRcdFx0bGV0IHRhcmdldDtcblxuXHRcdFx0aWYgKCFzb3J0S2V5KSB7XG5cdFx0XHRcdHRhcmdldCA9IGxldHRlciA9PT0gJ2EnID8gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2FuY2hvci10YXJnZXQnKSA6IGxldHRlck5vZGUucGFyZW50RWxlbWVudC5wYXJlbnRFbGVtZW50LnBhcmVudEVsZW1lbnQucGFyZW50RWxlbWVudC5wcmV2aW91c0VsZW1lbnRTaWJsaW5nLnF1ZXJ5U2VsZWN0b3IoJy5qcy1hcnRpY2xlLWFuY2hvci10YXJnZXQnKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRhcmdldCA9IGxldHRlciA9PT0gJ2EnID8gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2FuY2hvci10YXJnZXQnKSA6IGxldHRlck5vZGUucGFyZW50RWxlbWVudC5wYXJlbnRFbGVtZW50LnBhcmVudEVsZW1lbnQucHJldmlvdXNFbGVtZW50U2libGluZy5xdWVyeVNlbGVjdG9yKCcuanMtYXJ0aWNsZS1hbmNob3ItdGFyZ2V0Jyk7XG5cdFx0XHR9O1xuXG5cdFx0XHR0YXJnZXQuc2Nyb2xsSW50b1ZpZXcoe2JlaGF2aW9yOiBcInNtb290aFwiLCBibG9jazogXCJzdGFydFwifSk7XG5cdFx0fSk7XG5cdH07XG5cblx0bGV0IGFjdGl2ZUVudHJpZXMgPSB7fTtcblx0bGV0ICRvdXRlciA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5hbHBoYWJldF9fbGV0dGVycycpO1xuXHQkb3V0ZXIuaW5uZXJIVE1MID0gJyc7XG5cblx0YWxwaGFiZXQuZm9yRWFjaChsZXR0ZXIgPT4ge1xuXHRcdGxldCAkZmlyc3RFbnRyeSA9IGZpbmRGaXJzdEVudHJ5KGxldHRlcik7XG5cdFx0bGV0ICRhbmNob3IgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG5cblx0XHRpZiAoISRmaXJzdEVudHJ5KSByZXR1cm47XG5cblx0XHQkZmlyc3RFbnRyeS5pZCA9IGxldHRlcjtcblx0XHQkYW5jaG9yLmlubmVySFRNTCA9IGxldHRlci50b1VwcGVyQ2FzZSgpO1xuXHRcdCRhbmNob3IuY2xhc3NOYW1lID0gJ2FscGhhYmV0X19sZXR0ZXItYW5jaG9yJztcblxuXHRcdGF0dGFjaEFuY2hvckxpc3RlbmVyKCRhbmNob3IsIGxldHRlcik7XG5cdFx0JG91dGVyLmFwcGVuZENoaWxkKCRhbmNob3IpO1xuXHR9KTtcbn07XG5cbmNvbnN0IHJlbmRlckltYWdlcyA9IChpbWFnZXMsICRpbWFnZXMpID0+IHtcblx0aW1hZ2VzLmZvckVhY2goaW1hZ2UgPT4ge1xuXHRcdGNvbnN0IHNyYyA9IGAuLi8uLi9hc3NldHMvaW1hZ2VzLyR7aW1hZ2V9YDtcblx0XHRsZXQgJGltZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ0lNRycpO1xuXHRcdCRpbWcuY2xhc3NOYW1lID0gJ2FydGljbGUtaW1hZ2UnO1xuXHRcdCRpbWcuc3JjID0gc3JjO1xuXHRcdCRpbWFnZXMuYXBwZW5kQ2hpbGQoJGltZyk7XG5cdH0pXG59O1xuXG5jb25zdCByZW5kZXJFbnRyaWVzID0gKCkgPT4ge1xuXHRsZXQgJGFydGljbGVMaXN0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2pzLWxpc3QnKTtcblx0bGV0IGVudHJpZXNMaXN0ID0gc29ydEtleSA/IGVudHJpZXMuYnlUaXRsZSA6IGVudHJpZXMuYnlBdXRob3I7XG5cblx0JGFydGljbGVMaXN0LmlubmVySFRNTCA9ICcnO1xuXG5cdGVudHJpZXNMaXN0LmZvckVhY2goZW50cnkgPT4ge1xuXHRcdGxldCB7IHRpdGxlLCBsYXN0TmFtZSwgZmlyc3ROYW1lLCBpbWFnZXMsIGRlc2NyaXB0aW9uLCBkZXRhaWwgfSA9IGVudHJ5O1xuXG5cdFx0JGFydGljbGVMaXN0Lmluc2VydEFkamFjZW50SFRNTCgnYmVmb3JlZW5kJywgYXJ0aWNsZVRlbXBsYXRlKTtcblxuXHRcdGxldCAkaW1hZ2VzTm9kZXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuYXJ0aWNsZV9faW1hZ2VzLWlubmVyJyk7XG5cdFx0bGV0ICRpbWFnZXMgPSAkaW1hZ2VzTm9kZXNbJGltYWdlc05vZGVzLmxlbmd0aCAtIDFdO1xuXG5cdFx0aWYgKGltYWdlcy5sZW5ndGgpIHJlbmRlckltYWdlcyhpbWFnZXMsICRpbWFnZXMpO1xuXHRcdFxuXHRcdGxldCAkZGVzY3JpcHRpb25PdXRlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXHRcdGxldCAkZGVzY3JpcHRpb25Ob2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpO1xuXHRcdGxldCAkZGV0YWlsTm9kZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKTtcblx0XHQkZGVzY3JpcHRpb25PdXRlci5jbGFzc0xpc3QuYWRkKCdhcnRpY2xlLWRlc2NyaXB0aW9uX19vdXRlcicpO1xuXHRcdCRkZXNjcmlwdGlvbk5vZGUuY2xhc3NMaXN0LmFkZCgnYXJ0aWNsZS1kZXNjcmlwdGlvbicpO1xuXHRcdCRkZXRhaWxOb2RlLmNsYXNzTGlzdC5hZGQoJ2FydGljbGUtZGV0YWlsJyk7XG5cblx0XHQkZGVzY3JpcHRpb25Ob2RlLmlubmVySFRNTCA9IGRlc2NyaXB0aW9uO1xuXHRcdCRkZXRhaWxOb2RlLmlubmVySFRNTCA9IGRldGFpbDtcblxuXHRcdCRkZXNjcmlwdGlvbk91dGVyLmFwcGVuZENoaWxkKCRkZXNjcmlwdGlvbk5vZGUsICRkZXRhaWxOb2RlKTtcblx0XHQkaW1hZ2VzLmFwcGVuZENoaWxkKCRkZXNjcmlwdGlvbk91dGVyKTtcblxuXHRcdGxldCAkdGl0bGVOb2RlcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5hcnRpY2xlLWhlYWRpbmdfX3RpdGxlJyk7XG5cdFx0bGV0ICR0aXRsZSA9ICR0aXRsZU5vZGVzWyR0aXRsZU5vZGVzLmxlbmd0aCAtIDFdO1xuXG5cdFx0bGV0ICRmaXJzdE5vZGVzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLmFydGljbGUtaGVhZGluZ19fbmFtZS0tZmlyc3QnKTtcblx0XHRsZXQgJGZpcnN0ID0gJGZpcnN0Tm9kZXNbJGZpcnN0Tm9kZXMubGVuZ3RoIC0gMV07XG5cblx0XHRsZXQgJGxhc3ROb2RlcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5hcnRpY2xlLWhlYWRpbmdfX25hbWUtLWxhc3QnKTtcblx0XHRsZXQgJGxhc3QgPSAkbGFzdE5vZGVzWyRsYXN0Tm9kZXMubGVuZ3RoIC0gMV07XG5cblx0XHQkdGl0bGUuaW5uZXJIVE1MID0gdGl0bGU7XG5cdFx0JGZpcnN0LmlubmVySFRNTCA9IGZpcnN0TmFtZTtcblx0XHQkbGFzdC5pbm5lckhUTUwgPSBsYXN0TmFtZTtcblxuXHR9KTtcblxuXHRhdHRhY2hJbWFnZUxpc3RlbmVycygpO1xuXHRtYWtlQWxwaGFiZXQoKTtcbn07XG5cbi8vIHRoaXMgbmVlZHMgdG8gYmUgYSBkZWVwZXIgc29ydFxuY29uc3Qgc29ydEJ5VGl0bGUgPSAoKSA9PiB7XG5cdGVudHJpZXMuYnlUaXRsZS5zb3J0KChhLCBiKSA9PiB7XG5cdFx0bGV0IGFUaXRsZSA9IGEudGl0bGVbMF0udG9VcHBlckNhc2UoKTtcblx0XHRsZXQgYlRpdGxlID0gYi50aXRsZVswXS50b1VwcGVyQ2FzZSgpO1xuXHRcdGlmIChhVGl0bGUgPiBiVGl0bGUpIHJldHVybiAxO1xuXHRcdGVsc2UgaWYgKGFUaXRsZSA8IGJUaXRsZSkgcmV0dXJuIC0xO1xuXHRcdGVsc2UgcmV0dXJuIDA7XG5cdH0pO1xufTtcblxuY29uc3Qgc2V0RGF0YSA9IChkYXRhKSA9PiB7XG5cdGVudHJpZXMuYnlBdXRob3IgPSBkYXRhO1xuXHRlbnRyaWVzLmJ5VGl0bGUgPSBkYXRhLnNsaWNlKCk7XG5cdHNvcnRCeVRpdGxlKCk7XG5cdHJlbmRlckVudHJpZXMoKTtcbn1cblxuY29uc3QgZmV0Y2hEYXRhID0gKCkgPT4ge1xuXHRcdGZldGNoKERCKS50aGVuKHJlcyA9PlxuXHRcdFx0cmVzLmpzb24oKVxuXHRcdCkudGhlbihkYXRhID0+IHtcblx0XHRcdHNldERhdGEoZGF0YSk7XG5cdFx0fSlcblx0XHQudGhlbigoKSA9PiB7XG5cdFx0XHQkbG9hZGluZy5mb3JFYWNoKGVsZW0gPT4gZWxlbS5jbGFzc0xpc3QuYWRkKCdyZWFkeScpKTtcblx0XHRcdCRuYXYuY2xhc3NMaXN0LmFkZCgncmVhZHknKTtcblx0XHR9KVxuXHRcdC5jYXRjaChlcnIgPT4gY29uc29sZS53YXJuKGVycikpO1xufTtcblxuY29uc3QgaW5pdCA9ICgpID0+IHtcblx0c21vb3Roc2Nyb2xsLnBvbHlmaWxsKCk7XG5cdGZldGNoRGF0YSgpO1xuXHRuYXZMZygpO1xuXHRyZW5kZXJFbnRyaWVzKCk7XG5cdGFkZFNvcnRCdXR0b25MaXN0ZW5lcnMoKTtcblx0YXR0YWNoQXJyb3dMaXN0ZW5lcnMoKTtcblx0YXR0YWNoTW9kYWxMaXN0ZW5lcnMoKTtcbn1cblxuaW5pdCgpO1xuIiwiY29uc3QgdGVtcGxhdGUgPSBcblx0YDxkaXYgY2xhc3M9XCJuYXZfX2lubmVyXCI+XG5cdFx0PGRpdiBjbGFzcz1cIm5hdl9fc29ydC1ieVwiPlxuXHRcdFx0PHNwYW4gY2xhc3M9XCJzb3J0LWJ5X190aXRsZVwiPlNvcnQgYnk8L3NwYW4+XG5cdFx0XHQ8YnV0dG9uIGNsYXNzPVwic29ydC1ieV9fYnktYXJ0aXN0IGFjdGl2ZVwiIGlkPVwianMtYnktYXJ0aXN0XCI+QXJ0aXN0PC9idXR0b24+XG5cdFx0XHQ8c3BhbiBjbGFzcz1cInNvcnQtYnlfX2RpdmlkZXJcIj4gfCA8L3NwYW4+XG5cdFx0XHQ8YnV0dG9uIGNsYXNzPVwic29ydC1ieV9fYnktdGl0bGVcIiBpZD1cImpzLWJ5LXRpdGxlXCI+VGl0bGU8L2J1dHRvbj5cblx0XHRcdDxzcGFuIGNsYXNzPVwic29ydC1ieV9fZGl2aWRlciBmaW5kXCI+IHwgPC9zcGFuPlxuXHRcdFx0PHNwYW4gY2xhc3M9XCJmaW5kXCIgaWQ9XCJqcy1maW5kXCI+JiM4OTg0O0Y8L3NwYW4+XG5cdFx0PC9kaXY+XG5cdFx0PGRpdiBjbGFzcz1cIm5hdl9fYWxwaGFiZXRcIj5cblx0XHRcdDxzcGFuIGNsYXNzPVwiYWxwaGFiZXRfX3RpdGxlXCI+R28gdG88L3NwYW4+XG5cdFx0XHQ8ZGl2IGNsYXNzPVwiYWxwaGFiZXRfX2xldHRlcnNcIj48L2Rpdj5cblx0XHQ8L2Rpdj5cblx0PC9kaXY+YDtcblxuY29uc3QgbmF2TGcgPSAoKSA9PiB7XG5cdGxldCBuYXZPdXRlciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdqcy1uYXYnKTtcblx0bmF2T3V0ZXIuaW5uZXJIVE1MID0gdGVtcGxhdGU7XG59O1xuXG5leHBvcnQgZGVmYXVsdCBuYXZMZzsiXSwicHJlRXhpc3RpbmdDb21tZW50IjoiLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9dXRmLTg7YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0p6YjNWeVkyVnpJanBiSW01dlpHVmZiVzlrZFd4bGN5OWljbTkzYzJWeUxYQmhZMnN2WDNCeVpXeDFaR1V1YW5NaUxDSnViMlJsWDIxdlpIVnNaWE12YzIxdmIzUm9jMk55YjJ4c0xYQnZiSGxtYVd4c0wyUnBjM1F2YzIxdmIzUm9jMk55YjJ4c0xtcHpJaXdpYm05a1pWOXRiMlIxYkdWekwzZG9ZWFIzWnkxbVpYUmphQzltWlhSamFDNXFjeUlzSW5OeVl5OXFjeTloY25ScFkyeGxMWFJsYlhCc1lYUmxMbXB6SWl3aWMzSmpMMnB6TDJsdVpHVjRMbXB6SWl3aWMzSmpMMnB6TDI1aGRpMXNaeTVxY3lKZExDSnVZVzFsY3lJNlcxMHNJbTFoY0hCcGJtZHpJam9pUVVGQlFUdEJRMEZCTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3TzBGRGRtSkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdPenM3T3pzN1FVTnNaRUVzU1VGQlRTeHBjRUpCUVU0N08ydENRVzFDWlN4bE96czdPenRCUTI1Q1pqczdRVUZEUVRzN096dEJRVU5CT3pzN08wRkJRMEU3T3pzN096dEJRVVZCTEVsQlFVMHNTMEZCU3l3clJrRkJXRHRCUVVOQkxFbEJRVTBzVjBGQlZ5eERRVUZETEVkQlFVUXNSVUZCVFN4SFFVRk9MRVZCUVZjc1IwRkJXQ3hGUVVGblFpeEhRVUZvUWl4RlFVRnhRaXhIUVVGeVFpeEZRVUV3UWl4SFFVRXhRaXhGUVVFclFpeEhRVUV2UWl4RlFVRnZReXhIUVVGd1F5eEZRVUY1UXl4SFFVRjZReXhGUVVFNFF5eEhRVUU1UXl4RlFVRnRSQ3hIUVVGdVJDeEZRVUYzUkN4SFFVRjRSQ3hGUVVFMlJDeEhRVUUzUkN4RlFVRnJSU3hIUVVGc1JTeEZRVUYxUlN4SFFVRjJSU3hGUVVFMFJTeEhRVUUxUlN4RlFVRnBSaXhIUVVGcVJpeEZRVUZ6Uml4SFFVRjBSaXhGUVVFeVJpeEhRVUV6Uml4RlFVRm5SeXhIUVVGb1J5eEZRVUZ4Unl4SFFVRnlSeXhGUVVFd1J5eEhRVUV4Unl4RlFVRXJSeXhIUVVFdlJ5eEZRVUZ2U0N4SFFVRndTQ3hEUVVGcVFqczdRVUZGUVN4SlFVRk5MRmRCUVZjc1RVRkJUU3hKUVVGT0xFTkJRVmNzVTBGQlV5eG5Ra0ZCVkN4RFFVRXdRaXhWUVVFeFFpeERRVUZZTEVOQlFXcENPMEZCUTBFc1NVRkJUU3hQUVVGUExGTkJRVk1zWTBGQlZDeERRVUYzUWl4UlFVRjRRaXhEUVVGaU8wRkJRMEVzU1VGQlRTeFpRVUZaTEZOQlFWTXNZVUZCVkN4RFFVRjFRaXhYUVVGMlFpeERRVUZzUWp0QlFVTkJMRWxCUVUwc1YwRkJWeXhUUVVGVExHRkJRVlFzUTBGQmRVSXNWVUZCZGtJc1EwRkJha0k3UVVGRFFTeEpRVUZOTEZOQlFWTXNVMEZCVXl4alFVRlVMRU5CUVhkQ0xGVkJRWGhDTEVOQlFXWTdRVUZEUVN4SlFVRk5MRk5CUVZNc1UwRkJVeXhoUVVGVUxFTkJRWFZDTEZGQlFYWkNMRU5CUVdZN1FVRkRRU3hKUVVGTkxGTkJRVk1zVTBGQlV5eGhRVUZVTEVOQlFYVkNMRkZCUVhaQ0xFTkJRV1k3UVVGRFFTeEpRVUZOTEZsQlFWa3NVMEZCVXl4aFFVRlVMRU5CUVhWQ0xGZEJRWFpDTEVOQlFXeENPMEZCUTBFc1NVRkJUU3hSUVVGUkxGTkJRVk1zWVVGQlZDeERRVUYxUWl4blFrRkJka0lzUTBGQlpEczdRVUZGUVN4SlFVRkpMRlZCUVZVc1EwRkJaQ3hETEVOQlFXbENPMEZCUTJwQ0xFbEJRVWtzVlVGQlZTeEZRVUZGTEZWQlFWVXNSVUZCV2l4RlFVRm5RaXhUUVVGVExFVkJRWHBDTEVWQlFXUTdRVUZEUVN4SlFVRkpMR2RDUVVGblFpeEhRVUZ3UWpzN1FVRkZRU3hKUVVGSkxGZEJRVmNzUzBGQlpqdEJRVU5CTEVsQlFVa3NTMEZCU3l4TFFVRlVPMEZCUTBFc1NVRkJUU3gxUWtGQmRVSXNVMEZCZGtJc2IwSkJRWFZDTEVkQlFVMDdRVUZEYkVNc1MwRkJTU3hWUVVGVkxFMUJRVTBzU1VGQlRpeERRVUZYTEZOQlFWTXNaMEpCUVZRc1EwRkJNRUlzWjBKQlFURkNMRU5CUVZnc1EwRkJaRHM3UVVGRlFTeFRRVUZSTEU5QlFWSXNRMEZCWjBJc1pVRkJUenRCUVVOMFFpeE5RVUZKTEdkQ1FVRktMRU5CUVhGQ0xFOUJRWEpDTEVWQlFUaENMRlZCUVVNc1IwRkJSQ3hGUVVGVE8wRkJRM1JETEU5QlFVa3NRMEZCUXl4UlFVRk1MRVZCUVdVN1FVRkRaQ3hSUVVGSkxFMUJRVTBzU1VGQlNTeEhRVUZrTzBGQlEwRTdPMEZCUlVFc1kwRkJWU3hUUVVGV0xFTkJRVzlDTEVkQlFYQkNMRU5CUVhkQ0xGVkJRWGhDTzBGQlEwRXNWVUZCVFN4WlFVRk9MRU5CUVcxQ0xFOUJRVzVDTERaQ1FVRnhSQ3hIUVVGeVJEdEJRVU5CTEdWQlFWY3NTVUZCV0R0QlFVTkJPMEZCUTBRc1IwRlVSRHRCUVZWQkxFVkJXRVE3TzBGQllVRXNUMEZCVFN4blFrRkJUaXhEUVVGMVFpeFBRVUYyUWl4RlFVRm5ReXhaUVVGTk8wRkJRM0pETEUxQlFVa3NVVUZCU2l4RlFVRmpPMEZCUTJJc1lVRkJWU3hUUVVGV0xFTkJRVzlDTEUxQlFYQkNMRU5CUVRKQ0xGVkJRVE5DTzBGQlEwRXNZVUZCVlN4cFFrRkJWaXhEUVVFMFFpeFRRVUUxUWl4RFFVRnpReXhOUVVGMFF5eERRVUUyUXl4VFFVRTNRenRCUVVOQkxHTkJRVmNzUzBGQldEdEJRVU5CTzBGQlEwUXNSVUZPUkR0QlFVOUJMRU5CZGtKRU96dEJRWGxDUVN4SlFVRkpMRkZCUVZFc1MwRkJXanRCUVVOQkxFbEJRVTBzZFVKQlFYVkNMRk5CUVhaQ0xHOUNRVUYxUWl4SFFVRk5PMEZCUTJ4RExFdEJRVTBzVVVGQlVTeFRRVUZUTEdOQlFWUXNRMEZCZDBJc1UwRkJlRUlzUTBGQlpEczdRVUZGUVN4UFFVRk5MR2RDUVVGT0xFTkJRWFZDTEU5QlFYWkNMRVZCUVdkRExGbEJRVTA3UVVGRGNrTXNVMEZCVHl4VFFVRlFMRU5CUVdsQ0xFZEJRV3BDTEVOQlFYRkNMRTFCUVhKQ08wRkJRMEVzVlVGQlVTeEpRVUZTTzBGQlEwRXNSVUZJUkRzN1FVRkxRU3hSUVVGUExHZENRVUZRTEVOQlFYZENMRTlCUVhoQ0xFVkJRV2xETEZsQlFVMDdRVUZEZEVNc1lVRkJWeXhaUVVGTk8wRkJRMmhDTEZWQlFVOHNVMEZCVUN4RFFVRnBRaXhOUVVGcVFpeERRVUYzUWl4TlFVRjRRanRCUVVOQkxGZEJRVkVzUzBGQlVqdEJRVU5CTEVkQlNFUXNSVUZIUnl4SFFVaElPMEZCU1VFc1JVRk1SRHM3UVVGUFFTeFJRVUZQTEdkQ1FVRlFMRU5CUVhkQ0xGTkJRWGhDTEVWQlFXMURMRmxCUVUwN1FVRkRlRU1zVFVGQlNTeExRVUZLTEVWQlFWYzdRVUZEVml4alFVRlhMRmxCUVUwN1FVRkRhRUlzVjBGQlR5eFRRVUZRTEVOQlFXbENMRTFCUVdwQ0xFTkJRWGRDTEUxQlFYaENPMEZCUTBFc1dVRkJVU3hMUVVGU08wRkJRMEVzU1VGSVJDeEZRVWRITEVkQlNFZzdRVUZKUVR0QlFVTkVMRVZCVUVRN1FVRlJRU3hEUVhaQ1JEczdRVUY1UWtFc1NVRkJUU3hqUVVGakxGTkJRV1FzVjBGQll5eEhRVUZOTzBGQlEzcENMRXRCUVVrc1VVRkJVU3hUUVVGVExHTkJRVlFzUTBGQmQwSXNaVUZCZUVJc1EwRkJXanRCUVVOQkxFOUJRVTBzWTBGQlRpeERRVUZ4UWl4RlFVRkRMRlZCUVZVc1VVRkJXQ3hGUVVGeFFpeFBRVUZQTEU5QlFUVkNMRVZCUVhKQ08wRkJRMEVzUTBGSVJEczdRVUZMUVN4SlFVRkpMR0ZCUVVvN1FVRkRRU3hKUVVGSkxGVkJRVlVzUTBGQlpEdEJRVU5CTEVsQlFVa3NXVUZCV1N4TFFVRm9RanRCUVVOQkxFbEJRVTBzZFVKQlFYVkNMRk5CUVhaQ0xHOUNRVUYxUWl4SFFVRk5PMEZCUTJ4RExGRkJRVThzWjBKQlFWQXNRMEZCZDBJc1QwRkJlRUlzUlVGQmFVTXNXVUZCVFR0QlFVTjBRenRCUVVOQkxFVkJSa1E3TzBGQlNVRXNWMEZCVlN4blFrRkJWaXhEUVVFeVFpeFJRVUV6UWl4RlFVRnhReXhaUVVGTk96dEJRVVV4UXl4TlFVRkpMRWxCUVVrc1QwRkJUeXh4UWtGQlVDeEhRVUVyUWl4RFFVRjJRenRCUVVOQkxFMUJRVWtzV1VGQldTeERRVUZvUWl4RlFVRnRRanRCUVVOc1FpeFZRVUZQTEU5QlFWQTdRVUZEUVN4aFFVRlZMRU5CUVZZN1FVRkRRVHM3UVVGRlJDeE5RVUZKTEV0QlFVc3NRMEZCUXl4RlFVRk9MRWxCUVZrc1EwRkJReXhUUVVGcVFpeEZRVUUwUWp0QlFVTXpRaXhWUVVGUExGTkJRVkFzUTBGQmFVSXNSMEZCYWtJc1EwRkJjVUlzVFVGQmNrSTdRVUZEUVN4bFFVRlpMRWxCUVZvN1FVRkRRU3hIUVVoRUxFMUJSMDhzU1VGQlNTeEpRVUZKTEVOQlFVTXNSVUZCVEN4SlFVRlhMRk5CUVdZc1JVRkJNRUk3UVVGRGFFTXNWVUZCVHl4VFFVRlFMRU5CUVdsQ0xFMUJRV3BDTEVOQlFYZENMRTFCUVhoQ08wRkJRMEVzWlVGQldTeExRVUZhTzBGQlEwRTdRVUZEUkN4RlFXWkVPMEZCWjBKQkxFTkJja0pFT3p0QlFYVkNRU3hKUVVGTkxIbENRVUY1UWl4VFFVRjZRaXh6UWtGQmVVSXNSMEZCVFR0QlFVTndReXhMUVVGSkxGbEJRVmtzVTBGQlV5eGpRVUZVTEVOQlFYZENMR05CUVhoQ0xFTkJRV2hDTzBGQlEwRXNTMEZCU1N4WFFVRlhMRk5CUVZNc1kwRkJWQ3hEUVVGM1FpeGhRVUY0UWl4RFFVRm1PMEZCUTBFc1YwRkJWU3huUWtGQlZpeERRVUV5UWl4UFFVRXpRaXhGUVVGdlF5eFpRVUZOTzBGQlEzcERMRTFCUVVrc1QwRkJTaXhGUVVGaE8wRkJRMW83UVVGRFFTeGhRVUZWTEVOQlFWWTdRVUZEUVN4aFFVRlZMRk5CUVZZc1EwRkJiMElzUjBGQmNFSXNRMEZCZDBJc1VVRkJlRUk3UVVGRFFTeFpRVUZUTEZOQlFWUXNRMEZCYlVJc1RVRkJia0lzUTBGQk1FSXNVVUZCTVVJN08wRkJSVUU3UVVGRFFUdEJRVU5FTEVWQlZFUTdPMEZCVjBFc1ZVRkJVeXhuUWtGQlZDeERRVUV3UWl4UFFVRXhRaXhGUVVGdFF5eFpRVUZOTzBGQlEzaERMRTFCUVVrc1EwRkJReXhQUVVGTUxFVkJRV003UVVGRFlqdEJRVU5CTEdGQlFWVXNRMEZCVmp0QlFVTkJMRmxCUVZNc1UwRkJWQ3hEUVVGdFFpeEhRVUZ1UWl4RFFVRjFRaXhSUVVGMlFqdEJRVU5CTEdGQlFWVXNVMEZCVml4RFFVRnZRaXhOUVVGd1FpeERRVUV5UWl4UlFVRXpRanM3UVVGRlFUdEJRVU5CTzBGQlEwUXNSVUZVUkR0QlFWVkJMRU5CZUVKRU96dEJRVEJDUVN4SlFVRk5MR1ZCUVdVc1UwRkJaaXhaUVVGbExFTkJRVU1zV1VGQlJDeEZRVUZyUWp0QlFVTjBReXhMUVVGSkxGZEJRVmNzVFVGQlRTeEpRVUZPTEVOQlFWY3NVMEZCVXl4blFrRkJWQ3hEUVVFd1FpeFpRVUV4UWl4RFFVRllMRU5CUVdZN1FVRkRRU3hWUVVGVExFOUJRVlFzUTBGQmFVSTdRVUZCUVN4VFFVRlRMRTFCUVUwc1pVRkJUaXhEUVVGelFpeE5RVUYwUWl4RFFVRlVPMEZCUVVFc1JVRkJha0k3UVVGRFFTeERRVWhFT3p0QlFVdEJMRWxCUVUwc2FVSkJRV2xDTEZOQlFXcENMR05CUVdsQ0xFTkJRVU1zU1VGQlJDeEZRVUZWTzBGQlEyaERMRXRCUVVrc1YwRkJWeXhWUVVGVkxHbENRVUZXTEVkQlFUaENMR3RDUVVFM1F6dEJRVU5CTEV0QlFVa3NaVUZCWlN4RFFVRkRMRTlCUVVRc1IwRkJWeXhwUWtGQldDeEhRVUVyUWl4clFrRkJiRVE3UVVGRFFTeExRVUZKTEZkQlFWY3NUVUZCVFN4SlFVRk9MRU5CUVZjc1UwRkJVeXhuUWtGQlZDeERRVUV3UWl4UlFVRXhRaXhEUVVGWUxFTkJRV1k3TzBGQlJVRXNZMEZCWVN4WlFVRmlPenRCUVVWQkxGRkJRVThzVTBGQlV5eEpRVUZVTEVOQlFXTXNhVUpCUVZNN1FVRkROMElzVFVGQlNTeFBRVUZQTEUxQlFVMHNhMEpCUVdwQ08wRkJRMEVzVTBGQlR5eExRVUZMTEZOQlFVd3NRMEZCWlN4RFFVRm1MRTFCUVhOQ0xFbEJRWFJDTEVsQlFUaENMRXRCUVVzc1UwRkJUQ3hEUVVGbExFTkJRV1lzVFVGQmMwSXNTMEZCU3l4WFFVRk1MRVZCUVRORU8wRkJRMEVzUlVGSVRTeERRVUZRTzBGQlNVRXNRMEZZUkRzN1FVRmpRU3hKUVVGTkxHVkJRV1VzVTBGQlppeFpRVUZsTEVkQlFVMDdRVUZETVVJc1MwRkJUU3gxUWtGQmRVSXNVMEZCZGtJc2IwSkJRWFZDTEVOQlFVTXNUMEZCUkN4RlFVRlZMRTFCUVZZc1JVRkJjVUk3UVVGRGFrUXNWVUZCVVN4blFrRkJVaXhEUVVGNVFpeFBRVUY2UWl4RlFVRnJReXhaUVVGTk8wRkJRM1pETEU5QlFVMHNZVUZCWVN4VFFVRlRMR05CUVZRc1EwRkJkMElzVFVGQmVFSXNRMEZCYmtJN1FVRkRRU3hQUVVGSkxHVkJRVW83TzBGQlJVRXNUMEZCU1N4RFFVRkRMRTlCUVV3c1JVRkJZenRCUVVOaUxHRkJRVk1zVjBGQlZ5eEhRVUZZTEVkQlFXbENMRk5CUVZNc1kwRkJWQ3hEUVVGM1FpeGxRVUY0UWl4RFFVRnFRaXhIUVVFMFJDeFhRVUZYTEdGQlFWZ3NRMEZCZVVJc1lVRkJla0lzUTBGQmRVTXNZVUZCZGtNc1EwRkJjVVFzWVVGQmNrUXNRMEZCYlVVc2MwSkJRVzVGTEVOQlFUQkdMR0ZCUVRGR0xFTkJRWGRITERKQ1FVRjRSeXhEUVVGeVJUdEJRVU5CTEVsQlJrUXNUVUZGVHp0QlFVTk9MR0ZCUVZNc1YwRkJWeXhIUVVGWUxFZEJRV2xDTEZOQlFWTXNZMEZCVkN4RFFVRjNRaXhsUVVGNFFpeERRVUZxUWl4SFFVRTBSQ3hYUVVGWExHRkJRVmdzUTBGQmVVSXNZVUZCZWtJc1EwRkJkVU1zWVVGQmRrTXNRMEZCY1VRc2MwSkJRWEpFTEVOQlFUUkZMR0ZCUVRWRkxFTkJRVEJHTERKQ1FVRXhSaXhEUVVGeVJUdEJRVU5CT3p0QlFVVkVMRlZCUVU4c1kwRkJVQ3hEUVVGelFpeEZRVUZETEZWQlFWVXNVVUZCV0N4RlFVRnhRaXhQUVVGUExFOUJRVFZDTEVWQlFYUkNPMEZCUTBFc1IwRllSRHRCUVZsQkxFVkJZa1E3TzBGQlpVRXNTMEZCU1N4blFrRkJaMElzUlVGQmNFSTdRVUZEUVN4TFFVRkpMRk5CUVZNc1UwRkJVeXhoUVVGVUxFTkJRWFZDTEc5Q1FVRjJRaXhEUVVGaU8wRkJRMEVzVVVGQlR5eFRRVUZRTEVkQlFXMUNMRVZCUVc1Q096dEJRVVZCTEZWQlFWTXNUMEZCVkN4RFFVRnBRaXhyUWtGQlZUdEJRVU14UWl4TlFVRkpMR05CUVdNc1pVRkJaU3hOUVVGbUxFTkJRV3hDTzBGQlEwRXNUVUZCU1N4VlFVRlZMRk5CUVZNc1lVRkJWQ3hEUVVGMVFpeEhRVUYyUWl4RFFVRmtPenRCUVVWQkxFMUJRVWtzUTBGQlF5eFhRVUZNTEVWQlFXdENPenRCUVVWc1FpeGpRVUZaTEVWQlFWb3NSMEZCYVVJc1RVRkJha0k3UVVGRFFTeFZRVUZSTEZOQlFWSXNSMEZCYjBJc1QwRkJUeXhYUVVGUUxFVkJRWEJDTzBGQlEwRXNWVUZCVVN4VFFVRlNMRWRCUVc5Q0xIbENRVUZ3UWpzN1FVRkZRU3gxUWtGQmNVSXNUMEZCY2tJc1JVRkJPRUlzVFVGQk9VSTdRVUZEUVN4VFFVRlBMRmRCUVZBc1EwRkJiVUlzVDBGQmJrSTdRVUZEUVN4RlFWcEVPMEZCWVVFc1EwRnFRMFE3TzBGQmJVTkJMRWxCUVUwc1pVRkJaU3hUUVVGbUxGbEJRV1VzUTBGQlF5eE5RVUZFTEVWQlFWTXNUMEZCVkN4RlFVRnhRanRCUVVONlF5eFJRVUZQTEU5QlFWQXNRMEZCWlN4cFFrRkJVenRCUVVOMlFpeE5RVUZOTEN0Q1FVRTJRaXhMUVVGdVF6dEJRVU5CTEUxQlFVa3NUMEZCVHl4VFFVRlRMR0ZCUVZRc1EwRkJkVUlzUzBGQmRrSXNRMEZCV0R0QlFVTkJMRTlCUVVzc1UwRkJUQ3hIUVVGcFFpeGxRVUZxUWp0QlFVTkJMRTlCUVVzc1IwRkJUQ3hIUVVGWExFZEJRVmc3UVVGRFFTeFZRVUZSTEZkQlFWSXNRMEZCYjBJc1NVRkJjRUk3UVVGRFFTeEZRVTVFTzBGQlQwRXNRMEZTUkRzN1FVRlZRU3hKUVVGTkxHZENRVUZuUWl4VFFVRm9RaXhoUVVGblFpeEhRVUZOTzBGQlF6TkNMRXRCUVVrc1pVRkJaU3hUUVVGVExHTkJRVlFzUTBGQmQwSXNVMEZCZUVJc1EwRkJia0k3UVVGRFFTeExRVUZKTEdOQlFXTXNWVUZCVlN4UlFVRlJMRTlCUVd4Q0xFZEJRVFJDTEZGQlFWRXNVVUZCZEVRN08wRkJSVUVzWTBGQllTeFRRVUZpTEVkQlFYbENMRVZCUVhwQ096dEJRVVZCTEdGQlFWa3NUMEZCV2l4RFFVRnZRaXhwUWtGQlV6dEJRVUZCTEUxQlEzUkNMRXRCUkhOQ0xFZEJRM05ETEV0QlJIUkRMRU5CUTNSQ0xFdEJSSE5DTzBGQlFVRXNUVUZEWml4UlFVUmxMRWRCUTNORExFdEJSSFJETEVOQlEyWXNVVUZFWlR0QlFVRkJMRTFCUTB3c1UwRkVTeXhIUVVOelF5eExRVVIwUXl4RFFVTk1MRk5CUkVzN1FVRkJRU3hOUVVOTkxFMUJSRTRzUjBGRGMwTXNTMEZFZEVNc1EwRkRUU3hOUVVST08wRkJRVUVzVFVGRFl5eFhRVVJrTEVkQlEzTkRMRXRCUkhSRExFTkJRMk1zVjBGRVpEdEJRVUZCTEUxQlF6SkNMRTFCUkROQ0xFZEJRM05ETEV0QlJIUkRMRU5CUXpKQ0xFMUJSRE5DT3pzN1FVRkhOVUlzWlVGQllTeHJRa0ZCWWl4RFFVRm5ReXhYUVVGb1F5eEZRVUUyUXl4NVFrRkJOME03TzBGQlJVRXNUVUZCU1N4bFFVRmxMRk5CUVZNc1owSkJRVlFzUTBGQk1FSXNkMEpCUVRGQ0xFTkJRVzVDTzBGQlEwRXNUVUZCU1N4VlFVRlZMR0ZCUVdFc1lVRkJZU3hOUVVGaUxFZEJRWE5DTEVOQlFXNURMRU5CUVdRN08wRkJSVUVzVFVGQlNTeFBRVUZQTEUxQlFWZ3NSVUZCYlVJc1lVRkJZU3hOUVVGaUxFVkJRWEZDTEU5QlFYSkNPenRCUVVWdVFpeE5RVUZKTEc5Q1FVRnZRaXhUUVVGVExHRkJRVlFzUTBGQmRVSXNTMEZCZGtJc1EwRkJlRUk3UVVGRFFTeE5RVUZKTEcxQ1FVRnRRaXhUUVVGVExHRkJRVlFzUTBGQmRVSXNSMEZCZGtJc1EwRkJka0k3UVVGRFFTeE5RVUZKTEdOQlFXTXNVMEZCVXl4aFFVRlVMRU5CUVhWQ0xFZEJRWFpDTEVOQlFXeENPMEZCUTBFc2IwSkJRV3RDTEZOQlFXeENMRU5CUVRSQ0xFZEJRVFZDTEVOQlFXZERMRFJDUVVGb1F6dEJRVU5CTEcxQ1FVRnBRaXhUUVVGcVFpeERRVUV5UWl4SFFVRXpRaXhEUVVFclFpeHhRa0ZCTDBJN1FVRkRRU3hqUVVGWkxGTkJRVm9zUTBGQmMwSXNSMEZCZEVJc1EwRkJNRUlzWjBKQlFURkNPenRCUVVWQkxHMUNRVUZwUWl4VFFVRnFRaXhIUVVFMlFpeFhRVUUzUWp0QlFVTkJMR05CUVZrc1UwRkJXaXhIUVVGM1FpeE5RVUY0UWpzN1FVRkZRU3h2UWtGQmEwSXNWMEZCYkVJc1EwRkJPRUlzWjBKQlFUbENMRVZCUVdkRUxGZEJRV2hFTzBGQlEwRXNWVUZCVVN4WFFVRlNMRU5CUVc5Q0xHbENRVUZ3UWpzN1FVRkZRU3hOUVVGSkxHTkJRV01zVTBGQlV5eG5Ra0ZCVkN4RFFVRXdRaXg1UWtGQk1VSXNRMEZCYkVJN1FVRkRRU3hOUVVGSkxGTkJRVk1zV1VGQldTeFpRVUZaTEUxQlFWb3NSMEZCY1VJc1EwRkJha01zUTBGQllqczdRVUZGUVN4TlFVRkpMR05CUVdNc1UwRkJVeXhuUWtGQlZDeERRVUV3UWl3clFrRkJNVUlzUTBGQmJFSTdRVUZEUVN4TlFVRkpMRk5CUVZNc1dVRkJXU3haUVVGWkxFMUJRVm9zUjBGQmNVSXNRMEZCYWtNc1EwRkJZanM3UVVGRlFTeE5RVUZKTEdGQlFXRXNVMEZCVXl4blFrRkJWQ3hEUVVFd1FpdzRRa0ZCTVVJc1EwRkJha0k3UVVGRFFTeE5RVUZKTEZGQlFWRXNWMEZCVnl4WFFVRlhMRTFCUVZnc1IwRkJiMElzUTBGQkwwSXNRMEZCV2pzN1FVRkZRU3hUUVVGUExGTkJRVkFzUjBGQmJVSXNTMEZCYmtJN1FVRkRRU3hUUVVGUExGTkJRVkFzUjBGQmJVSXNVMEZCYmtJN1FVRkRRU3hSUVVGTkxGTkJRVTRzUjBGQmEwSXNVVUZCYkVJN1FVRkZRU3hGUVhCRFJEczdRVUZ6UTBFN1FVRkRRVHRCUVVOQkxFTkJPVU5FT3p0QlFXZEVRVHRCUVVOQkxFbEJRVTBzWTBGQll5eFRRVUZrTEZkQlFXTXNSMEZCVFR0QlFVTjZRaXhUUVVGUkxFOUJRVklzUTBGQlowSXNTVUZCYUVJc1EwRkJjVUlzVlVGQlF5eERRVUZFTEVWQlFVa3NRMEZCU2l4RlFVRlZPMEZCUXpsQ0xFMUJRVWtzVTBGQlV5eEZRVUZGTEV0QlFVWXNRMEZCVVN4RFFVRlNMRVZCUVZjc1YwRkJXQ3hGUVVGaU8wRkJRMEVzVFVGQlNTeFRRVUZUTEVWQlFVVXNTMEZCUml4RFFVRlJMRU5CUVZJc1JVRkJWeXhYUVVGWUxFVkJRV0k3UVVGRFFTeE5RVUZKTEZOQlFWTXNUVUZCWWl4RlFVRnhRaXhQUVVGUExFTkJRVkFzUTBGQmNrSXNTMEZEU3l4SlFVRkpMRk5CUVZNc1RVRkJZaXhGUVVGeFFpeFBRVUZQTEVOQlFVTXNRMEZCVWl4RFFVRnlRaXhMUVVOQkxFOUJRVThzUTBGQlVEdEJRVU5NTEVWQlRrUTdRVUZQUVN4RFFWSkVPenRCUVZWQkxFbEJRVTBzVlVGQlZTeFRRVUZXTEU5QlFWVXNRMEZCUXl4SlFVRkVMRVZCUVZVN1FVRkRla0lzVTBGQlVTeFJRVUZTTEVkQlFXMUNMRWxCUVc1Q08wRkJRMEVzVTBGQlVTeFBRVUZTTEVkQlFXdENMRXRCUVVzc1MwRkJUQ3hGUVVGc1FqdEJRVU5CTzBGQlEwRTdRVUZEUVN4RFFVeEVPenRCUVU5QkxFbEJRVTBzV1VGQldTeFRRVUZhTEZOQlFWa3NSMEZCVFR0QlFVTjBRaXhQUVVGTkxFVkJRVTRzUlVGQlZTeEpRVUZXTEVOQlFXVTdRVUZCUVN4VFFVTmtMRWxCUVVrc1NVRkJTaXhGUVVSak8wRkJRVUVzUlVGQlppeEZRVVZGTEVsQlJrWXNRMEZGVHl4blFrRkJVVHRCUVVOa0xGVkJRVkVzU1VGQlVqdEJRVU5CTEVWQlNrUXNSVUZMUXl4SlFVeEVMRU5CUzAwc1dVRkJUVHRCUVVOWUxGZEJRVk1zVDBGQlZDeERRVUZwUWp0QlFVRkJMRlZCUVZFc1MwRkJTeXhUUVVGTUxFTkJRV1VzUjBGQlppeERRVUZ0UWl4UFFVRnVRaXhEUVVGU08wRkJRVUVzUjBGQmFrSTdRVUZEUVN4UFFVRkxMRk5CUVV3c1EwRkJaU3hIUVVGbUxFTkJRVzFDTEU5QlFXNUNPMEZCUTBFc1JVRlNSQ3hGUVZORExFdEJWRVFzUTBGVFR6dEJRVUZCTEZOQlFVOHNVVUZCVVN4SlFVRlNMRU5CUVdFc1IwRkJZaXhEUVVGUU8wRkJRVUVzUlVGVVVEdEJRVlZFTEVOQldFUTdPMEZCWVVFc1NVRkJUU3hQUVVGUExGTkJRVkFzU1VGQlR5eEhRVUZOTzBGQlEyeENMR2REUVVGaExGRkJRV0k3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRU3hEUVZKRU96dEJRVlZCT3pzN096czdPenRCUXpkU1FTeEpRVUZOTEc5c1FrRkJUanM3UVVGblFrRXNTVUZCVFN4UlFVRlJMRk5CUVZJc1MwRkJVU3hIUVVGTk8wRkJRMjVDTEV0QlFVa3NWMEZCVnl4VFFVRlRMR05CUVZRc1EwRkJkMElzVVVGQmVFSXNRMEZCWmp0QlFVTkJMRlZCUVZNc1UwRkJWQ3hIUVVGeFFpeFJRVUZ5UWp0QlFVTkJMRU5CU0VRN08ydENRVXRsTEVzaUxDSm1hV3hsSWpvaVoyVnVaWEpoZEdWa0xtcHpJaXdpYzI5MWNtTmxVbTl2ZENJNklpSXNJbk52ZFhKalpYTkRiMjUwWlc1MElqcGJJaWhtZFc1amRHbHZiaWdwZTJaMWJtTjBhVzl1SUhJb1pTeHVMSFFwZTJaMWJtTjBhVzl1SUc4b2FTeG1LWHRwWmlnaGJsdHBYU2w3YVdZb0lXVmJhVjBwZTNaaGNpQmpQVndpWm5WdVkzUnBiMjVjSWowOWRIbHdaVzltSUhKbGNYVnBjbVVtSm5KbGNYVnBjbVU3YVdZb0lXWW1KbU1wY21WMGRYSnVJR01vYVN3aE1DazdhV1lvZFNseVpYUjFjbTRnZFNocExDRXdLVHQyWVhJZ1lUMXVaWGNnUlhKeWIzSW9YQ0pEWVc1dWIzUWdabWx1WkNCdGIyUjFiR1VnSjF3aUsya3JYQ0luWENJcE8zUm9jbTkzSUdFdVkyOWtaVDFjSWsxUFJGVk1SVjlPVDFSZlJrOVZUa1JjSWl4aGZYWmhjaUJ3UFc1YmFWMDllMlY0Y0c5eWRITTZlMzE5TzJWYmFWMWJNRjB1WTJGc2JDaHdMbVY0Y0c5eWRITXNablZ1WTNScGIyNG9jaWw3ZG1GeUlHNDlaVnRwWFZzeFhWdHlYVHR5WlhSMWNtNGdieWh1Zkh4eUtYMHNjQ3h3TG1WNGNHOXlkSE1zY2l4bExHNHNkQ2w5Y21WMGRYSnVJRzViYVYwdVpYaHdiM0owYzMxbWIzSW9kbUZ5SUhVOVhDSm1kVzVqZEdsdmJsd2lQVDEwZVhCbGIyWWdjbVZ4ZFdseVpTWW1jbVZ4ZFdseVpTeHBQVEE3YVR4MExteGxibWQwYUR0cEt5c3BieWgwVzJsZEtUdHlaWFIxY200Z2IzMXlaWFIxY200Z2NuMHBLQ2tpTENJdktpQnpiVzl2ZEdoelkzSnZiR3dnZGpBdU5DNHdJQzBnTWpBeE9DQXRJRVIxYzNSaGJpQkxZWE4wWlc0c0lFcGxjbVZ0YVdGeklFMWxibWxqYUdWc2JHa2dMU0JOU1ZRZ1RHbGpaVzV6WlNBcUwxeHVLR1oxYm1OMGFXOXVJQ2dwSUh0Y2JpQWdKM1Z6WlNCemRISnBZM1FuTzF4dVhHNGdJQzh2SUhCdmJIbG1hV3hzWEc0Z0lHWjFibU4wYVc5dUlIQnZiSGxtYVd4c0tDa2dlMXh1SUNBZ0lDOHZJR0ZzYVdGelpYTmNiaUFnSUNCMllYSWdkeUE5SUhkcGJtUnZkenRjYmlBZ0lDQjJZWElnWkNBOUlHUnZZM1Z0Wlc1ME8xeHVYRzRnSUNBZ0x5OGdjbVYwZFhKdUlHbG1JSE5qY205c2JDQmlaV2hoZG1sdmNpQnBjeUJ6ZFhCd2IzSjBaV1FnWVc1a0lIQnZiSGxtYVd4c0lHbHpJRzV2ZENCbWIzSmpaV1JjYmlBZ0lDQnBaaUFvWEc0Z0lDQWdJQ0FuYzJOeWIyeHNRbVZvWVhacGIzSW5JR2x1SUdRdVpHOWpkVzFsYm5SRmJHVnRaVzUwTG5OMGVXeGxJQ1ltWEc0Z0lDQWdJQ0IzTGw5ZlptOXlZMlZUYlc5dmRHaFRZM0p2Ykd4UWIyeDVabWxzYkY5ZklDRTlQU0IwY25WbFhHNGdJQ0FnS1NCN1hHNGdJQ0FnSUNCeVpYUjFjbTQ3WEc0Z0lDQWdmVnh1WEc0Z0lDQWdMeThnWjJ4dlltRnNjMXh1SUNBZ0lIWmhjaUJGYkdWdFpXNTBJRDBnZHk1SVZFMU1SV3hsYldWdWRDQjhmQ0IzTGtWc1pXMWxiblE3WEc0Z0lDQWdkbUZ5SUZORFVrOU1URjlVU1UxRklEMGdORFk0TzF4dVhHNGdJQ0FnTHk4Z2IySnFaV04wSUdkaGRHaGxjbWx1WnlCdmNtbG5hVzVoYkNCelkzSnZiR3dnYldWMGFHOWtjMXh1SUNBZ0lIWmhjaUJ2Y21sbmFXNWhiQ0E5SUh0Y2JpQWdJQ0FnSUhOamNtOXNiRG9nZHk1elkzSnZiR3dnZkh3Z2R5NXpZM0p2Ykd4VWJ5eGNiaUFnSUNBZ0lITmpjbTlzYkVKNU9pQjNMbk5qY205c2JFSjVMRnh1SUNBZ0lDQWdaV3hsYldWdWRGTmpjbTlzYkRvZ1JXeGxiV1Z1ZEM1d2NtOTBiM1I1Y0dVdWMyTnliMnhzSUh4OElITmpjbTlzYkVWc1pXMWxiblFzWEc0Z0lDQWdJQ0J6WTNKdmJHeEpiblJ2Vm1sbGR6b2dSV3hsYldWdWRDNXdjbTkwYjNSNWNHVXVjMk55YjJ4c1NXNTBiMVpwWlhkY2JpQWdJQ0I5TzF4dVhHNGdJQ0FnTHk4Z1pHVm1hVzVsSUhScGJXbHVaeUJ0WlhSb2IyUmNiaUFnSUNCMllYSWdibTkzSUQxY2JpQWdJQ0FnSUhjdWNHVnlabTl5YldGdVkyVWdKaVlnZHk1d1pYSm1iM0p0WVc1alpTNXViM2RjYmlBZ0lDQWdJQ0FnUHlCM0xuQmxjbVp2Y20xaGJtTmxMbTV2ZHk1aWFXNWtLSGN1Y0dWeVptOXliV0Z1WTJVcFhHNGdJQ0FnSUNBZ0lEb2dSR0YwWlM1dWIzYzdYRzVjYmlBZ0lDQXZLaXBjYmlBZ0lDQWdLaUJwYm1ScFkyRjBaWE1nYVdZZ1lTQjBhR1VnWTNWeWNtVnVkQ0JpY205M2MyVnlJR2x6SUcxaFpHVWdZbmtnVFdsamNtOXpiMlowWEc0Z0lDQWdJQ29nUUcxbGRHaHZaQ0JwYzAxcFkzSnZjMjltZEVKeWIzZHpaWEpjYmlBZ0lDQWdLaUJBY0dGeVlXMGdlMU4wY21sdVozMGdkWE5sY2tGblpXNTBYRzRnSUNBZ0lDb2dRSEpsZEhWeWJuTWdlMEp2YjJ4bFlXNTlYRzRnSUNBZ0lDb3ZYRzRnSUNBZ1puVnVZM1JwYjI0Z2FYTk5hV055YjNOdlpuUkNjbTkzYzJWeUtIVnpaWEpCWjJWdWRDa2dlMXh1SUNBZ0lDQWdkbUZ5SUhWelpYSkJaMlZ1ZEZCaGRIUmxjbTV6SUQwZ1d5ZE5VMGxGSUNjc0lDZFVjbWxrWlc1MEx5Y3NJQ2RGWkdkbEx5ZGRPMXh1WEc0Z0lDQWdJQ0J5WlhSMWNtNGdibVYzSUZKbFowVjRjQ2gxYzJWeVFXZGxiblJRWVhSMFpYSnVjeTVxYjJsdUtDZDhKeWtwTG5SbGMzUW9kWE5sY2tGblpXNTBLVHRjYmlBZ0lDQjlYRzVjYmlBZ0lDQXZLbHh1SUNBZ0lDQXFJRWxGSUdoaGN5QnliM1Z1WkdsdVp5QmlkV2NnY205MWJtUnBibWNnWkc5M2JpQmpiR2xsYm5SSVpXbG5hSFFnWVc1a0lHTnNhV1Z1ZEZkcFpIUm9JR0Z1WkZ4dUlDQWdJQ0FxSUhKdmRXNWthVzVuSUhWd0lITmpjbTlzYkVobGFXZG9kQ0JoYm1RZ2MyTnliMnhzVjJsa2RHZ2dZMkYxYzJsdVp5Qm1ZV3h6WlNCd2IzTnBkR2wyWlhOY2JpQWdJQ0FnS2lCdmJpQm9ZWE5UWTNKdmJHeGhZbXhsVTNCaFkyVmNiaUFnSUNBZ0tpOWNiaUFnSUNCMllYSWdVazlWVGtSSlRrZGZWRTlNUlZKQlRrTkZJRDBnYVhOTmFXTnliM052Wm5SQ2NtOTNjMlZ5S0hjdWJtRjJhV2RoZEc5eUxuVnpaWEpCWjJWdWRDa2dQeUF4SURvZ01EdGNibHh1SUNBZ0lDOHFLbHh1SUNBZ0lDQXFJR05vWVc1blpYTWdjMk55YjJ4c0lIQnZjMmwwYVc5dUlHbHVjMmxrWlNCaGJpQmxiR1Z0Wlc1MFhHNGdJQ0FnSUNvZ1FHMWxkR2h2WkNCelkzSnZiR3hGYkdWdFpXNTBYRzRnSUNBZ0lDb2dRSEJoY21GdElIdE9kVzFpWlhKOUlIaGNiaUFnSUNBZ0tpQkFjR0Z5WVcwZ2UwNTFiV0psY24wZ2VWeHVJQ0FnSUNBcUlFQnlaWFIxY201eklIdDFibVJsWm1sdVpXUjlYRzRnSUNBZ0lDb3ZYRzRnSUNBZ1puVnVZM1JwYjI0Z2MyTnliMnhzUld4bGJXVnVkQ2g0TENCNUtTQjdYRzRnSUNBZ0lDQjBhR2x6TG5OamNtOXNiRXhsWm5RZ1BTQjRPMXh1SUNBZ0lDQWdkR2hwY3k1elkzSnZiR3hVYjNBZ1BTQjVPMXh1SUNBZ0lIMWNibHh1SUNBZ0lDOHFLbHh1SUNBZ0lDQXFJSEpsZEhWeWJuTWdjbVZ6ZFd4MElHOW1JR0Z3Y0d4NWFXNW5JR1ZoYzJVZ2JXRjBhQ0JtZFc1amRHbHZiaUIwYnlCaElHNTFiV0psY2x4dUlDQWdJQ0FxSUVCdFpYUm9iMlFnWldGelpWeHVJQ0FnSUNBcUlFQndZWEpoYlNCN1RuVnRZbVZ5ZlNCclhHNGdJQ0FnSUNvZ1FISmxkSFZ5Ym5NZ2UwNTFiV0psY24xY2JpQWdJQ0FnS2k5Y2JpQWdJQ0JtZFc1amRHbHZiaUJsWVhObEtHc3BJSHRjYmlBZ0lDQWdJSEpsZEhWeWJpQXdMalVnS2lBb01TQXRJRTFoZEdndVkyOXpLRTFoZEdndVVFa2dLaUJyS1NrN1hHNGdJQ0FnZlZ4dVhHNGdJQ0FnTHlvcVhHNGdJQ0FnSUNvZ2FXNWthV05oZEdWeklHbG1JR0VnYzIxdmIzUm9JR0psYUdGMmFXOXlJSE5vYjNWc1pDQmlaU0JoY0hCc2FXVmtYRzRnSUNBZ0lDb2dRRzFsZEdodlpDQnphRzkxYkdSQ1lXbHNUM1YwWEc0Z0lDQWdJQ29nUUhCaGNtRnRJSHRPZFcxaVpYSjhUMkpxWldOMGZTQm1hWEp6ZEVGeVoxeHVJQ0FnSUNBcUlFQnlaWFIxY201eklIdENiMjlzWldGdWZWeHVJQ0FnSUNBcUwxeHVJQ0FnSUdaMWJtTjBhVzl1SUhOb2IzVnNaRUpoYVd4UGRYUW9abWx5YzNSQmNtY3BJSHRjYmlBZ0lDQWdJR2xtSUNoY2JpQWdJQ0FnSUNBZ1ptbHljM1JCY21jZ1BUMDlJRzUxYkd3Z2ZIeGNiaUFnSUNBZ0lDQWdkSGx3Wlc5bUlHWnBjbk4wUVhKbklDRTlQU0FuYjJKcVpXTjBKeUI4ZkZ4dUlDQWdJQ0FnSUNCbWFYSnpkRUZ5Wnk1aVpXaGhkbWx2Y2lBOVBUMGdkVzVrWldacGJtVmtJSHg4WEc0Z0lDQWdJQ0FnSUdacGNuTjBRWEpuTG1KbGFHRjJhVzl5SUQwOVBTQW5ZWFYwYnljZ2ZIeGNiaUFnSUNBZ0lDQWdabWx5YzNSQmNtY3VZbVZvWVhacGIzSWdQVDA5SUNkcGJuTjBZVzUwSjF4dUlDQWdJQ0FnS1NCN1hHNGdJQ0FnSUNBZ0lDOHZJR1pwY25OMElHRnlaM1Z0Wlc1MElHbHpJRzV2ZENCaGJpQnZZbXBsWTNRdmJuVnNiRnh1SUNBZ0lDQWdJQ0F2THlCdmNpQmlaV2hoZG1sdmNpQnBjeUJoZFhSdkxDQnBibk4wWVc1MElHOXlJSFZ1WkdWbWFXNWxaRnh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdkSEoxWlR0Y2JpQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ2FXWWdLSFI1Y0dWdlppQm1hWEp6ZEVGeVp5QTlQVDBnSjI5aWFtVmpkQ2NnSmlZZ1ptbHljM1JCY21jdVltVm9ZWFpwYjNJZ1BUMDlJQ2R6Ylc5dmRHZ25LU0I3WEc0Z0lDQWdJQ0FnSUM4dklHWnBjbk4wSUdGeVozVnRaVzUwSUdseklHRnVJRzlpYW1WamRDQmhibVFnWW1Wb1lYWnBiM0lnYVhNZ2MyMXZiM1JvWEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJtWVd4elpUdGNiaUFnSUNBZ0lIMWNibHh1SUNBZ0lDQWdMeThnZEdoeWIzY2daWEp5YjNJZ2QyaGxiaUJpWldoaGRtbHZjaUJwY3lCdWIzUWdjM1Z3Y0c5eWRHVmtYRzRnSUNBZ0lDQjBhSEp2ZHlCdVpYY2dWSGx3WlVWeWNtOXlLRnh1SUNBZ0lDQWdJQ0FuWW1Wb1lYWnBiM0lnYldWdFltVnlJRzltSUZOamNtOXNiRTl3ZEdsdmJuTWdKeUFyWEc0Z0lDQWdJQ0FnSUNBZ1ptbHljM1JCY21jdVltVm9ZWFpwYjNJZ0sxeHVJQ0FnSUNBZ0lDQWdJQ2NnYVhNZ2JtOTBJR0VnZG1Gc2FXUWdkbUZzZFdVZ1ptOXlJR1Z1ZFcxbGNtRjBhVzl1SUZOamNtOXNiRUpsYUdGMmFXOXlMaWRjYmlBZ0lDQWdJQ2s3WEc0Z0lDQWdmVnh1WEc0Z0lDQWdMeW9xWEc0Z0lDQWdJQ29nYVc1a2FXTmhkR1Z6SUdsbUlHRnVJR1ZzWlcxbGJuUWdhR0Z6SUhOamNtOXNiR0ZpYkdVZ2MzQmhZMlVnYVc0Z2RHaGxJSEJ5YjNacFpHVmtJR0Y0YVhOY2JpQWdJQ0FnS2lCQWJXVjBhRzlrSUdoaGMxTmpjbTlzYkdGaWJHVlRjR0ZqWlZ4dUlDQWdJQ0FxSUVCd1lYSmhiU0I3VG05a1pYMGdaV3hjYmlBZ0lDQWdLaUJBY0dGeVlXMGdlMU4wY21sdVozMGdZWGhwYzF4dUlDQWdJQ0FxSUVCeVpYUjFjbTV6SUh0Q2IyOXNaV0Z1ZlZ4dUlDQWdJQ0FxTDF4dUlDQWdJR1oxYm1OMGFXOXVJR2hoYzFOamNtOXNiR0ZpYkdWVGNHRmpaU2hsYkN3Z1lYaHBjeWtnZTF4dUlDQWdJQ0FnYVdZZ0tHRjRhWE1nUFQwOUlDZFpKeWtnZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnWld3dVkyeHBaVzUwU0dWcFoyaDBJQ3NnVWs5VlRrUkpUa2RmVkU5TVJWSkJUa05GSUR3Z1pXd3VjMk55YjJ4c1NHVnBaMmgwTzF4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNCcFppQW9ZWGhwY3lBOVBUMGdKMWduS1NCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCbGJDNWpiR2xsYm5SWGFXUjBhQ0FySUZKUFZVNUVTVTVIWDFSUFRFVlNRVTVEUlNBOElHVnNMbk5qY205c2JGZHBaSFJvTzF4dUlDQWdJQ0FnZlZ4dUlDQWdJSDFjYmx4dUlDQWdJQzhxS2x4dUlDQWdJQ0FxSUdsdVpHbGpZWFJsY3lCcFppQmhiaUJsYkdWdFpXNTBJR2hoY3lCaElITmpjbTlzYkdGaWJHVWdiM1psY21ac2IzY2djSEp2Y0dWeWRIa2dhVzRnZEdobElHRjRhWE5jYmlBZ0lDQWdLaUJBYldWMGFHOWtJR05oYms5MlpYSm1iRzkzWEc0Z0lDQWdJQ29nUUhCaGNtRnRJSHRPYjJSbGZTQmxiRnh1SUNBZ0lDQXFJRUJ3WVhKaGJTQjdVM1J5YVc1bmZTQmhlR2x6WEc0Z0lDQWdJQ29nUUhKbGRIVnlibk1nZTBKdmIyeGxZVzU5WEc0Z0lDQWdJQ292WEc0Z0lDQWdablZ1WTNScGIyNGdZMkZ1VDNabGNtWnNiM2NvWld3c0lHRjRhWE1wSUh0Y2JpQWdJQ0FnSUhaaGNpQnZkbVZ5Wm14dmQxWmhiSFZsSUQwZ2R5NW5aWFJEYjIxd2RYUmxaRk4wZVd4bEtHVnNMQ0J1ZFd4c0tWc25iM1psY21ac2IzY25JQ3NnWVhocGMxMDdYRzVjYmlBZ0lDQWdJSEpsZEhWeWJpQnZkbVZ5Wm14dmQxWmhiSFZsSUQwOVBTQW5ZWFYwYnljZ2ZId2diM1psY21ac2IzZFdZV3gxWlNBOVBUMGdKM05qY205c2JDYzdYRzRnSUNBZ2ZWeHVYRzRnSUNBZ0x5b3FYRzRnSUNBZ0lDb2dhVzVrYVdOaGRHVnpJR2xtSUdGdUlHVnNaVzFsYm5RZ1kyRnVJR0psSUhOamNtOXNiR1ZrSUdsdUlHVnBkR2hsY2lCaGVHbHpYRzRnSUNBZ0lDb2dRRzFsZEdodlpDQnBjMU5qY205c2JHRmliR1ZjYmlBZ0lDQWdLaUJBY0dGeVlXMGdlMDV2WkdWOUlHVnNYRzRnSUNBZ0lDb2dRSEJoY21GdElIdFRkSEpwYm1kOUlHRjRhWE5jYmlBZ0lDQWdLaUJBY21WMGRYSnVjeUI3UW05dmJHVmhibjFjYmlBZ0lDQWdLaTljYmlBZ0lDQm1kVzVqZEdsdmJpQnBjMU5qY205c2JHRmliR1VvWld3cElIdGNiaUFnSUNBZ0lIWmhjaUJwYzFOamNtOXNiR0ZpYkdWWklEMGdhR0Z6VTJOeWIyeHNZV0pzWlZOd1lXTmxLR1ZzTENBbldTY3BJQ1ltSUdOaGJrOTJaWEptYkc5M0tHVnNMQ0FuV1NjcE8xeHVJQ0FnSUNBZ2RtRnlJR2x6VTJOeWIyeHNZV0pzWlZnZ1BTQm9ZWE5UWTNKdmJHeGhZbXhsVTNCaFkyVW9aV3dzSUNkWUp5a2dKaVlnWTJGdVQzWmxjbVpzYjNjb1pXd3NJQ2RZSnlrN1hHNWNiaUFnSUNBZ0lISmxkSFZ5YmlCcGMxTmpjbTlzYkdGaWJHVlpJSHg4SUdselUyTnliMnhzWVdKc1pWZzdYRzRnSUNBZ2ZWeHVYRzRnSUNBZ0x5b3FYRzRnSUNBZ0lDb2dabWx1WkhNZ2MyTnliMnhzWVdKc1pTQndZWEpsYm5RZ2IyWWdZVzRnWld4bGJXVnVkRnh1SUNBZ0lDQXFJRUJ0WlhSb2IyUWdabWx1WkZOamNtOXNiR0ZpYkdWUVlYSmxiblJjYmlBZ0lDQWdLaUJBY0dGeVlXMGdlMDV2WkdWOUlHVnNYRzRnSUNBZ0lDb2dRSEpsZEhWeWJuTWdlMDV2WkdWOUlHVnNYRzRnSUNBZ0lDb3ZYRzRnSUNBZ1puVnVZM1JwYjI0Z1ptbHVaRk5qY205c2JHRmliR1ZRWVhKbGJuUW9aV3dwSUh0Y2JpQWdJQ0FnSUhaaGNpQnBjMEp2WkhrN1hHNWNiaUFnSUNBZ0lHUnZJSHRjYmlBZ0lDQWdJQ0FnWld3Z1BTQmxiQzV3WVhKbGJuUk9iMlJsTzF4dVhHNGdJQ0FnSUNBZ0lHbHpRbTlrZVNBOUlHVnNJRDA5UFNCa0xtSnZaSGs3WEc0Z0lDQWdJQ0I5SUhkb2FXeGxJQ2hwYzBKdlpIa2dQVDA5SUdaaGJITmxJQ1ltSUdselUyTnliMnhzWVdKc1pTaGxiQ2tnUFQwOUlHWmhiSE5sS1R0Y2JseHVJQ0FnSUNBZ2FYTkNiMlI1SUQwZ2JuVnNiRHRjYmx4dUlDQWdJQ0FnY21WMGRYSnVJR1ZzTzF4dUlDQWdJSDFjYmx4dUlDQWdJQzhxS2x4dUlDQWdJQ0FxSUhObGJHWWdhVzUyYjJ0bFpDQm1kVzVqZEdsdmJpQjBhR0YwTENCbmFYWmxiaUJoSUdOdmJuUmxlSFFzSUhOMFpYQnpJSFJvY205MVoyZ2djMk55YjJ4c2FXNW5YRzRnSUNBZ0lDb2dRRzFsZEdodlpDQnpkR1Z3WEc0Z0lDQWdJQ29nUUhCaGNtRnRJSHRQWW1wbFkzUjlJR052Ym5SbGVIUmNiaUFnSUNBZ0tpQkFjbVYwZFhKdWN5QjdkVzVrWldacGJtVmtmVnh1SUNBZ0lDQXFMMXh1SUNBZ0lHWjFibU4wYVc5dUlITjBaWEFvWTI5dWRHVjRkQ2tnZTF4dUlDQWdJQ0FnZG1GeUlIUnBiV1VnUFNCdWIzY29LVHRjYmlBZ0lDQWdJSFpoY2lCMllXeDFaVHRjYmlBZ0lDQWdJSFpoY2lCamRYSnlaVzUwV0R0Y2JpQWdJQ0FnSUhaaGNpQmpkWEp5Wlc1MFdUdGNiaUFnSUNBZ0lIWmhjaUJsYkdGd2MyVmtJRDBnS0hScGJXVWdMU0JqYjI1MFpYaDBMbk4wWVhKMFZHbHRaU2tnTHlCVFExSlBURXhmVkVsTlJUdGNibHh1SUNBZ0lDQWdMeThnWVhadmFXUWdaV3hoY0hObFpDQjBhVzFsY3lCb2FXZG9aWElnZEdoaGJpQnZibVZjYmlBZ0lDQWdJR1ZzWVhCelpXUWdQU0JsYkdGd2MyVmtJRDRnTVNBL0lERWdPaUJsYkdGd2MyVmtPMXh1WEc0Z0lDQWdJQ0F2THlCaGNIQnNlU0JsWVhOcGJtY2dkRzhnWld4aGNITmxaQ0IwYVcxbFhHNGdJQ0FnSUNCMllXeDFaU0E5SUdWaGMyVW9aV3hoY0hObFpDazdYRzVjYmlBZ0lDQWdJR04xY25KbGJuUllJRDBnWTI5dWRHVjRkQzV6ZEdGeWRGZ2dLeUFvWTI5dWRHVjRkQzU0SUMwZ1kyOXVkR1Y0ZEM1emRHRnlkRmdwSUNvZ2RtRnNkV1U3WEc0Z0lDQWdJQ0JqZFhKeVpXNTBXU0E5SUdOdmJuUmxlSFF1YzNSaGNuUlpJQ3NnS0dOdmJuUmxlSFF1ZVNBdElHTnZiblJsZUhRdWMzUmhjblJaS1NBcUlIWmhiSFZsTzF4dVhHNGdJQ0FnSUNCamIyNTBaWGgwTG0xbGRHaHZaQzVqWVd4c0tHTnZiblJsZUhRdWMyTnliMnhzWVdKc1pTd2dZM1Z5Y21WdWRGZ3NJR04xY25KbGJuUlpLVHRjYmx4dUlDQWdJQ0FnTHk4Z2MyTnliMnhzSUcxdmNtVWdhV1lnZDJVZ2FHRjJaU0J1YjNRZ2NtVmhZMmhsWkNCdmRYSWdaR1Z6ZEdsdVlYUnBiMjVjYmlBZ0lDQWdJR2xtSUNoamRYSnlaVzUwV0NBaFBUMGdZMjl1ZEdWNGRDNTRJSHg4SUdOMWNuSmxiblJaSUNFOVBTQmpiMjUwWlhoMExua3BJSHRjYmlBZ0lDQWdJQ0FnZHk1eVpYRjFaWE4wUVc1cGJXRjBhVzl1Um5KaGJXVW9jM1JsY0M1aWFXNWtLSGNzSUdOdmJuUmxlSFFwS1R0Y2JpQWdJQ0FnSUgxY2JpQWdJQ0I5WEc1Y2JpQWdJQ0F2S2lwY2JpQWdJQ0FnS2lCelkzSnZiR3h6SUhkcGJtUnZkeUJ2Y2lCbGJHVnRaVzUwSUhkcGRHZ2dZU0J6Ylc5dmRHZ2dZbVZvWVhacGIzSmNiaUFnSUNBZ0tpQkFiV1YwYUc5a0lITnRiMjkwYUZOamNtOXNiRnh1SUNBZ0lDQXFJRUJ3WVhKaGJTQjdUMkpxWldOMGZFNXZaR1Y5SUdWc1hHNGdJQ0FnSUNvZ1FIQmhjbUZ0SUh0T2RXMWlaWEo5SUhoY2JpQWdJQ0FnS2lCQWNHRnlZVzBnZTA1MWJXSmxjbjBnZVZ4dUlDQWdJQ0FxSUVCeVpYUjFjbTV6SUh0MWJtUmxabWx1WldSOVhHNGdJQ0FnSUNvdlhHNGdJQ0FnWm5WdVkzUnBiMjRnYzIxdmIzUm9VMk55YjJ4c0tHVnNMQ0I0TENCNUtTQjdYRzRnSUNBZ0lDQjJZWElnYzJOeWIyeHNZV0pzWlR0Y2JpQWdJQ0FnSUhaaGNpQnpkR0Z5ZEZnN1hHNGdJQ0FnSUNCMllYSWdjM1JoY25SWk8xeHVJQ0FnSUNBZ2RtRnlJRzFsZEdodlpEdGNiaUFnSUNBZ0lIWmhjaUJ6ZEdGeWRGUnBiV1VnUFNCdWIzY29LVHRjYmx4dUlDQWdJQ0FnTHk4Z1pHVm1hVzVsSUhOamNtOXNiQ0JqYjI1MFpYaDBYRzRnSUNBZ0lDQnBaaUFvWld3Z1BUMDlJR1F1WW05a2VTa2dlMXh1SUNBZ0lDQWdJQ0J6WTNKdmJHeGhZbXhsSUQwZ2R6dGNiaUFnSUNBZ0lDQWdjM1JoY25SWUlEMGdkeTV6WTNKdmJHeFlJSHg4SUhjdWNHRm5aVmhQWm1aelpYUTdYRzRnSUNBZ0lDQWdJSE4wWVhKMFdTQTlJSGN1YzJOeWIyeHNXU0I4ZkNCM0xuQmhaMlZaVDJabWMyVjBPMXh1SUNBZ0lDQWdJQ0J0WlhSb2IyUWdQU0J2Y21sbmFXNWhiQzV6WTNKdmJHdzdYRzRnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQnpZM0p2Ykd4aFlteGxJRDBnWld3N1hHNGdJQ0FnSUNBZ0lITjBZWEowV0NBOUlHVnNMbk5qY205c2JFeGxablE3WEc0Z0lDQWdJQ0FnSUhOMFlYSjBXU0E5SUdWc0xuTmpjbTlzYkZSdmNEdGNiaUFnSUNBZ0lDQWdiV1YwYUc5a0lEMGdjMk55YjJ4c1JXeGxiV1Z1ZER0Y2JpQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0x5OGdjMk55YjJ4c0lHeHZiM0JwYm1jZ2IzWmxjaUJoSUdaeVlXMWxYRzRnSUNBZ0lDQnpkR1Z3S0h0Y2JpQWdJQ0FnSUNBZ2MyTnliMnhzWVdKc1pUb2djMk55YjJ4c1lXSnNaU3hjYmlBZ0lDQWdJQ0FnYldWMGFHOWtPaUJ0WlhSb2IyUXNYRzRnSUNBZ0lDQWdJSE4wWVhKMFZHbHRaVG9nYzNSaGNuUlVhVzFsTEZ4dUlDQWdJQ0FnSUNCemRHRnlkRmc2SUhOMFlYSjBXQ3hjYmlBZ0lDQWdJQ0FnYzNSaGNuUlpPaUJ6ZEdGeWRGa3NYRzRnSUNBZ0lDQWdJSGc2SUhnc1hHNGdJQ0FnSUNBZ0lIazZJSGxjYmlBZ0lDQWdJSDBwTzF4dUlDQWdJSDFjYmx4dUlDQWdJQzh2SUU5U1NVZEpUa0ZNSUUxRlZFaFBSRk1nVDFaRlVsSkpSRVZUWEc0Z0lDQWdMeThnZHk1elkzSnZiR3dnWVc1a0lIY3VjMk55YjJ4c1ZHOWNiaUFnSUNCM0xuTmpjbTlzYkNBOUlIY3VjMk55YjJ4c1ZHOGdQU0JtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0FnSUM4dklHRjJiMmxrSUdGamRHbHZiaUIzYUdWdUlHNXZJR0Z5WjNWdFpXNTBjeUJoY21VZ2NHRnpjMlZrWEc0Z0lDQWdJQ0JwWmlBb1lYSm5kVzFsYm5Seld6QmRJRDA5UFNCMWJtUmxabWx1WldRcElIdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdU8xeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQXZMeUJoZG05cFpDQnpiVzl2ZEdnZ1ltVm9ZWFpwYjNJZ2FXWWdibTkwSUhKbGNYVnBjbVZrWEc0Z0lDQWdJQ0JwWmlBb2MyaHZkV3hrUW1GcGJFOTFkQ2hoY21kMWJXVnVkSE5iTUYwcElEMDlQU0IwY25WbEtTQjdYRzRnSUNBZ0lDQWdJRzl5YVdkcGJtRnNMbk5qY205c2JDNWpZV3hzS0Z4dUlDQWdJQ0FnSUNBZ0lIY3NYRzRnSUNBZ0lDQWdJQ0FnWVhKbmRXMWxiblJ6V3pCZExteGxablFnSVQwOUlIVnVaR1ZtYVc1bFpGeHVJQ0FnSUNBZ0lDQWdJQ0FnUHlCaGNtZDFiV1Z1ZEhOYk1GMHViR1ZtZEZ4dUlDQWdJQ0FnSUNBZ0lDQWdPaUIwZVhCbGIyWWdZWEpuZFcxbGJuUnpXekJkSUNFOVBTQW5iMkpxWldOMEoxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBL0lHRnlaM1Z0Wlc1MGMxc3dYVnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQTZJSGN1YzJOeWIyeHNXQ0I4ZkNCM0xuQmhaMlZZVDJabWMyVjBMRnh1SUNBZ0lDQWdJQ0FnSUM4dklIVnpaU0IwYjNBZ2NISnZjQ3dnYzJWamIyNWtJR0Z5WjNWdFpXNTBJR2xtSUhCeVpYTmxiblFnYjNJZ1ptRnNiR0poWTJzZ2RHOGdjMk55YjJ4c1dWeHVJQ0FnSUNBZ0lDQWdJR0Z5WjNWdFpXNTBjMXN3WFM1MGIzQWdJVDA5SUhWdVpHVm1hVzVsWkZ4dUlDQWdJQ0FnSUNBZ0lDQWdQeUJoY21kMWJXVnVkSE5iTUYwdWRHOXdYRzRnSUNBZ0lDQWdJQ0FnSUNBNklHRnlaM1Z0Wlc1MGMxc3hYU0FoUFQwZ2RXNWtaV1pwYm1Wa1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUQ4Z1lYSm5kVzFsYm5Seld6RmRYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lEb2dkeTV6WTNKdmJHeFpJSHg4SUhjdWNHRm5aVmxQWm1aelpYUmNiaUFnSUNBZ0lDQWdLVHRjYmx4dUlDQWdJQ0FnSUNCeVpYUjFjbTQ3WEc0Z0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUM4dklFeEZWQ0JVU0VVZ1UwMVBUMVJJVGtWVFV5QkNSVWRKVGlGY2JpQWdJQ0FnSUhOdGIyOTBhRk5qY205c2JDNWpZV3hzS0Z4dUlDQWdJQ0FnSUNCM0xGeHVJQ0FnSUNBZ0lDQmtMbUp2Wkhrc1hHNGdJQ0FnSUNBZ0lHRnlaM1Z0Wlc1MGMxc3dYUzVzWldaMElDRTlQU0IxYm1SbFptbHVaV1JjYmlBZ0lDQWdJQ0FnSUNBL0lINStZWEpuZFcxbGJuUnpXekJkTG14bFpuUmNiaUFnSUNBZ0lDQWdJQ0E2SUhjdWMyTnliMnhzV0NCOGZDQjNMbkJoWjJWWVQyWm1jMlYwTEZ4dUlDQWdJQ0FnSUNCaGNtZDFiV1Z1ZEhOYk1GMHVkRzl3SUNFOVBTQjFibVJsWm1sdVpXUmNiaUFnSUNBZ0lDQWdJQ0EvSUg1K1lYSm5kVzFsYm5Seld6QmRMblJ2Y0Z4dUlDQWdJQ0FnSUNBZ0lEb2dkeTV6WTNKdmJHeFpJSHg4SUhjdWNHRm5aVmxQWm1aelpYUmNiaUFnSUNBZ0lDazdYRzRnSUNBZ2ZUdGNibHh1SUNBZ0lDOHZJSGN1YzJOeWIyeHNRbmxjYmlBZ0lDQjNMbk5qY205c2JFSjVJRDBnWm5WdVkzUnBiMjRvS1NCN1hHNGdJQ0FnSUNBdkx5QmhkbTlwWkNCaFkzUnBiMjRnZDJobGJpQnVieUJoY21kMWJXVnVkSE1nWVhKbElIQmhjM05sWkZ4dUlDQWdJQ0FnYVdZZ0tHRnlaM1Z0Wlc1MGMxc3dYU0E5UFQwZ2RXNWtaV1pwYm1Wa0tTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJqdGNiaUFnSUNBZ0lIMWNibHh1SUNBZ0lDQWdMeThnWVhadmFXUWdjMjF2YjNSb0lHSmxhR0YyYVc5eUlHbG1JRzV2ZENCeVpYRjFhWEpsWkZ4dUlDQWdJQ0FnYVdZZ0tITm9iM1ZzWkVKaGFXeFBkWFFvWVhKbmRXMWxiblJ6V3pCZEtTa2dlMXh1SUNBZ0lDQWdJQ0J2Y21sbmFXNWhiQzV6WTNKdmJHeENlUzVqWVd4c0tGeHVJQ0FnSUNBZ0lDQWdJSGNzWEc0Z0lDQWdJQ0FnSUNBZ1lYSm5kVzFsYm5Seld6QmRMbXhsWm5RZ0lUMDlJSFZ1WkdWbWFXNWxaRnh1SUNBZ0lDQWdJQ0FnSUNBZ1B5QmhjbWQxYldWdWRITmJNRjB1YkdWbWRGeHVJQ0FnSUNBZ0lDQWdJQ0FnT2lCMGVYQmxiMllnWVhKbmRXMWxiblJ6V3pCZElDRTlQU0FuYjJKcVpXTjBKeUEvSUdGeVozVnRaVzUwYzFzd1hTQTZJREFzWEc0Z0lDQWdJQ0FnSUNBZ1lYSm5kVzFsYm5Seld6QmRMblJ2Y0NBaFBUMGdkVzVrWldacGJtVmtYRzRnSUNBZ0lDQWdJQ0FnSUNBL0lHRnlaM1Z0Wlc1MGMxc3dYUzUwYjNCY2JpQWdJQ0FnSUNBZ0lDQWdJRG9nWVhKbmRXMWxiblJ6V3pGZElDRTlQU0IxYm1SbFptbHVaV1FnUHlCaGNtZDFiV1Z1ZEhOYk1WMGdPaUF3WEc0Z0lDQWdJQ0FnSUNrN1hHNWNiaUFnSUNBZ0lDQWdjbVYwZFhKdU8xeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQXZMeUJNUlZRZ1ZFaEZJRk5OVDA5VVNFNUZVMU1nUWtWSFNVNGhYRzRnSUNBZ0lDQnpiVzl2ZEdoVFkzSnZiR3d1WTJGc2JDaGNiaUFnSUNBZ0lDQWdkeXhjYmlBZ0lDQWdJQ0FnWkM1aWIyUjVMRnh1SUNBZ0lDQWdJQ0IrZm1GeVozVnRaVzUwYzFzd1hTNXNaV1owSUNzZ0tIY3VjMk55YjJ4c1dDQjhmQ0IzTG5CaFoyVllUMlptYzJWMEtTeGNiaUFnSUNBZ0lDQWdmbjVoY21kMWJXVnVkSE5iTUYwdWRHOXdJQ3NnS0hjdWMyTnliMnhzV1NCOGZDQjNMbkJoWjJWWlQyWm1jMlYwS1Z4dUlDQWdJQ0FnS1R0Y2JpQWdJQ0I5TzF4dVhHNGdJQ0FnTHk4Z1JXeGxiV1Z1ZEM1d2NtOTBiM1I1Y0dVdWMyTnliMnhzSUdGdVpDQkZiR1Z0Wlc1MExuQnliM1J2ZEhsd1pTNXpZM0p2Ykd4VWIxeHVJQ0FnSUVWc1pXMWxiblF1Y0hKdmRHOTBlWEJsTG5OamNtOXNiQ0E5SUVWc1pXMWxiblF1Y0hKdmRHOTBlWEJsTG5OamNtOXNiRlJ2SUQwZ1puVnVZM1JwYjI0b0tTQjdYRzRnSUNBZ0lDQXZMeUJoZG05cFpDQmhZM1JwYjI0Z2QyaGxiaUJ1YnlCaGNtZDFiV1Z1ZEhNZ1lYSmxJSEJoYzNObFpGeHVJQ0FnSUNBZ2FXWWdLR0Z5WjNWdFpXNTBjMXN3WFNBOVBUMGdkVzVrWldacGJtVmtLU0I3WEc0Z0lDQWdJQ0FnSUhKbGRIVnlianRjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnTHk4Z1lYWnZhV1FnYzIxdmIzUm9JR0psYUdGMmFXOXlJR2xtSUc1dmRDQnlaWEYxYVhKbFpGeHVJQ0FnSUNBZ2FXWWdLSE5vYjNWc1pFSmhhV3hQZFhRb1lYSm5kVzFsYm5Seld6QmRLU0E5UFQwZ2RISjFaU2tnZTF4dUlDQWdJQ0FnSUNBdkx5QnBaaUJ2Ym1VZ2JuVnRZbVZ5SUdseklIQmhjM05sWkN3Z2RHaHliM2NnWlhKeWIzSWdkRzhnYldGMFkyZ2dSbWx5WldadmVDQnBiWEJzWlcxbGJuUmhkR2x2Ymx4dUlDQWdJQ0FnSUNCcFppQW9kSGx3Wlc5bUlHRnlaM1Z0Wlc1MGMxc3dYU0E5UFQwZ0oyNTFiV0psY2ljZ0ppWWdZWEpuZFcxbGJuUnpXekZkSUQwOVBTQjFibVJsWm1sdVpXUXBJSHRjYmlBZ0lDQWdJQ0FnSUNCMGFISnZkeUJ1WlhjZ1UzbHVkR0Y0UlhKeWIzSW9KMVpoYkhWbElHTnZkV3hrSUc1dmRDQmlaU0JqYjI1MlpYSjBaV1FuS1R0Y2JpQWdJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQWdJRzl5YVdkcGJtRnNMbVZzWlcxbGJuUlRZM0p2Ykd3dVkyRnNiQ2hjYmlBZ0lDQWdJQ0FnSUNCMGFHbHpMRnh1SUNBZ0lDQWdJQ0FnSUM4dklIVnpaU0JzWldaMElIQnliM0FzSUdacGNuTjBJRzUxYldKbGNpQmhjbWQxYldWdWRDQnZjaUJtWVd4c1ltRmpheUIwYnlCelkzSnZiR3hNWldaMFhHNGdJQ0FnSUNBZ0lDQWdZWEpuZFcxbGJuUnpXekJkTG14bFpuUWdJVDA5SUhWdVpHVm1hVzVsWkZ4dUlDQWdJQ0FnSUNBZ0lDQWdQeUIrZm1GeVozVnRaVzUwYzFzd1hTNXNaV1owWEc0Z0lDQWdJQ0FnSUNBZ0lDQTZJSFI1Y0dWdlppQmhjbWQxYldWdWRITmJNRjBnSVQwOUlDZHZZbXBsWTNRbklEOGdmbjVoY21kMWJXVnVkSE5iTUYwZ09pQjBhR2x6TG5OamNtOXNiRXhsWm5Rc1hHNGdJQ0FnSUNBZ0lDQWdMeThnZFhObElIUnZjQ0J3Y205d0xDQnpaV052Ym1RZ1lYSm5kVzFsYm5RZ2IzSWdabUZzYkdKaFkyc2dkRzhnYzJOeWIyeHNWRzl3WEc0Z0lDQWdJQ0FnSUNBZ1lYSm5kVzFsYm5Seld6QmRMblJ2Y0NBaFBUMGdkVzVrWldacGJtVmtYRzRnSUNBZ0lDQWdJQ0FnSUNBL0lINStZWEpuZFcxbGJuUnpXekJkTG5SdmNGeHVJQ0FnSUNBZ0lDQWdJQ0FnT2lCaGNtZDFiV1Z1ZEhOYk1WMGdJVDA5SUhWdVpHVm1hVzVsWkNBL0lINStZWEpuZFcxbGJuUnpXekZkSURvZ2RHaHBjeTV6WTNKdmJHeFViM0JjYmlBZ0lDQWdJQ0FnS1R0Y2JseHVJQ0FnSUNBZ0lDQnlaWFIxY200N1hHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lIWmhjaUJzWldaMElEMGdZWEpuZFcxbGJuUnpXekJkTG14bFpuUTdYRzRnSUNBZ0lDQjJZWElnZEc5d0lEMGdZWEpuZFcxbGJuUnpXekJkTG5SdmNEdGNibHh1SUNBZ0lDQWdMeThnVEVWVUlGUklSU0JUVFU5UFZFaE9SVk5USUVKRlIwbE9JVnh1SUNBZ0lDQWdjMjF2YjNSb1UyTnliMnhzTG1OaGJHd29YRzRnSUNBZ0lDQWdJSFJvYVhNc1hHNGdJQ0FnSUNBZ0lIUm9hWE1zWEc0Z0lDQWdJQ0FnSUhSNWNHVnZaaUJzWldaMElEMDlQU0FuZFc1a1pXWnBibVZrSnlBL0lIUm9hWE11YzJOeWIyeHNUR1ZtZENBNklINStiR1ZtZEN4Y2JpQWdJQ0FnSUNBZ2RIbHdaVzltSUhSdmNDQTlQVDBnSjNWdVpHVm1hVzVsWkNjZ1B5QjBhR2x6TG5OamNtOXNiRlJ2Y0NBNklINStkRzl3WEc0Z0lDQWdJQ0FwTzF4dUlDQWdJSDA3WEc1Y2JpQWdJQ0F2THlCRmJHVnRaVzUwTG5CeWIzUnZkSGx3WlM1elkzSnZiR3hDZVZ4dUlDQWdJRVZzWlcxbGJuUXVjSEp2ZEc5MGVYQmxMbk5qY205c2JFSjVJRDBnWm5WdVkzUnBiMjRvS1NCN1hHNGdJQ0FnSUNBdkx5QmhkbTlwWkNCaFkzUnBiMjRnZDJobGJpQnVieUJoY21kMWJXVnVkSE1nWVhKbElIQmhjM05sWkZ4dUlDQWdJQ0FnYVdZZ0tHRnlaM1Z0Wlc1MGMxc3dYU0E5UFQwZ2RXNWtaV1pwYm1Wa0tTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJqdGNiaUFnSUNBZ0lIMWNibHh1SUNBZ0lDQWdMeThnWVhadmFXUWdjMjF2YjNSb0lHSmxhR0YyYVc5eUlHbG1JRzV2ZENCeVpYRjFhWEpsWkZ4dUlDQWdJQ0FnYVdZZ0tITm9iM1ZzWkVKaGFXeFBkWFFvWVhKbmRXMWxiblJ6V3pCZEtTQTlQVDBnZEhKMVpTa2dlMXh1SUNBZ0lDQWdJQ0J2Y21sbmFXNWhiQzVsYkdWdFpXNTBVMk55YjJ4c0xtTmhiR3dvWEc0Z0lDQWdJQ0FnSUNBZ2RHaHBjeXhjYmlBZ0lDQWdJQ0FnSUNCaGNtZDFiV1Z1ZEhOYk1GMHViR1ZtZENBaFBUMGdkVzVrWldacGJtVmtYRzRnSUNBZ0lDQWdJQ0FnSUNBL0lINStZWEpuZFcxbGJuUnpXekJkTG14bFpuUWdLeUIwYUdsekxuTmpjbTlzYkV4bFpuUmNiaUFnSUNBZ0lDQWdJQ0FnSURvZ2ZuNWhjbWQxYldWdWRITmJNRjBnS3lCMGFHbHpMbk5qY205c2JFeGxablFzWEc0Z0lDQWdJQ0FnSUNBZ1lYSm5kVzFsYm5Seld6QmRMblJ2Y0NBaFBUMGdkVzVrWldacGJtVmtYRzRnSUNBZ0lDQWdJQ0FnSUNBL0lINStZWEpuZFcxbGJuUnpXekJkTG5SdmNDQXJJSFJvYVhNdWMyTnliMnhzVkc5d1hHNGdJQ0FnSUNBZ0lDQWdJQ0E2SUg1K1lYSm5kVzFsYm5Seld6RmRJQ3NnZEdocGN5NXpZM0p2Ykd4VWIzQmNiaUFnSUNBZ0lDQWdLVHRjYmx4dUlDQWdJQ0FnSUNCeVpYUjFjbTQ3WEc0Z0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUhSb2FYTXVjMk55YjJ4c0tIdGNiaUFnSUNBZ0lDQWdiR1ZtZERvZ2ZuNWhjbWQxYldWdWRITmJNRjB1YkdWbWRDQXJJSFJvYVhNdWMyTnliMnhzVEdWbWRDeGNiaUFnSUNBZ0lDQWdkRzl3T2lCK2ZtRnlaM1Z0Wlc1MGMxc3dYUzUwYjNBZ0t5QjBhR2x6TG5OamNtOXNiRlJ2Y0N4Y2JpQWdJQ0FnSUNBZ1ltVm9ZWFpwYjNJNklHRnlaM1Z0Wlc1MGMxc3dYUzVpWldoaGRtbHZjbHh1SUNBZ0lDQWdmU2s3WEc0Z0lDQWdmVHRjYmx4dUlDQWdJQzh2SUVWc1pXMWxiblF1Y0hKdmRHOTBlWEJsTG5OamNtOXNiRWx1ZEc5V2FXVjNYRzRnSUNBZ1JXeGxiV1Z1ZEM1d2NtOTBiM1I1Y0dVdWMyTnliMnhzU1c1MGIxWnBaWGNnUFNCbWRXNWpkR2x2YmlncElIdGNiaUFnSUNBZ0lDOHZJR0YyYjJsa0lITnRiMjkwYUNCaVpXaGhkbWx2Y2lCcFppQnViM1FnY21WeGRXbHlaV1JjYmlBZ0lDQWdJR2xtSUNoemFHOTFiR1JDWVdsc1QzVjBLR0Z5WjNWdFpXNTBjMXN3WFNrZ1BUMDlJSFJ5ZFdVcElIdGNiaUFnSUNBZ0lDQWdiM0pwWjJsdVlXd3VjMk55YjJ4c1NXNTBiMVpwWlhjdVkyRnNiQ2hjYmlBZ0lDQWdJQ0FnSUNCMGFHbHpMRnh1SUNBZ0lDQWdJQ0FnSUdGeVozVnRaVzUwYzFzd1hTQTlQVDBnZFc1a1pXWnBibVZrSUQ4Z2RISjFaU0E2SUdGeVozVnRaVzUwYzFzd1hWeHVJQ0FnSUNBZ0lDQXBPMXh1WEc0Z0lDQWdJQ0FnSUhKbGRIVnlianRjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnTHk4Z1RFVlVJRlJJUlNCVFRVOVBWRWhPUlZOVElFSkZSMGxPSVZ4dUlDQWdJQ0FnZG1GeUlITmpjbTlzYkdGaWJHVlFZWEpsYm5RZ1BTQm1hVzVrVTJOeWIyeHNZV0pzWlZCaGNtVnVkQ2gwYUdsektUdGNiaUFnSUNBZ0lIWmhjaUJ3WVhKbGJuUlNaV04wY3lBOUlITmpjbTlzYkdGaWJHVlFZWEpsYm5RdVoyVjBRbTkxYm1ScGJtZERiR2xsYm5SU1pXTjBLQ2s3WEc0Z0lDQWdJQ0IyWVhJZ1kyeHBaVzUwVW1WamRITWdQU0IwYUdsekxtZGxkRUp2ZFc1a2FXNW5RMnhwWlc1MFVtVmpkQ2dwTzF4dVhHNGdJQ0FnSUNCcFppQW9jMk55YjJ4c1lXSnNaVkJoY21WdWRDQWhQVDBnWkM1aWIyUjVLU0I3WEc0Z0lDQWdJQ0FnSUM4dklISmxkbVZoYkNCbGJHVnRaVzUwSUdsdWMybGtaU0J3WVhKbGJuUmNiaUFnSUNBZ0lDQWdjMjF2YjNSb1UyTnliMnhzTG1OaGJHd29YRzRnSUNBZ0lDQWdJQ0FnZEdocGN5eGNiaUFnSUNBZ0lDQWdJQ0J6WTNKdmJHeGhZbXhsVUdGeVpXNTBMRnh1SUNBZ0lDQWdJQ0FnSUhOamNtOXNiR0ZpYkdWUVlYSmxiblF1YzJOeWIyeHNUR1ZtZENBcklHTnNhV1Z1ZEZKbFkzUnpMbXhsWm5RZ0xTQndZWEpsYm5SU1pXTjBjeTVzWldaMExGeHVJQ0FnSUNBZ0lDQWdJSE5qY205c2JHRmliR1ZRWVhKbGJuUXVjMk55YjJ4c1ZHOXdJQ3NnWTJ4cFpXNTBVbVZqZEhNdWRHOXdJQzBnY0dGeVpXNTBVbVZqZEhNdWRHOXdYRzRnSUNBZ0lDQWdJQ2s3WEc1Y2JpQWdJQ0FnSUNBZ0x5OGdjbVYyWldGc0lIQmhjbVZ1ZENCcGJpQjJhV1YzY0c5eWRDQjFibXhsYzNNZ2FYTWdabWw0WldSY2JpQWdJQ0FnSUNBZ2FXWWdLSGN1WjJWMFEyOXRjSFYwWldSVGRIbHNaU2h6WTNKdmJHeGhZbXhsVUdGeVpXNTBLUzV3YjNOcGRHbHZiaUFoUFQwZ0oyWnBlR1ZrSnlrZ2UxeHVJQ0FnSUNBZ0lDQWdJSGN1YzJOeWIyeHNRbmtvZTF4dUlDQWdJQ0FnSUNBZ0lDQWdiR1ZtZERvZ2NHRnlaVzUwVW1WamRITXViR1ZtZEN4Y2JpQWdJQ0FnSUNBZ0lDQWdJSFJ2Y0RvZ2NHRnlaVzUwVW1WamRITXVkRzl3TEZ4dUlDQWdJQ0FnSUNBZ0lDQWdZbVZvWVhacGIzSTZJQ2R6Ylc5dmRHZ25YRzRnSUNBZ0lDQWdJQ0FnZlNrN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNBZ0lDOHZJSEpsZG1WaGJDQmxiR1Z0Wlc1MElHbHVJSFpwWlhkd2IzSjBYRzRnSUNBZ0lDQWdJSGN1YzJOeWIyeHNRbmtvZTF4dUlDQWdJQ0FnSUNBZ0lHeGxablE2SUdOc2FXVnVkRkpsWTNSekxteGxablFzWEc0Z0lDQWdJQ0FnSUNBZ2RHOXdPaUJqYkdsbGJuUlNaV04wY3k1MGIzQXNYRzRnSUNBZ0lDQWdJQ0FnWW1Wb1lYWnBiM0k2SUNkemJXOXZkR2duWEc0Z0lDQWdJQ0FnSUgwcE8xeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUgwN1hHNGdJSDFjYmx4dUlDQnBaaUFvZEhsd1pXOW1JR1Y0Y0c5eWRITWdQVDA5SUNkdlltcGxZM1FuSUNZbUlIUjVjR1Z2WmlCdGIyUjFiR1VnSVQwOUlDZDFibVJsWm1sdVpXUW5LU0I3WEc0Z0lDQWdMeThnWTI5dGJXOXVhbk5jYmlBZ0lDQnRiMlIxYkdVdVpYaHdiM0owY3lBOUlIc2djRzlzZVdacGJHdzZJSEJ2YkhsbWFXeHNJSDA3WEc0Z0lIMGdaV3h6WlNCN1hHNGdJQ0FnTHk4Z1oyeHZZbUZzWEc0Z0lDQWdjRzlzZVdacGJHd29LVHRjYmlBZ2ZWeHVYRzU5S0NrcE8xeHVJaXdpS0daMWJtTjBhVzl1S0hObGJHWXBJSHRjYmlBZ0ozVnpaU0J6ZEhKcFkzUW5PMXh1WEc0Z0lHbG1JQ2h6Wld4bUxtWmxkR05vS1NCN1hHNGdJQ0FnY21WMGRYSnVYRzRnSUgxY2JseHVJQ0IyWVhJZ2MzVndjRzl5ZENBOUlIdGNiaUFnSUNCelpXRnlZMmhRWVhKaGJYTTZJQ2RWVWt4VFpXRnlZMmhRWVhKaGJYTW5JR2x1SUhObGJHWXNYRzRnSUNBZ2FYUmxjbUZpYkdVNklDZFRlVzFpYjJ3bklHbHVJSE5sYkdZZ0ppWWdKMmwwWlhKaGRHOXlKeUJwYmlCVGVXMWliMndzWEc0Z0lDQWdZbXh2WWpvZ0owWnBiR1ZTWldGa1pYSW5JR2x1SUhObGJHWWdKaVlnSjBKc2IySW5JR2x1SUhObGJHWWdKaVlnS0daMWJtTjBhVzl1S0NrZ2UxeHVJQ0FnSUNBZ2RISjVJSHRjYmlBZ0lDQWdJQ0FnYm1WM0lFSnNiMklvS1Z4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnZEhKMVpWeHVJQ0FnSUNBZ2ZTQmpZWFJqYUNobEtTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQm1ZV3h6WlZ4dUlDQWdJQ0FnZlZ4dUlDQWdJSDBwS0Nrc1hHNGdJQ0FnWm05eWJVUmhkR0U2SUNkR2IzSnRSR0YwWVNjZ2FXNGdjMlZzWml4Y2JpQWdJQ0JoY25KaGVVSjFabVpsY2pvZ0owRnljbUY1UW5WbVptVnlKeUJwYmlCelpXeG1YRzRnSUgxY2JseHVJQ0JwWmlBb2MzVndjRzl5ZEM1aGNuSmhlVUoxWm1abGNpa2dlMXh1SUNBZ0lIWmhjaUIyYVdWM1EyeGhjM05sY3lBOUlGdGNiaUFnSUNBZ0lDZGJiMkpxWldOMElFbHVkRGhCY25KaGVWMG5MRnh1SUNBZ0lDQWdKMXR2WW1wbFkzUWdWV2x1ZERoQmNuSmhlVjBuTEZ4dUlDQWdJQ0FnSjF0dlltcGxZM1FnVldsdWREaERiR0Z0Y0dWa1FYSnlZWGxkSnl4Y2JpQWdJQ0FnSUNkYmIySnFaV04wSUVsdWRERTJRWEp5WVhsZEp5eGNiaUFnSUNBZ0lDZGJiMkpxWldOMElGVnBiblF4TmtGeWNtRjVYU2NzWEc0Z0lDQWdJQ0FuVzI5aWFtVmpkQ0JKYm5Rek1rRnljbUY1WFNjc1hHNGdJQ0FnSUNBblcyOWlhbVZqZENCVmFXNTBNekpCY25KaGVWMG5MRnh1SUNBZ0lDQWdKMXR2WW1wbFkzUWdSbXh2WVhRek1rRnljbUY1WFNjc1hHNGdJQ0FnSUNBblcyOWlhbVZqZENCR2JHOWhkRFkwUVhKeVlYbGRKMXh1SUNBZ0lGMWNibHh1SUNBZ0lIWmhjaUJwYzBSaGRHRldhV1YzSUQwZ1puVnVZM1JwYjI0b2IySnFLU0I3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdiMkpxSUNZbUlFUmhkR0ZXYVdWM0xuQnliM1J2ZEhsd1pTNXBjMUJ5YjNSdmRIbHdaVTltS0c5aWFpbGNiaUFnSUNCOVhHNWNiaUFnSUNCMllYSWdhWE5CY25KaGVVSjFabVpsY2xacFpYY2dQU0JCY25KaGVVSjFabVpsY2k1cGMxWnBaWGNnZkh3Z1puVnVZM1JwYjI0b2IySnFLU0I3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdiMkpxSUNZbUlIWnBaWGREYkdGemMyVnpMbWx1WkdWNFQyWW9UMkpxWldOMExuQnliM1J2ZEhsd1pTNTBiMU4wY21sdVp5NWpZV3hzS0c5aWFpa3BJRDRnTFRGY2JpQWdJQ0I5WEc0Z0lIMWNibHh1SUNCbWRXNWpkR2x2YmlCdWIzSnRZV3hwZW1WT1lXMWxLRzVoYldVcElIdGNiaUFnSUNCcFppQW9kSGx3Wlc5bUlHNWhiV1VnSVQwOUlDZHpkSEpwYm1jbktTQjdYRzRnSUNBZ0lDQnVZVzFsSUQwZ1UzUnlhVzVuS0c1aGJXVXBYRzRnSUNBZ2ZWeHVJQ0FnSUdsbUlDZ3ZXMTVoTFhvd0xUbGNYQzBqSkNVbUp5b3JMbHhjWGw5Z2ZINWRMMmt1ZEdWemRDaHVZVzFsS1NrZ2UxeHVJQ0FnSUNBZ2RHaHliM2NnYm1WM0lGUjVjR1ZGY25KdmNpZ25TVzUyWVd4cFpDQmphR0Z5WVdOMFpYSWdhVzRnYUdWaFpHVnlJR1pwWld4a0lHNWhiV1VuS1Z4dUlDQWdJSDFjYmlBZ0lDQnlaWFIxY200Z2JtRnRaUzUwYjB4dmQyVnlRMkZ6WlNncFhHNGdJSDFjYmx4dUlDQm1kVzVqZEdsdmJpQnViM0p0WVd4cGVtVldZV3gxWlNoMllXeDFaU2tnZTF4dUlDQWdJR2xtSUNoMGVYQmxiMllnZG1Gc2RXVWdJVDA5SUNkemRISnBibWNuS1NCN1hHNGdJQ0FnSUNCMllXeDFaU0E5SUZOMGNtbHVaeWgyWVd4MVpTbGNiaUFnSUNCOVhHNGdJQ0FnY21WMGRYSnVJSFpoYkhWbFhHNGdJSDFjYmx4dUlDQXZMeUJDZFdsc1pDQmhJR1JsYzNSeWRXTjBhWFpsSUdsMFpYSmhkRzl5SUdadmNpQjBhR1VnZG1Gc2RXVWdiR2x6ZEZ4dUlDQm1kVzVqZEdsdmJpQnBkR1Z5WVhSdmNrWnZjaWhwZEdWdGN5a2dlMXh1SUNBZ0lIWmhjaUJwZEdWeVlYUnZjaUE5SUh0Y2JpQWdJQ0FnSUc1bGVIUTZJR1oxYm1OMGFXOXVLQ2tnZTF4dUlDQWdJQ0FnSUNCMllYSWdkbUZzZFdVZ1BTQnBkR1Z0Y3k1emFHbG1kQ2dwWEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUI3Wkc5dVpUb2dkbUZzZFdVZ1BUMDlJSFZ1WkdWbWFXNWxaQ3dnZG1Gc2RXVTZJSFpoYkhWbGZWeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUgxY2JseHVJQ0FnSUdsbUlDaHpkWEJ3YjNKMExtbDBaWEpoWW14bEtTQjdYRzRnSUNBZ0lDQnBkR1Z5WVhSdmNsdFRlVzFpYjJ3dWFYUmxjbUYwYjNKZElEMGdablZ1WTNScGIyNG9LU0I3WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJwZEdWeVlYUnZjbHh1SUNBZ0lDQWdmVnh1SUNBZ0lIMWNibHh1SUNBZ0lISmxkSFZ5YmlCcGRHVnlZWFJ2Y2x4dUlDQjlYRzVjYmlBZ1puVnVZM1JwYjI0Z1NHVmhaR1Z5Y3lob1pXRmtaWEp6S1NCN1hHNGdJQ0FnZEdocGN5NXRZWEFnUFNCN2ZWeHVYRzRnSUNBZ2FXWWdLR2hsWVdSbGNuTWdhVzV6ZEdGdVkyVnZaaUJJWldGa1pYSnpLU0I3WEc0Z0lDQWdJQ0JvWldGa1pYSnpMbVp2Y2tWaFkyZ29ablZ1WTNScGIyNG9kbUZzZFdVc0lHNWhiV1VwSUh0Y2JpQWdJQ0FnSUNBZ2RHaHBjeTVoY0hCbGJtUW9ibUZ0WlN3Z2RtRnNkV1VwWEc0Z0lDQWdJQ0I5TENCMGFHbHpLVnh1SUNBZ0lIMGdaV3h6WlNCcFppQW9RWEp5WVhrdWFYTkJjbkpoZVNob1pXRmtaWEp6S1NrZ2UxeHVJQ0FnSUNBZ2FHVmhaR1Z5Y3k1bWIzSkZZV05vS0daMWJtTjBhVzl1S0dobFlXUmxjaWtnZTF4dUlDQWdJQ0FnSUNCMGFHbHpMbUZ3Y0dWdVpDaG9aV0ZrWlhKYk1GMHNJR2hsWVdSbGNsc3hYU2xjYmlBZ0lDQWdJSDBzSUhSb2FYTXBYRzRnSUNBZ2ZTQmxiSE5sSUdsbUlDaG9aV0ZrWlhKektTQjdYRzRnSUNBZ0lDQlBZbXBsWTNRdVoyVjBUM2R1VUhKdmNHVnlkSGxPWVcxbGN5aG9aV0ZrWlhKektTNW1iM0pGWVdOb0tHWjFibU4wYVc5dUtHNWhiV1VwSUh0Y2JpQWdJQ0FnSUNBZ2RHaHBjeTVoY0hCbGJtUW9ibUZ0WlN3Z2FHVmhaR1Z5YzF0dVlXMWxYU2xjYmlBZ0lDQWdJSDBzSUhSb2FYTXBYRzRnSUNBZ2ZWeHVJQ0I5WEc1Y2JpQWdTR1ZoWkdWeWN5NXdjbTkwYjNSNWNHVXVZWEJ3Wlc1a0lEMGdablZ1WTNScGIyNG9ibUZ0WlN3Z2RtRnNkV1VwSUh0Y2JpQWdJQ0J1WVcxbElEMGdibTl5YldGc2FYcGxUbUZ0WlNodVlXMWxLVnh1SUNBZ0lIWmhiSFZsSUQwZ2JtOXliV0ZzYVhwbFZtRnNkV1VvZG1Gc2RXVXBYRzRnSUNBZ2RtRnlJRzlzWkZaaGJIVmxJRDBnZEdocGN5NXRZWEJiYm1GdFpWMWNiaUFnSUNCMGFHbHpMbTFoY0Z0dVlXMWxYU0E5SUc5c1pGWmhiSFZsSUQ4Z2IyeGtWbUZzZFdVckp5d25LM1poYkhWbElEb2dkbUZzZFdWY2JpQWdmVnh1WEc0Z0lFaGxZV1JsY25NdWNISnZkRzkwZVhCbFd5ZGtaV3hsZEdVblhTQTlJR1oxYm1OMGFXOXVLRzVoYldVcElIdGNiaUFnSUNCa1pXeGxkR1VnZEdocGN5NXRZWEJiYm05eWJXRnNhWHBsVG1GdFpTaHVZVzFsS1YxY2JpQWdmVnh1WEc0Z0lFaGxZV1JsY25NdWNISnZkRzkwZVhCbExtZGxkQ0E5SUdaMWJtTjBhVzl1S0c1aGJXVXBJSHRjYmlBZ0lDQnVZVzFsSUQwZ2JtOXliV0ZzYVhwbFRtRnRaU2h1WVcxbEtWeHVJQ0FnSUhKbGRIVnliaUIwYUdsekxtaGhjeWh1WVcxbEtTQS9JSFJvYVhNdWJXRndXMjVoYldWZElEb2diblZzYkZ4dUlDQjlYRzVjYmlBZ1NHVmhaR1Z5Y3k1d2NtOTBiM1I1Y0dVdWFHRnpJRDBnWm5WdVkzUnBiMjRvYm1GdFpTa2dlMXh1SUNBZ0lISmxkSFZ5YmlCMGFHbHpMbTFoY0M1b1lYTlBkMjVRY205d1pYSjBlU2h1YjNKdFlXeHBlbVZPWVcxbEtHNWhiV1VwS1Z4dUlDQjlYRzVjYmlBZ1NHVmhaR1Z5Y3k1d2NtOTBiM1I1Y0dVdWMyVjBJRDBnWm5WdVkzUnBiMjRvYm1GdFpTd2dkbUZzZFdVcElIdGNiaUFnSUNCMGFHbHpMbTFoY0Z0dWIzSnRZV3hwZW1WT1lXMWxLRzVoYldVcFhTQTlJRzV2Y20xaGJHbDZaVlpoYkhWbEtIWmhiSFZsS1Z4dUlDQjlYRzVjYmlBZ1NHVmhaR1Z5Y3k1d2NtOTBiM1I1Y0dVdVptOXlSV0ZqYUNBOUlHWjFibU4wYVc5dUtHTmhiR3hpWVdOckxDQjBhR2x6UVhKbktTQjdYRzRnSUNBZ1ptOXlJQ2gyWVhJZ2JtRnRaU0JwYmlCMGFHbHpMbTFoY0NrZ2UxeHVJQ0FnSUNBZ2FXWWdLSFJvYVhNdWJXRndMbWhoYzA5M2JsQnliM0JsY25SNUtHNWhiV1VwS1NCN1hHNGdJQ0FnSUNBZ0lHTmhiR3hpWVdOckxtTmhiR3dvZEdocGMwRnlaeXdnZEdocGN5NXRZWEJiYm1GdFpWMHNJRzVoYldVc0lIUm9hWE1wWEc0Z0lDQWdJQ0I5WEc0Z0lDQWdmVnh1SUNCOVhHNWNiaUFnU0dWaFpHVnljeTV3Y205MGIzUjVjR1V1YTJWNWN5QTlJR1oxYm1OMGFXOXVLQ2tnZTF4dUlDQWdJSFpoY2lCcGRHVnRjeUE5SUZ0ZFhHNGdJQ0FnZEdocGN5NW1iM0pGWVdOb0tHWjFibU4wYVc5dUtIWmhiSFZsTENCdVlXMWxLU0I3SUdsMFpXMXpMbkIxYzJnb2JtRnRaU2tnZlNsY2JpQWdJQ0J5WlhSMWNtNGdhWFJsY21GMGIzSkdiM0lvYVhSbGJYTXBYRzRnSUgxY2JseHVJQ0JJWldGa1pYSnpMbkJ5YjNSdmRIbHdaUzUyWVd4MVpYTWdQU0JtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0IyWVhJZ2FYUmxiWE1nUFNCYlhWeHVJQ0FnSUhSb2FYTXVabTl5UldGamFDaG1kVzVqZEdsdmJpaDJZV3gxWlNrZ2V5QnBkR1Z0Y3k1d2RYTm9LSFpoYkhWbEtTQjlLVnh1SUNBZ0lISmxkSFZ5YmlCcGRHVnlZWFJ2Y2tadmNpaHBkR1Z0Y3lsY2JpQWdmVnh1WEc0Z0lFaGxZV1JsY25NdWNISnZkRzkwZVhCbExtVnVkSEpwWlhNZ1BTQm1kVzVqZEdsdmJpZ3BJSHRjYmlBZ0lDQjJZWElnYVhSbGJYTWdQU0JiWFZ4dUlDQWdJSFJvYVhNdVptOXlSV0ZqYUNobWRXNWpkR2x2YmloMllXeDFaU3dnYm1GdFpTa2dleUJwZEdWdGN5NXdkWE5vS0Z0dVlXMWxMQ0IyWVd4MVpWMHBJSDBwWEc0Z0lDQWdjbVYwZFhKdUlHbDBaWEpoZEc5eVJtOXlLR2wwWlcxektWeHVJQ0I5WEc1Y2JpQWdhV1lnS0hOMWNIQnZjblF1YVhSbGNtRmliR1VwSUh0Y2JpQWdJQ0JJWldGa1pYSnpMbkJ5YjNSdmRIbHdaVnRUZVcxaWIyd3VhWFJsY21GMGIzSmRJRDBnU0dWaFpHVnljeTV3Y205MGIzUjVjR1V1Wlc1MGNtbGxjMXh1SUNCOVhHNWNiaUFnWm5WdVkzUnBiMjRnWTI5dWMzVnRaV1FvWW05a2VTa2dlMXh1SUNBZ0lHbG1JQ2hpYjJSNUxtSnZaSGxWYzJWa0tTQjdYRzRnSUNBZ0lDQnlaWFIxY200Z1VISnZiV2x6WlM1eVpXcGxZM1FvYm1WM0lGUjVjR1ZGY25KdmNpZ25RV3h5WldGa2VTQnlaV0ZrSnlrcFhHNGdJQ0FnZlZ4dUlDQWdJR0p2WkhrdVltOWtlVlZ6WldRZ1BTQjBjblZsWEc0Z0lIMWNibHh1SUNCbWRXNWpkR2x2YmlCbWFXeGxVbVZoWkdWeVVtVmhaSGtvY21WaFpHVnlLU0I3WEc0Z0lDQWdjbVYwZFhKdUlHNWxkeUJRY205dGFYTmxLR1oxYm1OMGFXOXVLSEpsYzI5c2RtVXNJSEpsYW1WamRDa2dlMXh1SUNBZ0lDQWdjbVZoWkdWeUxtOXViRzloWkNBOUlHWjFibU4wYVc5dUtDa2dlMXh1SUNBZ0lDQWdJQ0J5WlhOdmJIWmxLSEpsWVdSbGNpNXlaWE4xYkhRcFhHNGdJQ0FnSUNCOVhHNGdJQ0FnSUNCeVpXRmtaWEl1YjI1bGNuSnZjaUE5SUdaMWJtTjBhVzl1S0NrZ2UxeHVJQ0FnSUNBZ0lDQnlaV3BsWTNRb2NtVmhaR1Z5TG1WeWNtOXlLVnh1SUNBZ0lDQWdmVnh1SUNBZ0lIMHBYRzRnSUgxY2JseHVJQ0JtZFc1amRHbHZiaUJ5WldGa1FteHZZa0Z6UVhKeVlYbENkV1ptWlhJb1lteHZZaWtnZTF4dUlDQWdJSFpoY2lCeVpXRmtaWElnUFNCdVpYY2dSbWxzWlZKbFlXUmxjaWdwWEc0Z0lDQWdkbUZ5SUhCeWIyMXBjMlVnUFNCbWFXeGxVbVZoWkdWeVVtVmhaSGtvY21WaFpHVnlLVnh1SUNBZ0lISmxZV1JsY2k1eVpXRmtRWE5CY25KaGVVSjFabVpsY2loaWJHOWlLVnh1SUNBZ0lISmxkSFZ5YmlCd2NtOXRhWE5sWEc0Z0lIMWNibHh1SUNCbWRXNWpkR2x2YmlCeVpXRmtRbXh2WWtGelZHVjRkQ2hpYkc5aUtTQjdYRzRnSUNBZ2RtRnlJSEpsWVdSbGNpQTlJRzVsZHlCR2FXeGxVbVZoWkdWeUtDbGNiaUFnSUNCMllYSWdjSEp2YldselpTQTlJR1pwYkdWU1pXRmtaWEpTWldGa2VTaHlaV0ZrWlhJcFhHNGdJQ0FnY21WaFpHVnlMbkpsWVdSQmMxUmxlSFFvWW14dllpbGNiaUFnSUNCeVpYUjFjbTRnY0hKdmJXbHpaVnh1SUNCOVhHNWNiaUFnWm5WdVkzUnBiMjRnY21WaFpFRnljbUY1UW5WbVptVnlRWE5VWlhoMEtHSjFaaWtnZTF4dUlDQWdJSFpoY2lCMmFXVjNJRDBnYm1WM0lGVnBiblE0UVhKeVlYa29ZblZtS1Z4dUlDQWdJSFpoY2lCamFHRnljeUE5SUc1bGR5QkJjbkpoZVNoMmFXVjNMbXhsYm1kMGFDbGNibHh1SUNBZ0lHWnZjaUFvZG1GeUlHa2dQU0F3T3lCcElEd2dkbWxsZHk1c1pXNW5kR2c3SUdrckt5a2dlMXh1SUNBZ0lDQWdZMmhoY25OYmFWMGdQU0JUZEhKcGJtY3Vabkp2YlVOb1lYSkRiMlJsS0hacFpYZGJhVjBwWEc0Z0lDQWdmVnh1SUNBZ0lISmxkSFZ5YmlCamFHRnljeTVxYjJsdUtDY25LVnh1SUNCOVhHNWNiaUFnWm5WdVkzUnBiMjRnWW5WbVptVnlRMnh2Ym1Vb1luVm1LU0I3WEc0Z0lDQWdhV1lnS0dKMVppNXpiR2xqWlNrZ2UxeHVJQ0FnSUNBZ2NtVjBkWEp1SUdKMVppNXpiR2xqWlNnd0tWeHVJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0IyWVhJZ2RtbGxkeUE5SUc1bGR5QlZhVzUwT0VGeWNtRjVLR0oxWmk1aWVYUmxUR1Z1WjNSb0tWeHVJQ0FnSUNBZ2RtbGxkeTV6WlhRb2JtVjNJRlZwYm5RNFFYSnlZWGtvWW5WbUtTbGNiaUFnSUNBZ0lISmxkSFZ5YmlCMmFXVjNMbUoxWm1abGNseHVJQ0FnSUgxY2JpQWdmVnh1WEc0Z0lHWjFibU4wYVc5dUlFSnZaSGtvS1NCN1hHNGdJQ0FnZEdocGN5NWliMlI1VlhObFpDQTlJR1poYkhObFhHNWNiaUFnSUNCMGFHbHpMbDlwYm1sMFFtOWtlU0E5SUdaMWJtTjBhVzl1S0dKdlpIa3BJSHRjYmlBZ0lDQWdJSFJvYVhNdVgySnZaSGxKYm1sMElEMGdZbTlrZVZ4dUlDQWdJQ0FnYVdZZ0tDRmliMlI1S1NCN1hHNGdJQ0FnSUNBZ0lIUm9hWE11WDJKdlpIbFVaWGgwSUQwZ0p5ZGNiaUFnSUNBZ0lIMGdaV3h6WlNCcFppQW9kSGx3Wlc5bUlHSnZaSGtnUFQwOUlDZHpkSEpwYm1jbktTQjdYRzRnSUNBZ0lDQWdJSFJvYVhNdVgySnZaSGxVWlhoMElEMGdZbTlrZVZ4dUlDQWdJQ0FnZlNCbGJITmxJR2xtSUNoemRYQndiM0owTG1Kc2IySWdKaVlnUW14dllpNXdjbTkwYjNSNWNHVXVhWE5RY205MGIzUjVjR1ZQWmloaWIyUjVLU2tnZTF4dUlDQWdJQ0FnSUNCMGFHbHpMbDlpYjJSNVFteHZZaUE5SUdKdlpIbGNiaUFnSUNBZ0lIMGdaV3h6WlNCcFppQW9jM1Z3Y0c5eWRDNW1iM0p0UkdGMFlTQW1KaUJHYjNKdFJHRjBZUzV3Y205MGIzUjVjR1V1YVhOUWNtOTBiM1I1Y0dWUFppaGliMlI1S1NrZ2UxeHVJQ0FnSUNBZ0lDQjBhR2x6TGw5aWIyUjVSbTl5YlVSaGRHRWdQU0JpYjJSNVhHNGdJQ0FnSUNCOUlHVnNjMlVnYVdZZ0tITjFjSEJ2Y25RdWMyVmhjbU5vVUdGeVlXMXpJQ1ltSUZWU1RGTmxZWEpqYUZCaGNtRnRjeTV3Y205MGIzUjVjR1V1YVhOUWNtOTBiM1I1Y0dWUFppaGliMlI1S1NrZ2UxeHVJQ0FnSUNBZ0lDQjBhR2x6TGw5aWIyUjVWR1Y0ZENBOUlHSnZaSGt1ZEc5VGRISnBibWNvS1Z4dUlDQWdJQ0FnZlNCbGJITmxJR2xtSUNoemRYQndiM0owTG1GeWNtRjVRblZtWm1WeUlDWW1JSE4xY0hCdmNuUXVZbXh2WWlBbUppQnBjMFJoZEdGV2FXVjNLR0p2WkhrcEtTQjdYRzRnSUNBZ0lDQWdJSFJvYVhNdVgySnZaSGxCY25KaGVVSjFabVpsY2lBOUlHSjFabVpsY2tOc2IyNWxLR0p2WkhrdVluVm1abVZ5S1Z4dUlDQWdJQ0FnSUNBdkx5QkpSU0F4TUMweE1TQmpZVzRuZENCb1lXNWtiR1VnWVNCRVlYUmhWbWxsZHlCaWIyUjVMbHh1SUNBZ0lDQWdJQ0IwYUdsekxsOWliMlI1U1c1cGRDQTlJRzVsZHlCQ2JHOWlLRnQwYUdsekxsOWliMlI1UVhKeVlYbENkV1ptWlhKZEtWeHVJQ0FnSUNBZ2ZTQmxiSE5sSUdsbUlDaHpkWEJ3YjNKMExtRnljbUY1UW5WbVptVnlJQ1ltSUNoQmNuSmhlVUoxWm1abGNpNXdjbTkwYjNSNWNHVXVhWE5RY205MGIzUjVjR1ZQWmloaWIyUjVLU0I4ZkNCcGMwRnljbUY1UW5WbVptVnlWbWxsZHloaWIyUjVLU2twSUh0Y2JpQWdJQ0FnSUNBZ2RHaHBjeTVmWW05a2VVRnljbUY1UW5WbVptVnlJRDBnWW5WbVptVnlRMnh2Ym1Vb1ltOWtlU2xjYmlBZ0lDQWdJSDBnWld4elpTQjdYRzRnSUNBZ0lDQWdJSFJvY205M0lHNWxkeUJGY25KdmNpZ25kVzV6ZFhCd2IzSjBaV1FnUW05a2VVbHVhWFFnZEhsd1pTY3BYRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJR2xtSUNnaGRHaHBjeTVvWldGa1pYSnpMbWRsZENnblkyOXVkR1Z1ZEMxMGVYQmxKeWtwSUh0Y2JpQWdJQ0FnSUNBZ2FXWWdLSFI1Y0dWdlppQmliMlI1SUQwOVBTQW5jM1J5YVc1bkp5a2dlMXh1SUNBZ0lDQWdJQ0FnSUhSb2FYTXVhR1ZoWkdWeWN5NXpaWFFvSjJOdmJuUmxiblF0ZEhsd1pTY3NJQ2QwWlhoMEwzQnNZV2x1TzJOb1lYSnpaWFE5VlZSR0xUZ25LVnh1SUNBZ0lDQWdJQ0I5SUdWc2MyVWdhV1lnS0hSb2FYTXVYMkp2WkhsQ2JHOWlJQ1ltSUhSb2FYTXVYMkp2WkhsQ2JHOWlMblI1Y0dVcElIdGNiaUFnSUNBZ0lDQWdJQ0IwYUdsekxtaGxZV1JsY25NdWMyVjBLQ2RqYjI1MFpXNTBMWFI1Y0dVbkxDQjBhR2x6TGw5aWIyUjVRbXh2WWk1MGVYQmxLVnh1SUNBZ0lDQWdJQ0I5SUdWc2MyVWdhV1lnS0hOMWNIQnZjblF1YzJWaGNtTm9VR0Z5WVcxeklDWW1JRlZTVEZObFlYSmphRkJoY21GdGN5NXdjbTkwYjNSNWNHVXVhWE5RY205MGIzUjVjR1ZQWmloaWIyUjVLU2tnZTF4dUlDQWdJQ0FnSUNBZ0lIUm9hWE11YUdWaFpHVnljeTV6WlhRb0oyTnZiblJsYm5RdGRIbHdaU2NzSUNkaGNIQnNhV05oZEdsdmJpOTRMWGQzZHkxbWIzSnRMWFZ5YkdWdVkyOWtaV1E3WTJoaGNuTmxkRDFWVkVZdE9DY3BYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJSDFjYmlBZ0lDQjlYRzVjYmlBZ0lDQnBaaUFvYzNWd2NHOXlkQzVpYkc5aUtTQjdYRzRnSUNBZ0lDQjBhR2x6TG1Kc2IySWdQU0JtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0FnSUNBZ2RtRnlJSEpsYW1WamRHVmtJRDBnWTI5dWMzVnRaV1FvZEdocGN5bGNiaUFnSUNBZ0lDQWdhV1lnS0hKbGFtVmpkR1ZrS1NCN1hHNGdJQ0FnSUNBZ0lDQWdjbVYwZFhKdUlISmxhbVZqZEdWa1hHNGdJQ0FnSUNBZ0lIMWNibHh1SUNBZ0lDQWdJQ0JwWmlBb2RHaHBjeTVmWW05a2VVSnNiMklwSUh0Y2JpQWdJQ0FnSUNBZ0lDQnlaWFIxY200Z1VISnZiV2x6WlM1eVpYTnZiSFpsS0hSb2FYTXVYMkp2WkhsQ2JHOWlLVnh1SUNBZ0lDQWdJQ0I5SUdWc2MyVWdhV1lnS0hSb2FYTXVYMkp2WkhsQmNuSmhlVUoxWm1abGNpa2dlMXh1SUNBZ0lDQWdJQ0FnSUhKbGRIVnliaUJRY205dGFYTmxMbkpsYzI5c2RtVW9ibVYzSUVKc2IySW9XM1JvYVhNdVgySnZaSGxCY25KaGVVSjFabVpsY2wwcEtWeHVJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2FXWWdLSFJvYVhNdVgySnZaSGxHYjNKdFJHRjBZU2tnZTF4dUlDQWdJQ0FnSUNBZ0lIUm9jbTkzSUc1bGR5QkZjbkp2Y2lnblkyOTFiR1FnYm05MElISmxZV1FnUm05eWJVUmhkR0VnWW05a2VTQmhjeUJpYkc5aUp5bGNiaUFnSUNBZ0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lDQWdJQ0J5WlhSMWNtNGdVSEp2YldselpTNXlaWE52YkhabEtHNWxkeUJDYkc5aUtGdDBhR2x6TGw5aWIyUjVWR1Y0ZEYwcEtWeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJSFJvYVhNdVlYSnlZWGxDZFdabVpYSWdQU0JtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0FnSUNBZ2FXWWdLSFJvYVhNdVgySnZaSGxCY25KaGVVSjFabVpsY2lrZ2UxeHVJQ0FnSUNBZ0lDQWdJSEpsZEhWeWJpQmpiMjV6ZFcxbFpDaDBhR2x6S1NCOGZDQlFjbTl0YVhObExuSmxjMjlzZG1Vb2RHaHBjeTVmWW05a2VVRnljbUY1UW5WbVptVnlLVnh1SUNBZ0lDQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdJQ0FnSUhKbGRIVnliaUIwYUdsekxtSnNiMklvS1M1MGFHVnVLSEpsWVdSQ2JHOWlRWE5CY25KaGVVSjFabVpsY2lsY2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUgxY2JseHVJQ0FnSUhSb2FYTXVkR1Y0ZENBOUlHWjFibU4wYVc5dUtDa2dlMXh1SUNBZ0lDQWdkbUZ5SUhKbGFtVmpkR1ZrSUQwZ1kyOXVjM1Z0WldRb2RHaHBjeWxjYmlBZ0lDQWdJR2xtSUNoeVpXcGxZM1JsWkNrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2NtVnFaV04wWldSY2JpQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ2FXWWdLSFJvYVhNdVgySnZaSGxDYkc5aUtTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQnlaV0ZrUW14dllrRnpWR1Y0ZENoMGFHbHpMbDlpYjJSNVFteHZZaWxjYmlBZ0lDQWdJSDBnWld4elpTQnBaaUFvZEdocGN5NWZZbTlrZVVGeWNtRjVRblZtWm1WeUtTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQlFjbTl0YVhObExuSmxjMjlzZG1Vb2NtVmhaRUZ5Y21GNVFuVm1abVZ5UVhOVVpYaDBLSFJvYVhNdVgySnZaSGxCY25KaGVVSjFabVpsY2lrcFhHNGdJQ0FnSUNCOUlHVnNjMlVnYVdZZ0tIUm9hWE11WDJKdlpIbEdiM0p0UkdGMFlTa2dlMXh1SUNBZ0lDQWdJQ0IwYUhKdmR5QnVaWGNnUlhKeWIzSW9KMk52ZFd4a0lHNXZkQ0J5WldGa0lFWnZjbTFFWVhSaElHSnZaSGtnWVhNZ2RHVjRkQ2NwWEc0Z0lDQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdVSEp2YldselpTNXlaWE52YkhabEtIUm9hWE11WDJKdlpIbFVaWGgwS1Z4dUlDQWdJQ0FnZlZ4dUlDQWdJSDFjYmx4dUlDQWdJR2xtSUNoemRYQndiM0owTG1admNtMUVZWFJoS1NCN1hHNGdJQ0FnSUNCMGFHbHpMbVp2Y20xRVlYUmhJRDBnWm5WdVkzUnBiMjRvS1NCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCMGFHbHpMblJsZUhRb0tTNTBhR1Z1S0dSbFkyOWtaU2xjYmlBZ0lDQWdJSDFjYmlBZ0lDQjlYRzVjYmlBZ0lDQjBhR2x6TG1wemIyNGdQU0JtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0FnSUhKbGRIVnliaUIwYUdsekxuUmxlSFFvS1M1MGFHVnVLRXBUVDA0dWNHRnljMlVwWEc0Z0lDQWdmVnh1WEc0Z0lDQWdjbVYwZFhKdUlIUm9hWE5jYmlBZ2ZWeHVYRzRnSUM4dklFaFVWRkFnYldWMGFHOWtjeUIzYUc5elpTQmpZWEJwZEdGc2FYcGhkR2x2YmlCemFHOTFiR1FnWW1VZ2JtOXliV0ZzYVhwbFpGeHVJQ0IyWVhJZ2JXVjBhRzlrY3lBOUlGc25SRVZNUlZSRkp5d2dKMGRGVkNjc0lDZElSVUZFSnl3Z0owOVFWRWxQVGxNbkxDQW5VRTlUVkNjc0lDZFFWVlFuWFZ4dVhHNGdJR1oxYm1OMGFXOXVJRzV2Y20xaGJHbDZaVTFsZEdodlpDaHRaWFJvYjJRcElIdGNiaUFnSUNCMllYSWdkWEJqWVhObFpDQTlJRzFsZEdodlpDNTBiMVZ3Y0dWeVEyRnpaU2dwWEc0Z0lDQWdjbVYwZFhKdUlDaHRaWFJvYjJSekxtbHVaR1Y0VDJZb2RYQmpZWE5sWkNrZ1BpQXRNU2tnUHlCMWNHTmhjMlZrSURvZ2JXVjBhRzlrWEc0Z0lIMWNibHh1SUNCbWRXNWpkR2x2YmlCU1pYRjFaWE4wS0dsdWNIVjBMQ0J2Y0hScGIyNXpLU0I3WEc0Z0lDQWdiM0IwYVc5dWN5QTlJRzl3ZEdsdmJuTWdmSHdnZTMxY2JpQWdJQ0IyWVhJZ1ltOWtlU0E5SUc5d2RHbHZibk11WW05a2VWeHVYRzRnSUNBZ2FXWWdLR2x1Y0hWMElHbHVjM1JoYm1ObGIyWWdVbVZ4ZFdWemRDa2dlMXh1SUNBZ0lDQWdhV1lnS0dsdWNIVjBMbUp2WkhsVmMyVmtLU0I3WEc0Z0lDQWdJQ0FnSUhSb2NtOTNJRzVsZHlCVWVYQmxSWEp5YjNJb0owRnNjbVZoWkhrZ2NtVmhaQ2NwWEc0Z0lDQWdJQ0I5WEc0Z0lDQWdJQ0IwYUdsekxuVnliQ0E5SUdsdWNIVjBMblZ5YkZ4dUlDQWdJQ0FnZEdocGN5NWpjbVZrWlc1MGFXRnNjeUE5SUdsdWNIVjBMbU55WldSbGJuUnBZV3h6WEc0Z0lDQWdJQ0JwWmlBb0lXOXdkR2x2Ym5NdWFHVmhaR1Z5Y3lrZ2UxeHVJQ0FnSUNBZ0lDQjBhR2x6TG1obFlXUmxjbk1nUFNCdVpYY2dTR1ZoWkdWeWN5aHBibkIxZEM1b1pXRmtaWEp6S1Z4dUlDQWdJQ0FnZlZ4dUlDQWdJQ0FnZEdocGN5NXRaWFJvYjJRZ1BTQnBibkIxZEM1dFpYUm9iMlJjYmlBZ0lDQWdJSFJvYVhNdWJXOWtaU0E5SUdsdWNIVjBMbTF2WkdWY2JpQWdJQ0FnSUdsbUlDZ2hZbTlrZVNBbUppQnBibkIxZEM1ZlltOWtlVWx1YVhRZ0lUMGdiblZzYkNrZ2UxeHVJQ0FnSUNBZ0lDQmliMlI1SUQwZ2FXNXdkWFF1WDJKdlpIbEpibWwwWEc0Z0lDQWdJQ0FnSUdsdWNIVjBMbUp2WkhsVmMyVmtJRDBnZEhKMVpWeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0IwYUdsekxuVnliQ0E5SUZOMGNtbHVaeWhwYm5CMWRDbGNiaUFnSUNCOVhHNWNiaUFnSUNCMGFHbHpMbU55WldSbGJuUnBZV3h6SUQwZ2IzQjBhVzl1Y3k1amNtVmtaVzUwYVdGc2N5QjhmQ0IwYUdsekxtTnlaV1JsYm5ScFlXeHpJSHg4SUNkdmJXbDBKMXh1SUNBZ0lHbG1JQ2h2Y0hScGIyNXpMbWhsWVdSbGNuTWdmSHdnSVhSb2FYTXVhR1ZoWkdWeWN5a2dlMXh1SUNBZ0lDQWdkR2hwY3k1b1pXRmtaWEp6SUQwZ2JtVjNJRWhsWVdSbGNuTW9iM0IwYVc5dWN5NW9aV0ZrWlhKektWeHVJQ0FnSUgxY2JpQWdJQ0IwYUdsekxtMWxkR2h2WkNBOUlHNXZjbTFoYkdsNlpVMWxkR2h2WkNodmNIUnBiMjV6TG0xbGRHaHZaQ0I4ZkNCMGFHbHpMbTFsZEdodlpDQjhmQ0FuUjBWVUp5bGNiaUFnSUNCMGFHbHpMbTF2WkdVZ1BTQnZjSFJwYjI1ekxtMXZaR1VnZkh3Z2RHaHBjeTV0YjJSbElIeDhJRzUxYkd4Y2JpQWdJQ0IwYUdsekxuSmxabVZ5Y21WeUlEMGdiblZzYkZ4dVhHNGdJQ0FnYVdZZ0tDaDBhR2x6TG0xbGRHaHZaQ0E5UFQwZ0owZEZWQ2NnZkh3Z2RHaHBjeTV0WlhSb2IyUWdQVDA5SUNkSVJVRkVKeWtnSmlZZ1ltOWtlU2tnZTF4dUlDQWdJQ0FnZEdoeWIzY2dibVYzSUZSNWNHVkZjbkp2Y2lnblFtOWtlU0J1YjNRZ1lXeHNiM2RsWkNCbWIzSWdSMFZVSUc5eUlFaEZRVVFnY21WeGRXVnpkSE1uS1Z4dUlDQWdJSDFjYmlBZ0lDQjBhR2x6TGw5cGJtbDBRbTlrZVNoaWIyUjVLVnh1SUNCOVhHNWNiaUFnVW1WeGRXVnpkQzV3Y205MGIzUjVjR1V1WTJ4dmJtVWdQU0JtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0J5WlhSMWNtNGdibVYzSUZKbGNYVmxjM1FvZEdocGN5d2dleUJpYjJSNU9pQjBhR2x6TGw5aWIyUjVTVzVwZENCOUtWeHVJQ0I5WEc1Y2JpQWdablZ1WTNScGIyNGdaR1ZqYjJSbEtHSnZaSGtwSUh0Y2JpQWdJQ0IyWVhJZ1ptOXliU0E5SUc1bGR5QkdiM0p0UkdGMFlTZ3BYRzRnSUNBZ1ltOWtlUzUwY21sdEtDa3VjM0JzYVhRb0p5WW5LUzVtYjNKRllXTm9LR1oxYm1OMGFXOXVLR0o1ZEdWektTQjdYRzRnSUNBZ0lDQnBaaUFvWW5sMFpYTXBJSHRjYmlBZ0lDQWdJQ0FnZG1GeUlITndiR2wwSUQwZ1lubDBaWE11YzNCc2FYUW9KejBuS1Z4dUlDQWdJQ0FnSUNCMllYSWdibUZ0WlNBOUlITndiR2wwTG5Ob2FXWjBLQ2t1Y21Wd2JHRmpaU2d2WEZ3ckwyY3NJQ2NnSnlsY2JpQWdJQ0FnSUNBZ2RtRnlJSFpoYkhWbElEMGdjM0JzYVhRdWFtOXBiaWduUFNjcExuSmxjR3hoWTJVb0wxeGNLeTluTENBbklDY3BYRzRnSUNBZ0lDQWdJR1p2Y20wdVlYQndaVzVrS0dSbFkyOWtaVlZTU1VOdmJYQnZibVZ1ZENodVlXMWxLU3dnWkdWamIyUmxWVkpKUTI5dGNHOXVaVzUwS0haaGJIVmxLU2xjYmlBZ0lDQWdJSDFjYmlBZ0lDQjlLVnh1SUNBZ0lISmxkSFZ5YmlCbWIzSnRYRzRnSUgxY2JseHVJQ0JtZFc1amRHbHZiaUJ3WVhKelpVaGxZV1JsY25Nb2NtRjNTR1ZoWkdWeWN5a2dlMXh1SUNBZ0lIWmhjaUJvWldGa1pYSnpJRDBnYm1WM0lFaGxZV1JsY25Nb0tWeHVJQ0FnSUM4dklGSmxjR3hoWTJVZ2FXNXpkR0Z1WTJWeklHOW1JRnhjY2x4Y2JpQmhibVFnWEZ4dUlHWnZiR3h2ZDJWa0lHSjVJR0YwSUd4bFlYTjBJRzl1WlNCemNHRmpaU0J2Y2lCb2IzSnBlbTl1ZEdGc0lIUmhZaUIzYVhSb0lHRWdjM0JoWTJWY2JpQWdJQ0F2THlCb2RIUndjem92TDNSdmIyeHpMbWxsZEdZdWIzSm5MMmgwYld3dmNtWmpOekl6TUNOelpXTjBhVzl1TFRNdU1seHVJQ0FnSUhaaGNpQndjbVZRY205alpYTnpaV1JJWldGa1pYSnpJRDBnY21GM1NHVmhaR1Z5Y3k1eVpYQnNZV05sS0M5Y1hISS9YRnh1VzF4Y2RDQmRLeTluTENBbklDY3BYRzRnSUNBZ2NISmxVSEp2WTJWemMyVmtTR1ZoWkdWeWN5NXpjR3hwZENndlhGeHlQMXhjYmk4cExtWnZja1ZoWTJnb1puVnVZM1JwYjI0b2JHbHVaU2tnZTF4dUlDQWdJQ0FnZG1GeUlIQmhjblJ6SUQwZ2JHbHVaUzV6Y0d4cGRDZ25PaWNwWEc0Z0lDQWdJQ0IyWVhJZ2EyVjVJRDBnY0dGeWRITXVjMmhwWm5Rb0tTNTBjbWx0S0NsY2JpQWdJQ0FnSUdsbUlDaHJaWGtwSUh0Y2JpQWdJQ0FnSUNBZ2RtRnlJSFpoYkhWbElEMGdjR0Z5ZEhNdWFtOXBiaWduT2ljcExuUnlhVzBvS1Z4dUlDQWdJQ0FnSUNCb1pXRmtaWEp6TG1Gd2NHVnVaQ2hyWlhrc0lIWmhiSFZsS1Z4dUlDQWdJQ0FnZlZ4dUlDQWdJSDBwWEc0Z0lDQWdjbVYwZFhKdUlHaGxZV1JsY25OY2JpQWdmVnh1WEc0Z0lFSnZaSGt1WTJGc2JDaFNaWEYxWlhOMExuQnliM1J2ZEhsd1pTbGNibHh1SUNCbWRXNWpkR2x2YmlCU1pYTndiMjV6WlNoaWIyUjVTVzVwZEN3Z2IzQjBhVzl1Y3lrZ2UxeHVJQ0FnSUdsbUlDZ2hiM0IwYVc5dWN5a2dlMXh1SUNBZ0lDQWdiM0IwYVc5dWN5QTlJSHQ5WEc0Z0lDQWdmVnh1WEc0Z0lDQWdkR2hwY3k1MGVYQmxJRDBnSjJSbFptRjFiSFFuWEc0Z0lDQWdkR2hwY3k1emRHRjBkWE1nUFNCdmNIUnBiMjV6TG5OMFlYUjFjeUE5UFQwZ2RXNWtaV1pwYm1Wa0lEOGdNakF3SURvZ2IzQjBhVzl1Y3k1emRHRjBkWE5jYmlBZ0lDQjBhR2x6TG05cklEMGdkR2hwY3k1emRHRjBkWE1nUGowZ01qQXdJQ1ltSUhSb2FYTXVjM1JoZEhWeklEd2dNekF3WEc0Z0lDQWdkR2hwY3k1emRHRjBkWE5VWlhoMElEMGdKM04wWVhSMWMxUmxlSFFuSUdsdUlHOXdkR2x2Ym5NZ1B5QnZjSFJwYjI1ekxuTjBZWFIxYzFSbGVIUWdPaUFuVDBzblhHNGdJQ0FnZEdocGN5NW9aV0ZrWlhKeklEMGdibVYzSUVobFlXUmxjbk1vYjNCMGFXOXVjeTVvWldGa1pYSnpLVnh1SUNBZ0lIUm9hWE11ZFhKc0lEMGdiM0IwYVc5dWN5NTFjbXdnZkh3Z0p5ZGNiaUFnSUNCMGFHbHpMbDlwYm1sMFFtOWtlU2hpYjJSNVNXNXBkQ2xjYmlBZ2ZWeHVYRzRnSUVKdlpIa3VZMkZzYkNoU1pYTndiMjV6WlM1d2NtOTBiM1I1Y0dVcFhHNWNiaUFnVW1WemNHOXVjMlV1Y0hKdmRHOTBlWEJsTG1Oc2IyNWxJRDBnWm5WdVkzUnBiMjRvS1NCN1hHNGdJQ0FnY21WMGRYSnVJRzVsZHlCU1pYTndiMjV6WlNoMGFHbHpMbDlpYjJSNVNXNXBkQ3dnZTF4dUlDQWdJQ0FnYzNSaGRIVnpPaUIwYUdsekxuTjBZWFIxY3l4Y2JpQWdJQ0FnSUhOMFlYUjFjMVJsZUhRNklIUm9hWE11YzNSaGRIVnpWR1Y0ZEN4Y2JpQWdJQ0FnSUdobFlXUmxjbk02SUc1bGR5QklaV0ZrWlhKektIUm9hWE11YUdWaFpHVnljeWtzWEc0Z0lDQWdJQ0IxY213NklIUm9hWE11ZFhKc1hHNGdJQ0FnZlNsY2JpQWdmVnh1WEc0Z0lGSmxjM0J2Ym5ObExtVnljbTl5SUQwZ1puVnVZM1JwYjI0b0tTQjdYRzRnSUNBZ2RtRnlJSEpsYzNCdmJuTmxJRDBnYm1WM0lGSmxjM0J2Ym5ObEtHNTFiR3dzSUh0emRHRjBkWE02SURBc0lITjBZWFIxYzFSbGVIUTZJQ2NuZlNsY2JpQWdJQ0J5WlhOd2IyNXpaUzUwZVhCbElEMGdKMlZ5Y205eUoxeHVJQ0FnSUhKbGRIVnliaUJ5WlhOd2IyNXpaVnh1SUNCOVhHNWNiaUFnZG1GeUlISmxaR2x5WldOMFUzUmhkSFZ6WlhNZ1BTQmJNekF4TENBek1ESXNJRE13TXl3Z016QTNMQ0F6TURoZFhHNWNiaUFnVW1WemNHOXVjMlV1Y21Wa2FYSmxZM1FnUFNCbWRXNWpkR2x2YmloMWNtd3NJSE4wWVhSMWN5a2dlMXh1SUNBZ0lHbG1JQ2h5WldScGNtVmpkRk4wWVhSMWMyVnpMbWx1WkdWNFQyWW9jM1JoZEhWektTQTlQVDBnTFRFcElIdGNiaUFnSUNBZ0lIUm9jbTkzSUc1bGR5QlNZVzVuWlVWeWNtOXlLQ2RKYm5aaGJHbGtJSE4wWVhSMWN5QmpiMlJsSnlsY2JpQWdJQ0I5WEc1Y2JpQWdJQ0J5WlhSMWNtNGdibVYzSUZKbGMzQnZibk5sS0c1MWJHd3NJSHR6ZEdGMGRYTTZJSE4wWVhSMWN5d2dhR1ZoWkdWeWN6b2dlMnh2WTJGMGFXOXVPaUIxY214OWZTbGNiaUFnZlZ4dVhHNGdJSE5sYkdZdVNHVmhaR1Z5Y3lBOUlFaGxZV1JsY25OY2JpQWdjMlZzWmk1U1pYRjFaWE4wSUQwZ1VtVnhkV1Z6ZEZ4dUlDQnpaV3htTGxKbGMzQnZibk5sSUQwZ1VtVnpjRzl1YzJWY2JseHVJQ0J6Wld4bUxtWmxkR05vSUQwZ1puVnVZM1JwYjI0b2FXNXdkWFFzSUdsdWFYUXBJSHRjYmlBZ0lDQnlaWFIxY200Z2JtVjNJRkJ5YjIxcGMyVW9ablZ1WTNScGIyNG9jbVZ6YjJ4MlpTd2djbVZxWldOMEtTQjdYRzRnSUNBZ0lDQjJZWElnY21WeGRXVnpkQ0E5SUc1bGR5QlNaWEYxWlhOMEtHbHVjSFYwTENCcGJtbDBLVnh1SUNBZ0lDQWdkbUZ5SUhob2NpQTlJRzVsZHlCWVRVeElkSFJ3VW1WeGRXVnpkQ2dwWEc1Y2JpQWdJQ0FnSUhob2NpNXZibXh2WVdRZ1BTQm1kVzVqZEdsdmJpZ3BJSHRjYmlBZ0lDQWdJQ0FnZG1GeUlHOXdkR2x2Ym5NZ1BTQjdYRzRnSUNBZ0lDQWdJQ0FnYzNSaGRIVnpPaUI0YUhJdWMzUmhkSFZ6TEZ4dUlDQWdJQ0FnSUNBZ0lITjBZWFIxYzFSbGVIUTZJSGhvY2k1emRHRjBkWE5VWlhoMExGeHVJQ0FnSUNBZ0lDQWdJR2hsWVdSbGNuTTZJSEJoY25ObFNHVmhaR1Z5Y3loNGFISXVaMlYwUVd4c1VtVnpjRzl1YzJWSVpXRmtaWEp6S0NrZ2ZId2dKeWNwWEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ2IzQjBhVzl1Y3k1MWNtd2dQU0FuY21WemNHOXVjMlZWVWt3bklHbHVJSGhvY2lBL0lIaG9jaTV5WlhOd2IyNXpaVlZTVENBNklHOXdkR2x2Ym5NdWFHVmhaR1Z5Y3k1blpYUW9KMWd0VW1WeGRXVnpkQzFWVWt3bktWeHVJQ0FnSUNBZ0lDQjJZWElnWW05a2VTQTlJQ2R5WlhOd2IyNXpaU2NnYVc0Z2VHaHlJRDhnZUdoeUxuSmxjM0J2Ym5ObElEb2dlR2h5TG5KbGMzQnZibk5sVkdWNGRGeHVJQ0FnSUNBZ0lDQnlaWE52YkhabEtHNWxkeUJTWlhOd2IyNXpaU2hpYjJSNUxDQnZjSFJwYjI1ektTbGNiaUFnSUNBZ0lIMWNibHh1SUNBZ0lDQWdlR2h5TG05dVpYSnliM0lnUFNCbWRXNWpkR2x2YmlncElIdGNiaUFnSUNBZ0lDQWdjbVZxWldOMEtHNWxkeUJVZVhCbFJYSnliM0lvSjA1bGRIZHZjbXNnY21WeGRXVnpkQ0JtWVdsc1pXUW5LU2xjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnZUdoeUxtOXVkR2x0Wlc5MWRDQTlJR1oxYm1OMGFXOXVLQ2tnZTF4dUlDQWdJQ0FnSUNCeVpXcGxZM1FvYm1WM0lGUjVjR1ZGY25KdmNpZ25UbVYwZDI5eWF5QnlaWEYxWlhOMElHWmhhV3hsWkNjcEtWeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQjRhSEl1YjNCbGJpaHlaWEYxWlhOMExtMWxkR2h2WkN3Z2NtVnhkV1Z6ZEM1MWNtd3NJSFJ5ZFdVcFhHNWNiaUFnSUNBZ0lHbG1JQ2h5WlhGMVpYTjBMbU55WldSbGJuUnBZV3h6SUQwOVBTQW5hVzVqYkhWa1pTY3BJSHRjYmlBZ0lDQWdJQ0FnZUdoeUxuZHBkR2hEY21Wa1pXNTBhV0ZzY3lBOUlIUnlkV1ZjYmlBZ0lDQWdJSDBnWld4elpTQnBaaUFvY21WeGRXVnpkQzVqY21Wa1pXNTBhV0ZzY3lBOVBUMGdKMjl0YVhRbktTQjdYRzRnSUNBZ0lDQWdJSGhvY2k1M2FYUm9RM0psWkdWdWRHbGhiSE1nUFNCbVlXeHpaVnh1SUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0JwWmlBb0ozSmxjM0J2Ym5ObFZIbHdaU2NnYVc0Z2VHaHlJQ1ltSUhOMWNIQnZjblF1WW14dllpa2dlMXh1SUNBZ0lDQWdJQ0I0YUhJdWNtVnpjRzl1YzJWVWVYQmxJRDBnSjJKc2IySW5YRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJSEpsY1hWbGMzUXVhR1ZoWkdWeWN5NW1iM0pGWVdOb0tHWjFibU4wYVc5dUtIWmhiSFZsTENCdVlXMWxLU0I3WEc0Z0lDQWdJQ0FnSUhob2NpNXpaWFJTWlhGMVpYTjBTR1ZoWkdWeUtHNWhiV1VzSUhaaGJIVmxLVnh1SUNBZ0lDQWdmU2xjYmx4dUlDQWdJQ0FnZUdoeUxuTmxibVFvZEhsd1pXOW1JSEpsY1hWbGMzUXVYMkp2WkhsSmJtbDBJRDA5UFNBbmRXNWtaV1pwYm1Wa0p5QS9JRzUxYkd3Z09pQnlaWEYxWlhOMExsOWliMlI1U1c1cGRDbGNiaUFnSUNCOUtWeHVJQ0I5WEc0Z0lITmxiR1l1Wm1WMFkyZ3VjRzlzZVdacGJHd2dQU0IwY25WbFhHNTlLU2gwZVhCbGIyWWdjMlZzWmlBaFBUMGdKM1Z1WkdWbWFXNWxaQ2NnUHlCelpXeG1JRG9nZEdocGN5azdYRzRpTENKamIyNXpkQ0JoY25ScFkyeGxWR1Z0Y0d4aGRHVWdQU0JnWEc1Y2REeGhjblJwWTJ4bElHTnNZWE56UFZ3aVlYSjBhV05zWlY5ZmIzVjBaWEpjSWo1Y2JseDBYSFE4WkdsMklHTnNZWE56UFZ3aVlYSjBhV05zWlY5ZmFXNXVaWEpjSWo1Y2JseDBYSFJjZER4a2FYWWdZMnhoYzNNOVhDSmhjblJwWTJ4bFgxOW9aV0ZrYVc1blhDSStYRzVjZEZ4MFhIUmNkRHhoSUdOc1lYTnpQVndpYW5NdFpXNTBjbmt0ZEdsMGJHVmNJajQ4TDJFK1hHNWNkRngwWEhSY2REeG9NaUJqYkdGemN6MWNJbUZ5ZEdsamJHVXRhR1ZoWkdsdVoxOWZkR2wwYkdWY0lqNDhMMmd5UGx4dVhIUmNkRngwWEhROFpHbDJJR05zWVhOelBWd2lZWEowYVdOc1pTMW9aV0ZrYVc1blgxOXVZVzFsWENJK1hHNWNkRngwWEhSY2RGeDBQSE53WVc0Z1kyeGhjM005WENKaGNuUnBZMnhsTFdobFlXUnBibWRmWDI1aGJXVXRMV1pwY25OMFhDSStQQzl6Y0dGdVBseHVYSFJjZEZ4MFhIUmNkRHhoSUdOc1lYTnpQVndpYW5NdFpXNTBjbmt0WVhKMGFYTjBYQ0krUEM5aFBseHVYSFJjZEZ4MFhIUmNkRHh6Y0dGdUlHTnNZWE56UFZ3aVlYSjBhV05zWlMxb1pXRmthVzVuWDE5dVlXMWxMUzFzWVhOMFhDSStQQzl6Y0dGdVBseHVYSFJjZEZ4MFhIUThMMlJwZGo1Y2JseDBYSFJjZER3dlpHbDJQbHgwWEc1Y2RGeDBYSFE4WkdsMklHTnNZWE56UFZ3aVlYSjBhV05zWlY5ZmFXMWhaMlZ6TFc5MWRHVnlYQ0krWEc1Y2RGeDBYSFJjZER4a2FYWWdZMnhoYzNNOVhDSmhjblJwWTJ4bFgxOXBiV0ZuWlhNdGFXNXVaWEpjSWo0OEwyUnBkajVjYmx4MFhIUmNkRngwUEhBZ1kyeGhjM005WENKcWN5MWhjblJwWTJ4bExXRnVZMmh2Y2kxMFlYSm5aWFJjSWo0OEwzQStYRzVjZEZ4MFBDOWthWFkrWEc1Y2REd3ZZWEowYVdOc1pUNWNibUE3WEc1Y2JtVjRjRzl5ZENCa1pXWmhkV3gwSUdGeWRHbGpiR1ZVWlcxd2JHRjBaVHNpTENKcGJYQnZjblFnSjNkb1lYUjNaeTFtWlhSamFDYzdYRzVwYlhCdmNuUWdjMjF2YjNSb2MyTnliMnhzSUdaeWIyMGdKM050YjI5MGFITmpjbTlzYkMxd2IyeDVabWxzYkNjN1hHNXBiWEJ2Y25RZ2JtRjJUR2NnWm5KdmJTQW5MaTl1WVhZdGJHY25PMXh1YVcxd2IzSjBJR0Z5ZEdsamJHVlVaVzF3YkdGMFpTQm1jbTl0SUNjdUwyRnlkR2xqYkdVdGRHVnRjR3hoZEdVbk8xeHVYRzVqYjI1emRDQkVRaUE5SUNkb2RIUndjem92TDI1bGVIVnpMV05oZEdGc2IyY3VabWx5WldKaGMyVnBieTVqYjIwdmNHOXpkSE11YW5OdmJqOWhkWFJvUFRkbk4zQjVTMHQ1YTA0elRqVmxkM0pKYldoUFlWTTJkbmR5Um5Oak5XWkxhM0pyT0dWcWVtWW5PMXh1WTI5dWMzUWdZV3h3YUdGaVpYUWdQU0JiSjJFbkxDQW5ZaWNzSUNkakp5d2dKMlFuTENBblpTY3NJQ2RtSnl3Z0oyY25MQ0FuYUNjc0lDZHBKeXdnSjJvbkxDQW5heWNzSUNkc0p5d2dKMjBuTENBbmJpY3NJQ2R2Snl3Z0ozQW5MQ0FuY2ljc0lDZHpKeXdnSjNRbkxDQW5kU2NzSUNkMkp5d2dKM2NuTENBbmVTY3NJQ2Q2SjEwN1hHNWNibU52Ym5OMElDUnNiMkZrYVc1bklEMGdRWEp5WVhrdVpuSnZiU2hrYjJOMWJXVnVkQzV4ZFdWeWVWTmxiR1ZqZEc5eVFXeHNLQ2N1Ykc5aFpHbHVaeWNwS1R0Y2JtTnZibk4wSUNSdVlYWWdQU0JrYjJOMWJXVnVkQzVuWlhSRmJHVnRaVzUwUW5sSlpDZ25hbk10Ym1GMkp5azdYRzVqYjI1emRDQWtjR0Z5WVd4c1lYZ2dQU0JrYjJOMWJXVnVkQzV4ZFdWeWVWTmxiR1ZqZEc5eUtDY3VjR0Z5WVd4c1lYZ25LVHRjYm1OdmJuTjBJQ1JqYjI1MFpXNTBJRDBnWkc5amRXMWxiblF1Y1hWbGNubFRaV3hsWTNSdmNpZ25MbU52Ym5SbGJuUW5LVHRjYm1OdmJuTjBJQ1IwYVhSc1pTQTlJR1J2WTNWdFpXNTBMbWRsZEVWc1pXMWxiblJDZVVsa0tDZHFjeTEwYVhSc1pTY3BPMXh1WTI5dWMzUWdKR0Z5Y205M0lEMGdaRzlqZFcxbGJuUXVjWFZsY25sVFpXeGxZM1J2Y2lnbkxtRnljbTkzSnlrN1hHNWpiMjV6ZENBa2JXOWtZV3dnUFNCa2IyTjFiV1Z1ZEM1eGRXVnllVk5sYkdWamRHOXlLQ2N1Ylc5a1lXd25LVHRjYm1OdmJuTjBJQ1JzYVdkb2RHSnZlQ0E5SUdSdlkzVnRaVzUwTG5GMVpYSjVVMlZzWldOMGIzSW9KeTVzYVdkb2RHSnZlQ2NwTzF4dVkyOXVjM1FnSkhacFpYY2dQU0JrYjJOMWJXVnVkQzV4ZFdWeWVWTmxiR1ZqZEc5eUtDY3ViR2xuYUhSaWIzZ3RkbWxsZHljcE8xeHVYRzVzWlhRZ2MyOXlkRXRsZVNBOUlEQTdJQzh2SURBZ1BTQmhjblJwYzNRc0lERWdQU0IwYVhSc1pWeHViR1YwSUdWdWRISnBaWE1nUFNCN0lHSjVRWFYwYUc5eU9pQmJYU3dnWW5sVWFYUnNaVG9nVzEwZ2ZUdGNibXhsZENCamRYSnlaVzUwVEdWMGRHVnlJRDBnSjBFbk8xeHVYRzVzWlhRZ2JHbG5hSFJpYjNnZ1BTQm1ZV3h6WlR0Y2JteGxkQ0I0TWlBOUlHWmhiSE5sTzF4dVkyOXVjM1FnWVhSMFlXTm9TVzFoWjJWTWFYTjBaVzVsY25NZ1BTQW9LU0E5UGlCN1hHNWNkR3hsZENBa2FXMWhaMlZ6SUQwZ1FYSnlZWGt1Wm5KdmJTaGtiMk4xYldWdWRDNXhkV1Z5ZVZObGJHVmpkRzl5UVd4c0tDY3VZWEowYVdOc1pTMXBiV0ZuWlNjcEtUdGNibHh1WEhRa2FXMWhaMlZ6TG1admNrVmhZMmdvYVcxbklEMCtJSHRjYmx4MFhIUnBiV2N1WVdSa1JYWmxiblJNYVhOMFpXNWxjaWduWTJ4cFkyc25MQ0FvWlhaMEtTQTlQaUI3WEc1Y2RGeDBYSFJwWmlBb0lXeHBaMmgwWW05NEtTQjdYRzVjZEZ4MFhIUmNkR3hsZENCemNtTWdQU0JwYldjdWMzSmpPMXh1WEhSY2RGeDBYSFF2THlCc1pYUWdkSGx3WlNBOUlHbHRaeTUzYVdSMGFDQStQU0JwYldjdWFHVnBaMmgwSUQ4Z0oyd25JRG9nSjNBbk8xeHVYSFJjZEZ4MFhIUmNibHgwWEhSY2RGeDBKR3hwWjJoMFltOTRMbU5zWVhOelRHbHpkQzVoWkdRb0ozTm9iM2N0YVcxbkp5azdYRzVjZEZ4MFhIUmNkQ1IyYVdWM0xuTmxkRUYwZEhKcFluVjBaU2duYzNSNWJHVW5MQ0JnWW1GamEyZHliM1Z1WkMxcGJXRm5aVG9nZFhKc0tDUjdjM0pqZlNsZ0tUdGNibHgwWEhSY2RGeDBiR2xuYUhSaWIzZ2dQU0IwY25WbE8xeHVYSFJjZEZ4MGZWeHVYSFJjZEgwcE8xeHVYSFI5S1R0Y2JseHVYSFFrZG1sbGR5NWhaR1JGZG1WdWRFeHBjM1JsYm1WeUtDZGpiR2xqYXljc0lDZ3BJRDArSUh0Y2JseDBYSFJwWmlBb2JHbG5hSFJpYjNncElIdGNibHgwWEhSY2RDUnNhV2RvZEdKdmVDNWpiR0Z6YzB4cGMzUXVjbVZ0YjNabEtDZHphRzkzTFdsdFp5Y3BPMXh1WEhSY2RGeDBKR3hwWjJoMFltOTRMbVpwY25OMFJXeGxiV1Z1ZEVOb2FXeGtMbU5zWVhOelRHbHpkQzV5WlcxdmRtVW9KM1pwWlhjdGVESW5LVHRjYmx4MFhIUmNkR3hwWjJoMFltOTRJRDBnWm1Gc2MyVTdYRzVjZEZ4MGZWeHVYSFI5S1R0Y2JuMDdYRzVjYm14bGRDQnRiMlJoYkNBOUlHWmhiSE5sTzF4dVkyOXVjM1FnWVhSMFlXTm9UVzlrWVd4TWFYTjBaVzVsY25NZ1BTQW9LU0E5UGlCN1hHNWNkR052Ym5OMElDUm1hVzVrSUQwZ1pHOWpkVzFsYm5RdVoyVjBSV3hsYldWdWRFSjVTV1FvSjJwekxXWnBibVFuS1R0Y2JseDBYRzVjZENSbWFXNWtMbUZrWkVWMlpXNTBUR2x6ZEdWdVpYSW9KMk5zYVdOckp5d2dLQ2tnUFQ0Z2UxeHVYSFJjZENSdGIyUmhiQzVqYkdGemMweHBjM1F1WVdSa0tDZHphRzkzSnlrN1hHNWNkRngwYlc5a1lXd2dQU0IwY25WbE8xeHVYSFI5S1R0Y2JseHVYSFFrYlc5a1lXd3VZV1JrUlhabGJuUk1hWE4wWlc1bGNpZ25ZMnhwWTJzbkxDQW9LU0E5UGlCN1hHNWNkRngwYzJWMFZHbHRaVzkxZENnb0tTQTlQaUI3WEc1Y2RGeDBYSFFrYlc5a1lXd3VZMnhoYzNOTWFYTjBMbkpsYlc5MlpTZ25jMmh2ZHljcE8xeHVYSFJjZEZ4MGJXOWtZV3dnUFNCbVlXeHpaVHRjYmx4MFhIUjlMQ0ExTURBcE8xeHVYSFI5S1R0Y2JseHVYSFIzYVc1a2IzY3VZV1JrUlhabGJuUk1hWE4wWlc1bGNpZ25hMlY1Wkc5M2JpY3NJQ2dwSUQwK0lIdGNibHgwWEhScFppQW9iVzlrWVd3cElIdGNibHgwWEhSY2RITmxkRlJwYldWdmRYUW9LQ2tnUFQ0Z2UxeHVYSFJjZEZ4MFhIUWtiVzlrWVd3dVkyeGhjM05NYVhOMExuSmxiVzkyWlNnbmMyaHZkeWNwTzF4dVhIUmNkRngwWEhSdGIyUmhiQ0E5SUdaaGJITmxPMXh1WEhSY2RGeDBmU3dnTmpBd0tUdGNibHgwWEhSOU8xeHVYSFI5S1R0Y2JuMWNibHh1WTI5dWMzUWdjMk55YjJ4c1ZHOVViM0FnUFNBb0tTQTlQaUI3WEc1Y2RHeGxkQ0IwYUdsdVp5QTlJR1J2WTNWdFpXNTBMbWRsZEVWc1pXMWxiblJDZVVsa0tDZGhibU5vYjNJdGRHRnlaMlYwSnlrN1hHNWNkSFJvYVc1bkxuTmpjbTlzYkVsdWRHOVdhV1YzS0h0aVpXaGhkbWx2Y2pvZ1hDSnpiVzl2ZEdoY0lpd2dZbXh2WTJzNklGd2ljM1JoY25SY0luMHBPMXh1ZlZ4dVhHNXNaWFFnY0hKbGRqdGNibXhsZENCamRYSnlaVzUwSUQwZ01EdGNibXhsZENCcGMxTm9iM2RwYm1jZ1BTQm1ZV3h6WlR0Y2JtTnZibk4wSUdGMGRHRmphRUZ5Y205M1RHbHpkR1Z1WlhKeklEMGdLQ2tnUFQ0Z2UxeHVYSFFrWVhKeWIzY3VZV1JrUlhabGJuUk1hWE4wWlc1bGNpZ25ZMnhwWTJzbkxDQW9LU0E5UGlCN1hHNWNkRngwYzJOeWIyeHNWRzlVYjNBb0tUdGNibHgwZlNrN1hHNWNibHgwSkhCaGNtRnNiR0Y0TG1Ga1pFVjJaVzUwVEdsemRHVnVaWElvSjNOamNtOXNiQ2NzSUNncElEMCtJSHRjYmx4dVhIUmNkR3hsZENCNUlEMGdKSFJwZEd4bExtZGxkRUp2ZFc1a2FXNW5RMnhwWlc1MFVtVmpkQ2dwTG5rN1hHNWNkRngwYVdZZ0tHTjFjbkpsYm5RZ0lUMDlJSGtwSUh0Y2JseDBYSFJjZEhCeVpYWWdQU0JqZFhKeVpXNTBPMXh1WEhSY2RGeDBZM1Z5Y21WdWRDQTlJSGs3WEc1Y2RGeDBmVnh1WEc1Y2RGeDBhV1lnS0hrZ1BEMGdMVFV3SUNZbUlDRnBjMU5vYjNkcGJtY3BJSHRjYmx4MFhIUmNkQ1JoY25KdmR5NWpiR0Z6YzB4cGMzUXVZV1JrS0NkemFHOTNKeWs3WEc1Y2RGeDBYSFJwYzFOb2IzZHBibWNnUFNCMGNuVmxPMXh1WEhSY2RIMGdaV3h6WlNCcFppQW9lU0ErSUMwMU1DQW1KaUJwYzFOb2IzZHBibWNwSUh0Y2JseDBYSFJjZENSaGNuSnZkeTVqYkdGemMweHBjM1F1Y21WdGIzWmxLQ2R6YUc5M0p5azdYRzVjZEZ4MFhIUnBjMU5vYjNkcGJtY2dQU0JtWVd4elpUdGNibHgwWEhSOVhHNWNkSDBwTzF4dWZUdGNibHh1WTI5dWMzUWdZV1JrVTI5eWRFSjFkSFJ2Ymt4cGMzUmxibVZ5Y3lBOUlDZ3BJRDArSUh0Y2JseDBiR1YwSUNSaWVVRnlkR2x6ZENBOUlHUnZZM1Z0Wlc1MExtZGxkRVZzWlcxbGJuUkNlVWxrS0NkcWN5MWllUzFoY25ScGMzUW5LVHRjYmx4MGJHVjBJQ1JpZVZScGRHeGxJRDBnWkc5amRXMWxiblF1WjJWMFJXeGxiV1Z1ZEVKNVNXUW9KMnB6TFdKNUxYUnBkR3hsSnlrN1hHNWNkQ1JpZVVGeWRHbHpkQzVoWkdSRmRtVnVkRXhwYzNSbGJtVnlLQ2RqYkdsamF5Y3NJQ2dwSUQwK0lIdGNibHgwWEhScFppQW9jMjl5ZEV0bGVTa2dlMXh1WEhSY2RGeDBjMk55YjJ4c1ZHOVViM0FvS1R0Y2JseDBYSFJjZEhOdmNuUkxaWGtnUFNBd08xeHVYSFJjZEZ4MEpHSjVRWEowYVhOMExtTnNZWE56VEdsemRDNWhaR1FvSjJGamRHbDJaU2NwTzF4dVhIUmNkRngwSkdKNVZHbDBiR1V1WTJ4aGMzTk1hWE4wTG5KbGJXOTJaU2duWVdOMGFYWmxKeWs3WEc1Y2JseDBYSFJjZEhKbGJtUmxja1Z1ZEhKcFpYTW9LVHRjYmx4MFhIUjlYRzVjZEgwcE8xeHVYRzVjZENSaWVWUnBkR3hsTG1Ga1pFVjJaVzUwVEdsemRHVnVaWElvSjJOc2FXTnJKeXdnS0NrZ1BUNGdlMXh1WEhSY2RHbG1JQ2doYzI5eWRFdGxlU2tnZTF4dVhIUmNkRngwYzJOeWIyeHNWRzlVYjNBb0tUdGNibHgwWEhSY2RITnZjblJMWlhrZ1BTQXhPMXh1WEhSY2RGeDBKR0o1VkdsMGJHVXVZMnhoYzNOTWFYTjBMbUZrWkNnbllXTjBhWFpsSnlrN1hHNWNkRngwWEhRa1lubEJjblJwYzNRdVkyeGhjM05NYVhOMExuSmxiVzkyWlNnbllXTjBhWFpsSnlrN1hHNWNibHgwWEhSY2RISmxibVJsY2tWdWRISnBaWE1vS1R0Y2JseDBYSFI5WEc1Y2RIMHBPMXh1ZlR0Y2JseHVZMjl1YzNRZ1kyeGxZWEpCYm1Ob2IzSnpJRDBnS0hCeVpYWlRaV3hsWTNSdmNpa2dQVDRnZTF4dVhIUnNaWFFnSkdWdWRISnBaWE1nUFNCQmNuSmhlUzVtY205dEtHUnZZM1Z0Wlc1MExuRjFaWEo1VTJWc1pXTjBiM0pCYkd3b2NISmxkbE5sYkdWamRHOXlLU2s3WEc1Y2RDUmxiblJ5YVdWekxtWnZja1ZoWTJnb1pXNTBjbmtnUFQ0Z1pXNTBjbmt1Y21WdGIzWmxRWFIwY21saWRYUmxLQ2R1WVcxbEp5a3BPMXh1ZlR0Y2JseHVZMjl1YzNRZ1ptbHVaRVpwY25OMFJXNTBjbmtnUFNBb1kyaGhjaWtnUFQ0Z2UxeHVYSFJzWlhRZ2MyVnNaV04wYjNJZ1BTQnpiM0owUzJWNUlEOGdKeTVxY3kxbGJuUnllUzEwYVhSc1pTY2dPaUFuTG1wekxXVnVkSEo1TFdGeWRHbHpkQ2M3WEc1Y2RHeGxkQ0J3Y21WMlUyVnNaV04wYjNJZ1BTQWhjMjl5ZEV0bGVTQS9JQ2N1YW5NdFpXNTBjbmt0ZEdsMGJHVW5JRG9nSnk1cWN5MWxiblJ5ZVMxaGNuUnBjM1FuTzF4dVhIUnNaWFFnSkdWdWRISnBaWE1nUFNCQmNuSmhlUzVtY205dEtHUnZZM1Z0Wlc1MExuRjFaWEo1VTJWc1pXTjBiM0pCYkd3b2MyVnNaV04wYjNJcEtUdGNibHh1WEhSamJHVmhja0Z1WTJodmNuTW9jSEpsZGxObGJHVmpkRzl5S1R0Y2JseHVYSFJ5WlhSMWNtNGdKR1Z1ZEhKcFpYTXVabWx1WkNobGJuUnllU0E5UGlCN1hHNWNkRngwYkdWMElHNXZaR1VnUFNCbGJuUnllUzV1WlhoMFJXeGxiV1Z1ZEZOcFlteHBibWM3WEc1Y2RGeDBjbVYwZFhKdUlHNXZaR1V1YVc1dVpYSklWRTFNV3pCZElEMDlQU0JqYUdGeUlIeDhJRzV2WkdVdWFXNXVaWEpJVkUxTVd6QmRJRDA5UFNCamFHRnlMblJ2VlhCd1pYSkRZWE5sS0NrN1hHNWNkSDBwTzF4dWZUdGNibHh1WEc1amIyNXpkQ0J0WVd0bFFXeHdhR0ZpWlhRZ1BTQW9LU0E5UGlCN1hHNWNkR052Ym5OMElHRjBkR0ZqYUVGdVkyaHZja3hwYzNSbGJtVnlJRDBnS0NSaGJtTm9iM0lzSUd4bGRIUmxjaWtnUFQ0Z2UxeHVYSFJjZENSaGJtTm9iM0l1WVdSa1JYWmxiblJNYVhOMFpXNWxjaWduWTJ4cFkyc25MQ0FvS1NBOVBpQjdYRzVjZEZ4MFhIUmpiMjV6ZENCc1pYUjBaWEpPYjJSbElEMGdaRzlqZFcxbGJuUXVaMlYwUld4bGJXVnVkRUo1U1dRb2JHVjBkR1Z5S1R0Y2JseDBYSFJjZEd4bGRDQjBZWEpuWlhRN1hHNWNibHgwWEhSY2RHbG1JQ2doYzI5eWRFdGxlU2tnZTF4dVhIUmNkRngwWEhSMFlYSm5aWFFnUFNCc1pYUjBaWElnUFQwOUlDZGhKeUEvSUdSdlkzVnRaVzUwTG1kbGRFVnNaVzFsYm5SQ2VVbGtLQ2RoYm1Ob2IzSXRkR0Z5WjJWMEp5a2dPaUJzWlhSMFpYSk9iMlJsTG5CaGNtVnVkRVZzWlcxbGJuUXVjR0Z5Wlc1MFJXeGxiV1Z1ZEM1d1lYSmxiblJGYkdWdFpXNTBMbkJoY21WdWRFVnNaVzFsYm5RdWNISmxkbWx2ZFhORmJHVnRaVzUwVTJsaWJHbHVaeTV4ZFdWeWVWTmxiR1ZqZEc5eUtDY3Vhbk10WVhKMGFXTnNaUzFoYm1Ob2IzSXRkR0Z5WjJWMEp5azdYRzVjZEZ4MFhIUjlJR1ZzYzJVZ2UxeHVYSFJjZEZ4MFhIUjBZWEpuWlhRZ1BTQnNaWFIwWlhJZ1BUMDlJQ2RoSnlBL0lHUnZZM1Z0Wlc1MExtZGxkRVZzWlcxbGJuUkNlVWxrS0NkaGJtTm9iM0l0ZEdGeVoyVjBKeWtnT2lCc1pYUjBaWEpPYjJSbExuQmhjbVZ1ZEVWc1pXMWxiblF1Y0dGeVpXNTBSV3hsYldWdWRDNXdZWEpsYm5SRmJHVnRaVzUwTG5CeVpYWnBiM1Z6Uld4bGJXVnVkRk5wWW14cGJtY3VjWFZsY25sVFpXeGxZM1J2Y2lnbkxtcHpMV0Z5ZEdsamJHVXRZVzVqYUc5eUxYUmhjbWRsZENjcE8xeHVYSFJjZEZ4MGZUdGNibHh1WEhSY2RGeDBkR0Z5WjJWMExuTmpjbTlzYkVsdWRHOVdhV1YzS0h0aVpXaGhkbWx2Y2pvZ1hDSnpiVzl2ZEdoY0lpd2dZbXh2WTJzNklGd2ljM1JoY25SY0luMHBPMXh1WEhSY2RIMHBPMXh1WEhSOU8xeHVYRzVjZEd4bGRDQmhZM1JwZG1WRmJuUnlhV1Z6SUQwZ2UzMDdYRzVjZEd4bGRDQWtiM1YwWlhJZ1BTQmtiMk4xYldWdWRDNXhkV1Z5ZVZObGJHVmpkRzl5S0NjdVlXeHdhR0ZpWlhSZlgyeGxkSFJsY25NbktUdGNibHgwSkc5MWRHVnlMbWx1Ym1WeVNGUk5UQ0E5SUNjbk8xeHVYRzVjZEdGc2NHaGhZbVYwTG1admNrVmhZMmdvYkdWMGRHVnlJRDArSUh0Y2JseDBYSFJzWlhRZ0pHWnBjbk4wUlc1MGNua2dQU0JtYVc1a1JtbHljM1JGYm5SeWVTaHNaWFIwWlhJcE8xeHVYSFJjZEd4bGRDQWtZVzVqYUc5eUlEMGdaRzlqZFcxbGJuUXVZM0psWVhSbFJXeGxiV1Z1ZENnbllTY3BPMXh1WEc1Y2RGeDBhV1lnS0NFa1ptbHljM1JGYm5SeWVTa2djbVYwZFhKdU8xeHVYRzVjZEZ4MEpHWnBjbk4wUlc1MGNua3VhV1FnUFNCc1pYUjBaWEk3WEc1Y2RGeDBKR0Z1WTJodmNpNXBibTVsY2toVVRVd2dQU0JzWlhSMFpYSXVkRzlWY0hCbGNrTmhjMlVvS1R0Y2JseDBYSFFrWVc1amFHOXlMbU5zWVhOelRtRnRaU0E5SUNkaGJIQm9ZV0psZEY5ZmJHVjBkR1Z5TFdGdVkyaHZjaWM3WEc1Y2JseDBYSFJoZEhSaFkyaEJibU5vYjNKTWFYTjBaVzVsY2lna1lXNWphRzl5TENCc1pYUjBaWElwTzF4dVhIUmNkQ1J2ZFhSbGNpNWhjSEJsYm1SRGFHbHNaQ2drWVc1amFHOXlLVHRjYmx4MGZTazdYRzU5TzF4dVhHNWpiMjV6ZENCeVpXNWtaWEpKYldGblpYTWdQU0FvYVcxaFoyVnpMQ0FrYVcxaFoyVnpLU0E5UGlCN1hHNWNkR2x0WVdkbGN5NW1iM0pGWVdOb0tHbHRZV2RsSUQwK0lIdGNibHgwWEhSamIyNXpkQ0J6Y21NZ1BTQmdMaTR2TGk0dllYTnpaWFJ6TDJsdFlXZGxjeThrZTJsdFlXZGxmV0E3WEc1Y2RGeDBiR1YwSUNScGJXY2dQU0JrYjJOMWJXVnVkQzVqY21WaGRHVkZiR1Z0Wlc1MEtDZEpUVWNuS1R0Y2JseDBYSFFrYVcxbkxtTnNZWE56VG1GdFpTQTlJQ2RoY25ScFkyeGxMV2x0WVdkbEp6dGNibHgwWEhRa2FXMW5Mbk55WXlBOUlITnlZenRjYmx4MFhIUWthVzFoWjJWekxtRndjR1Z1WkVOb2FXeGtLQ1JwYldjcE8xeHVYSFI5S1Z4dWZUdGNibHh1WTI5dWMzUWdjbVZ1WkdWeVJXNTBjbWxsY3lBOUlDZ3BJRDArSUh0Y2JseDBiR1YwSUNSaGNuUnBZMnhsVEdsemRDQTlJR1J2WTNWdFpXNTBMbWRsZEVWc1pXMWxiblJDZVVsa0tDZHFjeTFzYVhOMEp5azdYRzVjZEd4bGRDQmxiblJ5YVdWelRHbHpkQ0E5SUhOdmNuUkxaWGtnUHlCbGJuUnlhV1Z6TG1KNVZHbDBiR1VnT2lCbGJuUnlhV1Z6TG1KNVFYVjBhRzl5TzF4dVhHNWNkQ1JoY25ScFkyeGxUR2x6ZEM1cGJtNWxja2hVVFV3Z1BTQW5KenRjYmx4dVhIUmxiblJ5YVdWelRHbHpkQzVtYjNKRllXTm9LR1Z1ZEhKNUlEMCtJSHRjYmx4MFhIUnNaWFFnZXlCMGFYUnNaU3dnYkdGemRFNWhiV1VzSUdacGNuTjBUbUZ0WlN3Z2FXMWhaMlZ6TENCa1pYTmpjbWx3ZEdsdmJpd2daR1YwWVdsc0lIMGdQU0JsYm5SeWVUdGNibHh1WEhSY2RDUmhjblJwWTJ4bFRHbHpkQzVwYm5ObGNuUkJaR3BoWTJWdWRFaFVUVXdvSjJKbFptOXlaV1Z1WkNjc0lHRnlkR2xqYkdWVVpXMXdiR0YwWlNrN1hHNWNibHgwWEhSc1pYUWdKR2x0WVdkbGMwNXZaR1Z6SUQwZ1pHOWpkVzFsYm5RdWNYVmxjbmxUWld4bFkzUnZja0ZzYkNnbkxtRnlkR2xqYkdWZlgybHRZV2RsY3kxcGJtNWxjaWNwTzF4dVhIUmNkR3hsZENBa2FXMWhaMlZ6SUQwZ0pHbHRZV2RsYzA1dlpHVnpXeVJwYldGblpYTk9iMlJsY3k1c1pXNW5kR2dnTFNBeFhUdGNibHh1WEhSY2RHbG1JQ2hwYldGblpYTXViR1Z1WjNSb0tTQnlaVzVrWlhKSmJXRm5aWE1vYVcxaFoyVnpMQ0FrYVcxaFoyVnpLVHRjYmx4MFhIUmNibHgwWEhSc1pYUWdKR1JsYzJOeWFYQjBhVzl1VDNWMFpYSWdQU0JrYjJOMWJXVnVkQzVqY21WaGRHVkZiR1Z0Wlc1MEtDZGthWFluS1R0Y2JseDBYSFJzWlhRZ0pHUmxjMk55YVhCMGFXOXVUbTlrWlNBOUlHUnZZM1Z0Wlc1MExtTnlaV0YwWlVWc1pXMWxiblFvSjNBbktUdGNibHgwWEhSc1pYUWdKR1JsZEdGcGJFNXZaR1VnUFNCa2IyTjFiV1Z1ZEM1amNtVmhkR1ZGYkdWdFpXNTBLQ2R3SnlrN1hHNWNkRngwSkdSbGMyTnlhWEIwYVc5dVQzVjBaWEl1WTJ4aGMzTk1hWE4wTG1Ga1pDZ25ZWEowYVdOc1pTMWtaWE5qY21sd2RHbHZibDlmYjNWMFpYSW5LVHRjYmx4MFhIUWtaR1Z6WTNKcGNIUnBiMjVPYjJSbExtTnNZWE56VEdsemRDNWhaR1FvSjJGeWRHbGpiR1V0WkdWelkzSnBjSFJwYjI0bktUdGNibHgwWEhRa1pHVjBZV2xzVG05a1pTNWpiR0Z6YzB4cGMzUXVZV1JrS0NkaGNuUnBZMnhsTFdSbGRHRnBiQ2NwTzF4dVhHNWNkRngwSkdSbGMyTnlhWEIwYVc5dVRtOWtaUzVwYm01bGNraFVUVXdnUFNCa1pYTmpjbWx3ZEdsdmJqdGNibHgwWEhRa1pHVjBZV2xzVG05a1pTNXBibTVsY2toVVRVd2dQU0JrWlhSaGFXdzdYRzVjYmx4MFhIUWtaR1Z6WTNKcGNIUnBiMjVQZFhSbGNpNWhjSEJsYm1SRGFHbHNaQ2drWkdWelkzSnBjSFJwYjI1T2IyUmxMQ0FrWkdWMFlXbHNUbTlrWlNrN1hHNWNkRngwSkdsdFlXZGxjeTVoY0hCbGJtUkRhR2xzWkNna1pHVnpZM0pwY0hScGIyNVBkWFJsY2lrN1hHNWNibHgwWEhSc1pYUWdKSFJwZEd4bFRtOWtaWE1nUFNCa2IyTjFiV1Z1ZEM1eGRXVnllVk5sYkdWamRHOXlRV3hzS0NjdVlYSjBhV05zWlMxb1pXRmthVzVuWDE5MGFYUnNaU2NwTzF4dVhIUmNkR3hsZENBa2RHbDBiR1VnUFNBa2RHbDBiR1ZPYjJSbGMxc2tkR2wwYkdWT2IyUmxjeTVzWlc1bmRHZ2dMU0F4WFR0Y2JseHVYSFJjZEd4bGRDQWtabWx5YzNST2IyUmxjeUE5SUdSdlkzVnRaVzUwTG5GMVpYSjVVMlZzWldOMGIzSkJiR3dvSnk1aGNuUnBZMnhsTFdobFlXUnBibWRmWDI1aGJXVXRMV1pwY25OMEp5azdYRzVjZEZ4MGJHVjBJQ1JtYVhKemRDQTlJQ1JtYVhKemRFNXZaR1Z6V3lSbWFYSnpkRTV2WkdWekxteGxibWQwYUNBdElERmRPMXh1WEc1Y2RGeDBiR1YwSUNSc1lYTjBUbTlrWlhNZ1BTQmtiMk4xYldWdWRDNXhkV1Z5ZVZObGJHVmpkRzl5UVd4c0tDY3VZWEowYVdOc1pTMW9aV0ZrYVc1blgxOXVZVzFsTFMxc1lYTjBKeWs3WEc1Y2RGeDBiR1YwSUNSc1lYTjBJRDBnSkd4aGMzUk9iMlJsYzFza2JHRnpkRTV2WkdWekxteGxibWQwYUNBdElERmRPMXh1WEc1Y2RGeDBKSFJwZEd4bExtbHVibVZ5U0ZSTlRDQTlJSFJwZEd4bE8xeHVYSFJjZENSbWFYSnpkQzVwYm01bGNraFVUVXdnUFNCbWFYSnpkRTVoYldVN1hHNWNkRngwSkd4aGMzUXVhVzV1WlhKSVZFMU1JRDBnYkdGemRFNWhiV1U3WEc1Y2JseDBmU2s3WEc1Y2JseDBZWFIwWVdOb1NXMWhaMlZNYVhOMFpXNWxjbk1vS1R0Y2JseDBiV0ZyWlVGc2NHaGhZbVYwS0NrN1hHNTlPMXh1WEc0dkx5QjBhR2x6SUc1bFpXUnpJSFJ2SUdKbElHRWdaR1ZsY0dWeUlITnZjblJjYm1OdmJuTjBJSE52Y25SQ2VWUnBkR3hsSUQwZ0tDa2dQVDRnZTF4dVhIUmxiblJ5YVdWekxtSjVWR2wwYkdVdWMyOXlkQ2dvWVN3Z1lpa2dQVDRnZTF4dVhIUmNkR3hsZENCaFZHbDBiR1VnUFNCaExuUnBkR3hsV3pCZExuUnZWWEJ3WlhKRFlYTmxLQ2s3WEc1Y2RGeDBiR1YwSUdKVWFYUnNaU0E5SUdJdWRHbDBiR1ZiTUYwdWRHOVZjSEJsY2tOaGMyVW9LVHRjYmx4MFhIUnBaaUFvWVZScGRHeGxJRDRnWWxScGRHeGxLU0J5WlhSMWNtNGdNVHRjYmx4MFhIUmxiSE5sSUdsbUlDaGhWR2wwYkdVZ1BDQmlWR2wwYkdVcElISmxkSFZ5YmlBdE1UdGNibHgwWEhSbGJITmxJSEpsZEhWeWJpQXdPMXh1WEhSOUtUdGNibjA3WEc1Y2JtTnZibk4wSUhObGRFUmhkR0VnUFNBb1pHRjBZU2tnUFQ0Z2UxeHVYSFJsYm5SeWFXVnpMbUo1UVhWMGFHOXlJRDBnWkdGMFlUdGNibHgwWlc1MGNtbGxjeTVpZVZScGRHeGxJRDBnWkdGMFlTNXpiR2xqWlNncE8xeHVYSFJ6YjNKMFFubFVhWFJzWlNncE8xeHVYSFJ5Wlc1a1pYSkZiblJ5YVdWektDazdYRzU5WEc1Y2JtTnZibk4wSUdabGRHTm9SR0YwWVNBOUlDZ3BJRDArSUh0Y2JseDBYSFJtWlhSamFDaEVRaWt1ZEdobGJpaHlaWE1nUFQ1Y2JseDBYSFJjZEhKbGN5NXFjMjl1S0NsY2JseDBYSFFwTG5Sb1pXNG9aR0YwWVNBOVBpQjdYRzVjZEZ4MFhIUnpaWFJFWVhSaEtHUmhkR0VwTzF4dVhIUmNkSDBwWEc1Y2RGeDBMblJvWlc0b0tDa2dQVDRnZTF4dVhIUmNkRngwSkd4dllXUnBibWN1Wm05eVJXRmphQ2hsYkdWdElEMCtJR1ZzWlcwdVkyeGhjM05NYVhOMExtRmtaQ2duY21WaFpIa25LU2s3WEc1Y2RGeDBYSFFrYm1GMkxtTnNZWE56VEdsemRDNWhaR1FvSjNKbFlXUjVKeWs3WEc1Y2RGeDBmU2xjYmx4MFhIUXVZMkYwWTJnb1pYSnlJRDArSUdOdmJuTnZiR1V1ZDJGeWJpaGxjbklwS1R0Y2JuMDdYRzVjYm1OdmJuTjBJR2x1YVhRZ1BTQW9LU0E5UGlCN1hHNWNkSE50YjI5MGFITmpjbTlzYkM1d2IyeDVabWxzYkNncE8xeHVYSFJtWlhSamFFUmhkR0VvS1R0Y2JseDBibUYyVEdjb0tUdGNibHgwY21WdVpHVnlSVzUwY21sbGN5Z3BPMXh1WEhSaFpHUlRiM0owUW5WMGRHOXVUR2x6ZEdWdVpYSnpLQ2s3WEc1Y2RHRjBkR0ZqYUVGeWNtOTNUR2x6ZEdWdVpYSnpLQ2s3WEc1Y2RHRjBkR0ZqYUUxdlpHRnNUR2x6ZEdWdVpYSnpLQ2s3WEc1OVhHNWNibWx1YVhRb0tUdGNiaUlzSW1OdmJuTjBJSFJsYlhCc1lYUmxJRDBnWEc1Y2RHQThaR2wySUdOc1lYTnpQVndpYm1GMlgxOXBibTVsY2x3aVBseHVYSFJjZER4a2FYWWdZMnhoYzNNOVhDSnVZWFpmWDNOdmNuUXRZbmxjSWo1Y2JseDBYSFJjZER4emNHRnVJR05zWVhOelBWd2ljMjl5ZEMxaWVWOWZkR2wwYkdWY0lqNVRiM0owSUdKNVBDOXpjR0Z1UGx4dVhIUmNkRngwUEdKMWRIUnZiaUJqYkdGemN6MWNJbk52Y25RdFlubGZYMko1TFdGeWRHbHpkQ0JoWTNScGRtVmNJaUJwWkQxY0ltcHpMV0o1TFdGeWRHbHpkRndpUGtGeWRHbHpkRHd2WW5WMGRHOXVQbHh1WEhSY2RGeDBQSE53WVc0Z1kyeGhjM005WENKemIzSjBMV0o1WDE5a2FYWnBaR1Z5WENJK0lId2dQQzl6Y0dGdVBseHVYSFJjZEZ4MFBHSjFkSFJ2YmlCamJHRnpjejFjSW5OdmNuUXRZbmxmWDJKNUxYUnBkR3hsWENJZ2FXUTlYQ0pxY3kxaWVTMTBhWFJzWlZ3aVBsUnBkR3hsUEM5aWRYUjBiMjQrWEc1Y2RGeDBYSFE4YzNCaGJpQmpiR0Z6Y3oxY0luTnZjblF0WW5sZlgyUnBkbWxrWlhJZ1ptbHVaRndpUGlCOElEd3ZjM0JoYmo1Y2JseDBYSFJjZER4emNHRnVJR05zWVhOelBWd2labWx1WkZ3aUlHbGtQVndpYW5NdFptbHVaRndpUGlZak9EazRORHRHUEM5emNHRnVQbHh1WEhSY2REd3ZaR2wyUGx4dVhIUmNkRHhrYVhZZ1kyeGhjM005WENKdVlYWmZYMkZzY0doaFltVjBYQ0krWEc1Y2RGeDBYSFE4YzNCaGJpQmpiR0Z6Y3oxY0ltRnNjR2hoWW1WMFgxOTBhWFJzWlZ3aVBrZHZJSFJ2UEM5emNHRnVQbHh1WEhSY2RGeDBQR1JwZGlCamJHRnpjejFjSW1Gc2NHaGhZbVYwWDE5c1pYUjBaWEp6WENJK1BDOWthWFkrWEc1Y2RGeDBQQzlrYVhZK1hHNWNkRHd2WkdsMlBtQTdYRzVjYm1OdmJuTjBJRzVoZGt4bklEMGdLQ2tnUFQ0Z2UxeHVYSFJzWlhRZ2JtRjJUM1YwWlhJZ1BTQmtiMk4xYldWdWRDNW5aWFJGYkdWdFpXNTBRbmxKWkNnbmFuTXRibUYySnlrN1hHNWNkRzVoZGs5MWRHVnlMbWx1Ym1WeVNGUk5UQ0E5SUhSbGJYQnNZWFJsTzF4dWZUdGNibHh1Wlhod2IzSjBJR1JsWm1GMWJIUWdibUYyVEdjN0lsMTkifQ==
