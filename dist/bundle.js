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
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
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

exports.DB = DB;
exports.alphabet = alphabet;
exports.$loading = $loading;
exports.$nav = $nav;
exports.$parallax = $parallax;
exports.$content = $content;
exports.$title = $title;
exports.$arrow = $arrow;
exports.$modal = $modal;
exports.$lightbox = $lightbox;
exports.$view = $view;

},{}],3:[function(require,module,exports){
'use strict';

var _smoothscrollPolyfill = require('smoothscroll-polyfill');

var _smoothscrollPolyfill2 = _interopRequireDefault(_smoothscrollPolyfill);

var _templates = require('./templates');

var _utils = require('./utils');

var _constants = require('./constants');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var sortKey = 0; // 0 = artist, 1 = title
var entries = { byAuthor: [], byTitle: [] };
var currentLetter = 'A';
var modal = false;
var lightbox = false;

var attachImageListeners = function attachImageListeners() {
	var $images = Array.from(document.querySelectorAll('.article-image'));

	$images.forEach(function (img) {
		img.addEventListener('click', function (evt) {
			if (!lightbox) {
				var src = img.src;

				_constants.$lightbox.classList.add('show-img');
				_constants.$view.setAttribute('style', 'background-image: url(' + src + ')');
				lightbox = true;
			}
		});
	});

	_constants.$view.addEventListener('click', function () {
		if (lightbox) {
			_constants.$lightbox.classList.remove('show-img');
			lightbox = false;
		}
	});
};

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

var prev = void 0;
var current = 0;
var isShowing = false;
var attachArrowListeners = function attachArrowListeners() {
	_constants.$arrow.addEventListener('click', function () {
		(0, _utils.scrollToTop)();
	});

	_constants.$parallax.addEventListener('scroll', function () {

		var y = _constants.$title.getBoundingClientRect().y;
		if (current !== y) {
			prev = current;
			current = y;
		}

		if (y <= -50 && !isShowing) {
			_constants.$arrow.classList.add('show');
			isShowing = true;
		} else if (y > -50 && isShowing) {
			_constants.$arrow.classList.remove('show');
			isShowing = false;
		}
	});
};

var addSortButtonListeners = function addSortButtonListeners() {
	var $byArtist = document.getElementById('js-by-artist');
	var $byTitle = document.getElementById('js-by-title');
	$byArtist.addEventListener('click', function () {
		if (sortKey) {
			(0, _utils.scrollToTop)();
			sortKey = 0;
			$byArtist.classList.add('active');
			$byTitle.classList.remove('active');

			renderEntries();
		}
	});

	$byTitle.addEventListener('click', function () {
		if (!sortKey) {
			(0, _utils.scrollToTop)();
			sortKey = 1;
			$byTitle.classList.add('active');
			$byArtist.classList.remove('active');

			renderEntries();
		}
	});
};

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

	_constants.alphabet.forEach(function (letter) {
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

var renderEntries = function renderEntries() {
	var $articleList = document.getElementById('js-list');
	var entriesList = sortKey ? entries.byTitle : entries.byAuthor;

	$articleList.innerHTML = '';

	entriesList.forEach(function (entry, i) {
		$articleList.insertAdjacentHTML('beforeend', (0, _templates.articleTemplate)(entry, i));
		(0, _utils.makeSlider)(document.getElementById('slider-' + i));
	});

	attachImageListeners();
	makeAlphabet();
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
	addSortButtonListeners();
	attachArrowListeners();
	attachModalListeners();
};

init();

},{"./constants":2,"./templates":5,"./utils":7,"smoothscroll-polyfill":1}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
var imageTemplate = function imageTemplate(image) {
	return '<img class="article-img" src="../../assets/images/' + image + '"></img>';
};

var articleTemplate = function articleTemplate(entry, i) {
	var title = entry.title,
	    firstName = entry.firstName,
	    lastName = entry.lastName,
	    images = entry.images,
	    description = entry.description,
	    detail = entry.detail;


	var imageHTML = images.length ? images.map(function (image) {
		return imageTemplate(image);
	}).join('') : '';

	return '\n\t\t<article class="article__outer">\n\t\t\t<div class="article__inner">\n\t\t\t\t<div class="article__heading">\n\t\t\t\t\t<a class="js-entry-title"></a>\n\t\t\t\t\t<h2 class="article-heading__title">' + title + '</h2>\n\t\t\t\t\t<div class="article-heading__name">\n\t\t\t\t\t\t<span class="article-heading__name--first">' + firstName + '</span>\n\t\t\t\t\t\t<a class="js-entry-artist"></a>\n\t\t\t\t\t\t<span class="article-heading__name--last">' + lastName + '</span>\n\t\t\t\t\t</div>\n\t\t\t\t</div>\t\n\t\t\t\t<div class="article__slider-outer">\n\t\t\t\t\t<div class="article__slider-inner" id="slider-' + i + '">\n\t\t\t\t\t\t' + imageHTML + '\n\t\t\t\t\t\t<div class="article-description__outer">\n\t\t\t\t\t\t\t<div class="article-description">' + description + '</div>\n\t\t\t\t\t\t\t<div class="article-detail">' + detail + '</div>\n\t\t\t\t\t\t</div>\n\t\t\t\t\t</div>\n\t\t\t\t\t<div class="article__scroll-controls">\n\t\t\t\t\t\t<span class="controls arrow-prev">\u2190</span> \n\t\t\t\t\t\t<span class="controls arrow-next">\u2192</span>\n\t\t\t\t\t</div>\n\t\t\t\t\t<p class="js-article-anchor-target"></p>\n\t\t\t</div>\n\t\t</article>\n\t';
};

exports.default = articleTemplate;

},{}],5:[function(require,module,exports){
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

},{"./article":4,"./navLg":6}],6:[function(require,module,exports){
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

},{}],7:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.makeSlider = exports.scrollToTop = exports.hideLoading = exports.debounce = undefined;

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

exports.debounce = debounce;
exports.hideLoading = hideLoading;
exports.scrollToTop = scrollToTop;
exports.makeSlider = makeSlider;

},{"../constants":2}]},{},[3])

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvc21vb3Roc2Nyb2xsLXBvbHlmaWxsL2Rpc3Qvc21vb3Roc2Nyb2xsLmpzIiwic3JjL2pzL2NvbnN0YW50cy5qcyIsInNyYy9qcy9pbmRleC5qcyIsInNyYy9qcy90ZW1wbGF0ZXMvYXJ0aWNsZS5qcyIsInNyYy9qcy90ZW1wbGF0ZXMvaW5kZXguanMiLCJzcmMvanMvdGVtcGxhdGVzL25hdkxnLmpzIiwic3JjL2pzL3V0aWxzL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7OztBQ3ZiQSxJQUFNLEtBQUssK0ZBQVg7QUFDQSxJQUFNLFdBQVcsQ0FBQyxHQUFELEVBQU0sR0FBTixFQUFXLEdBQVgsRUFBZ0IsR0FBaEIsRUFBcUIsR0FBckIsRUFBMEIsR0FBMUIsRUFBK0IsR0FBL0IsRUFBb0MsR0FBcEMsRUFBeUMsR0FBekMsRUFBOEMsR0FBOUMsRUFBbUQsR0FBbkQsRUFBd0QsR0FBeEQsRUFBNkQsR0FBN0QsRUFBa0Us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VyxnQkFBWCxDQUE0QixPQUE1QixFQUFxQyxZQUFNO0FBQzFDLE1BQU0sT0FBTyxRQUFRLHNCQUFyQjtBQUNBLE1BQUksSUFBSixFQUFVO0FBQ1QsUUFBSyxjQUFMLENBQW9CLEVBQUMsVUFBVSxRQUFYLEVBQXFCLE9BQU8sU0FBNUIsRUFBdUMsUUFBUSxRQUEvQyxFQUFwQjtBQUNBLGFBQVUsSUFBVjtBQUNBO0FBQ0QsRUFORDtBQU9BLENBcEJEOztRQXNCUyxRLEdBQUEsUTtRQUFVLFcsR0FBQSxXO1FBQWEsVyxHQUFBLFc7UUFBYSxVLEdBQUEsVSIsImZpbGUiOiJidW5kbGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiLyogc21vb3Roc2Nyb2xsIHYwLjQuMCAtIDIwMTggLSBEdXN0YW4gS2FzdGVuLCBKZXJlbWlhcyBNZW5pY2hlbGxpIC0gTUlUIExpY2Vuc2UgKi9cbihmdW5jdGlvbiAoKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICAvLyBwb2x5ZmlsbFxuICBmdW5jdGlvbiBwb2x5ZmlsbCgpIHtcbiAgICAvLyBhbGlhc2VzXG4gICAgdmFyIHcgPSB3aW5kb3c7XG4gICAgdmFyIGQgPSBkb2N1bWVudDtcblxuICAgIC8vIHJldHVybiBpZiBzY3JvbGwgYmVoYXZpb3IgaXMgc3VwcG9ydGVkIGFuZCBwb2x5ZmlsbCBpcyBub3QgZm9yY2VkXG4gICAgaWYgKFxuICAgICAgJ3Njcm9sbEJlaGF2aW9yJyBpbiBkLmRvY3VtZW50RWxlbWVudC5zdHlsZSAmJlxuICAgICAgdy5fX2ZvcmNlU21vb3RoU2Nyb2xsUG9seWZpbGxfXyAhPT0gdHJ1ZVxuICAgICkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIGdsb2JhbHNcbiAgICB2YXIgRWxlbWVudCA9IHcuSFRNTEVsZW1lbnQgfHwgdy5FbGVtZW50O1xuICAgIHZhciBTQ1JPTExfVElNRSA9IDQ2ODtcblxuICAgIC8vIG9iamVjdCBnYXRoZXJpbmcgb3JpZ2luYWwgc2Nyb2xsIG1ldGhvZHNcbiAgICB2YXIgb3JpZ2luYWwgPSB7XG4gICAgICBzY3JvbGw6IHcuc2Nyb2xsIHx8IHcuc2Nyb2xsVG8sXG4gICAgICBzY3JvbGxCeTogdy5zY3JvbGxCeSxcbiAgICAgIGVsZW1lbnRTY3JvbGw6IEVsZW1lbnQucHJvdG90eXBlLnNjcm9sbCB8fCBzY3JvbGxFbGVtZW50LFxuICAgICAgc2Nyb2xsSW50b1ZpZXc6IEVsZW1lbnQucHJvdG90eXBlLnNjcm9sbEludG9WaWV3XG4gICAgfTtcblxuICAgIC8vIGRlZmluZSB0aW1pbmcgbWV0aG9kXG4gICAgdmFyIG5vdyA9XG4gICAgICB3LnBlcmZvcm1hbmNlICYmIHcucGVyZm9ybWFuY2Uubm93XG4gICAgICAgID8gdy5wZXJmb3JtYW5jZS5ub3cuYmluZCh3LnBlcmZvcm1hbmNlKVxuICAgICAgICA6IERhdGUubm93O1xuXG4gICAgLyoqXG4gICAgICogaW5kaWNhdGVzIGlmIGEgdGhlIGN1cnJlbnQgYnJvd3NlciBpcyBtYWRlIGJ5IE1pY3Jvc29mdFxuICAgICAqIEBtZXRob2QgaXNNaWNyb3NvZnRCcm93c2VyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHVzZXJBZ2VudFxuICAgICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGlzTWljcm9zb2Z0QnJvd3Nlcih1c2VyQWdlbnQpIHtcbiAgICAgIHZhciB1c2VyQWdlbnRQYXR0ZXJucyA9IFsnTVNJRSAnLCAnVHJpZGVudC8nLCAnRWRnZS8nXTtcblxuICAgICAgcmV0dXJuIG5ldyBSZWdFeHAodXNlckFnZW50UGF0dGVybnMuam9pbignfCcpKS50ZXN0KHVzZXJBZ2VudCk7XG4gICAgfVxuXG4gICAgLypcbiAgICAgKiBJRSBoYXMgcm91bmRpbmcgYnVnIHJvdW5kaW5nIGRvd24gY2xpZW50SGVpZ2h0IGFuZCBjbGllbnRXaWR0aCBhbmRcbiAgICAgKiByb3VuZGluZyB1cCBzY3JvbGxIZWlnaHQgYW5kIHNjcm9sbFdpZHRoIGNhdXNpbmcgZmFsc2UgcG9zaXRpdmVzXG4gICAgICogb24gaGFzU2Nyb2xsYWJsZVNwYWNlXG4gICAgICovXG4gICAgdmFyIFJPVU5ESU5HX1RPTEVSQU5DRSA9IGlzTWljcm9zb2Z0QnJvd3Nlcih3Lm5hdmlnYXRvci51c2VyQWdlbnQpID8gMSA6IDA7XG5cbiAgICAvKipcbiAgICAgKiBjaGFuZ2VzIHNjcm9sbCBwb3NpdGlvbiBpbnNpZGUgYW4gZWxlbWVudFxuICAgICAqIEBtZXRob2Qgc2Nyb2xsRWxlbWVudFxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSB4XG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHlcbiAgICAgKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHNjcm9sbEVsZW1lbnQoeCwgeSkge1xuICAgICAgdGhpcy5zY3JvbGxMZWZ0ID0geDtcbiAgICAgIHRoaXMuc2Nyb2xsVG9wID0geTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiByZXR1cm5zIHJlc3VsdCBvZiBhcHBseWluZyBlYXNlIG1hdGggZnVuY3Rpb24gdG8gYSBudW1iZXJcbiAgICAgKiBAbWV0aG9kIGVhc2VcbiAgICAgKiBAcGFyYW0ge051bWJlcn0ga1xuICAgICAqIEByZXR1cm5zIHtOdW1iZXJ9XG4gICAgICovXG4gICAgZnVuY3Rpb24gZWFzZShrKSB7XG4gICAgICByZXR1cm4gMC41ICogKDEgLSBNYXRoLmNvcyhNYXRoLlBJICogaykpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGluZGljYXRlcyBpZiBhIHNtb290aCBiZWhhdmlvciBzaG91bGQgYmUgYXBwbGllZFxuICAgICAqIEBtZXRob2Qgc2hvdWxkQmFpbE91dFxuICAgICAqIEBwYXJhbSB7TnVtYmVyfE9iamVjdH0gZmlyc3RBcmdcbiAgICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzaG91bGRCYWlsT3V0KGZpcnN0QXJnKSB7XG4gICAgICBpZiAoXG4gICAgICAgIGZpcnN0QXJnID09PSBudWxsIHx8XG4gICAgICAgIHR5cGVvZiBmaXJzdEFyZyAhPT0gJ29iamVjdCcgfHxcbiAgICAgICAgZmlyc3RBcmcuYmVoYXZpb3IgPT09IHVuZGVmaW5lZCB8fFxuICAgICAgICBmaXJzdEFyZy5iZWhhdmlvciA9PT0gJ2F1dG8nIHx8XG4gICAgICAgIGZpcnN0QXJnLmJlaGF2aW9yID09PSAnaW5zdGFudCdcbiAgICAgICkge1xuICAgICAgICAvLyBmaXJzdCBhcmd1bWVudCBpcyBub3QgYW4gb2JqZWN0L251bGxcbiAgICAgICAgLy8gb3IgYmVoYXZpb3IgaXMgYXV0bywgaW5zdGFudCBvciB1bmRlZmluZWRcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG5cbiAgICAgIGlmICh0eXBlb2YgZmlyc3RBcmcgPT09ICdvYmplY3QnICYmIGZpcnN0QXJnLmJlaGF2aW9yID09PSAnc21vb3RoJykge1xuICAgICAgICAvLyBmaXJzdCBhcmd1bWVudCBpcyBhbiBvYmplY3QgYW5kIGJlaGF2aW9yIGlzIHNtb290aFxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIC8vIHRocm93IGVycm9yIHdoZW4gYmVoYXZpb3IgaXMgbm90IHN1cHBvcnRlZFxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICAgJ2JlaGF2aW9yIG1lbWJlciBvZiBTY3JvbGxPcHRpb25zICcgK1xuICAgICAgICAgIGZpcnN0QXJnLmJlaGF2aW9yICtcbiAgICAgICAgICAnIGlzIG5vdCBhIHZhbGlkIHZhbHVlIGZvciBlbnVtZXJhdGlvbiBTY3JvbGxCZWhhdmlvci4nXG4gICAgICApO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGluZGljYXRlcyBpZiBhbiBlbGVtZW50IGhhcyBzY3JvbGxhYmxlIHNwYWNlIGluIHRoZSBwcm92aWRlZCBheGlzXG4gICAgICogQG1ldGhvZCBoYXNTY3JvbGxhYmxlU3BhY2VcbiAgICAgKiBAcGFyYW0ge05vZGV9IGVsXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGF4aXNcbiAgICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBoYXNTY3JvbGxhYmxlU3BhY2UoZWwsIGF4aXMpIHtcbiAgICAgIGlmIChheGlzID09PSAnWScpIHtcbiAgICAgICAgcmV0dXJuIGVsLmNsaWVudEhlaWdodCArIFJPVU5ESU5HX1RPTEVSQU5DRSA8IGVsLnNjcm9sbEhlaWdodDtcbiAgICAgIH1cblxuICAgICAgaWYgKGF4aXMgPT09ICdYJykge1xuICAgICAgICByZXR1cm4gZWwuY2xpZW50V2lkdGggKyBST1VORElOR19UT0xFUkFOQ0UgPCBlbC5zY3JvbGxXaWR0aDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBpbmRpY2F0ZXMgaWYgYW4gZWxlbWVudCBoYXMgYSBzY3JvbGxhYmxlIG92ZXJmbG93IHByb3BlcnR5IGluIHRoZSBheGlzXG4gICAgICogQG1ldGhvZCBjYW5PdmVyZmxvd1xuICAgICAqIEBwYXJhbSB7Tm9kZX0gZWxcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gYXhpc1xuICAgICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGNhbk92ZXJmbG93KGVsLCBheGlzKSB7XG4gICAgICB2YXIgb3ZlcmZsb3dWYWx1ZSA9IHcuZ2V0Q29tcHV0ZWRTdHlsZShlbCwgbnVsbClbJ292ZXJmbG93JyArIGF4aXNdO1xuXG4gICAgICByZXR1cm4gb3ZlcmZsb3dWYWx1ZSA9PT0gJ2F1dG8nIHx8IG92ZXJmbG93VmFsdWUgPT09ICdzY3JvbGwnO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGluZGljYXRlcyBpZiBhbiBlbGVtZW50IGNhbiBiZSBzY3JvbGxlZCBpbiBlaXRoZXIgYXhpc1xuICAgICAqIEBtZXRob2QgaXNTY3JvbGxhYmxlXG4gICAgICogQHBhcmFtIHtOb2RlfSBlbFxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBheGlzXG4gICAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAgICovXG4gICAgZnVuY3Rpb24gaXNTY3JvbGxhYmxlKGVsKSB7XG4gICAgICB2YXIgaXNTY3JvbGxhYmxlWSA9IGhhc1Njcm9sbGFibGVTcGFjZShlbCwgJ1knKSAmJiBjYW5PdmVyZmxvdyhlbCwgJ1knKTtcbiAgICAgIHZhciBpc1Njcm9sbGFibGVYID0gaGFzU2Nyb2xsYWJsZVNwYWNlKGVsLCAnWCcpICYmIGNhbk92ZXJmbG93KGVsLCAnWCcpO1xuXG4gICAgICByZXR1cm4gaXNTY3JvbGxhYmxlWSB8fCBpc1Njcm9sbGFibGVYO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGZpbmRzIHNjcm9sbGFibGUgcGFyZW50IG9mIGFuIGVsZW1lbnRcbiAgICAgKiBAbWV0aG9kIGZpbmRTY3JvbGxhYmxlUGFyZW50XG4gICAgICogQHBhcmFtIHtOb2RlfSBlbFxuICAgICAqIEByZXR1cm5zIHtOb2RlfSBlbFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGZpbmRTY3JvbGxhYmxlUGFyZW50KGVsKSB7XG4gICAgICB2YXIgaXNCb2R5O1xuXG4gICAgICBkbyB7XG4gICAgICAgIGVsID0gZWwucGFyZW50Tm9kZTtcblxuICAgICAgICBpc0JvZHkgPSBlbCA9PT0gZC5ib2R5O1xuICAgICAgfSB3aGlsZSAoaXNCb2R5ID09PSBmYWxzZSAmJiBpc1Njcm9sbGFibGUoZWwpID09PSBmYWxzZSk7XG5cbiAgICAgIGlzQm9keSA9IG51bGw7XG5cbiAgICAgIHJldHVybiBlbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBzZWxmIGludm9rZWQgZnVuY3Rpb24gdGhhdCwgZ2l2ZW4gYSBjb250ZXh0LCBzdGVwcyB0aHJvdWdoIHNjcm9sbGluZ1xuICAgICAqIEBtZXRob2Qgc3RlcFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBjb250ZXh0XG4gICAgICogQHJldHVybnMge3VuZGVmaW5lZH1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzdGVwKGNvbnRleHQpIHtcbiAgICAgIHZhciB0aW1lID0gbm93KCk7XG4gICAgICB2YXIgdmFsdWU7XG4gICAgICB2YXIgY3VycmVudFg7XG4gICAgICB2YXIgY3VycmVudFk7XG4gICAgICB2YXIgZWxhcHNlZCA9ICh0aW1lIC0gY29udGV4dC5zdGFydFRpbWUpIC8gU0NST0xMX1RJTUU7XG5cbiAgICAgIC8vIGF2b2lkIGVsYXBzZWQgdGltZXMgaGlnaGVyIHRoYW4gb25lXG4gICAgICBlbGFwc2VkID0gZWxhcHNlZCA+IDEgPyAxIDogZWxhcHNlZDtcblxuICAgICAgLy8gYXBwbHkgZWFzaW5nIHRvIGVsYXBzZWQgdGltZVxuICAgICAgdmFsdWUgPSBlYXNlKGVsYXBzZWQpO1xuXG4gICAgICBjdXJyZW50WCA9IGNvbnRleHQuc3RhcnRYICsgKGNvbnRleHQueCAtIGNvbnRleHQuc3RhcnRYKSAqIHZhbHVlO1xuICAgICAgY3VycmVudFkgPSBjb250ZXh0LnN0YXJ0WSArIChjb250ZXh0LnkgLSBjb250ZXh0LnN0YXJ0WSkgKiB2YWx1ZTtcblxuICAgICAgY29udGV4dC5tZXRob2QuY2FsbChjb250ZXh0LnNjcm9sbGFibGUsIGN1cnJlbnRYLCBjdXJyZW50WSk7XG5cbiAgICAgIC8vIHNjcm9sbCBtb3JlIGlmIHdlIGhhdmUgbm90IHJlYWNoZWQgb3VyIGRlc3RpbmF0aW9uXG4gICAgICBpZiAoY3VycmVudFggIT09IGNvbnRleHQueCB8fCBjdXJyZW50WSAhPT0gY29udGV4dC55KSB7XG4gICAgICAgIHcucmVxdWVzdEFuaW1hdGlvbkZyYW1lKHN0ZXAuYmluZCh3LCBjb250ZXh0KSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogc2Nyb2xscyB3aW5kb3cgb3IgZWxlbWVudCB3aXRoIGEgc21vb3RoIGJlaGF2aW9yXG4gICAgICogQG1ldGhvZCBzbW9vdGhTY3JvbGxcbiAgICAgKiBAcGFyYW0ge09iamVjdHxOb2RlfSBlbFxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSB4XG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHlcbiAgICAgKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHNtb290aFNjcm9sbChlbCwgeCwgeSkge1xuICAgICAgdmFyIHNjcm9sbGFibGU7XG4gICAgICB2YXIgc3RhcnRYO1xuICAgICAgdmFyIHN0YXJ0WTtcbiAgICAgIHZhciBtZXRob2Q7XG4gICAgICB2YXIgc3RhcnRUaW1lID0gbm93KCk7XG5cbiAgICAgIC8vIGRlZmluZSBzY3JvbGwgY29udGV4dFxuICAgICAgaWYgKGVsID09PSBkLmJvZHkpIHtcbiAgICAgICAgc2Nyb2xsYWJsZSA9IHc7XG4gICAgICAgIHN0YXJ0WCA9IHcuc2Nyb2xsWCB8fCB3LnBhZ2VYT2Zmc2V0O1xuICAgICAgICBzdGFydFkgPSB3LnNjcm9sbFkgfHwgdy5wYWdlWU9mZnNldDtcbiAgICAgICAgbWV0aG9kID0gb3JpZ2luYWwuc2Nyb2xsO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2Nyb2xsYWJsZSA9IGVsO1xuICAgICAgICBzdGFydFggPSBlbC5zY3JvbGxMZWZ0O1xuICAgICAgICBzdGFydFkgPSBlbC5zY3JvbGxUb3A7XG4gICAgICAgIG1ldGhvZCA9IHNjcm9sbEVsZW1lbnQ7XG4gICAgICB9XG5cbiAgICAgIC8vIHNjcm9sbCBsb29waW5nIG92ZXIgYSBmcmFtZVxuICAgICAgc3RlcCh7XG4gICAgICAgIHNjcm9sbGFibGU6IHNjcm9sbGFibGUsXG4gICAgICAgIG1ldGhvZDogbWV0aG9kLFxuICAgICAgICBzdGFydFRpbWU6IHN0YXJ0VGltZSxcbiAgICAgICAgc3RhcnRYOiBzdGFydFgsXG4gICAgICAgIHN0YXJ0WTogc3RhcnRZLFxuICAgICAgICB4OiB4LFxuICAgICAgICB5OiB5XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBPUklHSU5BTCBNRVRIT0RTIE9WRVJSSURFU1xuICAgIC8vIHcuc2Nyb2xsIGFuZCB3LnNjcm9sbFRvXG4gICAgdy5zY3JvbGwgPSB3LnNjcm9sbFRvID0gZnVuY3Rpb24oKSB7XG4gICAgICAvLyBhdm9pZCBhY3Rpb24gd2hlbiBubyBhcmd1bWVudHMgYXJlIHBhc3NlZFxuICAgICAgaWYgKGFyZ3VtZW50c1swXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gYXZvaWQgc21vb3RoIGJlaGF2aW9yIGlmIG5vdCByZXF1aXJlZFxuICAgICAgaWYgKHNob3VsZEJhaWxPdXQoYXJndW1lbnRzWzBdKSA9PT0gdHJ1ZSkge1xuICAgICAgICBvcmlnaW5hbC5zY3JvbGwuY2FsbChcbiAgICAgICAgICB3LFxuICAgICAgICAgIGFyZ3VtZW50c1swXS5sZWZ0ICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8gYXJndW1lbnRzWzBdLmxlZnRcbiAgICAgICAgICAgIDogdHlwZW9mIGFyZ3VtZW50c1swXSAhPT0gJ29iamVjdCdcbiAgICAgICAgICAgICAgPyBhcmd1bWVudHNbMF1cbiAgICAgICAgICAgICAgOiB3LnNjcm9sbFggfHwgdy5wYWdlWE9mZnNldCxcbiAgICAgICAgICAvLyB1c2UgdG9wIHByb3AsIHNlY29uZCBhcmd1bWVudCBpZiBwcmVzZW50IG9yIGZhbGxiYWNrIHRvIHNjcm9sbFlcbiAgICAgICAgICBhcmd1bWVudHNbMF0udG9wICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8gYXJndW1lbnRzWzBdLnRvcFxuICAgICAgICAgICAgOiBhcmd1bWVudHNbMV0gIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgICA/IGFyZ3VtZW50c1sxXVxuICAgICAgICAgICAgICA6IHcuc2Nyb2xsWSB8fCB3LnBhZ2VZT2Zmc2V0XG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBMRVQgVEhFIFNNT09USE5FU1MgQkVHSU4hXG4gICAgICBzbW9vdGhTY3JvbGwuY2FsbChcbiAgICAgICAgdyxcbiAgICAgICAgZC5ib2R5LFxuICAgICAgICBhcmd1bWVudHNbMF0ubGVmdCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgPyB+fmFyZ3VtZW50c1swXS5sZWZ0XG4gICAgICAgICAgOiB3LnNjcm9sbFggfHwgdy5wYWdlWE9mZnNldCxcbiAgICAgICAgYXJndW1lbnRzWzBdLnRvcCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgPyB+fmFyZ3VtZW50c1swXS50b3BcbiAgICAgICAgICA6IHcuc2Nyb2xsWSB8fCB3LnBhZ2VZT2Zmc2V0XG4gICAgICApO1xuICAgIH07XG5cbiAgICAvLyB3LnNjcm9sbEJ5XG4gICAgdy5zY3JvbGxCeSA9IGZ1bmN0aW9uKCkge1xuICAgICAgLy8gYXZvaWQgYWN0aW9uIHdoZW4gbm8gYXJndW1lbnRzIGFyZSBwYXNzZWRcbiAgICAgIGlmIChhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIGF2b2lkIHNtb290aCBiZWhhdmlvciBpZiBub3QgcmVxdWlyZWRcbiAgICAgIGlmIChzaG91bGRCYWlsT3V0KGFyZ3VtZW50c1swXSkpIHtcbiAgICAgICAgb3JpZ2luYWwuc2Nyb2xsQnkuY2FsbChcbiAgICAgICAgICB3LFxuICAgICAgICAgIGFyZ3VtZW50c1swXS5sZWZ0ICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8gYXJndW1lbnRzWzBdLmxlZnRcbiAgICAgICAgICAgIDogdHlwZW9mIGFyZ3VtZW50c1swXSAhPT0gJ29iamVjdCcgPyBhcmd1bWVudHNbMF0gOiAwLFxuICAgICAgICAgIGFyZ3VtZW50c1swXS50b3AgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyBhcmd1bWVudHNbMF0udG9wXG4gICAgICAgICAgICA6IGFyZ3VtZW50c1sxXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzFdIDogMFxuICAgICAgICApO1xuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gTEVUIFRIRSBTTU9PVEhORVNTIEJFR0lOIVxuICAgICAgc21vb3RoU2Nyb2xsLmNhbGwoXG4gICAgICAgIHcsXG4gICAgICAgIGQuYm9keSxcbiAgICAgICAgfn5hcmd1bWVudHNbMF0ubGVmdCArICh3LnNjcm9sbFggfHwgdy5wYWdlWE9mZnNldCksXG4gICAgICAgIH5+YXJndW1lbnRzWzBdLnRvcCArICh3LnNjcm9sbFkgfHwgdy5wYWdlWU9mZnNldClcbiAgICAgICk7XG4gICAgfTtcblxuICAgIC8vIEVsZW1lbnQucHJvdG90eXBlLnNjcm9sbCBhbmQgRWxlbWVudC5wcm90b3R5cGUuc2Nyb2xsVG9cbiAgICBFbGVtZW50LnByb3RvdHlwZS5zY3JvbGwgPSBFbGVtZW50LnByb3RvdHlwZS5zY3JvbGxUbyA9IGZ1bmN0aW9uKCkge1xuICAgICAgLy8gYXZvaWQgYWN0aW9uIHdoZW4gbm8gYXJndW1lbnRzIGFyZSBwYXNzZWRcbiAgICAgIGlmIChhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIGF2b2lkIHNtb290aCBiZWhhdmlvciBpZiBub3QgcmVxdWlyZWRcbiAgICAgIGlmIChzaG91bGRCYWlsT3V0KGFyZ3VtZW50c1swXSkgPT09IHRydWUpIHtcbiAgICAgICAgLy8gaWYgb25lIG51bWJlciBpcyBwYXNzZWQsIHRocm93IGVycm9yIHRvIG1hdGNoIEZpcmVmb3ggaW1wbGVtZW50YXRpb25cbiAgICAgICAgaWYgKHR5cGVvZiBhcmd1bWVudHNbMF0gPT09ICdudW1iZXInICYmIGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFN5bnRheEVycm9yKCdWYWx1ZSBjb3VsZCBub3QgYmUgY29udmVydGVkJyk7XG4gICAgICAgIH1cblxuICAgICAgICBvcmlnaW5hbC5lbGVtZW50U2Nyb2xsLmNhbGwoXG4gICAgICAgICAgdGhpcyxcbiAgICAgICAgICAvLyB1c2UgbGVmdCBwcm9wLCBmaXJzdCBudW1iZXIgYXJndW1lbnQgb3IgZmFsbGJhY2sgdG8gc2Nyb2xsTGVmdFxuICAgICAgICAgIGFyZ3VtZW50c1swXS5sZWZ0ICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8gfn5hcmd1bWVudHNbMF0ubGVmdFxuICAgICAgICAgICAgOiB0eXBlb2YgYXJndW1lbnRzWzBdICE9PSAnb2JqZWN0JyA/IH5+YXJndW1lbnRzWzBdIDogdGhpcy5zY3JvbGxMZWZ0LFxuICAgICAgICAgIC8vIHVzZSB0b3AgcHJvcCwgc2Vjb25kIGFyZ3VtZW50IG9yIGZhbGxiYWNrIHRvIHNjcm9sbFRvcFxuICAgICAgICAgIGFyZ3VtZW50c1swXS50b3AgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyB+fmFyZ3VtZW50c1swXS50b3BcbiAgICAgICAgICAgIDogYXJndW1lbnRzWzFdICE9PSB1bmRlZmluZWQgPyB+fmFyZ3VtZW50c1sxXSA6IHRoaXMuc2Nyb2xsVG9wXG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB2YXIgbGVmdCA9IGFyZ3VtZW50c1swXS5sZWZ0O1xuICAgICAgdmFyIHRvcCA9IGFyZ3VtZW50c1swXS50b3A7XG5cbiAgICAgIC8vIExFVCBUSEUgU01PT1RITkVTUyBCRUdJTiFcbiAgICAgIHNtb290aFNjcm9sbC5jYWxsKFxuICAgICAgICB0aGlzLFxuICAgICAgICB0aGlzLFxuICAgICAgICB0eXBlb2YgbGVmdCA9PT0gJ3VuZGVmaW5lZCcgPyB0aGlzLnNjcm9sbExlZnQgOiB+fmxlZnQsXG4gICAgICAgIHR5cGVvZiB0b3AgPT09ICd1bmRlZmluZWQnID8gdGhpcy5zY3JvbGxUb3AgOiB+fnRvcFxuICAgICAgKTtcbiAgICB9O1xuXG4gICAgLy8gRWxlbWVudC5wcm90b3R5cGUuc2Nyb2xsQnlcbiAgICBFbGVtZW50LnByb3RvdHlwZS5zY3JvbGxCeSA9IGZ1bmN0aW9uKCkge1xuICAgICAgLy8gYXZvaWQgYWN0aW9uIHdoZW4gbm8gYXJndW1lbnRzIGFyZSBwYXNzZWRcbiAgICAgIGlmIChhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIGF2b2lkIHNtb290aCBiZWhhdmlvciBpZiBub3QgcmVxdWlyZWRcbiAgICAgIGlmIChzaG91bGRCYWlsT3V0KGFyZ3VtZW50c1swXSkgPT09IHRydWUpIHtcbiAgICAgICAgb3JpZ2luYWwuZWxlbWVudFNjcm9sbC5jYWxsKFxuICAgICAgICAgIHRoaXMsXG4gICAgICAgICAgYXJndW1lbnRzWzBdLmxlZnQgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyB+fmFyZ3VtZW50c1swXS5sZWZ0ICsgdGhpcy5zY3JvbGxMZWZ0XG4gICAgICAgICAgICA6IH5+YXJndW1lbnRzWzBdICsgdGhpcy5zY3JvbGxMZWZ0LFxuICAgICAgICAgIGFyZ3VtZW50c1swXS50b3AgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyB+fmFyZ3VtZW50c1swXS50b3AgKyB0aGlzLnNjcm9sbFRvcFxuICAgICAgICAgICAgOiB+fmFyZ3VtZW50c1sxXSArIHRoaXMuc2Nyb2xsVG9wXG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB0aGlzLnNjcm9sbCh7XG4gICAgICAgIGxlZnQ6IH5+YXJndW1lbnRzWzBdLmxlZnQgKyB0aGlzLnNjcm9sbExlZnQsXG4gICAgICAgIHRvcDogfn5hcmd1bWVudHNbMF0udG9wICsgdGhpcy5zY3JvbGxUb3AsXG4gICAgICAgIGJlaGF2aW9yOiBhcmd1bWVudHNbMF0uYmVoYXZpb3JcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICAvLyBFbGVtZW50LnByb3RvdHlwZS5zY3JvbGxJbnRvVmlld1xuICAgIEVsZW1lbnQucHJvdG90eXBlLnNjcm9sbEludG9WaWV3ID0gZnVuY3Rpb24oKSB7XG4gICAgICAvLyBhdm9pZCBzbW9vdGggYmVoYXZpb3IgaWYgbm90IHJlcXVpcmVkXG4gICAgICBpZiAoc2hvdWxkQmFpbE91dChhcmd1bWVudHNbMF0pID09PSB0cnVlKSB7XG4gICAgICAgIG9yaWdpbmFsLnNjcm9sbEludG9WaWV3LmNhbGwoXG4gICAgICAgICAgdGhpcyxcbiAgICAgICAgICBhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCA/IHRydWUgOiBhcmd1bWVudHNbMF1cbiAgICAgICAgKTtcblxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIExFVCBUSEUgU01PT1RITkVTUyBCRUdJTiFcbiAgICAgIHZhciBzY3JvbGxhYmxlUGFyZW50ID0gZmluZFNjcm9sbGFibGVQYXJlbnQodGhpcyk7XG4gICAgICB2YXIgcGFyZW50UmVjdHMgPSBzY3JvbGxhYmxlUGFyZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgdmFyIGNsaWVudFJlY3RzID0gdGhpcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcblxuICAgICAgaWYgKHNjcm9sbGFibGVQYXJlbnQgIT09IGQuYm9keSkge1xuICAgICAgICAvLyByZXZlYWwgZWxlbWVudCBpbnNpZGUgcGFyZW50XG4gICAgICAgIHNtb290aFNjcm9sbC5jYWxsKFxuICAgICAgICAgIHRoaXMsXG4gICAgICAgICAgc2Nyb2xsYWJsZVBhcmVudCxcbiAgICAgICAgICBzY3JvbGxhYmxlUGFyZW50LnNjcm9sbExlZnQgKyBjbGllbnRSZWN0cy5sZWZ0IC0gcGFyZW50UmVjdHMubGVmdCxcbiAgICAgICAgICBzY3JvbGxhYmxlUGFyZW50LnNjcm9sbFRvcCArIGNsaWVudFJlY3RzLnRvcCAtIHBhcmVudFJlY3RzLnRvcFxuICAgICAgICApO1xuXG4gICAgICAgIC8vIHJldmVhbCBwYXJlbnQgaW4gdmlld3BvcnQgdW5sZXNzIGlzIGZpeGVkXG4gICAgICAgIGlmICh3LmdldENvbXB1dGVkU3R5bGUoc2Nyb2xsYWJsZVBhcmVudCkucG9zaXRpb24gIT09ICdmaXhlZCcpIHtcbiAgICAgICAgICB3LnNjcm9sbEJ5KHtcbiAgICAgICAgICAgIGxlZnQ6IHBhcmVudFJlY3RzLmxlZnQsXG4gICAgICAgICAgICB0b3A6IHBhcmVudFJlY3RzLnRvcCxcbiAgICAgICAgICAgIGJlaGF2aW9yOiAnc21vb3RoJ1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyByZXZlYWwgZWxlbWVudCBpbiB2aWV3cG9ydFxuICAgICAgICB3LnNjcm9sbEJ5KHtcbiAgICAgICAgICBsZWZ0OiBjbGllbnRSZWN0cy5sZWZ0LFxuICAgICAgICAgIHRvcDogY2xpZW50UmVjdHMudG9wLFxuICAgICAgICAgIGJlaGF2aW9yOiAnc21vb3RoJ1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgaWYgKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykge1xuICAgIC8vIGNvbW1vbmpzXG4gICAgbW9kdWxlLmV4cG9ydHMgPSB7IHBvbHlmaWxsOiBwb2x5ZmlsbCB9O1xuICB9IGVsc2Uge1xuICAgIC8vIGdsb2JhbFxuICAgIHBvbHlmaWxsKCk7XG4gIH1cblxufSgpKTtcbiIsImNvbnN0IERCID0gJ2h0dHBzOi8vbmV4dXMtY2F0YWxvZy5maXJlYmFzZWlvLmNvbS9wb3N0cy5qc29uP2F1dGg9N2c3cHlLS3lrTjNONWV3ckltaE9hUzZ2d3JGc2M1Zktrcms4ZWp6Zic7XG5jb25zdCBhbHBoYWJldCA9IFsnYScsICdiJywgJ2MnLCAnZCcsICdlJywgJ2YnLCAnZycsICdoJywgJ2knLCAnaicsICdrJywgJ2wnLCAnbScsICduJywgJ28nLCAncCcsICdyJywgJ3MnLCAndCcsICd1JywgJ3YnLCAndycsICd5JywgJ3onXTtcblxuY29uc3QgJGxvYWRpbmcgPSBBcnJheS5mcm9tKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5sb2FkaW5nJykpO1xuY29uc3QgJG5hdiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdqcy1uYXYnKTtcbmNvbnN0ICRwYXJhbGxheCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5wYXJhbGxheCcpO1xuY29uc3QgJGNvbnRlbnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuY29udGVudCcpO1xuY29uc3QgJHRpdGxlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2pzLXRpdGxlJyk7XG5jb25zdCAkYXJyb3cgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuYXJyb3cnKTtcbmNvbnN0ICRtb2RhbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5tb2RhbCcpO1xuY29uc3QgJGxpZ2h0Ym94ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmxpZ2h0Ym94Jyk7XG5jb25zdCAkdmlldyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5saWdodGJveC12aWV3Jyk7XG5cbmV4cG9ydCB7IFxuXHREQiwgXG5cdGFscGhhYmV0LCBcblx0JGxvYWRpbmcsIFxuXHQkbmF2LCBcblx0JHBhcmFsbGF4LFxuXHQkY29udGVudCxcblx0JHRpdGxlLFxuXHQkYXJyb3csXG5cdCRtb2RhbCxcblx0JGxpZ2h0Ym94LFxuXHQkdmlldyBcbn07IiwiaW1wb3J0IHNtb290aHNjcm9sbCBmcm9tICdzbW9vdGhzY3JvbGwtcG9seWZpbGwnO1xuXG5pbXBvcnQgeyBhcnRpY2xlVGVtcGxhdGUsIHJlbmRlck5hdkxnIH0gZnJvbSAnLi90ZW1wbGF0ZXMnO1xuaW1wb3J0IHsgZGVib3VuY2UsIGhpZGVMb2FkaW5nLCBzY3JvbGxUb1RvcCwgbWFrZVNsaWRlciB9IGZyb20gJy4vdXRpbHMnO1xuXG5pbXBvcnQgeyBEQiwgYWxwaGFiZXQsICRuYXYsICRwYXJhbGxheCwgJGNvbnRlbnQsICR0aXRsZSwgJGFycm93LCAkbW9kYWwsICRsaWdodGJveCwgJHZpZXcgfSBmcm9tICcuL2NvbnN0YW50cyc7XG5cblxubGV0IHNvcnRLZXkgPSAwOyAvLyAwID0gYXJ0aXN0LCAxID0gdGl0bGVcbmxldCBlbnRyaWVzID0geyBieUF1dGhvcjogW10sIGJ5VGl0bGU6IFtdIH07XG5sZXQgY3VycmVudExldHRlciA9ICdBJztcbmxldCBtb2RhbCA9IGZhbHNlO1xubGV0IGxpZ2h0Ym94ID0gZmFsc2U7XG5cbmNvbnN0IGF0dGFjaEltYWdlTGlzdGVuZXJzID0gKCkgPT4ge1xuXHRjb25zdCAkaW1hZ2VzID0gQXJyYXkuZnJvbShkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuYXJ0aWNsZS1pbWFnZScpKTtcblxuXHQkaW1hZ2VzLmZvckVhY2goaW1nID0+IHtcblx0XHRpbWcuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZXZ0KSA9PiB7XG5cdFx0XHRpZiAoIWxpZ2h0Ym94KSB7XG5cdFx0XHRcdGxldCBzcmMgPSBpbWcuc3JjO1xuXHRcdFx0XHRcblx0XHRcdFx0JGxpZ2h0Ym94LmNsYXNzTGlzdC5hZGQoJ3Nob3ctaW1nJyk7XG5cdFx0XHRcdCR2aWV3LnNldEF0dHJpYnV0ZSgnc3R5bGUnLCBgYmFja2dyb3VuZC1pbWFnZTogdXJsKCR7c3JjfSlgKTtcblx0XHRcdFx0bGlnaHRib3ggPSB0cnVlO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9KTtcblxuXHQkdmlldy5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHRpZiAobGlnaHRib3gpIHtcblx0XHRcdCRsaWdodGJveC5jbGFzc0xpc3QucmVtb3ZlKCdzaG93LWltZycpO1xuXHRcdFx0bGlnaHRib3ggPSBmYWxzZTtcblx0XHR9XG5cdH0pO1xufTtcblxuY29uc3QgYXR0YWNoTW9kYWxMaXN0ZW5lcnMgPSAoKSA9PiB7XG5cdGNvbnN0ICRmaW5kID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2pzLWZpbmQnKTtcblx0XG5cdCRmaW5kLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuXHRcdCRtb2RhbC5jbGFzc0xpc3QuYWRkKCdzaG93Jyk7XG5cdFx0bW9kYWwgPSB0cnVlO1xuXHR9KTtcblxuXHQkbW9kYWwuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0JG1vZGFsLmNsYXNzTGlzdC5yZW1vdmUoJ3Nob3cnKTtcblx0XHRtb2RhbCA9IGZhbHNlO1xuXHR9KTtcblxuXHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsICgpID0+IHtcblx0XHRpZiAobW9kYWwpIHtcblx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge1xuXHRcdFx0XHQkbW9kYWwuY2xhc3NMaXN0LnJlbW92ZSgnc2hvdycpO1xuXHRcdFx0XHRtb2RhbCA9IGZhbHNlO1xuXHRcdFx0fSwgNjAwKTtcblx0XHR9O1xuXHR9KTtcbn1cblxubGV0IHByZXY7XG5sZXQgY3VycmVudCA9IDA7XG5sZXQgaXNTaG93aW5nID0gZmFsc2U7XG5jb25zdCBhdHRhY2hBcnJvd0xpc3RlbmVycyA9ICgpID0+IHtcblx0JGFycm93LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuXHRcdHNjcm9sbFRvVG9wKCk7XG5cdH0pO1xuXG5cdCRwYXJhbGxheC5hZGRFdmVudExpc3RlbmVyKCdzY3JvbGwnLCAoKSA9PiB7XG5cblx0XHRsZXQgeSA9ICR0aXRsZS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS55O1xuXHRcdGlmIChjdXJyZW50ICE9PSB5KSB7XG5cdFx0XHRwcmV2ID0gY3VycmVudDtcblx0XHRcdGN1cnJlbnQgPSB5O1xuXHRcdH1cblxuXHRcdGlmICh5IDw9IC01MCAmJiAhaXNTaG93aW5nKSB7XG5cdFx0XHQkYXJyb3cuY2xhc3NMaXN0LmFkZCgnc2hvdycpO1xuXHRcdFx0aXNTaG93aW5nID0gdHJ1ZTtcblx0XHR9IGVsc2UgaWYgKHkgPiAtNTAgJiYgaXNTaG93aW5nKSB7XG5cdFx0XHQkYXJyb3cuY2xhc3NMaXN0LnJlbW92ZSgnc2hvdycpO1xuXHRcdFx0aXNTaG93aW5nID0gZmFsc2U7XG5cdFx0fVxuXHR9KTtcbn07XG5cbmNvbnN0IGFkZFNvcnRCdXR0b25MaXN0ZW5lcnMgPSAoKSA9PiB7XG5cdGxldCAkYnlBcnRpc3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnanMtYnktYXJ0aXN0Jyk7XG5cdGxldCAkYnlUaXRsZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdqcy1ieS10aXRsZScpO1xuXHQkYnlBcnRpc3QuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0aWYgKHNvcnRLZXkpIHtcblx0XHRcdHNjcm9sbFRvVG9wKCk7XG5cdFx0XHRzb3J0S2V5ID0gMDtcblx0XHRcdCRieUFydGlzdC5jbGFzc0xpc3QuYWRkKCdhY3RpdmUnKTtcblx0XHRcdCRieVRpdGxlLmNsYXNzTGlzdC5yZW1vdmUoJ2FjdGl2ZScpO1xuXG5cdFx0XHRyZW5kZXJFbnRyaWVzKCk7XG5cdFx0fVxuXHR9KTtcblxuXHQkYnlUaXRsZS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHRpZiAoIXNvcnRLZXkpIHtcblx0XHRcdHNjcm9sbFRvVG9wKCk7XG5cdFx0XHRzb3J0S2V5ID0gMTtcblx0XHRcdCRieVRpdGxlLmNsYXNzTGlzdC5hZGQoJ2FjdGl2ZScpO1xuXHRcdFx0JGJ5QXJ0aXN0LmNsYXNzTGlzdC5yZW1vdmUoJ2FjdGl2ZScpO1xuXG5cdFx0XHRyZW5kZXJFbnRyaWVzKCk7XG5cdFx0fVxuXHR9KTtcbn07XG5cbmNvbnN0IGZpbmRGaXJzdEVudHJ5ID0gKGNoYXIpID0+IHtcblx0Y29uc3Qgc2VsZWN0b3IgPSBzb3J0S2V5ID8gJy5qcy1lbnRyeS10aXRsZScgOiAnLmpzLWVudHJ5LWFydGlzdCc7XG5cdGNvbnN0IHByZXZTZWxlY3RvciA9ICFzb3J0S2V5ID8gJy5qcy1lbnRyeS10aXRsZScgOiAnLmpzLWVudHJ5LWFydGlzdCc7XG5cblx0Y29uc3QgJGVudHJpZXMgPSBBcnJheS5mcm9tKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpKTtcblx0Y29uc3QgJHByZXZFbnRyaWVzID0gQXJyYXkuZnJvbShkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKHByZXZTZWxlY3RvcikpO1xuXG5cdCRwcmV2RW50cmllcy5mb3JFYWNoKGVudHJ5ID0+IGVudHJ5LnJlbW92ZUF0dHJpYnV0ZSgnbmFtZScpKTtcblxuXHRyZXR1cm4gJGVudHJpZXMuZmluZChlbnRyeSA9PiB7XG5cdFx0bGV0IG5vZGUgPSBlbnRyeS5uZXh0RWxlbWVudFNpYmxpbmc7XG5cdFx0cmV0dXJuIG5vZGUuaW5uZXJIVE1MWzBdID09PSBjaGFyIHx8IG5vZGUuaW5uZXJIVE1MWzBdID09PSBjaGFyLnRvVXBwZXJDYXNlKCk7XG5cdH0pO1xufTtcblxuY29uc3QgbWFrZUFscGhhYmV0ID0gKCkgPT4ge1xuXHRjb25zdCBhdHRhY2hBbmNob3JMaXN0ZW5lciA9ICgkYW5jaG9yLCBsZXR0ZXIpID0+IHtcblx0XHQkYW5jaG9yLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuXHRcdFx0Y29uc3QgbGV0dGVyTm9kZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGxldHRlcik7XG5cdFx0XHRsZXQgdGFyZ2V0O1xuXG5cdFx0XHRpZiAoIXNvcnRLZXkpIHtcblx0XHRcdFx0dGFyZ2V0ID0gbGV0dGVyID09PSAnYScgPyBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYW5jaG9yLXRhcmdldCcpIDogbGV0dGVyTm9kZS5wYXJlbnRFbGVtZW50LnBhcmVudEVsZW1lbnQucGFyZW50RWxlbWVudC5wYXJlbnRFbGVtZW50LnByZXZpb3VzRWxlbWVudFNpYmxpbmcucXVlcnlTZWxlY3RvcignLmpzLWFydGljbGUtYW5jaG9yLXRhcmdldCcpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGFyZ2V0ID0gbGV0dGVyID09PSAnYScgPyBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYW5jaG9yLXRhcmdldCcpIDogbGV0dGVyTm9kZS5wYXJlbnRFbGVtZW50LnBhcmVudEVsZW1lbnQucGFyZW50RWxlbWVudC5wcmV2aW91c0VsZW1lbnRTaWJsaW5nLnF1ZXJ5U2VsZWN0b3IoJy5qcy1hcnRpY2xlLWFuY2hvci10YXJnZXQnKTtcblx0XHRcdH07XG5cblx0XHRcdHRhcmdldC5zY3JvbGxJbnRvVmlldyh7YmVoYXZpb3I6IFwic21vb3RoXCIsIGJsb2NrOiBcInN0YXJ0XCJ9KTtcblx0XHR9KTtcblx0fTtcblxuXHRsZXQgYWN0aXZlRW50cmllcyA9IHt9O1xuXHRsZXQgJG91dGVyID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmFscGhhYmV0X19sZXR0ZXJzJyk7XG5cdCRvdXRlci5pbm5lckhUTUwgPSAnJztcblxuXHRhbHBoYWJldC5mb3JFYWNoKGxldHRlciA9PiB7XG5cdFx0bGV0ICRmaXJzdEVudHJ5ID0gZmluZEZpcnN0RW50cnkobGV0dGVyKTtcblx0XHRsZXQgJGFuY2hvciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcblxuXHRcdGlmICghJGZpcnN0RW50cnkpIHJldHVybjtcblxuXHRcdCRmaXJzdEVudHJ5LmlkID0gbGV0dGVyO1xuXHRcdCRhbmNob3IuaW5uZXJIVE1MID0gbGV0dGVyLnRvVXBwZXJDYXNlKCk7XG5cdFx0JGFuY2hvci5jbGFzc05hbWUgPSAnYWxwaGFiZXRfX2xldHRlci1hbmNob3InO1xuXG5cdFx0YXR0YWNoQW5jaG9yTGlzdGVuZXIoJGFuY2hvciwgbGV0dGVyKTtcblx0XHQkb3V0ZXIuYXBwZW5kQ2hpbGQoJGFuY2hvcik7XG5cdH0pO1xufTtcblxuY29uc3QgcmVuZGVyRW50cmllcyA9ICgpID0+IHtcblx0Y29uc3QgJGFydGljbGVMaXN0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2pzLWxpc3QnKTtcblx0Y29uc3QgZW50cmllc0xpc3QgPSBzb3J0S2V5ID8gZW50cmllcy5ieVRpdGxlIDogZW50cmllcy5ieUF1dGhvcjtcblxuXHQkYXJ0aWNsZUxpc3QuaW5uZXJIVE1MID0gJyc7XG5cblx0ZW50cmllc0xpc3QuZm9yRWFjaCgoZW50cnksIGkpID0+IHtcblx0XHQkYXJ0aWNsZUxpc3QuaW5zZXJ0QWRqYWNlbnRIVE1MKCdiZWZvcmVlbmQnLCBhcnRpY2xlVGVtcGxhdGUoZW50cnksIGkpKTtcblx0XHRtYWtlU2xpZGVyKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGBzbGlkZXItJHtpfWApKTtcblx0fSk7XG5cblx0YXR0YWNoSW1hZ2VMaXN0ZW5lcnMoKTtcblx0bWFrZUFscGhhYmV0KCk7XG59O1xuXG5jb25zdCBzZXREYXRhQW5kU29ydEJ5VGl0bGUgPSAoZGF0YSkgPT4ge1xuXHRlbnRyaWVzLmJ5QXV0aG9yID0gZGF0YTtcblx0ZW50cmllcy5ieVRpdGxlID0gZGF0YS5zbGljZSgpOyAvLyBjb3BpZXMgZGF0YSBmb3IgYnlUaXRsZSBzb3J0XG5cblx0ZW50cmllcy5ieVRpdGxlLnNvcnQoKGEsIGIpID0+IHtcblx0XHRsZXQgYVRpdGxlID0gYS50aXRsZVswXS50b1VwcGVyQ2FzZSgpO1xuXHRcdGxldCBiVGl0bGUgPSBiLnRpdGxlWzBdLnRvVXBwZXJDYXNlKCk7XG5cdFx0aWYgKGFUaXRsZSA+IGJUaXRsZSkgcmV0dXJuIDE7XG5cdFx0ZWxzZSBpZiAoYVRpdGxlIDwgYlRpdGxlKSByZXR1cm4gLTE7XG5cdFx0ZWxzZSByZXR1cm4gMDtcblx0fSk7XG59O1xuXG5jb25zdCBmZXRjaERhdGEgPSAoKSA9PiB7XG5cdGZldGNoKERCKS50aGVuKHJlcyA9PiByZXMuanNvbigpKVxuXHQudGhlbihkYXRhID0+IHtcblx0XHRzZXREYXRhQW5kU29ydEJ5VGl0bGUoZGF0YSk7XG5cdFx0cmVuZGVyRW50cmllcygpO1xuXHRcdGhpZGVMb2FkaW5nKCk7XG5cdH0pXG5cdC5jYXRjaChlcnIgPT4gY29uc29sZS53YXJuKGVycikpO1xufTtcblxuY29uc3QgaW5pdCA9ICgpID0+IHtcblx0c21vb3Roc2Nyb2xsLnBvbHlmaWxsKCk7XG5cdGZldGNoRGF0YSgpO1xuXG5cdHJlbmRlck5hdkxnKCk7XG5cdGFkZFNvcnRCdXR0b25MaXN0ZW5lcnMoKTtcblx0YXR0YWNoQXJyb3dMaXN0ZW5lcnMoKTtcblx0YXR0YWNoTW9kYWxMaXN0ZW5lcnMoKTtcbn1cblxuaW5pdCgpO1xuIiwiY29uc3QgaW1hZ2VUZW1wbGF0ZSA9IChpbWFnZSkgPT4gYDxpbWcgY2xhc3M9XCJhcnRpY2xlLWltZ1wiIHNyYz1cIi4uLy4uL2Fzc2V0cy9pbWFnZXMvJHtpbWFnZX1cIj48L2ltZz5gO1xuXG5jb25zdCBhcnRpY2xlVGVtcGxhdGUgPSAoZW50cnksIGkpID0+IHtcblx0Y29uc3QgeyB0aXRsZSwgZmlyc3ROYW1lLCBsYXN0TmFtZSwgaW1hZ2VzLCBkZXNjcmlwdGlvbiwgZGV0YWlsIH0gPSBlbnRyeTtcblxuXHRjb25zdCBpbWFnZUhUTUwgPSBpbWFnZXMubGVuZ3RoID8gXG5cdFx0aW1hZ2VzLm1hcChpbWFnZSA9PiBpbWFnZVRlbXBsYXRlKGltYWdlKSkuam9pbignJykgOiAnJztcblxuXHRyZXR1cm4gIGBcblx0XHQ8YXJ0aWNsZSBjbGFzcz1cImFydGljbGVfX291dGVyXCI+XG5cdFx0XHQ8ZGl2IGNsYXNzPVwiYXJ0aWNsZV9faW5uZXJcIj5cblx0XHRcdFx0PGRpdiBjbGFzcz1cImFydGljbGVfX2hlYWRpbmdcIj5cblx0XHRcdFx0XHQ8YSBjbGFzcz1cImpzLWVudHJ5LXRpdGxlXCI+PC9hPlxuXHRcdFx0XHRcdDxoMiBjbGFzcz1cImFydGljbGUtaGVhZGluZ19fdGl0bGVcIj4ke3RpdGxlfTwvaDI+XG5cdFx0XHRcdFx0PGRpdiBjbGFzcz1cImFydGljbGUtaGVhZGluZ19fbmFtZVwiPlxuXHRcdFx0XHRcdFx0PHNwYW4gY2xhc3M9XCJhcnRpY2xlLWhlYWRpbmdfX25hbWUtLWZpcnN0XCI+JHtmaXJzdE5hbWV9PC9zcGFuPlxuXHRcdFx0XHRcdFx0PGEgY2xhc3M9XCJqcy1lbnRyeS1hcnRpc3RcIj48L2E+XG5cdFx0XHRcdFx0XHQ8c3BhbiBjbGFzcz1cImFydGljbGUtaGVhZGluZ19fbmFtZS0tbGFzdFwiPiR7bGFzdE5hbWV9PC9zcGFuPlxuXHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHQ8L2Rpdj5cdFxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVwiYXJ0aWNsZV9fc2xpZGVyLW91dGVyXCI+XG5cdFx0XHRcdFx0PGRpdiBjbGFzcz1cImFydGljbGVfX3NsaWRlci1pbm5lclwiIGlkPVwic2xpZGVyLSR7aX1cIj5cblx0XHRcdFx0XHRcdCR7aW1hZ2VIVE1MfVxuXHRcdFx0XHRcdFx0PGRpdiBjbGFzcz1cImFydGljbGUtZGVzY3JpcHRpb25fX291dGVyXCI+XG5cdFx0XHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlLWRlc2NyaXB0aW9uXCI+JHtkZXNjcmlwdGlvbn08L2Rpdj5cblx0XHRcdFx0XHRcdFx0PGRpdiBjbGFzcz1cImFydGljbGUtZGV0YWlsXCI+JHtkZXRhaWx9PC9kaXY+XG5cdFx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0XHQ8ZGl2IGNsYXNzPVwiYXJ0aWNsZV9fc2Nyb2xsLWNvbnRyb2xzXCI+XG5cdFx0XHRcdFx0XHQ8c3BhbiBjbGFzcz1cImNvbnRyb2xzIGFycm93LXByZXZcIj7ihpA8L3NwYW4+IFxuXHRcdFx0XHRcdFx0PHNwYW4gY2xhc3M9XCJjb250cm9scyBhcnJvdy1uZXh0XCI+4oaSPC9zcGFuPlxuXHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHRcdDxwIGNsYXNzPVwianMtYXJ0aWNsZS1hbmNob3ItdGFyZ2V0XCI+PC9wPlxuXHRcdFx0PC9kaXY+XG5cdFx0PC9hcnRpY2xlPlxuXHRgXG59O1xuXG5leHBvcnQgZGVmYXVsdCBhcnRpY2xlVGVtcGxhdGU7IiwiaW1wb3J0IGFydGljbGVUZW1wbGF0ZSBmcm9tICcuL2FydGljbGUnO1xuaW1wb3J0IHJlbmRlck5hdkxnIGZyb20gJy4vbmF2TGcnO1xuXG5leHBvcnQgeyBhcnRpY2xlVGVtcGxhdGUsIHJlbmRlck5hdkxnIH07IiwiY29uc3QgdGVtcGxhdGUgPSBcblx0YDxkaXYgY2xhc3M9XCJuYXZfX2lubmVyXCI+XG5cdFx0PGRpdiBjbGFzcz1cIm5hdl9fc29ydC1ieVwiPlxuXHRcdFx0PHNwYW4gY2xhc3M9XCJzb3J0LWJ5X190aXRsZVwiPlNvcnQgYnk8L3NwYW4+XG5cdFx0XHQ8YnV0dG9uIGNsYXNzPVwic29ydC1ieSBzb3J0LWJ5X19ieS1hcnRpc3QgYWN0aXZlXCIgaWQ9XCJqcy1ieS1hcnRpc3RcIj5BcnRpc3Q8L2J1dHRvbj5cblx0XHRcdDxzcGFuIGNsYXNzPVwic29ydC1ieV9fZGl2aWRlclwiPiB8IDwvc3Bhbj5cblx0XHRcdDxidXR0b24gY2xhc3M9XCJzb3J0LWJ5IHNvcnQtYnlfX2J5LXRpdGxlXCIgaWQ9XCJqcy1ieS10aXRsZVwiPlRpdGxlPC9idXR0b24+XG5cdFx0XHQ8c3BhbiBjbGFzcz1cImZpbmRcIiBpZD1cImpzLWZpbmRcIj5cblx0XHRcdFx0KDxzcGFuIGNsYXNzPVwiZmluZC0taW5uZXJcIj4mIzg5ODQ7Rjwvc3Bhbj4pXG5cdFx0XHQ8L3NwYW4+XG5cdFx0PC9kaXY+XG5cdFx0PGRpdiBjbGFzcz1cIm5hdl9fYWxwaGFiZXRcIj5cblx0XHRcdDxzcGFuIGNsYXNzPVwiYWxwaGFiZXRfX3RpdGxlXCI+R28gdG88L3NwYW4+XG5cdFx0XHQ8ZGl2IGNsYXNzPVwiYWxwaGFiZXRfX2xldHRlcnNcIj48L2Rpdj5cblx0XHQ8L2Rpdj5cblx0PC9kaXY+YDtcblxuY29uc3QgcmVuZGVyTmF2TGcgPSAoKSA9PiB7XG5cdGxldCBuYXZPdXRlciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdqcy1uYXYnKTtcblx0bmF2T3V0ZXIuaW5uZXJIVE1MID0gdGVtcGxhdGU7XG59O1xuXG5leHBvcnQgZGVmYXVsdCByZW5kZXJOYXZMZzsiLCJpbXBvcnQgeyAkbG9hZGluZywgJG5hdiwgJHBhcmFsbGF4LCAkY29udGVudCwgJHRpdGxlLCAkYXJyb3csICRtb2RhbCwgJGxpZ2h0Ym94LCAkdmlldyB9IGZyb20gJy4uL2NvbnN0YW50cyc7XG5cbmNvbnN0IGRlYm91bmNlID0gKGZuLCB0aW1lKSA9PiB7XG4gIGxldCB0aW1lb3V0O1xuXG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICBjb25zdCBmdW5jdGlvbkNhbGwgPSAoKSA9PiBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIFxuICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICB0aW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbkNhbGwsIHRpbWUpO1xuICB9XG59O1xuXG5jb25zdCBoaWRlTG9hZGluZyA9ICgpID0+IHtcblx0JGxvYWRpbmcuZm9yRWFjaChlbGVtID0+IGVsZW0uY2xhc3NMaXN0LmFkZCgncmVhZHknKSk7XG5cdCRuYXYuY2xhc3NMaXN0LmFkZCgncmVhZHknKTtcbn07XG5cbmNvbnN0IHNjcm9sbFRvVG9wID0gKCkgPT4ge1xuXHRsZXQgdG9wID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2FuY2hvci10YXJnZXQnKTtcblx0dG9wLnNjcm9sbEludG9WaWV3KHtiZWhhdmlvcjogXCJzbW9vdGhcIiwgYmxvY2s6IFwic3RhcnRcIn0pO1xufTtcblxuY29uc3QgbWFrZVNsaWRlciA9ICgkc2xpZGVyKSA9PiB7XG5cdGNvbnN0ICRhcnJvd05leHQgPSAkc2xpZGVyLnBhcmVudEVsZW1lbnQucXVlcnlTZWxlY3RvcignLmFycm93LW5leHQnKTtcblx0Y29uc3QgJGFycm93UHJldiA9ICRzbGlkZXIucGFyZW50RWxlbWVudC5xdWVyeVNlbGVjdG9yKCcuYXJyb3ctcHJldicpO1xuXG5cdGxldCBjdXJyZW50ID0gJHNsaWRlci5maXJzdEVsZW1lbnRDaGlsZDtcblx0JGFycm93TmV4dC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHRjb25zdCBuZXh0ID0gY3VycmVudC5uZXh0RWxlbWVudFNpYmxpbmc7XG5cdFx0aWYgKG5leHQpIHtcblx0XHRcdG5leHQuc2Nyb2xsSW50b1ZpZXcoe2JlaGF2aW9yOiBcInNtb290aFwiLCBibG9jazogXCJuZWFyZXN0XCIsIGlubGluZTogXCJjZW50ZXJcIn0pO1xuXHRcdFx0Y3VycmVudCA9IG5leHQ7XG5cdFx0fVxuXHR9KTtcblxuXHQkYXJyb3dQcmV2LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuXHRcdGNvbnN0IHByZXYgPSBjdXJyZW50LnByZXZpb3VzRWxlbWVudFNpYmxpbmc7XG5cdFx0aWYgKHByZXYpIHtcblx0XHRcdHByZXYuc2Nyb2xsSW50b1ZpZXcoe2JlaGF2aW9yOiBcInNtb290aFwiLCBibG9jazogXCJuZWFyZXN0XCIsIGlubGluZTogXCJjZW50ZXJcIn0pO1xuXHRcdFx0Y3VycmVudCA9IHByZXY7XG5cdFx0fVxuXHR9KVxufTtcblxuZXhwb3J0IHsgZGVib3VuY2UsIGhpZGVMb2FkaW5nLCBzY3JvbGxUb1RvcCwgbWFrZVNsaWRlciB9OyJdLCJwcmVFeGlzdGluZ0NvbW1lbnQiOiIvLyMgc291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD11dGYtODtiYXNlNjQsZXlKMlpYSnphVzl1SWpvekxDSnpiM1Z5WTJWeklqcGJJbTV2WkdWZmJXOWtkV3hsY3k5aWNtOTNjMlZ5TFhCaFkyc3ZYM0J5Wld4MVpHVXVhbk1pTENKdWIyUmxYMjF2WkhWc1pYTXZjMjF2YjNSb2MyTnliMnhzTFhCdmJIbG1hV3hzTDJScGMzUXZjMjF2YjNSb2MyTnliMnhzTG1weklpd2ljM0pqTDJwekwyTnZibk4wWVc1MGN5NXFjeUlzSW5OeVl5OXFjeTlwYm1SbGVDNXFjeUlzSW5OeVl5OXFjeTkwWlcxd2JHRjBaWE12WVhKMGFXTnNaUzVxY3lJc0luTnlZeTlxY3k5MFpXMXdiR0YwWlhNdmFXNWtaWGd1YW5NaUxDSnpjbU12YW5NdmRHVnRjR3hoZEdWekwyNWhka3huTG1weklpd2ljM0pqTDJwekwzVjBhV3h6TDJsdVpHVjRMbXB6SWwwc0ltNWhiV1Z6SWpwYlhTd2liV0Z3Y0dsdVozTWlPaUpCUVVGQk8wRkRRVUU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHM3T3pzN096dEJRM1ppUVN4SlFVRk5MRXRCUVVzc0swWkJRVmc3UVVGRFFTeEpRVUZOTEZkQlFWY3NRMEZCUXl4SFFVRkVMRVZCUVUwc1IwRkJUaXhGUVVGWExFZEJRVmdzUlVGQlowSXNSMEZCYUVJc1JVRkJjVUlzUjBGQmNrSXNSVUZCTUVJc1IwRkJNVUlzUlVGQkswSXNSMEZCTDBJc1JVRkJiME1zUjBGQmNFTXNSVUZCZVVNc1IwRkJla01zUlVGQk9FTXNSMEZCT1VNc1JVRkJiVVFzUjBGQmJrUXNSVUZCZDBRc1IwRkJlRVFzUlVGQk5rUXNSMEZCTjBRc1JVRkJhMFVzUjBGQmJFVXNSVUZCZFVVc1IwRkJka1VzUlVGQk5FVXNSMEZCTlVVc1JVRkJhVVlzUjBGQmFrWXNSVUZCYzBZc1IwRkJkRVlzUlVGQk1rWXNSMEZCTTBZc1JVRkJaMGNzUjBGQmFFY3NSVUZCY1Vjc1IwRkJja2NzUlVGQk1FY3NSMEZCTVVjc1JVRkJLMGNzUjBGQkwwY3NSVUZCYjBnc1IwRkJjRWdzUTBGQmFrSTdPMEZCUlVFc1NVRkJUU3hYUVVGWExFMUJRVTBzU1VGQlRpeERRVUZYTEZOQlFWTXNaMEpCUVZRc1EwRkJNRUlzVlVGQk1VSXNRMEZCV0N4RFFVRnFRanRCUVVOQkxFbEJRVTBzVDBGQlR5eFRRVUZUTEdOQlFWUXNRMEZCZDBJc1VVRkJlRUlzUTBGQllqdEJRVU5CTEVsQlFVMHNXVUZCV1N4VFFVRlRMR0ZCUVZRc1EwRkJkVUlzVjBGQmRrSXNRMEZCYkVJN1FVRkRRU3hKUVVGTkxGZEJRVmNzVTBGQlV5eGhRVUZVTEVOQlFYVkNMRlZCUVhaQ0xFTkJRV3BDTzBGQlEwRXNTVUZCVFN4VFFVRlRMRk5CUVZNc1kwRkJWQ3hEUVVGM1FpeFZRVUY0UWl4RFFVRm1PMEZCUTBFc1NVRkJUU3hUUVVGVExGTkJRVk1zWVVGQlZDeERRVUYxUWl4UlFVRjJRaXhEUVVGbU8wRkJRMEVzU1VGQlRTeFRRVUZUTEZOQlFWTXNZVUZCVkN4RFFVRjFRaXhSUVVGMlFpeERRVUZtTzBGQlEwRXNTVUZCVFN4WlFVRlpMRk5CUVZNc1lVRkJWQ3hEUVVGMVFpeFhRVUYyUWl4RFFVRnNRanRCUVVOQkxFbEJRVTBzVVVGQlVTeFRRVUZUTEdGQlFWUXNRMEZCZFVJc1owSkJRWFpDTEVOQlFXUTdPMUZCUjBNc1JTeEhRVUZCTEVVN1VVRkRRU3hSTEVkQlFVRXNVVHRSUVVOQkxGRXNSMEZCUVN4Uk8xRkJRMEVzU1N4SFFVRkJMRWs3VVVGRFFTeFRMRWRCUVVFc1V6dFJRVU5CTEZFc1IwRkJRU3hSTzFGQlEwRXNUU3hIUVVGQkxFMDdVVUZEUVN4TkxFZEJRVUVzVFR0UlFVTkJMRTBzUjBGQlFTeE5PMUZCUTBFc1V5eEhRVUZCTEZNN1VVRkRRU3hMTEVkQlFVRXNTenM3T3pzN1FVTjRRa1E3T3pzN1FVRkZRVHM3UVVGRFFUczdRVUZGUVRzN096dEJRVWRCTEVsQlFVa3NWVUZCVlN4RFFVRmtMRU1zUTBGQmFVSTdRVUZEYWtJc1NVRkJTU3hWUVVGVkxFVkJRVVVzVlVGQlZTeEZRVUZhTEVWQlFXZENMRk5CUVZNc1JVRkJla0lzUlVGQlpEdEJRVU5CTEVsQlFVa3NaMEpCUVdkQ0xFZEJRWEJDTzBGQlEwRXNTVUZCU1N4UlFVRlJMRXRCUVZvN1FVRkRRU3hKUVVGSkxGZEJRVmNzUzBGQlpqczdRVUZGUVN4SlFVRk5MSFZDUVVGMVFpeFRRVUYyUWl4dlFrRkJkVUlzUjBGQlRUdEJRVU5zUXl4TFFVRk5MRlZCUVZVc1RVRkJUU3hKUVVGT0xFTkJRVmNzVTBGQlV5eG5Ra0ZCVkN4RFFVRXdRaXhuUWtGQk1VSXNRMEZCV0N4RFFVRm9RanM3UVVGRlFTeFRRVUZSTEU5QlFWSXNRMEZCWjBJc1pVRkJUenRCUVVOMFFpeE5RVUZKTEdkQ1FVRktMRU5CUVhGQ0xFOUJRWEpDTEVWQlFUaENMRlZCUVVNc1IwRkJSQ3hGUVVGVE8wRkJRM1JETEU5QlFVa3NRMEZCUXl4UlFVRk1MRVZCUVdVN1FVRkRaQ3hSUVVGSkxFMUJRVTBzU1VGQlNTeEhRVUZrT3p0QlFVVkJMSGxDUVVGVkxGTkJRVllzUTBGQmIwSXNSMEZCY0VJc1EwRkJkMElzVlVGQmVFSTdRVUZEUVN4eFFrRkJUU3haUVVGT0xFTkJRVzFDTEU5QlFXNUNMRFpDUVVGeFJDeEhRVUZ5UkR0QlFVTkJMR1ZCUVZjc1NVRkJXRHRCUVVOQk8wRkJRMFFzUjBGU1JEdEJRVk5CTEVWQlZrUTdPMEZCV1VFc2EwSkJRVTBzWjBKQlFVNHNRMEZCZFVJc1QwRkJka0lzUlVGQlowTXNXVUZCVFR0QlFVTnlReXhOUVVGSkxGRkJRVW9zUlVGQll6dEJRVU5pTEhkQ1FVRlZMRk5CUVZZc1EwRkJiMElzVFVGQmNFSXNRMEZCTWtJc1ZVRkJNMEk3UVVGRFFTeGpRVUZYTEV0QlFWZzdRVUZEUVR0QlFVTkVMRVZCVEVRN1FVRk5RU3hEUVhKQ1JEczdRVUYxUWtFc1NVRkJUU3gxUWtGQmRVSXNVMEZCZGtJc2IwSkJRWFZDTEVkQlFVMDdRVUZEYkVNc1MwRkJUU3hSUVVGUkxGTkJRVk1zWTBGQlZDeERRVUYzUWl4VFFVRjRRaXhEUVVGa096dEJRVVZCTEU5QlFVMHNaMEpCUVU0c1EwRkJkVUlzVDBGQmRrSXNSVUZCWjBNc1dVRkJUVHRCUVVOeVF5eHZRa0ZCVHl4VFFVRlFMRU5CUVdsQ0xFZEJRV3BDTEVOQlFYRkNMRTFCUVhKQ08wRkJRMEVzVlVGQlVTeEpRVUZTTzBGQlEwRXNSVUZJUkRzN1FVRkxRU3h0UWtGQlR5eG5Ra0ZCVUN4RFFVRjNRaXhQUVVGNFFpeEZRVUZwUXl4WlFVRk5PMEZCUTNSRExHOUNRVUZQTEZOQlFWQXNRMEZCYVVJc1RVRkJha0lzUTBGQmQwSXNUVUZCZUVJN1FVRkRRU3hWUVVGUkxFdEJRVkk3UVVGRFFTeEZRVWhFT3p0QlFVdEJMRkZCUVU4c1owSkJRVkFzUTBGQmQwSXNVMEZCZUVJc1JVRkJiVU1zV1VGQlRUdEJRVU40UXl4TlFVRkpMRXRCUVVvc1JVRkJWenRCUVVOV0xHTkJRVmNzV1VGQlRUdEJRVU5vUWl4elFrRkJUeXhUUVVGUUxFTkJRV2xDTEUxQlFXcENMRU5CUVhkQ0xFMUJRWGhDTzBGQlEwRXNXVUZCVVN4TFFVRlNPMEZCUTBFc1NVRklSQ3hGUVVkSExFZEJTRWc3UVVGSlFUdEJRVU5FTEVWQlVFUTdRVUZSUVN4RFFYSkNSRHM3UVVGMVFrRXNTVUZCU1N4aFFVRktPMEZCUTBFc1NVRkJTU3hWUVVGVkxFTkJRV1E3UVVGRFFTeEpRVUZKTEZsQlFWa3NTMEZCYUVJN1FVRkRRU3hKUVVGTkxIVkNRVUYxUWl4VFFVRjJRaXh2UWtGQmRVSXNSMEZCVFR0QlFVTnNReXh0UWtGQlR5eG5Ra0ZCVUN4RFFVRjNRaXhQUVVGNFFpeEZRVUZwUXl4WlFVRk5PMEZCUTNSRE8wRkJRMEVzUlVGR1JEczdRVUZKUVN4elFrRkJWU3huUWtGQlZpeERRVUV5UWl4UlFVRXpRaXhGUVVGeFF5eFpRVUZOT3p0QlFVVXhReXhOUVVGSkxFbEJRVWtzYTBKQlFVOHNjVUpCUVZBc1IwRkJLMElzUTBGQmRrTTdRVUZEUVN4TlFVRkpMRmxCUVZrc1EwRkJhRUlzUlVGQmJVSTdRVUZEYkVJc1ZVRkJUeXhQUVVGUU8wRkJRMEVzWVVGQlZTeERRVUZXTzBGQlEwRTdPMEZCUlVRc1RVRkJTU3hMUVVGTExFTkJRVU1zUlVGQlRpeEpRVUZaTEVOQlFVTXNVMEZCYWtJc1JVRkJORUk3UVVGRE0wSXNjVUpCUVU4c1UwRkJVQ3hEUVVGcFFpeEhRVUZxUWl4RFFVRnhRaXhOUVVGeVFqdEJRVU5CTEdWQlFWa3NTVUZCV2p0QlFVTkJMRWRCU0VRc1RVRkhUeXhKUVVGSkxFbEJRVWtzUTBGQlF5eEZRVUZNTEVsQlFWY3NVMEZCWml4RlFVRXdRanRCUVVOb1F5eHhRa0ZCVHl4VFFVRlFMRU5CUVdsQ0xFMUJRV3BDTEVOQlFYZENMRTFCUVhoQ08wRkJRMEVzWlVGQldTeExRVUZhTzBGQlEwRTdRVUZEUkN4RlFXWkVPMEZCWjBKQkxFTkJja0pFT3p0QlFYVkNRU3hKUVVGTkxIbENRVUY1UWl4VFFVRjZRaXh6UWtGQmVVSXNSMEZCVFR0QlFVTndReXhMUVVGSkxGbEJRVmtzVTBGQlV5eGpRVUZVTEVOQlFYZENMR05CUVhoQ0xFTkJRV2hDTzBGQlEwRXNTMEZCU1N4WFFVRlhMRk5CUVZNc1kwRkJWQ3hEUVVGM1FpeGhRVUY0UWl4RFFVRm1PMEZCUTBFc1YwRkJWU3huUWtGQlZpeERRVUV5UWl4UFFVRXpRaXhGUVVGdlF5eFpRVUZOTzBGQlEzcERMRTFCUVVrc1QwRkJTaXhGUVVGaE8wRkJRMW83UVVGRFFTeGhRVUZWTEVOQlFWWTdRVUZEUVN4aFFVRlZMRk5CUVZZc1EwRkJiMElzUjBGQmNFSXNRMEZCZDBJc1VVRkJlRUk3UVVGRFFTeFpRVUZUTEZOQlFWUXNRMEZCYlVJc1RVRkJia0lzUTBGQk1FSXNVVUZCTVVJN08wRkJSVUU3UVVGRFFUdEJRVU5FTEVWQlZFUTdPMEZCVjBFc1ZVRkJVeXhuUWtGQlZDeERRVUV3UWl4UFFVRXhRaXhGUVVGdFF5eFpRVUZOTzBGQlEzaERMRTFCUVVrc1EwRkJReXhQUVVGTUxFVkJRV003UVVGRFlqdEJRVU5CTEdGQlFWVXNRMEZCVmp0QlFVTkJMRmxCUVZNc1UwRkJWQ3hEUVVGdFFpeEhRVUZ1UWl4RFFVRjFRaXhSUVVGMlFqdEJRVU5CTEdGQlFWVXNVMEZCVml4RFFVRnZRaXhOUVVGd1FpeERRVUV5UWl4UlFVRXpRanM3UVVGRlFUdEJRVU5CTzBGQlEwUXNSVUZVUkR0QlFWVkJMRU5CZUVKRU96dEJRVEJDUVN4SlFVRk5MR2xDUVVGcFFpeFRRVUZxUWl4alFVRnBRaXhEUVVGRExFbEJRVVFzUlVGQlZUdEJRVU5vUXl4TFFVRk5MRmRCUVZjc1ZVRkJWU3hwUWtGQlZpeEhRVUU0UWl4clFrRkJMME03UVVGRFFTeExRVUZOTEdWQlFXVXNRMEZCUXl4UFFVRkVMRWRCUVZjc2FVSkJRVmdzUjBGQkswSXNhMEpCUVhCRU96dEJRVVZCTEV0QlFVMHNWMEZCVnl4TlFVRk5MRWxCUVU0c1EwRkJWeXhUUVVGVExHZENRVUZVTEVOQlFUQkNMRkZCUVRGQ0xFTkJRVmdzUTBGQmFrSTdRVUZEUVN4TFFVRk5MR1ZCUVdVc1RVRkJUU3hKUVVGT0xFTkJRVmNzVTBGQlV5eG5Ra0ZCVkN4RFFVRXdRaXhaUVVFeFFpeERRVUZZTEVOQlFYSkNPenRCUVVWQkxHTkJRV0VzVDBGQllpeERRVUZ4UWp0QlFVRkJMRk5CUVZNc1RVRkJUU3hsUVVGT0xFTkJRWE5DTEUxQlFYUkNMRU5CUVZRN1FVRkJRU3hGUVVGeVFqczdRVUZGUVN4UlFVRlBMRk5CUVZNc1NVRkJWQ3hEUVVGakxHbENRVUZUTzBGQlF6ZENMRTFCUVVrc1QwRkJUeXhOUVVGTkxHdENRVUZxUWp0QlFVTkJMRk5CUVU4c1MwRkJTeXhUUVVGTUxFTkJRV1VzUTBGQlppeE5RVUZ6UWl4SlFVRjBRaXhKUVVFNFFpeExRVUZMTEZOQlFVd3NRMEZCWlN4RFFVRm1MRTFCUVhOQ0xFdEJRVXNzVjBGQlRDeEZRVUV6UkR0QlFVTkJMRVZCU0Uwc1EwRkJVRHRCUVVsQkxFTkJZa1E3TzBGQlpVRXNTVUZCVFN4bFFVRmxMRk5CUVdZc1dVRkJaU3hIUVVGTk8wRkJRekZDTEV0QlFVMHNkVUpCUVhWQ0xGTkJRWFpDTEc5Q1FVRjFRaXhEUVVGRExFOUJRVVFzUlVGQlZTeE5RVUZXTEVWQlFYRkNPMEZCUTJwRUxGVkJRVkVzWjBKQlFWSXNRMEZCZVVJc1QwRkJla0lzUlVGQmEwTXNXVUZCVFR0QlFVTjJReXhQUVVGTkxHRkJRV0VzVTBGQlV5eGpRVUZVTEVOQlFYZENMRTFCUVhoQ0xFTkJRVzVDTzBGQlEwRXNUMEZCU1N4bFFVRktPenRCUVVWQkxFOUJRVWtzUTBGQlF5eFBRVUZNTEVWQlFXTTdRVUZEWWl4aFFVRlRMRmRCUVZjc1IwRkJXQ3hIUVVGcFFpeFRRVUZUTEdOQlFWUXNRMEZCZDBJc1pVRkJlRUlzUTBGQmFrSXNSMEZCTkVRc1YwRkJWeXhoUVVGWUxFTkJRWGxDTEdGQlFYcENMRU5CUVhWRExHRkJRWFpETEVOQlFYRkVMR0ZCUVhKRUxFTkJRVzFGTEhOQ1FVRnVSU3hEUVVFd1JpeGhRVUV4Uml4RFFVRjNSeXd5UWtGQmVFY3NRMEZCY2tVN1FVRkRRU3hKUVVaRUxFMUJSVTg3UVVGRFRpeGhRVUZUTEZkQlFWY3NSMEZCV0N4SFFVRnBRaXhUUVVGVExHTkJRVlFzUTBGQmQwSXNaVUZCZUVJc1EwRkJha0lzUjBGQk5FUXNWMEZCVnl4aFFVRllMRU5CUVhsQ0xHRkJRWHBDTEVOQlFYVkRMR0ZCUVhaRExFTkJRWEZFTEhOQ1FVRnlSQ3hEUVVFMFJTeGhRVUUxUlN4RFFVRXdSaXd5UWtGQk1VWXNRMEZCY2tVN1FVRkRRVHM3UVVGRlJDeFZRVUZQTEdOQlFWQXNRMEZCYzBJc1JVRkJReXhWUVVGVkxGRkJRVmdzUlVGQmNVSXNUMEZCVHl4UFFVRTFRaXhGUVVGMFFqdEJRVU5CTEVkQldFUTdRVUZaUVN4RlFXSkVPenRCUVdWQkxFdEJRVWtzWjBKQlFXZENMRVZCUVhCQ08wRkJRMEVzUzBGQlNTeFRRVUZUTEZOQlFWTXNZVUZCVkN4RFFVRjFRaXh2UWtGQmRrSXNRMEZCWWp0QlFVTkJMRkZCUVU4c1UwRkJVQ3hIUVVGdFFpeEZRVUZ1UWpzN1FVRkZRU3h4UWtGQlV5eFBRVUZVTEVOQlFXbENMR3RDUVVGVk8wRkJRekZDTEUxQlFVa3NZMEZCWXl4bFFVRmxMRTFCUVdZc1EwRkJiRUk3UVVGRFFTeE5RVUZKTEZWQlFWVXNVMEZCVXl4aFFVRlVMRU5CUVhWQ0xFZEJRWFpDTEVOQlFXUTdPMEZCUlVFc1RVRkJTU3hEUVVGRExGZEJRVXdzUlVGQmEwSTdPMEZCUld4Q0xHTkJRVmtzUlVGQldpeEhRVUZwUWl4TlFVRnFRanRCUVVOQkxGVkJRVkVzVTBGQlVpeEhRVUZ2UWl4UFFVRlBMRmRCUVZBc1JVRkJjRUk3UVVGRFFTeFZRVUZSTEZOQlFWSXNSMEZCYjBJc2VVSkJRWEJDT3p0QlFVVkJMSFZDUVVGeFFpeFBRVUZ5UWl4RlFVRTRRaXhOUVVFNVFqdEJRVU5CTEZOQlFVOHNWMEZCVUN4RFFVRnRRaXhQUVVGdVFqdEJRVU5CTEVWQldrUTdRVUZoUVN4RFFXcERSRHM3UVVGdFEwRXNTVUZCVFN4blFrRkJaMElzVTBGQmFFSXNZVUZCWjBJc1IwRkJUVHRCUVVNelFpeExRVUZOTEdWQlFXVXNVMEZCVXl4alFVRlVMRU5CUVhkQ0xGTkJRWGhDTEVOQlFYSkNPMEZCUTBFc1MwRkJUU3hqUVVGakxGVkJRVlVzVVVGQlVTeFBRVUZzUWl4SFFVRTBRaXhSUVVGUkxGRkJRWGhFT3p0QlFVVkJMR05CUVdFc1UwRkJZaXhIUVVGNVFpeEZRVUY2UWpzN1FVRkZRU3hoUVVGWkxFOUJRVm9zUTBGQmIwSXNWVUZCUXl4TFFVRkVMRVZCUVZFc1EwRkJVaXhGUVVGak8wRkJRMnBETEdWQlFXRXNhMEpCUVdJc1EwRkJaME1zVjBGQmFFTXNSVUZCTmtNc1owTkJRV2RDTEV0QlFXaENMRVZCUVhWQ0xFTkJRWFpDTEVOQlFUZERPMEZCUTBFc2VVSkJRVmNzVTBGQlV5eGpRVUZVTEdGQlFXdERMRU5CUVd4RExFTkJRVmc3UVVGRFFTeEZRVWhFT3p0QlFVdEJPMEZCUTBFN1FVRkRRU3hEUVdKRU96dEJRV1ZCTEVsQlFVMHNkMEpCUVhkQ0xGTkJRWGhDTEhGQ1FVRjNRaXhEUVVGRExFbEJRVVFzUlVGQlZUdEJRVU4yUXl4VFFVRlJMRkZCUVZJc1IwRkJiVUlzU1VGQmJrSTdRVUZEUVN4VFFVRlJMRTlCUVZJc1IwRkJhMElzUzBGQlN5eExRVUZNTEVWQlFXeENMRU5CUm5WRExFTkJSVkE3TzBGQlJXaERMRk5CUVZFc1QwRkJVaXhEUVVGblFpeEpRVUZvUWl4RFFVRnhRaXhWUVVGRExFTkJRVVFzUlVGQlNTeERRVUZLTEVWQlFWVTdRVUZET1VJc1RVRkJTU3hUUVVGVExFVkJRVVVzUzBGQlJpeERRVUZSTEVOQlFWSXNSVUZCVnl4WFFVRllMRVZCUVdJN1FVRkRRU3hOUVVGSkxGTkJRVk1zUlVGQlJTeExRVUZHTEVOQlFWRXNRMEZCVWl4RlFVRlhMRmRCUVZnc1JVRkJZanRCUVVOQkxFMUJRVWtzVTBGQlV5eE5RVUZpTEVWQlFYRkNMRTlCUVU4c1EwRkJVQ3hEUVVGeVFpeExRVU5MTEVsQlFVa3NVMEZCVXl4TlFVRmlMRVZCUVhGQ0xFOUJRVThzUTBGQlF5eERRVUZTTEVOQlFYSkNMRXRCUTBFc1QwRkJUeXhEUVVGUU8wRkJRMHdzUlVGT1JEdEJRVTlCTEVOQldFUTdPMEZCWVVFc1NVRkJUU3haUVVGWkxGTkJRVm9zVTBGQldTeEhRVUZOTzBGQlEzWkNMRTlCUVUwc1lVRkJUaXhGUVVGVkxFbEJRVllzUTBGQlpUdEJRVUZCTEZOQlFVOHNTVUZCU1N4SlFVRktMRVZCUVZBN1FVRkJRU3hGUVVGbUxFVkJRME1zU1VGRVJDeERRVU5OTEdkQ1FVRlJPMEZCUTJJc2QwSkJRWE5DTEVsQlFYUkNPMEZCUTBFN1FVRkRRVHRCUVVOQkxFVkJURVFzUlVGTlF5eExRVTVFTEVOQlRVODdRVUZCUVN4VFFVRlBMRkZCUVZFc1NVRkJVaXhEUVVGaExFZEJRV0lzUTBGQlVEdEJRVUZCTEVWQlRsQTdRVUZQUVN4RFFWSkVPenRCUVZWQkxFbEJRVTBzVDBGQlR5eFRRVUZRTEVsQlFVOHNSMEZCVFR0QlFVTnNRaXhuUTBGQllTeFJRVUZpTzBGQlEwRTdPMEZCUlVFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFTeERRVkpFT3p0QlFWVkJPenM3T3pzN096dEJRMnhPUVN4SlFVRk5MR2RDUVVGblFpeFRRVUZvUWl4aFFVRm5RaXhEUVVGRExFdEJRVVE3UVVGQlFTd3JSRUZCWjBVc1MwRkJhRVU3UVVGQlFTeERRVUYwUWpzN1FVRkZRU3hKUVVGTkxHdENRVUZyUWl4VFFVRnNRaXhsUVVGclFpeERRVUZETEV0QlFVUXNSVUZCVVN4RFFVRlNMRVZCUVdNN1FVRkJRU3hMUVVNM1FpeExRVVEyUWl4SFFVTXJRaXhMUVVRdlFpeERRVU0zUWl4TFFVUTJRanRCUVVGQkxFdEJRM1JDTEZOQlJITkNMRWRCUXl0Q0xFdEJSQzlDTEVOQlEzUkNMRk5CUkhOQ08wRkJRVUVzUzBGRFdDeFJRVVJYTEVkQlF5dENMRXRCUkM5Q0xFTkJRMWdzVVVGRVZ6dEJRVUZCTEV0QlEwUXNUVUZFUXl4SFFVTXJRaXhMUVVRdlFpeERRVU5FTEUxQlJFTTdRVUZCUVN4TFFVTlBMRmRCUkZBc1IwRkRLMElzUzBGRUwwSXNRMEZEVHl4WFFVUlFPMEZCUVVFc1MwRkRiMElzVFVGRWNFSXNSMEZESzBJc1MwRkVMMElzUTBGRGIwSXNUVUZFY0VJN096dEJRVWR5UXl4TFFVRk5MRmxCUVZrc1QwRkJUeXhOUVVGUUxFZEJRMnBDTEU5QlFVOHNSMEZCVUN4RFFVRlhPMEZCUVVFc1UwRkJVeXhqUVVGakxFdEJRV1FzUTBGQlZEdEJRVUZCTEVWQlFWZ3NSVUZCTUVNc1NVRkJNVU1zUTBGQkswTXNSVUZCTDBNc1EwRkVhVUlzUjBGRGIwTXNSVUZFZEVRN08wRkJSMEVzZDA1QlMzbERMRXRCVEhwRExIRklRVTlyUkN4VFFWQnNSQ3h2U0VGVGFVUXNVVUZVYWtRc01FcEJZVzlFTEVOQlluQkVMSGRDUVdOUExGTkJaRkFzSzBkQlowSjVReXhYUVdoQ2VrTXNNRVJCYVVKdlF5eE5RV3BDY0VNN1FVRTBRa0VzUTBGc1EwUTdPMnRDUVc5RFpTeGxPenM3T3pzN096czdPMEZEZEVObU96czdPMEZCUTBFN096czdPenRSUVVWVExHVXNSMEZCUVN4cFFqdFJRVUZwUWl4WExFZEJRVUVzWlRzN096czdPenM3UVVOSU1VSXNTVUZCVFN4dGJVSkJRVTQ3TzBGQmFVSkJMRWxCUVUwc1kwRkJZeXhUUVVGa0xGZEJRV01zUjBGQlRUdEJRVU42UWl4TFFVRkpMRmRCUVZjc1UwRkJVeXhqUVVGVUxFTkJRWGRDTEZGQlFYaENMRU5CUVdZN1FVRkRRU3hWUVVGVExGTkJRVlFzUjBGQmNVSXNVVUZCY2tJN1FVRkRRU3hEUVVoRU96dHJRa0ZMWlN4WE96czdPenM3T3pzN08wRkRkRUptT3p0QlFVVkJMRWxCUVUwc1YwRkJWeXhUUVVGWUxGRkJRVmNzUTBGQlF5eEZRVUZFTEVWQlFVc3NTVUZCVEN4RlFVRmpPMEZCUXpkQ0xFdEJRVWtzWjBKQlFVbzdPMEZCUlVFc1VVRkJUeXhaUVVGWE8wRkJRVUU3UVVGQlFUczdRVUZEYUVJc1RVRkJUU3hsUVVGbExGTkJRV1lzV1VGQlpUdEJRVUZCTEZWQlFVMHNSMEZCUnl4TFFVRklMRU5CUVZNc1MwRkJWQ3hGUVVGbExGVkJRV1lzUTBGQlRqdEJRVUZCTEVkQlFYSkNPenRCUVVWQkxHVkJRV0VzVDBGQllqdEJRVU5CTEZsQlFWVXNWMEZCVnl4WlFVRllMRVZCUVhsQ0xFbEJRWHBDTEVOQlFWWTdRVUZEUkN4RlFVeEVPMEZCVFVRc1EwRlVSRHM3UVVGWFFTeEpRVUZOTEdOQlFXTXNVMEZCWkN4WFFVRmpMRWRCUVUwN1FVRkRla0lzY1VKQlFWTXNUMEZCVkN4RFFVRnBRanRCUVVGQkxGTkJRVkVzUzBGQlN5eFRRVUZNTEVOQlFXVXNSMEZCWml4RFFVRnRRaXhQUVVGdVFpeERRVUZTTzBGQlFVRXNSVUZCYWtJN1FVRkRRU3hwUWtGQlN5eFRRVUZNTEVOQlFXVXNSMEZCWml4RFFVRnRRaXhQUVVGdVFqdEJRVU5CTEVOQlNFUTdPMEZCUzBFc1NVRkJUU3hqUVVGakxGTkJRV1FzVjBGQll5eEhRVUZOTzBGQlEzcENMRXRCUVVrc1RVRkJUU3hUUVVGVExHTkJRVlFzUTBGQmQwSXNaVUZCZUVJc1EwRkJWanRCUVVOQkxFdEJRVWtzWTBGQlNpeERRVUZ0UWl4RlFVRkRMRlZCUVZVc1VVRkJXQ3hGUVVGeFFpeFBRVUZQTEU5QlFUVkNMRVZCUVc1Q08wRkJRMEVzUTBGSVJEczdRVUZMUVN4SlFVRk5MR0ZCUVdFc1UwRkJZaXhWUVVGaExFTkJRVU1zVDBGQlJDeEZRVUZoTzBGQlF5OUNMRXRCUVUwc1lVRkJZU3hSUVVGUkxHRkJRVklzUTBGQmMwSXNZVUZCZEVJc1EwRkJiME1zWVVGQmNFTXNRMEZCYmtJN1FVRkRRU3hMUVVGTkxHRkJRV0VzVVVGQlVTeGhRVUZTTEVOQlFYTkNMR0ZCUVhSQ0xFTkJRVzlETEdGQlFYQkRMRU5CUVc1Q096dEJRVVZCTEV0QlFVa3NWVUZCVlN4UlFVRlJMR2xDUVVGMFFqdEJRVU5CTEZsQlFWY3NaMEpCUVZnc1EwRkJORUlzVDBGQk5VSXNSVUZCY1VNc1dVRkJUVHRCUVVNeFF5eE5RVUZOTEU5QlFVOHNVVUZCVVN4clFrRkJja0k3UVVGRFFTeE5RVUZKTEVsQlFVb3NSVUZCVlR0QlFVTlVMRkZCUVVzc1kwRkJUQ3hEUVVGdlFpeEZRVUZETEZWQlFWVXNVVUZCV0N4RlFVRnhRaXhQUVVGUExGTkJRVFZDTEVWQlFYVkRMRkZCUVZFc1VVRkJMME1zUlVGQmNFSTdRVUZEUVN4aFFVRlZMRWxCUVZZN1FVRkRRVHRCUVVORUxFVkJUa1E3TzBGQlVVRXNXVUZCVnl4blFrRkJXQ3hEUVVFMFFpeFBRVUUxUWl4RlFVRnhReXhaUVVGTk8wRkJRekZETEUxQlFVMHNUMEZCVHl4UlFVRlJMSE5DUVVGeVFqdEJRVU5CTEUxQlFVa3NTVUZCU2l4RlFVRlZPMEZCUTFRc1VVRkJTeXhqUVVGTUxFTkJRVzlDTEVWQlFVTXNWVUZCVlN4UlFVRllMRVZCUVhGQ0xFOUJRVThzVTBGQk5VSXNSVUZCZFVNc1VVRkJVU3hSUVVFdlF5eEZRVUZ3UWp0QlFVTkJMR0ZCUVZVc1NVRkJWanRCUVVOQk8wRkJRMFFzUlVGT1JEdEJRVTlCTEVOQmNFSkVPenRSUVhOQ1V5eFJMRWRCUVVFc1VUdFJRVUZWTEZjc1IwRkJRU3hYTzFGQlFXRXNWeXhIUVVGQkxGYzdVVUZCWVN4VkxFZEJRVUVzVlNJc0ltWnBiR1VpT2lKblpXNWxjbUYwWldRdWFuTWlMQ0p6YjNWeVkyVlNiMjkwSWpvaUlpd2ljMjkxY21ObGMwTnZiblJsYm5RaU9sc2lLR1oxYm1OMGFXOXVLQ2w3Wm5WdVkzUnBiMjRnY2lobExHNHNkQ2w3Wm5WdVkzUnBiMjRnYnlocExHWXBlMmxtS0NGdVcybGRLWHRwWmlnaFpWdHBYU2w3ZG1GeUlHTTlYQ0ptZFc1amRHbHZibHdpUFQxMGVYQmxiMllnY21WeGRXbHlaU1ltY21WeGRXbHlaVHRwWmlnaFppWW1ZeWx5WlhSMWNtNGdZeWhwTENFd0tUdHBaaWgxS1hKbGRIVnliaUIxS0drc0lUQXBPM1poY2lCaFBXNWxkeUJGY25KdmNpaGNJa05oYm01dmRDQm1hVzVrSUcxdlpIVnNaU0FuWENJcmFTdGNJaWRjSWlrN2RHaHliM2NnWVM1amIyUmxQVndpVFU5RVZVeEZYMDVQVkY5R1QxVk9SRndpTEdGOWRtRnlJSEE5Ymx0cFhUMTdaWGh3YjNKMGN6cDdmWDA3WlZ0cFhWc3dYUzVqWVd4c0tIQXVaWGh3YjNKMGN5eG1kVzVqZEdsdmJpaHlLWHQyWVhJZ2JqMWxXMmxkV3pGZFczSmRPM0psZEhWeWJpQnZLRzU4ZkhJcGZTeHdMSEF1Wlhod2IzSjBjeXh5TEdVc2JpeDBLWDF5WlhSMWNtNGdibHRwWFM1bGVIQnZjblJ6ZldadmNpaDJZWElnZFQxY0ltWjFibU4wYVc5dVhDSTlQWFI1Y0dWdlppQnlaWEYxYVhKbEppWnlaWEYxYVhKbExHazlNRHRwUEhRdWJHVnVaM1JvTzJrckt5bHZLSFJiYVYwcE8zSmxkSFZ5YmlCdmZYSmxkSFZ5YmlCeWZTa29LU0lzSWk4cUlITnRiMjkwYUhOamNtOXNiQ0IyTUM0MExqQWdMU0F5TURFNElDMGdSSFZ6ZEdGdUlFdGhjM1JsYml3Z1NtVnlaVzFwWVhNZ1RXVnVhV05vWld4c2FTQXRJRTFKVkNCTWFXTmxibk5sSUNvdlhHNG9ablZ1WTNScGIyNGdLQ2tnZTF4dUlDQW5kWE5sSUhOMGNtbGpkQ2M3WEc1Y2JpQWdMeThnY0c5c2VXWnBiR3hjYmlBZ1puVnVZM1JwYjI0Z2NHOXNlV1pwYkd3b0tTQjdYRzRnSUNBZ0x5OGdZV3hwWVhObGMxeHVJQ0FnSUhaaGNpQjNJRDBnZDJsdVpHOTNPMXh1SUNBZ0lIWmhjaUJrSUQwZ1pHOWpkVzFsYm5RN1hHNWNiaUFnSUNBdkx5QnlaWFIxY200Z2FXWWdjMk55YjJ4c0lHSmxhR0YyYVc5eUlHbHpJSE4xY0hCdmNuUmxaQ0JoYm1RZ2NHOXNlV1pwYkd3Z2FYTWdibTkwSUdadmNtTmxaRnh1SUNBZ0lHbG1JQ2hjYmlBZ0lDQWdJQ2R6WTNKdmJHeENaV2hoZG1sdmNpY2dhVzRnWkM1a2IyTjFiV1Z1ZEVWc1pXMWxiblF1YzNSNWJHVWdKaVpjYmlBZ0lDQWdJSGN1WDE5bWIzSmpaVk50YjI5MGFGTmpjbTlzYkZCdmJIbG1hV3hzWDE4Z0lUMDlJSFJ5ZFdWY2JpQWdJQ0FwSUh0Y2JpQWdJQ0FnSUhKbGRIVnlianRjYmlBZ0lDQjlYRzVjYmlBZ0lDQXZMeUJuYkc5aVlXeHpYRzRnSUNBZ2RtRnlJRVZzWlcxbGJuUWdQU0IzTGtoVVRVeEZiR1Z0Wlc1MElIeDhJSGN1Uld4bGJXVnVkRHRjYmlBZ0lDQjJZWElnVTBOU1QweE1YMVJKVFVVZ1BTQTBOamc3WEc1Y2JpQWdJQ0F2THlCdlltcGxZM1FnWjJGMGFHVnlhVzVuSUc5eWFXZHBibUZzSUhOamNtOXNiQ0J0WlhSb2IyUnpYRzRnSUNBZ2RtRnlJRzl5YVdkcGJtRnNJRDBnZTF4dUlDQWdJQ0FnYzJOeWIyeHNPaUIzTG5OamNtOXNiQ0I4ZkNCM0xuTmpjbTlzYkZSdkxGeHVJQ0FnSUNBZ2MyTnliMnhzUW5rNklIY3VjMk55YjJ4c1Fua3NYRzRnSUNBZ0lDQmxiR1Z0Wlc1MFUyTnliMnhzT2lCRmJHVnRaVzUwTG5CeWIzUnZkSGx3WlM1elkzSnZiR3dnZkh3Z2MyTnliMnhzUld4bGJXVnVkQ3hjYmlBZ0lDQWdJSE5qY205c2JFbHVkRzlXYVdWM09pQkZiR1Z0Wlc1MExuQnliM1J2ZEhsd1pTNXpZM0p2Ykd4SmJuUnZWbWxsZDF4dUlDQWdJSDA3WEc1Y2JpQWdJQ0F2THlCa1pXWnBibVVnZEdsdGFXNW5JRzFsZEdodlpGeHVJQ0FnSUhaaGNpQnViM2NnUFZ4dUlDQWdJQ0FnZHk1d1pYSm1iM0p0WVc1alpTQW1KaUIzTG5CbGNtWnZjbTFoYm1ObExtNXZkMXh1SUNBZ0lDQWdJQ0EvSUhjdWNHVnlabTl5YldGdVkyVXVibTkzTG1KcGJtUW9keTV3WlhKbWIzSnRZVzVqWlNsY2JpQWdJQ0FnSUNBZ09pQkVZWFJsTG01dmR6dGNibHh1SUNBZ0lDOHFLbHh1SUNBZ0lDQXFJR2x1WkdsallYUmxjeUJwWmlCaElIUm9aU0JqZFhKeVpXNTBJR0p5YjNkelpYSWdhWE1nYldGa1pTQmllU0JOYVdOeWIzTnZablJjYmlBZ0lDQWdLaUJBYldWMGFHOWtJR2x6VFdsamNtOXpiMlowUW5KdmQzTmxjbHh1SUNBZ0lDQXFJRUJ3WVhKaGJTQjdVM1J5YVc1bmZTQjFjMlZ5UVdkbGJuUmNiaUFnSUNBZ0tpQkFjbVYwZFhKdWN5QjdRbTl2YkdWaGJuMWNiaUFnSUNBZ0tpOWNiaUFnSUNCbWRXNWpkR2x2YmlCcGMwMXBZM0p2YzI5bWRFSnliM2R6WlhJb2RYTmxja0ZuWlc1MEtTQjdYRzRnSUNBZ0lDQjJZWElnZFhObGNrRm5aVzUwVUdGMGRHVnlibk1nUFNCYkowMVRTVVVnSnl3Z0oxUnlhV1JsYm5Rdkp5d2dKMFZrWjJVdkoxMDdYRzVjYmlBZ0lDQWdJSEpsZEhWeWJpQnVaWGNnVW1WblJYaHdLSFZ6WlhKQloyVnVkRkJoZEhSbGNtNXpMbXB2YVc0b0ozd25LU2t1ZEdWemRDaDFjMlZ5UVdkbGJuUXBPMXh1SUNBZ0lIMWNibHh1SUNBZ0lDOHFYRzRnSUNBZ0lDb2dTVVVnYUdGeklISnZkVzVrYVc1bklHSjFaeUJ5YjNWdVpHbHVaeUJrYjNkdUlHTnNhV1Z1ZEVobGFXZG9kQ0JoYm1RZ1kyeHBaVzUwVjJsa2RHZ2dZVzVrWEc0Z0lDQWdJQ29nY205MWJtUnBibWNnZFhBZ2MyTnliMnhzU0dWcFoyaDBJR0Z1WkNCelkzSnZiR3hYYVdSMGFDQmpZWFZ6YVc1bklHWmhiSE5sSUhCdmMybDBhWFpsYzF4dUlDQWdJQ0FxSUc5dUlHaGhjMU5qY205c2JHRmliR1ZUY0dGalpWeHVJQ0FnSUNBcUwxeHVJQ0FnSUhaaGNpQlNUMVZPUkVsT1IxOVVUMHhGVWtGT1EwVWdQU0JwYzAxcFkzSnZjMjltZEVKeWIzZHpaWElvZHk1dVlYWnBaMkYwYjNJdWRYTmxja0ZuWlc1MEtTQS9JREVnT2lBd08xeHVYRzRnSUNBZ0x5b3FYRzRnSUNBZ0lDb2dZMmhoYm1kbGN5QnpZM0p2Ykd3Z2NHOXphWFJwYjI0Z2FXNXphV1JsSUdGdUlHVnNaVzFsYm5SY2JpQWdJQ0FnS2lCQWJXVjBhRzlrSUhOamNtOXNiRVZzWlcxbGJuUmNiaUFnSUNBZ0tpQkFjR0Z5WVcwZ2UwNTFiV0psY24wZ2VGeHVJQ0FnSUNBcUlFQndZWEpoYlNCN1RuVnRZbVZ5ZlNCNVhHNGdJQ0FnSUNvZ1FISmxkSFZ5Ym5NZ2UzVnVaR1ZtYVc1bFpIMWNiaUFnSUNBZ0tpOWNiaUFnSUNCbWRXNWpkR2x2YmlCelkzSnZiR3hGYkdWdFpXNTBLSGdzSUhrcElIdGNiaUFnSUNBZ0lIUm9hWE11YzJOeWIyeHNUR1ZtZENBOUlIZzdYRzRnSUNBZ0lDQjBhR2x6TG5OamNtOXNiRlJ2Y0NBOUlIazdYRzRnSUNBZ2ZWeHVYRzRnSUNBZ0x5b3FYRzRnSUNBZ0lDb2djbVYwZFhKdWN5QnlaWE4xYkhRZ2IyWWdZWEJ3YkhscGJtY2daV0Z6WlNCdFlYUm9JR1oxYm1OMGFXOXVJSFJ2SUdFZ2JuVnRZbVZ5WEc0Z0lDQWdJQ29nUUcxbGRHaHZaQ0JsWVhObFhHNGdJQ0FnSUNvZ1FIQmhjbUZ0SUh0T2RXMWlaWEo5SUd0Y2JpQWdJQ0FnS2lCQWNtVjBkWEp1Y3lCN1RuVnRZbVZ5ZlZ4dUlDQWdJQ0FxTDF4dUlDQWdJR1oxYm1OMGFXOXVJR1ZoYzJVb2F5a2dlMXh1SUNBZ0lDQWdjbVYwZFhKdUlEQXVOU0FxSUNneElDMGdUV0YwYUM1amIzTW9UV0YwYUM1UVNTQXFJR3NwS1R0Y2JpQWdJQ0I5WEc1Y2JpQWdJQ0F2S2lwY2JpQWdJQ0FnS2lCcGJtUnBZMkYwWlhNZ2FXWWdZU0J6Ylc5dmRHZ2dZbVZvWVhacGIzSWdjMmh2ZFd4a0lHSmxJR0Z3Y0d4cFpXUmNiaUFnSUNBZ0tpQkFiV1YwYUc5a0lITm9iM1ZzWkVKaGFXeFBkWFJjYmlBZ0lDQWdLaUJBY0dGeVlXMGdlMDUxYldKbGNueFBZbXBsWTNSOUlHWnBjbk4wUVhKblhHNGdJQ0FnSUNvZ1FISmxkSFZ5Ym5NZ2UwSnZiMnhsWVc1OVhHNGdJQ0FnSUNvdlhHNGdJQ0FnWm5WdVkzUnBiMjRnYzJodmRXeGtRbUZwYkU5MWRDaG1hWEp6ZEVGeVp5a2dlMXh1SUNBZ0lDQWdhV1lnS0Z4dUlDQWdJQ0FnSUNCbWFYSnpkRUZ5WnlBOVBUMGdiblZzYkNCOGZGeHVJQ0FnSUNBZ0lDQjBlWEJsYjJZZ1ptbHljM1JCY21jZ0lUMDlJQ2R2WW1wbFkzUW5JSHg4WEc0Z0lDQWdJQ0FnSUdacGNuTjBRWEpuTG1KbGFHRjJhVzl5SUQwOVBTQjFibVJsWm1sdVpXUWdmSHhjYmlBZ0lDQWdJQ0FnWm1seWMzUkJjbWN1WW1Wb1lYWnBiM0lnUFQwOUlDZGhkWFJ2SnlCOGZGeHVJQ0FnSUNBZ0lDQm1hWEp6ZEVGeVp5NWlaV2hoZG1sdmNpQTlQVDBnSjJsdWMzUmhiblFuWEc0Z0lDQWdJQ0FwSUh0Y2JpQWdJQ0FnSUNBZ0x5OGdabWx5YzNRZ1lYSm5kVzFsYm5RZ2FYTWdibTkwSUdGdUlHOWlhbVZqZEM5dWRXeHNYRzRnSUNBZ0lDQWdJQzh2SUc5eUlHSmxhR0YyYVc5eUlHbHpJR0YxZEc4c0lHbHVjM1JoYm5RZ2IzSWdkVzVrWldacGJtVmtYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQjBjblZsTzF4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNCcFppQW9kSGx3Wlc5bUlHWnBjbk4wUVhKbklEMDlQU0FuYjJKcVpXTjBKeUFtSmlCbWFYSnpkRUZ5Wnk1aVpXaGhkbWx2Y2lBOVBUMGdKM050YjI5MGFDY3BJSHRjYmlBZ0lDQWdJQ0FnTHk4Z1ptbHljM1FnWVhKbmRXMWxiblFnYVhNZ1lXNGdiMkpxWldOMElHRnVaQ0JpWldoaGRtbHZjaUJwY3lCemJXOXZkR2hjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJR1poYkhObE8xeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQXZMeUIwYUhKdmR5Qmxjbkp2Y2lCM2FHVnVJR0psYUdGMmFXOXlJR2x6SUc1dmRDQnpkWEJ3YjNKMFpXUmNiaUFnSUNBZ0lIUm9jbTkzSUc1bGR5QlVlWEJsUlhKeWIzSW9YRzRnSUNBZ0lDQWdJQ2RpWldoaGRtbHZjaUJ0WlcxaVpYSWdiMllnVTJOeWIyeHNUM0IwYVc5dWN5QW5JQ3RjYmlBZ0lDQWdJQ0FnSUNCbWFYSnpkRUZ5Wnk1aVpXaGhkbWx2Y2lBclhHNGdJQ0FnSUNBZ0lDQWdKeUJwY3lCdWIzUWdZU0IyWVd4cFpDQjJZV3gxWlNCbWIzSWdaVzUxYldWeVlYUnBiMjRnVTJOeWIyeHNRbVZvWVhacGIzSXVKMXh1SUNBZ0lDQWdLVHRjYmlBZ0lDQjlYRzVjYmlBZ0lDQXZLaXBjYmlBZ0lDQWdLaUJwYm1ScFkyRjBaWE1nYVdZZ1lXNGdaV3hsYldWdWRDQm9ZWE1nYzJOeWIyeHNZV0pzWlNCemNHRmpaU0JwYmlCMGFHVWdjSEp2ZG1sa1pXUWdZWGhwYzF4dUlDQWdJQ0FxSUVCdFpYUm9iMlFnYUdGelUyTnliMnhzWVdKc1pWTndZV05sWEc0Z0lDQWdJQ29nUUhCaGNtRnRJSHRPYjJSbGZTQmxiRnh1SUNBZ0lDQXFJRUJ3WVhKaGJTQjdVM1J5YVc1bmZTQmhlR2x6WEc0Z0lDQWdJQ29nUUhKbGRIVnlibk1nZTBKdmIyeGxZVzU5WEc0Z0lDQWdJQ292WEc0Z0lDQWdablZ1WTNScGIyNGdhR0Z6VTJOeWIyeHNZV0pzWlZOd1lXTmxLR1ZzTENCaGVHbHpLU0I3WEc0Z0lDQWdJQ0JwWmlBb1lYaHBjeUE5UFQwZ0oxa25LU0I3WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJsYkM1amJHbGxiblJJWldsbmFIUWdLeUJTVDFWT1JFbE9SMTlVVDB4RlVrRk9RMFVnUENCbGJDNXpZM0p2Ykd4SVpXbG5hSFE3WEc0Z0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUdsbUlDaGhlR2x6SUQwOVBTQW5XQ2NwSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUdWc0xtTnNhV1Z1ZEZkcFpIUm9JQ3NnVWs5VlRrUkpUa2RmVkU5TVJWSkJUa05GSUR3Z1pXd3VjMk55YjJ4c1YybGtkR2c3WEc0Z0lDQWdJQ0I5WEc0Z0lDQWdmVnh1WEc0Z0lDQWdMeW9xWEc0Z0lDQWdJQ29nYVc1a2FXTmhkR1Z6SUdsbUlHRnVJR1ZzWlcxbGJuUWdhR0Z6SUdFZ2MyTnliMnhzWVdKc1pTQnZkbVZ5Wm14dmR5QndjbTl3WlhKMGVTQnBiaUIwYUdVZ1lYaHBjMXh1SUNBZ0lDQXFJRUJ0WlhSb2IyUWdZMkZ1VDNabGNtWnNiM2RjYmlBZ0lDQWdLaUJBY0dGeVlXMGdlMDV2WkdWOUlHVnNYRzRnSUNBZ0lDb2dRSEJoY21GdElIdFRkSEpwYm1kOUlHRjRhWE5jYmlBZ0lDQWdLaUJBY21WMGRYSnVjeUI3UW05dmJHVmhibjFjYmlBZ0lDQWdLaTljYmlBZ0lDQm1kVzVqZEdsdmJpQmpZVzVQZG1WeVpteHZkeWhsYkN3Z1lYaHBjeWtnZTF4dUlDQWdJQ0FnZG1GeUlHOTJaWEptYkc5M1ZtRnNkV1VnUFNCM0xtZGxkRU52YlhCMWRHVmtVM1I1YkdVb1pXd3NJRzUxYkd3cFd5ZHZkbVZ5Wm14dmR5Y2dLeUJoZUdselhUdGNibHh1SUNBZ0lDQWdjbVYwZFhKdUlHOTJaWEptYkc5M1ZtRnNkV1VnUFQwOUlDZGhkWFJ2SnlCOGZDQnZkbVZ5Wm14dmQxWmhiSFZsSUQwOVBTQW5jMk55YjJ4c0p6dGNiaUFnSUNCOVhHNWNiaUFnSUNBdktpcGNiaUFnSUNBZ0tpQnBibVJwWTJGMFpYTWdhV1lnWVc0Z1pXeGxiV1Z1ZENCallXNGdZbVVnYzJOeWIyeHNaV1FnYVc0Z1pXbDBhR1Z5SUdGNGFYTmNiaUFnSUNBZ0tpQkFiV1YwYUc5a0lHbHpVMk55YjJ4c1lXSnNaVnh1SUNBZ0lDQXFJRUJ3WVhKaGJTQjdUbTlrWlgwZ1pXeGNiaUFnSUNBZ0tpQkFjR0Z5WVcwZ2UxTjBjbWx1WjMwZ1lYaHBjMXh1SUNBZ0lDQXFJRUJ5WlhSMWNtNXpJSHRDYjI5c1pXRnVmVnh1SUNBZ0lDQXFMMXh1SUNBZ0lHWjFibU4wYVc5dUlHbHpVMk55YjJ4c1lXSnNaU2hsYkNrZ2UxeHVJQ0FnSUNBZ2RtRnlJR2x6VTJOeWIyeHNZV0pzWlZrZ1BTQm9ZWE5UWTNKdmJHeGhZbXhsVTNCaFkyVW9aV3dzSUNkWkp5a2dKaVlnWTJGdVQzWmxjbVpzYjNjb1pXd3NJQ2RaSnlrN1hHNGdJQ0FnSUNCMllYSWdhWE5UWTNKdmJHeGhZbXhsV0NBOUlHaGhjMU5qY205c2JHRmliR1ZUY0dGalpTaGxiQ3dnSjFnbktTQW1KaUJqWVc1UGRtVnlabXh2ZHlobGJDd2dKMWduS1R0Y2JseHVJQ0FnSUNBZ2NtVjBkWEp1SUdselUyTnliMnhzWVdKc1pWa2dmSHdnYVhOVFkzSnZiR3hoWW14bFdEdGNiaUFnSUNCOVhHNWNiaUFnSUNBdktpcGNiaUFnSUNBZ0tpQm1hVzVrY3lCelkzSnZiR3hoWW14bElIQmhjbVZ1ZENCdlppQmhiaUJsYkdWdFpXNTBYRzRnSUNBZ0lDb2dRRzFsZEdodlpDQm1hVzVrVTJOeWIyeHNZV0pzWlZCaGNtVnVkRnh1SUNBZ0lDQXFJRUJ3WVhKaGJTQjdUbTlrWlgwZ1pXeGNiaUFnSUNBZ0tpQkFjbVYwZFhKdWN5QjdUbTlrWlgwZ1pXeGNiaUFnSUNBZ0tpOWNiaUFnSUNCbWRXNWpkR2x2YmlCbWFXNWtVMk55YjJ4c1lXSnNaVkJoY21WdWRDaGxiQ2tnZTF4dUlDQWdJQ0FnZG1GeUlHbHpRbTlrZVR0Y2JseHVJQ0FnSUNBZ1pHOGdlMXh1SUNBZ0lDQWdJQ0JsYkNBOUlHVnNMbkJoY21WdWRFNXZaR1U3WEc1Y2JpQWdJQ0FnSUNBZ2FYTkNiMlI1SUQwZ1pXd2dQVDA5SUdRdVltOWtlVHRjYmlBZ0lDQWdJSDBnZDJocGJHVWdLR2x6UW05a2VTQTlQVDBnWm1Gc2MyVWdKaVlnYVhOVFkzSnZiR3hoWW14bEtHVnNLU0E5UFQwZ1ptRnNjMlVwTzF4dVhHNGdJQ0FnSUNCcGMwSnZaSGtnUFNCdWRXeHNPMXh1WEc0Z0lDQWdJQ0J5WlhSMWNtNGdaV3c3WEc0Z0lDQWdmVnh1WEc0Z0lDQWdMeW9xWEc0Z0lDQWdJQ29nYzJWc1ppQnBiblp2YTJWa0lHWjFibU4wYVc5dUlIUm9ZWFFzSUdkcGRtVnVJR0VnWTI5dWRHVjRkQ3dnYzNSbGNITWdkR2h5YjNWbmFDQnpZM0p2Ykd4cGJtZGNiaUFnSUNBZ0tpQkFiV1YwYUc5a0lITjBaWEJjYmlBZ0lDQWdLaUJBY0dGeVlXMGdlMDlpYW1WamRIMGdZMjl1ZEdWNGRGeHVJQ0FnSUNBcUlFQnlaWFIxY201eklIdDFibVJsWm1sdVpXUjlYRzRnSUNBZ0lDb3ZYRzRnSUNBZ1puVnVZM1JwYjI0Z2MzUmxjQ2hqYjI1MFpYaDBLU0I3WEc0Z0lDQWdJQ0IyWVhJZ2RHbHRaU0E5SUc1dmR5Z3BPMXh1SUNBZ0lDQWdkbUZ5SUhaaGJIVmxPMXh1SUNBZ0lDQWdkbUZ5SUdOMWNuSmxiblJZTzF4dUlDQWdJQ0FnZG1GeUlHTjFjbkpsYm5SWk8xeHVJQ0FnSUNBZ2RtRnlJR1ZzWVhCelpXUWdQU0FvZEdsdFpTQXRJR052Ym5SbGVIUXVjM1JoY25SVWFXMWxLU0F2SUZORFVrOU1URjlVU1UxRk8xeHVYRzRnSUNBZ0lDQXZMeUJoZG05cFpDQmxiR0Z3YzJWa0lIUnBiV1Z6SUdocFoyaGxjaUIwYUdGdUlHOXVaVnh1SUNBZ0lDQWdaV3hoY0hObFpDQTlJR1ZzWVhCelpXUWdQaUF4SUQ4Z01TQTZJR1ZzWVhCelpXUTdYRzVjYmlBZ0lDQWdJQzh2SUdGd2NHeDVJR1ZoYzJsdVp5QjBieUJsYkdGd2MyVmtJSFJwYldWY2JpQWdJQ0FnSUhaaGJIVmxJRDBnWldGelpTaGxiR0Z3YzJWa0tUdGNibHh1SUNBZ0lDQWdZM1Z5Y21WdWRGZ2dQU0JqYjI1MFpYaDBMbk4wWVhKMFdDQXJJQ2hqYjI1MFpYaDBMbmdnTFNCamIyNTBaWGgwTG5OMFlYSjBXQ2tnS2lCMllXeDFaVHRjYmlBZ0lDQWdJR04xY25KbGJuUlpJRDBnWTI5dWRHVjRkQzV6ZEdGeWRGa2dLeUFvWTI5dWRHVjRkQzU1SUMwZ1kyOXVkR1Y0ZEM1emRHRnlkRmtwSUNvZ2RtRnNkV1U3WEc1Y2JpQWdJQ0FnSUdOdmJuUmxlSFF1YldWMGFHOWtMbU5oYkd3b1kyOXVkR1Y0ZEM1elkzSnZiR3hoWW14bExDQmpkWEp5Wlc1MFdDd2dZM1Z5Y21WdWRGa3BPMXh1WEc0Z0lDQWdJQ0F2THlCelkzSnZiR3dnYlc5eVpTQnBaaUIzWlNCb1lYWmxJRzV2ZENCeVpXRmphR1ZrSUc5MWNpQmtaWE4wYVc1aGRHbHZibHh1SUNBZ0lDQWdhV1lnS0dOMWNuSmxiblJZSUNFOVBTQmpiMjUwWlhoMExuZ2dmSHdnWTNWeWNtVnVkRmtnSVQwOUlHTnZiblJsZUhRdWVTa2dlMXh1SUNBZ0lDQWdJQ0IzTG5KbGNYVmxjM1JCYm1sdFlYUnBiMjVHY21GdFpTaHpkR1Z3TG1KcGJtUW9keXdnWTI5dWRHVjRkQ2twTzF4dUlDQWdJQ0FnZlZ4dUlDQWdJSDFjYmx4dUlDQWdJQzhxS2x4dUlDQWdJQ0FxSUhOamNtOXNiSE1nZDJsdVpHOTNJRzl5SUdWc1pXMWxiblFnZDJsMGFDQmhJSE50YjI5MGFDQmlaV2hoZG1sdmNseHVJQ0FnSUNBcUlFQnRaWFJvYjJRZ2MyMXZiM1JvVTJOeWIyeHNYRzRnSUNBZ0lDb2dRSEJoY21GdElIdFBZbXBsWTNSOFRtOWtaWDBnWld4Y2JpQWdJQ0FnS2lCQWNHRnlZVzBnZTA1MWJXSmxjbjBnZUZ4dUlDQWdJQ0FxSUVCd1lYSmhiU0I3VG5WdFltVnlmU0I1WEc0Z0lDQWdJQ29nUUhKbGRIVnlibk1nZTNWdVpHVm1hVzVsWkgxY2JpQWdJQ0FnS2k5Y2JpQWdJQ0JtZFc1amRHbHZiaUJ6Ylc5dmRHaFRZM0p2Ykd3b1pXd3NJSGdzSUhrcElIdGNiaUFnSUNBZ0lIWmhjaUJ6WTNKdmJHeGhZbXhsTzF4dUlDQWdJQ0FnZG1GeUlITjBZWEowV0R0Y2JpQWdJQ0FnSUhaaGNpQnpkR0Z5ZEZrN1hHNGdJQ0FnSUNCMllYSWdiV1YwYUc5a08xeHVJQ0FnSUNBZ2RtRnlJSE4wWVhKMFZHbHRaU0E5SUc1dmR5Z3BPMXh1WEc0Z0lDQWdJQ0F2THlCa1pXWnBibVVnYzJOeWIyeHNJR052Ym5SbGVIUmNiaUFnSUNBZ0lHbG1JQ2hsYkNBOVBUMGdaQzVpYjJSNUtTQjdYRzRnSUNBZ0lDQWdJSE5qY205c2JHRmliR1VnUFNCM08xeHVJQ0FnSUNBZ0lDQnpkR0Z5ZEZnZ1BTQjNMbk5qY205c2JGZ2dmSHdnZHk1d1lXZGxXRTltWm5ObGREdGNiaUFnSUNBZ0lDQWdjM1JoY25SWklEMGdkeTV6WTNKdmJHeFpJSHg4SUhjdWNHRm5aVmxQWm1aelpYUTdYRzRnSUNBZ0lDQWdJRzFsZEdodlpDQTlJRzl5YVdkcGJtRnNMbk5qY205c2JEdGNiaUFnSUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNBZ0lITmpjbTlzYkdGaWJHVWdQU0JsYkR0Y2JpQWdJQ0FnSUNBZ2MzUmhjblJZSUQwZ1pXd3VjMk55YjJ4c1RHVm1kRHRjYmlBZ0lDQWdJQ0FnYzNSaGNuUlpJRDBnWld3dWMyTnliMnhzVkc5d08xeHVJQ0FnSUNBZ0lDQnRaWFJvYjJRZ1BTQnpZM0p2Ykd4RmJHVnRaVzUwTzF4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNBdkx5QnpZM0p2Ykd3Z2JHOXZjR2x1WnlCdmRtVnlJR0VnWm5KaGJXVmNiaUFnSUNBZ0lITjBaWEFvZTF4dUlDQWdJQ0FnSUNCelkzSnZiR3hoWW14bE9pQnpZM0p2Ykd4aFlteGxMRnh1SUNBZ0lDQWdJQ0J0WlhSb2IyUTZJRzFsZEdodlpDeGNiaUFnSUNBZ0lDQWdjM1JoY25SVWFXMWxPaUJ6ZEdGeWRGUnBiV1VzWEc0Z0lDQWdJQ0FnSUhOMFlYSjBXRG9nYzNSaGNuUllMRnh1SUNBZ0lDQWdJQ0J6ZEdGeWRGazZJSE4wWVhKMFdTeGNiaUFnSUNBZ0lDQWdlRG9nZUN4Y2JpQWdJQ0FnSUNBZ2VUb2dlVnh1SUNBZ0lDQWdmU2s3WEc0Z0lDQWdmVnh1WEc0Z0lDQWdMeThnVDFKSlIwbE9RVXdnVFVWVVNFOUVVeUJQVmtWU1VrbEVSVk5jYmlBZ0lDQXZMeUIzTG5OamNtOXNiQ0JoYm1RZ2R5NXpZM0p2Ykd4VWIxeHVJQ0FnSUhjdWMyTnliMnhzSUQwZ2R5NXpZM0p2Ykd4VWJ5QTlJR1oxYm1OMGFXOXVLQ2tnZTF4dUlDQWdJQ0FnTHk4Z1lYWnZhV1FnWVdOMGFXOXVJSGRvWlc0Z2JtOGdZWEpuZFcxbGJuUnpJR0Z5WlNCd1lYTnpaV1JjYmlBZ0lDQWdJR2xtSUNoaGNtZDFiV1Z1ZEhOYk1GMGdQVDA5SUhWdVpHVm1hVzVsWkNrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200N1hHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lDOHZJR0YyYjJsa0lITnRiMjkwYUNCaVpXaGhkbWx2Y2lCcFppQnViM1FnY21WeGRXbHlaV1JjYmlBZ0lDQWdJR2xtSUNoemFHOTFiR1JDWVdsc1QzVjBLR0Z5WjNWdFpXNTBjMXN3WFNrZ1BUMDlJSFJ5ZFdVcElIdGNiaUFnSUNBZ0lDQWdiM0pwWjJsdVlXd3VjMk55YjJ4c0xtTmhiR3dvWEc0Z0lDQWdJQ0FnSUNBZ2R5eGNiaUFnSUNBZ0lDQWdJQ0JoY21kMWJXVnVkSE5iTUYwdWJHVm1kQ0FoUFQwZ2RXNWtaV1pwYm1Wa1hHNGdJQ0FnSUNBZ0lDQWdJQ0EvSUdGeVozVnRaVzUwYzFzd1hTNXNaV1owWEc0Z0lDQWdJQ0FnSUNBZ0lDQTZJSFI1Y0dWdlppQmhjbWQxYldWdWRITmJNRjBnSVQwOUlDZHZZbXBsWTNRblhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUQ4Z1lYSm5kVzFsYm5Seld6QmRYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lEb2dkeTV6WTNKdmJHeFlJSHg4SUhjdWNHRm5aVmhQWm1aelpYUXNYRzRnSUNBZ0lDQWdJQ0FnTHk4Z2RYTmxJSFJ2Y0NCd2NtOXdMQ0J6WldOdmJtUWdZWEpuZFcxbGJuUWdhV1lnY0hKbGMyVnVkQ0J2Y2lCbVlXeHNZbUZqYXlCMGJ5QnpZM0p2Ykd4WlhHNGdJQ0FnSUNBZ0lDQWdZWEpuZFcxbGJuUnpXekJkTG5SdmNDQWhQVDBnZFc1a1pXWnBibVZrWEc0Z0lDQWdJQ0FnSUNBZ0lDQS9JR0Z5WjNWdFpXNTBjMXN3WFM1MGIzQmNiaUFnSUNBZ0lDQWdJQ0FnSURvZ1lYSm5kVzFsYm5Seld6RmRJQ0U5UFNCMWJtUmxabWx1WldSY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnUHlCaGNtZDFiV1Z1ZEhOYk1WMWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ09pQjNMbk5qY205c2JGa2dmSHdnZHk1d1lXZGxXVTltWm5ObGRGeHVJQ0FnSUNBZ0lDQXBPMXh1WEc0Z0lDQWdJQ0FnSUhKbGRIVnlianRjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnTHk4Z1RFVlVJRlJJUlNCVFRVOVBWRWhPUlZOVElFSkZSMGxPSVZ4dUlDQWdJQ0FnYzIxdmIzUm9VMk55YjJ4c0xtTmhiR3dvWEc0Z0lDQWdJQ0FnSUhjc1hHNGdJQ0FnSUNBZ0lHUXVZbTlrZVN4Y2JpQWdJQ0FnSUNBZ1lYSm5kVzFsYm5Seld6QmRMbXhsWm5RZ0lUMDlJSFZ1WkdWbWFXNWxaRnh1SUNBZ0lDQWdJQ0FnSUQ4Z2ZuNWhjbWQxYldWdWRITmJNRjB1YkdWbWRGeHVJQ0FnSUNBZ0lDQWdJRG9nZHk1elkzSnZiR3hZSUh4OElIY3VjR0ZuWlZoUFptWnpaWFFzWEc0Z0lDQWdJQ0FnSUdGeVozVnRaVzUwYzFzd1hTNTBiM0FnSVQwOUlIVnVaR1ZtYVc1bFpGeHVJQ0FnSUNBZ0lDQWdJRDhnZm41aGNtZDFiV1Z1ZEhOYk1GMHVkRzl3WEc0Z0lDQWdJQ0FnSUNBZ09pQjNMbk5qY205c2JGa2dmSHdnZHk1d1lXZGxXVTltWm5ObGRGeHVJQ0FnSUNBZ0tUdGNiaUFnSUNCOU8xeHVYRzRnSUNBZ0x5OGdkeTV6WTNKdmJHeENlVnh1SUNBZ0lIY3VjMk55YjJ4c1Fua2dQU0JtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0FnSUM4dklHRjJiMmxrSUdGamRHbHZiaUIzYUdWdUlHNXZJR0Z5WjNWdFpXNTBjeUJoY21VZ2NHRnpjMlZrWEc0Z0lDQWdJQ0JwWmlBb1lYSm5kVzFsYm5Seld6QmRJRDA5UFNCMWJtUmxabWx1WldRcElIdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdU8xeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQXZMeUJoZG05cFpDQnpiVzl2ZEdnZ1ltVm9ZWFpwYjNJZ2FXWWdibTkwSUhKbGNYVnBjbVZrWEc0Z0lDQWdJQ0JwWmlBb2MyaHZkV3hrUW1GcGJFOTFkQ2hoY21kMWJXVnVkSE5iTUYwcEtTQjdYRzRnSUNBZ0lDQWdJRzl5YVdkcGJtRnNMbk5qY205c2JFSjVMbU5oYkd3b1hHNGdJQ0FnSUNBZ0lDQWdkeXhjYmlBZ0lDQWdJQ0FnSUNCaGNtZDFiV1Z1ZEhOYk1GMHViR1ZtZENBaFBUMGdkVzVrWldacGJtVmtYRzRnSUNBZ0lDQWdJQ0FnSUNBL0lHRnlaM1Z0Wlc1MGMxc3dYUzVzWldaMFhHNGdJQ0FnSUNBZ0lDQWdJQ0E2SUhSNWNHVnZaaUJoY21kMWJXVnVkSE5iTUYwZ0lUMDlJQ2R2WW1wbFkzUW5JRDhnWVhKbmRXMWxiblJ6V3pCZElEb2dNQ3hjYmlBZ0lDQWdJQ0FnSUNCaGNtZDFiV1Z1ZEhOYk1GMHVkRzl3SUNFOVBTQjFibVJsWm1sdVpXUmNiaUFnSUNBZ0lDQWdJQ0FnSUQ4Z1lYSm5kVzFsYm5Seld6QmRMblJ2Y0Z4dUlDQWdJQ0FnSUNBZ0lDQWdPaUJoY21kMWJXVnVkSE5iTVYwZ0lUMDlJSFZ1WkdWbWFXNWxaQ0EvSUdGeVozVnRaVzUwYzFzeFhTQTZJREJjYmlBZ0lDQWdJQ0FnS1R0Y2JseHVJQ0FnSUNBZ0lDQnlaWFIxY200N1hHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lDOHZJRXhGVkNCVVNFVWdVMDFQVDFSSVRrVlRVeUJDUlVkSlRpRmNiaUFnSUNBZ0lITnRiMjkwYUZOamNtOXNiQzVqWVd4c0tGeHVJQ0FnSUNBZ0lDQjNMRnh1SUNBZ0lDQWdJQ0JrTG1KdlpIa3NYRzRnSUNBZ0lDQWdJSDUrWVhKbmRXMWxiblJ6V3pCZExteGxablFnS3lBb2R5NXpZM0p2Ykd4WUlIeDhJSGN1Y0dGblpWaFBabVp6WlhRcExGeHVJQ0FnSUNBZ0lDQitmbUZ5WjNWdFpXNTBjMXN3WFM1MGIzQWdLeUFvZHk1elkzSnZiR3haSUh4OElIY3VjR0ZuWlZsUFptWnpaWFFwWEc0Z0lDQWdJQ0FwTzF4dUlDQWdJSDA3WEc1Y2JpQWdJQ0F2THlCRmJHVnRaVzUwTG5CeWIzUnZkSGx3WlM1elkzSnZiR3dnWVc1a0lFVnNaVzFsYm5RdWNISnZkRzkwZVhCbExuTmpjbTlzYkZSdlhHNGdJQ0FnUld4bGJXVnVkQzV3Y205MGIzUjVjR1V1YzJOeWIyeHNJRDBnUld4bGJXVnVkQzV3Y205MGIzUjVjR1V1YzJOeWIyeHNWRzhnUFNCbWRXNWpkR2x2YmlncElIdGNiaUFnSUNBZ0lDOHZJR0YyYjJsa0lHRmpkR2x2YmlCM2FHVnVJRzV2SUdGeVozVnRaVzUwY3lCaGNtVWdjR0Z6YzJWa1hHNGdJQ0FnSUNCcFppQW9ZWEpuZFcxbGJuUnpXekJkSUQwOVBTQjFibVJsWm1sdVpXUXBJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVPMXh1SUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0F2THlCaGRtOXBaQ0J6Ylc5dmRHZ2dZbVZvWVhacGIzSWdhV1lnYm05MElISmxjWFZwY21Wa1hHNGdJQ0FnSUNCcFppQW9jMmh2ZFd4a1FtRnBiRTkxZENoaGNtZDFiV1Z1ZEhOYk1GMHBJRDA5UFNCMGNuVmxLU0I3WEc0Z0lDQWdJQ0FnSUM4dklHbG1JRzl1WlNCdWRXMWlaWElnYVhNZ2NHRnpjMlZrTENCMGFISnZkeUJsY25KdmNpQjBieUJ0WVhSamFDQkdhWEpsWm05NElHbHRjR3hsYldWdWRHRjBhVzl1WEc0Z0lDQWdJQ0FnSUdsbUlDaDBlWEJsYjJZZ1lYSm5kVzFsYm5Seld6QmRJRDA5UFNBbmJuVnRZbVZ5SnlBbUppQmhjbWQxYldWdWRITmJNVjBnUFQwOUlIVnVaR1ZtYVc1bFpDa2dlMXh1SUNBZ0lDQWdJQ0FnSUhSb2NtOTNJRzVsZHlCVGVXNTBZWGhGY25KdmNpZ25WbUZzZFdVZ1kyOTFiR1FnYm05MElHSmxJR052Ym5abGNuUmxaQ2NwTzF4dUlDQWdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lDQWdiM0pwWjJsdVlXd3VaV3hsYldWdWRGTmpjbTlzYkM1allXeHNLRnh1SUNBZ0lDQWdJQ0FnSUhSb2FYTXNYRzRnSUNBZ0lDQWdJQ0FnTHk4Z2RYTmxJR3hsWm5RZ2NISnZjQ3dnWm1seWMzUWdiblZ0WW1WeUlHRnlaM1Z0Wlc1MElHOXlJR1poYkd4aVlXTnJJSFJ2SUhOamNtOXNiRXhsWm5SY2JpQWdJQ0FnSUNBZ0lDQmhjbWQxYldWdWRITmJNRjB1YkdWbWRDQWhQVDBnZFc1a1pXWnBibVZrWEc0Z0lDQWdJQ0FnSUNBZ0lDQS9JSDUrWVhKbmRXMWxiblJ6V3pCZExteGxablJjYmlBZ0lDQWdJQ0FnSUNBZ0lEb2dkSGx3Wlc5bUlHRnlaM1Z0Wlc1MGMxc3dYU0FoUFQwZ0oyOWlhbVZqZENjZ1B5QitmbUZ5WjNWdFpXNTBjMXN3WFNBNklIUm9hWE11YzJOeWIyeHNUR1ZtZEN4Y2JpQWdJQ0FnSUNBZ0lDQXZMeUIxYzJVZ2RHOXdJSEJ5YjNBc0lITmxZMjl1WkNCaGNtZDFiV1Z1ZENCdmNpQm1ZV3hzWW1GamF5QjBieUJ6WTNKdmJHeFViM0JjYmlBZ0lDQWdJQ0FnSUNCaGNtZDFiV1Z1ZEhOYk1GMHVkRzl3SUNFOVBTQjFibVJsWm1sdVpXUmNiaUFnSUNBZ0lDQWdJQ0FnSUQ4Z2ZuNWhjbWQxYldWdWRITmJNRjB1ZEc5d1hHNGdJQ0FnSUNBZ0lDQWdJQ0E2SUdGeVozVnRaVzUwYzFzeFhTQWhQVDBnZFc1a1pXWnBibVZrSUQ4Z2ZuNWhjbWQxYldWdWRITmJNVjBnT2lCMGFHbHpMbk5qY205c2JGUnZjRnh1SUNBZ0lDQWdJQ0FwTzF4dVhHNGdJQ0FnSUNBZ0lISmxkSFZ5Ymp0Y2JpQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ2RtRnlJR3hsWm5RZ1BTQmhjbWQxYldWdWRITmJNRjB1YkdWbWREdGNiaUFnSUNBZ0lIWmhjaUIwYjNBZ1BTQmhjbWQxYldWdWRITmJNRjB1ZEc5d08xeHVYRzRnSUNBZ0lDQXZMeUJNUlZRZ1ZFaEZJRk5OVDA5VVNFNUZVMU1nUWtWSFNVNGhYRzRnSUNBZ0lDQnpiVzl2ZEdoVFkzSnZiR3d1WTJGc2JDaGNiaUFnSUNBZ0lDQWdkR2hwY3l4Y2JpQWdJQ0FnSUNBZ2RHaHBjeXhjYmlBZ0lDQWdJQ0FnZEhsd1pXOW1JR3hsWm5RZ1BUMDlJQ2QxYm1SbFptbHVaV1FuSUQ4Z2RHaHBjeTV6WTNKdmJHeE1aV1owSURvZ2ZuNXNaV1owTEZ4dUlDQWdJQ0FnSUNCMGVYQmxiMllnZEc5d0lEMDlQU0FuZFc1a1pXWnBibVZrSnlBL0lIUm9hWE11YzJOeWIyeHNWRzl3SURvZ2ZuNTBiM0JjYmlBZ0lDQWdJQ2s3WEc0Z0lDQWdmVHRjYmx4dUlDQWdJQzh2SUVWc1pXMWxiblF1Y0hKdmRHOTBlWEJsTG5OamNtOXNiRUo1WEc0Z0lDQWdSV3hsYldWdWRDNXdjbTkwYjNSNWNHVXVjMk55YjJ4c1Fua2dQU0JtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0FnSUM4dklHRjJiMmxrSUdGamRHbHZiaUIzYUdWdUlHNXZJR0Z5WjNWdFpXNTBjeUJoY21VZ2NHRnpjMlZrWEc0Z0lDQWdJQ0JwWmlBb1lYSm5kVzFsYm5Seld6QmRJRDA5UFNCMWJtUmxabWx1WldRcElIdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdU8xeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQXZMeUJoZG05cFpDQnpiVzl2ZEdnZ1ltVm9ZWFpwYjNJZ2FXWWdibTkwSUhKbGNYVnBjbVZrWEc0Z0lDQWdJQ0JwWmlBb2MyaHZkV3hrUW1GcGJFOTFkQ2hoY21kMWJXVnVkSE5iTUYwcElEMDlQU0IwY25WbEtTQjdYRzRnSUNBZ0lDQWdJRzl5YVdkcGJtRnNMbVZzWlcxbGJuUlRZM0p2Ykd3dVkyRnNiQ2hjYmlBZ0lDQWdJQ0FnSUNCMGFHbHpMRnh1SUNBZ0lDQWdJQ0FnSUdGeVozVnRaVzUwYzFzd1hTNXNaV1owSUNFOVBTQjFibVJsWm1sdVpXUmNiaUFnSUNBZ0lDQWdJQ0FnSUQ4Z2ZuNWhjbWQxYldWdWRITmJNRjB1YkdWbWRDQXJJSFJvYVhNdWMyTnliMnhzVEdWbWRGeHVJQ0FnSUNBZ0lDQWdJQ0FnT2lCK2ZtRnlaM1Z0Wlc1MGMxc3dYU0FySUhSb2FYTXVjMk55YjJ4c1RHVm1kQ3hjYmlBZ0lDQWdJQ0FnSUNCaGNtZDFiV1Z1ZEhOYk1GMHVkRzl3SUNFOVBTQjFibVJsWm1sdVpXUmNiaUFnSUNBZ0lDQWdJQ0FnSUQ4Z2ZuNWhjbWQxYldWdWRITmJNRjB1ZEc5d0lDc2dkR2hwY3k1elkzSnZiR3hVYjNCY2JpQWdJQ0FnSUNBZ0lDQWdJRG9nZm41aGNtZDFiV1Z1ZEhOYk1WMGdLeUIwYUdsekxuTmpjbTlzYkZSdmNGeHVJQ0FnSUNBZ0lDQXBPMXh1WEc0Z0lDQWdJQ0FnSUhKbGRIVnlianRjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnZEdocGN5NXpZM0p2Ykd3b2UxeHVJQ0FnSUNBZ0lDQnNaV1owT2lCK2ZtRnlaM1Z0Wlc1MGMxc3dYUzVzWldaMElDc2dkR2hwY3k1elkzSnZiR3hNWldaMExGeHVJQ0FnSUNBZ0lDQjBiM0E2SUg1K1lYSm5kVzFsYm5Seld6QmRMblJ2Y0NBcklIUm9hWE11YzJOeWIyeHNWRzl3TEZ4dUlDQWdJQ0FnSUNCaVpXaGhkbWx2Y2pvZ1lYSm5kVzFsYm5Seld6QmRMbUpsYUdGMmFXOXlYRzRnSUNBZ0lDQjlLVHRjYmlBZ0lDQjlPMXh1WEc0Z0lDQWdMeThnUld4bGJXVnVkQzV3Y205MGIzUjVjR1V1YzJOeWIyeHNTVzUwYjFacFpYZGNiaUFnSUNCRmJHVnRaVzUwTG5CeWIzUnZkSGx3WlM1elkzSnZiR3hKYm5SdlZtbGxkeUE5SUdaMWJtTjBhVzl1S0NrZ2UxeHVJQ0FnSUNBZ0x5OGdZWFp2YVdRZ2MyMXZiM1JvSUdKbGFHRjJhVzl5SUdsbUlHNXZkQ0J5WlhGMWFYSmxaRnh1SUNBZ0lDQWdhV1lnS0hOb2IzVnNaRUpoYVd4UGRYUW9ZWEpuZFcxbGJuUnpXekJkS1NBOVBUMGdkSEoxWlNrZ2UxeHVJQ0FnSUNBZ0lDQnZjbWxuYVc1aGJDNXpZM0p2Ykd4SmJuUnZWbWxsZHk1allXeHNLRnh1SUNBZ0lDQWdJQ0FnSUhSb2FYTXNYRzRnSUNBZ0lDQWdJQ0FnWVhKbmRXMWxiblJ6V3pCZElEMDlQU0IxYm1SbFptbHVaV1FnUHlCMGNuVmxJRG9nWVhKbmRXMWxiblJ6V3pCZFhHNGdJQ0FnSUNBZ0lDazdYRzVjYmlBZ0lDQWdJQ0FnY21WMGRYSnVPMXh1SUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0F2THlCTVJWUWdWRWhGSUZOTlQwOVVTRTVGVTFNZ1FrVkhTVTRoWEc0Z0lDQWdJQ0IyWVhJZ2MyTnliMnhzWVdKc1pWQmhjbVZ1ZENBOUlHWnBibVJUWTNKdmJHeGhZbXhsVUdGeVpXNTBLSFJvYVhNcE8xeHVJQ0FnSUNBZ2RtRnlJSEJoY21WdWRGSmxZM1J6SUQwZ2MyTnliMnhzWVdKc1pWQmhjbVZ1ZEM1blpYUkNiM1Z1WkdsdVowTnNhV1Z1ZEZKbFkzUW9LVHRjYmlBZ0lDQWdJSFpoY2lCamJHbGxiblJTWldOMGN5QTlJSFJvYVhNdVoyVjBRbTkxYm1ScGJtZERiR2xsYm5SU1pXTjBLQ2s3WEc1Y2JpQWdJQ0FnSUdsbUlDaHpZM0p2Ykd4aFlteGxVR0Z5Wlc1MElDRTlQU0JrTG1KdlpIa3BJSHRjYmlBZ0lDQWdJQ0FnTHk4Z2NtVjJaV0ZzSUdWc1pXMWxiblFnYVc1emFXUmxJSEJoY21WdWRGeHVJQ0FnSUNBZ0lDQnpiVzl2ZEdoVFkzSnZiR3d1WTJGc2JDaGNiaUFnSUNBZ0lDQWdJQ0IwYUdsekxGeHVJQ0FnSUNBZ0lDQWdJSE5qY205c2JHRmliR1ZRWVhKbGJuUXNYRzRnSUNBZ0lDQWdJQ0FnYzJOeWIyeHNZV0pzWlZCaGNtVnVkQzV6WTNKdmJHeE1aV1owSUNzZ1kyeHBaVzUwVW1WamRITXViR1ZtZENBdElIQmhjbVZ1ZEZKbFkzUnpMbXhsWm5Rc1hHNGdJQ0FnSUNBZ0lDQWdjMk55YjJ4c1lXSnNaVkJoY21WdWRDNXpZM0p2Ykd4VWIzQWdLeUJqYkdsbGJuUlNaV04wY3k1MGIzQWdMU0J3WVhKbGJuUlNaV04wY3k1MGIzQmNiaUFnSUNBZ0lDQWdLVHRjYmx4dUlDQWdJQ0FnSUNBdkx5QnlaWFpsWVd3Z2NHRnlaVzUwSUdsdUlIWnBaWGR3YjNKMElIVnViR1Z6Y3lCcGN5Qm1hWGhsWkZ4dUlDQWdJQ0FnSUNCcFppQW9keTVuWlhSRGIyMXdkWFJsWkZOMGVXeGxLSE5qY205c2JHRmliR1ZRWVhKbGJuUXBMbkJ2YzJsMGFXOXVJQ0U5UFNBblptbDRaV1FuS1NCN1hHNGdJQ0FnSUNBZ0lDQWdkeTV6WTNKdmJHeENlU2g3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnNaV1owT2lCd1lYSmxiblJTWldOMGN5NXNaV1owTEZ4dUlDQWdJQ0FnSUNBZ0lDQWdkRzl3T2lCd1lYSmxiblJTWldOMGN5NTBiM0FzWEc0Z0lDQWdJQ0FnSUNBZ0lDQmlaV2hoZG1sdmNqb2dKM050YjI5MGFDZGNiaUFnSUNBZ0lDQWdJQ0I5S1R0Y2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ0x5OGdjbVYyWldGc0lHVnNaVzFsYm5RZ2FXNGdkbWxsZDNCdmNuUmNiaUFnSUNBZ0lDQWdkeTV6WTNKdmJHeENlU2g3WEc0Z0lDQWdJQ0FnSUNBZ2JHVm1kRG9nWTJ4cFpXNTBVbVZqZEhNdWJHVm1kQ3hjYmlBZ0lDQWdJQ0FnSUNCMGIzQTZJR05zYVdWdWRGSmxZM1J6TG5SdmNDeGNiaUFnSUNBZ0lDQWdJQ0JpWldoaGRtbHZjam9nSjNOdGIyOTBhQ2RjYmlBZ0lDQWdJQ0FnZlNrN1hHNGdJQ0FnSUNCOVhHNGdJQ0FnZlR0Y2JpQWdmVnh1WEc0Z0lHbG1JQ2gwZVhCbGIyWWdaWGh3YjNKMGN5QTlQVDBnSjI5aWFtVmpkQ2NnSmlZZ2RIbHdaVzltSUcxdlpIVnNaU0FoUFQwZ0ozVnVaR1ZtYVc1bFpDY3BJSHRjYmlBZ0lDQXZMeUJqYjIxdGIyNXFjMXh1SUNBZ0lHMXZaSFZzWlM1bGVIQnZjblJ6SUQwZ2V5QndiMng1Wm1sc2JEb2djRzlzZVdacGJHd2dmVHRjYmlBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0F2THlCbmJHOWlZV3hjYmlBZ0lDQndiMng1Wm1sc2JDZ3BPMXh1SUNCOVhHNWNibjBvS1NrN1hHNGlMQ0pqYjI1emRDQkVRaUE5SUNkb2RIUndjem92TDI1bGVIVnpMV05oZEdGc2IyY3VabWx5WldKaGMyVnBieTVqYjIwdmNHOXpkSE11YW5OdmJqOWhkWFJvUFRkbk4zQjVTMHQ1YTA0elRqVmxkM0pKYldoUFlWTTJkbmR5Um5Oak5XWkxhM0pyT0dWcWVtWW5PMXh1WTI5dWMzUWdZV3h3YUdGaVpYUWdQU0JiSjJFbkxDQW5ZaWNzSUNkakp5d2dKMlFuTENBblpTY3NJQ2RtSnl3Z0oyY25MQ0FuYUNjc0lDZHBKeXdnSjJvbkxDQW5heWNzSUNkc0p5d2dKMjBuTENBbmJpY3NJQ2R2Snl3Z0ozQW5MQ0FuY2ljc0lDZHpKeXdnSjNRbkxDQW5kU2NzSUNkMkp5d2dKM2NuTENBbmVTY3NJQ2Q2SjEwN1hHNWNibU52Ym5OMElDUnNiMkZrYVc1bklEMGdRWEp5WVhrdVpuSnZiU2hrYjJOMWJXVnVkQzV4ZFdWeWVWTmxiR1ZqZEc5eVFXeHNLQ2N1Ykc5aFpHbHVaeWNwS1R0Y2JtTnZibk4wSUNSdVlYWWdQU0JrYjJOMWJXVnVkQzVuWlhSRmJHVnRaVzUwUW5sSlpDZ25hbk10Ym1GMkp5azdYRzVqYjI1emRDQWtjR0Z5WVd4c1lYZ2dQU0JrYjJOMWJXVnVkQzV4ZFdWeWVWTmxiR1ZqZEc5eUtDY3VjR0Z5WVd4c1lYZ25LVHRjYm1OdmJuTjBJQ1JqYjI1MFpXNTBJRDBnWkc5amRXMWxiblF1Y1hWbGNubFRaV3hsWTNSdmNpZ25MbU52Ym5SbGJuUW5LVHRjYm1OdmJuTjBJQ1IwYVhSc1pTQTlJR1J2WTNWdFpXNTBMbWRsZEVWc1pXMWxiblJDZVVsa0tDZHFjeTEwYVhSc1pTY3BPMXh1WTI5dWMzUWdKR0Z5Y205M0lEMGdaRzlqZFcxbGJuUXVjWFZsY25sVFpXeGxZM1J2Y2lnbkxtRnljbTkzSnlrN1hHNWpiMjV6ZENBa2JXOWtZV3dnUFNCa2IyTjFiV1Z1ZEM1eGRXVnllVk5sYkdWamRHOXlLQ2N1Ylc5a1lXd25LVHRjYm1OdmJuTjBJQ1JzYVdkb2RHSnZlQ0E5SUdSdlkzVnRaVzUwTG5GMVpYSjVVMlZzWldOMGIzSW9KeTVzYVdkb2RHSnZlQ2NwTzF4dVkyOXVjM1FnSkhacFpYY2dQU0JrYjJOMWJXVnVkQzV4ZFdWeWVWTmxiR1ZqZEc5eUtDY3ViR2xuYUhSaWIzZ3RkbWxsZHljcE8xeHVYRzVsZUhCdmNuUWdleUJjYmx4MFJFSXNJRnh1WEhSaGJIQm9ZV0psZEN3Z1hHNWNkQ1JzYjJGa2FXNW5MQ0JjYmx4MEpHNWhkaXdnWEc1Y2RDUndZWEpoYkd4aGVDeGNibHgwSkdOdmJuUmxiblFzWEc1Y2RDUjBhWFJzWlN4Y2JseDBKR0Z5Y205M0xGeHVYSFFrYlc5a1lXd3NYRzVjZENSc2FXZG9kR0p2ZUN4Y2JseDBKSFpwWlhjZ1hHNTlPeUlzSW1sdGNHOXlkQ0J6Ylc5dmRHaHpZM0p2Ykd3Z1puSnZiU0FuYzIxdmIzUm9jMk55YjJ4c0xYQnZiSGxtYVd4c0p6dGNibHh1YVcxd2IzSjBJSHNnWVhKMGFXTnNaVlJsYlhCc1lYUmxMQ0J5Wlc1a1pYSk9ZWFpNWnlCOUlHWnliMjBnSnk0dmRHVnRjR3hoZEdWekp6dGNibWx0Y0c5eWRDQjdJR1JsWW05MWJtTmxMQ0JvYVdSbFRHOWhaR2x1Wnl3Z2MyTnliMnhzVkc5VWIzQXNJRzFoYTJWVGJHbGtaWElnZlNCbWNtOXRJQ2N1TDNWMGFXeHpKenRjYmx4dWFXMXdiM0owSUhzZ1JFSXNJR0ZzY0doaFltVjBMQ0FrYm1GMkxDQWtjR0Z5WVd4c1lYZ3NJQ1JqYjI1MFpXNTBMQ0FrZEdsMGJHVXNJQ1JoY25KdmR5d2dKRzF2WkdGc0xDQWtiR2xuYUhSaWIzZ3NJQ1IyYVdWM0lIMGdabkp2YlNBbkxpOWpiMjV6ZEdGdWRITW5PMXh1WEc1Y2JteGxkQ0J6YjNKMFMyVjVJRDBnTURzZ0x5OGdNQ0E5SUdGeWRHbHpkQ3dnTVNBOUlIUnBkR3hsWEc1c1pYUWdaVzUwY21sbGN5QTlJSHNnWW5sQmRYUm9iM0k2SUZ0ZExDQmllVlJwZEd4bE9pQmJYU0I5TzF4dWJHVjBJR04xY25KbGJuUk1aWFIwWlhJZ1BTQW5RU2M3WEc1c1pYUWdiVzlrWVd3Z1BTQm1ZV3h6WlR0Y2JteGxkQ0JzYVdkb2RHSnZlQ0E5SUdaaGJITmxPMXh1WEc1amIyNXpkQ0JoZEhSaFkyaEpiV0ZuWlV4cGMzUmxibVZ5Y3lBOUlDZ3BJRDArSUh0Y2JseDBZMjl1YzNRZ0pHbHRZV2RsY3lBOUlFRnljbUY1TG1aeWIyMG9aRzlqZFcxbGJuUXVjWFZsY25sVFpXeGxZM1J2Y2tGc2JDZ25MbUZ5ZEdsamJHVXRhVzFoWjJVbktTazdYRzVjYmx4MEpHbHRZV2RsY3k1bWIzSkZZV05vS0dsdFp5QTlQaUI3WEc1Y2RGeDBhVzFuTG1Ga1pFVjJaVzUwVEdsemRHVnVaWElvSjJOc2FXTnJKeXdnS0dWMmRDa2dQVDRnZTF4dVhIUmNkRngwYVdZZ0tDRnNhV2RvZEdKdmVDa2dlMXh1WEhSY2RGeDBYSFJzWlhRZ2MzSmpJRDBnYVcxbkxuTnlZenRjYmx4MFhIUmNkRngwWEc1Y2RGeDBYSFJjZENSc2FXZG9kR0p2ZUM1amJHRnpjMHhwYzNRdVlXUmtLQ2R6YUc5M0xXbHRaeWNwTzF4dVhIUmNkRngwWEhRa2RtbGxkeTV6WlhSQmRIUnlhV0oxZEdVb0ozTjBlV3hsSnl3Z1lHSmhZMnRuY205MWJtUXRhVzFoWjJVNklIVnliQ2drZTNOeVkzMHBZQ2s3WEc1Y2RGeDBYSFJjZEd4cFoyaDBZbTk0SUQwZ2RISjFaVHRjYmx4MFhIUmNkSDFjYmx4MFhIUjlLVHRjYmx4MGZTazdYRzVjYmx4MEpIWnBaWGN1WVdSa1JYWmxiblJNYVhOMFpXNWxjaWduWTJ4cFkyc25MQ0FvS1NBOVBpQjdYRzVjZEZ4MGFXWWdLR3hwWjJoMFltOTRLU0I3WEc1Y2RGeDBYSFFrYkdsbmFIUmliM2d1WTJ4aGMzTk1hWE4wTG5KbGJXOTJaU2duYzJodmR5MXBiV2NuS1R0Y2JseDBYSFJjZEd4cFoyaDBZbTk0SUQwZ1ptRnNjMlU3WEc1Y2RGeDBmVnh1WEhSOUtUdGNibjA3WEc1Y2JtTnZibk4wSUdGMGRHRmphRTF2WkdGc1RHbHpkR1Z1WlhKeklEMGdLQ2tnUFQ0Z2UxeHVYSFJqYjI1emRDQWtabWx1WkNBOUlHUnZZM1Z0Wlc1MExtZGxkRVZzWlcxbGJuUkNlVWxrS0NkcWN5MW1hVzVrSnlrN1hHNWNkRnh1WEhRa1ptbHVaQzVoWkdSRmRtVnVkRXhwYzNSbGJtVnlLQ2RqYkdsamF5Y3NJQ2dwSUQwK0lIdGNibHgwWEhRa2JXOWtZV3d1WTJ4aGMzTk1hWE4wTG1Ga1pDZ25jMmh2ZHljcE8xeHVYSFJjZEcxdlpHRnNJRDBnZEhKMVpUdGNibHgwZlNrN1hHNWNibHgwSkcxdlpHRnNMbUZrWkVWMlpXNTBUR2x6ZEdWdVpYSW9KMk5zYVdOckp5d2dLQ2tnUFQ0Z2UxeHVYSFJjZENSdGIyUmhiQzVqYkdGemMweHBjM1F1Y21WdGIzWmxLQ2R6YUc5M0p5azdYRzVjZEZ4MGJXOWtZV3dnUFNCbVlXeHpaVHRjYmx4MGZTazdYRzVjYmx4MGQybHVaRzkzTG1Ga1pFVjJaVzUwVEdsemRHVnVaWElvSjJ0bGVXUnZkMjRuTENBb0tTQTlQaUI3WEc1Y2RGeDBhV1lnS0cxdlpHRnNLU0I3WEc1Y2RGeDBYSFJ6WlhSVWFXMWxiM1YwS0NncElEMCtJSHRjYmx4MFhIUmNkRngwSkcxdlpHRnNMbU5zWVhOelRHbHpkQzV5WlcxdmRtVW9KM05vYjNjbktUdGNibHgwWEhSY2RGeDBiVzlrWVd3Z1BTQm1ZV3h6WlR0Y2JseDBYSFJjZEgwc0lEWXdNQ2s3WEc1Y2RGeDBmVHRjYmx4MGZTazdYRzU5WEc1Y2JteGxkQ0J3Y21WMk8xeHViR1YwSUdOMWNuSmxiblFnUFNBd08xeHViR1YwSUdselUyaHZkMmx1WnlBOUlHWmhiSE5sTzF4dVkyOXVjM1FnWVhSMFlXTm9RWEp5YjNkTWFYTjBaVzVsY25NZ1BTQW9LU0E5UGlCN1hHNWNkQ1JoY25KdmR5NWhaR1JGZG1WdWRFeHBjM1JsYm1WeUtDZGpiR2xqYXljc0lDZ3BJRDArSUh0Y2JseDBYSFJ6WTNKdmJHeFViMVJ2Y0NncE8xeHVYSFI5S1R0Y2JseHVYSFFrY0dGeVlXeHNZWGd1WVdSa1JYWmxiblJNYVhOMFpXNWxjaWduYzJOeWIyeHNKeXdnS0NrZ1BUNGdlMXh1WEc1Y2RGeDBiR1YwSUhrZ1BTQWtkR2wwYkdVdVoyVjBRbTkxYm1ScGJtZERiR2xsYm5SU1pXTjBLQ2t1ZVR0Y2JseDBYSFJwWmlBb1kzVnljbVZ1ZENBaFBUMGdlU2tnZTF4dVhIUmNkRngwY0hKbGRpQTlJR04xY25KbGJuUTdYRzVjZEZ4MFhIUmpkWEp5Wlc1MElEMGdlVHRjYmx4MFhIUjlYRzVjYmx4MFhIUnBaaUFvZVNBOFBTQXROVEFnSmlZZ0lXbHpVMmh2ZDJsdVp5a2dlMXh1WEhSY2RGeDBKR0Z5Y205M0xtTnNZWE56VEdsemRDNWhaR1FvSjNOb2IzY25LVHRjYmx4MFhIUmNkR2x6VTJodmQybHVaeUE5SUhSeWRXVTdYRzVjZEZ4MGZTQmxiSE5sSUdsbUlDaDVJRDRnTFRVd0lDWW1JR2x6VTJodmQybHVaeWtnZTF4dVhIUmNkRngwSkdGeWNtOTNMbU5zWVhOelRHbHpkQzV5WlcxdmRtVW9KM05vYjNjbktUdGNibHgwWEhSY2RHbHpVMmh2ZDJsdVp5QTlJR1poYkhObE8xeHVYSFJjZEgxY2JseDBmU2s3WEc1OU8xeHVYRzVqYjI1emRDQmhaR1JUYjNKMFFuVjBkRzl1VEdsemRHVnVaWEp6SUQwZ0tDa2dQVDRnZTF4dVhIUnNaWFFnSkdKNVFYSjBhWE4wSUQwZ1pHOWpkVzFsYm5RdVoyVjBSV3hsYldWdWRFSjVTV1FvSjJwekxXSjVMV0Z5ZEdsemRDY3BPMXh1WEhSc1pYUWdKR0o1VkdsMGJHVWdQU0JrYjJOMWJXVnVkQzVuWlhSRmJHVnRaVzUwUW5sSlpDZ25hbk10WW5rdGRHbDBiR1VuS1R0Y2JseDBKR0o1UVhKMGFYTjBMbUZrWkVWMlpXNTBUR2x6ZEdWdVpYSW9KMk5zYVdOckp5d2dLQ2tnUFQ0Z2UxeHVYSFJjZEdsbUlDaHpiM0owUzJWNUtTQjdYRzVjZEZ4MFhIUnpZM0p2Ykd4VWIxUnZjQ2dwTzF4dVhIUmNkRngwYzI5eWRFdGxlU0E5SURBN1hHNWNkRngwWEhRa1lubEJjblJwYzNRdVkyeGhjM05NYVhOMExtRmtaQ2duWVdOMGFYWmxKeWs3WEc1Y2RGeDBYSFFrWW5sVWFYUnNaUzVqYkdGemMweHBjM1F1Y21WdGIzWmxLQ2RoWTNScGRtVW5LVHRjYmx4dVhIUmNkRngwY21WdVpHVnlSVzUwY21sbGN5Z3BPMXh1WEhSY2RIMWNibHgwZlNrN1hHNWNibHgwSkdKNVZHbDBiR1V1WVdSa1JYWmxiblJNYVhOMFpXNWxjaWduWTJ4cFkyc25MQ0FvS1NBOVBpQjdYRzVjZEZ4MGFXWWdLQ0Z6YjNKMFMyVjVLU0I3WEc1Y2RGeDBYSFJ6WTNKdmJHeFViMVJ2Y0NncE8xeHVYSFJjZEZ4MGMyOXlkRXRsZVNBOUlERTdYRzVjZEZ4MFhIUWtZbmxVYVhSc1pTNWpiR0Z6YzB4cGMzUXVZV1JrS0NkaFkzUnBkbVVuS1R0Y2JseDBYSFJjZENSaWVVRnlkR2x6ZEM1amJHRnpjMHhwYzNRdWNtVnRiM1psS0NkaFkzUnBkbVVuS1R0Y2JseHVYSFJjZEZ4MGNtVnVaR1Z5Ulc1MGNtbGxjeWdwTzF4dVhIUmNkSDFjYmx4MGZTazdYRzU5TzF4dVhHNWpiMjV6ZENCbWFXNWtSbWx5YzNSRmJuUnllU0E5SUNoamFHRnlLU0E5UGlCN1hHNWNkR052Ym5OMElITmxiR1ZqZEc5eUlEMGdjMjl5ZEV0bGVTQS9JQ2N1YW5NdFpXNTBjbmt0ZEdsMGJHVW5JRG9nSnk1cWN5MWxiblJ5ZVMxaGNuUnBjM1FuTzF4dVhIUmpiMjV6ZENCd2NtVjJVMlZzWldOMGIzSWdQU0FoYzI5eWRFdGxlU0EvSUNjdWFuTXRaVzUwY25rdGRHbDBiR1VuSURvZ0p5NXFjeTFsYm5SeWVTMWhjblJwYzNRbk8xeHVYRzVjZEdOdmJuTjBJQ1JsYm5SeWFXVnpJRDBnUVhKeVlYa3Vabkp2YlNoa2IyTjFiV1Z1ZEM1eGRXVnllVk5sYkdWamRHOXlRV3hzS0hObGJHVmpkRzl5S1NrN1hHNWNkR052Ym5OMElDUndjbVYyUlc1MGNtbGxjeUE5SUVGeWNtRjVMbVp5YjIwb1pHOWpkVzFsYm5RdWNYVmxjbmxUWld4bFkzUnZja0ZzYkNod2NtVjJVMlZzWldOMGIzSXBLVHRjYmx4dVhIUWtjSEpsZGtWdWRISnBaWE11Wm05eVJXRmphQ2hsYm5SeWVTQTlQaUJsYm5SeWVTNXlaVzF2ZG1WQmRIUnlhV0oxZEdVb0oyNWhiV1VuS1NrN1hHNWNibHgwY21WMGRYSnVJQ1JsYm5SeWFXVnpMbVpwYm1Rb1pXNTBjbmtnUFQ0Z2UxeHVYSFJjZEd4bGRDQnViMlJsSUQwZ1pXNTBjbmt1Ym1WNGRFVnNaVzFsYm5SVGFXSnNhVzVuTzF4dVhIUmNkSEpsZEhWeWJpQnViMlJsTG1sdWJtVnlTRlJOVEZzd1hTQTlQVDBnWTJoaGNpQjhmQ0J1YjJSbExtbHVibVZ5U0ZSTlRGc3dYU0E5UFQwZ1kyaGhjaTUwYjFWd2NHVnlRMkZ6WlNncE8xeHVYSFI5S1R0Y2JuMDdYRzVjYm1OdmJuTjBJRzFoYTJWQmJIQm9ZV0psZENBOUlDZ3BJRDArSUh0Y2JseDBZMjl1YzNRZ1lYUjBZV05vUVc1amFHOXlUR2x6ZEdWdVpYSWdQU0FvSkdGdVkyaHZjaXdnYkdWMGRHVnlLU0E5UGlCN1hHNWNkRngwSkdGdVkyaHZjaTVoWkdSRmRtVnVkRXhwYzNSbGJtVnlLQ2RqYkdsamF5Y3NJQ2dwSUQwK0lIdGNibHgwWEhSY2RHTnZibk4wSUd4bGRIUmxjazV2WkdVZ1BTQmtiMk4xYldWdWRDNW5aWFJGYkdWdFpXNTBRbmxKWkNoc1pYUjBaWElwTzF4dVhIUmNkRngwYkdWMElIUmhjbWRsZER0Y2JseHVYSFJjZEZ4MGFXWWdLQ0Z6YjNKMFMyVjVLU0I3WEc1Y2RGeDBYSFJjZEhSaGNtZGxkQ0E5SUd4bGRIUmxjaUE5UFQwZ0oyRW5JRDhnWkc5amRXMWxiblF1WjJWMFJXeGxiV1Z1ZEVKNVNXUW9KMkZ1WTJodmNpMTBZWEpuWlhRbktTQTZJR3hsZEhSbGNrNXZaR1V1Y0dGeVpXNTBSV3hsYldWdWRDNXdZWEpsYm5SRmJHVnRaVzUwTG5CaGNtVnVkRVZzWlcxbGJuUXVjR0Z5Wlc1MFJXeGxiV1Z1ZEM1d2NtVjJhVzkxYzBWc1pXMWxiblJUYVdKc2FXNW5MbkYxWlhKNVUyVnNaV04wYjNJb0p5NXFjeTFoY25ScFkyeGxMV0Z1WTJodmNpMTBZWEpuWlhRbktUdGNibHgwWEhSY2RIMGdaV3h6WlNCN1hHNWNkRngwWEhSY2RIUmhjbWRsZENBOUlHeGxkSFJsY2lBOVBUMGdKMkVuSUQ4Z1pHOWpkVzFsYm5RdVoyVjBSV3hsYldWdWRFSjVTV1FvSjJGdVkyaHZjaTEwWVhKblpYUW5LU0E2SUd4bGRIUmxjazV2WkdVdWNHRnlaVzUwUld4bGJXVnVkQzV3WVhKbGJuUkZiR1Z0Wlc1MExuQmhjbVZ1ZEVWc1pXMWxiblF1Y0hKbGRtbHZkWE5GYkdWdFpXNTBVMmxpYkdsdVp5NXhkV1Z5ZVZObGJHVmpkRzl5S0NjdWFuTXRZWEowYVdOc1pTMWhibU5vYjNJdGRHRnlaMlYwSnlrN1hHNWNkRngwWEhSOU8xeHVYRzVjZEZ4MFhIUjBZWEpuWlhRdWMyTnliMnhzU1c1MGIxWnBaWGNvZTJKbGFHRjJhVzl5T2lCY0luTnRiMjkwYUZ3aUxDQmliRzlqYXpvZ1hDSnpkR0Z5ZEZ3aWZTazdYRzVjZEZ4MGZTazdYRzVjZEgwN1hHNWNibHgwYkdWMElHRmpkR2wyWlVWdWRISnBaWE1nUFNCN2ZUdGNibHgwYkdWMElDUnZkWFJsY2lBOUlHUnZZM1Z0Wlc1MExuRjFaWEo1VTJWc1pXTjBiM0lvSnk1aGJIQm9ZV0psZEY5ZmJHVjBkR1Z5Y3ljcE8xeHVYSFFrYjNWMFpYSXVhVzV1WlhKSVZFMU1JRDBnSnljN1hHNWNibHgwWVd4d2FHRmlaWFF1Wm05eVJXRmphQ2hzWlhSMFpYSWdQVDRnZTF4dVhIUmNkR3hsZENBa1ptbHljM1JGYm5SeWVTQTlJR1pwYm1SR2FYSnpkRVZ1ZEhKNUtHeGxkSFJsY2lrN1hHNWNkRngwYkdWMElDUmhibU5vYjNJZ1BTQmtiMk4xYldWdWRDNWpjbVZoZEdWRmJHVnRaVzUwS0NkaEp5azdYRzVjYmx4MFhIUnBaaUFvSVNSbWFYSnpkRVZ1ZEhKNUtTQnlaWFIxY200N1hHNWNibHgwWEhRa1ptbHljM1JGYm5SeWVTNXBaQ0E5SUd4bGRIUmxjanRjYmx4MFhIUWtZVzVqYUc5eUxtbHVibVZ5U0ZSTlRDQTlJR3hsZEhSbGNpNTBiMVZ3Y0dWeVEyRnpaU2dwTzF4dVhIUmNkQ1JoYm1Ob2IzSXVZMnhoYzNOT1lXMWxJRDBnSjJGc2NHaGhZbVYwWDE5c1pYUjBaWEl0WVc1amFHOXlKenRjYmx4dVhIUmNkR0YwZEdGamFFRnVZMmh2Y2t4cGMzUmxibVZ5S0NSaGJtTm9iM0lzSUd4bGRIUmxjaWs3WEc1Y2RGeDBKRzkxZEdWeUxtRndjR1Z1WkVOb2FXeGtLQ1JoYm1Ob2IzSXBPMXh1WEhSOUtUdGNibjA3WEc1Y2JtTnZibk4wSUhKbGJtUmxja1Z1ZEhKcFpYTWdQU0FvS1NBOVBpQjdYRzVjZEdOdmJuTjBJQ1JoY25ScFkyeGxUR2x6ZENBOUlHUnZZM1Z0Wlc1MExtZGxkRVZzWlcxbGJuUkNlVWxrS0NkcWN5MXNhWE4wSnlrN1hHNWNkR052Ym5OMElHVnVkSEpwWlhOTWFYTjBJRDBnYzI5eWRFdGxlU0EvSUdWdWRISnBaWE11WW5sVWFYUnNaU0E2SUdWdWRISnBaWE11WW5sQmRYUm9iM0k3WEc1Y2JseDBKR0Z5ZEdsamJHVk1hWE4wTG1sdWJtVnlTRlJOVENBOUlDY25PMXh1WEc1Y2RHVnVkSEpwWlhOTWFYTjBMbVp2Y2tWaFkyZ29LR1Z1ZEhKNUxDQnBLU0E5UGlCN1hHNWNkRngwSkdGeWRHbGpiR1ZNYVhOMExtbHVjMlZ5ZEVGa2FtRmpaVzUwU0ZSTlRDZ25ZbVZtYjNKbFpXNWtKeXdnWVhKMGFXTnNaVlJsYlhCc1lYUmxLR1Z1ZEhKNUxDQnBLU2s3WEc1Y2RGeDBiV0ZyWlZOc2FXUmxjaWhrYjJOMWJXVnVkQzVuWlhSRmJHVnRaVzUwUW5sSlpDaGdjMnhwWkdWeUxTUjdhWDFnS1NrN1hHNWNkSDBwTzF4dVhHNWNkR0YwZEdGamFFbHRZV2RsVEdsemRHVnVaWEp6S0NrN1hHNWNkRzFoYTJWQmJIQm9ZV0psZENncE8xeHVmVHRjYmx4dVkyOXVjM1FnYzJWMFJHRjBZVUZ1WkZOdmNuUkNlVlJwZEd4bElEMGdLR1JoZEdFcElEMCtJSHRjYmx4MFpXNTBjbWxsY3k1aWVVRjFkR2h2Y2lBOUlHUmhkR0U3WEc1Y2RHVnVkSEpwWlhNdVlubFVhWFJzWlNBOUlHUmhkR0V1YzJ4cFkyVW9LVHNnTHk4Z1kyOXdhV1Z6SUdSaGRHRWdabTl5SUdKNVZHbDBiR1VnYzI5eWRGeHVYRzVjZEdWdWRISnBaWE11WW5sVWFYUnNaUzV6YjNKMEtDaGhMQ0JpS1NBOVBpQjdYRzVjZEZ4MGJHVjBJR0ZVYVhSc1pTQTlJR0V1ZEdsMGJHVmJNRjB1ZEc5VmNIQmxja05oYzJVb0tUdGNibHgwWEhSc1pYUWdZbFJwZEd4bElEMGdZaTUwYVhSc1pWc3dYUzUwYjFWd2NHVnlRMkZ6WlNncE8xeHVYSFJjZEdsbUlDaGhWR2wwYkdVZ1BpQmlWR2wwYkdVcElISmxkSFZ5YmlBeE8xeHVYSFJjZEdWc2MyVWdhV1lnS0dGVWFYUnNaU0E4SUdKVWFYUnNaU2tnY21WMGRYSnVJQzB4TzF4dVhIUmNkR1ZzYzJVZ2NtVjBkWEp1SURBN1hHNWNkSDBwTzF4dWZUdGNibHh1WTI5dWMzUWdabVYwWTJoRVlYUmhJRDBnS0NrZ1BUNGdlMXh1WEhSbVpYUmphQ2hFUWlrdWRHaGxiaWh5WlhNZ1BUNGdjbVZ6TG1wemIyNG9LU2xjYmx4MExuUm9aVzRvWkdGMFlTQTlQaUI3WEc1Y2RGeDBjMlYwUkdGMFlVRnVaRk52Y25SQ2VWUnBkR3hsS0dSaGRHRXBPMXh1WEhSY2RISmxibVJsY2tWdWRISnBaWE1vS1R0Y2JseDBYSFJvYVdSbFRHOWhaR2x1WnlncE8xeHVYSFI5S1Z4dVhIUXVZMkYwWTJnb1pYSnlJRDArSUdOdmJuTnZiR1V1ZDJGeWJpaGxjbklwS1R0Y2JuMDdYRzVjYm1OdmJuTjBJR2x1YVhRZ1BTQW9LU0E5UGlCN1hHNWNkSE50YjI5MGFITmpjbTlzYkM1d2IyeDVabWxzYkNncE8xeHVYSFJtWlhSamFFUmhkR0VvS1R0Y2JseHVYSFJ5Wlc1a1pYSk9ZWFpNWnlncE8xeHVYSFJoWkdSVGIzSjBRblYwZEc5dVRHbHpkR1Z1WlhKektDazdYRzVjZEdGMGRHRmphRUZ5Y205M1RHbHpkR1Z1WlhKektDazdYRzVjZEdGMGRHRmphRTF2WkdGc1RHbHpkR1Z1WlhKektDazdYRzU5WEc1Y2JtbHVhWFFvS1R0Y2JpSXNJbU52Ym5OMElHbHRZV2RsVkdWdGNHeGhkR1VnUFNBb2FXMWhaMlVwSUQwK0lHQThhVzFuSUdOc1lYTnpQVndpWVhKMGFXTnNaUzFwYldkY0lpQnpjbU05WENJdUxpOHVMaTloYzNObGRITXZhVzFoWjJWekx5UjdhVzFoWjJWOVhDSStQQzlwYldjK1lEdGNibHh1WTI5dWMzUWdZWEowYVdOc1pWUmxiWEJzWVhSbElEMGdLR1Z1ZEhKNUxDQnBLU0E5UGlCN1hHNWNkR052Ym5OMElIc2dkR2wwYkdVc0lHWnBjbk4wVG1GdFpTd2diR0Z6ZEU1aGJXVXNJR2x0WVdkbGN5d2daR1Z6WTNKcGNIUnBiMjRzSUdSbGRHRnBiQ0I5SUQwZ1pXNTBjbms3WEc1Y2JseDBZMjl1YzNRZ2FXMWhaMlZJVkUxTUlEMGdhVzFoWjJWekxteGxibWQwYUNBL0lGeHVYSFJjZEdsdFlXZGxjeTV0WVhBb2FXMWhaMlVnUFQ0Z2FXMWhaMlZVWlcxd2JHRjBaU2hwYldGblpTa3BMbXB2YVc0b0p5Y3BJRG9nSnljN1hHNWNibHgwY21WMGRYSnVJQ0JnWEc1Y2RGeDBQR0Z5ZEdsamJHVWdZMnhoYzNNOVhDSmhjblJwWTJ4bFgxOXZkWFJsY2x3aVBseHVYSFJjZEZ4MFBHUnBkaUJqYkdGemN6MWNJbUZ5ZEdsamJHVmZYMmx1Ym1WeVhDSStYRzVjZEZ4MFhIUmNkRHhrYVhZZ1kyeGhjM005WENKaGNuUnBZMnhsWDE5b1pXRmthVzVuWENJK1hHNWNkRngwWEhSY2RGeDBQR0VnWTJ4aGMzTTlYQ0pxY3kxbGJuUnllUzEwYVhSc1pWd2lQand2WVQ1Y2JseDBYSFJjZEZ4MFhIUThhRElnWTJ4aGMzTTlYQ0poY25ScFkyeGxMV2hsWVdScGJtZGZYM1JwZEd4bFhDSStKSHQwYVhSc1pYMDhMMmd5UGx4dVhIUmNkRngwWEhSY2REeGthWFlnWTJ4aGMzTTlYQ0poY25ScFkyeGxMV2hsWVdScGJtZGZYMjVoYldWY0lqNWNibHgwWEhSY2RGeDBYSFJjZER4emNHRnVJR05zWVhOelBWd2lZWEowYVdOc1pTMW9aV0ZrYVc1blgxOXVZVzFsTFMxbWFYSnpkRndpUGlSN1ptbHljM1JPWVcxbGZUd3ZjM0JoYmo1Y2JseDBYSFJjZEZ4MFhIUmNkRHhoSUdOc1lYTnpQVndpYW5NdFpXNTBjbmt0WVhKMGFYTjBYQ0krUEM5aFBseHVYSFJjZEZ4MFhIUmNkRngwUEhOd1lXNGdZMnhoYzNNOVhDSmhjblJwWTJ4bExXaGxZV1JwYm1kZlgyNWhiV1V0TFd4aGMzUmNJajRrZTJ4aGMzUk9ZVzFsZlR3dmMzQmhiajVjYmx4MFhIUmNkRngwWEhROEwyUnBkajVjYmx4MFhIUmNkRngwUEM5a2FYWStYSFJjYmx4MFhIUmNkRngwUEdScGRpQmpiR0Z6Y3oxY0ltRnlkR2xqYkdWZlgzTnNhV1JsY2kxdmRYUmxjbHdpUGx4dVhIUmNkRngwWEhSY2REeGthWFlnWTJ4aGMzTTlYQ0poY25ScFkyeGxYMTl6Ykdsa1pYSXRhVzV1WlhKY0lpQnBaRDFjSW5Oc2FXUmxjaTBrZTJsOVhDSStYRzVjZEZ4MFhIUmNkRngwWEhRa2UybHRZV2RsU0ZSTlRIMWNibHgwWEhSY2RGeDBYSFJjZER4a2FYWWdZMnhoYzNNOVhDSmhjblJwWTJ4bExXUmxjMk55YVhCMGFXOXVYMTl2ZFhSbGNsd2lQbHh1WEhSY2RGeDBYSFJjZEZ4MFhIUThaR2wySUdOc1lYTnpQVndpWVhKMGFXTnNaUzFrWlhOamNtbHdkR2x2Ymx3aVBpUjdaR1Z6WTNKcGNIUnBiMjU5UEM5a2FYWStYRzVjZEZ4MFhIUmNkRngwWEhSY2REeGthWFlnWTJ4aGMzTTlYQ0poY25ScFkyeGxMV1JsZEdGcGJGd2lQaVI3WkdWMFlXbHNmVHd2WkdsMlBseHVYSFJjZEZ4MFhIUmNkRngwUEM5a2FYWStYRzVjZEZ4MFhIUmNkRngwUEM5a2FYWStYRzVjZEZ4MFhIUmNkRngwUEdScGRpQmpiR0Z6Y3oxY0ltRnlkR2xqYkdWZlgzTmpjbTlzYkMxamIyNTBjbTlzYzF3aVBseHVYSFJjZEZ4MFhIUmNkRngwUEhOd1lXNGdZMnhoYzNNOVhDSmpiMjUwY205c2N5Qmhjbkp2ZHkxd2NtVjJYQ0krNG9hUVBDOXpjR0Z1UGlCY2JseDBYSFJjZEZ4MFhIUmNkRHh6Y0dGdUlHTnNZWE56UFZ3aVkyOXVkSEp2YkhNZ1lYSnliM2N0Ym1WNGRGd2lQdUtHa2p3dmMzQmhiajVjYmx4MFhIUmNkRngwWEhROEwyUnBkajVjYmx4MFhIUmNkRngwWEhROGNDQmpiR0Z6Y3oxY0ltcHpMV0Z5ZEdsamJHVXRZVzVqYUc5eUxYUmhjbWRsZEZ3aVBqd3ZjRDVjYmx4MFhIUmNkRHd2WkdsMlBseHVYSFJjZER3dllYSjBhV05zWlQ1Y2JseDBZRnh1ZlR0Y2JseHVaWGh3YjNKMElHUmxabUYxYkhRZ1lYSjBhV05zWlZSbGJYQnNZWFJsT3lJc0ltbHRjRzl5ZENCaGNuUnBZMnhsVkdWdGNHeGhkR1VnWm5KdmJTQW5MaTloY25ScFkyeGxKenRjYm1sdGNHOXlkQ0J5Wlc1a1pYSk9ZWFpNWnlCbWNtOXRJQ2N1TDI1aGRreG5KenRjYmx4dVpYaHdiM0owSUhzZ1lYSjBhV05zWlZSbGJYQnNZWFJsTENCeVpXNWtaWEpPWVhaTVp5QjlPeUlzSW1OdmJuTjBJSFJsYlhCc1lYUmxJRDBnWEc1Y2RHQThaR2wySUdOc1lYTnpQVndpYm1GMlgxOXBibTVsY2x3aVBseHVYSFJjZER4a2FYWWdZMnhoYzNNOVhDSnVZWFpmWDNOdmNuUXRZbmxjSWo1Y2JseDBYSFJjZER4emNHRnVJR05zWVhOelBWd2ljMjl5ZEMxaWVWOWZkR2wwYkdWY0lqNVRiM0owSUdKNVBDOXpjR0Z1UGx4dVhIUmNkRngwUEdKMWRIUnZiaUJqYkdGemN6MWNJbk52Y25RdFlua2djMjl5ZEMxaWVWOWZZbmt0WVhKMGFYTjBJR0ZqZEdsMlpWd2lJR2xrUFZ3aWFuTXRZbmt0WVhKMGFYTjBYQ0krUVhKMGFYTjBQQzlpZFhSMGIyNCtYRzVjZEZ4MFhIUThjM0JoYmlCamJHRnpjejFjSW5OdmNuUXRZbmxmWDJScGRtbGtaWEpjSWo0Z2ZDQThMM053WVc0K1hHNWNkRngwWEhROFluVjBkRzl1SUdOc1lYTnpQVndpYzI5eWRDMWllU0J6YjNKMExXSjVYMTlpZVMxMGFYUnNaVndpSUdsa1BWd2lhbk10WW5rdGRHbDBiR1ZjSWo1VWFYUnNaVHd2WW5WMGRHOXVQbHh1WEhSY2RGeDBQSE53WVc0Z1kyeGhjM005WENKbWFXNWtYQ0lnYVdROVhDSnFjeTFtYVc1a1hDSStYRzVjZEZ4MFhIUmNkQ2c4YzNCaGJpQmpiR0Z6Y3oxY0ltWnBibVF0TFdsdWJtVnlYQ0krSmlNNE9UZzBPMFk4TDNOd1lXNCtLVnh1WEhSY2RGeDBQQzl6Y0dGdVBseHVYSFJjZER3dlpHbDJQbHh1WEhSY2REeGthWFlnWTJ4aGMzTTlYQ0p1WVhaZlgyRnNjR2hoWW1WMFhDSStYRzVjZEZ4MFhIUThjM0JoYmlCamJHRnpjejFjSW1Gc2NHaGhZbVYwWDE5MGFYUnNaVndpUGtkdklIUnZQQzl6Y0dGdVBseHVYSFJjZEZ4MFBHUnBkaUJqYkdGemN6MWNJbUZzY0doaFltVjBYMTlzWlhSMFpYSnpYQ0krUEM5a2FYWStYRzVjZEZ4MFBDOWthWFkrWEc1Y2REd3ZaR2wyUG1BN1hHNWNibU52Ym5OMElISmxibVJsY2s1aGRreG5JRDBnS0NrZ1BUNGdlMXh1WEhSc1pYUWdibUYyVDNWMFpYSWdQU0JrYjJOMWJXVnVkQzVuWlhSRmJHVnRaVzUwUW5sSlpDZ25hbk10Ym1GMkp5azdYRzVjZEc1aGRrOTFkR1Z5TG1sdWJtVnlTRlJOVENBOUlIUmxiWEJzWVhSbE8xeHVmVHRjYmx4dVpYaHdiM0owSUdSbFptRjFiSFFnY21WdVpHVnlUbUYyVEdjN0lpd2lhVzF3YjNKMElIc2dKR3h2WVdScGJtY3NJQ1J1WVhZc0lDUndZWEpoYkd4aGVDd2dKR052Ym5SbGJuUXNJQ1IwYVhSc1pTd2dKR0Z5Y205M0xDQWtiVzlrWVd3c0lDUnNhV2RvZEdKdmVDd2dKSFpwWlhjZ2ZTQm1jbTl0SUNjdUxpOWpiMjV6ZEdGdWRITW5PMXh1WEc1amIyNXpkQ0JrWldKdmRXNWpaU0E5SUNobWJpd2dkR2x0WlNrZ1BUNGdlMXh1SUNCc1pYUWdkR2x0Wlc5MWREdGNibHh1SUNCeVpYUjFjbTRnWm5WdVkzUnBiMjRvS1NCN1hHNGdJQ0FnWTI5dWMzUWdablZ1WTNScGIyNURZV3hzSUQwZ0tDa2dQVDRnWm00dVlYQndiSGtvZEdocGN5d2dZWEpuZFcxbGJuUnpLVHRjYmlBZ0lDQmNiaUFnSUNCamJHVmhjbFJwYldWdmRYUW9kR2x0Wlc5MWRDazdYRzRnSUNBZ2RHbHRaVzkxZENBOUlITmxkRlJwYldWdmRYUW9ablZ1WTNScGIyNURZV3hzTENCMGFXMWxLVHRjYmlBZ2ZWeHVmVHRjYmx4dVkyOXVjM1FnYUdsa1pVeHZZV1JwYm1jZ1BTQW9LU0E5UGlCN1hHNWNkQ1JzYjJGa2FXNW5MbVp2Y2tWaFkyZ29aV3hsYlNBOVBpQmxiR1Z0TG1Oc1lYTnpUR2x6ZEM1aFpHUW9KM0psWVdSNUp5a3BPMXh1WEhRa2JtRjJMbU5zWVhOelRHbHpkQzVoWkdRb0ozSmxZV1I1SnlrN1hHNTlPMXh1WEc1amIyNXpkQ0J6WTNKdmJHeFViMVJ2Y0NBOUlDZ3BJRDArSUh0Y2JseDBiR1YwSUhSdmNDQTlJR1J2WTNWdFpXNTBMbWRsZEVWc1pXMWxiblJDZVVsa0tDZGhibU5vYjNJdGRHRnlaMlYwSnlrN1hHNWNkSFJ2Y0M1elkzSnZiR3hKYm5SdlZtbGxkeWg3WW1Wb1lYWnBiM0k2SUZ3aWMyMXZiM1JvWENJc0lHSnNiMk5yT2lCY0luTjBZWEowWENKOUtUdGNibjA3WEc1Y2JtTnZibk4wSUcxaGEyVlRiR2xrWlhJZ1BTQW9KSE5zYVdSbGNpa2dQVDRnZTF4dVhIUmpiMjV6ZENBa1lYSnliM2RPWlhoMElEMGdKSE5zYVdSbGNpNXdZWEpsYm5SRmJHVnRaVzUwTG5GMVpYSjVVMlZzWldOMGIzSW9KeTVoY25KdmR5MXVaWGgwSnlrN1hHNWNkR052Ym5OMElDUmhjbkp2ZDFCeVpYWWdQU0FrYzJ4cFpHVnlMbkJoY21WdWRFVnNaVzFsYm5RdWNYVmxjbmxUWld4bFkzUnZjaWduTG1GeWNtOTNMWEJ5WlhZbktUdGNibHh1WEhSc1pYUWdZM1Z5Y21WdWRDQTlJQ1J6Ykdsa1pYSXVabWx5YzNSRmJHVnRaVzUwUTJocGJHUTdYRzVjZENSaGNuSnZkMDVsZUhRdVlXUmtSWFpsYm5STWFYTjBaVzVsY2lnblkyeHBZMnNuTENBb0tTQTlQaUI3WEc1Y2RGeDBZMjl1YzNRZ2JtVjRkQ0E5SUdOMWNuSmxiblF1Ym1WNGRFVnNaVzFsYm5SVGFXSnNhVzVuTzF4dVhIUmNkR2xtSUNodVpYaDBLU0I3WEc1Y2RGeDBYSFJ1WlhoMExuTmpjbTlzYkVsdWRHOVdhV1YzS0h0aVpXaGhkbWx2Y2pvZ1hDSnpiVzl2ZEdoY0lpd2dZbXh2WTJzNklGd2libVZoY21WemRGd2lMQ0JwYm14cGJtVTZJRndpWTJWdWRHVnlYQ0o5S1R0Y2JseDBYSFJjZEdOMWNuSmxiblFnUFNCdVpYaDBPMXh1WEhSY2RIMWNibHgwZlNrN1hHNWNibHgwSkdGeWNtOTNVSEpsZGk1aFpHUkZkbVZ1ZEV4cGMzUmxibVZ5S0NkamJHbGpheWNzSUNncElEMCtJSHRjYmx4MFhIUmpiMjV6ZENCd2NtVjJJRDBnWTNWeWNtVnVkQzV3Y21WMmFXOTFjMFZzWlcxbGJuUlRhV0pzYVc1bk8xeHVYSFJjZEdsbUlDaHdjbVYyS1NCN1hHNWNkRngwWEhSd2NtVjJMbk5qY205c2JFbHVkRzlXYVdWM0tIdGlaV2hoZG1sdmNqb2dYQ0p6Ylc5dmRHaGNJaXdnWW14dlkyczZJRndpYm1WaGNtVnpkRndpTENCcGJteHBibVU2SUZ3aVkyVnVkR1Z5WENKOUtUdGNibHgwWEhSY2RHTjFjbkpsYm5RZ1BTQndjbVYyTzF4dVhIUmNkSDFjYmx4MGZTbGNibjA3WEc1Y2JtVjRjRzl5ZENCN0lHUmxZbTkxYm1ObExDQm9hV1JsVEc5aFpHbHVaeXdnYzJOeWIyeHNWRzlVYjNBc0lHMWhhMlZUYkdsa1pYSWdmVHNpWFgwPSJ9
