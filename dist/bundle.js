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

var renderEntries = function renderEntries() {
	var entriesList = sortKey ? entries.byTitle : entries.byAuthor;

	_constants.$articleList.innerHTML = '';

	entriesList.forEach(function (entry, i) {
		_constants.$articleList.insertAdjacentHTML('beforeend', (0, _templates.articleTemplate)(entry, i));
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
	setUpSortButtons();
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvc21vb3Roc2Nyb2xsLXBvbHlmaWxsL2Rpc3Qvc21vb3Roc2Nyb2xsLmpzIiwic3JjL2pzL2NvbnN0YW50cy5qcyIsInNyYy9qcy9pbmRleC5qcyIsInNyYy9qcy9tb2R1bGVzL2F0dGFjaEltYWdlTGlzdGVuZXJzLmpzIiwic3JjL2pzL21vZHVsZXMvYXR0YWNoTW9kYWxMaXN0ZW5lcnMuanMiLCJzcmMvanMvbW9kdWxlcy9hdHRhY2hVcEFycm93TGlzdGVuZXJzLmpzIiwic3JjL2pzL21vZHVsZXMvaW5kZXguanMiLCJzcmMvanMvbW9kdWxlcy9tYWtlQWxwaGFiZXQuanMiLCJzcmMvanMvbW9kdWxlcy9tYWtlU2xpZGVyLmpzIiwic3JjL2pzL3RlbXBsYXRlcy9hcnRpY2xlLmpzIiwic3JjL2pzL3RlbXBsYXRlcy9pbmRleC5qcyIsInNyYy9qcy90ZW1wbGF0ZXMvbmF2TGcuanMiLCJzcmMvanMvdXRpbHMvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNB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U0FBVCxHQUFxQixRQUFyQjtBQUNBLENBSEQ7O2tCQUtlLFc7Ozs7Ozs7Ozs7QUN0QmY7O0FBRUEsSUFBTSxXQUFXLFNBQVgsUUFBVyxDQUFDLEVBQUQsRUFBSyxJQUFMLEVBQWM7QUFDN0IsTUFBSSxnQkFBSjs7QUFFQSxTQUFPLFlBQVc7QUFBQTtBQUFBOztBQUNoQixRQUFNLGVBQWUsU0FBZixZQUFlO0FBQUEsYUFBTSxHQUFHLEtBQUgsQ0FBUyxLQUFULEVBQWUsVUFBZixDQUFOO0FBQUEsS0FBckI7O0FBRUEsaUJBQWEsT0FBYjtBQUNBLGNBQVUsV0FBVyxZQUFYLEVBQXlCLElBQXpCLENBQVY7QUFDRCxHQUxEO0FBTUQsQ0FURDs7QUFXQSxJQUFNLGNBQWMsU0FBZCxXQUFjLEdBQU07QUFDekIsc0JBQVMsT0FBVCxDQUFpQjtBQUFBLFdBQVEsS0FBSyxTQUFMLENBQWUsR0FBZixDQUFtQixPQUFuQixDQUFSO0FBQUEsR0FBakI7QUFDQSxrQkFBSyxTQUFMLENBQWUsR0FBZixDQUFtQixPQUFuQjtBQUNBLENBSEQ7O0FBS0EsSUFBTSxjQUFjLFNBQWQsV0FBYyxHQUFNO0FBQ3pCLE1BQUksTUFBTSxTQUFTLGNBQVQsQ0FBd0IsZUFBeEIsQ0FBVjtBQUNBLE1BQUksY0FBSixDQUFtQixFQUFDLFVBQVUsUUFBWCxFQUFxQixPQUFPLE9BQTVCLEVBQW5CO0FBQ0EsQ0FIRDs7UUFLUyxRLEdBQUEsUTtRQUFVLFcsR0FBQSxXO1FBQWEsVyxHQUFBLFciLCJmaWxlIjoiYnVuZGxlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIi8qIHNtb290aHNjcm9sbCB2MC40LjAgLSAyMDE4IC0gRHVzdGFuIEthc3RlbiwgSmVyZW1pYXMgTWVuaWNoZWxsaSAtIE1JVCBMaWNlbnNlICovXG4oZnVuY3Rpb24gKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgLy8gcG9seWZpbGxcbiAgZnVuY3Rpb24gcG9seWZpbGwoKSB7XG4gICAgLy8gYWxpYXNlc1xuICAgIHZhciB3ID0gd2luZG93O1xuICAgIHZhciBkID0gZG9jdW1lbnQ7XG5cbiAgICAvLyByZXR1cm4gaWYgc2Nyb2xsIGJlaGF2aW9yIGlzIHN1cHBvcnRlZCBhbmQgcG9seWZpbGwgaXMgbm90IGZvcmNlZFxuICAgIGlmIChcbiAgICAgICdzY3JvbGxCZWhhdmlvcicgaW4gZC5kb2N1bWVudEVsZW1lbnQuc3R5bGUgJiZcbiAgICAgIHcuX19mb3JjZVNtb290aFNjcm9sbFBvbHlmaWxsX18gIT09IHRydWVcbiAgICApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBnbG9iYWxzXG4gICAgdmFyIEVsZW1lbnQgPSB3LkhUTUxFbGVtZW50IHx8IHcuRWxlbWVudDtcbiAgICB2YXIgU0NST0xMX1RJTUUgPSA0Njg7XG5cbiAgICAvLyBvYmplY3QgZ2F0aGVyaW5nIG9yaWdpbmFsIHNjcm9sbCBtZXRob2RzXG4gICAgdmFyIG9yaWdpbmFsID0ge1xuICAgICAgc2Nyb2xsOiB3LnNjcm9sbCB8fCB3LnNjcm9sbFRvLFxuICAgICAgc2Nyb2xsQnk6IHcuc2Nyb2xsQnksXG4gICAgICBlbGVtZW50U2Nyb2xsOiBFbGVtZW50LnByb3RvdHlwZS5zY3JvbGwgfHwgc2Nyb2xsRWxlbWVudCxcbiAgICAgIHNjcm9sbEludG9WaWV3OiBFbGVtZW50LnByb3RvdHlwZS5zY3JvbGxJbnRvVmlld1xuICAgIH07XG5cbiAgICAvLyBkZWZpbmUgdGltaW5nIG1ldGhvZFxuICAgIHZhciBub3cgPVxuICAgICAgdy5wZXJmb3JtYW5jZSAmJiB3LnBlcmZvcm1hbmNlLm5vd1xuICAgICAgICA/IHcucGVyZm9ybWFuY2Uubm93LmJpbmQody5wZXJmb3JtYW5jZSlcbiAgICAgICAgOiBEYXRlLm5vdztcblxuICAgIC8qKlxuICAgICAqIGluZGljYXRlcyBpZiBhIHRoZSBjdXJyZW50IGJyb3dzZXIgaXMgbWFkZSBieSBNaWNyb3NvZnRcbiAgICAgKiBAbWV0aG9kIGlzTWljcm9zb2Z0QnJvd3NlclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSB1c2VyQWdlbnRcbiAgICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBpc01pY3Jvc29mdEJyb3dzZXIodXNlckFnZW50KSB7XG4gICAgICB2YXIgdXNlckFnZW50UGF0dGVybnMgPSBbJ01TSUUgJywgJ1RyaWRlbnQvJywgJ0VkZ2UvJ107XG5cbiAgICAgIHJldHVybiBuZXcgUmVnRXhwKHVzZXJBZ2VudFBhdHRlcm5zLmpvaW4oJ3wnKSkudGVzdCh1c2VyQWdlbnQpO1xuICAgIH1cblxuICAgIC8qXG4gICAgICogSUUgaGFzIHJvdW5kaW5nIGJ1ZyByb3VuZGluZyBkb3duIGNsaWVudEhlaWdodCBhbmQgY2xpZW50V2lkdGggYW5kXG4gICAgICogcm91bmRpbmcgdXAgc2Nyb2xsSGVpZ2h0IGFuZCBzY3JvbGxXaWR0aCBjYXVzaW5nIGZhbHNlIHBvc2l0aXZlc1xuICAgICAqIG9uIGhhc1Njcm9sbGFibGVTcGFjZVxuICAgICAqL1xuICAgIHZhciBST1VORElOR19UT0xFUkFOQ0UgPSBpc01pY3Jvc29mdEJyb3dzZXIody5uYXZpZ2F0b3IudXNlckFnZW50KSA/IDEgOiAwO1xuXG4gICAgLyoqXG4gICAgICogY2hhbmdlcyBzY3JvbGwgcG9zaXRpb24gaW5zaWRlIGFuIGVsZW1lbnRcbiAgICAgKiBAbWV0aG9kIHNjcm9sbEVsZW1lbnRcbiAgICAgKiBAcGFyYW0ge051bWJlcn0geFxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSB5XG4gICAgICogQHJldHVybnMge3VuZGVmaW5lZH1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzY3JvbGxFbGVtZW50KHgsIHkpIHtcbiAgICAgIHRoaXMuc2Nyb2xsTGVmdCA9IHg7XG4gICAgICB0aGlzLnNjcm9sbFRvcCA9IHk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogcmV0dXJucyByZXN1bHQgb2YgYXBwbHlpbmcgZWFzZSBtYXRoIGZ1bmN0aW9uIHRvIGEgbnVtYmVyXG4gICAgICogQG1ldGhvZCBlYXNlXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IGtcbiAgICAgKiBAcmV0dXJucyB7TnVtYmVyfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGVhc2Uoaykge1xuICAgICAgcmV0dXJuIDAuNSAqICgxIC0gTWF0aC5jb3MoTWF0aC5QSSAqIGspKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBpbmRpY2F0ZXMgaWYgYSBzbW9vdGggYmVoYXZpb3Igc2hvdWxkIGJlIGFwcGxpZWRcbiAgICAgKiBAbWV0aG9kIHNob3VsZEJhaWxPdXRcbiAgICAgKiBAcGFyYW0ge051bWJlcnxPYmplY3R9IGZpcnN0QXJnXG4gICAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAgICovXG4gICAgZnVuY3Rpb24gc2hvdWxkQmFpbE91dChmaXJzdEFyZykge1xuICAgICAgaWYgKFxuICAgICAgICBmaXJzdEFyZyA9PT0gbnVsbCB8fFxuICAgICAgICB0eXBlb2YgZmlyc3RBcmcgIT09ICdvYmplY3QnIHx8XG4gICAgICAgIGZpcnN0QXJnLmJlaGF2aW9yID09PSB1bmRlZmluZWQgfHxcbiAgICAgICAgZmlyc3RBcmcuYmVoYXZpb3IgPT09ICdhdXRvJyB8fFxuICAgICAgICBmaXJzdEFyZy5iZWhhdmlvciA9PT0gJ2luc3RhbnQnXG4gICAgICApIHtcbiAgICAgICAgLy8gZmlyc3QgYXJndW1lbnQgaXMgbm90IGFuIG9iamVjdC9udWxsXG4gICAgICAgIC8vIG9yIGJlaGF2aW9yIGlzIGF1dG8sIGluc3RhbnQgb3IgdW5kZWZpbmVkXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAodHlwZW9mIGZpcnN0QXJnID09PSAnb2JqZWN0JyAmJiBmaXJzdEFyZy5iZWhhdmlvciA9PT0gJ3Ntb290aCcpIHtcbiAgICAgICAgLy8gZmlyc3QgYXJndW1lbnQgaXMgYW4gb2JqZWN0IGFuZCBiZWhhdmlvciBpcyBzbW9vdGhcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuXG4gICAgICAvLyB0aHJvdyBlcnJvciB3aGVuIGJlaGF2aW9yIGlzIG5vdCBzdXBwb3J0ZWRcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAgICdiZWhhdmlvciBtZW1iZXIgb2YgU2Nyb2xsT3B0aW9ucyAnICtcbiAgICAgICAgICBmaXJzdEFyZy5iZWhhdmlvciArXG4gICAgICAgICAgJyBpcyBub3QgYSB2YWxpZCB2YWx1ZSBmb3IgZW51bWVyYXRpb24gU2Nyb2xsQmVoYXZpb3IuJ1xuICAgICAgKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBpbmRpY2F0ZXMgaWYgYW4gZWxlbWVudCBoYXMgc2Nyb2xsYWJsZSBzcGFjZSBpbiB0aGUgcHJvdmlkZWQgYXhpc1xuICAgICAqIEBtZXRob2QgaGFzU2Nyb2xsYWJsZVNwYWNlXG4gICAgICogQHBhcmFtIHtOb2RlfSBlbFxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBheGlzXG4gICAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAgICovXG4gICAgZnVuY3Rpb24gaGFzU2Nyb2xsYWJsZVNwYWNlKGVsLCBheGlzKSB7XG4gICAgICBpZiAoYXhpcyA9PT0gJ1knKSB7XG4gICAgICAgIHJldHVybiBlbC5jbGllbnRIZWlnaHQgKyBST1VORElOR19UT0xFUkFOQ0UgPCBlbC5zY3JvbGxIZWlnaHQ7XG4gICAgICB9XG5cbiAgICAgIGlmIChheGlzID09PSAnWCcpIHtcbiAgICAgICAgcmV0dXJuIGVsLmNsaWVudFdpZHRoICsgUk9VTkRJTkdfVE9MRVJBTkNFIDwgZWwuc2Nyb2xsV2lkdGg7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogaW5kaWNhdGVzIGlmIGFuIGVsZW1lbnQgaGFzIGEgc2Nyb2xsYWJsZSBvdmVyZmxvdyBwcm9wZXJ0eSBpbiB0aGUgYXhpc1xuICAgICAqIEBtZXRob2QgY2FuT3ZlcmZsb3dcbiAgICAgKiBAcGFyYW0ge05vZGV9IGVsXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGF4aXNcbiAgICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBjYW5PdmVyZmxvdyhlbCwgYXhpcykge1xuICAgICAgdmFyIG92ZXJmbG93VmFsdWUgPSB3LmdldENvbXB1dGVkU3R5bGUoZWwsIG51bGwpWydvdmVyZmxvdycgKyBheGlzXTtcblxuICAgICAgcmV0dXJuIG92ZXJmbG93VmFsdWUgPT09ICdhdXRvJyB8fCBvdmVyZmxvd1ZhbHVlID09PSAnc2Nyb2xsJztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBpbmRpY2F0ZXMgaWYgYW4gZWxlbWVudCBjYW4gYmUgc2Nyb2xsZWQgaW4gZWl0aGVyIGF4aXNcbiAgICAgKiBAbWV0aG9kIGlzU2Nyb2xsYWJsZVxuICAgICAqIEBwYXJhbSB7Tm9kZX0gZWxcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gYXhpc1xuICAgICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGlzU2Nyb2xsYWJsZShlbCkge1xuICAgICAgdmFyIGlzU2Nyb2xsYWJsZVkgPSBoYXNTY3JvbGxhYmxlU3BhY2UoZWwsICdZJykgJiYgY2FuT3ZlcmZsb3coZWwsICdZJyk7XG4gICAgICB2YXIgaXNTY3JvbGxhYmxlWCA9IGhhc1Njcm9sbGFibGVTcGFjZShlbCwgJ1gnKSAmJiBjYW5PdmVyZmxvdyhlbCwgJ1gnKTtcblxuICAgICAgcmV0dXJuIGlzU2Nyb2xsYWJsZVkgfHwgaXNTY3JvbGxhYmxlWDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBmaW5kcyBzY3JvbGxhYmxlIHBhcmVudCBvZiBhbiBlbGVtZW50XG4gICAgICogQG1ldGhvZCBmaW5kU2Nyb2xsYWJsZVBhcmVudFxuICAgICAqIEBwYXJhbSB7Tm9kZX0gZWxcbiAgICAgKiBAcmV0dXJucyB7Tm9kZX0gZWxcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBmaW5kU2Nyb2xsYWJsZVBhcmVudChlbCkge1xuICAgICAgdmFyIGlzQm9keTtcblxuICAgICAgZG8ge1xuICAgICAgICBlbCA9IGVsLnBhcmVudE5vZGU7XG5cbiAgICAgICAgaXNCb2R5ID0gZWwgPT09IGQuYm9keTtcbiAgICAgIH0gd2hpbGUgKGlzQm9keSA9PT0gZmFsc2UgJiYgaXNTY3JvbGxhYmxlKGVsKSA9PT0gZmFsc2UpO1xuXG4gICAgICBpc0JvZHkgPSBudWxsO1xuXG4gICAgICByZXR1cm4gZWw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogc2VsZiBpbnZva2VkIGZ1bmN0aW9uIHRoYXQsIGdpdmVuIGEgY29udGV4dCwgc3RlcHMgdGhyb3VnaCBzY3JvbGxpbmdcbiAgICAgKiBAbWV0aG9kIHN0ZXBcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gY29udGV4dFxuICAgICAqIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gICAgICovXG4gICAgZnVuY3Rpb24gc3RlcChjb250ZXh0KSB7XG4gICAgICB2YXIgdGltZSA9IG5vdygpO1xuICAgICAgdmFyIHZhbHVlO1xuICAgICAgdmFyIGN1cnJlbnRYO1xuICAgICAgdmFyIGN1cnJlbnRZO1xuICAgICAgdmFyIGVsYXBzZWQgPSAodGltZSAtIGNvbnRleHQuc3RhcnRUaW1lKSAvIFNDUk9MTF9USU1FO1xuXG4gICAgICAvLyBhdm9pZCBlbGFwc2VkIHRpbWVzIGhpZ2hlciB0aGFuIG9uZVxuICAgICAgZWxhcHNlZCA9IGVsYXBzZWQgPiAxID8gMSA6IGVsYXBzZWQ7XG5cbiAgICAgIC8vIGFwcGx5IGVhc2luZyB0byBlbGFwc2VkIHRpbWVcbiAgICAgIHZhbHVlID0gZWFzZShlbGFwc2VkKTtcblxuICAgICAgY3VycmVudFggPSBjb250ZXh0LnN0YXJ0WCArIChjb250ZXh0LnggLSBjb250ZXh0LnN0YXJ0WCkgKiB2YWx1ZTtcbiAgICAgIGN1cnJlbnRZID0gY29udGV4dC5zdGFydFkgKyAoY29udGV4dC55IC0gY29udGV4dC5zdGFydFkpICogdmFsdWU7XG5cbiAgICAgIGNvbnRleHQubWV0aG9kLmNhbGwoY29udGV4dC5zY3JvbGxhYmxlLCBjdXJyZW50WCwgY3VycmVudFkpO1xuXG4gICAgICAvLyBzY3JvbGwgbW9yZSBpZiB3ZSBoYXZlIG5vdCByZWFjaGVkIG91ciBkZXN0aW5hdGlvblxuICAgICAgaWYgKGN1cnJlbnRYICE9PSBjb250ZXh0LnggfHwgY3VycmVudFkgIT09IGNvbnRleHQueSkge1xuICAgICAgICB3LnJlcXVlc3RBbmltYXRpb25GcmFtZShzdGVwLmJpbmQodywgY29udGV4dCkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIHNjcm9sbHMgd2luZG93IG9yIGVsZW1lbnQgd2l0aCBhIHNtb290aCBiZWhhdmlvclxuICAgICAqIEBtZXRob2Qgc21vb3RoU2Nyb2xsXG4gICAgICogQHBhcmFtIHtPYmplY3R8Tm9kZX0gZWxcbiAgICAgKiBAcGFyYW0ge051bWJlcn0geFxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSB5XG4gICAgICogQHJldHVybnMge3VuZGVmaW5lZH1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzbW9vdGhTY3JvbGwoZWwsIHgsIHkpIHtcbiAgICAgIHZhciBzY3JvbGxhYmxlO1xuICAgICAgdmFyIHN0YXJ0WDtcbiAgICAgIHZhciBzdGFydFk7XG4gICAgICB2YXIgbWV0aG9kO1xuICAgICAgdmFyIHN0YXJ0VGltZSA9IG5vdygpO1xuXG4gICAgICAvLyBkZWZpbmUgc2Nyb2xsIGNvbnRleHRcbiAgICAgIGlmIChlbCA9PT0gZC5ib2R5KSB7XG4gICAgICAgIHNjcm9sbGFibGUgPSB3O1xuICAgICAgICBzdGFydFggPSB3LnNjcm9sbFggfHwgdy5wYWdlWE9mZnNldDtcbiAgICAgICAgc3RhcnRZID0gdy5zY3JvbGxZIHx8IHcucGFnZVlPZmZzZXQ7XG4gICAgICAgIG1ldGhvZCA9IG9yaWdpbmFsLnNjcm9sbDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNjcm9sbGFibGUgPSBlbDtcbiAgICAgICAgc3RhcnRYID0gZWwuc2Nyb2xsTGVmdDtcbiAgICAgICAgc3RhcnRZID0gZWwuc2Nyb2xsVG9wO1xuICAgICAgICBtZXRob2QgPSBzY3JvbGxFbGVtZW50O1xuICAgICAgfVxuXG4gICAgICAvLyBzY3JvbGwgbG9vcGluZyBvdmVyIGEgZnJhbWVcbiAgICAgIHN0ZXAoe1xuICAgICAgICBzY3JvbGxhYmxlOiBzY3JvbGxhYmxlLFxuICAgICAgICBtZXRob2Q6IG1ldGhvZCxcbiAgICAgICAgc3RhcnRUaW1lOiBzdGFydFRpbWUsXG4gICAgICAgIHN0YXJ0WDogc3RhcnRYLFxuICAgICAgICBzdGFydFk6IHN0YXJ0WSxcbiAgICAgICAgeDogeCxcbiAgICAgICAgeTogeVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gT1JJR0lOQUwgTUVUSE9EUyBPVkVSUklERVNcbiAgICAvLyB3LnNjcm9sbCBhbmQgdy5zY3JvbGxUb1xuICAgIHcuc2Nyb2xsID0gdy5zY3JvbGxUbyA9IGZ1bmN0aW9uKCkge1xuICAgICAgLy8gYXZvaWQgYWN0aW9uIHdoZW4gbm8gYXJndW1lbnRzIGFyZSBwYXNzZWRcbiAgICAgIGlmIChhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIGF2b2lkIHNtb290aCBiZWhhdmlvciBpZiBub3QgcmVxdWlyZWRcbiAgICAgIGlmIChzaG91bGRCYWlsT3V0KGFyZ3VtZW50c1swXSkgPT09IHRydWUpIHtcbiAgICAgICAgb3JpZ2luYWwuc2Nyb2xsLmNhbGwoXG4gICAgICAgICAgdyxcbiAgICAgICAgICBhcmd1bWVudHNbMF0ubGVmdCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICA/IGFyZ3VtZW50c1swXS5sZWZ0XG4gICAgICAgICAgICA6IHR5cGVvZiBhcmd1bWVudHNbMF0gIT09ICdvYmplY3QnXG4gICAgICAgICAgICAgID8gYXJndW1lbnRzWzBdXG4gICAgICAgICAgICAgIDogdy5zY3JvbGxYIHx8IHcucGFnZVhPZmZzZXQsXG4gICAgICAgICAgLy8gdXNlIHRvcCBwcm9wLCBzZWNvbmQgYXJndW1lbnQgaWYgcHJlc2VudCBvciBmYWxsYmFjayB0byBzY3JvbGxZXG4gICAgICAgICAgYXJndW1lbnRzWzBdLnRvcCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICA/IGFyZ3VtZW50c1swXS50b3BcbiAgICAgICAgICAgIDogYXJndW1lbnRzWzFdICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgICAgPyBhcmd1bWVudHNbMV1cbiAgICAgICAgICAgICAgOiB3LnNjcm9sbFkgfHwgdy5wYWdlWU9mZnNldFxuICAgICAgICApO1xuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gTEVUIFRIRSBTTU9PVEhORVNTIEJFR0lOIVxuICAgICAgc21vb3RoU2Nyb2xsLmNhbGwoXG4gICAgICAgIHcsXG4gICAgICAgIGQuYm9keSxcbiAgICAgICAgYXJndW1lbnRzWzBdLmxlZnQgIT09IHVuZGVmaW5lZFxuICAgICAgICAgID8gfn5hcmd1bWVudHNbMF0ubGVmdFxuICAgICAgICAgIDogdy5zY3JvbGxYIHx8IHcucGFnZVhPZmZzZXQsXG4gICAgICAgIGFyZ3VtZW50c1swXS50b3AgIT09IHVuZGVmaW5lZFxuICAgICAgICAgID8gfn5hcmd1bWVudHNbMF0udG9wXG4gICAgICAgICAgOiB3LnNjcm9sbFkgfHwgdy5wYWdlWU9mZnNldFxuICAgICAgKTtcbiAgICB9O1xuXG4gICAgLy8gdy5zY3JvbGxCeVxuICAgIHcuc2Nyb2xsQnkgPSBmdW5jdGlvbigpIHtcbiAgICAgIC8vIGF2b2lkIGFjdGlvbiB3aGVuIG5vIGFyZ3VtZW50cyBhcmUgcGFzc2VkXG4gICAgICBpZiAoYXJndW1lbnRzWzBdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBhdm9pZCBzbW9vdGggYmVoYXZpb3IgaWYgbm90IHJlcXVpcmVkXG4gICAgICBpZiAoc2hvdWxkQmFpbE91dChhcmd1bWVudHNbMF0pKSB7XG4gICAgICAgIG9yaWdpbmFsLnNjcm9sbEJ5LmNhbGwoXG4gICAgICAgICAgdyxcbiAgICAgICAgICBhcmd1bWVudHNbMF0ubGVmdCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICA/IGFyZ3VtZW50c1swXS5sZWZ0XG4gICAgICAgICAgICA6IHR5cGVvZiBhcmd1bWVudHNbMF0gIT09ICdvYmplY3QnID8gYXJndW1lbnRzWzBdIDogMCxcbiAgICAgICAgICBhcmd1bWVudHNbMF0udG9wICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8gYXJndW1lbnRzWzBdLnRvcFxuICAgICAgICAgICAgOiBhcmd1bWVudHNbMV0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1sxXSA6IDBcbiAgICAgICAgKTtcblxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIExFVCBUSEUgU01PT1RITkVTUyBCRUdJTiFcbiAgICAgIHNtb290aFNjcm9sbC5jYWxsKFxuICAgICAgICB3LFxuICAgICAgICBkLmJvZHksXG4gICAgICAgIH5+YXJndW1lbnRzWzBdLmxlZnQgKyAody5zY3JvbGxYIHx8IHcucGFnZVhPZmZzZXQpLFxuICAgICAgICB+fmFyZ3VtZW50c1swXS50b3AgKyAody5zY3JvbGxZIHx8IHcucGFnZVlPZmZzZXQpXG4gICAgICApO1xuICAgIH07XG5cbiAgICAvLyBFbGVtZW50LnByb3RvdHlwZS5zY3JvbGwgYW5kIEVsZW1lbnQucHJvdG90eXBlLnNjcm9sbFRvXG4gICAgRWxlbWVudC5wcm90b3R5cGUuc2Nyb2xsID0gRWxlbWVudC5wcm90b3R5cGUuc2Nyb2xsVG8gPSBmdW5jdGlvbigpIHtcbiAgICAgIC8vIGF2b2lkIGFjdGlvbiB3aGVuIG5vIGFyZ3VtZW50cyBhcmUgcGFzc2VkXG4gICAgICBpZiAoYXJndW1lbnRzWzBdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBhdm9pZCBzbW9vdGggYmVoYXZpb3IgaWYgbm90IHJlcXVpcmVkXG4gICAgICBpZiAoc2hvdWxkQmFpbE91dChhcmd1bWVudHNbMF0pID09PSB0cnVlKSB7XG4gICAgICAgIC8vIGlmIG9uZSBudW1iZXIgaXMgcGFzc2VkLCB0aHJvdyBlcnJvciB0byBtYXRjaCBGaXJlZm94IGltcGxlbWVudGF0aW9uXG4gICAgICAgIGlmICh0eXBlb2YgYXJndW1lbnRzWzBdID09PSAnbnVtYmVyJyAmJiBhcmd1bWVudHNbMV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHRocm93IG5ldyBTeW50YXhFcnJvcignVmFsdWUgY291bGQgbm90IGJlIGNvbnZlcnRlZCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgb3JpZ2luYWwuZWxlbWVudFNjcm9sbC5jYWxsKFxuICAgICAgICAgIHRoaXMsXG4gICAgICAgICAgLy8gdXNlIGxlZnQgcHJvcCwgZmlyc3QgbnVtYmVyIGFyZ3VtZW50IG9yIGZhbGxiYWNrIHRvIHNjcm9sbExlZnRcbiAgICAgICAgICBhcmd1bWVudHNbMF0ubGVmdCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICA/IH5+YXJndW1lbnRzWzBdLmxlZnRcbiAgICAgICAgICAgIDogdHlwZW9mIGFyZ3VtZW50c1swXSAhPT0gJ29iamVjdCcgPyB+fmFyZ3VtZW50c1swXSA6IHRoaXMuc2Nyb2xsTGVmdCxcbiAgICAgICAgICAvLyB1c2UgdG9wIHByb3AsIHNlY29uZCBhcmd1bWVudCBvciBmYWxsYmFjayB0byBzY3JvbGxUb3BcbiAgICAgICAgICBhcmd1bWVudHNbMF0udG9wICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8gfn5hcmd1bWVudHNbMF0udG9wXG4gICAgICAgICAgICA6IGFyZ3VtZW50c1sxXSAhPT0gdW5kZWZpbmVkID8gfn5hcmd1bWVudHNbMV0gOiB0aGlzLnNjcm9sbFRvcFxuICAgICAgICApO1xuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIGxlZnQgPSBhcmd1bWVudHNbMF0ubGVmdDtcbiAgICAgIHZhciB0b3AgPSBhcmd1bWVudHNbMF0udG9wO1xuXG4gICAgICAvLyBMRVQgVEhFIFNNT09USE5FU1MgQkVHSU4hXG4gICAgICBzbW9vdGhTY3JvbGwuY2FsbChcbiAgICAgICAgdGhpcyxcbiAgICAgICAgdGhpcyxcbiAgICAgICAgdHlwZW9mIGxlZnQgPT09ICd1bmRlZmluZWQnID8gdGhpcy5zY3JvbGxMZWZ0IDogfn5sZWZ0LFxuICAgICAgICB0eXBlb2YgdG9wID09PSAndW5kZWZpbmVkJyA/IHRoaXMuc2Nyb2xsVG9wIDogfn50b3BcbiAgICAgICk7XG4gICAgfTtcblxuICAgIC8vIEVsZW1lbnQucHJvdG90eXBlLnNjcm9sbEJ5XG4gICAgRWxlbWVudC5wcm90b3R5cGUuc2Nyb2xsQnkgPSBmdW5jdGlvbigpIHtcbiAgICAgIC8vIGF2b2lkIGFjdGlvbiB3aGVuIG5vIGFyZ3VtZW50cyBhcmUgcGFzc2VkXG4gICAgICBpZiAoYXJndW1lbnRzWzBdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBhdm9pZCBzbW9vdGggYmVoYXZpb3IgaWYgbm90IHJlcXVpcmVkXG4gICAgICBpZiAoc2hvdWxkQmFpbE91dChhcmd1bWVudHNbMF0pID09PSB0cnVlKSB7XG4gICAgICAgIG9yaWdpbmFsLmVsZW1lbnRTY3JvbGwuY2FsbChcbiAgICAgICAgICB0aGlzLFxuICAgICAgICAgIGFyZ3VtZW50c1swXS5sZWZ0ICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8gfn5hcmd1bWVudHNbMF0ubGVmdCArIHRoaXMuc2Nyb2xsTGVmdFxuICAgICAgICAgICAgOiB+fmFyZ3VtZW50c1swXSArIHRoaXMuc2Nyb2xsTGVmdCxcbiAgICAgICAgICBhcmd1bWVudHNbMF0udG9wICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8gfn5hcmd1bWVudHNbMF0udG9wICsgdGhpcy5zY3JvbGxUb3BcbiAgICAgICAgICAgIDogfn5hcmd1bWVudHNbMV0gKyB0aGlzLnNjcm9sbFRvcFxuICAgICAgICApO1xuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdGhpcy5zY3JvbGwoe1xuICAgICAgICBsZWZ0OiB+fmFyZ3VtZW50c1swXS5sZWZ0ICsgdGhpcy5zY3JvbGxMZWZ0LFxuICAgICAgICB0b3A6IH5+YXJndW1lbnRzWzBdLnRvcCArIHRoaXMuc2Nyb2xsVG9wLFxuICAgICAgICBiZWhhdmlvcjogYXJndW1lbnRzWzBdLmJlaGF2aW9yXG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgLy8gRWxlbWVudC5wcm90b3R5cGUuc2Nyb2xsSW50b1ZpZXdcbiAgICBFbGVtZW50LnByb3RvdHlwZS5zY3JvbGxJbnRvVmlldyA9IGZ1bmN0aW9uKCkge1xuICAgICAgLy8gYXZvaWQgc21vb3RoIGJlaGF2aW9yIGlmIG5vdCByZXF1aXJlZFxuICAgICAgaWYgKHNob3VsZEJhaWxPdXQoYXJndW1lbnRzWzBdKSA9PT0gdHJ1ZSkge1xuICAgICAgICBvcmlnaW5hbC5zY3JvbGxJbnRvVmlldy5jYWxsKFxuICAgICAgICAgIHRoaXMsXG4gICAgICAgICAgYXJndW1lbnRzWzBdID09PSB1bmRlZmluZWQgPyB0cnVlIDogYXJndW1lbnRzWzBdXG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBMRVQgVEhFIFNNT09USE5FU1MgQkVHSU4hXG4gICAgICB2YXIgc2Nyb2xsYWJsZVBhcmVudCA9IGZpbmRTY3JvbGxhYmxlUGFyZW50KHRoaXMpO1xuICAgICAgdmFyIHBhcmVudFJlY3RzID0gc2Nyb2xsYWJsZVBhcmVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgIHZhciBjbGllbnRSZWN0cyA9IHRoaXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cbiAgICAgIGlmIChzY3JvbGxhYmxlUGFyZW50ICE9PSBkLmJvZHkpIHtcbiAgICAgICAgLy8gcmV2ZWFsIGVsZW1lbnQgaW5zaWRlIHBhcmVudFxuICAgICAgICBzbW9vdGhTY3JvbGwuY2FsbChcbiAgICAgICAgICB0aGlzLFxuICAgICAgICAgIHNjcm9sbGFibGVQYXJlbnQsXG4gICAgICAgICAgc2Nyb2xsYWJsZVBhcmVudC5zY3JvbGxMZWZ0ICsgY2xpZW50UmVjdHMubGVmdCAtIHBhcmVudFJlY3RzLmxlZnQsXG4gICAgICAgICAgc2Nyb2xsYWJsZVBhcmVudC5zY3JvbGxUb3AgKyBjbGllbnRSZWN0cy50b3AgLSBwYXJlbnRSZWN0cy50b3BcbiAgICAgICAgKTtcblxuICAgICAgICAvLyByZXZlYWwgcGFyZW50IGluIHZpZXdwb3J0IHVubGVzcyBpcyBmaXhlZFxuICAgICAgICBpZiAody5nZXRDb21wdXRlZFN0eWxlKHNjcm9sbGFibGVQYXJlbnQpLnBvc2l0aW9uICE9PSAnZml4ZWQnKSB7XG4gICAgICAgICAgdy5zY3JvbGxCeSh7XG4gICAgICAgICAgICBsZWZ0OiBwYXJlbnRSZWN0cy5sZWZ0LFxuICAgICAgICAgICAgdG9wOiBwYXJlbnRSZWN0cy50b3AsXG4gICAgICAgICAgICBiZWhhdmlvcjogJ3Ntb290aCdcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gcmV2ZWFsIGVsZW1lbnQgaW4gdmlld3BvcnRcbiAgICAgICAgdy5zY3JvbGxCeSh7XG4gICAgICAgICAgbGVmdDogY2xpZW50UmVjdHMubGVmdCxcbiAgICAgICAgICB0b3A6IGNsaWVudFJlY3RzLnRvcCxcbiAgICAgICAgICBiZWhhdmlvcjogJ3Ntb290aCdcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIGlmICh0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAvLyBjb21tb25qc1xuICAgIG1vZHVsZS5leHBvcnRzID0geyBwb2x5ZmlsbDogcG9seWZpbGwgfTtcbiAgfSBlbHNlIHtcbiAgICAvLyBnbG9iYWxcbiAgICBwb2x5ZmlsbCgpO1xuICB9XG5cbn0oKSk7XG4iLCJjb25zdCBEQiA9ICdodHRwczovL25leHVzLWNhdGFsb2cuZmlyZWJhc2Vpby5jb20vcG9zdHMuanNvbj9hdXRoPTdnN3B5S0t5a04zTjVld3JJbWhPYVM2dndyRnNjNWZLa3JrOGVqemYnO1xuXG5jb25zdCAkbG9hZGluZyA9IEFycmF5LmZyb20oZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLmxvYWRpbmcnKSk7XG5jb25zdCAkYXJ0aWNsZUxpc3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnanMtbGlzdCcpO1xuY29uc3QgJG5hdiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdqcy1uYXYnKTtcbmNvbnN0ICRwYXJhbGxheCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5wYXJhbGxheCcpO1xuY29uc3QgJGNvbnRlbnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuY29udGVudCcpO1xuY29uc3QgJHRpdGxlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2pzLXRpdGxlJyk7XG5jb25zdCAkdXBBcnJvdyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdqcy1hcnJvdycpO1xuY29uc3QgJG1vZGFsID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLm1vZGFsJyk7XG5jb25zdCAkbGlnaHRib3ggPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcubGlnaHRib3gnKTtcbmNvbnN0ICR2aWV3ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmxpZ2h0Ym94LXZpZXcnKTtcbmNvbnN0IHNvcnRJZHMgPSBbJ2FydGlzdCcsICd0aXRsZSddO1xuXG5leHBvcnQgeyBcblx0REIsXG5cdCRsb2FkaW5nLFxuXHQkYXJ0aWNsZUxpc3QsIFxuXHQkbmF2LCBcblx0JHBhcmFsbGF4LFxuXHQkY29udGVudCxcblx0JHRpdGxlLFxuXHQkdXBBcnJvdyxcblx0JG1vZGFsLFxuXHQkbGlnaHRib3gsXG5cdCR2aWV3LFxuXHRzb3J0SWRzXG59OyIsImltcG9ydCBzbW9vdGhzY3JvbGwgZnJvbSAnc21vb3Roc2Nyb2xsLXBvbHlmaWxsJztcblxuaW1wb3J0IHsgYXJ0aWNsZVRlbXBsYXRlLCByZW5kZXJOYXZMZyB9IGZyb20gJy4vdGVtcGxhdGVzJztcbmltcG9ydCB7IGRlYm91bmNlLCBoaWRlTG9hZGluZywgc2Nyb2xsVG9Ub3AgfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IERCLCAkYXJ0aWNsZUxpc3QsIHNvcnRJZHMgfSBmcm9tICcuL2NvbnN0YW50cyc7XG5pbXBvcnQgeyBhdHRhY2hNb2RhbExpc3RlbmVycywgYXR0YWNoVXBBcnJvd0xpc3RlbmVycywgYXR0YWNoSW1hZ2VMaXN0ZW5lcnMsIG1ha2VBbHBoYWJldCwgbWFrZVNsaWRlciB9IGZyb20gJy4vbW9kdWxlcyc7XG5cbmxldCBzb3J0S2V5ID0gMDsgLy8gMCA9IGFydGlzdCwgMSA9IHRpdGxlXG5sZXQgZW50cmllcyA9IHsgYnlBdXRob3I6IFtdLCBieVRpdGxlOiBbXSB9O1xuXG5jb25zdCBzZXRVcFNvcnRCdXR0b25zID0gKCkgPT4ge1xuXHRzb3J0SWRzLmZvckVhY2goaWQgPT4ge1xuXHRcdGNvbnN0IGFsdCA9IGlkID09PSAnYXJ0aXN0JyA/ICd0aXRsZScgOiAnYXJ0aXN0JztcblxuXHRcdGNvbnN0ICRidXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChganMtYnktJHtpZH1gKTtcblx0XHRjb25zdCAkYWx0QnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoYGpzLWJ5LSR7YWx0fWApO1xuXG5cdFx0JGJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHRcdHNjcm9sbFRvVG9wKCk7XG5cdFx0XHRzb3J0S2V5ID0gIXNvcnRLZXk7XG5cdFx0XHRyZW5kZXJFbnRyaWVzKCk7XG5cblx0XHRcdCRidXR0b24uY2xhc3NMaXN0LmFkZCgnYWN0aXZlJyk7XG5cdFx0XHQkYWx0QnV0dG9uLmNsYXNzTGlzdC5yZW1vdmUoJ2FjdGl2ZScpO1xuXHRcdH0pXG5cdH0pO1xufTtcblxuY29uc3QgcmVuZGVyRW50cmllcyA9ICgpID0+IHtcblx0Y29uc3QgZW50cmllc0xpc3QgPSBzb3J0S2V5ID8gZW50cmllcy5ieVRpdGxlIDogZW50cmllcy5ieUF1dGhvcjtcblxuXHQkYXJ0aWNsZUxpc3QuaW5uZXJIVE1MID0gJyc7XG5cblx0ZW50cmllc0xpc3QuZm9yRWFjaCgoZW50cnksIGkpID0+IHtcblx0XHQkYXJ0aWNsZUxpc3QuaW5zZXJ0QWRqYWNlbnRIVE1MKCdiZWZvcmVlbmQnLCBhcnRpY2xlVGVtcGxhdGUoZW50cnksIGkpKTtcblx0XHRtYWtlU2xpZGVyKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGBzbGlkZXItJHtpfWApKTtcblx0fSk7XG5cblx0YXR0YWNoSW1hZ2VMaXN0ZW5lcnMoKTtcblx0bWFrZUFscGhhYmV0KHNvcnRLZXkpO1xufTtcblxuY29uc3Qgc2V0RGF0YUFuZFNvcnRCeVRpdGxlID0gKGRhdGEpID0+IHtcblx0ZW50cmllcy5ieUF1dGhvciA9IGRhdGE7XG5cdGVudHJpZXMuYnlUaXRsZSA9IGRhdGEuc2xpY2UoKTsgLy8gY29waWVzIGRhdGEgZm9yIGJ5VGl0bGUgc29ydFxuXG5cdGVudHJpZXMuYnlUaXRsZS5zb3J0KChhLCBiKSA9PiB7XG5cdFx0bGV0IGFUaXRsZSA9IGEudGl0bGVbMF0udG9VcHBlckNhc2UoKTtcblx0XHRsZXQgYlRpdGxlID0gYi50aXRsZVswXS50b1VwcGVyQ2FzZSgpO1xuXHRcdGlmIChhVGl0bGUgPiBiVGl0bGUpIHJldHVybiAxO1xuXHRcdGVsc2UgaWYgKGFUaXRsZSA8IGJUaXRsZSkgcmV0dXJuIC0xO1xuXHRcdGVsc2UgcmV0dXJuIDA7XG5cdH0pO1xufTtcblxuY29uc3QgZmV0Y2hEYXRhID0gKCkgPT4ge1xuXHRmZXRjaChEQikudGhlbihyZXMgPT4gcmVzLmpzb24oKSlcblx0LnRoZW4oZGF0YSA9PiB7XG5cdFx0c2V0RGF0YUFuZFNvcnRCeVRpdGxlKGRhdGEpO1xuXHRcdHJlbmRlckVudHJpZXMoKTtcblx0XHRoaWRlTG9hZGluZygpO1xuXHR9KVxuXHQuY2F0Y2goZXJyID0+IGNvbnNvbGUud2FybihlcnIpKTtcbn07XG5cbmNvbnN0IGluaXQgPSAoKSA9PiB7XG5cdHNtb290aHNjcm9sbC5wb2x5ZmlsbCgpO1xuXHRmZXRjaERhdGEoKTtcblx0cmVuZGVyTmF2TGcoKTtcblx0c2V0VXBTb3J0QnV0dG9ucygpO1xuXHRhdHRhY2hVcEFycm93TGlzdGVuZXJzKCk7XG5cdGF0dGFjaE1vZGFsTGlzdGVuZXJzKCk7XG59O1xuXG5pbml0KCk7XG4iLCJpbXBvcnQgeyAkdmlldywgJGxpZ2h0Ym94IH0gZnJvbSAnLi4vY29uc3RhbnRzJztcblxubGV0IGxpZ2h0Ym94ID0gZmFsc2U7XG5cbmNvbnN0IGF0dGFjaEltYWdlTGlzdGVuZXJzID0gKCkgPT4ge1xuXHRjb25zdCAkaW1hZ2VzID0gQXJyYXkuZnJvbShkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuYXJ0aWNsZS1pbWcnKSk7XG5cblx0JGltYWdlcy5mb3JFYWNoKGltZyA9PiB7XG5cdFx0aW1nLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGV2dCkgPT4ge1xuXHRcdFx0aWYgKCFsaWdodGJveCkge1xuXHRcdFx0XHRsZXQgc3JjID0gaW1nLnNyYztcblx0XHRcdFx0XG5cdFx0XHRcdCRsaWdodGJveC5jbGFzc0xpc3QuYWRkKCdzaG93LWltZycpO1xuXHRcdFx0XHQkdmlldy5zZXRBdHRyaWJ1dGUoJ3N0eWxlJywgYGJhY2tncm91bmQtaW1hZ2U6IHVybCgke3NyY30pYCk7XG5cdFx0XHRcdGxpZ2h0Ym94ID0gdHJ1ZTtcblx0XHRcdH1cblx0XHR9KTtcblx0fSk7XG5cblx0JHZpZXcuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0aWYgKGxpZ2h0Ym94KSB7XG5cdFx0XHQkbGlnaHRib3guY2xhc3NMaXN0LnJlbW92ZSgnc2hvdy1pbWcnKTtcblx0XHRcdGxpZ2h0Ym94ID0gZmFsc2U7XG5cdFx0fVxuXHR9KTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGF0dGFjaEltYWdlTGlzdGVuZXJzOyIsImltcG9ydCB7ICRtb2RhbCB9IGZyb20gJy4uL2NvbnN0YW50cyc7XG5cbmxldCBtb2RhbCA9IGZhbHNlO1xuY29uc3QgYXR0YWNoTW9kYWxMaXN0ZW5lcnMgPSAoKSA9PiB7XG5cdGNvbnN0ICRmaW5kID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2pzLWZpbmQnKTtcblx0XG5cdCRmaW5kLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuXHRcdCRtb2RhbC5jbGFzc0xpc3QuYWRkKCdzaG93Jyk7XG5cdFx0bW9kYWwgPSB0cnVlO1xuXHR9KTtcblxuXHQkbW9kYWwuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0JG1vZGFsLmNsYXNzTGlzdC5yZW1vdmUoJ3Nob3cnKTtcblx0XHRtb2RhbCA9IGZhbHNlO1xuXHR9KTtcblxuXHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsICgpID0+IHtcblx0XHRpZiAobW9kYWwpIHtcblx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge1xuXHRcdFx0XHQkbW9kYWwuY2xhc3NMaXN0LnJlbW92ZSgnc2hvdycpO1xuXHRcdFx0XHRtb2RhbCA9IGZhbHNlO1xuXHRcdFx0fSwgNjAwKTtcblx0XHR9O1xuXHR9KTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGF0dGFjaE1vZGFsTGlzdGVuZXJzOyIsImltcG9ydCB7ICR0aXRsZSwgJHBhcmFsbGF4LCAkdXBBcnJvdyB9IGZyb20gJy4uL2NvbnN0YW50cyc7XG5pbXBvcnQgeyBzY3JvbGxUb1RvcCB9IGZyb20gJy4uL3V0aWxzJztcblxubGV0IHByZXY7XG5sZXQgY3VycmVudCA9IDA7XG5sZXQgaXNTaG93aW5nID0gZmFsc2U7XG5cbmNvbnN0IGF0dGFjaFVwQXJyb3dMaXN0ZW5lcnMgPSAoKSA9PiB7XG5cdCRwYXJhbGxheC5hZGRFdmVudExpc3RlbmVyKCdzY3JvbGwnLCAoKSA9PiB7XG5cdFx0bGV0IHkgPSAkdGl0bGUuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkueTtcblxuXHRcdGlmIChjdXJyZW50ICE9PSB5KSB7XG5cdFx0XHRwcmV2ID0gY3VycmVudDtcblx0XHRcdGN1cnJlbnQgPSB5O1xuXHRcdH07XG5cblx0XHRpZiAoeSA8PSAtNTAgJiYgIWlzU2hvd2luZykge1xuXHRcdFx0JHVwQXJyb3cuY2xhc3NMaXN0LmFkZCgnc2hvdycpO1xuXHRcdFx0aXNTaG93aW5nID0gdHJ1ZTtcblx0XHR9IGVsc2UgaWYgKHkgPiAtNTAgJiYgaXNTaG93aW5nKSB7XG5cdFx0XHQkdXBBcnJvdy5jbGFzc0xpc3QucmVtb3ZlKCdzaG93Jyk7XG5cdFx0XHRpc1Nob3dpbmcgPSBmYWxzZTtcblx0XHR9XG5cdH0pO1xuXG5cdCR1cEFycm93LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4gc2Nyb2xsVG9Ub3AoKSk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCBhdHRhY2hVcEFycm93TGlzdGVuZXJzOyIsImltcG9ydCBhdHRhY2hNb2RhbExpc3RlbmVycyBmcm9tICcuL2F0dGFjaE1vZGFsTGlzdGVuZXJzJztcbmltcG9ydCBhdHRhY2hVcEFycm93TGlzdGVuZXJzIGZyb20gJy4vYXR0YWNoVXBBcnJvd0xpc3RlbmVycyc7XG5pbXBvcnQgYXR0YWNoSW1hZ2VMaXN0ZW5lcnMgZnJvbSAnLi9hdHRhY2hJbWFnZUxpc3RlbmVycyc7XG5pbXBvcnQgbWFrZUFscGhhYmV0IGZyb20gJy4vbWFrZUFscGhhYmV0JztcbmltcG9ydCBtYWtlU2xpZGVyIGZyb20gJy4vbWFrZVNsaWRlcic7XG5cbmV4cG9ydCB7IFxuXHRhdHRhY2hNb2RhbExpc3RlbmVycywgXG5cdGF0dGFjaFVwQXJyb3dMaXN0ZW5lcnMsXG5cdGF0dGFjaEltYWdlTGlzdGVuZXJzLFxuXHRtYWtlQWxwaGFiZXQsIFxuXHRtYWtlU2xpZGVyIFxufTsiLCJjb25zdCBhbHBoYWJldCA9IFsnYScsICdiJywgJ2MnLCAnZCcsICdlJywgJ2YnLCAnZycsICdoJywgJ2knLCAnaicsICdrJywgJ2wnLCAnbScsICduJywgJ28nLCAncCcsICdyJywgJ3MnLCAndCcsICd1JywgJ3YnLCAndycsICd5JywgJ3onXTtcblxuY29uc3QgbWFrZUFscGhhYmV0ID0gKHNvcnRLZXkpID0+IHtcblx0Y29uc3QgZmluZEZpcnN0RW50cnkgPSAoY2hhcikgPT4ge1xuXHRcdGNvbnN0IHNlbGVjdG9yID0gc29ydEtleSA/ICcuanMtZW50cnktdGl0bGUnIDogJy5qcy1lbnRyeS1hcnRpc3QnO1xuXHRcdGNvbnN0IHByZXZTZWxlY3RvciA9ICFzb3J0S2V5ID8gJy5qcy1lbnRyeS10aXRsZScgOiAnLmpzLWVudHJ5LWFydGlzdCc7XG5cblx0XHRjb25zdCAkZW50cmllcyA9IEFycmF5LmZyb20oZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChzZWxlY3RvcikpO1xuXHRcdGNvbnN0ICRwcmV2RW50cmllcyA9IEFycmF5LmZyb20oZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChwcmV2U2VsZWN0b3IpKTtcblxuXHRcdCRwcmV2RW50cmllcy5mb3JFYWNoKGVudHJ5ID0+IGVudHJ5LnJlbW92ZUF0dHJpYnV0ZSgnbmFtZScpKTtcblxuXHRcdHJldHVybiAkZW50cmllcy5maW5kKGVudHJ5ID0+IHtcblx0XHRcdGxldCBub2RlID0gZW50cnkubmV4dEVsZW1lbnRTaWJsaW5nO1xuXHRcdFx0cmV0dXJuIG5vZGUuaW5uZXJIVE1MWzBdID09PSBjaGFyIHx8IG5vZGUuaW5uZXJIVE1MWzBdID09PSBjaGFyLnRvVXBwZXJDYXNlKCk7XG5cdFx0fSk7XG5cdH07XG5cblx0Y29uc3QgYXR0YWNoQW5jaG9yTGlzdGVuZXIgPSAoJGFuY2hvciwgbGV0dGVyKSA9PiB7XG5cdFx0JGFuY2hvci5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHRcdGNvbnN0IGxldHRlck5vZGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChsZXR0ZXIpO1xuXHRcdFx0bGV0IHRhcmdldDtcblxuXHRcdFx0aWYgKCFzb3J0S2V5KSB7XG5cdFx0XHRcdHRhcmdldCA9IGxldHRlciA9PT0gJ2EnID8gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2FuY2hvci10YXJnZXQnKSA6IGxldHRlck5vZGUucGFyZW50RWxlbWVudC5wYXJlbnRFbGVtZW50LnBhcmVudEVsZW1lbnQucGFyZW50RWxlbWVudC5wcmV2aW91c0VsZW1lbnRTaWJsaW5nLnF1ZXJ5U2VsZWN0b3IoJy5qcy1hcnRpY2xlLWFuY2hvci10YXJnZXQnKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRhcmdldCA9IGxldHRlciA9PT0gJ2EnID8gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2FuY2hvci10YXJnZXQnKSA6IGxldHRlck5vZGUucGFyZW50RWxlbWVudC5wYXJlbnRFbGVtZW50LnBhcmVudEVsZW1lbnQucHJldmlvdXNFbGVtZW50U2libGluZy5xdWVyeVNlbGVjdG9yKCcuanMtYXJ0aWNsZS1hbmNob3ItdGFyZ2V0Jyk7XG5cdFx0XHR9O1xuXG5cdFx0XHR0YXJnZXQuc2Nyb2xsSW50b1ZpZXcoe2JlaGF2aW9yOiBcInNtb290aFwiLCBibG9jazogXCJzdGFydFwifSk7XG5cdFx0fSk7XG5cdH07XG5cblx0bGV0IGFjdGl2ZUVudHJpZXMgPSB7fTtcblx0bGV0ICRvdXRlciA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5hbHBoYWJldF9fbGV0dGVycycpO1xuXHQkb3V0ZXIuaW5uZXJIVE1MID0gJyc7XG5cblx0YWxwaGFiZXQuZm9yRWFjaChsZXR0ZXIgPT4ge1xuXHRcdGxldCAkZmlyc3RFbnRyeSA9IGZpbmRGaXJzdEVudHJ5KGxldHRlcik7XG5cdFx0bGV0ICRhbmNob3IgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG5cblx0XHRpZiAoISRmaXJzdEVudHJ5KSByZXR1cm47XG5cblx0XHQkZmlyc3RFbnRyeS5pZCA9IGxldHRlcjtcblx0XHQkYW5jaG9yLmlubmVySFRNTCA9IGxldHRlci50b1VwcGVyQ2FzZSgpO1xuXHRcdCRhbmNob3IuY2xhc3NOYW1lID0gJ2FscGhhYmV0X19sZXR0ZXItYW5jaG9yJztcblxuXHRcdGF0dGFjaEFuY2hvckxpc3RlbmVyKCRhbmNob3IsIGxldHRlcik7XG5cdFx0JG91dGVyLmFwcGVuZENoaWxkKCRhbmNob3IpO1xuXHR9KTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IG1ha2VBbHBoYWJldDsiLCJjb25zdCBtYWtlU2xpZGVyID0gKCRzbGlkZXIpID0+IHtcblx0Y29uc3QgJGFycm93TmV4dCA9ICRzbGlkZXIucGFyZW50RWxlbWVudC5xdWVyeVNlbGVjdG9yKCcuYXJyb3ctbmV4dCcpO1xuXHRjb25zdCAkYXJyb3dQcmV2ID0gJHNsaWRlci5wYXJlbnRFbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJy5hcnJvdy1wcmV2Jyk7XG5cblx0bGV0IGN1cnJlbnQgPSAkc2xpZGVyLmZpcnN0RWxlbWVudENoaWxkO1xuXHQkYXJyb3dOZXh0LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuXHRcdGNvbnN0IG5leHQgPSBjdXJyZW50Lm5leHRFbGVtZW50U2libGluZztcblx0XHRpZiAobmV4dCkge1xuXHRcdFx0bmV4dC5zY3JvbGxJbnRvVmlldyh7YmVoYXZpb3I6IFwic21vb3RoXCIsIGJsb2NrOiBcIm5lYXJlc3RcIiwgaW5saW5lOiBcImNlbnRlclwifSk7XG5cdFx0XHRjdXJyZW50ID0gbmV4dDtcblx0XHR9XG5cdH0pO1xuXG5cdCRhcnJvd1ByZXYuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0Y29uc3QgcHJldiA9IGN1cnJlbnQucHJldmlvdXNFbGVtZW50U2libGluZztcblx0XHRpZiAocHJldikge1xuXHRcdFx0cHJldi5zY3JvbGxJbnRvVmlldyh7YmVoYXZpb3I6IFwic21vb3RoXCIsIGJsb2NrOiBcIm5lYXJlc3RcIiwgaW5saW5lOiBcImNlbnRlclwifSk7XG5cdFx0XHRjdXJyZW50ID0gcHJldjtcblx0XHR9XG5cdH0pXG59O1xuXG5leHBvcnQgZGVmYXVsdCBtYWtlU2xpZGVyOyIsImNvbnN0IGltYWdlVGVtcGxhdGUgPSAoaW1hZ2UpID0+IGA8aW1nIGNsYXNzPVwiYXJ0aWNsZS1pbWdcIiBzcmM9XCIuLi8uLi9hc3NldHMvaW1hZ2VzLyR7aW1hZ2V9XCI+PC9pbWc+YDtcblxuY29uc3QgYXJ0aWNsZVRlbXBsYXRlID0gKGVudHJ5LCBpKSA9PiB7XG5cdGNvbnN0IHsgdGl0bGUsIGZpcnN0TmFtZSwgbGFzdE5hbWUsIGltYWdlcywgZGVzY3JpcHRpb24sIGRldGFpbCB9ID0gZW50cnk7XG5cblx0Y29uc3QgaW1hZ2VIVE1MID0gaW1hZ2VzLmxlbmd0aCA/IFxuXHRcdGltYWdlcy5tYXAoaW1hZ2UgPT4gaW1hZ2VUZW1wbGF0ZShpbWFnZSkpLmpvaW4oJycpIDogJyc7XG5cblx0cmV0dXJuICBgXG5cdFx0PGFydGljbGUgY2xhc3M9XCJhcnRpY2xlX19vdXRlclwiPlxuXHRcdFx0PGRpdiBjbGFzcz1cImFydGljbGVfX2lubmVyXCI+XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlX19oZWFkaW5nXCI+XG5cdFx0XHRcdFx0PGEgY2xhc3M9XCJqcy1lbnRyeS10aXRsZVwiPjwvYT5cblx0XHRcdFx0XHQ8aDIgY2xhc3M9XCJhcnRpY2xlLWhlYWRpbmdfX3RpdGxlXCI+JHt0aXRsZX08L2gyPlxuXHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlLWhlYWRpbmdfX25hbWVcIj5cblx0XHRcdFx0XHRcdDxzcGFuIGNsYXNzPVwiYXJ0aWNsZS1oZWFkaW5nX19uYW1lLS1maXJzdFwiPiR7Zmlyc3ROYW1lfTwvc3Bhbj5cblx0XHRcdFx0XHRcdDxhIGNsYXNzPVwianMtZW50cnktYXJ0aXN0XCI+PC9hPlxuXHRcdFx0XHRcdFx0PHNwYW4gY2xhc3M9XCJhcnRpY2xlLWhlYWRpbmdfX25hbWUtLWxhc3RcIj4ke2xhc3ROYW1lfTwvc3Bhbj5cblx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0PC9kaXY+XHRcblx0XHRcdFx0PGRpdiBjbGFzcz1cImFydGljbGVfX3NsaWRlci1vdXRlclwiPlxuXHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlX19zbGlkZXItaW5uZXJcIiBpZD1cInNsaWRlci0ke2l9XCI+XG5cdFx0XHRcdFx0XHQke2ltYWdlSFRNTH1cblx0XHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlLWRlc2NyaXB0aW9uX19vdXRlclwiPlxuXHRcdFx0XHRcdFx0XHQ8ZGl2IGNsYXNzPVwiYXJ0aWNsZS1kZXNjcmlwdGlvblwiPiR7ZGVzY3JpcHRpb259PC9kaXY+XG5cdFx0XHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlLWRldGFpbFwiPiR7ZGV0YWlsfTwvZGl2PlxuXHRcdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdFx0PGRpdiBjbGFzcz1cImFydGljbGVfX3Njcm9sbC1jb250cm9sc1wiPlxuXHRcdFx0XHRcdFx0PHNwYW4gY2xhc3M9XCJjb250cm9scyBhcnJvdy1wcmV2XCI+4oaQPC9zcGFuPiBcblx0XHRcdFx0XHRcdDxzcGFuIGNsYXNzPVwiY29udHJvbHMgYXJyb3ctbmV4dFwiPuKGkjwvc3Bhbj5cblx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0XHQ8cCBjbGFzcz1cImpzLWFydGljbGUtYW5jaG9yLXRhcmdldFwiPjwvcD5cblx0XHRcdDwvZGl2PlxuXHRcdDwvYXJ0aWNsZT5cblx0YFxufTtcblxuZXhwb3J0IGRlZmF1bHQgYXJ0aWNsZVRlbXBsYXRlOyIsImltcG9ydCBhcnRpY2xlVGVtcGxhdGUgZnJvbSAnLi9hcnRpY2xlJztcbmltcG9ydCByZW5kZXJOYXZMZyBmcm9tICcuL25hdkxnJztcblxuZXhwb3J0IHsgYXJ0aWNsZVRlbXBsYXRlLCByZW5kZXJOYXZMZyB9OyIsImNvbnN0IHRlbXBsYXRlID0gXG5cdGA8ZGl2IGNsYXNzPVwibmF2X19pbm5lclwiPlxuXHRcdDxkaXYgY2xhc3M9XCJuYXZfX3NvcnQtYnlcIj5cblx0XHRcdDxzcGFuIGNsYXNzPVwic29ydC1ieV9fdGl0bGVcIj5Tb3J0IGJ5PC9zcGFuPlxuXHRcdFx0PGJ1dHRvbiBjbGFzcz1cInNvcnQtYnkgc29ydC1ieV9fYnktYXJ0aXN0IGFjdGl2ZVwiIGlkPVwianMtYnktYXJ0aXN0XCI+QXJ0aXN0PC9idXR0b24+XG5cdFx0XHQ8c3BhbiBjbGFzcz1cInNvcnQtYnlfX2RpdmlkZXJcIj4gfCA8L3NwYW4+XG5cdFx0XHQ8YnV0dG9uIGNsYXNzPVwic29ydC1ieSBzb3J0LWJ5X19ieS10aXRsZVwiIGlkPVwianMtYnktdGl0bGVcIj5UaXRsZTwvYnV0dG9uPlxuXHRcdFx0PHNwYW4gY2xhc3M9XCJmaW5kXCIgaWQ9XCJqcy1maW5kXCI+XG5cdFx0XHRcdCg8c3BhbiBjbGFzcz1cImZpbmQtLWlubmVyXCI+JiM4OTg0O0Y8L3NwYW4+KVxuXHRcdFx0PC9zcGFuPlxuXHRcdDwvZGl2PlxuXHRcdDxkaXYgY2xhc3M9XCJuYXZfX2FscGhhYmV0XCI+XG5cdFx0XHQ8c3BhbiBjbGFzcz1cImFscGhhYmV0X190aXRsZVwiPkdvIHRvPC9zcGFuPlxuXHRcdFx0PGRpdiBjbGFzcz1cImFscGhhYmV0X19sZXR0ZXJzXCI+PC9kaXY+XG5cdFx0PC9kaXY+XG5cdDwvZGl2PmA7XG5cbmNvbnN0IHJlbmRlck5hdkxnID0gKCkgPT4ge1xuXHRsZXQgbmF2T3V0ZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnanMtbmF2Jyk7XG5cdG5hdk91dGVyLmlubmVySFRNTCA9IHRlbXBsYXRlO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgcmVuZGVyTmF2TGc7IiwiaW1wb3J0IHsgJGxvYWRpbmcsICRuYXYsICRwYXJhbGxheCwgJGNvbnRlbnQsICR0aXRsZSwgJGFycm93LCAkbW9kYWwsICRsaWdodGJveCwgJHZpZXcgfSBmcm9tICcuLi9jb25zdGFudHMnO1xuXG5jb25zdCBkZWJvdW5jZSA9IChmbiwgdGltZSkgPT4ge1xuICBsZXQgdGltZW91dDtcblxuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgY29uc3QgZnVuY3Rpb25DYWxsID0gKCkgPT4gZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICBcbiAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgdGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb25DYWxsLCB0aW1lKTtcbiAgfVxufTtcblxuY29uc3QgaGlkZUxvYWRpbmcgPSAoKSA9PiB7XG5cdCRsb2FkaW5nLmZvckVhY2goZWxlbSA9PiBlbGVtLmNsYXNzTGlzdC5hZGQoJ3JlYWR5JykpO1xuXHQkbmF2LmNsYXNzTGlzdC5hZGQoJ3JlYWR5Jyk7XG59O1xuXG5jb25zdCBzY3JvbGxUb1RvcCA9ICgpID0+IHtcblx0bGV0IHRvcCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhbmNob3ItdGFyZ2V0Jyk7XG5cdHRvcC5zY3JvbGxJbnRvVmlldyh7YmVoYXZpb3I6IFwic21vb3RoXCIsIGJsb2NrOiBcInN0YXJ0XCJ9KTtcbn07XG5cbmV4cG9ydCB7IGRlYm91bmNlLCBoaWRlTG9hZGluZywgc2Nyb2xsVG9Ub3AgfTsiXSwicHJlRXhpc3RpbmdDb21tZW50IjoiLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9dXRmLTg7YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0p6YjNWeVkyVnpJanBiSW01dlpHVmZiVzlrZFd4bGN5OWljbTkzYzJWeUxYQmhZMnN2WDNCeVpXeDFaR1V1YW5NaUxDSnViMlJsWDIxdlpIVnNaWE12YzIxdmIzUm9jMk55YjJ4c0xYQnZiSGxtYVd4c0wyUnBjM1F2YzIxdmIzUm9jMk55YjJ4c0xtcHpJaXdpYzNKakwycHpMMk52Ym5OMFlXNTBjeTVxY3lJc0luTnlZeTlxY3k5cGJtUmxlQzVxY3lJc0luTnlZeTlxY3k5dGIyUjFiR1Z6TDJGMGRHRmphRWx0WVdkbFRHbHpkR1Z1WlhKekxtcHpJaXdpYzNKakwycHpMMjF2WkhWc1pYTXZZWFIwWVdOb1RXOWtZV3hNYVhOMFpXNWxjbk11YW5NaUxDSnpjbU12YW5NdmJXOWtkV3hsY3k5aGRIUmhZMmhWY0VGeWNtOTNUR2x6ZEdWdVpYSnpMbXB6SWl3aWMzSmpMMnB6TDIxdlpIVnNaWE12YVc1a1pYZ3Vhbk1pTENKemNtTXZhbk12Ylc5a2RXeGxjeTl0WVd0bFFXeHdhR0ZpWlhRdWFuTWlMQ0p6Y21NdmFuTXZiVzlrZFd4bGN5OXRZV3RsVTJ4cFpHVnlMbXB6SWl3aWMzSmpMMnB6TDNSbGJYQnNZWFJsY3k5aGNuUnBZMnhsTG1weklpd2ljM0pqTDJwekwzUmxiWEJzWVhSbGN5OXBibVJsZUM1cWN5SXNJbk55WXk5cWN5OTBaVzF3YkdGMFpYTXZibUYyVEdjdWFuTWlMQ0p6Y21NdmFuTXZkWFJwYkhNdmFXNWtaWGd1YW5NaVhTd2libUZ0WlhNaU9sdGRMQ0p0WVhCd2FXNW5jeUk2SWtGQlFVRTdRVU5CUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CT3pzN096czdPMEZEZG1KQkxFbEJRVTBzUzBGQlN5d3JSa0ZCV0RzN1FVRkZRU3hKUVVGTkxGZEJRVmNzVFVGQlRTeEpRVUZPTEVOQlFWY3NVMEZCVXl4blFrRkJWQ3hEUVVFd1FpeFZRVUV4UWl4RFFVRllMRU5CUVdwQ08wRkJRMEVzU1VGQlRTeGxRVUZsTEZOQlFWTXNZMEZCVkN4RFFVRjNRaXhUUVVGNFFpeERRVUZ5UWp0QlFVTkJMRWxCUVUwc1QwRkJUeXhUUVVGVExHTkJRVlFzUTBGQmQwSXNVVUZCZUVJc1EwRkJZanRCUVVOQkxFbEJRVTBzV1VGQldTeFRRVUZUTEdGQlFWUXNRMEZCZFVJc1YwRkJka0lzUTBGQmJFSTdRVUZEUVN4SlFVRk5MRmRCUVZjc1UwRkJVeXhoUVVGVUxFTkJRWFZDTEZWQlFYWkNMRU5CUVdwQ08wRkJRMEVzU1VGQlRTeFRRVUZUTEZOQlFWTXNZMEZCVkN4RFFVRjNRaXhWUVVGNFFpeERRVUZtTzBGQlEwRXNTVUZCVFN4WFFVRlhMRk5CUVZNc1kwRkJWQ3hEUVVGM1FpeFZRVUY0UWl4RFFVRnFRanRCUVVOQkxFbEJRVTBzVTBGQlV5eFRRVUZUTEdGQlFWUXNRMEZCZFVJc1VVRkJka0lzUTBGQlpqdEJRVU5CTEVsQlFVMHNXVUZCV1N4VFFVRlRMR0ZCUVZRc1EwRkJkVUlzVjBGQmRrSXNRMEZCYkVJN1FVRkRRU3hKUVVGTkxGRkJRVkVzVTBGQlV5eGhRVUZVTEVOQlFYVkNMR2RDUVVGMlFpeERRVUZrTzBGQlEwRXNTVUZCVFN4VlFVRlZMRU5CUVVNc1VVRkJSQ3hGUVVGWExFOUJRVmdzUTBGQmFFSTdPMUZCUjBNc1JTeEhRVUZCTEVVN1VVRkRRU3hSTEVkQlFVRXNVVHRSUVVOQkxGa3NSMEZCUVN4Wk8xRkJRMEVzU1N4SFFVRkJMRWs3VVVGRFFTeFRMRWRCUVVFc1V6dFJRVU5CTEZFc1IwRkJRU3hSTzFGQlEwRXNUU3hIUVVGQkxFMDdVVUZEUVN4UkxFZEJRVUVzVVR0UlFVTkJMRTBzUjBGQlFTeE5PMUZCUTBFc1V5eEhRVUZCTEZNN1VVRkRRU3hMTEVkQlFVRXNTenRSUVVOQkxFOHNSMEZCUVN4UE96czdPenRCUXpGQ1JEczdPenRCUVVWQk96dEJRVU5CT3p0QlFVTkJPenRCUVVOQk96czdPMEZCUlVFc1NVRkJTU3hWUVVGVkxFTkJRV1FzUXl4RFFVRnBRanRCUVVOcVFpeEpRVUZKTEZWQlFWVXNSVUZCUlN4VlFVRlZMRVZCUVZvc1JVRkJaMElzVTBGQlV5eEZRVUY2UWl4RlFVRmtPenRCUVVWQkxFbEJRVTBzYlVKQlFXMUNMRk5CUVc1Q0xHZENRVUZ0UWl4SFFVRk5PMEZCUXpsQ0xHOUNRVUZSTEU5QlFWSXNRMEZCWjBJc1kwRkJUVHRCUVVOeVFpeE5RVUZOTEUxQlFVMHNUMEZCVHl4UlFVRlFMRWRCUVd0Q0xFOUJRV3hDTEVkQlFUUkNMRkZCUVhoRE96dEJRVVZCTEUxQlFVMHNWVUZCVlN4VFFVRlRMR05CUVZRc1dVRkJhVU1zUlVGQmFrTXNRMEZCYUVJN1FVRkRRU3hOUVVGTkxHRkJRV0VzVTBGQlV5eGpRVUZVTEZsQlFXbERMRWRCUVdwRExFTkJRVzVDT3p0QlFVVkJMRlZCUVZFc1owSkJRVklzUTBGQmVVSXNUMEZCZWtJc1JVRkJhME1zV1VGQlRUdEJRVU4yUXp0QlFVTkJMR0ZCUVZVc1EwRkJReXhQUVVGWU8wRkJRMEU3TzBGQlJVRXNWMEZCVVN4VFFVRlNMRU5CUVd0Q0xFZEJRV3hDTEVOQlFYTkNMRkZCUVhSQ08wRkJRMEVzWTBGQlZ5eFRRVUZZTEVOQlFYRkNMRTFCUVhKQ0xFTkJRVFJDTEZGQlFUVkNPMEZCUTBFc1IwRlFSRHRCUVZGQkxFVkJaRVE3UVVGbFFTeERRV2hDUkRzN1FVRnJRa0VzU1VGQlRTeG5Ra0ZCWjBJc1UwRkJhRUlzWVVGQlowSXNSMEZCVFR0QlFVTXpRaXhMUVVGTkxHTkJRV01zVlVGQlZTeFJRVUZSTEU5QlFXeENMRWRCUVRSQ0xGRkJRVkVzVVVGQmVFUTdPMEZCUlVFc2VVSkJRV0VzVTBGQllpeEhRVUY1UWl4RlFVRjZRanM3UVVGRlFTeGhRVUZaTEU5QlFWb3NRMEZCYjBJc1ZVRkJReXhMUVVGRUxFVkJRVkVzUTBGQlVpeEZRVUZqTzBGQlEycERMREJDUVVGaExHdENRVUZpTEVOQlFXZERMRmRCUVdoRExFVkJRVFpETEdkRFFVRm5RaXhMUVVGb1FpeEZRVUYxUWl4RFFVRjJRaXhEUVVFM1F6dEJRVU5CTERKQ1FVRlhMRk5CUVZNc1kwRkJWQ3hoUVVGclF5eERRVUZzUXl4RFFVRllPMEZCUTBFc1JVRklSRHM3UVVGTFFUdEJRVU5CTERSQ1FVRmhMRTlCUVdJN1FVRkRRU3hEUVZwRU96dEJRV05CTEVsQlFVMHNkMEpCUVhkQ0xGTkJRWGhDTEhGQ1FVRjNRaXhEUVVGRExFbEJRVVFzUlVGQlZUdEJRVU4yUXl4VFFVRlJMRkZCUVZJc1IwRkJiVUlzU1VGQmJrSTdRVUZEUVN4VFFVRlJMRTlCUVZJc1IwRkJhMElzUzBGQlN5eExRVUZNTEVWQlFXeENMRU5CUm5WRExFTkJSVkE3TzBGQlJXaERMRk5CUVZFc1QwRkJVaXhEUVVGblFpeEpRVUZvUWl4RFFVRnhRaXhWUVVGRExFTkJRVVFzUlVGQlNTeERRVUZLTEVWQlFWVTdRVUZET1VJc1RVRkJTU3hUUVVGVExFVkJRVVVzUzBGQlJpeERRVUZSTEVOQlFWSXNSVUZCVnl4WFFVRllMRVZCUVdJN1FVRkRRU3hOUVVGSkxGTkJRVk1zUlVGQlJTeExRVUZHTEVOQlFWRXNRMEZCVWl4RlFVRlhMRmRCUVZnc1JVRkJZanRCUVVOQkxFMUJRVWtzVTBGQlV5eE5RVUZpTEVWQlFYRkNMRTlCUVU4c1EwRkJVQ3hEUVVGeVFpeExRVU5MTEVsQlFVa3NVMEZCVXl4TlFVRmlMRVZCUVhGQ0xFOUJRVThzUTBGQlF5eERRVUZTTEVOQlFYSkNMRXRCUTBFc1QwRkJUeXhEUVVGUU8wRkJRMHdzUlVGT1JEdEJRVTlCTEVOQldFUTdPMEZCWVVFc1NVRkJUU3haUVVGWkxGTkJRVm9zVTBGQldTeEhRVUZOTzBGQlEzWkNMRTlCUVUwc1lVRkJUaXhGUVVGVkxFbEJRVllzUTBGQlpUdEJRVUZCTEZOQlFVOHNTVUZCU1N4SlFVRktMRVZCUVZBN1FVRkJRU3hGUVVGbUxFVkJRME1zU1VGRVJDeERRVU5OTEdkQ1FVRlJPMEZCUTJJc2QwSkJRWE5DTEVsQlFYUkNPMEZCUTBFN1FVRkRRVHRCUVVOQkxFVkJURVFzUlVGTlF5eExRVTVFTEVOQlRVODdRVUZCUVN4VFFVRlBMRkZCUVZFc1NVRkJVaXhEUVVGaExFZEJRV0lzUTBGQlVEdEJRVUZCTEVWQlRsQTdRVUZQUVN4RFFWSkVPenRCUVZWQkxFbEJRVTBzVDBGQlR5eFRRVUZRTEVsQlFVOHNSMEZCVFR0QlFVTnNRaXhuUTBGQllTeFJRVUZpTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQkxFTkJVRVE3TzBGQlUwRTdPenM3T3pzN096dEJRekZGUVRzN1FVRkZRU3hKUVVGSkxGZEJRVmNzUzBGQlpqczdRVUZGUVN4SlFVRk5MSFZDUVVGMVFpeFRRVUYyUWl4dlFrRkJkVUlzUjBGQlRUdEJRVU5zUXl4TFFVRk5MRlZCUVZVc1RVRkJUU3hKUVVGT0xFTkJRVmNzVTBGQlV5eG5Ra0ZCVkN4RFFVRXdRaXhqUVVFeFFpeERRVUZZTEVOQlFXaENPenRCUVVWQkxGTkJRVkVzVDBGQlVpeERRVUZuUWl4bFFVRlBPMEZCUTNSQ0xFMUJRVWtzWjBKQlFVb3NRMEZCY1VJc1QwRkJja0lzUlVGQk9FSXNWVUZCUXl4SFFVRkVMRVZCUVZNN1FVRkRkRU1zVDBGQlNTeERRVUZETEZGQlFVd3NSVUZCWlR0QlFVTmtMRkZCUVVrc1RVRkJUU3hKUVVGSkxFZEJRV1E3TzBGQlJVRXNlVUpCUVZVc1UwRkJWaXhEUVVGdlFpeEhRVUZ3UWl4RFFVRjNRaXhWUVVGNFFqdEJRVU5CTEhGQ1FVRk5MRmxCUVU0c1EwRkJiVUlzVDBGQmJrSXNOa0pCUVhGRUxFZEJRWEpFTzBGQlEwRXNaVUZCVnl4SlFVRllPMEZCUTBFN1FVRkRSQ3hIUVZKRU8wRkJVMEVzUlVGV1JEczdRVUZaUVN4clFrRkJUU3huUWtGQlRpeERRVUYxUWl4UFFVRjJRaXhGUVVGblF5eFpRVUZOTzBGQlEzSkRMRTFCUVVrc1VVRkJTaXhGUVVGak8wRkJRMklzZDBKQlFWVXNVMEZCVml4RFFVRnZRaXhOUVVGd1FpeERRVUV5UWl4VlFVRXpRanRCUVVOQkxHTkJRVmNzUzBGQldEdEJRVU5CTzBGQlEwUXNSVUZNUkR0QlFVMUJMRU5CY2tKRU96dHJRa0YxUW1Vc2IwSTdPenM3T3pzN096dEJRek5DWmpzN1FVRkZRU3hKUVVGSkxGRkJRVkVzUzBGQldqdEJRVU5CTEVsQlFVMHNkVUpCUVhWQ0xGTkJRWFpDTEc5Q1FVRjFRaXhIUVVGTk8wRkJRMnhETEV0QlFVMHNVVUZCVVN4VFFVRlRMR05CUVZRc1EwRkJkMElzVTBGQmVFSXNRMEZCWkRzN1FVRkZRU3hQUVVGTkxHZENRVUZPTEVOQlFYVkNMRTlCUVhaQ0xFVkJRV2RETEZsQlFVMDdRVUZEY2tNc2IwSkJRVThzVTBGQlVDeERRVUZwUWl4SFFVRnFRaXhEUVVGeFFpeE5RVUZ5UWp0QlFVTkJMRlZCUVZFc1NVRkJVanRCUVVOQkxFVkJTRVE3TzBGQlMwRXNiVUpCUVU4c1owSkJRVkFzUTBGQmQwSXNUMEZCZUVJc1JVRkJhVU1zV1VGQlRUdEJRVU4wUXl4dlFrRkJUeXhUUVVGUUxFTkJRV2xDTEUxQlFXcENMRU5CUVhkQ0xFMUJRWGhDTzBGQlEwRXNWVUZCVVN4TFFVRlNPMEZCUTBFc1JVRklSRHM3UVVGTFFTeFJRVUZQTEdkQ1FVRlFMRU5CUVhkQ0xGTkJRWGhDTEVWQlFXMURMRmxCUVUwN1FVRkRlRU1zVFVGQlNTeExRVUZLTEVWQlFWYzdRVUZEVml4alFVRlhMRmxCUVUwN1FVRkRhRUlzYzBKQlFVOHNVMEZCVUN4RFFVRnBRaXhOUVVGcVFpeERRVUYzUWl4TlFVRjRRanRCUVVOQkxGbEJRVkVzUzBGQlVqdEJRVU5CTEVsQlNFUXNSVUZIUnl4SFFVaElPMEZCU1VFN1FVRkRSQ3hGUVZCRU8wRkJVVUVzUTBGeVFrUTdPMnRDUVhWQ1pTeHZRanM3T3pzN096czdPMEZETVVKbU96dEJRVU5CT3p0QlFVVkJMRWxCUVVrc1lVRkJTanRCUVVOQkxFbEJRVWtzVlVGQlZTeERRVUZrTzBGQlEwRXNTVUZCU1N4WlFVRlpMRXRCUVdoQ096dEJRVVZCTEVsQlFVMHNlVUpCUVhsQ0xGTkJRWHBDTEhOQ1FVRjVRaXhIUVVGTk8wRkJRM0JETEhOQ1FVRlZMR2RDUVVGV0xFTkJRVEpDTEZGQlFUTkNMRVZCUVhGRExGbEJRVTA3UVVGRE1VTXNUVUZCU1N4SlFVRkpMR3RDUVVGUExIRkNRVUZRTEVkQlFTdENMRU5CUVhaRE96dEJRVVZCTEUxQlFVa3NXVUZCV1N4RFFVRm9RaXhGUVVGdFFqdEJRVU5zUWl4VlFVRlBMRTlCUVZBN1FVRkRRU3hoUVVGVkxFTkJRVlk3UVVGRFFUczdRVUZGUkN4TlFVRkpMRXRCUVVzc1EwRkJReXhGUVVGT0xFbEJRVmtzUTBGQlF5eFRRVUZxUWl4RlFVRTBRanRCUVVNelFpeDFRa0ZCVXl4VFFVRlVMRU5CUVcxQ0xFZEJRVzVDTEVOQlFYVkNMRTFCUVhaQ08wRkJRMEVzWlVGQldTeEpRVUZhTzBGQlEwRXNSMEZJUkN4TlFVZFBMRWxCUVVrc1NVRkJTU3hEUVVGRExFVkJRVXdzU1VGQlZ5eFRRVUZtTEVWQlFUQkNPMEZCUTJoRExIVkNRVUZUTEZOQlFWUXNRMEZCYlVJc1RVRkJia0lzUTBGQk1FSXNUVUZCTVVJN1FVRkRRU3hsUVVGWkxFdEJRVm83UVVGRFFUdEJRVU5FTEVWQlprUTdPMEZCYVVKQkxIRkNRVUZUTEdkQ1FVRlVMRU5CUVRCQ0xFOUJRVEZDTEVWQlFXMURPMEZCUVVFc1UwRkJUU3g1UWtGQlRqdEJRVUZCTEVWQlFXNURPMEZCUTBFc1EwRnVRa1E3TzJ0Q1FYRkNaU3h6UWpzN096czdPenM3T3p0QlF6VkNaanM3T3p0QlFVTkJPenM3TzBGQlEwRTdPenM3UVVGRFFUczdPenRCUVVOQk96czdPenM3VVVGSFF5eHZRaXhIUVVGQkxEaENPMUZCUTBFc2MwSXNSMEZCUVN4blF6dFJRVU5CTEc5Q0xFZEJRVUVzT0VJN1VVRkRRU3haTEVkQlFVRXNjMEk3VVVGRFFTeFZMRWRCUVVFc2IwSTdPenM3T3pzN08wRkRXRVFzU1VGQlRTeFhRVUZYTEVOQlFVTXNSMEZCUkN4RlFVRk5MRWRCUVU0c1JVRkJWeXhIUVVGWUxFVkJRV2RDTEVkQlFXaENMRVZCUVhGQ0xFZEJRWEpDTEVWQlFUQkNMRWRCUVRGQ0xFVkJRU3RDTEVkQlFTOUNMRVZCUVc5RExFZEJRWEJETEVWQlFYbERMRWRCUVhwRExFVkJRVGhETEVkQlFUbERMRVZCUVcxRUxFZEJRVzVFTEVWQlFYZEVMRWRCUVhoRUxFVkJRVFpFTEVkQlFUZEVMRVZCUVd0RkxFZEJRV3hGTEVWQlFYVkZMRWRCUVhaRkxFVkJRVFJGTEVkQlFUVkZMRVZCUVdsR0xFZEJRV3BHTEVWQlFYTkdMRWRCUVhSR0xFVkJRVEpHTEVkQlFUTkdMRVZCUVdkSExFZEJRV2hITEVWQlFYRkhMRWRCUVhKSExFVkJRVEJITEVkQlFURkhMRVZCUVN0SExFZEJRUzlITEVWQlFXOUlMRWRCUVhCSUxFTkJRV3BDT3p0QlFVVkJMRWxCUVUwc1pVRkJaU3hUUVVGbUxGbEJRV1VzUTBGQlF5eFBRVUZFTEVWQlFXRTdRVUZEYWtNc1MwRkJUU3hwUWtGQmFVSXNVMEZCYWtJc1kwRkJhVUlzUTBGQlF5eEpRVUZFTEVWQlFWVTdRVUZEYUVNc1RVRkJUU3hYUVVGWExGVkJRVlVzYVVKQlFWWXNSMEZCT0VJc2EwSkJRUzlETzBGQlEwRXNUVUZCVFN4bFFVRmxMRU5CUVVNc1QwRkJSQ3hIUVVGWExHbENRVUZZTEVkQlFTdENMR3RDUVVGd1JEczdRVUZGUVN4TlFVRk5MRmRCUVZjc1RVRkJUU3hKUVVGT0xFTkJRVmNzVTBGQlV5eG5Ra0ZCVkN4RFFVRXdRaXhSUVVFeFFpeERRVUZZTEVOQlFXcENPMEZCUTBFc1RVRkJUU3hsUVVGbExFMUJRVTBzU1VGQlRpeERRVUZYTEZOQlFWTXNaMEpCUVZRc1EwRkJNRUlzV1VGQk1VSXNRMEZCV0N4RFFVRnlRanM3UVVGRlFTeGxRVUZoTEU5QlFXSXNRMEZCY1VJN1FVRkJRU3hWUVVGVExFMUJRVTBzWlVGQlRpeERRVUZ6UWl4TlFVRjBRaXhEUVVGVU8wRkJRVUVzUjBGQmNrSTdPMEZCUlVFc1UwRkJUeXhUUVVGVExFbEJRVlFzUTBGQll5eHBRa0ZCVXp0QlFVTTNRaXhQUVVGSkxFOUJRVThzVFVGQlRTeHJRa0ZCYWtJN1FVRkRRU3hWUVVGUExFdEJRVXNzVTBGQlRDeERRVUZsTEVOQlFXWXNUVUZCYzBJc1NVRkJkRUlzU1VGQk9FSXNTMEZCU3l4VFFVRk1MRU5CUVdVc1EwRkJaaXhOUVVGelFpeExRVUZMTEZkQlFVd3NSVUZCTTBRN1FVRkRRU3hIUVVoTkxFTkJRVkE3UVVGSlFTeEZRV0pFT3p0QlFXVkJMRXRCUVUwc2RVSkJRWFZDTEZOQlFYWkNMRzlDUVVGMVFpeERRVUZETEU5QlFVUXNSVUZCVlN4TlFVRldMRVZCUVhGQ08wRkJRMnBFTEZWQlFWRXNaMEpCUVZJc1EwRkJlVUlzVDBGQmVrSXNSVUZCYTBNc1dVRkJUVHRCUVVOMlF5eFBRVUZOTEdGQlFXRXNVMEZCVXl4alFVRlVMRU5CUVhkQ0xFMUJRWGhDTEVOQlFXNUNPMEZCUTBFc1QwRkJTU3hsUVVGS096dEJRVVZCTEU5QlFVa3NRMEZCUXl4UFFVRk1MRVZCUVdNN1FVRkRZaXhoUVVGVExGZEJRVmNzUjBGQldDeEhRVUZwUWl4VFFVRlRMR05CUVZRc1EwRkJkMElzWlVGQmVFSXNRMEZCYWtJc1IwRkJORVFzVjBGQlZ5eGhRVUZZTEVOQlFYbENMR0ZCUVhwQ0xFTkJRWFZETEdGQlFYWkRMRU5CUVhGRUxHRkJRWEpFTEVOQlFXMUZMSE5DUVVGdVJTeERRVUV3Uml4aFFVRXhSaXhEUVVGM1J5d3lRa0ZCZUVjc1EwRkJja1U3UVVGRFFTeEpRVVpFTEUxQlJVODdRVUZEVGl4aFFVRlRMRmRCUVZjc1IwRkJXQ3hIUVVGcFFpeFRRVUZUTEdOQlFWUXNRMEZCZDBJc1pVRkJlRUlzUTBGQmFrSXNSMEZCTkVRc1YwRkJWeXhoUVVGWUxFTkJRWGxDTEdGQlFYcENMRU5CUVhWRExHRkJRWFpETEVOQlFYRkVMSE5DUVVGeVJDeERRVUUwUlN4aFFVRTFSU3hEUVVFd1Jpd3lRa0ZCTVVZc1EwRkJja1U3UVVGRFFUczdRVUZGUkN4VlFVRlBMR05CUVZBc1EwRkJjMElzUlVGQlF5eFZRVUZWTEZGQlFWZ3NSVUZCY1VJc1QwRkJUeXhQUVVFMVFpeEZRVUYwUWp0QlFVTkJMRWRCV0VRN1FVRlpRU3hGUVdKRU96dEJRV1ZCTEV0QlFVa3NaMEpCUVdkQ0xFVkJRWEJDTzBGQlEwRXNTMEZCU1N4VFFVRlRMRk5CUVZNc1lVRkJWQ3hEUVVGMVFpeHZRa0ZCZGtJc1EwRkJZanRCUVVOQkxGRkJRVThzVTBGQlVDeEhRVUZ0UWl4RlFVRnVRanM3UVVGRlFTeFZRVUZUTEU5QlFWUXNRMEZCYVVJc2EwSkJRVlU3UVVGRE1VSXNUVUZCU1N4alFVRmpMR1ZCUVdVc1RVRkJaaXhEUVVGc1FqdEJRVU5CTEUxQlFVa3NWVUZCVlN4VFFVRlRMR0ZCUVZRc1EwRkJkVUlzUjBGQmRrSXNRMEZCWkRzN1FVRkZRU3hOUVVGSkxFTkJRVU1zVjBGQlRDeEZRVUZyUWpzN1FVRkZiRUlzWTBGQldTeEZRVUZhTEVkQlFXbENMRTFCUVdwQ08wRkJRMEVzVlVGQlVTeFRRVUZTTEVkQlFXOUNMRTlCUVU4c1YwRkJVQ3hGUVVGd1FqdEJRVU5CTEZWQlFWRXNVMEZCVWl4SFFVRnZRaXg1UWtGQmNFSTdPMEZCUlVFc2RVSkJRWEZDTEU5QlFYSkNMRVZCUVRoQ0xFMUJRVGxDTzBGQlEwRXNVMEZCVHl4WFFVRlFMRU5CUVcxQ0xFOUJRVzVDTzBGQlEwRXNSVUZhUkR0QlFXRkJMRU5CYUVSRU96dHJRa0ZyUkdVc1dUczdPenM3T3pzN1FVTndSR1lzU1VGQlRTeGhRVUZoTEZOQlFXSXNWVUZCWVN4RFFVRkRMRTlCUVVRc1JVRkJZVHRCUVVNdlFpeExRVUZOTEdGQlFXRXNVVUZCVVN4aFFVRlNMRU5CUVhOQ0xHRkJRWFJDTEVOQlFXOURMR0ZCUVhCRExFTkJRVzVDTzBGQlEwRXNTMEZCVFN4aFFVRmhMRkZCUVZFc1lVRkJVaXhEUVVGelFpeGhRVUYwUWl4RFFVRnZReXhoUVVGd1F5eERRVUZ1UWpzN1FVRkZRU3hMUVVGSkxGVkJRVlVzVVVGQlVTeHBRa0ZCZEVJN1FVRkRRU3haUVVGWExHZENRVUZZTEVOQlFUUkNMRTlCUVRWQ0xFVkJRWEZETEZsQlFVMDdRVUZETVVNc1RVRkJUU3hQUVVGUExGRkJRVkVzYTBKQlFYSkNPMEZCUTBFc1RVRkJTU3hKUVVGS0xFVkJRVlU3UVVGRFZDeFJRVUZMTEdOQlFVd3NRMEZCYjBJc1JVRkJReXhWUVVGVkxGRkJRVmdzUlVGQmNVSXNUMEZCVHl4VFFVRTFRaXhGUVVGMVF5eFJRVUZSTEZGQlFTOURMRVZCUVhCQ08wRkJRMEVzWVVGQlZTeEpRVUZXTzBGQlEwRTdRVUZEUkN4RlFVNUVPenRCUVZGQkxGbEJRVmNzWjBKQlFWZ3NRMEZCTkVJc1QwRkJOVUlzUlVGQmNVTXNXVUZCVFR0QlFVTXhReXhOUVVGTkxFOUJRVThzVVVGQlVTeHpRa0ZCY2tJN1FVRkRRU3hOUVVGSkxFbEJRVW9zUlVGQlZUdEJRVU5VTEZGQlFVc3NZMEZCVEN4RFFVRnZRaXhGUVVGRExGVkJRVlVzVVVGQldDeEZRVUZ4UWl4UFFVRlBMRk5CUVRWQ0xFVkJRWFZETEZGQlFWRXNVVUZCTDBNc1JVRkJjRUk3UVVGRFFTeGhRVUZWTEVsQlFWWTdRVUZEUVR0QlFVTkVMRVZCVGtRN1FVRlBRU3hEUVhCQ1JEczdhMEpCYzBKbExGVTdPenM3T3pzN08wRkRkRUptTEVsQlFVMHNaMEpCUVdkQ0xGTkJRV2hDTEdGQlFXZENMRU5CUVVNc1MwRkJSRHRCUVVGQkxDdEVRVUZuUlN4TFFVRm9SVHRCUVVGQkxFTkJRWFJDT3p0QlFVVkJMRWxCUVUwc2EwSkJRV3RDTEZOQlFXeENMR1ZCUVd0Q0xFTkJRVU1zUzBGQlJDeEZRVUZSTEVOQlFWSXNSVUZCWXp0QlFVRkJMRXRCUXpkQ0xFdEJSRFpDTEVkQlF5dENMRXRCUkM5Q0xFTkJRemRDTEV0QlJEWkNPMEZCUVVFc1MwRkRkRUlzVTBGRWMwSXNSMEZESzBJc1MwRkVMMElzUTBGRGRFSXNVMEZFYzBJN1FVRkJRU3hMUVVOWUxGRkJSRmNzUjBGREswSXNTMEZFTDBJc1EwRkRXQ3hSUVVSWE8wRkJRVUVzUzBGRFJDeE5RVVJETEVkQlF5dENMRXRCUkM5Q0xFTkJRMFFzVFVGRVF6dEJRVUZCTEV0QlEwOHNWMEZFVUN4SFFVTXJRaXhMUVVRdlFpeERRVU5QTEZkQlJGQTdRVUZCUVN4TFFVTnZRaXhOUVVSd1FpeEhRVU1yUWl4TFFVUXZRaXhEUVVOdlFpeE5RVVJ3UWpzN08wRkJSM0pETEV0QlFVMHNXVUZCV1N4UFFVRlBMRTFCUVZBc1IwRkRha0lzVDBGQlR5eEhRVUZRTEVOQlFWYzdRVUZCUVN4VFFVRlRMR05CUVdNc1MwRkJaQ3hEUVVGVU8wRkJRVUVzUlVGQldDeEZRVUV3UXl4SlFVRXhReXhEUVVFclF5eEZRVUV2UXl4RFFVUnBRaXhIUVVOdlF5eEZRVVIwUkRzN1FVRkhRU3gzVGtGTGVVTXNTMEZNZWtNc2NVaEJUMnRFTEZOQlVHeEVMRzlJUVZOcFJDeFJRVlJxUkN3d1NrRmhiMFFzUTBGaWNFUXNkMEpCWTA4c1UwRmtVQ3dyUjBGblFubERMRmRCYUVKNlF5d3dSRUZwUW05RExFMUJha0p3UXp0QlFUUkNRU3hEUVd4RFJEczdhMEpCYjBObExHVTdPenM3T3pzN096czdRVU4wUTJZN096czdRVUZEUVRzN096czdPMUZCUlZNc1pTeEhRVUZCTEdsQ08xRkJRV2xDTEZjc1IwRkJRU3hsT3pzN096czdPenRCUTBneFFpeEpRVUZOTEcxdFFrRkJUanM3UVVGcFFrRXNTVUZCVFN4alFVRmpMRk5CUVdRc1YwRkJZeXhIUVVGTk8wRkJRM3BDTEV0QlFVa3NWMEZCVnl4VFFVRlRMR05CUVZRc1EwRkJkMElzVVVGQmVFSXNRMEZCWmp0QlFVTkJMRlZCUVZNc1UwRkJWQ3hIUVVGeFFpeFJRVUZ5UWp0QlFVTkJMRU5CU0VRN08ydENRVXRsTEZjN096czdPenM3T3pzN1FVTjBRbVk3TzBGQlJVRXNTVUZCVFN4WFFVRlhMRk5CUVZnc1VVRkJWeXhEUVVGRExFVkJRVVFzUlVGQlN5eEpRVUZNTEVWQlFXTTdRVUZETjBJc1RVRkJTU3huUWtGQlNqczdRVUZGUVN4VFFVRlBMRmxCUVZjN1FVRkJRVHRCUVVGQk96dEJRVU5vUWl4UlFVRk5MR1ZCUVdVc1UwRkJaaXhaUVVGbE8wRkJRVUVzWVVGQlRTeEhRVUZITEV0QlFVZ3NRMEZCVXl4TFFVRlVMRVZCUVdVc1ZVRkJaaXhEUVVGT08wRkJRVUVzUzBGQmNrSTdPMEZCUlVFc2FVSkJRV0VzVDBGQllqdEJRVU5CTEdOQlFWVXNWMEZCVnl4WlFVRllMRVZCUVhsQ0xFbEJRWHBDTEVOQlFWWTdRVUZEUkN4SFFVeEVPMEZCVFVRc1EwRlVSRHM3UVVGWFFTeEpRVUZOTEdOQlFXTXNVMEZCWkN4WFFVRmpMRWRCUVUwN1FVRkRla0lzYzBKQlFWTXNUMEZCVkN4RFFVRnBRanRCUVVGQkxGZEJRVkVzUzBGQlN5eFRRVUZNTEVOQlFXVXNSMEZCWml4RFFVRnRRaXhQUVVGdVFpeERRVUZTTzBGQlFVRXNSMEZCYWtJN1FVRkRRU3hyUWtGQlN5eFRRVUZNTEVOQlFXVXNSMEZCWml4RFFVRnRRaXhQUVVGdVFqdEJRVU5CTEVOQlNFUTdPMEZCUzBFc1NVRkJUU3hqUVVGakxGTkJRV1FzVjBGQll5eEhRVUZOTzBGQlEzcENMRTFCUVVrc1RVRkJUU3hUUVVGVExHTkJRVlFzUTBGQmQwSXNaVUZCZUVJc1EwRkJWanRCUVVOQkxFMUJRVWtzWTBGQlNpeERRVUZ0UWl4RlFVRkRMRlZCUVZVc1VVRkJXQ3hGUVVGeFFpeFBRVUZQTEU5QlFUVkNMRVZCUVc1Q08wRkJRMEVzUTBGSVJEczdVVUZMVXl4UkxFZEJRVUVzVVR0UlFVRlZMRmNzUjBGQlFTeFhPMUZCUVdFc1Z5eEhRVUZCTEZjaUxDSm1hV3hsSWpvaVoyVnVaWEpoZEdWa0xtcHpJaXdpYzI5MWNtTmxVbTl2ZENJNklpSXNJbk52ZFhKalpYTkRiMjUwWlc1MElqcGJJaWhtZFc1amRHbHZiaWdwZTJaMWJtTjBhVzl1SUhJb1pTeHVMSFFwZTJaMWJtTjBhVzl1SUc4b2FTeG1LWHRwWmlnaGJsdHBYU2w3YVdZb0lXVmJhVjBwZTNaaGNpQmpQVndpWm5WdVkzUnBiMjVjSWowOWRIbHdaVzltSUhKbGNYVnBjbVVtSm5KbGNYVnBjbVU3YVdZb0lXWW1KbU1wY21WMGRYSnVJR01vYVN3aE1DazdhV1lvZFNseVpYUjFjbTRnZFNocExDRXdLVHQyWVhJZ1lUMXVaWGNnUlhKeWIzSW9YQ0pEWVc1dWIzUWdabWx1WkNCdGIyUjFiR1VnSjF3aUsya3JYQ0luWENJcE8zUm9jbTkzSUdFdVkyOWtaVDFjSWsxUFJGVk1SVjlPVDFSZlJrOVZUa1JjSWl4aGZYWmhjaUJ3UFc1YmFWMDllMlY0Y0c5eWRITTZlMzE5TzJWYmFWMWJNRjB1WTJGc2JDaHdMbVY0Y0c5eWRITXNablZ1WTNScGIyNG9jaWw3ZG1GeUlHNDlaVnRwWFZzeFhWdHlYVHR5WlhSMWNtNGdieWh1Zkh4eUtYMHNjQ3h3TG1WNGNHOXlkSE1zY2l4bExHNHNkQ2w5Y21WMGRYSnVJRzViYVYwdVpYaHdiM0owYzMxbWIzSW9kbUZ5SUhVOVhDSm1kVzVqZEdsdmJsd2lQVDEwZVhCbGIyWWdjbVZ4ZFdseVpTWW1jbVZ4ZFdseVpTeHBQVEE3YVR4MExteGxibWQwYUR0cEt5c3BieWgwVzJsZEtUdHlaWFIxY200Z2IzMXlaWFIxY200Z2NuMHBLQ2tpTENJdktpQnpiVzl2ZEdoelkzSnZiR3dnZGpBdU5DNHdJQzBnTWpBeE9DQXRJRVIxYzNSaGJpQkxZWE4wWlc0c0lFcGxjbVZ0YVdGeklFMWxibWxqYUdWc2JHa2dMU0JOU1ZRZ1RHbGpaVzV6WlNBcUwxeHVLR1oxYm1OMGFXOXVJQ2dwSUh0Y2JpQWdKM1Z6WlNCemRISnBZM1FuTzF4dVhHNGdJQzh2SUhCdmJIbG1hV3hzWEc0Z0lHWjFibU4wYVc5dUlIQnZiSGxtYVd4c0tDa2dlMXh1SUNBZ0lDOHZJR0ZzYVdGelpYTmNiaUFnSUNCMllYSWdkeUE5SUhkcGJtUnZkenRjYmlBZ0lDQjJZWElnWkNBOUlHUnZZM1Z0Wlc1ME8xeHVYRzRnSUNBZ0x5OGdjbVYwZFhKdUlHbG1JSE5qY205c2JDQmlaV2hoZG1sdmNpQnBjeUJ6ZFhCd2IzSjBaV1FnWVc1a0lIQnZiSGxtYVd4c0lHbHpJRzV2ZENCbWIzSmpaV1JjYmlBZ0lDQnBaaUFvWEc0Z0lDQWdJQ0FuYzJOeWIyeHNRbVZvWVhacGIzSW5JR2x1SUdRdVpHOWpkVzFsYm5SRmJHVnRaVzUwTG5OMGVXeGxJQ1ltWEc0Z0lDQWdJQ0IzTGw5ZlptOXlZMlZUYlc5dmRHaFRZM0p2Ykd4UWIyeDVabWxzYkY5ZklDRTlQU0IwY25WbFhHNGdJQ0FnS1NCN1hHNGdJQ0FnSUNCeVpYUjFjbTQ3WEc0Z0lDQWdmVnh1WEc0Z0lDQWdMeThnWjJ4dlltRnNjMXh1SUNBZ0lIWmhjaUJGYkdWdFpXNTBJRDBnZHk1SVZFMU1SV3hsYldWdWRDQjhmQ0IzTGtWc1pXMWxiblE3WEc0Z0lDQWdkbUZ5SUZORFVrOU1URjlVU1UxRklEMGdORFk0TzF4dVhHNGdJQ0FnTHk4Z2IySnFaV04wSUdkaGRHaGxjbWx1WnlCdmNtbG5hVzVoYkNCelkzSnZiR3dnYldWMGFHOWtjMXh1SUNBZ0lIWmhjaUJ2Y21sbmFXNWhiQ0E5SUh0Y2JpQWdJQ0FnSUhOamNtOXNiRG9nZHk1elkzSnZiR3dnZkh3Z2R5NXpZM0p2Ykd4VWJ5eGNiaUFnSUNBZ0lITmpjbTlzYkVKNU9pQjNMbk5qY205c2JFSjVMRnh1SUNBZ0lDQWdaV3hsYldWdWRGTmpjbTlzYkRvZ1JXeGxiV1Z1ZEM1d2NtOTBiM1I1Y0dVdWMyTnliMnhzSUh4OElITmpjbTlzYkVWc1pXMWxiblFzWEc0Z0lDQWdJQ0J6WTNKdmJHeEpiblJ2Vm1sbGR6b2dSV3hsYldWdWRDNXdjbTkwYjNSNWNHVXVjMk55YjJ4c1NXNTBiMVpwWlhkY2JpQWdJQ0I5TzF4dVhHNGdJQ0FnTHk4Z1pHVm1hVzVsSUhScGJXbHVaeUJ0WlhSb2IyUmNiaUFnSUNCMllYSWdibTkzSUQxY2JpQWdJQ0FnSUhjdWNHVnlabTl5YldGdVkyVWdKaVlnZHk1d1pYSm1iM0p0WVc1alpTNXViM2RjYmlBZ0lDQWdJQ0FnUHlCM0xuQmxjbVp2Y20xaGJtTmxMbTV2ZHk1aWFXNWtLSGN1Y0dWeVptOXliV0Z1WTJVcFhHNGdJQ0FnSUNBZ0lEb2dSR0YwWlM1dWIzYzdYRzVjYmlBZ0lDQXZLaXBjYmlBZ0lDQWdLaUJwYm1ScFkyRjBaWE1nYVdZZ1lTQjBhR1VnWTNWeWNtVnVkQ0JpY205M2MyVnlJR2x6SUcxaFpHVWdZbmtnVFdsamNtOXpiMlowWEc0Z0lDQWdJQ29nUUcxbGRHaHZaQ0JwYzAxcFkzSnZjMjltZEVKeWIzZHpaWEpjYmlBZ0lDQWdLaUJBY0dGeVlXMGdlMU4wY21sdVozMGdkWE5sY2tGblpXNTBYRzRnSUNBZ0lDb2dRSEpsZEhWeWJuTWdlMEp2YjJ4bFlXNTlYRzRnSUNBZ0lDb3ZYRzRnSUNBZ1puVnVZM1JwYjI0Z2FYTk5hV055YjNOdlpuUkNjbTkzYzJWeUtIVnpaWEpCWjJWdWRDa2dlMXh1SUNBZ0lDQWdkbUZ5SUhWelpYSkJaMlZ1ZEZCaGRIUmxjbTV6SUQwZ1d5ZE5VMGxGSUNjc0lDZFVjbWxrWlc1MEx5Y3NJQ2RGWkdkbEx5ZGRPMXh1WEc0Z0lDQWdJQ0J5WlhSMWNtNGdibVYzSUZKbFowVjRjQ2gxYzJWeVFXZGxiblJRWVhSMFpYSnVjeTVxYjJsdUtDZDhKeWtwTG5SbGMzUW9kWE5sY2tGblpXNTBLVHRjYmlBZ0lDQjlYRzVjYmlBZ0lDQXZLbHh1SUNBZ0lDQXFJRWxGSUdoaGN5QnliM1Z1WkdsdVp5QmlkV2NnY205MWJtUnBibWNnWkc5M2JpQmpiR2xsYm5SSVpXbG5hSFFnWVc1a0lHTnNhV1Z1ZEZkcFpIUm9JR0Z1WkZ4dUlDQWdJQ0FxSUhKdmRXNWthVzVuSUhWd0lITmpjbTlzYkVobGFXZG9kQ0JoYm1RZ2MyTnliMnhzVjJsa2RHZ2dZMkYxYzJsdVp5Qm1ZV3h6WlNCd2IzTnBkR2wyWlhOY2JpQWdJQ0FnS2lCdmJpQm9ZWE5UWTNKdmJHeGhZbXhsVTNCaFkyVmNiaUFnSUNBZ0tpOWNiaUFnSUNCMllYSWdVazlWVGtSSlRrZGZWRTlNUlZKQlRrTkZJRDBnYVhOTmFXTnliM052Wm5SQ2NtOTNjMlZ5S0hjdWJtRjJhV2RoZEc5eUxuVnpaWEpCWjJWdWRDa2dQeUF4SURvZ01EdGNibHh1SUNBZ0lDOHFLbHh1SUNBZ0lDQXFJR05vWVc1blpYTWdjMk55YjJ4c0lIQnZjMmwwYVc5dUlHbHVjMmxrWlNCaGJpQmxiR1Z0Wlc1MFhHNGdJQ0FnSUNvZ1FHMWxkR2h2WkNCelkzSnZiR3hGYkdWdFpXNTBYRzRnSUNBZ0lDb2dRSEJoY21GdElIdE9kVzFpWlhKOUlIaGNiaUFnSUNBZ0tpQkFjR0Z5WVcwZ2UwNTFiV0psY24wZ2VWeHVJQ0FnSUNBcUlFQnlaWFIxY201eklIdDFibVJsWm1sdVpXUjlYRzRnSUNBZ0lDb3ZYRzRnSUNBZ1puVnVZM1JwYjI0Z2MyTnliMnhzUld4bGJXVnVkQ2g0TENCNUtTQjdYRzRnSUNBZ0lDQjBhR2x6TG5OamNtOXNiRXhsWm5RZ1BTQjRPMXh1SUNBZ0lDQWdkR2hwY3k1elkzSnZiR3hVYjNBZ1BTQjVPMXh1SUNBZ0lIMWNibHh1SUNBZ0lDOHFLbHh1SUNBZ0lDQXFJSEpsZEhWeWJuTWdjbVZ6ZFd4MElHOW1JR0Z3Y0d4NWFXNW5JR1ZoYzJVZ2JXRjBhQ0JtZFc1amRHbHZiaUIwYnlCaElHNTFiV0psY2x4dUlDQWdJQ0FxSUVCdFpYUm9iMlFnWldGelpWeHVJQ0FnSUNBcUlFQndZWEpoYlNCN1RuVnRZbVZ5ZlNCclhHNGdJQ0FnSUNvZ1FISmxkSFZ5Ym5NZ2UwNTFiV0psY24xY2JpQWdJQ0FnS2k5Y2JpQWdJQ0JtZFc1amRHbHZiaUJsWVhObEtHc3BJSHRjYmlBZ0lDQWdJSEpsZEhWeWJpQXdMalVnS2lBb01TQXRJRTFoZEdndVkyOXpLRTFoZEdndVVFa2dLaUJyS1NrN1hHNGdJQ0FnZlZ4dVhHNGdJQ0FnTHlvcVhHNGdJQ0FnSUNvZ2FXNWthV05oZEdWeklHbG1JR0VnYzIxdmIzUm9JR0psYUdGMmFXOXlJSE5vYjNWc1pDQmlaU0JoY0hCc2FXVmtYRzRnSUNBZ0lDb2dRRzFsZEdodlpDQnphRzkxYkdSQ1lXbHNUM1YwWEc0Z0lDQWdJQ29nUUhCaGNtRnRJSHRPZFcxaVpYSjhUMkpxWldOMGZTQm1hWEp6ZEVGeVoxeHVJQ0FnSUNBcUlFQnlaWFIxY201eklIdENiMjlzWldGdWZWeHVJQ0FnSUNBcUwxeHVJQ0FnSUdaMWJtTjBhVzl1SUhOb2IzVnNaRUpoYVd4UGRYUW9abWx5YzNSQmNtY3BJSHRjYmlBZ0lDQWdJR2xtSUNoY2JpQWdJQ0FnSUNBZ1ptbHljM1JCY21jZ1BUMDlJRzUxYkd3Z2ZIeGNiaUFnSUNBZ0lDQWdkSGx3Wlc5bUlHWnBjbk4wUVhKbklDRTlQU0FuYjJKcVpXTjBKeUI4ZkZ4dUlDQWdJQ0FnSUNCbWFYSnpkRUZ5Wnk1aVpXaGhkbWx2Y2lBOVBUMGdkVzVrWldacGJtVmtJSHg4WEc0Z0lDQWdJQ0FnSUdacGNuTjBRWEpuTG1KbGFHRjJhVzl5SUQwOVBTQW5ZWFYwYnljZ2ZIeGNiaUFnSUNBZ0lDQWdabWx5YzNSQmNtY3VZbVZvWVhacGIzSWdQVDA5SUNkcGJuTjBZVzUwSjF4dUlDQWdJQ0FnS1NCN1hHNGdJQ0FnSUNBZ0lDOHZJR1pwY25OMElHRnlaM1Z0Wlc1MElHbHpJRzV2ZENCaGJpQnZZbXBsWTNRdmJuVnNiRnh1SUNBZ0lDQWdJQ0F2THlCdmNpQmlaV2hoZG1sdmNpQnBjeUJoZFhSdkxDQnBibk4wWVc1MElHOXlJSFZ1WkdWbWFXNWxaRnh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdkSEoxWlR0Y2JpQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ2FXWWdLSFI1Y0dWdlppQm1hWEp6ZEVGeVp5QTlQVDBnSjI5aWFtVmpkQ2NnSmlZZ1ptbHljM1JCY21jdVltVm9ZWFpwYjNJZ1BUMDlJQ2R6Ylc5dmRHZ25LU0I3WEc0Z0lDQWdJQ0FnSUM4dklHWnBjbk4wSUdGeVozVnRaVzUwSUdseklHRnVJRzlpYW1WamRDQmhibVFnWW1Wb1lYWnBiM0lnYVhNZ2MyMXZiM1JvWEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJtWVd4elpUdGNiaUFnSUNBZ0lIMWNibHh1SUNBZ0lDQWdMeThnZEdoeWIzY2daWEp5YjNJZ2QyaGxiaUJpWldoaGRtbHZjaUJwY3lCdWIzUWdjM1Z3Y0c5eWRHVmtYRzRnSUNBZ0lDQjBhSEp2ZHlCdVpYY2dWSGx3WlVWeWNtOXlLRnh1SUNBZ0lDQWdJQ0FuWW1Wb1lYWnBiM0lnYldWdFltVnlJRzltSUZOamNtOXNiRTl3ZEdsdmJuTWdKeUFyWEc0Z0lDQWdJQ0FnSUNBZ1ptbHljM1JCY21jdVltVm9ZWFpwYjNJZ0sxeHVJQ0FnSUNBZ0lDQWdJQ2NnYVhNZ2JtOTBJR0VnZG1Gc2FXUWdkbUZzZFdVZ1ptOXlJR1Z1ZFcxbGNtRjBhVzl1SUZOamNtOXNiRUpsYUdGMmFXOXlMaWRjYmlBZ0lDQWdJQ2s3WEc0Z0lDQWdmVnh1WEc0Z0lDQWdMeW9xWEc0Z0lDQWdJQ29nYVc1a2FXTmhkR1Z6SUdsbUlHRnVJR1ZzWlcxbGJuUWdhR0Z6SUhOamNtOXNiR0ZpYkdVZ2MzQmhZMlVnYVc0Z2RHaGxJSEJ5YjNacFpHVmtJR0Y0YVhOY2JpQWdJQ0FnS2lCQWJXVjBhRzlrSUdoaGMxTmpjbTlzYkdGaWJHVlRjR0ZqWlZ4dUlDQWdJQ0FxSUVCd1lYSmhiU0I3VG05a1pYMGdaV3hjYmlBZ0lDQWdLaUJBY0dGeVlXMGdlMU4wY21sdVozMGdZWGhwYzF4dUlDQWdJQ0FxSUVCeVpYUjFjbTV6SUh0Q2IyOXNaV0Z1ZlZ4dUlDQWdJQ0FxTDF4dUlDQWdJR1oxYm1OMGFXOXVJR2hoYzFOamNtOXNiR0ZpYkdWVGNHRmpaU2hsYkN3Z1lYaHBjeWtnZTF4dUlDQWdJQ0FnYVdZZ0tHRjRhWE1nUFQwOUlDZFpKeWtnZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnWld3dVkyeHBaVzUwU0dWcFoyaDBJQ3NnVWs5VlRrUkpUa2RmVkU5TVJWSkJUa05GSUR3Z1pXd3VjMk55YjJ4c1NHVnBaMmgwTzF4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNCcFppQW9ZWGhwY3lBOVBUMGdKMWduS1NCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCbGJDNWpiR2xsYm5SWGFXUjBhQ0FySUZKUFZVNUVTVTVIWDFSUFRFVlNRVTVEUlNBOElHVnNMbk5qY205c2JGZHBaSFJvTzF4dUlDQWdJQ0FnZlZ4dUlDQWdJSDFjYmx4dUlDQWdJQzhxS2x4dUlDQWdJQ0FxSUdsdVpHbGpZWFJsY3lCcFppQmhiaUJsYkdWdFpXNTBJR2hoY3lCaElITmpjbTlzYkdGaWJHVWdiM1psY21ac2IzY2djSEp2Y0dWeWRIa2dhVzRnZEdobElHRjRhWE5jYmlBZ0lDQWdLaUJBYldWMGFHOWtJR05oYms5MlpYSm1iRzkzWEc0Z0lDQWdJQ29nUUhCaGNtRnRJSHRPYjJSbGZTQmxiRnh1SUNBZ0lDQXFJRUJ3WVhKaGJTQjdVM1J5YVc1bmZTQmhlR2x6WEc0Z0lDQWdJQ29nUUhKbGRIVnlibk1nZTBKdmIyeGxZVzU5WEc0Z0lDQWdJQ292WEc0Z0lDQWdablZ1WTNScGIyNGdZMkZ1VDNabGNtWnNiM2NvWld3c0lHRjRhWE1wSUh0Y2JpQWdJQ0FnSUhaaGNpQnZkbVZ5Wm14dmQxWmhiSFZsSUQwZ2R5NW5aWFJEYjIxd2RYUmxaRk4wZVd4bEtHVnNMQ0J1ZFd4c0tWc25iM1psY21ac2IzY25JQ3NnWVhocGMxMDdYRzVjYmlBZ0lDQWdJSEpsZEhWeWJpQnZkbVZ5Wm14dmQxWmhiSFZsSUQwOVBTQW5ZWFYwYnljZ2ZId2diM1psY21ac2IzZFdZV3gxWlNBOVBUMGdKM05qY205c2JDYzdYRzRnSUNBZ2ZWeHVYRzRnSUNBZ0x5b3FYRzRnSUNBZ0lDb2dhVzVrYVdOaGRHVnpJR2xtSUdGdUlHVnNaVzFsYm5RZ1kyRnVJR0psSUhOamNtOXNiR1ZrSUdsdUlHVnBkR2hsY2lCaGVHbHpYRzRnSUNBZ0lDb2dRRzFsZEdodlpDQnBjMU5qY205c2JHRmliR1ZjYmlBZ0lDQWdLaUJBY0dGeVlXMGdlMDV2WkdWOUlHVnNYRzRnSUNBZ0lDb2dRSEJoY21GdElIdFRkSEpwYm1kOUlHRjRhWE5jYmlBZ0lDQWdLaUJBY21WMGRYSnVjeUI3UW05dmJHVmhibjFjYmlBZ0lDQWdLaTljYmlBZ0lDQm1kVzVqZEdsdmJpQnBjMU5qY205c2JHRmliR1VvWld3cElIdGNiaUFnSUNBZ0lIWmhjaUJwYzFOamNtOXNiR0ZpYkdWWklEMGdhR0Z6VTJOeWIyeHNZV0pzWlZOd1lXTmxLR1ZzTENBbldTY3BJQ1ltSUdOaGJrOTJaWEptYkc5M0tHVnNMQ0FuV1NjcE8xeHVJQ0FnSUNBZ2RtRnlJR2x6VTJOeWIyeHNZV0pzWlZnZ1BTQm9ZWE5UWTNKdmJHeGhZbXhsVTNCaFkyVW9aV3dzSUNkWUp5a2dKaVlnWTJGdVQzWmxjbVpzYjNjb1pXd3NJQ2RZSnlrN1hHNWNiaUFnSUNBZ0lISmxkSFZ5YmlCcGMxTmpjbTlzYkdGaWJHVlpJSHg4SUdselUyTnliMnhzWVdKc1pWZzdYRzRnSUNBZ2ZWeHVYRzRnSUNBZ0x5b3FYRzRnSUNBZ0lDb2dabWx1WkhNZ2MyTnliMnhzWVdKc1pTQndZWEpsYm5RZ2IyWWdZVzRnWld4bGJXVnVkRnh1SUNBZ0lDQXFJRUJ0WlhSb2IyUWdabWx1WkZOamNtOXNiR0ZpYkdWUVlYSmxiblJjYmlBZ0lDQWdLaUJBY0dGeVlXMGdlMDV2WkdWOUlHVnNYRzRnSUNBZ0lDb2dRSEpsZEhWeWJuTWdlMDV2WkdWOUlHVnNYRzRnSUNBZ0lDb3ZYRzRnSUNBZ1puVnVZM1JwYjI0Z1ptbHVaRk5qY205c2JHRmliR1ZRWVhKbGJuUW9aV3dwSUh0Y2JpQWdJQ0FnSUhaaGNpQnBjMEp2WkhrN1hHNWNiaUFnSUNBZ0lHUnZJSHRjYmlBZ0lDQWdJQ0FnWld3Z1BTQmxiQzV3WVhKbGJuUk9iMlJsTzF4dVhHNGdJQ0FnSUNBZ0lHbHpRbTlrZVNBOUlHVnNJRDA5UFNCa0xtSnZaSGs3WEc0Z0lDQWdJQ0I5SUhkb2FXeGxJQ2hwYzBKdlpIa2dQVDA5SUdaaGJITmxJQ1ltSUdselUyTnliMnhzWVdKc1pTaGxiQ2tnUFQwOUlHWmhiSE5sS1R0Y2JseHVJQ0FnSUNBZ2FYTkNiMlI1SUQwZ2JuVnNiRHRjYmx4dUlDQWdJQ0FnY21WMGRYSnVJR1ZzTzF4dUlDQWdJSDFjYmx4dUlDQWdJQzhxS2x4dUlDQWdJQ0FxSUhObGJHWWdhVzUyYjJ0bFpDQm1kVzVqZEdsdmJpQjBhR0YwTENCbmFYWmxiaUJoSUdOdmJuUmxlSFFzSUhOMFpYQnpJSFJvY205MVoyZ2djMk55YjJ4c2FXNW5YRzRnSUNBZ0lDb2dRRzFsZEdodlpDQnpkR1Z3WEc0Z0lDQWdJQ29nUUhCaGNtRnRJSHRQWW1wbFkzUjlJR052Ym5SbGVIUmNiaUFnSUNBZ0tpQkFjbVYwZFhKdWN5QjdkVzVrWldacGJtVmtmVnh1SUNBZ0lDQXFMMXh1SUNBZ0lHWjFibU4wYVc5dUlITjBaWEFvWTI5dWRHVjRkQ2tnZTF4dUlDQWdJQ0FnZG1GeUlIUnBiV1VnUFNCdWIzY29LVHRjYmlBZ0lDQWdJSFpoY2lCMllXeDFaVHRjYmlBZ0lDQWdJSFpoY2lCamRYSnlaVzUwV0R0Y2JpQWdJQ0FnSUhaaGNpQmpkWEp5Wlc1MFdUdGNiaUFnSUNBZ0lIWmhjaUJsYkdGd2MyVmtJRDBnS0hScGJXVWdMU0JqYjI1MFpYaDBMbk4wWVhKMFZHbHRaU2tnTHlCVFExSlBURXhmVkVsTlJUdGNibHh1SUNBZ0lDQWdMeThnWVhadmFXUWdaV3hoY0hObFpDQjBhVzFsY3lCb2FXZG9aWElnZEdoaGJpQnZibVZjYmlBZ0lDQWdJR1ZzWVhCelpXUWdQU0JsYkdGd2MyVmtJRDRnTVNBL0lERWdPaUJsYkdGd2MyVmtPMXh1WEc0Z0lDQWdJQ0F2THlCaGNIQnNlU0JsWVhOcGJtY2dkRzhnWld4aGNITmxaQ0IwYVcxbFhHNGdJQ0FnSUNCMllXeDFaU0E5SUdWaGMyVW9aV3hoY0hObFpDazdYRzVjYmlBZ0lDQWdJR04xY25KbGJuUllJRDBnWTI5dWRHVjRkQzV6ZEdGeWRGZ2dLeUFvWTI5dWRHVjRkQzU0SUMwZ1kyOXVkR1Y0ZEM1emRHRnlkRmdwSUNvZ2RtRnNkV1U3WEc0Z0lDQWdJQ0JqZFhKeVpXNTBXU0E5SUdOdmJuUmxlSFF1YzNSaGNuUlpJQ3NnS0dOdmJuUmxlSFF1ZVNBdElHTnZiblJsZUhRdWMzUmhjblJaS1NBcUlIWmhiSFZsTzF4dVhHNGdJQ0FnSUNCamIyNTBaWGgwTG0xbGRHaHZaQzVqWVd4c0tHTnZiblJsZUhRdWMyTnliMnhzWVdKc1pTd2dZM1Z5Y21WdWRGZ3NJR04xY25KbGJuUlpLVHRjYmx4dUlDQWdJQ0FnTHk4Z2MyTnliMnhzSUcxdmNtVWdhV1lnZDJVZ2FHRjJaU0J1YjNRZ2NtVmhZMmhsWkNCdmRYSWdaR1Z6ZEdsdVlYUnBiMjVjYmlBZ0lDQWdJR2xtSUNoamRYSnlaVzUwV0NBaFBUMGdZMjl1ZEdWNGRDNTRJSHg4SUdOMWNuSmxiblJaSUNFOVBTQmpiMjUwWlhoMExua3BJSHRjYmlBZ0lDQWdJQ0FnZHk1eVpYRjFaWE4wUVc1cGJXRjBhVzl1Um5KaGJXVW9jM1JsY0M1aWFXNWtLSGNzSUdOdmJuUmxlSFFwS1R0Y2JpQWdJQ0FnSUgxY2JpQWdJQ0I5WEc1Y2JpQWdJQ0F2S2lwY2JpQWdJQ0FnS2lCelkzSnZiR3h6SUhkcGJtUnZkeUJ2Y2lCbGJHVnRaVzUwSUhkcGRHZ2dZU0J6Ylc5dmRHZ2dZbVZvWVhacGIzSmNiaUFnSUNBZ0tpQkFiV1YwYUc5a0lITnRiMjkwYUZOamNtOXNiRnh1SUNBZ0lDQXFJRUJ3WVhKaGJTQjdUMkpxWldOMGZFNXZaR1Y5SUdWc1hHNGdJQ0FnSUNvZ1FIQmhjbUZ0SUh0T2RXMWlaWEo5SUhoY2JpQWdJQ0FnS2lCQWNHRnlZVzBnZTA1MWJXSmxjbjBnZVZ4dUlDQWdJQ0FxSUVCeVpYUjFjbTV6SUh0MWJtUmxabWx1WldSOVhHNGdJQ0FnSUNvdlhHNGdJQ0FnWm5WdVkzUnBiMjRnYzIxdmIzUm9VMk55YjJ4c0tHVnNMQ0I0TENCNUtTQjdYRzRnSUNBZ0lDQjJZWElnYzJOeWIyeHNZV0pzWlR0Y2JpQWdJQ0FnSUhaaGNpQnpkR0Z5ZEZnN1hHNGdJQ0FnSUNCMllYSWdjM1JoY25SWk8xeHVJQ0FnSUNBZ2RtRnlJRzFsZEdodlpEdGNiaUFnSUNBZ0lIWmhjaUJ6ZEdGeWRGUnBiV1VnUFNCdWIzY29LVHRjYmx4dUlDQWdJQ0FnTHk4Z1pHVm1hVzVsSUhOamNtOXNiQ0JqYjI1MFpYaDBYRzRnSUNBZ0lDQnBaaUFvWld3Z1BUMDlJR1F1WW05a2VTa2dlMXh1SUNBZ0lDQWdJQ0J6WTNKdmJHeGhZbXhsSUQwZ2R6dGNiaUFnSUNBZ0lDQWdjM1JoY25SWUlEMGdkeTV6WTNKdmJHeFlJSHg4SUhjdWNHRm5aVmhQWm1aelpYUTdYRzRnSUNBZ0lDQWdJSE4wWVhKMFdTQTlJSGN1YzJOeWIyeHNXU0I4ZkNCM0xuQmhaMlZaVDJabWMyVjBPMXh1SUNBZ0lDQWdJQ0J0WlhSb2IyUWdQU0J2Y21sbmFXNWhiQzV6WTNKdmJHdzdYRzRnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQnpZM0p2Ykd4aFlteGxJRDBnWld3N1hHNGdJQ0FnSUNBZ0lITjBZWEowV0NBOUlHVnNMbk5qY205c2JFeGxablE3WEc0Z0lDQWdJQ0FnSUhOMFlYSjBXU0E5SUdWc0xuTmpjbTlzYkZSdmNEdGNiaUFnSUNBZ0lDQWdiV1YwYUc5a0lEMGdjMk55YjJ4c1JXeGxiV1Z1ZER0Y2JpQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ0x5OGdjMk55YjJ4c0lHeHZiM0JwYm1jZ2IzWmxjaUJoSUdaeVlXMWxYRzRnSUNBZ0lDQnpkR1Z3S0h0Y2JpQWdJQ0FnSUNBZ2MyTnliMnhzWVdKc1pUb2djMk55YjJ4c1lXSnNaU3hjYmlBZ0lDQWdJQ0FnYldWMGFHOWtPaUJ0WlhSb2IyUXNYRzRnSUNBZ0lDQWdJSE4wWVhKMFZHbHRaVG9nYzNSaGNuUlVhVzFsTEZ4dUlDQWdJQ0FnSUNCemRHRnlkRmc2SUhOMFlYSjBXQ3hjYmlBZ0lDQWdJQ0FnYzNSaGNuUlpPaUJ6ZEdGeWRGa3NYRzRnSUNBZ0lDQWdJSGc2SUhnc1hHNGdJQ0FnSUNBZ0lIazZJSGxjYmlBZ0lDQWdJSDBwTzF4dUlDQWdJSDFjYmx4dUlDQWdJQzh2SUU5U1NVZEpUa0ZNSUUxRlZFaFBSRk1nVDFaRlVsSkpSRVZUWEc0Z0lDQWdMeThnZHk1elkzSnZiR3dnWVc1a0lIY3VjMk55YjJ4c1ZHOWNiaUFnSUNCM0xuTmpjbTlzYkNBOUlIY3VjMk55YjJ4c1ZHOGdQU0JtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0FnSUM4dklHRjJiMmxrSUdGamRHbHZiaUIzYUdWdUlHNXZJR0Z5WjNWdFpXNTBjeUJoY21VZ2NHRnpjMlZrWEc0Z0lDQWdJQ0JwWmlBb1lYSm5kVzFsYm5Seld6QmRJRDA5UFNCMWJtUmxabWx1WldRcElIdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdU8xeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQXZMeUJoZG05cFpDQnpiVzl2ZEdnZ1ltVm9ZWFpwYjNJZ2FXWWdibTkwSUhKbGNYVnBjbVZrWEc0Z0lDQWdJQ0JwWmlBb2MyaHZkV3hrUW1GcGJFOTFkQ2hoY21kMWJXVnVkSE5iTUYwcElEMDlQU0IwY25WbEtTQjdYRzRnSUNBZ0lDQWdJRzl5YVdkcGJtRnNMbk5qY205c2JDNWpZV3hzS0Z4dUlDQWdJQ0FnSUNBZ0lIY3NYRzRnSUNBZ0lDQWdJQ0FnWVhKbmRXMWxiblJ6V3pCZExteGxablFnSVQwOUlIVnVaR1ZtYVc1bFpGeHVJQ0FnSUNBZ0lDQWdJQ0FnUHlCaGNtZDFiV1Z1ZEhOYk1GMHViR1ZtZEZ4dUlDQWdJQ0FnSUNBZ0lDQWdPaUIwZVhCbGIyWWdZWEpuZFcxbGJuUnpXekJkSUNFOVBTQW5iMkpxWldOMEoxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBL0lHRnlaM1Z0Wlc1MGMxc3dYVnh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQTZJSGN1YzJOeWIyeHNXQ0I4ZkNCM0xuQmhaMlZZVDJabWMyVjBMRnh1SUNBZ0lDQWdJQ0FnSUM4dklIVnpaU0IwYjNBZ2NISnZjQ3dnYzJWamIyNWtJR0Z5WjNWdFpXNTBJR2xtSUhCeVpYTmxiblFnYjNJZ1ptRnNiR0poWTJzZ2RHOGdjMk55YjJ4c1dWeHVJQ0FnSUNBZ0lDQWdJR0Z5WjNWdFpXNTBjMXN3WFM1MGIzQWdJVDA5SUhWdVpHVm1hVzVsWkZ4dUlDQWdJQ0FnSUNBZ0lDQWdQeUJoY21kMWJXVnVkSE5iTUYwdWRHOXdYRzRnSUNBZ0lDQWdJQ0FnSUNBNklHRnlaM1Z0Wlc1MGMxc3hYU0FoUFQwZ2RXNWtaV1pwYm1Wa1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUQ4Z1lYSm5kVzFsYm5Seld6RmRYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lEb2dkeTV6WTNKdmJHeFpJSHg4SUhjdWNHRm5aVmxQWm1aelpYUmNiaUFnSUNBZ0lDQWdLVHRjYmx4dUlDQWdJQ0FnSUNCeVpYUjFjbTQ3WEc0Z0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUM4dklFeEZWQ0JVU0VVZ1UwMVBUMVJJVGtWVFV5QkNSVWRKVGlGY2JpQWdJQ0FnSUhOdGIyOTBhRk5qY205c2JDNWpZV3hzS0Z4dUlDQWdJQ0FnSUNCM0xGeHVJQ0FnSUNBZ0lDQmtMbUp2Wkhrc1hHNGdJQ0FnSUNBZ0lHRnlaM1Z0Wlc1MGMxc3dYUzVzWldaMElDRTlQU0IxYm1SbFptbHVaV1JjYmlBZ0lDQWdJQ0FnSUNBL0lINStZWEpuZFcxbGJuUnpXekJkTG14bFpuUmNiaUFnSUNBZ0lDQWdJQ0E2SUhjdWMyTnliMnhzV0NCOGZDQjNMbkJoWjJWWVQyWm1jMlYwTEZ4dUlDQWdJQ0FnSUNCaGNtZDFiV1Z1ZEhOYk1GMHVkRzl3SUNFOVBTQjFibVJsWm1sdVpXUmNiaUFnSUNBZ0lDQWdJQ0EvSUg1K1lYSm5kVzFsYm5Seld6QmRMblJ2Y0Z4dUlDQWdJQ0FnSUNBZ0lEb2dkeTV6WTNKdmJHeFpJSHg4SUhjdWNHRm5aVmxQWm1aelpYUmNiaUFnSUNBZ0lDazdYRzRnSUNBZ2ZUdGNibHh1SUNBZ0lDOHZJSGN1YzJOeWIyeHNRbmxjYmlBZ0lDQjNMbk5qY205c2JFSjVJRDBnWm5WdVkzUnBiMjRvS1NCN1hHNGdJQ0FnSUNBdkx5QmhkbTlwWkNCaFkzUnBiMjRnZDJobGJpQnVieUJoY21kMWJXVnVkSE1nWVhKbElIQmhjM05sWkZ4dUlDQWdJQ0FnYVdZZ0tHRnlaM1Z0Wlc1MGMxc3dYU0E5UFQwZ2RXNWtaV1pwYm1Wa0tTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJqdGNiaUFnSUNBZ0lIMWNibHh1SUNBZ0lDQWdMeThnWVhadmFXUWdjMjF2YjNSb0lHSmxhR0YyYVc5eUlHbG1JRzV2ZENCeVpYRjFhWEpsWkZ4dUlDQWdJQ0FnYVdZZ0tITm9iM1ZzWkVKaGFXeFBkWFFvWVhKbmRXMWxiblJ6V3pCZEtTa2dlMXh1SUNBZ0lDQWdJQ0J2Y21sbmFXNWhiQzV6WTNKdmJHeENlUzVqWVd4c0tGeHVJQ0FnSUNBZ0lDQWdJSGNzWEc0Z0lDQWdJQ0FnSUNBZ1lYSm5kVzFsYm5Seld6QmRMbXhsWm5RZ0lUMDlJSFZ1WkdWbWFXNWxaRnh1SUNBZ0lDQWdJQ0FnSUNBZ1B5QmhjbWQxYldWdWRITmJNRjB1YkdWbWRGeHVJQ0FnSUNBZ0lDQWdJQ0FnT2lCMGVYQmxiMllnWVhKbmRXMWxiblJ6V3pCZElDRTlQU0FuYjJKcVpXTjBKeUEvSUdGeVozVnRaVzUwYzFzd1hTQTZJREFzWEc0Z0lDQWdJQ0FnSUNBZ1lYSm5kVzFsYm5Seld6QmRMblJ2Y0NBaFBUMGdkVzVrWldacGJtVmtYRzRnSUNBZ0lDQWdJQ0FnSUNBL0lHRnlaM1Z0Wlc1MGMxc3dYUzUwYjNCY2JpQWdJQ0FnSUNBZ0lDQWdJRG9nWVhKbmRXMWxiblJ6V3pGZElDRTlQU0IxYm1SbFptbHVaV1FnUHlCaGNtZDFiV1Z1ZEhOYk1WMGdPaUF3WEc0Z0lDQWdJQ0FnSUNrN1hHNWNiaUFnSUNBZ0lDQWdjbVYwZFhKdU8xeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQXZMeUJNUlZRZ1ZFaEZJRk5OVDA5VVNFNUZVMU1nUWtWSFNVNGhYRzRnSUNBZ0lDQnpiVzl2ZEdoVFkzSnZiR3d1WTJGc2JDaGNiaUFnSUNBZ0lDQWdkeXhjYmlBZ0lDQWdJQ0FnWkM1aWIyUjVMRnh1SUNBZ0lDQWdJQ0IrZm1GeVozVnRaVzUwYzFzd1hTNXNaV1owSUNzZ0tIY3VjMk55YjJ4c1dDQjhmQ0IzTG5CaFoyVllUMlptYzJWMEtTeGNiaUFnSUNBZ0lDQWdmbjVoY21kMWJXVnVkSE5iTUYwdWRHOXdJQ3NnS0hjdWMyTnliMnhzV1NCOGZDQjNMbkJoWjJWWlQyWm1jMlYwS1Z4dUlDQWdJQ0FnS1R0Y2JpQWdJQ0I5TzF4dVhHNGdJQ0FnTHk4Z1JXeGxiV1Z1ZEM1d2NtOTBiM1I1Y0dVdWMyTnliMnhzSUdGdVpDQkZiR1Z0Wlc1MExuQnliM1J2ZEhsd1pTNXpZM0p2Ykd4VWIxeHVJQ0FnSUVWc1pXMWxiblF1Y0hKdmRHOTBlWEJsTG5OamNtOXNiQ0E5SUVWc1pXMWxiblF1Y0hKdmRHOTBlWEJsTG5OamNtOXNiRlJ2SUQwZ1puVnVZM1JwYjI0b0tTQjdYRzRnSUNBZ0lDQXZMeUJoZG05cFpDQmhZM1JwYjI0Z2QyaGxiaUJ1YnlCaGNtZDFiV1Z1ZEhNZ1lYSmxJSEJoYzNObFpGeHVJQ0FnSUNBZ2FXWWdLR0Z5WjNWdFpXNTBjMXN3WFNBOVBUMGdkVzVrWldacGJtVmtLU0I3WEc0Z0lDQWdJQ0FnSUhKbGRIVnlianRjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnTHk4Z1lYWnZhV1FnYzIxdmIzUm9JR0psYUdGMmFXOXlJR2xtSUc1dmRDQnlaWEYxYVhKbFpGeHVJQ0FnSUNBZ2FXWWdLSE5vYjNWc1pFSmhhV3hQZFhRb1lYSm5kVzFsYm5Seld6QmRLU0E5UFQwZ2RISjFaU2tnZTF4dUlDQWdJQ0FnSUNBdkx5QnBaaUJ2Ym1VZ2JuVnRZbVZ5SUdseklIQmhjM05sWkN3Z2RHaHliM2NnWlhKeWIzSWdkRzhnYldGMFkyZ2dSbWx5WldadmVDQnBiWEJzWlcxbGJuUmhkR2x2Ymx4dUlDQWdJQ0FnSUNCcFppQW9kSGx3Wlc5bUlHRnlaM1Z0Wlc1MGMxc3dYU0E5UFQwZ0oyNTFiV0psY2ljZ0ppWWdZWEpuZFcxbGJuUnpXekZkSUQwOVBTQjFibVJsWm1sdVpXUXBJSHRjYmlBZ0lDQWdJQ0FnSUNCMGFISnZkeUJ1WlhjZ1UzbHVkR0Y0UlhKeWIzSW9KMVpoYkhWbElHTnZkV3hrSUc1dmRDQmlaU0JqYjI1MlpYSjBaV1FuS1R0Y2JpQWdJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQWdJRzl5YVdkcGJtRnNMbVZzWlcxbGJuUlRZM0p2Ykd3dVkyRnNiQ2hjYmlBZ0lDQWdJQ0FnSUNCMGFHbHpMRnh1SUNBZ0lDQWdJQ0FnSUM4dklIVnpaU0JzWldaMElIQnliM0FzSUdacGNuTjBJRzUxYldKbGNpQmhjbWQxYldWdWRDQnZjaUJtWVd4c1ltRmpheUIwYnlCelkzSnZiR3hNWldaMFhHNGdJQ0FnSUNBZ0lDQWdZWEpuZFcxbGJuUnpXekJkTG14bFpuUWdJVDA5SUhWdVpHVm1hVzVsWkZ4dUlDQWdJQ0FnSUNBZ0lDQWdQeUIrZm1GeVozVnRaVzUwYzFzd1hTNXNaV1owWEc0Z0lDQWdJQ0FnSUNBZ0lDQTZJSFI1Y0dWdlppQmhjbWQxYldWdWRITmJNRjBnSVQwOUlDZHZZbXBsWTNRbklEOGdmbjVoY21kMWJXVnVkSE5iTUYwZ09pQjBhR2x6TG5OamNtOXNiRXhsWm5Rc1hHNGdJQ0FnSUNBZ0lDQWdMeThnZFhObElIUnZjQ0J3Y205d0xDQnpaV052Ym1RZ1lYSm5kVzFsYm5RZ2IzSWdabUZzYkdKaFkyc2dkRzhnYzJOeWIyeHNWRzl3WEc0Z0lDQWdJQ0FnSUNBZ1lYSm5kVzFsYm5Seld6QmRMblJ2Y0NBaFBUMGdkVzVrWldacGJtVmtYRzRnSUNBZ0lDQWdJQ0FnSUNBL0lINStZWEpuZFcxbGJuUnpXekJkTG5SdmNGeHVJQ0FnSUNBZ0lDQWdJQ0FnT2lCaGNtZDFiV1Z1ZEhOYk1WMGdJVDA5SUhWdVpHVm1hVzVsWkNBL0lINStZWEpuZFcxbGJuUnpXekZkSURvZ2RHaHBjeTV6WTNKdmJHeFViM0JjYmlBZ0lDQWdJQ0FnS1R0Y2JseHVJQ0FnSUNBZ0lDQnlaWFIxY200N1hHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lIWmhjaUJzWldaMElEMGdZWEpuZFcxbGJuUnpXekJkTG14bFpuUTdYRzRnSUNBZ0lDQjJZWElnZEc5d0lEMGdZWEpuZFcxbGJuUnpXekJkTG5SdmNEdGNibHh1SUNBZ0lDQWdMeThnVEVWVUlGUklSU0JUVFU5UFZFaE9SVk5USUVKRlIwbE9JVnh1SUNBZ0lDQWdjMjF2YjNSb1UyTnliMnhzTG1OaGJHd29YRzRnSUNBZ0lDQWdJSFJvYVhNc1hHNGdJQ0FnSUNBZ0lIUm9hWE1zWEc0Z0lDQWdJQ0FnSUhSNWNHVnZaaUJzWldaMElEMDlQU0FuZFc1a1pXWnBibVZrSnlBL0lIUm9hWE11YzJOeWIyeHNUR1ZtZENBNklINStiR1ZtZEN4Y2JpQWdJQ0FnSUNBZ2RIbHdaVzltSUhSdmNDQTlQVDBnSjNWdVpHVm1hVzVsWkNjZ1B5QjBhR2x6TG5OamNtOXNiRlJ2Y0NBNklINStkRzl3WEc0Z0lDQWdJQ0FwTzF4dUlDQWdJSDA3WEc1Y2JpQWdJQ0F2THlCRmJHVnRaVzUwTG5CeWIzUnZkSGx3WlM1elkzSnZiR3hDZVZ4dUlDQWdJRVZzWlcxbGJuUXVjSEp2ZEc5MGVYQmxMbk5qY205c2JFSjVJRDBnWm5WdVkzUnBiMjRvS1NCN1hHNGdJQ0FnSUNBdkx5QmhkbTlwWkNCaFkzUnBiMjRnZDJobGJpQnVieUJoY21kMWJXVnVkSE1nWVhKbElIQmhjM05sWkZ4dUlDQWdJQ0FnYVdZZ0tHRnlaM1Z0Wlc1MGMxc3dYU0E5UFQwZ2RXNWtaV1pwYm1Wa0tTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJqdGNiaUFnSUNBZ0lIMWNibHh1SUNBZ0lDQWdMeThnWVhadmFXUWdjMjF2YjNSb0lHSmxhR0YyYVc5eUlHbG1JRzV2ZENCeVpYRjFhWEpsWkZ4dUlDQWdJQ0FnYVdZZ0tITm9iM1ZzWkVKaGFXeFBkWFFvWVhKbmRXMWxiblJ6V3pCZEtTQTlQVDBnZEhKMVpTa2dlMXh1SUNBZ0lDQWdJQ0J2Y21sbmFXNWhiQzVsYkdWdFpXNTBVMk55YjJ4c0xtTmhiR3dvWEc0Z0lDQWdJQ0FnSUNBZ2RHaHBjeXhjYmlBZ0lDQWdJQ0FnSUNCaGNtZDFiV1Z1ZEhOYk1GMHViR1ZtZENBaFBUMGdkVzVrWldacGJtVmtYRzRnSUNBZ0lDQWdJQ0FnSUNBL0lINStZWEpuZFcxbGJuUnpXekJkTG14bFpuUWdLeUIwYUdsekxuTmpjbTlzYkV4bFpuUmNiaUFnSUNBZ0lDQWdJQ0FnSURvZ2ZuNWhjbWQxYldWdWRITmJNRjBnS3lCMGFHbHpMbk5qY205c2JFeGxablFzWEc0Z0lDQWdJQ0FnSUNBZ1lYSm5kVzFsYm5Seld6QmRMblJ2Y0NBaFBUMGdkVzVrWldacGJtVmtYRzRnSUNBZ0lDQWdJQ0FnSUNBL0lINStZWEpuZFcxbGJuUnpXekJkTG5SdmNDQXJJSFJvYVhNdWMyTnliMnhzVkc5d1hHNGdJQ0FnSUNBZ0lDQWdJQ0E2SUg1K1lYSm5kVzFsYm5Seld6RmRJQ3NnZEdocGN5NXpZM0p2Ykd4VWIzQmNiaUFnSUNBZ0lDQWdLVHRjYmx4dUlDQWdJQ0FnSUNCeVpYUjFjbTQ3WEc0Z0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUhSb2FYTXVjMk55YjJ4c0tIdGNiaUFnSUNBZ0lDQWdiR1ZtZERvZ2ZuNWhjbWQxYldWdWRITmJNRjB1YkdWbWRDQXJJSFJvYVhNdWMyTnliMnhzVEdWbWRDeGNiaUFnSUNBZ0lDQWdkRzl3T2lCK2ZtRnlaM1Z0Wlc1MGMxc3dYUzUwYjNBZ0t5QjBhR2x6TG5OamNtOXNiRlJ2Y0N4Y2JpQWdJQ0FnSUNBZ1ltVm9ZWFpwYjNJNklHRnlaM1Z0Wlc1MGMxc3dYUzVpWldoaGRtbHZjbHh1SUNBZ0lDQWdmU2s3WEc0Z0lDQWdmVHRjYmx4dUlDQWdJQzh2SUVWc1pXMWxiblF1Y0hKdmRHOTBlWEJsTG5OamNtOXNiRWx1ZEc5V2FXVjNYRzRnSUNBZ1JXeGxiV1Z1ZEM1d2NtOTBiM1I1Y0dVdWMyTnliMnhzU1c1MGIxWnBaWGNnUFNCbWRXNWpkR2x2YmlncElIdGNiaUFnSUNBZ0lDOHZJR0YyYjJsa0lITnRiMjkwYUNCaVpXaGhkbWx2Y2lCcFppQnViM1FnY21WeGRXbHlaV1JjYmlBZ0lDQWdJR2xtSUNoemFHOTFiR1JDWVdsc1QzVjBLR0Z5WjNWdFpXNTBjMXN3WFNrZ1BUMDlJSFJ5ZFdVcElIdGNiaUFnSUNBZ0lDQWdiM0pwWjJsdVlXd3VjMk55YjJ4c1NXNTBiMVpwWlhjdVkyRnNiQ2hjYmlBZ0lDQWdJQ0FnSUNCMGFHbHpMRnh1SUNBZ0lDQWdJQ0FnSUdGeVozVnRaVzUwYzFzd1hTQTlQVDBnZFc1a1pXWnBibVZrSUQ4Z2RISjFaU0E2SUdGeVozVnRaVzUwYzFzd1hWeHVJQ0FnSUNBZ0lDQXBPMXh1WEc0Z0lDQWdJQ0FnSUhKbGRIVnlianRjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnTHk4Z1RFVlVJRlJJUlNCVFRVOVBWRWhPUlZOVElFSkZSMGxPSVZ4dUlDQWdJQ0FnZG1GeUlITmpjbTlzYkdGaWJHVlFZWEpsYm5RZ1BTQm1hVzVrVTJOeWIyeHNZV0pzWlZCaGNtVnVkQ2gwYUdsektUdGNiaUFnSUNBZ0lIWmhjaUJ3WVhKbGJuUlNaV04wY3lBOUlITmpjbTlzYkdGaWJHVlFZWEpsYm5RdVoyVjBRbTkxYm1ScGJtZERiR2xsYm5SU1pXTjBLQ2s3WEc0Z0lDQWdJQ0IyWVhJZ1kyeHBaVzUwVW1WamRITWdQU0IwYUdsekxtZGxkRUp2ZFc1a2FXNW5RMnhwWlc1MFVtVmpkQ2dwTzF4dVhHNGdJQ0FnSUNCcFppQW9jMk55YjJ4c1lXSnNaVkJoY21WdWRDQWhQVDBnWkM1aWIyUjVLU0I3WEc0Z0lDQWdJQ0FnSUM4dklISmxkbVZoYkNCbGJHVnRaVzUwSUdsdWMybGtaU0J3WVhKbGJuUmNiaUFnSUNBZ0lDQWdjMjF2YjNSb1UyTnliMnhzTG1OaGJHd29YRzRnSUNBZ0lDQWdJQ0FnZEdocGN5eGNiaUFnSUNBZ0lDQWdJQ0J6WTNKdmJHeGhZbXhsVUdGeVpXNTBMRnh1SUNBZ0lDQWdJQ0FnSUhOamNtOXNiR0ZpYkdWUVlYSmxiblF1YzJOeWIyeHNUR1ZtZENBcklHTnNhV1Z1ZEZKbFkzUnpMbXhsWm5RZ0xTQndZWEpsYm5SU1pXTjBjeTVzWldaMExGeHVJQ0FnSUNBZ0lDQWdJSE5qY205c2JHRmliR1ZRWVhKbGJuUXVjMk55YjJ4c1ZHOXdJQ3NnWTJ4cFpXNTBVbVZqZEhNdWRHOXdJQzBnY0dGeVpXNTBVbVZqZEhNdWRHOXdYRzRnSUNBZ0lDQWdJQ2s3WEc1Y2JpQWdJQ0FnSUNBZ0x5OGdjbVYyWldGc0lIQmhjbVZ1ZENCcGJpQjJhV1YzY0c5eWRDQjFibXhsYzNNZ2FYTWdabWw0WldSY2JpQWdJQ0FnSUNBZ2FXWWdLSGN1WjJWMFEyOXRjSFYwWldSVGRIbHNaU2h6WTNKdmJHeGhZbXhsVUdGeVpXNTBLUzV3YjNOcGRHbHZiaUFoUFQwZ0oyWnBlR1ZrSnlrZ2UxeHVJQ0FnSUNBZ0lDQWdJSGN1YzJOeWIyeHNRbmtvZTF4dUlDQWdJQ0FnSUNBZ0lDQWdiR1ZtZERvZ2NHRnlaVzUwVW1WamRITXViR1ZtZEN4Y2JpQWdJQ0FnSUNBZ0lDQWdJSFJ2Y0RvZ2NHRnlaVzUwVW1WamRITXVkRzl3TEZ4dUlDQWdJQ0FnSUNBZ0lDQWdZbVZvWVhacGIzSTZJQ2R6Ylc5dmRHZ25YRzRnSUNBZ0lDQWdJQ0FnZlNrN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNBZ0lDOHZJSEpsZG1WaGJDQmxiR1Z0Wlc1MElHbHVJSFpwWlhkd2IzSjBYRzRnSUNBZ0lDQWdJSGN1YzJOeWIyeHNRbmtvZTF4dUlDQWdJQ0FnSUNBZ0lHeGxablE2SUdOc2FXVnVkRkpsWTNSekxteGxablFzWEc0Z0lDQWdJQ0FnSUNBZ2RHOXdPaUJqYkdsbGJuUlNaV04wY3k1MGIzQXNYRzRnSUNBZ0lDQWdJQ0FnWW1Wb1lYWnBiM0k2SUNkemJXOXZkR2duWEc0Z0lDQWdJQ0FnSUgwcE8xeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUgwN1hHNGdJSDFjYmx4dUlDQnBaaUFvZEhsd1pXOW1JR1Y0Y0c5eWRITWdQVDA5SUNkdlltcGxZM1FuSUNZbUlIUjVjR1Z2WmlCdGIyUjFiR1VnSVQwOUlDZDFibVJsWm1sdVpXUW5LU0I3WEc0Z0lDQWdMeThnWTI5dGJXOXVhbk5jYmlBZ0lDQnRiMlIxYkdVdVpYaHdiM0owY3lBOUlIc2djRzlzZVdacGJHdzZJSEJ2YkhsbWFXeHNJSDA3WEc0Z0lIMGdaV3h6WlNCN1hHNGdJQ0FnTHk4Z1oyeHZZbUZzWEc0Z0lDQWdjRzlzZVdacGJHd29LVHRjYmlBZ2ZWeHVYRzU5S0NrcE8xeHVJaXdpWTI5dWMzUWdSRUlnUFNBbmFIUjBjSE02THk5dVpYaDFjeTFqWVhSaGJHOW5MbVpwY21WaVlYTmxhVzh1WTI5dEwzQnZjM1J6TG1wemIyNC9ZWFYwYUQwM1p6ZHdlVXRMZVd0T00wNDFaWGR5U1cxb1QyRlROblozY2taell6Vm1TMnR5YXpobGFucG1KenRjYmx4dVkyOXVjM1FnSkd4dllXUnBibWNnUFNCQmNuSmhlUzVtY205dEtHUnZZM1Z0Wlc1MExuRjFaWEo1VTJWc1pXTjBiM0pCYkd3b0p5NXNiMkZrYVc1bkp5a3BPMXh1WTI5dWMzUWdKR0Z5ZEdsamJHVk1hWE4wSUQwZ1pHOWpkVzFsYm5RdVoyVjBSV3hsYldWdWRFSjVTV1FvSjJwekxXeHBjM1FuS1R0Y2JtTnZibk4wSUNSdVlYWWdQU0JrYjJOMWJXVnVkQzVuWlhSRmJHVnRaVzUwUW5sSlpDZ25hbk10Ym1GMkp5azdYRzVqYjI1emRDQWtjR0Z5WVd4c1lYZ2dQU0JrYjJOMWJXVnVkQzV4ZFdWeWVWTmxiR1ZqZEc5eUtDY3VjR0Z5WVd4c1lYZ25LVHRjYm1OdmJuTjBJQ1JqYjI1MFpXNTBJRDBnWkc5amRXMWxiblF1Y1hWbGNubFRaV3hsWTNSdmNpZ25MbU52Ym5SbGJuUW5LVHRjYm1OdmJuTjBJQ1IwYVhSc1pTQTlJR1J2WTNWdFpXNTBMbWRsZEVWc1pXMWxiblJDZVVsa0tDZHFjeTEwYVhSc1pTY3BPMXh1WTI5dWMzUWdKSFZ3UVhKeWIzY2dQU0JrYjJOMWJXVnVkQzVuWlhSRmJHVnRaVzUwUW5sSlpDZ25hbk10WVhKeWIzY25LVHRjYm1OdmJuTjBJQ1J0YjJSaGJDQTlJR1J2WTNWdFpXNTBMbkYxWlhKNVUyVnNaV04wYjNJb0p5NXRiMlJoYkNjcE8xeHVZMjl1YzNRZ0pHeHBaMmgwWW05NElEMGdaRzlqZFcxbGJuUXVjWFZsY25sVFpXeGxZM1J2Y2lnbkxteHBaMmgwWW05NEp5azdYRzVqYjI1emRDQWtkbWxsZHlBOUlHUnZZM1Z0Wlc1MExuRjFaWEo1VTJWc1pXTjBiM0lvSnk1c2FXZG9kR0p2ZUMxMmFXVjNKeWs3WEc1amIyNXpkQ0J6YjNKMFNXUnpJRDBnV3lkaGNuUnBjM1FuTENBbmRHbDBiR1VuWFR0Y2JseHVaWGh3YjNKMElIc2dYRzVjZEVSQ0xGeHVYSFFrYkc5aFpHbHVaeXhjYmx4MEpHRnlkR2xqYkdWTWFYTjBMQ0JjYmx4MEpHNWhkaXdnWEc1Y2RDUndZWEpoYkd4aGVDeGNibHgwSkdOdmJuUmxiblFzWEc1Y2RDUjBhWFJzWlN4Y2JseDBKSFZ3UVhKeWIzY3NYRzVjZENSdGIyUmhiQ3hjYmx4MEpHeHBaMmgwWW05NExGeHVYSFFrZG1sbGR5eGNibHgwYzI5eWRFbGtjMXh1ZlRzaUxDSnBiWEJ2Y25RZ2MyMXZiM1JvYzJOeWIyeHNJR1p5YjIwZ0ozTnRiMjkwYUhOamNtOXNiQzF3YjJ4NVptbHNiQ2M3WEc1Y2JtbHRjRzl5ZENCN0lHRnlkR2xqYkdWVVpXMXdiR0YwWlN3Z2NtVnVaR1Z5VG1GMlRHY2dmU0JtY205dElDY3VMM1JsYlhCc1lYUmxjeWM3WEc1cGJYQnZjblFnZXlCa1pXSnZkVzVqWlN3Z2FHbGtaVXh2WVdScGJtY3NJSE5qY205c2JGUnZWRzl3SUgwZ1puSnZiU0FuTGk5MWRHbHNjeWM3WEc1cGJYQnZjblFnZXlCRVFpd2dKR0Z5ZEdsamJHVk1hWE4wTENCemIzSjBTV1J6SUgwZ1puSnZiU0FuTGk5amIyNXpkR0Z1ZEhNbk8xeHVhVzF3YjNKMElIc2dZWFIwWVdOb1RXOWtZV3hNYVhOMFpXNWxjbk1zSUdGMGRHRmphRlZ3UVhKeWIzZE1hWE4wWlc1bGNuTXNJR0YwZEdGamFFbHRZV2RsVEdsemRHVnVaWEp6TENCdFlXdGxRV3h3YUdGaVpYUXNJRzFoYTJWVGJHbGtaWElnZlNCbWNtOXRJQ2N1TDIxdlpIVnNaWE1uTzF4dVhHNXNaWFFnYzI5eWRFdGxlU0E5SURBN0lDOHZJREFnUFNCaGNuUnBjM1FzSURFZ1BTQjBhWFJzWlZ4dWJHVjBJR1Z1ZEhKcFpYTWdQU0I3SUdKNVFYVjBhRzl5T2lCYlhTd2dZbmxVYVhSc1pUb2dXMTBnZlR0Y2JseHVZMjl1YzNRZ2MyVjBWWEJUYjNKMFFuVjBkRzl1Y3lBOUlDZ3BJRDArSUh0Y2JseDBjMjl5ZEVsa2N5NW1iM0pGWVdOb0tHbGtJRDArSUh0Y2JseDBYSFJqYjI1emRDQmhiSFFnUFNCcFpDQTlQVDBnSjJGeWRHbHpkQ2NnUHlBbmRHbDBiR1VuSURvZ0oyRnlkR2x6ZENjN1hHNWNibHgwWEhSamIyNXpkQ0FrWW5WMGRHOXVJRDBnWkc5amRXMWxiblF1WjJWMFJXeGxiV1Z1ZEVKNVNXUW9ZR3B6TFdKNUxTUjdhV1I5WUNrN1hHNWNkRngwWTI5dWMzUWdKR0ZzZEVKMWRIUnZiaUE5SUdSdlkzVnRaVzUwTG1kbGRFVnNaVzFsYm5SQ2VVbGtLR0JxY3kxaWVTMGtlMkZzZEgxZ0tUdGNibHh1WEhSY2RDUmlkWFIwYjI0dVlXUmtSWFpsYm5STWFYTjBaVzVsY2lnblkyeHBZMnNuTENBb0tTQTlQaUI3WEc1Y2RGeDBYSFJ6WTNKdmJHeFViMVJ2Y0NncE8xeHVYSFJjZEZ4MGMyOXlkRXRsZVNBOUlDRnpiM0owUzJWNU8xeHVYSFJjZEZ4MGNtVnVaR1Z5Ulc1MGNtbGxjeWdwTzF4dVhHNWNkRngwWEhRa1luVjBkRzl1TG1Oc1lYTnpUR2x6ZEM1aFpHUW9KMkZqZEdsMlpTY3BPMXh1WEhSY2RGeDBKR0ZzZEVKMWRIUnZiaTVqYkdGemMweHBjM1F1Y21WdGIzWmxLQ2RoWTNScGRtVW5LVHRjYmx4MFhIUjlLVnh1WEhSOUtUdGNibjA3WEc1Y2JtTnZibk4wSUhKbGJtUmxja1Z1ZEhKcFpYTWdQU0FvS1NBOVBpQjdYRzVjZEdOdmJuTjBJR1Z1ZEhKcFpYTk1hWE4wSUQwZ2MyOXlkRXRsZVNBL0lHVnVkSEpwWlhNdVlubFVhWFJzWlNBNklHVnVkSEpwWlhNdVlubEJkWFJvYjNJN1hHNWNibHgwSkdGeWRHbGpiR1ZNYVhOMExtbHVibVZ5U0ZSTlRDQTlJQ2NuTzF4dVhHNWNkR1Z1ZEhKcFpYTk1hWE4wTG1admNrVmhZMmdvS0dWdWRISjVMQ0JwS1NBOVBpQjdYRzVjZEZ4MEpHRnlkR2xqYkdWTWFYTjBMbWx1YzJWeWRFRmthbUZqWlc1MFNGUk5UQ2duWW1WbWIzSmxaVzVrSnl3Z1lYSjBhV05zWlZSbGJYQnNZWFJsS0dWdWRISjVMQ0JwS1NrN1hHNWNkRngwYldGclpWTnNhV1JsY2loa2IyTjFiV1Z1ZEM1blpYUkZiR1Z0Wlc1MFFubEpaQ2hnYzJ4cFpHVnlMU1I3YVgxZ0tTazdYRzVjZEgwcE8xeHVYRzVjZEdGMGRHRmphRWx0WVdkbFRHbHpkR1Z1WlhKektDazdYRzVjZEcxaGEyVkJiSEJvWVdKbGRDaHpiM0owUzJWNUtUdGNibjA3WEc1Y2JtTnZibk4wSUhObGRFUmhkR0ZCYm1SVGIzSjBRbmxVYVhSc1pTQTlJQ2hrWVhSaEtTQTlQaUI3WEc1Y2RHVnVkSEpwWlhNdVlubEJkWFJvYjNJZ1BTQmtZWFJoTzF4dVhIUmxiblJ5YVdWekxtSjVWR2wwYkdVZ1BTQmtZWFJoTG5Oc2FXTmxLQ2s3SUM4dklHTnZjR2xsY3lCa1lYUmhJR1p2Y2lCaWVWUnBkR3hsSUhOdmNuUmNibHh1WEhSbGJuUnlhV1Z6TG1KNVZHbDBiR1V1YzI5eWRDZ29ZU3dnWWlrZ1BUNGdlMXh1WEhSY2RHeGxkQ0JoVkdsMGJHVWdQU0JoTG5ScGRHeGxXekJkTG5SdlZYQndaWEpEWVhObEtDazdYRzVjZEZ4MGJHVjBJR0pVYVhSc1pTQTlJR0l1ZEdsMGJHVmJNRjB1ZEc5VmNIQmxja05oYzJVb0tUdGNibHgwWEhScFppQW9ZVlJwZEd4bElENGdZbFJwZEd4bEtTQnlaWFIxY200Z01UdGNibHgwWEhSbGJITmxJR2xtSUNoaFZHbDBiR1VnUENCaVZHbDBiR1VwSUhKbGRIVnliaUF0TVR0Y2JseDBYSFJsYkhObElISmxkSFZ5YmlBd08xeHVYSFI5S1R0Y2JuMDdYRzVjYm1OdmJuTjBJR1psZEdOb1JHRjBZU0E5SUNncElEMCtJSHRjYmx4MFptVjBZMmdvUkVJcExuUm9aVzRvY21WeklEMCtJSEpsY3k1cWMyOXVLQ2twWEc1Y2RDNTBhR1Z1S0dSaGRHRWdQVDRnZTF4dVhIUmNkSE5sZEVSaGRHRkJibVJUYjNKMFFubFVhWFJzWlNoa1lYUmhLVHRjYmx4MFhIUnlaVzVrWlhKRmJuUnlhV1Z6S0NrN1hHNWNkRngwYUdsa1pVeHZZV1JwYm1jb0tUdGNibHgwZlNsY2JseDBMbU5oZEdOb0tHVnljaUE5UGlCamIyNXpiMnhsTG5kaGNtNG9aWEp5S1NrN1hHNTlPMXh1WEc1amIyNXpkQ0JwYm1sMElEMGdLQ2tnUFQ0Z2UxeHVYSFJ6Ylc5dmRHaHpZM0p2Ykd3dWNHOXNlV1pwYkd3b0tUdGNibHgwWm1WMFkyaEVZWFJoS0NrN1hHNWNkSEpsYm1SbGNrNWhka3huS0NrN1hHNWNkSE5sZEZWd1UyOXlkRUoxZEhSdmJuTW9LVHRjYmx4MFlYUjBZV05vVlhCQmNuSnZkMHhwYzNSbGJtVnljeWdwTzF4dVhIUmhkSFJoWTJoTmIyUmhiRXhwYzNSbGJtVnljeWdwTzF4dWZUdGNibHh1YVc1cGRDZ3BPMXh1SWl3aWFXMXdiM0owSUhzZ0pIWnBaWGNzSUNSc2FXZG9kR0p2ZUNCOUlHWnliMjBnSnk0dUwyTnZibk4wWVc1MGN5YzdYRzVjYm14bGRDQnNhV2RvZEdKdmVDQTlJR1poYkhObE8xeHVYRzVqYjI1emRDQmhkSFJoWTJoSmJXRm5aVXhwYzNSbGJtVnljeUE5SUNncElEMCtJSHRjYmx4MFkyOXVjM1FnSkdsdFlXZGxjeUE5SUVGeWNtRjVMbVp5YjIwb1pHOWpkVzFsYm5RdWNYVmxjbmxUWld4bFkzUnZja0ZzYkNnbkxtRnlkR2xqYkdVdGFXMW5KeWtwTzF4dVhHNWNkQ1JwYldGblpYTXVabTl5UldGamFDaHBiV2NnUFQ0Z2UxeHVYSFJjZEdsdFp5NWhaR1JGZG1WdWRFeHBjM1JsYm1WeUtDZGpiR2xqYXljc0lDaGxkblFwSUQwK0lIdGNibHgwWEhSY2RHbG1JQ2doYkdsbmFIUmliM2dwSUh0Y2JseDBYSFJjZEZ4MGJHVjBJSE55WXlBOUlHbHRaeTV6Y21NN1hHNWNkRngwWEhSY2RGeHVYSFJjZEZ4MFhIUWtiR2xuYUhSaWIzZ3VZMnhoYzNOTWFYTjBMbUZrWkNnbmMyaHZkeTFwYldjbktUdGNibHgwWEhSY2RGeDBKSFpwWlhjdWMyVjBRWFIwY21saWRYUmxLQ2R6ZEhsc1pTY3NJR0JpWVdOclozSnZkVzVrTFdsdFlXZGxPaUIxY213b0pIdHpjbU45S1dBcE8xeHVYSFJjZEZ4MFhIUnNhV2RvZEdKdmVDQTlJSFJ5ZFdVN1hHNWNkRngwWEhSOVhHNWNkRngwZlNrN1hHNWNkSDBwTzF4dVhHNWNkQ1IyYVdWM0xtRmtaRVYyWlc1MFRHbHpkR1Z1WlhJb0oyTnNhV05ySnl3Z0tDa2dQVDRnZTF4dVhIUmNkR2xtSUNoc2FXZG9kR0p2ZUNrZ2UxeHVYSFJjZEZ4MEpHeHBaMmgwWW05NExtTnNZWE56VEdsemRDNXlaVzF2ZG1Vb0ozTm9iM2N0YVcxbkp5azdYRzVjZEZ4MFhIUnNhV2RvZEdKdmVDQTlJR1poYkhObE8xeHVYSFJjZEgxY2JseDBmU2s3WEc1OU8xeHVYRzVsZUhCdmNuUWdaR1ZtWVhWc2RDQmhkSFJoWTJoSmJXRm5aVXhwYzNSbGJtVnljenNpTENKcGJYQnZjblFnZXlBa2JXOWtZV3dnZlNCbWNtOXRJQ2N1TGk5amIyNXpkR0Z1ZEhNbk8xeHVYRzVzWlhRZ2JXOWtZV3dnUFNCbVlXeHpaVHRjYm1OdmJuTjBJR0YwZEdGamFFMXZaR0ZzVEdsemRHVnVaWEp6SUQwZ0tDa2dQVDRnZTF4dVhIUmpiMjV6ZENBa1ptbHVaQ0E5SUdSdlkzVnRaVzUwTG1kbGRFVnNaVzFsYm5SQ2VVbGtLQ2RxY3kxbWFXNWtKeWs3WEc1Y2RGeHVYSFFrWm1sdVpDNWhaR1JGZG1WdWRFeHBjM1JsYm1WeUtDZGpiR2xqYXljc0lDZ3BJRDArSUh0Y2JseDBYSFFrYlc5a1lXd3VZMnhoYzNOTWFYTjBMbUZrWkNnbmMyaHZkeWNwTzF4dVhIUmNkRzF2WkdGc0lEMGdkSEoxWlR0Y2JseDBmU2s3WEc1Y2JseDBKRzF2WkdGc0xtRmtaRVYyWlc1MFRHbHpkR1Z1WlhJb0oyTnNhV05ySnl3Z0tDa2dQVDRnZTF4dVhIUmNkQ1J0YjJSaGJDNWpiR0Z6YzB4cGMzUXVjbVZ0YjNabEtDZHphRzkzSnlrN1hHNWNkRngwYlc5a1lXd2dQU0JtWVd4elpUdGNibHgwZlNrN1hHNWNibHgwZDJsdVpHOTNMbUZrWkVWMlpXNTBUR2x6ZEdWdVpYSW9KMnRsZVdSdmQyNG5MQ0FvS1NBOVBpQjdYRzVjZEZ4MGFXWWdLRzF2WkdGc0tTQjdYRzVjZEZ4MFhIUnpaWFJVYVcxbGIzVjBLQ2dwSUQwK0lIdGNibHgwWEhSY2RGeDBKRzF2WkdGc0xtTnNZWE56VEdsemRDNXlaVzF2ZG1Vb0ozTm9iM2NuS1R0Y2JseDBYSFJjZEZ4MGJXOWtZV3dnUFNCbVlXeHpaVHRjYmx4MFhIUmNkSDBzSURZd01DazdYRzVjZEZ4MGZUdGNibHgwZlNrN1hHNTlPMXh1WEc1bGVIQnZjblFnWkdWbVlYVnNkQ0JoZEhSaFkyaE5iMlJoYkV4cGMzUmxibVZ5Y3pzaUxDSnBiWEJ2Y25RZ2V5QWtkR2wwYkdVc0lDUndZWEpoYkd4aGVDd2dKSFZ3UVhKeWIzY2dmU0JtY205dElDY3VMaTlqYjI1emRHRnVkSE1uTzF4dWFXMXdiM0owSUhzZ2MyTnliMnhzVkc5VWIzQWdmU0JtY205dElDY3VMaTkxZEdsc2N5YzdYRzVjYm14bGRDQndjbVYyTzF4dWJHVjBJR04xY25KbGJuUWdQU0F3TzF4dWJHVjBJR2x6VTJodmQybHVaeUE5SUdaaGJITmxPMXh1WEc1amIyNXpkQ0JoZEhSaFkyaFZjRUZ5Y205M1RHbHpkR1Z1WlhKeklEMGdLQ2tnUFQ0Z2UxeHVYSFFrY0dGeVlXeHNZWGd1WVdSa1JYWmxiblJNYVhOMFpXNWxjaWduYzJOeWIyeHNKeXdnS0NrZ1BUNGdlMXh1WEhSY2RHeGxkQ0I1SUQwZ0pIUnBkR3hsTG1kbGRFSnZkVzVrYVc1blEyeHBaVzUwVW1WamRDZ3BMbms3WEc1Y2JseDBYSFJwWmlBb1kzVnljbVZ1ZENBaFBUMGdlU2tnZTF4dVhIUmNkRngwY0hKbGRpQTlJR04xY25KbGJuUTdYRzVjZEZ4MFhIUmpkWEp5Wlc1MElEMGdlVHRjYmx4MFhIUjlPMXh1WEc1Y2RGeDBhV1lnS0hrZ1BEMGdMVFV3SUNZbUlDRnBjMU5vYjNkcGJtY3BJSHRjYmx4MFhIUmNkQ1IxY0VGeWNtOTNMbU5zWVhOelRHbHpkQzVoWkdRb0ozTm9iM2NuS1R0Y2JseDBYSFJjZEdselUyaHZkMmx1WnlBOUlIUnlkV1U3WEc1Y2RGeDBmU0JsYkhObElHbG1JQ2g1SUQ0Z0xUVXdJQ1ltSUdselUyaHZkMmx1WnlrZ2UxeHVYSFJjZEZ4MEpIVndRWEp5YjNjdVkyeGhjM05NYVhOMExuSmxiVzkyWlNnbmMyaHZkeWNwTzF4dVhIUmNkRngwYVhOVGFHOTNhVzVuSUQwZ1ptRnNjMlU3WEc1Y2RGeDBmVnh1WEhSOUtUdGNibHh1WEhRa2RYQkJjbkp2ZHk1aFpHUkZkbVZ1ZEV4cGMzUmxibVZ5S0NkamJHbGpheWNzSUNncElEMCtJSE5qY205c2JGUnZWRzl3S0NrcE8xeHVmVHRjYmx4dVpYaHdiM0owSUdSbFptRjFiSFFnWVhSMFlXTm9WWEJCY25KdmQweHBjM1JsYm1WeWN6c2lMQ0pwYlhCdmNuUWdZWFIwWVdOb1RXOWtZV3hNYVhOMFpXNWxjbk1nWm5KdmJTQW5MaTloZEhSaFkyaE5iMlJoYkV4cGMzUmxibVZ5Y3ljN1hHNXBiWEJ2Y25RZ1lYUjBZV05vVlhCQmNuSnZkMHhwYzNSbGJtVnljeUJtY205dElDY3VMMkYwZEdGamFGVndRWEp5YjNkTWFYTjBaVzVsY25Nbk8xeHVhVzF3YjNKMElHRjBkR0ZqYUVsdFlXZGxUR2x6ZEdWdVpYSnpJR1p5YjIwZ0p5NHZZWFIwWVdOb1NXMWhaMlZNYVhOMFpXNWxjbk1uTzF4dWFXMXdiM0owSUcxaGEyVkJiSEJvWVdKbGRDQm1jbTl0SUNjdUwyMWhhMlZCYkhCb1lXSmxkQ2M3WEc1cGJYQnZjblFnYldGclpWTnNhV1JsY2lCbWNtOXRJQ2N1TDIxaGEyVlRiR2xrWlhJbk8xeHVYRzVsZUhCdmNuUWdleUJjYmx4MFlYUjBZV05vVFc5a1lXeE1hWE4wWlc1bGNuTXNJRnh1WEhSaGRIUmhZMmhWY0VGeWNtOTNUR2x6ZEdWdVpYSnpMRnh1WEhSaGRIUmhZMmhKYldGblpVeHBjM1JsYm1WeWN5eGNibHgwYldGclpVRnNjR2hoWW1WMExDQmNibHgwYldGclpWTnNhV1JsY2lCY2JuMDdJaXdpWTI5dWMzUWdZV3h3YUdGaVpYUWdQU0JiSjJFbkxDQW5ZaWNzSUNkakp5d2dKMlFuTENBblpTY3NJQ2RtSnl3Z0oyY25MQ0FuYUNjc0lDZHBKeXdnSjJvbkxDQW5heWNzSUNkc0p5d2dKMjBuTENBbmJpY3NJQ2R2Snl3Z0ozQW5MQ0FuY2ljc0lDZHpKeXdnSjNRbkxDQW5kU2NzSUNkMkp5d2dKM2NuTENBbmVTY3NJQ2Q2SjEwN1hHNWNibU52Ym5OMElHMWhhMlZCYkhCb1lXSmxkQ0E5SUNoemIzSjBTMlY1S1NBOVBpQjdYRzVjZEdOdmJuTjBJR1pwYm1SR2FYSnpkRVZ1ZEhKNUlEMGdLR05vWVhJcElEMCtJSHRjYmx4MFhIUmpiMjV6ZENCelpXeGxZM1J2Y2lBOUlITnZjblJMWlhrZ1B5QW5MbXB6TFdWdWRISjVMWFJwZEd4bEp5QTZJQ2N1YW5NdFpXNTBjbmt0WVhKMGFYTjBKenRjYmx4MFhIUmpiMjV6ZENCd2NtVjJVMlZzWldOMGIzSWdQU0FoYzI5eWRFdGxlU0EvSUNjdWFuTXRaVzUwY25rdGRHbDBiR1VuSURvZ0p5NXFjeTFsYm5SeWVTMWhjblJwYzNRbk8xeHVYRzVjZEZ4MFkyOXVjM1FnSkdWdWRISnBaWE1nUFNCQmNuSmhlUzVtY205dEtHUnZZM1Z0Wlc1MExuRjFaWEo1VTJWc1pXTjBiM0pCYkd3b2MyVnNaV04wYjNJcEtUdGNibHgwWEhSamIyNXpkQ0FrY0hKbGRrVnVkSEpwWlhNZ1BTQkJjbkpoZVM1bWNtOXRLR1J2WTNWdFpXNTBMbkYxWlhKNVUyVnNaV04wYjNKQmJHd29jSEpsZGxObGJHVmpkRzl5S1NrN1hHNWNibHgwWEhRa2NISmxka1Z1ZEhKcFpYTXVabTl5UldGamFDaGxiblJ5ZVNBOVBpQmxiblJ5ZVM1eVpXMXZkbVZCZEhSeWFXSjFkR1VvSjI1aGJXVW5LU2s3WEc1Y2JseDBYSFJ5WlhSMWNtNGdKR1Z1ZEhKcFpYTXVabWx1WkNobGJuUnllU0E5UGlCN1hHNWNkRngwWEhSc1pYUWdibTlrWlNBOUlHVnVkSEo1TG01bGVIUkZiR1Z0Wlc1MFUybGliR2x1Wnp0Y2JseDBYSFJjZEhKbGRIVnliaUJ1YjJSbExtbHVibVZ5U0ZSTlRGc3dYU0E5UFQwZ1kyaGhjaUI4ZkNCdWIyUmxMbWx1Ym1WeVNGUk5URnN3WFNBOVBUMGdZMmhoY2k1MGIxVndjR1Z5UTJGelpTZ3BPMXh1WEhSY2RIMHBPMXh1WEhSOU8xeHVYRzVjZEdOdmJuTjBJR0YwZEdGamFFRnVZMmh2Y2t4cGMzUmxibVZ5SUQwZ0tDUmhibU5vYjNJc0lHeGxkSFJsY2lrZ1BUNGdlMXh1WEhSY2RDUmhibU5vYjNJdVlXUmtSWFpsYm5STWFYTjBaVzVsY2lnblkyeHBZMnNuTENBb0tTQTlQaUI3WEc1Y2RGeDBYSFJqYjI1emRDQnNaWFIwWlhKT2IyUmxJRDBnWkc5amRXMWxiblF1WjJWMFJXeGxiV1Z1ZEVKNVNXUW9iR1YwZEdWeUtUdGNibHgwWEhSY2RHeGxkQ0IwWVhKblpYUTdYRzVjYmx4MFhIUmNkR2xtSUNnaGMyOXlkRXRsZVNrZ2UxeHVYSFJjZEZ4MFhIUjBZWEpuWlhRZ1BTQnNaWFIwWlhJZ1BUMDlJQ2RoSnlBL0lHUnZZM1Z0Wlc1MExtZGxkRVZzWlcxbGJuUkNlVWxrS0NkaGJtTm9iM0l0ZEdGeVoyVjBKeWtnT2lCc1pYUjBaWEpPYjJSbExuQmhjbVZ1ZEVWc1pXMWxiblF1Y0dGeVpXNTBSV3hsYldWdWRDNXdZWEpsYm5SRmJHVnRaVzUwTG5CaGNtVnVkRVZzWlcxbGJuUXVjSEpsZG1sdmRYTkZiR1Z0Wlc1MFUybGliR2x1Wnk1eGRXVnllVk5sYkdWamRHOXlLQ2N1YW5NdFlYSjBhV05zWlMxaGJtTm9iM0l0ZEdGeVoyVjBKeWs3WEc1Y2RGeDBYSFI5SUdWc2MyVWdlMXh1WEhSY2RGeDBYSFIwWVhKblpYUWdQU0JzWlhSMFpYSWdQVDA5SUNkaEp5QS9JR1J2WTNWdFpXNTBMbWRsZEVWc1pXMWxiblJDZVVsa0tDZGhibU5vYjNJdGRHRnlaMlYwSnlrZ09pQnNaWFIwWlhKT2IyUmxMbkJoY21WdWRFVnNaVzFsYm5RdWNHRnlaVzUwUld4bGJXVnVkQzV3WVhKbGJuUkZiR1Z0Wlc1MExuQnlaWFpwYjNWelJXeGxiV1Z1ZEZOcFlteHBibWN1Y1hWbGNubFRaV3hsWTNSdmNpZ25MbXB6TFdGeWRHbGpiR1V0WVc1amFHOXlMWFJoY21kbGRDY3BPMXh1WEhSY2RGeDBmVHRjYmx4dVhIUmNkRngwZEdGeVoyVjBMbk5qY205c2JFbHVkRzlXYVdWM0tIdGlaV2hoZG1sdmNqb2dYQ0p6Ylc5dmRHaGNJaXdnWW14dlkyczZJRndpYzNSaGNuUmNJbjBwTzF4dVhIUmNkSDBwTzF4dVhIUjlPMXh1WEc1Y2RHeGxkQ0JoWTNScGRtVkZiblJ5YVdWeklEMGdlMzA3WEc1Y2RHeGxkQ0FrYjNWMFpYSWdQU0JrYjJOMWJXVnVkQzV4ZFdWeWVWTmxiR1ZqZEc5eUtDY3VZV3h3YUdGaVpYUmZYMnhsZEhSbGNuTW5LVHRjYmx4MEpHOTFkR1Z5TG1sdWJtVnlTRlJOVENBOUlDY25PMXh1WEc1Y2RHRnNjR2hoWW1WMExtWnZja1ZoWTJnb2JHVjBkR1Z5SUQwK0lIdGNibHgwWEhSc1pYUWdKR1pwY25OMFJXNTBjbmtnUFNCbWFXNWtSbWx5YzNSRmJuUnllU2hzWlhSMFpYSXBPMXh1WEhSY2RHeGxkQ0FrWVc1amFHOXlJRDBnWkc5amRXMWxiblF1WTNKbFlYUmxSV3hsYldWdWRDZ25ZU2NwTzF4dVhHNWNkRngwYVdZZ0tDRWtabWx5YzNSRmJuUnllU2tnY21WMGRYSnVPMXh1WEc1Y2RGeDBKR1pwY25OMFJXNTBjbmt1YVdRZ1BTQnNaWFIwWlhJN1hHNWNkRngwSkdGdVkyaHZjaTVwYm01bGNraFVUVXdnUFNCc1pYUjBaWEl1ZEc5VmNIQmxja05oYzJVb0tUdGNibHgwWEhRa1lXNWphRzl5TG1Oc1lYTnpUbUZ0WlNBOUlDZGhiSEJvWVdKbGRGOWZiR1YwZEdWeUxXRnVZMmh2Y2ljN1hHNWNibHgwWEhSaGRIUmhZMmhCYm1Ob2IzSk1hWE4wWlc1bGNpZ2tZVzVqYUc5eUxDQnNaWFIwWlhJcE8xeHVYSFJjZENSdmRYUmxjaTVoY0hCbGJtUkRhR2xzWkNna1lXNWphRzl5S1R0Y2JseDBmU2s3WEc1OU8xeHVYRzVsZUhCdmNuUWdaR1ZtWVhWc2RDQnRZV3RsUVd4d2FHRmlaWFE3SWl3aVkyOXVjM1FnYldGclpWTnNhV1JsY2lBOUlDZ2tjMnhwWkdWeUtTQTlQaUI3WEc1Y2RHTnZibk4wSUNSaGNuSnZkMDVsZUhRZ1BTQWtjMnhwWkdWeUxuQmhjbVZ1ZEVWc1pXMWxiblF1Y1hWbGNubFRaV3hsWTNSdmNpZ25MbUZ5Y205M0xXNWxlSFFuS1R0Y2JseDBZMjl1YzNRZ0pHRnljbTkzVUhKbGRpQTlJQ1J6Ykdsa1pYSXVjR0Z5Wlc1MFJXeGxiV1Z1ZEM1eGRXVnllVk5sYkdWamRHOXlLQ2N1WVhKeWIzY3RjSEpsZGljcE8xeHVYRzVjZEd4bGRDQmpkWEp5Wlc1MElEMGdKSE5zYVdSbGNpNW1hWEp6ZEVWc1pXMWxiblJEYUdsc1pEdGNibHgwSkdGeWNtOTNUbVY0ZEM1aFpHUkZkbVZ1ZEV4cGMzUmxibVZ5S0NkamJHbGpheWNzSUNncElEMCtJSHRjYmx4MFhIUmpiMjV6ZENCdVpYaDBJRDBnWTNWeWNtVnVkQzV1WlhoMFJXeGxiV1Z1ZEZOcFlteHBibWM3WEc1Y2RGeDBhV1lnS0c1bGVIUXBJSHRjYmx4MFhIUmNkRzVsZUhRdWMyTnliMnhzU1c1MGIxWnBaWGNvZTJKbGFHRjJhVzl5T2lCY0luTnRiMjkwYUZ3aUxDQmliRzlqYXpvZ1hDSnVaV0Z5WlhOMFhDSXNJR2x1YkdsdVpUb2dYQ0pqWlc1MFpYSmNJbjBwTzF4dVhIUmNkRngwWTNWeWNtVnVkQ0E5SUc1bGVIUTdYRzVjZEZ4MGZWeHVYSFI5S1R0Y2JseHVYSFFrWVhKeWIzZFFjbVYyTG1Ga1pFVjJaVzUwVEdsemRHVnVaWElvSjJOc2FXTnJKeXdnS0NrZ1BUNGdlMXh1WEhSY2RHTnZibk4wSUhCeVpYWWdQU0JqZFhKeVpXNTBMbkJ5WlhacGIzVnpSV3hsYldWdWRGTnBZbXhwYm1jN1hHNWNkRngwYVdZZ0tIQnlaWFlwSUh0Y2JseDBYSFJjZEhCeVpYWXVjMk55YjJ4c1NXNTBiMVpwWlhjb2UySmxhR0YyYVc5eU9pQmNJbk50YjI5MGFGd2lMQ0JpYkc5amF6b2dYQ0p1WldGeVpYTjBYQ0lzSUdsdWJHbHVaVG9nWENKalpXNTBaWEpjSW4wcE8xeHVYSFJjZEZ4MFkzVnljbVZ1ZENBOUlIQnlaWFk3WEc1Y2RGeDBmVnh1WEhSOUtWeHVmVHRjYmx4dVpYaHdiM0owSUdSbFptRjFiSFFnYldGclpWTnNhV1JsY2pzaUxDSmpiMjV6ZENCcGJXRm5aVlJsYlhCc1lYUmxJRDBnS0dsdFlXZGxLU0E5UGlCZ1BHbHRaeUJqYkdGemN6MWNJbUZ5ZEdsamJHVXRhVzFuWENJZ2MzSmpQVndpTGk0dkxpNHZZWE56WlhSekwybHRZV2RsY3k4a2UybHRZV2RsZlZ3aVBqd3ZhVzFuUG1BN1hHNWNibU52Ym5OMElHRnlkR2xqYkdWVVpXMXdiR0YwWlNBOUlDaGxiblJ5ZVN3Z2FTa2dQVDRnZTF4dVhIUmpiMjV6ZENCN0lIUnBkR3hsTENCbWFYSnpkRTVoYldVc0lHeGhjM1JPWVcxbExDQnBiV0ZuWlhNc0lHUmxjMk55YVhCMGFXOXVMQ0JrWlhSaGFXd2dmU0E5SUdWdWRISjVPMXh1WEc1Y2RHTnZibk4wSUdsdFlXZGxTRlJOVENBOUlHbHRZV2RsY3k1c1pXNW5kR2dnUHlCY2JseDBYSFJwYldGblpYTXViV0Z3S0dsdFlXZGxJRDArSUdsdFlXZGxWR1Z0Y0d4aGRHVW9hVzFoWjJVcEtTNXFiMmx1S0NjbktTQTZJQ2NuTzF4dVhHNWNkSEpsZEhWeWJpQWdZRnh1WEhSY2REeGhjblJwWTJ4bElHTnNZWE56UFZ3aVlYSjBhV05zWlY5ZmIzVjBaWEpjSWo1Y2JseDBYSFJjZER4a2FYWWdZMnhoYzNNOVhDSmhjblJwWTJ4bFgxOXBibTVsY2x3aVBseHVYSFJjZEZ4MFhIUThaR2wySUdOc1lYTnpQVndpWVhKMGFXTnNaVjlmYUdWaFpHbHVaMXdpUGx4dVhIUmNkRngwWEhSY2REeGhJR05zWVhOelBWd2lhbk10Wlc1MGNua3RkR2wwYkdWY0lqNDhMMkUrWEc1Y2RGeDBYSFJjZEZ4MFBHZ3lJR05zWVhOelBWd2lZWEowYVdOc1pTMW9aV0ZrYVc1blgxOTBhWFJzWlZ3aVBpUjdkR2wwYkdWOVBDOW9NajVjYmx4MFhIUmNkRngwWEhROFpHbDJJR05zWVhOelBWd2lZWEowYVdOc1pTMW9aV0ZrYVc1blgxOXVZVzFsWENJK1hHNWNkRngwWEhSY2RGeDBYSFE4YzNCaGJpQmpiR0Z6Y3oxY0ltRnlkR2xqYkdVdGFHVmhaR2x1WjE5ZmJtRnRaUzB0Wm1seWMzUmNJajRrZTJacGNuTjBUbUZ0WlgwOEwzTndZVzQrWEc1Y2RGeDBYSFJjZEZ4MFhIUThZU0JqYkdGemN6MWNJbXB6TFdWdWRISjVMV0Z5ZEdsemRGd2lQand2WVQ1Y2JseDBYSFJjZEZ4MFhIUmNkRHh6Y0dGdUlHTnNZWE56UFZ3aVlYSjBhV05zWlMxb1pXRmthVzVuWDE5dVlXMWxMUzFzWVhOMFhDSStKSHRzWVhOMFRtRnRaWDA4TDNOd1lXNCtYRzVjZEZ4MFhIUmNkRngwUEM5a2FYWStYRzVjZEZ4MFhIUmNkRHd2WkdsMlBseDBYRzVjZEZ4MFhIUmNkRHhrYVhZZ1kyeGhjM005WENKaGNuUnBZMnhsWDE5emJHbGtaWEl0YjNWMFpYSmNJajVjYmx4MFhIUmNkRngwWEhROFpHbDJJR05zWVhOelBWd2lZWEowYVdOc1pWOWZjMnhwWkdWeUxXbHVibVZ5WENJZ2FXUTlYQ0p6Ykdsa1pYSXRKSHRwZlZ3aVBseHVYSFJjZEZ4MFhIUmNkRngwSkh0cGJXRm5aVWhVVFV4OVhHNWNkRngwWEhSY2RGeDBYSFE4WkdsMklHTnNZWE56UFZ3aVlYSjBhV05zWlMxa1pYTmpjbWx3ZEdsdmJsOWZiM1YwWlhKY0lqNWNibHgwWEhSY2RGeDBYSFJjZEZ4MFBHUnBkaUJqYkdGemN6MWNJbUZ5ZEdsamJHVXRaR1Z6WTNKcGNIUnBiMjVjSWo0a2UyUmxjMk55YVhCMGFXOXVmVHd2WkdsMlBseHVYSFJjZEZ4MFhIUmNkRngwWEhROFpHbDJJR05zWVhOelBWd2lZWEowYVdOc1pTMWtaWFJoYVd4Y0lqNGtlMlJsZEdGcGJIMDhMMlJwZGo1Y2JseDBYSFJjZEZ4MFhIUmNkRHd2WkdsMlBseHVYSFJjZEZ4MFhIUmNkRHd2WkdsMlBseHVYSFJjZEZ4MFhIUmNkRHhrYVhZZ1kyeGhjM005WENKaGNuUnBZMnhsWDE5elkzSnZiR3d0WTI5dWRISnZiSE5jSWo1Y2JseDBYSFJjZEZ4MFhIUmNkRHh6Y0dGdUlHTnNZWE56UFZ3aVkyOXVkSEp2YkhNZ1lYSnliM2N0Y0hKbGRsd2lQdUtHa0R3dmMzQmhiajRnWEc1Y2RGeDBYSFJjZEZ4MFhIUThjM0JoYmlCamJHRnpjejFjSW1OdmJuUnliMnh6SUdGeWNtOTNMVzVsZUhSY0lqN2locEk4TDNOd1lXNCtYRzVjZEZ4MFhIUmNkRngwUEM5a2FYWStYRzVjZEZ4MFhIUmNkRngwUEhBZ1kyeGhjM005WENKcWN5MWhjblJwWTJ4bExXRnVZMmh2Y2kxMFlYSm5aWFJjSWo0OEwzQStYRzVjZEZ4MFhIUThMMlJwZGo1Y2JseDBYSFE4TDJGeWRHbGpiR1UrWEc1Y2RHQmNibjA3WEc1Y2JtVjRjRzl5ZENCa1pXWmhkV3gwSUdGeWRHbGpiR1ZVWlcxd2JHRjBaVHNpTENKcGJYQnZjblFnWVhKMGFXTnNaVlJsYlhCc1lYUmxJR1p5YjIwZ0p5NHZZWEowYVdOc1pTYzdYRzVwYlhCdmNuUWdjbVZ1WkdWeVRtRjJUR2NnWm5KdmJTQW5MaTl1WVhaTVp5YzdYRzVjYm1WNGNHOXlkQ0I3SUdGeWRHbGpiR1ZVWlcxd2JHRjBaU3dnY21WdVpHVnlUbUYyVEdjZ2ZUc2lMQ0pqYjI1emRDQjBaVzF3YkdGMFpTQTlJRnh1WEhSZ1BHUnBkaUJqYkdGemN6MWNJbTVoZGw5ZmFXNXVaWEpjSWo1Y2JseDBYSFE4WkdsMklHTnNZWE56UFZ3aWJtRjJYMTl6YjNKMExXSjVYQ0krWEc1Y2RGeDBYSFE4YzNCaGJpQmpiR0Z6Y3oxY0luTnZjblF0WW5sZlgzUnBkR3hsWENJK1UyOXlkQ0JpZVR3dmMzQmhiajVjYmx4MFhIUmNkRHhpZFhSMGIyNGdZMnhoYzNNOVhDSnpiM0owTFdKNUlITnZjblF0WW5sZlgySjVMV0Z5ZEdsemRDQmhZM1JwZG1WY0lpQnBaRDFjSW1wekxXSjVMV0Z5ZEdsemRGd2lQa0Z5ZEdsemREd3ZZblYwZEc5dVBseHVYSFJjZEZ4MFBITndZVzRnWTJ4aGMzTTlYQ0p6YjNKMExXSjVYMTlrYVhacFpHVnlYQ0krSUh3Z1BDOXpjR0Z1UGx4dVhIUmNkRngwUEdKMWRIUnZiaUJqYkdGemN6MWNJbk52Y25RdFlua2djMjl5ZEMxaWVWOWZZbmt0ZEdsMGJHVmNJaUJwWkQxY0ltcHpMV0o1TFhScGRHeGxYQ0krVkdsMGJHVThMMkoxZEhSdmJqNWNibHgwWEhSY2REeHpjR0Z1SUdOc1lYTnpQVndpWm1sdVpGd2lJR2xrUFZ3aWFuTXRabWx1WkZ3aVBseHVYSFJjZEZ4MFhIUW9QSE53WVc0Z1kyeGhjM005WENKbWFXNWtMUzFwYm01bGNsd2lQaVlqT0RrNE5EdEdQQzl6Y0dGdVBpbGNibHgwWEhSY2REd3ZjM0JoYmo1Y2JseDBYSFE4TDJScGRqNWNibHgwWEhROFpHbDJJR05zWVhOelBWd2libUYyWDE5aGJIQm9ZV0psZEZ3aVBseHVYSFJjZEZ4MFBITndZVzRnWTJ4aGMzTTlYQ0poYkhCb1lXSmxkRjlmZEdsMGJHVmNJajVIYnlCMGJ6d3ZjM0JoYmo1Y2JseDBYSFJjZER4a2FYWWdZMnhoYzNNOVhDSmhiSEJvWVdKbGRGOWZiR1YwZEdWeWMxd2lQand2WkdsMlBseHVYSFJjZER3dlpHbDJQbHh1WEhROEwyUnBkajVnTzF4dVhHNWpiMjV6ZENCeVpXNWtaWEpPWVhaTVp5QTlJQ2dwSUQwK0lIdGNibHgwYkdWMElHNWhkazkxZEdWeUlEMGdaRzlqZFcxbGJuUXVaMlYwUld4bGJXVnVkRUo1U1dRb0oycHpMVzVoZGljcE8xeHVYSFJ1WVhaUGRYUmxjaTVwYm01bGNraFVUVXdnUFNCMFpXMXdiR0YwWlR0Y2JuMDdYRzVjYm1WNGNHOXlkQ0JrWldaaGRXeDBJSEpsYm1SbGNrNWhka3huT3lJc0ltbHRjRzl5ZENCN0lDUnNiMkZrYVc1bkxDQWtibUYyTENBa2NHRnlZV3hzWVhnc0lDUmpiMjUwWlc1MExDQWtkR2wwYkdVc0lDUmhjbkp2ZHl3Z0pHMXZaR0ZzTENBa2JHbG5hSFJpYjNnc0lDUjJhV1YzSUgwZ1puSnZiU0FuTGk0dlkyOXVjM1JoYm5Sekp6dGNibHh1WTI5dWMzUWdaR1ZpYjNWdVkyVWdQU0FvWm00c0lIUnBiV1VwSUQwK0lIdGNiaUFnYkdWMElIUnBiV1Z2ZFhRN1hHNWNiaUFnY21WMGRYSnVJR1oxYm1OMGFXOXVLQ2tnZTF4dUlDQWdJR052Ym5OMElHWjFibU4wYVc5dVEyRnNiQ0E5SUNncElEMCtJR1p1TG1Gd2NHeDVLSFJvYVhNc0lHRnlaM1Z0Wlc1MGN5azdYRzRnSUNBZ1hHNGdJQ0FnWTJ4bFlYSlVhVzFsYjNWMEtIUnBiV1Z2ZFhRcE8xeHVJQ0FnSUhScGJXVnZkWFFnUFNCelpYUlVhVzFsYjNWMEtHWjFibU4wYVc5dVEyRnNiQ3dnZEdsdFpTazdYRzRnSUgxY2JuMDdYRzVjYm1OdmJuTjBJR2hwWkdWTWIyRmthVzVuSUQwZ0tDa2dQVDRnZTF4dVhIUWtiRzloWkdsdVp5NW1iM0pGWVdOb0tHVnNaVzBnUFQ0Z1pXeGxiUzVqYkdGemMweHBjM1F1WVdSa0tDZHlaV0ZrZVNjcEtUdGNibHgwSkc1aGRpNWpiR0Z6YzB4cGMzUXVZV1JrS0NkeVpXRmtlU2NwTzF4dWZUdGNibHh1WTI5dWMzUWdjMk55YjJ4c1ZHOVViM0FnUFNBb0tTQTlQaUI3WEc1Y2RHeGxkQ0IwYjNBZ1BTQmtiMk4xYldWdWRDNW5aWFJGYkdWdFpXNTBRbmxKWkNnbllXNWphRzl5TFhSaGNtZGxkQ2NwTzF4dVhIUjBiM0F1YzJOeWIyeHNTVzUwYjFacFpYY29lMkpsYUdGMmFXOXlPaUJjSW5OdGIyOTBhRndpTENCaWJHOWphem9nWENKemRHRnlkRndpZlNrN1hHNTlPMXh1WEc1bGVIQnZjblFnZXlCa1pXSnZkVzVqWlN3Z2FHbGtaVXh2WVdScGJtY3NJSE5qY205c2JGUnZWRzl3SUgwN0lsMTkifQ==
