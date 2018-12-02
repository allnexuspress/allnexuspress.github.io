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

var _templates = require('./templates');

var _utils = require('./utils');

var _constants = require('./constants');

var _modules = require('./modules');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var sortKey = 0; // 0 = artist, 1 = title
var entries = { byAuthor: [], byTitle: [] };

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
		(0, _modules.makeSlider)(document.getElementById('slider-' + i));
	});

	(0, _modules.attachImageListeners)();
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

},{"./constants":2,"./modules":7,"./templates":11,"./utils":13,"smoothscroll-polyfill":1}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _constants = require('../constants');

var lightbox = false;

var attachImageListeners = function attachImageListeners() {
	var $images = Array.from(document.querySelectorAll('.article-img'));

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

exports.default = attachImageListeners;

},{"../constants":2}],5:[function(require,module,exports){
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

},{"../constants":2}],6:[function(require,module,exports){
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

},{"../constants":2,"../utils":13}],7:[function(require,module,exports){
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

},{"./attachImageListeners":4,"./attachModalListeners":5,"./attachUpArrowListeners":6,"./makeAlphabet":8,"./makeSlider":9}],8:[function(require,module,exports){
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

},{}],9:[function(require,module,exports){
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

},{}],10:[function(require,module,exports){
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

},{}],11:[function(require,module,exports){
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

},{"./article":10,"./navLg":12}],12:[function(require,module,exports){
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

},{}],13:[function(require,module,exports){
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvc21vb3Roc2Nyb2xsLXBvbHlmaWxsL2Rpc3Qvc21vb3Roc2Nyb2xsLmpzIiwic3JjL2pzL2NvbnN0YW50cy5qcyIsInNyYy9qcy9pbmRleC5qcyIsInNyYy9qcy9tb2R1bGVzL2F0dGFjaEltYWdlTGlzdGVuZXJzLmpzIiwic3JjL2pzL21vZHVsZXMvYXR0YWNoTW9kYWxMaXN0ZW5lcnMuanMiLCJzcmMvanMvbW9kdWxlcy9hdHRhY2hVcEFycm93TGlzdGVuZXJzLmpzIiwic3JjL2pzL21vZHVsZXMvaW5kZXguanMiLCJzcmMvanMvbW9kdWxlcy9tYWtlQWxwaGFiZXQuanMiLCJzcmMvanMvbW9kdWxlcy9tYWtlU2xpZGVyLmpzIiwic3JjL2pzL3RlbXBsYXRlcy9hcnRpY2xlLmpzIiwic3JjL2pzL3RlbXBsYXRlcy9pbmRleC5qcyIsInNyYy9qcy90ZW1wbGF0ZXMvbmF2TGcuanMiLCJzcmMvanMvdXRpbHMvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNB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SSxXQUFXLFNBQVMsY0FBVCxDQUF3QixRQUF4QixDQUFmO0FBQ0EsVUFBUyxTQUFULEdBQXFCLFFBQXJCO0FBQ0EsQ0FIRDs7a0JBS2UsVzs7Ozs7Ozs7OztBQ3RCZjs7QUFFQSxJQUFNLFdBQVcsU0FBWCxRQUFXLENBQUMsRUFBRCxFQUFLLElBQUwsRUFBYztBQUM3QixNQUFJLGdCQUFKOztBQUVBLFNBQU8sWUFBVztBQUFBO0FBQUE7O0FBQ2hCLFFBQU0sZUFBZSxTQUFmLFlBQWU7QUFBQSxhQUFNLEdBQUcsS0FBSCxDQUFTLEtBQVQsRUFBZSxVQUFmLENBQU47QUFBQSxLQUFyQjs7QUFFQSxpQkFBYSxPQUFiO0FBQ0EsY0FBVSxXQUFXLFlBQVgsRUFBeUIsSUFBekIsQ0FBVjtBQUNELEdBTEQ7QUFNRCxDQVREOztBQVdBLElBQU0sY0FBYyxTQUFkLFdBQWMsR0FBTTtBQUN6QixzQkFBUyxPQUFULENBQWlCO0FBQUEsV0FBUSxLQUFLLFNBQUwsQ0FBZSxHQUFmLENBQW1CLE9BQW5CLENBQVI7QUFBQSxHQUFqQjtBQUNBLGtCQUFLLFNBQUwsQ0FBZSxHQUFmLENBQW1CLE9BQW5CO0FBQ0EsQ0FIRDs7QUFLQSxJQUFNLGNBQWMsU0FBZCxXQUFjLEdBQU07QUFDekIsTUFBSSxNQUFNLFNBQVMsY0FBVCxDQUF3QixlQUF4QixDQUFWO0FBQ0EsTUFBSSxjQUFKLENBQW1CLEVBQUMsVUFBVSxRQUFYLEVBQXFCLE9BQU8sT0FBNUIsRUFBbkI7QUFDQSxDQUhEOztRQUtTLFEsR0FBQSxRO1FBQVUsVyxHQUFBLFc7UUFBYSxXLEdBQUEsVyIsImZpbGUiOiJidW5kbGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiLyogc21vb3Roc2Nyb2xsIHYwLjQuMCAtIDIwMTggLSBEdXN0YW4gS2FzdGVuLCBKZXJlbWlhcyBNZW5pY2hlbGxpIC0gTUlUIExpY2Vuc2UgKi9cbihmdW5jdGlvbiAoKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICAvLyBwb2x5ZmlsbFxuICBmdW5jdGlvbiBwb2x5ZmlsbCgpIHtcbiAgICAvLyBhbGlhc2VzXG4gICAgdmFyIHcgPSB3aW5kb3c7XG4gICAgdmFyIGQgPSBkb2N1bWVudDtcblxuICAgIC8vIHJldHVybiBpZiBzY3JvbGwgYmVoYXZpb3IgaXMgc3VwcG9ydGVkIGFuZCBwb2x5ZmlsbCBpcyBub3QgZm9yY2VkXG4gICAgaWYgKFxuICAgICAgJ3Njcm9sbEJlaGF2aW9yJyBpbiBkLmRvY3VtZW50RWxlbWVudC5zdHlsZSAmJlxuICAgICAgdy5fX2ZvcmNlU21vb3RoU2Nyb2xsUG9seWZpbGxfXyAhPT0gdHJ1ZVxuICAgICkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIGdsb2JhbHNcbiAgICB2YXIgRWxlbWVudCA9IHcuSFRNTEVsZW1lbnQgfHwgdy5FbGVtZW50O1xuICAgIHZhciBTQ1JPTExfVElNRSA9IDQ2ODtcblxuICAgIC8vIG9iamVjdCBnYXRoZXJpbmcgb3JpZ2luYWwgc2Nyb2xsIG1ldGhvZHNcbiAgICB2YXIgb3JpZ2luYWwgPSB7XG4gICAgICBzY3JvbGw6IHcuc2Nyb2xsIHx8IHcuc2Nyb2xsVG8sXG4gICAgICBzY3JvbGxCeTogdy5zY3JvbGxCeSxcbiAgICAgIGVsZW1lbnRTY3JvbGw6IEVsZW1lbnQucHJvdG90eXBlLnNjcm9sbCB8fCBzY3JvbGxFbGVtZW50LFxuICAgICAgc2Nyb2xsSW50b1ZpZXc6IEVsZW1lbnQucHJvdG90eXBlLnNjcm9sbEludG9WaWV3XG4gICAgfTtcblxuICAgIC8vIGRlZmluZSB0aW1pbmcgbWV0aG9kXG4gICAgdmFyIG5vdyA9XG4gICAgICB3LnBlcmZvcm1hbmNlICYmIHcucGVyZm9ybWFuY2Uubm93XG4gICAgICAgID8gdy5wZXJmb3JtYW5jZS5ub3cuYmluZCh3LnBlcmZvcm1hbmNlKVxuICAgICAgICA6IERhdGUubm93O1xuXG4gICAgLyoqXG4gICAgICogaW5kaWNhdGVzIGlmIGEgdGhlIGN1cnJlbnQgYnJvd3NlciBpcyBtYWRlIGJ5IE1pY3Jvc29mdFxuICAgICAqIEBtZXRob2QgaXNNaWNyb3NvZnRCcm93c2VyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHVzZXJBZ2VudFxuICAgICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGlzTWljcm9zb2Z0QnJvd3Nlcih1c2VyQWdlbnQpIHtcbiAgICAgIHZhciB1c2VyQWdlbnRQYXR0ZXJucyA9IFsnTVNJRSAnLCAnVHJpZGVudC8nLCAnRWRnZS8nXTtcblxuICAgICAgcmV0dXJuIG5ldyBSZWdFeHAodXNlckFnZW50UGF0dGVybnMuam9pbignfCcpKS50ZXN0KHVzZXJBZ2VudCk7XG4gICAgfVxuXG4gICAgLypcbiAgICAgKiBJRSBoYXMgcm91bmRpbmcgYnVnIHJvdW5kaW5nIGRvd24gY2xpZW50SGVpZ2h0IGFuZCBjbGllbnRXaWR0aCBhbmRcbiAgICAgKiByb3VuZGluZyB1cCBzY3JvbGxIZWlnaHQgYW5kIHNjcm9sbFdpZHRoIGNhdXNpbmcgZmFsc2UgcG9zaXRpdmVzXG4gICAgICogb24gaGFzU2Nyb2xsYWJsZVNwYWNlXG4gICAgICovXG4gICAgdmFyIFJPVU5ESU5HX1RPTEVSQU5DRSA9IGlzTWljcm9zb2Z0QnJvd3Nlcih3Lm5hdmlnYXRvci51c2VyQWdlbnQpID8gMSA6IDA7XG5cbiAgICAvKipcbiAgICAgKiBjaGFuZ2VzIHNjcm9sbCBwb3NpdGlvbiBpbnNpZGUgYW4gZWxlbWVudFxuICAgICAqIEBtZXRob2Qgc2Nyb2xsRWxlbWVudFxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSB4XG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHlcbiAgICAgKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHNjcm9sbEVsZW1lbnQoeCwgeSkge1xuICAgICAgdGhpcy5zY3JvbGxMZWZ0ID0geDtcbiAgICAgIHRoaXMuc2Nyb2xsVG9wID0geTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiByZXR1cm5zIHJlc3VsdCBvZiBhcHBseWluZyBlYXNlIG1hdGggZnVuY3Rpb24gdG8gYSBudW1iZXJcbiAgICAgKiBAbWV0aG9kIGVhc2VcbiAgICAgKiBAcGFyYW0ge051bWJlcn0ga1xuICAgICAqIEByZXR1cm5zIHtOdW1iZXJ9XG4gICAgICovXG4gICAgZnVuY3Rpb24gZWFzZShrKSB7XG4gICAgICByZXR1cm4gMC41ICogKDEgLSBNYXRoLmNvcyhNYXRoLlBJICogaykpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGluZGljYXRlcyBpZiBhIHNtb290aCBiZWhhdmlvciBzaG91bGQgYmUgYXBwbGllZFxuICAgICAqIEBtZXRob2Qgc2hvdWxkQmFpbE91dFxuICAgICAqIEBwYXJhbSB7TnVtYmVyfE9iamVjdH0gZmlyc3RBcmdcbiAgICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzaG91bGRCYWlsT3V0KGZpcnN0QXJnKSB7XG4gICAgICBpZiAoXG4gICAgICAgIGZpcnN0QXJnID09PSBudWxsIHx8XG4gICAgICAgIHR5cGVvZiBmaXJzdEFyZyAhPT0gJ29iamVjdCcgfHxcbiAgICAgICAgZmlyc3RBcmcuYmVoYXZpb3IgPT09IHVuZGVmaW5lZCB8fFxuICAgICAgICBmaXJzdEFyZy5iZWhhdmlvciA9PT0gJ2F1dG8nIHx8XG4gICAgICAgIGZpcnN0QXJnLmJlaGF2aW9yID09PSAnaW5zdGFudCdcbiAgICAgICkge1xuICAgICAgICAvLyBmaXJzdCBhcmd1bWVudCBpcyBub3QgYW4gb2JqZWN0L251bGxcbiAgICAgICAgLy8gb3IgYmVoYXZpb3IgaXMgYXV0bywgaW5zdGFudCBvciB1bmRlZmluZWRcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG5cbiAgICAgIGlmICh0eXBlb2YgZmlyc3RBcmcgPT09ICdvYmplY3QnICYmIGZpcnN0QXJnLmJlaGF2aW9yID09PSAnc21vb3RoJykge1xuICAgICAgICAvLyBmaXJzdCBhcmd1bWVudCBpcyBhbiBvYmplY3QgYW5kIGJlaGF2aW9yIGlzIHNtb290aFxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIC8vIHRocm93IGVycm9yIHdoZW4gYmVoYXZpb3IgaXMgbm90IHN1cHBvcnRlZFxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICAgJ2JlaGF2aW9yIG1lbWJlciBvZiBTY3JvbGxPcHRpb25zICcgK1xuICAgICAgICAgIGZpcnN0QXJnLmJlaGF2aW9yICtcbiAgICAgICAgICAnIGlzIG5vdCBhIHZhbGlkIHZhbHVlIGZvciBlbnVtZXJhdGlvbiBTY3JvbGxCZWhhdmlvci4nXG4gICAgICApO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGluZGljYXRlcyBpZiBhbiBlbGVtZW50IGhhcyBzY3JvbGxhYmxlIHNwYWNlIGluIHRoZSBwcm92aWRlZCBheGlzXG4gICAgICogQG1ldGhvZCBoYXNTY3JvbGxhYmxlU3BhY2VcbiAgICAgKiBAcGFyYW0ge05vZGV9IGVsXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGF4aXNcbiAgICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBoYXNTY3JvbGxhYmxlU3BhY2UoZWwsIGF4aXMpIHtcbiAgICAgIGlmIChheGlzID09PSAnWScpIHtcbiAgICAgICAgcmV0dXJuIGVsLmNsaWVudEhlaWdodCArIFJPVU5ESU5HX1RPTEVSQU5DRSA8IGVsLnNjcm9sbEhlaWdodDtcbiAgICAgIH1cblxuICAgICAgaWYgKGF4aXMgPT09ICdYJykge1xuICAgICAgICByZXR1cm4gZWwuY2xpZW50V2lkdGggKyBST1VORElOR19UT0xFUkFOQ0UgPCBlbC5zY3JvbGxXaWR0aDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBpbmRpY2F0ZXMgaWYgYW4gZWxlbWVudCBoYXMgYSBzY3JvbGxhYmxlIG92ZXJmbG93IHByb3BlcnR5IGluIHRoZSBheGlzXG4gICAgICogQG1ldGhvZCBjYW5PdmVyZmxvd1xuICAgICAqIEBwYXJhbSB7Tm9kZX0gZWxcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gYXhpc1xuICAgICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGNhbk92ZXJmbG93KGVsLCBheGlzKSB7XG4gICAgICB2YXIgb3ZlcmZsb3dWYWx1ZSA9IHcuZ2V0Q29tcHV0ZWRTdHlsZShlbCwgbnVsbClbJ292ZXJmbG93JyArIGF4aXNdO1xuXG4gICAgICByZXR1cm4gb3ZlcmZsb3dWYWx1ZSA9PT0gJ2F1dG8nIHx8IG92ZXJmbG93VmFsdWUgPT09ICdzY3JvbGwnO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGluZGljYXRlcyBpZiBhbiBlbGVtZW50IGNhbiBiZSBzY3JvbGxlZCBpbiBlaXRoZXIgYXhpc1xuICAgICAqIEBtZXRob2QgaXNTY3JvbGxhYmxlXG4gICAgICogQHBhcmFtIHtOb2RlfSBlbFxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBheGlzXG4gICAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAgICovXG4gICAgZnVuY3Rpb24gaXNTY3JvbGxhYmxlKGVsKSB7XG4gICAgICB2YXIgaXNTY3JvbGxhYmxlWSA9IGhhc1Njcm9sbGFibGVTcGFjZShlbCwgJ1knKSAmJiBjYW5PdmVyZmxvdyhlbCwgJ1knKTtcbiAgICAgIHZhciBpc1Njcm9sbGFibGVYID0gaGFzU2Nyb2xsYWJsZVNwYWNlKGVsLCAnWCcpICYmIGNhbk92ZXJmbG93KGVsLCAnWCcpO1xuXG4gICAgICByZXR1cm4gaXNTY3JvbGxhYmxlWSB8fCBpc1Njcm9sbGFibGVYO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGZpbmRzIHNjcm9sbGFibGUgcGFyZW50IG9mIGFuIGVsZW1lbnRcbiAgICAgKiBAbWV0aG9kIGZpbmRTY3JvbGxhYmxlUGFyZW50XG4gICAgICogQHBhcmFtIHtOb2RlfSBlbFxuICAgICAqIEByZXR1cm5zIHtOb2RlfSBlbFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGZpbmRTY3JvbGxhYmxlUGFyZW50KGVsKSB7XG4gICAgICB2YXIgaXNCb2R5O1xuXG4gICAgICBkbyB7XG4gICAgICAgIGVsID0gZWwucGFyZW50Tm9kZTtcblxuICAgICAgICBpc0JvZHkgPSBlbCA9PT0gZC5ib2R5O1xuICAgICAgfSB3aGlsZSAoaXNCb2R5ID09PSBmYWxzZSAmJiBpc1Njcm9sbGFibGUoZWwpID09PSBmYWxzZSk7XG5cbiAgICAgIGlzQm9keSA9IG51bGw7XG5cbiAgICAgIHJldHVybiBlbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBzZWxmIGludm9rZWQgZnVuY3Rpb24gdGhhdCwgZ2l2ZW4gYSBjb250ZXh0LCBzdGVwcyB0aHJvdWdoIHNjcm9sbGluZ1xuICAgICAqIEBtZXRob2Qgc3RlcFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBjb250ZXh0XG4gICAgICogQHJldHVybnMge3VuZGVmaW5lZH1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzdGVwKGNvbnRleHQpIHtcbiAgICAgIHZhciB0aW1lID0gbm93KCk7XG4gICAgICB2YXIgdmFsdWU7XG4gICAgICB2YXIgY3VycmVudFg7XG4gICAgICB2YXIgY3VycmVudFk7XG4gICAgICB2YXIgZWxhcHNlZCA9ICh0aW1lIC0gY29udGV4dC5zdGFydFRpbWUpIC8gU0NST0xMX1RJTUU7XG5cbiAgICAgIC8vIGF2b2lkIGVsYXBzZWQgdGltZXMgaGlnaGVyIHRoYW4gb25lXG4gICAgICBlbGFwc2VkID0gZWxhcHNlZCA+IDEgPyAxIDogZWxhcHNlZDtcblxuICAgICAgLy8gYXBwbHkgZWFzaW5nIHRvIGVsYXBzZWQgdGltZVxuICAgICAgdmFsdWUgPSBlYXNlKGVsYXBzZWQpO1xuXG4gICAgICBjdXJyZW50WCA9IGNvbnRleHQuc3RhcnRYICsgKGNvbnRleHQueCAtIGNvbnRleHQuc3RhcnRYKSAqIHZhbHVlO1xuICAgICAgY3VycmVudFkgPSBjb250ZXh0LnN0YXJ0WSArIChjb250ZXh0LnkgLSBjb250ZXh0LnN0YXJ0WSkgKiB2YWx1ZTtcblxuICAgICAgY29udGV4dC5tZXRob2QuY2FsbChjb250ZXh0LnNjcm9sbGFibGUsIGN1cnJlbnRYLCBjdXJyZW50WSk7XG5cbiAgICAgIC8vIHNjcm9sbCBtb3JlIGlmIHdlIGhhdmUgbm90IHJlYWNoZWQgb3VyIGRlc3RpbmF0aW9uXG4gICAgICBpZiAoY3VycmVudFggIT09IGNvbnRleHQueCB8fCBjdXJyZW50WSAhPT0gY29udGV4dC55KSB7XG4gICAgICAgIHcucmVxdWVzdEFuaW1hdGlvbkZyYW1lKHN0ZXAuYmluZCh3LCBjb250ZXh0KSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogc2Nyb2xscyB3aW5kb3cgb3IgZWxlbWVudCB3aXRoIGEgc21vb3RoIGJlaGF2aW9yXG4gICAgICogQG1ldGhvZCBzbW9vdGhTY3JvbGxcbiAgICAgKiBAcGFyYW0ge09iamVjdHxOb2RlfSBlbFxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSB4XG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHlcbiAgICAgKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHNtb290aFNjcm9sbChlbCwgeCwgeSkge1xuICAgICAgdmFyIHNjcm9sbGFibGU7XG4gICAgICB2YXIgc3RhcnRYO1xuICAgICAgdmFyIHN0YXJ0WTtcbiAgICAgIHZhciBtZXRob2Q7XG4gICAgICB2YXIgc3RhcnRUaW1lID0gbm93KCk7XG5cbiAgICAgIC8vIGRlZmluZSBzY3JvbGwgY29udGV4dFxuICAgICAgaWYgKGVsID09PSBkLmJvZHkpIHtcbiAgICAgICAgc2Nyb2xsYWJsZSA9IHc7XG4gICAgICAgIHN0YXJ0WCA9IHcuc2Nyb2xsWCB8fCB3LnBhZ2VYT2Zmc2V0O1xuICAgICAgICBzdGFydFkgPSB3LnNjcm9sbFkgfHwgdy5wYWdlWU9mZnNldDtcbiAgICAgICAgbWV0aG9kID0gb3JpZ2luYWwuc2Nyb2xsO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2Nyb2xsYWJsZSA9IGVsO1xuICAgICAgICBzdGFydFggPSBlbC5zY3JvbGxMZWZ0O1xuICAgICAgICBzdGFydFkgPSBlbC5zY3JvbGxUb3A7XG4gICAgICAgIG1ldGhvZCA9IHNjcm9sbEVsZW1lbnQ7XG4gICAgICB9XG5cbiAgICAgIC8vIHNjcm9sbCBsb29waW5nIG92ZXIgYSBmcmFtZVxuICAgICAgc3RlcCh7XG4gICAgICAgIHNjcm9sbGFibGU6IHNjcm9sbGFibGUsXG4gICAgICAgIG1ldGhvZDogbWV0aG9kLFxuICAgICAgICBzdGFydFRpbWU6IHN0YXJ0VGltZSxcbiAgICAgICAgc3RhcnRYOiBzdGFydFgsXG4gICAgICAgIHN0YXJ0WTogc3RhcnRZLFxuICAgICAgICB4OiB4LFxuICAgICAgICB5OiB5XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBPUklHSU5BTCBNRVRIT0RTIE9WRVJSSURFU1xuICAgIC8vIHcuc2Nyb2xsIGFuZCB3LnNjcm9sbFRvXG4gICAgdy5zY3JvbGwgPSB3LnNjcm9sbFRvID0gZnVuY3Rpb24oKSB7XG4gICAgICAvLyBhdm9pZCBhY3Rpb24gd2hlbiBubyBhcmd1bWVudHMgYXJlIHBhc3NlZFxuICAgICAgaWYgKGFyZ3VtZW50c1swXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gYXZvaWQgc21vb3RoIGJlaGF2aW9yIGlmIG5vdCByZXF1aXJlZFxuICAgICAgaWYgKHNob3VsZEJhaWxPdXQoYXJndW1lbnRzWzBdKSA9PT0gdHJ1ZSkge1xuICAgICAgICBvcmlnaW5hbC5zY3JvbGwuY2FsbChcbiAgICAgICAgICB3LFxuICAgICAgICAgIGFyZ3VtZW50c1swXS5sZWZ0ICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8gYXJndW1lbnRzWzBdLmxlZnRcbiAgICAgICAgICAgIDogdHlwZW9mIGFyZ3VtZW50c1swXSAhPT0gJ29iamVjdCdcbiAgICAgICAgICAgICAgPyBhcmd1bWVudHNbMF1cbiAgICAgICAgICAgICAgOiB3LnNjcm9sbFggfHwgdy5wYWdlWE9mZnNldCxcbiAgICAgICAgICAvLyB1c2UgdG9wIHByb3AsIHNlY29uZCBhcmd1bWVudCBpZiBwcmVzZW50IG9yIGZhbGxiYWNrIHRvIHNjcm9sbFlcbiAgICAgICAgICBhcmd1bWVudHNbMF0udG9wICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8gYXJndW1lbnRzWzBdLnRvcFxuICAgICAgICAgICAgOiBhcmd1bWVudHNbMV0gIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgICA/IGFyZ3VtZW50c1sxXVxuICAgICAgICAgICAgICA6IHcuc2Nyb2xsWSB8fCB3LnBhZ2VZT2Zmc2V0XG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBMRVQgVEhFIFNNT09USE5FU1MgQkVHSU4hXG4gICAgICBzbW9vdGhTY3JvbGwuY2FsbChcbiAgICAgICAgdyxcbiAgICAgICAgZC5ib2R5LFxuICAgICAgICBhcmd1bWVudHNbMF0ubGVmdCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgPyB+fmFyZ3VtZW50c1swXS5sZWZ0XG4gICAgICAgICAgOiB3LnNjcm9sbFggfHwgdy5wYWdlWE9mZnNldCxcbiAgICAgICAgYXJndW1lbnRzWzBdLnRvcCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgPyB+fmFyZ3VtZW50c1swXS50b3BcbiAgICAgICAgICA6IHcuc2Nyb2xsWSB8fCB3LnBhZ2VZT2Zmc2V0XG4gICAgICApO1xuICAgIH07XG5cbiAgICAvLyB3LnNjcm9sbEJ5XG4gICAgdy5zY3JvbGxCeSA9IGZ1bmN0aW9uKCkge1xuICAgICAgLy8gYXZvaWQgYWN0aW9uIHdoZW4gbm8gYXJndW1lbnRzIGFyZSBwYXNzZWRcbiAgICAgIGlmIChhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIGF2b2lkIHNtb290aCBiZWhhdmlvciBpZiBub3QgcmVxdWlyZWRcbiAgICAgIGlmIChzaG91bGRCYWlsT3V0KGFyZ3VtZW50c1swXSkpIHtcbiAgICAgICAgb3JpZ2luYWwuc2Nyb2xsQnkuY2FsbChcbiAgICAgICAgICB3LFxuICAgICAgICAgIGFyZ3VtZW50c1swXS5sZWZ0ICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8gYXJndW1lbnRzWzBdLmxlZnRcbiAgICAgICAgICAgIDogdHlwZW9mIGFyZ3VtZW50c1swXSAhPT0gJ29iamVjdCcgPyBhcmd1bWVudHNbMF0gOiAwLFxuICAgICAgICAgIGFyZ3VtZW50c1swXS50b3AgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyBhcmd1bWVudHNbMF0udG9wXG4gICAgICAgICAgICA6IGFyZ3VtZW50c1sxXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzFdIDogMFxuICAgICAgICApO1xuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gTEVUIFRIRSBTTU9PVEhORVNTIEJFR0lOIVxuICAgICAgc21vb3RoU2Nyb2xsLmNhbGwoXG4gICAgICAgIHcsXG4gICAgICAgIGQuYm9keSxcbiAgICAgICAgfn5hcmd1bWVudHNbMF0ubGVmdCArICh3LnNjcm9sbFggfHwgdy5wYWdlWE9mZnNldCksXG4gICAgICAgIH5+YXJndW1lbnRzWzBdLnRvcCArICh3LnNjcm9sbFkgfHwgdy5wYWdlWU9mZnNldClcbiAgICAgICk7XG4gICAgfTtcblxuICAgIC8vIEVsZW1lbnQucHJvdG90eXBlLnNjcm9sbCBhbmQgRWxlbWVudC5wcm90b3R5cGUuc2Nyb2xsVG9cbiAgICBFbGVtZW50LnByb3RvdHlwZS5zY3JvbGwgPSBFbGVtZW50LnByb3RvdHlwZS5zY3JvbGxUbyA9IGZ1bmN0aW9uKCkge1xuICAgICAgLy8gYXZvaWQgYWN0aW9uIHdoZW4gbm8gYXJndW1lbnRzIGFyZSBwYXNzZWRcbiAgICAgIGlmIChhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIGF2b2lkIHNtb290aCBiZWhhdmlvciBpZiBub3QgcmVxdWlyZWRcbiAgICAgIGlmIChzaG91bGRCYWlsT3V0KGFyZ3VtZW50c1swXSkgPT09IHRydWUpIHtcbiAgICAgICAgLy8gaWYgb25lIG51bWJlciBpcyBwYXNzZWQsIHRocm93IGVycm9yIHRvIG1hdGNoIEZpcmVmb3ggaW1wbGVtZW50YXRpb25cbiAgICAgICAgaWYgKHR5cGVvZiBhcmd1bWVudHNbMF0gPT09ICdudW1iZXInICYmIGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFN5bnRheEVycm9yKCdWYWx1ZSBjb3VsZCBub3QgYmUgY29udmVydGVkJyk7XG4gICAgICAgIH1cblxuICAgICAgICBvcmlnaW5hbC5lbGVtZW50U2Nyb2xsLmNhbGwoXG4gICAgICAgICAgdGhpcyxcbiAgICAgICAgICAvLyB1c2UgbGVmdCBwcm9wLCBmaXJzdCBudW1iZXIgYXJndW1lbnQgb3IgZmFsbGJhY2sgdG8gc2Nyb2xsTGVmdFxuICAgICAgICAgIGFyZ3VtZW50c1swXS5sZWZ0ICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8gfn5hcmd1bWVudHNbMF0ubGVmdFxuICAgICAgICAgICAgOiB0eXBlb2YgYXJndW1lbnRzWzBdICE9PSAnb2JqZWN0JyA/IH5+YXJndW1lbnRzWzBdIDogdGhpcy5zY3JvbGxMZWZ0LFxuICAgICAgICAgIC8vIHVzZSB0b3AgcHJvcCwgc2Vjb25kIGFyZ3VtZW50IG9yIGZhbGxiYWNrIHRvIHNjcm9sbFRvcFxuICAgICAgICAgIGFyZ3VtZW50c1swXS50b3AgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyB+fmFyZ3VtZW50c1swXS50b3BcbiAgICAgICAgICAgIDogYXJndW1lbnRzWzFdICE9PSB1bmRlZmluZWQgPyB+fmFyZ3VtZW50c1sxXSA6IHRoaXMuc2Nyb2xsVG9wXG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB2YXIgbGVmdCA9IGFyZ3VtZW50c1swXS5sZWZ0O1xuICAgICAgdmFyIHRvcCA9IGFyZ3VtZW50c1swXS50b3A7XG5cbiAgICAgIC8vIExFVCBUSEUgU01PT1RITkVTUyBCRUdJTiFcbiAgICAgIHNtb290aFNjcm9sbC5jYWxsKFxuICAgICAgICB0aGlzLFxuICAgICAgICB0aGlzLFxuICAgICAgICB0eXBlb2YgbGVmdCA9PT0gJ3VuZGVmaW5lZCcgPyB0aGlzLnNjcm9sbExlZnQgOiB+fmxlZnQsXG4gICAgICAgIHR5cGVvZiB0b3AgPT09ICd1bmRlZmluZWQnID8gdGhpcy5zY3JvbGxUb3AgOiB+fnRvcFxuICAgICAgKTtcbiAgICB9O1xuXG4gICAgLy8gRWxlbWVudC5wcm90b3R5cGUuc2Nyb2xsQnlcbiAgICBFbGVtZW50LnByb3RvdHlwZS5zY3JvbGxCeSA9IGZ1bmN0aW9uKCkge1xuICAgICAgLy8gYXZvaWQgYWN0aW9uIHdoZW4gbm8gYXJndW1lbnRzIGFyZSBwYXNzZWRcbiAgICAgIGlmIChhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIGF2b2lkIHNtb290aCBiZWhhdmlvciBpZiBub3QgcmVxdWlyZWRcbiAgICAgIGlmIChzaG91bGRCYWlsT3V0KGFyZ3VtZW50c1swXSkgPT09IHRydWUpIHtcbiAgICAgICAgb3JpZ2luYWwuZWxlbWVudFNjcm9sbC5jYWxsKFxuICAgICAgICAgIHRoaXMsXG4gICAgICAgICAgYXJndW1lbnRzWzBdLmxlZnQgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyB+fmFyZ3VtZW50c1swXS5sZWZ0ICsgdGhpcy5zY3JvbGxMZWZ0XG4gICAgICAgICAgICA6IH5+YXJndW1lbnRzWzBdICsgdGhpcy5zY3JvbGxMZWZ0LFxuICAgICAgICAgIGFyZ3VtZW50c1swXS50b3AgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyB+fmFyZ3VtZW50c1swXS50b3AgKyB0aGlzLnNjcm9sbFRvcFxuICAgICAgICAgICAgOiB+fmFyZ3VtZW50c1sxXSArIHRoaXMuc2Nyb2xsVG9wXG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB0aGlzLnNjcm9sbCh7XG4gICAgICAgIGxlZnQ6IH5+YXJndW1lbnRzWzBdLmxlZnQgKyB0aGlzLnNjcm9sbExlZnQsXG4gICAgICAgIHRvcDogfn5hcmd1bWVudHNbMF0udG9wICsgdGhpcy5zY3JvbGxUb3AsXG4gICAgICAgIGJlaGF2aW9yOiBhcmd1bWVudHNbMF0uYmVoYXZpb3JcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICAvLyBFbGVtZW50LnByb3RvdHlwZS5zY3JvbGxJbnRvVmlld1xuICAgIEVsZW1lbnQucHJvdG90eXBlLnNjcm9sbEludG9WaWV3ID0gZnVuY3Rpb24oKSB7XG4gICAgICAvLyBhdm9pZCBzbW9vdGggYmVoYXZpb3IgaWYgbm90IHJlcXVpcmVkXG4gICAgICBpZiAoc2hvdWxkQmFpbE91dChhcmd1bWVudHNbMF0pID09PSB0cnVlKSB7XG4gICAgICAgIG9yaWdpbmFsLnNjcm9sbEludG9WaWV3LmNhbGwoXG4gICAgICAgICAgdGhpcyxcbiAgICAgICAgICBhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCA/IHRydWUgOiBhcmd1bWVudHNbMF1cbiAgICAgICAgKTtcblxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIExFVCBUSEUgU01PT1RITkVTUyBCRUdJTiFcbiAgICAgIHZhciBzY3JvbGxhYmxlUGFyZW50ID0gZmluZFNjcm9sbGFibGVQYXJlbnQodGhpcyk7XG4gICAgICB2YXIgcGFyZW50UmVjdHMgPSBzY3JvbGxhYmxlUGFyZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgdmFyIGNsaWVudFJlY3RzID0gdGhpcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcblxuICAgICAgaWYgKHNjcm9sbGFibGVQYXJlbnQgIT09IGQuYm9keSkge1xuICAgICAgICAvLyByZXZlYWwgZWxlbWVudCBpbnNpZGUgcGFyZW50XG4gICAgICAgIHNtb290aFNjcm9sbC5jYWxsKFxuICAgICAgICAgIHRoaXMsXG4gICAgICAgICAgc2Nyb2xsYWJsZVBhcmVudCxcbiAgICAgICAgICBzY3JvbGxhYmxlUGFyZW50LnNjcm9sbExlZnQgKyBjbGllbnRSZWN0cy5sZWZ0IC0gcGFyZW50UmVjdHMubGVmdCxcbiAgICAgICAgICBzY3JvbGxhYmxlUGFyZW50LnNjcm9sbFRvcCArIGNsaWVudFJlY3RzLnRvcCAtIHBhcmVudFJlY3RzLnRvcFxuICAgICAgICApO1xuXG4gICAgICAgIC8vIHJldmVhbCBwYXJlbnQgaW4gdmlld3BvcnQgdW5sZXNzIGlzIGZpeGVkXG4gICAgICAgIGlmICh3LmdldENvbXB1dGVkU3R5bGUoc2Nyb2xsYWJsZVBhcmVudCkucG9zaXRpb24gIT09ICdmaXhlZCcpIHtcbiAgICAgICAgICB3LnNjcm9sbEJ5KHtcbiAgICAgICAgICAgIGxlZnQ6IHBhcmVudFJlY3RzLmxlZnQsXG4gICAgICAgICAgICB0b3A6IHBhcmVudFJlY3RzLnRvcCxcbiAgICAgICAgICAgIGJlaGF2aW9yOiAnc21vb3RoJ1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyByZXZlYWwgZWxlbWVudCBpbiB2aWV3cG9ydFxuICAgICAgICB3LnNjcm9sbEJ5KHtcbiAgICAgICAgICBsZWZ0OiBjbGllbnRSZWN0cy5sZWZ0LFxuICAgICAgICAgIHRvcDogY2xpZW50UmVjdHMudG9wLFxuICAgICAgICAgIGJlaGF2aW9yOiAnc21vb3RoJ1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgaWYgKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykge1xuICAgIC8vIGNvbW1vbmpzXG4gICAgbW9kdWxlLmV4cG9ydHMgPSB7IHBvbHlmaWxsOiBwb2x5ZmlsbCB9O1xuICB9IGVsc2Uge1xuICAgIC8vIGdsb2JhbFxuICAgIHBvbHlmaWxsKCk7XG4gIH1cblxufSgpKTtcbiIsImNvbnN0IERCID0gJ2h0dHBzOi8vbmV4dXMtY2F0YWxvZy5maXJlYmFzZWlvLmNvbS9wb3N0cy5qc29uP2F1dGg9N2c3cHlLS3lrTjNONWV3ckltaE9hUzZ2d3JGc2M1Zktrcms4ZWp6Zic7XG5cbmNvbnN0ICRsb2FkaW5nID0gQXJyYXkuZnJvbShkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcubG9hZGluZycpKTtcbmNvbnN0ICRuYXYgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnanMtbmF2Jyk7XG5jb25zdCAkcGFyYWxsYXggPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcucGFyYWxsYXgnKTtcbmNvbnN0ICRjb250ZW50ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmNvbnRlbnQnKTtcbmNvbnN0ICR0aXRsZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdqcy10aXRsZScpO1xuY29uc3QgJHVwQXJyb3cgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnanMtYXJyb3cnKTtcbmNvbnN0ICRtb2RhbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5tb2RhbCcpO1xuY29uc3QgJGxpZ2h0Ym94ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmxpZ2h0Ym94Jyk7XG5jb25zdCAkdmlldyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5saWdodGJveC12aWV3Jyk7XG5cbmV4cG9ydCB7IFxuXHREQixcblx0JGxvYWRpbmcsIFxuXHQkbmF2LCBcblx0JHBhcmFsbGF4LFxuXHQkY29udGVudCxcblx0JHRpdGxlLFxuXHQkdXBBcnJvdyxcblx0JG1vZGFsLFxuXHQkbGlnaHRib3gsXG5cdCR2aWV3IFxufTsiLCJpbXBvcnQgc21vb3Roc2Nyb2xsIGZyb20gJ3Ntb290aHNjcm9sbC1wb2x5ZmlsbCc7XG5cbmltcG9ydCB7IGFydGljbGVUZW1wbGF0ZSwgcmVuZGVyTmF2TGcgfSBmcm9tICcuL3RlbXBsYXRlcyc7XG5pbXBvcnQgeyBkZWJvdW5jZSwgaGlkZUxvYWRpbmcsIHNjcm9sbFRvVG9wIH0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgeyBEQiB9IGZyb20gJy4vY29uc3RhbnRzJztcbmltcG9ydCB7IGF0dGFjaE1vZGFsTGlzdGVuZXJzLCBhdHRhY2hVcEFycm93TGlzdGVuZXJzLCBhdHRhY2hJbWFnZUxpc3RlbmVycywgbWFrZUFscGhhYmV0LCBtYWtlU2xpZGVyIH0gZnJvbSAnLi9tb2R1bGVzJztcblxubGV0IHNvcnRLZXkgPSAwOyAvLyAwID0gYXJ0aXN0LCAxID0gdGl0bGVcbmxldCBlbnRyaWVzID0geyBieUF1dGhvcjogW10sIGJ5VGl0bGU6IFtdIH07XG5cbmNvbnN0IGFkZFNvcnRCdXR0b25MaXN0ZW5lcnMgPSAoKSA9PiB7XG5cdGxldCAkYnlBcnRpc3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnanMtYnktYXJ0aXN0Jyk7XG5cdGxldCAkYnlUaXRsZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdqcy1ieS10aXRsZScpO1xuXHQkYnlBcnRpc3QuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0aWYgKHNvcnRLZXkpIHtcblx0XHRcdHNjcm9sbFRvVG9wKCk7XG5cdFx0XHRzb3J0S2V5ID0gMDtcblx0XHRcdCRieUFydGlzdC5jbGFzc0xpc3QuYWRkKCdhY3RpdmUnKTtcblx0XHRcdCRieVRpdGxlLmNsYXNzTGlzdC5yZW1vdmUoJ2FjdGl2ZScpO1xuXG5cdFx0XHRyZW5kZXJFbnRyaWVzKCk7XG5cdFx0fVxuXHR9KTtcblxuXHQkYnlUaXRsZS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHRpZiAoIXNvcnRLZXkpIHtcblx0XHRcdHNjcm9sbFRvVG9wKCk7XG5cdFx0XHRzb3J0S2V5ID0gMTtcblx0XHRcdCRieVRpdGxlLmNsYXNzTGlzdC5hZGQoJ2FjdGl2ZScpO1xuXHRcdFx0JGJ5QXJ0aXN0LmNsYXNzTGlzdC5yZW1vdmUoJ2FjdGl2ZScpO1xuXG5cdFx0XHRyZW5kZXJFbnRyaWVzKCk7XG5cdFx0fVxuXHR9KTtcbn07XG5cbmNvbnN0IHJlbmRlckVudHJpZXMgPSAoKSA9PiB7XG5cdGNvbnN0ICRhcnRpY2xlTGlzdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdqcy1saXN0Jyk7XG5cdGNvbnN0IGVudHJpZXNMaXN0ID0gc29ydEtleSA/IGVudHJpZXMuYnlUaXRsZSA6IGVudHJpZXMuYnlBdXRob3I7XG5cblx0JGFydGljbGVMaXN0LmlubmVySFRNTCA9ICcnO1xuXG5cdGVudHJpZXNMaXN0LmZvckVhY2goKGVudHJ5LCBpKSA9PiB7XG5cdFx0JGFydGljbGVMaXN0Lmluc2VydEFkamFjZW50SFRNTCgnYmVmb3JlZW5kJywgYXJ0aWNsZVRlbXBsYXRlKGVudHJ5LCBpKSk7XG5cdFx0bWFrZVNsaWRlcihkb2N1bWVudC5nZXRFbGVtZW50QnlJZChgc2xpZGVyLSR7aX1gKSk7XG5cdH0pO1xuXG5cdGF0dGFjaEltYWdlTGlzdGVuZXJzKCk7XG5cdG1ha2VBbHBoYWJldChzb3J0S2V5KTtcbn07XG5cbmNvbnN0IHNldERhdGFBbmRTb3J0QnlUaXRsZSA9IChkYXRhKSA9PiB7XG5cdGVudHJpZXMuYnlBdXRob3IgPSBkYXRhO1xuXHRlbnRyaWVzLmJ5VGl0bGUgPSBkYXRhLnNsaWNlKCk7IC8vIGNvcGllcyBkYXRhIGZvciBieVRpdGxlIHNvcnRcblxuXHRlbnRyaWVzLmJ5VGl0bGUuc29ydCgoYSwgYikgPT4ge1xuXHRcdGxldCBhVGl0bGUgPSBhLnRpdGxlWzBdLnRvVXBwZXJDYXNlKCk7XG5cdFx0bGV0IGJUaXRsZSA9IGIudGl0bGVbMF0udG9VcHBlckNhc2UoKTtcblx0XHRpZiAoYVRpdGxlID4gYlRpdGxlKSByZXR1cm4gMTtcblx0XHRlbHNlIGlmIChhVGl0bGUgPCBiVGl0bGUpIHJldHVybiAtMTtcblx0XHRlbHNlIHJldHVybiAwO1xuXHR9KTtcbn07XG5cbmNvbnN0IGZldGNoRGF0YSA9ICgpID0+IHtcblx0ZmV0Y2goREIpLnRoZW4ocmVzID0+IHJlcy5qc29uKCkpXG5cdC50aGVuKGRhdGEgPT4ge1xuXHRcdHNldERhdGFBbmRTb3J0QnlUaXRsZShkYXRhKTtcblx0XHRyZW5kZXJFbnRyaWVzKCk7XG5cdFx0aGlkZUxvYWRpbmcoKTtcblx0fSlcblx0LmNhdGNoKGVyciA9PiBjb25zb2xlLndhcm4oZXJyKSk7XG59O1xuXG5jb25zdCBpbml0ID0gKCkgPT4ge1xuXHRzbW9vdGhzY3JvbGwucG9seWZpbGwoKTtcblx0ZmV0Y2hEYXRhKCk7XG5cdHJlbmRlck5hdkxnKCk7XG5cdGFkZFNvcnRCdXR0b25MaXN0ZW5lcnMoKTtcblx0YXR0YWNoVXBBcnJvd0xpc3RlbmVycygpO1xuXHRhdHRhY2hNb2RhbExpc3RlbmVycygpO1xufVxuXG5pbml0KCk7XG4iLCJpbXBvcnQgeyAkdmlldywgJGxpZ2h0Ym94IH0gZnJvbSAnLi4vY29uc3RhbnRzJztcblxubGV0IGxpZ2h0Ym94ID0gZmFsc2U7XG5cbmNvbnN0IGF0dGFjaEltYWdlTGlzdGVuZXJzID0gKCkgPT4ge1xuXHRjb25zdCAkaW1hZ2VzID0gQXJyYXkuZnJvbShkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuYXJ0aWNsZS1pbWcnKSk7XG5cblx0JGltYWdlcy5mb3JFYWNoKGltZyA9PiB7XG5cdFx0aW1nLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGV2dCkgPT4ge1xuXHRcdFx0aWYgKCFsaWdodGJveCkge1xuXHRcdFx0XHRsZXQgc3JjID0gaW1nLnNyYztcblx0XHRcdFx0XG5cdFx0XHRcdCRsaWdodGJveC5jbGFzc0xpc3QuYWRkKCdzaG93LWltZycpO1xuXHRcdFx0XHQkdmlldy5zZXRBdHRyaWJ1dGUoJ3N0eWxlJywgYGJhY2tncm91bmQtaW1hZ2U6IHVybCgke3NyY30pYCk7XG5cdFx0XHRcdGxpZ2h0Ym94ID0gdHJ1ZTtcblx0XHRcdH1cblx0XHR9KTtcblx0fSk7XG5cblx0JHZpZXcuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0aWYgKGxpZ2h0Ym94KSB7XG5cdFx0XHQkbGlnaHRib3guY2xhc3NMaXN0LnJlbW92ZSgnc2hvdy1pbWcnKTtcblx0XHRcdGxpZ2h0Ym94ID0gZmFsc2U7XG5cdFx0fVxuXHR9KTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGF0dGFjaEltYWdlTGlzdGVuZXJzOyIsImltcG9ydCB7ICRtb2RhbCB9IGZyb20gJy4uL2NvbnN0YW50cyc7XG5cbmxldCBtb2RhbCA9IGZhbHNlO1xuY29uc3QgYXR0YWNoTW9kYWxMaXN0ZW5lcnMgPSAoKSA9PiB7XG5cdGNvbnN0ICRmaW5kID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2pzLWZpbmQnKTtcblx0XG5cdCRmaW5kLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuXHRcdCRtb2RhbC5jbGFzc0xpc3QuYWRkKCdzaG93Jyk7XG5cdFx0bW9kYWwgPSB0cnVlO1xuXHR9KTtcblxuXHQkbW9kYWwuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0JG1vZGFsLmNsYXNzTGlzdC5yZW1vdmUoJ3Nob3cnKTtcblx0XHRtb2RhbCA9IGZhbHNlO1xuXHR9KTtcblxuXHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsICgpID0+IHtcblx0XHRpZiAobW9kYWwpIHtcblx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge1xuXHRcdFx0XHQkbW9kYWwuY2xhc3NMaXN0LnJlbW92ZSgnc2hvdycpO1xuXHRcdFx0XHRtb2RhbCA9IGZhbHNlO1xuXHRcdFx0fSwgNjAwKTtcblx0XHR9O1xuXHR9KTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGF0dGFjaE1vZGFsTGlzdGVuZXJzOyIsImltcG9ydCB7ICR0aXRsZSwgJHBhcmFsbGF4LCAkdXBBcnJvdyB9IGZyb20gJy4uL2NvbnN0YW50cyc7XG5pbXBvcnQgeyBzY3JvbGxUb1RvcCB9IGZyb20gJy4uL3V0aWxzJztcblxubGV0IHByZXY7XG5sZXQgY3VycmVudCA9IDA7XG5sZXQgaXNTaG93aW5nID0gZmFsc2U7XG5cbmNvbnN0IGF0dGFjaFVwQXJyb3dMaXN0ZW5lcnMgPSAoKSA9PiB7XG5cdCRwYXJhbGxheC5hZGRFdmVudExpc3RlbmVyKCdzY3JvbGwnLCAoKSA9PiB7XG5cdFx0bGV0IHkgPSAkdGl0bGUuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkueTtcblxuXHRcdGlmIChjdXJyZW50ICE9PSB5KSB7XG5cdFx0XHRwcmV2ID0gY3VycmVudDtcblx0XHRcdGN1cnJlbnQgPSB5O1xuXHRcdH07XG5cblx0XHRpZiAoeSA8PSAtNTAgJiYgIWlzU2hvd2luZykge1xuXHRcdFx0JHVwQXJyb3cuY2xhc3NMaXN0LmFkZCgnc2hvdycpO1xuXHRcdFx0aXNTaG93aW5nID0gdHJ1ZTtcblx0XHR9IGVsc2UgaWYgKHkgPiAtNTAgJiYgaXNTaG93aW5nKSB7XG5cdFx0XHQkdXBBcnJvdy5jbGFzc0xpc3QucmVtb3ZlKCdzaG93Jyk7XG5cdFx0XHRpc1Nob3dpbmcgPSBmYWxzZTtcblx0XHR9XG5cdH0pO1xuXG5cdCR1cEFycm93LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4gc2Nyb2xsVG9Ub3AoKSk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCBhdHRhY2hVcEFycm93TGlzdGVuZXJzOyIsImltcG9ydCBhdHRhY2hNb2RhbExpc3RlbmVycyBmcm9tICcuL2F0dGFjaE1vZGFsTGlzdGVuZXJzJztcbmltcG9ydCBhdHRhY2hVcEFycm93TGlzdGVuZXJzIGZyb20gJy4vYXR0YWNoVXBBcnJvd0xpc3RlbmVycyc7XG5pbXBvcnQgYXR0YWNoSW1hZ2VMaXN0ZW5lcnMgZnJvbSAnLi9hdHRhY2hJbWFnZUxpc3RlbmVycyc7XG5pbXBvcnQgbWFrZUFscGhhYmV0IGZyb20gJy4vbWFrZUFscGhhYmV0JztcbmltcG9ydCBtYWtlU2xpZGVyIGZyb20gJy4vbWFrZVNsaWRlcic7XG5cbmV4cG9ydCB7IFxuXHRhdHRhY2hNb2RhbExpc3RlbmVycywgXG5cdGF0dGFjaFVwQXJyb3dMaXN0ZW5lcnMsXG5cdGF0dGFjaEltYWdlTGlzdGVuZXJzLFxuXHRtYWtlQWxwaGFiZXQsIFxuXHRtYWtlU2xpZGVyIFxufTsiLCJjb25zdCBhbHBoYWJldCA9IFsnYScsICdiJywgJ2MnLCAnZCcsICdlJywgJ2YnLCAnZycsICdoJywgJ2knLCAnaicsICdrJywgJ2wnLCAnbScsICduJywgJ28nLCAncCcsICdyJywgJ3MnLCAndCcsICd1JywgJ3YnLCAndycsICd5JywgJ3onXTtcblxuY29uc3QgbWFrZUFscGhhYmV0ID0gKHNvcnRLZXkpID0+IHtcblx0Y29uc3QgZmluZEZpcnN0RW50cnkgPSAoY2hhcikgPT4ge1xuXHRcdGNvbnN0IHNlbGVjdG9yID0gc29ydEtleSA/ICcuanMtZW50cnktdGl0bGUnIDogJy5qcy1lbnRyeS1hcnRpc3QnO1xuXHRcdGNvbnN0IHByZXZTZWxlY3RvciA9ICFzb3J0S2V5ID8gJy5qcy1lbnRyeS10aXRsZScgOiAnLmpzLWVudHJ5LWFydGlzdCc7XG5cblx0XHRjb25zdCAkZW50cmllcyA9IEFycmF5LmZyb20oZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChzZWxlY3RvcikpO1xuXHRcdGNvbnN0ICRwcmV2RW50cmllcyA9IEFycmF5LmZyb20oZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChwcmV2U2VsZWN0b3IpKTtcblxuXHRcdCRwcmV2RW50cmllcy5mb3JFYWNoKGVudHJ5ID0+IGVudHJ5LnJlbW92ZUF0dHJpYnV0ZSgnbmFtZScpKTtcblxuXHRcdHJldHVybiAkZW50cmllcy5maW5kKGVudHJ5ID0+IHtcblx0XHRcdGxldCBub2RlID0gZW50cnkubmV4dEVsZW1lbnRTaWJsaW5nO1xuXHRcdFx0cmV0dXJuIG5vZGUuaW5uZXJIVE1MWzBdID09PSBjaGFyIHx8IG5vZGUuaW5uZXJIVE1MWzBdID09PSBjaGFyLnRvVXBwZXJDYXNlKCk7XG5cdFx0fSk7XG5cdH07XG5cblx0Y29uc3QgYXR0YWNoQW5jaG9yTGlzdGVuZXIgPSAoJGFuY2hvciwgbGV0dGVyKSA9PiB7XG5cdFx0JGFuY2hvci5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHRcdGNvbnN0IGxldHRlck5vZGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChsZXR0ZXIpO1xuXHRcdFx0bGV0IHRhcmdldDtcblxuXHRcdFx0aWYgKCFzb3J0S2V5KSB7XG5cdFx0XHRcdHRhcmdldCA9IGxldHRlciA9PT0gJ2EnID8gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2FuY2hvci10YXJnZXQnKSA6IGxldHRlck5vZGUucGFyZW50RWxlbWVudC5wYXJlbnRFbGVtZW50LnBhcmVudEVsZW1lbnQucGFyZW50RWxlbWVudC5wcmV2aW91c0VsZW1lbnRTaWJsaW5nLnF1ZXJ5U2VsZWN0b3IoJy5qcy1hcnRpY2xlLWFuY2hvci10YXJnZXQnKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRhcmdldCA9IGxldHRlciA9PT0gJ2EnID8gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2FuY2hvci10YXJnZXQnKSA6IGxldHRlck5vZGUucGFyZW50RWxlbWVudC5wYXJlbnRFbGVtZW50LnBhcmVudEVsZW1lbnQucHJldmlvdXNFbGVtZW50U2libGluZy5xdWVyeVNlbGVjdG9yKCcuanMtYXJ0aWNsZS1hbmNob3ItdGFyZ2V0Jyk7XG5cdFx0XHR9O1xuXG5cdFx0XHR0YXJnZXQuc2Nyb2xsSW50b1ZpZXcoe2JlaGF2aW9yOiBcInNtb290aFwiLCBibG9jazogXCJzdGFydFwifSk7XG5cdFx0fSk7XG5cdH07XG5cblx0bGV0IGFjdGl2ZUVudHJpZXMgPSB7fTtcblx0bGV0ICRvdXRlciA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5hbHBoYWJldF9fbGV0dGVycycpO1xuXHQkb3V0ZXIuaW5uZXJIVE1MID0gJyc7XG5cblx0YWxwaGFiZXQuZm9yRWFjaChsZXR0ZXIgPT4ge1xuXHRcdGxldCAkZmlyc3RFbnRyeSA9IGZpbmRGaXJzdEVudHJ5KGxldHRlcik7XG5cdFx0bGV0ICRhbmNob3IgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG5cblx0XHRpZiAoISRmaXJzdEVudHJ5KSByZXR1cm47XG5cblx0XHQkZmlyc3RFbnRyeS5pZCA9IGxldHRlcjtcblx0XHQkYW5jaG9yLmlubmVySFRNTCA9IGxldHRlci50b1VwcGVyQ2FzZSgpO1xuXHRcdCRhbmNob3IuY2xhc3NOYW1lID0gJ2FscGhhYmV0X19sZXR0ZXItYW5jaG9yJztcblxuXHRcdGF0dGFjaEFuY2hvckxpc3RlbmVyKCRhbmNob3IsIGxldHRlcik7XG5cdFx0JG91dGVyLmFwcGVuZENoaWxkKCRhbmNob3IpO1xuXHR9KTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IG1ha2VBbHBoYWJldDsiLCJjb25zdCBtYWtlU2xpZGVyID0gKCRzbGlkZXIpID0+IHtcblx0Y29uc3QgJGFycm93TmV4dCA9ICRzbGlkZXIucGFyZW50RWxlbWVudC5xdWVyeVNlbGVjdG9yKCcuYXJyb3ctbmV4dCcpO1xuXHRjb25zdCAkYXJyb3dQcmV2ID0gJHNsaWRlci5wYXJlbnRFbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJy5hcnJvdy1wcmV2Jyk7XG5cblx0bGV0IGN1cnJlbnQgPSAkc2xpZGVyLmZpcnN0RWxlbWVudENoaWxkO1xuXHQkYXJyb3dOZXh0LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuXHRcdGNvbnN0IG5leHQgPSBjdXJyZW50Lm5leHRFbGVtZW50U2libGluZztcblx0XHRpZiAobmV4dCkge1xuXHRcdFx0bmV4dC5zY3JvbGxJbnRvVmlldyh7YmVoYXZpb3I6IFwic21vb3RoXCIsIGJsb2NrOiBcIm5lYXJlc3RcIiwgaW5saW5lOiBcImNlbnRlclwifSk7XG5cdFx0XHRjdXJyZW50ID0gbmV4dDtcblx0XHR9XG5cdH0pO1xuXG5cdCRhcnJvd1ByZXYuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0Y29uc3QgcHJldiA9IGN1cnJlbnQucHJldmlvdXNFbGVtZW50U2libGluZztcblx0XHRpZiAocHJldikge1xuXHRcdFx0cHJldi5zY3JvbGxJbnRvVmlldyh7YmVoYXZpb3I6IFwic21vb3RoXCIsIGJsb2NrOiBcIm5lYXJlc3RcIiwgaW5saW5lOiBcImNlbnRlclwifSk7XG5cdFx0XHRjdXJyZW50ID0gcHJldjtcblx0XHR9XG5cdH0pXG59O1xuXG5leHBvcnQgZGVmYXVsdCBtYWtlU2xpZGVyOyIsImNvbnN0IGltYWdlVGVtcGxhdGUgPSAoaW1hZ2UpID0+IGA8aW1nIGNsYXNzPVwiYXJ0aWNsZS1pbWdcIiBzcmM9XCIuLi8uLi9hc3NldHMvaW1hZ2VzLyR7aW1hZ2V9XCI+PC9pbWc+YDtcblxuY29uc3QgYXJ0aWNsZVRlbXBsYXRlID0gKGVudHJ5LCBpKSA9PiB7XG5cdGNvbnN0IHsgdGl0bGUsIGZpcnN0TmFtZSwgbGFzdE5hbWUsIGltYWdlcywgZGVzY3JpcHRpb24sIGRldGFpbCB9ID0gZW50cnk7XG5cblx0Y29uc3QgaW1hZ2VIVE1MID0gaW1hZ2VzLmxlbmd0aCA/IFxuXHRcdGltYWdlcy5tYXAoaW1hZ2UgPT4gaW1hZ2VUZW1wbGF0ZShpbWFnZSkpLmpvaW4oJycpIDogJyc7XG5cblx0cmV0dXJuICBgXG5cdFx0PGFydGljbGUgY2xhc3M9XCJhcnRpY2xlX19vdXRlclwiPlxuXHRcdFx0PGRpdiBjbGFzcz1cImFydGljbGVfX2lubmVyXCI+XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlX19oZWFkaW5nXCI+XG5cdFx0XHRcdFx0PGEgY2xhc3M9XCJqcy1lbnRyeS10aXRsZVwiPjwvYT5cblx0XHRcdFx0XHQ8aDIgY2xhc3M9XCJhcnRpY2xlLWhlYWRpbmdfX3RpdGxlXCI+JHt0aXRsZX08L2gyPlxuXHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlLWhlYWRpbmdfX25hbWVcIj5cblx0XHRcdFx0XHRcdDxzcGFuIGNsYXNzPVwiYXJ0aWNsZS1oZWFkaW5nX19uYW1lLS1maXJzdFwiPiR7Zmlyc3ROYW1lfTwvc3Bhbj5cblx0XHRcdFx0XHRcdDxhIGNsYXNzPVwianMtZW50cnktYXJ0aXN0XCI+PC9hPlxuXHRcdFx0XHRcdFx0PHNwYW4gY2xhc3M9XCJhcnRpY2xlLWhlYWRpbmdfX25hbWUtLWxhc3RcIj4ke2xhc3ROYW1lfTwvc3Bhbj5cblx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0PC9kaXY+XHRcblx0XHRcdFx0PGRpdiBjbGFzcz1cImFydGljbGVfX3NsaWRlci1vdXRlclwiPlxuXHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlX19zbGlkZXItaW5uZXJcIiBpZD1cInNsaWRlci0ke2l9XCI+XG5cdFx0XHRcdFx0XHQke2ltYWdlSFRNTH1cblx0XHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlLWRlc2NyaXB0aW9uX19vdXRlclwiPlxuXHRcdFx0XHRcdFx0XHQ8ZGl2IGNsYXNzPVwiYXJ0aWNsZS1kZXNjcmlwdGlvblwiPiR7ZGVzY3JpcHRpb259PC9kaXY+XG5cdFx0XHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlLWRldGFpbFwiPiR7ZGV0YWlsfTwvZGl2PlxuXHRcdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdFx0PGRpdiBjbGFzcz1cImFydGljbGVfX3Njcm9sbC1jb250cm9sc1wiPlxuXHRcdFx0XHRcdFx0PHNwYW4gY2xhc3M9XCJjb250cm9scyBhcnJvdy1wcmV2XCI+4oaQPC9zcGFuPiBcblx0XHRcdFx0XHRcdDxzcGFuIGNsYXNzPVwiY29udHJvbHMgYXJyb3ctbmV4dFwiPuKGkjwvc3Bhbj5cblx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0XHQ8cCBjbGFzcz1cImpzLWFydGljbGUtYW5jaG9yLXRhcmdldFwiPjwvcD5cblx0XHRcdDwvZGl2PlxuXHRcdDwvYXJ0aWNsZT5cblx0YFxufTtcblxuZXhwb3J0IGRlZmF1bHQgYXJ0aWNsZVRlbXBsYXRlOyIsImltcG9ydCBhcnRpY2xlVGVtcGxhdGUgZnJvbSAnLi9hcnRpY2xlJztcbmltcG9ydCByZW5kZXJOYXZMZyBmcm9tICcuL25hdkxnJztcblxuZXhwb3J0IHsgYXJ0aWNsZVRlbXBsYXRlLCByZW5kZXJOYXZMZyB9OyIsImNvbnN0IHRlbXBsYXRlID0gXG5cdGA8ZGl2IGNsYXNzPVwibmF2X19pbm5lclwiPlxuXHRcdDxkaXYgY2xhc3M9XCJuYXZfX3NvcnQtYnlcIj5cblx0XHRcdDxzcGFuIGNsYXNzPVwic29ydC1ieV9fdGl0bGVcIj5Tb3J0IGJ5PC9zcGFuPlxuXHRcdFx0PGJ1dHRvbiBjbGFzcz1cInNvcnQtYnkgc29ydC1ieV9fYnktYXJ0aXN0IGFjdGl2ZVwiIGlkPVwianMtYnktYXJ0aXN0XCI+QXJ0aXN0PC9idXR0b24+XG5cdFx0XHQ8c3BhbiBjbGFzcz1cInNvcnQtYnlfX2RpdmlkZXJcIj4gfCA8L3NwYW4+XG5cdFx0XHQ8YnV0dG9uIGNsYXNzPVwic29ydC1ieSBzb3J0LWJ5X19ieS10aXRsZVwiIGlkPVwianMtYnktdGl0bGVcIj5UaXRsZTwvYnV0dG9uPlxuXHRcdFx0PHNwYW4gY2xhc3M9XCJmaW5kXCIgaWQ9XCJqcy1maW5kXCI+XG5cdFx0XHRcdCg8c3BhbiBjbGFzcz1cImZpbmQtLWlubmVyXCI+JiM4OTg0O0Y8L3NwYW4+KVxuXHRcdFx0PC9zcGFuPlxuXHRcdDwvZGl2PlxuXHRcdDxkaXYgY2xhc3M9XCJuYXZfX2FscGhhYmV0XCI+XG5cdFx0XHQ8c3BhbiBjbGFzcz1cImFscGhhYmV0X190aXRsZVwiPkdvIHRvPC9zcGFuPlxuXHRcdFx0PGRpdiBjbGFzcz1cImFscGhhYmV0X19sZXR0ZXJzXCI+PC9kaXY+XG5cdFx0PC9kaXY+XG5cdDwvZGl2PmA7XG5cbmNvbnN0IHJlbmRlck5hdkxnID0gKCkgPT4ge1xuXHRsZXQgbmF2T3V0ZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnanMtbmF2Jyk7XG5cdG5hdk91dGVyLmlubmVySFRNTCA9IHRlbXBsYXRlO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgcmVuZGVyTmF2TGc7IiwiaW1wb3J0IHsgJGxvYWRpbmcsICRuYXYsICRwYXJhbGxheCwgJGNvbnRlbnQsICR0aXRsZSwgJGFycm93LCAkbW9kYWwsICRsaWdodGJveCwgJHZpZXcgfSBmcm9tICcuLi9jb25zdGFudHMnO1xuXG5jb25zdCBkZWJvdW5jZSA9IChmbiwgdGltZSkgPT4ge1xuICBsZXQgdGltZW91dDtcblxuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgY29uc3QgZnVuY3Rpb25DYWxsID0gKCkgPT4gZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICBcbiAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgdGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb25DYWxsLCB0aW1lKTtcbiAgfVxufTtcblxuY29uc3QgaGlkZUxvYWRpbmcgPSAoKSA9PiB7XG5cdCRsb2FkaW5nLmZvckVhY2goZWxlbSA9PiBlbGVtLmNsYXNzTGlzdC5hZGQoJ3JlYWR5JykpO1xuXHQkbmF2LmNsYXNzTGlzdC5hZGQoJ3JlYWR5Jyk7XG59O1xuXG5jb25zdCBzY3JvbGxUb1RvcCA9ICgpID0+IHtcblx0bGV0IHRvcCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhbmNob3ItdGFyZ2V0Jyk7XG5cdHRvcC5zY3JvbGxJbnRvVmlldyh7YmVoYXZpb3I6IFwic21vb3RoXCIsIGJsb2NrOiBcInN0YXJ0XCJ9KTtcbn07XG5cbmV4cG9ydCB7IGRlYm91bmNlLCBoaWRlTG9hZGluZywgc2Nyb2xsVG9Ub3AgfTsiXSwicHJlRXhpc3RpbmdDb21tZW50IjoiLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9dXRmLTg7YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0p6YjNWeVkyVnpJanBiSW01dlpHVmZiVzlrZFd4bGN5OWljbTkzYzJWeUxYQmhZMnN2WDNCeVpXeDFaR1V1YW5NaUxDSnViMlJsWDIxdlpIVnNaWE12YzIxdmIzUm9jMk55YjJ4c0xYQnZiSGxtYVd4c0wyUnBjM1F2YzIxdmIzUm9jMk55YjJ4c0xtcHpJaXdpYzNKakwycHpMMk52Ym5OMFlXNTBjeTVxY3lJc0luTnlZeTlxY3k5cGJtUmxlQzVxY3lJc0luTnlZeTlxY3k5dGIyUjFiR1Z6TDJGMGRHRmphRWx0WVdkbFRHbHpkR1Z1WlhKekxtcHpJaXdpYzNKakwycHpMMjF2WkhWc1pYTXZZWFIwWVdOb1RXOWtZV3hNYVhOMFpXNWxjbk11YW5NaUxDSnpjbU12YW5NdmJXOWtkV3hsY3k5aGRIUmhZMmhWY0VGeWNtOTNUR2x6ZEdWdVpYSnpMbXB6SWl3aWMzSmpMMnB6TDIxdlpIVnNaWE12YVc1a1pYZ3Vhbk1pTENKemNtTXZhbk12Ylc5a2RXeGxjeTl0WVd0bFFXeHdhR0ZpWlhRdWFuTWlMQ0p6Y21NdmFuTXZiVzlrZFd4bGN5OXRZV3RsVTJ4cFpHVnlMbXB6SWl3aWMzSmpMMnB6TDNSbGJYQnNZWFJsY3k5aGNuUnBZMnhsTG1weklpd2ljM0pqTDJwekwzUmxiWEJzWVhSbGN5OXBibVJsZUM1cWN5SXNJbk55WXk5cWN5OTBaVzF3YkdGMFpYTXZibUYyVEdjdWFuTWlMQ0p6Y21NdmFuTXZkWFJwYkhNdmFXNWtaWGd1YW5NaVhTd2libUZ0WlhNaU9sdGRMQ0p0WVhCd2FXNW5jeUk2SWtGQlFVRTdRVU5CUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CT3pzN096czdPMEZEZG1KQkxFbEJRVTBzUzBGQlN5d3JSa0ZCV0RzN1FVRkZRU3hKUVVGTkxGZEJRVmNzVFVGQlRTeEpRVUZPTEVOQlFWY3NVMEZCVXl4blFrRkJWQ3hEUVVFd1FpeFZRVUV4UWl4RFFVRllMRU5CUVdwQ08wRkJRMEVzU1VGQlRTeFBRVUZQTEZOQlFWTXNZMEZCVkN4RFFVRjNRaXhSUVVGNFFpeERRVUZpTzBGQlEwRXNTVUZCVFN4WlFVRlpMRk5CUVZNc1lVRkJWQ3hEUVVGMVFpeFhRVUYyUWl4RFFVRnNRanRCUVVOQkxFbEJRVTBzVjBGQlZ5eFRRVUZUTEdGQlFWUXNRMEZCZFVJc1ZVRkJka0lzUTBGQmFrSTdRVUZEUVN4SlFVRk5MRk5CUVZNc1UwRkJVeXhqUVVGVUxFTkJRWGRDTEZWQlFYaENMRU5CUVdZN1FVRkRRU3hKUVVGTkxGZEJRVmNzVTBGQlV5eGpRVUZVTEVOQlFYZENMRlZCUVhoQ0xFTkJRV3BDTzBGQlEwRXNTVUZCVFN4VFFVRlRMRk5CUVZNc1lVRkJWQ3hEUVVGMVFpeFJRVUYyUWl4RFFVRm1PMEZCUTBFc1NVRkJUU3haUVVGWkxGTkJRVk1zWVVGQlZDeERRVUYxUWl4WFFVRjJRaXhEUVVGc1FqdEJRVU5CTEVsQlFVMHNVVUZCVVN4VFFVRlRMR0ZCUVZRc1EwRkJkVUlzWjBKQlFYWkNMRU5CUVdRN08xRkJSME1zUlN4SFFVRkJMRVU3VVVGRFFTeFJMRWRCUVVFc1VUdFJRVU5CTEVrc1IwRkJRU3hKTzFGQlEwRXNVeXhIUVVGQkxGTTdVVUZEUVN4UkxFZEJRVUVzVVR0UlFVTkJMRTBzUjBGQlFTeE5PMUZCUTBFc1VTeEhRVUZCTEZFN1VVRkRRU3hOTEVkQlFVRXNUVHRSUVVOQkxGTXNSMEZCUVN4VE8xRkJRMEVzU3l4SFFVRkJMRXM3T3pzN08wRkRkRUpFT3pzN08wRkJSVUU3TzBGQlEwRTdPMEZCUTBFN08wRkJRMEU3T3pzN1FVRkZRU3hKUVVGSkxGVkJRVlVzUTBGQlpDeERMRU5CUVdsQ08wRkJRMnBDTEVsQlFVa3NWVUZCVlN4RlFVRkZMRlZCUVZVc1JVRkJXaXhGUVVGblFpeFRRVUZUTEVWQlFYcENMRVZCUVdRN08wRkJSVUVzU1VGQlRTeDVRa0ZCZVVJc1UwRkJla0lzYzBKQlFYbENMRWRCUVUwN1FVRkRjRU1zUzBGQlNTeFpRVUZaTEZOQlFWTXNZMEZCVkN4RFFVRjNRaXhqUVVGNFFpeERRVUZvUWp0QlFVTkJMRXRCUVVrc1YwRkJWeXhUUVVGVExHTkJRVlFzUTBGQmQwSXNZVUZCZUVJc1EwRkJaanRCUVVOQkxGZEJRVlVzWjBKQlFWWXNRMEZCTWtJc1QwRkJNMElzUlVGQmIwTXNXVUZCVFR0QlFVTjZReXhOUVVGSkxFOUJRVW9zUlVGQllUdEJRVU5hTzBGQlEwRXNZVUZCVlN4RFFVRldPMEZCUTBFc1lVRkJWU3hUUVVGV0xFTkJRVzlDTEVkQlFYQkNMRU5CUVhkQ0xGRkJRWGhDTzBGQlEwRXNXVUZCVXl4VFFVRlVMRU5CUVcxQ0xFMUJRVzVDTEVOQlFUQkNMRkZCUVRGQ096dEJRVVZCTzBGQlEwRTdRVUZEUkN4RlFWUkVPenRCUVZkQkxGVkJRVk1zWjBKQlFWUXNRMEZCTUVJc1QwRkJNVUlzUlVGQmJVTXNXVUZCVFR0QlFVTjRReXhOUVVGSkxFTkJRVU1zVDBGQlRDeEZRVUZqTzBGQlEySTdRVUZEUVN4aFFVRlZMRU5CUVZZN1FVRkRRU3haUVVGVExGTkJRVlFzUTBGQmJVSXNSMEZCYmtJc1EwRkJkVUlzVVVGQmRrSTdRVUZEUVN4aFFVRlZMRk5CUVZZc1EwRkJiMElzVFVGQmNFSXNRMEZCTWtJc1VVRkJNMEk3TzBGQlJVRTdRVUZEUVR0QlFVTkVMRVZCVkVRN1FVRlZRU3hEUVhoQ1JEczdRVUV3UWtFc1NVRkJUU3huUWtGQlowSXNVMEZCYUVJc1lVRkJaMElzUjBGQlRUdEJRVU16UWl4TFFVRk5MR1ZCUVdVc1UwRkJVeXhqUVVGVUxFTkJRWGRDTEZOQlFYaENMRU5CUVhKQ08wRkJRMEVzUzBGQlRTeGpRVUZqTEZWQlFWVXNVVUZCVVN4UFFVRnNRaXhIUVVFMFFpeFJRVUZSTEZGQlFYaEVPenRCUVVWQkxHTkJRV0VzVTBGQllpeEhRVUY1UWl4RlFVRjZRanM3UVVGRlFTeGhRVUZaTEU5QlFWb3NRMEZCYjBJc1ZVRkJReXhMUVVGRUxFVkJRVkVzUTBGQlVpeEZRVUZqTzBGQlEycERMR1ZCUVdFc2EwSkJRV0lzUTBGQlowTXNWMEZCYUVNc1JVRkJOa01zWjBOQlFXZENMRXRCUVdoQ0xFVkJRWFZDTEVOQlFYWkNMRU5CUVRkRE8wRkJRMEVzTWtKQlFWY3NVMEZCVXl4alFVRlVMR0ZCUVd0RExFTkJRV3hETEVOQlFWZzdRVUZEUVN4RlFVaEVPenRCUVV0Qk8wRkJRMEVzTkVKQlFXRXNUMEZCWWp0QlFVTkJMRU5CWWtRN08wRkJaVUVzU1VGQlRTeDNRa0ZCZDBJc1UwRkJlRUlzY1VKQlFYZENMRU5CUVVNc1NVRkJSQ3hGUVVGVk8wRkJRM1pETEZOQlFWRXNVVUZCVWl4SFFVRnRRaXhKUVVGdVFqdEJRVU5CTEZOQlFWRXNUMEZCVWl4SFFVRnJRaXhMUVVGTExFdEJRVXdzUlVGQmJFSXNRMEZHZFVNc1EwRkZVRHM3UVVGRmFFTXNVMEZCVVN4UFFVRlNMRU5CUVdkQ0xFbEJRV2hDTEVOQlFYRkNMRlZCUVVNc1EwRkJSQ3hGUVVGSkxFTkJRVW9zUlVGQlZUdEJRVU01UWl4TlFVRkpMRk5CUVZNc1JVRkJSU3hMUVVGR0xFTkJRVkVzUTBGQlVpeEZRVUZYTEZkQlFWZ3NSVUZCWWp0QlFVTkJMRTFCUVVrc1UwRkJVeXhGUVVGRkxFdEJRVVlzUTBGQlVTeERRVUZTTEVWQlFWY3NWMEZCV0N4RlFVRmlPMEZCUTBFc1RVRkJTU3hUUVVGVExFMUJRV0lzUlVGQmNVSXNUMEZCVHl4RFFVRlFMRU5CUVhKQ0xFdEJRMHNzU1VGQlNTeFRRVUZUTEUxQlFXSXNSVUZCY1VJc1QwRkJUeXhEUVVGRExFTkJRVklzUTBGQmNrSXNTMEZEUVN4UFFVRlBMRU5CUVZBN1FVRkRUQ3hGUVU1RU8wRkJUMEVzUTBGWVJEczdRVUZoUVN4SlFVRk5MRmxCUVZrc1UwRkJXaXhUUVVGWkxFZEJRVTA3UVVGRGRrSXNUMEZCVFN4aFFVRk9MRVZCUVZVc1NVRkJWaXhEUVVGbE8wRkJRVUVzVTBGQlR5eEpRVUZKTEVsQlFVb3NSVUZCVUR0QlFVRkJMRVZCUVdZc1JVRkRReXhKUVVSRUxFTkJRMDBzWjBKQlFWRTdRVUZEWWl4M1FrRkJjMElzU1VGQmRFSTdRVUZEUVR0QlFVTkJPMEZCUTBFc1JVRk1SQ3hGUVUxRExFdEJUa1FzUTBGTlR6dEJRVUZCTEZOQlFVOHNVVUZCVVN4SlFVRlNMRU5CUVdFc1IwRkJZaXhEUVVGUU8wRkJRVUVzUlVGT1VEdEJRVTlCTEVOQlVrUTdPMEZCVlVFc1NVRkJUU3hQUVVGUExGTkJRVkFzU1VGQlR5eEhRVUZOTzBGQlEyeENMR2REUVVGaExGRkJRV0k3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFc1EwRlFSRHM3UVVGVFFUczdPenM3T3pzN08wRkRia1pCT3p0QlFVVkJMRWxCUVVrc1YwRkJWeXhMUVVGbU96dEJRVVZCTEVsQlFVMHNkVUpCUVhWQ0xGTkJRWFpDTEc5Q1FVRjFRaXhIUVVGTk8wRkJRMnhETEV0QlFVMHNWVUZCVlN4TlFVRk5MRWxCUVU0c1EwRkJWeXhUUVVGVExHZENRVUZVTEVOQlFUQkNMR05CUVRGQ0xFTkJRVmdzUTBGQmFFSTdPMEZCUlVFc1UwRkJVU3hQUVVGU0xFTkJRV2RDTEdWQlFVODdRVUZEZEVJc1RVRkJTU3huUWtGQlNpeERRVUZ4UWl4UFFVRnlRaXhGUVVFNFFpeFZRVUZETEVkQlFVUXNSVUZCVXp0QlFVTjBReXhQUVVGSkxFTkJRVU1zVVVGQlRDeEZRVUZsTzBGQlEyUXNVVUZCU1N4TlFVRk5MRWxCUVVrc1IwRkJaRHM3UVVGRlFTeDVRa0ZCVlN4VFFVRldMRU5CUVc5Q0xFZEJRWEJDTEVOQlFYZENMRlZCUVhoQ08wRkJRMEVzY1VKQlFVMHNXVUZCVGl4RFFVRnRRaXhQUVVGdVFpdzJRa0ZCY1VRc1IwRkJja1E3UVVGRFFTeGxRVUZYTEVsQlFWZzdRVUZEUVR0QlFVTkVMRWRCVWtRN1FVRlRRU3hGUVZaRU96dEJRVmxCTEd0Q1FVRk5MR2RDUVVGT0xFTkJRWFZDTEU5QlFYWkNMRVZCUVdkRExGbEJRVTA3UVVGRGNrTXNUVUZCU1N4UlFVRktMRVZCUVdNN1FVRkRZaXgzUWtGQlZTeFRRVUZXTEVOQlFXOUNMRTFCUVhCQ0xFTkJRVEpDTEZWQlFUTkNPMEZCUTBFc1kwRkJWeXhMUVVGWU8wRkJRMEU3UVVGRFJDeEZRVXhFTzBGQlRVRXNRMEZ5UWtRN08ydENRWFZDWlN4dlFqczdPenM3T3pzN08wRkRNMEptT3p0QlFVVkJMRWxCUVVrc1VVRkJVU3hMUVVGYU8wRkJRMEVzU1VGQlRTeDFRa0ZCZFVJc1UwRkJka0lzYjBKQlFYVkNMRWRCUVUwN1FVRkRiRU1zUzBGQlRTeFJRVUZSTEZOQlFWTXNZMEZCVkN4RFFVRjNRaXhUUVVGNFFpeERRVUZrT3p0QlFVVkJMRTlCUVUwc1owSkJRVTRzUTBGQmRVSXNUMEZCZGtJc1JVRkJaME1zV1VGQlRUdEJRVU55UXl4dlFrRkJUeXhUUVVGUUxFTkJRV2xDTEVkQlFXcENMRU5CUVhGQ0xFMUJRWEpDTzBGQlEwRXNWVUZCVVN4SlFVRlNPMEZCUTBFc1JVRklSRHM3UVVGTFFTeHRRa0ZCVHl4blFrRkJVQ3hEUVVGM1FpeFBRVUY0UWl4RlFVRnBReXhaUVVGTk8wRkJRM1JETEc5Q1FVRlBMRk5CUVZBc1EwRkJhVUlzVFVGQmFrSXNRMEZCZDBJc1RVRkJlRUk3UVVGRFFTeFZRVUZSTEV0QlFWSTdRVUZEUVN4RlFVaEVPenRCUVV0QkxGRkJRVThzWjBKQlFWQXNRMEZCZDBJc1UwRkJlRUlzUlVGQmJVTXNXVUZCVFR0QlFVTjRReXhOUVVGSkxFdEJRVW9zUlVGQlZ6dEJRVU5XTEdOQlFWY3NXVUZCVFR0QlFVTm9RaXh6UWtGQlR5eFRRVUZRTEVOQlFXbENMRTFCUVdwQ0xFTkJRWGRDTEUxQlFYaENPMEZCUTBFc1dVRkJVU3hMUVVGU08wRkJRMEVzU1VGSVJDeEZRVWRITEVkQlNFZzdRVUZKUVR0QlFVTkVMRVZCVUVRN1FVRlJRU3hEUVhKQ1JEczdhMEpCZFVKbExHOUNPenM3T3pzN096czdRVU14UW1ZN08wRkJRMEU3TzBGQlJVRXNTVUZCU1N4aFFVRktPMEZCUTBFc1NVRkJTU3hWUVVGVkxFTkJRV1E3UVVGRFFTeEpRVUZKTEZsQlFWa3NTMEZCYUVJN08wRkJSVUVzU1VGQlRTeDVRa0ZCZVVJc1UwRkJla0lzYzBKQlFYbENMRWRCUVUwN1FVRkRjRU1zYzBKQlFWVXNaMEpCUVZZc1EwRkJNa0lzVVVGQk0wSXNSVUZCY1VNc1dVRkJUVHRCUVVNeFF5eE5RVUZKTEVsQlFVa3NhMEpCUVU4c2NVSkJRVkFzUjBGQkswSXNRMEZCZGtNN08wRkJSVUVzVFVGQlNTeFpRVUZaTEVOQlFXaENMRVZCUVcxQ08wRkJRMnhDTEZWQlFVOHNUMEZCVUR0QlFVTkJMR0ZCUVZVc1EwRkJWanRCUVVOQk96dEJRVVZFTEUxQlFVa3NTMEZCU3l4RFFVRkRMRVZCUVU0c1NVRkJXU3hEUVVGRExGTkJRV3BDTEVWQlFUUkNPMEZCUXpOQ0xIVkNRVUZUTEZOQlFWUXNRMEZCYlVJc1IwRkJia0lzUTBGQmRVSXNUVUZCZGtJN1FVRkRRU3hsUVVGWkxFbEJRVm83UVVGRFFTeEhRVWhFTEUxQlIwOHNTVUZCU1N4SlFVRkpMRU5CUVVNc1JVRkJUQ3hKUVVGWExGTkJRV1lzUlVGQk1FSTdRVUZEYUVNc2RVSkJRVk1zVTBGQlZDeERRVUZ0UWl4TlFVRnVRaXhEUVVFd1FpeE5RVUV4UWp0QlFVTkJMR1ZCUVZrc1MwRkJXanRCUVVOQk8wRkJRMFFzUlVGbVJEczdRVUZwUWtFc2NVSkJRVk1zWjBKQlFWUXNRMEZCTUVJc1QwRkJNVUlzUlVGQmJVTTdRVUZCUVN4VFFVRk5MSGxDUVVGT08wRkJRVUVzUlVGQmJrTTdRVUZEUVN4RFFXNUNSRHM3YTBKQmNVSmxMSE5DT3pzN096czdPenM3TzBGRE5VSm1PenM3TzBGQlEwRTdPenM3UVVGRFFUczdPenRCUVVOQk96czdPMEZCUTBFN096czdPenRSUVVkRExHOUNMRWRCUVVFc09FSTdVVUZEUVN4elFpeEhRVUZCTEdkRE8xRkJRMEVzYjBJc1IwRkJRU3c0UWp0UlFVTkJMRmtzUjBGQlFTeHpRanRSUVVOQkxGVXNSMEZCUVN4dlFqczdPenM3T3pzN1FVTllSQ3hKUVVGTkxGZEJRVmNzUTBGQlF5eEhRVUZFTEVWQlFVMHNSMEZCVGl4RlFVRlhMRWRCUVZnc1JVRkJaMElzUjBGQmFFSXNSVUZCY1VJc1IwRkJja0lzUlVGQk1FSXNSMEZCTVVJc1JVRkJLMElzUjBGQkwwSXNSVUZCYjBNc1IwRkJjRU1zUlVGQmVVTXNSMEZCZWtNc1JVRkJPRU1zUjBGQk9VTXNSVUZCYlVRc1IwRkJia1FzUlVGQmQwUXNSMEZCZUVRc1JVRkJOa1FzUjBGQk4wUXNSVUZCYTBVc1IwRkJiRVVzUlVGQmRVVXNSMEZCZGtVc1JVRkJORVVzUjBGQk5VVXNSVUZCYVVZc1IwRkJha1lzUlVGQmMwWXNSMEZCZEVZc1JVRkJNa1lzUjBGQk0wWXNSVUZCWjBjc1IwRkJhRWNzUlVGQmNVY3NSMEZCY2tjc1JVRkJNRWNzUjBGQk1VY3NSVUZCSzBjc1IwRkJMMGNzUlVGQmIwZ3NSMEZCY0Vnc1EwRkJha0k3TzBGQlJVRXNTVUZCVFN4bFFVRmxMRk5CUVdZc1dVRkJaU3hEUVVGRExFOUJRVVFzUlVGQllUdEJRVU5xUXl4TFFVRk5MR2xDUVVGcFFpeFRRVUZxUWl4alFVRnBRaXhEUVVGRExFbEJRVVFzUlVGQlZUdEJRVU5vUXl4TlFVRk5MRmRCUVZjc1ZVRkJWU3hwUWtGQlZpeEhRVUU0UWl4clFrRkJMME03UVVGRFFTeE5RVUZOTEdWQlFXVXNRMEZCUXl4UFFVRkVMRWRCUVZjc2FVSkJRVmdzUjBGQkswSXNhMEpCUVhCRU96dEJRVVZCTEUxQlFVMHNWMEZCVnl4TlFVRk5MRWxCUVU0c1EwRkJWeXhUUVVGVExHZENRVUZVTEVOQlFUQkNMRkZCUVRGQ0xFTkJRVmdzUTBGQmFrSTdRVUZEUVN4TlFVRk5MR1ZCUVdVc1RVRkJUU3hKUVVGT0xFTkJRVmNzVTBGQlV5eG5Ra0ZCVkN4RFFVRXdRaXhaUVVFeFFpeERRVUZZTEVOQlFYSkNPenRCUVVWQkxHVkJRV0VzVDBGQllpeERRVUZ4UWp0QlFVRkJMRlZCUVZNc1RVRkJUU3hsUVVGT0xFTkJRWE5DTEUxQlFYUkNMRU5CUVZRN1FVRkJRU3hIUVVGeVFqczdRVUZGUVN4VFFVRlBMRk5CUVZNc1NVRkJWQ3hEUVVGakxHbENRVUZUTzBGQlF6ZENMRTlCUVVrc1QwRkJUeXhOUVVGTkxHdENRVUZxUWp0QlFVTkJMRlZCUVU4c1MwRkJTeXhUUVVGTUxFTkJRV1VzUTBGQlppeE5RVUZ6UWl4SlFVRjBRaXhKUVVFNFFpeExRVUZMTEZOQlFVd3NRMEZCWlN4RFFVRm1MRTFCUVhOQ0xFdEJRVXNzVjBGQlRDeEZRVUV6UkR0QlFVTkJMRWRCU0Uwc1EwRkJVRHRCUVVsQkxFVkJZa1E3TzBGQlpVRXNTMEZCVFN4MVFrRkJkVUlzVTBGQmRrSXNiMEpCUVhWQ0xFTkJRVU1zVDBGQlJDeEZRVUZWTEUxQlFWWXNSVUZCY1VJN1FVRkRha1FzVlVGQlVTeG5Ra0ZCVWl4RFFVRjVRaXhQUVVGNlFpeEZRVUZyUXl4WlFVRk5PMEZCUTNaRExFOUJRVTBzWVVGQllTeFRRVUZUTEdOQlFWUXNRMEZCZDBJc1RVRkJlRUlzUTBGQmJrSTdRVUZEUVN4UFFVRkpMR1ZCUVVvN08wRkJSVUVzVDBGQlNTeERRVUZETEU5QlFVd3NSVUZCWXp0QlFVTmlMR0ZCUVZNc1YwRkJWeXhIUVVGWUxFZEJRV2xDTEZOQlFWTXNZMEZCVkN4RFFVRjNRaXhsUVVGNFFpeERRVUZxUWl4SFFVRTBSQ3hYUVVGWExHRkJRVmdzUTBGQmVVSXNZVUZCZWtJc1EwRkJkVU1zWVVGQmRrTXNRMEZCY1VRc1lVRkJja1FzUTBGQmJVVXNjMEpCUVc1RkxFTkJRVEJHTEdGQlFURkdMRU5CUVhkSExESkNRVUY0Unl4RFFVRnlSVHRCUVVOQkxFbEJSa1FzVFVGRlR6dEJRVU5PTEdGQlFWTXNWMEZCVnl4SFFVRllMRWRCUVdsQ0xGTkJRVk1zWTBGQlZDeERRVUYzUWl4bFFVRjRRaXhEUVVGcVFpeEhRVUUwUkN4WFFVRlhMR0ZCUVZnc1EwRkJlVUlzWVVGQmVrSXNRMEZCZFVNc1lVRkJka01zUTBGQmNVUXNjMEpCUVhKRUxFTkJRVFJGTEdGQlFUVkZMRU5CUVRCR0xESkNRVUV4Uml4RFFVRnlSVHRCUVVOQk96dEJRVVZFTEZWQlFVOHNZMEZCVUN4RFFVRnpRaXhGUVVGRExGVkJRVlVzVVVGQldDeEZRVUZ4UWl4UFFVRlBMRTlCUVRWQ0xFVkJRWFJDTzBGQlEwRXNSMEZZUkR0QlFWbEJMRVZCWWtRN08wRkJaVUVzUzBGQlNTeG5Ra0ZCWjBJc1JVRkJjRUk3UVVGRFFTeExRVUZKTEZOQlFWTXNVMEZCVXl4aFFVRlVMRU5CUVhWQ0xHOUNRVUYyUWl4RFFVRmlPMEZCUTBFc1VVRkJUeXhUUVVGUUxFZEJRVzFDTEVWQlFXNUNPenRCUVVWQkxGVkJRVk1zVDBGQlZDeERRVUZwUWl4clFrRkJWVHRCUVVNeFFpeE5RVUZKTEdOQlFXTXNaVUZCWlN4TlFVRm1MRU5CUVd4Q08wRkJRMEVzVFVGQlNTeFZRVUZWTEZOQlFWTXNZVUZCVkN4RFFVRjFRaXhIUVVGMlFpeERRVUZrT3p0QlFVVkJMRTFCUVVrc1EwRkJReXhYUVVGTUxFVkJRV3RDT3p0QlFVVnNRaXhqUVVGWkxFVkJRVm9zUjBGQmFVSXNUVUZCYWtJN1FVRkRRU3hWUVVGUkxGTkJRVklzUjBGQmIwSXNUMEZCVHl4WFFVRlFMRVZCUVhCQ08wRkJRMEVzVlVGQlVTeFRRVUZTTEVkQlFXOUNMSGxDUVVGd1FqczdRVUZGUVN4MVFrRkJjVUlzVDBGQmNrSXNSVUZCT0VJc1RVRkJPVUk3UVVGRFFTeFRRVUZQTEZkQlFWQXNRMEZCYlVJc1QwRkJia0k3UVVGRFFTeEZRVnBFTzBGQllVRXNRMEZvUkVRN08ydENRV3RFWlN4Wk96czdPenM3T3p0QlEzQkVaaXhKUVVGTkxHRkJRV0VzVTBGQllpeFZRVUZoTEVOQlFVTXNUMEZCUkN4RlFVRmhPMEZCUXk5Q0xFdEJRVTBzWVVGQllTeFJRVUZSTEdGQlFWSXNRMEZCYzBJc1lVRkJkRUlzUTBGQmIwTXNZVUZCY0VNc1EwRkJia0k3UVVGRFFTeExRVUZOTEdGQlFXRXNVVUZCVVN4aFFVRlNMRU5CUVhOQ0xHRkJRWFJDTEVOQlFXOURMR0ZCUVhCRExFTkJRVzVDT3p0QlFVVkJMRXRCUVVrc1ZVRkJWU3hSUVVGUkxHbENRVUYwUWp0QlFVTkJMRmxCUVZjc1owSkJRVmdzUTBGQk5FSXNUMEZCTlVJc1JVRkJjVU1zV1VGQlRUdEJRVU14UXl4TlFVRk5MRTlCUVU4c1VVRkJVU3hyUWtGQmNrSTdRVUZEUVN4TlFVRkpMRWxCUVVvc1JVRkJWVHRCUVVOVUxGRkJRVXNzWTBGQlRDeERRVUZ2UWl4RlFVRkRMRlZCUVZVc1VVRkJXQ3hGUVVGeFFpeFBRVUZQTEZOQlFUVkNMRVZCUVhWRExGRkJRVkVzVVVGQkwwTXNSVUZCY0VJN1FVRkRRU3hoUVVGVkxFbEJRVlk3UVVGRFFUdEJRVU5FTEVWQlRrUTdPMEZCVVVFc1dVRkJWeXhuUWtGQldDeERRVUUwUWl4UFFVRTFRaXhGUVVGeFF5eFpRVUZOTzBGQlF6RkRMRTFCUVUwc1QwRkJUeXhSUVVGUkxITkNRVUZ5UWp0QlFVTkJMRTFCUVVrc1NVRkJTaXhGUVVGVk8wRkJRMVFzVVVGQlN5eGpRVUZNTEVOQlFXOUNMRVZCUVVNc1ZVRkJWU3hSUVVGWUxFVkJRWEZDTEU5QlFVOHNVMEZCTlVJc1JVRkJkVU1zVVVGQlVTeFJRVUV2UXl4RlFVRndRanRCUVVOQkxHRkJRVlVzU1VGQlZqdEJRVU5CTzBGQlEwUXNSVUZPUkR0QlFVOUJMRU5CY0VKRU96dHJRa0Z6UW1Vc1ZUczdPenM3T3pzN1FVTjBRbVlzU1VGQlRTeG5Ra0ZCWjBJc1UwRkJhRUlzWVVGQlowSXNRMEZCUXl4TFFVRkVPMEZCUVVFc0swUkJRV2RGTEV0QlFXaEZPMEZCUVVFc1EwRkJkRUk3TzBGQlJVRXNTVUZCVFN4clFrRkJhMElzVTBGQmJFSXNaVUZCYTBJc1EwRkJReXhMUVVGRUxFVkJRVkVzUTBGQlVpeEZRVUZqTzBGQlFVRXNTMEZETjBJc1MwRkVOa0lzUjBGREswSXNTMEZFTDBJc1EwRkROMElzUzBGRU5rSTdRVUZCUVN4TFFVTjBRaXhUUVVSelFpeEhRVU1yUWl4TFFVUXZRaXhEUVVOMFFpeFRRVVJ6UWp0QlFVRkJMRXRCUTFnc1VVRkVWeXhIUVVNclFpeExRVVF2UWl4RFFVTllMRkZCUkZjN1FVRkJRU3hMUVVORUxFMUJSRU1zUjBGREswSXNTMEZFTDBJc1EwRkRSQ3hOUVVSRE8wRkJRVUVzUzBGRFR5eFhRVVJRTEVkQlF5dENMRXRCUkM5Q0xFTkJRMDhzVjBGRVVEdEJRVUZCTEV0QlEyOUNMRTFCUkhCQ0xFZEJReXRDTEV0QlJDOUNMRU5CUTI5Q0xFMUJSSEJDT3pzN1FVRkhja01zUzBGQlRTeFpRVUZaTEU5QlFVOHNUVUZCVUN4SFFVTnFRaXhQUVVGUExFZEJRVkFzUTBGQlZ6dEJRVUZCTEZOQlFWTXNZMEZCWXl4TFFVRmtMRU5CUVZRN1FVRkJRU3hGUVVGWUxFVkJRVEJETEVsQlFURkRMRU5CUVN0RExFVkJRUzlETEVOQlJHbENMRWRCUTI5RExFVkJSSFJFT3p0QlFVZEJMSGRPUVV0NVF5eExRVXg2UXl4eFNFRlBhMFFzVTBGUWJFUXNiMGhCVTJsRUxGRkJWR3BFTERCS1FXRnZSQ3hEUVdKd1JDeDNRa0ZqVHl4VFFXUlFMQ3RIUVdkQ2VVTXNWMEZvUW5wRExEQkVRV2xDYjBNc1RVRnFRbkJETzBGQk5FSkJMRU5CYkVORU96dHJRa0Z2UTJVc1pUczdPenM3T3pzN096dEJRM1JEWmpzN096dEJRVU5CT3pzN096czdVVUZGVXl4bExFZEJRVUVzYVVJN1VVRkJhVUlzVnl4SFFVRkJMR1U3T3pzN096czdPMEZEU0RGQ0xFbEJRVTBzYlcxQ1FVRk9PenRCUVdsQ1FTeEpRVUZOTEdOQlFXTXNVMEZCWkN4WFFVRmpMRWRCUVUwN1FVRkRla0lzUzBGQlNTeFhRVUZYTEZOQlFWTXNZMEZCVkN4RFFVRjNRaXhSUVVGNFFpeERRVUZtTzBGQlEwRXNWVUZCVXl4VFFVRlVMRWRCUVhGQ0xGRkJRWEpDTzBGQlEwRXNRMEZJUkRzN2EwSkJTMlVzVnpzN096czdPenM3T3p0QlEzUkNaanM3UVVGRlFTeEpRVUZOTEZkQlFWY3NVMEZCV0N4UlFVRlhMRU5CUVVNc1JVRkJSQ3hGUVVGTExFbEJRVXdzUlVGQll6dEJRVU0zUWl4TlFVRkpMR2RDUVVGS096dEJRVVZCTEZOQlFVOHNXVUZCVnp0QlFVRkJPMEZCUVVFN08wRkJRMmhDTEZGQlFVMHNaVUZCWlN4VFFVRm1MRmxCUVdVN1FVRkJRU3hoUVVGTkxFZEJRVWNzUzBGQlNDeERRVUZUTEV0QlFWUXNSVUZCWlN4VlFVRm1MRU5CUVU0N1FVRkJRU3hMUVVGeVFqczdRVUZGUVN4cFFrRkJZU3hQUVVGaU8wRkJRMEVzWTBGQlZTeFhRVUZYTEZsQlFWZ3NSVUZCZVVJc1NVRkJla0lzUTBGQlZqdEJRVU5FTEVkQlRFUTdRVUZOUkN4RFFWUkVPenRCUVZkQkxFbEJRVTBzWTBGQll5eFRRVUZrTEZkQlFXTXNSMEZCVFR0QlFVTjZRaXh6UWtGQlV5eFBRVUZVTEVOQlFXbENPMEZCUVVFc1YwRkJVU3hMUVVGTExGTkJRVXdzUTBGQlpTeEhRVUZtTEVOQlFXMUNMRTlCUVc1Q0xFTkJRVkk3UVVGQlFTeEhRVUZxUWp0QlFVTkJMR3RDUVVGTExGTkJRVXdzUTBGQlpTeEhRVUZtTEVOQlFXMUNMRTlCUVc1Q08wRkJRMEVzUTBGSVJEczdRVUZMUVN4SlFVRk5MR05CUVdNc1UwRkJaQ3hYUVVGakxFZEJRVTA3UVVGRGVrSXNUVUZCU1N4TlFVRk5MRk5CUVZNc1kwRkJWQ3hEUVVGM1FpeGxRVUY0UWl4RFFVRldPMEZCUTBFc1RVRkJTU3hqUVVGS0xFTkJRVzFDTEVWQlFVTXNWVUZCVlN4UlFVRllMRVZCUVhGQ0xFOUJRVThzVDBGQk5VSXNSVUZCYmtJN1FVRkRRU3hEUVVoRU96dFJRVXRUTEZFc1IwRkJRU3hSTzFGQlFWVXNWeXhIUVVGQkxGYzdVVUZCWVN4WExFZEJRVUVzVnlJc0ltWnBiR1VpT2lKblpXNWxjbUYwWldRdWFuTWlMQ0p6YjNWeVkyVlNiMjkwSWpvaUlpd2ljMjkxY21ObGMwTnZiblJsYm5RaU9sc2lLR1oxYm1OMGFXOXVLQ2w3Wm5WdVkzUnBiMjRnY2lobExHNHNkQ2w3Wm5WdVkzUnBiMjRnYnlocExHWXBlMmxtS0NGdVcybGRLWHRwWmlnaFpWdHBYU2w3ZG1GeUlHTTlYQ0ptZFc1amRHbHZibHdpUFQxMGVYQmxiMllnY21WeGRXbHlaU1ltY21WeGRXbHlaVHRwWmlnaFppWW1ZeWx5WlhSMWNtNGdZeWhwTENFd0tUdHBaaWgxS1hKbGRIVnliaUIxS0drc0lUQXBPM1poY2lCaFBXNWxkeUJGY25KdmNpaGNJa05oYm01dmRDQm1hVzVrSUcxdlpIVnNaU0FuWENJcmFTdGNJaWRjSWlrN2RHaHliM2NnWVM1amIyUmxQVndpVFU5RVZVeEZYMDVQVkY5R1QxVk9SRndpTEdGOWRtRnlJSEE5Ymx0cFhUMTdaWGh3YjNKMGN6cDdmWDA3WlZ0cFhWc3dYUzVqWVd4c0tIQXVaWGh3YjNKMGN5eG1kVzVqZEdsdmJpaHlLWHQyWVhJZ2JqMWxXMmxkV3pGZFczSmRPM0psZEhWeWJpQnZLRzU4ZkhJcGZTeHdMSEF1Wlhod2IzSjBjeXh5TEdVc2JpeDBLWDF5WlhSMWNtNGdibHRwWFM1bGVIQnZjblJ6ZldadmNpaDJZWElnZFQxY0ltWjFibU4wYVc5dVhDSTlQWFI1Y0dWdlppQnlaWEYxYVhKbEppWnlaWEYxYVhKbExHazlNRHRwUEhRdWJHVnVaM1JvTzJrckt5bHZLSFJiYVYwcE8zSmxkSFZ5YmlCdmZYSmxkSFZ5YmlCeWZTa29LU0lzSWk4cUlITnRiMjkwYUhOamNtOXNiQ0IyTUM0MExqQWdMU0F5TURFNElDMGdSSFZ6ZEdGdUlFdGhjM1JsYml3Z1NtVnlaVzFwWVhNZ1RXVnVhV05vWld4c2FTQXRJRTFKVkNCTWFXTmxibk5sSUNvdlhHNG9ablZ1WTNScGIyNGdLQ2tnZTF4dUlDQW5kWE5sSUhOMGNtbGpkQ2M3WEc1Y2JpQWdMeThnY0c5c2VXWnBiR3hjYmlBZ1puVnVZM1JwYjI0Z2NHOXNlV1pwYkd3b0tTQjdYRzRnSUNBZ0x5OGdZV3hwWVhObGMxeHVJQ0FnSUhaaGNpQjNJRDBnZDJsdVpHOTNPMXh1SUNBZ0lIWmhjaUJrSUQwZ1pHOWpkVzFsYm5RN1hHNWNiaUFnSUNBdkx5QnlaWFIxY200Z2FXWWdjMk55YjJ4c0lHSmxhR0YyYVc5eUlHbHpJSE4xY0hCdmNuUmxaQ0JoYm1RZ2NHOXNlV1pwYkd3Z2FYTWdibTkwSUdadmNtTmxaRnh1SUNBZ0lHbG1JQ2hjYmlBZ0lDQWdJQ2R6WTNKdmJHeENaV2hoZG1sdmNpY2dhVzRnWkM1a2IyTjFiV1Z1ZEVWc1pXMWxiblF1YzNSNWJHVWdKaVpjYmlBZ0lDQWdJSGN1WDE5bWIzSmpaVk50YjI5MGFGTmpjbTlzYkZCdmJIbG1hV3hzWDE4Z0lUMDlJSFJ5ZFdWY2JpQWdJQ0FwSUh0Y2JpQWdJQ0FnSUhKbGRIVnlianRjYmlBZ0lDQjlYRzVjYmlBZ0lDQXZMeUJuYkc5aVlXeHpYRzRnSUNBZ2RtRnlJRVZzWlcxbGJuUWdQU0IzTGtoVVRVeEZiR1Z0Wlc1MElIeDhJSGN1Uld4bGJXVnVkRHRjYmlBZ0lDQjJZWElnVTBOU1QweE1YMVJKVFVVZ1BTQTBOamc3WEc1Y2JpQWdJQ0F2THlCdlltcGxZM1FnWjJGMGFHVnlhVzVuSUc5eWFXZHBibUZzSUhOamNtOXNiQ0J0WlhSb2IyUnpYRzRnSUNBZ2RtRnlJRzl5YVdkcGJtRnNJRDBnZTF4dUlDQWdJQ0FnYzJOeWIyeHNPaUIzTG5OamNtOXNiQ0I4ZkNCM0xuTmpjbTlzYkZSdkxGeHVJQ0FnSUNBZ2MyTnliMnhzUW5rNklIY3VjMk55YjJ4c1Fua3NYRzRnSUNBZ0lDQmxiR1Z0Wlc1MFUyTnliMnhzT2lCRmJHVnRaVzUwTG5CeWIzUnZkSGx3WlM1elkzSnZiR3dnZkh3Z2MyTnliMnhzUld4bGJXVnVkQ3hjYmlBZ0lDQWdJSE5qY205c2JFbHVkRzlXYVdWM09pQkZiR1Z0Wlc1MExuQnliM1J2ZEhsd1pTNXpZM0p2Ykd4SmJuUnZWbWxsZDF4dUlDQWdJSDA3WEc1Y2JpQWdJQ0F2THlCa1pXWnBibVVnZEdsdGFXNW5JRzFsZEdodlpGeHVJQ0FnSUhaaGNpQnViM2NnUFZ4dUlDQWdJQ0FnZHk1d1pYSm1iM0p0WVc1alpTQW1KaUIzTG5CbGNtWnZjbTFoYm1ObExtNXZkMXh1SUNBZ0lDQWdJQ0EvSUhjdWNHVnlabTl5YldGdVkyVXVibTkzTG1KcGJtUW9keTV3WlhKbWIzSnRZVzVqWlNsY2JpQWdJQ0FnSUNBZ09pQkVZWFJsTG01dmR6dGNibHh1SUNBZ0lDOHFLbHh1SUNBZ0lDQXFJR2x1WkdsallYUmxjeUJwWmlCaElIUm9aU0JqZFhKeVpXNTBJR0p5YjNkelpYSWdhWE1nYldGa1pTQmllU0JOYVdOeWIzTnZablJjYmlBZ0lDQWdLaUJBYldWMGFHOWtJR2x6VFdsamNtOXpiMlowUW5KdmQzTmxjbHh1SUNBZ0lDQXFJRUJ3WVhKaGJTQjdVM1J5YVc1bmZTQjFjMlZ5UVdkbGJuUmNiaUFnSUNBZ0tpQkFjbVYwZFhKdWN5QjdRbTl2YkdWaGJuMWNiaUFnSUNBZ0tpOWNiaUFnSUNCbWRXNWpkR2x2YmlCcGMwMXBZM0p2YzI5bWRFSnliM2R6WlhJb2RYTmxja0ZuWlc1MEtTQjdYRzRnSUNBZ0lDQjJZWElnZFhObGNrRm5aVzUwVUdGMGRHVnlibk1nUFNCYkowMVRTVVVnSnl3Z0oxUnlhV1JsYm5Rdkp5d2dKMFZrWjJVdkoxMDdYRzVjYmlBZ0lDQWdJSEpsZEhWeWJpQnVaWGNnVW1WblJYaHdLSFZ6WlhKQloyVnVkRkJoZEhSbGNtNXpMbXB2YVc0b0ozd25LU2t1ZEdWemRDaDFjMlZ5UVdkbGJuUXBPMXh1SUNBZ0lIMWNibHh1SUNBZ0lDOHFYRzRnSUNBZ0lDb2dTVVVnYUdGeklISnZkVzVrYVc1bklHSjFaeUJ5YjNWdVpHbHVaeUJrYjNkdUlHTnNhV1Z1ZEVobGFXZG9kQ0JoYm1RZ1kyeHBaVzUwVjJsa2RHZ2dZVzVrWEc0Z0lDQWdJQ29nY205MWJtUnBibWNnZFhBZ2MyTnliMnhzU0dWcFoyaDBJR0Z1WkNCelkzSnZiR3hYYVdSMGFDQmpZWFZ6YVc1bklHWmhiSE5sSUhCdmMybDBhWFpsYzF4dUlDQWdJQ0FxSUc5dUlHaGhjMU5qY205c2JHRmliR1ZUY0dGalpWeHVJQ0FnSUNBcUwxeHVJQ0FnSUhaaGNpQlNUMVZPUkVsT1IxOVVUMHhGVWtGT1EwVWdQU0JwYzAxcFkzSnZjMjltZEVKeWIzZHpaWElvZHk1dVlYWnBaMkYwYjNJdWRYTmxja0ZuWlc1MEtTQS9JREVnT2lBd08xeHVYRzRnSUNBZ0x5b3FYRzRnSUNBZ0lDb2dZMmhoYm1kbGN5QnpZM0p2Ykd3Z2NHOXphWFJwYjI0Z2FXNXphV1JsSUdGdUlHVnNaVzFsYm5SY2JpQWdJQ0FnS2lCQWJXVjBhRzlrSUhOamNtOXNiRVZzWlcxbGJuUmNiaUFnSUNBZ0tpQkFjR0Z5WVcwZ2UwNTFiV0psY24wZ2VGeHVJQ0FnSUNBcUlFQndZWEpoYlNCN1RuVnRZbVZ5ZlNCNVhHNGdJQ0FnSUNvZ1FISmxkSFZ5Ym5NZ2UzVnVaR1ZtYVc1bFpIMWNiaUFnSUNBZ0tpOWNiaUFnSUNCbWRXNWpkR2x2YmlCelkzSnZiR3hGYkdWdFpXNTBLSGdzSUhrcElIdGNiaUFnSUNBZ0lIUm9hWE11YzJOeWIyeHNUR1ZtZENBOUlIZzdYRzRnSUNBZ0lDQjBhR2x6TG5OamNtOXNiRlJ2Y0NBOUlIazdYRzRnSUNBZ2ZWeHVYRzRnSUNBZ0x5b3FYRzRnSUNBZ0lDb2djbVYwZFhKdWN5QnlaWE4xYkhRZ2IyWWdZWEJ3YkhscGJtY2daV0Z6WlNCdFlYUm9JR1oxYm1OMGFXOXVJSFJ2SUdFZ2JuVnRZbVZ5WEc0Z0lDQWdJQ29nUUcxbGRHaHZaQ0JsWVhObFhHNGdJQ0FnSUNvZ1FIQmhjbUZ0SUh0T2RXMWlaWEo5SUd0Y2JpQWdJQ0FnS2lCQWNtVjBkWEp1Y3lCN1RuVnRZbVZ5ZlZ4dUlDQWdJQ0FxTDF4dUlDQWdJR1oxYm1OMGFXOXVJR1ZoYzJVb2F5a2dlMXh1SUNBZ0lDQWdjbVYwZFhKdUlEQXVOU0FxSUNneElDMGdUV0YwYUM1amIzTW9UV0YwYUM1UVNTQXFJR3NwS1R0Y2JpQWdJQ0I5WEc1Y2JpQWdJQ0F2S2lwY2JpQWdJQ0FnS2lCcGJtUnBZMkYwWlhNZ2FXWWdZU0J6Ylc5dmRHZ2dZbVZvWVhacGIzSWdjMmh2ZFd4a0lHSmxJR0Z3Y0d4cFpXUmNiaUFnSUNBZ0tpQkFiV1YwYUc5a0lITm9iM1ZzWkVKaGFXeFBkWFJjYmlBZ0lDQWdLaUJBY0dGeVlXMGdlMDUxYldKbGNueFBZbXBsWTNSOUlHWnBjbk4wUVhKblhHNGdJQ0FnSUNvZ1FISmxkSFZ5Ym5NZ2UwSnZiMnhsWVc1OVhHNGdJQ0FnSUNvdlhHNGdJQ0FnWm5WdVkzUnBiMjRnYzJodmRXeGtRbUZwYkU5MWRDaG1hWEp6ZEVGeVp5a2dlMXh1SUNBZ0lDQWdhV1lnS0Z4dUlDQWdJQ0FnSUNCbWFYSnpkRUZ5WnlBOVBUMGdiblZzYkNCOGZGeHVJQ0FnSUNBZ0lDQjBlWEJsYjJZZ1ptbHljM1JCY21jZ0lUMDlJQ2R2WW1wbFkzUW5JSHg4WEc0Z0lDQWdJQ0FnSUdacGNuTjBRWEpuTG1KbGFHRjJhVzl5SUQwOVBTQjFibVJsWm1sdVpXUWdmSHhjYmlBZ0lDQWdJQ0FnWm1seWMzUkJjbWN1WW1Wb1lYWnBiM0lnUFQwOUlDZGhkWFJ2SnlCOGZGeHVJQ0FnSUNBZ0lDQm1hWEp6ZEVGeVp5NWlaV2hoZG1sdmNpQTlQVDBnSjJsdWMzUmhiblFuWEc0Z0lDQWdJQ0FwSUh0Y2JpQWdJQ0FnSUNBZ0x5OGdabWx5YzNRZ1lYSm5kVzFsYm5RZ2FYTWdibTkwSUdGdUlHOWlhbVZqZEM5dWRXeHNYRzRnSUNBZ0lDQWdJQzh2SUc5eUlHSmxhR0YyYVc5eUlHbHpJR0YxZEc4c0lHbHVjM1JoYm5RZ2IzSWdkVzVrWldacGJtVmtYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQjBjblZsTzF4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNCcFppQW9kSGx3Wlc5bUlHWnBjbk4wUVhKbklEMDlQU0FuYjJKcVpXTjBKeUFtSmlCbWFYSnpkRUZ5Wnk1aVpXaGhkbWx2Y2lBOVBUMGdKM050YjI5MGFDY3BJSHRjYmlBZ0lDQWdJQ0FnTHk4Z1ptbHljM1FnWVhKbmRXMWxiblFnYVhNZ1lXNGdiMkpxWldOMElHRnVaQ0JpWldoaGRtbHZjaUJwY3lCemJXOXZkR2hjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJR1poYkhObE8xeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQXZMeUIwYUhKdmR5Qmxjbkp2Y2lCM2FHVnVJR0psYUdGMmFXOXlJR2x6SUc1dmRDQnpkWEJ3YjNKMFpXUmNiaUFnSUNBZ0lIUm9jbTkzSUc1bGR5QlVlWEJsUlhKeWIzSW9YRzRnSUNBZ0lDQWdJQ2RpWldoaGRtbHZjaUJ0WlcxaVpYSWdiMllnVTJOeWIyeHNUM0IwYVc5dWN5QW5JQ3RjYmlBZ0lDQWdJQ0FnSUNCbWFYSnpkRUZ5Wnk1aVpXaGhkbWx2Y2lBclhHNGdJQ0FnSUNBZ0lDQWdKeUJwY3lCdWIzUWdZU0IyWVd4cFpDQjJZV3gxWlNCbWIzSWdaVzUxYldWeVlYUnBiMjRnVTJOeWIyeHNRbVZvWVhacGIzSXVKMXh1SUNBZ0lDQWdLVHRjYmlBZ0lDQjlYRzVjYmlBZ0lDQXZLaXBjYmlBZ0lDQWdLaUJwYm1ScFkyRjBaWE1nYVdZZ1lXNGdaV3hsYldWdWRDQm9ZWE1nYzJOeWIyeHNZV0pzWlNCemNHRmpaU0JwYmlCMGFHVWdjSEp2ZG1sa1pXUWdZWGhwYzF4dUlDQWdJQ0FxSUVCdFpYUm9iMlFnYUdGelUyTnliMnhzWVdKc1pWTndZV05sWEc0Z0lDQWdJQ29nUUhCaGNtRnRJSHRPYjJSbGZTQmxiRnh1SUNBZ0lDQXFJRUJ3WVhKaGJTQjdVM1J5YVc1bmZTQmhlR2x6WEc0Z0lDQWdJQ29nUUhKbGRIVnlibk1nZTBKdmIyeGxZVzU5WEc0Z0lDQWdJQ292WEc0Z0lDQWdablZ1WTNScGIyNGdhR0Z6VTJOeWIyeHNZV0pzWlZOd1lXTmxLR1ZzTENCaGVHbHpLU0I3WEc0Z0lDQWdJQ0JwWmlBb1lYaHBjeUE5UFQwZ0oxa25LU0I3WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJsYkM1amJHbGxiblJJWldsbmFIUWdLeUJTVDFWT1JFbE9SMTlVVDB4RlVrRk9RMFVnUENCbGJDNXpZM0p2Ykd4SVpXbG5hSFE3WEc0Z0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUdsbUlDaGhlR2x6SUQwOVBTQW5XQ2NwSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUdWc0xtTnNhV1Z1ZEZkcFpIUm9JQ3NnVWs5VlRrUkpUa2RmVkU5TVJWSkJUa05GSUR3Z1pXd3VjMk55YjJ4c1YybGtkR2c3WEc0Z0lDQWdJQ0I5WEc0Z0lDQWdmVnh1WEc0Z0lDQWdMeW9xWEc0Z0lDQWdJQ29nYVc1a2FXTmhkR1Z6SUdsbUlHRnVJR1ZzWlcxbGJuUWdhR0Z6SUdFZ2MyTnliMnhzWVdKc1pTQnZkbVZ5Wm14dmR5QndjbTl3WlhKMGVTQnBiaUIwYUdVZ1lYaHBjMXh1SUNBZ0lDQXFJRUJ0WlhSb2IyUWdZMkZ1VDNabGNtWnNiM2RjYmlBZ0lDQWdLaUJBY0dGeVlXMGdlMDV2WkdWOUlHVnNYRzRnSUNBZ0lDb2dRSEJoY21GdElIdFRkSEpwYm1kOUlHRjRhWE5jYmlBZ0lDQWdLaUJBY21WMGRYSnVjeUI3UW05dmJHVmhibjFjYmlBZ0lDQWdLaTljYmlBZ0lDQm1kVzVqZEdsdmJpQmpZVzVQZG1WeVpteHZkeWhsYkN3Z1lYaHBjeWtnZTF4dUlDQWdJQ0FnZG1GeUlHOTJaWEptYkc5M1ZtRnNkV1VnUFNCM0xtZGxkRU52YlhCMWRHVmtVM1I1YkdVb1pXd3NJRzUxYkd3cFd5ZHZkbVZ5Wm14dmR5Y2dLeUJoZUdselhUdGNibHh1SUNBZ0lDQWdjbVYwZFhKdUlHOTJaWEptYkc5M1ZtRnNkV1VnUFQwOUlDZGhkWFJ2SnlCOGZDQnZkbVZ5Wm14dmQxWmhiSFZsSUQwOVBTQW5jMk55YjJ4c0p6dGNiaUFnSUNCOVhHNWNiaUFnSUNBdktpcGNiaUFnSUNBZ0tpQnBibVJwWTJGMFpYTWdhV1lnWVc0Z1pXeGxiV1Z1ZENCallXNGdZbVVnYzJOeWIyeHNaV1FnYVc0Z1pXbDBhR1Z5SUdGNGFYTmNiaUFnSUNBZ0tpQkFiV1YwYUc5a0lHbHpVMk55YjJ4c1lXSnNaVnh1SUNBZ0lDQXFJRUJ3WVhKaGJTQjdUbTlrWlgwZ1pXeGNiaUFnSUNBZ0tpQkFjR0Z5WVcwZ2UxTjBjbWx1WjMwZ1lYaHBjMXh1SUNBZ0lDQXFJRUJ5WlhSMWNtNXpJSHRDYjI5c1pXRnVmVnh1SUNBZ0lDQXFMMXh1SUNBZ0lHWjFibU4wYVc5dUlHbHpVMk55YjJ4c1lXSnNaU2hsYkNrZ2UxeHVJQ0FnSUNBZ2RtRnlJR2x6VTJOeWIyeHNZV0pzWlZrZ1BTQm9ZWE5UWTNKdmJHeGhZbXhsVTNCaFkyVW9aV3dzSUNkWkp5a2dKaVlnWTJGdVQzWmxjbVpzYjNjb1pXd3NJQ2RaSnlrN1hHNGdJQ0FnSUNCMllYSWdhWE5UWTNKdmJHeGhZbXhsV0NBOUlHaGhjMU5qY205c2JHRmliR1ZUY0dGalpTaGxiQ3dnSjFnbktTQW1KaUJqWVc1UGRtVnlabXh2ZHlobGJDd2dKMWduS1R0Y2JseHVJQ0FnSUNBZ2NtVjBkWEp1SUdselUyTnliMnhzWVdKc1pWa2dmSHdnYVhOVFkzSnZiR3hoWW14bFdEdGNiaUFnSUNCOVhHNWNiaUFnSUNBdktpcGNiaUFnSUNBZ0tpQm1hVzVrY3lCelkzSnZiR3hoWW14bElIQmhjbVZ1ZENCdlppQmhiaUJsYkdWdFpXNTBYRzRnSUNBZ0lDb2dRRzFsZEdodlpDQm1hVzVrVTJOeWIyeHNZV0pzWlZCaGNtVnVkRnh1SUNBZ0lDQXFJRUJ3WVhKaGJTQjdUbTlrWlgwZ1pXeGNiaUFnSUNBZ0tpQkFjbVYwZFhKdWN5QjdUbTlrWlgwZ1pXeGNiaUFnSUNBZ0tpOWNiaUFnSUNCbWRXNWpkR2x2YmlCbWFXNWtVMk55YjJ4c1lXSnNaVkJoY21WdWRDaGxiQ2tnZTF4dUlDQWdJQ0FnZG1GeUlHbHpRbTlrZVR0Y2JseHVJQ0FnSUNBZ1pHOGdlMXh1SUNBZ0lDQWdJQ0JsYkNBOUlHVnNMbkJoY21WdWRFNXZaR1U3WEc1Y2JpQWdJQ0FnSUNBZ2FYTkNiMlI1SUQwZ1pXd2dQVDA5SUdRdVltOWtlVHRjYmlBZ0lDQWdJSDBnZDJocGJHVWdLR2x6UW05a2VTQTlQVDBnWm1Gc2MyVWdKaVlnYVhOVFkzSnZiR3hoWW14bEtHVnNLU0E5UFQwZ1ptRnNjMlVwTzF4dVhHNGdJQ0FnSUNCcGMwSnZaSGtnUFNCdWRXeHNPMXh1WEc0Z0lDQWdJQ0J5WlhSMWNtNGdaV3c3WEc0Z0lDQWdmVnh1WEc0Z0lDQWdMeW9xWEc0Z0lDQWdJQ29nYzJWc1ppQnBiblp2YTJWa0lHWjFibU4wYVc5dUlIUm9ZWFFzSUdkcGRtVnVJR0VnWTI5dWRHVjRkQ3dnYzNSbGNITWdkR2h5YjNWbmFDQnpZM0p2Ykd4cGJtZGNiaUFnSUNBZ0tpQkFiV1YwYUc5a0lITjBaWEJjYmlBZ0lDQWdLaUJBY0dGeVlXMGdlMDlpYW1WamRIMGdZMjl1ZEdWNGRGeHVJQ0FnSUNBcUlFQnlaWFIxY201eklIdDFibVJsWm1sdVpXUjlYRzRnSUNBZ0lDb3ZYRzRnSUNBZ1puVnVZM1JwYjI0Z2MzUmxjQ2hqYjI1MFpYaDBLU0I3WEc0Z0lDQWdJQ0IyWVhJZ2RHbHRaU0E5SUc1dmR5Z3BPMXh1SUNBZ0lDQWdkbUZ5SUhaaGJIVmxPMXh1SUNBZ0lDQWdkbUZ5SUdOMWNuSmxiblJZTzF4dUlDQWdJQ0FnZG1GeUlHTjFjbkpsYm5SWk8xeHVJQ0FnSUNBZ2RtRnlJR1ZzWVhCelpXUWdQU0FvZEdsdFpTQXRJR052Ym5SbGVIUXVjM1JoY25SVWFXMWxLU0F2SUZORFVrOU1URjlVU1UxRk8xeHVYRzRnSUNBZ0lDQXZMeUJoZG05cFpDQmxiR0Z3YzJWa0lIUnBiV1Z6SUdocFoyaGxjaUIwYUdGdUlHOXVaVnh1SUNBZ0lDQWdaV3hoY0hObFpDQTlJR1ZzWVhCelpXUWdQaUF4SUQ4Z01TQTZJR1ZzWVhCelpXUTdYRzVjYmlBZ0lDQWdJQzh2SUdGd2NHeDVJR1ZoYzJsdVp5QjBieUJsYkdGd2MyVmtJSFJwYldWY2JpQWdJQ0FnSUhaaGJIVmxJRDBnWldGelpTaGxiR0Z3YzJWa0tUdGNibHh1SUNBZ0lDQWdZM1Z5Y21WdWRGZ2dQU0JqYjI1MFpYaDBMbk4wWVhKMFdDQXJJQ2hqYjI1MFpYaDBMbmdnTFNCamIyNTBaWGgwTG5OMFlYSjBXQ2tnS2lCMllXeDFaVHRjYmlBZ0lDQWdJR04xY25KbGJuUlpJRDBnWTI5dWRHVjRkQzV6ZEdGeWRGa2dLeUFvWTI5dWRHVjRkQzU1SUMwZ1kyOXVkR1Y0ZEM1emRHRnlkRmtwSUNvZ2RtRnNkV1U3WEc1Y2JpQWdJQ0FnSUdOdmJuUmxlSFF1YldWMGFHOWtMbU5oYkd3b1kyOXVkR1Y0ZEM1elkzSnZiR3hoWW14bExDQmpkWEp5Wlc1MFdDd2dZM1Z5Y21WdWRGa3BPMXh1WEc0Z0lDQWdJQ0F2THlCelkzSnZiR3dnYlc5eVpTQnBaaUIzWlNCb1lYWmxJRzV2ZENCeVpXRmphR1ZrSUc5MWNpQmtaWE4wYVc1aGRHbHZibHh1SUNBZ0lDQWdhV1lnS0dOMWNuSmxiblJZSUNFOVBTQmpiMjUwWlhoMExuZ2dmSHdnWTNWeWNtVnVkRmtnSVQwOUlHTnZiblJsZUhRdWVTa2dlMXh1SUNBZ0lDQWdJQ0IzTG5KbGNYVmxjM1JCYm1sdFlYUnBiMjVHY21GdFpTaHpkR1Z3TG1KcGJtUW9keXdnWTI5dWRHVjRkQ2twTzF4dUlDQWdJQ0FnZlZ4dUlDQWdJSDFjYmx4dUlDQWdJQzhxS2x4dUlDQWdJQ0FxSUhOamNtOXNiSE1nZDJsdVpHOTNJRzl5SUdWc1pXMWxiblFnZDJsMGFDQmhJSE50YjI5MGFDQmlaV2hoZG1sdmNseHVJQ0FnSUNBcUlFQnRaWFJvYjJRZ2MyMXZiM1JvVTJOeWIyeHNYRzRnSUNBZ0lDb2dRSEJoY21GdElIdFBZbXBsWTNSOFRtOWtaWDBnWld4Y2JpQWdJQ0FnS2lCQWNHRnlZVzBnZTA1MWJXSmxjbjBnZUZ4dUlDQWdJQ0FxSUVCd1lYSmhiU0I3VG5WdFltVnlmU0I1WEc0Z0lDQWdJQ29nUUhKbGRIVnlibk1nZTNWdVpHVm1hVzVsWkgxY2JpQWdJQ0FnS2k5Y2JpQWdJQ0JtZFc1amRHbHZiaUJ6Ylc5dmRHaFRZM0p2Ykd3b1pXd3NJSGdzSUhrcElIdGNiaUFnSUNBZ0lIWmhjaUJ6WTNKdmJHeGhZbXhsTzF4dUlDQWdJQ0FnZG1GeUlITjBZWEowV0R0Y2JpQWdJQ0FnSUhaaGNpQnpkR0Z5ZEZrN1hHNGdJQ0FnSUNCMllYSWdiV1YwYUc5a08xeHVJQ0FnSUNBZ2RtRnlJSE4wWVhKMFZHbHRaU0E5SUc1dmR5Z3BPMXh1WEc0Z0lDQWdJQ0F2THlCa1pXWnBibVVnYzJOeWIyeHNJR052Ym5SbGVIUmNiaUFnSUNBZ0lHbG1JQ2hsYkNBOVBUMGdaQzVpYjJSNUtTQjdYRzRnSUNBZ0lDQWdJSE5qY205c2JHRmliR1VnUFNCM08xeHVJQ0FnSUNBZ0lDQnpkR0Z5ZEZnZ1BTQjNMbk5qY205c2JGZ2dmSHdnZHk1d1lXZGxXRTltWm5ObGREdGNiaUFnSUNBZ0lDQWdjM1JoY25SWklEMGdkeTV6WTNKdmJHeFpJSHg4SUhjdWNHRm5aVmxQWm1aelpYUTdYRzRnSUNBZ0lDQWdJRzFsZEdodlpDQTlJRzl5YVdkcGJtRnNMbk5qY205c2JEdGNiaUFnSUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNBZ0lITmpjbTlzYkdGaWJHVWdQU0JsYkR0Y2JpQWdJQ0FnSUNBZ2MzUmhjblJZSUQwZ1pXd3VjMk55YjJ4c1RHVm1kRHRjYmlBZ0lDQWdJQ0FnYzNSaGNuUlpJRDBnWld3dWMyTnliMnhzVkc5d08xeHVJQ0FnSUNBZ0lDQnRaWFJvYjJRZ1BTQnpZM0p2Ykd4RmJHVnRaVzUwTzF4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNBdkx5QnpZM0p2Ykd3Z2JHOXZjR2x1WnlCdmRtVnlJR0VnWm5KaGJXVmNiaUFnSUNBZ0lITjBaWEFvZTF4dUlDQWdJQ0FnSUNCelkzSnZiR3hoWW14bE9pQnpZM0p2Ykd4aFlteGxMRnh1SUNBZ0lDQWdJQ0J0WlhSb2IyUTZJRzFsZEdodlpDeGNiaUFnSUNBZ0lDQWdjM1JoY25SVWFXMWxPaUJ6ZEdGeWRGUnBiV1VzWEc0Z0lDQWdJQ0FnSUhOMFlYSjBXRG9nYzNSaGNuUllMRnh1SUNBZ0lDQWdJQ0J6ZEdGeWRGazZJSE4wWVhKMFdTeGNiaUFnSUNBZ0lDQWdlRG9nZUN4Y2JpQWdJQ0FnSUNBZ2VUb2dlVnh1SUNBZ0lDQWdmU2s3WEc0Z0lDQWdmVnh1WEc0Z0lDQWdMeThnVDFKSlIwbE9RVXdnVFVWVVNFOUVVeUJQVmtWU1VrbEVSVk5jYmlBZ0lDQXZMeUIzTG5OamNtOXNiQ0JoYm1RZ2R5NXpZM0p2Ykd4VWIxeHVJQ0FnSUhjdWMyTnliMnhzSUQwZ2R5NXpZM0p2Ykd4VWJ5QTlJR1oxYm1OMGFXOXVLQ2tnZTF4dUlDQWdJQ0FnTHk4Z1lYWnZhV1FnWVdOMGFXOXVJSGRvWlc0Z2JtOGdZWEpuZFcxbGJuUnpJR0Z5WlNCd1lYTnpaV1JjYmlBZ0lDQWdJR2xtSUNoaGNtZDFiV1Z1ZEhOYk1GMGdQVDA5SUhWdVpHVm1hVzVsWkNrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200N1hHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lDOHZJR0YyYjJsa0lITnRiMjkwYUNCaVpXaGhkbWx2Y2lCcFppQnViM1FnY21WeGRXbHlaV1JjYmlBZ0lDQWdJR2xtSUNoemFHOTFiR1JDWVdsc1QzVjBLR0Z5WjNWdFpXNTBjMXN3WFNrZ1BUMDlJSFJ5ZFdVcElIdGNiaUFnSUNBZ0lDQWdiM0pwWjJsdVlXd3VjMk55YjJ4c0xtTmhiR3dvWEc0Z0lDQWdJQ0FnSUNBZ2R5eGNiaUFnSUNBZ0lDQWdJQ0JoY21kMWJXVnVkSE5iTUYwdWJHVm1kQ0FoUFQwZ2RXNWtaV1pwYm1Wa1hHNGdJQ0FnSUNBZ0lDQWdJQ0EvSUdGeVozVnRaVzUwYzFzd1hTNXNaV1owWEc0Z0lDQWdJQ0FnSUNBZ0lDQTZJSFI1Y0dWdlppQmhjbWQxYldWdWRITmJNRjBnSVQwOUlDZHZZbXBsWTNRblhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUQ4Z1lYSm5kVzFsYm5Seld6QmRYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lEb2dkeTV6WTNKdmJHeFlJSHg4SUhjdWNHRm5aVmhQWm1aelpYUXNYRzRnSUNBZ0lDQWdJQ0FnTHk4Z2RYTmxJSFJ2Y0NCd2NtOXdMQ0J6WldOdmJtUWdZWEpuZFcxbGJuUWdhV1lnY0hKbGMyVnVkQ0J2Y2lCbVlXeHNZbUZqYXlCMGJ5QnpZM0p2Ykd4WlhHNGdJQ0FnSUNBZ0lDQWdZWEpuZFcxbGJuUnpXekJkTG5SdmNDQWhQVDBnZFc1a1pXWnBibVZrWEc0Z0lDQWdJQ0FnSUNBZ0lDQS9JR0Z5WjNWdFpXNTBjMXN3WFM1MGIzQmNiaUFnSUNBZ0lDQWdJQ0FnSURvZ1lYSm5kVzFsYm5Seld6RmRJQ0U5UFNCMWJtUmxabWx1WldSY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnUHlCaGNtZDFiV1Z1ZEhOYk1WMWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ09pQjNMbk5qY205c2JGa2dmSHdnZHk1d1lXZGxXVTltWm5ObGRGeHVJQ0FnSUNBZ0lDQXBPMXh1WEc0Z0lDQWdJQ0FnSUhKbGRIVnlianRjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnTHk4Z1RFVlVJRlJJUlNCVFRVOVBWRWhPUlZOVElFSkZSMGxPSVZ4dUlDQWdJQ0FnYzIxdmIzUm9VMk55YjJ4c0xtTmhiR3dvWEc0Z0lDQWdJQ0FnSUhjc1hHNGdJQ0FnSUNBZ0lHUXVZbTlrZVN4Y2JpQWdJQ0FnSUNBZ1lYSm5kVzFsYm5Seld6QmRMbXhsWm5RZ0lUMDlJSFZ1WkdWbWFXNWxaRnh1SUNBZ0lDQWdJQ0FnSUQ4Z2ZuNWhjbWQxYldWdWRITmJNRjB1YkdWbWRGeHVJQ0FnSUNBZ0lDQWdJRG9nZHk1elkzSnZiR3hZSUh4OElIY3VjR0ZuWlZoUFptWnpaWFFzWEc0Z0lDQWdJQ0FnSUdGeVozVnRaVzUwYzFzd1hTNTBiM0FnSVQwOUlIVnVaR1ZtYVc1bFpGeHVJQ0FnSUNBZ0lDQWdJRDhnZm41aGNtZDFiV1Z1ZEhOYk1GMHVkRzl3WEc0Z0lDQWdJQ0FnSUNBZ09pQjNMbk5qY205c2JGa2dmSHdnZHk1d1lXZGxXVTltWm5ObGRGeHVJQ0FnSUNBZ0tUdGNiaUFnSUNCOU8xeHVYRzRnSUNBZ0x5OGdkeTV6WTNKdmJHeENlVnh1SUNBZ0lIY3VjMk55YjJ4c1Fua2dQU0JtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0FnSUM4dklHRjJiMmxrSUdGamRHbHZiaUIzYUdWdUlHNXZJR0Z5WjNWdFpXNTBjeUJoY21VZ2NHRnpjMlZrWEc0Z0lDQWdJQ0JwWmlBb1lYSm5kVzFsYm5Seld6QmRJRDA5UFNCMWJtUmxabWx1WldRcElIdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdU8xeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQXZMeUJoZG05cFpDQnpiVzl2ZEdnZ1ltVm9ZWFpwYjNJZ2FXWWdibTkwSUhKbGNYVnBjbVZrWEc0Z0lDQWdJQ0JwWmlBb2MyaHZkV3hrUW1GcGJFOTFkQ2hoY21kMWJXVnVkSE5iTUYwcEtTQjdYRzRnSUNBZ0lDQWdJRzl5YVdkcGJtRnNMbk5qY205c2JFSjVMbU5oYkd3b1hHNGdJQ0FnSUNBZ0lDQWdkeXhjYmlBZ0lDQWdJQ0FnSUNCaGNtZDFiV1Z1ZEhOYk1GMHViR1ZtZENBaFBUMGdkVzVrWldacGJtVmtYRzRnSUNBZ0lDQWdJQ0FnSUNBL0lHRnlaM1Z0Wlc1MGMxc3dYUzVzWldaMFhHNGdJQ0FnSUNBZ0lDQWdJQ0E2SUhSNWNHVnZaaUJoY21kMWJXVnVkSE5iTUYwZ0lUMDlJQ2R2WW1wbFkzUW5JRDhnWVhKbmRXMWxiblJ6V3pCZElEb2dNQ3hjYmlBZ0lDQWdJQ0FnSUNCaGNtZDFiV1Z1ZEhOYk1GMHVkRzl3SUNFOVBTQjFibVJsWm1sdVpXUmNiaUFnSUNBZ0lDQWdJQ0FnSUQ4Z1lYSm5kVzFsYm5Seld6QmRMblJ2Y0Z4dUlDQWdJQ0FnSUNBZ0lDQWdPaUJoY21kMWJXVnVkSE5iTVYwZ0lUMDlJSFZ1WkdWbWFXNWxaQ0EvSUdGeVozVnRaVzUwYzFzeFhTQTZJREJjYmlBZ0lDQWdJQ0FnS1R0Y2JseHVJQ0FnSUNBZ0lDQnlaWFIxY200N1hHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lDOHZJRXhGVkNCVVNFVWdVMDFQVDFSSVRrVlRVeUJDUlVkSlRpRmNiaUFnSUNBZ0lITnRiMjkwYUZOamNtOXNiQzVqWVd4c0tGeHVJQ0FnSUNBZ0lDQjNMRnh1SUNBZ0lDQWdJQ0JrTG1KdlpIa3NYRzRnSUNBZ0lDQWdJSDUrWVhKbmRXMWxiblJ6V3pCZExteGxablFnS3lBb2R5NXpZM0p2Ykd4WUlIeDhJSGN1Y0dGblpWaFBabVp6WlhRcExGeHVJQ0FnSUNBZ0lDQitmbUZ5WjNWdFpXNTBjMXN3WFM1MGIzQWdLeUFvZHk1elkzSnZiR3haSUh4OElIY3VjR0ZuWlZsUFptWnpaWFFwWEc0Z0lDQWdJQ0FwTzF4dUlDQWdJSDA3WEc1Y2JpQWdJQ0F2THlCRmJHVnRaVzUwTG5CeWIzUnZkSGx3WlM1elkzSnZiR3dnWVc1a0lFVnNaVzFsYm5RdWNISnZkRzkwZVhCbExuTmpjbTlzYkZSdlhHNGdJQ0FnUld4bGJXVnVkQzV3Y205MGIzUjVjR1V1YzJOeWIyeHNJRDBnUld4bGJXVnVkQzV3Y205MGIzUjVjR1V1YzJOeWIyeHNWRzhnUFNCbWRXNWpkR2x2YmlncElIdGNiaUFnSUNBZ0lDOHZJR0YyYjJsa0lHRmpkR2x2YmlCM2FHVnVJRzV2SUdGeVozVnRaVzUwY3lCaGNtVWdjR0Z6YzJWa1hHNGdJQ0FnSUNCcFppQW9ZWEpuZFcxbGJuUnpXekJkSUQwOVBTQjFibVJsWm1sdVpXUXBJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVPMXh1SUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0F2THlCaGRtOXBaQ0J6Ylc5dmRHZ2dZbVZvWVhacGIzSWdhV1lnYm05MElISmxjWFZwY21Wa1hHNGdJQ0FnSUNCcFppQW9jMmh2ZFd4a1FtRnBiRTkxZENoaGNtZDFiV1Z1ZEhOYk1GMHBJRDA5UFNCMGNuVmxLU0I3WEc0Z0lDQWdJQ0FnSUM4dklHbG1JRzl1WlNCdWRXMWlaWElnYVhNZ2NHRnpjMlZrTENCMGFISnZkeUJsY25KdmNpQjBieUJ0WVhSamFDQkdhWEpsWm05NElHbHRjR3hsYldWdWRHRjBhVzl1WEc0Z0lDQWdJQ0FnSUdsbUlDaDBlWEJsYjJZZ1lYSm5kVzFsYm5Seld6QmRJRDA5UFNBbmJuVnRZbVZ5SnlBbUppQmhjbWQxYldWdWRITmJNVjBnUFQwOUlIVnVaR1ZtYVc1bFpDa2dlMXh1SUNBZ0lDQWdJQ0FnSUhSb2NtOTNJRzVsZHlCVGVXNTBZWGhGY25KdmNpZ25WbUZzZFdVZ1kyOTFiR1FnYm05MElHSmxJR052Ym5abGNuUmxaQ2NwTzF4dUlDQWdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lDQWdiM0pwWjJsdVlXd3VaV3hsYldWdWRGTmpjbTlzYkM1allXeHNLRnh1SUNBZ0lDQWdJQ0FnSUhSb2FYTXNYRzRnSUNBZ0lDQWdJQ0FnTHk4Z2RYTmxJR3hsWm5RZ2NISnZjQ3dnWm1seWMzUWdiblZ0WW1WeUlHRnlaM1Z0Wlc1MElHOXlJR1poYkd4aVlXTnJJSFJ2SUhOamNtOXNiRXhsWm5SY2JpQWdJQ0FnSUNBZ0lDQmhjbWQxYldWdWRITmJNRjB1YkdWbWRDQWhQVDBnZFc1a1pXWnBibVZrWEc0Z0lDQWdJQ0FnSUNBZ0lDQS9JSDUrWVhKbmRXMWxiblJ6V3pCZExteGxablJjYmlBZ0lDQWdJQ0FnSUNBZ0lEb2dkSGx3Wlc5bUlHRnlaM1Z0Wlc1MGMxc3dYU0FoUFQwZ0oyOWlhbVZqZENjZ1B5QitmbUZ5WjNWdFpXNTBjMXN3WFNBNklIUm9hWE11YzJOeWIyeHNUR1ZtZEN4Y2JpQWdJQ0FnSUNBZ0lDQXZMeUIxYzJVZ2RHOXdJSEJ5YjNBc0lITmxZMjl1WkNCaGNtZDFiV1Z1ZENCdmNpQm1ZV3hzWW1GamF5QjBieUJ6WTNKdmJHeFViM0JjYmlBZ0lDQWdJQ0FnSUNCaGNtZDFiV1Z1ZEhOYk1GMHVkRzl3SUNFOVBTQjFibVJsWm1sdVpXUmNiaUFnSUNBZ0lDQWdJQ0FnSUQ4Z2ZuNWhjbWQxYldWdWRITmJNRjB1ZEc5d1hHNGdJQ0FnSUNBZ0lDQWdJQ0E2SUdGeVozVnRaVzUwYzFzeFhTQWhQVDBnZFc1a1pXWnBibVZrSUQ4Z2ZuNWhjbWQxYldWdWRITmJNVjBnT2lCMGFHbHpMbk5qY205c2JGUnZjRnh1SUNBZ0lDQWdJQ0FwTzF4dVhHNGdJQ0FnSUNBZ0lISmxkSFZ5Ymp0Y2JpQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ2RtRnlJR3hsWm5RZ1BTQmhjbWQxYldWdWRITmJNRjB1YkdWbWREdGNiaUFnSUNBZ0lIWmhjaUIwYjNBZ1BTQmhjbWQxYldWdWRITmJNRjB1ZEc5d08xeHVYRzRnSUNBZ0lDQXZMeUJNUlZRZ1ZFaEZJRk5OVDA5VVNFNUZVMU1nUWtWSFNVNGhYRzRnSUNBZ0lDQnpiVzl2ZEdoVFkzSnZiR3d1WTJGc2JDaGNiaUFnSUNBZ0lDQWdkR2hwY3l4Y2JpQWdJQ0FnSUNBZ2RHaHBjeXhjYmlBZ0lDQWdJQ0FnZEhsd1pXOW1JR3hsWm5RZ1BUMDlJQ2QxYm1SbFptbHVaV1FuSUQ4Z2RHaHBjeTV6WTNKdmJHeE1aV1owSURvZ2ZuNXNaV1owTEZ4dUlDQWdJQ0FnSUNCMGVYQmxiMllnZEc5d0lEMDlQU0FuZFc1a1pXWnBibVZrSnlBL0lIUm9hWE11YzJOeWIyeHNWRzl3SURvZ2ZuNTBiM0JjYmlBZ0lDQWdJQ2s3WEc0Z0lDQWdmVHRjYmx4dUlDQWdJQzh2SUVWc1pXMWxiblF1Y0hKdmRHOTBlWEJsTG5OamNtOXNiRUo1WEc0Z0lDQWdSV3hsYldWdWRDNXdjbTkwYjNSNWNHVXVjMk55YjJ4c1Fua2dQU0JtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0FnSUM4dklHRjJiMmxrSUdGamRHbHZiaUIzYUdWdUlHNXZJR0Z5WjNWdFpXNTBjeUJoY21VZ2NHRnpjMlZrWEc0Z0lDQWdJQ0JwWmlBb1lYSm5kVzFsYm5Seld6QmRJRDA5UFNCMWJtUmxabWx1WldRcElIdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdU8xeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQXZMeUJoZG05cFpDQnpiVzl2ZEdnZ1ltVm9ZWFpwYjNJZ2FXWWdibTkwSUhKbGNYVnBjbVZrWEc0Z0lDQWdJQ0JwWmlBb2MyaHZkV3hrUW1GcGJFOTFkQ2hoY21kMWJXVnVkSE5iTUYwcElEMDlQU0IwY25WbEtTQjdYRzRnSUNBZ0lDQWdJRzl5YVdkcGJtRnNMbVZzWlcxbGJuUlRZM0p2Ykd3dVkyRnNiQ2hjYmlBZ0lDQWdJQ0FnSUNCMGFHbHpMRnh1SUNBZ0lDQWdJQ0FnSUdGeVozVnRaVzUwYzFzd1hTNXNaV1owSUNFOVBTQjFibVJsWm1sdVpXUmNiaUFnSUNBZ0lDQWdJQ0FnSUQ4Z2ZuNWhjbWQxYldWdWRITmJNRjB1YkdWbWRDQXJJSFJvYVhNdWMyTnliMnhzVEdWbWRGeHVJQ0FnSUNBZ0lDQWdJQ0FnT2lCK2ZtRnlaM1Z0Wlc1MGMxc3dYU0FySUhSb2FYTXVjMk55YjJ4c1RHVm1kQ3hjYmlBZ0lDQWdJQ0FnSUNCaGNtZDFiV1Z1ZEhOYk1GMHVkRzl3SUNFOVBTQjFibVJsWm1sdVpXUmNiaUFnSUNBZ0lDQWdJQ0FnSUQ4Z2ZuNWhjbWQxYldWdWRITmJNRjB1ZEc5d0lDc2dkR2hwY3k1elkzSnZiR3hVYjNCY2JpQWdJQ0FnSUNBZ0lDQWdJRG9nZm41aGNtZDFiV1Z1ZEhOYk1WMGdLeUIwYUdsekxuTmpjbTlzYkZSdmNGeHVJQ0FnSUNBZ0lDQXBPMXh1WEc0Z0lDQWdJQ0FnSUhKbGRIVnlianRjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnZEdocGN5NXpZM0p2Ykd3b2UxeHVJQ0FnSUNBZ0lDQnNaV1owT2lCK2ZtRnlaM1Z0Wlc1MGMxc3dYUzVzWldaMElDc2dkR2hwY3k1elkzSnZiR3hNWldaMExGeHVJQ0FnSUNBZ0lDQjBiM0E2SUg1K1lYSm5kVzFsYm5Seld6QmRMblJ2Y0NBcklIUm9hWE11YzJOeWIyeHNWRzl3TEZ4dUlDQWdJQ0FnSUNCaVpXaGhkbWx2Y2pvZ1lYSm5kVzFsYm5Seld6QmRMbUpsYUdGMmFXOXlYRzRnSUNBZ0lDQjlLVHRjYmlBZ0lDQjlPMXh1WEc0Z0lDQWdMeThnUld4bGJXVnVkQzV3Y205MGIzUjVjR1V1YzJOeWIyeHNTVzUwYjFacFpYZGNiaUFnSUNCRmJHVnRaVzUwTG5CeWIzUnZkSGx3WlM1elkzSnZiR3hKYm5SdlZtbGxkeUE5SUdaMWJtTjBhVzl1S0NrZ2UxeHVJQ0FnSUNBZ0x5OGdZWFp2YVdRZ2MyMXZiM1JvSUdKbGFHRjJhVzl5SUdsbUlHNXZkQ0J5WlhGMWFYSmxaRnh1SUNBZ0lDQWdhV1lnS0hOb2IzVnNaRUpoYVd4UGRYUW9ZWEpuZFcxbGJuUnpXekJkS1NBOVBUMGdkSEoxWlNrZ2UxeHVJQ0FnSUNBZ0lDQnZjbWxuYVc1aGJDNXpZM0p2Ykd4SmJuUnZWbWxsZHk1allXeHNLRnh1SUNBZ0lDQWdJQ0FnSUhSb2FYTXNYRzRnSUNBZ0lDQWdJQ0FnWVhKbmRXMWxiblJ6V3pCZElEMDlQU0IxYm1SbFptbHVaV1FnUHlCMGNuVmxJRG9nWVhKbmRXMWxiblJ6V3pCZFhHNGdJQ0FnSUNBZ0lDazdYRzVjYmlBZ0lDQWdJQ0FnY21WMGRYSnVPMXh1SUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0F2THlCTVJWUWdWRWhGSUZOTlQwOVVTRTVGVTFNZ1FrVkhTVTRoWEc0Z0lDQWdJQ0IyWVhJZ2MyTnliMnhzWVdKc1pWQmhjbVZ1ZENBOUlHWnBibVJUWTNKdmJHeGhZbXhsVUdGeVpXNTBLSFJvYVhNcE8xeHVJQ0FnSUNBZ2RtRnlJSEJoY21WdWRGSmxZM1J6SUQwZ2MyTnliMnhzWVdKc1pWQmhjbVZ1ZEM1blpYUkNiM1Z1WkdsdVowTnNhV1Z1ZEZKbFkzUW9LVHRjYmlBZ0lDQWdJSFpoY2lCamJHbGxiblJTWldOMGN5QTlJSFJvYVhNdVoyVjBRbTkxYm1ScGJtZERiR2xsYm5SU1pXTjBLQ2s3WEc1Y2JpQWdJQ0FnSUdsbUlDaHpZM0p2Ykd4aFlteGxVR0Z5Wlc1MElDRTlQU0JrTG1KdlpIa3BJSHRjYmlBZ0lDQWdJQ0FnTHk4Z2NtVjJaV0ZzSUdWc1pXMWxiblFnYVc1emFXUmxJSEJoY21WdWRGeHVJQ0FnSUNBZ0lDQnpiVzl2ZEdoVFkzSnZiR3d1WTJGc2JDaGNiaUFnSUNBZ0lDQWdJQ0IwYUdsekxGeHVJQ0FnSUNBZ0lDQWdJSE5qY205c2JHRmliR1ZRWVhKbGJuUXNYRzRnSUNBZ0lDQWdJQ0FnYzJOeWIyeHNZV0pzWlZCaGNtVnVkQzV6WTNKdmJHeE1aV1owSUNzZ1kyeHBaVzUwVW1WamRITXViR1ZtZENBdElIQmhjbVZ1ZEZKbFkzUnpMbXhsWm5Rc1hHNGdJQ0FnSUNBZ0lDQWdjMk55YjJ4c1lXSnNaVkJoY21WdWRDNXpZM0p2Ykd4VWIzQWdLeUJqYkdsbGJuUlNaV04wY3k1MGIzQWdMU0J3WVhKbGJuUlNaV04wY3k1MGIzQmNiaUFnSUNBZ0lDQWdLVHRjYmx4dUlDQWdJQ0FnSUNBdkx5QnlaWFpsWVd3Z2NHRnlaVzUwSUdsdUlIWnBaWGR3YjNKMElIVnViR1Z6Y3lCcGN5Qm1hWGhsWkZ4dUlDQWdJQ0FnSUNCcFppQW9keTVuWlhSRGIyMXdkWFJsWkZOMGVXeGxLSE5qY205c2JHRmliR1ZRWVhKbGJuUXBMbkJ2YzJsMGFXOXVJQ0U5UFNBblptbDRaV1FuS1NCN1hHNGdJQ0FnSUNBZ0lDQWdkeTV6WTNKdmJHeENlU2g3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnNaV1owT2lCd1lYSmxiblJTWldOMGN5NXNaV1owTEZ4dUlDQWdJQ0FnSUNBZ0lDQWdkRzl3T2lCd1lYSmxiblJTWldOMGN5NTBiM0FzWEc0Z0lDQWdJQ0FnSUNBZ0lDQmlaV2hoZG1sdmNqb2dKM050YjI5MGFDZGNiaUFnSUNBZ0lDQWdJQ0I5S1R0Y2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ0x5OGdjbVYyWldGc0lHVnNaVzFsYm5RZ2FXNGdkbWxsZDNCdmNuUmNiaUFnSUNBZ0lDQWdkeTV6WTNKdmJHeENlU2g3WEc0Z0lDQWdJQ0FnSUNBZ2JHVm1kRG9nWTJ4cFpXNTBVbVZqZEhNdWJHVm1kQ3hjYmlBZ0lDQWdJQ0FnSUNCMGIzQTZJR05zYVdWdWRGSmxZM1J6TG5SdmNDeGNiaUFnSUNBZ0lDQWdJQ0JpWldoaGRtbHZjam9nSjNOdGIyOTBhQ2RjYmlBZ0lDQWdJQ0FnZlNrN1hHNGdJQ0FnSUNCOVhHNGdJQ0FnZlR0Y2JpQWdmVnh1WEc0Z0lHbG1JQ2gwZVhCbGIyWWdaWGh3YjNKMGN5QTlQVDBnSjI5aWFtVmpkQ2NnSmlZZ2RIbHdaVzltSUcxdlpIVnNaU0FoUFQwZ0ozVnVaR1ZtYVc1bFpDY3BJSHRjYmlBZ0lDQXZMeUJqYjIxdGIyNXFjMXh1SUNBZ0lHMXZaSFZzWlM1bGVIQnZjblJ6SUQwZ2V5QndiMng1Wm1sc2JEb2djRzlzZVdacGJHd2dmVHRjYmlBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0F2THlCbmJHOWlZV3hjYmlBZ0lDQndiMng1Wm1sc2JDZ3BPMXh1SUNCOVhHNWNibjBvS1NrN1hHNGlMQ0pqYjI1emRDQkVRaUE5SUNkb2RIUndjem92TDI1bGVIVnpMV05oZEdGc2IyY3VabWx5WldKaGMyVnBieTVqYjIwdmNHOXpkSE11YW5OdmJqOWhkWFJvUFRkbk4zQjVTMHQ1YTA0elRqVmxkM0pKYldoUFlWTTJkbmR5Um5Oak5XWkxhM0pyT0dWcWVtWW5PMXh1WEc1amIyNXpkQ0FrYkc5aFpHbHVaeUE5SUVGeWNtRjVMbVp5YjIwb1pHOWpkVzFsYm5RdWNYVmxjbmxUWld4bFkzUnZja0ZzYkNnbkxteHZZV1JwYm1jbktTazdYRzVqYjI1emRDQWtibUYySUQwZ1pHOWpkVzFsYm5RdVoyVjBSV3hsYldWdWRFSjVTV1FvSjJwekxXNWhkaWNwTzF4dVkyOXVjM1FnSkhCaGNtRnNiR0Y0SUQwZ1pHOWpkVzFsYm5RdWNYVmxjbmxUWld4bFkzUnZjaWduTG5CaGNtRnNiR0Y0SnlrN1hHNWpiMjV6ZENBa1kyOXVkR1Z1ZENBOUlHUnZZM1Z0Wlc1MExuRjFaWEo1VTJWc1pXTjBiM0lvSnk1amIyNTBaVzUwSnlrN1hHNWpiMjV6ZENBa2RHbDBiR1VnUFNCa2IyTjFiV1Z1ZEM1blpYUkZiR1Z0Wlc1MFFubEpaQ2duYW5NdGRHbDBiR1VuS1R0Y2JtTnZibk4wSUNSMWNFRnljbTkzSUQwZ1pHOWpkVzFsYm5RdVoyVjBSV3hsYldWdWRFSjVTV1FvSjJwekxXRnljbTkzSnlrN1hHNWpiMjV6ZENBa2JXOWtZV3dnUFNCa2IyTjFiV1Z1ZEM1eGRXVnllVk5sYkdWamRHOXlLQ2N1Ylc5a1lXd25LVHRjYm1OdmJuTjBJQ1JzYVdkb2RHSnZlQ0E5SUdSdlkzVnRaVzUwTG5GMVpYSjVVMlZzWldOMGIzSW9KeTVzYVdkb2RHSnZlQ2NwTzF4dVkyOXVjM1FnSkhacFpYY2dQU0JrYjJOMWJXVnVkQzV4ZFdWeWVWTmxiR1ZqZEc5eUtDY3ViR2xuYUhSaWIzZ3RkbWxsZHljcE8xeHVYRzVsZUhCdmNuUWdleUJjYmx4MFJFSXNYRzVjZENSc2IyRmthVzVuTENCY2JseDBKRzVoZGl3Z1hHNWNkQ1J3WVhKaGJHeGhlQ3hjYmx4MEpHTnZiblJsYm5Rc1hHNWNkQ1IwYVhSc1pTeGNibHgwSkhWd1FYSnliM2NzWEc1Y2RDUnRiMlJoYkN4Y2JseDBKR3hwWjJoMFltOTRMRnh1WEhRa2RtbGxkeUJjYm4wN0lpd2lhVzF3YjNKMElITnRiMjkwYUhOamNtOXNiQ0JtY205dElDZHpiVzl2ZEdoelkzSnZiR3d0Y0c5c2VXWnBiR3duTzF4dVhHNXBiWEJ2Y25RZ2V5QmhjblJwWTJ4bFZHVnRjR3hoZEdVc0lISmxibVJsY2s1aGRreG5JSDBnWm5KdmJTQW5MaTkwWlcxd2JHRjBaWE1uTzF4dWFXMXdiM0owSUhzZ1pHVmliM1Z1WTJVc0lHaHBaR1ZNYjJGa2FXNW5MQ0J6WTNKdmJHeFViMVJ2Y0NCOUlHWnliMjBnSnk0dmRYUnBiSE1uTzF4dWFXMXdiM0owSUhzZ1JFSWdmU0JtY205dElDY3VMMk52Ym5OMFlXNTBjeWM3WEc1cGJYQnZjblFnZXlCaGRIUmhZMmhOYjJSaGJFeHBjM1JsYm1WeWN5d2dZWFIwWVdOb1ZYQkJjbkp2ZDB4cGMzUmxibVZ5Y3l3Z1lYUjBZV05vU1cxaFoyVk1hWE4wWlc1bGNuTXNJRzFoYTJWQmJIQm9ZV0psZEN3Z2JXRnJaVk5zYVdSbGNpQjlJR1p5YjIwZ0p5NHZiVzlrZFd4bGN5YzdYRzVjYm14bGRDQnpiM0owUzJWNUlEMGdNRHNnTHk4Z01DQTlJR0Z5ZEdsemRDd2dNU0E5SUhScGRHeGxYRzVzWlhRZ1pXNTBjbWxsY3lBOUlIc2dZbmxCZFhSb2IzSTZJRnRkTENCaWVWUnBkR3hsT2lCYlhTQjlPMXh1WEc1amIyNXpkQ0JoWkdSVGIzSjBRblYwZEc5dVRHbHpkR1Z1WlhKeklEMGdLQ2tnUFQ0Z2UxeHVYSFJzWlhRZ0pHSjVRWEowYVhOMElEMGdaRzlqZFcxbGJuUXVaMlYwUld4bGJXVnVkRUo1U1dRb0oycHpMV0o1TFdGeWRHbHpkQ2NwTzF4dVhIUnNaWFFnSkdKNVZHbDBiR1VnUFNCa2IyTjFiV1Z1ZEM1blpYUkZiR1Z0Wlc1MFFubEpaQ2duYW5NdFlua3RkR2wwYkdVbktUdGNibHgwSkdKNVFYSjBhWE4wTG1Ga1pFVjJaVzUwVEdsemRHVnVaWElvSjJOc2FXTnJKeXdnS0NrZ1BUNGdlMXh1WEhSY2RHbG1JQ2h6YjNKMFMyVjVLU0I3WEc1Y2RGeDBYSFJ6WTNKdmJHeFViMVJ2Y0NncE8xeHVYSFJjZEZ4MGMyOXlkRXRsZVNBOUlEQTdYRzVjZEZ4MFhIUWtZbmxCY25ScGMzUXVZMnhoYzNOTWFYTjBMbUZrWkNnbllXTjBhWFpsSnlrN1hHNWNkRngwWEhRa1lubFVhWFJzWlM1amJHRnpjMHhwYzNRdWNtVnRiM1psS0NkaFkzUnBkbVVuS1R0Y2JseHVYSFJjZEZ4MGNtVnVaR1Z5Ulc1MGNtbGxjeWdwTzF4dVhIUmNkSDFjYmx4MGZTazdYRzVjYmx4MEpHSjVWR2wwYkdVdVlXUmtSWFpsYm5STWFYTjBaVzVsY2lnblkyeHBZMnNuTENBb0tTQTlQaUI3WEc1Y2RGeDBhV1lnS0NGemIzSjBTMlY1S1NCN1hHNWNkRngwWEhSelkzSnZiR3hVYjFSdmNDZ3BPMXh1WEhSY2RGeDBjMjl5ZEV0bGVTQTlJREU3WEc1Y2RGeDBYSFFrWW5sVWFYUnNaUzVqYkdGemMweHBjM1F1WVdSa0tDZGhZM1JwZG1VbktUdGNibHgwWEhSY2RDUmllVUZ5ZEdsemRDNWpiR0Z6YzB4cGMzUXVjbVZ0YjNabEtDZGhZM1JwZG1VbktUdGNibHh1WEhSY2RGeDBjbVZ1WkdWeVJXNTBjbWxsY3lncE8xeHVYSFJjZEgxY2JseDBmU2s3WEc1OU8xeHVYRzVqYjI1emRDQnlaVzVrWlhKRmJuUnlhV1Z6SUQwZ0tDa2dQVDRnZTF4dVhIUmpiMjV6ZENBa1lYSjBhV05zWlV4cGMzUWdQU0JrYjJOMWJXVnVkQzVuWlhSRmJHVnRaVzUwUW5sSlpDZ25hbk10YkdsemRDY3BPMXh1WEhSamIyNXpkQ0JsYm5SeWFXVnpUR2x6ZENBOUlITnZjblJMWlhrZ1B5QmxiblJ5YVdWekxtSjVWR2wwYkdVZ09pQmxiblJ5YVdWekxtSjVRWFYwYUc5eU8xeHVYRzVjZENSaGNuUnBZMnhsVEdsemRDNXBibTVsY2toVVRVd2dQU0FuSnp0Y2JseHVYSFJsYm5SeWFXVnpUR2x6ZEM1bWIzSkZZV05vS0NobGJuUnllU3dnYVNrZ1BUNGdlMXh1WEhSY2RDUmhjblJwWTJ4bFRHbHpkQzVwYm5ObGNuUkJaR3BoWTJWdWRFaFVUVXdvSjJKbFptOXlaV1Z1WkNjc0lHRnlkR2xqYkdWVVpXMXdiR0YwWlNobGJuUnllU3dnYVNrcE8xeHVYSFJjZEcxaGEyVlRiR2xrWlhJb1pHOWpkVzFsYm5RdVoyVjBSV3hsYldWdWRFSjVTV1FvWUhOc2FXUmxjaTBrZTJsOVlDa3BPMXh1WEhSOUtUdGNibHh1WEhSaGRIUmhZMmhKYldGblpVeHBjM1JsYm1WeWN5Z3BPMXh1WEhSdFlXdGxRV3h3YUdGaVpYUW9jMjl5ZEV0bGVTazdYRzU5TzF4dVhHNWpiMjV6ZENCelpYUkVZWFJoUVc1a1UyOXlkRUo1VkdsMGJHVWdQU0FvWkdGMFlTa2dQVDRnZTF4dVhIUmxiblJ5YVdWekxtSjVRWFYwYUc5eUlEMGdaR0YwWVR0Y2JseDBaVzUwY21sbGN5NWllVlJwZEd4bElEMGdaR0YwWVM1emJHbGpaU2dwT3lBdkx5QmpiM0JwWlhNZ1pHRjBZU0JtYjNJZ1lubFVhWFJzWlNCemIzSjBYRzVjYmx4MFpXNTBjbWxsY3k1aWVWUnBkR3hsTG5OdmNuUW9LR0VzSUdJcElEMCtJSHRjYmx4MFhIUnNaWFFnWVZScGRHeGxJRDBnWVM1MGFYUnNaVnN3WFM1MGIxVndjR1Z5UTJGelpTZ3BPMXh1WEhSY2RHeGxkQ0JpVkdsMGJHVWdQU0JpTG5ScGRHeGxXekJkTG5SdlZYQndaWEpEWVhObEtDazdYRzVjZEZ4MGFXWWdLR0ZVYVhSc1pTQStJR0pVYVhSc1pTa2djbVYwZFhKdUlERTdYRzVjZEZ4MFpXeHpaU0JwWmlBb1lWUnBkR3hsSUR3Z1lsUnBkR3hsS1NCeVpYUjFjbTRnTFRFN1hHNWNkRngwWld4elpTQnlaWFIxY200Z01EdGNibHgwZlNrN1hHNTlPMXh1WEc1amIyNXpkQ0JtWlhSamFFUmhkR0VnUFNBb0tTQTlQaUI3WEc1Y2RHWmxkR05vS0VSQ0tTNTBhR1Z1S0hKbGN5QTlQaUJ5WlhNdWFuTnZiaWdwS1Z4dVhIUXVkR2hsYmloa1lYUmhJRDArSUh0Y2JseDBYSFJ6WlhSRVlYUmhRVzVrVTI5eWRFSjVWR2wwYkdVb1pHRjBZU2s3WEc1Y2RGeDBjbVZ1WkdWeVJXNTBjbWxsY3lncE8xeHVYSFJjZEdocFpHVk1iMkZrYVc1bktDazdYRzVjZEgwcFhHNWNkQzVqWVhSamFDaGxjbklnUFQ0Z1kyOXVjMjlzWlM1M1lYSnVLR1Z5Y2lrcE8xeHVmVHRjYmx4dVkyOXVjM1FnYVc1cGRDQTlJQ2dwSUQwK0lIdGNibHgwYzIxdmIzUm9jMk55YjJ4c0xuQnZiSGxtYVd4c0tDazdYRzVjZEdabGRHTm9SR0YwWVNncE8xeHVYSFJ5Wlc1a1pYSk9ZWFpNWnlncE8xeHVYSFJoWkdSVGIzSjBRblYwZEc5dVRHbHpkR1Z1WlhKektDazdYRzVjZEdGMGRHRmphRlZ3UVhKeWIzZE1hWE4wWlc1bGNuTW9LVHRjYmx4MFlYUjBZV05vVFc5a1lXeE1hWE4wWlc1bGNuTW9LVHRjYm4xY2JseHVhVzVwZENncE8xeHVJaXdpYVcxd2IzSjBJSHNnSkhacFpYY3NJQ1JzYVdkb2RHSnZlQ0I5SUdaeWIyMGdKeTR1TDJOdmJuTjBZVzUwY3ljN1hHNWNibXhsZENCc2FXZG9kR0p2ZUNBOUlHWmhiSE5sTzF4dVhHNWpiMjV6ZENCaGRIUmhZMmhKYldGblpVeHBjM1JsYm1WeWN5QTlJQ2dwSUQwK0lIdGNibHgwWTI5dWMzUWdKR2x0WVdkbGN5QTlJRUZ5Y21GNUxtWnliMjBvWkc5amRXMWxiblF1Y1hWbGNubFRaV3hsWTNSdmNrRnNiQ2duTG1GeWRHbGpiR1V0YVcxbkp5a3BPMXh1WEc1Y2RDUnBiV0ZuWlhNdVptOXlSV0ZqYUNocGJXY2dQVDRnZTF4dVhIUmNkR2x0Wnk1aFpHUkZkbVZ1ZEV4cGMzUmxibVZ5S0NkamJHbGpheWNzSUNobGRuUXBJRDArSUh0Y2JseDBYSFJjZEdsbUlDZ2hiR2xuYUhSaWIzZ3BJSHRjYmx4MFhIUmNkRngwYkdWMElITnlZeUE5SUdsdFp5NXpjbU03WEc1Y2RGeDBYSFJjZEZ4dVhIUmNkRngwWEhRa2JHbG5hSFJpYjNndVkyeGhjM05NYVhOMExtRmtaQ2duYzJodmR5MXBiV2NuS1R0Y2JseDBYSFJjZEZ4MEpIWnBaWGN1YzJWMFFYUjBjbWxpZFhSbEtDZHpkSGxzWlNjc0lHQmlZV05yWjNKdmRXNWtMV2x0WVdkbE9pQjFjbXdvSkh0emNtTjlLV0FwTzF4dVhIUmNkRngwWEhSc2FXZG9kR0p2ZUNBOUlIUnlkV1U3WEc1Y2RGeDBYSFI5WEc1Y2RGeDBmU2s3WEc1Y2RIMHBPMXh1WEc1Y2RDUjJhV1YzTG1Ga1pFVjJaVzUwVEdsemRHVnVaWElvSjJOc2FXTnJKeXdnS0NrZ1BUNGdlMXh1WEhSY2RHbG1JQ2hzYVdkb2RHSnZlQ2tnZTF4dVhIUmNkRngwSkd4cFoyaDBZbTk0TG1Oc1lYTnpUR2x6ZEM1eVpXMXZkbVVvSjNOb2IzY3RhVzFuSnlrN1hHNWNkRngwWEhSc2FXZG9kR0p2ZUNBOUlHWmhiSE5sTzF4dVhIUmNkSDFjYmx4MGZTazdYRzU5TzF4dVhHNWxlSEJ2Y25RZ1pHVm1ZWFZzZENCaGRIUmhZMmhKYldGblpVeHBjM1JsYm1WeWN6c2lMQ0pwYlhCdmNuUWdleUFrYlc5a1lXd2dmU0JtY205dElDY3VMaTlqYjI1emRHRnVkSE1uTzF4dVhHNXNaWFFnYlc5a1lXd2dQU0JtWVd4elpUdGNibU52Ym5OMElHRjBkR0ZqYUUxdlpHRnNUR2x6ZEdWdVpYSnpJRDBnS0NrZ1BUNGdlMXh1WEhSamIyNXpkQ0FrWm1sdVpDQTlJR1J2WTNWdFpXNTBMbWRsZEVWc1pXMWxiblJDZVVsa0tDZHFjeTFtYVc1a0p5azdYRzVjZEZ4dVhIUWtabWx1WkM1aFpHUkZkbVZ1ZEV4cGMzUmxibVZ5S0NkamJHbGpheWNzSUNncElEMCtJSHRjYmx4MFhIUWtiVzlrWVd3dVkyeGhjM05NYVhOMExtRmtaQ2duYzJodmR5Y3BPMXh1WEhSY2RHMXZaR0ZzSUQwZ2RISjFaVHRjYmx4MGZTazdYRzVjYmx4MEpHMXZaR0ZzTG1Ga1pFVjJaVzUwVEdsemRHVnVaWElvSjJOc2FXTnJKeXdnS0NrZ1BUNGdlMXh1WEhSY2RDUnRiMlJoYkM1amJHRnpjMHhwYzNRdWNtVnRiM1psS0NkemFHOTNKeWs3WEc1Y2RGeDBiVzlrWVd3Z1BTQm1ZV3h6WlR0Y2JseDBmU2s3WEc1Y2JseDBkMmx1Wkc5M0xtRmtaRVYyWlc1MFRHbHpkR1Z1WlhJb0oydGxlV1J2ZDI0bkxDQW9LU0E5UGlCN1hHNWNkRngwYVdZZ0tHMXZaR0ZzS1NCN1hHNWNkRngwWEhSelpYUlVhVzFsYjNWMEtDZ3BJRDArSUh0Y2JseDBYSFJjZEZ4MEpHMXZaR0ZzTG1Oc1lYTnpUR2x6ZEM1eVpXMXZkbVVvSjNOb2IzY25LVHRjYmx4MFhIUmNkRngwYlc5a1lXd2dQU0JtWVd4elpUdGNibHgwWEhSY2RIMHNJRFl3TUNrN1hHNWNkRngwZlR0Y2JseDBmU2s3WEc1OU8xeHVYRzVsZUhCdmNuUWdaR1ZtWVhWc2RDQmhkSFJoWTJoTmIyUmhiRXhwYzNSbGJtVnljenNpTENKcGJYQnZjblFnZXlBa2RHbDBiR1VzSUNSd1lYSmhiR3hoZUN3Z0pIVndRWEp5YjNjZ2ZTQm1jbTl0SUNjdUxpOWpiMjV6ZEdGdWRITW5PMXh1YVcxd2IzSjBJSHNnYzJOeWIyeHNWRzlVYjNBZ2ZTQm1jbTl0SUNjdUxpOTFkR2xzY3ljN1hHNWNibXhsZENCd2NtVjJPMXh1YkdWMElHTjFjbkpsYm5RZ1BTQXdPMXh1YkdWMElHbHpVMmh2ZDJsdVp5QTlJR1poYkhObE8xeHVYRzVqYjI1emRDQmhkSFJoWTJoVmNFRnljbTkzVEdsemRHVnVaWEp6SUQwZ0tDa2dQVDRnZTF4dVhIUWtjR0Z5WVd4c1lYZ3VZV1JrUlhabGJuUk1hWE4wWlc1bGNpZ25jMk55YjJ4c0p5d2dLQ2tnUFQ0Z2UxeHVYSFJjZEd4bGRDQjVJRDBnSkhScGRHeGxMbWRsZEVKdmRXNWthVzVuUTJ4cFpXNTBVbVZqZENncExuazdYRzVjYmx4MFhIUnBaaUFvWTNWeWNtVnVkQ0FoUFQwZ2VTa2dlMXh1WEhSY2RGeDBjSEpsZGlBOUlHTjFjbkpsYm5RN1hHNWNkRngwWEhSamRYSnlaVzUwSUQwZ2VUdGNibHgwWEhSOU8xeHVYRzVjZEZ4MGFXWWdLSGtnUEQwZ0xUVXdJQ1ltSUNGcGMxTm9iM2RwYm1jcElIdGNibHgwWEhSY2RDUjFjRUZ5Y205M0xtTnNZWE56VEdsemRDNWhaR1FvSjNOb2IzY25LVHRjYmx4MFhIUmNkR2x6VTJodmQybHVaeUE5SUhSeWRXVTdYRzVjZEZ4MGZTQmxiSE5sSUdsbUlDaDVJRDRnTFRVd0lDWW1JR2x6VTJodmQybHVaeWtnZTF4dVhIUmNkRngwSkhWd1FYSnliM2N1WTJ4aGMzTk1hWE4wTG5KbGJXOTJaU2duYzJodmR5Y3BPMXh1WEhSY2RGeDBhWE5UYUc5M2FXNW5JRDBnWm1Gc2MyVTdYRzVjZEZ4MGZWeHVYSFI5S1R0Y2JseHVYSFFrZFhCQmNuSnZkeTVoWkdSRmRtVnVkRXhwYzNSbGJtVnlLQ2RqYkdsamF5Y3NJQ2dwSUQwK0lITmpjbTlzYkZSdlZHOXdLQ2twTzF4dWZUdGNibHh1Wlhod2IzSjBJR1JsWm1GMWJIUWdZWFIwWVdOb1ZYQkJjbkp2ZDB4cGMzUmxibVZ5Y3pzaUxDSnBiWEJ2Y25RZ1lYUjBZV05vVFc5a1lXeE1hWE4wWlc1bGNuTWdabkp2YlNBbkxpOWhkSFJoWTJoTmIyUmhiRXhwYzNSbGJtVnljeWM3WEc1cGJYQnZjblFnWVhSMFlXTm9WWEJCY25KdmQweHBjM1JsYm1WeWN5Qm1jbTl0SUNjdUwyRjBkR0ZqYUZWd1FYSnliM2RNYVhOMFpXNWxjbk1uTzF4dWFXMXdiM0owSUdGMGRHRmphRWx0WVdkbFRHbHpkR1Z1WlhKeklHWnliMjBnSnk0dllYUjBZV05vU1cxaFoyVk1hWE4wWlc1bGNuTW5PMXh1YVcxd2IzSjBJRzFoYTJWQmJIQm9ZV0psZENCbWNtOXRJQ2N1TDIxaGEyVkJiSEJvWVdKbGRDYzdYRzVwYlhCdmNuUWdiV0ZyWlZOc2FXUmxjaUJtY205dElDY3VMMjFoYTJWVGJHbGtaWEluTzF4dVhHNWxlSEJ2Y25RZ2V5QmNibHgwWVhSMFlXTm9UVzlrWVd4TWFYTjBaVzVsY25Nc0lGeHVYSFJoZEhSaFkyaFZjRUZ5Y205M1RHbHpkR1Z1WlhKekxGeHVYSFJoZEhSaFkyaEpiV0ZuWlV4cGMzUmxibVZ5Y3l4Y2JseDBiV0ZyWlVGc2NHaGhZbVYwTENCY2JseDBiV0ZyWlZOc2FXUmxjaUJjYm4wN0lpd2lZMjl1YzNRZ1lXeHdhR0ZpWlhRZ1BTQmJKMkVuTENBbllpY3NJQ2RqSnl3Z0oyUW5MQ0FuWlNjc0lDZG1KeXdnSjJjbkxDQW5hQ2NzSUNkcEp5d2dKMm9uTENBbmF5Y3NJQ2RzSnl3Z0oyMG5MQ0FuYmljc0lDZHZKeXdnSjNBbkxDQW5jaWNzSUNkekp5d2dKM1FuTENBbmRTY3NJQ2QySnl3Z0ozY25MQ0FuZVNjc0lDZDZKMTA3WEc1Y2JtTnZibk4wSUcxaGEyVkJiSEJvWVdKbGRDQTlJQ2h6YjNKMFMyVjVLU0E5UGlCN1hHNWNkR052Ym5OMElHWnBibVJHYVhKemRFVnVkSEo1SUQwZ0tHTm9ZWElwSUQwK0lIdGNibHgwWEhSamIyNXpkQ0J6Wld4bFkzUnZjaUE5SUhOdmNuUkxaWGtnUHlBbkxtcHpMV1Z1ZEhKNUxYUnBkR3hsSnlBNklDY3Vhbk10Wlc1MGNua3RZWEowYVhOMEp6dGNibHgwWEhSamIyNXpkQ0J3Y21WMlUyVnNaV04wYjNJZ1BTQWhjMjl5ZEV0bGVTQS9JQ2N1YW5NdFpXNTBjbmt0ZEdsMGJHVW5JRG9nSnk1cWN5MWxiblJ5ZVMxaGNuUnBjM1FuTzF4dVhHNWNkRngwWTI5dWMzUWdKR1Z1ZEhKcFpYTWdQU0JCY25KaGVTNW1jbTl0S0dSdlkzVnRaVzUwTG5GMVpYSjVVMlZzWldOMGIzSkJiR3dvYzJWc1pXTjBiM0lwS1R0Y2JseDBYSFJqYjI1emRDQWtjSEpsZGtWdWRISnBaWE1nUFNCQmNuSmhlUzVtY205dEtHUnZZM1Z0Wlc1MExuRjFaWEo1VTJWc1pXTjBiM0pCYkd3b2NISmxkbE5sYkdWamRHOXlLU2s3WEc1Y2JseDBYSFFrY0hKbGRrVnVkSEpwWlhNdVptOXlSV0ZqYUNobGJuUnllU0E5UGlCbGJuUnllUzV5WlcxdmRtVkJkSFJ5YVdKMWRHVW9KMjVoYldVbktTazdYRzVjYmx4MFhIUnlaWFIxY200Z0pHVnVkSEpwWlhNdVptbHVaQ2hsYm5SeWVTQTlQaUI3WEc1Y2RGeDBYSFJzWlhRZ2JtOWtaU0E5SUdWdWRISjVMbTVsZUhSRmJHVnRaVzUwVTJsaWJHbHVaenRjYmx4MFhIUmNkSEpsZEhWeWJpQnViMlJsTG1sdWJtVnlTRlJOVEZzd1hTQTlQVDBnWTJoaGNpQjhmQ0J1YjJSbExtbHVibVZ5U0ZSTlRGc3dYU0E5UFQwZ1kyaGhjaTUwYjFWd2NHVnlRMkZ6WlNncE8xeHVYSFJjZEgwcE8xeHVYSFI5TzF4dVhHNWNkR052Ym5OMElHRjBkR0ZqYUVGdVkyaHZja3hwYzNSbGJtVnlJRDBnS0NSaGJtTm9iM0lzSUd4bGRIUmxjaWtnUFQ0Z2UxeHVYSFJjZENSaGJtTm9iM0l1WVdSa1JYWmxiblJNYVhOMFpXNWxjaWduWTJ4cFkyc25MQ0FvS1NBOVBpQjdYRzVjZEZ4MFhIUmpiMjV6ZENCc1pYUjBaWEpPYjJSbElEMGdaRzlqZFcxbGJuUXVaMlYwUld4bGJXVnVkRUo1U1dRb2JHVjBkR1Z5S1R0Y2JseDBYSFJjZEd4bGRDQjBZWEpuWlhRN1hHNWNibHgwWEhSY2RHbG1JQ2doYzI5eWRFdGxlU2tnZTF4dVhIUmNkRngwWEhSMFlYSm5aWFFnUFNCc1pYUjBaWElnUFQwOUlDZGhKeUEvSUdSdlkzVnRaVzUwTG1kbGRFVnNaVzFsYm5SQ2VVbGtLQ2RoYm1Ob2IzSXRkR0Z5WjJWMEp5a2dPaUJzWlhSMFpYSk9iMlJsTG5CaGNtVnVkRVZzWlcxbGJuUXVjR0Z5Wlc1MFJXeGxiV1Z1ZEM1d1lYSmxiblJGYkdWdFpXNTBMbkJoY21WdWRFVnNaVzFsYm5RdWNISmxkbWx2ZFhORmJHVnRaVzUwVTJsaWJHbHVaeTV4ZFdWeWVWTmxiR1ZqZEc5eUtDY3Vhbk10WVhKMGFXTnNaUzFoYm1Ob2IzSXRkR0Z5WjJWMEp5azdYRzVjZEZ4MFhIUjlJR1ZzYzJVZ2UxeHVYSFJjZEZ4MFhIUjBZWEpuWlhRZ1BTQnNaWFIwWlhJZ1BUMDlJQ2RoSnlBL0lHUnZZM1Z0Wlc1MExtZGxkRVZzWlcxbGJuUkNlVWxrS0NkaGJtTm9iM0l0ZEdGeVoyVjBKeWtnT2lCc1pYUjBaWEpPYjJSbExuQmhjbVZ1ZEVWc1pXMWxiblF1Y0dGeVpXNTBSV3hsYldWdWRDNXdZWEpsYm5SRmJHVnRaVzUwTG5CeVpYWnBiM1Z6Uld4bGJXVnVkRk5wWW14cGJtY3VjWFZsY25sVFpXeGxZM1J2Y2lnbkxtcHpMV0Z5ZEdsamJHVXRZVzVqYUc5eUxYUmhjbWRsZENjcE8xeHVYSFJjZEZ4MGZUdGNibHh1WEhSY2RGeDBkR0Z5WjJWMExuTmpjbTlzYkVsdWRHOVdhV1YzS0h0aVpXaGhkbWx2Y2pvZ1hDSnpiVzl2ZEdoY0lpd2dZbXh2WTJzNklGd2ljM1JoY25SY0luMHBPMXh1WEhSY2RIMHBPMXh1WEhSOU8xeHVYRzVjZEd4bGRDQmhZM1JwZG1WRmJuUnlhV1Z6SUQwZ2UzMDdYRzVjZEd4bGRDQWtiM1YwWlhJZ1BTQmtiMk4xYldWdWRDNXhkV1Z5ZVZObGJHVmpkRzl5S0NjdVlXeHdhR0ZpWlhSZlgyeGxkSFJsY25NbktUdGNibHgwSkc5MWRHVnlMbWx1Ym1WeVNGUk5UQ0E5SUNjbk8xeHVYRzVjZEdGc2NHaGhZbVYwTG1admNrVmhZMmdvYkdWMGRHVnlJRDArSUh0Y2JseDBYSFJzWlhRZ0pHWnBjbk4wUlc1MGNua2dQU0JtYVc1a1JtbHljM1JGYm5SeWVTaHNaWFIwWlhJcE8xeHVYSFJjZEd4bGRDQWtZVzVqYUc5eUlEMGdaRzlqZFcxbGJuUXVZM0psWVhSbFJXeGxiV1Z1ZENnbllTY3BPMXh1WEc1Y2RGeDBhV1lnS0NFa1ptbHljM1JGYm5SeWVTa2djbVYwZFhKdU8xeHVYRzVjZEZ4MEpHWnBjbk4wUlc1MGNua3VhV1FnUFNCc1pYUjBaWEk3WEc1Y2RGeDBKR0Z1WTJodmNpNXBibTVsY2toVVRVd2dQU0JzWlhSMFpYSXVkRzlWY0hCbGNrTmhjMlVvS1R0Y2JseDBYSFFrWVc1amFHOXlMbU5zWVhOelRtRnRaU0E5SUNkaGJIQm9ZV0psZEY5ZmJHVjBkR1Z5TFdGdVkyaHZjaWM3WEc1Y2JseDBYSFJoZEhSaFkyaEJibU5vYjNKTWFYTjBaVzVsY2lna1lXNWphRzl5TENCc1pYUjBaWElwTzF4dVhIUmNkQ1J2ZFhSbGNpNWhjSEJsYm1SRGFHbHNaQ2drWVc1amFHOXlLVHRjYmx4MGZTazdYRzU5TzF4dVhHNWxlSEJ2Y25RZ1pHVm1ZWFZzZENCdFlXdGxRV3h3YUdGaVpYUTdJaXdpWTI5dWMzUWdiV0ZyWlZOc2FXUmxjaUE5SUNna2MyeHBaR1Z5S1NBOVBpQjdYRzVjZEdOdmJuTjBJQ1JoY25KdmQwNWxlSFFnUFNBa2MyeHBaR1Z5TG5CaGNtVnVkRVZzWlcxbGJuUXVjWFZsY25sVFpXeGxZM1J2Y2lnbkxtRnljbTkzTFc1bGVIUW5LVHRjYmx4MFkyOXVjM1FnSkdGeWNtOTNVSEpsZGlBOUlDUnpiR2xrWlhJdWNHRnlaVzUwUld4bGJXVnVkQzV4ZFdWeWVWTmxiR1ZqZEc5eUtDY3VZWEp5YjNjdGNISmxkaWNwTzF4dVhHNWNkR3hsZENCamRYSnlaVzUwSUQwZ0pITnNhV1JsY2k1bWFYSnpkRVZzWlcxbGJuUkRhR2xzWkR0Y2JseDBKR0Z5Y205M1RtVjRkQzVoWkdSRmRtVnVkRXhwYzNSbGJtVnlLQ2RqYkdsamF5Y3NJQ2dwSUQwK0lIdGNibHgwWEhSamIyNXpkQ0J1WlhoMElEMGdZM1Z5Y21WdWRDNXVaWGgwUld4bGJXVnVkRk5wWW14cGJtYzdYRzVjZEZ4MGFXWWdLRzVsZUhRcElIdGNibHgwWEhSY2RHNWxlSFF1YzJOeWIyeHNTVzUwYjFacFpYY29lMkpsYUdGMmFXOXlPaUJjSW5OdGIyOTBhRndpTENCaWJHOWphem9nWENKdVpXRnlaWE4wWENJc0lHbHViR2x1WlRvZ1hDSmpaVzUwWlhKY0luMHBPMXh1WEhSY2RGeDBZM1Z5Y21WdWRDQTlJRzVsZUhRN1hHNWNkRngwZlZ4dVhIUjlLVHRjYmx4dVhIUWtZWEp5YjNkUWNtVjJMbUZrWkVWMlpXNTBUR2x6ZEdWdVpYSW9KMk5zYVdOckp5d2dLQ2tnUFQ0Z2UxeHVYSFJjZEdOdmJuTjBJSEJ5WlhZZ1BTQmpkWEp5Wlc1MExuQnlaWFpwYjNWelJXeGxiV1Z1ZEZOcFlteHBibWM3WEc1Y2RGeDBhV1lnS0hCeVpYWXBJSHRjYmx4MFhIUmNkSEJ5WlhZdWMyTnliMnhzU1c1MGIxWnBaWGNvZTJKbGFHRjJhVzl5T2lCY0luTnRiMjkwYUZ3aUxDQmliRzlqYXpvZ1hDSnVaV0Z5WlhOMFhDSXNJR2x1YkdsdVpUb2dYQ0pqWlc1MFpYSmNJbjBwTzF4dVhIUmNkRngwWTNWeWNtVnVkQ0E5SUhCeVpYWTdYRzVjZEZ4MGZWeHVYSFI5S1Z4dWZUdGNibHh1Wlhod2IzSjBJR1JsWm1GMWJIUWdiV0ZyWlZOc2FXUmxjanNpTENKamIyNXpkQ0JwYldGblpWUmxiWEJzWVhSbElEMGdLR2x0WVdkbEtTQTlQaUJnUEdsdFp5QmpiR0Z6Y3oxY0ltRnlkR2xqYkdVdGFXMW5YQ0lnYzNKalBWd2lMaTR2TGk0dllYTnpaWFJ6TDJsdFlXZGxjeThrZTJsdFlXZGxmVndpUGp3dmFXMW5QbUE3WEc1Y2JtTnZibk4wSUdGeWRHbGpiR1ZVWlcxd2JHRjBaU0E5SUNobGJuUnllU3dnYVNrZ1BUNGdlMXh1WEhSamIyNXpkQ0I3SUhScGRHeGxMQ0JtYVhKemRFNWhiV1VzSUd4aGMzUk9ZVzFsTENCcGJXRm5aWE1zSUdSbGMyTnlhWEIwYVc5dUxDQmtaWFJoYVd3Z2ZTQTlJR1Z1ZEhKNU8xeHVYRzVjZEdOdmJuTjBJR2x0WVdkbFNGUk5UQ0E5SUdsdFlXZGxjeTVzWlc1bmRHZ2dQeUJjYmx4MFhIUnBiV0ZuWlhNdWJXRndLR2x0WVdkbElEMCtJR2x0WVdkbFZHVnRjR3hoZEdVb2FXMWhaMlVwS1M1cWIybHVLQ2NuS1NBNklDY25PMXh1WEc1Y2RISmxkSFZ5YmlBZ1lGeHVYSFJjZER4aGNuUnBZMnhsSUdOc1lYTnpQVndpWVhKMGFXTnNaVjlmYjNWMFpYSmNJajVjYmx4MFhIUmNkRHhrYVhZZ1kyeGhjM005WENKaGNuUnBZMnhsWDE5cGJtNWxjbHdpUGx4dVhIUmNkRngwWEhROFpHbDJJR05zWVhOelBWd2lZWEowYVdOc1pWOWZhR1ZoWkdsdVoxd2lQbHh1WEhSY2RGeDBYSFJjZER4aElHTnNZWE56UFZ3aWFuTXRaVzUwY25rdGRHbDBiR1ZjSWo0OEwyRStYRzVjZEZ4MFhIUmNkRngwUEdneUlHTnNZWE56UFZ3aVlYSjBhV05zWlMxb1pXRmthVzVuWDE5MGFYUnNaVndpUGlSN2RHbDBiR1Y5UEM5b01qNWNibHgwWEhSY2RGeDBYSFE4WkdsMklHTnNZWE56UFZ3aVlYSjBhV05zWlMxb1pXRmthVzVuWDE5dVlXMWxYQ0krWEc1Y2RGeDBYSFJjZEZ4MFhIUThjM0JoYmlCamJHRnpjejFjSW1GeWRHbGpiR1V0YUdWaFpHbHVaMTlmYm1GdFpTMHRabWx5YzNSY0lqNGtlMlpwY25OMFRtRnRaWDA4TDNOd1lXNCtYRzVjZEZ4MFhIUmNkRngwWEhROFlTQmpiR0Z6Y3oxY0ltcHpMV1Z1ZEhKNUxXRnlkR2x6ZEZ3aVBqd3ZZVDVjYmx4MFhIUmNkRngwWEhSY2REeHpjR0Z1SUdOc1lYTnpQVndpWVhKMGFXTnNaUzFvWldGa2FXNW5YMTl1WVcxbExTMXNZWE4wWENJK0pIdHNZWE4wVG1GdFpYMDhMM053WVc0K1hHNWNkRngwWEhSY2RGeDBQQzlrYVhZK1hHNWNkRngwWEhSY2REd3ZaR2wyUGx4MFhHNWNkRngwWEhSY2REeGthWFlnWTJ4aGMzTTlYQ0poY25ScFkyeGxYMTl6Ykdsa1pYSXRiM1YwWlhKY0lqNWNibHgwWEhSY2RGeDBYSFE4WkdsMklHTnNZWE56UFZ3aVlYSjBhV05zWlY5ZmMyeHBaR1Z5TFdsdWJtVnlYQ0lnYVdROVhDSnpiR2xrWlhJdEpIdHBmVndpUGx4dVhIUmNkRngwWEhSY2RGeDBKSHRwYldGblpVaFVUVXg5WEc1Y2RGeDBYSFJjZEZ4MFhIUThaR2wySUdOc1lYTnpQVndpWVhKMGFXTnNaUzFrWlhOamNtbHdkR2x2Ymw5ZmIzVjBaWEpjSWo1Y2JseDBYSFJjZEZ4MFhIUmNkRngwUEdScGRpQmpiR0Z6Y3oxY0ltRnlkR2xqYkdVdFpHVnpZM0pwY0hScGIyNWNJajRrZTJSbGMyTnlhWEIwYVc5dWZUd3ZaR2wyUGx4dVhIUmNkRngwWEhSY2RGeDBYSFE4WkdsMklHTnNZWE56UFZ3aVlYSjBhV05zWlMxa1pYUmhhV3hjSWo0a2UyUmxkR0ZwYkgwOEwyUnBkajVjYmx4MFhIUmNkRngwWEhSY2REd3ZaR2wyUGx4dVhIUmNkRngwWEhSY2REd3ZaR2wyUGx4dVhIUmNkRngwWEhSY2REeGthWFlnWTJ4aGMzTTlYQ0poY25ScFkyeGxYMTl6WTNKdmJHd3RZMjl1ZEhKdmJITmNJajVjYmx4MFhIUmNkRngwWEhSY2REeHpjR0Z1SUdOc1lYTnpQVndpWTI5dWRISnZiSE1nWVhKeWIzY3RjSEpsZGx3aVB1S0drRHd2YzNCaGJqNGdYRzVjZEZ4MFhIUmNkRngwWEhROGMzQmhiaUJqYkdGemN6MWNJbU52Ym5SeWIyeHpJR0Z5Y205M0xXNWxlSFJjSWo3aWhwSThMM053WVc0K1hHNWNkRngwWEhSY2RGeDBQQzlrYVhZK1hHNWNkRngwWEhSY2RGeDBQSEFnWTJ4aGMzTTlYQ0pxY3kxaGNuUnBZMnhsTFdGdVkyaHZjaTEwWVhKblpYUmNJajQ4TDNBK1hHNWNkRngwWEhROEwyUnBkajVjYmx4MFhIUThMMkZ5ZEdsamJHVStYRzVjZEdCY2JuMDdYRzVjYm1WNGNHOXlkQ0JrWldaaGRXeDBJR0Z5ZEdsamJHVlVaVzF3YkdGMFpUc2lMQ0pwYlhCdmNuUWdZWEowYVdOc1pWUmxiWEJzWVhSbElHWnliMjBnSnk0dllYSjBhV05zWlNjN1hHNXBiWEJ2Y25RZ2NtVnVaR1Z5VG1GMlRHY2dabkp2YlNBbkxpOXVZWFpNWnljN1hHNWNibVY0Y0c5eWRDQjdJR0Z5ZEdsamJHVlVaVzF3YkdGMFpTd2djbVZ1WkdWeVRtRjJUR2NnZlRzaUxDSmpiMjV6ZENCMFpXMXdiR0YwWlNBOUlGeHVYSFJnUEdScGRpQmpiR0Z6Y3oxY0ltNWhkbDlmYVc1dVpYSmNJajVjYmx4MFhIUThaR2wySUdOc1lYTnpQVndpYm1GMlgxOXpiM0owTFdKNVhDSStYRzVjZEZ4MFhIUThjM0JoYmlCamJHRnpjejFjSW5OdmNuUXRZbmxmWDNScGRHeGxYQ0krVTI5eWRDQmllVHd2YzNCaGJqNWNibHgwWEhSY2REeGlkWFIwYjI0Z1kyeGhjM005WENKemIzSjBMV0o1SUhOdmNuUXRZbmxmWDJKNUxXRnlkR2x6ZENCaFkzUnBkbVZjSWlCcFpEMWNJbXB6TFdKNUxXRnlkR2x6ZEZ3aVBrRnlkR2x6ZER3dlluVjBkRzl1UGx4dVhIUmNkRngwUEhOd1lXNGdZMnhoYzNNOVhDSnpiM0owTFdKNVgxOWthWFpwWkdWeVhDSStJSHdnUEM5emNHRnVQbHh1WEhSY2RGeDBQR0oxZEhSdmJpQmpiR0Z6Y3oxY0luTnZjblF0WW5rZ2MyOXlkQzFpZVY5Zllua3RkR2wwYkdWY0lpQnBaRDFjSW1wekxXSjVMWFJwZEd4bFhDSStWR2wwYkdVOEwySjFkSFJ2Ymo1Y2JseDBYSFJjZER4emNHRnVJR05zWVhOelBWd2labWx1WkZ3aUlHbGtQVndpYW5NdFptbHVaRndpUGx4dVhIUmNkRngwWEhRb1BITndZVzRnWTJ4aGMzTTlYQ0ptYVc1a0xTMXBibTVsY2x3aVBpWWpPRGs0TkR0R1BDOXpjR0Z1UGlsY2JseDBYSFJjZER3dmMzQmhiajVjYmx4MFhIUThMMlJwZGo1Y2JseDBYSFE4WkdsMklHTnNZWE56UFZ3aWJtRjJYMTloYkhCb1lXSmxkRndpUGx4dVhIUmNkRngwUEhOd1lXNGdZMnhoYzNNOVhDSmhiSEJvWVdKbGRGOWZkR2wwYkdWY0lqNUhieUIwYnp3dmMzQmhiajVjYmx4MFhIUmNkRHhrYVhZZ1kyeGhjM005WENKaGJIQm9ZV0psZEY5ZmJHVjBkR1Z5YzF3aVBqd3ZaR2wyUGx4dVhIUmNkRHd2WkdsMlBseHVYSFE4TDJScGRqNWdPMXh1WEc1amIyNXpkQ0J5Wlc1a1pYSk9ZWFpNWnlBOUlDZ3BJRDArSUh0Y2JseDBiR1YwSUc1aGRrOTFkR1Z5SUQwZ1pHOWpkVzFsYm5RdVoyVjBSV3hsYldWdWRFSjVTV1FvSjJwekxXNWhkaWNwTzF4dVhIUnVZWFpQZFhSbGNpNXBibTVsY2toVVRVd2dQU0IwWlcxd2JHRjBaVHRjYm4wN1hHNWNibVY0Y0c5eWRDQmtaV1poZFd4MElISmxibVJsY2s1aGRreG5PeUlzSW1sdGNHOXlkQ0I3SUNSc2IyRmthVzVuTENBa2JtRjJMQ0FrY0dGeVlXeHNZWGdzSUNSamIyNTBaVzUwTENBa2RHbDBiR1VzSUNSaGNuSnZkeXdnSkcxdlpHRnNMQ0FrYkdsbmFIUmliM2dzSUNSMmFXVjNJSDBnWm5KdmJTQW5MaTR2WTI5dWMzUmhiblJ6Snp0Y2JseHVZMjl1YzNRZ1pHVmliM1Z1WTJVZ1BTQW9abTRzSUhScGJXVXBJRDArSUh0Y2JpQWdiR1YwSUhScGJXVnZkWFE3WEc1Y2JpQWdjbVYwZFhKdUlHWjFibU4wYVc5dUtDa2dlMXh1SUNBZ0lHTnZibk4wSUdaMWJtTjBhVzl1UTJGc2JDQTlJQ2dwSUQwK0lHWnVMbUZ3Y0d4NUtIUm9hWE1zSUdGeVozVnRaVzUwY3lrN1hHNGdJQ0FnWEc0Z0lDQWdZMnhsWVhKVWFXMWxiM1YwS0hScGJXVnZkWFFwTzF4dUlDQWdJSFJwYldWdmRYUWdQU0J6WlhSVWFXMWxiM1YwS0daMWJtTjBhVzl1UTJGc2JDd2dkR2x0WlNrN1hHNGdJSDFjYm4wN1hHNWNibU52Ym5OMElHaHBaR1ZNYjJGa2FXNW5JRDBnS0NrZ1BUNGdlMXh1WEhRa2JHOWhaR2x1Wnk1bWIzSkZZV05vS0dWc1pXMGdQVDRnWld4bGJTNWpiR0Z6YzB4cGMzUXVZV1JrS0NkeVpXRmtlU2NwS1R0Y2JseDBKRzVoZGk1amJHRnpjMHhwYzNRdVlXUmtLQ2R5WldGa2VTY3BPMXh1ZlR0Y2JseHVZMjl1YzNRZ2MyTnliMnhzVkc5VWIzQWdQU0FvS1NBOVBpQjdYRzVjZEd4bGRDQjBiM0FnUFNCa2IyTjFiV1Z1ZEM1blpYUkZiR1Z0Wlc1MFFubEpaQ2duWVc1amFHOXlMWFJoY21kbGRDY3BPMXh1WEhSMGIzQXVjMk55YjJ4c1NXNTBiMVpwWlhjb2UySmxhR0YyYVc5eU9pQmNJbk50YjI5MGFGd2lMQ0JpYkc5amF6b2dYQ0p6ZEdGeWRGd2lmU2s3WEc1OU8xeHVYRzVsZUhCdmNuUWdleUJrWldKdmRXNWpaU3dnYUdsa1pVeHZZV1JwYm1jc0lITmpjbTlzYkZSdlZHOXdJSDA3SWwxOSJ9
