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
			if (!lightbox) {
				var src = img.src;
				$lightbox.classList.add('show-img');
				$view.setAttribute('style', 'background-image: url(' + src + ')');
				lightbox = true;
			}
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvd2hhdHdnLWZldGNoL2ZldGNoLmpzIiwic3JjL2pzL2FydGljbGUtdGVtcGxhdGUuanMiLCJzcmMvanMvaW5kZXguanMiLCJzcmMvanMvbmF2LWxnLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7OztBQ2xkQSxJQUFNLGlwQkFBTjs7a0JBbUJlLGU7Ozs7O0FDbkJmOztBQUNBOzs7O0FBQ0E7Ozs7OztBQUVBLElBQU0sS0FBSywrRkFBWDtBQUNBLElBQU0sV0FBVyxDQUFDLEdBQUQsRUFBTSxHQUFOLEVBQVcsR0FBWCxFQUFnQixHQUFoQixFQUFxQixHQUFyQixFQUEwQixHQUExQixFQUEr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e2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCIoZnVuY3Rpb24oc2VsZikge1xuICAndXNlIHN0cmljdCc7XG5cbiAgaWYgKHNlbGYuZmV0Y2gpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIHZhciBzdXBwb3J0ID0ge1xuICAgIHNlYXJjaFBhcmFtczogJ1VSTFNlYXJjaFBhcmFtcycgaW4gc2VsZixcbiAgICBpdGVyYWJsZTogJ1N5bWJvbCcgaW4gc2VsZiAmJiAnaXRlcmF0b3InIGluIFN5bWJvbCxcbiAgICBibG9iOiAnRmlsZVJlYWRlcicgaW4gc2VsZiAmJiAnQmxvYicgaW4gc2VsZiAmJiAoZnVuY3Rpb24oKSB7XG4gICAgICB0cnkge1xuICAgICAgICBuZXcgQmxvYigpXG4gICAgICAgIHJldHVybiB0cnVlXG4gICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICB9XG4gICAgfSkoKSxcbiAgICBmb3JtRGF0YTogJ0Zvcm1EYXRhJyBpbiBzZWxmLFxuICAgIGFycmF5QnVmZmVyOiAnQXJyYXlCdWZmZXInIGluIHNlbGZcbiAgfVxuXG4gIGlmIChzdXBwb3J0LmFycmF5QnVmZmVyKSB7XG4gICAgdmFyIHZpZXdDbGFzc2VzID0gW1xuICAgICAgJ1tvYmplY3QgSW50OEFycmF5XScsXG4gICAgICAnW29iamVjdCBVaW50OEFycmF5XScsXG4gICAgICAnW29iamVjdCBVaW50OENsYW1wZWRBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgSW50MTZBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgVWludDE2QXJyYXldJyxcbiAgICAgICdbb2JqZWN0IEludDMyQXJyYXldJyxcbiAgICAgICdbb2JqZWN0IFVpbnQzMkFycmF5XScsXG4gICAgICAnW29iamVjdCBGbG9hdDMyQXJyYXldJyxcbiAgICAgICdbb2JqZWN0IEZsb2F0NjRBcnJheV0nXG4gICAgXVxuXG4gICAgdmFyIGlzRGF0YVZpZXcgPSBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiBvYmogJiYgRGF0YVZpZXcucHJvdG90eXBlLmlzUHJvdG90eXBlT2Yob2JqKVxuICAgIH1cblxuICAgIHZhciBpc0FycmF5QnVmZmVyVmlldyA9IEFycmF5QnVmZmVyLmlzVmlldyB8fCBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiBvYmogJiYgdmlld0NsYXNzZXMuaW5kZXhPZihPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKSkgPiAtMVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIG5vcm1hbGl6ZU5hbWUobmFtZSkge1xuICAgIGlmICh0eXBlb2YgbmFtZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIG5hbWUgPSBTdHJpbmcobmFtZSlcbiAgICB9XG4gICAgaWYgKC9bXmEtejAtOVxcLSMkJSYnKisuXFxeX2B8fl0vaS50ZXN0KG5hbWUpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIGNoYXJhY3RlciBpbiBoZWFkZXIgZmllbGQgbmFtZScpXG4gICAgfVxuICAgIHJldHVybiBuYW1lLnRvTG93ZXJDYXNlKClcbiAgfVxuXG4gIGZ1bmN0aW9uIG5vcm1hbGl6ZVZhbHVlKHZhbHVlKSB7XG4gICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHZhbHVlID0gU3RyaW5nKHZhbHVlKVxuICAgIH1cbiAgICByZXR1cm4gdmFsdWVcbiAgfVxuXG4gIC8vIEJ1aWxkIGEgZGVzdHJ1Y3RpdmUgaXRlcmF0b3IgZm9yIHRoZSB2YWx1ZSBsaXN0XG4gIGZ1bmN0aW9uIGl0ZXJhdG9yRm9yKGl0ZW1zKSB7XG4gICAgdmFyIGl0ZXJhdG9yID0ge1xuICAgICAgbmV4dDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IGl0ZW1zLnNoaWZ0KClcbiAgICAgICAgcmV0dXJuIHtkb25lOiB2YWx1ZSA9PT0gdW5kZWZpbmVkLCB2YWx1ZTogdmFsdWV9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHN1cHBvcnQuaXRlcmFibGUpIHtcbiAgICAgIGl0ZXJhdG9yW1N5bWJvbC5pdGVyYXRvcl0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGl0ZXJhdG9yXG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGl0ZXJhdG9yXG4gIH1cblxuICBmdW5jdGlvbiBIZWFkZXJzKGhlYWRlcnMpIHtcbiAgICB0aGlzLm1hcCA9IHt9XG5cbiAgICBpZiAoaGVhZGVycyBpbnN0YW5jZW9mIEhlYWRlcnMpIHtcbiAgICAgIGhlYWRlcnMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSwgbmFtZSkge1xuICAgICAgICB0aGlzLmFwcGVuZChuYW1lLCB2YWx1ZSlcbiAgICAgIH0sIHRoaXMpXG4gICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KGhlYWRlcnMpKSB7XG4gICAgICBoZWFkZXJzLmZvckVhY2goZnVuY3Rpb24oaGVhZGVyKSB7XG4gICAgICAgIHRoaXMuYXBwZW5kKGhlYWRlclswXSwgaGVhZGVyWzFdKVxuICAgICAgfSwgdGhpcylcbiAgICB9IGVsc2UgaWYgKGhlYWRlcnMpIHtcbiAgICAgIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGhlYWRlcnMpLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuICAgICAgICB0aGlzLmFwcGVuZChuYW1lLCBoZWFkZXJzW25hbWVdKVxuICAgICAgfSwgdGhpcylcbiAgICB9XG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5hcHBlbmQgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICAgIG5hbWUgPSBub3JtYWxpemVOYW1lKG5hbWUpXG4gICAgdmFsdWUgPSBub3JtYWxpemVWYWx1ZSh2YWx1ZSlcbiAgICB2YXIgb2xkVmFsdWUgPSB0aGlzLm1hcFtuYW1lXVxuICAgIHRoaXMubWFwW25hbWVdID0gb2xkVmFsdWUgPyBvbGRWYWx1ZSsnLCcrdmFsdWUgOiB2YWx1ZVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGVbJ2RlbGV0ZSddID0gZnVuY3Rpb24obmFtZSkge1xuICAgIGRlbGV0ZSB0aGlzLm1hcFtub3JtYWxpemVOYW1lKG5hbWUpXVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24obmFtZSkge1xuICAgIG5hbWUgPSBub3JtYWxpemVOYW1lKG5hbWUpXG4gICAgcmV0dXJuIHRoaXMuaGFzKG5hbWUpID8gdGhpcy5tYXBbbmFtZV0gOiBudWxsXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5oYXMgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMubWFwLmhhc093blByb3BlcnR5KG5vcm1hbGl6ZU5hbWUobmFtZSkpXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICAgIHRoaXMubWFwW25vcm1hbGl6ZU5hbWUobmFtZSldID0gbm9ybWFsaXplVmFsdWUodmFsdWUpXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5mb3JFYWNoID0gZnVuY3Rpb24oY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICBmb3IgKHZhciBuYW1lIGluIHRoaXMubWFwKSB7XG4gICAgICBpZiAodGhpcy5tYXAuaGFzT3duUHJvcGVydHkobmFtZSkpIHtcbiAgICAgICAgY2FsbGJhY2suY2FsbCh0aGlzQXJnLCB0aGlzLm1hcFtuYW1lXSwgbmFtZSwgdGhpcylcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5rZXlzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGl0ZW1zID0gW11cbiAgICB0aGlzLmZvckVhY2goZnVuY3Rpb24odmFsdWUsIG5hbWUpIHsgaXRlbXMucHVzaChuYW1lKSB9KVxuICAgIHJldHVybiBpdGVyYXRvckZvcihpdGVtcylcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLnZhbHVlcyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBpdGVtcyA9IFtdXG4gICAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlKSB7IGl0ZW1zLnB1c2godmFsdWUpIH0pXG4gICAgcmV0dXJuIGl0ZXJhdG9yRm9yKGl0ZW1zKVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuZW50cmllcyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBpdGVtcyA9IFtdXG4gICAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlLCBuYW1lKSB7IGl0ZW1zLnB1c2goW25hbWUsIHZhbHVlXSkgfSlcbiAgICByZXR1cm4gaXRlcmF0b3JGb3IoaXRlbXMpXG4gIH1cblxuICBpZiAoc3VwcG9ydC5pdGVyYWJsZSkge1xuICAgIEhlYWRlcnMucHJvdG90eXBlW1N5bWJvbC5pdGVyYXRvcl0gPSBIZWFkZXJzLnByb3RvdHlwZS5lbnRyaWVzXG4gIH1cblxuICBmdW5jdGlvbiBjb25zdW1lZChib2R5KSB7XG4gICAgaWYgKGJvZHkuYm9keVVzZWQpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgVHlwZUVycm9yKCdBbHJlYWR5IHJlYWQnKSlcbiAgICB9XG4gICAgYm9keS5ib2R5VXNlZCA9IHRydWVcbiAgfVxuXG4gIGZ1bmN0aW9uIGZpbGVSZWFkZXJSZWFkeShyZWFkZXIpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICByZWFkZXIub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlc29sdmUocmVhZGVyLnJlc3VsdClcbiAgICAgIH1cbiAgICAgIHJlYWRlci5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlamVjdChyZWFkZXIuZXJyb3IpXG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlYWRCbG9iQXNBcnJheUJ1ZmZlcihibG9iKSB7XG4gICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKClcbiAgICB2YXIgcHJvbWlzZSA9IGZpbGVSZWFkZXJSZWFkeShyZWFkZXIpXG4gICAgcmVhZGVyLnJlYWRBc0FycmF5QnVmZmVyKGJsb2IpXG4gICAgcmV0dXJuIHByb21pc2VcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlYWRCbG9iQXNUZXh0KGJsb2IpIHtcbiAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKVxuICAgIHZhciBwcm9taXNlID0gZmlsZVJlYWRlclJlYWR5KHJlYWRlcilcbiAgICByZWFkZXIucmVhZEFzVGV4dChibG9iKVxuICAgIHJldHVybiBwcm9taXNlXG4gIH1cblxuICBmdW5jdGlvbiByZWFkQXJyYXlCdWZmZXJBc1RleHQoYnVmKSB7XG4gICAgdmFyIHZpZXcgPSBuZXcgVWludDhBcnJheShidWYpXG4gICAgdmFyIGNoYXJzID0gbmV3IEFycmF5KHZpZXcubGVuZ3RoKVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2aWV3Lmxlbmd0aDsgaSsrKSB7XG4gICAgICBjaGFyc1tpXSA9IFN0cmluZy5mcm9tQ2hhckNvZGUodmlld1tpXSlcbiAgICB9XG4gICAgcmV0dXJuIGNoYXJzLmpvaW4oJycpXG4gIH1cblxuICBmdW5jdGlvbiBidWZmZXJDbG9uZShidWYpIHtcbiAgICBpZiAoYnVmLnNsaWNlKSB7XG4gICAgICByZXR1cm4gYnVmLnNsaWNlKDApXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciB2aWV3ID0gbmV3IFVpbnQ4QXJyYXkoYnVmLmJ5dGVMZW5ndGgpXG4gICAgICB2aWV3LnNldChuZXcgVWludDhBcnJheShidWYpKVxuICAgICAgcmV0dXJuIHZpZXcuYnVmZmVyXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gQm9keSgpIHtcbiAgICB0aGlzLmJvZHlVc2VkID0gZmFsc2VcblxuICAgIHRoaXMuX2luaXRCb2R5ID0gZnVuY3Rpb24oYm9keSkge1xuICAgICAgdGhpcy5fYm9keUluaXQgPSBib2R5XG4gICAgICBpZiAoIWJvZHkpIHtcbiAgICAgICAgdGhpcy5fYm9keVRleHQgPSAnJ1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgYm9keSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgdGhpcy5fYm9keVRleHQgPSBib2R5XG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuYmxvYiAmJiBCbG9iLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpKSB7XG4gICAgICAgIHRoaXMuX2JvZHlCbG9iID0gYm9keVxuICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LmZvcm1EYXRhICYmIEZvcm1EYXRhLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpKSB7XG4gICAgICAgIHRoaXMuX2JvZHlGb3JtRGF0YSA9IGJvZHlcbiAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5zZWFyY2hQYXJhbXMgJiYgVVJMU2VhcmNoUGFyYW1zLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpKSB7XG4gICAgICAgIHRoaXMuX2JvZHlUZXh0ID0gYm9keS50b1N0cmluZygpXG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuYXJyYXlCdWZmZXIgJiYgc3VwcG9ydC5ibG9iICYmIGlzRGF0YVZpZXcoYm9keSkpIHtcbiAgICAgICAgdGhpcy5fYm9keUFycmF5QnVmZmVyID0gYnVmZmVyQ2xvbmUoYm9keS5idWZmZXIpXG4gICAgICAgIC8vIElFIDEwLTExIGNhbid0IGhhbmRsZSBhIERhdGFWaWV3IGJvZHkuXG4gICAgICAgIHRoaXMuX2JvZHlJbml0ID0gbmV3IEJsb2IoW3RoaXMuX2JvZHlBcnJheUJ1ZmZlcl0pXG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuYXJyYXlCdWZmZXIgJiYgKEFycmF5QnVmZmVyLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpIHx8IGlzQXJyYXlCdWZmZXJWaWV3KGJvZHkpKSkge1xuICAgICAgICB0aGlzLl9ib2R5QXJyYXlCdWZmZXIgPSBidWZmZXJDbG9uZShib2R5KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCd1bnN1cHBvcnRlZCBCb2R5SW5pdCB0eXBlJylcbiAgICAgIH1cblxuICAgICAgaWYgKCF0aGlzLmhlYWRlcnMuZ2V0KCdjb250ZW50LXR5cGUnKSkge1xuICAgICAgICBpZiAodHlwZW9mIGJvZHkgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhpcy5oZWFkZXJzLnNldCgnY29udGVudC10eXBlJywgJ3RleHQvcGxhaW47Y2hhcnNldD1VVEYtOCcpXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUJsb2IgJiYgdGhpcy5fYm9keUJsb2IudHlwZSkge1xuICAgICAgICAgIHRoaXMuaGVhZGVycy5zZXQoJ2NvbnRlbnQtdHlwZScsIHRoaXMuX2JvZHlCbG9iLnR5cGUpXG4gICAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5zZWFyY2hQYXJhbXMgJiYgVVJMU2VhcmNoUGFyYW1zLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpKSB7XG4gICAgICAgICAgdGhpcy5oZWFkZXJzLnNldCgnY29udGVudC10eXBlJywgJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZDtjaGFyc2V0PVVURi04JylcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzdXBwb3J0LmJsb2IpIHtcbiAgICAgIHRoaXMuYmxvYiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcmVqZWN0ZWQgPSBjb25zdW1lZCh0aGlzKVxuICAgICAgICBpZiAocmVqZWN0ZWQpIHtcbiAgICAgICAgICByZXR1cm4gcmVqZWN0ZWRcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLl9ib2R5QmxvYikge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodGhpcy5fYm9keUJsb2IpXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUFycmF5QnVmZmVyKSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShuZXcgQmxvYihbdGhpcy5fYm9keUFycmF5QnVmZmVyXSkpXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUZvcm1EYXRhKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjb3VsZCBub3QgcmVhZCBGb3JtRGF0YSBib2R5IGFzIGJsb2InKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUobmV3IEJsb2IoW3RoaXMuX2JvZHlUZXh0XSkpXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdGhpcy5hcnJheUJ1ZmZlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAodGhpcy5fYm9keUFycmF5QnVmZmVyKSB7XG4gICAgICAgICAgcmV0dXJuIGNvbnN1bWVkKHRoaXMpIHx8IFByb21pc2UucmVzb2x2ZSh0aGlzLl9ib2R5QXJyYXlCdWZmZXIpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuYmxvYigpLnRoZW4ocmVhZEJsb2JBc0FycmF5QnVmZmVyKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy50ZXh0ID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgcmVqZWN0ZWQgPSBjb25zdW1lZCh0aGlzKVxuICAgICAgaWYgKHJlamVjdGVkKSB7XG4gICAgICAgIHJldHVybiByZWplY3RlZFxuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5fYm9keUJsb2IpIHtcbiAgICAgICAgcmV0dXJuIHJlYWRCbG9iQXNUZXh0KHRoaXMuX2JvZHlCbG9iKVxuICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5QXJyYXlCdWZmZXIpIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShyZWFkQXJyYXlCdWZmZXJBc1RleHQodGhpcy5fYm9keUFycmF5QnVmZmVyKSlcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUZvcm1EYXRhKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignY291bGQgbm90IHJlYWQgRm9ybURhdGEgYm9keSBhcyB0ZXh0JylcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodGhpcy5fYm9keVRleHQpXG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHN1cHBvcnQuZm9ybURhdGEpIHtcbiAgICAgIHRoaXMuZm9ybURhdGEgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudGV4dCgpLnRoZW4oZGVjb2RlKVxuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuanNvbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMudGV4dCgpLnRoZW4oSlNPTi5wYXJzZSlcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgLy8gSFRUUCBtZXRob2RzIHdob3NlIGNhcGl0YWxpemF0aW9uIHNob3VsZCBiZSBub3JtYWxpemVkXG4gIHZhciBtZXRob2RzID0gWydERUxFVEUnLCAnR0VUJywgJ0hFQUQnLCAnT1BUSU9OUycsICdQT1NUJywgJ1BVVCddXG5cbiAgZnVuY3Rpb24gbm9ybWFsaXplTWV0aG9kKG1ldGhvZCkge1xuICAgIHZhciB1cGNhc2VkID0gbWV0aG9kLnRvVXBwZXJDYXNlKClcbiAgICByZXR1cm4gKG1ldGhvZHMuaW5kZXhPZih1cGNhc2VkKSA+IC0xKSA/IHVwY2FzZWQgOiBtZXRob2RcbiAgfVxuXG4gIGZ1bmN0aW9uIFJlcXVlc3QoaW5wdXQsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fVxuICAgIHZhciBib2R5ID0gb3B0aW9ucy5ib2R5XG5cbiAgICBpZiAoaW5wdXQgaW5zdGFuY2VvZiBSZXF1ZXN0KSB7XG4gICAgICBpZiAoaW5wdXQuYm9keVVzZWQpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQWxyZWFkeSByZWFkJylcbiAgICAgIH1cbiAgICAgIHRoaXMudXJsID0gaW5wdXQudXJsXG4gICAgICB0aGlzLmNyZWRlbnRpYWxzID0gaW5wdXQuY3JlZGVudGlhbHNcbiAgICAgIGlmICghb3B0aW9ucy5oZWFkZXJzKSB7XG4gICAgICAgIHRoaXMuaGVhZGVycyA9IG5ldyBIZWFkZXJzKGlucHV0LmhlYWRlcnMpXG4gICAgICB9XG4gICAgICB0aGlzLm1ldGhvZCA9IGlucHV0Lm1ldGhvZFxuICAgICAgdGhpcy5tb2RlID0gaW5wdXQubW9kZVxuICAgICAgaWYgKCFib2R5ICYmIGlucHV0Ll9ib2R5SW5pdCAhPSBudWxsKSB7XG4gICAgICAgIGJvZHkgPSBpbnB1dC5fYm9keUluaXRcbiAgICAgICAgaW5wdXQuYm9keVVzZWQgPSB0cnVlXG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMudXJsID0gU3RyaW5nKGlucHV0KVxuICAgIH1cblxuICAgIHRoaXMuY3JlZGVudGlhbHMgPSBvcHRpb25zLmNyZWRlbnRpYWxzIHx8IHRoaXMuY3JlZGVudGlhbHMgfHwgJ29taXQnXG4gICAgaWYgKG9wdGlvbnMuaGVhZGVycyB8fCAhdGhpcy5oZWFkZXJzKSB7XG4gICAgICB0aGlzLmhlYWRlcnMgPSBuZXcgSGVhZGVycyhvcHRpb25zLmhlYWRlcnMpXG4gICAgfVxuICAgIHRoaXMubWV0aG9kID0gbm9ybWFsaXplTWV0aG9kKG9wdGlvbnMubWV0aG9kIHx8IHRoaXMubWV0aG9kIHx8ICdHRVQnKVxuICAgIHRoaXMubW9kZSA9IG9wdGlvbnMubW9kZSB8fCB0aGlzLm1vZGUgfHwgbnVsbFxuICAgIHRoaXMucmVmZXJyZXIgPSBudWxsXG5cbiAgICBpZiAoKHRoaXMubWV0aG9kID09PSAnR0VUJyB8fCB0aGlzLm1ldGhvZCA9PT0gJ0hFQUQnKSAmJiBib2R5KSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdCb2R5IG5vdCBhbGxvd2VkIGZvciBHRVQgb3IgSEVBRCByZXF1ZXN0cycpXG4gICAgfVxuICAgIHRoaXMuX2luaXRCb2R5KGJvZHkpXG4gIH1cblxuICBSZXF1ZXN0LnByb3RvdHlwZS5jbG9uZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgUmVxdWVzdCh0aGlzLCB7IGJvZHk6IHRoaXMuX2JvZHlJbml0IH0pXG4gIH1cblxuICBmdW5jdGlvbiBkZWNvZGUoYm9keSkge1xuICAgIHZhciBmb3JtID0gbmV3IEZvcm1EYXRhKClcbiAgICBib2R5LnRyaW0oKS5zcGxpdCgnJicpLmZvckVhY2goZnVuY3Rpb24oYnl0ZXMpIHtcbiAgICAgIGlmIChieXRlcykge1xuICAgICAgICB2YXIgc3BsaXQgPSBieXRlcy5zcGxpdCgnPScpXG4gICAgICAgIHZhciBuYW1lID0gc3BsaXQuc2hpZnQoKS5yZXBsYWNlKC9cXCsvZywgJyAnKVxuICAgICAgICB2YXIgdmFsdWUgPSBzcGxpdC5qb2luKCc9JykucmVwbGFjZSgvXFwrL2csICcgJylcbiAgICAgICAgZm9ybS5hcHBlbmQoZGVjb2RlVVJJQ29tcG9uZW50KG5hbWUpLCBkZWNvZGVVUklDb21wb25lbnQodmFsdWUpKVxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIGZvcm1cbiAgfVxuXG4gIGZ1bmN0aW9uIHBhcnNlSGVhZGVycyhyYXdIZWFkZXJzKSB7XG4gICAgdmFyIGhlYWRlcnMgPSBuZXcgSGVhZGVycygpXG4gICAgLy8gUmVwbGFjZSBpbnN0YW5jZXMgb2YgXFxyXFxuIGFuZCBcXG4gZm9sbG93ZWQgYnkgYXQgbGVhc3Qgb25lIHNwYWNlIG9yIGhvcml6b250YWwgdGFiIHdpdGggYSBzcGFjZVxuICAgIC8vIGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmM3MjMwI3NlY3Rpb24tMy4yXG4gICAgdmFyIHByZVByb2Nlc3NlZEhlYWRlcnMgPSByYXdIZWFkZXJzLnJlcGxhY2UoL1xccj9cXG5bXFx0IF0rL2csICcgJylcbiAgICBwcmVQcm9jZXNzZWRIZWFkZXJzLnNwbGl0KC9cXHI/XFxuLykuZm9yRWFjaChmdW5jdGlvbihsaW5lKSB7XG4gICAgICB2YXIgcGFydHMgPSBsaW5lLnNwbGl0KCc6JylcbiAgICAgIHZhciBrZXkgPSBwYXJ0cy5zaGlmdCgpLnRyaW0oKVxuICAgICAgaWYgKGtleSkge1xuICAgICAgICB2YXIgdmFsdWUgPSBwYXJ0cy5qb2luKCc6JykudHJpbSgpXG4gICAgICAgIGhlYWRlcnMuYXBwZW5kKGtleSwgdmFsdWUpXG4gICAgICB9XG4gICAgfSlcbiAgICByZXR1cm4gaGVhZGVyc1xuICB9XG5cbiAgQm9keS5jYWxsKFJlcXVlc3QucHJvdG90eXBlKVxuXG4gIGZ1bmN0aW9uIFJlc3BvbnNlKGJvZHlJbml0LCBvcHRpb25zKSB7XG4gICAgaWYgKCFvcHRpb25zKSB7XG4gICAgICBvcHRpb25zID0ge31cbiAgICB9XG5cbiAgICB0aGlzLnR5cGUgPSAnZGVmYXVsdCdcbiAgICB0aGlzLnN0YXR1cyA9IG9wdGlvbnMuc3RhdHVzID09PSB1bmRlZmluZWQgPyAyMDAgOiBvcHRpb25zLnN0YXR1c1xuICAgIHRoaXMub2sgPSB0aGlzLnN0YXR1cyA+PSAyMDAgJiYgdGhpcy5zdGF0dXMgPCAzMDBcbiAgICB0aGlzLnN0YXR1c1RleHQgPSAnc3RhdHVzVGV4dCcgaW4gb3B0aW9ucyA/IG9wdGlvbnMuc3RhdHVzVGV4dCA6ICdPSydcbiAgICB0aGlzLmhlYWRlcnMgPSBuZXcgSGVhZGVycyhvcHRpb25zLmhlYWRlcnMpXG4gICAgdGhpcy51cmwgPSBvcHRpb25zLnVybCB8fCAnJ1xuICAgIHRoaXMuX2luaXRCb2R5KGJvZHlJbml0KVxuICB9XG5cbiAgQm9keS5jYWxsKFJlc3BvbnNlLnByb3RvdHlwZSlcblxuICBSZXNwb25zZS5wcm90b3R5cGUuY2xvbmUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKHRoaXMuX2JvZHlJbml0LCB7XG4gICAgICBzdGF0dXM6IHRoaXMuc3RhdHVzLFxuICAgICAgc3RhdHVzVGV4dDogdGhpcy5zdGF0dXNUZXh0LFxuICAgICAgaGVhZGVyczogbmV3IEhlYWRlcnModGhpcy5oZWFkZXJzKSxcbiAgICAgIHVybDogdGhpcy51cmxcbiAgICB9KVxuICB9XG5cbiAgUmVzcG9uc2UuZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgcmVzcG9uc2UgPSBuZXcgUmVzcG9uc2UobnVsbCwge3N0YXR1czogMCwgc3RhdHVzVGV4dDogJyd9KVxuICAgIHJlc3BvbnNlLnR5cGUgPSAnZXJyb3InXG4gICAgcmV0dXJuIHJlc3BvbnNlXG4gIH1cblxuICB2YXIgcmVkaXJlY3RTdGF0dXNlcyA9IFszMDEsIDMwMiwgMzAzLCAzMDcsIDMwOF1cblxuICBSZXNwb25zZS5yZWRpcmVjdCA9IGZ1bmN0aW9uKHVybCwgc3RhdHVzKSB7XG4gICAgaWYgKHJlZGlyZWN0U3RhdHVzZXMuaW5kZXhPZihzdGF0dXMpID09PSAtMSkge1xuICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0ludmFsaWQgc3RhdHVzIGNvZGUnKVxuICAgIH1cblxuICAgIHJldHVybiBuZXcgUmVzcG9uc2UobnVsbCwge3N0YXR1czogc3RhdHVzLCBoZWFkZXJzOiB7bG9jYXRpb246IHVybH19KVxuICB9XG5cbiAgc2VsZi5IZWFkZXJzID0gSGVhZGVyc1xuICBzZWxmLlJlcXVlc3QgPSBSZXF1ZXN0XG4gIHNlbGYuUmVzcG9uc2UgPSBSZXNwb25zZVxuXG4gIHNlbGYuZmV0Y2ggPSBmdW5jdGlvbihpbnB1dCwgaW5pdCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHZhciByZXF1ZXN0ID0gbmV3IFJlcXVlc3QoaW5wdXQsIGluaXQpXG4gICAgICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KClcblxuICAgICAgeGhyLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgb3B0aW9ucyA9IHtcbiAgICAgICAgICBzdGF0dXM6IHhoci5zdGF0dXMsXG4gICAgICAgICAgc3RhdHVzVGV4dDogeGhyLnN0YXR1c1RleHQsXG4gICAgICAgICAgaGVhZGVyczogcGFyc2VIZWFkZXJzKHhoci5nZXRBbGxSZXNwb25zZUhlYWRlcnMoKSB8fCAnJylcbiAgICAgICAgfVxuICAgICAgICBvcHRpb25zLnVybCA9ICdyZXNwb25zZVVSTCcgaW4geGhyID8geGhyLnJlc3BvbnNlVVJMIDogb3B0aW9ucy5oZWFkZXJzLmdldCgnWC1SZXF1ZXN0LVVSTCcpXG4gICAgICAgIHZhciBib2R5ID0gJ3Jlc3BvbnNlJyBpbiB4aHIgPyB4aHIucmVzcG9uc2UgOiB4aHIucmVzcG9uc2VUZXh0XG4gICAgICAgIHJlc29sdmUobmV3IFJlc3BvbnNlKGJvZHksIG9wdGlvbnMpKVxuICAgICAgfVxuXG4gICAgICB4aHIub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QobmV3IFR5cGVFcnJvcignTmV0d29yayByZXF1ZXN0IGZhaWxlZCcpKVxuICAgICAgfVxuXG4gICAgICB4aHIub250aW1lb3V0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlamVjdChuZXcgVHlwZUVycm9yKCdOZXR3b3JrIHJlcXVlc3QgZmFpbGVkJykpXG4gICAgICB9XG5cbiAgICAgIHhoci5vcGVuKHJlcXVlc3QubWV0aG9kLCByZXF1ZXN0LnVybCwgdHJ1ZSlcblxuICAgICAgaWYgKHJlcXVlc3QuY3JlZGVudGlhbHMgPT09ICdpbmNsdWRlJykge1xuICAgICAgICB4aHIud2l0aENyZWRlbnRpYWxzID0gdHJ1ZVxuICAgICAgfSBlbHNlIGlmIChyZXF1ZXN0LmNyZWRlbnRpYWxzID09PSAnb21pdCcpIHtcbiAgICAgICAgeGhyLndpdGhDcmVkZW50aWFscyA9IGZhbHNlXG4gICAgICB9XG5cbiAgICAgIGlmICgncmVzcG9uc2VUeXBlJyBpbiB4aHIgJiYgc3VwcG9ydC5ibG9iKSB7XG4gICAgICAgIHhoci5yZXNwb25zZVR5cGUgPSAnYmxvYidcbiAgICAgIH1cblxuICAgICAgcmVxdWVzdC5oZWFkZXJzLmZvckVhY2goZnVuY3Rpb24odmFsdWUsIG5hbWUpIHtcbiAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIobmFtZSwgdmFsdWUpXG4gICAgICB9KVxuXG4gICAgICB4aHIuc2VuZCh0eXBlb2YgcmVxdWVzdC5fYm9keUluaXQgPT09ICd1bmRlZmluZWQnID8gbnVsbCA6IHJlcXVlc3QuX2JvZHlJbml0KVxuICAgIH0pXG4gIH1cbiAgc2VsZi5mZXRjaC5wb2x5ZmlsbCA9IHRydWVcbn0pKHR5cGVvZiBzZWxmICE9PSAndW5kZWZpbmVkJyA/IHNlbGYgOiB0aGlzKTtcbiIsImNvbnN0IGFydGljbGVUZW1wbGF0ZSA9IGBcblx0PGFydGljbGUgY2xhc3M9XCJhcnRpY2xlX19vdXRlclwiPlxuXHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlX19pbm5lclwiPlxuXHRcdFx0PGRpdiBjbGFzcz1cImFydGljbGVfX2hlYWRpbmdcIj5cblx0XHRcdFx0PGEgY2xhc3M9XCJqcy1lbnRyeS10aXRsZVwiPjwvYT5cblx0XHRcdFx0PGgyIGNsYXNzPVwiYXJ0aWNsZS1oZWFkaW5nX190aXRsZVwiPjwvaDI+XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlLWhlYWRpbmdfX25hbWVcIj5cblx0XHRcdFx0XHQ8c3BhbiBjbGFzcz1cImFydGljbGUtaGVhZGluZ19fbmFtZS0tZmlyc3RcIj48L3NwYW4+XG5cdFx0XHRcdFx0PGEgY2xhc3M9XCJqcy1lbnRyeS1hcnRpc3RcIj48L2E+XG5cdFx0XHRcdFx0PHNwYW4gY2xhc3M9XCJhcnRpY2xlLWhlYWRpbmdfX25hbWUtLWxhc3RcIj48L3NwYW4+XG5cdFx0XHRcdDwvZGl2PlxuXHRcdFx0PC9kaXY+XHRcblx0XHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlX19pbWFnZXMtb3V0ZXJcIj5cblx0XHRcdFx0PGRpdiBjbGFzcz1cImFydGljbGVfX2ltYWdlcy1pbm5lclwiPjwvZGl2PlxuXHRcdFx0XHQ8cCBjbGFzcz1cImpzLWFydGljbGUtYW5jaG9yLXRhcmdldFwiPjwvcD5cblx0XHQ8L2Rpdj5cblx0PC9hcnRpY2xlPlxuYDtcblxuZXhwb3J0IGRlZmF1bHQgYXJ0aWNsZVRlbXBsYXRlOyIsImltcG9ydCAnd2hhdHdnLWZldGNoJztcbmltcG9ydCBuYXZMZyBmcm9tICcuL25hdi1sZyc7XG5pbXBvcnQgYXJ0aWNsZVRlbXBsYXRlIGZyb20gJy4vYXJ0aWNsZS10ZW1wbGF0ZSc7XG5cbmNvbnN0IERCID0gJ2h0dHBzOi8vbmV4dXMtY2F0YWxvZy5maXJlYmFzZWlvLmNvbS9wb3N0cy5qc29uP2F1dGg9N2c3cHlLS3lrTjNONWV3ckltaE9hUzZ2d3JGc2M1Zktrcms4ZWp6Zic7XG5jb25zdCBhbHBoYWJldCA9IFsnYScsICdiJywgJ2MnLCAnZCcsICdlJywgJ2YnLCAnZycsICdoJywgJ2knLCAnaicsICdrJywgJ2wnLCAnbScsICduJywgJ28nLCAncCcsICdyJywgJ3MnLCAndCcsICd1JywgJ3YnLCAndycsICd5JywgJ3onXTtcblxuY29uc3QgJGxvYWRpbmcgPSBBcnJheS5mcm9tKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5sb2FkaW5nJykpO1xuY29uc3QgJG5hdiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdqcy1uYXYnKTtcbmNvbnN0ICRwYXJhbGxheCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5wYXJhbGxheCcpO1xuY29uc3QgJGNvbnRlbnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuY29udGVudCcpO1xuY29uc3QgJHRpdGxlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2pzLXRpdGxlJyk7XG5jb25zdCAkYXJyb3cgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuYXJyb3cnKTtcbmNvbnN0ICRtb2RhbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5tb2RhbCcpO1xuY29uc3QgJGxpZ2h0Ym94ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmxpZ2h0Ym94Jyk7XG5jb25zdCAkdmlldyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5saWdodGJveC12aWV3Jyk7XG5cbmxldCBzb3J0S2V5ID0gMDsgLy8gMCA9IGFydGlzdCwgMSA9IHRpdGxlXG5sZXQgZW50cmllcyA9IHsgYnlBdXRob3I6IFtdLCBieVRpdGxlOiBbXSB9O1xubGV0IGN1cnJlbnRMZXR0ZXIgPSAnQSc7XG5cbmxldCBsaWdodGJveCA9IGZhbHNlO1xuY29uc3QgYXR0YWNoSW1hZ2VMaXN0ZW5lcnMgPSAoKSA9PiB7XG5cdGxldCAkaW1hZ2VzID0gQXJyYXkuZnJvbShkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuYXJ0aWNsZS1pbWFnZScpKTtcblxuXHQkaW1hZ2VzLmZvckVhY2goaW1nID0+IHtcblx0XHRpbWcuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0XHRpZiAoIWxpZ2h0Ym94KSB7XG5cdFx0XHRcdGxldCBzcmMgPSBpbWcuc3JjO1xuXHRcdFx0XHQkbGlnaHRib3guY2xhc3NMaXN0LmFkZCgnc2hvdy1pbWcnKTtcblx0XHRcdFx0JHZpZXcuc2V0QXR0cmlidXRlKCdzdHlsZScsIGBiYWNrZ3JvdW5kLWltYWdlOiB1cmwoJHtzcmN9KWApO1xuXHRcdFx0XHRsaWdodGJveCA9IHRydWU7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0pO1xuXG5cdCR2aWV3LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuXHRcdGlmIChsaWdodGJveCkge1xuXHRcdFx0JGxpZ2h0Ym94LmNsYXNzTGlzdC5yZW1vdmUoJ3Nob3ctaW1nJyk7XG5cdFx0XHRsaWdodGJveCA9IGZhbHNlO1xuXHRcdH1cblx0fSk7XG59O1xuXG5sZXQgbW9kYWwgPSBmYWxzZTtcbmNvbnN0IGF0dGFjaE1vZGFsTGlzdGVuZXJzID0gKCkgPT4ge1xuXHRjb25zdCAkZmluZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdqcy1maW5kJyk7XG5cdFxuXHQkZmluZC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHQkbW9kYWwuY2xhc3NMaXN0LmFkZCgnc2hvdycpO1xuXHRcdG1vZGFsID0gdHJ1ZTtcblx0fSk7XG5cblx0JG1vZGFsLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuXHRcdHNldFRpbWVvdXQoKCkgPT4ge1xuXHRcdFx0JG1vZGFsLmNsYXNzTGlzdC5yZW1vdmUoJ3Nob3cnKTtcblx0XHRcdG1vZGFsID0gZmFsc2U7XG5cdFx0fSwgNTAwKTtcblx0fSk7XG5cblx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCAoKSA9PiB7XG5cdFx0aWYgKG1vZGFsKSB7XG5cdFx0XHRzZXRUaW1lb3V0KCgpID0+IHtcblx0XHRcdFx0JG1vZGFsLmNsYXNzTGlzdC5yZW1vdmUoJ3Nob3cnKTtcblx0XHRcdFx0bW9kYWwgPSBmYWxzZTtcblx0XHRcdH0sIDYwMCk7XG5cdFx0fTtcblx0fSk7XG59XG5cbmNvbnN0IHNjcm9sbFRvVG9wID0gKCkgPT4ge1xuXHRsZXQgdGhpbmcgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYW5jaG9yLXRhcmdldCcpO1xuXHR0aGluZy5zY3JvbGxJbnRvVmlldyh7YmVoYXZpb3I6IFwic21vb3RoXCIsIGJsb2NrOiBcInN0YXJ0XCJ9KTtcbn1cblxubGV0IHByZXY7XG5sZXQgY3VycmVudCA9IDA7XG5sZXQgaXNTaG93aW5nID0gZmFsc2U7XG5jb25zdCBhdHRhY2hBcnJvd0xpc3RlbmVycyA9ICgpID0+IHtcblx0JGFycm93LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuXHRcdHNjcm9sbFRvVG9wKCk7XG5cdH0pO1xuXG5cdCRwYXJhbGxheC5hZGRFdmVudExpc3RlbmVyKCdzY3JvbGwnLCAoKSA9PiB7XG5cblx0XHRsZXQgeSA9ICR0aXRsZS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS55O1xuXHRcdGlmIChjdXJyZW50ICE9PSB5KSB7XG5cdFx0XHRwcmV2ID0gY3VycmVudDtcblx0XHRcdGN1cnJlbnQgPSB5O1xuXHRcdH1cblxuXHRcdGlmICh5IDw9IC01MCAmJiAhaXNTaG93aW5nKSB7XG5cdFx0XHQkYXJyb3cuY2xhc3NMaXN0LmFkZCgnc2hvdycpO1xuXHRcdFx0aXNTaG93aW5nID0gdHJ1ZTtcblx0XHR9IGVsc2UgaWYgKHkgPiAtNTAgJiYgaXNTaG93aW5nKSB7XG5cdFx0XHQkYXJyb3cuY2xhc3NMaXN0LnJlbW92ZSgnc2hvdycpO1xuXHRcdFx0aXNTaG93aW5nID0gZmFsc2U7XG5cdFx0fVxuXHR9KTtcbn07XG5cbmNvbnN0IGFkZFNvcnRCdXR0b25MaXN0ZW5lcnMgPSAoKSA9PiB7XG5cdGxldCAkYnlBcnRpc3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnanMtYnktYXJ0aXN0Jyk7XG5cdGxldCAkYnlUaXRsZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdqcy1ieS10aXRsZScpO1xuXHQkYnlBcnRpc3QuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0aWYgKHNvcnRLZXkpIHtcblx0XHRcdHNjcm9sbFRvVG9wKCk7XG5cdFx0XHRzb3J0S2V5ID0gMDtcblx0XHRcdCRieUFydGlzdC5jbGFzc0xpc3QuYWRkKCdhY3RpdmUnKTtcblx0XHRcdCRieVRpdGxlLmNsYXNzTGlzdC5yZW1vdmUoJ2FjdGl2ZScpO1xuXG5cdFx0XHRyZW5kZXJFbnRyaWVzKCk7XG5cdFx0fVxuXHR9KTtcblxuXHQkYnlUaXRsZS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHRpZiAoIXNvcnRLZXkpIHtcblx0XHRcdHNjcm9sbFRvVG9wKCk7XG5cdFx0XHRzb3J0S2V5ID0gMTtcblx0XHRcdCRieVRpdGxlLmNsYXNzTGlzdC5hZGQoJ2FjdGl2ZScpO1xuXHRcdFx0JGJ5QXJ0aXN0LmNsYXNzTGlzdC5yZW1vdmUoJ2FjdGl2ZScpO1xuXG5cdFx0XHRyZW5kZXJFbnRyaWVzKCk7XG5cdFx0fVxuXHR9KTtcbn07XG5cbmNvbnN0IGNsZWFyQW5jaG9ycyA9IChwcmV2U2VsZWN0b3IpID0+IHtcblx0bGV0ICRlbnRyaWVzID0gQXJyYXkuZnJvbShkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKHByZXZTZWxlY3RvcikpO1xuXHQkZW50cmllcy5mb3JFYWNoKGVudHJ5ID0+IGVudHJ5LnJlbW92ZUF0dHJpYnV0ZSgnbmFtZScpKTtcbn07XG5cbmNvbnN0IGZpbmRGaXJzdEVudHJ5ID0gKGNoYXIpID0+IHtcblx0bGV0IHNlbGVjdG9yID0gc29ydEtleSA/ICcuanMtZW50cnktdGl0bGUnIDogJy5qcy1lbnRyeS1hcnRpc3QnO1xuXHRsZXQgcHJldlNlbGVjdG9yID0gIXNvcnRLZXkgPyAnLmpzLWVudHJ5LXRpdGxlJyA6ICcuanMtZW50cnktYXJ0aXN0Jztcblx0bGV0ICRlbnRyaWVzID0gQXJyYXkuZnJvbShkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKSk7XG5cblx0Y2xlYXJBbmNob3JzKHByZXZTZWxlY3Rvcik7XG5cblx0cmV0dXJuICRlbnRyaWVzLmZpbmQoZW50cnkgPT4ge1xuXHRcdGxldCBub2RlID0gZW50cnkubmV4dEVsZW1lbnRTaWJsaW5nO1xuXHRcdHJldHVybiBub2RlLmlubmVySFRNTFswXSA9PT0gY2hhciB8fCBub2RlLmlubmVySFRNTFswXSA9PT0gY2hhci50b1VwcGVyQ2FzZSgpO1xuXHR9KTtcbn07XG5cblxuY29uc3QgbWFrZUFscGhhYmV0ID0gKCkgPT4ge1xuXHRjb25zdCBhdHRhY2hBbmNob3JMaXN0ZW5lciA9ICgkYW5jaG9yLCBsZXR0ZXIpID0+IHtcblx0XHQkYW5jaG9yLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuXHRcdFx0Y29uc3QgbGV0dGVyTm9kZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGxldHRlcik7XG5cdFx0XHRsZXQgdGFyZ2V0O1xuXG5cdFx0XHRpZiAoIXNvcnRLZXkpIHtcblx0XHRcdFx0dGFyZ2V0ID0gbGV0dGVyID09PSAnYScgPyBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYW5jaG9yLXRhcmdldCcpIDogbGV0dGVyTm9kZS5wYXJlbnRFbGVtZW50LnBhcmVudEVsZW1lbnQucGFyZW50RWxlbWVudC5wYXJlbnRFbGVtZW50LnByZXZpb3VzRWxlbWVudFNpYmxpbmcucXVlcnlTZWxlY3RvcignLmpzLWFydGljbGUtYW5jaG9yLXRhcmdldCcpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGFyZ2V0ID0gbGV0dGVyID09PSAnYScgPyBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYW5jaG9yLXRhcmdldCcpIDogbGV0dGVyTm9kZS5wYXJlbnRFbGVtZW50LnBhcmVudEVsZW1lbnQucGFyZW50RWxlbWVudC5wcmV2aW91c0VsZW1lbnRTaWJsaW5nLnF1ZXJ5U2VsZWN0b3IoJy5qcy1hcnRpY2xlLWFuY2hvci10YXJnZXQnKTtcblx0XHRcdH07XG5cblx0XHRcdHRhcmdldC5zY3JvbGxJbnRvVmlldyh7YmVoYXZpb3I6IFwic21vb3RoXCIsIGJsb2NrOiBcInN0YXJ0XCJ9KTtcblx0XHR9KTtcblx0fTtcblxuXHRsZXQgYWN0aXZlRW50cmllcyA9IHt9O1xuXHRsZXQgJG91dGVyID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmFscGhhYmV0X19sZXR0ZXJzJyk7XG5cdCRvdXRlci5pbm5lckhUTUwgPSAnJztcblxuXHRhbHBoYWJldC5mb3JFYWNoKGxldHRlciA9PiB7XG5cdFx0bGV0ICRmaXJzdEVudHJ5ID0gZmluZEZpcnN0RW50cnkobGV0dGVyKTtcblx0XHRsZXQgJGFuY2hvciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcblxuXHRcdGlmICghJGZpcnN0RW50cnkpIHJldHVybjtcblxuXHRcdCRmaXJzdEVudHJ5LmlkID0gbGV0dGVyO1xuXHRcdCRhbmNob3IuaW5uZXJIVE1MID0gbGV0dGVyLnRvVXBwZXJDYXNlKCk7XG5cdFx0JGFuY2hvci5jbGFzc05hbWUgPSAnYWxwaGFiZXRfX2xldHRlci1hbmNob3InO1xuXG5cdFx0YXR0YWNoQW5jaG9yTGlzdGVuZXIoJGFuY2hvciwgbGV0dGVyKTtcblx0XHQkb3V0ZXIuYXBwZW5kQ2hpbGQoJGFuY2hvcik7XG5cdH0pO1xufTtcblxuY29uc3QgcmVuZGVySW1hZ2VzID0gKGltYWdlcywgJGltYWdlcykgPT4ge1xuXHRpbWFnZXMuZm9yRWFjaChpbWFnZSA9PiB7XG5cdFx0Y29uc3Qgc3JjID0gYC4uLy4uL2Fzc2V0cy9pbWFnZXMvJHtpbWFnZX1gO1xuXHRcdGxldCAkaW1nID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnSU1HJyk7XG5cdFx0JGltZy5jbGFzc05hbWUgPSAnYXJ0aWNsZS1pbWFnZSc7XG5cdFx0JGltZy5zcmMgPSBzcmM7XG5cdFx0JGltYWdlcy5hcHBlbmRDaGlsZCgkaW1nKTtcblx0fSlcbn07XG5cbmNvbnN0IHJlbmRlckVudHJpZXMgPSAoKSA9PiB7XG5cdGxldCAkYXJ0aWNsZUxpc3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnanMtbGlzdCcpO1xuXHRsZXQgZW50cmllc0xpc3QgPSBzb3J0S2V5ID8gZW50cmllcy5ieVRpdGxlIDogZW50cmllcy5ieUF1dGhvcjtcblxuXHQkYXJ0aWNsZUxpc3QuaW5uZXJIVE1MID0gJyc7XG5cblx0ZW50cmllc0xpc3QuZm9yRWFjaChlbnRyeSA9PiB7XG5cdFx0bGV0IHsgdGl0bGUsIGxhc3ROYW1lLCBmaXJzdE5hbWUsIGltYWdlcywgZGVzY3JpcHRpb24sIGRldGFpbCB9ID0gZW50cnk7XG5cblx0XHQkYXJ0aWNsZUxpc3QuaW5zZXJ0QWRqYWNlbnRIVE1MKCdiZWZvcmVlbmQnLCBhcnRpY2xlVGVtcGxhdGUpO1xuXG5cdFx0bGV0ICRpbWFnZXNOb2RlcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5hcnRpY2xlX19pbWFnZXMtaW5uZXInKTtcblx0XHRsZXQgJGltYWdlcyA9ICRpbWFnZXNOb2Rlc1skaW1hZ2VzTm9kZXMubGVuZ3RoIC0gMV07XG5cblx0XHRpZiAoaW1hZ2VzLmxlbmd0aCkgcmVuZGVySW1hZ2VzKGltYWdlcywgJGltYWdlcyk7XG5cdFx0XG5cdFx0bGV0ICRkZXNjcmlwdGlvbk91dGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cdFx0bGV0ICRkZXNjcmlwdGlvbk5vZGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdwJyk7XG5cdFx0bGV0ICRkZXRhaWxOb2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpO1xuXHRcdCRkZXNjcmlwdGlvbk91dGVyLmNsYXNzTGlzdC5hZGQoJ2FydGljbGUtZGVzY3JpcHRpb25fX291dGVyJyk7XG5cdFx0JGRlc2NyaXB0aW9uTm9kZS5jbGFzc0xpc3QuYWRkKCdhcnRpY2xlLWRlc2NyaXB0aW9uJyk7XG5cdFx0JGRldGFpbE5vZGUuY2xhc3NMaXN0LmFkZCgnYXJ0aWNsZS1kZXRhaWwnKTtcblxuXHRcdCRkZXNjcmlwdGlvbk5vZGUuaW5uZXJIVE1MID0gZGVzY3JpcHRpb247XG5cdFx0JGRldGFpbE5vZGUuaW5uZXJIVE1MID0gZGV0YWlsO1xuXG5cdFx0JGRlc2NyaXB0aW9uT3V0ZXIuYXBwZW5kQ2hpbGQoJGRlc2NyaXB0aW9uTm9kZSwgJGRldGFpbE5vZGUpO1xuXHRcdCRpbWFnZXMuYXBwZW5kQ2hpbGQoJGRlc2NyaXB0aW9uT3V0ZXIpO1xuXG5cdFx0bGV0ICR0aXRsZU5vZGVzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLmFydGljbGUtaGVhZGluZ19fdGl0bGUnKTtcblx0XHRsZXQgJHRpdGxlID0gJHRpdGxlTm9kZXNbJHRpdGxlTm9kZXMubGVuZ3RoIC0gMV07XG5cblx0XHRsZXQgJGZpcnN0Tm9kZXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuYXJ0aWNsZS1oZWFkaW5nX19uYW1lLS1maXJzdCcpO1xuXHRcdGxldCAkZmlyc3QgPSAkZmlyc3ROb2Rlc1skZmlyc3ROb2Rlcy5sZW5ndGggLSAxXTtcblxuXHRcdGxldCAkbGFzdE5vZGVzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLmFydGljbGUtaGVhZGluZ19fbmFtZS0tbGFzdCcpO1xuXHRcdGxldCAkbGFzdCA9ICRsYXN0Tm9kZXNbJGxhc3ROb2Rlcy5sZW5ndGggLSAxXTtcblxuXHRcdCR0aXRsZS5pbm5lckhUTUwgPSB0aXRsZTtcblx0XHQkZmlyc3QuaW5uZXJIVE1MID0gZmlyc3ROYW1lO1xuXHRcdCRsYXN0LmlubmVySFRNTCA9IGxhc3ROYW1lO1xuXG5cdH0pO1xuXG5cdGF0dGFjaEltYWdlTGlzdGVuZXJzKCk7XG5cdG1ha2VBbHBoYWJldCgpO1xufTtcblxuLy8gdGhpcyBuZWVkcyB0byBiZSBhIGRlZXBlciBzb3J0XG5jb25zdCBzb3J0QnlUaXRsZSA9ICgpID0+IHtcblx0ZW50cmllcy5ieVRpdGxlLnNvcnQoKGEsIGIpID0+IHtcblx0XHRsZXQgYVRpdGxlID0gYS50aXRsZVswXS50b1VwcGVyQ2FzZSgpO1xuXHRcdGxldCBiVGl0bGUgPSBiLnRpdGxlWzBdLnRvVXBwZXJDYXNlKCk7XG5cdFx0aWYgKGFUaXRsZSA+IGJUaXRsZSkgcmV0dXJuIDE7XG5cdFx0ZWxzZSBpZiAoYVRpdGxlIDwgYlRpdGxlKSByZXR1cm4gLTE7XG5cdFx0ZWxzZSByZXR1cm4gMDtcblx0fSk7XG59O1xuXG5jb25zdCBzZXREYXRhID0gKGRhdGEpID0+IHtcblx0ZW50cmllcy5ieUF1dGhvciA9IGRhdGE7XG5cdGVudHJpZXMuYnlUaXRsZSA9IGRhdGEuc2xpY2UoKTtcblx0c29ydEJ5VGl0bGUoKTtcblx0cmVuZGVyRW50cmllcygpO1xufVxuXG5jb25zdCBmZXRjaERhdGEgPSAoKSA9PiB7XG5cdFx0ZmV0Y2goREIpLnRoZW4ocmVzID0+XG5cdFx0XHRyZXMuanNvbigpXG5cdFx0KS50aGVuKGRhdGEgPT4ge1xuXHRcdFx0c2V0RGF0YShkYXRhKTtcblx0XHR9KVxuXHRcdC50aGVuKCgpID0+IHtcblx0XHRcdCRsb2FkaW5nLmZvckVhY2goZWxlbSA9PiBlbGVtLmNsYXNzTGlzdC5hZGQoJ3JlYWR5JykpO1xuXHRcdFx0JG5hdi5jbGFzc0xpc3QuYWRkKCdyZWFkeScpO1xuXHRcdH0pXG5cdFx0LmNhdGNoKGVyciA9PiBjb25zb2xlLndhcm4oZXJyKSk7XG59O1xuXG5jb25zdCBpbml0ID0gKCkgPT4ge1xuXHRmZXRjaERhdGEoKTtcblx0bmF2TGcoKTtcblx0cmVuZGVyRW50cmllcygpO1xuXHRhZGRTb3J0QnV0dG9uTGlzdGVuZXJzKCk7XG5cdGF0dGFjaEFycm93TGlzdGVuZXJzKCk7XG5cdGF0dGFjaE1vZGFsTGlzdGVuZXJzKCk7XG59XG5cbmluaXQoKTtcbiIsImNvbnN0IHRlbXBsYXRlID0gXG5cdGA8ZGl2IGNsYXNzPVwibmF2X19pbm5lclwiPlxuXHRcdDxkaXYgY2xhc3M9XCJuYXZfX3NvcnQtYnlcIj5cblx0XHRcdDxzcGFuIGNsYXNzPVwic29ydC1ieV9fdGl0bGVcIj5Tb3J0IGJ5PC9zcGFuPlxuXHRcdFx0PGJ1dHRvbiBjbGFzcz1cInNvcnQtYnlfX2J5LWFydGlzdCBhY3RpdmVcIiBpZD1cImpzLWJ5LWFydGlzdFwiPkFydGlzdDwvYnV0dG9uPlxuXHRcdFx0PHNwYW4gY2xhc3M9XCJzb3J0LWJ5X19kaXZpZGVyXCI+IHwgPC9zcGFuPlxuXHRcdFx0PGJ1dHRvbiBjbGFzcz1cInNvcnQtYnlfX2J5LXRpdGxlXCIgaWQ9XCJqcy1ieS10aXRsZVwiPlRpdGxlPC9idXR0b24+XG5cdFx0XHQ8c3BhbiBjbGFzcz1cInNvcnQtYnlfX2RpdmlkZXIgZmluZFwiPiB8IDwvc3Bhbj5cblx0XHRcdDxzcGFuIGNsYXNzPVwiZmluZFwiIGlkPVwianMtZmluZFwiPiYjODk4NDtGPC9zcGFuPlxuXHRcdDwvZGl2PlxuXHRcdDxkaXYgY2xhc3M9XCJuYXZfX2FscGhhYmV0XCI+XG5cdFx0XHQ8c3BhbiBjbGFzcz1cImFscGhhYmV0X190aXRsZVwiPkdvIHRvPC9zcGFuPlxuXHRcdFx0PGRpdiBjbGFzcz1cImFscGhhYmV0X19sZXR0ZXJzXCI+PC9kaXY+XG5cdFx0PC9kaXY+XG5cdDwvZGl2PmA7XG5cbmNvbnN0IG5hdkxnID0gKCkgPT4ge1xuXHRsZXQgbmF2T3V0ZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnanMtbmF2Jyk7XG5cdG5hdk91dGVyLmlubmVySFRNTCA9IHRlbXBsYXRlO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgbmF2TGc7Il0sInByZUV4aXN0aW5nQ29tbWVudCI6Ii8vIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtjaGFyc2V0PXV0Zi04O2Jhc2U2NCxleUoyWlhKemFXOXVJam96TENKemIzVnlZMlZ6SWpwYkltNXZaR1ZmYlc5a2RXeGxjeTlpY205M2MyVnlMWEJoWTJzdlgzQnlaV3gxWkdVdWFuTWlMQ0p1YjJSbFgyMXZaSFZzWlhNdmQyaGhkSGRuTFdabGRHTm9MMlpsZEdOb0xtcHpJaXdpYzNKakwycHpMMkZ5ZEdsamJHVXRkR1Z0Y0d4aGRHVXVhbk1pTENKemNtTXZhbk12YVc1a1pYZ3Vhbk1pTENKemNtTXZhbk12Ym1GMkxXeG5MbXB6SWwwc0ltNWhiV1Z6SWpwYlhTd2liV0Z3Y0dsdVozTWlPaUpCUVVGQk8wRkRRVUU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHM3T3pzN096dEJRMnhrUVN4SlFVRk5MR2x3UWtGQlRqczdhMEpCYlVKbExHVTdPenM3TzBGRGJrSm1PenRCUVVOQk96czdPMEZCUTBFN096czdPenRCUVVWQkxFbEJRVTBzUzBGQlN5d3JSa0ZCV0R0QlFVTkJMRWxCUVUwc1YwRkJWeXhEUVVGRExFZEJRVVFzUlVGQlRTeEhRVUZPTEVWQlFWY3NSMEZCV0N4RlFVRm5RaXhIUVVGb1FpeEZRVUZ4UWl4SFFVRnlRaXhGUVVFd1FpeEhRVUV4UWl4RlFVRXJRaXhIUVVFdlFpeEZRVUZ2UXl4SFFVRndReXhGUVVGNVF5eEhRVUY2UXl4RlFVRTRReXhIUVVFNVF5eEZRVUZ0UkN4SFFVRnVSQ3hGUVVGM1JDeEhRVUY0UkN4RlFVRTJSQ3hIUVVFM1JDeEZRVUZyUlN4SFFVRnNSU3hGUVVGMVJTeEhRVUYyUlN4RlFVRTBSU3hIUVVFMVJTeEZRVUZwUml4SFFVRnFSaXhGUVVGelJpeEhRVUYwUml4RlFVRXlSaXhIUVVFelJpeEZRVUZuUnl4SFFVRm9SeXhGUVVGeFJ5eEhRVUZ5Unl4RlFVRXdSeXhIUVVFeFJ5eEZRVUVyUnl4SFFVRXZSeXhGUVVGdlNDeEhRVUZ3U0N4RFFVRnFRanM3UVVGRlFTeEpRVUZOTEZkQlFWY3NUVUZCVFN4SlFVRk9MRU5CUVZjc1UwRkJVeXhuUWtGQlZDeERRVUV3UWl4VlFVRXhRaXhEUVVGWUxFTkJRV3BDTzBGQlEwRXNTVUZCVFN4UFFVRlBMRk5CUVZNc1kwRkJWQ3hEUVVGM1FpeFJRVUY0UWl4RFFVRmlPMEZCUTBFc1NVRkJUU3haUVVGWkxGTkJRVk1zWVVGQlZDeERRVUYxUWl4WFFVRjJRaXhEUVVGc1FqdEJRVU5CTEVsQlFVMHNWMEZCVnl4VFFVRlRMR0ZCUVZRc1EwRkJkVUlzVlVGQmRrSXNRMEZCYWtJN1FVRkRRU3hKUVVGTkxGTkJRVk1zVTBGQlV5eGpRVUZVTEVOQlFYZENMRlZCUVhoQ0xFTkJRV1k3UVVGRFFTeEpRVUZOTEZOQlFWTXNVMEZCVXl4aFFVRlVMRU5CUVhWQ0xGRkJRWFpDTEVOQlFXWTdRVUZEUVN4SlFVRk5MRk5CUVZNc1UwRkJVeXhoUVVGVUxFTkJRWFZDTEZGQlFYWkNMRU5CUVdZN1FVRkRRU3hKUVVGTkxGbEJRVmtzVTBGQlV5eGhRVUZVTEVOQlFYVkNMRmRCUVhaQ0xFTkJRV3hDTzBGQlEwRXNTVUZCVFN4UlFVRlJMRk5CUVZNc1lVRkJWQ3hEUVVGMVFpeG5Ra0ZCZGtJc1EwRkJaRHM3UVVGRlFTeEpRVUZKTEZWQlFWVXNRMEZCWkN4RExFTkJRV2xDTzBGQlEycENMRWxCUVVrc1ZVRkJWU3hGUVVGRkxGVkJRVlVzUlVGQldpeEZRVUZuUWl4VFFVRlRMRVZCUVhwQ0xFVkJRV1E3UVVGRFFTeEpRVUZKTEdkQ1FVRm5RaXhIUVVGd1FqczdRVUZGUVN4SlFVRkpMRmRCUVZjc1MwRkJaanRCUVVOQkxFbEJRVTBzZFVKQlFYVkNMRk5CUVhaQ0xHOUNRVUYxUWl4SFFVRk5PMEZCUTJ4RExFdEJRVWtzVlVGQlZTeE5RVUZOTEVsQlFVNHNRMEZCVnl4VFFVRlRMR2RDUVVGVUxFTkJRVEJDTEdkQ1FVRXhRaXhEUVVGWUxFTkJRV1E3TzBGQlJVRXNVMEZCVVN4UFFVRlNMRU5CUVdkQ0xHVkJRVTg3UVVGRGRFSXNUVUZCU1N4blFrRkJTaXhEUVVGeFFpeFBRVUZ5UWl4RlFVRTRRaXhaUVVGTk8wRkJRMjVETEU5QlFVa3NRMEZCUXl4UlFVRk1MRVZCUVdVN1FVRkRaQ3hSUVVGSkxFMUJRVTBzU1VGQlNTeEhRVUZrTzBGQlEwRXNZMEZCVlN4VFFVRldMRU5CUVc5Q0xFZEJRWEJDTEVOQlFYZENMRlZCUVhoQ08wRkJRMEVzVlVGQlRTeFpRVUZPTEVOQlFXMUNMRTlCUVc1Q0xEWkNRVUZ4UkN4SFFVRnlSRHRCUVVOQkxHVkJRVmNzU1VGQldEdEJRVU5CTzBGQlEwUXNSMEZRUkR0QlFWRkJMRVZCVkVRN08wRkJWMEVzVDBGQlRTeG5Ra0ZCVGl4RFFVRjFRaXhQUVVGMlFpeEZRVUZuUXl4WlFVRk5PMEZCUTNKRExFMUJRVWtzVVVGQlNpeEZRVUZqTzBGQlEySXNZVUZCVlN4VFFVRldMRU5CUVc5Q0xFMUJRWEJDTEVOQlFUSkNMRlZCUVROQ08wRkJRMEVzWTBGQlZ5eExRVUZZTzBGQlEwRTdRVUZEUkN4RlFVeEVPMEZCVFVFc1EwRndRa1E3TzBGQmMwSkJMRWxCUVVrc1VVRkJVU3hMUVVGYU8wRkJRMEVzU1VGQlRTeDFRa0ZCZFVJc1UwRkJka0lzYjBKQlFYVkNMRWRCUVUwN1FVRkRiRU1zUzBGQlRTeFJRVUZSTEZOQlFWTXNZMEZCVkN4RFFVRjNRaXhUUVVGNFFpeERRVUZrT3p0QlFVVkJMRTlCUVUwc1owSkJRVTRzUTBGQmRVSXNUMEZCZGtJc1JVRkJaME1zV1VGQlRUdEJRVU55UXl4VFFVRlBMRk5CUVZBc1EwRkJhVUlzUjBGQmFrSXNRMEZCY1VJc1RVRkJja0k3UVVGRFFTeFZRVUZSTEVsQlFWSTdRVUZEUVN4RlFVaEVPenRCUVV0QkxGRkJRVThzWjBKQlFWQXNRMEZCZDBJc1QwRkJlRUlzUlVGQmFVTXNXVUZCVFR0QlFVTjBReXhoUVVGWExGbEJRVTA3UVVGRGFFSXNWVUZCVHl4VFFVRlFMRU5CUVdsQ0xFMUJRV3BDTEVOQlFYZENMRTFCUVhoQ08wRkJRMEVzVjBGQlVTeExRVUZTTzBGQlEwRXNSMEZJUkN4RlFVZEhMRWRCU0VnN1FVRkpRU3hGUVV4RU96dEJRVTlCTEZGQlFVOHNaMEpCUVZBc1EwRkJkMElzVTBGQmVFSXNSVUZCYlVNc1dVRkJUVHRCUVVONFF5eE5RVUZKTEV0QlFVb3NSVUZCVnp0QlFVTldMR05CUVZjc1dVRkJUVHRCUVVOb1FpeFhRVUZQTEZOQlFWQXNRMEZCYVVJc1RVRkJha0lzUTBGQmQwSXNUVUZCZUVJN1FVRkRRU3haUVVGUkxFdEJRVkk3UVVGRFFTeEpRVWhFTEVWQlIwY3NSMEZJU0R0QlFVbEJPMEZCUTBRc1JVRlFSRHRCUVZGQkxFTkJka0pFT3p0QlFYbENRU3hKUVVGTkxHTkJRV01zVTBGQlpDeFhRVUZqTEVkQlFVMDdRVUZEZWtJc1MwRkJTU3hSUVVGUkxGTkJRVk1zWTBGQlZDeERRVUYzUWl4bFFVRjRRaXhEUVVGYU8wRkJRMEVzVDBGQlRTeGpRVUZPTEVOQlFYRkNMRVZCUVVNc1ZVRkJWU3hSUVVGWUxFVkJRWEZDTEU5QlFVOHNUMEZCTlVJc1JVRkJja0k3UVVGRFFTeERRVWhFT3p0QlFVdEJMRWxCUVVrc1lVRkJTanRCUVVOQkxFbEJRVWtzVlVGQlZTeERRVUZrTzBGQlEwRXNTVUZCU1N4WlFVRlpMRXRCUVdoQ08wRkJRMEVzU1VGQlRTeDFRa0ZCZFVJc1UwRkJka0lzYjBKQlFYVkNMRWRCUVUwN1FVRkRiRU1zVVVGQlR5eG5Ra0ZCVUN4RFFVRjNRaXhQUVVGNFFpeEZRVUZwUXl4WlFVRk5PMEZCUTNSRE8wRkJRMEVzUlVGR1JEczdRVUZKUVN4WFFVRlZMR2RDUVVGV0xFTkJRVEpDTEZGQlFUTkNMRVZCUVhGRExGbEJRVTA3TzBGQlJURkRMRTFCUVVrc1NVRkJTU3hQUVVGUExIRkNRVUZRTEVkQlFTdENMRU5CUVhaRE8wRkJRMEVzVFVGQlNTeFpRVUZaTEVOQlFXaENMRVZCUVcxQ08wRkJRMnhDTEZWQlFVOHNUMEZCVUR0QlFVTkJMR0ZCUVZVc1EwRkJWanRCUVVOQk96dEJRVVZFTEUxQlFVa3NTMEZCU3l4RFFVRkRMRVZCUVU0c1NVRkJXU3hEUVVGRExGTkJRV3BDTEVWQlFUUkNPMEZCUXpOQ0xGVkJRVThzVTBGQlVDeERRVUZwUWl4SFFVRnFRaXhEUVVGeFFpeE5RVUZ5UWp0QlFVTkJMR1ZCUVZrc1NVRkJXanRCUVVOQkxFZEJTRVFzVFVGSFR5eEpRVUZKTEVsQlFVa3NRMEZCUXl4RlFVRk1MRWxCUVZjc1UwRkJaaXhGUVVFd1FqdEJRVU5vUXl4VlFVRlBMRk5CUVZBc1EwRkJhVUlzVFVGQmFrSXNRMEZCZDBJc1RVRkJlRUk3UVVGRFFTeGxRVUZaTEV0QlFWbzdRVUZEUVR0QlFVTkVMRVZCWmtRN1FVRm5Ra0VzUTBGeVFrUTdPMEZCZFVKQkxFbEJRVTBzZVVKQlFYbENMRk5CUVhwQ0xITkNRVUY1UWl4SFFVRk5PMEZCUTNCRExFdEJRVWtzV1VGQldTeFRRVUZUTEdOQlFWUXNRMEZCZDBJc1kwRkJlRUlzUTBGQmFFSTdRVUZEUVN4TFFVRkpMRmRCUVZjc1UwRkJVeXhqUVVGVUxFTkJRWGRDTEdGQlFYaENMRU5CUVdZN1FVRkRRU3hYUVVGVkxHZENRVUZXTEVOQlFUSkNMRTlCUVROQ0xFVkJRVzlETEZsQlFVMDdRVUZEZWtNc1RVRkJTU3hQUVVGS0xFVkJRV0U3UVVGRFdqdEJRVU5CTEdGQlFWVXNRMEZCVmp0QlFVTkJMR0ZCUVZVc1UwRkJWaXhEUVVGdlFpeEhRVUZ3UWl4RFFVRjNRaXhSUVVGNFFqdEJRVU5CTEZsQlFWTXNVMEZCVkN4RFFVRnRRaXhOUVVGdVFpeERRVUV3UWl4UlFVRXhRanM3UVVGRlFUdEJRVU5CTzBGQlEwUXNSVUZVUkRzN1FVRlhRU3hWUVVGVExHZENRVUZVTEVOQlFUQkNMRTlCUVRGQ0xFVkJRVzFETEZsQlFVMDdRVUZEZUVNc1RVRkJTU3hEUVVGRExFOUJRVXdzUlVGQll6dEJRVU5pTzBGQlEwRXNZVUZCVlN4RFFVRldPMEZCUTBFc1dVRkJVeXhUUVVGVUxFTkJRVzFDTEVkQlFXNUNMRU5CUVhWQ0xGRkJRWFpDTzBGQlEwRXNZVUZCVlN4VFFVRldMRU5CUVc5Q0xFMUJRWEJDTEVOQlFUSkNMRkZCUVROQ096dEJRVVZCTzBGQlEwRTdRVUZEUkN4RlFWUkVPMEZCVlVFc1EwRjRRa1E3TzBGQk1FSkJMRWxCUVUwc1pVRkJaU3hUUVVGbUxGbEJRV1VzUTBGQlF5eFpRVUZFTEVWQlFXdENPMEZCUTNSRExFdEJRVWtzVjBGQlZ5eE5RVUZOTEVsQlFVNHNRMEZCVnl4VFFVRlRMR2RDUVVGVUxFTkJRVEJDTEZsQlFURkNMRU5CUVZnc1EwRkJaanRCUVVOQkxGVkJRVk1zVDBGQlZDeERRVUZwUWp0QlFVRkJMRk5CUVZNc1RVRkJUU3hsUVVGT0xFTkJRWE5DTEUxQlFYUkNMRU5CUVZRN1FVRkJRU3hGUVVGcVFqdEJRVU5CTEVOQlNFUTdPMEZCUzBFc1NVRkJUU3hwUWtGQmFVSXNVMEZCYWtJc1kwRkJhVUlzUTBGQlF5eEpRVUZFTEVWQlFWVTdRVUZEYUVNc1MwRkJTU3hYUVVGWExGVkJRVlVzYVVKQlFWWXNSMEZCT0VJc2EwSkJRVGRETzBGQlEwRXNTMEZCU1N4bFFVRmxMRU5CUVVNc1QwRkJSQ3hIUVVGWExHbENRVUZZTEVkQlFTdENMR3RDUVVGc1JEdEJRVU5CTEV0QlFVa3NWMEZCVnl4TlFVRk5MRWxCUVU0c1EwRkJWeXhUUVVGVExHZENRVUZVTEVOQlFUQkNMRkZCUVRGQ0xFTkJRVmdzUTBGQlpqczdRVUZGUVN4alFVRmhMRmxCUVdJN08wRkJSVUVzVVVGQlR5eFRRVUZUTEVsQlFWUXNRMEZCWXl4cFFrRkJVenRCUVVNM1FpeE5RVUZKTEU5QlFVOHNUVUZCVFN4clFrRkJha0k3UVVGRFFTeFRRVUZQTEV0QlFVc3NVMEZCVEN4RFFVRmxMRU5CUVdZc1RVRkJjMElzU1VGQmRFSXNTVUZCT0VJc1MwRkJTeXhUUVVGTUxFTkJRV1VzUTBGQlppeE5RVUZ6UWl4TFFVRkxMRmRCUVV3c1JVRkJNMFE3UVVGRFFTeEZRVWhOTEVOQlFWQTdRVUZKUVN4RFFWaEVPenRCUVdOQkxFbEJRVTBzWlVGQlpTeFRRVUZtTEZsQlFXVXNSMEZCVFR0QlFVTXhRaXhMUVVGTkxIVkNRVUYxUWl4VFFVRjJRaXh2UWtGQmRVSXNRMEZCUXl4UFFVRkVMRVZCUVZVc1RVRkJWaXhGUVVGeFFqdEJRVU5xUkN4VlFVRlJMR2RDUVVGU0xFTkJRWGxDTEU5QlFYcENMRVZCUVd0RExGbEJRVTA3UVVGRGRrTXNUMEZCVFN4aFFVRmhMRk5CUVZNc1kwRkJWQ3hEUVVGM1FpeE5RVUY0UWl4RFFVRnVRanRCUVVOQkxFOUJRVWtzWlVGQlNqczdRVUZGUVN4UFFVRkpMRU5CUVVNc1QwRkJUQ3hGUVVGak8wRkJRMklzWVVGQlV5eFhRVUZYTEVkQlFWZ3NSMEZCYVVJc1UwRkJVeXhqUVVGVUxFTkJRWGRDTEdWQlFYaENMRU5CUVdwQ0xFZEJRVFJFTEZkQlFWY3NZVUZCV0N4RFFVRjVRaXhoUVVGNlFpeERRVUYxUXl4aFFVRjJReXhEUVVGeFJDeGhRVUZ5UkN4RFFVRnRSU3h6UWtGQmJrVXNRMEZCTUVZc1lVRkJNVVlzUTBGQmQwY3NNa0pCUVhoSExFTkJRWEpGTzBGQlEwRXNTVUZHUkN4TlFVVlBPMEZCUTA0c1lVRkJVeXhYUVVGWExFZEJRVmdzUjBGQmFVSXNVMEZCVXl4alFVRlVMRU5CUVhkQ0xHVkJRWGhDTEVOQlFXcENMRWRCUVRSRUxGZEJRVmNzWVVGQldDeERRVUY1UWl4aFFVRjZRaXhEUVVGMVF5eGhRVUYyUXl4RFFVRnhSQ3h6UWtGQmNrUXNRMEZCTkVVc1lVRkJOVVVzUTBGQk1FWXNNa0pCUVRGR0xFTkJRWEpGTzBGQlEwRTdPMEZCUlVRc1ZVRkJUeXhqUVVGUUxFTkJRWE5DTEVWQlFVTXNWVUZCVlN4UlFVRllMRVZCUVhGQ0xFOUJRVThzVDBGQk5VSXNSVUZCZEVJN1FVRkRRU3hIUVZoRU8wRkJXVUVzUlVGaVJEczdRVUZsUVN4TFFVRkpMR2RDUVVGblFpeEZRVUZ3UWp0QlFVTkJMRXRCUVVrc1UwRkJVeXhUUVVGVExHRkJRVlFzUTBGQmRVSXNiMEpCUVhaQ0xFTkJRV0k3UVVGRFFTeFJRVUZQTEZOQlFWQXNSMEZCYlVJc1JVRkJia0k3TzBGQlJVRXNWVUZCVXl4UFFVRlVMRU5CUVdsQ0xHdENRVUZWTzBGQlF6RkNMRTFCUVVrc1kwRkJZeXhsUVVGbExFMUJRV1lzUTBGQmJFSTdRVUZEUVN4TlFVRkpMRlZCUVZVc1UwRkJVeXhoUVVGVUxFTkJRWFZDTEVkQlFYWkNMRU5CUVdRN08wRkJSVUVzVFVGQlNTeERRVUZETEZkQlFVd3NSVUZCYTBJN08wRkJSV3hDTEdOQlFWa3NSVUZCV2l4SFFVRnBRaXhOUVVGcVFqdEJRVU5CTEZWQlFWRXNVMEZCVWl4SFFVRnZRaXhQUVVGUExGZEJRVkFzUlVGQmNFSTdRVUZEUVN4VlFVRlJMRk5CUVZJc1IwRkJiMElzZVVKQlFYQkNPenRCUVVWQkxIVkNRVUZ4UWl4UFFVRnlRaXhGUVVFNFFpeE5RVUU1UWp0QlFVTkJMRk5CUVU4c1YwRkJVQ3hEUVVGdFFpeFBRVUZ1UWp0QlFVTkJMRVZCV2tRN1FVRmhRU3hEUVdwRFJEczdRVUZ0UTBFc1NVRkJUU3hsUVVGbExGTkJRV1lzV1VGQlpTeERRVUZETEUxQlFVUXNSVUZCVXl4UFFVRlVMRVZCUVhGQ08wRkJRM3BETEZGQlFVOHNUMEZCVUN4RFFVRmxMR2xDUVVGVE8wRkJRM1pDTEUxQlFVMHNLMEpCUVRaQ0xFdEJRVzVETzBGQlEwRXNUVUZCU1N4UFFVRlBMRk5CUVZNc1lVRkJWQ3hEUVVGMVFpeExRVUYyUWl4RFFVRllPMEZCUTBFc1QwRkJTeXhUUVVGTUxFZEJRV2xDTEdWQlFXcENPMEZCUTBFc1QwRkJTeXhIUVVGTUxFZEJRVmNzUjBGQldEdEJRVU5CTEZWQlFWRXNWMEZCVWl4RFFVRnZRaXhKUVVGd1FqdEJRVU5CTEVWQlRrUTdRVUZQUVN4RFFWSkVPenRCUVZWQkxFbEJRVTBzWjBKQlFXZENMRk5CUVdoQ0xHRkJRV2RDTEVkQlFVMDdRVUZETTBJc1MwRkJTU3hsUVVGbExGTkJRVk1zWTBGQlZDeERRVUYzUWl4VFFVRjRRaXhEUVVGdVFqdEJRVU5CTEV0QlFVa3NZMEZCWXl4VlFVRlZMRkZCUVZFc1QwRkJiRUlzUjBGQk5FSXNVVUZCVVN4UlFVRjBSRHM3UVVGRlFTeGpRVUZoTEZOQlFXSXNSMEZCZVVJc1JVRkJla0k3TzBGQlJVRXNZVUZCV1N4UFFVRmFMRU5CUVc5Q0xHbENRVUZUTzBGQlFVRXNUVUZEZEVJc1MwRkVjMElzUjBGRGMwTXNTMEZFZEVNc1EwRkRkRUlzUzBGRWMwSTdRVUZCUVN4TlFVTm1MRkZCUkdVc1IwRkRjME1zUzBGRWRFTXNRMEZEWml4UlFVUmxPMEZCUVVFc1RVRkRUQ3hUUVVSTExFZEJRM05ETEV0QlJIUkRMRU5CUTB3c1UwRkVTenRCUVVGQkxFMUJRMDBzVFVGRVRpeEhRVU56UXl4TFFVUjBReXhEUVVOTkxFMUJSRTQ3UVVGQlFTeE5RVU5qTEZkQlJHUXNSMEZEYzBNc1MwRkVkRU1zUTBGRFl5eFhRVVJrTzBGQlFVRXNUVUZETWtJc1RVRkVNMElzUjBGRGMwTXNTMEZFZEVNc1EwRkRNa0lzVFVGRU0wSTdPenRCUVVjMVFpeGxRVUZoTEd0Q1FVRmlMRU5CUVdkRExGZEJRV2hETEVWQlFUWkRMSGxDUVVFM1F6czdRVUZGUVN4TlFVRkpMR1ZCUVdVc1UwRkJVeXhuUWtGQlZDeERRVUV3UWl4M1FrRkJNVUlzUTBGQmJrSTdRVUZEUVN4TlFVRkpMRlZCUVZVc1lVRkJZU3hoUVVGaExFMUJRV0lzUjBGQmMwSXNRMEZCYmtNc1EwRkJaRHM3UVVGRlFTeE5RVUZKTEU5QlFVOHNUVUZCV0N4RlFVRnRRaXhoUVVGaExFMUJRV0lzUlVGQmNVSXNUMEZCY2tJN08wRkJSVzVDTEUxQlFVa3NiMEpCUVc5Q0xGTkJRVk1zWVVGQlZDeERRVUYxUWl4TFFVRjJRaXhEUVVGNFFqdEJRVU5CTEUxQlFVa3NiVUpCUVcxQ0xGTkJRVk1zWVVGQlZDeERRVUYxUWl4SFFVRjJRaXhEUVVGMlFqdEJRVU5CTEUxQlFVa3NZMEZCWXl4VFFVRlRMR0ZCUVZRc1EwRkJkVUlzUjBGQmRrSXNRMEZCYkVJN1FVRkRRU3h2UWtGQmEwSXNVMEZCYkVJc1EwRkJORUlzUjBGQk5VSXNRMEZCWjBNc05FSkJRV2hETzBGQlEwRXNiVUpCUVdsQ0xGTkJRV3BDTEVOQlFUSkNMRWRCUVROQ0xFTkJRU3RDTEhGQ1FVRXZRanRCUVVOQkxHTkJRVmtzVTBGQldpeERRVUZ6UWl4SFFVRjBRaXhEUVVFd1FpeG5Ra0ZCTVVJN08wRkJSVUVzYlVKQlFXbENMRk5CUVdwQ0xFZEJRVFpDTEZkQlFUZENPMEZCUTBFc1kwRkJXU3hUUVVGYUxFZEJRWGRDTEUxQlFYaENPenRCUVVWQkxHOUNRVUZyUWl4WFFVRnNRaXhEUVVFNFFpeG5Ra0ZCT1VJc1JVRkJaMFFzVjBGQmFFUTdRVUZEUVN4VlFVRlJMRmRCUVZJc1EwRkJiMElzYVVKQlFYQkNPenRCUVVWQkxFMUJRVWtzWTBGQll5eFRRVUZUTEdkQ1FVRlVMRU5CUVRCQ0xIbENRVUV4UWl4RFFVRnNRanRCUVVOQkxFMUJRVWtzVTBGQlV5eFpRVUZaTEZsQlFWa3NUVUZCV2l4SFFVRnhRaXhEUVVGcVF5eERRVUZpT3p0QlFVVkJMRTFCUVVrc1kwRkJZeXhUUVVGVExHZENRVUZVTEVOQlFUQkNMQ3RDUVVFeFFpeERRVUZzUWp0QlFVTkJMRTFCUVVrc1UwRkJVeXhaUVVGWkxGbEJRVmtzVFVGQldpeEhRVUZ4UWl4RFFVRnFReXhEUVVGaU96dEJRVVZCTEUxQlFVa3NZVUZCWVN4VFFVRlRMR2RDUVVGVUxFTkJRVEJDTERoQ1FVRXhRaXhEUVVGcVFqdEJRVU5CTEUxQlFVa3NVVUZCVVN4WFFVRlhMRmRCUVZjc1RVRkJXQ3hIUVVGdlFpeERRVUV2UWl4RFFVRmFPenRCUVVWQkxGTkJRVThzVTBGQlVDeEhRVUZ0UWl4TFFVRnVRanRCUVVOQkxGTkJRVThzVTBGQlVDeEhRVUZ0UWl4VFFVRnVRanRCUVVOQkxGRkJRVTBzVTBGQlRpeEhRVUZyUWl4UlFVRnNRanRCUVVWQkxFVkJjRU5FT3p0QlFYTkRRVHRCUVVOQk8wRkJRMEVzUTBFNVEwUTdPMEZCWjBSQk8wRkJRMEVzU1VGQlRTeGpRVUZqTEZOQlFXUXNWMEZCWXl4SFFVRk5PMEZCUTNwQ0xGTkJRVkVzVDBGQlVpeERRVUZuUWl4SlFVRm9RaXhEUVVGeFFpeFZRVUZETEVOQlFVUXNSVUZCU1N4RFFVRktMRVZCUVZVN1FVRkRPVUlzVFVGQlNTeFRRVUZUTEVWQlFVVXNTMEZCUml4RFFVRlJMRU5CUVZJc1JVRkJWeXhYUVVGWUxFVkJRV0k3UVVGRFFTeE5RVUZKTEZOQlFWTXNSVUZCUlN4TFFVRkdMRU5CUVZFc1EwRkJVaXhGUVVGWExGZEJRVmdzUlVGQllqdEJRVU5CTEUxQlFVa3NVMEZCVXl4TlFVRmlMRVZCUVhGQ0xFOUJRVThzUTBGQlVDeERRVUZ5UWl4TFFVTkxMRWxCUVVrc1UwRkJVeXhOUVVGaUxFVkJRWEZDTEU5QlFVOHNRMEZCUXl4RFFVRlNMRU5CUVhKQ0xFdEJRMEVzVDBGQlR5eERRVUZRTzBGQlEwd3NSVUZPUkR0QlFVOUJMRU5CVWtRN08wRkJWVUVzU1VGQlRTeFZRVUZWTEZOQlFWWXNUMEZCVlN4RFFVRkRMRWxCUVVRc1JVRkJWVHRCUVVONlFpeFRRVUZSTEZGQlFWSXNSMEZCYlVJc1NVRkJia0k3UVVGRFFTeFRRVUZSTEU5QlFWSXNSMEZCYTBJc1MwRkJTeXhMUVVGTUxFVkJRV3hDTzBGQlEwRTdRVUZEUVR0QlFVTkJMRU5CVEVRN08wRkJUMEVzU1VGQlRTeFpRVUZaTEZOQlFWb3NVMEZCV1N4SFFVRk5PMEZCUTNSQ0xFOUJRVTBzUlVGQlRpeEZRVUZWTEVsQlFWWXNRMEZCWlR0QlFVRkJMRk5CUTJRc1NVRkJTU3hKUVVGS0xFVkJSR003UVVGQlFTeEZRVUZtTEVWQlJVVXNTVUZHUml4RFFVVlBMR2RDUVVGUk8wRkJRMlFzVlVGQlVTeEpRVUZTTzBGQlEwRXNSVUZLUkN4RlFVdERMRWxCVEVRc1EwRkxUU3haUVVGTk8wRkJRMWdzVjBGQlV5eFBRVUZVTEVOQlFXbENPMEZCUVVFc1ZVRkJVU3hMUVVGTExGTkJRVXdzUTBGQlpTeEhRVUZtTEVOQlFXMUNMRTlCUVc1Q0xFTkJRVkk3UVVGQlFTeEhRVUZxUWp0QlFVTkJMRTlCUVVzc1UwRkJUQ3hEUVVGbExFZEJRV1lzUTBGQmJVSXNUMEZCYmtJN1FVRkRRU3hGUVZKRUxFVkJVME1zUzBGVVJDeERRVk5QTzBGQlFVRXNVMEZCVHl4UlFVRlJMRWxCUVZJc1EwRkJZU3hIUVVGaUxFTkJRVkE3UVVGQlFTeEZRVlJRTzBGQlZVUXNRMEZZUkRzN1FVRmhRU3hKUVVGTkxFOUJRVThzVTBGQlVDeEpRVUZQTEVkQlFVMDdRVUZEYkVJN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRXNRMEZRUkRzN1FVRlRRVHM3T3pzN096czdRVU4yVWtFc1NVRkJUU3h2YkVKQlFVNDdPMEZCWjBKQkxFbEJRVTBzVVVGQlVTeFRRVUZTTEV0QlFWRXNSMEZCVFR0QlFVTnVRaXhMUVVGSkxGZEJRVmNzVTBGQlV5eGpRVUZVTEVOQlFYZENMRkZCUVhoQ0xFTkJRV1k3UVVGRFFTeFZRVUZUTEZOQlFWUXNSMEZCY1VJc1VVRkJja0k3UVVGRFFTeERRVWhFT3p0clFrRkxaU3hMSWl3aVptbHNaU0k2SW1kbGJtVnlZWFJsWkM1cWN5SXNJbk52ZFhKalpWSnZiM1FpT2lJaUxDSnpiM1Z5WTJWelEyOXVkR1Z1ZENJNld5SW9ablZ1WTNScGIyNG9LWHRtZFc1amRHbHZiaUJ5S0dVc2JpeDBLWHRtZFc1amRHbHZiaUJ2S0drc1ppbDdhV1lvSVc1YmFWMHBlMmxtS0NGbFcybGRLWHQyWVhJZ1l6MWNJbVoxYm1OMGFXOXVYQ0k5UFhSNWNHVnZaaUJ5WlhGMWFYSmxKaVp5WlhGMWFYSmxPMmxtS0NGbUppWmpLWEpsZEhWeWJpQmpLR2tzSVRBcE8ybG1LSFVwY21WMGRYSnVJSFVvYVN3aE1DazdkbUZ5SUdFOWJtVjNJRVZ5Y205eUtGd2lRMkZ1Ym05MElHWnBibVFnYlc5a2RXeGxJQ2RjSWl0cEsxd2lKMXdpS1R0MGFISnZkeUJoTG1OdlpHVTlYQ0pOVDBSVlRFVmZUazlVWDBaUFZVNUVYQ0lzWVgxMllYSWdjRDF1VzJsZFBYdGxlSEJ2Y25Sek9udDlmVHRsVzJsZFd6QmRMbU5oYkd3b2NDNWxlSEJ2Y25SekxHWjFibU4wYVc5dUtISXBlM1poY2lCdVBXVmJhVjFiTVYxYmNsMDdjbVYwZFhKdUlHOG9ibng4Y2lsOUxIQXNjQzVsZUhCdmNuUnpMSElzWlN4dUxIUXBmWEpsZEhWeWJpQnVXMmxkTG1WNGNHOXlkSE45Wm05eUtIWmhjaUIxUFZ3aVpuVnVZM1JwYjI1Y0lqMDlkSGx3Wlc5bUlISmxjWFZwY21VbUpuSmxjWFZwY21Vc2FUMHdPMms4ZEM1c1pXNW5kR2c3YVNzcktXOG9kRnRwWFNrN2NtVjBkWEp1SUc5OWNtVjBkWEp1SUhKOUtTZ3BJaXdpS0daMWJtTjBhVzl1S0hObGJHWXBJSHRjYmlBZ0ozVnpaU0J6ZEhKcFkzUW5PMXh1WEc0Z0lHbG1JQ2h6Wld4bUxtWmxkR05vS1NCN1hHNGdJQ0FnY21WMGRYSnVYRzRnSUgxY2JseHVJQ0IyWVhJZ2MzVndjRzl5ZENBOUlIdGNiaUFnSUNCelpXRnlZMmhRWVhKaGJYTTZJQ2RWVWt4VFpXRnlZMmhRWVhKaGJYTW5JR2x1SUhObGJHWXNYRzRnSUNBZ2FYUmxjbUZpYkdVNklDZFRlVzFpYjJ3bklHbHVJSE5sYkdZZ0ppWWdKMmwwWlhKaGRHOXlKeUJwYmlCVGVXMWliMndzWEc0Z0lDQWdZbXh2WWpvZ0owWnBiR1ZTWldGa1pYSW5JR2x1SUhObGJHWWdKaVlnSjBKc2IySW5JR2x1SUhObGJHWWdKaVlnS0daMWJtTjBhVzl1S0NrZ2UxeHVJQ0FnSUNBZ2RISjVJSHRjYmlBZ0lDQWdJQ0FnYm1WM0lFSnNiMklvS1Z4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnZEhKMVpWeHVJQ0FnSUNBZ2ZTQmpZWFJqYUNobEtTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQm1ZV3h6WlZ4dUlDQWdJQ0FnZlZ4dUlDQWdJSDBwS0Nrc1hHNGdJQ0FnWm05eWJVUmhkR0U2SUNkR2IzSnRSR0YwWVNjZ2FXNGdjMlZzWml4Y2JpQWdJQ0JoY25KaGVVSjFabVpsY2pvZ0owRnljbUY1UW5WbVptVnlKeUJwYmlCelpXeG1YRzRnSUgxY2JseHVJQ0JwWmlBb2MzVndjRzl5ZEM1aGNuSmhlVUoxWm1abGNpa2dlMXh1SUNBZ0lIWmhjaUIyYVdWM1EyeGhjM05sY3lBOUlGdGNiaUFnSUNBZ0lDZGJiMkpxWldOMElFbHVkRGhCY25KaGVWMG5MRnh1SUNBZ0lDQWdKMXR2WW1wbFkzUWdWV2x1ZERoQmNuSmhlVjBuTEZ4dUlDQWdJQ0FnSjF0dlltcGxZM1FnVldsdWREaERiR0Z0Y0dWa1FYSnlZWGxkSnl4Y2JpQWdJQ0FnSUNkYmIySnFaV04wSUVsdWRERTJRWEp5WVhsZEp5eGNiaUFnSUNBZ0lDZGJiMkpxWldOMElGVnBiblF4TmtGeWNtRjVYU2NzWEc0Z0lDQWdJQ0FuVzI5aWFtVmpkQ0JKYm5Rek1rRnljbUY1WFNjc1hHNGdJQ0FnSUNBblcyOWlhbVZqZENCVmFXNTBNekpCY25KaGVWMG5MRnh1SUNBZ0lDQWdKMXR2WW1wbFkzUWdSbXh2WVhRek1rRnljbUY1WFNjc1hHNGdJQ0FnSUNBblcyOWlhbVZqZENCR2JHOWhkRFkwUVhKeVlYbGRKMXh1SUNBZ0lGMWNibHh1SUNBZ0lIWmhjaUJwYzBSaGRHRldhV1YzSUQwZ1puVnVZM1JwYjI0b2IySnFLU0I3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdiMkpxSUNZbUlFUmhkR0ZXYVdWM0xuQnliM1J2ZEhsd1pTNXBjMUJ5YjNSdmRIbHdaVTltS0c5aWFpbGNiaUFnSUNCOVhHNWNiaUFnSUNCMllYSWdhWE5CY25KaGVVSjFabVpsY2xacFpYY2dQU0JCY25KaGVVSjFabVpsY2k1cGMxWnBaWGNnZkh3Z1puVnVZM1JwYjI0b2IySnFLU0I3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdiMkpxSUNZbUlIWnBaWGREYkdGemMyVnpMbWx1WkdWNFQyWW9UMkpxWldOMExuQnliM1J2ZEhsd1pTNTBiMU4wY21sdVp5NWpZV3hzS0c5aWFpa3BJRDRnTFRGY2JpQWdJQ0I5WEc0Z0lIMWNibHh1SUNCbWRXNWpkR2x2YmlCdWIzSnRZV3hwZW1WT1lXMWxLRzVoYldVcElIdGNiaUFnSUNCcFppQW9kSGx3Wlc5bUlHNWhiV1VnSVQwOUlDZHpkSEpwYm1jbktTQjdYRzRnSUNBZ0lDQnVZVzFsSUQwZ1UzUnlhVzVuS0c1aGJXVXBYRzRnSUNBZ2ZWeHVJQ0FnSUdsbUlDZ3ZXMTVoTFhvd0xUbGNYQzBqSkNVbUp5b3JMbHhjWGw5Z2ZINWRMMmt1ZEdWemRDaHVZVzFsS1NrZ2UxeHVJQ0FnSUNBZ2RHaHliM2NnYm1WM0lGUjVjR1ZGY25KdmNpZ25TVzUyWVd4cFpDQmphR0Z5WVdOMFpYSWdhVzRnYUdWaFpHVnlJR1pwWld4a0lHNWhiV1VuS1Z4dUlDQWdJSDFjYmlBZ0lDQnlaWFIxY200Z2JtRnRaUzUwYjB4dmQyVnlRMkZ6WlNncFhHNGdJSDFjYmx4dUlDQm1kVzVqZEdsdmJpQnViM0p0WVd4cGVtVldZV3gxWlNoMllXeDFaU2tnZTF4dUlDQWdJR2xtSUNoMGVYQmxiMllnZG1Gc2RXVWdJVDA5SUNkemRISnBibWNuS1NCN1hHNGdJQ0FnSUNCMllXeDFaU0E5SUZOMGNtbHVaeWgyWVd4MVpTbGNiaUFnSUNCOVhHNGdJQ0FnY21WMGRYSnVJSFpoYkhWbFhHNGdJSDFjYmx4dUlDQXZMeUJDZFdsc1pDQmhJR1JsYzNSeWRXTjBhWFpsSUdsMFpYSmhkRzl5SUdadmNpQjBhR1VnZG1Gc2RXVWdiR2x6ZEZ4dUlDQm1kVzVqZEdsdmJpQnBkR1Z5WVhSdmNrWnZjaWhwZEdWdGN5a2dlMXh1SUNBZ0lIWmhjaUJwZEdWeVlYUnZjaUE5SUh0Y2JpQWdJQ0FnSUc1bGVIUTZJR1oxYm1OMGFXOXVLQ2tnZTF4dUlDQWdJQ0FnSUNCMllYSWdkbUZzZFdVZ1BTQnBkR1Z0Y3k1emFHbG1kQ2dwWEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUI3Wkc5dVpUb2dkbUZzZFdVZ1BUMDlJSFZ1WkdWbWFXNWxaQ3dnZG1Gc2RXVTZJSFpoYkhWbGZWeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUgxY2JseHVJQ0FnSUdsbUlDaHpkWEJ3YjNKMExtbDBaWEpoWW14bEtTQjdYRzRnSUNBZ0lDQnBkR1Z5WVhSdmNsdFRlVzFpYjJ3dWFYUmxjbUYwYjNKZElEMGdablZ1WTNScGIyNG9LU0I3WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJwZEdWeVlYUnZjbHh1SUNBZ0lDQWdmVnh1SUNBZ0lIMWNibHh1SUNBZ0lISmxkSFZ5YmlCcGRHVnlZWFJ2Y2x4dUlDQjlYRzVjYmlBZ1puVnVZM1JwYjI0Z1NHVmhaR1Z5Y3lob1pXRmtaWEp6S1NCN1hHNGdJQ0FnZEdocGN5NXRZWEFnUFNCN2ZWeHVYRzRnSUNBZ2FXWWdLR2hsWVdSbGNuTWdhVzV6ZEdGdVkyVnZaaUJJWldGa1pYSnpLU0I3WEc0Z0lDQWdJQ0JvWldGa1pYSnpMbVp2Y2tWaFkyZ29ablZ1WTNScGIyNG9kbUZzZFdVc0lHNWhiV1VwSUh0Y2JpQWdJQ0FnSUNBZ2RHaHBjeTVoY0hCbGJtUW9ibUZ0WlN3Z2RtRnNkV1VwWEc0Z0lDQWdJQ0I5TENCMGFHbHpLVnh1SUNBZ0lIMGdaV3h6WlNCcFppQW9RWEp5WVhrdWFYTkJjbkpoZVNob1pXRmtaWEp6S1NrZ2UxeHVJQ0FnSUNBZ2FHVmhaR1Z5Y3k1bWIzSkZZV05vS0daMWJtTjBhVzl1S0dobFlXUmxjaWtnZTF4dUlDQWdJQ0FnSUNCMGFHbHpMbUZ3Y0dWdVpDaG9aV0ZrWlhKYk1GMHNJR2hsWVdSbGNsc3hYU2xjYmlBZ0lDQWdJSDBzSUhSb2FYTXBYRzRnSUNBZ2ZTQmxiSE5sSUdsbUlDaG9aV0ZrWlhKektTQjdYRzRnSUNBZ0lDQlBZbXBsWTNRdVoyVjBUM2R1VUhKdmNHVnlkSGxPWVcxbGN5aG9aV0ZrWlhKektTNW1iM0pGWVdOb0tHWjFibU4wYVc5dUtHNWhiV1VwSUh0Y2JpQWdJQ0FnSUNBZ2RHaHBjeTVoY0hCbGJtUW9ibUZ0WlN3Z2FHVmhaR1Z5YzF0dVlXMWxYU2xjYmlBZ0lDQWdJSDBzSUhSb2FYTXBYRzRnSUNBZ2ZWeHVJQ0I5WEc1Y2JpQWdTR1ZoWkdWeWN5NXdjbTkwYjNSNWNHVXVZWEJ3Wlc1a0lEMGdablZ1WTNScGIyNG9ibUZ0WlN3Z2RtRnNkV1VwSUh0Y2JpQWdJQ0J1WVcxbElEMGdibTl5YldGc2FYcGxUbUZ0WlNodVlXMWxLVnh1SUNBZ0lIWmhiSFZsSUQwZ2JtOXliV0ZzYVhwbFZtRnNkV1VvZG1Gc2RXVXBYRzRnSUNBZ2RtRnlJRzlzWkZaaGJIVmxJRDBnZEdocGN5NXRZWEJiYm1GdFpWMWNiaUFnSUNCMGFHbHpMbTFoY0Z0dVlXMWxYU0E5SUc5c1pGWmhiSFZsSUQ4Z2IyeGtWbUZzZFdVckp5d25LM1poYkhWbElEb2dkbUZzZFdWY2JpQWdmVnh1WEc0Z0lFaGxZV1JsY25NdWNISnZkRzkwZVhCbFd5ZGtaV3hsZEdVblhTQTlJR1oxYm1OMGFXOXVLRzVoYldVcElIdGNiaUFnSUNCa1pXeGxkR1VnZEdocGN5NXRZWEJiYm05eWJXRnNhWHBsVG1GdFpTaHVZVzFsS1YxY2JpQWdmVnh1WEc0Z0lFaGxZV1JsY25NdWNISnZkRzkwZVhCbExtZGxkQ0E5SUdaMWJtTjBhVzl1S0c1aGJXVXBJSHRjYmlBZ0lDQnVZVzFsSUQwZ2JtOXliV0ZzYVhwbFRtRnRaU2h1WVcxbEtWeHVJQ0FnSUhKbGRIVnliaUIwYUdsekxtaGhjeWh1WVcxbEtTQS9JSFJvYVhNdWJXRndXMjVoYldWZElEb2diblZzYkZ4dUlDQjlYRzVjYmlBZ1NHVmhaR1Z5Y3k1d2NtOTBiM1I1Y0dVdWFHRnpJRDBnWm5WdVkzUnBiMjRvYm1GdFpTa2dlMXh1SUNBZ0lISmxkSFZ5YmlCMGFHbHpMbTFoY0M1b1lYTlBkMjVRY205d1pYSjBlU2h1YjNKdFlXeHBlbVZPWVcxbEtHNWhiV1VwS1Z4dUlDQjlYRzVjYmlBZ1NHVmhaR1Z5Y3k1d2NtOTBiM1I1Y0dVdWMyVjBJRDBnWm5WdVkzUnBiMjRvYm1GdFpTd2dkbUZzZFdVcElIdGNiaUFnSUNCMGFHbHpMbTFoY0Z0dWIzSnRZV3hwZW1WT1lXMWxLRzVoYldVcFhTQTlJRzV2Y20xaGJHbDZaVlpoYkhWbEtIWmhiSFZsS1Z4dUlDQjlYRzVjYmlBZ1NHVmhaR1Z5Y3k1d2NtOTBiM1I1Y0dVdVptOXlSV0ZqYUNBOUlHWjFibU4wYVc5dUtHTmhiR3hpWVdOckxDQjBhR2x6UVhKbktTQjdYRzRnSUNBZ1ptOXlJQ2gyWVhJZ2JtRnRaU0JwYmlCMGFHbHpMbTFoY0NrZ2UxeHVJQ0FnSUNBZ2FXWWdLSFJvYVhNdWJXRndMbWhoYzA5M2JsQnliM0JsY25SNUtHNWhiV1VwS1NCN1hHNGdJQ0FnSUNBZ0lHTmhiR3hpWVdOckxtTmhiR3dvZEdocGMwRnlaeXdnZEdocGN5NXRZWEJiYm1GdFpWMHNJRzVoYldVc0lIUm9hWE1wWEc0Z0lDQWdJQ0I5WEc0Z0lDQWdmVnh1SUNCOVhHNWNiaUFnU0dWaFpHVnljeTV3Y205MGIzUjVjR1V1YTJWNWN5QTlJR1oxYm1OMGFXOXVLQ2tnZTF4dUlDQWdJSFpoY2lCcGRHVnRjeUE5SUZ0ZFhHNGdJQ0FnZEdocGN5NW1iM0pGWVdOb0tHWjFibU4wYVc5dUtIWmhiSFZsTENCdVlXMWxLU0I3SUdsMFpXMXpMbkIxYzJnb2JtRnRaU2tnZlNsY2JpQWdJQ0J5WlhSMWNtNGdhWFJsY21GMGIzSkdiM0lvYVhSbGJYTXBYRzRnSUgxY2JseHVJQ0JJWldGa1pYSnpMbkJ5YjNSdmRIbHdaUzUyWVd4MVpYTWdQU0JtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0IyWVhJZ2FYUmxiWE1nUFNCYlhWeHVJQ0FnSUhSb2FYTXVabTl5UldGamFDaG1kVzVqZEdsdmJpaDJZV3gxWlNrZ2V5QnBkR1Z0Y3k1d2RYTm9LSFpoYkhWbEtTQjlLVnh1SUNBZ0lISmxkSFZ5YmlCcGRHVnlZWFJ2Y2tadmNpaHBkR1Z0Y3lsY2JpQWdmVnh1WEc0Z0lFaGxZV1JsY25NdWNISnZkRzkwZVhCbExtVnVkSEpwWlhNZ1BTQm1kVzVqZEdsdmJpZ3BJSHRjYmlBZ0lDQjJZWElnYVhSbGJYTWdQU0JiWFZ4dUlDQWdJSFJvYVhNdVptOXlSV0ZqYUNobWRXNWpkR2x2YmloMllXeDFaU3dnYm1GdFpTa2dleUJwZEdWdGN5NXdkWE5vS0Z0dVlXMWxMQ0IyWVd4MVpWMHBJSDBwWEc0Z0lDQWdjbVYwZFhKdUlHbDBaWEpoZEc5eVJtOXlLR2wwWlcxektWeHVJQ0I5WEc1Y2JpQWdhV1lnS0hOMWNIQnZjblF1YVhSbGNtRmliR1VwSUh0Y2JpQWdJQ0JJWldGa1pYSnpMbkJ5YjNSdmRIbHdaVnRUZVcxaWIyd3VhWFJsY21GMGIzSmRJRDBnU0dWaFpHVnljeTV3Y205MGIzUjVjR1V1Wlc1MGNtbGxjMXh1SUNCOVhHNWNiaUFnWm5WdVkzUnBiMjRnWTI5dWMzVnRaV1FvWW05a2VTa2dlMXh1SUNBZ0lHbG1JQ2hpYjJSNUxtSnZaSGxWYzJWa0tTQjdYRzRnSUNBZ0lDQnlaWFIxY200Z1VISnZiV2x6WlM1eVpXcGxZM1FvYm1WM0lGUjVjR1ZGY25KdmNpZ25RV3h5WldGa2VTQnlaV0ZrSnlrcFhHNGdJQ0FnZlZ4dUlDQWdJR0p2WkhrdVltOWtlVlZ6WldRZ1BTQjBjblZsWEc0Z0lIMWNibHh1SUNCbWRXNWpkR2x2YmlCbWFXeGxVbVZoWkdWeVVtVmhaSGtvY21WaFpHVnlLU0I3WEc0Z0lDQWdjbVYwZFhKdUlHNWxkeUJRY205dGFYTmxLR1oxYm1OMGFXOXVLSEpsYzI5c2RtVXNJSEpsYW1WamRDa2dlMXh1SUNBZ0lDQWdjbVZoWkdWeUxtOXViRzloWkNBOUlHWjFibU4wYVc5dUtDa2dlMXh1SUNBZ0lDQWdJQ0J5WlhOdmJIWmxLSEpsWVdSbGNpNXlaWE4xYkhRcFhHNGdJQ0FnSUNCOVhHNGdJQ0FnSUNCeVpXRmtaWEl1YjI1bGNuSnZjaUE5SUdaMWJtTjBhVzl1S0NrZ2UxeHVJQ0FnSUNBZ0lDQnlaV3BsWTNRb2NtVmhaR1Z5TG1WeWNtOXlLVnh1SUNBZ0lDQWdmVnh1SUNBZ0lIMHBYRzRnSUgxY2JseHVJQ0JtZFc1amRHbHZiaUJ5WldGa1FteHZZa0Z6UVhKeVlYbENkV1ptWlhJb1lteHZZaWtnZTF4dUlDQWdJSFpoY2lCeVpXRmtaWElnUFNCdVpYY2dSbWxzWlZKbFlXUmxjaWdwWEc0Z0lDQWdkbUZ5SUhCeWIyMXBjMlVnUFNCbWFXeGxVbVZoWkdWeVVtVmhaSGtvY21WaFpHVnlLVnh1SUNBZ0lISmxZV1JsY2k1eVpXRmtRWE5CY25KaGVVSjFabVpsY2loaWJHOWlLVnh1SUNBZ0lISmxkSFZ5YmlCd2NtOXRhWE5sWEc0Z0lIMWNibHh1SUNCbWRXNWpkR2x2YmlCeVpXRmtRbXh2WWtGelZHVjRkQ2hpYkc5aUtTQjdYRzRnSUNBZ2RtRnlJSEpsWVdSbGNpQTlJRzVsZHlCR2FXeGxVbVZoWkdWeUtDbGNiaUFnSUNCMllYSWdjSEp2YldselpTQTlJR1pwYkdWU1pXRmtaWEpTWldGa2VTaHlaV0ZrWlhJcFhHNGdJQ0FnY21WaFpHVnlMbkpsWVdSQmMxUmxlSFFvWW14dllpbGNiaUFnSUNCeVpYUjFjbTRnY0hKdmJXbHpaVnh1SUNCOVhHNWNiaUFnWm5WdVkzUnBiMjRnY21WaFpFRnljbUY1UW5WbVptVnlRWE5VWlhoMEtHSjFaaWtnZTF4dUlDQWdJSFpoY2lCMmFXVjNJRDBnYm1WM0lGVnBiblE0UVhKeVlYa29ZblZtS1Z4dUlDQWdJSFpoY2lCamFHRnljeUE5SUc1bGR5QkJjbkpoZVNoMmFXVjNMbXhsYm1kMGFDbGNibHh1SUNBZ0lHWnZjaUFvZG1GeUlHa2dQU0F3T3lCcElEd2dkbWxsZHk1c1pXNW5kR2c3SUdrckt5a2dlMXh1SUNBZ0lDQWdZMmhoY25OYmFWMGdQU0JUZEhKcGJtY3Vabkp2YlVOb1lYSkRiMlJsS0hacFpYZGJhVjBwWEc0Z0lDQWdmVnh1SUNBZ0lISmxkSFZ5YmlCamFHRnljeTVxYjJsdUtDY25LVnh1SUNCOVhHNWNiaUFnWm5WdVkzUnBiMjRnWW5WbVptVnlRMnh2Ym1Vb1luVm1LU0I3WEc0Z0lDQWdhV1lnS0dKMVppNXpiR2xqWlNrZ2UxeHVJQ0FnSUNBZ2NtVjBkWEp1SUdKMVppNXpiR2xqWlNnd0tWeHVJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0IyWVhJZ2RtbGxkeUE5SUc1bGR5QlZhVzUwT0VGeWNtRjVLR0oxWmk1aWVYUmxUR1Z1WjNSb0tWeHVJQ0FnSUNBZ2RtbGxkeTV6WlhRb2JtVjNJRlZwYm5RNFFYSnlZWGtvWW5WbUtTbGNiaUFnSUNBZ0lISmxkSFZ5YmlCMmFXVjNMbUoxWm1abGNseHVJQ0FnSUgxY2JpQWdmVnh1WEc0Z0lHWjFibU4wYVc5dUlFSnZaSGtvS1NCN1hHNGdJQ0FnZEdocGN5NWliMlI1VlhObFpDQTlJR1poYkhObFhHNWNiaUFnSUNCMGFHbHpMbDlwYm1sMFFtOWtlU0E5SUdaMWJtTjBhVzl1S0dKdlpIa3BJSHRjYmlBZ0lDQWdJSFJvYVhNdVgySnZaSGxKYm1sMElEMGdZbTlrZVZ4dUlDQWdJQ0FnYVdZZ0tDRmliMlI1S1NCN1hHNGdJQ0FnSUNBZ0lIUm9hWE11WDJKdlpIbFVaWGgwSUQwZ0p5ZGNiaUFnSUNBZ0lIMGdaV3h6WlNCcFppQW9kSGx3Wlc5bUlHSnZaSGtnUFQwOUlDZHpkSEpwYm1jbktTQjdYRzRnSUNBZ0lDQWdJSFJvYVhNdVgySnZaSGxVWlhoMElEMGdZbTlrZVZ4dUlDQWdJQ0FnZlNCbGJITmxJR2xtSUNoemRYQndiM0owTG1Kc2IySWdKaVlnUW14dllpNXdjbTkwYjNSNWNHVXVhWE5RY205MGIzUjVjR1ZQWmloaWIyUjVLU2tnZTF4dUlDQWdJQ0FnSUNCMGFHbHpMbDlpYjJSNVFteHZZaUE5SUdKdlpIbGNiaUFnSUNBZ0lIMGdaV3h6WlNCcFppQW9jM1Z3Y0c5eWRDNW1iM0p0UkdGMFlTQW1KaUJHYjNKdFJHRjBZUzV3Y205MGIzUjVjR1V1YVhOUWNtOTBiM1I1Y0dWUFppaGliMlI1S1NrZ2UxeHVJQ0FnSUNBZ0lDQjBhR2x6TGw5aWIyUjVSbTl5YlVSaGRHRWdQU0JpYjJSNVhHNGdJQ0FnSUNCOUlHVnNjMlVnYVdZZ0tITjFjSEJ2Y25RdWMyVmhjbU5vVUdGeVlXMXpJQ1ltSUZWU1RGTmxZWEpqYUZCaGNtRnRjeTV3Y205MGIzUjVjR1V1YVhOUWNtOTBiM1I1Y0dWUFppaGliMlI1S1NrZ2UxeHVJQ0FnSUNBZ0lDQjBhR2x6TGw5aWIyUjVWR1Y0ZENBOUlHSnZaSGt1ZEc5VGRISnBibWNvS1Z4dUlDQWdJQ0FnZlNCbGJITmxJR2xtSUNoemRYQndiM0owTG1GeWNtRjVRblZtWm1WeUlDWW1JSE4xY0hCdmNuUXVZbXh2WWlBbUppQnBjMFJoZEdGV2FXVjNLR0p2WkhrcEtTQjdYRzRnSUNBZ0lDQWdJSFJvYVhNdVgySnZaSGxCY25KaGVVSjFabVpsY2lBOUlHSjFabVpsY2tOc2IyNWxLR0p2WkhrdVluVm1abVZ5S1Z4dUlDQWdJQ0FnSUNBdkx5QkpSU0F4TUMweE1TQmpZVzRuZENCb1lXNWtiR1VnWVNCRVlYUmhWbWxsZHlCaWIyUjVMbHh1SUNBZ0lDQWdJQ0IwYUdsekxsOWliMlI1U1c1cGRDQTlJRzVsZHlCQ2JHOWlLRnQwYUdsekxsOWliMlI1UVhKeVlYbENkV1ptWlhKZEtWeHVJQ0FnSUNBZ2ZTQmxiSE5sSUdsbUlDaHpkWEJ3YjNKMExtRnljbUY1UW5WbVptVnlJQ1ltSUNoQmNuSmhlVUoxWm1abGNpNXdjbTkwYjNSNWNHVXVhWE5RY205MGIzUjVjR1ZQWmloaWIyUjVLU0I4ZkNCcGMwRnljbUY1UW5WbVptVnlWbWxsZHloaWIyUjVLU2twSUh0Y2JpQWdJQ0FnSUNBZ2RHaHBjeTVmWW05a2VVRnljbUY1UW5WbVptVnlJRDBnWW5WbVptVnlRMnh2Ym1Vb1ltOWtlU2xjYmlBZ0lDQWdJSDBnWld4elpTQjdYRzRnSUNBZ0lDQWdJSFJvY205M0lHNWxkeUJGY25KdmNpZ25kVzV6ZFhCd2IzSjBaV1FnUW05a2VVbHVhWFFnZEhsd1pTY3BYRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJR2xtSUNnaGRHaHBjeTVvWldGa1pYSnpMbWRsZENnblkyOXVkR1Z1ZEMxMGVYQmxKeWtwSUh0Y2JpQWdJQ0FnSUNBZ2FXWWdLSFI1Y0dWdlppQmliMlI1SUQwOVBTQW5jM1J5YVc1bkp5a2dlMXh1SUNBZ0lDQWdJQ0FnSUhSb2FYTXVhR1ZoWkdWeWN5NXpaWFFvSjJOdmJuUmxiblF0ZEhsd1pTY3NJQ2QwWlhoMEwzQnNZV2x1TzJOb1lYSnpaWFE5VlZSR0xUZ25LVnh1SUNBZ0lDQWdJQ0I5SUdWc2MyVWdhV1lnS0hSb2FYTXVYMkp2WkhsQ2JHOWlJQ1ltSUhSb2FYTXVYMkp2WkhsQ2JHOWlMblI1Y0dVcElIdGNiaUFnSUNBZ0lDQWdJQ0IwYUdsekxtaGxZV1JsY25NdWMyVjBLQ2RqYjI1MFpXNTBMWFI1Y0dVbkxDQjBhR2x6TGw5aWIyUjVRbXh2WWk1MGVYQmxLVnh1SUNBZ0lDQWdJQ0I5SUdWc2MyVWdhV1lnS0hOMWNIQnZjblF1YzJWaGNtTm9VR0Z5WVcxeklDWW1JRlZTVEZObFlYSmphRkJoY21GdGN5NXdjbTkwYjNSNWNHVXVhWE5RY205MGIzUjVjR1ZQWmloaWIyUjVLU2tnZTF4dUlDQWdJQ0FnSUNBZ0lIUm9hWE11YUdWaFpHVnljeTV6WlhRb0oyTnZiblJsYm5RdGRIbHdaU2NzSUNkaGNIQnNhV05oZEdsdmJpOTRMWGQzZHkxbWIzSnRMWFZ5YkdWdVkyOWtaV1E3WTJoaGNuTmxkRDFWVkVZdE9DY3BYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJSDFjYmlBZ0lDQjlYRzVjYmlBZ0lDQnBaaUFvYzNWd2NHOXlkQzVpYkc5aUtTQjdYRzRnSUNBZ0lDQjBhR2x6TG1Kc2IySWdQU0JtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0FnSUNBZ2RtRnlJSEpsYW1WamRHVmtJRDBnWTI5dWMzVnRaV1FvZEdocGN5bGNiaUFnSUNBZ0lDQWdhV1lnS0hKbGFtVmpkR1ZrS1NCN1hHNGdJQ0FnSUNBZ0lDQWdjbVYwZFhKdUlISmxhbVZqZEdWa1hHNGdJQ0FnSUNBZ0lIMWNibHh1SUNBZ0lDQWdJQ0JwWmlBb2RHaHBjeTVmWW05a2VVSnNiMklwSUh0Y2JpQWdJQ0FnSUNBZ0lDQnlaWFIxY200Z1VISnZiV2x6WlM1eVpYTnZiSFpsS0hSb2FYTXVYMkp2WkhsQ2JHOWlLVnh1SUNBZ0lDQWdJQ0I5SUdWc2MyVWdhV1lnS0hSb2FYTXVYMkp2WkhsQmNuSmhlVUoxWm1abGNpa2dlMXh1SUNBZ0lDQWdJQ0FnSUhKbGRIVnliaUJRY205dGFYTmxMbkpsYzI5c2RtVW9ibVYzSUVKc2IySW9XM1JvYVhNdVgySnZaSGxCY25KaGVVSjFabVpsY2wwcEtWeHVJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2FXWWdLSFJvYVhNdVgySnZaSGxHYjNKdFJHRjBZU2tnZTF4dUlDQWdJQ0FnSUNBZ0lIUm9jbTkzSUc1bGR5QkZjbkp2Y2lnblkyOTFiR1FnYm05MElISmxZV1FnUm05eWJVUmhkR0VnWW05a2VTQmhjeUJpYkc5aUp5bGNiaUFnSUNBZ0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lDQWdJQ0J5WlhSMWNtNGdVSEp2YldselpTNXlaWE52YkhabEtHNWxkeUJDYkc5aUtGdDBhR2x6TGw5aWIyUjVWR1Y0ZEYwcEtWeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJSFJvYVhNdVlYSnlZWGxDZFdabVpYSWdQU0JtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0FnSUNBZ2FXWWdLSFJvYVhNdVgySnZaSGxCY25KaGVVSjFabVpsY2lrZ2UxeHVJQ0FnSUNBZ0lDQWdJSEpsZEhWeWJpQmpiMjV6ZFcxbFpDaDBhR2x6S1NCOGZDQlFjbTl0YVhObExuSmxjMjlzZG1Vb2RHaHBjeTVmWW05a2VVRnljbUY1UW5WbVptVnlLVnh1SUNBZ0lDQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdJQ0FnSUhKbGRIVnliaUIwYUdsekxtSnNiMklvS1M1MGFHVnVLSEpsWVdSQ2JHOWlRWE5CY25KaGVVSjFabVpsY2lsY2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUgxY2JseHVJQ0FnSUhSb2FYTXVkR1Y0ZENBOUlHWjFibU4wYVc5dUtDa2dlMXh1SUNBZ0lDQWdkbUZ5SUhKbGFtVmpkR1ZrSUQwZ1kyOXVjM1Z0WldRb2RHaHBjeWxjYmlBZ0lDQWdJR2xtSUNoeVpXcGxZM1JsWkNrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2NtVnFaV04wWldSY2JpQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ2FXWWdLSFJvYVhNdVgySnZaSGxDYkc5aUtTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQnlaV0ZrUW14dllrRnpWR1Y0ZENoMGFHbHpMbDlpYjJSNVFteHZZaWxjYmlBZ0lDQWdJSDBnWld4elpTQnBaaUFvZEdocGN5NWZZbTlrZVVGeWNtRjVRblZtWm1WeUtTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQlFjbTl0YVhObExuSmxjMjlzZG1Vb2NtVmhaRUZ5Y21GNVFuVm1abVZ5UVhOVVpYaDBLSFJvYVhNdVgySnZaSGxCY25KaGVVSjFabVpsY2lrcFhHNGdJQ0FnSUNCOUlHVnNjMlVnYVdZZ0tIUm9hWE11WDJKdlpIbEdiM0p0UkdGMFlTa2dlMXh1SUNBZ0lDQWdJQ0IwYUhKdmR5QnVaWGNnUlhKeWIzSW9KMk52ZFd4a0lHNXZkQ0J5WldGa0lFWnZjbTFFWVhSaElHSnZaSGtnWVhNZ2RHVjRkQ2NwWEc0Z0lDQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdVSEp2YldselpTNXlaWE52YkhabEtIUm9hWE11WDJKdlpIbFVaWGgwS1Z4dUlDQWdJQ0FnZlZ4dUlDQWdJSDFjYmx4dUlDQWdJR2xtSUNoemRYQndiM0owTG1admNtMUVZWFJoS1NCN1hHNGdJQ0FnSUNCMGFHbHpMbVp2Y20xRVlYUmhJRDBnWm5WdVkzUnBiMjRvS1NCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCMGFHbHpMblJsZUhRb0tTNTBhR1Z1S0dSbFkyOWtaU2xjYmlBZ0lDQWdJSDFjYmlBZ0lDQjlYRzVjYmlBZ0lDQjBhR2x6TG1wemIyNGdQU0JtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0FnSUhKbGRIVnliaUIwYUdsekxuUmxlSFFvS1M1MGFHVnVLRXBUVDA0dWNHRnljMlVwWEc0Z0lDQWdmVnh1WEc0Z0lDQWdjbVYwZFhKdUlIUm9hWE5jYmlBZ2ZWeHVYRzRnSUM4dklFaFVWRkFnYldWMGFHOWtjeUIzYUc5elpTQmpZWEJwZEdGc2FYcGhkR2x2YmlCemFHOTFiR1FnWW1VZ2JtOXliV0ZzYVhwbFpGeHVJQ0IyWVhJZ2JXVjBhRzlrY3lBOUlGc25SRVZNUlZSRkp5d2dKMGRGVkNjc0lDZElSVUZFSnl3Z0owOVFWRWxQVGxNbkxDQW5VRTlUVkNjc0lDZFFWVlFuWFZ4dVhHNGdJR1oxYm1OMGFXOXVJRzV2Y20xaGJHbDZaVTFsZEdodlpDaHRaWFJvYjJRcElIdGNiaUFnSUNCMllYSWdkWEJqWVhObFpDQTlJRzFsZEdodlpDNTBiMVZ3Y0dWeVEyRnpaU2dwWEc0Z0lDQWdjbVYwZFhKdUlDaHRaWFJvYjJSekxtbHVaR1Y0VDJZb2RYQmpZWE5sWkNrZ1BpQXRNU2tnUHlCMWNHTmhjMlZrSURvZ2JXVjBhRzlrWEc0Z0lIMWNibHh1SUNCbWRXNWpkR2x2YmlCU1pYRjFaWE4wS0dsdWNIVjBMQ0J2Y0hScGIyNXpLU0I3WEc0Z0lDQWdiM0IwYVc5dWN5QTlJRzl3ZEdsdmJuTWdmSHdnZTMxY2JpQWdJQ0IyWVhJZ1ltOWtlU0E5SUc5d2RHbHZibk11WW05a2VWeHVYRzRnSUNBZ2FXWWdLR2x1Y0hWMElHbHVjM1JoYm1ObGIyWWdVbVZ4ZFdWemRDa2dlMXh1SUNBZ0lDQWdhV1lnS0dsdWNIVjBMbUp2WkhsVmMyVmtLU0I3WEc0Z0lDQWdJQ0FnSUhSb2NtOTNJRzVsZHlCVWVYQmxSWEp5YjNJb0owRnNjbVZoWkhrZ2NtVmhaQ2NwWEc0Z0lDQWdJQ0I5WEc0Z0lDQWdJQ0IwYUdsekxuVnliQ0E5SUdsdWNIVjBMblZ5YkZ4dUlDQWdJQ0FnZEdocGN5NWpjbVZrWlc1MGFXRnNjeUE5SUdsdWNIVjBMbU55WldSbGJuUnBZV3h6WEc0Z0lDQWdJQ0JwWmlBb0lXOXdkR2x2Ym5NdWFHVmhaR1Z5Y3lrZ2UxeHVJQ0FnSUNBZ0lDQjBhR2x6TG1obFlXUmxjbk1nUFNCdVpYY2dTR1ZoWkdWeWN5aHBibkIxZEM1b1pXRmtaWEp6S1Z4dUlDQWdJQ0FnZlZ4dUlDQWdJQ0FnZEdocGN5NXRaWFJvYjJRZ1BTQnBibkIxZEM1dFpYUm9iMlJjYmlBZ0lDQWdJSFJvYVhNdWJXOWtaU0E5SUdsdWNIVjBMbTF2WkdWY2JpQWdJQ0FnSUdsbUlDZ2hZbTlrZVNBbUppQnBibkIxZEM1ZlltOWtlVWx1YVhRZ0lUMGdiblZzYkNrZ2UxeHVJQ0FnSUNBZ0lDQmliMlI1SUQwZ2FXNXdkWFF1WDJKdlpIbEpibWwwWEc0Z0lDQWdJQ0FnSUdsdWNIVjBMbUp2WkhsVmMyVmtJRDBnZEhKMVpWeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0IwYUdsekxuVnliQ0E5SUZOMGNtbHVaeWhwYm5CMWRDbGNiaUFnSUNCOVhHNWNiaUFnSUNCMGFHbHpMbU55WldSbGJuUnBZV3h6SUQwZ2IzQjBhVzl1Y3k1amNtVmtaVzUwYVdGc2N5QjhmQ0IwYUdsekxtTnlaV1JsYm5ScFlXeHpJSHg4SUNkdmJXbDBKMXh1SUNBZ0lHbG1JQ2h2Y0hScGIyNXpMbWhsWVdSbGNuTWdmSHdnSVhSb2FYTXVhR1ZoWkdWeWN5a2dlMXh1SUNBZ0lDQWdkR2hwY3k1b1pXRmtaWEp6SUQwZ2JtVjNJRWhsWVdSbGNuTW9iM0IwYVc5dWN5NW9aV0ZrWlhKektWeHVJQ0FnSUgxY2JpQWdJQ0IwYUdsekxtMWxkR2h2WkNBOUlHNXZjbTFoYkdsNlpVMWxkR2h2WkNodmNIUnBiMjV6TG0xbGRHaHZaQ0I4ZkNCMGFHbHpMbTFsZEdodlpDQjhmQ0FuUjBWVUp5bGNiaUFnSUNCMGFHbHpMbTF2WkdVZ1BTQnZjSFJwYjI1ekxtMXZaR1VnZkh3Z2RHaHBjeTV0YjJSbElIeDhJRzUxYkd4Y2JpQWdJQ0IwYUdsekxuSmxabVZ5Y21WeUlEMGdiblZzYkZ4dVhHNGdJQ0FnYVdZZ0tDaDBhR2x6TG0xbGRHaHZaQ0E5UFQwZ0owZEZWQ2NnZkh3Z2RHaHBjeTV0WlhSb2IyUWdQVDA5SUNkSVJVRkVKeWtnSmlZZ1ltOWtlU2tnZTF4dUlDQWdJQ0FnZEdoeWIzY2dibVYzSUZSNWNHVkZjbkp2Y2lnblFtOWtlU0J1YjNRZ1lXeHNiM2RsWkNCbWIzSWdSMFZVSUc5eUlFaEZRVVFnY21WeGRXVnpkSE1uS1Z4dUlDQWdJSDFjYmlBZ0lDQjBhR2x6TGw5cGJtbDBRbTlrZVNoaWIyUjVLVnh1SUNCOVhHNWNiaUFnVW1WeGRXVnpkQzV3Y205MGIzUjVjR1V1WTJ4dmJtVWdQU0JtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0J5WlhSMWNtNGdibVYzSUZKbGNYVmxjM1FvZEdocGN5d2dleUJpYjJSNU9pQjBhR2x6TGw5aWIyUjVTVzVwZENCOUtWeHVJQ0I5WEc1Y2JpQWdablZ1WTNScGIyNGdaR1ZqYjJSbEtHSnZaSGtwSUh0Y2JpQWdJQ0IyWVhJZ1ptOXliU0E5SUc1bGR5QkdiM0p0UkdGMFlTZ3BYRzRnSUNBZ1ltOWtlUzUwY21sdEtDa3VjM0JzYVhRb0p5WW5LUzVtYjNKRllXTm9LR1oxYm1OMGFXOXVLR0o1ZEdWektTQjdYRzRnSUNBZ0lDQnBaaUFvWW5sMFpYTXBJSHRjYmlBZ0lDQWdJQ0FnZG1GeUlITndiR2wwSUQwZ1lubDBaWE11YzNCc2FYUW9KejBuS1Z4dUlDQWdJQ0FnSUNCMllYSWdibUZ0WlNBOUlITndiR2wwTG5Ob2FXWjBLQ2t1Y21Wd2JHRmpaU2d2WEZ3ckwyY3NJQ2NnSnlsY2JpQWdJQ0FnSUNBZ2RtRnlJSFpoYkhWbElEMGdjM0JzYVhRdWFtOXBiaWduUFNjcExuSmxjR3hoWTJVb0wxeGNLeTluTENBbklDY3BYRzRnSUNBZ0lDQWdJR1p2Y20wdVlYQndaVzVrS0dSbFkyOWtaVlZTU1VOdmJYQnZibVZ1ZENodVlXMWxLU3dnWkdWamIyUmxWVkpKUTI5dGNHOXVaVzUwS0haaGJIVmxLU2xjYmlBZ0lDQWdJSDFjYmlBZ0lDQjlLVnh1SUNBZ0lISmxkSFZ5YmlCbWIzSnRYRzRnSUgxY2JseHVJQ0JtZFc1amRHbHZiaUJ3WVhKelpVaGxZV1JsY25Nb2NtRjNTR1ZoWkdWeWN5a2dlMXh1SUNBZ0lIWmhjaUJvWldGa1pYSnpJRDBnYm1WM0lFaGxZV1JsY25Nb0tWeHVJQ0FnSUM4dklGSmxjR3hoWTJVZ2FXNXpkR0Z1WTJWeklHOW1JRnhjY2x4Y2JpQmhibVFnWEZ4dUlHWnZiR3h2ZDJWa0lHSjVJR0YwSUd4bFlYTjBJRzl1WlNCemNHRmpaU0J2Y2lCb2IzSnBlbTl1ZEdGc0lIUmhZaUIzYVhSb0lHRWdjM0JoWTJWY2JpQWdJQ0F2THlCb2RIUndjem92TDNSdmIyeHpMbWxsZEdZdWIzSm5MMmgwYld3dmNtWmpOekl6TUNOelpXTjBhVzl1TFRNdU1seHVJQ0FnSUhaaGNpQndjbVZRY205alpYTnpaV1JJWldGa1pYSnpJRDBnY21GM1NHVmhaR1Z5Y3k1eVpYQnNZV05sS0M5Y1hISS9YRnh1VzF4Y2RDQmRLeTluTENBbklDY3BYRzRnSUNBZ2NISmxVSEp2WTJWemMyVmtTR1ZoWkdWeWN5NXpjR3hwZENndlhGeHlQMXhjYmk4cExtWnZja1ZoWTJnb1puVnVZM1JwYjI0b2JHbHVaU2tnZTF4dUlDQWdJQ0FnZG1GeUlIQmhjblJ6SUQwZ2JHbHVaUzV6Y0d4cGRDZ25PaWNwWEc0Z0lDQWdJQ0IyWVhJZ2EyVjVJRDBnY0dGeWRITXVjMmhwWm5Rb0tTNTBjbWx0S0NsY2JpQWdJQ0FnSUdsbUlDaHJaWGtwSUh0Y2JpQWdJQ0FnSUNBZ2RtRnlJSFpoYkhWbElEMGdjR0Z5ZEhNdWFtOXBiaWduT2ljcExuUnlhVzBvS1Z4dUlDQWdJQ0FnSUNCb1pXRmtaWEp6TG1Gd2NHVnVaQ2hyWlhrc0lIWmhiSFZsS1Z4dUlDQWdJQ0FnZlZ4dUlDQWdJSDBwWEc0Z0lDQWdjbVYwZFhKdUlHaGxZV1JsY25OY2JpQWdmVnh1WEc0Z0lFSnZaSGt1WTJGc2JDaFNaWEYxWlhOMExuQnliM1J2ZEhsd1pTbGNibHh1SUNCbWRXNWpkR2x2YmlCU1pYTndiMjV6WlNoaWIyUjVTVzVwZEN3Z2IzQjBhVzl1Y3lrZ2UxeHVJQ0FnSUdsbUlDZ2hiM0IwYVc5dWN5a2dlMXh1SUNBZ0lDQWdiM0IwYVc5dWN5QTlJSHQ5WEc0Z0lDQWdmVnh1WEc0Z0lDQWdkR2hwY3k1MGVYQmxJRDBnSjJSbFptRjFiSFFuWEc0Z0lDQWdkR2hwY3k1emRHRjBkWE1nUFNCdmNIUnBiMjV6TG5OMFlYUjFjeUE5UFQwZ2RXNWtaV1pwYm1Wa0lEOGdNakF3SURvZ2IzQjBhVzl1Y3k1emRHRjBkWE5jYmlBZ0lDQjBhR2x6TG05cklEMGdkR2hwY3k1emRHRjBkWE1nUGowZ01qQXdJQ1ltSUhSb2FYTXVjM1JoZEhWeklEd2dNekF3WEc0Z0lDQWdkR2hwY3k1emRHRjBkWE5VWlhoMElEMGdKM04wWVhSMWMxUmxlSFFuSUdsdUlHOXdkR2x2Ym5NZ1B5QnZjSFJwYjI1ekxuTjBZWFIxYzFSbGVIUWdPaUFuVDBzblhHNGdJQ0FnZEdocGN5NW9aV0ZrWlhKeklEMGdibVYzSUVobFlXUmxjbk1vYjNCMGFXOXVjeTVvWldGa1pYSnpLVnh1SUNBZ0lIUm9hWE11ZFhKc0lEMGdiM0IwYVc5dWN5NTFjbXdnZkh3Z0p5ZGNiaUFnSUNCMGFHbHpMbDlwYm1sMFFtOWtlU2hpYjJSNVNXNXBkQ2xjYmlBZ2ZWeHVYRzRnSUVKdlpIa3VZMkZzYkNoU1pYTndiMjV6WlM1d2NtOTBiM1I1Y0dVcFhHNWNiaUFnVW1WemNHOXVjMlV1Y0hKdmRHOTBlWEJsTG1Oc2IyNWxJRDBnWm5WdVkzUnBiMjRvS1NCN1hHNGdJQ0FnY21WMGRYSnVJRzVsZHlCU1pYTndiMjV6WlNoMGFHbHpMbDlpYjJSNVNXNXBkQ3dnZTF4dUlDQWdJQ0FnYzNSaGRIVnpPaUIwYUdsekxuTjBZWFIxY3l4Y2JpQWdJQ0FnSUhOMFlYUjFjMVJsZUhRNklIUm9hWE11YzNSaGRIVnpWR1Y0ZEN4Y2JpQWdJQ0FnSUdobFlXUmxjbk02SUc1bGR5QklaV0ZrWlhKektIUm9hWE11YUdWaFpHVnljeWtzWEc0Z0lDQWdJQ0IxY213NklIUm9hWE11ZFhKc1hHNGdJQ0FnZlNsY2JpQWdmVnh1WEc0Z0lGSmxjM0J2Ym5ObExtVnljbTl5SUQwZ1puVnVZM1JwYjI0b0tTQjdYRzRnSUNBZ2RtRnlJSEpsYzNCdmJuTmxJRDBnYm1WM0lGSmxjM0J2Ym5ObEtHNTFiR3dzSUh0emRHRjBkWE02SURBc0lITjBZWFIxYzFSbGVIUTZJQ2NuZlNsY2JpQWdJQ0J5WlhOd2IyNXpaUzUwZVhCbElEMGdKMlZ5Y205eUoxeHVJQ0FnSUhKbGRIVnliaUJ5WlhOd2IyNXpaVnh1SUNCOVhHNWNiaUFnZG1GeUlISmxaR2x5WldOMFUzUmhkSFZ6WlhNZ1BTQmJNekF4TENBek1ESXNJRE13TXl3Z016QTNMQ0F6TURoZFhHNWNiaUFnVW1WemNHOXVjMlV1Y21Wa2FYSmxZM1FnUFNCbWRXNWpkR2x2YmloMWNtd3NJSE4wWVhSMWN5a2dlMXh1SUNBZ0lHbG1JQ2h5WldScGNtVmpkRk4wWVhSMWMyVnpMbWx1WkdWNFQyWW9jM1JoZEhWektTQTlQVDBnTFRFcElIdGNiaUFnSUNBZ0lIUm9jbTkzSUc1bGR5QlNZVzVuWlVWeWNtOXlLQ2RKYm5aaGJHbGtJSE4wWVhSMWN5QmpiMlJsSnlsY2JpQWdJQ0I5WEc1Y2JpQWdJQ0J5WlhSMWNtNGdibVYzSUZKbGMzQnZibk5sS0c1MWJHd3NJSHR6ZEdGMGRYTTZJSE4wWVhSMWN5d2dhR1ZoWkdWeWN6b2dlMnh2WTJGMGFXOXVPaUIxY214OWZTbGNiaUFnZlZ4dVhHNGdJSE5sYkdZdVNHVmhaR1Z5Y3lBOUlFaGxZV1JsY25OY2JpQWdjMlZzWmk1U1pYRjFaWE4wSUQwZ1VtVnhkV1Z6ZEZ4dUlDQnpaV3htTGxKbGMzQnZibk5sSUQwZ1VtVnpjRzl1YzJWY2JseHVJQ0J6Wld4bUxtWmxkR05vSUQwZ1puVnVZM1JwYjI0b2FXNXdkWFFzSUdsdWFYUXBJSHRjYmlBZ0lDQnlaWFIxY200Z2JtVjNJRkJ5YjIxcGMyVW9ablZ1WTNScGIyNG9jbVZ6YjJ4MlpTd2djbVZxWldOMEtTQjdYRzRnSUNBZ0lDQjJZWElnY21WeGRXVnpkQ0E5SUc1bGR5QlNaWEYxWlhOMEtHbHVjSFYwTENCcGJtbDBLVnh1SUNBZ0lDQWdkbUZ5SUhob2NpQTlJRzVsZHlCWVRVeElkSFJ3VW1WeGRXVnpkQ2dwWEc1Y2JpQWdJQ0FnSUhob2NpNXZibXh2WVdRZ1BTQm1kVzVqZEdsdmJpZ3BJSHRjYmlBZ0lDQWdJQ0FnZG1GeUlHOXdkR2x2Ym5NZ1BTQjdYRzRnSUNBZ0lDQWdJQ0FnYzNSaGRIVnpPaUI0YUhJdWMzUmhkSFZ6TEZ4dUlDQWdJQ0FnSUNBZ0lITjBZWFIxYzFSbGVIUTZJSGhvY2k1emRHRjBkWE5VWlhoMExGeHVJQ0FnSUNBZ0lDQWdJR2hsWVdSbGNuTTZJSEJoY25ObFNHVmhaR1Z5Y3loNGFISXVaMlYwUVd4c1VtVnpjRzl1YzJWSVpXRmtaWEp6S0NrZ2ZId2dKeWNwWEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ2IzQjBhVzl1Y3k1MWNtd2dQU0FuY21WemNHOXVjMlZWVWt3bklHbHVJSGhvY2lBL0lIaG9jaTV5WlhOd2IyNXpaVlZTVENBNklHOXdkR2x2Ym5NdWFHVmhaR1Z5Y3k1blpYUW9KMWd0VW1WeGRXVnpkQzFWVWt3bktWeHVJQ0FnSUNBZ0lDQjJZWElnWW05a2VTQTlJQ2R5WlhOd2IyNXpaU2NnYVc0Z2VHaHlJRDhnZUdoeUxuSmxjM0J2Ym5ObElEb2dlR2h5TG5KbGMzQnZibk5sVkdWNGRGeHVJQ0FnSUNBZ0lDQnlaWE52YkhabEtHNWxkeUJTWlhOd2IyNXpaU2hpYjJSNUxDQnZjSFJwYjI1ektTbGNiaUFnSUNBZ0lIMWNibHh1SUNBZ0lDQWdlR2h5TG05dVpYSnliM0lnUFNCbWRXNWpkR2x2YmlncElIdGNiaUFnSUNBZ0lDQWdjbVZxWldOMEtHNWxkeUJVZVhCbFJYSnliM0lvSjA1bGRIZHZjbXNnY21WeGRXVnpkQ0JtWVdsc1pXUW5LU2xjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnZUdoeUxtOXVkR2x0Wlc5MWRDQTlJR1oxYm1OMGFXOXVLQ2tnZTF4dUlDQWdJQ0FnSUNCeVpXcGxZM1FvYm1WM0lGUjVjR1ZGY25KdmNpZ25UbVYwZDI5eWF5QnlaWEYxWlhOMElHWmhhV3hsWkNjcEtWeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQjRhSEl1YjNCbGJpaHlaWEYxWlhOMExtMWxkR2h2WkN3Z2NtVnhkV1Z6ZEM1MWNtd3NJSFJ5ZFdVcFhHNWNiaUFnSUNBZ0lHbG1JQ2h5WlhGMVpYTjBMbU55WldSbGJuUnBZV3h6SUQwOVBTQW5hVzVqYkhWa1pTY3BJSHRjYmlBZ0lDQWdJQ0FnZUdoeUxuZHBkR2hEY21Wa1pXNTBhV0ZzY3lBOUlIUnlkV1ZjYmlBZ0lDQWdJSDBnWld4elpTQnBaaUFvY21WeGRXVnpkQzVqY21Wa1pXNTBhV0ZzY3lBOVBUMGdKMjl0YVhRbktTQjdYRzRnSUNBZ0lDQWdJSGhvY2k1M2FYUm9RM0psWkdWdWRHbGhiSE1nUFNCbVlXeHpaVnh1SUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0JwWmlBb0ozSmxjM0J2Ym5ObFZIbHdaU2NnYVc0Z2VHaHlJQ1ltSUhOMWNIQnZjblF1WW14dllpa2dlMXh1SUNBZ0lDQWdJQ0I0YUhJdWNtVnpjRzl1YzJWVWVYQmxJRDBnSjJKc2IySW5YRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJSEpsY1hWbGMzUXVhR1ZoWkdWeWN5NW1iM0pGWVdOb0tHWjFibU4wYVc5dUtIWmhiSFZsTENCdVlXMWxLU0I3WEc0Z0lDQWdJQ0FnSUhob2NpNXpaWFJTWlhGMVpYTjBTR1ZoWkdWeUtHNWhiV1VzSUhaaGJIVmxLVnh1SUNBZ0lDQWdmU2xjYmx4dUlDQWdJQ0FnZUdoeUxuTmxibVFvZEhsd1pXOW1JSEpsY1hWbGMzUXVYMkp2WkhsSmJtbDBJRDA5UFNBbmRXNWtaV1pwYm1Wa0p5QS9JRzUxYkd3Z09pQnlaWEYxWlhOMExsOWliMlI1U1c1cGRDbGNiaUFnSUNCOUtWeHVJQ0I5WEc0Z0lITmxiR1l1Wm1WMFkyZ3VjRzlzZVdacGJHd2dQU0IwY25WbFhHNTlLU2gwZVhCbGIyWWdjMlZzWmlBaFBUMGdKM1Z1WkdWbWFXNWxaQ2NnUHlCelpXeG1JRG9nZEdocGN5azdYRzRpTENKamIyNXpkQ0JoY25ScFkyeGxWR1Z0Y0d4aGRHVWdQU0JnWEc1Y2REeGhjblJwWTJ4bElHTnNZWE56UFZ3aVlYSjBhV05zWlY5ZmIzVjBaWEpjSWo1Y2JseDBYSFE4WkdsMklHTnNZWE56UFZ3aVlYSjBhV05zWlY5ZmFXNXVaWEpjSWo1Y2JseDBYSFJjZER4a2FYWWdZMnhoYzNNOVhDSmhjblJwWTJ4bFgxOW9aV0ZrYVc1blhDSStYRzVjZEZ4MFhIUmNkRHhoSUdOc1lYTnpQVndpYW5NdFpXNTBjbmt0ZEdsMGJHVmNJajQ4TDJFK1hHNWNkRngwWEhSY2REeG9NaUJqYkdGemN6MWNJbUZ5ZEdsamJHVXRhR1ZoWkdsdVoxOWZkR2wwYkdWY0lqNDhMMmd5UGx4dVhIUmNkRngwWEhROFpHbDJJR05zWVhOelBWd2lZWEowYVdOc1pTMW9aV0ZrYVc1blgxOXVZVzFsWENJK1hHNWNkRngwWEhSY2RGeDBQSE53WVc0Z1kyeGhjM005WENKaGNuUnBZMnhsTFdobFlXUnBibWRmWDI1aGJXVXRMV1pwY25OMFhDSStQQzl6Y0dGdVBseHVYSFJjZEZ4MFhIUmNkRHhoSUdOc1lYTnpQVndpYW5NdFpXNTBjbmt0WVhKMGFYTjBYQ0krUEM5aFBseHVYSFJjZEZ4MFhIUmNkRHh6Y0dGdUlHTnNZWE56UFZ3aVlYSjBhV05zWlMxb1pXRmthVzVuWDE5dVlXMWxMUzFzWVhOMFhDSStQQzl6Y0dGdVBseHVYSFJjZEZ4MFhIUThMMlJwZGo1Y2JseDBYSFJjZER3dlpHbDJQbHgwWEc1Y2RGeDBYSFE4WkdsMklHTnNZWE56UFZ3aVlYSjBhV05zWlY5ZmFXMWhaMlZ6TFc5MWRHVnlYQ0krWEc1Y2RGeDBYSFJjZER4a2FYWWdZMnhoYzNNOVhDSmhjblJwWTJ4bFgxOXBiV0ZuWlhNdGFXNXVaWEpjSWo0OEwyUnBkajVjYmx4MFhIUmNkRngwUEhBZ1kyeGhjM005WENKcWN5MWhjblJwWTJ4bExXRnVZMmh2Y2kxMFlYSm5aWFJjSWo0OEwzQStYRzVjZEZ4MFBDOWthWFkrWEc1Y2REd3ZZWEowYVdOc1pUNWNibUE3WEc1Y2JtVjRjRzl5ZENCa1pXWmhkV3gwSUdGeWRHbGpiR1ZVWlcxd2JHRjBaVHNpTENKcGJYQnZjblFnSjNkb1lYUjNaeTFtWlhSamFDYzdYRzVwYlhCdmNuUWdibUYyVEdjZ1puSnZiU0FuTGk5dVlYWXRiR2NuTzF4dWFXMXdiM0owSUdGeWRHbGpiR1ZVWlcxd2JHRjBaU0JtY205dElDY3VMMkZ5ZEdsamJHVXRkR1Z0Y0d4aGRHVW5PMXh1WEc1amIyNXpkQ0JFUWlBOUlDZG9kSFJ3Y3pvdkwyNWxlSFZ6TFdOaGRHRnNiMmN1Wm1seVpXSmhjMlZwYnk1amIyMHZjRzl6ZEhNdWFuTnZiajloZFhSb1BUZG5OM0I1UzB0NWEwNHpUalZsZDNKSmJXaFBZVk0yZG5keVJuTmpOV1pMYTNKck9HVnFlbVluTzF4dVkyOXVjM1FnWVd4d2FHRmlaWFFnUFNCYkoyRW5MQ0FuWWljc0lDZGpKeXdnSjJRbkxDQW5aU2NzSUNkbUp5d2dKMmNuTENBbmFDY3NJQ2RwSnl3Z0oyb25MQ0FuYXljc0lDZHNKeXdnSjIwbkxDQW5iaWNzSUNkdkp5d2dKM0FuTENBbmNpY3NJQ2R6Snl3Z0ozUW5MQ0FuZFNjc0lDZDJKeXdnSjNjbkxDQW5lU2NzSUNkNkoxMDdYRzVjYm1OdmJuTjBJQ1JzYjJGa2FXNW5JRDBnUVhKeVlYa3Vabkp2YlNoa2IyTjFiV1Z1ZEM1eGRXVnllVk5sYkdWamRHOXlRV3hzS0NjdWJHOWhaR2x1WnljcEtUdGNibU52Ym5OMElDUnVZWFlnUFNCa2IyTjFiV1Z1ZEM1blpYUkZiR1Z0Wlc1MFFubEpaQ2duYW5NdGJtRjJKeWs3WEc1amIyNXpkQ0FrY0dGeVlXeHNZWGdnUFNCa2IyTjFiV1Z1ZEM1eGRXVnllVk5sYkdWamRHOXlLQ2N1Y0dGeVlXeHNZWGduS1R0Y2JtTnZibk4wSUNSamIyNTBaVzUwSUQwZ1pHOWpkVzFsYm5RdWNYVmxjbmxUWld4bFkzUnZjaWduTG1OdmJuUmxiblFuS1R0Y2JtTnZibk4wSUNSMGFYUnNaU0E5SUdSdlkzVnRaVzUwTG1kbGRFVnNaVzFsYm5SQ2VVbGtLQ2RxY3kxMGFYUnNaU2NwTzF4dVkyOXVjM1FnSkdGeWNtOTNJRDBnWkc5amRXMWxiblF1Y1hWbGNubFRaV3hsWTNSdmNpZ25MbUZ5Y205M0p5azdYRzVqYjI1emRDQWtiVzlrWVd3Z1BTQmtiMk4xYldWdWRDNXhkV1Z5ZVZObGJHVmpkRzl5S0NjdWJXOWtZV3duS1R0Y2JtTnZibk4wSUNSc2FXZG9kR0p2ZUNBOUlHUnZZM1Z0Wlc1MExuRjFaWEo1VTJWc1pXTjBiM0lvSnk1c2FXZG9kR0p2ZUNjcE8xeHVZMjl1YzNRZ0pIWnBaWGNnUFNCa2IyTjFiV1Z1ZEM1eGRXVnllVk5sYkdWamRHOXlLQ2N1YkdsbmFIUmliM2d0ZG1sbGR5Y3BPMXh1WEc1c1pYUWdjMjl5ZEV0bGVTQTlJREE3SUM4dklEQWdQU0JoY25ScGMzUXNJREVnUFNCMGFYUnNaVnh1YkdWMElHVnVkSEpwWlhNZ1BTQjdJR0o1UVhWMGFHOXlPaUJiWFN3Z1lubFVhWFJzWlRvZ1cxMGdmVHRjYm14bGRDQmpkWEp5Wlc1MFRHVjBkR1Z5SUQwZ0owRW5PMXh1WEc1c1pYUWdiR2xuYUhSaWIzZ2dQU0JtWVd4elpUdGNibU52Ym5OMElHRjBkR0ZqYUVsdFlXZGxUR2x6ZEdWdVpYSnpJRDBnS0NrZ1BUNGdlMXh1WEhSc1pYUWdKR2x0WVdkbGN5QTlJRUZ5Y21GNUxtWnliMjBvWkc5amRXMWxiblF1Y1hWbGNubFRaV3hsWTNSdmNrRnNiQ2duTG1GeWRHbGpiR1V0YVcxaFoyVW5LU2s3WEc1Y2JseDBKR2x0WVdkbGN5NW1iM0pGWVdOb0tHbHRaeUE5UGlCN1hHNWNkRngwYVcxbkxtRmtaRVYyWlc1MFRHbHpkR1Z1WlhJb0oyTnNhV05ySnl3Z0tDa2dQVDRnZTF4dVhIUmNkRngwYVdZZ0tDRnNhV2RvZEdKdmVDa2dlMXh1WEhSY2RGeDBYSFJzWlhRZ2MzSmpJRDBnYVcxbkxuTnlZenRjYmx4MFhIUmNkRngwSkd4cFoyaDBZbTk0TG1Oc1lYTnpUR2x6ZEM1aFpHUW9KM05vYjNjdGFXMW5KeWs3WEc1Y2RGeDBYSFJjZENSMmFXVjNMbk5sZEVGMGRISnBZblYwWlNnbmMzUjViR1VuTENCZ1ltRmphMmR5YjNWdVpDMXBiV0ZuWlRvZ2RYSnNLQ1I3YzNKamZTbGdLVHRjYmx4MFhIUmNkRngwYkdsbmFIUmliM2dnUFNCMGNuVmxPMXh1WEhSY2RGeDBmVnh1WEhSY2RIMHBPMXh1WEhSOUtUdGNibHh1WEhRa2RtbGxkeTVoWkdSRmRtVnVkRXhwYzNSbGJtVnlLQ2RqYkdsamF5Y3NJQ2dwSUQwK0lIdGNibHgwWEhScFppQW9iR2xuYUhSaWIzZ3BJSHRjYmx4MFhIUmNkQ1JzYVdkb2RHSnZlQzVqYkdGemMweHBjM1F1Y21WdGIzWmxLQ2R6YUc5M0xXbHRaeWNwTzF4dVhIUmNkRngwYkdsbmFIUmliM2dnUFNCbVlXeHpaVHRjYmx4MFhIUjlYRzVjZEgwcE8xeHVmVHRjYmx4dWJHVjBJRzF2WkdGc0lEMGdabUZzYzJVN1hHNWpiMjV6ZENCaGRIUmhZMmhOYjJSaGJFeHBjM1JsYm1WeWN5QTlJQ2dwSUQwK0lIdGNibHgwWTI5dWMzUWdKR1pwYm1RZ1BTQmtiMk4xYldWdWRDNW5aWFJGYkdWdFpXNTBRbmxKWkNnbmFuTXRabWx1WkNjcE8xeHVYSFJjYmx4MEpHWnBibVF1WVdSa1JYWmxiblJNYVhOMFpXNWxjaWduWTJ4cFkyc25MQ0FvS1NBOVBpQjdYRzVjZEZ4MEpHMXZaR0ZzTG1Oc1lYTnpUR2x6ZEM1aFpHUW9KM05vYjNjbktUdGNibHgwWEhSdGIyUmhiQ0E5SUhSeWRXVTdYRzVjZEgwcE8xeHVYRzVjZENSdGIyUmhiQzVoWkdSRmRtVnVkRXhwYzNSbGJtVnlLQ2RqYkdsamF5Y3NJQ2dwSUQwK0lIdGNibHgwWEhSelpYUlVhVzFsYjNWMEtDZ3BJRDArSUh0Y2JseDBYSFJjZENSdGIyUmhiQzVqYkdGemMweHBjM1F1Y21WdGIzWmxLQ2R6YUc5M0p5azdYRzVjZEZ4MFhIUnRiMlJoYkNBOUlHWmhiSE5sTzF4dVhIUmNkSDBzSURVd01DazdYRzVjZEgwcE8xeHVYRzVjZEhkcGJtUnZkeTVoWkdSRmRtVnVkRXhwYzNSbGJtVnlLQ2RyWlhsa2IzZHVKeXdnS0NrZ1BUNGdlMXh1WEhSY2RHbG1JQ2h0YjJSaGJDa2dlMXh1WEhSY2RGeDBjMlYwVkdsdFpXOTFkQ2dvS1NBOVBpQjdYRzVjZEZ4MFhIUmNkQ1J0YjJSaGJDNWpiR0Z6YzB4cGMzUXVjbVZ0YjNabEtDZHphRzkzSnlrN1hHNWNkRngwWEhSY2RHMXZaR0ZzSUQwZ1ptRnNjMlU3WEc1Y2RGeDBYSFI5TENBMk1EQXBPMXh1WEhSY2RIMDdYRzVjZEgwcE8xeHVmVnh1WEc1amIyNXpkQ0J6WTNKdmJHeFViMVJ2Y0NBOUlDZ3BJRDArSUh0Y2JseDBiR1YwSUhSb2FXNW5JRDBnWkc5amRXMWxiblF1WjJWMFJXeGxiV1Z1ZEVKNVNXUW9KMkZ1WTJodmNpMTBZWEpuWlhRbktUdGNibHgwZEdocGJtY3VjMk55YjJ4c1NXNTBiMVpwWlhjb2UySmxhR0YyYVc5eU9pQmNJbk50YjI5MGFGd2lMQ0JpYkc5amF6b2dYQ0p6ZEdGeWRGd2lmU2s3WEc1OVhHNWNibXhsZENCd2NtVjJPMXh1YkdWMElHTjFjbkpsYm5RZ1BTQXdPMXh1YkdWMElHbHpVMmh2ZDJsdVp5QTlJR1poYkhObE8xeHVZMjl1YzNRZ1lYUjBZV05vUVhKeWIzZE1hWE4wWlc1bGNuTWdQU0FvS1NBOVBpQjdYRzVjZENSaGNuSnZkeTVoWkdSRmRtVnVkRXhwYzNSbGJtVnlLQ2RqYkdsamF5Y3NJQ2dwSUQwK0lIdGNibHgwWEhSelkzSnZiR3hVYjFSdmNDZ3BPMXh1WEhSOUtUdGNibHh1WEhRa2NHRnlZV3hzWVhndVlXUmtSWFpsYm5STWFYTjBaVzVsY2lnbmMyTnliMnhzSnl3Z0tDa2dQVDRnZTF4dVhHNWNkRngwYkdWMElIa2dQU0FrZEdsMGJHVXVaMlYwUW05MWJtUnBibWREYkdsbGJuUlNaV04wS0NrdWVUdGNibHgwWEhScFppQW9ZM1Z5Y21WdWRDQWhQVDBnZVNrZ2UxeHVYSFJjZEZ4MGNISmxkaUE5SUdOMWNuSmxiblE3WEc1Y2RGeDBYSFJqZFhKeVpXNTBJRDBnZVR0Y2JseDBYSFI5WEc1Y2JseDBYSFJwWmlBb2VTQThQU0F0TlRBZ0ppWWdJV2x6VTJodmQybHVaeWtnZTF4dVhIUmNkRngwSkdGeWNtOTNMbU5zWVhOelRHbHpkQzVoWkdRb0ozTm9iM2NuS1R0Y2JseDBYSFJjZEdselUyaHZkMmx1WnlBOUlIUnlkV1U3WEc1Y2RGeDBmU0JsYkhObElHbG1JQ2g1SUQ0Z0xUVXdJQ1ltSUdselUyaHZkMmx1WnlrZ2UxeHVYSFJjZEZ4MEpHRnljbTkzTG1Oc1lYTnpUR2x6ZEM1eVpXMXZkbVVvSjNOb2IzY25LVHRjYmx4MFhIUmNkR2x6VTJodmQybHVaeUE5SUdaaGJITmxPMXh1WEhSY2RIMWNibHgwZlNrN1hHNTlPMXh1WEc1amIyNXpkQ0JoWkdSVGIzSjBRblYwZEc5dVRHbHpkR1Z1WlhKeklEMGdLQ2tnUFQ0Z2UxeHVYSFJzWlhRZ0pHSjVRWEowYVhOMElEMGdaRzlqZFcxbGJuUXVaMlYwUld4bGJXVnVkRUo1U1dRb0oycHpMV0o1TFdGeWRHbHpkQ2NwTzF4dVhIUnNaWFFnSkdKNVZHbDBiR1VnUFNCa2IyTjFiV1Z1ZEM1blpYUkZiR1Z0Wlc1MFFubEpaQ2duYW5NdFlua3RkR2wwYkdVbktUdGNibHgwSkdKNVFYSjBhWE4wTG1Ga1pFVjJaVzUwVEdsemRHVnVaWElvSjJOc2FXTnJKeXdnS0NrZ1BUNGdlMXh1WEhSY2RHbG1JQ2h6YjNKMFMyVjVLU0I3WEc1Y2RGeDBYSFJ6WTNKdmJHeFViMVJ2Y0NncE8xeHVYSFJjZEZ4MGMyOXlkRXRsZVNBOUlEQTdYRzVjZEZ4MFhIUWtZbmxCY25ScGMzUXVZMnhoYzNOTWFYTjBMbUZrWkNnbllXTjBhWFpsSnlrN1hHNWNkRngwWEhRa1lubFVhWFJzWlM1amJHRnpjMHhwYzNRdWNtVnRiM1psS0NkaFkzUnBkbVVuS1R0Y2JseHVYSFJjZEZ4MGNtVnVaR1Z5Ulc1MGNtbGxjeWdwTzF4dVhIUmNkSDFjYmx4MGZTazdYRzVjYmx4MEpHSjVWR2wwYkdVdVlXUmtSWFpsYm5STWFYTjBaVzVsY2lnblkyeHBZMnNuTENBb0tTQTlQaUI3WEc1Y2RGeDBhV1lnS0NGemIzSjBTMlY1S1NCN1hHNWNkRngwWEhSelkzSnZiR3hVYjFSdmNDZ3BPMXh1WEhSY2RGeDBjMjl5ZEV0bGVTQTlJREU3WEc1Y2RGeDBYSFFrWW5sVWFYUnNaUzVqYkdGemMweHBjM1F1WVdSa0tDZGhZM1JwZG1VbktUdGNibHgwWEhSY2RDUmllVUZ5ZEdsemRDNWpiR0Z6YzB4cGMzUXVjbVZ0YjNabEtDZGhZM1JwZG1VbktUdGNibHh1WEhSY2RGeDBjbVZ1WkdWeVJXNTBjbWxsY3lncE8xeHVYSFJjZEgxY2JseDBmU2s3WEc1OU8xeHVYRzVqYjI1emRDQmpiR1ZoY2tGdVkyaHZjbk1nUFNBb2NISmxkbE5sYkdWamRHOXlLU0E5UGlCN1hHNWNkR3hsZENBa1pXNTBjbWxsY3lBOUlFRnljbUY1TG1aeWIyMG9aRzlqZFcxbGJuUXVjWFZsY25sVFpXeGxZM1J2Y2tGc2JDaHdjbVYyVTJWc1pXTjBiM0lwS1R0Y2JseDBKR1Z1ZEhKcFpYTXVabTl5UldGamFDaGxiblJ5ZVNBOVBpQmxiblJ5ZVM1eVpXMXZkbVZCZEhSeWFXSjFkR1VvSjI1aGJXVW5LU2s3WEc1OU8xeHVYRzVqYjI1emRDQm1hVzVrUm1seWMzUkZiblJ5ZVNBOUlDaGphR0Z5S1NBOVBpQjdYRzVjZEd4bGRDQnpaV3hsWTNSdmNpQTlJSE52Y25STFpYa2dQeUFuTG1wekxXVnVkSEo1TFhScGRHeGxKeUE2SUNjdWFuTXRaVzUwY25rdFlYSjBhWE4wSnp0Y2JseDBiR1YwSUhCeVpYWlRaV3hsWTNSdmNpQTlJQ0Z6YjNKMFMyVjVJRDhnSnk1cWN5MWxiblJ5ZVMxMGFYUnNaU2NnT2lBbkxtcHpMV1Z1ZEhKNUxXRnlkR2x6ZENjN1hHNWNkR3hsZENBa1pXNTBjbWxsY3lBOUlFRnljbUY1TG1aeWIyMG9aRzlqZFcxbGJuUXVjWFZsY25sVFpXeGxZM1J2Y2tGc2JDaHpaV3hsWTNSdmNpa3BPMXh1WEc1Y2RHTnNaV0Z5UVc1amFHOXljeWh3Y21WMlUyVnNaV04wYjNJcE8xeHVYRzVjZEhKbGRIVnliaUFrWlc1MGNtbGxjeTVtYVc1a0tHVnVkSEo1SUQwK0lIdGNibHgwWEhSc1pYUWdibTlrWlNBOUlHVnVkSEo1TG01bGVIUkZiR1Z0Wlc1MFUybGliR2x1Wnp0Y2JseDBYSFJ5WlhSMWNtNGdibTlrWlM1cGJtNWxja2hVVFV4Yk1GMGdQVDA5SUdOb1lYSWdmSHdnYm05a1pTNXBibTVsY2toVVRVeGJNRjBnUFQwOUlHTm9ZWEl1ZEc5VmNIQmxja05oYzJVb0tUdGNibHgwZlNrN1hHNTlPMXh1WEc1Y2JtTnZibk4wSUcxaGEyVkJiSEJvWVdKbGRDQTlJQ2dwSUQwK0lIdGNibHgwWTI5dWMzUWdZWFIwWVdOb1FXNWphRzl5VEdsemRHVnVaWElnUFNBb0pHRnVZMmh2Y2l3Z2JHVjBkR1Z5S1NBOVBpQjdYRzVjZEZ4MEpHRnVZMmh2Y2k1aFpHUkZkbVZ1ZEV4cGMzUmxibVZ5S0NkamJHbGpheWNzSUNncElEMCtJSHRjYmx4MFhIUmNkR052Ym5OMElHeGxkSFJsY2s1dlpHVWdQU0JrYjJOMWJXVnVkQzVuWlhSRmJHVnRaVzUwUW5sSlpDaHNaWFIwWlhJcE8xeHVYSFJjZEZ4MGJHVjBJSFJoY21kbGREdGNibHh1WEhSY2RGeDBhV1lnS0NGemIzSjBTMlY1S1NCN1hHNWNkRngwWEhSY2RIUmhjbWRsZENBOUlHeGxkSFJsY2lBOVBUMGdKMkVuSUQ4Z1pHOWpkVzFsYm5RdVoyVjBSV3hsYldWdWRFSjVTV1FvSjJGdVkyaHZjaTEwWVhKblpYUW5LU0E2SUd4bGRIUmxjazV2WkdVdWNHRnlaVzUwUld4bGJXVnVkQzV3WVhKbGJuUkZiR1Z0Wlc1MExuQmhjbVZ1ZEVWc1pXMWxiblF1Y0dGeVpXNTBSV3hsYldWdWRDNXdjbVYyYVc5MWMwVnNaVzFsYm5SVGFXSnNhVzVuTG5GMVpYSjVVMlZzWldOMGIzSW9KeTVxY3kxaGNuUnBZMnhsTFdGdVkyaHZjaTEwWVhKblpYUW5LVHRjYmx4MFhIUmNkSDBnWld4elpTQjdYRzVjZEZ4MFhIUmNkSFJoY21kbGRDQTlJR3hsZEhSbGNpQTlQVDBnSjJFbklEOGdaRzlqZFcxbGJuUXVaMlYwUld4bGJXVnVkRUo1U1dRb0oyRnVZMmh2Y2kxMFlYSm5aWFFuS1NBNklHeGxkSFJsY2s1dlpHVXVjR0Z5Wlc1MFJXeGxiV1Z1ZEM1d1lYSmxiblJGYkdWdFpXNTBMbkJoY21WdWRFVnNaVzFsYm5RdWNISmxkbWx2ZFhORmJHVnRaVzUwVTJsaWJHbHVaeTV4ZFdWeWVWTmxiR1ZqZEc5eUtDY3Vhbk10WVhKMGFXTnNaUzFoYm1Ob2IzSXRkR0Z5WjJWMEp5azdYRzVjZEZ4MFhIUjlPMXh1WEc1Y2RGeDBYSFIwWVhKblpYUXVjMk55YjJ4c1NXNTBiMVpwWlhjb2UySmxhR0YyYVc5eU9pQmNJbk50YjI5MGFGd2lMQ0JpYkc5amF6b2dYQ0p6ZEdGeWRGd2lmU2s3WEc1Y2RGeDBmU2s3WEc1Y2RIMDdYRzVjYmx4MGJHVjBJR0ZqZEdsMlpVVnVkSEpwWlhNZ1BTQjdmVHRjYmx4MGJHVjBJQ1J2ZFhSbGNpQTlJR1J2WTNWdFpXNTBMbkYxWlhKNVUyVnNaV04wYjNJb0p5NWhiSEJvWVdKbGRGOWZiR1YwZEdWeWN5Y3BPMXh1WEhRa2IzVjBaWEl1YVc1dVpYSklWRTFNSUQwZ0p5YzdYRzVjYmx4MFlXeHdhR0ZpWlhRdVptOXlSV0ZqYUNoc1pYUjBaWElnUFQ0Z2UxeHVYSFJjZEd4bGRDQWtabWx5YzNSRmJuUnllU0E5SUdacGJtUkdhWEp6ZEVWdWRISjVLR3hsZEhSbGNpazdYRzVjZEZ4MGJHVjBJQ1JoYm1Ob2IzSWdQU0JrYjJOMWJXVnVkQzVqY21WaGRHVkZiR1Z0Wlc1MEtDZGhKeWs3WEc1Y2JseDBYSFJwWmlBb0lTUm1hWEp6ZEVWdWRISjVLU0J5WlhSMWNtNDdYRzVjYmx4MFhIUWtabWx5YzNSRmJuUnllUzVwWkNBOUlHeGxkSFJsY2p0Y2JseDBYSFFrWVc1amFHOXlMbWx1Ym1WeVNGUk5UQ0E5SUd4bGRIUmxjaTUwYjFWd2NHVnlRMkZ6WlNncE8xeHVYSFJjZENSaGJtTm9iM0l1WTJ4aGMzTk9ZVzFsSUQwZ0oyRnNjR2hoWW1WMFgxOXNaWFIwWlhJdFlXNWphRzl5Snp0Y2JseHVYSFJjZEdGMGRHRmphRUZ1WTJodmNreHBjM1JsYm1WeUtDUmhibU5vYjNJc0lHeGxkSFJsY2lrN1hHNWNkRngwSkc5MWRHVnlMbUZ3Y0dWdVpFTm9hV3hrS0NSaGJtTm9iM0lwTzF4dVhIUjlLVHRjYm4wN1hHNWNibU52Ym5OMElISmxibVJsY2tsdFlXZGxjeUE5SUNocGJXRm5aWE1zSUNScGJXRm5aWE1wSUQwK0lIdGNibHgwYVcxaFoyVnpMbVp2Y2tWaFkyZ29hVzFoWjJVZ1BUNGdlMXh1WEhSY2RHTnZibk4wSUhOeVl5QTlJR0F1TGk4dUxpOWhjM05sZEhNdmFXMWhaMlZ6THlSN2FXMWhaMlY5WUR0Y2JseDBYSFJzWlhRZ0pHbHRaeUE5SUdSdlkzVnRaVzUwTG1OeVpXRjBaVVZzWlcxbGJuUW9KMGxOUnljcE8xeHVYSFJjZENScGJXY3VZMnhoYzNOT1lXMWxJRDBnSjJGeWRHbGpiR1V0YVcxaFoyVW5PMXh1WEhSY2RDUnBiV2N1YzNKaklEMGdjM0pqTzF4dVhIUmNkQ1JwYldGblpYTXVZWEJ3Wlc1a1EyaHBiR1FvSkdsdFp5azdYRzVjZEgwcFhHNTlPMXh1WEc1amIyNXpkQ0J5Wlc1a1pYSkZiblJ5YVdWeklEMGdLQ2tnUFQ0Z2UxeHVYSFJzWlhRZ0pHRnlkR2xqYkdWTWFYTjBJRDBnWkc5amRXMWxiblF1WjJWMFJXeGxiV1Z1ZEVKNVNXUW9KMnB6TFd4cGMzUW5LVHRjYmx4MGJHVjBJR1Z1ZEhKcFpYTk1hWE4wSUQwZ2MyOXlkRXRsZVNBL0lHVnVkSEpwWlhNdVlubFVhWFJzWlNBNklHVnVkSEpwWlhNdVlubEJkWFJvYjNJN1hHNWNibHgwSkdGeWRHbGpiR1ZNYVhOMExtbHVibVZ5U0ZSTlRDQTlJQ2NuTzF4dVhHNWNkR1Z1ZEhKcFpYTk1hWE4wTG1admNrVmhZMmdvWlc1MGNua2dQVDRnZTF4dVhIUmNkR3hsZENCN0lIUnBkR3hsTENCc1lYTjBUbUZ0WlN3Z1ptbHljM1JPWVcxbExDQnBiV0ZuWlhNc0lHUmxjMk55YVhCMGFXOXVMQ0JrWlhSaGFXd2dmU0E5SUdWdWRISjVPMXh1WEc1Y2RGeDBKR0Z5ZEdsamJHVk1hWE4wTG1sdWMyVnlkRUZrYW1GalpXNTBTRlJOVENnblltVm1iM0psWlc1a0p5d2dZWEowYVdOc1pWUmxiWEJzWVhSbEtUdGNibHh1WEhSY2RHeGxkQ0FrYVcxaFoyVnpUbTlrWlhNZ1BTQmtiMk4xYldWdWRDNXhkV1Z5ZVZObGJHVmpkRzl5UVd4c0tDY3VZWEowYVdOc1pWOWZhVzFoWjJWekxXbHVibVZ5SnlrN1hHNWNkRngwYkdWMElDUnBiV0ZuWlhNZ1BTQWthVzFoWjJWelRtOWtaWE5iSkdsdFlXZGxjMDV2WkdWekxteGxibWQwYUNBdElERmRPMXh1WEc1Y2RGeDBhV1lnS0dsdFlXZGxjeTVzWlc1bmRHZ3BJSEpsYm1SbGNrbHRZV2RsY3locGJXRm5aWE1zSUNScGJXRm5aWE1wTzF4dVhIUmNkRnh1WEhSY2RHeGxkQ0FrWkdWelkzSnBjSFJwYjI1UGRYUmxjaUE5SUdSdlkzVnRaVzUwTG1OeVpXRjBaVVZzWlcxbGJuUW9KMlJwZGljcE8xeHVYSFJjZEd4bGRDQWtaR1Z6WTNKcGNIUnBiMjVPYjJSbElEMGdaRzlqZFcxbGJuUXVZM0psWVhSbFJXeGxiV1Z1ZENnbmNDY3BPMXh1WEhSY2RHeGxkQ0FrWkdWMFlXbHNUbTlrWlNBOUlHUnZZM1Z0Wlc1MExtTnlaV0YwWlVWc1pXMWxiblFvSjNBbktUdGNibHgwWEhRa1pHVnpZM0pwY0hScGIyNVBkWFJsY2k1amJHRnpjMHhwYzNRdVlXUmtLQ2RoY25ScFkyeGxMV1JsYzJOeWFYQjBhVzl1WDE5dmRYUmxjaWNwTzF4dVhIUmNkQ1JrWlhOamNtbHdkR2x2Yms1dlpHVXVZMnhoYzNOTWFYTjBMbUZrWkNnbllYSjBhV05zWlMxa1pYTmpjbWx3ZEdsdmJpY3BPMXh1WEhSY2RDUmtaWFJoYVd4T2IyUmxMbU5zWVhOelRHbHpkQzVoWkdRb0oyRnlkR2xqYkdVdFpHVjBZV2xzSnlrN1hHNWNibHgwWEhRa1pHVnpZM0pwY0hScGIyNU9iMlJsTG1sdWJtVnlTRlJOVENBOUlHUmxjMk55YVhCMGFXOXVPMXh1WEhSY2RDUmtaWFJoYVd4T2IyUmxMbWx1Ym1WeVNGUk5UQ0E5SUdSbGRHRnBiRHRjYmx4dVhIUmNkQ1JrWlhOamNtbHdkR2x2Yms5MWRHVnlMbUZ3Y0dWdVpFTm9hV3hrS0NSa1pYTmpjbWx3ZEdsdmJrNXZaR1VzSUNSa1pYUmhhV3hPYjJSbEtUdGNibHgwWEhRa2FXMWhaMlZ6TG1Gd2NHVnVaRU5vYVd4a0tDUmtaWE5qY21sd2RHbHZiazkxZEdWeUtUdGNibHh1WEhSY2RHeGxkQ0FrZEdsMGJHVk9iMlJsY3lBOUlHUnZZM1Z0Wlc1MExuRjFaWEo1VTJWc1pXTjBiM0pCYkd3b0p5NWhjblJwWTJ4bExXaGxZV1JwYm1kZlgzUnBkR3hsSnlrN1hHNWNkRngwYkdWMElDUjBhWFJzWlNBOUlDUjBhWFJzWlU1dlpHVnpXeVIwYVhSc1pVNXZaR1Z6TG14bGJtZDBhQ0F0SURGZE8xeHVYRzVjZEZ4MGJHVjBJQ1JtYVhKemRFNXZaR1Z6SUQwZ1pHOWpkVzFsYm5RdWNYVmxjbmxUWld4bFkzUnZja0ZzYkNnbkxtRnlkR2xqYkdVdGFHVmhaR2x1WjE5ZmJtRnRaUzB0Wm1seWMzUW5LVHRjYmx4MFhIUnNaWFFnSkdacGNuTjBJRDBnSkdacGNuTjBUbTlrWlhOYkpHWnBjbk4wVG05a1pYTXViR1Z1WjNSb0lDMGdNVjA3WEc1Y2JseDBYSFJzWlhRZ0pHeGhjM1JPYjJSbGN5QTlJR1J2WTNWdFpXNTBMbkYxWlhKNVUyVnNaV04wYjNKQmJHd29KeTVoY25ScFkyeGxMV2hsWVdScGJtZGZYMjVoYldVdExXeGhjM1FuS1R0Y2JseDBYSFJzWlhRZ0pHeGhjM1FnUFNBa2JHRnpkRTV2WkdWeld5UnNZWE4wVG05a1pYTXViR1Z1WjNSb0lDMGdNVjA3WEc1Y2JseDBYSFFrZEdsMGJHVXVhVzV1WlhKSVZFMU1JRDBnZEdsMGJHVTdYRzVjZEZ4MEpHWnBjbk4wTG1sdWJtVnlTRlJOVENBOUlHWnBjbk4wVG1GdFpUdGNibHgwWEhRa2JHRnpkQzVwYm01bGNraFVUVXdnUFNCc1lYTjBUbUZ0WlR0Y2JseHVYSFI5S1R0Y2JseHVYSFJoZEhSaFkyaEpiV0ZuWlV4cGMzUmxibVZ5Y3lncE8xeHVYSFJ0WVd0bFFXeHdhR0ZpWlhRb0tUdGNibjA3WEc1Y2JpOHZJSFJvYVhNZ2JtVmxaSE1nZEc4Z1ltVWdZU0JrWldWd1pYSWdjMjl5ZEZ4dVkyOXVjM1FnYzI5eWRFSjVWR2wwYkdVZ1BTQW9LU0E5UGlCN1hHNWNkR1Z1ZEhKcFpYTXVZbmxVYVhSc1pTNXpiM0owS0NoaExDQmlLU0E5UGlCN1hHNWNkRngwYkdWMElHRlVhWFJzWlNBOUlHRXVkR2wwYkdWYk1GMHVkRzlWY0hCbGNrTmhjMlVvS1R0Y2JseDBYSFJzWlhRZ1lsUnBkR3hsSUQwZ1lpNTBhWFJzWlZzd1hTNTBiMVZ3Y0dWeVEyRnpaU2dwTzF4dVhIUmNkR2xtSUNoaFZHbDBiR1VnUGlCaVZHbDBiR1VwSUhKbGRIVnliaUF4TzF4dVhIUmNkR1ZzYzJVZ2FXWWdLR0ZVYVhSc1pTQThJR0pVYVhSc1pTa2djbVYwZFhKdUlDMHhPMXh1WEhSY2RHVnNjMlVnY21WMGRYSnVJREE3WEc1Y2RIMHBPMXh1ZlR0Y2JseHVZMjl1YzNRZ2MyVjBSR0YwWVNBOUlDaGtZWFJoS1NBOVBpQjdYRzVjZEdWdWRISnBaWE11WW5sQmRYUm9iM0lnUFNCa1lYUmhPMXh1WEhSbGJuUnlhV1Z6TG1KNVZHbDBiR1VnUFNCa1lYUmhMbk5zYVdObEtDazdYRzVjZEhOdmNuUkNlVlJwZEd4bEtDazdYRzVjZEhKbGJtUmxja1Z1ZEhKcFpYTW9LVHRjYm4xY2JseHVZMjl1YzNRZ1ptVjBZMmhFWVhSaElEMGdLQ2tnUFQ0Z2UxeHVYSFJjZEdabGRHTm9LRVJDS1M1MGFHVnVLSEpsY3lBOVBseHVYSFJjZEZ4MGNtVnpMbXB6YjI0b0tWeHVYSFJjZENrdWRHaGxiaWhrWVhSaElEMCtJSHRjYmx4MFhIUmNkSE5sZEVSaGRHRW9aR0YwWVNrN1hHNWNkRngwZlNsY2JseDBYSFF1ZEdobGJpZ29LU0E5UGlCN1hHNWNkRngwWEhRa2JHOWhaR2x1Wnk1bWIzSkZZV05vS0dWc1pXMGdQVDRnWld4bGJTNWpiR0Z6YzB4cGMzUXVZV1JrS0NkeVpXRmtlU2NwS1R0Y2JseDBYSFJjZENSdVlYWXVZMnhoYzNOTWFYTjBMbUZrWkNnbmNtVmhaSGtuS1R0Y2JseDBYSFI5S1Z4dVhIUmNkQzVqWVhSamFDaGxjbklnUFQ0Z1kyOXVjMjlzWlM1M1lYSnVLR1Z5Y2lrcE8xeHVmVHRjYmx4dVkyOXVjM1FnYVc1cGRDQTlJQ2dwSUQwK0lIdGNibHgwWm1WMFkyaEVZWFJoS0NrN1hHNWNkRzVoZGt4bktDazdYRzVjZEhKbGJtUmxja1Z1ZEhKcFpYTW9LVHRjYmx4MFlXUmtVMjl5ZEVKMWRIUnZia3hwYzNSbGJtVnljeWdwTzF4dVhIUmhkSFJoWTJoQmNuSnZkMHhwYzNSbGJtVnljeWdwTzF4dVhIUmhkSFJoWTJoTmIyUmhiRXhwYzNSbGJtVnljeWdwTzF4dWZWeHVYRzVwYm1sMEtDazdYRzRpTENKamIyNXpkQ0IwWlcxd2JHRjBaU0E5SUZ4dVhIUmdQR1JwZGlCamJHRnpjejFjSW01aGRsOWZhVzV1WlhKY0lqNWNibHgwWEhROFpHbDJJR05zWVhOelBWd2libUYyWDE5emIzSjBMV0o1WENJK1hHNWNkRngwWEhROGMzQmhiaUJqYkdGemN6MWNJbk52Y25RdFlubGZYM1JwZEd4bFhDSStVMjl5ZENCaWVUd3ZjM0JoYmo1Y2JseDBYSFJjZER4aWRYUjBiMjRnWTJ4aGMzTTlYQ0p6YjNKMExXSjVYMTlpZVMxaGNuUnBjM1FnWVdOMGFYWmxYQ0lnYVdROVhDSnFjeTFpZVMxaGNuUnBjM1JjSWo1QmNuUnBjM1E4TDJKMWRIUnZiajVjYmx4MFhIUmNkRHh6Y0dGdUlHTnNZWE56UFZ3aWMyOXlkQzFpZVY5ZlpHbDJhV1JsY2x3aVBpQjhJRHd2YzNCaGJqNWNibHgwWEhSY2REeGlkWFIwYjI0Z1kyeGhjM005WENKemIzSjBMV0o1WDE5aWVTMTBhWFJzWlZ3aUlHbGtQVndpYW5NdFlua3RkR2wwYkdWY0lqNVVhWFJzWlR3dlluVjBkRzl1UGx4dVhIUmNkRngwUEhOd1lXNGdZMnhoYzNNOVhDSnpiM0owTFdKNVgxOWthWFpwWkdWeUlHWnBibVJjSWo0Z2ZDQThMM053WVc0K1hHNWNkRngwWEhROGMzQmhiaUJqYkdGemN6MWNJbVpwYm1SY0lpQnBaRDFjSW1wekxXWnBibVJjSWo0bUl6ZzVPRFE3Ump3dmMzQmhiajVjYmx4MFhIUThMMlJwZGo1Y2JseDBYSFE4WkdsMklHTnNZWE56UFZ3aWJtRjJYMTloYkhCb1lXSmxkRndpUGx4dVhIUmNkRngwUEhOd1lXNGdZMnhoYzNNOVhDSmhiSEJvWVdKbGRGOWZkR2wwYkdWY0lqNUhieUIwYnp3dmMzQmhiajVjYmx4MFhIUmNkRHhrYVhZZ1kyeGhjM005WENKaGJIQm9ZV0psZEY5ZmJHVjBkR1Z5YzF3aVBqd3ZaR2wyUGx4dVhIUmNkRHd2WkdsMlBseHVYSFE4TDJScGRqNWdPMXh1WEc1amIyNXpkQ0J1WVhaTVp5QTlJQ2dwSUQwK0lIdGNibHgwYkdWMElHNWhkazkxZEdWeUlEMGdaRzlqZFcxbGJuUXVaMlYwUld4bGJXVnVkRUo1U1dRb0oycHpMVzVoZGljcE8xeHVYSFJ1WVhaUGRYUmxjaTVwYm01bGNraFVUVXdnUFNCMFpXMXdiR0YwWlR0Y2JuMDdYRzVjYm1WNGNHOXlkQ0JrWldaaGRXeDBJRzVoZGt4bk95SmRmUT09In0=
