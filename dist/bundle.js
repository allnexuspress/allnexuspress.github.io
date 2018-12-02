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

var $loading = Array.from(document.querySelectorAll('.loading'));
var $nav = document.getElementById('js-nav');
var $parallax = document.querySelector('.parallax');
var $content = document.querySelector('.content');
var $title = document.getElementById('js-title');
var $upArrow = document.getElementById('js-arrow');
var $modal = document.querySelector('.modal');
var $lightbox = document.querySelector('.lightbox');
var $view = document.querySelector('.lightbox-view');

exports.DB = DB;
exports.$loading = $loading;
exports.$nav = $nav;
exports.$parallax = $parallax;
exports.$content = $content;
exports.$title = $title;
exports.$upArrow = $upArrow;
exports.$modal = $modal;
exports.$lightbox = $lightbox;
exports.$view = $view;

},{}],3:[function(require,module,exports){
'use strict';

var _smoothscrollPolyfill = require('smoothscroll-polyfill');

var _smoothscrollPolyfill2 = _interopRequireDefault(_smoothscrollPolyfill);

var _modules = require('./modules');

var _templates = require('./templates');

var _utils = require('./utils');

var _constants = require('./constants');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var sortKey = 0; // 0 = artist, 1 = title
var entries = { byAuthor: [], byTitle: [] };
var currentLetter = 'A';
var lightbox = false;

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

var renderEntries = function renderEntries() {
	var $articleList = document.getElementById('js-list');
	var entriesList = sortKey ? entries.byTitle : entries.byAuthor;

	$articleList.innerHTML = '';

	entriesList.forEach(function (entry, i) {
		$articleList.insertAdjacentHTML('beforeend', (0, _templates.articleTemplate)(entry, i));
		(0, _modules.makeSlider)(document.getElementById('slider-' + i));
	});

	attachImageListeners();
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
	addSortButtonListeners();
	(0, _modules.attachUpArrowListeners)();
	(0, _modules.attachModalListeners)();
};

init();

},{"./constants":2,"./modules":6,"./templates":10,"./utils":12,"smoothscroll-polyfill":1}],4:[function(require,module,exports){
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

},{"../constants":2}],5:[function(require,module,exports){
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

},{"../constants":2,"../utils":12}],6:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.makeSlider = exports.makeAlphabet = exports.attachUpArrowListeners = exports.attachModalListeners = undefined;

var _attachModalListeners = require('./attachModalListeners');

var _attachModalListeners2 = _interopRequireDefault(_attachModalListeners);

var _attachUpArrowListeners = require('./attachUpArrowListeners');

var _attachUpArrowListeners2 = _interopRequireDefault(_attachUpArrowListeners);

var _makeAlphabet = require('./makeAlphabet');

var _makeAlphabet2 = _interopRequireDefault(_makeAlphabet);

var _makeSlider = require('./makeSlider');

var _makeSlider2 = _interopRequireDefault(_makeSlider);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.attachModalListeners = _attachModalListeners2.default;
exports.attachUpArrowListeners = _attachUpArrowListeners2.default;
exports.makeAlphabet = _makeAlphabet2.default;
exports.makeSlider = _makeSlider2.default;

},{"./attachModalListeners":4,"./attachUpArrowListeners":5,"./makeAlphabet":7,"./makeSlider":8}],7:[function(require,module,exports){
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

},{}],8:[function(require,module,exports){
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

},{}],9:[function(require,module,exports){
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

},{}],10:[function(require,module,exports){
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

},{"./article":9,"./navLg":11}],11:[function(require,module,exports){
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

},{}],12:[function(require,module,exports){
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

},{"../constants":2}]},{},[3])

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvc21vb3Roc2Nyb2xsLXBvbHlmaWxsL2Rpc3Qvc21vb3Roc2Nyb2xsLmpzIiwic3JjL2pzL2NvbnN0YW50cy5qcyIsInNyYy9qcy9pbmRleC5qcyIsInNyYy9qcy9tb2R1bGVzL2F0dGFjaE1vZGFsTGlzdGVuZXJzLmpzIiwic3JjL2pzL21vZHVsZXMvYXR0YWNoVXBBcnJvd0xpc3RlbmVycy5qcyIsInNyYy9qcy9tb2R1bGVzL2luZGV4LmpzIiwic3JjL2pzL21vZHVsZXMvbWFrZUFscGhhYmV0LmpzIiwic3JjL2pzL21vZHVsZXMvbWFrZVNsaWRlci5qcyIsInNyYy9qcy90ZW1wbGF0ZXMvYXJ0aWNsZS5qcyIsInNyYy9qcy90ZW1wbGF0ZXMvaW5kZXguanMiLCJzcmMvanMvdGVtcGxhdGVzL25hdkxnLmpzIiwic3JjL2pzL3V0aWxzL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7OztBQ3ZiQSxJQUFNLEtBQUssK0ZB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Q0FIRDs7a0JBS2UsVzs7Ozs7Ozs7OztBQ3RCZjs7QUFFQSxJQUFNLFdBQVcsU0FBWCxRQUFXLENBQUMsRUFBRCxFQUFLLElBQUwsRUFBYztBQUM3QixNQUFJLGdCQUFKOztBQUVBLFNBQU8sWUFBVztBQUFBO0FBQUE7O0FBQ2hCLFFBQU0sZUFBZSxTQUFmLFlBQWU7QUFBQSxhQUFNLEdBQUcsS0FBSCxDQUFTLEtBQVQsRUFBZSxVQUFmLENBQU47QUFBQSxLQUFyQjs7QUFFQSxpQkFBYSxPQUFiO0FBQ0EsY0FBVSxXQUFXLFlBQVgsRUFBeUIsSUFBekIsQ0FBVjtBQUNELEdBTEQ7QUFNRCxDQVREOztBQVdBLElBQU0sY0FBYyxTQUFkLFdBQWMsR0FBTTtBQUN6QixzQkFBUyxPQUFULENBQWlCO0FBQUEsV0FBUSxLQUFLLFNBQUwsQ0FBZSxHQUFmLENBQW1CLE9BQW5CLENBQVI7QUFBQSxHQUFqQjtBQUNBLGtCQUFLLFNBQUwsQ0FBZSxHQUFmLENBQW1CLE9BQW5CO0FBQ0EsQ0FIRDs7QUFLQSxJQUFNLGNBQWMsU0FBZCxXQUFjLEdBQU07QUFDekIsTUFBSSxNQUFNLFNBQVMsY0FBVCxDQUF3QixlQUF4QixDQUFWO0FBQ0EsTUFBSSxjQUFKLENBQW1CLEVBQUMsVUFBVSxRQUFYLEVBQXFCLE9BQU8sT0FBNUIsRUFBbkI7QUFDQSxDQUhEOztRQUtTLFEsR0FBQSxRO1FBQVUsVyxHQUFBLFc7UUFBYSxXLEdBQUEsVyIsImZpbGUiOiJidW5kbGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiLyogc21vb3Roc2Nyb2xsIHYwLjQuMCAtIDIwMTggLSBEdXN0YW4gS2FzdGVuLCBKZXJlbWlhcyBNZW5pY2hlbGxpIC0gTUlUIExpY2Vuc2UgKi9cbihmdW5jdGlvbiAoKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICAvLyBwb2x5ZmlsbFxuICBmdW5jdGlvbiBwb2x5ZmlsbCgpIHtcbiAgICAvLyBhbGlhc2VzXG4gICAgdmFyIHcgPSB3aW5kb3c7XG4gICAgdmFyIGQgPSBkb2N1bWVudDtcblxuICAgIC8vIHJldHVybiBpZiBzY3JvbGwgYmVoYXZpb3IgaXMgc3VwcG9ydGVkIGFuZCBwb2x5ZmlsbCBpcyBub3QgZm9yY2VkXG4gICAgaWYgKFxuICAgICAgJ3Njcm9sbEJlaGF2aW9yJyBpbiBkLmRvY3VtZW50RWxlbWVudC5zdHlsZSAmJlxuICAgICAgdy5fX2ZvcmNlU21vb3RoU2Nyb2xsUG9seWZpbGxfXyAhPT0gdHJ1ZVxuICAgICkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIGdsb2JhbHNcbiAgICB2YXIgRWxlbWVudCA9IHcuSFRNTEVsZW1lbnQgfHwgdy5FbGVtZW50O1xuICAgIHZhciBTQ1JPTExfVElNRSA9IDQ2ODtcblxuICAgIC8vIG9iamVjdCBnYXRoZXJpbmcgb3JpZ2luYWwgc2Nyb2xsIG1ldGhvZHNcbiAgICB2YXIgb3JpZ2luYWwgPSB7XG4gICAgICBzY3JvbGw6IHcuc2Nyb2xsIHx8IHcuc2Nyb2xsVG8sXG4gICAgICBzY3JvbGxCeTogdy5zY3JvbGxCeSxcbiAgICAgIGVsZW1lbnRTY3JvbGw6IEVsZW1lbnQucHJvdG90eXBlLnNjcm9sbCB8fCBzY3JvbGxFbGVtZW50LFxuICAgICAgc2Nyb2xsSW50b1ZpZXc6IEVsZW1lbnQucHJvdG90eXBlLnNjcm9sbEludG9WaWV3XG4gICAgfTtcblxuICAgIC8vIGRlZmluZSB0aW1pbmcgbWV0aG9kXG4gICAgdmFyIG5vdyA9XG4gICAgICB3LnBlcmZvcm1hbmNlICYmIHcucGVyZm9ybWFuY2Uubm93XG4gICAgICAgID8gdy5wZXJmb3JtYW5jZS5ub3cuYmluZCh3LnBlcmZvcm1hbmNlKVxuICAgICAgICA6IERhdGUubm93O1xuXG4gICAgLyoqXG4gICAgICogaW5kaWNhdGVzIGlmIGEgdGhlIGN1cnJlbnQgYnJvd3NlciBpcyBtYWRlIGJ5IE1pY3Jvc29mdFxuICAgICAqIEBtZXRob2QgaXNNaWNyb3NvZnRCcm93c2VyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHVzZXJBZ2VudFxuICAgICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGlzTWljcm9zb2Z0QnJvd3Nlcih1c2VyQWdlbnQpIHtcbiAgICAgIHZhciB1c2VyQWdlbnRQYXR0ZXJucyA9IFsnTVNJRSAnLCAnVHJpZGVudC8nLCAnRWRnZS8nXTtcblxuICAgICAgcmV0dXJuIG5ldyBSZWdFeHAodXNlckFnZW50UGF0dGVybnMuam9pbignfCcpKS50ZXN0KHVzZXJBZ2VudCk7XG4gICAgfVxuXG4gICAgLypcbiAgICAgKiBJRSBoYXMgcm91bmRpbmcgYnVnIHJvdW5kaW5nIGRvd24gY2xpZW50SGVpZ2h0IGFuZCBjbGllbnRXaWR0aCBhbmRcbiAgICAgKiByb3VuZGluZyB1cCBzY3JvbGxIZWlnaHQgYW5kIHNjcm9sbFdpZHRoIGNhdXNpbmcgZmFsc2UgcG9zaXRpdmVzXG4gICAgICogb24gaGFzU2Nyb2xsYWJsZVNwYWNlXG4gICAgICovXG4gICAgdmFyIFJPVU5ESU5HX1RPTEVSQU5DRSA9IGlzTWljcm9zb2Z0QnJvd3Nlcih3Lm5hdmlnYXRvci51c2VyQWdlbnQpID8gMSA6IDA7XG5cbiAgICAvKipcbiAgICAgKiBjaGFuZ2VzIHNjcm9sbCBwb3NpdGlvbiBpbnNpZGUgYW4gZWxlbWVudFxuICAgICAqIEBtZXRob2Qgc2Nyb2xsRWxlbWVudFxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSB4XG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHlcbiAgICAgKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHNjcm9sbEVsZW1lbnQoeCwgeSkge1xuICAgICAgdGhpcy5zY3JvbGxMZWZ0ID0geDtcbiAgICAgIHRoaXMuc2Nyb2xsVG9wID0geTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiByZXR1cm5zIHJlc3VsdCBvZiBhcHBseWluZyBlYXNlIG1hdGggZnVuY3Rpb24gdG8gYSBudW1iZXJcbiAgICAgKiBAbWV0aG9kIGVhc2VcbiAgICAgKiBAcGFyYW0ge051bWJlcn0ga1xuICAgICAqIEByZXR1cm5zIHtOdW1iZXJ9XG4gICAgICovXG4gICAgZnVuY3Rpb24gZWFzZShrKSB7XG4gICAgICByZXR1cm4gMC41ICogKDEgLSBNYXRoLmNvcyhNYXRoLlBJICogaykpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGluZGljYXRlcyBpZiBhIHNtb290aCBiZWhhdmlvciBzaG91bGQgYmUgYXBwbGllZFxuICAgICAqIEBtZXRob2Qgc2hvdWxkQmFpbE91dFxuICAgICAqIEBwYXJhbSB7TnVtYmVyfE9iamVjdH0gZmlyc3RBcmdcbiAgICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzaG91bGRCYWlsT3V0KGZpcnN0QXJnKSB7XG4gICAgICBpZiAoXG4gICAgICAgIGZpcnN0QXJnID09PSBudWxsIHx8XG4gICAgICAgIHR5cGVvZiBmaXJzdEFyZyAhPT0gJ29iamVjdCcgfHxcbiAgICAgICAgZmlyc3RBcmcuYmVoYXZpb3IgPT09IHVuZGVmaW5lZCB8fFxuICAgICAgICBmaXJzdEFyZy5iZWhhdmlvciA9PT0gJ2F1dG8nIHx8XG4gICAgICAgIGZpcnN0QXJnLmJlaGF2aW9yID09PSAnaW5zdGFudCdcbiAgICAgICkge1xuICAgICAgICAvLyBmaXJzdCBhcmd1bWVudCBpcyBub3QgYW4gb2JqZWN0L251bGxcbiAgICAgICAgLy8gb3IgYmVoYXZpb3IgaXMgYXV0bywgaW5zdGFudCBvciB1bmRlZmluZWRcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG5cbiAgICAgIGlmICh0eXBlb2YgZmlyc3RBcmcgPT09ICdvYmplY3QnICYmIGZpcnN0QXJnLmJlaGF2aW9yID09PSAnc21vb3RoJykge1xuICAgICAgICAvLyBmaXJzdCBhcmd1bWVudCBpcyBhbiBvYmplY3QgYW5kIGJlaGF2aW9yIGlzIHNtb290aFxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIC8vIHRocm93IGVycm9yIHdoZW4gYmVoYXZpb3IgaXMgbm90IHN1cHBvcnRlZFxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICAgJ2JlaGF2aW9yIG1lbWJlciBvZiBTY3JvbGxPcHRpb25zICcgK1xuICAgICAgICAgIGZpcnN0QXJnLmJlaGF2aW9yICtcbiAgICAgICAgICAnIGlzIG5vdCBhIHZhbGlkIHZhbHVlIGZvciBlbnVtZXJhdGlvbiBTY3JvbGxCZWhhdmlvci4nXG4gICAgICApO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGluZGljYXRlcyBpZiBhbiBlbGVtZW50IGhhcyBzY3JvbGxhYmxlIHNwYWNlIGluIHRoZSBwcm92aWRlZCBheGlzXG4gICAgICogQG1ldGhvZCBoYXNTY3JvbGxhYmxlU3BhY2VcbiAgICAgKiBAcGFyYW0ge05vZGV9IGVsXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGF4aXNcbiAgICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBoYXNTY3JvbGxhYmxlU3BhY2UoZWwsIGF4aXMpIHtcbiAgICAgIGlmIChheGlzID09PSAnWScpIHtcbiAgICAgICAgcmV0dXJuIGVsLmNsaWVudEhlaWdodCArIFJPVU5ESU5HX1RPTEVSQU5DRSA8IGVsLnNjcm9sbEhlaWdodDtcbiAgICAgIH1cblxuICAgICAgaWYgKGF4aXMgPT09ICdYJykge1xuICAgICAgICByZXR1cm4gZWwuY2xpZW50V2lkdGggKyBST1VORElOR19UT0xFUkFOQ0UgPCBlbC5zY3JvbGxXaWR0aDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBpbmRpY2F0ZXMgaWYgYW4gZWxlbWVudCBoYXMgYSBzY3JvbGxhYmxlIG92ZXJmbG93IHByb3BlcnR5IGluIHRoZSBheGlzXG4gICAgICogQG1ldGhvZCBjYW5PdmVyZmxvd1xuICAgICAqIEBwYXJhbSB7Tm9kZX0gZWxcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gYXhpc1xuICAgICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGNhbk92ZXJmbG93KGVsLCBheGlzKSB7XG4gICAgICB2YXIgb3ZlcmZsb3dWYWx1ZSA9IHcuZ2V0Q29tcHV0ZWRTdHlsZShlbCwgbnVsbClbJ292ZXJmbG93JyArIGF4aXNdO1xuXG4gICAgICByZXR1cm4gb3ZlcmZsb3dWYWx1ZSA9PT0gJ2F1dG8nIHx8IG92ZXJmbG93VmFsdWUgPT09ICdzY3JvbGwnO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGluZGljYXRlcyBpZiBhbiBlbGVtZW50IGNhbiBiZSBzY3JvbGxlZCBpbiBlaXRoZXIgYXhpc1xuICAgICAqIEBtZXRob2QgaXNTY3JvbGxhYmxlXG4gICAgICogQHBhcmFtIHtOb2RlfSBlbFxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBheGlzXG4gICAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAgICovXG4gICAgZnVuY3Rpb24gaXNTY3JvbGxhYmxlKGVsKSB7XG4gICAgICB2YXIgaXNTY3JvbGxhYmxlWSA9IGhhc1Njcm9sbGFibGVTcGFjZShlbCwgJ1knKSAmJiBjYW5PdmVyZmxvdyhlbCwgJ1knKTtcbiAgICAgIHZhciBpc1Njcm9sbGFibGVYID0gaGFzU2Nyb2xsYWJsZVNwYWNlKGVsLCAnWCcpICYmIGNhbk92ZXJmbG93KGVsLCAnWCcpO1xuXG4gICAgICByZXR1cm4gaXNTY3JvbGxhYmxlWSB8fCBpc1Njcm9sbGFibGVYO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGZpbmRzIHNjcm9sbGFibGUgcGFyZW50IG9mIGFuIGVsZW1lbnRcbiAgICAgKiBAbWV0aG9kIGZpbmRTY3JvbGxhYmxlUGFyZW50XG4gICAgICogQHBhcmFtIHtOb2RlfSBlbFxuICAgICAqIEByZXR1cm5zIHtOb2RlfSBlbFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGZpbmRTY3JvbGxhYmxlUGFyZW50KGVsKSB7XG4gICAgICB2YXIgaXNCb2R5O1xuXG4gICAgICBkbyB7XG4gICAgICAgIGVsID0gZWwucGFyZW50Tm9kZTtcblxuICAgICAgICBpc0JvZHkgPSBlbCA9PT0gZC5ib2R5O1xuICAgICAgfSB3aGlsZSAoaXNCb2R5ID09PSBmYWxzZSAmJiBpc1Njcm9sbGFibGUoZWwpID09PSBmYWxzZSk7XG5cbiAgICAgIGlzQm9keSA9IG51bGw7XG5cbiAgICAgIHJldHVybiBlbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBzZWxmIGludm9rZWQgZnVuY3Rpb24gdGhhdCwgZ2l2ZW4gYSBjb250ZXh0LCBzdGVwcyB0aHJvdWdoIHNjcm9sbGluZ1xuICAgICAqIEBtZXRob2Qgc3RlcFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBjb250ZXh0XG4gICAgICogQHJldHVybnMge3VuZGVmaW5lZH1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzdGVwKGNvbnRleHQpIHtcbiAgICAgIHZhciB0aW1lID0gbm93KCk7XG4gICAgICB2YXIgdmFsdWU7XG4gICAgICB2YXIgY3VycmVudFg7XG4gICAgICB2YXIgY3VycmVudFk7XG4gICAgICB2YXIgZWxhcHNlZCA9ICh0aW1lIC0gY29udGV4dC5zdGFydFRpbWUpIC8gU0NST0xMX1RJTUU7XG5cbiAgICAgIC8vIGF2b2lkIGVsYXBzZWQgdGltZXMgaGlnaGVyIHRoYW4gb25lXG4gICAgICBlbGFwc2VkID0gZWxhcHNlZCA+IDEgPyAxIDogZWxhcHNlZDtcblxuICAgICAgLy8gYXBwbHkgZWFzaW5nIHRvIGVsYXBzZWQgdGltZVxuICAgICAgdmFsdWUgPSBlYXNlKGVsYXBzZWQpO1xuXG4gICAgICBjdXJyZW50WCA9IGNvbnRleHQuc3RhcnRYICsgKGNvbnRleHQueCAtIGNvbnRleHQuc3RhcnRYKSAqIHZhbHVlO1xuICAgICAgY3VycmVudFkgPSBjb250ZXh0LnN0YXJ0WSArIChjb250ZXh0LnkgLSBjb250ZXh0LnN0YXJ0WSkgKiB2YWx1ZTtcblxuICAgICAgY29udGV4dC5tZXRob2QuY2FsbChjb250ZXh0LnNjcm9sbGFibGUsIGN1cnJlbnRYLCBjdXJyZW50WSk7XG5cbiAgICAgIC8vIHNjcm9sbCBtb3JlIGlmIHdlIGhhdmUgbm90IHJlYWNoZWQgb3VyIGRlc3RpbmF0aW9uXG4gICAgICBpZiAoY3VycmVudFggIT09IGNvbnRleHQueCB8fCBjdXJyZW50WSAhPT0gY29udGV4dC55KSB7XG4gICAgICAgIHcucmVxdWVzdEFuaW1hdGlvbkZyYW1lKHN0ZXAuYmluZCh3LCBjb250ZXh0KSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogc2Nyb2xscyB3aW5kb3cgb3IgZWxlbWVudCB3aXRoIGEgc21vb3RoIGJlaGF2aW9yXG4gICAgICogQG1ldGhvZCBzbW9vdGhTY3JvbGxcbiAgICAgKiBAcGFyYW0ge09iamVjdHxOb2RlfSBlbFxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSB4XG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHlcbiAgICAgKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHNtb290aFNjcm9sbChlbCwgeCwgeSkge1xuICAgICAgdmFyIHNjcm9sbGFibGU7XG4gICAgICB2YXIgc3RhcnRYO1xuICAgICAgdmFyIHN0YXJ0WTtcbiAgICAgIHZhciBtZXRob2Q7XG4gICAgICB2YXIgc3RhcnRUaW1lID0gbm93KCk7XG5cbiAgICAgIC8vIGRlZmluZSBzY3JvbGwgY29udGV4dFxuICAgICAgaWYgKGVsID09PSBkLmJvZHkpIHtcbiAgICAgICAgc2Nyb2xsYWJsZSA9IHc7XG4gICAgICAgIHN0YXJ0WCA9IHcuc2Nyb2xsWCB8fCB3LnBhZ2VYT2Zmc2V0O1xuICAgICAgICBzdGFydFkgPSB3LnNjcm9sbFkgfHwgdy5wYWdlWU9mZnNldDtcbiAgICAgICAgbWV0aG9kID0gb3JpZ2luYWwuc2Nyb2xsO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2Nyb2xsYWJsZSA9IGVsO1xuICAgICAgICBzdGFydFggPSBlbC5zY3JvbGxMZWZ0O1xuICAgICAgICBzdGFydFkgPSBlbC5zY3JvbGxUb3A7XG4gICAgICAgIG1ldGhvZCA9IHNjcm9sbEVsZW1lbnQ7XG4gICAgICB9XG5cbiAgICAgIC8vIHNjcm9sbCBsb29waW5nIG92ZXIgYSBmcmFtZVxuICAgICAgc3RlcCh7XG4gICAgICAgIHNjcm9sbGFibGU6IHNjcm9sbGFibGUsXG4gICAgICAgIG1ldGhvZDogbWV0aG9kLFxuICAgICAgICBzdGFydFRpbWU6IHN0YXJ0VGltZSxcbiAgICAgICAgc3RhcnRYOiBzdGFydFgsXG4gICAgICAgIHN0YXJ0WTogc3RhcnRZLFxuICAgICAgICB4OiB4LFxuICAgICAgICB5OiB5XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBPUklHSU5BTCBNRVRIT0RTIE9WRVJSSURFU1xuICAgIC8vIHcuc2Nyb2xsIGFuZCB3LnNjcm9sbFRvXG4gICAgdy5zY3JvbGwgPSB3LnNjcm9sbFRvID0gZnVuY3Rpb24oKSB7XG4gICAgICAvLyBhdm9pZCBhY3Rpb24gd2hlbiBubyBhcmd1bWVudHMgYXJlIHBhc3NlZFxuICAgICAgaWYgKGFyZ3VtZW50c1swXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gYXZvaWQgc21vb3RoIGJlaGF2aW9yIGlmIG5vdCByZXF1aXJlZFxuICAgICAgaWYgKHNob3VsZEJhaWxPdXQoYXJndW1lbnRzWzBdKSA9PT0gdHJ1ZSkge1xuICAgICAgICBvcmlnaW5hbC5zY3JvbGwuY2FsbChcbiAgICAgICAgICB3LFxuICAgICAgICAgIGFyZ3VtZW50c1swXS5sZWZ0ICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8gYXJndW1lbnRzWzBdLmxlZnRcbiAgICAgICAgICAgIDogdHlwZW9mIGFyZ3VtZW50c1swXSAhPT0gJ29iamVjdCdcbiAgICAgICAgICAgICAgPyBhcmd1bWVudHNbMF1cbiAgICAgICAgICAgICAgOiB3LnNjcm9sbFggfHwgdy5wYWdlWE9mZnNldCxcbiAgICAgICAgICAvLyB1c2UgdG9wIHByb3AsIHNlY29uZCBhcmd1bWVudCBpZiBwcmVzZW50IG9yIGZhbGxiYWNrIHRvIHNjcm9sbFlcbiAgICAgICAgICBhcmd1bWVudHNbMF0udG9wICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8gYXJndW1lbnRzWzBdLnRvcFxuICAgICAgICAgICAgOiBhcmd1bWVudHNbMV0gIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgICA/IGFyZ3VtZW50c1sxXVxuICAgICAgICAgICAgICA6IHcuc2Nyb2xsWSB8fCB3LnBhZ2VZT2Zmc2V0XG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBMRVQgVEhFIFNNT09USE5FU1MgQkVHSU4hXG4gICAgICBzbW9vdGhTY3JvbGwuY2FsbChcbiAgICAgICAgdyxcbiAgICAgICAgZC5ib2R5LFxuICAgICAgICBhcmd1bWVudHNbMF0ubGVmdCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgPyB+fmFyZ3VtZW50c1swXS5sZWZ0XG4gICAgICAgICAgOiB3LnNjcm9sbFggfHwgdy5wYWdlWE9mZnNldCxcbiAgICAgICAgYXJndW1lbnRzWzBdLnRvcCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgPyB+fmFyZ3VtZW50c1swXS50b3BcbiAgICAgICAgICA6IHcuc2Nyb2xsWSB8fCB3LnBhZ2VZT2Zmc2V0XG4gICAgICApO1xuICAgIH07XG5cbiAgICAvLyB3LnNjcm9sbEJ5XG4gICAgdy5zY3JvbGxCeSA9IGZ1bmN0aW9uKCkge1xuICAgICAgLy8gYXZvaWQgYWN0aW9uIHdoZW4gbm8gYXJndW1lbnRzIGFyZSBwYXNzZWRcbiAgICAgIGlmIChhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIGF2b2lkIHNtb290aCBiZWhhdmlvciBpZiBub3QgcmVxdWlyZWRcbiAgICAgIGlmIChzaG91bGRCYWlsT3V0KGFyZ3VtZW50c1swXSkpIHtcbiAgICAgICAgb3JpZ2luYWwuc2Nyb2xsQnkuY2FsbChcbiAgICAgICAgICB3LFxuICAgICAgICAgIGFyZ3VtZW50c1swXS5sZWZ0ICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8gYXJndW1lbnRzWzBdLmxlZnRcbiAgICAgICAgICAgIDogdHlwZW9mIGFyZ3VtZW50c1swXSAhPT0gJ29iamVjdCcgPyBhcmd1bWVudHNbMF0gOiAwLFxuICAgICAgICAgIGFyZ3VtZW50c1swXS50b3AgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyBhcmd1bWVudHNbMF0udG9wXG4gICAgICAgICAgICA6IGFyZ3VtZW50c1sxXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzFdIDogMFxuICAgICAgICApO1xuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gTEVUIFRIRSBTTU9PVEhORVNTIEJFR0lOIVxuICAgICAgc21vb3RoU2Nyb2xsLmNhbGwoXG4gICAgICAgIHcsXG4gICAgICAgIGQuYm9keSxcbiAgICAgICAgfn5hcmd1bWVudHNbMF0ubGVmdCArICh3LnNjcm9sbFggfHwgdy5wYWdlWE9mZnNldCksXG4gICAgICAgIH5+YXJndW1lbnRzWzBdLnRvcCArICh3LnNjcm9sbFkgfHwgdy5wYWdlWU9mZnNldClcbiAgICAgICk7XG4gICAgfTtcblxuICAgIC8vIEVsZW1lbnQucHJvdG90eXBlLnNjcm9sbCBhbmQgRWxlbWVudC5wcm90b3R5cGUuc2Nyb2xsVG9cbiAgICBFbGVtZW50LnByb3RvdHlwZS5zY3JvbGwgPSBFbGVtZW50LnByb3RvdHlwZS5zY3JvbGxUbyA9IGZ1bmN0aW9uKCkge1xuICAgICAgLy8gYXZvaWQgYWN0aW9uIHdoZW4gbm8gYXJndW1lbnRzIGFyZSBwYXNzZWRcbiAgICAgIGlmIChhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIGF2b2lkIHNtb290aCBiZWhhdmlvciBpZiBub3QgcmVxdWlyZWRcbiAgICAgIGlmIChzaG91bGRCYWlsT3V0KGFyZ3VtZW50c1swXSkgPT09IHRydWUpIHtcbiAgICAgICAgLy8gaWYgb25lIG51bWJlciBpcyBwYXNzZWQsIHRocm93IGVycm9yIHRvIG1hdGNoIEZpcmVmb3ggaW1wbGVtZW50YXRpb25cbiAgICAgICAgaWYgKHR5cGVvZiBhcmd1bWVudHNbMF0gPT09ICdudW1iZXInICYmIGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFN5bnRheEVycm9yKCdWYWx1ZSBjb3VsZCBub3QgYmUgY29udmVydGVkJyk7XG4gICAgICAgIH1cblxuICAgICAgICBvcmlnaW5hbC5lbGVtZW50U2Nyb2xsLmNhbGwoXG4gICAgICAgICAgdGhpcyxcbiAgICAgICAgICAvLyB1c2UgbGVmdCBwcm9wLCBmaXJzdCBudW1iZXIgYXJndW1lbnQgb3IgZmFsbGJhY2sgdG8gc2Nyb2xsTGVmdFxuICAgICAgICAgIGFyZ3VtZW50c1swXS5sZWZ0ICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8gfn5hcmd1bWVudHNbMF0ubGVmdFxuICAgICAgICAgICAgOiB0eXBlb2YgYXJndW1lbnRzWzBdICE9PSAnb2JqZWN0JyA/IH5+YXJndW1lbnRzWzBdIDogdGhpcy5zY3JvbGxMZWZ0LFxuICAgICAgICAgIC8vIHVzZSB0b3AgcHJvcCwgc2Vjb25kIGFyZ3VtZW50IG9yIGZhbGxiYWNrIHRvIHNjcm9sbFRvcFxuICAgICAgICAgIGFyZ3VtZW50c1swXS50b3AgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyB+fmFyZ3VtZW50c1swXS50b3BcbiAgICAgICAgICAgIDogYXJndW1lbnRzWzFdICE9PSB1bmRlZmluZWQgPyB+fmFyZ3VtZW50c1sxXSA6IHRoaXMuc2Nyb2xsVG9wXG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB2YXIgbGVmdCA9IGFyZ3VtZW50c1swXS5sZWZ0O1xuICAgICAgdmFyIHRvcCA9IGFyZ3VtZW50c1swXS50b3A7XG5cbiAgICAgIC8vIExFVCBUSEUgU01PT1RITkVTUyBCRUdJTiFcbiAgICAgIHNtb290aFNjcm9sbC5jYWxsKFxuICAgICAgICB0aGlzLFxuICAgICAgICB0aGlzLFxuICAgICAgICB0eXBlb2YgbGVmdCA9PT0gJ3VuZGVmaW5lZCcgPyB0aGlzLnNjcm9sbExlZnQgOiB+fmxlZnQsXG4gICAgICAgIHR5cGVvZiB0b3AgPT09ICd1bmRlZmluZWQnID8gdGhpcy5zY3JvbGxUb3AgOiB+fnRvcFxuICAgICAgKTtcbiAgICB9O1xuXG4gICAgLy8gRWxlbWVudC5wcm90b3R5cGUuc2Nyb2xsQnlcbiAgICBFbGVtZW50LnByb3RvdHlwZS5zY3JvbGxCeSA9IGZ1bmN0aW9uKCkge1xuICAgICAgLy8gYXZvaWQgYWN0aW9uIHdoZW4gbm8gYXJndW1lbnRzIGFyZSBwYXNzZWRcbiAgICAgIGlmIChhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIGF2b2lkIHNtb290aCBiZWhhdmlvciBpZiBub3QgcmVxdWlyZWRcbiAgICAgIGlmIChzaG91bGRCYWlsT3V0KGFyZ3VtZW50c1swXSkgPT09IHRydWUpIHtcbiAgICAgICAgb3JpZ2luYWwuZWxlbWVudFNjcm9sbC5jYWxsKFxuICAgICAgICAgIHRoaXMsXG4gICAgICAgICAgYXJndW1lbnRzWzBdLmxlZnQgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyB+fmFyZ3VtZW50c1swXS5sZWZ0ICsgdGhpcy5zY3JvbGxMZWZ0XG4gICAgICAgICAgICA6IH5+YXJndW1lbnRzWzBdICsgdGhpcy5zY3JvbGxMZWZ0LFxuICAgICAgICAgIGFyZ3VtZW50c1swXS50b3AgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyB+fmFyZ3VtZW50c1swXS50b3AgKyB0aGlzLnNjcm9sbFRvcFxuICAgICAgICAgICAgOiB+fmFyZ3VtZW50c1sxXSArIHRoaXMuc2Nyb2xsVG9wXG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB0aGlzLnNjcm9sbCh7XG4gICAgICAgIGxlZnQ6IH5+YXJndW1lbnRzWzBdLmxlZnQgKyB0aGlzLnNjcm9sbExlZnQsXG4gICAgICAgIHRvcDogfn5hcmd1bWVudHNbMF0udG9wICsgdGhpcy5zY3JvbGxUb3AsXG4gICAgICAgIGJlaGF2aW9yOiBhcmd1bWVudHNbMF0uYmVoYXZpb3JcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICAvLyBFbGVtZW50LnByb3RvdHlwZS5zY3JvbGxJbnRvVmlld1xuICAgIEVsZW1lbnQucHJvdG90eXBlLnNjcm9sbEludG9WaWV3ID0gZnVuY3Rpb24oKSB7XG4gICAgICAvLyBhdm9pZCBzbW9vdGggYmVoYXZpb3IgaWYgbm90IHJlcXVpcmVkXG4gICAgICBpZiAoc2hvdWxkQmFpbE91dChhcmd1bWVudHNbMF0pID09PSB0cnVlKSB7XG4gICAgICAgIG9yaWdpbmFsLnNjcm9sbEludG9WaWV3LmNhbGwoXG4gICAgICAgICAgdGhpcyxcbiAgICAgICAgICBhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCA/IHRydWUgOiBhcmd1bWVudHNbMF1cbiAgICAgICAgKTtcblxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIExFVCBUSEUgU01PT1RITkVTUyBCRUdJTiFcbiAgICAgIHZhciBzY3JvbGxhYmxlUGFyZW50ID0gZmluZFNjcm9sbGFibGVQYXJlbnQodGhpcyk7XG4gICAgICB2YXIgcGFyZW50UmVjdHMgPSBzY3JvbGxhYmxlUGFyZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgdmFyIGNsaWVudFJlY3RzID0gdGhpcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcblxuICAgICAgaWYgKHNjcm9sbGFibGVQYXJlbnQgIT09IGQuYm9keSkge1xuICAgICAgICAvLyByZXZlYWwgZWxlbWVudCBpbnNpZGUgcGFyZW50XG4gICAgICAgIHNtb290aFNjcm9sbC5jYWxsKFxuICAgICAgICAgIHRoaXMsXG4gICAgICAgICAgc2Nyb2xsYWJsZVBhcmVudCxcbiAgICAgICAgICBzY3JvbGxhYmxlUGFyZW50LnNjcm9sbExlZnQgKyBjbGllbnRSZWN0cy5sZWZ0IC0gcGFyZW50UmVjdHMubGVmdCxcbiAgICAgICAgICBzY3JvbGxhYmxlUGFyZW50LnNjcm9sbFRvcCArIGNsaWVudFJlY3RzLnRvcCAtIHBhcmVudFJlY3RzLnRvcFxuICAgICAgICApO1xuXG4gICAgICAgIC8vIHJldmVhbCBwYXJlbnQgaW4gdmlld3BvcnQgdW5sZXNzIGlzIGZpeGVkXG4gICAgICAgIGlmICh3LmdldENvbXB1dGVkU3R5bGUoc2Nyb2xsYWJsZVBhcmVudCkucG9zaXRpb24gIT09ICdmaXhlZCcpIHtcbiAgICAgICAgICB3LnNjcm9sbEJ5KHtcbiAgICAgICAgICAgIGxlZnQ6IHBhcmVudFJlY3RzLmxlZnQsXG4gICAgICAgICAgICB0b3A6IHBhcmVudFJlY3RzLnRvcCxcbiAgICAgICAgICAgIGJlaGF2aW9yOiAnc21vb3RoJ1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyByZXZlYWwgZWxlbWVudCBpbiB2aWV3cG9ydFxuICAgICAgICB3LnNjcm9sbEJ5KHtcbiAgICAgICAgICBsZWZ0OiBjbGllbnRSZWN0cy5sZWZ0LFxuICAgICAgICAgIHRvcDogY2xpZW50UmVjdHMudG9wLFxuICAgICAgICAgIGJlaGF2aW9yOiAnc21vb3RoJ1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgaWYgKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykge1xuICAgIC8vIGNvbW1vbmpzXG4gICAgbW9kdWxlLmV4cG9ydHMgPSB7IHBvbHlmaWxsOiBwb2x5ZmlsbCB9O1xuICB9IGVsc2Uge1xuICAgIC8vIGdsb2JhbFxuICAgIHBvbHlmaWxsKCk7XG4gIH1cblxufSgpKTtcbiIsImNvbnN0IERCID0gJ2h0dHBzOi8vbmV4dXMtY2F0YWxvZy5maXJlYmFzZWlvLmNvbS9wb3N0cy5qc29uP2F1dGg9N2c3cHlLS3lrTjNONWV3ckltaE9hUzZ2d3JGc2M1Zktrcms4ZWp6Zic7XG5cbmNvbnN0ICRsb2FkaW5nID0gQXJyYXkuZnJvbShkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcubG9hZGluZycpKTtcbmNvbnN0ICRuYXYgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnanMtbmF2Jyk7XG5jb25zdCAkcGFyYWxsYXggPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcucGFyYWxsYXgnKTtcbmNvbnN0ICRjb250ZW50ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmNvbnRlbnQnKTtcbmNvbnN0ICR0aXRsZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdqcy10aXRsZScpO1xuY29uc3QgJHVwQXJyb3cgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnanMtYXJyb3cnKTtcbmNvbnN0ICRtb2RhbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5tb2RhbCcpO1xuY29uc3QgJGxpZ2h0Ym94ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmxpZ2h0Ym94Jyk7XG5jb25zdCAkdmlldyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5saWdodGJveC12aWV3Jyk7XG5cbmV4cG9ydCB7IFxuXHREQixcblx0JGxvYWRpbmcsIFxuXHQkbmF2LCBcblx0JHBhcmFsbGF4LFxuXHQkY29udGVudCxcblx0JHRpdGxlLFxuXHQkdXBBcnJvdyxcblx0JG1vZGFsLFxuXHQkbGlnaHRib3gsXG5cdCR2aWV3IFxufTsiLCJpbXBvcnQgc21vb3Roc2Nyb2xsIGZyb20gJ3Ntb290aHNjcm9sbC1wb2x5ZmlsbCc7XG5cbmltcG9ydCB7IGF0dGFjaE1vZGFsTGlzdGVuZXJzLCBhdHRhY2hVcEFycm93TGlzdGVuZXJzLCBtYWtlQWxwaGFiZXQsIG1ha2VTbGlkZXIgfSBmcm9tICcuL21vZHVsZXMnO1xuaW1wb3J0IHsgYXJ0aWNsZVRlbXBsYXRlLCByZW5kZXJOYXZMZyB9IGZyb20gJy4vdGVtcGxhdGVzJztcbmltcG9ydCB7IGRlYm91bmNlLCBoaWRlTG9hZGluZywgc2Nyb2xsVG9Ub3AgfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IERCLCAkbmF2LCAkcGFyYWxsYXgsICRjb250ZW50LCAkdGl0bGUsICR1cEFycm93LCAkbGlnaHRib3gsICR2aWV3IH0gZnJvbSAnLi9jb25zdGFudHMnO1xuXG5sZXQgc29ydEtleSA9IDA7IC8vIDAgPSBhcnRpc3QsIDEgPSB0aXRsZVxubGV0IGVudHJpZXMgPSB7IGJ5QXV0aG9yOiBbXSwgYnlUaXRsZTogW10gfTtcbmxldCBjdXJyZW50TGV0dGVyID0gJ0EnO1xubGV0IGxpZ2h0Ym94ID0gZmFsc2U7XG5cbmNvbnN0IGFkZFNvcnRCdXR0b25MaXN0ZW5lcnMgPSAoKSA9PiB7XG5cdGxldCAkYnlBcnRpc3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnanMtYnktYXJ0aXN0Jyk7XG5cdGxldCAkYnlUaXRsZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdqcy1ieS10aXRsZScpO1xuXHQkYnlBcnRpc3QuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0aWYgKHNvcnRLZXkpIHtcblx0XHRcdHNjcm9sbFRvVG9wKCk7XG5cdFx0XHRzb3J0S2V5ID0gMDtcblx0XHRcdCRieUFydGlzdC5jbGFzc0xpc3QuYWRkKCdhY3RpdmUnKTtcblx0XHRcdCRieVRpdGxlLmNsYXNzTGlzdC5yZW1vdmUoJ2FjdGl2ZScpO1xuXG5cdFx0XHRyZW5kZXJFbnRyaWVzKCk7XG5cdFx0fVxuXHR9KTtcblxuXHQkYnlUaXRsZS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHRpZiAoIXNvcnRLZXkpIHtcblx0XHRcdHNjcm9sbFRvVG9wKCk7XG5cdFx0XHRzb3J0S2V5ID0gMTtcblx0XHRcdCRieVRpdGxlLmNsYXNzTGlzdC5hZGQoJ2FjdGl2ZScpO1xuXHRcdFx0JGJ5QXJ0aXN0LmNsYXNzTGlzdC5yZW1vdmUoJ2FjdGl2ZScpO1xuXG5cdFx0XHRyZW5kZXJFbnRyaWVzKCk7XG5cdFx0fVxuXHR9KTtcbn07XG5cbmNvbnN0IGF0dGFjaEltYWdlTGlzdGVuZXJzID0gKCkgPT4ge1xuXHRjb25zdCAkaW1hZ2VzID0gQXJyYXkuZnJvbShkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuYXJ0aWNsZS1pbWFnZScpKTtcblxuXHQkaW1hZ2VzLmZvckVhY2goaW1nID0+IHtcblx0XHRpbWcuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZXZ0KSA9PiB7XG5cdFx0XHRpZiAoIWxpZ2h0Ym94KSB7XG5cdFx0XHRcdGxldCBzcmMgPSBpbWcuc3JjO1xuXHRcdFx0XHRcblx0XHRcdFx0JGxpZ2h0Ym94LmNsYXNzTGlzdC5hZGQoJ3Nob3ctaW1nJyk7XG5cdFx0XHRcdCR2aWV3LnNldEF0dHJpYnV0ZSgnc3R5bGUnLCBgYmFja2dyb3VuZC1pbWFnZTogdXJsKCR7c3JjfSlgKTtcblx0XHRcdFx0bGlnaHRib3ggPSB0cnVlO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9KTtcblxuXHQkdmlldy5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHRpZiAobGlnaHRib3gpIHtcblx0XHRcdCRsaWdodGJveC5jbGFzc0xpc3QucmVtb3ZlKCdzaG93LWltZycpO1xuXHRcdFx0bGlnaHRib3ggPSBmYWxzZTtcblx0XHR9XG5cdH0pO1xufTtcblxuY29uc3QgcmVuZGVyRW50cmllcyA9ICgpID0+IHtcblx0Y29uc3QgJGFydGljbGVMaXN0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2pzLWxpc3QnKTtcblx0Y29uc3QgZW50cmllc0xpc3QgPSBzb3J0S2V5ID8gZW50cmllcy5ieVRpdGxlIDogZW50cmllcy5ieUF1dGhvcjtcblxuXHQkYXJ0aWNsZUxpc3QuaW5uZXJIVE1MID0gJyc7XG5cblx0ZW50cmllc0xpc3QuZm9yRWFjaCgoZW50cnksIGkpID0+IHtcblx0XHQkYXJ0aWNsZUxpc3QuaW5zZXJ0QWRqYWNlbnRIVE1MKCdiZWZvcmVlbmQnLCBhcnRpY2xlVGVtcGxhdGUoZW50cnksIGkpKTtcblx0XHRtYWtlU2xpZGVyKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGBzbGlkZXItJHtpfWApKTtcblx0fSk7XG5cblx0YXR0YWNoSW1hZ2VMaXN0ZW5lcnMoKTtcblx0bWFrZUFscGhhYmV0KHNvcnRLZXkpO1xufTtcblxuY29uc3Qgc2V0RGF0YUFuZFNvcnRCeVRpdGxlID0gKGRhdGEpID0+IHtcblx0ZW50cmllcy5ieUF1dGhvciA9IGRhdGE7XG5cdGVudHJpZXMuYnlUaXRsZSA9IGRhdGEuc2xpY2UoKTsgLy8gY29waWVzIGRhdGEgZm9yIGJ5VGl0bGUgc29ydFxuXG5cdGVudHJpZXMuYnlUaXRsZS5zb3J0KChhLCBiKSA9PiB7XG5cdFx0bGV0IGFUaXRsZSA9IGEudGl0bGVbMF0udG9VcHBlckNhc2UoKTtcblx0XHRsZXQgYlRpdGxlID0gYi50aXRsZVswXS50b1VwcGVyQ2FzZSgpO1xuXHRcdGlmIChhVGl0bGUgPiBiVGl0bGUpIHJldHVybiAxO1xuXHRcdGVsc2UgaWYgKGFUaXRsZSA8IGJUaXRsZSkgcmV0dXJuIC0xO1xuXHRcdGVsc2UgcmV0dXJuIDA7XG5cdH0pO1xufTtcblxuY29uc3QgZmV0Y2hEYXRhID0gKCkgPT4ge1xuXHRmZXRjaChEQikudGhlbihyZXMgPT4gcmVzLmpzb24oKSlcblx0LnRoZW4oZGF0YSA9PiB7XG5cdFx0c2V0RGF0YUFuZFNvcnRCeVRpdGxlKGRhdGEpO1xuXHRcdHJlbmRlckVudHJpZXMoKTtcblx0XHRoaWRlTG9hZGluZygpO1xuXHR9KVxuXHQuY2F0Y2goZXJyID0+IGNvbnNvbGUud2FybihlcnIpKTtcbn07XG5cbmNvbnN0IGluaXQgPSAoKSA9PiB7XG5cdHNtb290aHNjcm9sbC5wb2x5ZmlsbCgpO1xuXHRmZXRjaERhdGEoKTtcblx0cmVuZGVyTmF2TGcoKTtcblx0YWRkU29ydEJ1dHRvbkxpc3RlbmVycygpO1xuXHRhdHRhY2hVcEFycm93TGlzdGVuZXJzKCk7XG5cdGF0dGFjaE1vZGFsTGlzdGVuZXJzKCk7XG59XG5cbmluaXQoKTtcbiIsImltcG9ydCB7ICRtb2RhbCB9IGZyb20gJy4uL2NvbnN0YW50cyc7XG5cbmxldCBtb2RhbCA9IGZhbHNlO1xuY29uc3QgYXR0YWNoTW9kYWxMaXN0ZW5lcnMgPSAoKSA9PiB7XG5cdGNvbnN0ICRmaW5kID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2pzLWZpbmQnKTtcblx0XG5cdCRmaW5kLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuXHRcdCRtb2RhbC5jbGFzc0xpc3QuYWRkKCdzaG93Jyk7XG5cdFx0bW9kYWwgPSB0cnVlO1xuXHR9KTtcblxuXHQkbW9kYWwuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0JG1vZGFsLmNsYXNzTGlzdC5yZW1vdmUoJ3Nob3cnKTtcblx0XHRtb2RhbCA9IGZhbHNlO1xuXHR9KTtcblxuXHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsICgpID0+IHtcblx0XHRpZiAobW9kYWwpIHtcblx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge1xuXHRcdFx0XHQkbW9kYWwuY2xhc3NMaXN0LnJlbW92ZSgnc2hvdycpO1xuXHRcdFx0XHRtb2RhbCA9IGZhbHNlO1xuXHRcdFx0fSwgNjAwKTtcblx0XHR9O1xuXHR9KTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGF0dGFjaE1vZGFsTGlzdGVuZXJzOyIsImltcG9ydCB7ICR0aXRsZSwgJHBhcmFsbGF4LCAkdXBBcnJvdyB9IGZyb20gJy4uL2NvbnN0YW50cyc7XG5pbXBvcnQgeyBzY3JvbGxUb1RvcCB9IGZyb20gJy4uL3V0aWxzJztcblxubGV0IHByZXY7XG5sZXQgY3VycmVudCA9IDA7XG5sZXQgaXNTaG93aW5nID0gZmFsc2U7XG5cbmNvbnN0IGF0dGFjaFVwQXJyb3dMaXN0ZW5lcnMgPSAoKSA9PiB7XG5cdCRwYXJhbGxheC5hZGRFdmVudExpc3RlbmVyKCdzY3JvbGwnLCAoKSA9PiB7XG5cdFx0bGV0IHkgPSAkdGl0bGUuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkueTtcblxuXHRcdGlmIChjdXJyZW50ICE9PSB5KSB7XG5cdFx0XHRwcmV2ID0gY3VycmVudDtcblx0XHRcdGN1cnJlbnQgPSB5O1xuXHRcdH07XG5cblx0XHRpZiAoeSA8PSAtNTAgJiYgIWlzU2hvd2luZykge1xuXHRcdFx0JHVwQXJyb3cuY2xhc3NMaXN0LmFkZCgnc2hvdycpO1xuXHRcdFx0aXNTaG93aW5nID0gdHJ1ZTtcblx0XHR9IGVsc2UgaWYgKHkgPiAtNTAgJiYgaXNTaG93aW5nKSB7XG5cdFx0XHQkdXBBcnJvdy5jbGFzc0xpc3QucmVtb3ZlKCdzaG93Jyk7XG5cdFx0XHRpc1Nob3dpbmcgPSBmYWxzZTtcblx0XHR9XG5cdH0pO1xuXG5cdCR1cEFycm93LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4gc2Nyb2xsVG9Ub3AoKSk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCBhdHRhY2hVcEFycm93TGlzdGVuZXJzOyIsImltcG9ydCBhdHRhY2hNb2RhbExpc3RlbmVycyBmcm9tICcuL2F0dGFjaE1vZGFsTGlzdGVuZXJzJztcbmltcG9ydCBhdHRhY2hVcEFycm93TGlzdGVuZXJzIGZyb20gJy4vYXR0YWNoVXBBcnJvd0xpc3RlbmVycyc7XG5pbXBvcnQgbWFrZUFscGhhYmV0IGZyb20gJy4vbWFrZUFscGhhYmV0JztcbmltcG9ydCBtYWtlU2xpZGVyIGZyb20gJy4vbWFrZVNsaWRlcic7XG5cbmV4cG9ydCB7IFxuXHRhdHRhY2hNb2RhbExpc3RlbmVycywgXG5cdGF0dGFjaFVwQXJyb3dMaXN0ZW5lcnMsIFxuXHRtYWtlQWxwaGFiZXQsIFxuXHRtYWtlU2xpZGVyIFxufTsiLCJjb25zdCBhbHBoYWJldCA9IFsnYScsICdiJywgJ2MnLCAnZCcsICdlJywgJ2YnLCAnZycsICdoJywgJ2knLCAnaicsICdrJywgJ2wnLCAnbScsICduJywgJ28nLCAncCcsICdyJywgJ3MnLCAndCcsICd1JywgJ3YnLCAndycsICd5JywgJ3onXTtcblxuY29uc3QgbWFrZUFscGhhYmV0ID0gKHNvcnRLZXkpID0+IHtcblx0Y29uc3QgZmluZEZpcnN0RW50cnkgPSAoY2hhcikgPT4ge1xuXHRcdGNvbnN0IHNlbGVjdG9yID0gc29ydEtleSA/ICcuanMtZW50cnktdGl0bGUnIDogJy5qcy1lbnRyeS1hcnRpc3QnO1xuXHRcdGNvbnN0IHByZXZTZWxlY3RvciA9ICFzb3J0S2V5ID8gJy5qcy1lbnRyeS10aXRsZScgOiAnLmpzLWVudHJ5LWFydGlzdCc7XG5cblx0XHRjb25zdCAkZW50cmllcyA9IEFycmF5LmZyb20oZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChzZWxlY3RvcikpO1xuXHRcdGNvbnN0ICRwcmV2RW50cmllcyA9IEFycmF5LmZyb20oZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChwcmV2U2VsZWN0b3IpKTtcblxuXHRcdCRwcmV2RW50cmllcy5mb3JFYWNoKGVudHJ5ID0+IGVudHJ5LnJlbW92ZUF0dHJpYnV0ZSgnbmFtZScpKTtcblxuXHRcdHJldHVybiAkZW50cmllcy5maW5kKGVudHJ5ID0+IHtcblx0XHRcdGxldCBub2RlID0gZW50cnkubmV4dEVsZW1lbnRTaWJsaW5nO1xuXHRcdFx0cmV0dXJuIG5vZGUuaW5uZXJIVE1MWzBdID09PSBjaGFyIHx8IG5vZGUuaW5uZXJIVE1MWzBdID09PSBjaGFyLnRvVXBwZXJDYXNlKCk7XG5cdFx0fSk7XG5cdH07XG5cblx0Y29uc3QgYXR0YWNoQW5jaG9yTGlzdGVuZXIgPSAoJGFuY2hvciwgbGV0dGVyKSA9PiB7XG5cdFx0JGFuY2hvci5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHRcdGNvbnN0IGxldHRlck5vZGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChsZXR0ZXIpO1xuXHRcdFx0bGV0IHRhcmdldDtcblxuXHRcdFx0aWYgKCFzb3J0S2V5KSB7XG5cdFx0XHRcdHRhcmdldCA9IGxldHRlciA9PT0gJ2EnID8gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2FuY2hvci10YXJnZXQnKSA6IGxldHRlck5vZGUucGFyZW50RWxlbWVudC5wYXJlbnRFbGVtZW50LnBhcmVudEVsZW1lbnQucGFyZW50RWxlbWVudC5wcmV2aW91c0VsZW1lbnRTaWJsaW5nLnF1ZXJ5U2VsZWN0b3IoJy5qcy1hcnRpY2xlLWFuY2hvci10YXJnZXQnKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRhcmdldCA9IGxldHRlciA9PT0gJ2EnID8gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2FuY2hvci10YXJnZXQnKSA6IGxldHRlck5vZGUucGFyZW50RWxlbWVudC5wYXJlbnRFbGVtZW50LnBhcmVudEVsZW1lbnQucHJldmlvdXNFbGVtZW50U2libGluZy5xdWVyeVNlbGVjdG9yKCcuanMtYXJ0aWNsZS1hbmNob3ItdGFyZ2V0Jyk7XG5cdFx0XHR9O1xuXG5cdFx0XHR0YXJnZXQuc2Nyb2xsSW50b1ZpZXcoe2JlaGF2aW9yOiBcInNtb290aFwiLCBibG9jazogXCJzdGFydFwifSk7XG5cdFx0fSk7XG5cdH07XG5cblx0bGV0IGFjdGl2ZUVudHJpZXMgPSB7fTtcblx0bGV0ICRvdXRlciA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5hbHBoYWJldF9fbGV0dGVycycpO1xuXHQkb3V0ZXIuaW5uZXJIVE1MID0gJyc7XG5cblx0YWxwaGFiZXQuZm9yRWFjaChsZXR0ZXIgPT4ge1xuXHRcdGxldCAkZmlyc3RFbnRyeSA9IGZpbmRGaXJzdEVudHJ5KGxldHRlcik7XG5cdFx0bGV0ICRhbmNob3IgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG5cblx0XHRpZiAoISRmaXJzdEVudHJ5KSByZXR1cm47XG5cblx0XHQkZmlyc3RFbnRyeS5pZCA9IGxldHRlcjtcblx0XHQkYW5jaG9yLmlubmVySFRNTCA9IGxldHRlci50b1VwcGVyQ2FzZSgpO1xuXHRcdCRhbmNob3IuY2xhc3NOYW1lID0gJ2FscGhhYmV0X19sZXR0ZXItYW5jaG9yJztcblxuXHRcdGF0dGFjaEFuY2hvckxpc3RlbmVyKCRhbmNob3IsIGxldHRlcik7XG5cdFx0JG91dGVyLmFwcGVuZENoaWxkKCRhbmNob3IpO1xuXHR9KTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IG1ha2VBbHBoYWJldDsiLCJjb25zdCBtYWtlU2xpZGVyID0gKCRzbGlkZXIpID0+IHtcblx0Y29uc3QgJGFycm93TmV4dCA9ICRzbGlkZXIucGFyZW50RWxlbWVudC5xdWVyeVNlbGVjdG9yKCcuYXJyb3ctbmV4dCcpO1xuXHRjb25zdCAkYXJyb3dQcmV2ID0gJHNsaWRlci5wYXJlbnRFbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJy5hcnJvdy1wcmV2Jyk7XG5cblx0bGV0IGN1cnJlbnQgPSAkc2xpZGVyLmZpcnN0RWxlbWVudENoaWxkO1xuXHQkYXJyb3dOZXh0LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuXHRcdGNvbnN0IG5leHQgPSBjdXJyZW50Lm5leHRFbGVtZW50U2libGluZztcblx0XHRpZiAobmV4dCkge1xuXHRcdFx0bmV4dC5zY3JvbGxJbnRvVmlldyh7YmVoYXZpb3I6IFwic21vb3RoXCIsIGJsb2NrOiBcIm5lYXJlc3RcIiwgaW5saW5lOiBcImNlbnRlclwifSk7XG5cdFx0XHRjdXJyZW50ID0gbmV4dDtcblx0XHR9XG5cdH0pO1xuXG5cdCRhcnJvd1ByZXYuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0Y29uc3QgcHJldiA9IGN1cnJlbnQucHJldmlvdXNFbGVtZW50U2libGluZztcblx0XHRpZiAocHJldikge1xuXHRcdFx0cHJldi5zY3JvbGxJbnRvVmlldyh7YmVoYXZpb3I6IFwic21vb3RoXCIsIGJsb2NrOiBcIm5lYXJlc3RcIiwgaW5saW5lOiBcImNlbnRlclwifSk7XG5cdFx0XHRjdXJyZW50ID0gcHJldjtcblx0XHR9XG5cdH0pXG59O1xuXG5leHBvcnQgZGVmYXVsdCBtYWtlU2xpZGVyOyIsImNvbnN0IGltYWdlVGVtcGxhdGUgPSAoaW1hZ2UpID0+IGA8aW1nIGNsYXNzPVwiYXJ0aWNsZS1pbWdcIiBzcmM9XCIuLi8uLi9hc3NldHMvaW1hZ2VzLyR7aW1hZ2V9XCI+PC9pbWc+YDtcblxuY29uc3QgYXJ0aWNsZVRlbXBsYXRlID0gKGVudHJ5LCBpKSA9PiB7XG5cdGNvbnN0IHsgdGl0bGUsIGZpcnN0TmFtZSwgbGFzdE5hbWUsIGltYWdlcywgZGVzY3JpcHRpb24sIGRldGFpbCB9ID0gZW50cnk7XG5cblx0Y29uc3QgaW1hZ2VIVE1MID0gaW1hZ2VzLmxlbmd0aCA/IFxuXHRcdGltYWdlcy5tYXAoaW1hZ2UgPT4gaW1hZ2VUZW1wbGF0ZShpbWFnZSkpLmpvaW4oJycpIDogJyc7XG5cblx0cmV0dXJuICBgXG5cdFx0PGFydGljbGUgY2xhc3M9XCJhcnRpY2xlX19vdXRlclwiPlxuXHRcdFx0PGRpdiBjbGFzcz1cImFydGljbGVfX2lubmVyXCI+XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlX19oZWFkaW5nXCI+XG5cdFx0XHRcdFx0PGEgY2xhc3M9XCJqcy1lbnRyeS10aXRsZVwiPjwvYT5cblx0XHRcdFx0XHQ8aDIgY2xhc3M9XCJhcnRpY2xlLWhlYWRpbmdfX3RpdGxlXCI+JHt0aXRsZX08L2gyPlxuXHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlLWhlYWRpbmdfX25hbWVcIj5cblx0XHRcdFx0XHRcdDxzcGFuIGNsYXNzPVwiYXJ0aWNsZS1oZWFkaW5nX19uYW1lLS1maXJzdFwiPiR7Zmlyc3ROYW1lfTwvc3Bhbj5cblx0XHRcdFx0XHRcdDxhIGNsYXNzPVwianMtZW50cnktYXJ0aXN0XCI+PC9hPlxuXHRcdFx0XHRcdFx0PHNwYW4gY2xhc3M9XCJhcnRpY2xlLWhlYWRpbmdfX25hbWUtLWxhc3RcIj4ke2xhc3ROYW1lfTwvc3Bhbj5cblx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0PC9kaXY+XHRcblx0XHRcdFx0PGRpdiBjbGFzcz1cImFydGljbGVfX3NsaWRlci1vdXRlclwiPlxuXHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlX19zbGlkZXItaW5uZXJcIiBpZD1cInNsaWRlci0ke2l9XCI+XG5cdFx0XHRcdFx0XHQke2ltYWdlSFRNTH1cblx0XHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlLWRlc2NyaXB0aW9uX19vdXRlclwiPlxuXHRcdFx0XHRcdFx0XHQ8ZGl2IGNsYXNzPVwiYXJ0aWNsZS1kZXNjcmlwdGlvblwiPiR7ZGVzY3JpcHRpb259PC9kaXY+XG5cdFx0XHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlLWRldGFpbFwiPiR7ZGV0YWlsfTwvZGl2PlxuXHRcdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdFx0PGRpdiBjbGFzcz1cImFydGljbGVfX3Njcm9sbC1jb250cm9sc1wiPlxuXHRcdFx0XHRcdFx0PHNwYW4gY2xhc3M9XCJjb250cm9scyBhcnJvdy1wcmV2XCI+4oaQPC9zcGFuPiBcblx0XHRcdFx0XHRcdDxzcGFuIGNsYXNzPVwiY29udHJvbHMgYXJyb3ctbmV4dFwiPuKGkjwvc3Bhbj5cblx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0XHQ8cCBjbGFzcz1cImpzLWFydGljbGUtYW5jaG9yLXRhcmdldFwiPjwvcD5cblx0XHRcdDwvZGl2PlxuXHRcdDwvYXJ0aWNsZT5cblx0YFxufTtcblxuZXhwb3J0IGRlZmF1bHQgYXJ0aWNsZVRlbXBsYXRlOyIsImltcG9ydCBhcnRpY2xlVGVtcGxhdGUgZnJvbSAnLi9hcnRpY2xlJztcbmltcG9ydCByZW5kZXJOYXZMZyBmcm9tICcuL25hdkxnJztcblxuZXhwb3J0IHsgYXJ0aWNsZVRlbXBsYXRlLCByZW5kZXJOYXZMZyB9OyIsImNvbnN0IHRlbXBsYXRlID0gXG5cdGA8ZGl2IGNsYXNzPVwibmF2X19pbm5lclwiPlxuXHRcdDxkaXYgY2xhc3M9XCJuYXZfX3NvcnQtYnlcIj5cblx0XHRcdDxzcGFuIGNsYXNzPVwic29ydC1ieV9fdGl0bGVcIj5Tb3J0IGJ5PC9zcGFuPlxuXHRcdFx0PGJ1dHRvbiBjbGFzcz1cInNvcnQtYnkgc29ydC1ieV9fYnktYXJ0aXN0IGFjdGl2ZVwiIGlkPVwianMtYnktYXJ0aXN0XCI+QXJ0aXN0PC9idXR0b24+XG5cdFx0XHQ8c3BhbiBjbGFzcz1cInNvcnQtYnlfX2RpdmlkZXJcIj4gfCA8L3NwYW4+XG5cdFx0XHQ8YnV0dG9uIGNsYXNzPVwic29ydC1ieSBzb3J0LWJ5X19ieS10aXRsZVwiIGlkPVwianMtYnktdGl0bGVcIj5UaXRsZTwvYnV0dG9uPlxuXHRcdFx0PHNwYW4gY2xhc3M9XCJmaW5kXCIgaWQ9XCJqcy1maW5kXCI+XG5cdFx0XHRcdCg8c3BhbiBjbGFzcz1cImZpbmQtLWlubmVyXCI+JiM4OTg0O0Y8L3NwYW4+KVxuXHRcdFx0PC9zcGFuPlxuXHRcdDwvZGl2PlxuXHRcdDxkaXYgY2xhc3M9XCJuYXZfX2FscGhhYmV0XCI+XG5cdFx0XHQ8c3BhbiBjbGFzcz1cImFscGhhYmV0X190aXRsZVwiPkdvIHRvPC9zcGFuPlxuXHRcdFx0PGRpdiBjbGFzcz1cImFscGhhYmV0X19sZXR0ZXJzXCI+PC9kaXY+XG5cdFx0PC9kaXY+XG5cdDwvZGl2PmA7XG5cbmNvbnN0IHJlbmRlck5hdkxnID0gKCkgPT4ge1xuXHRsZXQgbmF2T3V0ZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnanMtbmF2Jyk7XG5cdG5hdk91dGVyLmlubmVySFRNTCA9IHRlbXBsYXRlO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgcmVuZGVyTmF2TGc7IiwiaW1wb3J0IHsgJGxvYWRpbmcsICRuYXYsICRwYXJhbGxheCwgJGNvbnRlbnQsICR0aXRsZSwgJGFycm93LCAkbW9kYWwsICRsaWdodGJveCwgJHZpZXcgfSBmcm9tICcuLi9jb25zdGFudHMnO1xuXG5jb25zdCBkZWJvdW5jZSA9IChmbiwgdGltZSkgPT4ge1xuICBsZXQgdGltZW91dDtcblxuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgY29uc3QgZnVuY3Rpb25DYWxsID0gKCkgPT4gZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICBcbiAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgdGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb25DYWxsLCB0aW1lKTtcbiAgfVxufTtcblxuY29uc3QgaGlkZUxvYWRpbmcgPSAoKSA9PiB7XG5cdCRsb2FkaW5nLmZvckVhY2goZWxlbSA9PiBlbGVtLmNsYXNzTGlzdC5hZGQoJ3JlYWR5JykpO1xuXHQkbmF2LmNsYXNzTGlzdC5hZGQoJ3JlYWR5Jyk7XG59O1xuXG5jb25zdCBzY3JvbGxUb1RvcCA9ICgpID0+IHtcblx0bGV0IHRvcCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhbmNob3ItdGFyZ2V0Jyk7XG5cdHRvcC5zY3JvbGxJbnRvVmlldyh7YmVoYXZpb3I6IFwic21vb3RoXCIsIGJsb2NrOiBcInN0YXJ0XCJ9KTtcbn07XG5cbmV4cG9ydCB7IGRlYm91bmNlLCBoaWRlTG9hZGluZywgc2Nyb2xsVG9Ub3AgfTsiXSwicHJlRXhpc3RpbmdDb21tZW50IjoiLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9dXRmLTg7YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0p6YjNWeVkyVnpJanBiSW01dlpHVmZiVzlrZFd4bGN5OWljbTkzYzJWeUxYQmhZMnN2WDNCeVpXeDFaR1V1YW5NaUxDSnViMlJsWDIxdlpIVnNaWE12YzIxdmIzUm9jMk55YjJ4c0xYQnZiSGxtYVd4c0wyUnBjM1F2YzIxdmIzUm9jMk55YjJ4c0xtcHpJaXdpYzNKakwycHpMMk52Ym5OMFlXNTBjeTVxY3lJc0luTnlZeTlxY3k5cGJtUmxlQzVxY3lJc0luTnlZeTlxY3k5dGIyUjFiR1Z6TDJGMGRHRmphRTF2WkdGc1RHbHpkR1Z1WlhKekxtcHpJaXdpYzNKakwycHpMMjF2WkhWc1pYTXZZWFIwWVdOb1ZYQkJjbkp2ZDB4cGMzUmxibVZ5Y3k1cWN5SXNJbk55WXk5cWN5OXRiMlIxYkdWekwybHVaR1Y0TG1weklpd2ljM0pqTDJwekwyMXZaSFZzWlhNdmJXRnJaVUZzY0doaFltVjBMbXB6SWl3aWMzSmpMMnB6TDIxdlpIVnNaWE12YldGclpWTnNhV1JsY2k1cWN5SXNJbk55WXk5cWN5OTBaVzF3YkdGMFpYTXZZWEowYVdOc1pTNXFjeUlzSW5OeVl5OXFjeTkwWlcxd2JHRjBaWE12YVc1a1pYZ3Vhbk1pTENKemNtTXZhbk12ZEdWdGNHeGhkR1Z6TDI1aGRreG5MbXB6SWl3aWMzSmpMMnB6TDNWMGFXeHpMMmx1WkdWNExtcHpJbDBzSW01aGJXVnpJanBiWFN3aWJXRndjR2x1WjNNaU9pSkJRVUZCTzBGRFFVRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUczdPenM3T3p0QlEzWmlRU3hKUVVGTkxFdEJRVXNzSzBaQlFWZzdPMEZCUlVFc1NVRkJUU3hYUVVGWExFMUJRVTBzU1VGQlRpeERRVUZYTEZOQlFWTXNaMEpCUVZRc1EwRkJNRUlzVlVGQk1VSXNRMEZCV0N4RFFVRnFRanRCUVVOQkxFbEJRVTBzVDBGQlR5eFRRVUZUTEdOQlFWUXNRMEZCZDBJc1VVRkJlRUlzUTBGQllqdEJRVU5CTEVsQlFVMHNXVUZCV1N4VFFVRlRMR0ZCUVZRc1EwRkJkVUlzVjBGQmRrSXNRMEZCYkVJN1FVRkRRU3hKUVVGTkxGZEJRVmNzVTBGQlV5eGhRVUZVTEVOQlFYVkNMRlZCUVhaQ0xFTkJRV3BDTzBGQlEwRXNTVUZCVFN4VFFVRlRMRk5CUVZNc1kwRkJWQ3hEUVVGM1FpeFZRVUY0UWl4RFFVRm1PMEZCUTBFc1NVRkJUU3hYUVVGWExGTkJRVk1zWTBGQlZDeERRVUYzUWl4VlFVRjRRaXhEUVVGcVFqdEJRVU5CTEVsQlFVMHNVMEZCVXl4VFFVRlRMR0ZCUVZRc1EwRkJkVUlzVVVGQmRrSXNRMEZCWmp0QlFVTkJMRWxCUVUwc1dVRkJXU3hUUVVGVExHRkJRVlFzUTBGQmRVSXNWMEZCZGtJc1EwRkJiRUk3UVVGRFFTeEpRVUZOTEZGQlFWRXNVMEZCVXl4aFFVRlVMRU5CUVhWQ0xHZENRVUYyUWl4RFFVRmtPenRSUVVkRExFVXNSMEZCUVN4Rk8xRkJRMEVzVVN4SFFVRkJMRkU3VVVGRFFTeEpMRWRCUVVFc1NUdFJRVU5CTEZNc1IwRkJRU3hUTzFGQlEwRXNVU3hIUVVGQkxGRTdVVUZEUVN4TkxFZEJRVUVzVFR0UlFVTkJMRkVzUjBGQlFTeFJPMUZCUTBFc1RTeEhRVUZCTEUwN1VVRkRRU3hUTEVkQlFVRXNVenRSUVVOQkxFc3NSMEZCUVN4TE96czdPenRCUTNSQ1JEczdPenRCUVVWQk96dEJRVU5CT3p0QlFVTkJPenRCUVVOQk96czdPMEZCUlVFc1NVRkJTU3hWUVVGVkxFTkJRV1FzUXl4RFFVRnBRanRCUVVOcVFpeEpRVUZKTEZWQlFWVXNSVUZCUlN4VlFVRlZMRVZCUVZvc1JVRkJaMElzVTBGQlV5eEZRVUY2UWl4RlFVRmtPMEZCUTBFc1NVRkJTU3huUWtGQlowSXNSMEZCY0VJN1FVRkRRU3hKUVVGSkxGZEJRVmNzUzBGQlpqczdRVUZGUVN4SlFVRk5MSGxDUVVGNVFpeFRRVUY2UWl4elFrRkJlVUlzUjBGQlRUdEJRVU53UXl4TFFVRkpMRmxCUVZrc1UwRkJVeXhqUVVGVUxFTkJRWGRDTEdOQlFYaENMRU5CUVdoQ08wRkJRMEVzUzBGQlNTeFhRVUZYTEZOQlFWTXNZMEZCVkN4RFFVRjNRaXhoUVVGNFFpeERRVUZtTzBGQlEwRXNWMEZCVlN4blFrRkJWaXhEUVVFeVFpeFBRVUV6UWl4RlFVRnZReXhaUVVGTk8wRkJRM3BETEUxQlFVa3NUMEZCU2l4RlFVRmhPMEZCUTFvN1FVRkRRU3hoUVVGVkxFTkJRVlk3UVVGRFFTeGhRVUZWTEZOQlFWWXNRMEZCYjBJc1IwRkJjRUlzUTBGQmQwSXNVVUZCZUVJN1FVRkRRU3haUVVGVExGTkJRVlFzUTBGQmJVSXNUVUZCYmtJc1EwRkJNRUlzVVVGQk1VSTdPMEZCUlVFN1FVRkRRVHRCUVVORUxFVkJWRVE3TzBGQlYwRXNWVUZCVXl4blFrRkJWQ3hEUVVFd1FpeFBRVUV4UWl4RlFVRnRReXhaUVVGTk8wRkJRM2hETEUxQlFVa3NRMEZCUXl4UFFVRk1MRVZCUVdNN1FVRkRZanRCUVVOQkxHRkJRVlVzUTBGQlZqdEJRVU5CTEZsQlFWTXNVMEZCVkN4RFFVRnRRaXhIUVVGdVFpeERRVUYxUWl4UlFVRjJRanRCUVVOQkxHRkJRVlVzVTBGQlZpeERRVUZ2UWl4TlFVRndRaXhEUVVFeVFpeFJRVUV6UWpzN1FVRkZRVHRCUVVOQk8wRkJRMFFzUlVGVVJEdEJRVlZCTEVOQmVFSkVPenRCUVRCQ1FTeEpRVUZOTEhWQ1FVRjFRaXhUUVVGMlFpeHZRa0ZCZFVJc1IwRkJUVHRCUVVOc1F5eExRVUZOTEZWQlFWVXNUVUZCVFN4SlFVRk9MRU5CUVZjc1UwRkJVeXhuUWtGQlZDeERRVUV3UWl4blFrRkJNVUlzUTBGQldDeERRVUZvUWpzN1FVRkZRU3hUUVVGUkxFOUJRVklzUTBGQlowSXNaVUZCVHp0QlFVTjBRaXhOUVVGSkxHZENRVUZLTEVOQlFYRkNMRTlCUVhKQ0xFVkJRVGhDTEZWQlFVTXNSMEZCUkN4RlFVRlRPMEZCUTNSRExFOUJRVWtzUTBGQlF5eFJRVUZNTEVWQlFXVTdRVUZEWkN4UlFVRkpMRTFCUVUwc1NVRkJTU3hIUVVGa096dEJRVVZCTEhsQ1FVRlZMRk5CUVZZc1EwRkJiMElzUjBGQmNFSXNRMEZCZDBJc1ZVRkJlRUk3UVVGRFFTeHhRa0ZCVFN4WlFVRk9MRU5CUVcxQ0xFOUJRVzVDTERaQ1FVRnhSQ3hIUVVGeVJEdEJRVU5CTEdWQlFWY3NTVUZCV0R0QlFVTkJPMEZCUTBRc1IwRlNSRHRCUVZOQkxFVkJWa1E3TzBGQldVRXNhMEpCUVUwc1owSkJRVTRzUTBGQmRVSXNUMEZCZGtJc1JVRkJaME1zV1VGQlRUdEJRVU55UXl4TlFVRkpMRkZCUVVvc1JVRkJZenRCUVVOaUxIZENRVUZWTEZOQlFWWXNRMEZCYjBJc1RVRkJjRUlzUTBGQk1rSXNWVUZCTTBJN1FVRkRRU3hqUVVGWExFdEJRVmc3UVVGRFFUdEJRVU5FTEVWQlRFUTdRVUZOUVN4RFFYSkNSRHM3UVVGMVFrRXNTVUZCVFN4blFrRkJaMElzVTBGQmFFSXNZVUZCWjBJc1IwRkJUVHRCUVVNelFpeExRVUZOTEdWQlFXVXNVMEZCVXl4alFVRlVMRU5CUVhkQ0xGTkJRWGhDTEVOQlFYSkNPMEZCUTBFc1MwRkJUU3hqUVVGakxGVkJRVlVzVVVGQlVTeFBRVUZzUWl4SFFVRTBRaXhSUVVGUkxGRkJRWGhFT3p0QlFVVkJMR05CUVdFc1UwRkJZaXhIUVVGNVFpeEZRVUY2UWpzN1FVRkZRU3hoUVVGWkxFOUJRVm9zUTBGQmIwSXNWVUZCUXl4TFFVRkVMRVZCUVZFc1EwRkJVaXhGUVVGak8wRkJRMnBETEdWQlFXRXNhMEpCUVdJc1EwRkJaME1zVjBGQmFFTXNSVUZCTmtNc1owTkJRV2RDTEV0QlFXaENMRVZCUVhWQ0xFTkJRWFpDTEVOQlFUZERPMEZCUTBFc01rSkJRVmNzVTBGQlV5eGpRVUZVTEdGQlFXdERMRU5CUVd4RExFTkJRVmc3UVVGRFFTeEZRVWhFT3p0QlFVdEJPMEZCUTBFc05FSkJRV0VzVDBGQllqdEJRVU5CTEVOQllrUTdPMEZCWlVFc1NVRkJUU3gzUWtGQmQwSXNVMEZCZUVJc2NVSkJRWGRDTEVOQlFVTXNTVUZCUkN4RlFVRlZPMEZCUTNaRExGTkJRVkVzVVVGQlVpeEhRVUZ0UWl4SlFVRnVRanRCUVVOQkxGTkJRVkVzVDBGQlVpeEhRVUZyUWl4TFFVRkxMRXRCUVV3c1JVRkJiRUlzUTBGR2RVTXNRMEZGVURzN1FVRkZhRU1zVTBGQlVTeFBRVUZTTEVOQlFXZENMRWxCUVdoQ0xFTkJRWEZDTEZWQlFVTXNRMEZCUkN4RlFVRkpMRU5CUVVvc1JVRkJWVHRCUVVNNVFpeE5RVUZKTEZOQlFWTXNSVUZCUlN4TFFVRkdMRU5CUVZFc1EwRkJVaXhGUVVGWExGZEJRVmdzUlVGQllqdEJRVU5CTEUxQlFVa3NVMEZCVXl4RlFVRkZMRXRCUVVZc1EwRkJVU3hEUVVGU0xFVkJRVmNzVjBGQldDeEZRVUZpTzBGQlEwRXNUVUZCU1N4VFFVRlRMRTFCUVdJc1JVRkJjVUlzVDBGQlR5eERRVUZRTEVOQlFYSkNMRXRCUTBzc1NVRkJTU3hUUVVGVExFMUJRV0lzUlVGQmNVSXNUMEZCVHl4RFFVRkRMRU5CUVZJc1EwRkJja0lzUzBGRFFTeFBRVUZQTEVOQlFWQTdRVUZEVEN4RlFVNUVPMEZCVDBFc1EwRllSRHM3UVVGaFFTeEpRVUZOTEZsQlFWa3NVMEZCV2l4VFFVRlpMRWRCUVUwN1FVRkRka0lzVDBGQlRTeGhRVUZPTEVWQlFWVXNTVUZCVml4RFFVRmxPMEZCUVVFc1UwRkJUeXhKUVVGSkxFbEJRVW9zUlVGQlVEdEJRVUZCTEVWQlFXWXNSVUZEUXl4SlFVUkVMRU5CUTAwc1owSkJRVkU3UVVGRFlpeDNRa0ZCYzBJc1NVRkJkRUk3UVVGRFFUdEJRVU5CTzBGQlEwRXNSVUZNUkN4RlFVMURMRXRCVGtRc1EwRk5UenRCUVVGQkxGTkJRVThzVVVGQlVTeEpRVUZTTEVOQlFXRXNSMEZCWWl4RFFVRlFPMEZCUVVFc1JVRk9VRHRCUVU5QkxFTkJVa1E3TzBGQlZVRXNTVUZCVFN4UFFVRlBMRk5CUVZBc1NVRkJUeXhIUVVGTk8wRkJRMnhDTEdkRFFVRmhMRkZCUVdJN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRXNRMEZRUkRzN1FVRlRRVHM3T3pzN096czdPMEZETlVkQk96dEJRVVZCTEVsQlFVa3NVVUZCVVN4TFFVRmFPMEZCUTBFc1NVRkJUU3gxUWtGQmRVSXNVMEZCZGtJc2IwSkJRWFZDTEVkQlFVMDdRVUZEYkVNc1MwRkJUU3hSUVVGUkxGTkJRVk1zWTBGQlZDeERRVUYzUWl4VFFVRjRRaXhEUVVGa096dEJRVVZCTEU5QlFVMHNaMEpCUVU0c1EwRkJkVUlzVDBGQmRrSXNSVUZCWjBNc1dVRkJUVHRCUVVOeVF5eHZRa0ZCVHl4VFFVRlFMRU5CUVdsQ0xFZEJRV3BDTEVOQlFYRkNMRTFCUVhKQ08wRkJRMEVzVlVGQlVTeEpRVUZTTzBGQlEwRXNSVUZJUkRzN1FVRkxRU3h0UWtGQlR5eG5Ra0ZCVUN4RFFVRjNRaXhQUVVGNFFpeEZRVUZwUXl4WlFVRk5PMEZCUTNSRExHOUNRVUZQTEZOQlFWQXNRMEZCYVVJc1RVRkJha0lzUTBGQmQwSXNUVUZCZUVJN1FVRkRRU3hWUVVGUkxFdEJRVkk3UVVGRFFTeEZRVWhFT3p0QlFVdEJMRkZCUVU4c1owSkJRVkFzUTBGQmQwSXNVMEZCZUVJc1JVRkJiVU1zV1VGQlRUdEJRVU40UXl4TlFVRkpMRXRCUVVvc1JVRkJWenRCUVVOV0xHTkJRVmNzV1VGQlRUdEJRVU5vUWl4elFrRkJUeXhUUVVGUUxFTkJRV2xDTEUxQlFXcENMRU5CUVhkQ0xFMUJRWGhDTzBGQlEwRXNXVUZCVVN4TFFVRlNPMEZCUTBFc1NVRklSQ3hGUVVkSExFZEJTRWc3UVVGSlFUdEJRVU5FTEVWQlVFUTdRVUZSUVN4RFFYSkNSRHM3YTBKQmRVSmxMRzlDT3pzN096czdPenM3UVVNeFFtWTdPMEZCUTBFN08wRkJSVUVzU1VGQlNTeGhRVUZLTzBGQlEwRXNTVUZCU1N4VlFVRlZMRU5CUVdRN1FVRkRRU3hKUVVGSkxGbEJRVmtzUzBGQmFFSTdPMEZCUlVFc1NVRkJUU3g1UWtGQmVVSXNVMEZCZWtJc2MwSkJRWGxDTEVkQlFVMDdRVUZEY0VNc2MwSkJRVlVzWjBKQlFWWXNRMEZCTWtJc1VVRkJNMElzUlVGQmNVTXNXVUZCVFR0QlFVTXhReXhOUVVGSkxFbEJRVWtzYTBKQlFVOHNjVUpCUVZBc1IwRkJLMElzUTBGQmRrTTdPMEZCUlVFc1RVRkJTU3haUVVGWkxFTkJRV2hDTEVWQlFXMUNPMEZCUTJ4Q0xGVkJRVThzVDBGQlVEdEJRVU5CTEdGQlFWVXNRMEZCVmp0QlFVTkJPenRCUVVWRUxFMUJRVWtzUzBGQlN5eERRVUZETEVWQlFVNHNTVUZCV1N4RFFVRkRMRk5CUVdwQ0xFVkJRVFJDTzBGQlF6TkNMSFZDUVVGVExGTkJRVlFzUTBGQmJVSXNSMEZCYmtJc1EwRkJkVUlzVFVGQmRrSTdRVUZEUVN4bFFVRlpMRWxCUVZvN1FVRkRRU3hIUVVoRUxFMUJSMDhzU1VGQlNTeEpRVUZKTEVOQlFVTXNSVUZCVEN4SlFVRlhMRk5CUVdZc1JVRkJNRUk3UVVGRGFFTXNkVUpCUVZNc1UwRkJWQ3hEUVVGdFFpeE5RVUZ1UWl4RFFVRXdRaXhOUVVFeFFqdEJRVU5CTEdWQlFWa3NTMEZCV2p0QlFVTkJPMEZCUTBRc1JVRm1SRHM3UVVGcFFrRXNjVUpCUVZNc1owSkJRVlFzUTBGQk1FSXNUMEZCTVVJc1JVRkJiVU03UVVGQlFTeFRRVUZOTEhsQ1FVRk9PMEZCUVVFc1JVRkJia003UVVGRFFTeERRVzVDUkRzN2EwSkJjVUpsTEhOQ096czdPenM3T3pzN08wRkROVUptT3pzN08wRkJRMEU3T3pzN1FVRkRRVHM3T3p0QlFVTkJPenM3T3pzN1VVRkhReXh2UWl4SFFVRkJMRGhDTzFGQlEwRXNjMElzUjBGQlFTeG5RenRSUVVOQkxGa3NSMEZCUVN4elFqdFJRVU5CTEZVc1IwRkJRU3h2UWpzN096czdPenM3UVVOVVJDeEpRVUZOTEZkQlFWY3NRMEZCUXl4SFFVRkVMRVZCUVUwc1IwRkJUaXhGUVVGWExFZEJRVmdzUlVGQlowSXNSMEZCYUVJc1JVRkJjVUlzUjBGQmNrSXNSVUZCTUVJc1IwRkJNVUlzUlVGQkswSXNSMEZCTDBJc1JVRkJiME1zUjBGQmNFTXNSVUZCZVVNc1IwRkJla01zUlVGQk9FTXNSMEZCT1VNc1JVRkJiVVFzUjBGQmJrUXNSVUZCZDBRc1IwRkJlRVFzUlVGQk5rUXNSMEZCTjBRc1JVRkJhMFVzUjBGQmJFVXNSVUZCZFVVc1IwRkJka1VzUlVGQk5FVXNSMEZCTlVVc1JVRkJhVVlzUjBGQmFrWXNSVUZCYzBZc1IwRkJkRVlzUlVGQk1rWXNSMEZCTTBZc1JVRkJaMGNzUjBGQmFFY3NSVUZCY1Vjc1IwRkJja2NzUlVGQk1FY3NSMEZCTVVjc1JVRkJLMGNzUjBGQkwwY3NSVUZCYjBnc1IwRkJjRWdzUTBGQmFrSTdPMEZCUlVFc1NVRkJUU3hsUVVGbExGTkJRV1lzV1VGQlpTeERRVUZETEU5QlFVUXNSVUZCWVR0QlFVTnFReXhMUVVGTkxHbENRVUZwUWl4VFFVRnFRaXhqUVVGcFFpeERRVUZETEVsQlFVUXNSVUZCVlR0QlFVTm9ReXhOUVVGTkxGZEJRVmNzVlVGQlZTeHBRa0ZCVml4SFFVRTRRaXhyUWtGQkwwTTdRVUZEUVN4TlFVRk5MR1ZCUVdVc1EwRkJReXhQUVVGRUxFZEJRVmNzYVVKQlFWZ3NSMEZCSzBJc2EwSkJRWEJFT3p0QlFVVkJMRTFCUVUwc1YwRkJWeXhOUVVGTkxFbEJRVTRzUTBGQlZ5eFRRVUZUTEdkQ1FVRlVMRU5CUVRCQ0xGRkJRVEZDTEVOQlFWZ3NRMEZCYWtJN1FVRkRRU3hOUVVGTkxHVkJRV1VzVFVGQlRTeEpRVUZPTEVOQlFWY3NVMEZCVXl4blFrRkJWQ3hEUVVFd1FpeFpRVUV4UWl4RFFVRllMRU5CUVhKQ096dEJRVVZCTEdWQlFXRXNUMEZCWWl4RFFVRnhRanRCUVVGQkxGVkJRVk1zVFVGQlRTeGxRVUZPTEVOQlFYTkNMRTFCUVhSQ0xFTkJRVlE3UVVGQlFTeEhRVUZ5UWpzN1FVRkZRU3hUUVVGUExGTkJRVk1zU1VGQlZDeERRVUZqTEdsQ1FVRlRPMEZCUXpkQ0xFOUJRVWtzVDBGQlR5eE5RVUZOTEd0Q1FVRnFRanRCUVVOQkxGVkJRVThzUzBGQlN5eFRRVUZNTEVOQlFXVXNRMEZCWml4TlFVRnpRaXhKUVVGMFFpeEpRVUU0UWl4TFFVRkxMRk5CUVV3c1EwRkJaU3hEUVVGbUxFMUJRWE5DTEV0QlFVc3NWMEZCVEN4RlFVRXpSRHRCUVVOQkxFZEJTRTBzUTBGQlVEdEJRVWxCTEVWQllrUTdPMEZCWlVFc1MwRkJUU3gxUWtGQmRVSXNVMEZCZGtJc2IwSkJRWFZDTEVOQlFVTXNUMEZCUkN4RlFVRlZMRTFCUVZZc1JVRkJjVUk3UVVGRGFrUXNWVUZCVVN4blFrRkJVaXhEUVVGNVFpeFBRVUY2UWl4RlFVRnJReXhaUVVGTk8wRkJRM1pETEU5QlFVMHNZVUZCWVN4VFFVRlRMR05CUVZRc1EwRkJkMElzVFVGQmVFSXNRMEZCYmtJN1FVRkRRU3hQUVVGSkxHVkJRVW83TzBGQlJVRXNUMEZCU1N4RFFVRkRMRTlCUVV3c1JVRkJZenRCUVVOaUxHRkJRVk1zVjBGQlZ5eEhRVUZZTEVkQlFXbENMRk5CUVZNc1kwRkJWQ3hEUVVGM1FpeGxRVUY0UWl4RFFVRnFRaXhIUVVFMFJDeFhRVUZYTEdGQlFWZ3NRMEZCZVVJc1lVRkJla0lzUTBGQmRVTXNZVUZCZGtNc1EwRkJjVVFzWVVGQmNrUXNRMEZCYlVVc2MwSkJRVzVGTEVOQlFUQkdMR0ZCUVRGR0xFTkJRWGRITERKQ1FVRjRSeXhEUVVGeVJUdEJRVU5CTEVsQlJrUXNUVUZGVHp0QlFVTk9MR0ZCUVZNc1YwRkJWeXhIUVVGWUxFZEJRV2xDTEZOQlFWTXNZMEZCVkN4RFFVRjNRaXhsUVVGNFFpeERRVUZxUWl4SFFVRTBSQ3hYUVVGWExHRkJRVmdzUTBGQmVVSXNZVUZCZWtJc1EwRkJkVU1zWVVGQmRrTXNRMEZCY1VRc2MwSkJRWEpFTEVOQlFUUkZMR0ZCUVRWRkxFTkJRVEJHTERKQ1FVRXhSaXhEUVVGeVJUdEJRVU5CT3p0QlFVVkVMRlZCUVU4c1kwRkJVQ3hEUVVGelFpeEZRVUZETEZWQlFWVXNVVUZCV0N4RlFVRnhRaXhQUVVGUExFOUJRVFZDTEVWQlFYUkNPMEZCUTBFc1IwRllSRHRCUVZsQkxFVkJZa1E3TzBGQlpVRXNTMEZCU1N4blFrRkJaMElzUlVGQmNFSTdRVUZEUVN4TFFVRkpMRk5CUVZNc1UwRkJVeXhoUVVGVUxFTkJRWFZDTEc5Q1FVRjJRaXhEUVVGaU8wRkJRMEVzVVVGQlR5eFRRVUZRTEVkQlFXMUNMRVZCUVc1Q096dEJRVVZCTEZWQlFWTXNUMEZCVkN4RFFVRnBRaXhyUWtGQlZUdEJRVU14UWl4TlFVRkpMR05CUVdNc1pVRkJaU3hOUVVGbUxFTkJRV3hDTzBGQlEwRXNUVUZCU1N4VlFVRlZMRk5CUVZNc1lVRkJWQ3hEUVVGMVFpeEhRVUYyUWl4RFFVRmtPenRCUVVWQkxFMUJRVWtzUTBGQlF5eFhRVUZNTEVWQlFXdENPenRCUVVWc1FpeGpRVUZaTEVWQlFWb3NSMEZCYVVJc1RVRkJha0k3UVVGRFFTeFZRVUZSTEZOQlFWSXNSMEZCYjBJc1QwRkJUeXhYUVVGUUxFVkJRWEJDTzBGQlEwRXNWVUZCVVN4VFFVRlNMRWRCUVc5Q0xIbENRVUZ3UWpzN1FVRkZRU3gxUWtGQmNVSXNUMEZCY2tJc1JVRkJPRUlzVFVGQk9VSTdRVUZEUVN4VFFVRlBMRmRCUVZBc1EwRkJiVUlzVDBGQmJrSTdRVUZEUVN4RlFWcEVPMEZCWVVFc1EwRm9SRVE3TzJ0Q1FXdEVaU3haT3pzN096czdPenRCUTNCRVppeEpRVUZOTEdGQlFXRXNVMEZCWWl4VlFVRmhMRU5CUVVNc1QwRkJSQ3hGUVVGaE8wRkJReTlDTEV0QlFVMHNZVUZCWVN4UlFVRlJMR0ZCUVZJc1EwRkJjMElzWVVGQmRFSXNRMEZCYjBNc1lVRkJjRU1zUTBGQmJrSTdRVUZEUVN4TFFVRk5MR0ZCUVdFc1VVRkJVU3hoUVVGU0xFTkJRWE5DTEdGQlFYUkNMRU5CUVc5RExHRkJRWEJETEVOQlFXNUNPenRCUVVWQkxFdEJRVWtzVlVGQlZTeFJRVUZSTEdsQ1FVRjBRanRCUVVOQkxGbEJRVmNzWjBKQlFWZ3NRMEZCTkVJc1QwRkJOVUlzUlVGQmNVTXNXVUZCVFR0QlFVTXhReXhOUVVGTkxFOUJRVThzVVVGQlVTeHJRa0ZCY2tJN1FVRkRRU3hOUVVGSkxFbEJRVW9zUlVGQlZUdEJRVU5VTEZGQlFVc3NZMEZCVEN4RFFVRnZRaXhGUVVGRExGVkJRVlVzVVVGQldDeEZRVUZ4UWl4UFFVRlBMRk5CUVRWQ0xFVkJRWFZETEZGQlFWRXNVVUZCTDBNc1JVRkJjRUk3UVVGRFFTeGhRVUZWTEVsQlFWWTdRVUZEUVR0QlFVTkVMRVZCVGtRN08wRkJVVUVzV1VGQlZ5eG5Ra0ZCV0N4RFFVRTBRaXhQUVVFMVFpeEZRVUZ4UXl4WlFVRk5PMEZCUXpGRExFMUJRVTBzVDBGQlR5eFJRVUZSTEhOQ1FVRnlRanRCUVVOQkxFMUJRVWtzU1VGQlNpeEZRVUZWTzBGQlExUXNVVUZCU3l4alFVRk1MRU5CUVc5Q0xFVkJRVU1zVlVGQlZTeFJRVUZZTEVWQlFYRkNMRTlCUVU4c1UwRkJOVUlzUlVGQmRVTXNVVUZCVVN4UlFVRXZReXhGUVVGd1FqdEJRVU5CTEdGQlFWVXNTVUZCVmp0QlFVTkJPMEZCUTBRc1JVRk9SRHRCUVU5QkxFTkJjRUpFT3p0clFrRnpRbVVzVlRzN096czdPenM3UVVOMFFtWXNTVUZCVFN4blFrRkJaMElzVTBGQmFFSXNZVUZCWjBJc1EwRkJReXhMUVVGRU8wRkJRVUVzSzBSQlFXZEZMRXRCUVdoRk8wRkJRVUVzUTBGQmRFSTdPMEZCUlVFc1NVRkJUU3hyUWtGQmEwSXNVMEZCYkVJc1pVRkJhMElzUTBGQlF5eExRVUZFTEVWQlFWRXNRMEZCVWl4RlFVRmpPMEZCUVVFc1MwRkROMElzUzBGRU5rSXNSMEZESzBJc1MwRkVMMElzUTBGRE4wSXNTMEZFTmtJN1FVRkJRU3hMUVVOMFFpeFRRVVJ6UWl4SFFVTXJRaXhMUVVRdlFpeERRVU4wUWl4VFFVUnpRanRCUVVGQkxFdEJRMWdzVVVGRVZ5eEhRVU1yUWl4TFFVUXZRaXhEUVVOWUxGRkJSRmM3UVVGQlFTeExRVU5FTEUxQlJFTXNSMEZESzBJc1MwRkVMMElzUTBGRFJDeE5RVVJETzBGQlFVRXNTMEZEVHl4WFFVUlFMRWRCUXl0Q0xFdEJSQzlDTEVOQlEwOHNWMEZFVUR0QlFVRkJMRXRCUTI5Q0xFMUJSSEJDTEVkQlF5dENMRXRCUkM5Q0xFTkJRMjlDTEUxQlJIQkNPenM3UVVGSGNrTXNTMEZCVFN4WlFVRlpMRTlCUVU4c1RVRkJVQ3hIUVVOcVFpeFBRVUZQTEVkQlFWQXNRMEZCVnp0QlFVRkJMRk5CUVZNc1kwRkJZeXhMUVVGa0xFTkJRVlE3UVVGQlFTeEZRVUZZTEVWQlFUQkRMRWxCUVRGRExFTkJRU3RETEVWQlFTOURMRU5CUkdsQ0xFZEJRMjlETEVWQlJIUkVPenRCUVVkQkxIZE9RVXQ1UXl4TFFVeDZReXh4U0VGUGEwUXNVMEZRYkVRc2IwaEJVMmxFTEZGQlZHcEVMREJLUVdGdlJDeERRV0p3UkN4M1FrRmpUeXhUUVdSUUxDdEhRV2RDZVVNc1YwRm9RbnBETERCRVFXbENiME1zVFVGcVFuQkRPMEZCTkVKQkxFTkJiRU5FT3p0clFrRnZRMlVzWlRzN096czdPenM3T3p0QlEzUkRaanM3T3p0QlFVTkJPenM3T3pzN1VVRkZVeXhsTEVkQlFVRXNhVUk3VVVGQmFVSXNWeXhIUVVGQkxHVTdPenM3T3pzN08wRkRTREZDTEVsQlFVMHNiVzFDUVVGT096dEJRV2xDUVN4SlFVRk5MR05CUVdNc1UwRkJaQ3hYUVVGakxFZEJRVTA3UVVGRGVrSXNTMEZCU1N4WFFVRlhMRk5CUVZNc1kwRkJWQ3hEUVVGM1FpeFJRVUY0UWl4RFFVRm1PMEZCUTBFc1ZVRkJVeXhUUVVGVUxFZEJRWEZDTEZGQlFYSkNPMEZCUTBFc1EwRklSRHM3YTBKQlMyVXNWenM3T3pzN096czdPenRCUTNSQ1pqczdRVUZGUVN4SlFVRk5MRmRCUVZjc1UwRkJXQ3hSUVVGWExFTkJRVU1zUlVGQlJDeEZRVUZMTEVsQlFVd3NSVUZCWXp0QlFVTTNRaXhOUVVGSkxHZENRVUZLT3p0QlFVVkJMRk5CUVU4c1dVRkJWenRCUVVGQk8wRkJRVUU3TzBGQlEyaENMRkZCUVUwc1pVRkJaU3hUUVVGbUxGbEJRV1U3UVVGQlFTeGhRVUZOTEVkQlFVY3NTMEZCU0N4RFFVRlRMRXRCUVZRc1JVRkJaU3hWUVVGbUxFTkJRVTQ3UVVGQlFTeExRVUZ5UWpzN1FVRkZRU3hwUWtGQllTeFBRVUZpTzBGQlEwRXNZMEZCVlN4WFFVRlhMRmxCUVZnc1JVRkJlVUlzU1VGQmVrSXNRMEZCVmp0QlFVTkVMRWRCVEVRN1FVRk5SQ3hEUVZSRU96dEJRVmRCTEVsQlFVMHNZMEZCWXl4VFFVRmtMRmRCUVdNc1IwRkJUVHRCUVVONlFpeHpRa0ZCVXl4UFFVRlVMRU5CUVdsQ08wRkJRVUVzVjBGQlVTeExRVUZMTEZOQlFVd3NRMEZCWlN4SFFVRm1MRU5CUVcxQ0xFOUJRVzVDTEVOQlFWSTdRVUZCUVN4SFFVRnFRanRCUVVOQkxHdENRVUZMTEZOQlFVd3NRMEZCWlN4SFFVRm1MRU5CUVcxQ0xFOUJRVzVDTzBGQlEwRXNRMEZJUkRzN1FVRkxRU3hKUVVGTkxHTkJRV01zVTBGQlpDeFhRVUZqTEVkQlFVMDdRVUZEZWtJc1RVRkJTU3hOUVVGTkxGTkJRVk1zWTBGQlZDeERRVUYzUWl4bFFVRjRRaXhEUVVGV08wRkJRMEVzVFVGQlNTeGpRVUZLTEVOQlFXMUNMRVZCUVVNc1ZVRkJWU3hSUVVGWUxFVkJRWEZDTEU5QlFVOHNUMEZCTlVJc1JVRkJia0k3UVVGRFFTeERRVWhFT3p0UlFVdFRMRkVzUjBGQlFTeFJPMUZCUVZVc1Z5eEhRVUZCTEZjN1VVRkJZU3hYTEVkQlFVRXNWeUlzSW1acGJHVWlPaUpuWlc1bGNtRjBaV1F1YW5NaUxDSnpiM1Z5WTJWU2IyOTBJam9pSWl3aWMyOTFjbU5sYzBOdmJuUmxiblFpT2xzaUtHWjFibU4wYVc5dUtDbDdablZ1WTNScGIyNGdjaWhsTEc0c2RDbDdablZ1WTNScGIyNGdieWhwTEdZcGUybG1LQ0Z1VzJsZEtYdHBaaWdoWlZ0cFhTbDdkbUZ5SUdNOVhDSm1kVzVqZEdsdmJsd2lQVDEwZVhCbGIyWWdjbVZ4ZFdseVpTWW1jbVZ4ZFdseVpUdHBaaWdoWmlZbVl5bHlaWFIxY200Z1l5aHBMQ0V3S1R0cFppaDFLWEpsZEhWeWJpQjFLR2tzSVRBcE8zWmhjaUJoUFc1bGR5QkZjbkp2Y2loY0lrTmhibTV2ZENCbWFXNWtJRzF2WkhWc1pTQW5YQ0lyYVN0Y0lpZGNJaWs3ZEdoeWIzY2dZUzVqYjJSbFBWd2lUVTlFVlV4RlgwNVBWRjlHVDFWT1JGd2lMR0Y5ZG1GeUlIQTlibHRwWFQxN1pYaHdiM0owY3pwN2ZYMDdaVnRwWFZzd1hTNWpZV3hzS0hBdVpYaHdiM0owY3l4bWRXNWpkR2x2YmloeUtYdDJZWElnYmoxbFcybGRXekZkVzNKZE8zSmxkSFZ5YmlCdktHNThmSElwZlN4d0xIQXVaWGh3YjNKMGN5eHlMR1VzYml4MEtYMXlaWFIxY200Z2JsdHBYUzVsZUhCdmNuUnpmV1p2Y2loMllYSWdkVDFjSW1aMWJtTjBhVzl1WENJOVBYUjVjR1Z2WmlCeVpYRjFhWEpsSmlaeVpYRjFhWEpsTEdrOU1EdHBQSFF1YkdWdVozUm9PMmtyS3lsdktIUmJhVjBwTzNKbGRIVnliaUJ2ZlhKbGRIVnliaUJ5ZlNrb0tTSXNJaThxSUhOdGIyOTBhSE5qY205c2JDQjJNQzQwTGpBZ0xTQXlNREU0SUMwZ1JIVnpkR0Z1SUV0aGMzUmxiaXdnU21WeVpXMXBZWE1nVFdWdWFXTm9aV3hzYVNBdElFMUpWQ0JNYVdObGJuTmxJQ292WEc0b1puVnVZM1JwYjI0Z0tDa2dlMXh1SUNBbmRYTmxJSE4wY21samRDYzdYRzVjYmlBZ0x5OGdjRzlzZVdacGJHeGNiaUFnWm5WdVkzUnBiMjRnY0c5c2VXWnBiR3dvS1NCN1hHNGdJQ0FnTHk4Z1lXeHBZWE5sYzF4dUlDQWdJSFpoY2lCM0lEMGdkMmx1Wkc5M08xeHVJQ0FnSUhaaGNpQmtJRDBnWkc5amRXMWxiblE3WEc1Y2JpQWdJQ0F2THlCeVpYUjFjbTRnYVdZZ2MyTnliMnhzSUdKbGFHRjJhVzl5SUdseklITjFjSEJ2Y25SbFpDQmhibVFnY0c5c2VXWnBiR3dnYVhNZ2JtOTBJR1p2Y21ObFpGeHVJQ0FnSUdsbUlDaGNiaUFnSUNBZ0lDZHpZM0p2Ykd4Q1pXaGhkbWx2Y2ljZ2FXNGdaQzVrYjJOMWJXVnVkRVZzWlcxbGJuUXVjM1I1YkdVZ0ppWmNiaUFnSUNBZ0lIY3VYMTltYjNKalpWTnRiMjkwYUZOamNtOXNiRkJ2YkhsbWFXeHNYMThnSVQwOUlIUnlkV1ZjYmlBZ0lDQXBJSHRjYmlBZ0lDQWdJSEpsZEhWeWJqdGNiaUFnSUNCOVhHNWNiaUFnSUNBdkx5Qm5iRzlpWVd4elhHNGdJQ0FnZG1GeUlFVnNaVzFsYm5RZ1BTQjNMa2hVVFV4RmJHVnRaVzUwSUh4OElIY3VSV3hsYldWdWREdGNiaUFnSUNCMllYSWdVME5TVDB4TVgxUkpUVVVnUFNBME5qZzdYRzVjYmlBZ0lDQXZMeUJ2WW1wbFkzUWdaMkYwYUdWeWFXNW5JRzl5YVdkcGJtRnNJSE5qY205c2JDQnRaWFJvYjJSelhHNGdJQ0FnZG1GeUlHOXlhV2RwYm1Gc0lEMGdlMXh1SUNBZ0lDQWdjMk55YjJ4c09pQjNMbk5qY205c2JDQjhmQ0IzTG5OamNtOXNiRlJ2TEZ4dUlDQWdJQ0FnYzJOeWIyeHNRbms2SUhjdWMyTnliMnhzUW5rc1hHNGdJQ0FnSUNCbGJHVnRaVzUwVTJOeWIyeHNPaUJGYkdWdFpXNTBMbkJ5YjNSdmRIbHdaUzV6WTNKdmJHd2dmSHdnYzJOeWIyeHNSV3hsYldWdWRDeGNiaUFnSUNBZ0lITmpjbTlzYkVsdWRHOVdhV1YzT2lCRmJHVnRaVzUwTG5CeWIzUnZkSGx3WlM1elkzSnZiR3hKYm5SdlZtbGxkMXh1SUNBZ0lIMDdYRzVjYmlBZ0lDQXZMeUJrWldacGJtVWdkR2x0YVc1bklHMWxkR2h2WkZ4dUlDQWdJSFpoY2lCdWIzY2dQVnh1SUNBZ0lDQWdkeTV3WlhKbWIzSnRZVzVqWlNBbUppQjNMbkJsY21admNtMWhibU5sTG01dmQxeHVJQ0FnSUNBZ0lDQS9JSGN1Y0dWeVptOXliV0Z1WTJVdWJtOTNMbUpwYm1Rb2R5NXdaWEptYjNKdFlXNWpaU2xjYmlBZ0lDQWdJQ0FnT2lCRVlYUmxMbTV2ZHp0Y2JseHVJQ0FnSUM4cUtseHVJQ0FnSUNBcUlHbHVaR2xqWVhSbGN5QnBaaUJoSUhSb1pTQmpkWEp5Wlc1MElHSnliM2R6WlhJZ2FYTWdiV0ZrWlNCaWVTQk5hV055YjNOdlpuUmNiaUFnSUNBZ0tpQkFiV1YwYUc5a0lHbHpUV2xqY205emIyWjBRbkp2ZDNObGNseHVJQ0FnSUNBcUlFQndZWEpoYlNCN1UzUnlhVzVuZlNCMWMyVnlRV2RsYm5SY2JpQWdJQ0FnS2lCQWNtVjBkWEp1Y3lCN1FtOXZiR1ZoYm4xY2JpQWdJQ0FnS2k5Y2JpQWdJQ0JtZFc1amRHbHZiaUJwYzAxcFkzSnZjMjltZEVKeWIzZHpaWElvZFhObGNrRm5aVzUwS1NCN1hHNGdJQ0FnSUNCMllYSWdkWE5sY2tGblpXNTBVR0YwZEdWeWJuTWdQU0JiSjAxVFNVVWdKeXdnSjFSeWFXUmxiblF2Snl3Z0owVmtaMlV2SjEwN1hHNWNiaUFnSUNBZ0lISmxkSFZ5YmlCdVpYY2dVbVZuUlhod0tIVnpaWEpCWjJWdWRGQmhkSFJsY201ekxtcHZhVzRvSjN3bktTa3VkR1Z6ZENoMWMyVnlRV2RsYm5RcE8xeHVJQ0FnSUgxY2JseHVJQ0FnSUM4cVhHNGdJQ0FnSUNvZ1NVVWdhR0Z6SUhKdmRXNWthVzVuSUdKMVp5QnliM1Z1WkdsdVp5QmtiM2R1SUdOc2FXVnVkRWhsYVdkb2RDQmhibVFnWTJ4cFpXNTBWMmxrZEdnZ1lXNWtYRzRnSUNBZ0lDb2djbTkxYm1ScGJtY2dkWEFnYzJOeWIyeHNTR1ZwWjJoMElHRnVaQ0J6WTNKdmJHeFhhV1IwYUNCallYVnphVzVuSUdaaGJITmxJSEJ2YzJsMGFYWmxjMXh1SUNBZ0lDQXFJRzl1SUdoaGMxTmpjbTlzYkdGaWJHVlRjR0ZqWlZ4dUlDQWdJQ0FxTDF4dUlDQWdJSFpoY2lCU1QxVk9SRWxPUjE5VVQweEZVa0ZPUTBVZ1BTQnBjMDFwWTNKdmMyOW1kRUp5YjNkelpYSW9keTV1WVhacFoyRjBiM0l1ZFhObGNrRm5aVzUwS1NBL0lERWdPaUF3TzF4dVhHNGdJQ0FnTHlvcVhHNGdJQ0FnSUNvZ1kyaGhibWRsY3lCelkzSnZiR3dnY0c5emFYUnBiMjRnYVc1emFXUmxJR0Z1SUdWc1pXMWxiblJjYmlBZ0lDQWdLaUJBYldWMGFHOWtJSE5qY205c2JFVnNaVzFsYm5SY2JpQWdJQ0FnS2lCQWNHRnlZVzBnZTA1MWJXSmxjbjBnZUZ4dUlDQWdJQ0FxSUVCd1lYSmhiU0I3VG5WdFltVnlmU0I1WEc0Z0lDQWdJQ29nUUhKbGRIVnlibk1nZTNWdVpHVm1hVzVsWkgxY2JpQWdJQ0FnS2k5Y2JpQWdJQ0JtZFc1amRHbHZiaUJ6WTNKdmJHeEZiR1Z0Wlc1MEtIZ3NJSGtwSUh0Y2JpQWdJQ0FnSUhSb2FYTXVjMk55YjJ4c1RHVm1kQ0E5SUhnN1hHNGdJQ0FnSUNCMGFHbHpMbk5qY205c2JGUnZjQ0E5SUhrN1hHNGdJQ0FnZlZ4dVhHNGdJQ0FnTHlvcVhHNGdJQ0FnSUNvZ2NtVjBkWEp1Y3lCeVpYTjFiSFFnYjJZZ1lYQndiSGxwYm1jZ1pXRnpaU0J0WVhSb0lHWjFibU4wYVc5dUlIUnZJR0VnYm5WdFltVnlYRzRnSUNBZ0lDb2dRRzFsZEdodlpDQmxZWE5sWEc0Z0lDQWdJQ29nUUhCaGNtRnRJSHRPZFcxaVpYSjlJR3RjYmlBZ0lDQWdLaUJBY21WMGRYSnVjeUI3VG5WdFltVnlmVnh1SUNBZ0lDQXFMMXh1SUNBZ0lHWjFibU4wYVc5dUlHVmhjMlVvYXlrZ2UxeHVJQ0FnSUNBZ2NtVjBkWEp1SURBdU5TQXFJQ2d4SUMwZ1RXRjBhQzVqYjNNb1RXRjBhQzVRU1NBcUlHc3BLVHRjYmlBZ0lDQjlYRzVjYmlBZ0lDQXZLaXBjYmlBZ0lDQWdLaUJwYm1ScFkyRjBaWE1nYVdZZ1lTQnpiVzl2ZEdnZ1ltVm9ZWFpwYjNJZ2MyaHZkV3hrSUdKbElHRndjR3hwWldSY2JpQWdJQ0FnS2lCQWJXVjBhRzlrSUhOb2IzVnNaRUpoYVd4UGRYUmNiaUFnSUNBZ0tpQkFjR0Z5WVcwZ2UwNTFiV0psY254UFltcGxZM1I5SUdacGNuTjBRWEpuWEc0Z0lDQWdJQ29nUUhKbGRIVnlibk1nZTBKdmIyeGxZVzU5WEc0Z0lDQWdJQ292WEc0Z0lDQWdablZ1WTNScGIyNGdjMmh2ZFd4a1FtRnBiRTkxZENobWFYSnpkRUZ5WnlrZ2UxeHVJQ0FnSUNBZ2FXWWdLRnh1SUNBZ0lDQWdJQ0JtYVhKemRFRnlaeUE5UFQwZ2JuVnNiQ0I4ZkZ4dUlDQWdJQ0FnSUNCMGVYQmxiMllnWm1seWMzUkJjbWNnSVQwOUlDZHZZbXBsWTNRbklIeDhYRzRnSUNBZ0lDQWdJR1pwY25OMFFYSm5MbUpsYUdGMmFXOXlJRDA5UFNCMWJtUmxabWx1WldRZ2ZIeGNiaUFnSUNBZ0lDQWdabWx5YzNSQmNtY3VZbVZvWVhacGIzSWdQVDA5SUNkaGRYUnZKeUI4ZkZ4dUlDQWdJQ0FnSUNCbWFYSnpkRUZ5Wnk1aVpXaGhkbWx2Y2lBOVBUMGdKMmx1YzNSaGJuUW5YRzRnSUNBZ0lDQXBJSHRjYmlBZ0lDQWdJQ0FnTHk4Z1ptbHljM1FnWVhKbmRXMWxiblFnYVhNZ2JtOTBJR0Z1SUc5aWFtVmpkQzl1ZFd4c1hHNGdJQ0FnSUNBZ0lDOHZJRzl5SUdKbGFHRjJhVzl5SUdseklHRjFkRzhzSUdsdWMzUmhiblFnYjNJZ2RXNWtaV1pwYm1Wa1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCMGNuVmxPMXh1SUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0JwWmlBb2RIbHdaVzltSUdacGNuTjBRWEpuSUQwOVBTQW5iMkpxWldOMEp5QW1KaUJtYVhKemRFRnlaeTVpWldoaGRtbHZjaUE5UFQwZ0ozTnRiMjkwYUNjcElIdGNiaUFnSUNBZ0lDQWdMeThnWm1seWMzUWdZWEpuZFcxbGJuUWdhWE1nWVc0Z2IySnFaV04wSUdGdVpDQmlaV2hoZG1sdmNpQnBjeUJ6Ylc5dmRHaGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlHWmhiSE5sTzF4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNBdkx5QjBhSEp2ZHlCbGNuSnZjaUIzYUdWdUlHSmxhR0YyYVc5eUlHbHpJRzV2ZENCemRYQndiM0owWldSY2JpQWdJQ0FnSUhSb2NtOTNJRzVsZHlCVWVYQmxSWEp5YjNJb1hHNGdJQ0FnSUNBZ0lDZGlaV2hoZG1sdmNpQnRaVzFpWlhJZ2IyWWdVMk55YjJ4c1QzQjBhVzl1Y3lBbklDdGNiaUFnSUNBZ0lDQWdJQ0JtYVhKemRFRnlaeTVpWldoaGRtbHZjaUFyWEc0Z0lDQWdJQ0FnSUNBZ0p5QnBjeUJ1YjNRZ1lTQjJZV3hwWkNCMllXeDFaU0JtYjNJZ1pXNTFiV1Z5WVhScGIyNGdVMk55YjJ4c1FtVm9ZWFpwYjNJdUoxeHVJQ0FnSUNBZ0tUdGNiaUFnSUNCOVhHNWNiaUFnSUNBdktpcGNiaUFnSUNBZ0tpQnBibVJwWTJGMFpYTWdhV1lnWVc0Z1pXeGxiV1Z1ZENCb1lYTWdjMk55YjJ4c1lXSnNaU0J6Y0dGalpTQnBiaUIwYUdVZ2NISnZkbWxrWldRZ1lYaHBjMXh1SUNBZ0lDQXFJRUJ0WlhSb2IyUWdhR0Z6VTJOeWIyeHNZV0pzWlZOd1lXTmxYRzRnSUNBZ0lDb2dRSEJoY21GdElIdE9iMlJsZlNCbGJGeHVJQ0FnSUNBcUlFQndZWEpoYlNCN1UzUnlhVzVuZlNCaGVHbHpYRzRnSUNBZ0lDb2dRSEpsZEhWeWJuTWdlMEp2YjJ4bFlXNTlYRzRnSUNBZ0lDb3ZYRzRnSUNBZ1puVnVZM1JwYjI0Z2FHRnpVMk55YjJ4c1lXSnNaVk53WVdObEtHVnNMQ0JoZUdsektTQjdYRzRnSUNBZ0lDQnBaaUFvWVhocGN5QTlQVDBnSjFrbktTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQmxiQzVqYkdsbGJuUklaV2xuYUhRZ0t5QlNUMVZPUkVsT1IxOVVUMHhGVWtGT1EwVWdQQ0JsYkM1elkzSnZiR3hJWldsbmFIUTdYRzRnSUNBZ0lDQjlYRzVjYmlBZ0lDQWdJR2xtSUNoaGVHbHpJRDA5UFNBbldDY3BJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJR1ZzTG1Oc2FXVnVkRmRwWkhSb0lDc2dVazlWVGtSSlRrZGZWRTlNUlZKQlRrTkZJRHdnWld3dWMyTnliMnhzVjJsa2RHZzdYRzRnSUNBZ0lDQjlYRzRnSUNBZ2ZWeHVYRzRnSUNBZ0x5b3FYRzRnSUNBZ0lDb2dhVzVrYVdOaGRHVnpJR2xtSUdGdUlHVnNaVzFsYm5RZ2FHRnpJR0VnYzJOeWIyeHNZV0pzWlNCdmRtVnlabXh2ZHlCd2NtOXdaWEowZVNCcGJpQjBhR1VnWVhocGMxeHVJQ0FnSUNBcUlFQnRaWFJvYjJRZ1kyRnVUM1psY21ac2IzZGNiaUFnSUNBZ0tpQkFjR0Z5WVcwZ2UwNXZaR1Y5SUdWc1hHNGdJQ0FnSUNvZ1FIQmhjbUZ0SUh0VGRISnBibWQ5SUdGNGFYTmNiaUFnSUNBZ0tpQkFjbVYwZFhKdWN5QjdRbTl2YkdWaGJuMWNiaUFnSUNBZ0tpOWNiaUFnSUNCbWRXNWpkR2x2YmlCallXNVBkbVZ5Wm14dmR5aGxiQ3dnWVhocGN5a2dlMXh1SUNBZ0lDQWdkbUZ5SUc5MlpYSm1iRzkzVm1Gc2RXVWdQU0IzTG1kbGRFTnZiWEIxZEdWa1UzUjViR1VvWld3c0lHNTFiR3dwV3lkdmRtVnlabXh2ZHljZ0t5QmhlR2x6WFR0Y2JseHVJQ0FnSUNBZ2NtVjBkWEp1SUc5MlpYSm1iRzkzVm1Gc2RXVWdQVDA5SUNkaGRYUnZKeUI4ZkNCdmRtVnlabXh2ZDFaaGJIVmxJRDA5UFNBbmMyTnliMnhzSnp0Y2JpQWdJQ0I5WEc1Y2JpQWdJQ0F2S2lwY2JpQWdJQ0FnS2lCcGJtUnBZMkYwWlhNZ2FXWWdZVzRnWld4bGJXVnVkQ0JqWVc0Z1ltVWdjMk55YjJ4c1pXUWdhVzRnWldsMGFHVnlJR0Y0YVhOY2JpQWdJQ0FnS2lCQWJXVjBhRzlrSUdselUyTnliMnhzWVdKc1pWeHVJQ0FnSUNBcUlFQndZWEpoYlNCN1RtOWtaWDBnWld4Y2JpQWdJQ0FnS2lCQWNHRnlZVzBnZTFOMGNtbHVaMzBnWVhocGMxeHVJQ0FnSUNBcUlFQnlaWFIxY201eklIdENiMjlzWldGdWZWeHVJQ0FnSUNBcUwxeHVJQ0FnSUdaMWJtTjBhVzl1SUdselUyTnliMnhzWVdKc1pTaGxiQ2tnZTF4dUlDQWdJQ0FnZG1GeUlHbHpVMk55YjJ4c1lXSnNaVmtnUFNCb1lYTlRZM0p2Ykd4aFlteGxVM0JoWTJVb1pXd3NJQ2RaSnlrZ0ppWWdZMkZ1VDNabGNtWnNiM2NvWld3c0lDZFpKeWs3WEc0Z0lDQWdJQ0IyWVhJZ2FYTlRZM0p2Ykd4aFlteGxXQ0E5SUdoaGMxTmpjbTlzYkdGaWJHVlRjR0ZqWlNobGJDd2dKMWduS1NBbUppQmpZVzVQZG1WeVpteHZkeWhsYkN3Z0oxZ25LVHRjYmx4dUlDQWdJQ0FnY21WMGRYSnVJR2x6VTJOeWIyeHNZV0pzWlZrZ2ZId2dhWE5UWTNKdmJHeGhZbXhsV0R0Y2JpQWdJQ0I5WEc1Y2JpQWdJQ0F2S2lwY2JpQWdJQ0FnS2lCbWFXNWtjeUJ6WTNKdmJHeGhZbXhsSUhCaGNtVnVkQ0J2WmlCaGJpQmxiR1Z0Wlc1MFhHNGdJQ0FnSUNvZ1FHMWxkR2h2WkNCbWFXNWtVMk55YjJ4c1lXSnNaVkJoY21WdWRGeHVJQ0FnSUNBcUlFQndZWEpoYlNCN1RtOWtaWDBnWld4Y2JpQWdJQ0FnS2lCQWNtVjBkWEp1Y3lCN1RtOWtaWDBnWld4Y2JpQWdJQ0FnS2k5Y2JpQWdJQ0JtZFc1amRHbHZiaUJtYVc1a1UyTnliMnhzWVdKc1pWQmhjbVZ1ZENobGJDa2dlMXh1SUNBZ0lDQWdkbUZ5SUdselFtOWtlVHRjYmx4dUlDQWdJQ0FnWkc4Z2UxeHVJQ0FnSUNBZ0lDQmxiQ0E5SUdWc0xuQmhjbVZ1ZEU1dlpHVTdYRzVjYmlBZ0lDQWdJQ0FnYVhOQ2IyUjVJRDBnWld3Z1BUMDlJR1F1WW05a2VUdGNiaUFnSUNBZ0lIMGdkMmhwYkdVZ0tHbHpRbTlrZVNBOVBUMGdabUZzYzJVZ0ppWWdhWE5UWTNKdmJHeGhZbXhsS0dWc0tTQTlQVDBnWm1Gc2MyVXBPMXh1WEc0Z0lDQWdJQ0JwYzBKdlpIa2dQU0J1ZFd4c08xeHVYRzRnSUNBZ0lDQnlaWFIxY200Z1pXdzdYRzRnSUNBZ2ZWeHVYRzRnSUNBZ0x5b3FYRzRnSUNBZ0lDb2djMlZzWmlCcGJuWnZhMlZrSUdaMWJtTjBhVzl1SUhSb1lYUXNJR2RwZG1WdUlHRWdZMjl1ZEdWNGRDd2djM1JsY0hNZ2RHaHliM1ZuYUNCelkzSnZiR3hwYm1kY2JpQWdJQ0FnS2lCQWJXVjBhRzlrSUhOMFpYQmNiaUFnSUNBZ0tpQkFjR0Z5WVcwZ2UwOWlhbVZqZEgwZ1kyOXVkR1Y0ZEZ4dUlDQWdJQ0FxSUVCeVpYUjFjbTV6SUh0MWJtUmxabWx1WldSOVhHNGdJQ0FnSUNvdlhHNGdJQ0FnWm5WdVkzUnBiMjRnYzNSbGNDaGpiMjUwWlhoMEtTQjdYRzRnSUNBZ0lDQjJZWElnZEdsdFpTQTlJRzV2ZHlncE8xeHVJQ0FnSUNBZ2RtRnlJSFpoYkhWbE8xeHVJQ0FnSUNBZ2RtRnlJR04xY25KbGJuUllPMXh1SUNBZ0lDQWdkbUZ5SUdOMWNuSmxiblJaTzF4dUlDQWdJQ0FnZG1GeUlHVnNZWEJ6WldRZ1BTQW9kR2x0WlNBdElHTnZiblJsZUhRdWMzUmhjblJVYVcxbEtTQXZJRk5EVWs5TVRGOVVTVTFGTzF4dVhHNGdJQ0FnSUNBdkx5QmhkbTlwWkNCbGJHRndjMlZrSUhScGJXVnpJR2hwWjJobGNpQjBhR0Z1SUc5dVpWeHVJQ0FnSUNBZ1pXeGhjSE5sWkNBOUlHVnNZWEJ6WldRZ1BpQXhJRDhnTVNBNklHVnNZWEJ6WldRN1hHNWNiaUFnSUNBZ0lDOHZJR0Z3Y0d4NUlHVmhjMmx1WnlCMGJ5QmxiR0Z3YzJWa0lIUnBiV1ZjYmlBZ0lDQWdJSFpoYkhWbElEMGdaV0Z6WlNobGJHRndjMlZrS1R0Y2JseHVJQ0FnSUNBZ1kzVnljbVZ1ZEZnZ1BTQmpiMjUwWlhoMExuTjBZWEowV0NBcklDaGpiMjUwWlhoMExuZ2dMU0JqYjI1MFpYaDBMbk4wWVhKMFdDa2dLaUIyWVd4MVpUdGNiaUFnSUNBZ0lHTjFjbkpsYm5SWklEMGdZMjl1ZEdWNGRDNXpkR0Z5ZEZrZ0t5QW9ZMjl1ZEdWNGRDNTVJQzBnWTI5dWRHVjRkQzV6ZEdGeWRGa3BJQ29nZG1Gc2RXVTdYRzVjYmlBZ0lDQWdJR052Ym5SbGVIUXViV1YwYUc5a0xtTmhiR3dvWTI5dWRHVjRkQzV6WTNKdmJHeGhZbXhsTENCamRYSnlaVzUwV0N3Z1kzVnljbVZ1ZEZrcE8xeHVYRzRnSUNBZ0lDQXZMeUJ6WTNKdmJHd2diVzl5WlNCcFppQjNaU0JvWVhabElHNXZkQ0J5WldGamFHVmtJRzkxY2lCa1pYTjBhVzVoZEdsdmJseHVJQ0FnSUNBZ2FXWWdLR04xY25KbGJuUllJQ0U5UFNCamIyNTBaWGgwTG5nZ2ZId2dZM1Z5Y21WdWRGa2dJVDA5SUdOdmJuUmxlSFF1ZVNrZ2UxeHVJQ0FnSUNBZ0lDQjNMbkpsY1hWbGMzUkJibWx0WVhScGIyNUdjbUZ0WlNoemRHVndMbUpwYm1Rb2R5d2dZMjl1ZEdWNGRDa3BPMXh1SUNBZ0lDQWdmVnh1SUNBZ0lIMWNibHh1SUNBZ0lDOHFLbHh1SUNBZ0lDQXFJSE5qY205c2JITWdkMmx1Wkc5M0lHOXlJR1ZzWlcxbGJuUWdkMmwwYUNCaElITnRiMjkwYUNCaVpXaGhkbWx2Y2x4dUlDQWdJQ0FxSUVCdFpYUm9iMlFnYzIxdmIzUm9VMk55YjJ4c1hHNGdJQ0FnSUNvZ1FIQmhjbUZ0SUh0UFltcGxZM1I4VG05a1pYMGdaV3hjYmlBZ0lDQWdLaUJBY0dGeVlXMGdlMDUxYldKbGNuMGdlRnh1SUNBZ0lDQXFJRUJ3WVhKaGJTQjdUblZ0WW1WeWZTQjVYRzRnSUNBZ0lDb2dRSEpsZEhWeWJuTWdlM1Z1WkdWbWFXNWxaSDFjYmlBZ0lDQWdLaTljYmlBZ0lDQm1kVzVqZEdsdmJpQnpiVzl2ZEdoVFkzSnZiR3dvWld3c0lIZ3NJSGtwSUh0Y2JpQWdJQ0FnSUhaaGNpQnpZM0p2Ykd4aFlteGxPMXh1SUNBZ0lDQWdkbUZ5SUhOMFlYSjBXRHRjYmlBZ0lDQWdJSFpoY2lCemRHRnlkRms3WEc0Z0lDQWdJQ0IyWVhJZ2JXVjBhRzlrTzF4dUlDQWdJQ0FnZG1GeUlITjBZWEowVkdsdFpTQTlJRzV2ZHlncE8xeHVYRzRnSUNBZ0lDQXZMeUJrWldacGJtVWdjMk55YjJ4c0lHTnZiblJsZUhSY2JpQWdJQ0FnSUdsbUlDaGxiQ0E5UFQwZ1pDNWliMlI1S1NCN1hHNGdJQ0FnSUNBZ0lITmpjbTlzYkdGaWJHVWdQU0IzTzF4dUlDQWdJQ0FnSUNCemRHRnlkRmdnUFNCM0xuTmpjbTlzYkZnZ2ZId2dkeTV3WVdkbFdFOW1abk5sZER0Y2JpQWdJQ0FnSUNBZ2MzUmhjblJaSUQwZ2R5NXpZM0p2Ykd4WklIeDhJSGN1Y0dGblpWbFBabVp6WlhRN1hHNGdJQ0FnSUNBZ0lHMWxkR2h2WkNBOUlHOXlhV2RwYm1Gc0xuTmpjbTlzYkR0Y2JpQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUhOamNtOXNiR0ZpYkdVZ1BTQmxiRHRjYmlBZ0lDQWdJQ0FnYzNSaGNuUllJRDBnWld3dWMyTnliMnhzVEdWbWREdGNiaUFnSUNBZ0lDQWdjM1JoY25SWklEMGdaV3d1YzJOeWIyeHNWRzl3TzF4dUlDQWdJQ0FnSUNCdFpYUm9iMlFnUFNCelkzSnZiR3hGYkdWdFpXNTBPMXh1SUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0F2THlCelkzSnZiR3dnYkc5dmNHbHVaeUJ2ZG1WeUlHRWdabkpoYldWY2JpQWdJQ0FnSUhOMFpYQW9lMXh1SUNBZ0lDQWdJQ0J6WTNKdmJHeGhZbXhsT2lCelkzSnZiR3hoWW14bExGeHVJQ0FnSUNBZ0lDQnRaWFJvYjJRNklHMWxkR2h2WkN4Y2JpQWdJQ0FnSUNBZ2MzUmhjblJVYVcxbE9pQnpkR0Z5ZEZScGJXVXNYRzRnSUNBZ0lDQWdJSE4wWVhKMFdEb2djM1JoY25SWUxGeHVJQ0FnSUNBZ0lDQnpkR0Z5ZEZrNklITjBZWEowV1N4Y2JpQWdJQ0FnSUNBZ2VEb2dlQ3hjYmlBZ0lDQWdJQ0FnZVRvZ2VWeHVJQ0FnSUNBZ2ZTazdYRzRnSUNBZ2ZWeHVYRzRnSUNBZ0x5OGdUMUpKUjBsT1FVd2dUVVZVU0U5RVV5QlBWa1ZTVWtsRVJWTmNiaUFnSUNBdkx5QjNMbk5qY205c2JDQmhibVFnZHk1elkzSnZiR3hVYjF4dUlDQWdJSGN1YzJOeWIyeHNJRDBnZHk1elkzSnZiR3hVYnlBOUlHWjFibU4wYVc5dUtDa2dlMXh1SUNBZ0lDQWdMeThnWVhadmFXUWdZV04wYVc5dUlIZG9aVzRnYm04Z1lYSm5kVzFsYm5SeklHRnlaU0J3WVhOelpXUmNiaUFnSUNBZ0lHbG1JQ2hoY21kMWJXVnVkSE5iTUYwZ1BUMDlJSFZ1WkdWbWFXNWxaQ2tnZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTQ3WEc0Z0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUM4dklHRjJiMmxrSUhOdGIyOTBhQ0JpWldoaGRtbHZjaUJwWmlCdWIzUWdjbVZ4ZFdseVpXUmNiaUFnSUNBZ0lHbG1JQ2h6YUc5MWJHUkNZV2xzVDNWMEtHRnlaM1Z0Wlc1MGMxc3dYU2tnUFQwOUlIUnlkV1VwSUh0Y2JpQWdJQ0FnSUNBZ2IzSnBaMmx1WVd3dWMyTnliMnhzTG1OaGJHd29YRzRnSUNBZ0lDQWdJQ0FnZHl4Y2JpQWdJQ0FnSUNBZ0lDQmhjbWQxYldWdWRITmJNRjB1YkdWbWRDQWhQVDBnZFc1a1pXWnBibVZrWEc0Z0lDQWdJQ0FnSUNBZ0lDQS9JR0Z5WjNWdFpXNTBjMXN3WFM1c1pXWjBYRzRnSUNBZ0lDQWdJQ0FnSUNBNklIUjVjR1Z2WmlCaGNtZDFiV1Z1ZEhOYk1GMGdJVDA5SUNkdlltcGxZM1FuWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJRDhnWVhKbmRXMWxiblJ6V3pCZFhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSURvZ2R5NXpZM0p2Ykd4WUlIeDhJSGN1Y0dGblpWaFBabVp6WlhRc1hHNGdJQ0FnSUNBZ0lDQWdMeThnZFhObElIUnZjQ0J3Y205d0xDQnpaV052Ym1RZ1lYSm5kVzFsYm5RZ2FXWWdjSEpsYzJWdWRDQnZjaUJtWVd4c1ltRmpheUIwYnlCelkzSnZiR3haWEc0Z0lDQWdJQ0FnSUNBZ1lYSm5kVzFsYm5Seld6QmRMblJ2Y0NBaFBUMGdkVzVrWldacGJtVmtYRzRnSUNBZ0lDQWdJQ0FnSUNBL0lHRnlaM1Z0Wlc1MGMxc3dYUzUwYjNCY2JpQWdJQ0FnSUNBZ0lDQWdJRG9nWVhKbmRXMWxiblJ6V3pGZElDRTlQU0IxYm1SbFptbHVaV1JjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdQeUJoY21kMWJXVnVkSE5iTVYxY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnT2lCM0xuTmpjbTlzYkZrZ2ZId2dkeTV3WVdkbFdVOW1abk5sZEZ4dUlDQWdJQ0FnSUNBcE8xeHVYRzRnSUNBZ0lDQWdJSEpsZEhWeWJqdGNiaUFnSUNBZ0lIMWNibHh1SUNBZ0lDQWdMeThnVEVWVUlGUklSU0JUVFU5UFZFaE9SVk5USUVKRlIwbE9JVnh1SUNBZ0lDQWdjMjF2YjNSb1UyTnliMnhzTG1OaGJHd29YRzRnSUNBZ0lDQWdJSGNzWEc0Z0lDQWdJQ0FnSUdRdVltOWtlU3hjYmlBZ0lDQWdJQ0FnWVhKbmRXMWxiblJ6V3pCZExteGxablFnSVQwOUlIVnVaR1ZtYVc1bFpGeHVJQ0FnSUNBZ0lDQWdJRDhnZm41aGNtZDFiV1Z1ZEhOYk1GMHViR1ZtZEZ4dUlDQWdJQ0FnSUNBZ0lEb2dkeTV6WTNKdmJHeFlJSHg4SUhjdWNHRm5aVmhQWm1aelpYUXNYRzRnSUNBZ0lDQWdJR0Z5WjNWdFpXNTBjMXN3WFM1MGIzQWdJVDA5SUhWdVpHVm1hVzVsWkZ4dUlDQWdJQ0FnSUNBZ0lEOGdmbjVoY21kMWJXVnVkSE5iTUYwdWRHOXdYRzRnSUNBZ0lDQWdJQ0FnT2lCM0xuTmpjbTlzYkZrZ2ZId2dkeTV3WVdkbFdVOW1abk5sZEZ4dUlDQWdJQ0FnS1R0Y2JpQWdJQ0I5TzF4dVhHNGdJQ0FnTHk4Z2R5NXpZM0p2Ykd4Q2VWeHVJQ0FnSUhjdWMyTnliMnhzUW5rZ1BTQm1kVzVqZEdsdmJpZ3BJSHRjYmlBZ0lDQWdJQzh2SUdGMmIybGtJR0ZqZEdsdmJpQjNhR1Z1SUc1dklHRnlaM1Z0Wlc1MGN5QmhjbVVnY0dGemMyVmtYRzRnSUNBZ0lDQnBaaUFvWVhKbmRXMWxiblJ6V3pCZElEMDlQU0IxYm1SbFptbHVaV1FwSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1TzF4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNBdkx5QmhkbTlwWkNCemJXOXZkR2dnWW1Wb1lYWnBiM0lnYVdZZ2JtOTBJSEpsY1hWcGNtVmtYRzRnSUNBZ0lDQnBaaUFvYzJodmRXeGtRbUZwYkU5MWRDaGhjbWQxYldWdWRITmJNRjBwS1NCN1hHNGdJQ0FnSUNBZ0lHOXlhV2RwYm1Gc0xuTmpjbTlzYkVKNUxtTmhiR3dvWEc0Z0lDQWdJQ0FnSUNBZ2R5eGNiaUFnSUNBZ0lDQWdJQ0JoY21kMWJXVnVkSE5iTUYwdWJHVm1kQ0FoUFQwZ2RXNWtaV1pwYm1Wa1hHNGdJQ0FnSUNBZ0lDQWdJQ0EvSUdGeVozVnRaVzUwYzFzd1hTNXNaV1owWEc0Z0lDQWdJQ0FnSUNBZ0lDQTZJSFI1Y0dWdlppQmhjbWQxYldWdWRITmJNRjBnSVQwOUlDZHZZbXBsWTNRbklEOGdZWEpuZFcxbGJuUnpXekJkSURvZ01DeGNiaUFnSUNBZ0lDQWdJQ0JoY21kMWJXVnVkSE5iTUYwdWRHOXdJQ0U5UFNCMWJtUmxabWx1WldSY2JpQWdJQ0FnSUNBZ0lDQWdJRDhnWVhKbmRXMWxiblJ6V3pCZExuUnZjRnh1SUNBZ0lDQWdJQ0FnSUNBZ09pQmhjbWQxYldWdWRITmJNVjBnSVQwOUlIVnVaR1ZtYVc1bFpDQS9JR0Z5WjNWdFpXNTBjMXN4WFNBNklEQmNiaUFnSUNBZ0lDQWdLVHRjYmx4dUlDQWdJQ0FnSUNCeVpYUjFjbTQ3WEc0Z0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUM4dklFeEZWQ0JVU0VVZ1UwMVBUMVJJVGtWVFV5QkNSVWRKVGlGY2JpQWdJQ0FnSUhOdGIyOTBhRk5qY205c2JDNWpZV3hzS0Z4dUlDQWdJQ0FnSUNCM0xGeHVJQ0FnSUNBZ0lDQmtMbUp2Wkhrc1hHNGdJQ0FnSUNBZ0lINStZWEpuZFcxbGJuUnpXekJkTG14bFpuUWdLeUFvZHk1elkzSnZiR3hZSUh4OElIY3VjR0ZuWlZoUFptWnpaWFFwTEZ4dUlDQWdJQ0FnSUNCK2ZtRnlaM1Z0Wlc1MGMxc3dYUzUwYjNBZ0t5QW9keTV6WTNKdmJHeFpJSHg4SUhjdWNHRm5aVmxQWm1aelpYUXBYRzRnSUNBZ0lDQXBPMXh1SUNBZ0lIMDdYRzVjYmlBZ0lDQXZMeUJGYkdWdFpXNTBMbkJ5YjNSdmRIbHdaUzV6WTNKdmJHd2dZVzVrSUVWc1pXMWxiblF1Y0hKdmRHOTBlWEJsTG5OamNtOXNiRlJ2WEc0Z0lDQWdSV3hsYldWdWRDNXdjbTkwYjNSNWNHVXVjMk55YjJ4c0lEMGdSV3hsYldWdWRDNXdjbTkwYjNSNWNHVXVjMk55YjJ4c1ZHOGdQU0JtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0FnSUM4dklHRjJiMmxrSUdGamRHbHZiaUIzYUdWdUlHNXZJR0Z5WjNWdFpXNTBjeUJoY21VZ2NHRnpjMlZrWEc0Z0lDQWdJQ0JwWmlBb1lYSm5kVzFsYm5Seld6QmRJRDA5UFNCMWJtUmxabWx1WldRcElIdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdU8xeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQXZMeUJoZG05cFpDQnpiVzl2ZEdnZ1ltVm9ZWFpwYjNJZ2FXWWdibTkwSUhKbGNYVnBjbVZrWEc0Z0lDQWdJQ0JwWmlBb2MyaHZkV3hrUW1GcGJFOTFkQ2hoY21kMWJXVnVkSE5iTUYwcElEMDlQU0IwY25WbEtTQjdYRzRnSUNBZ0lDQWdJQzh2SUdsbUlHOXVaU0J1ZFcxaVpYSWdhWE1nY0dGemMyVmtMQ0IwYUhKdmR5Qmxjbkp2Y2lCMGJ5QnRZWFJqYUNCR2FYSmxabTk0SUdsdGNHeGxiV1Z1ZEdGMGFXOXVYRzRnSUNBZ0lDQWdJR2xtSUNoMGVYQmxiMllnWVhKbmRXMWxiblJ6V3pCZElEMDlQU0FuYm5WdFltVnlKeUFtSmlCaGNtZDFiV1Z1ZEhOYk1WMGdQVDA5SUhWdVpHVm1hVzVsWkNrZ2UxeHVJQ0FnSUNBZ0lDQWdJSFJvY205M0lHNWxkeUJUZVc1MFlYaEZjbkp2Y2lnblZtRnNkV1VnWTI5MWJHUWdibTkwSUdKbElHTnZiblpsY25SbFpDY3BPMXh1SUNBZ0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUNBZ2IzSnBaMmx1WVd3dVpXeGxiV1Z1ZEZOamNtOXNiQzVqWVd4c0tGeHVJQ0FnSUNBZ0lDQWdJSFJvYVhNc1hHNGdJQ0FnSUNBZ0lDQWdMeThnZFhObElHeGxablFnY0hKdmNDd2dabWx5YzNRZ2JuVnRZbVZ5SUdGeVozVnRaVzUwSUc5eUlHWmhiR3hpWVdOcklIUnZJSE5qY205c2JFeGxablJjYmlBZ0lDQWdJQ0FnSUNCaGNtZDFiV1Z1ZEhOYk1GMHViR1ZtZENBaFBUMGdkVzVrWldacGJtVmtYRzRnSUNBZ0lDQWdJQ0FnSUNBL0lINStZWEpuZFcxbGJuUnpXekJkTG14bFpuUmNiaUFnSUNBZ0lDQWdJQ0FnSURvZ2RIbHdaVzltSUdGeVozVnRaVzUwYzFzd1hTQWhQVDBnSjI5aWFtVmpkQ2NnUHlCK2ZtRnlaM1Z0Wlc1MGMxc3dYU0E2SUhSb2FYTXVjMk55YjJ4c1RHVm1kQ3hjYmlBZ0lDQWdJQ0FnSUNBdkx5QjFjMlVnZEc5d0lIQnliM0FzSUhObFkyOXVaQ0JoY21kMWJXVnVkQ0J2Y2lCbVlXeHNZbUZqYXlCMGJ5QnpZM0p2Ykd4VWIzQmNiaUFnSUNBZ0lDQWdJQ0JoY21kMWJXVnVkSE5iTUYwdWRHOXdJQ0U5UFNCMWJtUmxabWx1WldSY2JpQWdJQ0FnSUNBZ0lDQWdJRDhnZm41aGNtZDFiV1Z1ZEhOYk1GMHVkRzl3WEc0Z0lDQWdJQ0FnSUNBZ0lDQTZJR0Z5WjNWdFpXNTBjMXN4WFNBaFBUMGdkVzVrWldacGJtVmtJRDhnZm41aGNtZDFiV1Z1ZEhOYk1WMGdPaUIwYUdsekxuTmpjbTlzYkZSdmNGeHVJQ0FnSUNBZ0lDQXBPMXh1WEc0Z0lDQWdJQ0FnSUhKbGRIVnlianRjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnZG1GeUlHeGxablFnUFNCaGNtZDFiV1Z1ZEhOYk1GMHViR1ZtZER0Y2JpQWdJQ0FnSUhaaGNpQjBiM0FnUFNCaGNtZDFiV1Z1ZEhOYk1GMHVkRzl3TzF4dVhHNGdJQ0FnSUNBdkx5Qk1SVlFnVkVoRklGTk5UMDlVU0U1RlUxTWdRa1ZIU1U0aFhHNGdJQ0FnSUNCemJXOXZkR2hUWTNKdmJHd3VZMkZzYkNoY2JpQWdJQ0FnSUNBZ2RHaHBjeXhjYmlBZ0lDQWdJQ0FnZEdocGN5eGNiaUFnSUNBZ0lDQWdkSGx3Wlc5bUlHeGxablFnUFQwOUlDZDFibVJsWm1sdVpXUW5JRDhnZEdocGN5NXpZM0p2Ykd4TVpXWjBJRG9nZm41c1pXWjBMRnh1SUNBZ0lDQWdJQ0IwZVhCbGIyWWdkRzl3SUQwOVBTQW5kVzVrWldacGJtVmtKeUEvSUhSb2FYTXVjMk55YjJ4c1ZHOXdJRG9nZm41MGIzQmNiaUFnSUNBZ0lDazdYRzRnSUNBZ2ZUdGNibHh1SUNBZ0lDOHZJRVZzWlcxbGJuUXVjSEp2ZEc5MGVYQmxMbk5qY205c2JFSjVYRzRnSUNBZ1JXeGxiV1Z1ZEM1d2NtOTBiM1I1Y0dVdWMyTnliMnhzUW5rZ1BTQm1kVzVqZEdsdmJpZ3BJSHRjYmlBZ0lDQWdJQzh2SUdGMmIybGtJR0ZqZEdsdmJpQjNhR1Z1SUc1dklHRnlaM1Z0Wlc1MGN5QmhjbVVnY0dGemMyVmtYRzRnSUNBZ0lDQnBaaUFvWVhKbmRXMWxiblJ6V3pCZElEMDlQU0IxYm1SbFptbHVaV1FwSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1TzF4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNBdkx5QmhkbTlwWkNCemJXOXZkR2dnWW1Wb1lYWnBiM0lnYVdZZ2JtOTBJSEpsY1hWcGNtVmtYRzRnSUNBZ0lDQnBaaUFvYzJodmRXeGtRbUZwYkU5MWRDaGhjbWQxYldWdWRITmJNRjBwSUQwOVBTQjBjblZsS1NCN1hHNGdJQ0FnSUNBZ0lHOXlhV2RwYm1Gc0xtVnNaVzFsYm5SVFkzSnZiR3d1WTJGc2JDaGNiaUFnSUNBZ0lDQWdJQ0IwYUdsekxGeHVJQ0FnSUNBZ0lDQWdJR0Z5WjNWdFpXNTBjMXN3WFM1c1pXWjBJQ0U5UFNCMWJtUmxabWx1WldSY2JpQWdJQ0FnSUNBZ0lDQWdJRDhnZm41aGNtZDFiV1Z1ZEhOYk1GMHViR1ZtZENBcklIUm9hWE11YzJOeWIyeHNUR1ZtZEZ4dUlDQWdJQ0FnSUNBZ0lDQWdPaUIrZm1GeVozVnRaVzUwYzFzd1hTQXJJSFJvYVhNdWMyTnliMnhzVEdWbWRDeGNiaUFnSUNBZ0lDQWdJQ0JoY21kMWJXVnVkSE5iTUYwdWRHOXdJQ0U5UFNCMWJtUmxabWx1WldSY2JpQWdJQ0FnSUNBZ0lDQWdJRDhnZm41aGNtZDFiV1Z1ZEhOYk1GMHVkRzl3SUNzZ2RHaHBjeTV6WTNKdmJHeFViM0JjYmlBZ0lDQWdJQ0FnSUNBZ0lEb2dmbjVoY21kMWJXVnVkSE5iTVYwZ0t5QjBhR2x6TG5OamNtOXNiRlJ2Y0Z4dUlDQWdJQ0FnSUNBcE8xeHVYRzRnSUNBZ0lDQWdJSEpsZEhWeWJqdGNiaUFnSUNBZ0lIMWNibHh1SUNBZ0lDQWdkR2hwY3k1elkzSnZiR3dvZTF4dUlDQWdJQ0FnSUNCc1pXWjBPaUIrZm1GeVozVnRaVzUwYzFzd1hTNXNaV1owSUNzZ2RHaHBjeTV6WTNKdmJHeE1aV1owTEZ4dUlDQWdJQ0FnSUNCMGIzQTZJSDUrWVhKbmRXMWxiblJ6V3pCZExuUnZjQ0FySUhSb2FYTXVjMk55YjJ4c1ZHOXdMRnh1SUNBZ0lDQWdJQ0JpWldoaGRtbHZjam9nWVhKbmRXMWxiblJ6V3pCZExtSmxhR0YyYVc5eVhHNGdJQ0FnSUNCOUtUdGNiaUFnSUNCOU8xeHVYRzRnSUNBZ0x5OGdSV3hsYldWdWRDNXdjbTkwYjNSNWNHVXVjMk55YjJ4c1NXNTBiMVpwWlhkY2JpQWdJQ0JGYkdWdFpXNTBMbkJ5YjNSdmRIbHdaUzV6WTNKdmJHeEpiblJ2Vm1sbGR5QTlJR1oxYm1OMGFXOXVLQ2tnZTF4dUlDQWdJQ0FnTHk4Z1lYWnZhV1FnYzIxdmIzUm9JR0psYUdGMmFXOXlJR2xtSUc1dmRDQnlaWEYxYVhKbFpGeHVJQ0FnSUNBZ2FXWWdLSE5vYjNWc1pFSmhhV3hQZFhRb1lYSm5kVzFsYm5Seld6QmRLU0E5UFQwZ2RISjFaU2tnZTF4dUlDQWdJQ0FnSUNCdmNtbG5hVzVoYkM1elkzSnZiR3hKYm5SdlZtbGxkeTVqWVd4c0tGeHVJQ0FnSUNBZ0lDQWdJSFJvYVhNc1hHNGdJQ0FnSUNBZ0lDQWdZWEpuZFcxbGJuUnpXekJkSUQwOVBTQjFibVJsWm1sdVpXUWdQeUIwY25WbElEb2dZWEpuZFcxbGJuUnpXekJkWEc0Z0lDQWdJQ0FnSUNrN1hHNWNiaUFnSUNBZ0lDQWdjbVYwZFhKdU8xeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQXZMeUJNUlZRZ1ZFaEZJRk5OVDA5VVNFNUZVMU1nUWtWSFNVNGhYRzRnSUNBZ0lDQjJZWElnYzJOeWIyeHNZV0pzWlZCaGNtVnVkQ0E5SUdacGJtUlRZM0p2Ykd4aFlteGxVR0Z5Wlc1MEtIUm9hWE1wTzF4dUlDQWdJQ0FnZG1GeUlIQmhjbVZ1ZEZKbFkzUnpJRDBnYzJOeWIyeHNZV0pzWlZCaGNtVnVkQzVuWlhSQ2IzVnVaR2x1WjBOc2FXVnVkRkpsWTNRb0tUdGNiaUFnSUNBZ0lIWmhjaUJqYkdsbGJuUlNaV04wY3lBOUlIUm9hWE11WjJWMFFtOTFibVJwYm1kRGJHbGxiblJTWldOMEtDazdYRzVjYmlBZ0lDQWdJR2xtSUNoelkzSnZiR3hoWW14bFVHRnlaVzUwSUNFOVBTQmtMbUp2WkhrcElIdGNiaUFnSUNBZ0lDQWdMeThnY21WMlpXRnNJR1ZzWlcxbGJuUWdhVzV6YVdSbElIQmhjbVZ1ZEZ4dUlDQWdJQ0FnSUNCemJXOXZkR2hUWTNKdmJHd3VZMkZzYkNoY2JpQWdJQ0FnSUNBZ0lDQjBhR2x6TEZ4dUlDQWdJQ0FnSUNBZ0lITmpjbTlzYkdGaWJHVlFZWEpsYm5Rc1hHNGdJQ0FnSUNBZ0lDQWdjMk55YjJ4c1lXSnNaVkJoY21WdWRDNXpZM0p2Ykd4TVpXWjBJQ3NnWTJ4cFpXNTBVbVZqZEhNdWJHVm1kQ0F0SUhCaGNtVnVkRkpsWTNSekxteGxablFzWEc0Z0lDQWdJQ0FnSUNBZ2MyTnliMnhzWVdKc1pWQmhjbVZ1ZEM1elkzSnZiR3hVYjNBZ0t5QmpiR2xsYm5SU1pXTjBjeTUwYjNBZ0xTQndZWEpsYm5SU1pXTjBjeTUwYjNCY2JpQWdJQ0FnSUNBZ0tUdGNibHh1SUNBZ0lDQWdJQ0F2THlCeVpYWmxZV3dnY0dGeVpXNTBJR2x1SUhacFpYZHdiM0owSUhWdWJHVnpjeUJwY3lCbWFYaGxaRnh1SUNBZ0lDQWdJQ0JwWmlBb2R5NW5aWFJEYjIxd2RYUmxaRk4wZVd4bEtITmpjbTlzYkdGaWJHVlFZWEpsYm5RcExuQnZjMmwwYVc5dUlDRTlQU0FuWm1sNFpXUW5LU0I3WEc0Z0lDQWdJQ0FnSUNBZ2R5NXpZM0p2Ykd4Q2VTaDdYRzRnSUNBZ0lDQWdJQ0FnSUNCc1pXWjBPaUJ3WVhKbGJuUlNaV04wY3k1c1pXWjBMRnh1SUNBZ0lDQWdJQ0FnSUNBZ2RHOXdPaUJ3WVhKbGJuUlNaV04wY3k1MGIzQXNYRzRnSUNBZ0lDQWdJQ0FnSUNCaVpXaGhkbWx2Y2pvZ0ozTnRiMjkwYUNkY2JpQWdJQ0FnSUNBZ0lDQjlLVHRjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnTHk4Z2NtVjJaV0ZzSUdWc1pXMWxiblFnYVc0Z2RtbGxkM0J2Y25SY2JpQWdJQ0FnSUNBZ2R5NXpZM0p2Ykd4Q2VTaDdYRzRnSUNBZ0lDQWdJQ0FnYkdWbWREb2dZMnhwWlc1MFVtVmpkSE11YkdWbWRDeGNiaUFnSUNBZ0lDQWdJQ0IwYjNBNklHTnNhV1Z1ZEZKbFkzUnpMblJ2Y0N4Y2JpQWdJQ0FnSUNBZ0lDQmlaV2hoZG1sdmNqb2dKM050YjI5MGFDZGNiaUFnSUNBZ0lDQWdmU2s3WEc0Z0lDQWdJQ0I5WEc0Z0lDQWdmVHRjYmlBZ2ZWeHVYRzRnSUdsbUlDaDBlWEJsYjJZZ1pYaHdiM0owY3lBOVBUMGdKMjlpYW1WamRDY2dKaVlnZEhsd1pXOW1JRzF2WkhWc1pTQWhQVDBnSjNWdVpHVm1hVzVsWkNjcElIdGNiaUFnSUNBdkx5QmpiMjF0YjI1cWMxeHVJQ0FnSUcxdlpIVnNaUzVsZUhCdmNuUnpJRDBnZXlCd2IyeDVabWxzYkRvZ2NHOXNlV1pwYkd3Z2ZUdGNiaUFnZlNCbGJITmxJSHRjYmlBZ0lDQXZMeUJuYkc5aVlXeGNiaUFnSUNCd2IyeDVabWxzYkNncE8xeHVJQ0I5WEc1Y2JuMG9LU2s3WEc0aUxDSmpiMjV6ZENCRVFpQTlJQ2RvZEhSd2N6b3ZMMjVsZUhWekxXTmhkR0ZzYjJjdVptbHlaV0poYzJWcGJ5NWpiMjB2Y0c5emRITXVhbk52Ymo5aGRYUm9QVGRuTjNCNVMwdDVhMDR6VGpWbGQzSkpiV2hQWVZNMmRuZHlSbk5qTldaTGEzSnJPR1ZxZW1Zbk8xeHVYRzVqYjI1emRDQWtiRzloWkdsdVp5QTlJRUZ5Y21GNUxtWnliMjBvWkc5amRXMWxiblF1Y1hWbGNubFRaV3hsWTNSdmNrRnNiQ2duTG14dllXUnBibWNuS1NrN1hHNWpiMjV6ZENBa2JtRjJJRDBnWkc5amRXMWxiblF1WjJWMFJXeGxiV1Z1ZEVKNVNXUW9KMnB6TFc1aGRpY3BPMXh1WTI5dWMzUWdKSEJoY21Gc2JHRjRJRDBnWkc5amRXMWxiblF1Y1hWbGNubFRaV3hsWTNSdmNpZ25MbkJoY21Gc2JHRjRKeWs3WEc1amIyNXpkQ0FrWTI5dWRHVnVkQ0E5SUdSdlkzVnRaVzUwTG5GMVpYSjVVMlZzWldOMGIzSW9KeTVqYjI1MFpXNTBKeWs3WEc1amIyNXpkQ0FrZEdsMGJHVWdQU0JrYjJOMWJXVnVkQzVuWlhSRmJHVnRaVzUwUW5sSlpDZ25hbk10ZEdsMGJHVW5LVHRjYm1OdmJuTjBJQ1IxY0VGeWNtOTNJRDBnWkc5amRXMWxiblF1WjJWMFJXeGxiV1Z1ZEVKNVNXUW9KMnB6TFdGeWNtOTNKeWs3WEc1amIyNXpkQ0FrYlc5a1lXd2dQU0JrYjJOMWJXVnVkQzV4ZFdWeWVWTmxiR1ZqZEc5eUtDY3ViVzlrWVd3bktUdGNibU52Ym5OMElDUnNhV2RvZEdKdmVDQTlJR1J2WTNWdFpXNTBMbkYxWlhKNVUyVnNaV04wYjNJb0p5NXNhV2RvZEdKdmVDY3BPMXh1WTI5dWMzUWdKSFpwWlhjZ1BTQmtiMk4xYldWdWRDNXhkV1Z5ZVZObGJHVmpkRzl5S0NjdWJHbG5hSFJpYjNndGRtbGxkeWNwTzF4dVhHNWxlSEJ2Y25RZ2V5QmNibHgwUkVJc1hHNWNkQ1JzYjJGa2FXNW5MQ0JjYmx4MEpHNWhkaXdnWEc1Y2RDUndZWEpoYkd4aGVDeGNibHgwSkdOdmJuUmxiblFzWEc1Y2RDUjBhWFJzWlN4Y2JseDBKSFZ3UVhKeWIzY3NYRzVjZENSdGIyUmhiQ3hjYmx4MEpHeHBaMmgwWW05NExGeHVYSFFrZG1sbGR5QmNibjA3SWl3aWFXMXdiM0owSUhOdGIyOTBhSE5qY205c2JDQm1jbTl0SUNkemJXOXZkR2h6WTNKdmJHd3RjRzlzZVdacGJHd25PMXh1WEc1cGJYQnZjblFnZXlCaGRIUmhZMmhOYjJSaGJFeHBjM1JsYm1WeWN5d2dZWFIwWVdOb1ZYQkJjbkp2ZDB4cGMzUmxibVZ5Y3l3Z2JXRnJaVUZzY0doaFltVjBMQ0J0WVd0bFUyeHBaR1Z5SUgwZ1puSnZiU0FuTGk5dGIyUjFiR1Z6Snp0Y2JtbHRjRzl5ZENCN0lHRnlkR2xqYkdWVVpXMXdiR0YwWlN3Z2NtVnVaR1Z5VG1GMlRHY2dmU0JtY205dElDY3VMM1JsYlhCc1lYUmxjeWM3WEc1cGJYQnZjblFnZXlCa1pXSnZkVzVqWlN3Z2FHbGtaVXh2WVdScGJtY3NJSE5qY205c2JGUnZWRzl3SUgwZ1puSnZiU0FuTGk5MWRHbHNjeWM3WEc1cGJYQnZjblFnZXlCRVFpd2dKRzVoZGl3Z0pIQmhjbUZzYkdGNExDQWtZMjl1ZEdWdWRDd2dKSFJwZEd4bExDQWtkWEJCY25KdmR5d2dKR3hwWjJoMFltOTRMQ0FrZG1sbGR5QjlJR1p5YjIwZ0p5NHZZMjl1YzNSaGJuUnpKenRjYmx4dWJHVjBJSE52Y25STFpYa2dQU0F3T3lBdkx5QXdJRDBnWVhKMGFYTjBMQ0F4SUQwZ2RHbDBiR1ZjYm14bGRDQmxiblJ5YVdWeklEMGdleUJpZVVGMWRHaHZjam9nVzEwc0lHSjVWR2wwYkdVNklGdGRJSDA3WEc1c1pYUWdZM1Z5Y21WdWRFeGxkSFJsY2lBOUlDZEJKenRjYm14bGRDQnNhV2RvZEdKdmVDQTlJR1poYkhObE8xeHVYRzVqYjI1emRDQmhaR1JUYjNKMFFuVjBkRzl1VEdsemRHVnVaWEp6SUQwZ0tDa2dQVDRnZTF4dVhIUnNaWFFnSkdKNVFYSjBhWE4wSUQwZ1pHOWpkVzFsYm5RdVoyVjBSV3hsYldWdWRFSjVTV1FvSjJwekxXSjVMV0Z5ZEdsemRDY3BPMXh1WEhSc1pYUWdKR0o1VkdsMGJHVWdQU0JrYjJOMWJXVnVkQzVuWlhSRmJHVnRaVzUwUW5sSlpDZ25hbk10WW5rdGRHbDBiR1VuS1R0Y2JseDBKR0o1UVhKMGFYTjBMbUZrWkVWMlpXNTBUR2x6ZEdWdVpYSW9KMk5zYVdOckp5d2dLQ2tnUFQ0Z2UxeHVYSFJjZEdsbUlDaHpiM0owUzJWNUtTQjdYRzVjZEZ4MFhIUnpZM0p2Ykd4VWIxUnZjQ2dwTzF4dVhIUmNkRngwYzI5eWRFdGxlU0E5SURBN1hHNWNkRngwWEhRa1lubEJjblJwYzNRdVkyeGhjM05NYVhOMExtRmtaQ2duWVdOMGFYWmxKeWs3WEc1Y2RGeDBYSFFrWW5sVWFYUnNaUzVqYkdGemMweHBjM1F1Y21WdGIzWmxLQ2RoWTNScGRtVW5LVHRjYmx4dVhIUmNkRngwY21WdVpHVnlSVzUwY21sbGN5Z3BPMXh1WEhSY2RIMWNibHgwZlNrN1hHNWNibHgwSkdKNVZHbDBiR1V1WVdSa1JYWmxiblJNYVhOMFpXNWxjaWduWTJ4cFkyc25MQ0FvS1NBOVBpQjdYRzVjZEZ4MGFXWWdLQ0Z6YjNKMFMyVjVLU0I3WEc1Y2RGeDBYSFJ6WTNKdmJHeFViMVJ2Y0NncE8xeHVYSFJjZEZ4MGMyOXlkRXRsZVNBOUlERTdYRzVjZEZ4MFhIUWtZbmxVYVhSc1pTNWpiR0Z6YzB4cGMzUXVZV1JrS0NkaFkzUnBkbVVuS1R0Y2JseDBYSFJjZENSaWVVRnlkR2x6ZEM1amJHRnpjMHhwYzNRdWNtVnRiM1psS0NkaFkzUnBkbVVuS1R0Y2JseHVYSFJjZEZ4MGNtVnVaR1Z5Ulc1MGNtbGxjeWdwTzF4dVhIUmNkSDFjYmx4MGZTazdYRzU5TzF4dVhHNWpiMjV6ZENCaGRIUmhZMmhKYldGblpVeHBjM1JsYm1WeWN5QTlJQ2dwSUQwK0lIdGNibHgwWTI5dWMzUWdKR2x0WVdkbGN5QTlJRUZ5Y21GNUxtWnliMjBvWkc5amRXMWxiblF1Y1hWbGNubFRaV3hsWTNSdmNrRnNiQ2duTG1GeWRHbGpiR1V0YVcxaFoyVW5LU2s3WEc1Y2JseDBKR2x0WVdkbGN5NW1iM0pGWVdOb0tHbHRaeUE5UGlCN1hHNWNkRngwYVcxbkxtRmtaRVYyWlc1MFRHbHpkR1Z1WlhJb0oyTnNhV05ySnl3Z0tHVjJkQ2tnUFQ0Z2UxeHVYSFJjZEZ4MGFXWWdLQ0ZzYVdkb2RHSnZlQ2tnZTF4dVhIUmNkRngwWEhSc1pYUWdjM0pqSUQwZ2FXMW5Mbk55WXp0Y2JseDBYSFJjZEZ4MFhHNWNkRngwWEhSY2RDUnNhV2RvZEdKdmVDNWpiR0Z6YzB4cGMzUXVZV1JrS0NkemFHOTNMV2x0WnljcE8xeHVYSFJjZEZ4MFhIUWtkbWxsZHk1elpYUkJkSFJ5YVdKMWRHVW9KM04wZVd4bEp5d2dZR0poWTJ0bmNtOTFibVF0YVcxaFoyVTZJSFZ5YkNna2UzTnlZMzBwWUNrN1hHNWNkRngwWEhSY2RHeHBaMmgwWW05NElEMGdkSEoxWlR0Y2JseDBYSFJjZEgxY2JseDBYSFI5S1R0Y2JseDBmU2s3WEc1Y2JseDBKSFpwWlhjdVlXUmtSWFpsYm5STWFYTjBaVzVsY2lnblkyeHBZMnNuTENBb0tTQTlQaUI3WEc1Y2RGeDBhV1lnS0d4cFoyaDBZbTk0S1NCN1hHNWNkRngwWEhRa2JHbG5hSFJpYjNndVkyeGhjM05NYVhOMExuSmxiVzkyWlNnbmMyaHZkeTFwYldjbktUdGNibHgwWEhSY2RHeHBaMmgwWW05NElEMGdabUZzYzJVN1hHNWNkRngwZlZ4dVhIUjlLVHRjYm4wN1hHNWNibU52Ym5OMElISmxibVJsY2tWdWRISnBaWE1nUFNBb0tTQTlQaUI3WEc1Y2RHTnZibk4wSUNSaGNuUnBZMnhsVEdsemRDQTlJR1J2WTNWdFpXNTBMbWRsZEVWc1pXMWxiblJDZVVsa0tDZHFjeTFzYVhOMEp5azdYRzVjZEdOdmJuTjBJR1Z1ZEhKcFpYTk1hWE4wSUQwZ2MyOXlkRXRsZVNBL0lHVnVkSEpwWlhNdVlubFVhWFJzWlNBNklHVnVkSEpwWlhNdVlubEJkWFJvYjNJN1hHNWNibHgwSkdGeWRHbGpiR1ZNYVhOMExtbHVibVZ5U0ZSTlRDQTlJQ2NuTzF4dVhHNWNkR1Z1ZEhKcFpYTk1hWE4wTG1admNrVmhZMmdvS0dWdWRISjVMQ0JwS1NBOVBpQjdYRzVjZEZ4MEpHRnlkR2xqYkdWTWFYTjBMbWx1YzJWeWRFRmthbUZqWlc1MFNGUk5UQ2duWW1WbWIzSmxaVzVrSnl3Z1lYSjBhV05zWlZSbGJYQnNZWFJsS0dWdWRISjVMQ0JwS1NrN1hHNWNkRngwYldGclpWTnNhV1JsY2loa2IyTjFiV1Z1ZEM1blpYUkZiR1Z0Wlc1MFFubEpaQ2hnYzJ4cFpHVnlMU1I3YVgxZ0tTazdYRzVjZEgwcE8xeHVYRzVjZEdGMGRHRmphRWx0WVdkbFRHbHpkR1Z1WlhKektDazdYRzVjZEcxaGEyVkJiSEJvWVdKbGRDaHpiM0owUzJWNUtUdGNibjA3WEc1Y2JtTnZibk4wSUhObGRFUmhkR0ZCYm1SVGIzSjBRbmxVYVhSc1pTQTlJQ2hrWVhSaEtTQTlQaUI3WEc1Y2RHVnVkSEpwWlhNdVlubEJkWFJvYjNJZ1BTQmtZWFJoTzF4dVhIUmxiblJ5YVdWekxtSjVWR2wwYkdVZ1BTQmtZWFJoTG5Oc2FXTmxLQ2s3SUM4dklHTnZjR2xsY3lCa1lYUmhJR1p2Y2lCaWVWUnBkR3hsSUhOdmNuUmNibHh1WEhSbGJuUnlhV1Z6TG1KNVZHbDBiR1V1YzI5eWRDZ29ZU3dnWWlrZ1BUNGdlMXh1WEhSY2RHeGxkQ0JoVkdsMGJHVWdQU0JoTG5ScGRHeGxXekJkTG5SdlZYQndaWEpEWVhObEtDazdYRzVjZEZ4MGJHVjBJR0pVYVhSc1pTQTlJR0l1ZEdsMGJHVmJNRjB1ZEc5VmNIQmxja05oYzJVb0tUdGNibHgwWEhScFppQW9ZVlJwZEd4bElENGdZbFJwZEd4bEtTQnlaWFIxY200Z01UdGNibHgwWEhSbGJITmxJR2xtSUNoaFZHbDBiR1VnUENCaVZHbDBiR1VwSUhKbGRIVnliaUF0TVR0Y2JseDBYSFJsYkhObElISmxkSFZ5YmlBd08xeHVYSFI5S1R0Y2JuMDdYRzVjYm1OdmJuTjBJR1psZEdOb1JHRjBZU0E5SUNncElEMCtJSHRjYmx4MFptVjBZMmdvUkVJcExuUm9aVzRvY21WeklEMCtJSEpsY3k1cWMyOXVLQ2twWEc1Y2RDNTBhR1Z1S0dSaGRHRWdQVDRnZTF4dVhIUmNkSE5sZEVSaGRHRkJibVJUYjNKMFFubFVhWFJzWlNoa1lYUmhLVHRjYmx4MFhIUnlaVzVrWlhKRmJuUnlhV1Z6S0NrN1hHNWNkRngwYUdsa1pVeHZZV1JwYm1jb0tUdGNibHgwZlNsY2JseDBMbU5oZEdOb0tHVnljaUE5UGlCamIyNXpiMnhsTG5kaGNtNG9aWEp5S1NrN1hHNTlPMXh1WEc1amIyNXpkQ0JwYm1sMElEMGdLQ2tnUFQ0Z2UxeHVYSFJ6Ylc5dmRHaHpZM0p2Ykd3dWNHOXNlV1pwYkd3b0tUdGNibHgwWm1WMFkyaEVZWFJoS0NrN1hHNWNkSEpsYm1SbGNrNWhka3huS0NrN1hHNWNkR0ZrWkZOdmNuUkNkWFIwYjI1TWFYTjBaVzVsY25Nb0tUdGNibHgwWVhSMFlXTm9WWEJCY25KdmQweHBjM1JsYm1WeWN5Z3BPMXh1WEhSaGRIUmhZMmhOYjJSaGJFeHBjM1JsYm1WeWN5Z3BPMXh1ZlZ4dVhHNXBibWwwS0NrN1hHNGlMQ0pwYlhCdmNuUWdleUFrYlc5a1lXd2dmU0JtY205dElDY3VMaTlqYjI1emRHRnVkSE1uTzF4dVhHNXNaWFFnYlc5a1lXd2dQU0JtWVd4elpUdGNibU52Ym5OMElHRjBkR0ZqYUUxdlpHRnNUR2x6ZEdWdVpYSnpJRDBnS0NrZ1BUNGdlMXh1WEhSamIyNXpkQ0FrWm1sdVpDQTlJR1J2WTNWdFpXNTBMbWRsZEVWc1pXMWxiblJDZVVsa0tDZHFjeTFtYVc1a0p5azdYRzVjZEZ4dVhIUWtabWx1WkM1aFpHUkZkbVZ1ZEV4cGMzUmxibVZ5S0NkamJHbGpheWNzSUNncElEMCtJSHRjYmx4MFhIUWtiVzlrWVd3dVkyeGhjM05NYVhOMExtRmtaQ2duYzJodmR5Y3BPMXh1WEhSY2RHMXZaR0ZzSUQwZ2RISjFaVHRjYmx4MGZTazdYRzVjYmx4MEpHMXZaR0ZzTG1Ga1pFVjJaVzUwVEdsemRHVnVaWElvSjJOc2FXTnJKeXdnS0NrZ1BUNGdlMXh1WEhSY2RDUnRiMlJoYkM1amJHRnpjMHhwYzNRdWNtVnRiM1psS0NkemFHOTNKeWs3WEc1Y2RGeDBiVzlrWVd3Z1BTQm1ZV3h6WlR0Y2JseDBmU2s3WEc1Y2JseDBkMmx1Wkc5M0xtRmtaRVYyWlc1MFRHbHpkR1Z1WlhJb0oydGxlV1J2ZDI0bkxDQW9LU0E5UGlCN1hHNWNkRngwYVdZZ0tHMXZaR0ZzS1NCN1hHNWNkRngwWEhSelpYUlVhVzFsYjNWMEtDZ3BJRDArSUh0Y2JseDBYSFJjZEZ4MEpHMXZaR0ZzTG1Oc1lYTnpUR2x6ZEM1eVpXMXZkbVVvSjNOb2IzY25LVHRjYmx4MFhIUmNkRngwYlc5a1lXd2dQU0JtWVd4elpUdGNibHgwWEhSY2RIMHNJRFl3TUNrN1hHNWNkRngwZlR0Y2JseDBmU2s3WEc1OU8xeHVYRzVsZUhCdmNuUWdaR1ZtWVhWc2RDQmhkSFJoWTJoTmIyUmhiRXhwYzNSbGJtVnljenNpTENKcGJYQnZjblFnZXlBa2RHbDBiR1VzSUNSd1lYSmhiR3hoZUN3Z0pIVndRWEp5YjNjZ2ZTQm1jbTl0SUNjdUxpOWpiMjV6ZEdGdWRITW5PMXh1YVcxd2IzSjBJSHNnYzJOeWIyeHNWRzlVYjNBZ2ZTQm1jbTl0SUNjdUxpOTFkR2xzY3ljN1hHNWNibXhsZENCd2NtVjJPMXh1YkdWMElHTjFjbkpsYm5RZ1BTQXdPMXh1YkdWMElHbHpVMmh2ZDJsdVp5QTlJR1poYkhObE8xeHVYRzVqYjI1emRDQmhkSFJoWTJoVmNFRnljbTkzVEdsemRHVnVaWEp6SUQwZ0tDa2dQVDRnZTF4dVhIUWtjR0Z5WVd4c1lYZ3VZV1JrUlhabGJuUk1hWE4wWlc1bGNpZ25jMk55YjJ4c0p5d2dLQ2tnUFQ0Z2UxeHVYSFJjZEd4bGRDQjVJRDBnSkhScGRHeGxMbWRsZEVKdmRXNWthVzVuUTJ4cFpXNTBVbVZqZENncExuazdYRzVjYmx4MFhIUnBaaUFvWTNWeWNtVnVkQ0FoUFQwZ2VTa2dlMXh1WEhSY2RGeDBjSEpsZGlBOUlHTjFjbkpsYm5RN1hHNWNkRngwWEhSamRYSnlaVzUwSUQwZ2VUdGNibHgwWEhSOU8xeHVYRzVjZEZ4MGFXWWdLSGtnUEQwZ0xUVXdJQ1ltSUNGcGMxTm9iM2RwYm1jcElIdGNibHgwWEhSY2RDUjFjRUZ5Y205M0xtTnNZWE56VEdsemRDNWhaR1FvSjNOb2IzY25LVHRjYmx4MFhIUmNkR2x6VTJodmQybHVaeUE5SUhSeWRXVTdYRzVjZEZ4MGZTQmxiSE5sSUdsbUlDaDVJRDRnTFRVd0lDWW1JR2x6VTJodmQybHVaeWtnZTF4dVhIUmNkRngwSkhWd1FYSnliM2N1WTJ4aGMzTk1hWE4wTG5KbGJXOTJaU2duYzJodmR5Y3BPMXh1WEhSY2RGeDBhWE5UYUc5M2FXNW5JRDBnWm1Gc2MyVTdYRzVjZEZ4MGZWeHVYSFI5S1R0Y2JseHVYSFFrZFhCQmNuSnZkeTVoWkdSRmRtVnVkRXhwYzNSbGJtVnlLQ2RqYkdsamF5Y3NJQ2dwSUQwK0lITmpjbTlzYkZSdlZHOXdLQ2twTzF4dWZUdGNibHh1Wlhod2IzSjBJR1JsWm1GMWJIUWdZWFIwWVdOb1ZYQkJjbkp2ZDB4cGMzUmxibVZ5Y3pzaUxDSnBiWEJ2Y25RZ1lYUjBZV05vVFc5a1lXeE1hWE4wWlc1bGNuTWdabkp2YlNBbkxpOWhkSFJoWTJoTmIyUmhiRXhwYzNSbGJtVnljeWM3WEc1cGJYQnZjblFnWVhSMFlXTm9WWEJCY25KdmQweHBjM1JsYm1WeWN5Qm1jbTl0SUNjdUwyRjBkR0ZqYUZWd1FYSnliM2RNYVhOMFpXNWxjbk1uTzF4dWFXMXdiM0owSUcxaGEyVkJiSEJvWVdKbGRDQm1jbTl0SUNjdUwyMWhhMlZCYkhCb1lXSmxkQ2M3WEc1cGJYQnZjblFnYldGclpWTnNhV1JsY2lCbWNtOXRJQ2N1TDIxaGEyVlRiR2xrWlhJbk8xeHVYRzVsZUhCdmNuUWdleUJjYmx4MFlYUjBZV05vVFc5a1lXeE1hWE4wWlc1bGNuTXNJRnh1WEhSaGRIUmhZMmhWY0VGeWNtOTNUR2x6ZEdWdVpYSnpMQ0JjYmx4MGJXRnJaVUZzY0doaFltVjBMQ0JjYmx4MGJXRnJaVk5zYVdSbGNpQmNibjA3SWl3aVkyOXVjM1FnWVd4d2FHRmlaWFFnUFNCYkoyRW5MQ0FuWWljc0lDZGpKeXdnSjJRbkxDQW5aU2NzSUNkbUp5d2dKMmNuTENBbmFDY3NJQ2RwSnl3Z0oyb25MQ0FuYXljc0lDZHNKeXdnSjIwbkxDQW5iaWNzSUNkdkp5d2dKM0FuTENBbmNpY3NJQ2R6Snl3Z0ozUW5MQ0FuZFNjc0lDZDJKeXdnSjNjbkxDQW5lU2NzSUNkNkoxMDdYRzVjYm1OdmJuTjBJRzFoYTJWQmJIQm9ZV0psZENBOUlDaHpiM0owUzJWNUtTQTlQaUI3WEc1Y2RHTnZibk4wSUdacGJtUkdhWEp6ZEVWdWRISjVJRDBnS0dOb1lYSXBJRDArSUh0Y2JseDBYSFJqYjI1emRDQnpaV3hsWTNSdmNpQTlJSE52Y25STFpYa2dQeUFuTG1wekxXVnVkSEo1TFhScGRHeGxKeUE2SUNjdWFuTXRaVzUwY25rdFlYSjBhWE4wSnp0Y2JseDBYSFJqYjI1emRDQndjbVYyVTJWc1pXTjBiM0lnUFNBaGMyOXlkRXRsZVNBL0lDY3Vhbk10Wlc1MGNua3RkR2wwYkdVbklEb2dKeTVxY3kxbGJuUnllUzFoY25ScGMzUW5PMXh1WEc1Y2RGeDBZMjl1YzNRZ0pHVnVkSEpwWlhNZ1BTQkJjbkpoZVM1bWNtOXRLR1J2WTNWdFpXNTBMbkYxWlhKNVUyVnNaV04wYjNKQmJHd29jMlZzWldOMGIzSXBLVHRjYmx4MFhIUmpiMjV6ZENBa2NISmxka1Z1ZEhKcFpYTWdQU0JCY25KaGVTNW1jbTl0S0dSdlkzVnRaVzUwTG5GMVpYSjVVMlZzWldOMGIzSkJiR3dvY0hKbGRsTmxiR1ZqZEc5eUtTazdYRzVjYmx4MFhIUWtjSEpsZGtWdWRISnBaWE11Wm05eVJXRmphQ2hsYm5SeWVTQTlQaUJsYm5SeWVTNXlaVzF2ZG1WQmRIUnlhV0oxZEdVb0oyNWhiV1VuS1NrN1hHNWNibHgwWEhSeVpYUjFjbTRnSkdWdWRISnBaWE11Wm1sdVpDaGxiblJ5ZVNBOVBpQjdYRzVjZEZ4MFhIUnNaWFFnYm05a1pTQTlJR1Z1ZEhKNUxtNWxlSFJGYkdWdFpXNTBVMmxpYkdsdVp6dGNibHgwWEhSY2RISmxkSFZ5YmlCdWIyUmxMbWx1Ym1WeVNGUk5URnN3WFNBOVBUMGdZMmhoY2lCOGZDQnViMlJsTG1sdWJtVnlTRlJOVEZzd1hTQTlQVDBnWTJoaGNpNTBiMVZ3Y0dWeVEyRnpaU2dwTzF4dVhIUmNkSDBwTzF4dVhIUjlPMXh1WEc1Y2RHTnZibk4wSUdGMGRHRmphRUZ1WTJodmNreHBjM1JsYm1WeUlEMGdLQ1JoYm1Ob2IzSXNJR3hsZEhSbGNpa2dQVDRnZTF4dVhIUmNkQ1JoYm1Ob2IzSXVZV1JrUlhabGJuUk1hWE4wWlc1bGNpZ25ZMnhwWTJzbkxDQW9LU0E5UGlCN1hHNWNkRngwWEhSamIyNXpkQ0JzWlhSMFpYSk9iMlJsSUQwZ1pHOWpkVzFsYm5RdVoyVjBSV3hsYldWdWRFSjVTV1FvYkdWMGRHVnlLVHRjYmx4MFhIUmNkR3hsZENCMFlYSm5aWFE3WEc1Y2JseDBYSFJjZEdsbUlDZ2hjMjl5ZEV0bGVTa2dlMXh1WEhSY2RGeDBYSFIwWVhKblpYUWdQU0JzWlhSMFpYSWdQVDA5SUNkaEp5QS9JR1J2WTNWdFpXNTBMbWRsZEVWc1pXMWxiblJDZVVsa0tDZGhibU5vYjNJdGRHRnlaMlYwSnlrZ09pQnNaWFIwWlhKT2IyUmxMbkJoY21WdWRFVnNaVzFsYm5RdWNHRnlaVzUwUld4bGJXVnVkQzV3WVhKbGJuUkZiR1Z0Wlc1MExuQmhjbVZ1ZEVWc1pXMWxiblF1Y0hKbGRtbHZkWE5GYkdWdFpXNTBVMmxpYkdsdVp5NXhkV1Z5ZVZObGJHVmpkRzl5S0NjdWFuTXRZWEowYVdOc1pTMWhibU5vYjNJdGRHRnlaMlYwSnlrN1hHNWNkRngwWEhSOUlHVnNjMlVnZTF4dVhIUmNkRngwWEhSMFlYSm5aWFFnUFNCc1pYUjBaWElnUFQwOUlDZGhKeUEvSUdSdlkzVnRaVzUwTG1kbGRFVnNaVzFsYm5SQ2VVbGtLQ2RoYm1Ob2IzSXRkR0Z5WjJWMEp5a2dPaUJzWlhSMFpYSk9iMlJsTG5CaGNtVnVkRVZzWlcxbGJuUXVjR0Z5Wlc1MFJXeGxiV1Z1ZEM1d1lYSmxiblJGYkdWdFpXNTBMbkJ5WlhacGIzVnpSV3hsYldWdWRGTnBZbXhwYm1jdWNYVmxjbmxUWld4bFkzUnZjaWduTG1wekxXRnlkR2xqYkdVdFlXNWphRzl5TFhSaGNtZGxkQ2NwTzF4dVhIUmNkRngwZlR0Y2JseHVYSFJjZEZ4MGRHRnlaMlYwTG5OamNtOXNiRWx1ZEc5V2FXVjNLSHRpWldoaGRtbHZjam9nWENKemJXOXZkR2hjSWl3Z1lteHZZMnM2SUZ3aWMzUmhjblJjSW4wcE8xeHVYSFJjZEgwcE8xeHVYSFI5TzF4dVhHNWNkR3hsZENCaFkzUnBkbVZGYm5SeWFXVnpJRDBnZTMwN1hHNWNkR3hsZENBa2IzVjBaWElnUFNCa2IyTjFiV1Z1ZEM1eGRXVnllVk5sYkdWamRHOXlLQ2N1WVd4d2FHRmlaWFJmWDJ4bGRIUmxjbk1uS1R0Y2JseDBKRzkxZEdWeUxtbHVibVZ5U0ZSTlRDQTlJQ2NuTzF4dVhHNWNkR0ZzY0doaFltVjBMbVp2Y2tWaFkyZ29iR1YwZEdWeUlEMCtJSHRjYmx4MFhIUnNaWFFnSkdacGNuTjBSVzUwY25rZ1BTQm1hVzVrUm1seWMzUkZiblJ5ZVNoc1pYUjBaWElwTzF4dVhIUmNkR3hsZENBa1lXNWphRzl5SUQwZ1pHOWpkVzFsYm5RdVkzSmxZWFJsUld4bGJXVnVkQ2duWVNjcE8xeHVYRzVjZEZ4MGFXWWdLQ0VrWm1seWMzUkZiblJ5ZVNrZ2NtVjBkWEp1TzF4dVhHNWNkRngwSkdacGNuTjBSVzUwY25rdWFXUWdQU0JzWlhSMFpYSTdYRzVjZEZ4MEpHRnVZMmh2Y2k1cGJtNWxja2hVVFV3Z1BTQnNaWFIwWlhJdWRHOVZjSEJsY2tOaGMyVW9LVHRjYmx4MFhIUWtZVzVqYUc5eUxtTnNZWE56VG1GdFpTQTlJQ2RoYkhCb1lXSmxkRjlmYkdWMGRHVnlMV0Z1WTJodmNpYzdYRzVjYmx4MFhIUmhkSFJoWTJoQmJtTm9iM0pNYVhOMFpXNWxjaWdrWVc1amFHOXlMQ0JzWlhSMFpYSXBPMXh1WEhSY2RDUnZkWFJsY2k1aGNIQmxibVJEYUdsc1pDZ2tZVzVqYUc5eUtUdGNibHgwZlNrN1hHNTlPMXh1WEc1bGVIQnZjblFnWkdWbVlYVnNkQ0J0WVd0bFFXeHdhR0ZpWlhRN0lpd2lZMjl1YzNRZ2JXRnJaVk5zYVdSbGNpQTlJQ2drYzJ4cFpHVnlLU0E5UGlCN1hHNWNkR052Ym5OMElDUmhjbkp2ZDA1bGVIUWdQU0FrYzJ4cFpHVnlMbkJoY21WdWRFVnNaVzFsYm5RdWNYVmxjbmxUWld4bFkzUnZjaWduTG1GeWNtOTNMVzVsZUhRbktUdGNibHgwWTI5dWMzUWdKR0Z5Y205M1VISmxkaUE5SUNSemJHbGtaWEl1Y0dGeVpXNTBSV3hsYldWdWRDNXhkV1Z5ZVZObGJHVmpkRzl5S0NjdVlYSnliM2N0Y0hKbGRpY3BPMXh1WEc1Y2RHeGxkQ0JqZFhKeVpXNTBJRDBnSkhOc2FXUmxjaTVtYVhKemRFVnNaVzFsYm5SRGFHbHNaRHRjYmx4MEpHRnljbTkzVG1WNGRDNWhaR1JGZG1WdWRFeHBjM1JsYm1WeUtDZGpiR2xqYXljc0lDZ3BJRDArSUh0Y2JseDBYSFJqYjI1emRDQnVaWGgwSUQwZ1kzVnljbVZ1ZEM1dVpYaDBSV3hsYldWdWRGTnBZbXhwYm1jN1hHNWNkRngwYVdZZ0tHNWxlSFFwSUh0Y2JseDBYSFJjZEc1bGVIUXVjMk55YjJ4c1NXNTBiMVpwWlhjb2UySmxhR0YyYVc5eU9pQmNJbk50YjI5MGFGd2lMQ0JpYkc5amF6b2dYQ0p1WldGeVpYTjBYQ0lzSUdsdWJHbHVaVG9nWENKalpXNTBaWEpjSW4wcE8xeHVYSFJjZEZ4MFkzVnljbVZ1ZENBOUlHNWxlSFE3WEc1Y2RGeDBmVnh1WEhSOUtUdGNibHh1WEhRa1lYSnliM2RRY21WMkxtRmtaRVYyWlc1MFRHbHpkR1Z1WlhJb0oyTnNhV05ySnl3Z0tDa2dQVDRnZTF4dVhIUmNkR052Ym5OMElIQnlaWFlnUFNCamRYSnlaVzUwTG5CeVpYWnBiM1Z6Uld4bGJXVnVkRk5wWW14cGJtYzdYRzVjZEZ4MGFXWWdLSEJ5WlhZcElIdGNibHgwWEhSY2RIQnlaWFl1YzJOeWIyeHNTVzUwYjFacFpYY29lMkpsYUdGMmFXOXlPaUJjSW5OdGIyOTBhRndpTENCaWJHOWphem9nWENKdVpXRnlaWE4wWENJc0lHbHViR2x1WlRvZ1hDSmpaVzUwWlhKY0luMHBPMXh1WEhSY2RGeDBZM1Z5Y21WdWRDQTlJSEJ5WlhZN1hHNWNkRngwZlZ4dVhIUjlLVnh1ZlR0Y2JseHVaWGh3YjNKMElHUmxabUYxYkhRZ2JXRnJaVk5zYVdSbGNqc2lMQ0pqYjI1emRDQnBiV0ZuWlZSbGJYQnNZWFJsSUQwZ0tHbHRZV2RsS1NBOVBpQmdQR2x0WnlCamJHRnpjejFjSW1GeWRHbGpiR1V0YVcxblhDSWdjM0pqUFZ3aUxpNHZMaTR2WVhOelpYUnpMMmx0WVdkbGN5OGtlMmx0WVdkbGZWd2lQand2YVcxblBtQTdYRzVjYm1OdmJuTjBJR0Z5ZEdsamJHVlVaVzF3YkdGMFpTQTlJQ2hsYm5SeWVTd2dhU2tnUFQ0Z2UxeHVYSFJqYjI1emRDQjdJSFJwZEd4bExDQm1hWEp6ZEU1aGJXVXNJR3hoYzNST1lXMWxMQ0JwYldGblpYTXNJR1JsYzJOeWFYQjBhVzl1TENCa1pYUmhhV3dnZlNBOUlHVnVkSEo1TzF4dVhHNWNkR052Ym5OMElHbHRZV2RsU0ZSTlRDQTlJR2x0WVdkbGN5NXNaVzVuZEdnZ1B5QmNibHgwWEhScGJXRm5aWE11YldGd0tHbHRZV2RsSUQwK0lHbHRZV2RsVkdWdGNHeGhkR1VvYVcxaFoyVXBLUzVxYjJsdUtDY25LU0E2SUNjbk8xeHVYRzVjZEhKbGRIVnliaUFnWUZ4dVhIUmNkRHhoY25ScFkyeGxJR05zWVhOelBWd2lZWEowYVdOc1pWOWZiM1YwWlhKY0lqNWNibHgwWEhSY2REeGthWFlnWTJ4aGMzTTlYQ0poY25ScFkyeGxYMTlwYm01bGNsd2lQbHh1WEhSY2RGeDBYSFE4WkdsMklHTnNZWE56UFZ3aVlYSjBhV05zWlY5ZmFHVmhaR2x1WjF3aVBseHVYSFJjZEZ4MFhIUmNkRHhoSUdOc1lYTnpQVndpYW5NdFpXNTBjbmt0ZEdsMGJHVmNJajQ4TDJFK1hHNWNkRngwWEhSY2RGeDBQR2d5SUdOc1lYTnpQVndpWVhKMGFXTnNaUzFvWldGa2FXNW5YMTkwYVhSc1pWd2lQaVI3ZEdsMGJHVjlQQzlvTWo1Y2JseDBYSFJjZEZ4MFhIUThaR2wySUdOc1lYTnpQVndpWVhKMGFXTnNaUzFvWldGa2FXNW5YMTl1WVcxbFhDSStYRzVjZEZ4MFhIUmNkRngwWEhROGMzQmhiaUJqYkdGemN6MWNJbUZ5ZEdsamJHVXRhR1ZoWkdsdVoxOWZibUZ0WlMwdFptbHljM1JjSWo0a2UyWnBjbk4wVG1GdFpYMDhMM053WVc0K1hHNWNkRngwWEhSY2RGeDBYSFE4WVNCamJHRnpjejFjSW1wekxXVnVkSEo1TFdGeWRHbHpkRndpUGp3dllUNWNibHgwWEhSY2RGeDBYSFJjZER4emNHRnVJR05zWVhOelBWd2lZWEowYVdOc1pTMW9aV0ZrYVc1blgxOXVZVzFsTFMxc1lYTjBYQ0krSkh0c1lYTjBUbUZ0WlgwOEwzTndZVzQrWEc1Y2RGeDBYSFJjZEZ4MFBDOWthWFkrWEc1Y2RGeDBYSFJjZER3dlpHbDJQbHgwWEc1Y2RGeDBYSFJjZER4a2FYWWdZMnhoYzNNOVhDSmhjblJwWTJ4bFgxOXpiR2xrWlhJdGIzVjBaWEpjSWo1Y2JseDBYSFJjZEZ4MFhIUThaR2wySUdOc1lYTnpQVndpWVhKMGFXTnNaVjlmYzJ4cFpHVnlMV2x1Ym1WeVhDSWdhV1E5WENKemJHbGtaWEl0Skh0cGZWd2lQbHh1WEhSY2RGeDBYSFJjZEZ4MEpIdHBiV0ZuWlVoVVRVeDlYRzVjZEZ4MFhIUmNkRngwWEhROFpHbDJJR05zWVhOelBWd2lZWEowYVdOc1pTMWtaWE5qY21sd2RHbHZibDlmYjNWMFpYSmNJajVjYmx4MFhIUmNkRngwWEhSY2RGeDBQR1JwZGlCamJHRnpjejFjSW1GeWRHbGpiR1V0WkdWelkzSnBjSFJwYjI1Y0lqNGtlMlJsYzJOeWFYQjBhVzl1ZlR3dlpHbDJQbHh1WEhSY2RGeDBYSFJjZEZ4MFhIUThaR2wySUdOc1lYTnpQVndpWVhKMGFXTnNaUzFrWlhSaGFXeGNJajRrZTJSbGRHRnBiSDA4TDJScGRqNWNibHgwWEhSY2RGeDBYSFJjZER3dlpHbDJQbHh1WEhSY2RGeDBYSFJjZER3dlpHbDJQbHh1WEhSY2RGeDBYSFJjZER4a2FYWWdZMnhoYzNNOVhDSmhjblJwWTJ4bFgxOXpZM0p2Ykd3dFkyOXVkSEp2YkhOY0lqNWNibHgwWEhSY2RGeDBYSFJjZER4emNHRnVJR05zWVhOelBWd2lZMjl1ZEhKdmJITWdZWEp5YjNjdGNISmxkbHdpUHVLR2tEd3ZjM0JoYmo0Z1hHNWNkRngwWEhSY2RGeDBYSFE4YzNCaGJpQmpiR0Z6Y3oxY0ltTnZiblJ5YjJ4eklHRnljbTkzTFc1bGVIUmNJajdpaHBJOEwzTndZVzQrWEc1Y2RGeDBYSFJjZEZ4MFBDOWthWFkrWEc1Y2RGeDBYSFJjZEZ4MFBIQWdZMnhoYzNNOVhDSnFjeTFoY25ScFkyeGxMV0Z1WTJodmNpMTBZWEpuWlhSY0lqNDhMM0ErWEc1Y2RGeDBYSFE4TDJScGRqNWNibHgwWEhROEwyRnlkR2xqYkdVK1hHNWNkR0JjYm4wN1hHNWNibVY0Y0c5eWRDQmtaV1poZFd4MElHRnlkR2xqYkdWVVpXMXdiR0YwWlRzaUxDSnBiWEJ2Y25RZ1lYSjBhV05zWlZSbGJYQnNZWFJsSUdaeWIyMGdKeTR2WVhKMGFXTnNaU2M3WEc1cGJYQnZjblFnY21WdVpHVnlUbUYyVEdjZ1puSnZiU0FuTGk5dVlYWk1aeWM3WEc1Y2JtVjRjRzl5ZENCN0lHRnlkR2xqYkdWVVpXMXdiR0YwWlN3Z2NtVnVaR1Z5VG1GMlRHY2dmVHNpTENKamIyNXpkQ0IwWlcxd2JHRjBaU0E5SUZ4dVhIUmdQR1JwZGlCamJHRnpjejFjSW01aGRsOWZhVzV1WlhKY0lqNWNibHgwWEhROFpHbDJJR05zWVhOelBWd2libUYyWDE5emIzSjBMV0o1WENJK1hHNWNkRngwWEhROGMzQmhiaUJqYkdGemN6MWNJbk52Y25RdFlubGZYM1JwZEd4bFhDSStVMjl5ZENCaWVUd3ZjM0JoYmo1Y2JseDBYSFJjZER4aWRYUjBiMjRnWTJ4aGMzTTlYQ0p6YjNKMExXSjVJSE52Y25RdFlubGZYMko1TFdGeWRHbHpkQ0JoWTNScGRtVmNJaUJwWkQxY0ltcHpMV0o1TFdGeWRHbHpkRndpUGtGeWRHbHpkRHd2WW5WMGRHOXVQbHh1WEhSY2RGeDBQSE53WVc0Z1kyeGhjM005WENKemIzSjBMV0o1WDE5a2FYWnBaR1Z5WENJK0lId2dQQzl6Y0dGdVBseHVYSFJjZEZ4MFBHSjFkSFJ2YmlCamJHRnpjejFjSW5OdmNuUXRZbmtnYzI5eWRDMWllVjlmWW5rdGRHbDBiR1ZjSWlCcFpEMWNJbXB6TFdKNUxYUnBkR3hsWENJK1ZHbDBiR1U4TDJKMWRIUnZiajVjYmx4MFhIUmNkRHh6Y0dGdUlHTnNZWE56UFZ3aVptbHVaRndpSUdsa1BWd2lhbk10Wm1sdVpGd2lQbHh1WEhSY2RGeDBYSFFvUEhOd1lXNGdZMnhoYzNNOVhDSm1hVzVrTFMxcGJtNWxjbHdpUGlZak9EazRORHRHUEM5emNHRnVQaWxjYmx4MFhIUmNkRHd2YzNCaGJqNWNibHgwWEhROEwyUnBkajVjYmx4MFhIUThaR2wySUdOc1lYTnpQVndpYm1GMlgxOWhiSEJvWVdKbGRGd2lQbHh1WEhSY2RGeDBQSE53WVc0Z1kyeGhjM005WENKaGJIQm9ZV0psZEY5ZmRHbDBiR1ZjSWo1SGJ5QjBiend2YzNCaGJqNWNibHgwWEhSY2REeGthWFlnWTJ4aGMzTTlYQ0poYkhCb1lXSmxkRjlmYkdWMGRHVnljMXdpUGp3dlpHbDJQbHh1WEhSY2REd3ZaR2wyUGx4dVhIUThMMlJwZGo1Z08xeHVYRzVqYjI1emRDQnlaVzVrWlhKT1lYWk1aeUE5SUNncElEMCtJSHRjYmx4MGJHVjBJRzVoZGs5MWRHVnlJRDBnWkc5amRXMWxiblF1WjJWMFJXeGxiV1Z1ZEVKNVNXUW9KMnB6TFc1aGRpY3BPMXh1WEhSdVlYWlBkWFJsY2k1cGJtNWxja2hVVFV3Z1BTQjBaVzF3YkdGMFpUdGNibjA3WEc1Y2JtVjRjRzl5ZENCa1pXWmhkV3gwSUhKbGJtUmxjazVoZGt4bk95SXNJbWx0Y0c5eWRDQjdJQ1JzYjJGa2FXNW5MQ0FrYm1GMkxDQWtjR0Z5WVd4c1lYZ3NJQ1JqYjI1MFpXNTBMQ0FrZEdsMGJHVXNJQ1JoY25KdmR5d2dKRzF2WkdGc0xDQWtiR2xuYUhSaWIzZ3NJQ1IyYVdWM0lIMGdabkp2YlNBbkxpNHZZMjl1YzNSaGJuUnpKenRjYmx4dVkyOXVjM1FnWkdWaWIzVnVZMlVnUFNBb1ptNHNJSFJwYldVcElEMCtJSHRjYmlBZ2JHVjBJSFJwYldWdmRYUTdYRzVjYmlBZ2NtVjBkWEp1SUdaMWJtTjBhVzl1S0NrZ2UxeHVJQ0FnSUdOdmJuTjBJR1oxYm1OMGFXOXVRMkZzYkNBOUlDZ3BJRDArSUdadUxtRndjR3g1S0hSb2FYTXNJR0Z5WjNWdFpXNTBjeWs3WEc0Z0lDQWdYRzRnSUNBZ1kyeGxZWEpVYVcxbGIzVjBLSFJwYldWdmRYUXBPMXh1SUNBZ0lIUnBiV1Z2ZFhRZ1BTQnpaWFJVYVcxbGIzVjBLR1oxYm1OMGFXOXVRMkZzYkN3Z2RHbHRaU2s3WEc0Z0lIMWNibjA3WEc1Y2JtTnZibk4wSUdocFpHVk1iMkZrYVc1bklEMGdLQ2tnUFQ0Z2UxeHVYSFFrYkc5aFpHbHVaeTVtYjNKRllXTm9LR1ZzWlcwZ1BUNGdaV3hsYlM1amJHRnpjMHhwYzNRdVlXUmtLQ2R5WldGa2VTY3BLVHRjYmx4MEpHNWhkaTVqYkdGemMweHBjM1F1WVdSa0tDZHlaV0ZrZVNjcE8xeHVmVHRjYmx4dVkyOXVjM1FnYzJOeWIyeHNWRzlVYjNBZ1BTQW9LU0E5UGlCN1hHNWNkR3hsZENCMGIzQWdQU0JrYjJOMWJXVnVkQzVuWlhSRmJHVnRaVzUwUW5sSlpDZ25ZVzVqYUc5eUxYUmhjbWRsZENjcE8xeHVYSFIwYjNBdWMyTnliMnhzU1c1MGIxWnBaWGNvZTJKbGFHRjJhVzl5T2lCY0luTnRiMjkwYUZ3aUxDQmliRzlqYXpvZ1hDSnpkR0Z5ZEZ3aWZTazdYRzU5TzF4dVhHNWxlSEJ2Y25RZ2V5QmtaV0p2ZFc1alpTd2dhR2xrWlV4dllXUnBibWNzSUhOamNtOXNiRlJ2Vkc5d0lIMDdJbDE5In0=
