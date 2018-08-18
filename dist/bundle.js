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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvd2hhdHdnLWZldGNoL2ZldGNoLmpzIiwic3JjL2pzL2FydGljbGUtdGVtcGxhdGUuanMiLCJzcmMvanMvaW5kZXguanMiLCJzcmMvanMvbmF2LWxnLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7OztBQ2xkQSxJQUFNLGlwQkFBTjs7a0JBbUJlLGU7Ozs7O0FDbkJmOztBQUNBOzs7O0FBQ0E7Ozs7OztBQUVBLElBQU0sS0FBSywrRkFBWDtBQUNBLElBQU0sV0FBVyxDQUFDLEdBQUQsRUFBTSxHQUFOLEVBQVcsR0FBWCxFQUFnQixHQUFoQixFQUFxQixHQUFyQixFQUEwQixHQUExQixFQUEr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UyxTQUFULEdBQXFCLFFBQXJCO0FBQ0EsQ0FIRDs7a0JBS2UsSyIsImZpbGUiOiJidW5kbGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiKGZ1bmN0aW9uKHNlbGYpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIGlmIChzZWxmLmZldGNoKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICB2YXIgc3VwcG9ydCA9IHtcbiAgICBzZWFyY2hQYXJhbXM6ICdVUkxTZWFyY2hQYXJhbXMnIGluIHNlbGYsXG4gICAgaXRlcmFibGU6ICdTeW1ib2wnIGluIHNlbGYgJiYgJ2l0ZXJhdG9yJyBpbiBTeW1ib2wsXG4gICAgYmxvYjogJ0ZpbGVSZWFkZXInIGluIHNlbGYgJiYgJ0Jsb2InIGluIHNlbGYgJiYgKGZ1bmN0aW9uKCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgbmV3IEJsb2IoKVxuICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfVxuICAgIH0pKCksXG4gICAgZm9ybURhdGE6ICdGb3JtRGF0YScgaW4gc2VsZixcbiAgICBhcnJheUJ1ZmZlcjogJ0FycmF5QnVmZmVyJyBpbiBzZWxmXG4gIH1cblxuICBpZiAoc3VwcG9ydC5hcnJheUJ1ZmZlcikge1xuICAgIHZhciB2aWV3Q2xhc3NlcyA9IFtcbiAgICAgICdbb2JqZWN0IEludDhBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgVWludDhBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgVWludDhDbGFtcGVkQXJyYXldJyxcbiAgICAgICdbb2JqZWN0IEludDE2QXJyYXldJyxcbiAgICAgICdbb2JqZWN0IFVpbnQxNkFycmF5XScsXG4gICAgICAnW29iamVjdCBJbnQzMkFycmF5XScsXG4gICAgICAnW29iamVjdCBVaW50MzJBcnJheV0nLFxuICAgICAgJ1tvYmplY3QgRmxvYXQzMkFycmF5XScsXG4gICAgICAnW29iamVjdCBGbG9hdDY0QXJyYXldJ1xuICAgIF1cblxuICAgIHZhciBpc0RhdGFWaWV3ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgICByZXR1cm4gb2JqICYmIERhdGFWaWV3LnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKG9iailcbiAgICB9XG5cbiAgICB2YXIgaXNBcnJheUJ1ZmZlclZpZXcgPSBBcnJheUJ1ZmZlci5pc1ZpZXcgfHwgZnVuY3Rpb24ob2JqKSB7XG4gICAgICByZXR1cm4gb2JqICYmIHZpZXdDbGFzc2VzLmluZGV4T2YoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iaikpID4gLTFcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBub3JtYWxpemVOYW1lKG5hbWUpIHtcbiAgICBpZiAodHlwZW9mIG5hbWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICBuYW1lID0gU3RyaW5nKG5hbWUpXG4gICAgfVxuICAgIGlmICgvW15hLXowLTlcXC0jJCUmJyorLlxcXl9gfH5dL2kudGVzdChuYW1lKSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBjaGFyYWN0ZXIgaW4gaGVhZGVyIGZpZWxkIG5hbWUnKVxuICAgIH1cbiAgICByZXR1cm4gbmFtZS50b0xvd2VyQ2FzZSgpXG4gIH1cblxuICBmdW5jdGlvbiBub3JtYWxpemVWYWx1ZSh2YWx1ZSkge1xuICAgIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICB2YWx1ZSA9IFN0cmluZyh2YWx1ZSlcbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlXG4gIH1cblxuICAvLyBCdWlsZCBhIGRlc3RydWN0aXZlIGl0ZXJhdG9yIGZvciB0aGUgdmFsdWUgbGlzdFxuICBmdW5jdGlvbiBpdGVyYXRvckZvcihpdGVtcykge1xuICAgIHZhciBpdGVyYXRvciA9IHtcbiAgICAgIG5leHQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgdmFsdWUgPSBpdGVtcy5zaGlmdCgpXG4gICAgICAgIHJldHVybiB7ZG9uZTogdmFsdWUgPT09IHVuZGVmaW5lZCwgdmFsdWU6IHZhbHVlfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzdXBwb3J0Lml0ZXJhYmxlKSB7XG4gICAgICBpdGVyYXRvcltTeW1ib2wuaXRlcmF0b3JdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBpdGVyYXRvclxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBpdGVyYXRvclxuICB9XG5cbiAgZnVuY3Rpb24gSGVhZGVycyhoZWFkZXJzKSB7XG4gICAgdGhpcy5tYXAgPSB7fVxuXG4gICAgaWYgKGhlYWRlcnMgaW5zdGFuY2VvZiBIZWFkZXJzKSB7XG4gICAgICBoZWFkZXJzLmZvckVhY2goZnVuY3Rpb24odmFsdWUsIG5hbWUpIHtcbiAgICAgICAgdGhpcy5hcHBlbmQobmFtZSwgdmFsdWUpXG4gICAgICB9LCB0aGlzKVxuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShoZWFkZXJzKSkge1xuICAgICAgaGVhZGVycy5mb3JFYWNoKGZ1bmN0aW9uKGhlYWRlcikge1xuICAgICAgICB0aGlzLmFwcGVuZChoZWFkZXJbMF0sIGhlYWRlclsxXSlcbiAgICAgIH0sIHRoaXMpXG4gICAgfSBlbHNlIGlmIChoZWFkZXJzKSB7XG4gICAgICBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhoZWFkZXJzKS5mb3JFYWNoKGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgICAgdGhpcy5hcHBlbmQobmFtZSwgaGVhZGVyc1tuYW1lXSlcbiAgICAgIH0sIHRoaXMpXG4gICAgfVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuYXBwZW5kID0gZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgICBuYW1lID0gbm9ybWFsaXplTmFtZShuYW1lKVxuICAgIHZhbHVlID0gbm9ybWFsaXplVmFsdWUodmFsdWUpXG4gICAgdmFyIG9sZFZhbHVlID0gdGhpcy5tYXBbbmFtZV1cbiAgICB0aGlzLm1hcFtuYW1lXSA9IG9sZFZhbHVlID8gb2xkVmFsdWUrJywnK3ZhbHVlIDogdmFsdWVcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlWydkZWxldGUnXSA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICBkZWxldGUgdGhpcy5tYXBbbm9ybWFsaXplTmFtZShuYW1lKV1cbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICBuYW1lID0gbm9ybWFsaXplTmFtZShuYW1lKVxuICAgIHJldHVybiB0aGlzLmhhcyhuYW1lKSA/IHRoaXMubWFwW25hbWVdIDogbnVsbFxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuaGFzID0gZnVuY3Rpb24obmFtZSkge1xuICAgIHJldHVybiB0aGlzLm1hcC5oYXNPd25Qcm9wZXJ0eShub3JtYWxpemVOYW1lKG5hbWUpKVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgICB0aGlzLm1hcFtub3JtYWxpemVOYW1lKG5hbWUpXSA9IG5vcm1hbGl6ZVZhbHVlKHZhbHVlKVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuZm9yRWFjaCA9IGZ1bmN0aW9uKGNhbGxiYWNrLCB0aGlzQXJnKSB7XG4gICAgZm9yICh2YXIgbmFtZSBpbiB0aGlzLm1hcCkge1xuICAgICAgaWYgKHRoaXMubWFwLmhhc093blByb3BlcnR5KG5hbWUpKSB7XG4gICAgICAgIGNhbGxiYWNrLmNhbGwodGhpc0FyZywgdGhpcy5tYXBbbmFtZV0sIG5hbWUsIHRoaXMpXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUua2V5cyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBpdGVtcyA9IFtdXG4gICAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlLCBuYW1lKSB7IGl0ZW1zLnB1c2gobmFtZSkgfSlcbiAgICByZXR1cm4gaXRlcmF0b3JGb3IoaXRlbXMpXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS52YWx1ZXMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgaXRlbXMgPSBbXVxuICAgIHRoaXMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSkgeyBpdGVtcy5wdXNoKHZhbHVlKSB9KVxuICAgIHJldHVybiBpdGVyYXRvckZvcihpdGVtcylcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmVudHJpZXMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgaXRlbXMgPSBbXVxuICAgIHRoaXMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSwgbmFtZSkgeyBpdGVtcy5wdXNoKFtuYW1lLCB2YWx1ZV0pIH0pXG4gICAgcmV0dXJuIGl0ZXJhdG9yRm9yKGl0ZW1zKVxuICB9XG5cbiAgaWYgKHN1cHBvcnQuaXRlcmFibGUpIHtcbiAgICBIZWFkZXJzLnByb3RvdHlwZVtTeW1ib2wuaXRlcmF0b3JdID0gSGVhZGVycy5wcm90b3R5cGUuZW50cmllc1xuICB9XG5cbiAgZnVuY3Rpb24gY29uc3VtZWQoYm9keSkge1xuICAgIGlmIChib2R5LmJvZHlVc2VkKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IFR5cGVFcnJvcignQWxyZWFkeSByZWFkJykpXG4gICAgfVxuICAgIGJvZHkuYm9keVVzZWQgPSB0cnVlXG4gIH1cblxuICBmdW5jdGlvbiBmaWxlUmVhZGVyUmVhZHkocmVhZGVyKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgcmVhZGVyLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXNvbHZlKHJlYWRlci5yZXN1bHQpXG4gICAgICB9XG4gICAgICByZWFkZXIub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QocmVhZGVyLmVycm9yKVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICBmdW5jdGlvbiByZWFkQmxvYkFzQXJyYXlCdWZmZXIoYmxvYikge1xuICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpXG4gICAgdmFyIHByb21pc2UgPSBmaWxlUmVhZGVyUmVhZHkocmVhZGVyKVxuICAgIHJlYWRlci5yZWFkQXNBcnJheUJ1ZmZlcihibG9iKVxuICAgIHJldHVybiBwcm9taXNlXG4gIH1cblxuICBmdW5jdGlvbiByZWFkQmxvYkFzVGV4dChibG9iKSB7XG4gICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKClcbiAgICB2YXIgcHJvbWlzZSA9IGZpbGVSZWFkZXJSZWFkeShyZWFkZXIpXG4gICAgcmVhZGVyLnJlYWRBc1RleHQoYmxvYilcbiAgICByZXR1cm4gcHJvbWlzZVxuICB9XG5cbiAgZnVuY3Rpb24gcmVhZEFycmF5QnVmZmVyQXNUZXh0KGJ1Zikge1xuICAgIHZhciB2aWV3ID0gbmV3IFVpbnQ4QXJyYXkoYnVmKVxuICAgIHZhciBjaGFycyA9IG5ldyBBcnJheSh2aWV3Lmxlbmd0aClcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdmlldy5sZW5ndGg7IGkrKykge1xuICAgICAgY2hhcnNbaV0gPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHZpZXdbaV0pXG4gICAgfVxuICAgIHJldHVybiBjaGFycy5qb2luKCcnKVxuICB9XG5cbiAgZnVuY3Rpb24gYnVmZmVyQ2xvbmUoYnVmKSB7XG4gICAgaWYgKGJ1Zi5zbGljZSkge1xuICAgICAgcmV0dXJuIGJ1Zi5zbGljZSgwKVxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgdmlldyA9IG5ldyBVaW50OEFycmF5KGJ1Zi5ieXRlTGVuZ3RoKVxuICAgICAgdmlldy5zZXQobmV3IFVpbnQ4QXJyYXkoYnVmKSlcbiAgICAgIHJldHVybiB2aWV3LmJ1ZmZlclxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIEJvZHkoKSB7XG4gICAgdGhpcy5ib2R5VXNlZCA9IGZhbHNlXG5cbiAgICB0aGlzLl9pbml0Qm9keSA9IGZ1bmN0aW9uKGJvZHkpIHtcbiAgICAgIHRoaXMuX2JvZHlJbml0ID0gYm9keVxuICAgICAgaWYgKCFib2R5KSB7XG4gICAgICAgIHRoaXMuX2JvZHlUZXh0ID0gJydcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGJvZHkgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRoaXMuX2JvZHlUZXh0ID0gYm9keVxuICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LmJsb2IgJiYgQmxvYi5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihib2R5KSkge1xuICAgICAgICB0aGlzLl9ib2R5QmxvYiA9IGJvZHlcbiAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5mb3JtRGF0YSAmJiBGb3JtRGF0YS5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihib2R5KSkge1xuICAgICAgICB0aGlzLl9ib2R5Rm9ybURhdGEgPSBib2R5XG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuc2VhcmNoUGFyYW1zICYmIFVSTFNlYXJjaFBhcmFtcy5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihib2R5KSkge1xuICAgICAgICB0aGlzLl9ib2R5VGV4dCA9IGJvZHkudG9TdHJpbmcoKVxuICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LmFycmF5QnVmZmVyICYmIHN1cHBvcnQuYmxvYiAmJiBpc0RhdGFWaWV3KGJvZHkpKSB7XG4gICAgICAgIHRoaXMuX2JvZHlBcnJheUJ1ZmZlciA9IGJ1ZmZlckNsb25lKGJvZHkuYnVmZmVyKVxuICAgICAgICAvLyBJRSAxMC0xMSBjYW4ndCBoYW5kbGUgYSBEYXRhVmlldyBib2R5LlxuICAgICAgICB0aGlzLl9ib2R5SW5pdCA9IG5ldyBCbG9iKFt0aGlzLl9ib2R5QXJyYXlCdWZmZXJdKVxuICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LmFycmF5QnVmZmVyICYmIChBcnJheUJ1ZmZlci5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihib2R5KSB8fCBpc0FycmF5QnVmZmVyVmlldyhib2R5KSkpIHtcbiAgICAgICAgdGhpcy5fYm9keUFycmF5QnVmZmVyID0gYnVmZmVyQ2xvbmUoYm9keSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcigndW5zdXBwb3J0ZWQgQm9keUluaXQgdHlwZScpXG4gICAgICB9XG5cbiAgICAgIGlmICghdGhpcy5oZWFkZXJzLmdldCgnY29udGVudC10eXBlJykpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBib2R5ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgIHRoaXMuaGVhZGVycy5zZXQoJ2NvbnRlbnQtdHlwZScsICd0ZXh0L3BsYWluO2NoYXJzZXQ9VVRGLTgnKVxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2JvZHlCbG9iICYmIHRoaXMuX2JvZHlCbG9iLnR5cGUpIHtcbiAgICAgICAgICB0aGlzLmhlYWRlcnMuc2V0KCdjb250ZW50LXR5cGUnLCB0aGlzLl9ib2R5QmxvYi50eXBlKVxuICAgICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuc2VhcmNoUGFyYW1zICYmIFVSTFNlYXJjaFBhcmFtcy5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihib2R5KSkge1xuICAgICAgICAgIHRoaXMuaGVhZGVycy5zZXQoJ2NvbnRlbnQtdHlwZScsICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQ7Y2hhcnNldD1VVEYtOCcpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoc3VwcG9ydC5ibG9iKSB7XG4gICAgICB0aGlzLmJsb2IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHJlamVjdGVkID0gY29uc3VtZWQodGhpcylcbiAgICAgICAgaWYgKHJlamVjdGVkKSB7XG4gICAgICAgICAgcmV0dXJuIHJlamVjdGVkXG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5fYm9keUJsb2IpIHtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRoaXMuX2JvZHlCbG9iKVxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2JvZHlBcnJheUJ1ZmZlcikge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUobmV3IEJsb2IoW3RoaXMuX2JvZHlBcnJheUJ1ZmZlcl0pKVxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2JvZHlGb3JtRGF0YSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignY291bGQgbm90IHJlYWQgRm9ybURhdGEgYm9keSBhcyBibG9iJylcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKG5ldyBCbG9iKFt0aGlzLl9ib2R5VGV4dF0pKVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHRoaXMuYXJyYXlCdWZmZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHRoaXMuX2JvZHlBcnJheUJ1ZmZlcikge1xuICAgICAgICAgIHJldHVybiBjb25zdW1lZCh0aGlzKSB8fCBQcm9taXNlLnJlc29sdmUodGhpcy5fYm9keUFycmF5QnVmZmVyKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiB0aGlzLmJsb2IoKS50aGVuKHJlYWRCbG9iQXNBcnJheUJ1ZmZlcilcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMudGV4dCA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHJlamVjdGVkID0gY29uc3VtZWQodGhpcylcbiAgICAgIGlmIChyZWplY3RlZCkge1xuICAgICAgICByZXR1cm4gcmVqZWN0ZWRcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuX2JvZHlCbG9iKSB7XG4gICAgICAgIHJldHVybiByZWFkQmxvYkFzVGV4dCh0aGlzLl9ib2R5QmxvYilcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUFycmF5QnVmZmVyKSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUocmVhZEFycmF5QnVmZmVyQXNUZXh0KHRoaXMuX2JvZHlBcnJheUJ1ZmZlcikpXG4gICAgICB9IGVsc2UgaWYgKHRoaXMuX2JvZHlGb3JtRGF0YSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NvdWxkIG5vdCByZWFkIEZvcm1EYXRhIGJvZHkgYXMgdGV4dCcpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRoaXMuX2JvZHlUZXh0KVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzdXBwb3J0LmZvcm1EYXRhKSB7XG4gICAgICB0aGlzLmZvcm1EYXRhID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnRleHQoKS50aGVuKGRlY29kZSlcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmpzb24gPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLnRleHQoKS50aGVuKEpTT04ucGFyc2UpXG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIC8vIEhUVFAgbWV0aG9kcyB3aG9zZSBjYXBpdGFsaXphdGlvbiBzaG91bGQgYmUgbm9ybWFsaXplZFxuICB2YXIgbWV0aG9kcyA9IFsnREVMRVRFJywgJ0dFVCcsICdIRUFEJywgJ09QVElPTlMnLCAnUE9TVCcsICdQVVQnXVxuXG4gIGZ1bmN0aW9uIG5vcm1hbGl6ZU1ldGhvZChtZXRob2QpIHtcbiAgICB2YXIgdXBjYXNlZCA9IG1ldGhvZC50b1VwcGVyQ2FzZSgpXG4gICAgcmV0dXJuIChtZXRob2RzLmluZGV4T2YodXBjYXNlZCkgPiAtMSkgPyB1cGNhc2VkIDogbWV0aG9kXG4gIH1cblxuICBmdW5jdGlvbiBSZXF1ZXN0KGlucHV0LCBvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge31cbiAgICB2YXIgYm9keSA9IG9wdGlvbnMuYm9keVxuXG4gICAgaWYgKGlucHV0IGluc3RhbmNlb2YgUmVxdWVzdCkge1xuICAgICAgaWYgKGlucHV0LmJvZHlVc2VkKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FscmVhZHkgcmVhZCcpXG4gICAgICB9XG4gICAgICB0aGlzLnVybCA9IGlucHV0LnVybFxuICAgICAgdGhpcy5jcmVkZW50aWFscyA9IGlucHV0LmNyZWRlbnRpYWxzXG4gICAgICBpZiAoIW9wdGlvbnMuaGVhZGVycykge1xuICAgICAgICB0aGlzLmhlYWRlcnMgPSBuZXcgSGVhZGVycyhpbnB1dC5oZWFkZXJzKVxuICAgICAgfVxuICAgICAgdGhpcy5tZXRob2QgPSBpbnB1dC5tZXRob2RcbiAgICAgIHRoaXMubW9kZSA9IGlucHV0Lm1vZGVcbiAgICAgIGlmICghYm9keSAmJiBpbnB1dC5fYm9keUluaXQgIT0gbnVsbCkge1xuICAgICAgICBib2R5ID0gaW5wdXQuX2JvZHlJbml0XG4gICAgICAgIGlucHV0LmJvZHlVc2VkID0gdHJ1ZVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnVybCA9IFN0cmluZyhpbnB1dClcbiAgICB9XG5cbiAgICB0aGlzLmNyZWRlbnRpYWxzID0gb3B0aW9ucy5jcmVkZW50aWFscyB8fCB0aGlzLmNyZWRlbnRpYWxzIHx8ICdvbWl0J1xuICAgIGlmIChvcHRpb25zLmhlYWRlcnMgfHwgIXRoaXMuaGVhZGVycykge1xuICAgICAgdGhpcy5oZWFkZXJzID0gbmV3IEhlYWRlcnMob3B0aW9ucy5oZWFkZXJzKVxuICAgIH1cbiAgICB0aGlzLm1ldGhvZCA9IG5vcm1hbGl6ZU1ldGhvZChvcHRpb25zLm1ldGhvZCB8fCB0aGlzLm1ldGhvZCB8fCAnR0VUJylcbiAgICB0aGlzLm1vZGUgPSBvcHRpb25zLm1vZGUgfHwgdGhpcy5tb2RlIHx8IG51bGxcbiAgICB0aGlzLnJlZmVycmVyID0gbnVsbFxuXG4gICAgaWYgKCh0aGlzLm1ldGhvZCA9PT0gJ0dFVCcgfHwgdGhpcy5tZXRob2QgPT09ICdIRUFEJykgJiYgYm9keSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQm9keSBub3QgYWxsb3dlZCBmb3IgR0VUIG9yIEhFQUQgcmVxdWVzdHMnKVxuICAgIH1cbiAgICB0aGlzLl9pbml0Qm9keShib2R5KVxuICB9XG5cbiAgUmVxdWVzdC5wcm90b3R5cGUuY2xvbmUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IFJlcXVlc3QodGhpcywgeyBib2R5OiB0aGlzLl9ib2R5SW5pdCB9KVxuICB9XG5cbiAgZnVuY3Rpb24gZGVjb2RlKGJvZHkpIHtcbiAgICB2YXIgZm9ybSA9IG5ldyBGb3JtRGF0YSgpXG4gICAgYm9keS50cmltKCkuc3BsaXQoJyYnKS5mb3JFYWNoKGZ1bmN0aW9uKGJ5dGVzKSB7XG4gICAgICBpZiAoYnl0ZXMpIHtcbiAgICAgICAgdmFyIHNwbGl0ID0gYnl0ZXMuc3BsaXQoJz0nKVxuICAgICAgICB2YXIgbmFtZSA9IHNwbGl0LnNoaWZ0KCkucmVwbGFjZSgvXFwrL2csICcgJylcbiAgICAgICAgdmFyIHZhbHVlID0gc3BsaXQuam9pbignPScpLnJlcGxhY2UoL1xcKy9nLCAnICcpXG4gICAgICAgIGZvcm0uYXBwZW5kKGRlY29kZVVSSUNvbXBvbmVudChuYW1lKSwgZGVjb2RlVVJJQ29tcG9uZW50KHZhbHVlKSlcbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiBmb3JtXG4gIH1cblxuICBmdW5jdGlvbiBwYXJzZUhlYWRlcnMocmF3SGVhZGVycykge1xuICAgIHZhciBoZWFkZXJzID0gbmV3IEhlYWRlcnMoKVxuICAgIC8vIFJlcGxhY2UgaW5zdGFuY2VzIG9mIFxcclxcbiBhbmQgXFxuIGZvbGxvd2VkIGJ5IGF0IGxlYXN0IG9uZSBzcGFjZSBvciBob3Jpem9udGFsIHRhYiB3aXRoIGEgc3BhY2VcbiAgICAvLyBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjNzIzMCNzZWN0aW9uLTMuMlxuICAgIHZhciBwcmVQcm9jZXNzZWRIZWFkZXJzID0gcmF3SGVhZGVycy5yZXBsYWNlKC9cXHI/XFxuW1xcdCBdKy9nLCAnICcpXG4gICAgcHJlUHJvY2Vzc2VkSGVhZGVycy5zcGxpdCgvXFxyP1xcbi8pLmZvckVhY2goZnVuY3Rpb24obGluZSkge1xuICAgICAgdmFyIHBhcnRzID0gbGluZS5zcGxpdCgnOicpXG4gICAgICB2YXIga2V5ID0gcGFydHMuc2hpZnQoKS50cmltKClcbiAgICAgIGlmIChrZXkpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gcGFydHMuam9pbignOicpLnRyaW0oKVxuICAgICAgICBoZWFkZXJzLmFwcGVuZChrZXksIHZhbHVlKVxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIGhlYWRlcnNcbiAgfVxuXG4gIEJvZHkuY2FsbChSZXF1ZXN0LnByb3RvdHlwZSlcblxuICBmdW5jdGlvbiBSZXNwb25zZShib2R5SW5pdCwgb3B0aW9ucykge1xuICAgIGlmICghb3B0aW9ucykge1xuICAgICAgb3B0aW9ucyA9IHt9XG4gICAgfVxuXG4gICAgdGhpcy50eXBlID0gJ2RlZmF1bHQnXG4gICAgdGhpcy5zdGF0dXMgPSBvcHRpb25zLnN0YXR1cyA9PT0gdW5kZWZpbmVkID8gMjAwIDogb3B0aW9ucy5zdGF0dXNcbiAgICB0aGlzLm9rID0gdGhpcy5zdGF0dXMgPj0gMjAwICYmIHRoaXMuc3RhdHVzIDwgMzAwXG4gICAgdGhpcy5zdGF0dXNUZXh0ID0gJ3N0YXR1c1RleHQnIGluIG9wdGlvbnMgPyBvcHRpb25zLnN0YXR1c1RleHQgOiAnT0snXG4gICAgdGhpcy5oZWFkZXJzID0gbmV3IEhlYWRlcnMob3B0aW9ucy5oZWFkZXJzKVxuICAgIHRoaXMudXJsID0gb3B0aW9ucy51cmwgfHwgJydcbiAgICB0aGlzLl9pbml0Qm9keShib2R5SW5pdClcbiAgfVxuXG4gIEJvZHkuY2FsbChSZXNwb25zZS5wcm90b3R5cGUpXG5cbiAgUmVzcG9uc2UucHJvdG90eXBlLmNsb25lID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZSh0aGlzLl9ib2R5SW5pdCwge1xuICAgICAgc3RhdHVzOiB0aGlzLnN0YXR1cyxcbiAgICAgIHN0YXR1c1RleHQ6IHRoaXMuc3RhdHVzVGV4dCxcbiAgICAgIGhlYWRlcnM6IG5ldyBIZWFkZXJzKHRoaXMuaGVhZGVycyksXG4gICAgICB1cmw6IHRoaXMudXJsXG4gICAgfSlcbiAgfVxuXG4gIFJlc3BvbnNlLmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHJlc3BvbnNlID0gbmV3IFJlc3BvbnNlKG51bGwsIHtzdGF0dXM6IDAsIHN0YXR1c1RleHQ6ICcnfSlcbiAgICByZXNwb25zZS50eXBlID0gJ2Vycm9yJ1xuICAgIHJldHVybiByZXNwb25zZVxuICB9XG5cbiAgdmFyIHJlZGlyZWN0U3RhdHVzZXMgPSBbMzAxLCAzMDIsIDMwMywgMzA3LCAzMDhdXG5cbiAgUmVzcG9uc2UucmVkaXJlY3QgPSBmdW5jdGlvbih1cmwsIHN0YXR1cykge1xuICAgIGlmIChyZWRpcmVjdFN0YXR1c2VzLmluZGV4T2Yoc3RhdHVzKSA9PT0gLTEpIHtcbiAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdJbnZhbGlkIHN0YXR1cyBjb2RlJylcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKG51bGwsIHtzdGF0dXM6IHN0YXR1cywgaGVhZGVyczoge2xvY2F0aW9uOiB1cmx9fSlcbiAgfVxuXG4gIHNlbGYuSGVhZGVycyA9IEhlYWRlcnNcbiAgc2VsZi5SZXF1ZXN0ID0gUmVxdWVzdFxuICBzZWxmLlJlc3BvbnNlID0gUmVzcG9uc2VcblxuICBzZWxmLmZldGNoID0gZnVuY3Rpb24oaW5wdXQsIGluaXQpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICB2YXIgcmVxdWVzdCA9IG5ldyBSZXF1ZXN0KGlucHV0LCBpbml0KVxuICAgICAgdmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpXG5cbiAgICAgIHhoci5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIG9wdGlvbnMgPSB7XG4gICAgICAgICAgc3RhdHVzOiB4aHIuc3RhdHVzLFxuICAgICAgICAgIHN0YXR1c1RleHQ6IHhoci5zdGF0dXNUZXh0LFxuICAgICAgICAgIGhlYWRlcnM6IHBhcnNlSGVhZGVycyh4aHIuZ2V0QWxsUmVzcG9uc2VIZWFkZXJzKCkgfHwgJycpXG4gICAgICAgIH1cbiAgICAgICAgb3B0aW9ucy51cmwgPSAncmVzcG9uc2VVUkwnIGluIHhociA/IHhoci5yZXNwb25zZVVSTCA6IG9wdGlvbnMuaGVhZGVycy5nZXQoJ1gtUmVxdWVzdC1VUkwnKVxuICAgICAgICB2YXIgYm9keSA9ICdyZXNwb25zZScgaW4geGhyID8geGhyLnJlc3BvbnNlIDogeGhyLnJlc3BvbnNlVGV4dFxuICAgICAgICByZXNvbHZlKG5ldyBSZXNwb25zZShib2R5LCBvcHRpb25zKSlcbiAgICAgIH1cblxuICAgICAgeGhyLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KG5ldyBUeXBlRXJyb3IoJ05ldHdvcmsgcmVxdWVzdCBmYWlsZWQnKSlcbiAgICAgIH1cblxuICAgICAgeGhyLm9udGltZW91dCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QobmV3IFR5cGVFcnJvcignTmV0d29yayByZXF1ZXN0IGZhaWxlZCcpKVxuICAgICAgfVxuXG4gICAgICB4aHIub3BlbihyZXF1ZXN0Lm1ldGhvZCwgcmVxdWVzdC51cmwsIHRydWUpXG5cbiAgICAgIGlmIChyZXF1ZXN0LmNyZWRlbnRpYWxzID09PSAnaW5jbHVkZScpIHtcbiAgICAgICAgeGhyLndpdGhDcmVkZW50aWFscyA9IHRydWVcbiAgICAgIH0gZWxzZSBpZiAocmVxdWVzdC5jcmVkZW50aWFscyA9PT0gJ29taXQnKSB7XG4gICAgICAgIHhoci53aXRoQ3JlZGVudGlhbHMgPSBmYWxzZVxuICAgICAgfVxuXG4gICAgICBpZiAoJ3Jlc3BvbnNlVHlwZScgaW4geGhyICYmIHN1cHBvcnQuYmxvYikge1xuICAgICAgICB4aHIucmVzcG9uc2VUeXBlID0gJ2Jsb2InXG4gICAgICB9XG5cbiAgICAgIHJlcXVlc3QuaGVhZGVycy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlLCBuYW1lKSB7XG4gICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKG5hbWUsIHZhbHVlKVxuICAgICAgfSlcblxuICAgICAgeGhyLnNlbmQodHlwZW9mIHJlcXVlc3QuX2JvZHlJbml0ID09PSAndW5kZWZpbmVkJyA/IG51bGwgOiByZXF1ZXN0Ll9ib2R5SW5pdClcbiAgICB9KVxuICB9XG4gIHNlbGYuZmV0Y2gucG9seWZpbGwgPSB0cnVlXG59KSh0eXBlb2Ygc2VsZiAhPT0gJ3VuZGVmaW5lZCcgPyBzZWxmIDogdGhpcyk7XG4iLCJjb25zdCBhcnRpY2xlVGVtcGxhdGUgPSBgXG5cdDxhcnRpY2xlIGNsYXNzPVwiYXJ0aWNsZV9fb3V0ZXJcIj5cblx0XHQ8ZGl2IGNsYXNzPVwiYXJ0aWNsZV9faW5uZXJcIj5cblx0XHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlX19oZWFkaW5nXCI+XG5cdFx0XHRcdDxhIGNsYXNzPVwianMtZW50cnktdGl0bGVcIj48L2E+XG5cdFx0XHRcdDxoMiBjbGFzcz1cImFydGljbGUtaGVhZGluZ19fdGl0bGVcIj48L2gyPlxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVwiYXJ0aWNsZS1oZWFkaW5nX19uYW1lXCI+XG5cdFx0XHRcdFx0PHNwYW4gY2xhc3M9XCJhcnRpY2xlLWhlYWRpbmdfX25hbWUtLWZpcnN0XCI+PC9zcGFuPlxuXHRcdFx0XHRcdDxhIGNsYXNzPVwianMtZW50cnktYXJ0aXN0XCI+PC9hPlxuXHRcdFx0XHRcdDxzcGFuIGNsYXNzPVwiYXJ0aWNsZS1oZWFkaW5nX19uYW1lLS1sYXN0XCI+PC9zcGFuPlxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdDwvZGl2Plx0XG5cdFx0XHQ8ZGl2IGNsYXNzPVwiYXJ0aWNsZV9faW1hZ2VzLW91dGVyXCI+XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlX19pbWFnZXMtaW5uZXJcIj48L2Rpdj5cblx0XHRcdFx0PHAgY2xhc3M9XCJqcy1hcnRpY2xlLWFuY2hvci10YXJnZXRcIj48L3A+XG5cdFx0PC9kaXY+XG5cdDwvYXJ0aWNsZT5cbmA7XG5cbmV4cG9ydCBkZWZhdWx0IGFydGljbGVUZW1wbGF0ZTsiLCJpbXBvcnQgJ3doYXR3Zy1mZXRjaCc7XG5pbXBvcnQgbmF2TGcgZnJvbSAnLi9uYXYtbGcnO1xuaW1wb3J0IGFydGljbGVUZW1wbGF0ZSBmcm9tICcuL2FydGljbGUtdGVtcGxhdGUnO1xuXG5jb25zdCBEQiA9ICdodHRwczovL25leHVzLWNhdGFsb2cuZmlyZWJhc2Vpby5jb20vcG9zdHMuanNvbj9hdXRoPTdnN3B5S0t5a04zTjVld3JJbWhPYVM2dndyRnNjNWZLa3JrOGVqemYnO1xuY29uc3QgYWxwaGFiZXQgPSBbJ2EnLCAnYicsICdjJywgJ2QnLCAnZScsICdmJywgJ2cnLCAnaCcsICdpJywgJ2onLCAnaycsICdsJywgJ20nLCAnbicsICdvJywgJ3AnLCAncicsICdzJywgJ3QnLCAndScsICd2JywgJ3cnLCAneScsICd6J107XG5cbmNvbnN0ICRsb2FkaW5nID0gQXJyYXkuZnJvbShkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcubG9hZGluZycpKTtcbmNvbnN0ICRuYXYgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnanMtbmF2Jyk7XG5jb25zdCAkcGFyYWxsYXggPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcucGFyYWxsYXgnKTtcbmNvbnN0ICRjb250ZW50ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmNvbnRlbnQnKTtcbmNvbnN0ICR0aXRsZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdqcy10aXRsZScpO1xuY29uc3QgJGFycm93ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmFycm93Jyk7XG5jb25zdCAkbW9kYWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcubW9kYWwnKTtcbmNvbnN0ICRsaWdodGJveCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5saWdodGJveCcpO1xuY29uc3QgJHZpZXcgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcubGlnaHRib3gtdmlldycpO1xuXG5sZXQgc29ydEtleSA9IDA7IC8vIDAgPSBhcnRpc3QsIDEgPSB0aXRsZVxubGV0IGVudHJpZXMgPSB7IGJ5QXV0aG9yOiBbXSwgYnlUaXRsZTogW10gfTtcbmxldCBjdXJyZW50TGV0dGVyID0gJ0EnO1xuXG5sZXQgbGlnaHRib3ggPSBmYWxzZTtcbmxldCB4MiA9IGZhbHNlO1xuY29uc3QgYXR0YWNoSW1hZ2VMaXN0ZW5lcnMgPSAoKSA9PiB7XG5cdGxldCAkaW1hZ2VzID0gQXJyYXkuZnJvbShkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuYXJ0aWNsZS1pbWFnZScpKTtcblxuXHQkaW1hZ2VzLmZvckVhY2goaW1nID0+IHtcblx0XHRpbWcuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZXZ0KSA9PiB7XG5cdFx0XHRpZiAoIWxpZ2h0Ym94KSB7XG5cdFx0XHRcdGxldCBzcmMgPSBpbWcuc3JjO1xuXHRcdFx0XHQvLyBsZXQgdHlwZSA9IGltZy53aWR0aCA+PSBpbWcuaGVpZ2h0ID8gJ2wnIDogJ3AnO1xuXHRcdFx0XHRcblx0XHRcdFx0JGxpZ2h0Ym94LmNsYXNzTGlzdC5hZGQoJ3Nob3ctaW1nJyk7XG5cdFx0XHRcdCR2aWV3LnNldEF0dHJpYnV0ZSgnc3R5bGUnLCBgYmFja2dyb3VuZC1pbWFnZTogdXJsKCR7c3JjfSlgKTtcblx0XHRcdFx0bGlnaHRib3ggPSB0cnVlO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9KTtcblxuXHQkdmlldy5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHRpZiAobGlnaHRib3gpIHtcblx0XHRcdCRsaWdodGJveC5jbGFzc0xpc3QucmVtb3ZlKCdzaG93LWltZycpO1xuXHRcdFx0JGxpZ2h0Ym94LmZpcnN0RWxlbWVudENoaWxkLmNsYXNzTGlzdC5yZW1vdmUoJ3ZpZXcteDInKTtcblx0XHRcdGxpZ2h0Ym94ID0gZmFsc2U7XG5cdFx0fVxuXHR9KTtcbn07XG5cbmxldCBtb2RhbCA9IGZhbHNlO1xuY29uc3QgYXR0YWNoTW9kYWxMaXN0ZW5lcnMgPSAoKSA9PiB7XG5cdGNvbnN0ICRmaW5kID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2pzLWZpbmQnKTtcblx0XG5cdCRmaW5kLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuXHRcdCRtb2RhbC5jbGFzc0xpc3QuYWRkKCdzaG93Jyk7XG5cdFx0bW9kYWwgPSB0cnVlO1xuXHR9KTtcblxuXHQkbW9kYWwuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0c2V0VGltZW91dCgoKSA9PiB7XG5cdFx0XHQkbW9kYWwuY2xhc3NMaXN0LnJlbW92ZSgnc2hvdycpO1xuXHRcdFx0bW9kYWwgPSBmYWxzZTtcblx0XHR9LCA1MDApO1xuXHR9KTtcblxuXHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsICgpID0+IHtcblx0XHRpZiAobW9kYWwpIHtcblx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge1xuXHRcdFx0XHQkbW9kYWwuY2xhc3NMaXN0LnJlbW92ZSgnc2hvdycpO1xuXHRcdFx0XHRtb2RhbCA9IGZhbHNlO1xuXHRcdFx0fSwgNjAwKTtcblx0XHR9O1xuXHR9KTtcbn1cblxuY29uc3Qgc2Nyb2xsVG9Ub3AgPSAoKSA9PiB7XG5cdGxldCB0aGluZyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhbmNob3ItdGFyZ2V0Jyk7XG5cdHRoaW5nLnNjcm9sbEludG9WaWV3KHtiZWhhdmlvcjogXCJzbW9vdGhcIiwgYmxvY2s6IFwic3RhcnRcIn0pO1xufVxuXG5sZXQgcHJldjtcbmxldCBjdXJyZW50ID0gMDtcbmxldCBpc1Nob3dpbmcgPSBmYWxzZTtcbmNvbnN0IGF0dGFjaEFycm93TGlzdGVuZXJzID0gKCkgPT4ge1xuXHQkYXJyb3cuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0c2Nyb2xsVG9Ub3AoKTtcblx0fSk7XG5cblx0JHBhcmFsbGF4LmFkZEV2ZW50TGlzdGVuZXIoJ3Njcm9sbCcsICgpID0+IHtcblxuXHRcdGxldCB5ID0gJHRpdGxlLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLnk7XG5cdFx0aWYgKGN1cnJlbnQgIT09IHkpIHtcblx0XHRcdHByZXYgPSBjdXJyZW50O1xuXHRcdFx0Y3VycmVudCA9IHk7XG5cdFx0fVxuXG5cdFx0aWYgKHkgPD0gLTUwICYmICFpc1Nob3dpbmcpIHtcblx0XHRcdCRhcnJvdy5jbGFzc0xpc3QuYWRkKCdzaG93Jyk7XG5cdFx0XHRpc1Nob3dpbmcgPSB0cnVlO1xuXHRcdH0gZWxzZSBpZiAoeSA+IC01MCAmJiBpc1Nob3dpbmcpIHtcblx0XHRcdCRhcnJvdy5jbGFzc0xpc3QucmVtb3ZlKCdzaG93Jyk7XG5cdFx0XHRpc1Nob3dpbmcgPSBmYWxzZTtcblx0XHR9XG5cdH0pO1xufTtcblxuY29uc3QgYWRkU29ydEJ1dHRvbkxpc3RlbmVycyA9ICgpID0+IHtcblx0bGV0ICRieUFydGlzdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdqcy1ieS1hcnRpc3QnKTtcblx0bGV0ICRieVRpdGxlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2pzLWJ5LXRpdGxlJyk7XG5cdCRieUFydGlzdC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHRpZiAoc29ydEtleSkge1xuXHRcdFx0c2Nyb2xsVG9Ub3AoKTtcblx0XHRcdHNvcnRLZXkgPSAwO1xuXHRcdFx0JGJ5QXJ0aXN0LmNsYXNzTGlzdC5hZGQoJ2FjdGl2ZScpO1xuXHRcdFx0JGJ5VGl0bGUuY2xhc3NMaXN0LnJlbW92ZSgnYWN0aXZlJyk7XG5cblx0XHRcdHJlbmRlckVudHJpZXMoKTtcblx0XHR9XG5cdH0pO1xuXG5cdCRieVRpdGxlLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuXHRcdGlmICghc29ydEtleSkge1xuXHRcdFx0c2Nyb2xsVG9Ub3AoKTtcblx0XHRcdHNvcnRLZXkgPSAxO1xuXHRcdFx0JGJ5VGl0bGUuY2xhc3NMaXN0LmFkZCgnYWN0aXZlJyk7XG5cdFx0XHQkYnlBcnRpc3QuY2xhc3NMaXN0LnJlbW92ZSgnYWN0aXZlJyk7XG5cblx0XHRcdHJlbmRlckVudHJpZXMoKTtcblx0XHR9XG5cdH0pO1xufTtcblxuY29uc3QgY2xlYXJBbmNob3JzID0gKHByZXZTZWxlY3RvcikgPT4ge1xuXHRsZXQgJGVudHJpZXMgPSBBcnJheS5mcm9tKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwocHJldlNlbGVjdG9yKSk7XG5cdCRlbnRyaWVzLmZvckVhY2goZW50cnkgPT4gZW50cnkucmVtb3ZlQXR0cmlidXRlKCduYW1lJykpO1xufTtcblxuY29uc3QgZmluZEZpcnN0RW50cnkgPSAoY2hhcikgPT4ge1xuXHRsZXQgc2VsZWN0b3IgPSBzb3J0S2V5ID8gJy5qcy1lbnRyeS10aXRsZScgOiAnLmpzLWVudHJ5LWFydGlzdCc7XG5cdGxldCBwcmV2U2VsZWN0b3IgPSAhc29ydEtleSA/ICcuanMtZW50cnktdGl0bGUnIDogJy5qcy1lbnRyeS1hcnRpc3QnO1xuXHRsZXQgJGVudHJpZXMgPSBBcnJheS5mcm9tKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpKTtcblxuXHRjbGVhckFuY2hvcnMocHJldlNlbGVjdG9yKTtcblxuXHRyZXR1cm4gJGVudHJpZXMuZmluZChlbnRyeSA9PiB7XG5cdFx0bGV0IG5vZGUgPSBlbnRyeS5uZXh0RWxlbWVudFNpYmxpbmc7XG5cdFx0cmV0dXJuIG5vZGUuaW5uZXJIVE1MWzBdID09PSBjaGFyIHx8IG5vZGUuaW5uZXJIVE1MWzBdID09PSBjaGFyLnRvVXBwZXJDYXNlKCk7XG5cdH0pO1xufTtcblxuXG5jb25zdCBtYWtlQWxwaGFiZXQgPSAoKSA9PiB7XG5cdGNvbnN0IGF0dGFjaEFuY2hvckxpc3RlbmVyID0gKCRhbmNob3IsIGxldHRlcikgPT4ge1xuXHRcdCRhbmNob3IuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0XHRjb25zdCBsZXR0ZXJOb2RlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQobGV0dGVyKTtcblx0XHRcdGxldCB0YXJnZXQ7XG5cblx0XHRcdGlmICghc29ydEtleSkge1xuXHRcdFx0XHR0YXJnZXQgPSBsZXR0ZXIgPT09ICdhJyA/IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhbmNob3ItdGFyZ2V0JykgOiBsZXR0ZXJOb2RlLnBhcmVudEVsZW1lbnQucGFyZW50RWxlbWVudC5wYXJlbnRFbGVtZW50LnBhcmVudEVsZW1lbnQucHJldmlvdXNFbGVtZW50U2libGluZy5xdWVyeVNlbGVjdG9yKCcuanMtYXJ0aWNsZS1hbmNob3ItdGFyZ2V0Jyk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0YXJnZXQgPSBsZXR0ZXIgPT09ICdhJyA/IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhbmNob3ItdGFyZ2V0JykgOiBsZXR0ZXJOb2RlLnBhcmVudEVsZW1lbnQucGFyZW50RWxlbWVudC5wYXJlbnRFbGVtZW50LnByZXZpb3VzRWxlbWVudFNpYmxpbmcucXVlcnlTZWxlY3RvcignLmpzLWFydGljbGUtYW5jaG9yLXRhcmdldCcpO1xuXHRcdFx0fTtcblxuXHRcdFx0dGFyZ2V0LnNjcm9sbEludG9WaWV3KHtiZWhhdmlvcjogXCJzbW9vdGhcIiwgYmxvY2s6IFwic3RhcnRcIn0pO1xuXHRcdH0pO1xuXHR9O1xuXG5cdGxldCBhY3RpdmVFbnRyaWVzID0ge307XG5cdGxldCAkb3V0ZXIgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuYWxwaGFiZXRfX2xldHRlcnMnKTtcblx0JG91dGVyLmlubmVySFRNTCA9ICcnO1xuXG5cdGFscGhhYmV0LmZvckVhY2gobGV0dGVyID0+IHtcblx0XHRsZXQgJGZpcnN0RW50cnkgPSBmaW5kRmlyc3RFbnRyeShsZXR0ZXIpO1xuXHRcdGxldCAkYW5jaG9yID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuXG5cdFx0aWYgKCEkZmlyc3RFbnRyeSkgcmV0dXJuO1xuXG5cdFx0JGZpcnN0RW50cnkuaWQgPSBsZXR0ZXI7XG5cdFx0JGFuY2hvci5pbm5lckhUTUwgPSBsZXR0ZXIudG9VcHBlckNhc2UoKTtcblx0XHQkYW5jaG9yLmNsYXNzTmFtZSA9ICdhbHBoYWJldF9fbGV0dGVyLWFuY2hvcic7XG5cblx0XHRhdHRhY2hBbmNob3JMaXN0ZW5lcigkYW5jaG9yLCBsZXR0ZXIpO1xuXHRcdCRvdXRlci5hcHBlbmRDaGlsZCgkYW5jaG9yKTtcblx0fSk7XG59O1xuXG5jb25zdCByZW5kZXJJbWFnZXMgPSAoaW1hZ2VzLCAkaW1hZ2VzKSA9PiB7XG5cdGltYWdlcy5mb3JFYWNoKGltYWdlID0+IHtcblx0XHRjb25zdCBzcmMgPSBgLi4vLi4vYXNzZXRzL2ltYWdlcy8ke2ltYWdlfWA7XG5cdFx0bGV0ICRpbWcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdJTUcnKTtcblx0XHQkaW1nLmNsYXNzTmFtZSA9ICdhcnRpY2xlLWltYWdlJztcblx0XHQkaW1nLnNyYyA9IHNyYztcblx0XHQkaW1hZ2VzLmFwcGVuZENoaWxkKCRpbWcpO1xuXHR9KVxufTtcblxuY29uc3QgcmVuZGVyRW50cmllcyA9ICgpID0+IHtcblx0bGV0ICRhcnRpY2xlTGlzdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdqcy1saXN0Jyk7XG5cdGxldCBlbnRyaWVzTGlzdCA9IHNvcnRLZXkgPyBlbnRyaWVzLmJ5VGl0bGUgOiBlbnRyaWVzLmJ5QXV0aG9yO1xuXG5cdCRhcnRpY2xlTGlzdC5pbm5lckhUTUwgPSAnJztcblxuXHRlbnRyaWVzTGlzdC5mb3JFYWNoKGVudHJ5ID0+IHtcblx0XHRsZXQgeyB0aXRsZSwgbGFzdE5hbWUsIGZpcnN0TmFtZSwgaW1hZ2VzLCBkZXNjcmlwdGlvbiwgZGV0YWlsIH0gPSBlbnRyeTtcblxuXHRcdCRhcnRpY2xlTGlzdC5pbnNlcnRBZGphY2VudEhUTUwoJ2JlZm9yZWVuZCcsIGFydGljbGVUZW1wbGF0ZSk7XG5cblx0XHRsZXQgJGltYWdlc05vZGVzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLmFydGljbGVfX2ltYWdlcy1pbm5lcicpO1xuXHRcdGxldCAkaW1hZ2VzID0gJGltYWdlc05vZGVzWyRpbWFnZXNOb2Rlcy5sZW5ndGggLSAxXTtcblxuXHRcdGlmIChpbWFnZXMubGVuZ3RoKSByZW5kZXJJbWFnZXMoaW1hZ2VzLCAkaW1hZ2VzKTtcblx0XHRcblx0XHRsZXQgJGRlc2NyaXB0aW9uT3V0ZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblx0XHRsZXQgJGRlc2NyaXB0aW9uTm9kZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKTtcblx0XHRsZXQgJGRldGFpbE5vZGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdwJyk7XG5cdFx0JGRlc2NyaXB0aW9uT3V0ZXIuY2xhc3NMaXN0LmFkZCgnYXJ0aWNsZS1kZXNjcmlwdGlvbl9fb3V0ZXInKTtcblx0XHQkZGVzY3JpcHRpb25Ob2RlLmNsYXNzTGlzdC5hZGQoJ2FydGljbGUtZGVzY3JpcHRpb24nKTtcblx0XHQkZGV0YWlsTm9kZS5jbGFzc0xpc3QuYWRkKCdhcnRpY2xlLWRldGFpbCcpO1xuXG5cdFx0JGRlc2NyaXB0aW9uTm9kZS5pbm5lckhUTUwgPSBkZXNjcmlwdGlvbjtcblx0XHQkZGV0YWlsTm9kZS5pbm5lckhUTUwgPSBkZXRhaWw7XG5cblx0XHQkZGVzY3JpcHRpb25PdXRlci5hcHBlbmRDaGlsZCgkZGVzY3JpcHRpb25Ob2RlLCAkZGV0YWlsTm9kZSk7XG5cdFx0JGltYWdlcy5hcHBlbmRDaGlsZCgkZGVzY3JpcHRpb25PdXRlcik7XG5cblx0XHRsZXQgJHRpdGxlTm9kZXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuYXJ0aWNsZS1oZWFkaW5nX190aXRsZScpO1xuXHRcdGxldCAkdGl0bGUgPSAkdGl0bGVOb2Rlc1skdGl0bGVOb2Rlcy5sZW5ndGggLSAxXTtcblxuXHRcdGxldCAkZmlyc3ROb2RlcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5hcnRpY2xlLWhlYWRpbmdfX25hbWUtLWZpcnN0Jyk7XG5cdFx0bGV0ICRmaXJzdCA9ICRmaXJzdE5vZGVzWyRmaXJzdE5vZGVzLmxlbmd0aCAtIDFdO1xuXG5cdFx0bGV0ICRsYXN0Tm9kZXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuYXJ0aWNsZS1oZWFkaW5nX19uYW1lLS1sYXN0Jyk7XG5cdFx0bGV0ICRsYXN0ID0gJGxhc3ROb2Rlc1skbGFzdE5vZGVzLmxlbmd0aCAtIDFdO1xuXG5cdFx0JHRpdGxlLmlubmVySFRNTCA9IHRpdGxlO1xuXHRcdCRmaXJzdC5pbm5lckhUTUwgPSBmaXJzdE5hbWU7XG5cdFx0JGxhc3QuaW5uZXJIVE1MID0gbGFzdE5hbWU7XG5cblx0fSk7XG5cblx0YXR0YWNoSW1hZ2VMaXN0ZW5lcnMoKTtcblx0bWFrZUFscGhhYmV0KCk7XG59O1xuXG4vLyB0aGlzIG5lZWRzIHRvIGJlIGEgZGVlcGVyIHNvcnRcbmNvbnN0IHNvcnRCeVRpdGxlID0gKCkgPT4ge1xuXHRlbnRyaWVzLmJ5VGl0bGUuc29ydCgoYSwgYikgPT4ge1xuXHRcdGxldCBhVGl0bGUgPSBhLnRpdGxlWzBdLnRvVXBwZXJDYXNlKCk7XG5cdFx0bGV0IGJUaXRsZSA9IGIudGl0bGVbMF0udG9VcHBlckNhc2UoKTtcblx0XHRpZiAoYVRpdGxlID4gYlRpdGxlKSByZXR1cm4gMTtcblx0XHRlbHNlIGlmIChhVGl0bGUgPCBiVGl0bGUpIHJldHVybiAtMTtcblx0XHRlbHNlIHJldHVybiAwO1xuXHR9KTtcbn07XG5cbmNvbnN0IHNldERhdGEgPSAoZGF0YSkgPT4ge1xuXHRlbnRyaWVzLmJ5QXV0aG9yID0gZGF0YTtcblx0ZW50cmllcy5ieVRpdGxlID0gZGF0YS5zbGljZSgpO1xuXHRzb3J0QnlUaXRsZSgpO1xuXHRyZW5kZXJFbnRyaWVzKCk7XG59XG5cbmNvbnN0IGZldGNoRGF0YSA9ICgpID0+IHtcblx0XHRmZXRjaChEQikudGhlbihyZXMgPT5cblx0XHRcdHJlcy5qc29uKClcblx0XHQpLnRoZW4oZGF0YSA9PiB7XG5cdFx0XHRzZXREYXRhKGRhdGEpO1xuXHRcdH0pXG5cdFx0LnRoZW4oKCkgPT4ge1xuXHRcdFx0JGxvYWRpbmcuZm9yRWFjaChlbGVtID0+IGVsZW0uY2xhc3NMaXN0LmFkZCgncmVhZHknKSk7XG5cdFx0XHQkbmF2LmNsYXNzTGlzdC5hZGQoJ3JlYWR5Jyk7XG5cdFx0fSlcblx0XHQuY2F0Y2goZXJyID0+IGNvbnNvbGUud2FybihlcnIpKTtcbn07XG5cbmNvbnN0IGluaXQgPSAoKSA9PiB7XG5cdGZldGNoRGF0YSgpO1xuXHRuYXZMZygpO1xuXHRyZW5kZXJFbnRyaWVzKCk7XG5cdGFkZFNvcnRCdXR0b25MaXN0ZW5lcnMoKTtcblx0YXR0YWNoQXJyb3dMaXN0ZW5lcnMoKTtcblx0YXR0YWNoTW9kYWxMaXN0ZW5lcnMoKTtcbn1cblxuaW5pdCgpO1xuIiwiY29uc3QgdGVtcGxhdGUgPSBcblx0YDxkaXYgY2xhc3M9XCJuYXZfX2lubmVyXCI+XG5cdFx0PGRpdiBjbGFzcz1cIm5hdl9fc29ydC1ieVwiPlxuXHRcdFx0PHNwYW4gY2xhc3M9XCJzb3J0LWJ5X190aXRsZVwiPlNvcnQgYnk8L3NwYW4+XG5cdFx0XHQ8YnV0dG9uIGNsYXNzPVwic29ydC1ieV9fYnktYXJ0aXN0IGFjdGl2ZVwiIGlkPVwianMtYnktYXJ0aXN0XCI+QXJ0aXN0PC9idXR0b24+XG5cdFx0XHQ8c3BhbiBjbGFzcz1cInNvcnQtYnlfX2RpdmlkZXJcIj4gfCA8L3NwYW4+XG5cdFx0XHQ8YnV0dG9uIGNsYXNzPVwic29ydC1ieV9fYnktdGl0bGVcIiBpZD1cImpzLWJ5LXRpdGxlXCI+VGl0bGU8L2J1dHRvbj5cblx0XHRcdDxzcGFuIGNsYXNzPVwic29ydC1ieV9fZGl2aWRlciBmaW5kXCI+IHwgPC9zcGFuPlxuXHRcdFx0PHNwYW4gY2xhc3M9XCJmaW5kXCIgaWQ9XCJqcy1maW5kXCI+JiM4OTg0O0Y8L3NwYW4+XG5cdFx0PC9kaXY+XG5cdFx0PGRpdiBjbGFzcz1cIm5hdl9fYWxwaGFiZXRcIj5cblx0XHRcdDxzcGFuIGNsYXNzPVwiYWxwaGFiZXRfX3RpdGxlXCI+R28gdG88L3NwYW4+XG5cdFx0XHQ8ZGl2IGNsYXNzPVwiYWxwaGFiZXRfX2xldHRlcnNcIj48L2Rpdj5cblx0XHQ8L2Rpdj5cblx0PC9kaXY+YDtcblxuY29uc3QgbmF2TGcgPSAoKSA9PiB7XG5cdGxldCBuYXZPdXRlciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdqcy1uYXYnKTtcblx0bmF2T3V0ZXIuaW5uZXJIVE1MID0gdGVtcGxhdGU7XG59O1xuXG5leHBvcnQgZGVmYXVsdCBuYXZMZzsiXSwicHJlRXhpc3RpbmdDb21tZW50IjoiLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9dXRmLTg7YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0p6YjNWeVkyVnpJanBiSW01dlpHVmZiVzlrZFd4bGN5OWljbTkzYzJWeUxYQmhZMnN2WDNCeVpXeDFaR1V1YW5NaUxDSnViMlJsWDIxdlpIVnNaWE12ZDJoaGRIZG5MV1psZEdOb0wyWmxkR05vTG1weklpd2ljM0pqTDJwekwyRnlkR2xqYkdVdGRHVnRjR3hoZEdVdWFuTWlMQ0p6Y21NdmFuTXZhVzVrWlhndWFuTWlMQ0p6Y21NdmFuTXZibUYyTFd4bkxtcHpJbDBzSW01aGJXVnpJanBiWFN3aWJXRndjR2x1WjNNaU9pSkJRVUZCTzBGRFFVRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUczdPenM3T3p0QlEyeGtRU3hKUVVGTkxHbHdRa0ZCVGpzN2EwSkJiVUpsTEdVN096czdPMEZEYmtKbU96dEJRVU5CT3pzN08wRkJRMEU3T3pzN096dEJRVVZCTEVsQlFVMHNTMEZCU3l3clJrRkJXRHRCUVVOQkxFbEJRVTBzVjBGQlZ5eERRVUZETEVkQlFVUXNSVUZCVFN4SFFVRk9MRVZCUVZjc1IwRkJXQ3hGUVVGblFpeEhRVUZvUWl4RlFVRnhRaXhIUVVGeVFpeEZRVUV3UWl4SFFVRXhRaXhGUVVFclFpeEhRVUV2UWl4RlFVRnZReXhIUVVGd1F5eEZRVUY1UXl4SFFVRjZReXhGUVVFNFF5eEhRVUU1UXl4RlFVRnRSQ3hIUVVGdVJDeEZRVUYzUkN4SFFVRjRSQ3hGUVVFMlJDeEhRVUUzUkN4RlFVRnJSU3hIUVVGc1JTeEZRVUYxUlN4SFFVRjJSU3hGUVVFMFJTeEhRVUUxUlN4RlFVRnBSaXhIUVVGcVJpeEZRVUZ6Uml4SFFVRjBSaXhGUVVFeVJpeEhRVUV6Uml4RlFVRm5SeXhIUVVGb1J5eEZRVUZ4Unl4SFFVRnlSeXhGUVVFd1J5eEhRVUV4Unl4RlFVRXJSeXhIUVVFdlJ5eEZRVUZ2U0N4SFFVRndTQ3hEUVVGcVFqczdRVUZGUVN4SlFVRk5MRmRCUVZjc1RVRkJUU3hKUVVGT0xFTkJRVmNzVTBGQlV5eG5Ra0ZCVkN4RFFVRXdRaXhWUVVFeFFpeERRVUZZTEVOQlFXcENPMEZCUTBFc1NVRkJUU3hQUVVGUExGTkJRVk1zWTBGQlZDeERRVUYzUWl4UlFVRjRRaXhEUVVGaU8wRkJRMEVzU1VGQlRTeFpRVUZaTEZOQlFWTXNZVUZCVkN4RFFVRjFRaXhYUVVGMlFpeERRVUZzUWp0QlFVTkJMRWxCUVUwc1YwRkJWeXhUUVVGVExHRkJRVlFzUTBGQmRVSXNWVUZCZGtJc1EwRkJha0k3UVVGRFFTeEpRVUZOTEZOQlFWTXNVMEZCVXl4alFVRlVMRU5CUVhkQ0xGVkJRWGhDTEVOQlFXWTdRVUZEUVN4SlFVRk5MRk5CUVZNc1UwRkJVeXhoUVVGVUxFTkJRWFZDTEZGQlFYWkNMRU5CUVdZN1FVRkRRU3hKUVVGTkxGTkJRVk1zVTBGQlV5eGhRVUZVTEVOQlFYVkNMRkZCUVhaQ0xFTkJRV1k3UVVGRFFTeEpRVUZOTEZsQlFWa3NVMEZCVXl4aFFVRlVMRU5CUVhWQ0xGZEJRWFpDTEVOQlFXeENPMEZCUTBFc1NVRkJUU3hSUVVGUkxGTkJRVk1zWVVGQlZDeERRVUYxUWl4blFrRkJka0lzUTBGQlpEczdRVUZGUVN4SlFVRkpMRlZCUVZVc1EwRkJaQ3hETEVOQlFXbENPMEZCUTJwQ0xFbEJRVWtzVlVGQlZTeEZRVUZGTEZWQlFWVXNSVUZCV2l4RlFVRm5RaXhUUVVGVExFVkJRWHBDTEVWQlFXUTdRVUZEUVN4SlFVRkpMR2RDUVVGblFpeEhRVUZ3UWpzN1FVRkZRU3hKUVVGSkxGZEJRVmNzUzBGQlpqdEJRVU5CTEVsQlFVa3NTMEZCU3l4TFFVRlVPMEZCUTBFc1NVRkJUU3gxUWtGQmRVSXNVMEZCZGtJc2IwSkJRWFZDTEVkQlFVMDdRVUZEYkVNc1MwRkJTU3hWUVVGVkxFMUJRVTBzU1VGQlRpeERRVUZYTEZOQlFWTXNaMEpCUVZRc1EwRkJNRUlzWjBKQlFURkNMRU5CUVZnc1EwRkJaRHM3UVVGRlFTeFRRVUZSTEU5QlFWSXNRMEZCWjBJc1pVRkJUenRCUVVOMFFpeE5RVUZKTEdkQ1FVRktMRU5CUVhGQ0xFOUJRWEpDTEVWQlFUaENMRlZCUVVNc1IwRkJSQ3hGUVVGVE8wRkJRM1JETEU5QlFVa3NRMEZCUXl4UlFVRk1MRVZCUVdVN1FVRkRaQ3hSUVVGSkxFMUJRVTBzU1VGQlNTeEhRVUZrTzBGQlEwRTdPMEZCUlVFc1kwRkJWU3hUUVVGV0xFTkJRVzlDTEVkQlFYQkNMRU5CUVhkQ0xGVkJRWGhDTzBGQlEwRXNWVUZCVFN4WlFVRk9MRU5CUVcxQ0xFOUJRVzVDTERaQ1FVRnhSQ3hIUVVGeVJEdEJRVU5CTEdWQlFWY3NTVUZCV0R0QlFVTkJPMEZCUTBRc1IwRlVSRHRCUVZWQkxFVkJXRVE3TzBGQllVRXNUMEZCVFN4blFrRkJUaXhEUVVGMVFpeFBRVUYyUWl4RlFVRm5ReXhaUVVGTk8wRkJRM0pETEUxQlFVa3NVVUZCU2l4RlFVRmpPMEZCUTJJc1lVRkJWU3hUUVVGV0xFTkJRVzlDTEUxQlFYQkNMRU5CUVRKQ0xGVkJRVE5DTzBGQlEwRXNZVUZCVlN4cFFrRkJWaXhEUVVFMFFpeFRRVUUxUWl4RFFVRnpReXhOUVVGMFF5eERRVUUyUXl4VFFVRTNRenRCUVVOQkxHTkJRVmNzUzBGQldEdEJRVU5CTzBGQlEwUXNSVUZPUkR0QlFVOUJMRU5CZGtKRU96dEJRWGxDUVN4SlFVRkpMRkZCUVZFc1MwRkJXanRCUVVOQkxFbEJRVTBzZFVKQlFYVkNMRk5CUVhaQ0xHOUNRVUYxUWl4SFFVRk5PMEZCUTJ4RExFdEJRVTBzVVVGQlVTeFRRVUZUTEdOQlFWUXNRMEZCZDBJc1UwRkJlRUlzUTBGQlpEczdRVUZGUVN4UFFVRk5MR2RDUVVGT0xFTkJRWFZDTEU5QlFYWkNMRVZCUVdkRExGbEJRVTA3UVVGRGNrTXNVMEZCVHl4VFFVRlFMRU5CUVdsQ0xFZEJRV3BDTEVOQlFYRkNMRTFCUVhKQ08wRkJRMEVzVlVGQlVTeEpRVUZTTzBGQlEwRXNSVUZJUkRzN1FVRkxRU3hSUVVGUExHZENRVUZRTEVOQlFYZENMRTlCUVhoQ0xFVkJRV2xETEZsQlFVMDdRVUZEZEVNc1lVRkJWeXhaUVVGTk8wRkJRMmhDTEZWQlFVOHNVMEZCVUN4RFFVRnBRaXhOUVVGcVFpeERRVUYzUWl4TlFVRjRRanRCUVVOQkxGZEJRVkVzUzBGQlVqdEJRVU5CTEVkQlNFUXNSVUZIUnl4SFFVaElPMEZCU1VFc1JVRk1SRHM3UVVGUFFTeFJRVUZQTEdkQ1FVRlFMRU5CUVhkQ0xGTkJRWGhDTEVWQlFXMURMRmxCUVUwN1FVRkRlRU1zVFVGQlNTeExRVUZLTEVWQlFWYzdRVUZEVml4alFVRlhMRmxCUVUwN1FVRkRhRUlzVjBGQlR5eFRRVUZRTEVOQlFXbENMRTFCUVdwQ0xFTkJRWGRDTEUxQlFYaENPMEZCUTBFc1dVRkJVU3hMUVVGU08wRkJRMEVzU1VGSVJDeEZRVWRITEVkQlNFZzdRVUZKUVR0QlFVTkVMRVZCVUVRN1FVRlJRU3hEUVhaQ1JEczdRVUY1UWtFc1NVRkJUU3hqUVVGakxGTkJRV1FzVjBGQll5eEhRVUZOTzBGQlEzcENMRXRCUVVrc1VVRkJVU3hUUVVGVExHTkJRVlFzUTBGQmQwSXNaVUZCZUVJc1EwRkJXanRCUVVOQkxFOUJRVTBzWTBGQlRpeERRVUZ4UWl4RlFVRkRMRlZCUVZVc1VVRkJXQ3hGUVVGeFFpeFBRVUZQTEU5QlFUVkNMRVZCUVhKQ08wRkJRMEVzUTBGSVJEczdRVUZMUVN4SlFVRkpMR0ZCUVVvN1FVRkRRU3hKUVVGSkxGVkJRVlVzUTBGQlpEdEJRVU5CTEVsQlFVa3NXVUZCV1N4TFFVRm9RanRCUVVOQkxFbEJRVTBzZFVKQlFYVkNMRk5CUVhaQ0xHOUNRVUYxUWl4SFFVRk5PMEZCUTJ4RExGRkJRVThzWjBKQlFWQXNRMEZCZDBJc1QwRkJlRUlzUlVGQmFVTXNXVUZCVFR0QlFVTjBRenRCUVVOQkxFVkJSa1E3TzBGQlNVRXNWMEZCVlN4blFrRkJWaXhEUVVFeVFpeFJRVUV6UWl4RlFVRnhReXhaUVVGTk96dEJRVVV4UXl4TlFVRkpMRWxCUVVrc1QwRkJUeXh4UWtGQlVDeEhRVUVyUWl4RFFVRjJRenRCUVVOQkxFMUJRVWtzV1VGQldTeERRVUZvUWl4RlFVRnRRanRCUVVOc1FpeFZRVUZQTEU5QlFWQTdRVUZEUVN4aFFVRlZMRU5CUVZZN1FVRkRRVHM3UVVGRlJDeE5RVUZKTEV0QlFVc3NRMEZCUXl4RlFVRk9MRWxCUVZrc1EwRkJReXhUUVVGcVFpeEZRVUUwUWp0QlFVTXpRaXhWUVVGUExGTkJRVkFzUTBGQmFVSXNSMEZCYWtJc1EwRkJjVUlzVFVGQmNrSTdRVUZEUVN4bFFVRlpMRWxCUVZvN1FVRkRRU3hIUVVoRUxFMUJSMDhzU1VGQlNTeEpRVUZKTEVOQlFVTXNSVUZCVEN4SlFVRlhMRk5CUVdZc1JVRkJNRUk3UVVGRGFFTXNWVUZCVHl4VFFVRlFMRU5CUVdsQ0xFMUJRV3BDTEVOQlFYZENMRTFCUVhoQ08wRkJRMEVzWlVGQldTeExRVUZhTzBGQlEwRTdRVUZEUkN4RlFXWkVPMEZCWjBKQkxFTkJja0pFT3p0QlFYVkNRU3hKUVVGTkxIbENRVUY1UWl4VFFVRjZRaXh6UWtGQmVVSXNSMEZCVFR0QlFVTndReXhMUVVGSkxGbEJRVmtzVTBGQlV5eGpRVUZVTEVOQlFYZENMR05CUVhoQ0xFTkJRV2hDTzBGQlEwRXNTMEZCU1N4WFFVRlhMRk5CUVZNc1kwRkJWQ3hEUVVGM1FpeGhRVUY0UWl4RFFVRm1PMEZCUTBFc1YwRkJWU3huUWtGQlZpeERRVUV5UWl4UFFVRXpRaXhGUVVGdlF5eFpRVUZOTzBGQlEzcERMRTFCUVVrc1QwRkJTaXhGUVVGaE8wRkJRMW83UVVGRFFTeGhRVUZWTEVOQlFWWTdRVUZEUVN4aFFVRlZMRk5CUVZZc1EwRkJiMElzUjBGQmNFSXNRMEZCZDBJc1VVRkJlRUk3UVVGRFFTeFpRVUZUTEZOQlFWUXNRMEZCYlVJc1RVRkJia0lzUTBGQk1FSXNVVUZCTVVJN08wRkJSVUU3UVVGRFFUdEJRVU5FTEVWQlZFUTdPMEZCVjBFc1ZVRkJVeXhuUWtGQlZDeERRVUV3UWl4UFFVRXhRaXhGUVVGdFF5eFpRVUZOTzBGQlEzaERMRTFCUVVrc1EwRkJReXhQUVVGTUxFVkJRV003UVVGRFlqdEJRVU5CTEdGQlFWVXNRMEZCVmp0QlFVTkJMRmxCUVZNc1UwRkJWQ3hEUVVGdFFpeEhRVUZ1UWl4RFFVRjFRaXhSUVVGMlFqdEJRVU5CTEdGQlFWVXNVMEZCVml4RFFVRnZRaXhOUVVGd1FpeERRVUV5UWl4UlFVRXpRanM3UVVGRlFUdEJRVU5CTzBGQlEwUXNSVUZVUkR0QlFWVkJMRU5CZUVKRU96dEJRVEJDUVN4SlFVRk5MR1ZCUVdVc1UwRkJaaXhaUVVGbExFTkJRVU1zV1VGQlJDeEZRVUZyUWp0QlFVTjBReXhMUVVGSkxGZEJRVmNzVFVGQlRTeEpRVUZPTEVOQlFWY3NVMEZCVXl4blFrRkJWQ3hEUVVFd1FpeFpRVUV4UWl4RFFVRllMRU5CUVdZN1FVRkRRU3hWUVVGVExFOUJRVlFzUTBGQmFVSTdRVUZCUVN4VFFVRlRMRTFCUVUwc1pVRkJUaXhEUVVGelFpeE5RVUYwUWl4RFFVRlVPMEZCUVVFc1JVRkJha0k3UVVGRFFTeERRVWhFT3p0QlFVdEJMRWxCUVUwc2FVSkJRV2xDTEZOQlFXcENMR05CUVdsQ0xFTkJRVU1zU1VGQlJDeEZRVUZWTzBGQlEyaERMRXRCUVVrc1YwRkJWeXhWUVVGVkxHbENRVUZXTEVkQlFUaENMR3RDUVVFM1F6dEJRVU5CTEV0QlFVa3NaVUZCWlN4RFFVRkRMRTlCUVVRc1IwRkJWeXhwUWtGQldDeEhRVUVyUWl4clFrRkJiRVE3UVVGRFFTeExRVUZKTEZkQlFWY3NUVUZCVFN4SlFVRk9MRU5CUVZjc1UwRkJVeXhuUWtGQlZDeERRVUV3UWl4UlFVRXhRaXhEUVVGWUxFTkJRV1k3TzBGQlJVRXNZMEZCWVN4WlFVRmlPenRCUVVWQkxGRkJRVThzVTBGQlV5eEpRVUZVTEVOQlFXTXNhVUpCUVZNN1FVRkROMElzVFVGQlNTeFBRVUZQTEUxQlFVMHNhMEpCUVdwQ08wRkJRMEVzVTBGQlR5eExRVUZMTEZOQlFVd3NRMEZCWlN4RFFVRm1MRTFCUVhOQ0xFbEJRWFJDTEVsQlFUaENMRXRCUVVzc1UwRkJUQ3hEUVVGbExFTkJRV1lzVFVGQmMwSXNTMEZCU3l4WFFVRk1MRVZCUVRORU8wRkJRMEVzUlVGSVRTeERRVUZRTzBGQlNVRXNRMEZZUkRzN1FVRmpRU3hKUVVGTkxHVkJRV1VzVTBGQlppeFpRVUZsTEVkQlFVMDdRVUZETVVJc1MwRkJUU3gxUWtGQmRVSXNVMEZCZGtJc2IwSkJRWFZDTEVOQlFVTXNUMEZCUkN4RlFVRlZMRTFCUVZZc1JVRkJjVUk3UVVGRGFrUXNWVUZCVVN4blFrRkJVaXhEUVVGNVFpeFBRVUY2UWl4RlFVRnJReXhaUVVGTk8wRkJRM1pETEU5QlFVMHNZVUZCWVN4VFFVRlRMR05CUVZRc1EwRkJkMElzVFVGQmVFSXNRMEZCYmtJN1FVRkRRU3hQUVVGSkxHVkJRVW83TzBGQlJVRXNUMEZCU1N4RFFVRkRMRTlCUVV3c1JVRkJZenRCUVVOaUxHRkJRVk1zVjBGQlZ5eEhRVUZZTEVkQlFXbENMRk5CUVZNc1kwRkJWQ3hEUVVGM1FpeGxRVUY0UWl4RFFVRnFRaXhIUVVFMFJDeFhRVUZYTEdGQlFWZ3NRMEZCZVVJc1lVRkJla0lzUTBGQmRVTXNZVUZCZGtNc1EwRkJjVVFzWVVGQmNrUXNRMEZCYlVVc2MwSkJRVzVGTEVOQlFUQkdMR0ZCUVRGR0xFTkJRWGRITERKQ1FVRjRSeXhEUVVGeVJUdEJRVU5CTEVsQlJrUXNUVUZGVHp0QlFVTk9MR0ZCUVZNc1YwRkJWeXhIUVVGWUxFZEJRV2xDTEZOQlFWTXNZMEZCVkN4RFFVRjNRaXhsUVVGNFFpeERRVUZxUWl4SFFVRTBSQ3hYUVVGWExHRkJRVmdzUTBGQmVVSXNZVUZCZWtJc1EwRkJkVU1zWVVGQmRrTXNRMEZCY1VRc2MwSkJRWEpFTEVOQlFUUkZMR0ZCUVRWRkxFTkJRVEJHTERKQ1FVRXhSaXhEUVVGeVJUdEJRVU5CT3p0QlFVVkVMRlZCUVU4c1kwRkJVQ3hEUVVGelFpeEZRVUZETEZWQlFWVXNVVUZCV0N4RlFVRnhRaXhQUVVGUExFOUJRVFZDTEVWQlFYUkNPMEZCUTBFc1IwRllSRHRCUVZsQkxFVkJZa1E3TzBGQlpVRXNTMEZCU1N4blFrRkJaMElzUlVGQmNFSTdRVUZEUVN4TFFVRkpMRk5CUVZNc1UwRkJVeXhoUVVGVUxFTkJRWFZDTEc5Q1FVRjJRaXhEUVVGaU8wRkJRMEVzVVVGQlR5eFRRVUZRTEVkQlFXMUNMRVZCUVc1Q096dEJRVVZCTEZWQlFWTXNUMEZCVkN4RFFVRnBRaXhyUWtGQlZUdEJRVU14UWl4TlFVRkpMR05CUVdNc1pVRkJaU3hOUVVGbUxFTkJRV3hDTzBGQlEwRXNUVUZCU1N4VlFVRlZMRk5CUVZNc1lVRkJWQ3hEUVVGMVFpeEhRVUYyUWl4RFFVRmtPenRCUVVWQkxFMUJRVWtzUTBGQlF5eFhRVUZNTEVWQlFXdENPenRCUVVWc1FpeGpRVUZaTEVWQlFWb3NSMEZCYVVJc1RVRkJha0k3UVVGRFFTeFZRVUZSTEZOQlFWSXNSMEZCYjBJc1QwRkJUeXhYUVVGUUxFVkJRWEJDTzBGQlEwRXNWVUZCVVN4VFFVRlNMRWRCUVc5Q0xIbENRVUZ3UWpzN1FVRkZRU3gxUWtGQmNVSXNUMEZCY2tJc1JVRkJPRUlzVFVGQk9VSTdRVUZEUVN4VFFVRlBMRmRCUVZBc1EwRkJiVUlzVDBGQmJrSTdRVUZEUVN4RlFWcEVPMEZCWVVFc1EwRnFRMFE3TzBGQmJVTkJMRWxCUVUwc1pVRkJaU3hUUVVGbUxGbEJRV1VzUTBGQlF5eE5RVUZFTEVWQlFWTXNUMEZCVkN4RlFVRnhRanRCUVVONlF5eFJRVUZQTEU5QlFWQXNRMEZCWlN4cFFrRkJVenRCUVVOMlFpeE5RVUZOTEN0Q1FVRTJRaXhMUVVGdVF6dEJRVU5CTEUxQlFVa3NUMEZCVHl4VFFVRlRMR0ZCUVZRc1EwRkJkVUlzUzBGQmRrSXNRMEZCV0R0QlFVTkJMRTlCUVVzc1UwRkJUQ3hIUVVGcFFpeGxRVUZxUWp0QlFVTkJMRTlCUVVzc1IwRkJUQ3hIUVVGWExFZEJRVmc3UVVGRFFTeFZRVUZSTEZkQlFWSXNRMEZCYjBJc1NVRkJjRUk3UVVGRFFTeEZRVTVFTzBGQlQwRXNRMEZTUkRzN1FVRlZRU3hKUVVGTkxHZENRVUZuUWl4VFFVRm9RaXhoUVVGblFpeEhRVUZOTzBGQlF6TkNMRXRCUVVrc1pVRkJaU3hUUVVGVExHTkJRVlFzUTBGQmQwSXNVMEZCZUVJc1EwRkJia0k3UVVGRFFTeExRVUZKTEdOQlFXTXNWVUZCVlN4UlFVRlJMRTlCUVd4Q0xFZEJRVFJDTEZGQlFWRXNVVUZCZEVRN08wRkJSVUVzWTBGQllTeFRRVUZpTEVkQlFYbENMRVZCUVhwQ096dEJRVVZCTEdGQlFWa3NUMEZCV2l4RFFVRnZRaXhwUWtGQlV6dEJRVUZCTEUxQlEzUkNMRXRCUkhOQ0xFZEJRM05ETEV0QlJIUkRMRU5CUTNSQ0xFdEJSSE5DTzBGQlFVRXNUVUZEWml4UlFVUmxMRWRCUTNORExFdEJSSFJETEVOQlEyWXNVVUZFWlR0QlFVRkJMRTFCUTB3c1UwRkVTeXhIUVVOelF5eExRVVIwUXl4RFFVTk1MRk5CUkVzN1FVRkJRU3hOUVVOTkxFMUJSRTRzUjBGRGMwTXNTMEZFZEVNc1EwRkRUU3hOUVVST08wRkJRVUVzVFVGRFl5eFhRVVJrTEVkQlEzTkRMRXRCUkhSRExFTkJRMk1zVjBGRVpEdEJRVUZCTEUxQlF6SkNMRTFCUkROQ0xFZEJRM05ETEV0QlJIUkRMRU5CUXpKQ0xFMUJSRE5DT3pzN1FVRkhOVUlzWlVGQllTeHJRa0ZCWWl4RFFVRm5ReXhYUVVGb1F5eEZRVUUyUXl4NVFrRkJOME03TzBGQlJVRXNUVUZCU1N4bFFVRmxMRk5CUVZNc1owSkJRVlFzUTBGQk1FSXNkMEpCUVRGQ0xFTkJRVzVDTzBGQlEwRXNUVUZCU1N4VlFVRlZMR0ZCUVdFc1lVRkJZU3hOUVVGaUxFZEJRWE5DTEVOQlFXNURMRU5CUVdRN08wRkJSVUVzVFVGQlNTeFBRVUZQTEUxQlFWZ3NSVUZCYlVJc1lVRkJZU3hOUVVGaUxFVkJRWEZDTEU5QlFYSkNPenRCUVVWdVFpeE5RVUZKTEc5Q1FVRnZRaXhUUVVGVExHRkJRVlFzUTBGQmRVSXNTMEZCZGtJc1EwRkJlRUk3UVVGRFFTeE5RVUZKTEcxQ1FVRnRRaXhUUVVGVExHRkJRVlFzUTBGQmRVSXNSMEZCZGtJc1EwRkJka0k3UVVGRFFTeE5RVUZKTEdOQlFXTXNVMEZCVXl4aFFVRlVMRU5CUVhWQ0xFZEJRWFpDTEVOQlFXeENPMEZCUTBFc2IwSkJRV3RDTEZOQlFXeENMRU5CUVRSQ0xFZEJRVFZDTEVOQlFXZERMRFJDUVVGb1F6dEJRVU5CTEcxQ1FVRnBRaXhUUVVGcVFpeERRVUV5UWl4SFFVRXpRaXhEUVVFclFpeHhRa0ZCTDBJN1FVRkRRU3hqUVVGWkxGTkJRVm9zUTBGQmMwSXNSMEZCZEVJc1EwRkJNRUlzWjBKQlFURkNPenRCUVVWQkxHMUNRVUZwUWl4VFFVRnFRaXhIUVVFMlFpeFhRVUUzUWp0QlFVTkJMR05CUVZrc1UwRkJXaXhIUVVGM1FpeE5RVUY0UWpzN1FVRkZRU3h2UWtGQmEwSXNWMEZCYkVJc1EwRkJPRUlzWjBKQlFUbENMRVZCUVdkRUxGZEJRV2hFTzBGQlEwRXNWVUZCVVN4WFFVRlNMRU5CUVc5Q0xHbENRVUZ3UWpzN1FVRkZRU3hOUVVGSkxHTkJRV01zVTBGQlV5eG5Ra0ZCVkN4RFFVRXdRaXg1UWtGQk1VSXNRMEZCYkVJN1FVRkRRU3hOUVVGSkxGTkJRVk1zV1VGQldTeFpRVUZaTEUxQlFWb3NSMEZCY1VJc1EwRkJha01zUTBGQllqczdRVUZGUVN4TlFVRkpMR05CUVdNc1UwRkJVeXhuUWtGQlZDeERRVUV3UWl3clFrRkJNVUlzUTBGQmJFSTdRVUZEUVN4TlFVRkpMRk5CUVZNc1dVRkJXU3haUVVGWkxFMUJRVm9zUjBGQmNVSXNRMEZCYWtNc1EwRkJZanM3UVVGRlFTeE5RVUZKTEdGQlFXRXNVMEZCVXl4blFrRkJWQ3hEUVVFd1FpdzRRa0ZCTVVJc1EwRkJha0k3UVVGRFFTeE5RVUZKTEZGQlFWRXNWMEZCVnl4WFFVRlhMRTFCUVZnc1IwRkJiMElzUTBGQkwwSXNRMEZCV2pzN1FVRkZRU3hUUVVGUExGTkJRVkFzUjBGQmJVSXNTMEZCYmtJN1FVRkRRU3hUUVVGUExGTkJRVkFzUjBGQmJVSXNVMEZCYmtJN1FVRkRRU3hSUVVGTkxGTkJRVTRzUjBGQmEwSXNVVUZCYkVJN1FVRkZRU3hGUVhCRFJEczdRVUZ6UTBFN1FVRkRRVHRCUVVOQkxFTkJPVU5FT3p0QlFXZEVRVHRCUVVOQkxFbEJRVTBzWTBGQll5eFRRVUZrTEZkQlFXTXNSMEZCVFR0QlFVTjZRaXhUUVVGUkxFOUJRVklzUTBGQlowSXNTVUZCYUVJc1EwRkJjVUlzVlVGQlF5eERRVUZFTEVWQlFVa3NRMEZCU2l4RlFVRlZPMEZCUXpsQ0xFMUJRVWtzVTBGQlV5eEZRVUZGTEV0QlFVWXNRMEZCVVN4RFFVRlNMRVZCUVZjc1YwRkJXQ3hGUVVGaU8wRkJRMEVzVFVGQlNTeFRRVUZUTEVWQlFVVXNTMEZCUml4RFFVRlJMRU5CUVZJc1JVRkJWeXhYUVVGWUxFVkJRV0k3UVVGRFFTeE5RVUZKTEZOQlFWTXNUVUZCWWl4RlFVRnhRaXhQUVVGUExFTkJRVkFzUTBGQmNrSXNTMEZEU3l4SlFVRkpMRk5CUVZNc1RVRkJZaXhGUVVGeFFpeFBRVUZQTEVOQlFVTXNRMEZCVWl4RFFVRnlRaXhMUVVOQkxFOUJRVThzUTBGQlVEdEJRVU5NTEVWQlRrUTdRVUZQUVN4RFFWSkVPenRCUVZWQkxFbEJRVTBzVlVGQlZTeFRRVUZXTEU5QlFWVXNRMEZCUXl4SlFVRkVMRVZCUVZVN1FVRkRla0lzVTBGQlVTeFJRVUZTTEVkQlFXMUNMRWxCUVc1Q08wRkJRMEVzVTBGQlVTeFBRVUZTTEVkQlFXdENMRXRCUVVzc1MwRkJUQ3hGUVVGc1FqdEJRVU5CTzBGQlEwRTdRVUZEUVN4RFFVeEVPenRCUVU5QkxFbEJRVTBzV1VGQldTeFRRVUZhTEZOQlFWa3NSMEZCVFR0QlFVTjBRaXhQUVVGTkxFVkJRVTRzUlVGQlZTeEpRVUZXTEVOQlFXVTdRVUZCUVN4VFFVTmtMRWxCUVVrc1NVRkJTaXhGUVVSak8wRkJRVUVzUlVGQlppeEZRVVZGTEVsQlJrWXNRMEZGVHl4blFrRkJVVHRCUVVOa0xGVkJRVkVzU1VGQlVqdEJRVU5CTEVWQlNrUXNSVUZMUXl4SlFVeEVMRU5CUzAwc1dVRkJUVHRCUVVOWUxGZEJRVk1zVDBGQlZDeERRVUZwUWp0QlFVRkJMRlZCUVZFc1MwRkJTeXhUUVVGTUxFTkJRV1VzUjBGQlppeERRVUZ0UWl4UFFVRnVRaXhEUVVGU08wRkJRVUVzUjBGQmFrSTdRVUZEUVN4UFFVRkxMRk5CUVV3c1EwRkJaU3hIUVVGbUxFTkJRVzFDTEU5QlFXNUNPMEZCUTBFc1JVRlNSQ3hGUVZORExFdEJWRVFzUTBGVFR6dEJRVUZCTEZOQlFVOHNVVUZCVVN4SlFVRlNMRU5CUVdFc1IwRkJZaXhEUVVGUU8wRkJRVUVzUlVGVVVEdEJRVlZFTEVOQldFUTdPMEZCWVVFc1NVRkJUU3hQUVVGUExGTkJRVkFzU1VGQlR5eEhRVUZOTzBGQlEyeENPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTEVOQlVFUTdPMEZCVTBFN096czdPenM3TzBGRE0xSkJMRWxCUVUwc2IyeENRVUZPT3p0QlFXZENRU3hKUVVGTkxGRkJRVkVzVTBGQlVpeExRVUZSTEVkQlFVMDdRVUZEYmtJc1MwRkJTU3hYUVVGWExGTkJRVk1zWTBGQlZDeERRVUYzUWl4UlFVRjRRaXhEUVVGbU8wRkJRMEVzVlVGQlV5eFRRVUZVTEVkQlFYRkNMRkZCUVhKQ08wRkJRMEVzUTBGSVJEczdhMEpCUzJVc1N5SXNJbVpwYkdVaU9pSm5aVzVsY21GMFpXUXVhbk1pTENKemIzVnlZMlZTYjI5MElqb2lJaXdpYzI5MWNtTmxjME52Ym5SbGJuUWlPbHNpS0daMWJtTjBhVzl1S0NsN1puVnVZM1JwYjI0Z2NpaGxMRzRzZENsN1puVnVZM1JwYjI0Z2J5aHBMR1lwZTJsbUtDRnVXMmxkS1h0cFppZ2haVnRwWFNsN2RtRnlJR005WENKbWRXNWpkR2x2Ymx3aVBUMTBlWEJsYjJZZ2NtVnhkV2x5WlNZbWNtVnhkV2x5WlR0cFppZ2haaVltWXlseVpYUjFjbTRnWXlocExDRXdLVHRwWmloMUtYSmxkSFZ5YmlCMUtHa3NJVEFwTzNaaGNpQmhQVzVsZHlCRmNuSnZjaWhjSWtOaGJtNXZkQ0JtYVc1a0lHMXZaSFZzWlNBblhDSXJhU3RjSWlkY0lpazdkR2h5YjNjZ1lTNWpiMlJsUFZ3aVRVOUVWVXhGWDA1UFZGOUdUMVZPUkZ3aUxHRjlkbUZ5SUhBOWJsdHBYVDE3Wlhod2IzSjBjenA3ZlgwN1pWdHBYVnN3WFM1allXeHNLSEF1Wlhod2IzSjBjeXhtZFc1amRHbHZiaWh5S1h0MllYSWdiajFsVzJsZFd6RmRXM0pkTzNKbGRIVnliaUJ2S0c1OGZISXBmU3h3TEhBdVpYaHdiM0owY3l4eUxHVXNiaXgwS1gxeVpYUjFjbTRnYmx0cFhTNWxlSEJ2Y25SemZXWnZjaWgyWVhJZ2RUMWNJbVoxYm1OMGFXOXVYQ0k5UFhSNWNHVnZaaUJ5WlhGMWFYSmxKaVp5WlhGMWFYSmxMR2s5TUR0cFBIUXViR1Z1WjNSb08ya3JLeWx2S0hSYmFWMHBPM0psZEhWeWJpQnZmWEpsZEhWeWJpQnlmU2tvS1NJc0lpaG1kVzVqZEdsdmJpaHpaV3htS1NCN1hHNGdJQ2QxYzJVZ2MzUnlhV04wSnp0Y2JseHVJQ0JwWmlBb2MyVnNaaTVtWlhSamFDa2dlMXh1SUNBZ0lISmxkSFZ5Ymx4dUlDQjlYRzVjYmlBZ2RtRnlJSE4xY0hCdmNuUWdQU0I3WEc0Z0lDQWdjMlZoY21Ob1VHRnlZVzF6T2lBblZWSk1VMlZoY21Ob1VHRnlZVzF6SnlCcGJpQnpaV3htTEZ4dUlDQWdJR2wwWlhKaFlteGxPaUFuVTNsdFltOXNKeUJwYmlCelpXeG1JQ1ltSUNkcGRHVnlZWFJ2Y2ljZ2FXNGdVM2x0WW05c0xGeHVJQ0FnSUdKc2IySTZJQ2RHYVd4bFVtVmhaR1Z5SnlCcGJpQnpaV3htSUNZbUlDZENiRzlpSnlCcGJpQnpaV3htSUNZbUlDaG1kVzVqZEdsdmJpZ3BJSHRjYmlBZ0lDQWdJSFJ5ZVNCN1hHNGdJQ0FnSUNBZ0lHNWxkeUJDYkc5aUtDbGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlIUnlkV1ZjYmlBZ0lDQWdJSDBnWTJGMFkyZ29aU2tnZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnWm1Gc2MyVmNiaUFnSUNBZ0lIMWNiaUFnSUNCOUtTZ3BMRnh1SUNBZ0lHWnZjbTFFWVhSaE9pQW5SbTl5YlVSaGRHRW5JR2x1SUhObGJHWXNYRzRnSUNBZ1lYSnlZWGxDZFdabVpYSTZJQ2RCY25KaGVVSjFabVpsY2ljZ2FXNGdjMlZzWmx4dUlDQjlYRzVjYmlBZ2FXWWdLSE4xY0hCdmNuUXVZWEp5WVhsQ2RXWm1aWElwSUh0Y2JpQWdJQ0IyWVhJZ2RtbGxkME5zWVhOelpYTWdQU0JiWEc0Z0lDQWdJQ0FuVzI5aWFtVmpkQ0JKYm5RNFFYSnlZWGxkSnl4Y2JpQWdJQ0FnSUNkYmIySnFaV04wSUZWcGJuUTRRWEp5WVhsZEp5eGNiaUFnSUNBZ0lDZGJiMkpxWldOMElGVnBiblE0UTJ4aGJYQmxaRUZ5Y21GNVhTY3NYRzRnSUNBZ0lDQW5XMjlpYW1WamRDQkpiblF4TmtGeWNtRjVYU2NzWEc0Z0lDQWdJQ0FuVzI5aWFtVmpkQ0JWYVc1ME1UWkJjbkpoZVYwbkxGeHVJQ0FnSUNBZ0oxdHZZbXBsWTNRZ1NXNTBNekpCY25KaGVWMG5MRnh1SUNBZ0lDQWdKMXR2WW1wbFkzUWdWV2x1ZERNeVFYSnlZWGxkSnl4Y2JpQWdJQ0FnSUNkYmIySnFaV04wSUVac2IyRjBNekpCY25KaGVWMG5MRnh1SUNBZ0lDQWdKMXR2WW1wbFkzUWdSbXh2WVhRMk5FRnljbUY1WFNkY2JpQWdJQ0JkWEc1Y2JpQWdJQ0IyWVhJZ2FYTkVZWFJoVm1sbGR5QTlJR1oxYm1OMGFXOXVLRzlpYWlrZ2UxeHVJQ0FnSUNBZ2NtVjBkWEp1SUc5aWFpQW1KaUJFWVhSaFZtbGxkeTV3Y205MGIzUjVjR1V1YVhOUWNtOTBiM1I1Y0dWUFppaHZZbW9wWEc0Z0lDQWdmVnh1WEc0Z0lDQWdkbUZ5SUdselFYSnlZWGxDZFdabVpYSldhV1YzSUQwZ1FYSnlZWGxDZFdabVpYSXVhWE5XYVdWM0lIeDhJR1oxYm1OMGFXOXVLRzlpYWlrZ2UxeHVJQ0FnSUNBZ2NtVjBkWEp1SUc5aWFpQW1KaUIyYVdWM1EyeGhjM05sY3k1cGJtUmxlRTltS0U5aWFtVmpkQzV3Y205MGIzUjVjR1V1ZEc5VGRISnBibWN1WTJGc2JDaHZZbW9wS1NBK0lDMHhYRzRnSUNBZ2ZWeHVJQ0I5WEc1Y2JpQWdablZ1WTNScGIyNGdibTl5YldGc2FYcGxUbUZ0WlNodVlXMWxLU0I3WEc0Z0lDQWdhV1lnS0hSNWNHVnZaaUJ1WVcxbElDRTlQU0FuYzNSeWFXNW5KeWtnZTF4dUlDQWdJQ0FnYm1GdFpTQTlJRk4wY21sdVp5aHVZVzFsS1Z4dUlDQWdJSDFjYmlBZ0lDQnBaaUFvTDF0ZVlTMTZNQzA1WEZ3dEl5UWxKaWNxS3k1Y1hGNWZZSHgrWFM5cExuUmxjM1FvYm1GdFpTa3BJSHRjYmlBZ0lDQWdJSFJvY205M0lHNWxkeUJVZVhCbFJYSnliM0lvSjBsdWRtRnNhV1FnWTJoaGNtRmpkR1Z5SUdsdUlHaGxZV1JsY2lCbWFXVnNaQ0J1WVcxbEp5bGNiaUFnSUNCOVhHNGdJQ0FnY21WMGRYSnVJRzVoYldVdWRHOU1iM2RsY2tOaGMyVW9LVnh1SUNCOVhHNWNiaUFnWm5WdVkzUnBiMjRnYm05eWJXRnNhWHBsVm1Gc2RXVW9kbUZzZFdVcElIdGNiaUFnSUNCcFppQW9kSGx3Wlc5bUlIWmhiSFZsSUNFOVBTQW5jM1J5YVc1bkp5a2dlMXh1SUNBZ0lDQWdkbUZzZFdVZ1BTQlRkSEpwYm1jb2RtRnNkV1VwWEc0Z0lDQWdmVnh1SUNBZ0lISmxkSFZ5YmlCMllXeDFaVnh1SUNCOVhHNWNiaUFnTHk4Z1FuVnBiR1FnWVNCa1pYTjBjblZqZEdsMlpTQnBkR1Z5WVhSdmNpQm1iM0lnZEdobElIWmhiSFZsSUd4cGMzUmNiaUFnWm5WdVkzUnBiMjRnYVhSbGNtRjBiM0pHYjNJb2FYUmxiWE1wSUh0Y2JpQWdJQ0IyWVhJZ2FYUmxjbUYwYjNJZ1BTQjdYRzRnSUNBZ0lDQnVaWGgwT2lCbWRXNWpkR2x2YmlncElIdGNiaUFnSUNBZ0lDQWdkbUZ5SUhaaGJIVmxJRDBnYVhSbGJYTXVjMmhwWm5Rb0tWeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2UyUnZibVU2SUhaaGJIVmxJRDA5UFNCMWJtUmxabWx1WldRc0lIWmhiSFZsT2lCMllXeDFaWDFjYmlBZ0lDQWdJSDFjYmlBZ0lDQjlYRzVjYmlBZ0lDQnBaaUFvYzNWd2NHOXlkQzVwZEdWeVlXSnNaU2tnZTF4dUlDQWdJQ0FnYVhSbGNtRjBiM0piVTNsdFltOXNMbWwwWlhKaGRHOXlYU0E5SUdaMWJtTjBhVzl1S0NrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2FYUmxjbUYwYjNKY2JpQWdJQ0FnSUgxY2JpQWdJQ0I5WEc1Y2JpQWdJQ0J5WlhSMWNtNGdhWFJsY21GMGIzSmNiaUFnZlZ4dVhHNGdJR1oxYm1OMGFXOXVJRWhsWVdSbGNuTW9hR1ZoWkdWeWN5a2dlMXh1SUNBZ0lIUm9hWE11YldGd0lEMGdlMzFjYmx4dUlDQWdJR2xtSUNob1pXRmtaWEp6SUdsdWMzUmhibU5sYjJZZ1NHVmhaR1Z5Y3lrZ2UxeHVJQ0FnSUNBZ2FHVmhaR1Z5Y3k1bWIzSkZZV05vS0daMWJtTjBhVzl1S0haaGJIVmxMQ0J1WVcxbEtTQjdYRzRnSUNBZ0lDQWdJSFJvYVhNdVlYQndaVzVrS0c1aGJXVXNJSFpoYkhWbEtWeHVJQ0FnSUNBZ2ZTd2dkR2hwY3lsY2JpQWdJQ0I5SUdWc2MyVWdhV1lnS0VGeWNtRjVMbWx6UVhKeVlYa29hR1ZoWkdWeWN5a3BJSHRjYmlBZ0lDQWdJR2hsWVdSbGNuTXVabTl5UldGamFDaG1kVzVqZEdsdmJpaG9aV0ZrWlhJcElIdGNiaUFnSUNBZ0lDQWdkR2hwY3k1aGNIQmxibVFvYUdWaFpHVnlXekJkTENCb1pXRmtaWEpiTVYwcFhHNGdJQ0FnSUNCOUxDQjBhR2x6S1Z4dUlDQWdJSDBnWld4elpTQnBaaUFvYUdWaFpHVnljeWtnZTF4dUlDQWdJQ0FnVDJKcVpXTjBMbWRsZEU5M2JsQnliM0JsY25SNVRtRnRaWE1vYUdWaFpHVnljeWt1Wm05eVJXRmphQ2htZFc1amRHbHZiaWh1WVcxbEtTQjdYRzRnSUNBZ0lDQWdJSFJvYVhNdVlYQndaVzVrS0c1aGJXVXNJR2hsWVdSbGNuTmJibUZ0WlYwcFhHNGdJQ0FnSUNCOUxDQjBhR2x6S1Z4dUlDQWdJSDFjYmlBZ2ZWeHVYRzRnSUVobFlXUmxjbk11Y0hKdmRHOTBlWEJsTG1Gd2NHVnVaQ0E5SUdaMWJtTjBhVzl1S0c1aGJXVXNJSFpoYkhWbEtTQjdYRzRnSUNBZ2JtRnRaU0E5SUc1dmNtMWhiR2w2WlU1aGJXVW9ibUZ0WlNsY2JpQWdJQ0IyWVd4MVpTQTlJRzV2Y20xaGJHbDZaVlpoYkhWbEtIWmhiSFZsS1Z4dUlDQWdJSFpoY2lCdmJHUldZV3gxWlNBOUlIUm9hWE11YldGd1cyNWhiV1ZkWEc0Z0lDQWdkR2hwY3k1dFlYQmJibUZ0WlYwZ1BTQnZiR1JXWVd4MVpTQS9JRzlzWkZaaGJIVmxLeWNzSnl0MllXeDFaU0E2SUhaaGJIVmxYRzRnSUgxY2JseHVJQ0JJWldGa1pYSnpMbkJ5YjNSdmRIbHdaVnNuWkdWc1pYUmxKMTBnUFNCbWRXNWpkR2x2YmlodVlXMWxLU0I3WEc0Z0lDQWdaR1ZzWlhSbElIUm9hWE11YldGd1cyNXZjbTFoYkdsNlpVNWhiV1VvYm1GdFpTbGRYRzRnSUgxY2JseHVJQ0JJWldGa1pYSnpMbkJ5YjNSdmRIbHdaUzVuWlhRZ1BTQm1kVzVqZEdsdmJpaHVZVzFsS1NCN1hHNGdJQ0FnYm1GdFpTQTlJRzV2Y20xaGJHbDZaVTVoYldVb2JtRnRaU2xjYmlBZ0lDQnlaWFIxY200Z2RHaHBjeTVvWVhNb2JtRnRaU2tnUHlCMGFHbHpMbTFoY0Z0dVlXMWxYU0E2SUc1MWJHeGNiaUFnZlZ4dVhHNGdJRWhsWVdSbGNuTXVjSEp2ZEc5MGVYQmxMbWhoY3lBOUlHWjFibU4wYVc5dUtHNWhiV1VwSUh0Y2JpQWdJQ0J5WlhSMWNtNGdkR2hwY3k1dFlYQXVhR0Z6VDNkdVVISnZjR1Z5ZEhrb2JtOXliV0ZzYVhwbFRtRnRaU2h1WVcxbEtTbGNiaUFnZlZ4dVhHNGdJRWhsWVdSbGNuTXVjSEp2ZEc5MGVYQmxMbk5sZENBOUlHWjFibU4wYVc5dUtHNWhiV1VzSUhaaGJIVmxLU0I3WEc0Z0lDQWdkR2hwY3k1dFlYQmJibTl5YldGc2FYcGxUbUZ0WlNodVlXMWxLVjBnUFNCdWIzSnRZV3hwZW1WV1lXeDFaU2gyWVd4MVpTbGNiaUFnZlZ4dVhHNGdJRWhsWVdSbGNuTXVjSEp2ZEc5MGVYQmxMbVp2Y2tWaFkyZ2dQU0JtZFc1amRHbHZiaWhqWVd4c1ltRmpheXdnZEdocGMwRnlaeWtnZTF4dUlDQWdJR1p2Y2lBb2RtRnlJRzVoYldVZ2FXNGdkR2hwY3k1dFlYQXBJSHRjYmlBZ0lDQWdJR2xtSUNoMGFHbHpMbTFoY0M1b1lYTlBkMjVRY205d1pYSjBlU2h1WVcxbEtTa2dlMXh1SUNBZ0lDQWdJQ0JqWVd4c1ltRmpheTVqWVd4c0tIUm9hWE5CY21jc0lIUm9hWE11YldGd1cyNWhiV1ZkTENCdVlXMWxMQ0IwYUdsektWeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUgxY2JpQWdmVnh1WEc0Z0lFaGxZV1JsY25NdWNISnZkRzkwZVhCbExtdGxlWE1nUFNCbWRXNWpkR2x2YmlncElIdGNiaUFnSUNCMllYSWdhWFJsYlhNZ1BTQmJYVnh1SUNBZ0lIUm9hWE11Wm05eVJXRmphQ2htZFc1amRHbHZiaWgyWVd4MVpTd2dibUZ0WlNrZ2V5QnBkR1Z0Y3k1d2RYTm9LRzVoYldVcElIMHBYRzRnSUNBZ2NtVjBkWEp1SUdsMFpYSmhkRzl5Um05eUtHbDBaVzF6S1Z4dUlDQjlYRzVjYmlBZ1NHVmhaR1Z5Y3k1d2NtOTBiM1I1Y0dVdWRtRnNkV1Z6SUQwZ1puVnVZM1JwYjI0b0tTQjdYRzRnSUNBZ2RtRnlJR2wwWlcxeklEMGdXMTFjYmlBZ0lDQjBhR2x6TG1admNrVmhZMmdvWm5WdVkzUnBiMjRvZG1Gc2RXVXBJSHNnYVhSbGJYTXVjSFZ6YUNoMllXeDFaU2tnZlNsY2JpQWdJQ0J5WlhSMWNtNGdhWFJsY21GMGIzSkdiM0lvYVhSbGJYTXBYRzRnSUgxY2JseHVJQ0JJWldGa1pYSnpMbkJ5YjNSdmRIbHdaUzVsYm5SeWFXVnpJRDBnWm5WdVkzUnBiMjRvS1NCN1hHNGdJQ0FnZG1GeUlHbDBaVzF6SUQwZ1cxMWNiaUFnSUNCMGFHbHpMbVp2Y2tWaFkyZ29ablZ1WTNScGIyNG9kbUZzZFdVc0lHNWhiV1VwSUhzZ2FYUmxiWE11Y0hWemFDaGJibUZ0WlN3Z2RtRnNkV1ZkS1NCOUtWeHVJQ0FnSUhKbGRIVnliaUJwZEdWeVlYUnZja1p2Y2locGRHVnRjeWxjYmlBZ2ZWeHVYRzRnSUdsbUlDaHpkWEJ3YjNKMExtbDBaWEpoWW14bEtTQjdYRzRnSUNBZ1NHVmhaR1Z5Y3k1d2NtOTBiM1I1Y0dWYlUzbHRZbTlzTG1sMFpYSmhkRzl5WFNBOUlFaGxZV1JsY25NdWNISnZkRzkwZVhCbExtVnVkSEpwWlhOY2JpQWdmVnh1WEc0Z0lHWjFibU4wYVc5dUlHTnZibk4xYldWa0tHSnZaSGtwSUh0Y2JpQWdJQ0JwWmlBb1ltOWtlUzVpYjJSNVZYTmxaQ2tnZTF4dUlDQWdJQ0FnY21WMGRYSnVJRkJ5YjIxcGMyVXVjbVZxWldOMEtHNWxkeUJVZVhCbFJYSnliM0lvSjBGc2NtVmhaSGtnY21WaFpDY3BLVnh1SUNBZ0lIMWNiaUFnSUNCaWIyUjVMbUp2WkhsVmMyVmtJRDBnZEhKMVpWeHVJQ0I5WEc1Y2JpQWdablZ1WTNScGIyNGdabWxzWlZKbFlXUmxjbEpsWVdSNUtISmxZV1JsY2lrZ2UxeHVJQ0FnSUhKbGRIVnliaUJ1WlhjZ1VISnZiV2x6WlNobWRXNWpkR2x2YmloeVpYTnZiSFpsTENCeVpXcGxZM1FwSUh0Y2JpQWdJQ0FnSUhKbFlXUmxjaTV2Ym14dllXUWdQU0JtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0FnSUNBZ2NtVnpiMngyWlNoeVpXRmtaWEl1Y21WemRXeDBLVnh1SUNBZ0lDQWdmVnh1SUNBZ0lDQWdjbVZoWkdWeUxtOXVaWEp5YjNJZ1BTQm1kVzVqZEdsdmJpZ3BJSHRjYmlBZ0lDQWdJQ0FnY21WcVpXTjBLSEpsWVdSbGNpNWxjbkp2Y2lsY2JpQWdJQ0FnSUgxY2JpQWdJQ0I5S1Z4dUlDQjlYRzVjYmlBZ1puVnVZM1JwYjI0Z2NtVmhaRUpzYjJKQmMwRnljbUY1UW5WbVptVnlLR0pzYjJJcElIdGNiaUFnSUNCMllYSWdjbVZoWkdWeUlEMGdibVYzSUVacGJHVlNaV0ZrWlhJb0tWeHVJQ0FnSUhaaGNpQndjbTl0YVhObElEMGdabWxzWlZKbFlXUmxjbEpsWVdSNUtISmxZV1JsY2lsY2JpQWdJQ0J5WldGa1pYSXVjbVZoWkVGelFYSnlZWGxDZFdabVpYSW9ZbXh2WWlsY2JpQWdJQ0J5WlhSMWNtNGdjSEp2YldselpWeHVJQ0I5WEc1Y2JpQWdablZ1WTNScGIyNGdjbVZoWkVKc2IySkJjMVJsZUhRb1lteHZZaWtnZTF4dUlDQWdJSFpoY2lCeVpXRmtaWElnUFNCdVpYY2dSbWxzWlZKbFlXUmxjaWdwWEc0Z0lDQWdkbUZ5SUhCeWIyMXBjMlVnUFNCbWFXeGxVbVZoWkdWeVVtVmhaSGtvY21WaFpHVnlLVnh1SUNBZ0lISmxZV1JsY2k1eVpXRmtRWE5VWlhoMEtHSnNiMklwWEc0Z0lDQWdjbVYwZFhKdUlIQnliMjFwYzJWY2JpQWdmVnh1WEc0Z0lHWjFibU4wYVc5dUlISmxZV1JCY25KaGVVSjFabVpsY2tGelZHVjRkQ2hpZFdZcElIdGNiaUFnSUNCMllYSWdkbWxsZHlBOUlHNWxkeUJWYVc1ME9FRnljbUY1S0dKMVppbGNiaUFnSUNCMllYSWdZMmhoY25NZ1BTQnVaWGNnUVhKeVlYa29kbWxsZHk1c1pXNW5kR2dwWEc1Y2JpQWdJQ0JtYjNJZ0tIWmhjaUJwSUQwZ01Ec2dhU0E4SUhacFpYY3ViR1Z1WjNSb095QnBLeXNwSUh0Y2JpQWdJQ0FnSUdOb1lYSnpXMmxkSUQwZ1UzUnlhVzVuTG1aeWIyMURhR0Z5UTI5a1pTaDJhV1YzVzJsZEtWeHVJQ0FnSUgxY2JpQWdJQ0J5WlhSMWNtNGdZMmhoY25NdWFtOXBiaWduSnlsY2JpQWdmVnh1WEc0Z0lHWjFibU4wYVc5dUlHSjFabVpsY2tOc2IyNWxLR0oxWmlrZ2UxeHVJQ0FnSUdsbUlDaGlkV1l1YzJ4cFkyVXBJSHRjYmlBZ0lDQWdJSEpsZEhWeWJpQmlkV1l1YzJ4cFkyVW9NQ2xjYmlBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ2RtRnlJSFpwWlhjZ1BTQnVaWGNnVldsdWREaEJjbkpoZVNoaWRXWXVZbmwwWlV4bGJtZDBhQ2xjYmlBZ0lDQWdJSFpwWlhjdWMyVjBLRzVsZHlCVmFXNTBPRUZ5Y21GNUtHSjFaaWtwWEc0Z0lDQWdJQ0J5WlhSMWNtNGdkbWxsZHk1aWRXWm1aWEpjYmlBZ0lDQjlYRzRnSUgxY2JseHVJQ0JtZFc1amRHbHZiaUJDYjJSNUtDa2dlMXh1SUNBZ0lIUm9hWE11WW05a2VWVnpaV1FnUFNCbVlXeHpaVnh1WEc0Z0lDQWdkR2hwY3k1ZmFXNXBkRUp2WkhrZ1BTQm1kVzVqZEdsdmJpaGliMlI1S1NCN1hHNGdJQ0FnSUNCMGFHbHpMbDlpYjJSNVNXNXBkQ0E5SUdKdlpIbGNiaUFnSUNBZ0lHbG1JQ2doWW05a2VTa2dlMXh1SUNBZ0lDQWdJQ0IwYUdsekxsOWliMlI1VkdWNGRDQTlJQ2NuWEc0Z0lDQWdJQ0I5SUdWc2MyVWdhV1lnS0hSNWNHVnZaaUJpYjJSNUlEMDlQU0FuYzNSeWFXNW5KeWtnZTF4dUlDQWdJQ0FnSUNCMGFHbHpMbDlpYjJSNVZHVjRkQ0E5SUdKdlpIbGNiaUFnSUNBZ0lIMGdaV3h6WlNCcFppQW9jM1Z3Y0c5eWRDNWliRzlpSUNZbUlFSnNiMkl1Y0hKdmRHOTBlWEJsTG1selVISnZkRzkwZVhCbFQyWW9ZbTlrZVNrcElIdGNiaUFnSUNBZ0lDQWdkR2hwY3k1ZlltOWtlVUpzYjJJZ1BTQmliMlI1WEc0Z0lDQWdJQ0I5SUdWc2MyVWdhV1lnS0hOMWNIQnZjblF1Wm05eWJVUmhkR0VnSmlZZ1JtOXliVVJoZEdFdWNISnZkRzkwZVhCbExtbHpVSEp2ZEc5MGVYQmxUMllvWW05a2VTa3BJSHRjYmlBZ0lDQWdJQ0FnZEdocGN5NWZZbTlrZVVadmNtMUVZWFJoSUQwZ1ltOWtlVnh1SUNBZ0lDQWdmU0JsYkhObElHbG1JQ2h6ZFhCd2IzSjBMbk5sWVhKamFGQmhjbUZ0Y3lBbUppQlZVa3hUWldGeVkyaFFZWEpoYlhNdWNISnZkRzkwZVhCbExtbHpVSEp2ZEc5MGVYQmxUMllvWW05a2VTa3BJSHRjYmlBZ0lDQWdJQ0FnZEdocGN5NWZZbTlrZVZSbGVIUWdQU0JpYjJSNUxuUnZVM1J5YVc1bktDbGNiaUFnSUNBZ0lIMGdaV3h6WlNCcFppQW9jM1Z3Y0c5eWRDNWhjbkpoZVVKMVptWmxjaUFtSmlCemRYQndiM0owTG1Kc2IySWdKaVlnYVhORVlYUmhWbWxsZHloaWIyUjVLU2tnZTF4dUlDQWdJQ0FnSUNCMGFHbHpMbDlpYjJSNVFYSnlZWGxDZFdabVpYSWdQU0JpZFdabVpYSkRiRzl1WlNoaWIyUjVMbUoxWm1abGNpbGNiaUFnSUNBZ0lDQWdMeThnU1VVZ01UQXRNVEVnWTJGdUozUWdhR0Z1Wkd4bElHRWdSR0YwWVZacFpYY2dZbTlrZVM1Y2JpQWdJQ0FnSUNBZ2RHaHBjeTVmWW05a2VVbHVhWFFnUFNCdVpYY2dRbXh2WWloYmRHaHBjeTVmWW05a2VVRnljbUY1UW5WbVptVnlYU2xjYmlBZ0lDQWdJSDBnWld4elpTQnBaaUFvYzNWd2NHOXlkQzVoY25KaGVVSjFabVpsY2lBbUppQW9RWEp5WVhsQ2RXWm1aWEl1Y0hKdmRHOTBlWEJsTG1selVISnZkRzkwZVhCbFQyWW9ZbTlrZVNrZ2ZId2dhWE5CY25KaGVVSjFabVpsY2xacFpYY29ZbTlrZVNrcEtTQjdYRzRnSUNBZ0lDQWdJSFJvYVhNdVgySnZaSGxCY25KaGVVSjFabVpsY2lBOUlHSjFabVpsY2tOc2IyNWxLR0p2WkhrcFhHNGdJQ0FnSUNCOUlHVnNjMlVnZTF4dUlDQWdJQ0FnSUNCMGFISnZkeUJ1WlhjZ1JYSnliM0lvSjNWdWMzVndjRzl5ZEdWa0lFSnZaSGxKYm1sMElIUjVjR1VuS1Z4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNCcFppQW9JWFJvYVhNdWFHVmhaR1Z5Y3k1blpYUW9KMk52Ym5SbGJuUXRkSGx3WlNjcEtTQjdYRzRnSUNBZ0lDQWdJR2xtSUNoMGVYQmxiMllnWW05a2VTQTlQVDBnSjNOMGNtbHVaeWNwSUh0Y2JpQWdJQ0FnSUNBZ0lDQjBhR2x6TG1obFlXUmxjbk11YzJWMEtDZGpiMjUwWlc1MExYUjVjR1VuTENBbmRHVjRkQzl3YkdGcGJqdGphR0Z5YzJWMFBWVlVSaTA0SnlsY2JpQWdJQ0FnSUNBZ2ZTQmxiSE5sSUdsbUlDaDBhR2x6TGw5aWIyUjVRbXh2WWlBbUppQjBhR2x6TGw5aWIyUjVRbXh2WWk1MGVYQmxLU0I3WEc0Z0lDQWdJQ0FnSUNBZ2RHaHBjeTVvWldGa1pYSnpMbk5sZENnblkyOXVkR1Z1ZEMxMGVYQmxKeXdnZEdocGN5NWZZbTlrZVVKc2IySXVkSGx3WlNsY2JpQWdJQ0FnSUNBZ2ZTQmxiSE5sSUdsbUlDaHpkWEJ3YjNKMExuTmxZWEpqYUZCaGNtRnRjeUFtSmlCVlVreFRaV0Z5WTJoUVlYSmhiWE11Y0hKdmRHOTBlWEJsTG1selVISnZkRzkwZVhCbFQyWW9ZbTlrZVNrcElIdGNiaUFnSUNBZ0lDQWdJQ0IwYUdsekxtaGxZV1JsY25NdWMyVjBLQ2RqYjI1MFpXNTBMWFI1Y0dVbkxDQW5ZWEJ3YkdsallYUnBiMjR2ZUMxM2QzY3RabTl5YlMxMWNteGxibU52WkdWa08yTm9ZWEp6WlhROVZWUkdMVGduS1Z4dUlDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNCOVhHNGdJQ0FnZlZ4dVhHNGdJQ0FnYVdZZ0tITjFjSEJ2Y25RdVlteHZZaWtnZTF4dUlDQWdJQ0FnZEdocGN5NWliRzlpSUQwZ1puVnVZM1JwYjI0b0tTQjdYRzRnSUNBZ0lDQWdJSFpoY2lCeVpXcGxZM1JsWkNBOUlHTnZibk4xYldWa0tIUm9hWE1wWEc0Z0lDQWdJQ0FnSUdsbUlDaHlaV3BsWTNSbFpDa2dlMXh1SUNBZ0lDQWdJQ0FnSUhKbGRIVnliaUJ5WldwbFkzUmxaRnh1SUNBZ0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUNBZ2FXWWdLSFJvYVhNdVgySnZaSGxDYkc5aUtTQjdYRzRnSUNBZ0lDQWdJQ0FnY21WMGRYSnVJRkJ5YjIxcGMyVXVjbVZ6YjJ4MlpTaDBhR2x6TGw5aWIyUjVRbXh2WWlsY2JpQWdJQ0FnSUNBZ2ZTQmxiSE5sSUdsbUlDaDBhR2x6TGw5aWIyUjVRWEp5WVhsQ2RXWm1aWElwSUh0Y2JpQWdJQ0FnSUNBZ0lDQnlaWFIxY200Z1VISnZiV2x6WlM1eVpYTnZiSFpsS0c1bGR5QkNiRzlpS0Z0MGFHbHpMbDlpYjJSNVFYSnlZWGxDZFdabVpYSmRLU2xjYmlBZ0lDQWdJQ0FnZlNCbGJITmxJR2xtSUNoMGFHbHpMbDlpYjJSNVJtOXliVVJoZEdFcElIdGNiaUFnSUNBZ0lDQWdJQ0IwYUhKdmR5QnVaWGNnUlhKeWIzSW9KMk52ZFd4a0lHNXZkQ0J5WldGa0lFWnZjbTFFWVhSaElHSnZaSGtnWVhNZ1lteHZZaWNwWEc0Z0lDQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUNBZ2NtVjBkWEp1SUZCeWIyMXBjMlV1Y21WemIyeDJaU2h1WlhjZ1FteHZZaWhiZEdocGN5NWZZbTlrZVZSbGVIUmRLU2xjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNCMGFHbHpMbUZ5Y21GNVFuVm1abVZ5SUQwZ1puVnVZM1JwYjI0b0tTQjdYRzRnSUNBZ0lDQWdJR2xtSUNoMGFHbHpMbDlpYjJSNVFYSnlZWGxDZFdabVpYSXBJSHRjYmlBZ0lDQWdJQ0FnSUNCeVpYUjFjbTRnWTI5dWMzVnRaV1FvZEdocGN5a2dmSHdnVUhKdmJXbHpaUzV5WlhOdmJIWmxLSFJvYVhNdVgySnZaSGxCY25KaGVVSjFabVpsY2lsY2JpQWdJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ0lDQnlaWFIxY200Z2RHaHBjeTVpYkc5aUtDa3VkR2hsYmloeVpXRmtRbXh2WWtGelFYSnlZWGxDZFdabVpYSXBYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJSDFjYmlBZ0lDQjlYRzVjYmlBZ0lDQjBhR2x6TG5SbGVIUWdQU0JtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0FnSUhaaGNpQnlaV3BsWTNSbFpDQTlJR052Ym5OMWJXVmtLSFJvYVhNcFhHNGdJQ0FnSUNCcFppQW9jbVZxWldOMFpXUXBJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJSEpsYW1WamRHVmtYRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJR2xtSUNoMGFHbHpMbDlpYjJSNVFteHZZaWtnZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnY21WaFpFSnNiMkpCYzFSbGVIUW9kR2hwY3k1ZlltOWtlVUpzYjJJcFhHNGdJQ0FnSUNCOUlHVnNjMlVnYVdZZ0tIUm9hWE11WDJKdlpIbEJjbkpoZVVKMVptWmxjaWtnZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnVUhKdmJXbHpaUzV5WlhOdmJIWmxLSEpsWVdSQmNuSmhlVUoxWm1abGNrRnpWR1Y0ZENoMGFHbHpMbDlpYjJSNVFYSnlZWGxDZFdabVpYSXBLVnh1SUNBZ0lDQWdmU0JsYkhObElHbG1JQ2gwYUdsekxsOWliMlI1Um05eWJVUmhkR0VwSUh0Y2JpQWdJQ0FnSUNBZ2RHaHliM2NnYm1WM0lFVnljbTl5S0NkamIzVnNaQ0J1YjNRZ2NtVmhaQ0JHYjNKdFJHRjBZU0JpYjJSNUlHRnpJSFJsZUhRbktWeHVJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUZCeWIyMXBjMlV1Y21WemIyeDJaU2gwYUdsekxsOWliMlI1VkdWNGRDbGNiaUFnSUNBZ0lIMWNiaUFnSUNCOVhHNWNiaUFnSUNCcFppQW9jM1Z3Y0c5eWRDNW1iM0p0UkdGMFlTa2dlMXh1SUNBZ0lDQWdkR2hwY3k1bWIzSnRSR0YwWVNBOUlHWjFibU4wYVc5dUtDa2dlMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdkR2hwY3k1MFpYaDBLQ2t1ZEdobGJpaGtaV052WkdVcFhHNGdJQ0FnSUNCOVhHNGdJQ0FnZlZ4dVhHNGdJQ0FnZEdocGN5NXFjMjl1SUQwZ1puVnVZM1JwYjI0b0tTQjdYRzRnSUNBZ0lDQnlaWFIxY200Z2RHaHBjeTUwWlhoMEtDa3VkR2hsYmloS1UwOU9MbkJoY25ObEtWeHVJQ0FnSUgxY2JseHVJQ0FnSUhKbGRIVnliaUIwYUdselhHNGdJSDFjYmx4dUlDQXZMeUJJVkZSUUlHMWxkR2h2WkhNZ2QyaHZjMlVnWTJGd2FYUmhiR2w2WVhScGIyNGdjMmh2ZFd4a0lHSmxJRzV2Y20xaGJHbDZaV1JjYmlBZ2RtRnlJRzFsZEdodlpITWdQU0JiSjBSRlRFVlVSU2NzSUNkSFJWUW5MQ0FuU0VWQlJDY3NJQ2RQVUZSSlQwNVRKeXdnSjFCUFUxUW5MQ0FuVUZWVUoxMWNibHh1SUNCbWRXNWpkR2x2YmlCdWIzSnRZV3hwZW1WTlpYUm9iMlFvYldWMGFHOWtLU0I3WEc0Z0lDQWdkbUZ5SUhWd1kyRnpaV1FnUFNCdFpYUm9iMlF1ZEc5VmNIQmxja05oYzJVb0tWeHVJQ0FnSUhKbGRIVnliaUFvYldWMGFHOWtjeTVwYm1SbGVFOW1LSFZ3WTJGelpXUXBJRDRnTFRFcElEOGdkWEJqWVhObFpDQTZJRzFsZEdodlpGeHVJQ0I5WEc1Y2JpQWdablZ1WTNScGIyNGdVbVZ4ZFdWemRDaHBibkIxZEN3Z2IzQjBhVzl1Y3lrZ2UxeHVJQ0FnSUc5d2RHbHZibk1nUFNCdmNIUnBiMjV6SUh4OElIdDlYRzRnSUNBZ2RtRnlJR0p2WkhrZ1BTQnZjSFJwYjI1ekxtSnZaSGxjYmx4dUlDQWdJR2xtSUNocGJuQjFkQ0JwYm5OMFlXNWpaVzltSUZKbGNYVmxjM1FwSUh0Y2JpQWdJQ0FnSUdsbUlDaHBibkIxZEM1aWIyUjVWWE5sWkNrZ2UxeHVJQ0FnSUNBZ0lDQjBhSEp2ZHlCdVpYY2dWSGx3WlVWeWNtOXlLQ2RCYkhKbFlXUjVJSEpsWVdRbktWeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ2RHaHBjeTUxY213Z1BTQnBibkIxZEM1MWNteGNiaUFnSUNBZ0lIUm9hWE11WTNKbFpHVnVkR2xoYkhNZ1BTQnBibkIxZEM1amNtVmtaVzUwYVdGc2MxeHVJQ0FnSUNBZ2FXWWdLQ0Z2Y0hScGIyNXpMbWhsWVdSbGNuTXBJSHRjYmlBZ0lDQWdJQ0FnZEdocGN5NW9aV0ZrWlhKeklEMGdibVYzSUVobFlXUmxjbk1vYVc1d2RYUXVhR1ZoWkdWeWN5bGNiaUFnSUNBZ0lIMWNiaUFnSUNBZ0lIUm9hWE11YldWMGFHOWtJRDBnYVc1d2RYUXViV1YwYUc5a1hHNGdJQ0FnSUNCMGFHbHpMbTF2WkdVZ1BTQnBibkIxZEM1dGIyUmxYRzRnSUNBZ0lDQnBaaUFvSVdKdlpIa2dKaVlnYVc1d2RYUXVYMkp2WkhsSmJtbDBJQ0U5SUc1MWJHd3BJSHRjYmlBZ0lDQWdJQ0FnWW05a2VTQTlJR2x1Y0hWMExsOWliMlI1U1c1cGRGeHVJQ0FnSUNBZ0lDQnBibkIxZEM1aWIyUjVWWE5sWkNBOUlIUnlkV1ZjYmlBZ0lDQWdJSDFjYmlBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ2RHaHBjeTUxY213Z1BTQlRkSEpwYm1jb2FXNXdkWFFwWEc0Z0lDQWdmVnh1WEc0Z0lDQWdkR2hwY3k1amNtVmtaVzUwYVdGc2N5QTlJRzl3ZEdsdmJuTXVZM0psWkdWdWRHbGhiSE1nZkh3Z2RHaHBjeTVqY21Wa1pXNTBhV0ZzY3lCOGZDQW5iMjFwZENkY2JpQWdJQ0JwWmlBb2IzQjBhVzl1Y3k1b1pXRmtaWEp6SUh4OElDRjBhR2x6TG1obFlXUmxjbk1wSUh0Y2JpQWdJQ0FnSUhSb2FYTXVhR1ZoWkdWeWN5QTlJRzVsZHlCSVpXRmtaWEp6S0c5d2RHbHZibk11YUdWaFpHVnljeWxjYmlBZ0lDQjlYRzRnSUNBZ2RHaHBjeTV0WlhSb2IyUWdQU0J1YjNKdFlXeHBlbVZOWlhSb2IyUW9iM0IwYVc5dWN5NXRaWFJvYjJRZ2ZId2dkR2hwY3k1dFpYUm9iMlFnZkh3Z0owZEZWQ2NwWEc0Z0lDQWdkR2hwY3k1dGIyUmxJRDBnYjNCMGFXOXVjeTV0YjJSbElIeDhJSFJvYVhNdWJXOWtaU0I4ZkNCdWRXeHNYRzRnSUNBZ2RHaHBjeTV5WldabGNuSmxjaUE5SUc1MWJHeGNibHh1SUNBZ0lHbG1JQ2dvZEdocGN5NXRaWFJvYjJRZ1BUMDlJQ2RIUlZRbklIeDhJSFJvYVhNdWJXVjBhRzlrSUQwOVBTQW5TRVZCUkNjcElDWW1JR0p2WkhrcElIdGNiaUFnSUNBZ0lIUm9jbTkzSUc1bGR5QlVlWEJsUlhKeWIzSW9KMEp2WkhrZ2JtOTBJR0ZzYkc5M1pXUWdabTl5SUVkRlZDQnZjaUJJUlVGRUlISmxjWFZsYzNSekp5bGNiaUFnSUNCOVhHNGdJQ0FnZEdocGN5NWZhVzVwZEVKdlpIa29ZbTlrZVNsY2JpQWdmVnh1WEc0Z0lGSmxjWFZsYzNRdWNISnZkRzkwZVhCbExtTnNiMjVsSUQwZ1puVnVZM1JwYjI0b0tTQjdYRzRnSUNBZ2NtVjBkWEp1SUc1bGR5QlNaWEYxWlhOMEtIUm9hWE1zSUhzZ1ltOWtlVG9nZEdocGN5NWZZbTlrZVVsdWFYUWdmU2xjYmlBZ2ZWeHVYRzRnSUdaMWJtTjBhVzl1SUdSbFkyOWtaU2hpYjJSNUtTQjdYRzRnSUNBZ2RtRnlJR1p2Y20wZ1BTQnVaWGNnUm05eWJVUmhkR0VvS1Z4dUlDQWdJR0p2WkhrdWRISnBiU2dwTG5Od2JHbDBLQ2NtSnlrdVptOXlSV0ZqYUNobWRXNWpkR2x2YmloaWVYUmxjeWtnZTF4dUlDQWdJQ0FnYVdZZ0tHSjVkR1Z6S1NCN1hHNGdJQ0FnSUNBZ0lIWmhjaUJ6Y0d4cGRDQTlJR0o1ZEdWekxuTndiR2wwS0NjOUp5bGNiaUFnSUNBZ0lDQWdkbUZ5SUc1aGJXVWdQU0J6Y0d4cGRDNXphR2xtZENncExuSmxjR3hoWTJVb0wxeGNLeTluTENBbklDY3BYRzRnSUNBZ0lDQWdJSFpoY2lCMllXeDFaU0E5SUhOd2JHbDBMbXB2YVc0b0p6MG5LUzV5WlhCc1lXTmxLQzljWENzdlp5d2dKeUFuS1Z4dUlDQWdJQ0FnSUNCbWIzSnRMbUZ3Y0dWdVpDaGtaV052WkdWVlVrbERiMjF3YjI1bGJuUW9ibUZ0WlNrc0lHUmxZMjlrWlZWU1NVTnZiWEJ2Ym1WdWRDaDJZV3gxWlNrcFhHNGdJQ0FnSUNCOVhHNGdJQ0FnZlNsY2JpQWdJQ0J5WlhSMWNtNGdabTl5YlZ4dUlDQjlYRzVjYmlBZ1puVnVZM1JwYjI0Z2NHRnljMlZJWldGa1pYSnpLSEpoZDBobFlXUmxjbk1wSUh0Y2JpQWdJQ0IyWVhJZ2FHVmhaR1Z5Y3lBOUlHNWxkeUJJWldGa1pYSnpLQ2xjYmlBZ0lDQXZMeUJTWlhCc1lXTmxJR2x1YzNSaGJtTmxjeUJ2WmlCY1hISmNYRzRnWVc1a0lGeGNiaUJtYjJ4c2IzZGxaQ0JpZVNCaGRDQnNaV0Z6ZENCdmJtVWdjM0JoWTJVZ2IzSWdhRzl5YVhwdmJuUmhiQ0IwWVdJZ2QybDBhQ0JoSUhOd1lXTmxYRzRnSUNBZ0x5OGdhSFIwY0hNNkx5OTBiMjlzY3k1cFpYUm1MbTl5Wnk5b2RHMXNMM0ptWXpjeU16QWpjMlZqZEdsdmJpMHpMakpjYmlBZ0lDQjJZWElnY0hKbFVISnZZMlZ6YzJWa1NHVmhaR1Z5Y3lBOUlISmhkMGhsWVdSbGNuTXVjbVZ3YkdGalpTZ3ZYRnh5UDF4Y2JsdGNYSFFnWFNzdlp5d2dKeUFuS1Z4dUlDQWdJSEJ5WlZCeWIyTmxjM05sWkVobFlXUmxjbk11YzNCc2FYUW9MMXhjY2o5Y1hHNHZLUzVtYjNKRllXTm9LR1oxYm1OMGFXOXVLR3hwYm1VcElIdGNiaUFnSUNBZ0lIWmhjaUJ3WVhKMGN5QTlJR3hwYm1VdWMzQnNhWFFvSnpvbktWeHVJQ0FnSUNBZ2RtRnlJR3RsZVNBOUlIQmhjblJ6TG5Ob2FXWjBLQ2t1ZEhKcGJTZ3BYRzRnSUNBZ0lDQnBaaUFvYTJWNUtTQjdYRzRnSUNBZ0lDQWdJSFpoY2lCMllXeDFaU0E5SUhCaGNuUnpMbXB2YVc0b0p6b25LUzUwY21sdEtDbGNiaUFnSUNBZ0lDQWdhR1ZoWkdWeWN5NWhjSEJsYm1Rb2EyVjVMQ0IyWVd4MVpTbGNiaUFnSUNBZ0lIMWNiaUFnSUNCOUtWeHVJQ0FnSUhKbGRIVnliaUJvWldGa1pYSnpYRzRnSUgxY2JseHVJQ0JDYjJSNUxtTmhiR3dvVW1WeGRXVnpkQzV3Y205MGIzUjVjR1VwWEc1Y2JpQWdablZ1WTNScGIyNGdVbVZ6Y0c5dWMyVW9ZbTlrZVVsdWFYUXNJRzl3ZEdsdmJuTXBJSHRjYmlBZ0lDQnBaaUFvSVc5d2RHbHZibk1wSUh0Y2JpQWdJQ0FnSUc5d2RHbHZibk1nUFNCN2ZWeHVJQ0FnSUgxY2JseHVJQ0FnSUhSb2FYTXVkSGx3WlNBOUlDZGtaV1poZFd4MEoxeHVJQ0FnSUhSb2FYTXVjM1JoZEhWeklEMGdiM0IwYVc5dWN5NXpkR0YwZFhNZ1BUMDlJSFZ1WkdWbWFXNWxaQ0EvSURJd01DQTZJRzl3ZEdsdmJuTXVjM1JoZEhWelhHNGdJQ0FnZEdocGN5NXZheUE5SUhSb2FYTXVjM1JoZEhWeklENDlJREl3TUNBbUppQjBhR2x6TG5OMFlYUjFjeUE4SURNd01GeHVJQ0FnSUhSb2FYTXVjM1JoZEhWelZHVjRkQ0E5SUNkemRHRjBkWE5VWlhoMEp5QnBiaUJ2Y0hScGIyNXpJRDhnYjNCMGFXOXVjeTV6ZEdGMGRYTlVaWGgwSURvZ0owOUxKMXh1SUNBZ0lIUm9hWE11YUdWaFpHVnljeUE5SUc1bGR5QklaV0ZrWlhKektHOXdkR2x2Ym5NdWFHVmhaR1Z5Y3lsY2JpQWdJQ0IwYUdsekxuVnliQ0E5SUc5d2RHbHZibk11ZFhKc0lIeDhJQ2NuWEc0Z0lDQWdkR2hwY3k1ZmFXNXBkRUp2Wkhrb1ltOWtlVWx1YVhRcFhHNGdJSDFjYmx4dUlDQkNiMlI1TG1OaGJHd29VbVZ6Y0c5dWMyVXVjSEp2ZEc5MGVYQmxLVnh1WEc0Z0lGSmxjM0J2Ym5ObExuQnliM1J2ZEhsd1pTNWpiRzl1WlNBOUlHWjFibU4wYVc5dUtDa2dlMXh1SUNBZ0lISmxkSFZ5YmlCdVpYY2dVbVZ6Y0c5dWMyVW9kR2hwY3k1ZlltOWtlVWx1YVhRc0lIdGNiaUFnSUNBZ0lITjBZWFIxY3pvZ2RHaHBjeTV6ZEdGMGRYTXNYRzRnSUNBZ0lDQnpkR0YwZFhOVVpYaDBPaUIwYUdsekxuTjBZWFIxYzFSbGVIUXNYRzRnSUNBZ0lDQm9aV0ZrWlhKek9pQnVaWGNnU0dWaFpHVnljeWgwYUdsekxtaGxZV1JsY25NcExGeHVJQ0FnSUNBZ2RYSnNPaUIwYUdsekxuVnliRnh1SUNBZ0lIMHBYRzRnSUgxY2JseHVJQ0JTWlhOd2IyNXpaUzVsY25KdmNpQTlJR1oxYm1OMGFXOXVLQ2tnZTF4dUlDQWdJSFpoY2lCeVpYTndiMjV6WlNBOUlHNWxkeUJTWlhOd2IyNXpaU2h1ZFd4c0xDQjdjM1JoZEhWek9pQXdMQ0J6ZEdGMGRYTlVaWGgwT2lBbkozMHBYRzRnSUNBZ2NtVnpjRzl1YzJVdWRIbHdaU0E5SUNkbGNuSnZjaWRjYmlBZ0lDQnlaWFIxY200Z2NtVnpjRzl1YzJWY2JpQWdmVnh1WEc0Z0lIWmhjaUJ5WldScGNtVmpkRk4wWVhSMWMyVnpJRDBnV3pNd01Td2dNekF5TENBek1ETXNJRE13Tnl3Z016QTRYVnh1WEc0Z0lGSmxjM0J2Ym5ObExuSmxaR2x5WldOMElEMGdablZ1WTNScGIyNG9kWEpzTENCemRHRjBkWE1wSUh0Y2JpQWdJQ0JwWmlBb2NtVmthWEpsWTNSVGRHRjBkWE5sY3k1cGJtUmxlRTltS0hOMFlYUjFjeWtnUFQwOUlDMHhLU0I3WEc0Z0lDQWdJQ0IwYUhKdmR5QnVaWGNnVW1GdVoyVkZjbkp2Y2lnblNXNTJZV3hwWkNCemRHRjBkWE1nWTI5a1pTY3BYRzRnSUNBZ2ZWeHVYRzRnSUNBZ2NtVjBkWEp1SUc1bGR5QlNaWE53YjI1elpTaHVkV3hzTENCN2MzUmhkSFZ6T2lCemRHRjBkWE1zSUdobFlXUmxjbk02SUh0c2IyTmhkR2x2YmpvZ2RYSnNmWDBwWEc0Z0lIMWNibHh1SUNCelpXeG1Ma2hsWVdSbGNuTWdQU0JJWldGa1pYSnpYRzRnSUhObGJHWXVVbVZ4ZFdWemRDQTlJRkpsY1hWbGMzUmNiaUFnYzJWc1ppNVNaWE53YjI1elpTQTlJRkpsYzNCdmJuTmxYRzVjYmlBZ2MyVnNaaTVtWlhSamFDQTlJR1oxYm1OMGFXOXVLR2x1Y0hWMExDQnBibWwwS1NCN1hHNGdJQ0FnY21WMGRYSnVJRzVsZHlCUWNtOXRhWE5sS0daMWJtTjBhVzl1S0hKbGMyOXNkbVVzSUhKbGFtVmpkQ2tnZTF4dUlDQWdJQ0FnZG1GeUlISmxjWFZsYzNRZ1BTQnVaWGNnVW1WeGRXVnpkQ2hwYm5CMWRDd2dhVzVwZENsY2JpQWdJQ0FnSUhaaGNpQjRhSElnUFNCdVpYY2dXRTFNU0hSMGNGSmxjWFZsYzNRb0tWeHVYRzRnSUNBZ0lDQjRhSEl1YjI1c2IyRmtJRDBnWm5WdVkzUnBiMjRvS1NCN1hHNGdJQ0FnSUNBZ0lIWmhjaUJ2Y0hScGIyNXpJRDBnZTF4dUlDQWdJQ0FnSUNBZ0lITjBZWFIxY3pvZ2VHaHlMbk4wWVhSMWN5eGNiaUFnSUNBZ0lDQWdJQ0J6ZEdGMGRYTlVaWGgwT2lCNGFISXVjM1JoZEhWelZHVjRkQ3hjYmlBZ0lDQWdJQ0FnSUNCb1pXRmtaWEp6T2lCd1lYSnpaVWhsWVdSbGNuTW9lR2h5TG1kbGRFRnNiRkpsYzNCdmJuTmxTR1ZoWkdWeWN5Z3BJSHg4SUNjbktWeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJRzl3ZEdsdmJuTXVkWEpzSUQwZ0ozSmxjM0J2Ym5ObFZWSk1KeUJwYmlCNGFISWdQeUI0YUhJdWNtVnpjRzl1YzJWVlVrd2dPaUJ2Y0hScGIyNXpMbWhsWVdSbGNuTXVaMlYwS0NkWUxWSmxjWFZsYzNRdFZWSk1KeWxjYmlBZ0lDQWdJQ0FnZG1GeUlHSnZaSGtnUFNBbmNtVnpjRzl1YzJVbklHbHVJSGhvY2lBL0lIaG9jaTV5WlhOd2IyNXpaU0E2SUhob2NpNXlaWE53YjI1elpWUmxlSFJjYmlBZ0lDQWdJQ0FnY21WemIyeDJaU2h1WlhjZ1VtVnpjRzl1YzJVb1ltOWtlU3dnYjNCMGFXOXVjeWtwWEc0Z0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUhob2NpNXZibVZ5Y205eUlEMGdablZ1WTNScGIyNG9LU0I3WEc0Z0lDQWdJQ0FnSUhKbGFtVmpkQ2h1WlhjZ1ZIbHdaVVZ5Y205eUtDZE9aWFIzYjNKcklISmxjWFZsYzNRZ1ptRnBiR1ZrSnlrcFhHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lIaG9jaTV2Ym5ScGJXVnZkWFFnUFNCbWRXNWpkR2x2YmlncElIdGNiaUFnSUNBZ0lDQWdjbVZxWldOMEtHNWxkeUJVZVhCbFJYSnliM0lvSjA1bGRIZHZjbXNnY21WeGRXVnpkQ0JtWVdsc1pXUW5LU2xjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnZUdoeUxtOXdaVzRvY21WeGRXVnpkQzV0WlhSb2IyUXNJSEpsY1hWbGMzUXVkWEpzTENCMGNuVmxLVnh1WEc0Z0lDQWdJQ0JwWmlBb2NtVnhkV1Z6ZEM1amNtVmtaVzUwYVdGc2N5QTlQVDBnSjJsdVkyeDFaR1VuS1NCN1hHNGdJQ0FnSUNBZ0lIaG9jaTUzYVhSb1EzSmxaR1Z1ZEdsaGJITWdQU0IwY25WbFhHNGdJQ0FnSUNCOUlHVnNjMlVnYVdZZ0tISmxjWFZsYzNRdVkzSmxaR1Z1ZEdsaGJITWdQVDA5SUNkdmJXbDBKeWtnZTF4dUlDQWdJQ0FnSUNCNGFISXVkMmwwYUVOeVpXUmxiblJwWVd4eklEMGdabUZzYzJWY2JpQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ2FXWWdLQ2R5WlhOd2IyNXpaVlI1Y0dVbklHbHVJSGhvY2lBbUppQnpkWEJ3YjNKMExtSnNiMklwSUh0Y2JpQWdJQ0FnSUNBZ2VHaHlMbkpsYzNCdmJuTmxWSGx3WlNBOUlDZGliRzlpSjF4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNCeVpYRjFaWE4wTG1obFlXUmxjbk11Wm05eVJXRmphQ2htZFc1amRHbHZiaWgyWVd4MVpTd2dibUZ0WlNrZ2UxeHVJQ0FnSUNBZ0lDQjRhSEl1YzJWMFVtVnhkV1Z6ZEVobFlXUmxjaWh1WVcxbExDQjJZV3gxWlNsY2JpQWdJQ0FnSUgwcFhHNWNiaUFnSUNBZ0lIaG9jaTV6Wlc1a0tIUjVjR1Z2WmlCeVpYRjFaWE4wTGw5aWIyUjVTVzVwZENBOVBUMGdKM1Z1WkdWbWFXNWxaQ2NnUHlCdWRXeHNJRG9nY21WeGRXVnpkQzVmWW05a2VVbHVhWFFwWEc0Z0lDQWdmU2xjYmlBZ2ZWeHVJQ0J6Wld4bUxtWmxkR05vTG5CdmJIbG1hV3hzSUQwZ2RISjFaVnh1ZlNrb2RIbHdaVzltSUhObGJHWWdJVDA5SUNkMWJtUmxabWx1WldRbklEOGdjMlZzWmlBNklIUm9hWE1wTzF4dUlpd2lZMjl1YzNRZ1lYSjBhV05zWlZSbGJYQnNZWFJsSUQwZ1lGeHVYSFE4WVhKMGFXTnNaU0JqYkdGemN6MWNJbUZ5ZEdsamJHVmZYMjkxZEdWeVhDSStYRzVjZEZ4MFBHUnBkaUJqYkdGemN6MWNJbUZ5ZEdsamJHVmZYMmx1Ym1WeVhDSStYRzVjZEZ4MFhIUThaR2wySUdOc1lYTnpQVndpWVhKMGFXTnNaVjlmYUdWaFpHbHVaMXdpUGx4dVhIUmNkRngwWEhROFlTQmpiR0Z6Y3oxY0ltcHpMV1Z1ZEhKNUxYUnBkR3hsWENJK1BDOWhQbHh1WEhSY2RGeDBYSFE4YURJZ1kyeGhjM005WENKaGNuUnBZMnhsTFdobFlXUnBibWRmWDNScGRHeGxYQ0krUEM5b01qNWNibHgwWEhSY2RGeDBQR1JwZGlCamJHRnpjejFjSW1GeWRHbGpiR1V0YUdWaFpHbHVaMTlmYm1GdFpWd2lQbHh1WEhSY2RGeDBYSFJjZER4emNHRnVJR05zWVhOelBWd2lZWEowYVdOc1pTMW9aV0ZrYVc1blgxOXVZVzFsTFMxbWFYSnpkRndpUGp3dmMzQmhiajVjYmx4MFhIUmNkRngwWEhROFlTQmpiR0Z6Y3oxY0ltcHpMV1Z1ZEhKNUxXRnlkR2x6ZEZ3aVBqd3ZZVDVjYmx4MFhIUmNkRngwWEhROGMzQmhiaUJqYkdGemN6MWNJbUZ5ZEdsamJHVXRhR1ZoWkdsdVoxOWZibUZ0WlMwdGJHRnpkRndpUGp3dmMzQmhiajVjYmx4MFhIUmNkRngwUEM5a2FYWStYRzVjZEZ4MFhIUThMMlJwZGo1Y2RGeHVYSFJjZEZ4MFBHUnBkaUJqYkdGemN6MWNJbUZ5ZEdsamJHVmZYMmx0WVdkbGN5MXZkWFJsY2x3aVBseHVYSFJjZEZ4MFhIUThaR2wySUdOc1lYTnpQVndpWVhKMGFXTnNaVjlmYVcxaFoyVnpMV2x1Ym1WeVhDSStQQzlrYVhZK1hHNWNkRngwWEhSY2REeHdJR05zWVhOelBWd2lhbk10WVhKMGFXTnNaUzFoYm1Ob2IzSXRkR0Z5WjJWMFhDSStQQzl3UGx4dVhIUmNkRHd2WkdsMlBseHVYSFE4TDJGeWRHbGpiR1UrWEc1Z08xeHVYRzVsZUhCdmNuUWdaR1ZtWVhWc2RDQmhjblJwWTJ4bFZHVnRjR3hoZEdVN0lpd2lhVzF3YjNKMElDZDNhR0YwZDJjdFptVjBZMmduTzF4dWFXMXdiM0owSUc1aGRreG5JR1p5YjIwZ0p5NHZibUYyTFd4bkp6dGNibWx0Y0c5eWRDQmhjblJwWTJ4bFZHVnRjR3hoZEdVZ1puSnZiU0FuTGk5aGNuUnBZMnhsTFhSbGJYQnNZWFJsSnp0Y2JseHVZMjl1YzNRZ1JFSWdQU0FuYUhSMGNITTZMeTl1WlhoMWN5MWpZWFJoYkc5bkxtWnBjbVZpWVhObGFXOHVZMjl0TDNCdmMzUnpMbXB6YjI0L1lYVjBhRDAzWnpkd2VVdExlV3RPTTA0MVpYZHlTVzFvVDJGVE5uWjNja1p6WXpWbVMydHlhemhsYW5wbUp6dGNibU52Ym5OMElHRnNjR2hoWW1WMElEMGdXeWRoSnl3Z0oySW5MQ0FuWXljc0lDZGtKeXdnSjJVbkxDQW5aaWNzSUNkbkp5d2dKMmduTENBbmFTY3NJQ2RxSnl3Z0oyc25MQ0FuYkNjc0lDZHRKeXdnSjI0bkxDQW5ieWNzSUNkd0p5d2dKM0luTENBbmN5Y3NJQ2QwSnl3Z0ozVW5MQ0FuZGljc0lDZDNKeXdnSjNrbkxDQW5laWRkTzF4dVhHNWpiMjV6ZENBa2JHOWhaR2x1WnlBOUlFRnljbUY1TG1aeWIyMG9aRzlqZFcxbGJuUXVjWFZsY25sVFpXeGxZM1J2Y2tGc2JDZ25MbXh2WVdScGJtY25LU2s3WEc1amIyNXpkQ0FrYm1GMklEMGdaRzlqZFcxbGJuUXVaMlYwUld4bGJXVnVkRUo1U1dRb0oycHpMVzVoZGljcE8xeHVZMjl1YzNRZ0pIQmhjbUZzYkdGNElEMGdaRzlqZFcxbGJuUXVjWFZsY25sVFpXeGxZM1J2Y2lnbkxuQmhjbUZzYkdGNEp5azdYRzVqYjI1emRDQWtZMjl1ZEdWdWRDQTlJR1J2WTNWdFpXNTBMbkYxWlhKNVUyVnNaV04wYjNJb0p5NWpiMjUwWlc1MEp5azdYRzVqYjI1emRDQWtkR2wwYkdVZ1BTQmtiMk4xYldWdWRDNW5aWFJGYkdWdFpXNTBRbmxKWkNnbmFuTXRkR2wwYkdVbktUdGNibU52Ym5OMElDUmhjbkp2ZHlBOUlHUnZZM1Z0Wlc1MExuRjFaWEo1VTJWc1pXTjBiM0lvSnk1aGNuSnZkeWNwTzF4dVkyOXVjM1FnSkcxdlpHRnNJRDBnWkc5amRXMWxiblF1Y1hWbGNubFRaV3hsWTNSdmNpZ25MbTF2WkdGc0p5azdYRzVqYjI1emRDQWtiR2xuYUhSaWIzZ2dQU0JrYjJOMWJXVnVkQzV4ZFdWeWVWTmxiR1ZqZEc5eUtDY3ViR2xuYUhSaWIzZ25LVHRjYm1OdmJuTjBJQ1IyYVdWM0lEMGdaRzlqZFcxbGJuUXVjWFZsY25sVFpXeGxZM1J2Y2lnbkxteHBaMmgwWW05NExYWnBaWGNuS1R0Y2JseHViR1YwSUhOdmNuUkxaWGtnUFNBd095QXZMeUF3SUQwZ1lYSjBhWE4wTENBeElEMGdkR2wwYkdWY2JteGxkQ0JsYm5SeWFXVnpJRDBnZXlCaWVVRjFkR2h2Y2pvZ1cxMHNJR0o1VkdsMGJHVTZJRnRkSUgwN1hHNXNaWFFnWTNWeWNtVnVkRXhsZEhSbGNpQTlJQ2RCSnp0Y2JseHViR1YwSUd4cFoyaDBZbTk0SUQwZ1ptRnNjMlU3WEc1c1pYUWdlRElnUFNCbVlXeHpaVHRjYm1OdmJuTjBJR0YwZEdGamFFbHRZV2RsVEdsemRHVnVaWEp6SUQwZ0tDa2dQVDRnZTF4dVhIUnNaWFFnSkdsdFlXZGxjeUE5SUVGeWNtRjVMbVp5YjIwb1pHOWpkVzFsYm5RdWNYVmxjbmxUWld4bFkzUnZja0ZzYkNnbkxtRnlkR2xqYkdVdGFXMWhaMlVuS1NrN1hHNWNibHgwSkdsdFlXZGxjeTVtYjNKRllXTm9LR2x0WnlBOVBpQjdYRzVjZEZ4MGFXMW5MbUZrWkVWMlpXNTBUR2x6ZEdWdVpYSW9KMk5zYVdOckp5d2dLR1YyZENrZ1BUNGdlMXh1WEhSY2RGeDBhV1lnS0NGc2FXZG9kR0p2ZUNrZ2UxeHVYSFJjZEZ4MFhIUnNaWFFnYzNKaklEMGdhVzFuTG5OeVl6dGNibHgwWEhSY2RGeDBMeThnYkdWMElIUjVjR1VnUFNCcGJXY3VkMmxrZEdnZ1BqMGdhVzFuTG1obGFXZG9kQ0EvSUNkc0p5QTZJQ2R3Snp0Y2JseDBYSFJjZEZ4MFhHNWNkRngwWEhSY2RDUnNhV2RvZEdKdmVDNWpiR0Z6YzB4cGMzUXVZV1JrS0NkemFHOTNMV2x0WnljcE8xeHVYSFJjZEZ4MFhIUWtkbWxsZHk1elpYUkJkSFJ5YVdKMWRHVW9KM04wZVd4bEp5d2dZR0poWTJ0bmNtOTFibVF0YVcxaFoyVTZJSFZ5YkNna2UzTnlZMzBwWUNrN1hHNWNkRngwWEhSY2RHeHBaMmgwWW05NElEMGdkSEoxWlR0Y2JseDBYSFJjZEgxY2JseDBYSFI5S1R0Y2JseDBmU2s3WEc1Y2JseDBKSFpwWlhjdVlXUmtSWFpsYm5STWFYTjBaVzVsY2lnblkyeHBZMnNuTENBb0tTQTlQaUI3WEc1Y2RGeDBhV1lnS0d4cFoyaDBZbTk0S1NCN1hHNWNkRngwWEhRa2JHbG5hSFJpYjNndVkyeGhjM05NYVhOMExuSmxiVzkyWlNnbmMyaHZkeTFwYldjbktUdGNibHgwWEhSY2RDUnNhV2RvZEdKdmVDNW1hWEp6ZEVWc1pXMWxiblJEYUdsc1pDNWpiR0Z6YzB4cGMzUXVjbVZ0YjNabEtDZDJhV1YzTFhneUp5azdYRzVjZEZ4MFhIUnNhV2RvZEdKdmVDQTlJR1poYkhObE8xeHVYSFJjZEgxY2JseDBmU2s3WEc1OU8xeHVYRzVzWlhRZ2JXOWtZV3dnUFNCbVlXeHpaVHRjYm1OdmJuTjBJR0YwZEdGamFFMXZaR0ZzVEdsemRHVnVaWEp6SUQwZ0tDa2dQVDRnZTF4dVhIUmpiMjV6ZENBa1ptbHVaQ0E5SUdSdlkzVnRaVzUwTG1kbGRFVnNaVzFsYm5SQ2VVbGtLQ2RxY3kxbWFXNWtKeWs3WEc1Y2RGeHVYSFFrWm1sdVpDNWhaR1JGZG1WdWRFeHBjM1JsYm1WeUtDZGpiR2xqYXljc0lDZ3BJRDArSUh0Y2JseDBYSFFrYlc5a1lXd3VZMnhoYzNOTWFYTjBMbUZrWkNnbmMyaHZkeWNwTzF4dVhIUmNkRzF2WkdGc0lEMGdkSEoxWlR0Y2JseDBmU2s3WEc1Y2JseDBKRzF2WkdGc0xtRmtaRVYyWlc1MFRHbHpkR1Z1WlhJb0oyTnNhV05ySnl3Z0tDa2dQVDRnZTF4dVhIUmNkSE5sZEZScGJXVnZkWFFvS0NrZ1BUNGdlMXh1WEhSY2RGeDBKRzF2WkdGc0xtTnNZWE56VEdsemRDNXlaVzF2ZG1Vb0ozTm9iM2NuS1R0Y2JseDBYSFJjZEcxdlpHRnNJRDBnWm1Gc2MyVTdYRzVjZEZ4MGZTd2dOVEF3S1R0Y2JseDBmU2s3WEc1Y2JseDBkMmx1Wkc5M0xtRmtaRVYyWlc1MFRHbHpkR1Z1WlhJb0oydGxlV1J2ZDI0bkxDQW9LU0E5UGlCN1hHNWNkRngwYVdZZ0tHMXZaR0ZzS1NCN1hHNWNkRngwWEhSelpYUlVhVzFsYjNWMEtDZ3BJRDArSUh0Y2JseDBYSFJjZEZ4MEpHMXZaR0ZzTG1Oc1lYTnpUR2x6ZEM1eVpXMXZkbVVvSjNOb2IzY25LVHRjYmx4MFhIUmNkRngwYlc5a1lXd2dQU0JtWVd4elpUdGNibHgwWEhSY2RIMHNJRFl3TUNrN1hHNWNkRngwZlR0Y2JseDBmU2s3WEc1OVhHNWNibU52Ym5OMElITmpjbTlzYkZSdlZHOXdJRDBnS0NrZ1BUNGdlMXh1WEhSc1pYUWdkR2hwYm1jZ1BTQmtiMk4xYldWdWRDNW5aWFJGYkdWdFpXNTBRbmxKWkNnbllXNWphRzl5TFhSaGNtZGxkQ2NwTzF4dVhIUjBhR2x1Wnk1elkzSnZiR3hKYm5SdlZtbGxkeWg3WW1Wb1lYWnBiM0k2SUZ3aWMyMXZiM1JvWENJc0lHSnNiMk5yT2lCY0luTjBZWEowWENKOUtUdGNibjFjYmx4dWJHVjBJSEJ5WlhZN1hHNXNaWFFnWTNWeWNtVnVkQ0E5SURBN1hHNXNaWFFnYVhOVGFHOTNhVzVuSUQwZ1ptRnNjMlU3WEc1amIyNXpkQ0JoZEhSaFkyaEJjbkp2ZDB4cGMzUmxibVZ5Y3lBOUlDZ3BJRDArSUh0Y2JseDBKR0Z5Y205M0xtRmtaRVYyWlc1MFRHbHpkR1Z1WlhJb0oyTnNhV05ySnl3Z0tDa2dQVDRnZTF4dVhIUmNkSE5qY205c2JGUnZWRzl3S0NrN1hHNWNkSDBwTzF4dVhHNWNkQ1J3WVhKaGJHeGhlQzVoWkdSRmRtVnVkRXhwYzNSbGJtVnlLQ2R6WTNKdmJHd25MQ0FvS1NBOVBpQjdYRzVjYmx4MFhIUnNaWFFnZVNBOUlDUjBhWFJzWlM1blpYUkNiM1Z1WkdsdVowTnNhV1Z1ZEZKbFkzUW9LUzU1TzF4dVhIUmNkR2xtSUNoamRYSnlaVzUwSUNFOVBTQjVLU0I3WEc1Y2RGeDBYSFJ3Y21WMklEMGdZM1Z5Y21WdWREdGNibHgwWEhSY2RHTjFjbkpsYm5RZ1BTQjVPMXh1WEhSY2RIMWNibHh1WEhSY2RHbG1JQ2g1SUR3OUlDMDFNQ0FtSmlBaGFYTlRhRzkzYVc1bktTQjdYRzVjZEZ4MFhIUWtZWEp5YjNjdVkyeGhjM05NYVhOMExtRmtaQ2duYzJodmR5Y3BPMXh1WEhSY2RGeDBhWE5UYUc5M2FXNW5JRDBnZEhKMVpUdGNibHgwWEhSOUlHVnNjMlVnYVdZZ0tIa2dQaUF0TlRBZ0ppWWdhWE5UYUc5M2FXNW5LU0I3WEc1Y2RGeDBYSFFrWVhKeWIzY3VZMnhoYzNOTWFYTjBMbkpsYlc5MlpTZ25jMmh2ZHljcE8xeHVYSFJjZEZ4MGFYTlRhRzkzYVc1bklEMGdabUZzYzJVN1hHNWNkRngwZlZ4dVhIUjlLVHRjYm4wN1hHNWNibU52Ym5OMElHRmtaRk52Y25SQ2RYUjBiMjVNYVhOMFpXNWxjbk1nUFNBb0tTQTlQaUI3WEc1Y2RHeGxkQ0FrWW5sQmNuUnBjM1FnUFNCa2IyTjFiV1Z1ZEM1blpYUkZiR1Z0Wlc1MFFubEpaQ2duYW5NdFlua3RZWEowYVhOMEp5azdYRzVjZEd4bGRDQWtZbmxVYVhSc1pTQTlJR1J2WTNWdFpXNTBMbWRsZEVWc1pXMWxiblJDZVVsa0tDZHFjeTFpZVMxMGFYUnNaU2NwTzF4dVhIUWtZbmxCY25ScGMzUXVZV1JrUlhabGJuUk1hWE4wWlc1bGNpZ25ZMnhwWTJzbkxDQW9LU0E5UGlCN1hHNWNkRngwYVdZZ0tITnZjblJMWlhrcElIdGNibHgwWEhSY2RITmpjbTlzYkZSdlZHOXdLQ2s3WEc1Y2RGeDBYSFJ6YjNKMFMyVjVJRDBnTUR0Y2JseDBYSFJjZENSaWVVRnlkR2x6ZEM1amJHRnpjMHhwYzNRdVlXUmtLQ2RoWTNScGRtVW5LVHRjYmx4MFhIUmNkQ1JpZVZScGRHeGxMbU5zWVhOelRHbHpkQzV5WlcxdmRtVW9KMkZqZEdsMlpTY3BPMXh1WEc1Y2RGeDBYSFJ5Wlc1a1pYSkZiblJ5YVdWektDazdYRzVjZEZ4MGZWeHVYSFI5S1R0Y2JseHVYSFFrWW5sVWFYUnNaUzVoWkdSRmRtVnVkRXhwYzNSbGJtVnlLQ2RqYkdsamF5Y3NJQ2dwSUQwK0lIdGNibHgwWEhScFppQW9JWE52Y25STFpYa3BJSHRjYmx4MFhIUmNkSE5qY205c2JGUnZWRzl3S0NrN1hHNWNkRngwWEhSemIzSjBTMlY1SUQwZ01UdGNibHgwWEhSY2RDUmllVlJwZEd4bExtTnNZWE56VEdsemRDNWhaR1FvSjJGamRHbDJaU2NwTzF4dVhIUmNkRngwSkdKNVFYSjBhWE4wTG1Oc1lYTnpUR2x6ZEM1eVpXMXZkbVVvSjJGamRHbDJaU2NwTzF4dVhHNWNkRngwWEhSeVpXNWtaWEpGYm5SeWFXVnpLQ2s3WEc1Y2RGeDBmVnh1WEhSOUtUdGNibjA3WEc1Y2JtTnZibk4wSUdOc1pXRnlRVzVqYUc5eWN5QTlJQ2h3Y21WMlUyVnNaV04wYjNJcElEMCtJSHRjYmx4MGJHVjBJQ1JsYm5SeWFXVnpJRDBnUVhKeVlYa3Vabkp2YlNoa2IyTjFiV1Z1ZEM1eGRXVnllVk5sYkdWamRHOXlRV3hzS0hCeVpYWlRaV3hsWTNSdmNpa3BPMXh1WEhRa1pXNTBjbWxsY3k1bWIzSkZZV05vS0dWdWRISjVJRDArSUdWdWRISjVMbkpsYlc5MlpVRjBkSEpwWW5WMFpTZ25ibUZ0WlNjcEtUdGNibjA3WEc1Y2JtTnZibk4wSUdacGJtUkdhWEp6ZEVWdWRISjVJRDBnS0dOb1lYSXBJRDArSUh0Y2JseDBiR1YwSUhObGJHVmpkRzl5SUQwZ2MyOXlkRXRsZVNBL0lDY3Vhbk10Wlc1MGNua3RkR2wwYkdVbklEb2dKeTVxY3kxbGJuUnllUzFoY25ScGMzUW5PMXh1WEhSc1pYUWdjSEpsZGxObGJHVmpkRzl5SUQwZ0lYTnZjblJMWlhrZ1B5QW5MbXB6TFdWdWRISjVMWFJwZEd4bEp5QTZJQ2N1YW5NdFpXNTBjbmt0WVhKMGFYTjBKenRjYmx4MGJHVjBJQ1JsYm5SeWFXVnpJRDBnUVhKeVlYa3Vabkp2YlNoa2IyTjFiV1Z1ZEM1eGRXVnllVk5sYkdWamRHOXlRV3hzS0hObGJHVmpkRzl5S1NrN1hHNWNibHgwWTJ4bFlYSkJibU5vYjNKektIQnlaWFpUWld4bFkzUnZjaWs3WEc1Y2JseDBjbVYwZFhKdUlDUmxiblJ5YVdWekxtWnBibVFvWlc1MGNua2dQVDRnZTF4dVhIUmNkR3hsZENCdWIyUmxJRDBnWlc1MGNua3VibVY0ZEVWc1pXMWxiblJUYVdKc2FXNW5PMXh1WEhSY2RISmxkSFZ5YmlCdWIyUmxMbWx1Ym1WeVNGUk5URnN3WFNBOVBUMGdZMmhoY2lCOGZDQnViMlJsTG1sdWJtVnlTRlJOVEZzd1hTQTlQVDBnWTJoaGNpNTBiMVZ3Y0dWeVEyRnpaU2dwTzF4dVhIUjlLVHRjYm4wN1hHNWNibHh1WTI5dWMzUWdiV0ZyWlVGc2NHaGhZbVYwSUQwZ0tDa2dQVDRnZTF4dVhIUmpiMjV6ZENCaGRIUmhZMmhCYm1Ob2IzSk1hWE4wWlc1bGNpQTlJQ2drWVc1amFHOXlMQ0JzWlhSMFpYSXBJRDArSUh0Y2JseDBYSFFrWVc1amFHOXlMbUZrWkVWMlpXNTBUR2x6ZEdWdVpYSW9KMk5zYVdOckp5d2dLQ2tnUFQ0Z2UxeHVYSFJjZEZ4MFkyOXVjM1FnYkdWMGRHVnlUbTlrWlNBOUlHUnZZM1Z0Wlc1MExtZGxkRVZzWlcxbGJuUkNlVWxrS0d4bGRIUmxjaWs3WEc1Y2RGeDBYSFJzWlhRZ2RHRnlaMlYwTzF4dVhHNWNkRngwWEhScFppQW9JWE52Y25STFpYa3BJSHRjYmx4MFhIUmNkRngwZEdGeVoyVjBJRDBnYkdWMGRHVnlJRDA5UFNBbllTY2dQeUJrYjJOMWJXVnVkQzVuWlhSRmJHVnRaVzUwUW5sSlpDZ25ZVzVqYUc5eUxYUmhjbWRsZENjcElEb2diR1YwZEdWeVRtOWtaUzV3WVhKbGJuUkZiR1Z0Wlc1MExuQmhjbVZ1ZEVWc1pXMWxiblF1Y0dGeVpXNTBSV3hsYldWdWRDNXdZWEpsYm5SRmJHVnRaVzUwTG5CeVpYWnBiM1Z6Uld4bGJXVnVkRk5wWW14cGJtY3VjWFZsY25sVFpXeGxZM1J2Y2lnbkxtcHpMV0Z5ZEdsamJHVXRZVzVqYUc5eUxYUmhjbWRsZENjcE8xeHVYSFJjZEZ4MGZTQmxiSE5sSUh0Y2JseDBYSFJjZEZ4MGRHRnlaMlYwSUQwZ2JHVjBkR1Z5SUQwOVBTQW5ZU2NnUHlCa2IyTjFiV1Z1ZEM1blpYUkZiR1Z0Wlc1MFFubEpaQ2duWVc1amFHOXlMWFJoY21kbGRDY3BJRG9nYkdWMGRHVnlUbTlrWlM1d1lYSmxiblJGYkdWdFpXNTBMbkJoY21WdWRFVnNaVzFsYm5RdWNHRnlaVzUwUld4bGJXVnVkQzV3Y21WMmFXOTFjMFZzWlcxbGJuUlRhV0pzYVc1bkxuRjFaWEo1VTJWc1pXTjBiM0lvSnk1cWN5MWhjblJwWTJ4bExXRnVZMmh2Y2kxMFlYSm5aWFFuS1R0Y2JseDBYSFJjZEgwN1hHNWNibHgwWEhSY2RIUmhjbWRsZEM1elkzSnZiR3hKYm5SdlZtbGxkeWg3WW1Wb1lYWnBiM0k2SUZ3aWMyMXZiM1JvWENJc0lHSnNiMk5yT2lCY0luTjBZWEowWENKOUtUdGNibHgwWEhSOUtUdGNibHgwZlR0Y2JseHVYSFJzWlhRZ1lXTjBhWFpsUlc1MGNtbGxjeUE5SUh0OU8xeHVYSFJzWlhRZ0pHOTFkR1Z5SUQwZ1pHOWpkVzFsYm5RdWNYVmxjbmxUWld4bFkzUnZjaWduTG1Gc2NHaGhZbVYwWDE5c1pYUjBaWEp6SnlrN1hHNWNkQ1J2ZFhSbGNpNXBibTVsY2toVVRVd2dQU0FuSnp0Y2JseHVYSFJoYkhCb1lXSmxkQzVtYjNKRllXTm9LR3hsZEhSbGNpQTlQaUI3WEc1Y2RGeDBiR1YwSUNSbWFYSnpkRVZ1ZEhKNUlEMGdabWx1WkVacGNuTjBSVzUwY25rb2JHVjBkR1Z5S1R0Y2JseDBYSFJzWlhRZ0pHRnVZMmh2Y2lBOUlHUnZZM1Z0Wlc1MExtTnlaV0YwWlVWc1pXMWxiblFvSjJFbktUdGNibHh1WEhSY2RHbG1JQ2doSkdacGNuTjBSVzUwY25rcElISmxkSFZ5Ymp0Y2JseHVYSFJjZENSbWFYSnpkRVZ1ZEhKNUxtbGtJRDBnYkdWMGRHVnlPMXh1WEhSY2RDUmhibU5vYjNJdWFXNXVaWEpJVkUxTUlEMGdiR1YwZEdWeUxuUnZWWEJ3WlhKRFlYTmxLQ2s3WEc1Y2RGeDBKR0Z1WTJodmNpNWpiR0Z6YzA1aGJXVWdQU0FuWVd4d2FHRmlaWFJmWDJ4bGRIUmxjaTFoYm1Ob2IzSW5PMXh1WEc1Y2RGeDBZWFIwWVdOb1FXNWphRzl5VEdsemRHVnVaWElvSkdGdVkyaHZjaXdnYkdWMGRHVnlLVHRjYmx4MFhIUWtiM1YwWlhJdVlYQndaVzVrUTJocGJHUW9KR0Z1WTJodmNpazdYRzVjZEgwcE8xeHVmVHRjYmx4dVkyOXVjM1FnY21WdVpHVnlTVzFoWjJWeklEMGdLR2x0WVdkbGN5d2dKR2x0WVdkbGN5a2dQVDRnZTF4dVhIUnBiV0ZuWlhNdVptOXlSV0ZqYUNocGJXRm5aU0E5UGlCN1hHNWNkRngwWTI5dWMzUWdjM0pqSUQwZ1lDNHVMeTR1TDJGemMyVjBjeTlwYldGblpYTXZKSHRwYldGblpYMWdPMXh1WEhSY2RHeGxkQ0FrYVcxbklEMGdaRzlqZFcxbGJuUXVZM0psWVhSbFJXeGxiV1Z1ZENnblNVMUhKeWs3WEc1Y2RGeDBKR2x0Wnk1amJHRnpjMDVoYldVZ1BTQW5ZWEowYVdOc1pTMXBiV0ZuWlNjN1hHNWNkRngwSkdsdFp5NXpjbU1nUFNCemNtTTdYRzVjZEZ4MEpHbHRZV2RsY3k1aGNIQmxibVJEYUdsc1pDZ2thVzFuS1R0Y2JseDBmU2xjYm4wN1hHNWNibU52Ym5OMElISmxibVJsY2tWdWRISnBaWE1nUFNBb0tTQTlQaUI3WEc1Y2RHeGxkQ0FrWVhKMGFXTnNaVXhwYzNRZ1BTQmtiMk4xYldWdWRDNW5aWFJGYkdWdFpXNTBRbmxKWkNnbmFuTXRiR2x6ZENjcE8xeHVYSFJzWlhRZ1pXNTBjbWxsYzB4cGMzUWdQU0J6YjNKMFMyVjVJRDhnWlc1MGNtbGxjeTVpZVZScGRHeGxJRG9nWlc1MGNtbGxjeTVpZVVGMWRHaHZjanRjYmx4dVhIUWtZWEowYVdOc1pVeHBjM1F1YVc1dVpYSklWRTFNSUQwZ0p5YzdYRzVjYmx4MFpXNTBjbWxsYzB4cGMzUXVabTl5UldGamFDaGxiblJ5ZVNBOVBpQjdYRzVjZEZ4MGJHVjBJSHNnZEdsMGJHVXNJR3hoYzNST1lXMWxMQ0JtYVhKemRFNWhiV1VzSUdsdFlXZGxjeXdnWkdWelkzSnBjSFJwYjI0c0lHUmxkR0ZwYkNCOUlEMGdaVzUwY25rN1hHNWNibHgwWEhRa1lYSjBhV05zWlV4cGMzUXVhVzV6WlhKMFFXUnFZV05sYm5SSVZFMU1LQ2RpWldadmNtVmxibVFuTENCaGNuUnBZMnhsVkdWdGNHeGhkR1VwTzF4dVhHNWNkRngwYkdWMElDUnBiV0ZuWlhOT2IyUmxjeUE5SUdSdlkzVnRaVzUwTG5GMVpYSjVVMlZzWldOMGIzSkJiR3dvSnk1aGNuUnBZMnhsWDE5cGJXRm5aWE10YVc1dVpYSW5LVHRjYmx4MFhIUnNaWFFnSkdsdFlXZGxjeUE5SUNScGJXRm5aWE5PYjJSbGMxc2thVzFoWjJWelRtOWtaWE11YkdWdVozUm9JQzBnTVYwN1hHNWNibHgwWEhScFppQW9hVzFoWjJWekxteGxibWQwYUNrZ2NtVnVaR1Z5U1cxaFoyVnpLR2x0WVdkbGN5d2dKR2x0WVdkbGN5azdYRzVjZEZ4MFhHNWNkRngwYkdWMElDUmtaWE5qY21sd2RHbHZiazkxZEdWeUlEMGdaRzlqZFcxbGJuUXVZM0psWVhSbFJXeGxiV1Z1ZENnblpHbDJKeWs3WEc1Y2RGeDBiR1YwSUNSa1pYTmpjbWx3ZEdsdmJrNXZaR1VnUFNCa2IyTjFiV1Z1ZEM1amNtVmhkR1ZGYkdWdFpXNTBLQ2R3SnlrN1hHNWNkRngwYkdWMElDUmtaWFJoYVd4T2IyUmxJRDBnWkc5amRXMWxiblF1WTNKbFlYUmxSV3hsYldWdWRDZ25jQ2NwTzF4dVhIUmNkQ1JrWlhOamNtbHdkR2x2Yms5MWRHVnlMbU5zWVhOelRHbHpkQzVoWkdRb0oyRnlkR2xqYkdVdFpHVnpZM0pwY0hScGIyNWZYMjkxZEdWeUp5azdYRzVjZEZ4MEpHUmxjMk55YVhCMGFXOXVUbTlrWlM1amJHRnpjMHhwYzNRdVlXUmtLQ2RoY25ScFkyeGxMV1JsYzJOeWFYQjBhVzl1SnlrN1hHNWNkRngwSkdSbGRHRnBiRTV2WkdVdVkyeGhjM05NYVhOMExtRmtaQ2duWVhKMGFXTnNaUzFrWlhSaGFXd25LVHRjYmx4dVhIUmNkQ1JrWlhOamNtbHdkR2x2Yms1dlpHVXVhVzV1WlhKSVZFMU1JRDBnWkdWelkzSnBjSFJwYjI0N1hHNWNkRngwSkdSbGRHRnBiRTV2WkdVdWFXNXVaWEpJVkUxTUlEMGdaR1YwWVdsc08xeHVYRzVjZEZ4MEpHUmxjMk55YVhCMGFXOXVUM1YwWlhJdVlYQndaVzVrUTJocGJHUW9KR1JsYzJOeWFYQjBhVzl1VG05a1pTd2dKR1JsZEdGcGJFNXZaR1VwTzF4dVhIUmNkQ1JwYldGblpYTXVZWEJ3Wlc1a1EyaHBiR1FvSkdSbGMyTnlhWEIwYVc5dVQzVjBaWElwTzF4dVhHNWNkRngwYkdWMElDUjBhWFJzWlU1dlpHVnpJRDBnWkc5amRXMWxiblF1Y1hWbGNubFRaV3hsWTNSdmNrRnNiQ2duTG1GeWRHbGpiR1V0YUdWaFpHbHVaMTlmZEdsMGJHVW5LVHRjYmx4MFhIUnNaWFFnSkhScGRHeGxJRDBnSkhScGRHeGxUbTlrWlhOYkpIUnBkR3hsVG05a1pYTXViR1Z1WjNSb0lDMGdNVjA3WEc1Y2JseDBYSFJzWlhRZ0pHWnBjbk4wVG05a1pYTWdQU0JrYjJOMWJXVnVkQzV4ZFdWeWVWTmxiR1ZqZEc5eVFXeHNLQ2N1WVhKMGFXTnNaUzFvWldGa2FXNW5YMTl1WVcxbExTMW1hWEp6ZENjcE8xeHVYSFJjZEd4bGRDQWtabWx5YzNRZ1BTQWtabWx5YzNST2IyUmxjMXNrWm1seWMzUk9iMlJsY3k1c1pXNW5kR2dnTFNBeFhUdGNibHh1WEhSY2RHeGxkQ0FrYkdGemRFNXZaR1Z6SUQwZ1pHOWpkVzFsYm5RdWNYVmxjbmxUWld4bFkzUnZja0ZzYkNnbkxtRnlkR2xqYkdVdGFHVmhaR2x1WjE5ZmJtRnRaUzB0YkdGemRDY3BPMXh1WEhSY2RHeGxkQ0FrYkdGemRDQTlJQ1JzWVhOMFRtOWtaWE5iSkd4aGMzUk9iMlJsY3k1c1pXNW5kR2dnTFNBeFhUdGNibHh1WEhSY2RDUjBhWFJzWlM1cGJtNWxja2hVVFV3Z1BTQjBhWFJzWlR0Y2JseDBYSFFrWm1seWMzUXVhVzV1WlhKSVZFMU1JRDBnWm1seWMzUk9ZVzFsTzF4dVhIUmNkQ1JzWVhOMExtbHVibVZ5U0ZSTlRDQTlJR3hoYzNST1lXMWxPMXh1WEc1Y2RIMHBPMXh1WEc1Y2RHRjBkR0ZqYUVsdFlXZGxUR2x6ZEdWdVpYSnpLQ2s3WEc1Y2RHMWhhMlZCYkhCb1lXSmxkQ2dwTzF4dWZUdGNibHh1THk4Z2RHaHBjeUJ1WldWa2N5QjBieUJpWlNCaElHUmxaWEJsY2lCemIzSjBYRzVqYjI1emRDQnpiM0owUW5sVWFYUnNaU0E5SUNncElEMCtJSHRjYmx4MFpXNTBjbWxsY3k1aWVWUnBkR3hsTG5OdmNuUW9LR0VzSUdJcElEMCtJSHRjYmx4MFhIUnNaWFFnWVZScGRHeGxJRDBnWVM1MGFYUnNaVnN3WFM1MGIxVndjR1Z5UTJGelpTZ3BPMXh1WEhSY2RHeGxkQ0JpVkdsMGJHVWdQU0JpTG5ScGRHeGxXekJkTG5SdlZYQndaWEpEWVhObEtDazdYRzVjZEZ4MGFXWWdLR0ZVYVhSc1pTQStJR0pVYVhSc1pTa2djbVYwZFhKdUlERTdYRzVjZEZ4MFpXeHpaU0JwWmlBb1lWUnBkR3hsSUR3Z1lsUnBkR3hsS1NCeVpYUjFjbTRnTFRFN1hHNWNkRngwWld4elpTQnlaWFIxY200Z01EdGNibHgwZlNrN1hHNTlPMXh1WEc1amIyNXpkQ0J6WlhSRVlYUmhJRDBnS0dSaGRHRXBJRDArSUh0Y2JseDBaVzUwY21sbGN5NWllVUYxZEdodmNpQTlJR1JoZEdFN1hHNWNkR1Z1ZEhKcFpYTXVZbmxVYVhSc1pTQTlJR1JoZEdFdWMyeHBZMlVvS1R0Y2JseDBjMjl5ZEVKNVZHbDBiR1VvS1R0Y2JseDBjbVZ1WkdWeVJXNTBjbWxsY3lncE8xeHVmVnh1WEc1amIyNXpkQ0JtWlhSamFFUmhkR0VnUFNBb0tTQTlQaUI3WEc1Y2RGeDBabVYwWTJnb1JFSXBMblJvWlc0b2NtVnpJRDArWEc1Y2RGeDBYSFJ5WlhNdWFuTnZiaWdwWEc1Y2RGeDBLUzUwYUdWdUtHUmhkR0VnUFQ0Z2UxeHVYSFJjZEZ4MGMyVjBSR0YwWVNoa1lYUmhLVHRjYmx4MFhIUjlLVnh1WEhSY2RDNTBhR1Z1S0NncElEMCtJSHRjYmx4MFhIUmNkQ1JzYjJGa2FXNW5MbVp2Y2tWaFkyZ29aV3hsYlNBOVBpQmxiR1Z0TG1Oc1lYTnpUR2x6ZEM1aFpHUW9KM0psWVdSNUp5a3BPMXh1WEhSY2RGeDBKRzVoZGk1amJHRnpjMHhwYzNRdVlXUmtLQ2R5WldGa2VTY3BPMXh1WEhSY2RIMHBYRzVjZEZ4MExtTmhkR05vS0dWeWNpQTlQaUJqYjI1emIyeGxMbmRoY200b1pYSnlLU2s3WEc1OU8xeHVYRzVqYjI1emRDQnBibWwwSUQwZ0tDa2dQVDRnZTF4dVhIUm1aWFJqYUVSaGRHRW9LVHRjYmx4MGJtRjJUR2NvS1R0Y2JseDBjbVZ1WkdWeVJXNTBjbWxsY3lncE8xeHVYSFJoWkdSVGIzSjBRblYwZEc5dVRHbHpkR1Z1WlhKektDazdYRzVjZEdGMGRHRmphRUZ5Y205M1RHbHpkR1Z1WlhKektDazdYRzVjZEdGMGRHRmphRTF2WkdGc1RHbHpkR1Z1WlhKektDazdYRzU5WEc1Y2JtbHVhWFFvS1R0Y2JpSXNJbU52Ym5OMElIUmxiWEJzWVhSbElEMGdYRzVjZEdBOFpHbDJJR05zWVhOelBWd2libUYyWDE5cGJtNWxjbHdpUGx4dVhIUmNkRHhrYVhZZ1kyeGhjM005WENKdVlYWmZYM052Y25RdFlubGNJajVjYmx4MFhIUmNkRHh6Y0dGdUlHTnNZWE56UFZ3aWMyOXlkQzFpZVY5ZmRHbDBiR1ZjSWo1VGIzSjBJR0o1UEM5emNHRnVQbHh1WEhSY2RGeDBQR0oxZEhSdmJpQmpiR0Z6Y3oxY0luTnZjblF0WW5sZlgySjVMV0Z5ZEdsemRDQmhZM1JwZG1WY0lpQnBaRDFjSW1wekxXSjVMV0Z5ZEdsemRGd2lQa0Z5ZEdsemREd3ZZblYwZEc5dVBseHVYSFJjZEZ4MFBITndZVzRnWTJ4aGMzTTlYQ0p6YjNKMExXSjVYMTlrYVhacFpHVnlYQ0krSUh3Z1BDOXpjR0Z1UGx4dVhIUmNkRngwUEdKMWRIUnZiaUJqYkdGemN6MWNJbk52Y25RdFlubGZYMko1TFhScGRHeGxYQ0lnYVdROVhDSnFjeTFpZVMxMGFYUnNaVndpUGxScGRHeGxQQzlpZFhSMGIyNCtYRzVjZEZ4MFhIUThjM0JoYmlCamJHRnpjejFjSW5OdmNuUXRZbmxmWDJScGRtbGtaWElnWm1sdVpGd2lQaUI4SUR3dmMzQmhiajVjYmx4MFhIUmNkRHh6Y0dGdUlHTnNZWE56UFZ3aVptbHVaRndpSUdsa1BWd2lhbk10Wm1sdVpGd2lQaVlqT0RrNE5EdEdQQzl6Y0dGdVBseHVYSFJjZER3dlpHbDJQbHh1WEhSY2REeGthWFlnWTJ4aGMzTTlYQ0p1WVhaZlgyRnNjR2hoWW1WMFhDSStYRzVjZEZ4MFhIUThjM0JoYmlCamJHRnpjejFjSW1Gc2NHaGhZbVYwWDE5MGFYUnNaVndpUGtkdklIUnZQQzl6Y0dGdVBseHVYSFJjZEZ4MFBHUnBkaUJqYkdGemN6MWNJbUZzY0doaFltVjBYMTlzWlhSMFpYSnpYQ0krUEM5a2FYWStYRzVjZEZ4MFBDOWthWFkrWEc1Y2REd3ZaR2wyUG1BN1hHNWNibU52Ym5OMElHNWhka3huSUQwZ0tDa2dQVDRnZTF4dVhIUnNaWFFnYm1GMlQzVjBaWElnUFNCa2IyTjFiV1Z1ZEM1blpYUkZiR1Z0Wlc1MFFubEpaQ2duYW5NdGJtRjJKeWs3WEc1Y2RHNWhkazkxZEdWeUxtbHVibVZ5U0ZSTlRDQTlJSFJsYlhCc1lYUmxPMXh1ZlR0Y2JseHVaWGh3YjNKMElHUmxabUYxYkhRZ2JtRjJUR2M3SWwxOSJ9
