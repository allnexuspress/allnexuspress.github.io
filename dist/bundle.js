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

	if (window.screen.width > 768) (0, _modules.attachImageListeners)();
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
	    contents = entry.contents,
	    dimensions = entry.dimensions,
	    year = entry.year,
	    isbn = entry.isbn,
	    link = entry.link;


	var imageHTML = images.length ? images.map(function (image) {
		return imageTemplate(image);
	}).join('') : '';

	return '\n\t\t<article class="article__outer">\n\t\t\t<div class="article__inner">\n\t\t\t\t<div class="article__heading">\n\t\t\t\t\t<a class="js-entry-title"></a>\n\t\t\t\t\t<h2 class="article-heading__title">' + title + '</h2>\n\t\t\t\t\t<div class="article-heading__name">\n\t\t\t\t\t\t<span class="article-heading__name--first">' + firstName + '</span>\n\t\t\t\t\t\t<a class="js-entry-artist"></a>\n\t\t\t\t\t\t<span class="article-heading__name--last">' + lastName + '</span>\n\t\t\t\t\t</div>\n\t\t\t\t</div>\t\n\t\t\t\t<div class="article__slider-outer">\n\t\t\t\t\t<div class="article__slider-inner" id="slider-' + i + '">\n\t\t\t\t\t\t' + imageHTML + '\n\t\t\t\t\t\t<div class="article-description__outer">\n\t\t\t\t\t\t\t<div class="article-description">' + description + '</div>\n\t\t\t\t\t\t\t<div class="article-detail">' + contents + '</div>\n\t\t\t\t\t\t\t<div class="article-detail article-detail--margin">' + dimensions + '</div>\n\t\t\t\t\t\t\t<div class="article-detail article-detail--margin">' + year + '</div>\n\t\t\t\t\t\t\t<a class="article-detail article-detail--link" target="_blank" href="' + link + '">' + isbn + '</a>\n\t\t\t\t\t\t</div>\n\t\t\t\t\t</div>\n\t\t\t\t\t<div class="article__scroll-controls">\n\t\t\t\t\t\t<span class="controls arrow-prev">\u2190</span> \n\t\t\t\t\t\t<span class="controls arrow-next">\u2192</span>\n\t\t\t\t\t</div>\n\t\t\t\t\t<p class="js-article-anchor-target"></p>\n\t\t\t</div>\n\t\t</article>\n\t';
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvc21vb3Roc2Nyb2xsLXBvbHlmaWxsL2Rpc3Qvc21vb3Roc2Nyb2xsLmpzIiwic3JjL2pzL2NvbnN0YW50cy5qcyIsInNyYy9qcy9pbmRleC5qcyIsInNyYy9qcy9tb2R1bGVzL2F0dGFjaEltYWdlTGlzdGVuZXJzLmpzIiwic3JjL2pzL21vZHVsZXMvYXR0YWNoTW9kYWxMaXN0ZW5lcnMuanMiLCJzcmMvanMvbW9kdWxlcy9hdHRhY2hVcEFycm93TGlzdGVuZXJzLmpzIiwic3JjL2pzL21vZHVsZXMvaW5kZXguanMiLCJzcmMvanMvbW9kdWxlcy9tYWtlQWxwaGFiZXQuanMiLCJzcmMvanMvbW9kdWxlcy9tYWtlU2xpZGVyLmpzIiwic3JjL2pzL3RlbXBsYXRlcy9hcnRpY2xlLmpzIiwic3JjL2pzL3RlbXBsYXRlcy9pbmRleC5qcyIsInNyYy9qcy90ZW1wbGF0ZXMvbmF2TGcuanMiLCJzcmMvanMvdXRpbHMvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNB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Q0EsY0FBVSxXQUFXLFlBQVgsRUFBeUIsSUFBekIsQ0FBVjtBQUNELEdBTEQ7QUFNRCxDQVREOztBQVdBLElBQU0sY0FBYyxTQUFkLFdBQWMsR0FBTTtBQUN6QixzQkFBUyxPQUFULENBQWlCO0FBQUEsV0FBUSxLQUFLLFNBQUwsQ0FBZSxHQUFmLENBQW1CLE9BQW5CLENBQVI7QUFBQSxHQUFqQjtBQUNBLGtCQUFLLFNBQUwsQ0FBZSxHQUFmLENBQW1CLE9BQW5CO0FBQ0EsQ0FIRDs7QUFLQSxJQUFNLGNBQWMsU0FBZCxXQUFjLEdBQU07QUFDekIsTUFBSSxNQUFNLFNBQVMsY0FBVCxDQUF3QixlQUF4QixDQUFWO0FBQ0EsTUFBSSxjQUFKLENBQW1CLEVBQUMsVUFBVSxRQUFYLEVBQXFCLE9BQU8sT0FBNUIsRUFBbkI7QUFDQSxDQUhEOztRQUtTLFEsR0FBQSxRO1FBQVUsVyxHQUFBLFc7UUFBYSxXLEdBQUEsVyIsImZpbGUiOiJidW5kbGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiLyogc21vb3Roc2Nyb2xsIHYwLjQuMCAtIDIwMTggLSBEdXN0YW4gS2FzdGVuLCBKZXJlbWlhcyBNZW5pY2hlbGxpIC0gTUlUIExpY2Vuc2UgKi9cbihmdW5jdGlvbiAoKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICAvLyBwb2x5ZmlsbFxuICBmdW5jdGlvbiBwb2x5ZmlsbCgpIHtcbiAgICAvLyBhbGlhc2VzXG4gICAgdmFyIHcgPSB3aW5kb3c7XG4gICAgdmFyIGQgPSBkb2N1bWVudDtcblxuICAgIC8vIHJldHVybiBpZiBzY3JvbGwgYmVoYXZpb3IgaXMgc3VwcG9ydGVkIGFuZCBwb2x5ZmlsbCBpcyBub3QgZm9yY2VkXG4gICAgaWYgKFxuICAgICAgJ3Njcm9sbEJlaGF2aW9yJyBpbiBkLmRvY3VtZW50RWxlbWVudC5zdHlsZSAmJlxuICAgICAgdy5fX2ZvcmNlU21vb3RoU2Nyb2xsUG9seWZpbGxfXyAhPT0gdHJ1ZVxuICAgICkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIGdsb2JhbHNcbiAgICB2YXIgRWxlbWVudCA9IHcuSFRNTEVsZW1lbnQgfHwgdy5FbGVtZW50O1xuICAgIHZhciBTQ1JPTExfVElNRSA9IDQ2ODtcblxuICAgIC8vIG9iamVjdCBnYXRoZXJpbmcgb3JpZ2luYWwgc2Nyb2xsIG1ldGhvZHNcbiAgICB2YXIgb3JpZ2luYWwgPSB7XG4gICAgICBzY3JvbGw6IHcuc2Nyb2xsIHx8IHcuc2Nyb2xsVG8sXG4gICAgICBzY3JvbGxCeTogdy5zY3JvbGxCeSxcbiAgICAgIGVsZW1lbnRTY3JvbGw6IEVsZW1lbnQucHJvdG90eXBlLnNjcm9sbCB8fCBzY3JvbGxFbGVtZW50LFxuICAgICAgc2Nyb2xsSW50b1ZpZXc6IEVsZW1lbnQucHJvdG90eXBlLnNjcm9sbEludG9WaWV3XG4gICAgfTtcblxuICAgIC8vIGRlZmluZSB0aW1pbmcgbWV0aG9kXG4gICAgdmFyIG5vdyA9XG4gICAgICB3LnBlcmZvcm1hbmNlICYmIHcucGVyZm9ybWFuY2Uubm93XG4gICAgICAgID8gdy5wZXJmb3JtYW5jZS5ub3cuYmluZCh3LnBlcmZvcm1hbmNlKVxuICAgICAgICA6IERhdGUubm93O1xuXG4gICAgLyoqXG4gICAgICogaW5kaWNhdGVzIGlmIGEgdGhlIGN1cnJlbnQgYnJvd3NlciBpcyBtYWRlIGJ5IE1pY3Jvc29mdFxuICAgICAqIEBtZXRob2QgaXNNaWNyb3NvZnRCcm93c2VyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHVzZXJBZ2VudFxuICAgICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGlzTWljcm9zb2Z0QnJvd3Nlcih1c2VyQWdlbnQpIHtcbiAgICAgIHZhciB1c2VyQWdlbnRQYXR0ZXJucyA9IFsnTVNJRSAnLCAnVHJpZGVudC8nLCAnRWRnZS8nXTtcblxuICAgICAgcmV0dXJuIG5ldyBSZWdFeHAodXNlckFnZW50UGF0dGVybnMuam9pbignfCcpKS50ZXN0KHVzZXJBZ2VudCk7XG4gICAgfVxuXG4gICAgLypcbiAgICAgKiBJRSBoYXMgcm91bmRpbmcgYnVnIHJvdW5kaW5nIGRvd24gY2xpZW50SGVpZ2h0IGFuZCBjbGllbnRXaWR0aCBhbmRcbiAgICAgKiByb3VuZGluZyB1cCBzY3JvbGxIZWlnaHQgYW5kIHNjcm9sbFdpZHRoIGNhdXNpbmcgZmFsc2UgcG9zaXRpdmVzXG4gICAgICogb24gaGFzU2Nyb2xsYWJsZVNwYWNlXG4gICAgICovXG4gICAgdmFyIFJPVU5ESU5HX1RPTEVSQU5DRSA9IGlzTWljcm9zb2Z0QnJvd3Nlcih3Lm5hdmlnYXRvci51c2VyQWdlbnQpID8gMSA6IDA7XG5cbiAgICAvKipcbiAgICAgKiBjaGFuZ2VzIHNjcm9sbCBwb3NpdGlvbiBpbnNpZGUgYW4gZWxlbWVudFxuICAgICAqIEBtZXRob2Qgc2Nyb2xsRWxlbWVudFxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSB4XG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHlcbiAgICAgKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHNjcm9sbEVsZW1lbnQoeCwgeSkge1xuICAgICAgdGhpcy5zY3JvbGxMZWZ0ID0geDtcbiAgICAgIHRoaXMuc2Nyb2xsVG9wID0geTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiByZXR1cm5zIHJlc3VsdCBvZiBhcHBseWluZyBlYXNlIG1hdGggZnVuY3Rpb24gdG8gYSBudW1iZXJcbiAgICAgKiBAbWV0aG9kIGVhc2VcbiAgICAgKiBAcGFyYW0ge051bWJlcn0ga1xuICAgICAqIEByZXR1cm5zIHtOdW1iZXJ9XG4gICAgICovXG4gICAgZnVuY3Rpb24gZWFzZShrKSB7XG4gICAgICByZXR1cm4gMC41ICogKDEgLSBNYXRoLmNvcyhNYXRoLlBJICogaykpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGluZGljYXRlcyBpZiBhIHNtb290aCBiZWhhdmlvciBzaG91bGQgYmUgYXBwbGllZFxuICAgICAqIEBtZXRob2Qgc2hvdWxkQmFpbE91dFxuICAgICAqIEBwYXJhbSB7TnVtYmVyfE9iamVjdH0gZmlyc3RBcmdcbiAgICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzaG91bGRCYWlsT3V0KGZpcnN0QXJnKSB7XG4gICAgICBpZiAoXG4gICAgICAgIGZpcnN0QXJnID09PSBudWxsIHx8XG4gICAgICAgIHR5cGVvZiBmaXJzdEFyZyAhPT0gJ29iamVjdCcgfHxcbiAgICAgICAgZmlyc3RBcmcuYmVoYXZpb3IgPT09IHVuZGVmaW5lZCB8fFxuICAgICAgICBmaXJzdEFyZy5iZWhhdmlvciA9PT0gJ2F1dG8nIHx8XG4gICAgICAgIGZpcnN0QXJnLmJlaGF2aW9yID09PSAnaW5zdGFudCdcbiAgICAgICkge1xuICAgICAgICAvLyBmaXJzdCBhcmd1bWVudCBpcyBub3QgYW4gb2JqZWN0L251bGxcbiAgICAgICAgLy8gb3IgYmVoYXZpb3IgaXMgYXV0bywgaW5zdGFudCBvciB1bmRlZmluZWRcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG5cbiAgICAgIGlmICh0eXBlb2YgZmlyc3RBcmcgPT09ICdvYmplY3QnICYmIGZpcnN0QXJnLmJlaGF2aW9yID09PSAnc21vb3RoJykge1xuICAgICAgICAvLyBmaXJzdCBhcmd1bWVudCBpcyBhbiBvYmplY3QgYW5kIGJlaGF2aW9yIGlzIHNtb290aFxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIC8vIHRocm93IGVycm9yIHdoZW4gYmVoYXZpb3IgaXMgbm90IHN1cHBvcnRlZFxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICAgJ2JlaGF2aW9yIG1lbWJlciBvZiBTY3JvbGxPcHRpb25zICcgK1xuICAgICAgICAgIGZpcnN0QXJnLmJlaGF2aW9yICtcbiAgICAgICAgICAnIGlzIG5vdCBhIHZhbGlkIHZhbHVlIGZvciBlbnVtZXJhdGlvbiBTY3JvbGxCZWhhdmlvci4nXG4gICAgICApO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGluZGljYXRlcyBpZiBhbiBlbGVtZW50IGhhcyBzY3JvbGxhYmxlIHNwYWNlIGluIHRoZSBwcm92aWRlZCBheGlzXG4gICAgICogQG1ldGhvZCBoYXNTY3JvbGxhYmxlU3BhY2VcbiAgICAgKiBAcGFyYW0ge05vZGV9IGVsXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGF4aXNcbiAgICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBoYXNTY3JvbGxhYmxlU3BhY2UoZWwsIGF4aXMpIHtcbiAgICAgIGlmIChheGlzID09PSAnWScpIHtcbiAgICAgICAgcmV0dXJuIGVsLmNsaWVudEhlaWdodCArIFJPVU5ESU5HX1RPTEVSQU5DRSA8IGVsLnNjcm9sbEhlaWdodDtcbiAgICAgIH1cblxuICAgICAgaWYgKGF4aXMgPT09ICdYJykge1xuICAgICAgICByZXR1cm4gZWwuY2xpZW50V2lkdGggKyBST1VORElOR19UT0xFUkFOQ0UgPCBlbC5zY3JvbGxXaWR0aDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBpbmRpY2F0ZXMgaWYgYW4gZWxlbWVudCBoYXMgYSBzY3JvbGxhYmxlIG92ZXJmbG93IHByb3BlcnR5IGluIHRoZSBheGlzXG4gICAgICogQG1ldGhvZCBjYW5PdmVyZmxvd1xuICAgICAqIEBwYXJhbSB7Tm9kZX0gZWxcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gYXhpc1xuICAgICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGNhbk92ZXJmbG93KGVsLCBheGlzKSB7XG4gICAgICB2YXIgb3ZlcmZsb3dWYWx1ZSA9IHcuZ2V0Q29tcHV0ZWRTdHlsZShlbCwgbnVsbClbJ292ZXJmbG93JyArIGF4aXNdO1xuXG4gICAgICByZXR1cm4gb3ZlcmZsb3dWYWx1ZSA9PT0gJ2F1dG8nIHx8IG92ZXJmbG93VmFsdWUgPT09ICdzY3JvbGwnO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGluZGljYXRlcyBpZiBhbiBlbGVtZW50IGNhbiBiZSBzY3JvbGxlZCBpbiBlaXRoZXIgYXhpc1xuICAgICAqIEBtZXRob2QgaXNTY3JvbGxhYmxlXG4gICAgICogQHBhcmFtIHtOb2RlfSBlbFxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBheGlzXG4gICAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAgICovXG4gICAgZnVuY3Rpb24gaXNTY3JvbGxhYmxlKGVsKSB7XG4gICAgICB2YXIgaXNTY3JvbGxhYmxlWSA9IGhhc1Njcm9sbGFibGVTcGFjZShlbCwgJ1knKSAmJiBjYW5PdmVyZmxvdyhlbCwgJ1knKTtcbiAgICAgIHZhciBpc1Njcm9sbGFibGVYID0gaGFzU2Nyb2xsYWJsZVNwYWNlKGVsLCAnWCcpICYmIGNhbk92ZXJmbG93KGVsLCAnWCcpO1xuXG4gICAgICByZXR1cm4gaXNTY3JvbGxhYmxlWSB8fCBpc1Njcm9sbGFibGVYO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGZpbmRzIHNjcm9sbGFibGUgcGFyZW50IG9mIGFuIGVsZW1lbnRcbiAgICAgKiBAbWV0aG9kIGZpbmRTY3JvbGxhYmxlUGFyZW50XG4gICAgICogQHBhcmFtIHtOb2RlfSBlbFxuICAgICAqIEByZXR1cm5zIHtOb2RlfSBlbFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGZpbmRTY3JvbGxhYmxlUGFyZW50KGVsKSB7XG4gICAgICB2YXIgaXNCb2R5O1xuXG4gICAgICBkbyB7XG4gICAgICAgIGVsID0gZWwucGFyZW50Tm9kZTtcblxuICAgICAgICBpc0JvZHkgPSBlbCA9PT0gZC5ib2R5O1xuICAgICAgfSB3aGlsZSAoaXNCb2R5ID09PSBmYWxzZSAmJiBpc1Njcm9sbGFibGUoZWwpID09PSBmYWxzZSk7XG5cbiAgICAgIGlzQm9keSA9IG51bGw7XG5cbiAgICAgIHJldHVybiBlbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBzZWxmIGludm9rZWQgZnVuY3Rpb24gdGhhdCwgZ2l2ZW4gYSBjb250ZXh0LCBzdGVwcyB0aHJvdWdoIHNjcm9sbGluZ1xuICAgICAqIEBtZXRob2Qgc3RlcFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBjb250ZXh0XG4gICAgICogQHJldHVybnMge3VuZGVmaW5lZH1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzdGVwKGNvbnRleHQpIHtcbiAgICAgIHZhciB0aW1lID0gbm93KCk7XG4gICAgICB2YXIgdmFsdWU7XG4gICAgICB2YXIgY3VycmVudFg7XG4gICAgICB2YXIgY3VycmVudFk7XG4gICAgICB2YXIgZWxhcHNlZCA9ICh0aW1lIC0gY29udGV4dC5zdGFydFRpbWUpIC8gU0NST0xMX1RJTUU7XG5cbiAgICAgIC8vIGF2b2lkIGVsYXBzZWQgdGltZXMgaGlnaGVyIHRoYW4gb25lXG4gICAgICBlbGFwc2VkID0gZWxhcHNlZCA+IDEgPyAxIDogZWxhcHNlZDtcblxuICAgICAgLy8gYXBwbHkgZWFzaW5nIHRvIGVsYXBzZWQgdGltZVxuICAgICAgdmFsdWUgPSBlYXNlKGVsYXBzZWQpO1xuXG4gICAgICBjdXJyZW50WCA9IGNvbnRleHQuc3RhcnRYICsgKGNvbnRleHQueCAtIGNvbnRleHQuc3RhcnRYKSAqIHZhbHVlO1xuICAgICAgY3VycmVudFkgPSBjb250ZXh0LnN0YXJ0WSArIChjb250ZXh0LnkgLSBjb250ZXh0LnN0YXJ0WSkgKiB2YWx1ZTtcblxuICAgICAgY29udGV4dC5tZXRob2QuY2FsbChjb250ZXh0LnNjcm9sbGFibGUsIGN1cnJlbnRYLCBjdXJyZW50WSk7XG5cbiAgICAgIC8vIHNjcm9sbCBtb3JlIGlmIHdlIGhhdmUgbm90IHJlYWNoZWQgb3VyIGRlc3RpbmF0aW9uXG4gICAgICBpZiAoY3VycmVudFggIT09IGNvbnRleHQueCB8fCBjdXJyZW50WSAhPT0gY29udGV4dC55KSB7XG4gICAgICAgIHcucmVxdWVzdEFuaW1hdGlvbkZyYW1lKHN0ZXAuYmluZCh3LCBjb250ZXh0KSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogc2Nyb2xscyB3aW5kb3cgb3IgZWxlbWVudCB3aXRoIGEgc21vb3RoIGJlaGF2aW9yXG4gICAgICogQG1ldGhvZCBzbW9vdGhTY3JvbGxcbiAgICAgKiBAcGFyYW0ge09iamVjdHxOb2RlfSBlbFxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSB4XG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHlcbiAgICAgKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHNtb290aFNjcm9sbChlbCwgeCwgeSkge1xuICAgICAgdmFyIHNjcm9sbGFibGU7XG4gICAgICB2YXIgc3RhcnRYO1xuICAgICAgdmFyIHN0YXJ0WTtcbiAgICAgIHZhciBtZXRob2Q7XG4gICAgICB2YXIgc3RhcnRUaW1lID0gbm93KCk7XG5cbiAgICAgIC8vIGRlZmluZSBzY3JvbGwgY29udGV4dFxuICAgICAgaWYgKGVsID09PSBkLmJvZHkpIHtcbiAgICAgICAgc2Nyb2xsYWJsZSA9IHc7XG4gICAgICAgIHN0YXJ0WCA9IHcuc2Nyb2xsWCB8fCB3LnBhZ2VYT2Zmc2V0O1xuICAgICAgICBzdGFydFkgPSB3LnNjcm9sbFkgfHwgdy5wYWdlWU9mZnNldDtcbiAgICAgICAgbWV0aG9kID0gb3JpZ2luYWwuc2Nyb2xsO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2Nyb2xsYWJsZSA9IGVsO1xuICAgICAgICBzdGFydFggPSBlbC5zY3JvbGxMZWZ0O1xuICAgICAgICBzdGFydFkgPSBlbC5zY3JvbGxUb3A7XG4gICAgICAgIG1ldGhvZCA9IHNjcm9sbEVsZW1lbnQ7XG4gICAgICB9XG5cbiAgICAgIC8vIHNjcm9sbCBsb29waW5nIG92ZXIgYSBmcmFtZVxuICAgICAgc3RlcCh7XG4gICAgICAgIHNjcm9sbGFibGU6IHNjcm9sbGFibGUsXG4gICAgICAgIG1ldGhvZDogbWV0aG9kLFxuICAgICAgICBzdGFydFRpbWU6IHN0YXJ0VGltZSxcbiAgICAgICAgc3RhcnRYOiBzdGFydFgsXG4gICAgICAgIHN0YXJ0WTogc3RhcnRZLFxuICAgICAgICB4OiB4LFxuICAgICAgICB5OiB5XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBPUklHSU5BTCBNRVRIT0RTIE9WRVJSSURFU1xuICAgIC8vIHcuc2Nyb2xsIGFuZCB3LnNjcm9sbFRvXG4gICAgdy5zY3JvbGwgPSB3LnNjcm9sbFRvID0gZnVuY3Rpb24oKSB7XG4gICAgICAvLyBhdm9pZCBhY3Rpb24gd2hlbiBubyBhcmd1bWVudHMgYXJlIHBhc3NlZFxuICAgICAgaWYgKGFyZ3VtZW50c1swXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gYXZvaWQgc21vb3RoIGJlaGF2aW9yIGlmIG5vdCByZXF1aXJlZFxuICAgICAgaWYgKHNob3VsZEJhaWxPdXQoYXJndW1lbnRzWzBdKSA9PT0gdHJ1ZSkge1xuICAgICAgICBvcmlnaW5hbC5zY3JvbGwuY2FsbChcbiAgICAgICAgICB3LFxuICAgICAgICAgIGFyZ3VtZW50c1swXS5sZWZ0ICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8gYXJndW1lbnRzWzBdLmxlZnRcbiAgICAgICAgICAgIDogdHlwZW9mIGFyZ3VtZW50c1swXSAhPT0gJ29iamVjdCdcbiAgICAgICAgICAgICAgPyBhcmd1bWVudHNbMF1cbiAgICAgICAgICAgICAgOiB3LnNjcm9sbFggfHwgdy5wYWdlWE9mZnNldCxcbiAgICAgICAgICAvLyB1c2UgdG9wIHByb3AsIHNlY29uZCBhcmd1bWVudCBpZiBwcmVzZW50IG9yIGZhbGxiYWNrIHRvIHNjcm9sbFlcbiAgICAgICAgICBhcmd1bWVudHNbMF0udG9wICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8gYXJndW1lbnRzWzBdLnRvcFxuICAgICAgICAgICAgOiBhcmd1bWVudHNbMV0gIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgICA/IGFyZ3VtZW50c1sxXVxuICAgICAgICAgICAgICA6IHcuc2Nyb2xsWSB8fCB3LnBhZ2VZT2Zmc2V0XG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBMRVQgVEhFIFNNT09USE5FU1MgQkVHSU4hXG4gICAgICBzbW9vdGhTY3JvbGwuY2FsbChcbiAgICAgICAgdyxcbiAgICAgICAgZC5ib2R5LFxuICAgICAgICBhcmd1bWVudHNbMF0ubGVmdCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgPyB+fmFyZ3VtZW50c1swXS5sZWZ0XG4gICAgICAgICAgOiB3LnNjcm9sbFggfHwgdy5wYWdlWE9mZnNldCxcbiAgICAgICAgYXJndW1lbnRzWzBdLnRvcCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgPyB+fmFyZ3VtZW50c1swXS50b3BcbiAgICAgICAgICA6IHcuc2Nyb2xsWSB8fCB3LnBhZ2VZT2Zmc2V0XG4gICAgICApO1xuICAgIH07XG5cbiAgICAvLyB3LnNjcm9sbEJ5XG4gICAgdy5zY3JvbGxCeSA9IGZ1bmN0aW9uKCkge1xuICAgICAgLy8gYXZvaWQgYWN0aW9uIHdoZW4gbm8gYXJndW1lbnRzIGFyZSBwYXNzZWRcbiAgICAgIGlmIChhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIGF2b2lkIHNtb290aCBiZWhhdmlvciBpZiBub3QgcmVxdWlyZWRcbiAgICAgIGlmIChzaG91bGRCYWlsT3V0KGFyZ3VtZW50c1swXSkpIHtcbiAgICAgICAgb3JpZ2luYWwuc2Nyb2xsQnkuY2FsbChcbiAgICAgICAgICB3LFxuICAgICAgICAgIGFyZ3VtZW50c1swXS5sZWZ0ICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8gYXJndW1lbnRzWzBdLmxlZnRcbiAgICAgICAgICAgIDogdHlwZW9mIGFyZ3VtZW50c1swXSAhPT0gJ29iamVjdCcgPyBhcmd1bWVudHNbMF0gOiAwLFxuICAgICAgICAgIGFyZ3VtZW50c1swXS50b3AgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyBhcmd1bWVudHNbMF0udG9wXG4gICAgICAgICAgICA6IGFyZ3VtZW50c1sxXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzFdIDogMFxuICAgICAgICApO1xuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gTEVUIFRIRSBTTU9PVEhORVNTIEJFR0lOIVxuICAgICAgc21vb3RoU2Nyb2xsLmNhbGwoXG4gICAgICAgIHcsXG4gICAgICAgIGQuYm9keSxcbiAgICAgICAgfn5hcmd1bWVudHNbMF0ubGVmdCArICh3LnNjcm9sbFggfHwgdy5wYWdlWE9mZnNldCksXG4gICAgICAgIH5+YXJndW1lbnRzWzBdLnRvcCArICh3LnNjcm9sbFkgfHwgdy5wYWdlWU9mZnNldClcbiAgICAgICk7XG4gICAgfTtcblxuICAgIC8vIEVsZW1lbnQucHJvdG90eXBlLnNjcm9sbCBhbmQgRWxlbWVudC5wcm90b3R5cGUuc2Nyb2xsVG9cbiAgICBFbGVtZW50LnByb3RvdHlwZS5zY3JvbGwgPSBFbGVtZW50LnByb3RvdHlwZS5zY3JvbGxUbyA9IGZ1bmN0aW9uKCkge1xuICAgICAgLy8gYXZvaWQgYWN0aW9uIHdoZW4gbm8gYXJndW1lbnRzIGFyZSBwYXNzZWRcbiAgICAgIGlmIChhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIGF2b2lkIHNtb290aCBiZWhhdmlvciBpZiBub3QgcmVxdWlyZWRcbiAgICAgIGlmIChzaG91bGRCYWlsT3V0KGFyZ3VtZW50c1swXSkgPT09IHRydWUpIHtcbiAgICAgICAgLy8gaWYgb25lIG51bWJlciBpcyBwYXNzZWQsIHRocm93IGVycm9yIHRvIG1hdGNoIEZpcmVmb3ggaW1wbGVtZW50YXRpb25cbiAgICAgICAgaWYgKHR5cGVvZiBhcmd1bWVudHNbMF0gPT09ICdudW1iZXInICYmIGFyZ3VtZW50c1sxXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFN5bnRheEVycm9yKCdWYWx1ZSBjb3VsZCBub3QgYmUgY29udmVydGVkJyk7XG4gICAgICAgIH1cblxuICAgICAgICBvcmlnaW5hbC5lbGVtZW50U2Nyb2xsLmNhbGwoXG4gICAgICAgICAgdGhpcyxcbiAgICAgICAgICAvLyB1c2UgbGVmdCBwcm9wLCBmaXJzdCBudW1iZXIgYXJndW1lbnQgb3IgZmFsbGJhY2sgdG8gc2Nyb2xsTGVmdFxuICAgICAgICAgIGFyZ3VtZW50c1swXS5sZWZ0ICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8gfn5hcmd1bWVudHNbMF0ubGVmdFxuICAgICAgICAgICAgOiB0eXBlb2YgYXJndW1lbnRzWzBdICE9PSAnb2JqZWN0JyA/IH5+YXJndW1lbnRzWzBdIDogdGhpcy5zY3JvbGxMZWZ0LFxuICAgICAgICAgIC8vIHVzZSB0b3AgcHJvcCwgc2Vjb25kIGFyZ3VtZW50IG9yIGZhbGxiYWNrIHRvIHNjcm9sbFRvcFxuICAgICAgICAgIGFyZ3VtZW50c1swXS50b3AgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyB+fmFyZ3VtZW50c1swXS50b3BcbiAgICAgICAgICAgIDogYXJndW1lbnRzWzFdICE9PSB1bmRlZmluZWQgPyB+fmFyZ3VtZW50c1sxXSA6IHRoaXMuc2Nyb2xsVG9wXG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB2YXIgbGVmdCA9IGFyZ3VtZW50c1swXS5sZWZ0O1xuICAgICAgdmFyIHRvcCA9IGFyZ3VtZW50c1swXS50b3A7XG5cbiAgICAgIC8vIExFVCBUSEUgU01PT1RITkVTUyBCRUdJTiFcbiAgICAgIHNtb290aFNjcm9sbC5jYWxsKFxuICAgICAgICB0aGlzLFxuICAgICAgICB0aGlzLFxuICAgICAgICB0eXBlb2YgbGVmdCA9PT0gJ3VuZGVmaW5lZCcgPyB0aGlzLnNjcm9sbExlZnQgOiB+fmxlZnQsXG4gICAgICAgIHR5cGVvZiB0b3AgPT09ICd1bmRlZmluZWQnID8gdGhpcy5zY3JvbGxUb3AgOiB+fnRvcFxuICAgICAgKTtcbiAgICB9O1xuXG4gICAgLy8gRWxlbWVudC5wcm90b3R5cGUuc2Nyb2xsQnlcbiAgICBFbGVtZW50LnByb3RvdHlwZS5zY3JvbGxCeSA9IGZ1bmN0aW9uKCkge1xuICAgICAgLy8gYXZvaWQgYWN0aW9uIHdoZW4gbm8gYXJndW1lbnRzIGFyZSBwYXNzZWRcbiAgICAgIGlmIChhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIGF2b2lkIHNtb290aCBiZWhhdmlvciBpZiBub3QgcmVxdWlyZWRcbiAgICAgIGlmIChzaG91bGRCYWlsT3V0KGFyZ3VtZW50c1swXSkgPT09IHRydWUpIHtcbiAgICAgICAgb3JpZ2luYWwuZWxlbWVudFNjcm9sbC5jYWxsKFxuICAgICAgICAgIHRoaXMsXG4gICAgICAgICAgYXJndW1lbnRzWzBdLmxlZnQgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyB+fmFyZ3VtZW50c1swXS5sZWZ0ICsgdGhpcy5zY3JvbGxMZWZ0XG4gICAgICAgICAgICA6IH5+YXJndW1lbnRzWzBdICsgdGhpcy5zY3JvbGxMZWZ0LFxuICAgICAgICAgIGFyZ3VtZW50c1swXS50b3AgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyB+fmFyZ3VtZW50c1swXS50b3AgKyB0aGlzLnNjcm9sbFRvcFxuICAgICAgICAgICAgOiB+fmFyZ3VtZW50c1sxXSArIHRoaXMuc2Nyb2xsVG9wXG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB0aGlzLnNjcm9sbCh7XG4gICAgICAgIGxlZnQ6IH5+YXJndW1lbnRzWzBdLmxlZnQgKyB0aGlzLnNjcm9sbExlZnQsXG4gICAgICAgIHRvcDogfn5hcmd1bWVudHNbMF0udG9wICsgdGhpcy5zY3JvbGxUb3AsXG4gICAgICAgIGJlaGF2aW9yOiBhcmd1bWVudHNbMF0uYmVoYXZpb3JcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICAvLyBFbGVtZW50LnByb3RvdHlwZS5zY3JvbGxJbnRvVmlld1xuICAgIEVsZW1lbnQucHJvdG90eXBlLnNjcm9sbEludG9WaWV3ID0gZnVuY3Rpb24oKSB7XG4gICAgICAvLyBhdm9pZCBzbW9vdGggYmVoYXZpb3IgaWYgbm90IHJlcXVpcmVkXG4gICAgICBpZiAoc2hvdWxkQmFpbE91dChhcmd1bWVudHNbMF0pID09PSB0cnVlKSB7XG4gICAgICAgIG9yaWdpbmFsLnNjcm9sbEludG9WaWV3LmNhbGwoXG4gICAgICAgICAgdGhpcyxcbiAgICAgICAgICBhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCA/IHRydWUgOiBhcmd1bWVudHNbMF1cbiAgICAgICAgKTtcblxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIExFVCBUSEUgU01PT1RITkVTUyBCRUdJTiFcbiAgICAgIHZhciBzY3JvbGxhYmxlUGFyZW50ID0gZmluZFNjcm9sbGFibGVQYXJlbnQodGhpcyk7XG4gICAgICB2YXIgcGFyZW50UmVjdHMgPSBzY3JvbGxhYmxlUGFyZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgdmFyIGNsaWVudFJlY3RzID0gdGhpcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcblxuICAgICAgaWYgKHNjcm9sbGFibGVQYXJlbnQgIT09IGQuYm9keSkge1xuICAgICAgICAvLyByZXZlYWwgZWxlbWVudCBpbnNpZGUgcGFyZW50XG4gICAgICAgIHNtb290aFNjcm9sbC5jYWxsKFxuICAgICAgICAgIHRoaXMsXG4gICAgICAgICAgc2Nyb2xsYWJsZVBhcmVudCxcbiAgICAgICAgICBzY3JvbGxhYmxlUGFyZW50LnNjcm9sbExlZnQgKyBjbGllbnRSZWN0cy5sZWZ0IC0gcGFyZW50UmVjdHMubGVmdCxcbiAgICAgICAgICBzY3JvbGxhYmxlUGFyZW50LnNjcm9sbFRvcCArIGNsaWVudFJlY3RzLnRvcCAtIHBhcmVudFJlY3RzLnRvcFxuICAgICAgICApO1xuXG4gICAgICAgIC8vIHJldmVhbCBwYXJlbnQgaW4gdmlld3BvcnQgdW5sZXNzIGlzIGZpeGVkXG4gICAgICAgIGlmICh3LmdldENvbXB1dGVkU3R5bGUoc2Nyb2xsYWJsZVBhcmVudCkucG9zaXRpb24gIT09ICdmaXhlZCcpIHtcbiAgICAgICAgICB3LnNjcm9sbEJ5KHtcbiAgICAgICAgICAgIGxlZnQ6IHBhcmVudFJlY3RzLmxlZnQsXG4gICAgICAgICAgICB0b3A6IHBhcmVudFJlY3RzLnRvcCxcbiAgICAgICAgICAgIGJlaGF2aW9yOiAnc21vb3RoJ1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyByZXZlYWwgZWxlbWVudCBpbiB2aWV3cG9ydFxuICAgICAgICB3LnNjcm9sbEJ5KHtcbiAgICAgICAgICBsZWZ0OiBjbGllbnRSZWN0cy5sZWZ0LFxuICAgICAgICAgIHRvcDogY2xpZW50UmVjdHMudG9wLFxuICAgICAgICAgIGJlaGF2aW9yOiAnc21vb3RoJ1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgaWYgKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykge1xuICAgIC8vIGNvbW1vbmpzXG4gICAgbW9kdWxlLmV4cG9ydHMgPSB7IHBvbHlmaWxsOiBwb2x5ZmlsbCB9O1xuICB9IGVsc2Uge1xuICAgIC8vIGdsb2JhbFxuICAgIHBvbHlmaWxsKCk7XG4gIH1cblxufSgpKTtcbiIsImNvbnN0IERCID0gJ2h0dHBzOi8vbmV4dXMtY2F0YWxvZy5maXJlYmFzZWlvLmNvbS9wb3N0cy5qc29uP2F1dGg9N2c3cHlLS3lrTjNONWV3ckltaE9hUzZ2d3JGc2M1Zktrcms4ZWp6Zic7XG5cbmNvbnN0ICRsb2FkaW5nID0gQXJyYXkuZnJvbShkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcubG9hZGluZycpKTtcbmNvbnN0ICRhcnRpY2xlTGlzdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdqcy1saXN0Jyk7XG5jb25zdCAkbmF2ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2pzLW5hdicpO1xuY29uc3QgJHBhcmFsbGF4ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnBhcmFsbGF4Jyk7XG5jb25zdCAkY29udGVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5jb250ZW50Jyk7XG5jb25zdCAkdGl0bGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnanMtdGl0bGUnKTtcbmNvbnN0ICR1cEFycm93ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2pzLWFycm93Jyk7XG5jb25zdCAkbW9kYWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcubW9kYWwnKTtcbmNvbnN0ICRsaWdodGJveCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5saWdodGJveCcpO1xuY29uc3QgJHZpZXcgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcubGlnaHRib3gtdmlldycpO1xuY29uc3Qgc29ydElkcyA9IFsnYXJ0aXN0JywgJ3RpdGxlJ107XG5cbmV4cG9ydCB7IFxuXHREQixcblx0JGxvYWRpbmcsXG5cdCRhcnRpY2xlTGlzdCwgXG5cdCRuYXYsIFxuXHQkcGFyYWxsYXgsXG5cdCRjb250ZW50LFxuXHQkdGl0bGUsXG5cdCR1cEFycm93LFxuXHQkbW9kYWwsXG5cdCRsaWdodGJveCxcblx0JHZpZXcsXG5cdHNvcnRJZHNcbn07IiwiaW1wb3J0IHNtb290aHNjcm9sbCBmcm9tICdzbW9vdGhzY3JvbGwtcG9seWZpbGwnO1xuXG5pbXBvcnQgeyBhcnRpY2xlVGVtcGxhdGUsIHJlbmRlck5hdkxnIH0gZnJvbSAnLi90ZW1wbGF0ZXMnO1xuaW1wb3J0IHsgZGVib3VuY2UsIGhpZGVMb2FkaW5nLCBzY3JvbGxUb1RvcCB9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHsgREIsICRhcnRpY2xlTGlzdCwgc29ydElkcyB9IGZyb20gJy4vY29uc3RhbnRzJztcbmltcG9ydCB7IGF0dGFjaE1vZGFsTGlzdGVuZXJzLCBhdHRhY2hVcEFycm93TGlzdGVuZXJzLCBhdHRhY2hJbWFnZUxpc3RlbmVycywgbWFrZUFscGhhYmV0LCBtYWtlU2xpZGVyIH0gZnJvbSAnLi9tb2R1bGVzJztcblxubGV0IHNvcnRLZXkgPSAwOyAvLyAwID0gYXJ0aXN0LCAxID0gdGl0bGVcbmxldCBlbnRyaWVzID0geyBieUF1dGhvcjogW10sIGJ5VGl0bGU6IFtdIH07XG5cbmNvbnN0IHNldFVwU29ydEJ1dHRvbnMgPSAoKSA9PiB7XG5cdHNvcnRJZHMuZm9yRWFjaChpZCA9PiB7XG5cdFx0Y29uc3QgYWx0ID0gaWQgPT09ICdhcnRpc3QnID8gJ3RpdGxlJyA6ICdhcnRpc3QnO1xuXG5cdFx0Y29uc3QgJGJ1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGBqcy1ieS0ke2lkfWApO1xuXHRcdGNvbnN0ICRhbHRCdXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChganMtYnktJHthbHR9YCk7XG5cblx0XHQkYnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuXHRcdFx0c2Nyb2xsVG9Ub3AoKTtcblx0XHRcdHNvcnRLZXkgPSAhc29ydEtleTtcblx0XHRcdHJlbmRlckVudHJpZXMoKTtcblxuXHRcdFx0JGJ1dHRvbi5jbGFzc0xpc3QuYWRkKCdhY3RpdmUnKTtcblx0XHRcdCRhbHRCdXR0b24uY2xhc3NMaXN0LnJlbW92ZSgnYWN0aXZlJyk7XG5cdFx0fSlcblx0fSk7XG59O1xuXG5jb25zdCByZW5kZXJFbnRyaWVzID0gKCkgPT4ge1xuXHRjb25zdCBlbnRyaWVzTGlzdCA9IHNvcnRLZXkgPyBlbnRyaWVzLmJ5VGl0bGUgOiBlbnRyaWVzLmJ5QXV0aG9yO1xuXG5cdCRhcnRpY2xlTGlzdC5pbm5lckhUTUwgPSAnJztcblxuXHRlbnRyaWVzTGlzdC5mb3JFYWNoKChlbnRyeSwgaSkgPT4ge1xuXHRcdCRhcnRpY2xlTGlzdC5pbnNlcnRBZGphY2VudEhUTUwoJ2JlZm9yZWVuZCcsIGFydGljbGVUZW1wbGF0ZShlbnRyeSwgaSkpO1xuXHRcdG1ha2VTbGlkZXIoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoYHNsaWRlci0ke2l9YCkpO1xuXHR9KTtcblxuXHRpZiAod2luZG93LnNjcmVlbi53aWR0aCA+IDc2OCkgYXR0YWNoSW1hZ2VMaXN0ZW5lcnMoKTtcblx0bWFrZUFscGhhYmV0KHNvcnRLZXkpO1xufTtcblxuY29uc3Qgc2V0RGF0YUFuZFNvcnRCeVRpdGxlID0gKGRhdGEpID0+IHtcblx0ZW50cmllcy5ieUF1dGhvciA9IGRhdGE7XG5cdGVudHJpZXMuYnlUaXRsZSA9IGRhdGEuc2xpY2UoKTsgLy8gY29waWVzIGRhdGEgZm9yIGJ5VGl0bGUgc29ydFxuXG5cdGVudHJpZXMuYnlUaXRsZS5zb3J0KChhLCBiKSA9PiB7XG5cdFx0bGV0IGFUaXRsZSA9IGEudGl0bGVbMF0udG9VcHBlckNhc2UoKTtcblx0XHRsZXQgYlRpdGxlID0gYi50aXRsZVswXS50b1VwcGVyQ2FzZSgpO1xuXHRcdGlmIChhVGl0bGUgPiBiVGl0bGUpIHJldHVybiAxO1xuXHRcdGVsc2UgaWYgKGFUaXRsZSA8IGJUaXRsZSkgcmV0dXJuIC0xO1xuXHRcdGVsc2UgcmV0dXJuIDA7XG5cdH0pO1xufTtcblxuY29uc3QgZmV0Y2hEYXRhID0gKCkgPT4ge1xuXHRmZXRjaChEQikudGhlbihyZXMgPT4gcmVzLmpzb24oKSlcblx0LnRoZW4oZGF0YSA9PiB7XG5cdFx0c2V0RGF0YUFuZFNvcnRCeVRpdGxlKGRhdGEpO1xuXHRcdHJlbmRlckVudHJpZXMoKTtcblx0XHRoaWRlTG9hZGluZygpO1xuXHR9KVxuXHQuY2F0Y2goZXJyID0+IGNvbnNvbGUud2FybihlcnIpKTtcbn07XG5cbmNvbnN0IGluaXQgPSAoKSA9PiB7XG5cdHNtb290aHNjcm9sbC5wb2x5ZmlsbCgpO1xuXHRmZXRjaERhdGEoKTtcblx0cmVuZGVyTmF2TGcoKTtcblx0c2V0VXBTb3J0QnV0dG9ucygpO1xuXHRhdHRhY2hVcEFycm93TGlzdGVuZXJzKCk7XG5cdGF0dGFjaE1vZGFsTGlzdGVuZXJzKCk7XG59O1xuXG5pbml0KCk7XG4iLCJpbXBvcnQgeyAkdmlldywgJGxpZ2h0Ym94IH0gZnJvbSAnLi4vY29uc3RhbnRzJztcblxubGV0IGxpZ2h0Ym94ID0gZmFsc2U7XG5sZXQgeDIgPSBmYWxzZTtcbmxldCB2aWV3Q2xhc3M7XG5cbmNvbnN0IGF0dGFjaEltYWdlTGlzdGVuZXJzID0gKCkgPT4ge1xuXHRjb25zdCAkaW1hZ2VzID0gQXJyYXkuZnJvbShkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuYXJ0aWNsZS1pbWFnZScpKTtcblxuXHQkaW1hZ2VzLmZvckVhY2goaW1nID0+IHtcblx0XHRpbWcuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZXZ0KSA9PiB7XG5cdFx0XHRpZiAoIWxpZ2h0Ym94KSB7XG5cdFx0XHRcdCRsaWdodGJveC5jbGFzc0xpc3QuYWRkKCdzaG93LWltZycpO1xuXHRcdFx0XHQkdmlldy5zcmMgPSBpbWcuc3JjO1xuXHRcdFx0XHRsaWdodGJveCA9IHRydWU7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0pO1xuXG5cdCRsaWdodGJveC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChldnQpID0+IHtcblx0XHRpZiAoZXZ0LnRhcmdldCA9PT0gJHZpZXcpIHJldHVybjtcblx0XHQkbGlnaHRib3guY2xhc3NMaXN0LnJlbW92ZSgnc2hvdy1pbWcnKTtcblx0XHRsaWdodGJveCA9IGZhbHNlO1xuXHR9KTtcblxuXHQkdmlldy5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHRpZiAoIXgyKSB7XG5cdFx0XHR2aWV3Q2xhc3MgPSAkdmlldy53aWR0aCA8IHdpbmRvdy5pbm5lcldpZHRoID8gJ3ZpZXcteDItLXNtJyA6ICd2aWV3LXgyJztcblx0XHRcdCR2aWV3LmNsYXNzTGlzdC5hZGQodmlld0NsYXNzKTtcblx0XHRcdHNldFRpbWVvdXQoKCkgPT4geDIgPSB0cnVlLCAzMDApO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQkdmlldy5jbGFzc0xpc3QucmVtb3ZlKHZpZXdDbGFzcyk7XG5cdFx0XHQkbGlnaHRib3guY2xhc3NMaXN0LnJlbW92ZSgnc2hvdy1pbWcnKTtcblx0XHRcdHgyID0gZmFsc2U7XG5cdFx0XHRsaWdodGJveCA9IGZhbHNlO1xuXHRcdH1cblx0fSk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCBhdHRhY2hJbWFnZUxpc3RlbmVyczsiLCJpbXBvcnQgeyAkbW9kYWwgfSBmcm9tICcuLi9jb25zdGFudHMnO1xuXG5sZXQgbW9kYWwgPSBmYWxzZTtcbmNvbnN0IGF0dGFjaE1vZGFsTGlzdGVuZXJzID0gKCkgPT4ge1xuXHRjb25zdCAkZmluZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdqcy1maW5kJyk7XG5cdFxuXHQkZmluZC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHQkbW9kYWwuY2xhc3NMaXN0LmFkZCgnc2hvdycpO1xuXHRcdG1vZGFsID0gdHJ1ZTtcblx0fSk7XG5cblx0JG1vZGFsLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuXHRcdCRtb2RhbC5jbGFzc0xpc3QucmVtb3ZlKCdzaG93Jyk7XG5cdFx0bW9kYWwgPSBmYWxzZTtcblx0fSk7XG5cblx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCAoKSA9PiB7XG5cdFx0aWYgKG1vZGFsKSB7XG5cdFx0XHRzZXRUaW1lb3V0KCgpID0+IHtcblx0XHRcdFx0JG1vZGFsLmNsYXNzTGlzdC5yZW1vdmUoJ3Nob3cnKTtcblx0XHRcdFx0bW9kYWwgPSBmYWxzZTtcblx0XHRcdH0sIDYwMCk7XG5cdFx0fTtcblx0fSk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCBhdHRhY2hNb2RhbExpc3RlbmVyczsiLCJpbXBvcnQgeyAkdGl0bGUsICRwYXJhbGxheCwgJHVwQXJyb3cgfSBmcm9tICcuLi9jb25zdGFudHMnO1xuaW1wb3J0IHsgc2Nyb2xsVG9Ub3AgfSBmcm9tICcuLi91dGlscyc7XG5cbmxldCBwcmV2O1xubGV0IGN1cnJlbnQgPSAwO1xubGV0IGlzU2hvd2luZyA9IGZhbHNlO1xuXG5jb25zdCBhdHRhY2hVcEFycm93TGlzdGVuZXJzID0gKCkgPT4ge1xuXHQkcGFyYWxsYXguYWRkRXZlbnRMaXN0ZW5lcignc2Nyb2xsJywgKCkgPT4ge1xuXHRcdGxldCB5ID0gJHRpdGxlLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLnk7XG5cblx0XHRpZiAoY3VycmVudCAhPT0geSkge1xuXHRcdFx0cHJldiA9IGN1cnJlbnQ7XG5cdFx0XHRjdXJyZW50ID0geTtcblx0XHR9O1xuXG5cdFx0aWYgKHkgPD0gLTUwICYmICFpc1Nob3dpbmcpIHtcblx0XHRcdCR1cEFycm93LmNsYXNzTGlzdC5hZGQoJ3Nob3cnKTtcblx0XHRcdGlzU2hvd2luZyA9IHRydWU7XG5cdFx0fSBlbHNlIGlmICh5ID4gLTUwICYmIGlzU2hvd2luZykge1xuXHRcdFx0JHVwQXJyb3cuY2xhc3NMaXN0LnJlbW92ZSgnc2hvdycpO1xuXHRcdFx0aXNTaG93aW5nID0gZmFsc2U7XG5cdFx0fVxuXHR9KTtcblxuXHQkdXBBcnJvdy5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHNjcm9sbFRvVG9wKCkpO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgYXR0YWNoVXBBcnJvd0xpc3RlbmVyczsiLCJpbXBvcnQgYXR0YWNoTW9kYWxMaXN0ZW5lcnMgZnJvbSAnLi9hdHRhY2hNb2RhbExpc3RlbmVycyc7XG5pbXBvcnQgYXR0YWNoVXBBcnJvd0xpc3RlbmVycyBmcm9tICcuL2F0dGFjaFVwQXJyb3dMaXN0ZW5lcnMnO1xuaW1wb3J0IGF0dGFjaEltYWdlTGlzdGVuZXJzIGZyb20gJy4vYXR0YWNoSW1hZ2VMaXN0ZW5lcnMnO1xuaW1wb3J0IG1ha2VBbHBoYWJldCBmcm9tICcuL21ha2VBbHBoYWJldCc7XG5pbXBvcnQgbWFrZVNsaWRlciBmcm9tICcuL21ha2VTbGlkZXInO1xuXG5leHBvcnQgeyBcblx0YXR0YWNoTW9kYWxMaXN0ZW5lcnMsIFxuXHRhdHRhY2hVcEFycm93TGlzdGVuZXJzLFxuXHRhdHRhY2hJbWFnZUxpc3RlbmVycyxcblx0bWFrZUFscGhhYmV0LCBcblx0bWFrZVNsaWRlciBcbn07IiwiY29uc3QgYWxwaGFiZXQgPSBbJ2EnLCAnYicsICdjJywgJ2QnLCAnZScsICdmJywgJ2cnLCAnaCcsICdpJywgJ2onLCAnaycsICdsJywgJ20nLCAnbicsICdvJywgJ3AnLCAncicsICdzJywgJ3QnLCAndScsICd2JywgJ3cnLCAneScsICd6J107XG5cbmNvbnN0IG1ha2VBbHBoYWJldCA9IChzb3J0S2V5KSA9PiB7XG5cdGNvbnN0IGZpbmRGaXJzdEVudHJ5ID0gKGNoYXIpID0+IHtcblx0XHRjb25zdCBzZWxlY3RvciA9IHNvcnRLZXkgPyAnLmpzLWVudHJ5LXRpdGxlJyA6ICcuanMtZW50cnktYXJ0aXN0Jztcblx0XHRjb25zdCBwcmV2U2VsZWN0b3IgPSAhc29ydEtleSA/ICcuanMtZW50cnktdGl0bGUnIDogJy5qcy1lbnRyeS1hcnRpc3QnO1xuXG5cdFx0Y29uc3QgJGVudHJpZXMgPSBBcnJheS5mcm9tKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpKTtcblx0XHRjb25zdCAkcHJldkVudHJpZXMgPSBBcnJheS5mcm9tKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwocHJldlNlbGVjdG9yKSk7XG5cblx0XHQkcHJldkVudHJpZXMuZm9yRWFjaChlbnRyeSA9PiBlbnRyeS5yZW1vdmVBdHRyaWJ1dGUoJ25hbWUnKSk7XG5cblx0XHRyZXR1cm4gJGVudHJpZXMuZmluZChlbnRyeSA9PiB7XG5cdFx0XHRsZXQgbm9kZSA9IGVudHJ5Lm5leHRFbGVtZW50U2libGluZztcblx0XHRcdHJldHVybiBub2RlLmlubmVySFRNTFswXSA9PT0gY2hhciB8fCBub2RlLmlubmVySFRNTFswXSA9PT0gY2hhci50b1VwcGVyQ2FzZSgpO1xuXHRcdH0pO1xuXHR9O1xuXG5cdGNvbnN0IGF0dGFjaEFuY2hvckxpc3RlbmVyID0gKCRhbmNob3IsIGxldHRlcikgPT4ge1xuXHRcdCRhbmNob3IuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG5cdFx0XHRjb25zdCBsZXR0ZXJOb2RlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQobGV0dGVyKTtcblx0XHRcdGxldCB0YXJnZXQ7XG5cblx0XHRcdGlmICghc29ydEtleSkge1xuXHRcdFx0XHR0YXJnZXQgPSBsZXR0ZXIgPT09ICdhJyA/IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhbmNob3ItdGFyZ2V0JykgOiBsZXR0ZXJOb2RlLnBhcmVudEVsZW1lbnQucGFyZW50RWxlbWVudC5wYXJlbnRFbGVtZW50LnBhcmVudEVsZW1lbnQucHJldmlvdXNFbGVtZW50U2libGluZy5xdWVyeVNlbGVjdG9yKCcuanMtYXJ0aWNsZS1hbmNob3ItdGFyZ2V0Jyk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0YXJnZXQgPSBsZXR0ZXIgPT09ICdhJyA/IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhbmNob3ItdGFyZ2V0JykgOiBsZXR0ZXJOb2RlLnBhcmVudEVsZW1lbnQucGFyZW50RWxlbWVudC5wYXJlbnRFbGVtZW50LnByZXZpb3VzRWxlbWVudFNpYmxpbmcucXVlcnlTZWxlY3RvcignLmpzLWFydGljbGUtYW5jaG9yLXRhcmdldCcpO1xuXHRcdFx0fTtcblxuXHRcdFx0dGFyZ2V0LnNjcm9sbEludG9WaWV3KHtiZWhhdmlvcjogXCJzbW9vdGhcIiwgYmxvY2s6IFwic3RhcnRcIn0pO1xuXHRcdH0pO1xuXHR9O1xuXG5cdGxldCBhY3RpdmVFbnRyaWVzID0ge307XG5cdGxldCAkb3V0ZXIgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuYWxwaGFiZXRfX2xldHRlcnMnKTtcblx0JG91dGVyLmlubmVySFRNTCA9ICcnO1xuXG5cdGFscGhhYmV0LmZvckVhY2gobGV0dGVyID0+IHtcblx0XHRsZXQgJGZpcnN0RW50cnkgPSBmaW5kRmlyc3RFbnRyeShsZXR0ZXIpO1xuXHRcdGxldCAkYW5jaG9yID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuXG5cdFx0aWYgKCEkZmlyc3RFbnRyeSkgcmV0dXJuO1xuXG5cdFx0JGZpcnN0RW50cnkuaWQgPSBsZXR0ZXI7XG5cdFx0JGFuY2hvci5pbm5lckhUTUwgPSBsZXR0ZXIudG9VcHBlckNhc2UoKTtcblx0XHQkYW5jaG9yLmNsYXNzTmFtZSA9ICdhbHBoYWJldF9fbGV0dGVyLWFuY2hvcic7XG5cblx0XHRhdHRhY2hBbmNob3JMaXN0ZW5lcigkYW5jaG9yLCBsZXR0ZXIpO1xuXHRcdCRvdXRlci5hcHBlbmRDaGlsZCgkYW5jaG9yKTtcblx0fSk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCBtYWtlQWxwaGFiZXQ7IiwiY29uc3QgbWFrZVNsaWRlciA9ICgkc2xpZGVyKSA9PiB7XG5cdGNvbnN0ICRhcnJvd05leHQgPSAkc2xpZGVyLnBhcmVudEVsZW1lbnQucXVlcnlTZWxlY3RvcignLmFycm93LW5leHQnKTtcblx0Y29uc3QgJGFycm93UHJldiA9ICRzbGlkZXIucGFyZW50RWxlbWVudC5xdWVyeVNlbGVjdG9yKCcuYXJyb3ctcHJldicpO1xuXG5cdGxldCBjdXJyZW50ID0gJHNsaWRlci5maXJzdEVsZW1lbnRDaGlsZDtcblx0JGFycm93TmV4dC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcblx0XHRjb25zdCBuZXh0ID0gY3VycmVudC5uZXh0RWxlbWVudFNpYmxpbmc7XG5cdFx0aWYgKG5leHQpIHtcblx0XHRcdG5leHQuc2Nyb2xsSW50b1ZpZXcoe2JlaGF2aW9yOiBcInNtb290aFwiLCBibG9jazogXCJuZWFyZXN0XCIsIGlubGluZTogXCJjZW50ZXJcIn0pO1xuXHRcdFx0Y3VycmVudCA9IG5leHQ7XG5cdFx0fVxuXHR9KTtcblxuXHQkYXJyb3dQcmV2LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuXHRcdGNvbnN0IHByZXYgPSBjdXJyZW50LnByZXZpb3VzRWxlbWVudFNpYmxpbmc7XG5cdFx0aWYgKHByZXYpIHtcblx0XHRcdHByZXYuc2Nyb2xsSW50b1ZpZXcoe2JlaGF2aW9yOiBcInNtb290aFwiLCBibG9jazogXCJuZWFyZXN0XCIsIGlubGluZTogXCJjZW50ZXJcIn0pO1xuXHRcdFx0Y3VycmVudCA9IHByZXY7XG5cdFx0fVxuXHR9KVxufTtcblxuZXhwb3J0IGRlZmF1bHQgbWFrZVNsaWRlcjsiLCJjb25zdCBpbWFnZVRlbXBsYXRlID0gKGltYWdlKSA9PiBgXG48ZGl2IGNsYXNzPVwiYXJ0aWNsZS1pbWFnZV9fb3V0ZXJcIj5cblx0PGltZyBjbGFzcz1cImFydGljbGUtaW1hZ2VcIiBzcmM9XCIuLi8uLi9hc3NldHMvaW1hZ2VzLyR7aW1hZ2V9XCI+PC9pbWc+XG48L2Rpdj5cbmA7XG5cbmNvbnN0IGFydGljbGVUZW1wbGF0ZSA9IChlbnRyeSwgaSkgPT4ge1xuXHRjb25zdCB7IHRpdGxlLCBmaXJzdE5hbWUsIGxhc3ROYW1lLCBpbWFnZXMsIGRlc2NyaXB0aW9uLCBjb250ZW50cywgZGltZW5zaW9ucywgeWVhciwgaXNibiwgbGluayB9ID0gZW50cnk7XG5cblx0Y29uc3QgaW1hZ2VIVE1MID0gaW1hZ2VzLmxlbmd0aCA/IFxuXHRcdGltYWdlcy5tYXAoaW1hZ2UgPT4gaW1hZ2VUZW1wbGF0ZShpbWFnZSkpLmpvaW4oJycpIDogJyc7XG5cblx0cmV0dXJuICBgXG5cdFx0PGFydGljbGUgY2xhc3M9XCJhcnRpY2xlX19vdXRlclwiPlxuXHRcdFx0PGRpdiBjbGFzcz1cImFydGljbGVfX2lubmVyXCI+XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlX19oZWFkaW5nXCI+XG5cdFx0XHRcdFx0PGEgY2xhc3M9XCJqcy1lbnRyeS10aXRsZVwiPjwvYT5cblx0XHRcdFx0XHQ8aDIgY2xhc3M9XCJhcnRpY2xlLWhlYWRpbmdfX3RpdGxlXCI+JHt0aXRsZX08L2gyPlxuXHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlLWhlYWRpbmdfX25hbWVcIj5cblx0XHRcdFx0XHRcdDxzcGFuIGNsYXNzPVwiYXJ0aWNsZS1oZWFkaW5nX19uYW1lLS1maXJzdFwiPiR7Zmlyc3ROYW1lfTwvc3Bhbj5cblx0XHRcdFx0XHRcdDxhIGNsYXNzPVwianMtZW50cnktYXJ0aXN0XCI+PC9hPlxuXHRcdFx0XHRcdFx0PHNwYW4gY2xhc3M9XCJhcnRpY2xlLWhlYWRpbmdfX25hbWUtLWxhc3RcIj4ke2xhc3ROYW1lfTwvc3Bhbj5cblx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0PC9kaXY+XHRcblx0XHRcdFx0PGRpdiBjbGFzcz1cImFydGljbGVfX3NsaWRlci1vdXRlclwiPlxuXHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlX19zbGlkZXItaW5uZXJcIiBpZD1cInNsaWRlci0ke2l9XCI+XG5cdFx0XHRcdFx0XHQke2ltYWdlSFRNTH1cblx0XHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlLWRlc2NyaXB0aW9uX19vdXRlclwiPlxuXHRcdFx0XHRcdFx0XHQ8ZGl2IGNsYXNzPVwiYXJ0aWNsZS1kZXNjcmlwdGlvblwiPiR7ZGVzY3JpcHRpb259PC9kaXY+XG5cdFx0XHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlLWRldGFpbFwiPiR7Y29udGVudHN9PC9kaXY+XG5cdFx0XHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlLWRldGFpbCBhcnRpY2xlLWRldGFpbC0tbWFyZ2luXCI+JHtkaW1lbnNpb25zfTwvZGl2PlxuXHRcdFx0XHRcdFx0XHQ8ZGl2IGNsYXNzPVwiYXJ0aWNsZS1kZXRhaWwgYXJ0aWNsZS1kZXRhaWwtLW1hcmdpblwiPiR7eWVhcn08L2Rpdj5cblx0XHRcdFx0XHRcdFx0PGEgY2xhc3M9XCJhcnRpY2xlLWRldGFpbCBhcnRpY2xlLWRldGFpbC0tbGlua1wiIHRhcmdldD1cIl9ibGFua1wiIGhyZWY9XCIke2xpbmt9XCI+JHtpc2JufTwvYT5cblx0XHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJhcnRpY2xlX19zY3JvbGwtY29udHJvbHNcIj5cblx0XHRcdFx0XHRcdDxzcGFuIGNsYXNzPVwiY29udHJvbHMgYXJyb3ctcHJldlwiPuKGkDwvc3Bhbj4gXG5cdFx0XHRcdFx0XHQ8c3BhbiBjbGFzcz1cImNvbnRyb2xzIGFycm93LW5leHRcIj7ihpI8L3NwYW4+XG5cdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdFx0PHAgY2xhc3M9XCJqcy1hcnRpY2xlLWFuY2hvci10YXJnZXRcIj48L3A+XG5cdFx0XHQ8L2Rpdj5cblx0XHQ8L2FydGljbGU+XG5cdGBcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGFydGljbGVUZW1wbGF0ZTsiLCJpbXBvcnQgYXJ0aWNsZVRlbXBsYXRlIGZyb20gJy4vYXJ0aWNsZSc7XG5pbXBvcnQgcmVuZGVyTmF2TGcgZnJvbSAnLi9uYXZMZyc7XG5cbmV4cG9ydCB7IGFydGljbGVUZW1wbGF0ZSwgcmVuZGVyTmF2TGcgfTsiLCJjb25zdCB0ZW1wbGF0ZSA9IFxuXHRgPGRpdiBjbGFzcz1cIm5hdl9faW5uZXJcIj5cblx0XHQ8ZGl2IGNsYXNzPVwibmF2X19zb3J0LWJ5XCI+XG5cdFx0XHQ8c3BhbiBjbGFzcz1cInNvcnQtYnlfX3RpdGxlXCI+U29ydCBieTwvc3Bhbj5cblx0XHRcdDxidXR0b24gY2xhc3M9XCJzb3J0LWJ5IHNvcnQtYnlfX2J5LWFydGlzdCBhY3RpdmVcIiBpZD1cImpzLWJ5LWFydGlzdFwiPkFydGlzdDwvYnV0dG9uPlxuXHRcdFx0PHNwYW4gY2xhc3M9XCJzb3J0LWJ5X19kaXZpZGVyXCI+IHwgPC9zcGFuPlxuXHRcdFx0PGJ1dHRvbiBjbGFzcz1cInNvcnQtYnkgc29ydC1ieV9fYnktdGl0bGVcIiBpZD1cImpzLWJ5LXRpdGxlXCI+VGl0bGU8L2J1dHRvbj5cblx0XHRcdDxzcGFuIGNsYXNzPVwiZmluZFwiIGlkPVwianMtZmluZFwiPlxuXHRcdFx0XHQoPHNwYW4gY2xhc3M9XCJmaW5kLS1pbm5lclwiPiYjODk4NDtGPC9zcGFuPilcblx0XHRcdDwvc3Bhbj5cblx0XHQ8L2Rpdj5cblx0XHQ8ZGl2IGNsYXNzPVwibmF2X19hbHBoYWJldFwiPlxuXHRcdFx0PHNwYW4gY2xhc3M9XCJhbHBoYWJldF9fdGl0bGVcIj5HbyB0bzwvc3Bhbj5cblx0XHRcdDxkaXYgY2xhc3M9XCJhbHBoYWJldF9fbGV0dGVyc1wiPjwvZGl2PlxuXHRcdDwvZGl2PlxuXHQ8L2Rpdj5gO1xuXG5jb25zdCByZW5kZXJOYXZMZyA9ICgpID0+IHtcblx0bGV0IG5hdk91dGVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2pzLW5hdicpO1xuXHRuYXZPdXRlci5pbm5lckhUTUwgPSB0ZW1wbGF0ZTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHJlbmRlck5hdkxnOyIsImltcG9ydCB7ICRsb2FkaW5nLCAkbmF2LCAkcGFyYWxsYXgsICRjb250ZW50LCAkdGl0bGUsICRhcnJvdywgJG1vZGFsLCAkbGlnaHRib3gsICR2aWV3IH0gZnJvbSAnLi4vY29uc3RhbnRzJztcblxuY29uc3QgZGVib3VuY2UgPSAoZm4sIHRpbWUpID0+IHtcbiAgbGV0IHRpbWVvdXQ7XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIGNvbnN0IGZ1bmN0aW9uQ2FsbCA9ICgpID0+IGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgXG4gICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uQ2FsbCwgdGltZSk7XG4gIH1cbn07XG5cbmNvbnN0IGhpZGVMb2FkaW5nID0gKCkgPT4ge1xuXHQkbG9hZGluZy5mb3JFYWNoKGVsZW0gPT4gZWxlbS5jbGFzc0xpc3QuYWRkKCdyZWFkeScpKTtcblx0JG5hdi5jbGFzc0xpc3QuYWRkKCdyZWFkeScpO1xufTtcblxuY29uc3Qgc2Nyb2xsVG9Ub3AgPSAoKSA9PiB7XG5cdGxldCB0b3AgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYW5jaG9yLXRhcmdldCcpO1xuXHR0b3Auc2Nyb2xsSW50b1ZpZXcoe2JlaGF2aW9yOiBcInNtb290aFwiLCBibG9jazogXCJzdGFydFwifSk7XG59O1xuXG5leHBvcnQgeyBkZWJvdW5jZSwgaGlkZUxvYWRpbmcsIHNjcm9sbFRvVG9wIH07Il0sInByZUV4aXN0aW5nQ29tbWVudCI6Ii8vIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtjaGFyc2V0PXV0Zi04O2Jhc2U2NCxleUoyWlhKemFXOXVJam96TENKemIzVnlZMlZ6SWpwYkltNXZaR1ZmYlc5a2RXeGxjeTlpY205M2MyVnlMWEJoWTJzdlgzQnlaV3gxWkdVdWFuTWlMQ0p1YjJSbFgyMXZaSFZzWlhNdmMyMXZiM1JvYzJOeWIyeHNMWEJ2YkhsbWFXeHNMMlJwYzNRdmMyMXZiM1JvYzJOeWIyeHNMbXB6SWl3aWMzSmpMMnB6TDJOdmJuTjBZVzUwY3k1cWN5SXNJbk55WXk5cWN5OXBibVJsZUM1cWN5SXNJbk55WXk5cWN5OXRiMlIxYkdWekwyRjBkR0ZqYUVsdFlXZGxUR2x6ZEdWdVpYSnpMbXB6SWl3aWMzSmpMMnB6TDIxdlpIVnNaWE12WVhSMFlXTm9UVzlrWVd4TWFYTjBaVzVsY25NdWFuTWlMQ0p6Y21NdmFuTXZiVzlrZFd4bGN5OWhkSFJoWTJoVmNFRnljbTkzVEdsemRHVnVaWEp6TG1weklpd2ljM0pqTDJwekwyMXZaSFZzWlhNdmFXNWtaWGd1YW5NaUxDSnpjbU12YW5NdmJXOWtkV3hsY3k5dFlXdGxRV3h3YUdGaVpYUXVhbk1pTENKemNtTXZhbk12Ylc5a2RXeGxjeTl0WVd0bFUyeHBaR1Z5TG1weklpd2ljM0pqTDJwekwzUmxiWEJzWVhSbGN5OWhjblJwWTJ4bExtcHpJaXdpYzNKakwycHpMM1JsYlhCc1lYUmxjeTlwYm1SbGVDNXFjeUlzSW5OeVl5OXFjeTkwWlcxd2JHRjBaWE12Ym1GMlRHY3Vhbk1pTENKemNtTXZhbk12ZFhScGJITXZhVzVrWlhndWFuTWlYU3dpYm1GdFpYTWlPbHRkTENKdFlYQndhVzVuY3lJNklrRkJRVUU3UVVOQlFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk96czdPenM3TzBGRGRtSkJMRWxCUVUwc1MwRkJTeXdyUmtGQldEczdRVUZGUVN4SlFVRk5MRmRCUVZjc1RVRkJUU3hKUVVGT0xFTkJRVmNzVTBGQlV5eG5Ra0ZCVkN4RFFVRXdRaXhWUVVFeFFpeERRVUZZTEVOQlFXcENPMEZCUTBFc1NVRkJUU3hsUVVGbExGTkJRVk1zWTBGQlZDeERRVUYzUWl4VFFVRjRRaXhEUVVGeVFqdEJRVU5CTEVsQlFVMHNUMEZCVHl4VFFVRlRMR05CUVZRc1EwRkJkMElzVVVGQmVFSXNRMEZCWWp0QlFVTkJMRWxCUVUwc1dVRkJXU3hUUVVGVExHRkJRVlFzUTBGQmRVSXNWMEZCZGtJc1EwRkJiRUk3UVVGRFFTeEpRVUZOTEZkQlFWY3NVMEZCVXl4aFFVRlVMRU5CUVhWQ0xGVkJRWFpDTEVOQlFXcENPMEZCUTBFc1NVRkJUU3hUUVVGVExGTkJRVk1zWTBGQlZDeERRVUYzUWl4VlFVRjRRaXhEUVVGbU8wRkJRMEVzU1VGQlRTeFhRVUZYTEZOQlFWTXNZMEZCVkN4RFFVRjNRaXhWUVVGNFFpeERRVUZxUWp0QlFVTkJMRWxCUVUwc1UwRkJVeXhUUVVGVExHRkJRVlFzUTBGQmRVSXNVVUZCZGtJc1EwRkJaanRCUVVOQkxFbEJRVTBzV1VGQldTeFRRVUZUTEdGQlFWUXNRMEZCZFVJc1YwRkJka0lzUTBGQmJFSTdRVUZEUVN4SlFVRk5MRkZCUVZFc1UwRkJVeXhoUVVGVUxFTkJRWFZDTEdkQ1FVRjJRaXhEUVVGa08wRkJRMEVzU1VGQlRTeFZRVUZWTEVOQlFVTXNVVUZCUkN4RlFVRlhMRTlCUVZnc1EwRkJhRUk3TzFGQlIwTXNSU3hIUVVGQkxFVTdVVUZEUVN4UkxFZEJRVUVzVVR0UlFVTkJMRmtzUjBGQlFTeFpPMUZCUTBFc1NTeEhRVUZCTEVrN1VVRkRRU3hUTEVkQlFVRXNVenRSUVVOQkxGRXNSMEZCUVN4Uk8xRkJRMEVzVFN4SFFVRkJMRTA3VVVGRFFTeFJMRWRCUVVFc1VUdFJRVU5CTEUwc1IwRkJRU3hOTzFGQlEwRXNVeXhIUVVGQkxGTTdVVUZEUVN4TExFZEJRVUVzU3p0UlFVTkJMRThzUjBGQlFTeFBPenM3T3p0QlF6RkNSRHM3T3p0QlFVVkJPenRCUVVOQk96dEJRVU5CT3p0QlFVTkJPenM3TzBGQlJVRXNTVUZCU1N4VlFVRlZMRU5CUVdRc1F5eERRVUZwUWp0QlFVTnFRaXhKUVVGSkxGVkJRVlVzUlVGQlJTeFZRVUZWTEVWQlFWb3NSVUZCWjBJc1UwRkJVeXhGUVVGNlFpeEZRVUZrT3p0QlFVVkJMRWxCUVUwc2JVSkJRVzFDTEZOQlFXNUNMR2RDUVVGdFFpeEhRVUZOTzBGQlF6bENMRzlDUVVGUkxFOUJRVklzUTBGQlowSXNZMEZCVFR0QlFVTnlRaXhOUVVGTkxFMUJRVTBzVDBGQlR5eFJRVUZRTEVkQlFXdENMRTlCUVd4Q0xFZEJRVFJDTEZGQlFYaERPenRCUVVWQkxFMUJRVTBzVlVGQlZTeFRRVUZUTEdOQlFWUXNXVUZCYVVNc1JVRkJha01zUTBGQmFFSTdRVUZEUVN4TlFVRk5MR0ZCUVdFc1UwRkJVeXhqUVVGVUxGbEJRV2xETEVkQlFXcERMRU5CUVc1Q096dEJRVVZCTEZWQlFWRXNaMEpCUVZJc1EwRkJlVUlzVDBGQmVrSXNSVUZCYTBNc1dVRkJUVHRCUVVOMlF6dEJRVU5CTEdGQlFWVXNRMEZCUXl4UFFVRllPMEZCUTBFN08wRkJSVUVzVjBGQlVTeFRRVUZTTEVOQlFXdENMRWRCUVd4Q0xFTkJRWE5DTEZGQlFYUkNPMEZCUTBFc1kwRkJWeXhUUVVGWUxFTkJRWEZDTEUxQlFYSkNMRU5CUVRSQ0xGRkJRVFZDTzBGQlEwRXNSMEZRUkR0QlFWRkJMRVZCWkVRN1FVRmxRU3hEUVdoQ1JEczdRVUZyUWtFc1NVRkJUU3huUWtGQlowSXNVMEZCYUVJc1lVRkJaMElzUjBGQlRUdEJRVU16UWl4TFFVRk5MR05CUVdNc1ZVRkJWU3hSUVVGUkxFOUJRV3hDTEVkQlFUUkNMRkZCUVZFc1VVRkJlRVE3TzBGQlJVRXNlVUpCUVdFc1UwRkJZaXhIUVVGNVFpeEZRVUY2UWpzN1FVRkZRU3hoUVVGWkxFOUJRVm9zUTBGQmIwSXNWVUZCUXl4TFFVRkVMRVZCUVZFc1EwRkJVaXhGUVVGak8wRkJRMnBETERCQ1FVRmhMR3RDUVVGaUxFTkJRV2RETEZkQlFXaERMRVZCUVRaRExHZERRVUZuUWl4TFFVRm9RaXhGUVVGMVFpeERRVUYyUWl4RFFVRTNRenRCUVVOQkxESkNRVUZYTEZOQlFWTXNZMEZCVkN4aFFVRnJReXhEUVVGc1F5eERRVUZZTzBGQlEwRXNSVUZJUkRzN1FVRkxRU3hMUVVGSkxFOUJRVThzVFVGQlVDeERRVUZqTEV0QlFXUXNSMEZCYzBJc1IwRkJNVUlzUlVGQkswSTdRVUZETDBJc05FSkJRV0VzVDBGQllqdEJRVU5CTEVOQldrUTdPMEZCWTBFc1NVRkJUU3gzUWtGQmQwSXNVMEZCZUVJc2NVSkJRWGRDTEVOQlFVTXNTVUZCUkN4RlFVRlZPMEZCUTNaRExGTkJRVkVzVVVGQlVpeEhRVUZ0UWl4SlFVRnVRanRCUVVOQkxGTkJRVkVzVDBGQlVpeEhRVUZyUWl4TFFVRkxMRXRCUVV3c1JVRkJiRUlzUTBGR2RVTXNRMEZGVURzN1FVRkZhRU1zVTBGQlVTeFBRVUZTTEVOQlFXZENMRWxCUVdoQ0xFTkJRWEZDTEZWQlFVTXNRMEZCUkN4RlFVRkpMRU5CUVVvc1JVRkJWVHRCUVVNNVFpeE5RVUZKTEZOQlFWTXNSVUZCUlN4TFFVRkdMRU5CUVZFc1EwRkJVaXhGUVVGWExGZEJRVmdzUlVGQllqdEJRVU5CTEUxQlFVa3NVMEZCVXl4RlFVRkZMRXRCUVVZc1EwRkJVU3hEUVVGU0xFVkJRVmNzVjBGQldDeEZRVUZpTzBGQlEwRXNUVUZCU1N4VFFVRlRMRTFCUVdJc1JVRkJjVUlzVDBGQlR5eERRVUZRTEVOQlFYSkNMRXRCUTBzc1NVRkJTU3hUUVVGVExFMUJRV0lzUlVGQmNVSXNUMEZCVHl4RFFVRkRMRU5CUVZJc1EwRkJja0lzUzBGRFFTeFBRVUZQTEVOQlFWQTdRVUZEVEN4RlFVNUVPMEZCVDBFc1EwRllSRHM3UVVGaFFTeEpRVUZOTEZsQlFWa3NVMEZCV2l4VFFVRlpMRWRCUVUwN1FVRkRka0lzVDBGQlRTeGhRVUZPTEVWQlFWVXNTVUZCVml4RFFVRmxPMEZCUVVFc1UwRkJUeXhKUVVGSkxFbEJRVW9zUlVGQlVEdEJRVUZCTEVWQlFXWXNSVUZEUXl4SlFVUkVMRU5CUTAwc1owSkJRVkU3UVVGRFlpeDNRa0ZCYzBJc1NVRkJkRUk3UVVGRFFUdEJRVU5CTzBGQlEwRXNSVUZNUkN4RlFVMURMRXRCVGtRc1EwRk5UenRCUVVGQkxGTkJRVThzVVVGQlVTeEpRVUZTTEVOQlFXRXNSMEZCWWl4RFFVRlFPMEZCUVVFc1JVRk9VRHRCUVU5QkxFTkJVa1E3TzBGQlZVRXNTVUZCVFN4UFFVRlBMRk5CUVZBc1NVRkJUeXhIUVVGTk8wRkJRMnhDTEdkRFFVRmhMRkZCUVdJN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRXNRMEZRUkRzN1FVRlRRVHM3T3pzN096czdPMEZETVVWQk96dEJRVVZCTEVsQlFVa3NWMEZCVnl4TFFVRm1PMEZCUTBFc1NVRkJTU3hMUVVGTExFdEJRVlE3UVVGRFFTeEpRVUZKTEd0Q1FVRktPenRCUVVWQkxFbEJRVTBzZFVKQlFYVkNMRk5CUVhaQ0xHOUNRVUYxUWl4SFFVRk5PMEZCUTJ4RExFdEJRVTBzVlVGQlZTeE5RVUZOTEVsQlFVNHNRMEZCVnl4VFFVRlRMR2RDUVVGVUxFTkJRVEJDTEdkQ1FVRXhRaXhEUVVGWUxFTkJRV2hDT3p0QlFVVkJMRk5CUVZFc1QwRkJVaXhEUVVGblFpeGxRVUZQTzBGQlEzUkNMRTFCUVVrc1owSkJRVW9zUTBGQmNVSXNUMEZCY2tJc1JVRkJPRUlzVlVGQlF5eEhRVUZFTEVWQlFWTTdRVUZEZEVNc1QwRkJTU3hEUVVGRExGRkJRVXdzUlVGQlpUdEJRVU5rTEhsQ1FVRlZMRk5CUVZZc1EwRkJiMElzUjBGQmNFSXNRMEZCZDBJc1ZVRkJlRUk3UVVGRFFTeHhRa0ZCVFN4SFFVRk9MRWRCUVZrc1NVRkJTU3hIUVVGb1FqdEJRVU5CTEdWQlFWY3NTVUZCV0R0QlFVTkJPMEZCUTBRc1IwRk9SRHRCUVU5QkxFVkJVa1E3TzBGQlZVRXNjMEpCUVZVc1owSkJRVllzUTBGQk1rSXNUMEZCTTBJc1JVRkJiME1zVlVGQlF5eEhRVUZFTEVWQlFWTTdRVUZETlVNc1RVRkJTU3hKUVVGSkxFMUJRVW9zUzBGQlpTeG5Ra0ZCYmtJc1JVRkJNRUk3UVVGRE1VSXNkVUpCUVZVc1UwRkJWaXhEUVVGdlFpeE5RVUZ3UWl4RFFVRXlRaXhWUVVFelFqdEJRVU5CTEdGQlFWY3NTMEZCV0R0QlFVTkJMRVZCU2tRN08wRkJUVUVzYTBKQlFVMHNaMEpCUVU0c1EwRkJkVUlzVDBGQmRrSXNSVUZCWjBNc1dVRkJUVHRCUVVOeVF5eE5RVUZKTEVOQlFVTXNSVUZCVEN4RlFVRlRPMEZCUTFJc1pVRkJXU3hwUWtGQlRTeExRVUZPTEVkQlFXTXNUMEZCVHl4VlFVRnlRaXhIUVVGclF5eGhRVUZzUXl4SFFVRnJSQ3hUUVVFNVJEdEJRVU5CTEc5Q1FVRk5MRk5CUVU0c1EwRkJaMElzUjBGQmFFSXNRMEZCYjBJc1UwRkJjRUk3UVVGRFFTeGpRVUZYTzBGQlFVRXNWMEZCVFN4TFFVRkxMRWxCUVZnN1FVRkJRU3hKUVVGWUxFVkJRVFJDTEVkQlFUVkNPMEZCUTBFc1IwRktSQ3hOUVVsUE8wRkJRMDRzYjBKQlFVMHNVMEZCVGl4RFFVRm5RaXhOUVVGb1FpeERRVUYxUWl4VFFVRjJRanRCUVVOQkxIZENRVUZWTEZOQlFWWXNRMEZCYjBJc1RVRkJjRUlzUTBGQk1rSXNWVUZCTTBJN1FVRkRRU3hSUVVGTExFdEJRVXc3UVVGRFFTeGpRVUZYTEV0QlFWZzdRVUZEUVR0QlFVTkVMRVZCV0VRN1FVRlpRU3hEUVM5Q1JEczdhMEpCYVVObExHOUNPenM3T3pzN096czdRVU4yUTJZN08wRkJSVUVzU1VGQlNTeFJRVUZSTEV0QlFWbzdRVUZEUVN4SlFVRk5MSFZDUVVGMVFpeFRRVUYyUWl4dlFrRkJkVUlzUjBGQlRUdEJRVU5zUXl4TFFVRk5MRkZCUVZFc1UwRkJVeXhqUVVGVUxFTkJRWGRDTEZOQlFYaENMRU5CUVdRN08wRkJSVUVzVDBGQlRTeG5Ra0ZCVGl4RFFVRjFRaXhQUVVGMlFpeEZRVUZuUXl4WlFVRk5PMEZCUTNKRExHOUNRVUZQTEZOQlFWQXNRMEZCYVVJc1IwRkJha0lzUTBGQmNVSXNUVUZCY2tJN1FVRkRRU3hWUVVGUkxFbEJRVkk3UVVGRFFTeEZRVWhFT3p0QlFVdEJMRzFDUVVGUExHZENRVUZRTEVOQlFYZENMRTlCUVhoQ0xFVkJRV2xETEZsQlFVMDdRVUZEZEVNc2IwSkJRVThzVTBGQlVDeERRVUZwUWl4TlFVRnFRaXhEUVVGM1FpeE5RVUY0UWp0QlFVTkJMRlZCUVZFc1MwRkJVanRCUVVOQkxFVkJTRVE3TzBGQlMwRXNVVUZCVHl4blFrRkJVQ3hEUVVGM1FpeFRRVUY0UWl4RlFVRnRReXhaUVVGTk8wRkJRM2hETEUxQlFVa3NTMEZCU2l4RlFVRlhPMEZCUTFZc1kwRkJWeXhaUVVGTk8wRkJRMmhDTEhOQ1FVRlBMRk5CUVZBc1EwRkJhVUlzVFVGQmFrSXNRMEZCZDBJc1RVRkJlRUk3UVVGRFFTeFpRVUZSTEV0QlFWSTdRVUZEUVN4SlFVaEVMRVZCUjBjc1IwRklTRHRCUVVsQk8wRkJRMFFzUlVGUVJEdEJRVkZCTEVOQmNrSkVPenRyUWtGMVFtVXNiMEk3T3pzN096czdPenRCUXpGQ1pqczdRVUZEUVRzN1FVRkZRU3hKUVVGSkxHRkJRVW83UVVGRFFTeEpRVUZKTEZWQlFWVXNRMEZCWkR0QlFVTkJMRWxCUVVrc1dVRkJXU3hMUVVGb1FqczdRVUZGUVN4SlFVRk5MSGxDUVVGNVFpeFRRVUY2UWl4elFrRkJlVUlzUjBGQlRUdEJRVU53UXl4elFrRkJWU3huUWtGQlZpeERRVUV5UWl4UlFVRXpRaXhGUVVGeFF5eFpRVUZOTzBGQlF6RkRMRTFCUVVrc1NVRkJTU3hyUWtGQlR5eHhRa0ZCVUN4SFFVRXJRaXhEUVVGMlF6czdRVUZGUVN4TlFVRkpMRmxCUVZrc1EwRkJhRUlzUlVGQmJVSTdRVUZEYkVJc1ZVRkJUeXhQUVVGUU8wRkJRMEVzWVVGQlZTeERRVUZXTzBGQlEwRTdPMEZCUlVRc1RVRkJTU3hMUVVGTExFTkJRVU1zUlVGQlRpeEpRVUZaTEVOQlFVTXNVMEZCYWtJc1JVRkJORUk3UVVGRE0wSXNkVUpCUVZNc1UwRkJWQ3hEUVVGdFFpeEhRVUZ1UWl4RFFVRjFRaXhOUVVGMlFqdEJRVU5CTEdWQlFWa3NTVUZCV2p0QlFVTkJMRWRCU0VRc1RVRkhUeXhKUVVGSkxFbEJRVWtzUTBGQlF5eEZRVUZNTEVsQlFWY3NVMEZCWml4RlFVRXdRanRCUVVOb1F5eDFRa0ZCVXl4VFFVRlVMRU5CUVcxQ0xFMUJRVzVDTEVOQlFUQkNMRTFCUVRGQ08wRkJRMEVzWlVGQldTeExRVUZhTzBGQlEwRTdRVUZEUkN4RlFXWkVPenRCUVdsQ1FTeHhRa0ZCVXl4blFrRkJWQ3hEUVVFd1FpeFBRVUV4UWl4RlFVRnRRenRCUVVGQkxGTkJRVTBzZVVKQlFVNDdRVUZCUVN4RlFVRnVRenRCUVVOQkxFTkJia0pFT3p0clFrRnhRbVVzYzBJN096czdPenM3T3pzN1FVTTFRbVk3T3pzN1FVRkRRVHM3T3p0QlFVTkJPenM3TzBGQlEwRTdPenM3UVVGRFFUczdPenM3TzFGQlIwTXNiMElzUjBGQlFTdzRRanRSUVVOQkxITkNMRWRCUVVFc1owTTdVVUZEUVN4dlFpeEhRVUZCTERoQ08xRkJRMEVzV1N4SFFVRkJMSE5DTzFGQlEwRXNWU3hIUVVGQkxHOUNPenM3T3pzN096dEJRMWhFTEVsQlFVMHNWMEZCVnl4RFFVRkRMRWRCUVVRc1JVRkJUU3hIUVVGT0xFVkJRVmNzUjBGQldDeEZRVUZuUWl4SFFVRm9RaXhGUVVGeFFpeEhRVUZ5UWl4RlFVRXdRaXhIUVVFeFFpeEZRVUVyUWl4SFFVRXZRaXhGUVVGdlF5eEhRVUZ3UXl4RlFVRjVReXhIUVVGNlF5eEZRVUU0UXl4SFFVRTVReXhGUVVGdFJDeEhRVUZ1UkN4RlFVRjNSQ3hIUVVGNFJDeEZRVUUyUkN4SFFVRTNSQ3hGUVVGclJTeEhRVUZzUlN4RlFVRjFSU3hIUVVGMlJTeEZRVUUwUlN4SFFVRTFSU3hGUVVGcFJpeEhRVUZxUml4RlFVRnpSaXhIUVVGMFJpeEZRVUV5Uml4SFFVRXpSaXhGUVVGblJ5eEhRVUZvUnl4RlFVRnhSeXhIUVVGeVJ5eEZRVUV3Unl4SFFVRXhSeXhGUVVFclJ5eEhRVUV2Unl4RlFVRnZTQ3hIUVVGd1NDeERRVUZxUWpzN1FVRkZRU3hKUVVGTkxHVkJRV1VzVTBGQlppeFpRVUZsTEVOQlFVTXNUMEZCUkN4RlFVRmhPMEZCUTJwRExFdEJRVTBzYVVKQlFXbENMRk5CUVdwQ0xHTkJRV2xDTEVOQlFVTXNTVUZCUkN4RlFVRlZPMEZCUTJoRExFMUJRVTBzVjBGQlZ5eFZRVUZWTEdsQ1FVRldMRWRCUVRoQ0xHdENRVUV2UXp0QlFVTkJMRTFCUVUwc1pVRkJaU3hEUVVGRExFOUJRVVFzUjBGQlZ5eHBRa0ZCV0N4SFFVRXJRaXhyUWtGQmNFUTdPMEZCUlVFc1RVRkJUU3hYUVVGWExFMUJRVTBzU1VGQlRpeERRVUZYTEZOQlFWTXNaMEpCUVZRc1EwRkJNRUlzVVVGQk1VSXNRMEZCV0N4RFFVRnFRanRCUVVOQkxFMUJRVTBzWlVGQlpTeE5RVUZOTEVsQlFVNHNRMEZCVnl4VFFVRlRMR2RDUVVGVUxFTkJRVEJDTEZsQlFURkNMRU5CUVZnc1EwRkJja0k3TzBGQlJVRXNaVUZCWVN4UFFVRmlMRU5CUVhGQ08wRkJRVUVzVlVGQlV5eE5RVUZOTEdWQlFVNHNRMEZCYzBJc1RVRkJkRUlzUTBGQlZEdEJRVUZCTEVkQlFYSkNPenRCUVVWQkxGTkJRVThzVTBGQlV5eEpRVUZVTEVOQlFXTXNhVUpCUVZNN1FVRkROMElzVDBGQlNTeFBRVUZQTEUxQlFVMHNhMEpCUVdwQ08wRkJRMEVzVlVGQlR5eExRVUZMTEZOQlFVd3NRMEZCWlN4RFFVRm1MRTFCUVhOQ0xFbEJRWFJDTEVsQlFUaENMRXRCUVVzc1UwRkJUQ3hEUVVGbExFTkJRV1lzVFVGQmMwSXNTMEZCU3l4WFFVRk1MRVZCUVRORU8wRkJRMEVzUjBGSVRTeERRVUZRTzBGQlNVRXNSVUZpUkRzN1FVRmxRU3hMUVVGTkxIVkNRVUYxUWl4VFFVRjJRaXh2UWtGQmRVSXNRMEZCUXl4UFFVRkVMRVZCUVZVc1RVRkJWaXhGUVVGeFFqdEJRVU5xUkN4VlFVRlJMR2RDUVVGU0xFTkJRWGxDTEU5QlFYcENMRVZCUVd0RExGbEJRVTA3UVVGRGRrTXNUMEZCVFN4aFFVRmhMRk5CUVZNc1kwRkJWQ3hEUVVGM1FpeE5RVUY0UWl4RFFVRnVRanRCUVVOQkxFOUJRVWtzWlVGQlNqczdRVUZGUVN4UFFVRkpMRU5CUVVNc1QwRkJUQ3hGUVVGak8wRkJRMklzWVVGQlV5eFhRVUZYTEVkQlFWZ3NSMEZCYVVJc1UwRkJVeXhqUVVGVUxFTkJRWGRDTEdWQlFYaENMRU5CUVdwQ0xFZEJRVFJFTEZkQlFWY3NZVUZCV0N4RFFVRjVRaXhoUVVGNlFpeERRVUYxUXl4aFFVRjJReXhEUVVGeFJDeGhRVUZ5UkN4RFFVRnRSU3h6UWtGQmJrVXNRMEZCTUVZc1lVRkJNVVlzUTBGQmQwY3NNa0pCUVhoSExFTkJRWEpGTzBGQlEwRXNTVUZHUkN4TlFVVlBPMEZCUTA0c1lVRkJVeXhYUVVGWExFZEJRVmdzUjBGQmFVSXNVMEZCVXl4alFVRlVMRU5CUVhkQ0xHVkJRWGhDTEVOQlFXcENMRWRCUVRSRUxGZEJRVmNzWVVGQldDeERRVUY1UWl4aFFVRjZRaXhEUVVGMVF5eGhRVUYyUXl4RFFVRnhSQ3h6UWtGQmNrUXNRMEZCTkVVc1lVRkJOVVVzUTBGQk1FWXNNa0pCUVRGR0xFTkJRWEpGTzBGQlEwRTdPMEZCUlVRc1ZVRkJUeXhqUVVGUUxFTkJRWE5DTEVWQlFVTXNWVUZCVlN4UlFVRllMRVZCUVhGQ0xFOUJRVThzVDBGQk5VSXNSVUZCZEVJN1FVRkRRU3hIUVZoRU8wRkJXVUVzUlVGaVJEczdRVUZsUVN4TFFVRkpMR2RDUVVGblFpeEZRVUZ3UWp0QlFVTkJMRXRCUVVrc1UwRkJVeXhUUVVGVExHRkJRVlFzUTBGQmRVSXNiMEpCUVhaQ0xFTkJRV0k3UVVGRFFTeFJRVUZQTEZOQlFWQXNSMEZCYlVJc1JVRkJia0k3TzBGQlJVRXNWVUZCVXl4UFFVRlVMRU5CUVdsQ0xHdENRVUZWTzBGQlF6RkNMRTFCUVVrc1kwRkJZeXhsUVVGbExFMUJRV1lzUTBGQmJFSTdRVUZEUVN4TlFVRkpMRlZCUVZVc1UwRkJVeXhoUVVGVUxFTkJRWFZDTEVkQlFYWkNMRU5CUVdRN08wRkJSVUVzVFVGQlNTeERRVUZETEZkQlFVd3NSVUZCYTBJN08wRkJSV3hDTEdOQlFWa3NSVUZCV2l4SFFVRnBRaXhOUVVGcVFqdEJRVU5CTEZWQlFWRXNVMEZCVWl4SFFVRnZRaXhQUVVGUExGZEJRVkFzUlVGQmNFSTdRVUZEUVN4VlFVRlJMRk5CUVZJc1IwRkJiMElzZVVKQlFYQkNPenRCUVVWQkxIVkNRVUZ4UWl4UFFVRnlRaXhGUVVFNFFpeE5RVUU1UWp0QlFVTkJMRk5CUVU4c1YwRkJVQ3hEUVVGdFFpeFBRVUZ1UWp0QlFVTkJMRVZCV2tRN1FVRmhRU3hEUVdoRVJEczdhMEpCYTBSbExGazdPenM3T3pzN08wRkRjRVJtTEVsQlFVMHNZVUZCWVN4VFFVRmlMRlZCUVdFc1EwRkJReXhQUVVGRUxFVkJRV0U3UVVGREwwSXNTMEZCVFN4aFFVRmhMRkZCUVZFc1lVRkJVaXhEUVVGelFpeGhRVUYwUWl4RFFVRnZReXhoUVVGd1F5eERRVUZ1UWp0QlFVTkJMRXRCUVUwc1lVRkJZU3hSUVVGUkxHRkJRVklzUTBGQmMwSXNZVUZCZEVJc1EwRkJiME1zWVVGQmNFTXNRMEZCYmtJN08wRkJSVUVzUzBGQlNTeFZRVUZWTEZGQlFWRXNhVUpCUVhSQ08wRkJRMEVzV1VGQlZ5eG5Ra0ZCV0N4RFFVRTBRaXhQUVVFMVFpeEZRVUZ4UXl4WlFVRk5PMEZCUXpGRExFMUJRVTBzVDBGQlR5eFJRVUZSTEd0Q1FVRnlRanRCUVVOQkxFMUJRVWtzU1VGQlNpeEZRVUZWTzBGQlExUXNVVUZCU3l4alFVRk1MRU5CUVc5Q0xFVkJRVU1zVlVGQlZTeFJRVUZZTEVWQlFYRkNMRTlCUVU4c1UwRkJOVUlzUlVGQmRVTXNVVUZCVVN4UlFVRXZReXhGUVVGd1FqdEJRVU5CTEdGQlFWVXNTVUZCVmp0QlFVTkJPMEZCUTBRc1JVRk9SRHM3UVVGUlFTeFpRVUZYTEdkQ1FVRllMRU5CUVRSQ0xFOUJRVFZDTEVWQlFYRkRMRmxCUVUwN1FVRkRNVU1zVFVGQlRTeFBRVUZQTEZGQlFWRXNjMEpCUVhKQ08wRkJRMEVzVFVGQlNTeEpRVUZLTEVWQlFWVTdRVUZEVkN4UlFVRkxMR05CUVV3c1EwRkJiMElzUlVGQlF5eFZRVUZWTEZGQlFWZ3NSVUZCY1VJc1QwRkJUeXhUUVVFMVFpeEZRVUYxUXl4UlFVRlJMRkZCUVM5RExFVkJRWEJDTzBGQlEwRXNZVUZCVlN4SlFVRldPMEZCUTBFN1FVRkRSQ3hGUVU1RU8wRkJUMEVzUTBGd1FrUTdPMnRDUVhOQ1pTeFZPenM3T3pzN096dEJRM1JDWml4SlFVRk5MR2RDUVVGblFpeFRRVUZvUWl4aFFVRm5RaXhEUVVGRExFdEJRVVE3UVVGQlFTeDVSMEZGYVVNc1MwRkdha003UVVGQlFTeERRVUYwUWpzN1FVRk5RU3hKUVVGTkxHdENRVUZyUWl4VFFVRnNRaXhsUVVGclFpeERRVUZETEV0QlFVUXNSVUZCVVN4RFFVRlNMRVZCUVdNN1FVRkJRU3hMUVVNM1FpeExRVVEyUWl4SFFVTXJSQ3hMUVVRdlJDeERRVU0zUWl4TFFVUTJRanRCUVVGQkxFdEJRM1JDTEZOQlJITkNMRWRCUXl0RUxFdEJSQzlFTEVOQlEzUkNMRk5CUkhOQ08wRkJRVUVzUzBGRFdDeFJRVVJYTEVkQlF5dEVMRXRCUkM5RUxFTkJRMWdzVVVGRVZ6dEJRVUZCTEV0QlEwUXNUVUZFUXl4SFFVTXJSQ3hMUVVRdlJDeERRVU5FTEUxQlJFTTdRVUZCUVN4TFFVTlBMRmRCUkZBc1IwRkRLMFFzUzBGRUwwUXNRMEZEVHl4WFFVUlFPMEZCUVVFc1MwRkRiMElzVVVGRWNFSXNSMEZESzBRc1MwRkVMMFFzUTBGRGIwSXNVVUZFY0VJN1FVRkJRU3hMUVVNNFFpeFZRVVE1UWl4SFFVTXJSQ3hMUVVRdlJDeERRVU00UWl4VlFVUTVRanRCUVVGQkxFdEJRekJETEVsQlJERkRMRWRCUXl0RUxFdEJSQzlFTEVOQlF6QkRMRWxCUkRGRE8wRkJRVUVzUzBGRFowUXNTVUZFYUVRc1IwRkRLMFFzUzBGRUwwUXNRMEZEWjBRc1NVRkVhRVE3UVVGQlFTeExRVU56UkN4SlFVUjBSQ3hIUVVNclJDeExRVVF2UkN4RFFVTnpSQ3hKUVVSMFJEczdPMEZCUjNKRExFdEJRVTBzV1VGQldTeFBRVUZQTEUxQlFWQXNSMEZEYWtJc1QwRkJUeXhIUVVGUUxFTkJRVmM3UVVGQlFTeFRRVUZUTEdOQlFXTXNTMEZCWkN4RFFVRlVPMEZCUVVFc1JVRkJXQ3hGUVVFd1F5eEpRVUV4UXl4RFFVRXJReXhGUVVFdlF5eERRVVJwUWl4SFFVTnZReXhGUVVSMFJEczdRVUZIUVN4M1RrRkxlVU1zUzBGTWVrTXNjVWhCVDJ0RUxGTkJVR3hFTEc5SVFWTnBSQ3hSUVZScVJDd3dTa0ZoYjBRc1EwRmljRVFzZDBKQlkwOHNVMEZrVUN3clIwRm5RbmxETEZkQmFFSjZReXd3UkVGcFFtOURMRkZCYWtKd1F5eHBSa0ZyUWpKRUxGVkJiRUl6UkN4cFJrRnRRakpFTEVsQmJrSXpSQ3h0UjBGdlFqWkZMRWxCY0VJM1JTeFZRVzlDYzBZc1NVRndRblJHTzBGQkswSkJMRU5CY2tORU96dHJRa0YxUTJVc1pUczdPenM3T3pzN096dEJRemREWmpzN096dEJRVU5CT3pzN096czdVVUZGVXl4bExFZEJRVUVzYVVJN1VVRkJhVUlzVnl4SFFVRkJMR1U3T3pzN096czdPMEZEU0RGQ0xFbEJRVTBzYlcxQ1FVRk9PenRCUVdsQ1FTeEpRVUZOTEdOQlFXTXNVMEZCWkN4WFFVRmpMRWRCUVUwN1FVRkRla0lzUzBGQlNTeFhRVUZYTEZOQlFWTXNZMEZCVkN4RFFVRjNRaXhSUVVGNFFpeERRVUZtTzBGQlEwRXNWVUZCVXl4VFFVRlVMRWRCUVhGQ0xGRkJRWEpDTzBGQlEwRXNRMEZJUkRzN2EwSkJTMlVzVnpzN096czdPenM3T3p0QlEzUkNaanM3UVVGRlFTeEpRVUZOTEZkQlFWY3NVMEZCV0N4UlFVRlhMRU5CUVVNc1JVRkJSQ3hGUVVGTExFbEJRVXdzUlVGQll6dEJRVU0zUWl4TlFVRkpMR2RDUVVGS096dEJRVVZCTEZOQlFVOHNXVUZCVnp0QlFVRkJPMEZCUVVFN08wRkJRMmhDTEZGQlFVMHNaVUZCWlN4VFFVRm1MRmxCUVdVN1FVRkJRU3hoUVVGTkxFZEJRVWNzUzBGQlNDeERRVUZUTEV0QlFWUXNSVUZCWlN4VlFVRm1MRU5CUVU0N1FVRkJRU3hMUVVGeVFqczdRVUZGUVN4cFFrRkJZU3hQUVVGaU8wRkJRMEVzWTBGQlZTeFhRVUZYTEZsQlFWZ3NSVUZCZVVJc1NVRkJla0lzUTBGQlZqdEJRVU5FTEVkQlRFUTdRVUZOUkN4RFFWUkVPenRCUVZkQkxFbEJRVTBzWTBGQll5eFRRVUZrTEZkQlFXTXNSMEZCVFR0QlFVTjZRaXh6UWtGQlV5eFBRVUZVTEVOQlFXbENPMEZCUVVFc1YwRkJVU3hMUVVGTExGTkJRVXdzUTBGQlpTeEhRVUZtTEVOQlFXMUNMRTlCUVc1Q0xFTkJRVkk3UVVGQlFTeEhRVUZxUWp0QlFVTkJMR3RDUVVGTExGTkJRVXdzUTBGQlpTeEhRVUZtTEVOQlFXMUNMRTlCUVc1Q08wRkJRMEVzUTBGSVJEczdRVUZMUVN4SlFVRk5MR05CUVdNc1UwRkJaQ3hYUVVGakxFZEJRVTA3UVVGRGVrSXNUVUZCU1N4TlFVRk5MRk5CUVZNc1kwRkJWQ3hEUVVGM1FpeGxRVUY0UWl4RFFVRldPMEZCUTBFc1RVRkJTU3hqUVVGS0xFTkJRVzFDTEVWQlFVTXNWVUZCVlN4UlFVRllMRVZCUVhGQ0xFOUJRVThzVDBGQk5VSXNSVUZCYmtJN1FVRkRRU3hEUVVoRU96dFJRVXRUTEZFc1IwRkJRU3hSTzFGQlFWVXNWeXhIUVVGQkxGYzdVVUZCWVN4WExFZEJRVUVzVnlJc0ltWnBiR1VpT2lKblpXNWxjbUYwWldRdWFuTWlMQ0p6YjNWeVkyVlNiMjkwSWpvaUlpd2ljMjkxY21ObGMwTnZiblJsYm5RaU9sc2lLR1oxYm1OMGFXOXVLQ2w3Wm5WdVkzUnBiMjRnY2lobExHNHNkQ2w3Wm5WdVkzUnBiMjRnYnlocExHWXBlMmxtS0NGdVcybGRLWHRwWmlnaFpWdHBYU2w3ZG1GeUlHTTlYQ0ptZFc1amRHbHZibHdpUFQxMGVYQmxiMllnY21WeGRXbHlaU1ltY21WeGRXbHlaVHRwWmlnaFppWW1ZeWx5WlhSMWNtNGdZeWhwTENFd0tUdHBaaWgxS1hKbGRIVnliaUIxS0drc0lUQXBPM1poY2lCaFBXNWxkeUJGY25KdmNpaGNJa05oYm01dmRDQm1hVzVrSUcxdlpIVnNaU0FuWENJcmFTdGNJaWRjSWlrN2RHaHliM2NnWVM1amIyUmxQVndpVFU5RVZVeEZYMDVQVkY5R1QxVk9SRndpTEdGOWRtRnlJSEE5Ymx0cFhUMTdaWGh3YjNKMGN6cDdmWDA3WlZ0cFhWc3dYUzVqWVd4c0tIQXVaWGh3YjNKMGN5eG1kVzVqZEdsdmJpaHlLWHQyWVhJZ2JqMWxXMmxkV3pGZFczSmRPM0psZEhWeWJpQnZLRzU4ZkhJcGZTeHdMSEF1Wlhod2IzSjBjeXh5TEdVc2JpeDBLWDF5WlhSMWNtNGdibHRwWFM1bGVIQnZjblJ6ZldadmNpaDJZWElnZFQxY0ltWjFibU4wYVc5dVhDSTlQWFI1Y0dWdlppQnlaWEYxYVhKbEppWnlaWEYxYVhKbExHazlNRHRwUEhRdWJHVnVaM1JvTzJrckt5bHZLSFJiYVYwcE8zSmxkSFZ5YmlCdmZYSmxkSFZ5YmlCeWZTa29LU0lzSWk4cUlITnRiMjkwYUhOamNtOXNiQ0IyTUM0MExqQWdMU0F5TURFNElDMGdSSFZ6ZEdGdUlFdGhjM1JsYml3Z1NtVnlaVzFwWVhNZ1RXVnVhV05vWld4c2FTQXRJRTFKVkNCTWFXTmxibk5sSUNvdlhHNG9ablZ1WTNScGIyNGdLQ2tnZTF4dUlDQW5kWE5sSUhOMGNtbGpkQ2M3WEc1Y2JpQWdMeThnY0c5c2VXWnBiR3hjYmlBZ1puVnVZM1JwYjI0Z2NHOXNlV1pwYkd3b0tTQjdYRzRnSUNBZ0x5OGdZV3hwWVhObGMxeHVJQ0FnSUhaaGNpQjNJRDBnZDJsdVpHOTNPMXh1SUNBZ0lIWmhjaUJrSUQwZ1pHOWpkVzFsYm5RN1hHNWNiaUFnSUNBdkx5QnlaWFIxY200Z2FXWWdjMk55YjJ4c0lHSmxhR0YyYVc5eUlHbHpJSE4xY0hCdmNuUmxaQ0JoYm1RZ2NHOXNlV1pwYkd3Z2FYTWdibTkwSUdadmNtTmxaRnh1SUNBZ0lHbG1JQ2hjYmlBZ0lDQWdJQ2R6WTNKdmJHeENaV2hoZG1sdmNpY2dhVzRnWkM1a2IyTjFiV1Z1ZEVWc1pXMWxiblF1YzNSNWJHVWdKaVpjYmlBZ0lDQWdJSGN1WDE5bWIzSmpaVk50YjI5MGFGTmpjbTlzYkZCdmJIbG1hV3hzWDE4Z0lUMDlJSFJ5ZFdWY2JpQWdJQ0FwSUh0Y2JpQWdJQ0FnSUhKbGRIVnlianRjYmlBZ0lDQjlYRzVjYmlBZ0lDQXZMeUJuYkc5aVlXeHpYRzRnSUNBZ2RtRnlJRVZzWlcxbGJuUWdQU0IzTGtoVVRVeEZiR1Z0Wlc1MElIeDhJSGN1Uld4bGJXVnVkRHRjYmlBZ0lDQjJZWElnVTBOU1QweE1YMVJKVFVVZ1BTQTBOamc3WEc1Y2JpQWdJQ0F2THlCdlltcGxZM1FnWjJGMGFHVnlhVzVuSUc5eWFXZHBibUZzSUhOamNtOXNiQ0J0WlhSb2IyUnpYRzRnSUNBZ2RtRnlJRzl5YVdkcGJtRnNJRDBnZTF4dUlDQWdJQ0FnYzJOeWIyeHNPaUIzTG5OamNtOXNiQ0I4ZkNCM0xuTmpjbTlzYkZSdkxGeHVJQ0FnSUNBZ2MyTnliMnhzUW5rNklIY3VjMk55YjJ4c1Fua3NYRzRnSUNBZ0lDQmxiR1Z0Wlc1MFUyTnliMnhzT2lCRmJHVnRaVzUwTG5CeWIzUnZkSGx3WlM1elkzSnZiR3dnZkh3Z2MyTnliMnhzUld4bGJXVnVkQ3hjYmlBZ0lDQWdJSE5qY205c2JFbHVkRzlXYVdWM09pQkZiR1Z0Wlc1MExuQnliM1J2ZEhsd1pTNXpZM0p2Ykd4SmJuUnZWbWxsZDF4dUlDQWdJSDA3WEc1Y2JpQWdJQ0F2THlCa1pXWnBibVVnZEdsdGFXNW5JRzFsZEdodlpGeHVJQ0FnSUhaaGNpQnViM2NnUFZ4dUlDQWdJQ0FnZHk1d1pYSm1iM0p0WVc1alpTQW1KaUIzTG5CbGNtWnZjbTFoYm1ObExtNXZkMXh1SUNBZ0lDQWdJQ0EvSUhjdWNHVnlabTl5YldGdVkyVXVibTkzTG1KcGJtUW9keTV3WlhKbWIzSnRZVzVqWlNsY2JpQWdJQ0FnSUNBZ09pQkVZWFJsTG01dmR6dGNibHh1SUNBZ0lDOHFLbHh1SUNBZ0lDQXFJR2x1WkdsallYUmxjeUJwWmlCaElIUm9aU0JqZFhKeVpXNTBJR0p5YjNkelpYSWdhWE1nYldGa1pTQmllU0JOYVdOeWIzTnZablJjYmlBZ0lDQWdLaUJBYldWMGFHOWtJR2x6VFdsamNtOXpiMlowUW5KdmQzTmxjbHh1SUNBZ0lDQXFJRUJ3WVhKaGJTQjdVM1J5YVc1bmZTQjFjMlZ5UVdkbGJuUmNiaUFnSUNBZ0tpQkFjbVYwZFhKdWN5QjdRbTl2YkdWaGJuMWNiaUFnSUNBZ0tpOWNiaUFnSUNCbWRXNWpkR2x2YmlCcGMwMXBZM0p2YzI5bWRFSnliM2R6WlhJb2RYTmxja0ZuWlc1MEtTQjdYRzRnSUNBZ0lDQjJZWElnZFhObGNrRm5aVzUwVUdGMGRHVnlibk1nUFNCYkowMVRTVVVnSnl3Z0oxUnlhV1JsYm5Rdkp5d2dKMFZrWjJVdkoxMDdYRzVjYmlBZ0lDQWdJSEpsZEhWeWJpQnVaWGNnVW1WblJYaHdLSFZ6WlhKQloyVnVkRkJoZEhSbGNtNXpMbXB2YVc0b0ozd25LU2t1ZEdWemRDaDFjMlZ5UVdkbGJuUXBPMXh1SUNBZ0lIMWNibHh1SUNBZ0lDOHFYRzRnSUNBZ0lDb2dTVVVnYUdGeklISnZkVzVrYVc1bklHSjFaeUJ5YjNWdVpHbHVaeUJrYjNkdUlHTnNhV1Z1ZEVobGFXZG9kQ0JoYm1RZ1kyeHBaVzUwVjJsa2RHZ2dZVzVrWEc0Z0lDQWdJQ29nY205MWJtUnBibWNnZFhBZ2MyTnliMnhzU0dWcFoyaDBJR0Z1WkNCelkzSnZiR3hYYVdSMGFDQmpZWFZ6YVc1bklHWmhiSE5sSUhCdmMybDBhWFpsYzF4dUlDQWdJQ0FxSUc5dUlHaGhjMU5qY205c2JHRmliR1ZUY0dGalpWeHVJQ0FnSUNBcUwxeHVJQ0FnSUhaaGNpQlNUMVZPUkVsT1IxOVVUMHhGVWtGT1EwVWdQU0JwYzAxcFkzSnZjMjltZEVKeWIzZHpaWElvZHk1dVlYWnBaMkYwYjNJdWRYTmxja0ZuWlc1MEtTQS9JREVnT2lBd08xeHVYRzRnSUNBZ0x5b3FYRzRnSUNBZ0lDb2dZMmhoYm1kbGN5QnpZM0p2Ykd3Z2NHOXphWFJwYjI0Z2FXNXphV1JsSUdGdUlHVnNaVzFsYm5SY2JpQWdJQ0FnS2lCQWJXVjBhRzlrSUhOamNtOXNiRVZzWlcxbGJuUmNiaUFnSUNBZ0tpQkFjR0Z5WVcwZ2UwNTFiV0psY24wZ2VGeHVJQ0FnSUNBcUlFQndZWEpoYlNCN1RuVnRZbVZ5ZlNCNVhHNGdJQ0FnSUNvZ1FISmxkSFZ5Ym5NZ2UzVnVaR1ZtYVc1bFpIMWNiaUFnSUNBZ0tpOWNiaUFnSUNCbWRXNWpkR2x2YmlCelkzSnZiR3hGYkdWdFpXNTBLSGdzSUhrcElIdGNiaUFnSUNBZ0lIUm9hWE11YzJOeWIyeHNUR1ZtZENBOUlIZzdYRzRnSUNBZ0lDQjBhR2x6TG5OamNtOXNiRlJ2Y0NBOUlIazdYRzRnSUNBZ2ZWeHVYRzRnSUNBZ0x5b3FYRzRnSUNBZ0lDb2djbVYwZFhKdWN5QnlaWE4xYkhRZ2IyWWdZWEJ3YkhscGJtY2daV0Z6WlNCdFlYUm9JR1oxYm1OMGFXOXVJSFJ2SUdFZ2JuVnRZbVZ5WEc0Z0lDQWdJQ29nUUcxbGRHaHZaQ0JsWVhObFhHNGdJQ0FnSUNvZ1FIQmhjbUZ0SUh0T2RXMWlaWEo5SUd0Y2JpQWdJQ0FnS2lCQWNtVjBkWEp1Y3lCN1RuVnRZbVZ5ZlZ4dUlDQWdJQ0FxTDF4dUlDQWdJR1oxYm1OMGFXOXVJR1ZoYzJVb2F5a2dlMXh1SUNBZ0lDQWdjbVYwZFhKdUlEQXVOU0FxSUNneElDMGdUV0YwYUM1amIzTW9UV0YwYUM1UVNTQXFJR3NwS1R0Y2JpQWdJQ0I5WEc1Y2JpQWdJQ0F2S2lwY2JpQWdJQ0FnS2lCcGJtUnBZMkYwWlhNZ2FXWWdZU0J6Ylc5dmRHZ2dZbVZvWVhacGIzSWdjMmh2ZFd4a0lHSmxJR0Z3Y0d4cFpXUmNiaUFnSUNBZ0tpQkFiV1YwYUc5a0lITm9iM1ZzWkVKaGFXeFBkWFJjYmlBZ0lDQWdLaUJBY0dGeVlXMGdlMDUxYldKbGNueFBZbXBsWTNSOUlHWnBjbk4wUVhKblhHNGdJQ0FnSUNvZ1FISmxkSFZ5Ym5NZ2UwSnZiMnhsWVc1OVhHNGdJQ0FnSUNvdlhHNGdJQ0FnWm5WdVkzUnBiMjRnYzJodmRXeGtRbUZwYkU5MWRDaG1hWEp6ZEVGeVp5a2dlMXh1SUNBZ0lDQWdhV1lnS0Z4dUlDQWdJQ0FnSUNCbWFYSnpkRUZ5WnlBOVBUMGdiblZzYkNCOGZGeHVJQ0FnSUNBZ0lDQjBlWEJsYjJZZ1ptbHljM1JCY21jZ0lUMDlJQ2R2WW1wbFkzUW5JSHg4WEc0Z0lDQWdJQ0FnSUdacGNuTjBRWEpuTG1KbGFHRjJhVzl5SUQwOVBTQjFibVJsWm1sdVpXUWdmSHhjYmlBZ0lDQWdJQ0FnWm1seWMzUkJjbWN1WW1Wb1lYWnBiM0lnUFQwOUlDZGhkWFJ2SnlCOGZGeHVJQ0FnSUNBZ0lDQm1hWEp6ZEVGeVp5NWlaV2hoZG1sdmNpQTlQVDBnSjJsdWMzUmhiblFuWEc0Z0lDQWdJQ0FwSUh0Y2JpQWdJQ0FnSUNBZ0x5OGdabWx5YzNRZ1lYSm5kVzFsYm5RZ2FYTWdibTkwSUdGdUlHOWlhbVZqZEM5dWRXeHNYRzRnSUNBZ0lDQWdJQzh2SUc5eUlHSmxhR0YyYVc5eUlHbHpJR0YxZEc4c0lHbHVjM1JoYm5RZ2IzSWdkVzVrWldacGJtVmtYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQjBjblZsTzF4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNCcFppQW9kSGx3Wlc5bUlHWnBjbk4wUVhKbklEMDlQU0FuYjJKcVpXTjBKeUFtSmlCbWFYSnpkRUZ5Wnk1aVpXaGhkbWx2Y2lBOVBUMGdKM050YjI5MGFDY3BJSHRjYmlBZ0lDQWdJQ0FnTHk4Z1ptbHljM1FnWVhKbmRXMWxiblFnYVhNZ1lXNGdiMkpxWldOMElHRnVaQ0JpWldoaGRtbHZjaUJwY3lCemJXOXZkR2hjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJR1poYkhObE8xeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQXZMeUIwYUhKdmR5Qmxjbkp2Y2lCM2FHVnVJR0psYUdGMmFXOXlJR2x6SUc1dmRDQnpkWEJ3YjNKMFpXUmNiaUFnSUNBZ0lIUm9jbTkzSUc1bGR5QlVlWEJsUlhKeWIzSW9YRzRnSUNBZ0lDQWdJQ2RpWldoaGRtbHZjaUJ0WlcxaVpYSWdiMllnVTJOeWIyeHNUM0IwYVc5dWN5QW5JQ3RjYmlBZ0lDQWdJQ0FnSUNCbWFYSnpkRUZ5Wnk1aVpXaGhkbWx2Y2lBclhHNGdJQ0FnSUNBZ0lDQWdKeUJwY3lCdWIzUWdZU0IyWVd4cFpDQjJZV3gxWlNCbWIzSWdaVzUxYldWeVlYUnBiMjRnVTJOeWIyeHNRbVZvWVhacGIzSXVKMXh1SUNBZ0lDQWdLVHRjYmlBZ0lDQjlYRzVjYmlBZ0lDQXZLaXBjYmlBZ0lDQWdLaUJwYm1ScFkyRjBaWE1nYVdZZ1lXNGdaV3hsYldWdWRDQm9ZWE1nYzJOeWIyeHNZV0pzWlNCemNHRmpaU0JwYmlCMGFHVWdjSEp2ZG1sa1pXUWdZWGhwYzF4dUlDQWdJQ0FxSUVCdFpYUm9iMlFnYUdGelUyTnliMnhzWVdKc1pWTndZV05sWEc0Z0lDQWdJQ29nUUhCaGNtRnRJSHRPYjJSbGZTQmxiRnh1SUNBZ0lDQXFJRUJ3WVhKaGJTQjdVM1J5YVc1bmZTQmhlR2x6WEc0Z0lDQWdJQ29nUUhKbGRIVnlibk1nZTBKdmIyeGxZVzU5WEc0Z0lDQWdJQ292WEc0Z0lDQWdablZ1WTNScGIyNGdhR0Z6VTJOeWIyeHNZV0pzWlZOd1lXTmxLR1ZzTENCaGVHbHpLU0I3WEc0Z0lDQWdJQ0JwWmlBb1lYaHBjeUE5UFQwZ0oxa25LU0I3WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJsYkM1amJHbGxiblJJWldsbmFIUWdLeUJTVDFWT1JFbE9SMTlVVDB4RlVrRk9RMFVnUENCbGJDNXpZM0p2Ykd4SVpXbG5hSFE3WEc0Z0lDQWdJQ0I5WEc1Y2JpQWdJQ0FnSUdsbUlDaGhlR2x6SUQwOVBTQW5XQ2NwSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUdWc0xtTnNhV1Z1ZEZkcFpIUm9JQ3NnVWs5VlRrUkpUa2RmVkU5TVJWSkJUa05GSUR3Z1pXd3VjMk55YjJ4c1YybGtkR2c3WEc0Z0lDQWdJQ0I5WEc0Z0lDQWdmVnh1WEc0Z0lDQWdMeW9xWEc0Z0lDQWdJQ29nYVc1a2FXTmhkR1Z6SUdsbUlHRnVJR1ZzWlcxbGJuUWdhR0Z6SUdFZ2MyTnliMnhzWVdKc1pTQnZkbVZ5Wm14dmR5QndjbTl3WlhKMGVTQnBiaUIwYUdVZ1lYaHBjMXh1SUNBZ0lDQXFJRUJ0WlhSb2IyUWdZMkZ1VDNabGNtWnNiM2RjYmlBZ0lDQWdLaUJBY0dGeVlXMGdlMDV2WkdWOUlHVnNYRzRnSUNBZ0lDb2dRSEJoY21GdElIdFRkSEpwYm1kOUlHRjRhWE5jYmlBZ0lDQWdLaUJBY21WMGRYSnVjeUI3UW05dmJHVmhibjFjYmlBZ0lDQWdLaTljYmlBZ0lDQm1kVzVqZEdsdmJpQmpZVzVQZG1WeVpteHZkeWhsYkN3Z1lYaHBjeWtnZTF4dUlDQWdJQ0FnZG1GeUlHOTJaWEptYkc5M1ZtRnNkV1VnUFNCM0xtZGxkRU52YlhCMWRHVmtVM1I1YkdVb1pXd3NJRzUxYkd3cFd5ZHZkbVZ5Wm14dmR5Y2dLeUJoZUdselhUdGNibHh1SUNBZ0lDQWdjbVYwZFhKdUlHOTJaWEptYkc5M1ZtRnNkV1VnUFQwOUlDZGhkWFJ2SnlCOGZDQnZkbVZ5Wm14dmQxWmhiSFZsSUQwOVBTQW5jMk55YjJ4c0p6dGNiaUFnSUNCOVhHNWNiaUFnSUNBdktpcGNiaUFnSUNBZ0tpQnBibVJwWTJGMFpYTWdhV1lnWVc0Z1pXeGxiV1Z1ZENCallXNGdZbVVnYzJOeWIyeHNaV1FnYVc0Z1pXbDBhR1Z5SUdGNGFYTmNiaUFnSUNBZ0tpQkFiV1YwYUc5a0lHbHpVMk55YjJ4c1lXSnNaVnh1SUNBZ0lDQXFJRUJ3WVhKaGJTQjdUbTlrWlgwZ1pXeGNiaUFnSUNBZ0tpQkFjR0Z5WVcwZ2UxTjBjbWx1WjMwZ1lYaHBjMXh1SUNBZ0lDQXFJRUJ5WlhSMWNtNXpJSHRDYjI5c1pXRnVmVnh1SUNBZ0lDQXFMMXh1SUNBZ0lHWjFibU4wYVc5dUlHbHpVMk55YjJ4c1lXSnNaU2hsYkNrZ2UxeHVJQ0FnSUNBZ2RtRnlJR2x6VTJOeWIyeHNZV0pzWlZrZ1BTQm9ZWE5UWTNKdmJHeGhZbXhsVTNCaFkyVW9aV3dzSUNkWkp5a2dKaVlnWTJGdVQzWmxjbVpzYjNjb1pXd3NJQ2RaSnlrN1hHNGdJQ0FnSUNCMllYSWdhWE5UWTNKdmJHeGhZbXhsV0NBOUlHaGhjMU5qY205c2JHRmliR1ZUY0dGalpTaGxiQ3dnSjFnbktTQW1KaUJqWVc1UGRtVnlabXh2ZHlobGJDd2dKMWduS1R0Y2JseHVJQ0FnSUNBZ2NtVjBkWEp1SUdselUyTnliMnhzWVdKc1pWa2dmSHdnYVhOVFkzSnZiR3hoWW14bFdEdGNiaUFnSUNCOVhHNWNiaUFnSUNBdktpcGNiaUFnSUNBZ0tpQm1hVzVrY3lCelkzSnZiR3hoWW14bElIQmhjbVZ1ZENCdlppQmhiaUJsYkdWdFpXNTBYRzRnSUNBZ0lDb2dRRzFsZEdodlpDQm1hVzVrVTJOeWIyeHNZV0pzWlZCaGNtVnVkRnh1SUNBZ0lDQXFJRUJ3WVhKaGJTQjdUbTlrWlgwZ1pXeGNiaUFnSUNBZ0tpQkFjbVYwZFhKdWN5QjdUbTlrWlgwZ1pXeGNiaUFnSUNBZ0tpOWNiaUFnSUNCbWRXNWpkR2x2YmlCbWFXNWtVMk55YjJ4c1lXSnNaVkJoY21WdWRDaGxiQ2tnZTF4dUlDQWdJQ0FnZG1GeUlHbHpRbTlrZVR0Y2JseHVJQ0FnSUNBZ1pHOGdlMXh1SUNBZ0lDQWdJQ0JsYkNBOUlHVnNMbkJoY21WdWRFNXZaR1U3WEc1Y2JpQWdJQ0FnSUNBZ2FYTkNiMlI1SUQwZ1pXd2dQVDA5SUdRdVltOWtlVHRjYmlBZ0lDQWdJSDBnZDJocGJHVWdLR2x6UW05a2VTQTlQVDBnWm1Gc2MyVWdKaVlnYVhOVFkzSnZiR3hoWW14bEtHVnNLU0E5UFQwZ1ptRnNjMlVwTzF4dVhHNGdJQ0FnSUNCcGMwSnZaSGtnUFNCdWRXeHNPMXh1WEc0Z0lDQWdJQ0J5WlhSMWNtNGdaV3c3WEc0Z0lDQWdmVnh1WEc0Z0lDQWdMeW9xWEc0Z0lDQWdJQ29nYzJWc1ppQnBiblp2YTJWa0lHWjFibU4wYVc5dUlIUm9ZWFFzSUdkcGRtVnVJR0VnWTI5dWRHVjRkQ3dnYzNSbGNITWdkR2h5YjNWbmFDQnpZM0p2Ykd4cGJtZGNiaUFnSUNBZ0tpQkFiV1YwYUc5a0lITjBaWEJjYmlBZ0lDQWdLaUJBY0dGeVlXMGdlMDlpYW1WamRIMGdZMjl1ZEdWNGRGeHVJQ0FnSUNBcUlFQnlaWFIxY201eklIdDFibVJsWm1sdVpXUjlYRzRnSUNBZ0lDb3ZYRzRnSUNBZ1puVnVZM1JwYjI0Z2MzUmxjQ2hqYjI1MFpYaDBLU0I3WEc0Z0lDQWdJQ0IyWVhJZ2RHbHRaU0E5SUc1dmR5Z3BPMXh1SUNBZ0lDQWdkbUZ5SUhaaGJIVmxPMXh1SUNBZ0lDQWdkbUZ5SUdOMWNuSmxiblJZTzF4dUlDQWdJQ0FnZG1GeUlHTjFjbkpsYm5SWk8xeHVJQ0FnSUNBZ2RtRnlJR1ZzWVhCelpXUWdQU0FvZEdsdFpTQXRJR052Ym5SbGVIUXVjM1JoY25SVWFXMWxLU0F2SUZORFVrOU1URjlVU1UxRk8xeHVYRzRnSUNBZ0lDQXZMeUJoZG05cFpDQmxiR0Z3YzJWa0lIUnBiV1Z6SUdocFoyaGxjaUIwYUdGdUlHOXVaVnh1SUNBZ0lDQWdaV3hoY0hObFpDQTlJR1ZzWVhCelpXUWdQaUF4SUQ4Z01TQTZJR1ZzWVhCelpXUTdYRzVjYmlBZ0lDQWdJQzh2SUdGd2NHeDVJR1ZoYzJsdVp5QjBieUJsYkdGd2MyVmtJSFJwYldWY2JpQWdJQ0FnSUhaaGJIVmxJRDBnWldGelpTaGxiR0Z3YzJWa0tUdGNibHh1SUNBZ0lDQWdZM1Z5Y21WdWRGZ2dQU0JqYjI1MFpYaDBMbk4wWVhKMFdDQXJJQ2hqYjI1MFpYaDBMbmdnTFNCamIyNTBaWGgwTG5OMFlYSjBXQ2tnS2lCMllXeDFaVHRjYmlBZ0lDQWdJR04xY25KbGJuUlpJRDBnWTI5dWRHVjRkQzV6ZEdGeWRGa2dLeUFvWTI5dWRHVjRkQzU1SUMwZ1kyOXVkR1Y0ZEM1emRHRnlkRmtwSUNvZ2RtRnNkV1U3WEc1Y2JpQWdJQ0FnSUdOdmJuUmxlSFF1YldWMGFHOWtMbU5oYkd3b1kyOXVkR1Y0ZEM1elkzSnZiR3hoWW14bExDQmpkWEp5Wlc1MFdDd2dZM1Z5Y21WdWRGa3BPMXh1WEc0Z0lDQWdJQ0F2THlCelkzSnZiR3dnYlc5eVpTQnBaaUIzWlNCb1lYWmxJRzV2ZENCeVpXRmphR1ZrSUc5MWNpQmtaWE4wYVc1aGRHbHZibHh1SUNBZ0lDQWdhV1lnS0dOMWNuSmxiblJZSUNFOVBTQmpiMjUwWlhoMExuZ2dmSHdnWTNWeWNtVnVkRmtnSVQwOUlHTnZiblJsZUhRdWVTa2dlMXh1SUNBZ0lDQWdJQ0IzTG5KbGNYVmxjM1JCYm1sdFlYUnBiMjVHY21GdFpTaHpkR1Z3TG1KcGJtUW9keXdnWTI5dWRHVjRkQ2twTzF4dUlDQWdJQ0FnZlZ4dUlDQWdJSDFjYmx4dUlDQWdJQzhxS2x4dUlDQWdJQ0FxSUhOamNtOXNiSE1nZDJsdVpHOTNJRzl5SUdWc1pXMWxiblFnZDJsMGFDQmhJSE50YjI5MGFDQmlaV2hoZG1sdmNseHVJQ0FnSUNBcUlFQnRaWFJvYjJRZ2MyMXZiM1JvVTJOeWIyeHNYRzRnSUNBZ0lDb2dRSEJoY21GdElIdFBZbXBsWTNSOFRtOWtaWDBnWld4Y2JpQWdJQ0FnS2lCQWNHRnlZVzBnZTA1MWJXSmxjbjBnZUZ4dUlDQWdJQ0FxSUVCd1lYSmhiU0I3VG5WdFltVnlmU0I1WEc0Z0lDQWdJQ29nUUhKbGRIVnlibk1nZTNWdVpHVm1hVzVsWkgxY2JpQWdJQ0FnS2k5Y2JpQWdJQ0JtZFc1amRHbHZiaUJ6Ylc5dmRHaFRZM0p2Ykd3b1pXd3NJSGdzSUhrcElIdGNiaUFnSUNBZ0lIWmhjaUJ6WTNKdmJHeGhZbXhsTzF4dUlDQWdJQ0FnZG1GeUlITjBZWEowV0R0Y2JpQWdJQ0FnSUhaaGNpQnpkR0Z5ZEZrN1hHNGdJQ0FnSUNCMllYSWdiV1YwYUc5a08xeHVJQ0FnSUNBZ2RtRnlJSE4wWVhKMFZHbHRaU0E5SUc1dmR5Z3BPMXh1WEc0Z0lDQWdJQ0F2THlCa1pXWnBibVVnYzJOeWIyeHNJR052Ym5SbGVIUmNiaUFnSUNBZ0lHbG1JQ2hsYkNBOVBUMGdaQzVpYjJSNUtTQjdYRzRnSUNBZ0lDQWdJSE5qY205c2JHRmliR1VnUFNCM08xeHVJQ0FnSUNBZ0lDQnpkR0Z5ZEZnZ1BTQjNMbk5qY205c2JGZ2dmSHdnZHk1d1lXZGxXRTltWm5ObGREdGNiaUFnSUNBZ0lDQWdjM1JoY25SWklEMGdkeTV6WTNKdmJHeFpJSHg4SUhjdWNHRm5aVmxQWm1aelpYUTdYRzRnSUNBZ0lDQWdJRzFsZEdodlpDQTlJRzl5YVdkcGJtRnNMbk5qY205c2JEdGNiaUFnSUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNBZ0lITmpjbTlzYkdGaWJHVWdQU0JsYkR0Y2JpQWdJQ0FnSUNBZ2MzUmhjblJZSUQwZ1pXd3VjMk55YjJ4c1RHVm1kRHRjYmlBZ0lDQWdJQ0FnYzNSaGNuUlpJRDBnWld3dWMyTnliMnhzVkc5d08xeHVJQ0FnSUNBZ0lDQnRaWFJvYjJRZ1BTQnpZM0p2Ykd4RmJHVnRaVzUwTzF4dUlDQWdJQ0FnZlZ4dVhHNGdJQ0FnSUNBdkx5QnpZM0p2Ykd3Z2JHOXZjR2x1WnlCdmRtVnlJR0VnWm5KaGJXVmNiaUFnSUNBZ0lITjBaWEFvZTF4dUlDQWdJQ0FnSUNCelkzSnZiR3hoWW14bE9pQnpZM0p2Ykd4aFlteGxMRnh1SUNBZ0lDQWdJQ0J0WlhSb2IyUTZJRzFsZEdodlpDeGNiaUFnSUNBZ0lDQWdjM1JoY25SVWFXMWxPaUJ6ZEdGeWRGUnBiV1VzWEc0Z0lDQWdJQ0FnSUhOMFlYSjBXRG9nYzNSaGNuUllMRnh1SUNBZ0lDQWdJQ0J6ZEdGeWRGazZJSE4wWVhKMFdTeGNiaUFnSUNBZ0lDQWdlRG9nZUN4Y2JpQWdJQ0FnSUNBZ2VUb2dlVnh1SUNBZ0lDQWdmU2s3WEc0Z0lDQWdmVnh1WEc0Z0lDQWdMeThnVDFKSlIwbE9RVXdnVFVWVVNFOUVVeUJQVmtWU1VrbEVSVk5jYmlBZ0lDQXZMeUIzTG5OamNtOXNiQ0JoYm1RZ2R5NXpZM0p2Ykd4VWIxeHVJQ0FnSUhjdWMyTnliMnhzSUQwZ2R5NXpZM0p2Ykd4VWJ5QTlJR1oxYm1OMGFXOXVLQ2tnZTF4dUlDQWdJQ0FnTHk4Z1lYWnZhV1FnWVdOMGFXOXVJSGRvWlc0Z2JtOGdZWEpuZFcxbGJuUnpJR0Z5WlNCd1lYTnpaV1JjYmlBZ0lDQWdJR2xtSUNoaGNtZDFiV1Z1ZEhOYk1GMGdQVDA5SUhWdVpHVm1hVzVsWkNrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200N1hHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lDOHZJR0YyYjJsa0lITnRiMjkwYUNCaVpXaGhkbWx2Y2lCcFppQnViM1FnY21WeGRXbHlaV1JjYmlBZ0lDQWdJR2xtSUNoemFHOTFiR1JDWVdsc1QzVjBLR0Z5WjNWdFpXNTBjMXN3WFNrZ1BUMDlJSFJ5ZFdVcElIdGNiaUFnSUNBZ0lDQWdiM0pwWjJsdVlXd3VjMk55YjJ4c0xtTmhiR3dvWEc0Z0lDQWdJQ0FnSUNBZ2R5eGNiaUFnSUNBZ0lDQWdJQ0JoY21kMWJXVnVkSE5iTUYwdWJHVm1kQ0FoUFQwZ2RXNWtaV1pwYm1Wa1hHNGdJQ0FnSUNBZ0lDQWdJQ0EvSUdGeVozVnRaVzUwYzFzd1hTNXNaV1owWEc0Z0lDQWdJQ0FnSUNBZ0lDQTZJSFI1Y0dWdlppQmhjbWQxYldWdWRITmJNRjBnSVQwOUlDZHZZbXBsWTNRblhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUQ4Z1lYSm5kVzFsYm5Seld6QmRYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lEb2dkeTV6WTNKdmJHeFlJSHg4SUhjdWNHRm5aVmhQWm1aelpYUXNYRzRnSUNBZ0lDQWdJQ0FnTHk4Z2RYTmxJSFJ2Y0NCd2NtOXdMQ0J6WldOdmJtUWdZWEpuZFcxbGJuUWdhV1lnY0hKbGMyVnVkQ0J2Y2lCbVlXeHNZbUZqYXlCMGJ5QnpZM0p2Ykd4WlhHNGdJQ0FnSUNBZ0lDQWdZWEpuZFcxbGJuUnpXekJkTG5SdmNDQWhQVDBnZFc1a1pXWnBibVZrWEc0Z0lDQWdJQ0FnSUNBZ0lDQS9JR0Z5WjNWdFpXNTBjMXN3WFM1MGIzQmNiaUFnSUNBZ0lDQWdJQ0FnSURvZ1lYSm5kVzFsYm5Seld6RmRJQ0U5UFNCMWJtUmxabWx1WldSY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnUHlCaGNtZDFiV1Z1ZEhOYk1WMWNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ09pQjNMbk5qY205c2JGa2dmSHdnZHk1d1lXZGxXVTltWm5ObGRGeHVJQ0FnSUNBZ0lDQXBPMXh1WEc0Z0lDQWdJQ0FnSUhKbGRIVnlianRjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnTHk4Z1RFVlVJRlJJUlNCVFRVOVBWRWhPUlZOVElFSkZSMGxPSVZ4dUlDQWdJQ0FnYzIxdmIzUm9VMk55YjJ4c0xtTmhiR3dvWEc0Z0lDQWdJQ0FnSUhjc1hHNGdJQ0FnSUNBZ0lHUXVZbTlrZVN4Y2JpQWdJQ0FnSUNBZ1lYSm5kVzFsYm5Seld6QmRMbXhsWm5RZ0lUMDlJSFZ1WkdWbWFXNWxaRnh1SUNBZ0lDQWdJQ0FnSUQ4Z2ZuNWhjbWQxYldWdWRITmJNRjB1YkdWbWRGeHVJQ0FnSUNBZ0lDQWdJRG9nZHk1elkzSnZiR3hZSUh4OElIY3VjR0ZuWlZoUFptWnpaWFFzWEc0Z0lDQWdJQ0FnSUdGeVozVnRaVzUwYzFzd1hTNTBiM0FnSVQwOUlIVnVaR1ZtYVc1bFpGeHVJQ0FnSUNBZ0lDQWdJRDhnZm41aGNtZDFiV1Z1ZEhOYk1GMHVkRzl3WEc0Z0lDQWdJQ0FnSUNBZ09pQjNMbk5qY205c2JGa2dmSHdnZHk1d1lXZGxXVTltWm5ObGRGeHVJQ0FnSUNBZ0tUdGNiaUFnSUNCOU8xeHVYRzRnSUNBZ0x5OGdkeTV6WTNKdmJHeENlVnh1SUNBZ0lIY3VjMk55YjJ4c1Fua2dQU0JtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0FnSUM4dklHRjJiMmxrSUdGamRHbHZiaUIzYUdWdUlHNXZJR0Z5WjNWdFpXNTBjeUJoY21VZ2NHRnpjMlZrWEc0Z0lDQWdJQ0JwWmlBb1lYSm5kVzFsYm5Seld6QmRJRDA5UFNCMWJtUmxabWx1WldRcElIdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdU8xeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQXZMeUJoZG05cFpDQnpiVzl2ZEdnZ1ltVm9ZWFpwYjNJZ2FXWWdibTkwSUhKbGNYVnBjbVZrWEc0Z0lDQWdJQ0JwWmlBb2MyaHZkV3hrUW1GcGJFOTFkQ2hoY21kMWJXVnVkSE5iTUYwcEtTQjdYRzRnSUNBZ0lDQWdJRzl5YVdkcGJtRnNMbk5qY205c2JFSjVMbU5oYkd3b1hHNGdJQ0FnSUNBZ0lDQWdkeXhjYmlBZ0lDQWdJQ0FnSUNCaGNtZDFiV1Z1ZEhOYk1GMHViR1ZtZENBaFBUMGdkVzVrWldacGJtVmtYRzRnSUNBZ0lDQWdJQ0FnSUNBL0lHRnlaM1Z0Wlc1MGMxc3dYUzVzWldaMFhHNGdJQ0FnSUNBZ0lDQWdJQ0E2SUhSNWNHVnZaaUJoY21kMWJXVnVkSE5iTUYwZ0lUMDlJQ2R2WW1wbFkzUW5JRDhnWVhKbmRXMWxiblJ6V3pCZElEb2dNQ3hjYmlBZ0lDQWdJQ0FnSUNCaGNtZDFiV1Z1ZEhOYk1GMHVkRzl3SUNFOVBTQjFibVJsWm1sdVpXUmNiaUFnSUNBZ0lDQWdJQ0FnSUQ4Z1lYSm5kVzFsYm5Seld6QmRMblJ2Y0Z4dUlDQWdJQ0FnSUNBZ0lDQWdPaUJoY21kMWJXVnVkSE5iTVYwZ0lUMDlJSFZ1WkdWbWFXNWxaQ0EvSUdGeVozVnRaVzUwYzFzeFhTQTZJREJjYmlBZ0lDQWdJQ0FnS1R0Y2JseHVJQ0FnSUNBZ0lDQnlaWFIxY200N1hHNGdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lDOHZJRXhGVkNCVVNFVWdVMDFQVDFSSVRrVlRVeUJDUlVkSlRpRmNiaUFnSUNBZ0lITnRiMjkwYUZOamNtOXNiQzVqWVd4c0tGeHVJQ0FnSUNBZ0lDQjNMRnh1SUNBZ0lDQWdJQ0JrTG1KdlpIa3NYRzRnSUNBZ0lDQWdJSDUrWVhKbmRXMWxiblJ6V3pCZExteGxablFnS3lBb2R5NXpZM0p2Ykd4WUlIeDhJSGN1Y0dGblpWaFBabVp6WlhRcExGeHVJQ0FnSUNBZ0lDQitmbUZ5WjNWdFpXNTBjMXN3WFM1MGIzQWdLeUFvZHk1elkzSnZiR3haSUh4OElIY3VjR0ZuWlZsUFptWnpaWFFwWEc0Z0lDQWdJQ0FwTzF4dUlDQWdJSDA3WEc1Y2JpQWdJQ0F2THlCRmJHVnRaVzUwTG5CeWIzUnZkSGx3WlM1elkzSnZiR3dnWVc1a0lFVnNaVzFsYm5RdWNISnZkRzkwZVhCbExuTmpjbTlzYkZSdlhHNGdJQ0FnUld4bGJXVnVkQzV3Y205MGIzUjVjR1V1YzJOeWIyeHNJRDBnUld4bGJXVnVkQzV3Y205MGIzUjVjR1V1YzJOeWIyeHNWRzhnUFNCbWRXNWpkR2x2YmlncElIdGNiaUFnSUNBZ0lDOHZJR0YyYjJsa0lHRmpkR2x2YmlCM2FHVnVJRzV2SUdGeVozVnRaVzUwY3lCaGNtVWdjR0Z6YzJWa1hHNGdJQ0FnSUNCcFppQW9ZWEpuZFcxbGJuUnpXekJkSUQwOVBTQjFibVJsWm1sdVpXUXBJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVPMXh1SUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0F2THlCaGRtOXBaQ0J6Ylc5dmRHZ2dZbVZvWVhacGIzSWdhV1lnYm05MElISmxjWFZwY21Wa1hHNGdJQ0FnSUNCcFppQW9jMmh2ZFd4a1FtRnBiRTkxZENoaGNtZDFiV1Z1ZEhOYk1GMHBJRDA5UFNCMGNuVmxLU0I3WEc0Z0lDQWdJQ0FnSUM4dklHbG1JRzl1WlNCdWRXMWlaWElnYVhNZ2NHRnpjMlZrTENCMGFISnZkeUJsY25KdmNpQjBieUJ0WVhSamFDQkdhWEpsWm05NElHbHRjR3hsYldWdWRHRjBhVzl1WEc0Z0lDQWdJQ0FnSUdsbUlDaDBlWEJsYjJZZ1lYSm5kVzFsYm5Seld6QmRJRDA5UFNBbmJuVnRZbVZ5SnlBbUppQmhjbWQxYldWdWRITmJNVjBnUFQwOUlIVnVaR1ZtYVc1bFpDa2dlMXh1SUNBZ0lDQWdJQ0FnSUhSb2NtOTNJRzVsZHlCVGVXNTBZWGhGY25KdmNpZ25WbUZzZFdVZ1kyOTFiR1FnYm05MElHSmxJR052Ym5abGNuUmxaQ2NwTzF4dUlDQWdJQ0FnSUNCOVhHNWNiaUFnSUNBZ0lDQWdiM0pwWjJsdVlXd3VaV3hsYldWdWRGTmpjbTlzYkM1allXeHNLRnh1SUNBZ0lDQWdJQ0FnSUhSb2FYTXNYRzRnSUNBZ0lDQWdJQ0FnTHk4Z2RYTmxJR3hsWm5RZ2NISnZjQ3dnWm1seWMzUWdiblZ0WW1WeUlHRnlaM1Z0Wlc1MElHOXlJR1poYkd4aVlXTnJJSFJ2SUhOamNtOXNiRXhsWm5SY2JpQWdJQ0FnSUNBZ0lDQmhjbWQxYldWdWRITmJNRjB1YkdWbWRDQWhQVDBnZFc1a1pXWnBibVZrWEc0Z0lDQWdJQ0FnSUNBZ0lDQS9JSDUrWVhKbmRXMWxiblJ6V3pCZExteGxablJjYmlBZ0lDQWdJQ0FnSUNBZ0lEb2dkSGx3Wlc5bUlHRnlaM1Z0Wlc1MGMxc3dYU0FoUFQwZ0oyOWlhbVZqZENjZ1B5QitmbUZ5WjNWdFpXNTBjMXN3WFNBNklIUm9hWE11YzJOeWIyeHNUR1ZtZEN4Y2JpQWdJQ0FnSUNBZ0lDQXZMeUIxYzJVZ2RHOXdJSEJ5YjNBc0lITmxZMjl1WkNCaGNtZDFiV1Z1ZENCdmNpQm1ZV3hzWW1GamF5QjBieUJ6WTNKdmJHeFViM0JjYmlBZ0lDQWdJQ0FnSUNCaGNtZDFiV1Z1ZEhOYk1GMHVkRzl3SUNFOVBTQjFibVJsWm1sdVpXUmNiaUFnSUNBZ0lDQWdJQ0FnSUQ4Z2ZuNWhjbWQxYldWdWRITmJNRjB1ZEc5d1hHNGdJQ0FnSUNBZ0lDQWdJQ0E2SUdGeVozVnRaVzUwYzFzeFhTQWhQVDBnZFc1a1pXWnBibVZrSUQ4Z2ZuNWhjbWQxYldWdWRITmJNVjBnT2lCMGFHbHpMbk5qY205c2JGUnZjRnh1SUNBZ0lDQWdJQ0FwTzF4dVhHNGdJQ0FnSUNBZ0lISmxkSFZ5Ymp0Y2JpQWdJQ0FnSUgxY2JseHVJQ0FnSUNBZ2RtRnlJR3hsWm5RZ1BTQmhjbWQxYldWdWRITmJNRjB1YkdWbWREdGNiaUFnSUNBZ0lIWmhjaUIwYjNBZ1BTQmhjbWQxYldWdWRITmJNRjB1ZEc5d08xeHVYRzRnSUNBZ0lDQXZMeUJNUlZRZ1ZFaEZJRk5OVDA5VVNFNUZVMU1nUWtWSFNVNGhYRzRnSUNBZ0lDQnpiVzl2ZEdoVFkzSnZiR3d1WTJGc2JDaGNiaUFnSUNBZ0lDQWdkR2hwY3l4Y2JpQWdJQ0FnSUNBZ2RHaHBjeXhjYmlBZ0lDQWdJQ0FnZEhsd1pXOW1JR3hsWm5RZ1BUMDlJQ2QxYm1SbFptbHVaV1FuSUQ4Z2RHaHBjeTV6WTNKdmJHeE1aV1owSURvZ2ZuNXNaV1owTEZ4dUlDQWdJQ0FnSUNCMGVYQmxiMllnZEc5d0lEMDlQU0FuZFc1a1pXWnBibVZrSnlBL0lIUm9hWE11YzJOeWIyeHNWRzl3SURvZ2ZuNTBiM0JjYmlBZ0lDQWdJQ2s3WEc0Z0lDQWdmVHRjYmx4dUlDQWdJQzh2SUVWc1pXMWxiblF1Y0hKdmRHOTBlWEJsTG5OamNtOXNiRUo1WEc0Z0lDQWdSV3hsYldWdWRDNXdjbTkwYjNSNWNHVXVjMk55YjJ4c1Fua2dQU0JtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0FnSUM4dklHRjJiMmxrSUdGamRHbHZiaUIzYUdWdUlHNXZJR0Z5WjNWdFpXNTBjeUJoY21VZ2NHRnpjMlZrWEc0Z0lDQWdJQ0JwWmlBb1lYSm5kVzFsYm5Seld6QmRJRDA5UFNCMWJtUmxabWx1WldRcElIdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdU8xeHVJQ0FnSUNBZ2ZWeHVYRzRnSUNBZ0lDQXZMeUJoZG05cFpDQnpiVzl2ZEdnZ1ltVm9ZWFpwYjNJZ2FXWWdibTkwSUhKbGNYVnBjbVZrWEc0Z0lDQWdJQ0JwWmlBb2MyaHZkV3hrUW1GcGJFOTFkQ2hoY21kMWJXVnVkSE5iTUYwcElEMDlQU0IwY25WbEtTQjdYRzRnSUNBZ0lDQWdJRzl5YVdkcGJtRnNMbVZzWlcxbGJuUlRZM0p2Ykd3dVkyRnNiQ2hjYmlBZ0lDQWdJQ0FnSUNCMGFHbHpMRnh1SUNBZ0lDQWdJQ0FnSUdGeVozVnRaVzUwYzFzd1hTNXNaV1owSUNFOVBTQjFibVJsWm1sdVpXUmNiaUFnSUNBZ0lDQWdJQ0FnSUQ4Z2ZuNWhjbWQxYldWdWRITmJNRjB1YkdWbWRDQXJJSFJvYVhNdWMyTnliMnhzVEdWbWRGeHVJQ0FnSUNBZ0lDQWdJQ0FnT2lCK2ZtRnlaM1Z0Wlc1MGMxc3dYU0FySUhSb2FYTXVjMk55YjJ4c1RHVm1kQ3hjYmlBZ0lDQWdJQ0FnSUNCaGNtZDFiV1Z1ZEhOYk1GMHVkRzl3SUNFOVBTQjFibVJsWm1sdVpXUmNiaUFnSUNBZ0lDQWdJQ0FnSUQ4Z2ZuNWhjbWQxYldWdWRITmJNRjB1ZEc5d0lDc2dkR2hwY3k1elkzSnZiR3hVYjNCY2JpQWdJQ0FnSUNBZ0lDQWdJRG9nZm41aGNtZDFiV1Z1ZEhOYk1WMGdLeUIwYUdsekxuTmpjbTlzYkZSdmNGeHVJQ0FnSUNBZ0lDQXBPMXh1WEc0Z0lDQWdJQ0FnSUhKbGRIVnlianRjYmlBZ0lDQWdJSDFjYmx4dUlDQWdJQ0FnZEdocGN5NXpZM0p2Ykd3b2UxeHVJQ0FnSUNBZ0lDQnNaV1owT2lCK2ZtRnlaM1Z0Wlc1MGMxc3dYUzVzWldaMElDc2dkR2hwY3k1elkzSnZiR3hNWldaMExGeHVJQ0FnSUNBZ0lDQjBiM0E2SUg1K1lYSm5kVzFsYm5Seld6QmRMblJ2Y0NBcklIUm9hWE11YzJOeWIyeHNWRzl3TEZ4dUlDQWdJQ0FnSUNCaVpXaGhkbWx2Y2pvZ1lYSm5kVzFsYm5Seld6QmRMbUpsYUdGMmFXOXlYRzRnSUNBZ0lDQjlLVHRjYmlBZ0lDQjlPMXh1WEc0Z0lDQWdMeThnUld4bGJXVnVkQzV3Y205MGIzUjVjR1V1YzJOeWIyeHNTVzUwYjFacFpYZGNiaUFnSUNCRmJHVnRaVzUwTG5CeWIzUnZkSGx3WlM1elkzSnZiR3hKYm5SdlZtbGxkeUE5SUdaMWJtTjBhVzl1S0NrZ2UxeHVJQ0FnSUNBZ0x5OGdZWFp2YVdRZ2MyMXZiM1JvSUdKbGFHRjJhVzl5SUdsbUlHNXZkQ0J5WlhGMWFYSmxaRnh1SUNBZ0lDQWdhV1lnS0hOb2IzVnNaRUpoYVd4UGRYUW9ZWEpuZFcxbGJuUnpXekJkS1NBOVBUMGdkSEoxWlNrZ2UxeHVJQ0FnSUNBZ0lDQnZjbWxuYVc1aGJDNXpZM0p2Ykd4SmJuUnZWbWxsZHk1allXeHNLRnh1SUNBZ0lDQWdJQ0FnSUhSb2FYTXNYRzRnSUNBZ0lDQWdJQ0FnWVhKbmRXMWxiblJ6V3pCZElEMDlQU0IxYm1SbFptbHVaV1FnUHlCMGNuVmxJRG9nWVhKbmRXMWxiblJ6V3pCZFhHNGdJQ0FnSUNBZ0lDazdYRzVjYmlBZ0lDQWdJQ0FnY21WMGRYSnVPMXh1SUNBZ0lDQWdmVnh1WEc0Z0lDQWdJQ0F2THlCTVJWUWdWRWhGSUZOTlQwOVVTRTVGVTFNZ1FrVkhTVTRoWEc0Z0lDQWdJQ0IyWVhJZ2MyTnliMnhzWVdKc1pWQmhjbVZ1ZENBOUlHWnBibVJUWTNKdmJHeGhZbXhsVUdGeVpXNTBLSFJvYVhNcE8xeHVJQ0FnSUNBZ2RtRnlJSEJoY21WdWRGSmxZM1J6SUQwZ2MyTnliMnhzWVdKc1pWQmhjbVZ1ZEM1blpYUkNiM1Z1WkdsdVowTnNhV1Z1ZEZKbFkzUW9LVHRjYmlBZ0lDQWdJSFpoY2lCamJHbGxiblJTWldOMGN5QTlJSFJvYVhNdVoyVjBRbTkxYm1ScGJtZERiR2xsYm5SU1pXTjBLQ2s3WEc1Y2JpQWdJQ0FnSUdsbUlDaHpZM0p2Ykd4aFlteGxVR0Z5Wlc1MElDRTlQU0JrTG1KdlpIa3BJSHRjYmlBZ0lDQWdJQ0FnTHk4Z2NtVjJaV0ZzSUdWc1pXMWxiblFnYVc1emFXUmxJSEJoY21WdWRGeHVJQ0FnSUNBZ0lDQnpiVzl2ZEdoVFkzSnZiR3d1WTJGc2JDaGNiaUFnSUNBZ0lDQWdJQ0IwYUdsekxGeHVJQ0FnSUNBZ0lDQWdJSE5qY205c2JHRmliR1ZRWVhKbGJuUXNYRzRnSUNBZ0lDQWdJQ0FnYzJOeWIyeHNZV0pzWlZCaGNtVnVkQzV6WTNKdmJHeE1aV1owSUNzZ1kyeHBaVzUwVW1WamRITXViR1ZtZENBdElIQmhjbVZ1ZEZKbFkzUnpMbXhsWm5Rc1hHNGdJQ0FnSUNBZ0lDQWdjMk55YjJ4c1lXSnNaVkJoY21WdWRDNXpZM0p2Ykd4VWIzQWdLeUJqYkdsbGJuUlNaV04wY3k1MGIzQWdMU0J3WVhKbGJuUlNaV04wY3k1MGIzQmNiaUFnSUNBZ0lDQWdLVHRjYmx4dUlDQWdJQ0FnSUNBdkx5QnlaWFpsWVd3Z2NHRnlaVzUwSUdsdUlIWnBaWGR3YjNKMElIVnViR1Z6Y3lCcGN5Qm1hWGhsWkZ4dUlDQWdJQ0FnSUNCcFppQW9keTVuWlhSRGIyMXdkWFJsWkZOMGVXeGxLSE5qY205c2JHRmliR1ZRWVhKbGJuUXBMbkJ2YzJsMGFXOXVJQ0U5UFNBblptbDRaV1FuS1NCN1hHNGdJQ0FnSUNBZ0lDQWdkeTV6WTNKdmJHeENlU2g3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnNaV1owT2lCd1lYSmxiblJTWldOMGN5NXNaV1owTEZ4dUlDQWdJQ0FnSUNBZ0lDQWdkRzl3T2lCd1lYSmxiblJTWldOMGN5NTBiM0FzWEc0Z0lDQWdJQ0FnSUNBZ0lDQmlaV2hoZG1sdmNqb2dKM050YjI5MGFDZGNiaUFnSUNBZ0lDQWdJQ0I5S1R0Y2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ0x5OGdjbVYyWldGc0lHVnNaVzFsYm5RZ2FXNGdkbWxsZDNCdmNuUmNiaUFnSUNBZ0lDQWdkeTV6WTNKdmJHeENlU2g3WEc0Z0lDQWdJQ0FnSUNBZ2JHVm1kRG9nWTJ4cFpXNTBVbVZqZEhNdWJHVm1kQ3hjYmlBZ0lDQWdJQ0FnSUNCMGIzQTZJR05zYVdWdWRGSmxZM1J6TG5SdmNDeGNiaUFnSUNBZ0lDQWdJQ0JpWldoaGRtbHZjam9nSjNOdGIyOTBhQ2RjYmlBZ0lDQWdJQ0FnZlNrN1hHNGdJQ0FnSUNCOVhHNGdJQ0FnZlR0Y2JpQWdmVnh1WEc0Z0lHbG1JQ2gwZVhCbGIyWWdaWGh3YjNKMGN5QTlQVDBnSjI5aWFtVmpkQ2NnSmlZZ2RIbHdaVzltSUcxdlpIVnNaU0FoUFQwZ0ozVnVaR1ZtYVc1bFpDY3BJSHRjYmlBZ0lDQXZMeUJqYjIxdGIyNXFjMXh1SUNBZ0lHMXZaSFZzWlM1bGVIQnZjblJ6SUQwZ2V5QndiMng1Wm1sc2JEb2djRzlzZVdacGJHd2dmVHRjYmlBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0F2THlCbmJHOWlZV3hjYmlBZ0lDQndiMng1Wm1sc2JDZ3BPMXh1SUNCOVhHNWNibjBvS1NrN1hHNGlMQ0pqYjI1emRDQkVRaUE5SUNkb2RIUndjem92TDI1bGVIVnpMV05oZEdGc2IyY3VabWx5WldKaGMyVnBieTVqYjIwdmNHOXpkSE11YW5OdmJqOWhkWFJvUFRkbk4zQjVTMHQ1YTA0elRqVmxkM0pKYldoUFlWTTJkbmR5Um5Oak5XWkxhM0pyT0dWcWVtWW5PMXh1WEc1amIyNXpkQ0FrYkc5aFpHbHVaeUE5SUVGeWNtRjVMbVp5YjIwb1pHOWpkVzFsYm5RdWNYVmxjbmxUWld4bFkzUnZja0ZzYkNnbkxteHZZV1JwYm1jbktTazdYRzVqYjI1emRDQWtZWEowYVdOc1pVeHBjM1FnUFNCa2IyTjFiV1Z1ZEM1blpYUkZiR1Z0Wlc1MFFubEpaQ2duYW5NdGJHbHpkQ2NwTzF4dVkyOXVjM1FnSkc1aGRpQTlJR1J2WTNWdFpXNTBMbWRsZEVWc1pXMWxiblJDZVVsa0tDZHFjeTF1WVhZbktUdGNibU52Ym5OMElDUndZWEpoYkd4aGVDQTlJR1J2WTNWdFpXNTBMbkYxWlhKNVUyVnNaV04wYjNJb0p5NXdZWEpoYkd4aGVDY3BPMXh1WTI5dWMzUWdKR052Ym5SbGJuUWdQU0JrYjJOMWJXVnVkQzV4ZFdWeWVWTmxiR1ZqZEc5eUtDY3VZMjl1ZEdWdWRDY3BPMXh1WTI5dWMzUWdKSFJwZEd4bElEMGdaRzlqZFcxbGJuUXVaMlYwUld4bGJXVnVkRUo1U1dRb0oycHpMWFJwZEd4bEp5azdYRzVqYjI1emRDQWtkWEJCY25KdmR5QTlJR1J2WTNWdFpXNTBMbWRsZEVWc1pXMWxiblJDZVVsa0tDZHFjeTFoY25KdmR5Y3BPMXh1WTI5dWMzUWdKRzF2WkdGc0lEMGdaRzlqZFcxbGJuUXVjWFZsY25sVFpXeGxZM1J2Y2lnbkxtMXZaR0ZzSnlrN1hHNWpiMjV6ZENBa2JHbG5hSFJpYjNnZ1BTQmtiMk4xYldWdWRDNXhkV1Z5ZVZObGJHVmpkRzl5S0NjdWJHbG5hSFJpYjNnbktUdGNibU52Ym5OMElDUjJhV1YzSUQwZ1pHOWpkVzFsYm5RdWNYVmxjbmxUWld4bFkzUnZjaWduTG14cFoyaDBZbTk0TFhacFpYY25LVHRjYm1OdmJuTjBJSE52Y25SSlpITWdQU0JiSjJGeWRHbHpkQ2NzSUNkMGFYUnNaU2RkTzF4dVhHNWxlSEJ2Y25RZ2V5QmNibHgwUkVJc1hHNWNkQ1JzYjJGa2FXNW5MRnh1WEhRa1lYSjBhV05zWlV4cGMzUXNJRnh1WEhRa2JtRjJMQ0JjYmx4MEpIQmhjbUZzYkdGNExGeHVYSFFrWTI5dWRHVnVkQ3hjYmx4MEpIUnBkR3hsTEZ4dVhIUWtkWEJCY25KdmR5eGNibHgwSkcxdlpHRnNMRnh1WEhRa2JHbG5hSFJpYjNnc1hHNWNkQ1IyYVdWM0xGeHVYSFJ6YjNKMFNXUnpYRzU5T3lJc0ltbHRjRzl5ZENCemJXOXZkR2h6WTNKdmJHd2dabkp2YlNBbmMyMXZiM1JvYzJOeWIyeHNMWEJ2YkhsbWFXeHNKenRjYmx4dWFXMXdiM0owSUhzZ1lYSjBhV05zWlZSbGJYQnNZWFJsTENCeVpXNWtaWEpPWVhaTVp5QjlJR1p5YjIwZ0p5NHZkR1Z0Y0d4aGRHVnpKenRjYm1sdGNHOXlkQ0I3SUdSbFltOTFibU5sTENCb2FXUmxURzloWkdsdVp5d2djMk55YjJ4c1ZHOVViM0FnZlNCbWNtOXRJQ2N1TDNWMGFXeHpKenRjYm1sdGNHOXlkQ0I3SUVSQ0xDQWtZWEowYVdOc1pVeHBjM1FzSUhOdmNuUkpaSE1nZlNCbWNtOXRJQ2N1TDJOdmJuTjBZVzUwY3ljN1hHNXBiWEJ2Y25RZ2V5QmhkSFJoWTJoTmIyUmhiRXhwYzNSbGJtVnljeXdnWVhSMFlXTm9WWEJCY25KdmQweHBjM1JsYm1WeWN5d2dZWFIwWVdOb1NXMWhaMlZNYVhOMFpXNWxjbk1zSUcxaGEyVkJiSEJvWVdKbGRDd2diV0ZyWlZOc2FXUmxjaUI5SUdaeWIyMGdKeTR2Ylc5a2RXeGxjeWM3WEc1Y2JteGxkQ0J6YjNKMFMyVjVJRDBnTURzZ0x5OGdNQ0E5SUdGeWRHbHpkQ3dnTVNBOUlIUnBkR3hsWEc1c1pYUWdaVzUwY21sbGN5QTlJSHNnWW5sQmRYUm9iM0k2SUZ0ZExDQmllVlJwZEd4bE9pQmJYU0I5TzF4dVhHNWpiMjV6ZENCelpYUlZjRk52Y25SQ2RYUjBiMjV6SUQwZ0tDa2dQVDRnZTF4dVhIUnpiM0owU1dSekxtWnZja1ZoWTJnb2FXUWdQVDRnZTF4dVhIUmNkR052Ym5OMElHRnNkQ0E5SUdsa0lEMDlQU0FuWVhKMGFYTjBKeUEvSUNkMGFYUnNaU2NnT2lBbllYSjBhWE4wSnp0Y2JseHVYSFJjZEdOdmJuTjBJQ1JpZFhSMGIyNGdQU0JrYjJOMWJXVnVkQzVuWlhSRmJHVnRaVzUwUW5sSlpDaGdhbk10WW5rdEpIdHBaSDFnS1R0Y2JseDBYSFJqYjI1emRDQWtZV3gwUW5WMGRHOXVJRDBnWkc5amRXMWxiblF1WjJWMFJXeGxiV1Z1ZEVKNVNXUW9ZR3B6TFdKNUxTUjdZV3gwZldBcE8xeHVYRzVjZEZ4MEpHSjFkSFJ2Ymk1aFpHUkZkbVZ1ZEV4cGMzUmxibVZ5S0NkamJHbGpheWNzSUNncElEMCtJSHRjYmx4MFhIUmNkSE5qY205c2JGUnZWRzl3S0NrN1hHNWNkRngwWEhSemIzSjBTMlY1SUQwZ0lYTnZjblJMWlhrN1hHNWNkRngwWEhSeVpXNWtaWEpGYm5SeWFXVnpLQ2s3WEc1Y2JseDBYSFJjZENSaWRYUjBiMjR1WTJ4aGMzTk1hWE4wTG1Ga1pDZ25ZV04wYVhabEp5azdYRzVjZEZ4MFhIUWtZV3gwUW5WMGRHOXVMbU5zWVhOelRHbHpkQzV5WlcxdmRtVW9KMkZqZEdsMlpTY3BPMXh1WEhSY2RIMHBYRzVjZEgwcE8xeHVmVHRjYmx4dVkyOXVjM1FnY21WdVpHVnlSVzUwY21sbGN5QTlJQ2dwSUQwK0lIdGNibHgwWTI5dWMzUWdaVzUwY21sbGMweHBjM1FnUFNCemIzSjBTMlY1SUQ4Z1pXNTBjbWxsY3k1aWVWUnBkR3hsSURvZ1pXNTBjbWxsY3k1aWVVRjFkR2h2Y2p0Y2JseHVYSFFrWVhKMGFXTnNaVXhwYzNRdWFXNXVaWEpJVkUxTUlEMGdKeWM3WEc1Y2JseDBaVzUwY21sbGMweHBjM1F1Wm05eVJXRmphQ2dvWlc1MGNua3NJR2twSUQwK0lIdGNibHgwWEhRa1lYSjBhV05zWlV4cGMzUXVhVzV6WlhKMFFXUnFZV05sYm5SSVZFMU1LQ2RpWldadmNtVmxibVFuTENCaGNuUnBZMnhsVkdWdGNHeGhkR1VvWlc1MGNua3NJR2twS1R0Y2JseDBYSFJ0WVd0bFUyeHBaR1Z5S0dSdlkzVnRaVzUwTG1kbGRFVnNaVzFsYm5SQ2VVbGtLR0J6Ykdsa1pYSXRKSHRwZldBcEtUdGNibHgwZlNrN1hHNWNibHgwYVdZZ0tIZHBibVJ2ZHk1elkzSmxaVzR1ZDJsa2RHZ2dQaUEzTmpncElHRjBkR0ZqYUVsdFlXZGxUR2x6ZEdWdVpYSnpLQ2s3WEc1Y2RHMWhhMlZCYkhCb1lXSmxkQ2h6YjNKMFMyVjVLVHRjYm4wN1hHNWNibU52Ym5OMElITmxkRVJoZEdGQmJtUlRiM0owUW5sVWFYUnNaU0E5SUNoa1lYUmhLU0E5UGlCN1hHNWNkR1Z1ZEhKcFpYTXVZbmxCZFhSb2IzSWdQU0JrWVhSaE8xeHVYSFJsYm5SeWFXVnpMbUo1VkdsMGJHVWdQU0JrWVhSaExuTnNhV05sS0NrN0lDOHZJR052Y0dsbGN5QmtZWFJoSUdadmNpQmllVlJwZEd4bElITnZjblJjYmx4dVhIUmxiblJ5YVdWekxtSjVWR2wwYkdVdWMyOXlkQ2dvWVN3Z1lpa2dQVDRnZTF4dVhIUmNkR3hsZENCaFZHbDBiR1VnUFNCaExuUnBkR3hsV3pCZExuUnZWWEJ3WlhKRFlYTmxLQ2s3WEc1Y2RGeDBiR1YwSUdKVWFYUnNaU0E5SUdJdWRHbDBiR1ZiTUYwdWRHOVZjSEJsY2tOaGMyVW9LVHRjYmx4MFhIUnBaaUFvWVZScGRHeGxJRDRnWWxScGRHeGxLU0J5WlhSMWNtNGdNVHRjYmx4MFhIUmxiSE5sSUdsbUlDaGhWR2wwYkdVZ1BDQmlWR2wwYkdVcElISmxkSFZ5YmlBdE1UdGNibHgwWEhSbGJITmxJSEpsZEhWeWJpQXdPMXh1WEhSOUtUdGNibjA3WEc1Y2JtTnZibk4wSUdabGRHTm9SR0YwWVNBOUlDZ3BJRDArSUh0Y2JseDBabVYwWTJnb1JFSXBMblJvWlc0b2NtVnpJRDArSUhKbGN5NXFjMjl1S0NrcFhHNWNkQzUwYUdWdUtHUmhkR0VnUFQ0Z2UxeHVYSFJjZEhObGRFUmhkR0ZCYm1SVGIzSjBRbmxVYVhSc1pTaGtZWFJoS1R0Y2JseDBYSFJ5Wlc1a1pYSkZiblJ5YVdWektDazdYRzVjZEZ4MGFHbGtaVXh2WVdScGJtY29LVHRjYmx4MGZTbGNibHgwTG1OaGRHTm9LR1Z5Y2lBOVBpQmpiMjV6YjJ4bExuZGhjbTRvWlhKeUtTazdYRzU5TzF4dVhHNWpiMjV6ZENCcGJtbDBJRDBnS0NrZ1BUNGdlMXh1WEhSemJXOXZkR2h6WTNKdmJHd3VjRzlzZVdacGJHd29LVHRjYmx4MFptVjBZMmhFWVhSaEtDazdYRzVjZEhKbGJtUmxjazVoZGt4bktDazdYRzVjZEhObGRGVndVMjl5ZEVKMWRIUnZibk1vS1R0Y2JseDBZWFIwWVdOb1ZYQkJjbkp2ZDB4cGMzUmxibVZ5Y3lncE8xeHVYSFJoZEhSaFkyaE5iMlJoYkV4cGMzUmxibVZ5Y3lncE8xeHVmVHRjYmx4dWFXNXBkQ2dwTzF4dUlpd2lhVzF3YjNKMElIc2dKSFpwWlhjc0lDUnNhV2RvZEdKdmVDQjlJR1p5YjIwZ0p5NHVMMk52Ym5OMFlXNTBjeWM3WEc1Y2JteGxkQ0JzYVdkb2RHSnZlQ0E5SUdaaGJITmxPMXh1YkdWMElIZ3lJRDBnWm1Gc2MyVTdYRzVzWlhRZ2RtbGxkME5zWVhOek8xeHVYRzVqYjI1emRDQmhkSFJoWTJoSmJXRm5aVXhwYzNSbGJtVnljeUE5SUNncElEMCtJSHRjYmx4MFkyOXVjM1FnSkdsdFlXZGxjeUE5SUVGeWNtRjVMbVp5YjIwb1pHOWpkVzFsYm5RdWNYVmxjbmxUWld4bFkzUnZja0ZzYkNnbkxtRnlkR2xqYkdVdGFXMWhaMlVuS1NrN1hHNWNibHgwSkdsdFlXZGxjeTVtYjNKRllXTm9LR2x0WnlBOVBpQjdYRzVjZEZ4MGFXMW5MbUZrWkVWMlpXNTBUR2x6ZEdWdVpYSW9KMk5zYVdOckp5d2dLR1YyZENrZ1BUNGdlMXh1WEhSY2RGeDBhV1lnS0NGc2FXZG9kR0p2ZUNrZ2UxeHVYSFJjZEZ4MFhIUWtiR2xuYUhSaWIzZ3VZMnhoYzNOTWFYTjBMbUZrWkNnbmMyaHZkeTFwYldjbktUdGNibHgwWEhSY2RGeDBKSFpwWlhjdWMzSmpJRDBnYVcxbkxuTnlZenRjYmx4MFhIUmNkRngwYkdsbmFIUmliM2dnUFNCMGNuVmxPMXh1WEhSY2RGeDBmVnh1WEhSY2RIMHBPMXh1WEhSOUtUdGNibHh1WEhRa2JHbG5hSFJpYjNndVlXUmtSWFpsYm5STWFYTjBaVzVsY2lnblkyeHBZMnNuTENBb1pYWjBLU0E5UGlCN1hHNWNkRngwYVdZZ0tHVjJkQzUwWVhKblpYUWdQVDA5SUNSMmFXVjNLU0J5WlhSMWNtNDdYRzVjZEZ4MEpHeHBaMmgwWW05NExtTnNZWE56VEdsemRDNXlaVzF2ZG1Vb0ozTm9iM2N0YVcxbkp5azdYRzVjZEZ4MGJHbG5hSFJpYjNnZ1BTQm1ZV3h6WlR0Y2JseDBmU2s3WEc1Y2JseDBKSFpwWlhjdVlXUmtSWFpsYm5STWFYTjBaVzVsY2lnblkyeHBZMnNuTENBb0tTQTlQaUI3WEc1Y2RGeDBhV1lnS0NGNE1pa2dlMXh1WEhSY2RGeDBkbWxsZDBOc1lYTnpJRDBnSkhacFpYY3VkMmxrZEdnZ1BDQjNhVzVrYjNjdWFXNXVaWEpYYVdSMGFDQS9JQ2QyYVdWM0xYZ3lMUzF6YlNjZ09pQW5kbWxsZHkxNE1pYzdYRzVjZEZ4MFhIUWtkbWxsZHk1amJHRnpjMHhwYzNRdVlXUmtLSFpwWlhkRGJHRnpjeWs3WEc1Y2RGeDBYSFJ6WlhSVWFXMWxiM1YwS0NncElEMCtJSGd5SUQwZ2RISjFaU3dnTXpBd0tUdGNibHgwWEhSOUlHVnNjMlVnZTF4dVhIUmNkRngwSkhacFpYY3VZMnhoYzNOTWFYTjBMbkpsYlc5MlpTaDJhV1YzUTJ4aGMzTXBPMXh1WEhSY2RGeDBKR3hwWjJoMFltOTRMbU5zWVhOelRHbHpkQzV5WlcxdmRtVW9KM05vYjNjdGFXMW5KeWs3WEc1Y2RGeDBYSFI0TWlBOUlHWmhiSE5sTzF4dVhIUmNkRngwYkdsbmFIUmliM2dnUFNCbVlXeHpaVHRjYmx4MFhIUjlYRzVjZEgwcE8xeHVmVHRjYmx4dVpYaHdiM0owSUdSbFptRjFiSFFnWVhSMFlXTm9TVzFoWjJWTWFYTjBaVzVsY25NN0lpd2lhVzF3YjNKMElIc2dKRzF2WkdGc0lIMGdabkp2YlNBbkxpNHZZMjl1YzNSaGJuUnpKenRjYmx4dWJHVjBJRzF2WkdGc0lEMGdabUZzYzJVN1hHNWpiMjV6ZENCaGRIUmhZMmhOYjJSaGJFeHBjM1JsYm1WeWN5QTlJQ2dwSUQwK0lIdGNibHgwWTI5dWMzUWdKR1pwYm1RZ1BTQmtiMk4xYldWdWRDNW5aWFJGYkdWdFpXNTBRbmxKWkNnbmFuTXRabWx1WkNjcE8xeHVYSFJjYmx4MEpHWnBibVF1WVdSa1JYWmxiblJNYVhOMFpXNWxjaWduWTJ4cFkyc25MQ0FvS1NBOVBpQjdYRzVjZEZ4MEpHMXZaR0ZzTG1Oc1lYTnpUR2x6ZEM1aFpHUW9KM05vYjNjbktUdGNibHgwWEhSdGIyUmhiQ0E5SUhSeWRXVTdYRzVjZEgwcE8xeHVYRzVjZENSdGIyUmhiQzVoWkdSRmRtVnVkRXhwYzNSbGJtVnlLQ2RqYkdsamF5Y3NJQ2dwSUQwK0lIdGNibHgwWEhRa2JXOWtZV3d1WTJ4aGMzTk1hWE4wTG5KbGJXOTJaU2duYzJodmR5Y3BPMXh1WEhSY2RHMXZaR0ZzSUQwZ1ptRnNjMlU3WEc1Y2RIMHBPMXh1WEc1Y2RIZHBibVJ2ZHk1aFpHUkZkbVZ1ZEV4cGMzUmxibVZ5S0NkclpYbGtiM2R1Snl3Z0tDa2dQVDRnZTF4dVhIUmNkR2xtSUNodGIyUmhiQ2tnZTF4dVhIUmNkRngwYzJWMFZHbHRaVzkxZENnb0tTQTlQaUI3WEc1Y2RGeDBYSFJjZENSdGIyUmhiQzVqYkdGemMweHBjM1F1Y21WdGIzWmxLQ2R6YUc5M0p5azdYRzVjZEZ4MFhIUmNkRzF2WkdGc0lEMGdabUZzYzJVN1hHNWNkRngwWEhSOUxDQTJNREFwTzF4dVhIUmNkSDA3WEc1Y2RIMHBPMXh1ZlR0Y2JseHVaWGh3YjNKMElHUmxabUYxYkhRZ1lYUjBZV05vVFc5a1lXeE1hWE4wWlc1bGNuTTdJaXdpYVcxd2IzSjBJSHNnSkhScGRHeGxMQ0FrY0dGeVlXeHNZWGdzSUNSMWNFRnljbTkzSUgwZ1puSnZiU0FuTGk0dlkyOXVjM1JoYm5Sekp6dGNibWx0Y0c5eWRDQjdJSE5qY205c2JGUnZWRzl3SUgwZ1puSnZiU0FuTGk0dmRYUnBiSE1uTzF4dVhHNXNaWFFnY0hKbGRqdGNibXhsZENCamRYSnlaVzUwSUQwZ01EdGNibXhsZENCcGMxTm9iM2RwYm1jZ1BTQm1ZV3h6WlR0Y2JseHVZMjl1YzNRZ1lYUjBZV05vVlhCQmNuSnZkMHhwYzNSbGJtVnljeUE5SUNncElEMCtJSHRjYmx4MEpIQmhjbUZzYkdGNExtRmtaRVYyWlc1MFRHbHpkR1Z1WlhJb0ozTmpjbTlzYkNjc0lDZ3BJRDArSUh0Y2JseDBYSFJzWlhRZ2VTQTlJQ1IwYVhSc1pTNW5aWFJDYjNWdVpHbHVaME5zYVdWdWRGSmxZM1FvS1M1NU8xeHVYRzVjZEZ4MGFXWWdLR04xY25KbGJuUWdJVDA5SUhrcElIdGNibHgwWEhSY2RIQnlaWFlnUFNCamRYSnlaVzUwTzF4dVhIUmNkRngwWTNWeWNtVnVkQ0E5SUhrN1hHNWNkRngwZlR0Y2JseHVYSFJjZEdsbUlDaDVJRHc5SUMwMU1DQW1KaUFoYVhOVGFHOTNhVzVuS1NCN1hHNWNkRngwWEhRa2RYQkJjbkp2ZHk1amJHRnpjMHhwYzNRdVlXUmtLQ2R6YUc5M0p5azdYRzVjZEZ4MFhIUnBjMU5vYjNkcGJtY2dQU0IwY25WbE8xeHVYSFJjZEgwZ1pXeHpaU0JwWmlBb2VTQStJQzAxTUNBbUppQnBjMU5vYjNkcGJtY3BJSHRjYmx4MFhIUmNkQ1IxY0VGeWNtOTNMbU5zWVhOelRHbHpkQzV5WlcxdmRtVW9KM05vYjNjbktUdGNibHgwWEhSY2RHbHpVMmh2ZDJsdVp5QTlJR1poYkhObE8xeHVYSFJjZEgxY2JseDBmU2s3WEc1Y2JseDBKSFZ3UVhKeWIzY3VZV1JrUlhabGJuUk1hWE4wWlc1bGNpZ25ZMnhwWTJzbkxDQW9LU0E5UGlCelkzSnZiR3hVYjFSdmNDZ3BLVHRjYm4wN1hHNWNibVY0Y0c5eWRDQmtaV1poZFd4MElHRjBkR0ZqYUZWd1FYSnliM2RNYVhOMFpXNWxjbk03SWl3aWFXMXdiM0owSUdGMGRHRmphRTF2WkdGc1RHbHpkR1Z1WlhKeklHWnliMjBnSnk0dllYUjBZV05vVFc5a1lXeE1hWE4wWlc1bGNuTW5PMXh1YVcxd2IzSjBJR0YwZEdGamFGVndRWEp5YjNkTWFYTjBaVzVsY25NZ1puSnZiU0FuTGk5aGRIUmhZMmhWY0VGeWNtOTNUR2x6ZEdWdVpYSnpKenRjYm1sdGNHOXlkQ0JoZEhSaFkyaEpiV0ZuWlV4cGMzUmxibVZ5Y3lCbWNtOXRJQ2N1TDJGMGRHRmphRWx0WVdkbFRHbHpkR1Z1WlhKekp6dGNibWx0Y0c5eWRDQnRZV3RsUVd4d2FHRmlaWFFnWm5KdmJTQW5MaTl0WVd0bFFXeHdhR0ZpWlhRbk8xeHVhVzF3YjNKMElHMWhhMlZUYkdsa1pYSWdabkp2YlNBbkxpOXRZV3RsVTJ4cFpHVnlKenRjYmx4dVpYaHdiM0owSUhzZ1hHNWNkR0YwZEdGamFFMXZaR0ZzVEdsemRHVnVaWEp6TENCY2JseDBZWFIwWVdOb1ZYQkJjbkp2ZDB4cGMzUmxibVZ5Y3l4Y2JseDBZWFIwWVdOb1NXMWhaMlZNYVhOMFpXNWxjbk1zWEc1Y2RHMWhhMlZCYkhCb1lXSmxkQ3dnWEc1Y2RHMWhhMlZUYkdsa1pYSWdYRzU5T3lJc0ltTnZibk4wSUdGc2NHaGhZbVYwSUQwZ1d5ZGhKeXdnSjJJbkxDQW5ZeWNzSUNka0p5d2dKMlVuTENBblppY3NJQ2RuSnl3Z0oyZ25MQ0FuYVNjc0lDZHFKeXdnSjJzbkxDQW5iQ2NzSUNkdEp5d2dKMjRuTENBbmJ5Y3NJQ2R3Snl3Z0ozSW5MQ0FuY3ljc0lDZDBKeXdnSjNVbkxDQW5kaWNzSUNkM0p5d2dKM2tuTENBbmVpZGRPMXh1WEc1amIyNXpkQ0J0WVd0bFFXeHdhR0ZpWlhRZ1BTQW9jMjl5ZEV0bGVTa2dQVDRnZTF4dVhIUmpiMjV6ZENCbWFXNWtSbWx5YzNSRmJuUnllU0E5SUNoamFHRnlLU0E5UGlCN1hHNWNkRngwWTI5dWMzUWdjMlZzWldOMGIzSWdQU0J6YjNKMFMyVjVJRDhnSnk1cWN5MWxiblJ5ZVMxMGFYUnNaU2NnT2lBbkxtcHpMV1Z1ZEhKNUxXRnlkR2x6ZENjN1hHNWNkRngwWTI5dWMzUWdjSEpsZGxObGJHVmpkRzl5SUQwZ0lYTnZjblJMWlhrZ1B5QW5MbXB6TFdWdWRISjVMWFJwZEd4bEp5QTZJQ2N1YW5NdFpXNTBjbmt0WVhKMGFYTjBKenRjYmx4dVhIUmNkR052Ym5OMElDUmxiblJ5YVdWeklEMGdRWEp5WVhrdVpuSnZiU2hrYjJOMWJXVnVkQzV4ZFdWeWVWTmxiR1ZqZEc5eVFXeHNLSE5sYkdWamRHOXlLU2s3WEc1Y2RGeDBZMjl1YzNRZ0pIQnlaWFpGYm5SeWFXVnpJRDBnUVhKeVlYa3Vabkp2YlNoa2IyTjFiV1Z1ZEM1eGRXVnllVk5sYkdWamRHOXlRV3hzS0hCeVpYWlRaV3hsWTNSdmNpa3BPMXh1WEc1Y2RGeDBKSEJ5WlhaRmJuUnlhV1Z6TG1admNrVmhZMmdvWlc1MGNua2dQVDRnWlc1MGNua3VjbVZ0YjNabFFYUjBjbWxpZFhSbEtDZHVZVzFsSnlrcE8xeHVYRzVjZEZ4MGNtVjBkWEp1SUNSbGJuUnlhV1Z6TG1acGJtUW9aVzUwY25rZ1BUNGdlMXh1WEhSY2RGeDBiR1YwSUc1dlpHVWdQU0JsYm5SeWVTNXVaWGgwUld4bGJXVnVkRk5wWW14cGJtYzdYRzVjZEZ4MFhIUnlaWFIxY200Z2JtOWtaUzVwYm01bGNraFVUVXhiTUYwZ1BUMDlJR05vWVhJZ2ZId2dibTlrWlM1cGJtNWxja2hVVFV4Yk1GMGdQVDA5SUdOb1lYSXVkRzlWY0hCbGNrTmhjMlVvS1R0Y2JseDBYSFI5S1R0Y2JseDBmVHRjYmx4dVhIUmpiMjV6ZENCaGRIUmhZMmhCYm1Ob2IzSk1hWE4wWlc1bGNpQTlJQ2drWVc1amFHOXlMQ0JzWlhSMFpYSXBJRDArSUh0Y2JseDBYSFFrWVc1amFHOXlMbUZrWkVWMlpXNTBUR2x6ZEdWdVpYSW9KMk5zYVdOckp5d2dLQ2tnUFQ0Z2UxeHVYSFJjZEZ4MFkyOXVjM1FnYkdWMGRHVnlUbTlrWlNBOUlHUnZZM1Z0Wlc1MExtZGxkRVZzWlcxbGJuUkNlVWxrS0d4bGRIUmxjaWs3WEc1Y2RGeDBYSFJzWlhRZ2RHRnlaMlYwTzF4dVhHNWNkRngwWEhScFppQW9JWE52Y25STFpYa3BJSHRjYmx4MFhIUmNkRngwZEdGeVoyVjBJRDBnYkdWMGRHVnlJRDA5UFNBbllTY2dQeUJrYjJOMWJXVnVkQzVuWlhSRmJHVnRaVzUwUW5sSlpDZ25ZVzVqYUc5eUxYUmhjbWRsZENjcElEb2diR1YwZEdWeVRtOWtaUzV3WVhKbGJuUkZiR1Z0Wlc1MExuQmhjbVZ1ZEVWc1pXMWxiblF1Y0dGeVpXNTBSV3hsYldWdWRDNXdZWEpsYm5SRmJHVnRaVzUwTG5CeVpYWnBiM1Z6Uld4bGJXVnVkRk5wWW14cGJtY3VjWFZsY25sVFpXeGxZM1J2Y2lnbkxtcHpMV0Z5ZEdsamJHVXRZVzVqYUc5eUxYUmhjbWRsZENjcE8xeHVYSFJjZEZ4MGZTQmxiSE5sSUh0Y2JseDBYSFJjZEZ4MGRHRnlaMlYwSUQwZ2JHVjBkR1Z5SUQwOVBTQW5ZU2NnUHlCa2IyTjFiV1Z1ZEM1blpYUkZiR1Z0Wlc1MFFubEpaQ2duWVc1amFHOXlMWFJoY21kbGRDY3BJRG9nYkdWMGRHVnlUbTlrWlM1d1lYSmxiblJGYkdWdFpXNTBMbkJoY21WdWRFVnNaVzFsYm5RdWNHRnlaVzUwUld4bGJXVnVkQzV3Y21WMmFXOTFjMFZzWlcxbGJuUlRhV0pzYVc1bkxuRjFaWEo1VTJWc1pXTjBiM0lvSnk1cWN5MWhjblJwWTJ4bExXRnVZMmh2Y2kxMFlYSm5aWFFuS1R0Y2JseDBYSFJjZEgwN1hHNWNibHgwWEhSY2RIUmhjbWRsZEM1elkzSnZiR3hKYm5SdlZtbGxkeWg3WW1Wb1lYWnBiM0k2SUZ3aWMyMXZiM1JvWENJc0lHSnNiMk5yT2lCY0luTjBZWEowWENKOUtUdGNibHgwWEhSOUtUdGNibHgwZlR0Y2JseHVYSFJzWlhRZ1lXTjBhWFpsUlc1MGNtbGxjeUE5SUh0OU8xeHVYSFJzWlhRZ0pHOTFkR1Z5SUQwZ1pHOWpkVzFsYm5RdWNYVmxjbmxUWld4bFkzUnZjaWduTG1Gc2NHaGhZbVYwWDE5c1pYUjBaWEp6SnlrN1hHNWNkQ1J2ZFhSbGNpNXBibTVsY2toVVRVd2dQU0FuSnp0Y2JseHVYSFJoYkhCb1lXSmxkQzVtYjNKRllXTm9LR3hsZEhSbGNpQTlQaUI3WEc1Y2RGeDBiR1YwSUNSbWFYSnpkRVZ1ZEhKNUlEMGdabWx1WkVacGNuTjBSVzUwY25rb2JHVjBkR1Z5S1R0Y2JseDBYSFJzWlhRZ0pHRnVZMmh2Y2lBOUlHUnZZM1Z0Wlc1MExtTnlaV0YwWlVWc1pXMWxiblFvSjJFbktUdGNibHh1WEhSY2RHbG1JQ2doSkdacGNuTjBSVzUwY25rcElISmxkSFZ5Ymp0Y2JseHVYSFJjZENSbWFYSnpkRVZ1ZEhKNUxtbGtJRDBnYkdWMGRHVnlPMXh1WEhSY2RDUmhibU5vYjNJdWFXNXVaWEpJVkUxTUlEMGdiR1YwZEdWeUxuUnZWWEJ3WlhKRFlYTmxLQ2s3WEc1Y2RGeDBKR0Z1WTJodmNpNWpiR0Z6YzA1aGJXVWdQU0FuWVd4d2FHRmlaWFJmWDJ4bGRIUmxjaTFoYm1Ob2IzSW5PMXh1WEc1Y2RGeDBZWFIwWVdOb1FXNWphRzl5VEdsemRHVnVaWElvSkdGdVkyaHZjaXdnYkdWMGRHVnlLVHRjYmx4MFhIUWtiM1YwWlhJdVlYQndaVzVrUTJocGJHUW9KR0Z1WTJodmNpazdYRzVjZEgwcE8xeHVmVHRjYmx4dVpYaHdiM0owSUdSbFptRjFiSFFnYldGclpVRnNjR2hoWW1WME95SXNJbU52Ym5OMElHMWhhMlZUYkdsa1pYSWdQU0FvSkhOc2FXUmxjaWtnUFQ0Z2UxeHVYSFJqYjI1emRDQWtZWEp5YjNkT1pYaDBJRDBnSkhOc2FXUmxjaTV3WVhKbGJuUkZiR1Z0Wlc1MExuRjFaWEo1VTJWc1pXTjBiM0lvSnk1aGNuSnZkeTF1WlhoMEp5azdYRzVjZEdOdmJuTjBJQ1JoY25KdmQxQnlaWFlnUFNBa2MyeHBaR1Z5TG5CaGNtVnVkRVZzWlcxbGJuUXVjWFZsY25sVFpXeGxZM1J2Y2lnbkxtRnljbTkzTFhCeVpYWW5LVHRjYmx4dVhIUnNaWFFnWTNWeWNtVnVkQ0E5SUNSemJHbGtaWEl1Wm1seWMzUkZiR1Z0Wlc1MFEyaHBiR1E3WEc1Y2RDUmhjbkp2ZDA1bGVIUXVZV1JrUlhabGJuUk1hWE4wWlc1bGNpZ25ZMnhwWTJzbkxDQW9LU0E5UGlCN1hHNWNkRngwWTI5dWMzUWdibVY0ZENBOUlHTjFjbkpsYm5RdWJtVjRkRVZzWlcxbGJuUlRhV0pzYVc1bk8xeHVYSFJjZEdsbUlDaHVaWGgwS1NCN1hHNWNkRngwWEhSdVpYaDBMbk5qY205c2JFbHVkRzlXYVdWM0tIdGlaV2hoZG1sdmNqb2dYQ0p6Ylc5dmRHaGNJaXdnWW14dlkyczZJRndpYm1WaGNtVnpkRndpTENCcGJteHBibVU2SUZ3aVkyVnVkR1Z5WENKOUtUdGNibHgwWEhSY2RHTjFjbkpsYm5RZ1BTQnVaWGgwTzF4dVhIUmNkSDFjYmx4MGZTazdYRzVjYmx4MEpHRnljbTkzVUhKbGRpNWhaR1JGZG1WdWRFeHBjM1JsYm1WeUtDZGpiR2xqYXljc0lDZ3BJRDArSUh0Y2JseDBYSFJqYjI1emRDQndjbVYySUQwZ1kzVnljbVZ1ZEM1d2NtVjJhVzkxYzBWc1pXMWxiblJUYVdKc2FXNW5PMXh1WEhSY2RHbG1JQ2h3Y21WMktTQjdYRzVjZEZ4MFhIUndjbVYyTG5OamNtOXNiRWx1ZEc5V2FXVjNLSHRpWldoaGRtbHZjam9nWENKemJXOXZkR2hjSWl3Z1lteHZZMnM2SUZ3aWJtVmhjbVZ6ZEZ3aUxDQnBibXhwYm1VNklGd2lZMlZ1ZEdWeVhDSjlLVHRjYmx4MFhIUmNkR04xY25KbGJuUWdQU0J3Y21WMk8xeHVYSFJjZEgxY2JseDBmU2xjYm4wN1hHNWNibVY0Y0c5eWRDQmtaV1poZFd4MElHMWhhMlZUYkdsa1pYSTdJaXdpWTI5dWMzUWdhVzFoWjJWVVpXMXdiR0YwWlNBOUlDaHBiV0ZuWlNrZ1BUNGdZRnh1UEdScGRpQmpiR0Z6Y3oxY0ltRnlkR2xqYkdVdGFXMWhaMlZmWDI5MWRHVnlYQ0krWEc1Y2REeHBiV2NnWTJ4aGMzTTlYQ0poY25ScFkyeGxMV2x0WVdkbFhDSWdjM0pqUFZ3aUxpNHZMaTR2WVhOelpYUnpMMmx0WVdkbGN5OGtlMmx0WVdkbGZWd2lQand2YVcxblBseHVQQzlrYVhZK1hHNWdPMXh1WEc1amIyNXpkQ0JoY25ScFkyeGxWR1Z0Y0d4aGRHVWdQU0FvWlc1MGNua3NJR2twSUQwK0lIdGNibHgwWTI5dWMzUWdleUIwYVhSc1pTd2dabWx5YzNST1lXMWxMQ0JzWVhOMFRtRnRaU3dnYVcxaFoyVnpMQ0JrWlhOamNtbHdkR2x2Yml3Z1kyOXVkR1Z1ZEhNc0lHUnBiV1Z1YzJsdmJuTXNJSGxsWVhJc0lHbHpZbTRzSUd4cGJtc2dmU0E5SUdWdWRISjVPMXh1WEc1Y2RHTnZibk4wSUdsdFlXZGxTRlJOVENBOUlHbHRZV2RsY3k1c1pXNW5kR2dnUHlCY2JseDBYSFJwYldGblpYTXViV0Z3S0dsdFlXZGxJRDArSUdsdFlXZGxWR1Z0Y0d4aGRHVW9hVzFoWjJVcEtTNXFiMmx1S0NjbktTQTZJQ2NuTzF4dVhHNWNkSEpsZEhWeWJpQWdZRnh1WEhSY2REeGhjblJwWTJ4bElHTnNZWE56UFZ3aVlYSjBhV05zWlY5ZmIzVjBaWEpjSWo1Y2JseDBYSFJjZER4a2FYWWdZMnhoYzNNOVhDSmhjblJwWTJ4bFgxOXBibTVsY2x3aVBseHVYSFJjZEZ4MFhIUThaR2wySUdOc1lYTnpQVndpWVhKMGFXTnNaVjlmYUdWaFpHbHVaMXdpUGx4dVhIUmNkRngwWEhSY2REeGhJR05zWVhOelBWd2lhbk10Wlc1MGNua3RkR2wwYkdWY0lqNDhMMkUrWEc1Y2RGeDBYSFJjZEZ4MFBHZ3lJR05zWVhOelBWd2lZWEowYVdOc1pTMW9aV0ZrYVc1blgxOTBhWFJzWlZ3aVBpUjdkR2wwYkdWOVBDOW9NajVjYmx4MFhIUmNkRngwWEhROFpHbDJJR05zWVhOelBWd2lZWEowYVdOc1pTMW9aV0ZrYVc1blgxOXVZVzFsWENJK1hHNWNkRngwWEhSY2RGeDBYSFE4YzNCaGJpQmpiR0Z6Y3oxY0ltRnlkR2xqYkdVdGFHVmhaR2x1WjE5ZmJtRnRaUzB0Wm1seWMzUmNJajRrZTJacGNuTjBUbUZ0WlgwOEwzTndZVzQrWEc1Y2RGeDBYSFJjZEZ4MFhIUThZU0JqYkdGemN6MWNJbXB6TFdWdWRISjVMV0Z5ZEdsemRGd2lQand2WVQ1Y2JseDBYSFJjZEZ4MFhIUmNkRHh6Y0dGdUlHTnNZWE56UFZ3aVlYSjBhV05zWlMxb1pXRmthVzVuWDE5dVlXMWxMUzFzWVhOMFhDSStKSHRzWVhOMFRtRnRaWDA4TDNOd1lXNCtYRzVjZEZ4MFhIUmNkRngwUEM5a2FYWStYRzVjZEZ4MFhIUmNkRHd2WkdsMlBseDBYRzVjZEZ4MFhIUmNkRHhrYVhZZ1kyeGhjM005WENKaGNuUnBZMnhsWDE5emJHbGtaWEl0YjNWMFpYSmNJajVjYmx4MFhIUmNkRngwWEhROFpHbDJJR05zWVhOelBWd2lZWEowYVdOc1pWOWZjMnhwWkdWeUxXbHVibVZ5WENJZ2FXUTlYQ0p6Ykdsa1pYSXRKSHRwZlZ3aVBseHVYSFJjZEZ4MFhIUmNkRngwSkh0cGJXRm5aVWhVVFV4OVhHNWNkRngwWEhSY2RGeDBYSFE4WkdsMklHTnNZWE56UFZ3aVlYSjBhV05zWlMxa1pYTmpjbWx3ZEdsdmJsOWZiM1YwWlhKY0lqNWNibHgwWEhSY2RGeDBYSFJjZEZ4MFBHUnBkaUJqYkdGemN6MWNJbUZ5ZEdsamJHVXRaR1Z6WTNKcGNIUnBiMjVjSWo0a2UyUmxjMk55YVhCMGFXOXVmVHd2WkdsMlBseHVYSFJjZEZ4MFhIUmNkRngwWEhROFpHbDJJR05zWVhOelBWd2lZWEowYVdOc1pTMWtaWFJoYVd4Y0lqNGtlMk52Ym5SbGJuUnpmVHd2WkdsMlBseHVYSFJjZEZ4MFhIUmNkRngwWEhROFpHbDJJR05zWVhOelBWd2lZWEowYVdOc1pTMWtaWFJoYVd3Z1lYSjBhV05zWlMxa1pYUmhhV3d0TFcxaGNtZHBibHdpUGlSN1pHbHRaVzV6YVc5dWMzMDhMMlJwZGo1Y2JseDBYSFJjZEZ4MFhIUmNkRngwUEdScGRpQmpiR0Z6Y3oxY0ltRnlkR2xqYkdVdFpHVjBZV2xzSUdGeWRHbGpiR1V0WkdWMFlXbHNMUzF0WVhKbmFXNWNJajRrZTNsbFlYSjlQQzlrYVhZK1hHNWNkRngwWEhSY2RGeDBYSFJjZER4aElHTnNZWE56UFZ3aVlYSjBhV05zWlMxa1pYUmhhV3dnWVhKMGFXTnNaUzFrWlhSaGFXd3RMV3hwYm10Y0lpQjBZWEpuWlhROVhDSmZZbXhoYm10Y0lpQm9jbVZtUFZ3aUpIdHNhVzVyZlZ3aVBpUjdhWE5pYm4wOEwyRStYRzVjZEZ4MFhIUmNkRngwWEhROEwyUnBkajVjYmx4MFhIUmNkRngwWEhROEwyUnBkajVjYmx4MFhIUmNkRngwWEhROFpHbDJJR05zWVhOelBWd2lZWEowYVdOc1pWOWZjMk55YjJ4c0xXTnZiblJ5YjJ4elhDSStYRzVjZEZ4MFhIUmNkRngwWEhROGMzQmhiaUJqYkdGemN6MWNJbU52Ym5SeWIyeHpJR0Z5Y205M0xYQnlaWFpjSWo3aWhwQThMM053WVc0K0lGeHVYSFJjZEZ4MFhIUmNkRngwUEhOd1lXNGdZMnhoYzNNOVhDSmpiMjUwY205c2N5Qmhjbkp2ZHkxdVpYaDBYQ0krNG9hU1BDOXpjR0Z1UGx4dVhIUmNkRngwWEhSY2REd3ZaR2wyUGx4dVhIUmNkRngwWEhSY2REeHdJR05zWVhOelBWd2lhbk10WVhKMGFXTnNaUzFoYm1Ob2IzSXRkR0Z5WjJWMFhDSStQQzl3UGx4dVhIUmNkRngwUEM5a2FYWStYRzVjZEZ4MFBDOWhjblJwWTJ4bFBseHVYSFJnWEc1OU8xeHVYRzVsZUhCdmNuUWdaR1ZtWVhWc2RDQmhjblJwWTJ4bFZHVnRjR3hoZEdVN0lpd2lhVzF3YjNKMElHRnlkR2xqYkdWVVpXMXdiR0YwWlNCbWNtOXRJQ2N1TDJGeWRHbGpiR1VuTzF4dWFXMXdiM0owSUhKbGJtUmxjazVoZGt4bklHWnliMjBnSnk0dmJtRjJUR2NuTzF4dVhHNWxlSEJ2Y25RZ2V5QmhjblJwWTJ4bFZHVnRjR3hoZEdVc0lISmxibVJsY2s1aGRreG5JSDA3SWl3aVkyOXVjM1FnZEdWdGNHeGhkR1VnUFNCY2JseDBZRHhrYVhZZ1kyeGhjM005WENKdVlYWmZYMmx1Ym1WeVhDSStYRzVjZEZ4MFBHUnBkaUJqYkdGemN6MWNJbTVoZGw5ZmMyOXlkQzFpZVZ3aVBseHVYSFJjZEZ4MFBITndZVzRnWTJ4aGMzTTlYQ0p6YjNKMExXSjVYMTkwYVhSc1pWd2lQbE52Y25RZ1luazhMM053WVc0K1hHNWNkRngwWEhROFluVjBkRzl1SUdOc1lYTnpQVndpYzI5eWRDMWllU0J6YjNKMExXSjVYMTlpZVMxaGNuUnBjM1FnWVdOMGFYWmxYQ0lnYVdROVhDSnFjeTFpZVMxaGNuUnBjM1JjSWo1QmNuUnBjM1E4TDJKMWRIUnZiajVjYmx4MFhIUmNkRHh6Y0dGdUlHTnNZWE56UFZ3aWMyOXlkQzFpZVY5ZlpHbDJhV1JsY2x3aVBpQjhJRHd2YzNCaGJqNWNibHgwWEhSY2REeGlkWFIwYjI0Z1kyeGhjM005WENKemIzSjBMV0o1SUhOdmNuUXRZbmxmWDJKNUxYUnBkR3hsWENJZ2FXUTlYQ0pxY3kxaWVTMTBhWFJzWlZ3aVBsUnBkR3hsUEM5aWRYUjBiMjQrWEc1Y2RGeDBYSFE4YzNCaGJpQmpiR0Z6Y3oxY0ltWnBibVJjSWlCcFpEMWNJbXB6TFdacGJtUmNJajVjYmx4MFhIUmNkRngwS0R4emNHRnVJR05zWVhOelBWd2labWx1WkMwdGFXNXVaWEpjSWo0bUl6ZzVPRFE3Ump3dmMzQmhiajRwWEc1Y2RGeDBYSFE4TDNOd1lXNCtYRzVjZEZ4MFBDOWthWFkrWEc1Y2RGeDBQR1JwZGlCamJHRnpjejFjSW01aGRsOWZZV3h3YUdGaVpYUmNJajVjYmx4MFhIUmNkRHh6Y0dGdUlHTnNZWE56UFZ3aVlXeHdhR0ZpWlhSZlgzUnBkR3hsWENJK1IyOGdkRzg4TDNOd1lXNCtYRzVjZEZ4MFhIUThaR2wySUdOc1lYTnpQVndpWVd4d2FHRmlaWFJmWDJ4bGRIUmxjbk5jSWo0OEwyUnBkajVjYmx4MFhIUThMMlJwZGo1Y2JseDBQQzlrYVhZK1lEdGNibHh1WTI5dWMzUWdjbVZ1WkdWeVRtRjJUR2NnUFNBb0tTQTlQaUI3WEc1Y2RHeGxkQ0J1WVhaUGRYUmxjaUE5SUdSdlkzVnRaVzUwTG1kbGRFVnNaVzFsYm5SQ2VVbGtLQ2RxY3kxdVlYWW5LVHRjYmx4MGJtRjJUM1YwWlhJdWFXNXVaWEpJVkUxTUlEMGdkR1Z0Y0d4aGRHVTdYRzU5TzF4dVhHNWxlSEJ2Y25RZ1pHVm1ZWFZzZENCeVpXNWtaWEpPWVhaTVp6c2lMQ0pwYlhCdmNuUWdleUFrYkc5aFpHbHVaeXdnSkc1aGRpd2dKSEJoY21Gc2JHRjRMQ0FrWTI5dWRHVnVkQ3dnSkhScGRHeGxMQ0FrWVhKeWIzY3NJQ1J0YjJSaGJDd2dKR3hwWjJoMFltOTRMQ0FrZG1sbGR5QjlJR1p5YjIwZ0p5NHVMMk52Ym5OMFlXNTBjeWM3WEc1Y2JtTnZibk4wSUdSbFltOTFibU5sSUQwZ0tHWnVMQ0IwYVcxbEtTQTlQaUI3WEc0Z0lHeGxkQ0IwYVcxbGIzVjBPMXh1WEc0Z0lISmxkSFZ5YmlCbWRXNWpkR2x2YmlncElIdGNiaUFnSUNCamIyNXpkQ0JtZFc1amRHbHZia05oYkd3Z1BTQW9LU0E5UGlCbWJpNWhjSEJzZVNoMGFHbHpMQ0JoY21kMWJXVnVkSE1wTzF4dUlDQWdJRnh1SUNBZ0lHTnNaV0Z5VkdsdFpXOTFkQ2gwYVcxbGIzVjBLVHRjYmlBZ0lDQjBhVzFsYjNWMElEMGdjMlYwVkdsdFpXOTFkQ2htZFc1amRHbHZia05oYkd3c0lIUnBiV1VwTzF4dUlDQjlYRzU5TzF4dVhHNWpiMjV6ZENCb2FXUmxURzloWkdsdVp5QTlJQ2dwSUQwK0lIdGNibHgwSkd4dllXUnBibWN1Wm05eVJXRmphQ2hsYkdWdElEMCtJR1ZzWlcwdVkyeGhjM05NYVhOMExtRmtaQ2duY21WaFpIa25LU2s3WEc1Y2RDUnVZWFl1WTJ4aGMzTk1hWE4wTG1Ga1pDZ25jbVZoWkhrbktUdGNibjA3WEc1Y2JtTnZibk4wSUhOamNtOXNiRlJ2Vkc5d0lEMGdLQ2tnUFQ0Z2UxeHVYSFJzWlhRZ2RHOXdJRDBnWkc5amRXMWxiblF1WjJWMFJXeGxiV1Z1ZEVKNVNXUW9KMkZ1WTJodmNpMTBZWEpuWlhRbktUdGNibHgwZEc5d0xuTmpjbTlzYkVsdWRHOVdhV1YzS0h0aVpXaGhkbWx2Y2pvZ1hDSnpiVzl2ZEdoY0lpd2dZbXh2WTJzNklGd2ljM1JoY25SY0luMHBPMXh1ZlR0Y2JseHVaWGh3YjNKMElIc2daR1ZpYjNWdVkyVXNJR2hwWkdWTWIyRmthVzVuTENCelkzSnZiR3hVYjFSdmNDQjlPeUpkZlE9PSJ9
