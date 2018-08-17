(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
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

},{}],2:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});
var articleTemplate = "\n\t<article class=\"article__outer\">\n\t\t<div class=\"article__inner\">\n\t\t\t<div class=\"article__heading\">\n\t\t\t\t<a class=\"js-entry-title\"></a>\n\t\t\t\t<h2 class=\"article-heading__title\"></h2>\n\t\t\t\t<div class=\"article-heading__name\">\n\t\t\t\t\t<span class=\"article-heading__name--first\"></span>\n\t\t\t\t\t<a class=\"js-entry-artist\"></a>\n\t\t\t\t\t<span class=\"article-heading__name--last\"></span>\n\t\t\t\t</div>\n\t\t\t</div>\t\n\t\t\t<div class=\"article__images-outer\">\n\t\t\t\t<div class=\"article__images-inner\"></div>\n\t\t\t\t<p class=\"js-article-anchor-target\"></p>\n\t\t</div>\n\t</article>\n";

exports.default = articleTemplate;

},{}],3:[function(require,module,exports){
'use strict';

require('whatwg-fetch');

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
var attachImageListeners = function attachImageListeners() {
	var $images = Array.from(document.querySelectorAll('.article-image'));

	$images.forEach(function (img) {
		img.addEventListener('click', function () {
			var src = img.src;
			$lightbox.classList.add('show-img');
			$view.setAttribute('style', 'background-image: url(' + src + ')');
			lightbox = true;
		});
	});

	$view.addEventListener('click', function () {
		if (lightbox) {
			$lightbox.classList.remove('show-img');
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

var makeAlphabet = function makeAlphabet() {
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
		$outer.append($anchor);
	});
};

var renderImages = function renderImages(images, $images) {
	images.forEach(function (image) {
		var src = '../../assets/images/' + image;
		var $img = document.createElement('IMG');
		$img.className = 'article-image';
		$img.src = src;
		$images.append($img);
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

		$descriptionOuter.append($descriptionNode, $detailNode);
		$images.append($descriptionOuter);

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

	makeAlphabet();
};

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
		attachImageListeners();
		$loading.forEach(function (elem) {
			return elem.classList.add('ready');
		});
		$nav.classList.add('ready');
	}).catch(function (err) {
		return console.warn(err);
	});
};

var init = function init() {
	fetchData();
	(0, _navLg2.default)();
	renderEntries();
	addSortButtonListeners();
	attachArrowListeners();
	attachModalListeners();
};

init();

},{"./article-template":2,"./nav-lg":4,"whatwg-fetch":1}],4:[function(require,module,exports){
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

},{}]},{},[3])

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvd2hhdHdnLWZldGNoL2ZldGNoLmpzIiwic3JjL2pzL2FydGljbGUtdGVtcGxhdGUuanMiLCJzcmMvanMvaW5kZXguanMiLCJzcmMvanMvbmF2LWxnLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7OztBQ2xkQSxJQUFNLGlwQkFBTjs7a0JBbUJlLGU7Ozs7O0FDbkJmOztBQUNBOzs7O0FBQ0E7Ozs7OztBQUVBLElBQU0sS0FBSywrRkFBWDtBQUNBLElBQU0sV0FBVyxDQUFDLEdBQUQsRUFBTSxHQUFOLEVBQVcsR0FBWCxFQUFnQixHQUFoQixFQUFxQixHQUFyQixFQUEwQixHQUExQixFQUEr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T0FBTyxDQUFQLENBQXJCLEtBQ0ssSUFBSSxTQUFTLE1BQWIsRUFBcUIsT0FBTyxDQUFDLENBQVIsQ0FBckIsS0FDQSxPQUFPLENBQVA7QUFDTCxFQU5EO0FBT0EsQ0FSRDs7QUFVQSxJQUFNLFVBQVUsU0FBVixPQUFVLENBQUMsSUFBRCxFQUFVO0FBQ3pCLFNBQVEsUUFBUixHQUFtQixJQUFuQjtBQUNBLFNBQVEsT0FBUixHQUFrQixLQUFLLEtBQUwsRUFBbEI7QUFDQTtBQUNBO0FBQ0EsQ0FMRDs7QUFPQSxJQUFNLFlBQVksU0FBWixTQUFZLEdBQU07O0FBRXRCLE9BQU0sRUFBTixFQUFVLElBQVYsQ0FBZTtBQUFBLFNBQ2QsSUFBSSxJQUFKLEVBRGM7QUFBQSxFQUFmLEVBRUUsSUFGRixDQUVPLGdCQUFRO0FBQ2QsVUFBUSxJQUFSO0FBQ0EsRUFKRCxFQUtDLElBTEQsQ0FLTSxZQUFNO0FBQ1g7QUFDQSxXQUFTLE9BQVQsQ0FBaUI7QUFBQSxVQUFRLEtBQUssU0FBTCxDQUFlLEdBQWYsQ0FBbUIsT0FBbkIsQ0FBUjtBQUFBLEdBQWpCO0FBQ0EsT0FBSyxTQUFMLENBQWUsR0FBZixDQUFtQixPQUFuQjtBQUNBLEVBVEQsRUFVQyxLQVZELENBVU87QUFBQSxTQUFPLFFBQVEsSUFBUixDQUFhLEdBQWIsQ0FBUDtBQUFBLEVBVlA7QUFXRCxDQWJEOztBQWVBLElBQU0sT0FBTyxTQUFQLElBQU8sR0FBTTtBQUNsQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxDQVBEOztBQVNBOzs7Ozs7OztBQ3JSQSxJQUFNLG9sQkFBTjs7QUFnQkEsSUFBTSxRQUFRLFNBQVIsS0FBUSxHQUFNO0FBQ25CLEtBQUksV0FBVyxTQUFTLGNBQVQsQ0FBd0IsUUFBeEIsQ0FBZjtBQUNBLFVBQVMsU0FBVCxHQUFxQixRQUFyQjtBQUNBLENBSEQ7O2tCQUtlLEsiLCJmaWxlIjoiYnVuZGxlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIihmdW5jdGlvbihzZWxmKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICBpZiAoc2VsZi5mZXRjaCkge1xuICAgIHJldHVyblxuICB9XG5cbiAgdmFyIHN1cHBvcnQgPSB7XG4gICAgc2VhcmNoUGFyYW1zOiAnVVJMU2VhcmNoUGFyYW1zJyBpbiBzZWxmLFxuICAgIGl0ZXJhYmxlOiAnU3ltYm9sJyBpbiBzZWxmICYmICdpdGVyYXRvcicgaW4gU3ltYm9sLFxuICAgIGJsb2I6ICdGaWxlUmVhZGVyJyBpbiBzZWxmICYmICdCbG9iJyBpbiBzZWxmICYmIChmdW5jdGlvbigpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIG5ldyBCbG9iKClcbiAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgIH1cbiAgICB9KSgpLFxuICAgIGZvcm1EYXRhOiAnRm9ybURhdGEnIGluIHNlbGYsXG4gICAgYXJyYXlCdWZmZXI6ICdBcnJheUJ1ZmZlcicgaW4gc2VsZlxuICB9XG5cbiAgaWYgKHN1cHBvcnQuYXJyYXlCdWZmZXIpIHtcbiAgICB2YXIgdmlld0NsYXNzZXMgPSBbXG4gICAgICAnW29iamVjdCBJbnQ4QXJyYXldJyxcbiAgICAgICdbb2JqZWN0IFVpbnQ4QXJyYXldJyxcbiAgICAgICdbb2JqZWN0IFVpbnQ4Q2xhbXBlZEFycmF5XScsXG4gICAgICAnW29iamVjdCBJbnQxNkFycmF5XScsXG4gICAgICAnW29iamVjdCBVaW50MTZBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgSW50MzJBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgVWludDMyQXJyYXldJyxcbiAgICAgICdbb2JqZWN0IEZsb2F0MzJBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgRmxvYXQ2NEFycmF5XSdcbiAgICBdXG5cbiAgICB2YXIgaXNEYXRhVmlldyA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIG9iaiAmJiBEYXRhVmlldy5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihvYmopXG4gICAgfVxuXG4gICAgdmFyIGlzQXJyYXlCdWZmZXJWaWV3ID0gQXJyYXlCdWZmZXIuaXNWaWV3IHx8IGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIG9iaiAmJiB2aWV3Q2xhc3Nlcy5pbmRleE9mKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopKSA+IC0xXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gbm9ybWFsaXplTmFtZShuYW1lKSB7XG4gICAgaWYgKHR5cGVvZiBuYW1lICE9PSAnc3RyaW5nJykge1xuICAgICAgbmFtZSA9IFN0cmluZyhuYW1lKVxuICAgIH1cbiAgICBpZiAoL1teYS16MC05XFwtIyQlJicqKy5cXF5fYHx+XS9pLnRlc3QobmFtZSkpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgY2hhcmFjdGVyIGluIGhlYWRlciBmaWVsZCBuYW1lJylcbiAgICB9XG4gICAgcmV0dXJuIG5hbWUudG9Mb3dlckNhc2UoKVxuICB9XG5cbiAgZnVuY3Rpb24gbm9ybWFsaXplVmFsdWUodmFsdWUpIHtcbiAgICBpZiAodHlwZW9mIHZhbHVlICE9PSAnc3RyaW5nJykge1xuICAgICAgdmFsdWUgPSBTdHJpbmcodmFsdWUpXG4gICAgfVxuICAgIHJldHVybiB2YWx1ZVxuICB9XG5cbiAgLy8gQnVpbGQgYSBkZXN0cnVjdGl2ZSBpdGVyYXRvciBmb3IgdGhlIHZhbHVlIGxpc3RcbiAgZnVuY3Rpb24gaXRlcmF0b3JGb3IoaXRlbXMpIHtcbiAgICB2YXIgaXRlcmF0b3IgPSB7XG4gICAgICBuZXh0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gaXRlbXMuc2hpZnQoKVxuICAgICAgICByZXR1cm4ge2RvbmU6IHZhbHVlID09PSB1bmRlZmluZWQsIHZhbHVlOiB2YWx1ZX1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoc3VwcG9ydC5pdGVyYWJsZSkge1xuICAgICAgaXRlcmF0b3JbU3ltYm9sLml0ZXJhdG9yXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gaXRlcmF0b3JcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gaXRlcmF0b3JcbiAgfVxuXG4gIGZ1bmN0aW9uIEhlYWRlcnMoaGVhZGVycykge1xuICAgIHRoaXMubWFwID0ge31cblxuICAgIGlmIChoZWFkZXJzIGluc3RhbmNlb2YgSGVhZGVycykge1xuICAgICAgaGVhZGVycy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlLCBuYW1lKSB7XG4gICAgICAgIHRoaXMuYXBwZW5kKG5hbWUsIHZhbHVlKVxuICAgICAgfSwgdGhpcylcbiAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoaGVhZGVycykpIHtcbiAgICAgIGhlYWRlcnMuZm9yRWFjaChmdW5jdGlvbihoZWFkZXIpIHtcbiAgICAgICAgdGhpcy5hcHBlbmQoaGVhZGVyWzBdLCBoZWFkZXJbMV0pXG4gICAgICB9LCB0aGlzKVxuICAgIH0gZWxzZSBpZiAoaGVhZGVycykge1xuICAgICAgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoaGVhZGVycykuZm9yRWFjaChmdW5jdGlvbihuYW1lKSB7XG4gICAgICAgIHRoaXMuYXBwZW5kKG5hbWUsIGhlYWRlcnNbbmFtZV0pXG4gICAgICB9LCB0aGlzKVxuICAgIH1cbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmFwcGVuZCA9IGZ1bmN0aW9uKG5hbWUsIHZhbHVlKSB7XG4gICAgbmFtZSA9IG5vcm1hbGl6ZU5hbWUobmFtZSlcbiAgICB2YWx1ZSA9IG5vcm1hbGl6ZVZhbHVlKHZhbHVlKVxuICAgIHZhciBvbGRWYWx1ZSA9IHRoaXMubWFwW25hbWVdXG4gICAgdGhpcy5tYXBbbmFtZV0gPSBvbGRWYWx1ZSA/IG9sZFZhbHVlKycsJyt2YWx1ZSA6IHZhbHVlXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZVsnZGVsZXRlJ10gPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgZGVsZXRlIHRoaXMubWFwW25vcm1hbGl6ZU5hbWUobmFtZSldXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgbmFtZSA9IG5vcm1hbGl6ZU5hbWUobmFtZSlcbiAgICByZXR1cm4gdGhpcy5oYXMobmFtZSkgPyB0aGlzLm1hcFtuYW1lXSA6IG51bGxcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmhhcyA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy5tYXAuaGFzT3duUHJvcGVydHkobm9ybWFsaXplTmFtZShuYW1lKSlcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uKG5hbWUsIHZhbHVlKSB7XG4gICAgdGhpcy5tYXBbbm9ybWFsaXplTmFtZShuYW1lKV0gPSBub3JtYWxpemVWYWx1ZSh2YWx1ZSlcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmZvckVhY2ggPSBmdW5jdGlvbihjYWxsYmFjaywgdGhpc0FyZykge1xuICAgIGZvciAodmFyIG5hbWUgaW4gdGhpcy5tYXApIHtcbiAgICAgIGlmICh0aGlzLm1hcC5oYXNPd25Qcm9wZXJ0eShuYW1lKSkge1xuICAgICAgICBjYWxsYmFjay5jYWxsKHRoaXNBcmcsIHRoaXMubWFwW25hbWVdLCBuYW1lLCB0aGlzKVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmtleXMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgaXRlbXMgPSBbXVxuICAgIHRoaXMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSwgbmFtZSkgeyBpdGVtcy5wdXNoKG5hbWUpIH0pXG4gICAgcmV0dXJuIGl0ZXJhdG9yRm9yKGl0ZW1zKVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUudmFsdWVzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGl0ZW1zID0gW11cbiAgICB0aGlzLmZvckVhY2goZnVuY3Rpb24odmFsdWUpIHsgaXRlbXMucHVzaCh2YWx1ZSkgfSlcbiAgICByZXR1cm4gaXRlcmF0b3JGb3IoaXRlbXMpXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5lbnRyaWVzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGl0ZW1zID0gW11cbiAgICB0aGlzLmZvckVhY2goZnVuY3Rpb24odmFsdWUsIG5hbWUpIHsgaXRlbXMucHVzaChbbmFtZSwgdmFsdWVdKSB9KVxuICAgIHJldHVybiBpdGVyYXRvckZvcihpdGVtcylcbiAgfVxuXG4gIGlmIChzdXBwb3J0Lml0ZXJhYmxlKSB7XG4gICAgSGVhZGVycy5wcm90b3R5cGVbU3ltYm9sLml0ZXJhdG9yXSA9IEhlYWRlcnMucHJvdG90eXBlLmVudHJpZXNcbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbnN1bWVkKGJvZHkpIHtcbiAgICBpZiAoYm9keS5ib2R5VXNlZCkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBUeXBlRXJyb3IoJ0FscmVhZHkgcmVhZCcpKVxuICAgIH1cbiAgICBib2R5LmJvZHlVc2VkID0gdHJ1ZVxuICB9XG5cbiAgZnVuY3Rpb24gZmlsZVJlYWRlclJlYWR5KHJlYWRlcikge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHJlYWRlci5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVzb2x2ZShyZWFkZXIucmVzdWx0KVxuICAgICAgfVxuICAgICAgcmVhZGVyLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KHJlYWRlci5lcnJvcilcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgZnVuY3Rpb24gcmVhZEJsb2JBc0FycmF5QnVmZmVyKGJsb2IpIHtcbiAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKVxuICAgIHZhciBwcm9taXNlID0gZmlsZVJlYWRlclJlYWR5KHJlYWRlcilcbiAgICByZWFkZXIucmVhZEFzQXJyYXlCdWZmZXIoYmxvYilcbiAgICByZXR1cm4gcHJvbWlzZVxuICB9XG5cbiAgZnVuY3Rpb24gcmVhZEJsb2JBc1RleHQoYmxvYikge1xuICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpXG4gICAgdmFyIHByb21pc2UgPSBmaWxlUmVhZGVyUmVhZHkocmVhZGVyKVxuICAgIHJlYWRlci5yZWFkQXNUZXh0KGJsb2IpXG4gICAgcmV0dXJuIHByb21pc2VcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlYWRBcnJheUJ1ZmZlckFzVGV4dChidWYpIHtcbiAgICB2YXIgdmlldyA9IG5ldyBVaW50OEFycmF5KGJ1ZilcbiAgICB2YXIgY2hhcnMgPSBuZXcgQXJyYXkodmlldy5sZW5ndGgpXG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHZpZXcubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNoYXJzW2ldID0gU3RyaW5nLmZyb21DaGFyQ29kZSh2aWV3W2ldKVxuICAgIH1cbiAgICByZXR1cm4gY2hhcnMuam9pbignJylcbiAgfVxuXG4gIGZ1bmN0aW9uIGJ1ZmZlckNsb25lKGJ1Zikge1xuICAgIGlmIChidWYuc2xpY2UpIHtcbiAgICAgIHJldHVybiBidWYuc2xpY2UoMClcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIHZpZXcgPSBuZXcgVWludDhBcnJheShidWYuYnl0ZUxlbmd0aClcbiAgICAgIHZpZXcuc2V0KG5ldyBVaW50OEFycmF5KGJ1ZikpXG4gICAgICByZXR1cm4gdmlldy5idWZmZXJcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBCb2R5KCkge1xuICAgIHRoaXMuYm9keVVzZWQgPSBmYWxzZVxuXG4gICAgdGhpcy5faW5pdEJvZHkgPSBmdW5jdGlvbihib2R5KSB7XG4gICAgICB0aGlzLl9ib2R5SW5pdCA9IGJvZHlcbiAgICAgIGlmICghYm9keSkge1xuICAgICAgICB0aGlzLl9ib2R5VGV4dCA9ICcnXG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBib2R5ID09PSAnc3RyaW5nJykge1xuICAgICAgICB0aGlzLl9ib2R5VGV4dCA9IGJvZHlcbiAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5ibG9iICYmIEJsb2IucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgdGhpcy5fYm9keUJsb2IgPSBib2R5XG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuZm9ybURhdGEgJiYgRm9ybURhdGEucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgdGhpcy5fYm9keUZvcm1EYXRhID0gYm9keVxuICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LnNlYXJjaFBhcmFtcyAmJiBVUkxTZWFyY2hQYXJhbXMucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgdGhpcy5fYm9keVRleHQgPSBib2R5LnRvU3RyaW5nKClcbiAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5hcnJheUJ1ZmZlciAmJiBzdXBwb3J0LmJsb2IgJiYgaXNEYXRhVmlldyhib2R5KSkge1xuICAgICAgICB0aGlzLl9ib2R5QXJyYXlCdWZmZXIgPSBidWZmZXJDbG9uZShib2R5LmJ1ZmZlcilcbiAgICAgICAgLy8gSUUgMTAtMTEgY2FuJ3QgaGFuZGxlIGEgRGF0YVZpZXcgYm9keS5cbiAgICAgICAgdGhpcy5fYm9keUluaXQgPSBuZXcgQmxvYihbdGhpcy5fYm9keUFycmF5QnVmZmVyXSlcbiAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5hcnJheUJ1ZmZlciAmJiAoQXJyYXlCdWZmZXIucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkgfHwgaXNBcnJheUJ1ZmZlclZpZXcoYm9keSkpKSB7XG4gICAgICAgIHRoaXMuX2JvZHlBcnJheUJ1ZmZlciA9IGJ1ZmZlckNsb25lKGJvZHkpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3Vuc3VwcG9ydGVkIEJvZHlJbml0IHR5cGUnKVxuICAgICAgfVxuXG4gICAgICBpZiAoIXRoaXMuaGVhZGVycy5nZXQoJ2NvbnRlbnQtdHlwZScpKSB7XG4gICAgICAgIGlmICh0eXBlb2YgYm9keSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICB0aGlzLmhlYWRlcnMuc2V0KCdjb250ZW50LXR5cGUnLCAndGV4dC9wbGFpbjtjaGFyc2V0PVVURi04JylcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5QmxvYiAmJiB0aGlzLl9ib2R5QmxvYi50eXBlKSB7XG4gICAgICAgICAgdGhpcy5oZWFkZXJzLnNldCgnY29udGVudC10eXBlJywgdGhpcy5fYm9keUJsb2IudHlwZSlcbiAgICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LnNlYXJjaFBhcmFtcyAmJiBVUkxTZWFyY2hQYXJhbXMucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgICB0aGlzLmhlYWRlcnMuc2V0KCdjb250ZW50LXR5cGUnLCAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkO2NoYXJzZXQ9VVRGLTgnKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHN1cHBvcnQuYmxvYikge1xuICAgICAgdGhpcy5ibG9iID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciByZWplY3RlZCA9IGNvbnN1bWVkKHRoaXMpXG4gICAgICAgIGlmIChyZWplY3RlZCkge1xuICAgICAgICAgIHJldHVybiByZWplY3RlZFxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuX2JvZHlCbG9iKSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0aGlzLl9ib2R5QmxvYilcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5QXJyYXlCdWZmZXIpIHtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKG5ldyBCbG9iKFt0aGlzLl9ib2R5QXJyYXlCdWZmZXJdKSlcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5Rm9ybURhdGEpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NvdWxkIG5vdCByZWFkIEZvcm1EYXRhIGJvZHkgYXMgYmxvYicpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShuZXcgQmxvYihbdGhpcy5fYm9keVRleHRdKSlcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB0aGlzLmFycmF5QnVmZmVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh0aGlzLl9ib2R5QXJyYXlCdWZmZXIpIHtcbiAgICAgICAgICByZXR1cm4gY29uc3VtZWQodGhpcykgfHwgUHJvbWlzZS5yZXNvbHZlKHRoaXMuX2JvZHlBcnJheUJ1ZmZlcilcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5ibG9iKCkudGhlbihyZWFkQmxvYkFzQXJyYXlCdWZmZXIpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLnRleHQgPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciByZWplY3RlZCA9IGNvbnN1bWVkKHRoaXMpXG4gICAgICBpZiAocmVqZWN0ZWQpIHtcbiAgICAgICAgcmV0dXJuIHJlamVjdGVkXG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLl9ib2R5QmxvYikge1xuICAgICAgICByZXR1cm4gcmVhZEJsb2JBc1RleHQodGhpcy5fYm9keUJsb2IpXG4gICAgICB9IGVsc2UgaWYgKHRoaXMuX2JvZHlBcnJheUJ1ZmZlcikge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHJlYWRBcnJheUJ1ZmZlckFzVGV4dCh0aGlzLl9ib2R5QXJyYXlCdWZmZXIpKVxuICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5Rm9ybURhdGEpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjb3VsZCBub3QgcmVhZCBGb3JtRGF0YSBib2R5IGFzIHRleHQnKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0aGlzLl9ib2R5VGV4dClcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoc3VwcG9ydC5mb3JtRGF0YSkge1xuICAgICAgdGhpcy5mb3JtRGF0YSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy50ZXh0KCkudGhlbihkZWNvZGUpXG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5qc29uID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy50ZXh0KCkudGhlbihKU09OLnBhcnNlKVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICAvLyBIVFRQIG1ldGhvZHMgd2hvc2UgY2FwaXRhbGl6YXRpb24gc2hvdWxkIGJlIG5vcm1hbGl6ZWRcbiAgdmFyIG1ldGhvZHMgPSBbJ0RFTEVURScsICdHRVQnLCAnSEVBRCcsICdPUFRJT05TJywgJ1BPU1QnLCAnUFVUJ11cblxuICBmdW5jdGlvbiBub3JtYWxpemVNZXRob2QobWV0aG9kKSB7XG4gICAgdmFyIHVwY2FzZWQgPSBtZXRob2QudG9VcHBlckNhc2UoKVxuICAgIHJldHVybiAobWV0aG9kcy5pbmRleE9mKHVwY2FzZWQpID4gLTEpID8gdXBjYXNlZCA6IG1ldGhvZFxuICB9XG5cbiAgZnVuY3Rpb24gUmVxdWVzdChpbnB1dCwgb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XG4gICAgdmFyIGJvZHkgPSBvcHRpb25zLmJvZHlcblxuICAgIGlmIChpbnB1dCBpbnN0YW5jZW9mIFJlcXVlc3QpIHtcbiAgICAgIGlmIChpbnB1dC5ib2R5VXNlZCkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBbHJlYWR5IHJlYWQnKVxuICAgICAgfVxuICAgICAgdGhpcy51cmwgPSBpbnB1dC51cmxcbiAgICAgIHRoaXMuY3JlZGVudGlhbHMgPSBpbnB1dC5jcmVkZW50aWFsc1xuICAgICAgaWYgKCFvcHRpb25zLmhlYWRlcnMpIHtcbiAgICAgICAgdGhpcy5oZWFkZXJzID0gbmV3IEhlYWRlcnMoaW5wdXQuaGVhZGVycylcbiAgICAgIH1cbiAgICAgIHRoaXMubWV0aG9kID0gaW5wdXQubWV0aG9kXG4gICAgICB0aGlzLm1vZGUgPSBpbnB1dC5tb2RlXG4gICAgICBpZiAoIWJvZHkgJiYgaW5wdXQuX2JvZHlJbml0ICE9IG51bGwpIHtcbiAgICAgICAgYm9keSA9IGlucHV0Ll9ib2R5SW5pdFxuICAgICAgICBpbnB1dC5ib2R5VXNlZCA9IHRydWVcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy51cmwgPSBTdHJpbmcoaW5wdXQpXG4gICAgfVxuXG4gICAgdGhpcy5jcmVkZW50aWFscyA9IG9wdGlvbnMuY3JlZGVudGlhbHMgfHwgdGhpcy5jcmVkZW50aWFscyB8fCAnb21pdCdcbiAgICBpZiAob3B0aW9ucy5oZWFkZXJzIHx8ICF0aGlzLmhlYWRlcnMpIHtcbiAgICAgIHRoaXMuaGVhZGVycyA9IG5ldyBIZWFkZXJzKG9wdGlvbnMuaGVhZGVycylcbiAgICB9XG4gICAgdGhpcy5tZXRob2QgPSBub3JtYWxpemVNZXRob2Qob3B0aW9ucy5tZXRob2QgfHwgdGhpcy5tZXRob2QgfHwgJ0dFVCcpXG4gICAgdGhpcy5tb2RlID0gb3B0aW9ucy5tb2RlIHx8IHRoaXMubW9kZSB8fCBudWxsXG4gICAgdGhpcy5yZWZlcnJlciA9IG51bGxcblxuICAgIGlmICgodGhpcy5tZXRob2QgPT09ICdHRVQnIHx8IHRoaXMubWV0aG9kID09PSAnSEVBRCcpICYmIGJvZHkpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0JvZHkgbm90IGFsbG93ZWQgZm9yIEdFVCBvciBIRUFEIHJlcXVlc3RzJylcbiAgICB9XG4gICAgdGhpcy5faW5pdEJvZHkoYm9keSlcbiAgfVxuXG4gIFJlcXVlc3QucHJvdG90eXBlLmNsb25lID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBSZXF1ZXN0KHRoaXMsIHsgYm9keTogdGhpcy5fYm9keUluaXQgfSlcbiAgfVxuXG4gIGZ1bmN0aW9uIGRlY29kZShib2R5KSB7XG4gICAgdmFyIGZvcm0gPSBuZXcgRm9ybURhdGEoKVxuICAgIGJvZHkudHJpbSgpLnNwbGl0KCcmJykuZm9yRWFjaChmdW5jdGlvbihieXRlcykge1xuICAgICAgaWYgKGJ5dGVzKSB7XG4gICAgICAgIHZhciBzcGxpdCA9IGJ5dGVzLnNwbGl0KCc9JylcbiAgICAgICAgdmFyIG5hbWUgPSBzcGxpdC5zaGlmdCgpLnJlcGxhY2UoL1xcKy9nLCAnICcpXG4gICAgICAgIHZhciB2YWx1ZSA9IHNwbGl0LmpvaW4oJz0nKS5yZXBsYWNlKC9cXCsvZywgJyAnKVxuICAgICAgICBmb3JtLmFwcGVuZChkZWNvZGVVUklDb21wb25lbnQobmFtZSksIGRlY29kZVVSSUNvbXBvbmVudCh2YWx1ZSkpXG4gICAgICB9XG4gICAgfSlcbiAgICByZXR1cm4gZm9ybVxuICB9XG5cbiAgZnVuY3Rpb24gcGFyc2VIZWFkZXJzKHJhd0hlYWRlcnMpIHtcbiAgICB2YXIgaGVhZGVycyA9IG5ldyBIZWFkZXJzKClcbiAgICAvLyBSZXBsYWNlIGluc3RhbmNlcyBvZiBcXHJcXG4gYW5kIFxcbiBmb2xsb3dlZCBieSBhdCBsZWFzdCBvbmUgc3BhY2Ugb3IgaG9yaXpvbnRhbCB0YWIgd2l0aCBhIHNwYWNlXG4gICAgLy8gaHR0cHM6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzcyMzAjc2VjdGlvbi0zLjJcbiAgICB2YXIgcHJlUHJvY2Vzc2VkSGVhZGVycyA9IHJhd0hlYWRlcnMucmVwbGFjZSgvXFxyP1xcbltcXHQgXSsvZywgJyAnKVxuICAgIHByZVByb2Nlc3NlZEhlYWRlcnMuc3BsaXQoL1xccj9cXG4vKS5mb3JFYWNoKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgIHZhciBwYXJ0cyA9IGxpbmUuc3BsaXQoJzonKVxuICAgICAgdmFyIGtleSA9IHBhcnRzLnNoaWZ0KCkudHJpbSgpXG4gICAgICBpZiAoa2V5KSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IHBhcnRzLmpvaW4oJzonKS50cmltKClcbiAgICAgICAgaGVhZGVycy5hcHBlbmQoa2V5LCB2YWx1ZSlcbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiBoZWFkZXJzXG4gIH1cblxuICBCb2R5LmNhbGwoUmVxdWVzdC5wcm90b3R5cGUpXG5cbiAgZnVuY3Rpb24gUmVzcG9uc2UoYm9keUluaXQsIG9wdGlvbnMpIHtcbiAgICBpZiAoIW9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSB7fVxuICAgIH1cblxuICAgIHRoaXMudHlwZSA9ICdkZWZhdWx0J1xuICAgIHRoaXMuc3RhdHVzID0gb3B0aW9ucy5zdGF0dXMgPT09IHVuZGVmaW5lZCA/IDIwMCA6IG9wdGlvbnMuc3RhdHVzXG4gICAgdGhpcy5vayA9IHRoaXMuc3RhdHVzID49IDIwMCAmJiB0aGlzLnN0YXR1cyA8IDMwMFxuICAgIHRoaXMuc3RhdHVzVGV4dCA9ICdzdGF0dXNUZXh0JyBpbiBvcHRpb25zID8gb3B0aW9ucy5zdGF0dXNUZXh0IDogJ09LJ1xuICAgIHRoaXMuaGVhZGVycyA9IG5ldyBIZWFkZXJzKG9wdGlvbnMuaGVhZGVycylcbiAgICB0aGlzLnVybCA9IG9wdGlvbnMudXJsIHx8ICcnXG4gICAgdGhpcy5faW5pdEJvZHkoYm9keUluaXQpXG4gIH1cblxuICBCb2R5LmNhbGwoUmVzcG9uc2UucHJvdG90eXBlKVxuXG4gIFJlc3BvbnNlLnByb3RvdHlwZS5jbG9uZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgUmVzcG9uc2UodGhpcy5fYm9keUluaXQsIHtcbiAgICAgIHN0YXR1czogdGhpcy5zdGF0dXMsXG4gICAgICBzdGF0dXNUZXh0OiB0aGlzLnN0YXR1c1RleHQsXG4gICAgICBoZWFkZXJzOiBuZXcgSGVhZGVycyh0aGlzLmhlYWRlcnMpLFxuICAgICAgdXJsOiB0aGlzLnVybFxuICAgIH0pXG4gIH1cblxuICBSZXNwb25zZS5lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciByZXNwb25zZSA9IG5ldyBSZXNwb25zZShudWxsLCB7c3RhdHVzOiAwLCBzdGF0dXNUZXh0OiAnJ30pXG4gICAgcmVzcG9uc2UudHlwZSA9ICdlcnJvcidcbiAgICByZXR1cm4gcmVzcG9uc2VcbiAgfVxuXG4gIHZhciByZWRpcmVjdFN0YXR1c2VzID0gWzMwMSwgMzAyLCAzMDMsIDMwNywgMzA4XVxuXG4gIFJlc3BvbnNlLnJlZGlyZWN0ID0gZnVuY3Rpb24odXJsLCBzdGF0dXMpIHtcbiAgICBpZiAocmVkaXJlY3RTdGF0dXNlcy5pbmRleE9mKHN0YXR1cykgPT09IC0xKSB7XG4gICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignSW52YWxpZCBzdGF0dXMgY29kZScpXG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShudWxsLCB7c3RhdHVzOiBzdGF0dXMsIGhlYWRlcnM6IHtsb2NhdGlvbjogdXJsfX0pXG4gIH1cblxuICBzZWxmLkhlYWRlcnMgPSBIZWFkZXJzXG4gIHNlbGYuUmVxdWVzdCA9IFJlcXVlc3RcbiAgc2VsZi5SZXNwb25zZSA9IFJlc3BvbnNlXG5cbiAgc2VsZi5mZXRjaCA9IGZ1bmN0aW9uKGlucHV0LCBpbml0KSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgdmFyIHJlcXVlc3QgPSBuZXcgUmVxdWVzdChpbnB1dCwgaW5pdClcbiAgICAgIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKVxuXG4gICAgICB4aHIub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBvcHRpb25zID0ge1xuICAgICAgICAgIHN0YXR1czogeGhyLnN0YXR1cyxcbiAgICAgICAgICBzdGF0dXNUZXh0OiB4aHIuc3RhdHVzVGV4dCxcbiAgICAgICAgICBoZWFkZXJzOiBwYXJzZUhlYWRlcnMoeGhyLmdldEFsbFJlc3BvbnNlSGVhZGVycygpIHx8ICcnKVxuICAgICAgICB9XG4gICAgICAgIG9wdGlvbnMudXJsID0gJ3Jlc3BvbnNlVVJMJyBpbiB4aHIgPyB4aHIucmVzcG9uc2VVUkwgOiBvcHRpb25zLmhlYWRlcnMuZ2V0KCdYLVJlcXVlc3QtVVJMJylcbiAgICAgICAgdmFyIGJvZHkgPSAncmVzcG9uc2UnIGluIHhociA/IHhoci5yZXNwb25zZSA6IHhoci5yZXNwb25zZVRleHRcbiAgICAgICAgcmVzb2x2ZShuZXcgUmVzcG9uc2UoYm9keSwgb3B0aW9ucykpXG4gICAgICB9XG5cbiAgICAgIHhoci5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlamVjdChuZXcgVHlwZUVycm9yKCdOZXR3b3JrIHJlcXVlc3QgZmFpbGVkJykpXG4gICAgICB9XG5cbiAgICAgIHhoci5vbnRpbWVvdXQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KG5ldyBUeXBlRXJyb3IoJ05ldHdvcmsgcmVxdWVzdCBmYWlsZWQnKSlcbiAgICAgIH1cblxuICAgICAgeGhyLm9wZW4ocmVxdWVzdC5tZXRob2QsIHJlcXVlc3QudXJsLCB0cnVlKVxuXG4gICAgICBpZiAocmVxdWVzdC5jcmVkZW50aWFscyA9PT0gJ2luY2x1ZGUnKSB7XG4gICAgICAgIHhoci53aXRoQ3JlZGVudGlhbHMgPSB0cnVlXG4gICAgICB9IGVsc2UgaWYgKHJlcXVlc3QuY3JlZGVudGlhbHMgPT09ICdvbWl0Jykge1xuICAgICAgICB4aHIud2l0aENyZWRlbnRpYWxzID0gZmFsc2VcbiAgICAgIH1cblxuICAgICAgaWYgKCdyZXNwb25zZVR5cGUnIGluIHhociAmJiBzdXBwb3J0LmJsb2IpIHtcbiAgICAgICAgeGhyLnJlc3BvbnNlVHlwZSA9ICdibG9iJ1xuICAgICAgfVxuXG4gICAgICByZXF1ZXN0LmhlYWRlcnMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSwgbmFtZSkge1xuICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcihuYW1lLCB2YWx1ZSlcbiAgICAgIH0pXG5cbiAgICAgIHhoci5zZW5kKHR5cGVvZiByZXF1ZXN0Ll9ib2R5SW5pdCA9PT0gJ3VuZGVmaW5lZCcgPyBudWxsIDogcmVxdWVzdC5fYm9keUluaXQpXG4gICAgfSlcbiAgfVxuICBzZWxmLmZldGNoLnBvbHlmaWxsID0gdHJ1ZVxufSkodHlwZW9mIHNlbGYgIT09ICd1bmRlZmluZWQnID8gc2VsZiA6IHRoaXMpO1xuIiwiY29uc3QgYXJ0aWNsZVRlbXBsYXRlID0gYFxuXHQ8YXJ0aWNsZSBjbGFzcz1cImFydGljbGVfX291dGVyXCI+XG5cdFx0PGRpdiBjbGFzcz1cImFydGljbGVfX2lubmVyXCI+XG5cdFx0XHQ8ZGl2IGNsYXNzPVwiYXJ0aWNsZV9faGVhZGluZ1wiPlxuXHRcdFx0XHQ8YSBjbGFzcz1cImpzLWVudHJ5LXRpdGxlXCI+PC9hPlxuXHRcdFx0XHQ8aDIgY2xhc3M9XCJhcnRpY2xlLWhlYWRpbmdfX3RpdGxlXCI+PC9oMj5cblx0XHRcdFx0PGRpdiBjbGFzcz1cImFydGljbGUtaGVhZGluZ19fbmFtZVwiPlxuXHRcdFx0XHRcdDxzcGFuIGNsYXNzPVwiYXJ0aWNsZS1oZWFkaW5nX19uYW1lLS1maXJzdFwiPjwvc3Bhbj5cblx0XHRcdFx0XHQ8YSBjbGFzcz1cImpzLWVudHJ5LWFydGlzdFwiPjwvYT5cblx0XHRcdFx0XHQ8c3BhbiBjbGFzcz1cImFydGljbGUtaGVhZGluZ19fbmFtZS0tbGFzdFwiPjwvc3Bhbj5cblx0XHRcdFx0PC9kaXY+XG5cdFx0XHQ8L2Rpdj5cdFxuXHRcdFx0PGRpdiBjbGFzcz1cImFydGljbGVfX2ltYWdlcy1vdXRlclwiPlxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVwiYXJ0aWNsZV9faW1hZ2VzLWlubmVyXCI+PC9kaXY+XG5cdFx0XHRcdDxwIGNsYXNzPVwianMtYXJ0aWNsZS1hbmNob3ItdGFyZ2V0XCI+PC9wPlxuXHRcdDwvZGl2PlxuXHQ8L2FydGljbGU+XG5gO1xuXG5leHBvcnQgZGVmYXVsdCBhcnRpY2xlVGVtcGxhdGU7IiwiaW1wb3J0ICd3aGF0d2ctZmV0Y2gnO1xuaW1wb3J0IG5hdkxnIGZyb20gJy4vbmF2LWxnJztcbmltcG9ydCBhcnRpY2xlVGVtcGxhdGUgZnJvbSAnLi9hcnRpY2xlLXRlbXBsYXRlJztcblxuY29uc3QgREIgPSAnaHR0cHM6Ly9uZXh1cy1jYXRhbG9nLmZpcmViYXNlaW8uY29tL3Bvc3RzLmpzb24/YXV0aD03ZzdweUtLeWtOM041ZXdySW1oT2FTNnZ3ckZzYzVmS2tyazhlanpmJztcbmNvbnN0IGFscGhhYmV0ID0gWydhJywgJ2InLCAnYycsICdkJywgJ2UnLCAnZicsICdnJywgJ2gnLCAnaScsICdqJywgJ2snLCAnbCcsICdtJywgJ24nLCAnbycsICdwJywgJ3InLCAncycsICd0JywgJ3UnLCAndicsICd3JywgJ3knLCAneiddO1xuXG5jb25zdCAkbG9hZGluZyA9IEFycmF5LmZyb20oZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLmxvYWRpbmcnKSk7XG5jb25zdCAkbmF2ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2pzLW5hdicpO1xuY29uc3QgJHBhcmFsbGF4ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnBhcmFsbGF4Jyk7XG5jb25zdCAkY29udGVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5jb250ZW50Jyk7XG5jb25zdCAkdGl0bGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnanMtdGl0bGUnKTtcbmNvbnN0ICRhcnJvdyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5hcnJvdycpO1xuY29uc3QgJG1vZGFsID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLm1vZGFsJyk7XG5jb25zdCAkbGlnaHRib3ggPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcubGlnaHRib3gnKTtcbmNvbnN0ICR2aWV3ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmxpZ2h0Ym94LXZpZXcnKTtcblxubGV0IHNvcnRLZXkgPSAwOyAvLyAwID0gYXJ0aXN0LCAxID0gdGl0bGVcbmxldCBlbnRyaWVzID0geyBieUF1dGhvcjogW10sIGJ5VGl0bGU6IFtdIH07XG5sZXQgY3VycmVudExldHRlciA9ICdBJztcblxubGV0IGxpZ2h0Ym94ID0gZmFsc2U7XG5jb25zdCBhdHRhY2hJbWFnZUxpc3RlbmVycyA9ICgpID0+IHtcblx0Y29uc3QgJGltYWdlcyA9IEFycmF5LmZyb20oZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLmFydGljbGUtaW1hZ2UnKSk7XG5cblx0JGltYWdlcy5mb3JFYWNoKGltZyA9PiB7XG5cdFx0aW1nLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuXHRcdFx0bGV0IHNyYyA9IGltZy5zcmM7XG5cdFx0XHQkbGlnaHRib3guY2xhc3NMaXN0LmFkZCgnc2hvdy1pbWcnKTtcblx0XHRcdCR2aWV3LnNldEF0dHJpYnV0ZSgnc3R5bGUnLCBgYmFja2dyb3VuZC1pbWFnZTogdXJsKCR7c3JjfSlgKTtcblx0XHRcdGxpZ2h0Ym94ID0gdHJ1ZTtcblx0XHR9KVxuXHR9KTtcblxuXHQkdmlldy5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHRpZiAobGlnaHRib3gpIHtcblx0XHRcdCRsaWdodGJveC5jbGFzc0xpc3QucmVtb3ZlKCdzaG93LWltZycpO1xuXHRcdFx0bGlnaHRib3ggPSBmYWxzZTtcblx0XHR9XG5cdH0pO1xufVxuXG5sZXQgbW9kYWwgPSBmYWxzZTtcbmNvbnN0IGF0dGFjaE1vZGFsTGlzdGVuZXJzID0gKCkgPT4ge1xuXHRjb25zdCAkZmluZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdqcy1maW5kJyk7XG5cdFxuXHQkZmluZC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHQkbW9kYWwuY2xhc3NMaXN0LmFkZCgnc2hvdycpO1xuXHRcdG1vZGFsID0gdHJ1ZTtcblx0fSk7XG5cblx0JG1vZGFsLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuXHRcdHNldFRpbWVvdXQoKCkgPT4ge1xuXHRcdFx0JG1vZGFsLmNsYXNzTGlzdC5yZW1vdmUoJ3Nob3cnKTtcblx0XHRcdG1vZGFsID0gZmFsc2U7XG5cdFx0fSwgNTAwKTtcblx0fSk7XG5cblx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCAoKSA9PiB7XG5cdFx0aWYgKG1vZGFsKSB7XG5cdFx0XHRzZXRUaW1lb3V0KCgpID0+IHtcblx0XHRcdFx0JG1vZGFsLmNsYXNzTGlzdC5yZW1vdmUoJ3Nob3cnKTtcblx0XHRcdFx0bW9kYWwgPSBmYWxzZTtcblx0XHRcdH0sIDYwMCk7XG5cdFx0fTtcblx0fSk7XG59XG5cbmNvbnN0IHNjcm9sbFRvVG9wID0gKCkgPT4ge1xuXHRsZXQgdGhpbmcgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYW5jaG9yLXRhcmdldCcpO1xuXHR0aGluZy5zY3JvbGxJbnRvVmlldyh7YmVoYXZpb3I6IFwic21vb3RoXCIsIGJsb2NrOiBcInN0YXJ0XCJ9KTtcbn1cblxubGV0IHByZXY7XG5sZXQgY3VycmVudCA9IDA7XG5sZXQgaXNTaG93aW5nID0gZmFsc2U7XG5jb25zdCBhdHRhY2hBcnJvd0xpc3RlbmVycyA9ICgpID0+IHtcblx0JGFycm93LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuXHRcdHNjcm9sbFRvVG9wKCk7XG5cdH0pO1xuXG5cdCRwYXJhbGxheC5hZGRFdmVudExpc3RlbmVyKCdzY3JvbGwnLCAoKSA9PiB7XG5cblx0XHRsZXQgeSA9ICR0aXRsZS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS55O1xuXHRcdGlmIChjdXJyZW50ICE9PSB5KSB7XG5cdFx0XHRwcmV2ID0gY3VycmVudDtcblx0XHRcdGN1cnJlbnQgPSB5O1xuXHRcdH1cblxuXHRcdGlmICh5IDw9IC01MCAmJiAhaXNTaG93aW5nKSB7XG5cdFx0XHQkYXJyb3cuY2xhc3NMaXN0LmFkZCgnc2hvdycpO1xuXHRcdFx0aXNTaG93aW5nID0gdHJ1ZTtcblx0XHR9IGVsc2UgaWYgKHkgPiAtNTAgJiYgaXNTaG93aW5nKSB7XG5cdFx0XHQkYXJyb3cuY2xhc3NMaXN0LnJlbW92ZSgnc2hvdycpO1xuXHRcdFx0aXNTaG93aW5nID0gZmFsc2U7XG5cdFx0fVxuXHR9KTtcbn07XG5cbmNvbnN0IGFkZFNvcnRCdXR0b25MaXN0ZW5lcnMgPSAoKSA9PiB7XG5cdGxldCAkYnlBcnRpc3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnanMtYnktYXJ0aXN0Jyk7XG5cdGxldCAkYnlUaXRsZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdqcy1ieS10aXRsZScpO1xuXHQkYnlBcnRpc3QuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0aWYgKHNvcnRLZXkpIHtcblx0XHRcdHNjcm9sbFRvVG9wKCk7XG5cdFx0XHRzb3J0S2V5ID0gMDtcblx0XHRcdCRieUFydGlzdC5jbGFzc0xpc3QuYWRkKCdhY3RpdmUnKTtcblx0XHRcdCRieVRpdGxlLmNsYXNzTGlzdC5yZW1vdmUoJ2FjdGl2ZScpO1xuXG5cdFx0XHRyZW5kZXJFbnRyaWVzKCk7XG5cdFx0fVxuXHR9KTtcblxuXHQkYnlUaXRsZS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHRpZiAoIXNvcnRLZXkpIHtcblx0XHRcdHNjcm9sbFRvVG9wKCk7XG5cdFx0XHRzb3J0S2V5ID0gMTtcblx0XHRcdCRieVRpdGxlLmNsYXNzTGlzdC5hZGQoJ2FjdGl2ZScpO1xuXHRcdFx0JGJ5QXJ0aXN0LmNsYXNzTGlzdC5yZW1vdmUoJ2FjdGl2ZScpO1xuXG5cdFx0XHRyZW5kZXJFbnRyaWVzKCk7XG5cdFx0fVxuXHR9KTtcbn07XG5cbmNvbnN0IGNsZWFyQW5jaG9ycyA9IChwcmV2U2VsZWN0b3IpID0+IHtcblx0bGV0ICRlbnRyaWVzID0gQXJyYXkuZnJvbShkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKHByZXZTZWxlY3RvcikpO1xuXHQkZW50cmllcy5mb3JFYWNoKGVudHJ5ID0+IGVudHJ5LnJlbW92ZUF0dHJpYnV0ZSgnbmFtZScpKTtcbn07XG5cbmNvbnN0IGZpbmRGaXJzdEVudHJ5ID0gKGNoYXIpID0+IHtcblx0bGV0IHNlbGVjdG9yID0gc29ydEtleSA/ICcuanMtZW50cnktdGl0bGUnIDogJy5qcy1lbnRyeS1hcnRpc3QnO1xuXHRsZXQgcHJldlNlbGVjdG9yID0gIXNvcnRLZXkgPyAnLmpzLWVudHJ5LXRpdGxlJyA6ICcuanMtZW50cnktYXJ0aXN0Jztcblx0bGV0ICRlbnRyaWVzID0gQXJyYXkuZnJvbShkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKSk7XG5cblx0Y2xlYXJBbmNob3JzKHByZXZTZWxlY3Rvcik7XG5cblx0cmV0dXJuICRlbnRyaWVzLmZpbmQoZW50cnkgPT4ge1xuXHRcdGxldCBub2RlID0gZW50cnkubmV4dEVsZW1lbnRTaWJsaW5nO1xuXHRcdHJldHVybiBub2RlLmlubmVySFRNTFswXSA9PT0gY2hhciB8fCBub2RlLmlubmVySFRNTFswXSA9PT0gY2hhci50b1VwcGVyQ2FzZSgpO1xuXHR9KTtcbn07XG5cbmNvbnN0IGF0dGFjaEFuY2hvckxpc3RlbmVyID0gKCRhbmNob3IsIGxldHRlcikgPT4ge1xuXG5cdCRhbmNob3IuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0Y29uc3QgbGV0dGVyTm9kZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGxldHRlcik7XG5cdFx0bGV0IHRhcmdldDtcblxuXHRcdGlmICghc29ydEtleSkge1xuXHRcdFx0dGFyZ2V0ID0gbGV0dGVyID09PSAnYScgPyBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYW5jaG9yLXRhcmdldCcpIDogbGV0dGVyTm9kZS5wYXJlbnRFbGVtZW50LnBhcmVudEVsZW1lbnQucGFyZW50RWxlbWVudC5wYXJlbnRFbGVtZW50LnByZXZpb3VzRWxlbWVudFNpYmxpbmcucXVlcnlTZWxlY3RvcignLmpzLWFydGljbGUtYW5jaG9yLXRhcmdldCcpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0YXJnZXQgPSBsZXR0ZXIgPT09ICdhJyA/IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhbmNob3ItdGFyZ2V0JykgOiBsZXR0ZXJOb2RlLnBhcmVudEVsZW1lbnQucGFyZW50RWxlbWVudC5wYXJlbnRFbGVtZW50LnByZXZpb3VzRWxlbWVudFNpYmxpbmcucXVlcnlTZWxlY3RvcignLmpzLWFydGljbGUtYW5jaG9yLXRhcmdldCcpO1xuXHRcdH07XG5cblx0XHR0YXJnZXQuc2Nyb2xsSW50b1ZpZXcoe2JlaGF2aW9yOiBcInNtb290aFwiLCBibG9jazogXCJzdGFydFwifSk7XG5cdH0pO1xufTtcblxuY29uc3QgbWFrZUFscGhhYmV0ID0gKCkgPT4ge1xuXHRsZXQgYWN0aXZlRW50cmllcyA9IHt9O1xuXHRsZXQgJG91dGVyID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmFscGhhYmV0X19sZXR0ZXJzJyk7XG5cdCRvdXRlci5pbm5lckhUTUwgPSAnJztcblxuXHRhbHBoYWJldC5mb3JFYWNoKGxldHRlciA9PiB7XG5cdFx0bGV0ICRmaXJzdEVudHJ5ID0gZmluZEZpcnN0RW50cnkobGV0dGVyKTtcblx0XHRsZXQgJGFuY2hvciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcblxuXHRcdGlmICghJGZpcnN0RW50cnkpIHJldHVybjtcblxuXHRcdCRmaXJzdEVudHJ5LmlkID0gbGV0dGVyO1xuXHRcdCRhbmNob3IuaW5uZXJIVE1MID0gbGV0dGVyLnRvVXBwZXJDYXNlKCk7XG5cdFx0JGFuY2hvci5jbGFzc05hbWUgPSAnYWxwaGFiZXRfX2xldHRlci1hbmNob3InO1xuXG5cdFx0YXR0YWNoQW5jaG9yTGlzdGVuZXIoJGFuY2hvciwgbGV0dGVyKTtcblx0XHQkb3V0ZXIuYXBwZW5kKCRhbmNob3IpO1xuXHR9KTtcbn07XG5cbmNvbnN0IHJlbmRlckltYWdlcyA9IChpbWFnZXMsICRpbWFnZXMpID0+IHtcblx0aW1hZ2VzLmZvckVhY2goaW1hZ2UgPT4ge1xuXHRcdGNvbnN0IHNyYyA9IGAuLi8uLi9hc3NldHMvaW1hZ2VzLyR7aW1hZ2V9YDtcblx0XHRsZXQgJGltZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ0lNRycpO1xuXHRcdCRpbWcuY2xhc3NOYW1lID0gJ2FydGljbGUtaW1hZ2UnO1xuXHRcdCRpbWcuc3JjID0gc3JjO1xuXHRcdCRpbWFnZXMuYXBwZW5kKCRpbWcpO1xuXHR9KVxufTtcblxuY29uc3QgcmVuZGVyRW50cmllcyA9ICgpID0+IHtcblx0bGV0ICRhcnRpY2xlTGlzdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdqcy1saXN0Jyk7XG5cdGxldCBlbnRyaWVzTGlzdCA9IHNvcnRLZXkgPyBlbnRyaWVzLmJ5VGl0bGUgOiBlbnRyaWVzLmJ5QXV0aG9yO1xuXG5cdCRhcnRpY2xlTGlzdC5pbm5lckhUTUwgPSAnJztcblxuXHRlbnRyaWVzTGlzdC5mb3JFYWNoKGVudHJ5ID0+IHtcblx0XHRsZXQgeyB0aXRsZSwgbGFzdE5hbWUsIGZpcnN0TmFtZSwgaW1hZ2VzLCBkZXNjcmlwdGlvbiwgZGV0YWlsIH0gPSBlbnRyeTtcblxuXHRcdCRhcnRpY2xlTGlzdC5pbnNlcnRBZGphY2VudEhUTUwoJ2JlZm9yZWVuZCcsIGFydGljbGVUZW1wbGF0ZSk7XG5cblx0XHRsZXQgJGltYWdlc05vZGVzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLmFydGljbGVfX2ltYWdlcy1pbm5lcicpO1xuXHRcdGxldCAkaW1hZ2VzID0gJGltYWdlc05vZGVzWyRpbWFnZXNOb2Rlcy5sZW5ndGggLSAxXTtcblxuXHRcdGlmIChpbWFnZXMubGVuZ3RoKSByZW5kZXJJbWFnZXMoaW1hZ2VzLCAkaW1hZ2VzKTtcblx0XHRcblx0XHRsZXQgJGRlc2NyaXB0aW9uT3V0ZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0XHRsZXQgJGRlc2NyaXB0aW9uTm9kZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKTtcblx0XHRsZXQgJGRldGFpbE5vZGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdwJyk7XG5cdFx0JGRlc2NyaXB0aW9uT3V0ZXIuY2xhc3NMaXN0LmFkZCgnYXJ0aWNsZS1kZXNjcmlwdGlvbl9fb3V0ZXInKTtcblx0XHQkZGVzY3JpcHRpb25Ob2RlLmNsYXNzTGlzdC5hZGQoJ2FydGljbGUtZGVzY3JpcHRpb24nKTtcblx0XHQkZGV0YWlsTm9kZS5jbGFzc0xpc3QuYWRkKCdhcnRpY2xlLWRldGFpbCcpO1xuXG5cdFx0JGRlc2NyaXB0aW9uTm9kZS5pbm5lckhUTUwgPSBkZXNjcmlwdGlvbjtcblx0XHQkZGV0YWlsTm9kZS5pbm5lckhUTUwgPSBkZXRhaWw7XG5cblx0XHQkZGVzY3JpcHRpb25PdXRlci5hcHBlbmQoJGRlc2NyaXB0aW9uTm9kZSwgJGRldGFpbE5vZGUpO1xuXHRcdCRpbWFnZXMuYXBwZW5kKCRkZXNjcmlwdGlvbk91dGVyKTtcblxuXHRcdGxldCAkdGl0bGVOb2RlcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5hcnRpY2xlLWhlYWRpbmdfX3RpdGxlJyk7XG5cdFx0bGV0ICR0aXRsZSA9ICR0aXRsZU5vZGVzWyR0aXRsZU5vZGVzLmxlbmd0aCAtIDFdO1xuXG5cdFx0bGV0ICRmaXJzdE5vZGVzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLmFydGljbGUtaGVhZGluZ19fbmFtZS0tZmlyc3QnKTtcblx0XHRsZXQgJGZpcnN0ID0gJGZpcnN0Tm9kZXNbJGZpcnN0Tm9kZXMubGVuZ3RoIC0gMV07XG5cblx0XHRsZXQgJGxhc3ROb2RlcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5hcnRpY2xlLWhlYWRpbmdfX25hbWUtLWxhc3QnKTtcblx0XHRsZXQgJGxhc3QgPSAkbGFzdE5vZGVzWyRsYXN0Tm9kZXMubGVuZ3RoIC0gMV07XG5cblx0XHQkdGl0bGUuaW5uZXJIVE1MID0gdGl0bGU7XG5cdFx0JGZpcnN0LmlubmVySFRNTCA9IGZpcnN0TmFtZTtcblx0XHQkbGFzdC5pbm5lckhUTUwgPSBsYXN0TmFtZTtcblxuXHR9KTtcblxuXHRtYWtlQWxwaGFiZXQoKTtcbn07XG5cbmNvbnN0IHNvcnRCeVRpdGxlID0gKCkgPT4ge1xuXHRlbnRyaWVzLmJ5VGl0bGUuc29ydCgoYSwgYikgPT4ge1xuXHRcdGxldCBhVGl0bGUgPSBhLnRpdGxlWzBdLnRvVXBwZXJDYXNlKCk7XG5cdFx0bGV0IGJUaXRsZSA9IGIudGl0bGVbMF0udG9VcHBlckNhc2UoKTtcblx0XHRpZiAoYVRpdGxlID4gYlRpdGxlKSByZXR1cm4gMTtcblx0XHRlbHNlIGlmIChhVGl0bGUgPCBiVGl0bGUpIHJldHVybiAtMTtcblx0XHRlbHNlIHJldHVybiAwO1xuXHR9KTtcbn07XG5cbmNvbnN0IHNldERhdGEgPSAoZGF0YSkgPT4ge1xuXHRlbnRyaWVzLmJ5QXV0aG9yID0gZGF0YTtcblx0ZW50cmllcy5ieVRpdGxlID0gZGF0YS5zbGljZSgpO1xuXHRzb3J0QnlUaXRsZSgpO1xuXHRyZW5kZXJFbnRyaWVzKCk7XG59XG5cbmNvbnN0IGZldGNoRGF0YSA9ICgpID0+IHtcblxuXHRcdGZldGNoKERCKS50aGVuKHJlcyA9PlxuXHRcdFx0cmVzLmpzb24oKVxuXHRcdCkudGhlbihkYXRhID0+IHtcblx0XHRcdHNldERhdGEoZGF0YSk7XG5cdFx0fSlcblx0XHQudGhlbigoKSA9PiB7XG5cdFx0XHRhdHRhY2hJbWFnZUxpc3RlbmVycygpO1xuXHRcdFx0JGxvYWRpbmcuZm9yRWFjaChlbGVtID0+IGVsZW0uY2xhc3NMaXN0LmFkZCgncmVhZHknKSk7XG5cdFx0XHQkbmF2LmNsYXNzTGlzdC5hZGQoJ3JlYWR5Jyk7XG5cdFx0fSlcblx0XHQuY2F0Y2goZXJyID0+IGNvbnNvbGUud2FybihlcnIpKTtcbn07XG5cbmNvbnN0IGluaXQgPSAoKSA9PiB7XG5cdGZldGNoRGF0YSgpO1xuXHRuYXZMZygpO1xuXHRyZW5kZXJFbnRyaWVzKCk7XG5cdGFkZFNvcnRCdXR0b25MaXN0ZW5lcnMoKTtcblx0YXR0YWNoQXJyb3dMaXN0ZW5lcnMoKTtcblx0YXR0YWNoTW9kYWxMaXN0ZW5lcnMoKTtcbn1cblxuaW5pdCgpO1xuIiwiY29uc3QgdGVtcGxhdGUgPSBcblx0YDxkaXYgY2xhc3M9XCJuYXZfX2lubmVyXCI+XG5cdFx0PGRpdiBjbGFzcz1cIm5hdl9fc29ydC1ieVwiPlxuXHRcdFx0PHNwYW4gY2xhc3M9XCJzb3J0LWJ5X190aXRsZVwiPlNvcnQgYnk8L3NwYW4+XG5cdFx0XHQ8YnV0dG9uIGNsYXNzPVwic29ydC1ieV9fYnktYXJ0aXN0IGFjdGl2ZVwiIGlkPVwianMtYnktYXJ0aXN0XCI+QXJ0aXN0PC9idXR0b24+XG5cdFx0XHQ8c3BhbiBjbGFzcz1cInNvcnQtYnlfX2RpdmlkZXJcIj4gfCA8L3NwYW4+XG5cdFx0XHQ8YnV0dG9uIGNsYXNzPVwic29ydC1ieV9fYnktdGl0bGVcIiBpZD1cImpzLWJ5LXRpdGxlXCI+VGl0bGU8L2J1dHRvbj5cblx0XHRcdDxzcGFuIGNsYXNzPVwic29ydC1ieV9fZGl2aWRlciBmaW5kXCI+IHwgPC9zcGFuPlxuXHRcdFx0PHNwYW4gY2xhc3M9XCJmaW5kXCIgaWQ9XCJqcy1maW5kXCI+JiM4OTg0O0Y8L3NwYW4+XG5cdFx0PC9kaXY+XG5cdFx0PGRpdiBjbGFzcz1cIm5hdl9fYWxwaGFiZXRcIj5cblx0XHRcdDxzcGFuIGNsYXNzPVwiYWxwaGFiZXRfX3RpdGxlXCI+R28gdG88L3NwYW4+XG5cdFx0XHQ8ZGl2IGNsYXNzPVwiYWxwaGFiZXRfX2xldHRlcnNcIj48L2Rpdj5cblx0XHQ8L2Rpdj5cblx0PC9kaXY+YDtcblxuY29uc3QgbmF2TGcgPSAoKSA9PiB7XG5cdGxldCBuYXZPdXRlciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdqcy1uYXYnKTtcblx0bmF2T3V0ZXIuaW5uZXJIVE1MID0gdGVtcGxhdGU7XG59O1xuXG5leHBvcnQgZGVmYXVsdCBuYXZMZzsiXSwicHJlRXhpc3RpbmdDb21tZW50IjoiLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9dXRmLTg7YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0p6YjNWeVkyVnpJanBiSW01dlpHVmZiVzlrZFd4bGN5OWljbTkzYzJWeUxYQmhZMnN2WDNCeVpXeDFaR1V1YW5NaUxDSnViMlJsWDIxdlpIVnNaWE12ZDJoaGRIZG5MV1psZEdOb0wyWmxkR05vTG1weklpd2ljM0pqTDJwekwyRnlkR2xqYkdVdGRHVnRjR3hoZEdVdWFuTWlMQ0p6Y21NdmFuTXZhVzVrWlhndWFuTWlMQ0p6Y21NdmFuTXZibUYyTFd4bkxtcHpJbDBzSW01aGJXVnpJanBiWFN3aWJXRndjR2x1WjNNaU9pSkJRVUZCTzBGRFFVRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUczdPenM3T3p0QlEyeGtRU3hKUVVGTkxHbHdRa0ZCVGpzN2EwSkJiVUpsTEdVN096czdPMEZEYmtKbU96dEJRVU5CT3pzN08wRkJRMEU3T3pzN096dEJRVVZCTEVsQlFVMHNTMEZCU3l3clJrRkJXRHRCUVVOQkxFbEJRVTBzVjBGQlZ5eERRVUZETEVkQlFVUXNSVUZCVFN4SFFVRk9MRVZCUVZjc1IwRkJXQ3hGUVVGblFpeEhRVUZvUWl4RlFVRnhRaXhIUVVGeVFpeEZRVUV3UWl4SFFVRXhRaXhGUVVFclFpeEhRVUV2UWl4RlFVRnZReXhIUVVGd1F5eEZRVUY1UXl4SFFVRjZReXhGUVVFNFF5eEhRVUU1UXl4RlFVRnRSQ3hIUVVGdVJDeEZRVUYzUkN4SFFVRjRSQ3hGUVVFMlJDeEhRVUUzUkN4RlFVRnJSU3hIUVVGc1JTeEZRVUYxUlN4SFFVRjJSU3hGUVVFMFJTeEhRVUUxUlN4RlFVRnBSaXhIUVVGcVJpeEZRVUZ6Uml4SFFVRjBSaXhGUVVFeVJpeEhRVUV6Uml4RlFVRm5SeXhIUVVGb1J5eEZRVUZ4Unl4SFFVRnlSeXhGUVVFd1J5eEhRVUV4Unl4RlFVRXJSeXhIUVVFdlJ5eEZRVUZ2U0N4SFFVRndTQ3hEUVVGcVFqczdRVUZGUVN4SlFVRk5MRmRCUVZjc1RVRkJUU3hKUVVGT0xFTkJRVmNzVTBGQlV5eG5Ra0ZCVkN4RFFVRXdRaXhWUVVFeFFpeERRVUZZTEVOQlFXcENPMEZCUTBFc1NVRkJUU3hQUVVGUExGTkJRVk1zWTBGQlZDeERRVUYzUWl4UlFVRjRRaXhEUVVGaU8wRkJRMEVzU1VGQlRTeFpRVUZaTEZOQlFWTXNZVUZCVkN4RFFVRjFRaXhYUVVGMlFpeERRVUZzUWp0QlFVTkJMRWxCUVUwc1YwRkJWeXhUUVVGVExHRkJRVlFzUTBGQmRVSXNWVUZCZGtJc1EwRkJha0k3UVVGRFFTeEpRVUZOTEZOQlFWTXNVMEZCVXl4alFVRlVMRU5CUVhkQ0xGVkJRWGhDTEVOQlFXWTdRVUZEUVN4SlFVRk5MRk5CUVZNc1UwRkJVeXhoUVVGVUxFTkJRWFZDTEZGQlFYWkNMRU5CUVdZN1FVRkRRU3hKUVVGTkxGTkJRVk1zVTBGQlV5eGhRVUZVTEVOQlFYVkNMRkZCUVhaQ0xFTkJRV1k3UVVGRFFTeEpRVUZOTEZsQlFWa3NVMEZCVXl4aFFVRlVMRU5CUVhWQ0xGZEJRWFpDTEVOQlFXeENPMEZCUTBFc1NVRkJUU3hSUVVGUkxGTkJRVk1zWVVGQlZDeERRVUYxUWl4blFrRkJka0lzUTBGQlpEczdRVUZGUVN4SlFVRkpMRlZCUVZVc1EwRkJaQ3hETEVOQlFXbENPMEZCUTJwQ0xFbEJRVWtzVlVGQlZTeEZRVUZGTEZWQlFWVXNSVUZCV2l4RlFVRm5RaXhUUVVGVExFVkJRWHBDTEVWQlFXUTdRVUZEUVN4SlFVRkpMR2RDUVVGblFpeEhRVUZ3UWpzN1FVRkZRU3hKUVVGSkxGZEJRVmNzUzBGQlpqdEJRVU5CTEVsQlFVMHNkVUpCUVhWQ0xGTkJRWFpDTEc5Q1FVRjFRaXhIUVVGTk8wRkJRMnhETEV0QlFVMHNWVUZCVlN4TlFVRk5MRWxCUVU0c1EwRkJWeXhUUVVGVExHZENRVUZVTEVOQlFUQkNMR2RDUVVFeFFpeERRVUZZTEVOQlFXaENPenRCUVVWQkxGTkJRVkVzVDBGQlVpeERRVUZuUWl4bFFVRlBPMEZCUTNSQ0xFMUJRVWtzWjBKQlFVb3NRMEZCY1VJc1QwRkJja0lzUlVGQk9FSXNXVUZCVFR0QlFVTnVReXhQUVVGSkxFMUJRVTBzU1VGQlNTeEhRVUZrTzBGQlEwRXNZVUZCVlN4VFFVRldMRU5CUVc5Q0xFZEJRWEJDTEVOQlFYZENMRlZCUVhoQ08wRkJRMEVzVTBGQlRTeFpRVUZPTEVOQlFXMUNMRTlCUVc1Q0xEWkNRVUZ4UkN4SFFVRnlSRHRCUVVOQkxHTkJRVmNzU1VGQldEdEJRVU5CTEVkQlRFUTdRVUZOUVN4RlFWQkVPenRCUVZOQkxFOUJRVTBzWjBKQlFVNHNRMEZCZFVJc1QwRkJka0lzUlVGQlowTXNXVUZCVFR0QlFVTnlReXhOUVVGSkxGRkJRVW9zUlVGQll6dEJRVU5pTEdGQlFWVXNVMEZCVml4RFFVRnZRaXhOUVVGd1FpeERRVUV5UWl4VlFVRXpRanRCUVVOQkxHTkJRVmNzUzBGQldEdEJRVU5CTzBGQlEwUXNSVUZNUkR0QlFVMUJMRU5CYkVKRU96dEJRVzlDUVN4SlFVRkpMRkZCUVZFc1MwRkJXanRCUVVOQkxFbEJRVTBzZFVKQlFYVkNMRk5CUVhaQ0xHOUNRVUYxUWl4SFFVRk5PMEZCUTJ4RExFdEJRVTBzVVVGQlVTeFRRVUZUTEdOQlFWUXNRMEZCZDBJc1UwRkJlRUlzUTBGQlpEczdRVUZGUVN4UFFVRk5MR2RDUVVGT0xFTkJRWFZDTEU5QlFYWkNMRVZCUVdkRExGbEJRVTA3UVVGRGNrTXNVMEZCVHl4VFFVRlFMRU5CUVdsQ0xFZEJRV3BDTEVOQlFYRkNMRTFCUVhKQ08wRkJRMEVzVlVGQlVTeEpRVUZTTzBGQlEwRXNSVUZJUkRzN1FVRkxRU3hSUVVGUExHZENRVUZRTEVOQlFYZENMRTlCUVhoQ0xFVkJRV2xETEZsQlFVMDdRVUZEZEVNc1lVRkJWeXhaUVVGTk8wRkJRMmhDTEZWQlFVOHNVMEZCVUN4RFFVRnBRaXhOUVVGcVFpeERRVUYzUWl4TlFVRjRRanRCUVVOQkxGZEJRVkVzUzBGQlVqdEJRVU5CTEVkQlNFUXNSVUZIUnl4SFFVaElPMEZCU1VFc1JVRk1SRHM3UVVGUFFTeFJRVUZQTEdkQ1FVRlFMRU5CUVhkQ0xGTkJRWGhDTEVWQlFXMURMRmxCUVUwN1FVRkRlRU1zVFVGQlNTeExRVUZLTEVWQlFWYzdRVUZEVml4alFVRlhMRmxCUVUwN1FVRkRhRUlzVjBGQlR5eFRRVUZRTEVOQlFXbENMRTFCUVdwQ0xFTkJRWGRDTEUxQlFYaENPMEZCUTBFc1dVRkJVU3hMUVVGU08wRkJRMEVzU1VGSVJDeEZRVWRITEVkQlNFZzdRVUZKUVR0QlFVTkVMRVZCVUVRN1FVRlJRU3hEUVhaQ1JEczdRVUY1UWtFc1NVRkJUU3hqUVVGakxGTkJRV1FzVjBGQll5eEhRVUZOTzBGQlEzcENMRXRCUVVrc1VVRkJVU3hUUVVGVExHTkJRVlFzUTBGQmQwSXNaVUZCZUVJc1EwRkJXanRCUVVOQkxFOUJRVTBzWTBGQlRpeERRVUZ4UWl4RlFVRkRMRlZCUVZVc1VVRkJXQ3hGUVVGeFFpeFBRVUZQTEU5QlFUVkNMRVZCUVhKQ08wRkJRMEVzUTBGSVJEczdRVUZMUVN4SlFVRkpMR0ZCUVVvN1FVRkRRU3hKUVVGSkxGVkJRVlVzUTBGQlpEdEJRVU5CTEVsQlFVa3NXVUZCV1N4TFFVRm9RanRCUVVOQkxFbEJRVTBzZFVKQlFYVkNMRk5CUVhaQ0xHOUNRVUYxUWl4SFFVRk5PMEZCUTJ4RExGRkJRVThzWjBKQlFWQXNRMEZCZDBJc1QwRkJlRUlzUlVGQmFVTXNXVUZCVFR0QlFVTjBRenRCUVVOQkxFVkJSa1E3TzBGQlNVRXNWMEZCVlN4blFrRkJWaXhEUVVFeVFpeFJRVUV6UWl4RlFVRnhReXhaUVVGTk96dEJRVVV4UXl4TlFVRkpMRWxCUVVrc1QwRkJUeXh4UWtGQlVDeEhRVUVyUWl4RFFVRjJRenRCUVVOQkxFMUJRVWtzV1VGQldTeERRVUZvUWl4RlFVRnRRanRCUVVOc1FpeFZRVUZQTEU5QlFWQTdRVUZEUVN4aFFVRlZMRU5CUVZZN1FVRkRRVHM3UVVGRlJDeE5RVUZKTEV0QlFVc3NRMEZCUXl4RlFVRk9MRWxCUVZrc1EwRkJReXhUUVVGcVFpeEZRVUUwUWp0QlFVTXpRaXhWUVVGUExGTkJRVkFzUTBGQmFVSXNSMEZCYWtJc1EwRkJjVUlzVFVGQmNrSTdRVUZEUVN4bFFVRlpMRWxCUVZvN1FVRkRRU3hIUVVoRUxFMUJSMDhzU1VGQlNTeEpRVUZKTEVOQlFVTXNSVUZCVEN4SlFVRlhMRk5CUVdZc1JVRkJNRUk3UVVGRGFFTXNWVUZCVHl4VFFVRlFMRU5CUVdsQ0xFMUJRV3BDTEVOQlFYZENMRTFCUVhoQ08wRkJRMEVzWlVGQldTeExRVUZhTzBGQlEwRTdRVUZEUkN4RlFXWkVPMEZCWjBKQkxFTkJja0pFT3p0QlFYVkNRU3hKUVVGTkxIbENRVUY1UWl4VFFVRjZRaXh6UWtGQmVVSXNSMEZCVFR0QlFVTndReXhMUVVGSkxGbEJRVmtzVTBGQlV5eGpRVUZVTEVOQlFYZENMR05CUVhoQ0xFTkJRV2hDTzBGQlEwRXNTMEZCU1N4WFFVRlhMRk5CUVZNc1kwRkJWQ3hEUVVGM1FpeGhRVUY0UWl4RFFVRm1PMEZCUTBFc1YwRkJWU3huUWtGQlZpeERRVUV5UWl4UFFVRXpRaXhGUVVGdlF5eFpRVUZOTzBGQlEzcERMRTFCUVVrc1QwRkJTaXhGUVVGaE8wRkJRMW83UVVGRFFTeGhRVUZWTEVOQlFWWTdRVUZEUVN4aFFVRlZMRk5CUVZZc1EwRkJiMElzUjBGQmNFSXNRMEZCZDBJc1VVRkJlRUk3UVVGRFFTeFpRVUZUTEZOQlFWUXNRMEZCYlVJc1RVRkJia0lzUTBGQk1FSXNVVUZCTVVJN08wRkJSVUU3UVVGRFFUdEJRVU5FTEVWQlZFUTdPMEZCVjBFc1ZVRkJVeXhuUWtGQlZDeERRVUV3UWl4UFFVRXhRaXhGUVVGdFF5eFpRVUZOTzBGQlEzaERMRTFCUVVrc1EwRkJReXhQUVVGTUxFVkJRV003UVVGRFlqdEJRVU5CTEdGQlFWVXNRMEZCVmp0QlFVTkJMRmxCUVZNc1UwRkJWQ3hEUVVGdFFpeEhRVUZ1UWl4RFFVRjFRaXhSUVVGMlFqdEJRVU5CTEdGQlFWVXNVMEZCVml4RFFVRnZRaXhOUVVGd1FpeERRVUV5UWl4UlFVRXpRanM3UVVGRlFUdEJRVU5CTzBGQlEwUXNSVUZVUkR0QlFWVkJMRU5CZUVKRU96dEJRVEJDUVN4SlFVRk5MR1ZCUVdVc1UwRkJaaXhaUVVGbExFTkJRVU1zV1VGQlJDeEZRVUZyUWp0QlFVTjBReXhMUVVGSkxGZEJRVmNzVFVGQlRTeEpRVUZPTEVOQlFWY3NVMEZCVXl4blFrRkJWQ3hEUVVFd1FpeFpRVUV4UWl4RFFVRllMRU5CUVdZN1FVRkRRU3hWUVVGVExFOUJRVlFzUTBGQmFVSTdRVUZCUVN4VFFVRlRMRTFCUVUwc1pVRkJUaXhEUVVGelFpeE5RVUYwUWl4RFFVRlVPMEZCUVVFc1JVRkJha0k3UVVGRFFTeERRVWhFT3p0QlFVdEJMRWxCUVUwc2FVSkJRV2xDTEZOQlFXcENMR05CUVdsQ0xFTkJRVU1zU1VGQlJDeEZRVUZWTzBGQlEyaERMRXRCUVVrc1YwRkJWeXhWUVVGVkxHbENRVUZXTEVkQlFUaENMR3RDUVVFM1F6dEJRVU5CTEV0QlFVa3NaVUZCWlN4RFFVRkRMRTlCUVVRc1IwRkJWeXhwUWtGQldDeEhRVUVyUWl4clFrRkJiRVE3UVVGRFFTeExRVUZKTEZkQlFWY3NUVUZCVFN4SlFVRk9MRU5CUVZjc1UwRkJVeXhuUWtGQlZDeERRVUV3UWl4UlFVRXhRaXhEUVVGWUxFTkJRV1k3TzBGQlJVRXNZMEZCWVN4WlFVRmlPenRCUVVWQkxGRkJRVThzVTBGQlV5eEpRVUZVTEVOQlFXTXNhVUpCUVZNN1FVRkROMElzVFVGQlNTeFBRVUZQTEUxQlFVMHNhMEpCUVdwQ08wRkJRMEVzVTBGQlR5eExRVUZMTEZOQlFVd3NRMEZCWlN4RFFVRm1MRTFCUVhOQ0xFbEJRWFJDTEVsQlFUaENMRXRCUVVzc1UwRkJUQ3hEUVVGbExFTkJRV1lzVFVGQmMwSXNTMEZCU3l4WFFVRk1MRVZCUVRORU8wRkJRMEVzUlVGSVRTeERRVUZRTzBGQlNVRXNRMEZZUkRzN1FVRmhRU3hKUVVGTkxIVkNRVUYxUWl4VFFVRjJRaXh2UWtGQmRVSXNRMEZCUXl4UFFVRkVMRVZCUVZVc1RVRkJWaXhGUVVGeFFqczdRVUZGYWtRc1UwRkJVU3huUWtGQlVpeERRVUY1UWl4UFFVRjZRaXhGUVVGclF5eFpRVUZOTzBGQlEzWkRMRTFCUVUwc1lVRkJZU3hUUVVGVExHTkJRVlFzUTBGQmQwSXNUVUZCZUVJc1EwRkJia0k3UVVGRFFTeE5RVUZKTEdWQlFVbzdPMEZCUlVFc1RVRkJTU3hEUVVGRExFOUJRVXdzUlVGQll6dEJRVU5pTEZsQlFWTXNWMEZCVnl4SFFVRllMRWRCUVdsQ0xGTkJRVk1zWTBGQlZDeERRVUYzUWl4bFFVRjRRaXhEUVVGcVFpeEhRVUUwUkN4WFFVRlhMR0ZCUVZnc1EwRkJlVUlzWVVGQmVrSXNRMEZCZFVNc1lVRkJka01zUTBGQmNVUXNZVUZCY2tRc1EwRkJiVVVzYzBKQlFXNUZMRU5CUVRCR0xHRkJRVEZHTEVOQlFYZEhMREpDUVVGNFJ5eERRVUZ5UlR0QlFVTkJMRWRCUmtRc1RVRkZUenRCUVVOT0xGbEJRVk1zVjBGQlZ5eEhRVUZZTEVkQlFXbENMRk5CUVZNc1kwRkJWQ3hEUVVGM1FpeGxRVUY0UWl4RFFVRnFRaXhIUVVFMFJDeFhRVUZYTEdGQlFWZ3NRMEZCZVVJc1lVRkJla0lzUTBGQmRVTXNZVUZCZGtNc1EwRkJjVVFzYzBKQlFYSkVMRU5CUVRSRkxHRkJRVFZGTEVOQlFUQkdMREpDUVVFeFJpeERRVUZ5UlR0QlFVTkJPenRCUVVWRUxGTkJRVThzWTBGQlVDeERRVUZ6UWl4RlFVRkRMRlZCUVZVc1VVRkJXQ3hGUVVGeFFpeFBRVUZQTEU5QlFUVkNMRVZCUVhSQ08wRkJRMEVzUlVGWVJEdEJRVmxCTEVOQlpFUTdPMEZCWjBKQkxFbEJRVTBzWlVGQlpTeFRRVUZtTEZsQlFXVXNSMEZCVFR0QlFVTXhRaXhMUVVGSkxHZENRVUZuUWl4RlFVRndRanRCUVVOQkxFdEJRVWtzVTBGQlV5eFRRVUZUTEdGQlFWUXNRMEZCZFVJc2IwSkJRWFpDTEVOQlFXSTdRVUZEUVN4UlFVRlBMRk5CUVZBc1IwRkJiVUlzUlVGQmJrSTdPMEZCUlVFc1ZVRkJVeXhQUVVGVUxFTkJRV2xDTEd0Q1FVRlZPMEZCUXpGQ0xFMUJRVWtzWTBGQll5eGxRVUZsTEUxQlFXWXNRMEZCYkVJN1FVRkRRU3hOUVVGSkxGVkJRVlVzVTBGQlV5eGhRVUZVTEVOQlFYVkNMRWRCUVhaQ0xFTkJRV1E3TzBGQlJVRXNUVUZCU1N4RFFVRkRMRmRCUVV3c1JVRkJhMEk3TzBGQlJXeENMR05CUVZrc1JVRkJXaXhIUVVGcFFpeE5RVUZxUWp0QlFVTkJMRlZCUVZFc1UwRkJVaXhIUVVGdlFpeFBRVUZQTEZkQlFWQXNSVUZCY0VJN1FVRkRRU3hWUVVGUkxGTkJRVklzUjBGQmIwSXNlVUpCUVhCQ096dEJRVVZCTEhWQ1FVRnhRaXhQUVVGeVFpeEZRVUU0UWl4TlFVRTVRanRCUVVOQkxGTkJRVThzVFVGQlVDeERRVUZqTEU5QlFXUTdRVUZEUVN4RlFWcEVPMEZCWVVFc1EwRnNRa1E3TzBGQmIwSkJMRWxCUVUwc1pVRkJaU3hUUVVGbUxGbEJRV1VzUTBGQlF5eE5RVUZFTEVWQlFWTXNUMEZCVkN4RlFVRnhRanRCUVVONlF5eFJRVUZQTEU5QlFWQXNRMEZCWlN4cFFrRkJVenRCUVVOMlFpeE5RVUZOTEN0Q1FVRTJRaXhMUVVGdVF6dEJRVU5CTEUxQlFVa3NUMEZCVHl4VFFVRlRMR0ZCUVZRc1EwRkJkVUlzUzBGQmRrSXNRMEZCV0R0QlFVTkJMRTlCUVVzc1UwRkJUQ3hIUVVGcFFpeGxRVUZxUWp0QlFVTkJMRTlCUVVzc1IwRkJUQ3hIUVVGWExFZEJRVmc3UVVGRFFTeFZRVUZSTEUxQlFWSXNRMEZCWlN4SlFVRm1PMEZCUTBFc1JVRk9SRHRCUVU5QkxFTkJVa1E3TzBGQlZVRXNTVUZCVFN4blFrRkJaMElzVTBGQmFFSXNZVUZCWjBJc1IwRkJUVHRCUVVNelFpeExRVUZKTEdWQlFXVXNVMEZCVXl4alFVRlVMRU5CUVhkQ0xGTkJRWGhDTEVOQlFXNUNPMEZCUTBFc1MwRkJTU3hqUVVGakxGVkJRVlVzVVVGQlVTeFBRVUZzUWl4SFFVRTBRaXhSUVVGUkxGRkJRWFJFT3p0QlFVVkJMR05CUVdFc1UwRkJZaXhIUVVGNVFpeEZRVUY2UWpzN1FVRkZRU3hoUVVGWkxFOUJRVm9zUTBGQmIwSXNhVUpCUVZNN1FVRkJRU3hOUVVOMFFpeExRVVJ6UWl4SFFVTnpReXhMUVVSMFF5eERRVU4wUWl4TFFVUnpRanRCUVVGQkxFMUJRMllzVVVGRVpTeEhRVU56UXl4TFFVUjBReXhEUVVObUxGRkJSR1U3UVVGQlFTeE5RVU5NTEZOQlJFc3NSMEZEYzBNc1MwRkVkRU1zUTBGRFRDeFRRVVJMTzBGQlFVRXNUVUZEVFN4TlFVUk9MRWRCUTNORExFdEJSSFJETEVOQlEwMHNUVUZFVGp0QlFVRkJMRTFCUTJNc1YwRkVaQ3hIUVVOelF5eExRVVIwUXl4RFFVTmpMRmRCUkdRN1FVRkJRU3hOUVVNeVFpeE5RVVF6UWl4SFFVTnpReXhMUVVSMFF5eERRVU15UWl4TlFVUXpRanM3TzBGQlJ6VkNMR1ZCUVdFc2EwSkJRV0lzUTBGQlowTXNWMEZCYUVNc1JVRkJOa01zZVVKQlFUZERPenRCUVVWQkxFMUJRVWtzWlVGQlpTeFRRVUZUTEdkQ1FVRlVMRU5CUVRCQ0xIZENRVUV4UWl4RFFVRnVRanRCUVVOQkxFMUJRVWtzVlVGQlZTeGhRVUZoTEdGQlFXRXNUVUZCWWl4SFFVRnpRaXhEUVVGdVF5eERRVUZrT3p0QlFVVkJMRTFCUVVrc1QwRkJUeXhOUVVGWUxFVkJRVzFDTEdGQlFXRXNUVUZCWWl4RlFVRnhRaXhQUVVGeVFqczdRVUZGYmtJc1RVRkJTU3h2UWtGQmIwSXNVMEZCVXl4aFFVRlVMRU5CUVhWQ0xFdEJRWFpDTEVOQlFYaENPMEZCUTBFc1RVRkJTU3h0UWtGQmJVSXNVMEZCVXl4aFFVRlVMRU5CUVhWQ0xFZEJRWFpDTEVOQlFYWkNPMEZCUTBFc1RVRkJTU3hqUVVGakxGTkJRVk1zWVVGQlZDeERRVUYxUWl4SFFVRjJRaXhEUVVGc1FqdEJRVU5CTEc5Q1FVRnJRaXhUUVVGc1FpeERRVUUwUWl4SFFVRTFRaXhEUVVGblF5dzBRa0ZCYUVNN1FVRkRRU3h0UWtGQmFVSXNVMEZCYWtJc1EwRkJNa0lzUjBGQk0wSXNRMEZCSzBJc2NVSkJRUzlDTzBGQlEwRXNZMEZCV1N4VFFVRmFMRU5CUVhOQ0xFZEJRWFJDTEVOQlFUQkNMR2RDUVVFeFFqczdRVUZGUVN4dFFrRkJhVUlzVTBGQmFrSXNSMEZCTmtJc1YwRkJOMEk3UVVGRFFTeGpRVUZaTEZOQlFWb3NSMEZCZDBJc1RVRkJlRUk3TzBGQlJVRXNiMEpCUVd0Q0xFMUJRV3hDTEVOQlFYbENMR2RDUVVGNlFpeEZRVUV5UXl4WFFVRXpRenRCUVVOQkxGVkJRVkVzVFVGQlVpeERRVUZsTEdsQ1FVRm1PenRCUVVWQkxFMUJRVWtzWTBGQll5eFRRVUZUTEdkQ1FVRlVMRU5CUVRCQ0xIbENRVUV4UWl4RFFVRnNRanRCUVVOQkxFMUJRVWtzVTBGQlV5eFpRVUZaTEZsQlFWa3NUVUZCV2l4SFFVRnhRaXhEUVVGcVF5eERRVUZpT3p0QlFVVkJMRTFCUVVrc1kwRkJZeXhUUVVGVExHZENRVUZVTEVOQlFUQkNMQ3RDUVVFeFFpeERRVUZzUWp0QlFVTkJMRTFCUVVrc1UwRkJVeXhaUVVGWkxGbEJRVmtzVFVGQldpeEhRVUZ4UWl4RFFVRnFReXhEUVVGaU96dEJRVVZCTEUxQlFVa3NZVUZCWVN4VFFVRlRMR2RDUVVGVUxFTkJRVEJDTERoQ1FVRXhRaXhEUVVGcVFqdEJRVU5CTEUxQlFVa3NVVUZCVVN4WFFVRlhMRmRCUVZjc1RVRkJXQ3hIUVVGdlFpeERRVUV2UWl4RFFVRmFPenRCUVVWQkxGTkJRVThzVTBGQlVDeEhRVUZ0UWl4TFFVRnVRanRCUVVOQkxGTkJRVThzVTBGQlVDeEhRVUZ0UWl4VFFVRnVRanRCUVVOQkxGRkJRVTBzVTBGQlRpeEhRVUZyUWl4UlFVRnNRanRCUVVWQkxFVkJjRU5FT3p0QlFYTkRRVHRCUVVOQkxFTkJOME5FT3p0QlFTdERRU3hKUVVGTkxHTkJRV01zVTBGQlpDeFhRVUZqTEVkQlFVMDdRVUZEZWtJc1UwRkJVU3hQUVVGU0xFTkJRV2RDTEVsQlFXaENMRU5CUVhGQ0xGVkJRVU1zUTBGQlJDeEZRVUZKTEVOQlFVb3NSVUZCVlR0QlFVTTVRaXhOUVVGSkxGTkJRVk1zUlVGQlJTeExRVUZHTEVOQlFWRXNRMEZCVWl4RlFVRlhMRmRCUVZnc1JVRkJZanRCUVVOQkxFMUJRVWtzVTBGQlV5eEZRVUZGTEV0QlFVWXNRMEZCVVN4RFFVRlNMRVZCUVZjc1YwRkJXQ3hGUVVGaU8wRkJRMEVzVFVGQlNTeFRRVUZUTEUxQlFXSXNSVUZCY1VJc1QwRkJUeXhEUVVGUUxFTkJRWEpDTEV0QlEwc3NTVUZCU1N4VFFVRlRMRTFCUVdJc1JVRkJjVUlzVDBGQlR5eERRVUZETEVOQlFWSXNRMEZCY2tJc1MwRkRRU3hQUVVGUExFTkJRVkE3UVVGRFRDeEZRVTVFTzBGQlQwRXNRMEZTUkRzN1FVRlZRU3hKUVVGTkxGVkJRVlVzVTBGQlZpeFBRVUZWTEVOQlFVTXNTVUZCUkN4RlFVRlZPMEZCUTNwQ0xGTkJRVkVzVVVGQlVpeEhRVUZ0UWl4SlFVRnVRanRCUVVOQkxGTkJRVkVzVDBGQlVpeEhRVUZyUWl4TFFVRkxMRXRCUVV3c1JVRkJiRUk3UVVGRFFUdEJRVU5CTzBGQlEwRXNRMEZNUkRzN1FVRlBRU3hKUVVGTkxGbEJRVmtzVTBGQldpeFRRVUZaTEVkQlFVMDdPMEZCUlhSQ0xFOUJRVTBzUlVGQlRpeEZRVUZWTEVsQlFWWXNRMEZCWlR0QlFVRkJMRk5CUTJRc1NVRkJTU3hKUVVGS0xFVkJSR003UVVGQlFTeEZRVUZtTEVWQlJVVXNTVUZHUml4RFFVVlBMR2RDUVVGUk8wRkJRMlFzVlVGQlVTeEpRVUZTTzBGQlEwRXNSVUZLUkN4RlFVdERMRWxCVEVRc1EwRkxUU3haUVVGTk8wRkJRMWc3UVVGRFFTeFhRVUZUTEU5QlFWUXNRMEZCYVVJN1FVRkJRU3hWUVVGUkxFdEJRVXNzVTBGQlRDeERRVUZsTEVkQlFXWXNRMEZCYlVJc1QwRkJia0lzUTBGQlVqdEJRVUZCTEVkQlFXcENPMEZCUTBFc1QwRkJTeXhUUVVGTUxFTkJRV1VzUjBGQlppeERRVUZ0UWl4UFFVRnVRanRCUVVOQkxFVkJWRVFzUlVGVlF5eExRVlpFTEVOQlZVODdRVUZCUVN4VFFVRlBMRkZCUVZFc1NVRkJVaXhEUVVGaExFZEJRV0lzUTBGQlVEdEJRVUZCTEVWQlZsQTdRVUZYUkN4RFFXSkVPenRCUVdWQkxFbEJRVTBzVDBGQlR5eFRRVUZRTEVsQlFVOHNSMEZCVFR0QlFVTnNRanRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVN4RFFWQkVPenRCUVZOQk96czdPenM3T3p0QlEzSlNRU3hKUVVGTkxHOXNRa0ZCVGpzN1FVRm5Ra0VzU1VGQlRTeFJRVUZSTEZOQlFWSXNTMEZCVVN4SFFVRk5PMEZCUTI1Q0xFdEJRVWtzVjBGQlZ5eFRRVUZUTEdOQlFWUXNRMEZCZDBJc1VVRkJlRUlzUTBGQlpqdEJRVU5CTEZWQlFWTXNVMEZCVkN4SFFVRnhRaXhSUVVGeVFqdEJRVU5CTEVOQlNFUTdPMnRDUVV0bExFc2lMQ0ptYVd4bElqb2laMlZ1WlhKaGRHVmtMbXB6SWl3aWMyOTFjbU5sVW05dmRDSTZJaUlzSW5OdmRYSmpaWE5EYjI1MFpXNTBJanBiSWlobWRXNWpkR2x2YmlncGUyWjFibU4wYVc5dUlISW9aU3h1TEhRcGUyWjFibU4wYVc5dUlHOG9hU3htS1h0cFppZ2hibHRwWFNsN2FXWW9JV1ZiYVYwcGUzWmhjaUJqUFZ3aVpuVnVZM1JwYjI1Y0lqMDlkSGx3Wlc5bUlISmxjWFZwY21VbUpuSmxjWFZwY21VN2FXWW9JV1ltSm1NcGNtVjBkWEp1SUdNb2FTd2hNQ2s3YVdZb2RTbHlaWFIxY200Z2RTaHBMQ0V3S1R0MllYSWdZVDF1WlhjZ1JYSnliM0lvWENKRFlXNXViM1FnWm1sdVpDQnRiMlIxYkdVZ0oxd2lLMmtyWENJblhDSXBPM1JvY205M0lHRXVZMjlrWlQxY0lrMVBSRlZNUlY5T1QxUmZSazlWVGtSY0lpeGhmWFpoY2lCd1BXNWJhVjA5ZTJWNGNHOXlkSE02ZTMxOU8yVmJhVjFiTUYwdVkyRnNiQ2h3TG1WNGNHOXlkSE1zWm5WdVkzUnBiMjRvY2lsN2RtRnlJRzQ5WlZ0cFhWc3hYVnR5WFR0eVpYUjFjbTRnYnlodWZIeHlLWDBzY0N4d0xtVjRjRzl5ZEhNc2NpeGxMRzRzZENsOWNtVjBkWEp1SUc1YmFWMHVaWGh3YjNKMGMzMW1iM0lvZG1GeUlIVTlYQ0ptZFc1amRHbHZibHdpUFQxMGVYQmxiMllnY21WeGRXbHlaU1ltY21WeGRXbHlaU3hwUFRBN2FUeDBMbXhsYm1kMGFEdHBLeXNwYnloMFcybGRLVHR5WlhSMWNtNGdiMzF5WlhSMWNtNGdjbjBwS0NraUxDSW9ablZ1WTNScGIyNG9jMlZzWmlrZ2UxeHVJQ0FuZFhObElITjBjbWxqZENjN1hHNWNiaUFnYVdZZ0tITmxiR1l1Wm1WMFkyZ3BJSHRjYmlBZ0lDQnlaWFIxY201Y2JpQWdmVnh1WEc0Z0lIWmhjaUJ6ZFhCd2IzSjBJRDBnZTF4dUlDQWdJSE5sWVhKamFGQmhjbUZ0Y3pvZ0oxVlNURk5sWVhKamFGQmhjbUZ0Y3ljZ2FXNGdjMlZzWml4Y2JpQWdJQ0JwZEdWeVlXSnNaVG9nSjFONWJXSnZiQ2NnYVc0Z2MyVnNaaUFtSmlBbmFYUmxjbUYwYjNJbklHbHVJRk41YldKdmJDeGNiaUFnSUNCaWJHOWlPaUFuUm1sc1pWSmxZV1JsY2ljZ2FXNGdjMlZzWmlBbUppQW5RbXh2WWljZ2FXNGdjMlZzWmlBbUppQW9ablZ1WTNScGIyNG9LU0I3WEc0Z0lDQWdJQ0IwY25rZ2UxeHVJQ0FnSUNBZ0lDQnVaWGNnUW14dllpZ3BYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQjBjblZsWEc0Z0lDQWdJQ0I5SUdOaGRHTm9LR1VwSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUdaaGJITmxYRzRnSUNBZ0lDQjlYRzRnSUNBZ2ZTa29LU3hjYmlBZ0lDQm1iM0p0UkdGMFlUb2dKMFp2Y20xRVlYUmhKeUJwYmlCelpXeG1MRnh1SUNBZ0lHRnljbUY1UW5WbVptVnlPaUFuUVhKeVlYbENkV1ptWlhJbklHbHVJSE5sYkdaY2JpQWdmVnh1WEc0Z0lHbG1JQ2h6ZFhCd2IzSjBMbUZ5Y21GNVFuVm1abVZ5S1NCN1hHNGdJQ0FnZG1GeUlIWnBaWGREYkdGemMyVnpJRDBnVzF4dUlDQWdJQ0FnSjF0dlltcGxZM1FnU1c1ME9FRnljbUY1WFNjc1hHNGdJQ0FnSUNBblcyOWlhbVZqZENCVmFXNTBPRUZ5Y21GNVhTY3NYRzRnSUNBZ0lDQW5XMjlpYW1WamRDQlZhVzUwT0VOc1lXMXdaV1JCY25KaGVWMG5MRnh1SUNBZ0lDQWdKMXR2WW1wbFkzUWdTVzUwTVRaQmNuSmhlVjBuTEZ4dUlDQWdJQ0FnSjF0dlltcGxZM1FnVldsdWRERTJRWEp5WVhsZEp5eGNiaUFnSUNBZ0lDZGJiMkpxWldOMElFbHVkRE15UVhKeVlYbGRKeXhjYmlBZ0lDQWdJQ2RiYjJKcVpXTjBJRlZwYm5Rek1rRnljbUY1WFNjc1hHNGdJQ0FnSUNBblcyOWlhbVZqZENCR2JHOWhkRE15UVhKeVlYbGRKeXhjYmlBZ0lDQWdJQ2RiYjJKcVpXTjBJRVpzYjJGME5qUkJjbkpoZVYwblhHNGdJQ0FnWFZ4dVhHNGdJQ0FnZG1GeUlHbHpSR0YwWVZacFpYY2dQU0JtZFc1amRHbHZiaWh2WW1vcElIdGNiaUFnSUNBZ0lISmxkSFZ5YmlCdlltb2dKaVlnUkdGMFlWWnBaWGN1Y0hKdmRHOTBlWEJsTG1selVISnZkRzkwZVhCbFQyWW9iMkpxS1Z4dUlDQWdJSDFjYmx4dUlDQWdJSFpoY2lCcGMwRnljbUY1UW5WbVptVnlWbWxsZHlBOUlFRnljbUY1UW5WbVptVnlMbWx6Vm1sbGR5QjhmQ0JtZFc1amRHbHZiaWh2WW1vcElIdGNiaUFnSUNBZ0lISmxkSFZ5YmlCdlltb2dKaVlnZG1sbGQwTnNZWE56WlhNdWFXNWtaWGhQWmloUFltcGxZM1F1Y0hKdmRHOTBlWEJsTG5SdlUzUnlhVzVuTG1OaGJHd29iMkpxS1NrZ1BpQXRNVnh1SUNBZ0lIMWNiaUFnZlZ4dVhHNGdJR1oxYm1OMGFXOXVJRzV2Y20xaGJHbDZaVTVoYldVb2JtRnRaU2tnZTF4dUlDQWdJR2xtSUNoMGVYQmxiMllnYm1GdFpTQWhQVDBnSjNOMGNtbHVaeWNwSUh0Y2JpQWdJQ0FnSUc1aGJXVWdQU0JUZEhKcGJtY29ibUZ0WlNsY2JpQWdJQ0I5WEc0Z0lDQWdhV1lnS0M5YlhtRXRlakF0T1Z4Y0xTTWtKU1luS2lzdVhGeGVYMkI4ZmwwdmFTNTBaWE4wS0c1aGJXVXBLU0I3WEc0Z0lDQWdJQ0IwYUhKdmR5QnVaWGNnVkhsd1pVVnljbTl5S0NkSmJuWmhiR2xrSUdOb1lYSmhZM1JsY2lCcGJpQm9aV0ZrWlhJZ1ptbGxiR1FnYm1GdFpTY3BYRzRnSUNBZ2ZWeHVJQ0FnSUhKbGRIVnliaUJ1WVcxbExuUnZURzkzWlhKRFlYTmxLQ2xjYmlBZ2ZWeHVYRzRnSUdaMWJtTjBhVzl1SUc1dmNtMWhiR2w2WlZaaGJIVmxLSFpoYkhWbEtTQjdYRzRnSUNBZ2FXWWdLSFI1Y0dWdlppQjJZV3gxWlNBaFBUMGdKM04wY21sdVp5Y3BJSHRjYmlBZ0lDQWdJSFpoYkhWbElEMGdVM1J5YVc1bktIWmhiSFZsS1Z4dUlDQWdJSDFjYmlBZ0lDQnlaWFIxY200Z2RtRnNkV1ZjYmlBZ2ZWeHVYRzRnSUM4dklFSjFhV3hrSUdFZ1pHVnpkSEoxWTNScGRtVWdhWFJsY21GMGIzSWdabTl5SUhSb1pTQjJZV3gxWlNCc2FYTjBYRzRnSUdaMWJtTjBhVzl1SUdsMFpYSmhkRzl5Um05eUtHbDBaVzF6S1NCN1hHNGdJQ0FnZG1GeUlHbDBaWEpoZEc5eUlEMGdlMXh1SUNBZ0lDQWdibVY0ZERvZ1puVnVZM1JwYjI0b0tTQjdYRzRnSUNBZ0lDQWdJSFpoY2lCMllXeDFaU0E5SUdsMFpXMXpMbk5vYVdaMEtDbGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlIdGtiMjVsT2lCMllXeDFaU0E5UFQwZ2RXNWtaV1pwYm1Wa0xDQjJZV3gxWlRvZ2RtRnNkV1Y5WEc0Z0lDQWdJQ0I5WEc0Z0lDQWdmVnh1WEc0Z0lDQWdhV1lnS0hOMWNIQnZjblF1YVhSbGNtRmliR1VwSUh0Y2JpQWdJQ0FnSUdsMFpYSmhkRzl5VzFONWJXSnZiQzVwZEdWeVlYUnZjbDBnUFNCbWRXNWpkR2x2YmlncElIdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlHbDBaWEpoZEc5eVhHNGdJQ0FnSUNCOVhHNGdJQ0FnZlZ4dVhHNGdJQ0FnY21WMGRYSnVJR2wwWlhKaGRHOXlYRzRnSUgxY2JseHVJQ0JtZFc1amRHbHZiaUJJWldGa1pYSnpLR2hsWVdSbGNuTXBJSHRjYmlBZ0lDQjBhR2x6TG0xaGNDQTlJSHQ5WEc1Y2JpQWdJQ0JwWmlBb2FHVmhaR1Z5Y3lCcGJuTjBZVzVqWlc5bUlFaGxZV1JsY25NcElIdGNiaUFnSUNBZ0lHaGxZV1JsY25NdVptOXlSV0ZqYUNobWRXNWpkR2x2YmloMllXeDFaU3dnYm1GdFpTa2dlMXh1SUNBZ0lDQWdJQ0IwYUdsekxtRndjR1Z1WkNodVlXMWxMQ0IyWVd4MVpTbGNiaUFnSUNBZ0lIMHNJSFJvYVhNcFhHNGdJQ0FnZlNCbGJITmxJR2xtSUNoQmNuSmhlUzVwYzBGeWNtRjVLR2hsWVdSbGNuTXBLU0I3WEc0Z0lDQWdJQ0JvWldGa1pYSnpMbVp2Y2tWaFkyZ29ablZ1WTNScGIyNG9hR1ZoWkdWeUtTQjdYRzRnSUNBZ0lDQWdJSFJvYVhNdVlYQndaVzVrS0dobFlXUmxjbHN3WFN3Z2FHVmhaR1Z5V3pGZEtWeHVJQ0FnSUNBZ2ZTd2dkR2hwY3lsY2JpQWdJQ0I5SUdWc2MyVWdhV1lnS0dobFlXUmxjbk1wSUh0Y2JpQWdJQ0FnSUU5aWFtVmpkQzVuWlhSUGQyNVFjbTl3WlhKMGVVNWhiV1Z6S0dobFlXUmxjbk1wTG1admNrVmhZMmdvWm5WdVkzUnBiMjRvYm1GdFpTa2dlMXh1SUNBZ0lDQWdJQ0IwYUdsekxtRndjR1Z1WkNodVlXMWxMQ0JvWldGa1pYSnpXMjVoYldWZEtWeHVJQ0FnSUNBZ2ZTd2dkR2hwY3lsY2JpQWdJQ0I5WEc0Z0lIMWNibHh1SUNCSVpXRmtaWEp6TG5CeWIzUnZkSGx3WlM1aGNIQmxibVFnUFNCbWRXNWpkR2x2YmlodVlXMWxMQ0IyWVd4MVpTa2dlMXh1SUNBZ0lHNWhiV1VnUFNCdWIzSnRZV3hwZW1WT1lXMWxLRzVoYldVcFhHNGdJQ0FnZG1Gc2RXVWdQU0J1YjNKdFlXeHBlbVZXWVd4MVpTaDJZV3gxWlNsY2JpQWdJQ0IyWVhJZ2IyeGtWbUZzZFdVZ1BTQjBhR2x6TG0xaGNGdHVZVzFsWFZ4dUlDQWdJSFJvYVhNdWJXRndXMjVoYldWZElEMGdiMnhrVm1Gc2RXVWdQeUJ2YkdSV1lXeDFaU3NuTENjcmRtRnNkV1VnT2lCMllXeDFaVnh1SUNCOVhHNWNiaUFnU0dWaFpHVnljeTV3Y205MGIzUjVjR1ZiSjJSbGJHVjBaU2RkSUQwZ1puVnVZM1JwYjI0b2JtRnRaU2tnZTF4dUlDQWdJR1JsYkdWMFpTQjBhR2x6TG0xaGNGdHViM0p0WVd4cGVtVk9ZVzFsS0c1aGJXVXBYVnh1SUNCOVhHNWNiaUFnU0dWaFpHVnljeTV3Y205MGIzUjVjR1V1WjJWMElEMGdablZ1WTNScGIyNG9ibUZ0WlNrZ2UxeHVJQ0FnSUc1aGJXVWdQU0J1YjNKdFlXeHBlbVZPWVcxbEtHNWhiV1VwWEc0Z0lDQWdjbVYwZFhKdUlIUm9hWE11YUdGektHNWhiV1VwSUQ4Z2RHaHBjeTV0WVhCYmJtRnRaVjBnT2lCdWRXeHNYRzRnSUgxY2JseHVJQ0JJWldGa1pYSnpMbkJ5YjNSdmRIbHdaUzVvWVhNZ1BTQm1kVzVqZEdsdmJpaHVZVzFsS1NCN1hHNGdJQ0FnY21WMGRYSnVJSFJvYVhNdWJXRndMbWhoYzA5M2JsQnliM0JsY25SNUtHNXZjbTFoYkdsNlpVNWhiV1VvYm1GdFpTa3BYRzRnSUgxY2JseHVJQ0JJWldGa1pYSnpMbkJ5YjNSdmRIbHdaUzV6WlhRZ1BTQm1kVzVqZEdsdmJpaHVZVzFsTENCMllXeDFaU2tnZTF4dUlDQWdJSFJvYVhNdWJXRndXMjV2Y20xaGJHbDZaVTVoYldVb2JtRnRaU2xkSUQwZ2JtOXliV0ZzYVhwbFZtRnNkV1VvZG1Gc2RXVXBYRzRnSUgxY2JseHVJQ0JJWldGa1pYSnpMbkJ5YjNSdmRIbHdaUzVtYjNKRllXTm9JRDBnWm5WdVkzUnBiMjRvWTJGc2JHSmhZMnNzSUhSb2FYTkJjbWNwSUh0Y2JpQWdJQ0JtYjNJZ0tIWmhjaUJ1WVcxbElHbHVJSFJvYVhNdWJXRndLU0I3WEc0Z0lDQWdJQ0JwWmlBb2RHaHBjeTV0WVhBdWFHRnpUM2R1VUhKdmNHVnlkSGtvYm1GdFpTa3BJSHRjYmlBZ0lDQWdJQ0FnWTJGc2JHSmhZMnN1WTJGc2JDaDBhR2x6UVhKbkxDQjBhR2x6TG0xaGNGdHVZVzFsWFN3Z2JtRnRaU3dnZEdocGN5bGNiaUFnSUNBZ0lIMWNiaUFnSUNCOVhHNGdJSDFjYmx4dUlDQklaV0ZrWlhKekxuQnliM1J2ZEhsd1pTNXJaWGx6SUQwZ1puVnVZM1JwYjI0b0tTQjdYRzRnSUNBZ2RtRnlJR2wwWlcxeklEMGdXMTFjYmlBZ0lDQjBhR2x6TG1admNrVmhZMmdvWm5WdVkzUnBiMjRvZG1Gc2RXVXNJRzVoYldVcElIc2dhWFJsYlhNdWNIVnphQ2h1WVcxbEtTQjlLVnh1SUNBZ0lISmxkSFZ5YmlCcGRHVnlZWFJ2Y2tadmNpaHBkR1Z0Y3lsY2JpQWdmVnh1WEc0Z0lFaGxZV1JsY25NdWNISnZkRzkwZVhCbExuWmhiSFZsY3lBOUlHWjFibU4wYVc5dUtDa2dlMXh1SUNBZ0lIWmhjaUJwZEdWdGN5QTlJRnRkWEc0Z0lDQWdkR2hwY3k1bWIzSkZZV05vS0daMWJtTjBhVzl1S0haaGJIVmxLU0I3SUdsMFpXMXpMbkIxYzJnb2RtRnNkV1VwSUgwcFhHNGdJQ0FnY21WMGRYSnVJR2wwWlhKaGRHOXlSbTl5S0dsMFpXMXpLVnh1SUNCOVhHNWNiaUFnU0dWaFpHVnljeTV3Y205MGIzUjVjR1V1Wlc1MGNtbGxjeUE5SUdaMWJtTjBhVzl1S0NrZ2UxeHVJQ0FnSUhaaGNpQnBkR1Z0Y3lBOUlGdGRYRzRnSUNBZ2RHaHBjeTVtYjNKRllXTm9LR1oxYm1OMGFXOXVLSFpoYkhWbExDQnVZVzFsS1NCN0lHbDBaVzF6TG5CMWMyZ29XMjVoYldVc0lIWmhiSFZsWFNrZ2ZTbGNiaUFnSUNCeVpYUjFjbTRnYVhSbGNtRjBiM0pHYjNJb2FYUmxiWE1wWEc0Z0lIMWNibHh1SUNCcFppQW9jM1Z3Y0c5eWRDNXBkR1Z5WVdKc1pTa2dlMXh1SUNBZ0lFaGxZV1JsY25NdWNISnZkRzkwZVhCbFcxTjViV0p2YkM1cGRHVnlZWFJ2Y2wwZ1BTQklaV0ZrWlhKekxuQnliM1J2ZEhsd1pTNWxiblJ5YVdWelhHNGdJSDFjYmx4dUlDQm1kVzVqZEdsdmJpQmpiMjV6ZFcxbFpDaGliMlI1S1NCN1hHNGdJQ0FnYVdZZ0tHSnZaSGt1WW05a2VWVnpaV1FwSUh0Y2JpQWdJQ0FnSUhKbGRIVnliaUJRY205dGFYTmxMbkpsYW1WamRDaHVaWGNnVkhsd1pVVnljbTl5S0NkQmJISmxZV1I1SUhKbFlXUW5LU2xjYmlBZ0lDQjlYRzRnSUNBZ1ltOWtlUzVpYjJSNVZYTmxaQ0E5SUhSeWRXVmNiaUFnZlZ4dVhHNGdJR1oxYm1OMGFXOXVJR1pwYkdWU1pXRmtaWEpTWldGa2VTaHlaV0ZrWlhJcElIdGNiaUFnSUNCeVpYUjFjbTRnYm1WM0lGQnliMjFwYzJVb1puVnVZM1JwYjI0b2NtVnpiMngyWlN3Z2NtVnFaV04wS1NCN1hHNGdJQ0FnSUNCeVpXRmtaWEl1YjI1c2IyRmtJRDBnWm5WdVkzUnBiMjRvS1NCN1hHNGdJQ0FnSUNBZ0lISmxjMjlzZG1Vb2NtVmhaR1Z5TG5KbGMzVnNkQ2xjYmlBZ0lDQWdJSDFjYmlBZ0lDQWdJSEpsWVdSbGNpNXZibVZ5Y205eUlEMGdablZ1WTNScGIyNG9LU0I3WEc0Z0lDQWdJQ0FnSUhKbGFtVmpkQ2h5WldGa1pYSXVaWEp5YjNJcFhHNGdJQ0FnSUNCOVhHNGdJQ0FnZlNsY2JpQWdmVnh1WEc0Z0lHWjFibU4wYVc5dUlISmxZV1JDYkc5aVFYTkJjbkpoZVVKMVptWmxjaWhpYkc5aUtTQjdYRzRnSUNBZ2RtRnlJSEpsWVdSbGNpQTlJRzVsZHlCR2FXeGxVbVZoWkdWeUtDbGNiaUFnSUNCMllYSWdjSEp2YldselpTQTlJR1pwYkdWU1pXRmtaWEpTWldGa2VTaHlaV0ZrWlhJcFhHNGdJQ0FnY21WaFpHVnlMbkpsWVdSQmMwRnljbUY1UW5WbVptVnlLR0pzYjJJcFhHNGdJQ0FnY21WMGRYSnVJSEJ5YjIxcGMyVmNiaUFnZlZ4dVhHNGdJR1oxYm1OMGFXOXVJSEpsWVdSQ2JHOWlRWE5VWlhoMEtHSnNiMklwSUh0Y2JpQWdJQ0IyWVhJZ2NtVmhaR1Z5SUQwZ2JtVjNJRVpwYkdWU1pXRmtaWElvS1Z4dUlDQWdJSFpoY2lCd2NtOXRhWE5sSUQwZ1ptbHNaVkpsWVdSbGNsSmxZV1I1S0hKbFlXUmxjaWxjYmlBZ0lDQnlaV0ZrWlhJdWNtVmhaRUZ6VkdWNGRDaGliRzlpS1Z4dUlDQWdJSEpsZEhWeWJpQndjbTl0YVhObFhHNGdJSDFjYmx4dUlDQm1kVzVqZEdsdmJpQnlaV0ZrUVhKeVlYbENkV1ptWlhKQmMxUmxlSFFvWW5WbUtTQjdYRzRnSUNBZ2RtRnlJSFpwWlhjZ1BTQnVaWGNnVldsdWREaEJjbkpoZVNoaWRXWXBYRzRnSUNBZ2RtRnlJR05vWVhKeklEMGdibVYzSUVGeWNtRjVLSFpwWlhjdWJHVnVaM1JvS1Z4dVhHNGdJQ0FnWm05eUlDaDJZWElnYVNBOUlEQTdJR2tnUENCMmFXVjNMbXhsYm1kMGFEc2dhU3NyS1NCN1hHNGdJQ0FnSUNCamFHRnljMXRwWFNBOUlGTjBjbWx1Wnk1bWNtOXRRMmhoY2tOdlpHVW9kbWxsZDF0cFhTbGNiaUFnSUNCOVhHNGdJQ0FnY21WMGRYSnVJR05vWVhKekxtcHZhVzRvSnljcFhHNGdJSDFjYmx4dUlDQm1kVzVqZEdsdmJpQmlkV1ptWlhKRGJHOXVaU2hpZFdZcElIdGNiaUFnSUNCcFppQW9ZblZtTG5Oc2FXTmxLU0I3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdZblZtTG5Oc2FXTmxLREFwWEc0Z0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lIWmhjaUIyYVdWM0lEMGdibVYzSUZWcGJuUTRRWEp5WVhrb1luVm1MbUo1ZEdWTVpXNW5kR2dwWEc0Z0lDQWdJQ0IyYVdWM0xuTmxkQ2h1WlhjZ1ZXbHVkRGhCY25KaGVTaGlkV1lwS1Z4dUlDQWdJQ0FnY21WMGRYSnVJSFpwWlhjdVluVm1abVZ5WEc0Z0lDQWdmVnh1SUNCOVhHNWNiaUFnWm5WdVkzUnBiMjRnUW05a2VTZ3BJSHRjYmlBZ0lDQjBhR2x6TG1KdlpIbFZjMlZrSUQwZ1ptRnNjMlZjYmx4dUlDQWdJSFJvYVhNdVgybHVhWFJDYjJSNUlEMGdablZ1WTNScGIyNG9ZbTlrZVNrZ2UxeHVJQ0FnSUNBZ2RHaHBjeTVmWW05a2VVbHVhWFFnUFNCaWIyUjVYRzRnSUNBZ0lDQnBaaUFvSVdKdlpIa3BJSHRjYmlBZ0lDQWdJQ0FnZEdocGN5NWZZbTlrZVZSbGVIUWdQU0FuSjF4dUlDQWdJQ0FnZlNCbGJITmxJR2xtSUNoMGVYQmxiMllnWW05a2VTQTlQVDBnSjNOMGNtbHVaeWNwSUh0Y2JpQWdJQ0FnSUNBZ2RHaHBjeTVmWW05a2VWUmxlSFFnUFNCaWIyUjVYRzRnSUNBZ0lDQjlJR1ZzYzJVZ2FXWWdLSE4xY0hCdmNuUXVZbXh2WWlBbUppQkNiRzlpTG5CeWIzUnZkSGx3WlM1cGMxQnliM1J2ZEhsd1pVOW1LR0p2WkhrcEtTQjdYRzRnSUNBZ0lDQWdJSFJvYVhNdVgySnZaSGxDYkc5aUlEMGdZbTlrZVZ4dUlDQWdJQ0FnZlNCbGJITmxJR2xtSUNoemRYQndiM0owTG1admNtMUVZWFJoSUNZbUlFWnZjbTFFWVhSaExuQnliM1J2ZEhsd1pTNXBjMUJ5YjNSdmRIbHdaVTltS0dKdlpIa3BLU0I3WEc0Z0lDQWdJQ0FnSUhSb2FYTXVYMkp2WkhsR2IzSnRSR0YwWVNBOUlHSnZaSGxjYmlBZ0lDQWdJSDBnWld4elpTQnBaaUFvYzNWd2NHOXlkQzV6WldGeVkyaFFZWEpoYlhNZ0ppWWdWVkpNVTJWaGNtTm9VR0Z5WVcxekxuQnliM1J2ZEhsd1pTNXBjMUJ5YjNSdmRIbHdaVTltS0dKdlpIa3BLU0I3WEc0Z0lDQWdJQ0FnSUhSb2FYTXVYMkp2WkhsVVpYaDBJRDBnWW05a2VTNTBiMU4wY21sdVp5Z3BYRzRnSUNBZ0lDQjlJR1ZzYzJVZ2FXWWdLSE4xY0hCdmNuUXVZWEp5WVhsQ2RXWm1aWElnSmlZZ2MzVndjRzl5ZEM1aWJHOWlJQ1ltSUdselJHRjBZVlpwWlhjb1ltOWtlU2twSUh0Y2JpQWdJQ0FnSUNBZ2RHaHBjeTVmWW05a2VVRnljbUY1UW5WbVptVnlJRDBnWW5WbVptVnlRMnh2Ym1Vb1ltOWtlUzVpZFdabVpYSXBYRzRnSUNBZ0lDQWdJQzh2SUVsRklERXdMVEV4SUdOaGJpZDBJR2hoYm1Sc1pTQmhJRVJoZEdGV2FXVjNJR0p2WkhrdVhHNGdJQ0FnSUNBZ0lIUm9hWE11WDJKdlpIbEpibWwwSUQwZ2JtVjNJRUpzYjJJb1czUm9hWE11WDJKdlpIbEJjbkpoZVVKMVptWmxjbDBwWEc0Z0lDQWdJQ0I5SUdWc2MyVWdhV1lnS0hOMWNIQnZjblF1WVhKeVlYbENkV1ptWlhJZ0ppWWdLRUZ5Y21GNVFuVm1abVZ5TG5CeWIzUnZkSGx3WlM1cGMxQnliM1J2ZEhsd1pVOW1LR0p2WkhrcElIeDhJR2x6UVhKeVlYbENkV1ptWlhKV2FXVjNLR0p2WkhrcEtTa2dlMXh1SUNBZ0lDQWdJQ0IwYUdsekxsOWliMlI1UVhKeVlYbENkV1ptWlhJZ1BTQmlkV1ptWlhKRGJHOXVaU2hpYjJSNUtWeHVJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ2RHaHliM2NnYm1WM0lFVnljbTl5S0NkMWJuTjFjSEJ2Y25SbFpDQkNiMlI1U1c1cGRDQjBlWEJsSnlsY2JpQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ2FXWWdLQ0YwYUdsekxtaGxZV1JsY25NdVoyVjBLQ2RqYjI1MFpXNTBMWFI1Y0dVbktTa2dlMXh1SUNBZ0lDQWdJQ0JwWmlBb2RIbHdaVzltSUdKdlpIa2dQVDA5SUNkemRISnBibWNuS1NCN1hHNGdJQ0FnSUNBZ0lDQWdkR2hwY3k1b1pXRmtaWEp6TG5ObGRDZ25ZMjl1ZEdWdWRDMTBlWEJsSnl3Z0ozUmxlSFF2Y0d4aGFXNDdZMmhoY25ObGREMVZWRVl0T0NjcFhHNGdJQ0FnSUNBZ0lIMGdaV3h6WlNCcFppQW9kR2hwY3k1ZlltOWtlVUpzYjJJZ0ppWWdkR2hwY3k1ZlltOWtlVUpzYjJJdWRIbHdaU2tnZTF4dUlDQWdJQ0FnSUNBZ0lIUm9hWE11YUdWaFpHVnljeTV6WlhRb0oyTnZiblJsYm5RdGRIbHdaU2NzSUhSb2FYTXVYMkp2WkhsQ2JHOWlMblI1Y0dVcFhHNGdJQ0FnSUNBZ0lIMGdaV3h6WlNCcFppQW9jM1Z3Y0c5eWRDNXpaV0Z5WTJoUVlYSmhiWE1nSmlZZ1ZWSk1VMlZoY21Ob1VHRnlZVzF6TG5CeWIzUnZkSGx3WlM1cGMxQnliM1J2ZEhsd1pVOW1LR0p2WkhrcEtTQjdYRzRnSUNBZ0lDQWdJQ0FnZEdocGN5NW9aV0ZrWlhKekxuTmxkQ2duWTI5dWRHVnVkQzEwZVhCbEp5d2dKMkZ3Y0d4cFkyRjBhVzl1TDNndGQzZDNMV1p2Y20wdGRYSnNaVzVqYjJSbFpEdGphR0Z5YzJWMFBWVlVSaTA0SnlsY2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUgxY2JseHVJQ0FnSUdsbUlDaHpkWEJ3YjNKMExtSnNiMklwSUh0Y2JpQWdJQ0FnSUhSb2FYTXVZbXh2WWlBOUlHWjFibU4wYVc5dUtDa2dlMXh1SUNBZ0lDQWdJQ0IyWVhJZ2NtVnFaV04wWldRZ1BTQmpiMjV6ZFcxbFpDaDBhR2x6S1Z4dUlDQWdJQ0FnSUNCcFppQW9jbVZxWldOMFpXUXBJSHRjYmlBZ0lDQWdJQ0FnSUNCeVpYUjFjbTRnY21WcVpXTjBaV1JjYmlBZ0lDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNBZ0lHbG1JQ2gwYUdsekxsOWliMlI1UW14dllpa2dlMXh1SUNBZ0lDQWdJQ0FnSUhKbGRIVnliaUJRY205dGFYTmxMbkpsYzI5c2RtVW9kR2hwY3k1ZlltOWtlVUpzYjJJcFhHNGdJQ0FnSUNBZ0lIMGdaV3h6WlNCcFppQW9kR2hwY3k1ZlltOWtlVUZ5Y21GNVFuVm1abVZ5S1NCN1hHNGdJQ0FnSUNBZ0lDQWdjbVYwZFhKdUlGQnliMjFwYzJVdWNtVnpiMngyWlNodVpYY2dRbXh2WWloYmRHaHBjeTVmWW05a2VVRnljbUY1UW5WbVptVnlYU2twWEc0Z0lDQWdJQ0FnSUgwZ1pXeHpaU0JwWmlBb2RHaHBjeTVmWW05a2VVWnZjbTFFWVhSaEtTQjdYRzRnSUNBZ0lDQWdJQ0FnZEdoeWIzY2dibVYzSUVWeWNtOXlLQ2RqYjNWc1pDQnViM1FnY21WaFpDQkdiM0p0UkdGMFlTQmliMlI1SUdGeklHSnNiMkluS1Z4dUlDQWdJQ0FnSUNCOUlHVnNjMlVnZTF4dUlDQWdJQ0FnSUNBZ0lISmxkSFZ5YmlCUWNtOXRhWE5sTG5KbGMyOXNkbVVvYm1WM0lFSnNiMklvVzNSb2FYTXVYMkp2WkhsVVpYaDBYU2twWEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ2RHaHBjeTVoY25KaGVVSjFabVpsY2lBOUlHWjFibU4wYVc5dUtDa2dlMXh1SUNBZ0lDQWdJQ0JwWmlBb2RHaHBjeTVmWW05a2VVRnljbUY1UW5WbVptVnlLU0I3WEc0Z0lDQWdJQ0FnSUNBZ2NtVjBkWEp1SUdOdmJuTjFiV1ZrS0hSb2FYTXBJSHg4SUZCeWIyMXBjMlV1Y21WemIyeDJaU2gwYUdsekxsOWliMlI1UVhKeVlYbENkV1ptWlhJcFhHNGdJQ0FnSUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNBZ0lDQWdjbVYwZFhKdUlIUm9hWE11WW14dllpZ3BMblJvWlc0b2NtVmhaRUpzYjJKQmMwRnljbUY1UW5WbVptVnlLVnh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0I5WEc0Z0lDQWdmVnh1WEc0Z0lDQWdkR2hwY3k1MFpYaDBJRDBnWm5WdVkzUnBiMjRvS1NCN1hHNGdJQ0FnSUNCMllYSWdjbVZxWldOMFpXUWdQU0JqYjI1emRXMWxaQ2gwYUdsektWeHVJQ0FnSUNBZ2FXWWdLSEpsYW1WamRHVmtLU0I3WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJ5WldwbFkzUmxaRnh1SUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0JwWmlBb2RHaHBjeTVmWW05a2VVSnNiMklwSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUhKbFlXUkNiRzlpUVhOVVpYaDBLSFJvYVhNdVgySnZaSGxDYkc5aUtWeHVJQ0FnSUNBZ2ZTQmxiSE5sSUdsbUlDaDBhR2x6TGw5aWIyUjVRWEp5WVhsQ2RXWm1aWElwSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUZCeWIyMXBjMlV1Y21WemIyeDJaU2h5WldGa1FYSnlZWGxDZFdabVpYSkJjMVJsZUhRb2RHaHBjeTVmWW05a2VVRnljbUY1UW5WbVptVnlLU2xjYmlBZ0lDQWdJSDBnWld4elpTQnBaaUFvZEdocGN5NWZZbTlrZVVadmNtMUVZWFJoS1NCN1hHNGdJQ0FnSUNBZ0lIUm9jbTkzSUc1bGR5QkZjbkp2Y2lnblkyOTFiR1FnYm05MElISmxZV1FnUm05eWJVUmhkR0VnWW05a2VTQmhjeUIwWlhoMEp5bGNiaUFnSUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCUWNtOXRhWE5sTG5KbGMyOXNkbVVvZEdocGN5NWZZbTlrZVZSbGVIUXBYRzRnSUNBZ0lDQjlYRzRnSUNBZ2ZWeHVYRzRnSUNBZ2FXWWdLSE4xY0hCdmNuUXVabTl5YlVSaGRHRXBJSHRjYmlBZ0lDQWdJSFJvYVhNdVptOXliVVJoZEdFZ1BTQm1kVzVqZEdsdmJpZ3BJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJSFJvYVhNdWRHVjRkQ2dwTG5Sb1pXNG9aR1ZqYjJSbEtWeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUgxY2JseHVJQ0FnSUhSb2FYTXVhbk52YmlBOUlHWjFibU4wYVc5dUtDa2dlMXh1SUNBZ0lDQWdjbVYwZFhKdUlIUm9hWE11ZEdWNGRDZ3BMblJvWlc0b1NsTlBUaTV3WVhKelpTbGNiaUFnSUNCOVhHNWNiaUFnSUNCeVpYUjFjbTRnZEdocGMxeHVJQ0I5WEc1Y2JpQWdMeThnU0ZSVVVDQnRaWFJvYjJSeklIZG9iM05sSUdOaGNHbDBZV3hwZW1GMGFXOXVJSE5vYjNWc1pDQmlaU0J1YjNKdFlXeHBlbVZrWEc0Z0lIWmhjaUJ0WlhSb2IyUnpJRDBnV3lkRVJVeEZWRVVuTENBblIwVlVKeXdnSjBoRlFVUW5MQ0FuVDFCVVNVOU9VeWNzSUNkUVQxTlVKeXdnSjFCVlZDZGRYRzVjYmlBZ1puVnVZM1JwYjI0Z2JtOXliV0ZzYVhwbFRXVjBhRzlrS0cxbGRHaHZaQ2tnZTF4dUlDQWdJSFpoY2lCMWNHTmhjMlZrSUQwZ2JXVjBhRzlrTG5SdlZYQndaWEpEWVhObEtDbGNiaUFnSUNCeVpYUjFjbTRnS0cxbGRHaHZaSE11YVc1a1pYaFBaaWgxY0dOaGMyVmtLU0ErSUMweEtTQS9JSFZ3WTJGelpXUWdPaUJ0WlhSb2IyUmNiaUFnZlZ4dVhHNGdJR1oxYm1OMGFXOXVJRkpsY1hWbGMzUW9hVzV3ZFhRc0lHOXdkR2x2Ym5NcElIdGNiaUFnSUNCdmNIUnBiMjV6SUQwZ2IzQjBhVzl1Y3lCOGZDQjdmVnh1SUNBZ0lIWmhjaUJpYjJSNUlEMGdiM0IwYVc5dWN5NWliMlI1WEc1Y2JpQWdJQ0JwWmlBb2FXNXdkWFFnYVc1emRHRnVZMlZ2WmlCU1pYRjFaWE4wS1NCN1hHNGdJQ0FnSUNCcFppQW9hVzV3ZFhRdVltOWtlVlZ6WldRcElIdGNiaUFnSUNBZ0lDQWdkR2h5YjNjZ2JtVjNJRlI1Y0dWRmNuSnZjaWduUVd4eVpXRmtlU0J5WldGa0p5bGNiaUFnSUNBZ0lIMWNiaUFnSUNBZ0lIUm9hWE11ZFhKc0lEMGdhVzV3ZFhRdWRYSnNYRzRnSUNBZ0lDQjBhR2x6TG1OeVpXUmxiblJwWVd4eklEMGdhVzV3ZFhRdVkzSmxaR1Z1ZEdsaGJITmNiaUFnSUNBZ0lHbG1JQ2doYjNCMGFXOXVjeTVvWldGa1pYSnpLU0I3WEc0Z0lDQWdJQ0FnSUhSb2FYTXVhR1ZoWkdWeWN5QTlJRzVsZHlCSVpXRmtaWEp6S0dsdWNIVjBMbWhsWVdSbGNuTXBYRzRnSUNBZ0lDQjlYRzRnSUNBZ0lDQjBhR2x6TG0xbGRHaHZaQ0E5SUdsdWNIVjBMbTFsZEdodlpGeHVJQ0FnSUNBZ2RHaHBjeTV0YjJSbElEMGdhVzV3ZFhRdWJXOWtaVnh1SUNBZ0lDQWdhV1lnS0NGaWIyUjVJQ1ltSUdsdWNIVjBMbDlpYjJSNVNXNXBkQ0FoUFNCdWRXeHNLU0I3WEc0Z0lDQWdJQ0FnSUdKdlpIa2dQU0JwYm5CMWRDNWZZbTlrZVVsdWFYUmNiaUFnSUNBZ0lDQWdhVzV3ZFhRdVltOWtlVlZ6WldRZ1BTQjBjblZsWEc0Z0lDQWdJQ0I5WEc0Z0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lIUm9hWE11ZFhKc0lEMGdVM1J5YVc1bktHbHVjSFYwS1Z4dUlDQWdJSDFjYmx4dUlDQWdJSFJvYVhNdVkzSmxaR1Z1ZEdsaGJITWdQU0J2Y0hScGIyNXpMbU55WldSbGJuUnBZV3h6SUh4OElIUm9hWE11WTNKbFpHVnVkR2xoYkhNZ2ZId2dKMjl0YVhRblhHNGdJQ0FnYVdZZ0tHOXdkR2x2Ym5NdWFHVmhaR1Z5Y3lCOGZDQWhkR2hwY3k1b1pXRmtaWEp6S1NCN1hHNGdJQ0FnSUNCMGFHbHpMbWhsWVdSbGNuTWdQU0J1WlhjZ1NHVmhaR1Z5Y3lodmNIUnBiMjV6TG1obFlXUmxjbk1wWEc0Z0lDQWdmVnh1SUNBZ0lIUm9hWE11YldWMGFHOWtJRDBnYm05eWJXRnNhWHBsVFdWMGFHOWtLRzl3ZEdsdmJuTXViV1YwYUc5a0lIeDhJSFJvYVhNdWJXVjBhRzlrSUh4OElDZEhSVlFuS1Z4dUlDQWdJSFJvYVhNdWJXOWtaU0E5SUc5d2RHbHZibk11Ylc5a1pTQjhmQ0IwYUdsekxtMXZaR1VnZkh3Z2JuVnNiRnh1SUNBZ0lIUm9hWE11Y21WbVpYSnlaWElnUFNCdWRXeHNYRzVjYmlBZ0lDQnBaaUFvS0hSb2FYTXViV1YwYUc5a0lEMDlQU0FuUjBWVUp5QjhmQ0IwYUdsekxtMWxkR2h2WkNBOVBUMGdKMGhGUVVRbktTQW1KaUJpYjJSNUtTQjdYRzRnSUNBZ0lDQjBhSEp2ZHlCdVpYY2dWSGx3WlVWeWNtOXlLQ2RDYjJSNUlHNXZkQ0JoYkd4dmQyVmtJR1p2Y2lCSFJWUWdiM0lnU0VWQlJDQnlaWEYxWlhOMGN5Y3BYRzRnSUNBZ2ZWeHVJQ0FnSUhSb2FYTXVYMmx1YVhSQ2IyUjVLR0p2WkhrcFhHNGdJSDFjYmx4dUlDQlNaWEYxWlhOMExuQnliM1J2ZEhsd1pTNWpiRzl1WlNBOUlHWjFibU4wYVc5dUtDa2dlMXh1SUNBZ0lISmxkSFZ5YmlCdVpYY2dVbVZ4ZFdWemRDaDBhR2x6TENCN0lHSnZaSGs2SUhSb2FYTXVYMkp2WkhsSmJtbDBJSDBwWEc0Z0lIMWNibHh1SUNCbWRXNWpkR2x2YmlCa1pXTnZaR1VvWW05a2VTa2dlMXh1SUNBZ0lIWmhjaUJtYjNKdElEMGdibVYzSUVadmNtMUVZWFJoS0NsY2JpQWdJQ0JpYjJSNUxuUnlhVzBvS1M1emNHeHBkQ2duSmljcExtWnZja1ZoWTJnb1puVnVZM1JwYjI0b1lubDBaWE1wSUh0Y2JpQWdJQ0FnSUdsbUlDaGllWFJsY3lrZ2UxeHVJQ0FnSUNBZ0lDQjJZWElnYzNCc2FYUWdQU0JpZVhSbGN5NXpjR3hwZENnblBTY3BYRzRnSUNBZ0lDQWdJSFpoY2lCdVlXMWxJRDBnYzNCc2FYUXVjMmhwWm5Rb0tTNXlaWEJzWVdObEtDOWNYQ3N2Wnl3Z0p5QW5LVnh1SUNBZ0lDQWdJQ0IyWVhJZ2RtRnNkV1VnUFNCemNHeHBkQzVxYjJsdUtDYzlKeWt1Y21Wd2JHRmpaU2d2WEZ3ckwyY3NJQ2NnSnlsY2JpQWdJQ0FnSUNBZ1ptOXliUzVoY0hCbGJtUW9aR1ZqYjJSbFZWSkpRMjl0Y0c5dVpXNTBLRzVoYldVcExDQmtaV052WkdWVlVrbERiMjF3YjI1bGJuUW9kbUZzZFdVcEtWeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUgwcFhHNGdJQ0FnY21WMGRYSnVJR1p2Y20xY2JpQWdmVnh1WEc0Z0lHWjFibU4wYVc5dUlIQmhjbk5sU0dWaFpHVnljeWh5WVhkSVpXRmtaWEp6S1NCN1hHNGdJQ0FnZG1GeUlHaGxZV1JsY25NZ1BTQnVaWGNnU0dWaFpHVnljeWdwWEc0Z0lDQWdMeThnVW1Wd2JHRmpaU0JwYm5OMFlXNWpaWE1nYjJZZ1hGeHlYRnh1SUdGdVpDQmNYRzRnWm05c2JHOTNaV1FnWW5rZ1lYUWdiR1ZoYzNRZ2IyNWxJSE53WVdObElHOXlJR2h2Y21sNmIyNTBZV3dnZEdGaUlIZHBkR2dnWVNCemNHRmpaVnh1SUNBZ0lDOHZJR2gwZEhCek9pOHZkRzl2YkhNdWFXVjBaaTV2Y21jdmFIUnRiQzl5Wm1NM01qTXdJM05sWTNScGIyNHRNeTR5WEc0Z0lDQWdkbUZ5SUhCeVpWQnliMk5sYzNObFpFaGxZV1JsY25NZ1BTQnlZWGRJWldGa1pYSnpMbkpsY0d4aFkyVW9MMXhjY2o5Y1hHNWJYRngwSUYwckwyY3NJQ2NnSnlsY2JpQWdJQ0J3Y21WUWNtOWpaWE56WldSSVpXRmtaWEp6TG5Od2JHbDBLQzljWEhJL1hGeHVMeWt1Wm05eVJXRmphQ2htZFc1amRHbHZiaWhzYVc1bEtTQjdYRzRnSUNBZ0lDQjJZWElnY0dGeWRITWdQU0JzYVc1bExuTndiR2wwS0NjNkp5bGNiaUFnSUNBZ0lIWmhjaUJyWlhrZ1BTQndZWEowY3k1emFHbG1kQ2dwTG5SeWFXMG9LVnh1SUNBZ0lDQWdhV1lnS0d0bGVTa2dlMXh1SUNBZ0lDQWdJQ0IyWVhJZ2RtRnNkV1VnUFNCd1lYSjBjeTVxYjJsdUtDYzZKeWt1ZEhKcGJTZ3BYRzRnSUNBZ0lDQWdJR2hsWVdSbGNuTXVZWEJ3Wlc1a0tHdGxlU3dnZG1Gc2RXVXBYRzRnSUNBZ0lDQjlYRzRnSUNBZ2ZTbGNiaUFnSUNCeVpYUjFjbTRnYUdWaFpHVnljMXh1SUNCOVhHNWNiaUFnUW05a2VTNWpZV3hzS0ZKbGNYVmxjM1F1Y0hKdmRHOTBlWEJsS1Z4dVhHNGdJR1oxYm1OMGFXOXVJRkpsYzNCdmJuTmxLR0p2WkhsSmJtbDBMQ0J2Y0hScGIyNXpLU0I3WEc0Z0lDQWdhV1lnS0NGdmNIUnBiMjV6S1NCN1hHNGdJQ0FnSUNCdmNIUnBiMjV6SUQwZ2UzMWNiaUFnSUNCOVhHNWNiaUFnSUNCMGFHbHpMblI1Y0dVZ1BTQW5aR1ZtWVhWc2RDZGNiaUFnSUNCMGFHbHpMbk4wWVhSMWN5QTlJRzl3ZEdsdmJuTXVjM1JoZEhWeklEMDlQU0IxYm1SbFptbHVaV1FnUHlBeU1EQWdPaUJ2Y0hScGIyNXpMbk4wWVhSMWMxeHVJQ0FnSUhSb2FYTXViMnNnUFNCMGFHbHpMbk4wWVhSMWN5QStQU0F5TURBZ0ppWWdkR2hwY3k1emRHRjBkWE1nUENBek1EQmNiaUFnSUNCMGFHbHpMbk4wWVhSMWMxUmxlSFFnUFNBbmMzUmhkSFZ6VkdWNGRDY2dhVzRnYjNCMGFXOXVjeUEvSUc5d2RHbHZibk11YzNSaGRIVnpWR1Y0ZENBNklDZFBTeWRjYmlBZ0lDQjBhR2x6TG1obFlXUmxjbk1nUFNCdVpYY2dTR1ZoWkdWeWN5aHZjSFJwYjI1ekxtaGxZV1JsY25NcFhHNGdJQ0FnZEdocGN5NTFjbXdnUFNCdmNIUnBiMjV6TG5WeWJDQjhmQ0FuSjF4dUlDQWdJSFJvYVhNdVgybHVhWFJDYjJSNUtHSnZaSGxKYm1sMEtWeHVJQ0I5WEc1Y2JpQWdRbTlrZVM1allXeHNLRkpsYzNCdmJuTmxMbkJ5YjNSdmRIbHdaU2xjYmx4dUlDQlNaWE53YjI1elpTNXdjbTkwYjNSNWNHVXVZMnh2Ym1VZ1BTQm1kVzVqZEdsdmJpZ3BJSHRjYmlBZ0lDQnlaWFIxY200Z2JtVjNJRkpsYzNCdmJuTmxLSFJvYVhNdVgySnZaSGxKYm1sMExDQjdYRzRnSUNBZ0lDQnpkR0YwZFhNNklIUm9hWE11YzNSaGRIVnpMRnh1SUNBZ0lDQWdjM1JoZEhWelZHVjRkRG9nZEdocGN5NXpkR0YwZFhOVVpYaDBMRnh1SUNBZ0lDQWdhR1ZoWkdWeWN6b2dibVYzSUVobFlXUmxjbk1vZEdocGN5NW9aV0ZrWlhKektTeGNiaUFnSUNBZ0lIVnliRG9nZEdocGN5NTFjbXhjYmlBZ0lDQjlLVnh1SUNCOVhHNWNiaUFnVW1WemNHOXVjMlV1WlhKeWIzSWdQU0JtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0IyWVhJZ2NtVnpjRzl1YzJVZ1BTQnVaWGNnVW1WemNHOXVjMlVvYm5Wc2JDd2dlM04wWVhSMWN6b2dNQ3dnYzNSaGRIVnpWR1Y0ZERvZ0p5ZDlLVnh1SUNBZ0lISmxjM0J2Ym5ObExuUjVjR1VnUFNBblpYSnliM0luWEc0Z0lDQWdjbVYwZFhKdUlISmxjM0J2Ym5ObFhHNGdJSDFjYmx4dUlDQjJZWElnY21Wa2FYSmxZM1JUZEdGMGRYTmxjeUE5SUZzek1ERXNJRE13TWl3Z016QXpMQ0F6TURjc0lETXdPRjFjYmx4dUlDQlNaWE53YjI1elpTNXlaV1JwY21WamRDQTlJR1oxYm1OMGFXOXVLSFZ5YkN3Z2MzUmhkSFZ6S1NCN1hHNGdJQ0FnYVdZZ0tISmxaR2x5WldOMFUzUmhkSFZ6WlhNdWFXNWtaWGhQWmloemRHRjBkWE1wSUQwOVBTQXRNU2tnZTF4dUlDQWdJQ0FnZEdoeWIzY2dibVYzSUZKaGJtZGxSWEp5YjNJb0owbHVkbUZzYVdRZ2MzUmhkSFZ6SUdOdlpHVW5LVnh1SUNBZ0lIMWNibHh1SUNBZ0lISmxkSFZ5YmlCdVpYY2dVbVZ6Y0c5dWMyVW9iblZzYkN3Z2UzTjBZWFIxY3pvZ2MzUmhkSFZ6TENCb1pXRmtaWEp6T2lCN2JHOWpZWFJwYjI0NklIVnliSDE5S1Z4dUlDQjlYRzVjYmlBZ2MyVnNaaTVJWldGa1pYSnpJRDBnU0dWaFpHVnljMXh1SUNCelpXeG1MbEpsY1hWbGMzUWdQU0JTWlhGMVpYTjBYRzRnSUhObGJHWXVVbVZ6Y0c5dWMyVWdQU0JTWlhOd2IyNXpaVnh1WEc0Z0lITmxiR1l1Wm1WMFkyZ2dQU0JtZFc1amRHbHZiaWhwYm5CMWRDd2dhVzVwZENrZ2UxeHVJQ0FnSUhKbGRIVnliaUJ1WlhjZ1VISnZiV2x6WlNobWRXNWpkR2x2YmloeVpYTnZiSFpsTENCeVpXcGxZM1FwSUh0Y2JpQWdJQ0FnSUhaaGNpQnlaWEYxWlhOMElEMGdibVYzSUZKbGNYVmxjM1FvYVc1d2RYUXNJR2x1YVhRcFhHNGdJQ0FnSUNCMllYSWdlR2h5SUQwZ2JtVjNJRmhOVEVoMGRIQlNaWEYxWlhOMEtDbGNibHh1SUNBZ0lDQWdlR2h5TG05dWJHOWhaQ0E5SUdaMWJtTjBhVzl1S0NrZ2UxeHVJQ0FnSUNBZ0lDQjJZWElnYjNCMGFXOXVjeUE5SUh0Y2JpQWdJQ0FnSUNBZ0lDQnpkR0YwZFhNNklIaG9jaTV6ZEdGMGRYTXNYRzRnSUNBZ0lDQWdJQ0FnYzNSaGRIVnpWR1Y0ZERvZ2VHaHlMbk4wWVhSMWMxUmxlSFFzWEc0Z0lDQWdJQ0FnSUNBZ2FHVmhaR1Z5Y3pvZ2NHRnljMlZJWldGa1pYSnpLSGhvY2k1blpYUkJiR3hTWlhOd2IyNXpaVWhsWVdSbGNuTW9LU0I4ZkNBbkp5bGNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0J2Y0hScGIyNXpMblZ5YkNBOUlDZHlaWE53YjI1elpWVlNUQ2NnYVc0Z2VHaHlJRDhnZUdoeUxuSmxjM0J2Ym5ObFZWSk1JRG9nYjNCMGFXOXVjeTVvWldGa1pYSnpMbWRsZENnbldDMVNaWEYxWlhOMExWVlNUQ2NwWEc0Z0lDQWdJQ0FnSUhaaGNpQmliMlI1SUQwZ0ozSmxjM0J2Ym5ObEp5QnBiaUI0YUhJZ1B5QjRhSEl1Y21WemNHOXVjMlVnT2lCNGFISXVjbVZ6Y0c5dWMyVlVaWGgwWEc0Z0lDQWdJQ0FnSUhKbGMyOXNkbVVvYm1WM0lGSmxjM0J2Ym5ObEtHSnZaSGtzSUc5d2RHbHZibk1wS1Z4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNCNGFISXViMjVsY25KdmNpQTlJR1oxYm1OMGFXOXVLQ2tnZTF4dUlDQWdJQ0FnSUNCeVpXcGxZM1FvYm1WM0lGUjVjR1ZGY25KdmNpZ25UbVYwZDI5eWF5QnlaWEYxWlhOMElHWmhhV3hsWkNjcEtWeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQjRhSEl1YjI1MGFXMWxiM1YwSUQwZ1puVnVZM1JwYjI0b0tTQjdYRzRnSUNBZ0lDQWdJSEpsYW1WamRDaHVaWGNnVkhsd1pVVnljbTl5S0NkT1pYUjNiM0pySUhKbGNYVmxjM1FnWm1GcGJHVmtKeWtwWEc0Z0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUhob2NpNXZjR1Z1S0hKbGNYVmxjM1F1YldWMGFHOWtMQ0J5WlhGMVpYTjBMblZ5YkN3Z2RISjFaU2xjYmx4dUlDQWdJQ0FnYVdZZ0tISmxjWFZsYzNRdVkzSmxaR1Z1ZEdsaGJITWdQVDA5SUNkcGJtTnNkV1JsSnlrZ2UxeHVJQ0FnSUNBZ0lDQjRhSEl1ZDJsMGFFTnlaV1JsYm5ScFlXeHpJRDBnZEhKMVpWeHVJQ0FnSUNBZ2ZTQmxiSE5sSUdsbUlDaHlaWEYxWlhOMExtTnlaV1JsYm5ScFlXeHpJRDA5UFNBbmIyMXBkQ2NwSUh0Y2JpQWdJQ0FnSUNBZ2VHaHlMbmRwZEdoRGNtVmtaVzUwYVdGc2N5QTlJR1poYkhObFhHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lHbG1JQ2duY21WemNHOXVjMlZVZVhCbEp5QnBiaUI0YUhJZ0ppWWdjM1Z3Y0c5eWRDNWliRzlpS1NCN1hHNGdJQ0FnSUNBZ0lIaG9jaTV5WlhOd2IyNXpaVlI1Y0dVZ1BTQW5ZbXh2WWlkY2JpQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ2NtVnhkV1Z6ZEM1b1pXRmtaWEp6TG1admNrVmhZMmdvWm5WdVkzUnBiMjRvZG1Gc2RXVXNJRzVoYldVcElIdGNiaUFnSUNBZ0lDQWdlR2h5TG5ObGRGSmxjWFZsYzNSSVpXRmtaWElvYm1GdFpTd2dkbUZzZFdVcFhHNGdJQ0FnSUNCOUtWeHVYRzRnSUNBZ0lDQjRhSEl1YzJWdVpDaDBlWEJsYjJZZ2NtVnhkV1Z6ZEM1ZlltOWtlVWx1YVhRZ1BUMDlJQ2QxYm1SbFptbHVaV1FuSUQ4Z2JuVnNiQ0E2SUhKbGNYVmxjM1F1WDJKdlpIbEpibWwwS1Z4dUlDQWdJSDBwWEc0Z0lIMWNiaUFnYzJWc1ppNW1aWFJqYUM1d2IyeDVabWxzYkNBOUlIUnlkV1ZjYm4wcEtIUjVjR1Z2WmlCelpXeG1JQ0U5UFNBbmRXNWtaV1pwYm1Wa0p5QS9JSE5sYkdZZ09pQjBhR2x6S1R0Y2JpSXNJbU52Ym5OMElHRnlkR2xqYkdWVVpXMXdiR0YwWlNBOUlHQmNibHgwUEdGeWRHbGpiR1VnWTJ4aGMzTTlYQ0poY25ScFkyeGxYMTl2ZFhSbGNsd2lQbHh1WEhSY2REeGthWFlnWTJ4aGMzTTlYQ0poY25ScFkyeGxYMTlwYm01bGNsd2lQbHh1WEhSY2RGeDBQR1JwZGlCamJHRnpjejFjSW1GeWRHbGpiR1ZmWDJobFlXUnBibWRjSWo1Y2JseDBYSFJjZEZ4MFBHRWdZMnhoYzNNOVhDSnFjeTFsYm5SeWVTMTBhWFJzWlZ3aVBqd3ZZVDVjYmx4MFhIUmNkRngwUEdneUlHTnNZWE56UFZ3aVlYSjBhV05zWlMxb1pXRmthVzVuWDE5MGFYUnNaVndpUGp3dmFESStYRzVjZEZ4MFhIUmNkRHhrYVhZZ1kyeGhjM005WENKaGNuUnBZMnhsTFdobFlXUnBibWRmWDI1aGJXVmNJajVjYmx4MFhIUmNkRngwWEhROGMzQmhiaUJqYkdGemN6MWNJbUZ5ZEdsamJHVXRhR1ZoWkdsdVoxOWZibUZ0WlMwdFptbHljM1JjSWo0OEwzTndZVzQrWEc1Y2RGeDBYSFJjZEZ4MFBHRWdZMnhoYzNNOVhDSnFjeTFsYm5SeWVTMWhjblJwYzNSY0lqNDhMMkUrWEc1Y2RGeDBYSFJjZEZ4MFBITndZVzRnWTJ4aGMzTTlYQ0poY25ScFkyeGxMV2hsWVdScGJtZGZYMjVoYldVdExXeGhjM1JjSWo0OEwzTndZVzQrWEc1Y2RGeDBYSFJjZER3dlpHbDJQbHh1WEhSY2RGeDBQQzlrYVhZK1hIUmNibHgwWEhSY2REeGthWFlnWTJ4aGMzTTlYQ0poY25ScFkyeGxYMTlwYldGblpYTXRiM1YwWlhKY0lqNWNibHgwWEhSY2RGeDBQR1JwZGlCamJHRnpjejFjSW1GeWRHbGpiR1ZmWDJsdFlXZGxjeTFwYm01bGNsd2lQand2WkdsMlBseHVYSFJjZEZ4MFhIUThjQ0JqYkdGemN6MWNJbXB6TFdGeWRHbGpiR1V0WVc1amFHOXlMWFJoY21kbGRGd2lQand2Y0Q1Y2JseDBYSFE4TDJScGRqNWNibHgwUEM5aGNuUnBZMnhsUGx4dVlEdGNibHh1Wlhod2IzSjBJR1JsWm1GMWJIUWdZWEowYVdOc1pWUmxiWEJzWVhSbE95SXNJbWx0Y0c5eWRDQW5kMmhoZEhkbkxXWmxkR05vSnp0Y2JtbHRjRzl5ZENCdVlYWk1aeUJtY205dElDY3VMMjVoZGkxc1p5YzdYRzVwYlhCdmNuUWdZWEowYVdOc1pWUmxiWEJzWVhSbElHWnliMjBnSnk0dllYSjBhV05zWlMxMFpXMXdiR0YwWlNjN1hHNWNibU52Ym5OMElFUkNJRDBnSjJoMGRIQnpPaTh2Ym1WNGRYTXRZMkYwWVd4dlp5NW1hWEpsWW1GelpXbHZMbU52YlM5d2IzTjBjeTVxYzI5dVAyRjFkR2c5TjJjM2NIbExTM2xyVGpOT05XVjNja2x0YUU5aFV6WjJkM0pHYzJNMVprdHJjbXM0WldwNlppYzdYRzVqYjI1emRDQmhiSEJvWVdKbGRDQTlJRnNuWVNjc0lDZGlKeXdnSjJNbkxDQW5aQ2NzSUNkbEp5d2dKMlluTENBblp5Y3NJQ2RvSnl3Z0oya25MQ0FuYWljc0lDZHJKeXdnSjJ3bkxDQW5iU2NzSUNkdUp5d2dKMjhuTENBbmNDY3NJQ2R5Snl3Z0ozTW5MQ0FuZENjc0lDZDFKeXdnSjNZbkxDQW5keWNzSUNkNUp5d2dKM29uWFR0Y2JseHVZMjl1YzNRZ0pHeHZZV1JwYm1jZ1BTQkJjbkpoZVM1bWNtOXRLR1J2WTNWdFpXNTBMbkYxWlhKNVUyVnNaV04wYjNKQmJHd29KeTVzYjJGa2FXNW5KeWtwTzF4dVkyOXVjM1FnSkc1aGRpQTlJR1J2WTNWdFpXNTBMbWRsZEVWc1pXMWxiblJDZVVsa0tDZHFjeTF1WVhZbktUdGNibU52Ym5OMElDUndZWEpoYkd4aGVDQTlJR1J2WTNWdFpXNTBMbkYxWlhKNVUyVnNaV04wYjNJb0p5NXdZWEpoYkd4aGVDY3BPMXh1WTI5dWMzUWdKR052Ym5SbGJuUWdQU0JrYjJOMWJXVnVkQzV4ZFdWeWVWTmxiR1ZqZEc5eUtDY3VZMjl1ZEdWdWRDY3BPMXh1WTI5dWMzUWdKSFJwZEd4bElEMGdaRzlqZFcxbGJuUXVaMlYwUld4bGJXVnVkRUo1U1dRb0oycHpMWFJwZEd4bEp5azdYRzVqYjI1emRDQWtZWEp5YjNjZ1BTQmtiMk4xYldWdWRDNXhkV1Z5ZVZObGJHVmpkRzl5S0NjdVlYSnliM2NuS1R0Y2JtTnZibk4wSUNSdGIyUmhiQ0E5SUdSdlkzVnRaVzUwTG5GMVpYSjVVMlZzWldOMGIzSW9KeTV0YjJSaGJDY3BPMXh1WTI5dWMzUWdKR3hwWjJoMFltOTRJRDBnWkc5amRXMWxiblF1Y1hWbGNubFRaV3hsWTNSdmNpZ25MbXhwWjJoMFltOTRKeWs3WEc1amIyNXpkQ0FrZG1sbGR5QTlJR1J2WTNWdFpXNTBMbkYxWlhKNVUyVnNaV04wYjNJb0p5NXNhV2RvZEdKdmVDMTJhV1YzSnlrN1hHNWNibXhsZENCemIzSjBTMlY1SUQwZ01Ec2dMeThnTUNBOUlHRnlkR2x6ZEN3Z01TQTlJSFJwZEd4bFhHNXNaWFFnWlc1MGNtbGxjeUE5SUhzZ1lubEJkWFJvYjNJNklGdGRMQ0JpZVZScGRHeGxPaUJiWFNCOU8xeHViR1YwSUdOMWNuSmxiblJNWlhSMFpYSWdQU0FuUVNjN1hHNWNibXhsZENCc2FXZG9kR0p2ZUNBOUlHWmhiSE5sTzF4dVkyOXVjM1FnWVhSMFlXTm9TVzFoWjJWTWFYTjBaVzVsY25NZ1BTQW9LU0E5UGlCN1hHNWNkR052Ym5OMElDUnBiV0ZuWlhNZ1BTQkJjbkpoZVM1bWNtOXRLR1J2WTNWdFpXNTBMbkYxWlhKNVUyVnNaV04wYjNKQmJHd29KeTVoY25ScFkyeGxMV2x0WVdkbEp5a3BPMXh1WEc1Y2RDUnBiV0ZuWlhNdVptOXlSV0ZqYUNocGJXY2dQVDRnZTF4dVhIUmNkR2x0Wnk1aFpHUkZkbVZ1ZEV4cGMzUmxibVZ5S0NkamJHbGpheWNzSUNncElEMCtJSHRjYmx4MFhIUmNkR3hsZENCemNtTWdQU0JwYldjdWMzSmpPMXh1WEhSY2RGeDBKR3hwWjJoMFltOTRMbU5zWVhOelRHbHpkQzVoWkdRb0ozTm9iM2N0YVcxbkp5azdYRzVjZEZ4MFhIUWtkbWxsZHk1elpYUkJkSFJ5YVdKMWRHVW9KM04wZVd4bEp5d2dZR0poWTJ0bmNtOTFibVF0YVcxaFoyVTZJSFZ5YkNna2UzTnlZMzBwWUNrN1hHNWNkRngwWEhSc2FXZG9kR0p2ZUNBOUlIUnlkV1U3WEc1Y2RGeDBmU2xjYmx4MGZTazdYRzVjYmx4MEpIWnBaWGN1WVdSa1JYWmxiblJNYVhOMFpXNWxjaWduWTJ4cFkyc25MQ0FvS1NBOVBpQjdYRzVjZEZ4MGFXWWdLR3hwWjJoMFltOTRLU0I3WEc1Y2RGeDBYSFFrYkdsbmFIUmliM2d1WTJ4aGMzTk1hWE4wTG5KbGJXOTJaU2duYzJodmR5MXBiV2NuS1R0Y2JseDBYSFJjZEd4cFoyaDBZbTk0SUQwZ1ptRnNjMlU3WEc1Y2RGeDBmVnh1WEhSOUtUdGNibjFjYmx4dWJHVjBJRzF2WkdGc0lEMGdabUZzYzJVN1hHNWpiMjV6ZENCaGRIUmhZMmhOYjJSaGJFeHBjM1JsYm1WeWN5QTlJQ2dwSUQwK0lIdGNibHgwWTI5dWMzUWdKR1pwYm1RZ1BTQmtiMk4xYldWdWRDNW5aWFJGYkdWdFpXNTBRbmxKWkNnbmFuTXRabWx1WkNjcE8xeHVYSFJjYmx4MEpHWnBibVF1WVdSa1JYWmxiblJNYVhOMFpXNWxjaWduWTJ4cFkyc25MQ0FvS1NBOVBpQjdYRzVjZEZ4MEpHMXZaR0ZzTG1Oc1lYTnpUR2x6ZEM1aFpHUW9KM05vYjNjbktUdGNibHgwWEhSdGIyUmhiQ0E5SUhSeWRXVTdYRzVjZEgwcE8xeHVYRzVjZENSdGIyUmhiQzVoWkdSRmRtVnVkRXhwYzNSbGJtVnlLQ2RqYkdsamF5Y3NJQ2dwSUQwK0lIdGNibHgwWEhSelpYUlVhVzFsYjNWMEtDZ3BJRDArSUh0Y2JseDBYSFJjZENSdGIyUmhiQzVqYkdGemMweHBjM1F1Y21WdGIzWmxLQ2R6YUc5M0p5azdYRzVjZEZ4MFhIUnRiMlJoYkNBOUlHWmhiSE5sTzF4dVhIUmNkSDBzSURVd01DazdYRzVjZEgwcE8xeHVYRzVjZEhkcGJtUnZkeTVoWkdSRmRtVnVkRXhwYzNSbGJtVnlLQ2RyWlhsa2IzZHVKeXdnS0NrZ1BUNGdlMXh1WEhSY2RHbG1JQ2h0YjJSaGJDa2dlMXh1WEhSY2RGeDBjMlYwVkdsdFpXOTFkQ2dvS1NBOVBpQjdYRzVjZEZ4MFhIUmNkQ1J0YjJSaGJDNWpiR0Z6YzB4cGMzUXVjbVZ0YjNabEtDZHphRzkzSnlrN1hHNWNkRngwWEhSY2RHMXZaR0ZzSUQwZ1ptRnNjMlU3WEc1Y2RGeDBYSFI5TENBMk1EQXBPMXh1WEhSY2RIMDdYRzVjZEgwcE8xeHVmVnh1WEc1amIyNXpkQ0J6WTNKdmJHeFViMVJ2Y0NBOUlDZ3BJRDArSUh0Y2JseDBiR1YwSUhSb2FXNW5JRDBnWkc5amRXMWxiblF1WjJWMFJXeGxiV1Z1ZEVKNVNXUW9KMkZ1WTJodmNpMTBZWEpuWlhRbktUdGNibHgwZEdocGJtY3VjMk55YjJ4c1NXNTBiMVpwWlhjb2UySmxhR0YyYVc5eU9pQmNJbk50YjI5MGFGd2lMQ0JpYkc5amF6b2dYQ0p6ZEdGeWRGd2lmU2s3WEc1OVhHNWNibXhsZENCd2NtVjJPMXh1YkdWMElHTjFjbkpsYm5RZ1BTQXdPMXh1YkdWMElHbHpVMmh2ZDJsdVp5QTlJR1poYkhObE8xeHVZMjl1YzNRZ1lYUjBZV05vUVhKeWIzZE1hWE4wWlc1bGNuTWdQU0FvS1NBOVBpQjdYRzVjZENSaGNuSnZkeTVoWkdSRmRtVnVkRXhwYzNSbGJtVnlLQ2RqYkdsamF5Y3NJQ2dwSUQwK0lIdGNibHgwWEhSelkzSnZiR3hVYjFSdmNDZ3BPMXh1WEhSOUtUdGNibHh1WEhRa2NHRnlZV3hzWVhndVlXUmtSWFpsYm5STWFYTjBaVzVsY2lnbmMyTnliMnhzSnl3Z0tDa2dQVDRnZTF4dVhHNWNkRngwYkdWMElIa2dQU0FrZEdsMGJHVXVaMlYwUW05MWJtUnBibWREYkdsbGJuUlNaV04wS0NrdWVUdGNibHgwWEhScFppQW9ZM1Z5Y21WdWRDQWhQVDBnZVNrZ2UxeHVYSFJjZEZ4MGNISmxkaUE5SUdOMWNuSmxiblE3WEc1Y2RGeDBYSFJqZFhKeVpXNTBJRDBnZVR0Y2JseDBYSFI5WEc1Y2JseDBYSFJwWmlBb2VTQThQU0F0TlRBZ0ppWWdJV2x6VTJodmQybHVaeWtnZTF4dVhIUmNkRngwSkdGeWNtOTNMbU5zWVhOelRHbHpkQzVoWkdRb0ozTm9iM2NuS1R0Y2JseDBYSFJjZEdselUyaHZkMmx1WnlBOUlIUnlkV1U3WEc1Y2RGeDBmU0JsYkhObElHbG1JQ2g1SUQ0Z0xUVXdJQ1ltSUdselUyaHZkMmx1WnlrZ2UxeHVYSFJjZEZ4MEpHRnljbTkzTG1Oc1lYTnpUR2x6ZEM1eVpXMXZkbVVvSjNOb2IzY25LVHRjYmx4MFhIUmNkR2x6VTJodmQybHVaeUE5SUdaaGJITmxPMXh1WEhSY2RIMWNibHgwZlNrN1hHNTlPMXh1WEc1amIyNXpkQ0JoWkdSVGIzSjBRblYwZEc5dVRHbHpkR1Z1WlhKeklEMGdLQ2tnUFQ0Z2UxeHVYSFJzWlhRZ0pHSjVRWEowYVhOMElEMGdaRzlqZFcxbGJuUXVaMlYwUld4bGJXVnVkRUo1U1dRb0oycHpMV0o1TFdGeWRHbHpkQ2NwTzF4dVhIUnNaWFFnSkdKNVZHbDBiR1VnUFNCa2IyTjFiV1Z1ZEM1blpYUkZiR1Z0Wlc1MFFubEpaQ2duYW5NdFlua3RkR2wwYkdVbktUdGNibHgwSkdKNVFYSjBhWE4wTG1Ga1pFVjJaVzUwVEdsemRHVnVaWElvSjJOc2FXTnJKeXdnS0NrZ1BUNGdlMXh1WEhSY2RHbG1JQ2h6YjNKMFMyVjVLU0I3WEc1Y2RGeDBYSFJ6WTNKdmJHeFViMVJ2Y0NncE8xeHVYSFJjZEZ4MGMyOXlkRXRsZVNBOUlEQTdYRzVjZEZ4MFhIUWtZbmxCY25ScGMzUXVZMnhoYzNOTWFYTjBMbUZrWkNnbllXTjBhWFpsSnlrN1hHNWNkRngwWEhRa1lubFVhWFJzWlM1amJHRnpjMHhwYzNRdWNtVnRiM1psS0NkaFkzUnBkbVVuS1R0Y2JseHVYSFJjZEZ4MGNtVnVaR1Z5Ulc1MGNtbGxjeWdwTzF4dVhIUmNkSDFjYmx4MGZTazdYRzVjYmx4MEpHSjVWR2wwYkdVdVlXUmtSWFpsYm5STWFYTjBaVzVsY2lnblkyeHBZMnNuTENBb0tTQTlQaUI3WEc1Y2RGeDBhV1lnS0NGemIzSjBTMlY1S1NCN1hHNWNkRngwWEhSelkzSnZiR3hVYjFSdmNDZ3BPMXh1WEhSY2RGeDBjMjl5ZEV0bGVTQTlJREU3WEc1Y2RGeDBYSFFrWW5sVWFYUnNaUzVqYkdGemMweHBjM1F1WVdSa0tDZGhZM1JwZG1VbktUdGNibHgwWEhSY2RDUmllVUZ5ZEdsemRDNWpiR0Z6YzB4cGMzUXVjbVZ0YjNabEtDZGhZM1JwZG1VbktUdGNibHh1WEhSY2RGeDBjbVZ1WkdWeVJXNTBjbWxsY3lncE8xeHVYSFJjZEgxY2JseDBmU2s3WEc1OU8xeHVYRzVqYjI1emRDQmpiR1ZoY2tGdVkyaHZjbk1nUFNBb2NISmxkbE5sYkdWamRHOXlLU0E5UGlCN1hHNWNkR3hsZENBa1pXNTBjbWxsY3lBOUlFRnljbUY1TG1aeWIyMG9aRzlqZFcxbGJuUXVjWFZsY25sVFpXeGxZM1J2Y2tGc2JDaHdjbVYyVTJWc1pXTjBiM0lwS1R0Y2JseDBKR1Z1ZEhKcFpYTXVabTl5UldGamFDaGxiblJ5ZVNBOVBpQmxiblJ5ZVM1eVpXMXZkbVZCZEhSeWFXSjFkR1VvSjI1aGJXVW5LU2s3WEc1OU8xeHVYRzVqYjI1emRDQm1hVzVrUm1seWMzUkZiblJ5ZVNBOUlDaGphR0Z5S1NBOVBpQjdYRzVjZEd4bGRDQnpaV3hsWTNSdmNpQTlJSE52Y25STFpYa2dQeUFuTG1wekxXVnVkSEo1TFhScGRHeGxKeUE2SUNjdWFuTXRaVzUwY25rdFlYSjBhWE4wSnp0Y2JseDBiR1YwSUhCeVpYWlRaV3hsWTNSdmNpQTlJQ0Z6YjNKMFMyVjVJRDhnSnk1cWN5MWxiblJ5ZVMxMGFYUnNaU2NnT2lBbkxtcHpMV1Z1ZEhKNUxXRnlkR2x6ZENjN1hHNWNkR3hsZENBa1pXNTBjbWxsY3lBOUlFRnljbUY1TG1aeWIyMG9aRzlqZFcxbGJuUXVjWFZsY25sVFpXeGxZM1J2Y2tGc2JDaHpaV3hsWTNSdmNpa3BPMXh1WEc1Y2RHTnNaV0Z5UVc1amFHOXljeWh3Y21WMlUyVnNaV04wYjNJcE8xeHVYRzVjZEhKbGRIVnliaUFrWlc1MGNtbGxjeTVtYVc1a0tHVnVkSEo1SUQwK0lIdGNibHgwWEhSc1pYUWdibTlrWlNBOUlHVnVkSEo1TG01bGVIUkZiR1Z0Wlc1MFUybGliR2x1Wnp0Y2JseDBYSFJ5WlhSMWNtNGdibTlrWlM1cGJtNWxja2hVVFV4Yk1GMGdQVDA5SUdOb1lYSWdmSHdnYm05a1pTNXBibTVsY2toVVRVeGJNRjBnUFQwOUlHTm9ZWEl1ZEc5VmNIQmxja05oYzJVb0tUdGNibHgwZlNrN1hHNTlPMXh1WEc1amIyNXpkQ0JoZEhSaFkyaEJibU5vYjNKTWFYTjBaVzVsY2lBOUlDZ2tZVzVqYUc5eUxDQnNaWFIwWlhJcElEMCtJSHRjYmx4dVhIUWtZVzVqYUc5eUxtRmtaRVYyWlc1MFRHbHpkR1Z1WlhJb0oyTnNhV05ySnl3Z0tDa2dQVDRnZTF4dVhIUmNkR052Ym5OMElHeGxkSFJsY2s1dlpHVWdQU0JrYjJOMWJXVnVkQzVuWlhSRmJHVnRaVzUwUW5sSlpDaHNaWFIwWlhJcE8xeHVYSFJjZEd4bGRDQjBZWEpuWlhRN1hHNWNibHgwWEhScFppQW9JWE52Y25STFpYa3BJSHRjYmx4MFhIUmNkSFJoY21kbGRDQTlJR3hsZEhSbGNpQTlQVDBnSjJFbklEOGdaRzlqZFcxbGJuUXVaMlYwUld4bGJXVnVkRUo1U1dRb0oyRnVZMmh2Y2kxMFlYSm5aWFFuS1NBNklHeGxkSFJsY2s1dlpHVXVjR0Z5Wlc1MFJXeGxiV1Z1ZEM1d1lYSmxiblJGYkdWdFpXNTBMbkJoY21WdWRFVnNaVzFsYm5RdWNHRnlaVzUwUld4bGJXVnVkQzV3Y21WMmFXOTFjMFZzWlcxbGJuUlRhV0pzYVc1bkxuRjFaWEo1VTJWc1pXTjBiM0lvSnk1cWN5MWhjblJwWTJ4bExXRnVZMmh2Y2kxMFlYSm5aWFFuS1R0Y2JseDBYSFI5SUdWc2MyVWdlMXh1WEhSY2RGeDBkR0Z5WjJWMElEMGdiR1YwZEdWeUlEMDlQU0FuWVNjZ1B5QmtiMk4xYldWdWRDNW5aWFJGYkdWdFpXNTBRbmxKWkNnbllXNWphRzl5TFhSaGNtZGxkQ2NwSURvZ2JHVjBkR1Z5VG05a1pTNXdZWEpsYm5SRmJHVnRaVzUwTG5CaGNtVnVkRVZzWlcxbGJuUXVjR0Z5Wlc1MFJXeGxiV1Z1ZEM1d2NtVjJhVzkxYzBWc1pXMWxiblJUYVdKc2FXNW5MbkYxWlhKNVUyVnNaV04wYjNJb0p5NXFjeTFoY25ScFkyeGxMV0Z1WTJodmNpMTBZWEpuWlhRbktUdGNibHgwWEhSOU8xeHVYRzVjZEZ4MGRHRnlaMlYwTG5OamNtOXNiRWx1ZEc5V2FXVjNLSHRpWldoaGRtbHZjam9nWENKemJXOXZkR2hjSWl3Z1lteHZZMnM2SUZ3aWMzUmhjblJjSW4wcE8xeHVYSFI5S1R0Y2JuMDdYRzVjYm1OdmJuTjBJRzFoYTJWQmJIQm9ZV0psZENBOUlDZ3BJRDArSUh0Y2JseDBiR1YwSUdGamRHbDJaVVZ1ZEhKcFpYTWdQU0I3ZlR0Y2JseDBiR1YwSUNSdmRYUmxjaUE5SUdSdlkzVnRaVzUwTG5GMVpYSjVVMlZzWldOMGIzSW9KeTVoYkhCb1lXSmxkRjlmYkdWMGRHVnljeWNwTzF4dVhIUWtiM1YwWlhJdWFXNXVaWEpJVkUxTUlEMGdKeWM3WEc1Y2JseDBZV3h3YUdGaVpYUXVabTl5UldGamFDaHNaWFIwWlhJZ1BUNGdlMXh1WEhSY2RHeGxkQ0FrWm1seWMzUkZiblJ5ZVNBOUlHWnBibVJHYVhKemRFVnVkSEo1S0d4bGRIUmxjaWs3WEc1Y2RGeDBiR1YwSUNSaGJtTm9iM0lnUFNCa2IyTjFiV1Z1ZEM1amNtVmhkR1ZGYkdWdFpXNTBLQ2RoSnlrN1hHNWNibHgwWEhScFppQW9JU1JtYVhKemRFVnVkSEo1S1NCeVpYUjFjbTQ3WEc1Y2JseDBYSFFrWm1seWMzUkZiblJ5ZVM1cFpDQTlJR3hsZEhSbGNqdGNibHgwWEhRa1lXNWphRzl5TG1sdWJtVnlTRlJOVENBOUlHeGxkSFJsY2k1MGIxVndjR1Z5UTJGelpTZ3BPMXh1WEhSY2RDUmhibU5vYjNJdVkyeGhjM05PWVcxbElEMGdKMkZzY0doaFltVjBYMTlzWlhSMFpYSXRZVzVqYUc5eUp6dGNibHh1WEhSY2RHRjBkR0ZqYUVGdVkyaHZja3hwYzNSbGJtVnlLQ1JoYm1Ob2IzSXNJR3hsZEhSbGNpazdYRzVjZEZ4MEpHOTFkR1Z5TG1Gd2NHVnVaQ2drWVc1amFHOXlLVHRjYmx4MGZTazdYRzU5TzF4dVhHNWpiMjV6ZENCeVpXNWtaWEpKYldGblpYTWdQU0FvYVcxaFoyVnpMQ0FrYVcxaFoyVnpLU0E5UGlCN1hHNWNkR2x0WVdkbGN5NW1iM0pGWVdOb0tHbHRZV2RsSUQwK0lIdGNibHgwWEhSamIyNXpkQ0J6Y21NZ1BTQmdMaTR2TGk0dllYTnpaWFJ6TDJsdFlXZGxjeThrZTJsdFlXZGxmV0E3WEc1Y2RGeDBiR1YwSUNScGJXY2dQU0JrYjJOMWJXVnVkQzVqY21WaGRHVkZiR1Z0Wlc1MEtDZEpUVWNuS1R0Y2JseDBYSFFrYVcxbkxtTnNZWE56VG1GdFpTQTlJQ2RoY25ScFkyeGxMV2x0WVdkbEp6dGNibHgwWEhRa2FXMW5Mbk55WXlBOUlITnlZenRjYmx4MFhIUWthVzFoWjJWekxtRndjR1Z1WkNna2FXMW5LVHRjYmx4MGZTbGNibjA3WEc1Y2JtTnZibk4wSUhKbGJtUmxja1Z1ZEhKcFpYTWdQU0FvS1NBOVBpQjdYRzVjZEd4bGRDQWtZWEowYVdOc1pVeHBjM1FnUFNCa2IyTjFiV1Z1ZEM1blpYUkZiR1Z0Wlc1MFFubEpaQ2duYW5NdGJHbHpkQ2NwTzF4dVhIUnNaWFFnWlc1MGNtbGxjMHhwYzNRZ1BTQnpiM0owUzJWNUlEOGdaVzUwY21sbGN5NWllVlJwZEd4bElEb2daVzUwY21sbGN5NWllVUYxZEdodmNqdGNibHh1WEhRa1lYSjBhV05zWlV4cGMzUXVhVzV1WlhKSVZFMU1JRDBnSnljN1hHNWNibHgwWlc1MGNtbGxjMHhwYzNRdVptOXlSV0ZqYUNobGJuUnllU0E5UGlCN1hHNWNkRngwYkdWMElIc2dkR2wwYkdVc0lHeGhjM1JPWVcxbExDQm1hWEp6ZEU1aGJXVXNJR2x0WVdkbGN5d2daR1Z6WTNKcGNIUnBiMjRzSUdSbGRHRnBiQ0I5SUQwZ1pXNTBjbms3WEc1Y2JseDBYSFFrWVhKMGFXTnNaVXhwYzNRdWFXNXpaWEowUVdScVlXTmxiblJJVkUxTUtDZGlaV1p2Y21WbGJtUW5MQ0JoY25ScFkyeGxWR1Z0Y0d4aGRHVXBPMXh1WEc1Y2RGeDBiR1YwSUNScGJXRm5aWE5PYjJSbGN5QTlJR1J2WTNWdFpXNTBMbkYxWlhKNVUyVnNaV04wYjNKQmJHd29KeTVoY25ScFkyeGxYMTlwYldGblpYTXRhVzV1WlhJbktUdGNibHgwWEhSc1pYUWdKR2x0WVdkbGN5QTlJQ1JwYldGblpYTk9iMlJsYzFza2FXMWhaMlZ6VG05a1pYTXViR1Z1WjNSb0lDMGdNVjA3WEc1Y2JseDBYSFJwWmlBb2FXMWhaMlZ6TG14bGJtZDBhQ2tnY21WdVpHVnlTVzFoWjJWektHbHRZV2RsY3l3Z0pHbHRZV2RsY3lrN1hHNWNkRngwWEc1Y2RGeDBiR1YwSUNSa1pYTmpjbWx3ZEdsdmJrOTFkR1Z5SUQwZ1pHOWpkVzFsYm5RdVkzSmxZWFJsUld4bGJXVnVkQ2duWkdsMkp5azdYRzVjZEZ4MGJHVjBJQ1JrWlhOamNtbHdkR2x2Yms1dlpHVWdQU0JrYjJOMWJXVnVkQzVqY21WaGRHVkZiR1Z0Wlc1MEtDZHdKeWs3WEc1Y2RGeDBiR1YwSUNSa1pYUmhhV3hPYjJSbElEMGdaRzlqZFcxbGJuUXVZM0psWVhSbFJXeGxiV1Z1ZENnbmNDY3BPMXh1WEhSY2RDUmtaWE5qY21sd2RHbHZiazkxZEdWeUxtTnNZWE56VEdsemRDNWhaR1FvSjJGeWRHbGpiR1V0WkdWelkzSnBjSFJwYjI1ZlgyOTFkR1Z5SnlrN1hHNWNkRngwSkdSbGMyTnlhWEIwYVc5dVRtOWtaUzVqYkdGemMweHBjM1F1WVdSa0tDZGhjblJwWTJ4bExXUmxjMk55YVhCMGFXOXVKeWs3WEc1Y2RGeDBKR1JsZEdGcGJFNXZaR1V1WTJ4aGMzTk1hWE4wTG1Ga1pDZ25ZWEowYVdOc1pTMWtaWFJoYVd3bktUdGNibHh1WEhSY2RDUmtaWE5qY21sd2RHbHZiazV2WkdVdWFXNXVaWEpJVkUxTUlEMGdaR1Z6WTNKcGNIUnBiMjQ3WEc1Y2RGeDBKR1JsZEdGcGJFNXZaR1V1YVc1dVpYSklWRTFNSUQwZ1pHVjBZV2xzTzF4dVhHNWNkRngwSkdSbGMyTnlhWEIwYVc5dVQzVjBaWEl1WVhCd1pXNWtLQ1JrWlhOamNtbHdkR2x2Yms1dlpHVXNJQ1JrWlhSaGFXeE9iMlJsS1R0Y2JseDBYSFFrYVcxaFoyVnpMbUZ3Y0dWdVpDZ2taR1Z6WTNKcGNIUnBiMjVQZFhSbGNpazdYRzVjYmx4MFhIUnNaWFFnSkhScGRHeGxUbTlrWlhNZ1BTQmtiMk4xYldWdWRDNXhkV1Z5ZVZObGJHVmpkRzl5UVd4c0tDY3VZWEowYVdOc1pTMW9aV0ZrYVc1blgxOTBhWFJzWlNjcE8xeHVYSFJjZEd4bGRDQWtkR2wwYkdVZ1BTQWtkR2wwYkdWT2IyUmxjMXNrZEdsMGJHVk9iMlJsY3k1c1pXNW5kR2dnTFNBeFhUdGNibHh1WEhSY2RHeGxkQ0FrWm1seWMzUk9iMlJsY3lBOUlHUnZZM1Z0Wlc1MExuRjFaWEo1VTJWc1pXTjBiM0pCYkd3b0p5NWhjblJwWTJ4bExXaGxZV1JwYm1kZlgyNWhiV1V0TFdacGNuTjBKeWs3WEc1Y2RGeDBiR1YwSUNSbWFYSnpkQ0E5SUNSbWFYSnpkRTV2WkdWeld5Um1hWEp6ZEU1dlpHVnpMbXhsYm1kMGFDQXRJREZkTzF4dVhHNWNkRngwYkdWMElDUnNZWE4wVG05a1pYTWdQU0JrYjJOMWJXVnVkQzV4ZFdWeWVWTmxiR1ZqZEc5eVFXeHNLQ2N1WVhKMGFXTnNaUzFvWldGa2FXNW5YMTl1WVcxbExTMXNZWE4wSnlrN1hHNWNkRngwYkdWMElDUnNZWE4wSUQwZ0pHeGhjM1JPYjJSbGMxc2tiR0Z6ZEU1dlpHVnpMbXhsYm1kMGFDQXRJREZkTzF4dVhHNWNkRngwSkhScGRHeGxMbWx1Ym1WeVNGUk5UQ0E5SUhScGRHeGxPMXh1WEhSY2RDUm1hWEp6ZEM1cGJtNWxja2hVVFV3Z1BTQm1hWEp6ZEU1aGJXVTdYRzVjZEZ4MEpHeGhjM1F1YVc1dVpYSklWRTFNSUQwZ2JHRnpkRTVoYldVN1hHNWNibHgwZlNrN1hHNWNibHgwYldGclpVRnNjR2hoWW1WMEtDazdYRzU5TzF4dVhHNWpiMjV6ZENCemIzSjBRbmxVYVhSc1pTQTlJQ2dwSUQwK0lIdGNibHgwWlc1MGNtbGxjeTVpZVZScGRHeGxMbk52Y25Rb0tHRXNJR0lwSUQwK0lIdGNibHgwWEhSc1pYUWdZVlJwZEd4bElEMGdZUzUwYVhSc1pWc3dYUzUwYjFWd2NHVnlRMkZ6WlNncE8xeHVYSFJjZEd4bGRDQmlWR2wwYkdVZ1BTQmlMblJwZEd4bFd6QmRMblJ2VlhCd1pYSkRZWE5sS0NrN1hHNWNkRngwYVdZZ0tHRlVhWFJzWlNBK0lHSlVhWFJzWlNrZ2NtVjBkWEp1SURFN1hHNWNkRngwWld4elpTQnBaaUFvWVZScGRHeGxJRHdnWWxScGRHeGxLU0J5WlhSMWNtNGdMVEU3WEc1Y2RGeDBaV3h6WlNCeVpYUjFjbTRnTUR0Y2JseDBmU2s3WEc1OU8xeHVYRzVqYjI1emRDQnpaWFJFWVhSaElEMGdLR1JoZEdFcElEMCtJSHRjYmx4MFpXNTBjbWxsY3k1aWVVRjFkR2h2Y2lBOUlHUmhkR0U3WEc1Y2RHVnVkSEpwWlhNdVlubFVhWFJzWlNBOUlHUmhkR0V1YzJ4cFkyVW9LVHRjYmx4MGMyOXlkRUo1VkdsMGJHVW9LVHRjYmx4MGNtVnVaR1Z5Ulc1MGNtbGxjeWdwTzF4dWZWeHVYRzVqYjI1emRDQm1aWFJqYUVSaGRHRWdQU0FvS1NBOVBpQjdYRzVjYmx4MFhIUm1aWFJqYUNoRVFpa3VkR2hsYmloeVpYTWdQVDVjYmx4MFhIUmNkSEpsY3k1cWMyOXVLQ2xjYmx4MFhIUXBMblJvWlc0b1pHRjBZU0E5UGlCN1hHNWNkRngwWEhSelpYUkVZWFJoS0dSaGRHRXBPMXh1WEhSY2RIMHBYRzVjZEZ4MExuUm9aVzRvS0NrZ1BUNGdlMXh1WEhSY2RGeDBZWFIwWVdOb1NXMWhaMlZNYVhOMFpXNWxjbk1vS1R0Y2JseDBYSFJjZENSc2IyRmthVzVuTG1admNrVmhZMmdvWld4bGJTQTlQaUJsYkdWdExtTnNZWE56VEdsemRDNWhaR1FvSjNKbFlXUjVKeWtwTzF4dVhIUmNkRngwSkc1aGRpNWpiR0Z6YzB4cGMzUXVZV1JrS0NkeVpXRmtlU2NwTzF4dVhIUmNkSDBwWEc1Y2RGeDBMbU5oZEdOb0tHVnljaUE5UGlCamIyNXpiMnhsTG5kaGNtNG9aWEp5S1NrN1hHNTlPMXh1WEc1amIyNXpkQ0JwYm1sMElEMGdLQ2tnUFQ0Z2UxeHVYSFJtWlhSamFFUmhkR0VvS1R0Y2JseDBibUYyVEdjb0tUdGNibHgwY21WdVpHVnlSVzUwY21sbGN5Z3BPMXh1WEhSaFpHUlRiM0owUW5WMGRHOXVUR2x6ZEdWdVpYSnpLQ2s3WEc1Y2RHRjBkR0ZqYUVGeWNtOTNUR2x6ZEdWdVpYSnpLQ2s3WEc1Y2RHRjBkR0ZqYUUxdlpHRnNUR2x6ZEdWdVpYSnpLQ2s3WEc1OVhHNWNibWx1YVhRb0tUdGNiaUlzSW1OdmJuTjBJSFJsYlhCc1lYUmxJRDBnWEc1Y2RHQThaR2wySUdOc1lYTnpQVndpYm1GMlgxOXBibTVsY2x3aVBseHVYSFJjZER4a2FYWWdZMnhoYzNNOVhDSnVZWFpmWDNOdmNuUXRZbmxjSWo1Y2JseDBYSFJjZER4emNHRnVJR05zWVhOelBWd2ljMjl5ZEMxaWVWOWZkR2wwYkdWY0lqNVRiM0owSUdKNVBDOXpjR0Z1UGx4dVhIUmNkRngwUEdKMWRIUnZiaUJqYkdGemN6MWNJbk52Y25RdFlubGZYMko1TFdGeWRHbHpkQ0JoWTNScGRtVmNJaUJwWkQxY0ltcHpMV0o1TFdGeWRHbHpkRndpUGtGeWRHbHpkRHd2WW5WMGRHOXVQbHh1WEhSY2RGeDBQSE53WVc0Z1kyeGhjM005WENKemIzSjBMV0o1WDE5a2FYWnBaR1Z5WENJK0lId2dQQzl6Y0dGdVBseHVYSFJjZEZ4MFBHSjFkSFJ2YmlCamJHRnpjejFjSW5OdmNuUXRZbmxmWDJKNUxYUnBkR3hsWENJZ2FXUTlYQ0pxY3kxaWVTMTBhWFJzWlZ3aVBsUnBkR3hsUEM5aWRYUjBiMjQrWEc1Y2RGeDBYSFE4YzNCaGJpQmpiR0Z6Y3oxY0luTnZjblF0WW5sZlgyUnBkbWxrWlhJZ1ptbHVaRndpUGlCOElEd3ZjM0JoYmo1Y2JseDBYSFJjZER4emNHRnVJR05zWVhOelBWd2labWx1WkZ3aUlHbGtQVndpYW5NdFptbHVaRndpUGlZak9EazRORHRHUEM5emNHRnVQbHh1WEhSY2REd3ZaR2wyUGx4dVhIUmNkRHhrYVhZZ1kyeGhjM005WENKdVlYWmZYMkZzY0doaFltVjBYQ0krWEc1Y2RGeDBYSFE4YzNCaGJpQmpiR0Z6Y3oxY0ltRnNjR2hoWW1WMFgxOTBhWFJzWlZ3aVBrZHZJSFJ2UEM5emNHRnVQbHh1WEhSY2RGeDBQR1JwZGlCamJHRnpjejFjSW1Gc2NHaGhZbVYwWDE5c1pYUjBaWEp6WENJK1BDOWthWFkrWEc1Y2RGeDBQQzlrYVhZK1hHNWNkRHd2WkdsMlBtQTdYRzVjYm1OdmJuTjBJRzVoZGt4bklEMGdLQ2tnUFQ0Z2UxeHVYSFJzWlhRZ2JtRjJUM1YwWlhJZ1BTQmtiMk4xYldWdWRDNW5aWFJGYkdWdFpXNTBRbmxKWkNnbmFuTXRibUYySnlrN1hHNWNkRzVoZGs5MWRHVnlMbWx1Ym1WeVNGUk5UQ0E5SUhSbGJYQnNZWFJsTzF4dWZUdGNibHh1Wlhod2IzSjBJR1JsWm1GMWJIUWdibUYyVEdjN0lsMTkifQ==
