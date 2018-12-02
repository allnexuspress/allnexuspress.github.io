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
	return '\n<div class="article-image__outer">\n\t<img class="article-image" src="../../assets/images/' + image + '"></img>\n</div>\n';
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvc21vb3Roc2Nyb2xsLXBvbHlmaWxsL2Rpc3Qvc21vb3Roc2Nyb2xsLmpzIiwic3JjL2pzL2NvbnN0YW50cy5qcyIsInNyYy9qcy9pbmRleC5qcyIsInNyYy9qcy9tb2R1bGVzL2F0dGFjaEltYWdlTGlzdGVuZXJzLmpzIiwic3JjL2pzL21vZHVsZXMvYXR0YWNoTW9kYWxMaXN0ZW5lcnMuanMiLCJzcmMvanMvbW9kdWxlcy9hdHRhY2hVcEFycm93TGlzdGVuZXJzLmpzIiwic3JjL2pzL21vZHVsZXMvaW5kZXguanMiLCJzcmMvanMvbW9kdWxlcy9tYWtlQWxwaGFiZXQuanMiLCJzcmMvanMvbW9kdWxlcy9tYWtlU2xpZGVyLmpzIiwic3JjL2pzL3RlbXBsYXRlcy9hcnRpY2xlLmpzIiwic3JjL2pzL3RlbXBsYXRlcy9pbmRleC5qcyIsInNyYy9qcy90ZW1wbGF0ZXMvbmF2TGcuanMiLCJzcmMvanMvdXRpbHMvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNB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Y0FBVCxDQUF3QixlQUF4QixDQUFWO0FBQ0EsTUFBSSxjQUFKLENBQW1CLEVBQUMsVUFBVSxRQUFYLEVBQXFCLE9BQU8sT0FBNUIsRUFBbkI7QUFDQSxDQUhEOztRQUtTLFEsR0FBQSxRO1FBQVUsVyxHQUFBLFc7UUFBYSxXLEdBQUEsVyIsImZpbGUiOiJidW5kbGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiLyogc21vb3Roc2Nyb2xsIHYwLjQuMCAtIDIwMTggLSBEdXN0YW4gS2FzdGVuLCBKZXJlbWlhcyBNZW5pY2hlbGxpIC0gTUlUIExpY2Vuc2UgKi9cbihmdW5jdGlvbiAoKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICAvLyBwb2x5ZmlsbFxuICBmdW5jdGlvbiBwb2x5ZmlsbCgpIHtcbiAgICAvLyBhbGlhc2VzXG4gICAgdmFyIHcgPSB3aW5kb3c7XG4gICAgdmFyIGQgPSBkb2N1bWVudDtcblxuICAgIC8vIHJldHVybiBpZiBzY3JvbGwgYmVoYXZpb3IgaXMgc3VwcG9ydGVkIGFuZCBwb2x5ZmlsbCBpcyBub3QgZm9yY2VkXG4gICAgaWYgKFxuICAgICAgJ3Njcm9sbEJlaGF2aW9yJyBpbiBkLmRvY3VtZW50RWxlbWVudC5zdHlsZSAmJlxuICAgICAgdy5fX2ZvcmNlU21vb3RoU2Nyb2xsUG9seWZpbGxfXyAhPT0gdHJ1ZVxuICAgICkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIGdsb2JhbHNcbiAgICB2YXIgRWxlbWVudCA9IHcuSFRNTEVsZW1lbnQgfHwgdy5FbGVtZW50O1xuICAgIHZhciBTQ1JPTExfVElNRSA9IDQ2ODtcblxuICAgIC8vIG9iamVjdCBnYXRoZXJpbmcgb3JpZ2luYWwgc2Nyb2xsIG1ldGhvZHNcbiAgICB2YXIgb3JpZ2luYWwgPSB7XG4gICAgICBzY3JvbGw6IHcuc2Nyb2xsIHx8IHcuc2Nyb2xsVG8sXG4gICAgICBzY3JvbGxCeTogdy5zY3JvbGxCeSxcbiAgICAgIGVsZW1lbnRTY3JvbGw6IEVsZW1lbnQucHJvdG90eXBlLnNjcm9sbCB8fCBzY3JvbGxFbGVtZW50LFxuICAgICAgc2Nyb2xsSW50b1ZpZXc6IEVsZW1lbnQucHJvdG90eXBlLnNjcm9sbEludG9WaWV3XG4gICAgfTtcblxuICAgIC8vIGRlZmluZSB0aW1pbmcgbWV0aG9kXG4gICAgdmFyIG5vdyA9XG4gICAgICB3LnBlcmZvcm1hbmNlICYmIHcucGVyZm9ybWFuY2Uubm93XG4gICAgICAgID8gdy5wZXJmb3JtYW5jZS5ub3cuYmluZCh3LnBlcmZvcm1hbmNlKVxuICAgICAgICA6IERhdGUubm93O1xuXG4gICAgLyoqXG4gICAgICogaW5kaWNhdGVzIGlmIGEgdGhlIGN1cnJlbnQgYnJvd3NlciBpcyBtYWRlIGJ5IE1pY3Jvc29mdFxuICAgICAqIEBtZXRob2QgaXNNaWNyb3NvZnRCcm93c2VyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHVzZXJBZ2VudFxuICAgICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGlzTWljcm9zb2Z0QnJvd3Nlcih1c2VyQWdlbnQpIHtcbiAgICAgIHZhciB1c2VyQWdlbnRQYXR0ZXJucyA9IFsnTVNJRSAnLCAnVHJpZGVudC8nLCAnRWRnZS8nXTtcblxuICAgICAgcmV0dXJuIG5ldyBSZWdFeHAodXNlckFnZW50UGF0dGVybnMuam9pbignfCcpKS50ZXN0KHVzZXJBZ2VudCk7XG4gICAgfVxuXG4gICAgLypcbiAgICAgKiBJRSBoYXMgcm91bmRpbmcgYnVnIHJvdW5kaW5nIGRvd24gY2xpZW50SGVpZ2h0IGFuZCBjbGllbnRXaWR0aCBhbmRcbiAgICAgKiByb3VuZGluZyB1cCBzY3JvbGxIZWlnaHQgYW5kIHNjcm9sbFdpZHRoIGNhdXNpbmcgZmFsc2UgcG9zaXRpdmVzXG4gICAgICogb24gaGFzU2Nyb2xsYWJsZVNwYWNlXG4gICAgICovXG4gICAgdmFyIFJPVU5ESU5HX1RPTEVSQU5DRSA9IGlzTWljcm9zb2Z0QnJvd3Nlcih3Lm5hdmlnYXRvci51c2VyQWdlbnQpID8gMSA6IDA7XG5cbiAgICAvKipcbiAgICAgKiBjaGFuZ2VzIHNjcm9sbCBwb3NpdGlvbiBpbnNpZGUgYW4gZWxlbWVudFxuICAgICAqIEBtZXRob2Qgc2Nyb2xsRWxlbWVudFxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSB4XG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHlcbiAgICAgKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHNjcm9sbEVsZW1lbnQoeCwgeSkge1xuICAgICAgdGhpcy5zY3JvbGxMZWZ0ID0geDtcbiAgICAgIHRoaXMuc2Nyb2xsVG9wID0geTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiByZXR1cm5zIHJlc3VsdCBvZiBhcHBseWluZyBlYXNlIG1hdGggZnVuY3Rpb24gdG8gYSBudW1iZXJcbiAgICAgKiBAbWV0aG9kIGVhc2VcbiAgICAgKiBAcGFyYW0ge051bWJlcn0ga1xuICAgICAqIEByZXR1cm5zIHtOdW1iZXJ9XG4gICAgICovXG4gICAgZnVuY3Rpb24gZWFzZShrKSB7XG4gICAgICByZXR1cm4gMC41ICogKDEgLSBNYXRoLmNvcyhNYXRoLlBJICogaykpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGluZGljYXRlcyBpZiBhIHNtb290aCBiZWhhdmlvciBzaG91bGQgYmUgYXBwbGllZFxuICAgICAqIEBtZXRob2Qgc2hvdWxkQmFpbE91dFxuICAgICAqIEBwYXJhbSB7TnVtYmVyfE9iamVjdH0gZmlyc3RBcmdcbiAgICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzaG91bGRCYWlsT3V0KGZpcnN0QXJnKSB7XG4gICAgICBpZiAoXG4gICAgICAgIGZpcnN0QXJnID09PSBudWxsIHx8XG4gICAgICAgIHR5cGVvZiBmaXJzdEFyZyAhPT0gJ29iamVjdCcgfHxcbiAgICAgICAgZmlyc3RBcmcuYmVoYXZpb3IgPT09IHVuZGVmaW5lZCB8fFxuICAgICAgICBmaXJzdEFyZy5iZWhhdmlvciA9PT0gJ2F1dG8nIHx8XG4gICAgICAgIGZpcnN0QXJnLmJlaGF2aW9yID09PSAnaW5zdGFudCdcbiAgICAgICkge1xuICAgICAgICAvLyBmaXJzdCBhcmd1bWVudCBpcyBub3QgYW4gb2JqZWN0L251bGxcbiAgICAgICAgLy8gb3IgYmVoYXZpb3IgaXMgYXV0bywgaW5zdGFudCBvciB1bmRlZmluZWRcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG5cbiAgICAgIGlmICh0eXBlb2YgZmlyc3RBcmcgPT09ICdvYmplY3QnICYmIGZpcnN0QXJnLmJlaGF2aW9yID09PSAnc21vb3RoJykge1xuICAgICAgICAvLyBmaXJzdCBhcmd1bWVudCBpcyBhbiBvYmplY3QgYW5kIGJlaGF2aW9yIGlzIHNtb290aFxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIC8vIHRocm93IGVycm9yIHdoZW4gYmVoYXZpb3IgaXMgbm90IHN1cHBvcnRlZFxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICAgJ2JlaGF2aW9yIG1lbWJlciBvZiBTY3JvbGxPcHRpb25zICcgK1xuICAgICAgICAgIGZpcnN0QXJnLmJlaGF2aW9yICtcbiAgICAgICAgICAnIGlzIG5vdCBhIHZhbGlkIHZhbHVlIGZvciBlbnVtZXJhdGlvbiBTY3JvbGxCZWhhdmlvci4nXG4gICAgICApO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGluZGljYXRlcyBpZiBhbiBlbGVtZW50IGhhcyBzY3JvbGxhYmxlIHNwYWNlIGluIHRoZSBwcm92aWRlZCBheGlzXG4gICAgICogQG1ldGhvZCBoYXNTY3JvbGxhYmxlU3BhY2VcbiAgICAgKiBAcGFyYW0ge05vZGV9IGVsXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGF4aXNcbiAgICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBoYXNTY3JvbGxhYmxlU3BhY2UoZWwsIGF4aXMpIHtcbiAgICAgIGlmIChheGlzID09PSAnWScpIHtcbiAgICAgICAgcmV0dXJuIGVsLmNsaWVudEhlaWdodCArIFJPVU5ESU5HX1RPTEVSQU5DRSA8IGVsLnNjcm9sbEhlaWdodDtcbiAgICAgIH1cblxuICAgICAgaWYgKGF4aXMgPT09ICdYJykge1xuICAgICAgICByZXR1cm4gZWwuY2xpZW50V2lkdGggKyBST1VORElOR19UT0xFUkFOQ0UgPCBlbC5zY3JvbGxXaWR0aDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBpbmRpY2F0ZXMgaWYgYW4gZWxlbWVudCBoYXMgYSBzY3JvbGxhYmxlIG92ZXJmbG93IHByb3BlcnR5IGluIHRoZSBheGlzXG4gICAgICogQG1ldGhvZCBjYW5PdmVyZmxvd1xuICAgICAqIEBwYXJhbSB7Tm9kZX0gZWxcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gYXhpc1xuICAgICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGNhbk92ZXJmbG93KGVsLCBheGlzKSB7XG4gICAgICB2YXIgb3ZlcmZsb3dWYWx1ZSA9IHcuZ2V0Q29tcHV0ZWRTdHlsZShlbCwgbnVsbClbJ292ZXJmbG93JyArIGF4aXNdO1xuXG4gICAgICByZXR1cm4gb3ZlcmZsb3dWYWx1ZSA9PT0gJ2F1dG8nIHx8IG92ZXJmbG93VmFsdWUgPT09ICdzY3JvbGwnO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGluZGljYXRlcyBpZiBhbiBlbGVtZW50IGNhbiBiZSBzY3JvbGxlZCBpbiBlaXRoZXIgYXhpc1xuICAgICAqIEBtZXRob2QgaXNTY3JvbGxhYmxlXG4gICAgICogQHBhcmFtIHtOb2RlfSBlbFxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBheGlzXG4gICAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAgICovXG4gICAgZnVuY3Rpb24gaXNTY3JvbGxhYmxlKGVsKSB7XG4gICAgICB2YXIgaXNTY3JvbGxhYmxlWSA9IGhhc1Njcm9sbGFibGVTcGFjZShlbCwgJ1knKSAmJiBjYW5PdmVyZmxvdyhlbCwgJ1knKTtcbiAgICAgIHZhciBpc1Njcm9sbGFibGVYID0gaGFzU2Nyb2xsYWJsZVNwYWNlKGVsLCAnWCcpICYmIGNhbk92ZXJmbG93KGVsLCAnWCcpO1xuXG4gICAgICByZXR1cm4gaXNTY3JvbGxhYmxlWSB8fCBpc1Njcm9sbGFibGVYO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGZpbmRzIHNjcm9sbGFibGUgcGFyZW50IG9mIGFuIGVsZW1lbnRcbiAgICAgKiBAbWV0aG9kIGZpbmRTY3JvbGxhYmxlUGFyZW50XG4gICAgICogQHBhcmFtIHtOb2RlfSBlbFxuICAgICAqIEByZXR1cm5zIHtOb2RlfSBlbFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGZpbmRTY3JvbGxhYmxlUGFyZW50KGVsKSB7XG4gICAgICB2YXIgaXNCb2R5O1xuXG4gICAgICBkbyB7XG4gICAgICAgIGVsID0gZWwucGFyZW50Tm9kZTtcblxuICAgICAgICBpc0JvZHkgPSBlbCA9PT0gZC5ib2R5O1xuICAgICAgfSB3aGlsZSAoaXNCb2R5ID09PSBmYWxzZSAmJiBpc1Njcm9sbGFibGUoZWwpID09PSBmYWxzZSk7XG5cbiAgICAgIGlzQm9keSA9IG51bGw7XG5cbiAgICAgIHJldHVybiBlbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBzZWxmIGludm9rZWQgZnVuY3Rpb24gdGhhdCwgZ2l2ZW4gYSBjb250ZXh0LCBzdGVwcyB0aHJvdWdoIHNjcm9sbGluZ1xuICAgICAqIEBtZXRob2Qgc3RlcFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBjb250ZXh0XG4gICAgICogQHJldHVybnMge3VuZGVmaW5lZH1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzdGVwKGNvbnRleHQpIHtcbiAgICAgIHZhciB0aW1lID0gbm93KCk7XG4gICAgICB2YXIgdmFsdWU7XG4gICAgICB2YXIgY3VycmVudFg7XG4gICAgICB2YXIgY3VycmVudFk7XG4gICAgICB2YXIgZWxhcHNlZCA9ICh0aW1lIC0gY29udGV4dC5zdGFydFRpbWUpIC8gU0NST0xMX1RJTUU7XG5cbiAgICAgIC8vIGF2b2lkIGVsYXBzZWQgdGltZXMgaGlnaGVyIHRoYW4gb25lXG4gICAgICBlbGFwc2VkID0gZWxhcHNlZCA+IDEgPyAxIDogZWxhcHNlZDtcblxuICAgICAgLy8gYXBwbHkgZWFzaW5nIHRvIGVsYXBzZWQgdGltZVxuICAgICAgdmFsdWUgPSBlYXNlKGVsYXBzZWQpO1xuXG4gICAgICBjdXJyZW50WCA9IGNvbnRleHQuc3RhcnRYICsgKGNvbnRleHQueCAtIGNvbnRleHQuc3RhcnRYKSAqIHZhbHVlO1xuICAgICAgY3VycmVudFkgPSBjb250ZXh0LnN0YXJ0WSArIChjb250ZXh0LnkgLSBjb250ZXh0LnN0YXJ0WSkgKiB2YWx1ZTtcblxuICAgICAgY29udGV4dC5tZXRob2QuY2FsbChjb250ZXh0LnNjcm9sbGFibGUsIGN1cnJlbnRYLCBjdXJyZW50WSk7XG5cbiAgICAgIC8vIHNjcm9sbCBtb3JlIGlmIHdlIGhhdmUgbm90IHJlYWNoZWQgb3VyIGRlc3RpbmF0aW9uXG4gICAgICBpZiAoY3VycmVudFggIT09IGNvbnRleHQueCB8fCBjdXJyZW50WSAhPT0gY29udGV4dC55KSB7XG4gICAgICAgIHcucmVxdWVzdEFuaW1hdGlvbkZyYW1lKHN0ZXAuYmluZCh3LCBjb250ZXh0KSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogc2Nyb2xscyB3aW5kb3cgb3IgZWxlbWVudCB3aXRoIGEgc21vb3RoIGJlaGF2aW9yXG4gICAgICogQG1ldGhvZCBzbW9vdGhTY3JvbGxcbiAgICAgKiBAcGFyYW0ge09iamVjdHxOb2RlfSBlbFxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSB4XG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHlcbiAgICAgKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHNtb290aFNjcm9sbChlbCwgeCwgeSkge1xuICAgICAgdmFyIHNjcm9sbGFibGU7XG4gICAgICB2YXIgc3RhcnRYO1xuICAgICAgdmFyIHN0YXJ0WTtcbiAgICAgIHZhciBtZXRob2Q7XG4gICAgICB2YXIgc3RhcnRUaW1lID0gbm93KCk7XG5cbiAgICAgIC8vIGRlZmluZSBzY3JvbGwgY29udGV4dFxuICAgICAgaWYgKGVsID09PSBkLmJvZHkpIHtcbiAgICAgICAgc2Nyb2xsYWJsZSA9IHc7XG4gICAgICAgIHN0YXJ0WCA9IHcuc2Nyb2xsWCB8fCB3LnBhZ2VYT2Zmc2V0O1xuICAgICAgICBzdGFydFkgPSB3LnNjcm9sbFkgfHwgdy5wYWdlWU9mZnNldDtcbiAgICAgICAgbWV0aG9kID0gb3JpZ2luYWwuc2Nyb2xsO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2Nyb2xsYWJsZSA9IGVsO1xuICAgICAgICBzdGFydFggPSBlbC5zY3JvbGxMZWZ0O1xuICAgICAgICBzdGFydFkgPSBlbC5zY3JvbGxUb3A7XG4gICAgICAgIG1ldGhvZCA9IHNjcm9sbEVsZW1lbnQ7XG4gICAgICB9XG5cbiAgICAgIC8vIHNjcm9sbCBsb29waW5nIG92ZXIgYSBmcmFtZVxuICAgICAgc3RlcCh7XG4gICAgICAgIHNjcm9sbGFibGU6IHNjcm9sbGFibGUsXG4gICAgICAgIG1ldGhvZDogbWV0aG9kLFxuICAgICAgICBzdGFydFRpbWU6IHN0YXJ0VGltZSxcbiAgICAgICAgc3RhcnRYOiBzdGFydFgsXG4gICAgICAgIHN0YXJ0WTogc3RhcnRZLFxuICAgICAgICB4OiB4LFxuICAgICAgICB5OiB5XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBPUklHSU5BTCBNRVRIT0RTIE9WRVJSSURFU1xuICAgIC8vIHcuc2Nyb2xsIGFuZCB3LnNjcm9sbFRvXG4gICAgdy5zY3JvbGwgPSB3LnNjcm9sbFRvID0gZnVuY3Rpb24oKSB7XG4gICAgICAvLyBhdm9pZCBhY3Rpb24gd2hlbiBubyBhcmd1bWVudHMgYXJlIHBhc3NlZFxuICAgICAgaWYgKGFyZ3VtZW50c1swXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gYXZvaWQgc21vb3RoIGJlaGF2aW9yIGlmIG5vdCByZXF1aXJlZFxuICAgICAgaWYgKHNob3VsZEJhaWxPdXQoYXJndW1lbnRzWzBdKSA9PT0gdHJ1ZSkge1xuICAgICAgICBvcmlnaW5hbC5zY3JvbGwuY2FsbChcbiAgICAgICAgICB3LFxuICAgICAgICAgIGFyZ3VtZW50c1swXS5sZWZ0ICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8gYXJndW1lbnRzWzBdLmxlZnRcbiAgICAgICAgICAgIDogdHlwZW9mIGFyZ3VtZW50c1swXSAhPT0gJ29iamVjdCdcbiAgICAgICAgICAgICAgPyBhcmd1bWVudHNbMF1cbiAgICAgICAgICAgICAgOiB3LnNjcm9sbFggfHwgdy5wYWdlWE9mZnNldCxcbiAgICAgICAgICAvLyB1c2UgdG9wIHByb3AsIHNlY29uZCBhcmd1bWVudCBpZiBwcmVzZW50IG9yIGZhbGxiYWNrIHRvIHNjcm9sbFlcbiAgICAgICAgICBhcmd1bWVudHNbMF0udG9wICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8gYXJndW1lbnRzWzBdLnRvcFxuICAgICAgICAgICAgOiBhcmd1bWVudHNbMV0gIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgICA/IGFyZ3VtZW50c1sxXVxuICAgICAgICAgICAgICA6IHcuc2Nyb2xsWSB8fCB3LnBhZ2VZT2Zmc2V0XG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBMRVQgVEhFIFNNT09USE5FU1MgQkVHSU4hXG4gICAgICBzbW9vdGhTY3JvbGwuY2FsbChcbiAgICAgICAgdyxcbiAgICAgICAgZC5ib2R5LFxuICAgICAgICBhcmd1bWVudHNbMF0ubGVmdCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgPyB+fmFyZ3VtZW50c1swXS5sZWZ0XG4gICAgICAgICAgOiB3LnNjcm9sbFggfHwgdy5wYWdlWE9mZnNldCxcbiAgICAgICAgYXJndW1lbnRzWzBdLnRvcCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgPyB+fmFyZ3VtZW50c1swXS50b3BcbiAgICAgICAgICA6IHcuc2Nyb2xsWSB8fCB3LnBhZ2VZT2Zmc2V0XG4gICAgICApO1xuICAgIH07XG5cbiAgICAvLyB3LnNjcm9sbEJ5XG4gICAgdy5zY3JvbGxCeSA9IGZ1bmN0aW9uKCkge1xuICAgICAgLy8gYXZvaWQgYWN0aW9uIHdoZW4gbm8gYXJndW1lbnRzIGFyZSBwYXNzZWRcbiAgICAgIGlmIChhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIGF2b2lkIHNtb290aCBiZWhhdmlvciBpZiBub3QgcmVxdWlyZWRcbiAgICAgIGlmIChzaG91bGRCYWlsT3V0KGFyZ3VtZW50c1swXSkpIHtcbiAgICAgICAgb3JpZ2luYWwuc2Nyb2xsQnkuY2FsbChcbiAgICAgICAgICB3LFxuICAgICAgICAgIGFyZ3VtZW50c1swXS5sZWZ0ICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8gYXJndW1lbnRzWzBdLmxlZnRcbiAgICAgICAgICAgIDogdHlwZW9mIGFyZ3VtZW50c1swXSAhPT0gJ29iamVjdCcgPyBhcmd1bWVudHNbMF0gOiAwLFxuICAgICAgICAgIGFyZ3VtZW50c1swXS50b3AgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyBhcmd1bWVudHNbMF0udG9wXG4gICAgICAgICAgICA6IGFyZ3VtZW50c1sxXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzFdIDogMFxuICAgICAgICApO1xuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gTEVUIFRIRSBTTU9PVEhORVNTIEJFR0lOIVxuICAgICAgc21vb3RoU2Nyb2xsLmNhbGwoXG4gICAgICAgIHcsXG4gICAgICAgIGQuYm9keSxcbiAgICAgICAgfn5hcmd1bWVudHNbMF0ubGVmdCArICh3LnNjcm9sbFggfHwgdy5wYWdlWE9mZnNldCksXG4gICAgICAgIH5+YXJndW1lbnRzWzBdLnRvcCArICh3LnNjcm9sbFkgfHwgdy5wYWdlWU9mZnNldClcbiAgICAgICk7XG4gICAgfTtcblxuICAgIC8vIEVsZW1lbnQucHJvdG90eXBlLnNjcm9sbCBhbmQgRWxlbWVudC5wcm90b3R5cGUuc2Nyb2xsVG9cbiAgICBFbGVtZW50LnByb3RvdHlwZS5zY3JvbGwgPSBFbGVtZW50LnByb3RvdHlwZS5zY3JvbGxUbyA9IGZ1bmN0aW9uKCkge1xuICAgICAgLy8gYXZvaWQgYWN0aW9uIHdoZW4gbm8gYXJndW1lbnRzIGFyZSBwYXNzZWRcbiAgICAgIGlmIChhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIGF2b2lkIHNtb290aCBiZWhhdmlvciBpZiBub3QgcmVxdWlyZWRcbiAgICAgIGlmIChzaG91bGRCYWlsT3V0KGFyZ3VtZW50c1swXSkgPT09IHRydWUpIHtcbiAgICAgICAgLy8gaWYgb25lIG51bWJlciBpcyBwYXNzZWQsIHRocm93IGVycm9yIHRvIG1hdGNoIEZpcmVmb3ggaW1wbGVtZW50YXRpb25cbiAgICAgICAgaWYgKHR5cGVvZiBhcmd1bWVudHNbMF0gPT09ICdudW1iZXInICYmIGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFN5bnRheEVycm9yKCdWYWx1ZSBjb3VsZCBub3QgYmUgY29udmVydGVkJyk7XG4gICAgICAgIH1cblxuICAgICAgICBvcmlnaW5hbC5lbGVtZW50U2Nyb2xsLmNhbGwoXG4gICAgICAgICAgdGhpcyxcbiAgICAgICAgICAvLyB1c2UgbGVmdCBwcm9wLCBmaXJzdCBudW1iZXIgYXJndW1lbnQgb3IgZmFsbGJhY2sgdG8gc2Nyb2xsTGVmdFxuICAgICAgICAgIGFyZ3VtZW50c1swXS5sZWZ0ICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8gfn5hcmd1bWVudHNbMF0ubGVmdFxuICAgICAgICAgICAgOiB0eXBlb2YgYXJndW1lbnRzWzBdICE9PSAnb2JqZWN0JyA/IH5+YXJndW1lbnRzWzBdIDogdGhpcy5zY3JvbGxMZWZ0LFxuICAgICAgICAgIC8vIHVzZSB0b3AgcHJvcCwgc2Vjb25kIGFyZ3VtZW50IG9yIGZhbGxiYWNrIHRvIHNjcm9sbFRvcFxuICAgICAgICAgIGFyZ3VtZW50c1swXS50b3AgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyB+fmFyZ3VtZW50c1swXS50b3BcbiAgICAgICAgICAgIDogYXJndW1lbnRzWzFdICE9PSB1bmRlZmluZWQgPyB+fmFyZ3VtZW50c1sxXSA6IHRoaXMuc2Nyb2xsVG9wXG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB2YXIgbGVmdCA9IGFyZ3VtZW50c1swXS5sZWZ0O1xuICAgICAgdmFyIHRvcCA9IGFyZ3VtZW50c1swXS50b3A7XG5cbiAgICAgIC8vIExFVCBUSEUgU01PT1RITkVTUyBCRUdJTiFcbiAgICAgIHNtb290aFNjcm9sbC5jYWxsKFxuICAgICAgICB0aGlzLFxuICAgICAgICB0aGlzLFxuICAgICAgICB0eXBlb2YgbGVmdCA9PT0gJ3VuZGVmaW5lZCcgPyB0aGlzLnNjcm9sbExlZnQgOiB+fmxlZnQsXG4gICAgICAgIHR5cGVvZiB0b3AgPT09ICd1bmRlZmluZWQnID8gdGhpcy5zY3JvbGxUb3AgOiB+fnRvcFxuICAgICAgKTtcbiAgICB9O1xuXG4gICAgLy8gRWxlbWVudC5wcm90b3R5cGUuc2Nyb2xsQnlcbiAgICBFbGVtZW50LnByb3RvdHlwZS5zY3JvbGxCeSA9IGZ1bmN0aW9uKCkge1xuICAgICAgLy8gYXZvaWQgYWN0aW9uIHdoZW4gbm8gYXJndW1lbnRzIGFyZSBwYXNzZWRcbiAgICAgIGlmIChhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIGF2b2lkIHNtb290aCBiZWhhdmlvciBpZiBub3QgcmVxdWlyZWRcbiAgICAgIGlmIChzaG91bGRCYWlsT3V0KGFyZ3VtZW50c1swXSkgPT09IHRydWUpIHtcbiAgICAgICAgb3JpZ2luYWwuZWxlbWVudFNjcm9sbC5jYWxsKFxuICAgICAgICAgIHRoaXMsXG4gICAgICAgICAgYXJndW1lbnRzWzBdLmxlZnQgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyB+fmFyZ3VtZW50c1swXS5sZWZ0ICsgdGhpcy5zY3JvbGxMZWZ0XG4gICAgICAgICAgICA6IH5+YXJndW1lbnRzWzBdICsgdGhpcy5zY3JvbGxMZWZ0LFxuICAgICAgICAgIGFyZ3VtZW50c1swXS50b3AgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyB+fmFyZ3VtZW50c1swXS50b3AgKyB0aGlzLnNjcm9sbFRvcFxuICAgICAgICAgICAgOiB+fmFyZ3VtZW50c1sxXSArIHRoaXMuc2Nyb2xsVG9wXG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB0aGlzLnNjcm9sbCh7XG4gICAgICAgIGxlZnQ6IH5+YXJndW1lbnRzWzBdLmxlZnQgKyB0aGlzLnNjcm9sbExlZnQsXG4gICAgICAgIHRvcDogfn5hcmd1bWVudHNbMF0udG9wICsgdGhpcy5zY3JvbGxUb3AsXG4gICAgICAgIGJlaGF2aW9yOiBhcmd1bWVudHNbMF0uYmVoYXZpb3JcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICAvLyBFbGVtZW50LnByb3RvdHlwZS5zY3JvbGxJbnRvVmlld1xuICAgIEVsZW1lbnQucHJvdG90eXBlLnNjcm9sbEludG9WaWV3ID0gZnVuY3Rpb24oKSB7XG4gICAgICAvLyBhdm9pZCBzbW9vdGggYmVoYXZpb3IgaWYgbm90IHJlcXVpcmVkXG4gICAgICBpZiAoc2hvdWxkQmFpbE91dChhcmd1bWVudHNbMF0pID09PSB0cnVlKSB7XG4gICAgICAgIG9yaWdpbmFsLnNjcm9sbEludG9WaWV3LmNhbGwoXG4gICAgICAgICAgdGhpcyxcbiAgICAgICAgICBhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCA/IHRydWUgOiBhcmd1bWVudHNbMF1cbiAgICAgICAgKTtcblxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIExFVCBUSEUgU01PT1RITkVTUyBCRUdJTiFcbiAgICAgIHZhciBzY3JvbGxhYmxlUGFyZW50ID0gZmluZFNjcm9sbGFibGVQYXJlbnQodGhpcyk7XG4gICAgICB2YXIgcGFyZW50UmVjdHMgPSBzY3JvbGxhYmxlUGFyZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgdmFyIGNsaWVudFJlY3RzID0gdGhpcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcblxuICAgICAgaWYgKHNjcm9sbGFibGVQYXJlbnQgIT09IGQuYm9keSkge1xuICAgICAgICAvLyByZXZlYWwgZWxlbWVudCBpbnNpZGUgcGFyZW50XG4gICAgICAgIHNtb290aFNjcm9sbC5jYWxsKFxuICAgICAgICAgIHRoaXMsXG4gICAgICAgICAgc2Nyb2xsYWJsZVBhcmVudCxcbiAgICAgICAgICBzY3JvbGxhYmxlUGFyZW50LnNjcm9sbExlZnQgKyBjbGllbnRSZWN0cy5sZWZ0IC0gcGFyZW50UmVjdHMubGVmdCxcbiAgICAgICAgICBzY3JvbGxhYmxlUGFyZW50LnNjcm9sbFRvcCArIGNsaWVudFJlY3RzLnRvcCAtIHBhcmVudFJlY3RzLnRvcFxuICAgICAgICApO1xuXG4gICAgICAgIC8vIHJldmVhbCBwYXJlbnQgaW4gdmlld3BvcnQgdW5sZXNzIGlzIGZpeGVkXG4gICAgICAgIGlmICh3LmdldENvbXB1dGVkU3R5bGUoc2Nyb2xsYWJsZVBhcmVudCkucG9zaXRpb24gIT09ICdmaXhlZCcpIHtcbiAgICAgICAgICB3LnNjcm9sbEJ5KHtcbiAgICAgICAgICAgIGxlZnQ6IHBhcmVudFJlY3RzLmxlZnQsXG4gICAgICAgICAgICB0b3A6IHBhcmVudFJlY3RzLnRvcCxcbiAgICAgICAgICAgIGJlaGF2aW9yOiAnc21vb3RoJ1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyByZXZlYWwgZWxlbWVudCBpbiB2aWV3cG9ydFxuICAgICAgICB3LnNjcm9sbEJ5KHtcbiAgICAgICAgICBsZWZ0OiBjbGllbnRSZWN0cy5sZWZ0LFxuICAgICAgICAgIHRvcDogY2xpZW50UmVjdHMudG9wLFxuICAgICAgICAgIGJlaGF2aW9yOiAnc21vb3RoJ1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgaWYgKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykge1xuICAgIC8vIGNvbW1vbmpzXG4gICAgbW9kdWxlLmV4cG9ydHMgPSB7IHBvbHlmaWxsOiBwb2x5ZmlsbCB9O1xuICB9IGVsc2Uge1xuICAgIC8vIGdsb2JhbFxuICAgIHBvbHlmaWxsKCk7XG4gIH1cblxufSgpKTtcbiIsImNvbnN0IERCID0gJ2h0dHBzOi8vbmV4dXMtY2F0YWxvZy5maXJlYmFzZWlvLmNvbS9wb3N0cy5qc29uP2F1dGg9N2c3cHlLS3lrTjNONWV3ckltaE9hUzZ2d3JGc2M1Zktrcms4ZWp6Zic7XG5cbmNvbnN0ICRsb2FkaW5nID0gQXJyYXkuZnJvbShkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcubG9hZGluZycpKTtcbmNvbnN0ICRhcnRpY2xlTGlzdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdqcy1saXN0Jyk7XG5jb25zdCAkbmF2ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2pzLW5hdicpO1xuY29uc3QgJHBhcmFsbGF4ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnBhcmFsbGF4Jyk7XG5jb25zdCAkY29udGVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5jb250ZW50Jyk7XG5jb25zdCAkdGl0bGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnanMtdGl0bGUnKTtcbmNvbnN0ICR1cEFycm93ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2pzLWFycm93Jyk7XG5jb25zdCAkbW9kYWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcubW9kYWwnKTtcbmNvbnN0ICRsaWdodGJveCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5saWdodGJveCcpO1xuY29uc3QgJHZpZXcgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcubGlnaHRib3gtdmlldycpO1xuY29uc3Qgc29ydElkcyA9IFsnYXJ0aXN0JywgJ3RpdGxlJ107XG5cbmV4cG9ydCB7IFxuXHREQixcblx0JGxvYWRpbmcsXG5cdCRhcnRpY2xlTGlzdCwgXG5cdCRuYXYsIFxuXHQkcGFyYWxsYXgsXG5cdCRjb250ZW50LFxuXHQkdGl0bGUsXG5cdCR1cEFycm93LFxuXHQkbW9kYWwsXG5cdCRsaWdodGJveCxcblx0JHZpZXcsXG5cdHNvcnRJZHNcbn07IiwiaW1wb3J0IHNtb290aHNjcm9sbCBmcm9tICdzbW9vdGhzY3JvbGwtcG9seWZpbGwnO1xuXG5pbXBvcnQgeyBhcnRpY2xlVGVtcGxhdGUsIHJlbmRlck5hdkxnIH0gZnJvbSAnLi90ZW1wbGF0ZXMnO1xuaW1wb3J0IHsgZGVib3VuY2UsIGhpZGVMb2FkaW5nLCBzY3JvbGxUb1RvcCB9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHsgREIsICRhcnRpY2xlTGlzdCwgc29ydElkcyB9IGZyb20gJy4vY29uc3RhbnRzJztcbmltcG9ydCB7IGF0dGFjaE1vZGFsTGlzdGVuZXJzLCBhdHRhY2hVcEFycm93TGlzdGVuZXJzLCBhdHRhY2hJbWFnZUxpc3RlbmVycywgbWFrZUFscGhhYmV0LCBtYWtlU2xpZGVyIH0gZnJvbSAnLi9tb2R1bGVzJztcblxubGV0IHNvcnRLZXkgPSAwOyAvLyAwID0gYXJ0aXN0LCAxID0gdGl0bGVcbmxldCBlbnRyaWVzID0geyBieUF1dGhvcjogW10sIGJ5VGl0bGU6IFtdIH07XG5cbmNvbnN0IHNldFVwU29ydEJ1dHRvbnMgPSAoKSA9PiB7XG5cdHNvcnRJZHMuZm9yRWFjaChpZCA9PiB7XG5cdFx0Y29uc3QgYWx0ID0gaWQgPT09ICdhcnRpc3QnID8gJ3RpdGxlJyA6ICdhcnRpc3QnO1xuXG5cdFx0Y29uc3QgJGJ1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGBqcy1ieS0ke2lkfWApO1xuXHRcdGNvbnN0ICRhbHRCdXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChganMtYnktJHthbHR9YCk7XG5cblx0XHQkYnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuXHRcdFx0c2Nyb2xsVG9Ub3AoKTtcblx0XHRcdHNvcnRLZXkgPSAhc29ydEtleTtcblx0XHRcdHJlbmRlckVudHJpZXMoKTtcblxuXHRcdFx0JGJ1dHRvbi5jbGFzc0xpc3QuYWRkKCdhY3RpdmUnKTtcblx0XHRcdCRhbHRCdXR0b24uY2xhc3NMaXN0LnJlbW92ZSgnYWN0aXZlJyk7XG5cdFx0fSlcblx0fSk7XG59O1xuXG5jb25zdCByZW5kZXJFbnRyaWVzID0gKCkgPT4ge1xuXHRjb25zdCBlbnRyaWVzTGlzdCA9IHNvcnRLZXkgPyBlbnRyaWVzLmJ5VGl0bGUgOiBlbnRyaWVzLmJ5QXV0aG9yO1xuXG5cdCRhcnRpY2xlTGlzdC5pbm5lckhUTUwgPSAnJztcblxuXHRlbnRyaWVzTGlzdC5mb3JFYWNoKChlbnRyeSwgaSkgPT4ge1xuXHRcdCRhcnRpY2xlTGlzdC5pbnNlcnRBZGphY2VudEhUTUwoJ2JlZm9yZWVuZCcsIGFydGljbGVUZW1wbGF0ZShlbnRyeSwgaSkpO1xuXHRcdG1ha2VTbGlkZXIoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoYHNsaWRlci0ke2l9YCkpO1xuXHR9KTtcblxuXHRhdHRhY2hJbWFnZUxpc3RlbmVycygpO1xuXHRtYWtlQWxwaGFiZXQoc29ydEtleSk7XG59O1xuXG5jb25zdCBzZXREYXRhQW5kU29ydEJ5VGl0bGUgPSAoZGF0YSkgPT4ge1xuXHRlbnRyaWVzLmJ5QXV0aG9yID0gZGF0YTtcblx0ZW50cmllcy5ieVRpdGxlID0gZGF0YS5zbGljZSgpOyAvLyBjb3BpZXMgZGF0YSBmb3IgYnlUaXRsZSBzb3J0XG5cblx0ZW50cmllcy5ieVRpdGxlLnNvcnQoKGEsIGIpID0+IHtcblx0XHRsZXQgYVRpdGxlID0gYS50aXRsZVswXS50b1VwcGVyQ2FzZSgpO1xuXHRcdGxldCBiVGl0bGUgPSBiLnRpdGxlWzBdLnRvVXBwZXJDYXNlKCk7XG5cdFx0aWYgKGFUaXRsZSA+IGJUaXRsZSkgcmV0dXJuIDE7XG5cdFx0ZWxzZSBpZiAoYVRpdGxlIDwgYlRpdGxlKSByZXR1cm4gLTE7XG5cdFx0ZWxzZSByZXR1cm4gMDtcblx0fSk7XG59O1xuXG5jb25zdCBmZXRjaERhdGEgPSAoKSA9PiB7XG5cdGZldGNoKERCKS50aGVuKHJlcyA9PiByZXMuanNvbigpKVxuXHQudGhlbihkYXRhID0+IHtcblx0XHRzZXREYXRhQW5kU29ydEJ5VGl0bGUoZGF0YSk7XG5cdFx0cmVuZGVyRW50cmllcygpO1xuXHRcdGhpZGVMb2FkaW5nKCk7XG5cdH0pXG5cdC5jYXRjaChlcnIgPT4gY29uc29sZS53YXJuKGVycikpO1xufTtcblxuY29uc3QgaW5pdCA9ICgpID0+IHtcblx0c21vb3Roc2Nyb2xsLnBvbHlmaWxsKCk7XG5cdGZldGNoRGF0YSgpO1xuXHRyZW5kZXJOYXZMZygpO1xuXHRzZXRVcFNvcnRCdXR0b25zKCk7XG5cdGF0dGFjaFVwQXJyb3dMaXN0ZW5lcnMoKTtcblx0YXR0YWNoTW9kYWxMaXN0ZW5lcnMoKTtcbn07XG5cbmluaXQoKTtcbiIsImltcG9ydCB7ICR2aWV3LCAkbGlnaHRib3ggfSBmcm9tICcuLi9jb25zdGFudHMnO1xuXG5sZXQgbGlnaHRib3ggPSBmYWxzZTtcbmxldCB4MiA9IGZhbHNlO1xubGV0IHZpZXdDbGFzcztcblxuY29uc3QgYXR0YWNoSW1hZ2VMaXN0ZW5lcnMgPSAoKSA9PiB7XG5cdGNvbnN0ICRpbWFnZXMgPSBBcnJheS5mcm9tKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5hcnRpY2xlLWltYWdlJykpO1xuXG5cdCRpbWFnZXMuZm9yRWFjaChpbWcgPT4ge1xuXHRcdGltZy5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChldnQpID0+IHtcblx0XHRcdGlmICghbGlnaHRib3gpIHtcblx0XHRcdFx0JGxpZ2h0Ym94LmNsYXNzTGlzdC5hZGQoJ3Nob3ctaW1nJyk7XG5cdFx0XHRcdCR2aWV3LnNyYyA9IGltZy5zcmM7XG5cdFx0XHRcdGxpZ2h0Ym94ID0gdHJ1ZTtcblx0XHRcdH1cblx0XHR9KTtcblx0fSk7XG5cblx0JGxpZ2h0Ym94LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGV2dCkgPT4ge1xuXHRcdGlmIChldnQudGFyZ2V0ID09PSAkdmlldykgcmV0dXJuO1xuXHRcdCRsaWdodGJveC5jbGFzc0xpc3QucmVtb3ZlKCdzaG93LWltZycpO1xuXHRcdGxpZ2h0Ym94ID0gZmFsc2U7XG5cdH0pO1xuXG5cdCR2aWV3LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuXHRcdGlmICgheDIpIHtcblx0XHRcdHZpZXdDbGFzcyA9ICR2aWV3LndpZHRoIDwgd2luZG93LmlubmVyV2lkdGggPyAndmlldy14Mi0tc20nIDogJ3ZpZXcteDInO1xuXHRcdFx0JHZpZXcuY2xhc3NMaXN0LmFkZCh2aWV3Q2xhc3MpO1xuXHRcdFx0c2V0VGltZW91dCgoKSA9PiB4MiA9IHRydWUsIDMwMCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdCR2aWV3LmNsYXNzTGlzdC5yZW1vdmUodmlld0NsYXNzKTtcblx0XHRcdCRsaWdodGJveC5jbGFzc0xpc3QucmVtb3ZlKCdzaG93LWltZycpO1xuXHRcdFx0eDIgPSBmYWxzZTtcblx0XHRcdGxpZ2h0Ym94ID0gZmFsc2U7XG5cdFx0fVxuXHR9KTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGF0dGFjaEltYWdlTGlzdGVuZXJzOyIsImltcG9ydCB7ICRtb2RhbCB9IGZyb20gJy4uL2NvbnN0YW50cyc7XG5cbmxldCBtb2RhbCA9IGZhbHNlO1xuY29uc3QgYXR0YWNoTW9kYWxMaXN0ZW5lcnMgPSAoKSA9PiB7XG5cdGNvbnN0ICRmaW5kID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2pzLWZpbmQnKTtcblx0XG5cdCRmaW5kLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuXHRcdCRtb2RhbC5jbGFzc0xpc3QuYWRkKCdzaG93Jyk7XG5cdFx0bW9kYWwgPSB0cnVlO1xuXHR9KTtcblxuXHQkbW9kYWwuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0JG1vZGFsLmNsYXNzTGlzdC5yZW1vdmUoJ3Nob3cnKTtcblx0XHRtb2RhbCA9IGZhbHNlO1xuXHR9KTtcblxuXHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsICgpID0+IHtcblx0XHRpZiAobW9kYWwpIHtcblx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge1xuXHRcdFx0XHQkbW9kYWwuY2xhc3NMaXN0LnJlbW92ZSgnc2hvdycpO1xuXHRcdFx0XHRtb2RhbCA9IGZhbHNlO1xuXHRcdFx0fSwgNjAwKTtcblx0XHR9O1xuXHR9KTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGF0dGFjaE1vZGFsTGlzdGVuZXJzOyIsImltcG9ydCB7ICR0aXRsZSwgJHBhcmFsbGF4LCAkdXBBcnJvdyB9IGZyb20gJy4uL2NvbnN0YW50cyc7XG5pbXBvcnQgeyBzY3JvbGxUb1RvcCB9IGZyb20gJy4uL3V0aWxzJztcblxubGV0IHByZXY7XG5sZXQgY3VycmVudCA9IDA7XG5sZXQgaXNTaG93aW5nID0gZmFsc2U7XG5cbmNvbnN0IGF0dGFjaFVwQXJyb3dMaXN0ZW5lcnMgPSAoKSA9PiB7XG5cdCRwYXJhbGxheC5hZGRFdmVudExpc3RlbmVyKCdzY3JvbGwnLCAoKSA9PiB7XG5cdFx0bGV0IHkgPSAkdGl0bGUuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkueTtcblxuXHRcdGlmIChjdXJyZW50ICE9PSB5KSB7XG5cdFx0XHRwcmV2ID0gY3VycmVudDtcblx0XHRcdGN1cnJlbnQgPSB5O1xuXHRcdH07XG5cblx0XHRpZiAoeSA8PSAtNTAgJiYgIWlzU2hvd2luZykge1xuXHRcdFx0JHVwQXJyb3cuY2xhc3NMaXN0LmFkZCgnc2hvdycpO1xuXHRcdFx0aXNTaG93aW5nID0gdHJ1ZTtcblx0XHR9IGVsc2UgaWYgKHkgPiAtNTAgJiYgaXNTaG93aW5nKSB7XG5cdFx0XHQkdXBBcnJvdy5jbGFzc0xpc3QucmVtb3ZlKCdzaG93Jyk7XG5cdFx0XHRpc1Nob3dpbmcgPSBmYWxzZTtcblx0XHR9XG5cdH0pO1xuXG5cdCR1cEFycm93LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4gc2Nyb2xsVG9Ub3AoKSk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCBhdHRhY2hVcEFycm93TGlzdGVuZXJzOyIsImltcG9ydCBhdHRhY2hNb2RhbExpc3RlbmVycyBmcm9tICcuL2F0dGFjaE1vZGFsTGlzdGVuZXJzJztcbmltcG9ydCBhdHRhY2hVcEFycm93TGlzdGVuZXJzIGZyb20gJy4vYXR0YWNoVXBBcnJvd0xpc3RlbmVycyc7XG5pbXBvcnQgYXR0YWNoSW1hZ2VMaXN0ZW5lcnMgZnJvbSAnLi9hdHRhY2hJbWFnZUxpc3RlbmVycyc7XG5pbXBvcnQgbWFrZUFscGhhYmV0IGZyb20gJy4vbWFrZUFscGhhYmV0JztcbmltcG9ydCBtYWtlU2xpZGVyIGZyb20gJy4vbWFrZVNsaWRlcic7XG5cbmV4cG9ydCB7IFxuXHRhdHRhY2hNb2RhbExpc3RlbmVycywgXG5cdGF0dGFjaFVwQXJyb3dMaXN0ZW5lcnMsXG5cdGF0dGFjaEltYWdlTGlzdGVuZXJzLFxuXHRtYWtlQWxwaGFiZXQsIFxuXHRtYWtlU2xpZGVyIFxufTsiLCJjb25zdCBhbHBoYWJldCA9IFsnYScsICdiJywgJ2MnLCAnZCcsICdlJywgJ2YnLCAnZycsICdoJywgJ2knLCAnaicsICdrJywgJ2wnLCAnbScsICduJywgJ28nLCAncCcsICdyJywgJ3MnLCAndCcsICd1JywgJ3YnLCAndycsICd5JywgJ3onXTtcblxuY29uc3QgbWFrZUFscGhhYmV0ID0gKHNvcnRLZXkpID0+IHtcblx0Y29uc3QgZmluZEZpcnN0RW50cnkgPSAoY2hhcikgPT4ge1xuXHRcdGNvbnN0IHNlbGVjdG9yID0gc29ydEtleSA/ICcuanMtZW50cnktdGl0bGUnIDogJy5qcy1lbnRyeS1hcnRpc3QnO1xuXHRcdGNvbnN0IHByZXZTZWxlY3RvciA9ICFzb3J0S2V5ID8gJy5qcy1lbnRyeS10aXRsZScgOiAnLmpzLWVudHJ5LWFydGlzdCc7XG5cblx0XHRjb25zdCAkZW50cmllcyA9IEFycmF5LmZyb20oZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChzZWxlY3RvcikpO1xuXHRcdGNvbnN0ICRwcmV2RW50cmllcyA9IEFycmF5LmZyb20oZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChwcmV2U2VsZWN0b3IpKTtcblxuXHRcdCRwcmV2RW50cmllcy5mb3JFYWNoKGVudHJ5ID0+IGVudHJ5LnJlbW92ZUF0dHJpYnV0ZSgnbmFtZScpKTtcblxuXHRcdHJldHVybiAkZW50cmllcy5maW5kKGVudHJ5ID0+IHtcblx0XHRcdGxldCBub2RlID0gZW50cnkubmV4dEVsZW1lbnRTaWJsaW5nO1xuXHRcdFx0cmV0dXJuIG5vZGUuaW5uZXJIVE1MWzBdID09PSBjaGFyIHx8IG5vZGUuaW5uZXJIVE1MWzBdID09PSBjaGFyLnRvVXBwZXJDYXNlKCk7XG5cdFx0fSk7XG5cdH07XG5cblx0Y29uc3QgYXR0YWNoQW5jaG9yTGlzdGVuZXIgPSAoJGFuY2hvciwgbGV0dGVyKSA9PiB7XG5cdFx0JGFuY2hvci5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHRcdGNvbnN0IGxldHRlck5vZGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChsZXR0ZXIpO1xuXHRcdFx0bGV0IHRhcmdldDtcblxuXHRcdFx0aWYgKCFzb3J0S2V5KSB7XG5cdFx0XHRcdHRhcmdldCA9IGxldHRlciA9PT0gJ2EnID8gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2FuY2hvci10YXJnZXQnKSA6IGxldHRlck5vZGUucGFyZW50RWxlbWVudC5wYXJlbnRFbGVtZW50LnBhcmVudEVsZW1lbnQucGFyZW50RWxlbWVudC5wcmV2aW91c0VsZW1lbnRTaWJsaW5nLnF1ZXJ5U2VsZWN0b3IoJy5qcy1hcnRpY2xlLWFuY2hvci10YXJnZXQnKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRhcmdldCA9IGxldHRlciA9PT0gJ2EnID8gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2FuY2hvci10YXJnZXQnKSA6IGxldHRlck5vZGUucGFyZW50RWxlbWVudC5wYXJlbnRFbGVtZW50LnBhcmVudEVsZW1lbnQucHJldmlvdXNFbGVtZW50U2libGluZy5xdWVyeVNlbGVjdG9yKCcuanMtYXJ0aWNsZS1hbmNob3ItdGFyZ2V0Jyk7XG5cdFx0XHR9O1xuXG5cdFx0XHR0YXJnZXQuc2Nyb2xsSW50b1ZpZXcoe2JlaGF2aW9yOiBcInNtb290aFwiLCBibG9jazogXCJzdGFydFwifSk7XG5cdFx0fSk7XG5cdH07XG5cblx0bGV0IGFjdGl2ZUVudHJpZXMgPSB7fTtcblx0bGV0ICRvdXRlciA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5hbHBoYWJldF9fbGV0dGVycycpO1xuXHQkb3V0ZXIuaW5uZXJIVE1MID0gJyc7XG5cblx0YWxwaGFiZXQuZm9yRWFjaChsZXR0ZXIgPT4ge1xuXHRcdGxldCAkZmlyc3RFbnRyeSA9IGZpbmRGaXJzdEVudHJ5KGxldHRlcik7XG5cdFx0bGV0ICRhbmNob3IgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG5cblx0XHRpZiAoISRmaXJzdEVudHJ5KSByZXR1cm47XG5cblx0XHQkZmlyc3RFbnRyeS5pZCA9IGxldHRlcjtcblx0XHQkYW5jaG9yLmlubmVySFRNTCA9IGxldHRlci50b1VwcGVyQ2FzZSgpO1xuXHRcdCRhbmNob3IuY2xhc3NOYW1lID0gJ2FscGhhYmV0X19sZXR0ZXItYW5jaG9yJztcblxuXHRcdGF0dGFjaEFuY2hvckxpc3RlbmVyKCRhbmNob3IsIGxldHRlcik7XG5cdFx0JG91dGVyLmFwcGVuZENoaWxkKCRhbmNob3IpO1xuXHR9KTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IG1ha2VBbHBoYWJldDsiLCJjb25zdCBtYWtlU2xpZGVyID0gKCRzbGlkZXIpID0+IHtcblx0Y29uc3QgJGFycm93TmV4dCA9ICRzbGlkZXIucGFyZW50RWxlbWVudC5xdWVyeVNlbGVjdG9yKCcuYXJyb3ctbmV4dCcpO1xuXHRjb25zdCAkYXJyb3dQcmV2ID0gJHNsaWRlci5wYXJlbnRFbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJy5hcnJvdy1wcmV2Jyk7XG5cblx0bGV0IGN1cnJlbnQgPSAkc2xpZGVyLmZpcnN0RWxlbWVudENoaWxkO1xuXHQkYXJyb3dOZXh0LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuXHRcdGNvbnN0IG5leHQgPSBjdXJyZW50Lm5leHRFbGVtZW50U2libGluZztcblx0XHRpZiAobmV4dCkge1xuXHRcdFx0bmV4dC5zY3JvbGxJbnRvVmlldyh7YmVoYXZpb3I6IFwic21vb3RoXCIsIGJsb2NrOiBcIm5lYXJlc3RcIiwgaW5saW5lOiBcImNlbnRlclwifSk7XG5cdFx0XHRjdXJyZW50ID0gbmV4dDtcblx0XHR9XG5cdH0pO1xuXG5cdCRhcnJvd1ByZXYuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0Y29uc3QgcHJldiA9IGN1cnJlbnQucHJldmlvdXNFbGVtZW50U2libGluZztcblx0XHRpZiAocHJldikge1xuXHRcdFx0cHJldi5zY3JvbGxJbnRvVmlldyh7YmVoYXZpb3I6IFwic21vb3RoXCIsIGJsb2NrOiBcIm5lYXJlc3RcIiwgaW5saW5lOiBcImNlbnRlclwifSk7XG5cdFx0XHRjdXJyZW50ID0gcHJldjtcblx0XHR9XG5cdH0pXG59O1xuXG5leHBvcnQgZGVmYXVsdCBtYWtlU2xpZGVyOyIsImNvbnN0IGltYWdlVGVtcGxhdGUgPSAoaW1hZ2UpID0+IGBcbjxkaXYgY2xhc3M9XCJhcnRpY2xlLWltYWdlX19vdXRlclwiPlxuXHQ8aW1nIGNsYXNzPVwiYXJ0aWNsZS1pbWFnZVwiIHNyYz1cIi4uLy4uL2Fzc2V0cy9pbWFnZXMvJHtpbWFnZX1cIj48L2ltZz5cbjwvZGl2PlxuYDtcblxuY29uc3QgYXJ0aWNsZVRlbXBsYXRlID0gKGVudHJ5LCBpKSA9PiB7XG5cdGNvbnN0IHsgdGl0bGUsIGZpcnN0TmFtZSwgbGFzdE5hbWUsIGltYWdlcywgZGVzY3JpcHRpb24sIGRldGFpbCB9ID0gZW50cnk7XG5cblx0Y29uc3QgaW1hZ2VIVE1MID0gaW1hZ2VzLmxlbmd0aCA/IFxuXHRcdGltYWdlcy5tYXAoaW1hZ2UgPT4gaW1hZ2VUZW1wbGF0ZShpbWFnZSkpLmpvaW4oJycpIDogJyc7XG5cblx0cmV0dXJuICBgXG5cdFx0PGFydGljbGUgY2xhc3M9XCJhcnRpY2xlX19vdXRlclwiPlxuXHRcdFx0PGRpdiBjbGFzcz1cImFydGljbGVfX2lubmVyXCI+XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlX19oZWFkaW5nXCI+XG5cdFx0XHRcdFx0PGEgY2xhc3M9XCJqcy1lbnRyeS10aXRsZVwiPjwvYT5cblx0XHRcdFx0XHQ8aDIgY2xhc3M9XCJhcnRpY2xlLWhlYWRpbmdfX3RpdGxlXCI+JHt0aXRsZX08L2gyPlxuXHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlLWhlYWRpbmdfX25hbWVcIj5cblx0XHRcdFx0XHRcdDxzcGFuIGNsYXNzPVwiYXJ0aWNsZS1oZWFkaW5nX19uYW1lLS1maXJzdFwiPiR7Zmlyc3ROYW1lfTwvc3Bhbj5cblx0XHRcdFx0XHRcdDxhIGNsYXNzPVwianMtZW50cnktYXJ0aXN0XCI+PC9hPlxuXHRcdFx0XHRcdFx0PHNwYW4gY2xhc3M9XCJhcnRpY2xlLWhlYWRpbmdfX25hbWUtLWxhc3RcIj4ke2xhc3ROYW1lfTwvc3Bhbj5cblx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0PC9kaXY+XHRcblx0XHRcdFx0PGRpdiBjbGFzcz1cImFydGljbGVfX3NsaWRlci1vdXRlclwiPlxuXHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlX19zbGlkZXItaW5uZXJcIiBpZD1cInNsaWRlci0ke2l9XCI+XG5cdFx0XHRcdFx0XHQke2ltYWdlSFRNTH1cblx0XHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlLWRlc2NyaXB0aW9uX19vdXRlclwiPlxuXHRcdFx0XHRcdFx0XHQ8ZGl2IGNsYXNzPVwiYXJ0aWNsZS1kZXNjcmlwdGlvblwiPiR7ZGVzY3JpcHRpb259PC9kaXY+XG5cdFx0XHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlLWRldGFpbFwiPiR7ZGV0YWlsfTwvZGl2PlxuXHRcdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdFx0PGRpdiBjbGFzcz1cImFydGljbGVfX3Njcm9sbC1jb250cm9sc1wiPlxuXHRcdFx0XHRcdFx0PHNwYW4gY2xhc3M9XCJjb250cm9scyBhcnJvdy1wcmV2XCI+4oaQPC9zcGFuPiBcblx0XHRcdFx0XHRcdDxzcGFuIGNsYXNzPVwiY29udHJvbHMgYXJyb3ctbmV4dFwiPuKGkjwvc3Bhbj5cblx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0XHQ8cCBjbGFzcz1cImpzLWFydGljbGUtYW5jaG9yLXRhcmdldFwiPjwvcD5cblx0XHRcdDwvZGl2PlxuXHRcdDwvYXJ0aWNsZT5cblx0YFxufTtcblxuZXhwb3J0IGRlZmF1bHQgYXJ0aWNsZVRlbXBsYXRlOyIsImltcG9ydCBhcnRpY2xlVGVtcGxhdGUgZnJvbSAnLi9hcnRpY2xlJztcbmltcG9ydCByZW5kZXJOYXZMZyBmcm9tICcuL25hdkxnJztcblxuZXhwb3J0IHsgYXJ0aWNsZVRlbXBsYXRlLCByZW5kZXJOYXZMZyB9OyIsImNvbnN0IHRlbXBsYXRlID0gXG5cdGA8ZGl2IGNsYXNzPVwibmF2X19pbm5lclwiPlxuXHRcdDxkaXYgY2xhc3M9XCJuYXZfX3NvcnQtYnlcIj5cblx0XHRcdDxzcGFuIGNsYXNzPVwic29ydC1ieV9fdGl0bGVcIj5Tb3J0IGJ5PC9zcGFuPlxuXHRcdFx0PGJ1dHRvbiBjbGFzcz1cInNvcnQtYnkgc29ydC1ieV9fYnktYXJ0aXN0IGFjdGl2ZVwiIGlkPVwianMtYnktYXJ0aXN0XCI+QXJ0aXN0PC9idXR0b24+XG5cdFx0XHQ8c3BhbiBjbGFzcz1cInNvcnQtYnlfX2RpdmlkZXJcIj4gfCA8L3NwYW4+XG5cdFx0XHQ8YnV0dG9uIGNsYXNzPVwic29ydC1ieSBzb3J0LWJ5X19ieS10aXRsZVwiIGlkPVwianMtYnktdGl0bGVcIj5UaXRsZTwvYnV0dG9uPlxuXHRcdFx0PHNwYW4gY2xhc3M9XCJmaW5kXCIgaWQ9XCJqcy1maW5kXCI+XG5cdFx0XHRcdCg8c3BhbiBjbGFzcz1cImZpbmQtLWlubmVyXCI+JiM4OTg0O0Y8L3NwYW4+KVxuXHRcdFx0PC9zcGFuPlxuXHRcdDwvZGl2PlxuXHRcdDxkaXYgY2xhc3M9XCJuYXZfX2FscGhhYmV0XCI+XG5cdFx0XHQ8c3BhbiBjbGFzcz1cImFscGhhYmV0X190aXRsZVwiPkdvIHRvPC9zcGFuPlxuXHRcdFx0PGRpdiBjbGFzcz1cImFscGhhYmV0X19sZXR0ZXJzXCI+PC9kaXY+XG5cdFx0PC9kaXY+XG5cdDwvZGl2PmA7XG5cbmNvbnN0IHJlbmRlck5hdkxnID0gKCkgPT4ge1xuXHRsZXQgbmF2T3V0ZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnanMtbmF2Jyk7XG5cdG5hdk91dGVyLmlubmVySFRNTCA9IHRlbXBsYXRlO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgcmVuZGVyTmF2TGc7IiwiaW1wb3J0IHsgJGxvYWRpbmcsICRuYXYsICRwYXJhbGxheCwgJGNvbnRlbnQsICR0aXRsZSwgJGFycm93LCAkbW9kYWwsICRsaWdodGJveCwgJHZpZXcgfSBmcm9tICcuLi9jb25zdGFudHMnO1xuXG5jb25zdCBkZWJvdW5jZSA9IChmbiwgdGltZSkgPT4ge1xuICBsZXQgdGltZW91dDtcblxuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgY29uc3QgZnVuY3Rpb25DYWxsID0gKCkgPT4gZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICBcbiAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgdGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb25DYWxsLCB0aW1lKTtcbiAgfVxufTtcblxuY29uc3QgaGlkZUxvYWRpbmcgPSAoKSA9PiB7XG5cdCRsb2FkaW5nLmZvckVhY2goZWxlbSA9PiBlbGVtLmNsYXNzTGlzdC5hZGQoJ3JlYWR5JykpO1xuXHQkbmF2LmNsYXNzTGlzdC5hZGQoJ3JlYWR5Jyk7XG59O1xuXG5jb25zdCBzY3JvbGxUb1RvcCA9ICgpID0+IHtcblx0bGV0IHRvcCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhbmNob3ItdGFyZ2V0Jyk7XG5cdHRvcC5zY3JvbGxJbnRvVmlldyh7YmVoYXZpb3I6IFwic21vb3RoXCIsIGJsb2NrOiBcInN0YXJ0XCJ9KTtcbn07XG5cbmV4cG9ydCB7IGRlYm91bmNlLCBoaWRlTG9hZGluZywgc2Nyb2xsVG9Ub3AgfTsiXSwicHJlRXhpc3RpbmdDb21tZW50IjoiLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9dXRmLTg7YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0p6YjNWeVkyVnpJanBiSW01dlpHVmZiVzlrZFd4bGN5OWljbTkzYzJWeUxYQmhZMnN2WDNCeVpXeDFaR1V1YW5NaUxDSnViMlJsWDIxdlpIVnNaWE12YzIxdmIzUm9jMk55YjJ4c0xYQnZiSGxtYVd4c0wyUnBjM1F2YzIxdmIzUm9jMk55YjJ4c0xtcHpJaXdpYzNKakwycHpMMk52Ym5OMFlXNTBjeTVxY3lJc0luTnlZeTlxY3k5cGJtUmxlQzVxY3lJc0luTnlZeTlxY3k5dGIyUjFiR1Z6TDJGMGRHRmphRWx0WVdkbFRHbHpkR1Z1WlhKekxtcHpJaXdpYzNKakwycHpMMjF2WkhWc1pYTXZZWFIwWVdOb1RXOWtZV3hNYVhOMFpXNWxjbk11YW5NaUxDSnpjbU12YW5NdmJXOWtkV3hsY3k5aGRIUmhZMmhWY0VGeWNtOTNUR2x6ZEdWdVpYSnpMbXB6SWl3aWMzSmpMMnB6TDIxdlpIVnNaWE12YVc1a1pYZ3Vhbk1pTENKemNtTXZhbk12Ylc5a2RXeGxjeTl0WVd0bFFXeHdhR0ZpWlhRdWFuTWlMQ0p6Y21NdmFuTXZiVzlrZFd4bGN5OXRZV3RsVTJ4cFpHVnlMbXB6SWl3aWMzSmpMMnB6TDNSbGJYQnNZWFJsY3k5aGNuUnBZMnhsTG1weklpd2ljM0pqTDJwekwzUmxiWEJzWVhSbGN5OXBibVJsZUM1cWN5SXNJbk55WXk5cWN5OTBaVzF3YkdGMFpYTXZibUYyVEdjdWFuTWlMQ0p6Y21NdmFuTXZkWFJwYkhNdmFXNWtaWGd1YW5NaVhTd2libUZ0WlhNaU9sdGRMQ0p0WVhCd2FXNW5jeUk2SWtGQlFVRTdRVU5CUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CT3pzN096czdPMEZEZG1KQkxFbEJRVTBzUzBGQlN5d3JSa0ZCV0RzN1FVRkZRU3hKUVVGTkxGZEJRVmNzVFVGQlRTeEpRVUZPTEVOQlFWY3NVMEZCVXl4blFrRkJWQ3hEUVVFd1FpeFZRVUV4UWl4RFFVRllMRU5CUVdwQ08wRkJRMEVzU1VGQlRTeGxRVUZsTEZOQlFWTXNZMEZCVkN4RFFVRjNRaXhUUVVGNFFpeERRVUZ5UWp0QlFVTkJMRWxCUVUwc1QwRkJUeXhUUVVGVExHTkJRVlFzUTBGQmQwSXNVVUZCZUVJc1EwRkJZanRCUVVOQkxFbEJRVTBzV1VGQldTeFRRVUZUTEdGQlFWUXNRMEZCZFVJc1YwRkJka0lzUTBGQmJFSTdRVUZEUVN4SlFVRk5MRmRCUVZjc1UwRkJVeXhoUVVGVUxFTkJRWFZDTEZWQlFYWkNMRU5CUVdwQ08wRkJRMEVzU1VGQlRTeFRRVUZUTEZOQlFWTXNZMEZCVkN4RFFVRjNRaXhWUVVGNFFpeERRVUZtTzBGQlEwRXNTVUZCVFN4WFFVRlhMRk5CUVZNc1kwRkJWQ3hEUVVGM1FpeFZRVUY0UWl4RFFVRnFRanRCUVVOQkxFbEJRVTBzVTBGQlV5eFRRVUZUTEdGQlFWUXNRMEZCZFVJc1VVRkJka0lzUTBGQlpqdEJRVU5CTEVsQlFVMHNXVUZCV1N4VFFVRlRMR0ZCUVZRc1EwRkJkVUlzVjBGQmRrSXNRMEZCYkVJN1FVRkRRU3hKUVVGTkxGRkJRVkVzVTBGQlV5eGhRVUZVTEVOQlFYVkNMR2RDUVVGMlFpeERRVUZrTzBGQlEwRXNTVUZCVFN4VlFVRlZMRU5CUVVNc1VVRkJSQ3hGUVVGWExFOUJRVmdzUTBGQmFFSTdPMUZCUjBNc1JTeEhRVUZCTEVVN1VVRkRRU3hSTEVkQlFVRXNVVHRSUVVOQkxGa3NSMEZCUVN4Wk8xRkJRMEVzU1N4SFFVRkJMRWs3VVVGRFFTeFRMRWRCUVVFc1V6dFJRVU5CTEZFc1IwRkJRU3hSTzFGQlEwRXNUU3hIUVVGQkxFMDdVVUZEUVN4UkxFZEJRVUVzVVR0UlFVTkJMRTBzUjBGQlFTeE5PMUZCUTBFc1V5eEhRVUZCTEZNN1VVRkRRU3hMTEVkQlFVRXNTenRSUVVOQkxFOHNSMEZCUVN4UE96czdPenRCUXpGQ1JEczdPenRCUVVWQk96dEJRVU5CT3p0QlFVTkJPenRCUVVOQk96czdPMEZCUlVFc1NVRkJTU3hWUVVGVkxFTkJRV1FzUXl4RFFVRnBRanRCUVVOcVFpeEpRVUZKTEZWQlFWVXNSVUZCUlN4VlFVRlZMRVZCUVZvc1JVRkJaMElzVTBGQlV5eEZRVUY2UWl4RlFVRmtPenRCUVVWQkxFbEJRVTBzYlVKQlFXMUNMRk5CUVc1Q0xHZENRVUZ0UWl4SFFVRk5PMEZCUXpsQ0xHOUNRVUZSTEU5QlFWSXNRMEZCWjBJc1kwRkJUVHRCUVVOeVFpeE5RVUZOTEUxQlFVMHNUMEZCVHl4UlFVRlFMRWRCUVd0Q0xFOUJRV3hDTEVkQlFUUkNMRkZCUVhoRE96dEJRVVZCTEUxQlFVMHNWVUZCVlN4VFFVRlRMR05CUVZRc1dVRkJhVU1zUlVGQmFrTXNRMEZCYUVJN1FVRkRRU3hOUVVGTkxHRkJRV0VzVTBGQlV5eGpRVUZVTEZsQlFXbERMRWRCUVdwRExFTkJRVzVDT3p0QlFVVkJMRlZCUVZFc1owSkJRVklzUTBGQmVVSXNUMEZCZWtJc1JVRkJhME1zV1VGQlRUdEJRVU4yUXp0QlFVTkJMR0ZCUVZVc1EwRkJReXhQUVVGWU8wRkJRMEU3TzBGQlJVRXNWMEZCVVN4VFFVRlNMRU5CUVd0Q0xFZEJRV3hDTEVOQlFYTkNMRkZCUVhSQ08wRkJRMEVzWTBGQlZ5eFRRVUZZTEVOQlFYRkNMRTFCUVhKQ0xFTkJRVFJDTEZGQlFUVkNPMEZCUTBFc1IwRlFSRHRCUVZGQkxFVkJaRVE3UVVGbFFTeERRV2hDUkRzN1FVRnJRa0VzU1VGQlRTeG5Ra0ZCWjBJc1UwRkJhRUlzWVVGQlowSXNSMEZCVFR0QlFVTXpRaXhMUVVGTkxHTkJRV01zVlVGQlZTeFJRVUZSTEU5QlFXeENMRWRCUVRSQ0xGRkJRVkVzVVVGQmVFUTdPMEZCUlVFc2VVSkJRV0VzVTBGQllpeEhRVUY1UWl4RlFVRjZRanM3UVVGRlFTeGhRVUZaTEU5QlFWb3NRMEZCYjBJc1ZVRkJReXhMUVVGRUxFVkJRVkVzUTBGQlVpeEZRVUZqTzBGQlEycERMREJDUVVGaExHdENRVUZpTEVOQlFXZERMRmRCUVdoRExFVkJRVFpETEdkRFFVRm5RaXhMUVVGb1FpeEZRVUYxUWl4RFFVRjJRaXhEUVVFM1F6dEJRVU5CTERKQ1FVRlhMRk5CUVZNc1kwRkJWQ3hoUVVGclF5eERRVUZzUXl4RFFVRllPMEZCUTBFc1JVRklSRHM3UVVGTFFUdEJRVU5CTERSQ1FVRmhMRTlCUVdJN1FVRkRRU3hEUVZwRU96dEJRV05CTEVsQlFVMHNkMEpCUVhkQ0xGTkJRWGhDTEhGQ1FVRjNRaXhEUVVGRExFbEJRVVFzUlVGQlZUdEJRVU4yUXl4VFFVRlJMRkZCUVZJc1IwRkJiVUlzU1VGQmJrSTdRVUZEUVN4VFFVRlJMRTlCUVZJc1IwRkJhMElzUzBGQlN5eExRVUZNTEVWQlFXeENMRU5CUm5WRExFTkJSVkE3TzBGQlJXaERMRk5CUVZFc1QwRkJVaXhEUVVGblFpeEpRVUZvUWl4RFFVRnhRaXhWUVVGRExFTkJRVVFzUlVGQlNTeERRVUZLTEVWQlFWVTdRVUZET1VJc1RVRkJTU3hUUVVGVExFVkJRVVVzUzBGQlJpeERRVUZSTEVOQlFWSXNSVUZCVnl4WFFVRllMRVZCUVdJN1FVRkRRU3hOUVVGSkxGTkJRVk1zUlVGQlJTeExRVUZHTEVOQlFWRXNRMEZCVWl4RlFVRlhMRmRCUVZnc1JVRkJZanRCUVVOQkxFMUJRVWtzVTBGQlV5eE5RVUZpTEVWQlFYRkNMRTlCUVU4c1EwRkJVQ3hEUVVGeVFpeExRVU5MTEVsQlFVa3NVMEZCVXl4TlFVRmlMRVZCUVhGQ0xFOUJRVThzUTBGQlF5eERRVUZTTEVOQlFYSkNMRXRCUTBFc1QwRkJUeXhEUVVGUU8wRkJRMHdzUlVGT1JEdEJRVTlCTEVOQldFUTdPMEZCWVVFc1NVRkJUU3haUVVGWkxGTkJRVm9zVTBGQldTeEhRVUZOTzBGQlEzWkNMRTlCUVUwc1lVRkJUaXhGUVVGVkxFbEJRVllzUTBGQlpUdEJRVUZCTEZOQlFVOHNTVUZCU1N4SlFVRktMRVZCUVZBN1FVRkJRU3hGUVVGbUxFVkJRME1zU1VGRVJDeERRVU5OTEdkQ1FVRlJPMEZCUTJJc2QwSkJRWE5DTEVsQlFYUkNPMEZCUTBFN1FVRkRRVHRCUVVOQkxFVkJURVFzUlVGTlF5eExRVTVFTEVOQlRVODdRVUZCUVN4VFFVRlBMRkZCUVZFc1NVRkJVaXhEUVVGaExFZEJRV0lzUTBGQlVEdEJRVUZCTEVWQlRsQTdRVUZQUVN4RFFWSkVPenRCUVZWQkxFbEJRVTBzVDBGQlR5eFRRVUZRTEVsQlFVOHNSMEZCVFR0QlFVTnNRaXhuUTBGQllTeFJRVUZpTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQkxFTkJVRVE3TzBGQlUwRTdPenM3T3pzN096dEJRekZGUVRzN1FVRkZRU3hKUVVGSkxGZEJRVmNzUzBGQlpqdEJRVU5CTEVsQlFVa3NTMEZCU3l4TFFVRlVPMEZCUTBFc1NVRkJTU3hyUWtGQlNqczdRVUZGUVN4SlFVRk5MSFZDUVVGMVFpeFRRVUYyUWl4dlFrRkJkVUlzUjBGQlRUdEJRVU5zUXl4TFFVRk5MRlZCUVZVc1RVRkJUU3hKUVVGT0xFTkJRVmNzVTBGQlV5eG5Ra0ZCVkN4RFFVRXdRaXhuUWtGQk1VSXNRMEZCV0N4RFFVRm9RanM3UVVGRlFTeFRRVUZSTEU5QlFWSXNRMEZCWjBJc1pVRkJUenRCUVVOMFFpeE5RVUZKTEdkQ1FVRktMRU5CUVhGQ0xFOUJRWEpDTEVWQlFUaENMRlZCUVVNc1IwRkJSQ3hGUVVGVE8wRkJRM1JETEU5QlFVa3NRMEZCUXl4UlFVRk1MRVZCUVdVN1FVRkRaQ3g1UWtGQlZTeFRRVUZXTEVOQlFXOUNMRWRCUVhCQ0xFTkJRWGRDTEZWQlFYaENPMEZCUTBFc2NVSkJRVTBzUjBGQlRpeEhRVUZaTEVsQlFVa3NSMEZCYUVJN1FVRkRRU3hsUVVGWExFbEJRVmc3UVVGRFFUdEJRVU5FTEVkQlRrUTdRVUZQUVN4RlFWSkVPenRCUVZWQkxITkNRVUZWTEdkQ1FVRldMRU5CUVRKQ0xFOUJRVE5DTEVWQlFXOURMRlZCUVVNc1IwRkJSQ3hGUVVGVE8wRkJRelZETEUxQlFVa3NTVUZCU1N4TlFVRktMRXRCUVdVc1owSkJRVzVDTEVWQlFUQkNPMEZCUXpGQ0xIVkNRVUZWTEZOQlFWWXNRMEZCYjBJc1RVRkJjRUlzUTBGQk1rSXNWVUZCTTBJN1FVRkRRU3hoUVVGWExFdEJRVmc3UVVGRFFTeEZRVXBFT3p0QlFVMUJMR3RDUVVGTkxHZENRVUZPTEVOQlFYVkNMRTlCUVhaQ0xFVkJRV2RETEZsQlFVMDdRVUZEY2tNc1RVRkJTU3hEUVVGRExFVkJRVXdzUlVGQlV6dEJRVU5TTEdWQlFWa3NhVUpCUVUwc1MwRkJUaXhIUVVGakxFOUJRVThzVlVGQmNrSXNSMEZCYTBNc1lVRkJiRU1zUjBGQmEwUXNVMEZCT1VRN1FVRkRRU3h2UWtGQlRTeFRRVUZPTEVOQlFXZENMRWRCUVdoQ0xFTkJRVzlDTEZOQlFYQkNPMEZCUTBFc1kwRkJWenRCUVVGQkxGZEJRVTBzUzBGQlN5eEpRVUZZTzBGQlFVRXNTVUZCV0N4RlFVRTBRaXhIUVVFMVFqdEJRVU5CTEVkQlNrUXNUVUZKVHp0QlFVTk9MRzlDUVVGTkxGTkJRVTRzUTBGQlowSXNUVUZCYUVJc1EwRkJkVUlzVTBGQmRrSTdRVUZEUVN4M1FrRkJWU3hUUVVGV0xFTkJRVzlDTEUxQlFYQkNMRU5CUVRKQ0xGVkJRVE5DTzBGQlEwRXNVVUZCU3l4TFFVRk1PMEZCUTBFc1kwRkJWeXhMUVVGWU8wRkJRMEU3UVVGRFJDeEZRVmhFTzBGQldVRXNRMEV2UWtRN08ydENRV2xEWlN4dlFqczdPenM3T3pzN08wRkRka05tT3p0QlFVVkJMRWxCUVVrc1VVRkJVU3hMUVVGYU8wRkJRMEVzU1VGQlRTeDFRa0ZCZFVJc1UwRkJka0lzYjBKQlFYVkNMRWRCUVUwN1FVRkRiRU1zUzBGQlRTeFJRVUZSTEZOQlFWTXNZMEZCVkN4RFFVRjNRaXhUUVVGNFFpeERRVUZrT3p0QlFVVkJMRTlCUVUwc1owSkJRVTRzUTBGQmRVSXNUMEZCZGtJc1JVRkJaME1zV1VGQlRUdEJRVU55UXl4dlFrRkJUeXhUUVVGUUxFTkJRV2xDTEVkQlFXcENMRU5CUVhGQ0xFMUJRWEpDTzBGQlEwRXNWVUZCVVN4SlFVRlNPMEZCUTBFc1JVRklSRHM3UVVGTFFTeHRRa0ZCVHl4blFrRkJVQ3hEUVVGM1FpeFBRVUY0UWl4RlFVRnBReXhaUVVGTk8wRkJRM1JETEc5Q1FVRlBMRk5CUVZBc1EwRkJhVUlzVFVGQmFrSXNRMEZCZDBJc1RVRkJlRUk3UVVGRFFTeFZRVUZSTEV0QlFWSTdRVUZEUVN4RlFVaEVPenRCUVV0QkxGRkJRVThzWjBKQlFWQXNRMEZCZDBJc1UwRkJlRUlzUlVGQmJVTXNXVUZCVFR0QlFVTjRReXhOUVVGSkxFdEJRVW9zUlVGQlZ6dEJRVU5XTEdOQlFWY3NXVUZCVFR0QlFVTm9RaXh6UWtGQlR5eFRRVUZRTEVOQlFXbENMRTFCUVdwQ0xFTkJRWGRDTEUxQlFYaENPMEZCUTBFc1dVRkJVU3hMUVVGU08wRkJRMEVzU1VGSVJDeEZRVWRITEVkQlNFZzdRVUZKUVR0QlFVTkVMRVZCVUVRN1FVRlJRU3hEUVhKQ1JEczdhMEpCZFVKbExHOUNPenM3T3pzN096czdRVU14UW1ZN08wRkJRMEU3TzBGQlJVRXNTVUZCU1N4aFFVRktPMEZCUTBFc1NVRkJTU3hWUVVGVkxFTkJRV1E3UVVGRFFTeEpRVUZKTEZsQlFWa3NTMEZCYUVJN08wRkJSVUVzU1VGQlRTeDVRa0ZCZVVJc1UwRkJla0lzYzBKQlFYbENMRWRCUVUwN1FVRkRjRU1zYzBKQlFWVXNaMEpCUVZZc1EwRkJNa0lzVVVGQk0wSXNSVUZCY1VNc1dVRkJUVHRCUVVNeFF5eE5RVUZKTEVsQlFVa3NhMEpCUVU4c2NVSkJRVkFzUjBGQkswSXNRMEZCZGtNN08wRkJSVUVzVFVGQlNTeFpRVUZaTEVOQlFXaENMRVZCUVcxQ08wRkJRMnhDTEZWQlFVOHNUMEZCVUR0QlFVTkJMR0ZCUVZVc1EwRkJWanRCUVVOQk96dEJRVVZFTEUxQlFVa3NTMEZCU3l4RFFVRkRMRVZCUVU0c1NVRkJXU3hEUVVGRExGTkJRV3BDTEVWQlFUUkNPMEZCUXpOQ0xIVkNRVUZUTEZOQlFWUXNRMEZCYlVJc1IwRkJia0lzUTBGQmRVSXNUVUZCZGtJN1FVRkRRU3hsUVVGWkxFbEJRVm83UVVGRFFTeEhRVWhFTEUxQlIwOHNTVUZCU1N4SlFVRkpMRU5CUVVNc1JVRkJUQ3hKUVVGWExGTkJRV1lzUlVGQk1FSTdRVUZEYUVNc2RVSkJRVk1zVTBGQlZDeERRVUZ0UWl4TlFVRnVRaXhEUVVFd1FpeE5RVUV4UWp0QlFVTkJMR1ZCUVZrc1MwRkJXanRCUVVOQk8wRkJRMFFzUlVGbVJEczdRVUZwUWtFc2NVSkJRVk1zWjBKQlFWUXNRMEZCTUVJc1QwRkJNVUlzUlVGQmJVTTdRVUZCUVN4VFFVRk5MSGxDUVVGT08wRkJRVUVzUlVGQmJrTTdRVUZEUVN4RFFXNUNSRHM3YTBKQmNVSmxMSE5DT3pzN096czdPenM3TzBGRE5VSm1PenM3TzBGQlEwRTdPenM3UVVGRFFUczdPenRCUVVOQk96czdPMEZCUTBFN096czdPenRSUVVkRExHOUNMRWRCUVVFc09FSTdVVUZEUVN4elFpeEhRVUZCTEdkRE8xRkJRMEVzYjBJc1IwRkJRU3c0UWp0UlFVTkJMRmtzUjBGQlFTeHpRanRSUVVOQkxGVXNSMEZCUVN4dlFqczdPenM3T3pzN1FVTllSQ3hKUVVGTkxGZEJRVmNzUTBGQlF5eEhRVUZFTEVWQlFVMHNSMEZCVGl4RlFVRlhMRWRCUVZnc1JVRkJaMElzUjBGQmFFSXNSVUZCY1VJc1IwRkJja0lzUlVGQk1FSXNSMEZCTVVJc1JVRkJLMElzUjBGQkwwSXNSVUZCYjBNc1IwRkJjRU1zUlVGQmVVTXNSMEZCZWtNc1JVRkJPRU1zUjBGQk9VTXNSVUZCYlVRc1IwRkJia1FzUlVGQmQwUXNSMEZCZUVRc1JVRkJOa1FzUjBGQk4wUXNSVUZCYTBVc1IwRkJiRVVzUlVGQmRVVXNSMEZCZGtVc1JVRkJORVVzUjBGQk5VVXNSVUZCYVVZc1IwRkJha1lzUlVGQmMwWXNSMEZCZEVZc1JVRkJNa1lzUjBGQk0wWXNSVUZCWjBjc1IwRkJhRWNzUlVGQmNVY3NSMEZCY2tjc1JVRkJNRWNzUjBGQk1VY3NSVUZCSzBjc1IwRkJMMGNzUlVGQmIwZ3NSMEZCY0Vnc1EwRkJha0k3TzBGQlJVRXNTVUZCVFN4bFFVRmxMRk5CUVdZc1dVRkJaU3hEUVVGRExFOUJRVVFzUlVGQllUdEJRVU5xUXl4TFFVRk5MR2xDUVVGcFFpeFRRVUZxUWl4alFVRnBRaXhEUVVGRExFbEJRVVFzUlVGQlZUdEJRVU5vUXl4TlFVRk5MRmRCUVZjc1ZVRkJWU3hwUWtGQlZpeEhRVUU0UWl4clFrRkJMME03UVVGRFFTeE5RVUZOTEdWQlFXVXNRMEZCUXl4UFFVRkVMRWRCUVZjc2FVSkJRVmdzUjBGQkswSXNhMEpCUVhCRU96dEJRVVZCTEUxQlFVMHNWMEZCVnl4TlFVRk5MRWxCUVU0c1EwRkJWeXhUUVVGVExHZENRVUZVTEVOQlFUQkNMRkZCUVRGQ0xFTkJRVmdzUTBGQmFrSTdRVUZEUVN4TlFVRk5MR1ZCUVdVc1RVRkJUU3hKUVVGT0xFTkJRVmNzVTBGQlV5eG5Ra0ZCVkN4RFFVRXdRaXhaUVVFeFFpeERRVUZZTEVOQlFYSkNPenRCUVVWQkxHVkJRV0VzVDBGQllpeERRVUZ4UWp0QlFVRkJMRlZCUVZNc1RVRkJUU3hsUVVGT0xFTkJRWE5DTEUxQlFYUkNMRU5CUVZRN1FVRkJRU3hIUVVGeVFqczdRVUZGUVN4VFFVRlBMRk5CUVZNc1NVRkJWQ3hEUVVGakxHbENRVUZUTzBGQlF6ZENMRTlCUVVrc1QwRkJUeXhOUVVGTkxHdENRVUZxUWp0QlFVTkJMRlZCUVU4c1MwRkJTeXhUUVVGTUxFTkJRV1VzUTBGQlppeE5RVUZ6UWl4SlFVRjBRaXhKUVVFNFFpeExRVUZMTEZOQlFVd3NRMEZCWlN4RFFVRm1MRTFCUVhOQ0xFdEJRVXNzVjBGQlRDeEZRVUV6UkR0QlFVTkJMRWRCU0Uwc1EwRkJVRHRCUVVsQkxFVkJZa1E3TzBGQlpVRXNTMEZCVFN4MVFrRkJkVUlzVTBGQmRrSXNiMEpCUVhWQ0xFTkJRVU1zVDBGQlJDeEZRVUZWTEUxQlFWWXNSVUZCY1VJN1FVRkRha1FzVlVGQlVTeG5Ra0ZCVWl4RFFVRjVRaXhQUVVGNlFpeEZRVUZyUXl4WlFVRk5PMEZCUTNaRExFOUJRVTBzWVVGQllTeFRRVUZUTEdOQlFWUXNRMEZCZDBJc1RVRkJlRUlzUTBGQmJrSTdRVUZEUVN4UFFVRkpMR1ZCUVVvN08wRkJSVUVzVDBGQlNTeERRVUZETEU5QlFVd3NSVUZCWXp0QlFVTmlMR0ZCUVZNc1YwRkJWeXhIUVVGWUxFZEJRV2xDTEZOQlFWTXNZMEZCVkN4RFFVRjNRaXhsUVVGNFFpeERRVUZxUWl4SFFVRTBSQ3hYUVVGWExHRkJRVmdzUTBGQmVVSXNZVUZCZWtJc1EwRkJkVU1zWVVGQmRrTXNRMEZCY1VRc1lVRkJja1FzUTBGQmJVVXNjMEpCUVc1RkxFTkJRVEJHTEdGQlFURkdMRU5CUVhkSExESkNRVUY0Unl4RFFVRnlSVHRCUVVOQkxFbEJSa1FzVFVGRlR6dEJRVU5PTEdGQlFWTXNWMEZCVnl4SFFVRllMRWRCUVdsQ0xGTkJRVk1zWTBGQlZDeERRVUYzUWl4bFFVRjRRaXhEUVVGcVFpeEhRVUUwUkN4WFFVRlhMR0ZCUVZnc1EwRkJlVUlzWVVGQmVrSXNRMEZCZFVNc1lVRkJka01zUTBGQmNVUXNjMEpCUVhKRUxFTkJRVFJGTEdGQlFUVkZMRU5CUVRCR0xESkNRVUV4Uml4RFFVRnlSVHRCUVVOQk96dEJRVVZFTEZWQlFVOHNZMEZCVUN4RFFVRnpRaXhGUVVGRExGVkJRVlVzVVVGQldDeEZRVUZ4UWl4UFFVRlBMRTlCUVRWQ0xFVkJRWFJDTzBGQlEwRXNSMEZZUkR0QlFWbEJMRVZCWWtRN08wRkJaVUVzUzBGQlNTeG5Ra0ZCWjBJc1JVRkJjRUk3UVVGRFFTeExRVUZKTEZOQlFWTXNVMEZCVXl4aFFVRlVMRU5CUVhWQ0xHOUNRVUYyUWl4RFFVRmlPMEZCUTBFc1VVRkJUeXhUUVVGUUxFZEJRVzFDTEVWQlFXNUNPenRCUVVWQkxGVkJRVk1zVDBGQlZDeERRVUZwUWl4clFrRkJWVHRCUVVNeFFpeE5RVUZKTEdOQlFXTXNaVUZCWlN4TlFVRm1MRU5CUVd4Q08wRkJRMEVzVFVGQlNTeFZRVUZWTEZOQlFWTXNZVUZCVkN4RFFVRjFRaXhIUVVGMlFpeERRVUZrT3p0QlFVVkJMRTFCUVVrc1EwRkJReXhYUVVGTUxFVkJRV3RDT3p0QlFVVnNRaXhqUVVGWkxFVkJRVm9zUjBGQmFVSXNUVUZCYWtJN1FVRkRRU3hWUVVGUkxGTkJRVklzUjBGQmIwSXNUMEZCVHl4WFFVRlFMRVZCUVhCQ08wRkJRMEVzVlVGQlVTeFRRVUZTTEVkQlFXOUNMSGxDUVVGd1FqczdRVUZGUVN4MVFrRkJjVUlzVDBGQmNrSXNSVUZCT0VJc1RVRkJPVUk3UVVGRFFTeFRRVUZQTEZkQlFWQXNRMEZCYlVJc1QwRkJia0k3UVVGRFFTeEZRVnBFTzBGQllVRXNRMEZvUkVRN08ydENRV3RFWlN4Wk96czdPenM3T3p0QlEzQkVaaXhKUVVGTkxHRkJRV0VzVTBGQllpeFZRVUZoTEVOQlFVTXNUMEZCUkN4RlFVRmhPMEZCUXk5Q0xFdEJRVTBzWVVGQllTeFJRVUZSTEdGQlFWSXNRMEZCYzBJc1lVRkJkRUlzUTBGQmIwTXNZVUZCY0VNc1EwRkJia0k3UVVGRFFTeExRVUZOTEdGQlFXRXNVVUZCVVN4aFFVRlNMRU5CUVhOQ0xHRkJRWFJDTEVOQlFXOURMR0ZCUVhCRExFTkJRVzVDT3p0QlFVVkJMRXRCUVVrc1ZVRkJWU3hSUVVGUkxHbENRVUYwUWp0QlFVTkJMRmxCUVZjc1owSkJRVmdzUTBGQk5FSXNUMEZCTlVJc1JVRkJjVU1zV1VGQlRUdEJRVU14UXl4TlFVRk5MRTlCUVU4c1VVRkJVU3hyUWtGQmNrSTdRVUZEUVN4TlFVRkpMRWxCUVVvc1JVRkJWVHRCUVVOVUxGRkJRVXNzWTBGQlRDeERRVUZ2UWl4RlFVRkRMRlZCUVZVc1VVRkJXQ3hGUVVGeFFpeFBRVUZQTEZOQlFUVkNMRVZCUVhWRExGRkJRVkVzVVVGQkwwTXNSVUZCY0VJN1FVRkRRU3hoUVVGVkxFbEJRVlk3UVVGRFFUdEJRVU5FTEVWQlRrUTdPMEZCVVVFc1dVRkJWeXhuUWtGQldDeERRVUUwUWl4UFFVRTFRaXhGUVVGeFF5eFpRVUZOTzBGQlF6RkRMRTFCUVUwc1QwRkJUeXhSUVVGUkxITkNRVUZ5UWp0QlFVTkJMRTFCUVVrc1NVRkJTaXhGUVVGVk8wRkJRMVFzVVVGQlN5eGpRVUZNTEVOQlFXOUNMRVZCUVVNc1ZVRkJWU3hSUVVGWUxFVkJRWEZDTEU5QlFVOHNVMEZCTlVJc1JVRkJkVU1zVVVGQlVTeFJRVUV2UXl4RlFVRndRanRCUVVOQkxHRkJRVlVzU1VGQlZqdEJRVU5CTzBGQlEwUXNSVUZPUkR0QlFVOUJMRU5CY0VKRU96dHJRa0Z6UW1Vc1ZUczdPenM3T3pzN1FVTjBRbVlzU1VGQlRTeG5Ra0ZCWjBJc1UwRkJhRUlzWVVGQlowSXNRMEZCUXl4TFFVRkVPMEZCUVVFc2VVZEJSV2xETEV0QlJtcERPMEZCUVVFc1EwRkJkRUk3TzBGQlRVRXNTVUZCVFN4clFrRkJhMElzVTBGQmJFSXNaVUZCYTBJc1EwRkJReXhMUVVGRUxFVkJRVkVzUTBGQlVpeEZRVUZqTzBGQlFVRXNTMEZETjBJc1MwRkVOa0lzUjBGREswSXNTMEZFTDBJc1EwRkROMElzUzBGRU5rSTdRVUZCUVN4TFFVTjBRaXhUUVVSelFpeEhRVU1yUWl4TFFVUXZRaXhEUVVOMFFpeFRRVVJ6UWp0QlFVRkJMRXRCUTFnc1VVRkVWeXhIUVVNclFpeExRVVF2UWl4RFFVTllMRkZCUkZjN1FVRkJRU3hMUVVORUxFMUJSRU1zUjBGREswSXNTMEZFTDBJc1EwRkRSQ3hOUVVSRE8wRkJRVUVzUzBGRFR5eFhRVVJRTEVkQlF5dENMRXRCUkM5Q0xFTkJRMDhzVjBGRVVEdEJRVUZCTEV0QlEyOUNMRTFCUkhCQ0xFZEJReXRDTEV0QlJDOUNMRU5CUTI5Q0xFMUJSSEJDT3pzN1FVRkhja01zUzBGQlRTeFpRVUZaTEU5QlFVOHNUVUZCVUN4SFFVTnFRaXhQUVVGUExFZEJRVkFzUTBGQlZ6dEJRVUZCTEZOQlFWTXNZMEZCWXl4TFFVRmtMRU5CUVZRN1FVRkJRU3hGUVVGWUxFVkJRVEJETEVsQlFURkRMRU5CUVN0RExFVkJRUzlETEVOQlJHbENMRWRCUTI5RExFVkJSSFJFT3p0QlFVZEJMSGRPUVV0NVF5eExRVXg2UXl4eFNFRlBhMFFzVTBGUWJFUXNiMGhCVTJsRUxGRkJWR3BFTERCS1FXRnZSQ3hEUVdKd1JDeDNRa0ZqVHl4VFFXUlFMQ3RIUVdkQ2VVTXNWMEZvUW5wRExEQkVRV2xDYjBNc1RVRnFRbkJETzBGQk5FSkJMRU5CYkVORU96dHJRa0Z2UTJVc1pUczdPenM3T3pzN096dEJRekZEWmpzN096dEJRVU5CT3pzN096czdVVUZGVXl4bExFZEJRVUVzYVVJN1VVRkJhVUlzVnl4SFFVRkJMR1U3T3pzN096czdPMEZEU0RGQ0xFbEJRVTBzYlcxQ1FVRk9PenRCUVdsQ1FTeEpRVUZOTEdOQlFXTXNVMEZCWkN4WFFVRmpMRWRCUVUwN1FVRkRla0lzUzBGQlNTeFhRVUZYTEZOQlFWTXNZMEZCVkN4RFFVRjNRaXhSUVVGNFFpeERRVUZtTzBGQlEwRXNWVUZCVXl4VFFVRlVMRWRCUVhGQ0xGRkJRWEpDTzBGQlEwRXNRMEZJUkRzN2EwSkJTMlVzVnpzN096czdPenM3T3p0QlEzUkNaanM3UVVGRlFTeEpRVUZOTEZkQlFWY3NVMEZCV0N4UlFVRlhMRU5CUVVNc1JVRkJSQ3hGUVVGTExFbEJRVXdzUlVGQll6dEJRVU0zUWl4TlFVRkpMR2RDUVVGS096dEJRVVZCTEZOQlFVOHNXVUZCVnp0QlFVRkJPMEZCUVVFN08wRkJRMmhDTEZGQlFVMHNaVUZCWlN4VFFVRm1MRmxCUVdVN1FVRkJRU3hoUVVGTkxFZEJRVWNzUzBGQlNDeERRVUZUTEV0QlFWUXNSVUZCWlN4VlFVRm1MRU5CUVU0N1FVRkJRU3hMUVVGeVFqczdRVUZGUVN4cFFrRkJZU3hQUVVGaU8wRkJRMEVzWTBGQlZTeFhRVUZYTEZsQlFWZ3NSVUZCZVVJc1NVRkJla0lzUTBGQlZqdEJRVU5FTEVkQlRFUTdRVUZOUkN4RFFWUkVPenRCUVZkQkxFbEJRVTBzWTBGQll5eFRRVUZrTEZkQlFXTXNSMEZCVFR0QlFVTjZRaXh6UWtGQlV5eFBRVUZVTEVOQlFXbENPMEZCUVVFc1YwRkJVU3hMUVVGTExGTkJRVXdzUTBGQlpTeEhRVUZtTEVOQlFXMUNMRTlCUVc1Q0xFTkJRVkk3UVVGQlFTeEhRVUZxUWp0QlFVTkJMR3RDUVVGTExGTkJRVXdzUTBGQlpTeEhRVUZtTEVOQlFXMUNMRTlCUVc1Q08wRkJRMEVzUTBGSVJEczdRVUZMUVN4SlFVRk5MR05CUVdNc1UwRkJaQ3hYUVVGakxFZEJRVTA3UVVGRGVrSXNUVUZCU1N4TlFVRk5MRk5CUVZNc1kwRkJWQ3hEUVVGM1FpeGxRVUY0UWl4RFFVRldPMEZCUTBFc1RVRkJTU3hqUVVGS0xFTkJRVzFDTEVWQlFVTXNWVUZCVlN4UlFVRllMRVZCUVhGQ0xFOUJRVThzVDBGQk5VSXNSVUZCYmtJN1FVRkRRU3hEUVVoRU96dFJRVXRUTEZFc1IwRkJRU3hSTzFGQlFWVXNWeXhIUVVGQkxGYzdVVUZCWVN4WExFZEJRVUVzVnlJc0ltWnBiR1VpT2lKblpXNWxjbUYwWldRdWFuTWlMQ0p6YjNWeVkyVlNiMjkwSWpvaUlpd2ljMjkxY21ObGMwTnZiblJsYm5RaU9sc2lLR1oxYm1OMGFXOXVLQ2w3Wm5WdVkzUnBiMjRnY2lobExHNHNkQ2w3Wm5WdVkzUnBiMjRnYnlocExHWXBlMmxtS0NGdVcybGRLWHRwWmlnaFpWdHBYU2w3ZG1GeUlHTTlYQ0ptZFc1amRHbHZibHdpUFQxMGVYQmxiMllnY21WeGRXbHlaU1ltY21WeGRXbHlaVHRwWmlnaFppWW1ZeWx5WlhSMWNtNGdZeWhwTENFd0tUdHBaaWgxS1hKbGRIVnliaUIxS0drc0lUQXBPM1poY2lCaFBXNWxkeUJGY25KdmNpaGNJa05oYm01dmRDQm1hVzVrSUcxdlpIVnNaU0FuWENJcmFTdGNJaWRjSWlrN2RHaHliM2NnWVM1amIyUmxQVndpVFU5RVZVeEZYMDVQVkY5R1QxVk9SRndpTEdGOWRtRnlJSEE5Ymx0cFhUMTdaWGh3YjNKMGN6cDdmWDA3WlZ0cFhWc3dYUzVqWVd4c0tIQXVaWGh3YjNKMGN5eG1kVzVqZEdsdmJpaHlLWHQyWVhJZ2JqMWxXMmxkV3pGZFczSmRPM0psZEhWeWJpQnZLRzU4ZkhJcGZTeHdMSEF1Wlhod2IzSjBjeXh5TEdVc2JpeDBLWDF5WlhSMWNtNGdibHRwWFM1bGVIQnZjblJ6ZldadmNpaDJZWElnZFQxY0ltWjFibU4wYVc5dVhDSTlQWFI1Y0dWdlppQnlaWEYxYVhKbEppWnlaWEYxYVhKbExHazlNRHRwUEhRdWJHVnVaM1JvTzJrckt5bHZLSFJiYVYwcE8zSmxkSFZ5YmlCdmZYSmxkSFZ5YmlCeWZTa29LU0lzSWk4cUlITnRiMjkwYUhOamNtOXNiQ0IyTUM0MExqQWdMU0F5TURFNElDMGdSSFZ6ZEdGdUlFdGhjM1JsYml3Z1NtVnlaVzFwWVhNZ1RXVnVhV05vWld4c2FTQXRJRTFKVkNCTWFXTmxibk5sSUNvdlhHNG9ablZ1WTNScGIyNGdLQ2tnZTF4dUlDQW5kWE5sSUhOMGNtbGpkQ2M3WEc1Y2JpQWdMeThnY0c5c2VXWnBiR3hjYmlBZ1puVnVZM1JwYjI0Z2NHOXNlV1pwYkd3b0tTQjdYRzRnSUNBZ0x5OGdZV3hwWVhObGMxeHVJQ0FnSUhaaGNpQjNJRDBnZDJsdVpHOTNPMXh1SUNBZ0lIWmhjaUJrSUQwZ1pHOWpkVzFsYm5RN1hHNWNiaUFnSUNBdkx5QnlaWFIxY200Z2FXWWdjMk55YjJ4c0lHSmxhR0YyYVc5eUlHbHpJSE4xY0hCdmNuUmxaQ0JoYm1RZ2NHOXNlV1pwYkd3Z2FYTWdibTkwSUdadmNtTmxaRnh1SUNBZ0lHbG1JQ2hjYmlBZ0lDQWdJQ2R6WTNKdmJHeENaV2hoZG1sdmNpY2dhVzRnWkM1a2IyTjFiV1Z1ZEVWc1pXMWxiblF1YzNSNWJHVWdKaVpjYmlBZ0lDQWdJSGN1WDE5bWIzSmpaVk50YjI5MGFGTmpjbTlzYkZCdmJIbG1hV3hzWDE4Z0lUMDlJSFJ5ZFdWY2JpQWdJQ0FwSUh0Y2JpQWdJQ0FnSUhKbGRIVnlianRjYmlBZ0lDQjlYRzVjYmlBZ0lDQXZMeUJuYkc5aVlXeHpYRzRnSUNBZ2RtRnlJRVZzWlcxbGJuUWdQU0IzTGtoVVRVeEZiR1Z0Wlc1MElIeDhJSGN1Uld4bGJXVnVkRHRjYmlBZ0lDQjJZWElnVTBOU1QweE1YMVJKVFVVZ1BTQTBOamc3WEc1Y2JpQWdJQ0F2THlCdlltcGxZM1FnWjJGMGFHVnlhVzVuSUc5eWFXZHBibUZzSUhOamNtOXNiQ0J0WlhSb2IyUnpYRzRnSUNBZ2RtRnlJRzl5YVdkcGJtRnNJRDBnZTF4dUlDQWdJQ0FnYzJOeWIyeHNPaUIzTG5OamNtOXNiQ0I4ZkNCM0xuTmpjbTlzYkZSdkxGeHVJQ0FnSUNBZ2MyTnliMnhzUW5rNklIY3VjMk55YjJ4c1Fua3NYRzRnSUNBZ0lDQmxiR1Z0Wlc1MFUyTnliMnhzT2lCRmJHVnRaVzUwTG5CeWIzUnZkSGx3WlM1elkzSnZiR3dnZkh3Z2MyTnliMnhzUld4bGJXVnVkQ3hjYmlBZ0lDQWdJSE5qY205c2JFbHVkRzlXYVdWM09pQkZiR1Z0Wlc1MExuQnliM1J2ZEhsd1pTNXpZM0p2Ykd4SmJuUnZWbWxsZDF4dUlDQWdJSDA3WEc1Y2JpQWdJQ0F2THlCa1pXWnBibVVnZEdsdGFXNW5JRzFsZEdodlpGeHVJQ0FnSUhaaGNpQnViM2NnUFZ4dUlDQWdJQ0FnZHk1d1pYSm1iM0p0WVc1alpTQW1KaUIzTG5CbGNtWnZjbTFoYm1ObExtNXZkMXh1SUNBZ0lDQWdJQ0EvSUhjdWNHVnlabTl5YldGdVkyVXVibTkzTG1KcGJtUW9keTV3WlhKbWIzSnRZVzVqWlNsY2JpQWdJQ0FnSUNBZ09pQkVZWFJsTG01dmR6dGNibHh1SUNBZ0lDOHFLbHh1SUNBZ0lDQXFJR2x1WkdsallYUmxjeUJwWmlCaElIUm9aU0JqZFhKeVpXNTBJR0p5YjNkelpYSWdhWE1nYldGa1pTQmllU0JOYVdOeWIzTnZablJjYmlBZ0lDQWdLaUJBYldWMGFHOWtJR2x6VFdsamNtOXpiMlowUW5KdmQzTmxjbHh1SUNBZ0lDQXFJRUJ3WVhKaGJTQjdVM1J5YVc1bmZTQjFjMlZ5UVdkbGJuUmNiaUFnSUNBZ0tpQkFjbVYwZFhKdWN5QjdRbTl2YkdWaGJuMWNiaUFnSUNBZ0tpOWNiaUFnSUNCbWRXNWpkR2x2YmlCcGMwMXBZM0p2YzI5bWRFSnliM2R6WlhJb2RYTmxja0ZuWlc1MEtTQjdYRzRnSUNBZ0lDQjJZWElnZFhObGNrRm5aVzUwVUdGMGRHVnlibk1nUFNCYkowMVRTVVVnSnl3Z0oxUnlhV1JsYm5Rdkp5d2dKMFZrWjJVdkoxMDdYRzVjYmlBZ0lDQWdJSEpsZEhWeWJpQnVaWGNnVW1WblJYaHdLSFZ6WlhKQloyVnVkRkJoZEhSbGNtNXpMbXB2YVc0b0ozd25LU2t1ZEdWemRDaDFjMlZ5UVdkbGJuUXBPMXh1SUNBZ0lIMWNibHh1SUNBZ0lDOHFYRzRnSUNBZ0lDb2dTVVVnYUdGeklISnZkVzVrYVc1bklHSjFaeUJ5YjNWdVpHbHVaeUJrYjNkdUlHTnNhV1Z1ZEVobGFXZG9kQ0JoYm1RZ1kyeHBaVzUwVjJsa2RHZ2dZVzVrWEc0Z0lDQWdJQ29nY205MWJtUnBibWNnZFhBZ2MyTnliMnhzU0dWcFoyaDBJR0Z1WkNCelkzSnZiR3hYYVdSMGFDQmpZWFZ6YVc1bklHWmhiSE5sSUhCdmMybDBhWFpsYzF4dUlDQWdJQ0FxSUc5dUlHaGhjMU5qY205c2JHRmliR1ZUY0dGalpWeHVJQ0FnSUNBcUwxeHVJQ0FnSUhaaGNpQlNUMVZPUkVsT1IxOVVUMHhGVWtGT1EwVWdQU0JwYzAxcFkzSnZjMjltZEVKeWIzZHpaWElvZHk1dVlYWnBaMkYwYjNJdWRYTmxja0ZuWlc1MEtTQS9JREVnT2lBd08xeHVYRzRnSUNBZ0x5b3FYRzRnSUNBZ0lDb2dZMmhoYm1kbGN5QnpZM0p2Ykd3Z2NHOXphWFJwYjI0Z2FXNXphV1JsSUdGdUlHVnNaVzFsYm5SY2JpQWdJQ0FnS2lCQWJXVjBhRzlrSUhOamNtOXNiRVZzWlcxbGJuUmNiaUFnSUNBZ0tpQkFjR0Z5WVcwZ2UwNTFiV0psY24wZ2VGeHVJQ0FnSUNBcUlFQndZWEpoYlNCN1RuVnRZbVZ5ZlNCNVhHNGdJQ0FnSUNvZ1FISmxkSFZ5Ym5NZ2UzVnVaR1ZtYVc1bFpIMWNiaUFnSUNBZ0tpOWNiaUFnSUNCbWRXNWpkR2x2YmlCelkzSnZiR3hGYkdWdFpXNTBLSGdzSUhrcElIdGNiaUFnSUNBZ0lIUm9hWE11YzJOeWIyeHNUR1ZtZENBOUlIZzdYRzRnSUNBZ0lDQjBhR2x6TG5OamNtOXNiRlJ2Y0NBOUlIazdYRzRnSUNBZ2ZWeHVYRzRnSUNBZ0x5b3FYRzRnSUNBZ0lDb2djbVYwZFhKdWN5QnlaWE4xYkhRZ2IyWWdZWEJ3YkhscGJtY2daV0Z6WlNCdFlYUm9JR1oxYm1OMGFXOXVJSFJ2SUdFZ2JuVnRZbVZ5WEc0Z0lDQWdJQ29nUUcxbGRHaHZaQ0JsWVhObFhHNGdJQ0FnSUNvZ1FIQmhjbUZ0SUh0T2RXMWlaWEo5SUd0Y2JpQWdJQ0FnS2lCQWNtVjBkWEp1Y3lCN1RuVnRZbVZ5ZlZ4dUlDQWdJQ0FxTDF4dUlDQWdJR1oxYm1OMGFXOXVJR1ZoYzJVb2F5a2dlMXh1SUNBZ0lDQWdjbVYwZFhKdUlEQXVOU0FxSUNneElDMGdUV0YwYUM1amIzTW9UV0YwYUM1UVNTQXFJR3NwS1R0Y2JpQWdJQ0I5WEc1Y2JpQWdJQ0F2S2lwY2JpQWdJQ0FnS2lCcGJtUnBZMkYwWlhNZ2FXWWdZU0J6Ylc5dmRHZ2dZbVZvWVhacGIzSWdjMmh2ZFd4a0lHSmxJR0Z3Y0d4cFpXUmNiaUFnSUNBZ0tpQkFiV1YwYUc5a0lITm9iM1ZzWkVKaGFXeFBkWFJjYmlBZ0lDQWdLaUJBY0dGeVlXMGdlMDUxYldKbGNueFBZbXBsWTNSOUlHWnBjbk4wUVhKblhHNGdJQ0FnSUNvZ1FISmxkSFZ5Ym5NZ2UwSnZiMnhsWVc1OVhHNGdJQ0FnSUNvdlhHNGdJQ0FnWm5WdVkzUnBiMjRnYzJodmRXeGtRbUZwYkU5MWRDaG1hWEp6ZEVGeVp5a2dlMXh1SUNBZ0lDQWdhV1lnS0Z4dUlDQWdJQ0FnSUNCbWFYSnpkRUZ5WnlBOVBUMGdiblZzYkNCOGZGeHVJQ0FnSUNBZ0lDQjBlWEJsYjJZZ1ptbHljM1JCY21jZ0lUMDlJQ2R2WW1wbFkzUW5JSHg4WEc0Z0lDQWdJQ0FnSUdacGNuTjBRWEpuTG1KbGFHRjJhVzl5SUQwOVBTQjFibVJsWm1sdVpXUWdmSHhjYmlBZ0lDQWdJQ0FnWm1seWMzUkJjbWN1WW1Wb1lYWnBiM0lnUFQwOUlDZGhkWFJ2SnlCOGZGeHVJQ0FnSUNBZ0lDQm1hWEp6ZEVGeVp5NWlaV2hoZG1sdmNpQTlQVDBnSjJsdWMzUmhiblFuWEc0Z0lDQWdJQ0FwSUh0Y2JpQWdJQ0FnSUNBZ0x5OGdabWx5YzNRZ1lYSm5kVzFsYm5RZ2FYTWdibTkwSUdGdUlHOWlhbVZqZEM5dWRXeHNYRzRnSUNBZ0lDQWdJQzh2SUc5eUlHSmxhR0YyYVc5eUlHbHpJR0YxZEc4c0lHbHVjM1JoYm5RZ2IzSWdkVzVrWldacGJtVmtYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQjBjblZsTzF4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNCcFppQW9kSGx3Wlc5bUlHWnBjbk4wUVhKbklEMDlQU0FuYjJKcVpXTjBKeUFtSmlCbWFYSnpkRUZ5Wnk1aVpXaGhkbWx2Y2lBOVBUMGdKM050YjI5MGFDY3BJSHRjYmlBZ0lDQWdJQ0FnTHk4Z1ptbHljM1FnWVhKbmRXMWxiblFnYVhNZ1lXNGdiMkpxWldOMElHRnVaQ0JpWldoaGRtbHZjaUJwY3lCemJXOXZkR2hjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJR1poYkhObE8xeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQXZMeUIwYUhKdmR5Qmxjbkp2Y2lCM2FHVnVJR0psYUdGMmFXOXlJR2x6SUc1dmRDQnpkWEJ3YjNKMFpXUmNiaUFnSUNBZ0lIUm9jbTkzSUc1bGR5QlVlWEJsUlhKeWIzSW9YRzRnSUNBZ0lDQWdJQ2RpWldoaGRtbHZjaUJ0WlcxaVpYSWdiMllnVTJOeWIyeHNUM0IwYVc5dWN5QW5JQ3RjYmlBZ0lDQWdJQ0FnSUNCbWFYSnpkRUZ5Wnk1aVpXaGhkbWx2Y2lBclhHNGdJQ0FnSUNBZ0lDQWdKeUJwY3lCdWIzUWdZU0IyWVd4cFpDQjJZV3gxWlNCbWIzSWdaVzUxYldWeVlYUnBiMjRnVTJOeWIyeHNRbVZvWVhacGIzSXVKMXh1SUNBZ0lDQWdLVHRjYmlBZ0lDQjlYRzVjYmlBZ0lDQXZLaXBjYmlBZ0lDQWdLaUJwYm1ScFkyRjBaWE1nYVdZZ1lXNGdaV3hsYldWdWRDQm9ZWE1nYzJOeWIyeHNZV0pzWlNCemNHRmpaU0JwYmlCMGFHVWdjSEp2ZG1sa1pXUWdZWGhwYzF4dUlDQWdJQ0FxSUVCdFpYUm9iMlFnYUdGelUyTnliMnhzWVdKc1pWTndZV05sWEc0Z0lDQWdJQ29nUUhCaGNtRnRJSHRPYjJSbGZTQmxiRnh1SUNBZ0lDQXFJRUJ3WVhKaGJTQjdVM1J5YVc1bmZTQmhlR2x6WEc0Z0lDQWdJQ29nUUhKbGRIVnlibk1nZTBKdmIyeGxZVzU5WEc0Z0lDQWdJQ292WEc0Z0lDQWdablZ1WTNScGIyNGdhR0Z6VTJOeWIyeHNZV0pzWlZOd1lXTmxLR1ZzTENCaGVHbHpLU0I3WEc0Z0lDQWdJQ0JwWmlBb1lYaHBjeUE5UFQwZ0oxa25LU0I3WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJsYkM1amJHbGxiblJJWldsbmFIUWdLeUJTVDFWT1JFbE9SMTlVVDB4RlVrRk9RMFVnUENCbGJDNXpZM0p2Ykd4SVpXbG5hSFE3WEc0Z0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUdsbUlDaGhlR2x6SUQwOVBTQW5XQ2NwSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUdWc0xtTnNhV1Z1ZEZkcFpIUm9JQ3NnVWs5VlRrUkpUa2RmVkU5TVJWSkJUa05GSUR3Z1pXd3VjMk55YjJ4c1YybGtkR2c3WEc0Z0lDQWdJQ0I5WEc0Z0lDQWdmVnh1WEc0Z0lDQWdMeW9xWEc0Z0lDQWdJQ29nYVc1a2FXTmhkR1Z6SUdsbUlHRnVJR1ZzWlcxbGJuUWdhR0Z6SUdFZ2MyTnliMnhzWVdKc1pTQnZkbVZ5Wm14dmR5QndjbTl3WlhKMGVTQnBiaUIwYUdVZ1lYaHBjMXh1SUNBZ0lDQXFJRUJ0WlhSb2IyUWdZMkZ1VDNabGNtWnNiM2RjYmlBZ0lDQWdLaUJBY0dGeVlXMGdlMDV2WkdWOUlHVnNYRzRnSUNBZ0lDb2dRSEJoY21GdElIdFRkSEpwYm1kOUlHRjRhWE5jYmlBZ0lDQWdLaUJBY21WMGRYSnVjeUI3UW05dmJHVmhibjFjYmlBZ0lDQWdLaTljYmlBZ0lDQm1kVzVqZEdsdmJpQmpZVzVQZG1WeVpteHZkeWhsYkN3Z1lYaHBjeWtnZTF4dUlDQWdJQ0FnZG1GeUlHOTJaWEptYkc5M1ZtRnNkV1VnUFNCM0xtZGxkRU52YlhCMWRHVmtVM1I1YkdVb1pXd3NJRzUxYkd3cFd5ZHZkbVZ5Wm14dmR5Y2dLeUJoZUdselhUdGNibHh1SUNBZ0lDQWdjbVYwZFhKdUlHOTJaWEptYkc5M1ZtRnNkV1VnUFQwOUlDZGhkWFJ2SnlCOGZDQnZkbVZ5Wm14dmQxWmhiSFZsSUQwOVBTQW5jMk55YjJ4c0p6dGNiaUFnSUNCOVhHNWNiaUFnSUNBdktpcGNiaUFnSUNBZ0tpQnBibVJwWTJGMFpYTWdhV1lnWVc0Z1pXeGxiV1Z1ZENCallXNGdZbVVnYzJOeWIyeHNaV1FnYVc0Z1pXbDBhR1Z5SUdGNGFYTmNiaUFnSUNBZ0tpQkFiV1YwYUc5a0lHbHpVMk55YjJ4c1lXSnNaVnh1SUNBZ0lDQXFJRUJ3WVhKaGJTQjdUbTlrWlgwZ1pXeGNiaUFnSUNBZ0tpQkFjR0Z5WVcwZ2UxTjBjbWx1WjMwZ1lYaHBjMXh1SUNBZ0lDQXFJRUJ5WlhSMWNtNXpJSHRDYjI5c1pXRnVmVnh1SUNBZ0lDQXFMMXh1SUNBZ0lHWjFibU4wYVc5dUlHbHpVMk55YjJ4c1lXSnNaU2hsYkNrZ2UxeHVJQ0FnSUNBZ2RtRnlJR2x6VTJOeWIyeHNZV0pzWlZrZ1BTQm9ZWE5UWTNKdmJHeGhZbXhsVTNCaFkyVW9aV3dzSUNkWkp5a2dKaVlnWTJGdVQzWmxjbVpzYjNjb1pXd3NJQ2RaSnlrN1hHNGdJQ0FnSUNCMllYSWdhWE5UWTNKdmJHeGhZbXhsV0NBOUlHaGhjMU5qY205c2JHRmliR1ZUY0dGalpTaGxiQ3dnSjFnbktTQW1KaUJqWVc1UGRtVnlabXh2ZHlobGJDd2dKMWduS1R0Y2JseHVJQ0FnSUNBZ2NtVjBkWEp1SUdselUyTnliMnhzWVdKc1pWa2dmSHdnYVhOVFkzSnZiR3hoWW14bFdEdGNiaUFnSUNCOVhHNWNiaUFnSUNBdktpcGNiaUFnSUNBZ0tpQm1hVzVrY3lCelkzSnZiR3hoWW14bElIQmhjbVZ1ZENCdlppQmhiaUJsYkdWdFpXNTBYRzRnSUNBZ0lDb2dRRzFsZEdodlpDQm1hVzVrVTJOeWIyeHNZV0pzWlZCaGNtVnVkRnh1SUNBZ0lDQXFJRUJ3WVhKaGJTQjdUbTlrWlgwZ1pXeGNiaUFnSUNBZ0tpQkFjbVYwZFhKdWN5QjdUbTlrWlgwZ1pXeGNiaUFnSUNBZ0tpOWNiaUFnSUNCbWRXNWpkR2x2YmlCbWFXNWtVMk55YjJ4c1lXSnNaVkJoY21WdWRDaGxiQ2tnZTF4dUlDQWdJQ0FnZG1GeUlHbHpRbTlrZVR0Y2JseHVJQ0FnSUNBZ1pHOGdlMXh1SUNBZ0lDQWdJQ0JsYkNBOUlHVnNMbkJoY21WdWRFNXZaR1U3WEc1Y2JpQWdJQ0FnSUNBZ2FYTkNiMlI1SUQwZ1pXd2dQVDA5SUdRdVltOWtlVHRjYmlBZ0lDQWdJSDBnZDJocGJHVWdLR2x6UW05a2VTQTlQVDBnWm1Gc2MyVWdKaVlnYVhOVFkzSnZiR3hoWW14bEtHVnNLU0E5UFQwZ1ptRnNjMlVwTzF4dVhHNGdJQ0FnSUNCcGMwSnZaSGtnUFNCdWRXeHNPMXh1WEc0Z0lDQWdJQ0J5WlhSMWNtNGdaV3c3WEc0Z0lDQWdmVnh1WEc0Z0lDQWdMeW9xWEc0Z0lDQWdJQ29nYzJWc1ppQnBiblp2YTJWa0lHWjFibU4wYVc5dUlIUm9ZWFFzSUdkcGRtVnVJR0VnWTI5dWRHVjRkQ3dnYzNSbGNITWdkR2h5YjNWbmFDQnpZM0p2Ykd4cGJtZGNiaUFnSUNBZ0tpQkFiV1YwYUc5a0lITjBaWEJjYmlBZ0lDQWdLaUJBY0dGeVlXMGdlMDlpYW1WamRIMGdZMjl1ZEdWNGRGeHVJQ0FnSUNBcUlFQnlaWFIxY201eklIdDFibVJsWm1sdVpXUjlYRzRnSUNBZ0lDb3ZYRzRnSUNBZ1puVnVZM1JwYjI0Z2MzUmxjQ2hqYjI1MFpYaDBLU0I3WEc0Z0lDQWdJQ0IyWVhJZ2RHbHRaU0E5SUc1dmR5Z3BPMXh1SUNBZ0lDQWdkbUZ5SUhaaGJIVmxPMXh1SUNBZ0lDQWdkbUZ5SUdOMWNuSmxiblJZTzF4dUlDQWdJQ0FnZG1GeUlHTjFjbkpsYm5SWk8xeHVJQ0FnSUNBZ2RtRnlJR1ZzWVhCelpXUWdQU0FvZEdsdFpTQXRJR052Ym5SbGVIUXVjM1JoY25SVWFXMWxLU0F2SUZORFVrOU1URjlVU1UxRk8xeHVYRzRnSUNBZ0lDQXZMeUJoZG05cFpDQmxiR0Z3YzJWa0lIUnBiV1Z6SUdocFoyaGxjaUIwYUdGdUlHOXVaVnh1SUNBZ0lDQWdaV3hoY0hObFpDQTlJR1ZzWVhCelpXUWdQaUF4SUQ4Z01TQTZJR1ZzWVhCelpXUTdYRzVjYmlBZ0lDQWdJQzh2SUdGd2NHeDVJR1ZoYzJsdVp5QjBieUJsYkdGd2MyVmtJSFJwYldWY2JpQWdJQ0FnSUhaaGJIVmxJRDBnWldGelpTaGxiR0Z3YzJWa0tUdGNibHh1SUNBZ0lDQWdZM1Z5Y21WdWRGZ2dQU0JqYjI1MFpYaDBMbk4wWVhKMFdDQXJJQ2hqYjI1MFpYaDBMbmdnTFNCamIyNTBaWGgwTG5OMFlYSjBXQ2tnS2lCMllXeDFaVHRjYmlBZ0lDQWdJR04xY25KbGJuUlpJRDBnWTI5dWRHVjRkQzV6ZEdGeWRGa2dLeUFvWTI5dWRHVjRkQzU1SUMwZ1kyOXVkR1Y0ZEM1emRHRnlkRmtwSUNvZ2RtRnNkV1U3WEc1Y2JpQWdJQ0FnSUdOdmJuUmxlSFF1YldWMGFHOWtMbU5oYkd3b1kyOXVkR1Y0ZEM1elkzSnZiR3hoWW14bExDQmpkWEp5Wlc1MFdDd2dZM1Z5Y21WdWRGa3BPMXh1WEc0Z0lDQWdJQ0F2THlCelkzSnZiR3dnYlc5eVpTQnBaaUIzWlNCb1lYWmxJRzV2ZENCeVpXRmphR1ZrSUc5MWNpQmtaWE4wYVc1aGRHbHZibHh1SUNBZ0lDQWdhV1lnS0dOMWNuSmxiblJZSUNFOVBTQmpiMjUwWlhoMExuZ2dmSHdnWTNWeWNtVnVkRmtnSVQwOUlHTnZiblJsZUhRdWVTa2dlMXh1SUNBZ0lDQWdJQ0IzTG5KbGNYVmxjM1JCYm1sdFlYUnBiMjVHY21GdFpTaHpkR1Z3TG1KcGJtUW9keXdnWTI5dWRHVjRkQ2twTzF4dUlDQWdJQ0FnZlZ4dUlDQWdJSDFjYmx4dUlDQWdJQzhxS2x4dUlDQWdJQ0FxSUhOamNtOXNiSE1nZDJsdVpHOTNJRzl5SUdWc1pXMWxiblFnZDJsMGFDQmhJSE50YjI5MGFDQmlaV2hoZG1sdmNseHVJQ0FnSUNBcUlFQnRaWFJvYjJRZ2MyMXZiM1JvVTJOeWIyeHNYRzRnSUNBZ0lDb2dRSEJoY21GdElIdFBZbXBsWTNSOFRtOWtaWDBnWld4Y2JpQWdJQ0FnS2lCQWNHRnlZVzBnZTA1MWJXSmxjbjBnZUZ4dUlDQWdJQ0FxSUVCd1lYSmhiU0I3VG5WdFltVnlmU0I1WEc0Z0lDQWdJQ29nUUhKbGRIVnlibk1nZTNWdVpHVm1hVzVsWkgxY2JpQWdJQ0FnS2k5Y2JpQWdJQ0JtZFc1amRHbHZiaUJ6Ylc5dmRHaFRZM0p2Ykd3b1pXd3NJSGdzSUhrcElIdGNiaUFnSUNBZ0lIWmhjaUJ6WTNKdmJHeGhZbXhsTzF4dUlDQWdJQ0FnZG1GeUlITjBZWEowV0R0Y2JpQWdJQ0FnSUhaaGNpQnpkR0Z5ZEZrN1hHNGdJQ0FnSUNCMllYSWdiV1YwYUc5a08xeHVJQ0FnSUNBZ2RtRnlJSE4wWVhKMFZHbHRaU0E5SUc1dmR5Z3BPMXh1WEc0Z0lDQWdJQ0F2THlCa1pXWnBibVVnYzJOeWIyeHNJR052Ym5SbGVIUmNiaUFnSUNBZ0lHbG1JQ2hsYkNBOVBUMGdaQzVpYjJSNUtTQjdYRzRnSUNBZ0lDQWdJSE5qY205c2JHRmliR1VnUFNCM08xeHVJQ0FnSUNBZ0lDQnpkR0Z5ZEZnZ1BTQjNMbk5qY205c2JGZ2dmSHdnZHk1d1lXZGxXRTltWm5ObGREdGNiaUFnSUNBZ0lDQWdjM1JoY25SWklEMGdkeTV6WTNKdmJHeFpJSHg4SUhjdWNHRm5aVmxQWm1aelpYUTdYRzRnSUNBZ0lDQWdJRzFsZEdodlpDQTlJRzl5YVdkcGJtRnNMbk5qY205c2JEdGNiaUFnSUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNBZ0lITmpjbTlzYkdGaWJHVWdQU0JsYkR0Y2JpQWdJQ0FnSUNBZ2MzUmhjblJZSUQwZ1pXd3VjMk55YjJ4c1RHVm1kRHRjYmlBZ0lDQWdJQ0FnYzNSaGNuUlpJRDBnWld3dWMyTnliMnhzVkc5d08xeHVJQ0FnSUNBZ0lDQnRaWFJvYjJRZ1BTQnpZM0p2Ykd4RmJHVnRaVzUwTzF4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNBdkx5QnpZM0p2Ykd3Z2JHOXZjR2x1WnlCdmRtVnlJR0VnWm5KaGJXVmNiaUFnSUNBZ0lITjBaWEFvZTF4dUlDQWdJQ0FnSUNCelkzSnZiR3hoWW14bE9pQnpZM0p2Ykd4aFlteGxMRnh1SUNBZ0lDQWdJQ0J0WlhSb2IyUTZJRzFsZEdodlpDeGNiaUFnSUNBZ0lDQWdjM1JoY25SVWFXMWxPaUJ6ZEdGeWRGUnBiV1VzWEc0Z0lDQWdJQ0FnSUhOMFlYSjBXRG9nYzNSaGNuUllMRnh1SUNBZ0lDQWdJQ0J6ZEdGeWRGazZJSE4wWVhKMFdTeGNiaUFnSUNBZ0lDQWdlRG9nZUN4Y2JpQWdJQ0FnSUNBZ2VUb2dlVnh1SUNBZ0lDQWdmU2s3WEc0Z0lDQWdmVnh1WEc0Z0lDQWdMeThnVDFKSlIwbE9RVXdnVFVWVVNFOUVVeUJQVmtWU1VrbEVSVk5jYmlBZ0lDQXZMeUIzTG5OamNtOXNiQ0JoYm1RZ2R5NXpZM0p2Ykd4VWIxeHVJQ0FnSUhjdWMyTnliMnhzSUQwZ2R5NXpZM0p2Ykd4VWJ5QTlJR1oxYm1OMGFXOXVLQ2tnZTF4dUlDQWdJQ0FnTHk4Z1lYWnZhV1FnWVdOMGFXOXVJSGRvWlc0Z2JtOGdZWEpuZFcxbGJuUnpJR0Z5WlNCd1lYTnpaV1JjYmlBZ0lDQWdJR2xtSUNoaGNtZDFiV1Z1ZEhOYk1GMGdQVDA5SUhWdVpHVm1hVzVsWkNrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200N1hHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lDOHZJR0YyYjJsa0lITnRiMjkwYUNCaVpXaGhkbWx2Y2lCcFppQnViM1FnY21WeGRXbHlaV1JjYmlBZ0lDQWdJR2xtSUNoemFHOTFiR1JDWVdsc1QzVjBLR0Z5WjNWdFpXNTBjMXN3WFNrZ1BUMDlJSFJ5ZFdVcElIdGNiaUFnSUNBZ0lDQWdiM0pwWjJsdVlXd3VjMk55YjJ4c0xtTmhiR3dvWEc0Z0lDQWdJQ0FnSUNBZ2R5eGNiaUFnSUNBZ0lDQWdJQ0JoY21kMWJXVnVkSE5iTUYwdWJHVm1kQ0FoUFQwZ2RXNWtaV1pwYm1Wa1hHNGdJQ0FnSUNBZ0lDQWdJQ0EvSUdGeVozVnRaVzUwYzFzd1hTNXNaV1owWEc0Z0lDQWdJQ0FnSUNBZ0lDQTZJSFI1Y0dWdlppQmhjbWQxYldWdWRITmJNRjBnSVQwOUlDZHZZbXBsWTNRblhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUQ4Z1lYSm5kVzFsYm5Seld6QmRYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lEb2dkeTV6WTNKdmJHeFlJSHg4SUhjdWNHRm5aVmhQWm1aelpYUXNYRzRnSUNBZ0lDQWdJQ0FnTHk4Z2RYTmxJSFJ2Y0NCd2NtOXdMQ0J6WldOdmJtUWdZWEpuZFcxbGJuUWdhV1lnY0hKbGMyVnVkQ0J2Y2lCbVlXeHNZbUZqYXlCMGJ5QnpZM0p2Ykd4WlhHNGdJQ0FnSUNBZ0lDQWdZWEpuZFcxbGJuUnpXekJkTG5SdmNDQWhQVDBnZFc1a1pXWnBibVZrWEc0Z0lDQWdJQ0FnSUNBZ0lDQS9JR0Z5WjNWdFpXNTBjMXN3WFM1MGIzQmNiaUFnSUNBZ0lDQWdJQ0FnSURvZ1lYSm5kVzFsYm5Seld6RmRJQ0U5UFNCMWJtUmxabWx1WldSY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnUHlCaGNtZDFiV1Z1ZEhOYk1WMWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ09pQjNMbk5qY205c2JGa2dmSHdnZHk1d1lXZGxXVTltWm5ObGRGeHVJQ0FnSUNBZ0lDQXBPMXh1WEc0Z0lDQWdJQ0FnSUhKbGRIVnlianRjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnTHk4Z1RFVlVJRlJJUlNCVFRVOVBWRWhPUlZOVElFSkZSMGxPSVZ4dUlDQWdJQ0FnYzIxdmIzUm9VMk55YjJ4c0xtTmhiR3dvWEc0Z0lDQWdJQ0FnSUhjc1hHNGdJQ0FnSUNBZ0lHUXVZbTlrZVN4Y2JpQWdJQ0FnSUNBZ1lYSm5kVzFsYm5Seld6QmRMbXhsWm5RZ0lUMDlJSFZ1WkdWbWFXNWxaRnh1SUNBZ0lDQWdJQ0FnSUQ4Z2ZuNWhjbWQxYldWdWRITmJNRjB1YkdWbWRGeHVJQ0FnSUNBZ0lDQWdJRG9nZHk1elkzSnZiR3hZSUh4OElIY3VjR0ZuWlZoUFptWnpaWFFzWEc0Z0lDQWdJQ0FnSUdGeVozVnRaVzUwYzFzd1hTNTBiM0FnSVQwOUlIVnVaR1ZtYVc1bFpGeHVJQ0FnSUNBZ0lDQWdJRDhnZm41aGNtZDFiV1Z1ZEhOYk1GMHVkRzl3WEc0Z0lDQWdJQ0FnSUNBZ09pQjNMbk5qY205c2JGa2dmSHdnZHk1d1lXZGxXVTltWm5ObGRGeHVJQ0FnSUNBZ0tUdGNiaUFnSUNCOU8xeHVYRzRnSUNBZ0x5OGdkeTV6WTNKdmJHeENlVnh1SUNBZ0lIY3VjMk55YjJ4c1Fua2dQU0JtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0FnSUM4dklHRjJiMmxrSUdGamRHbHZiaUIzYUdWdUlHNXZJR0Z5WjNWdFpXNTBjeUJoY21VZ2NHRnpjMlZrWEc0Z0lDQWdJQ0JwWmlBb1lYSm5kVzFsYm5Seld6QmRJRDA5UFNCMWJtUmxabWx1WldRcElIdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdU8xeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQXZMeUJoZG05cFpDQnpiVzl2ZEdnZ1ltVm9ZWFpwYjNJZ2FXWWdibTkwSUhKbGNYVnBjbVZrWEc0Z0lDQWdJQ0JwWmlBb2MyaHZkV3hrUW1GcGJFOTFkQ2hoY21kMWJXVnVkSE5iTUYwcEtTQjdYRzRnSUNBZ0lDQWdJRzl5YVdkcGJtRnNMbk5qY205c2JFSjVMbU5oYkd3b1hHNGdJQ0FnSUNBZ0lDQWdkeXhjYmlBZ0lDQWdJQ0FnSUNCaGNtZDFiV1Z1ZEhOYk1GMHViR1ZtZENBaFBUMGdkVzVrWldacGJtVmtYRzRnSUNBZ0lDQWdJQ0FnSUNBL0lHRnlaM1Z0Wlc1MGMxc3dYUzVzWldaMFhHNGdJQ0FnSUNBZ0lDQWdJQ0E2SUhSNWNHVnZaaUJoY21kMWJXVnVkSE5iTUYwZ0lUMDlJQ2R2WW1wbFkzUW5JRDhnWVhKbmRXMWxiblJ6V3pCZElEb2dNQ3hjYmlBZ0lDQWdJQ0FnSUNCaGNtZDFiV1Z1ZEhOYk1GMHVkRzl3SUNFOVBTQjFibVJsWm1sdVpXUmNiaUFnSUNBZ0lDQWdJQ0FnSUQ4Z1lYSm5kVzFsYm5Seld6QmRMblJ2Y0Z4dUlDQWdJQ0FnSUNBZ0lDQWdPaUJoY21kMWJXVnVkSE5iTVYwZ0lUMDlJSFZ1WkdWbWFXNWxaQ0EvSUdGeVozVnRaVzUwYzFzeFhTQTZJREJjYmlBZ0lDQWdJQ0FnS1R0Y2JseHVJQ0FnSUNBZ0lDQnlaWFIxY200N1hHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lDOHZJRXhGVkNCVVNFVWdVMDFQVDFSSVRrVlRVeUJDUlVkSlRpRmNiaUFnSUNBZ0lITnRiMjkwYUZOamNtOXNiQzVqWVd4c0tGeHVJQ0FnSUNBZ0lDQjNMRnh1SUNBZ0lDQWdJQ0JrTG1KdlpIa3NYRzRnSUNBZ0lDQWdJSDUrWVhKbmRXMWxiblJ6V3pCZExteGxablFnS3lBb2R5NXpZM0p2Ykd4WUlIeDhJSGN1Y0dGblpWaFBabVp6WlhRcExGeHVJQ0FnSUNBZ0lDQitmbUZ5WjNWdFpXNTBjMXN3WFM1MGIzQWdLeUFvZHk1elkzSnZiR3haSUh4OElIY3VjR0ZuWlZsUFptWnpaWFFwWEc0Z0lDQWdJQ0FwTzF4dUlDQWdJSDA3WEc1Y2JpQWdJQ0F2THlCRmJHVnRaVzUwTG5CeWIzUnZkSGx3WlM1elkzSnZiR3dnWVc1a0lFVnNaVzFsYm5RdWNISnZkRzkwZVhCbExuTmpjbTlzYkZSdlhHNGdJQ0FnUld4bGJXVnVkQzV3Y205MGIzUjVjR1V1YzJOeWIyeHNJRDBnUld4bGJXVnVkQzV3Y205MGIzUjVjR1V1YzJOeWIyeHNWRzhnUFNCbWRXNWpkR2x2YmlncElIdGNiaUFnSUNBZ0lDOHZJR0YyYjJsa0lHRmpkR2x2YmlCM2FHVnVJRzV2SUdGeVozVnRaVzUwY3lCaGNtVWdjR0Z6YzJWa1hHNGdJQ0FnSUNCcFppQW9ZWEpuZFcxbGJuUnpXekJkSUQwOVBTQjFibVJsWm1sdVpXUXBJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVPMXh1SUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0F2THlCaGRtOXBaQ0J6Ylc5dmRHZ2dZbVZvWVhacGIzSWdhV1lnYm05MElISmxjWFZwY21Wa1hHNGdJQ0FnSUNCcFppQW9jMmh2ZFd4a1FtRnBiRTkxZENoaGNtZDFiV1Z1ZEhOYk1GMHBJRDA5UFNCMGNuVmxLU0I3WEc0Z0lDQWdJQ0FnSUM4dklHbG1JRzl1WlNCdWRXMWlaWElnYVhNZ2NHRnpjMlZrTENCMGFISnZkeUJsY25KdmNpQjBieUJ0WVhSamFDQkdhWEpsWm05NElHbHRjR3hsYldWdWRHRjBhVzl1WEc0Z0lDQWdJQ0FnSUdsbUlDaDBlWEJsYjJZZ1lYSm5kVzFsYm5Seld6QmRJRDA5UFNBbmJuVnRZbVZ5SnlBbUppQmhjbWQxYldWdWRITmJNVjBnUFQwOUlIVnVaR1ZtYVc1bFpDa2dlMXh1SUNBZ0lDQWdJQ0FnSUhSb2NtOTNJRzVsZHlCVGVXNTBZWGhGY25KdmNpZ25WbUZzZFdVZ1kyOTFiR1FnYm05MElHSmxJR052Ym5abGNuUmxaQ2NwTzF4dUlDQWdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lDQWdiM0pwWjJsdVlXd3VaV3hsYldWdWRGTmpjbTlzYkM1allXeHNLRnh1SUNBZ0lDQWdJQ0FnSUhSb2FYTXNYRzRnSUNBZ0lDQWdJQ0FnTHk4Z2RYTmxJR3hsWm5RZ2NISnZjQ3dnWm1seWMzUWdiblZ0WW1WeUlHRnlaM1Z0Wlc1MElHOXlJR1poYkd4aVlXTnJJSFJ2SUhOamNtOXNiRXhsWm5SY2JpQWdJQ0FnSUNBZ0lDQmhjbWQxYldWdWRITmJNRjB1YkdWbWRDQWhQVDBnZFc1a1pXWnBibVZrWEc0Z0lDQWdJQ0FnSUNBZ0lDQS9JSDUrWVhKbmRXMWxiblJ6V3pCZExteGxablJjYmlBZ0lDQWdJQ0FnSUNBZ0lEb2dkSGx3Wlc5bUlHRnlaM1Z0Wlc1MGMxc3dYU0FoUFQwZ0oyOWlhbVZqZENjZ1B5QitmbUZ5WjNWdFpXNTBjMXN3WFNBNklIUm9hWE11YzJOeWIyeHNUR1ZtZEN4Y2JpQWdJQ0FnSUNBZ0lDQXZMeUIxYzJVZ2RHOXdJSEJ5YjNBc0lITmxZMjl1WkNCaGNtZDFiV1Z1ZENCdmNpQm1ZV3hzWW1GamF5QjBieUJ6WTNKdmJHeFViM0JjYmlBZ0lDQWdJQ0FnSUNCaGNtZDFiV1Z1ZEhOYk1GMHVkRzl3SUNFOVBTQjFibVJsWm1sdVpXUmNiaUFnSUNBZ0lDQWdJQ0FnSUQ4Z2ZuNWhjbWQxYldWdWRITmJNRjB1ZEc5d1hHNGdJQ0FnSUNBZ0lDQWdJQ0E2SUdGeVozVnRaVzUwYzFzeFhTQWhQVDBnZFc1a1pXWnBibVZrSUQ4Z2ZuNWhjbWQxYldWdWRITmJNVjBnT2lCMGFHbHpMbk5qY205c2JGUnZjRnh1SUNBZ0lDQWdJQ0FwTzF4dVhHNGdJQ0FnSUNBZ0lISmxkSFZ5Ymp0Y2JpQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ2RtRnlJR3hsWm5RZ1BTQmhjbWQxYldWdWRITmJNRjB1YkdWbWREdGNiaUFnSUNBZ0lIWmhjaUIwYjNBZ1BTQmhjbWQxYldWdWRITmJNRjB1ZEc5d08xeHVYRzRnSUNBZ0lDQXZMeUJNUlZRZ1ZFaEZJRk5OVDA5VVNFNUZVMU1nUWtWSFNVNGhYRzRnSUNBZ0lDQnpiVzl2ZEdoVFkzSnZiR3d1WTJGc2JDaGNiaUFnSUNBZ0lDQWdkR2hwY3l4Y2JpQWdJQ0FnSUNBZ2RHaHBjeXhjYmlBZ0lDQWdJQ0FnZEhsd1pXOW1JR3hsWm5RZ1BUMDlJQ2QxYm1SbFptbHVaV1FuSUQ4Z2RHaHBjeTV6WTNKdmJHeE1aV1owSURvZ2ZuNXNaV1owTEZ4dUlDQWdJQ0FnSUNCMGVYQmxiMllnZEc5d0lEMDlQU0FuZFc1a1pXWnBibVZrSnlBL0lIUm9hWE11YzJOeWIyeHNWRzl3SURvZ2ZuNTBiM0JjYmlBZ0lDQWdJQ2s3WEc0Z0lDQWdmVHRjYmx4dUlDQWdJQzh2SUVWc1pXMWxiblF1Y0hKdmRHOTBlWEJsTG5OamNtOXNiRUo1WEc0Z0lDQWdSV3hsYldWdWRDNXdjbTkwYjNSNWNHVXVjMk55YjJ4c1Fua2dQU0JtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0FnSUM4dklHRjJiMmxrSUdGamRHbHZiaUIzYUdWdUlHNXZJR0Z5WjNWdFpXNTBjeUJoY21VZ2NHRnpjMlZrWEc0Z0lDQWdJQ0JwWmlBb1lYSm5kVzFsYm5Seld6QmRJRDA5UFNCMWJtUmxabWx1WldRcElIdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdU8xeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQXZMeUJoZG05cFpDQnpiVzl2ZEdnZ1ltVm9ZWFpwYjNJZ2FXWWdibTkwSUhKbGNYVnBjbVZrWEc0Z0lDQWdJQ0JwWmlBb2MyaHZkV3hrUW1GcGJFOTFkQ2hoY21kMWJXVnVkSE5iTUYwcElEMDlQU0IwY25WbEtTQjdYRzRnSUNBZ0lDQWdJRzl5YVdkcGJtRnNMbVZzWlcxbGJuUlRZM0p2Ykd3dVkyRnNiQ2hjYmlBZ0lDQWdJQ0FnSUNCMGFHbHpMRnh1SUNBZ0lDQWdJQ0FnSUdGeVozVnRaVzUwYzFzd1hTNXNaV1owSUNFOVBTQjFibVJsWm1sdVpXUmNiaUFnSUNBZ0lDQWdJQ0FnSUQ4Z2ZuNWhjbWQxYldWdWRITmJNRjB1YkdWbWRDQXJJSFJvYVhNdWMyTnliMnhzVEdWbWRGeHVJQ0FnSUNBZ0lDQWdJQ0FnT2lCK2ZtRnlaM1Z0Wlc1MGMxc3dYU0FySUhSb2FYTXVjMk55YjJ4c1RHVm1kQ3hjYmlBZ0lDQWdJQ0FnSUNCaGNtZDFiV1Z1ZEhOYk1GMHVkRzl3SUNFOVBTQjFibVJsWm1sdVpXUmNiaUFnSUNBZ0lDQWdJQ0FnSUQ4Z2ZuNWhjbWQxYldWdWRITmJNRjB1ZEc5d0lDc2dkR2hwY3k1elkzSnZiR3hVYjNCY2JpQWdJQ0FnSUNBZ0lDQWdJRG9nZm41aGNtZDFiV1Z1ZEhOYk1WMGdLeUIwYUdsekxuTmpjbTlzYkZSdmNGeHVJQ0FnSUNBZ0lDQXBPMXh1WEc0Z0lDQWdJQ0FnSUhKbGRIVnlianRjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnZEdocGN5NXpZM0p2Ykd3b2UxeHVJQ0FnSUNBZ0lDQnNaV1owT2lCK2ZtRnlaM1Z0Wlc1MGMxc3dYUzVzWldaMElDc2dkR2hwY3k1elkzSnZiR3hNWldaMExGeHVJQ0FnSUNBZ0lDQjBiM0E2SUg1K1lYSm5kVzFsYm5Seld6QmRMblJ2Y0NBcklIUm9hWE11YzJOeWIyeHNWRzl3TEZ4dUlDQWdJQ0FnSUNCaVpXaGhkbWx2Y2pvZ1lYSm5kVzFsYm5Seld6QmRMbUpsYUdGMmFXOXlYRzRnSUNBZ0lDQjlLVHRjYmlBZ0lDQjlPMXh1WEc0Z0lDQWdMeThnUld4bGJXVnVkQzV3Y205MGIzUjVjR1V1YzJOeWIyeHNTVzUwYjFacFpYZGNiaUFnSUNCRmJHVnRaVzUwTG5CeWIzUnZkSGx3WlM1elkzSnZiR3hKYm5SdlZtbGxkeUE5SUdaMWJtTjBhVzl1S0NrZ2UxeHVJQ0FnSUNBZ0x5OGdZWFp2YVdRZ2MyMXZiM1JvSUdKbGFHRjJhVzl5SUdsbUlHNXZkQ0J5WlhGMWFYSmxaRnh1SUNBZ0lDQWdhV1lnS0hOb2IzVnNaRUpoYVd4UGRYUW9ZWEpuZFcxbGJuUnpXekJkS1NBOVBUMGdkSEoxWlNrZ2UxeHVJQ0FnSUNBZ0lDQnZjbWxuYVc1aGJDNXpZM0p2Ykd4SmJuUnZWbWxsZHk1allXeHNLRnh1SUNBZ0lDQWdJQ0FnSUhSb2FYTXNYRzRnSUNBZ0lDQWdJQ0FnWVhKbmRXMWxiblJ6V3pCZElEMDlQU0IxYm1SbFptbHVaV1FnUHlCMGNuVmxJRG9nWVhKbmRXMWxiblJ6V3pCZFhHNGdJQ0FnSUNBZ0lDazdYRzVjYmlBZ0lDQWdJQ0FnY21WMGRYSnVPMXh1SUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0F2THlCTVJWUWdWRWhGSUZOTlQwOVVTRTVGVTFNZ1FrVkhTVTRoWEc0Z0lDQWdJQ0IyWVhJZ2MyTnliMnhzWVdKc1pWQmhjbVZ1ZENBOUlHWnBibVJUWTNKdmJHeGhZbXhsVUdGeVpXNTBLSFJvYVhNcE8xeHVJQ0FnSUNBZ2RtRnlJSEJoY21WdWRGSmxZM1J6SUQwZ2MyTnliMnhzWVdKc1pWQmhjbVZ1ZEM1blpYUkNiM1Z1WkdsdVowTnNhV1Z1ZEZKbFkzUW9LVHRjYmlBZ0lDQWdJSFpoY2lCamJHbGxiblJTWldOMGN5QTlJSFJvYVhNdVoyVjBRbTkxYm1ScGJtZERiR2xsYm5SU1pXTjBLQ2s3WEc1Y2JpQWdJQ0FnSUdsbUlDaHpZM0p2Ykd4aFlteGxVR0Z5Wlc1MElDRTlQU0JrTG1KdlpIa3BJSHRjYmlBZ0lDQWdJQ0FnTHk4Z2NtVjJaV0ZzSUdWc1pXMWxiblFnYVc1emFXUmxJSEJoY21WdWRGeHVJQ0FnSUNBZ0lDQnpiVzl2ZEdoVFkzSnZiR3d1WTJGc2JDaGNiaUFnSUNBZ0lDQWdJQ0IwYUdsekxGeHVJQ0FnSUNBZ0lDQWdJSE5qY205c2JHRmliR1ZRWVhKbGJuUXNYRzRnSUNBZ0lDQWdJQ0FnYzJOeWIyeHNZV0pzWlZCaGNtVnVkQzV6WTNKdmJHeE1aV1owSUNzZ1kyeHBaVzUwVW1WamRITXViR1ZtZENBdElIQmhjbVZ1ZEZKbFkzUnpMbXhsWm5Rc1hHNGdJQ0FnSUNBZ0lDQWdjMk55YjJ4c1lXSnNaVkJoY21WdWRDNXpZM0p2Ykd4VWIzQWdLeUJqYkdsbGJuUlNaV04wY3k1MGIzQWdMU0J3WVhKbGJuUlNaV04wY3k1MGIzQmNiaUFnSUNBZ0lDQWdLVHRjYmx4dUlDQWdJQ0FnSUNBdkx5QnlaWFpsWVd3Z2NHRnlaVzUwSUdsdUlIWnBaWGR3YjNKMElIVnViR1Z6Y3lCcGN5Qm1hWGhsWkZ4dUlDQWdJQ0FnSUNCcFppQW9keTVuWlhSRGIyMXdkWFJsWkZOMGVXeGxLSE5qY205c2JHRmliR1ZRWVhKbGJuUXBMbkJ2YzJsMGFXOXVJQ0U5UFNBblptbDRaV1FuS1NCN1hHNGdJQ0FnSUNBZ0lDQWdkeTV6WTNKdmJHeENlU2g3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnNaV1owT2lCd1lYSmxiblJTWldOMGN5NXNaV1owTEZ4dUlDQWdJQ0FnSUNBZ0lDQWdkRzl3T2lCd1lYSmxiblJTWldOMGN5NTBiM0FzWEc0Z0lDQWdJQ0FnSUNBZ0lDQmlaV2hoZG1sdmNqb2dKM050YjI5MGFDZGNiaUFnSUNBZ0lDQWdJQ0I5S1R0Y2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ0x5OGdjbVYyWldGc0lHVnNaVzFsYm5RZ2FXNGdkbWxsZDNCdmNuUmNiaUFnSUNBZ0lDQWdkeTV6WTNKdmJHeENlU2g3WEc0Z0lDQWdJQ0FnSUNBZ2JHVm1kRG9nWTJ4cFpXNTBVbVZqZEhNdWJHVm1kQ3hjYmlBZ0lDQWdJQ0FnSUNCMGIzQTZJR05zYVdWdWRGSmxZM1J6TG5SdmNDeGNiaUFnSUNBZ0lDQWdJQ0JpWldoaGRtbHZjam9nSjNOdGIyOTBhQ2RjYmlBZ0lDQWdJQ0FnZlNrN1hHNGdJQ0FnSUNCOVhHNGdJQ0FnZlR0Y2JpQWdmVnh1WEc0Z0lHbG1JQ2gwZVhCbGIyWWdaWGh3YjNKMGN5QTlQVDBnSjI5aWFtVmpkQ2NnSmlZZ2RIbHdaVzltSUcxdlpIVnNaU0FoUFQwZ0ozVnVaR1ZtYVc1bFpDY3BJSHRjYmlBZ0lDQXZMeUJqYjIxdGIyNXFjMXh1SUNBZ0lHMXZaSFZzWlM1bGVIQnZjblJ6SUQwZ2V5QndiMng1Wm1sc2JEb2djRzlzZVdacGJHd2dmVHRjYmlBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0F2THlCbmJHOWlZV3hjYmlBZ0lDQndiMng1Wm1sc2JDZ3BPMXh1SUNCOVhHNWNibjBvS1NrN1hHNGlMQ0pqYjI1emRDQkVRaUE5SUNkb2RIUndjem92TDI1bGVIVnpMV05oZEdGc2IyY3VabWx5WldKaGMyVnBieTVqYjIwdmNHOXpkSE11YW5OdmJqOWhkWFJvUFRkbk4zQjVTMHQ1YTA0elRqVmxkM0pKYldoUFlWTTJkbmR5Um5Oak5XWkxhM0pyT0dWcWVtWW5PMXh1WEc1amIyNXpkQ0FrYkc5aFpHbHVaeUE5SUVGeWNtRjVMbVp5YjIwb1pHOWpkVzFsYm5RdWNYVmxjbmxUWld4bFkzUnZja0ZzYkNnbkxteHZZV1JwYm1jbktTazdYRzVqYjI1emRDQWtZWEowYVdOc1pVeHBjM1FnUFNCa2IyTjFiV1Z1ZEM1blpYUkZiR1Z0Wlc1MFFubEpaQ2duYW5NdGJHbHpkQ2NwTzF4dVkyOXVjM1FnSkc1aGRpQTlJR1J2WTNWdFpXNTBMbWRsZEVWc1pXMWxiblJDZVVsa0tDZHFjeTF1WVhZbktUdGNibU52Ym5OMElDUndZWEpoYkd4aGVDQTlJR1J2WTNWdFpXNTBMbkYxWlhKNVUyVnNaV04wYjNJb0p5NXdZWEpoYkd4aGVDY3BPMXh1WTI5dWMzUWdKR052Ym5SbGJuUWdQU0JrYjJOMWJXVnVkQzV4ZFdWeWVWTmxiR1ZqZEc5eUtDY3VZMjl1ZEdWdWRDY3BPMXh1WTI5dWMzUWdKSFJwZEd4bElEMGdaRzlqZFcxbGJuUXVaMlYwUld4bGJXVnVkRUo1U1dRb0oycHpMWFJwZEd4bEp5azdYRzVqYjI1emRDQWtkWEJCY25KdmR5QTlJR1J2WTNWdFpXNTBMbWRsZEVWc1pXMWxiblJDZVVsa0tDZHFjeTFoY25KdmR5Y3BPMXh1WTI5dWMzUWdKRzF2WkdGc0lEMGdaRzlqZFcxbGJuUXVjWFZsY25sVFpXeGxZM1J2Y2lnbkxtMXZaR0ZzSnlrN1hHNWpiMjV6ZENBa2JHbG5hSFJpYjNnZ1BTQmtiMk4xYldWdWRDNXhkV1Z5ZVZObGJHVmpkRzl5S0NjdWJHbG5hSFJpYjNnbktUdGNibU52Ym5OMElDUjJhV1YzSUQwZ1pHOWpkVzFsYm5RdWNYVmxjbmxUWld4bFkzUnZjaWduTG14cFoyaDBZbTk0TFhacFpYY25LVHRjYm1OdmJuTjBJSE52Y25SSlpITWdQU0JiSjJGeWRHbHpkQ2NzSUNkMGFYUnNaU2RkTzF4dVhHNWxlSEJ2Y25RZ2V5QmNibHgwUkVJc1hHNWNkQ1JzYjJGa2FXNW5MRnh1WEhRa1lYSjBhV05zWlV4cGMzUXNJRnh1WEhRa2JtRjJMQ0JjYmx4MEpIQmhjbUZzYkdGNExGeHVYSFFrWTI5dWRHVnVkQ3hjYmx4MEpIUnBkR3hsTEZ4dVhIUWtkWEJCY25KdmR5eGNibHgwSkcxdlpHRnNMRnh1WEhRa2JHbG5hSFJpYjNnc1hHNWNkQ1IyYVdWM0xGeHVYSFJ6YjNKMFNXUnpYRzU5T3lJc0ltbHRjRzl5ZENCemJXOXZkR2h6WTNKdmJHd2dabkp2YlNBbmMyMXZiM1JvYzJOeWIyeHNMWEJ2YkhsbWFXeHNKenRjYmx4dWFXMXdiM0owSUhzZ1lYSjBhV05zWlZSbGJYQnNZWFJsTENCeVpXNWtaWEpPWVhaTVp5QjlJR1p5YjIwZ0p5NHZkR1Z0Y0d4aGRHVnpKenRjYm1sdGNHOXlkQ0I3SUdSbFltOTFibU5sTENCb2FXUmxURzloWkdsdVp5d2djMk55YjJ4c1ZHOVViM0FnZlNCbWNtOXRJQ2N1TDNWMGFXeHpKenRjYm1sdGNHOXlkQ0I3SUVSQ0xDQWtZWEowYVdOc1pVeHBjM1FzSUhOdmNuUkpaSE1nZlNCbWNtOXRJQ2N1TDJOdmJuTjBZVzUwY3ljN1hHNXBiWEJ2Y25RZ2V5QmhkSFJoWTJoTmIyUmhiRXhwYzNSbGJtVnljeXdnWVhSMFlXTm9WWEJCY25KdmQweHBjM1JsYm1WeWN5d2dZWFIwWVdOb1NXMWhaMlZNYVhOMFpXNWxjbk1zSUcxaGEyVkJiSEJvWVdKbGRDd2diV0ZyWlZOc2FXUmxjaUI5SUdaeWIyMGdKeTR2Ylc5a2RXeGxjeWM3WEc1Y2JteGxkQ0J6YjNKMFMyVjVJRDBnTURzZ0x5OGdNQ0E5SUdGeWRHbHpkQ3dnTVNBOUlIUnBkR3hsWEc1c1pYUWdaVzUwY21sbGN5QTlJSHNnWW5sQmRYUm9iM0k2SUZ0ZExDQmllVlJwZEd4bE9pQmJYU0I5TzF4dVhHNWpiMjV6ZENCelpYUlZjRk52Y25SQ2RYUjBiMjV6SUQwZ0tDa2dQVDRnZTF4dVhIUnpiM0owU1dSekxtWnZja1ZoWTJnb2FXUWdQVDRnZTF4dVhIUmNkR052Ym5OMElHRnNkQ0E5SUdsa0lEMDlQU0FuWVhKMGFYTjBKeUEvSUNkMGFYUnNaU2NnT2lBbllYSjBhWE4wSnp0Y2JseHVYSFJjZEdOdmJuTjBJQ1JpZFhSMGIyNGdQU0JrYjJOMWJXVnVkQzVuWlhSRmJHVnRaVzUwUW5sSlpDaGdhbk10WW5rdEpIdHBaSDFnS1R0Y2JseDBYSFJqYjI1emRDQWtZV3gwUW5WMGRHOXVJRDBnWkc5amRXMWxiblF1WjJWMFJXeGxiV1Z1ZEVKNVNXUW9ZR3B6TFdKNUxTUjdZV3gwZldBcE8xeHVYRzVjZEZ4MEpHSjFkSFJ2Ymk1aFpHUkZkbVZ1ZEV4cGMzUmxibVZ5S0NkamJHbGpheWNzSUNncElEMCtJSHRjYmx4MFhIUmNkSE5qY205c2JGUnZWRzl3S0NrN1hHNWNkRngwWEhSemIzSjBTMlY1SUQwZ0lYTnZjblJMWlhrN1hHNWNkRngwWEhSeVpXNWtaWEpGYm5SeWFXVnpLQ2s3WEc1Y2JseDBYSFJjZENSaWRYUjBiMjR1WTJ4aGMzTk1hWE4wTG1Ga1pDZ25ZV04wYVhabEp5azdYRzVjZEZ4MFhIUWtZV3gwUW5WMGRHOXVMbU5zWVhOelRHbHpkQzV5WlcxdmRtVW9KMkZqZEdsMlpTY3BPMXh1WEhSY2RIMHBYRzVjZEgwcE8xeHVmVHRjYmx4dVkyOXVjM1FnY21WdVpHVnlSVzUwY21sbGN5QTlJQ2dwSUQwK0lIdGNibHgwWTI5dWMzUWdaVzUwY21sbGMweHBjM1FnUFNCemIzSjBTMlY1SUQ4Z1pXNTBjbWxsY3k1aWVWUnBkR3hsSURvZ1pXNTBjbWxsY3k1aWVVRjFkR2h2Y2p0Y2JseHVYSFFrWVhKMGFXTnNaVXhwYzNRdWFXNXVaWEpJVkUxTUlEMGdKeWM3WEc1Y2JseDBaVzUwY21sbGMweHBjM1F1Wm05eVJXRmphQ2dvWlc1MGNua3NJR2twSUQwK0lIdGNibHgwWEhRa1lYSjBhV05zWlV4cGMzUXVhVzV6WlhKMFFXUnFZV05sYm5SSVZFMU1LQ2RpWldadmNtVmxibVFuTENCaGNuUnBZMnhsVkdWdGNHeGhkR1VvWlc1MGNua3NJR2twS1R0Y2JseDBYSFJ0WVd0bFUyeHBaR1Z5S0dSdlkzVnRaVzUwTG1kbGRFVnNaVzFsYm5SQ2VVbGtLR0J6Ykdsa1pYSXRKSHRwZldBcEtUdGNibHgwZlNrN1hHNWNibHgwWVhSMFlXTm9TVzFoWjJWTWFYTjBaVzVsY25Nb0tUdGNibHgwYldGclpVRnNjR2hoWW1WMEtITnZjblJMWlhrcE8xeHVmVHRjYmx4dVkyOXVjM1FnYzJWMFJHRjBZVUZ1WkZOdmNuUkNlVlJwZEd4bElEMGdLR1JoZEdFcElEMCtJSHRjYmx4MFpXNTBjbWxsY3k1aWVVRjFkR2h2Y2lBOUlHUmhkR0U3WEc1Y2RHVnVkSEpwWlhNdVlubFVhWFJzWlNBOUlHUmhkR0V1YzJ4cFkyVW9LVHNnTHk4Z1kyOXdhV1Z6SUdSaGRHRWdabTl5SUdKNVZHbDBiR1VnYzI5eWRGeHVYRzVjZEdWdWRISnBaWE11WW5sVWFYUnNaUzV6YjNKMEtDaGhMQ0JpS1NBOVBpQjdYRzVjZEZ4MGJHVjBJR0ZVYVhSc1pTQTlJR0V1ZEdsMGJHVmJNRjB1ZEc5VmNIQmxja05oYzJVb0tUdGNibHgwWEhSc1pYUWdZbFJwZEd4bElEMGdZaTUwYVhSc1pWc3dYUzUwYjFWd2NHVnlRMkZ6WlNncE8xeHVYSFJjZEdsbUlDaGhWR2wwYkdVZ1BpQmlWR2wwYkdVcElISmxkSFZ5YmlBeE8xeHVYSFJjZEdWc2MyVWdhV1lnS0dGVWFYUnNaU0E4SUdKVWFYUnNaU2tnY21WMGRYSnVJQzB4TzF4dVhIUmNkR1ZzYzJVZ2NtVjBkWEp1SURBN1hHNWNkSDBwTzF4dWZUdGNibHh1WTI5dWMzUWdabVYwWTJoRVlYUmhJRDBnS0NrZ1BUNGdlMXh1WEhSbVpYUmphQ2hFUWlrdWRHaGxiaWh5WlhNZ1BUNGdjbVZ6TG1wemIyNG9LU2xjYmx4MExuUm9aVzRvWkdGMFlTQTlQaUI3WEc1Y2RGeDBjMlYwUkdGMFlVRnVaRk52Y25SQ2VWUnBkR3hsS0dSaGRHRXBPMXh1WEhSY2RISmxibVJsY2tWdWRISnBaWE1vS1R0Y2JseDBYSFJvYVdSbFRHOWhaR2x1WnlncE8xeHVYSFI5S1Z4dVhIUXVZMkYwWTJnb1pYSnlJRDArSUdOdmJuTnZiR1V1ZDJGeWJpaGxjbklwS1R0Y2JuMDdYRzVjYm1OdmJuTjBJR2x1YVhRZ1BTQW9LU0E5UGlCN1hHNWNkSE50YjI5MGFITmpjbTlzYkM1d2IyeDVabWxzYkNncE8xeHVYSFJtWlhSamFFUmhkR0VvS1R0Y2JseDBjbVZ1WkdWeVRtRjJUR2NvS1R0Y2JseDBjMlYwVlhCVGIzSjBRblYwZEc5dWN5Z3BPMXh1WEhSaGRIUmhZMmhWY0VGeWNtOTNUR2x6ZEdWdVpYSnpLQ2s3WEc1Y2RHRjBkR0ZqYUUxdlpHRnNUR2x6ZEdWdVpYSnpLQ2s3WEc1OU8xeHVYRzVwYm1sMEtDazdYRzRpTENKcGJYQnZjblFnZXlBa2RtbGxkeXdnSkd4cFoyaDBZbTk0SUgwZ1puSnZiU0FuTGk0dlkyOXVjM1JoYm5Sekp6dGNibHh1YkdWMElHeHBaMmgwWW05NElEMGdabUZzYzJVN1hHNXNaWFFnZURJZ1BTQm1ZV3h6WlR0Y2JteGxkQ0IyYVdWM1EyeGhjM003WEc1Y2JtTnZibk4wSUdGMGRHRmphRWx0WVdkbFRHbHpkR1Z1WlhKeklEMGdLQ2tnUFQ0Z2UxeHVYSFJqYjI1emRDQWthVzFoWjJWeklEMGdRWEp5WVhrdVpuSnZiU2hrYjJOMWJXVnVkQzV4ZFdWeWVWTmxiR1ZqZEc5eVFXeHNLQ2N1WVhKMGFXTnNaUzFwYldGblpTY3BLVHRjYmx4dVhIUWthVzFoWjJWekxtWnZja1ZoWTJnb2FXMW5JRDArSUh0Y2JseDBYSFJwYldjdVlXUmtSWFpsYm5STWFYTjBaVzVsY2lnblkyeHBZMnNuTENBb1pYWjBLU0E5UGlCN1hHNWNkRngwWEhScFppQW9JV3hwWjJoMFltOTRLU0I3WEc1Y2RGeDBYSFJjZENSc2FXZG9kR0p2ZUM1amJHRnpjMHhwYzNRdVlXUmtLQ2R6YUc5M0xXbHRaeWNwTzF4dVhIUmNkRngwWEhRa2RtbGxkeTV6Y21NZ1BTQnBiV2N1YzNKak8xeHVYSFJjZEZ4MFhIUnNhV2RvZEdKdmVDQTlJSFJ5ZFdVN1hHNWNkRngwWEhSOVhHNWNkRngwZlNrN1hHNWNkSDBwTzF4dVhHNWNkQ1JzYVdkb2RHSnZlQzVoWkdSRmRtVnVkRXhwYzNSbGJtVnlLQ2RqYkdsamF5Y3NJQ2hsZG5RcElEMCtJSHRjYmx4MFhIUnBaaUFvWlhaMExuUmhjbWRsZENBOVBUMGdKSFpwWlhjcElISmxkSFZ5Ymp0Y2JseDBYSFFrYkdsbmFIUmliM2d1WTJ4aGMzTk1hWE4wTG5KbGJXOTJaU2duYzJodmR5MXBiV2NuS1R0Y2JseDBYSFJzYVdkb2RHSnZlQ0E5SUdaaGJITmxPMXh1WEhSOUtUdGNibHh1WEhRa2RtbGxkeTVoWkdSRmRtVnVkRXhwYzNSbGJtVnlLQ2RqYkdsamF5Y3NJQ2dwSUQwK0lIdGNibHgwWEhScFppQW9JWGd5S1NCN1hHNWNkRngwWEhSMmFXVjNRMnhoYzNNZ1BTQWtkbWxsZHk1M2FXUjBhQ0E4SUhkcGJtUnZkeTVwYm01bGNsZHBaSFJvSUQ4Z0ozWnBaWGN0ZURJdExYTnRKeUE2SUNkMmFXVjNMWGd5Snp0Y2JseDBYSFJjZENSMmFXVjNMbU5zWVhOelRHbHpkQzVoWkdRb2RtbGxkME5zWVhOektUdGNibHgwWEhSY2RITmxkRlJwYldWdmRYUW9LQ2tnUFQ0Z2VESWdQU0IwY25WbExDQXpNREFwTzF4dVhIUmNkSDBnWld4elpTQjdYRzVjZEZ4MFhIUWtkbWxsZHk1amJHRnpjMHhwYzNRdWNtVnRiM1psS0hacFpYZERiR0Z6Y3lrN1hHNWNkRngwWEhRa2JHbG5hSFJpYjNndVkyeGhjM05NYVhOMExuSmxiVzkyWlNnbmMyaHZkeTFwYldjbktUdGNibHgwWEhSY2RIZ3lJRDBnWm1Gc2MyVTdYRzVjZEZ4MFhIUnNhV2RvZEdKdmVDQTlJR1poYkhObE8xeHVYSFJjZEgxY2JseDBmU2s3WEc1OU8xeHVYRzVsZUhCdmNuUWdaR1ZtWVhWc2RDQmhkSFJoWTJoSmJXRm5aVXhwYzNSbGJtVnljenNpTENKcGJYQnZjblFnZXlBa2JXOWtZV3dnZlNCbWNtOXRJQ2N1TGk5amIyNXpkR0Z1ZEhNbk8xeHVYRzVzWlhRZ2JXOWtZV3dnUFNCbVlXeHpaVHRjYm1OdmJuTjBJR0YwZEdGamFFMXZaR0ZzVEdsemRHVnVaWEp6SUQwZ0tDa2dQVDRnZTF4dVhIUmpiMjV6ZENBa1ptbHVaQ0E5SUdSdlkzVnRaVzUwTG1kbGRFVnNaVzFsYm5SQ2VVbGtLQ2RxY3kxbWFXNWtKeWs3WEc1Y2RGeHVYSFFrWm1sdVpDNWhaR1JGZG1WdWRFeHBjM1JsYm1WeUtDZGpiR2xqYXljc0lDZ3BJRDArSUh0Y2JseDBYSFFrYlc5a1lXd3VZMnhoYzNOTWFYTjBMbUZrWkNnbmMyaHZkeWNwTzF4dVhIUmNkRzF2WkdGc0lEMGdkSEoxWlR0Y2JseDBmU2s3WEc1Y2JseDBKRzF2WkdGc0xtRmtaRVYyWlc1MFRHbHpkR1Z1WlhJb0oyTnNhV05ySnl3Z0tDa2dQVDRnZTF4dVhIUmNkQ1J0YjJSaGJDNWpiR0Z6YzB4cGMzUXVjbVZ0YjNabEtDZHphRzkzSnlrN1hHNWNkRngwYlc5a1lXd2dQU0JtWVd4elpUdGNibHgwZlNrN1hHNWNibHgwZDJsdVpHOTNMbUZrWkVWMlpXNTBUR2x6ZEdWdVpYSW9KMnRsZVdSdmQyNG5MQ0FvS1NBOVBpQjdYRzVjZEZ4MGFXWWdLRzF2WkdGc0tTQjdYRzVjZEZ4MFhIUnpaWFJVYVcxbGIzVjBLQ2dwSUQwK0lIdGNibHgwWEhSY2RGeDBKRzF2WkdGc0xtTnNZWE56VEdsemRDNXlaVzF2ZG1Vb0ozTm9iM2NuS1R0Y2JseDBYSFJjZEZ4MGJXOWtZV3dnUFNCbVlXeHpaVHRjYmx4MFhIUmNkSDBzSURZd01DazdYRzVjZEZ4MGZUdGNibHgwZlNrN1hHNTlPMXh1WEc1bGVIQnZjblFnWkdWbVlYVnNkQ0JoZEhSaFkyaE5iMlJoYkV4cGMzUmxibVZ5Y3pzaUxDSnBiWEJ2Y25RZ2V5QWtkR2wwYkdVc0lDUndZWEpoYkd4aGVDd2dKSFZ3UVhKeWIzY2dmU0JtY205dElDY3VMaTlqYjI1emRHRnVkSE1uTzF4dWFXMXdiM0owSUhzZ2MyTnliMnhzVkc5VWIzQWdmU0JtY205dElDY3VMaTkxZEdsc2N5YzdYRzVjYm14bGRDQndjbVYyTzF4dWJHVjBJR04xY25KbGJuUWdQU0F3TzF4dWJHVjBJR2x6VTJodmQybHVaeUE5SUdaaGJITmxPMXh1WEc1amIyNXpkQ0JoZEhSaFkyaFZjRUZ5Y205M1RHbHpkR1Z1WlhKeklEMGdLQ2tnUFQ0Z2UxeHVYSFFrY0dGeVlXeHNZWGd1WVdSa1JYWmxiblJNYVhOMFpXNWxjaWduYzJOeWIyeHNKeXdnS0NrZ1BUNGdlMXh1WEhSY2RHeGxkQ0I1SUQwZ0pIUnBkR3hsTG1kbGRFSnZkVzVrYVc1blEyeHBaVzUwVW1WamRDZ3BMbms3WEc1Y2JseDBYSFJwWmlBb1kzVnljbVZ1ZENBaFBUMGdlU2tnZTF4dVhIUmNkRngwY0hKbGRpQTlJR04xY25KbGJuUTdYRzVjZEZ4MFhIUmpkWEp5Wlc1MElEMGdlVHRjYmx4MFhIUjlPMXh1WEc1Y2RGeDBhV1lnS0hrZ1BEMGdMVFV3SUNZbUlDRnBjMU5vYjNkcGJtY3BJSHRjYmx4MFhIUmNkQ1IxY0VGeWNtOTNMbU5zWVhOelRHbHpkQzVoWkdRb0ozTm9iM2NuS1R0Y2JseDBYSFJjZEdselUyaHZkMmx1WnlBOUlIUnlkV1U3WEc1Y2RGeDBmU0JsYkhObElHbG1JQ2g1SUQ0Z0xUVXdJQ1ltSUdselUyaHZkMmx1WnlrZ2UxeHVYSFJjZEZ4MEpIVndRWEp5YjNjdVkyeGhjM05NYVhOMExuSmxiVzkyWlNnbmMyaHZkeWNwTzF4dVhIUmNkRngwYVhOVGFHOTNhVzVuSUQwZ1ptRnNjMlU3WEc1Y2RGeDBmVnh1WEhSOUtUdGNibHh1WEhRa2RYQkJjbkp2ZHk1aFpHUkZkbVZ1ZEV4cGMzUmxibVZ5S0NkamJHbGpheWNzSUNncElEMCtJSE5qY205c2JGUnZWRzl3S0NrcE8xeHVmVHRjYmx4dVpYaHdiM0owSUdSbFptRjFiSFFnWVhSMFlXTm9WWEJCY25KdmQweHBjM1JsYm1WeWN6c2lMQ0pwYlhCdmNuUWdZWFIwWVdOb1RXOWtZV3hNYVhOMFpXNWxjbk1nWm5KdmJTQW5MaTloZEhSaFkyaE5iMlJoYkV4cGMzUmxibVZ5Y3ljN1hHNXBiWEJ2Y25RZ1lYUjBZV05vVlhCQmNuSnZkMHhwYzNSbGJtVnljeUJtY205dElDY3VMMkYwZEdGamFGVndRWEp5YjNkTWFYTjBaVzVsY25Nbk8xeHVhVzF3YjNKMElHRjBkR0ZqYUVsdFlXZGxUR2x6ZEdWdVpYSnpJR1p5YjIwZ0p5NHZZWFIwWVdOb1NXMWhaMlZNYVhOMFpXNWxjbk1uTzF4dWFXMXdiM0owSUcxaGEyVkJiSEJvWVdKbGRDQm1jbTl0SUNjdUwyMWhhMlZCYkhCb1lXSmxkQ2M3WEc1cGJYQnZjblFnYldGclpWTnNhV1JsY2lCbWNtOXRJQ2N1TDIxaGEyVlRiR2xrWlhJbk8xeHVYRzVsZUhCdmNuUWdleUJjYmx4MFlYUjBZV05vVFc5a1lXeE1hWE4wWlc1bGNuTXNJRnh1WEhSaGRIUmhZMmhWY0VGeWNtOTNUR2x6ZEdWdVpYSnpMRnh1WEhSaGRIUmhZMmhKYldGblpVeHBjM1JsYm1WeWN5eGNibHgwYldGclpVRnNjR2hoWW1WMExDQmNibHgwYldGclpWTnNhV1JsY2lCY2JuMDdJaXdpWTI5dWMzUWdZV3h3YUdGaVpYUWdQU0JiSjJFbkxDQW5ZaWNzSUNkakp5d2dKMlFuTENBblpTY3NJQ2RtSnl3Z0oyY25MQ0FuYUNjc0lDZHBKeXdnSjJvbkxDQW5heWNzSUNkc0p5d2dKMjBuTENBbmJpY3NJQ2R2Snl3Z0ozQW5MQ0FuY2ljc0lDZHpKeXdnSjNRbkxDQW5kU2NzSUNkMkp5d2dKM2NuTENBbmVTY3NJQ2Q2SjEwN1hHNWNibU52Ym5OMElHMWhhMlZCYkhCb1lXSmxkQ0E5SUNoemIzSjBTMlY1S1NBOVBpQjdYRzVjZEdOdmJuTjBJR1pwYm1SR2FYSnpkRVZ1ZEhKNUlEMGdLR05vWVhJcElEMCtJSHRjYmx4MFhIUmpiMjV6ZENCelpXeGxZM1J2Y2lBOUlITnZjblJMWlhrZ1B5QW5MbXB6TFdWdWRISjVMWFJwZEd4bEp5QTZJQ2N1YW5NdFpXNTBjbmt0WVhKMGFYTjBKenRjYmx4MFhIUmpiMjV6ZENCd2NtVjJVMlZzWldOMGIzSWdQU0FoYzI5eWRFdGxlU0EvSUNjdWFuTXRaVzUwY25rdGRHbDBiR1VuSURvZ0p5NXFjeTFsYm5SeWVTMWhjblJwYzNRbk8xeHVYRzVjZEZ4MFkyOXVjM1FnSkdWdWRISnBaWE1nUFNCQmNuSmhlUzVtY205dEtHUnZZM1Z0Wlc1MExuRjFaWEo1VTJWc1pXTjBiM0pCYkd3b2MyVnNaV04wYjNJcEtUdGNibHgwWEhSamIyNXpkQ0FrY0hKbGRrVnVkSEpwWlhNZ1BTQkJjbkpoZVM1bWNtOXRLR1J2WTNWdFpXNTBMbkYxWlhKNVUyVnNaV04wYjNKQmJHd29jSEpsZGxObGJHVmpkRzl5S1NrN1hHNWNibHgwWEhRa2NISmxka1Z1ZEhKcFpYTXVabTl5UldGamFDaGxiblJ5ZVNBOVBpQmxiblJ5ZVM1eVpXMXZkbVZCZEhSeWFXSjFkR1VvSjI1aGJXVW5LU2s3WEc1Y2JseDBYSFJ5WlhSMWNtNGdKR1Z1ZEhKcFpYTXVabWx1WkNobGJuUnllU0E5UGlCN1hHNWNkRngwWEhSc1pYUWdibTlrWlNBOUlHVnVkSEo1TG01bGVIUkZiR1Z0Wlc1MFUybGliR2x1Wnp0Y2JseDBYSFJjZEhKbGRIVnliaUJ1YjJSbExtbHVibVZ5U0ZSTlRGc3dYU0E5UFQwZ1kyaGhjaUI4ZkNCdWIyUmxMbWx1Ym1WeVNGUk5URnN3WFNBOVBUMGdZMmhoY2k1MGIxVndjR1Z5UTJGelpTZ3BPMXh1WEhSY2RIMHBPMXh1WEhSOU8xeHVYRzVjZEdOdmJuTjBJR0YwZEdGamFFRnVZMmh2Y2t4cGMzUmxibVZ5SUQwZ0tDUmhibU5vYjNJc0lHeGxkSFJsY2lrZ1BUNGdlMXh1WEhSY2RDUmhibU5vYjNJdVlXUmtSWFpsYm5STWFYTjBaVzVsY2lnblkyeHBZMnNuTENBb0tTQTlQaUI3WEc1Y2RGeDBYSFJqYjI1emRDQnNaWFIwWlhKT2IyUmxJRDBnWkc5amRXMWxiblF1WjJWMFJXeGxiV1Z1ZEVKNVNXUW9iR1YwZEdWeUtUdGNibHgwWEhSY2RHeGxkQ0IwWVhKblpYUTdYRzVjYmx4MFhIUmNkR2xtSUNnaGMyOXlkRXRsZVNrZ2UxeHVYSFJjZEZ4MFhIUjBZWEpuWlhRZ1BTQnNaWFIwWlhJZ1BUMDlJQ2RoSnlBL0lHUnZZM1Z0Wlc1MExtZGxkRVZzWlcxbGJuUkNlVWxrS0NkaGJtTm9iM0l0ZEdGeVoyVjBKeWtnT2lCc1pYUjBaWEpPYjJSbExuQmhjbVZ1ZEVWc1pXMWxiblF1Y0dGeVpXNTBSV3hsYldWdWRDNXdZWEpsYm5SRmJHVnRaVzUwTG5CaGNtVnVkRVZzWlcxbGJuUXVjSEpsZG1sdmRYTkZiR1Z0Wlc1MFUybGliR2x1Wnk1eGRXVnllVk5sYkdWamRHOXlLQ2N1YW5NdFlYSjBhV05zWlMxaGJtTm9iM0l0ZEdGeVoyVjBKeWs3WEc1Y2RGeDBYSFI5SUdWc2MyVWdlMXh1WEhSY2RGeDBYSFIwWVhKblpYUWdQU0JzWlhSMFpYSWdQVDA5SUNkaEp5QS9JR1J2WTNWdFpXNTBMbWRsZEVWc1pXMWxiblJDZVVsa0tDZGhibU5vYjNJdGRHRnlaMlYwSnlrZ09pQnNaWFIwWlhKT2IyUmxMbkJoY21WdWRFVnNaVzFsYm5RdWNHRnlaVzUwUld4bGJXVnVkQzV3WVhKbGJuUkZiR1Z0Wlc1MExuQnlaWFpwYjNWelJXeGxiV1Z1ZEZOcFlteHBibWN1Y1hWbGNubFRaV3hsWTNSdmNpZ25MbXB6TFdGeWRHbGpiR1V0WVc1amFHOXlMWFJoY21kbGRDY3BPMXh1WEhSY2RGeDBmVHRjYmx4dVhIUmNkRngwZEdGeVoyVjBMbk5qY205c2JFbHVkRzlXYVdWM0tIdGlaV2hoZG1sdmNqb2dYQ0p6Ylc5dmRHaGNJaXdnWW14dlkyczZJRndpYzNSaGNuUmNJbjBwTzF4dVhIUmNkSDBwTzF4dVhIUjlPMXh1WEc1Y2RHeGxkQ0JoWTNScGRtVkZiblJ5YVdWeklEMGdlMzA3WEc1Y2RHeGxkQ0FrYjNWMFpYSWdQU0JrYjJOMWJXVnVkQzV4ZFdWeWVWTmxiR1ZqZEc5eUtDY3VZV3h3YUdGaVpYUmZYMnhsZEhSbGNuTW5LVHRjYmx4MEpHOTFkR1Z5TG1sdWJtVnlTRlJOVENBOUlDY25PMXh1WEc1Y2RHRnNjR2hoWW1WMExtWnZja1ZoWTJnb2JHVjBkR1Z5SUQwK0lIdGNibHgwWEhSc1pYUWdKR1pwY25OMFJXNTBjbmtnUFNCbWFXNWtSbWx5YzNSRmJuUnllU2hzWlhSMFpYSXBPMXh1WEhSY2RHeGxkQ0FrWVc1amFHOXlJRDBnWkc5amRXMWxiblF1WTNKbFlYUmxSV3hsYldWdWRDZ25ZU2NwTzF4dVhHNWNkRngwYVdZZ0tDRWtabWx5YzNSRmJuUnllU2tnY21WMGRYSnVPMXh1WEc1Y2RGeDBKR1pwY25OMFJXNTBjbmt1YVdRZ1BTQnNaWFIwWlhJN1hHNWNkRngwSkdGdVkyaHZjaTVwYm01bGNraFVUVXdnUFNCc1pYUjBaWEl1ZEc5VmNIQmxja05oYzJVb0tUdGNibHgwWEhRa1lXNWphRzl5TG1Oc1lYTnpUbUZ0WlNBOUlDZGhiSEJvWVdKbGRGOWZiR1YwZEdWeUxXRnVZMmh2Y2ljN1hHNWNibHgwWEhSaGRIUmhZMmhCYm1Ob2IzSk1hWE4wWlc1bGNpZ2tZVzVqYUc5eUxDQnNaWFIwWlhJcE8xeHVYSFJjZENSdmRYUmxjaTVoY0hCbGJtUkRhR2xzWkNna1lXNWphRzl5S1R0Y2JseDBmU2s3WEc1OU8xeHVYRzVsZUhCdmNuUWdaR1ZtWVhWc2RDQnRZV3RsUVd4d2FHRmlaWFE3SWl3aVkyOXVjM1FnYldGclpWTnNhV1JsY2lBOUlDZ2tjMnhwWkdWeUtTQTlQaUI3WEc1Y2RHTnZibk4wSUNSaGNuSnZkMDVsZUhRZ1BTQWtjMnhwWkdWeUxuQmhjbVZ1ZEVWc1pXMWxiblF1Y1hWbGNubFRaV3hsWTNSdmNpZ25MbUZ5Y205M0xXNWxlSFFuS1R0Y2JseDBZMjl1YzNRZ0pHRnljbTkzVUhKbGRpQTlJQ1J6Ykdsa1pYSXVjR0Z5Wlc1MFJXeGxiV1Z1ZEM1eGRXVnllVk5sYkdWamRHOXlLQ2N1WVhKeWIzY3RjSEpsZGljcE8xeHVYRzVjZEd4bGRDQmpkWEp5Wlc1MElEMGdKSE5zYVdSbGNpNW1hWEp6ZEVWc1pXMWxiblJEYUdsc1pEdGNibHgwSkdGeWNtOTNUbVY0ZEM1aFpHUkZkbVZ1ZEV4cGMzUmxibVZ5S0NkamJHbGpheWNzSUNncElEMCtJSHRjYmx4MFhIUmpiMjV6ZENCdVpYaDBJRDBnWTNWeWNtVnVkQzV1WlhoMFJXeGxiV1Z1ZEZOcFlteHBibWM3WEc1Y2RGeDBhV1lnS0c1bGVIUXBJSHRjYmx4MFhIUmNkRzVsZUhRdWMyTnliMnhzU1c1MGIxWnBaWGNvZTJKbGFHRjJhVzl5T2lCY0luTnRiMjkwYUZ3aUxDQmliRzlqYXpvZ1hDSnVaV0Z5WlhOMFhDSXNJR2x1YkdsdVpUb2dYQ0pqWlc1MFpYSmNJbjBwTzF4dVhIUmNkRngwWTNWeWNtVnVkQ0E5SUc1bGVIUTdYRzVjZEZ4MGZWeHVYSFI5S1R0Y2JseHVYSFFrWVhKeWIzZFFjbVYyTG1Ga1pFVjJaVzUwVEdsemRHVnVaWElvSjJOc2FXTnJKeXdnS0NrZ1BUNGdlMXh1WEhSY2RHTnZibk4wSUhCeVpYWWdQU0JqZFhKeVpXNTBMbkJ5WlhacGIzVnpSV3hsYldWdWRGTnBZbXhwYm1jN1hHNWNkRngwYVdZZ0tIQnlaWFlwSUh0Y2JseDBYSFJjZEhCeVpYWXVjMk55YjJ4c1NXNTBiMVpwWlhjb2UySmxhR0YyYVc5eU9pQmNJbk50YjI5MGFGd2lMQ0JpYkc5amF6b2dYQ0p1WldGeVpYTjBYQ0lzSUdsdWJHbHVaVG9nWENKalpXNTBaWEpjSW4wcE8xeHVYSFJjZEZ4MFkzVnljbVZ1ZENBOUlIQnlaWFk3WEc1Y2RGeDBmVnh1WEhSOUtWeHVmVHRjYmx4dVpYaHdiM0owSUdSbFptRjFiSFFnYldGclpWTnNhV1JsY2pzaUxDSmpiMjV6ZENCcGJXRm5aVlJsYlhCc1lYUmxJRDBnS0dsdFlXZGxLU0E5UGlCZ1hHNDhaR2wySUdOc1lYTnpQVndpWVhKMGFXTnNaUzFwYldGblpWOWZiM1YwWlhKY0lqNWNibHgwUEdsdFp5QmpiR0Z6Y3oxY0ltRnlkR2xqYkdVdGFXMWhaMlZjSWlCemNtTTlYQ0l1TGk4dUxpOWhjM05sZEhNdmFXMWhaMlZ6THlSN2FXMWhaMlY5WENJK1BDOXBiV2MrWEc0OEwyUnBkajVjYm1BN1hHNWNibU52Ym5OMElHRnlkR2xqYkdWVVpXMXdiR0YwWlNBOUlDaGxiblJ5ZVN3Z2FTa2dQVDRnZTF4dVhIUmpiMjV6ZENCN0lIUnBkR3hsTENCbWFYSnpkRTVoYldVc0lHeGhjM1JPWVcxbExDQnBiV0ZuWlhNc0lHUmxjMk55YVhCMGFXOXVMQ0JrWlhSaGFXd2dmU0E5SUdWdWRISjVPMXh1WEc1Y2RHTnZibk4wSUdsdFlXZGxTRlJOVENBOUlHbHRZV2RsY3k1c1pXNW5kR2dnUHlCY2JseDBYSFJwYldGblpYTXViV0Z3S0dsdFlXZGxJRDArSUdsdFlXZGxWR1Z0Y0d4aGRHVW9hVzFoWjJVcEtTNXFiMmx1S0NjbktTQTZJQ2NuTzF4dVhHNWNkSEpsZEhWeWJpQWdZRnh1WEhSY2REeGhjblJwWTJ4bElHTnNZWE56UFZ3aVlYSjBhV05zWlY5ZmIzVjBaWEpjSWo1Y2JseDBYSFJjZER4a2FYWWdZMnhoYzNNOVhDSmhjblJwWTJ4bFgxOXBibTVsY2x3aVBseHVYSFJjZEZ4MFhIUThaR2wySUdOc1lYTnpQVndpWVhKMGFXTnNaVjlmYUdWaFpHbHVaMXdpUGx4dVhIUmNkRngwWEhSY2REeGhJR05zWVhOelBWd2lhbk10Wlc1MGNua3RkR2wwYkdWY0lqNDhMMkUrWEc1Y2RGeDBYSFJjZEZ4MFBHZ3lJR05zWVhOelBWd2lZWEowYVdOc1pTMW9aV0ZrYVc1blgxOTBhWFJzWlZ3aVBpUjdkR2wwYkdWOVBDOW9NajVjYmx4MFhIUmNkRngwWEhROFpHbDJJR05zWVhOelBWd2lZWEowYVdOc1pTMW9aV0ZrYVc1blgxOXVZVzFsWENJK1hHNWNkRngwWEhSY2RGeDBYSFE4YzNCaGJpQmpiR0Z6Y3oxY0ltRnlkR2xqYkdVdGFHVmhaR2x1WjE5ZmJtRnRaUzB0Wm1seWMzUmNJajRrZTJacGNuTjBUbUZ0WlgwOEwzTndZVzQrWEc1Y2RGeDBYSFJjZEZ4MFhIUThZU0JqYkdGemN6MWNJbXB6TFdWdWRISjVMV0Z5ZEdsemRGd2lQand2WVQ1Y2JseDBYSFJjZEZ4MFhIUmNkRHh6Y0dGdUlHTnNZWE56UFZ3aVlYSjBhV05zWlMxb1pXRmthVzVuWDE5dVlXMWxMUzFzWVhOMFhDSStKSHRzWVhOMFRtRnRaWDA4TDNOd1lXNCtYRzVjZEZ4MFhIUmNkRngwUEM5a2FYWStYRzVjZEZ4MFhIUmNkRHd2WkdsMlBseDBYRzVjZEZ4MFhIUmNkRHhrYVhZZ1kyeGhjM005WENKaGNuUnBZMnhsWDE5emJHbGtaWEl0YjNWMFpYSmNJajVjYmx4MFhIUmNkRngwWEhROFpHbDJJR05zWVhOelBWd2lZWEowYVdOc1pWOWZjMnhwWkdWeUxXbHVibVZ5WENJZ2FXUTlYQ0p6Ykdsa1pYSXRKSHRwZlZ3aVBseHVYSFJjZEZ4MFhIUmNkRngwSkh0cGJXRm5aVWhVVFV4OVhHNWNkRngwWEhSY2RGeDBYSFE4WkdsMklHTnNZWE56UFZ3aVlYSjBhV05zWlMxa1pYTmpjbWx3ZEdsdmJsOWZiM1YwWlhKY0lqNWNibHgwWEhSY2RGeDBYSFJjZEZ4MFBHUnBkaUJqYkdGemN6MWNJbUZ5ZEdsamJHVXRaR1Z6WTNKcGNIUnBiMjVjSWo0a2UyUmxjMk55YVhCMGFXOXVmVHd2WkdsMlBseHVYSFJjZEZ4MFhIUmNkRngwWEhROFpHbDJJR05zWVhOelBWd2lZWEowYVdOc1pTMWtaWFJoYVd4Y0lqNGtlMlJsZEdGcGJIMDhMMlJwZGo1Y2JseDBYSFJjZEZ4MFhIUmNkRHd2WkdsMlBseHVYSFJjZEZ4MFhIUmNkRHd2WkdsMlBseHVYSFJjZEZ4MFhIUmNkRHhrYVhZZ1kyeGhjM005WENKaGNuUnBZMnhsWDE5elkzSnZiR3d0WTI5dWRISnZiSE5jSWo1Y2JseDBYSFJjZEZ4MFhIUmNkRHh6Y0dGdUlHTnNZWE56UFZ3aVkyOXVkSEp2YkhNZ1lYSnliM2N0Y0hKbGRsd2lQdUtHa0R3dmMzQmhiajRnWEc1Y2RGeDBYSFJjZEZ4MFhIUThjM0JoYmlCamJHRnpjejFjSW1OdmJuUnliMnh6SUdGeWNtOTNMVzVsZUhSY0lqN2locEk4TDNOd1lXNCtYRzVjZEZ4MFhIUmNkRngwUEM5a2FYWStYRzVjZEZ4MFhIUmNkRngwUEhBZ1kyeGhjM005WENKcWN5MWhjblJwWTJ4bExXRnVZMmh2Y2kxMFlYSm5aWFJjSWo0OEwzQStYRzVjZEZ4MFhIUThMMlJwZGo1Y2JseDBYSFE4TDJGeWRHbGpiR1UrWEc1Y2RHQmNibjA3WEc1Y2JtVjRjRzl5ZENCa1pXWmhkV3gwSUdGeWRHbGpiR1ZVWlcxd2JHRjBaVHNpTENKcGJYQnZjblFnWVhKMGFXTnNaVlJsYlhCc1lYUmxJR1p5YjIwZ0p5NHZZWEowYVdOc1pTYzdYRzVwYlhCdmNuUWdjbVZ1WkdWeVRtRjJUR2NnWm5KdmJTQW5MaTl1WVhaTVp5YzdYRzVjYm1WNGNHOXlkQ0I3SUdGeWRHbGpiR1ZVWlcxd2JHRjBaU3dnY21WdVpHVnlUbUYyVEdjZ2ZUc2lMQ0pqYjI1emRDQjBaVzF3YkdGMFpTQTlJRnh1WEhSZ1BHUnBkaUJqYkdGemN6MWNJbTVoZGw5ZmFXNXVaWEpjSWo1Y2JseDBYSFE4WkdsMklHTnNZWE56UFZ3aWJtRjJYMTl6YjNKMExXSjVYQ0krWEc1Y2RGeDBYSFE4YzNCaGJpQmpiR0Z6Y3oxY0luTnZjblF0WW5sZlgzUnBkR3hsWENJK1UyOXlkQ0JpZVR3dmMzQmhiajVjYmx4MFhIUmNkRHhpZFhSMGIyNGdZMnhoYzNNOVhDSnpiM0owTFdKNUlITnZjblF0WW5sZlgySjVMV0Z5ZEdsemRDQmhZM1JwZG1WY0lpQnBaRDFjSW1wekxXSjVMV0Z5ZEdsemRGd2lQa0Z5ZEdsemREd3ZZblYwZEc5dVBseHVYSFJjZEZ4MFBITndZVzRnWTJ4aGMzTTlYQ0p6YjNKMExXSjVYMTlrYVhacFpHVnlYQ0krSUh3Z1BDOXpjR0Z1UGx4dVhIUmNkRngwUEdKMWRIUnZiaUJqYkdGemN6MWNJbk52Y25RdFlua2djMjl5ZEMxaWVWOWZZbmt0ZEdsMGJHVmNJaUJwWkQxY0ltcHpMV0o1TFhScGRHeGxYQ0krVkdsMGJHVThMMkoxZEhSdmJqNWNibHgwWEhSY2REeHpjR0Z1SUdOc1lYTnpQVndpWm1sdVpGd2lJR2xrUFZ3aWFuTXRabWx1WkZ3aVBseHVYSFJjZEZ4MFhIUW9QSE53WVc0Z1kyeGhjM005WENKbWFXNWtMUzFwYm01bGNsd2lQaVlqT0RrNE5EdEdQQzl6Y0dGdVBpbGNibHgwWEhSY2REd3ZjM0JoYmo1Y2JseDBYSFE4TDJScGRqNWNibHgwWEhROFpHbDJJR05zWVhOelBWd2libUYyWDE5aGJIQm9ZV0psZEZ3aVBseHVYSFJjZEZ4MFBITndZVzRnWTJ4aGMzTTlYQ0poYkhCb1lXSmxkRjlmZEdsMGJHVmNJajVIYnlCMGJ6d3ZjM0JoYmo1Y2JseDBYSFJjZER4a2FYWWdZMnhoYzNNOVhDSmhiSEJvWVdKbGRGOWZiR1YwZEdWeWMxd2lQand2WkdsMlBseHVYSFJjZER3dlpHbDJQbHh1WEhROEwyUnBkajVnTzF4dVhHNWpiMjV6ZENCeVpXNWtaWEpPWVhaTVp5QTlJQ2dwSUQwK0lIdGNibHgwYkdWMElHNWhkazkxZEdWeUlEMGdaRzlqZFcxbGJuUXVaMlYwUld4bGJXVnVkRUo1U1dRb0oycHpMVzVoZGljcE8xeHVYSFJ1WVhaUGRYUmxjaTVwYm01bGNraFVUVXdnUFNCMFpXMXdiR0YwWlR0Y2JuMDdYRzVjYm1WNGNHOXlkQ0JrWldaaGRXeDBJSEpsYm1SbGNrNWhka3huT3lJc0ltbHRjRzl5ZENCN0lDUnNiMkZrYVc1bkxDQWtibUYyTENBa2NHRnlZV3hzWVhnc0lDUmpiMjUwWlc1MExDQWtkR2wwYkdVc0lDUmhjbkp2ZHl3Z0pHMXZaR0ZzTENBa2JHbG5hSFJpYjNnc0lDUjJhV1YzSUgwZ1puSnZiU0FuTGk0dlkyOXVjM1JoYm5Sekp6dGNibHh1WTI5dWMzUWdaR1ZpYjNWdVkyVWdQU0FvWm00c0lIUnBiV1VwSUQwK0lIdGNiaUFnYkdWMElIUnBiV1Z2ZFhRN1hHNWNiaUFnY21WMGRYSnVJR1oxYm1OMGFXOXVLQ2tnZTF4dUlDQWdJR052Ym5OMElHWjFibU4wYVc5dVEyRnNiQ0E5SUNncElEMCtJR1p1TG1Gd2NHeDVLSFJvYVhNc0lHRnlaM1Z0Wlc1MGN5azdYRzRnSUNBZ1hHNGdJQ0FnWTJ4bFlYSlVhVzFsYjNWMEtIUnBiV1Z2ZFhRcE8xeHVJQ0FnSUhScGJXVnZkWFFnUFNCelpYUlVhVzFsYjNWMEtHWjFibU4wYVc5dVEyRnNiQ3dnZEdsdFpTazdYRzRnSUgxY2JuMDdYRzVjYm1OdmJuTjBJR2hwWkdWTWIyRmthVzVuSUQwZ0tDa2dQVDRnZTF4dVhIUWtiRzloWkdsdVp5NW1iM0pGWVdOb0tHVnNaVzBnUFQ0Z1pXeGxiUzVqYkdGemMweHBjM1F1WVdSa0tDZHlaV0ZrZVNjcEtUdGNibHgwSkc1aGRpNWpiR0Z6YzB4cGMzUXVZV1JrS0NkeVpXRmtlU2NwTzF4dWZUdGNibHh1WTI5dWMzUWdjMk55YjJ4c1ZHOVViM0FnUFNBb0tTQTlQaUI3WEc1Y2RHeGxkQ0IwYjNBZ1BTQmtiMk4xYldWdWRDNW5aWFJGYkdWdFpXNTBRbmxKWkNnbllXNWphRzl5TFhSaGNtZGxkQ2NwTzF4dVhIUjBiM0F1YzJOeWIyeHNTVzUwYjFacFpYY29lMkpsYUdGMmFXOXlPaUJjSW5OdGIyOTBhRndpTENCaWJHOWphem9nWENKemRHRnlkRndpZlNrN1hHNTlPMXh1WEc1bGVIQnZjblFnZXlCa1pXSnZkVzVqWlN3Z2FHbGtaVXh2WVdScGJtY3NJSE5qY205c2JGUnZWRzl3SUgwN0lsMTkifQ==
