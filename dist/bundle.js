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

var _makeAlphabet = require('./makeAlphabet');

var _makeAlphabet2 = _interopRequireDefault(_makeAlphabet);

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

var renderEntries = function renderEntries() {
	var $articleList = document.getElementById('js-list');
	var entriesList = sortKey ? entries.byTitle : entries.byAuthor;

	$articleList.innerHTML = '';

	entriesList.forEach(function (entry, i) {
		$articleList.insertAdjacentHTML('beforeend', (0, _templates.articleTemplate)(entry, i));
		(0, _utils.makeSlider)(document.getElementById('slider-' + i));
	});

	attachImageListeners();
	(0, _makeAlphabet2.default)(sortKey);
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

},{"./constants":2,"./makeAlphabet":4,"./templates":6,"./utils":8,"smoothscroll-polyfill":1}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _constants = require('./constants');

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

exports.default = makeAlphabet;

},{"./constants":2}],5:[function(require,module,exports){
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

},{}],6:[function(require,module,exports){
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

},{"./article":5,"./navLg":7}],7:[function(require,module,exports){
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

},{}],8:[function(require,module,exports){
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvc21vb3Roc2Nyb2xsLXBvbHlmaWxsL2Rpc3Qvc21vb3Roc2Nyb2xsLmpzIiwic3JjL2pzL2NvbnN0YW50cy5qcyIsInNyYy9qcy9pbmRleC5qcyIsInNyYy9qcy9tYWtlQWxwaGFiZXQuanMiLCJzcmMvanMvdGVtcGxhdGVzL2FydGljbGUuanMiLCJzcmMvanMvdGVtcGxhdGVzL2luZGV4LmpzIiwic3JjL2pzL3RlbXBsYXRlcy9uYXZMZy5qcyIsInNyYy9qcy91dGlscy9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7QUN2YkEsSUFBTSxLQUFLLCtGQUFYO0FBQ0EsSUFBTSxXQUFXLENBQUMsR0FBRCxFQUFNLEdBQU4sRUFBVyxHQUFYLEVBQWdCLEdBQWhCLEVBQXFCLEdBQXJCLEVBQTBCLEdBQTFCLEVBQStCLEdBQS9CLEVBQW9DLEdBQXBDLEVBQXlDLEdBQXpDLEVBQThDLEdBQTlDLEVBQW1ELEdBQW5ELEVBQXdE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QXFCLE9BQU8sU0FBNUIsRUFBdUMsUUFBUSxRQUEvQyxFQUFwQjtBQUNBLGFBQVUsSUFBVjtBQUNBO0FBQ0QsRUFORDs7QUFRQSxZQUFXLGdCQUFYLENBQTRCLE9BQTVCLEVBQXFDLFlBQU07QUFDMUMsTUFBTSxPQUFPLFFBQVEsc0JBQXJCO0FBQ0EsTUFBSSxJQUFKLEVBQVU7QUFDVCxRQUFLLGNBQUwsQ0FBb0IsRUFBQyxVQUFVLFFBQVgsRUFBcUIsT0FBTyxTQUE1QixFQUF1QyxRQUFRLFFBQS9DLEVBQXBCO0FBQ0EsYUFBVSxJQUFWO0FBQ0E7QUFDRCxFQU5EO0FBT0EsQ0FwQkQ7O1FBc0JTLFEsR0FBQSxRO1FBQVUsVyxHQUFBLFc7UUFBYSxXLEdBQUEsVztRQUFhLFUsR0FBQSxVIiwiZmlsZSI6ImJ1bmRsZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCIvKiBzbW9vdGhzY3JvbGwgdjAuNC4wIC0gMjAxOCAtIER1c3RhbiBLYXN0ZW4sIEplcmVtaWFzIE1lbmljaGVsbGkgLSBNSVQgTGljZW5zZSAqL1xuKGZ1bmN0aW9uICgpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIC8vIHBvbHlmaWxsXG4gIGZ1bmN0aW9uIHBvbHlmaWxsKCkge1xuICAgIC8vIGFsaWFzZXNcbiAgICB2YXIgdyA9IHdpbmRvdztcbiAgICB2YXIgZCA9IGRvY3VtZW50O1xuXG4gICAgLy8gcmV0dXJuIGlmIHNjcm9sbCBiZWhhdmlvciBpcyBzdXBwb3J0ZWQgYW5kIHBvbHlmaWxsIGlzIG5vdCBmb3JjZWRcbiAgICBpZiAoXG4gICAgICAnc2Nyb2xsQmVoYXZpb3InIGluIGQuZG9jdW1lbnRFbGVtZW50LnN0eWxlICYmXG4gICAgICB3Ll9fZm9yY2VTbW9vdGhTY3JvbGxQb2x5ZmlsbF9fICE9PSB0cnVlXG4gICAgKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gZ2xvYmFsc1xuICAgIHZhciBFbGVtZW50ID0gdy5IVE1MRWxlbWVudCB8fCB3LkVsZW1lbnQ7XG4gICAgdmFyIFNDUk9MTF9USU1FID0gNDY4O1xuXG4gICAgLy8gb2JqZWN0IGdhdGhlcmluZyBvcmlnaW5hbCBzY3JvbGwgbWV0aG9kc1xuICAgIHZhciBvcmlnaW5hbCA9IHtcbiAgICAgIHNjcm9sbDogdy5zY3JvbGwgfHwgdy5zY3JvbGxUbyxcbiAgICAgIHNjcm9sbEJ5OiB3LnNjcm9sbEJ5LFxuICAgICAgZWxlbWVudFNjcm9sbDogRWxlbWVudC5wcm90b3R5cGUuc2Nyb2xsIHx8IHNjcm9sbEVsZW1lbnQsXG4gICAgICBzY3JvbGxJbnRvVmlldzogRWxlbWVudC5wcm90b3R5cGUuc2Nyb2xsSW50b1ZpZXdcbiAgICB9O1xuXG4gICAgLy8gZGVmaW5lIHRpbWluZyBtZXRob2RcbiAgICB2YXIgbm93ID1cbiAgICAgIHcucGVyZm9ybWFuY2UgJiYgdy5wZXJmb3JtYW5jZS5ub3dcbiAgICAgICAgPyB3LnBlcmZvcm1hbmNlLm5vdy5iaW5kKHcucGVyZm9ybWFuY2UpXG4gICAgICAgIDogRGF0ZS5ub3c7XG5cbiAgICAvKipcbiAgICAgKiBpbmRpY2F0ZXMgaWYgYSB0aGUgY3VycmVudCBicm93c2VyIGlzIG1hZGUgYnkgTWljcm9zb2Z0XG4gICAgICogQG1ldGhvZCBpc01pY3Jvc29mdEJyb3dzZXJcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gdXNlckFnZW50XG4gICAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAgICovXG4gICAgZnVuY3Rpb24gaXNNaWNyb3NvZnRCcm93c2VyKHVzZXJBZ2VudCkge1xuICAgICAgdmFyIHVzZXJBZ2VudFBhdHRlcm5zID0gWydNU0lFICcsICdUcmlkZW50LycsICdFZGdlLyddO1xuXG4gICAgICByZXR1cm4gbmV3IFJlZ0V4cCh1c2VyQWdlbnRQYXR0ZXJucy5qb2luKCd8JykpLnRlc3QodXNlckFnZW50KTtcbiAgICB9XG5cbiAgICAvKlxuICAgICAqIElFIGhhcyByb3VuZGluZyBidWcgcm91bmRpbmcgZG93biBjbGllbnRIZWlnaHQgYW5kIGNsaWVudFdpZHRoIGFuZFxuICAgICAqIHJvdW5kaW5nIHVwIHNjcm9sbEhlaWdodCBhbmQgc2Nyb2xsV2lkdGggY2F1c2luZyBmYWxzZSBwb3NpdGl2ZXNcbiAgICAgKiBvbiBoYXNTY3JvbGxhYmxlU3BhY2VcbiAgICAgKi9cbiAgICB2YXIgUk9VTkRJTkdfVE9MRVJBTkNFID0gaXNNaWNyb3NvZnRCcm93c2VyKHcubmF2aWdhdG9yLnVzZXJBZ2VudCkgPyAxIDogMDtcblxuICAgIC8qKlxuICAgICAqIGNoYW5nZXMgc2Nyb2xsIHBvc2l0aW9uIGluc2lkZSBhbiBlbGVtZW50XG4gICAgICogQG1ldGhvZCBzY3JvbGxFbGVtZW50XG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHhcbiAgICAgKiBAcGFyYW0ge051bWJlcn0geVxuICAgICAqIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gICAgICovXG4gICAgZnVuY3Rpb24gc2Nyb2xsRWxlbWVudCh4LCB5KSB7XG4gICAgICB0aGlzLnNjcm9sbExlZnQgPSB4O1xuICAgICAgdGhpcy5zY3JvbGxUb3AgPSB5O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIHJldHVybnMgcmVzdWx0IG9mIGFwcGx5aW5nIGVhc2UgbWF0aCBmdW5jdGlvbiB0byBhIG51bWJlclxuICAgICAqIEBtZXRob2QgZWFzZVxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBrXG4gICAgICogQHJldHVybnMge051bWJlcn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBlYXNlKGspIHtcbiAgICAgIHJldHVybiAwLjUgKiAoMSAtIE1hdGguY29zKE1hdGguUEkgKiBrKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogaW5kaWNhdGVzIGlmIGEgc21vb3RoIGJlaGF2aW9yIHNob3VsZCBiZSBhcHBsaWVkXG4gICAgICogQG1ldGhvZCBzaG91bGRCYWlsT3V0XG4gICAgICogQHBhcmFtIHtOdW1iZXJ8T2JqZWN0fSBmaXJzdEFyZ1xuICAgICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHNob3VsZEJhaWxPdXQoZmlyc3RBcmcpIHtcbiAgICAgIGlmIChcbiAgICAgICAgZmlyc3RBcmcgPT09IG51bGwgfHxcbiAgICAgICAgdHlwZW9mIGZpcnN0QXJnICE9PSAnb2JqZWN0JyB8fFxuICAgICAgICBmaXJzdEFyZy5iZWhhdmlvciA9PT0gdW5kZWZpbmVkIHx8XG4gICAgICAgIGZpcnN0QXJnLmJlaGF2aW9yID09PSAnYXV0bycgfHxcbiAgICAgICAgZmlyc3RBcmcuYmVoYXZpb3IgPT09ICdpbnN0YW50J1xuICAgICAgKSB7XG4gICAgICAgIC8vIGZpcnN0IGFyZ3VtZW50IGlzIG5vdCBhbiBvYmplY3QvbnVsbFxuICAgICAgICAvLyBvciBiZWhhdmlvciBpcyBhdXRvLCBpbnN0YW50IG9yIHVuZGVmaW5lZFxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiBmaXJzdEFyZyA9PT0gJ29iamVjdCcgJiYgZmlyc3RBcmcuYmVoYXZpb3IgPT09ICdzbW9vdGgnKSB7XG4gICAgICAgIC8vIGZpcnN0IGFyZ3VtZW50IGlzIGFuIG9iamVjdCBhbmQgYmVoYXZpb3IgaXMgc21vb3RoXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgLy8gdGhyb3cgZXJyb3Igd2hlbiBiZWhhdmlvciBpcyBub3Qgc3VwcG9ydGVkXG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgICAnYmVoYXZpb3IgbWVtYmVyIG9mIFNjcm9sbE9wdGlvbnMgJyArXG4gICAgICAgICAgZmlyc3RBcmcuYmVoYXZpb3IgK1xuICAgICAgICAgICcgaXMgbm90IGEgdmFsaWQgdmFsdWUgZm9yIGVudW1lcmF0aW9uIFNjcm9sbEJlaGF2aW9yLidcbiAgICAgICk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogaW5kaWNhdGVzIGlmIGFuIGVsZW1lbnQgaGFzIHNjcm9sbGFibGUgc3BhY2UgaW4gdGhlIHByb3ZpZGVkIGF4aXNcbiAgICAgKiBAbWV0aG9kIGhhc1Njcm9sbGFibGVTcGFjZVxuICAgICAqIEBwYXJhbSB7Tm9kZX0gZWxcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gYXhpc1xuICAgICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGhhc1Njcm9sbGFibGVTcGFjZShlbCwgYXhpcykge1xuICAgICAgaWYgKGF4aXMgPT09ICdZJykge1xuICAgICAgICByZXR1cm4gZWwuY2xpZW50SGVpZ2h0ICsgUk9VTkRJTkdfVE9MRVJBTkNFIDwgZWwuc2Nyb2xsSGVpZ2h0O1xuICAgICAgfVxuXG4gICAgICBpZiAoYXhpcyA9PT0gJ1gnKSB7XG4gICAgICAgIHJldHVybiBlbC5jbGllbnRXaWR0aCArIFJPVU5ESU5HX1RPTEVSQU5DRSA8IGVsLnNjcm9sbFdpZHRoO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGluZGljYXRlcyBpZiBhbiBlbGVtZW50IGhhcyBhIHNjcm9sbGFibGUgb3ZlcmZsb3cgcHJvcGVydHkgaW4gdGhlIGF4aXNcbiAgICAgKiBAbWV0aG9kIGNhbk92ZXJmbG93XG4gICAgICogQHBhcmFtIHtOb2RlfSBlbFxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBheGlzXG4gICAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAgICovXG4gICAgZnVuY3Rpb24gY2FuT3ZlcmZsb3coZWwsIGF4aXMpIHtcbiAgICAgIHZhciBvdmVyZmxvd1ZhbHVlID0gdy5nZXRDb21wdXRlZFN0eWxlKGVsLCBudWxsKVsnb3ZlcmZsb3cnICsgYXhpc107XG5cbiAgICAgIHJldHVybiBvdmVyZmxvd1ZhbHVlID09PSAnYXV0bycgfHwgb3ZlcmZsb3dWYWx1ZSA9PT0gJ3Njcm9sbCc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogaW5kaWNhdGVzIGlmIGFuIGVsZW1lbnQgY2FuIGJlIHNjcm9sbGVkIGluIGVpdGhlciBheGlzXG4gICAgICogQG1ldGhvZCBpc1Njcm9sbGFibGVcbiAgICAgKiBAcGFyYW0ge05vZGV9IGVsXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGF4aXNcbiAgICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBpc1Njcm9sbGFibGUoZWwpIHtcbiAgICAgIHZhciBpc1Njcm9sbGFibGVZID0gaGFzU2Nyb2xsYWJsZVNwYWNlKGVsLCAnWScpICYmIGNhbk92ZXJmbG93KGVsLCAnWScpO1xuICAgICAgdmFyIGlzU2Nyb2xsYWJsZVggPSBoYXNTY3JvbGxhYmxlU3BhY2UoZWwsICdYJykgJiYgY2FuT3ZlcmZsb3coZWwsICdYJyk7XG5cbiAgICAgIHJldHVybiBpc1Njcm9sbGFibGVZIHx8IGlzU2Nyb2xsYWJsZVg7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogZmluZHMgc2Nyb2xsYWJsZSBwYXJlbnQgb2YgYW4gZWxlbWVudFxuICAgICAqIEBtZXRob2QgZmluZFNjcm9sbGFibGVQYXJlbnRcbiAgICAgKiBAcGFyYW0ge05vZGV9IGVsXG4gICAgICogQHJldHVybnMge05vZGV9IGVsXG4gICAgICovXG4gICAgZnVuY3Rpb24gZmluZFNjcm9sbGFibGVQYXJlbnQoZWwpIHtcbiAgICAgIHZhciBpc0JvZHk7XG5cbiAgICAgIGRvIHtcbiAgICAgICAgZWwgPSBlbC5wYXJlbnROb2RlO1xuXG4gICAgICAgIGlzQm9keSA9IGVsID09PSBkLmJvZHk7XG4gICAgICB9IHdoaWxlIChpc0JvZHkgPT09IGZhbHNlICYmIGlzU2Nyb2xsYWJsZShlbCkgPT09IGZhbHNlKTtcblxuICAgICAgaXNCb2R5ID0gbnVsbDtcblxuICAgICAgcmV0dXJuIGVsO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIHNlbGYgaW52b2tlZCBmdW5jdGlvbiB0aGF0LCBnaXZlbiBhIGNvbnRleHQsIHN0ZXBzIHRocm91Z2ggc2Nyb2xsaW5nXG4gICAgICogQG1ldGhvZCBzdGVwXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGNvbnRleHRcbiAgICAgKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHN0ZXAoY29udGV4dCkge1xuICAgICAgdmFyIHRpbWUgPSBub3coKTtcbiAgICAgIHZhciB2YWx1ZTtcbiAgICAgIHZhciBjdXJyZW50WDtcbiAgICAgIHZhciBjdXJyZW50WTtcbiAgICAgIHZhciBlbGFwc2VkID0gKHRpbWUgLSBjb250ZXh0LnN0YXJ0VGltZSkgLyBTQ1JPTExfVElNRTtcblxuICAgICAgLy8gYXZvaWQgZWxhcHNlZCB0aW1lcyBoaWdoZXIgdGhhbiBvbmVcbiAgICAgIGVsYXBzZWQgPSBlbGFwc2VkID4gMSA/IDEgOiBlbGFwc2VkO1xuXG4gICAgICAvLyBhcHBseSBlYXNpbmcgdG8gZWxhcHNlZCB0aW1lXG4gICAgICB2YWx1ZSA9IGVhc2UoZWxhcHNlZCk7XG5cbiAgICAgIGN1cnJlbnRYID0gY29udGV4dC5zdGFydFggKyAoY29udGV4dC54IC0gY29udGV4dC5zdGFydFgpICogdmFsdWU7XG4gICAgICBjdXJyZW50WSA9IGNvbnRleHQuc3RhcnRZICsgKGNvbnRleHQueSAtIGNvbnRleHQuc3RhcnRZKSAqIHZhbHVlO1xuXG4gICAgICBjb250ZXh0Lm1ldGhvZC5jYWxsKGNvbnRleHQuc2Nyb2xsYWJsZSwgY3VycmVudFgsIGN1cnJlbnRZKTtcblxuICAgICAgLy8gc2Nyb2xsIG1vcmUgaWYgd2UgaGF2ZSBub3QgcmVhY2hlZCBvdXIgZGVzdGluYXRpb25cbiAgICAgIGlmIChjdXJyZW50WCAhPT0gY29udGV4dC54IHx8IGN1cnJlbnRZICE9PSBjb250ZXh0LnkpIHtcbiAgICAgICAgdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoc3RlcC5iaW5kKHcsIGNvbnRleHQpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBzY3JvbGxzIHdpbmRvdyBvciBlbGVtZW50IHdpdGggYSBzbW9vdGggYmVoYXZpb3JcbiAgICAgKiBAbWV0aG9kIHNtb290aFNjcm9sbFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fE5vZGV9IGVsXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHhcbiAgICAgKiBAcGFyYW0ge051bWJlcn0geVxuICAgICAqIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gICAgICovXG4gICAgZnVuY3Rpb24gc21vb3RoU2Nyb2xsKGVsLCB4LCB5KSB7XG4gICAgICB2YXIgc2Nyb2xsYWJsZTtcbiAgICAgIHZhciBzdGFydFg7XG4gICAgICB2YXIgc3RhcnRZO1xuICAgICAgdmFyIG1ldGhvZDtcbiAgICAgIHZhciBzdGFydFRpbWUgPSBub3coKTtcblxuICAgICAgLy8gZGVmaW5lIHNjcm9sbCBjb250ZXh0XG4gICAgICBpZiAoZWwgPT09IGQuYm9keSkge1xuICAgICAgICBzY3JvbGxhYmxlID0gdztcbiAgICAgICAgc3RhcnRYID0gdy5zY3JvbGxYIHx8IHcucGFnZVhPZmZzZXQ7XG4gICAgICAgIHN0YXJ0WSA9IHcuc2Nyb2xsWSB8fCB3LnBhZ2VZT2Zmc2V0O1xuICAgICAgICBtZXRob2QgPSBvcmlnaW5hbC5zY3JvbGw7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzY3JvbGxhYmxlID0gZWw7XG4gICAgICAgIHN0YXJ0WCA9IGVsLnNjcm9sbExlZnQ7XG4gICAgICAgIHN0YXJ0WSA9IGVsLnNjcm9sbFRvcDtcbiAgICAgICAgbWV0aG9kID0gc2Nyb2xsRWxlbWVudDtcbiAgICAgIH1cblxuICAgICAgLy8gc2Nyb2xsIGxvb3Bpbmcgb3ZlciBhIGZyYW1lXG4gICAgICBzdGVwKHtcbiAgICAgICAgc2Nyb2xsYWJsZTogc2Nyb2xsYWJsZSxcbiAgICAgICAgbWV0aG9kOiBtZXRob2QsXG4gICAgICAgIHN0YXJ0VGltZTogc3RhcnRUaW1lLFxuICAgICAgICBzdGFydFg6IHN0YXJ0WCxcbiAgICAgICAgc3RhcnRZOiBzdGFydFksXG4gICAgICAgIHg6IHgsXG4gICAgICAgIHk6IHlcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIE9SSUdJTkFMIE1FVEhPRFMgT1ZFUlJJREVTXG4gICAgLy8gdy5zY3JvbGwgYW5kIHcuc2Nyb2xsVG9cbiAgICB3LnNjcm9sbCA9IHcuc2Nyb2xsVG8gPSBmdW5jdGlvbigpIHtcbiAgICAgIC8vIGF2b2lkIGFjdGlvbiB3aGVuIG5vIGFyZ3VtZW50cyBhcmUgcGFzc2VkXG4gICAgICBpZiAoYXJndW1lbnRzWzBdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBhdm9pZCBzbW9vdGggYmVoYXZpb3IgaWYgbm90IHJlcXVpcmVkXG4gICAgICBpZiAoc2hvdWxkQmFpbE91dChhcmd1bWVudHNbMF0pID09PSB0cnVlKSB7XG4gICAgICAgIG9yaWdpbmFsLnNjcm9sbC5jYWxsKFxuICAgICAgICAgIHcsXG4gICAgICAgICAgYXJndW1lbnRzWzBdLmxlZnQgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyBhcmd1bWVudHNbMF0ubGVmdFxuICAgICAgICAgICAgOiB0eXBlb2YgYXJndW1lbnRzWzBdICE9PSAnb2JqZWN0J1xuICAgICAgICAgICAgICA/IGFyZ3VtZW50c1swXVxuICAgICAgICAgICAgICA6IHcuc2Nyb2xsWCB8fCB3LnBhZ2VYT2Zmc2V0LFxuICAgICAgICAgIC8vIHVzZSB0b3AgcHJvcCwgc2Vjb25kIGFyZ3VtZW50IGlmIHByZXNlbnQgb3IgZmFsbGJhY2sgdG8gc2Nyb2xsWVxuICAgICAgICAgIGFyZ3VtZW50c1swXS50b3AgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyBhcmd1bWVudHNbMF0udG9wXG4gICAgICAgICAgICA6IGFyZ3VtZW50c1sxXSAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICAgID8gYXJndW1lbnRzWzFdXG4gICAgICAgICAgICAgIDogdy5zY3JvbGxZIHx8IHcucGFnZVlPZmZzZXRcbiAgICAgICAgKTtcblxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIExFVCBUSEUgU01PT1RITkVTUyBCRUdJTiFcbiAgICAgIHNtb290aFNjcm9sbC5jYWxsKFxuICAgICAgICB3LFxuICAgICAgICBkLmJvZHksXG4gICAgICAgIGFyZ3VtZW50c1swXS5sZWZ0ICE9PSB1bmRlZmluZWRcbiAgICAgICAgICA/IH5+YXJndW1lbnRzWzBdLmxlZnRcbiAgICAgICAgICA6IHcuc2Nyb2xsWCB8fCB3LnBhZ2VYT2Zmc2V0LFxuICAgICAgICBhcmd1bWVudHNbMF0udG9wICE9PSB1bmRlZmluZWRcbiAgICAgICAgICA/IH5+YXJndW1lbnRzWzBdLnRvcFxuICAgICAgICAgIDogdy5zY3JvbGxZIHx8IHcucGFnZVlPZmZzZXRcbiAgICAgICk7XG4gICAgfTtcblxuICAgIC8vIHcuc2Nyb2xsQnlcbiAgICB3LnNjcm9sbEJ5ID0gZnVuY3Rpb24oKSB7XG4gICAgICAvLyBhdm9pZCBhY3Rpb24gd2hlbiBubyBhcmd1bWVudHMgYXJlIHBhc3NlZFxuICAgICAgaWYgKGFyZ3VtZW50c1swXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gYXZvaWQgc21vb3RoIGJlaGF2aW9yIGlmIG5vdCByZXF1aXJlZFxuICAgICAgaWYgKHNob3VsZEJhaWxPdXQoYXJndW1lbnRzWzBdKSkge1xuICAgICAgICBvcmlnaW5hbC5zY3JvbGxCeS5jYWxsKFxuICAgICAgICAgIHcsXG4gICAgICAgICAgYXJndW1lbnRzWzBdLmxlZnQgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyBhcmd1bWVudHNbMF0ubGVmdFxuICAgICAgICAgICAgOiB0eXBlb2YgYXJndW1lbnRzWzBdICE9PSAnb2JqZWN0JyA/IGFyZ3VtZW50c1swXSA6IDAsXG4gICAgICAgICAgYXJndW1lbnRzWzBdLnRvcCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICA/IGFyZ3VtZW50c1swXS50b3BcbiAgICAgICAgICAgIDogYXJndW1lbnRzWzFdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMV0gOiAwXG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBMRVQgVEhFIFNNT09USE5FU1MgQkVHSU4hXG4gICAgICBzbW9vdGhTY3JvbGwuY2FsbChcbiAgICAgICAgdyxcbiAgICAgICAgZC5ib2R5LFxuICAgICAgICB+fmFyZ3VtZW50c1swXS5sZWZ0ICsgKHcuc2Nyb2xsWCB8fCB3LnBhZ2VYT2Zmc2V0KSxcbiAgICAgICAgfn5hcmd1bWVudHNbMF0udG9wICsgKHcuc2Nyb2xsWSB8fCB3LnBhZ2VZT2Zmc2V0KVxuICAgICAgKTtcbiAgICB9O1xuXG4gICAgLy8gRWxlbWVudC5wcm90b3R5cGUuc2Nyb2xsIGFuZCBFbGVtZW50LnByb3RvdHlwZS5zY3JvbGxUb1xuICAgIEVsZW1lbnQucHJvdG90eXBlLnNjcm9sbCA9IEVsZW1lbnQucHJvdG90eXBlLnNjcm9sbFRvID0gZnVuY3Rpb24oKSB7XG4gICAgICAvLyBhdm9pZCBhY3Rpb24gd2hlbiBubyBhcmd1bWVudHMgYXJlIHBhc3NlZFxuICAgICAgaWYgKGFyZ3VtZW50c1swXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gYXZvaWQgc21vb3RoIGJlaGF2aW9yIGlmIG5vdCByZXF1aXJlZFxuICAgICAgaWYgKHNob3VsZEJhaWxPdXQoYXJndW1lbnRzWzBdKSA9PT0gdHJ1ZSkge1xuICAgICAgICAvLyBpZiBvbmUgbnVtYmVyIGlzIHBhc3NlZCwgdGhyb3cgZXJyb3IgdG8gbWF0Y2ggRmlyZWZveCBpbXBsZW1lbnRhdGlvblxuICAgICAgICBpZiAodHlwZW9mIGFyZ3VtZW50c1swXSA9PT0gJ251bWJlcicgJiYgYXJndW1lbnRzWzFdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgU3ludGF4RXJyb3IoJ1ZhbHVlIGNvdWxkIG5vdCBiZSBjb252ZXJ0ZWQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIG9yaWdpbmFsLmVsZW1lbnRTY3JvbGwuY2FsbChcbiAgICAgICAgICB0aGlzLFxuICAgICAgICAgIC8vIHVzZSBsZWZ0IHByb3AsIGZpcnN0IG51bWJlciBhcmd1bWVudCBvciBmYWxsYmFjayB0byBzY3JvbGxMZWZ0XG4gICAgICAgICAgYXJndW1lbnRzWzBdLmxlZnQgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyB+fmFyZ3VtZW50c1swXS5sZWZ0XG4gICAgICAgICAgICA6IHR5cGVvZiBhcmd1bWVudHNbMF0gIT09ICdvYmplY3QnID8gfn5hcmd1bWVudHNbMF0gOiB0aGlzLnNjcm9sbExlZnQsXG4gICAgICAgICAgLy8gdXNlIHRvcCBwcm9wLCBzZWNvbmQgYXJndW1lbnQgb3IgZmFsbGJhY2sgdG8gc2Nyb2xsVG9wXG4gICAgICAgICAgYXJndW1lbnRzWzBdLnRvcCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICA/IH5+YXJndW1lbnRzWzBdLnRvcFxuICAgICAgICAgICAgOiBhcmd1bWVudHNbMV0gIT09IHVuZGVmaW5lZCA/IH5+YXJndW1lbnRzWzFdIDogdGhpcy5zY3JvbGxUb3BcbiAgICAgICAgKTtcblxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHZhciBsZWZ0ID0gYXJndW1lbnRzWzBdLmxlZnQ7XG4gICAgICB2YXIgdG9wID0gYXJndW1lbnRzWzBdLnRvcDtcblxuICAgICAgLy8gTEVUIFRIRSBTTU9PVEhORVNTIEJFR0lOIVxuICAgICAgc21vb3RoU2Nyb2xsLmNhbGwoXG4gICAgICAgIHRoaXMsXG4gICAgICAgIHRoaXMsXG4gICAgICAgIHR5cGVvZiBsZWZ0ID09PSAndW5kZWZpbmVkJyA/IHRoaXMuc2Nyb2xsTGVmdCA6IH5+bGVmdCxcbiAgICAgICAgdHlwZW9mIHRvcCA9PT0gJ3VuZGVmaW5lZCcgPyB0aGlzLnNjcm9sbFRvcCA6IH5+dG9wXG4gICAgICApO1xuICAgIH07XG5cbiAgICAvLyBFbGVtZW50LnByb3RvdHlwZS5zY3JvbGxCeVxuICAgIEVsZW1lbnQucHJvdG90eXBlLnNjcm9sbEJ5ID0gZnVuY3Rpb24oKSB7XG4gICAgICAvLyBhdm9pZCBhY3Rpb24gd2hlbiBubyBhcmd1bWVudHMgYXJlIHBhc3NlZFxuICAgICAgaWYgKGFyZ3VtZW50c1swXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gYXZvaWQgc21vb3RoIGJlaGF2aW9yIGlmIG5vdCByZXF1aXJlZFxuICAgICAgaWYgKHNob3VsZEJhaWxPdXQoYXJndW1lbnRzWzBdKSA9PT0gdHJ1ZSkge1xuICAgICAgICBvcmlnaW5hbC5lbGVtZW50U2Nyb2xsLmNhbGwoXG4gICAgICAgICAgdGhpcyxcbiAgICAgICAgICBhcmd1bWVudHNbMF0ubGVmdCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICA/IH5+YXJndW1lbnRzWzBdLmxlZnQgKyB0aGlzLnNjcm9sbExlZnRcbiAgICAgICAgICAgIDogfn5hcmd1bWVudHNbMF0gKyB0aGlzLnNjcm9sbExlZnQsXG4gICAgICAgICAgYXJndW1lbnRzWzBdLnRvcCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICA/IH5+YXJndW1lbnRzWzBdLnRvcCArIHRoaXMuc2Nyb2xsVG9wXG4gICAgICAgICAgICA6IH5+YXJndW1lbnRzWzFdICsgdGhpcy5zY3JvbGxUb3BcbiAgICAgICAgKTtcblxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHRoaXMuc2Nyb2xsKHtcbiAgICAgICAgbGVmdDogfn5hcmd1bWVudHNbMF0ubGVmdCArIHRoaXMuc2Nyb2xsTGVmdCxcbiAgICAgICAgdG9wOiB+fmFyZ3VtZW50c1swXS50b3AgKyB0aGlzLnNjcm9sbFRvcCxcbiAgICAgICAgYmVoYXZpb3I6IGFyZ3VtZW50c1swXS5iZWhhdmlvclxuICAgICAgfSk7XG4gICAgfTtcblxuICAgIC8vIEVsZW1lbnQucHJvdG90eXBlLnNjcm9sbEludG9WaWV3XG4gICAgRWxlbWVudC5wcm90b3R5cGUuc2Nyb2xsSW50b1ZpZXcgPSBmdW5jdGlvbigpIHtcbiAgICAgIC8vIGF2b2lkIHNtb290aCBiZWhhdmlvciBpZiBub3QgcmVxdWlyZWRcbiAgICAgIGlmIChzaG91bGRCYWlsT3V0KGFyZ3VtZW50c1swXSkgPT09IHRydWUpIHtcbiAgICAgICAgb3JpZ2luYWwuc2Nyb2xsSW50b1ZpZXcuY2FsbChcbiAgICAgICAgICB0aGlzLFxuICAgICAgICAgIGFyZ3VtZW50c1swXSA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IGFyZ3VtZW50c1swXVxuICAgICAgICApO1xuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gTEVUIFRIRSBTTU9PVEhORVNTIEJFR0lOIVxuICAgICAgdmFyIHNjcm9sbGFibGVQYXJlbnQgPSBmaW5kU2Nyb2xsYWJsZVBhcmVudCh0aGlzKTtcbiAgICAgIHZhciBwYXJlbnRSZWN0cyA9IHNjcm9sbGFibGVQYXJlbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICB2YXIgY2xpZW50UmVjdHMgPSB0aGlzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuXG4gICAgICBpZiAoc2Nyb2xsYWJsZVBhcmVudCAhPT0gZC5ib2R5KSB7XG4gICAgICAgIC8vIHJldmVhbCBlbGVtZW50IGluc2lkZSBwYXJlbnRcbiAgICAgICAgc21vb3RoU2Nyb2xsLmNhbGwoXG4gICAgICAgICAgdGhpcyxcbiAgICAgICAgICBzY3JvbGxhYmxlUGFyZW50LFxuICAgICAgICAgIHNjcm9sbGFibGVQYXJlbnQuc2Nyb2xsTGVmdCArIGNsaWVudFJlY3RzLmxlZnQgLSBwYXJlbnRSZWN0cy5sZWZ0LFxuICAgICAgICAgIHNjcm9sbGFibGVQYXJlbnQuc2Nyb2xsVG9wICsgY2xpZW50UmVjdHMudG9wIC0gcGFyZW50UmVjdHMudG9wXG4gICAgICAgICk7XG5cbiAgICAgICAgLy8gcmV2ZWFsIHBhcmVudCBpbiB2aWV3cG9ydCB1bmxlc3MgaXMgZml4ZWRcbiAgICAgICAgaWYgKHcuZ2V0Q29tcHV0ZWRTdHlsZShzY3JvbGxhYmxlUGFyZW50KS5wb3NpdGlvbiAhPT0gJ2ZpeGVkJykge1xuICAgICAgICAgIHcuc2Nyb2xsQnkoe1xuICAgICAgICAgICAgbGVmdDogcGFyZW50UmVjdHMubGVmdCxcbiAgICAgICAgICAgIHRvcDogcGFyZW50UmVjdHMudG9wLFxuICAgICAgICAgICAgYmVoYXZpb3I6ICdzbW9vdGgnXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHJldmVhbCBlbGVtZW50IGluIHZpZXdwb3J0XG4gICAgICAgIHcuc2Nyb2xsQnkoe1xuICAgICAgICAgIGxlZnQ6IGNsaWVudFJlY3RzLmxlZnQsXG4gICAgICAgICAgdG9wOiBjbGllbnRSZWN0cy50b3AsXG4gICAgICAgICAgYmVoYXZpb3I6ICdzbW9vdGgnXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG4gIH1cblxuICBpZiAodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgLy8gY29tbW9uanNcbiAgICBtb2R1bGUuZXhwb3J0cyA9IHsgcG9seWZpbGw6IHBvbHlmaWxsIH07XG4gIH0gZWxzZSB7XG4gICAgLy8gZ2xvYmFsXG4gICAgcG9seWZpbGwoKTtcbiAgfVxuXG59KCkpO1xuIiwiY29uc3QgREIgPSAnaHR0cHM6Ly9uZXh1cy1jYXRhbG9nLmZpcmViYXNlaW8uY29tL3Bvc3RzLmpzb24/YXV0aD03ZzdweUtLeWtOM041ZXdySW1oT2FTNnZ3ckZzYzVmS2tyazhlanpmJztcbmNvbnN0IGFscGhhYmV0ID0gWydhJywgJ2InLCAnYycsICdkJywgJ2UnLCAnZicsICdnJywgJ2gnLCAnaScsICdqJywgJ2snLCAnbCcsICdtJywgJ24nLCAnbycsICdwJywgJ3InLCAncycsICd0JywgJ3UnLCAndicsICd3JywgJ3knLCAneiddO1xuXG5jb25zdCAkbG9hZGluZyA9IEFycmF5LmZyb20oZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLmxvYWRpbmcnKSk7XG5jb25zdCAkbmF2ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2pzLW5hdicpO1xuY29uc3QgJHBhcmFsbGF4ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnBhcmFsbGF4Jyk7XG5jb25zdCAkY29udGVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5jb250ZW50Jyk7XG5jb25zdCAkdGl0bGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnanMtdGl0bGUnKTtcbmNvbnN0ICRhcnJvdyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5hcnJvdycpO1xuY29uc3QgJG1vZGFsID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLm1vZGFsJyk7XG5jb25zdCAkbGlnaHRib3ggPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcubGlnaHRib3gnKTtcbmNvbnN0ICR2aWV3ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmxpZ2h0Ym94LXZpZXcnKTtcblxuZXhwb3J0IHsgXG5cdERCLCBcblx0YWxwaGFiZXQsIFxuXHQkbG9hZGluZywgXG5cdCRuYXYsIFxuXHQkcGFyYWxsYXgsXG5cdCRjb250ZW50LFxuXHQkdGl0bGUsXG5cdCRhcnJvdyxcblx0JG1vZGFsLFxuXHQkbGlnaHRib3gsXG5cdCR2aWV3IFxufTsiLCJpbXBvcnQgc21vb3Roc2Nyb2xsIGZyb20gJ3Ntb290aHNjcm9sbC1wb2x5ZmlsbCc7XG5cbmltcG9ydCB7IGFydGljbGVUZW1wbGF0ZSwgcmVuZGVyTmF2TGcgfSBmcm9tICcuL3RlbXBsYXRlcyc7XG5pbXBvcnQgeyBkZWJvdW5jZSwgaGlkZUxvYWRpbmcsIHNjcm9sbFRvVG9wLCBtYWtlU2xpZGVyIH0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgbWFrZUFscGhhYmV0IGZyb20gJy4vbWFrZUFscGhhYmV0JztcblxuaW1wb3J0IHsgREIsICRuYXYsICRwYXJhbGxheCwgJGNvbnRlbnQsICR0aXRsZSwgJGFycm93LCAkbW9kYWwsICRsaWdodGJveCwgJHZpZXcgfSBmcm9tICcuL2NvbnN0YW50cyc7XG5cbmxldCBzb3J0S2V5ID0gMDsgLy8gMCA9IGFydGlzdCwgMSA9IHRpdGxlXG5sZXQgZW50cmllcyA9IHsgYnlBdXRob3I6IFtdLCBieVRpdGxlOiBbXSB9O1xubGV0IGN1cnJlbnRMZXR0ZXIgPSAnQSc7XG5sZXQgbW9kYWwgPSBmYWxzZTtcbmxldCBsaWdodGJveCA9IGZhbHNlO1xuXG5jb25zdCBhdHRhY2hJbWFnZUxpc3RlbmVycyA9ICgpID0+IHtcblx0Y29uc3QgJGltYWdlcyA9IEFycmF5LmZyb20oZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLmFydGljbGUtaW1hZ2UnKSk7XG5cblx0JGltYWdlcy5mb3JFYWNoKGltZyA9PiB7XG5cdFx0aW1nLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGV2dCkgPT4ge1xuXHRcdFx0aWYgKCFsaWdodGJveCkge1xuXHRcdFx0XHRsZXQgc3JjID0gaW1nLnNyYztcblx0XHRcdFx0XG5cdFx0XHRcdCRsaWdodGJveC5jbGFzc0xpc3QuYWRkKCdzaG93LWltZycpO1xuXHRcdFx0XHQkdmlldy5zZXRBdHRyaWJ1dGUoJ3N0eWxlJywgYGJhY2tncm91bmQtaW1hZ2U6IHVybCgke3NyY30pYCk7XG5cdFx0XHRcdGxpZ2h0Ym94ID0gdHJ1ZTtcblx0XHRcdH1cblx0XHR9KTtcblx0fSk7XG5cblx0JHZpZXcuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0aWYgKGxpZ2h0Ym94KSB7XG5cdFx0XHQkbGlnaHRib3guY2xhc3NMaXN0LnJlbW92ZSgnc2hvdy1pbWcnKTtcblx0XHRcdGxpZ2h0Ym94ID0gZmFsc2U7XG5cdFx0fVxuXHR9KTtcbn07XG5cbmNvbnN0IGF0dGFjaE1vZGFsTGlzdGVuZXJzID0gKCkgPT4ge1xuXHRjb25zdCAkZmluZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdqcy1maW5kJyk7XG5cdFxuXHQkZmluZC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHQkbW9kYWwuY2xhc3NMaXN0LmFkZCgnc2hvdycpO1xuXHRcdG1vZGFsID0gdHJ1ZTtcblx0fSk7XG5cblx0JG1vZGFsLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuXHRcdCRtb2RhbC5jbGFzc0xpc3QucmVtb3ZlKCdzaG93Jyk7XG5cdFx0bW9kYWwgPSBmYWxzZTtcblx0fSk7XG5cblx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCAoKSA9PiB7XG5cdFx0aWYgKG1vZGFsKSB7XG5cdFx0XHRzZXRUaW1lb3V0KCgpID0+IHtcblx0XHRcdFx0JG1vZGFsLmNsYXNzTGlzdC5yZW1vdmUoJ3Nob3cnKTtcblx0XHRcdFx0bW9kYWwgPSBmYWxzZTtcblx0XHRcdH0sIDYwMCk7XG5cdFx0fTtcblx0fSk7XG59XG5cbmxldCBwcmV2O1xubGV0IGN1cnJlbnQgPSAwO1xubGV0IGlzU2hvd2luZyA9IGZhbHNlO1xuY29uc3QgYXR0YWNoQXJyb3dMaXN0ZW5lcnMgPSAoKSA9PiB7XG5cdCRhcnJvdy5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHRzY3JvbGxUb1RvcCgpO1xuXHR9KTtcblxuXHQkcGFyYWxsYXguYWRkRXZlbnRMaXN0ZW5lcignc2Nyb2xsJywgKCkgPT4ge1xuXG5cdFx0bGV0IHkgPSAkdGl0bGUuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkueTtcblx0XHRpZiAoY3VycmVudCAhPT0geSkge1xuXHRcdFx0cHJldiA9IGN1cnJlbnQ7XG5cdFx0XHRjdXJyZW50ID0geTtcblx0XHR9XG5cblx0XHRpZiAoeSA8PSAtNTAgJiYgIWlzU2hvd2luZykge1xuXHRcdFx0JGFycm93LmNsYXNzTGlzdC5hZGQoJ3Nob3cnKTtcblx0XHRcdGlzU2hvd2luZyA9IHRydWU7XG5cdFx0fSBlbHNlIGlmICh5ID4gLTUwICYmIGlzU2hvd2luZykge1xuXHRcdFx0JGFycm93LmNsYXNzTGlzdC5yZW1vdmUoJ3Nob3cnKTtcblx0XHRcdGlzU2hvd2luZyA9IGZhbHNlO1xuXHRcdH1cblx0fSk7XG59O1xuXG5jb25zdCBhZGRTb3J0QnV0dG9uTGlzdGVuZXJzID0gKCkgPT4ge1xuXHRsZXQgJGJ5QXJ0aXN0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2pzLWJ5LWFydGlzdCcpO1xuXHRsZXQgJGJ5VGl0bGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnanMtYnktdGl0bGUnKTtcblx0JGJ5QXJ0aXN0LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuXHRcdGlmIChzb3J0S2V5KSB7XG5cdFx0XHRzY3JvbGxUb1RvcCgpO1xuXHRcdFx0c29ydEtleSA9IDA7XG5cdFx0XHQkYnlBcnRpc3QuY2xhc3NMaXN0LmFkZCgnYWN0aXZlJyk7XG5cdFx0XHQkYnlUaXRsZS5jbGFzc0xpc3QucmVtb3ZlKCdhY3RpdmUnKTtcblxuXHRcdFx0cmVuZGVyRW50cmllcygpO1xuXHRcdH1cblx0fSk7XG5cblx0JGJ5VGl0bGUuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0aWYgKCFzb3J0S2V5KSB7XG5cdFx0XHRzY3JvbGxUb1RvcCgpO1xuXHRcdFx0c29ydEtleSA9IDE7XG5cdFx0XHQkYnlUaXRsZS5jbGFzc0xpc3QuYWRkKCdhY3RpdmUnKTtcblx0XHRcdCRieUFydGlzdC5jbGFzc0xpc3QucmVtb3ZlKCdhY3RpdmUnKTtcblxuXHRcdFx0cmVuZGVyRW50cmllcygpO1xuXHRcdH1cblx0fSk7XG59O1xuXG5jb25zdCByZW5kZXJFbnRyaWVzID0gKCkgPT4ge1xuXHRjb25zdCAkYXJ0aWNsZUxpc3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnanMtbGlzdCcpO1xuXHRjb25zdCBlbnRyaWVzTGlzdCA9IHNvcnRLZXkgPyBlbnRyaWVzLmJ5VGl0bGUgOiBlbnRyaWVzLmJ5QXV0aG9yO1xuXG5cdCRhcnRpY2xlTGlzdC5pbm5lckhUTUwgPSAnJztcblxuXHRlbnRyaWVzTGlzdC5mb3JFYWNoKChlbnRyeSwgaSkgPT4ge1xuXHRcdCRhcnRpY2xlTGlzdC5pbnNlcnRBZGphY2VudEhUTUwoJ2JlZm9yZWVuZCcsIGFydGljbGVUZW1wbGF0ZShlbnRyeSwgaSkpO1xuXHRcdG1ha2VTbGlkZXIoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoYHNsaWRlci0ke2l9YCkpO1xuXHR9KTtcblxuXHRhdHRhY2hJbWFnZUxpc3RlbmVycygpO1xuXHRtYWtlQWxwaGFiZXQoc29ydEtleSk7XG59O1xuXG5jb25zdCBzZXREYXRhQW5kU29ydEJ5VGl0bGUgPSAoZGF0YSkgPT4ge1xuXHRlbnRyaWVzLmJ5QXV0aG9yID0gZGF0YTtcblx0ZW50cmllcy5ieVRpdGxlID0gZGF0YS5zbGljZSgpOyAvLyBjb3BpZXMgZGF0YSBmb3IgYnlUaXRsZSBzb3J0XG5cblx0ZW50cmllcy5ieVRpdGxlLnNvcnQoKGEsIGIpID0+IHtcblx0XHRsZXQgYVRpdGxlID0gYS50aXRsZVswXS50b1VwcGVyQ2FzZSgpO1xuXHRcdGxldCBiVGl0bGUgPSBiLnRpdGxlWzBdLnRvVXBwZXJDYXNlKCk7XG5cdFx0aWYgKGFUaXRsZSA+IGJUaXRsZSkgcmV0dXJuIDE7XG5cdFx0ZWxzZSBpZiAoYVRpdGxlIDwgYlRpdGxlKSByZXR1cm4gLTE7XG5cdFx0ZWxzZSByZXR1cm4gMDtcblx0fSk7XG59O1xuXG5jb25zdCBmZXRjaERhdGEgPSAoKSA9PiB7XG5cdGZldGNoKERCKS50aGVuKHJlcyA9PiByZXMuanNvbigpKVxuXHQudGhlbihkYXRhID0+IHtcblx0XHRzZXREYXRhQW5kU29ydEJ5VGl0bGUoZGF0YSk7XG5cdFx0cmVuZGVyRW50cmllcygpO1xuXHRcdGhpZGVMb2FkaW5nKCk7XG5cdH0pXG5cdC5jYXRjaChlcnIgPT4gY29uc29sZS53YXJuKGVycikpO1xufTtcblxuY29uc3QgaW5pdCA9ICgpID0+IHtcblx0c21vb3Roc2Nyb2xsLnBvbHlmaWxsKCk7XG5cdGZldGNoRGF0YSgpO1xuXG5cdHJlbmRlck5hdkxnKCk7XG5cdGFkZFNvcnRCdXR0b25MaXN0ZW5lcnMoKTtcblx0YXR0YWNoQXJyb3dMaXN0ZW5lcnMoKTtcblx0YXR0YWNoTW9kYWxMaXN0ZW5lcnMoKTtcbn1cblxuaW5pdCgpO1xuIiwiaW1wb3J0IHsgYWxwaGFiZXQgfSBmcm9tICcuL2NvbnN0YW50cyc7XG5cbmNvbnN0IG1ha2VBbHBoYWJldCA9IChzb3J0S2V5KSA9PiB7XG5cdGNvbnN0IGZpbmRGaXJzdEVudHJ5ID0gKGNoYXIpID0+IHtcblx0XHRjb25zdCBzZWxlY3RvciA9IHNvcnRLZXkgPyAnLmpzLWVudHJ5LXRpdGxlJyA6ICcuanMtZW50cnktYXJ0aXN0Jztcblx0XHRjb25zdCBwcmV2U2VsZWN0b3IgPSAhc29ydEtleSA/ICcuanMtZW50cnktdGl0bGUnIDogJy5qcy1lbnRyeS1hcnRpc3QnO1xuXG5cdFx0Y29uc3QgJGVudHJpZXMgPSBBcnJheS5mcm9tKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpKTtcblx0XHRjb25zdCAkcHJldkVudHJpZXMgPSBBcnJheS5mcm9tKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwocHJldlNlbGVjdG9yKSk7XG5cblx0XHQkcHJldkVudHJpZXMuZm9yRWFjaChlbnRyeSA9PiBlbnRyeS5yZW1vdmVBdHRyaWJ1dGUoJ25hbWUnKSk7XG5cblx0XHRyZXR1cm4gJGVudHJpZXMuZmluZChlbnRyeSA9PiB7XG5cdFx0XHRsZXQgbm9kZSA9IGVudHJ5Lm5leHRFbGVtZW50U2libGluZztcblx0XHRcdHJldHVybiBub2RlLmlubmVySFRNTFswXSA9PT0gY2hhciB8fCBub2RlLmlubmVySFRNTFswXSA9PT0gY2hhci50b1VwcGVyQ2FzZSgpO1xuXHRcdH0pO1xuXHR9O1xuXG5cdGNvbnN0IGF0dGFjaEFuY2hvckxpc3RlbmVyID0gKCRhbmNob3IsIGxldHRlcikgPT4ge1xuXHRcdCRhbmNob3IuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0XHRjb25zdCBsZXR0ZXJOb2RlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQobGV0dGVyKTtcblx0XHRcdGxldCB0YXJnZXQ7XG5cblx0XHRcdGlmICghc29ydEtleSkge1xuXHRcdFx0XHR0YXJnZXQgPSBsZXR0ZXIgPT09ICdhJyA/IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhbmNob3ItdGFyZ2V0JykgOiBsZXR0ZXJOb2RlLnBhcmVudEVsZW1lbnQucGFyZW50RWxlbWVudC5wYXJlbnRFbGVtZW50LnBhcmVudEVsZW1lbnQucHJldmlvdXNFbGVtZW50U2libGluZy5xdWVyeVNlbGVjdG9yKCcuanMtYXJ0aWNsZS1hbmNob3ItdGFyZ2V0Jyk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0YXJnZXQgPSBsZXR0ZXIgPT09ICdhJyA/IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhbmNob3ItdGFyZ2V0JykgOiBsZXR0ZXJOb2RlLnBhcmVudEVsZW1lbnQucGFyZW50RWxlbWVudC5wYXJlbnRFbGVtZW50LnByZXZpb3VzRWxlbWVudFNpYmxpbmcucXVlcnlTZWxlY3RvcignLmpzLWFydGljbGUtYW5jaG9yLXRhcmdldCcpO1xuXHRcdFx0fTtcblxuXHRcdFx0dGFyZ2V0LnNjcm9sbEludG9WaWV3KHtiZWhhdmlvcjogXCJzbW9vdGhcIiwgYmxvY2s6IFwic3RhcnRcIn0pO1xuXHRcdH0pO1xuXHR9O1xuXG5cdGxldCBhY3RpdmVFbnRyaWVzID0ge307XG5cdGxldCAkb3V0ZXIgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuYWxwaGFiZXRfX2xldHRlcnMnKTtcblx0JG91dGVyLmlubmVySFRNTCA9ICcnO1xuXG5cdGFscGhhYmV0LmZvckVhY2gobGV0dGVyID0+IHtcblx0XHRsZXQgJGZpcnN0RW50cnkgPSBmaW5kRmlyc3RFbnRyeShsZXR0ZXIpO1xuXHRcdGxldCAkYW5jaG9yID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuXG5cdFx0aWYgKCEkZmlyc3RFbnRyeSkgcmV0dXJuO1xuXG5cdFx0JGZpcnN0RW50cnkuaWQgPSBsZXR0ZXI7XG5cdFx0JGFuY2hvci5pbm5lckhUTUwgPSBsZXR0ZXIudG9VcHBlckNhc2UoKTtcblx0XHQkYW5jaG9yLmNsYXNzTmFtZSA9ICdhbHBoYWJldF9fbGV0dGVyLWFuY2hvcic7XG5cblx0XHRhdHRhY2hBbmNob3JMaXN0ZW5lcigkYW5jaG9yLCBsZXR0ZXIpO1xuXHRcdCRvdXRlci5hcHBlbmRDaGlsZCgkYW5jaG9yKTtcblx0fSk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCBtYWtlQWxwaGFiZXQ7IiwiY29uc3QgaW1hZ2VUZW1wbGF0ZSA9IChpbWFnZSkgPT4gYDxpbWcgY2xhc3M9XCJhcnRpY2xlLWltZ1wiIHNyYz1cIi4uLy4uL2Fzc2V0cy9pbWFnZXMvJHtpbWFnZX1cIj48L2ltZz5gO1xuXG5jb25zdCBhcnRpY2xlVGVtcGxhdGUgPSAoZW50cnksIGkpID0+IHtcblx0Y29uc3QgeyB0aXRsZSwgZmlyc3ROYW1lLCBsYXN0TmFtZSwgaW1hZ2VzLCBkZXNjcmlwdGlvbiwgZGV0YWlsIH0gPSBlbnRyeTtcblxuXHRjb25zdCBpbWFnZUhUTUwgPSBpbWFnZXMubGVuZ3RoID8gXG5cdFx0aW1hZ2VzLm1hcChpbWFnZSA9PiBpbWFnZVRlbXBsYXRlKGltYWdlKSkuam9pbignJykgOiAnJztcblxuXHRyZXR1cm4gIGBcblx0XHQ8YXJ0aWNsZSBjbGFzcz1cImFydGljbGVfX291dGVyXCI+XG5cdFx0XHQ8ZGl2IGNsYXNzPVwiYXJ0aWNsZV9faW5uZXJcIj5cblx0XHRcdFx0PGRpdiBjbGFzcz1cImFydGljbGVfX2hlYWRpbmdcIj5cblx0XHRcdFx0XHQ8YSBjbGFzcz1cImpzLWVudHJ5LXRpdGxlXCI+PC9hPlxuXHRcdFx0XHRcdDxoMiBjbGFzcz1cImFydGljbGUtaGVhZGluZ19fdGl0bGVcIj4ke3RpdGxlfTwvaDI+XG5cdFx0XHRcdFx0PGRpdiBjbGFzcz1cImFydGljbGUtaGVhZGluZ19fbmFtZVwiPlxuXHRcdFx0XHRcdFx0PHNwYW4gY2xhc3M9XCJhcnRpY2xlLWhlYWRpbmdfX25hbWUtLWZpcnN0XCI+JHtmaXJzdE5hbWV9PC9zcGFuPlxuXHRcdFx0XHRcdFx0PGEgY2xhc3M9XCJqcy1lbnRyeS1hcnRpc3RcIj48L2E+XG5cdFx0XHRcdFx0XHQ8c3BhbiBjbGFzcz1cImFydGljbGUtaGVhZGluZ19fbmFtZS0tbGFzdFwiPiR7bGFzdE5hbWV9PC9zcGFuPlxuXHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHQ8L2Rpdj5cdFxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVwiYXJ0aWNsZV9fc2xpZGVyLW91dGVyXCI+XG5cdFx0XHRcdFx0PGRpdiBjbGFzcz1cImFydGljbGVfX3NsaWRlci1pbm5lclwiIGlkPVwic2xpZGVyLSR7aX1cIj5cblx0XHRcdFx0XHRcdCR7aW1hZ2VIVE1MfVxuXHRcdFx0XHRcdFx0PGRpdiBjbGFzcz1cImFydGljbGUtZGVzY3JpcHRpb25fX291dGVyXCI+XG5cdFx0XHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlLWRlc2NyaXB0aW9uXCI+JHtkZXNjcmlwdGlvbn08L2Rpdj5cblx0XHRcdFx0XHRcdFx0PGRpdiBjbGFzcz1cImFydGljbGUtZGV0YWlsXCI+JHtkZXRhaWx9PC9kaXY+XG5cdFx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0XHQ8ZGl2IGNsYXNzPVwiYXJ0aWNsZV9fc2Nyb2xsLWNvbnRyb2xzXCI+XG5cdFx0XHRcdFx0XHQ8c3BhbiBjbGFzcz1cImNvbnRyb2xzIGFycm93LXByZXZcIj7ihpA8L3NwYW4+IFxuXHRcdFx0XHRcdFx0PHNwYW4gY2xhc3M9XCJjb250cm9scyBhcnJvdy1uZXh0XCI+4oaSPC9zcGFuPlxuXHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHRcdDxwIGNsYXNzPVwianMtYXJ0aWNsZS1hbmNob3ItdGFyZ2V0XCI+PC9wPlxuXHRcdFx0PC9kaXY+XG5cdFx0PC9hcnRpY2xlPlxuXHRgXG59O1xuXG5leHBvcnQgZGVmYXVsdCBhcnRpY2xlVGVtcGxhdGU7IiwiaW1wb3J0IGFydGljbGVUZW1wbGF0ZSBmcm9tICcuL2FydGljbGUnO1xuaW1wb3J0IHJlbmRlck5hdkxnIGZyb20gJy4vbmF2TGcnO1xuXG5leHBvcnQgeyBhcnRpY2xlVGVtcGxhdGUsIHJlbmRlck5hdkxnIH07IiwiY29uc3QgdGVtcGxhdGUgPSBcblx0YDxkaXYgY2xhc3M9XCJuYXZfX2lubmVyXCI+XG5cdFx0PGRpdiBjbGFzcz1cIm5hdl9fc29ydC1ieVwiPlxuXHRcdFx0PHNwYW4gY2xhc3M9XCJzb3J0LWJ5X190aXRsZVwiPlNvcnQgYnk8L3NwYW4+XG5cdFx0XHQ8YnV0dG9uIGNsYXNzPVwic29ydC1ieSBzb3J0LWJ5X19ieS1hcnRpc3QgYWN0aXZlXCIgaWQ9XCJqcy1ieS1hcnRpc3RcIj5BcnRpc3Q8L2J1dHRvbj5cblx0XHRcdDxzcGFuIGNsYXNzPVwic29ydC1ieV9fZGl2aWRlclwiPiB8IDwvc3Bhbj5cblx0XHRcdDxidXR0b24gY2xhc3M9XCJzb3J0LWJ5IHNvcnQtYnlfX2J5LXRpdGxlXCIgaWQ9XCJqcy1ieS10aXRsZVwiPlRpdGxlPC9idXR0b24+XG5cdFx0XHQ8c3BhbiBjbGFzcz1cImZpbmRcIiBpZD1cImpzLWZpbmRcIj5cblx0XHRcdFx0KDxzcGFuIGNsYXNzPVwiZmluZC0taW5uZXJcIj4mIzg5ODQ7Rjwvc3Bhbj4pXG5cdFx0XHQ8L3NwYW4+XG5cdFx0PC9kaXY+XG5cdFx0PGRpdiBjbGFzcz1cIm5hdl9fYWxwaGFiZXRcIj5cblx0XHRcdDxzcGFuIGNsYXNzPVwiYWxwaGFiZXRfX3RpdGxlXCI+R28gdG88L3NwYW4+XG5cdFx0XHQ8ZGl2IGNsYXNzPVwiYWxwaGFiZXRfX2xldHRlcnNcIj48L2Rpdj5cblx0XHQ8L2Rpdj5cblx0PC9kaXY+YDtcblxuY29uc3QgcmVuZGVyTmF2TGcgPSAoKSA9PiB7XG5cdGxldCBuYXZPdXRlciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdqcy1uYXYnKTtcblx0bmF2T3V0ZXIuaW5uZXJIVE1MID0gdGVtcGxhdGU7XG59O1xuXG5leHBvcnQgZGVmYXVsdCByZW5kZXJOYXZMZzsiLCJpbXBvcnQgeyAkbG9hZGluZywgJG5hdiwgJHBhcmFsbGF4LCAkY29udGVudCwgJHRpdGxlLCAkYXJyb3csICRtb2RhbCwgJGxpZ2h0Ym94LCAkdmlldyB9IGZyb20gJy4uL2NvbnN0YW50cyc7XG5cbmNvbnN0IGRlYm91bmNlID0gKGZuLCB0aW1lKSA9PiB7XG4gIGxldCB0aW1lb3V0O1xuXG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICBjb25zdCBmdW5jdGlvbkNhbGwgPSAoKSA9PiBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIFxuICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICB0aW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbkNhbGwsIHRpbWUpO1xuICB9XG59O1xuXG5jb25zdCBoaWRlTG9hZGluZyA9ICgpID0+IHtcblx0JGxvYWRpbmcuZm9yRWFjaChlbGVtID0+IGVsZW0uY2xhc3NMaXN0LmFkZCgncmVhZHknKSk7XG5cdCRuYXYuY2xhc3NMaXN0LmFkZCgncmVhZHknKTtcbn07XG5cbmNvbnN0IHNjcm9sbFRvVG9wID0gKCkgPT4ge1xuXHRsZXQgdG9wID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2FuY2hvci10YXJnZXQnKTtcblx0dG9wLnNjcm9sbEludG9WaWV3KHtiZWhhdmlvcjogXCJzbW9vdGhcIiwgYmxvY2s6IFwic3RhcnRcIn0pO1xufTtcblxuY29uc3QgbWFrZVNsaWRlciA9ICgkc2xpZGVyKSA9PiB7XG5cdGNvbnN0ICRhcnJvd05leHQgPSAkc2xpZGVyLnBhcmVudEVsZW1lbnQucXVlcnlTZWxlY3RvcignLmFycm93LW5leHQnKTtcblx0Y29uc3QgJGFycm93UHJldiA9ICRzbGlkZXIucGFyZW50RWxlbWVudC5xdWVyeVNlbGVjdG9yKCcuYXJyb3ctcHJldicpO1xuXG5cdGxldCBjdXJyZW50ID0gJHNsaWRlci5maXJzdEVsZW1lbnRDaGlsZDtcblx0JGFycm93TmV4dC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHRjb25zdCBuZXh0ID0gY3VycmVudC5uZXh0RWxlbWVudFNpYmxpbmc7XG5cdFx0aWYgKG5leHQpIHtcblx0XHRcdG5leHQuc2Nyb2xsSW50b1ZpZXcoe2JlaGF2aW9yOiBcInNtb290aFwiLCBibG9jazogXCJuZWFyZXN0XCIsIGlubGluZTogXCJjZW50ZXJcIn0pO1xuXHRcdFx0Y3VycmVudCA9IG5leHQ7XG5cdFx0fVxuXHR9KTtcblxuXHQkYXJyb3dQcmV2LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuXHRcdGNvbnN0IHByZXYgPSBjdXJyZW50LnByZXZpb3VzRWxlbWVudFNpYmxpbmc7XG5cdFx0aWYgKHByZXYpIHtcblx0XHRcdHByZXYuc2Nyb2xsSW50b1ZpZXcoe2JlaGF2aW9yOiBcInNtb290aFwiLCBibG9jazogXCJuZWFyZXN0XCIsIGlubGluZTogXCJjZW50ZXJcIn0pO1xuXHRcdFx0Y3VycmVudCA9IHByZXY7XG5cdFx0fVxuXHR9KVxufTtcblxuZXhwb3J0IHsgZGVib3VuY2UsIGhpZGVMb2FkaW5nLCBzY3JvbGxUb1RvcCwgbWFrZVNsaWRlciB9OyJdLCJwcmVFeGlzdGluZ0NvbW1lbnQiOiIvLyMgc291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD11dGYtODtiYXNlNjQsZXlKMlpYSnphVzl1SWpvekxDSnpiM1Z5WTJWeklqcGJJbTV2WkdWZmJXOWtkV3hsY3k5aWNtOTNjMlZ5TFhCaFkyc3ZYM0J5Wld4MVpHVXVhbk1pTENKdWIyUmxYMjF2WkhWc1pYTXZjMjF2YjNSb2MyTnliMnhzTFhCdmJIbG1hV3hzTDJScGMzUXZjMjF2YjNSb2MyTnliMnhzTG1weklpd2ljM0pqTDJwekwyTnZibk4wWVc1MGN5NXFjeUlzSW5OeVl5OXFjeTlwYm1SbGVDNXFjeUlzSW5OeVl5OXFjeTl0WVd0bFFXeHdhR0ZpWlhRdWFuTWlMQ0p6Y21NdmFuTXZkR1Z0Y0d4aGRHVnpMMkZ5ZEdsamJHVXVhbk1pTENKemNtTXZhbk12ZEdWdGNHeGhkR1Z6TDJsdVpHVjRMbXB6SWl3aWMzSmpMMnB6TDNSbGJYQnNZWFJsY3k5dVlYWk1aeTVxY3lJc0luTnlZeTlxY3k5MWRHbHNjeTlwYm1SbGVDNXFjeUpkTENKdVlXMWxjeUk2VzEwc0ltMWhjSEJwYm1keklqb2lRVUZCUVR0QlEwRkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdPenM3T3pzN1FVTjJZa0VzU1VGQlRTeExRVUZMTEN0R1FVRllPMEZCUTBFc1NVRkJUU3hYUVVGWExFTkJRVU1zUjBGQlJDeEZRVUZOTEVkQlFVNHNSVUZCVnl4SFFVRllMRVZCUVdkQ0xFZEJRV2hDTEVWQlFYRkNMRWRCUVhKQ0xFVkJRVEJDTEVkQlFURkNMRVZCUVN0Q0xFZEJRUzlDTEVWQlFXOURMRWRCUVhCRExFVkJRWGxETEVkQlFYcERMRVZCUVRoRExFZEJRVGxETEVWQlFXMUVMRWRCUVc1RUxFVkJRWGRFTEVkQlFYaEVMRVZCUVRaRUxFZEJRVGRFTEVWQlFXdEZMRWRCUVd4RkxFVkJRWFZGTEVkQlFYWkZMRVZCUVRSRkxFZEJRVFZGTEVWQlFXbEdMRWRCUVdwR0xFVkJRWE5HTEVkQlFYUkdMRVZCUVRKR0xFZEJRVE5HTEVWQlFXZEhMRWRCUVdoSExFVkJRWEZITEVkQlFYSkhMRVZCUVRCSExFZEJRVEZITEVWQlFTdEhMRWRCUVM5SExFVkJRVzlJTEVkQlFYQklMRU5CUVdwQ096dEJRVVZCTEVsQlFVMHNWMEZCVnl4TlFVRk5MRWxCUVU0c1EwRkJWeXhUUVVGVExHZENRVUZVTEVOQlFUQkNMRlZCUVRGQ0xFTkJRVmdzUTBGQmFrSTdRVUZEUVN4SlFVRk5MRTlCUVU4c1UwRkJVeXhqUVVGVUxFTkJRWGRDTEZGQlFYaENMRU5CUVdJN1FVRkRRU3hKUVVGTkxGbEJRVmtzVTBGQlV5eGhRVUZVTEVOQlFYVkNMRmRCUVhaQ0xFTkJRV3hDTzBGQlEwRXNTVUZCVFN4WFFVRlhMRk5CUVZNc1lVRkJWQ3hEUVVGMVFpeFZRVUYyUWl4RFFVRnFRanRCUVVOQkxFbEJRVTBzVTBGQlV5eFRRVUZUTEdOQlFWUXNRMEZCZDBJc1ZVRkJlRUlzUTBGQlpqdEJRVU5CTEVsQlFVMHNVMEZCVXl4VFFVRlRMR0ZCUVZRc1EwRkJkVUlzVVVGQmRrSXNRMEZCWmp0QlFVTkJMRWxCUVUwc1UwRkJVeXhUUVVGVExHRkJRVlFzUTBGQmRVSXNVVUZCZGtJc1EwRkJaanRCUVVOQkxFbEJRVTBzV1VGQldTeFRRVUZUTEdGQlFWUXNRMEZCZFVJc1YwRkJka0lzUTBGQmJFSTdRVUZEUVN4SlFVRk5MRkZCUVZFc1UwRkJVeXhoUVVGVUxFTkJRWFZDTEdkQ1FVRjJRaXhEUVVGa096dFJRVWRETEVVc1IwRkJRU3hGTzFGQlEwRXNVU3hIUVVGQkxGRTdVVUZEUVN4UkxFZEJRVUVzVVR0UlFVTkJMRWtzUjBGQlFTeEpPMUZCUTBFc1V5eEhRVUZCTEZNN1VVRkRRU3hSTEVkQlFVRXNVVHRSUVVOQkxFMHNSMEZCUVN4Tk8xRkJRMEVzVFN4SFFVRkJMRTA3VVVGRFFTeE5MRWRCUVVFc1RUdFJRVU5CTEZNc1IwRkJRU3hUTzFGQlEwRXNTeXhIUVVGQkxFczdPenM3TzBGRGVFSkVPenM3TzBGQlJVRTdPMEZCUTBFN08wRkJRMEU3T3pzN1FVRkZRVHM3T3p0QlFVVkJMRWxCUVVrc1ZVRkJWU3hEUVVGa0xFTXNRMEZCYVVJN1FVRkRha0lzU1VGQlNTeFZRVUZWTEVWQlFVVXNWVUZCVlN4RlFVRmFMRVZCUVdkQ0xGTkJRVk1zUlVGQmVrSXNSVUZCWkR0QlFVTkJMRWxCUVVrc1owSkJRV2RDTEVkQlFYQkNPMEZCUTBFc1NVRkJTU3hSUVVGUkxFdEJRVm83UVVGRFFTeEpRVUZKTEZkQlFWY3NTMEZCWmpzN1FVRkZRU3hKUVVGTkxIVkNRVUYxUWl4VFFVRjJRaXh2UWtGQmRVSXNSMEZCVFR0QlFVTnNReXhMUVVGTkxGVkJRVlVzVFVGQlRTeEpRVUZPTEVOQlFWY3NVMEZCVXl4blFrRkJWQ3hEUVVFd1FpeG5Ra0ZCTVVJc1EwRkJXQ3hEUVVGb1FqczdRVUZGUVN4VFFVRlJMRTlCUVZJc1EwRkJaMElzWlVGQlR6dEJRVU4wUWl4TlFVRkpMR2RDUVVGS0xFTkJRWEZDTEU5QlFYSkNMRVZCUVRoQ0xGVkJRVU1zUjBGQlJDeEZRVUZUTzBGQlEzUkRMRTlCUVVrc1EwRkJReXhSUVVGTUxFVkJRV1U3UVVGRFpDeFJRVUZKTEUxQlFVMHNTVUZCU1N4SFFVRmtPenRCUVVWQkxIbENRVUZWTEZOQlFWWXNRMEZCYjBJc1IwRkJjRUlzUTBGQmQwSXNWVUZCZUVJN1FVRkRRU3h4UWtGQlRTeFpRVUZPTEVOQlFXMUNMRTlCUVc1Q0xEWkNRVUZ4UkN4SFFVRnlSRHRCUVVOQkxHVkJRVmNzU1VGQldEdEJRVU5CTzBGQlEwUXNSMEZTUkR0QlFWTkJMRVZCVmtRN08wRkJXVUVzYTBKQlFVMHNaMEpCUVU0c1EwRkJkVUlzVDBGQmRrSXNSVUZCWjBNc1dVRkJUVHRCUVVOeVF5eE5RVUZKTEZGQlFVb3NSVUZCWXp0QlFVTmlMSGRDUVVGVkxGTkJRVllzUTBGQmIwSXNUVUZCY0VJc1EwRkJNa0lzVlVGQk0wSTdRVUZEUVN4alFVRlhMRXRCUVZnN1FVRkRRVHRCUVVORUxFVkJURVE3UVVGTlFTeERRWEpDUkRzN1FVRjFRa0VzU1VGQlRTeDFRa0ZCZFVJc1UwRkJka0lzYjBKQlFYVkNMRWRCUVUwN1FVRkRiRU1zUzBGQlRTeFJRVUZSTEZOQlFWTXNZMEZCVkN4RFFVRjNRaXhUUVVGNFFpeERRVUZrT3p0QlFVVkJMRTlCUVUwc1owSkJRVTRzUTBGQmRVSXNUMEZCZGtJc1JVRkJaME1zV1VGQlRUdEJRVU55UXl4dlFrRkJUeXhUUVVGUUxFTkJRV2xDTEVkQlFXcENMRU5CUVhGQ0xFMUJRWEpDTzBGQlEwRXNWVUZCVVN4SlFVRlNPMEZCUTBFc1JVRklSRHM3UVVGTFFTeHRRa0ZCVHl4blFrRkJVQ3hEUVVGM1FpeFBRVUY0UWl4RlFVRnBReXhaUVVGTk8wRkJRM1JETEc5Q1FVRlBMRk5CUVZBc1EwRkJhVUlzVFVGQmFrSXNRMEZCZDBJc1RVRkJlRUk3UVVGRFFTeFZRVUZSTEV0QlFWSTdRVUZEUVN4RlFVaEVPenRCUVV0QkxGRkJRVThzWjBKQlFWQXNRMEZCZDBJc1UwRkJlRUlzUlVGQmJVTXNXVUZCVFR0QlFVTjRReXhOUVVGSkxFdEJRVW9zUlVGQlZ6dEJRVU5XTEdOQlFWY3NXVUZCVFR0QlFVTm9RaXh6UWtGQlR5eFRRVUZRTEVOQlFXbENMRTFCUVdwQ0xFTkJRWGRDTEUxQlFYaENPMEZCUTBFc1dVRkJVU3hMUVVGU08wRkJRMEVzU1VGSVJDeEZRVWRITEVkQlNFZzdRVUZKUVR0QlFVTkVMRVZCVUVRN1FVRlJRU3hEUVhKQ1JEczdRVUYxUWtFc1NVRkJTU3hoUVVGS08wRkJRMEVzU1VGQlNTeFZRVUZWTEVOQlFXUTdRVUZEUVN4SlFVRkpMRmxCUVZrc1MwRkJhRUk3UVVGRFFTeEpRVUZOTEhWQ1FVRjFRaXhUUVVGMlFpeHZRa0ZCZFVJc1IwRkJUVHRCUVVOc1F5eHRRa0ZCVHl4blFrRkJVQ3hEUVVGM1FpeFBRVUY0UWl4RlFVRnBReXhaUVVGTk8wRkJRM1JETzBGQlEwRXNSVUZHUkRzN1FVRkpRU3h6UWtGQlZTeG5Ra0ZCVml4RFFVRXlRaXhSUVVFelFpeEZRVUZ4UXl4WlFVRk5PenRCUVVVeFF5eE5RVUZKTEVsQlFVa3NhMEpCUVU4c2NVSkJRVkFzUjBGQkswSXNRMEZCZGtNN1FVRkRRU3hOUVVGSkxGbEJRVmtzUTBGQmFFSXNSVUZCYlVJN1FVRkRiRUlzVlVGQlR5eFBRVUZRTzBGQlEwRXNZVUZCVlN4RFFVRldPMEZCUTBFN08wRkJSVVFzVFVGQlNTeExRVUZMTEVOQlFVTXNSVUZCVGl4SlFVRlpMRU5CUVVNc1UwRkJha0lzUlVGQk5FSTdRVUZETTBJc2NVSkJRVThzVTBGQlVDeERRVUZwUWl4SFFVRnFRaXhEUVVGeFFpeE5RVUZ5UWp0QlFVTkJMR1ZCUVZrc1NVRkJXanRCUVVOQkxFZEJTRVFzVFVGSFR5eEpRVUZKTEVsQlFVa3NRMEZCUXl4RlFVRk1MRWxCUVZjc1UwRkJaaXhGUVVFd1FqdEJRVU5vUXl4eFFrRkJUeXhUUVVGUUxFTkJRV2xDTEUxQlFXcENMRU5CUVhkQ0xFMUJRWGhDTzBGQlEwRXNaVUZCV1N4TFFVRmFPMEZCUTBFN1FVRkRSQ3hGUVdaRU8wRkJaMEpCTEVOQmNrSkVPenRCUVhWQ1FTeEpRVUZOTEhsQ1FVRjVRaXhUUVVGNlFpeHpRa0ZCZVVJc1IwRkJUVHRCUVVOd1F5eExRVUZKTEZsQlFWa3NVMEZCVXl4alFVRlVMRU5CUVhkQ0xHTkJRWGhDTEVOQlFXaENPMEZCUTBFc1MwRkJTU3hYUVVGWExGTkJRVk1zWTBGQlZDeERRVUYzUWl4aFFVRjRRaXhEUVVGbU8wRkJRMEVzVjBGQlZTeG5Ra0ZCVml4RFFVRXlRaXhQUVVFelFpeEZRVUZ2UXl4WlFVRk5PMEZCUTNwRExFMUJRVWtzVDBGQlNpeEZRVUZoTzBGQlExbzdRVUZEUVN4aFFVRlZMRU5CUVZZN1FVRkRRU3hoUVVGVkxGTkJRVllzUTBGQmIwSXNSMEZCY0VJc1EwRkJkMElzVVVGQmVFSTdRVUZEUVN4WlFVRlRMRk5CUVZRc1EwRkJiVUlzVFVGQmJrSXNRMEZCTUVJc1VVRkJNVUk3TzBGQlJVRTdRVUZEUVR0QlFVTkVMRVZCVkVRN08wRkJWMEVzVlVGQlV5eG5Ra0ZCVkN4RFFVRXdRaXhQUVVFeFFpeEZRVUZ0UXl4WlFVRk5PMEZCUTNoRExFMUJRVWtzUTBGQlF5eFBRVUZNTEVWQlFXTTdRVUZEWWp0QlFVTkJMR0ZCUVZVc1EwRkJWanRCUVVOQkxGbEJRVk1zVTBGQlZDeERRVUZ0UWl4SFFVRnVRaXhEUVVGMVFpeFJRVUYyUWp0QlFVTkJMR0ZCUVZVc1UwRkJWaXhEUVVGdlFpeE5RVUZ3UWl4RFFVRXlRaXhSUVVFelFqczdRVUZGUVR0QlFVTkJPMEZCUTBRc1JVRlVSRHRCUVZWQkxFTkJlRUpFT3p0QlFUQkNRU3hKUVVGTkxHZENRVUZuUWl4VFFVRm9RaXhoUVVGblFpeEhRVUZOTzBGQlF6TkNMRXRCUVUwc1pVRkJaU3hUUVVGVExHTkJRVlFzUTBGQmQwSXNVMEZCZUVJc1EwRkJja0k3UVVGRFFTeExRVUZOTEdOQlFXTXNWVUZCVlN4UlFVRlJMRTlCUVd4Q0xFZEJRVFJDTEZGQlFWRXNVVUZCZUVRN08wRkJSVUVzWTBGQllTeFRRVUZpTEVkQlFYbENMRVZCUVhwQ096dEJRVVZCTEdGQlFWa3NUMEZCV2l4RFFVRnZRaXhWUVVGRExFdEJRVVFzUlVGQlVTeERRVUZTTEVWQlFXTTdRVUZEYWtNc1pVRkJZU3hyUWtGQllpeERRVUZuUXl4WFFVRm9ReXhGUVVFMlF5eG5RMEZCWjBJc1MwRkJhRUlzUlVGQmRVSXNRMEZCZGtJc1EwRkJOME03UVVGRFFTeDVRa0ZCVnl4VFFVRlRMR05CUVZRc1lVRkJhME1zUTBGQmJFTXNRMEZCV0R0QlFVTkJMRVZCU0VRN08wRkJTMEU3UVVGRFFTdzJRa0ZCWVN4UFFVRmlPMEZCUTBFc1EwRmlSRHM3UVVGbFFTeEpRVUZOTEhkQ1FVRjNRaXhUUVVGNFFpeHhRa0ZCZDBJc1EwRkJReXhKUVVGRUxFVkJRVlU3UVVGRGRrTXNVMEZCVVN4UlFVRlNMRWRCUVcxQ0xFbEJRVzVDTzBGQlEwRXNVMEZCVVN4UFFVRlNMRWRCUVd0Q0xFdEJRVXNzUzBGQlRDeEZRVUZzUWl4RFFVWjFReXhEUVVWUU96dEJRVVZvUXl4VFFVRlJMRTlCUVZJc1EwRkJaMElzU1VGQmFFSXNRMEZCY1VJc1ZVRkJReXhEUVVGRUxFVkJRVWtzUTBGQlNpeEZRVUZWTzBGQlF6bENMRTFCUVVrc1UwRkJVeXhGUVVGRkxFdEJRVVlzUTBGQlVTeERRVUZTTEVWQlFWY3NWMEZCV0N4RlFVRmlPMEZCUTBFc1RVRkJTU3hUUVVGVExFVkJRVVVzUzBGQlJpeERRVUZSTEVOQlFWSXNSVUZCVnl4WFFVRllMRVZCUVdJN1FVRkRRU3hOUVVGSkxGTkJRVk1zVFVGQllpeEZRVUZ4UWl4UFFVRlBMRU5CUVZBc1EwRkJja0lzUzBGRFN5eEpRVUZKTEZOQlFWTXNUVUZCWWl4RlFVRnhRaXhQUVVGUExFTkJRVU1zUTBGQlVpeERRVUZ5UWl4TFFVTkJMRTlCUVU4c1EwRkJVRHRCUVVOTUxFVkJUa1E3UVVGUFFTeERRVmhFT3p0QlFXRkJMRWxCUVUwc1dVRkJXU3hUUVVGYUxGTkJRVmtzUjBGQlRUdEJRVU4yUWl4UFFVRk5MR0ZCUVU0c1JVRkJWU3hKUVVGV0xFTkJRV1U3UVVGQlFTeFRRVUZQTEVsQlFVa3NTVUZCU2l4RlFVRlFPMEZCUVVFc1JVRkJaaXhGUVVORExFbEJSRVFzUTBGRFRTeG5Ra0ZCVVR0QlFVTmlMSGRDUVVGelFpeEpRVUYwUWp0QlFVTkJPMEZCUTBFN1FVRkRRU3hGUVV4RUxFVkJUVU1zUzBGT1JDeERRVTFQTzBGQlFVRXNVMEZCVHl4UlFVRlJMRWxCUVZJc1EwRkJZU3hIUVVGaUxFTkJRVkE3UVVGQlFTeEZRVTVRTzBGQlQwRXNRMEZTUkRzN1FVRlZRU3hKUVVGTkxFOUJRVThzVTBGQlVDeEpRVUZQTEVkQlFVMDdRVUZEYkVJc1owTkJRV0VzVVVGQllqdEJRVU5CT3p0QlFVVkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEVzUTBGU1JEczdRVUZWUVRzN096czdPenM3TzBGRGFFdEJPenRCUVVWQkxFbEJRVTBzWlVGQlpTeFRRVUZtTEZsQlFXVXNRMEZCUXl4UFFVRkVMRVZCUVdFN1FVRkRha01zUzBGQlRTeHBRa0ZCYVVJc1UwRkJha0lzWTBGQmFVSXNRMEZCUXl4SlFVRkVMRVZCUVZVN1FVRkRhRU1zVFVGQlRTeFhRVUZYTEZWQlFWVXNhVUpCUVZZc1IwRkJPRUlzYTBKQlFTOURPMEZCUTBFc1RVRkJUU3hsUVVGbExFTkJRVU1zVDBGQlJDeEhRVUZYTEdsQ1FVRllMRWRCUVN0Q0xHdENRVUZ3UkRzN1FVRkZRU3hOUVVGTkxGZEJRVmNzVFVGQlRTeEpRVUZPTEVOQlFWY3NVMEZCVXl4blFrRkJWQ3hEUVVFd1FpeFJRVUV4UWl4RFFVRllMRU5CUVdwQ08wRkJRMEVzVFVGQlRTeGxRVUZsTEUxQlFVMHNTVUZCVGl4RFFVRlhMRk5CUVZNc1owSkJRVlFzUTBGQk1FSXNXVUZCTVVJc1EwRkJXQ3hEUVVGeVFqczdRVUZGUVN4bFFVRmhMRTlCUVdJc1EwRkJjVUk3UVVGQlFTeFZRVUZUTEUxQlFVMHNaVUZCVGl4RFFVRnpRaXhOUVVGMFFpeERRVUZVTzBGQlFVRXNSMEZCY2tJN08wRkJSVUVzVTBGQlR5eFRRVUZUTEVsQlFWUXNRMEZCWXl4cFFrRkJVenRCUVVNM1FpeFBRVUZKTEU5QlFVOHNUVUZCVFN4clFrRkJha0k3UVVGRFFTeFZRVUZQTEV0QlFVc3NVMEZCVEN4RFFVRmxMRU5CUVdZc1RVRkJjMElzU1VGQmRFSXNTVUZCT0VJc1MwRkJTeXhUUVVGTUxFTkJRV1VzUTBGQlppeE5RVUZ6UWl4TFFVRkxMRmRCUVV3c1JVRkJNMFE3UVVGRFFTeEhRVWhOTEVOQlFWQTdRVUZKUVN4RlFXSkVPenRCUVdWQkxFdEJRVTBzZFVKQlFYVkNMRk5CUVhaQ0xHOUNRVUYxUWl4RFFVRkRMRTlCUVVRc1JVRkJWU3hOUVVGV0xFVkJRWEZDTzBGQlEycEVMRlZCUVZFc1owSkJRVklzUTBGQmVVSXNUMEZCZWtJc1JVRkJhME1zV1VGQlRUdEJRVU4yUXl4UFFVRk5MR0ZCUVdFc1UwRkJVeXhqUVVGVUxFTkJRWGRDTEUxQlFYaENMRU5CUVc1Q08wRkJRMEVzVDBGQlNTeGxRVUZLT3p0QlFVVkJMRTlCUVVrc1EwRkJReXhQUVVGTUxFVkJRV003UVVGRFlpeGhRVUZUTEZkQlFWY3NSMEZCV0N4SFFVRnBRaXhUUVVGVExHTkJRVlFzUTBGQmQwSXNaVUZCZUVJc1EwRkJha0lzUjBGQk5FUXNWMEZCVnl4aFFVRllMRU5CUVhsQ0xHRkJRWHBDTEVOQlFYVkRMR0ZCUVhaRExFTkJRWEZFTEdGQlFYSkVMRU5CUVcxRkxITkNRVUZ1UlN4RFFVRXdSaXhoUVVFeFJpeERRVUYzUnl3eVFrRkJlRWNzUTBGQmNrVTdRVUZEUVN4SlFVWkVMRTFCUlU4N1FVRkRUaXhoUVVGVExGZEJRVmNzUjBGQldDeEhRVUZwUWl4VFFVRlRMR05CUVZRc1EwRkJkMElzWlVGQmVFSXNRMEZCYWtJc1IwRkJORVFzVjBGQlZ5eGhRVUZZTEVOQlFYbENMR0ZCUVhwQ0xFTkJRWFZETEdGQlFYWkRMRU5CUVhGRUxITkNRVUZ5UkN4RFFVRTBSU3hoUVVFMVJTeERRVUV3Uml3eVFrRkJNVVlzUTBGQmNrVTdRVUZEUVRzN1FVRkZSQ3hWUVVGUExHTkJRVkFzUTBGQmMwSXNSVUZCUXl4VlFVRlZMRkZCUVZnc1JVRkJjVUlzVDBGQlR5eFBRVUUxUWl4RlFVRjBRanRCUVVOQkxFZEJXRVE3UVVGWlFTeEZRV0pFT3p0QlFXVkJMRXRCUVVrc1owSkJRV2RDTEVWQlFYQkNPMEZCUTBFc1MwRkJTU3hUUVVGVExGTkJRVk1zWVVGQlZDeERRVUYxUWl4dlFrRkJka0lzUTBGQllqdEJRVU5CTEZGQlFVOHNVMEZCVUN4SFFVRnRRaXhGUVVGdVFqczdRVUZGUVN4eFFrRkJVeXhQUVVGVUxFTkJRV2xDTEd0Q1FVRlZPMEZCUXpGQ0xFMUJRVWtzWTBGQll5eGxRVUZsTEUxQlFXWXNRMEZCYkVJN1FVRkRRU3hOUVVGSkxGVkJRVlVzVTBGQlV5eGhRVUZVTEVOQlFYVkNMRWRCUVhaQ0xFTkJRV1E3TzBGQlJVRXNUVUZCU1N4RFFVRkRMRmRCUVV3c1JVRkJhMEk3TzBGQlJXeENMR05CUVZrc1JVRkJXaXhIUVVGcFFpeE5RVUZxUWp0QlFVTkJMRlZCUVZFc1UwRkJVaXhIUVVGdlFpeFBRVUZQTEZkQlFWQXNSVUZCY0VJN1FVRkRRU3hWUVVGUkxGTkJRVklzUjBGQmIwSXNlVUpCUVhCQ096dEJRVVZCTEhWQ1FVRnhRaXhQUVVGeVFpeEZRVUU0UWl4TlFVRTVRanRCUVVOQkxGTkJRVThzVjBGQlVDeERRVUZ0UWl4UFFVRnVRanRCUVVOQkxFVkJXa1E3UVVGaFFTeERRV2hFUkRzN2EwSkJhMFJsTEZrN096czdPenM3TzBGRGNFUm1MRWxCUVUwc1owSkJRV2RDTEZOQlFXaENMR0ZCUVdkQ0xFTkJRVU1zUzBGQlJEdEJRVUZCTEN0RVFVRm5SU3hMUVVGb1JUdEJRVUZCTEVOQlFYUkNPenRCUVVWQkxFbEJRVTBzYTBKQlFXdENMRk5CUVd4Q0xHVkJRV3RDTEVOQlFVTXNTMEZCUkN4RlFVRlJMRU5CUVZJc1JVRkJZenRCUVVGQkxFdEJRemRDTEV0QlJEWkNMRWRCUXl0Q0xFdEJSQzlDTEVOQlF6ZENMRXRCUkRaQ08wRkJRVUVzUzBGRGRFSXNVMEZFYzBJc1IwRkRLMElzUzBGRUwwSXNRMEZEZEVJc1UwRkVjMEk3UVVGQlFTeExRVU5ZTEZGQlJGY3NSMEZESzBJc1MwRkVMMElzUTBGRFdDeFJRVVJYTzBGQlFVRXNTMEZEUkN4TlFVUkRMRWRCUXl0Q0xFdEJSQzlDTEVOQlEwUXNUVUZFUXp0QlFVRkJMRXRCUTA4c1YwRkVVQ3hIUVVNclFpeExRVVF2UWl4RFFVTlBMRmRCUkZBN1FVRkJRU3hMUVVOdlFpeE5RVVJ3UWl4SFFVTXJRaXhMUVVRdlFpeERRVU52UWl4TlFVUndRanM3TzBGQlIzSkRMRXRCUVUwc1dVRkJXU3hQUVVGUExFMUJRVkFzUjBGRGFrSXNUMEZCVHl4SFFVRlFMRU5CUVZjN1FVRkJRU3hUUVVGVExHTkJRV01zUzBGQlpDeERRVUZVTzBGQlFVRXNSVUZCV0N4RlFVRXdReXhKUVVFeFF5eERRVUVyUXl4RlFVRXZReXhEUVVScFFpeEhRVU52UXl4RlFVUjBSRHM3UVVGSFFTeDNUa0ZMZVVNc1MwRk1la01zY1VoQlQydEVMRk5CVUd4RUxHOUlRVk5wUkN4UlFWUnFSQ3d3U2tGaGIwUXNRMEZpY0VRc2QwSkJZMDhzVTBGa1VDd3JSMEZuUW5sRExGZEJhRUo2UXl3d1JFRnBRbTlETEUxQmFrSndRenRCUVRSQ1FTeERRV3hEUkRzN2EwSkJiME5sTEdVN096czdPenM3T3pzN1FVTjBRMlk3T3pzN1FVRkRRVHM3T3pzN08xRkJSVk1zWlN4SFFVRkJMR2xDTzFGQlFXbENMRmNzUjBGQlFTeGxPenM3T3pzN096dEJRMGd4UWl4SlFVRk5MRzF0UWtGQlRqczdRVUZwUWtFc1NVRkJUU3hqUVVGakxGTkJRV1FzVjBGQll5eEhRVUZOTzBGQlEzcENMRXRCUVVrc1YwRkJWeXhUUVVGVExHTkJRVlFzUTBGQmQwSXNVVUZCZUVJc1EwRkJaanRCUVVOQkxGVkJRVk1zVTBGQlZDeEhRVUZ4UWl4UlFVRnlRanRCUVVOQkxFTkJTRVE3TzJ0Q1FVdGxMRmM3T3pzN096czdPenM3UVVOMFFtWTdPMEZCUlVFc1NVRkJUU3hYUVVGWExGTkJRVmdzVVVGQlZ5eERRVUZETEVWQlFVUXNSVUZCU3l4SlFVRk1MRVZCUVdNN1FVRkROMElzUzBGQlNTeG5Ra0ZCU2pzN1FVRkZRU3hSUVVGUExGbEJRVmM3UVVGQlFUdEJRVUZCT3p0QlFVTm9RaXhOUVVGTkxHVkJRV1VzVTBGQlppeFpRVUZsTzBGQlFVRXNWVUZCVFN4SFFVRkhMRXRCUVVnc1EwRkJVeXhMUVVGVUxFVkJRV1VzVlVGQlppeERRVUZPTzBGQlFVRXNSMEZCY2tJN08wRkJSVUVzWlVGQllTeFBRVUZpTzBGQlEwRXNXVUZCVlN4WFFVRlhMRmxCUVZnc1JVRkJlVUlzU1VGQmVrSXNRMEZCVmp0QlFVTkVMRVZCVEVRN1FVRk5SQ3hEUVZSRU96dEJRVmRCTEVsQlFVMHNZMEZCWXl4VFFVRmtMRmRCUVdNc1IwRkJUVHRCUVVONlFpeHhRa0ZCVXl4UFFVRlVMRU5CUVdsQ08wRkJRVUVzVTBGQlVTeExRVUZMTEZOQlFVd3NRMEZCWlN4SFFVRm1MRU5CUVcxQ0xFOUJRVzVDTEVOQlFWSTdRVUZCUVN4RlFVRnFRanRCUVVOQkxHbENRVUZMTEZOQlFVd3NRMEZCWlN4SFFVRm1MRU5CUVcxQ0xFOUJRVzVDTzBGQlEwRXNRMEZJUkRzN1FVRkxRU3hKUVVGTkxHTkJRV01zVTBGQlpDeFhRVUZqTEVkQlFVMDdRVUZEZWtJc1MwRkJTU3hOUVVGTkxGTkJRVk1zWTBGQlZDeERRVUYzUWl4bFFVRjRRaXhEUVVGV08wRkJRMEVzUzBGQlNTeGpRVUZLTEVOQlFXMUNMRVZCUVVNc1ZVRkJWU3hSUVVGWUxFVkJRWEZDTEU5QlFVOHNUMEZCTlVJc1JVRkJia0k3UVVGRFFTeERRVWhFT3p0QlFVdEJMRWxCUVUwc1lVRkJZU3hUUVVGaUxGVkJRV0VzUTBGQlF5eFBRVUZFTEVWQlFXRTdRVUZETDBJc1MwRkJUU3hoUVVGaExGRkJRVkVzWVVGQlVpeERRVUZ6UWl4aFFVRjBRaXhEUVVGdlF5eGhRVUZ3UXl4RFFVRnVRanRCUVVOQkxFdEJRVTBzWVVGQllTeFJRVUZSTEdGQlFWSXNRMEZCYzBJc1lVRkJkRUlzUTBGQmIwTXNZVUZCY0VNc1EwRkJia0k3TzBGQlJVRXNTMEZCU1N4VlFVRlZMRkZCUVZFc2FVSkJRWFJDTzBGQlEwRXNXVUZCVnl4blFrRkJXQ3hEUVVFMFFpeFBRVUUxUWl4RlFVRnhReXhaUVVGTk8wRkJRekZETEUxQlFVMHNUMEZCVHl4UlFVRlJMR3RDUVVGeVFqdEJRVU5CTEUxQlFVa3NTVUZCU2l4RlFVRlZPMEZCUTFRc1VVRkJTeXhqUVVGTUxFTkJRVzlDTEVWQlFVTXNWVUZCVlN4UlFVRllMRVZCUVhGQ0xFOUJRVThzVTBGQk5VSXNSVUZCZFVNc1VVRkJVU3hSUVVFdlF5eEZRVUZ3UWp0QlFVTkJMR0ZCUVZVc1NVRkJWanRCUVVOQk8wRkJRMFFzUlVGT1JEczdRVUZSUVN4WlFVRlhMR2RDUVVGWUxFTkJRVFJDTEU5QlFUVkNMRVZCUVhGRExGbEJRVTA3UVVGRE1VTXNUVUZCVFN4UFFVRlBMRkZCUVZFc2MwSkJRWEpDTzBGQlEwRXNUVUZCU1N4SlFVRktMRVZCUVZVN1FVRkRWQ3hSUVVGTExHTkJRVXdzUTBGQmIwSXNSVUZCUXl4VlFVRlZMRkZCUVZnc1JVRkJjVUlzVDBGQlR5eFRRVUUxUWl4RlFVRjFReXhSUVVGUkxGRkJRUzlETEVWQlFYQkNPMEZCUTBFc1lVRkJWU3hKUVVGV08wRkJRMEU3UVVGRFJDeEZRVTVFTzBGQlQwRXNRMEZ3UWtRN08xRkJjMEpUTEZFc1IwRkJRU3hSTzFGQlFWVXNWeXhIUVVGQkxGYzdVVUZCWVN4WExFZEJRVUVzVnp0UlFVRmhMRlVzUjBGQlFTeFZJaXdpWm1sc1pTSTZJbWRsYm1WeVlYUmxaQzVxY3lJc0luTnZkWEpqWlZKdmIzUWlPaUlpTENKemIzVnlZMlZ6UTI5dWRHVnVkQ0k2V3lJb1puVnVZM1JwYjI0b0tYdG1kVzVqZEdsdmJpQnlLR1VzYml4MEtYdG1kVzVqZEdsdmJpQnZLR2tzWmlsN2FXWW9JVzViYVYwcGUybG1LQ0ZsVzJsZEtYdDJZWElnWXoxY0ltWjFibU4wYVc5dVhDSTlQWFI1Y0dWdlppQnlaWEYxYVhKbEppWnlaWEYxYVhKbE8ybG1LQ0ZtSmlaaktYSmxkSFZ5YmlCaktHa3NJVEFwTzJsbUtIVXBjbVYwZFhKdUlIVW9hU3doTUNrN2RtRnlJR0U5Ym1WM0lFVnljbTl5S0Z3aVEyRnVibTkwSUdacGJtUWdiVzlrZFd4bElDZGNJaXRwSzF3aUoxd2lLVHQwYUhKdmR5QmhMbU52WkdVOVhDSk5UMFJWVEVWZlRrOVVYMFpQVlU1RVhDSXNZWDEyWVhJZ2NEMXVXMmxkUFh0bGVIQnZjblJ6T250OWZUdGxXMmxkV3pCZExtTmhiR3dvY0M1bGVIQnZjblJ6TEdaMWJtTjBhVzl1S0hJcGUzWmhjaUJ1UFdWYmFWMWJNVjFiY2wwN2NtVjBkWEp1SUc4b2JueDhjaWw5TEhBc2NDNWxlSEJ2Y25SekxISXNaU3h1TEhRcGZYSmxkSFZ5YmlCdVcybGRMbVY0Y0c5eWRITjlabTl5S0haaGNpQjFQVndpWm5WdVkzUnBiMjVjSWowOWRIbHdaVzltSUhKbGNYVnBjbVVtSm5KbGNYVnBjbVVzYVQwd08yazhkQzVzWlc1bmRHZzdhU3NyS1c4b2RGdHBYU2s3Y21WMGRYSnVJRzk5Y21WMGRYSnVJSEo5S1NncElpd2lMeW9nYzIxdmIzUm9jMk55YjJ4c0lIWXdMalF1TUNBdElESXdNVGdnTFNCRWRYTjBZVzRnUzJGemRHVnVMQ0JLWlhKbGJXbGhjeUJOWlc1cFkyaGxiR3hwSUMwZ1RVbFVJRXhwWTJWdWMyVWdLaTljYmlobWRXNWpkR2x2YmlBb0tTQjdYRzRnSUNkMWMyVWdjM1J5YVdOMEp6dGNibHh1SUNBdkx5QndiMng1Wm1sc2JGeHVJQ0JtZFc1amRHbHZiaUJ3YjJ4NVptbHNiQ2dwSUh0Y2JpQWdJQ0F2THlCaGJHbGhjMlZ6WEc0Z0lDQWdkbUZ5SUhjZ1BTQjNhVzVrYjNjN1hHNGdJQ0FnZG1GeUlHUWdQU0JrYjJOMWJXVnVkRHRjYmx4dUlDQWdJQzh2SUhKbGRIVnliaUJwWmlCelkzSnZiR3dnWW1Wb1lYWnBiM0lnYVhNZ2MzVndjRzl5ZEdWa0lHRnVaQ0J3YjJ4NVptbHNiQ0JwY3lCdWIzUWdabTl5WTJWa1hHNGdJQ0FnYVdZZ0tGeHVJQ0FnSUNBZ0ozTmpjbTlzYkVKbGFHRjJhVzl5SnlCcGJpQmtMbVJ2WTNWdFpXNTBSV3hsYldWdWRDNXpkSGxzWlNBbUpseHVJQ0FnSUNBZ2R5NWZYMlp2Y21ObFUyMXZiM1JvVTJOeWIyeHNVRzlzZVdacGJHeGZYeUFoUFQwZ2RISjFaVnh1SUNBZ0lDa2dlMXh1SUNBZ0lDQWdjbVYwZFhKdU8xeHVJQ0FnSUgxY2JseHVJQ0FnSUM4dklHZHNiMkpoYkhOY2JpQWdJQ0IyWVhJZ1JXeGxiV1Z1ZENBOUlIY3VTRlJOVEVWc1pXMWxiblFnZkh3Z2R5NUZiR1Z0Wlc1ME8xeHVJQ0FnSUhaaGNpQlRRMUpQVEV4ZlZFbE5SU0E5SURRMk9EdGNibHh1SUNBZ0lDOHZJRzlpYW1WamRDQm5ZWFJvWlhKcGJtY2diM0pwWjJsdVlXd2djMk55YjJ4c0lHMWxkR2h2WkhOY2JpQWdJQ0IyWVhJZ2IzSnBaMmx1WVd3Z1BTQjdYRzRnSUNBZ0lDQnpZM0p2Ykd3NklIY3VjMk55YjJ4c0lIeDhJSGN1YzJOeWIyeHNWRzhzWEc0Z0lDQWdJQ0J6WTNKdmJHeENlVG9nZHk1elkzSnZiR3hDZVN4Y2JpQWdJQ0FnSUdWc1pXMWxiblJUWTNKdmJHdzZJRVZzWlcxbGJuUXVjSEp2ZEc5MGVYQmxMbk5qY205c2JDQjhmQ0J6WTNKdmJHeEZiR1Z0Wlc1MExGeHVJQ0FnSUNBZ2MyTnliMnhzU1c1MGIxWnBaWGM2SUVWc1pXMWxiblF1Y0hKdmRHOTBlWEJsTG5OamNtOXNiRWx1ZEc5V2FXVjNYRzRnSUNBZ2ZUdGNibHh1SUNBZ0lDOHZJR1JsWm1sdVpTQjBhVzFwYm1jZ2JXVjBhRzlrWEc0Z0lDQWdkbUZ5SUc1dmR5QTlYRzRnSUNBZ0lDQjNMbkJsY21admNtMWhibU5sSUNZbUlIY3VjR1Z5Wm05eWJXRnVZMlV1Ym05M1hHNGdJQ0FnSUNBZ0lEOGdkeTV3WlhKbWIzSnRZVzVqWlM1dWIzY3VZbWx1WkNoM0xuQmxjbVp2Y20xaGJtTmxLVnh1SUNBZ0lDQWdJQ0E2SUVSaGRHVXVibTkzTzF4dVhHNGdJQ0FnTHlvcVhHNGdJQ0FnSUNvZ2FXNWthV05oZEdWeklHbG1JR0VnZEdobElHTjFjbkpsYm5RZ1luSnZkM05sY2lCcGN5QnRZV1JsSUdKNUlFMXBZM0p2YzI5bWRGeHVJQ0FnSUNBcUlFQnRaWFJvYjJRZ2FYTk5hV055YjNOdlpuUkNjbTkzYzJWeVhHNGdJQ0FnSUNvZ1FIQmhjbUZ0SUh0VGRISnBibWQ5SUhWelpYSkJaMlZ1ZEZ4dUlDQWdJQ0FxSUVCeVpYUjFjbTV6SUh0Q2IyOXNaV0Z1ZlZ4dUlDQWdJQ0FxTDF4dUlDQWdJR1oxYm1OMGFXOXVJR2x6VFdsamNtOXpiMlowUW5KdmQzTmxjaWgxYzJWeVFXZGxiblFwSUh0Y2JpQWdJQ0FnSUhaaGNpQjFjMlZ5UVdkbGJuUlFZWFIwWlhKdWN5QTlJRnNuVFZOSlJTQW5MQ0FuVkhKcFpHVnVkQzhuTENBblJXUm5aUzhuWFR0Y2JseHVJQ0FnSUNBZ2NtVjBkWEp1SUc1bGR5QlNaV2RGZUhBb2RYTmxja0ZuWlc1MFVHRjBkR1Z5Ym5NdWFtOXBiaWduZkNjcEtTNTBaWE4wS0hWelpYSkJaMlZ1ZENrN1hHNGdJQ0FnZlZ4dVhHNGdJQ0FnTHlwY2JpQWdJQ0FnS2lCSlJTQm9ZWE1nY205MWJtUnBibWNnWW5WbklISnZkVzVrYVc1bklHUnZkMjRnWTJ4cFpXNTBTR1ZwWjJoMElHRnVaQ0JqYkdsbGJuUlhhV1IwYUNCaGJtUmNiaUFnSUNBZ0tpQnliM1Z1WkdsdVp5QjFjQ0J6WTNKdmJHeElaV2xuYUhRZ1lXNWtJSE5qY205c2JGZHBaSFJvSUdOaGRYTnBibWNnWm1Gc2MyVWdjRzl6YVhScGRtVnpYRzRnSUNBZ0lDb2diMjRnYUdGelUyTnliMnhzWVdKc1pWTndZV05sWEc0Z0lDQWdJQ292WEc0Z0lDQWdkbUZ5SUZKUFZVNUVTVTVIWDFSUFRFVlNRVTVEUlNBOUlHbHpUV2xqY205emIyWjBRbkp2ZDNObGNpaDNMbTVoZG1sbllYUnZjaTUxYzJWeVFXZGxiblFwSUQ4Z01TQTZJREE3WEc1Y2JpQWdJQ0F2S2lwY2JpQWdJQ0FnS2lCamFHRnVaMlZ6SUhOamNtOXNiQ0J3YjNOcGRHbHZiaUJwYm5OcFpHVWdZVzRnWld4bGJXVnVkRnh1SUNBZ0lDQXFJRUJ0WlhSb2IyUWdjMk55YjJ4c1JXeGxiV1Z1ZEZ4dUlDQWdJQ0FxSUVCd1lYSmhiU0I3VG5WdFltVnlmU0I0WEc0Z0lDQWdJQ29nUUhCaGNtRnRJSHRPZFcxaVpYSjlJSGxjYmlBZ0lDQWdLaUJBY21WMGRYSnVjeUI3ZFc1a1pXWnBibVZrZlZ4dUlDQWdJQ0FxTDF4dUlDQWdJR1oxYm1OMGFXOXVJSE5qY205c2JFVnNaVzFsYm5Rb2VDd2dlU2tnZTF4dUlDQWdJQ0FnZEdocGN5NXpZM0p2Ykd4TVpXWjBJRDBnZUR0Y2JpQWdJQ0FnSUhSb2FYTXVjMk55YjJ4c1ZHOXdJRDBnZVR0Y2JpQWdJQ0I5WEc1Y2JpQWdJQ0F2S2lwY2JpQWdJQ0FnS2lCeVpYUjFjbTV6SUhKbGMzVnNkQ0J2WmlCaGNIQnNlV2x1WnlCbFlYTmxJRzFoZEdnZ1puVnVZM1JwYjI0Z2RHOGdZU0J1ZFcxaVpYSmNiaUFnSUNBZ0tpQkFiV1YwYUc5a0lHVmhjMlZjYmlBZ0lDQWdLaUJBY0dGeVlXMGdlMDUxYldKbGNuMGdhMXh1SUNBZ0lDQXFJRUJ5WlhSMWNtNXpJSHRPZFcxaVpYSjlYRzRnSUNBZ0lDb3ZYRzRnSUNBZ1puVnVZM1JwYjI0Z1pXRnpaU2hyS1NCN1hHNGdJQ0FnSUNCeVpYUjFjbTRnTUM0MUlDb2dLREVnTFNCTllYUm9MbU52Y3loTllYUm9MbEJKSUNvZ2F5a3BPMXh1SUNBZ0lIMWNibHh1SUNBZ0lDOHFLbHh1SUNBZ0lDQXFJR2x1WkdsallYUmxjeUJwWmlCaElITnRiMjkwYUNCaVpXaGhkbWx2Y2lCemFHOTFiR1FnWW1VZ1lYQndiR2xsWkZ4dUlDQWdJQ0FxSUVCdFpYUm9iMlFnYzJodmRXeGtRbUZwYkU5MWRGeHVJQ0FnSUNBcUlFQndZWEpoYlNCN1RuVnRZbVZ5ZkU5aWFtVmpkSDBnWm1seWMzUkJjbWRjYmlBZ0lDQWdLaUJBY21WMGRYSnVjeUI3UW05dmJHVmhibjFjYmlBZ0lDQWdLaTljYmlBZ0lDQm1kVzVqZEdsdmJpQnphRzkxYkdSQ1lXbHNUM1YwS0dacGNuTjBRWEpuS1NCN1hHNGdJQ0FnSUNCcFppQW9YRzRnSUNBZ0lDQWdJR1pwY25OMFFYSm5JRDA5UFNCdWRXeHNJSHg4WEc0Z0lDQWdJQ0FnSUhSNWNHVnZaaUJtYVhKemRFRnlaeUFoUFQwZ0oyOWlhbVZqZENjZ2ZIeGNiaUFnSUNBZ0lDQWdabWx5YzNSQmNtY3VZbVZvWVhacGIzSWdQVDA5SUhWdVpHVm1hVzVsWkNCOGZGeHVJQ0FnSUNBZ0lDQm1hWEp6ZEVGeVp5NWlaV2hoZG1sdmNpQTlQVDBnSjJGMWRHOG5JSHg4WEc0Z0lDQWdJQ0FnSUdacGNuTjBRWEpuTG1KbGFHRjJhVzl5SUQwOVBTQW5hVzV6ZEdGdWRDZGNiaUFnSUNBZ0lDa2dlMXh1SUNBZ0lDQWdJQ0F2THlCbWFYSnpkQ0JoY21kMWJXVnVkQ0JwY3lCdWIzUWdZVzRnYjJKcVpXTjBMMjUxYkd4Y2JpQWdJQ0FnSUNBZ0x5OGdiM0lnWW1Wb1lYWnBiM0lnYVhNZ1lYVjBieXdnYVc1emRHRnVkQ0J2Y2lCMWJtUmxabWx1WldSY2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUhSeWRXVTdYRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJR2xtSUNoMGVYQmxiMllnWm1seWMzUkJjbWNnUFQwOUlDZHZZbXBsWTNRbklDWW1JR1pwY25OMFFYSm5MbUpsYUdGMmFXOXlJRDA5UFNBbmMyMXZiM1JvSnlrZ2UxeHVJQ0FnSUNBZ0lDQXZMeUJtYVhKemRDQmhjbWQxYldWdWRDQnBjeUJoYmlCdlltcGxZM1FnWVc1a0lHSmxhR0YyYVc5eUlHbHpJSE50YjI5MGFGeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z1ptRnNjMlU3WEc0Z0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUM4dklIUm9jbTkzSUdWeWNtOXlJSGRvWlc0Z1ltVm9ZWFpwYjNJZ2FYTWdibTkwSUhOMWNIQnZjblJsWkZ4dUlDQWdJQ0FnZEdoeWIzY2dibVYzSUZSNWNHVkZjbkp2Y2loY2JpQWdJQ0FnSUNBZ0oySmxhR0YyYVc5eUlHMWxiV0psY2lCdlppQlRZM0p2Ykd4UGNIUnBiMjV6SUNjZ0sxeHVJQ0FnSUNBZ0lDQWdJR1pwY25OMFFYSm5MbUpsYUdGMmFXOXlJQ3RjYmlBZ0lDQWdJQ0FnSUNBbklHbHpJRzV2ZENCaElIWmhiR2xrSUhaaGJIVmxJR1p2Y2lCbGJuVnRaWEpoZEdsdmJpQlRZM0p2Ykd4Q1pXaGhkbWx2Y2k0blhHNGdJQ0FnSUNBcE8xeHVJQ0FnSUgxY2JseHVJQ0FnSUM4cUtseHVJQ0FnSUNBcUlHbHVaR2xqWVhSbGN5QnBaaUJoYmlCbGJHVnRaVzUwSUdoaGN5QnpZM0p2Ykd4aFlteGxJSE53WVdObElHbHVJSFJvWlNCd2NtOTJhV1JsWkNCaGVHbHpYRzRnSUNBZ0lDb2dRRzFsZEdodlpDQm9ZWE5UWTNKdmJHeGhZbXhsVTNCaFkyVmNiaUFnSUNBZ0tpQkFjR0Z5WVcwZ2UwNXZaR1Y5SUdWc1hHNGdJQ0FnSUNvZ1FIQmhjbUZ0SUh0VGRISnBibWQ5SUdGNGFYTmNiaUFnSUNBZ0tpQkFjbVYwZFhKdWN5QjdRbTl2YkdWaGJuMWNiaUFnSUNBZ0tpOWNiaUFnSUNCbWRXNWpkR2x2YmlCb1lYTlRZM0p2Ykd4aFlteGxVM0JoWTJVb1pXd3NJR0Y0YVhNcElIdGNiaUFnSUNBZ0lHbG1JQ2hoZUdseklEMDlQU0FuV1NjcElIdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlHVnNMbU5zYVdWdWRFaGxhV2RvZENBcklGSlBWVTVFU1U1SFgxUlBURVZTUVU1RFJTQThJR1ZzTG5OamNtOXNiRWhsYVdkb2REdGNiaUFnSUNBZ0lIMWNibHh1SUNBZ0lDQWdhV1lnS0dGNGFYTWdQVDA5SUNkWUp5a2dlMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdaV3d1WTJ4cFpXNTBWMmxrZEdnZ0t5QlNUMVZPUkVsT1IxOVVUMHhGVWtGT1EwVWdQQ0JsYkM1elkzSnZiR3hYYVdSMGFEdGNiaUFnSUNBZ0lIMWNiaUFnSUNCOVhHNWNiaUFnSUNBdktpcGNiaUFnSUNBZ0tpQnBibVJwWTJGMFpYTWdhV1lnWVc0Z1pXeGxiV1Z1ZENCb1lYTWdZU0J6WTNKdmJHeGhZbXhsSUc5MlpYSm1iRzkzSUhCeWIzQmxjblI1SUdsdUlIUm9aU0JoZUdselhHNGdJQ0FnSUNvZ1FHMWxkR2h2WkNCallXNVBkbVZ5Wm14dmQxeHVJQ0FnSUNBcUlFQndZWEpoYlNCN1RtOWtaWDBnWld4Y2JpQWdJQ0FnS2lCQWNHRnlZVzBnZTFOMGNtbHVaMzBnWVhocGMxeHVJQ0FnSUNBcUlFQnlaWFIxY201eklIdENiMjlzWldGdWZWeHVJQ0FnSUNBcUwxeHVJQ0FnSUdaMWJtTjBhVzl1SUdOaGJrOTJaWEptYkc5M0tHVnNMQ0JoZUdsektTQjdYRzRnSUNBZ0lDQjJZWElnYjNabGNtWnNiM2RXWVd4MVpTQTlJSGN1WjJWMFEyOXRjSFYwWldSVGRIbHNaU2hsYkN3Z2JuVnNiQ2xiSjI5MlpYSm1iRzkzSnlBcklHRjRhWE5kTzF4dVhHNGdJQ0FnSUNCeVpYUjFjbTRnYjNabGNtWnNiM2RXWVd4MVpTQTlQVDBnSjJGMWRHOG5JSHg4SUc5MlpYSm1iRzkzVm1Gc2RXVWdQVDA5SUNkelkzSnZiR3duTzF4dUlDQWdJSDFjYmx4dUlDQWdJQzhxS2x4dUlDQWdJQ0FxSUdsdVpHbGpZWFJsY3lCcFppQmhiaUJsYkdWdFpXNTBJR05oYmlCaVpTQnpZM0p2Ykd4bFpDQnBiaUJsYVhSb1pYSWdZWGhwYzF4dUlDQWdJQ0FxSUVCdFpYUm9iMlFnYVhOVFkzSnZiR3hoWW14bFhHNGdJQ0FnSUNvZ1FIQmhjbUZ0SUh0T2IyUmxmU0JsYkZ4dUlDQWdJQ0FxSUVCd1lYSmhiU0I3VTNSeWFXNW5mU0JoZUdselhHNGdJQ0FnSUNvZ1FISmxkSFZ5Ym5NZ2UwSnZiMnhsWVc1OVhHNGdJQ0FnSUNvdlhHNGdJQ0FnWm5WdVkzUnBiMjRnYVhOVFkzSnZiR3hoWW14bEtHVnNLU0I3WEc0Z0lDQWdJQ0IyWVhJZ2FYTlRZM0p2Ykd4aFlteGxXU0E5SUdoaGMxTmpjbTlzYkdGaWJHVlRjR0ZqWlNobGJDd2dKMWtuS1NBbUppQmpZVzVQZG1WeVpteHZkeWhsYkN3Z0oxa25LVHRjYmlBZ0lDQWdJSFpoY2lCcGMxTmpjbTlzYkdGaWJHVllJRDBnYUdGelUyTnliMnhzWVdKc1pWTndZV05sS0dWc0xDQW5XQ2NwSUNZbUlHTmhiazkyWlhKbWJHOTNLR1ZzTENBbldDY3BPMXh1WEc0Z0lDQWdJQ0J5WlhSMWNtNGdhWE5UWTNKdmJHeGhZbXhsV1NCOGZDQnBjMU5qY205c2JHRmliR1ZZTzF4dUlDQWdJSDFjYmx4dUlDQWdJQzhxS2x4dUlDQWdJQ0FxSUdacGJtUnpJSE5qY205c2JHRmliR1VnY0dGeVpXNTBJRzltSUdGdUlHVnNaVzFsYm5SY2JpQWdJQ0FnS2lCQWJXVjBhRzlrSUdacGJtUlRZM0p2Ykd4aFlteGxVR0Z5Wlc1MFhHNGdJQ0FnSUNvZ1FIQmhjbUZ0SUh0T2IyUmxmU0JsYkZ4dUlDQWdJQ0FxSUVCeVpYUjFjbTV6SUh0T2IyUmxmU0JsYkZ4dUlDQWdJQ0FxTDF4dUlDQWdJR1oxYm1OMGFXOXVJR1pwYm1SVFkzSnZiR3hoWW14bFVHRnlaVzUwS0dWc0tTQjdYRzRnSUNBZ0lDQjJZWElnYVhOQ2IyUjVPMXh1WEc0Z0lDQWdJQ0JrYnlCN1hHNGdJQ0FnSUNBZ0lHVnNJRDBnWld3dWNHRnlaVzUwVG05a1pUdGNibHh1SUNBZ0lDQWdJQ0JwYzBKdlpIa2dQU0JsYkNBOVBUMGdaQzVpYjJSNU8xeHVJQ0FnSUNBZ2ZTQjNhR2xzWlNBb2FYTkNiMlI1SUQwOVBTQm1ZV3h6WlNBbUppQnBjMU5qY205c2JHRmliR1VvWld3cElEMDlQU0JtWVd4elpTazdYRzVjYmlBZ0lDQWdJR2x6UW05a2VTQTlJRzUxYkd3N1hHNWNiaUFnSUNBZ0lISmxkSFZ5YmlCbGJEdGNiaUFnSUNCOVhHNWNiaUFnSUNBdktpcGNiaUFnSUNBZ0tpQnpaV3htSUdsdWRtOXJaV1FnWm5WdVkzUnBiMjRnZEdoaGRDd2daMmwyWlc0Z1lTQmpiMjUwWlhoMExDQnpkR1Z3Y3lCMGFISnZkV2RvSUhOamNtOXNiR2x1WjF4dUlDQWdJQ0FxSUVCdFpYUm9iMlFnYzNSbGNGeHVJQ0FnSUNBcUlFQndZWEpoYlNCN1QySnFaV04wZlNCamIyNTBaWGgwWEc0Z0lDQWdJQ29nUUhKbGRIVnlibk1nZTNWdVpHVm1hVzVsWkgxY2JpQWdJQ0FnS2k5Y2JpQWdJQ0JtZFc1amRHbHZiaUJ6ZEdWd0tHTnZiblJsZUhRcElIdGNiaUFnSUNBZ0lIWmhjaUIwYVcxbElEMGdibTkzS0NrN1hHNGdJQ0FnSUNCMllYSWdkbUZzZFdVN1hHNGdJQ0FnSUNCMllYSWdZM1Z5Y21WdWRGZzdYRzRnSUNBZ0lDQjJZWElnWTNWeWNtVnVkRms3WEc0Z0lDQWdJQ0IyWVhJZ1pXeGhjSE5sWkNBOUlDaDBhVzFsSUMwZ1kyOXVkR1Y0ZEM1emRHRnlkRlJwYldVcElDOGdVME5TVDB4TVgxUkpUVVU3WEc1Y2JpQWdJQ0FnSUM4dklHRjJiMmxrSUdWc1lYQnpaV1FnZEdsdFpYTWdhR2xuYUdWeUlIUm9ZVzRnYjI1bFhHNGdJQ0FnSUNCbGJHRndjMlZrSUQwZ1pXeGhjSE5sWkNBK0lERWdQeUF4SURvZ1pXeGhjSE5sWkR0Y2JseHVJQ0FnSUNBZ0x5OGdZWEJ3YkhrZ1pXRnphVzVuSUhSdklHVnNZWEJ6WldRZ2RHbHRaVnh1SUNBZ0lDQWdkbUZzZFdVZ1BTQmxZWE5sS0dWc1lYQnpaV1FwTzF4dVhHNGdJQ0FnSUNCamRYSnlaVzUwV0NBOUlHTnZiblJsZUhRdWMzUmhjblJZSUNzZ0tHTnZiblJsZUhRdWVDQXRJR052Ym5SbGVIUXVjM1JoY25SWUtTQXFJSFpoYkhWbE8xeHVJQ0FnSUNBZ1kzVnljbVZ1ZEZrZ1BTQmpiMjUwWlhoMExuTjBZWEowV1NBcklDaGpiMjUwWlhoMExua2dMU0JqYjI1MFpYaDBMbk4wWVhKMFdTa2dLaUIyWVd4MVpUdGNibHh1SUNBZ0lDQWdZMjl1ZEdWNGRDNXRaWFJvYjJRdVkyRnNiQ2hqYjI1MFpYaDBMbk5qY205c2JHRmliR1VzSUdOMWNuSmxiblJZTENCamRYSnlaVzUwV1NrN1hHNWNiaUFnSUNBZ0lDOHZJSE5qY205c2JDQnRiM0psSUdsbUlIZGxJR2hoZG1VZ2JtOTBJSEpsWVdOb1pXUWdiM1Z5SUdSbGMzUnBibUYwYVc5dVhHNGdJQ0FnSUNCcFppQW9ZM1Z5Y21WdWRGZ2dJVDA5SUdOdmJuUmxlSFF1ZUNCOGZDQmpkWEp5Wlc1MFdTQWhQVDBnWTI5dWRHVjRkQzU1S1NCN1hHNGdJQ0FnSUNBZ0lIY3VjbVZ4ZFdWemRFRnVhVzFoZEdsdmJrWnlZVzFsS0hOMFpYQXVZbWx1WkNoM0xDQmpiMjUwWlhoMEtTazdYRzRnSUNBZ0lDQjlYRzRnSUNBZ2ZWeHVYRzRnSUNBZ0x5b3FYRzRnSUNBZ0lDb2djMk55YjJ4c2N5QjNhVzVrYjNjZ2IzSWdaV3hsYldWdWRDQjNhWFJvSUdFZ2MyMXZiM1JvSUdKbGFHRjJhVzl5WEc0Z0lDQWdJQ29nUUcxbGRHaHZaQ0J6Ylc5dmRHaFRZM0p2Ykd4Y2JpQWdJQ0FnS2lCQWNHRnlZVzBnZTA5aWFtVmpkSHhPYjJSbGZTQmxiRnh1SUNBZ0lDQXFJRUJ3WVhKaGJTQjdUblZ0WW1WeWZTQjRYRzRnSUNBZ0lDb2dRSEJoY21GdElIdE9kVzFpWlhKOUlIbGNiaUFnSUNBZ0tpQkFjbVYwZFhKdWN5QjdkVzVrWldacGJtVmtmVnh1SUNBZ0lDQXFMMXh1SUNBZ0lHWjFibU4wYVc5dUlITnRiMjkwYUZOamNtOXNiQ2hsYkN3Z2VDd2dlU2tnZTF4dUlDQWdJQ0FnZG1GeUlITmpjbTlzYkdGaWJHVTdYRzRnSUNBZ0lDQjJZWElnYzNSaGNuUllPMXh1SUNBZ0lDQWdkbUZ5SUhOMFlYSjBXVHRjYmlBZ0lDQWdJSFpoY2lCdFpYUm9iMlE3WEc0Z0lDQWdJQ0IyWVhJZ2MzUmhjblJVYVcxbElEMGdibTkzS0NrN1hHNWNiaUFnSUNBZ0lDOHZJR1JsWm1sdVpTQnpZM0p2Ykd3Z1kyOXVkR1Y0ZEZ4dUlDQWdJQ0FnYVdZZ0tHVnNJRDA5UFNCa0xtSnZaSGtwSUh0Y2JpQWdJQ0FnSUNBZ2MyTnliMnhzWVdKc1pTQTlJSGM3WEc0Z0lDQWdJQ0FnSUhOMFlYSjBXQ0E5SUhjdWMyTnliMnhzV0NCOGZDQjNMbkJoWjJWWVQyWm1jMlYwTzF4dUlDQWdJQ0FnSUNCemRHRnlkRmtnUFNCM0xuTmpjbTlzYkZrZ2ZId2dkeTV3WVdkbFdVOW1abk5sZER0Y2JpQWdJQ0FnSUNBZ2JXVjBhRzlrSUQwZ2IzSnBaMmx1WVd3dWMyTnliMnhzTzF4dUlDQWdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnYzJOeWIyeHNZV0pzWlNBOUlHVnNPMXh1SUNBZ0lDQWdJQ0J6ZEdGeWRGZ2dQU0JsYkM1elkzSnZiR3hNWldaME8xeHVJQ0FnSUNBZ0lDQnpkR0Z5ZEZrZ1BTQmxiQzV6WTNKdmJHeFViM0E3WEc0Z0lDQWdJQ0FnSUcxbGRHaHZaQ0E5SUhOamNtOXNiRVZzWlcxbGJuUTdYRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJQzh2SUhOamNtOXNiQ0JzYjI5d2FXNW5JRzkyWlhJZ1lTQm1jbUZ0WlZ4dUlDQWdJQ0FnYzNSbGNDaDdYRzRnSUNBZ0lDQWdJSE5qY205c2JHRmliR1U2SUhOamNtOXNiR0ZpYkdVc1hHNGdJQ0FnSUNBZ0lHMWxkR2h2WkRvZ2JXVjBhRzlrTEZ4dUlDQWdJQ0FnSUNCemRHRnlkRlJwYldVNklITjBZWEowVkdsdFpTeGNiaUFnSUNBZ0lDQWdjM1JoY25SWU9pQnpkR0Z5ZEZnc1hHNGdJQ0FnSUNBZ0lITjBZWEowV1RvZ2MzUmhjblJaTEZ4dUlDQWdJQ0FnSUNCNE9pQjRMRnh1SUNBZ0lDQWdJQ0I1T2lCNVhHNGdJQ0FnSUNCOUtUdGNiaUFnSUNCOVhHNWNiaUFnSUNBdkx5QlBVa2xIU1U1QlRDQk5SVlJJVDBSVElFOVdSVkpTU1VSRlUxeHVJQ0FnSUM4dklIY3VjMk55YjJ4c0lHRnVaQ0IzTG5OamNtOXNiRlJ2WEc0Z0lDQWdkeTV6WTNKdmJHd2dQU0IzTG5OamNtOXNiRlJ2SUQwZ1puVnVZM1JwYjI0b0tTQjdYRzRnSUNBZ0lDQXZMeUJoZG05cFpDQmhZM1JwYjI0Z2QyaGxiaUJ1YnlCaGNtZDFiV1Z1ZEhNZ1lYSmxJSEJoYzNObFpGeHVJQ0FnSUNBZ2FXWWdLR0Z5WjNWdFpXNTBjMXN3WFNBOVBUMGdkVzVrWldacGJtVmtLU0I3WEc0Z0lDQWdJQ0FnSUhKbGRIVnlianRjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnTHk4Z1lYWnZhV1FnYzIxdmIzUm9JR0psYUdGMmFXOXlJR2xtSUc1dmRDQnlaWEYxYVhKbFpGeHVJQ0FnSUNBZ2FXWWdLSE5vYjNWc1pFSmhhV3hQZFhRb1lYSm5kVzFsYm5Seld6QmRLU0E5UFQwZ2RISjFaU2tnZTF4dUlDQWdJQ0FnSUNCdmNtbG5hVzVoYkM1elkzSnZiR3d1WTJGc2JDaGNiaUFnSUNBZ0lDQWdJQ0IzTEZ4dUlDQWdJQ0FnSUNBZ0lHRnlaM1Z0Wlc1MGMxc3dYUzVzWldaMElDRTlQU0IxYm1SbFptbHVaV1JjYmlBZ0lDQWdJQ0FnSUNBZ0lEOGdZWEpuZFcxbGJuUnpXekJkTG14bFpuUmNiaUFnSUNBZ0lDQWdJQ0FnSURvZ2RIbHdaVzltSUdGeVozVnRaVzUwYzFzd1hTQWhQVDBnSjI5aWFtVmpkQ2RjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdQeUJoY21kMWJXVnVkSE5iTUYxY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnT2lCM0xuTmpjbTlzYkZnZ2ZId2dkeTV3WVdkbFdFOW1abk5sZEN4Y2JpQWdJQ0FnSUNBZ0lDQXZMeUIxYzJVZ2RHOXdJSEJ5YjNBc0lITmxZMjl1WkNCaGNtZDFiV1Z1ZENCcFppQndjbVZ6Wlc1MElHOXlJR1poYkd4aVlXTnJJSFJ2SUhOamNtOXNiRmxjYmlBZ0lDQWdJQ0FnSUNCaGNtZDFiV1Z1ZEhOYk1GMHVkRzl3SUNFOVBTQjFibVJsWm1sdVpXUmNiaUFnSUNBZ0lDQWdJQ0FnSUQ4Z1lYSm5kVzFsYm5Seld6QmRMblJ2Y0Z4dUlDQWdJQ0FnSUNBZ0lDQWdPaUJoY21kMWJXVnVkSE5iTVYwZ0lUMDlJSFZ1WkdWbWFXNWxaRnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQS9JR0Z5WjNWdFpXNTBjMXN4WFZ4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0E2SUhjdWMyTnliMnhzV1NCOGZDQjNMbkJoWjJWWlQyWm1jMlYwWEc0Z0lDQWdJQ0FnSUNrN1hHNWNiaUFnSUNBZ0lDQWdjbVYwZFhKdU8xeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQXZMeUJNUlZRZ1ZFaEZJRk5OVDA5VVNFNUZVMU1nUWtWSFNVNGhYRzRnSUNBZ0lDQnpiVzl2ZEdoVFkzSnZiR3d1WTJGc2JDaGNiaUFnSUNBZ0lDQWdkeXhjYmlBZ0lDQWdJQ0FnWkM1aWIyUjVMRnh1SUNBZ0lDQWdJQ0JoY21kMWJXVnVkSE5iTUYwdWJHVm1kQ0FoUFQwZ2RXNWtaV1pwYm1Wa1hHNGdJQ0FnSUNBZ0lDQWdQeUIrZm1GeVozVnRaVzUwYzFzd1hTNXNaV1owWEc0Z0lDQWdJQ0FnSUNBZ09pQjNMbk5qY205c2JGZ2dmSHdnZHk1d1lXZGxXRTltWm5ObGRDeGNiaUFnSUNBZ0lDQWdZWEpuZFcxbGJuUnpXekJkTG5SdmNDQWhQVDBnZFc1a1pXWnBibVZrWEc0Z0lDQWdJQ0FnSUNBZ1B5QitmbUZ5WjNWdFpXNTBjMXN3WFM1MGIzQmNiaUFnSUNBZ0lDQWdJQ0E2SUhjdWMyTnliMnhzV1NCOGZDQjNMbkJoWjJWWlQyWm1jMlYwWEc0Z0lDQWdJQ0FwTzF4dUlDQWdJSDA3WEc1Y2JpQWdJQ0F2THlCM0xuTmpjbTlzYkVKNVhHNGdJQ0FnZHk1elkzSnZiR3hDZVNBOUlHWjFibU4wYVc5dUtDa2dlMXh1SUNBZ0lDQWdMeThnWVhadmFXUWdZV04wYVc5dUlIZG9aVzRnYm04Z1lYSm5kVzFsYm5SeklHRnlaU0J3WVhOelpXUmNiaUFnSUNBZ0lHbG1JQ2hoY21kMWJXVnVkSE5iTUYwZ1BUMDlJSFZ1WkdWbWFXNWxaQ2tnZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTQ3WEc0Z0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUM4dklHRjJiMmxrSUhOdGIyOTBhQ0JpWldoaGRtbHZjaUJwWmlCdWIzUWdjbVZ4ZFdseVpXUmNiaUFnSUNBZ0lHbG1JQ2h6YUc5MWJHUkNZV2xzVDNWMEtHRnlaM1Z0Wlc1MGMxc3dYU2twSUh0Y2JpQWdJQ0FnSUNBZ2IzSnBaMmx1WVd3dWMyTnliMnhzUW5rdVkyRnNiQ2hjYmlBZ0lDQWdJQ0FnSUNCM0xGeHVJQ0FnSUNBZ0lDQWdJR0Z5WjNWdFpXNTBjMXN3WFM1c1pXWjBJQ0U5UFNCMWJtUmxabWx1WldSY2JpQWdJQ0FnSUNBZ0lDQWdJRDhnWVhKbmRXMWxiblJ6V3pCZExteGxablJjYmlBZ0lDQWdJQ0FnSUNBZ0lEb2dkSGx3Wlc5bUlHRnlaM1Z0Wlc1MGMxc3dYU0FoUFQwZ0oyOWlhbVZqZENjZ1B5QmhjbWQxYldWdWRITmJNRjBnT2lBd0xGeHVJQ0FnSUNBZ0lDQWdJR0Z5WjNWdFpXNTBjMXN3WFM1MGIzQWdJVDA5SUhWdVpHVm1hVzVsWkZ4dUlDQWdJQ0FnSUNBZ0lDQWdQeUJoY21kMWJXVnVkSE5iTUYwdWRHOXdYRzRnSUNBZ0lDQWdJQ0FnSUNBNklHRnlaM1Z0Wlc1MGMxc3hYU0FoUFQwZ2RXNWtaV1pwYm1Wa0lEOGdZWEpuZFcxbGJuUnpXekZkSURvZ01GeHVJQ0FnSUNBZ0lDQXBPMXh1WEc0Z0lDQWdJQ0FnSUhKbGRIVnlianRjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnTHk4Z1RFVlVJRlJJUlNCVFRVOVBWRWhPUlZOVElFSkZSMGxPSVZ4dUlDQWdJQ0FnYzIxdmIzUm9VMk55YjJ4c0xtTmhiR3dvWEc0Z0lDQWdJQ0FnSUhjc1hHNGdJQ0FnSUNBZ0lHUXVZbTlrZVN4Y2JpQWdJQ0FnSUNBZ2ZuNWhjbWQxYldWdWRITmJNRjB1YkdWbWRDQXJJQ2gzTG5OamNtOXNiRmdnZkh3Z2R5NXdZV2RsV0U5bVpuTmxkQ2tzWEc0Z0lDQWdJQ0FnSUg1K1lYSm5kVzFsYm5Seld6QmRMblJ2Y0NBcklDaDNMbk5qY205c2JGa2dmSHdnZHk1d1lXZGxXVTltWm5ObGRDbGNiaUFnSUNBZ0lDazdYRzRnSUNBZ2ZUdGNibHh1SUNBZ0lDOHZJRVZzWlcxbGJuUXVjSEp2ZEc5MGVYQmxMbk5qY205c2JDQmhibVFnUld4bGJXVnVkQzV3Y205MGIzUjVjR1V1YzJOeWIyeHNWRzljYmlBZ0lDQkZiR1Z0Wlc1MExuQnliM1J2ZEhsd1pTNXpZM0p2Ykd3Z1BTQkZiR1Z0Wlc1MExuQnliM1J2ZEhsd1pTNXpZM0p2Ykd4VWJ5QTlJR1oxYm1OMGFXOXVLQ2tnZTF4dUlDQWdJQ0FnTHk4Z1lYWnZhV1FnWVdOMGFXOXVJSGRvWlc0Z2JtOGdZWEpuZFcxbGJuUnpJR0Z5WlNCd1lYTnpaV1JjYmlBZ0lDQWdJR2xtSUNoaGNtZDFiV1Z1ZEhOYk1GMGdQVDA5SUhWdVpHVm1hVzVsWkNrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200N1hHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lDOHZJR0YyYjJsa0lITnRiMjkwYUNCaVpXaGhkbWx2Y2lCcFppQnViM1FnY21WeGRXbHlaV1JjYmlBZ0lDQWdJR2xtSUNoemFHOTFiR1JDWVdsc1QzVjBLR0Z5WjNWdFpXNTBjMXN3WFNrZ1BUMDlJSFJ5ZFdVcElIdGNiaUFnSUNBZ0lDQWdMeThnYVdZZ2IyNWxJRzUxYldKbGNpQnBjeUJ3WVhOelpXUXNJSFJvY205M0lHVnljbTl5SUhSdklHMWhkR05vSUVacGNtVm1iM2dnYVcxd2JHVnRaVzUwWVhScGIyNWNiaUFnSUNBZ0lDQWdhV1lnS0hSNWNHVnZaaUJoY21kMWJXVnVkSE5iTUYwZ1BUMDlJQ2R1ZFcxaVpYSW5JQ1ltSUdGeVozVnRaVzUwYzFzeFhTQTlQVDBnZFc1a1pXWnBibVZrS1NCN1hHNGdJQ0FnSUNBZ0lDQWdkR2h5YjNjZ2JtVjNJRk41Ym5SaGVFVnljbTl5S0NkV1lXeDFaU0JqYjNWc1pDQnViM1FnWW1VZ1kyOXVkbVZ5ZEdWa0p5azdYRzRnSUNBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnSUNCdmNtbG5hVzVoYkM1bGJHVnRaVzUwVTJOeWIyeHNMbU5oYkd3b1hHNGdJQ0FnSUNBZ0lDQWdkR2hwY3l4Y2JpQWdJQ0FnSUNBZ0lDQXZMeUIxYzJVZ2JHVm1kQ0J3Y205d0xDQm1hWEp6ZENCdWRXMWlaWElnWVhKbmRXMWxiblFnYjNJZ1ptRnNiR0poWTJzZ2RHOGdjMk55YjJ4c1RHVm1kRnh1SUNBZ0lDQWdJQ0FnSUdGeVozVnRaVzUwYzFzd1hTNXNaV1owSUNFOVBTQjFibVJsWm1sdVpXUmNiaUFnSUNBZ0lDQWdJQ0FnSUQ4Z2ZuNWhjbWQxYldWdWRITmJNRjB1YkdWbWRGeHVJQ0FnSUNBZ0lDQWdJQ0FnT2lCMGVYQmxiMllnWVhKbmRXMWxiblJ6V3pCZElDRTlQU0FuYjJKcVpXTjBKeUEvSUg1K1lYSm5kVzFsYm5Seld6QmRJRG9nZEdocGN5NXpZM0p2Ykd4TVpXWjBMRnh1SUNBZ0lDQWdJQ0FnSUM4dklIVnpaU0IwYjNBZ2NISnZjQ3dnYzJWamIyNWtJR0Z5WjNWdFpXNTBJRzl5SUdaaGJHeGlZV05ySUhSdklITmpjbTlzYkZSdmNGeHVJQ0FnSUNBZ0lDQWdJR0Z5WjNWdFpXNTBjMXN3WFM1MGIzQWdJVDA5SUhWdVpHVm1hVzVsWkZ4dUlDQWdJQ0FnSUNBZ0lDQWdQeUIrZm1GeVozVnRaVzUwYzFzd1hTNTBiM0JjYmlBZ0lDQWdJQ0FnSUNBZ0lEb2dZWEpuZFcxbGJuUnpXekZkSUNFOVBTQjFibVJsWm1sdVpXUWdQeUIrZm1GeVozVnRaVzUwYzFzeFhTQTZJSFJvYVhNdWMyTnliMnhzVkc5d1hHNGdJQ0FnSUNBZ0lDazdYRzVjYmlBZ0lDQWdJQ0FnY21WMGRYSnVPMXh1SUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0IyWVhJZ2JHVm1kQ0E5SUdGeVozVnRaVzUwYzFzd1hTNXNaV1owTzF4dUlDQWdJQ0FnZG1GeUlIUnZjQ0E5SUdGeVozVnRaVzUwYzFzd1hTNTBiM0E3WEc1Y2JpQWdJQ0FnSUM4dklFeEZWQ0JVU0VVZ1UwMVBUMVJJVGtWVFV5QkNSVWRKVGlGY2JpQWdJQ0FnSUhOdGIyOTBhRk5qY205c2JDNWpZV3hzS0Z4dUlDQWdJQ0FnSUNCMGFHbHpMRnh1SUNBZ0lDQWdJQ0IwYUdsekxGeHVJQ0FnSUNBZ0lDQjBlWEJsYjJZZ2JHVm1kQ0E5UFQwZ0ozVnVaR1ZtYVc1bFpDY2dQeUIwYUdsekxuTmpjbTlzYkV4bFpuUWdPaUIrZm14bFpuUXNYRzRnSUNBZ0lDQWdJSFI1Y0dWdlppQjBiM0FnUFQwOUlDZDFibVJsWm1sdVpXUW5JRDhnZEdocGN5NXpZM0p2Ykd4VWIzQWdPaUIrZm5SdmNGeHVJQ0FnSUNBZ0tUdGNiaUFnSUNCOU8xeHVYRzRnSUNBZ0x5OGdSV3hsYldWdWRDNXdjbTkwYjNSNWNHVXVjMk55YjJ4c1FubGNiaUFnSUNCRmJHVnRaVzUwTG5CeWIzUnZkSGx3WlM1elkzSnZiR3hDZVNBOUlHWjFibU4wYVc5dUtDa2dlMXh1SUNBZ0lDQWdMeThnWVhadmFXUWdZV04wYVc5dUlIZG9aVzRnYm04Z1lYSm5kVzFsYm5SeklHRnlaU0J3WVhOelpXUmNiaUFnSUNBZ0lHbG1JQ2hoY21kMWJXVnVkSE5iTUYwZ1BUMDlJSFZ1WkdWbWFXNWxaQ2tnZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTQ3WEc0Z0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUM4dklHRjJiMmxrSUhOdGIyOTBhQ0JpWldoaGRtbHZjaUJwWmlCdWIzUWdjbVZ4ZFdseVpXUmNiaUFnSUNBZ0lHbG1JQ2h6YUc5MWJHUkNZV2xzVDNWMEtHRnlaM1Z0Wlc1MGMxc3dYU2tnUFQwOUlIUnlkV1VwSUh0Y2JpQWdJQ0FnSUNBZ2IzSnBaMmx1WVd3dVpXeGxiV1Z1ZEZOamNtOXNiQzVqWVd4c0tGeHVJQ0FnSUNBZ0lDQWdJSFJvYVhNc1hHNGdJQ0FnSUNBZ0lDQWdZWEpuZFcxbGJuUnpXekJkTG14bFpuUWdJVDA5SUhWdVpHVm1hVzVsWkZ4dUlDQWdJQ0FnSUNBZ0lDQWdQeUIrZm1GeVozVnRaVzUwYzFzd1hTNXNaV1owSUNzZ2RHaHBjeTV6WTNKdmJHeE1aV1owWEc0Z0lDQWdJQ0FnSUNBZ0lDQTZJSDUrWVhKbmRXMWxiblJ6V3pCZElDc2dkR2hwY3k1elkzSnZiR3hNWldaMExGeHVJQ0FnSUNBZ0lDQWdJR0Z5WjNWdFpXNTBjMXN3WFM1MGIzQWdJVDA5SUhWdVpHVm1hVzVsWkZ4dUlDQWdJQ0FnSUNBZ0lDQWdQeUIrZm1GeVozVnRaVzUwYzFzd1hTNTBiM0FnS3lCMGFHbHpMbk5qY205c2JGUnZjRnh1SUNBZ0lDQWdJQ0FnSUNBZ09pQitmbUZ5WjNWdFpXNTBjMXN4WFNBcklIUm9hWE11YzJOeWIyeHNWRzl3WEc0Z0lDQWdJQ0FnSUNrN1hHNWNiaUFnSUNBZ0lDQWdjbVYwZFhKdU8xeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQjBhR2x6TG5OamNtOXNiQ2g3WEc0Z0lDQWdJQ0FnSUd4bFpuUTZJSDUrWVhKbmRXMWxiblJ6V3pCZExteGxablFnS3lCMGFHbHpMbk5qY205c2JFeGxablFzWEc0Z0lDQWdJQ0FnSUhSdmNEb2dmbjVoY21kMWJXVnVkSE5iTUYwdWRHOXdJQ3NnZEdocGN5NXpZM0p2Ykd4VWIzQXNYRzRnSUNBZ0lDQWdJR0psYUdGMmFXOXlPaUJoY21kMWJXVnVkSE5iTUYwdVltVm9ZWFpwYjNKY2JpQWdJQ0FnSUgwcE8xeHVJQ0FnSUgwN1hHNWNiaUFnSUNBdkx5QkZiR1Z0Wlc1MExuQnliM1J2ZEhsd1pTNXpZM0p2Ykd4SmJuUnZWbWxsZDF4dUlDQWdJRVZzWlcxbGJuUXVjSEp2ZEc5MGVYQmxMbk5qY205c2JFbHVkRzlXYVdWM0lEMGdablZ1WTNScGIyNG9LU0I3WEc0Z0lDQWdJQ0F2THlCaGRtOXBaQ0J6Ylc5dmRHZ2dZbVZvWVhacGIzSWdhV1lnYm05MElISmxjWFZwY21Wa1hHNGdJQ0FnSUNCcFppQW9jMmh2ZFd4a1FtRnBiRTkxZENoaGNtZDFiV1Z1ZEhOYk1GMHBJRDA5UFNCMGNuVmxLU0I3WEc0Z0lDQWdJQ0FnSUc5eWFXZHBibUZzTG5OamNtOXNiRWx1ZEc5V2FXVjNMbU5oYkd3b1hHNGdJQ0FnSUNBZ0lDQWdkR2hwY3l4Y2JpQWdJQ0FnSUNBZ0lDQmhjbWQxYldWdWRITmJNRjBnUFQwOUlIVnVaR1ZtYVc1bFpDQS9JSFJ5ZFdVZ09pQmhjbWQxYldWdWRITmJNRjFjYmlBZ0lDQWdJQ0FnS1R0Y2JseHVJQ0FnSUNBZ0lDQnlaWFIxY200N1hHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lDOHZJRXhGVkNCVVNFVWdVMDFQVDFSSVRrVlRVeUJDUlVkSlRpRmNiaUFnSUNBZ0lIWmhjaUJ6WTNKdmJHeGhZbXhsVUdGeVpXNTBJRDBnWm1sdVpGTmpjbTlzYkdGaWJHVlFZWEpsYm5Rb2RHaHBjeWs3WEc0Z0lDQWdJQ0IyWVhJZ2NHRnlaVzUwVW1WamRITWdQU0J6WTNKdmJHeGhZbXhsVUdGeVpXNTBMbWRsZEVKdmRXNWthVzVuUTJ4cFpXNTBVbVZqZENncE8xeHVJQ0FnSUNBZ2RtRnlJR05zYVdWdWRGSmxZM1J6SUQwZ2RHaHBjeTVuWlhSQ2IzVnVaR2x1WjBOc2FXVnVkRkpsWTNRb0tUdGNibHh1SUNBZ0lDQWdhV1lnS0hOamNtOXNiR0ZpYkdWUVlYSmxiblFnSVQwOUlHUXVZbTlrZVNrZ2UxeHVJQ0FnSUNBZ0lDQXZMeUJ5WlhabFlXd2daV3hsYldWdWRDQnBibk5wWkdVZ2NHRnlaVzUwWEc0Z0lDQWdJQ0FnSUhOdGIyOTBhRk5qY205c2JDNWpZV3hzS0Z4dUlDQWdJQ0FnSUNBZ0lIUm9hWE1zWEc0Z0lDQWdJQ0FnSUNBZ2MyTnliMnhzWVdKc1pWQmhjbVZ1ZEN4Y2JpQWdJQ0FnSUNBZ0lDQnpZM0p2Ykd4aFlteGxVR0Z5Wlc1MExuTmpjbTlzYkV4bFpuUWdLeUJqYkdsbGJuUlNaV04wY3k1c1pXWjBJQzBnY0dGeVpXNTBVbVZqZEhNdWJHVm1kQ3hjYmlBZ0lDQWdJQ0FnSUNCelkzSnZiR3hoWW14bFVHRnlaVzUwTG5OamNtOXNiRlJ2Y0NBcklHTnNhV1Z1ZEZKbFkzUnpMblJ2Y0NBdElIQmhjbVZ1ZEZKbFkzUnpMblJ2Y0Z4dUlDQWdJQ0FnSUNBcE8xeHVYRzRnSUNBZ0lDQWdJQzh2SUhKbGRtVmhiQ0J3WVhKbGJuUWdhVzRnZG1sbGQzQnZjblFnZFc1c1pYTnpJR2x6SUdacGVHVmtYRzRnSUNBZ0lDQWdJR2xtSUNoM0xtZGxkRU52YlhCMWRHVmtVM1I1YkdVb2MyTnliMnhzWVdKc1pWQmhjbVZ1ZENrdWNHOXphWFJwYjI0Z0lUMDlJQ2RtYVhobFpDY3BJSHRjYmlBZ0lDQWdJQ0FnSUNCM0xuTmpjbTlzYkVKNUtIdGNiaUFnSUNBZ0lDQWdJQ0FnSUd4bFpuUTZJSEJoY21WdWRGSmxZM1J6TG14bFpuUXNYRzRnSUNBZ0lDQWdJQ0FnSUNCMGIzQTZJSEJoY21WdWRGSmxZM1J6TG5SdmNDeGNiaUFnSUNBZ0lDQWdJQ0FnSUdKbGFHRjJhVzl5T2lBbmMyMXZiM1JvSjF4dUlDQWdJQ0FnSUNBZ0lIMHBPMXh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdJQ0F2THlCeVpYWmxZV3dnWld4bGJXVnVkQ0JwYmlCMmFXVjNjRzl5ZEZ4dUlDQWdJQ0FnSUNCM0xuTmpjbTlzYkVKNUtIdGNiaUFnSUNBZ0lDQWdJQ0JzWldaME9pQmpiR2xsYm5SU1pXTjBjeTVzWldaMExGeHVJQ0FnSUNBZ0lDQWdJSFJ2Y0RvZ1kyeHBaVzUwVW1WamRITXVkRzl3TEZ4dUlDQWdJQ0FnSUNBZ0lHSmxhR0YyYVc5eU9pQW5jMjF2YjNSb0oxeHVJQ0FnSUNBZ0lDQjlLVHRjYmlBZ0lDQWdJSDFjYmlBZ0lDQjlPMXh1SUNCOVhHNWNiaUFnYVdZZ0tIUjVjR1Z2WmlCbGVIQnZjblJ6SUQwOVBTQW5iMkpxWldOMEp5QW1KaUIwZVhCbGIyWWdiVzlrZFd4bElDRTlQU0FuZFc1a1pXWnBibVZrSnlrZ2UxeHVJQ0FnSUM4dklHTnZiVzF2Ym1welhHNGdJQ0FnYlc5a2RXeGxMbVY0Y0c5eWRITWdQU0I3SUhCdmJIbG1hV3hzT2lCd2IyeDVabWxzYkNCOU8xeHVJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDOHZJR2RzYjJKaGJGeHVJQ0FnSUhCdmJIbG1hV3hzS0NrN1hHNGdJSDFjYmx4dWZTZ3BLVHRjYmlJc0ltTnZibk4wSUVSQ0lEMGdKMmgwZEhCek9pOHZibVY0ZFhNdFkyRjBZV3h2Wnk1bWFYSmxZbUZ6WldsdkxtTnZiUzl3YjNOMGN5NXFjMjl1UDJGMWRHZzlOMmMzY0hsTFMzbHJUak5PTldWM2NrbHRhRTloVXpaMmQzSkdjMk0xWmt0cmNtczRaV3A2WmljN1hHNWpiMjV6ZENCaGJIQm9ZV0psZENBOUlGc25ZU2NzSUNkaUp5d2dKMk1uTENBblpDY3NJQ2RsSnl3Z0oyWW5MQ0FuWnljc0lDZG9KeXdnSjJrbkxDQW5haWNzSUNkckp5d2dKMnduTENBbmJTY3NJQ2R1Snl3Z0oyOG5MQ0FuY0Njc0lDZHlKeXdnSjNNbkxDQW5kQ2NzSUNkMUp5d2dKM1luTENBbmR5Y3NJQ2Q1Snl3Z0ozb25YVHRjYmx4dVkyOXVjM1FnSkd4dllXUnBibWNnUFNCQmNuSmhlUzVtY205dEtHUnZZM1Z0Wlc1MExuRjFaWEo1VTJWc1pXTjBiM0pCYkd3b0p5NXNiMkZrYVc1bkp5a3BPMXh1WTI5dWMzUWdKRzVoZGlBOUlHUnZZM1Z0Wlc1MExtZGxkRVZzWlcxbGJuUkNlVWxrS0NkcWN5MXVZWFluS1R0Y2JtTnZibk4wSUNSd1lYSmhiR3hoZUNBOUlHUnZZM1Z0Wlc1MExuRjFaWEo1VTJWc1pXTjBiM0lvSnk1d1lYSmhiR3hoZUNjcE8xeHVZMjl1YzNRZ0pHTnZiblJsYm5RZ1BTQmtiMk4xYldWdWRDNXhkV1Z5ZVZObGJHVmpkRzl5S0NjdVkyOXVkR1Z1ZENjcE8xeHVZMjl1YzNRZ0pIUnBkR3hsSUQwZ1pHOWpkVzFsYm5RdVoyVjBSV3hsYldWdWRFSjVTV1FvSjJwekxYUnBkR3hsSnlrN1hHNWpiMjV6ZENBa1lYSnliM2NnUFNCa2IyTjFiV1Z1ZEM1eGRXVnllVk5sYkdWamRHOXlLQ2N1WVhKeWIzY25LVHRjYm1OdmJuTjBJQ1J0YjJSaGJDQTlJR1J2WTNWdFpXNTBMbkYxWlhKNVUyVnNaV04wYjNJb0p5NXRiMlJoYkNjcE8xeHVZMjl1YzNRZ0pHeHBaMmgwWW05NElEMGdaRzlqZFcxbGJuUXVjWFZsY25sVFpXeGxZM1J2Y2lnbkxteHBaMmgwWW05NEp5azdYRzVqYjI1emRDQWtkbWxsZHlBOUlHUnZZM1Z0Wlc1MExuRjFaWEo1VTJWc1pXTjBiM0lvSnk1c2FXZG9kR0p2ZUMxMmFXVjNKeWs3WEc1Y2JtVjRjRzl5ZENCN0lGeHVYSFJFUWl3Z1hHNWNkR0ZzY0doaFltVjBMQ0JjYmx4MEpHeHZZV1JwYm1jc0lGeHVYSFFrYm1GMkxDQmNibHgwSkhCaGNtRnNiR0Y0TEZ4dVhIUWtZMjl1ZEdWdWRDeGNibHgwSkhScGRHeGxMRnh1WEhRa1lYSnliM2NzWEc1Y2RDUnRiMlJoYkN4Y2JseDBKR3hwWjJoMFltOTRMRnh1WEhRa2RtbGxkeUJjYm4wN0lpd2lhVzF3YjNKMElITnRiMjkwYUhOamNtOXNiQ0JtY205dElDZHpiVzl2ZEdoelkzSnZiR3d0Y0c5c2VXWnBiR3duTzF4dVhHNXBiWEJ2Y25RZ2V5QmhjblJwWTJ4bFZHVnRjR3hoZEdVc0lISmxibVJsY2s1aGRreG5JSDBnWm5KdmJTQW5MaTkwWlcxd2JHRjBaWE1uTzF4dWFXMXdiM0owSUhzZ1pHVmliM1Z1WTJVc0lHaHBaR1ZNYjJGa2FXNW5MQ0J6WTNKdmJHeFViMVJ2Y0N3Z2JXRnJaVk5zYVdSbGNpQjlJR1p5YjIwZ0p5NHZkWFJwYkhNbk8xeHVhVzF3YjNKMElHMWhhMlZCYkhCb1lXSmxkQ0JtY205dElDY3VMMjFoYTJWQmJIQm9ZV0psZENjN1hHNWNibWx0Y0c5eWRDQjdJRVJDTENBa2JtRjJMQ0FrY0dGeVlXeHNZWGdzSUNSamIyNTBaVzUwTENBa2RHbDBiR1VzSUNSaGNuSnZkeXdnSkcxdlpHRnNMQ0FrYkdsbmFIUmliM2dzSUNSMmFXVjNJSDBnWm5KdmJTQW5MaTlqYjI1emRHRnVkSE1uTzF4dVhHNXNaWFFnYzI5eWRFdGxlU0E5SURBN0lDOHZJREFnUFNCaGNuUnBjM1FzSURFZ1BTQjBhWFJzWlZ4dWJHVjBJR1Z1ZEhKcFpYTWdQU0I3SUdKNVFYVjBhRzl5T2lCYlhTd2dZbmxVYVhSc1pUb2dXMTBnZlR0Y2JteGxkQ0JqZFhKeVpXNTBUR1YwZEdWeUlEMGdKMEVuTzF4dWJHVjBJRzF2WkdGc0lEMGdabUZzYzJVN1hHNXNaWFFnYkdsbmFIUmliM2dnUFNCbVlXeHpaVHRjYmx4dVkyOXVjM1FnWVhSMFlXTm9TVzFoWjJWTWFYTjBaVzVsY25NZ1BTQW9LU0E5UGlCN1hHNWNkR052Ym5OMElDUnBiV0ZuWlhNZ1BTQkJjbkpoZVM1bWNtOXRLR1J2WTNWdFpXNTBMbkYxWlhKNVUyVnNaV04wYjNKQmJHd29KeTVoY25ScFkyeGxMV2x0WVdkbEp5a3BPMXh1WEc1Y2RDUnBiV0ZuWlhNdVptOXlSV0ZqYUNocGJXY2dQVDRnZTF4dVhIUmNkR2x0Wnk1aFpHUkZkbVZ1ZEV4cGMzUmxibVZ5S0NkamJHbGpheWNzSUNobGRuUXBJRDArSUh0Y2JseDBYSFJjZEdsbUlDZ2hiR2xuYUhSaWIzZ3BJSHRjYmx4MFhIUmNkRngwYkdWMElITnlZeUE5SUdsdFp5NXpjbU03WEc1Y2RGeDBYSFJjZEZ4dVhIUmNkRngwWEhRa2JHbG5hSFJpYjNndVkyeGhjM05NYVhOMExtRmtaQ2duYzJodmR5MXBiV2NuS1R0Y2JseDBYSFJjZEZ4MEpIWnBaWGN1YzJWMFFYUjBjbWxpZFhSbEtDZHpkSGxzWlNjc0lHQmlZV05yWjNKdmRXNWtMV2x0WVdkbE9pQjFjbXdvSkh0emNtTjlLV0FwTzF4dVhIUmNkRngwWEhSc2FXZG9kR0p2ZUNBOUlIUnlkV1U3WEc1Y2RGeDBYSFI5WEc1Y2RGeDBmU2s3WEc1Y2RIMHBPMXh1WEc1Y2RDUjJhV1YzTG1Ga1pFVjJaVzUwVEdsemRHVnVaWElvSjJOc2FXTnJKeXdnS0NrZ1BUNGdlMXh1WEhSY2RHbG1JQ2hzYVdkb2RHSnZlQ2tnZTF4dVhIUmNkRngwSkd4cFoyaDBZbTk0TG1Oc1lYTnpUR2x6ZEM1eVpXMXZkbVVvSjNOb2IzY3RhVzFuSnlrN1hHNWNkRngwWEhSc2FXZG9kR0p2ZUNBOUlHWmhiSE5sTzF4dVhIUmNkSDFjYmx4MGZTazdYRzU5TzF4dVhHNWpiMjV6ZENCaGRIUmhZMmhOYjJSaGJFeHBjM1JsYm1WeWN5QTlJQ2dwSUQwK0lIdGNibHgwWTI5dWMzUWdKR1pwYm1RZ1BTQmtiMk4xYldWdWRDNW5aWFJGYkdWdFpXNTBRbmxKWkNnbmFuTXRabWx1WkNjcE8xeHVYSFJjYmx4MEpHWnBibVF1WVdSa1JYWmxiblJNYVhOMFpXNWxjaWduWTJ4cFkyc25MQ0FvS1NBOVBpQjdYRzVjZEZ4MEpHMXZaR0ZzTG1Oc1lYTnpUR2x6ZEM1aFpHUW9KM05vYjNjbktUdGNibHgwWEhSdGIyUmhiQ0E5SUhSeWRXVTdYRzVjZEgwcE8xeHVYRzVjZENSdGIyUmhiQzVoWkdSRmRtVnVkRXhwYzNSbGJtVnlLQ2RqYkdsamF5Y3NJQ2dwSUQwK0lIdGNibHgwWEhRa2JXOWtZV3d1WTJ4aGMzTk1hWE4wTG5KbGJXOTJaU2duYzJodmR5Y3BPMXh1WEhSY2RHMXZaR0ZzSUQwZ1ptRnNjMlU3WEc1Y2RIMHBPMXh1WEc1Y2RIZHBibVJ2ZHk1aFpHUkZkbVZ1ZEV4cGMzUmxibVZ5S0NkclpYbGtiM2R1Snl3Z0tDa2dQVDRnZTF4dVhIUmNkR2xtSUNodGIyUmhiQ2tnZTF4dVhIUmNkRngwYzJWMFZHbHRaVzkxZENnb0tTQTlQaUI3WEc1Y2RGeDBYSFJjZENSdGIyUmhiQzVqYkdGemMweHBjM1F1Y21WdGIzWmxLQ2R6YUc5M0p5azdYRzVjZEZ4MFhIUmNkRzF2WkdGc0lEMGdabUZzYzJVN1hHNWNkRngwWEhSOUxDQTJNREFwTzF4dVhIUmNkSDA3WEc1Y2RIMHBPMXh1ZlZ4dVhHNXNaWFFnY0hKbGRqdGNibXhsZENCamRYSnlaVzUwSUQwZ01EdGNibXhsZENCcGMxTm9iM2RwYm1jZ1BTQm1ZV3h6WlR0Y2JtTnZibk4wSUdGMGRHRmphRUZ5Y205M1RHbHpkR1Z1WlhKeklEMGdLQ2tnUFQ0Z2UxeHVYSFFrWVhKeWIzY3VZV1JrUlhabGJuUk1hWE4wWlc1bGNpZ25ZMnhwWTJzbkxDQW9LU0E5UGlCN1hHNWNkRngwYzJOeWIyeHNWRzlVYjNBb0tUdGNibHgwZlNrN1hHNWNibHgwSkhCaGNtRnNiR0Y0TG1Ga1pFVjJaVzUwVEdsemRHVnVaWElvSjNOamNtOXNiQ2NzSUNncElEMCtJSHRjYmx4dVhIUmNkR3hsZENCNUlEMGdKSFJwZEd4bExtZGxkRUp2ZFc1a2FXNW5RMnhwWlc1MFVtVmpkQ2dwTG5rN1hHNWNkRngwYVdZZ0tHTjFjbkpsYm5RZ0lUMDlJSGtwSUh0Y2JseDBYSFJjZEhCeVpYWWdQU0JqZFhKeVpXNTBPMXh1WEhSY2RGeDBZM1Z5Y21WdWRDQTlJSGs3WEc1Y2RGeDBmVnh1WEc1Y2RGeDBhV1lnS0hrZ1BEMGdMVFV3SUNZbUlDRnBjMU5vYjNkcGJtY3BJSHRjYmx4MFhIUmNkQ1JoY25KdmR5NWpiR0Z6YzB4cGMzUXVZV1JrS0NkemFHOTNKeWs3WEc1Y2RGeDBYSFJwYzFOb2IzZHBibWNnUFNCMGNuVmxPMXh1WEhSY2RIMGdaV3h6WlNCcFppQW9lU0ErSUMwMU1DQW1KaUJwYzFOb2IzZHBibWNwSUh0Y2JseDBYSFJjZENSaGNuSnZkeTVqYkdGemMweHBjM1F1Y21WdGIzWmxLQ2R6YUc5M0p5azdYRzVjZEZ4MFhIUnBjMU5vYjNkcGJtY2dQU0JtWVd4elpUdGNibHgwWEhSOVhHNWNkSDBwTzF4dWZUdGNibHh1WTI5dWMzUWdZV1JrVTI5eWRFSjFkSFJ2Ymt4cGMzUmxibVZ5Y3lBOUlDZ3BJRDArSUh0Y2JseDBiR1YwSUNSaWVVRnlkR2x6ZENBOUlHUnZZM1Z0Wlc1MExtZGxkRVZzWlcxbGJuUkNlVWxrS0NkcWN5MWllUzFoY25ScGMzUW5LVHRjYmx4MGJHVjBJQ1JpZVZScGRHeGxJRDBnWkc5amRXMWxiblF1WjJWMFJXeGxiV1Z1ZEVKNVNXUW9KMnB6TFdKNUxYUnBkR3hsSnlrN1hHNWNkQ1JpZVVGeWRHbHpkQzVoWkdSRmRtVnVkRXhwYzNSbGJtVnlLQ2RqYkdsamF5Y3NJQ2dwSUQwK0lIdGNibHgwWEhScFppQW9jMjl5ZEV0bGVTa2dlMXh1WEhSY2RGeDBjMk55YjJ4c1ZHOVViM0FvS1R0Y2JseDBYSFJjZEhOdmNuUkxaWGtnUFNBd08xeHVYSFJjZEZ4MEpHSjVRWEowYVhOMExtTnNZWE56VEdsemRDNWhaR1FvSjJGamRHbDJaU2NwTzF4dVhIUmNkRngwSkdKNVZHbDBiR1V1WTJ4aGMzTk1hWE4wTG5KbGJXOTJaU2duWVdOMGFYWmxKeWs3WEc1Y2JseDBYSFJjZEhKbGJtUmxja1Z1ZEhKcFpYTW9LVHRjYmx4MFhIUjlYRzVjZEgwcE8xeHVYRzVjZENSaWVWUnBkR3hsTG1Ga1pFVjJaVzUwVEdsemRHVnVaWElvSjJOc2FXTnJKeXdnS0NrZ1BUNGdlMXh1WEhSY2RHbG1JQ2doYzI5eWRFdGxlU2tnZTF4dVhIUmNkRngwYzJOeWIyeHNWRzlVYjNBb0tUdGNibHgwWEhSY2RITnZjblJMWlhrZ1BTQXhPMXh1WEhSY2RGeDBKR0o1VkdsMGJHVXVZMnhoYzNOTWFYTjBMbUZrWkNnbllXTjBhWFpsSnlrN1hHNWNkRngwWEhRa1lubEJjblJwYzNRdVkyeGhjM05NYVhOMExuSmxiVzkyWlNnbllXTjBhWFpsSnlrN1hHNWNibHgwWEhSY2RISmxibVJsY2tWdWRISnBaWE1vS1R0Y2JseDBYSFI5WEc1Y2RIMHBPMXh1ZlR0Y2JseHVZMjl1YzNRZ2NtVnVaR1Z5Ulc1MGNtbGxjeUE5SUNncElEMCtJSHRjYmx4MFkyOXVjM1FnSkdGeWRHbGpiR1ZNYVhOMElEMGdaRzlqZFcxbGJuUXVaMlYwUld4bGJXVnVkRUo1U1dRb0oycHpMV3hwYzNRbktUdGNibHgwWTI5dWMzUWdaVzUwY21sbGMweHBjM1FnUFNCemIzSjBTMlY1SUQ4Z1pXNTBjbWxsY3k1aWVWUnBkR3hsSURvZ1pXNTBjbWxsY3k1aWVVRjFkR2h2Y2p0Y2JseHVYSFFrWVhKMGFXTnNaVXhwYzNRdWFXNXVaWEpJVkUxTUlEMGdKeWM3WEc1Y2JseDBaVzUwY21sbGMweHBjM1F1Wm05eVJXRmphQ2dvWlc1MGNua3NJR2twSUQwK0lIdGNibHgwWEhRa1lYSjBhV05zWlV4cGMzUXVhVzV6WlhKMFFXUnFZV05sYm5SSVZFMU1LQ2RpWldadmNtVmxibVFuTENCaGNuUnBZMnhsVkdWdGNHeGhkR1VvWlc1MGNua3NJR2twS1R0Y2JseDBYSFJ0WVd0bFUyeHBaR1Z5S0dSdlkzVnRaVzUwTG1kbGRFVnNaVzFsYm5SQ2VVbGtLR0J6Ykdsa1pYSXRKSHRwZldBcEtUdGNibHgwZlNrN1hHNWNibHgwWVhSMFlXTm9TVzFoWjJWTWFYTjBaVzVsY25Nb0tUdGNibHgwYldGclpVRnNjR2hoWW1WMEtITnZjblJMWlhrcE8xeHVmVHRjYmx4dVkyOXVjM1FnYzJWMFJHRjBZVUZ1WkZOdmNuUkNlVlJwZEd4bElEMGdLR1JoZEdFcElEMCtJSHRjYmx4MFpXNTBjbWxsY3k1aWVVRjFkR2h2Y2lBOUlHUmhkR0U3WEc1Y2RHVnVkSEpwWlhNdVlubFVhWFJzWlNBOUlHUmhkR0V1YzJ4cFkyVW9LVHNnTHk4Z1kyOXdhV1Z6SUdSaGRHRWdabTl5SUdKNVZHbDBiR1VnYzI5eWRGeHVYRzVjZEdWdWRISnBaWE11WW5sVWFYUnNaUzV6YjNKMEtDaGhMQ0JpS1NBOVBpQjdYRzVjZEZ4MGJHVjBJR0ZVYVhSc1pTQTlJR0V1ZEdsMGJHVmJNRjB1ZEc5VmNIQmxja05oYzJVb0tUdGNibHgwWEhSc1pYUWdZbFJwZEd4bElEMGdZaTUwYVhSc1pWc3dYUzUwYjFWd2NHVnlRMkZ6WlNncE8xeHVYSFJjZEdsbUlDaGhWR2wwYkdVZ1BpQmlWR2wwYkdVcElISmxkSFZ5YmlBeE8xeHVYSFJjZEdWc2MyVWdhV1lnS0dGVWFYUnNaU0E4SUdKVWFYUnNaU2tnY21WMGRYSnVJQzB4TzF4dVhIUmNkR1ZzYzJVZ2NtVjBkWEp1SURBN1hHNWNkSDBwTzF4dWZUdGNibHh1WTI5dWMzUWdabVYwWTJoRVlYUmhJRDBnS0NrZ1BUNGdlMXh1WEhSbVpYUmphQ2hFUWlrdWRHaGxiaWh5WlhNZ1BUNGdjbVZ6TG1wemIyNG9LU2xjYmx4MExuUm9aVzRvWkdGMFlTQTlQaUI3WEc1Y2RGeDBjMlYwUkdGMFlVRnVaRk52Y25SQ2VWUnBkR3hsS0dSaGRHRXBPMXh1WEhSY2RISmxibVJsY2tWdWRISnBaWE1vS1R0Y2JseDBYSFJvYVdSbFRHOWhaR2x1WnlncE8xeHVYSFI5S1Z4dVhIUXVZMkYwWTJnb1pYSnlJRDArSUdOdmJuTnZiR1V1ZDJGeWJpaGxjbklwS1R0Y2JuMDdYRzVjYm1OdmJuTjBJR2x1YVhRZ1BTQW9LU0E5UGlCN1hHNWNkSE50YjI5MGFITmpjbTlzYkM1d2IyeDVabWxzYkNncE8xeHVYSFJtWlhSamFFUmhkR0VvS1R0Y2JseHVYSFJ5Wlc1a1pYSk9ZWFpNWnlncE8xeHVYSFJoWkdSVGIzSjBRblYwZEc5dVRHbHpkR1Z1WlhKektDazdYRzVjZEdGMGRHRmphRUZ5Y205M1RHbHpkR1Z1WlhKektDazdYRzVjZEdGMGRHRmphRTF2WkdGc1RHbHpkR1Z1WlhKektDazdYRzU5WEc1Y2JtbHVhWFFvS1R0Y2JpSXNJbWx0Y0c5eWRDQjdJR0ZzY0doaFltVjBJSDBnWm5KdmJTQW5MaTlqYjI1emRHRnVkSE1uTzF4dVhHNWpiMjV6ZENCdFlXdGxRV3h3YUdGaVpYUWdQU0FvYzI5eWRFdGxlU2tnUFQ0Z2UxeHVYSFJqYjI1emRDQm1hVzVrUm1seWMzUkZiblJ5ZVNBOUlDaGphR0Z5S1NBOVBpQjdYRzVjZEZ4MFkyOXVjM1FnYzJWc1pXTjBiM0lnUFNCemIzSjBTMlY1SUQ4Z0p5NXFjeTFsYm5SeWVTMTBhWFJzWlNjZ09pQW5MbXB6TFdWdWRISjVMV0Z5ZEdsemRDYzdYRzVjZEZ4MFkyOXVjM1FnY0hKbGRsTmxiR1ZqZEc5eUlEMGdJWE52Y25STFpYa2dQeUFuTG1wekxXVnVkSEo1TFhScGRHeGxKeUE2SUNjdWFuTXRaVzUwY25rdFlYSjBhWE4wSnp0Y2JseHVYSFJjZEdOdmJuTjBJQ1JsYm5SeWFXVnpJRDBnUVhKeVlYa3Vabkp2YlNoa2IyTjFiV1Z1ZEM1eGRXVnllVk5sYkdWamRHOXlRV3hzS0hObGJHVmpkRzl5S1NrN1hHNWNkRngwWTI5dWMzUWdKSEJ5WlhaRmJuUnlhV1Z6SUQwZ1FYSnlZWGt1Wm5KdmJTaGtiMk4xYldWdWRDNXhkV1Z5ZVZObGJHVmpkRzl5UVd4c0tIQnlaWFpUWld4bFkzUnZjaWtwTzF4dVhHNWNkRngwSkhCeVpYWkZiblJ5YVdWekxtWnZja1ZoWTJnb1pXNTBjbmtnUFQ0Z1pXNTBjbmt1Y21WdGIzWmxRWFIwY21saWRYUmxLQ2R1WVcxbEp5a3BPMXh1WEc1Y2RGeDBjbVYwZFhKdUlDUmxiblJ5YVdWekxtWnBibVFvWlc1MGNua2dQVDRnZTF4dVhIUmNkRngwYkdWMElHNXZaR1VnUFNCbGJuUnllUzV1WlhoMFJXeGxiV1Z1ZEZOcFlteHBibWM3WEc1Y2RGeDBYSFJ5WlhSMWNtNGdibTlrWlM1cGJtNWxja2hVVFV4Yk1GMGdQVDA5SUdOb1lYSWdmSHdnYm05a1pTNXBibTVsY2toVVRVeGJNRjBnUFQwOUlHTm9ZWEl1ZEc5VmNIQmxja05oYzJVb0tUdGNibHgwWEhSOUtUdGNibHgwZlR0Y2JseHVYSFJqYjI1emRDQmhkSFJoWTJoQmJtTm9iM0pNYVhOMFpXNWxjaUE5SUNna1lXNWphRzl5TENCc1pYUjBaWElwSUQwK0lIdGNibHgwWEhRa1lXNWphRzl5TG1Ga1pFVjJaVzUwVEdsemRHVnVaWElvSjJOc2FXTnJKeXdnS0NrZ1BUNGdlMXh1WEhSY2RGeDBZMjl1YzNRZ2JHVjBkR1Z5VG05a1pTQTlJR1J2WTNWdFpXNTBMbWRsZEVWc1pXMWxiblJDZVVsa0tHeGxkSFJsY2lrN1hHNWNkRngwWEhSc1pYUWdkR0Z5WjJWME8xeHVYRzVjZEZ4MFhIUnBaaUFvSVhOdmNuUkxaWGtwSUh0Y2JseDBYSFJjZEZ4MGRHRnlaMlYwSUQwZ2JHVjBkR1Z5SUQwOVBTQW5ZU2NnUHlCa2IyTjFiV1Z1ZEM1blpYUkZiR1Z0Wlc1MFFubEpaQ2duWVc1amFHOXlMWFJoY21kbGRDY3BJRG9nYkdWMGRHVnlUbTlrWlM1d1lYSmxiblJGYkdWdFpXNTBMbkJoY21WdWRFVnNaVzFsYm5RdWNHRnlaVzUwUld4bGJXVnVkQzV3WVhKbGJuUkZiR1Z0Wlc1MExuQnlaWFpwYjNWelJXeGxiV1Z1ZEZOcFlteHBibWN1Y1hWbGNubFRaV3hsWTNSdmNpZ25MbXB6TFdGeWRHbGpiR1V0WVc1amFHOXlMWFJoY21kbGRDY3BPMXh1WEhSY2RGeDBmU0JsYkhObElIdGNibHgwWEhSY2RGeDBkR0Z5WjJWMElEMGdiR1YwZEdWeUlEMDlQU0FuWVNjZ1B5QmtiMk4xYldWdWRDNW5aWFJGYkdWdFpXNTBRbmxKWkNnbllXNWphRzl5TFhSaGNtZGxkQ2NwSURvZ2JHVjBkR1Z5VG05a1pTNXdZWEpsYm5SRmJHVnRaVzUwTG5CaGNtVnVkRVZzWlcxbGJuUXVjR0Z5Wlc1MFJXeGxiV1Z1ZEM1d2NtVjJhVzkxYzBWc1pXMWxiblJUYVdKc2FXNW5MbkYxWlhKNVUyVnNaV04wYjNJb0p5NXFjeTFoY25ScFkyeGxMV0Z1WTJodmNpMTBZWEpuWlhRbktUdGNibHgwWEhSY2RIMDdYRzVjYmx4MFhIUmNkSFJoY21kbGRDNXpZM0p2Ykd4SmJuUnZWbWxsZHloN1ltVm9ZWFpwYjNJNklGd2ljMjF2YjNSb1hDSXNJR0pzYjJOck9pQmNJbk4wWVhKMFhDSjlLVHRjYmx4MFhIUjlLVHRjYmx4MGZUdGNibHh1WEhSc1pYUWdZV04wYVhabFJXNTBjbWxsY3lBOUlIdDlPMXh1WEhSc1pYUWdKRzkxZEdWeUlEMGdaRzlqZFcxbGJuUXVjWFZsY25sVFpXeGxZM1J2Y2lnbkxtRnNjR2hoWW1WMFgxOXNaWFIwWlhKekp5azdYRzVjZENSdmRYUmxjaTVwYm01bGNraFVUVXdnUFNBbkp6dGNibHh1WEhSaGJIQm9ZV0psZEM1bWIzSkZZV05vS0d4bGRIUmxjaUE5UGlCN1hHNWNkRngwYkdWMElDUm1hWEp6ZEVWdWRISjVJRDBnWm1sdVpFWnBjbk4wUlc1MGNua29iR1YwZEdWeUtUdGNibHgwWEhSc1pYUWdKR0Z1WTJodmNpQTlJR1J2WTNWdFpXNTBMbU55WldGMFpVVnNaVzFsYm5Rb0oyRW5LVHRjYmx4dVhIUmNkR2xtSUNnaEpHWnBjbk4wUlc1MGNua3BJSEpsZEhWeWJqdGNibHh1WEhSY2RDUm1hWEp6ZEVWdWRISjVMbWxrSUQwZ2JHVjBkR1Z5TzF4dVhIUmNkQ1JoYm1Ob2IzSXVhVzV1WlhKSVZFMU1JRDBnYkdWMGRHVnlMblJ2VlhCd1pYSkRZWE5sS0NrN1hHNWNkRngwSkdGdVkyaHZjaTVqYkdGemMwNWhiV1VnUFNBbllXeHdhR0ZpWlhSZlgyeGxkSFJsY2kxaGJtTm9iM0luTzF4dVhHNWNkRngwWVhSMFlXTm9RVzVqYUc5eVRHbHpkR1Z1WlhJb0pHRnVZMmh2Y2l3Z2JHVjBkR1Z5S1R0Y2JseDBYSFFrYjNWMFpYSXVZWEJ3Wlc1a1EyaHBiR1FvSkdGdVkyaHZjaWs3WEc1Y2RIMHBPMXh1ZlR0Y2JseHVaWGh3YjNKMElHUmxabUYxYkhRZ2JXRnJaVUZzY0doaFltVjBPeUlzSW1OdmJuTjBJR2x0WVdkbFZHVnRjR3hoZEdVZ1BTQW9hVzFoWjJVcElEMCtJR0E4YVcxbklHTnNZWE56UFZ3aVlYSjBhV05zWlMxcGJXZGNJaUJ6Y21NOVhDSXVMaTh1TGk5aGMzTmxkSE12YVcxaFoyVnpMeVI3YVcxaFoyVjlYQ0krUEM5cGJXYytZRHRjYmx4dVkyOXVjM1FnWVhKMGFXTnNaVlJsYlhCc1lYUmxJRDBnS0dWdWRISjVMQ0JwS1NBOVBpQjdYRzVjZEdOdmJuTjBJSHNnZEdsMGJHVXNJR1pwY25OMFRtRnRaU3dnYkdGemRFNWhiV1VzSUdsdFlXZGxjeXdnWkdWelkzSnBjSFJwYjI0c0lHUmxkR0ZwYkNCOUlEMGdaVzUwY25rN1hHNWNibHgwWTI5dWMzUWdhVzFoWjJWSVZFMU1JRDBnYVcxaFoyVnpMbXhsYm1kMGFDQS9JRnh1WEhSY2RHbHRZV2RsY3k1dFlYQW9hVzFoWjJVZ1BUNGdhVzFoWjJWVVpXMXdiR0YwWlNocGJXRm5aU2twTG1wdmFXNG9KeWNwSURvZ0p5YzdYRzVjYmx4MGNtVjBkWEp1SUNCZ1hHNWNkRngwUEdGeWRHbGpiR1VnWTJ4aGMzTTlYQ0poY25ScFkyeGxYMTl2ZFhSbGNsd2lQbHh1WEhSY2RGeDBQR1JwZGlCamJHRnpjejFjSW1GeWRHbGpiR1ZmWDJsdWJtVnlYQ0krWEc1Y2RGeDBYSFJjZER4a2FYWWdZMnhoYzNNOVhDSmhjblJwWTJ4bFgxOW9aV0ZrYVc1blhDSStYRzVjZEZ4MFhIUmNkRngwUEdFZ1kyeGhjM005WENKcWN5MWxiblJ5ZVMxMGFYUnNaVndpUGp3dllUNWNibHgwWEhSY2RGeDBYSFE4YURJZ1kyeGhjM005WENKaGNuUnBZMnhsTFdobFlXUnBibWRmWDNScGRHeGxYQ0krSkh0MGFYUnNaWDA4TDJneVBseHVYSFJjZEZ4MFhIUmNkRHhrYVhZZ1kyeGhjM005WENKaGNuUnBZMnhsTFdobFlXUnBibWRmWDI1aGJXVmNJajVjYmx4MFhIUmNkRngwWEhSY2REeHpjR0Z1SUdOc1lYTnpQVndpWVhKMGFXTnNaUzFvWldGa2FXNW5YMTl1WVcxbExTMW1hWEp6ZEZ3aVBpUjdabWx5YzNST1lXMWxmVHd2YzNCaGJqNWNibHgwWEhSY2RGeDBYSFJjZER4aElHTnNZWE56UFZ3aWFuTXRaVzUwY25rdFlYSjBhWE4wWENJK1BDOWhQbHh1WEhSY2RGeDBYSFJjZEZ4MFBITndZVzRnWTJ4aGMzTTlYQ0poY25ScFkyeGxMV2hsWVdScGJtZGZYMjVoYldVdExXeGhjM1JjSWo0a2UyeGhjM1JPWVcxbGZUd3ZjM0JoYmo1Y2JseDBYSFJjZEZ4MFhIUThMMlJwZGo1Y2JseDBYSFJjZEZ4MFBDOWthWFkrWEhSY2JseDBYSFJjZEZ4MFBHUnBkaUJqYkdGemN6MWNJbUZ5ZEdsamJHVmZYM05zYVdSbGNpMXZkWFJsY2x3aVBseHVYSFJjZEZ4MFhIUmNkRHhrYVhZZ1kyeGhjM005WENKaGNuUnBZMnhsWDE5emJHbGtaWEl0YVc1dVpYSmNJaUJwWkQxY0luTnNhV1JsY2kwa2UybDlYQ0krWEc1Y2RGeDBYSFJjZEZ4MFhIUWtlMmx0WVdkbFNGUk5USDFjYmx4MFhIUmNkRngwWEhSY2REeGthWFlnWTJ4aGMzTTlYQ0poY25ScFkyeGxMV1JsYzJOeWFYQjBhVzl1WDE5dmRYUmxjbHdpUGx4dVhIUmNkRngwWEhSY2RGeDBYSFE4WkdsMklHTnNZWE56UFZ3aVlYSjBhV05zWlMxa1pYTmpjbWx3ZEdsdmJsd2lQaVI3WkdWelkzSnBjSFJwYjI1OVBDOWthWFkrWEc1Y2RGeDBYSFJjZEZ4MFhIUmNkRHhrYVhZZ1kyeGhjM005WENKaGNuUnBZMnhsTFdSbGRHRnBiRndpUGlSN1pHVjBZV2xzZlR3dlpHbDJQbHh1WEhSY2RGeDBYSFJjZEZ4MFBDOWthWFkrWEc1Y2RGeDBYSFJjZEZ4MFBDOWthWFkrWEc1Y2RGeDBYSFJjZEZ4MFBHUnBkaUJqYkdGemN6MWNJbUZ5ZEdsamJHVmZYM05qY205c2JDMWpiMjUwY205c2Mxd2lQbHh1WEhSY2RGeDBYSFJjZEZ4MFBITndZVzRnWTJ4aGMzTTlYQ0pqYjI1MGNtOXNjeUJoY25KdmR5MXdjbVYyWENJKzRvYVFQQzl6Y0dGdVBpQmNibHgwWEhSY2RGeDBYSFJjZER4emNHRnVJR05zWVhOelBWd2lZMjl1ZEhKdmJITWdZWEp5YjNjdGJtVjRkRndpUHVLR2tqd3ZjM0JoYmo1Y2JseDBYSFJjZEZ4MFhIUThMMlJwZGo1Y2JseDBYSFJjZEZ4MFhIUThjQ0JqYkdGemN6MWNJbXB6TFdGeWRHbGpiR1V0WVc1amFHOXlMWFJoY21kbGRGd2lQand2Y0Q1Y2JseDBYSFJjZER3dlpHbDJQbHh1WEhSY2REd3ZZWEowYVdOc1pUNWNibHgwWUZ4dWZUdGNibHh1Wlhod2IzSjBJR1JsWm1GMWJIUWdZWEowYVdOc1pWUmxiWEJzWVhSbE95SXNJbWx0Y0c5eWRDQmhjblJwWTJ4bFZHVnRjR3hoZEdVZ1puSnZiU0FuTGk5aGNuUnBZMnhsSnp0Y2JtbHRjRzl5ZENCeVpXNWtaWEpPWVhaTVp5Qm1jbTl0SUNjdUwyNWhka3huSnp0Y2JseHVaWGh3YjNKMElIc2dZWEowYVdOc1pWUmxiWEJzWVhSbExDQnlaVzVrWlhKT1lYWk1aeUI5T3lJc0ltTnZibk4wSUhSbGJYQnNZWFJsSUQwZ1hHNWNkR0E4WkdsMklHTnNZWE56UFZ3aWJtRjJYMTlwYm01bGNsd2lQbHh1WEhSY2REeGthWFlnWTJ4aGMzTTlYQ0p1WVhaZlgzTnZjblF0WW5sY0lqNWNibHgwWEhSY2REeHpjR0Z1SUdOc1lYTnpQVndpYzI5eWRDMWllVjlmZEdsMGJHVmNJajVUYjNKMElHSjVQQzl6Y0dGdVBseHVYSFJjZEZ4MFBHSjFkSFJ2YmlCamJHRnpjejFjSW5OdmNuUXRZbmtnYzI5eWRDMWllVjlmWW5rdFlYSjBhWE4wSUdGamRHbDJaVndpSUdsa1BWd2lhbk10WW5rdFlYSjBhWE4wWENJK1FYSjBhWE4wUEM5aWRYUjBiMjQrWEc1Y2RGeDBYSFE4YzNCaGJpQmpiR0Z6Y3oxY0luTnZjblF0WW5sZlgyUnBkbWxrWlhKY0lqNGdmQ0E4TDNOd1lXNCtYRzVjZEZ4MFhIUThZblYwZEc5dUlHTnNZWE56UFZ3aWMyOXlkQzFpZVNCemIzSjBMV0o1WDE5aWVTMTBhWFJzWlZ3aUlHbGtQVndpYW5NdFlua3RkR2wwYkdWY0lqNVVhWFJzWlR3dlluVjBkRzl1UGx4dVhIUmNkRngwUEhOd1lXNGdZMnhoYzNNOVhDSm1hVzVrWENJZ2FXUTlYQ0pxY3kxbWFXNWtYQ0krWEc1Y2RGeDBYSFJjZENnOGMzQmhiaUJqYkdGemN6MWNJbVpwYm1RdExXbHVibVZ5WENJK0ppTTRPVGcwTzBZOEwzTndZVzQrS1Z4dVhIUmNkRngwUEM5emNHRnVQbHh1WEhSY2REd3ZaR2wyUGx4dVhIUmNkRHhrYVhZZ1kyeGhjM005WENKdVlYWmZYMkZzY0doaFltVjBYQ0krWEc1Y2RGeDBYSFE4YzNCaGJpQmpiR0Z6Y3oxY0ltRnNjR2hoWW1WMFgxOTBhWFJzWlZ3aVBrZHZJSFJ2UEM5emNHRnVQbHh1WEhSY2RGeDBQR1JwZGlCamJHRnpjejFjSW1Gc2NHaGhZbVYwWDE5c1pYUjBaWEp6WENJK1BDOWthWFkrWEc1Y2RGeDBQQzlrYVhZK1hHNWNkRHd2WkdsMlBtQTdYRzVjYm1OdmJuTjBJSEpsYm1SbGNrNWhka3huSUQwZ0tDa2dQVDRnZTF4dVhIUnNaWFFnYm1GMlQzVjBaWElnUFNCa2IyTjFiV1Z1ZEM1blpYUkZiR1Z0Wlc1MFFubEpaQ2duYW5NdGJtRjJKeWs3WEc1Y2RHNWhkazkxZEdWeUxtbHVibVZ5U0ZSTlRDQTlJSFJsYlhCc1lYUmxPMXh1ZlR0Y2JseHVaWGh3YjNKMElHUmxabUYxYkhRZ2NtVnVaR1Z5VG1GMlRHYzdJaXdpYVcxd2IzSjBJSHNnSkd4dllXUnBibWNzSUNSdVlYWXNJQ1J3WVhKaGJHeGhlQ3dnSkdOdmJuUmxiblFzSUNSMGFYUnNaU3dnSkdGeWNtOTNMQ0FrYlc5a1lXd3NJQ1JzYVdkb2RHSnZlQ3dnSkhacFpYY2dmU0JtY205dElDY3VMaTlqYjI1emRHRnVkSE1uTzF4dVhHNWpiMjV6ZENCa1pXSnZkVzVqWlNBOUlDaG1iaXdnZEdsdFpTa2dQVDRnZTF4dUlDQnNaWFFnZEdsdFpXOTFkRHRjYmx4dUlDQnlaWFIxY200Z1puVnVZM1JwYjI0b0tTQjdYRzRnSUNBZ1kyOXVjM1FnWm5WdVkzUnBiMjVEWVd4c0lEMGdLQ2tnUFQ0Z1ptNHVZWEJ3Ykhrb2RHaHBjeXdnWVhKbmRXMWxiblJ6S1R0Y2JpQWdJQ0JjYmlBZ0lDQmpiR1ZoY2xScGJXVnZkWFFvZEdsdFpXOTFkQ2s3WEc0Z0lDQWdkR2x0Wlc5MWRDQTlJSE5sZEZScGJXVnZkWFFvWm5WdVkzUnBiMjVEWVd4c0xDQjBhVzFsS1R0Y2JpQWdmVnh1ZlR0Y2JseHVZMjl1YzNRZ2FHbGtaVXh2WVdScGJtY2dQU0FvS1NBOVBpQjdYRzVjZENSc2IyRmthVzVuTG1admNrVmhZMmdvWld4bGJTQTlQaUJsYkdWdExtTnNZWE56VEdsemRDNWhaR1FvSjNKbFlXUjVKeWtwTzF4dVhIUWtibUYyTG1Oc1lYTnpUR2x6ZEM1aFpHUW9KM0psWVdSNUp5azdYRzU5TzF4dVhHNWpiMjV6ZENCelkzSnZiR3hVYjFSdmNDQTlJQ2dwSUQwK0lIdGNibHgwYkdWMElIUnZjQ0E5SUdSdlkzVnRaVzUwTG1kbGRFVnNaVzFsYm5SQ2VVbGtLQ2RoYm1Ob2IzSXRkR0Z5WjJWMEp5azdYRzVjZEhSdmNDNXpZM0p2Ykd4SmJuUnZWbWxsZHloN1ltVm9ZWFpwYjNJNklGd2ljMjF2YjNSb1hDSXNJR0pzYjJOck9pQmNJbk4wWVhKMFhDSjlLVHRjYm4wN1hHNWNibU52Ym5OMElHMWhhMlZUYkdsa1pYSWdQU0FvSkhOc2FXUmxjaWtnUFQ0Z2UxeHVYSFJqYjI1emRDQWtZWEp5YjNkT1pYaDBJRDBnSkhOc2FXUmxjaTV3WVhKbGJuUkZiR1Z0Wlc1MExuRjFaWEo1VTJWc1pXTjBiM0lvSnk1aGNuSnZkeTF1WlhoMEp5azdYRzVjZEdOdmJuTjBJQ1JoY25KdmQxQnlaWFlnUFNBa2MyeHBaR1Z5TG5CaGNtVnVkRVZzWlcxbGJuUXVjWFZsY25sVFpXeGxZM1J2Y2lnbkxtRnljbTkzTFhCeVpYWW5LVHRjYmx4dVhIUnNaWFFnWTNWeWNtVnVkQ0E5SUNSemJHbGtaWEl1Wm1seWMzUkZiR1Z0Wlc1MFEyaHBiR1E3WEc1Y2RDUmhjbkp2ZDA1bGVIUXVZV1JrUlhabGJuUk1hWE4wWlc1bGNpZ25ZMnhwWTJzbkxDQW9LU0E5UGlCN1hHNWNkRngwWTI5dWMzUWdibVY0ZENBOUlHTjFjbkpsYm5RdWJtVjRkRVZzWlcxbGJuUlRhV0pzYVc1bk8xeHVYSFJjZEdsbUlDaHVaWGgwS1NCN1hHNWNkRngwWEhSdVpYaDBMbk5qY205c2JFbHVkRzlXYVdWM0tIdGlaV2hoZG1sdmNqb2dYQ0p6Ylc5dmRHaGNJaXdnWW14dlkyczZJRndpYm1WaGNtVnpkRndpTENCcGJteHBibVU2SUZ3aVkyVnVkR1Z5WENKOUtUdGNibHgwWEhSY2RHTjFjbkpsYm5RZ1BTQnVaWGgwTzF4dVhIUmNkSDFjYmx4MGZTazdYRzVjYmx4MEpHRnljbTkzVUhKbGRpNWhaR1JGZG1WdWRFeHBjM1JsYm1WeUtDZGpiR2xqYXljc0lDZ3BJRDArSUh0Y2JseDBYSFJqYjI1emRDQndjbVYySUQwZ1kzVnljbVZ1ZEM1d2NtVjJhVzkxYzBWc1pXMWxiblJUYVdKc2FXNW5PMXh1WEhSY2RHbG1JQ2h3Y21WMktTQjdYRzVjZEZ4MFhIUndjbVYyTG5OamNtOXNiRWx1ZEc5V2FXVjNLSHRpWldoaGRtbHZjam9nWENKemJXOXZkR2hjSWl3Z1lteHZZMnM2SUZ3aWJtVmhjbVZ6ZEZ3aUxDQnBibXhwYm1VNklGd2lZMlZ1ZEdWeVhDSjlLVHRjYmx4MFhIUmNkR04xY25KbGJuUWdQU0J3Y21WMk8xeHVYSFJjZEgxY2JseDBmU2xjYm4wN1hHNWNibVY0Y0c5eWRDQjdJR1JsWW05MWJtTmxMQ0JvYVdSbFRHOWhaR2x1Wnl3Z2MyTnliMnhzVkc5VWIzQXNJRzFoYTJWVGJHbGtaWElnZlRzaVhYMD0ifQ==
